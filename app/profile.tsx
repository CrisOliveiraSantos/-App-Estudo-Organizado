import { useEffect, useMemo, useState } from 'react';
import { Alert, ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { AcademicButton, AcademicCard, AcademicPill, academicColors } from '@/components/academic/design-system';
import { EMPTY_CRIS_MEMORY, getCrisMemory, isCrisMemoryEmpty, saveCrisMemory, type CrisUserMemory } from '@/lib/cris-memory';
import { getCurrentAccountProfile, readableSupabaseError, signOutFromSupabase, updateCurrentAccountProfile, type AccountProfile } from '@/lib/supabase-chat';
import { isSupabaseConfigured } from '@/lib/supabase';
import { useStudyEvents, useStudyGoals, useStudyNotes, useStudySubjects } from '@/lib/study-store';

/** Sugestões de papel — mesmos rótulos de `/cris-profile` (a memória é uma só). */
const ROLE_SUGGESTIONS = ['Estudante', 'Criadora do app', 'Professor(a)', 'Outro'];

export default function ProfileScreen() {
  const colors = useColors();
  const subjects = useStudySubjects();
  const goals = useStudyGoals();
  const events = useStudyEvents();
  const notes = useStudyNotes();
  const openTasks = useMemo(() => goals.flatMap(goal => goal.tasks).filter(task => !task.done).length, [goals]);
  const stats = [
    { label: 'Matérias', value: subjects.length },
    { label: 'Tarefas abertas', value: openTasks },
    { label: 'Metas', value: goals.length },
    { label: 'Eventos', value: events.length },
    { label: 'Documentos', value: notes.length },
  ];
  const quickLinks = [
    { section: 'appearance', label: 'Temas e aparência' },
    { section: 'ai', label: 'APIs de IA' },
    { section: 'notifications', label: 'Notificações' },
    { section: 'connections', label: 'Conexões (Moodle/SIGAA)' },
  ];
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  /**
   * Perfil local — o caminho PADRÃO do app: vive em `lib/cris-memory.ts`
   * (AsyncStorage) e não depende de conta nem de Supabase. A Cris já lê daqui.
   */
  const [memory, setMemory] = useState<CrisUserMemory>(EMPTY_CRIS_MEMORY);
  const [subjectsDraft, setSubjectsDraft] = useState('');
  const [localFeedback, setLocalFeedback] = useState<string | null>(null);
  /** `loading` = perfil local; `accountLoading` = conta (só quando o Supabase existe). */
  const [loading, setLoading] = useState(true);
  const [accountLoading, setAccountLoading] = useState(isSupabaseConfigured);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  useEffect(() => { let active = true; void getCrisMemory().then(saved => { if (!active) return; setMemory(saved); setSubjectsDraft(saved.subjects.join(', ')); }).catch(() => undefined).finally(() => { if (active) setLoading(false); }); return () => { active = false; }; }, []);
  useEffect(() => { if (!isSupabaseConfigured) return; let active = true; void getCurrentAccountProfile().then(account => { if (!active) return; setProfile(account); setName(account?.displayName ?? ''); setBio(account?.bio ?? ''); }).catch(error => { if (active) setFeedback(readableSupabaseError(error)); }).finally(() => { if (active) setAccountLoading(false); }); return () => { active = false; }; }, []);
  const patchLocal = (changes: Partial<CrisUserMemory>) => setMemory(current => ({ ...current, ...changes }));
  /** Salva o perfil local na mesma memória que a Cris usa no prompt (nada sai do aparelho). */
  const saveLocalProfile = async () => { setLocalFeedback(null); setSaving(true); try { const saved = await saveCrisMemory({ ...memory, subjects: subjectsDraft.split(',') }); setMemory(saved); setSubjectsDraft(saved.subjects.join(', ')); setLocalFeedback(isCrisMemoryEmpty(saved) ? 'Nada foi salvo: o formulário está vazio.' : 'Salvo neste aparelho. A Cris já usa isso na próxima conversa.'); } catch { setLocalFeedback('Não foi possível salvar agora. Tente de novo.'); } finally { setSaving(false); } };
  const localInputStyle = [styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }];
  const saveProfile = async () => { setFeedback(null); setSaving(true); try { const next = await updateCurrentAccountProfile({ displayName: name, bio }); setProfile(next); setName(next.displayName); setBio(next.bio); setFeedback('Perfil atualizado. Seu novo nome aparecerá nas próximas mensagens.'); } catch (error) { setFeedback(readableSupabaseError(error)); } finally { setSaving(false); } };
  const signOut = async () => { try { await signOutFromSupabase(); router.replace('/chat'); } catch (error) { Alert.alert('Não foi possível sair', readableSupabaseError(error)); } };

  return <ScreenContainer edges={['top', 'bottom', 'left', 'right']} style={[styles.screen, { backgroundColor: colors.background }]}><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
    <TouchableOpacity onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Voltar para Configurações" style={styles.back}><Text style={[styles.backText, { color: colors.primary }]}>← Voltar para Ajustes</Text></TouchableOpacity>
    <Text style={styles.overline}>CONTA E PERFIL</Text><Text adjustsFontSizeToFit minimumFontScale={0.7} numberOfLines={1} style={[styles.title, { color: colors.foreground }]}>Meu perfil</Text><Text style={[styles.subtitle, { color: colors.muted }]}>Seu nome e seu contexto ficam salvos neste aparelho — a Cris usa para te chamar pelo nome. Com uma conta, o nome também aparece nas áreas conectadas.</Text>
    {(loading || accountLoading) ? <ActivityIndicator color={colors.primary} style={styles.spinner} /> : <>
      <AcademicCard style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.cardTitle, { color: colors.foreground }]}>Seus dados</Text>
        <Text style={[styles.cardDescription, { color: colors.muted }]}>Preencha o que quiser: fica salvo só neste aparelho e a Cris passa a te conhecer — sem perguntar tudo de novo.</Text>
        <Text style={[styles.inputLabel, { color: colors.muted }]}>Nome</Text>
        <TextInput value={memory.name} onChangeText={value => patchLocal({ name: value })} placeholder="Como quer ser chamada?" placeholderTextColor={colors.muted} accessibilityLabel="Seu nome" style={localInputStyle} />
        <Text style={[styles.inputLabel, { color: colors.muted }]}>Papel</Text>
        <View style={styles.pills}>{ROLE_SUGGESTIONS.map(role => <TouchableOpacity key={role} accessibilityRole="button" accessibilityLabel={`Papel: ${role}`} onPress={() => patchLocal({ role })} style={styles.pillButton}><AcademicPill label={role} tone={memory.role === role ? 'violet' : 'neutral'} /></TouchableOpacity>)}</View>
        <TextInput value={memory.role} onChangeText={value => patchLocal({ role: value })} placeholder="Ou escreva o seu" placeholderTextColor={colors.muted} accessibilityLabel="Descrição do seu papel" style={localInputStyle} />
        <Text style={[styles.inputLabel, { color: colors.muted }]}>Faculdade</Text>
        <TextInput value={memory.college} onChangeText={value => patchLocal({ college: value })} placeholder="Onde você estuda" placeholderTextColor={colors.muted} accessibilityLabel="Faculdade" style={localInputStyle} />
        <Text style={[styles.inputLabel, { color: colors.muted }]}>Curso</Text>
        <TextInput value={memory.course} onChangeText={value => patchLocal({ course: value })} placeholder="Seu curso ou área" placeholderTextColor={colors.muted} accessibilityLabel="Curso" style={localInputStyle} />
        <Text style={[styles.inputLabel, { color: colors.muted }]}>Matérias</Text>
        <TextInput value={subjectsDraft} onChangeText={setSubjectsDraft} placeholder="Cálculo, Programação, Anatomia" placeholderTextColor={colors.muted} accessibilityLabel="Matérias, separadas por vírgula" style={localInputStyle} />
        <Text style={[styles.helper, { color: colors.muted }]}>Separe por vírgula — a Cris usa isso para dar exemplos do seu curso.</Text>
        <Text style={[styles.inputLabel, { color: colors.muted }]}>Sobre você</Text>
        <TextInput value={memory.about} onChangeText={value => patchLocal({ about: value })} placeholder="Como você estuda, dificuldades, o que quer melhorar…" placeholderTextColor={colors.muted} accessibilityLabel="Contexto livre" multiline maxLength={400} style={[localInputStyle, styles.bioInput]} />
        <AcademicButton label={saving ? 'Salvando…' : 'Salvar neste aparelho'} onPress={() => { void saveLocalProfile(); }} disabled={saving} />
      </AcademicCard>
      {localFeedback ? <View style={[styles.feedback, { backgroundColor: academicColors.violetSoft }]}><Text style={[styles.feedbackText, { color: academicColors.violet }]}>{localFeedback}</Text></View> : null}
      {!isSupabaseConfigured || !profile ? <>
      <AcademicCard style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}><Text style={[styles.cardTitle, { color: colors.foreground }]}>Resumo do seu estudo</Text><Text style={[styles.cardDescription, { color: colors.muted }]}>Um retrato rápido do que você já organizou neste dispositivo.</Text><View style={styles.statsGrid}>{stats.map(stat => <View key={stat.label} style={[styles.statBox, { borderColor: colors.border, backgroundColor: colors.background }]}><Text style={[styles.statValue, { color: colors.foreground }]}>{stat.value}</Text><Text style={[styles.statLabel, { color: colors.muted }]}>{stat.label}</Text></View>)}</View></AcademicCard>
      <AcademicCard style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}><Text style={[styles.cardTitle, { color: colors.foreground }]}>Ajustes rápidos</Text><Text style={[styles.cardDescription, { color: colors.muted }]}>Deixe o espaço com a sua cara antes mesmo de entrar.</Text>{quickLinks.map(link => <TouchableOpacity key={link.section} onPress={() => router.push({ pathname: '/settings', params: { section: link.section } })} accessibilityRole="button" style={[styles.outlineButton, { borderColor: colors.border }]}><Text style={[styles.outlineButtonText, { color: colors.primary }]}>{link.label}</Text><Text style={[styles.outlineButtonArrow, { color: colors.primary }]}>›</Text></TouchableOpacity>)}</AcademicCard>
      <AcademicCard style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}><Text style={[styles.cardTitle, { color: colors.foreground }]}>Conta (opcional)</Text><Text style={[styles.cardDescription, { color: colors.muted }]}>Tudo funciona sem conta. Criar uma serve para o nome de exibição nas áreas conectadas e para manter o histórico de conversas salvo.</Text><AcademicButton label="Entrar ou criar conta" tone="neutral" compact onPress={() => router.replace('/chat')} /></AcademicCard></> : <>
      <View style={styles.profileHero}><View style={styles.avatar}><Text style={styles.avatarText}>{profile.displayName.slice(0, 1).toUpperCase()}</Text></View><View style={styles.profileHeroCopy}><Text style={styles.profileHeroName}>{profile.displayName}</Text><Text numberOfLines={1} style={styles.profileHeroEmail}>{profile.email}</Text><AcademicPill label="Conta conectada" tone="success" /></View></View>
      <AcademicCard style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}><Text style={[styles.cardTitle, { color: colors.foreground }]}>Sua apresentação</Text><Text style={[styles.cardDescription, { color: colors.muted }]}>Esse nome é usado para identificar sua participação nas áreas conectadas.</Text><Text style={[styles.inputLabel, { color: colors.muted }]}>Nome de exibição</Text><TextInput value={name} onChangeText={setName} placeholder="Como quer ser chamada?" placeholderTextColor={colors.muted} style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]} /><Text style={[styles.inputLabel, { color: colors.muted }]}>Sobre você</Text><TextInput value={bio} onChangeText={setBio} placeholder="Ex.: Estudante de Engenharia de Software" placeholderTextColor={colors.muted} multiline textAlignVertical="top" maxLength={240} style={[styles.bioInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]} /><Text style={[styles.counter, { color: colors.muted }]}>{bio.length}/240 caracteres</Text><AcademicButton label={saving ? 'Salvando…' : 'Salvar perfil'} onPress={() => { void saveProfile(); }} disabled={saving} /></AcademicCard>
      {feedback ? <View style={[styles.feedback, { backgroundColor: feedback.startsWith('Perfil atualizado') ? '#E8F6EF' : '#FDECEF' }]}><Text style={[styles.feedbackText, { color: feedback.startsWith('Perfil atualizado') ? academicColors.success : academicColors.danger }]}>{feedback}</Text></View> : null}
      <AcademicCard style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}><View style={styles.securityHeading}><View><Text style={[styles.cardTitle, { color: colors.foreground }]}>Segurança</Text><Text style={[styles.cardDescription, { color: colors.muted }]}>Sua senha não é exibida ou editada diretamente aqui.</Text></View><View style={styles.securityIcon}><Text style={styles.securityIconText}>⌁</Text></View></View><Text style={[styles.securityText, { color: colors.muted }]}>Use a opção “Esqueci minha senha” na área de acesso para receber instruções seguras no e-mail da sua própria conta.</Text><TouchableOpacity onPress={() => router.replace('/chat')} accessibilityRole="button" style={[styles.outlineButton, { borderColor: colors.border }]}><Text style={[styles.outlineButtonText, { color: colors.primary }]}>Abrir opções de acesso</Text><Text style={[styles.outlineButtonArrow, { color: colors.primary }]}>›</Text></TouchableOpacity></AcademicCard>
      <TouchableOpacity onPress={() => { void signOut(); }} accessibilityRole="button" style={[styles.signOut, { borderColor: `${colors.error}66` }]}><Text style={[styles.signOutText, { color: colors.error }]}>Sair desta conta</Text></TouchableOpacity>
      </>}
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
  helper: { fontSize: 11, lineHeight: 16, marginTop: 6 },
  input: { borderRadius: 11, borderWidth: 1, fontSize: 14, marginTop: 7, minHeight: 45, paddingHorizontal: 12 },
  inputLabel: { fontSize: 12, fontWeight: '800', marginTop: 17 },
  outlineButton: { alignItems: 'center', borderRadius: 11, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', marginTop: 14, minHeight: 44, paddingHorizontal: 12 },
  outlineButtonArrow: { fontSize: 23, fontWeight: '300' },
  outlineButtonText: { fontSize: 13, fontWeight: '900' },
  overline: { color: academicColors.violet, fontSize: 11, fontWeight: '900', letterSpacing: 0.9 },
  pillButton: { marginBottom: 6, marginRight: 8 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 9 },
  profileHero: { alignItems: 'center', backgroundColor: '#283989', borderRadius: 20, flexDirection: 'row', marginTop: 20, padding: 17 },
  statBox: { borderRadius: 12, borderWidth: 1, minWidth: 92, padding: 12 },
  statLabel: { fontSize: 11, marginTop: 3 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginTop: 14 },
  statValue: { fontSize: 22, fontWeight: '900' },
  profileHeroCopy: { flex: 1, paddingHorizontal: 12 },
  profileHeroEmail: { color: '#DCE3FF', fontSize: 12, marginTop: 3 },
  profileHeroName: { color: '#FFFFFF', fontSize: 18, fontWeight: '900' },
  screen: { flex: 1 },
  securityHeading: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between' },
  securityIcon: { alignItems: 'center', backgroundColor: '#F0EBFF', borderRadius: 11, height: 37, justifyContent: 'center', width: 37 },
  securityIconText: { color: academicColors.violet, fontSize: 18, fontWeight: '900' },
  securityText: { fontSize: 12, lineHeight: 18, marginTop: 14 },
  signOut: { alignItems: 'center', borderRadius: 11, borderWidth: 1, justifyContent: 'center', marginTop: 16, minHeight: 46 },
  signOutText: { fontSize: 13, fontWeight: '900' },
  spinner: { marginTop: 46 },
  subtitle: { fontSize: 14, lineHeight: 20, marginTop: 7 },
  title: { fontSize: 31, fontWeight: '900', letterSpacing: -0.9, lineHeight: 38, marginTop: 4 },
});
