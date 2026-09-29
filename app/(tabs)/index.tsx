import { useMemo, useState } from 'react';
import { Alert, Linking, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { router } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { AcademicButton, AcademicCard, AcademicEmptyState, AcademicPill, AcademicProgress, AcademicSection, academicColors } from '@/components/academic/design-system';
import { type AcademicEvent, type AcademicEventType, type Subject, useStudy } from '@/lib/study-store';

const eventTypes: AcademicEventType[] = ['Aula', 'Exercício', 'Prova', 'Teste', 'Visita', 'Outro'];
const eventColors: Record<AcademicEventType, string> = { Aula: '#3346A8', Exercício: '#18865B', Prova: '#C13B4A', Teste: '#B67500', Visita: '#7C3AED', Outro: '#687088' };
const eventEmojis: Record<AcademicEventType, string> = { Aula: '📚', Exercício: '✎', Prova: '★', Teste: '✓', Visita: '⌘', Outro: '✦' };
const weekdays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

type CalendarPoint = { day: number; month: number; year: number };

function formatMonth(date: Date) {
  return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).replace(/^./, letter => letter.toUpperCase());
}

function eventMatchesPoint(event: AcademicEvent, point: CalendarPoint, today: Date) {
  const date = event.date.trim().toLocaleLowerCase('pt-BR');
  const current = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const target = new Date(point.year, point.month, point.day);
  if (date === 'hoje') return current.getTime() === target.getTime();
  const tomorrow = new Date(current); tomorrow.setDate(current.getDate() + 1);
  if (date === 'amanhã' || date === 'amanha') return tomorrow.getTime() === target.getTime();
  const monthShort = target.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '').toLocaleLowerCase('pt-BR');
  const monthLong = target.toLocaleDateString('pt-BR', { month: 'long' }).toLocaleLowerCase('pt-BR');
  const day = String(point.day).padStart(2, '0');
  return date.startsWith(day) && (date.includes(monthShort) || date.includes(monthLong));
}

