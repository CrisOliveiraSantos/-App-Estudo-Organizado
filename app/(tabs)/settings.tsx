import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Linking, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useLocalSearchParams } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { useThemeContext, type ThemePreference } from '@/lib/theme-provider';
import { useStudy } from '@/lib/study-store';
import { AcademicButton, AcademicPill, academicColors } from '@/components/academic/design-system';
import { scheduleTestNotification } from '@/lib/notifications';
import { SchemeColors } from '@/constants/theme';
import { trpc } from '@/lib/trpc';
import * as WebBrowser from 'expo-web-browser';
import { clearAcademicToken, readAcademicToken, saveAcademicToken } from '@/lib/academic-credentials';

type SettingsKey = 'profile' | 'account' | 'appearance' | 'notifications' | 'connections' | 'editor' | 'studies' | 'privacy' | 'data' | 'about';

type SettingsItem = { key: SettingsKey; label: string; icon: string };
type MoodleContentItem = { courseId: number; courseTitle: string; section: string; title: string; description: string; url: string; type: string; files: { name: string; url: string; mime: string; type: string }[]; youtubeUrl: string };
type MoodleSyncSummary = { disciplines: number; tasks: number; deadlines: number; texts: number; pdfs: number; videos: number; notices: number };

const settingsItems: SettingsItem[] = [
  { key: 'profile', label: 'Perfil', icon: '◉' },
  { key: 'account', label: 'Conta', icon: '⌁' },
  { key: 'appearance', label: 'Aparência', icon: '◐' },
  { key: 'notifications', label: 'Notificações', icon: '◌' },
  { key: 'connections', label: 'Conexões', icon: '⇄' },
  { key: 'editor', label: 'Editor', icon: '▤' },
  { key: 'studies', label: 'Estudos', icon: '✓' },
  { key: 'privacy', label: 'Privacidade', icon: '◇' },
  { key: 'data', label: 'Dados', icon: '▧' },
  { key: 'about', label: 'Sobre', icon: 'i' },
];

export default function SettingsScreen() {
  const colors = useColors();
  const { width } = useWindowDimensions();
  const { themePreference, setThemePreference } = useThemeContext();
  const { notes, goals, subjects, events } = useStudy();
  const params = useLocalSearchParams<{ section?: string }>();
  const [activeKey, setActiveKey] = useState<SettingsKey>(params.section === 'connections' ? 'connections' : 'profile');
  const isWide = width >= 780;
  const activeItem = useMemo(() => settingsItems.find(item => item.key === activeKey) ?? settingsItems[0], [activeKey]);

  return (
    <ScreenContainer edges={['top', 'bottom', 'left', 'right']} style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={[styles.content, isWide && styles.contentWide]}>
        <View style={styles.heading}>
          <View style={styles.headingCopy}>
            <Text style={[styles.overline, { color: academicColors.violet }]}>ESPAÇO PESSOAL</Text>
            <Text style={[styles.title, { color: colors.foreground }]}>Configurações</Text>
            <Text style={[styles.subtitle, { color: colors.muted }]}>Um só lugar para cuidar do seu perfil, aparência e rotina de estudos.</Text>
          </View>
          <View style={[styles.ownerMark, { backgroundColor: academicColors.violetSoft, borderColor: colors.border }]}><Text style={styles.ownerMarkText}>C</Text></View>
        </View>

        <View style={[styles.workspace, isWide && styles.workspaceWide]}>
          <View style={[styles.menuPanel, isWide && styles.menuPanelWide]}>
            <View style={styles.identityRow}>
              <View style={styles.avatar}><Text style={styles.avatarText}>C</Text></View>
              <View style={styles.identityCopy}><Text style={[styles.identityName, { color: colors.foreground }]}>Cris O. Santos</Text><Text style={[styles.identityEmail, { color: colors.muted }]}>Espaço acadêmico pessoal</Text></View>
            </View>
            <ScrollView horizontal={!isWide} showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.menuList, !isWide && styles.menuListHorizontal]}>
              {settingsItems.map(item => <TouchableOpacity key={item.key} onPress={() => setActiveKey(item.key)} accessibilityRole="button" accessibilityState={{ selected: activeKey === item.key }} style={[styles.menuItem, { borderColor: colors.border }, activeKey === item.key && { backgroundColor: academicColors.violetSoft, borderColor: '#DDD4FF' }]} activeOpacity={0.76}><Text style={[styles.menuIcon, { color: activeKey === item.key ? academicColors.violet : colors.muted }]}>{item.icon}</Text><Text style={[styles.menuLabel, { color: activeKey === item.key ? academicColors.violet : colors.foreground }]}>{item.label}</Text></TouchableOpacity>)}
            </ScrollView>
            {isWide ? <Text style={[styles.menuHint, { color: colors.muted }]}>Preferências salvas neste dispositivo.</Text> : null}
          </View>

          <View style={styles.detailPanel}>
            <View style={[styles.detailHeader, { borderBottomColor: colors.border }]}><View><Text style={[styles.detailEyebrow, { color: academicColors.violet }]}>AJUSTE ATUAL</Text><Text style={[styles.detailTitle, { color: colors.foreground }]}>{activeItem.label}</Text></View><AcademicPill label="Cris" tone="violet" /></View>
            {activeKey === 'profile' ? <ProfileContent colors={colors} onOpen={() => router.push('/profile')} /> : null}
            {activeKey === 'account' ? <AccountContent colors={colors} /> : null}
            {activeKey === 'appearance' ? <AppearanceContent colors={colors} preference={themePreference} onChange={setThemePreference} /> : null}
            {activeKey === 'notifications' ? <NotificationsContent colors={colors} /> : null}
            {activeKey === 'connections' ? <ConnectionsContent colors={colors} /> : null}
            {activeKey === 'editor' ? <EditorContent colors={colors} /> : null}
            {activeKey === 'studies' ? <StudiesContent colors={colors} notes={notes.length} goals={goals.length} subjects={subjects.length} events={events.length} /> : null}
            {activeKey === 'privacy' ? <InfoContent colors={colors} title="Privacidade em primeiro lugar" description="O conteúdo de estudos permanece no armazenamento do aplicativo e só é sincronizado com a conta conectada quando esse recurso está disponível. O Chat permanece separado desta central." /> : null}
            {activeKey === 'data' ? <DataContent colors={colors} notes={notes.length} goals={goals.length} subjects={subjects.length} events={events.length} /> : null}
            {activeKey === 'about' ? <AboutContent colors={colors} /> : null}
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

