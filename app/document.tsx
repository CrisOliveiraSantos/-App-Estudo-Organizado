import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import * as ImagePicker from 'expo-image-picker';
import { ScreenContainer } from '@/components/screen-container';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { AcademicButton, AcademicPill, academicColors } from '@/components/academic/design-system';
import { type RichBlock, useStudy } from '@/lib/study-store';
import { useColors } from '@/hooks/use-colors';
import { applyTextFormat, type TextFormat } from '@/lib/editor-formatting';
import { exportTextDocument, shareTextDocument } from '@/lib/document-export';

type RibbonTab = 'Arquivo' | 'Página inicial' | 'Inserir' | 'Layout' | 'Referências' | 'Revisão' | 'Exibir' | 'Ajuda';

const newBlock = (type: RichBlock['type'], text = '', data = ''): RichBlock => ({ id: `${Date.now()}-${Math.random()}`, type, text, data });
const formattingLabels: Record<TextFormat, string> = { bold: 'Negrito aplicado', italic: 'Itálico aplicado', underline: 'Sublinhado aplicado', strike: 'Tachado aplicado', highlight: 'Destaque aplicado', 'bullet-list': 'Lista com marcadores criada', 'numbered-list': 'Lista numerada criada' };
const ribbonTabs: RibbonTab[] = ['Arquivo', 'Página inicial', 'Inserir', 'Layout', 'Referências', 'Revisão', 'Exibir', 'Ajuda'];

