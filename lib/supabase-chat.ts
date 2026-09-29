import { getSupabaseEmailRedirectUrl } from './supabase-auth-link';
import { supabase } from './supabase';
import { isMessageInConversation, readableSupabaseError } from './chat-utils';
import type { CloudMessage } from './chat-utils';

export { isMessageInConversation, readableSupabaseError } from './chat-utils';
export type { CloudMessage } from './chat-utils';

type Profile = { id: string; email: string; display_name: string };
export type AccountProfile = { id: string; email: string; displayName: string; bio: string };

const normalizeEmail = (email: string) => email.trim().toLowerCase();

export async function signUpWithSupabase(email: string, password: string, displayName: string) {
  if (!supabase) throw new Error('Supabase não configurado');
  const { data, error } = await supabase.auth.signUp({
    email: normalizeEmail(email),
    password,
    options: {
      data: { display_name: displayName },
      emailRedirectTo: getSupabaseEmailRedirectUrl(),
    },
  });
  if (error) throw error;
  return data;
}

export async function signInWithSupabase(email: string, password: string) {
  if (!supabase) throw new Error('Supabase não configurado');
  const { data, error } = await supabase.auth.signInWithPassword({ email: normalizeEmail(email), password });
  if (error) throw error;
  return data;
}

export async function requestPasswordReset(email: string) {
  if (!supabase) throw new Error('Supabase não configurado');
  const { error } = await supabase.auth.resetPasswordForEmail(normalizeEmail(email), {
    redirectTo: getSupabaseEmailRedirectUrl(),
  });
  if (error) throw error;
}

export async function getCurrentAccountProfile(): Promise<AccountProfile | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  const user = data.user;
  if (!user?.email) return null;
  return {
    id: user.id,
    email: user.email,
    displayName: String(user.user_metadata?.display_name ?? user.email.split('@')[0] ?? 'Estudante'),
    bio: String(user.user_metadata?.bio ?? ''),
  };
}

export async function updateCurrentAccountProfile(input: Pick<AccountProfile, 'displayName' | 'bio'>): Promise<AccountProfile> {
  if (!supabase) throw new Error('Supabase não configurado');
  const displayName = input.displayName.trim();
  if (!displayName) throw new Error('Informe um nome de exibição.');
  const bio = input.bio.trim();
  const { data, error } = await supabase.auth.updateUser({ data: { display_name: displayName, bio } });
  if (error || !data.user?.email) throw error ?? new Error('Não foi possível atualizar o perfil.');
  const { error: profileError } = await supabase.from('profiles').update({ display_name: displayName }).eq('id', data.user.id);
  if (profileError) throw profileError;
  return { id: data.user.id, email: data.user.email, displayName, bio };
}

export async function updateCurrentPassword(password: string) {
  if (!supabase) throw new Error('Supabase não configurado');
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
}

export async function signOutFromSupabase() {
  if (!supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

async function getProfileByEmail(email: string) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('id,email,display_name')
    .eq('email', normalizeEmail(email))
    .maybeSingle();
  if (error) throw error;
  return data as Profile | null;
}

export async function listCloudMessages(room: 'public' | 'private', currentEmail?: string, recipientEmail?: string) {
  if (!supabase) return [] as CloudMessage[];
  const query = supabase.from('messages').select('*').eq('room', room).order('created_at', { ascending: true }).limit(200);
  if (room === 'private') {
    const current = currentEmail ? normalizeEmail(currentEmail) : '';
    const recipient = recipientEmail ? normalizeEmail(recipientEmail) : '';
    if (!current || !recipient) return [] as CloudMessage[];
    query.or(`and(sender_email.eq.${current},recipient_email.eq.${recipient}),and(sender_email.eq.${recipient},recipient_email.eq.${current})`);
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as CloudMessage[];
}

export async function sendCloudMessage(input: { room: 'public' | 'private'; recipientEmail?: string; text: string }) {
  if (!supabase) throw new Error('Supabase não configurado');
  const { data: userData, error: userError } = await supabase.auth.getUser();
  const user = userData.user;
  if (userError || !user || !user.email) throw userError ?? new Error('Sessão expirada');
  const senderEmail = normalizeEmail(user.email);
  const displayName = String(user.user_metadata?.display_name ?? senderEmail.split('@')[0] ?? 'Estudante');

  let recipient: Profile | null = null;
  if (input.room === 'private') {
    if (!input.recipientEmail?.trim()) throw new Error('Informe o e-mail da pessoa com quem deseja conversar.');
    recipient = await getProfileByEmail(input.recipientEmail.trim());
    if (!recipient) throw new Error('Não encontramos uma conta confirmada com este e-mail.');
    if (recipient.id === user.id) throw new Error('Escolha outra pessoa para iniciar uma conversa privada.');
  }

  const { data, error } = await supabase.from('messages').insert({
    sender_id: user.id,
    sender_email: senderEmail,
    sender_name: displayName,
    room: input.room,
    recipient_id: recipient?.id ?? null,
    recipient_email: recipient?.email ?? null,
    text: input.text.trim(),
  }).select().single();
  if (error) throw error;
  return data as CloudMessage;
}

export function subscribeToCloudMessages(onMessage: (message: CloudMessage) => void) {
  const client = supabase;
  if (!client) return () => undefined;
  const channel = client
    .channel(`messages-${Date.now()}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => onMessage(payload.new as CloudMessage))
    .subscribe();
  return () => { void client.removeChannel(channel); };
}
