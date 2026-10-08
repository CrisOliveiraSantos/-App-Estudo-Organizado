export const themeColors: {
  primary: { light: string; dark: string };
  background: { light: string; dark: string };
  surface: { light: string; dark: string };
  foreground: { light: string; dark: string };
  muted: { light: string; dark: string };
  border: { light: string; dark: string };
  success: { light: string; dark: string };
  warning: { light: string; dark: string };
  error: { light: string; dark: string };
  accentPink: { light: string; dark: string };
  accentGold: { light: string; dark: string };
  accentGreen: { light: string; dark: string };
  accentOrange: { light: string; dark: string };
  accentRose: { light: string; dark: string };
  accentPurple: { light: string; dark: string };
  surfaceAlt: { light: string; dark: string };
  lavender: { light: string; dark: string };
};

declare const themeConfig: {
  themeColors: typeof themeColors;
};

export default themeConfig;
