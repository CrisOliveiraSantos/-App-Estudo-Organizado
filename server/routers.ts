import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createLocalAccount, createLocalSession, createPersistedChatMessage, findLocalAccountByEmail, getLocalAccountByTokenHash, listPersistedChatMessages } from "./db";
import { clearSessionCookie, createSessionToken, hashPassword, hashSessionToken, readSessionToken, sessionExpiration, setSessionCookie, verifyPassword, LOCAL_SESSION_COOKIE } from "./local-auth";
import { crisRouter } from './cris';
import { academicRouter } from './academic';

type ServerChatMessage = { id: string; author: string; text: string; room: 'Sala pública' | 'Conversa privada'; recipient?: string; createdAt: string };
const serverChatMessages: ServerChatMessage[] = [
  { id: 'server-1', author: 'Rafa', text: 'Alguém já revisou o padrão MVC?', room: 'Sala pública', createdAt: '18:32' },
  { id: 'server-2', author: 'Cris', text: 'Estou estudando agora. Posso compartilhar minhas anotações.', room: 'Sala pública', createdAt: '18:34' },
];

async function localAccountFromRequest(req: Parameters<typeof readSessionToken>[0]) {
  const token = readSessionToken(req);
  return token ? getLocalAccountByTokenHash(hashSessionToken(token)) : undefined;
}

function publicAccount(account: { id: number; email: string; displayName: string }) {
  return { id: account.id, email: account.email, displayName: account.displayName };
}

export const appRouter = router({
  system: systemRouter,
  cris: crisRouter,
  academic: academicRouter,
  chat: router({
    list: publicProcedure.input(z.object({ room: z.enum(['Sala pública', 'Conversa privada']).default('Sala pública'), recipient: z.string().optional() })).query(async ({ ctx, input }) => {
      const account = await localAccountFromRequest(ctx.req);
      if (!account) return serverChatMessages.filter(message => message.room === input.room);
      if (input.room === 'Sala pública') {
        const stored = await listPersistedChatMessages('public', account.id);
        return stored.length ? stored.map(message => ({ id: String(message.id), author: account.displayName, text: message.text, room: 'Sala pública' as const, createdAt: message.createdAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) })) : serverChatMessages.filter(message => message.room === input.room);
      }
      const recipient = input.recipient ? await findLocalAccountByEmail(input.recipient.toLowerCase()) : undefined;
      if (!recipient) return [];
      const stored = await listPersistedChatMessages('private', account.id, recipient.id);
      return stored.map(message => ({ id: String(message.id), author: message.senderId === account.id ? account.displayName : recipient.displayName, text: message.text, room: 'Conversa privada' as const, recipient: input.recipient, createdAt: message.createdAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) }));
    }),
    send: publicProcedure.input(z.object({ text: z.string().min(1).max(4000), room: z.enum(['Sala pública', 'Conversa privada']), recipient: z.string().email().optional() })).mutation(async ({ ctx, input }) => {
      const account = await localAccountFromRequest(ctx.req);
      if (!account) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Entre ou crie uma conta para enviar mensagens.' });
      const recipient = input.room === 'Conversa privada' && input.recipient ? await findLocalAccountByEmail(input.recipient.toLowerCase()) : undefined;
      if (input.room === 'Conversa privada' && !recipient) throw new TRPCError({ code: 'NOT_FOUND', message: 'Destinatário não encontrado. Use o e-mail cadastrado.' });
      const id = await createPersistedChatMessage({ room: input.room === 'Sala pública' ? 'public' : 'private', senderId: account.id, recipientId: recipient?.id, recipientHandle: input.recipient?.toLowerCase(), text: input.text });
      return { id: String(id || Date.now()), author: account.displayName, text: input.text, room: input.room, recipient: input.recipient, createdAt: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) };
    }),
  }),
  ocr: router({
    extract: publicProcedure.input(z.object({ imageBase64: z.string().min(1), mimeType: z.string().default('image/jpeg') })).mutation(async ({ input }) => {
      const response = await invokeLLM({ model: 'gemini-3-flash-preview', messages: [{ role: 'system', content: 'Você é um OCR preciso. Extraia somente o texto visível na imagem, preservando parágrafos, títulos, listas e acentuação. Não invente conteúdo; quando algo estiver ilegível, use [ilegível].' }, { role: 'user', content: [{ type: 'text', text: 'Transcreva integralmente esta página para estudo.' }, { type: 'image_url', image_url: { url: `data:${input.mimeType};base64,${input.imageBase64}`, detail: 'high' } }] }], maxTokens: 4096 });
      const content = response.choices?.[0]?.message?.content;
      return { text: typeof content === 'string' ? content : '' };
    }),
    extractPdf: publicProcedure.input(z.object({ pdfBase64: z.string().min(1) })).mutation(async ({ input }) => {
      const response = await invokeLLM({ model: 'gemini-3-flash-preview', messages: [{ role: 'system', content: 'Você é um OCR de documentos. Extraia todo o texto legível do PDF, página por página. Preserve títulos, parágrafos, listas e tabelas em texto. Comece cada página com o marcador [PÁGINA N]. Não invente conteúdo; use [ilegível] quando necessário.' }, { role: 'user', content: [{ type: 'text', text: 'Transcreva integralmente este documento PDF para revisão e estudo.' }, { type: 'file_url', file_url: { url: `data:application/pdf;base64,${input.pdfBase64}`, mime_type: 'application/pdf' } }] }], maxTokens: 12000 });
      const content = response.choices?.[0]?.message?.content;
      return { text: typeof content === 'string' ? content : '' };
    }),
  }),
  auth: router({
    me: publicProcedure.query(async ({ ctx }) => { const account = await localAccountFromRequest(ctx.req); return account ? publicAccount(account) : null; }),
    register: publicProcedure.input(z.object({ email: z.string().email(), displayName: z.string().min(2).max(80), password: z.string().min(8).max(128) })).mutation(async ({ ctx, input }) => { const email = input.email.toLowerCase().trim(); if (await findLocalAccountByEmail(email)) throw new TRPCError({ code: 'CONFLICT', message: 'Este e-mail já está cadastrado.' }); const id = await createLocalAccount({ email, displayName: input.displayName.trim(), passwordHash: hashPassword(input.password) }); const token = createSessionToken(); await createLocalSession(id, hashSessionToken(token), sessionExpiration()); setSessionCookie(ctx.req, ctx.res, token); return { id, email, displayName: input.displayName.trim() }; }),
    login: publicProcedure.input(z.object({ email: z.string().email(), password: z.string().min(1) })).mutation(async ({ ctx, input }) => { const account = await findLocalAccountByEmail(input.email.toLowerCase().trim()); if (!account || !verifyPassword(input.password, account.passwordHash)) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'E-mail ou senha inválidos.' }); const token = createSessionToken(); await createLocalSession(account.id, hashSessionToken(token), sessionExpiration()); setSessionCookie(ctx.req, ctx.res, token); return publicAccount(account); }),
    logout: publicProcedure.mutation(({ ctx }) => { clearSessionCookie(ctx.req, ctx.res); return { success: true, cookie: LOCAL_SESSION_COOKIE }; }),
  }),
});

export type AppRouter = typeof appRouter;
