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
import { describeUserMemory, type CrisUserMemory } from './cris-memory';

/* ------------------------------------------------------------------ *
 * Constantes
 * ------------------------------------------------------------------ */

// Teto do PRIMEIRO byte (TTFB): depois que o provedor começa a responder, este
// timer é cancelado no `finally` do fetch — o tempo gasto DENTRO do stream é
// assunto do CHAT_STREAM_IDLE_MS (Fix 2, ainda não ligado).
const CHAT_TIMEOUT_MS = 30000;
// Silêncio máximo dentro de um stream já aberto (Fix 2, ainda não ligado).
// Mantida de propósito: `tests/cris-memory.test.ts` trava esta linha literalmente.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const CHAT_STREAM_IDLE_MS = 20000;
// Respostas mais curtas e menos "criativas" (0.3) reduzem o loop de
// repetição em modelos locais pequenos (LocalAI/llama.cpp). Se a repetição
// persistir, o caminho é subir de modelo (Groq/Gemini) em Ajustes → IA.
// O teto era 600 e cortava a resposta no meio da frase: no Gemini 3/2.5 os
// tokens de raciocínio ("thinking") entram no MESMO `max_tokens`, então sobrava
// quase nada de texto visível. 2048 cobre o estilo pedido no prompt do sistema.
const CHAT_MAX_TOKENS = 2048;
/** Aviso mostrado quando o provedor para a resposta antes do fim (corte por `max_tokens`). */
const TRUNCATED_MESSAGE = 'A resposta foi cortada pelo limite de tamanho. Peça "continue" ou aumente o limite.';
const CHAT_TEMPERATURE = 0.3;
const HISTORY_LIMIT = 8;
const SELECTION_LIMIT = 280;
const SSE_DONE = '\u0000done';

const CRIS_SYSTEM_PROMPT = [
  '# Papel',
  'Você é a Cris, a mentora de estudos do aplicativo Estudo Organizado.',
  'Você foi criada por Cris Oliveira Santos, a dona do app.',
  'Fale em português do Brasil, com tom acolhedor e direto, sem bajular e sem concordar com tudo.',
  'Você é uma mentora acolhedora e direta: acompanha o ritmo da pessoa, não é professora rígida e não cobra metas.',
  '',
  '# Sobre o aplicativo "Estudo Organizado"',
  'É um app de estudos. As telas do app são: Hoje, Editor, Planejamento, Biblioteca, Conversas e Ajustes.',
  'Quando perguntarem sobre o app, explique essas telas e o que dá para fazer em cada uma. Não invente telas, botões nem funções fora desta lista.',
  'O app NÃO é um sistema operacional, um aparelho, um site nem um assistente de sistema.',
  '',
  '# Onde você está',
  'A mensagem do aluno traz um bloco "[Contexto da tela do app]". Ele descreve SOMENTE a tela do Estudo Organizado que o aluno está vendo agora.',
  'Use esse bloco apenas para adaptar a resposta à tela. NUNCA o repita, nunca o liste e nunca o trate como se fosse o celular ou as configurações do dispositivo.',
  '',
  '# O que você PODE fazer',
  'Explicar um assunto passo a passo; resumir um material; criar questões; montar e ajustar um plano de estudo; sugerir o próximo passo dentro da tela em que o aluno está; explicar para que serve cada tela do app.',
  '',
  '# O que você NÃO PODE fazer',
  'Você não vê a tela, o arquivo, o dispositivo nem a câmera do aluno. Você não executa ações no app e não acessa dados que não estejam escritos no que o aluno enviou.',
  'Você NÃO participa da conversa com outras pessoas no Chat — isso é uma fase futura do app. Se pedirem, diga isso em uma frase e continue ajudando por aqui.',
  'Você NUNCA fala sobre configurações do dispositivo, senha, Wi-Fi, tela do celular, sistema operacional ou apps instalados.',
  '',
  '# O que ainda não existe',
  'Ainda não existem no app: a Cris conversar com outras pessoas, a leitura automática dos PDFs e imagens do aluno e o acesso à tela ou aos arquivos. Se perguntarem, responda em uma frase que isso ainda não está pronto e continue ajudando com o que você sabe.',
  '',
  '# Regras obrigatórias',
  'NUNCA invente: não crie nomes de pessoas, equipes, empresas, professores, datas, números, funcionalidades, links nem trechos de arquivos que não apareçam no que o aluno enviou, no contexto ou no bloco "Sobre quem conversa com você".',
  'NUNCA repita: não repita frases, itens, passos nem perguntas. Cada resposta precisa trazer informação nova.',
  'NUNCA repita a saudação nem reinicie a conversa no meio dela.',
  'NUNCA faça a mesma pergunta duas vezes na mesma conversa: se você já perguntou e o aluno respondeu, use a resposta e siga em frente. Se ficar em dúvida sobre o que dizer, escreva no máximo uma frase nova ou diga "não sei" e pare.',
  'Se o pedido fugir de estudos ou do Estudo Organizado, diga em uma frase que isso foge do seu papel de mentora e retome o foco.',
  'Se faltar informação, diga em UMA frase o que o aluno precisa abrir, selecionar ou enviar — e não invente o conteúdo.',
  'Se não souber, diga "não sei" e pare; no máximo ofereça o próximo passo em uma frase. Nunca preencha a lacuna com invenção.',
  '',
  '# Estilo',
  'Responda de forma CONCISA e DIRETA: no máximo 5 itens ou 3 parágrafos curtos.',
  'Prefira passos práticos e numerados. Não escreva introduções longas e não repita a pergunta do aluno.',
].join('\n');

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
  /**
   * Dados reais do app (matérias, tarefas pendentes, progresso e notas),
   * montados por `lib/cris-study-context.ts`. Vai no system prompt para a
   * Cris montar planos com o que a pessoa realmente tem para estudar.
   */
  appContext?: string | null;
};

