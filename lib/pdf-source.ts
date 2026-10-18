/**
 * Regras puras do leitor de PDF (sem `react-native`), para poderem ser testadas
 * em Node e reaproveitadas pelas duas plataformas.
 *
 * O leitor nativo deixou de usar `react-native-pdf` (imagem raster: nada de
 * texto selecionável). Agora o arquivo é aberto dentro de uma `WebView` com o
 * PDF.js, que desenha o texto numa camada selecionável por cima da página — é o
 * que permite selecionar, copiar e extrair o conteúdo para os flashcards.
 */

export type PdfSourceKind = 'remote' | 'local' | 'data' | 'base64' | 'blob' | 'invalid';

/** Endereço do PDF.js usado dentro da WebView (CDN com cache do WebView). */
export const PDFJS_VERSION = '3.11.174';
export const PDFJS_BASE_URL = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/`;

/** Limite de leitura local: acima disso a WebView estoura a memória no Android. */
export const PDF_LOCAL_SIZE_LIMIT = 24 * 1024 * 1024;
/** Limite de texto guardado no estado (o suficiente para flashcards e busca). */
export const PDF_TEXT_LIMIT = 120_000;
/** Páginas percorridas na extração automática do documento inteiro. */
export const PDF_EXTRACTION_PAGE_LIMIT = 120;

const BASE64_PATTERN = /^[A-Za-z0-9+/=\r\n]+$/;

export function pdfSourceKind(uri: string | null | undefined): PdfSourceKind {
  const value = (uri ?? '').trim();
  if (!value) return 'invalid';
  if (/^https?:\/\//i.test(value)) return 'remote';
  if (/^file:\/\//i.test(value)) return 'local';
  if (/^data:application\/pdf/i.test(value)) return 'data';
  if (/^blob:/i.test(value)) return 'blob';
  // A importação pela web guarda o base64 cru; a nativa guarda `file://`.
  if (value.length > 256 && BASE64_PATTERN.test(value)) return 'base64';
  return 'invalid';
}

/** Devolve sempre um endereço que o PDF.js consegue abrir. */
export function normalizePdfUri(uri: string | null | undefined): string {
  const value = (uri ?? '').trim();
  if (pdfSourceKind(value) === 'base64') {
    return `data:application/pdf;base64,${value.replace(/\s+/g, '')}`;
  }
  return value;
}

/** O Google Docs Viewer só consegue buscar arquivos públicos (`http`/`https`). */
export function isGoogleViewerEligible(uri: string | null | undefined): boolean {
  return pdfSourceKind(uri) === 'remote';
}

/**
 * Visualizador do Google: `gview?embedded=true&url=<pdf público>`.
 * É o caminho mais rápido para um link público — e o plano B quando o PDF.js
 * esbarra em CORS ao buscar o arquivo direto do servidor da faculdade.
 */
export function googleDocsViewerUrl(uri: string): string {
  return `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(uri.trim())}`;
}

/** Título amigável para um PDF sem metadados (ex.: "prova-2024.pdf"). */
export function pdfFileName(uri: string | null | undefined): string {
  const value = (uri ?? '').trim();
  if (!value) return 'Documento';
  const withoutQuery = value.split('?')[0];
  const raw = withoutQuery.split('/').pop() ?? '';
  try {
    return decodeURIComponent(raw) || 'Documento';
  } catch {
    return raw || 'Documento';
  }
}

/** Corta o texto extraído preservando palavras inteiras (sem "cortar no meio"). */
export function clampPdfText(text: string | null | undefined, limit = PDF_TEXT_LIMIT): string {
  const value = (text ?? '').replace(/\u0000/g, '').trim();
  if (value.length <= limit) return value;
  const slice = value.slice(0, limit);
  const lastSpace = slice.lastIndexOf(' ');
  return `${(lastSpace > limit * 0.8 ? slice.slice(0, lastSpace) : slice).trimEnd()}…`;
}

/** Normaliza espaços/quebras que o extrator do PDF.js deixa passar. */
export function tidyPdfText(text: string): string {
  return text
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Script injetado antes do HTML rodar: entrega o arquivo (data URI) ao PDF.js. */
export function buildPdfSourceInjection(dataUri: string): string {
  return `window.__PDF_DATA__ = ${JSON.stringify(dataUri)}; true;`;
}

/** Mensagens que a WebView envia ao app. */
export type PdfViewerMessage =
  | { type: 'ready'; pages: number }
  | { type: 'page'; page: number; pages: number; text: string }
  | { type: 'document'; pages: number; text: string; truncated: boolean }
  | { type: 'copy'; text: string }
  | { type: 'error'; message: string }
  | { type: 'external'; url: string };

function asNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

/** Lê a mensagem da WebView com validação — nada de `JSON.parse` solto na tela. */
export function parsePdfViewerMessage(raw: string | null | undefined): PdfViewerMessage | null {
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
  if (type === 'ready') return { type: 'ready', pages: asNumber(source.pages) };
  if (type === 'page') {
    return {
      type: 'page',
      page: asNumber(source.page, 1),
      pages: asNumber(source.pages, 1),
      text: typeof source.text === 'string' ? source.text : '',
    };
  }
  if (type === 'document') {
    return {
      type: 'document',
      pages: asNumber(source.pages),
      text: typeof source.text === 'string' ? source.text : '',
      truncated: source.truncated === true,
    };
  }
  if (type === 'copy') return { type: 'copy', text: typeof source.text === 'string' ? source.text : '' };
  if (type === 'error') {
    return { type: 'error', message: typeof source.message === 'string' ? source.message : 'Falha ao abrir o PDF.' };
  }
  if (type === 'external') {
    return { type: 'external', url: typeof source.url === 'string' ? source.url : '' };
  }
  return null;
}
