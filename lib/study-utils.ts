import type { Goal } from './study-store';

export function goalProgress(goal: Goal) {
  return goal.tasks.length ? Math.round(goal.tasks.filter(task => task.done).length / goal.tasks.length * 100) : 0;
}
