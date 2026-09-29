import { router, publicProcedure } from './_core/trpc';
import { getLocalAccountByTokenHash } from './db';
import { hashSessionToken, readSessionToken } from './local-auth';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';

const connectionInput = z.object({
  baseUrl: z.string().url().max(500),
  token: z.string().min(8).max(500),
});

async function callMoodle(baseUrl: string, token: string, functionName: string, extra: Record<string, string> = {}) {
  const endpoint = moodleEndpoint(baseUrl);
  const params = new URLSearchParams({ wstoken: token, wsfunction: functionName, moodlewsrestformat: 'json', ...extra });
  const response = await fetch(`${endpoint}?${params.toString()}`, { method: 'GET', headers: { Accept: 'application/json' } });
  const payload = await response.json() as Record<string, unknown>;
  if (!response.ok || payload.exception) throw new TRPCError({ code: 'UNAUTHORIZED', message: String(payload.message ?? 'O Moodle recusou o token ou a função solicitada não está habilitada.') });
  return payload;
}

function moodleEndpoint(baseUrl: string) {
  const parsed = new URL(baseUrl);
  if (parsed.protocol !== 'https:') throw new TRPCError({ code: 'BAD_REQUEST', message: 'Use somente um endereço HTTPS institucional.' });
  return `${parsed.origin}${parsed.pathname.replace(/\/$/, '')}/webservice/rest/server.php`;
}

async function requireAcademicSession(req: Parameters<typeof readSessionToken>[0], hasBackendUser: boolean) {
  if (hasBackendUser) return;
  const token = readSessionToken(req);
  const account = token ? await getLocalAccountByTokenHash(hashSessionToken(token)) : undefined;
  if (!account) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Entre no Estudo Organizado antes de conectar um ambiente acadêmico.' });
}