function ProfileContent({ colors, onOpen }: { colors: ReturnType<typeof useColors>; onOpen: () => void }) {
  return <View style={styles.contentStack}><View style={styles.profileLine}><View style={[styles.largeAvatar, { backgroundColor: academicColors.violetSoft }]}><Text style={styles.largeAvatarText}>C</Text></View><View style={styles.profileCopy}><Text style={[styles.profileName, { color: colors.foreground }]}>Cris O. Santos</Text><Text style={[styles.profileDescription, { color: colors.muted }]}>Organizadora deste espaço de estudos</Text></View></View><Text style={[styles.body, { color: colors.muted }]}>Edite seu nome de exibição, apresentação e informações da conta em uma tela própria.</Text><AcademicButton label="Editar meu perfil" onPress={onOpen} compact /></View>;
}

function AccountContent({ colors }: { colors: ReturnType<typeof useColors> }) {
  return <View style={styles.contentStack}><InfoLine colors={colors} label="Sessão" detail="A entrada, a saída e a sessão atual são gerenciadas com segurança pelo aplicativo." /><InfoLine colors={colors} label="Recuperação" detail="A redefinição de senha usa um link enviado ao e-mail cadastrado; nenhuma senha fica visível aqui." /><AcademicButton label="Editar perfil e sessão" tone="ghost" onPress={() => router.push('/profile')} compact /></View>;
}

function AppearanceContent({ colors, preference, onChange }: { colors: ReturnType<typeof useColors>; preference: ThemePreference; onChange: (value: ThemePreference) => void }) {
  const choices: { key: ThemePreference; label: string; detail: string; swatch: string }[] = [
    { key: 'light', label: 'Claro', detail: 'Leitura nítida', swatch: SchemeColors.light.primary },
    { key: 'dark', label: 'Escuro', detail: 'Conforto noturno', swatch: SchemeColors.dark.primary },
    { key: 'violet', label: 'Violeta', detail: 'Criativo e acadêmico', swatch: SchemeColors.violet.primary },
    { key: 'ocean', label: 'Oceano', detail: 'Calmo e concentrado', swatch: SchemeColors.ocean.primary },
    { key: 'contrast', label: 'Alto contraste', detail: 'Máxima legibilidade', swatch: SchemeColors.contrast.primary },
    { key: 'system', label: 'Sistema', detail: 'Segue o dispositivo', swatch: '#7C8496' },
  ];
  return <View style={styles.contentStack}><Text style={[styles.body, { color: colors.muted }]}>Escolha a atmosfera do seu espaço. A preferência é salva neste dispositivo e cada tema altera fundo, superfícies, textos, bordas e cor de ação.</Text><View style={styles.themeGrid}>{choices.map(choice => <TouchableOpacity key={choice.key} onPress={() => onChange(choice.key)} accessibilityRole="button" accessibilityState={{ selected: preference === choice.key }} style={[styles.themeChoice, { borderColor: colors.border }, preference === choice.key && { backgroundColor: `${choice.swatch}18`, borderColor: choice.swatch }]}><View style={[styles.themeSwatch, { backgroundColor: choice.swatch, borderColor: colors.border }]} /><Text style={[styles.themeLabel, { color: colors.foreground }]}>{choice.label}</Text><Text style={[styles.themeDetail, { color: colors.muted }]}>{choice.detail}</Text></TouchableOpacity>)}</View></View>;
}

