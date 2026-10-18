/**
 * Flashcards a partir do texto de um PDF/nota.
 *
 * A geração usa a IA que já está configurada no aparelho (Ajustes → APIs de IA):
 * qualquer provedor compatível com a API OpenAI — inclusive o Gemini, cujo
 * endpoint é `…/v1beta/openai` — ou a IA local (Ollama/LM Studio). Se nada
 * estiver configurado, o app monta cartões de completar sozinho, offline.
 *
 * Este módulo é puro no topo (nenhum import de `react-native`): a configuração
 * é carregada por `import()` tardio dentro de `generateFlashcards`, o que mantém
 * `parseFlashcards`/`localFlashcards` testáveis em Node.
 */

import type { AiConfig } from '@/lib/api-config';

export type Flashcard = { answer: string; id: string; question: string };

export type FlashcardEngine = { kind: 'local' | 'provider'; label: string; model?: string };

export type FlashcardResult = { cards: Flashcard[]; engine: FlashcardEngine };

export const DEFAULT_FLASHCARD_COUNT = 5;
export const MAX_FLASHCARD_COUNT = 12;
export const MIN_FLASHCARD_SOURCE = 80;

export class FlashcardError extends Error {
  readonly status: number | null;

  constructor(message: string, status: number | null = null) {
    super(message);
    this.name = 'FlashcardError';
    this.status = status;
  }
}

const STOPWORDS = new Set([
  'ainda', 'algum', 'alguma', 'antes', 'aquilo', 'assim', 'cada', 'como', 'contra', 'depois', 'desde',
  'durante', 'entre', 'essa', 'esse', 'esta', 'este', 'estes', 'estas', 'foram', 'havia', 'isso',
  'isto', 'mais', 'mas', 'menos', 'mesmo', 'muito', 'muita', 'nesta', 'neste', 'outra', 'outro',
  'para', 'pela', 'pelo', 'pelos', 'pelas', 'porque', 'quando', 'quanto', 'sobre', 'também', 'toda',
  'todo', 'todos', 'todas', 'uma', 'umas', 'uns', 'apenas', 'através', 'então', 'sendo', 'pode',
  'podem', 'deve', 'devem', 'ser', 'são', 'está', 'estão', 'foi', 'com', 'sem', 'que', 'dos', 'das',
  'nos', 'nas', 'por', 'seu', 'sua', 'seus', 'suas', 'the', 'and', 'for', 'with', 'from',
]);

/** Divide o texto em frases utilizáveis (sem lookbehind, por compatibilidade). */
export function splitSentences(text: string): string[] {
  const clean = (text ?? '').replace(/\s+/g, ' ').trim();
  if (!clean) return [];
  const matches = clean.match(/[^.!?]+[.!?]+/g) ?? [];
  const sentences = matches.map(sentence => sentence.trim());
  const last = clean.split(/[.!?]/).pop()?.trim();
  if (last && last.length > 20 && !sentences.includes(last)) sentences.push(last);
  return sentences.filter(sentence => sentence.length > 0);
}

function keyTerm(sentence: string): string | null {
  const words = sentence.match(/[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ-]{5,}/g) ?? [];
  let best: string | null = null;
  for (const word of words) {
    if (STOPWORDS.has(word.toLowerCase())) continue;
    if (!best || word.length > best.length) best = word;
  }
  return best;
}

/**
 * Cartões offline: cada frase vira uma pergunta de completar, com a palavra
 * mais significativa escondida. Determinístico e sem rede — a rede de segurança
 * de quando a IA não está configurada ou falhou.
 */
