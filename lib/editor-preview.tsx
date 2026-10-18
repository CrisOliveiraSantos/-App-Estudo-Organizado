/**
 * Renderizador do modo de leitura do editor.
 *
 * Fica em um arquivo `.tsx` (e não em `editor-formatting.ts`) porque devolve
 * elementos React Native: o parser puro continua testável em Node, e a
 * renderização usa `<Text>` aninhado para negrito, itálico, sublinhado,
 * tachado e destaque — sem mostrar os marcadores (`**`, `_`, `__`, `~~`, `==`).
 */
import { StyleSheet, Text, View, type StyleProp, type TextStyle } from 'react-native';

import { parsePreviewBlocks, type InlineSegment, type PreviewBlock } from './editor-formatting';

export type FormattedTextOptions = {
  /** Texto exibido quando o documento está vazio. */
  emptyLabel?: string;
  fontSize?: number;
  textColor?: string;
};

const HIGHLIGHT_TEXT = '#1B2235';

function segmentStyle(segment: InlineSegment): StyleProp<TextStyle> {
  const decorations: ('underline' | 'line-through')[] = [];
  if (segment.underline) decorations.push('underline');
  if (segment.strike) decorations.push('line-through');

  return {
    ...(segment.bold ? { fontWeight: '700' as const } : null),
    ...(segment.italic ? { fontStyle: 'italic' as const } : null),
    ...(segment.highlight ? { backgroundColor: '#FFE58A', color: HIGHLIGHT_TEXT } : null),
    ...(decorations.length
      ? { textDecorationLine: decorations.join(' ') as 'underline' | 'line-through' | 'underline line-through' }
      : null),
  };
}

function InlineSegments({ segments }: { segments: InlineSegment[] }) {
  return (
    <>
      {segments.map((segment, index) => (
        <Text key={`segment-${index}`} style={segmentStyle(segment)}>
          {segment.text}
        </Text>
      ))}
    </>
  );
}

function FormattedBlock({
  block,
  fontSize,
  lineHeight,
  textColor,
}: {
  block: PreviewBlock;
  fontSize: number;
  lineHeight: number;
  textColor: string;
}) {
  if (!block.segments.length) return <View style={styles.blank} />;

  if (block.type === 'heading') {
    return (
      <Text
        style={[
          styles.heading,
          { color: textColor, fontSize: fontSize + 6, lineHeight: Math.round((fontSize + 6) * 1.35) },
        ]}
      >
        <InlineSegments segments={block.segments} />
      </Text>
    );
  }

  if (block.type === 'bullet' || block.type === 'numbered') {
    return (
      <View style={styles.listRow}>
        <Text style={[styles.marker, { fontSize, lineHeight }]}>
          {block.type === 'bullet' ? '•' : `${block.index}.`}
        </Text>
        <Text style={[styles.text, { color: textColor, fontSize, lineHeight }]}>
          <InlineSegments segments={block.segments} />
        </Text>
      </View>
    );
  }

  return (
    <Text style={[styles.text, { color: textColor, fontSize, lineHeight }]}>
      <InlineSegments segments={block.segments} />
    </Text>
  );
}

/**
 * Converte o texto com marcação em elementos prontos para exibição.
 * `**texto**` → negrito, `_texto_` → itálico, `__texto__` → sublinhado,
 * `~~texto~~` → tachado, `==texto==` → destaque, `• ` / `1. ` → listas.
 */
export function renderFormattedText(text: string, options: FormattedTextOptions = {}) {
  const blocks = parsePreviewBlocks(text);
  const fontSize = options.fontSize ?? 16;
  const lineHeight = Math.round(fontSize * 1.58);
  const textColor = options.textColor ?? HIGHLIGHT_TEXT;

  if (!blocks.length) {
    return (
      <Text style={styles.empty}>
        {options.emptyLabel ?? 'Nada para visualizar ainda. Volte ao modo de edição e comece a escrever.'}
      </Text>
    );
  }

  return (
    <View accessibilityLabel="Documento formatado" style={styles.document}>
      {blocks.map((block, index) => (
        <FormattedBlock
          key={`block-${index}`}
          block={block}
          fontSize={fontSize}
          lineHeight={lineHeight}
          textColor={textColor}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  blank: { height: 9 },
  document: { paddingBottom: 6 },
  empty: { color: '#6B7280', fontSize: 14, lineHeight: 21, paddingVertical: 22 },
  heading: { fontWeight: '900', marginBottom: 2, marginTop: 6 },
  listRow: { flexDirection: 'row', gap: 6 },
  marker: { color: '#4F46E5', fontWeight: '900' },
  text: { includeFontPadding: false },
});
