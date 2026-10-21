/**
 * Fundo ilustrado dos quatro temas da Dolla (Manhã, Tarde, Noite e Madrugada).
 *
 * As referências são ilustrações raster 1600×2848 (`assets/images/tema … Mockup.png`)
 * com o xadrez do editor **queimado** no PNG, marca d'água "Dola AI" e cantos
 * arredondados — impróprias para `ImageBackground`. Em vez de embutir 4 imagens
 * de ~4 MB (e ficar preso à resolução do mockup), a cena é **desenhada em
 * `react-native-svg`**: escala sem serrilhado em qualquer densidade, acompanha a
 * paleta do tema e pesa alguns KB.
 *
 * A geometria vive num `viewBox` fixo de 400×800 com
 * `preserveAspectRatio="xMidYMid slice"`, então o desenho cobre a tela inteira
 * em retrato, tablet e desktop (o excesso é recortado, como `background-size:
 * cover` no CSS).
 *
 * Contraste: por cima do SVG há um véu (`scrim`) na cor do tema. Sem ele o
 * céu/onda/estrela engole texto de 11-14 px. `vivid` corta o véu pela metade —
 * é o modo da tela de login, onde a arte é protagonista.
 */

import { useId } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  LinearGradient,
  Line,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';

import { useThemeScheme } from '@/lib/theme-provider';
import {
  hexToRgba,
  themePalettes,
  themeSceneByScheme,
  type ThemePaletteSpec,
  type ThemeScene,
} from '@/lib/theme-runtime';

const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 800;

