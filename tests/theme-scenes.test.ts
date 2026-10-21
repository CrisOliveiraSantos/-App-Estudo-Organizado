import { describe, expect, it } from 'vitest';

import {
  neonFonts,
  themePaletteFor,
  themePalettes,
  themeSceneByScheme,
  themeSceneFor,
  type ThemeScene,
} from '../lib/theme-runtime';
import type { ColorScheme } from '../lib/_core/theme';

/**
 * Os quatro temas da Dolla são um contrato de produto: cada um tem cena de
 * fundo própria, três paradas de céu, um véu de contraste dentro de 0-1 e uma
 * paleta de UI correspondente. Se alguém trocar um esquema por outro sem
 * revisar a arte, o fundo passa a mentir — e este teste quebra de propósito.
 */
const SCENES: ThemeScene[] = ['manha', 'tarde', 'noite', 'madrugada'];
const HEX = /^#[0-9A-Fa-f]{6}$/;

describe('themePalettes', () => {
  it('tem exatamente os quatro temas, com rótulos únicos', () => {
    expect(Object.keys(themePalettes).sort()).toEqual([...SCENES].sort());
    const labels = SCENES.map(scene => themePalettes[scene].label);
    expect(labels).toEqual(['Manhã', 'Tarde', 'Noite', 'Madrugada']);
    expect(new Set(labels).size).toBe(4);
  });

  it('descreve cada tema com céu de três paradas e cores hex válidas', () => {
    for (const scene of SCENES) {
      const spec = themePalettes[scene];
      expect(spec.sky).toHaveLength(3);
      for (const color of [...spec.sky, spec.glow, spec.accent, spec.accentAlt, spec.deep, spec.soft, spec.scrim]) {
        expect(color, `${scene}: ${color}`).toMatch(HEX);
      }
      expect(spec.description.length).toBeGreaterThan(8);
    }
  });

  it('mantém o véu de contraste entre 0 e 1 nos quatro temas', () => {
    for (const scene of SCENES) {
      expect(themePalettes[scene].scrimAlpha).toBeGreaterThan(0.3);
      expect(themePalettes[scene].scrimAlpha).toBeLessThanOrEqual(0.7);
    }
  });

  it('aponta cada tema para um esquema de cores existente', () => {
    expect(themePalettes.manha.scheme).toBe('sunrise');
    expect(themePalettes.tarde.scheme).toBe('ocean');
    expect(themePalettes.noite.scheme).toBe('sunset');
    expect(themePalettes.madrugada.scheme).toBe('neon');
  });
});

describe('themeSceneByScheme', () => {
  it('cobre todos os esquemas do app', () => {
    const schemes: ColorScheme[] = ['light', 'dark', 'violet', 'ocean', 'contrast', 'sunrise', 'sunset', 'neon'];
    expect(Object.keys(themeSceneByScheme).sort()).toEqual([...schemes].sort());
  });

  it('dá cena a cada tema menos ao alto contraste', () => {
    expect(themeSceneByScheme.contrast).toBeNull();
    expect(themePaletteFor('contrast')).toBeNull();
    for (const scheme of ['light', 'dark', 'violet', 'ocean', 'sunrise', 'sunset', 'neon'] as ColorScheme[]) {
      expect(themePaletteFor(scheme), scheme).not.toBeNull();
    }
  });

  it('resolve a cena do esquema ativo e cai na Madrugada quando desconhecido', () => {
    expect(themeSceneFor('sunrise')).toBe('manha');
    expect(themeSceneFor('ocean')).toBe('tarde');
    expect(themeSceneFor('sunset')).toBe('noite');
    expect(themeSceneFor('neon')).toBe('madrugada');
    expect(themeSceneFor('contrast')).toBe('madrugada');
    expect(themeSceneFor('inexistente' as ColorScheme)).toBe('madrugada');
  });
});

describe('neonFonts', () => {
  it('reserva a Bodoni Moda para a marca (wordmark e títulos de capa)', () => {
    expect(neonFonts.brand).toBe('BodoniModa_700Bold');
    expect(neonFonts.brandRegular).toBe('BodoniModa_400Regular');
    expect(neonFonts.body).toBe('Inter_400Regular');
  });
});
