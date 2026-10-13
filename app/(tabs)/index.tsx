import { useMemo, useState, type ComponentProps } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { router } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { NEON_LAYOUT, neonFabClearance } from '@/components/neon/nav-items';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { AcademicButton, AcademicCard, AcademicEmptyState, AcademicPill, AcademicProgress, AcademicSection, NeonGradient, useAcademicColors } from '@/components/academic/design-system';
import { cardShadow, hexToRgba, neonRadius, neonType } from '@/lib/theme-runtime';
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
  const insets = useSafeAreaInsets();
  /**
   * A pílula da bottom nav é flutuante: esta tela não reserva o edge de baixo.
   * Pior: o FAB da Cris paira 16 px acima da pílula e cobria o último card do
   * radar ("Prova parcial de banco"). Por isso a folga é a altura do FAB
   * (`neonFabClearance` = 152 px no celular / 180 no desktop), + 8 px de respiro
   * + o inset de baixo do aparelho — `neonNavClearance` (100/124) cobria só a
   * pílula e deixava ~52 px de sobreposição.
   */
  const navClearance = neonFabClearance(width >= NEON_LAYOUT.breakpoint) + insets.bottom + 8;
  const { subjects, events, goals, notes, addSubject, updateSubject, deleteSubject, addEvent, toggleEvent, deleteEvent, toggleTask } = useStudy();
  const c = useAcademicColors();
  const styles = useMemo(() => createStyles(c), [c]);
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
  const weekEvents = useMemo(() => {
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay());
    const week = Array.from({ length: 7 }, (_, index) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + index));
    return events.filter(event => !event.done && week.some(date => eventMatchesPoint(event, { day: date.getDate(), month: date.getMonth(), year: date.getFullYear() }, today)));
  }, [events, today]);
  const nextGoalTitle = openTasks[0]?.goalTitle ?? 'Nenhuma tarefa pendente';
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
    addSubject(subjectName.trim(), professor.trim() || 'Professor não informado', '✦', c.indigo);
    setSubjectName(''); setProfessor(''); setShowSubjectForm(false);
  };
  const addEventFromForm = () => {
    if (!eventTitle.trim()) return;
    const dateLabel = `${String(selectedPoint.day).padStart(2, '0')} ${new Date(selectedPoint.year, selectedPoint.month).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}`;
    addEvent({ title: eventTitle.trim(), date: dateLabel, time: eventTime.trim(), type: eventType, emoji: eventEmojis[eventType], color: eventColors[eventType] });
    setEventTitle(''); setEventTime(''); setShowEventForm(false);
  };

  return <ScreenContainer className="bg-transparent" containerClassName="bg-transparent" style={styles.screen}>
    <ScrollView style={styles.scroll} contentContainerStyle={[styles.content, tablet && styles.contentWide, { paddingBottom: navClearance }]}>
      <View style={[styles.heroShadow, cardShadow('floating')]}>
        <NeonGradient name="hero" style={styles.hero}>
          <View style={styles.heroCopy}>
            <Text style={styles.overline}>RESUMO DO DIA</Text>
            <Text style={styles.heroTitle}>Tudo pronto para brilhar! ✨</Text>
            <Text style={styles.heroText}>Seu espaço de estudos está organizado e esperando por você.</Text>
          </View>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Abrir perfil" onPress={() => router.push('/profile')} activeOpacity={0.78} style={styles.avatar}><Text style={styles.avatarText}>C</Text></TouchableOpacity>
        </NeonGradient>
      </View>

      <View style={[styles.twoCol, tablet && styles.twoColTablet]}>
        <AcademicCard style={styles.columnCard}>
          <View style={styles.cardHead}>
            <Text style={styles.cardTitle}>📘 Seu Progresso</Text>
            <TouchableOpacity onPress={() => router.push('/planning')} accessibilityRole="button" accessibilityLabel="Ver plano" style={styles.textAction}><Text style={styles.textLink}>Ver plano →</Text></TouchableOpacity>
          </View>
          <Text style={styles.progressHint}>Continue de onde parou:</Text>
          <Text style={styles.progressNext}>{nextGoalTitle}</Text>
          <AcademicProgress height={9} value={progress} />
          <Text style={styles.progressCaption}>{completedTasks} de {allTasks.length} tarefas concluídas — {progress}% do plano.</Text>
          <AcademicButton compact label="Continuar estudo →" onPress={() => router.push('/planning')} style={styles.progressButton} />
        </AcademicCard>

        <AcademicCard style={styles.columnCard}>
          <View style={styles.cardHead}><Text style={styles.cardTitle}>⚡ Acesso Rápido</Text></View>
          <QuickAction icon="note.text" label="Abrir editor de anotações" onPress={() => router.push('/editor')} styles={styles} />
          <QuickAction icon="book.fill" label="Ver materiais salvos" onPress={() => router.push('/library')} styles={styles} />
          <QuickAction icon="bubble.left.and.bubble.right.fill" label="Retomar conversa" onPress={() => router.push('/chat')} styles={styles} />
          <QuickAction icon="square.and.arrow.down" label="Trazer conteúdos do Moodle" onPress={() => router.push({ pathname: '/settings', params: { section: 'connections' } })} styles={styles} />
          <QuickAction icon="gearshape.fill" label="Personalizar o app" last onPress={() => router.push('/settings')} styles={styles} />
        </AcademicCard>
      </View>

      <View style={styles.statRow}>
        <StatCard emoji="📖" label="Materiais" styles={styles} value={String(notes.length)} />
        <StatCard emoji="⏱" label="Esta semana" styles={styles} value={String(weekEvents.length)} />
        <StatCard emoji="✅" label="Concluídas" styles={styles} value={String(completedTasks)} />
      </View>

      <View style={[styles.splitGrid, tablet && styles.splitGridTablet]}>
        <View style={styles.primaryColumn}>
          <AcademicSection eyebrow="AGORA" title="Seu próximo passo" actionLabel="Ver planejamento" onAction={() => router.push('/planning')}>
            {openTasks.length ? <View style={styles.taskStack}>{openTasks.slice(0, 3).map(task => <TaskRow key={task.id} title={task.title} subtitle={task.goalTitle} priority={task.priority} done={task.done} onToggle={() => toggleTask(task.goalId, task.id)} styles={styles} />)}</View> : <AcademicEmptyState title="Nenhuma tarefa pendente" description="Seu plano está livre por enquanto. Que tal planejar o próximo passo?" actionLabel="Criar meta" onAction={() => router.push('/planning')} />}
          </AcademicSection>

          <AcademicSection eyebrow="MATÉRIAS" title="Sua faculdade" actionLabel={showSubjectForm ? 'Fechar' : '+ Nova matéria'} onAction={() => setShowSubjectForm(value => !value)}>
            {showSubjectForm ? <AcademicCard style={styles.composer}><Text style={styles.composerTitle}>Adicionar matéria</Text><TextInput value={subjectName} onChangeText={setSubjectName} placeholder="Nome da matéria" placeholderTextColor={c.muted} style={styles.input} /><TextInput value={professor} onChangeText={setProfessor} placeholder="Professor(a)" placeholderTextColor={c.muted} style={styles.input} /><AcademicButton label="Salvar matéria" onPress={addSubjectFromForm} compact /></AcademicCard> : null}
            {subjects.length ? <View style={styles.subjectGrid}>{subjects.map(subject => <SubjectCard key={subject.id} subject={subject} events={events} onOpen={() => router.push({ pathname: '/subject', params: { id: subject.id } })} onSave={changes => updateSubject(subject.id, changes)} onDelete={() => Alert.alert('Excluir matéria?', 'Os eventos já registrados continuarão na sua agenda.', [{ text: 'Cancelar', style: 'cancel' }, { text: 'Excluir', style: 'destructive', onPress: () => deleteSubject(subject.id) }])} styles={styles} />)}</View> : <AcademicEmptyState title="Ainda não há matérias" description="Crie sua primeira matéria para começar a organizar sua faculdade." actionLabel="Nova matéria" onAction={() => setShowSubjectForm(true)} />}
          </AcademicSection>

          <AcademicSection eyebrow="ESCRITA" title="Continue escrevendo" actionLabel="Abrir documentos" onAction={() => router.push('/editor')}>
            {notes.length ? <View style={styles.notesPanel}>{notes.slice(0, 3).map(note => <TouchableOpacity key={note.id} onPress={() => router.push({ pathname: '/document', params: { id: note.id } })} accessibilityRole="button" accessibilityLabel={`Abrir ${note.title}`} activeOpacity={0.76} style={styles.noteRow}><View style={styles.noteIcon}><IconSymbol name="note.text" size={18} color={c.indigo} /></View><View style={styles.noteCopy}><Text numberOfLines={1} style={styles.noteTitle}>{note.title}</Text><Text numberOfLines={1} style={styles.noteMeta}>{note.folder} · {note.updatedAt}</Text></View><IconSymbol name="chevron.right" size={18} color={c.muted} /></TouchableOpacity>)}</View> : <AcademicEmptyState title="Sua mesa de escrita está vazia" description="Crie uma nota, resumo ou documento acadêmico para continuar." actionLabel="Novo documento" onAction={() => router.push('/editor')} />}
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
              <View style={styles.calendarLegend}><Legend color={eventColors.Aula} label="Aula" styles={styles} /><Legend color={eventColors.Prova} label="Prova" styles={styles} /><Legend color={eventColors.Exercício} label="Exercício" styles={styles} /></View>
            </AcademicCard>
          </AcademicSection>

          <AcademicSection title={`Agenda · ${String(selectedPoint.day).padStart(2, '0')}`} actionLabel={showEventForm ? 'Fechar' : '+ Compromisso'} onAction={() => setShowEventForm(value => !value)}>
            {showEventForm ? <AcademicCard style={styles.composer}><Text style={styles.composerTitle}>Adicionar compromisso</Text><TextInput value={eventTitle} onChangeText={setEventTitle} placeholder="Ex.: Entregar exercício" placeholderTextColor={c.muted} style={styles.input} /><TextInput value={eventTime} onChangeText={setEventTime} placeholder="Horário (opcional)" placeholderTextColor={c.muted} style={styles.input} /><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.typeScroller}>{eventTypes.map(type => <TouchableOpacity key={type} onPress={() => setEventType(type)} accessibilityRole="button" accessibilityLabel={`Tipo ${type}`} style={[styles.typeChip, eventType === type && { backgroundColor: eventColors[type], borderColor: eventColors[type] }]}><Text style={[styles.typeChipText, eventType === type && { color: '#FFFFFF' }]}>{type}</Text></TouchableOpacity>)}</ScrollView><AcademicButton label="Adicionar à agenda" onPress={addEventFromForm} compact /></AcademicCard> : null}
            {selectedEvents.length ? <View style={styles.eventStack}>{selectedEvents.map(event => <EventRow key={event.id} event={event} onToggle={() => toggleEvent(event.id)} onDelete={() => Alert.alert('Excluir compromisso?', 'Remover este item da agenda?', [{ text: 'Cancelar', style: 'cancel' }, { text: 'Excluir', style: 'destructive', onPress: () => deleteEvent(event.id) }])} styles={styles} />)}</View> : <AcademicEmptyState title="Dia livre por enquanto" description="Que tal registrar uma aula, prova, exercício ou entrega?" actionLabel="Adicionar compromisso" onAction={() => setShowEventForm(true)} />}
          </AcademicSection>

          <AcademicSection eyebrow="PRÓXIMOS" title="No seu radar">
            {upcomingEvents.length ? <AcademicCard style={styles.radarCard}>{upcomingEvents.map((event, index) => <View key={event.id} style={[styles.radarRow, index < upcomingEvents.length - 1 && styles.radarRowDivider]}><View style={[styles.radarMark, { backgroundColor: `${event.color ?? eventColors[event.type]}18` }]}><Text>{event.emoji ?? eventEmojis[event.type]}</Text></View><View style={styles.radarCopy}><Text style={styles.radarTitle}>{event.title}</Text><Text style={styles.radarMeta}>{event.type} · {event.date}{event.time ? ` · ${event.time}` : ''}</Text></View></View>)}</AcademicCard> : <AcademicEmptyState title="Agenda sem pendências" description="Quando houver novos compromissos, eles aparecerão aqui." />}
          </AcademicSection>
        </View>
      </View>
    </ScrollView>
  </ScreenContainer>;
}

