import { describe, expect, it } from 'vitest';

import {
  cardShadow,
  dollaTokens,
  hexToRgba,
  neonGradientAngles,
  neonGradientSpec,
  neonRadius,
  neonType,
  type AcademicPalette,
} from '../lib/theme-runtime';
import { neonFabSize } from '../components/neon/nav-items';

/**
 * Paleta do tema Neon copiada de `SchemeColors.neon` (`lib/_core/theme.ts`).
 * O literal evita importar `constants/theme` aqui: aquele módulo importa
 * `react-native` (Platform) e o vitest roda em Node, sem o runtime nativo.
 */
const neonPalette: AcademicPalette = {
  accentGold: '#FFD166',
  accentGreen: '#49E5B1',
  accentOrange: '#FF9F43',
  accentPink: '#E34BFF',
  accentPurple: '#9333EA',
  accentRose: '#FF6B9D',
  background: '#080A12',
  border: '#202B40',
  error: '#FF4D6D',
  foreground: '#F4F7FF',
  lavender: '#252B52',
  muted: '#91A0B8',
  primary: '#00E5FF',
  success: '#49E5B1',
  surface: '#101522',
  surfaceAlt: '#0C111E',
  warning: '#FFD166',
};

describe('dollaTokens', () => {
  it('registra a paleta exata da especificação da Dolla', () => {
    expect(dollaTokens.color.background).toBe('#080A12');
    expect(dollaTokens.color.panel).toBe('#101522');
    expect(dollaTokens.color.cyan).toBe('#00E5FF');
    expect(dollaTokens.color.pink).toBe('#E34BFF');
    expect(dollaTokens.color.border).toBe('#202B40');
    expect(dollaTokens.color.text).toBe('#F4F7FF');
  });

  it('descreve o card como painel translúcido (#101522EE) com borda de 1 px', () => {
    expect(dollaTokens.color.panelTranslucent).toBe('#101522EE');
    expect(dollaTokens.elevation.card).toBe(4);
    expect(dollaTokens.radius.card).toBe(20);
    expect(dollaTokens.layout.cardPadding).toBe(20);
  });

  it('usa rgba(12,17,30,0.95) na pílula inferior', () => {
    expect(dollaTokens.color.navSurface).toBe('rgba(12, 17, 30, 0.95)');
    expect(hexToRgba('#0C111E', 0.95)).toBe(dollaTokens.color.navSurface);
    expect(dollaTokens.elevation.nav).toBe(8);
    expect(neonRadius.nav).toBe(dollaTokens.radius.nav);
  });

  it('define o botão primário com gradiente de 100° ciano→rosa', () => {
    expect(dollaTokens.gradient).toEqual({ angle: 100, from: '#00E5FF', to: '#E34BFF' });
    expect(neonGradientAngles.brand).toBe(dollaTokens.gradient.angle);
    expect(neonGradientSpec('brand', neonPalette)).toEqual({
      angle: 100,
      stops: ['#00E5FF', '#E34BFF'],
    });
  });

  it('pinta o FAB/Hero com o gradiente inclinado (140°) da marca', () => {
    expect(neonGradientSpec('brandSteep', neonPalette)).toEqual({
      angle: 140,
      stops: ['#00E5FF', '#E34BFF'],
    });
  });
});

describe('cardShadow', () => {
  it('aceita a elevação da especificação sem perder blur/alpha do mockup', () => {
    const dolla = cardShadow('card', dollaTokens.elevation.card);
    expect(dolla.elevation).toBe(4);
    expect(dolla.shadowRadius).toBe(40);
    expect(dolla.shadowOpacity).toBeCloseTo(0.32);
  });

  it('mantém a elevação proporcional quando o chamador não informa nada', () => {
    expect(cardShadow('card').elevation).toBe(8);
    expect(cardShadow('floating', dollaTokens.elevation.nav).elevation).toBe(8);
  });
});

describe('geometria do shell', () => {
  it('fixa o FAB em 64×64 em qualquer largura', () => {
    expect(neonFabSize(false)).toBe(64);
    expect(neonFabSize(true)).toBe(64);
    expect(dollaTokens.layout.fabSize).toBe(64);
  });

  it('mantém o título da topbar em 26 px / 700 (o peso da Dolla)', () => {
    expect(neonType.screenTitle).toEqual({ letterSpacing: -0.8, size: 26, weight: '700' });
  });
});

describe('panel', () => {
  it('usa 93% de alfa (EE/255) nas duas paradas do gradiente de card', () => {
    expect(neonGradientSpec('panel', neonPalette).stops).toEqual([
      'rgba(16, 21, 34, 0.93)',
      'rgba(12, 17, 30, 0.93)',
    ]);
  });
});
