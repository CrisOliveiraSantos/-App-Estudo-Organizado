import * as Linking from 'expo-linking';
import { Platform } from 'react-native';
import { supabase } from './supabase';

const githubPagesBasePath = process.env.EXPO_PUBLIC_GITHUB_PAGES === 'true' ? '/-App-Estudo-Organizado' : '';

export function getSupabaseEmailRedirectUrl() {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return `${window.location.origin}${githubPagesBasePath}/auth/confirm`;
  }
  return Linking.createURL('auth/confirm');
}

/**
 * Retorno do OAuth do Google. Cai na própria tela de login: na web o
 * `detectSessionInUrl` do cliente Supabase consome o `?code=` sozinho e o
 * listener de sessão leva para o chat; no nativo o
 * `WebBrowser.openAuthSessionAsync` devolve a URL e `consumeSupabaseAuthLink`
 * troca o código por sessão.
 */
export function getSupabaseOAuthRedirectUrl() {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return `${window.location.origin}${githubPagesBasePath}/login`;
  }
  return Linking.createURL('login');
}

function getLinkParams(url: string) {
  const [beforeHash, hash = ''] = url.split('#');
  const query = beforeHash.includes('?') ? beforeHash.slice(beforeHash.indexOf('?') + 1) : '';
  return new URLSearchParams(`${query}${query && hash ? '&' : ''}${hash}`);
}

export async function consumeSupabaseAuthLink(url: string | null) {
  if (!supabase || !url) return { handled: false, error: null as string | null };

  const params = getLinkParams(url);
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  const code = params.get('code');
  const type = params.get('type');

  try {
    if (accessToken && refreshToken) {
      const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
      if (error) throw error;
      return { handled: true, error: null as string | null, type };
    }
    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) throw error;
      return { handled: true, error: null as string | null, type };
    }
    return { handled: false, error: null as string | null };
  } catch (error) {
    return {
      handled: true,
      error: error instanceof Error ? error.message : 'Não foi possível confirmar o link de acesso.',
      type,
    };
  }
}
