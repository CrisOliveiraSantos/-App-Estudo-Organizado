import * as SecureStore from 'expo-secure-store';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

/* ------------------------------------------------------------------ *
 * Provedores de API de terceiros (compatíveis com a API OpenAI /v1)
 * ------------------------------------------------------------------ */

export type ApiProviderId = 'groq' | 'gemini' | 'openai' | 'openrouter' | 'custom';

export type ApiProviderPreset = {
  id: ApiProviderId;
  label: string;
  baseUrl: string;
  defaultModel: string;
  keyUrl: string;
  accent: string;
  hint: string;
};

export const API_PROVIDERS: Record<ApiProviderId, ApiProviderPreset> = {
  groq: {
    id: 'groq',
    label: 'Groq',
    baseUrl: 'https://api.groq.com/openai/v1',
    defaultModel: 'llama-3.3-70b-versatile',
    keyUrl: 'https://console.groq.com/keys',
    accent: '#F55036',
    hint: 'Camada gratuita rápida para Llama e modelos abertos.',
  },
  gemini: {
    id: 'gemini',
    label: 'Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    defaultModel: 'gemini-3.8-flash',
    keyUrl: 'https://aistudio.google.com/app/apikey',
    accent: '#4285F4',
    hint: 'Camada gratuita do Google AI Studio (endpoint compatível com OpenAI).',
  },
  openai: {
    id: 'openai',
    label: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
    keyUrl: 'https://platform.openai.com/api-keys',
    accent: '#10A37F',
    hint: 'Uso pago por token; prefira modelos econômicos.',
  },
  openrouter: {
    id: 'openrouter',
    label: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'openrouter/auto',
    keyUrl: 'https://openrouter.ai/keys',
    accent: '#6366F1',
    hint: 'Vários modelos com uma única chave e escolha automática.',
  },
  custom: {
    id: 'custom',
    label: 'Personalizado',
    baseUrl: '',
    defaultModel: '',
    keyUrl: '',
    accent: '#687088',
    hint: 'Qualquer serviço compatível com a API OpenAI (/v1).',
  },
};

export const PROVIDER_ORDER: ApiProviderId[] = ['groq', 'gemini', 'openai', 'openrouter', 'custom'];

/* ------------------------------------------------------------------ *
 * Modelo "vivo" (aponta sempre para a geração atual do provedor)
 *
 * Modelos aposentados (ex.: `gemini-2.5-*`) fazem a Cris falhar com
 * 404 ("Modelo ou endpoint não encontrado"). O app deve preferir a lista
 * real devolvida por `/models` e, como rede de segurança, um apelido que
 * o provedor troca por trás do nome sem aviso ("hot-swap").
 * ------------------------------------------------------------------ */

/**
 * Apelido "vivo" por provedor: nunca envelhece como um nome fixo.
 * No Gemini, `gemini-flash-latest` é o "hot-swap" do Google; nos demais,
 * o próprio `defaultModel` já é o nome atual.
 */
export const PROVIDER_LIVE_MODEL: Record<ApiProviderId, string> = {
  groq: API_PROVIDERS.groq.defaultModel,
  gemini: 'gemini-flash-latest',
  openai: API_PROVIDERS.openai.defaultModel,
  openrouter: API_PROVIDERS.openrouter.defaultModel,
  custom: '',
};

