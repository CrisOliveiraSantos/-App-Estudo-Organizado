import { useImperativeHandle, useRef } from 'react';
import { StyleSheet } from 'react-native';
import { RichEditor, actions } from 'react-native-pell-rich-editor';

import { academicColors } from './academic/design-system';
import type {
  RichTextCommand,
  RichTextEditorHandle,
  RichTextEditorProps,
} from './rich-text-editor.types';

/**
 * `react-native-pell-rich-editor` 1.10 envia comandos com dois argumentos:
 * o tipo da ação e o nome do método (`'result'`). É o mesmo caminho usado pela
 * `RichToolbar` da biblioteca — por isso os botões nativos do app preservam a
 * seleção do texto dentro do WebView.
 */
const COMMANDS: Partial<Record<RichTextCommand, string>> = {
  bold: actions.setBold,
  italic: actions.setItalic,
  underline: actions.setUnderline,
  strike: actions.setStrikethrough,
  'bullet-list': actions.insertBulletsList,
  'numbered-list': actions.insertOrderedList,
  heading: actions.heading2,
  quote: actions.blockquote,
  code: actions.code,
  undo: actions.undo,
  redo: actions.redo,
  clear: actions.removeFormat,
};

/** O editor espera 1–7; o app usa pixels no controle A−/A+. */
function toEditorFontSize(size: number): 2 | 3 | 4 | 5 {
  if (size <= 14) return 2;
  if (size <= 17) return 3;
  if (size <= 20) return 4;
  return 5;
}

const EDITOR_STYLE = {
  backgroundColor: '#FFFFFF',
  color: academicColors.ink,
  caretColor: academicColors.indigo,
  placeholderColor: '#8C95AA',
  contentCSSText: 'font-size: 16px; line-height: 1.58; padding: 0;',
};

export function RichTextEditor({
  documentKey,
  initialHtml,
  placeholder = 'Escreva, cole e organize seu conhecimento…',
  fontSize = 16,
  onChange,
  onReady,
  editorRef,
}: RichTextEditorProps) {
  const editor = useRef<RichEditor>(null);

  useImperativeHandle<RichTextEditorHandle | null, RichTextEditorHandle>(
    editorRef,
    () => ({
      focus: () => editor.current?.focusContentEditor(),
      getHtml: async () => {
        try {
          return (await editor.current?.getContentHtml()) ?? '';
        } catch {
          return '';
        }
      },
      setHtml: (html: string) => editor.current?.setContentHTML(html),
      command: (command: RichTextCommand) => {
        const current = editor.current;
        if (!current) return;
        if (command === 'highlight') {
          current.setHiliteColor('#FFE58A');
          return;
        }
        const action = COMMANDS[command];
        if (action) current.sendAction(action, 'result');
      },
      setFontSize: (size: number) => editor.current?.setFontSize(toEditorFontSize(size)),
    }),
    [],
  );

  return (
    <RichEditor
      ref={editor}
      autoCapitalize="sentences"
      autoCorrect
      firstFocusEnd={false}
      initialContentHTML={initialHtml}
      initialHeight={360}
      key={documentKey}
      onChange={onChange}
      editorInitializedCallback={onReady}
      editorStyle={EDITOR_STYLE}
      pasteAsPlainText={false}
      placeholder={placeholder}
      style={styles.editor}
      useContainer
    />
  );
}

const styles = StyleSheet.create({
  editor: { backgroundColor: '#FFFFFF', minHeight: 360, width: '100%' },
});