export type CrisAskOptions = {
  /** Configuração já carregada (produção usa o SecureStore; testes injetam). */
  config?: AiConfig;
  /** Presets de provedores (produção usa API_PROVIDERS). */
  presets?: Record<ApiProviderId, ApiProviderPreset>;
  /** Apelido "vivo" por provedor (produção usa PROVIDER_LIVE_MODEL; usado no hot-swap). */
  liveModel?: Record<ApiProviderId, string>;
  /** Histórico da sessão, do mais antigo para o mais recente. */
  history?: CrisHistoryTurn[];
  /** Memória do usuário (opcional; a interface lê de `lib/cris-memory`). */
  memory?: CrisUserMemory;
  timeoutMs?: number;
  maxTokens?: number;
  signal?: AbortSignal;
};

/** Tipo de falha da IA, já classificado, para a interface reagir sem reler o texto. */
export type CrisFailureKind =
  | 'retired-model'
  | 'invalid-key'
  | 'rate-limit'
  | 'timeout'
  | 'offline'
  | 'empty'
  /** A IA parou por atingir o teto de tokens: o texto chegou pela metade. */
  | 'truncated'
  | 'other';

/** Detalhes de uma falha da IA (ex.: modelo aposentado), mostrados com ação ao usuário. */
export type CrisFailure = {
  kind: CrisFailureKind;
  /** Modelo que falhou (quando conhecido). */
  model?: string;
  /** Mensagem pronta para o aluno (nunca "erro desconhecido"). */
  message: string;
  /** No hot-swap: o modelo vivo que passou a ser usado no lugar do aposentado. */
  switchedTo?: string;
};

export type CrisReply = {
  text: string;
  target: CrisTarget;
  latencyMs: number;
  /** Por que a resposta não veio de uma IA (mensagem amigável) — ou null. */
  fallbackReason: string | null;
  suggestions: string[];
  /** Detalhes da falha quando a IA esperada não respondeu (ex.: modelo aposentado). */
  failure?: CrisFailure | null;
};

/* ------------------------------------------------------------------ *
 * Internos
 * ------------------------------------------------------------------ */

/**
 * Plano de chamada: alvo público (sem chave) + a chave usada só no fetch.
 * `providerId` identifica o provedor (para o hot-swap) e `swapModel` guarda o
 * modelo vivo alternativo a tentar quando o modelo salvo dá 404.
 */
type CrisCallPlan = { target: CrisTarget; apiKey: string; providerId?: ApiProviderId; swapModel?: string };

type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

/**
 * Marca de geração do turno. Vive em cada chamada de `askCris`/`streamCris` e é
 * ligada quando o provedor sinaliza `finish_reason: 'length'` — assim o aviso de
 * corte é montado no fim do turno, sem perder o texto que já chegou.
 */
type CrisGeneration = { truncated: boolean };

