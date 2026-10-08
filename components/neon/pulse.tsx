/**
 * Anel pulsante (`pulseGlow` do mockup) para botões primários.
 *
 * O anel é `position: absolute` e `pointerEvents="none"`, então não interfere
 * no layout e o botão continua clicável por dentro. Na volta do ciclo a
 * opacidade já está em 0 (interpolação `[0, .6, 1]`), então o loop não pisca.
 */

import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, Easing, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useAcademicPalette } from '@/components/academic/design-system';
import { glowShadow, hexToRgba, neonRadius } from '@/lib/theme-runtime';

export function NeonPulse({
  children,
  enabled = true,
  style,
}: {
  children: ReactNode;
  /** Desliga a animação mantendo o layout (ex.: nada pendente para continuar). */
  enabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useAcademicPalette();
  const beat = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!enabled) {
      beat.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(beat, { duration: 900, easing: Easing.out(Easing.cubic), toValue: 1, useNativeDriver: false }),
        Animated.timing(beat, { duration: 700, toValue: 0, useNativeDriver: false }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [beat, enabled]);

  return (
    <View style={style}>
      {enabled ? (
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            { borderColor: hexToRgba(colors.primary, 0.55), borderRadius: neonRadius.button, borderWidth: 1 },
            glowShadow(colors.primary, 'base'),
            {
              opacity: beat.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0.5, 0, 0] }),
              transform: [{ scale: beat.interpolate({ inputRange: [0, 0.6, 1], outputRange: [1, 1.06, 1.06] }) }],
            },
          ]}
        />
      ) : null}
      {children}
    </View>
  );
}
