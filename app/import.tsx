import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
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
  groupScrapedTasks,
  mergeScrapedCourses,
  mergeScrapedTasks,
  normalizeScrapedCourses,
  normalizeScrapedTasks,
  parseImportMessage,
  summarizeScrapedTasks,
  type ImportProviderId,
  type ScrapedCourse,
  type ScrapedTask,
} from '@/lib/academic-import';
import { type AcademicEventType, type Task, useStudyActions, useStudyEvents, useStudyNotes, useStudySubjects } from '@/lib/study-store';

const STORAGE_KEY = '@estudo-organizado/import-connection';

type SavedConnection = { provider?: ImportProviderId; url?: string };

export default function AcademicImportScreen() {
  const colors = useColors();
  const events = useStudyEvents();
  const subjects = useStudySubjects();
  const notes = useStudyNotes();
  const { addEvent, addSubject, addSubjectTask, createNote, saveNote, updateSubject, updateSubjectTask } = useStudyActions();
  const [provider, setProvider] = useState<ImportProviderId>('sigaa');
  const [url, setUrl] = useState<string>(IMPORT_PROVIDERS[0].url);
  const [draft, setDraft] = useState<string>(IMPORT_PROVIDERS[0].url);
  const [pending, setPending] = useState<ScrapedTask[]>([]);
  const [courses, setCourses] = useState<ScrapedCourse[]>([]);
  const [status, setStatus] = useState('Entre no ambiente, abra a página de tarefas e toque em Capturar.');
  const [progress, setProgress] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);
  const [captureSignal, setCaptureSignal] = useState(0);
  const [pageTitle, setPageTitle] = useState('');
  const [showList, setShowList] = useState(false);
  const [saved, setSaved] = useState('');
  /** Evita toque duplo e dá feedback durante a gravação em lotes. */
  const [saving, setSaving] = useState(false);
  /** Feedback imediato do botão "Capturar": spinner + texto enquanto o Moodle responde. */
  const [capturing, setCapturing] = useState(false);
  const captureTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearCaptureTimer = () => {
    if (captureTimerRef.current) {
      clearTimeout(captureTimerRef.current);
      captureTimerRef.current = null;
    }
  };

  const stopCapture = () => {
    clearCaptureTimer();
    setCapturing(false);
  };

  const startCapture = () => {
    if (capturing) return;
    clearCaptureTimer();
    if (Platform.OS === 'web') {
      setStatus('No navegador, cole a lista de atividades no campo acima e toque em "Revisar atividades coladas".');
      return;
    }
    setSaved('');
    setCapturing(true);
    setStatus('Lendo seu Moodle... Aguarde');
    setCaptureSignal(value => value + 1);
    /**
     * Rede de segurança: se a página não devolver nada (login expirado, WebView
     * parada), o spinner não fica preso para sempre.
     */
    captureTimerRef.current = setTimeout(() => {
      setCapturing(false);
      captureTimerRef.current = null;
      setStatus('A leitura demorou mais que o esperado. Abra a lista de tarefas e toque em Capturar de novo.');
    }, 30000);
  };

  useEffect(() => () => clearCaptureTimer(), []);

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
  /** Revisão agrupada por matéria (é assim que as disciplinas serão criadas). */
  const groups = useMemo(() => groupScrapedTasks(pending), [pending]);
  const teacherByCourse = useMemo(() => {
    const map = new Map<string, string>();
    for (const course of courses) if (course.teacher) map.set(course.name.toLowerCase(), course.teacher);
    for (const task of pending) {
      if (task.teacher && !map.has(task.course.toLowerCase())) map.set(task.course.toLowerCase(), task.teacher);
    }
    return map;
  }, [courses, pending]);

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
    // A resposta final (não parcial) encerra o spinner; a parcial mantém "Lendo…".
    if (!payload.partial) stopCapture();
    const found = normalizeScrapedTasks(payload.items);
    const foundCourses = normalizeScrapedCourses(payload.courses);
    if (foundCourses.length) setCourses(current => mergeScrapedCourses(current, foundCourses));
    if (found.length) setPending(current => mergeScrapedTasks(current, found));
    if (payload.pageTitle) setPageTitle(payload.pageTitle);

    if (!found.length && !foundCourses.length) {
      if (!payload.partial) {
        setStatus('Nenhuma atividade reconhecida nesta página. Abra a lista de tarefas e toque em Capturar de novo.');
      }
      return;
    }
    if (payload.partial) {
      setStatus(`Lendo as matérias do Moodle… ${found.length} atividade(s) nesta etapa.`);
      return;
    }
    if (!found.length) {
      setStatus(`${foundCourses.length} matéria(s) encontradas, mas nenhuma atividade com data. Abra cada matéria e capture de novo.`);
      return;
    }
    setStatus(`${found.length} atividade(s) encontradas em ${foundCourses.length || 'várias'} matéria(s). Revise a lista e salve o que quiser manter.`);
    setShowList(true);
  };

  const save = async () => {
    if (saving || (!pending.length && !courses.length)) return;
    setSaving(true);
    stopCapture();
    setStatus('Salvando as atividades em lotes…');
    /**
     * Devolve a thread para a interface antes do processamento pesado. O Moodle
     * pode trazer 200 atividades + materiais; fazer tudo num único toque era o
     * que travava a tela no aparelho.
     */
    await new Promise<void>(resolve => setTimeout(resolve, 0));
    try {
    let createdTasks = 0;
    let createdEvents = 0;
    let createdSubjects = 0;
    let createdMaterials = 0;
    let processedTasks = 0;
    const palette = ['#3949AB', '#7C3AED', '#18865B', '#C13B4A', '#B67500', '#0E7490'];
    const subjectIds = new Map<string, string>();
    /**
     * Otimização: URLs já importadas em capturas anteriores. Evita recriar a
     * mesma tarefa quando o Moodle devolve o item em duas páginas diferentes.
     */
    const importedUrls = new Set<string>();
    for (const event of events) {
      const match = event.notes?.match(/Importado de (https?:\/\/\S+)/);
      if (match) importedUrls.add(match[1]);
    }

    /** Uma matéria por curso — nunca mais uma disciplina "Página inicial". */
    const ensureSubject = (name: string, teacher?: string) => {
      const key = name.trim().toLowerCase();
      const known = subjectIds.get(key);
      if (known) return { id: known, created: false };
      const existing = subjects.find(subject => subject.name.trim().toLowerCase() === key);
      if (existing) {
        subjectIds.set(key, existing.id);
        /** Completa o professor de uma matéria importada antes sem esse dado. */
        if (teacher?.trim() && (!existing.professor.trim() || /^(SIGAA \/ Moodle|Moodle \/ AVA|Professor(\(a\))? não informado)$/i.test(existing.professor))) {
          updateSubject(existing.id, { professor: teacher.trim() });
        }
        return { id: existing.id, created: false };
      }
      const id = addSubject(name, teacher?.trim() || '', '📚', palette[subjectIds.size % palette.length]);
      subjectIds.set(key, id);
      createdSubjects += 1;
      return { id, created: true };
    };

    /**
     * Materiais do curso (PDFs, arquivos, pastas e páginas) viram uma nota
     * dentro da matéria. Na próxima importação, só os links novos entram —
     * nada é duplicado nem apagado.
     */
    const saveMaterials = (course: ScrapedCourse, subjectId: string, folder: string) => {
      const materials = course.materials ?? [];
      if (!materials.length) return 0;
      const title = `Materiais — ${course.name}`;
      const existing = notes.find(note => note.folder === folder && note.title.trim().toLowerCase() === title.toLowerCase());
      const existingContent = existing?.content ?? '';
      const additions = materials.filter(material => !existingContent.includes(material.url));
      if (!additions.length) return 0;
      const additionText = additions.map(material => `• ${material.title}\n${material.url}`).join('\n\n');
      const content = existingContent ? `${existingContent}\n\n${additionText}` : `Links de conteúdo encontrados no Moodle:\n\n${additionText}`;
      const blocks = additions.map((material, index) => ({
        id: `moodle-material-${Date.now()}-${subjectId}-${index}`,
        type: 'paragraph' as const,
        text: `${material.title}\n${material.url}`,
      }));
      if (existing) {
        saveNote({ ...existing, content, folder, blocks: [...(existing.blocks ?? []), ...blocks] });
      } else {
        const noteId = createNote(title, folder);
        saveNote({ id: noteId, title, content, folder, updatedAt: 'Agora', kind: 'note', blocks });
      }
      return additions.length;
    };

    for (const group of groups) {
      /** Tarefas sem matéria identificada ficam em "Ambiente acadêmico" — nada é descartado. */
      const courseName = group.course?.trim() || 'Ambiente acadêmico';
      const teacher = group.teacher || teacherByCourse.get(courseName.toLowerCase());
      const { id: subjectId, created } = ensureSubject(courseName, teacher);
      const existingSubject = created ? undefined : subjects.find(subject => subject.id === subjectId);
      const knownTasks = new Set((existingSubject?.tasks ?? []).map(task => task.title.toLowerCase()));
      const knownEvents = new Set(
        events
          .filter(event => event.subjectId === subjectId)
          .map(event => `${event.title.toLowerCase()}|${event.date}`),
      );
      for (const task of group.tasks) {
        processedTasks += 1;
        if (processedTasks % 25 === 0) {
          /** Cede a thread a cada 25 atividades (listas grandes do Moodle). */
          await new Promise<void>(resolve => setTimeout(resolve, 0));
        }
        const titleKey = task.title.toLowerCase();
        const alreadyImported = Boolean(task.url) && importedUrls.has(task.url as string);
        /**
         * Fóruns/avisos/apresentações NÃO viram tarefa: eles vivem em
         * "Avisos e comunicados" e não poluem a lista do que precisa de ação.
         */
        const isNotice = task.type === 'Aviso';
        if (!isNotice && !knownTasks.has(titleKey) && !alreadyImported) {
          addSubjectTask(
            subjectId,
            task.title,
            task.type === 'Prova' ? 'Alta' : 'Média',
            formatImportedDate(task.dueDate) || undefined,
            categoryForDueDate(task.dueDate),
            {
              url: task.url,
              status: task.status,
              done: task.status === 'Concluído',
            },
          );
          knownTasks.add(titleKey);
          createdTasks += 1;
        }
        /**
         * Reimportar depois de uma correção (link/status/professor) atualiza a
         * tarefa que já existe, em vez de ignorá-la pelo título.
         */
        const existingTask = !isNotice
          ? (existingSubject?.tasks ?? []).find(entry => entry.title.toLowerCase() === titleKey)
          : undefined;
        if (existingTask) {
          const changes: Partial<Pick<Task, 'url' | 'status' | 'done' | 'deadline'>> = {};
          if (task.url && existingTask.url !== task.url) changes.url = task.url;
          if (task.status && existingTask.status !== task.status) {
            changes.status = task.status;
            changes.done = task.status === 'Concluído';
          }
          const deadline = formatImportedDate(task.dueDate) || undefined;
          if (deadline && !existingTask.deadline) changes.deadline = deadline;
          if (Object.keys(changes).length) updateSubjectTask(subjectId, existingTask.id, changes);
        }
        /**
         * Avisos sem data continuam sendo guardados (com "Sem prazo") para
         * nenhuma informação do Moodle se perder.
         */
        if (task.dueDate || isNotice) {
          const date = formatImportedDate(task.dueDate) || 'Sem prazo';
          const key = `${titleKey}|${date}`;
          if (!knownEvents.has(key)) {
            const eventType: AcademicEventType =
              task.type === 'Prova'
                ? 'Prova'
                : task.type === 'Aviso'
                  ? 'Aviso'
                  : task.type === 'Material'
                    ? 'Outro'
                    : 'Exercício';
            addEvent({
              title: task.title,
              type: eventType,
              subjectId,
              date,
              notes: [task.dateDescription, task.url ? `Importado de ${task.url}` : 'Importado do ambiente acadêmico.'].filter(Boolean).join('\n'),
              color: isNotice ? '#B67500' : '#3949AB',
              emoji: isNotice ? '📢' : '⌁',
            });
            knownEvents.add(key);
            if (task.url) importedUrls.add(task.url);
            createdEvents += 1;
          }
        }
      }
    }

    // Matérias encontradas em "Meus cursos" entram em "Sua faculdade" mesmo sem atividades.
    for (const course of courses) {
      const { id } = ensureSubject(course.name, course.teacher);
      const folder = subjects.find(subject => subject.id === id)?.name ?? course.name;
      createdMaterials += saveMaterials(course, id, folder);
    }

    setSaved(`${createdSubjects} matéria(s), ${createdTasks} tarefa(s), ${createdEvents} prazo(s) e ${createdMaterials} material(is) salvos em Matérias, Planejamento e Biblioteca.`);
    setStatus('Importação concluída. Abra Planejamento para ver as tarefas por matéria.');
    setPending([]);
    setCourses([]);
    setShowList(false);
    } finally {
      setSaving(false);
    }
  };

  const toggleList = () => {
    if (pending.length || courses.length) setShowList(value => !value);
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
            accessibilityLabel={capturing ? 'Lendo as atividades do Moodle' : 'Capturar atividades'}
            accessibilityState={{ busy: capturing, disabled: capturing }}
            disabled={capturing}
            onPress={startCapture}
            style={[styles.captureButton, { borderColor: colors.border }, capturing && styles.captureDisabled]}
          >
            {capturing ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <IconSymbol name="doc.text.fill" size={17} color={colors.primary} />
            )}
            <Text style={[styles.captureLabel, { color: colors.foreground }]}>
              {capturing ? 'Lendo...' : 'Capturar atividades'}
            </Text>
          </Pressable>
          {pending.length || courses.length ? (
            <Pressable
              accessibilityRole="button"
              onPress={toggleList}
              style={[styles.captureButton, { borderColor: colors.border }]}
            >
              <Text style={[styles.captureLabel, { color: colors.foreground }]}>
                {showList ? 'Ocultar lista' : `Ver lista (${pending.length || courses.length})`}
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

      {capturing ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.foreground }]}>Lendo seu Moodle... Aguarde</Text>
        </View>
      ) : null}

      <ScrollView contentContainerStyle={styles.footer}>
        <Text style={[styles.status, { color: colors.muted }]}>{status}</Text>
        {pageTitle ? <Text style={[styles.pageTitle, { color: colors.muted }]}>Página: {pageTitle}</Text> : null}
        {pending.length || courses.length ? (
          <>
            <View style={styles.summaryRow}>
              <AcademicPill label={`${summary.total} atividades`} tone="indigo" />
              <AcademicPill label={`${summary.dated} com prazo`} tone="success" />
              <AcademicPill label={`${courses.length || summary.courses.length} matéria(s)`} tone="neutral" />
            </View>
            {showList && groups.length ? (
              <AcademicCard style={styles.listCard}>
                <ScrollView nestedScrollEnabled style={styles.listScroll}>
                  {groups.map(group => (
                    <View key={`group-${group.course}`} style={styles.group}>
                      <View style={styles.groupHeader}>
                        <Text numberOfLines={1} style={[styles.groupName, { color: colors.foreground }]}>
                          {group.course === 'Ambiente acadêmico' ? 'Sem matéria identificada' : group.course}
                        </Text>
                        <Text numberOfLines={1} style={[styles.groupTeacher, { color: colors.muted }]}>
                          {group.teacher ||
                            teacherByCourse.get(group.course.toLowerCase()) ||
                            (group.course === 'Ambiente acadêmico'
                              ? 'será importada em Ambiente acadêmico'
                              : 'Professor(a) não informado')}
                        </Text>
                        <Text style={[styles.groupCount, { color: colors.muted }]}>{group.tasks.length}</Text>
                      </View>
                      {group.tasks.map((task, index) => (
                        <View
                          key={`${group.course}-${task.title}-${index}`}
                          style={[styles.item, { borderBottomColor: colors.border }]}
                        >
                          <View style={styles.itemCopy}>
                            <Text numberOfLines={2} style={[styles.itemTitle, { color: colors.foreground }]}>
                              {task.title}
                            </Text>
                            <Text numberOfLines={2} style={[styles.itemSubtitle, { color: colors.muted }]}>
                              {task.dateDescription ||
                                (task.dueDate ? `Prazo: ${formatImportedDate(task.dueDate)}` : 'Sem prazo definido')}
                            </Text>
                            {task.dueDate || task.teacher ? (
                              <Text numberOfLines={1} style={[styles.itemMeta, { color: colors.muted }]}>
                                {[task.dueDate ? `Data: ${formatImportedDate(task.dueDate)}` : '', task.teacher]
                                  .filter(Boolean)
                                  .join(' · ')}
                              </Text>
                            ) : null}
                          </View>
                          <AcademicPill
                            label={task.type}
                            tone={
                              task.type === 'Prova'
                                ? 'danger'
                                : task.type === 'Aviso'
                                  ? 'warning'
                                  : task.type === 'Material'
                                    ? 'info'
                                    : task.type === 'Exercício'
                                      ? 'indigo'
                                      : 'neutral'
                            }
                          />
                        </View>
                      ))}
                    </View>
                  ))}
                </ScrollView>
              </AcademicCard>
            ) : null}
            <AcademicButton
              label={
                saving
                  ? 'Salvando em lotes…'
                  : pending.length
                    ? `Salvar ${pending.length} atividade(s) em ${groups.length} matéria(s)`
                    : `Criar ${courses.length} matéria(s) em Sua faculdade`
              }
              onPress={() => void save()}
              disabled={saving}
              compact
            />
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
  captureDisabled: { opacity: 0.66 },
  captureLabel: { fontSize: 12, fontWeight: '700' },
  chip: { borderRadius: 999, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 7 },
  chipLabel: { fontSize: 12, fontWeight: '800' },
  chips: { flexDirection: 'row', gap: 8 },
  controls: { gap: 9, paddingHorizontal: 14, paddingTop: 12 },
  footer: { gap: 10, padding: 14, paddingBottom: 112 },
  group: { marginBottom: 4 },
  groupCount: { fontSize: 11, fontWeight: '800' },
  groupHeader: { alignItems: 'center', flexDirection: 'row', gap: 6, paddingBottom: 4, paddingTop: 8 },
  groupName: { flexShrink: 1, fontSize: 12, fontWeight: '900' },
  groupTeacher: { flex: 1, fontSize: 10 },
  header: { alignItems: 'center', borderBottomWidth: 1, flexDirection: 'row', gap: 8, paddingHorizontal: 14, paddingVertical: 10 },
  headerCopy: { flex: 1 },
  hint: { fontSize: 11, lineHeight: 16 },
  item: { alignItems: 'center', borderBottomWidth: 1, flexDirection: 'row', gap: 8, paddingVertical: 9 },
  itemCopy: { flex: 1 },
  itemMeta: { fontSize: 11, marginTop: 3 },
  itemSubtitle: { fontSize: 11, lineHeight: 16, marginTop: 2 },
  itemTitle: { fontSize: 13, fontWeight: '700', lineHeight: 18 },
  listCard: { padding: 12 },
  listScroll: { maxHeight: 150 },
  loading: { alignItems: 'center', flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 12 },
  loadingText: { fontSize: 13, fontWeight: '800' },
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
