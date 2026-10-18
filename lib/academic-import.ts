/**
 * Importador acadêmico sem API (SIGAA/Moodle).
 *
 * A tela abre o ambiente dentro de uma `WebView` com os cookies da sessão; a
 * usuária faz o login normalmente, navega até as tarefas e o app injeta um
 * script que lê o DOM e devolve os itens por `postMessage`. Nada de token, nada
 * de senha saindo do aparelho — e nada de servidor no meio.
 *
 * Este módulo é puro (nenhum import de `react-native`) para poder ser testado
 * em Node: `buildScrapeScript` devolve o texto injetado e
 * `normalizeScrapedTasks` valida o que volta da página.
 */

export type ScrapedTaskType = 'Tarefa' | 'Prova' | 'Material' | 'Aviso';

export type ScrapedTask = {
  course: string;
  dueDate?: string;
  /** Nome do(a) professor(a) quando a página do curso informa. */
  teacher?: string;
  title: string;
  type: ScrapedTaskType;
  url?: string;
};

/** Matéria encontrada na página inicial do Moodle (mesmo sem tarefas). */
export type ScrapedCourse = {
  id?: string;
  name: string;
  teacher?: string;
  url?: string;
};

export type ScrapePayload = {
  items: unknown[];
  courses?: unknown[];
  /** Verdadeiro quando o script ainda está lendo outras matérias. */
  partial?: boolean;
  pageTitle?: string;
  source?: string;
  url?: string;
};

export type ScrapedCourseGroup = {
  course: string;
  teacher?: string;
  tasks: ScrapedTask[];
};

export const IMPORT_SOURCE = 'estudo-organizado-import';
export const IMPORT_MAX_ITEMS = 200;

/** Endereços iniciais editáveis (a usuária troca pelo da instituição dela). */
export const IMPORT_PROVIDERS = [
  {
    id: 'sigaa',
    label: 'SIGAA',
    hint: 'Disciplinas, tarefas e prazos do portal acadêmico.',
    url: 'https://sigaa.ifsudestemg.edu.br/sigaa/verTelaLogin.do',
  },
  {
    id: 'moodle',
    label: 'Moodle / AVA',
    hint: 'Atividades, avisos e materiais dos cursos.',
    url: 'https://ead.ifsudestemg.edu.br/login/index.php',
  },
] as const;

export type ImportProviderId = (typeof IMPORT_PROVIDERS)[number]['id'];

/**
 * Script injetado na página. Ele identifica a matéria da página atual
 * (breadcrumb/cabeçalho) e, quando está no painel do Moodle, percorre os links
 * dos cursos, baixa cada página (`fetch` na mesma sessão já autenticada) e lê
 * as atividades com prazo e professor. Nada sai do aparelho: o resultado volta
 * por `postMessage` para o app, que cria as matérias e vincula as tarefas.
 */
