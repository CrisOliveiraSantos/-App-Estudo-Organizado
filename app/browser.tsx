import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as FileSystem from 'expo-file-system/legacy';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { ScreenContainer } from '@/components/screen-container';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColors } from '@/hooks/use-colors';
import {
  buildMoodlePdfClickInterceptor,
  buildMoodlePdfDownloadScript,
  isMoodlePdfCandidate,
  moodlePdfBootstrapUrl,
  moodlePdfFileName,
  parseMoodlePdfMessage,
} from '@/lib/moodle-pdf';
import { useStudyActions } from '@/lib/study-store';

/**
 * Navegador interno para links de atividades/materiais do Moodle.
 *
 * A WebView usa os mesmos cookies da WebView de importação (`sharedCookiesEnabled`
 * + `thirdPartyCookiesEnabled`), então o link abre autenticado em vez de cair na
 * tela de login do Moodle no navegador externo.
 */
type PdfDownloadState = { fileName: string; received: number; total: number };

const PDF_CLICK_INTERCEPTOR = buildMoodlePdfClickInterceptor();

export default function BrowserScreen() {
  const params = useLocalSearchParams<{ url?: string; title?: string }>();
  const colors = useColors();
  const { addPdf } = useStudyActions();
  const webViewRef = useRef<WebView | null>(null);
  const chunksRef = useRef<string[]>([]);
  const activePdfRef = useRef<string | null>(null);
  const initialPdfStartedRef = useRef(false);
  const [loading, setLoading] = useState(true);
  const [download, setDownload] = useState<PdfDownloadState | null>(null);
  const [pdfError, setPdfError] = useState('');
  const [failedPdfUrl, setFailedPdfUrl] = useState('');
  const target = useMemo(() => {
    const raw = Array.isArray(params.url) ? params.url[0] : params.url;
    const value = (raw ?? '').trim();
    return /^https?:\/\//i.test(value) ? value : '';
  }, [params.url]);
  const title = (Array.isArray(params.title) ? params.title[0] : params.title) || 'Conteúdo do Moodle';
  /**
   * Atividade que já é um PDF (link direto do pluginfile): a WebView carrega a
   * raiz do mesmo domínio só para obter origem + cookies, e o download começa
   * quando essa página termina de carregar.
   */
  const directPdfTarget = useMemo(() => (isMoodlePdfCandidate(target) ? target : ''), [target]);
  const bootstrapUrl = directPdfTarget ? moodlePdfBootstrapUrl(directPdfTarget) : '';
  const source = useMemo(() => ({ uri: bootstrapUrl || target }), [bootstrapUrl, target]);

  useEffect(() => {
    if (!target) return;
    setLoading(true);
    /** Rede de segurança: um PDF/download pode nunca disparar `onLoadEnd`. */
    const timer = setTimeout(() => setLoading(false), 15000);
    return () => clearTimeout(timer);
  }, [target]);

  const openExternal = (url = target) => {
    if (url) void Linking.openURL(url).catch(() => undefined);
  };

  const startPdfDownload = useCallback(
    (rawUrl: string) => {
      let normalized = '';
      try {
        normalized = new URL(rawUrl).href;
      } catch {
        normalized = '';
      }
      if (!isMoodlePdfCandidate(normalized) || activePdfRef.current) return;
      if (!webViewRef.current) {
        setPdfError('O navegador ainda não terminou de carregar. Tente tocar no link novamente.');
        return;
      }
      activePdfRef.current = normalized;
      chunksRef.current = [];
      setFailedPdfUrl('');
      setPdfError('');
      setDownload({ fileName: moodlePdfFileName(normalized, title), received: 0, total: 0 });
      try {
        webViewRef.current.injectJavaScript(buildMoodlePdfDownloadScript(normalized));
      } catch {
        activePdfRef.current = null;
        setDownload(null);
        setPdfError('A página do Moodle foi fechada antes do download. Abra a atividade novamente.');
      }
    },
    [title],
  );

  const handleMessage = useCallback(
    async (event: WebViewMessageEvent) => {
      const message = parseMoodlePdfMessage(event.nativeEvent.data);
      if (!message) return;
      if (message.type === 'request') {
        startPdfDownload(message.url);
        return;
      }
      if (message.type === 'start') {
        setDownload(current => (current ? { ...current, received: 0, total: message.size } : current));
        return;
      }
      if (message.type === 'chunk') {
        if (!activePdfRef.current) return;
        chunksRef.current.push(message.data);
        const bytes = Math.floor((message.data.length * 3) / 4);
        setDownload(current =>
          current
            ? { ...current, received: current.total ? Math.min(current.total, current.received + bytes) : current.received + bytes }
            : current,
        );
        return;
      }
      if (message.type === 'error') {
        const failed = activePdfRef.current;
        activePdfRef.current = null;
        chunksRef.current = [];
        setDownload(null);
        setFailedPdfUrl(failed ?? target);
        setPdfError(message.message);
        return;
      }
      if (message.type !== 'end' || !activePdfRef.current) return;

      const pdfUrl = activePdfRef.current;
      activePdfRef.current = null;
      try {
        const base64 = chunksRef.current.join('');
        chunksRef.current = [];
        if (!base64) throw new Error('O Moodle enviou o PDF vazio. Tente novamente.');
        const directory = FileSystem.documentDirectory ?? FileSystem.cacheDirectory;
        if (!directory) throw new Error('O armazenamento do aparelho não está disponível.');
        const fileName = moodlePdfFileName(pdfUrl, title);
        const destination = `${directory}moodle-${Date.now()}-${fileName}`;
        await FileSystem.writeAsStringAsync(destination, base64, { encoding: FileSystem.EncodingType.Base64 });
        const noteId = addPdf(fileName, destination);
        setDownload(null);
        const destinationRoute = { pathname: '/pdf', params: { id: noteId } } as const;
        if (directPdfTarget) router.replace(destinationRoute);
        else router.push(destinationRoute);
      } catch (error) {
        chunksRef.current = [];
        setDownload(null);
        setFailedPdfUrl(pdfUrl);
        setPdfError(error instanceof Error ? error.message : 'Não foi possível salvar o PDF no aparelho.');
      }
    },
    [addPdf, directPdfTarget, startPdfDownload, target, title],
  );

  const handleLoadEnd = () => {
    setLoading(false);
    if (!directPdfTarget || initialPdfStartedRef.current) return;
    initialPdfStartedRef.current = true;
    startPdfDownload(directPdfTarget);
  };

  const progress = download?.total ? Math.min(100, Math.round((download.received / download.total) * 100)) : 0;

  return (
    <ScreenContainer edges={['top', 'bottom', 'left', 'right']}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Voltar" onPress={() => router.back()} style={styles.back}>
          <IconSymbol name="arrow.backward" size={21} color={colors.foreground} />
          <Text style={[styles.backLabel, { color: colors.foreground }]}>Voltar</Text>
        </Pressable>
        <View style={styles.headerCopy}>
          <Text numberOfLines={1} style={[styles.title, { color: colors.foreground }]}>{title}</Text>
          <Text numberOfLines={1} style={[styles.subtitle, { color: colors.muted }]}>Moodle · sessão do app</Text>
        </View>
        <Pressable accessibilityRole="link" accessibilityLabel="Abrir no navegador externo" onPress={() => openExternal()} style={styles.external}>
          <Text style={[styles.externalText, { color: colors.primary }]}>Abrir fora</Text>
        </Pressable>
      </View>

      {target ? (
        <View style={styles.viewer}>
          <WebView
            ref={webViewRef}
            domStorageEnabled
            injectedJavaScriptBeforeContentLoaded={PDF_CLICK_INTERCEPTOR}
            javaScriptEnabled
            onError={() => setLoading(false)}
            onHttpError={() => setLoading(false)}
            onLoadEnd={handleLoadEnd}
            onLoadStart={() => setLoading(true)}
            onMessage={event => {
              void handleMessage(event);
            }}
            onOpenWindow={event => {
              const url = event.nativeEvent.targetUrl;
              if (isMoodlePdfCandidate(url)) startPdfDownload(url);
            }}
            onShouldStartLoadWithRequest={request => {
              if (isMoodlePdfCandidate(request.url)) {
                startPdfDownload(request.url);
                return false;
              }
              return true;
            }}
            originWhitelist={['*']}
            setSupportMultipleWindows={false}
            sharedCookiesEnabled
            source={source}
            style={{ backgroundColor: colors.background, flex: 1 }}
            thirdPartyCookiesEnabled
          />
          {loading && !download && !pdfError ? (
            <View pointerEvents="none" style={[styles.loading, { backgroundColor: colors.background }]}>
              <ActivityIndicator color={colors.primary} size="large" />
              <Text style={[styles.loadingText, { color: colors.muted }]}>Abrindo o conteúdo…</Text>
            </View>
          ) : null}
          {download ? (
            <View style={[styles.pdfOverlay, { backgroundColor: `${colors.background}F2` }]}>
              <View style={[styles.pdfCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <ActivityIndicator color={colors.primary} size="large" />
                <Text style={[styles.pdfTitle, { color: colors.foreground }]}>Preparando o PDF…</Text>
                <Text numberOfLines={2} style={[styles.pdfName, { color: colors.muted }]}>
                  {download.fileName}
                </Text>
                <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
                  <View
                    style={[
                      styles.progressFill,
                      { backgroundColor: colors.primary, width: `${progress}%` as `${number}%` },
                    ]}
                  />
                </View>
                <Text style={[styles.pdfProgress, { color: colors.primary }]}>
                  {download.total
                    ? `${progress}% · ${(download.received / (1024 * 1024)).toFixed(1)} de ${(
                        download.total /
                        (1024 * 1024)
                      ).toFixed(1)} MB`
                    : 'Conectando à sessão do Moodle…'}
                </Text>
                <Text style={[styles.pdfHint, { color: colors.muted }]}>
                  O arquivo é baixado com os cookies da sessão e abre no leitor interno com texto selecionável.
                </Text>
              </View>
            </View>
          ) : null}
          {pdfError ? (
            <View style={[styles.pdfOverlay, { backgroundColor: `${colors.background}F2` }]}>
              <View style={[styles.pdfCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.pdfTitle, { color: colors.foreground }]}>Não foi possível abrir o PDF</Text>
                <Text style={[styles.pdfHint, { color: colors.muted }]}>{pdfError}</Text>
                <View style={styles.pdfActions}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setPdfError('')}
                    style={[styles.pdfAction, { borderColor: colors.border }]}
                  >
                    <Text style={[styles.pdfActionLabel, { color: colors.foreground }]}>Fechar</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="link"
                    onPress={() => openExternal(failedPdfUrl || target)}
                    style={[styles.pdfAction, { backgroundColor: colors.primary, borderColor: colors.primary }]}
                  >
                    <Text style={[styles.pdfActionLabel, styles.pdfActionPrimary]}>Abrir fora</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          ) : null}
        </View>
      ) : (
        <View style={styles.empty}>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Link inválido</Text>
          <Text style={[styles.emptyText, { color: colors.muted }]}>
            Esta atividade não tem um endereço HTTP válido para abrir.
          </Text>
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  back: { alignItems: 'center', flexDirection: 'row', gap: 4, paddingRight: 4, paddingVertical: 6 },
  backLabel: { fontSize: 13, fontWeight: '700' },
  empty: { alignItems: 'center', flex: 1, gap: 8, justifyContent: 'center', padding: 24 },
  emptyText: { fontSize: 12, lineHeight: 18, maxWidth: 320, textAlign: 'center' },
  emptyTitle: { fontSize: 16, fontWeight: '800' },
  external: { justifyContent: 'center', minHeight: 38, paddingHorizontal: 8 },
  externalText: { fontSize: 12, fontWeight: '800' },
  header: { alignItems: 'center', borderBottomWidth: 1, flexDirection: 'row', gap: 8, paddingHorizontal: 14, paddingVertical: 10 },
  headerCopy: { flex: 1 },
  loading: { alignItems: 'center', bottom: 0, gap: 10, justifyContent: 'center', left: 0, position: 'absolute', right: 0, top: 0 },
  loadingText: { fontSize: 12, fontWeight: '700' },
  pdfAction: {
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 40,
    minWidth: 108,
    paddingHorizontal: 14,
  },
  pdfActionLabel: { fontSize: 13, fontWeight: '800' },
  pdfActionPrimary: { color: '#FFFFFF' },
  pdfActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, justifyContent: 'center', marginTop: 4 },
  pdfCard: {
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1,
    gap: 10,
    maxWidth: 360,
    padding: 18,
    width: '100%',
  },
  pdfHint: { fontSize: 11, lineHeight: 17, textAlign: 'center' },
  pdfName: { fontSize: 12, lineHeight: 17, textAlign: 'center' },
  pdfOverlay: {
    alignItems: 'center',
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    padding: 22,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 5,
  },
  pdfProgress: { fontSize: 12, fontWeight: '800' },
  pdfTitle: { fontSize: 16, fontWeight: '800', textAlign: 'center' },
  progressFill: { borderRadius: 999, height: '100%' },
  progressTrack: { borderRadius: 999, height: 7, marginTop: 2, overflow: 'hidden', width: '100%' },
  subtitle: { fontSize: 11, marginTop: 3 },
  title: { fontSize: 15, fontWeight: '800' },
  viewer: { flex: 1 },
});
