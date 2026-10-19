import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Appearance, View } from "react-native";
import { vars } from "nativewind";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SystemUI from "expo-system-ui";

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

type ThemeActionsValue = Pick<ThemeContextValue, "setColorScheme" | "setThemePreference">;

/**
 * Contextos separados de propósito:
 * - `ThemeScheme` só muda quando a paleta RESOLVIDA muda. É o único que
 *   `useColors()`/`useColorScheme()` assinam, então uma alteração de preferência
 *   que resolve para o mesmo tema não redesenha a árvore inteira.
 * - `ThemePreference` guarda a escolha salva (inclusive “auto”/“sistema”).
 * - `ThemeActions` é estável e nunca provoca render.
 * `useThemeContext()` continua devolvendo tudo junto para compatibilidade.
 */
const ThemeContext = createContext<ThemeContextValue | null>(null);
const ThemeSchemeContext = createContext<ColorScheme | null>(null);
const ThemePreferenceContext = createContext<ThemePreference | null>(null);
const ThemeActionsContext = createContext<ThemeActionsValue | null>(null);
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
  /**
   * `applyScheme` não chama `Appearance.setColorScheme` nem o setter global do
   * NativeWind: neste app todas as superfícies usam a paleta via `useColors`/
   * `vars`, e mexer na aparência nativa pode reconfigurar a Activity no Android
   * (a origem do engasgo). A barra de status é controlada por `ThemedStatusBar`.
   */
  const appliedSchemeRef = useRef<ColorScheme | null>(null);

  const applyScheme = useCallback((scheme: ColorScheme) => {
    if (appliedSchemeRef.current === scheme) return;
    appliedSchemeRef.current = scheme;
    const nativeBaseScheme = isDarkScheme(scheme) ? 'dark' : 'light';
    /**
     * Fundo da JANELA/raiz segue o tema ativo. Sem isto vale a cor padrão do root
     * view (branca no Android), que aparece em qualquer sliver que as telas não
     * pintam — área da barra de navegação do sistema, moldura do edge-to-edge
     * (`app.config.ts`) e o cross-fade entre abas. Num tema escuro esse sliver é
     * exatamente a "faixa branca residual". Melhor esforço: se o binário não
     * tiver o módulo nativo, a promessa é rejeitada e engolida.
     */
    void SystemUI.setBackgroundColorAsync(SchemeColors[scheme].background).catch(() => undefined);
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
    void AsyncStorage.setItem(THEME_STORAGE_KEY, scheme);
  }, []);

  const resolvePreference = useCallback((preference: ThemePreference): ColorScheme => {
    if (preference === "system") return Appearance.getColorScheme() ?? "light";
    if (preference === "auto") return schemeForHour(new Date().getHours());
    return preference;
  }, []);

  const setThemePreference = useCallback((preference: ThemePreference) => {
    setThemePreferenceState(preference);
    setColorSchemeState(resolvePreference(preference));
    void AsyncStorage.setItem(THEME_STORAGE_KEY, preference);
  }, [resolvePreference]);

  useEffect(() => {
    applyScheme(colorScheme);
  }, [applyScheme, colorScheme]);

  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem(THEME_STORAGE_KEY).then(saved => {
      const validThemes: ThemePreference[] = ['light', 'dark', 'violet', 'ocean', 'contrast', 'sunrise', 'sunset', 'neon', 'system', 'auto'];
      if (!active || !validThemes.includes(saved as ThemePreference)) return;
      const preference = saved as ThemePreference;
      setThemePreferenceState(preference);
      setColorSchemeState(resolvePreference(preference));
    });
    return () => { active = false; };
  }, [resolvePreference]);

  useEffect(() => {
    if (themePreference !== "auto") return;
    const apply = (next: ColorScheme) => {
      setColorSchemeState(prev => (prev === next ? prev : next));
    };
    apply(schemeForHour(new Date().getHours()));
    const id = setInterval(() => apply(schemeForHour(new Date().getHours())), 60_000);
    return () => clearInterval(id);
  }, [themePreference]);

  useEffect(() => {
    if (themePreference !== "system") return;
    const subscription = Appearance.addChangeListener(({ colorScheme: next }) => {
      setColorSchemeState(next ?? "light");
    });
    return () => subscription.remove();
  }, [themePreference]);

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

  const actions = useMemo(
    () => ({ setColorScheme, setThemePreference }),
    [setColorScheme, setThemePreference],
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
    <ThemeActionsContext.Provider value={actions}>
      <ThemePreferenceContext.Provider value={themePreference}>
        <ThemeSchemeContext.Provider value={colorScheme}>
          <ThemeContext.Provider value={value}>
            <View style={[{ flex: 1 }, themeVariables]}>{children}</View>
          </ThemeContext.Provider>
        </ThemeSchemeContext.Provider>
      </ThemePreferenceContext.Provider>
    </ThemeActionsContext.Provider>
  );
}

/** Só a paleta resolvida. É o contexto consumido por `useColors()`. */
export function useThemeScheme(): ColorScheme {
  const ctx = useContext(ThemeSchemeContext);
  if (!ctx) {
    throw new Error("useThemeScheme must be used within ThemeProvider");
  }
  return ctx;
}

export function useThemePreference(): ThemePreference {
  const ctx = useContext(ThemePreferenceContext);
  if (!ctx) {
    throw new Error("useThemePreference must be used within ThemeProvider");
  }
  return ctx;
}

export function useThemeActions(): ThemeActionsValue {
  const ctx = useContext(ThemeActionsContext);
  if (!ctx) {
    throw new Error("useThemeActions must be used within ThemeProvider");
  }
  return ctx;
}

export function useThemeContext(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useThemeContext must be used within ThemeProvider");
  }
  return ctx;
}
