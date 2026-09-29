import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SyncKind } from './supabase-sync';
import { deduplicateStudySyncOperations, studySyncOperationKey } from './study-sync-utils';

const QUEUE_KEY = '@estudo-organizado/study-sync-queue-v1';
const MAX_QUEUE_SIZE = 600;

export type StudySyncOperation = {
  id: string;
  kind: SyncKind;
  payload: unknown;
  deletedAt: string | null;
  queuedAt: string;
  ownerId?: string;
};

export async function readStudySyncQueue() {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    const operations = raw ? JSON.parse(raw) : [];
    return Array.isArray(operations) ? operations as StudySyncOperation[] : [];
  } catch {
    return [] as StudySyncOperation[];
  }
}

export async function enqueueStudySyncOperations(operations: StudySyncOperation[]) {
  if (!operations.length) return;
  const current = await readStudySyncQueue();
  const compacted = deduplicateStudySyncOperations(current, operations, MAX_QUEUE_SIZE);
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(compacted));
}

export async function removeStudySyncOperations(operations: StudySyncOperation[]) {
  if (!operations.length) return;
  const keys = new Set(operations.map(studySyncOperationKey));
  const remaining = (await readStudySyncQueue()).filter(operation => !keys.has(studySyncOperationKey(operation)));
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
}
