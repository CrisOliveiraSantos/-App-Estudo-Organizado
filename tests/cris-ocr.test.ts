import { readFileSync } from 'node:fs';
import { createServer, type IncomingHttpHeaders, type Server } from 'node:http';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

// `lib/api-config` (dono dos helpers reais usados aqui) importa `react-native`
// e `expo-secure-store`; nos testes de Node puro os dublês os substituem —
// mesmo padrão de `tests/api-config.test.ts`. O `vi.mock` é içado acima dos imports.
vi.mock('expo-secure-store', () => ({
  getItemAsync: async () => null,
  setItemAsync: async () => undefined,
  deleteItemAsync: async () => undefined,
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'when-unlocked',
}));
vi.mock('react-native', () => ({ Platform: { OS: 'web' } }));

import { API_PROVIDERS, isLocalConfigured, isProviderConfigured, normalizeLocalUrl, type AiConfig, type ApiProviderId } from '../lib/api-config';
import { extractTextFromImage, listOcrTargets, type CrisOcrRuntime } from '../lib/cris-ocr';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const readSource = (relativePath: string) => readFileSync(resolve(ROOT, relativePath), 'utf8');

/** Helpers reais de produção; em cada teste só a configuração é injetada. */
const RUNTIME: CrisOcrRuntime = { presets: API_PROVIDERS, normalizeLocalUrl, isLocalConfigured, isProviderConfigured };

const IMAGE = 'Zm90by1kYS1wYWdpbmE=';
const ANSWER = 'Capítulo 1\nA célula é a unidade da vida.';

const ok = (content: string) => ({ status: 200, payload: { choices: [{ message: { content } }] } });
const fail = (status: number, message: string) => ({ status, payload: { error: { message } } });

type Recorded = { url: string; headers: IncomingHttpHeaders; body: string };

/** Servidor de IA simulado: registra cada requisição e responde o que o teste mandar. */
let server: Server;
let baseUrl = '';
let requests: Recorded[] = [];
let responder: (url: string) => { status: number; payload: unknown; delayMs?: number } = () => ok(ANSWER);

beforeAll(async () => {
  server = createServer((request, response) => {
    let body = '';
    request.on('data', chunk => { body += String(chunk); });
    request.on('end', () => {
      const url = request.url ?? '';
      requests.push({ url, headers: request.headers, body });
      const { status, payload, delayMs } = responder(url);
      const send = () => {
        try {
          response.writeHead(status, { 'Content-Type': 'application/json' });
          response.end(JSON.stringify(payload));
        } catch {
          // O teste de timeout aborta a requisição: responder depois disso não é falha.
        }
      };
      if (delayMs) setTimeout(send, delayMs);
      else send();
    });
  });
  await new Promise<void>(done => { server.listen(0, '127.0.0.1', () => done()); });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('o servidor de teste não subiu');
  baseUrl = `http://127.0.0.1:${address.port}`;
});

afterAll(async () => {
  await new Promise<void>(done => { server.close(() => done()); });
});

afterEach(() => {
  requests = [];
  responder = () => ok(ANSWER);
});

