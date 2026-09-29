export type TextFormat = 'bold' | 'italic' | 'underline' | 'strike' | 'highlight' | 'bullet-list' | 'numbered-list';

export type TextSelection = { start: number; end: number };

export type TextFormattingResult = {
  text: string;
  selection: TextSelection;
};

function normalizeSelection(text: string, selection: TextSelection): TextSelection {
  const start = Math.max(0, Math.min(selection.start, text.length));
  const end = Math.max(start, Math.min(selection.end, text.length));
  return { start, end };
}

function replaceSelection(text: string, selection: TextSelection, replacement: string, innerStart = 0, innerEnd = replacement.length): TextFormattingResult {
  return {
    text: `${text.slice(0, selection.start)}${replacement}${text.slice(selection.end)}`,
    selection: {
      start: selection.start + innerStart,
      end: selection.start + innerEnd,
    },
  };
}

export function applyTextFormat(text: string, selection: TextSelection, format: TextFormat): TextFormattingResult {
  const safeSelection = normalizeSelection(text, selection);
  const selectedText = text.slice(safeSelection.start, safeSelection.end);

  if (format === 'bold' || format === 'italic' || format === 'underline' || format === 'strike' || format === 'highlight') {
    const marker = format === 'bold' ? '**' : format === 'italic' ? '_' : format === 'underline' ? '__' : format === 'strike' ? '~~' : '==';
    const fallback = format === 'bold' ? 'texto em negrito' : format === 'italic' ? 'texto em itálico' : format === 'underline' ? 'texto sublinhado' : format === 'strike' ? 'texto tachado' : 'texto destacado';
    const value = selectedText || fallback;
    return replaceSelection(text, safeSelection, `${marker}${value}${marker}`, marker.length, marker.length + value.length);
  }

  const values = (selectedText || (format === 'bullet-list' ? 'Novo item da lista' : 'Novo item numerado'))
    .split('\n');
  const formatted = values.map((line, index) => {
    const clean = line.replace(/^\s*(?:•|-|\d+\.)\s*/, '').trim();
    if (!clean) return '';
    return format === 'bullet-list' ? `• ${clean}` : `${index + 1}. ${clean}`;
  }).join('\n');

  return replaceSelection(text, safeSelection, formatted, 0, formatted.length);
}
