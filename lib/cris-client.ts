/* ------------------------------------------------------------------ *
 * Cris · cliente de IA do dispositivo (Fase 1B)
 *
 * Regra de ouro: nada aqui passa pelo servidor. A chave do provedor fica
 * guardada no dispositivo (SecureStore no app / localStorage na web) e só
 * é usada no cabeçalho `Authorization` montado no instante do fetch.
 *
 * Privacidade por construção: `CrisTarget` — o único descritor de alvo que
 * sai deste módulo para a interface — NÃO contém a chave. A chave vive
 * apenas em `CrisCallPlan` (interno) e nunca é escrita em log.
 *
 * Ordem de decisão: (a) IA local → (b) provedor → (c) resposta pronta.
 * Se o alvo preferido falhar, o próximo da fila é tentado (local → provedor
 * → resposta pronta), sempre sem passar pelo servidor do app.
 * ------------------------------------------------------------------ */

import type {
  AiConfig,
  ApiProviderId,
  ApiProviderPreset,
  LocalAiConfig,
  ProviderAiConfig,
} from '@/lib/api-config';

/* ------------------------------------------------------------------ *
 * Constantes
 * ------------------------------------------------------------------ */

const CHAT_TIMEOUT_MS = 45000;
const CHAT_MAX_TOKENS = 900;
const CHAT_TEMPERATURE = 0.4;
const HISTORY_LIMIT = 8;
const SELECTION_LIMIT = 280;
const SSE_DONE = '\u0000done';

const CRIS_SYSTEM_PROMPT = [
  'Você é a Cris, assistente de estudos do app Estudo Organizado.',
  'Responda em português do Brasil, direto ao ponto e com passos práticos.',
  'Quando fizer sentido, conecte a resposta à tela que o aluno está vendo.',
  'Nunca invente conteúdo de arquivos que você não recebeu.',
  'Se faltar informação, diga o que o aluno precisa abrir ou enviar.',
].join(' ');

/* ------------------------------------------------------------------ *
 * Tipos públicos
 * ------------------------------------------------------------------ */

/** Turno de conversa mantido em memória pela interface durante a sessão. */
type CrisHistoryTurn = { role: 'user' | 'assistant'; content: string };

/** Onde a resposta foi produzida. `fallback` = resposta pronta, sem IA. */
export type CrisTarget = {
  kind: 'local' | 'provider' | 'fallback';
  label: string;
  endpoint: string;
  model: string;
  reason: string;
};

/** Contexto da tela atual, montado pela interface que abre a Cris. */
export type CrisContext = {
  route: string;
  screen: string;
  title?: string | null;
  selection?: string | null;
  detail?: string | null;
  topics?: string[];
};

export type CrisAskOptions = {
  /** Configuração já carregada (produção usa o SecureStore; testes injetam). */
  config?: AiConfig;
  /** Presets de provedores (produção usa API_PROVIDERS). */
  presets?: Record<ApiProviderId, ApiProviderPreset>;
  /** Histórico da sessão, do mais antigo para o mais recente. */
  history?: CrisHistoryTurn[];
  timeoutMs?: number;
  maxTokens?: number;
  signal?: AbortSignal;
};

export type CrisReply = {
  text: string;
  target: CrisTarget;
  latencyMs: number;
  /** Por que a resposta não veio de uma IA (mensagem amigável) — ou null. */
  fallbackReason: string | null;
  suggestions: string[];
};

/* ------------------------------------------------------------------ *
 * Internos
 * ------------------------------------------------------------------ */

/** Plano de chamada: alvo público (sem chave) + a chave usada só no fetch. */
type CrisCallPlan = { target: CrisTarget; apiKey: string };

type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

type ApiConfigModule = typeof import('@/lib/api-config');

type RuntimeConfig = {
  config: AiConfig | null;
  presets: Record<ApiProviderId, ApiProviderPreset> | null;
};

/** Erro de chamada já classificado. Nunca carrega a chave nem o corpo da resposta. */
class CrisCallError extends Error {
  readonly kind: 'local' | 'provider';
  readonly status: number | null;
  readonly timedOut: boolean;
  readonly offline: boolean;
  readonly canceled: boolean;
  readonly empty: boolean;

