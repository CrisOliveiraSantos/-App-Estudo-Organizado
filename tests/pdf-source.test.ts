import { describe, expect, it } from 'vitest';

import {
  PDF_TEXT_LIMIT,
  buildPdfSourceInjection,
  clampPdfText,
  googleDocsViewerUrl,
  isGoogleViewerEligible,
  normalizePdfUri,
  parsePdfViewerMessage,
  pdfFileName,
  pdfSourceKind,
  tidyPdfText,
} from '../lib/pdf-source';

const RAW_BASE64 = `${'JVBERi0xLjQK'.repeat(40)}`;

describe('origem do PDF', () => {
  it('classifica links, arquivos locais, data URIs e base64 cru', () => {
    expect(pdfSourceKind('https://ava.escola.br/mod/resource/view.php?id=1')).toBe('remote');
    expect(pdfSourceKind('file:///data/user/0/app/files/prova.pdf')).toBe('local');
    expect(pdfSourceKind('data:application/pdf;base64,JVBERi0x')).toBe('data');
    expect(pdfSourceKind('blob:http://localhost/abc')).toBe('blob');
    expect(pdfSourceKind(RAW_BASE64)).toBe('base64');
    expect(pdfSourceKind('  ')).toBe('invalid');
    expect(pdfSourceKind('prova.pdf')).toBe('invalid');
  });

  it('prefixa o base64 cru guardado pela importação web', () => {
    expect(normalizePdfUri(RAW_BASE64)).toMatch(/^data:application\/pdf;base64,JVBERi0x/);
    expect(normalizePdfUri('https://ava/escola.pdf')).toBe('https://ava/escola.pdf');
  });

  it('usa o Google Docs apenas para links públicos', () => {
    expect(isGoogleViewerEligible('https://ava/escola.pdf')).toBe(true);
    expect(isGoogleViewerEligible('file:///tmp/prova.pdf')).toBe(false);
    expect(googleDocsViewerUrl('https://ava/escola.pdf?a=1&b=2')).toBe(
      'https://docs.google.com/gview?embedded=true&url=https%3A%2F%2Fava%2Fescola.pdf%3Fa%3D1%26b%3D2',
    );
  });

  it('deduz um nome de arquivo legível', () => {
    expect(pdfFileName('file:///tmp/Prova%20de%20C%C3%A1lculo.pdf')).toBe('Prova de Cálculo.pdf');
    expect(pdfFileName('https://ava/escola.pdf?token=1')).toBe('escola.pdf');
    expect(pdfFileName('')).toBe('Documento');
  });
});

describe('texto extraído', () => {
  it('corta no limite preservando palavras inteiras', () => {
    const text = 'conteúdo '.repeat(400);
    const clipped = clampPdfText(text, 120);
    expect(clipped.length).toBeLessThanOrEqual(121);
    expect(clipped.endsWith('…')).toBe(true);
    expect(clipped).not.toContain('conteúd…');
  });

  it('respeita o limite padrão e normaliza espaços', () => {
    expect(clampPdfText('x'.repeat(PDF_TEXT_LIMIT + 50)).length).toBeLessThanOrEqual(PDF_TEXT_LIMIT + 1);
    expect(tidyPdfText('  linha 1   com   espaços \n\n\n\n linha 2  ')).toBe('linha 1 com espaços\n\nlinha 2');
  });
});

describe('mensagens da WebView', () => {
  it('injeta a fonte terminando em true (exigência do iOS)', () => {
    const injection = buildPdfSourceInjection('data:application/pdf;base64,AAA');
    expect(injection).toContain('data:application/pdf;base64,AAA');
    expect(injection.trim().endsWith('true;')).toBe(true);
  });

  it('valida cada tipo de mensagem e ignora lixo', () => {
    expect(parsePdfViewerMessage('{"type":"ready","pages":12}')).toEqual({ type: 'ready', pages: 12 });
    expect(parsePdfViewerMessage('{"type":"page","page":"2","pages":"9","text":"Oi"}')).toEqual({
      type: 'page',
      page: 2,
      pages: 9,
      text: 'Oi',
    });
    expect(parsePdfViewerMessage('{"type":"document","pages":3,"text":"A","truncated":true}')).toEqual({
      type: 'document',
      pages: 3,
      text: 'A',
      truncated: true,
    });
    expect(parsePdfViewerMessage('{"type":"copy","text":"trecho"}')).toEqual({ type: 'copy', text: 'trecho' });
    expect(parsePdfViewerMessage('{"type":"external","url":"https://docs.google.com/gview"}')).toEqual({
      type: 'external',
      url: 'https://docs.google.com/gview',
    });
    expect(parsePdfViewerMessage('{"type":"error","message":"sem worker"}')).toEqual({
      type: 'error',
      message: 'sem worker',
    });
    expect(parsePdfViewerMessage('{"type":"outro"}')).toBeNull();
    expect(parsePdfViewerMessage('não é json')).toBeNull();
    expect(parsePdfViewerMessage(null)).toBeNull();
  });
});
