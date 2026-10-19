import { describe, expect, it } from 'vitest';
import {
  MOODLE_PDF_MAX_BYTES,
  buildMoodlePdfClickInterceptor,
  buildMoodlePdfDownloadScript,
  isMoodlePdfCandidate,
  moodlePdfBootstrapUrl,
  moodlePdfFileName,
  parseMoodlePdfMessage,
} from '../lib/moodle-pdf';

describe('detecção de PDFs do Moodle', () => {
  it('aceita links .pdf, inclusive com query string', () => {
    expect(isMoodlePdfCandidate('https://ava.example.edu/mod/resource/view.php?file=prova.pdf')).toBe(true);
    expect(isMoodlePdfCandidate('https://ava.example.edu/arquivos/apostila.PDF?forcedownload=1')).toBe(true);
  });

  it('aceita pluginfile.php com ou sem nome .pdf no fim', () => {
    expect(isMoodlePdfCandidate('https://ava.example.edu/pluginfile.php/10/mod_resource/content/1/material.pdf')).toBe(true);
    expect(isMoodlePdfCandidate('https://ava.example.edu/pluginfile.php/10/mod_resource/content/1/arquivo?forcedownload=1')).toBe(true);
  });

  it('recusa páginas comuns, protocolos perigosos e texto vazio', () => {
    expect(isMoodlePdfCandidate('https://ava.example.edu/course/view.php?id=12')).toBe(false);
    expect(isMoodlePdfCandidate('javascript:alert(1)//.pdf')).toBe(false);
    expect(isMoodlePdfCandidate('data:application/pdf;base64,AAAA')).toBe(false);
    expect(isMoodlePdfCandidate('   ')).toBe(false);
  });
});

describe('nome e origem do arquivo baixado', () => {
  it('usa o último segmento decodificado e garante a extensão .pdf', () => {
    expect(
      moodlePdfFileName('https://ava.example.edu/pluginfile.php/1/mod_resource/content/0/Prova%20Final.pdf?forcedownload=1'),
    ).toBe('Prova Final.pdf');
    expect(moodlePdfFileName('https://ava.example.edu/pluginfile.php/1/mod_resource/content/0/material')).toBe('material.pdf');
  });

  it('sanitiza o título de fallback e não duplica a extensão', () => {
    expect(moodlePdfFileName('https://ava.example.edu/pluginfile.php/1/mod_resource/content/0/', 'Aula: 1/2')).toBe(
      'Aula_ 1_2.pdf',
    );
    expect(moodlePdfFileName('https://ava.example.edu/pluginfile.php', 'Material sem nome')).toBe('Material sem nome.pdf');
    expect(moodlePdfFileName('https://ava.example.edu/pluginfile.php/1/mod_resource/content/0/', 'Resumo.pdf')).toBe(
      'Resumo.pdf',
    );
  });

  it('resolve a página de mesma origem para o download autenticado', () => {
    expect(moodlePdfBootstrapUrl('https://ava.example.edu/pluginfile.php/1/a.pdf')).toBe('https://ava.example.edu/');
    expect(moodlePdfBootstrapUrl('não é URL')).toBe('');
  });
});

describe('mensagens da WebView', () => {
  it('valida o pedido de PDF', () => {
    expect(parseMoodlePdfMessage('{"type":"moodle-pdf-request","url":"https://ava.example.edu/a.pdf"}')).toEqual({
      type: 'request',
      url: 'https://ava.example.edu/a.pdf',
    });
    expect(parseMoodlePdfMessage('{"type":"moodle-pdf-request","url":"https://ava.example.edu/course/view.php"}')).toBeNull();
  });

  it('lê início, bloco, fim e erro', () => {
    expect(parseMoodlePdfMessage('{"type":"moodle-pdf-start","size":2048}')).toEqual({ type: 'start', size: 2048 });
    expect(parseMoodlePdfMessage('{"type":"moodle-pdf-chunk","data":"JVBERi0="}')).toEqual({
      type: 'chunk',
      data: 'JVBERi0=',
    });
    expect(parseMoodlePdfMessage('{"type":"moodle-pdf-end"}')).toEqual({ type: 'end' });
    expect(parseMoodlePdfMessage('{"type":"moodle-pdf-error","message":"Sessão expirada"}')).toEqual({
      type: 'error',
      message: 'Sessão expirada',
    });
  });

  it('ignora JSON inválido e tipos desconhecidos', () => {
    expect(parseMoodlePdfMessage('{')).toBeNull();
    expect(parseMoodlePdfMessage('{"type":"outro"}')).toBeNull();
    expect(parseMoodlePdfMessage('')).toBeNull();
  });
});

describe('scripts injetados na WebView', () => {
  it('instala um interceptor de cliques idempotente', () => {
    const script = buildMoodlePdfClickInterceptor();
    expect(script).toContain('__estudoOrganizadoPdfHook');
    expect(script).toContain('ReactNativeWebView.postMessage');
    expect(script).toMatch(/pluginfile/);
    expect(script).toContain('preventDefault');
  });

  it('baixa com cookies da sessão, em blocos, respeitando o limite', () => {
    const script = buildMoodlePdfDownloadScript('https://ava.example.edu/pluginfile.php/1/a.pdf');
    expect(script).toContain("credentials: 'include'");
    expect(script).toContain('moodle-pdf-start');
    expect(script).toContain('moodle-pdf-chunk');
    expect(script).toContain('moodle-pdf-end');
    expect(script).toContain('FileReader');
    expect(script).toContain(String(MOODLE_PDF_MAX_BYTES));
    expect(script).toContain('https://ava.example.edu/pluginfile.php/1/a.pdf');
  });
});
