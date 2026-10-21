/**
 * Logo da Cris: chapéu de formatura neon + wordmark serifado.
 *
 * Referência: `assets/images/logo de tela de loguin chapeu de formatura neon.png`
 * (2048×2048). O PNG do mockup tem **xadrez queimado** no lugar da
 * transparência, ~55% de margem vazia e a marca d'água "Dola AI" — nada disso
 * serve para a interface. Aqui a marca é reconstruída em `react-native-svg`:
 * o chapéu é desenhado com o gradiente do tema e o "Cris" usa a **Bodoni Moda**
 * (`assets/fonts/BodoniModa_700Bold.ttf`) com preenchimento em gradiente, que
 * é o que o SVG suporta nativamente (RN não tem `background-clip: text`).
 *
 * `size` é a largura em px; a altura sai da proporção do `viewBox`. O texto só
 * aparece quando a fonte já foi carregada — o `RootLayout` segura a primeira
 * pintura até `useFonts` resolver, então não há flash de serifada do sistema.
 */

import { useId } from 'react';
import { type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Defs, G, LinearGradient, Path, Stop, Text as SvgText } from 'react-native-svg';

import { useAcademicPalette } from '@/components/academic/design-system';
import { neonFonts } from '@/lib/theme-runtime';

const VIEW_WIDTH = 220;
const VIEW_HEIGHT = 196;

export const CRIS_LOGO_ASPECT = VIEW_HEIGHT / VIEW_WIDTH;

export function CrisLogo({
  size = 150,
  style,
  wordmark = true,
}: {
  /** Largura da marca em px (a altura é proporcional). */
  size?: number;
  style?: StyleProp<ViewStyle>;
  /** `false` mostra só o chapéu (útil em espaços quadrados). */
  wordmark?: boolean;
}) {
  const { colors } = useAcademicPalette();
  const rawId = useId();
  const uid = rawId.replace(/[^a-zA-Z0-9]/g, '');
  const capId = `cap-${uid}`;
  const wordId = `word-${uid}`;
  const height = Math.round(size * (wordmark ? CRIS_LOGO_ASPECT : 120 / VIEW_WIDTH));

  return (
    <Svg
      fill="none"
      height={height}
      style={style}
      viewBox={`0 0 ${VIEW_WIDTH} ${wordmark ? VIEW_HEIGHT : 120}`}
      width={size}
    >
      <Defs>
        <LinearGradient id={capId} x1="0" x2="1" y1="0" y2="1">
          <Stop offset="0" stopColor={colors.primary} />
          <Stop offset="0.55" stopColor={colors.foreground} />
          <Stop offset="1" stopColor={colors.accentPink} />
        </LinearGradient>
        <LinearGradient id={wordId} x1="0" x2="1" y1="0" y2="0.2">
          <Stop offset="0" stopColor={colors.primary} />
          <Stop offset="0.42" stopColor="#FFFFFF" />
          <Stop offset="1" stopColor={colors.accentPink} />
        </LinearGradient>
      </Defs>

      <G stroke={`url(#${capId})`} strokeLinecap="round" strokeLinejoin="round">
        {/* halo do chapéu */}
        <G opacity={0.22} strokeWidth={5}>
          <Path d="M110 14 200 50 110 86 20 50Z" />
        </G>
        {/* aba (diamond) e corpo do chapéu */}
        <Path d="M110 14 200 50 110 86 20 50Z" strokeWidth={2.2} />
        <Path d="M76 63v16c0 9 15 16 34 16s34-7 34-16V63" strokeWidth={2.2} />
        <Path d="M110 40l7 7-7 7-7-7Z" strokeWidth={1.8} />
        <Path d="M170 62v40" strokeWidth={1.8} />
        <Circle cx={170} cy={108} fill={`url(#${capId})`} r={4.6} />
      </G>

      {wordmark ? (
        <G>
          {/* halo do wordmark */}
          <SvgText
            fill="none"
            fontFamily={neonFonts.brand}
            fontSize={80}
            letterSpacing={1}
            opacity={0.3}
            stroke={`url(#${wordId})`}
            strokeWidth={3}
            textAnchor="middle"
            x={VIEW_WIDTH / 2}
            y={178}
          >
            Cris
          </SvgText>
          <SvgText
            fill={`url(#${wordId})`}
            fontFamily={neonFonts.brand}
            fontSize={80}
            letterSpacing={1}
            textAnchor="middle"
            x={VIEW_WIDTH / 2}
            y={178}
          >
            Cris
          </SvgText>
        </G>
      ) : null}
    </Svg>
  );
}