export default function HomeScreen() {
  const { width } = useWindowDimensions();
  const tablet = width >= 760;
  const { subjects, events, goals, notes, addSubject, updateSubject, deleteSubject, addEvent, toggleEvent, deleteEvent, toggleTask } = useStudy();
  const [today] = useState(() => new Date());
  const [visibleMonth, setVisibleMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedPoint, setSelectedPoint] = useState<CalendarPoint>({ day: today.getDate(), month: today.getMonth(), year: today.getFullYear() });
  const [showSubjectForm, setShowSubjectForm] = useState(false);
  const [showEventForm, setShowEventForm] = useState(false);
  const [subjectName, setSubjectName] = useState('');
  const [professor, setProfessor] = useState('');
  const [eventTitle, setEventTitle] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [eventType, setEventType] = useState<AcademicEventType>('Aula');

  const allTasks = useMemo(() => goals.flatMap(goal => goal.tasks.map(task => ({ ...task, goalId: goal.id, goalTitle: goal.title }))), [goals]);
  const openTasks = useMemo(() => allTasks.filter(task => !task.done), [allTasks]);
  const completedTasks = allTasks.length - openTasks.length;
  const progress = allTasks.length ? Math.round((completedTasks / allTasks.length) * 100) : 0;
  const selectedEvents = useMemo(() => events.filter(event => eventMatchesPoint(event, selectedPoint, today)), [events, selectedPoint, today]);
  const upcomingEvents = useMemo(() => events.filter(event => !event.done).slice(0, 3), [events]);
  const calendarDays = useMemo(() => {
    const days = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 0).getDate();
    const start = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1).getDay();
    return [...Array.from({ length: start }, () => null), ...Array.from({ length: days }, (_, index) => index + 1)];
  }, [visibleMonth]);

  const goToday = () => {
    const now = new Date();
    setVisibleMonth(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedPoint({ day: now.getDate(), month: now.getMonth(), year: now.getFullYear() });
  };
  const selectDay = (day: number) => setSelectedPoint({ day, month: visibleMonth.getMonth(), year: visibleMonth.getFullYear() });
  const addSubjectFromForm = () => {
    if (!subjectName.trim()) return;
    addSubject(subjectName.trim(), professor.trim() || 'Professor não informado', '✦', academicColors.indigo);
    setSubjectName(''); setProfessor(''); setShowSubjectForm(false);
  };
  const addEventFromForm = () => {
    if (!eventTitle.trim()) return;
    const dateLabel = `${String(selectedPoint.day).padStart(2, '0')} ${new Date(selectedPoint.year, selectedPoint.month).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}`;
    addEvent({ title: eventTitle.trim(), date: dateLabel, time: eventTime.trim(), type: eventType, emoji: eventEmojis[eventType], color: eventColors[eventType] });
    setEventTitle(''); setEventTime(''); setShowEventForm(false);
  };

  return <ScreenContainer style={styles.screen}>
    <ScrollView contentContainerStyle={[styles.content, tablet && styles.contentWide]}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.overline}>ESTUDO ORGANIZADO · CRIS</Text>
          <Text style={styles.greeting}>Olá, Cris 👋</Text>
          <Text style={styles.subtitle}>{openTasks.length ? `Você tem ${openTasks.length} ${openTasks.length === 1 ? 'passo pendente' : 'passos pendentes'} no seu plano.` : 'Seu plano está em dia. Que tal registrar o próximo objetivo?'}</Text><TouchableOpacity onPress={() => router.push('/code')} style={styles.codeShortcut} accessibilityRole="button" accessibilityLabel="Abrir Espaço Código e Cris"><View style={styles.codeShortcutMark}><Text style={styles.codeShortcutMarkText}>⌘</Text></View><View style={styles.codeShortcutCopy}><Text style={styles.codeShortcutTitle}>Espaço Código · Cris</Text><Text style={styles.codeShortcutText}>Editar, testar e aprender com segurança</Text></View><Text style={styles.codeShortcutArrow}>›</Text></TouchableOpacity>
        </View>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Abrir perfil" onPress={() => router.push('/profile')} activeOpacity={0.78} style={styles.avatar}><Text style={styles.avatarText}>C</Text></TouchableOpacity>
      </View>

      <View style={styles.creatorCard}>
        <View style={styles.creatorMark}><Text style={styles.creatorMarkText}>✦</Text></View>
        <View style={styles.creatorCopy}>
          <Text style={styles.creatorKicker}>AUTORIA DO PROJETO</Text>
          <Text style={styles.creatorTitle}>Pensado e construído por Cris</Text>
          <Text style={styles.creatorText}>Um espaço para agilizar a faculdade com planejamento, editor de texto, editor de código, Cris online e recursos preparados para nuvem e uso local.</Text>
          <View style={styles.creatorActions}>
            <TouchableOpacity onPress={() => router.push('/settings')} accessibilityRole="button" style={styles.creatorAbout}><Text style={styles.creatorAboutText}>Conheça o projeto</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => Linking.openURL('mailto:cris.de.santos.tst@gmail.com')} accessibilityRole="button" style={styles.creatorContact}><Text style={styles.creatorContactText}>Falar com Cris</Text></TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={styles.moodleHomeCard}><View style={styles.moodleHomeMark}><Text style={styles.moodleHomeMarkText}>↻</Text></View><View style={styles.moodleHomeCopy}><Text style={styles.moodleHomeKicker}>MOODLE · AVA</Text><Text style={styles.moodleHomeTitle}>Traga seus conteúdos para cá</Text><Text style={styles.moodleHomeText}>Importe disciplinas, tarefas, textos, PDFs, vídeos e prazos usando uma conexão autorizada.</Text><TouchableOpacity onPress={() => router.push({ pathname: '/settings', params: { section: 'connections' } })} accessibilityRole="button" style={styles.moodleHomeButton}><Text style={styles.moodleHomeButtonText}>Trazer conteúdos do Moodle</Text><Text style={styles.moodleHomeButtonArrow}>›</Text></TouchableOpacity></View></View>

      <View style={[styles.overviewGrid, tablet && styles.overviewGridTablet]}>
        <View style={styles.progressHero}>
          <View style={styles.heroRow}><View><Text style={styles.heroLabel}>PROGRESSO DO PLANO</Text><Text style={styles.heroNumber}>{progress}%</Text></View><View style={styles.heroMark}><Text style={styles.heroMarkText}>↗</Text></View></View>
          <AcademicProgress value={progress} color={academicColors.indigo} height={9} />
          <Text style={styles.heroCaption}>{completedTasks} de {allTasks.length || 0} tarefas concluídas</Text>
        </View>
          <View style={styles.metricGrid}>
          <Metric value={String(openTasks.length)} label="Tarefas abertas" accent={academicColors.warning} />
          <Metric value={String(events.filter(event => !event.done).length)} label="Compromissos" accent={academicColors.violet} />
          <Metric value={String(notes.length)} label="Documentos" accent={academicColors.success} />
        </View>
      </View>

      <View style={[styles.splitGrid, tablet && styles.splitGridTablet]}>
        <View style={styles.primaryColumn}>
          <AcademicSection eyebrow="AGORA" title="Seu próximo passo" actionLabel="Ver planejamento" onAction={() => router.push('/planning')}>
            {openTasks.length ? <View style={styles.taskStack}>{openTasks.slice(0, 3).map(task => <TaskRow key={task.id} title={task.title} subtitle={task.goalTitle} priority={task.priority} done={task.done} onToggle={() => toggleTask(task.goalId, task.id)} />)}</View> : <AcademicEmptyState title="Nenhuma tarefa pendente" description="Seu plano está livre por enquanto. Que tal planejar o próximo passo?" actionLabel="Criar meta" onAction={() => router.push('/planning')} />}
          </AcademicSection>

          <AcademicSection eyebrow="MATÉRIAS" title="Sua faculdade" actionLabel={showSubjectForm ? 'Fechar' : '+ Nova matéria'} onAction={() => setShowSubjectForm(value => !value)}>
            {showSubjectForm ? <AcademicCard style={styles.composer}><Text style={styles.composerTitle}>Adicionar matéria</Text><TextInput value={subjectName} onChangeText={setSubjectName} placeholder="Nome da matéria" placeholderTextColor={academicColors.muted} style={styles.input} /><TextInput value={professor} onChangeText={setProfessor} placeholder="Professor(a)" placeholderTextColor={academicColors.muted} style={styles.input} /><AcademicButton label="Salvar matéria" onPress={addSubjectFromForm} compact /></AcademicCard> : null}
            {subjects.length ? <View style={styles.subjectGrid}>{subjects.map(subject => <SubjectCard key={subject.id} subject={subject} events={events} onOpen={() => router.push({ pathname: '/subject', params: { id: subject.id } })} onSave={changes => updateSubject(subject.id, changes)} onDelete={() => Alert.alert('Excluir matéria?', 'Os eventos já registrados continuarão na sua agenda.', [{ text: 'Cancelar', style: 'cancel' }, { text: 'Excluir', style: 'destructive', onPress: () => deleteSubject(subject.id) }])} />)}</View> : <AcademicEmptyState title="Ainda não há matérias" description="Crie sua primeira matéria para começar a organizar sua faculdade." actionLabel="Nova matéria" onAction={() => setShowSubjectForm(true)} />}
          </AcademicSection>

          <AcademicSection eyebrow="ESCRITA" title="Continue escrevendo" actionLabel="Abrir documentos" onAction={() => router.push('/editor')}>
            {notes.length ? <View style={styles.notesPanel}>{notes.slice(0, 3).map(note => <TouchableOpacity key={note.id} onPress={() => router.push({ pathname: '/document', params: { id: note.id } })} accessibilityRole="button" accessibilityLabel={`Abrir ${note.title}`} activeOpacity={0.76} style={styles.noteRow}><View style={styles.noteIcon}><IconSymbol name="note.text" size={18} color={academicColors.indigo} /></View><View style={styles.noteCopy}><Text numberOfLines={1} style={styles.noteTitle}>{note.title}</Text><Text numberOfLines={1} style={styles.noteMeta}>{note.folder} · {note.updatedAt}</Text></View><IconSymbol name="chevron.right" size={18} color={academicColors.muted} /></TouchableOpacity>)}</View> : <AcademicEmptyState title="Sua mesa de escrita está vazia" description="Crie uma nota, resumo ou documento acadêmico para continuar." actionLabel="Novo documento" onAction={() => router.push('/editor')} />}
          </AcademicSection>
        </View>

        <View style={styles.secondaryColumn}>
          <AcademicSection eyebrow="AGENDA" title="Calendário" actionLabel="Hoje" onAction={goToday}>
            <AcademicCard style={styles.calendarCard}>
              <View style={styles.calendarTop}><TouchableOpacity onPress={() => setVisibleMonth(current => new Date(current.getFullYear(), current.getMonth() - 1, 1))} accessibilityRole="button" accessibilityLabel="Mês anterior" style={styles.calendarArrow}><Text style={styles.calendarArrowText}>‹</Text></TouchableOpacity><Text style={styles.monthTitle}>{formatMonth(visibleMonth)}</Text><TouchableOpacity onPress={() => setVisibleMonth(current => new Date(current.getFullYear(), current.getMonth() + 1, 1))} accessibilityRole="button" accessibilityLabel="Próximo mês" style={styles.calendarArrow}><Text style={styles.calendarArrowText}>›</Text></TouchableOpacity></View>
              <View style={styles.weekdayRow}>{weekdays.map((day, index) => <Text key={`${day}-${index}`} style={styles.weekday}>{day}</Text>)}</View>
              <View style={styles.calendarGrid}>{calendarDays.map((day, index) => {
                if (!day) return <View key={`empty-${index}`} style={styles.dayCell} />;
                const point = { day, month: visibleMonth.getMonth(), year: visibleMonth.getFullYear() };
                const selected = point.day === selectedPoint.day && point.month === selectedPoint.month && point.year === selectedPoint.year;
                const isToday = point.day === today.getDate() && point.month === today.getMonth() && point.year === today.getFullYear();
                const dayEvents = events.filter(event => eventMatchesPoint(event, point, today));
                return <TouchableOpacity key={day} onPress={() => selectDay(day)} accessibilityRole="button" accessibilityLabel={`Dia ${day}`} activeOpacity={0.75} style={[styles.dayCell, selected && styles.daySelected, isToday && !selected && styles.dayToday]}><Text style={[styles.dayText, selected && styles.dayTextSelected]}>{day}</Text><View style={styles.dotRow}>{dayEvents.slice(0, 3).map(event => <View key={event.id} style={[styles.calendarDot, { backgroundColor: selected ? '#FFFFFF' : event.color ?? eventColors[event.type] }]} />)}</View></TouchableOpacity>;
              })}</View>
              <View style={styles.calendarLegend}><Legend color={eventColors.Aula} label="Aula" /><Legend color={eventColors.Prova} label="Prova" /><Legend color={eventColors.Exercício} label="Exercício" /></View>
            </AcademicCard>
          </AcademicSection>

          <AcademicSection title={`Agenda · ${String(selectedPoint.day).padStart(2, '0')}`} actionLabel={showEventForm ? 'Fechar' : '+ Compromisso'} onAction={() => setShowEventForm(value => !value)}>
            {showEventForm ? <AcademicCard style={styles.composer}><Text style={styles.composerTitle}>Adicionar compromisso</Text><TextInput value={eventTitle} onChangeText={setEventTitle} placeholder="Ex.: Entregar exercício" placeholderTextColor={academicColors.muted} style={styles.input} /><TextInput value={eventTime} onChangeText={setEventTime} placeholder="Horário (opcional)" placeholderTextColor={academicColors.muted} style={styles.input} /><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.typeScroller}>{eventTypes.map(type => <TouchableOpacity key={type} onPress={() => setEventType(type)} accessibilityRole="button" accessibilityLabel={`Tipo ${type}`} style={[styles.typeChip, eventType === type && { backgroundColor: eventColors[type], borderColor: eventColors[type] }]}><Text style={[styles.typeChipText, eventType === type && { color: '#FFFFFF' }]}>{type}</Text></TouchableOpacity>)}</ScrollView><AcademicButton label="Adicionar à agenda" onPress={addEventFromForm} compact /></AcademicCard> : null}
            {selectedEvents.length ? <View style={styles.eventStack}>{selectedEvents.map(event => <EventRow key={event.id} event={event} onToggle={() => toggleEvent(event.id)} onDelete={() => Alert.alert('Excluir compromisso?', 'Remover este item da agenda?', [{ text: 'Cancelar', style: 'cancel' }, { text: 'Excluir', style: 'destructive', onPress: () => deleteEvent(event.id) }])} />)}</View> : <AcademicEmptyState title="Dia livre por enquanto" description="Que tal registrar uma aula, prova, exercício ou entrega?" actionLabel="Adicionar compromisso" onAction={() => setShowEventForm(true)} />}
          </AcademicSection>

          <AcademicSection eyebrow="PRÓXIMOS" title="No seu radar">
            {upcomingEvents.length ? <AcademicCard style={styles.radarCard}>{upcomingEvents.map((event, index) => <View key={event.id} style={[styles.radarRow, index < upcomingEvents.length - 1 && styles.radarRowDivider]}><View style={[styles.radarMark, { backgroundColor: `${event.color ?? eventColors[event.type]}18` }]}><Text>{event.emoji ?? eventEmojis[event.type]}</Text></View><View style={styles.radarCopy}><Text style={styles.radarTitle}>{event.title}</Text><Text style={styles.radarMeta}>{event.type} · {event.date}{event.time ? ` · ${event.time}` : ''}</Text></View></View>)}</AcademicCard> : <AcademicEmptyState title="Agenda sem pendências" description="Quando houver novos compromissos, eles aparecerão aqui." />}
          </AcademicSection>
        </View>
      </View>
    </ScrollView>
  </ScreenContainer>;
}

