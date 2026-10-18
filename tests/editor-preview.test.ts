import { describe, expect, it } from 'vitest';
import { parseInline, parsePreviewBlocks, type InlineSegment } from '../lib/editor-formatting';

function plainText(segments: InlineSegment[]): string {
  return segments.map(segment => segment.text).join('');
}

describe('parseInline', () => {
  it('remove os asteriscos do negrito mantendo o texto', () => {
    expect(parseInline('Estudar **React Native** hoje')).toEqual([
      { text: 'Estudar ' },
      { bold: true, text: 'React Native' },
      { text: ' hoje' },
    ]);
  });

  it('remove os underscores do itálico e combina estilos aninhados', () => {
    expect(parseInline('**muito _importante_**')).toEqual([
      { bold: true, text: 'muito ' },
      { bold: true, italic: true, text: 'importante' },
    ]);
  });

  it('reconhece sublinhado, tachado e destaque', () => {
    expect(parseInline('__a__ ~~b~~ ==c==')).toEqual([
      { underline: true, text: 'a' },
      { text: ' ' },
      { strike: true, text: 'b' },
      { text: ' ' },
      { highlight: true, text: 'c' },
    ]);
  });

  it('mantém marcadores sem par como texto literal', () => {
    expect(parseInline('**sem fechar')).toEqual([{ text: '**sem fechar' }]);
    expect(parseInline('==destaque')).toEqual([{ text: '==destaque' }]);
  });

  it('não transforma underscores no meio de identificadores em itálico', () => {
    expect(parseInline('snake_case_name')).toEqual([{ text: 'snake_case_name' }]);
  });

  it('preserva o texto completo ao remover a marcação', () => {
    const source = '**Negrito** e _itálico_ com **mistura _dos dois_**';
    expect(plainText(parseInline(source))).toBe('Negrito e itálico com mistura dos dois');
  });
});

describe('parsePreviewBlocks', () => {
  it('classifica títulos, listas e itens numerados', () => {
    const blocks = parsePreviewBlocks('# Título\n• Primeiro\n2. Segundo');
    expect(blocks).toEqual([
      { type: 'heading', segments: [{ text: 'Título' }] },
      { type: 'bullet', segments: [{ text: 'Primeiro' }] },
      { type: 'numbered', index: 2, segments: [{ text: 'Segundo' }] },
    ]);
  });

  it('mantém parágrafos e linhas em branco na ordem', () => {
    const blocks = parsePreviewBlocks('Primeira linha\n\nSegunda **linha**');
    expect(blocks).toHaveLength(3);
    expect(blocks[0]).toEqual({ type: 'paragraph', segments: [{ text: 'Primeira linha' }] });
    expect(blocks[1]).toEqual({ type: 'paragraph', segments: [] });
    expect(blocks[2]).toEqual({
      type: 'paragraph',
      segments: [{ text: 'Segunda ' }, { bold: true, text: 'linha' }],
    });
  });

  it('devolve lista vazia para conteúdo em branco', () => {
    expect(parsePreviewBlocks('')).toEqual([]);
    expect(parsePreviewBlocks('   \n  ')).toEqual([]);
  });
});
