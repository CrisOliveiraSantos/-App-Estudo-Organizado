/* ------------------------------------------------------------------ *
 * Cris · "Sobre mim" — o que a Cris sabe sobre quem usa o app
 *
 * Aberta pelo popup da Cris (ícone de pessoa no cabeçalho). O que for
 * salvo aqui vive SÓ neste aparelho (`lib/cris-memory.ts`) e passa a
 * fazer parte do prompt da Cris: ela para de tratar a pessoa como
 * desconhecida e de repetir as mesmas perguntas.
 *
 * Transparência: o cartão "O que a Cris recebe" mostra exatamente o
 * trecho que entra no prompt. Com IA configurada, esse trecho vai junto
 * com a pergunta para a IA local ou para o provedor escolhido — como
 * qualquer outra pergunta. Nenhuma chave é lida ou registrada aqui.
 * ------------------------------------------------------------------ */

import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';

import { AcademicButton, AcademicCard, AcademicPill, academicColors } from '@/components/academic/design-system';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import {
  clearCrisMemory,
  describeUserMemory,
  EMPTY_CRIS_MEMORY,
  getCrisMemory,
  isCrisMemoryEmpty,
  saveCrisMemory,
  type CrisUserMemory,
} from '@/lib/cris-memory';

/** Sugestões de papel (o campo livre abaixo continua valendo). */
const ROLE_SUGGESTIONS = ['Estudante', 'Criadora do app', 'Professor(a)', 'Outro'];

