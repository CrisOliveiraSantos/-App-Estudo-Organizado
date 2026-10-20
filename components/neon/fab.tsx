/**
 * `.fab` da Dolla: **64×64 em qualquer largura** (`dollaTokens.layout.fabSize`),
 * raio 22, gradiente 100° ciano→rosa (`neonGradientAngles.brand`, o mesmo do
 * botão primário) e um anel rosa pulsando por fora (`pulseGlow 2s`, inset -3).
 *
 * O glifo `auto-awesome` (que parecia o ícone do Gemini) saiu: dentro do
 * gradiente agora vive o **rosto da Cris**, recortado do mockup oficial
 * (`assets/images/cris-avatar.png`, 160×160 com máscara circular e cantos
 * transparentes). O PNG tem fundo próprio, então o `borderRadius` do botão só
 * arredonda a caixa — o círculo da foto aparece inteiro sobre o gradiente.
 *
 * O estado, a posição e o `onPress` continuam em `components/cris-popup.tsx`;
 * aqui vive só a aparência e a animação.
 */

import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, Platform, Pressable, StyleSheet, useWindowDimensions, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { NeonGradient, useAcademicPalette } from '@/components/academic/design-system';
import { NEON_LAYOUT, neonFabClearance, neonFabSize } from '@/components/neon/nav-items';
import { glowShadow, neonGradientAngles, neonMotion, neonRadius } from '@/lib/theme-runtime';

const USE_NATIVE_DRIVER = Platform.OS !== 'web';

/**
 * Rosto da Cris. `require` estático para o Metro empacotar o PNG no APK (não é
 * asset remoto, então funciona offline e no build de release).
 */
const CRIS_FACE = require('../../assets/images/cris-avatar.png');

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
  const size = neonFabSize(wide);
  const right = wide ? 24 : width <= 430 ? 14 : 16;
  /**
   * Sem `bottom` explícito, o FAB flutua 16 px acima da pílula. A conta vem de
   * `neonFabClearance` — a mesma fonte que as telas usam para reservar a folga
   * do fim da lista — descontada a altura do FAB: 96 px no celular e 116 no
   * desktop, mais o `insets.bottom` onde ele existe.
   */
  const resolvedBottom =
    bottom ?? neonFabClearance(wide) - size + (Platform.OS === 'web' ? 0 : insets.bottom);

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
      <Animated.View
        style={[
          styles.glow,
          /**
           * Base opaca **invisível**: o `NeonGradient` do botão é um SVG em
           * `absoluteFill` de raio 22 dentro deste wrapper de raio 27, isto é,
           * cobre a base inteira. Ela existe porque o glow é `elevation` e, sem
           * fundo sólido, o Android desenha a sombra a partir do retângulo cru
           * dos limites — o halo do FAB saía quadrado.
           */
          { backgroundColor: colors.primary },
          { transform: [{ scale }] },
          glowShadow(colors.primary, 'strong'),
        ]}
      >
        <Animated.View pointerEvents="none" style={[styles.ring, { borderColor: colors.accentPink, opacity: ringOpacity }]} />
        <NeonGradient
          angle={neonGradientAngles.brand}
          colors={[colors.primary, colors.accentPink]}
          style={[styles.button, { borderColor: colors.primary, height: size, width: size }]}
        >
          <Image
            accessibilityIgnoresInvertColors
            resizeMode="cover"
            source={CRIS_FACE}
            style={[styles.face, { borderRadius: neonRadius.fab, height: size, width: size }]}
          />
        </NeonGradient>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  anchor: { position: 'absolute', zIndex: 40 },
  button: { alignItems: 'center', borderRadius: neonRadius.fab, borderWidth: 1, justifyContent: 'center', overflow: 'hidden' },
  /**
   * O PNG já é um círculo com os cantos transparentes; o raio 22 só fecha a
   * caixa (e o `overflow: hidden` de `button` garante o recorte igual em
   * Android e web). `cover` impede a foto de achatar em telas com densidade
   * diferente de 1.
   */
  face: { alignSelf: 'center' },
  glow: { borderRadius: neonRadius.fab + 5 },
  ring: { borderWidth: 1, borderRadius: neonRadius.fab + 4, bottom: -3, left: -3, position: 'absolute', right: -3, top: -3 },
});