function Metric({ value, label, accent }: { value: string; label: string; accent: string }) {
  return <View style={styles.metric}><View style={[styles.metricLine, { backgroundColor: accent }]} /><Text style={styles.metricValue}>{value}</Text><Text style={styles.metricLabel}>{label}</Text></View>;
}

function TaskRow({ title, subtitle, priority, done, onToggle }: { title: string; subtitle: string; priority: 'Alta' | 'Média' | 'Baixa'; done: boolean; onToggle: () => void }) {
  const priorityColor = priority === 'Alta' ? '#F97316' : priority === 'Média' ? academicColors.info : '#D1D5DB';
  return <AcademicCard style={styles.taskRow}><TouchableOpacity accessibilityRole="checkbox" accessibilityState={{ checked: done }} accessibilityLabel={`Concluir ${title}`} onPress={onToggle} style={[styles.check, done && styles.checkDone]}><Text style={styles.checkText}>{done ? '✓' : ''}</Text></TouchableOpacity><View style={styles.taskCopy}><Text style={[styles.taskTitle, done && styles.doneText]}>{title}</Text><Text style={styles.taskMeta}>{subtitle}</Text></View><View accessibilityLabel={`Prioridade ${priority}`} style={styles.priorityIndicator}><View style={[styles.priorityDot, { backgroundColor: priorityColor }]} /><Text style={styles.priorityLabel}>{priority}</Text></View></AcademicCard>;
}

