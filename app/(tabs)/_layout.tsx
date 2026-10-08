/**
 * Shell Neon (Etapa 2) — casca das abas traduzida do `cris-mockup2.html`:
 *
 *   `.particles` → `NeonParticles`      `.sidebar`  → `NeonSidebar` (≥900 px)
 *   `.topbar`    → `NeonTopbar`         `.bottomnav` → barra do react-navigation
 *                                                      remodelada como pílula
 *
 * O react-navigation continua dono da navegação (aba ativa, âncora no web,
 * haptic e acessibilidade via `HapticTab`): aqui só trocamos a casca visual e
 * unificamos rótulos/ícones em `NEON_NAV`. Nenhuma lógica de
 * Chat/Planejamento/Biblioteca/Editor/Play foi tocada — as telas continuam as
 * mesmas, só renderizadas dentro da nova casca.
 */

import { type BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { Tabs } from 'expo-router';
import { useState } from 'react';
import { Platform, StyleSheet, useWindowDimensions, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { NeonGradient, useAcademicPalette } from '@/components/academic/design-system';
import { HapticTab } from '@/components/haptic-tab';
import { NEON_LAYOUT, NEON_NAV, neonNavBottom, neonNavHeight } from '@/components/neon/nav-items';
import { NeonParticles } from '@/components/neon/particles';
import { NeonSidebar } from '@/components/neon/sidebar';
import { NeonTopbar } from '@/components/neon/topbar';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { cardShadow, glowShadow, hexToRgba, neonRadius } from '@/lib/theme-runtime';

/**
 * Botão da bottom nav: mesma pílula do mockup (`.bottomnav button`, raio 16,
 * gradiente `activeNav` + glow quando ativa), mas sobre o botão do
 * react-navigation. O `BottomTabItem` avisa o estado pelo `aria-selected`.
 */
function NeonTabButton({ compact, ...props }: BottomTabBarButtonProps & { compact: boolean }) {
  const { colors } = useAcademicPalette();
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);
  const focused = (props as { 'aria-selected'?: boolean })['aria-selected'] === true;

  return (
    <HapticTab
      {...props}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      onPressIn={event => { setPressed(true); props.onPressIn?.(event); }}
      onPressOut={event => { setPressed(false); props.onPressOut?.(event); }}
      style={[
        props.style,
        styles.tabButton,
        compact ? styles.tabButtonCompact : styles.tabButtonWide,
        focused ? glowShadow(colors.primary, 'base') : null,
        hovered && !focused ? { backgroundColor: '#ffffff05', transform: [{ translateY: -3 }] } : null,
        pressed ? styles.tabPressed : null,
      ]}
    >
      {focused ? <NeonGradient name="activeNav" style={[StyleSheet.absoluteFill, styles.tabActiveFill]} /> : null}
      {props.children}
    </HapticTab>
  );
}

export default function TabLayout() {
  const { colors } = useAcademicPalette();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const wide = width >= NEON_LAYOUT.breakpoint;
  const compact = !wide;
  const navHeight = neonNavHeight(wide);
  const navBottom = neonNavBottom(wide) + (Platform.OS === 'web' ? 0 : insets.bottom);
  const shellPadding = wide ? NEON_LAYOUT.shellPaddingWide : NEON_LAYOUT.shellPadding;
  const topInset = Platform.OS === 'web' ? 0 : insets.top;
  /**
   * A pílula vive dentro da coluna `.main`, então o alvo de 920 px do mockup é
   * aplicado à largura dessa coluna (não à da janela) e fica centralizado nela.
   */
  const shellWidth = Math.min(width, NEON_LAYOUT.shellMaxWidth);
  const sceneWidth = Math.max(
    shellWidth - 2 * shellPadding - (wide ? NEON_LAYOUT.sidebarWidth + NEON_LAYOUT.gapWide : 0),
    0,
  );
  const navWidth = wide ? Math.min(NEON_LAYOUT.navMaxWidth, sceneWidth) : sceneWidth;
  const navLeft = Math.max((sceneWidth - navWidth) / 2, 0);
  /** `.app{padding-bottom:100px}` do mockup: a cena nunca fica sob a pílula. */
  const bottomClearance = navHeight + navBottom + (wide ? 24 : 20);
  /** `backdrop-filter: blur(12px)` do mockup não existe no tipo de estilo do RN. */
  const webBlur = Platform.OS === 'web' ? ({ backdropFilter: 'blur(12px)' } as unknown as ViewStyle) : null;

  return (
    <View style={[styles.shell, { backgroundColor: colors.background }]}>
      <NeonParticles />
      <View
        style={[
          styles.frame,
          { padding: shellPadding, paddingBottom: bottomClearance + shellPadding, paddingTop: shellPadding + topInset },
        ]}
      >
        <View style={[styles.grid, wide ? styles.gridWide : styles.gridTight]}>
          {wide ? <NeonSidebar /> : null}
          <View style={styles.main}>
            <NeonTopbar compact={compact} />
            <View style={styles.scene}>
              <Tabs
                screenOptions={{
                  /** v7 do bottom-tabs: cross-fade entre abas, sem salto seco (Etapa 3). */
                  animation: 'fade',
                  headerShown: false,
                  sceneStyle: styles.sceneFill,
                  tabBarActiveBackgroundColor: 'transparent',
                  tabBarActiveTintColor: colors.primary,
                  tabBarButton: props => <NeonTabButton {...props} compact={compact} />,
                  tabBarIconStyle: styles.tabIcon,
                  tabBarInactiveTintColor: colors.muted,
                  tabBarItemStyle: styles.tabItem,
                  tabBarLabelStyle: [styles.tabLabel, compact ? styles.tabLabelCompact : null],
                  tabBarStyle: [
                    styles.nav,
                    wide ? styles.navWide : styles.navTight,
                    {
                      backgroundColor: hexToRgba(colors.surfaceAlt, 0.9),
                      borderColor: colors.border,
                      bottom: navBottom,
                      height: navHeight,
                      left: navLeft,
                      width: navWidth,
                    },
                    webBlur,
                  ],
                }}
              >
                {NEON_NAV.map(item => (
                  <Tabs.Screen
                    key={item.name}
                    name={item.name}
                    options={{
                      tabBarIcon: ({ color }) => <IconSymbol color={color} name={item.icon} size={wide ? 20 : 18} />,
                      title: item.label,
                    }}
                  />
                ))}
              </Tabs>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}


const styles = StyleSheet.create({
  frame: { flex: 1, zIndex: 1 },
  grid: { alignSelf: 'center', flex: 1, maxWidth: NEON_LAYOUT.shellMaxWidth, width: '100%' },
  gridTight: { flexDirection: 'column', gap: NEON_LAYOUT.gapTight },
  gridWide: { flexDirection: 'row', gap: NEON_LAYOUT.gapWide },
  main: { flex: 1, gap: 20, minWidth: 0 },
  nav: {
    borderTopWidth: 1,
    borderWidth: 1,
    borderRadius: neonRadius.panel,
    flexDirection: 'row',
    position: 'absolute',
    ...cardShadow('floating'),
  },
  navTight: { paddingHorizontal: 4, paddingVertical: 8 },
  navWide: { paddingHorizontal: 10, paddingVertical: 10 },
  scene: { flex: 1, minHeight: 0 },
  sceneFill: { backgroundColor: 'transparent' },
  shell: { flex: 1 },
  tabActiveFill: { borderRadius: 16 },
  tabButton: { borderRadius: 16, flexDirection: 'column', justifyContent: 'center', overflow: 'hidden' },
  tabButtonCompact: { gap: 4, paddingHorizontal: 2, paddingVertical: 8 },
  tabButtonWide: { gap: 4, paddingHorizontal: 6, paddingVertical: 10 },
  tabIcon: { marginBottom: 0 },
  tabItem: { borderRadius: 16, marginHorizontal: 3, overflow: 'hidden' },
  tabLabel: { fontWeight: '800', letterSpacing: 0.1, lineHeight: 13 },
  tabLabelCompact: { fontSize: 9 },
  tabPressed: { opacity: 0.75 },
});

