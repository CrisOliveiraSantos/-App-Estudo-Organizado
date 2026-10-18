import { useEffect, useImperativeHandle, useRef, type CSSProperties, type FormEvent } from 'react';
import { StyleSheet, View } from 'react-native';

import { academicColors } from './academic/design-system';
import type {
  RichTextCommand,
  RichTextEditorHandle,
  RichTextEditorProps,
} from './rich-text-editor.types';

const EDITOR_CSS = `
  .estudo-rich-editor:empty:before {
    content: attr(data-placeholder);
    color: #8C95AA;
    pointer-events: none;
  }
  .estudo-rich-editor p, .estudo-rich-editor div { margin: 0 0 10px; }
  .estudo-rich-editor ul, .estudo-rich-editor ol { margin: 8px 0; padding-left: 24px; }
  .estudo-rich-editor h2 { font-size: 1.35em; margin: 14px 0 8px; }
  .estudo-rich-editor blockquote { border-left: 3px solid #6C5CE7; margin: 10px 0; padding-left: 11px; color: #4B5563; }
  .estudo-rich-editor pre { background: #1A2030; border-radius: 8px; color: #E5E7F2; padding: 11px; white-space: pre-wrap; }
`;

/**
 * Alternativa da web: `react-native-webview` não existe no navegador, então o
 * editor usa `contentEditable` com os mesmos comandos (`bold`, listas, título,
 * desfazer…). O conteúdo continua sendo HTML, igual ao gravado no Android/iOS.
 */
export function RichTextEditor({
  documentKey,
  initialHtml,
  placeholder = 'Escreva, cole e organize seu conhecimento…',
  fontSize = 16,
  onChange,
  onReady,
  editorRef,
}: RichTextEditorProps) {
  const host = useRef<HTMLDivElement | null>(null);

  const emit = () => {
    if (host.current) onChange(host.current.innerHTML);
  };

  const runCommand = (command: RichTextCommand) => {
    const element = host.current;
    if (!element) return;
    element.focus();
    const exec = (name: string, value?: string) => document.execCommand(name, false, value);
    switch (command) {
      case 'bold':
        exec('bold');
        break;
      case 'italic':
        exec('italic');
        break;
      case 'underline':
        exec('underline');
        break;
      case 'strike':
        exec('strikeThrough');
        break;
      case 'highlight':
        exec('styleWithCSS', 'true');
        exec('hiliteColor', '#FFE58A');
        break;
      case 'bullet-list':
        exec('insertUnorderedList');
        break;
      case 'numbered-list':
        exec('insertOrderedList');
        break;
      case 'heading':
        exec('formatBlock', '<h2>');
        break;
      case 'quote':
        exec('formatBlock', '<blockquote>');
        break;
      case 'code':
        exec('formatBlock', '<pre>');
        break;
      case 'undo':
        exec('undo');
        break;
      case 'redo':
        exec('redo');
        break;
      case 'clear':
        exec('removeFormat');
        break;
      default:
        break;
    }
    emit();
  };

  useImperativeHandle<RichTextEditorHandle | null, RichTextEditorHandle>(
    editorRef,
    () => ({
      focus: () => host.current?.focus(),
      getHtml: async () => host.current?.innerHTML ?? '',
      setHtml: (html: string) => {
        if (!host.current) return;
        host.current.innerHTML = html;
        onChange(html);
      },
      command: runCommand,
      setFontSize: (size: number) => {
        if (host.current) host.current.style.fontSize = `${size}px`;
      },
    }),
    // O handle acompanha o callback mais recente do documento.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onChange],
  );

  useEffect(() => {
    const element = host.current;
    if (!element) return;
    element.innerHTML = initialHtml;
    onReady?.();
    // `documentKey` identifica a troca de documento; `initialHtml` muda a cada
    // tecla e não pode reiniciar o editor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentKey]);

  useEffect(() => {
    if (host.current) host.current.style.fontSize = `${fontSize}px`;
  }, [fontSize]);

  const style: CSSProperties = {
    color: academicColors.ink,
    fontSize,
    lineHeight: 1.58,
    minHeight: 360,
    outline: 'none',
    overflowWrap: 'anywhere',
    padding: 0,
    width: '100%',
  };

  return (
    <View style={styles.host}>
      <style>{EDITOR_CSS}</style>
      <div
        ref={host}
        className="estudo-rich-editor"
        contentEditable
        data-placeholder={placeholder}
        onInput={(event: FormEvent<HTMLDivElement>) => onChange(event.currentTarget.innerHTML)}
        spellCheck
        style={style}
        suppressContentEditableWarning
      />
    </View>
  );
}

const styles = StyleSheet.create({
  host: { backgroundColor: '#FFFFFF', minHeight: 360, width: '100%' },
});