function StatCard({ emoji, label, styles, value }: { emoji: string; label: string; styles: HomeStyles; value: string }) {
  return <AcademicCard style={styles.statCard}><Text style={styles.statEmoji}>{emoji}</Text><Text style={styles.statValue}>{value}</Text><Text style={styles.statLabel}>{label}</Text></AcademicCard>;
}

function QuickAction({ icon, label, last = false, onPress, styles }: { icon: ComponentProps<typeof IconSymbol>['name']; label: string; last?: boolean; onPress: () => void; styles: HomeStyles }) {
  const c = useAcademicColors();
  return <TouchableOpacity onPress={onPress} accessibilityRole="button" accessibilityLabel={label} activeOpacity={0.78} style={[styles.quickAction, last && styles.quickActionLast]}><IconSymbol name={icon} size={17} color={c.primary} /><Text numberOfLines={1} style={styles.quickActionText}>{label}</Text><Text style={styles.quickActionArrow}>→</Text></TouchableOpacity>;
}

function TaskRow({ title, subtitle, priority, done, onToggle, styles }: { title: string; subtitle: string; priority: 'Alta' | 'Média' | 'Baixa'; done: boolean; onToggle: () => void; styles: HomeStyles }) {
  const c = useAcademicColors();
  const priorityColor = priority === 'Alta' ? c.danger : priority === 'Média' ? c.gold : c.muted;
  return <AcademicCard style={styles.taskRow}><TouchableOpacity accessibilityRole="checkbox" accessibilityState={{ checked: done }} accessibilityLabel={`Concluir ${title}`} onPress={onToggle} style={[styles.check, done && styles.checkDone]}><Text style={styles.checkText}>{done ? '✓' : ''}</Text></TouchableOpacity><View style={styles.taskCopy}><Text style={[styles.taskTitle, done && styles.doneText]}>{title}</Text><Text style={styles.taskMeta}>{subtitle}</Text></View><View accessibilityLabel={`Prioridade ${priority}`} style={styles.priorityIndicator}><View style={[styles.priorityDot, { backgroundColor: priorityColor }]} /><Text style={styles.priorityLabel}>{priority}</Text></View></AcademicCard>;
}

