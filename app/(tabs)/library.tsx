import { useMemo, useState } from 'react';
import { Alert, FlatList, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { router } from 'expo-router';
import { trpc } from '@/lib/trpc';
import { ScreenContainer } from '@/components/screen-container';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { AcademicButton, AcademicCard, AcademicEmptyState, AcademicPill, academicColors } from '@/components/academic/design-system';
import { type Note, useStudy } from '@/lib/study-store';

type Filter = 'Todos' | 'Notas' | 'PDFs';

export default function LibraryScreen() {
  const { notes, folders, addPdf, addOcrDocument, addFolder, deleteNote, renameNote, moveNote } = useStudy();
  const ocrMutation = trpc.ocr.extract.useMutation();
  const [filter, setFilter] = useState<Filter>('Todos');
  const [query, setQuery] = useState('');
  const [folderName, setFolderName] = useState('');
  const [showFolderForm, setShowFolderForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState('');
  const pickPdf = async () => { const result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', copyToCacheDirectory: true }); if (!result.canceled) { const asset = result.assets[0]; const safeName = asset.name.replace(/[^a-zA-Z0-9._-]/g, '_'); const permanentUri = `${FileSystem.documentDirectory ?? FileSystem.cacheDirectory}${Date.now()}-${safeName}`; try { await FileSystem.copyAsync({ from: asset.uri, to: permanentUri }); addPdf(asset.name, permanentUri); Alert.alert('PDF importado', 'O arquivo foi copiado para o armazenamento persistente e está disponível para visualização.'); } catch { addPdf(asset.name, asset.uri); Alert.alert('PDF importado', 'O arquivo foi registrado. Se ele não abrir após reiniciar, importe-o novamente.'); } } };
  const pickImage = async () => { const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, selectionLimit: 10, quality: 1 }); if (!result.canceled) { try { const pages = []; for (const [index, asset] of result.assets.entries()) { const imageBase64 = await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.Base64 }); const recognized = await ocrMutation.mutateAsync({ imageBase64, mimeType: asset.mimeType ?? 'image/jpeg' }); pages.push({ id: `${Date.now()}-${index}`, pageNumber: index + 1, imageUri: asset.uri, extractedText: recognized.text || '[Nenhum texto legível]', ocrStatus: 'complete' as const }); } addOcrDocument(`Documento OCR — ${new Date().toLocaleDateString('pt-BR')}`, pages); Alert.alert('Documento reconhecido', `${pages.length} página(s) foram transcritas e salvas na Biblioteca.`); } catch { Alert.alert('OCR indisponível', 'Verifique sua conexão e tente novamente com imagens mais nítidas.'); } } };
  const shown = useMemo(() => notes.filter(note => (filter === 'Todos' || (filter === 'Notas' ? note.kind === 'note' : note.kind === 'pdf')) && [note.title, note.content, note.folder, note.selectedText].join(' ').toLowerCase().includes(query.toLowerCase())).sort((left, right) => left.title.localeCompare(right.title, 'pt-BR')), [notes, filter, query]);
  const finishRename = () => { if (editingId && draftTitle.trim()) renameNote(editingId, draftTitle.trim()); setEditingId(null); setDraftTitle(''); };
  const createFolder = () => { if (!folderName.trim()) return; addFolder(folderName.trim()); setFolderName(''); setShowFolderForm(false); };

  return <ScreenContainer style={styles.screen}>
    <FlatList
      data={shown}
      keyExtractor={item => item.id}
      contentContainerStyle={styles.content}
      ListHeaderComponent={<View>
        <View style={styles.header}><View style={styles.headerCopy}><Text style={styles.overline}>MATERIAIS DE ESTUDO</Text><Text style={styles.title}>Biblioteca</Text><Text style={styles.subtitle}>Guarde PDFs, textos reconhecidos e anotações importantes para revisar quando precisar.</Text></View><AcademicButton label="Novo texto" onPress={() => router.push('/editor')} compact /></View>
        <View style={styles.importGrid}><TouchableOpacity onPress={() => { void pickPdf(); }} accessibilityRole="button" accessibilityLabel="Importar PDF" activeOpacity={0.78} style={styles.importCard}><View style={[styles.importIcon, { backgroundColor: '#FDECEF' }]}><IconSymbol name="doc.text.fill" size={21} color={academicColors.danger} /></View><View style={styles.importCopy}><Text style={styles.importTitle}>Importar PDF</Text><Text style={styles.importDescription}>Guarde e consulte materiais em PDF.</Text></View><Text style={styles.importArrow}>→</Text></TouchableOpacity><TouchableOpacity onPress={() => { void pickImage(); }} accessibilityRole="button" accessibilityLabel="Extrair texto por OCR" activeOpacity={0.78} style={styles.importCard}><View style={[styles.importIcon, { backgroundColor: '#E8EBFF' }]}><IconSymbol name="photo" size={21} color={academicColors.indigo} /></View><View style={styles.importCopy}><Text style={styles.importTitle}>{ocrMutation.isPending ? 'Lendo imagens…' : 'Extrair texto (OCR)'}</Text><Text style={styles.importDescription}>Reconheça imagens ou páginas fotografadas.</Text></View><Text style={styles.importArrow}>→</Text></TouchableOpacity></View>
        <View style={styles.searchBox}><IconSymbol name="magnifyingglass" size={20} color={academicColors.muted} /><TextInput value={query} onChangeText={setQuery} placeholder="Buscar em títulos, pastas e texto reconhecido" placeholderTextColor={academicColors.muted} style={styles.searchInput} /></View>
        <View style={styles.filterBar}>{(['Todos', 'Notas', 'PDFs'] as Filter[]).map(item => <TouchableOpacity key={item} onPress={() => setFilter(item)} accessibilityRole="button" accessibilityState={{ selected: filter === item }} style={[styles.filter, filter === item && styles.filterActive]}><Text style={[styles.filterText, filter === item && styles.filterTextActive]}>{item}</Text></TouchableOpacity>)}</View>
        <View style={styles.folderHeader}><View><Text style={styles.sectionTitle}>Pastas</Text><Text style={styles.sectionDescription}>Mantenha seus materiais em um lugar fácil de encontrar.</Text></View><TouchableOpacity onPress={() => setShowFolderForm(value => !value)} accessibilityRole="button" style={styles.folderToggle}><Text style={styles.folderToggleText}>{showFolderForm ? 'Fechar' : '+ Nova pasta'}</Text></TouchableOpacity></View>
        {showFolderForm ? <AcademicCard style={styles.folderForm}><TextInput value={folderName} onChangeText={setFolderName} placeholder="Nome da nova pasta" placeholderTextColor={academicColors.muted} style={styles.input} /><AcademicButton label="Criar pasta" onPress={createFolder} compact /></AcademicCard> : null}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.folderScroller}>{folders.map(folder => <View key={folder.id} style={styles.folderChip}><IconSymbol name="folder.fill" size={15} color={academicColors.violet} /><Text style={styles.folderText}>{folder.name}</Text></View>)}{!folders.length ? <AcademicPill label="Sem pastas criadas" tone="neutral" /> : null}</ScrollView>
        <View style={styles.listHeader}><View><Text style={styles.sectionTitle}>Seus materiais</Text><Text style={styles.sectionDescription}>{shown.length} {shown.length === 1 ? 'item encontrado' : 'itens encontrados'}</Text></View><AcademicPill label={filter} tone="indigo" /></View>
      </View>}
      ListEmptyComponent={<AcademicEmptyState title={query ? 'Nenhum material encontrado' : 'Sua Biblioteca está pronta'} description={query ? 'Tente outro termo ou outro filtro.' : 'Importe um PDF, reconheça o texto de imagens ou crie uma nota para começar.'} actionLabel={query ? undefined : 'Importar PDF'} onAction={query ? undefined : () => { void pickPdf(); }} />}
      renderItem={({ item }) => <LibraryItem item={item} folders={folders.map(folder => folder.name)} editing={editingId === item.id} draftTitle={draftTitle} setDraftTitle={setDraftTitle} onOpen={() => router.push(item.kind === 'pdf' ? { pathname: '/pdf', params: { id: item.id } } : { pathname: '/document', params: { id: item.id } })} onRename={() => { setEditingId(item.id); setDraftTitle(item.title); }} onSaveRename={finishRename} onMove={() => moveNote(item.id, folders[(folders.findIndex(folder => folder.name === item.folder) + 1) % Math.max(folders.length, 1)]?.name ?? 'Sem pasta')} onDelete={() => { const remove = () => deleteNote(item.id); if (Platform.OS === 'web' && typeof window !== 'undefined') { if (window.confirm(`Excluir “${item.title}”? Esta ação não pode ser desfeita.`)) remove(); return; } Alert.alert('Excluir material?', 'Esta ação remove o material dos dados locais.', [{ text: 'Cancelar', style: 'cancel' }, { text: 'Excluir', style: 'destructive', onPress: remove }]); }} />}
    />
  </ScreenContainer>;
}

