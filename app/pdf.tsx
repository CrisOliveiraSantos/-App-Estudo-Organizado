import { useCallback, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as Clipboard from 'expo-clipboard';

import { ScreenContainer } from '@/components/screen-container';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { PdfWebView } from '@/components/pdf-webview';
import { useColors } from '@/hooks/use-colors';
import { pdfSourceKind } from '@/lib/pdf-source';
import { useStudy } from '@/lib/study-store';

/**
 * Leitor de PDF com seleção de texto.
 *
 * O antigo `react-native-pdf` desenhava a página como imagem: dava para ler,
 * nunca para selecionar, copiar ou extrair. Agora o arquivo abre numa WebView
 * com PDF.js (camada de texto por cima do canvas), o texto é copiado pelo app
 * e o documento inteiro é guardado em `note.pdfText` — é dele que saem os
 * flashcards.
 */
export default function PdfViewerScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { notes, setPdfText } = useStudy();
  const colors = useColors();
  const { height } = useWindowDimensions();
  const pdf = notes.find(note => note.id === id);
  const pages = pdf?.pdfPages ?? [];
  const [pageText, setPageText] = useState('');
  const [pageLabel, setPageLabel] = useState('');
  const [copyStatus, setCopyStatus] = useState('');

  const viewerHeight = Math.max(360, Math.min(620, Math.round(height * 0.56)));
  const theme = useMemo(
    () => ({
      background: colors.background,
      border: colors.border,
      ink: colors.foreground,
      muted: colors.muted,
      primary: colors.primary,
      surface: colors.surface,
    }),
    [colors],
  );

  const extracted = pdf?.pdfText ?? '';
  const pageFallback = pages[0]?.extractedText ?? pdf?.selectedText ?? '';
  const shownText = pageText || pageFallback || (extracted ? extracted.slice(0, 1600) : '');
  const hasViewer = Boolean(pdf?.uri) && pdfSourceKind(pdf?.uri) !== 'invalid';

  const handlePageText = useCallback((page: number, total: number, text: string) => {
    setPageText(text);
    setPageLabel(total ? `Página ${page} de ${total}` : '');
  }, []);

  const handleDocumentText = useCallback(
    (text: string) => {
      if (!id || !text) return;
      setPdfText(id, text);
    },
    [id, setPdfText],
  );

  const copy = useCallback(async (text: string) => {
    const value = text.trim();
    if (!value) {
      setCopyStatus('Nada para copiar nesta página.');
      return;
    }
    await Clipboard.setStringAsync(value);
    setCopyStatus(`Copiado: ${value.length.toLocaleString('pt-BR')} caracteres.`);
  }, []);

  return (
    <ScreenContainer edges={['top', 'bottom', 'left', 'right']}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.back}>
          <IconSymbol name="arrow.backward" size={21} color={colors.foreground} />
          <Text style={[styles.backLabel, { color: colors.foreground }]}>Voltar</Text>
        </Pressable>
        <View style={styles.headerCopy}>
          <Text numberOfLines={1} style={[styles.title, { color: colors.foreground }]}>
            {pdf?.title ?? 'Visualizador PDF'}
          </Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>
            {pageLabel || (pages.length ? `${pages.length} página(s)` : 'Selecione o texto com o dedo')}
          </Text>
        </View>
        {pdf ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push({ pathname: '/flashcards', params: { noteId: pdf.id } })}
            style={[styles.flashButton, { borderColor: colors.primary }]}
          >
            <IconSymbol name="doc.text.fill" size={15} color={colors.primary} />
            <Text style={[styles.flashLabel, { color: colors.primary }]}>Flashcards</Text>
          </Pressable>
        ) : null}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {hasViewer && pdf?.uri ? (
          <PdfWebView
            height={viewerHeight}
            onCopy={text => void copy(text)}
            onDocumentText={handleDocumentText}
            onPageText={handlePageText}
            theme={theme}
            uri={pdf.uri}
          />
        ) : pages[0]?.imageUri ? (
          <Image
            resizeMode="contain"
            source={{ uri: pages[0].imageUri }}
            style={{ borderRadius: 16, height: viewerHeight, width: '100%' }}
          />
        ) : (
          <View style={[styles.empty, { borderColor: colors.border, height: viewerHeight }]}>
            <IconSymbol name="doc.text.fill" size={46} color={colors.primary} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Sem arquivo para exibir</Text>
            <Text style={[styles.emptyBody, { color: colors.muted }]}>
              Este material não tem um PDF anexado. Importe o arquivo em Biblioteca → Importar PDF.
            </Text>
          </View>
        )}

        <View style={[styles.textCard, { backgroundColor: colors.lavender }]}>
          <View style={styles.textHeader}>
            <Text style={[styles.textTitle, { color: colors.primary }]}>{pageLabel || 'Texto do documento'}</Text>
            <Pressable accessibilityRole="button" onPress={() => void copy(shownText)}>
              <Text style={[styles.copyLabel, { color: colors.primary }]}>Copiar texto</Text>
            </Pressable>
          </View>
          <Text selectable style={[styles.text, { color: colors.foreground }]}>
            {shownText || 'Ainda não há texto nesta página. Deslize as páginas no leitor para carregar o conteúdo.'}
          </Text>
          <Text style={[styles.textHint, { color: colors.primary }]}>
            {extracted
              ? `Documento extraído: ${extracted.length.toLocaleString('pt-BR')} caracteres prontos para flashcards e busca.`
              : 'No app, o texto do documento inteiro é extraído automaticamente ao abrir o PDF.'}
          </Text>
          {copyStatus ? <Text style={[styles.copyStatus, { color: colors.primary }]}>{copyStatus}</Text> : null}
        </View>

        <Text style={[styles.footnote, { color: colors.muted }]}>
          Toque e segure sobre a página para selecionar um trecho; use os botões do leitor para copiar tudo ou abrir pelo
          Google Docs quando o arquivo vier de um link público.
        </Text>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  back: { alignItems: 'center', flexDirection: 'row', gap: 4, paddingRight: 4, paddingVertical: 6 },
  backLabel: { fontSize: 13, fontWeight: '700' },
  content: { gap: 14, paddingBottom: 34, paddingHorizontal: 16, paddingTop: 14 },
  copyLabel: { fontSize: 12, fontWeight: '800' },
  copyStatus: { fontSize: 11, fontWeight: '700', marginTop: 8 },
  empty: { alignItems: 'center', borderRadius: 16, borderWidth: 1, gap: 8, justifyContent: 'center', padding: 24 },
  emptyBody: { fontSize: 12, lineHeight: 18, maxWidth: 320, textAlign: 'center' },
  emptyTitle: { fontSize: 15, fontWeight: '800' },
  flashButton: { alignItems: 'center', borderRadius: 999, borderWidth: 1, flexDirection: 'row', gap: 5, paddingHorizontal: 10, paddingVertical: 6 },
  flashLabel: { fontSize: 11, fontWeight: '800' },
  footnote: { fontSize: 11, lineHeight: 16 },
  header: { alignItems: 'center', borderBottomWidth: 1, flexDirection: 'row', gap: 8, paddingHorizontal: 14, paddingVertical: 10 },
  headerCopy: { flex: 1 },
  subtitle: { fontSize: 11, marginTop: 3 },
  text: { fontSize: 14, lineHeight: 21, marginTop: 10 },
  textCard: { borderRadius: 16, padding: 14 },
  textHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  textHint: { fontSize: 11, lineHeight: 16, marginTop: 10 },
  textTitle: { fontSize: 12, fontWeight: '900', letterSpacing: 0.2 },
  title: { fontSize: 15, fontWeight: '800' },
});
