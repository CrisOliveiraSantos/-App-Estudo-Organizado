/**
 * Ponte entre a WebView autenticada do Moodle e o leitor de PDF do app.
 *
 * Por que não baixar direto com `expo-file-system`: o Moodle grava a sessão em
 * cookies `HttpOnly`, que não aparecem para `document.cookie` nem são enviados
 * pelo cliente HTTP nativo. Quem consegue ler esses cookies é a própria WebView
 * (que já está logada). Então o arquivo é buscado dentro da página com
 * `fetch(..., { credentials: 'include' })`, convertido em base64 em blocos e
 * gravado no armazenamento permanente pelo `expo-file-system` antes de abrir o
 * PDF.js. Nada trafega para fora da sessão do usuário.
 *
 * As funções deste módulo são puras para poderem ser testadas em Node.
 */

/** Mesmo teto do leitor local: acima disso o base64 pode estourar a memória. */
export const MOODLE_PDF_MAX_BYTES = 20 * 1024 * 1024;
/** Bloco de bytes enviado por `postMessage` (múltiplo de 3 para base64 exato). */
const DOWNLOAD_CHUNK_BYTES = 384 * 1024;

const PDF_PATH = /\.pdf(?:$|[?#])/i;
const PLUGINFILE_PATH = /\/pluginfile\.php(?:\/|$|\?)/i;

/** Só links HTTP(S) de PDF ou do `pluginfile.php` do Moodle entram no leitor. */
export function isMoodlePdfCandidate(raw: string | null | undefined): boolean {
  const value = (raw ?? '').trim();
  if (!value) return false;
  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
    const target = `${url.pathname}${url.search}`;
    return PDF_PATH.test(target) || PLUGINFILE_PATH.test(target);
  } catch {
    return false;
  }
}

function safeName(value: string, fallback: string): string {
  const clean = value
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_')
    .replace(/\s+/g, ' ')
    .trim();
  return clean || fallback;
}

/**
 * Nome de arquivo seguro e terminado em `.pdf`. Em `pluginfile.php` o último
 * segmento costuma ser o nome real; quando ele não existe, usa o título da
 * atividade.
 */
export function moodlePdfFileName(rawUrl: string | null | undefined, fallbackTitle = 'Material do Moodle'): string {
  const fallback = safeName(fallbackTitle, 'Material do Moodle');
  let candidate = '';
  try {
    const last = new URL((rawUrl ?? '').trim()).pathname.split('/').pop() ?? '';
    if (/\.php$/i.test(last)) {
      candidate = '';
    } else {
      try {
        candidate = decodeURIComponent(last);
      } catch {
        candidate = last;
      }
    }
  } catch {
    candidate = '';
  }
  const name = safeName(candidate, fallback);
  const base = name.replace(/\.pdf$/i, '').trim() || 'Material do Moodle';
  return `${base.slice(0, 90).trim()}.pdf`;
}

/**
 * Página de mesma origem usada quando a atividade já abre direto num PDF.
 * A WebView precisa carregar algo do domínio do Moodle para que o `fetch`
 * autenticado tenha a origem e os cookies certos.
 */
export function moodlePdfBootstrapUrl(rawUrl: string | null | undefined): string {
  try {
    return `${new URL((rawUrl ?? '').trim()).origin}/`;
  } catch {
    return '';
  }
}

export type MoodlePdfMessage =
  | { type: 'request'; url: string }
  | { type: 'start'; size: number }
  | { type: 'chunk'; data: string }
  | { type: 'end' }
  | { type: 'error'; message: string };

/** Lê mensagens da WebView sem confiar cegamente no JSON da página. */
export function parseMoodlePdfMessage(raw: string | null | undefined): MoodlePdfMessage | null {
  const value = (raw ?? '').trim();
  if (!value) return null;
  let payload: unknown;
  try {
    payload = JSON.parse(value) as unknown;
  } catch {
    return null;
  }
  if (!payload || typeof payload !== 'object') return null;
  const source = payload as Record<string, unknown>;
  const type = typeof source.type === 'string' ? source.type : '';
  if (type === 'moodle-pdf-request') {
    const url = typeof source.url === 'string' ? source.url.trim() : '';
    return isMoodlePdfCandidate(url) ? { type: 'request', url } : null;
  }
  if (type === 'moodle-pdf-start') {
    const size = typeof source.size === 'number' && Number.isFinite(source.size) ? source.size : 0;
    return { type: 'start', size: Math.max(0, size) };
  }
  if (type === 'moodle-pdf-chunk') {
    const data = typeof source.data === 'string' ? source.data : '';
    return data ? { type: 'chunk', data } : null;
  }
  if (type === 'moodle-pdf-end') return { type: 'end' };
  if (type === 'moodle-pdf-error') {
    return {
      type: 'error',
      message: typeof source.message === 'string' && source.message.trim() ? source.message.trim() : 'Não foi possível baixar este PDF.',
    };
  }
  return null;
}

/**
 * Hook instalado em toda página do Moodle. Ele captura o clique antes da
 * navegação e manda o endereço para o app; o `onShouldStartLoadWithRequest`
 * cobre navegações que não passam por um `<a>` (formulários, redirecionamentos).
 */
export function buildMoodlePdfClickInterceptor(): string {
  return `(function () {
  if (window.__estudoOrganizadoPdfHook) return true;
  window.__estudoOrganizadoPdfHook = true;
  var isPdf = function (raw) {
    try {
      var url = new URL(raw, window.location.href);
      if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
      var target = url.pathname + url.search;
      return /\\.pdf(?:$|[?#])/i.test(target) || /\\/pluginfile\\.php(?:\\/|$|\\?)/i.test(target);
    } catch (error) {
      return false;
    }
  };
  var notify = function (raw) {
    try {
      var url = new URL(raw, window.location.href);
      if (!window.ReactNativeWebView) return;
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'moodle-pdf-request', url: url.href }));
    } catch (error) {}
  };
  document.addEventListener('click', function (event) {
    var node = event.target;
    while (node && node !== document && !(node.tagName === 'A' && node.getAttribute('href'))) node = node.parentNode;
    if (!node || node === document) return;
    var href = node.getAttribute('href');
    if (!href || href.indexOf('javascript:') === 0) return;
    if (!isPdf(href)) return;
    event.preventDefault();
    event.stopPropagation();
    notify(href);
  }, true);
  return true;
})(); true;`;
}


/**
 * Script que baixa o PDF autenticado e devolve o conteúdo em blocos base64.
 * Cada bloco cede a thread antes do próximo para não congelar a WebView.
 */
export function buildMoodlePdfDownloadScript(rawUrl: string): string {
  const url = JSON.stringify((rawUrl ?? '').trim());
  return `(function () {
  if (window.__estudoOrganizadoPdfDownloading) return;
  window.__estudoOrganizadoPdfDownloading = true;
  var url = ${url};
  var maxBytes = ${MOODLE_PDF_MAX_BYTES};
  var chunkBytes = ${DOWNLOAD_CHUNK_BYTES};
  var post = function (payload) {
    try {
      if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(payload));
    } catch (error) {}
  };
  var fail = function (message) {
    window.__estudoOrganizadoPdfDownloading = false;
    post({ type: 'moodle-pdf-error', message: String(message || 'Não foi possível baixar este PDF.') });
  };
  var readChunk = function (blob) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onerror = function () { reject(new Error('Falha ao ler o PDF baixado.')); };
      reader.onload = function () {
        var result = String(reader.result || '');
        var comma = result.indexOf(',');
        resolve(comma >= 0 ? result.slice(comma + 1) : '');
      };
      reader.readAsDataURL(blob);
    });
  };
  var readText = function (blob) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onerror = function () { reject(new Error('Falha ao ler o início do PDF.')); };
      reader.onload = function () { resolve(String(reader.result || '')); };
      reader.readAsText(blob);
    });
  };
  (async function () {
    try {
      var response = await fetch(url, { credentials: 'include', cache: 'no-store', redirect: 'follow' });
      if (!response.ok) throw new Error('O Moodle respondeu ' + response.status + '. Entre novamente pelo Moodle e tente de novo.');
      var type = String(response.headers.get('content-type') || '').toLowerCase();
      if (type.indexOf('text/html') >= 0) {
        throw new Error('O Moodle devolveu uma página de login em vez do PDF. A sessão pode ter expirado.');
      }
      var blob = await response.blob();
      if (!blob.size) throw new Error('O arquivo baixado está vazio.');
      if (blob.size > maxBytes) {
        throw new Error('Este PDF tem ' + (blob.size / 1048576).toFixed(1) + ' MB e passa do limite de ' + Math.round(maxBytes / 1048576) + ' MB do leitor interno.');
      }
      var isPdf = type.indexOf('pdf') >= 0 || type.indexOf('octet-stream') >= 0 || type.indexOf('force-download') >= 0 || type.indexOf('application/download') >= 0 || !type;
      if (!isPdf) throw new Error('Este link não aponta para um PDF (' + type + '). Use “Abrir fora” para o formato original.');
      var head = await readText(blob.slice(0, 5));
      if (head.indexOf('%PDF-') !== 0) throw new Error('O arquivo baixado não começa como PDF. Use “Abrir fora” para o formato original.');
      post({ type: 'moodle-pdf-start', size: blob.size });
      for (var offset = 0; offset < blob.size; offset += chunkBytes) {
        var part = blob.slice(offset, Math.min(offset + chunkBytes, blob.size));
        var data = await readChunk(part);
        if (!data) throw new Error('Não foi possível converter o PDF para o leitor.');
        post({ type: 'moodle-pdf-chunk', data: data });
        await new Promise(function (resolve) { setTimeout(resolve, 0); });
      }
      window.__estudoOrganizadoPdfDownloading = false;
      post({ type: 'moodle-pdf-end' });
    } catch (error) {
      fail(error && error.message ? error.message : error);
    }
  })();
})(); true;`;
}

