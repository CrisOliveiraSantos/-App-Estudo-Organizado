import { describe, expect, it } from 'vitest';
import { deduplicateStudySyncOperations } from '../lib/study-sync-utils';

describe('fila de sincronização de estudos', () => {
  it('mantém somente a operação mais recente para o mesmo item e usuário', () => {
    const result = deduplicateStudySyncOperations(
      [{ id: 'note-1', kind: 'document', ownerId: 'user-a', version: 1 }],
      [{ id: 'note-1', kind: 'document', ownerId: 'user-a', version: 2 }, { id: 'note-1', kind: 'document', ownerId: 'user-b', version: 1 }],
      600,
    );
    expect(result).toHaveLength(2);
    expect(result.find(item => item.ownerId === 'user-a')).toMatchObject({ version: 2 });
    expect(result.find(item => item.ownerId === 'user-b')).toMatchObject({ version: 1 });
  });
});
