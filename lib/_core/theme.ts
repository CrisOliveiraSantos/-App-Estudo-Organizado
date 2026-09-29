import { Platform } from "react-native";

import themeConfig from "@/theme.config";

export type ColorScheme = "light" | "dark" | "violet" | "ocean" | "contrast";

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