/** Remove o prefixo `models/` (formato do Gemini) de um id de modelo. */
export function normalizeModelId(id: string): string {
  return (id ?? '').trim().replace(/^models\//, '');
}

/**
 * O modelo está na lista devolvida pelo provedor em `/models`?
 * Aceita id com ou sem o prefixo `models/`. Uma lista vazia NÃO reprova
 * (provedores que não listam modelos não podem ser validados por aqui).
 */
export function isModelInList(models: string[], model: string): boolean {
  if (!models.length) return true;
  const target = normalizeModelId(model);
  return models.some(id => normalizeModelId(id) === target);
}

/**
 * Sugere o modelo "vivo" a partir da lista real do provedor. Ordem de escolha:
 * (1) no Gemini, o primeiro da geração atual (`gemini-3*`); (2) o `defaultModel`
 * do provedor quando ele está na lista; (3) o PRIMEIRO modelo da lista (pedido
 * da usuária: se o modelo salvo não estiver na lista, sugerir o primeiro dela);
 * (4) o apelido vivo (`gemini-flash-latest`); (5) o `defaultModel` do provedor.
 */
export function suggestLiveModel(id: ApiProviderId, models: string[]): string {
  const clean = models.map(normalizeModelId).filter(Boolean);
  if (id === 'gemini') {
    const currentGen = clean.find(model => /^gemini-3/.test(model));
    if (currentGen) return currentGen;
  }
  const preset = API_PROVIDERS[id];
  if (preset && clean.includes(preset.defaultModel)) return preset.defaultModel;
  if (clean.length) return clean[0];
  return PROVIDER_LIVE_MODEL[id] || preset?.defaultModel || '';
}

/* ------------------------------------------------------------------ *
 * Detecção de IA local (best-effort, sem fixar um backend)
 * ------------------------------------------------------------------ */

export type LocalAiCandidate = { port: number; name: string; hint: string };

export const LOCAL_AI_CANDIDATES: LocalAiCandidate[] = [
  { port: 11434, name: 'Ollama', hint: 'ollama serve' },
  { port: 1234, name: 'LM Studio', hint: 'Servidor local do LM Studio' },
  { port: 5001, name: 'LocalAI', hint: 'Backend compatível com OpenAI' },
  { port: 8000, name: 'vLLM / LocalAI', hint: 'Endpoint /v1 na porta 8000' },
  { port: 8080, name: 'llama.cpp', hint: 'llama-server' },
  { port: 5000, name: 'Text Generation WebUI', hint: 'Modo --api' },
  { port: 11435, name: 'Ollama (alternativo)', hint: 'Porta alternativa do Ollama' },
];

export const LOCAL_AI_PORTS: number[] = LOCAL_AI_CANDIDATES.map(candidate => candidate.port);

/* ------------------------------------------------------------------ *
 * Configuração persistida
 * ------------------------------------------------------------------ */

/** Resultado do último teste de conexão: nunca testado (null/untested), sucesso ou falha. */
export type AiTestStatus = 'success' | 'error' | 'untested';

export type LocalAiConfig = {
  url: string;
  backend: string | null;
  model: string | null;
  lastTestStatus: AiTestStatus | null;
  lastTestedAt: string | null;
  lastTestedTarget: string | null;
};

export type ProviderAiConfig = {
  id: ApiProviderId;
  apiKey: string;
  baseUrl: string;
  model: string;
  lastTestStatus: AiTestStatus | null;
  lastTestedAt: string | null;
  lastTestedTarget: string | null;
};

export type AiConfig = {
  mode: 'local' | 'provider';
  local: LocalAiConfig;
  provider: ProviderAiConfig;
  updatedAt: string | null;
};

/**
 * O Expo SecureStore (Android/iOS) aceita apenas letras, números, ".", "-" e
 * "_" no nome da chave. A chave antiga tinha "@" e "/", então a gravação era
 * rejeitada no aparelho e a API parecia "invisível" para o chat.
 */
export const AI_API_CONFIG_KEY = 'estudo_organizado_ai_api_config_v1';
/** Chave usada até 19/10/2026; lida apenas para migrar o valor existente. */
export const LEGACY_AI_API_CONFIG_KEY = '@estudo-organizado/ai-api-config-v1';

export const DEFAULT_AI_CONFIG: AiConfig = {
  mode: 'local',
  local: { url: '', backend: null, model: null, lastTestStatus: null, lastTestedAt: null, lastTestedTarget: null },
  provider: {
    id: 'groq',
    apiKey: '',
    baseUrl: API_PROVIDERS.groq.baseUrl,
    model: API_PROVIDERS.groq.defaultModel,
    lastTestStatus: null,
    lastTestedAt: null,
    lastTestedTarget: null,
  },
  updatedAt: null,
};

function isProviderId(value: unknown): value is ApiProviderId {
  return typeof value === 'string' && PROVIDER_ORDER.includes(value as ApiProviderId);
}

function normalizeTestStatus(value: unknown): AiTestStatus | null {
  return value === 'success' || value === 'error' || value === 'untested' ? value : null;
}

function normalizeText(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

/** Dados necessários para testar um provedor (sem o histórico do último teste). */
export type TestableProviderConfig = Pick<ProviderAiConfig, 'id' | 'apiKey' | 'baseUrl' | 'model'>;

/** Identidade testável de um provedor: muda se id, URL base, modelo ou chave mudarem. */
export function providerTestTarget(config: TestableProviderConfig): string {
  return `${config.id}|${config.baseUrl}|${config.model}|${config.apiKey}`;
}

/** Estado real do último teste da IA local (só vale quando o alvo testado é o alvo salvo). */
export function localTestState(local: LocalAiConfig): AiTestStatus | null {
  return local.lastTestedTarget === local.url ? local.lastTestStatus : null;
}

/** Estado real do último teste do provedor (só vale quando o alvo testado é o alvo salvo). */
export function providerTestState(provider: ProviderAiConfig): AiTestStatus | null {
  return provider.lastTestedTarget === providerTestTarget(provider) ? provider.lastTestStatus : null;
}

/** A IA local está realmente ativa? (endereço salvo + teste bem-sucedido do mesmo endereço) */
export function isLocalAiReady(local: LocalAiConfig): boolean {
  return Boolean(local.url.trim()) && localTestState(local) === 'success';
}

/** A API de terceiros está realmente ativa? (chave salva + teste bem-sucedido da mesma configuração) */
export function isProviderAiReady(provider: ProviderAiConfig): boolean {
  return Boolean(provider.apiKey.trim()) && providerTestState(provider) === 'success';
}

function normalizeConfig(raw: unknown): AiConfig {
  const source = (raw && typeof raw === 'object' ? raw : {}) as Partial<AiConfig>;
  const localSource = (source.local && typeof source.local === 'object' ? source.local : {}) as Partial<LocalAiConfig>;
  const providerSource = (source.provider && typeof source.provider === 'object' ? source.provider : {}) as Partial<ProviderAiConfig>;
  const id = isProviderId(providerSource.id) ? providerSource.id : DEFAULT_AI_CONFIG.provider.id;
  return {
    mode: source.mode === 'provider' ? 'provider' : 'local',
    local: {
      url: typeof localSource.url === 'string' ? localSource.url : '',
      backend: typeof localSource.backend === 'string' ? localSource.backend : null,
      model: typeof localSource.model === 'string' ? localSource.model : null,
      lastTestStatus: normalizeTestStatus(localSource.lastTestStatus),
      lastTestedAt: normalizeText(localSource.lastTestedAt),
      lastTestedTarget: normalizeText(localSource.lastTestedTarget),
    },
    provider: {
      id,
      apiKey: typeof providerSource.apiKey === 'string' ? providerSource.apiKey : '',
      baseUrl: typeof providerSource.baseUrl === 'string' && providerSource.baseUrl ? providerSource.baseUrl : API_PROVIDERS[id].baseUrl,
      model: typeof providerSource.model === 'string' && providerSource.model ? providerSource.model : API_PROVIDERS[id].defaultModel,
      lastTestStatus: normalizeTestStatus(providerSource.lastTestStatus),
      lastTestedAt: normalizeText(providerSource.lastTestedAt),
      lastTestedTarget: normalizeText(providerSource.lastTestedTarget),
    },
    updatedAt: typeof source.updatedAt === 'string' ? source.updatedAt : null,
  };
}

/* ------------------------------------------------------------------ *
 * Armazenamento seguro (SecureStore no nativo / localStorage na web)
 * ------------------------------------------------------------------ */

const SECURE_STORE_OPTIONS = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
} as const;

async function readRaw(): Promise<string | null> {
  try {
    if (Platform.OS === 'web') {
      if (typeof localStorage === 'undefined') return null;
      const stored = localStorage.getItem(AI_API_CONFIG_KEY);
      if (stored) return stored;
      /** Migração única da chave antiga (web). */
      const legacy = localStorage.getItem(LEGACY_AI_API_CONFIG_KEY);
      if (!legacy) return null;
      localStorage.setItem(AI_API_CONFIG_KEY, legacy);
      localStorage.removeItem(LEGACY_AI_API_CONFIG_KEY);
      return legacy;
    }
    const stored = await SecureStore.getItemAsync(AI_API_CONFIG_KEY);
    if (stored) return stored;
    /**
     * A chave antiga era inválida no SecureStore. Se algum aparelho/iOS chegou
     * a gravá-la, copia o valor para a chave nova antes de apagá-la.
     */
    const legacy = await SecureStore.getItemAsync(LEGACY_AI_API_CONFIG_KEY).catch(() => null);
    if (!legacy) return null;
    await SecureStore.setItemAsync(AI_API_CONFIG_KEY, legacy, SECURE_STORE_OPTIONS);
    await SecureStore.deleteItemAsync(LEGACY_AI_API_CONFIG_KEY).catch(() => undefined);
    return legacy;
  } catch {
    return null;
  }
}

async function writeRaw(value: string): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') localStorage.setItem(AI_API_CONFIG_KEY, value);
      return;
    }
    await SecureStore.setItemAsync(AI_API_CONFIG_KEY, value, SECURE_STORE_OPTIONS);
  } catch {
    // Uma falha ao gravar não deve travar a configuração em memória.
  }
}

