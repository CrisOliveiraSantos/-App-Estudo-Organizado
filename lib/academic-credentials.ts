import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'estudo-organizado.moodle-token.session';

/** Stores only the short-lived Moodle Web Service token. */
export async function readAcademicToken(): Promise<string | null> {
  try {
    if (Platform.OS === 'web') {
      return typeof sessionStorage === 'undefined' ? null : sessionStorage.getItem(TOKEN_KEY);
    }
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function saveAcademicToken(token: string): Promise<void> {
  const value = token.trim();
  if (!value) return;
  try {
    if (Platform.OS === 'web') {
      if (typeof sessionStorage !== 'undefined') sessionStorage.setItem(TOKEN_KEY, value);
      return;
    }
    await SecureStore.setItemAsync(TOKEN_KEY, value, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  } catch {
    // A failed secure write must not block manual one-session use.
  }
}

export async function clearAcademicToken(): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem(TOKEN_KEY);
      return;
    }
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch {
    // Best effort cleanup.
  }
}
