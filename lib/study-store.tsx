import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from './supabase';
import { enqueueStudySyncOperations, readStudySyncQueue, removeStudySyncOperations, type StudySyncOperation } from './study-sync-queue';
import { getSupabaseSessionUserId, pullStudyItems, pushStudyItems, subscribeToStudyChanges, type SyncItem, type SyncKind, type SyncWrite } from './supabase-sync';

export type TaskCategory = 'Hoje' | 'Amanhã' | 'Próximas' | 'Atrasadas';
export type Task = { id: string; title: string; done: boolean; priority: 'Alta' | 'Média' | 'Baixa'; deadline?: string; category?: TaskCategory };
export type Goal = { id: string; title: string; description: string; deadline?: string; tasks: Task[] };
export type RichBlockType = 'paragraph' | 'heading' | 'quote' | 'code' | 'bullet' | 'table' | 'image' | 'chart';
export type RichBlock = { id: string; type: RichBlockType; text?: string; data?: string };
export type PdfPage = { id: string; pageNumber: number; imageUri?: string; extractedText?: string };
export type Note = { id: string; title: string; content: string; folder: string; updatedAt: string; kind: 'note' | 'pdf'; uri?: string; blocks?: RichBlock[]; images?: string[]; pdfPages?: PdfPage[]; selectedText?: string; favorite?: boolean; pdfText?: string };
export type Folder = { id: string; name: string };
export type Subject = { id: string; name: string; professor: string; color: string; emoji: string; description?: string; tasks?: Task[] };
/**
 * `Aviso` separa comunicados/fóruns importados do Moodle dos compromissos de
 * estudo: eles aparecem em "Avisos e comunicados", não na lista principal.
 */
export type AcademicEventType = 'Aula' | 'Exercício' | 'Prova' | 'Teste' | 'Visita' | 'Aviso' | 'Outro';
export type AcademicEvent = { id: string; title: string; type: AcademicEventType; subjectId?: string; date: string; time?: string; done: boolean; notes?: string; color?: string; emoji?: string };
export type ChatMessage = { id: string; author: string; text: string; room: 'Sala pública' | 'Conversa privada'; createdAt: string };
export type StudyState = { goals: Goal[]; notes: Note[]; folders: Folder[]; subjects: Subject[]; events: AcademicEvent[]; chatMessages: ChatMessage[] };

const initialState: StudyState = {
  goals: [
    { id: 'g1', title: 'Fundamentos de React Native', description: 'Construir uma base sólida para criar aplicativos móveis.', deadline: '30 ago', tasks: [
      { id: 't1', title: 'Revisar componentes e props', done: true, priority: 'Alta' },
      { id: 't2', title: 'Praticar navegação com Expo Router', done: false, priority: 'Alta' },
      { id: 't3', title: 'Criar uma tela com formulário', done: false, priority: 'Média' },
    ] },
    { id: 'g2', title: 'Estruturas de dados', description: 'Resolver problemas com listas, filas e árvores.', deadline: '12 set', tasks: [
      { id: 't4', title: 'Estudar complexidade Big O', done: false, priority: 'Média' },
      { id: 't5', title: 'Resolver 5 exercícios de listas', done: false, priority: 'Baixa' },
    ] },
  ],
  notes: [
    { id: 'n1', title: 'Anotações sobre componentes', content: 'Componentes são blocos reutilizáveis da interface. Props permitem passar dados entre eles.', folder: 'Programação', updatedAt: 'Hoje, 09:42', kind: 'note', blocks: [{ id: 'b1', type: 'paragraph', text: 'Componentes são blocos reutilizáveis da interface.' }, { id: 'b2', type: 'quote', text: 'Props permitem passar dados entre componentes.' }] },
    { id: 'n2', title: 'Roteiro de estudos — semestre', content: 'Organizar os assuntos por semana e revisar os pontos mais difíceis.', folder: 'Planejamento', updatedAt: 'Ontem', kind: 'note', blocks: [{ id: 'b3', type: 'heading', text: 'Roteiro de estudos' }, { id: 'b4', type: 'bullet', text: 'Organizar os assuntos por semana' }] },
  ],
  folders: [{ id: 'f1', name: 'Programação' }, { id: 'f2', name: 'Planejamento' }],
  subjects: [{ id: 's1', name: 'Engenharia de Software', professor: 'Prof. Ana Martins', color: '#3949AB', emoji: '⌘' }, { id: 's2', name: 'Programação Orientada a Objetos', professor: 'Prof. Carlos Lima', color: '#1F9D68', emoji: '⚙️' }, { id: 's3', name: 'Banco de Dados', professor: 'Prof. Juliana Costa', color: '#C98200', emoji: '▦' }],
  events: [{ id: 'e1', title: 'Aula de arquitetura MVC', type: 'Aula', subjectId: 's1', date: 'Hoje', time: '19:00', done: false, color: '#3949AB', emoji: '📚' }, { id: 'e2', title: 'Lista de exercícios — classes', type: 'Exercício', subjectId: 's2', date: 'Amanhã', time: '14:00', done: false, color: '#1F9D68', emoji: '✎' }, { id: 'e3', title: 'Prova parcial de banco', type: 'Prova', subjectId: 's3', date: '05 set', time: '19:00', done: false, color: '#C2414B', emoji: '★' }],
  chatMessages: [{ id: 'm1', author: 'Rafa', text: 'Alguém já revisou o padrão MVC?', room: 'Sala pública', createdAt: '18:32' }, { id: 'm2', author: 'Cris', text: 'Estou estudando agora. Posso compartilhar minhas anotações.', room: 'Sala pública', createdAt: '18:34' }, { id: 'm3', author: 'Cris', text: 'Bem-vindo ao seu espaço de conversa.', room: 'Conversa privada', createdAt: 'Agora' }],
};