async function clearRaw(): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(AI_API_CONFIG_KEY);
        localStorage.removeItem(LEGACY_AI_API_CONFIG_KEY);
      }
      return;
    }
    await SecureStore.deleteItemAsync(AI_API_CONFIG_KEY);
    await SecureStore.deleteItemAsync(LEGACY_AI_API_CONFIG_KEY).catch(() => undefined);
  } catch {
    // Melhor esforço.
  }
}

/* ------------------------------------------------------------------ *
 * Store em memória (mantém o hook sincronizado) + persistência
 * ------------------------------------------------------------------ */

let current: AiConfig | null = null;
let loadPromise: Promise<AiConfig> | null = null;
/**
 * Cada gravação/relitura invalida leituras que já estavam em voo. Sem isto,
 * uma leitura iniciada antes de "Salvar" podia terminar depois e sobrescrever
 * a chave recém-gravada com o valor antigo (a Cris ficava "cega" até reabrir
 * o app).
 */
let loadRevision = 0;
const listeners = new Set<(config: AiConfig) => void>();

function emit(next: AiConfig) {
  current = next;
  listeners.forEach(listener => listener(next));
}

async function ensureLoaded(): Promise<AiConfig> {
  if (current) return current;
  if (!loadPromise) {
    const revision = loadRevision;
    loadPromise = (async () => {
      const raw = await readRaw();
      let parsed: unknown = null;
      if (raw) {
        try {
          parsed = JSON.parse(raw);
        } catch {
          parsed = null;
        }
      }
      const loaded = normalizeConfig(parsed);
      /**
       * Uma gravação pode ter acontecido enquanto o SecureStore era lido. Nesse
       * caso o estado em memória já é mais novo e tem prioridade.
       */
      if (current) return current;
      if (revision === loadRevision) current = loaded;
      return current ?? loaded;
    })();
  }
  return loadPromise;
}

