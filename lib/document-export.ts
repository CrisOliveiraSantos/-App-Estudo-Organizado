import { Platform, Share } from 'react-native';
import { buildPlainTextDocument, documentTextFilename, type ExportableDocument } from './document-export-utils';

export { buildPlainTextDocument, documentTextFilename, type ExportableDocument } from './document-export-utils';

export async function exportTextDocument(document: ExportableDocument) {
  const text = buildPlainTextDocument(document);
  if (Platform.OS !== 'web' || typeof window === 'undefined' || typeof globalThis.document === 'undefined') {
    await Share.share({ title: document.title || 'Documento', message: text });
    return { mode: 'share' as const, message: 'O conteúdo foi enviado para o compartilhamento do dispositivo.' };
  }
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = window.URL.createObjectURL(blob);
  const link = window.document.createElement('a');
  link.href = url;
  link.download = documentTextFilename(document.title);
  link.style.display = 'none';
  window.document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => window.URL.revokeObjectURL(url), 0);
  return { mode: 'download' as const, message: 'O arquivo de texto foi baixado no seu dispositivo.' };
}

export async function shareTextDocument(document: ExportableDocument) {
  const text = buildPlainTextDocument(document);
  if (Platform.OS === 'web') {
    const browserNavigator = typeof navigator === 'undefined' ? undefined : navigator as Navigator & { share?: (data: { title?: string; text?: string }) => Promise<void> };
    if (!browserNavigator?.share) return { available: false, message: 'O compartilhamento não está disponível neste navegador. Use Exportar .txt.' };
    await browserNavigator.share({ title: document.title || 'Documento', text });
    return { available: true, message: 'A janela de compartilhamento foi aberta.' };
  }
  await Share.share({ title: document.title || 'Documento', message: text });
  return { available: true, message: 'A janela de compartilhamento foi aberta.' };
}
