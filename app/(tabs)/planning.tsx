import { useMemo, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { AcademicButton, AcademicCard, AcademicEmptyState, AcademicPill, AcademicProgress, AcademicSection, academicColors } from '@/components/academic/design-system';
import { type Goal, type Task, type TaskCategory, useStudy } from '@/lib/study-store';
import { goalProgress } from '@/lib/study-utils';

type TaskFilter = TaskCategory | 'Concluídas';
const filters: TaskFilter[] = ['Hoje', 'Amanhã', 'Próximas', 'Atrasadas', 'Concluídas'];

export default function PlanningScreen() {
  const { goals, addGoal, addTask, toggleTask } = useStudy();
  const [filter, setFilter] = useState<TaskFilter>('Hoje');
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [expanded, setExpanded] = useState<string | null>(goals[0]?.id ?? null);
  const [taskDraft, setTaskDraft] = useState('');
  const [taskPriority, setTaskPriority] = useState<Task['priority']>('Média');
  const [taskDeadline, setTaskDeadline] = useState('');
  const [taskCategory, setTaskCategory] = useState<TaskCategory>('Próximas');

  const allTasks = useMemo(() => goals.flatMap(goal => goal.tasks.map(task => ({ ...task, goalId: goal.id, goalTitle: goal.title }))), [goals]);
  const filteredTasks = useMemo(() => allTasks.filter(task => filter === 'Concluídas' ? task.done : !task.done && (task.category ?? 'Próximas') === filter), [allTasks, filter]);
  const completed = allTasks.filter(task => task.done).length;
  const total = allTasks.length;
  const overall = total ? Math.round((completed / total) * 100) : 0;
  const countFor = (item: TaskFilter) => allTasks.filter(task => item === 'Concluídas' ? task.done : !task.done && (task.category ?? 'Próximas') === item).length;
  const createGoal = () => { if (!title.trim()) return; addGoal(title.trim(), description.trim(), deadline.trim()); setTitle(''); setDescription(''); setDeadline(''); setShowGoalForm(false); };
  const createTask = (goalId: string) => {
    if (!taskDraft.trim()) return;
    addTask(goalId, taskDraft.trim(), taskPriority, taskDeadline.trim() || undefined, taskCategory);
    setTaskDraft(''); setTaskDeadline(''); setTaskPriority('Média'); setTaskCategory('Próximas');
  };

  return <ScreenContainer style={styles.screen}>
    <FlatList
      data={goals}
      keyExtractor={item => item.id}
      contentContainerStyle={styles.content}
      ListHeaderComponent={<View>
        <View style={styles.header}><View style={styles.headerCopy}><Text style={styles.overline}>PLANEJAMENTO</Text><Text style={styles.title}>Ritmo de estudos</Text><Text style={styles.subtitle}>Organize prioridades, acompanhe metas e transforme intenção em avanço real.</Text></View><AcademicButton label="Nova meta" onPress={() => setShowGoalForm(value => !value)} compact /></View>

        <View style={styles.overview}><View><Text style={styles.overviewLabel}>PROGRESSO GERAL</Text><Text style={styles.overviewValue}>{overall}%</Text><Text style={styles.overviewCaption}>{completed} de {total} tarefas concluídas</Text></View><View style={styles.overviewRing}><Text style={styles.overviewRingText}>{goals.length}</Text><Text style={styles.overviewRingLabel}>metas</Text></View></View>
        <AcademicProgress value={overall} color={academicColors.violet} height={8} />

        {showGoalForm ? <AcademicCard style={styles.goalForm}><Text style={styles.formTitle}>Nova meta acadêmica</Text><TextInput value={title} onChangeText={setTitle} placeholder="Ex.: Finalizar trabalho de Banco de Dados" placeholderTextColor={academicColors.muted} style={styles.input} /><TextInput value={description} onChangeText={setDescription} placeholder="Uma descrição breve do resultado desejado" placeholderTextColor={academicColors.muted} style={styles.input} /><TextInput value={deadline} onChangeText={setDeadline} placeholder="Prazo (opcional)" placeholderTextColor={academicColors.muted} style={styles.input} /><AcademicButton label="Criar meta" onPress={createGoal} compact /></AcademicCard> : null}

        <AcademicSection eyebrow="TAREFAS" title="O que precisa de atenção">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>{filters.map(item => <TouchableOpacity key={item} accessibilityRole="button" accessibilityState={{ selected: filter === item }} accessibilityLabel={`Mostrar tarefas ${item}`} onPress={() => setFilter(item)} style={[styles.filter, filter === item && styles.filterActive]}><Text style={[styles.filterText, filter === item && styles.filterTextActive]}>{item}</Text><View style={[styles.filterCount, filter === item && styles.filterCountActive]}><Text style={[styles.filterCountText, filter === item && styles.filterCountTextActive]}>{countFor(item)}</Text></View></TouchableOpacity>)}</ScrollView>
          {filteredTasks.length ? <View style={styles.taskList}>{filteredTasks.map(task => <PlanningTask key={task.id} task={task} onToggle={() => toggleTask(task.goalId, task.id)} />)}</View> : <AcademicEmptyState title={filter === 'Concluídas' ? 'Nada concluído ainda' : `Nenhuma tarefa em ${filter.toLowerCase()}`} description={filter === 'Atrasadas' ? 'Você não registrou pendências atrasadas. Continue cuidando do seu ritmo.' : 'Crie ou classifique uma tarefa dentro de uma meta para vê-la aqui.'} />}
        </AcademicSection>

        <AcademicSection eyebrow="METAS" title="Seus objetivos acadêmicos" actionLabel={`${goals.length} ativas`}>
          <Text style={styles.sectionHelp}>Abra uma meta para revisar as tarefas, registrar prazos e manter o foco no que importa.</Text>
        </AcademicSection>
      </View>}
      ListEmptyComponent={<AcademicEmptyState title="Nenhuma meta criada" description="Comece por um resultado importante da faculdade e divida-o em tarefas menores." actionLabel="Criar primeira meta" onAction={() => setShowGoalForm(true)} />}
      renderItem={({ item }) => <GoalCard goal={item} expanded={expanded === item.id} onToggle={() => setExpanded(current => current === item.id ? null : item.id)} taskDraft={taskDraft} setTaskDraft={setTaskDraft} taskPriority={taskPriority} setTaskPriority={setTaskPriority} taskDeadline={taskDeadline} setTaskDeadline={setTaskDeadline} taskCategory={taskCategory} setTaskCategory={setTaskCategory} onAddTask={() => createTask(item.id)} onTaskToggle={taskId => toggleTask(item.id, taskId)} />}
    />
  </ScreenContainer>;
}

function PlanningTask({ task, onToggle }: { task: Task & { goalId: string; goalTitle: string }; onToggle: () => void }) {
  const tone = task.priority === 'Alta' ? 'danger' : task.priority === 'Média' ? 'warning' : 'neutral';
  return <AcademicCard style={styles.task}><TouchableOpacity accessibilityRole="checkbox" accessibilityState={{ checked: task.done }} accessibilityLabel={`Concluir ${task.title}`} onPress={onToggle} style={[styles.taskCheck, task.done && styles.taskCheckDone]}><Text style={styles.taskCheckText}>{task.done ? '✓' : ''}</Text></TouchableOpacity><View style={styles.taskCopy}><Text style={[styles.taskTitle, task.done && styles.done]}>{task.title}</Text><Text style={styles.taskMeta}>{task.goalTitle}{task.deadline ? ` · ${task.deadline}` : ''}</Text></View><AcademicPill label={task.priority} tone={tone} /></AcademicCard>;
}

function GoalCard({ goal, expanded, onToggle, taskDraft, setTaskDraft, taskPriority, setTaskPriority, taskDeadline, setTaskDeadline, taskCategory, setTaskCategory, onAddTask, onTaskToggle }: { goal: Goal; expanded: boolean; onToggle: () => void; taskDraft: string; setTaskDraft: (value: string) => void; taskPriority: Task['priority']; setTaskPriority: (value: Task['priority']) => void; taskDeadline: string; setTaskDeadline: (value: string) => void; taskCategory: TaskCategory; setTaskCategory: (value: TaskCategory) => void; onAddTask: () => void; onTaskToggle: (taskId: string) => void }) {
  const progress = goalProgress(goal);
  return <AcademicCard style={styles.goalCard} emphasis><TouchableOpacity onPress={onToggle} accessibilityRole="button" accessibilityLabel={`${expanded ? 'Fechar' : 'Abrir'} meta ${goal.title}`} activeOpacity={0.78}><View style={styles.goalHeader}><View style={styles.goalIcon}><IconSymbol name="chart.bar.fill" size={21} color={academicColors.violet} /></View><View style={styles.goalCopy}><Text style={styles.goalTitle}>{goal.title}</Text><Text numberOfLines={2} style={styles.goalDescription}>{goal.description || 'Defina tarefas para dar forma a esta meta.'}</Text></View><Text style={styles.goalPercent}>{progress}%</Text></View><AcademicProgress value={progress} color={academicColors.violet} height={7} /><View style={styles.goalMeta}><Text style={styles.metaText}>{goal.tasks.filter(task => task.done).length}/{goal.tasks.length} concluídas</Text><Text style={styles.metaText}>{goal.deadline || 'Sem prazo definido'}</Text></View></TouchableOpacity>{expanded ? <View style={styles.goalExpanded}><Text style={styles.expandedTitle}>Tarefas desta meta</Text>{goal.tasks.length ? <View style={styles.innerTasks}>{goal.tasks.map(task => <PlanningTask key={task.id} task={{ ...task, goalId: goal.id, goalTitle: goal.title }} onToggle={() => onTaskToggle(task.id)} />)}</View> : <Text style={styles.emptyGoal}>Ainda não há tarefas. Crie a primeira abaixo.</Text>}<View style={styles.taskComposer}><Text style={styles.composerTitle}>Adicionar tarefa</Text><TextInput value={taskDraft} onChangeText={setTaskDraft} placeholder="O que você precisa fazer?" placeholderTextColor={academicColors.muted} style={styles.input} /><View style={styles.twoColumns}><TextInput value={taskDeadline} onChangeText={setTaskDeadline} placeholder="Prazo (opcional)" placeholderTextColor={academicColors.muted} style={[styles.input, styles.columnInput]} /><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.priorityGroup}>{(['Baixa', 'Média', 'Alta'] as Task['priority'][]).map(priority => <TouchableOpacity key={priority} onPress={() => setTaskPriority(priority)} accessibilityRole="button" accessibilityState={{ selected: taskPriority === priority }} style={[styles.smallChoice, taskPriority === priority && styles.smallChoiceActive]}><Text style={[styles.smallChoiceText, taskPriority === priority && styles.smallChoiceTextActive]}>{priority}</Text></TouchableOpacity>)}</ScrollView></View><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryGroup}>{(['Hoje', 'Amanhã', 'Próximas', 'Atrasadas'] as TaskCategory[]).map(category => <TouchableOpacity key={category} onPress={() => setTaskCategory(category)} accessibilityRole="button" accessibilityState={{ selected: taskCategory === category }} style={[styles.categoryChoice, taskCategory === category && styles.categoryChoiceActive]}><Text style={[styles.categoryChoiceText, taskCategory === category && styles.categoryChoiceTextActive]}>{category}</Text></TouchableOpacity>)}</ScrollView><AcademicButton label="Adicionar tarefa" onPress={onAddTask} compact /></View></View> : null}</AcademicCard>;
}

