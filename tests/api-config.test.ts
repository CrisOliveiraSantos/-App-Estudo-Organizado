import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  API_PROVIDERS,
  PROVIDER_LIVE_MODEL,
  isModelInList,
  normalizeModelId,
  suggestLiveModel,
  testProviderModel,
} from '../lib/api-config';
import { CrisCallError, describeCrisFailure } from '../lib/cris-client';

// `lib/api-config.ts` importa `react-native` e `expo-secure-store`; nos testes
// de Node puro nós os substituímos por dublês para exercitar os helpers reais
// (não só ler o texto-fonte). O `vi.mock` é içado pelo Vitest acima dos imports.
vi.mock('expo-secure-store', () => ({
  getItemAsync: async () => null,
  setItemAsync: async () => undefined,
  deleteItemAsync: async () => undefined,
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'when-unlocked',
}));
vi.mock('react-native', () => ({ Platform: { OS: 'web' } }));

/**
 * Guarda-corpo contra as regressões reportadas na conexão de IA da Cris
 * (Ajustes → IA). Estes testes leem o código-fonte real das telas/módulos —
 * mesmo padrão de `tests/cris-memory.test.ts` — porque `app/api-settings.tsx`
 * e `components/cris-popup.tsx` só carregam dentro do app (React Native), não
 * em Node puro.
 */

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const readSource = (relativePath: string) => readFileSync(resolve(ROOT, relativePath), 'utf8');

/** Recorta o corpo de um `useCallback` do nome até o fechamento `}, [...]);`. */
function callbackBody(source: string, name: string): string {
  const marker = `const ${name} = useCallback(`;
  const start = source.indexOf(marker);
  if (start < 0) throw new Error(`useCallback ${name} não encontrado`);
  const end = source.indexOf(']);', start);
  if (end < 0) throw new Error(`fim do useCallback ${name} não encontrado`);
  return source.slice(start, end);
}

const API_SETTINGS = readSource('app/api-settings.tsx');
const CRIS_POPUP = readSource('components/cris-popup.tsx');
const API_CONFIG = readSource('lib/api-config.ts');

describe('Ajustes → IA: "Testar" persiste a configuração (bugs 3, 4, 5 e 7)', () => {
  it('runLocalTest salva o endereço testado quando o teste dá certo', () => {
    const body = callbackBody(API_SETTINGS, 'runLocalTest');
    expect(body).toMatch(/result\.ok/);
    expect(body).toMatch(/url:\s*localUrl/);
    expect(body).toContain('lastTestedTarget: localUrl');
    expect(body).toContain('saveLocal(');
  });

  it('runProviderTest salva id, chave, URL base e modelo quando o teste dá certo', () => {
    const body = callbackBody(API_SETTINGS, 'runProviderTest');
    expect(body).toMatch(/connection\.ok/);
    expect(body).toMatch(/apiKey:\s*tested\.apiKey/);
    expect(body).toMatch(/baseUrl:\s*tested\.baseUrl/);
    expect(body).toMatch(/model:\s*tested\.model/);
    expect(body).toContain('lastTestedTarget: providerTestTarget(payload)');
    expect(body).toContain('saveProvider(');
  });

  it('runProviderTest encadeia GET /models + POST /chat/completions (badge só verde se o modelo responder)', () => {
    const body = callbackBody(API_SETTINGS, 'runProviderTest');
    expect(body).toContain('testProviderApi(payload)');
    expect(body).toContain('testProviderModel(payload)');
    expect(body).toMatch(/lastTestStatus:\s*effective\.ok/);
    // A lista de /models (passo 1) é preservada para os chips continuarem aparecendo.
    expect(body).toMatch(/models:\s*connection\.models/);
  });

  it('deixa claro que a configuração é salva só quando o teste dá certo', () => {
    expect(API_SETTINGS).toContain('Quando o teste dá certo, a configuração é salva neste dispositivo.');
    expect(API_SETTINGS).not.toContain('A chave não é gravada pelo botão');
  });
});

describe('Regressão: testar a API de terceiros NÃO liga a IA local (bug 6)', () => {
  it('runProviderTest não grava nem lê a configuração de IA local', () => {
    const body = callbackBody(API_SETTINGS, 'runProviderTest');
    expect(body).not.toMatch(/saveLocal/);
    expect(body).not.toMatch(/config\.local/);
    expect(body).not.toMatch(/localUrl/);
  });

  it('o cartão "Modo ativo" mostra explicitamente qual fonte está ativa', () => {
    expect(API_SETTINGS).toContain('const activeSource =');
    expect(API_SETTINGS).toMatch(/Fonte ativa agora:/);
    expect(API_SETTINGS).toContain('modeActiveNote:');
  });
});