export default function CrisProfileScreen() {
  const colors = useColors();
  const [memory, setMemory] = useState<CrisUserMemory>(EMPTY_CRIS_MEMORY);
  const [subjectsDraft, setSubjectsDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void getCrisMemory()
      .then(saved => {
        if (!active) return;
        setMemory(saved);
        setSubjectsDraft(saved.subjects.join(', '));
      })
      .catch(() => undefined)
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const patch = useCallback((changes: Partial<CrisUserMemory>) => setMemory(current => ({ ...current, ...changes })), []);

  const save = useCallback(async () => {
    setFeedback(null);
    setSaving(true);
    try {
      const saved = await saveCrisMemory({ ...memory, subjects: subjectsDraft.split(',') });
      setMemory(saved);
      setSubjectsDraft(saved.subjects.join(', '));
      setFeedback(isCrisMemoryEmpty(saved) ? 'Nada foi salvo: o formulário está vazio.' : 'Salvo neste aparelho. A Cris já usa isso na próxima conversa.');
    } catch {
      setFeedback('Não foi possível salvar agora. Tente de novo.');
    } finally {
      setSaving(false);
    }
  }, [memory, subjectsDraft]);

  const forget = useCallback(async () => {
    setFeedback(null);
    setSaving(true);
    try {
      await clearCrisMemory();
      setMemory({ ...EMPTY_CRIS_MEMORY });
      setSubjectsDraft('');
      setFeedback('Memória apagada. A Cris volta a não te conhecer.');
    } catch {
      setFeedback('Não foi possível apagar agora. Tente de novo.');
    } finally {
      setSaving(false);
    }
  }, []);

  const inputStyle = [styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface }];

  return (
    <ScreenContainer edges={['top', 'bottom', 'left', 'right']} style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TouchableOpacity onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Voltar" style={styles.back}>
          <Text style={[styles.backText, { color: colors.primary }]}>← Voltar</Text>
        </TouchableOpacity>

        <Text style={styles.overline}>CRIS · SOBRE MIM</Text>
        <Text style={[styles.title, { color: colors.foreground }]}>Sobre mim</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>O que a Cris sabe sobre você. Fica só neste aparelho e serve para ela te chamar pelo nome e entender seu contexto — sem perguntar tudo de novo.</Text>

        {loading ? <ActivityIndicator color={colors.primary} style={styles.spinner} /> : <>
          <AcademicCard style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.label, { color: colors.foreground }]}>Como você quer ser chamada?</Text>
            <TextInput value={memory.name} onChangeText={value => patch({ name: value })} placeholder="Seu nome" placeholderTextColor={colors.muted} style={inputStyle} accessibilityLabel="Seu nome" />

            <Text style={[styles.label, { color: colors.foreground }]}>Seu papel</Text>
            <View style={styles.pills}>
              {ROLE_SUGGESTIONS.map(role => (
                <TouchableOpacity key={role} accessibilityRole="button" accessibilityLabel={`Papel: ${role}`} onPress={() => patch({ role })} style={styles.pillButton}>
                  <AcademicPill label={role} tone={memory.role === role ? 'violet' : 'neutral'} />
                </TouchableOpacity>
              ))}
            </View>
            <TextInput value={memory.role} onChangeText={value => patch({ role: value })} placeholder="Ex.: criadora do app e estudante de Sistemas" placeholderTextColor={colors.muted} style={inputStyle} accessibilityLabel="Descrição do seu papel" />

            <Text style={[styles.label, { color: colors.foreground }]}>Faculdade</Text>
            <TextInput value={memory.college} onChangeText={value => patch({ college: value })} placeholder="Onde você estuda" placeholderTextColor={colors.muted} style={inputStyle} accessibilityLabel="Faculdade" />

            <Text style={[styles.label, { color: colors.foreground }]}>Curso</Text>
            <TextInput value={memory.course} onChangeText={value => patch({ course: value })} placeholder="Seu curso ou área" placeholderTextColor={colors.muted} style={inputStyle} accessibilityLabel="Curso" />

            <Text style={[styles.label, { color: colors.foreground }]}>Matérias deste período</Text>
            <TextInput value={subjectsDraft} onChangeText={setSubjectsDraft} placeholder="Cálculo, Programação, Anatomia" placeholderTextColor={colors.muted} style={inputStyle} accessibilityLabel="Matérias, separadas por vírgula" />
            <Text style={[styles.helper, { color: colors.muted }]}>Separe por vírgula. A Cris usa essas matérias para dar exemplos do seu curso.</Text>

            <Text style={[styles.label, { color: colors.foreground }]}>Contexto livre</Text>
            <TextInput value={memory.about} onChangeText={value => patch({ about: value })} placeholder="Como você estuda, dificuldades, o que quer melhorar…" placeholderTextColor={colors.muted} multiline style={[inputStyle, styles.multiline]} accessibilityLabel="Contexto livre" />
          </AcademicCard>

          <View style={styles.actions}>
            <AcademicButton label={saving ? 'Salvando…' : 'Salvar'} onPress={() => { void save(); }} disabled={saving} />
            <AcademicButton label="Esquecer" tone="danger" onPress={() => { void forget(); }} disabled={saving} compact />
          </View>

          {feedback ? (
            <View style={[styles.feedback, { backgroundColor: academicColors.violetSoft }]}>
              <Text style={[styles.feedbackText, { color: academicColors.violet }]}>{feedback}</Text>
            </View>
          ) : null}

          <AcademicCard style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.label, { color: colors.foreground }]}>O que a Cris recebe</Text>
            <Text style={[styles.preview, { color: colors.muted }]}>{describeUserMemory(memory)}</Text>
            <Text style={[styles.helper, { color: colors.muted }]}>Este trecho vai com a sua pergunta para a IA que você configurou — local (Ollama, LM Studio) ou provedor (Groq, Gemini). Nada passa pelos servidores do app e nenhuma chave é registrada.</Text>
          </AcademicCard>

          <AcademicCard style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.label, { color: colors.foreground }]}>Quem é a Cris</Text>
            <Text style={[styles.body, { color: colors.muted }]}>Mentora de estudos do Estudo Organizado, criada por Cris Oliveira Santos, a dona do app. Ela explica assuntos, resume materiais, cria questões, monta e ajusta planos e sugere o próximo passo da tela em que você está.</Text>
            <Text style={[styles.body, { color: colors.muted }]}>O que ela não faz: ver sua tela, seus arquivos ou seu dispositivo; executar ações no app; falar de senha, Wi-Fi ou sistema operacional; e participar da conversa com outras pessoas no Chat.</Text>
            <Text style={[styles.body, { color: colors.muted }]}>Ainda em falta (próximas fases): a Cris conversar no Chat geral e ler automaticamente seus PDFs e imagens.</Text>
            <Text style={[styles.body, { color: colors.muted }]}>As telas do app são: Hoje, Editor, Planejamento, Biblioteca, Conversas e Ajustes.</Text>
          </AcademicCard>
        </>}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  back: { alignSelf: 'flex-start', justifyContent: 'center', marginBottom: 9, minHeight: 40 },
  backText: { fontSize: 13, fontWeight: '800' },
  body: { fontSize: 13, lineHeight: 20, marginTop: 10 },
  card: { borderWidth: 1, marginTop: 14, padding: 17 },
  content: { paddingBottom: 120, paddingHorizontal: 18, paddingTop: 16 },
  feedback: { borderRadius: 12, marginTop: 12, padding: 12 },
  feedbackText: { fontSize: 12, fontWeight: '700', lineHeight: 18 },
  helper: { fontSize: 11, lineHeight: 16, marginTop: 6 },
  input: { borderRadius: 11, borderWidth: 1, fontSize: 14, marginTop: 7, minHeight: 45, paddingHorizontal: 12 },
  label: { fontSize: 12, fontWeight: '800', marginTop: 17 },
  multiline: { minHeight: 105, paddingTop: 12, textAlignVertical: 'top' },
  overline: { color: academicColors.violet, fontSize: 11, fontWeight: '900', letterSpacing: 0.9 },
  pillButton: { marginBottom: 6, marginRight: 8 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 9 },
  preview: { fontSize: 12, lineHeight: 18, marginTop: 8 },
  screen: { flex: 1 },
  spinner: { marginTop: 46 },
  subtitle: { fontSize: 14, lineHeight: 20, marginTop: 7 },
  title: { fontSize: 31, fontWeight: '900', letterSpacing: -0.9, lineHeight: 38, marginTop: 4 },
});