type ApiConfigModule = typeof import('@/lib/api-config');

type RuntimeConfig = {
  config: AiConfig | null;
  presets: Record<ApiProviderId, ApiProviderPreset> | null;
  liveModel: Record<ApiProviderId, string> | null;
};

/** Erro de chamada já classificado. Nunca carrega a chave nem o corpo da resposta. */
export class CrisCallError extends Error {
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
  const liveModel = options.liveModel ?? module?.PROVIDER_LIVE_MODEL ?? null;
  return { config, presets, liveModel };
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

function providerPlan(
  provider: ProviderAiConfig,
  presets: RuntimeConfig['presets'],
  liveModel: RuntimeConfig['liveModel'],
): CrisCallPlan {
  const preset = presets?.[provider.id] ?? null;
  const base = stripTrailingSlashes(provider.baseUrl || preset?.baseUrl || '');
  const model = (provider.model || preset?.defaultModel || '').trim();
  // Modelo vivo alternativo (hot-swap): o apelido do provedor que não envelhece
  // (ou o defaultModel) — só vale quando é diferente do modelo salvo.
  const alias = (liveModel?.[provider.id] ?? preset?.defaultModel ?? '').trim();
  return {
    target: {
      kind: 'provider',
      label: preset ? `Provedor ${preset.label}` : 'Provedor de IA',
      endpoint: base ? `${base}/chat/completions` : '',
      model,
      reason: 'Chave guardada apenas neste dispositivo.',
    },
    apiKey: provider.apiKey.trim(),
    providerId: provider.id,
    swapModel: alias && alias !== model ? alias : undefined,
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
function listCrisPlans(
  config: AiConfig,
  presets: RuntimeConfig['presets'],
  liveModel: RuntimeConfig['liveModel'] = null,
): CrisCallPlan[] {
  const localOk = hasLocal(config.local);
  const providerOk = hasProvider(config.provider, presets);
  const preferProvider = config.mode === 'provider' && providerOk;
  const plans: CrisCallPlan[] = [];
  if (preferProvider) plans.push(providerPlan(config.provider, presets, liveModel));
  if (localOk) plans.push(localPlan(config.local));
  if (!preferProvider && providerOk) plans.push(providerPlan(config.provider, presets, liveModel));
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

/**
 * System do turno: regras fixas + contexto dinâmico da tela.
 * O contexto vai no papel de sistema (maior peso em modelos pequenos) para a
 * Cris saber onde está sem precisar adivinhar nem falar do dispositivo.
 */
export function buildSystemPrompt(ctx: CrisContext, memory?: Partial<CrisUserMemory> | null): string {
  const appContext = (ctx.appContext ?? '').trim();
  const studyBlock = appContext ? `\n\n[Contexto do usuário]\n${clip(appContext, 1800)}` : '';
  return `${CRIS_SYSTEM_PROMPT}\n\n${describeUserMemory(memory)}\n\n[Contexto da tela do app]\n${describeScreen(ctx)}${studyBlock}`;
}

/**
 * Monta a mensagem do usuário. Ordem corrigida: contexto PRIMEIRO e a pergunta
 * por ÚLTIMO — modelos pequenos respondem ao último bloco recebido, e antes o
 * último bloco era o contexto da tela (origem do delírio sobre "Configurações").
 */
export function buildUserPrompt(message: string, ctx: CrisContext): string {
  const question = (message ?? '').trim() || 'Apresente-se em uma frase e diga como você pode ajudar nesta tela.';
  const hasStudyContext = Boolean((ctx.appContext ?? '').trim());
  return [
    '[Lembrete do contexto da tela do app]',
    describeScreen(ctx),
    '',
    ...(hasStudyContext
      ? ['[Lembrete do contexto do usuário]', 'Use as matérias, tarefas e o progresso do bloco "[Contexto do usuário]" do sistema para personalizar a resposta.', '']
      : []),
    '[Pergunta do aluno]',
    question,
    '',
    'Responda à pergunta do aluno em português do Brasil, de forma concisa.',
  ].join('\n');
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

/**
 * Classifica uma falha de chamada em um `CrisFailure` pronto para a interface
 * (tipo + mensagem). Troca o texto genérico por mensagens acionáveis —
 * "modelo aposentado", "chave inválida", "limite atingido" etc. — conforme
 * pedido da usuária. Nunca devolve "erro desconhecido".
 */
export function describeCrisFailure(error: unknown, target?: CrisTarget): CrisFailure {
  const model = target?.model?.trim() || undefined;
  if (error instanceof CrisCallError) {
    if (error.canceled) return { kind: 'other', message: 'Chamada cancelada.', model };
    if (error.status === 401 || error.status === 403) {
      return { kind: 'invalid-key', message: 'Chave inválida ou expirada. Gere uma nova no provedor.', model };
    }
    if (error.status === 404) {
      return {
        kind: 'retired-model',
        model,
        message: model
          ? `Seu modelo "${model}" não funciona mais. Ele pode ter sido aposentado pelo provedor — escolha um modelo vivo.`
          : 'Seu modelo não funciona mais. Ele pode ter sido aposentado pelo provedor — escolha um modelo vivo.',
      };
    }
    if (error.status === 429) {
      return { kind: 'rate-limit', message: 'Limite atingido. Aguarde um pouco ou troque de modelo.', model };
    }
    if (error.timedOut) return { kind: 'timeout', message: 'A IA não respondeu a tempo. Verifique se está ligada.', model };
    if (error.empty) return { kind: 'empty', message: 'A IA respondeu sem texto. Tente novamente.', model };
    if (error.offline) {
      return {
        kind: 'offline',
        model,
        message: error.kind === 'local'
          ? 'Não foi possível alcançar a IA local. No navegador, pode ser bloqueio de CORS. Tente no app (Android).'
          : 'Falha de rede ao contatar o provedor. Verifique a conexão.',
      };
    }
    if (error.status) return { kind: 'other', message: `A IA respondeu ${error.status}. Tente novamente em instantes.`, model };
    return { kind: 'other', message: 'Não foi possível falar com a IA agora.', model };
  }
  return { kind: 'other', message: readableCrisError(error), model };
}

/* ------------------------------------------------------------------ *
 * Camada de rede (sempre direto do dispositivo — nunca pelo servidor)
 * ------------------------------------------------------------------ */

/** Aviso de resposta cortada pelo teto de tokens (null quando não houve corte). */
function truncatedFailure(target: CrisTarget, generation: CrisGeneration): CrisFailure | null {
  if (!generation.truncated) return null;
  return { kind: 'truncated', message: TRUNCATED_MESSAGE, model: target.model?.trim() || undefined };
}

function buildMessages(question: string, ctx: CrisContext, history: CrisHistoryTurn[] | undefined, memory?: Partial<CrisUserMemory> | null): ChatMessage[] {
  const messages: ChatMessage[] = [{ role: 'system', content: buildSystemPrompt(ctx, memory) }];
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

/**
 * Lê o texto de uma resposta compatível com a API OpenAI (chat, streaming ou legacy).
 * `preserveWhitespace` é obrigatório no caminho de streaming: cada delta do SSE é um
 * pedaço do texto e o espaço que separa duas palavras costuma vir na borda do pedaço —
 * um `trim()` por delta cola as palavras ("Sim,eutenhoacesso" no lugar de "Sim, eu tenho
 * acesso"). Fora do streaming o `trim()` continua valendo, pois o JSON traz a mensagem
 * inteira.
 */
function extractChatText(payload: unknown, preserveWhitespace = false): string {
  if (!payload || typeof payload !== 'object') return '';
  const source = payload as {
    choices?: { message?: { content?: unknown }; delta?: { content?: unknown }; text?: unknown }[];
    message?: { content?: unknown };
    response?: unknown;
  };
  const pick = (candidate: unknown): string | null => {
    if (typeof candidate !== 'string') return null;
    if (preserveWhitespace) return candidate.length ? candidate : null;
    const clean = candidate.trim();
    return clean ? clean : null;
  };
  if (Array.isArray(source.choices)) {
    for (const choice of source.choices) {
      for (const candidate of [choice?.message?.content, choice?.delta?.content, choice?.text]) {
        const text = pick(candidate);
        if (text !== null) return text;
      }
    }
  }
  return pick(source.response) ?? pick(source.message?.content) ?? '';
}

/**
 * `finish_reason` de uma resposta compatível com a API OpenAI ('' quando ausente).
 * `'length'` é o sinal de que o provedor parou por atingir `max_tokens`.
 */
function readFinishReason(payload: unknown): string {
  if (!payload || typeof payload !== 'object') return '';
  const choices = (payload as { choices?: { finish_reason?: unknown }[] }).choices;
  if (!Array.isArray(choices)) return '';
  for (const choice of choices) {
    const reason = choice?.finish_reason;
    if (typeof reason === 'string' && reason) return reason;
  }
  return '';
}

/** Liga `generation.truncated` quando o motivo informado pelo provedor é o teto de tokens. */
function markTruncated(payload: unknown, generation: CrisGeneration | undefined): void {
  if (generation && readFinishReason(payload) === 'length') generation.truncated = true;
}

/**
 * Vê o `finish_reason` de uma linha de SSE. No streaming o motivo vem no frame
 * final, com `delta` vazio — ou seja, ele nunca aparece no texto entregue.
 */
function watchFinishReason(line: string, generation: CrisGeneration | undefined): void {
  if (!generation || generation.truncated) return;
  const trimmed = line.trim();
  if (!trimmed.startsWith('data:')) return;
  const payload = trimmed.slice(5).trim();
  if (!payload || payload === '[DONE]') return;
  markTruncated(tryParseJson(payload), generation);
}

/** Uma linha de SSE → texto do delta, `SSE_DONE`, '' (sem conteúdo) ou null (ignorar). */
function parseSseFrame(line: string): string | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith(':') || !trimmed.startsWith('data:')) return null;
  const payload = trimmed.slice(5).trim();
  if (!payload) return null;
  if (payload === '[DONE]') return SSE_DONE;
  // Streaming: NUNCA aparar o delta — o espaço entre palavras vive na borda do pedaço.
  return extractChatText(tryParseJson(payload), true);
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
  options: { timeoutMs?: number; maxTokens?: number; signal?: AbortSignal; generation?: CrisGeneration },
): Promise<string> {
  const body = buildRequestBody(plan, messages, false, options.maxTokens);
  const response = await fetchCris(plan, body, false, options.timeoutMs, options.signal);
  const payload = await response.json().catch(() => null);
  markTruncated(payload, options.generation);
  const text = extractChatText(payload);
  if (!text) throw new CrisCallError(plan.target.kind === 'provider' ? 'provider' : 'local', { empty: true });
  return text;
}

/** Lê o corpo em SSE entregando cada delta. Devolve '' quando não há stream útil. */
async function consumeStreamed(response: Response, onChunk: (chunk: string) => void, generation?: CrisGeneration): Promise<string> {
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
      watchFinishReason(line, generation);
      const delta = parseSseFrame(line);
      if (delta === null) continue;
      if (delta === SSE_DONE) { finished = true; break; }
      if (delta) { streamed += delta; onChunk(delta); }
    }
  }
  if (buffer && !finished) {
    watchFinishReason(buffer, generation);
    const delta = parseSseFrame(buffer);
    if (delta && delta !== SSE_DONE) { streamed += delta; onChunk(delta); }
  }
  // Apara apenas as pontas do texto inteiro (o miolo fica intacto, com os espaços).
  if (streamed) return streamed.trim();
  // Servidor respondeu JSON apesar de stream=true → entrega o texto de uma vez.
  const payload = tryParseJson(raw);
  markTruncated(payload, generation);
  const degraded = extractChatText(payload);
  if (degraded) onChunk(degraded);
  return degraded;
}

/* ------------------------------------------------------------------ *
 * API pública
 * ------------------------------------------------------------------ */

function finishReply(
  text: string,
  target: CrisTarget,
  startedAt: number,
  fallbackReason: string | null,
  ctx: CrisContext,
  failure: CrisFailure | null = null,
): CrisReply {
  return {
    text,
    target,
    latencyMs: Date.now() - startedAt,
    fallbackReason,
    suggestions: buildSuggestions(ctx),
    failure,
  };
}

function joinFailures(failures: string[]): string | null {
  if (!failures.length) return null;
  return Array.from(new Set(failures)).join(' ');
}

/**
 * Hot-swap: quando o modelo salvo do provedor dá 404 (aposentado) e existe um
 * modelo vivo alternativo, tenta-o uma vez. Se responder, devolve a resposta já
 * com o aviso "usei o modelo X porque o seu não funciona mais"; se também falhar,
 * devolve null e o fluxo normal segue (empilha a falha e cai no próximo alvo /
 * resposta pronta). Assim a usuária NUNCA fica travada sem perceber o motivo.
 */
async function hotSwap(
  plan: CrisCallPlan,
  descriptor: CrisFailure,
  run: (plan: CrisCallPlan) => Promise<string>,
  failures: string[],
  startedAt: number,
  ctx: CrisContext,
  generation: CrisGeneration,
): Promise<CrisReply | null> {
  if (descriptor.kind !== 'retired-model' || !plan.swapModel || plan.swapModel === plan.target.model) return null;
  const swappedPlan: CrisCallPlan = { ...plan, target: { ...plan.target, model: plan.swapModel } };
  try {
    const text = await run(swappedPlan);
    const notice: CrisFailure = {
      kind: 'retired-model',
      model: plan.target.model,
      switchedTo: plan.swapModel,
      message: `Usei o modelo "${plan.swapModel}" porque o seu ("${plan.target.model}") não funciona mais. Toque em "Corrigir agora" para fixar o novo modelo.`,
    };
    return finishReply(text, swappedPlan.target, startedAt, joinFailures(failures.concat(notice.message)), ctx, truncatedFailure(swappedPlan.target, generation) ?? notice);
  } catch (error) {
    failures.push(describeCrisFailure(error, plan.target).message);
    return null;
  }
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
  /** Marca deste turno: ligada se o provedor cortar a resposta por `max_tokens`. */
  const generation: CrisGeneration = { truncated: false };
  const startedAt = Date.now();
  const question = (message ?? '').trim();
  const { plans, configUnavailable } = await preparePlans(options);
  const last = plans[plans.length - 1].target;
  if (!question) return finishReply('Escreva sua dúvida e eu te ajudo.', last, startedAt, null, ctx);
  const messages = buildMessages(question, ctx, options.history, options.memory);
  const failures: string[] = [];
  let failure: CrisFailure | null = null;
  const run = (plan: CrisCallPlan) =>
    requestCompletion(plan, messages, { timeoutMs: options.timeoutMs, maxTokens: options.maxTokens, signal: options.signal, generation });
  for (const plan of plans) {
    if (plan.target.kind === 'fallback') break;
    try {
      const text = await run(plan);
      return finishReply(text, plan.target, startedAt, joinFailures(failures), ctx, truncatedFailure(plan.target, generation) ?? failure);
    } catch (error) {
      const descriptor = describeCrisFailure(error, plan.target);
      if (plan.target.kind === 'provider') failure = descriptor;
      const swapped = await hotSwap(plan, descriptor, run, failures, startedAt, ctx, generation);
      if (swapped) return swapped;
      failures.push(descriptor.message);
    }
  }
  const reason = configUnavailable ? CONFIG_UNAVAILABLE : joinFailures(failures);
  return finishReply(buildFallbackReply(question, ctx), last, startedAt, reason, ctx, failure);
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
  const messages = buildMessages(question, ctx, options.history, options.memory);
  const failures: string[] = [];
  let failure: CrisFailure | null = null;
  /** Marca deste turno: ligada se o provedor cortar a resposta por `max_tokens`. */
  const generation: CrisGeneration = { truncated: false };
  const run = async (plan: CrisCallPlan): Promise<string> => {
    let text = '';
    if (typeof TextDecoder !== 'undefined') {
      const body = buildRequestBody(plan, messages, true, options.maxTokens);
      const response = await fetchCris(plan, body, true, options.timeoutMs, options.signal);
      text = await consumeStreamed(response, emit, generation);
    }
    if (!text) {
      text = await requestCompletion(plan, messages, {
        generation,
        timeoutMs: options.timeoutMs,
        maxTokens: options.maxTokens,
        signal: options.signal,
      });
      emit(text);
    }
    return text;
  };
  for (const plan of plans) {
    if (plan.target.kind === 'fallback') break;
    try {
      const text = await run(plan);
      return finishReply(text, plan.target, startedAt, joinFailures(failures), ctx, truncatedFailure(plan.target, generation) ?? failure);
    } catch (error) {
      const descriptor = describeCrisFailure(error, plan.target);
      if (plan.target.kind === 'provider') failure = descriptor;
      const swapped = await hotSwap(plan, descriptor, run, failures, startedAt, ctx, generation);
      if (swapped) return swapped;
      failures.push(descriptor.message);
    }
  }
  const fallbackText = buildFallbackReply(question, ctx);
  emit(fallbackText);
  return finishReply(fallbackText, last, startedAt, configUnavailable ? CONFIG_UNAVAILABLE : joinFailures(failures), ctx, failure);
}