const STORAGE_KEY = '@estudo-organizado/state-v2';
type SyncRecord = { id: string; kind: SyncKind; payload: unknown };
type RecordSnapshot = Map<string, SyncRecord>;

function keyOf(record: Pick<SyncRecord, 'id' | 'kind'>) { return `${record.kind}:${record.id}`; }
function buildSyncRecords(state: StudyState): SyncRecord[] {
  return [
    ...state.subjects.map(item => ({ id: item.id, kind: 'subject' as const, payload: item })),
    ...state.events.map(item => ({ id: item.id, kind: 'event' as const, payload: item })),
    ...state.goals.map(item => ({ id: item.id, kind: 'goal' as const, payload: item })),
    ...state.notes.map(item => ({ id: item.id, kind: 'document' as const, payload: item })),
  ];
}
function makeSnapshot(state: StudyState): RecordSnapshot { return new Map(buildSyncRecords(state).map(record => [keyOf(record), record])); }
function sameRecord(left: SyncRecord, right: SyncRecord) { return left.kind === right.kind && JSON.stringify(left.payload) === JSON.stringify(right.payload); }
function nextStateFromRemote(state: StudyState, item: SyncItem): StudyState {
  const remove = Boolean(item.deleted_at);
  if (item.kind === 'subject') {
    const value = item.payload as Subject;
    return { ...state, subjects: remove ? state.subjects.filter(entry => entry.id !== item.id) : [value, ...state.subjects.filter(entry => entry.id !== item.id)] };
  }
  if (item.kind === 'event') {
    const value = item.payload as AcademicEvent;
    return { ...state, events: remove ? state.events.filter(entry => entry.id !== item.id) : [value, ...state.events.filter(entry => entry.id !== item.id)] };
  }
  if (item.kind === 'goal') {
    const value = item.payload as Goal;
    return { ...state, goals: remove ? state.goals.filter(entry => entry.id !== item.id) : [value, ...state.goals.filter(entry => entry.id !== item.id)] };
  }
  if (item.kind === 'document') {
    const value = item.payload as Note;
    return { ...state, notes: remove ? state.notes.filter(entry => entry.id !== item.id) : [value, ...state.notes.filter(entry => entry.id !== item.id)] };
  }
  return state;
}

