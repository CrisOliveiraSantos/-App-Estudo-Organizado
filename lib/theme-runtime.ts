/**
 * Tokens de "runtime" do visual Neon chique — derivados do mockup `cris-mockup2.html`.
 *
 * Este módulo é PURO de propósito: o único import é um `import type` (apagado no build).
 * Assim ele pode ser exercitado pelos testes em Node e reaproveitado por componentes,
 * telas e pelo splash animado sem acoplar nada a `react-native`.
 */

import type { ColorScheme } from '@/lib/_core/theme';

/**
 * Tema automático por hora do dia, nas faixas do mockup (fonte de verdade):
 * 6h–12h = Amanhecer · 12h–18h = Oceano · 18h–24h = Entardecer · 0h–6h = Neon.
 */
export function schemeForHour(hour: number): ColorScheme {
  if (hour >= 6 && hour < 12) return 'sunrise';
  if (hour >= 12 && hour < 18) return 'ocean';
  if (hour >= 18 && hour < 24) return 'sunset';
  return 'neon';
}

/** Tons aceitos pelo design system: nomes históricos + nomes do mockup. */
export type AcademicTone =
  | 'indigo'
  | 'violet'
  | 'primary'
  | 'accent'
  | 'success'
  | 'warning'
  | 'danger'
  | 'neutral'
  | 'ghost'
  | 'info'
  | 'gold'
  | 'live'
  | 'retired'
  | 'recommended';

export type TonePalette = { fill: string; text: string; border: string };
export type TonePaletteTable = Record<AcademicTone, TonePalette>;

/** Subconjunto da paleta do tema necessário para derivar tons, gradientes e glows. */
export type AcademicPalette = {
  background: string;
  border: string;
  foreground: string;
  lavender: string;
  muted: string;
  primary: string;
  surface: string;
  surfaceAlt: string;
  success: string;
  warning: string;
  error: string;
  accentGold: string;
  accentGreen: string;
  accentOrange: string;
  accentPink: string;
  accentPurple: string;
  accentRose: string;
};

/** Raios do mockup (`--radius:20px` + variantes). */
export const neonRadius = {
  auth: 28,
  banner: 12,
  bubble: 18,
  button: 12,
  card: 20,
  chip: 20,
  editor: 14,
  fab: 22,
  iconButton: 13,
  iconButtonSm: 12,
  input: 12,
  listItem: 13,
  logo: 15,
  nav: 24,
  panel: 24,
  sidebar: 26,
  tab: 10,
  toggle: 13,
  toolButton: 8,
  topbar: 22,
  week: 13,
} as const;

/**
 * Especificação oficial da Dolla (tema escuro), traduzida para RN/Android.
 *
 * A paleta do tema `neon` já é exatamente esta (`SchemeColors.neon` em
 * `lib/_core/theme.ts`: bg `#080A12`, painel `#101522`, ciano `#00E5FF`, rosa
 * `#E34BFF`). O que faltava era um lugar único para as MÉTRICAS que a Dolla
 * define (raios, elevações, paddings e o gradiente do botão primário), porque
 * topbar, bottom nav, cards e FAB repetiam esses números soltos no `StyleSheet`.
 *
 * Regra de ouro: componente **não** usa `dollaTokens.color` para pintar a
 * interface — para isso existe a paleta do tema (`useAcademicPalette()`), que é
 * a única que responde à troca de tema. As cores aqui são a referência do
 * contrato visual (e o que os testes verificam), não um atalho de estilo.
 */
export const dollaTokens = {
  color: {
    background: '#080A12',
    border: '#202B40',
    cyan: '#00E5FF',
    gold: '#FFD166',
    green: '#49E5B1',
    muted: '#91A0B8',
    /** `rgba(12,17,30,0.95)` da pílula inferior. */
    navSurface: 'rgba(12, 17, 30, 0.95)',
    panel: '#101522',
    /** `#101522` com 93% de alfa (`EE`), o fundo do card. */
    panelTranslucent: '#101522EE',
    pink: '#E34BFF',
    text: '#F4F7FF',
  },
  /** `elevation` do Android: card 4, bottom nav 8. */
  elevation: { card: 4, nav: 8 },
  /** Botão primário: `linear-gradient(100deg, #00E5FF, #E34BFF)`. */
  gradient: { angle: 100, from: '#00E5FF', to: '#E34BFF' },
  layout: {
    cardPadding: 20,
    /** O FAB da Dolla é 64×64 em qualquer largura. */
    fabSize: 64,
    navPaddingVertical: 10,
    topbarPaddingHorizontal: 22,
    topbarPaddingVertical: 18,
  },
  radius: { card: 20, fab: 22, nav: 24, topbar: 22 },
} as const;

/** Durações do mockup (`--transition: all .25s`), em ms. */
export const neonMotion = {
  base: 250,
  blink: 2000,
  fade: 600,
  fast: 200,
  float: 12000,
  load: 2000,
  pop: 200,
  progress: 1000,
  pulse: 2500,
  slow: 300,
} as const;

