import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { goalProgress } from '../lib/study-utils';
import type { Goal } from '../lib/study-store';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const STORE = readFileSync(resolve(ROOT, 'lib/study-store.tsx'), 'utf8');

describe('ações de exclusão e salvamento vazio', () => {
  it('expõe deleteTask e deleteSubjectTask com o id correto', () => {
    expect(STORE).toContain('deleteTask: (goalId, taskId)');
    expect(STORE).toContain('deleteSubjectTask: (subjectId, taskId)');
    expect(STORE).toMatch(/tasks\.filter\(task => task\.id !== taskId\)/);
  });

  it('recusa títulos vazios em tarefas, metas, matérias e notas', () => {
    for (const action of ['addSubjectTask', 'addTask', 'addGoal', 'addSubject', 'saveNote', 'renameNote']) {
      const start = STORE.lastIndexOf(`${action}:`);
      expect(start).toBeGreaterThan(-1);
      expect(STORE.slice(start, start + 320)).toContain('.trim()');
    }
  });

  it('persiste link e status do Moodle na tarefa da matéria', () => {
    expect(STORE).toContain('status?: TaskStatus');
    expect(STORE).toContain('url?: string');
    expect(STORE).toContain('updateSubjectTask: (subjectId, taskId, changes)');
    const start = STORE.lastIndexOf('addSubjectTask:');
    const body = STORE.slice(start, start + 700);
    expect(body).toContain('details?.url');
    expect(body).toContain('details?.status');
  });
});

describe('goalProgress', () => {
  it('calcula a proporção de tarefas concluídas', () => {
    const goal: Goal = { id: '1', title: 'Teste', description: '', tasks: [
      { id: 'a', title: 'A', done: true, priority: 'Alta' },
      { id: 'b', title: 'B', done: false, priority: 'Média' },
      { id: 'c', title: 'C', done: true, priority: 'Baixa' },
    ] };
    expect(goalProgress(goal)).toBe(67);
  });
  it('retorna zero para meta sem tarefas', () => {
    expect(goalProgress({ id: '1', title: 'Vazia', description: '', tasks: [] })).toBe(0);
  });
});