function ConnectionsContent({ colors }: { colors: ReturnType<typeof useColors> }) {
  const [provider, setProvider] = useState<'moodle' | 'sigaa'>('moodle');
  const [url, setUrl] = useState('https://ead.ifsudestemg.edu.br');
  const [syncMode, setSyncMode] = useState<'manual' | 'automatic'>('manual');
  const [token, setToken] = useState('');
  const [status, setStatus] = useState('Ainda não conectado.');
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [courses, setCourses] = useState<{ id?: number; title: string; code: string; summary: string }[]>([]);
  const [importing, setImporting] = useState(false);
  const [syncingAcademic, setSyncingAcademic] = useState(false);
  const [syncError, setSyncError] = useState(false);
  const [syncSummary, setSyncSummary] = useState<MoodleSyncSummary>({ disciplines: 0, tasks: 0, deadlines: 0, texts: 0, pdfs: 0, videos: 0, notices: 0 });
  const [syncedContents, setSyncedContents] = useState<MoodleContentItem[]>([]);
  const autoSyncAttempted = useRef(false);
  const testMoodle = trpc.academic.testMoodle.useMutation();
  const listCourses = trpc.academic.listCourses.useMutation();
  const getCourseContents = trpc.academic.getCourseContents.useMutation();
  const syncAcademic = trpc.academic.syncAcademic.useMutation();
  const { subjects, goals, events, notes, addSubject, createNote, saveNote, addEvent, addTask } = useStudy();
  useEffect(() => {
    AsyncStorage.getItem('@estudo-organizado/academic-connection').then(async raw => {
      if (!raw) return;
      try {
        const saved = JSON.parse(raw) as { provider?: 'moodle' | 'sigaa'; url?: string; syncMode?: 'manual' | 'automatic'; lastSyncAt?: string };
        if (saved.provider) setProvider(saved.provider);
        if (saved.url) setUrl(saved.url);
        if (saved.syncMode) setSyncMode(saved.syncMode);
        if (saved.lastSyncAt) setLastSyncAt(saved.lastSyncAt);
        const protectedToken = await readAcademicToken();
        if (protectedToken) setToken(protectedToken);
        setStatus(protectedToken ? 'Conexão protegida carregada. A sincronização automática ocorre quando esta área é aberta.' : 'Preferência local carregada. Informe um token autorizado para sincronizar.');
      } catch {
        setStatus('Não foi possível ler a preferência local.');
      }
    });
  }, []);
  const save = async () => {
    const normalized = url.trim().replace(/\/$/, '');
    if (!/^https:\/\//i.test(normalized)) {
      setStatus('Use um endereço HTTPS do AVA ou serviço institucional.');
      return;
    }
    await AsyncStorage.setItem('@estudo-organizado/academic-connection', JSON.stringify({ provider, url: normalized, syncMode, lastSyncAt }));
    if (token.trim()) await saveAcademicToken(token);
    else await clearAcademicToken();
    setUrl(normalized);
    setStatus(syncMode === 'automatic' && token.trim() ? 'Conexão salva com token protegido. A atualização automática será feita ao abrir esta área.' : 'Endereço e preferência salvos. A sincronização manual está disponível quando você informar um token autorizado.');
  };
  const handleFullSync = async () => {
    if (!token.trim()) { setSyncError(true); setStatus('Informe um token temporário para sincronizar com Moodle.'); return; }
    setSyncingAcademic(true); setSyncError(false); setStatus('Conectando ao Moodle e lendo conteúdos autorizados…');
    try {
      await saveAcademicToken(token);
      const result = await syncAcademic.mutateAsync({ baseUrl: url.trim(), token: token.trim() });
      const contents = result.contentItems as MoodleContentItem[];
      const existingSubjects = new Set(subjects.map(subject => subject.name.toLowerCase()));
      result.courses.filter(course => !existingSubjects.has(course.title.toLowerCase())).forEach(course => addSubject(course.title, 'Moodle / AVA', '⌘', '#3949AB'));
      const existingEvents = new Set(events.map(event => event.title.toLowerCase()));
      result.calendar.filter(item => item.name && !existingEvents.has(item.name.toLowerCase())).forEach(item => addEvent({ title: item.name!, type: 'Outro', date: item.timesort ? new Date(item.timesort * 1000).toLocaleDateString('pt-BR') : 'A definir', notes: item.description ?? '', color: '#3949AB', emoji: '⌁' }));
      const targetGoal = goals[0];
      const existingTasks = new Set(goals.flatMap(goal => goal.tasks).map(task => task.title.toLowerCase()));
      if (targetGoal) result.assignments.filter(item => item.name && !existingTasks.has(item.name.toLowerCase())).forEach(item => addTask(targetGoal.id, item.name!, 'Alta', item.duedate ? new Date(item.duedate * 1000).toLocaleDateString('pt-BR') : undefined, 'Próximas'));
      const existingNotes = new Set(notes.map(note => note.title.toLowerCase()));
      result.forums.filter(item => item.name && !existingNotes.has(`[moodle] ${item.name}`.toLowerCase())).forEach(item => { const noteId = createNote(`[Moodle] ${item.name}`, 'Moodle / AVA'); saveNote({ id: noteId, title: `[Moodle] ${item.name}`, content: item.intro ?? 'Aviso ou fórum importado do Moodle.', folder: 'Moodle / AVA', updatedAt: 'Agora', kind: 'note', blocks: [{ id: `moodle-forum-${Date.now()}-${item.id ?? item.name}`, type: 'paragraph', text: item.intro ?? item.name! }] }); });
      contents.filter(item => item.title && !existingNotes.has(`[moodle] ${item.courseTitle} — ${item.title}`.toLowerCase())).forEach(item => { const source = item.youtubeUrl || item.url || item.files?.find(file => file.url)?.url || ''; const content = `${item.description ? `${item.description}\\n\\n` : ''}${source ? `Fonte autorizada no Moodle: ${source}` : 'Conteúdo textual importado do Moodle.'}`; const noteId = createNote(`[Moodle] ${item.courseTitle} — ${item.title}`, 'Moodle / AVA'); saveNote({ id: noteId, title: `[Moodle] ${item.courseTitle} — ${item.title}`, content, folder: 'Moodle / AVA', updatedAt: 'Agora', kind: item.type === 'pdf' ? 'pdf' : 'note', uri: source || undefined, blocks: [{ id: `moodle-content-${Date.now()}-${item.courseId}-${item.title}`, type: item.type === 'pdf' ? 'quote' : 'paragraph', text: item.description || item.title }] }); });
      const summary: MoodleSyncSummary = { disciplines: result.courses.length, tasks: result.assignments.length, deadlines: result.calendar.length, texts: contents.filter(item => item.type === 'text').length, pdfs: contents.filter(item => item.type === 'pdf').length, videos: contents.filter(item => item.type === 'video').length, notices: result.forums.length };
      setSyncSummary(summary); setSyncedContents(contents.slice(0, 12));
      const syncedAt = new Date().toLocaleString('pt-BR'); setLastSyncAt(syncedAt); await AsyncStorage.mergeItem('@estudo-organizado/academic-connection', JSON.stringify({ provider, url: url.trim(), syncMode, lastSyncAt: syncedAt }));
      setStatus(`Sincronização concluída: ${summary.disciplines} disciplinas, ${summary.texts} textos, ${summary.pdfs} PDFs, ${summary.videos} vídeos, ${summary.tasks} tarefas e ${summary.deadlines} prazos.` + (result.warnings.length ? ` Avisos: ${result.warnings.join('; ')}.` : ''));
    } catch (error) { setSyncError(true); setStatus(error instanceof Error ? error.message : 'Não foi possível sincronizar com o Moodle. Verifique o token e as permissões do Web Service.'); } finally { setSyncingAcademic(false); }
  };
  useEffect(() => {
    if (syncMode !== 'automatic' || !token.trim() || autoSyncAttempted.current) return;
    autoSyncAttempted.current = true;
    void handleFullSync();
  }, [syncMode, token]); // eslint-disable-line react-hooks/exhaustive-deps
  const openContent = async (item: MoodleContentItem) => { const urlToOpen = item.youtubeUrl || item.url || item.files?.find(file => file.url)?.url; if (urlToOpen) await WebBrowser.openBrowserAsync(urlToOpen); };
  return <View style={styles.contentStack}>
    <Text style={[styles.body, { color: colors.muted }]}>Conecte um ambiente acadêmico autorizado para trazer disciplinas, avisos, materiais e prazos. O Estudo Organizado não deve receber sua senha em texto aberto nem raspar uma página protegida.</Text>
    <View style={styles.connectionOptions}>{(['moodle', 'sigaa'] as const).map(item => <TouchableOpacity key={item} onPress={() => setProvider(item)} style={[styles.connectionOption, { borderColor: colors.border }, provider === item && { borderColor: academicColors.violet, backgroundColor: academicColors.violetSoft }]}><Text style={[styles.connectionOptionTitle, { color: colors.foreground }]}>{item === 'moodle' ? 'Moodle / AVA' : 'SIGAA'}</Text><Text style={[styles.connectionOptionDetail, { color: colors.muted }]}>{item === 'moodle' ? 'Cursos, materiais e atividades' : 'Disciplinas e dados acadêmicos'}</Text></TouchableOpacity>)}</View>
    <Text style={[styles.inputLabel, { color: colors.foreground }]}>Endereço institucional</Text>
    <TextInput value={url} onChangeText={setUrl} autoCapitalize="none" autoCorrect={false} keyboardType="url" style={[styles.connectionInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface }]} placeholder="https://..." placeholderTextColor={colors.muted} />
    <Text style={[styles.inputLabel, { color: colors.foreground }]}>Token temporário do Moodle</Text>
    <TextInput value={token} onChangeText={setToken} secureTextEntry autoCapitalize="none" autoCorrect={false} style={[styles.connectionInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface }]} placeholder="Cole o token somente para testar" placeholderTextColor={colors.muted} />
    <Text style={[styles.body, { color: colors.muted }]}>O token nunca é salvo no AsyncStorage: no Android fica no armazenamento seguro do dispositivo e na web dura somente a sessão do navegador. Se o AVA não oferecer um token de Web Service, mantenha a atualização manual por arquivo ou link autorizado.</Text>
    <Text style={[styles.inputLabel, { color: colors.foreground }]}>Atualização</Text>
    <View style={styles.connectionOptions}><TouchableOpacity onPress={() => setSyncMode('manual')} style={[styles.connectionOption, { borderColor: colors.border }, syncMode === 'manual' && { borderColor: academicColors.indigo, backgroundColor: '#EEF2FF' }]}><Text style={[styles.connectionOptionTitle, { color: colors.foreground }]}>Manual</Text><Text style={[styles.connectionOptionDetail, { color: colors.muted }]}>Você toca em Atualizar</Text></TouchableOpacity><TouchableOpacity onPress={() => setSyncMode('automatic')} style={[styles.connectionOption, { borderColor: colors.border }, syncMode === 'automatic' && { borderColor: academicColors.indigo, backgroundColor: '#EEF2FF' }]}><Text style={[styles.connectionOptionTitle, { color: colors.foreground }]}>Ao abrir</Text><Text style={[styles.connectionOptionDetail, { color: colors.muted }]}>Atualiza ao entrar nesta área</Text></TouchableOpacity></View>
    <AcademicButton label="Salvar conexão" onPress={save} compact />
    <AcademicButton label={testMoodle.isPending ? 'Testando Moodle…' : 'Testar token do Moodle'} onPress={async () => { if (!token.trim()) { setStatus('Informe um token temporário para testar.'); return; } try { const result = await testMoodle.mutateAsync({ baseUrl: url.trim(), token: token.trim() }); setStatus(`Conectado a ${result.siteName} como ${result.username}. O token continua apenas nesta sessão.`); } catch (error) { setStatus(error instanceof Error ? error.message : 'O teste não foi autorizado.'); } }} disabled={testMoodle.isPending} tone="ghost" compact />
    <AcademicButton label={listCourses.isPending ? 'Buscando disciplinas…' : 'Atualizar disciplinas agora'} onPress={async () => { if (!token.trim()) { setStatus('Informe um token temporário antes de buscar disciplinas.'); return; } try { const result = await listCourses.mutateAsync({ baseUrl: url.trim(), token: token.trim() }); const syncedAt = new Date().toLocaleString('pt-BR'); setCourses(result.courses); setLastSyncAt(syncedAt); await AsyncStorage.mergeItem('@estudo-organizado/academic-connection', JSON.stringify({ provider, url: url.trim(), syncMode, lastSyncAt: syncedAt })); setStatus(`${result.courses.length} disciplina(s) encontrada(s) em ${result.siteName}.`); } catch (error) { setStatus(error instanceof Error ? error.message : 'Não foi possível buscar as disciplinas.'); } }} disabled={listCourses.isPending} tone="ghost" compact />
    <TouchableOpacity onPress={handleFullSync} disabled={syncingAcademic} accessibilityRole="button" style={[styles.moodleSyncButton, { backgroundColor: academicColors.indigo, opacity: syncingAcademic ? 0.78 : 1 }]}>{syncingAcademic ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.moodleSyncIcon}>↻</Text>}<View style={styles.moodleSyncCopy}><Text style={styles.moodleSyncTitle}>{syncingAcademic ? 'Sincronizando com Moodle…' : 'Clique aqui para sincronizar com Moodle'}</Text><Text style={styles.moodleSyncDetail}>{syncingAcademic ? 'Lendo conteúdos autorizados com segurança' : 'Disciplinas, tarefas, textos, PDFs, vídeos e prazos'}</Text></View></TouchableOpacity>
    <View style={[styles.syncStatusCard, { borderColor: syncError ? '#C2414B' : colors.border, backgroundColor: colors.surface }]}><View style={styles.syncStatusHeader}><Text style={[styles.syncStatusIcon, { color: syncError ? '#C2414B' : academicColors.indigo }]}>{syncError ? '!' : syncingAcademic ? '…' : '✓'}</Text><View style={styles.syncStatusCopy}><Text style={[styles.syncStatusTitle, { color: colors.foreground }]}>{syncError ? 'Não foi possível sincronizar' : syncingAcademic ? 'Leitura em andamento' : lastSyncAt ? 'Sincronização concluída' : 'Pronto para sincronizar'}</Text><Text style={[styles.syncStatusMessage, { color: colors.muted }]}>{status}</Text></View></View>{lastSyncAt ? <Text style={[styles.syncLastSync, { color: colors.muted }]}>Última atualização: {lastSyncAt}</Text> : null}</View>
    {(syncSummary.disciplines || syncSummary.tasks || syncSummary.deadlines || syncSummary.texts || syncSummary.pdfs || syncSummary.videos || syncSummary.notices) ? <View style={styles.syncSummaryGrid}>{[['Disciplinas', syncSummary.disciplines], ['Tarefas', syncSummary.tasks], ['Prazos', syncSummary.deadlines], ['Textos', syncSummary.texts], ['PDFs', syncSummary.pdfs], ['Vídeos', syncSummary.videos], ['Avisos', syncSummary.notices]].map(([label, value]) => <View key={String(label)} style={[styles.syncSummaryItem, { borderColor: colors.border }]}><Text style={[styles.syncSummaryValue, { color: colors.foreground }]}>{value}</Text><Text style={[styles.syncSummaryLabel, { color: colors.muted }]}>{label}</Text></View>)}</View> : null}
    {syncedContents.length ? <View style={[styles.syncedContentCard, { borderColor: colors.border }]}><Text style={[styles.infoLabel, { color: colors.foreground }]}>Conteúdos encontrados</Text><Text style={[styles.body, { color: colors.muted }]}>Os itens abaixo são referências autorizadas do Moodle. PDFs e vídeos continuam sujeitos às permissões da instituição.</Text>{syncedContents.map(item => { const playable = Boolean(item.youtubeUrl || item.url || item.files?.some(file => file.url)); return <View key={`${item.courseId}-${item.title}`} style={[styles.syncedContentRow, { borderBottomColor: colors.border }]}><View style={styles.syncedContentCopy}><Text style={[styles.syncedContentType, { color: academicColors.indigo }]}>{item.type === 'video' ? 'VÍDEO' : item.type === 'pdf' ? 'PDF' : item.type === 'text' ? 'TEXTO' : 'MATERIAL'}</Text><Text style={[styles.syncedContentTitle, { color: colors.foreground }]}>{item.title}</Text><Text style={[styles.syncedContentMeta, { color: colors.muted }]}>{item.courseTitle} · {item.section}</Text></View>{playable ? <TouchableOpacity onPress={() => openContent(item)} style={[styles.openContentButton, { borderColor: colors.border }]}><Text style={[styles.openContentLabel, { color: academicColors.indigo }]}>{item.type === 'video' ? 'Assistir' : item.type === 'pdf' ? 'Abrir PDF' : 'Abrir'}</Text></TouchableOpacity> : null}</View>; })}</View> : null}
    {courses.length ? <View style={styles.coursePreview}><Text style={[styles.infoLabel, { color: colors.foreground }]}>Disciplinas encontradas</Text>{courses.map(course => <Text key={String(course.id)} style={[styles.infoDetail, { color: colors.muted }]}>• {course.title}{course.code ? ` (${course.code})` : ''}</Text>)}<AcademicButton label={importing ? 'Importando materiais…' : 'Importar disciplinas e materiais'} onPress={async () => { if (!token.trim()) { setStatus('O token temporário é necessário para importar materiais.'); return; } setImporting(true); const existing = new Set(subjects.map(subject => subject.name.toLowerCase())); let importedMaterials = 0; try { for (const course of courses) { if (!existing.has(course.title.toLowerCase())) addSubject(course.title, 'Moodle / AVA', '⌘', '#3949AB'); if (!course.id) continue; const content = await getCourseContents.mutateAsync({ baseUrl: url.trim(), token: token.trim(), courseId: course.id }); for (const module of content.modules) { const noteId = createNote(`${course.title} — ${module.title}`, 'Moodle / AVA'); saveNote({ id: noteId, title: `${course.title} — ${module.title}`, content: `${module.description ? `${module.description}\\n\\n` : ''}${module.url ? `Fonte no Moodle: ${module.url}` : 'Material importado como referência textual.'}`, folder: 'Moodle / AVA', updatedAt: 'Agora', kind: 'note', blocks: [{ id: `moodle-${Date.now()}-${importedMaterials}`, type: 'paragraph', text: module.description || module.title }] }); importedMaterials += 1; } } setStatus(`Importação concluída: ${courses.length} disciplina(s) e ${importedMaterials} material(is) de referência.`); } catch (error) { setStatus(error instanceof Error ? error.message : 'A importação foi interrompida.'); } finally { setImporting(false); } }} disabled={importing} compact /></View> : null}
    {lastSyncAt ? <Text style={[styles.body, { color: colors.muted }]}>Última atualização: {lastSyncAt}</Text> : null}
    <Text style={[styles.body, { color: colors.muted }]}>{status}</Text>
  </View>;
}

