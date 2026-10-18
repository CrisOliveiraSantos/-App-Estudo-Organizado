import { useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';

import { ScreenContainer } from '@/components/screen-container';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { AcademicButton, AcademicCard, AcademicPill } from '@/components/academic/design-system';
import { AcademicImportWebView } from '@/components/academic-import-webview';
import { useColors } from '@/hooks/use-colors';
import {
  IMPORT_PROVIDERS,
  categoryForDueDate,
  formatImportedDate,
  mergeScrapedTasks,
  normalizeScrapedTasks,
  parseImportMessage,
  summarizeScrapedTasks,
  type ImportProviderId,
  type ScrapedTask,
} from '@/lib/academic-import';
import { useStudyActions, useStudyEvents, useStudySubjects } from '@/lib/study-store';

const STORAGE_KEY = '@estudo-organizado/import-connection';

type SavedConnection = { provider?: ImportProviderId; url?: string };

export default function AcademicImportScreen() {
  const colors = useColors();
  const events = useStudyEvents();
  const subjects = useStudySubjects();
  const { addEvent, addSubject, addSubjectTask } = useStudyActions();
  const [provider, setProvider] = useState<ImportProviderId>('sigaa');
  const [url, setUrl] = useState<string>(IMPORT_PROVIDERS[0].url);
  const [draft, setDraft] = useState<string>(IMPORT_PROVIDERS[0].url);
  const [pending, setPending] = useState<ScrapedTask[]>([]);
  const [status, setStatus] = useState('Entre no ambiente, abra a página de tarefas e toque em Capturar.');
  const [progress, setProgress] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);
  const [captureSignal, setCaptureSignal] = useState(0);
  const [pageTitle, setPageTitle] = useState('');
  const [showList, setShowList] = useState(false);
  const [saved, setSaved] = useState('');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then(raw => {
        if (!raw) return;
        const parsed = JSON.parse(raw) as SavedConnection;
        const preset = IMPORT_PROVIDERS.find(item => item.id === parsed.provider);
        if (preset) setProvider(preset.id);
        const nextUrl = parsed.url || preset?.url || IMPORT_PROVIDERS[0].url;
        setUrl(nextUrl);
        setDraft(nextUrl);
      })
      .catch(() => setStatus('Não foi possível ler o endereço salvo. Use o campo acima.'));
  }, []);

  const summary = useMemo(() => summarizeScrapedTasks(pending), [pending]);

  const chooseProvider = (next: ImportProviderId) => {
    const preset = IMPORT_PROVIDERS.find(item => item.id === next) ?? IMPORT_PROVIDERS[0];
    setProvider(next);
    setDraft(preset.url);
    setStatus(`Endereço sugerido para ${preset.label}. Ajuste se a sua instituição usar outro.`);
  };

  const open = () => {
    const normalized = (/^https?:\/\//i.test(draft.trim()) ? draft.trim() : `https://${draft.trim()}`).replace(/\/$/, '');
    if (!/^https:\/\/.+\..+/i.test(normalized)) {
      setStatus('Informe um endereço HTTPS válido do SIGAA ou do Moodle.');
      return;
    }
    setUrl(normalized);
    setDraft(normalized);
    setProgress(0);
    setReloadKey(value => value + 1);
    setStatus('Carregando o ambiente. Faça o login normalmente; sua senha não passa por este app.');
    void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ provider, url: normalized }));
  };

  const handleMessage = (raw: string) => {
    const payload = parseImportMessage(raw);
    if (!payload) return;
    const found = normalizeScrapedTasks(payload.items);
    if (!found.length) {
      setStatus('Nenhuma atividade reconhecida nesta página. Abra a lista de tarefas e toque em Capturar de novo.');
      return;
    }
    setPending(current => mergeScrapedTasks(current, found));
    setPageTitle(payload.pageTitle ?? '');
    setStatus(`${found.length} atividade(s) encontradas. Revise a lista e salve o que quiser manter.`);
    setShowList(true);
  };

  const save = () => {
    if (!pending.length) return;
    const byCourse = new Map<string, ScrapedTask[]>();
    for (const task of pending) {
      byCourse.set(task.course, [...(byCourse.get(task.course) ?? []), task]);
    }
    let createdTasks = 0;
    let createdEvents = 0;
    byCourse.forEach((tasks, course) => {
      const existingSubject = subjects.find(subject => subject.name.toLowerCase() === course.toLowerCase());
      const subjectId = existingSubject?.id ?? addSubject(course, 'SIGAA / Moodle', '⌁', '#3949AB');
      const knownTasks = new Set((existingSubject?.tasks ?? []).map(task => task.title.toLowerCase()));
      const knownEvents = new Set(
        events
          .filter(event => event.subjectId === subjectId)
          .map(event => `${event.title.toLowerCase()}|${event.date}`),
      );
      for (const task of tasks) {
        if (!knownTasks.has(task.title.toLowerCase())) {
          addSubjectTask(
            subjectId,
            task.title,
            task.type === 'Prova' ? 'Alta' : 'Média',
            formatImportedDate(task.dueDate) || undefined,
            categoryForDueDate(task.dueDate),
          );
          knownTasks.add(task.title.toLowerCase());
          createdTasks += 1;
        }
        if (task.dueDate) {
          const date = formatImportedDate(task.dueDate);
          const key = `${task.title.toLowerCase()}|${date}`;
          if (!knownEvents.has(key)) {
            addEvent({
              title: task.title,
              type: task.type === 'Prova' ? 'Prova' : 'Exercício',
              subjectId,
              date,
              notes: task.url ? `Importado de ${task.url}` : 'Importado do ambiente acadêmico.',
              color: '#3949AB',
              emoji: '⌁',
            });
            knownEvents.add(key);
            createdEvents += 1;
          }
        }
      }
    });
    setSaved(`${createdTasks} tarefa(s) e ${createdEvents} prazo(s) salvos em Planejamento e Matérias.`);
    setStatus('Importação concluída. Abra Planejamento para ver as tarefas por matéria.');
    setPending([]);
    setShowList(false);
  };

  const toggleList = () => {
    if (pending.length) setShowList(value => !value);
  };

  return (
    <ScreenContainer edges={['top', 'bottom', 'left', 'right']}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.back}>
          <IconSymbol name="arrow.backward" size={21} color={colors.foreground} />
          <Text style={[styles.backLabel, { color: colors.foreground }]}>Voltar</Text>
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={[styles.title, { color: colors.foreground }]}>Importar SIGAA/Moodle</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>Login no site oficial, sem API e sem token.</Text>
        </View>
      </View>

      <View style={styles.controls}>
        <View style={styles.chips}>
          {IMPORT_PROVIDERS.map(item => (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              accessibilityState={{ selected: provider === item.id }}
              onPress={() => chooseProvider(item.id)}
              style={[
                styles.chip,
                { borderColor: colors.border },
                provider === item.id && { backgroundColor: colors.lavender, borderColor: colors.primary },
              ]}
            >
              <Text style={[styles.chipLabel, { color: provider === item.id ? colors.primary : colors.muted }]}>
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.urlRow}>
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            onChangeText={setDraft}
            onSubmitEditing={open}
            placeholder="https://sigaa.sua-instituicao.br/"
            placeholderTextColor={colors.muted}
            style={[styles.urlInput, { borderColor: colors.border, color: colors.foreground }]}
            value={draft}
          />
          <Pressable
            accessibilityRole="button"
            onPress={open}
            style={[styles.openButton, { backgroundColor: colors.primary }]}
          >
            <Text style={styles.openLabel}>Abrir</Text>
          </Pressable>
        </View>
        <View style={styles.actionsRow}>
          <Pressable
            accessibilityRole="button"
            onPress={() => setCaptureSignal(value => value + 1)}
            style={[styles.captureButton, { borderColor: colors.border }]}
          >
            <IconSymbol name="doc.text.fill" size={17} color={colors.primary} />
            <Text style={[styles.captureLabel, { color: colors.foreground }]}>Capturar atividades</Text>
          </Pressable>
          {pending.length ? (
            <Pressable
              accessibilityRole="button"
              onPress={toggleList}
              style={[styles.captureButton, { borderColor: colors.border }]}
            >
              <Text style={[styles.captureLabel, { color: colors.foreground }]}>
                {showList ? 'Ocultar lista' : `Ver lista (${pending.length})`}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      <View style={[styles.browser, { borderColor: colors.border }]}>
        <AcademicImportWebView
          captureSignal={captureSignal}
          onLoadProgress={value => setProgress(value)}
          onMessage={handleMessage}
          reloadKey={reloadKey}
          url={url}
        />
        {progress > 0 && progress < 1 ? (
          <View
            style={[styles.progress, { backgroundColor: colors.primary, width: `${Math.round(progress * 100)}%` }]}
          />
        ) : null}
      </View>

      <ScrollView contentContainerStyle={styles.footer}>
        <Text style={[styles.status, { color: colors.muted }]}>{status}</Text>
        {pageTitle ? <Text style={[styles.pageTitle, { color: colors.muted }]}>Página: {pageTitle}</Text> : null}
        {pending.length ? (
          <>
            <View style={styles.summaryRow}>
              <AcademicPill label={`${summary.total} atividades`} tone="indigo" />
              <AcademicPill label={`${summary.dated} com prazo`} tone="success" />
              <AcademicPill label={`${summary.courses.length} disciplina(s)`} tone="neutral" />
            </View>
            {showList ? (
              <AcademicCard style={styles.listCard}>
                <ScrollView nestedScrollEnabled style={styles.listScroll}>
                  {pending.map(task => (
                    <View
                      key={`${task.course}-${task.title}`}
                      style={[styles.item, { borderBottomColor: colors.border }]}
                    >
                      <View style={styles.itemCopy}>
                        <Text numberOfLines={2} style={[styles.itemTitle, { color: colors.foreground }]}>
                          {task.title}
                        </Text>
                        <Text numberOfLines={1} style={[styles.itemMeta, { color: colors.muted }]}>
                          {task.course}
                          {task.dueDate ? ` · ${formatImportedDate(task.dueDate)}` : ''}
                        </Text>
                      </View>
                      <AcademicPill label={task.type} tone={task.type === 'Prova' ? 'danger' : 'neutral'} />
                    </View>
                  ))}
                </ScrollView>
              </AcademicCard>
            ) : null}
            <AcademicButton label={`Salvar ${pending.length} atividade(s)`} onPress={save} compact />
          </>
        ) : null}
        {saved ? <Text style={[styles.saved, { color: colors.success }]}>{saved}</Text> : null}
        {Platform.OS === 'web' ? (
          <Text style={[styles.hint, { color: colors.muted }]}>
            Dica: no Android/iOS o login acontece dentro do app e a captura é automática ao abrir a página de tarefas.
          </Text>
        ) : null}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  actionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  back: { alignItems: 'center', flexDirection: 'row', gap: 4, paddingRight: 6, paddingVertical: 6 },
  backLabel: { fontSize: 13, fontWeight: '700' },
  browser: { borderRadius: 14, borderWidth: 1, flex: 1, marginHorizontal: 14, marginTop: 10, minHeight: 220, overflow: 'hidden' },
  captureButton: { alignItems: 'center', borderRadius: 11, borderWidth: 1, flexDirection: 'row', gap: 7, paddingHorizontal: 12, paddingVertical: 9 },
  captureLabel: { fontSize: 12, fontWeight: '700' },
  chip: { borderRadius: 999, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 7 },
  chipLabel: { fontSize: 12, fontWeight: '800' },
  chips: { flexDirection: 'row', gap: 8 },
  controls: { gap: 9, paddingHorizontal: 14, paddingTop: 12 },
  footer: { gap: 10, padding: 14, paddingBottom: 26 },
  header: { alignItems: 'center', borderBottomWidth: 1, flexDirection: 'row', gap: 8, paddingHorizontal: 14, paddingVertical: 10 },
  headerCopy: { flex: 1 },
  hint: { fontSize: 11, lineHeight: 16 },
  item: { alignItems: 'center', borderBottomWidth: 1, flexDirection: 'row', gap: 8, paddingVertical: 9 },
  itemCopy: { flex: 1 },
  itemMeta: { fontSize: 11, marginTop: 3 },
  itemTitle: { fontSize: 13, fontWeight: '700', lineHeight: 18 },
  listCard: { padding: 12 },
  listScroll: { maxHeight: 150 },
  openButton: { alignItems: 'center', borderRadius: 11, justifyContent: 'center', paddingHorizontal: 16 },
  openLabel: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  pageTitle: { fontSize: 11 },
  progress: { bottom: 0, height: 2, left: 0, position: 'absolute' },
  saved: { fontSize: 12, fontWeight: '700', lineHeight: 17 },
  status: { fontSize: 12, lineHeight: 17 },
  subtitle: { fontSize: 11, marginTop: 2 },
  summaryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  title: { fontSize: 17, fontWeight: '800', letterSpacing: -0.2 },
  urlInput: { borderRadius: 11, borderWidth: 1, flex: 1, fontSize: 13, minHeight: 42, paddingHorizontal: 11 },
  urlRow: { flexDirection: 'row', gap: 8 },
});