export function localFlashcards(text: string, count = DEFAULT_FLASHCARD_COUNT): Flashcard[] {
  const sentences = splitSentences(text)
    .map(sentence => sentence.trim())
    .filter(sentence => sentence.length >= 45 && sentence.length <= 360);
  if (!sentences.length) return [];
  const wanted = Math.min(Math.max(count, 1), MAX_FLASHCARD_COUNT);
  const step = Math.max(1, Math.floor(sentences.length / wanted));
  const picked: string[] = [];
  for (let index = 0; index < sentences.length && picked.length < wanted; index += step) {
    picked.push(sentences[index]);
  }
  return picked.map((sentence, index) => {
    const term = keyTerm(sentence);
    if (!term) {
      return {
        id: `local-${index + 1}`,
        question: `Explique com suas palavras: ${sentence.slice(0, 140)}${sentence.length > 140 ? '…' : ''}`,
        answer: sentence,
      };
    }
    return {
      id: `local-${index + 1}`,
      question: `Complete: ${sentence.replace(term, '_____')}`,
      answer: `${term} — ${sentence}`,
    };
  });
}

export function buildFlashcardPrompt(text: string, count = DEFAULT_FLASHCARD_COUNT): string {
  const wanted = Math.min(Math.max(count, 1), MAX_FLASHCARD_COUNT);
  return [
    `Crie ${wanted} flashcards de perguntas e respostas sobre o texto abaixo.`,
    'Regras:',
    '- Responda SOMENTE com um array JSON, sem comentários, sem markdown.',
    '- Cada item deve ter exatamente as chaves "question" e "answer", em português.',
    '- Perguntas curtas e específicas; respostas completas, mas de no máximo 2 frases.',
    '- Cubra ideias diferentes do texto, sem repetir a mesma pergunta.',
    '',
    'TEXTO:',
    text.slice(0, 12000),
  ].join('\n');
}

const FLASHCARD_SYSTEM_PROMPT =
  'Você é um professor que transforma material de estudo em flashcards objetivos. ' +
  'Responda apenas com JSON válido, sem texto antes ou depois.';

function fenceFree(raw: string): string {
  return (raw ?? '').replace(/```json/gi, '').replace(/```/g, '').trim();
}

function jsonCandidates(raw: string): string[] {
  const clean = fenceFree(raw);
  const candidates = [clean];
  const arrayStart = clean.indexOf('[');
  const arrayEnd = clean.lastIndexOf(']');
  if (arrayStart >= 0 && arrayEnd > arrayStart) candidates.push(clean.slice(arrayStart, arrayEnd + 1));
  const objectStart = clean.indexOf('{');
  const objectEnd = clean.lastIndexOf('}');
  if (objectStart >= 0 && objectEnd > objectStart) candidates.push(clean.slice(objectStart, objectEnd + 1));
  return candidates;
}

function readCard(raw: unknown): { answer: string; question: string } | null {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;
  const question = record.question ?? record.pergunta ?? record.front ?? record.q ?? record.term;
  const answer = record.answer ?? record.resposta ?? record.back ?? record.a ?? record.definition;
  if (typeof question !== 'string' || typeof answer !== 'string') return null;
  const cleanQuestion = question.replace(/\s+/g, ' ').trim();
  const cleanAnswer = answer.replace(/\s+/g, ' ').trim();
  if (cleanQuestion.length < 6 || cleanAnswer.length < 2) return null;
  return { question: cleanQuestion, answer: cleanAnswer };
}

/** Aceita array puro, `{flashcards:[…]}`, blocos markdown e chaves em PT/EN. */
export function parseFlashcards(raw: string, limit = MAX_FLASHCARD_COUNT): Flashcard[] {
  for (const candidate of jsonCandidates(raw)) {
    let payload: unknown;
    try {
      payload = JSON.parse(candidate) as unknown;
    } catch {
      continue;
    }
    let list: unknown[] = [];
    if (Array.isArray(payload)) {
      list = payload;
    } else if (payload && typeof payload === 'object') {
      const record = payload as Record<string, unknown>;
      for (const key of ['flashcards', 'cards', 'data', 'items', 'result']) {
        if (Array.isArray(record[key])) {
          list = record[key] as unknown[];
          break;
        }
      }
    }
    if (!list.length) continue;
    const cards: Flashcard[] = [];
    const seen = new Set<string>();
    for (const item of list) {
      const card = readCard(item);
      if (!card) continue;
      const key = card.question.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      cards.push({ id: `card-${cards.length + 1}`, ...card });
      if (cards.length >= limit) break;
    }
    if (cards.length) return cards;
  }
  return [];
}