describe('Popup da Cris: status de IA não congela e fica ao vivo (bugs 2 e 5)', () => {
  it('relê a configuração a cada abertura (sem a trava aiReady !== null)', () => {
    expect(CRIS_POPUP).not.toContain('aiReady !== null');
    expect(CRIS_POPUP).not.toContain('}, [open, aiReady]');
    expect(CRIS_POPUP).toContain('}, [open]);');
  });

  it('assina mudanças de configuração para atualizar ao vivo', () => {
    expect(CRIS_POPUP).toContain('apiConfig.subscribeAiConfig(apply)');
    expect(API_CONFIG).toContain('export function subscribeAiConfig');
  });

  it('usa o mesmo conceito de "ativo" da tela de Ajustes (ready, não só configurado)', () => {
    expect(CRIS_POPUP).toContain('apiConfig.isLocalAiReady(config.local) || apiConfig.isProviderAiReady(config.provider)');
    expect(CRIS_POPUP).not.toContain('isProviderConfigured(config.provider)');
  });
});

describe('Modelo "vivo": o app não deve apontar para modelos aposentados (gemini-2.5-*)', () => {
  it('o default do Gemini é da geração atual, não 2.5', () => {
    expect(API_PROVIDERS.gemini.defaultModel).not.toMatch(/^gemini-2\.5/);
    expect(API_PROVIDERS.gemini.defaultModel).toMatch(/^gemini-3/);
  });

  it('normaliza o prefixo `models/` do Gemini', () => {
    expect(normalizeModelId('models/gemini-3.8-flash')).toBe('gemini-3.8-flash');
    expect(normalizeModelId('gemini-3.8-flash')).toBe('gemini-3.8-flash');
  });

  it('isModelInList aceita com e sem o prefixo `models/`, e reprova o ausente', () => {
    const models = ['models/gemini-3.8-flash', 'models/gemini-3.8-pro'];
    expect(isModelInList(models, 'gemini-3.8-flash')).toBe(true);
    expect(isModelInList(models, 'models/gemini-3.8-pro')).toBe(true);
    expect(isModelInList(models, 'gemini-2.5-pro')).toBe(false);
  });

  it('lista vazia não reprova (provedor que não lista modelos)', () => {
    expect(isModelInList([], 'qualquer-modelo')).toBe(true);
  });

  it('suggestLiveModel escolhe o primeiro da geração atual no Gemini', () => {
    const models = ['models/gemini-2.5-pro', 'models/gemini-3.8-flash', 'models/gemini-3.9-pro'];
    expect(suggestLiveModel('gemini', models)).toBe('gemini-3.8-flash');
  });

  it('suggestLiveModel prefere o primeiro da lista antes do apelido vivo', () => {
    expect(suggestLiveModel('gemini', ['models/gemini-2.5-flash'])).toBe('gemini-2.5-flash');
    expect(suggestLiveModel('gemini', [])).toBe('gemini-flash-latest');
  });

  it('o apelido vivo do Gemini nunca envelhece (latest)', () => {
    expect(PROVIDER_LIVE_MODEL.gemini).toBe('gemini-flash-latest');
  });
});

describe('Ajustes → IA: modelo aposentado NÃO passa como "ativo" (regressão do 404 da Cris)', () => {
  it('runProviderTest valida o MODELO com POST, não só a conexão', () => {
    const body = callbackBody(API_SETTINGS, 'runProviderTest');
    expect(body).toContain('testProviderApi(payload)');
    expect(body).toContain('testProviderModel(payload)');
    expect(body).toMatch(/connection\.ok/);
    expect(body).toMatch(/lastTestStatus:\s*effective\.ok\s*\?\s*'success'\s*:\s*'error'/);
    // A chave é gravada com a conexão OK (mesmo com o modelo aposentado) —
    // por isso o guarda da chave passou de `result.ok` para `connectionOk`.
    expect(body).toMatch(/connectionOk\s*\?/);
  });

  it('a tela oferece o modelo recomendado, o apelido vivo e o teste de modelo', () => {
    expect(API_SETTINGS).toContain('Usar modelo recomendado');
    expect(API_SETTINGS).toContain('PROVIDER_LIVE_MODEL');
    expect(API_SETTINGS).toContain('applyProviderModel');
    expect(API_SETTINGS).toContain('runProviderModelTest');
    expect(API_SETTINGS).toContain('Testar modelo');
  });

  it('o aviso de modelo aposentado reage ao resultado do POST (reason === "model")', () => {
    expect(API_SETTINGS).toMatch(/providerResult\?\.reason\s*===\s*'model'/);
    expect(API_SETTINGS).toMatch(/applyProviderModel\(modelListKnown \? suggestedModel : providerPreset\.defaultModel\)/);
  });
});

