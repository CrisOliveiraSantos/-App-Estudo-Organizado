import { describe, expect, it } from 'vitest';
import { isMessageInConversation, readableSupabaseError, shouldSendChatOnEnter } from '../lib/chat-utils';
import type { CloudMessage } from '../lib/chat-utils';

const privateMessage: CloudMessage = {
  id: 'message-1',
  sender_id: 'user-a',
  sender_email: 'ana@example.com',
  sender_name: 'Ana',
  room: 'private',
  recipient_id: 'user-b',
  recipient_email: 'bia@example.com',
  text: 'Mensagem privada',
  created_at: '2026-08-27T05:00:00.000Z',
};

describe('regras do chat Supabase', () => {
  it('exibe mensagem privada apenas na conversa entre os dois participantes', () => {
    expect(isMessageInConversation(privateMessage, 'private', 'ana@example.com', 'bia@example.com')).toBe(true);
    expect(isMessageInConversation(privateMessage, 'private', 'BIA@example.com', 'ANA@example.com')).toBe(true);
    expect(isMessageInConversation(privateMessage, 'private', 'ana@example.com', 'carlos@example.com')).toBe(false);
    expect(isMessageInConversation(privateMessage, 'public', 'ana@example.com')).toBe(false);
  });

  it('traduz erros de autenticação sem exibir detalhes técnicos', () => {
    expect(readableSupabaseError(new Error('Email not confirmed'))).toContain('Confirme seu e-mail');
    expect(readableSupabaseError(new Error('Invalid login credentials'))).toContain('E-mail ou senha');
    expect(readableSupabaseError(new Error('Unexpected character: <'))).toBe('Não foi possível concluir esta ação. Revise os dados e tente novamente.');
  });

  it('reserva Enter para envio e preserva Shift+Enter para uma futura quebra de linha', () => {
    expect(shouldSendChatOnEnter('Enter')).toBe(true);
    expect(shouldSendChatOnEnter('Enter', true)).toBe(false);
    expect(shouldSendChatOnEnter('a')).toBe(false);
  });
});
