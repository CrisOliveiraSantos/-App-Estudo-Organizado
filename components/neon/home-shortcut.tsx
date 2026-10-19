/**
 * Atalho global de "Início" para as telas empilhadas (subject, document,
 * import, ajustes de IA, PDF, flashcards…). A casinha do cabeçalho das abas
 * vive no `NeonTopbar`; esta pílula cobre as rotas que não têm topbar.
 *
 * `router.dismissTo('/')` desmonta a pilha inteira em vez de empilhar outra
 * Home. Se o histórico não puder ser dispensado, `replace` troca a tela atual.
 */

import { router, usePathname } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAcademicPalette } from '@/components/academic/design-system';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { cardShadow, neonRadius } from '@/lib/theme-runtime';

const TAB_ROUTES = ['/', '/editor', '/planning', '/library', '/chat', '/settings'];

export function HomeShortcut() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { colors } = useAcademicPalette();
  if (TAB_ROUTES.includes(pathname)) return null;
  if (pathname.startsWith('/auth') || pathname.startsWith('/oauth') || pathname.startsWith('/dev')) return null;

  const goHome = () => {
    try {
      if (router.canDismiss()) {
        router.dismissTo('/');
        return;
      }
    } catch {
      // Fallback abaixo.
    }
    router.replace('/');
  };

  return (
    <View pointerEvents="box-none" style={[styles.layer, { bottom: Math.max(insets.bottom, 10) + 14 }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Ir para o início"
        onPress={goHome}
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: colors.surface, borderColor: colors.border },
          cardShadow('floating'),
          pressed && styles.pressed,
        ]}
      >
        <IconSymbol name="house.fill" size={18} color={colors.foreground} />
        <Text style={[styles.label, { color: colors.foreground }]}>Início</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    borderRadius: neonRadius.chip,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 7,
    minHeight: 40,
    paddingHorizontal: 14,
  },
  label: { fontSize: 12, fontWeight: '800' },
  layer: { alignItems: 'flex-start', left: 14, position: 'absolute', zIndex: 40 },
  pressed: { opacity: 0.82, transform: [{ scale: 0.98 }] },
});
