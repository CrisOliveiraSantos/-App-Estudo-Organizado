/**
 * Ponte entre o conteúdo salvo e o editor rico.
 *
 * Documentos antigos foram gravados com marcação (`**negrito**`, `• item`).
 * Para não perder esse conteúdo, `toEditorHtml` converte a marcação em HTML na
 * primeira abertura. Depois disso o editor passa a gravar HTML (pell), e as
 * listas, a busca e a exportação usam `richTextToPlainText` para nunca mostrar
 * tags cruas.
 */
import {
  hasTextMarkup,
  parsePreviewBlocks,
  type InlineSegment,
} from './editor-formatting';

const HTML_TAG =
  /<(?:p|div|br|span|b|strong|i|em|u|s|strike|ul|ol|li|h[1-6]|blockquote|pre|font|table|tbody|tr|td|th|img|a|mark)\b[^>]*>/i;

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
};

export function looksLikeHtml(value: string): boolean {
  return HTML_TAG.test(value);
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function decodeHtmlEntities(value: string): string {
  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match: string, code: string) => {
    if (code.startsWith('#')) {
      const hexadecimal = code[1]?.toLowerCase() === 'x';
      const parsed = Number.parseInt(code.slice(hexadecimal ? 2 : 1), hexadecimal ? 16 : 10);
      return Number.isFinite(parsed) ? String.fromCodePoint(parsed) : match;
    }
    return NAMED_ENTITIES[code.toLowerCase()] ?? match;
  });
}

/**
 * Remove apenas o que não deve entrar no WebView (scripts, iframes e eventos
 * inline). O conteúdo é local, mas ele pode vir de um texto colado da web.
 */
export function sanitizeEditorHtml(html: string): string {
  return html
    .replace(/<\s*(script|style|iframe|object|embed)\b[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
    .replace(/<[^>]*>/g, tag =>
      tag
        .replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
        .replace(/\b(?:href|src)\s*=\s*(?:"\s*javascript:[^"]*"|'\s*javascript:[^']*'|javascript:[^\s>]+)/gi, ''),
    );
}

function segmentsToHtml(segments: InlineSegment[]): string {
  return segments
    .map(segment => {
      let html = escapeHtml(segment.text);
      if (segment.bold) html = `<b>${html}</b>`;
      if (segment.italic) html = `<i>${html}</i>`;
      if (segment.underline) html = `<u>${html}</u>`;
      if (segment.strike) html = `<s>${html}</s>`;
      if (segment.highlight) html = `<span style="background-color:#FFE58A;">${html}</span>`;
      return html;
    })
    .join('');
}

/** Converte a marcação antiga em HTML sem perder nenhum caractere do texto. */
export function markdownToHtml(markdown: string): string {
  const blocks = parsePreviewBlocks(markdown);
  if (!blocks.length) return '';

  const html: string[] = [];
  let listType: 'bullet' | 'numbered' | null = null;
  let listItems: string[] = [];

  const flushList = () => {
    if (!listType) return;
    const tag = listType === 'bullet' ? 'ul' : 'ol';
    html.push(`<${tag}>${listItems.map(item => `<li>${item}</li>`).join('')}</${tag}>`);
    listType = null;
    listItems = [];
  };

  for (const block of blocks) {
    if (block.type === 'bullet' || block.type === 'numbered') {
      if (listType !== block.type) {
        flushList();
        listType = block.type;
        listItems = [];
      }
      listItems.push(segmentsToHtml(block.segments));
      continue;
    }

    flushList();
    if (block.type === 'heading') {
      html.push(`<h2>${segmentsToHtml(block.segments)}</h2>`);
    } else if (block.segments.length === 0) {
      html.push('<p><br></p>');
    } else {
      html.push(`<p>${segmentsToHtml(block.segments)}</p>`);
    }
  }

  flushList();
  return html.join('');
}

/** HTML pronto para o editor: preserva HTML existente e migra a marcação antiga. */
export function toEditorHtml(value: string): string {
  const content = value ?? '';
  if (!content.trim()) return '';
  return looksLikeHtml(content) ? sanitizeEditorHtml(content) : markdownToHtml(content);
}

function listsToText(html: string): string {
  return html
    .replace(/<ol\b[^>]*>([\s\S]*?)<\/ol>/gi, (_match: string, inner: string) => {
      let index = 0;
      return inner.replace(
        /<li\b[^>]*>([\s\S]*?)<\/li>/gi,
        (_item: string, text: string) => `\n${++index}. ${text}`,
      );
    })
    .replace(/<ul\b[^>]*>([\s\S]*?)<\/ul>/gi, (_match: string, inner: string) =>
      inner.replace(
        /<li\b[^>]*>([\s\S]*?)<\/li>/gi,
        (_item: string, text: string) => `\n• ${text}`,
      ),
    );
}

/** Texto limpo para busca, prévia, contagem de palavras, exportação e cópia. */
export function plainTextFromHtml(html: string): string {
  if (!html) return '';
  const withLists = listsToText(html);
  const withBreaks = withLists
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6]|blockquote|tr|pre)>/gi, '\n')
    .replace(/<li\b[^>]*>/gi, '• ')
    .replace(/<(td|th)\b[^>]*>/gi, ' ')
    .replace(/<[^>]*>/g, '');

  return decodeHtmlEntities(withBreaks)
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function blockToPlainText(block: ReturnType<typeof parsePreviewBlocks>[number]): string {
  const text = block.segments.map(segment => segment.text).join('');
  if (block.type === 'bullet') return `• ${text}`;
  if (block.type === 'numbered') return `${block.index}. ${text}`;
  return text;
}

/**
 * Aceita tanto HTML do editor novo quanto a marcação antiga. Texto comum sem
 * marcação é devolvido intacto (inclusive `snake_case` e URLs).
 */
export function richTextToPlainText(value: string | undefined | null): string {
  const content = value ?? '';
  if (!content.trim()) return '';
  if (looksLikeHtml(content)) return plainTextFromHtml(content);
  if (!hasTextMarkup(content)) return content.trim();
  return parsePreviewBlocks(content).map(blockToPlainText).join('\n').trim();
}

/** Prévia curta para os cartões de documento, sem HTML nem marcadores. */
export function excerptFromContent(value: string | undefined | null, maxLength = 180): string {
  const text = richTextToPlainText(value).replace(/\s+/g, ' ').trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(1, maxLength - 1)).trimEnd()}…`;
}
