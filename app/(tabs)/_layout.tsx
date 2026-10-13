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
  /**
   * A pílula do mockup (`.bottomnav`) é `position:fixed; bottom:12-20px`, isto é,
   * medida da JANELA. Aqui ela é `position:absolute` e o pai é a cena, portanto o
   * `bottom` só cai no mesmo lugar se a cena alcançar o fundo da janela — é por
   * isso que o frame não reserva nada embaixo. A folga do `.app{padding-bottom:
   * 100px}` fica com o conteúdo de cada aba (`content.paddingBottom`, hoje
   * 115-120 px); somá-la aqui *e* lá empurrava a pílula ~127 px para cima.
   */
  /** `backdrop-filter: blur(12px)` do mockup não existe no tipo de estilo do RN. */
  const webBlur = Platform.OS === 'web' ? ({ backdropFilter: 'blur(12px)' } as unknown as ViewStyle) : null;

  return (
    <View style={[styles.shell, { backgroundColor: colors.background }]}>
      <NeonParticles />
      <View
        style={[
          styles.frame,
          { paddingHorizontal: shellPadding, paddingTop: shellPadding + topInset },
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
                  tabBarShowLabel: true,
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
                      tabBarIcon: ({ color }) => <IconSymbol color={color} name={item.icon} size={26} />,
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
  /**
   * `paddingTop`/`paddingBottom` explícitos, e **não** `paddingVertical`.
   * O `BottomTabBar` injeta `paddingBottom: insets.bottom` no mesmo array de
   * estilo (`[{height, paddingBottom: insets.bottom, ...}, tabBarStyle]`), e a
   * barra já é erguida por `bottom: neonNavBottom() + insets.bottom`: o inset
   * estava entrando duas vezes. Como `paddingVertical` é uma chave DIFERENTE de
   * `paddingBottom`, ele não sobrescreve o inset de forma confiável (a expansão
   * em `paddingTop`/`paddingBottom` disputa a ordem no processamento de estilos)
   * — com `insets.bottom` de 24-48 px a caixa de conteúdo da pílula caía para
   * 10-34 px e fatiaba o ícone/sumia com o rótulo. Chave igual, esta vence.
   */
  navTight: { paddingBottom: 8, paddingHorizontal: 4, paddingTop: 8 },
  navWide: { paddingBottom: 10, paddingHorizontal: 10, paddingTop: 10 },
  scene: { flex: 1, minHeight: 0 },
  sceneFill: { backgroundColor: 'transparent' },
  shell: { flex: 1 },
  tabActiveFill: { borderRadius: 16 },
  tabButton: { alignItems: 'center', borderRadius: 16, flexDirection: 'column', justifyContent: 'center', overflow: 'hidden' },
  tabButtonCompact: { gap: 4, paddingHorizontal: 2, paddingVertical: 4 },
  tabButtonWide: { gap: 4, paddingHorizontal: 6, paddingVertical: 6 },
  /**
   * Slot do ícone com 30 px: o glifo do `MaterialIcons` mede exatamente `size`
   * (fonte `upem = 512`, `ascender = 512`, `descender = 0` → caixa de 26 px em
   * `size={26}`), então o slot de 26 o encaixava sem folga nenhuma — qualquer
   * pixel do aparelho (escala de fonte/inset) cortava. 30 dá 4 px de respiro.
   */
  tabIcon: { alignItems: 'center', height: 30, justifyContent: 'center', marginBottom: 0 },
  /**
   * Sem `overflow: 'hidden'` aqui: o recorte do item é o que fatiaria ícone e
   * rótulo. O clip que importa (a pílula do gradiente ativo, com raio 16) já
   * vive em `tabButton`, que tem `overflow: 'hidden'` — e o próprio
   * `BottomTabItem` usa `overflow: 'visible'` na variante uikit.
   */
  tabItem: { alignItems: 'center', borderRadius: 16, justifyContent: 'center', marginHorizontal: 3 },
  tabLabel: { fontWeight: '800', letterSpacing: 0.1, lineHeight: 13 },
  tabLabelCompact: { fontSize: 9 },
  tabPressed: { opacity: 0.75 },
});

