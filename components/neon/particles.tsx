/**
 * `.particles` do mockup (linhas 40-44): 40 nós que sobem a tela, 2-5 px,
 * opacidade .15 → .4 → .15, 8-16 s cada, cores alternadas
 * (3n = dourado, ímpar = rosa, resto = ciano — mesma prioridade do CSS).
 *
 * Só `Animated` do core: roda no web e no aparelho sem dependência nova.
 */

import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet, useWindowDimensions, View, type StyleProp, type ViewStyle } from 'react-native';

import { useAcademicPalette } from '@/components/academic/design-system';
import { neonMotion, neonParticles } from '@/lib/theme-runtime';

const USE_NATIVE_DRIVER = Platform.OS !== 'web';

type ParticleSpec = {
  colorIndex: 0 | 1 | 2;
  delayMs: number;
  durationMs: number;
  leftPct: number;
  size: number;
};

/** `:nth-child(3n)` vence `:nth-child(odd)` no mockup (a regra 3n vem depois). */
function colorIndexFor(position: number): 0 | 1 | 2 {
  if (position % 3 === 0) return 2;
  return position % 2 === 1 ? 1 : 0;
}

function NeonParticle({ colors, height, spec }: { colors: [string, string, string]; height: number; spec: ParticleSpec }) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.delay(spec.delayMs),
        Animated.timing(progress, {
          duration: spec.durationMs,
          easing: Easing.linear,
          toValue: 1,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [progress, spec.delayMs, spec.durationMs]);

  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [height, -height * 0.1] });
  const rotate = progress.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const opacity = progress.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [neonParticles.opacityLow, neonParticles.opacityHigh, neonParticles.opacityLow],
  });

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          backgroundColor: colors[spec.colorIndex],
          borderRadius: spec.size / 2,
          height: spec.size,
          left: `${spec.leftPct}%`,
          opacity,
          transform: [{ translateY }, { rotate }],
          width: spec.size,
        },
      ]}
    />
  );
}

export function NeonParticles({ count = neonParticles.count, style }: { count?: number; style?: StyleProp<ViewStyle> }) {
  const { colors } = useAcademicPalette();
  const { height } = useWindowDimensions();
  const specs = useMemo(
    () =>
      Array.from({ length: count }, (_, index) => {
        const position = index + 1;
        return {
          colorIndex: colorIndexFor(position),
          delayMs: Math.round(Math.random() * neonMotion.float),
          durationMs: Math.round(
            neonParticles.minDurationMs + Math.random() * (neonParticles.maxDurationMs - neonParticles.minDurationMs),
          ),
          leftPct: Math.round(Math.random() * 100),
          size: Math.round(neonParticles.minSize + Math.random() * (neonParticles.maxSize - neonParticles.minSize)),
        } satisfies ParticleSpec;
      }),
    [count],
  );
  const tints = useMemo(
    (): [string, string, string] => [colors.primary, colors.accentPink, colors.accentGold],
    [colors.accentGold, colors.accentPink, colors.primary],
  );

  return (
    <View pointerEvents="none" style={[styles.layer, style]}>
      {specs.map((spec, index) => (
        <NeonParticle colors={tints} height={height} key={`particle-${index}`} spec={spec} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  layer: { ...StyleSheet.absoluteFillObject, overflow: 'hidden', zIndex: 0 },
  particle: { position: 'absolute', top: 0 },
});
