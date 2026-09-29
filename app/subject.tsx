import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { AcademicButton, AcademicCard, AcademicEmptyState, AcademicPill, AcademicProgress, AcademicSection, academicColors } from '@/components/academic/design-system';
import { type AcademicEventType, type Task, type TaskCategory, useStudy } from '@/lib/study-store';

const categories: TaskCategory[] = ['Hoje', 'Amanhã', 'Próximas', 'Atrasadas'];
const eventTypes: AcademicEventType[] = ['Aula', 'Exercício', 'Prova', 'Teste', 'Visita', 'Outro'];
const eventColors: Record<AcademicEventType, string> = { Aula: '#3346A8', Exercício: '#18865B', Prova: '#C13B4A', Teste: '#B67500', Visita: '#7C3AED', Outro: '#687088' };

export default function SubjectScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const { subjects, events, notes, createNote, addSubjectTask, toggleSubjectTask, addEvent, toggleEvent, updateSubject } = useStudy();
  const subject = subjects.find(item => item.id === params.id);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showEventForm, setShowEventForm] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskPriority, setTaskPriority] = useState<Task['priority']>('Média');
  const [taskCategory, setTaskCategory] = useState<TaskCategory>('Próximas');
  const [eventTitle, setEventTitle] = useState('');
  const [eventDate, setEventDate] = useState('Hoje');
  const [eventType, setEventType] = useState<AcademicEventType>('Aula');
  const [editingDescription, setEditingDescription] = useState(false);
  const [descriptionDraft, setDescriptionDraft] = useState('');

  const subjectEvents = useMemo(() => events.filter(event => event.subjectId === subject?.id), [events, subject?.id]);
  const subjectNotes = useMemo(() => notes.filter(note => note.folder === subject?.name), [notes, subject?.name]);
  if (!subject) return <ScreenContainer style={styles.screen}><View style={styles.notFound}><AcademicEmptyState title="Matéria não encontrada" description="Ela pode ter sido removida ou ainda não foi criada." actionLabel="Voltar para Hoje" onAction={() => router.replace('/')} /></View></ScreenContainer>;

  const tasks = subject.tasks ?? [];
  const completed = tasks.filter(task => task.done).length;
  const progress = tasks.length ? Math.round((completed / tasks.length) * 100) : 0;
  const addTask = () => { if (!taskTitle.trim()) return; addSubjectTask(subject.id, taskTitle.trim(), taskPriority, undefined, taskCategory); setTaskTitle(''); setTaskPriority('Média'); setTaskCategory('Próximas'); setShowTaskForm(false); };
  const createDocument = (kind: 'Anotações' | 'Documento') => { const id = createNote(`${kind} — ${subject.name}`, subject.name); router.push({ pathname: '/document', params: { id } }); };
  const addSubjectEvent = () => { if (!eventTitle.trim()) return; addEvent({ title: eventTitle.trim(), date: eventDate.trim() || 'Hoje', type: eventType, subjectId: subject.id, color: eventColors[eventType], emoji: subject.emoji }); setEventTitle(''); setEventDate('Hoje'); setShowEventForm(false); };
  const startDescriptionEdit = () => { setDescriptionDraft(subject.description ?? ''); setEditingDescription(true); };
  const saveDescription = () => { updateSubject(subject.id, { description: descriptionDraft.trim() || undefined }); setEditingDescription(false); };

  return <ScreenContainer style={styles.screen}><ScrollView contentContainerStyle={styles.content}>
    <TouchableOpacity accessibilityRole="button" accessibilityLabel="Voltar para início" onPress={() => router.back()} style={styles.back}><Text style={styles.backText}>← Voltar</Text></TouchableOpacity>
    <View style={[styles.hero, { borderColor: `${subject.color}45` }]}><View style={[styles.subjectIcon, { backgroundColor: `${subject.color}18` }]}><Text style={styles.subjectEmoji}>{subject.emoji}</Text></View><View style={styles.heroCopy}><Text style={styles.overline}>MATÉRIA</Text><Text style={styles.title}>{subject.name}</Text><Text style={styles.professor}>{subject.professor}</Text></View></View>
    <AcademicCard style={styles.progressCard}><View style={styles.progressHeader}><View><Text style={styles.progressLabel}>PROGRESSO DA MATÉRIA</Text><Text style={styles.progressValue}>{progress}%</Text></View><AcademicPill label={`${completed}/${tasks.length} tarefas`} tone={progress >= 70 ? 'success' : 'indigo'} /></View><AcademicProgress value={progress} color={subject.color} height={9} /><Text style={styles.progressCaption}>{tasks.length ? 'O avanço é calculado pelas tarefas desta matéria.' : 'Crie tarefas para acompanhar a evolução da disciplina.'}</Text></AcademicCard>

    <AcademicSection eyebrow="SOBRE A DISCIPLINA" title="Visão da matéria" actionLabel={editingDescription ? 'Cancelar' : 'Editar'} onAction={() => editingDescription ? setEditingDescription(false) : startDescriptionEdit()}>
      <AcademicCard style={styles.descriptionCard}>{editingDescription ? <><TextInput value={descriptionDraft} onChangeText={setDescriptionDraft} multiline placeholder="Descreva objetivos, temas, critérios ou anotações importantes desta matéria." placeholderTextColor={academicColors.muted} style={styles.descriptionInput} /><AcademicButton label="Salvar descrição" onPress={saveDescription} compact /></> : <Text style={styles.descriptionText}>{subject.description || 'Registre aqui os objetivos, tópicos e observações importantes desta disciplina.'}</Text>}</AcademicCard>
    </AcademicSection>

    <View style={styles.quickActions}><AcademicButton label="Nova tarefa" onPress={() => setShowTaskForm(value => !value)} compact /><AcademicButton label="Nova anotação" onPress={() => createDocument('Anotações')} tone="violet" compact /><AcademicButton label="Novo documento" onPress={() => createDocument('Documento')} tone="neutral" compact /></View>

    <AcademicSection eyebrow="TAREFAS" title="O que estudar agora" actionLabel={showTaskForm ? 'Fechar' : '+ Adicionar'} onAction={() => setShowTaskForm(value => !value)}>
      {showTaskForm ? <AcademicCard style={styles.form}><Text style={styles.formTitle}>Nova tarefa para {subject.name}</Text><TextInput value={taskTitle} onChangeText={setTaskTitle} placeholder="Ex.: Revisar capítulo 2" placeholderTextColor={academicColors.muted} style={styles.input} /><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.choiceScroller}>{(['Baixa', 'Média', 'Alta'] as Task['priority'][]).map(priority => <Choice key={priority} label={priority} active={taskPriority === priority} onPress={() => setTaskPriority(priority)} />)}</ScrollView><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.choiceScroller}>{categories.map(category => <Choice key={category} label={category} active={taskCategory === category} onPress={() => setTaskCategory(category)} />)}</ScrollView><AcademicButton label="Adicionar tarefa" onPress={addTask} compact /></AcademicCard> : null}
      {tasks.length ? <View style={styles.stack}>{tasks.map(task => <AcademicCard key={task.id} style={styles.taskRow}><TouchableOpacity accessibilityRole="checkbox" accessibilityState={{ checked: task.done }} accessibilityLabel={`Concluir ${task.title}`} onPress={() => toggleSubjectTask(subject.id, task.id)} style={[styles.check, task.done && { backgroundColor: subject.color, borderColor: subject.color }]}><Text style={styles.checkText}>{task.done ? '✓' : ''}</Text></TouchableOpacity><View style={styles.taskCopy}><Text style={[styles.taskTitle, task.done && styles.done]}>{task.title}</Text><Text style={styles.taskMeta}>{task.category ?? 'Próximas'}{task.deadline ? ` · ${task.deadline}` : ''}</Text></View><AcademicPill label={task.priority} tone={task.priority === 'Alta' ? 'danger' : task.priority === 'Média' ? 'warning' : 'neutral'} /></AcademicCard>)}</View> : <AcademicEmptyState title="Comece pelo primeiro passo" description="Divida esta matéria em pequenas tarefas para acompanhar seu progresso." actionLabel="Adicionar tarefa" onAction={() => setShowTaskForm(true)} />}
    </AcademicSection>

    <AcademicSection eyebrow="AGENDA" title="Aulas, provas e entregas" actionLabel={showEventForm ? 'Fechar' : '+ Compromisso'} onAction={() => setShowEventForm(value => !value)}>
      {showEventForm ? <AcademicCard style={styles.form}><Text style={styles.formTitle}>Novo compromisso</Text><TextInput value={eventTitle} onChangeText={setEventTitle} placeholder="Ex.: Prova parcial" placeholderTextColor={academicColors.muted} style={styles.input} /><TextInput value={eventDate} onChangeText={setEventDate} placeholder="Hoje, 05 set…" placeholderTextColor={academicColors.muted} style={styles.input} /><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.choiceScroller}>{eventTypes.map(type => <Choice key={type} label={type} active={eventType === type} onPress={() => setEventType(type)} />)}</ScrollView><AcademicButton label="Adicionar compromisso" onPress={addSubjectEvent} compact /></AcademicCard> : null}
      {subjectEvents.length ? <View style={styles.stack}>{subjectEvents.map(event => <AcademicCard key={event.id} style={styles.eventRow}><View style={[styles.eventMark, { backgroundColor: `${event.color ?? subject.color}18` }]}><Text>{event.emoji ?? subject.emoji}</Text></View><View style={styles.eventCopy}><Text style={styles.eventTitle}>{event.title}</Text><Text style={styles.eventMeta}>{event.type} · {event.date}{event.time ? ` · ${event.time}` : ''}</Text></View><TouchableOpacity accessibilityRole="checkbox" accessibilityState={{ checked: event.done }} accessibilityLabel={`Concluir ${event.title}`} onPress={() => toggleEvent(event.id)} style={[styles.eventDone, event.done && { backgroundColor: event.color ?? subject.color }]}><Text style={styles.checkText}>{event.done ? '✓' : ''}</Text></TouchableOpacity></AcademicCard>)}</View> : <AcademicEmptyState title="Sem compromissos nesta matéria" description="Registre aulas, avaliações, entregas ou atividades futuras." actionLabel="Adicionar compromisso" onAction={() => setShowEventForm(true)} />}
    </AcademicSection>

    <AcademicSection eyebrow="CONHECIMENTO" title="Notas e documentos">
      {subjectNotes.length ? <View style={styles.documents}>{subjectNotes.map(note => <TouchableOpacity key={note.id} onPress={() => router.push({ pathname: '/document', params: { id: note.id } })} accessibilityRole="button" accessibilityLabel={`Abrir ${note.title}`} style={styles.documentRow}><View style={styles.documentIcon}><IconSymbol name="note.text" size={18} color={subject.color} /></View><View style={styles.documentCopy}><Text numberOfLines={1} style={styles.documentTitle}>{note.title}</Text><Text style={styles.documentMeta}>{note.updatedAt}</Text></View><IconSymbol name="chevron.right" size={18} color={academicColors.muted} /></TouchableOpacity>)}</View> : <AcademicEmptyState title="Nenhuma anotação vinculada" description="Crie um documento nesta página; ele ficará organizado dentro desta matéria." actionLabel="Nova anotação" onAction={() => createDocument('Anotações')} />}
    </AcademicSection>
  </ScrollView></ScreenContainer>;
}

