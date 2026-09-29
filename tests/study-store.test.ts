import { describe, expect, it } from 'vitest';
import { goalProgress } from '../lib/study-utils';
import type { Goal } from '../lib/study-store';

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
