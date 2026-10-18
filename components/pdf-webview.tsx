/**
 * Resolve para `pdf-viewer-host.tsx` no app (Android/iOS) e para
 * `pdf-webview.web.tsx` no navegador. Este arquivo existe para o TypeScript
 * enxergar a implementação nativa (o Metro escolhe a plataforma em runtime).
 */
export { PdfWebView, type PdfWebViewProps } from './pdf-viewer-host';