  constructor(
    kind: 'local' | 'provider',
    detail: { status?: number; timedOut?: boolean; offline?: boolean; canceled?: boolean; empty?: boolean } = {},
  ) {
    super('cris-call-failed');
    this.name = 'CrisCallError';
    this.kind = kind;
    this.status = typeof detail.status === 'number' ? detail.status : null;
    this.timedOut = detail.timedOut === true;
    this.offline = detail.offline === true;
    this.canceled = detail.canceled === true;
    this.empty = detail.empty === true;
  }
}

function stripTrailingSlashes(value: string | null | undefined): string {
  return (value ?? '').trim().replace(/\/+$/, '');
}

function clip(value: string, limit: number): string {
  const text = (value ?? '').trim();
  return text.length > limit ? `${text.slice(0, limit - 1)}…` : text;
}

let apiConfigModule: Promise<ApiConfigModule | null> | null = null;

/** Import tardio: mantém este módulo testável em Node puro (sem SecureStore/React Native). */
function loadApiConfigModule(): Promise<ApiConfigModule | null> {
  if (!apiConfigModule) {
    apiConfigModule = import('@/lib/api-config').catch(() => null);
  }
  return apiConfigModule;
}

async function resolveRuntime(options: CrisAskOptions): Promise<RuntimeConfig> {
  const module = options.config && options.presets ? null : await loadApiConfigModule();
  let config = options.config ?? null;
  if (!config && module) config = await module.getAiConfig().catch(() => null);
  const presets = options.presets ?? module?.API_PROVIDERS ?? null;
  return { config, presets };
}

function hasLocal(local: LocalAiConfig): boolean {
  return Boolean(stripTrailingSlashes(local.url));
}

function hasProvider(provider: ProviderAiConfig, presets: RuntimeConfig['presets']): boolean {
  const base = stripTrailingSlashes(provider.baseUrl || presets?.[provider.id]?.baseUrl || '');
  return Boolean(provider.apiKey.trim()) && Boolean(base);
}

function localPlan(local: LocalAiConfig): CrisCallPlan {
  const base = stripTrailingSlashes(local.url);
  const backend = (local.backend ?? '').trim();
  return {
    target: {
      kind: 'local',
      label: backend ? `IA local · ${backend}` : 'IA local no dispositivo',
      endpoint: `${base}/v1/chat/completions`,
      model: (local.model ?? '').trim(),
      reason: 'Servidor de IA local salvo neste dispositivo.',
    },
    apiKey: '',
  };
}

function providerPlan(provider: ProviderAiConfig, presets: RuntimeConfig['presets']): CrisCallPlan {
  const preset = presets?.[provider.id] ?? null;
  const base = stripTrailingSlashes(provider.baseUrl || preset?.baseUrl || '');
  return {
    target: {
      kind: 'provider',
      label: preset ? `Provedor ${preset.label}` : 'Provedor de IA',
      endpoint: base ? `${base}/chat/completions` : '',
      model: (provider.model || preset?.defaultModel || '').trim(),
      reason: 'Chave guardada apenas neste dispositivo.',
    },
    apiKey: provider.apiKey.trim(),
  };
}

function fallbackPlan(): CrisCallPlan {
  return {
    target: {
      kind: 'fallback',
      label: 'Sem IA conectada',
      endpoint: '',
      model: '',
      reason: 'Nenhuma IA configurada — resposta pronta do app.',
    },
    apiKey: '',
  };
}

/** Fila de alvos: preferido primeiro, resposta pronta sempre por último. */
function listCrisPlans(config: AiConfig, presets: RuntimeConfig['presets']): CrisCallPlan[] {
  const localOk = hasLocal(config.local);
  const providerOk = hasProvider(config.provider, presets);
  const preferProvider = config.mode === 'provider' && providerOk;
  const plans: CrisCallPlan[] = [];
  if (preferProvider) plans.push(providerPlan(config.provider, presets));
  if (localOk) plans.push(localPlan(config.local));
  if (!preferProvider && providerOk) plans.push(providerPlan(config.provider, presets));
  plans.push(fallbackPlan());
  return plans;
}

/**
 * Decide qual alvo a Cris usa agora:
 * (a) IA local configurada → IA local · (b) provedor configurado → provedor ·
 * (c) nada configurado → resposta pronta do app.
 */
export function resolveCrisTarget(
  config: AiConfig,
  presets: Record<ApiProviderId, ApiProviderPreset> | null,
): CrisTarget {
  return listCrisPlans(config, presets)[0].target;
}

/* ------------------------------------------------------------------ *
 * Contexto de tela e prompts
 * ------------------------------------------------------------------ */

