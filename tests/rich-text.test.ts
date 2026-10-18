import { describe, expect, it } from 'vitest';

import {
  excerptFromContent,
  markdownToHtml,
  plainTextFromHtml,
  richTextToPlainText,
  sanitizeEditorHtml,
  toEditorHtml,
} from '../lib/rich-text';

describe('migração da marcação antiga para HTML', () => {
  it('converte negrito, itálico e listas sem perder o texto', () => {
    const html = markdownToHtml('**Negrito** e _itálico_\n• Um\n• Dois\n1. Primeiro');
    expect(html).toContain('<b>Negrito</b>');
    expect(html).toContain('<i>itálico</i>');
    expect(html).toContain('<ul><li>Um</li><li>Dois</li></ul>');
    expect(html).toContain('<ol><li>Primeiro</li></ol>');
  });

  it('mantém documentos que já estão em HTML', () => {
    expect(toEditorHtml('<p>Oi <b>mundo</b></p>')).toBe('<p>Oi <b>mundo</b></p>');
    expect(toEditorHtml('')).toBe('');
  });

  it('remove scripts e eventos colados de fora', () => {
    expect(sanitizeEditorHtml('<p onclick="alert(1)">Oi</p><script>alert(1)</script>')).toBe('<p>Oi</p>');
  });
});

describe('texto limpo para busca e exportação', () => {
  it('remove as tags e preserva parágrafos e listas', () => {
    const text = plainTextFromHtml('<p>Oi <b>mundo</b></p><ul><li>Um</li><li>Dois</li></ul>');
    expect(text).toContain('Oi mundo');
    expect(text).toContain('• Um');
    expect(text).toContain('• Dois');
    expect(text).not.toContain('<p>');
    expect(text).not.toContain('<b>');
  });

  it('numera listas ordenadas e decodifica entidades', () => {
    expect(plainTextFromHtml('<ol><li>Um</li><li>Dois</li></ol>')).toBe('1. Um\n2. Dois');
    expect(plainTextFromHtml('<p>A &amp; B &lt; C</p>')).toBe('A & B < C');
  });

  it('aceita HTML novo e a marcação antiga', () => {
    expect(richTextToPlainText('<p>Texto <b>forte</b></p>')).toBe('Texto forte');
    expect(richTextToPlainText('Texto **forte** e _leve_')).toBe('Texto forte e leve');
    expect(richTextToPlainText('snake_case_name')).toBe('snake_case_name');
    expect(richTextToPlainText('• Um\n1. Dois')).toBe('• Um\n1. Dois');
  });

  it('cria uma prévia curta sem tags', () => {
    const excerpt = excerptFromContent(`<p>${'a'.repeat(200)}</p>`, 20);
    expect(excerpt).toHaveLength(20);
    expect(excerpt.endsWith('…')).toBe(true);
    expect(excerptFromContent('', 20)).toBe('');
  });
});