export async function saveAiConfig(next: AiConfig): Promise<AiConfig> {
  const normalized = normalizeConfig({ ...next, updatedAt: new Date().toISOString() });
  const revision = ++loadRevision;
  /**
   * O cache em memória recebe a chave imediatamente; a interface só é
   * notificada (`emit`) depois que o SecureStore confirmar a gravação. Assim
   * uma mensagem enviada logo após "Salvar" já enxerga a credencial, sem abrir
   * espaço para uma leitura antiga sobrescrevê-la.
   */
  current = normalized;
  await writeRaw(JSON.stringify(normalized));
  /** Uma gravação mais nova começou enquanto esta escrevia: ela vence. */
  if (revision !== loadRevision) return current ?? normalized;
  loadPromise = Promise.resolve(normalized);
  emit(normalized);
  return normalized;
}

/* ------------------------------------------------------------------ *
 * Fase 1B — acesso à configuração sem React e prontidão de cada alvo
 * ------------------------------------------------------------------ */

/**
 * Config atual sem depender de React (cache em memória ou armazenamento seguro).
 * Usada por `lib/cris-client.ts` para chamar a IA direto do dispositivo.
 */
export async function getAiConfig(): Promise<AiConfig> {
  return ensureLoaded();
}

/**
 * Relê a configuração direto do armazenamento seguro, ignorando o cache em
 * memória. O popup da Cris usa isto a cada abertura: se a chave foi gravada
 * (ou apagada) em outra sessão/tela, o aviso "Nenhuma IA conectada" não fica
 * preso a um estado antigo.
 */