function EditorContent({ colors }: { colors: ReturnType<typeof useColors> }) { return <View style={styles.contentStack}><InfoLine colors={colors} label="Salvamento automático" detail="O editor salva alterações enquanto você digita e recupera o último estado local." /><InfoLine colors={colors} label="Recursos ativos" detail="Formatação rica, tabelas, imagens, gráficos, histórico, desfazer e refazer fazem parte do Editor Acadêmico." /><InfoLine colors={colors} label="Preferência" detail="As configurações específicas do documento ficam dentro do próprio editor, próximas ao conteúdo que está sendo editado." /></View>; }
function StudiesContent({ colors, notes, goals, subjects, events }: { colors: ReturnType<typeof useColors>; notes: number; goals: number; subjects: number; events: number }) { return <View style={styles.contentStack}><Text style={[styles.body, { color: colors.muted }]}>Um resumo vivo do que existe no seu espaço, sem números de demonstração.</Text><View style={styles.statsRow}><Stat label="Matérias" value={subjects} colors={colors} /><Stat label="Metas" value={goals} colors={colors} /><Stat label="Documentos" value={notes} colors={colors} /><Stat label="Agenda" value={events} colors={colors} /></View><InfoLine colors={colors} label="Preferência de rotina" detail="Use o Planejamento para criar metas, prazos e prioridades; esta seção resume o estado atual dos estudos." /></View>; }
function DataContent({ colors, notes, goals, subjects, events }: { colors: ReturnType<typeof useColors>; notes: number; goals: number; subjects: number; events: number }) { return <View style={styles.contentStack}><InfoLine colors={colors} label="Dados disponíveis" detail={`${notes} documentos · ${goals} metas · ${subjects} matérias · ${events} compromissos`} /><InfoLine colors={colors} label="Armazenamento" detail="Os dados locais permanecem no dispositivo até você escolher limpá-los ou exportá-los." /><InfoLine colors={colors} label="Controle" detail="A Biblioteca, o Planejamento e o Editor são áreas de trabalho; esta seção fica reservada à informação e ao controle dos dados." /></View>; }
function AboutContent({ colors }: { colors: ReturnType<typeof useColors> }) {
  return <View style={styles.contentStack}>
    <View style={styles.aboutMark}><Text style={styles.aboutMarkText}>✦</Text></View>
    <Text style={[styles.aboutTitle, { color: colors.foreground }]}>Estudo Organizado</Text>
    <Text style={[styles.aboutLead, { color: colors.foreground }]}>Pensado e construído por Cris</Text>
    <Text style={[styles.body, { color: colors.muted }]}>O Estudo Organizado foi idealizado e desenvolvido por Cris para agilizar trabalhos da faculdade e apoiar a rotina acadêmica em geral. O programa reúne planejamento de estudos, editor de texto, editor de código, biblioteca, OCR, assistência da Cris online e recursos preparados para funcionamento local e em nuvem.</Text>
    <Text style={[styles.body, { color: colors.muted }]}>A proposta é transformar tarefas acadêmicas complexas em um fluxo mais claro, organizado e produtivo, ajudando cada pessoa a estudar, escrever, programar e acompanhar sua evolução em um só espaço.</Text>
    <Text style={[styles.version, { color: colors.muted }]}>Criadora e responsável pelo projeto: Cris</Text>
    <View style={styles.contactCard}>
      <Text style={[styles.contactTitle, { color: colors.foreground }]}>Entre em contato</Text>
      <TouchableOpacity onPress={() => Linking.openURL('tel:034998833833')} accessibilityRole="button" style={[styles.contactAction, { borderColor: colors.border }]}><Text style={[styles.contactLabel, { color: academicColors.indigo }]}>Telefone</Text><Text style={[styles.contactValue, { color: colors.foreground }]}>034998833833</Text></TouchableOpacity>
      <TouchableOpacity onPress={() => Linking.openURL('mailto:cris.de.santos.tst@gmail.com')} accessibilityRole="button" style={[styles.contactAction, { borderColor: colors.border }]}><Text style={[styles.contactLabel, { color: academicColors.indigo }]}>E-mail</Text><Text style={[styles.contactValue, { color: colors.foreground }]}>cris.de.santos.tst@gmail.com</Text></TouchableOpacity>
    </View>
  </View>;
}
function NotificationsContent({ colors }: { colors: ReturnType<typeof useColors> }) {
  const [status, setStatus] = useState('Nenhum teste executado nesta sessão.');
  const [busy, setBusy] = useState(false);
  const [preferences, setPreferences] = useState({ tasks: true, deadlines: true, materials: true, sync: false });
  useEffect(() => {
    AsyncStorage.getItem('@estudo-organizado/notification-preferences').then(raw => {
      if (!raw) return;
      try { setPreferences(current => ({ ...current, ...JSON.parse(raw) })); } catch { setStatus('Preferências locais indisponíveis.'); }
    });
  }, []);
  const toggle = async (key: keyof typeof preferences) => {
    const next = { ...preferences, [key]: !preferences[key] };
    setPreferences(next);
    await AsyncStorage.setItem('@estudo-organizado/notification-preferences', JSON.stringify(next));
  };
  const test = async () => {
    setBusy(true);
    const result = await scheduleTestNotification();
    setStatus(result.message);
    setBusy(false);
  };
  const items: { key: keyof typeof preferences; label: string; detail: string }[] = [
    { key: 'tasks', label: 'Tarefas e metas', detail: 'Lembretes de atividades pendentes.' },
    { key: 'deadlines', label: 'Prazos e provas', detail: 'Avisos antes de datas importantes.' },
    { key: 'materials', label: 'Materiais novos', detail: 'Aviso quando uma conexão acadêmica detectar atualização.' },
    { key: 'sync', label: 'Sincronização', detail: 'Aviso após uma atualização autorizada do AVA.' },
  ];
  return <View style={styles.contentStack}><View style={[styles.infoMark, { backgroundColor: '#E8F6EF' }]}><Text style={[styles.infoMarkText, { color: academicColors.success }]}>✓</Text></View><Text style={[styles.aboutTitle, { color: colors.foreground }]}>Notificações configuráveis</Text><Text style={[styles.body, { color: colors.muted }]}>Escolha quais acontecimentos devem chamar sua atenção. As preferências ficam salvas neste dispositivo; notificações do AVA só serão ativadas depois de uma conexão autorizada.</Text>{items.map(item => <TouchableOpacity key={item.key} onPress={() => toggle(item.key)} style={[styles.settingToggleRow, { borderBottomColor: colors.border }]}><View style={styles.settingToggleCopy}><Text style={[styles.infoLabel, { color: colors.foreground }]}>{item.label}</Text><Text style={[styles.infoDetail, { color: colors.muted }]}>{item.detail}</Text></View><View style={[styles.toggle, preferences[item.key] && styles.toggleOn]}><View style={[styles.toggleThumb, preferences[item.key] && styles.toggleThumbOn]} /></View></TouchableOpacity>)}<AcademicButton label={busy ? 'Preparando…' : 'Testar lembrete em 5 segundos'} onPress={test} disabled={busy} compact /><Text style={[styles.body, { color: colors.muted }]}>{status}</Text></View>;
}
function InfoContent({ colors, title, description }: { colors: ReturnType<typeof useColors>; title: string; description: string }) { return <View style={styles.contentStack}><View style={[styles.infoMark, { backgroundColor: academicColors.violetSoft }]}><Text style={styles.infoMarkText}>i</Text></View><Text style={[styles.aboutTitle, { color: colors.foreground }]}>{title}</Text><Text style={[styles.body, { color: colors.muted }]}>{description}</Text></View>; }
function InfoLine({ colors, label, detail }: { colors: ReturnType<typeof useColors>; label: string; detail: string }) { return <View style={[styles.infoLine, { borderBottomColor: colors.border }]}><Text style={[styles.infoLabel, { color: colors.foreground }]}>{label}</Text><Text style={[styles.infoDetail, { color: colors.muted }]}>{detail}</Text></View>; }
function Stat({ label, value, colors }: { label: string; value: number; colors: ReturnType<typeof useColors> }) { return <View style={[styles.stat, { borderColor: colors.border }]}><Text style={[styles.statValue, { color: colors.foreground }]}>{value}</Text><Text style={[styles.statLabel, { color: colors.muted }]}>{label}</Text></View>; }