function SubjectCard({ subject, events, onOpen, onSave, onDelete }: { subject: Subject; events: AcademicEvent[]; onOpen: () => void; onSave: (changes: Partial<Subject>) => void; onDelete: () => void }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(subject.name);
  const [professor, setProfessor] = useState(subject.professor);
  const nextEvent = events.find(event => event.subjectId === subject.id && !event.done);
  return <AcademicCard style={styles.subjectCard} emphasis><View style={styles.subjectTop}><View style={[styles.subjectMark, { backgroundColor: `${subject.color}18` }]}><Text style={styles.subjectEmoji}>{subject.emoji}</Text></View><TouchableOpacity onPress={() => setEditing(value => !value)} accessibilityRole="button" accessibilityLabel={`Editar ${subject.name}`} style={styles.iconAction}><Text style={styles.iconActionText}>{editing ? 'Fechar' : 'Editar'}</Text></TouchableOpacity></View>{editing ? <View><TextInput value={name} onChangeText={setName} style={styles.inlineInput} placeholder="Matéria" placeholderTextColor={academicColors.muted} /><TextInput value={professor} onChangeText={setProfessor} style={styles.inlineInput} placeholder="Professor(a)" placeholderTextColor={academicColors.muted} /><View style={styles.subjectActions}><AcademicButton label="Salvar" compact onPress={() => { if (name.trim()) onSave({ name: name.trim(), professor: professor.trim() || 'Professor não informado' }); setEditing(false); }} /><TouchableOpacity onPress={onDelete} accessibilityRole="button" accessibilityLabel={`Excluir ${subject.name}`} style={styles.deleteAction}><Text style={styles.deleteActionText}>Excluir</Text></TouchableOpacity></View></View> : <TouchableOpacity onPress={onOpen} accessibilityRole="button" accessibilityLabel={`Abrir matéria ${subject.name}`} activeOpacity={0.76}><Text numberOfLines={2} style={styles.subjectName}>{subject.name}</Text><Text numberOfLines={1} style={styles.subjectProfessor}>{subject.professor}</Text><View style={styles.subjectFooter}>{nextEvent ? <View style={styles.nextActivity}><Text style={styles.nextLabel}>PRÓXIMA ATIVIDADE</Text><Text numberOfLines={1} style={styles.nextValue}>{nextEvent.title}</Text></View> : <Text style={styles.noActivity}>Sem compromisso vinculado</Text>}<IconSymbol name="chevron.right" size={18} color={subject.color} /></View></TouchableOpacity>}</AcademicCard>;
}

