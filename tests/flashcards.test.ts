import { describe, expect, it } from 'vitest';

import {
  buildFlashcardPrompt,
  flashcardNoteContent,
  localFlashcards,
  parseFlashcards,
  readCompletionText,
  splitSentences,
} from '../lib/flashcards';

const TEXT = [
  'A fotossíntese converte energia luminosa em energia química nas plantas.',
  'A mitocôndria é responsável pela respiração celular e pela produção de ATP.',
  'O núcleo celular guarda o material genético e coordena as atividades da célula.',
  'A membrana plasmática controla a entrada e a saída de substâncias da célula.',
  'Os ribossomos realizam a síntese de proteínas a partir do RNA mensageiro.',
].join(' ');

describe('leitura do JSON da IA', () => {
  it('aceita array puro dentro de bloco markdown', () => {
    const cards = parseFlashcards('```json\n[{"question":"O que é ATP?","answer":"É a moeda energética da célula."}]\n```');
    expect(cards).toHaveLength(1);
    expect(cards[0]).toMatchObject({ question: 'O que é ATP?', answer: 'É a moeda energética da célula.' });
    expect(cards[0].id).toBe('card-1');
  });

  it('aceita objeto com chaves em português e texto antes do JSON', () => {
    const raw = 'Segue a lista:\n{"flashcards":[{"pergunta":"O que é mitose?","resposta":"Divisão celular."}]}';
    const cards = parseFlashcards(raw);
    expect(cards[0].question).toBe('O que é mitose?');
    expect(cards[0].answer).toBe('Divisão celular.');
  });

  it('remove repetidas, respeita o limite e ignora itens incompletos', () => {
    const raw = JSON.stringify([
      { question: 'Pergunta repetida aqui', answer: 'Resposta 1' },
      { question: 'Pergunta repetida aqui', answer: 'Resposta 2' },
      { question: 'Sem resposta' },
      { question: 'Outra pergunta válida', answer: 'Resposta 3' },
    ]);
    const cards = parseFlashcards(raw, 1);
    expect(cards).toHaveLength(1);
    expect(parseFlashcards(raw)[1].answer).toBe('Resposta 3');
  });

  it('devolve lista vazia quando não há JSON utilizável', () => {
    expect(parseFlashcards('desculpe, não consegui')).toEqual([]);
    expect(parseFlashcards('[{"foo":"bar"}]')).toEqual([]);
  });
});

describe('cartões offline', () => {
  it('monta cartões de completar a partir das frases', () => {
    const cards = localFlashcards(TEXT, 3);
    expect(cards).toHaveLength(3);
    expect(cards[0].question.startsWith('Complete: ')).toBe(true);
    expect(cards[0].question).toContain('_____');
    expect(cards[0].answer).toContain('—');
  });

  it('não inventa cartões quando o texto não tem frases utilizáveis', () => {
    expect(localFlashcards('curto demais', 5)).toEqual([]);
  });

  it('divide o texto em frases completas', () => {
    expect(splitSentences('Primeira frase aqui. Segunda frase aqui!')).toHaveLength(2);
    expect(splitSentences('')).toEqual([]);
  });
});

describe('prompt e saída', () => {
  it('pede JSON com a quantidade escolhida', () => {
    const prompt = buildFlashcardPrompt(TEXT, 7);
    expect(prompt).toContain('Crie 7 flashcards');
    expect(prompt).toContain('SOMENTE com um array JSON');
    expect(prompt).toContain('A fotossíntese');
  });

  it('salva os cartões em texto numerado', () => {
    const content = flashcardNoteContent('Biologia', [{ id: '1', question: 'O que é ATP?', answer: 'Energia.' }]);
    expect(content).toContain('Flashcards — Biologia');
    expect(content).toContain('1. O que é ATP?');
  });

  it('lê respostas no formato OpenAI e no formato Gemini (partes)', () => {
    expect(readCompletionText({ choices: [{ message: { content: '  texto  ' } }] })).toBe('texto');
    expect(readCompletionText({ choices: [{ message: { content: [{ type: 'text', text: 'parcial' }, { type: 'text', text: ' juntado' }] } }] })).toBe('parcial juntado');
    expect(readCompletionText({ response: 'legado' })).toBe('legado');
    expect(readCompletionText(null)).toBe('');
  });
});
