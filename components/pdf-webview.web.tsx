import { createElement, useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import type { PdfViewerTheme } from '@/lib/pdf-viewer-html';
import { normalizePdfUri, pdfSourceKind } from '@/lib/pdf-source';

export type PdfWebViewProps = {
  height?: number;
  onCopy?: (text: string) => void;
  onDocumentText?: (text: string, meta: { pages: number; truncated: boolean }) => void;
  onError?: (message: string) => void;
  onPageText?: (page: number, pages: number, text: string) => void;
  theme: PdfViewerTheme;
  uri: string;
};

/** `data:` em iframe é bloqueado pelo Chrome; um blob URL abre no visualizador nativo. */
function dataUriToBlobUrl(dataUri: string): string | null {
  const comma = dataUri.indexOf(',');
  if (comma < 0) return null;
  const meta = dataUri.slice(0, comma);
  const body = dataUri.slice(comma + 1);
  let bytes: Uint8Array;
  if (/;base64/i.test(meta)) {
    const binary = atob(body.replace(/\s+/g, ''));
    bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  } else {
    bytes = new TextEncoder().encode(decodeURIComponent(body));
  }
  // `BlobPart` pede um ArrayBuffer "puro": copiamos os bytes para um buffer novo.
  const buffer = new ArrayBuffer(bytes.length);
  new Uint8Array(buffer).set(bytes);
  return URL.createObjectURL(new Blob([buffer], { type: 'application/pdf' }));
}

/**
 * No navegador o PDF é aberto pelo visualizador nativo (Chrome/Firefox/Edge),
 * que já oferece seleção e cópia de texto. A extração automática para flashcards
 * roda no app (Android/iOS), onde o PDF.js está embutido na WebView.
 */
export function PdfWebView({ height = 440, onError, theme, uri }: PdfWebViewProps) {
  const [src, setSrc] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const normalized = normalizePdfUri(uri);
    if (pdfSourceKind(normalized) === 'invalid') {
      const detail = 'Arquivo inválido. Importe o PDF novamente pela Biblioteca.';
      setMessage(detail);
      onError?.(detail);
      setSrc(null);
      return;
    }
    if (normalized.startsWith('data:')) {
      const blob = dataUriToBlobUrl(normalized);
      if (!blob) {
        const detail = 'Não foi possível preparar o PDF para o navegador.';
        setMessage(detail);
        onError?.(detail);
        return;
      }
      setSrc(blob);
      return () => URL.revokeObjectURL(blob);
    }
    setMessage('');
    setSrc(normalized);
  }, [onError, uri]);

  return (
    <View style={{ backgroundColor: theme.surface, borderRadius: 16, height, overflow: 'hidden' }}>
      {src
        ? createElement('iframe', {
            src,
            title: 'Leitor de PDF',
            style: { border: 'none', height: '100%', width: '100%' },
          })
        : (
          <View style={{ alignItems: 'center', flex: 1, justifyContent: 'center', padding: 20 }}>
            <Text style={{ color: theme.muted, fontSize: 13, textAlign: 'center' }}>
              {message || 'Preparando o PDF…'}
            </Text>
          </View>
        )}
    </View>
  );
}
