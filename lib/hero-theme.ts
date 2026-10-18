/**
 * Paleta fixa do HeroCard ("Tudo pronto para brilhar!").
 *
 * O hero é o único card do app que não segue a paleta do tema: ele tem base
 * escura própria para que o texto branco funcione em Claro, Escuro, Neon,
 * Violeta, Oceano, Amanhecer, Entardecer e Contraste. Antes as cores vinham de
 * `useAcademicColors()` (ink/muted) e, em algumas combinações de tema, o texto
 * escuro caía sobre o gradiente escuro — o card ficava ilegível.
 *
 * Este módulo é PURO (sem `react-native`) para que os testes possam medir o
 * contraste WCAG em Node.
 */

export const heroTheme = {
  /** Base sólida do card (o `NeonGradient` "hero" só acrescenta um véu de cor). */
  base: '#1E1145',
  border: 'rgba(255, 255, 255, 0.18)',
  title: '#FFFFFF',
  text: '#E7E1FA',
  overline: '#D8B4FE',
  avatarFill: 'rgba(255, 255, 255, 0.16)',
  avatarBorder: 'rgba(255, 255, 255, 0.32)',
  avatarText: '#FFFFFF',
} as const;

export type HeroTheme = typeof heroTheme;

function channel(value: number): number {
  const ratio = value / 255;
  return ratio <= 0.03928 ? ratio / 12.92 : ((ratio + 0.055) / 1.055) ** 2.4;
}

/** Luminância relativa (WCAG 2.x) de uma cor `#RRGGBB`. */
export function relativeLuminance(hex: string): number {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) throw new Error(`Cor hexadecimal inválida: ${hex}`);
  const value = match[1];
  const red = parseInt(value.slice(0, 2), 16);
  const green = parseInt(value.slice(2, 4), 16);
  const blue = parseInt(value.slice(4, 6), 16);
  return 0.2126 * channel(red) + 0.7152 * channel(green) + 0.0722 * channel(blue);
}

/** Razão de contraste WCAG entre duas cores `#RRGGBB` (1 a 21). */
export function contrastRatio(foreground: string, background: string): number {
  const first = relativeLuminance(foreground);
  const second = relativeLuminance(background);
  const lighter = Math.max(first, second);
  const darker = Math.min(first, second);
  return (lighter + 0.05) / (darker + 0.05);
}
