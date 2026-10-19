/* ------------------------------------------------------------------ *
 * Cris · contexto real do app
 *
 * A Cris responde melhor quando sabe o que a pessoa está estudando agora.
 * Este módulo é puro (nenhum import de React/React Native) para poder ser
 * testado em Node: recebe as fatias do `study-store` e devolve um texto curto
 * que entra no SYSTEM PROMPT de cada pergunta.
 *
 * Regras:
 *  - só dados que existem no app (nunca inventar matérias/tarefas);
 *  - nada de conteúdo integral de notas/PDFs (título + pasta bastam e
 *    economizam tokens);
 *  - listas limitadas para o prompt não crescer sem controle.
 * ------------------------------------------------------------------ */

export type CrisStudyTaskLike = {
  title: string;
  done?: boolean;
  deadline?: string;
  category?: string;
};

export type CrisStudyContextInput = {
  subjects?: { name: string; tasks?: CrisStudyTaskLike[] }[];
  goals?: { title: string; tasks?: CrisStudyTaskLike[] }[];
  notes?: { title: string; kind?: string; folder?: string }[];
  events?: { title: string; type?: string; date?: string; done?: boolean }[];
};

const MAX_SUBJECTS = 12;
const MAX_TASKS = 8;
const MAX_NOTES = 5;
const MAX_EVENTS = 5;
const MAX_LINE_ITEMS = 20;
const MAX_CONTEXT_CHARS = 1600;

function clean(value: string | undefined | null): string {
  return (value ?? '').replace(/\s+/g, ' ').trim();
}

function clip(value: string, limit: number): string {
  const text = clean(value);
  return text.length > limit ? `${text.slice(0, limit - 1)}…` : text;
}

function taskLabel(task: CrisStudyTaskLike, origin?: string): string {
  const title = clip(task.title, 90);
  const parts = [origin ? clip(origin, 60) : '', task.deadline ? `prazo ${clip(task.deadline, 24)}` : ''].filter(Boolean);
  return parts.length ? `${title} (${parts.join(' · ')})` : title;
}

/**
 * Texto enviado no system prompt. Nunca devolve string vazia: quando o app
 * ainda não tem dados, diz isso explicitamente (em vez de deixar a Cris
 * inventar matérias para "preencher" o contexto).
 */
export function buildStudyContext(input: CrisStudyContextInput = {}): string {
  const subjects = (input.subjects ?? []).map(subject => clean(subject.name)).filter(Boolean);
  const notes = (input.notes ?? []).filter(note => clean(note.title).length > 0).slice(0, MAX_NOTES);
  const events = (input.events ?? []).filter(event => !event.done && clean(event.title).length > 0);

  const pending: string[] = [];
  let totalTasks = 0;
  let doneTasks = 0;

  const collect = (tasks: CrisStudyTaskLike[] | undefined, origin?: string) => {
    for (const task of tasks ?? []) {
      const title = clean(task.title);
      if (!title) continue;
      totalTasks += 1;
      if (task.done) {
        doneTasks += 1;
        continue;
      }
      pending.push(taskLabel(task, origin));
    }
  };

  for (const subject of input.subjects ?? []) collect(subject.tasks, subject.name);
  for (const goal of input.goals ?? []) collect(goal.tasks, goal.title);

  /**
   * Eventos da agenda NÃO entram na contagem de tarefas: a importação do
   * Moodle cria tarefa + evento para a mesma atividade, e contar os dois
   * dobraria o denominador do progresso. Eles aparecem em "Próximos
   * compromissos", que é o bloco certo para datas.
   */
  const uniquePending = Array.from(new Set(pending)).slice(0, MAX_TASKS * 2);
  const percent = totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0;

  const lines: string[] = ['Contexto do usuário (dados reais do app Estudo Organizado):'];
  lines.push(
    subjects.length
      ? `Matérias: ${subjects.slice(0, MAX_SUBJECTS).map(name => clip(name, 50)).join(', ')}.`
      : 'Matérias: nenhuma cadastrada ainda.',
  );

  if (uniquePending.length) {
    const listed = uniquePending.slice(0, MAX_LINE_ITEMS);
    lines.push(`Tarefas e prazos pendentes: ${listed.join('; ')}${uniquePending.length > listed.length ? '; …' : ''}.`);
  } else {
    lines.push('Tarefas e prazos pendentes: nenhum registrado.');
  }

  lines.push(
    totalTasks
      ? `Progresso atual: ${doneTasks} de ${totalTasks} tarefas concluídas (${percent}%).`
      : 'Progresso atual: ainda não há tarefas para medir.',
  );

  if (notes.length) {
    const listed = notes.map(note => {
      const title = clip(note.title, 70);
      const where = clean(note.folder);
      const kind = note.kind === 'pdf' ? 'PDF' : 'nota';
      return `${title} (${[kind, where].filter(Boolean).join(' · ')})`;
    });
    lines.push(`Últimas notas/PDFs: ${listed.join('; ')}.`);
  } else {
    lines.push('Últimas notas/PDFs: nenhum material salvo ainda.');
  }

  const upcoming = events
    .filter(event => clean(event.date).length > 0)
    .slice(0, MAX_EVENTS)
    .map(event => `${clip(event.title, 70)} (${[clean(event.type), clean(event.date)].filter(Boolean).join(' · ')})`);
  if (upcoming.length) lines.push(`Próximos compromissos: ${upcoming.join('; ')}.`);

  return clip(lines.join('\n'), MAX_CONTEXT_CHARS);
}