const SCREEN_LABELS: Record<string, string> = {
  '/': 'Início',
  '/library': 'Biblioteca',
  '/planning': 'Planejamento',
  '/editor': 'Editor de código',
  '/chat': 'Chat de estudos',
  '/settings': 'Configurações',
  '/profile': 'Perfil',
  '/subject': 'Matéria',
  '/document': 'Documento',
  '/pdf': 'Leitor de PDF',
  '/code': 'Código',
  '/api-settings': 'Configurações de IA',
  '/ai-settings': 'Configurações de IA',
};

function screenLabel(ctx: CrisContext): string {
  const declared = (ctx.screen ?? '').trim();
  if (declared) return declared;
  const route = (ctx.route ?? '').trim().replace(/^\/\(tabs\)/, '') || '/';
  return SCREEN_LABELS[route] ?? 'tela atual';
}

/** Descreve a tela aberta para o prompt (rota, título, seleção e assuntos). */
export function describeScreen(ctx: CrisContext): string {
  const route = (ctx.route ?? '').trim();
  const parts: string[] = [`Tela aberta: ${screenLabel(ctx)}`];
  if (route) parts.push(`rota ${route}`);
  const title = (ctx.title ?? '').trim();
  if (title) parts.push(`em foco: ${clip(title, 120)}`);
  const detail = (ctx.detail ?? '').trim();
  if (detail) parts.push(clip(detail, 160));
  const topics = (ctx.topics ?? []).map(topic => clip(topic, 40)).filter(Boolean).slice(0, 6);
  if (topics.length) parts.push(`assuntos: ${topics.join(', ')}`);
  const selection = (ctx.selection ?? '').trim();
  if (selection) parts.push(`texto selecionado: "${clip(selection, SELECTION_LIMIT)}"`);
  return parts.join(' · ');
}

/** Monta a mensagem do usuário: a pergunta primeiro, o contexto da tela depois. */
export function buildUserPrompt(message: string, ctx: CrisContext): string {
  const question = (message ?? '').trim();
  return `${question}\n\n[Contexto da tela]\n${describeScreen(ctx)}`;
}

/** Atalhos mostrados no popup, escolhidos pela tela em que o aluno está. */
function buildSuggestions(ctx: CrisContext): string[] {
  const route = (ctx.route ?? '').trim().replace(/^\/\(tabs\)/, '');
  if (route === '/pdf' || route === '/document') {
    return ['Resumir este documento', 'Listar os pontos principais', 'Criar 5 questões do texto'];
  }
  if (route === '/library' || route === '/subject') {
    return ['Resumir esta matéria', 'Criar 5 questões', 'Montar revisão de 30 min'];
  }
  if (route === '/planning') {
    return ['Organizar a semana', 'O que está atrasado?', 'Plano de 7 dias'];
  }
  if (route === '/chat') {
    return ['Resumir a conversa', 'Criar flashcards', 'Explique de outro jeito'];
  }
  if (route === '/editor' || route === '/code') {
    return ['Revisar meu código', 'Explicar este trecho', 'Sugerir exercícios'];
  }
  return ['Explicar um tema', 'Criar 5 questões', 'Montar um plano de estudo'];
}

/** Resposta pronta quando nenhuma IA está disponível (a Cris nunca fica sem responder). */
export function buildFallbackReply(message: string, ctx: CrisContext): string {
  const question = (message ?? '').trim();
  const text = question.toLowerCase();
  const lines: string[] = ['Não estou conectada a uma IA agora, então não consigo gerar conteúdo novo. Mas posso te orientar:'];
  if (!question) {
    lines.push('Escreva o que você quer entender e eu mostro o caminho.');
  } else if (text.includes('resum') || text.includes('sintetiz')) {
    lines.push('1) Releia só os títulos e o primeiro/último parágrafo de cada seção.\n2) Escreva uma frase por seção.\n3) Com IA conectada eu transformo essas frases em um resumo enxuto.');
  } else if (text.includes('quest') || text.includes('prova') || text.includes('quiz') || text.includes('simulado')) {
    lines.push('1) Escolha uma página do material.\n2) Transforme cada título em pergunta.\n3) Responda de memória e só depois confira no texto.\nCom IA conectada eu gero as questões e o gabarito comentado.');
  } else if (text.includes('plano') || text.includes('cronograma') || text.includes('revis')) {
    lines.push('1) Liste os tópicos no Planejamento.\n2) Distribua 3 tópicos por dia.\n3) Guarde o último dia só para os erros.\nCom IA conectada eu monto e ajusto a semana.');
  } else if (text.includes('expli') || text.includes('entend') || text.includes('como funciona') || text.includes('por que')) {
    lines.push('1) Releia o trecho devagar e marque o que não fez sentido.\n2) Anote a dúvida em uma frase.\n3) Com IA conectada eu explico passo a passo aqui.');
  } else {
    lines.push('1) Anote sua dúvida em uma frase.\n2) Veja o que já está no material.\n3) Conecte uma IA em Configurações → IA e eu respondo na hora.');
  }
  const focused = (ctx.title ?? '').trim();
  lines.push(focused ? `Você está em ${screenLabel(ctx)}, com "${clip(focused, 90)}" em foco.` : `Você está em ${screenLabel(ctx)}.`);
  lines.push('Para eu responder de verdade: Configurações → IA → use a IA local (Ollama, LM Studio) ou cole a chave de um provedor. A chave fica só neste aparelho.');
  return lines.join('\n\n');
}