export async function reloadAiConfig(): Promise<AiConfig> {
  const previous = current;
  current = null;
  loadPromise = null;
  loadRevision += 1;
  const next = await ensureLoaded();
  /**
   * Se o armazenamento devolveu uma configuração sem credenciais, mas a sessão
   * atual tinha uma chave válida (ex.: SecureStore momentaneamente ilegível no
   * Android), preserva o cache em memória. Sem isso a Cris caía em "sem IA
   * conectada" logo depois de a usuária salvar/testar a chave.
   */
  if (previous && hasAiCredentials(previous) && !hasAiCredentials(next)) {
    current = previous;
    loadPromise = Promise.resolve(previous);
    emit(previous);
    return previous;
  }
  emit(next);
  return next;
}

/**
 * Existe credencial de IA salva (chave do provedor ou endereço local)?
 *
 * Diferente de `isLocalAiReady`/`isProviderAiReady` — que exigem um teste
 * bem-sucedido da MESMA configuração —, esta função responde à pergunta que
 * o aluno faz: "já configurei uma IA?". O aviso de "Nenhuma IA conectada"
 * deve desaparecer assim que a chave existir.
 */
export function hasAiCredentials(config: AiConfig): boolean {
  return isLocalConfigured(config.local) || isProviderConfigured(config.provider);
}

/**
 * Observa mudanças na configuração sem depender de React (ex.: o popup da Cris,
 * que fica montado a vida toda e precisa saber na hora quando a IA é ligada ou
 * desligada em Ajustes → IA). Devolve a função para cancelar a inscrição.
 */
export function subscribeAiConfig(listener: (config: AiConfig) => void): () => void {
  listeners.add(listener);
  void ensureLoaded().then(next => {
    if (listeners.has(listener)) listener(next);
  });
  return () => {
    listeners.delete(listener);
  };
}

/** Um provedor de terceiros está pronto para uso direto pelo dispositivo? (chave + URL base) */
export function isProviderConfigured(provider: ProviderAiConfig): boolean {
  const baseUrl = (provider.baseUrl || API_PROVIDERS[provider.id].baseUrl).trim();
  return Boolean(provider.apiKey.trim()) && Boolean(baseUrl);
}

/** A IA local está configurada (endereço salvo) e pode ser chamada direto do dispositivo? */
export function isLocalConfigured(local: LocalAiConfig): boolean {
  return Boolean(normalizeLocalUrl(local.url));
}

export function useApiConfig() {
  const [config, setConfig] = useState<AiConfig>(current ?? DEFAULT_AI_CONFIG);
  const [loading, setLoading] = useState(!current);

  useEffect(() => {
    let active = true;
    const listener = (next: AiConfig) => {
      if (active) setConfig(next);
    };
    listeners.add(listener);
    void ensureLoaded().then(next => {
      if (!active) return;
      setConfig(next);
      setLoading(false);
    });
    return () => {
      active = false;
      listeners.delete(listener);
    };
  }, []);

  const update = useCallback(async (patch: Partial<AiConfig>) => {
    const base = current ?? (await ensureLoaded());
    return saveAiConfig({ ...base, ...patch });
  }, []);

  const saveLocal = useCallback(async (local: LocalAiConfig) => {
    const base = current ?? (await ensureLoaded());
    return saveAiConfig({ ...base, local });
  }, []);

  const saveProvider = useCallback(async (provider: ProviderAiConfig) => {
    const base = current ?? (await ensureLoaded());
    return saveAiConfig({ ...base, provider });
  }, []);

  const setMode = useCallback(async (mode: AiConfig['mode']) => {
    const base = current ?? (await ensureLoaded());
    return saveAiConfig({ ...base, mode });
  }, []);

  const reset = useCallback(async () => {
    await clearRaw();
    const next = normalizeConfig(DEFAULT_AI_CONFIG);
    loadRevision += 1;
    loadPromise = null;
    emit(next);
    return next;
  }, []);

  return { config, loading, update, saveLocal, saveProvider, setMode, reset };
}