export default function EditorScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { notes, folders, saveNote, duplicateNote, deleteNote } = useStudy();
  const colors = useColors();
  const requestedNoteId = Array.isArray(id) ? id[0] : id;
  const existing = notes.find(note => note.id === requestedNoteId);
  const noteId = useMemo(() => existing?.id ?? requestedNoteId ?? `note-${Date.now()}`, [existing?.id, requestedNoteId]);
  const editorInputRef = useRef<TextInput>(null);
  const [title, setTitle] = useState(existing?.title ?? 'Novo documento');
  const [content, setContent] = useState(existing?.content ?? '');
  const [folder, setFolder] = useState(existing?.folder ?? folders[0]?.name ?? 'Sem pasta');
  const [blocks, setBlocks] = useState<RichBlock[]>(existing?.blocks ?? []);
  const [savedAt, setSavedAt] = useState(existing?.updatedAt ?? 'Rascunho');
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  const [formattingHint, setFormattingHint] = useState('Selecione um trecho ou posicione o cursor para escrever.');
  const [activeTab, setActiveTab] = useState<RibbonTab>('Página inicial');
  const [fontSize, setFontSize] = useState(16);
  const [history, setHistory] = useState<{ title: string; content: string; folder: string; blocks: RichBlock[] }[]>([{ title: existing?.title ?? 'Novo documento', content: existing?.content ?? '', folder: existing?.folder ?? folders[0]?.name ?? 'Sem pasta', blocks: existing?.blocks ?? [] }]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const restoringHistory = useRef(false);

  useEffect(() => {
    if (!existing) return;
    setTitle(existing.title); setContent(existing.content); setFolder(existing.folder); setBlocks(existing.blocks ?? []); setSavedAt(existing.updatedAt);
    // A troca de documento é identificada pelo ID para não reiniciar a digitação em curso.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existing?.id]);

  const persist = () => {
    saveNote({ id: noteId, title: title.trim() || 'Sem título', content, folder, updatedAt: 'Agora', kind: existing?.kind ?? 'note', blocks, images: blocks.filter(block => block.type === 'image').map(block => block.data ?? '') });
    setSavedAt('Salvo agora');
  };
  useEffect(() => {
    const snapshot = { title, content, folder, blocks };
    const encoded = JSON.stringify(snapshot);
    if (restoringHistory.current) { restoringHistory.current = false; return; }
    setHistory(current => { const previous = current[current.length - 1]; if (previous && JSON.stringify(previous) === encoded) return current; const next = [...current.slice(0, historyIndex + 1), snapshot].slice(-40); setHistoryIndex(next.length - 1); return next; });
  }, [title, content, folder, blocks, historyIndex]);
  const jumpHistory = (target: number) => { const snapshot = history[target]; if (!snapshot) return; restoringHistory.current = true; setTitle(snapshot.title); setContent(snapshot.content); setFolder(snapshot.folder); setBlocks(snapshot.blocks); setHistoryIndex(target); };
  useEffect(() => { const timer = setTimeout(() => { if (title.trim() || content.trim() || blocks.length) persist(); }, 900); return () => clearTimeout(timer); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, content, folder, blocks]);

  const formatSelection = (format: TextFormat) => { const result = applyTextFormat(content, selection, format); setContent(result.text); setSelection(result.selection); setFormattingHint(formattingLabels[format]); setTimeout(() => editorInputRef.current?.focus(), 0); };
  const addStyle = (type: RichBlock['type'], text: string) => setBlocks(current => [...current, newBlock(type, text)]);
  const duplicateCurrent = () => { const duplicatedId = duplicateNote(noteId); if (duplicatedId) Alert.alert('Documento duplicado', 'Uma cópia foi criada em Meus documentos.'); };
  const deleteCurrent = () => { const remove = () => { deleteNote(noteId); router.replace('/editor'); }; if (Platform.OS === 'web' && typeof window !== 'undefined') { if (window.confirm(`Excluir “${title.trim() || 'este documento'}”? Esta ação não pode ser desfeita.`)) remove(); return; } Alert.alert('Excluir documento?', 'Esta ação não pode ser desfeita.', [{ text: 'Cancelar', style: 'cancel' }, { text: 'Excluir', style: 'destructive', onPress: remove }]); };
  const addTable = () => setBlocks(current => [...current, newBlock('table', 'Tabela de revisão', JSON.stringify({ rows: [['Tópico', 'O que entendi', 'Revisar'], ['Conceito', 'Escrever aqui', 'Não']] }))]);
  const addChart = () => setBlocks(current => [...current, newBlock('chart', 'Progresso do estudo', JSON.stringify({ labels: ['Teoria', 'Prática', 'Revisão'], values: [70, 45, 30] }))]);
  const addImage = async () => { const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85 }); if (!result.canceled) setBlocks(current => [...current, newBlock('image', 'Imagem de estudo', result.assets[0].uri)]); };
  const nextFolder = folders[(folders.findIndex(item => item.name === folder) + 1) % Math.max(folders.length, 1)]?.name ?? 'Sem pasta';
  const words = content.trim() ? content.trim().split(/\s+/).length : 0;
  const exportCurrent = async () => {
    try {
      const result = await exportTextDocument({ title, content, blocks });
      Alert.alert('Exportação concluída', result.message);
    } catch {
      Alert.alert('Não foi possível exportar', 'Tente novamente. Seus dados continuam salvos no documento.');
    }
  };
  const shareCurrent = async () => {
    try {
      const result = await shareTextDocument({ title, content, blocks });
      if (!result.available) Alert.alert('Compartilhamento indisponível', result.message);
    } catch {
      Alert.alert('Não foi possível compartilhar', 'Tente exportar o arquivo .txt ou use outro navegador.');
    }
  };

  return <ScreenContainer edges={['top', 'bottom', 'left', 'right']} style={styles.screen}>
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.fill}>
      <View style={styles.commandHeader}>
        <TouchableOpacity onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Voltar para Meus documentos" style={styles.backButton}><Text style={styles.backArrow}>←</Text><Text style={styles.backLabel}>Documentos</Text></TouchableOpacity>
        <View style={styles.commandTitleWrap}><Text numberOfLines={1} style={styles.commandTitle}>{title.trim() || 'Sem título'}</Text><View style={styles.savedRow}><View style={styles.savedDot} /><Text style={styles.savedText}>{savedAt === 'Rascunho' ? 'Rascunho em edição' : `Salvo automaticamente · ${savedAt.replace('Salvo ', '')}`}</Text></View></View>
        <View style={styles.headerActions}><TouchableOpacity disabled={historyIndex === 0} onPress={() => jumpHistory(historyIndex - 1)} accessibilityRole="button" accessibilityLabel="Desfazer" style={[styles.historyButton, historyIndex === 0 && styles.disabled]}><Text style={styles.historyText}>↶</Text></TouchableOpacity><TouchableOpacity disabled={historyIndex >= history.length - 1} onPress={() => jumpHistory(historyIndex + 1)} accessibilityRole="button" accessibilityLabel="Refazer" style={[styles.historyButton, historyIndex >= history.length - 1 && styles.disabled]}><Text style={styles.historyText}>↷</Text></TouchableOpacity><AcademicButton label="Salvar" onPress={persist} compact /></View>
      </View>

      <View style={styles.ribbonShell}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.ribbonTabs}>{ribbonTabs.map(tab => <TouchableOpacity key={tab} onPress={() => setActiveTab(tab)} accessibilityRole="tab" accessibilityState={{ selected: activeTab === tab }} style={[styles.ribbonTab, activeTab === tab && styles.ribbonTabActive]}><Text style={[styles.ribbonTabText, activeTab === tab && styles.ribbonTabTextActive]}>{tab}</Text></TouchableOpacity>)}</ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.toolbar}>{activeTab === 'Página inicial' ? <>
          <Tool label="N" caption="Negrito" onPress={() => formatSelection('bold')} weight="bold" /><Tool label="I" caption="Itálico" onPress={() => formatSelection('italic')} italic /><Tool label="S" caption="Sublinhar" onPress={() => formatSelection('underline')} underline /><Tool label="abc" caption="Tachado" onPress={() => formatSelection('strike')} strike /><Tool label="▰" caption="Destaque" onPress={() => formatSelection('highlight')} highlight /><ToolbarDivider /><Tool label="•" caption="Lista" onPress={() => formatSelection('bullet-list')} /><Tool label="1." caption="Numerada" onPress={() => formatSelection('numbered-list')} /><Tool label="T1" caption="Título" onPress={() => addStyle('heading', 'Título da seção')} /><ToolbarDivider /><Tool label="A−" caption="Diminuir" onPress={() => setFontSize(size => Math.max(13, size - 1))} /><Tool label="A+" caption="Aumentar" onPress={() => setFontSize(size => Math.min(24, size + 1))} />
        </> : activeTab === 'Inserir' ? <><Tool label="T" caption="Título" onPress={() => addStyle('heading', 'Título da seção')} /><Tool label="❝" caption="Citação" onPress={() => addStyle('quote', 'Uma ideia importante para lembrar…')} /><Tool label="</>" caption="Código" onPress={() => addStyle('code', 'const estudo = true;')} /><ToolbarDivider /><Tool label="▦" caption="Tabela" onPress={addTable} /><Tool label="▧" caption="Imagem" onPress={() => { void addImage(); }} /><Tool label="▥" caption="Gráfico" onPress={addChart} /></> : activeTab === 'Arquivo' ? <><Tool label="▣" caption="Trocar pasta" onPress={() => setFolder(nextFolder)} /><Tool label="⧉" caption="Duplicar" onPress={duplicateCurrent} /><Tool label="⎙" caption="Copiar texto" onPress={() => { void Clipboard.setStringAsync(content); Alert.alert('Copiado', 'O texto foi copiado para a área de transferência.'); }} /><ToolbarDivider /><Tool label="⇧" caption="Compartilhar" onPress={() => { void shareCurrent(); }} /><Tool label="⇩" caption="Exportar .txt" onPress={() => { void exportCurrent(); }} /><ToolbarDivider /><Tool label="×" caption="Excluir" onPress={deleteCurrent} danger /></> : <View style={styles.contextHint}><Text style={styles.contextHintTitle}>{activeTab}</Text><Text style={styles.contextHintText}>{activeTab === 'Layout' ? 'A folha ajusta a leitura com um tamanho de texto confortável.' : activeTab === 'Referências' ? 'Use citações e blocos de texto para registrar suas fontes.' : activeTab === 'Revisão' ? 'Use desfazer, refazer e a revisão dos seus blocos antes de concluir.' : activeTab === 'Exibir' ? 'A página foi organizada para leitura e escrita sem distrações.' : 'Selecione um menu acima para acessar os recursos disponíveis.'}</Text></View>}</ScrollView>
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.workspace}>
        <View style={styles.documentTopline}><View style={styles.folderChip}><IconSymbol name="folder.fill" size={15} color={academicColors.indigo} /><Text style={styles.folderText}>{folder}</Text><TouchableOpacity onPress={() => setFolder(nextFolder)} accessibilityRole="button" accessibilityLabel="Trocar pasta" style={styles.folderAction}><Text style={styles.folderActionText}>Trocar</Text></TouchableOpacity></View><Text style={styles.statusText}>{formattingHint}</Text></View>
        <View style={styles.ruler}>{Array.from({ length: 11 }, (_, index) => <View key={index} style={styles.rulerUnit}><View style={[styles.rulerTick, index % 2 === 0 && styles.rulerTickLong]} /><Text style={styles.rulerNumber}>{index}</Text></View>)}</View>
        <View style={styles.paper}>
          <TextInput value={title} onChangeText={setTitle} placeholder="Título do documento" placeholderTextColor="#8C95AA" style={styles.titleInput} accessibilityLabel="Título do documento" />
          <View style={styles.paperRule} />
          <TextInput ref={editorInputRef} value={content} onChangeText={setContent} selection={selection} onSelectionChange={({ nativeEvent }) => setSelection(nativeEvent.selection)} multiline textAlignVertical="top" placeholder="Escreva, cole e organize seu conhecimento…" placeholderTextColor="#8C95AA" style={[styles.editorInput, { fontSize, lineHeight: Math.round(fontSize * 1.58) }]} accessibilityLabel="Área de escrita do documento" />
          {blocks.length ? <View style={styles.blocksArea}><Text style={styles.blocksHeading}>ELEMENTOS INSERIDOS</Text>{blocks.map(block => <RichBlockView key={block.id} block={block} colors={colors} onRemove={() => setBlocks(current => current.filter(item => item.id !== block.id))} onChange={next => setBlocks(current => current.map(item => item.id === next.id ? next : item))} />)}</View> : <View style={styles.paperPrompt}><Text style={styles.paperPromptTitle}>Comece sua escrita</Text><Text style={styles.paperPromptText}>Use os menus acima para formatar trechos ou inserir tabela, imagem, gráfico e outros elementos.</Text></View>}
        </View>
      </ScrollView>
      <View style={styles.statusBar}><Text style={styles.statusBarText}>Página 1</Text><Text style={styles.statusBarText}>{words} {words === 1 ? 'palavra' : 'palavras'}</Text><Text style={styles.statusBarText}>{blocks.length} {blocks.length === 1 ? 'elemento' : 'elementos'}</Text><View style={styles.statusSpacer} /><AcademicPill label="Português (Brasil)" tone="neutral" /><Text style={styles.zoomText}>{fontSize}px</Text></View>
    </KeyboardAvoidingView>
  </ScreenContainer>;
}

