import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { ScreenContainer } from '@/components/screen-container';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { AcademicButton, AcademicPill } from '@/components/academic/design-system';
import { useColors } from '@/hooks/use-colors';
import {
  DEFAULT_FLASHCARD_COUNT,
  MIN_FLASHCARD_SOURCE,
  flashcardNoteContent,
  generateFlashcards,
  localFlashcards,
  type Flashcard,
  type FlashcardEngine,
} from '@/lib/flashcards';
import { useStudy } from '@/lib/study-store';

export default function FlashcardsScreen() {
  const colors = useColors();
  const { width } = useWindowDimensions();
  const params = useLocalSearchParams<{ noteId?: string; text?: string; topic?: string }>();
  const { createNote, notes, saveNote } = useStudy();
  const note = notes.find(item => item.id === params.noteId);
  const topic = params.topic?.trim() || note?.title || 'Material de estudo';
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [engine, setEngine] = useState<FlashcardEngine | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [index, setIndex] = useState(0);
  const [saveMessage, setSaveMessage] = useState('');

  const source = useMemo(() => {
    const pageText = (note?.pdfPages ?? [])
      .map(page => page.extractedText ?? '')
      .filter(Boolean)
      .join('\n\n');
    return (note?.pdfText || pageText || note?.selectedText || note?.content || params.text || '').trim();
  }, [note, params.text]);

  const charCount = source.length;
  const enough = charCount >= MIN_FLASHCARD_SOURCE;
  const cardWidth = Math.max(240, width - 40);

  const run = useCallback(
    async (mode: 'ai' | 'offline') => {
      setError('');
      setSaveMessage('');
      if (!enough) {
        setError('Este material ainda não tem texto extraído suficiente. Abra o PDF e aguarde a leitura das páginas.');
        return;
      }
      if (mode === 'offline') {
        const local = localFlashcards(source, DEFAULT_FLASHCARD_COUNT);
        setCards(local);
        setEngine({ kind: 'local', label: 'Modo offline' });
        setIndex(0);
        if (!local.length) setError('Não encontrei frases completas neste texto para montar cartões rápidos.');
        return;
      }
      setLoading(true);
      try {
        const result = await generateFlashcards(source, { count: DEFAULT_FLASHCARD_COUNT });
        setCards(result.cards);
        setEngine(result.engine);
        setIndex(0);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'Não foi possível gerar os flashcards agora.');
      } finally {
        setLoading(false);
      }
    },
    [enough, source],
  );

  const saveAsNote = () => {
    if (!cards.length) return;
    const title = `Flashcards — ${topic}`;
    const id = createNote(title, 'Flashcards');
    saveNote({
      id,
      title,
      content: flashcardNoteContent(topic, cards),
      folder: 'Flashcards',
      updatedAt: 'Agora',
      kind: 'note',
      blocks: cards.map((card, cardIndex) => ({
        id: `${id}-${cardIndex}`,
        type: 'paragraph',
        text: `${cardIndex + 1}. ${card.question}\n${card.answer}`,
      })),
    });
    setSaveMessage('Cartões salvos na Biblioteca, na pasta Flashcards.');
  };

  return (
    <ScreenContainer edges={['top', 'bottom', 'left', 'right']}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.back}>
          <IconSymbol name="arrow.backward" size={21} color={colors.foreground} />
          <Text style={[styles.backLabel, { color: colors.foreground }]}>Voltar</Text>
        </Pressable>
        <View style={styles.headerCopy}>
          <Text numberOfLines={2} style={[styles.title, { color: colors.foreground }]}>
            {topic}
          </Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>
            {charCount.toLocaleString('pt-BR')} caracteres prontos para virar memória.
          </Text>
        </View>
      </View>

      <View style={styles.actions}>
        <AcademicButton
          compact
          disabled={loading || !enough}
          label={loading ? 'Gerando com IA…' : 'Gerar 5 flashcards'}
          onPress={() => void run('ai')}
        />
        <AcademicButton
          compact
          disabled={loading || !enough}
          label="Cartões rápidos"
          onPress={() => void run('offline')}
          tone="ghost"
        />
      </View>

      {engine ? (
        <View style={styles.engineRow}>
          <AcademicPill label={engine.label} tone={engine.kind === 'provider' ? 'success' : 'neutral'} />
          {engine.model ? <AcademicPill label={engine.model} tone="indigo" /> : null}
        </View>
      ) : null}

      {error ? <Text style={[styles.error, { color: colors.error }]}>{error}</Text> : null}

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} />
          <Text style={[styles.loadingLabel, { color: colors.muted }]}>
            Lendo o material e montando perguntas…
          </Text>
        </View>
      ) : null}

      {cards.length ? (
        <FlatList
          contentContainerStyle={styles.carousel}
          data={cards}
          decelerationRate="fast"
          horizontal
          keyExtractor={item => item.id}
          onMomentumScrollEnd={event => {
            const next = Math.round(event.nativeEvent.contentOffset.x / (cardWidth + CARD_GAP));
            setIndex(Math.max(0, Math.min(cards.length - 1, next)));
          }}
          snapToAlignment="start"
          snapToInterval={cardWidth + CARD_GAP}
          showsHorizontalScrollIndicator={false}
          renderItem={({ item, index: cardIndex }) => (
            <FlipCard
              card={item}
              colors={colors}
              number={cardIndex + 1}
              slotWidth={cardWidth + CARD_GAP}
              total={cards.length}
              width={cardWidth}
            />
          )}
        />
      ) : null}

      {cards.length ? (
        <View style={styles.footer}>
          <View style={styles.dots}>
            {cards.map((card, dotIndex) => (
              <View
                key={card.id}
                style={[
                  styles.dot,
                  { backgroundColor: dotIndex === index ? colors.primary : colors.border },
                  dotIndex === index && styles.dotActive,
                ]}
              />
            ))}
          </View>
          <Text style={[styles.hint, { color: colors.muted }]}>
            Cartão {index + 1} de {cards.length} · toque para virar
          </Text>
          <AcademicButton compact label="Salvar como nota" onPress={saveAsNote} tone="violet" />
          {saveMessage ? <Text style={[styles.saved, { color: colors.success }]}>{saveMessage}</Text> : null}
        </View>
      ) : null}

      {!cards.length && !loading ? (
        <View style={styles.empty}>
          <IconSymbol name="doc.text.fill" size={44} color={colors.primary} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Nenhum cartão ainda</Text>
          <Text style={[styles.emptyBody, { color: colors.muted }]}>
            {enough
              ? 'Toque em “Gerar 5 flashcards”. A IA configurada em Ajustes cria as perguntas; sem IA, o app monta cartões de completar offline.'
              : 'Abra um PDF na Biblioteca e aguarde a extração do texto — os flashcards usam esse conteúdo.'}
          </Text>
          <AcademicButton compact label="Abrir Biblioteca" onPress={() => router.replace('/library')} tone="ghost" />
        </View>
      ) : null}
    </ScreenContainer>
  );
}