function SubjectCard({ subject, events, onOpen, onSave, onDelete, styles }: { subject: Subject; events: AcademicEvent[]; onOpen: () => void; onSave: (changes: Partial<Subject>) => void; onDelete: () => void; styles: HomeStyles }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(subject.name);
  const [professor, setProfessor] = useState(subject.professor);
  const c = useAcademicColors();
  const nextEvent = events.find(event => event.subjectId === subject.id && !event.done);
  return <AcademicCard style={styles.subjectCard} emphasis><View style={styles.subjectTop}><View style={[styles.subjectMark, { backgroundColor: `${subject.color}18` }]}><Text style={styles.subjectEmoji}>{subject.emoji}</Text></View><TouchableOpacity onPress={() => setEditing(value => !value)} accessibilityRole="button" accessibilityLabel={`Editar ${subject.name}`} style={styles.iconAction}><Text style={styles.iconActionText}>{editing ? 'Fechar' : 'Editar'}</Text></TouchableOpacity></View>{editing ? <View><TextInput value={name} onChangeText={setName} style={styles.inlineInput} placeholder="Matéria" placeholderTextColor={c.muted} /><TextInput value={professor} onChangeText={setProfessor} style={styles.inlineInput} placeholder="Professor(a)" placeholderTextColor={c.muted} /><View style={styles.subjectActions}><AcademicButton label="Salvar" compact onPress={() => { if (name.trim()) onSave({ name: name.trim(), professor: professor.trim() || 'Professor não informado' }); setEditing(false); }} /><TouchableOpacity onPress={onDelete} accessibilityRole="button" accessibilityLabel={`Excluir ${subject.name}`} style={styles.deleteAction}><Text style={styles.deleteActionText}>Excluir</Text></TouchableOpacity></View></View> : <TouchableOpacity onPress={onOpen} accessibilityRole="button" accessibilityLabel={`Abrir matéria ${subject.name}`} activeOpacity={0.76}><Text numberOfLines={2} style={styles.subjectName}>{subject.name}</Text><Text numberOfLines={1} style={styles.subjectProfessor}>{subject.professor}</Text><View style={styles.subjectFooter}>{nextEvent ? <View style={styles.nextActivity}><Text style={styles.nextLabel}>PRÓXIMA ATIVIDADE</Text><Text numberOfLines={1} style={styles.nextValue}>{nextEvent.title}</Text></View> : <Text style={styles.noActivity}>Sem compromisso vinculado</Text>}<IconSymbol name="chevron.right" size={18} color={subject.color} /></View></TouchableOpacity>}</AcademicCard>;
}