/* ------------------------------------------------------------------ *
 * Erros amigáveis
 * ------------------------------------------------------------------ */

/** Traduz um erro técnico de chamada em uma mensagem curta para o aluno. */
export function readableCrisError(error: unknown): string {
  if (error instanceof CrisCallError) {
    if (error.canceled) return 'Chamada cancelada.';
    if (error.status === 401 || error.status === 403) return 'Chave inválida ou expirada. Verifique nas configurações.';
    if (error.status === 404) return 'Modelo ou endpoint não encontrado. Verifique as configurações.';
    if (error.status === 429) return 'Muitas requisições. Aguarde um pouco e tente de novo.';
    if (error.timedOut) return 'A IA não respondeu a tempo. Verifique se está ligada.';
    if (error.empty) return 'A IA respondeu sem texto. Tente novamente.';
    if (error.offline) {
      return error.kind === 'local'
        ? 'Não foi possível alcançar a IA local. No navegador, pode ser bloqueio de CORS. Tente no app (Android).'
        : 'Falha de rede ao contatar o provedor. Verifique a conexão.';
    }
    if (error.status) return `A IA respondeu ${error.status}. Tente novamente em instantes.`;
    return 'Não foi possível falar com a IA agora.';
  }
  if (error instanceof Error) {
    if (error.name === 'AbortError') return 'A IA não respondeu a tempo. Verifique se está ligada.';
    const message = error.message.toLowerCase();
    if (message.includes('cors')) return 'No navegador, pode ser bloqueio de CORS. Tente no app (Android).';
    if (message.includes('network') || message.includes('fetch')) return 'Falha de rede ao contatar a IA. Verifique a conexão.';
  }
  return 'Não foi possível falar com a IA agora.';
}

/* ------------------------------------------------------------------ *
 * Camada de rede (sempre direto do dispositivo — nunca pelo servidor)
 * ------------------------------------------------------------------ */

function buildMessages(question: string, ctx: CrisContext, history: CrisHistoryTurn[] | undefined): ChatMessage[] {
  const messages: ChatMessage[] = [{ role: 'system', content: CRIS_SYSTEM_PROMPT }];
  for (const turn of (history ?? []).slice(-HISTORY_LIMIT)) {
    const content = (turn?.content ?? '').trim();
    if (!content) continue;
    messages.push({ role: turn.role === 'assistant' ? 'assistant' : 'user', content });
  }
  messages.push({ role: 'user', content: buildUserPrompt(question, ctx) });
  return messages;
}

function tryParseJson(value: string): unknown {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

/** Lê o texto de uma resposta compatível com a API OpenAI (chat, streaming ou legacy). */
function extractChatText(payload: unknown): string {
  if (!payload || typeof payload !== 'object') return '';
  const source = payload as {
    choices?: Array<{ message?: { content?: unknown }; delta?: { content?: unknown }; text?: unknown }>;
    message?: { content?: unknown };
    response?: unknown;
  };
  if (Array.isArray(source.choices)) {
    for (const choice of source.choices) {
      for (const candidate of [choice?.message?.content, choice?.delta?.content, choice?.text]) {
        if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
      }
    }
  }
  if (typeof source.response === 'string' && source.response.trim()) return source.response.trim();
  const native = source.message?.content;
  if (typeof native === 'string' && native.trim()) return native.trim();
  return '';
}

/** Uma linha de SSE → texto do delta, `SSE_DONE`, '' (sem conteúdo) ou null (ignorar). */
function parseSseFrame(line: string): string | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith(':') || !trimmed.startsWith('data:')) return null;
  const payload = trimmed.slice(5).trim();
  if (!payload) return null;
  if (payload === '[DONE]') return SSE_DONE;
  return extractChatText(tryParseJson(payload));
}

