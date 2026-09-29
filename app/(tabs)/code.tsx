import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { AcademicButton, academicColors } from '@/components/academic/design-system';
import { CodeFile, CodeProject, DEFAULT_CODE_PROJECT, runEducationalExample, runSandboxCommand, updateProjectFile } from '@/lib/code-workspace';
import { trpc } from '@/lib/trpc';

const PROJECT_KEY = '@estudo-organizado/code-project-v1';
const AI_ACTIONS = [
  { id: 'explain', label: 'Explicar código', icon: '◌' },
  { id: 'ideas', label: 'Sugerir ideias', icon: '✦' },
  { id: 'tests', label: 'Criar testes', icon: '✓' },
  { id: 'review', label: 'Revisar trecho', icon: '⌁' },
] as const;

export default function CodeScreen() {
  const [project, setProject] = useState<CodeProject>(DEFAULT_CODE_PROJECT);
  const [selectedFileId, setSelectedFileId] = useState(DEFAULT_CODE_PROJECT.files[0].id);
  const [terminalInput, setTerminalInput] = useState('help');
  const [terminalLines, setTerminalLines] = useState<string[]>(['Terminal Cris · sandbox educacional segura', 'Digite help para ver comandos, run para testar e check para verificar o arquivo.']);
  const [aiMessage, setAiMessage] = useState('Olá, Cris. Posso explicar seu código, sugerir melhorias e criar exercícios. A IA local ainda será conectada em um Development Build Android.');
  const [savedAt, setSavedAt] = useState('Pronto para começar');
  const [isSustainable, setIsSustainable] = useState(true);
  const [crisMode, setCrisMode] = useState<'online' | 'local'>('local');
  const [executionOutput, setExecutionOutput] = useState('Pronto para executar o arquivo ativo.');
  const [isRunning, setIsRunning] = useState(false);
  const [executionStatus, setExecutionStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle');
  const [crisChatInput, setCrisChatInput] = useState('');
  const [crisChatMessages, setCrisChatMessages] = useState<{ role: 'user' | 'cris'; text: string }[]>([{ role: 'cris', text: 'Olá, Cris. Eu sou a Cris, sua mentora neste Espaço Código. Pergunte sobre programação, estudos ou sobre o arquivo aberto.' }]);
  const crisChatScrollRef = useRef<ScrollView>(null);
  const crisAsk = trpc.cris.ask.useMutation();

  const selectedFile = useMemo(() => project.files.find(file => file.id === selectedFileId) ?? project.files[0], [project.files, selectedFileId]);

  useEffect(() => {
    AsyncStorage.getItem(PROJECT_KEY).then(raw => {
      if (!raw) return;
      try {
        const stored = JSON.parse(raw) as CodeProject;
        if (stored?.files?.length) {
          setProject(stored);
          setSelectedFileId(stored.files[0].id);
        }
      } catch {
        // Mantém o laboratório inicial se o armazenamento estiver inválido.
      }
    });
  }, []);

  const persistProject = (next: CodeProject) => {
    setProject(next);
    setSavedAt('Salvando…');
    AsyncStorage.setItem(PROJECT_KEY, JSON.stringify(next)).then(() => setSavedAt('Salvo neste dispositivo'));
  };

  const onChangeContent = (content: string) => {
    if (!selectedFile) return;
    persistProject(updateProjectFile(project, selectedFile.id, content));
  };

  const runActiveFile = () => {
    if (!selectedFile) return;
    setIsRunning(true);
    setExecutionStatus('running');
    setExecutionOutput('Executando com segurança…');
    setTimeout(() => {
      const output = runEducationalExample(selectedFile);
      setExecutionOutput(output);
      setExecutionStatus(/Execução (?:didática )?concluída|Execução concluída/.test(output) ? 'success' : 'error');
      setTerminalLines(lines => [...lines, `$ run ${selectedFile.name}`, output].slice(-18));
      setIsRunning(false);
    }, 120);
  };

  const runCommand = () => {
    const output = runSandboxCommand(terminalInput, project);
    if (terminalInput.trim().startsWith('clear')) {
      setTerminalLines([]);
    } else {
      setTerminalLines(lines => [...lines, `$ ${terminalInput}`, output || ' '].slice(-18));
      if (terminalInput.trim().startsWith('run')) setExecutionOutput(output || 'Execução concluída.');
    }
    setTerminalInput('');
  };

  const askCris = async (action: typeof AI_ACTIONS[number]['id']) => {
    const messages: Record<typeof AI_ACTIONS[number]['id'], string> = {
      explain: `Posso explicar ${selectedFile?.name ?? 'este arquivo'} por partes: primeiro identifico os dados, depois as funções e por fim o resultado.`,
      ideas: 'Ideia de exercício: altere a função principal para receber uma lista de nomes e retorne uma saudação para cada pessoa.',
      tests: 'Sugestão de teste: verifique o caso normal, uma entrada vazia e uma entrada inesperada antes de executar qualquer alteração.',
      review: 'Revisão inicial: o arquivo está pronto para uma próxima etapa. Quando a IA local estiver conectada, farei uma análise do trecho selecionado.',
    };
    setAiMessage(messages[action]);
    setCrisMode('local');
    try {
      const response = await crisAsk.mutateAsync({
        action,
        fileName: selectedFile?.name,
        language: selectedFile?.language,
        code: selectedFile?.content ?? '',
      });
      setAiMessage(response.text);
      setCrisMode('online');
    } catch {
      // O fallback local permanece disponível quando a web está sem conexão.
    }
  };

  const sendCrisChat = async () => {
    const message = crisChatInput.trim();
    if (!message || crisAsk.isPending) return;
    setCrisChatInput('');
    setCrisChatMessages(messages => [...messages, { role: 'user', text: message }]);
    const localReply = 'Posso ajudar a entender este código, organizar seus estudos e sugerir próximos passos. No modo local, minhas respostas são orientações básicas; com conexão, tento consultar a Cris online.';
    setCrisChatMessages(messages => [...messages, { role: 'cris', text: localReply }]);
    setCrisMode('local');
    try {
      const response = await crisAsk.mutateAsync({ action: 'chat', message, code: selectedFile?.content ?? '', fileName: selectedFile?.name, language: selectedFile?.language });
      setCrisChatMessages(messages => [...messages, { role: 'cris', text: response.text }]);
      setCrisMode('online');
    } catch {
      // Mantém o retorno local, sem bloquear o chat de teste.
    }
  };

  const addFile = () => {
    const id = `file-${Date.now()}`;
    const file: CodeFile = { id, name: `exercicio-${project.files.length + 1}.ts`, language: 'typescript', content: '// Escreva seu exercício aqui\n', updatedAt: new Date().toISOString() };
    const next = { ...project, files: [...project.files, file], updatedAt: new Date().toISOString() };
    persistProject(next);
    setSelectedFileId(id);
  };

  return <ScreenContainer style={styles.screen}>
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>LABORATÓRIO · CRIS</Text>
          <Text style={styles.title}>Espaço Código</Text>
          <Text style={styles.subtitle}>Aprenda programação com um ambiente local, privado e seguro.</Text>
        </View>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} accessibilityRole="button"><Text style={styles.backText}>Voltar</Text></TouchableOpacity>
      </View>

      <View style={styles.safetyBanner}><Text style={styles.safetyIcon}>✓</Text><View style={styles.safetyCopy}><Text style={styles.safetyTitle}>Sandbox protegida</Text><Text style={styles.safetyText}>O terminal desta versão não acessa o sistema, a rede, segredos ou arquivos fora do projeto.</Text></View></View>

      <View style={styles.workspace}>
        <View style={styles.filesPanel}>
          <View style={styles.panelHeader}><View><Text style={styles.panelKicker}>PROJETO</Text><Text style={styles.panelTitle}>{project.name}</Text></View><TouchableOpacity onPress={addFile} style={styles.addButton} accessibilityRole="button"><Text style={styles.addButtonText}>+ Arquivo</Text></TouchableOpacity></View>
          <Text style={styles.projectDescription}>{project.description}</Text>
          {project.files.map(file => <TouchableOpacity key={file.id} onPress={() => setSelectedFileId(file.id)} style={[styles.fileRow, file.id === selectedFileId && styles.fileRowActive]} accessibilityRole="button"><Text style={styles.fileGlyph}>{file.language === 'markdown' ? 'M' : '{'}</Text><Text style={[styles.fileName, file.id === selectedFileId && styles.fileNameActive]}>{file.name}</Text></TouchableOpacity>)}
          <View style={styles.sustainabilityBox}><Text style={styles.sustainabilityTitle}>Uso responsável</Text><Text style={styles.sustainabilityText}>Otimizar bateria e armazenamento</Text><TouchableOpacity onPress={() => setIsSustainable(value => !value)} style={[styles.switch, isSustainable && styles.switchOn]} accessibilityRole="switch" accessibilityState={{ checked: isSustainable }}><View style={[styles.switchKnob, isSustainable && styles.switchKnobOn]} /></TouchableOpacity></View>
        </View>

        <View style={styles.editorPanel}>
          <View style={styles.editorTop}><View><Text style={styles.fileContext}>EDITOR · ARQUIVO ABERTO</Text><Text style={styles.editorTitle}>{selectedFile?.name ?? 'Nenhum arquivo'}</Text></View><View style={styles.editorActions}><Text style={styles.savedText}>{savedAt}</Text><TouchableOpacity onPress={runActiveFile} disabled={isRunning || !selectedFile} style={[styles.playButton, isRunning && styles.playButtonDisabled]} accessibilityRole="button" accessibilityLabel="Executar arquivo ativo"><Text style={styles.playButtonText}>{isRunning ? '…' : '▶ Play'}</Text></TouchableOpacity></View></View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabStrip}>{project.files.map(file => <TouchableOpacity key={file.id} onPress={() => setSelectedFileId(file.id)} style={[styles.fileTab, file.id === selectedFileId && styles.fileTabActive]} accessibilityRole="tab" accessibilityState={{ selected: file.id === selectedFileId }}><Text style={[styles.fileTabText, file.id === selectedFileId && styles.fileTabTextActive]}>{file.name}{file.id === selectedFileId ? ' •' : ''}</Text></TouchableOpacity>)}<TouchableOpacity onPress={addFile} style={styles.newTab} accessibilityRole="button"><Text style={styles.newTabText}>＋</Text></TouchableOpacity></ScrollView>
          <View style={styles.codeToolbar}><Text style={styles.languageBadge}>{selectedFile?.language ?? 'texto'}</Text><Text style={styles.toolbarHint}>Edição local · autosave · Sandbox segura</Text></View>
          <TextInput multiline value={selectedFile?.content ?? ''} onChangeText={onChangeContent} style={styles.codeInput} textAlignVertical="top" autoCapitalize="none" autoCorrect={false} spellCheck={false} accessibilityLabel="Editor de código" />
          <View style={styles.outputHeader}><Text style={styles.fileContext}>SAÍDA</Text><Text style={[styles.outputStatus, executionStatus === 'error' && styles.outputStatusError]}>{isRunning ? 'Executando…' : executionStatus === 'success' ? 'Concluído' : executionStatus === 'error' ? 'Revisar saída' : 'Pronto'}</Text></View><View style={styles.outputBox}><Text style={styles.outputText}>{executionOutput}</Text></View>
          <View style={styles.terminalHeader}><View><Text style={styles.fileContext}>SANDBOX EDUCACIONAL</Text><Text style={styles.terminalTitle}>Terminal Cris</Text><Text style={styles.terminalDescription}>Um terminal de aprendizagem dentro do projeto. Ele simula navegação e execução didática; não é ainda um shell do Android.</Text></View><Text style={styles.terminalMode}>modo seguro</Text></View>
          <View style={styles.terminalBox}>{terminalLines.map((line, index) => <Text key={`${line}-${index}`} style={styles.terminalLine}>{line}</Text>)}<View style={styles.commandRow}><Text style={styles.prompt}>›</Text><TextInput value={terminalInput} onChangeText={setTerminalInput} onSubmitEditing={runCommand} returnKeyType="send" style={styles.commandInput} placeholder="help" placeholderTextColor="#8290A8" autoCapitalize="none" autoCorrect={false} /><TouchableOpacity onPress={runCommand} style={styles.runButton} accessibilityRole="button"><Text style={styles.runText}>Executar</Text></TouchableOpacity></View></View>
        </View>

        <View style={styles.aiPanel}>
          <View style={styles.aiHeader}><View style={styles.aiAvatar}><Text style={styles.aiAvatarText}>C</Text></View><View><Text style={styles.aiName}>Cris</Text><Text style={styles.aiStatus}>{crisAsk.isPending ? 'Cris online · analisando…' : crisMode === 'online' ? 'Cris online · conectada' : 'Cris local · fallback seguro'}</Text></View></View>
          <Text style={styles.aiIntro}>Sua parceira de estudos para entender, praticar e evoluir no código.</Text>
          <ScrollView style={styles.aiMessage} contentContainerStyle={styles.aiMessageContent} nestedScrollEnabled showsVerticalScrollIndicator keyboardShouldPersistTaps="handled"><Text style={styles.aiMessageText}>{aiMessage}</Text></ScrollView>
          <Text style={styles.aiKicker}>AÇÕES RÁPIDAS</Text>
          {AI_ACTIONS.map(action => <TouchableOpacity key={action.id} onPress={() => askCris(action.id)} style={styles.aiAction} accessibilityRole="button"><Text style={styles.aiActionIcon}>{action.icon}</Text><Text style={styles.aiActionText}>{action.label}</Text><Text style={styles.chevron}>›</Text></TouchableOpacity>)}
          <View style={styles.crisChatCard}>
            <View style={styles.crisChatHeader}><View><Text style={styles.aiKicker}>CONVERSA DE TESTE</Text><Text style={styles.crisChatTitle}>Fale com a Cris</Text></View><Text style={styles.crisChatMode}>{crisMode === 'online' ? 'online' : 'fallback local'}</Text></View>
            <ScrollView ref={crisChatScrollRef} style={styles.crisChatHistory} contentContainerStyle={styles.crisChatHistoryContent} nestedScrollEnabled keyboardShouldPersistTaps="handled" onContentSizeChange={() => crisChatScrollRef.current?.scrollToEnd({ animated: false })}>{crisChatMessages.slice(-12).map((message, index) => <View key={`${message.role}-${index}`} style={[styles.crisBubble, message.role === 'user' && styles.crisBubbleUser]}><Text style={[styles.crisBubbleText, message.role === 'user' && styles.crisBubbleTextUser]}>{message.text}</Text></View>)}</ScrollView>
            <View style={styles.crisChatComposer}><TextInput value={crisChatInput} onChangeText={setCrisChatInput} onSubmitEditing={sendCrisChat} returnKeyType="send" placeholder="Pergunte à Cris…" placeholderTextColor="#8290A8" style={styles.crisChatInput} multiline={false} /><TouchableOpacity onPress={sendCrisChat} disabled={!crisChatInput.trim() || crisAsk.isPending} style={styles.crisChatSend} accessibilityRole="button" accessibilityLabel="Enviar pergunta para Cris"><Text style={styles.crisChatSendText}>{crisAsk.isPending ? '…' : 'Enviar'}</Text></TouchableOpacity></View>
          </View>
          <View style={styles.offlineCard}><Text style={styles.offlineTitle}>Cris híbrida</Text><Text style={styles.offlineText}>Na web, a Cris online fica disponível automaticamente quando houver conexão. Sem internet, o aplicativo mantém as orientações locais e, no Android, poderá instalar um modelo GGUF pelo próprio menu — sem procurar arquivos manualmente.</Text><AcademicButton label="Ver configurações" onPress={() => router.push('/ai-settings')} compact tone="neutral" /></View>
        </View>
      </View>
    </ScrollView>
  </ScreenContainer>;
}

