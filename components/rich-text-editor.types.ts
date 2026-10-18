import type { RefObject } from 'react';

/**
 * Ações de formatação expostas pela interface do editor. O componente nativo
 * (`pell`) e o alternativo da web implementam exatamente as mesmas ações para
 * que `app/document.tsx` não precise de código por plataforma.
 */
export type RichTextCommand =
  | 'bold'
  | 'italic'
  | 'underline'
  | 'strike'
  | 'highlight'
  | 'bullet-list'
  | 'numbered-list'
  | 'heading'
  | 'quote'
  | 'code'
  | 'undo'
  | 'redo'
  | 'clear';

export type RichTextEditorHandle = {
  focus: () => void;
  getHtml: () => Promise<string>;
  setHtml: (html: string) => void;
  command: (command: RichTextCommand) => void;
  setFontSize: (size: number) => void;
};

export type RichTextEditorProps = {
  /** Troca de documento recarrega o HTML inicial sem resetar a digitação. */
  documentKey: string;
  initialHtml: string;
  placeholder?: string;
  fontSize?: number;
  onChange: (html: string) => void;
  onReady?: () => void;
  editorRef?: RefObject<RichTextEditorHandle | null>;
};
