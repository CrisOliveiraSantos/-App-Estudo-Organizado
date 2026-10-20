import { Platform } from "react-native";

import themeConfig from "@/theme.config";

export type ColorScheme =
  | "light"
  | "dark"
  | "violet"
  | "ocean"
  | "contrast"
  | "sunrise"
  | "sunset"
  | "neon";

/** Temas com base escura, usados para definir a base do NativeWind/Appearance. */
export const DarkSchemes: ColorScheme[] = ["dark", "sunset", "neon"];

export function isDarkScheme(scheme: ColorScheme): boolean {
  return DarkSchemes.includes(scheme);
}

export const ThemeColors = themeConfig.themeColors;

type ThemeColorTokens = typeof ThemeColors;
type ThemeColorName = keyof ThemeColorTokens;
type BaseColorScheme = "light" | "dark";
type SchemePalette = Record<BaseColorScheme, Record<ThemeColorName, string>>;
type SchemePaletteItem = Record<ThemeColorName, string>;

function buildSchemePalette(colors: ThemeColorTokens): SchemePalette {
  const palette: SchemePalette = {
    light: {} as SchemePalette["light"],
    dark: {} as SchemePalette["dark"],
  };

  (Object.keys(colors) as ThemeColorName[]).forEach((name) => {
    const swatch = colors[name];
    palette.light[name] = swatch.light;
    palette.dark[name] = swatch.dark;
  });

  return palette;
}

const baseSchemeColors = buildSchemePalette(ThemeColors);

export const SchemeColors: Record<ColorScheme, Record<ThemeColorName, string>> = {
  ...baseSchemeColors,
  violet: {
    ...baseSchemeColors.light,
    primary: '#7A4DE8', background: '#FBF9FF', surface: '#FFFFFF', foreground: '#24183B', muted: '#6F6490', border: '#E5DDFB', success: '#17845A', warning: '#A76700', error: '#B3261E',
  },
  ocean: {
    ...baseSchemeColors.light,
    primary: '#007F9E', background: '#F2FAFC', surface: '#FFFFFF', foreground: '#123042', muted: '#5C7580', border: '#CBE6EC', success: '#177B5A', warning: '#A56600', error: '#B3261E',
  },
  contrast: {
    ...baseSchemeColors.light,
    primary: '#0000EE', background: '#FFFFFF', surface: '#FFFFFF', foreground: '#000000', muted: '#333333', border: '#000000', success: '#006B2E', warning: '#8A4B00', error: '#B00020',
  },
  sunrise: {
    ...baseSchemeColors.light,
    primary: '#E4572E', background: '#FFF8F1', surface: '#FFFFFF', foreground: '#3B2418', muted: '#8A6B57', border: '#F4DAC7', success: '#1F9D68', warning: '#D98E04', error: '#C2414B',
    accentPink: '#E34BFF', accentGold: '#FFD166', accentGreen: '#1F9D68', accentOrange: '#FF9F43', accentRose: '#FF6B9D', accentPurple: '#7C3AED',
  },
  sunset: {
    ...baseSchemeColors.dark,
    primary: '#FF8A5B', background: '#1B1023', surface: '#251630', foreground: '#FDEBE3', muted: '#B7A0C2', border: '#3B2748', success: '#5AD1A0', warning: '#F1BE55', error: '#FF7D94',
    accentPink: '#FF6B9D', accentGold: '#FFD166', accentGreen: '#5AD1A0', accentOrange: '#FF7A30', accentRose: '#FF6B9D', accentPurple: '#9333EA',
  },
  /**
   * Neon: a paleta do mockup oficial da Dolla. Os valores abaixo são o
   * contrato verificado por `tests/theme-runtime.test.ts` e espelhados em
   * `dollaTokens.color` (`lib/theme-runtime.ts`) — mudar um sem o outro quebra
   * o teste de propósito.
   */
  neon: {
    ...baseSchemeColors.dark,
    primary: '#00E5FF',
    background: '#080A12',
    surface: '#101522',
    foreground: '#F4F7FF',
    muted: '#91A0B8',
    border: '#202B40',
    success: '#49E5B1',
    warning: '#FFD166',
    error: '#FF4D6D',
    accentPink: '#E34BFF',
    accentGold: '#FFD166',
    accentGreen: '#49E5B1',
    accentOrange: '#FF9F43',
    accentRose: '#FF6B9D',
    accentPurple: '#9333EA',
    surfaceAlt: '#0C111E',
  },
};

type RuntimePalette = SchemePaletteItem & {
  text: string;
  background: string;
  tint: string;
  icon: string;
  tabIconDefault: string;
  tabIconSelected: string;
  border: string;
};

function buildRuntimePalette(scheme: ColorScheme): RuntimePalette {
  const base = SchemeColors[scheme];
  return {
    ...base,
    text: base.foreground,
    background: base.background,
    tint: base.primary,
    icon: base.muted,
    tabIconDefault: base.muted,
    tabIconSelected: base.primary,
    border: base.border,
  };
}

export const Colors = {
  light: buildRuntimePalette("light"),
  dark: buildRuntimePalette("dark"),
  violet: buildRuntimePalette("violet"),
  ocean: buildRuntimePalette("ocean"),
  contrast: buildRuntimePalette("contrast"),
  sunrise: buildRuntimePalette("sunrise"),
  sunset: buildRuntimePalette("sunset"),
  neon: buildRuntimePalette("neon"),
} satisfies Record<ColorScheme, RuntimePalette>;

export type ThemeColorPalette = (typeof Colors)[ColorScheme];

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: "system-ui",
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: "ui-serif",
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: "ui-rounded",
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
