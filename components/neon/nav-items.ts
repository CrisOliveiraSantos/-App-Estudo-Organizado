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
  /**
   * 76/88 (e não 68/80): a pílula tem de caber ícone (26) + respiro + rótulo
   * (13) + os paddings. Com 68 o conteúdo pedia 51 px dentro de uma caixa de 50
   * — qualquer ganho de fonte/inset do aparelho fatiaba o ícone e sumia com o
   * rótulo (teste real no Android, 2026-10-13).
   */
  navHeight: 76,
  navHeightWide: 88,
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
 * devolve 108 com a pílula de 76, e devolvia 100 com a de 68). A pílula é
 * `position:absolute` dentro da cena, então
 * não reserva espaço sozinha: quem rola até o fim soma esta folga ao próprio
 * `paddingBottom`. O `insets.bottom` não entra aqui — o `SafeAreaView` da tela
 * já o aplica por fora.
 */
export const neonNavClearance = (wide: boolean) => neonNavHeight(wide) + neonNavBottom(wide) + (wide ? 24 : 20);

/**
 * Geometria do FAB da Cris (`.fab` do mockup, linhas 165-167 + 209): 64 px no
 * desktop e 56 no celular, pairando 16 px acima da pílula. Os números vivem
 * aqui para `components/neon/fab.tsx` (quem posiciona) e as telas (quem reserva
 * a folga do fim da lista) nunca divergirem.
 */
const neonFabGap = 16;
export const neonFabSize = (wide: boolean) => (wide ? 64 : 56);

/**
 * Folga que o fim de uma lista precisa reservar quando o FAB paira sobre ela:
 * pílula + o respiro do FAB + a altura do FAB. Devolve **160** no celular
 * (76 + 12 + 16 + 56) e **188** no desktop (88 + 20 + 16 + 64), sempre acima do
 * `insets.bottom`. `neonNavClearance` (108/132) cobre só a pílula — com ele o
 * FAB ficava sobre o último card (visual da Home, 2026-10-12).
 */
export const neonFabClearance = (wide: boolean) =>
  neonNavHeight(wide) + neonNavBottom(wide) + neonFabGap + neonFabSize(wide);

/** Item de navegação do caminho atual (fallback: Hoje). */
export function neonItemForPath(pathname: string | null | undefined): NeonNavItem {
  const path = pathname ?? '/';
  const match = NEON_NAV.find(item => (item.route === '/' ? path === '/' : path.startsWith(item.route)));
  return match ?? HOME;
}