/* ------------------------------------------------------------------ *
 * Utilitários de URL
 * ------------------------------------------------------------------ */

export function normalizeLocalUrl(input: string): string {
  const value = (input ?? '').trim().replace(/\/+$/, '');
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  return `http://${value}`;
}

export function buildLocalUrl(protocol: string, host: string, port: string): string {
  const scheme = protocol === 'https' ? 'https' : 'http';
  const cleanHost = (host ?? '').trim().replace(/^https?:\/\//i, '').replace(/\/.*$/, '');
  const cleanPort = (port ?? '').trim().replace(/[^0-9]/g, '');
  if (!cleanHost) return '';
  return cleanPort ? `${scheme}://${cleanHost}:${cleanPort}` : `${scheme}://${cleanHost}`;
}

export function parseLocalUrl(url: string): { protocol: 'http' | 'https'; host: string; port: string } {
  const fallback = { protocol: 'http' as const, host: 'localhost', port: '11434' };
  const normalized = normalizeLocalUrl(url);
  if (!normalized) return fallback;
  try {
    const parsed = new URL(normalized);
    return {
      protocol: parsed.protocol === 'https:' ? 'https' : 'http',
      host: parsed.hostname || 'localhost',
      port: parsed.port || '',
    };
  } catch {
    return fallback;
  }
}

/* ------------------------------------------------------------------ *
 * Testes de conexão
 * ------------------------------------------------------------------ */

/** Motivo classificado de um teste que falhou (a tela reage sem reler o texto). */
export type TestFailureReason = 'auth' | 'model' | 'rate' | 'timeout' | 'offline' | 'server' | 'config';

export type ApiTestResult = {
  ok: boolean;
  status?: number;
  models: string[];
  message: string;
  latencyMs: number;
  url: string;
  /** Preenchido só quando `ok` é false — permite à interface tratar o caso exato. */
  reason?: TestFailureReason;
};

const DEFAULT_TIMEOUT_MS = 6000;

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
  externalSignal?: AbortSignal,
): Promise<Response> {
  const controller = new AbortController();
  const onAbort = () => controller.abort();
  if (externalSignal) {
    if (externalSignal.aborted) controller.abort();
    else externalSignal.addEventListener('abort', onAbort, { once: true });
  }
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
    externalSignal?.removeEventListener('abort', onAbort);
  }
}

function extractModels(payload: unknown): string[] {
  if (!payload || typeof payload !== 'object') return [];
  const data = (payload as { data?: unknown }).data;
  if (!Array.isArray(data)) return [];
  return data
    .map(item => {
      if (typeof item === 'string') return item;
      if (item && typeof item === 'object' && typeof (item as { id?: unknown }).id === 'string') {
        return (item as { id: string }).id;
      }
      return null;
    })
    .filter((value): value is string => Boolean(value));
}

