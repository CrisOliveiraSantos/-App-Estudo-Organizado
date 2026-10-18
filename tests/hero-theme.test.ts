import { describe, expect, it } from 'vitest';
import { contrastRatio, heroTheme, relativeLuminance } from '../lib/hero-theme';

describe('heroTheme', () => {
  it('mantém título, texto e overline com contraste mínimo AA sobre a base', () => {
    expect(contrastRatio(heroTheme.title, heroTheme.base)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(heroTheme.text, heroTheme.base)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(heroTheme.overline, heroTheme.base)).toBeGreaterThanOrEqual(4.5);
  });

  it('usa base escura fixa para não depender do tema ativo', () => {
    expect(relativeLuminance(heroTheme.base)).toBeLessThan(0.05);
    expect(heroTheme.avatarText).toBe('#FFFFFF');
  });

  it('calcula os extremos conhecidos da escala WCAG', () => {
    expect(contrastRatio('#FFFFFF', '#000000')).toBeCloseTo(21, 1);
    expect(contrastRatio('#000000', '#000000')).toBeCloseTo(1, 5);
  });

  it('rejeita cores fora do formato hexadecimal de seis dígitos', () => {
    expect(() => relativeLuminance('roxo')).toThrow(/hexadecimal/i);
  });
});