export function buildScrapeScript(): string {
  return `(function () {
  var SOURCE = ${JSON.stringify(IMPORT_SOURCE)};
  var MAX = ${IMPORT_MAX_ITEMS};
  var MAX_COURSES = 12;
  var SCAN_TIMEOUT = 25000;
  /** Cada injeção invalida a anterior: uma leitura atrasada não sobrescreve a nova. */
  var runId = (window.__estudoImportRun = (window.__estudoImportRun || 0) + 1);
  function clean(value) { return String(value == null ? '' : value).replace(/\\s+/g, ' ').trim(); }
  function textOf(node) { return node ? clean(node.textContent) : ''; }
  function abs(href) { try { return href ? new URL(href, location.href).href : ''; } catch (e) { return ''; } }
  function genericName(value) {
    var name = clean(value).replace(/\\s*[|·]\\s*(moodle|ava|sigaa).*$/i, '').replace(/\\s*[-–]\\s*(moodle|ava|sigaa).*$/i, '').trim();
    if (!name) return '';
    if (/^(p[áa]gina inicial|in[ií]cio|home|meu painel|painel|painel do usu[áa]rio|dashboard|meus cursos|calend[áa]rio|tarefas|atividades|notas|perfil|mensagens|ava|moodle|sigaa|ambiente acad[êe]mico|disciplinas)$/i.test(name)) return '';
    return name;
  }
  function cleanTitle(value) {
    return clean(value)
      .replace(/\\s*(Editar|Excluir|Apagar|Enviar|Corrigir|Concluir)\\s*$/gi, '')
      .replace(/\\s*[-–—·|]\\s*(Vencimento|Prazo|Data de entrega|Entrega|Due)\\b[\\s\\S]*$/gi, '')
      .replace(/\\b(Vencimento|Prazo|Data de entrega|Entrega|Due)\\s*:[\\s\\S]*$/gi, '')
      .replace(/\\b\\d+\\s+eventos?\\b[\\s\\S]*$/gi, '')
      .replace(/[,;:·|-]?\\s*(segunda|ter[çc]a|quarta|quinta|sexta|s[áa]bado|domingo)(-feira)?\\b[\\s\\S]*$/gi, '')
      .replace(/\\s+/g, ' ')
      .replace(/^[\\s\\-–—·|,;:]+/, '')
      .replace(/[\\s\\-–—·|,;:]+$/, '')
      .replace(/[\\s(\\[]+$/, '');
  }
  function dateText(value) {
    var text = clean(value);
    var iso = text.match(/\\d{4}-\\d{2}-\\d{2}/);
    if (iso) return iso[0];
    var numeric = text.match(/\\b\\d{1,2}[\\/.]\\d{1,2}(?:[\\/.]\\d{2,4})?\\b/);
    if (numeric) return numeric[0];
    var textual = text.match(/\\b\\d{1,2}\\s*(de\\s+)?(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)[a-zç]*\\.?(\\s*(de\\s+)?\\d{2,4})?/i);
    return textual ? textual[0] : '';
  }
  function activityDate(node) {
    var regions = node.querySelectorAll('.activity-dates, .activity-information, .availabilityinfo, .badge, .date, time, .text-nowrap');
    for (var i = 0; i < regions.length; i++) {
      var attribute = regions[i].getAttribute('datetime') || '';
      var found = dateText(attribute) || dateText(textOf(regions[i]));
      if (found) return found;
    }
    return dateText(textOf(node));
  }
  function activityTitle(node) {
    var target = node.querySelector('.activityname a, .activityname, .instancename, .tarefa-titulo, .event-name, .eventname, h3, h4, strong');
    var raw = target ? textOf(target) : '';
    if (!raw && node.getAttribute) raw = node.getAttribute('data-activityname') || '';
    if (!raw) raw = textOf(node);
    return cleanTitle(raw);
  }
  function teacherName(value) {
    var match = String(value || '').match(/(Professor(?:a|es|as)?|Docente(?:s)?|Teacher(?:s)?)\\s*[:\\-–]\\s*([^\\n.;|]{3,90})/i);
    return match ? cleanTitle(match[2]) : '';
  }
  function teacherFrom(root) {
    if (!root) return '';
    var selectors = ['[class*="course-teacher"]', '[class*="teachers"]', '[class*="professor"]', '.course-teacher', '.teachers', '.course-summary', '.summary'];
    for (var i = 0; i < selectors.length; i++) {
      var name = teacherName(textOf(root.querySelector(selectors[i])));
      if (name) return name;
    }
    return '';
  }
  function pageCourse() {
    var crumb = document.querySelector('.breadcrumb a[href*="/course/view.php"]');
    var fromCrumb = genericName(crumb ? textOf(crumb) : '');
    if (fromCrumb) return { name: fromCrumb, teacher: teacherFrom(document) };
    if (location.href.indexOf('/course/view.php') === -1) return null;
    var headings = ['#page-header h1', '.page-header-headings h1', 'h1.page-title', '.course-title', '.page-title h1'];
    for (var i = 0; i < headings.length; i++) {
      var name = genericName(textOf(document.querySelector(headings[i])));
      if (name) return { name: name, teacher: teacherFrom(document) };
    }
    return null;
  }
  function isMoodle() {
    var href = location.href;
    var moodlePath = href.indexOf('/course/') !== -1 || href.indexOf('/my/') !== -1 || href.indexOf('/mod/') !== -1 || href.indexOf('/login/index.php') !== -1;
    return moodlePath || !!document.querySelector('#page-course-view, body.path-my, body.path-course-view, .moodlelogo');
  }
  function nearbyCourse(node) {
    var box = node.closest ? node.closest('[class*="disciplina"], [class*="Disciplina"], .course, .course-content, [data-courseid]') : null;
    if (!box) return '';
    var heading = box.querySelector('h1, h2, h3, .tituloDisciplina, .course-title');
    return genericName(textOf(heading));
  }
  function collect(list, node, course) {
    if (!node || list.length >= MAX) return;
    var title = activityTitle(node);
    if (title.length < 4 || title.length > 180) return;
    var link = node.querySelector('a[href*="/mod/"]') || node.querySelector('a[href]');
    list.push({
      title: title,
      course: (course && course.name) || nearbyCourse(node),
      teacher: (course && course.teacher) || '',
      dueDate: activityDate(node),
      url: link ? abs(link.getAttribute('href')) : '',
      type: ''
    });
  }
  function localActivities(course) {
    var items = [];
    var selectors = ['li.activity', '.activity', '.tarefa', '[class*="tarefa"]', '[class*="atividade"]', '[data-region="event-list-item"]', '.event', '#tarefas tr', '.assign', '.quiz'];
    for (var s = 0; s < selectors.length; s++) {
      var nodes = document.querySelectorAll(selectors[s]);
      for (var i = 0; i < nodes.length; i++) collect(items, nodes[i], course);
    }
    var rows = document.querySelectorAll('table tr');
    for (var r = 0; r < rows.length; r++) {
      if (!rows[r].querySelector || !rows[r].querySelector('a[href]')) continue;
      if (rows[r].querySelectorAll('td').length < 2) continue;
      collect(items, rows[r], course);
    }
    return items;
  }
  function collectCourses() {
    var found = {};
    var list = [];
    function add(id, name, url, teacher) {
      var safeName = genericName(name);
      var key = String(id || safeName).toLowerCase();
      if (!safeName && !id) return;
      if (found[key]) { if (!found[key].teacher && teacher) found[key].teacher = teacher; return; }
      found[key] = { id: String(id || ''), name: safeName || '', url: url || '', teacher: teacher || '' };
      list.push(found[key]);
    }
    function cardOf(node) { return node.closest ? node.closest('[data-courseid], [data-course-id], .card, .coursebox, .course-info-container') : null; }
    var anchors = document.querySelectorAll('a[href*="/course/view.php?id="]');
    for (var i = 0; i < anchors.length; i++) {
      var href = abs(anchors[i].getAttribute('href'));
      var idMatch = /[?&]id=(\\d+)/.exec(href);
      var card = cardOf(anchors[i]);
      var name = textOf(anchors[i]);
      if (genericName(name) || /^(\\d+|ir para|acessar|ver curso|abrir)/i.test(name)) name = card ? textOf(card.querySelector('.coursename, .course-name, [class*="coursename"], h3, h4, .card-title')) : '';
      add(idMatch ? idMatch[1] : '', name, href, card ? teacherFrom(card) : '');
    }
    var cards = document.querySelectorAll('[data-courseid], [data-course-id]');
    for (var c = 0; c < cards.length; c++) {
      var id = cards[c].getAttribute('data-courseid') || cards[c].getAttribute('data-course-id');
      var link = cards[c].querySelector('a[href*="/course/view.php"]');
      var title = textOf(cards[c].querySelector('.coursename, .course-name, [class*="coursename"], .card-title, h3, h4'));
      add(id, title || (link ? textOf(link) : ''), link ? abs(link.getAttribute('href')) : '', teacherFrom(cards[c]));
    }
    var result = [];
    for (var k = 0; k < list.length; k++) if (list[k].name && list[k].url) result.push(list[k]);
    return result.slice(0, MAX_COURSES);
  }
  function activitiesFromDoc(doc, course) {
    var items = [];
    var nodes = doc.querySelectorAll('li.activity, [data-region="activity-card"], .activity, #tarefas tr, .tarefa');
    for (var i = 0; i < nodes.length; i++) collect(items, nodes[i], course);
    return items;
  }
  function teacherInDoc(doc) {
    var selectors = ['.course-teacher', '.teachers', '[class*="course-teacher"]', '[class*="professor"]', '.course-summary', '.summary'];
    for (var i = 0; i < selectors.length; i++) {
      var name = teacherName(textOf(doc.querySelector(selectors[i])));
      if (name) return name;
    }
    return '';
  }
  function fetchText(url) {
    return fetch(url, { credentials: 'same-origin', headers: { Accept: 'text/html' } })
      .then(function (response) { return response.ok ? response.text() : ''; })
      .catch(function () { return ''; });
  }
  function scanCourses(list, onProgress, done) {
    var scanned = [];
    var index = 0;
    function step() {
      if (index >= list.length) { done(scanned); return; }
      var course = list[index];
      index += 1;
      if (!course.url) { step(); return; }
      fetchText(course.url).then(function (html) {
        if (html) {
          try {
            var doc = new DOMParser().parseFromString(html, 'text/html');
            var heading = doc.querySelector('#page-header h1, .page-header-headings h1, .course-title');
            var courseName = genericName(heading ? textOf(heading) : '') || course.name;
            var teacher = course.teacher || teacherInDoc(doc);
            scanned = scanned.concat(activitiesFromDoc(doc, { name: courseName, teacher: teacher }));
          } catch (e) {}
        }
        onProgress(scanned);
        step();
      });
    }
    step();
  }
  var current = null;
  var items = [];
  var courses = [];
  function bootstrap() {
    current = pageCourse();
    items = localActivities(current || { name: '', teacher: '' });
    courses = collectCourses();
    if (current) {
      var matched = false;
      for (var m = 0; m < courses.length; m++) {
        if (courses[m].name.toLowerCase() === current.name.toLowerCase()) {
          matched = true;
          courses[m].teacher = courses[m].teacher || current.teacher;
        }
      }
      if (!matched) courses.unshift({ id: '', name: current.name, url: '', teacher: current.teacher || '' });
    }
    return courses.length > 0;
  }
  var deepItems = [];
  var finished = false;
  function send(list, partial) {
    if (window.__estudoImportRun !== runId) return;
    if (!list.length && !courses.length) return;
    var payload = { source: SOURCE, type: 'scrape', url: location.href, pageTitle: clean(document.title), items: list.slice(0, MAX), courses: courses.slice(0, MAX_COURSES) };
    if (partial) payload.partial = true;
    try { window.ReactNativeWebView.postMessage(JSON.stringify(payload)); } catch (e) {}
  }
  function finish() {
    if (finished) return;
    finished = true;
    var merged = items.concat(deepItems);
    if (!merged.length && !courses.length) return;
    send(merged, false);
  }
  function scan() {
    var timer = setTimeout(finish, SCAN_TIMEOUT);
    scanCourses(courses, function (partial) {
      deepItems = partial;
      if (!finished) send(items.concat(deepItems), true);
    }, function (all) {
      clearTimeout(timer);
      deepItems = all;
      finish();
    });
  }
  if (bootstrap()) { scan(); return; }
  // SIGAA (fora do Moodle) já trouxe o que existia na página.
  if (items.length && !isMoodle()) { finish(); return; }
  // O painel do Moodle carrega os cartões de curso por AJAX: tenta mais uma vez.
  setTimeout(function () {
    if (bootstrap()) { scan(); return; }
    finish();
  }, 1500);
})();`;
}