function EventRow({ event, onToggle, onDelete }: { event: AcademicEvent; onToggle: () => void; onDelete: () => void }) {
  const color = event.color ?? eventColors[event.type];
  return <AcademicCard style={styles.eventRow}><TouchableOpacity accessibilityRole="checkbox" accessibilityState={{ checked: event.done }} accessibilityLabel={`Concluir ${event.title}`} onPress={onToggle} style={[styles.check, event.done && { backgroundColor: color, borderColor: color }]}><Text style={styles.checkText}>{event.done ? '✓' : ''}</Text></TouchableOpacity><View style={[styles.eventAccent, { backgroundColor: color }]} /><View style={styles.eventCopy}><View style={styles.eventLabelRow}><AcademicPill label={event.type} tone={event.type === 'Prova' ? 'danger' : event.type === 'Exercício' ? 'success' : event.type === 'Teste' ? 'warning' : 'indigo'} /><Text style={styles.eventTime}>{event.time || 'Sem horário'}</Text></View><Text style={[styles.eventTitle, event.done && styles.doneText]}>{event.emoji ?? eventEmojis[event.type]}  {event.title}</Text></View><TouchableOpacity onPress={onDelete} accessibilityRole="button" accessibilityLabel={`Excluir ${event.title}`} style={styles.removeButton}><Text style={styles.removeText}>×</Text></TouchableOpacity></AcademicCard>;
}