/** Métricas de tipografia do mockup (`.eyebrow`, `.topbar h1`, `.card-head h3`, `.text-link`). */
export const neonType = {
  eyebrow: { letterSpacing: 1.6, size: 11, weight: '800' },
  screenTitle: { letterSpacing: -0.8, size: 26, weight: '700' },
  cardTitle: { size: 15, weight: '800' },
  link: { size: 13, weight: '700' },
  body: { size: 14, weight: '400' },
  meta: { size: 12, weight: '400' },
  chip: { size: 12, weight: '800' },
  pill: { size: 11, weight: '800' },
} as const;

/** Tipografia do tema: Inter carregada no `RootLayout` (fallback = fonte do sistema). */
export const neonFonts = {
  body: 'Inter_400Regular',
  medium: 'Inter_600SemiBold',
  strong: 'Inter_700Bold',
  display: 'Inter_800ExtraBold',
} as const;

/** Partículas de fundo (`#particles`: 40 nós, `float 12s`, 4px, opacidade .15–.4). */
export const neonParticles = {
  count: 40,
  maxDurationMs: 16000,
  maxSize: 5,
  minDurationMs: 8000,
  minSize: 2,
  opacityHigh: 0.4,
  opacityLow: 0.15,
} as const;

/** Glows do mockup (`--glow-cyan: 0 0 14px #00e5ff55`). */
export const neonGlow = {
  alphaBase: 0.33,
  alphaSoft: 0.28,
  alphaStrong: 0.55,
  spreadLg: 22,
  spreadMd: 14,
  spreadSm: 8,
} as const;

/** Sombras neutras de elevação do mockup (`0 12px 40px #0005`). */
export const neonElevation = {
  auth: { alpha: 0.45, blur: 50, y: 15 },
  card: { alpha: 0.32, blur: 40, y: 12 },
  fab: { alpha: 0.5, blur: 35, y: 8 },
  floating: { alpha: 0.42, blur: 40, y: 10 },
} as const;

/** Ângulos dos gradientes do mockup (`linear-gradient(100deg, cyan, pink)`). */
export const neonGradientAngles = {
  activeNav: 100,
  brand: 100,
  brandSteep: 140,
  bubbleMe: 100,
  hero: 135,
  panel: 145,
} as const;

export type NeonGradientName =
  | 'activeNav'
  | 'brand'
  | 'brandSteep'
  | 'bubbleMe'
  | 'friend'
  | 'group'
  | 'hero'
  | 'mentor'
  | 'panel'
  | 'teacher';

export type NeonGradientSpec = { angle: number; stops: [string, string] };

/** `#00e5ff` + 0.33 → `rgba(0, 229, 255, 0.33)`. Aceita `#rgb`/`#rrggbb`; devolve o original se não for hex. */
export function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.trim().replace('#', '');
  const full = clean.length === 3 ? clean.split('').map(char => char + char).join('') : clean;
  const value = Number.parseInt(full.slice(0, 6), 16);
  if (!Number.isFinite(value)) return hex;
  const safeAlpha = Math.max(0, Math.min(1, alpha));
  return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, ${safeAlpha})`;
}

/** Vetor SVG equivalente ao `linear-gradient(angle, …)` do CSS (0° = para cima). */
export function gradientVector(angle: number): { x1: number; y1: number; x2: number; y2: number } {
  const radians = (angle * Math.PI) / 180;
  const dx = Math.sin(radians);
  const dy = -Math.cos(radians);
  const round = (n: number) => Math.round(n * 1000) / 1000;
  return {
    x1: round(0.5 - dx / 2),
    x2: round(0.5 + dx / 2),
    y1: round(0.5 - dy / 2),
    y2: round(0.5 + dy / 2),
  };
}

/**
 * Mesma ideia dos tons: o gradiente depende só de (paleta canônica, nome).
 * Compartilhar o objeto evita recomputar `hexToRgba` em cada `NeonGradient`
 * quando a árvore inteira é redesenhada na troca de tema.
 */
const neonGradientCache = new WeakMap<AcademicPalette, Map<NeonGradientName, NeonGradientSpec>>();

/** Gradientes nomeados do mockup, resolvidos a partir da paleta do tema atual. */
export function neonGradientSpec(name: NeonGradientName, palette: AcademicPalette): NeonGradientSpec {
  let byName = neonGradientCache.get(palette);
  if (!byName) {
    byName = new Map();
    neonGradientCache.set(palette, byName);
  }
  const cached = byName.get(name);
  if (cached) return cached;

  const spec = buildNeonGradientSpec(name, palette);
  byName.set(name, spec);
  return spec;
}

function buildNeonGradientSpec(name: NeonGradientName, palette: AcademicPalette): NeonGradientSpec {
  switch (name) {
    case 'brand':
      return { angle: neonGradientAngles.brand, stops: [palette.primary, palette.accentPink] };
    case 'brandSteep':
      return { angle: neonGradientAngles.brandSteep, stops: [palette.primary, palette.accentPink] };
    case 'panel':
      return {
        angle: neonGradientAngles.panel,
        /**
         * `#101522EE` da Dolla: o card é o painel com 93% de alfa (EE/255),
         * não 96%. O alfa menor deixa o fundo/partículas respirarem sem perder
         * o contorno sólido que o `elevation` do Android usa como outline.
         */
        stops: [hexToRgba(palette.surface, 0.93), hexToRgba(palette.surfaceAlt, 0.93)],
      };
    case 'hero':
      return {
        angle: neonGradientAngles.hero,
        stops: [hexToRgba(palette.primary, 0.14), hexToRgba(palette.accentPink, 0.12)],
      };
    case 'activeNav':
      return {
        angle: neonGradientAngles.activeNav,
        stops: [hexToRgba(palette.primary, 0.2), hexToRgba(palette.accentPink, 0.18)],
      };
    case 'bubbleMe':
      return {
        angle: neonGradientAngles.bubbleMe,
        stops: [hexToRgba(palette.primary, 0.62), hexToRgba(palette.accentPink, 0.62)],
      };
    case 'mentor':
      return { angle: neonGradientAngles.brandSteep, stops: [palette.primary, palette.accentPurple] };
    case 'friend':
      return { angle: neonGradientAngles.brandSteep, stops: [palette.accentGreen, palette.primary] };
    case 'teacher':
      return { angle: neonGradientAngles.brandSteep, stops: [palette.accentOrange, palette.error] };
    case 'group':
      return { angle: neonGradientAngles.brandSteep, stops: [palette.accentPurple, palette.accentPink] };
    default:
      return { angle: neonGradientAngles.brand, stops: [palette.primary, palette.accentPink] };
  }
}