const CARD_GAP = 20;

function FlipCard({
  card,
  colors,
  number,
  slotWidth,
  total,
  width,
}: {
  card: Flashcard;
  colors: ReturnType<typeof useColors>;
  number: number;
  slotWidth: number;
  total: number;
  width: number;
}) {
  const [revealed, setRevealed] = useState(false);
  const progress = useRef(new Animated.Value(0)).current;
  const flip = () => {
    const next = revealed ? 0 : 1;
    setRevealed(!revealed);
    Animated.timing(progress, { duration: 260, toValue: next, useNativeDriver: true }).start();
  };
  const frontRotate = progress.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });
  const backRotate = progress.interpolate({ inputRange: [0, 1], outputRange: ['180deg', '360deg'] });
  return (
    <View style={{ width: slotWidth }}>
      <Pressable
        accessibilityLabel={revealed ? 'Ver a pergunta novamente' : 'Ver a resposta'}
        accessibilityRole="button"
        onPress={flip}
        style={[styles.cardPress, { width }]}
      >
        <Animated.View
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              transform: [{ perspective: 900 }, { rotateY: frontRotate }],
            },
          ]}
        >
          <Text style={[styles.cardMeta, { color: colors.muted }]}>
            {number} / {total} · PERGUNTA
          </Text>
          <Text style={[styles.cardText, { color: colors.foreground }]}>{card.question}</Text>
          <Text style={[styles.cardHint, { color: colors.primary }]}>Toque para ver a resposta</Text>
        </Animated.View>
        <Animated.View
          style={[
            styles.card,
            {
              backgroundColor: colors.lavender,
              borderColor: colors.primary,
              transform: [{ perspective: 900 }, { rotateY: backRotate }],
            },
          ]}
        >
          <Text style={[styles.cardMeta, { color: colors.primary }]}>
            {number} / {total} · RESPOSTA
          </Text>
          <Text style={[styles.cardText, { color: colors.foreground }]}>{card.answer}</Text>
          <Text style={[styles.cardHint, { color: colors.primary }]}>Toque para voltar à pergunta</Text>
        </Animated.View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, paddingHorizontal: 20, paddingTop: 14 },
  back: { alignItems: 'center', flexDirection: 'row', gap: 4, paddingRight: 6, paddingVertical: 6 },
  backLabel: { fontSize: 13, fontWeight: '700' },
  card: {
    ...StyleSheet.absoluteFillObject,
    backfaceVisibility: 'hidden',
    borderRadius: 20,
    borderWidth: 1,
    gap: 12,
    justifyContent: 'center',
    padding: 22,
  },
  cardHint: { fontSize: 11, fontWeight: '800', letterSpacing: 0.2 },
  cardMeta: { fontSize: 10, fontWeight: '900', letterSpacing: 1.1 },
  cardPress: { height: 300 },
  cardText: { fontSize: 17, fontWeight: '600', lineHeight: 25 },
  carousel: { gap: 0, paddingHorizontal: 20, paddingVertical: 16 },
  dot: { borderRadius: 999, height: 6, width: 6 },
  dotActive: { width: 18 },
  dots: { flexDirection: 'row', gap: 5, justifyContent: 'center' },
  empty: { alignItems: 'center', flex: 1, gap: 10, justifyContent: 'center', padding: 28 },
  emptyBody: { fontSize: 13, lineHeight: 19, maxWidth: 420, textAlign: 'center' },
  emptyTitle: { fontSize: 17, fontWeight: '800' },
  engineRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 20, paddingTop: 12 },
  error: { fontSize: 12, lineHeight: 18, paddingHorizontal: 20, paddingTop: 10 },
  footer: { alignItems: 'center', gap: 9, padding: 20, paddingTop: 4 },
  header: { alignItems: 'center', borderBottomWidth: 1, flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 10 },
  headerCopy: { flex: 1 },
  hint: { fontSize: 11 },
  loading: { alignItems: 'center', flexDirection: 'row', gap: 9, paddingHorizontal: 20, paddingTop: 14 },
  loadingLabel: { fontSize: 12 },
  saved: { fontSize: 12, fontWeight: '700' },
  subtitle: { fontSize: 11, marginTop: 3 },
  title: { fontSize: 17, fontWeight: '800', letterSpacing: -0.2 },
});