function EventRow({ event, onToggle, onDelete, styles }: { event: AcademicEvent; onToggle: () => void; onDelete: () => void; styles: HomeStyles }) {
  const color = event.color ?? eventColors[event.type];
  return <AcademicCard style={styles.eventRow}><TouchableOpacity accessibilityRole="checkbox" accessibilityState={{ checked: event.done }} accessibilityLabel={`Concluir ${event.title}`} onPress={onToggle} style={[styles.check, event.done && { backgroundColor: color, borderColor: color }]}><Text style={styles.checkText}>{event.done ? '✓' : ''}</Text></TouchableOpacity><View style={[styles.eventAccent, { backgroundColor: color }]} /><View style={styles.eventCopy}><View style={styles.eventLabelRow}><AcademicPill label={event.type} tone={event.type === 'Prova' ? 'danger' : event.type === 'Exercício' ? 'success' : event.type === 'Teste' ? 'warning' : 'indigo'} /><Text style={styles.eventTime}>{event.time || 'Sem horário'}</Text></View><Text style={[styles.eventTitle, event.done && styles.doneText]}>{event.emoji ?? eventEmojis[event.type]}  {event.title}</Text></View><TouchableOpacity onPress={onDelete} accessibilityRole="button" accessibilityLabel={`Excluir ${event.title}`} style={styles.removeButton}><Text style={styles.removeText}>×</Text></TouchableOpacity></AcademicCard>;
}

