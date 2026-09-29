import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

// The React Native polyfill is needed on Android/iOS, but it accesses `window`
// when evaluated during the static web render.
if (Platform.OS !== 'web') {
  require('react-native-url-polyfill/auto');
}

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const isWebServerRender = Platform.OS === 'web' && typeof window === 'undefined';

const webStorage = {
  getItem: async (key: string) => typeof window === 'undefined' ? null : window.localStorage.getItem(key),
  setItem: async (key: string, value: string) => {
    if (typeof window !== 'undefined') window.localStorage.setItem(key, value);
  },
  removeItem: async (key: string) => {
    if (typeof window !== 'undefined') window.localStorage.removeItem(key);
  },
};

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        // AsyncStorage calls `window` internally in Expo's static web renderer.
        // On web, this adapter becomes a no-op during SSR and localStorage in the browser.
        storage: Platform.OS === 'web' ? webStorage : AsyncStorage,
        autoRefreshToken: !isWebServerRender,
        persistSession: true,
        // On web, allow Supabase to persist confirmation tokens from the URL.
        // Native confirmation links continue to be consumed explicitly by the app.
        detectSessionInUrl: Platform.OS === 'web' && !isWebServerRender,
      },
    })
  : null;
