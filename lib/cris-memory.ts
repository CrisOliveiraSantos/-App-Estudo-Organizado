/* ------------------------------------------------------------------ *
 * Cris · memória do usuário (Fase 1C — "Sobre mim")
 *
 * O que é: o que a Cris precisa saber sobre quem usa o app para não
 * tratar a pessoa como desconhecida — nome, papel, faculdade, curso,
 * matérias e um contexto livre. Fica SÓ neste aparelho (AsyncStorage).
 *
 * Por que um módulo próprio: `lib/cris-client.ts` precisa continuar
 * importável em Node puro (é assim que as sondas e os testes o carregam)
 * e `@react-native-async-storage/async-storage` não carrega fora do app.
 * Por isso o AsyncStorage entra por import TARDIO, DENTRO das funções de
 * leitura/gravação — mesmo padrão que `cris-client.ts` já usa para
 * `@/lib/api-config`. As funções puras (normalizar/descrever) não tocam
 * o armazenamento e são a base dos testes.
 *
 * Armazenamento: AsyncStorage (nativo e web — na web ele usa
 * localStorage). O perfil NÃO é segredo (nome, curso, matérias), então
 * não usa `expo-secure-store` — que além disso não tem suporte a web e
 * limita o valor a 2048 bytes. Se um dia for preciso, trocar é mexer
 * apenas em `loadStorage()`.
 *
 * Privacidade: nada aqui é enviado a servidor algum do app. O resumo do
 * perfil é anexado ao prompt e vai, junto com a pergunta, para a IA que a
 * pessoa escolheu (local ou provedor) — como qualquer outra pergunta.
 * A tela `/cris-profile` avisa isso de forma explícita.
 * Este arquivo não possui nenhuma chamada de `console.*`.
 * ------------------------------------------------------------------ */

/** Chave do armazenamento local (uma por aparelho). */
export const CRIS_MEMORY_KEY = '@estudo-organizado/cris-memory-v1';

export type CrisUserMemory = {
  name: string;
  role: string;
  college: string;
  course: string;
  subjects: string[];
  about: string;
  updatedAt: string | null;
};

export const EMPTY_CRIS_MEMORY: CrisUserMemory = {
  name: '', role: '', college: '', course: '', subjects: [], about: '', updatedAt: null,
};

/** Limites: evitam prompt gigante e digitação acidental. */
const LIMITS = { name: 60, role: 60, college: 80, course: 80, subject: 40, subjects: 12, about: 400 };

function clip(value: unknown, max: number): string {
  const text = typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
  return text.length > max ? text.slice(0, max).trim() : text;
}

/** Normaliza o que veio do armazenamento/formulário. Nunca lança. */
export function normalizeCrisMemory(input: Partial<CrisUserMemory> | null | undefined): CrisUserMemory {
  const source = input ?? {};
  const subjects: string[] = [];
  for (const item of Array.isArray(source.subjects) ? source.subjects : []) {
    const subject = clip(item, LIMITS.subject);
    if (!subject) continue;
    if (subjects.some(existing => existing.toLowerCase() === subject.toLowerCase())) continue;
    subjects.push(subject);
    if (subjects.length >= LIMITS.subjects) break;
  }
  return {
    name: clip(source.name, LIMITS.name),
    role: clip(source.role, LIMITS.role),
    college: clip(source.college, LIMITS.college),
    course: clip(source.course, LIMITS.course),
    subjects,
    about: clip(source.about, LIMITS.about),
    updatedAt: typeof source.updatedAt === 'string' && source.updatedAt ? source.updatedAt : null,
  };
}

/** `true` quando não há nada salvo (nenhum campo preenchido). */
export function isCrisMemoryEmpty(memory: Partial<CrisUserMemory> | null | undefined): boolean {
  const clean = normalizeCrisMemory(memory);
  return !clean.name && !clean.role && !clean.college && !clean.course && !clean.about && clean.subjects.length === 0;
}

/**
 * Bloco "# Sobre quem conversa com você", anexado ao prompt da Cris.
 * Sem nenhum dado, diz explicitamente que ela não conhece a pessoa e
 * proíbe inventar — é o que evita "Oi, [nome inventado]".
 */
export function describeUserMemory(memory: Partial<CrisUserMemory> | null | undefined): string {
  const clean = normalizeCrisMemory(memory);
  const lines: string[] = ['# Sobre quem conversa com você'];
  if (isCrisMemoryEmpty(clean)) {
    lines.push('Você ainda não conhece esta pessoa: não há dados salvos no aparelho.');
    lines.push('NUNCA invente nome, faculdade, curso nem matérias.');
    lines.push('Se for útil, pergunte UMA vez como ela quer ser chamada; se ela não responder, siga sem o nome e nunca repita a pergunta.');
    return lines.join('\n');
  }
  if (clean.name) lines.push(`Nome: ${clean.name}. Use o nome quando fizer sentido.`);
  if (clean.role) lines.push(`Papel: ${clean.role}.`);
  if (clean.college) lines.push(`Faculdade: ${clean.college}.`);
  if (clean.course) lines.push(`Curso: ${clean.course}.`);
  if (clean.subjects.length) lines.push(`Matérias: ${clean.subjects.join(', ')}.`);
  if (clean.about) lines.push(`Contexto que ela escreveu: "${clean.about}".`);
  lines.push('Use somente estes dados. Não presuma gênero, idade nem informações que não estejam acima e nunca complete lacunas.');
  return lines.join('\n');
}

/* ------------------------------------------------------------------ *
 * Armazenamento (import tardio do AsyncStorage — ver comentário do topo)
 * ------------------------------------------------------------------ */

type AsyncStorageModule = {
  default: {
    getItem(key: string): Promise<string | null>;
    setItem(key: string, value: string): Promise<void>;
    removeItem(key: string): Promise<void>;
  };
};

async function loadStorage(): Promise<AsyncStorageModule | null> {
  try {
    return (await import('@react-native-async-storage/async-storage')) as unknown as AsyncStorageModule;
  } catch {
    return null;
  }
}

/** Lê o perfil salvo. Sem armazenamento (Node/teste) devolve o perfil vazio. */
export async function getCrisMemory(): Promise<CrisUserMemory> {
  const storage = await loadStorage();
  if (!storage) return { ...EMPTY_CRIS_MEMORY };
  try {
    const raw = await storage.default.getItem(CRIS_MEMORY_KEY);
    if (!raw) return { ...EMPTY_CRIS_MEMORY };
    return normalizeCrisMemory(JSON.parse(raw) as Partial<CrisUserMemory>);
  } catch {
    return { ...EMPTY_CRIS_MEMORY };
  }
}

/** Grava o perfil normalizado e devolve o que foi salvo. */
export async function saveCrisMemory(input: Partial<CrisUserMemory>): Promise<CrisUserMemory> {
  const clean = normalizeCrisMemory({ ...input, updatedAt: input.updatedAt ?? new Date().toISOString() });
  const storage = await loadStorage();
  if (storage) await storage.default.setItem(CRIS_MEMORY_KEY, JSON.stringify(clean));
  return clean;
}

/** Apaga o perfil deste aparelho. */
export async function clearCrisMemory(): Promise<void> {
  const storage = await loadStorage();
  if (!storage) return;
  await storage.default.removeItem(CRIS_MEMORY_KEY);
}
