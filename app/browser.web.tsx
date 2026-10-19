import { useMemo } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { ScreenContainer } from '@/components/screen-container';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColors } from '@/hooks/use-colors';

/** Na web o navegador interno não compartilha a sessão do Moodle: abre fora. */
export default function BrowserScreenWeb() {
  const params = useLocalSearchParams<{ url?: string; title?: string }>();
  const colors = useColors();
  const target = useMemo(() => {
    const raw = Array.isArray(params.url) ? params.url[0] : params.url;
    const value = (raw ?? '').trim();
    return /^https?:\/\//i.test(value) ? value : '';
  }, [params.url]);
  const title = (Array.isArray(params.title) ? params.title[0] : params.title) || 'Conteúdo do Moodle';
  const open = () => {
    if (target) void Linking.openURL(target).catch(() => undefined);
  };

  return (
    <ScreenContainer edges={['top', 'bottom', 'left', 'right']}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Voltar" onPress={() => router.back()} style={styles.back}>
          <IconSymbol name="arrow.backward" size={21} color={colors.foreground} />
          <Text style={[styles.backLabel, { color: colors.foreground }]}>Voltar</Text>
        </Pressable>
        <Text numberOfLines={1} style={[styles.title, { color: colors.foreground }]}>{title}</Text>
      </View>
      <View style={styles.body}>
        <Text style={[styles.bodyTitle, { color: colors.foreground }]}>Abrir no navegador</Text>
        <Text style={[styles.bodyText, { color: colors.muted }]}>
          No navegador, o app não tem acesso aos cookies do login do Moodle. O link será aberto em uma nova aba; entre na
          conta institucional se o ambiente pedir.
        </Text>
        <Pressable accessibilityRole="link" onPress={open} style={[styles.button, { backgroundColor: colors.primary }]}>
          <Text style={styles.buttonText}>Abrir atividade</Text>
        </Pressable>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  back: { alignItems: 'center', flexDirection: 'row', gap: 4, paddingRight: 6, paddingVertical: 6 },
  backLabel: { fontSize: 13, fontWeight: '700' },
  body: { alignItems: 'center', flex: 1, gap: 12, justifyContent: 'center', padding: 28 },
  bodyText: { fontSize: 13, lineHeight: 20, maxWidth: 420, textAlign: 'center' },
  bodyTitle: { fontSize: 17, fontWeight: '800' },
  button: { borderRadius: 12, marginTop: 4, paddingHorizontal: 22, paddingVertical: 13 },
  buttonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  header: { alignItems: 'center', borderBottomWidth: 1, flexDirection: 'row', gap: 10, paddingHorizontal: 14, paddingVertical: 10 },
  title: { flex: 1, fontSize: 15, fontWeight: '800' },
});