const styles = StyleSheet.create({
  screen: { backgroundColor: '#F8F9FA' },
  content: { padding: 24, gap: 18, paddingBottom: 120 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 },
  headerCopy: { flex: 1 },
  eyebrow: { color: academicColors.indigo, fontSize: 11, fontWeight: '800', letterSpacing: 1.5 },
  title: { color: '#172033', fontSize: 32, fontWeight: '800', marginTop: 6 },
  subtitle: { color: '#687088', fontSize: 14, marginTop: 6, lineHeight: 20 },
  backButton: { borderWidth: 1, borderColor: '#DDE2EA', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: '#FFFFFF' },
  backText: { color: '#3346A8', fontWeight: '700' },
  safetyBanner: { flexDirection: 'row', gap: 12, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DCE8E2', borderRadius: 14, padding: 14 },
  safetyIcon: { color: '#18865B', fontWeight: '900', fontSize: 20 }, safetyCopy: { flex: 1 }, safetyTitle: { color: '#172033', fontWeight: '800' }, safetyText: { color: '#687088', fontSize: 12, lineHeight: 18, marginTop: 3 },
  workspace: { gap: 14 },
  filesPanel: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E3E7EE', borderRadius: 16, padding: 16 },
  panelHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }, panelKicker: { color: '#8290A8', fontSize: 10, fontWeight: '800', letterSpacing: 1.2 }, panelTitle: { color: '#172033', fontSize: 17, fontWeight: '800', marginTop: 4 }, projectDescription: { color: '#687088', fontSize: 12, lineHeight: 17, marginTop: 8, marginBottom: 12 },
  addButton: { backgroundColor: '#F0EEFF', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 }, addButtonText: { color: '#5B3CC4', fontSize: 12, fontWeight: '800' },
  fileRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 9, paddingHorizontal: 10, paddingVertical: 11 }, fileRowActive: { backgroundColor: '#F3F1FF' }, fileGlyph: { width: 22, height: 22, textAlign: 'center', paddingTop: 2, color: '#5B3CC4', backgroundColor: '#EEEBFF', borderRadius: 6, fontWeight: '800' }, fileName: { color: '#687088', fontSize: 13, fontWeight: '600' }, fileNameActive: { color: '#3346A8', fontWeight: '800' },
  sustainabilityBox: { borderTopWidth: 1, borderTopColor: '#EEF0F4', marginTop: 12, paddingTop: 14, position: 'relative' }, sustainabilityTitle: { color: '#172033', fontSize: 12, fontWeight: '800' }, sustainabilityText: { color: '#8290A8', fontSize: 11, marginTop: 4, paddingRight: 56 }, switch: { position: 'absolute', right: 0, top: 18, width: 42, height: 24, borderRadius: 12, backgroundColor: '#DDE2EA', padding: 3 }, switchOn: { backgroundColor: '#18865B' }, switchKnob: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#FFFFFF' }, switchKnobOn: { alignSelf: 'flex-end' },
  editorPanel: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E3E7EE', borderRadius: 16, overflow: 'hidden' },   editorTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, padding: 16 }, editorActions: { alignItems: 'flex-end', flexDirection: 'row', gap: 10 }, playButton: { backgroundColor: '#18865B', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 }, playButtonDisabled: { opacity: 0.6 }, playButtonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '900' }, tabStrip: { alignItems: 'center', backgroundColor: '#F1F3F7', borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#E3E7EE', paddingHorizontal: 8 }, fileTab: { borderRightWidth: 1, borderRightColor: '#E3E7EE', paddingHorizontal: 13, paddingVertical: 11 }, fileTabActive: { backgroundColor: '#FFFFFF', borderTopWidth: 2, borderTopColor: '#6B4DE6' }, fileTabText: { color: '#8290A8', fontSize: 12, fontWeight: '700' }, fileTabTextActive: { color: '#3346A8', fontWeight: '900' }, newTab: { paddingHorizontal: 12, paddingVertical: 9 }, newTabText: { color: '#5B3CC4', fontSize: 18, fontWeight: '900' }, outputHeader: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 13 }, outputStatus: { color: '#18865B', fontSize: 10, fontWeight: '800' }, outputStatusError: { color: '#B3261E' }, outputBox: { backgroundColor: '#F8F9FA', borderBottomWidth: 1, borderBottomColor: '#E3E7EE', minHeight: 48, paddingHorizontal: 16, paddingVertical: 10 }, outputText: { color: '#46526A', fontFamily: 'monospace', fontSize: 12, lineHeight: 18 }, fileContext: { color: '#8290A8', fontSize: 10, fontWeight: '800', letterSpacing: 1.1 }, editorTitle: { color: '#172033', fontSize: 17, fontWeight: '800', marginTop: 4 }, savedText: { color: '#18865B', fontSize: 11, paddingTop: 6 }, codeToolbar: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#F8F9FA', borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#EEF0F4', padding: 10 }, languageBadge: { color: '#5B3CC4', backgroundColor: '#EEEBFF', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, fontSize: 11, fontWeight: '800' }, toolbarHint: { color: '#8290A8', fontSize: 11 }, codeInput: { minHeight: 310, padding: 16, color: '#24324A', backgroundColor: '#FBFCFE', fontFamily: 'monospace', fontSize: 14, lineHeight: 22 },
  terminalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderTopWidth: 1, borderTopColor: '#E3E7EE' }, terminalTitle: { color: '#172033', fontWeight: '800', marginTop: 4 }, terminalDescription: { color: '#687088', fontSize: 11, lineHeight: 16, marginTop: 4, maxWidth: 560 }, terminalMode: { color: '#8290A8', fontSize: 10 }, terminalBox: { backgroundColor: '#172033', margin: 12, borderRadius: 12, padding: 12, minHeight: 170 }, terminalLine: { color: '#D8E2F2', fontFamily: 'monospace', fontSize: 12, lineHeight: 19 }, commandRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, borderTopWidth: 1, borderTopColor: '#30405C', paddingTop: 9, gap: 6 }, prompt: { color: '#8C7BFF', fontSize: 18 }, commandInput: { flex: 1, color: '#FFFFFF', fontFamily: 'monospace', fontSize: 12, paddingVertical: 4 }, runButton: { backgroundColor: '#6B4DE6', borderRadius: 7, paddingHorizontal: 10, paddingVertical: 8 }, runText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
  aiPanel: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E3E7EE', borderRadius: 16, padding: 16 }, aiHeader: { flexDirection: 'row', gap: 10, alignItems: 'center' }, aiAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#EEEBFF', alignItems: 'center', justifyContent: 'center' }, aiAvatarText: { color: '#5B3CC4', fontSize: 18, fontWeight: '900' }, aiName: { color: '#172033', fontWeight: '800' }, aiStatus: { color: '#18865B', fontSize: 11, marginTop: 2 }, aiIntro: { color: '#687088', fontSize: 12, lineHeight: 18, marginTop: 14 }, aiMessage: { backgroundColor: '#F7F6FF', borderLeftWidth: 3, borderLeftColor: '#6B4DE6', borderRadius: 8, height: 270, marginTop: 12 }, aiMessageContent: { padding: 12 }, aiMessageText: { color: '#3A4160', fontSize: 12, lineHeight: 18 }, aiKicker: { color: '#8290A8', fontSize: 10, fontWeight: '800', letterSpacing: 1.1, marginTop: 18, marginBottom: 8 }, aiAction: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: '#EEF0F4' }, aiActionIcon: { color: '#6B4DE6', fontSize: 17, width: 22, textAlign: 'center' }, aiActionText: { flex: 1, color: '#33405A', fontWeight: '700', fontSize: 13 }, chevron: { color: '#9AA4B5', fontSize: 20 },   offlineCard: { marginTop: 18, backgroundColor: '#F8F9FA', borderRadius: 10, padding: 12 }, offlineTitle: { color: '#172033', fontWeight: '800', fontSize: 12 }, offlineText: { color: '#687088', fontSize: 11, lineHeight: 17, marginTop: 5, marginBottom: 10 }, crisChatCard: { borderTopColor: '#EEF0F4', borderTopWidth: 1, marginTop: 18, paddingTop: 16 }, crisChatHeader: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between' }, crisChatTitle: { color: '#172033', fontSize: 15, fontWeight: '900', marginTop: 2 }, crisChatMode: { color: '#18865B', fontSize: 10, fontWeight: '800', marginTop: 4 }, crisChatHistory: { height: 270, marginTop: 11 }, crisChatHistoryContent: { gap: 8, paddingBottom: 4 }, crisBubble: { alignSelf: 'flex-start', backgroundColor: '#F3F1FF', borderRadius: 10, maxWidth: '92%', padding: 9 }, crisBubbleUser: { alignSelf: 'flex-end', backgroundColor: '#3346A8' }, crisBubbleText: { color: '#3A4160', fontSize: 12, lineHeight: 17 }, crisBubbleTextUser: { color: '#FFFFFF' }, crisChatComposer: { alignItems: 'flex-end', flexDirection: 'row', gap: 7, marginTop: 10 }, crisChatInput: { backgroundColor: '#F8F9FA', borderColor: '#DDE2EA', borderRadius: 9, borderWidth: 1, color: '#172033', flex: 1, fontSize: 12, minHeight: 38, paddingHorizontal: 10, paddingVertical: 8 }, crisChatSend: { backgroundColor: '#6B4DE6', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 10 }, crisChatSendText: { color: '#FFFFFF', fontSize: 11, fontWeight: '900' },
});
