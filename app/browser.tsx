import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { WebView } from 'react-native-webview';

import { ScreenContainer } from '@/components/screen-container';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColors } from '@/hooks/use-colors';

/**
 * Navegador interno para links de atividades/materiais do Moodle.
 *
 * A WebView usa os mesmos cookies da WebView de importação (`sharedCookiesEnabled`
 * + `thirdPartyCookiesEnabled`), então o link abre autenticado em vez de cair na
 * tela de login do Moodle no navegador externo.
 */
export default function BrowserScreen() {
  const params = useLocalSearchParams<{ url?: string; title?: string }>();
  const colors = useColors();
  const [loading, setLoading] = useState(true);
  const target = useMemo(() => {
    const raw = Array.isArray(params.url) ? params.url[0] : params.url;
    const value = (raw ?? '').trim();
    return /^https?:\/\//i.test(value) ? value : '';
  }, [params.url]);
  const title = (Array.isArray(params.title) ? params.title[0] : params.title) || 'Conteúdo do Moodle';
  const source = useMemo(() => ({ uri: target }), [target]);

  useEffect(() => {
    if (!target) return;
    setLoading(true);
    /** Rede de segurança: um PDF/download pode nunca disparar `onLoadEnd`. */
    const timer = setTimeout(() => setLoading(false), 15000);
    return () => clearTimeout(timer);
  }, [target]);

  const openExternal = () => {
    if (target) void Linking.openURL(target).catch(() => undefined);
  };

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
        <Pressable accessibilityRole="link" accessibilityLabel="Abrir no navegador externo" onPress={openExternal} style={styles.external}>
          <Text style={[styles.externalText, { color: colors.primary }]}>Abrir fora</Text>
        </Pressable>
      </View>

      {target ? (
        <View style={styles.viewer}>
          <WebView
            domStorageEnabled
            javaScriptEnabled
            onError={() => setLoading(false)}
            onHttpError={() => setLoading(false)}
            onLoadEnd={() => setLoading(false)}
            onLoadStart={() => setLoading(true)}
            originWhitelist={['*']}
            setSupportMultipleWindows={false}
            sharedCookiesEnabled
            source={source}
            style={{ backgroundColor: colors.background, flex: 1 }}
            thirdPartyCookiesEnabled
          />
          {loading ? (
            <View pointerEvents="none" style={[styles.loading, { backgroundColor: colors.background }]}>
              <ActivityIndicator color={colors.primary} size="large" />
              <Text style={[styles.loadingText, { color: colors.muted }]}>Abrindo o conteúdo…</Text>
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
  subtitle: { fontSize: 11, marginTop: 3 },
  title: { fontSize: 15, fontWeight: '800' },
  viewer: { flex: 1 },
});
