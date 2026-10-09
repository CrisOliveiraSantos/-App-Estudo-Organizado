/**
 * Metadados do shell Neon (Etapa 2).
 *
 * Fonte de verdade única, copiada do objeto `pages` do mockup
 * (`cris-mockup2.html`, linhas 307-313): a bottom nav, a sidebar e o topbar
 * leem daqui, então rótulo/ícone/eyebrow/título nunca saem de sincronia.
 */

import type { ComponentProps } from 'react';

import type { IconSymbol } from '@/components/ui/icon-symbol';

/** Nomes das rotas de `app/(tabs)` — o que `<Tabs.Screen name>` espera. */
export type NeonTabName = 'index' | 'editor' | 'planning' | 'library' | 'chat' | 'settings';

/** Caminhos navegáveis (rotas tipadas: `app.config.ts` tem `typedRoutes: true`). */
export type NeonRoute = '/' | '/chat' | '/editor' | '/library' | '/planning' | '/settings';

export type NeonNavItem = {
  name: NeonTabName;
  route: NeonRoute;
  /** Rótulo da bottom nav e da sidebar (`pages[x]` do mockup). */
  label: string;
  icon: ComponentProps<typeof IconSymbol>['name'];
  /** Eyebrow do topbar (`pages[x].eyebrow`). */
  eyebrow: string;
  /** Título do topbar (`pages[x].title`). */
  title: string;
};

const HOME: NeonNavItem = {
  eyebrow: 'SEU ESPAÇO DE ESTUDOS',
  icon: 'house.fill',
  label: 'Hoje',
  name: 'index',
  route: '/',
  title: 'Bem-vinda de volta! 💜',
};

export const NEON_NAV: readonly NeonNavItem[] = [
  HOME,
  { eyebrow: 'IDEIAS QUE VIRAM CONHECIMENTO', icon: 'note.text', label: 'Editor', name: 'editor', route: '/editor', title: 'Seu Editor' },
  { eyebrow: 'UM PASSO DE CADA VEZ', icon: 'chart.bar.fill', label: 'Planejamento', name: 'planning', route: '/planning', title: 'Cronograma e Metas' },
  { eyebrow: 'TUDO NO SEU LUGAR', icon: 'book.fill', label: 'Biblioteca', name: 'library', route: '/library', title: 'Sua Biblioteca' },
  { eyebrow: 'CONEXÕES', icon: 'bubble.left.and.bubble.right.fill', label: 'Conversas', name: 'chat', route: '/chat', title: 'Conversas' },
  { eyebrow: 'DO SEU JEITO', icon: 'gearshape.fill', label: 'Ajustes', name: 'settings', route: '/settings', title: 'Preferências' },
];

/** Métricas do mockup: `.app` 1480/26 · `.sidebar` 245 · `.bottomnav` 920/12-20 · `.fab` 64-56. */
export const NEON_LAYOUT = {
  breakpoint: 900,
  gapTight: 15,
  gapWide: 22,
  navBottom: 12,
  navBottomWide: 20,
  navHeight: 68,
  navHeightWide: 80,
  navMaxWidth: 920,
  shellMaxWidth: 1480,
  shellPadding: 15,
  shellPaddingWide: 26,
  sidebarWidth: 245,
} as const;

export const neonNavHeight = (wide: boolean) => (wide ? NEON_LAYOUT.navHeightWide : NEON_LAYOUT.navHeight);
export const neonNavBottom = (wide: boolean) => (wide ? NEON_LAYOUT.navBottomWide : NEON_LAYOUT.navBottom);

/**
 * Folga que o fim do conteúdo precisa reservar para não ficar sob a pílula
 * (`.app{padding-bottom:100px}` do mockup no mobile — `neonNavClearance(false)`
 * devolve exatamente 100). A pílula é `position:absolute` dentro da cena, então
 * não reserva espaço sozinha: quem rola até o fim soma esta folga ao próprio
 * `paddingBottom`. O `insets.bottom` não entra aqui — o `SafeAreaView` da tela
 * já o aplica por fora.
 */
export const neonNavClearance = (wide: boolean) => neonNavHeight(wide) + neonNavBottom(wide) + (wide ? 24 : 20);

/** Item de navegação do caminho atual (fallback: Hoje). */
export function neonItemForPath(pathname: string | null | undefined): NeonNavItem {
  const path = pathname ?? '/';
  const match = NEON_NAV.find(item => (item.route === '/' ? path === '/' : path.startsWith(item.route)));
  return match ?? HOME;
}