function emptyConfig(mode: 'local' | 'provider'): AiConfig {
  return {
    mode,
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
}

/** IA local de mentira apontando para o servidor de teste (`/ollama`). */
function withLocal(config: AiConfig, model: string | null = 'llava:latest'): AiConfig {
  return { ...config, local: { ...config.local, url: `${baseUrl}/ollama`, backend: 'Ollama', model } };
}

/** Provedor de terceiros de mentira apontando para o servidor de teste (`/gemini`). */
function withProvider(config: AiConfig, id: ApiProviderId = 'gemini', apiKey = 'chave-do-aluno'): AiConfig {
  return { ...config, provider: { ...config.provider, id, apiKey, baseUrl: `${baseUrl}/${id}`, model: API_PROVIDERS[id].defaultModel } };
}

describe('OCR no dispositivo: escolha do alvo', () => {
  it('sem IA conectada não faz nenhuma requisição e explica como conectar', async () => {
    await expect(extractTextFromImage(IMAGE, 'image/jpeg', { config: emptyConfig('local'), runtime: RUNTIME })).rejects.toThrow(
      'Nenhuma IA conectada. Abra Ajustes → IA e conecte um provedor com visão (ex.: Gemini) para usar o OCR.',
    );
    expect(requests).toEqual([]);
  });

  it('no modo local a IA local vem primeiro e o provedor fica de reserva', () => {
    const config = withProvider(withLocal(emptyConfig('local')));
    expect(listOcrTargets(config, RUNTIME).map(target => target.endpoint)).toEqual([
      `${baseUrl}/ollama/v1/chat/completions`,
      `${baseUrl}/gemini/chat/completions`,
    ]);
  });

  it('no modo provedor o provedor vem primeiro e a IA local fica de reserva', () => {
    const config = withProvider(withLocal(emptyConfig('provider')));
    expect(listOcrTargets(config, RUNTIME).map(target => target.kind)).toEqual(['provider', 'local']);
  });

  it('o alvo que sai para a interface não carrega a chave de API', () => {
    const config = withProvider(emptyConfig('provider'), 'gemini', 'chave-secreta-do-aluno');
    expect(JSON.stringify(listOcrTargets(config, RUNTIME))).not.toContain('chave-secreta-do-aluno');
  });
});

describe('OCR no dispositivo: conversa com a IA no formato da OpenAI', () => {
  it('manda a página como data URL em image_url e devolve o texto reconhecido', async () => {
    const config = withProvider(emptyConfig('provider'));
    const result = await extractTextFromImage(IMAGE, 'image/png', { config, runtime: RUNTIME });

    expect(result.text).toBe(ANSWER);
    expect(result.target).toContain('Gemini');
    expect(requests.map(item => item.url)).toEqual(['/gemini/chat/completions']);

    const payload = JSON.parse(requests[0].body) as { model: string; max_tokens: number; messages: { role: string; content: unknown }[] };
    expect(payload.model).toBe(API_PROVIDERS.gemini.defaultModel);
    expect(payload.max_tokens).toBe(4096);
    expect(payload.messages[0].role).toBe('system');
    const parts = payload.messages[1].content as { type: string; image_url?: { url: string } }[];
    expect(parts[0].type).toBe('text');
    expect(parts[1].type).toBe('image_url');
    expect(parts[1].image_url?.url).toBe(`data:image/png;base64,${IMAGE}`);
  });

  it('a chave do aluno sai só no cabeçalho Authorization (nunca no corpo nem no retorno)', async () => {
    const config = withProvider(emptyConfig('provider'), 'gemini', 'chave-secreta-do-aluno');
    const result = await extractTextFromImage(IMAGE, 'image/jpeg', { config, runtime: RUNTIME });

    expect(requests[0].headers.authorization).toBe('Bearer chave-secreta-do-aluno');
    expect(requests[0].body).not.toContain('chave-secreta-do-aluno');
    expect(JSON.stringify(result)).not.toContain('chave-secreta-do-aluno');
  });

  it('a IA local usa /v1/chat/completions e não manda cabeçalho de chave', async () => {
    const config = withLocal(emptyConfig('local'));
    await extractTextFromImage(IMAGE, 'image/jpeg', { config, runtime: RUNTIME });

    expect(requests[0].url).toBe('/ollama/v1/chat/completions');
    expect(requests[0].headers.authorization).toBeUndefined();
  });
});

describe('OCR no dispositivo: falhas explicadas em português', () => {
  it('se a IA local falha, tenta o provedor e informa de onde veio o texto', async () => {
    responder = url => (url.includes('/ollama') ? fail(500, 'modelo sem visão') : ok(ANSWER));
    const config = withProvider(withLocal(emptyConfig('local')));
    const result = await extractTextFromImage(IMAGE, 'image/jpeg', { config, runtime: RUNTIME });

    expect(requests.map(item => item.url)).toEqual(['/ollama/v1/chat/completions', '/gemini/chat/completions']);
    expect(result.target).toContain('Gemini');
  });

  it('se os dois alvos falham, mostra a mensagem do alvo preferido', async () => {
    responder = () => fail(429, 'rate limit');
    const config = withProvider(withLocal(emptyConfig('local')));
    await expect(extractTextFromImage(IMAGE, 'image/jpeg', { config, runtime: RUNTIME })).rejects.toThrow(
      'Limite de uso da IA atingido. Aguarde um instante ou troque de provedor em Ajustes → IA.',
    );
  });

  it('401/403 pedem uma chave nova', async () => {
    responder = () => fail(401, 'invalid api key');
    const config = withProvider(emptyConfig('provider'));
    await expect(extractTextFromImage(IMAGE, 'image/jpeg', { config, runtime: RUNTIME })).rejects.toThrow(/Chave de API recusada/);
  });

  it('400 avisa que o modelo precisa enxergar a imagem', async () => {
    responder = () => fail(400, 'messages[1].content must be a string');
    const config = withProvider(emptyConfig('provider'));
    await expect(extractTextFromImage(IMAGE, 'image/jpeg', { config, runtime: RUNTIME })).rejects.toThrow(/Escolha um modelo com visão em Ajustes → IA/);
  });

  it('404 aponta o modelo que saiu do ar', async () => {
    responder = () => fail(404, 'model not found');
    const config = withProvider(emptyConfig('provider'));
    await expect(extractTextFromImage(IMAGE, 'image/jpeg', { config, runtime: RUNTIME })).rejects.toThrow(/não está mais disponível/);
  });

  it('timeout tem mensagem própria', async () => {
    responder = () => ({ ...ok(ANSWER), delayMs: 150 });
    const config = withProvider(emptyConfig('provider'));
    await expect(extractTextFromImage(IMAGE, 'image/jpeg', { config, runtime: RUNTIME, timeoutMs: 20 })).rejects.toThrow(/demorou demais/);
  });

  it('imagem vazia e resposta sem texto também são explicadas', async () => {
    const config = withProvider(emptyConfig('provider'));
    await expect(extractTextFromImage('   ', 'image/jpeg', { config, runtime: RUNTIME })).rejects.toThrow(/não pôde ser lida/);

    responder = () => ok('');
    await expect(extractTextFromImage(IMAGE, 'image/jpeg', { config, runtime: RUNTIME })).rejects.toThrow(/foto mais nítida/);
  });

  it('aceita resposta em partes (formato de alguns provedores)', async () => {
    responder = () => ({ status: 200, payload: { choices: [{ message: { content: [{ type: 'text', text: 'Parte 1 ' }, { type: 'text', text: 'Parte 2' }] } }] } });
    const config = withProvider(emptyConfig('provider'));
    const result = await extractTextFromImage(IMAGE, 'image/jpeg', { config, runtime: RUNTIME });
    expect(result.text).toBe('Parte 1 Parte 2');
  });
});

describe('OCR nunca passa pelos servidores do aplicativo', () => {
  it('o módulo de OCR não conhece tRPC nem endereço de backend', () => {
    const source = readSource('lib/cris-ocr.ts');
    expect(source).not.toContain('trpc');
    expect(source).not.toContain('/api/trpc');
    expect(source).not.toContain('EXPO_PUBLIC_API_BASE_URL');
  });

  it('Biblioteca e leitor de PDF usam o OCR do dispositivo', () => {
    const library = readSource('app/(tabs)/library.tsx');
    expect(library).toContain("import { extractTextFromImage } from '@/lib/cris-ocr';");
    expect(library).toContain('await extractTextFromImage(imageBase64');
    expect(library).not.toContain('trpc.ocr.extract');

    const pdf = readSource('app/pdf.tsx');
    expect(pdf).toContain("import { extractTextFromImage } from '@/lib/cris-ocr';");
    expect(pdf).toContain('await extractTextFromImage(imageBase64');
    expect(pdf).not.toContain('trpc.ocr.extract.useMutation');
    // O OCR do PDF completo ainda depende do servidor (endpoint nativo do provedor).
    expect(pdf).toContain('trpc.ocr.extractPdf.useMutation');
  });
});