function Legend({ color, label, styles }: { color: string; label: string; styles: HomeStyles }) {
  return <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: color }]} /><Text style={styles.legendText}>{label}</Text></View>;
}

type HomePalette = ReturnType<typeof useAcademicColors>;
type HomeStyles = ReturnType<typeof createStyles>;

/**
 * Estilos da Home derivados do tema ATIVO (Etapa 3 — tela "Hoje" do mockup).
 * O parâmetro `c` expõe os mesmos nomes de `academicColors`, porém resolvidos pelo
 * tema em uso: antes desta etapa a tela usava a paleta clara fixa, o que deixava
 * texto escuro sobre os cards escuros do tema Neon e criava a faixa branca de fundo.
 */
function createStyles(c: HomePalette) {
  return StyleSheet.create({
    avatar: { alignItems: 'center', backgroundColor: hexToRgba(c.violet, 0.16), borderColor: hexToRgba(c.violet, 0.32), borderRadius: 18, borderWidth: 1, height: 52, justifyContent: 'center', width: 52 },
    avatarText: { color: c.violet, fontSize: 21, fontWeight: '900' },
    calendarArrow: { alignItems: 'center', backgroundColor: hexToRgba(c.muted, 0.14), borderRadius: 10, height: 34, justifyContent: 'center', width: 34 },
    calendarArrowText: { color: c.primary, fontSize: 25, fontWeight: '500', lineHeight: 28 },
    calendarCard: { padding: 14 },
    calendarDot: { borderRadius: 10, height: 4, marginHorizontal: 1.5, width: 4 },
    calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' },
    calendarLegend: { borderTopColor: c.line, borderTopWidth: 1, flexDirection: 'row', gap: 12, marginTop: 10, paddingTop: 11 },
    calendarTop: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
    cardHead: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
    cardTitle: { color: c.ink, fontSize: neonType.cardTitle.size, fontWeight: neonType.cardTitle.weight },
    check: { alignItems: 'center', borderColor: c.line, borderRadius: 10, borderWidth: 2, height: 23, justifyContent: 'center', marginRight: 12, width: 23 },
    checkDone: { backgroundColor: c.success, borderColor: c.success },
    checkText: { color: c.onPrimary, fontSize: 13, fontWeight: '900' },
    columnCard: { flex: 1 },
    composer: { marginBottom: 13, padding: 15 },
    composerTitle: { color: c.ink, fontSize: 15, fontWeight: '800', marginBottom: 12 },
    content: { backgroundColor: 'transparent', paddingHorizontal: 18, paddingTop: 20 },
    contentWide: { alignSelf: 'center', maxWidth: 1240, paddingHorizontal: 28, width: '100%' },
    dayCell: { alignItems: 'center', borderRadius: 12, height: 47, justifyContent: 'center', marginBottom: 2, width: '14.2857%' },
    daySelected: { backgroundColor: c.primary },
    dayText: { color: c.ink, fontSize: 13, fontWeight: '700' },
    dayTextSelected: { color: c.onPrimary },
    dayToday: { backgroundColor: hexToRgba(c.violet, 0.16) },
    deleteAction: { justifyContent: 'center', minHeight: 38, paddingHorizontal: 10 },
    deleteActionText: { color: c.danger, fontSize: 13, fontWeight: '800' },
    doneText: { color: c.muted, textDecorationLine: 'line-through' },
    dotRow: { flexDirection: 'row', height: 7, justifyContent: 'center', marginTop: 2 },
    eventAccent: { alignSelf: 'stretch', borderRadius: 4, marginRight: 10, width: 4 },
    eventCopy: { flex: 1 },
    eventLabelRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
    eventRow: { alignItems: 'center', flexDirection: 'row', padding: 13 },
    eventStack: { gap: 9 },
    eventTime: { color: c.muted, fontSize: 12, fontWeight: '700', marginLeft: 8 },
    eventTitle: { color: c.ink, fontSize: 14, fontWeight: '800', lineHeight: 20 },
    hero: { alignItems: 'flex-start', borderColor: c.line, borderRadius: neonRadius.card, borderWidth: 1, flexDirection: 'row', gap: 12, overflow: 'hidden', padding: 19 },
    heroCopy: { flex: 1 },
    heroShadow: { borderRadius: neonRadius.card, marginBottom: 20 },
    heroText: { color: c.muted, fontSize: 13, lineHeight: 19, marginTop: 6 },
    heroTitle: { color: c.ink, fontSize: 23, fontWeight: '900', letterSpacing: -0.6, lineHeight: 29, marginTop: 4 },
    iconAction: { minHeight: 32, paddingLeft: 10 },
    iconActionText: { color: c.primary, fontSize: 12, fontWeight: '800' },
    inlineInput: { backgroundColor: hexToRgba(c.surfaceAlt, 0.92), borderColor: c.line, borderRadius: 10, borderWidth: 1, color: c.ink, fontSize: 14, marginBottom: 8, minHeight: 42, paddingHorizontal: 11 },
    input: { backgroundColor: hexToRgba(c.surfaceAlt, 0.92), borderColor: c.line, borderRadius: 11, borderWidth: 1, color: c.ink, fontSize: 14, marginBottom: 10, minHeight: 45, paddingHorizontal: 12 },
    legendDot: { borderRadius: 4, height: 7, width: 7 },
    legendItem: { alignItems: 'center', flexDirection: 'row', gap: 5 },
    legendText: { color: c.muted, fontSize: 10, fontWeight: '700' },
    monthTitle: { color: c.ink, fontSize: 15, fontWeight: '800' },
    nextActivity: { flex: 1 },
    nextLabel: { color: c.muted, fontSize: 9, fontWeight: '900', letterSpacing: 0.7 },
    nextValue: { color: c.ink, fontSize: 12, fontWeight: '700', marginTop: 3 },
    noActivity: { color: c.muted, flex: 1, fontSize: 12 },
    noteCopy: { flex: 1, paddingRight: 8 },
    noteIcon: { alignItems: 'center', backgroundColor: hexToRgba(c.violet, 0.16), borderRadius: 11, height: 38, justifyContent: 'center', marginRight: 11, width: 38 },
    noteMeta: { color: c.muted, fontSize: 11, marginTop: 3 },
    noteRow: { alignItems: 'center', borderBottomColor: c.line, borderBottomWidth: 1, flexDirection: 'row', minHeight: 65, paddingVertical: 10 },
    noteTitle: { color: c.ink, fontSize: 14, fontWeight: '800' },
    notesPanel: { backgroundColor: 'transparent', paddingHorizontal: 0 },
    overline: { color: c.primary, fontSize: neonType.eyebrow.size, fontWeight: '800', letterSpacing: neonType.eyebrow.letterSpacing },
    primaryColumn: { flex: 1 },
    priorityDot: { borderRadius: 99, height: 9, marginRight: 6, width: 9 },
    priorityIndicator: { alignItems: 'center', flexDirection: 'row', marginLeft: 8 },
    priorityLabel: { color: c.muted, fontSize: 11, fontWeight: '800' },
    progressButton: { marginTop: 14 },
    progressCaption: { color: c.muted, fontSize: 12, fontWeight: '600', marginTop: 10 },
    progressHint: { color: c.muted, fontSize: 13 },
    progressNext: { color: c.ink, fontSize: 14, fontWeight: '800', marginBottom: 10, marginTop: 3 },
    quickAction: { alignItems: 'center', borderBottomColor: c.line, borderBottomWidth: 1, flexDirection: 'row', gap: 10, minHeight: 44, paddingVertical: 8 },
    quickActionArrow: { color: c.primary, fontSize: 15, fontWeight: '800' },
    quickActionLast: { borderBottomWidth: 0 },
    quickActionText: { color: c.primary, flex: 1, fontSize: 13, fontWeight: '700' },
    radarCard: { paddingVertical: 4 },
    radarCopy: { flex: 1 },
    radarMark: { alignItems: 'center', borderRadius: 11, height: 36, justifyContent: 'center', marginRight: 10, width: 36 },
    radarMeta: { color: c.muted, fontSize: 11, marginTop: 3 },
    radarRow: { alignItems: 'center', flexDirection: 'row', paddingVertical: 10 },
    radarRowDivider: { borderBottomColor: c.line, borderBottomWidth: 1 },
    radarTitle: { color: c.ink, fontSize: 13, fontWeight: '800' },
    removeButton: { alignItems: 'center', height: 34, justifyContent: 'center', marginLeft: 5, width: 28 },
    removeText: { color: c.danger, fontSize: 23, fontWeight: '400' },
    screen: { backgroundColor: 'transparent' },
    scroll: { backgroundColor: 'transparent', flex: 1 },
    secondaryColumn: { flex: 1 },
    splitGrid: { gap: 26 },
    splitGridTablet: { alignItems: 'flex-start', flexDirection: 'row' },
    statCard: { alignItems: 'center', flex: 1 },
    statEmoji: { fontSize: 26 },
    statLabel: { color: c.muted, fontSize: 12, marginTop: 3, textAlign: 'center' },
    statRow: { flexDirection: 'row', gap: 15, marginBottom: 26 },
    statValue: { color: c.ink, fontSize: 19, fontWeight: '900', letterSpacing: -0.4, marginTop: 6 },
    subjectActions: { alignItems: 'center', flexDirection: 'row', marginTop: 2 },
    subjectCard: { flexGrow: 1, minWidth: 220, padding: 15, width: '48%' },
    subjectEmoji: { fontSize: 19 },
    subjectFooter: { alignItems: 'flex-end', borderTopColor: c.line, borderTopWidth: 1, flexDirection: 'row', marginTop: 14, paddingTop: 10 },
    subjectGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 11 },
    subjectMark: { alignItems: 'center', borderRadius: 12, height: 40, justifyContent: 'center', width: 40 },
    subjectName: { color: c.ink, fontSize: 15, fontWeight: '900', lineHeight: 21, marginTop: 14, minHeight: 42 },
    subjectProfessor: { color: c.muted, fontSize: 12, marginTop: 4 },
    subjectTop: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
    taskCopy: { flex: 1, paddingRight: 8 },
    taskMeta: { color: c.muted, fontSize: 12, marginTop: 3 },
    taskRow: { alignItems: 'center', flexDirection: 'row', minHeight: 72, padding: 14 },
    taskStack: { gap: 9 },
    taskTitle: { color: c.ink, fontSize: 14, fontWeight: '800', lineHeight: 20 },
    textAction: { justifyContent: 'center', minHeight: 36, paddingLeft: 12 },
    textLink: { color: c.primary, fontSize: neonType.link.size, fontWeight: neonType.link.weight },
    typeChip: { backgroundColor: hexToRgba(c.muted, 0.1), borderColor: c.line, borderRadius: 999, borderWidth: 1, justifyContent: 'center', marginRight: 7, minHeight: 33, paddingHorizontal: 11 },
    typeChipText: { color: c.muted, fontSize: 12, fontWeight: '800' },
    typeScroller: { paddingBottom: 10 },
    twoCol: { gap: 15, marginBottom: 20 },
    twoColTablet: { alignItems: 'stretch', flexDirection: 'row' },
    weekday: { color: c.muted, flex: 1, fontSize: 11, fontWeight: '900', textAlign: 'center' },
    weekdayRow: { flexDirection: 'row', marginBottom: 7 },
    });
}