function Tool({ label, caption, onPress, weight, italic, underline, strike, highlight, danger = false }: { label: string; caption: string; onPress: () => void; weight?: 'bold'; italic?: boolean; underline?: boolean; strike?: boolean; highlight?: boolean; danger?: boolean }) { return <TouchableOpacity onPress={onPress} accessibilityRole="button" accessibilityLabel={caption} style={styles.tool}><Text style={[styles.toolLabel, weight && styles.toolBold, italic && styles.toolItalic, underline && styles.toolUnderline, strike && styles.toolStrike, highlight && styles.toolHighlight, danger && styles.toolDanger]}>{label}</Text><Text style={[styles.toolCaption, danger && styles.toolCaptionDanger]}>{caption}</Text></TouchableOpacity>; }
function ToolbarDivider() { return <View style={styles.toolbarDivider} />; }

function RichBlockView({ block, colors, onRemove, onChange }: { block: RichBlock; colors: ReturnType<typeof useColors>; onRemove: () => void; onChange: (block: RichBlock) => void }) {
  const removeButton = <TouchableOpacity onPress={onRemove} accessibilityRole="button"><Text style={styles.removeBlock}>Remover</Text></TouchableOpacity>;
  if (block.type === 'image') return <View style={styles.richCard}><View style={styles.richCardHeader}><Text style={styles.richTitle}>Imagem de estudo</Text>{removeButton}</View><Image source={{ uri: block.data }} style={styles.blockImage} resizeMode="cover" /><Text style={styles.richCaption}>Imagem incorporada ao documento</Text></View>;
  if (block.type === 'table') { let rows: string[][] = []; try { rows = JSON.parse(block.data ?? '{}').rows ?? []; } catch { rows = []; } return <View style={styles.richCard}><View style={styles.richCardHeader}><Text style={styles.richTitle}>{block.text}</Text>{removeButton}</View><View style={styles.blockActions}><SmallBlockAction label="+ Linha" onPress={() => onChange({ ...block, data: JSON.stringify({ rows: [...rows, Array(rows[0]?.length ?? 3).fill('Nova célula')] }) })} /><SmallBlockAction label="+ Coluna" onPress={() => onChange({ ...block, data: JSON.stringify({ rows: rows.map(row => [...row, 'Nova célula']) }) })} /></View>{rows.map((row, rowIndex) => <View key={rowIndex} style={styles.tableRow}>{row.map((cell, index) => <TextInput key={index} value={cell} onChangeText={value => { const nextRows = rows.map((currentRow, rowPosition) => currentRow.map((currentCell, cellPosition) => rowPosition === rowIndex && cellPosition === index ? value : currentCell)); onChange({ ...block, data: JSON.stringify({ rows: nextRows }) }); }} placeholder="Célula" placeholderTextColor={colors.muted} style={[styles.tableCell, rowIndex === 0 && styles.tableHeader]} />)}</View>)}</View>; }
  if (block.type === 'chart') { let chart = { labels: [], values: [] } as { labels: string[]; values: number[] }; try { chart = JSON.parse(block.data ?? '{}'); } catch { /* mantém estado vazio */ } const max = Math.max(...chart.values, 1); return <View style={styles.richCard}><View style={styles.richCardHeader}><Text style={styles.richTitle}>{block.text}</Text>{removeButton}</View><SmallBlockAction label="+ Dado no gráfico" onPress={() => onChange({ ...block, data: JSON.stringify({ labels: [...chart.labels, 'Novo dado'], values: [...chart.values, 0] }) })} />{chart.labels.map((label, index) => <View key={`${block.id}-${index}`} style={styles.chartRow}><View style={styles.chartInputs}><TextInput value={label} onChangeText={value => { const labels = [...chart.labels]; labels[index] = value; onChange({ ...block, data: JSON.stringify({ labels, values: chart.values }) }); }} style={styles.chartLabelInput} /><TextInput value={String(chart.values[index] ?? 0)} keyboardType="numeric" onChangeText={value => { const values = [...chart.values]; values[index] = Number(value.replace(/[^0-9]/g, '')) || 0; onChange({ ...block, data: JSON.stringify({ labels: chart.labels, values }) }); }} style={styles.chartValueInput} /></View><View style={styles.chartTrack}><View style={[styles.chartFill, { width: `${((chart.values[index] ?? 0) / max) * 100}%` }]} /></View></View>)}</View>; }
  return <View style={[styles.richCard, block.type === 'quote' && styles.quoteCard]}><View style={styles.richCardHeader}><Text style={styles.blockType}>{block.type}</Text>{removeButton}</View><Text style={[styles.blockText, block.type === 'heading' && styles.blockHeading, block.type === 'code' && styles.blockCode, block.type === 'quote' && styles.blockQuote]}>{block.type === 'bullet' ? `• ${block.text}` : block.text}</Text></View>;
}