type Store = StudyState & {
  createNote: (title?: string, folder?: string) => string;
  duplicateNote: (noteId: string) => string | null;
  toggleTask: (goalId: string, taskId: string) => void;
  deleteTask: (goalId: string, taskId: string) => void;
  toggleEvent: (eventId: string) => void;
  addSubject: (name: string, professor: string, emoji?: string, color?: string) => string;
  updateSubject: (subjectId: string, changes: Partial<Subject>) => void;
  deleteSubject: (subjectId: string) => void;
  addSubjectTask: (subjectId: string, title: string, priority: Task['priority'], deadline?: string, category?: TaskCategory) => void;
  toggleSubjectTask: (subjectId: string, taskId: string) => void;
  deleteSubjectTask: (subjectId: string, taskId: string) => void;
  addEvent: (event: Omit<AcademicEvent, 'id' | 'done'>) => void;
  updateEvent: (eventId: string, changes: Partial<AcademicEvent>) => void;
  deleteEvent: (eventId: string) => void;
  addChatMessage: (text: string, room: ChatMessage['room']) => void;
  addGoal: (title: string, description: string, deadline: string) => void;
  addTask: (goalId: string, title: string, priority: Task['priority'], deadline?: string, category?: TaskCategory) => void;
  saveNote: (note: Note) => void;
  deleteNote: (noteId: string) => void;
  renameNote: (noteId: string, title: string) => void;
  moveNote: (noteId: string, folder: string) => void;
  toggleNoteFavorite: (noteId: string) => void;
  addFolder: (name: string) => void;
  addPdf: (name: string, uri: string) => void;
  appendPdfPage: (noteId: string, page: PdfPage) => void;
  /** Texto extraído do PDF inteiro (leitor com PDF.js) para busca e flashcards. */
  setPdfText: (noteId: string, text: string) => void;
};
export type StudyActions = Omit<Store, keyof StudyState>;

/**
 * Contextos por fatia — o equivalente a `useStore(state => state.tasks)` sem
 * adicionar Zustand ao projeto.
 *
 * Antes existia um único contexto com `state` inteiro. Como `useStudy()` era
 * consumido por todas as abas montadas, concluir uma tarefa na Home re-renderizava
 * também Chat, Planejamento, Biblioteca, Editor e Ajustes. Agora cada tela
 * assina só a fatia que usa e as ações vivem num contexto separado e estável.
 */
const StudyContext = createContext<Store | null>(null);
const StudyActionsContext = createContext<StudyActions | null>(null);
const NotesContext = createContext<Note[] | null>(null);
const FoldersContext = createContext<Folder[] | null>(null);
const GoalsContext = createContext<Goal[] | null>(null);
const SubjectsContext = createContext<Subject[] | null>(null);
const EventsContext = createContext<AcademicEvent[] | null>(null);
const ChatMessagesContext = createContext<ChatMessage[] | null>(null);

function useSlice<T>(context: React.Context<T | null>, hookName: string): T {
  const value = useContext(context);
  if (value === null) throw new Error(`${hookName} must be used inside StudyProvider`);
  return value;
}


let idSequence = 0;

/**
 * IDs únicos mesmo quando várias entidades são criadas no mesmo milissegundo
 * (a importação do Moodle cria tarefas em sequência). Isso evita chaves
 * repetidas nas listas (`Children with the same key`).
 */
function createId(prefix: string): string {
  idSequence += 1;
  return `${prefix}-${Date.now()}-${idSequence}`;
}


