import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import * as FileSystem from 'expo-file-system/legacy';

import { buildPdfViewerHtml, type PdfViewerTheme } from '@/lib/pdf-viewer-html';
import {
  PDFJS_BASE_URL,
  PDF_LOCAL_SIZE_LIMIT,
  buildPdfSourceInjection,
  clampPdfText,
  googleDocsViewerUrl,
  isGoogleViewerEligible,
  normalizePdfUri,
  parsePdfViewerMessage,
  pdfSourceKind,
} from '@/lib/pdf-source';

export type PdfWebViewProps = {
  height?: number;
  /** Texto de cada página desenhada (para copiar e para o painel lateral). */
  onCopy?: (text: string) => void;
  onDocumentText?: (text: string, meta: { pages: number; truncated: boolean }) => void;
  onError?: (message: string) => void;
  onPageText?: (page: number, pages: number, text: string) => void;
  theme: PdfViewerTheme;
  uri: string;
};

/**
 * Lê o PDF como data URI. A WebView nunca busca o arquivo na rede: baixamos
 * (quando remoto) e entregamos os bytes prontos ao PDF.js. Isso evita CORS do
 * servidor da faculdade e faz o documento abrir até sem internet depois.
 */
async function readAsDataUri(uri: string): Promise<string> {
  const info = (await FileSystem.getInfoAsync(uri)) as { size?: number };
  const size = typeof info.size === 'number' ? info.size : 0;
  if (size > PDF_LOCAL_SIZE_LIMIT) {
    throw new Error(
      `Este PDF tem ${(size / (1024 * 1024)).toFixed(1)} MB e passa do limite de ${Math.round(
        PDF_LOCAL_SIZE_LIMIT / (1024 * 1024),
      )} MB para leitura com seleção de texto.`,
    );
  }
  const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
  if (!base64) throw new Error('Não foi possível ler o arquivo do PDF.');
  return `data:application/pdf;base64,${base64}`;
}