const styles = StyleSheet.create({
  aboutMark: { alignItems: 'center', backgroundColor: academicColors.violetSoft, borderRadius: 18, height: 52, justifyContent: 'center', width: 52 },
  aboutMarkText: { color: academicColors.violet, fontSize: 25, fontWeight: '800' },
  aboutTitle: { fontSize: 20, fontWeight: '900', letterSpacing: -0.3, marginTop: 16 },
  aboutLead: { fontSize: 15, fontWeight: '800', marginTop: -8 },
  contactCard: { backgroundColor: '#F8F9FA', borderColor: academicColors.line, borderRadius: 14, borderWidth: 1, gap: 9, padding: 13 },
  contactTitle: { fontSize: 14, fontWeight: '900' },
  contactAction: { borderBottomWidth: 1, paddingBottom: 9, paddingTop: 3 },
  contactLabel: { fontSize: 11, fontWeight: '900', letterSpacing: 0.3 },
  contactValue: { fontSize: 13, fontWeight: '700', marginTop: 2 },
  avatar: { alignItems: 'center', backgroundColor: academicColors.violetSoft, borderRadius: 14, height: 42, justifyContent: 'center', width: 42 },
  avatarText: { color: academicColors.violet, fontSize: 18, fontWeight: '900' },
  body: { fontSize: 14, lineHeight: 21, maxWidth: 600 },
  content: { paddingBottom: 120, paddingHorizontal: 18, paddingTop: 22 },
  contentStack: { gap: 18, paddingTop: 22 },
  connectionInput: { borderRadius: 10, borderWidth: 1, fontSize: 14, minHeight: 44, paddingHorizontal: 12, paddingVertical: 10 },
  connectionOption: { borderRadius: 12, borderWidth: 1, flex: 1, minWidth: 140, padding: 12 },
  connectionOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  connectionOptionTitle: { fontSize: 13, fontWeight: '900' },
  connectionOptionDetail: { fontSize: 11, lineHeight: 16, marginTop: 4 },
  inputLabel: { fontSize: 12, fontWeight: '900', marginBottom: -10 },
  settingToggleRow: { alignItems: 'center', borderBottomWidth: 1, flexDirection: 'row', gap: 12, paddingBottom: 13, paddingTop: 3 },
  settingToggleCopy: { flex: 1 },
  toggle: { backgroundColor: '#DDE2EA', borderRadius: 14, height: 28, justifyContent: 'center', padding: 3, width: 50 },
  toggleOn: { backgroundColor: academicColors.indigo },
  toggleThumb: { backgroundColor: '#FFFFFF', borderRadius: 11, height: 22, width: 22 },
  toggleThumbOn: { alignSelf: 'flex-end' },
  coursePreview: { backgroundColor: '#F8F9FA', borderRadius: 12, gap: 7, padding: 13 },
  contentWide: { alignSelf: 'center', maxWidth: 1280, width: '100%' },
  detailEyebrow: { fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  detailHeader: { alignItems: 'center', borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', paddingBottom: 16 },
  detailPanel: { flex: 1, minWidth: 0 },
  detailTitle: { fontSize: 25, fontWeight: '900', letterSpacing: -0.5, marginTop: 4 },
  heading: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 22 },
  headingCopy: { flex: 1, paddingRight: 18 },
  identityCopy: { flex: 1, paddingLeft: 10 },
  identityEmail: { fontSize: 11, marginTop: 3 },
  identityName: { fontSize: 14, fontWeight: '900' },
  identityRow: { alignItems: 'center', flexDirection: 'row', marginBottom: 17 },
  infoDetail: { fontSize: 13, lineHeight: 19, marginTop: 4 },
  infoLabel: { fontSize: 14, fontWeight: '900' },
  infoLine: { borderBottomWidth: 1, paddingBottom: 14, paddingTop: 2 },
  infoMark: { alignItems: 'center', borderRadius: 18, height: 52, justifyContent: 'center', width: 52 },
  infoMarkText: { color: academicColors.violet, fontSize: 23, fontWeight: '900' },
  largeAvatar: { alignItems: 'center', borderRadius: 22, height: 74, justifyContent: 'center', width: 74 },
  largeAvatarText: { color: academicColors.violet, fontSize: 31, fontWeight: '900' },
  menuHint: { fontSize: 11, lineHeight: 17, marginTop: 17 },
  menuIcon: { fontSize: 17, fontWeight: '800', marginRight: 10, textAlign: 'center', width: 22 },
  menuItem: { alignItems: 'center', borderRadius: 11, borderWidth: 1, flexDirection: 'row', marginBottom: 5, minHeight: 43, paddingHorizontal: 10 },
  menuLabel: { fontSize: 13, fontWeight: '800' },
  menuList: { gap: 1 },
  menuListHorizontal: { paddingBottom: 4, paddingRight: 8 },
  menuPanel: { marginBottom: 24 },
  menuPanelWide: { borderRightColor: '#E4E8F2', borderRightWidth: 1, marginBottom: 0, paddingRight: 24, width: 238 },
  ownerMark: { alignItems: 'center', borderRadius: 16, borderWidth: 1, height: 48, justifyContent: 'center', width: 48 },
  ownerMarkText: { color: academicColors.violet, fontSize: 20, fontWeight: '900' },
  overline: { fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  profileCopy: { flex: 1, paddingLeft: 14 },
  profileDescription: { fontSize: 13, marginTop: 4 },
  profileLine: { alignItems: 'center', flexDirection: 'row' },
  profileName: { fontSize: 20, fontWeight: '900' },
  screen: { flex: 1 },
  stat: { borderRadius: 13, borderWidth: 1, flex: 1, minWidth: 72, padding: 12 },
  statLabel: { fontSize: 11, marginTop: 3 },
  statValue: { fontSize: 22, fontWeight: '900' },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  subtitle: { fontSize: 14, lineHeight: 21, marginTop: 7, maxWidth: 650 },
  themeChoice: { borderRadius: 14, borderWidth: 1, flex: 1, minWidth: 120, padding: 12 },
  themeDetail: { fontSize: 11, marginTop: 4 },
  themeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  themeLabel: { fontSize: 14, fontWeight: '900', marginTop: 10 },
  themeSwatch: { borderRadius: 10, borderWidth: 1, height: 35, width: 35 },
  version: { fontSize: 11, marginTop: 8 },
  title: { fontSize: 31, fontWeight: '900', letterSpacing: -0.8, lineHeight: 38, marginTop: 4 },
  workspace: { flexDirection: 'column' },
  workspaceWide: { flexDirection: 'row', gap: 30 },
  moodleSyncButton: { alignItems: 'center', borderRadius: 14, flexDirection: 'row', gap: 12, minHeight: 68, paddingHorizontal: 15, paddingVertical: 12 },
  moodleSyncCopy: { flex: 1 },
  moodleSyncDetail: { color: '#E7E9FF', fontSize: 12, marginTop: 3 },
  moodleSyncIcon: { color: '#FFFFFF', fontSize: 27, fontWeight: '800', width: 28 },
  moodleSyncTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
  syncStatusCard: { borderRadius: 13, borderWidth: 1, gap: 7, padding: 13 },
  syncStatusCopy: { flex: 1, paddingLeft: 10 },
  syncStatusHeader: { alignItems: 'flex-start', flexDirection: 'row' },
  syncStatusIcon: { fontSize: 21, fontWeight: '900', width: 24 },
  syncStatusMessage: { fontSize: 13, lineHeight: 19, marginTop: 3 },
  syncStatusTitle: { fontSize: 14, fontWeight: '900' },
  syncLastSync: { fontSize: 11, marginTop: 5 },
  syncSummaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  syncSummaryItem: { borderRadius: 11, borderWidth: 1, minWidth: 82, padding: 10 },
  syncSummaryLabel: { fontSize: 11, marginTop: 3 },
  syncSummaryValue: { fontSize: 19, fontWeight: '900' },
  syncedContentCard: { borderRadius: 13, borderWidth: 1, gap: 10, padding: 13 },
  syncedContentCopy: { flex: 1, paddingRight: 8 },
  syncedContentRow: { alignItems: 'center', borderBottomWidth: 1, flexDirection: 'row', gap: 8, paddingBottom: 11, paddingTop: 4 },
  syncedContentTitle: { fontSize: 13, fontWeight: '900', lineHeight: 18, marginTop: 3 },
  syncedContentMeta: { fontSize: 11, marginTop: 3 },
  syncedContentType: { fontSize: 10, fontWeight: '900', letterSpacing: 0.8 },
  openContentButton: { borderRadius: 9, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 8 },
  openContentLabel: { fontSize: 11, fontWeight: '900' },
});
