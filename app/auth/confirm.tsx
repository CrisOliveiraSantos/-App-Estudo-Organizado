import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { consumeSupabaseAuthLink } from '@/lib/supabase-auth-link';
import { useColors } from '@/hooks/use-colors';
import { updateCurrentPassword } from '@/lib/supabase-chat';
import { validateNewPassword } from '@/lib/account-utils';

export default function ConfirmEmailScreen() {
  const colors = useColors();
  const url = Linking.useURL();
  const [state, setState] = useState<'loading' | 'success' | 'recovery' | 'error'>('loading');
  const [message, setMessage] = useState('Confirmando seu acesso…');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    void consumeSupabaseAuthLink(url).then(result => {
      if (!active) return;
      if (result.error) {
        setState('error');
        setMessage('Não foi possível concluir a confirmação. Solicite um novo e-mail de acesso e tente novamente.');
      } else if (result.handled && result.type === 'recovery') {
        setState('recovery');
        setMessage('Seu e-mail foi verificado. Agora crie uma nova senha para voltar ao Chat.');
      } else if (result.handled) {
        setState('success');
        setMessage('E-mail confirmado. Sua conta está pronta para usar o chat e a sincronização.');
      } else {
        setState('error');
        setMessage('Este link não contém uma confirmação válida. Abra novamente o e-mail enviado para sua conta.');
      }
    });
    return () => { active = false; };
  }, [url]);

  const saveNewPassword = async () => {
    const validation = validateNewPassword(password, confirmation);
    if (validation) {
      setMessage(validation);
      return;
    }
    setSaving(true);
    try {
      await updateCurrentPassword(password);
      setState('success');
      setMessage('Nova senha salva. Agora você pode entrar no Chat com segurança.');
      setPassword('');
      setConfirmation('');
    } catch {
      setMessage('Não foi possível salvar a nova senha. Abra novamente o e-mail de recuperação e tente de novo.');
    } finally {
      setSaving(false);
    }
  };

  return <ScreenContainer edges={['top', 'bottom', 'left', 'right']}><View className="flex-1 justify-center px-6"><View className="bg-surface border border-border rounded-3xl p-6"><Text className="text-xs font-bold text-primary">ESTUDO ORGANIZADO</Text><Text className="text-3xl font-bold text-foreground mt-2">{state === 'recovery' ? 'Criar nova senha' : state === 'success' ? 'Tudo certo' : 'Confirmação de e-mail'}</Text>{state === 'loading' && <ActivityIndicator color={colors.primary} className="mt-6 self-start"/>}<Text className="text-muted leading-6 mt-4">{message}</Text>{state === 'recovery' && <View className="mt-5"><TextInput value={password} onChangeText={setPassword} secureTextEntry placeholder="Nova senha (mínimo 8 caracteres)" placeholderTextColor={colors.muted} className="bg-background border border-border rounded-xl px-3 py-3 text-foreground mb-3" /><TextInput value={confirmation} onChangeText={setConfirmation} secureTextEntry onSubmitEditing={() => { void saveNewPassword(); }} placeholder="Confirme a nova senha" placeholderTextColor={colors.muted} className="bg-background border border-border rounded-xl px-3 py-3 text-foreground" /><TouchableOpacity onPress={() => { void saveNewPassword(); }} disabled={saving} accessibilityRole="button" accessibilityLabel="Salvar nova senha" style={[styles.primaryButton, { backgroundColor: colors.primary }, saving && styles.disabled]}><Text style={styles.primaryButtonText}>{saving ? 'Salvando…' : 'Salvar nova senha'}</Text></TouchableOpacity></View>}{state !== 'recovery' && <TouchableOpacity onPress={() => router.replace('/(tabs)/chat')} accessibilityRole="button" accessibilityLabel="Ir para o Chat" style={[styles.primaryButton, { backgroundColor: colors.primary }]}><Text style={styles.primaryButtonText}>Ir para o Chat</Text></TouchableOpacity>}</View></View></ScreenContainer>;
}

const styles = StyleSheet.create({
  disabled: { opacity: 0.55 },
  primaryButton: { alignItems: 'center', borderRadius: 12, justifyContent: 'center', marginTop: 20, minHeight: 48, paddingHorizontal: 16 },
  primaryButtonText: { color: '#fff', fontWeight: '800' },
});
