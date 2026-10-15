/**
 * Partição do `style` de um card em **duas caixas** (ver `AcademicCard`).
 *
 * Por que partir o estilo: o card passou a ser duas views — a **externa** carrega
 * `elevation`/`cardShadow` e nada mais (sem `overflow`, sem borda, sem gradiente
 * e sem filhos pintando por cima) e a **interna** desenha a borda, o raio, o
 * `overflow: 'hidden'` e o SVG do gradiente. Os chamadores, porém, passam um
 * `style` só (`{ flex: 1, marginBottom: 11, padding: 15 }`, por exemplo), com
 * props de layout e de conteúdo misturadas. Sem a partição, `padding: 15` na
 * caixa externa viraria espaço morto entre a sombra e a borda, e `marginBottom:
 * 11` na caixa interna entraria no retângulo que o `elevation` usa como contorno.
 *
 * Regra: `padding*` (espaço do conteúdo em relação à borda), `border*`,
 * `backgroundColor` e `overflow` (pintura e recorte visíveis) mais o arranjo do
 * conteúdo (`alignItems`, `flexDirection`, `gap`, …) ficam na caixa **interna**.
 * Tudo o mais — `margin*`, `flex*`, `alignSelf`, `width`/`height`/`min*`/`max*`,
 * `position`, `zIndex`, `opacity`, `transform` e as sombras (`elevation`,
 * `shadow*`) — vai para a **externa**, que é quem ocupa o espaço no layout.
 * Chave desconhecida cai na externa de propósito: é o lado que não pode perder
 * layout.
 *
 * Módulo puro (só `import type`, apagado no build) — exercitado por
 * `tests/card-style.test.ts`.
 */

import type { ViewStyle } from 'react-native';

/** Chaves exatas que desenham/arrumam o *conteúdo* do card (caixa interna). */
const CONTENT_KEYS = new Set<string>([
  'alignContent',
  'alignItems',
  'backgroundColor',
  'columnGap',
  'flexDirection',
  'flexWrap',
  'gap',
  'justifyContent',
  'overflow',
  'rowGap',
]);

/**
 * Prefixos que pertencem à caixa interna: `padding*` (espaçamento do conteúdo) e
 * `border*` (raio, cor e espessura da borda — a pintura visível do card).
 */
const CONTENT_PREFIXES = ['border', 'padding'];

function isContentKey(key: string): boolean {
  return CONTENT_KEYS.has(key) || CONTENT_PREFIXES.some(prefix => key.startsWith(prefix));
}

/**
 * Parte um `style` **já achatado** (`StyleSheet.flatten`) em `{ box, content }`:
 * `box` é a caixa externa (layout + sombra) e `content` a interna (borda/raio/
 * recorte + arranjo do conteúdo). Valores `undefined`/`null` são descartados.
 */
export function splitCardStyle(flat?: ViewStyle | null): { box: ViewStyle; content: ViewStyle } {
  const entries = Object.entries(flat ?? {}).filter(([, value]) => value !== undefined && value !== null);
  const pick = (content: boolean): ViewStyle =>
    Object.fromEntries(entries.filter(([key]) => isContentKey(key) === content)) as unknown as ViewStyle;
  return { box: pick(false), content: pick(true) };
}
