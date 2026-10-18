import { useEffect, useRef } from 'react';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { buildScrapeScript } from '@/lib/academic-import';

export type AcademicImportWebViewProps = {
  /** Incrementar este número força uma nova captura na página atual. */
  captureSignal: number;
  onLoadProgress?: (progress: number) => void;
  onMessage: (raw: string) => void;
  onNavigate?: (url: string) => void;
  reloadKey: number;
  url: string;
};

/**
 * Navegador de verdade (cookies da sessão, login, redirecionamentos) com uma
 * injeção de leitura ao terminar cada página. A usuária continua vendo o site
 * oficial — o app só lê o DOM quando ela pede ou quando a página carrega.
 */
export function AcademicImportWebView({
  captureSignal,
  onLoadProgress,
  onMessage,
  onNavigate,
  reloadKey,
  url,
}: AcademicImportWebViewProps) {
  const ref = useRef<WebView | null>(null);

  useEffect(() => {
    if (captureSignal <= 0) return;
    ref.current?.injectJavaScript(buildScrapeScript());
  }, [captureSignal]);

  const capture = () => ref.current?.injectJavaScript(buildScrapeScript());

  return (
    <WebView
      key={reloadKey}
      ref={ref}
      allowsBackForwardNavigationGestures
      domStorageEnabled
      javaScriptEnabled
      onLoadEnd={capture}
      onLoadProgress={event => onLoadProgress?.(event.nativeEvent.progress)}
      onMessage={(event: WebViewMessageEvent) => onMessage(event.nativeEvent.data)}
      onNavigationStateChange={state => onNavigate?.(state.url)}
      originWhitelist={['*']}
      setSupportMultipleWindows={false}
      sharedCookiesEnabled
      source={{ uri: url }}
      style={{ backgroundColor: '#FFFFFF', flex: 1 }}
      thirdPartyCookiesEnabled
    />
  );
}