/** Texto pronto para salvar os cartões como nota na Biblioteca. */
export function flashcardNoteContent(topic: string, cards: Flashcard[]): string {
  const title = topic.trim() || 'Material de estudo';
  return [`Flashcards — ${title}`, '', ...cards.map((card, index) => `${index + 1}. ${card.question}\n   ${card.answer}`)].join('\n\n');
}

type Candidate = { apiKey: string; endpoint: string; kind: 'local' | 'provider'; label: string; model: string };

/** Extrai o texto de uma resposta compatível com a API OpenAI (inclui Gemini). */
export function readCompletionText(payload: unknown): string {
  if (!payload || typeof payload !== 'object') return '';
  const source = payload as {
    choices?: { message?: { content?: unknown }; text?: unknown }[];
    message?: { content?: unknown };
    response?: unknown;
  };
  const readContent = (content: unknown): string => {
    if (typeof content === 'string') return content.trim();
    if (Array.isArray(content)) {
      return content
        .map(part => (part && typeof part === 'object' && typeof (part as { text?: unknown }).text === 'string'
          ? (part as { text: string }).text
          : ''))
        .join('')
        .trim();
    }
    return '';
  };
  if (Array.isArray(source.choices)) {
    for (const choice of source.choices) {
      const text = readContent(choice?.message?.content) || readContent(choice?.text);
      if (text) return text;
    }
  }
  if (typeof source.response === 'string') return source.response.trim();
  return readContent(source.message?.content);
}

function failureMessage(error: unknown): { message: string; status: number | null } {
  if (error instanceof FlashcardError) return { message: error.message, status: error.status };
  if (error instanceof Error && error.name === 'AbortError') {
    return { message: 'A IA demorou demais para responder. Tente de novo.', status: null };
  }
  return { message: 'Não foi possível falar com a IA agora. Verifique a conexão.', status: null };
}

type PresetTable = Record<string, { baseUrl: string; defaultModel: string; label: string } | undefined>;

function trimBase(url: string): string {
  return (url ?? '').trim().replace(/\/+$/, '');
}

/**
 * Monta a fila de motores: primeiro o modo escolhido em Ajustes (provedor ou
 * local) e, se falhar, o outro. Assim o botão funciona mesmo com a configuração
 * "meio pronta".
 */
function buildCandidates(config: AiConfig, presets: PresetTable): Candidate[] {
  const preset = presets[config.provider.id];
  const providerBase = trimBase(config.provider.baseUrl || preset?.baseUrl || '');
  const provider: Candidate | null =
    config.provider.apiKey.trim() && providerBase
      ? {
          kind: 'provider',
          label: preset?.label ?? 'Provedor de IA',
          endpoint: `${providerBase}/chat/completions`,
          apiKey: config.provider.apiKey.trim(),
          model: (config.provider.model || preset?.defaultModel || '').trim(),
        }
      : null;
  const localBase = trimBase(config.local.url);
  const local: Candidate | null = localBase
    ? {
        kind: 'local',
        label: config.local.backend ? `IA local · ${config.local.backend}` : 'IA local',
        endpoint: `${localBase}/v1/chat/completions`,
        apiKey: '',
        model: (config.local.model ?? '').trim(),
      }
    : null;
  const ordered = config.mode === 'provider' ? [provider, local] : [local, provider];
  return ordered.filter((candidate): candidate is Candidate => candidate !== null);
}

