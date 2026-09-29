import { useEffect, useState } from 'react';
import { Alert, ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { AcademicButton, AcademicCard, AcademicPill, academicColors } from '@/components/academic/design-system';
import { getCurrentAccountProfile, readableSupabaseError, signOutFromSupabase, updateCurrentAccountProfile, type AccountProfile } from '@/lib/supabase-chat';
import { isSupabaseConfigured } from '@/lib/supabase';

export default function ProfileScreen() {
  const colors = useColors();
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  useEffect(() => { let active = true; if (!isSupabaseConfigured) { setLoading(false); return; } void getCurrentAccountProfile().then(account => { if (!active) return; setProfile(account); setName(account?.displayName ?? ''); setBio(account?.bio ?? ''); }).catch(error => { if (active) setFeedback(readableSupabaseError(error)); }).finally(() => { if (active) setLoading(false); }); return () => { active = false; }; }, []);
  const saveProfile = async () => { setFeedback(null); setSaving(true); try { const next = await updateCurrentAccountProfile({ displayName: name, bio }); setProfile(next); setName(next.displayName); setBio(next.bio); setFeedback('Perfil atualizado. Seu novo nome aparecerá nas próximas mensagens.'); } catch (error) { setFeedback(readableSupabaseError(error)); } finally { setSaving(false); } };
  const signOut = async () => { try { await signOutFromSupabase(); router.replace('/chat'); } catch (error) { Alert.alert('Não foi possível sair', readableSupabaseError(error)); } };

  return <ScreenContainer edges={['top', 'bottom', 'left', 'right']} style={[styles.screen, { backgroundColor: colors.background }]}><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
    <TouchableOpacity onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Voltar para Configurações" style={styles.back}><Text style={[styles.backText, { color: colors.primary }]}>← Voltar para Ajustes</Text></TouchableOpacity>
    <Text style={styles.overline}>CONTA E PERFIL</Text><Text style={[styles.title, { color: colors.foreground }]}>Meu perfil</Text><Text style={[styles.subtitle, { color: colors.muted }]}>Cuide de como seu nome aparece e mantenha as informações da sua conta organizadas.</Text>
    {loading ? <ActivityIndicator color={colors.primary} style={styles.spinner} /> : !isSupabaseConfigured || !profile ? <AcademicCard style={[styles.signInCard, { backgroundColor: colors.surface, borderColor: colors.border }]}><View style={styles.signInMark}><Text style={styles.signInMarkText}>C</Text></View><Text style={[styles.cardTitle, { color: colors.foreground }]}>Entre para personalizar seu perfil</Text><Text style={[styles.cardDescription, { color: colors.muted }]}>O perfil usa a conta já criada na área de Conversas. Depois de entrar, o e-mail da sua própria conta aparecerá apenas aqui.</Text><AcademicButton label="Ir para Entrar" onPress={() => router.replace('/chat')} /></AcademicCard> : <>
      <View style={styles.profileHero}><View style={styles.avatar}><Text style={styles.avatarText}>{profile.displayName.slice(0, 1).toUpperCase()}</Text></View><View style={styles.profileHeroCopy}><Text style={styles.profileHeroName}>{profile.displayName}</Text><Text numberOfLines={1} style={styles.profileHeroEmail}>{profile.email}</Text><AcademicPill label="Conta conectada" tone="success" /></View></View>
      <AcademicCard style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}><Text style={[styles.cardTitle, { color: colors.foreground }]}>Sua apresentação</Text><Text style={[styles.cardDescription, { color: colors.muted }]}>Esse nome é usado para identificar sua participação nas áreas conectadas.</Text><Text style={[styles.inputLabel, { color: colors.muted }]}>Nome de exibição</Text><TextInput value={name} onChangeText={setName} placeholder="Como quer ser chamada?" placeholderTextColor={colors.muted} style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]} /><Text style={[styles.inputLabel, { color: colors.muted }]}>Sobre você</Text><TextInput value={bio} onChangeText={setBio} placeholder="Ex.: Estudante de Engenharia de Software" placeholderTextColor={colors.muted} multiline textAlignVertical="top" maxLength={240} style={[styles.bioInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]} /><Text style={[styles.counter, { color: colors.muted }]}>{bio.length}/240 caracteres</Text><AcademicButton label={saving ? 'Salvando…' : 'Salvar perfil'} onPress={() => { void saveProfile(); }} disabled={saving} /></AcademicCard>
      {feedback ? <View style={[styles.feedback, { backgroundColor: feedback.startsWith('Perfil atualizado') ? '#E8F6EF' : '#FDECEF' }]}><Text style={[styles.feedbackText, { color: feedback.startsWith('Perfil atualizado') ? academicColors.success : academicColors.danger }]}>{feedback}</Text></View> : null}
      <AcademicCard style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}><View style={styles.securityHeading}><View><Text style={[styles.cardTitle, { color: colors.foreground }]}>Segurança</Text><Text style={[styles.cardDescription, { color: colors.muted }]}>Sua senha não é exibida ou editada diretamente aqui.</Text></View><View style={styles.securityIcon}><Text style={styles.securityIconText}>⌁</Text></View></View><Text style={[styles.securityText, { color: colors.muted }]}>Use a opção “Esqueci minha senha” na área de acesso para receber instruções seguras no e-mail da sua própria conta.</Text><TouchableOpacity onPress={() => router.replace('/chat')} accessibilityRole="button" style={[styles.outlineButton, { borderColor: colors.border }]}><Text style={[styles.outlineButtonText, { color: colors.primary }]}>Abrir opções de acesso</Text><Text style={[styles.outlineButtonArrow, { color: colors.primary }]}>›</Text></TouchableOpacity></AcademicCard>
      <TouchableOpacity onPress={() => { void signOut(); }} accessibilityRole="button" style={[styles.signOut, { borderColor: `${colors.error}66` }]}><Text style={[styles.signOutText, { color: colors.error }]}>Sair desta conta</Text></TouchableOpacity>
    </>}
  </ScrollView></ScreenContainer>;
}