export const academicRouter = router({
  testMoodle: publicProcedure.input(connectionInput).mutation(async ({ ctx, input }) => {
    await requireAcademicSession(ctx.req, Boolean(ctx.user));
    const endpoint = moodleEndpoint(input.baseUrl);
    try {
      const payload = await callMoodle(input.baseUrl, input.token, 'core_webservice_get_site_info') as { sitename?: string; username?: string };
      return { ok: true, provider: 'moodle' as const, siteName: payload.sitename ?? 'Moodle institucional', username: payload.username ?? 'usuária autorizada' };
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      throw new TRPCError({ code: 'BAD_GATEWAY', message: 'Não foi possível alcançar o Web Service do Moodle. Verifique o endereço, o token e se a API está habilitada.' });
    }
  }),
  getCourseContents: publicProcedure.input(connectionInput.extend({ courseId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    await requireAcademicSession(ctx.req, Boolean(ctx.user));
    try {
      const payload = await callMoodle(input.baseUrl, input.token, 'core_course_get_contents', { courseid: String(input.courseId) }) as unknown as Array<{ id?: number; name?: string; summary?: string; modules?: Array<{ id?: number; name?: string; description?: string; url?: string; modname?: string; contents?: Array<{ filename?: string; fileurl?: string; filesize?: number; mimetype?: string; type?: string }> }> }>;
      const modules = Array.isArray(payload) ? payload.flatMap(section => (section.modules ?? []).map(module => {
        const files = (module.contents ?? []).map(file => ({ name: file.filename ?? 'Arquivo', url: file.fileurl ?? '', mime: file.mimetype ?? '', type: file.type ?? '' }));
        const urls = [module.url ?? '', ...files.map(file => file.url)].filter(Boolean);
        const youtubeUrl = urls.find(value => /(?:youtube\.com|youtu\.be)/i.test(value)) ?? '';
        const file = files.find(item => /pdf/i.test(item.mime) || /\.pdf(?:$|\?)/i.test(item.name));
        const type = youtubeUrl ? 'video' : file ? 'pdf' : files.length ? 'file' : /video|url|page/i.test(module.modname ?? '') ? 'video' : 'text';
        return { section: section.name ?? 'Módulo', title: module.name ?? 'Material sem nome', description: module.description ?? '', url: module.url ?? '', type, files, youtubeUrl };
      })) : [];
      return { ok: true, modules };
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      throw new TRPCError({ code: 'BAD_GATEWAY', message: 'Não foi possível buscar os materiais autorizados desta disciplina.' });
    }
  }),
  syncAcademic: publicProcedure.input(connectionInput).mutation(async ({ ctx, input }) => {
    await requireAcademicSession(ctx.req, Boolean(ctx.user));
    try {
      const site = await callMoodle(input.baseUrl, input.token, 'core_webservice_get_site_info') as { userid?: number; sitename?: string };
      if (!site.userid) throw new TRPCError({ code: 'BAD_GATEWAY', message: 'O Moodle não informou o identificador da conta autorizada.' });
      const coursePayload = await callMoodle(input.baseUrl, input.token, 'core_enrol_get_users_courses', { userid: String(site.userid) }) as unknown as Array<{ id?: number; fullname?: string; shortname?: string }>;
      const courses = Array.isArray(coursePayload) ? coursePayload.filter(course => course.id).map(course => ({ id: course.id as number, title: course.fullname ?? course.shortname ?? 'Disciplina sem nome', code: course.shortname ?? '' })) : [];
      const courseParams = Object.fromEntries(courses.slice(0, 30).flatMap((course, index) => [[`courseids[${index}]`, String(course.id)]]));
      const warnings: string[] = [];
      const contentItems: Array<{ courseId: number; courseTitle: string; section: string; title: string; description: string; url: string; type: string; files: Array<{ name: string; url: string; mime: string; type: string }>; youtubeUrl: string }> = [];
      for (const course of courses.slice(0, 30)) {
        try {
          const content = await callMoodle(input.baseUrl, input.token, 'core_course_get_contents', { courseid: String(course.id) }) as unknown as Array<{ name?: string; modules?: Array<{ id?: number; name?: string; description?: string; url?: string; modname?: string; contents?: Array<{ filename?: string; fileurl?: string; mimetype?: string; type?: string }> }> }>;
          for (const section of content) for (const module of section.modules ?? []) {
            const files = (module.contents ?? []).map(file => ({ name: file.filename ?? 'Arquivo', url: file.fileurl ?? '', mime: file.mimetype ?? '', type: file.type ?? '' }));
            const urls = [module.url ?? '', ...files.map(file => file.url)].filter(Boolean);
            const youtubeUrl = urls.find(value => /(?:youtube\.com|youtu\.be)/i.test(value)) ?? '';
            const pdf = files.some(file => /pdf/i.test(file.mime) || /\.pdf(?:$|\?)/i.test(file.name));
            contentItems.push({ courseId: course.id, courseTitle: course.title, section: section.name ?? 'Módulo', title: module.name ?? 'Material sem nome', description: module.description ?? '', url: module.url ?? '', type: youtubeUrl ? 'video' : pdf ? 'pdf' : files.length ? 'file' : /video|url|page/i.test(module.modname ?? '') ? 'video' : 'text', files, youtubeUrl });
          }
        } catch { warnings.push(`Conteúdos de ${course.title} não habilitados`); }
      }
      let calendar: Array<{ id?: number; name?: string; description?: string; timesort?: number; url?: string; modname?: string }> = [];
      let assignments: Array<{ id?: number; name?: string; duedate?: number; intro?: string; course?: number; cmid?: number }> = [];
      let forums: Array<{ id?: number; name?: string; intro?: string; course?: number; cmid?: number }> = [];
      try { const result = await callMoodle(input.baseUrl, input.token, 'core_calendar_get_action_events', { timesortfrom: '0', timesortto: '2147483647', limitnum: '100' }) as { events?: typeof calendar }; calendar = result.events ?? []; } catch { warnings.push('Calendário de ações não habilitado'); }
      try { const result = await callMoodle(input.baseUrl, input.token, 'mod_assign_get_assignments', courseParams) as { courses?: Array<{ assignments?: typeof assignments }> }; assignments = (result.courses ?? []).flatMap(course => course.assignments ?? []); } catch { warnings.push('Tarefas de envio não habilitadas'); }
      try { const result = await callMoodle(input.baseUrl, input.token, 'mod_forum_get_forums_by_courses', courseParams) as unknown as typeof forums; forums = Array.isArray(result) ? result : []; } catch { warnings.push('Fóruns/avisos não habilitados'); }
      return { ok: true, siteName: site.sitename ?? 'Moodle institucional', courses, calendar, assignments, forums, contentItems, warnings, syncedAt: new Date().toISOString() };
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      throw new TRPCError({ code: 'BAD_GATEWAY', message: 'Não foi possível sincronizar os dados acadêmicos autorizados.' });
    }
  }),
  listCourses: publicProcedure.input(connectionInput).mutation(async ({ ctx, input }) => {
    await requireAcademicSession(ctx.req, Boolean(ctx.user));
    try {
      const site = await callMoodle(input.baseUrl, input.token, 'core_webservice_get_site_info') as { userid?: number; sitename?: string };
      if (!site.userid) throw new TRPCError({ code: 'BAD_GATEWAY', message: 'O Moodle não informou o identificador da conta autorizada.' });
      const payload = await callMoodle(input.baseUrl, input.token, 'core_enrol_get_users_courses', { userid: String(site.userid) }) as unknown as Array<{ id?: number; fullname?: string; shortname?: string; summary?: string }>;
      const courses = Array.isArray(payload) ? payload.map(course => ({ id: course.id, title: course.fullname ?? course.shortname ?? 'Disciplina sem nome', code: course.shortname ?? '', summary: course.summary ?? '' })).filter(course => course.id) : [];
      return { ok: true, siteName: site.sitename ?? 'Moodle institucional', courses };
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      throw new TRPCError({ code: 'BAD_GATEWAY', message: 'Não foi possível buscar as disciplinas autorizadas no Moodle.' });
    }
  }),
});