function LibraryItem({ item, editing, draftTitle, setDraftTitle, onOpen, onRename, onSaveRename, onMove, onDelete }: { item: Note; folders: string[]; editing: boolean; draftTitle: string; setDraftTitle: (value: string) => void; onOpen: () => void; onRename: () => void; onSaveRename: () => void; onMove: () => void; onDelete: () => void }) {
  const isPdf = item.kind === 'pdf';
  const ocrPages = item.pdfPages?.filter(page => page.ocrStatus === 'complete').length ?? 0;
  return <AcademicCard style={styles.materialCard}><TouchableOpacity onPress={onOpen} accessibilityRole="button" accessibilityLabel={`Abrir ${item.title}`} activeOpacity={0.76} style={styles.materialOpen}><View style={[styles.materialIcon, { backgroundColor: isPdf ? '#FDECEF' : '#E8EBFF' }]}><IconSymbol name={isPdf ? 'doc.text.fill' : 'note.text'} size={23} color={isPdf ? academicColors.danger : academicColors.indigo} /></View><View style={styles.materialCopy}><View style={styles.materialTitleRow}><Text numberOfLines={1} style={styles.materialTitle}>{item.title}</Text><AcademicPill label={isPdf ? 'PDF' : 'Nota'} tone={isPdf ? 'danger' : 'indigo'} /></View><Text style={styles.materialMeta}>{item.folder || 'Sem pasta'} · {item.updatedAt}</Text><Text numberOfLines={2} style={styles.materialPreview}>{item.content || (isPdf ? 'Material em PDF pronto para visualização.' : 'Documento vazio — toque para começar a escrever.')}</Text>{isPdf && ocrPages ? <Text style={styles.ocrLabel}>{ocrPages} {ocrPages === 1 ? 'página reconhecida' : 'páginas reconhecidas'} por OCR</Text> : null}</View><IconSymbol name="chevron.right" size={19} color={academicColors.muted} /></TouchableOpacity>{editing ? <View style={styles.renameBox}><TextInput value={draftTitle} onChangeText={setDraftTitle} autoFocus onSubmitEditing={onSaveRename} placeholder="Título do material" placeholderTextColor={academicColors.muted} style={styles.input} /><AcademicButton label="Salvar nome" onPress={onSaveRename} compact /></View> : <View style={styles.actions}><TouchableOpacity onPress={onRename} accessibilityRole="button" style={styles.action}><Text style={styles.actionText}>Renomear</Text></TouchableOpacity><TouchableOpacity onPress={onMove} accessibilityRole="button" style={styles.action}><Text style={styles.actionText}>Mover</Text></TouchableOpacity><TouchableOpacity onPress={onDelete} accessibilityRole="button" accessibilityLabel={`Excluir ${item.title}`} style={styles.deleteAction}><Text style={styles.deleteActionText}>Excluir</Text></TouchableOpacity></View>}</AcademicCard>;
}

