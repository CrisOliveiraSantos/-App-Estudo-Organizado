import type { AiConfig, ApiProviderId, ApiProviderPreset, LocalAiConfig, ProviderAiConfig } from '@/lib/api-config';

/**
 * OCR que roda **no próprio dispositivo**: a foto da página vai direto para a
 * IA que o aluno já conectou em Ajustes → IA (IA local ou provedor). Nenhuma
 * imagem passa pelos servidores do aplicativo: este módulo não fala com o
 * cliente de backend nem conhece qualquer endereço de API interna.
 *
 * A ordem de decisão é a mesma da Cris: o modo escolhido em Ajustes → IA vem
 * primeiro (local → provedor) e, se o primeiro alvo falhar, o segundo é
 * tentado antes de mostrar o erro para o aluno.
 *
 * O conteúdo da mensagem usa o formato `image_url` da API OpenAI
 * (`data:<mime>;base64,<dados>`) — é o que permite enviar a página para um
 * modelo com visão.
 */

/** Alvo do OCR sem a chave (é o que pode sair para a interface). */
export type CrisOcrTarget = {
  kind: 'local' | 'provider';
  label: string;
  endpoint: string;
  model: string;
};

/** Alvo interno do OCR: a chave só é usada no cabeçalho do `fetch`. */
type CrisOcrPlan = CrisOcrTarget & { apiKey: string };

/** Helpers de configuração já resolvidos (produção usa `@/lib/api-config`; testes injetam). */
export type CrisOcrRuntime = {
  presets: Record<ApiProviderId, ApiProviderPreset>;
  normalizeLocalUrl: (url: string) => string;
  isLocalConfigured: (local: LocalAiConfig) => boolean;
  isProviderConfigured: (provider: ProviderAiConfig) => boolean;
};

export type CrisOcrOptions = {
  /** Configuração já carregada (produção usa `getAiConfig()`). */
  config?: AiConfig;
  /** Presets e helpers de URL (produção usa `@/lib/api-config`). */
  runtime?: CrisOcrRuntime;
  /** `fetch` alternativo (testes). */
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
};

export type CrisOcrResult = {
  text: string;
  /** De onde o texto veio, para a interface mostrar (ex.: `Provedor Gemini · gemini-3.8-flash`). */
  target: string;
};

type OcrPayload = {
  choices?: { message?: { content?: unknown } }[];
  error?: { message?: unknown };
};

const OCR_TIMEOUT_MS = 90_000;
const OCR_MAX_TOKENS = 4096;

const OCR_SYSTEM_PROMPT = [
  'Você é um transcritor de textos acadêmicos (OCR).',
  'Transcreva TODAS as palavras legíveis da imagem, na ordem de leitura, mantendo títulos e parágrafos.',
  'Preserve números, datas, fórmulas e nomes próprios exatamente como aparecem.',
  'Nunca resuma, explique nem comente: devolva apenas o texto reconhecido.',
  'Quando algo estiver ilegível, escreva [ilegível] no lugar.',
].join(' ');

const OCR_USER_PROMPT = 'Transcreva integralmente o texto desta página.';

function stripTrailingSlashes(value: string): string {
  return (value ?? '').trim().replace(/\/+$/, '');
}

function localPlan(local: LocalAiConfig, runtime: CrisOcrRuntime): CrisOcrPlan | null {
  if (!runtime.isLocalConfigured(local)) return null;
  const base = stripTrailingSlashes(runtime.normalizeLocalUrl(local.url));
  if (!base) return null;
  const backend = (local.backend ?? '').trim();
  return {
    kind: 'local',
    label: backend ? `IA local · ${backend}` : 'IA local no dispositivo',
    endpoint: `${base}/v1/chat/completions`,
    model: (local.model ?? '').trim(),
    apiKey: '',
  };
}

function providerPlan(provider: ProviderAiConfig, runtime: CrisOcrRuntime): CrisOcrPlan | null {
  if (!runtime.isProviderConfigured(provider)) return null;
  const preset = runtime.presets[provider.id] ?? null;
  const base = stripTrailingSlashes(provider.baseUrl || preset?.baseUrl || '');
  if (!base) return null;
  return {
    kind: 'provider',
    label: preset ? `Provedor ${preset.label}` : 'Provedor de IA',
    endpoint: `${base}/chat/completions`,
    model: (provider.model || preset?.defaultModel || '').trim(),
    apiKey: provider.apiKey.trim(),
  };
}

/**
 * Fila de alvos do OCR na mesma ordem da Cris: o modo salvo em Ajustes → IA
 * decide quem vem primeiro e o outro alvo fica como segunda tentativa.
 */
function listOcrPlans(config: AiConfig, runtime: CrisOcrRuntime): CrisOcrPlan[] {
  const local = localPlan(config.local, runtime);
  const provider = providerPlan(config.provider, runtime);
  if (config.mode === 'provider' && provider) return local ? [provider, local] : [provider];
  if (local) return provider ? [local, provider] : [local];
  return provider ? [provider] : [];
}

/** Alvos do OCR sem a chave, na ordem em que serão tentados. */
export function listOcrTargets(config: AiConfig, runtime: CrisOcrRuntime): CrisOcrTarget[] {
  return listOcrPlans(config, runtime).map(plan => ({ kind: plan.kind, label: plan.label, endpoint: plan.endpoint, model: plan.model }));
}

