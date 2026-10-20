import { createContext, startTransition, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Appearance, View } from "react-native";
import { vars } from "nativewind";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SystemUI from "expo-system-ui";

import {
  Colors,
  SchemeColors,
  isDarkScheme,
  type ColorScheme,
  type ThemeColorPalette,
} from "@/constants/theme";
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
 * - `ThemePalette` guarda o OBJETO de cores canônico (`Colors[scheme]`). É o
 *   único contexto que `useColors()` assina.
 * - `ThemeScheme` guarda só o NOME do esquema resolvido, para
 *   `useColorScheme()`/decisões claro-vs-escuro.
 * - `ThemePreference` guarda a escolha salva (inclusive “auto”/“sistema”).
 * - `ThemeActions` é estável e nunca provoca render.
 * `useThemeContext()` continua devolvendo tudo junto para compatibilidade.
 */
const ThemeContext = createContext<ThemeContextValue | null>(null);
const ThemeSchemeContext = createContext<ColorScheme | null>(null);
const ThemePaletteContext = createContext<ThemeColorPalette | null>(null);
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

  /**
   * A paleta é a parte PESADA da troca: além dos componentes que usam
   * `useColors`, o `vars()` aplicado na raiz troca o `VariableContext` do
   * NativeWind e faz todos os elementos com `className` da árvore serem
   * reconciliados. Colocar esse estado numa transição permite que o React
   * interrompa/fatie o trabalho e mantém o toque responsivo; a preferência
   * (o "modo") é atualizada de forma síncrona, então o ícone do topbar e o
   * seletor de Ajustes respondem imediatamente.
   */
  const scheduleScheme = useCallback((scheme: ColorScheme) => {
    startTransition(() => {
      setColorSchemeState(prev => (prev === scheme ? prev : scheme));
    });
  }, []);

  const setColorScheme = useCallback((scheme: ColorScheme) => {
    setThemePreferenceState(scheme);
    scheduleScheme(scheme);
    void AsyncStorage.setItem(THEME_STORAGE_KEY, scheme);
  }, [scheduleScheme]);

  const resolvePreference = useCallback((preference: ThemePreference): ColorScheme => {
    if (preference === "system") return Appearance.getColorScheme() ?? "light";
    if (preference === "auto") return schemeForHour(new Date().getHours());
    return preference;
  }, []);

  const setThemePreference = useCallback((preference: ThemePreference) => {
    setThemePreferenceState(preference);
    scheduleScheme(resolvePreference(preference));
    void AsyncStorage.setItem(THEME_STORAGE_KEY, preference);
  }, [resolvePreference, scheduleScheme]);

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
      scheduleScheme(resolvePreference(preference));
    });
    return () => { active = false; };
  }, [resolvePreference, scheduleScheme]);

  useEffect(() => {
    if (themePreference !== "auto") return;
    const apply = (next: ColorScheme) => scheduleScheme(next);
    apply(schemeForHour(new Date().getHours()));
    const id = setInterval(() => apply(schemeForHour(new Date().getHours())), 60_000);
    return () => clearInterval(id);
  }, [scheduleScheme, themePreference]);

  useEffect(() => {
    if (themePreference !== "system") return;
    const subscription = Appearance.addChangeListener(({ colorScheme: next }) => {
      scheduleScheme(next ?? "light");
    });
    return () => subscription.remove();
  }, [scheduleScheme, themePreference]);

  /**
   * O objeto da paleta é canônico (`Colors[scheme]`) e só troca de identidade
   * quando o esquema resolvido muda. É este objeto — não o nome do modo — que
   * `useColors()` consome.
   */
  const palette = useMemo(() => Colors[colorScheme], [colorScheme]);

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
          <ThemePaletteContext.Provider value={palette}>
            <ThemeContext.Provider value={value}>
              <View style={[{ flex: 1 }, themeVariables]}>{children}</View>
            </ThemeContext.Provider>
          </ThemePaletteContext.Provider>
        </ThemeSchemeContext.Provider>
      </ThemePreferenceContext.Provider>
    </ThemeActionsContext.Provider>
  );
}

/**
 * Nome do esquema resolvido (`light`, `dark`, `neon`, ...). Use este hook só
 * quando precisar do NOME/escuro-vs-claro; para pintar a interface prefira
 * `useThemePalette()`/`useColors()`, que não assinam o contexto de preferência.
 */
export function useThemeScheme(): ColorScheme {
  const ctx = useContext(ThemeSchemeContext);
  if (!ctx) {
    throw new Error("useThemeScheme must be used within ThemeProvider");
  }
  return ctx;
}

/**
 * Objeto canônico de cores do tema ativo. É o único contexto que `useColors()`
 * assina; mudanças de preferência que resolvem para a mesma paleta não
 * redesenham quem só consome cores.
 */
export function useThemePalette(): ThemeColorPalette {
  const ctx = useContext(ThemePaletteContext);
  if (!ctx) {
    throw new Error("useThemePalette must be used within ThemeProvider");
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
