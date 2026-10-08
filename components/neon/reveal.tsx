/**
 * Entrada suave (fade + slide) dos blocos de conteúdo — o `fadeUp` do mockup,
 * com `Animated` do core do React Native.
 *
 * Só `opacity` e `translateY`, então roda igual no web e no nativo, sem trazer
 * nenhuma dependência nova (`moti`/reanimated ficaram de fora de propósito).
 * O movimento extra nas telas é opcional: `delay` escalona os cards.
 */

import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import { Animated, Easing, type StyleProp, type ViewStyle } from 'react-native';

export function NeonReveal({
  children,
  delay = 0,
  distance = 18,
  duration = 520,
  style,
}: {
  children: ReactNode;
  /** Atraso antes de começar (escalona cards do mesmo grupo). */
  delay?: number;
  /** Distância em px de onde o bloco sobe. */
  distance?: number;
  duration?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.timing(progress, {
      delay,
      duration,
      easing: Easing.out(Easing.cubic),
      toValue: 1,
      useNativeDriver: false,
    });
    animation.start();
    return () => animation.stop();
  }, [delay, duration, progress]);

  const animated = useMemo(
    () => ({
      opacity: progress,
      transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] }) }],
    }),
    [distance, progress],
  );

  return <Animated.View style={[style, animated]}>{children}</Animated.View>;
}
