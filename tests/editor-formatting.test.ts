import { describe, expect, it } from 'vitest';
import { applyTextFormat } from '../lib/editor-formatting';

describe('applyTextFormat', () => {
  it('envolve o texto selecionado com marcação de negrito', () => {
    expect(applyTextFormat('Revisar React', { start: 8, end: 13 }, 'bold')).toEqual({
      text: 'Revisar **React**',
      selection: { start: 10, end: 15 },
    });
  });

  it('insere uma opção de itálico quando não há seleção', () => {
    expect(applyTextFormat('', { start: 0, end: 0 }, 'italic')).toEqual({
      text: '_texto em itálico_',
      selection: { start: 1, end: 17 },
    });
  });

  it('aplica marcação de sublinhado, tachado e destaque ao texto selecionado', () => {
    expect(applyTextFormat('Texto', { start: 0, end: 5 }, 'underline').text).toBe('__Texto__');
    expect(applyTextFormat('Texto', { start: 0, end: 5 }, 'strike').text).toBe('~~Texto~~');
    expect(applyTextFormat('Texto', { start: 0, end: 5 }, 'highlight').text).toBe('==Texto==');
  });

  it('transforma várias linhas selecionadas em uma lista com marcadores', () => {
    expect(applyTextFormat('Ler\nPraticar', { start: 0, end: 12 }, 'bullet-list').text).toBe('• Ler\n• Praticar');
  });

  it('transforma várias linhas selecionadas em uma lista numerada', () => {
    expect(applyTextFormat('Ler\nPraticar', { start: 0, end: 12 }, 'numbered-list').text).toBe('1. Ler\n2. Praticar');
  });
});