export function StudyProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<StudyState>(initialState);
  const [hydrated, setHydrated] = useState(false);
  const stateRef = useRef(initialState);
  const snapshotRef = useRef<RecordSnapshot>(new Map());
  const snapshotReadyRef = useRef(false);
  const flushingRef = useRef(false);

  const flushQueue = useCallback(async () => {
    if (!supabase || flushingRef.current) return;
    const userId = await getSupabaseSessionUserId();
    if (!userId) return;
    flushingRef.current = true;
    try {
      const queued = await readStudySyncQueue();
      const eligible = queued.filter(operation => !operation.ownerId || operation.ownerId === userId);
      if (!eligible.length) return;
      const batch: SyncWrite[] = eligible.map(operation => ({ id: operation.id, kind: operation.kind, payload: operation.payload, deletedAt: operation.deletedAt }));
      const pushed = await pushStudyItems(batch);
      if (pushed) await removeStudySyncOperations(eligible);
    } catch {
      // The queue remains intact and will be retried after the next authenticated state change.
    } finally {
      flushingRef.current = false;
    }
  }, []);

  const queueRecords = useCallback(async (records: SyncRecord[], ownerId?: string, tombstones = new Set<string>()) => {
    if (!supabase || !records.length) return;
    const authenticatedOwner = ownerId ?? await getSupabaseSessionUserId();
    const operations: StudySyncOperation[] = records.map(record => ({
      ...record,
      deletedAt: tombstones.has(keyOf(record)) ? new Date().toISOString() : null,
      queuedAt: new Date().toISOString(),
      ownerId: authenticatedOwner ?? undefined,
    }));
    await enqueueStudySyncOperations(operations);
    await flushQueue();
  }, [flushQueue]);

  const reconcileCurrentAccount = useCallback(async () => {
    if (!supabase) return;
    const userId = await getSupabaseSessionUserId();
    if (!userId) return;
    try {
      const remote = await pullStudyItems();
      if (remote.length) {
        const merged = remote.reduce(nextStateFromRemote, stateRef.current);
        stateRef.current = merged;
        snapshotRef.current = makeSnapshot(merged);
        snapshotReadyRef.current = true;
        setState(merged);
      } else {
        const local = stateRef.current;
        snapshotRef.current = makeSnapshot(local);
        snapshotReadyRef.current = true;
        await queueRecords(buildSyncRecords(local), userId);
      }
      await flushQueue();
    } catch {
      // Offline mode retains the on-device study plan until the connection returns.
    }
  }, [flushQueue, queueRecords]);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        const saved = raw ? JSON.parse(raw) as Partial<StudyState> : {};
        const restored = {
          ...initialState,
          ...saved,
          subjects: saved.subjects ?? initialState.subjects,
          events: saved.events ?? initialState.events,
          chatMessages: saved.chatMessages ?? initialState.chatMessages,
          goals: saved.goals ?? initialState.goals,
          notes: saved.notes ?? initialState.notes,
          folders: saved.folders ?? initialState.folders,
        };
        if (!active) return;
        stateRef.current = restored;
        setState(restored);
      } catch {
        stateRef.current = initialState;
      } finally {
        if (active) setHydrated(true);
      }
    })();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    void reconcileCurrentAccount();
    if (!supabase) return;
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) void reconcileCurrentAccount();
    });
    return () => data.subscription.unsubscribe();
  }, [hydrated, reconcileCurrentAccount]);

  useEffect(() => {
    if (!supabase) return;
    return subscribeToStudyChanges(item => {
      void (async () => {
        const userId = await getSupabaseSessionUserId();
        if (!userId || item.user_id !== userId) return;
        const next = nextStateFromRemote(stateRef.current, item);
        stateRef.current = next;
        snapshotRef.current = makeSnapshot(next);
        snapshotReadyRef.current = true;
        setState(next);
      })();
    });
  }, []);

  /**
   * Persistência local com debounce: `JSON.stringify(state)` é síncrono e caro
   * (notas com texto de PDF passam de 100 mil caracteres). Antes ele rodava a
   * cada atualização de estado — inclusive a cada autosave do editor. Agrupar
   * as rajadas em 250 ms tira esse trabalho do caminho da digitação/navegação.
   */
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestStateRef = useRef(state);

  useEffect(() => {
    if (!hydrated) return;
    stateRef.current = state;
    latestStateRef.current = state;

    if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
    persistTimerRef.current = setTimeout(() => {
      persistTimerRef.current = null;
      void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(latestStateRef.current)).catch(() => undefined);
    }, 250);

    if (!supabase) return;
    const nextSnapshot = makeSnapshot(state);
    if (!snapshotReadyRef.current) {
      snapshotRef.current = nextSnapshot;
      snapshotReadyRef.current = true;
      return;
    }
    const changed = Array.from(nextSnapshot.entries())
      .filter(([key, record]) => !snapshotRef.current.has(key) || !sameRecord(record, snapshotRef.current.get(key)!))
      .map(([, record]) => record);
    const removed = Array.from(snapshotRef.current.entries())
      .filter(([key]) => !nextSnapshot.has(key))
      .map(([, record]) => record);
    snapshotRef.current = nextSnapshot;
    if (changed.length || removed.length) {
      const deletions = new Set(removed.map(keyOf));
      void queueRecords([...changed, ...removed], undefined, deletions);
    }
  }, [state, hydrated, queueRecords]);

  /** Última gravação pendente não pode ser perdida ao fechar a tela. */
  useEffect(() => () => {
    if (!persistTimerRef.current) return;
    clearTimeout(persistTimerRef.current);
    persistTimerRef.current = null;
    void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(latestStateRef.current)).catch(() => undefined);
  }, []);


  /**
   * `[]` de propósito: as ações só usam `setState` (estável) e `stateRef`
   * (leitura sempre atual). Assim `useStudyActions()` não re-renderiza nada.
   */
  const actions = useMemo<StudyActions>(() => ({
    createNote: (title = 'Novo documento', folder = 'Sem pasta') => { const id = createId('note'); setState(s => ({ ...s, notes: [{ id, title: title.trim() || 'Novo documento', content: '', folder, updatedAt: 'Agora', kind: 'note', blocks: [] }, ...s.notes] })); return id; },
    duplicateNote: noteId => { const source = stateRef.current.notes.find(note => note.id === noteId); if (!source) return null; const id = createId('note'); setState(s => ({ ...s, notes: [{ ...source, id, title: `${source.title} — cópia`, updatedAt: 'Agora', blocks: source.blocks?.map(block => ({ ...block, id: createId('block') })) }, ...s.notes] })); return id; },
    toggleEvent: eventId => setState(s => ({ ...s, events: s.events.map(event => event.id === eventId ? { ...event, done: !event.done } : event) })),
    addSubject: (name, professor, emoji = '✦', color = '#3949AB') => { const cleanName = name.trim(); const id = createId('subject'); if (!cleanName) return id; setState(s => ({ ...s, subjects: [...s.subjects, { id, name: cleanName, professor: professor.trim(), color, emoji }] })); return id; },
    updateSubject: (subjectId, changes) => setState(s => ({ ...s, subjects: s.subjects.map(subject => subject.id === subjectId ? { ...subject, ...changes } : subject) })),
    deleteSubject: subjectId => setState(s => ({ ...s, subjects: s.subjects.filter(subject => subject.id !== subjectId), events: s.events.map(event => event.subjectId === subjectId ? { ...event, subjectId: undefined } : event) })),
    addSubjectTask: (subjectId, title, priority, deadline, category) => { const cleanTitle = title.trim(); if (!cleanTitle) return; setState(s => ({ ...s, subjects: s.subjects.map(subject => subject.id === subjectId ? { ...subject, tasks: [...(subject.tasks ?? []), { id: createId('subject-task'), title: cleanTitle, priority, deadline, category, done: false }] } : subject) })); },
    toggleSubjectTask: (subjectId, taskId) => setState(s => ({ ...s, subjects: s.subjects.map(subject => subject.id === subjectId ? { ...subject, tasks: (subject.tasks ?? []).map(task => task.id === taskId ? { ...task, done: !task.done } : task) } : subject) })),
    deleteSubjectTask: (subjectId, taskId) => setState(s => ({ ...s, subjects: s.subjects.map(subject => subject.id === subjectId ? { ...subject, tasks: (subject.tasks ?? []).filter(task => task.id !== taskId) } : subject) })),
    addEvent: event => { if (!event.title.trim()) return; setState(s => ({ ...s, events: [{ ...event, title: event.title.trim(), id: createId('event'), done: false }, ...s.events] })); },
    updateEvent: (eventId, changes) => setState(s => ({ ...s, events: s.events.map(event => event.id === eventId ? { ...event, ...changes } : event) })),
    deleteEvent: eventId => setState(s => ({ ...s, events: s.events.filter(event => event.id !== eventId) })),
    addChatMessage: (text, room) => setState(s => ({ ...s, chatMessages: [...s.chatMessages, { id: createId('chat'), author: 'Cris', text, room, createdAt: 'Agora' }] })),
    toggleTask: (goalId, taskId) => setState(s => ({ ...s, goals: s.goals.map(goal => goal.id === goalId ? { ...goal, tasks: goal.tasks.map(task => task.id === taskId ? { ...task, done: !task.done } : task) } : goal) })),
    deleteTask: (goalId, taskId) => setState(s => ({ ...s, goals: s.goals.map(goal => goal.id === goalId ? { ...goal, tasks: goal.tasks.filter(task => task.id !== taskId) } : goal) })),
    addGoal: (title, description, deadline) => { const cleanTitle = title.trim(); if (!cleanTitle) return; setState(s => ({ ...s, goals: [{ id: createId('goal'), title: cleanTitle, description: description.trim(), deadline: deadline.trim(), tasks: [] }, ...s.goals] })); },
    addTask: (goalId, title, priority, deadline, category) => { const cleanTitle = title.trim(); if (!cleanTitle) return; setState(s => ({ ...s, goals: s.goals.map(goal => goal.id === goalId ? { ...goal, tasks: [...goal.tasks, { id: createId('task'), title: cleanTitle, priority, deadline, category, done: false }] } : goal) })); },
    saveNote: note => { const cleanTitle = note.title.trim(); if (!cleanTitle) return; setState(s => ({ ...s, notes: [{ ...note, title: cleanTitle, updatedAt: 'Agora' }, ...s.notes.filter(entry => entry.id !== note.id)] })); },
    deleteNote: noteId => setState(s => ({ ...s, notes: s.notes.filter(note => note.id !== noteId) })),
    renameNote: (noteId, title) => { const cleanTitle = title.trim(); if (!cleanTitle) return; setState(s => ({ ...s, notes: s.notes.map(note => note.id === noteId ? { ...note, title: cleanTitle, updatedAt: 'Agora' } : note) })); },
    moveNote: (noteId, folder) => setState(s => ({ ...s, notes: s.notes.map(note => note.id === noteId ? { ...note, folder, updatedAt: 'Agora' } : note) })),
    toggleNoteFavorite: noteId => setState(s => ({ ...s, notes: s.notes.map(note => note.id === noteId ? { ...note, favorite: !note.favorite, updatedAt: 'Agora' } : note) })),
    addFolder: name => setState(s => ({ ...s, folders: [...s.folders, { id: createId('folder'), name }] })),
    addPdf: (name, uri) => setState(s => ({ ...s, notes: [{ id: createId('note'), title: name, content: `Material importado localmente.\nArquivo: ${uri}`, folder: 'Sem pasta', updatedAt: 'Agora', kind: 'pdf', uri, pdfPages: [{ id: createId('page'), pageNumber: 1, imageUri: undefined }] }, ...s.notes] })),
    appendPdfPage: (noteId, page) => setState(s => ({ ...s, notes: s.notes.map(note => note.id === noteId ? { ...note, updatedAt: 'Agora', content: `${note.content}\n\nPágina ${page.pageNumber}\n${page.extractedText ?? ''}`, pdfPages: [...(note.pdfPages ?? []), page] } : note) })),
    setPdfText: (noteId, text) => setState(s => ({ ...s, notes: s.notes.map(note => note.id === noteId ? { ...note, pdfText: text.slice(0, 120_000) } : note) })),
  }), []);

  /**
   * Compatibilidade: `useStudy()` continua devolvendo estado + ações, mas as
   * telas assinam as fatias abaixo para não re-renderizar o app inteiro.
   */
  const value = useMemo<Store>(() => ({ ...state, ...actions }), [state, actions]);

  return (
    <StudyActionsContext.Provider value={actions}>
      <NotesContext.Provider value={state.notes}>
        <FoldersContext.Provider value={state.folders}>
          <GoalsContext.Provider value={state.goals}>
            <SubjectsContext.Provider value={state.subjects}>
              <EventsContext.Provider value={state.events}>
                <ChatMessagesContext.Provider value={state.chatMessages}>
                  <StudyContext.Provider value={value}>{children}</StudyContext.Provider>
                </ChatMessagesContext.Provider>
              </EventsContext.Provider>
            </SubjectsContext.Provider>
          </GoalsContext.Provider>
        </FoldersContext.Provider>
      </NotesContext.Provider>
    </StudyActionsContext.Provider>
  );
}

export function useStudy() {
  const value = useContext(StudyContext);
  if (!value) throw new Error('useStudy must be used inside StudyProvider');
  return value;
}

/** Ações estáveis — nunca disparam re-render por mudança de estado. */
export function useStudyActions() {
  return useSlice(StudyActionsContext, 'useStudyActions');
}

/** Fatias: cada tela assina apenas o dado que renderiza. */
export function useStudyNotes() {
  return useSlice(NotesContext, 'useStudyNotes');
}

export function useStudyFolders() {
  return useSlice(FoldersContext, 'useStudyFolders');
}

export function useStudyGoals() {
  return useSlice(GoalsContext, 'useStudyGoals');
}

export function useStudySubjects() {
  return useSlice(SubjectsContext, 'useStudySubjects');
}

export function useStudyEvents() {
  return useSlice(EventsContext, 'useStudyEvents');
}

export function useStudyChatMessages() {
  return useSlice(ChatMessagesContext, 'useStudyChatMessages');
}
