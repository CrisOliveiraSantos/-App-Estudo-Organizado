import { Colors, type ColorScheme, type ThemeColorPalette } from "@/constants/theme";
import { useThemePalette } from "@/lib/theme-provider";

/**
 * Returns the current theme's color palette.
 * Usage: const colors = useColors(); then colors.text, colors.background, etc.
 *
 * Assina só o contexto da PALETA (o objeto pronto), não o da preferência/modo.
 * Quando um tema é pedido explicitamente, devolve o objeto canônico daquele
 * tema — útil para prévias de tema.
 */
export function useColors(colorSchemeOverride?: ColorScheme): ThemeColorPalette {
  const palette = useThemePalette();
  return colorSchemeOverride ? Colors[colorSchemeOverride] : palette;
}
