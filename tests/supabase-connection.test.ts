import { describe, expect, it } from 'vitest';

describe('Supabase connection', () => {
  it('accepts the configured public URL and anon key', async () => {
    const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    expect(url).toMatch(/^https:\/\/.+supabase\.co\/?$/);
    expect(key).toBeTruthy();

    const response = await fetch(`${url!.replace(/\/$/, '')}/auth/v1/settings`, {
      headers: { apikey: key!, Authorization: `Bearer ${key!}` },
    });
    expect(response.ok).toBe(true);
  }, 15_000);
});
