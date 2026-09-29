import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Appearance, View, useColorScheme as useSystemColorScheme } from "react-native";
import { colorScheme as nativewindColorScheme, vars } from "nativewind";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { SchemeColors, type ColorScheme } from "@/constants/theme";

export type ThemePreference = ColorScheme | "system";

type ThemeContextValue = {
  colorScheme: ColorScheme;
  themePreference: ThemePreference;
  setColorScheme: (scheme: ColorScheme) => void;
  setThemePreference: (preference: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);
const THEME_STORAGE_KEY = "@estudo-organizado/theme";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useSystemColorScheme() ?? "light";
  const [colorScheme, setColorSchemeState] = useState<ColorScheme>(systemScheme);
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>("system");

  const applyScheme = useCallback((scheme: ColorScheme) => {
    const nativeBaseScheme = scheme === 'dark' ? 'dark' : 'light';
    nativewindColorScheme.set(nativeBaseScheme);
    Appearance.setColorScheme?.(nativeBaseScheme);
    if (typeof document !== "undefined") {
      const root = document.documentElement;
      root.dataset.theme = scheme;
      root.classList.toggle("dark", scheme === "dark");
      const palette = SchemeColors[scheme];
      Object.entries(palette).forEach(([token, value]) => {
        root.style.setProperty(`--color-${token}`, value);
      });
    }
  }, []);

  const setColorScheme = useCallback((scheme: ColorScheme) => {
    setThemePreferenceState(scheme);
    setColorSchemeState(scheme);
    applyScheme(scheme);
    void AsyncStorage.setItem(THEME_STORAGE_KEY, scheme);
  }, [applyScheme]);

  const setThemePreference = useCallback((preference: ThemePreference) => {
    const resolved = preference === "system" ? (Appearance.getColorScheme() ?? "light") : preference;
    setThemePreferenceState(preference);
    setColorSchemeState(resolved);
    applyScheme(resolved);
    void AsyncStorage.setItem(THEME_STORAGE_KEY, preference);
  }, [applyScheme]);

  useEffect(() => {
    applyScheme(colorScheme);
  }, [applyScheme, colorScheme]);

  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem(THEME_STORAGE_KEY).then(saved => {
      const validThemes: ThemePreference[] = ['light', 'dark', 'violet', 'ocean', 'contrast', 'system'];
      if (!active || !validThemes.includes(saved as ThemePreference)) return;
      const preference = saved as ThemePreference;
      const resolved = preference === "system" ? (Appearance.getColorScheme() ?? "light") : preference;
      setThemePreferenceState(preference);
      setColorSchemeState(resolved);
      applyScheme(resolved);
    });
    return () => { active = false; };
  }, [applyScheme]);

  useEffect(() => {
    if (themePreference !== "system") return;
    const subscription = Appearance.addChangeListener(({ colorScheme: next }) => {
      const resolved = next ?? "light";
      setColorSchemeState(resolved);
      applyScheme(resolved);
    });
    return () => subscription.remove();
  }, [applyScheme, themePreference]);

  const themeVariables = useMemo(
    () =>
      vars({
        "color-primary": SchemeColors[colorScheme].primary,
        "color-background": SchemeColors[colorScheme].background,
        "color-surface": SchemeColors[colorScheme].surface,
        "color-foreground": SchemeColors[colorScheme].foreground,
        "color-muted": SchemeColors[colorScheme].muted,
        "color-border": SchemeColors[colorScheme].border,
        "color-success": SchemeColors[colorScheme].success,
        "color-warning": SchemeColors[colorScheme].warning,
        "color-error": SchemeColors[colorScheme].error,
      }),
    [colorScheme],
  );

  const value = useMemo(
    () => ({
      colorScheme,
      themePreference,
      setColorScheme,
      setThemePreference,
    }),
    [colorScheme, themePreference, setColorScheme, setThemePreference],
  );
  return (
    <ThemeContext.Provider value={value}>
      <View style={[{ flex: 1 }, themeVariables]}>{children}</View>
    </ThemeContext.Provider>
  );
}

export function useThemeContext(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useThemeContext must be used within ThemeProvider");
  }
  return ctx;
}
