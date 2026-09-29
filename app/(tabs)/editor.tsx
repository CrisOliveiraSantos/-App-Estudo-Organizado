import { useMemo, useState } from 'react';
import { Alert, FlatList, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { router } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { AcademicButton, AcademicCard, AcademicEmptyState, academicColors } from '@/components/academic/design-system';
import { type Note, type RichBlock, useStudy } from '@/lib/study-store';

type ViewMode = 'grid' | 'list';
type Order = 'recent' | 'az';
type Template = { name: string; title: string; folder: string; content: string; blocks: RichBlock[] };

const templates: Template[] = [
  { name: 'Em branco', title: 'Novo documento', folder: 'Sem pasta', content: '', blocks: [] },
  { name: 'Trabalho acadêmico', title: 'Trabalho acadêmico', folder: 'Trabalhos', content: 'Introdução\n\nDesenvolvimento\n\nConclusão', blocks: [{ id: 'intro', type: 'heading', text: 'Introdução' }, { id: 'development', type: 'heading', text: 'Desenvolvimento' }, { id: 'conclusion', type: 'heading', text: 'Conclusão' }] },
  { name: 'TCC', title: 'Trabalho de Conclusão de Curso', folder: 'Trabalhos', content: 'Resumo\n\n1. Introdução\n\n2. Referencial teórico\n\n3. Metodologia\n\n4. Considerações finais', blocks: [{ id: 'summary', type: 'heading', text: 'Resumo' }, { id: 'introduction', type: 'heading', text: '1. Introdução' }, { id: 'theory', type: 'heading', text: '2. Referencial teórico' }] },
  { name: 'Artigo', title: 'Artigo acadêmico', folder: 'Pesquisas', content: 'Resumo\n\nPalavras-chave:\n\nIntrodução\n\nReferências', blocks: [{ id: 'abstract', type: 'heading', text: 'Resumo' }, { id: 'keywords', type: 'paragraph', text: 'Palavras-chave:' }, { id: 'references', type: 'heading', text: 'Referências' }] },
  { name: 'Relatório', title: 'Relatório de atividade', folder: 'Trabalhos', content: 'Objetivo\n\nAtividades realizadas\n\nResultados\n\nPróximos passos', blocks: [{ id: 'objective', type: 'heading', text: 'Objetivo' }, { id: 'activities', type: 'heading', text: 'Atividades realizadas' }, { id: 'results', type: 'heading', text: 'Resultados' }] },
  { name: 'Resumo', title: 'Resumo de estudo', folder: 'Planejamento', content: 'Tema\n\nIdeias principais\n\nConceitos para revisar', blocks: [{ id: 'theme', type: 'heading', text: 'Tema' }, { id: 'ideas', type: 'bullet', text: 'Ideias principais' }] },
  { name: 'Fichamento', title: 'Fichamento', folder: 'Pesquisas', content: 'Referência\n\nCitação\n\nSíntese\n\nComentário crítico', blocks: [{ id: 'reference', type: 'heading', text: 'Referência' }, { id: 'quote', type: 'quote', text: 'Citação' }, { id: 'synthesis', type: 'heading', text: 'Síntese' }] },
  { name: 'Anotação', title: 'Anotações de aula', folder: 'Sem pasta', content: 'Data:\n\nAssunto:\n\nAnotações:', blocks: [{ id: 'subject', type: 'heading', text: 'Assunto' }, { id: 'notes', type: 'paragraph', text: 'Anotações:' }] },
];

export default function EditorDocumentsScreen() {
  const { width } = useWindowDimensions();
  const wide = width >= 760;
  const { notes, folders, createNote, duplicateNote, deleteNote, renameNote, moveNote, toggleNoteFavorite, saveNote } = useStudy();
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('Todos');
  const [order, setOrder] = useState<Order>('recent');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [showTemplates, setShowTemplates] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState('');

  const filterOptions = ['Todos', 'Recentes', 'Favoritos', ...folders.map(folder => folder.name)];
  const documents = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = notes.filter(note => {
      const matchText = !needle || [note.title, note.content, note.folder].join(' ').toLowerCase().includes(needle);
      if (!matchText) return false;
      if (activeFilter === 'Favoritos') return Boolean(note.favorite);
      if (activeFilter === 'Todos' || activeFilter === 'Recentes') return true;
      return note.folder === activeFilter;
    });
    return order === 'az' ? [...filtered].sort((left, right) => left.title.localeCompare(right.title, 'pt-BR')) : filtered;
  }, [activeFilter, notes, order, query]);

  const openDocument = (id: string) => router.push({ pathname: '/document', params: { id } });
  const createFromTemplate = (template: Template) => {
    const id = createNote(template.title, template.folder);
    saveNote({ id, title: template.title, content: template.content, folder: template.folder, updatedAt: 'Agora', kind: 'note', blocks: template.blocks.map(block => ({ ...block, id: `${block.id}-${Date.now()}` })) });
    setShowTemplates(false);
    openDocument(id);
  };
  const saveRename = (id: string) => { if (draftTitle.trim()) renameNote(id, draftTitle.trim()); setEditingId(null); setDraftTitle(''); };
  const moveDocument = (id: string, folder: string) => { const index = folders.findIndex(item => item.name === folder); moveNote(id, folders[(index + 1) % Math.max(folders.length, 1)]?.name ?? 'Sem pasta'); };
  const confirmDelete = (id: string, title: string) => {
    const remove = () => { deleteNote(id); if (editingId === id) { setEditingId(null); setDraftTitle(''); } };
    if (Platform.OS === 'web' && typeof window !== 'undefined') { if (window.confirm(`Excluir “${title}”? Esta ação não pode ser desfeita.`)) remove(); return; }
    Alert.alert('Excluir documento?', 'Esta ação não pode ser desfeita.', [{ text: 'Cancelar', style: 'cancel' }, { text: 'Excluir', style: 'destructive', onPress: remove }]);
  };

  return <ScreenContainer style={styles.screen}>
    <FlatList
      key={viewMode}
      data={documents}
      numColumns={viewMode === 'grid' ? (wide ? 3 : 2) : 1}
      keyExtractor={item => item.id}
      columnWrapperStyle={viewMode === 'grid' && documents.length ? styles.gridRow : undefined}
      contentContainerStyle={styles.content}
      ListHeaderComponent={<View>
        <View style={styles.header}><View style={styles.headerCopy}><Text style={styles.overline}>ESPAÇO DE ESCRITA · CRIS</Text><Text style={styles.title}>Meus documentos</Text><Text style={styles.subtitle}>Organize resumos, trabalhos, pesquisas e anotações em um só lugar.</Text></View><AcademicButton label="Novo documento" onPress={() => createFromTemplate(templates[0])} compact /></View>
        <AcademicCard style={styles.commandCard} emphasis><View style={styles.commandIcon}><IconSymbol name="note.text" size={22} color={academicColors.violet} /></View><View style={styles.commandCopy}><Text style={styles.commandTitle}>Seu espaço de escrita acadêmica</Text><Text style={styles.commandText}>Comece do zero ou use um modelo para organizar seu trabalho com mais rapidez.</Text></View><AcademicButton label={showTemplates ? 'Fechar modelos' : 'Ver modelos'} tone="violet" compact onPress={() => setShowTemplates(value => !value)} /></AcademicCard>
        {showTemplates ? <View style={styles.templateWrap}><Text style={styles.templateHeading}>Comece com um modelo</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.templateScroller}>{templates.map(template => <TouchableOpacity key={template.name} onPress={() => createFromTemplate(template)} accessibilityRole="button" accessibilityLabel={`Criar ${template.name}`} style={styles.templateCard}><View style={styles.templateMark}><Text style={styles.templateMarkText}>▤</Text></View><Text style={styles.templateName}>{template.name}</Text><Text numberOfLines={2} style={styles.templateCaption}>{template.folder === 'Sem pasta' ? 'Estrutura flexível para começar.' : `Organizado em ${template.folder}.`}</Text></TouchableOpacity>)}</ScrollView></View> : null}
        <View style={styles.searchRow}><View style={styles.searchBox}><IconSymbol name="magnifyingglass" size={19} color={academicColors.muted} /><TextInput value={query} onChangeText={setQuery} placeholder="Buscar por título, texto ou pasta" placeholderTextColor={academicColors.muted} style={styles.searchInput} /></View><TouchableOpacity onPress={() => setOrder(current => current === 'recent' ? 'az' : 'recent')} accessibilityRole="button" accessibilityLabel="Alterar ordenação" style={styles.sortButton}><Text style={styles.sortText}>{order === 'recent' ? 'Recentes' : 'A–Z'}</Text></TouchableOpacity><TouchableOpacity onPress={() => setViewMode(current => current === 'grid' ? 'list' : 'grid')} accessibilityRole="button" accessibilityLabel={viewMode === 'grid' ? 'Visualizar como lista' : 'Visualizar como grade'} style={styles.viewButton}><Text style={styles.viewText}>{viewMode === 'grid' ? '☷' : '▦'}</Text></TouchableOpacity></View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>{filterOptions.map(option => <TouchableOpacity key={option} onPress={() => setActiveFilter(option)} accessibilityRole="button" accessibilityState={{ selected: activeFilter === option }} style={[styles.filter, activeFilter === option && styles.filterActive]}><Text style={[styles.filterText, activeFilter === option && styles.filterTextActive]}>{option}</Text></TouchableOpacity>)}</ScrollView>
        <View style={styles.listHeading}><Text style={styles.listTitle}>{activeFilter === 'Todos' ? 'Todos os documentos' : activeFilter}</Text><Text style={styles.count}>{documents.length} {documents.length === 1 ? 'documento' : 'documentos'}</Text></View>
      </View>}
      ListEmptyComponent={<AcademicEmptyState title={query ? 'Nada encontrado' : 'Sua mesa de documentos está pronta'} description={query ? 'Tente outro termo ou selecione uma pasta diferente.' : 'Crie uma nota em branco ou escolha um modelo acadêmico para começar.'} actionLabel={query ? undefined : 'Criar documento'} onAction={query ? undefined : () => createFromTemplate(templates[0])} />}
      renderItem={({ item }) => <DocumentCard note={item} list={viewMode === 'list'} editing={editingId === item.id} draftTitle={draftTitle} setDraftTitle={setDraftTitle} onOpen={() => openDocument(item.id)} onFavorite={() => toggleNoteFavorite(item.id)} onRename={() => { setEditingId(item.id); setDraftTitle(item.title); }} onSaveRename={() => saveRename(item.id)} onDuplicate={() => { const id = duplicateNote(item.id); if (id) Alert.alert('Documento duplicado', 'Uma cópia foi criada em seus documentos.'); }} onMove={() => moveDocument(item.id, item.folder)} onDelete={() => confirmDelete(item.id, item.title)} />}
    />
  </ScreenContainer>;
}

