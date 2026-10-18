import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { useColors } from '@/hooks/use-colors';

export type AcademicImportWebViewProps = {
  captureSignal: number;
  onLoadProgress?: (progress: number) => void;
  onMessage: (raw: string) => void;
  onNavigate?: (url: string) => void;
  reloadKey: number;
  url: string;
};

/**
 * No navegador não existe WebView com sessão controlada pelo app (e o SIGAA
 * bloqueia iframe por `X-Frame-Options`). Em vez de fingir que funciona, a tela
 * explica o caminho e aceita a lista colada à mão — que passa pelo mesmo
 * normalizador usado no Android.
 */
export function AcademicImportWebView({ onMessage }: AcademicImportWebViewProps) {
  const colors = useColors();
  const [pasted, setPasted] = useState('');
  const [feedback, setFeedback] = useState('');
  const submit = () => {
    const lines = pasted
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean);
    if (!lines.length) {
      setFeedback('Cole ao menos uma linha com o nome da atividade.');
      return;
    }
    const items = lines.map(line => {
      const [title, course, dueDate] = line.split(';').map(part => part.trim());
      return { title, course, dueDate };
    });
    onMessage(JSON.stringify({ type: 'scrape', items, source: 'manual' }));
    setFeedback(`${items.length} linha(s) enviadas para revisão.`);
  };
  return (
    <View style={{ flex: 1, gap: 12, padding: 16 }}>
      <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: '800' }}>
        O navegador integrado abre no app (Android/iOS)
      </Text>
      <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 18 }}>
        No navegador, o login institucional não pode ser compartilhado com este app por segurança. Você pode colar a
        lista de atividades abaixo, uma por linha, no formato: título; disciplina; prazo.
      </Text>
      <TextInput
        multiline
        onChangeText={setPasted}
        placeholder={'Lista de exercícios 3; Banco de Dados; 12/03/2026\nProva de Cálculo; Cálculo I; 20/03'}
        placeholderTextColor={colors.muted}
        style={{
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: 12,
          borderWidth: 1,
          color: colors.foreground,
          flex: 1,
          fontSize: 13,
          padding: 12,
          textAlignVertical: 'top',
        }}
        value={pasted}
      />
      <Pressable
        accessibilityRole="button"
        onPress={submit}
        style={{ alignItems: 'center', backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 12 }}
      >
        <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800' }}>Revisar atividades coladas</Text>
      </Pressable>
      {feedback ? <Text style={{ color: colors.muted, fontSize: 12 }}>{feedback}</Text> : null}
    </View>
  );
}
