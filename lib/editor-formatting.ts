/* ------------------------------------------------------------------------- */
/* Leitura e migração de documentos antigos                                  */
/* ------------------------------------------------------------------------- */

export type InlineStyle = {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  highlight?: boolean;
};

export type InlineSegment = InlineStyle & { text: string };

export type PreviewBlock =
  | { type: 'paragraph'; segments: InlineSegment[] }
  | { type: 'heading'; segments: InlineSegment[] }
  | { type: 'bullet'; segments: InlineSegment[] }
  | { type: 'numbered'; index: number; segments: InlineSegment[] };

/**
 * Marcadores aceitos pelo editor. A ordem importa: `__` (sublinhado) precisa
 * ser testado antes de `_` (itálico), senão `__texto__` abriria itálico no
 * primeiro underscore.
 */
const INLINE_MARKERS: readonly { style: keyof InlineStyle; token: string }[] = [
  { style: 'bold', token: '**' },
  { style: 'underline', token: '__' },
  { style: 'strike', token: '~~' },
  { style: 'highlight', token: '==' },
  { style: 'italic', token: '_' },
];

const ALPHANUMERIC = /[0-9A-Za-zÀ-ÖØ-öø-ÿ]/;

/**
 * `_itálico_` não deve casar no meio de identificadores (`snake_case_name`).
 * Só abre quando o caractere anterior não é alfanumérico e o seguinte não é
 * espaço; só fecha quando o caractere depois do marcador não é alfanumérico.
 */
function canOpenItalic(text: string, index: number, token: string): boolean {
  if (token !== '_') return true;
  const before = text[index - 1] ?? '';
  const after = text[index + 1] ?? '';
  if (!after || /\s/.test(after)) return false;
  return !ALPHANUMERIC.test(before);
}

function findClosingItalic(text: string, start: number): number {
  let index = text.indexOf('_', start);
  while (index !== -1) {
    const next = text[index + 1] ?? '';
    // `__` é sublinhado: não pode fechar itálico.
    if (next === '_') {
      index = text.indexOf('_', index + 2);
      continue;
    }
    if (!ALPHANUMERIC.test(next)) return index;
    index = text.indexOf('_', index + 1);
  }
  return -1;
}

/**
 * Converte o texto com marcação em trechos prontos para `<Text>`. Estilos se
 * aninham (`**negrito _itálico_**`), marcadores sem par continuam literais e o
 * texto nunca perde caracteres.
 */
export function parseInline(text: string, inherited: InlineStyle = {}): InlineSegment[] {
  const segments: InlineSegment[] = [];
  let buffer = '';
  let index = 0;

  const flush = () => {
    if (!buffer) return;
    segments.push({ ...inherited, text: buffer });
    buffer = '';
  };

  while (index < text.length) {
    const marker = INLINE_MARKERS.find(candidate => text.startsWith(candidate.token, index));
    if (!marker || !canOpenItalic(text, index, marker.token)) {
      buffer += text[index];
      index += 1;
      continue;
    }

    const contentStart = index + marker.token.length;
    const contentEnd =
      marker.token === '_' ? findClosingItalic(text, contentStart) : text.indexOf(marker.token, contentStart);
    const inner = contentEnd === -1 ? '' : text.slice(contentStart, contentEnd);

    if (contentEnd === -1 || inner.length === 0) {
      // Marcador órfão (ex.: `**sem fechar`): fica como texto normal.
      buffer += marker.token;
      index = contentStart;
      continue;
    }

    flush();
    segments.push(...parseInline(inner, { ...inherited, [marker.style]: true }));
    index = contentEnd + marker.token.length;
  }

  flush();
  return segments;
}

const HEADING_LINE = /^(#{1,3})\s+(.+)$/;
const BULLET_LINE = /^[•\-*]\s+(.+)$/;
const NUMBERED_LINE = /^(\d+)[.)]\s+(.+)$/;

/**
 * Atalho barato (sem percorrer o documento inteiro) para avisar na interface
 * que existem marcações visíveis no modo de edição. Usa as mesmas regras do
 * parser: negrito, sublinhado, tachado, destaque, itálico, título e listas.
 */
const MARKUP_PATTERN =
  /(\*\*[^\s*][^\n]*?\*\*|__[^\s_][^\n]*?__|~~[^\s~][^\n]*?~~|==[^\s=][^\n]*?==|(?:^|[\s(])_[^\s_][^\n]*?_(?=\s|$|[.,;:!?)])|^\s*(?:#{1,3}\s+|•\s+|\d+[.)]\s+))/m;

export function hasTextMarkup(text: string): boolean {
  return MARKUP_PATTERN.test(text);
}

/**
 * Divide o documento em blocos de leitura. Cada linha vira um parágrafo, item
 * de lista, item numerado ou título — as mesmas marcações que os botões da
 * toolbar injetam (`• `, `1. `, `# `).
 */
export function parsePreviewBlocks(text: string): PreviewBlock[] {
  const normalized = text.replace(/\r\n?/g, '\n');
  if (!normalized.trim()) return [];

  return normalized.split('\n').map(line => {
    const trimmed = line.trim();
    const heading = HEADING_LINE.exec(trimmed);
    if (heading) return { type: 'heading', segments: parseInline(heading[2]) };

    const bullet = BULLET_LINE.exec(trimmed);
    if (bullet) return { type: 'bullet', segments: parseInline(bullet[1]) };

    const numbered = NUMBERED_LINE.exec(trimmed);
    if (numbered) return { type: 'numbered', index: Number(numbered[1]), segments: parseInline(numbered[2]) };

    return { type: 'paragraph', segments: parseInline(line) };
  });
}
