export type QueueOperationShape = {
  id: string;
  kind: string;
  ownerId?: string;
};

export function studySyncOperationKey(operation: QueueOperationShape) {
  return `${operation.ownerId ?? 'unassigned'}:${operation.kind}:${operation.id}`;
}

export function deduplicateStudySyncOperations<T extends QueueOperationShape>(current: T[], incoming: T[], maxSize: number) {
  const merged = new Map(current.map(operation => [studySyncOperationKey(operation), operation]));
  incoming.forEach(operation => merged.set(studySyncOperationKey(operation), operation));
  return Array.from(merged.values()).slice(-maxSize);
}