const styles = StyleSheet.create({
  categoryChoice: { backgroundColor: '#F5F7FC', borderColor: academicColors.line, borderRadius: 999, borderWidth: 1, minHeight: 33, justifyContent: 'center', marginRight: 7, paddingHorizontal: 11 },
  categoryChoiceActive: { backgroundColor: academicColors.violet, borderColor: academicColors.violet },
  categoryChoiceText: { color: academicColors.muted, fontSize: 12, fontWeight: '800' },
  categoryChoiceTextActive: { color: '#FFFFFF' },
  categoryGroup: { paddingBottom: 11 },
  columnInput: { flex: 1, marginBottom: 0, marginRight: 10 },
  composerTitle: { color: academicColors.ink, fontSize: 14, fontWeight: '800', marginBottom: 10 },
  content: { paddingBottom: 118, paddingHorizontal: 18, paddingTop: 20 },
  done: { color: academicColors.muted, textDecorationLine: 'line-through' },
  emptyGoal: { color: academicColors.muted, fontSize: 13, lineHeight: 19 },
  expandedTitle: { color: academicColors.ink, fontSize: 15, fontWeight: '800', marginBottom: 10 },
  filter: { alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: academicColors.line, borderRadius: 999, borderWidth: 1, flexDirection: 'row', marginRight: 8, minHeight: 37, paddingHorizontal: 12 },
  filterActive: { backgroundColor: academicColors.indigo, borderColor: academicColors.indigo },
  filterCount: { alignItems: 'center', backgroundColor: '#EDF0F8', borderRadius: 10, height: 19, justifyContent: 'center', marginLeft: 6, minWidth: 19, paddingHorizontal: 4 },
  filterCountActive: { backgroundColor: 'rgba(255,255,255,0.2)' },
  filterCountText: { color: academicColors.muted, fontSize: 10, fontWeight: '900' },
  filterCountTextActive: { color: '#FFFFFF' },
  filterText: { color: academicColors.muted, fontSize: 12, fontWeight: '800' },
  filterTextActive: { color: '#FFFFFF' },
  filters: { paddingBottom: 3, paddingRight: 18 },
  formTitle: { color: academicColors.ink, fontSize: 16, fontWeight: '900', marginBottom: 13 },
  goalCard: { marginBottom: 12, padding: 17 },
  goalCopy: { flex: 1, paddingRight: 12 },
  goalDescription: { color: academicColors.muted, fontSize: 13, lineHeight: 19, marginTop: 4 },
  goalExpanded: { borderTopColor: academicColors.line, borderTopWidth: 1, marginTop: 15, paddingTop: 15 },
  goalForm: { marginBottom: 25, padding: 16 },
  goalHeader: { alignItems: 'flex-start', flexDirection: 'row', marginBottom: 15 },
  goalIcon: { alignItems: 'center', backgroundColor: '#F0EBFF', borderRadius: 13, height: 43, justifyContent: 'center', marginRight: 11, width: 43 },
  goalMeta: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  goalPercent: { color: academicColors.violet, fontSize: 18, fontWeight: '900' },
  goalTitle: { color: academicColors.ink, fontSize: 16, fontWeight: '900', lineHeight: 21 },
  header: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 19 },
  headerCopy: { flex: 1, paddingRight: 12 },
  innerTasks: { gap: 8, marginBottom: 14 },
  input: { backgroundColor: '#F9FAFE', borderColor: academicColors.line, borderRadius: 11, borderWidth: 1, color: academicColors.ink, fontSize: 14, marginBottom: 10, minHeight: 45, paddingHorizontal: 12 },
  metaText: { color: academicColors.muted, fontSize: 11, fontWeight: '700' },
  overline: { color: academicColors.violet, fontSize: 11, fontWeight: '900', letterSpacing: 0.9 },
  overview: { alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: academicColors.line, borderRadius: 20, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12, padding: 17 },
  overviewCaption: { color: academicColors.muted, fontSize: 12, marginTop: 3 },
  overviewLabel: { color: academicColors.muted, fontSize: 10, fontWeight: '900', letterSpacing: 0.8 },
  overviewRing: { alignItems: 'center', backgroundColor: '#F0EBFF', borderRadius: 35, height: 62, justifyContent: 'center', width: 62 },
  overviewRingLabel: { color: academicColors.violet, fontSize: 10, fontWeight: '800', marginTop: -2 },
  overviewRingText: { color: academicColors.violet, fontSize: 20, fontWeight: '900' },
  overviewValue: { color: academicColors.ink, fontSize: 34, fontWeight: '900', letterSpacing: -1, lineHeight: 39, marginTop: 1 },
  priorityGroup: { alignItems: 'center' },
  screen: { backgroundColor: academicColors.canvas },
  sectionHelp: { color: academicColors.muted, fontSize: 13, lineHeight: 19, marginTop: -2 },
  smallChoice: { backgroundColor: '#F5F7FC', borderColor: academicColors.line, borderRadius: 999, borderWidth: 1, marginRight: 6, minHeight: 38, paddingHorizontal: 10, justifyContent: 'center' },
  smallChoiceActive: { backgroundColor: academicColors.indigo, borderColor: academicColors.indigo },
  smallChoiceText: { color: academicColors.muted, fontSize: 11, fontWeight: '800' },
  smallChoiceTextActive: { color: '#FFFFFF' },
  subtitle: { color: academicColors.muted, fontSize: 14, lineHeight: 20, marginTop: 7 },
  task: { alignItems: 'center', flexDirection: 'row', padding: 13 },
  taskCheck: { alignItems: 'center', borderColor: '#C9D0DF', borderRadius: 10, borderWidth: 2, height: 23, justifyContent: 'center', marginRight: 11, width: 23 },
  taskCheckDone: { backgroundColor: academicColors.success, borderColor: academicColors.success },
  taskCheckText: { color: '#FFFFFF', fontSize: 13, fontWeight: '900' },
  taskComposer: { backgroundColor: '#F8F9FD', borderColor: academicColors.line, borderRadius: 14, borderWidth: 1, marginTop: 4, padding: 13 },
  taskCopy: { flex: 1, paddingRight: 8 },
  taskList: { gap: 9 },
  taskMeta: { color: academicColors.muted, fontSize: 12, marginTop: 3 },
  taskTitle: { color: academicColors.ink, fontSize: 14, fontWeight: '800', lineHeight: 19 },
  title: { color: academicColors.ink, fontSize: 31, fontWeight: '900', letterSpacing: -0.9, lineHeight: 38, marginTop: 4 },
  twoColumns: { alignItems: 'center', flexDirection: 'row', marginBottom: 10 },
});
