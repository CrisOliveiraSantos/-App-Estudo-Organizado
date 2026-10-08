/**
 * `.fab` do mockup (linhas 165-167 + 202 + 209): 64 px (56 no celular),
 * raio 22, gradiente 140° ciano→rosa, borda ciano, glow e um anel rosa
 * pulsando por fora (`pulseGlow 2s`, inset -5).
 *
 * O estado, a posição e o `onPress` continuam em `components/cris-popup.tsx`;
 * aqui vive só a aparência e a animação.
 */

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, useWindowDimensions, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { NeonGradient, useAcademicPalette } from '@/components/academic/design-system';
import { NEON_LAYOUT, neonNavBottom, neonNavHeight } from '@/components/neon/nav-items';
import { glowShadow, neonGradientAngles, neonMotion, neonRadius } from '@/lib/theme-runtime';

const USE_NATIVE_DRIVER = Platform.OS !== 'web';

export function NeonFab({ bottom, onPress, style }: { bottom?: number; onPress: () => void; style?: StyleProp<ViewStyle> }) {
  const { colors } = useAcademicPalette();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);
  const scale = useRef(new Animated.Value(1)).current;
  const ringOpacity = useRef(new Animated.Value(0.6)).current;
  const wide = width >= NEON_LAYOUT.breakpoint;
  const grown = hovered || pressed;
  const size = wide ? 64 : 56;
  const right = wide ? 24 : width <= 430 ? 14 : 16;
  /** Sem `bottom` explícito, o FAB cola na pílula (mesma geometria do layout). */
  const resolvedBottom =
    bottom ?? neonNavHeight(wide) + neonNavBottom(wide) + (Platform.OS === 'web' ? 0 : insets.bottom) + 10;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(ringOpacity, {
          duration: neonMotion.pulse / 2,
          easing: Easing.inOut(Easing.ease),
          toValue: 0.15,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(ringOpacity, {
          duration: neonMotion.pulse / 2,
          easing: Easing.inOut(Easing.ease),
          toValue: 0.6,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [ringOpacity]);

  useEffect(() => {
    const animation = Animated.timing(scale, {
      duration: neonMotion.slow,
      easing: Easing.out(Easing.cubic),
      toValue: grown ? 1.15 : 1,
      useNativeDriver: USE_NATIVE_DRIVER,
    });
    animation.start();
    return () => animation.stop();
  }, [grown, scale]);

  return (
    <Pressable
      accessibilityLabel="Abrir a Cris, sua mentora de estudos"
      accessibilityRole="button"
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={[styles.anchor, { bottom: resolvedBottom, right }, style]}
    >
      <Animated.View style={[styles.glow, { transform: [{ scale }] }, glowShadow(colors.primary, 'strong')]}>
        <Animated.View pointerEvents="none" style={[styles.ring, { borderColor: colors.accentPink, opacity: ringOpacity }]} />
        <NeonGradient
          angle={neonGradientAngles.brandSteep}
          colors={[colors.primary, colors.accentPink]}
          style={[styles.button, { borderColor: colors.primary, height: size, width: size }]}
        >
          <MaterialIcons color="#FFFFFF" name="auto-awesome" size={wide ? 26 : 24} />
        </NeonGradient>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  anchor: { position: 'absolute', zIndex: 40 },
  button: { alignItems: 'center', borderRadius: neonRadius.fab, borderWidth: 1, justifyContent: 'center', overflow: 'hidden' },
  glow: { borderRadius: neonRadius.fab + 5 },
  ring: { borderWidth: 1, borderRadius: neonRadius.fab + 4, bottom: -5, left: -5, position: 'absolute', right: -5, top: -5 },
});
