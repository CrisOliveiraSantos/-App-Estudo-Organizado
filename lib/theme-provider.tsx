import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Appearance, View } from "react-native";
import { colorScheme as nativewindColorScheme, vars } from "nativewind";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { SchemeColors, isDarkScheme, type ColorScheme } from "@/constants/theme";
import { schemeForHour } from "@/lib/theme-runtime";

export type ThemePreference = ColorScheme | "system" | "auto";

/**
 * Tema automático por hora do dia. As faixas agora vivem em `lib/theme-runtime.ts`
 * (fonte de verdade = mockup) e usam 6/12/18/24:
 * 0h–6h Neon · 6h–12h Amanhecer · 12h–18h Oceano · 18h–24h Entardecer.
 * O reexport mantém a API pública anterior intacta.
 */
export { schemeForHour };

type ThemeContextValue = {
  colorScheme: ColorScheme;
  themePreference: ThemePreference;
  setColorScheme: (scheme: ColorScheme) => void;
  setThemePreference: (preference: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);
/**
 * v2 (Etapa 3): a chave foi versionada de propósito. A preferência antiga
 * ("light", salva antes do shell Neon) deixa de valer, então o primeiro acesso
 * depois da Etapa 3 abre no Neon; qualquer escolha feita a partir de agora é
 * salva normalmente em `:v2`.
 */
const THEME_STORAGE_KEY = "@estudo-organizado/theme:v2";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // O mockup abre no Neon escuro: `--bg:#080a12` / `--cyan:#00e5ff` são exatamente
  // `SchemeColors.neon`. Quem já salvou outro tema em Ajustes mantém a preferência
  // (o `AsyncStorage` sobrescreve este padrão no primeiro efeito abaixo).
  const [colorScheme, setColorSchemeState] = useState<ColorScheme>("neon");
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>("neon");

  const applyScheme = useCallback((scheme: ColorScheme) => {
    const nativeBaseScheme = isDarkScheme(scheme) ? 'dark' : 'light';
    nativewindColorScheme.set(nativeBaseScheme);
    Appearance.setColorScheme?.(nativeBaseScheme);
    if (typeof document !== "undefined") {
      const root = document.documentElement;
      root.dataset.theme = nativeBaseScheme;
      root.classList.toggle("dark", nativeBaseScheme === "dark");
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

  const resolvePreference = useCallback((preference: ThemePreference): ColorScheme => {
    if (preference === "system") return Appearance.getColorScheme() ?? "light";
    if (preference === "auto") return schemeForHour(new Date().getHours());
    return preference;
  }, []);

  const setThemePreference = useCallback((preference: ThemePreference) => {
    const resolved = resolvePreference(preference);
    setThemePreferenceState(preference);
    setColorSchemeState(resolved);
    applyScheme(resolved);
    void AsyncStorage.setItem(THEME_STORAGE_KEY, preference);
  }, [applyScheme, resolvePreference]);

  useEffect(() => {
    applyScheme(colorScheme);
  }, [applyScheme, colorScheme]);

  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem(THEME_STORAGE_KEY).then(saved => {
      const validThemes: ThemePreference[] = ['light', 'dark', 'violet', 'ocean', 'contrast', 'sunrise', 'sunset', 'neon', 'system', 'auto'];
      if (!active || !validThemes.includes(saved as ThemePreference)) return;
      const preference = saved as ThemePreference;
      const resolved = resolvePreference(preference);
      setThemePreferenceState(preference);
      setColorSchemeState(resolved);
      applyScheme(resolved);
    });
    return () => { active = false; };
  }, [applyScheme, resolvePreference]);

  useEffect(() => {
    if (themePreference !== "auto") return;
    const apply = (next: ColorScheme) => {
      setColorSchemeState(prev => (prev === next ? prev : next));
      applyScheme(next);
    };
    apply(schemeForHour(new Date().getHours()));
    const id = setInterval(() => apply(schemeForHour(new Date().getHours())), 60_000);
    return () => clearInterval(id);
  }, [applyScheme, themePreference]);

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