function Choice({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) { return <TouchableOpacity accessibilityRole="button" accessibilityState={{ selected: active }} accessibilityLabel={label} onPress={onPress} style={[styles.choice, active && styles.choiceActive]}><Text style={[styles.choiceText, active && styles.choiceTextActive]}>{label}</Text></TouchableOpacity>; }

const styles = StyleSheet.create({
  back: { alignSelf: 'flex-start', minHeight: 38, justifyContent: 'center', marginBottom: 8 },
  backText: { color: academicColors.indigo, fontSize: 14, fontWeight: '800' },
  check: { alignItems: 'center', borderColor: '#C9D0DF', borderRadius: 10, borderWidth: 2, height: 23, justifyContent: 'center', marginRight: 11, width: 23 },
  checkText: { color: '#FFFFFF', fontSize: 13, fontWeight: '900' },
  choice: { backgroundColor: '#F5F7FC', borderColor: academicColors.line, borderRadius: 999, borderWidth: 1, justifyContent: 'center', marginRight: 7, minHeight: 34, paddingHorizontal: 11 },
  choiceActive: { backgroundColor: academicColors.indigo, borderColor: academicColors.indigo },
  choiceScroller: { paddingBottom: 10 },
  choiceText: { color: academicColors.muted, fontSize: 12, fontWeight: '800' },
  choiceTextActive: { color: '#FFFFFF' },
  content: { paddingBottom: 108, paddingHorizontal: 18, paddingTop: 16 },
  descriptionCard: { marginTop: -3, padding: 16 },
  descriptionInput: { backgroundColor: '#F9FAFE', borderColor: academicColors.line, borderRadius: 11, borderWidth: 1, color: academicColors.ink, fontSize: 14, lineHeight: 20, marginBottom: 11, minHeight: 90, padding: 12, textAlignVertical: 'top' },
  descriptionText: { color: academicColors.muted, fontSize: 14, lineHeight: 21 },
  documentCopy: { flex: 1, paddingRight: 10 },
  documentIcon: { alignItems: 'center', backgroundColor: '#F0EBFF', borderRadius: 11, height: 38, justifyContent: 'center', marginRight: 11, width: 38 },
  documentMeta: { color: academicColors.muted, fontSize: 11, marginTop: 3 },
  documentRow: { alignItems: 'center', borderBottomColor: academicColors.line, borderBottomWidth: 1, flexDirection: 'row', minHeight: 64, paddingVertical: 10 },
  documentTitle: { color: academicColors.ink, fontSize: 14, fontWeight: '800' },
  documents: { backgroundColor: '#FFFFFF', borderColor: academicColors.line, borderRadius: 18, borderWidth: 1, paddingHorizontal: 14 },
  done: { color: academicColors.muted, textDecorationLine: 'line-through' },
  eventCopy: { flex: 1, paddingRight: 8 },
  eventDone: { alignItems: 'center', borderColor: '#C9D0DF', borderRadius: 10, borderWidth: 2, height: 23, justifyContent: 'center', width: 23 },
  eventMark: { alignItems: 'center', borderRadius: 11, height: 38, justifyContent: 'center', marginRight: 11, width: 38 },
  eventMeta: { color: academicColors.muted, fontSize: 12, marginTop: 3 },
  eventRow: { alignItems: 'center', flexDirection: 'row', padding: 13 },
  eventTitle: { color: academicColors.ink, fontSize: 14, fontWeight: '800' },
  form: { marginBottom: 12, padding: 15 },
  formTitle: { color: academicColors.ink, fontSize: 15, fontWeight: '900', marginBottom: 12 },
  hero: { alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 20, borderWidth: 1, flexDirection: 'row', marginBottom: 13, padding: 18 },
  heroCopy: { flex: 1 },
  input: { backgroundColor: '#F9FAFE', borderColor: academicColors.line, borderRadius: 11, borderWidth: 1, color: academicColors.ink, fontSize: 14, marginBottom: 10, minHeight: 45, paddingHorizontal: 12 },
  notFound: { flex: 1, justifyContent: 'center', paddingHorizontal: 20 },
  overline: { color: academicColors.violet, fontSize: 10, fontWeight: '900', letterSpacing: 0.9 },
  professor: { color: academicColors.muted, fontSize: 13, marginTop: 4 },
  progressCaption: { color: academicColors.muted, fontSize: 12, marginTop: 11 },
  progressCard: { marginBottom: 13, padding: 17 },
  progressHeader: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  progressLabel: { color: academicColors.muted, fontSize: 10, fontWeight: '900', letterSpacing: 0.7 },
  progressValue: { color: academicColors.ink, fontSize: 32, fontWeight: '900', letterSpacing: -1, lineHeight: 38, marginTop: 1 },
  quickActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 25 },
  screen: { backgroundColor: academicColors.canvas },
  stack: { gap: 9 },
  subjectEmoji: { fontSize: 26 },
  subjectIcon: { alignItems: 'center', borderRadius: 16, height: 54, justifyContent: 'center', marginRight: 13, width: 54 },
  taskCopy: { flex: 1, paddingRight: 8 },
  taskMeta: { color: academicColors.muted, fontSize: 12, marginTop: 3 },
  taskRow: { alignItems: 'center', flexDirection: 'row', padding: 13 },
  taskTitle: { color: academicColors.ink, fontSize: 14, fontWeight: '800', lineHeight: 20 },
  title: { color: academicColors.ink, fontSize: 24, fontWeight: '900', letterSpacing: -0.5, lineHeight: 30, marginTop: 2 },
});
