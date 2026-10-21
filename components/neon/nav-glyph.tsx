/**
 * Ícones neon da bottom nav — traço fino com gradiente ciano→rosa e halo.
 *
 * A referência é `assets/images/os ícones da Bottom Nav.png` (9 cartões neon da
 * Dolla). Em vez de recortar o PNG (2048², xadrez queimado, marca d'água) ou
 * instalar `lucide-react-native`, cada glifo é desenhado aqui em
 * `react-native-svg` com 24×24: nitidez em qualquer densidade, cor vinda do
 * tema ativo e nenhuma dependência nova.
 *
 * O "neon" é feito com dois traços do MESMO caminho: um largo e translúcido
 * embaixo (halo) e o traço de 1,6 px com gradiente por cima. `feGaussianBlur`
 * não é usado de propósito — filtro SVG não tem suporte confiável no Android.
 */

import { useId } from 'react';
import Svg, { Circle, Defs, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { useAcademicPalette } from '@/components/academic/design-system';
import { hexToRgba } from '@/lib/theme-runtime';

export type NeonGlyphName = 'hoje' | 'editor' | 'planejamento' | 'biblioteca' | 'conversas' | 'ajustes';

/** Traços de cada glifo (sem cor: a cor vem do grupo que os envolve). */
function GlyphPaths({ name }: { name: NeonGlyphName }) {
  switch (name) {
    case 'hoje':
      return (
        <G>
          <Path d="M6.6 5h10.8a3 3 0 0 1 3 3v7.4a3 3 0 0 1-3 3H11l-3.7 3.1v-3.1H6.6a3 3 0 0 1-3-3V8a3 3 0 0 1 3-3Z" />
          <Circle cx={12} cy={12} r={2.5} />
          <Path d="M12 2.4v1.8" />
        </G>
      );
    case 'editor':
      return (
        <G>
          <Path d="M9 3.6h8.4A2.6 2.6 0 0 1 20 6.2v8.4" />
          <Rect height={13.4} rx={2.4} width={12.2} x={4} y={6.8} />
          <Path d="M7.2 10.6h6M7.2 13.4h4.6M7.2 16.2h3.6" strokeDasharray="2.4 2" />
        </G>
      );
    case 'planejamento':
      return (
        <G>
          <Rect height={15.6} rx={2.4} width={13.4} x={5.3} y={4.8} />
          <Path d="M9.2 4.8V3.5A1.3 1.3 0 0 1 10.5 2.2h3a1.3 1.3 0 0 1 1.3 1.3v1.3" />
          <Path d="M8.6 10.4h6.8M8.6 13.6h4.8M8.6 16.8h3" strokeDasharray="2.4 2" />
        </G>
      );
    case 'biblioteca':
      return (
        <G>
          <Path d="M3.8 5.4c0-1 .8-1.8 1.8-1.8h4.2v16H5.6a1.8 1.8 0 0 1-1.8-1.8V5.4Z" />
          <Path d="M20.2 5.4c0-1-.8-1.8-1.8-1.8h-4.2v16h4.2a1.8 1.8 0 0 0 1.8-1.8V5.4Z" />
          <Path d="M12 3.4v16" strokeDasharray="2.2 1.8" />
          <Path d="M6.2 8.4h2.2M6.2 11.4h2.2M15.6 8.4h2.2M15.6 11.4h2.2" />
        </G>
      );
    case 'conversas':
      return (
        <G>
          <Path d="M4 6.4A2.4 2.4 0 0 1 6.4 4h11.2A2.4 2.4 0 0 1 20 6.4v7.6a2.4 2.4 0 0 1-2.4 2.4H10l-4.6 3.6v-3.6h-.4A1 1 0 0 1 4 15.4V6.4Z" />
          <Path d="M8.4 10.4h.1M12 10.4h.1M15.6 10.4h.1" strokeLinecap="round" strokeWidth={2.6} />
        </G>
      );
    case 'ajustes':
      return (
        <G>
          <Circle cx={12} cy={12} r={3.1} />
          <Path d="M19.2 14.6a1.5 1.5 0 0 0 .3 1.6l.1.1a1.8 1.8 0 1 1-2.5 2.5l-.1-.1a1.5 1.5 0 0 0-1.6-.3 1.5 1.5 0 0 0-.9 1.4v.2a1.8 1.8 0 1 1-3.6 0v-.1a1.5 1.5 0 0 0-1-1.4 1.5 1.5 0 0 0-1.6.3l-.1.1a1.8 1.8 0 1 1-2.5-2.5l.1-.1a1.5 1.5 0 0 0 .3-1.6 1.5 1.5 0 0 0-1.4-.9H4a1.8 1.8 0 1 1 0-3.6h.2a1.5 1.5 0 0 0 1.4-1 1.5 1.5 0 0 0-.3-1.6l-.1-.1a1.8 1.8 0 1 1 2.5-2.5l.1.1a1.5 1.5 0 0 0 1.6.3h.1a1.5 1.5 0 0 0 .9-1.4V4a1.8 1.8 0 1 1 3.6 0v.2a1.5 1.5 0 0 0 .9 1.4 1.5 1.5 0 0 0 1.6-.3l.1-.1a1.8 1.8 0 1 1 2.5 2.5l-.1.1a1.5 1.5 0 0 0-.3 1.6v.1a1.5 1.5 0 0 0 1.4.9h.2a1.8 1.8 0 1 1 0 3.6h-.2a1.5 1.5 0 0 0-1.4.9Z" />
        </G>
      );
    default:
      return null;
  }
}

export function NeonNavGlyph({
  active = false,
  name,
  size = 22,
}: {
  active?: boolean;
  name: NeonGlyphName;
  size?: number;
}) {
  const { colors } = useAcademicPalette();
  const rawId = useId();
  const gradientId = `glyph-${rawId.replace(/[^a-zA-Z0-9]/g, '')}`;
  const stroke = active ? `url(#${gradientId})` : hexToRgba(colors.muted, 0.85);

  return (
    <Svg fill="none" height={size} viewBox="0 0 24 24" width={size}>
      {active ? (
        <Defs>
          <LinearGradient id={gradientId} x1="0" x2="1" y1="0" y2="1">
            <Stop offset="0" stopColor={colors.primary} />
            <Stop offset="1" stopColor={colors.accentPink} />
          </LinearGradient>
        </Defs>
      ) : null}
      <G stroke={stroke} strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6}>
        {active ? (
          <G opacity={0.22} strokeWidth={4.6}>
            <GlyphPaths name={name} />
          </G>
        ) : null}
        <GlyphPaths name={name} />
      </G>
    </Svg>
  );
}
