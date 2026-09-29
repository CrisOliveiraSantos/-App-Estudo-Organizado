import { describe, expect, it } from 'vitest';
import { validateNewPassword } from '../lib/account-utils';

describe('validateNewPassword', () => {
  it('exige uma senha com pelo menos oito caracteres', () => {
    expect(validateNewPassword('curta', 'curta')).toBe('Crie uma senha com pelo menos 8 caracteres.');
  });

  it('exige que a confirmação corresponda à senha', () => {
    expect(validateNewPassword('senha-segura', 'outra-senha')).toBe('A confirmação precisa ser igual à nova senha.');
  });

  it('aceita uma senha válida e confirmada', () => {
    expect(validateNewPassword('senha-segura', 'senha-segura')).toBeNull();
  });
});
