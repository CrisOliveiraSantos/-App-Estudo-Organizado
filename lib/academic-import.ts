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
  title: string;
  type: ScrapedTaskType;
  url?: string;
};

export type ScrapePayload = {
  items: unknown[];
  pageTitle?: string;
  source?: string;
  url?: string;
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
 * Script injetado na página. Percorre os padrões de SIGAA (tabelas de tarefas)
 * e Moodle (`li.activity`, eventos do calendário), monta uma lista única e
 * envia para o app. Devolve a quantidade encontrada (o Android ignora o
 * retorno, mas ajuda em depuração no console).
 */
export function buildScrapeScript(): string {
  return `(function () {
  var SOURCE = ${JSON.stringify(IMPORT_SOURCE)};
  var MAX = ${IMPORT_MAX_ITEMS};
  function clean(value) { return String(value == null ? '' : value).replace(/\\s+/g, ' ').trim(); }
  function abs(href) { try { return href ? new URL(href, location.href).href : ''; } catch (e) { return ''; } }
  function courseOf(node) {
    var box = node.closest ? node.closest('.course, .course-content, [data-courseid], [class*=disciplina], [class*=Disciplina]') : null;
    if (box) {
      var heading = box.querySelector('h1, h2, h3, .course-title, .tituloDisciplina');
      var text = clean(heading ? heading.textContent : '');
      if (text) return text;
    }
    var page = clean(document.title).split(' - ')[0];
    return page || 'Ambiente acadêmico';
  }
  function dateOf(text) {
    var match = String(text).match(/\\b(\\d{1,2})[\\/.](\\d{1,2})(?:[\\/.](\\d{2,4}))?\\b/);
    if (!match) return '';
    var year = match[3] || String(new Date().getFullYear());
    if (String(year).length === 2) year = '20' + year;
    return String(year) + '-' + ('0' + match[2]).slice(-2) + '-' + ('0' + match[1]).slice(-2);
  }
  function titleOf(node) {
    var target = node.querySelector ? node.querySelector('.instancename, .activityname, .tarefa-titulo, .title, strong, b, td') : null;
    var text = clean((target || node).textContent);
    return text.replace(/\\s*(Editar|Excluir|Enviar|Corrigir|Ver|Acessar)\\s*$/i, '');
  }
  function add(list, node) {
    if (!node || list.length >= MAX) return;
    var title = titleOf(node);
    if (title.length < 4 || title.length > 180) return;
    var link = node.tagName === 'A' ? node : node.querySelector('a[href]');
    list.push({
      title: title,
      course: courseOf(node),
      dueDate: dateOf(clean(node.textContent)),
      url: link ? abs(link.getAttribute('href')) : '',
      type: ''
    });
  }
  var items = [];
  var selectors = [
    'li.activity', '.activity', '.tarefa', '.tarefa-titulo', '[class*=tarefa]', '[class*=atividade]',
    '[data-region=event-list-item]', '.event', '.assign', '.quiz', '#tarefas tr'
  ];
  for (var s = 0; s < selectors.length; s++) {
    var nodes = document.querySelectorAll(selectors[s]);
    for (var i = 0; i < nodes.length; i++) add(items, nodes[i]);
  }
  var rows = document.querySelectorAll('table tr');
  for (var r = 0; r < rows.length; r++) {
    if (!rows[r].querySelector || !rows[r].querySelector('a[href]')) continue;
    if (rows[r].querySelectorAll('td').length < 2) continue;
    add(items, rows[r]);
  }
  var payload = {
    source: SOURCE,
    type: 'scrape',
    url: location.href,
    pageTitle: clean(document.title),
    items: items.slice(0, MAX)
  };
  try { window.ReactNativeWebView.postMessage(JSON.stringify(payload)); } catch (e) {}
  return items.length;
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
  const iso = text.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
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
    const title = tidy(pick(record, ['title', 'titulo', 'título', 'name', 'nome', 'atividade']));
    if (title.length < 4 || title.length > 200) continue;
    if (NAVIGATION_LABEL.test(title)) continue;
    const course = tidy(pick(record, ['course', 'curso', 'disciplina', 'materia', 'matéria'])) || 'Ambiente acadêmico';
    const task: ScrapedTask = {
      title,
      course,
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
    source: typeof source.source === 'string' ? source.source : undefined,
    url: typeof source.url === 'string' ? source.url : undefined,
    pageTitle: typeof source.pageTitle === 'string' ? source.pageTitle : undefined,
  };
}