/** Gerador determinístico: a cena não pode "tremer" a cada render. */
function seeded(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

/** Raios de sol: ângulos abertos para cima, comprimentos alternados. */
const SUN_RAYS = Array.from({ length: 16 }, (_, index) => {
  const angle = (-160 + index * 13.4) * (Math.PI / 180);
  const length = 130 + (index % 3) * 58;
  return {
    length,
    opacity: 0.22 + (index % 4) * 0.07,
    width: index % 4 === 0 ? 2.6 : 1.4,
    x2: 200 + Math.cos(angle) * length,
    y2: 268 + Math.sin(angle) * length,
  };
});

/** Estrelas da Noite/Madrugada (posição, raio e brilho fixos). */
const STARS = (() => {
  const random = seeded(20261021);
  return Array.from({ length: 54 }, () => ({
    opacity: 0.3 + random() * 0.6,
    r: 0.6 + random() * 1.5,
    x: Math.round(random() * CANVAS_WIDTH * 10) / 10,
    y: Math.round(random() * 560 * 10) / 10,
  }));
})();

/** Explosão estelar da Madrugada: raios saindo de um ponto alto à direita. */
const BURST_RAYS = (() => {
  const random = seeded(48271);
  return Array.from({ length: 46 }, (_, index) => {
    const angle = (index / 46) * Math.PI * 2 + random() * 0.08;
    const length = 70 + random() * 260;
    return {
      cyan: index % 3 !== 0,
      opacity: 0.16 + random() * 0.5,
      width: 0.8 + random() * 2,
      x1: 286,
      x2: 286 + Math.cos(angle) * length,
      y1: 262,
      y2: 262 + Math.sin(angle) * length,
    };
  });
})();

/** Bolhas da Tarde. */
const BUBBLES = (() => {
  const random = seeded(7919);
  return Array.from({ length: 22 }, () => ({
    opacity: 0.25 + random() * 0.5,
    r: 2 + random() * 9,
    x: 10 + random() * 380,
    y: 360 + random() * 400,
  }));
})();

/** Faíscas de luz (Tarde/Noite/Manhã). */
const SPARKS = [
  { o: 0.8, r: 9, x: 74, y: 170 },
  { o: 0.55, r: 6, x: 330, y: 120 },
  { o: 0.7, r: 7, x: 250, y: 420 },
  { o: 0.45, r: 5, x: 120, y: 90 },
  { o: 0.6, r: 6, x: 356, y: 330 },
];

/** Estrela de quatro pontas (o "brilho" dos mockups). */
function Sparkle({ color, opacity, r, x, y }: { color: string; opacity: number; r: number; x: number; y: number }) {
  return (
    <Path
      d={`M${x} ${y - r} Q${x} ${y} ${x + r} ${y} Q${x} ${y} ${x} ${y + r} Q${x} ${y} ${x - r} ${y} Q${x} ${y} ${x} ${y - r} Z`}
      fill={color}
      opacity={opacity}
    />
  );
}

function ManhaScene({ beam, spec, sun }: { beam: string; spec: ThemePaletteSpec; sun: string }) {
  return (
    <G>
      <Circle cx={200} cy={268} fill={`url(#${sun})`} r={150} />
      <Circle cx={200} cy={268} fill={hexToRgba(spec.soft, 0.96)} r={46} />
      {SUN_RAYS.map((ray, index) => (
        <Line
          key={`sun-ray-${index}`}
          opacity={ray.opacity}
          stroke={`url(#${beam})`}
          strokeLinecap="round"
          strokeWidth={ray.width}
          x1={200}
          x2={ray.x2}
          y1={268}
          y2={ray.y2}
        />
      ))}
      {/* nuvens finas, como no mockup */}
      <Path d="M18 214 q26 -16 54 -6 q22 -16 48 -2 q24 -10 44 4 l0 9 l-146 0 z" fill={spec.soft} opacity={0.4} />
      <Path d="M268 168 q22 -12 44 -4 q18 -12 40 0 q20 -6 36 6 l0 8 l-120 0 z" fill={spec.soft} opacity={0.28} />
      {SPARKS.slice(0, 4).map((spark, index) => (
        <Sparkle color={spec.soft} key={`manha-spark-${index}`} opacity={spark.o * 0.8} r={spark.r} x={spark.x} y={spark.y - 70} />
      ))}
      {/* serras em duas camadas */}
      <Path
        d="M0 512 L66 462 L124 502 L196 438 L262 496 L330 452 L400 500 L400 800 L0 800 Z"
        fill={spec.accentAlt}
        opacity={0.32}
      />
      <Path
        d="M0 556 L86 514 L152 548 L232 494 L306 544 L400 510 L400 800 L0 800 Z"
        fill={spec.deep}
        opacity={0.55}
      />
      {/* mar com reflexos do sol */}
      <Rect fill={spec.deep} height={230} opacity={0.55} width={CANVAS_WIDTH} y={570} />
      {Array.from({ length: 9 }, (_, index) => (
        <Rect
          fill={spec.glow}
          height={2.4}
          key={`manha-glint-${index}`}
          opacity={0.45 - index * 0.035}
          rx={1.2}
          width={150 - index * 9}
          x={125 + index * 5}
          y={604 + index * 22}
        />
      ))}
    </G>
  );
}

function TardeScene({ beam, spec }: { beam: string; spec: ThemePaletteSpec }) {
  return (
    <G>
      {BUBBLES.map((bubble, index) => (
        <Circle
          cx={bubble.x}
          cy={bubble.y}
          fill="none"
          key={`tarde-bubble-${index}`}
          opacity={bubble.opacity}
          r={bubble.r}
          stroke={index % 2 === 0 ? spec.glow : spec.soft}
          strokeWidth={1}
        />
      ))}
      {SPARKS.slice(0, 3).map((spark, index) => (
        <Sparkle color={spec.soft} key={`tarde-spark-${index}`} opacity={spark.o * 0.7} r={spark.r} x={spark.x + 20} y={spark.y} />
      ))}
      {/* quatro faixas de onda: da mais clara (fundo) à mais escura (frente) */}
      <Path
        d="M0 430 C 60 396, 118 470, 186 438 C 250 408, 306 462, 400 418 L400 800 L0 800 Z"
        fill={spec.accent}
        opacity={0.26}
      />
      <Path
        d="M0 492 C 74 452, 132 528, 206 492 C 272 460, 330 520, 400 476 L400 800 L0 800 Z"
        fill={spec.accentAlt}
        opacity={0.38}
      />
      <Path
        d="M0 566 C 82 522, 140 600, 214 562 C 286 526, 340 590, 400 548 L400 800 L0 800 Z"
        fill={spec.deep}
        opacity={0.62}
      />
      <Path
        d="M0 654 C 88 606, 152 686, 232 646 C 302 610, 350 668, 400 630 L400 800 L0 800 Z"
        fill={spec.deep}
        opacity={0.82}
      />
      {/* cristas iluminadas */}
      <Path
        d="M0 430 C 60 396, 118 470, 186 438 C 250 408, 306 462, 400 418"
        fill="none"
        opacity={0.5}
        stroke={`url(#${beam})`}
        strokeWidth={1.6}
      />
      <Path
        d="M0 492 C 74 452, 132 528, 206 492 C 272 460, 330 520, 400 476"
        fill="none"
        opacity={0.4}
        stroke={spec.glow}
        strokeWidth={1.2}
      />
    </G>
  );
}

function NoiteScene({ beam, spec, sun }: { beam: string; spec: ThemePaletteSpec; sun: string }) {
  return (
    <G>
      <Ellipse cx={200} cy={600} fill={`url(#${sun})`} rx={210} ry={150} />
      <Circle cx={200} cy={596} fill={hexToRgba(spec.glow, 0.9)} r={26} />
      {STARS.map((star, index) => (
        <Circle
          cx={star.x}
          cy={star.y}
          fill={index % 7 === 0 ? spec.glow : spec.soft}
          key={`noite-star-${index}`}
          opacity={star.opacity}
          r={star.r}
        />
      ))}
      {SPARKS.map((spark, index) => (
        <Sparkle
          color={spec.soft}
          key={`noite-spark-${index}`}
          opacity={spark.o * 0.6}
          r={spark.r * 0.8}
          x={spark.x}
          y={spark.y + 40}
        />
      ))}
      {/* nuvens em bloco, como no mockup do pôr do sol */}
      <Path
        d="M-10 190 q26 -34 66 -24 q16 -30 52 -22 q30 6 34 32 q30 0 34 26 l0 14 l-186 0 z"
        fill={spec.accentAlt}
        opacity={0.35}
      />
      <Path
        d="M214 246 q22 -28 56 -20 q14 -24 44 -16 q26 6 30 26 q26 2 30 22 l0 12 l-160 0 z"
        fill={spec.accentAlt}
        opacity={0.26}
      />
      <Path
        d="M40 330 q30 -28 70 -18 q18 -24 50 -14 q28 8 30 30 q26 4 28 22 l0 12 l-178 0 z"
        fill={spec.deep}
        opacity={0.5}
      />
      <Path
        d="M-20 430 q30 -30 74 -20 q18 -26 52 -16 q30 8 32 32 q28 4 30 24 l0 12 l-188 0 z"
        fill={spec.accentAlt}
        opacity={0.22}
      />
      {/* mar escuro com reflexo */}
      <Path d="M0 640 L400 640 L400 800 L0 800 Z" fill={spec.deep} opacity={0.9} />
      <Path
        d="M0 640 C 70 626, 130 656, 200 640 C 270 624, 330 652, 400 636"
        fill="none"
        opacity={0.35}
        stroke={`url(#${beam})`}
        strokeWidth={1.4}
      />
      {Array.from({ length: 6 }, (_, index) => (
        <Rect
          fill={spec.glow}
          height={1.8}
          key={`noite-reflect-${index}`}
          opacity={0.3 - index * 0.035}
          rx={0.9}
          width={72 - index * 8}
          x={164 + index * 4}
          y={664 + index * 18}
        />
      ))}
    </G>
  );
}

function MadrugadaScene({ spec }: { spec: ThemePaletteSpec }) {
  return (
    <G>
      {/* nebulosas suaves */}
      <Ellipse cx={112} cy={214} fill={spec.accentAlt} opacity={0.16} rx={128} ry={86} />
      <Ellipse cx={322} cy={520} fill={spec.accent} opacity={0.12} rx={150} ry={110} />
      <Ellipse cx={286} cy={262} fill={spec.soft} opacity={0.14} rx={54} ry={54} />
      <Circle cx={286} cy={262} fill={spec.soft} opacity={0.9} r={6} />
      {BURST_RAYS.map((ray, index) => (
        <Line
          key={`burst-${index}`}
          opacity={ray.opacity}
          stroke={ray.cyan ? spec.accent : spec.accentAlt}
          strokeLinecap="round"
          strokeWidth={ray.width}
          x1={ray.x1}
          x2={ray.x2}
          y1={ray.y1}
          y2={ray.y2}
        />
      ))}
      {STARS.map((star, index) => (
        <Circle
          cx={star.x}
          cy={(star.y + 120) % 700}
          fill={index % 5 === 0 ? spec.glow : spec.soft}
          key={`madrugada-star-${index}`}
          opacity={star.opacity * 0.85}
          r={star.r}
        />
      ))}
      {[
        { o: 0.9, r: 16, x: 64, y: 96 },
        { o: 0.75, r: 11, x: 342, y: 140 },
        { o: 0.6, r: 8, x: 118, y: 460 },
        { o: 0.7, r: 6, x: 316, y: 606 },
      ].map((spark, index) => (
        <Sparkle
          color={spec.soft}
          key={`madrugada-spark-${index}`}
          opacity={spark.o}
          r={spark.r}
          x={spark.x}
          y={spark.y}
        />
      ))}
    </G>
  );
}

export function ThemeBackground({
  opacity = 1,
  scene,
  style,
  vivid = false,
}: {
  /** Opacidade da camada inteira (deixa as partículas do shell respirarem). */
  opacity?: number;
  /** Força uma cena; por padrão segue o tema ativo. */
  scene?: ThemeScene;
  style?: StyleProp<ViewStyle>;
  /** Véu mais leve: a arte aparece quase inteira (tela de login). */
  vivid?: boolean;
}) {
  const scheme = useThemeScheme();
  const rawId = useId();
  const uid = rawId.replace(/[^a-zA-Z0-9]/g, '');
  const activeScene = scene ?? themeSceneByScheme[scheme];
  const spec = activeScene ? themePalettes[activeScene] : null;
  if (!spec || !activeScene) return null;

  const scrimAlpha = Math.min(1, spec.scrimAlpha * (vivid ? 0.5 : 1));
  const skyId = `sky-${uid}`;
  const sunId = `sun-${uid}`;
  const beamId = `beam-${uid}`;

  return (
    <View pointerEvents="none" style={[styles.layer, { opacity }, style]}>
      <Svg height="100%" preserveAspectRatio="xMidYMid slice" viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`} width="100%">
        <Defs>
          <LinearGradient id={skyId} x1="0" x2="0" y1="0" y2="1">
            <Stop offset="0" stopColor={spec.sky[0]} />
            <Stop offset="0.52" stopColor={spec.sky[1]} />
            <Stop offset="1" stopColor={spec.sky[2]} />
          </LinearGradient>
          <RadialGradient id={sunId}>
            <Stop offset="0" stopColor={hexToRgba(spec.glow, 0.95)} />
            <Stop offset="0.45" stopColor={hexToRgba(spec.glow, 0.34)} />
            <Stop offset="1" stopColor={hexToRgba(spec.glow, 0)} />
          </RadialGradient>
          <LinearGradient id={beamId} x1="0" x2="1" y1="0" y2="1">
            <Stop offset="0" stopColor={spec.accent} />
            <Stop offset="1" stopColor={spec.accentAlt} />
          </LinearGradient>
        </Defs>
        <Rect fill={`url(#${skyId})`} height={CANVAS_HEIGHT} width={CANVAS_WIDTH} x={0} y={0} />
        {activeScene === 'manha' ? <ManhaScene beam={beamId} spec={spec} sun={sunId} /> : null}
        {activeScene === 'tarde' ? <TardeScene beam={beamId} spec={spec} /> : null}
        {activeScene === 'noite' ? <NoiteScene beam={beamId} spec={spec} sun={sunId} /> : null}
        {activeScene === 'madrugada' ? <MadrugadaScene spec={spec} /> : null}
      </Svg>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: spec.scrim, opacity: scrimAlpha }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  layer: { ...StyleSheet.absoluteFillObject, overflow: 'hidden' },
});