async function requestCards(candidate: Candidate, prompt: string, timeoutMs: number, signal?: AbortSignal): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const forwardAbort = () => controller.abort();
  signal?.addEventListener('abort', forwardAbort);
  try {
    const response = await fetch(candidate.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(candidate.apiKey ? { Authorization: `Bearer ${candidate.apiKey}` } : {}),
      },
      body: JSON.stringify({
        ...(candidate.model ? { model: candidate.model } : {}),
        messages: [
          { role: 'system', content: FLASHCARD_SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
        temperature: 0.4,
        max_tokens: 1400,
        stream: false,
      }),
      signal: controller.signal,
    });
    if (!response.ok) {
      const status = response.status;
      if (status === 401 || status === 403) {
        throw new FlashcardError('Chave de IA inválida ou sem permissão. Confira em Ajustes → APIs de IA.', status);
      }
      if (status === 429) throw new FlashcardError('Limite de uso da IA atingido. Aguarde e tente de novo.', status);
      if (status === 404) throw new FlashcardError(`O modelo "${candidate.model}" não foi encontrado no provedor.`, status);
      throw new FlashcardError(`A IA respondeu ${status}. Tente novamente em instantes.`, status);
    }
    const payload = (await response.json().catch(() => null)) as unknown;
    const text = readCompletionText(payload);
    if (!text) throw new FlashcardError('A IA respondeu sem texto. Tente de novo.', null);
    return text;
  } catch (error) {
    if (error instanceof FlashcardError) throw error;
    if (error instanceof Error && error.name === 'AbortError') {
      throw new FlashcardError('A IA demorou demais para responder. Tente de novo.', null);
    }
    throw new FlashcardError('Falha de rede ao contatar a IA. Verifique sua conexão.', null);
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', forwardAbort);
  }
}

/**
 * Gera os cartões com a IA configurada. Sem IA configurada (ou se todos os
 * motores falharem de rede), devolve os cartões offline em vez de erro — o
 * botão nunca fica sem resposta.
 */
export async function generateFlashcards(
  text: string,
  options: { config?: AiConfig; count?: number; signal?: AbortSignal; timeoutMs?: number } = {},
): Promise<FlashcardResult> {
  const source = (text ?? '').replace(/\s+/g, ' ').trim();
  const wanted = Math.min(Math.max(options.count ?? DEFAULT_FLASHCARD_COUNT, 1), MAX_FLASHCARD_COUNT);
  if (source.length < MIN_FLASHCARD_SOURCE) {
    throw new FlashcardError('O texto é curto demais para gerar flashcards. Abra um PDF com mais conteúdo.');
  }
  const module = await import('@/lib/api-config').catch(() => null);
  let config = options.config ?? null;
  if (!config && module) config = await module.getAiConfig().catch(() => null);
  const presets: PresetTable = module ? module.API_PROVIDERS : {};
  const candidates = config ? buildCandidates(config, presets) : [];
  if (!candidates.length) {
    return { cards: localFlashcards(source, wanted), engine: { kind: 'local', label: 'Modo offline' } };
  }
  const prompt = buildFlashcardPrompt(source, wanted);
  const failures: string[] = [];
  for (const candidate of candidates) {
    try {
      const raw = await requestCards(candidate, prompt, options.timeoutMs ?? 60000, options.signal);
      const cards = parseFlashcards(raw, wanted);
      if (!cards.length) throw new FlashcardError('A IA respondeu em um formato inesperado. Tente de novo.', null);
      return {
        cards,
        engine: { kind: candidate.kind, label: candidate.label, model: candidate.model || undefined },
      };
    } catch (error) {
      failures.push(failureMessage(error).message);
    }
  }
  const offline = localFlashcards(source, wanted);
  if (offline.length) {
    return { cards: offline, engine: { kind: 'local', label: 'Modo offline' } };
  }
  throw new FlashcardError(failures[0] ?? 'Nenhuma IA respondeu e não havia texto suficiente para cartões offline.');
}