export function PdfWebView({
  height = 440,
  onCopy,
  onDocumentText,
  onError,
  onPageText,
  theme,
  uri,
}: PdfWebViewProps) {
  const [payload, setPayload] = useState<string | null>(null);
  const [status, setStatus] = useState<'preparing' | 'ready' | 'error'>('preparing');
  const [message, setMessage] = useState('');
  const [mode, setMode] = useState<'text' | 'docs'>('text');
  const [attempt, setAttempt] = useState(0);
  const eligibleForGoogle = isGoogleViewerEligible(uri);
  const html = useMemo(() => buildPdfViewerHtml({ googleUrl: eligibleForGoogle ? uri : null, theme }), [eligibleForGoogle, theme, uri]);
  const injection = useMemo(() => (payload ? buildPdfSourceInjection(payload) : 'true;'), [payload]);
  /** `source` estável: um objeto novo a cada render pode recarregar a WebView. */
  const source = useMemo(() => ({ baseUrl: PDFJS_BASE_URL, html }), [html]);
  /**
   * Callbacks do chamador não entram nas dependências do efeito de carga: se a
   * tela passar uma arrow nova a cada render, o PDF seria lido de novo em loop.
   */
  const errorRef = useRef(onError);
  errorRef.current = onError;

  useEffect(() => {
    let active = true;
    setStatus('preparing');
    setMessage('');
    setPayload(null);
    (async () => {
      try {
        const normalized = normalizePdfUri(uri);
        const kind = pdfSourceKind(normalized);
        if (kind === 'invalid') throw new Error('Arquivo inválido. Importe o PDF novamente pela Biblioteca.');
        let dataUri = normalized;
        if (kind === 'remote') {
          const directory = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
          if (!directory) throw new Error('Armazenamento temporário indisponível neste dispositivo.');
          const target = `${directory}pdf-${Date.now()}.pdf`;
          const downloaded = await FileSystem.downloadAsync(normalized, target);
          dataUri = await readAsDataUri(downloaded.uri);
        } else if (kind === 'local') {
          dataUri = await readAsDataUri(normalized);
        }
        if (!active) return;
        setPayload(dataUri);
      } catch (error) {
        if (!active) return;
        const detail = error instanceof Error ? error.message : 'Não foi possível abrir o arquivo.';
        setStatus('error');
        setMessage(detail);
        errorRef.current?.(detail);
      }
    })();
    return () => {
      active = false;
    };
  }, [attempt, uri]);

  const handleMessage = useCallback(
    (event: WebViewMessageEvent) => {
      const parsed = parsePdfViewerMessage(event.nativeEvent.data);
      if (!parsed) return;
      if (parsed.type === 'ready') {
        setStatus('ready');
        setMessage('');
        return;
      }
      if (parsed.type === 'page') {
        onPageText?.(parsed.page, parsed.pages, parsed.text);
        return;
      }
      if (parsed.type === 'document') {
        onDocumentText?.(clampPdfText(parsed.text), { pages: parsed.pages, truncated: parsed.truncated });
        return;
      }
      if (parsed.type === 'copy') {
        if (parsed.text.trim()) onCopy?.(parsed.text);
        return;
      }
      if (parsed.type === 'external') {
        if (parsed.url) setMode('docs');
        return;
      }
      if (parsed.type === 'error') {
        setStatus('error');
        setMessage(parsed.message);
        onError?.(parsed.message);
      }
    },
    [onCopy, onDocumentText, onError, onPageText],
  );

  const retry = () => {
    setMode('text');
    setAttempt(value => value + 1);
  };

  if (mode === 'docs') {
    return (
      <View style={[styles.host, { backgroundColor: theme.surface, height }]}>
        <WebView
          allowsLinkPreview={false}
          domStorageEnabled
          javaScriptEnabled
          mixedContentMode="compatibility"
          originWhitelist={['*']}
          setSupportMultipleWindows={false}
          source={{ uri: googleDocsViewerUrl(uri) }}
          startInLoadingState
          style={{ backgroundColor: theme.surface, flex: 1 }}
          renderLoading={() => (
            <View style={[styles.center, { backgroundColor: theme.surface }]}>
              <ActivityIndicator color={theme.primary} />
              <Text style={[styles.hint, { color: theme.muted }]}>Abrindo pelo Google Docs Viewer…</Text>
            </View>
          )}
        />
        <Pressable accessibilityRole="button" onPress={retry} style={[styles.footer, { borderTopColor: theme.border }]}>
          <Text style={[styles.footerLabel, { color: theme.primary }]}>Voltar ao leitor com seleção de texto</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.host, { backgroundColor: theme.surface, height }]}>
      {payload ? (
        <WebView
          allowsLinkPreview={false}
          domStorageEnabled
          injectedJavaScriptBeforeContentLoaded={injection}
          javaScriptEnabled
          mixedContentMode="compatibility"
          onError={() => {
            setStatus('error');
            setMessage('A WebView não conseguiu carregar o leitor.');
          }}
          onHttpError={() => {
            setStatus('error');
            setMessage('Sem conexão para carregar o leitor PDF.js.');
          }}
          onMessage={handleMessage}
          originWhitelist={['*']}
          setSupportMultipleWindows={false}
          source={source}
          style={{ backgroundColor: theme.surface, flex: 1 }}
        />
      ) : null}
      {status === 'preparing' ? (
        <View style={[styles.overlay, { backgroundColor: theme.surface }]}>
          <ActivityIndicator color={theme.primary} />
          <Text style={[styles.hint, { color: theme.muted }]}>Preparando o PDF para seleção de texto…</Text>
        </View>
      ) : null}
      {status === 'error' ? (
        <View style={[styles.overlay, { backgroundColor: theme.surface }]}>
          <Text style={[styles.errorTitle, { color: theme.ink }]}>Não foi possível abrir este PDF</Text>
          <Text style={[styles.hint, { color: theme.muted }]}>{message}</Text>
          <View style={styles.actions}>
            <Pressable accessibilityRole="button" onPress={retry} style={[styles.action, { borderColor: theme.border }]}>
              <Text style={[styles.actionLabel, { color: theme.ink }]}>Tentar novamente</Text>
            </Pressable>
            {eligibleForGoogle ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => setMode('docs')}
                style={[styles.action, { backgroundColor: theme.primary, borderColor: theme.primary }]}
              >
                <Text style={[styles.actionLabel, { color: '#FFFFFF' }]}>Abrir no Google Docs</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  action: { borderRadius: 11, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10 },
  actionLabel: { fontSize: 13, fontWeight: '700' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, justifyContent: 'center', marginTop: 6 },
  center: { alignItems: 'center', flex: 1, gap: 10, justifyContent: 'center' },
  errorTitle: { fontSize: 15, fontWeight: '800', textAlign: 'center' },
  footer: { alignItems: 'center', borderTopWidth: 1, paddingVertical: 10 },
  footerLabel: { fontSize: 12, fontWeight: '700' },
  hint: { fontSize: 12, lineHeight: 18, maxWidth: 330, textAlign: 'center' },
  host: { borderRadius: 16, overflow: 'hidden' },
  overlay: {
    alignItems: 'center',
    bottom: 0,
    gap: 10,
    justifyContent: 'center',
    left: 0,
    padding: 22,
    position: 'absolute',
    right: 0,
    top: 0,
  },
});