function DocumentCard({ note, list, editing, draftTitle, setDraftTitle, onOpen, onFavorite, onRename, onSaveRename, onDuplicate, onMove, onDelete }: { note: Note; list: boolean; editing: boolean; draftTitle: string; setDraftTitle: (value: string) => void; onOpen: () => void; onFavorite: () => void; onRename: () => void; onSaveRename: () => void; onDuplicate: () => void; onMove: () => void; onDelete: () => void }) {
  return <AcademicCard style={[styles.documentCard, list && styles.documentCardList]}><View style={styles.documentTop}><View style={styles.documentType}><IconSymbol name={note.kind === 'pdf' ? 'doc.text.fill' : 'note.text'} size={20} color={note.kind === 'pdf' ? academicColors.danger : academicColors.indigo} /></View><TouchableOpacity onPress={onFavorite} accessibilityRole="button" accessibilityState={{ selected: Boolean(note.favorite) }} accessibilityLabel={`${note.favorite ? 'Remover' : 'Adicionar'} ${note.title} dos favoritos`} style={styles.favoriteButton}><Text style={[styles.favorite, note.favorite && styles.favoriteActive]}>{note.favorite ? '★' : '☆'}</Text></TouchableOpacity></View><TouchableOpacity onPress={onOpen} accessibilityRole="button" accessibilityLabel={`Abrir ${note.title}`} activeOpacity={0.76} style={styles.documentOpen}><Text numberOfLines={list ? 1 : 2} style={styles.documentTitle}>{note.title}</Text><Text style={styles.documentFolder}>{note.folder || 'Sem pasta'}</Text><Text numberOfLines={list ? 1 : 3} style={styles.documentPreview}>{note.content || 'Documento vazio — toque para começar a escrever.'}</Text></TouchableOpacity><View style={styles.documentMeta}><Text style={styles.metaText}>{note.updatedAt}</Text><Text style={styles.metaText}>{note.blocks?.length ?? 0} blocos</Text></View>{editing ? <View style={styles.renameBox}><TextInput value={draftTitle} onChangeText={setDraftTitle} onSubmitEditing={onSaveRename} autoFocus placeholder="Título do documento" placeholderTextColor={academicColors.muted} style={styles.renameInput} /><AcademicButton label="Salvar" onPress={onSaveRename} compact /></View> : <View style={styles.documentActions}><TouchableOpacity onPress={onRename} accessibilityRole="button" style={styles.actionButton}><Text style={styles.actionText}>Renomear</Text></TouchableOpacity><TouchableOpacity onPress={onDuplicate} accessibilityRole="button" style={styles.actionButton}><Text style={styles.actionText}>Duplicar</Text></TouchableOpacity><TouchableOpacity onPress={onMove} accessibilityRole="button" style={styles.actionButton}><Text style={styles.actionText}>Mover</Text></TouchableOpacity><TouchableOpacity onPress={onDelete} accessibilityRole="button" accessibilityLabel={`Excluir ${note.title}`} style={styles.deleteButton}><Text style={styles.deleteText}>Excluir</Text></TouchableOpacity></View>}</AcademicCard>;
}