function buildRequestBody(plan: CrisCallPlan, messages: ChatMessage[], stream: boolean, maxTokens: number | undefined): string {
  const tokens = typeof maxTokens === 'number' && maxTokens > 0 ? maxTokens : CHAT_MAX_TOKENS;
  return JSON.stringify({
    ...(plan.target.model ? { model: plan.target.model } : {}),
    messages,
    temperature: CHAT_TEMPERATURE,
    max_tokens: tokens,
    stream,
  });
}

function buildHeaders(plan: CrisCallPlan, stream: boolean): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: stream ? 'text/event-stream' : 'application/json',
  };
  // A chave sai daqui só para o fetch — nunca é registrada em log.
  if (plan.apiKey) headers.Authorization = `Bearer ${plan.apiKey}`;
  return headers;
}

async function fetchCris(
  plan: CrisCallPlan,
  body: string,
  stream: boolean,
  timeoutMs: number | undefined,
  externalSignal: AbortSignal | undefined,
): Promise<Response> {
  const kind: 'local' | 'provider' = plan.target.kind === 'provider' ? 'provider' : 'local';
  const controller = new AbortController();
  const onAbort = () => controller.abort();
  if (externalSignal) {
    if (externalSignal.aborted) controller.abort();
    else externalSignal.addEventListener('abort', onAbort, { once: true });
  }
  const timeout = typeof timeoutMs === 'number' && timeoutMs > 0 ? timeoutMs : CHAT_TIMEOUT_MS;
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(plan.target.endpoint, {
      method: 'POST',
      headers: buildHeaders(plan, stream),
      body,
      signal: controller.signal,
    });
    if (!response.ok) throw new CrisCallError(kind, { status: response.status });
    return response;
  } catch (error) {
    if (error instanceof CrisCallError) throw error;
    if (externalSignal?.aborted) throw new CrisCallError(kind, { canceled: true });
    const name = error instanceof Error ? error.name : '';
    if (name === 'AbortError' || name === 'TimeoutError') throw new CrisCallError(kind, { timedOut: true });
    throw new CrisCallError(kind, { offline: true });
  } finally {
    clearTimeout(timer);
    externalSignal?.removeEventListener('abort', onAbort);
  }
}

async function requestCompletion(
  plan: CrisCallPlan,
  messages: ChatMessage[],
  options: { timeoutMs?: number; maxTokens?: number; signal?: AbortSignal },
): Promise<string> {
  const body = buildRequestBody(plan, messages, false, options.maxTokens);
  const response = await fetchCris(plan, body, false, options.timeoutMs, options.signal);
  const payload = await response.json().catch(() => null);
  const text = extractChatText(payload);
  if (!text) throw new CrisCallError(plan.target.kind === 'provider' ? 'provider' : 'local', { empty: true });
  return text;
}

/** Lê o corpo em SSE entregando cada delta. Devolve '' quando não há stream útil. */
async function consumeStreamed(response: Response, onChunk: (chunk: string) => void): Promise<string> {
  const body = response.body as ReadableStream<Uint8Array> | null;
  if (!body || typeof body.getReader !== 'function' || typeof TextDecoder === 'undefined') return '';
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let raw = '';
  let streamed = '';
  let finished = false;
  while (!finished) {
    const chunk = await reader.read();
    if (chunk.done) break;
    const piece = chunk.value ? decoder.decode(chunk.value, { stream: true }) : '';
    if (!piece) continue;
    raw += piece;
    buffer += piece;
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      const delta = parseSseFrame(line);
      if (delta === null) continue;
      if (delta === SSE_DONE) { finished = true; break; }
      if (delta) { streamed += delta; onChunk(delta); }
    }
  }
  if (buffer && !finished) {
    const delta = parseSseFrame(buffer);
    if (delta && delta !== SSE_DONE) { streamed += delta; onChunk(delta); }
  }
  if (streamed) return streamed;
  // Servidor respondeu JSON apesar de stream=true → entrega o texto de uma vez.
  const degraded = extractChatText(tryParseJson(raw));
  if (degraded) onChunk(degraded);
  return degraded;
}