async function resolveRuntime(options: CrisOcrOptions): Promise<{
  config: AiConfig | null;
  runtime: CrisOcrRuntime | null;
  fetchImpl: typeof fetch;
}> {
  const fetchImpl = options.fetchImpl ?? fetch;
  if (options.config && options.runtime) return { config: options.config, runtime: options.runtime, fetchImpl };
  const module = await import('@/lib/api-config').catch(() => null);
  if (!module) return { config: options.config ?? null, runtime: options.runtime ?? null, fetchImpl };
  return {
    config: options.config ?? (await module.getAiConfig().catch(() => null)),
    runtime:
      options.runtime ?? {
        presets: module.API_PROVIDERS,
        normalizeLocalUrl: module.normalizeLocalUrl,
        isLocalConfigured: module.isLocalConfigured,
        isProviderConfigured: module.isProviderConfigured,
      },
    fetchImpl,
  };
}

function pickOcrText(payload: OcrPayload | null): string {
  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map(part => (part && typeof part === 'object' && typeof (part as { text?: unknown }).text === 'string' ? (part as { text: string }).text : ''))
      .join('');
  }
  return '';
}

/** Mensagem pronta para o aluno (nunca "erro desconhecido"). */
function readableOcrFailure(status: number, payload: OcrPayload | null, plan: CrisOcrPlan): string {
  const detail = typeof payload?.error?.message === 'string' ? payload.error.message : '';
  if (status === 401 || status === 403) return 'Chave de API recusada. Gere uma nova chave em Ajustes → IA.';
  if (status === 404) return `O modelo "${plan.model}" não está mais disponível em ${plan.label}. Escolha outro em Ajustes → IA.`;
  if (status === 429) return 'Limite de uso da IA atingido. Aguarde um instante ou troque de provedor em Ajustes → IA.';
  if (status === 400 || status === 422) return `A IA recusou a imagem${detail ? ` (${detail})` : ''}. Escolha um modelo com visão em Ajustes → IA.`;
  return `${plan.label} respondeu ${status}${detail ? ` (${detail})` : ''}.`;
}

async function requestOcrText(
  plan: CrisOcrPlan,
  imageBase64: string,
  mimeType: string,
  fetchImpl: typeof fetch,
  timeoutMs: number,
): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let response: Response;
  try {
    response = await fetchImpl(plan.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(plan.apiKey ? { Authorization: `Bearer ${plan.apiKey}` } : {}),
      },
      body: JSON.stringify({
        model: plan.model,
        max_tokens: OCR_MAX_TOKENS,
        temperature: 0,
        messages: [
          { role: 'system', content: OCR_SYSTEM_PROMPT },
          {
            role: 'user',
            content: [
              { type: 'text', text: OCR_USER_PROMPT },
              // A página vai como data URL: é o formato que os modelos com visão aceitam.
              { type: 'image_url', image_url: { url: `data:${mimeType};base64,${imageBase64}` } },
            ],
          },
        ],
      }),
      signal: controller.signal,
    });
  } catch (error) {
    const aborted = error instanceof Error && error.name === 'AbortError';
    throw new Error(
      aborted
        ? `A IA (${plan.label}) demorou demais para responder. Tente de novo com uma foto menor.`
        : `Não foi possível alcançar ${plan.label}. Confira a internet e o endereço salvo em Ajustes → IA.`,
    );
  } finally {
    clearTimeout(timer);
  }

  const payload = (await response.json().catch(() => null)) as OcrPayload | null;
  if (!response.ok) throw new Error(readableOcrFailure(response.status, payload, plan));
  const text = pickOcrText(payload).trim();
  if (!text) throw new Error(`${plan.label} não devolveu texto para esta imagem. Use uma foto mais nítida e bem iluminada.`);
  return text;
}

/**
 * Transcreve a foto de uma página com a IA que o aluno conectou: a imagem vai
 * do aparelho direto para o modelo, sem intermediários do aplicativo.
 * `imageBase64` é o conteúdo puro do arquivo (sem o prefixo `data:`).
 */
export async function extractTextFromImage(
  imageBase64: string,
  mimeType = 'image/jpeg',
  options: CrisOcrOptions = {},
): Promise<CrisOcrResult> {
  const image = (imageBase64 ?? '').trim();
  if (!image) throw new Error('A imagem da página não pôde ser lida. Escolha outra foto e tente de novo.');

  const { config, runtime, fetchImpl } = await resolveRuntime(options);
  if (!config || !runtime) throw new Error('Não foi possível ler a configuração de IA deste dispositivo. Abra Ajustes → IA e conecte um provedor.');

  const plans = listOcrPlans(config, runtime);
  if (!plans.length) throw new Error('Nenhuma IA conectada. Abra Ajustes → IA e conecte um provedor com visão (ex.: Gemini) para usar o OCR.');

  const failures: string[] = [];
  for (const plan of plans) {
    try {
      const text = await requestOcrText(plan, image, (mimeType ?? '').trim() || 'image/jpeg', fetchImpl, options.timeoutMs ?? OCR_TIMEOUT_MS);
      return { text, target: `${plan.label} · ${plan.model || 'modelo padrão'}` };
    } catch (error) {
      // O alvo preferido falhou: guarda a explicação e tenta o outro antes de desistir.
      failures.push(error instanceof Error ? error.message : `${plan.label} não respondeu.`);
    }
  }

  throw new Error(failures[0] ?? 'Não foi possível reconhecer o texto desta imagem.');
}
