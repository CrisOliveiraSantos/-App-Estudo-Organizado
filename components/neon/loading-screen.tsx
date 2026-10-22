/**
 * Tela de espera do shell ("A Cris está preparando seu espaço").
 *
 * Por que existe: o `StudyProvider` lê o `AsyncStorage` antes de saber quais
 * metas, tarefas e mensagens existem. Até essa leitura terminar, a navegação
 * abria com o estado de exemplo e trocava de conteúdo no meio do primeiro
 * toque. Aqui a navegação **não monta**: só a marca, a mensagem e o termômetro.
 *
 * O termômetro tem duas fases:
 *   1. enquanto o estado/tema/fontes não estão prontos, a barra avança até 86%
 *      (progresso real de uma leitura local é indeterminado — fingir 100% e
 *      travar seria pior);
 *   2. quando `ready` vira `true`, ela completa em ~0.5 s e o shell troca a
 *      tela. A barra é também um `progressbar` para leitores de tela.
 *
 * A animação da barra usa `width` (driver JS) de propósito: é um único nó de
 * 8 px e roda uma vez; o que importa é o crossfade do fundo, esse sim no driver
 * nativo. O pulso da marca usa `opacity`/`scale` no driver nativo.
 */

import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

import { NeonGradient, useAcademicPalette } from '@/components/academic/design-system';
import { CrisLogo } from '@/components/neon/cris-logo';
import { ThemeBackground } from '@/components/theme-background';
import { hexToRgba } from '@/lib/theme-runtime';

const BAR_HEIGHT = 8;
/** Enquanto o estado não chega, a barra para aqui (leitura local é indeterminada). */
const PENDING_TARGET = 0.86;
const MESSAGE = 'A Cris está preparando seu espaço para melhor performance...';

export function LoadingScreen({ ready }: { ready: boolean }) {
  const { colors } = useAcademicPalette();
  const progress = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const [percent, setPercent] = useState(0);
  const [trackWidth, setTrackWidth] = useState(0);

  useEffect(() => {
    const animation = Animated.timing(progress, {
      duration: ready ? 520 : 2600,
      easing: ready ? Easing.out(Easing.cubic) : Easing.out(Easing.quad),
      toValue: ready ? 1 : PENDING_TARGET,
      useNativeDriver: false,
    });
    animation.start();
    return () => animation.stop();
  }, [progress, ready]);

  /** Só re-renderiza quando o número inteiro muda (nada de 60 setState/s). */
  useEffect(() => {
    const id = progress.addListener(({ value }) => {
      const next = Math.round(value * 100);
      setPercent(current => (current === next ? current : next));
    });
    return () => progress.removeListener(id);
  }, [progress]);

  /** Respiração da marca: 2,4 s por ciclo, sem tocar no layout. */
  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { duration: 1200, easing: Easing.inOut(Easing.quad), toValue: 1, useNativeDriver: true }),
        Animated.timing(pulse, { duration: 1200, easing: Easing.inOut(Easing.quad), toValue: 0, useNativeDriver: true }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [pulse]);

  const logoOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 0.72] });
  const logoScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.045] });
  const width = progress.interpolate({ inputRange: [0, 1], outputRange: [0, trackWidth] });

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ThemeBackground vivid />
      <View style={styles.content}>
        <Animated.View style={{ opacity: logoOpacity, transform: [{ scale: logoScale }] }}>
          <CrisLogo size={150} />
        </Animated.View>

        <Text style={[styles.title, { color: colors.foreground }]}>Preparando seu espaço</Text>
        <Text style={[styles.message, { color: colors.muted }]}>{MESSAGE}</Text>

        <View
          accessibilityLabel="Carregando seus estudos"
          accessibilityRole="progressbar"
          accessibilityValue={{ max: 100, min: 0, now: percent }}
          onLayout={event => setTrackWidth(event.nativeEvent.layout.width)}
          style={[
            styles.track,
            { backgroundColor: hexToRgba(colors.foreground, 0.1), borderColor: colors.border },
          ]}
        >
          <Animated.View style={[styles.fillClip, { width }]}>
            <NeonGradient colors={[colors.primary, colors.accentPink]} style={StyleSheet.absoluteFill} />
          </Animated.View>
        </View>

        <Text style={[styles.percent, { color: colors.muted }]}>{percent}%</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { alignItems: 'center', flex: 1, justifyContent: 'center', paddingHorizontal: 32 },
  fillClip: { borderRadius: BAR_HEIGHT / 2, height: '100%', left: 0, overflow: 'hidden', position: 'absolute', top: 0 },
  message: { fontSize: 13, fontWeight: '600', lineHeight: 19, marginTop: 8, maxWidth: 300, textAlign: 'center' },
  percent: { fontSize: 11, fontVariant: ['tabular-nums'], fontWeight: '800', letterSpacing: 0.6, marginTop: 10 },
  root: { flex: 1 },
  title: { fontSize: 20, fontWeight: '800', letterSpacing: -0.3, marginTop: 18, textAlign: 'center' },
  track: {
    borderRadius: BAR_HEIGHT / 2,
    borderWidth: 1,
    height: BAR_HEIGHT,
    marginTop: 26,
    maxWidth: 320,
    overflow: 'hidden',
    width: '100%',
  },
});