/* ------------------------------------------------------------------ *
 * API pública
 * ------------------------------------------------------------------ */

function finishReply(text: string, target: CrisTarget, startedAt: number, fallbackReason: string | null, ctx: CrisContext): CrisReply {
  return {
    text,
    target,
    latencyMs: Date.now() - startedAt,
    fallbackReason,
    suggestions: buildSuggestions(ctx),
  };
}

function joinFailures(failures: string[]): string | null {
  if (!failures.length) return null;
  return Array.from(new Set(failures)).join(' ');
}

/** Fila de alvos pronta para uso (cai em resposta pronta se a config não puder ser lida). */
async function preparePlans(options: CrisAskOptions): Promise<{ plans: CrisCallPlan[]; configUnavailable: boolean }> {
  const runtime = await resolveRuntime(options);
  if (!runtime.config) return { plans: [fallbackPlan()], configUnavailable: true };
  return { plans: listCrisPlans(runtime.config, runtime.presets), configUnavailable: false };
}

const CONFIG_UNAVAILABLE = 'Não foi possível ler a configuração de IA neste dispositivo.';

/**
 * Pergunta para a Cris. Nunca lança: se nenhuma IA responder, devolve a
 * resposta pronta do app junto com o motivo amigável da falha.
 */
export async function askCris(message: string, ctx: CrisContext, options: CrisAskOptions = {}): Promise<CrisReply> {
  const startedAt = Date.now();
  const question = (message ?? '').trim();
  const { plans, configUnavailable } = await preparePlans(options);
  const last = plans[plans.length - 1].target;
  if (!question) return finishReply('Escreva sua dúvida e eu te ajudo.', last, startedAt, null, ctx);
  const messages = buildMessages(question, ctx, options.history);
  const failures: string[] = [];
  for (const plan of plans) {
    if (plan.target.kind === 'fallback') break;
    try {
      const text = await requestCompletion(plan, messages, {
        timeoutMs: options.timeoutMs,
        maxTokens: options.maxTokens,
        signal: options.signal,
      });
      return finishReply(text, plan.target, startedAt, joinFailures(failures), ctx);
    } catch (error) {
      failures.push(readableCrisError(error));
    }
  }
  const reason = configUnavailable ? CONFIG_UNAVAILABLE : joinFailures(failures);
  return finishReply(buildFallbackReply(question, ctx), last, startedAt, reason, ctx);
}

/**
 * Igual a `askCris`, mas entrega o texto em partes conforme chega (SSE).
 * Se o aparelho ou o servidor não suportarem streaming, a mesma pergunta é
 * refeita sem stream e o texto chega de uma vez — o resultado não muda.
 */
export async function streamCris(
  message: string,
  ctx: CrisContext,
  onChunk: (chunk: string) => void,
  options: CrisAskOptions = {},
): Promise<CrisReply> {
  const emit = typeof onChunk === 'function' ? onChunk : () => {};
  const startedAt = Date.now();
  const question = (message ?? '').trim();
  const { plans, configUnavailable } = await preparePlans(options);
  const last = plans[plans.length - 1].target;
  if (!question) {
    const text = 'Escreva sua dúvida e eu te ajudo.';
    emit(text);
    return finishReply(text, last, startedAt, null, ctx);
  }
  const messages = buildMessages(question, ctx, options.history);
  const failures: string[] = [];
  for (const plan of plans) {
    if (plan.target.kind === 'fallback') break;
    try {
      let text = '';
      if (typeof TextDecoder !== 'undefined') {
        const body = buildRequestBody(plan, messages, true, options.maxTokens);
        const response = await fetchCris(plan, body, true, options.timeoutMs, options.signal);
        text = await consumeStreamed(response, emit);
      }
      if (!text) {
        text = await requestCompletion(plan, messages, {
          timeoutMs: options.timeoutMs,
          maxTokens: options.maxTokens,
          signal: options.signal,
        });
        emit(text);
      }
      return finishReply(text, plan.target, startedAt, joinFailures(failures), ctx);
    } catch (error) {
      failures.push(readableCrisError(error));
    }
  }
  const fallbackText = buildFallbackReply(question, ctx);
  emit(fallbackText);
  return finishReply(fallbackText, last, startedAt, configUnavailable ? CONFIG_UNAVAILABLE : joinFailures(failures), ctx);
}