const styles = StyleSheet.create({
  actionButton: { justifyContent: 'center', minHeight: 34, paddingHorizontal: 7 },
  actionText: { color: academicColors.indigo, fontSize: 11, fontWeight: '800' },
  commandCard: { alignItems: 'center', flexDirection: 'row', marginBottom: 17, padding: 16 },
  commandCopy: { flex: 1, paddingHorizontal: 11 },
  commandIcon: { alignItems: 'center', backgroundColor: '#F0EBFF', borderRadius: 14, height: 45, justifyContent: 'center', width: 45 },
  commandText: { color: academicColors.muted, fontSize: 12, lineHeight: 17, marginTop: 3 },
  commandTitle: { color: academicColors.ink, fontSize: 15, fontWeight: '900' },
  content: { paddingBottom: 116, paddingHorizontal: 18, paddingTop: 20 },
  count: { color: academicColors.muted, fontSize: 12, fontWeight: '700' },
  deleteButton: { justifyContent: 'center', minHeight: 34, paddingHorizontal: 7 },
  deleteText: { color: academicColors.danger, fontSize: 11, fontWeight: '800' },
  documentActions: { borderTopColor: academicColors.line, borderTopWidth: 1, flexDirection: 'row', flexWrap: 'wrap', marginTop: 13, paddingTop: 8 },
  documentCard: { flex: 1, marginBottom: 11, minWidth: 0, padding: 15 },
  documentCardList: { width: '100%' },
  documentFolder: { color: academicColors.violet, fontSize: 11, fontWeight: '800', marginTop: 6 },
  documentMeta: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 13 },
  documentOpen: { minHeight: 84 },
  documentPreview: { color: academicColors.muted, fontSize: 12, lineHeight: 18, marginTop: 7 },
  documentTitle: { color: academicColors.ink, fontSize: 15, fontWeight: '900', lineHeight: 20, marginTop: 14 },
  documentTop: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  documentType: { alignItems: 'center', backgroundColor: '#E8EBFF', borderRadius: 12, height: 41, justifyContent: 'center', width: 41 },
  favorite: { color: '#AAB1C1', fontSize: 21, lineHeight: 25 },
  favoriteActive: { color: '#E4A300' },
  favoriteButton: { alignItems: 'center', height: 34, justifyContent: 'center', width: 34 },
  filter: { backgroundColor: '#FFFFFF', borderColor: academicColors.line, borderRadius: 999, borderWidth: 1, justifyContent: 'center', marginRight: 8, minHeight: 36, paddingHorizontal: 12 },
  filterActive: { backgroundColor: academicColors.indigo, borderColor: academicColors.indigo },
  filterText: { color: academicColors.muted, fontSize: 12, fontWeight: '800' },
  filterTextActive: { color: '#FFFFFF' },
  filters: { paddingBottom: 17, paddingRight: 18 },
  gridRow: { gap: 11, justifyContent: 'space-between' },
  header: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 18 },
  headerCopy: { flex: 1, paddingRight: 10 },
  listHeading: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 11 },
  listTitle: { color: academicColors.ink, fontSize: 20, fontWeight: '900', letterSpacing: -0.3 },
  metaText: { color: academicColors.muted, fontSize: 10, fontWeight: '700' },
  overline: { color: academicColors.violet, fontSize: 11, fontWeight: '900', letterSpacing: 0.9 },
  renameBox: { borderTopColor: academicColors.line, borderTopWidth: 1, marginTop: 13, paddingTop: 11 },
  renameInput: { backgroundColor: '#F9FAFE', borderColor: academicColors.line, borderRadius: 10, borderWidth: 1, color: academicColors.ink, fontSize: 13, marginBottom: 8, minHeight: 40, paddingHorizontal: 10 },
  screen: { backgroundColor: academicColors.canvas },
  searchBox: { alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: academicColors.line, borderRadius: 12, borderWidth: 1, flex: 1, flexDirection: 'row', minHeight: 46, paddingHorizontal: 12 },
  searchInput: { color: academicColors.ink, flex: 1, fontSize: 14, minHeight: 45, paddingLeft: 8 },
  searchRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  sortButton: { alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: academicColors.line, borderRadius: 12, borderWidth: 1, justifyContent: 'center', minWidth: 74, paddingHorizontal: 8 },
  sortText: { color: academicColors.ink, fontSize: 11, fontWeight: '800' },
  subtitle: { color: academicColors.muted, fontSize: 14, lineHeight: 20, marginTop: 7, maxWidth: 550 },
  templateCaption: { color: academicColors.muted, fontSize: 11, lineHeight: 15, marginTop: 4 },
  templateCard: { backgroundColor: '#FFFFFF', borderColor: academicColors.line, borderRadius: 15, borderWidth: 1, marginRight: 9, minHeight: 126, padding: 13, width: 142 },
  templateHeading: { color: academicColors.ink, fontSize: 14, fontWeight: '900', marginBottom: 10 },
  templateMark: { alignItems: 'center', backgroundColor: '#F0EBFF', borderRadius: 9, height: 29, justifyContent: 'center', width: 29 },
  templateMarkText: { color: academicColors.violet, fontSize: 15, fontWeight: '900' },
  templateName: { color: academicColors.ink, fontSize: 13, fontWeight: '900', marginTop: 9 },
  templateScroller: { paddingRight: 18 },
  templateWrap: { marginBottom: 18 },
  title: { color: academicColors.ink, fontSize: 31, fontWeight: '900', letterSpacing: -0.9, lineHeight: 38, marginTop: 4 },
  viewButton: { alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: academicColors.line, borderRadius: 12, borderWidth: 1, justifyContent: 'center', width: 46 },
  viewText: { color: academicColors.indigo, fontSize: 19, fontWeight: '900' },
});
