import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from '../server/local-auth';
import { isApiResponseError } from '../lib/local-chat-auth';

describe('local authentication', () => {
  it('detects an HTML response returned where JSON was expected', () => {
    expect(isApiResponseError(new Error('JSON Parse error: Unexpected character: <'))).toBe(true);
    expect(isApiResponseError(new Error('Invalid email address'))).toBe(false);
  });

  it('hashes and verifies a password without storing it in plain text', () => {
    const password = 'estudo-seguro-2026';
    const hash = hashPassword(password);
    expect(hash).not.toBe(password);
    expect(verifyPassword(password, hash)).toBe(true);
    expect(verifyPassword('senha-incorreta', hash)).toBe(false);
  });
});