const styles = StyleSheet.create({
  avatar: { alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: '#D8D0FF', borderRadius: 24, borderWidth: 1, height: 52, justifyContent: 'center', width: 52 },
  avatarText: { color: academicColors.violet, fontSize: 23, fontWeight: '900' },
  back: { alignSelf: 'flex-start', justifyContent: 'center', minHeight: 40, marginBottom: 9 },
  backText: { fontSize: 13, fontWeight: '800' },
  bioInput: { borderRadius: 11, borderWidth: 1, fontSize: 14, lineHeight: 20, marginTop: 7, minHeight: 105, padding: 12, textAlignVertical: 'top' },
  card: { marginTop: 14, padding: 17 },
  cardDescription: { fontSize: 12, lineHeight: 18, marginTop: 4 },
  cardTitle: { fontSize: 17, fontWeight: '900', letterSpacing: -0.2 },
  content: { paddingBottom: 116, paddingHorizontal: 18, paddingTop: 16 },
  counter: { fontSize: 11, marginTop: 5, textAlign: 'right' },
  feedback: { borderRadius: 12, marginTop: 10, padding: 12 },
  feedbackText: { fontSize: 12, fontWeight: '700', lineHeight: 18 },
  input: { borderRadius: 11, borderWidth: 1, fontSize: 14, marginTop: 7, minHeight: 45, paddingHorizontal: 12 },
  inputLabel: { fontSize: 12, fontWeight: '800', marginTop: 17 },
  outlineButton: { alignItems: 'center', borderRadius: 11, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', marginTop: 14, minHeight: 44, paddingHorizontal: 12 },
  outlineButtonArrow: { fontSize: 23, fontWeight: '300' },
  outlineButtonText: { fontSize: 13, fontWeight: '900' },
  overline: { color: academicColors.violet, fontSize: 11, fontWeight: '900', letterSpacing: 0.9 },
  profileHero: { alignItems: 'center', backgroundColor: '#283989', borderRadius: 20, flexDirection: 'row', marginTop: 20, padding: 17 },
  profileHeroCopy: { flex: 1, paddingHorizontal: 12 },
  profileHeroEmail: { color: '#DCE3FF', fontSize: 12, marginTop: 3 },
  profileHeroName: { color: '#FFFFFF', fontSize: 18, fontWeight: '900' },
  screen: { flex: 1 },
  securityHeading: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between' },
  securityIcon: { alignItems: 'center', backgroundColor: '#F0EBFF', borderRadius: 11, height: 37, justifyContent: 'center', width: 37 },
  securityIconText: { color: academicColors.violet, fontSize: 18, fontWeight: '900' },
  securityText: { fontSize: 12, lineHeight: 18, marginTop: 14 },
  signInCard: { alignItems: 'center', marginTop: 22, padding: 22 },
  signInMark: { alignItems: 'center', backgroundColor: '#F0EBFF', borderRadius: 17, height: 50, justifyContent: 'center', marginBottom: 14, width: 50 },
  signInMarkText: { color: academicColors.violet, fontSize: 23, fontWeight: '900' },
  signOut: { alignItems: 'center', borderRadius: 11, borderWidth: 1, justifyContent: 'center', marginTop: 16, minHeight: 46 },
  signOutText: { fontSize: 13, fontWeight: '900' },
  spinner: { marginTop: 46 },
  subtitle: { fontSize: 14, lineHeight: 20, marginTop: 7 },
  title: { fontSize: 31, fontWeight: '900', letterSpacing: -0.9, lineHeight: 38, marginTop: 4 },
});
