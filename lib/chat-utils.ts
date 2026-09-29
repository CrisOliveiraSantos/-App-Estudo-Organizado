export type CloudMessage = {
  id: string;
  sender_id: string;
  sender_email: string;
  sender_name: string;
  room: 'public' | 'private';
  recipient_id: string | null;
  recipient_email: string | null;
  text: string;
  created_at: string;
};

const normalizeEmail = (email: string) => email.trim().toLowerCase();

export function readableSupabaseError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? '');
  const normalized = message.toLowerCase();
  if (normalized.includes('email not confirmed')) return 'Confirme seu e-mail antes de entrar na conta.';
  if (normalized.includes('invalid login credentials')) return 'E-mail ou senha incorretos.';
  if (normalized.includes('user already registered')) return 'Já existe uma conta com este e-mail. Use Entrar.';
  if (normalized.includes('password should be at least')) return 'Use uma senha com pelo menos 8 caracteres.';
  if (normalized.includes('rate limit')) return 'Foram feitas muitas tentativas. Aguarde alguns minutos antes de tentar novamente.';
  if (normalized.includes('network') || normalized.includes('fetch')) return 'Não foi possível conectar agora. Seus estudos continuam disponíveis neste dispositivo.';
  return 'Não foi possível concluir esta ação. Revise os dados e tente novamente.';
}

export function isMessageInConversation(message: CloudMessage, room: 'public' | 'private', currentEmail?: string, recipientEmail?: string) {
  if (room === 'public') return message.room === 'public';
  if (message.room !== 'private' || !currentEmail || !recipientEmail) return false;
  const current = normalizeEmail(currentEmail);
  const recipient = normalizeEmail(recipientEmail);
  return (
    (normalizeEmail(message.sender_email) === current && normalizeEmail(message.recipient_email ?? '') === recipient)
    || (normalizeEmail(message.sender_email) === recipient && normalizeEmail(message.recipient_email ?? '') === current)
  );
}

export function shouldSendChatOnEnter(key: string, shiftKey = false) {
  return key === 'Enter' && !shiftKey;
}