/** Testa GET /v1/models em um servidor de IA local. */
export async function testLocalAi(
  url: string,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  externalSignal?: AbortSignal,
): Promise<ApiTestResult> {
  const base = normalizeLocalUrl(url);
  const startedAt = Date.now();
  if (!base) {
    return { ok: false, models: [], message: 'Informe o endereço da IA local (ex.: http://192.168.0.10:11434).', latencyMs: 0, url: '' };
  }
  const endpoint = `${base}/v1/models`;
  try {
    const response = await fetchWithTimeout(endpoint, { method: 'GET', headers: { Accept: 'application/json' } }, timeoutMs, externalSignal);
    const latencyMs = Date.now() - startedAt;
    if (!response.ok) {
      return { ok: false, status: response.status, models: [], message: `O servidor respondeu ${response.status}. Confirme se a API /v1 está ativa.`, latencyMs, url: endpoint };
    }
    let models: string[] = [];
    try {
      models = extractModels(await response.json());
    } catch {
      models = [];
    }
    return {
      ok: true,
      status: response.status,
      models,
      message: models.length ? `IA local ativa · ${models.length} modelo(s) disponível(is).` : 'IA local ativa, mas nenhum modelo foi listado.',
      latencyMs,
      url: endpoint,
    };
  } catch (error) {
    const latencyMs = Date.now() - startedAt;
    const aborted = error instanceof Error && error.name === 'AbortError';
    return {
      ok: false,
      models: [],
      message: aborted
        ? 'Tempo esgotado ao contatar a IA local.'
        : 'Não foi possível alcançar a IA local. No navegador o CORS pode bloquear; no Android use o IP da rede.',
      latencyMs,
      url: endpoint,
    };
  }
}