const MONTHS: Record<string, number> = {
  jan: 1,
  janeiro: 1,
  fev: 2,
  fevereiro: 2,
  mar: 3,
  marco: 3,
  'março': 3,
  abr: 4,
  abril: 4,
  mai: 5,
  maio: 5,
  jun: 6,
  junho: 6,
  jul: 7,
  julho: 7,
  ago: 8,
  agosto: 8,
  set: 9,
  setembro: 9,
  out: 10,
  outubro: 10,
  nov: 11,
  novembro: 11,
  dez: 12,
  dezembro: 12,
};

const NAVIGATION_LABEL =
  /^(editar|excluir|apagar|enviar|corrigir|ver|ver todos|acessar|abrir|voltar|sair|entrar|login|senha|perfil|notas|frequ[eê]ncia|matr[ií]cula|participantes|f[oó]rum|mensagens)$/i;

function tidy(value: unknown): string {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
}

function pick(record: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) return value;
  }
  return '';
}

function isRealDate(year: number, month: number, day: number): boolean {
  if (year < 2000 || year > 2100) return false;
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function toIso(year: number, month: number, day: number): string | undefined {
  if (!isRealDate(year, month, day)) return undefined;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function normalizeYear(raw: string | undefined, today: Date): number {
  if (raw) {
    const value = Number(raw);
    if (Number.isFinite(value) && value > 0) return value < 100 ? 2000 + value : value;
  }
  return today.getFullYear();
}

/**
 * Lê os formatos que aparecem em SIGAA/Moodle: `12/03/2026`, `12/03`,
 * `2026-03-12` e `12 de março`. Quando o ano não vem, usa o ano corrente —
 * e joga para o próximo ano se a data já passou muito (prazo de disciplina).
 */
export function parseDueDate(value: unknown, today: Date = new Date()): string | undefined {
  const text = tidy(value).toLowerCase();
  if (!text) return undefined;
  const iso = text.match(/\b(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return toIso(Number(iso[1]), Number(iso[2]), Number(iso[3]));
  const numeric = text.match(/\b(\d{1,2})[/.](\d{1,2})(?:[/.](\d{2,4}))?\b/);
  if (numeric) {
    const day = Number(numeric[1]);
    const month = Number(numeric[2]);
    const year = normalizeYear(numeric[3], today);
    const parsed = toIso(year, month, day);
    if (!parsed) return undefined;
    if (!numeric[3]) {
      const candidate = new Date(`${parsed}T12:00:00Z`);
      const diff = today.getTime() - candidate.getTime();
      if (diff > 1000 * 60 * 60 * 24 * 90) return toIso(year + 1, month, day);
    }
    return parsed;
  }
  const textual = text.match(/\b(\d{1,2})\s*(?:de\s+)?([a-zç]{3,9})(?:\s*(?:de\s+)?(\d{2,4}))?/);
  if (textual) {
    const month = MONTHS[textual[2]];
    if (month) return toIso(normalizeYear(textual[3], today), month, Number(textual[1]));
  }
  return undefined;
}

export function classifyScrapedTask(title: string): ScrapedTaskType {
  const text = title.toLowerCase();
  if (/\b(prova|exame|avalia[cç][aã]o|teste|recupera[cç][aã]o)\b/.test(text)) return 'Prova';
  if (/\b(aviso|comunicado|mensagem|nota\s+informativa)\b/.test(text)) return 'Aviso';
  if (/\b(pdf|material|leitura|texto|cap[ií]tulo|slide|apostila|v[ií]deo)\b/.test(text)) return 'Material';
  return 'Tarefa';
}

/** Chave estável para não duplicar a mesma atividade entre capturas. */
export function scrapedTaskKey(task: Pick<ScrapedTask, 'course' | 'title' | 'url'>): string {
  const slug = (value: string | undefined) =>
    (value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  const url = (task.url ?? '').split('?')[0];
  return [slug(task.course), slug(task.title), url].join('|');
}

/** Cabeçalhos genéricos que não são matérias (painel, calendário, menus…). */
const GENERIC_COURSE_NAME =
  /^(p[áa]gina inicial|in[ií]cio|home|meu painel|painel|painel do usu[áa]rio|dashboard|meus cursos|calend[áa]rio|tarefas|atividades|notas|perfil|mensagens|ava|moodle|sigaa|ambiente acad[êe]mico|disciplinas)$/i;

/**
 * O título da página do Moodle ("Página inicial | AVA") não é uma matéria:
 * devolvemos string vazia para o app não criar uma disciplina falsa.
 */
export function cleanCourseName(value: unknown): string {
  if (typeof value !== 'string') return '';
  const name = tidy(value)
    .replace(/\s*[|·]\s*(moodle|ava|sigaa).*$/i, '')
    .replace(/\s*[-–]\s*(moodle|ava|sigaa).*$/i, '')
    .trim();
  return GENERIC_COURSE_NAME.test(name) ? '' : name;
}

/**
 * Limpa o texto que o Moodle coloca junto do nome da atividade:
 * "1 evento, segunda-feira, 20 outubro 2025, 23:59",
 * "Trabalho 1 - Vencimento: 12/03/2026", "Editar", etc.
 */
export function cleanActivityTitle(value: unknown): string {
  if (typeof value !== 'string') return '';
  return tidy(value)
    .replace(/\s*(Editar|Excluir|Apagar|Enviar|Corrigir|Concluir)\s*$/gi, '')
    .replace(/\s*[-–—·|]\s*(Vencimento|Prazo|Data de entrega|Entrega|Due)\b[\s\S]*$/gi, '')
    .replace(/\b(Vencimento|Prazo|Data de entrega|Entrega|Due)\s*:[\s\S]*$/gi, '')
    .replace(/\b\d+\s+eventos?\b[\s\S]*$/gi, '')
    .replace(/[,;:·|-]?\s*(segunda|ter[çc]a|quarta|quinta|sexta|s[áa]bado|domingo)(-feira)?\b[\s\S]*$/gi, '')
    .replace(/\s+/g, ' ')
    .replace(/^[\s\-–—·|,;:]+/, '')
    .replace(/[\s\-–—·|,;:]+$/, '')
    .replace(/[\s(\[]+$/, '');
}

/** Agrupa a captura por matéria para criar uma disciplina por curso. */
export function groupScrapedTasks(tasks: ScrapedTask[]): ScrapedCourseGroup[] {
  const groups = new Map<string, ScrapedCourseGroup>();
  for (const task of tasks) {
    const group = groups.get(task.course) ?? { course: task.course, tasks: [] };
    if (!group.teacher && task.teacher) group.teacher = task.teacher;
    group.tasks.push(task);
    groups.set(task.course, group);
  }
  return Array.from(groups.values()).sort((left, right) => left.course.localeCompare(right.course, 'pt-BR'));
}

/** Valida a lista de matérias que voltou da página inicial do Moodle. */
export function normalizeScrapedCourses(input: unknown, limit = 40): ScrapedCourse[] {
  const list = Array.isArray(input) ? input : [];
  const seen = new Set<string>();
  const courses: ScrapedCourse[] = [];
  for (const raw of list) {
    if (!raw || typeof raw !== 'object') continue;
    const record = raw as Record<string, unknown>;
    const name = cleanCourseName(pick(record, ['name', 'nome', 'course', 'curso', 'title', 'titulo', 'título', 'fullname']));
    if (!name || seen.has(name.toLowerCase())) continue;
    seen.add(name.toLowerCase());
    courses.push({
      name,
      id: tidy(pick(record, ['id', 'courseId', 'courseid'])) || undefined,
      teacher: tidy(pick(record, ['teacher', 'professor', 'docente', 'teachers'])) || undefined,
      url: safeUrl(pick(record, ['url', 'link'])),
    });
    if (courses.length >= limit) break;
  }
  return courses;
}

/** Junta as matérias de várias capturas mantendo o professor encontrado. */
export function mergeScrapedCourses(current: ScrapedCourse[], incoming: ScrapedCourse[]): ScrapedCourse[] {
  const byName = new Map(current.map(course => [course.name.toLowerCase(), { ...course }]));
  for (const course of incoming) {
    const key = course.name.toLowerCase();
    const existing = byName.get(key);
    if (existing) {
      if (!existing.teacher && course.teacher) existing.teacher = course.teacher;
      if (!existing.url && course.url) existing.url = course.url;
    } else {
      byName.set(key, { ...course });
    }
  }
  return Array.from(byName.values());
}


function safeUrl(value: unknown): string | undefined {
  const text = tidy(value);
  return /^https?:\/\//i.test(text) ? text : undefined;
}

/** Valida e limpa a lista que voltou da página. */
export function normalizeScrapedTasks(input: unknown, limit = IMPORT_MAX_ITEMS): ScrapedTask[] {
  const list = Array.isArray(input) ? input : [];
  const seen = new Set<string>();
  const tasks: ScrapedTask[] = [];
  for (const raw of list) {
    if (!raw || typeof raw !== 'object') continue;
    const record = raw as Record<string, unknown>;
    const title = cleanActivityTitle(pick(record, ['title', 'titulo', 'título', 'name', 'nome', 'atividade']));
    if (title.length < 4 || title.length > 200) continue;
    if (NAVIGATION_LABEL.test(title)) continue;
    const course = cleanCourseName(pick(record, ['course', 'curso', 'disciplina', 'materia', 'matéria'])) || 'Ambiente acadêmico';
    const task: ScrapedTask = {
      title,
      course,
      teacher: tidy(pick(record, ['teacher', 'professor', 'docente', 'professorName'])) || undefined,
      dueDate: parseDueDate(pick(record, ['dueDate', 'due', 'prazo', 'date', 'data'])),
      url: safeUrl(pick(record, ['url', 'link', 'href'])),
      type: classifyScrapedTask(title),
    };
    const key = scrapedTaskKey(task);
    if (seen.has(key)) continue;
    seen.add(key);
    tasks.push(task);
    if (tasks.length >= limit) break;
  }
  return tasks;
}

/** Junta uma nova captura à lista já pendente (mesma chave = mesma atividade). */
export function mergeScrapedTasks(current: ScrapedTask[], incoming: ScrapedTask[]): ScrapedTask[] {
  const seen = new Set(current.map(scrapedTaskKey));
  const merged = [...current];
  for (const task of incoming) {
    const key = scrapedTaskKey(task);
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(task);
  }
  return merged;
}

/** Categoria usada pelo Planejamento (mesmas palavras do app). */
export function categoryForDueDate(
  iso: string | undefined,
  today: Date = new Date(),
): 'Hoje' | 'Amanhã' | 'Próximas' | 'Atrasadas' {
  if (!iso) return 'Próximas';
  const target = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(target.getTime())) return 'Próximas';
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12);
  const diff = Math.round((target.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return 'Atrasadas';
  if (diff === 0) return 'Hoje';
  if (diff === 1) return 'Amanhã';
  return 'Próximas';
}

/** `2026-03-12` → `12/03/2026` (formato usado nos eventos do app). */
export function formatImportedDate(iso: string | undefined): string {
  if (!iso) return '';
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : iso;
}

export type ScrapeSummary = {
  courses: { count: number; course: string }[];
  dated: number;
  total: number;
};

export function summarizeScrapedTasks(tasks: ScrapedTask[]): ScrapeSummary {
  const byCourse = new Map<string, number>();
  for (const task of tasks) byCourse.set(task.course, (byCourse.get(task.course) ?? 0) + 1);
  return {
    total: tasks.length,
    dated: tasks.filter(task => Boolean(task.dueDate)).length,
    courses: Array.from(byCourse.entries())
      .map(([course, count]) => ({ course, count }))
      .sort((left, right) => right.count - left.count || left.course.localeCompare(right.course, 'pt-BR')),
  };
}

/** Lê a mensagem da WebView (valida a origem declarada pelo script). */
export function parseImportMessage(raw: string | null | undefined): ScrapePayload | null {
  const value = (raw ?? '').trim();
  if (!value) return null;
  let payload: unknown;
  try {
    payload = JSON.parse(value) as unknown;
  } catch {
    return null;
  }
  if (!payload || typeof payload !== 'object') return null;
  const source = payload as Record<string, unknown>;
  if (source.type !== 'scrape') return null;
  if (!Array.isArray(source.items)) return null;
  return {
    items: source.items,
    courses: Array.isArray(source.courses) ? source.courses : undefined,
    partial: source.partial === true,
    source: typeof source.source === 'string' ? source.source : undefined,
    url: typeof source.url === 'string' ? source.url : undefined,
    pageTitle: typeof source.pageTitle === 'string' ? source.pageTitle : undefined,
  };
}
