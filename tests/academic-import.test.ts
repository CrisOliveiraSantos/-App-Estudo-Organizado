import { describe, expect, it } from 'vitest';

import {
  IMPORT_SOURCE,
  buildScrapeScript,
  categoryForDueDate,
  classifyScrapedTask,
  formatImportedDate,
  mergeScrapedTasks,
  normalizeScrapedTasks,
  parseDueDate,
  parseImportMessage,
  summarizeScrapedTasks,
} from '../lib/academic-import';

const today = new Date('2026-01-15T12:00:00');

describe('datas de prazo', () => {
  it('lê os formatos do SIGAA e do Moodle', () => {
    expect(parseDueDate('12/03/2026', today)).toBe('2026-03-12');
    expect(parseDueDate('2026-03-12', today)).toBe('2026-03-12');
    expect(parseDueDate('12/03', today)).toBe('2026-03-12');
    expect(parseDueDate('12 de março de 2026', today)).toBe('2026-03-12');
    expect(parseDueDate('12 mar', today)).toBe('2026-03-12');
    expect(parseDueDate('31/02/2026', today)).toBeUndefined();
    expect(parseDueDate('sem prazo', today)).toBeUndefined();
  });

  it('joga para o ano seguinte um prazo sem ano já distante no passado', () => {
    expect(parseDueDate('12/03', new Date('2026-12-01T12:00:00'))).toBe('2027-03-12');
  });

  it('traduz a data para o formato do Planejamento e a categoria', () => {
    expect(formatImportedDate('2026-03-12')).toBe('12/03/2026');
    expect(formatImportedDate(undefined)).toBe('');
    expect(categoryForDueDate('2026-01-15', today)).toBe('Hoje');
    expect(categoryForDueDate('2026-01-16', today)).toBe('Amanhã');
    expect(categoryForDueDate('2026-01-14', today)).toBe('Atrasadas');
    expect(categoryForDueDate('2026-02-20', today)).toBe('Próximas');
  });
});

describe('classificação das atividades', () => {
  it('separa prova, material, aviso e tarefa', () => {
    expect(classifyScrapedTask('Prova de Cálculo I')).toBe('Prova');
    expect(classifyScrapedTask('Avaliação substitutiva')).toBe('Prova');
    expect(classifyScrapedTask('Leitura do capítulo 3 em PDF')).toBe('Material');
    expect(classifyScrapedTask('Aviso: aula cancelada')).toBe('Aviso');
    expect(classifyScrapedTask('Lista de exercícios 2')).toBe('Tarefa');
  });
});

describe('normalização da captura', () => {
  it('limpa, deduplica e descarta navegação', () => {
    const tasks = normalizeScrapedTasks([
      { title: '  Lista   de exercícios 2 ', course: 'Banco de Dados', dueDate: '12/03/2026', url: 'https://ava/mod/assign/view.php?id=1' },
      { title: 'Lista de exercícios 2', course: 'Banco de Dados', url: 'https://ava/mod/assign/view.php?id=1' },
      { title: 'Editar', course: 'Banco de Dados' },
      { title: 'ab', course: 'Banco de Dados' },
      { titulo: 'Prova de Cálculo', disciplina: 'Cálculo I', prazo: '20/03', link: 'javascript:alert(1)' },
      null,
      'texto solto',
    ]);
    expect(tasks).toHaveLength(2);
    expect(tasks[0]).toMatchObject({ title: 'Lista de exercícios 2', course: 'Banco de Dados', dueDate: '2026-03-12' });
    expect(tasks[1]).toMatchObject({ title: 'Prova de Cálculo', course: 'Cálculo I', type: 'Prova' });
    expect(tasks[1].url).toBeUndefined();
  });

  it('usa o ambiente padrão quando a página não informa a disciplina', () => {
    const [task] = normalizeScrapedTasks([{ title: 'Questionário 1' }]);
    expect(task.course).toBe('Ambiente acadêmico');
  });

  it('mantém a primeira captura e acrescenta só o que é novo', () => {
    const first = normalizeScrapedTasks([{ title: 'Tarefa A', course: 'POO' }]);
    const merged = mergeScrapedTasks(first, normalizeScrapedTasks([
      { title: 'Tarefa A', course: 'POO' },
      { title: 'Tarefa B', course: 'POO' },
    ]));
    expect(merged.map(task => task.title)).toEqual(['Tarefa A', 'Tarefa B']);
  });

  it('resume por disciplina e prazos', () => {
    const summary = summarizeScrapedTasks([
      { title: 'A', course: 'POO', type: 'Tarefa' },
      { title: 'B', course: 'POO', type: 'Tarefa', dueDate: '2026-03-12' },
      { title: 'C', course: 'BD', type: 'Prova' },
    ]);
    expect(summary.total).toBe(3);
    expect(summary.dated).toBe(1);
    expect(summary.courses[0]).toEqual({ course: 'POO', count: 2 });
  });
});

describe('ponte com a WebView', () => {
  it('aceita apenas o payload do próprio script', () => {
    const raw = JSON.stringify({ source: IMPORT_SOURCE, type: 'scrape', url: 'https://sigaa', pageTitle: 'Tarefas', items: [{ title: 'Tarefa' }] });
    expect(parseImportMessage(raw)?.items).toHaveLength(1);
    expect(parseImportMessage(JSON.stringify({ type: 'login', items: [] }))).toBeNull();
    expect(parseImportMessage('{"type":"scrape"}')).toBeNull();
    expect(parseImportMessage('nada')).toBeNull();
  });

  it('gera um script sintaticamente válido que conversa com o app', () => {
    const script = buildScrapeScript();
    expect(script).toContain('ReactNativeWebView.postMessage');
    expect(script).toContain('li.activity');
    expect(script).toContain('table tr');
    expect(script).toContain(IMPORT_SOURCE);
    expect(() => new Function(script)).not.toThrow();
  });
});