describe('Popup da Cris: a falha da IA vira aviso acionável com "Corrigir agora"', () => {
  it('guarda o detail da falha no turno e o repassa ao patch final', () => {
    expect(CRIS_POPUP).toContain('failure?: CrisFailure | null');
    expect(CRIS_POPUP).toContain('failure: reply.failure ?? null');
  });

  it('mostra o aviso da falha e esconde o texto genérico quando há um detail', () => {
    expect(CRIS_POPUP).toContain('turn.fallbackReason && !turn.failure');
    expect(CRIS_POPUP).toContain('turn.failure.message');
    expect(CRIS_POPUP).toContain('Corrigir agora');
    expect(CRIS_POPUP).toMatch(/turn\.failure\.kind === 'retired-model'/);
    expect(CRIS_POPUP).toMatch(/turn\.failure\.kind === 'invalid-key'/);
  });
});


describe('testProviderModel: POST /chat/completions revela o modelo aposentado (404)', () => {
  const payload = {
    id: 'groq' as const,
    apiKey: 'sk-test',
    baseUrl: 'https://api.groq.com/openai/v1',
    model: 'llama-retired',
  };
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it('200 → ok, sem reason; a chave sai só no cabeçalho Authorization', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({ choices: [] }) });
    const result = await testProviderModel(payload);
    expect(result.ok).toBe(true);
    expect(result.reason).toBeUndefined();
    const init = fetchMock.mock.calls[0][1] as RequestInit & { headers: Record<string, string> };
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe('Bearer sk-test');
    expect(JSON.parse(init.body as string)).toMatchObject({ model: 'llama-retired', max_tokens: 1 });
  });

  it('404 → reason "model" e mensagem cita o modelo', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 404, json: async () => ({}) });
    const result = await testProviderModel(payload);
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('model');
    expect(result.message).toContain('llama-retired');
  });

  it('401 → reason "auth"', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 401, json: async () => ({}) });
    expect((await testProviderModel(payload)).reason).toBe('auth');
  });

  it('429 → reason "rate"', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 429, json: async () => ({}) });
    expect((await testProviderModel(payload)).reason).toBe('rate');
  });

  it('falha de rede → reason "offline"', async () => {
    fetchMock.mockRejectedValue(new TypeError('Network request failed'));
    const result = await testProviderModel(payload);
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('offline');
  });
});


describe('describeCrisFailure: mensagens acionáveis por tipo (nada de "erro desconhecido")', () => {
  const target = {
    kind: 'provider' as const,
    label: 'Provedor Groq',
    endpoint: 'https://api.groq.com/openai/v1/chat/completions',
    model: 'llama-retired',
    reason: 'Chave guardada apenas neste dispositivo.',
  };

  it('404 → retired-model e cita o modelo que falhou', () => {
    const failure = describeCrisFailure(new CrisCallError('provider', { status: 404 }), target);
    expect(failure.kind).toBe('retired-model');
    expect(failure.model).toBe('llama-retired');
    expect(failure.message).toContain('llama-retired');
    expect(failure.message).toContain('aposentado');
  });

  it('401 e 403 → invalid-key', () => {
    expect(describeCrisFailure(new CrisCallError('provider', { status: 401 }), target).kind).toBe('invalid-key');
    expect(describeCrisFailure(new CrisCallError('provider', { status: 403 }), target).kind).toBe('invalid-key');
  });

  it('429 → rate-limit', () => {
    expect(describeCrisFailure(new CrisCallError('provider', { status: 429 }), target).kind).toBe('rate-limit');
  });

  it('timeout, offline e vazio → kinds próprios', () => {
    expect(describeCrisFailure(new CrisCallError('provider', { timedOut: true }), target).kind).toBe('timeout');
    expect(describeCrisFailure(new CrisCallError('provider', { offline: true }), target).kind).toBe('offline');
    expect(describeCrisFailure(new CrisCallError('provider', { empty: true }), target).kind).toBe('empty');
  });

  it('404 sem modelo conhecido ainda explica a aposentadoria', () => {
    const failure = describeCrisFailure(new CrisCallError('provider', { status: 404 }));
    expect(failure.kind).toBe('retired-model');
    expect(failure.message).toContain('aposentado');
    expect(failure.model).toBeUndefined();
  });

  it('erro não-CrisCallError cai no texto legível e nunca é vazio', () => {
    const failure = describeCrisFailure(new Error('boom'));
    expect(failure.kind).toBe('other');
    expect(failure.message.length).toBeGreaterThan(0);
  });
});

