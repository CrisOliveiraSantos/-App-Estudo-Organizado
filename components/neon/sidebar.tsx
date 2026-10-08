/**
 * `.sidebar` do mockup (linhas 79-93 + 254-264): marca (logo C + "Cris" +
 * "Estudo Organizado"), a mesma navegação das abas e o cartão da mentora com o
 * "● Disponível para ajudar" piscando (`blink 2s`).
 *
 * Aparece só a partir de 900 px, exatamente como `@media(max-width:900px){
 * .sidebar{display:none} }` — no celular o mesmo conteúdo fica na bottom nav.
 */

import { router, usePathname } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { NeonGradient, useAcademicPalette } from '@/components/academic/design-system';
import { NEON_LAYOUT, NEON_NAV, neonItemForPath, type NeonNavItem } from '@/components/neon/nav-items';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { cardShadow, glowShadow, hexToRgba, neonMotion, neonRadius } from '@/lib/theme-runtime';

const USE_NATIVE_DRIVER = Platform.OS !== 'web';

function SidebarItem({ item }: { item: NeonNavItem }) {
  const { colors } = useAcademicPalette();
  const pathname = usePathname();
  const active = neonItemForPath(pathname).name === item.name;
  const [hovered, setHovered] = useState(false);

  return (
    <Pressable
      accessibilityLabel={`Ir para ${item.label}`}
      accessibilityRole="button"
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      onPress={() => router.push(item.route)}
      style={[
        styles.navItem,
        { borderColor: active ? hexToRgba(colors.primary, 0.35) : 'transparent' },
        hovered && !active ? styles.navItemHover : null,
      ]}
    >
      {active ? <NeonGradient name="activeNav" style={[StyleSheet.absoluteFill, styles.navItemFill]} /> : null}
      <View style={styles.navIcon}>
        <IconSymbol color={active ? colors.primary : colors.muted} name={item.icon} size={17} />
      </View>
      <Text style={[styles.navLabel, { color: active ? colors.foreground : colors.muted }]} numberOfLines={1}>
        {item.label}
      </Text>
    </Pressable>
  );
}

export function NeonSidebar({ style }: { style?: StyleProp<ViewStyle> }) {
  const { colors } = useAcademicPalette();
  const blink = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(blink, {
          duration: neonMotion.blink / 2,
          easing: Easing.inOut(Easing.ease),
          toValue: 0.35,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(blink, {
          duration: neonMotion.blink / 2,
          easing: Easing.inOut(Easing.ease),
          toValue: 1,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [blink]);

  return (
    <View style={[styles.shadow, { width: NEON_LAYOUT.sidebarWidth }, cardShadow('card'), style]}>
      <NeonGradient name="panel" style={[styles.sidebar, { borderColor: colors.border }]}>
        <View style={styles.brand}>
          <NeonGradient
            colors={[colors.primary, colors.accentPink]}
            style={[styles.logo, { borderColor: colors.primary }, glowShadow(colors.primary, 'base')]}
          >
            <Text style={styles.logoText}>C</Text>
          </NeonGradient>
          <View style={styles.brandCopy}>
            <Text style={[styles.brandName, { color: colors.foreground }]} numberOfLines={1}>Cris</Text>
            <Text style={[styles.brandTag, { color: colors.muted }]} numberOfLines={1}>Estudo Organizado</Text>
          </View>
        </View>

        <View style={styles.nav}>
          {NEON_NAV.map(item => <SidebarItem item={item} key={item.name} />)}
        </View>

        <View style={[styles.mentor, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
          <View style={styles.mentorRow}>
            <NeonGradient colors={[colors.primary, colors.accentPink]} style={styles.mentorAvatar}>
              <Text style={styles.mentorAvatarText}>✦</Text>
            </NeonGradient>
            <View style={styles.mentorCopy}>
              <Text style={[styles.mentorName, { color: colors.foreground }]} numberOfLines={1}>Cris · Mentora IA</Text>
              <Animated.Text style={[styles.mentorOnline, { color: colors.success, opacity: blink }]} numberOfLines={1}>
                ● Disponível para ajudar
              </Animated.Text>
            </View>
          </View>
          <Text style={[styles.mentorNote, { color: colors.muted }]}>Um passo de cada vez. Você consegue. 💜</Text>
        </View>
      </NeonGradient>
    </View>
  );
}


const styles = StyleSheet.create({
  brand: { alignItems: 'center', flexDirection: 'row', gap: 12, paddingHorizontal: 8 },
  brandCopy: { flex: 1, minWidth: 0 },
  brandName: { fontSize: 15, fontWeight: '800', letterSpacing: -0.4 },
  brandTag: { fontSize: 11, fontWeight: '600', marginTop: 1 },
  logo: {
    alignItems: 'center',
    borderRadius: neonRadius.logo,
    borderWidth: 1,
    height: 45,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 45,
  },
  logoText: { color: '#FFFFFF', fontSize: 22, fontWeight: '900' },
  mentor: { borderRadius: 18, borderWidth: 1, marginTop: 'auto', padding: 15 },
  mentorAvatar: {
    alignItems: 'center',
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 44,
  },
  mentorAvatarText: { color: '#FFFFFF', fontSize: 20 },
  mentorCopy: { flex: 1, minWidth: 0 },
  mentorName: { fontSize: 13, fontWeight: '800' },
  mentorNote: { fontSize: 12, lineHeight: 17, marginTop: 12 },
  mentorOnline: { fontSize: 11, fontWeight: '700', marginTop: 2 },
  mentorRow: { alignItems: 'center', flexDirection: 'row', gap: 11 },
  nav: { gap: 7 },
  navIcon: { alignItems: 'center', width: 22 },
  navItem: {
    alignItems: 'center',
    borderRadius: neonRadius.listItem,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    minHeight: 44,
    overflow: 'hidden',
    paddingHorizontal: 13,
    paddingVertical: 12,
  },
  navItemFill: { borderRadius: neonRadius.listItem },
  navItemHover: { backgroundColor: '#ffffff08', transform: [{ translateX: 3 }] },
  navLabel: { flex: 1, fontSize: 14, fontWeight: '700' },
  shadow: { borderRadius: neonRadius.sidebar, flex: 1 },
  sidebar: {
    borderRadius: neonRadius.sidebar,
    borderWidth: 1,
    flex: 1,
    gap: 24,
    overflow: 'hidden',
    paddingHorizontal: 14,
    paddingVertical: 22,
  },
});

