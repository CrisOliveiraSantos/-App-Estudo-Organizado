import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it, vi } from 'vitest';

/** Caminho real do cliente da Cris (a configuração de geração vive lá). */
const CLIENT_SOURCE = resolve(dirname(fileURLToPath(import.meta.url)), '../lib/cris-client.ts');

/**
 * AsyncStorage em memória. `lib/cris-memory.ts` importa o AsyncStorage de
 * forma tardia (dentro das funções) e o `vi.mock` do Vitest intercepta
 * import estático E dinâmico — assim o teste cobre gravação, leitura e
 * remoção reais, sem tocar o aparelho.
 */
const { store } = vi.hoisted(() => ({ store: new Map<string, string>() }));

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: async (key: string) => store.get(key) ?? null,
    setItem: async (key: string, value: string) => { store.set(key, value); },
    removeItem: async (key: string) => { store.delete(key); },
  },
}));

import {
  clearCrisMemory,
  CRIS_MEMORY_KEY,
  describeUserMemory,
  EMPTY_CRIS_MEMORY,
  getCrisMemory,
  isCrisMemoryEmpty,
  normalizeCrisMemory,
  saveCrisMemory,
} from '../lib/cris-memory';
import { buildSystemPrompt, type CrisContext } from '../lib/cris-client';

const CONTEXT: CrisContext = {
  route: '/planning',
  screen: 'Planejamento',
  title: null,
  selection: null,
  detail: null,
  topics: [],
};

const FULL_PROFILE = {
  name: 'Cris Oliveira Santos',
  role: 'criadora do app e estudante',
  college: 'Universidade Federal',
  course: 'Sistemas de Informação',
  subjects: ['Cálculo', 'Programação'],
  about: 'Estudo de manhã e reviso à noite.',
};

afterEach(() => {
  store.clear();
});

describe('normalizeCrisMemory', () => {
  it('apara espaços, remove matérias repetidas e ignora vazias', () => {
    const clean = normalizeCrisMemory({
      name: '   Cris   Oliveira   ',
      subjects: [' Cálculo ', 'cálculo', 'Programação', '', '  '],
    });
    expect(clean.name).toBe('Cris Oliveira');
    expect(clean.subjects).toEqual(['Cálculo', 'Programação']);
  });

  it('limita o tamanho dos campos e o número de matérias', () => {
    const clean = normalizeCrisMemory({
      name: 'a'.repeat(200),
      about: 'b'.repeat(900),
      subjects: Array.from({ length: 20 }, (_, index) => `Matéria ${index}`),
    });
    expect(clean.name.length).toBe(60);
    expect(clean.about.length).toBe(400);
    expect(clean.subjects).toHaveLength(12);
  });

  it('nunca lança com entrada inválida', () => {
    expect(normalizeCrisMemory(null)).toEqual(EMPTY_CRIS_MEMORY);
    expect(normalizeCrisMemory(undefined)).toEqual(EMPTY_CRIS_MEMORY);
    expect(normalizeCrisMemory({ subjects: 'não é lista' as unknown as string[] }).subjects).toEqual([]);
  });
});

describe('isCrisMemoryEmpty', () => {
  it('considera vazio quando só há espaços em branco', () => {
    expect(isCrisMemoryEmpty({ name: '   ', about: '', subjects: [] })).toBe(true);
    expect(isCrisMemoryEmpty(EMPTY_CRIS_MEMORY)).toBe(true);
  });

  it('não considera vazio quando há nome ou matéria', () => {
    expect(isCrisMemoryEmpty({ name: 'Cris' })).toBe(false);
    expect(isCrisMemoryEmpty({ subjects: ['Cálculo'] })).toBe(false);
  });
});

describe('describeUserMemory', () => {
  it('sem dados, avisa que não conhece a pessoa e proíbe inventar', () => {
    const block = describeUserMemory(null);
    expect(block).toContain('# Sobre quem conversa com você');
    expect(block).toContain('ainda não conhece');
    expect(block).toContain('NUNCA invente');
    expect(block).toContain('UMA vez');
    expect(block).not.toContain('Nome:');
  });

  it('com dados, descreve o perfil e proíbe presumir gênero', () => {
    const block = describeUserMemory(FULL_PROFILE);
    expect(block).toContain('Nome: Cris Oliveira Santos');
    expect(block).toContain('Papel: criadora do app e estudante');
    expect(block).toContain('Faculdade: Universidade Federal');
    expect(block).toContain('Curso: Sistemas de Informação');
    expect(block).toContain('Matérias: Cálculo, Programação');
    expect(block).toContain('Estudo de manhã e reviso à noite.');
    expect(block).toContain('Não presuma gênero');
  });

  it('não expõe a chave de armazenamento', () => {
    expect(describeUserMemory(FULL_PROFILE)).not.toContain(CRIS_MEMORY_KEY);
  });
});