/** Testa GET /models na API do provedor escolhido (valida chave + URL base). */
export async function testProviderApi(config: TestableProviderConfig, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<ApiTestResult> {
  const baseUrl = (config.baseUrl || API_PROVIDERS[config.id]?.baseUrl || '').trim().replace(/\/+$/, '');
  const startedAt = Date.now();
  if (!baseUrl) {
    return { ok: false, models: [], message: 'Informe a URL base do provedor.', latencyMs: 0, url: '', reason: 'config' };
  }
  const endpoint = `${baseUrl}/models`;
  if (!config.apiKey.trim()) {
    return { ok: false, models: [], message: 'Cole a chave de API para testar.', latencyMs: 0, url: endpoint, reason: 'config' };
  }
  try {
    const response = await fetchWithTimeout(
      endpoint,
      { method: 'GET', headers: { Accept: 'application/json', Authorization: `Bearer ${config.apiKey.trim()}` } },
      timeoutMs,
    );
    const latencyMs = Date.now() - startedAt;
    if (response.status === 401 || response.status === 403) {
      return { ok: false, status: response.status, models: [], message: 'Chave inválida. Gere uma nova no provedor.', latencyMs, url: endpoint, reason: 'auth' };
    }
    if (response.status === 404) {
      return { ok: false, status: response.status, models: [], message: 'Endpoint /models não encontrado. Confira a URL base.', latencyMs, url: endpoint, reason: 'config' };
    }
    if (!response.ok) {
      return { ok: false, status: response.status, models: [], message: `O provedor respondeu ${response.status}.`, latencyMs, url: endpoint, reason: 'server' };
    }
    let models: string[] = [];
    try {
      models = extractModels(await response.json());
    } catch {
      models = [];
    }
    return {
      ok: true,
      status: response.status,
      models,
      message: models.length ? `Conexão validada · ${models.length} modelo(s) disponível(is).` : 'Conexão validada com o provedor.',
      latencyMs,
      url: endpoint,
    };
  } catch (error) {
    const latencyMs = Date.now() - startedAt;
    const aborted = error instanceof Error && error.name === 'AbortError';
    return {
      ok: false,
      models: [],
      message: aborted ? 'Tempo esgotado ao contatar o provedor.' : 'Falha de rede ao contatar o provedor. Verifique a conexão.',
      latencyMs,
      url: endpoint,
      reason: aborted ? 'timeout' : 'offline',
    };
  }
}

/**
 * Testa o MODELO de verdade: POST /chat/completions com a menor requisição
 * possível (`max_tokens: 1`). O GET /models valida chave e URL, mas NÃO valida
 * o modelo — só o envio revela um modelo aposentado (404). A chave sai apenas no
 * cabeçalho `Authorization` do fetch e nunca é registrada em log.
 */
export async function testProviderModel(config: TestableProviderConfig, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<ApiTestResult> {
  const baseUrl = (config.baseUrl || API_PROVIDERS[config.id]?.baseUrl || '').trim().replace(/\/+$/, '');
  const startedAt = Date.now();
  if (!baseUrl) {
    return { ok: false, models: [], message: 'Informe a URL base do provedor.', latencyMs: 0, url: '', reason: 'config' };
  }
  const endpoint = `${baseUrl}/chat/completions`;
  if (!config.apiKey.trim()) {
    return { ok: false, models: [], message: 'Cole a chave de API para testar.', latencyMs: 0, url: endpoint, reason: 'config' };
  }
  const model = (config.model || API_PROVIDERS[config.id]?.defaultModel || '').trim();
  try {
    const response = await fetchWithTimeout(
      endpoint,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${config.apiKey.trim()}` },
        body: JSON.stringify({ model, messages: [{ role: 'user', content: 'ping' }], max_tokens: 1, temperature: 0 }),
      },
      timeoutMs,
    );
    const latencyMs = Date.now() - startedAt;
    if (response.status === 401 || response.status === 403) {
      return { ok: false, status: response.status, models: [], message: 'Chave inválida. Gere uma nova no provedor.', latencyMs, url: endpoint, reason: 'auth' };
    }
    if (response.status === 404) {
      return { ok: false, status: response.status, models: [], message: `Modelo "${model}" indisponível. Ele pode ter sido aposentado pelo provedor.`, latencyMs, url: endpoint, reason: 'model' };
    }
    if (response.status === 429) {
      return { ok: false, status: response.status, models: [], message: 'Limite atingido. Aguarde alguns instantes ou troque de modelo.', latencyMs, url: endpoint, reason: 'rate' };
    }
    if (!response.ok) {
      return { ok: false, status: response.status, models: [], message: `O provedor respondeu ${response.status} ao testar o modelo.`, latencyMs, url: endpoint, reason: 'server' };
    }
    return {
      ok: true,
      status: response.status,
      models: [],
      message: `Modelo "${model}" respondeu — a Cris vai funcionar.`,
      latencyMs,
      url: endpoint,
    };
  } catch (error) {
    const latencyMs = Date.now() - startedAt;
    const aborted = error instanceof Error && error.name === 'AbortError';
    return {
      ok: false,
      models: [],
      message: aborted ? 'Tempo esgotado ao testar o modelo.' : 'Falha de rede ao testar o modelo. Verifique a conexão.',
      latencyMs,
      url: endpoint,
      reason: aborted ? 'timeout' : 'offline',
    };
  }
}

/* ------------------------------------------------------------------ *
 * Hook de detecção de IA local
 * ------------------------------------------------------------------ */

export type DetectedLocalServer = {
  url: string;
  host: string;
  port: number;
  protocol: 'http' | 'https';
  name: string;
  hint: string;
  models: string[];
  latencyMs: number;
};

export function useLocalAiDetection() {
  const [servers, setServers] = useState<DetectedLocalServer[]>([]);
  const [scanning, setScanning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const scan = useCallback(async (hostInput?: string, protocol: 'http' | 'https' = 'http') => {
    const host = (hostInput || 'localhost').trim().replace(/^https?:\/\//i, '').replace(/\/.*$/, '') || 'localhost';

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setScanning(true);
    setMessage('Procurando servidores de IA local…');
    try {
      const results = await Promise.all(
        LOCAL_AI_CANDIDATES.map(async candidate => {
          if (controller.signal.aborted) return null;
          const url = `${protocol}://${host}:${candidate.port}`;
          const result = await testLocalAi(url, 4000, controller.signal);
          if (!result.ok) return null;
          return {
            url,
            host,
            port: candidate.port,
            protocol,
            name: candidate.name,
            hint: candidate.hint,
            models: result.models,
            latencyMs: result.latencyMs,
          } as DetectedLocalServer;
        }),
      );
      if (controller.signal.aborted) return [];
      const found = results
        .filter((item): item is DetectedLocalServer => item !== null)
        .sort((a, b) => a.latencyMs - b.latencyMs);
      setServers(found);
      setMessage(
        found.length
          ? `${found.length} servidor(es) encontrado(s).`
          : 'Nenhum servidor de IA local respondeu. Confirme que ele está ativo e, no Android, use o IP da rede (ex.: 192.168.0.10).',
      );
      return found;
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setScanning(false);
    }
  }, []);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    setScanning(false);
  }, []);

  useEffect(() => () => abortRef.current?.abort(), []);

  return { servers, scanning, message, scan, cancel };
}
