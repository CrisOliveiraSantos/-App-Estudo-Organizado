import { describe, expect, it } from 'vitest';

import {
  IMPORT_SOURCE,
  buildScrapeScript,
  categoryForDueDate,
  classifyScrapedTask,
  cleanActivityTitle,
  cleanCourseName,
  formatImportedDate,
  groupScrapedTasks,
  mergeScrapedCourses,
  mergeScrapedTasks,
  normalizeScrapedCourses,
  normalizeScrapedTasks,
  parseDueDate,
  parseImportMessage,
  splitTitleAndSchedule,
  summarizeScrapedTasks,
} from '../lib/academic-import';

const today = new Date('2026-01-15T12:00:00');

describe('datas de prazo', () => {
  it('lê os formatos do SIGAA e do Moodle', () => {
    expect(parseDueDate('12/03/2026', today)).toBe('2026-03-12');
    expect(parseDueDate('2026-03-12', today)).toBe('2026-03-12');
    expect(parseDueDate('2026-03-12T23:59:00-03:00', today)).toBe('2026-03-12');
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
  it('separa prova, material, aviso, exercício e tarefa', () => {
    expect(classifyScrapedTask('Prova de Cálculo I')).toBe('Prova');
    expect(classifyScrapedTask('Avaliação substitutiva')).toBe('Prova');
    expect(classifyScrapedTask('Leitura do capítulo 3 em PDF')).toBe('Material');
    expect(classifyScrapedTask('Aviso: aula cancelada')).toBe('Aviso');
    expect(classifyScrapedTask('Avisos Fórum')).toBe('Aviso');
    expect(classifyScrapedTask('Lista de exercícios 2')).toBe('Exercício');
    expect(classifyScrapedTask('Questionário 1')).toBe('Exercício');
    expect(classifyScrapedTask('Trabalho em grupo')).toBe('Tarefa');
  });
});

describe('estruturação dos dados do Moodle', () => {
  const reference = new Date('2026-10-18T12:00:00');

  it('separa o nome curto da frase de data sem perder o texto original', () => {
    const [task] = normalizeScrapedTasks([
      { title: 'Atividade 1 está marcado(a) para esta data sexta-feira, 30 outubro, 23:00', course: 'Banco de Dados' },
    ], 200, reference);
    expect(task.title).toBe('Atividade 1');
    expect(task.dateDescription).toBe('está marcado(a) para esta data sexta-feira, 30 outubro, 23:00');
    expect(task.dueDate).toBe('2026-10-30');
    expect(task.type).toBe('Exercício');
  });

  it('reconstrói o nome quando o Moodle manda apenas o evento', () => {
    const [task] = normalizeScrapedTasks([
      { title: '1 evento, segunda-feira, 19 outubro 19 Término de Prova Final', course: 'Cálculo I' },
    ], 200, reference);
    expect(task.title).toBe('Prova Final');
    expect(task.dateDescription).toBe('1 evento, segunda-feira, 19 outubro 19 Término de Prova Final');
    expect(task.dueDate).toBe('2026-10-19');
    expect(task.type).toBe('Prova');
  });

  it('usa a frase de data que já veio separada do scraper', () => {
    const [task] = normalizeScrapedTasks([
      {
        title: 'Lista de Exercícios',
        course: 'POO',
        dateDescription: 'está marcado(a) para esta data sexta-feira, 30 outubro, 23:00',
        dueDate: '30 outubro, 23:00',
      },
    ], 200, reference);
    expect(task.title).toBe('Lista de Exercícios');
    expect(task.dateDescription).toBe('está marcado(a) para esta data sexta-feira, 30 outubro, 23:00');
    expect(task.dueDate).toBe('2026-10-30');
    expect(task.type).toBe('Exercício');
  });

  it('separa título e agenda em uma frase combinada', () => {
    expect(splitTitleAndSchedule('Atividade 1 está marcado(a) para esta data sexta-feira, 30 outubro, 23:00')).toEqual({
      title: 'Atividade 1',
      schedule: 'está marcado(a) para esta data sexta-feira, 30 outubro, 23:00',
    });
  });

  it('não transforma uma descrição sem data em subtítulo de prazo', () => {
    const [task] = normalizeScrapedTasks([
      { title: 'Atividade 1', course: 'Banco de Dados', description: 'Material complementar da aula' },
    ], 200, reference);
    expect(task.title).toBe('Atividade 1');
    expect(task.dateDescription).toBeUndefined();
  });

  it('remove o título repetido quando a frase de data chega combinada', () => {
    const [task] = normalizeScrapedTasks([
      {
        title: 'Atividade 1',
        course: 'Banco de Dados',
        dateDescription: 'Atividade 1 está marcado(a) para esta data sexta-feira, 30 outubro, 23:00',
      },
    ], 200, reference);
    expect(task.dateDescription).toBe('está marcado(a) para esta data sexta-feira, 30 outubro, 23:00');
    expect(task.dueDate).toBe('2026-10-30');
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

describe('limpeza dos dados do Moodle', () => {
  it('não trata títulos de páginas genéricas como matéria', () => {
    expect(cleanCourseName('Página inicial | AVA')).toBe('');
    expect(cleanCourseName('Meu painel')).toBe('');
    expect(cleanCourseName('Meus cursos')).toBe('');
    expect(cleanCourseName('Banco de Dados - Moodle')).toBe('Banco de Dados');
    expect(cleanCourseName('Cálculo I - AVA')).toBe('Cálculo I');
    expect(cleanCourseName('Banco de Dados - 2026/1')).toBe('Banco de Dados - 2026/1');
  });

  it('remove do título o texto de prazo e de evento colado pelo Moodle', () => {
    expect(cleanActivityTitle('Trabalho 1 - Vencimento: 20/10/2026')).toBe('Trabalho 1');
    expect(cleanActivityTitle('1 evento, segunda-feira, 20 outubro 2025, 23:59')).toBe('');
    expect(cleanActivityTitle('Lista 3 Vencimento: 12/03')).toBe('Lista 3');
    expect(cleanActivityTitle('Fórum de dúvidas (segunda-feira)')).toBe('Fórum de dúvidas');
    expect(cleanActivityTitle('Prova de Cálculo - P2')).toBe('Prova de Cálculo - P2');
    expect(cleanActivityTitle('Questionário 2 Editar')).toBe('Questionário 2');
  });

  it('agrupa a captura por matéria mantendo o professor', () => {
    const tasks = normalizeScrapedTasks([
      { title: 'Lista 1', course: 'Banco de Dados', teacher: 'Ana Souza' },
      { title: 'Prova P1', course: 'Cálculo I', teacher: 'Bruno Lima' },
      { title: 'Lista 2', course: 'Banco de Dados' },
    ]);
    const groups = groupScrapedTasks(tasks);
    expect(groups).toHaveLength(2);
    expect(groups[0]).toMatchObject({ course: 'Banco de Dados', teacher: 'Ana Souza' });
    expect(groups[0].tasks).toHaveLength(2);
    expect(groups[1].course).toBe('Cálculo I');
  });

  it('normaliza as matérias da página inicial e descarta "Página inicial"', () => {
    const courses = normalizeScrapedCourses([
      { name: 'Página inicial | AVA' },
      { name: 'Banco de Dados', teacher: 'Ana Souza', url: 'https://ava/course/view.php?id=2' },
      { name: 'banco de dados' },
      { nome: 'Cálculo I' },
      null,
    ]);
    expect(courses.map(course => course.name)).toEqual(['Banco de Dados', 'Cálculo I']);
    expect(courses[0].teacher).toBe('Ana Souza');
    expect(courses[0].url).toBe('https://ava/course/view.php?id=2');
  });

  it('mescla matérias de capturas diferentes sem perder o professor', () => {
    const merged = mergeScrapedCourses(
      [{ name: 'Banco de Dados' }],
      [{ name: 'Banco de Dados', teacher: 'Ana Souza' }, { name: 'Cálculo I' }],
    );
    expect(merged).toHaveLength(2);
    expect(merged.find(course => course.name === 'Banco de Dados')?.teacher).toBe('Ana Souza');
  });

  it('mantém o professor nas tarefas normalizadas', () => {
    const [task] = normalizeScrapedTasks([{ title: 'Lista 1', course: 'Banco de Dados', professor: 'Ana Souza' }]);
    expect(task.teacher).toBe('Ana Souza');
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

  it('gera um script sintaticamente válido que percorre as matérias do Moodle', () => {
    const script = buildScrapeScript();
    expect(script).toContain('ReactNativeWebView.postMessage');
    expect(script).toContain('li.activity');
    expect(script).toContain('table tr');
    expect(script).toContain('/course/view.php');
    expect(script).toContain('DOMParser');
    expect(script).toContain('p[áa]gina inicial');
    expect(script).toContain('activityInfo');
    expect(script).toContain('dateDescription');
    expect(script).toContain(IMPORT_SOURCE);
    expect(() => new Function(script)).not.toThrow();
  });
});