function Legend({ color, label }: { color: string; label: string }) {
  return <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: color }]} /><Text style={styles.legendText}>{label}</Text></View>;
}

const styles = StyleSheet.create({
  avatar: { alignItems: 'center', backgroundColor: academicColors.violetSoft, borderColor: '#D8D0FF', borderRadius: 18, borderWidth: 1, height: 52, justifyContent: 'center', width: 52 },
  avatarText: { color: academicColors.violet, fontSize: 21, fontWeight: '900' },
  codeShortcut: { alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: '#DDE2EA', borderRadius: 14, borderWidth: 1, flexDirection: 'row', gap: 10, marginTop: 14, maxWidth: 430, padding: 11 },
  codeShortcutMark: { alignItems: 'center', backgroundColor: '#F0EEFF', borderRadius: 9, height: 32, justifyContent: 'center', width: 32 },
  codeShortcutMarkText: { color: academicColors.violet, fontSize: 16, fontWeight: '900' },
  codeShortcutCopy: { flex: 1 },
  codeShortcutTitle: { color: '#24324A', fontSize: 12, fontWeight: '800' },
  codeShortcutText: { color: '#687088', fontSize: 11, marginTop: 2 },
  codeShortcutArrow: { color: academicColors.indigo, fontSize: 22, fontWeight: '700' },
  calendarArrow: { alignItems: 'center', backgroundColor: '#F0F3FA', borderRadius: 10, height: 34, justifyContent: 'center', width: 34 },
  calendarArrowText: { color: academicColors.indigo, fontSize: 25, fontWeight: '500', lineHeight: 28 },
  calendarCard: { padding: 14 },
  calendarDot: { borderRadius: 10, height: 4, marginHorizontal: 1.5, width: 4 },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calendarLegend: { borderTopColor: academicColors.line, borderTopWidth: 1, flexDirection: 'row', gap: 12, marginTop: 10, paddingTop: 11 },
  calendarTop: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  check: { alignItems: 'center', borderColor: '#C9D0DF', borderRadius: 10, borderWidth: 2, height: 23, justifyContent: 'center', marginRight: 12, width: 23 },
  checkDone: { backgroundColor: academicColors.success, borderColor: academicColors.success },
  checkText: { color: '#FFFFFF', fontSize: 13, fontWeight: '900' },
  composer: { marginBottom: 13, padding: 15 },
  composerTitle: { color: academicColors.ink, fontSize: 15, fontWeight: '800', marginBottom: 12 },
  content: { paddingBottom: 118, paddingHorizontal: 18, paddingTop: 20 },
  contentWide: { alignSelf: 'center', maxWidth: 1240, paddingHorizontal: 28, width: '100%' },
  creatorCard: { alignItems: 'flex-start', backgroundColor: '#FFFFFF', borderColor: '#E3E7EE', borderRadius: 16, borderWidth: 1, flexDirection: 'row', gap: 12, padding: 15 },
  creatorMark: { alignItems: 'center', backgroundColor: '#F0EEFF', borderRadius: 12, height: 38, justifyContent: 'center', width: 38 },
  creatorMarkText: { color: academicColors.violet, fontSize: 20, fontWeight: '900' },
  creatorCopy: { flex: 1 },
  creatorKicker: { color: academicColors.violet, fontSize: 10, fontWeight: '900', letterSpacing: 1.1 },
  creatorTitle: { color: '#172033', fontSize: 16, fontWeight: '900', marginTop: 4 },
  creatorText: { color: '#687088', fontSize: 12, lineHeight: 18, marginTop: 4, maxWidth: 760 },
  creatorActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 },
  creatorAbout: { paddingVertical: 4 },
  creatorAboutText: { color: '#3346A8', fontSize: 12, fontWeight: '800' },
  creatorContact: { backgroundColor: '#F0EEFF', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7 },
  creatorContactText: { color: '#5B3CC4', fontSize: 12, fontWeight: '800' },
  moodleHomeCard: { alignItems: 'flex-start', backgroundColor: '#EEF2FF', borderColor: '#D9DEFF', borderRadius: 16, borderWidth: 1, flexDirection: 'row', gap: 12, marginBottom: 20, padding: 15 },
  moodleHomeMark: { alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 12, height: 42, justifyContent: 'center', width: 42 },
  moodleHomeMarkText: { color: '#3346A8', fontSize: 24, fontWeight: '900' },
  moodleHomeCopy: { flex: 1 },
  moodleHomeKicker: { color: '#3346A8', fontSize: 10, fontWeight: '900', letterSpacing: 0.9 },
  moodleHomeTitle: { color: '#17213B', fontSize: 16, fontWeight: '900', marginTop: 3 },
  moodleHomeText: { color: '#566078', fontSize: 12, lineHeight: 18, marginTop: 4 },
  moodleHomeButton: { alignItems: 'center', backgroundColor: '#3346A8', borderRadius: 9, flexDirection: 'row', gap: 8, marginTop: 11, paddingHorizontal: 12, paddingVertical: 9 },
  moodleHomeButtonArrow: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
  moodleHomeButtonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '900' },
  dayCell: { alignItems: 'center', borderRadius: 12, height: 47, justifyContent: 'center', marginBottom: 2, width: '14.2857%' },
  daySelected: { backgroundColor: academicColors.indigo },
  dayText: { color: academicColors.ink, fontSize: 13, fontWeight: '700' },
  dayTextSelected: { color: '#FFFFFF' },
  dayToday: { backgroundColor: academicColors.violetSoft },
  deleteAction: { justifyContent: 'center', minHeight: 38, paddingHorizontal: 10 },
  deleteActionText: { color: academicColors.danger, fontSize: 13, fontWeight: '800' },
  doneText: { color: academicColors.muted, textDecorationLine: 'line-through' },
  dotRow: { flexDirection: 'row', height: 7, justifyContent: 'center', marginTop: 2 },
  eventAccent: { alignSelf: 'stretch', borderRadius: 4, marginRight: 10, width: 4 },
  eventCopy: { flex: 1 },
  eventLabelRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  eventRow: { alignItems: 'center', flexDirection: 'row', padding: 13 },
  eventStack: { gap: 9 },
  eventTime: { color: academicColors.muted, fontSize: 12, fontWeight: '700', marginLeft: 8 },
  eventTitle: { color: academicColors.ink, fontSize: 14, fontWeight: '800', lineHeight: 20 },
  greeting: { color: academicColors.ink, fontSize: 31, fontWeight: '900', letterSpacing: -0.9, lineHeight: 38, marginTop: 4 },
  header: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 22 },
  headerCopy: { flex: 1, paddingRight: 18 },
  heroCaption: { color: academicColors.muted, fontSize: 12, fontWeight: '600', marginTop: 11 },
  heroLabel: { color: academicColors.violet, fontSize: 11, fontWeight: '900', letterSpacing: 0.7 },
  heroMark: { alignItems: 'center', backgroundColor: academicColors.violetSoft, borderRadius: 14, height: 42, justifyContent: 'center', width: 42 },
  heroMarkText: { color: academicColors.violet, fontSize: 22, fontWeight: '800' },
  heroNumber: { color: academicColors.ink, fontSize: 42, fontWeight: '900', letterSpacing: -1.5, lineHeight: 48, marginTop: 2 },
  heroRow: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 17 },
  iconAction: { minHeight: 32, paddingLeft: 10 },
  iconActionText: { color: academicColors.indigo, fontSize: 12, fontWeight: '800' },
  inlineInput: { backgroundColor: '#F9FAFE', borderColor: academicColors.line, borderRadius: 10, borderWidth: 1, color: academicColors.ink, fontSize: 14, marginBottom: 8, minHeight: 42, paddingHorizontal: 11 },
  input: { backgroundColor: '#F9FAFE', borderColor: academicColors.line, borderRadius: 11, borderWidth: 1, color: academicColors.ink, fontSize: 14, marginBottom: 10, minHeight: 45, paddingHorizontal: 12 },
  legendDot: { borderRadius: 4, height: 7, width: 7 },
  legendItem: { alignItems: 'center', flexDirection: 'row', gap: 5 },
  legendText: { color: academicColors.muted, fontSize: 10, fontWeight: '700' },
  metric: { backgroundColor: academicColors.surface, borderBottomColor: academicColors.line, borderBottomWidth: 1, flex: 1, minHeight: 76, overflow: 'hidden', paddingHorizontal: 13, paddingVertical: 10 },
  metricGrid: { flex: 1, flexDirection: 'row', gap: 9, justifyContent: 'space-between' },
  metricLabel: { color: academicColors.muted, fontSize: 11, fontWeight: '700', marginTop: 2 },
  metricLine: { backgroundColor: academicColors.violet, bottom: 0, height: 3, left: 0, position: 'absolute', right: 0 },
  metricValue: { color: academicColors.ink, fontSize: 24, fontWeight: '900', letterSpacing: -0.5, lineHeight: 30 },
  monthTitle: { color: academicColors.ink, fontSize: 15, fontWeight: '800' },
  nextActivity: { flex: 1 },
  nextLabel: { color: academicColors.muted, fontSize: 9, fontWeight: '900', letterSpacing: 0.7 },
  nextValue: { color: academicColors.ink, fontSize: 12, fontWeight: '700', marginTop: 3 },
  noActivity: { color: academicColors.muted, flex: 1, fontSize: 12 },
  noteCopy: { flex: 1, paddingRight: 8 },
  noteIcon: { alignItems: 'center', backgroundColor: '#E8EBFF', borderRadius: 11, height: 38, justifyContent: 'center', marginRight: 11, width: 38 },
  noteMeta: { color: academicColors.muted, fontSize: 11, marginTop: 3 },
  noteRow: { alignItems: 'center', borderBottomColor: academicColors.line, borderBottomWidth: 1, flexDirection: 'row', minHeight: 65, paddingVertical: 10 },
  noteTitle: { color: academicColors.ink, fontSize: 14, fontWeight: '800' },
  notesPanel: { backgroundColor: 'transparent', paddingHorizontal: 0 },
  overline: { color: academicColors.violet, fontSize: 11, fontWeight: '900', letterSpacing: 0.9 },
  overviewGrid: { gap: 12, marginBottom: 28 },
  overviewGridTablet: { alignItems: 'stretch', flexDirection: 'row' },
  primaryColumn: { flex: 1 },
  priorityDot: { borderRadius: 99, height: 9, marginRight: 6, width: 9 },
  priorityIndicator: { alignItems: 'center', flexDirection: 'row', marginLeft: 8 },
  priorityLabel: { color: academicColors.muted, fontSize: 11, fontWeight: '800' },
  progressHero: { backgroundColor: academicColors.surface, borderColor: academicColors.line, borderRadius: 16, borderWidth: 1, flex: 1.08, minHeight: 154, padding: 19 },
  radarCard: { paddingVertical: 4 },
  radarCopy: { flex: 1 },
  radarMark: { alignItems: 'center', borderRadius: 11, height: 36, justifyContent: 'center', marginRight: 10, width: 36 },
  radarMeta: { color: academicColors.muted, fontSize: 11, marginTop: 3 },
  radarRow: { alignItems: 'center', flexDirection: 'row', paddingVertical: 10 },
  radarRowDivider: { borderBottomColor: academicColors.line, borderBottomWidth: 1 },
  radarTitle: { color: academicColors.ink, fontSize: 13, fontWeight: '800' },
  removeButton: { alignItems: 'center', height: 34, justifyContent: 'center', marginLeft: 5, width: 28 },
  removeText: { color: academicColors.danger, fontSize: 23, fontWeight: '400' },
  screen: { backgroundColor: academicColors.canvas },
  secondaryColumn: { flex: 1 },
  splitGrid: { gap: 26 },
  splitGridTablet: { alignItems: 'flex-start', flexDirection: 'row' },
  subjectActions: { alignItems: 'center', flexDirection: 'row', marginTop: 2 },
  subjectCard: { flexGrow: 1, minWidth: 220, padding: 15, width: '48%' },
  subjectEmoji: { fontSize: 19 },
  subjectFooter: { alignItems: 'flex-end', borderTopColor: academicColors.line, borderTopWidth: 1, flexDirection: 'row', marginTop: 14, paddingTop: 10 },
  subjectGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 11 },
  subjectMark: { alignItems: 'center', borderRadius: 12, height: 40, justifyContent: 'center', width: 40 },
  subjectName: { color: academicColors.ink, fontSize: 15, fontWeight: '900', lineHeight: 21, marginTop: 14, minHeight: 42 },
  subjectProfessor: { color: academicColors.muted, fontSize: 12, marginTop: 4 },
  subjectTop: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  subtitle: { color: academicColors.muted, fontSize: 14, lineHeight: 20, marginTop: 7, maxWidth: 560 },
  taskCopy: { flex: 1, paddingRight: 8 },
  taskMeta: { color: academicColors.muted, fontSize: 12, marginTop: 3 },
  taskRow: { alignItems: 'center', flexDirection: 'row', minHeight: 72, padding: 14 },
  taskStack: { gap: 9 },
  taskTitle: { color: academicColors.ink, fontSize: 14, fontWeight: '800', lineHeight: 20 },
  typeChip: { backgroundColor: '#F5F7FC', borderColor: academicColors.line, borderRadius: 999, borderWidth: 1, minHeight: 33, justifyContent: 'center', marginRight: 7, paddingHorizontal: 11 },
  typeChipText: { color: academicColors.muted, fontSize: 12, fontWeight: '800' },
  typeScroller: { paddingBottom: 10 },
  weekday: { color: academicColors.muted, flex: 1, fontSize: 11, fontWeight: '900', textAlign: 'center' },
  weekdayRow: { flexDirection: 'row', marginBottom: 7 },
});
