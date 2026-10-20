/**
 * Metadados do shell Neon (Etapa 2).
 *
 * Fonte de verdade única, copiada do objeto `pages` do mockup
 * (`cris-mockup2.html`, linhas 307-313): a bottom nav, a sidebar e o topbar
 * leem daqui, então rótulo/ícone/eyebrow/título nunca saem de sincronia.
 */

import type { ComponentProps } from 'react';

import type { IconSymbol } from '@/components/ui/icon-symbol';
import { dollaTokens } from '@/lib/theme-runtime';

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
   * 84/92 (e não os 76/88 anteriores): a Dolla pede `paddingVertical: 10` nos
   * botões da pílula, e o botão já carrega ícone (30) + respiro (3-4) + rótulo
   * (13) + os 20 px de padding = 66-67 px. Com os 10 px de padding da própria
   * pílula isso pedia 78-83 px de caixa; 76 cortava o rótulo. Os 84/92 deixam
   * 6-9 px de folga para `fontScale` alta e para o inset do aparelho.
   */
  navHeight: 84,
  navHeightWide: 92,
  navMaxWidth: 920,
  /** `paddingVertical` dos botões da pílula (Dolla: 10). */
  navPadding: dollaTokens.layout.navPaddingVertical,
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
 * Geometria do FAB da Cris (`.fab` do mockup, linhas 165-167 + 209).
 *
 * A especificação da Dolla fixa **64×64 em qualquer largura** (`dollaTokens.
 * layout.fabSize`) — antes eram 56 no celular. O parâmetro `wide` continua na
 * assinatura porque o FAB e as folgas das telas já o passam, mas o tamanho não
 * muda mais com a largura: era exatamente a diferença entre o FAB "genérico" e
 * o da Dolla.
 */
const neonFabGap = 16;
export const neonFabSize = (_wide: boolean) => dollaTokens.layout.fabSize;

/**
 * Folga que o fim de uma lista precisa reservar quando o FAB paira sobre ela:
 * pílula + o respiro do FAB + a altura do FAB. Devolve **176** no celular
 * (84 + 12 + 16 + 64) e **192** no desktop (92 + 20 + 16 + 64), sempre acima do
 * `insets.bottom`. `neonNavClearance` (116/136) cobre só a pílula — com ele o
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