const styles = StyleSheet.create({
  action: { minHeight: 34, justifyContent: 'center', paddingHorizontal: 7 },
  actionText: { color: academicColors.indigo, fontSize: 12, fontWeight: '800' },
  actions: { borderTopColor: academicColors.line, borderTopWidth: 1, flexDirection: 'row', marginTop: 13, paddingTop: 8 },
  content: { paddingBottom: 115, paddingHorizontal: 18, paddingTop: 20 },
  deleteAction: { minHeight: 34, justifyContent: 'center', paddingHorizontal: 7 },
  deleteActionText: { color: academicColors.danger, fontSize: 12, fontWeight: '800' },
  filter: { alignItems: 'center', borderRadius: 10, flex: 1, justifyContent: 'center', minHeight: 38 },
  filterActive: { backgroundColor: academicColors.indigo },
  filterBar: { backgroundColor: '#FFFFFF', borderColor: academicColors.line, borderRadius: 12, borderWidth: 1, flexDirection: 'row', marginBottom: 23, padding: 3 },
  filterText: { color: academicColors.muted, fontSize: 12, fontWeight: '800' },
  filterTextActive: { color: '#FFFFFF' },
  folderChip: { alignItems: 'center', backgroundColor: '#F0EBFF', borderRadius: 999, flexDirection: 'row', marginRight: 8, minHeight: 35, paddingHorizontal: 11 },
  folderForm: { marginBottom: 11, padding: 13 },
  folderHeader: { alignItems: 'flex-end', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 11 },
  folderScroller: { paddingBottom: 25, paddingRight: 18 },
  folderText: { color: academicColors.violet, fontSize: 12, fontWeight: '800', marginLeft: 5 },
  folderToggle: { minHeight: 34, justifyContent: 'center', paddingLeft: 10 },
  folderToggleText: { color: academicColors.indigo, fontSize: 12, fontWeight: '900' },
  header: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 18 },
  headerCopy: { flex: 1, paddingRight: 12 },
  importArrow: { color: academicColors.indigo, fontSize: 19, fontWeight: '700', marginLeft: 8 },
  importCard: { alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: academicColors.line, borderRadius: 16, borderWidth: 1, flex: 1, flexDirection: 'row', minHeight: 86, padding: 13 },
  importCopy: { flex: 1, paddingLeft: 10 },
  importDescription: { color: academicColors.muted, fontSize: 11, lineHeight: 15, marginTop: 3 },
  importGrid: { flexDirection: 'row', gap: 10, marginBottom: 15 },
  importIcon: { alignItems: 'center', borderRadius: 12, height: 39, justifyContent: 'center', width: 39 },
  importTitle: { color: academicColors.ink, fontSize: 13, fontWeight: '900', lineHeight: 17 },
  input: { backgroundColor: '#F9FAFE', borderColor: academicColors.line, borderRadius: 11, borderWidth: 1, color: academicColors.ink, fontSize: 14, marginBottom: 9, minHeight: 43, paddingHorizontal: 11 },
  listHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 11 },
  materialCard: { marginBottom: 10, padding: 14 },
  materialCopy: { flex: 1, minWidth: 0, paddingHorizontal: 11 },
  materialIcon: { alignItems: 'center', borderRadius: 13, height: 46, justifyContent: 'center', width: 46 },
  materialMeta: { color: academicColors.muted, fontSize: 11, marginTop: 3 },
  materialOpen: { alignItems: 'center', flexDirection: 'row' },
  materialPreview: { color: academicColors.muted, fontSize: 12, lineHeight: 17, marginTop: 7 },
  materialTitle: { color: academicColors.ink, flex: 1, fontSize: 15, fontWeight: '900', paddingRight: 7 },
  materialTitleRow: { alignItems: 'center', flexDirection: 'row' },
  ocrLabel: { color: academicColors.success, fontSize: 10, fontWeight: '800', marginTop: 6 },
  overline: { color: academicColors.violet, fontSize: 11, fontWeight: '900', letterSpacing: 0.9 },
  renameBox: { borderTopColor: academicColors.line, borderTopWidth: 1, marginTop: 13, paddingTop: 11 },
  screen: { backgroundColor: academicColors.canvas },
  searchBox: { alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: academicColors.line, borderRadius: 12, borderWidth: 1, flexDirection: 'row', marginBottom: 11, minHeight: 47, paddingHorizontal: 12 },
  searchInput: { color: academicColors.ink, flex: 1, fontSize: 14, minHeight: 46, paddingLeft: 8 },
  sectionDescription: { color: academicColors.muted, fontSize: 12, lineHeight: 17, marginTop: 3 },
  sectionTitle: { color: academicColors.ink, fontSize: 18, fontWeight: '900', letterSpacing: -0.2 },
  subtitle: { color: academicColors.muted, fontSize: 14, lineHeight: 20, marginTop: 7 },
  title: { color: academicColors.ink, fontSize: 31, fontWeight: '900', letterSpacing: -0.9, lineHeight: 38, marginTop: 4 },
});