describe('getCrisMemory / saveCrisMemory / clearCrisMemory', () => {
  it('começa vazio quando não há nada salvo', async () => {
    await expect(getCrisMemory()).resolves.toEqual(EMPTY_CRIS_MEMORY);
  });

  it('salva na chave versionada e lê de volta normalizado', async () => {
    const saved = await saveCrisMemory({ ...FULL_PROFILE, subjects: [' Cálculo ', 'Cálculo'] });
    expect(saved.subjects).toEqual(['Cálculo']);
    expect(typeof saved.updatedAt).toBe('string');
    expect(store.has(CRIS_MEMORY_KEY)).toBe(true);

    const raw = JSON.parse(store.get(CRIS_MEMORY_KEY) as string) as { name: string };
    expect(raw.name).toBe('Cris Oliveira Santos');

    const read = await getCrisMemory();
    expect(read.name).toBe('Cris Oliveira Santos');
    expect(read.subjects).toEqual(['Cálculo']);
  });

  it('apaga o perfil do aparelho', async () => {
    await saveCrisMemory(FULL_PROFILE);
    await clearCrisMemory();
    expect(store.has(CRIS_MEMORY_KEY)).toBe(false);
    await expect(getCrisMemory()).resolves.toEqual(EMPTY_CRIS_MEMORY);
  });

  it('devolve o perfil vazio quando o JSON salvo está corrompido', async () => {
    store.set(CRIS_MEMORY_KEY, '{isso nao e json');
    await expect(getCrisMemory()).resolves.toEqual(EMPTY_CRIS_MEMORY);
  });
});

describe('buildSystemPrompt', () => {
  it('carrega identidade, telas, limites e as regras anti-repetição', () => {
    const prompt = buildSystemPrompt(CONTEXT);
    expect(prompt).toContain('Você é a Cris, a mentora de estudos');
    expect(prompt).toContain('Você foi criada por Cris Oliveira Santos, a dona do app.');
    expect(prompt).toContain('Hoje, Editor, Planejamento, Biblioteca, Conversas e Ajustes');
    expect(prompt).toContain('NUNCA fala sobre configurações do dispositivo');
    expect(prompt).toContain('NÃO participa da conversa com outras pessoas');
    expect(prompt).toContain('NUNCA repita a saudação');
    expect(prompt).toContain('NUNCA faça a mesma pergunta duas vezes');
    expect(prompt).toContain('# O que ainda não existe');
    expect(prompt).toContain('no máximo 5 itens ou 3 parágrafos curtos');
    expect(prompt).toContain('/planning');
  });

  it('sem memória, diz que ela não conhece a pessoa', () => {
    expect(buildSystemPrompt(CONTEXT, null)).toContain('Você ainda não conhece esta pessoa');
    expect(buildSystemPrompt(CONTEXT, EMPTY_CRIS_MEMORY)).toContain('Você ainda não conhece esta pessoa');
  });

  it('com memória, injeta o perfil entre as regras e o contexto da tela', () => {
    const prompt = buildSystemPrompt(CONTEXT, normalizeCrisMemory(FULL_PROFILE));
    expect(prompt).toContain('Nome: Cris Oliveira Santos');
    // lastIndexOf: os nomes dos blocos também aparecem nas regras do prompt fixo.
    expect(prompt.lastIndexOf('# Regras obrigatórias')).toBeLessThan(prompt.lastIndexOf('# Sobre quem conversa com você'));
    expect(prompt.lastIndexOf('# Sobre quem conversa com você')).toBeLessThan(prompt.lastIndexOf('[Contexto da tela do app]'));
  });

  it('nunca carrega chave, cabeçalho de autorização nem a chave de storage', () => {
    const prompt = buildSystemPrompt(CONTEXT, FULL_PROFILE);
    for (const forbidden of ['Bearer', 'Authorization', 'apiKey', 'sk-', CRIS_MEMORY_KEY]) {
      expect(prompt).not.toContain(forbidden);
    }
  });
});

describe('configuração de geração (anti-repetição)', () => {
  it('mantém max_tokens 600 e temperature 0.3 no cliente da Cris', () => {
    const source = readFileSync(CLIENT_SOURCE, 'utf8');
    expect(source).toContain('const CHAT_MAX_TOKENS = 600;');
    expect(source).toContain('const CHAT_TEMPERATURE = 0.3;');
  });
});
