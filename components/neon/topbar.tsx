/**
 * `.topbar` do mockup (linhas 96-102 + 267-277): eyebrow ciano, título da tela,
 * data, 🎨 (tema) e 🚪 (sair).
 *
 * O eyebrow/título vêm de `NEON_NAV` pelo caminho atual, então o topbar
 * acompanha a aba sem nenhuma tela precisar passar props. O 🎨 cicla os três
 * modos do mockup (auto → escuro → claro) com `setThemePreference`, a mesma API
 * do seletor completo de temas em Ajustes.
 */

import { router, usePathname } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { NeonGradient, useAcademicPalette } from '@/components/academic/design-system';
import { neonItemForPath } from '@/components/neon/nav-items';
import { isDarkScheme } from '@/constants/theme';
import { useThemeActions, useThemePreference, useThemeScheme } from '@/lib/theme-provider';
import { readableSupabaseError, signOutFromSupabase } from '@/lib/supabase-chat';
import { cardShadow, glowShadow, neonRadius, neonType } from '@/lib/theme-runtime';

type ThemeMode = 'auto' | 'dark' | 'light' | 'neon';

const THEME_GLYPH: Record<ThemeMode, string> = { auto: '🕐', dark: '🌙', light: '☀️', neon: '✨' };
const THEME_NAME: Record<ThemeMode, string> = { auto: 'automático', dark: 'escuro', light: 'claro', neon: 'neon' };
/**
 * Ordem do 🎨: os 3 modos do mockup + o Neon, que é a paleta de
 * `cris-mockup2.html`. Do claro, um clique já cai no Neon; do Neon volta para o
 * automático. Os temas completos (violeta, oceano, contraste, amanhecer,
 * entardecer…) continuam em Ajustes → Temas e aparência.
 */
const THEME_CYCLE: readonly ThemeMode[] = ['auto', 'dark', 'light', 'neon'];

function formatToday(date: Date): string {
  try {
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', weekday: 'short' });
  } catch {
    return date.toLocaleDateString();
  }
}

/** `.icon-btn` do mockup: 40×40, raio 13, fundo `#0b1120` (token `surfaceAlt`). */
function TopbarAction({
  accessibilityLabel,
  glyph,
  hovered,
  onHoverIn,
  onHoverOut,
  onPress,
}: {
  accessibilityLabel: string;
  glyph: string;
  hovered: boolean;
  onHoverIn: () => void;
  onHoverOut: () => void;
  onPress: () => void;
}) {
  const { colors } = useAcademicPalette();
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      onHoverIn={onHoverIn}
      onHoverOut={onHoverOut}
      onPress={onPress}
      style={[
        styles.iconButton,
        { backgroundColor: colors.surfaceAlt, borderColor: hovered ? colors.primary : colors.border },
        hovered ? glowShadow(colors.primary, 'base') : null,
      ]}
    >
      <Text style={styles.iconGlyph}>{glyph}</Text>
    </Pressable>
  );
}

export function NeonTopbar({ compact = false, style }: { compact?: boolean; style?: StyleProp<ViewStyle> }) {
  const { colors } = useAcademicPalette();
  const colorScheme = useThemeScheme();
  const themePreference = useThemePreference();
  const { setThemePreference } = useThemeActions();
  const pathname = usePathname();
  const [hover, setHover] = useState<'home' | 'logout' | 'theme' | null>(null);
  const [today] = useState(() => new Date());
  const { eyebrow, title } = neonItemForPath(pathname);
  /**
   * 'neon' vem da preferência salva (tem paleta própria); 'auto'/'system'
   * seguem a hora do dia, e o tema resolvido decide entre 🌙 e ☀️.
   */
  const mode: ThemeMode =
    themePreference === 'auto'
      ? 'auto'
      : themePreference === 'neon'
        ? 'neon'
        : isDarkScheme(colorScheme)
          ? 'dark'
          : 'light';

  const cycleTheme = useCallback(() => {
    const index = THEME_CYCLE.indexOf(mode);
    setThemePreference(THEME_CYCLE[(index + 1) % THEME_CYCLE.length]);
  }, [mode, setThemePreference]);

  const signOut = useCallback(async () => {
    try {
      await signOutFromSupabase();
      router.replace('/chat');
    } catch (error) {
      Alert.alert('Não foi possível sair', readableSupabaseError(error));
    }
  }, []);

  return (
    <View style={[styles.shadow, { backgroundColor: colors.surface }, cardShadow('card'), style]}>
      <NeonGradient
        name="panel"
        style={[styles.bar, compact ? styles.barCompact : styles.barWide, { borderColor: colors.border }]}
      >
        <View style={styles.copy}>
          <Text style={[styles.eyebrow, { color: colors.primary }]} numberOfLines={1}>{eyebrow}</Text>
          <Text
            style={[styles.title, compact ? styles.titleCompact : styles.titleWide, { color: colors.foreground }]}
            numberOfLines={2}
          >
            {title}
          </Text>
        </View>
        <View style={styles.actions}>
          <Text style={[styles.date, { color: colors.muted }]} numberOfLines={1}>{formatToday(today)}</Text>
          <TopbarAction
            accessibilityLabel="Ir para o início"
            glyph="🏠"
            hovered={hover === 'home'}
            onHoverIn={() => setHover('home')}
            onHoverOut={() => setHover(null)}
            onPress={() => router.navigate('/')}
          />
          <TopbarAction
            accessibilityLabel={`Alternar tema — agora em modo ${THEME_NAME[mode]}`}
            glyph={THEME_GLYPH[mode]}
            hovered={hover === 'theme'}
            onHoverIn={() => setHover('theme')}
            onHoverOut={() => setHover(null)}
            onPress={cycleTheme}
          />
          <TopbarAction
            accessibilityLabel="Sair desta conta"
            glyph="🚪"
            hovered={hover === 'logout'}
            onHoverIn={() => setHover('logout')}
            onHoverOut={() => setHover(null)}
            onPress={() => { void signOut(); }}
          />
        </View>
      </NeonGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  actions: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  bar: {
    alignItems: 'center',
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 15,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  barCompact: { paddingHorizontal: 18, paddingVertical: 16 },
  barWide: { paddingHorizontal: 22, paddingVertical: 18 },
  copy: { flex: 1, minWidth: 0 },
  date: { fontSize: 12, fontWeight: '700' },
  eyebrow: {
    fontSize: neonType.eyebrow.size,
    fontWeight: neonType.eyebrow.weight,
    letterSpacing: neonType.eyebrow.letterSpacing,
  },
  iconButton: {
    alignItems: 'center',
    borderRadius: neonRadius.iconButton,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  iconGlyph: { fontSize: 17 },
  /**
   * Aqui só vive a forma: a cor de fundo entra inline (`colors.surface`) e ela
   * não é decoração. `cardShadow` é `elevation`, e no Android a sombra é
   * derivada do **outline** da view — o fundo deste wrapper era o SVG do
   * `NeonGradient panel` (um filho), então a view não tinha contorno sólido e o
   * Android desenhava a sombra a partir do retângulo cru dos limites: o "ghost
   * box" do topbar, que mudava de tom junto com o tema. `surface` é a 1ª parada
   * do gradiente `panel` e o SVG cobre o wrapper inteiro, então a base é
   * invisível — só devolve o contorno arredondado de 22 px.
   */
  shadow: { borderRadius: 22 },
  title: { fontWeight: neonType.screenTitle.weight, letterSpacing: neonType.screenTitle.letterSpacing, marginTop: 3 },
  titleCompact: { fontSize: 22 },
  titleWide: { fontSize: neonType.screenTitle.size },
});