export type GlowIntensity = 'soft' | 'base' | 'strong';

/** Sombra colorida (glow) em formato de estilo aceito por `View`/`Pressable`. */
export function glowShadow(color: string, intensity: GlowIntensity = 'base') {
  const spread =
    intensity === 'strong' ? neonGlow.spreadLg : intensity === 'soft' ? neonGlow.spreadSm : neonGlow.spreadMd;
  const alpha =
    intensity === 'strong' ? neonGlow.alphaStrong : intensity === 'soft' ? neonGlow.alphaSoft : neonGlow.alphaBase;
  return {
    elevation: Math.max(2, Math.round(spread / 2)),
    shadowColor: color,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: alpha,
    shadowRadius: spread,
  };
}

/**
 * Sombra neutra de elevação (cards, painéis, FAB).
 *
 * `elevation` é do Android e a Dolla fixa valores próprios (card 4, bottom nav
 * 8) que não saem da proporção `y/1.5` do mockup. O segundo parâmetro deixa o
 * chamador cravar o número da especificação sem perder `shadowRadius`/`alpha`.
 */
export function cardShadow(level: keyof typeof neonElevation = 'card', elevation?: number) {
  const preset = neonElevation[level];
  return {
    elevation: elevation ?? Math.max(2, Math.round(preset.y / 1.5)),
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: preset.y },
    shadowOpacity: preset.alpha,
    shadowRadius: preset.blur,
  };
}

/**
 * A paleta é um objeto canônico por esquema (`Colors[scheme]`), então o
 * resultado pode ser compartilhado entre TODOS os componentes que chamam
 * `useAcademicPalette()` no mesmo tema. Sem o cache, cada consumidor recriava
 * as 14 entradas de tons a cada troca de tema.
 */
const neonTonesCache = new WeakMap<AcademicPalette, Map<boolean, TonePaletteTable>>();

/** Tons derivados do tema: fundo translúcido + texto no acento + borda suave. */
export function buildNeonTones(palette: AcademicPalette, isDark: boolean): TonePaletteTable {
  let byMode = neonTonesCache.get(palette);
  if (!byMode) {
    byMode = new Map();
    neonTonesCache.set(palette, byMode);
  }
  const cached = byMode.get(isDark);
  if (cached) return cached;

  const fillAlpha = isDark ? 0.16 : 0.12;
  const borderAlpha = isDark ? 0.32 : 0.28;
  const tone = (color: string): TonePalette => ({
    border: hexToRgba(color, borderAlpha),
    fill: hexToRgba(color, fillAlpha),
    text: color,
  });
  const tones: TonePaletteTable = {
    accent: tone(palette.accentPink),
    danger: tone(palette.error),
    ghost: { border: palette.border, fill: 'transparent', text: palette.primary },
    gold: tone(palette.accentGold),
    indigo: tone(palette.primary),
    info: tone(palette.primary),
    live: tone(palette.primary),
    neutral: {
      border: hexToRgba(palette.muted, borderAlpha),
      fill: hexToRgba(palette.muted, isDark ? 0.18 : 0.1),
      text: palette.muted,
    },
    primary: tone(palette.primary),
    recommended: tone(palette.accentGreen),
    retired: tone(palette.error),
    success: tone(palette.accentGreen),
    violet: tone(palette.accentPurple),
    warning: tone(palette.accentGold),
  };

  byMode.set(isDark, tones);
  return tones;
}
