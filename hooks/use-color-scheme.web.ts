import { useEffect, useState } from "react";
import { useThemeScheme } from "@/lib/theme-provider";

/**
 * Para suportar a renderização estática, o valor precisa ser recalculado no cliente (web).
 * Depois da hidratação, devolvemos o esquema resolvido pelo ThemeProvider — isso inclui
 * os temas personalizados (Violeta, Oceano, Amanhecer, Entardecer, Neon) e o modo
 * automático por hora do dia. Antes, este hook usava o esquema do sistema, então a troca
 * de tema não refletia em tempo real nos componentes que usam `useColors()`.
 */
export function useColorScheme() {
  const [hasHydrated, setHasHydrated] = useState(false);
  const colorScheme = useThemeScheme();

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  return hasHydrated ? colorScheme : "light";
}
