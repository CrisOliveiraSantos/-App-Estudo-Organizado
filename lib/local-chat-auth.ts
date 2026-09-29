import AsyncStorage from '@react-native-async-storage/async-storage';

export type LocalChatAccount = { id: string; email: string; displayName: string };
const LOCAL_CHAT_ACCOUNT_KEY = '@estudo-organizado/local-chat-account-v1';

export async function readLocalChatAccount(): Promise<LocalChatAccount | null> {
  try {
    const raw = await AsyncStorage.getItem(LOCAL_CHAT_ACCOUNT_KEY);
    return raw ? (JSON.parse(raw) as LocalChatAccount) : null;
  } catch {
    return null;
  }
}

export async function saveLocalChatAccount(account: LocalChatAccount) {
  await AsyncStorage.setItem(LOCAL_CHAT_ACCOUNT_KEY, JSON.stringify(account));
}

export function isApiResponseError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return /Unexpected character|JSON Parse|Failed to fetch|Network request failed|Network Error|fetch failed|Site Unavailable/i.test(message);
}