function SmallBlockAction({ label, onPress }: { label: string; onPress: () => void }) { return <TouchableOpacity onPress={onPress} accessibilityRole="button" style={styles.smallBlockAction}><Text style={styles.smallBlockActionText}>{label}</Text></TouchableOpacity>; }

const styles = StyleSheet.create({
  backArrow: { color: academicColors.indigo, fontSize: 19, fontWeight: '700', marginRight: 5 },
  backButton: { alignItems: 'center', flexDirection: 'row', minHeight: 40, minWidth: 93 },
  backLabel: { color: academicColors.indigo, fontSize: 13, fontWeight: '800' },
  blockActions: { flexDirection: 'row', gap: 7, marginBottom: 10 },
  blockCode: { backgroundColor: '#1A2030', borderRadius: 8, color: '#E5E7F2', fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }), fontSize: 13, padding: 11 },
  blockHeading: { color: academicColors.ink, fontSize: 20, fontWeight: '900', lineHeight: 27 },
  blockImage: { borderRadius: 10, height: 190, width: '100%' },
  blockQuote: { color: academicColors.indigo, fontStyle: 'italic', fontSize: 15, lineHeight: 23 },
  blockText: { color: academicColors.ink, fontSize: 15, lineHeight: 23 },
  blockType: { color: academicColors.muted, fontSize: 10, fontWeight: '900', letterSpacing: 0.7, textTransform: 'uppercase' },
  blocksArea: { marginTop: 18 },
  blocksHeading: { color: academicColors.muted, fontSize: 10, fontWeight: '900', letterSpacing: 0.8, marginBottom: 10 },
  chartFill: { backgroundColor: academicColors.violet, borderRadius: 99, height: '100%' },
  chartInputs: { flexDirection: 'row', gap: 8 },
  chartLabelInput: { backgroundColor: '#F7F8FD', borderColor: academicColors.line, borderRadius: 8, borderWidth: 1, color: academicColors.ink, flex: 1, fontSize: 12, minHeight: 35, paddingHorizontal: 8 },
  chartRow: { marginTop: 10 },
  chartTrack: { backgroundColor: '#E9ECF5', borderRadius: 99, height: 7, marginTop: 7, overflow: 'hidden' },
  chartValueInput: { backgroundColor: '#F7F8FD', borderColor: academicColors.line, borderRadius: 8, borderWidth: 1, color: academicColors.ink, fontSize: 12, minHeight: 35, paddingHorizontal: 8, textAlign: 'center', width: 55 },
  commandHeader: { alignItems: 'center', backgroundColor: '#FFFFFF', borderBottomColor: academicColors.line, borderBottomWidth: 1, flexDirection: 'row', minHeight: 60, paddingHorizontal: 16 },
  commandTitle: { color: academicColors.ink, fontSize: 14, fontWeight: '900' },
  commandTitleWrap: { flex: 1, minWidth: 0, paddingHorizontal: 8 },
  contextHint: { justifyContent: 'center', maxWidth: 400, minHeight: 72, paddingHorizontal: 4 },
  contextHintText: { color: academicColors.muted, fontSize: 12, lineHeight: 17, marginTop: 2 },
  contextHintTitle: { color: academicColors.ink, fontSize: 13, fontWeight: '900' },
  disabled: { opacity: 0.35 },
  documentTopline: { alignItems: 'center', alignSelf: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10, maxWidth: 850, width: '100%' },
  editorInput: { color: academicColors.ink, flex: 1, fontSize: 16, minHeight: 340, padding: 0, textAlignVertical: 'top' },
  fill: { flex: 1 },
  folderAction: { marginLeft: 4, minHeight: 30, paddingHorizontal: 6, justifyContent: 'center' },
  folderActionText: { color: academicColors.indigo, fontSize: 11, fontWeight: '900' },
  folderChip: { alignItems: 'center', backgroundColor: '#F3F1FF', borderRadius: 999, flexDirection: 'row', minHeight: 31, paddingHorizontal: 10 },
  folderText: { color: academicColors.indigo, fontSize: 11, fontWeight: '800', marginLeft: 5 },
  headerActions: { alignItems: 'center', flexDirection: 'row', gap: 2 },
  historyButton: { alignItems: 'center', height: 39, justifyContent: 'center', width: 31 },
  historyText: { color: academicColors.ink, fontSize: 20, fontWeight: '700' },
  paper: { alignSelf: 'center', backgroundColor: '#FFFFFF', borderColor: '#E1E5EF', borderRadius: 4, borderWidth: 1, maxWidth: 850, minHeight: 650, paddingHorizontal: 34, paddingVertical: 32, shadowColor: '#111827', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.045, shadowRadius: 14, width: '100%' },
  paperPrompt: { alignItems: 'center', backgroundColor: '#FAFBFF', borderColor: '#E8EBF4', borderRadius: 12, borderStyle: 'dashed', borderWidth: 1, marginTop: 16, padding: 18 },
  paperPromptText: { color: academicColors.muted, fontSize: 12, lineHeight: 18, marginTop: 4, textAlign: 'center' },
  paperPromptTitle: { color: academicColors.ink, fontSize: 13, fontWeight: '900' },
  paperRule: { backgroundColor: '#E9ECF4', height: 1, marginBottom: 18 },
  removeBlock: { color: academicColors.danger, fontSize: 11, fontWeight: '900' },
  richCaption: { color: academicColors.muted, fontSize: 11, marginTop: 7 },
  richCard: { backgroundColor: '#FBFCFF', borderColor: '#E4E8F2', borderRadius: 12, borderWidth: 1, marginBottom: 10, padding: 13 },
  richCardHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 9 },
  richTitle: { color: academicColors.ink, fontSize: 14, fontWeight: '900' },
  quoteCard: { borderLeftColor: academicColors.violet, borderLeftWidth: 4 },
  ribbonShell: { backgroundColor: '#FFFFFF', borderBottomColor: academicColors.line, borderBottomWidth: 1 },
  ribbonTab: { borderBottomColor: 'transparent', borderBottomWidth: 2, minHeight: 38, justifyContent: 'center', marginRight: 16 },
  ribbonTabActive: { borderBottomColor: academicColors.violet },
  ribbonTabText: { color: academicColors.muted, fontSize: 12, fontWeight: '700' },
  ribbonTabTextActive: { color: academicColors.violet, fontWeight: '900' },
  ribbonTabs: { paddingHorizontal: 18 },
  ruler: { alignSelf: 'center', backgroundColor: '#EEF0F7', borderColor: '#E1E5EF', borderRadius: 4, borderWidth: 1, flexDirection: 'row', height: 26, marginBottom: 10, maxWidth: 850, overflow: 'hidden', width: '100%' },
  rulerNumber: { color: '#A2A9BA', fontSize: 8, marginTop: 1 },
  rulerTick: { backgroundColor: '#BFC6D5', height: 5, width: 1 },
  rulerTickLong: { height: 9 },
  rulerUnit: { alignItems: 'center', flex: 1, paddingTop: 2 },
  savedDot: { backgroundColor: academicColors.success, borderRadius: 4, height: 6, marginRight: 4, width: 6 },
  savedRow: { alignItems: 'center', flexDirection: 'row', marginTop: 2 },
  savedText: { color: academicColors.muted, fontSize: 10, fontWeight: '600' },
  screen: { backgroundColor: '#F8F9FA' },
  smallBlockAction: { backgroundColor: '#F3F1FF', borderColor: '#DDD4FF', borderRadius: 8, borderWidth: 1, minHeight: 31, justifyContent: 'center', paddingHorizontal: 9 },
  smallBlockActionText: { color: academicColors.indigo, fontSize: 11, fontWeight: '900' },
  statusBar: { alignItems: 'center', backgroundColor: '#FFFFFF', borderTopColor: academicColors.line, borderTopWidth: 1, flexDirection: 'row', gap: 13, minHeight: 38, paddingHorizontal: 16 },
  statusBarText: { color: academicColors.muted, fontSize: 10, fontWeight: '700' },
  statusSpacer: { flex: 1 },
  statusText: { color: academicColors.muted, flex: 1, fontSize: 11, lineHeight: 15, paddingLeft: 10, textAlign: 'right' },
  tableCell: { borderRightColor: '#E2E6F0', borderRightWidth: 1, color: academicColors.ink, flex: 1, fontSize: 12, minHeight: 38, paddingHorizontal: 7, paddingVertical: 5 },
  tableHeader: { backgroundColor: '#F0EBFF', color: academicColors.ink, fontWeight: '900' },
  tableRow: { borderBottomColor: '#E2E6F0', borderBottomWidth: 1, flexDirection: 'row' },
  titleInput: { color: academicColors.ink, fontSize: 27, fontWeight: '900', lineHeight: 35, marginBottom: 15, padding: 0 },
  tool: { alignItems: 'center', borderRadius: 8, justifyContent: 'center', minHeight: 67, minWidth: 61, paddingHorizontal: 8 },
  toolBold: { fontWeight: '900' },
  toolCaption: { color: academicColors.muted, fontSize: 9, fontWeight: '700', marginTop: 4 },
  toolCaptionDanger: { color: academicColors.danger },
  toolDanger: { color: academicColors.danger },
  toolHighlight: { backgroundColor: '#FFF0A6', borderRadius: 3, paddingHorizontal: 2 },
  toolItalic: { fontStyle: 'italic' },
  toolLabel: { color: academicColors.ink, fontSize: 15, fontWeight: '700' },
  toolStrike: { textDecorationLine: 'line-through' },
  toolUnderline: { textDecorationLine: 'underline' },
  toolbar: { alignItems: 'center', minHeight: 76, paddingHorizontal: 16 },
  toolbarDivider: { backgroundColor: academicColors.line, height: 41, marginHorizontal: 7, width: 1 },
  workspace: { paddingBottom: 34, paddingHorizontal: 18, paddingTop: 13 },
  zoomText: { color: academicColors.muted, fontSize: 10, fontWeight: '800' },
});
