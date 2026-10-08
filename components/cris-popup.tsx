/* ------------------------------------------------------------------ *
 * Cris · popup flutuante (Fase 1B, Passo 3)
 *
 * Comportamento definido pela usuária em 05/10/2026:
 *   1. Personalidade: mentora acolhedora e DIRETA — explica, sugere e
 *      respeita o ritmo. Não cobra metas e não concorda com tudo.
 *   2. Contexto: a Cris sabe em que tela o aluno está (`describeScreen`)
 *      e ajuda com aquilo (planejamento, PDF, conversa, ajustes…).
 *   3. Sugestões: com moderação e sempre a partir de dados reais do app
 *      (nada inventado). Podem ser desligadas no cabeçalho do popup.
 *   4. Memória: a conversa (histórico) vive em memória enquanto o app está
 *      aberto, com o botão "Limpar histórico" ao lado; o perfil de quem usa
 *      ("Sobre mim" → `lib/cris-memory.ts`) é persistente entre sessões.
 *   5. Chat humano: a Cris NÃO participa da conversa com outras pessoas
 *      (fica para a Fase 1D, com @Cris e silenciar).
 *
 * Privacidade: as respostas vêm direto da IA local ou do provedor
 * escolhido (`lib/cris-client.ts`) — nada passa pelos servidores do app.
 * A chave do provedor nunca é lida nem registrada aqui: este arquivo não
 * possui nenhuma chamada de `console.*`.
 *
 * O popup flutua sobre TODAS as telas (é montado no layout raiz), por
 * isso não usa `ScreenContainer`: usa os mesmos tokens do app
 * (`academicColors` + paleta do tema) e respeita as safe areas.
 * ------------------------------------------------------------------ */

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, usePathname } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { academicColors } from '@/components/academic/design-system';
import { useColors } from '@/hooks/use-colors';
import type { AiConfig } from '@/lib/api-config';
import { shouldSendChatOnEnter } from '@/lib/chat-utils';
import { describeScreen, streamCris, type CrisContext, type CrisFailure, type CrisReply } from '@/lib/cris-client';
import { EMPTY_CRIS_MEMORY, getCrisMemory, isCrisMemoryEmpty, type CrisUserMemory } from '@/lib/cris-memory';
import { useStudy } from '@/lib/study-store';

/* ------------------------------------------------------------------ *
 * Constantes
 * ------------------------------------------------------------------ */

/** Preferências do popup (só o liga/desliga das sugestões é persistido). */
const PREFS_KEY = '@estudo-organizado/cris-popup-v1';
const TAB_BAR_BASE = 56;
const MAX_QUESTION = 1200;
const HINT_WINDOW_DAYS = 7;
const GREETING_BASE = 'Sou a Cris, sua mentora de estudos. Posso explicar um assunto, resumir um material, montar um plano ou destravar algo da tela em que você está. Por onde começamos?';

/** Telas que vivem dentro das abas (o FAB precisa ficar acima da barra). */
const TAB_ROUTES = ['/', '/editor', '/planning', '/library', '/chat', '/settings'];

/* ------------------------------------------------------------------ *
 * Tipos internos
 * ------------------------------------------------------------------ */

type PopupTurn = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  pending?: boolean;
  canceled?: boolean;
  target?: CrisReply['target'];
  latencyMs?: number;
  fallbackReason?: string | null;
  failure?: CrisFailure | null;
  suggestions?: string[];
};

type PopupPrefs = { suggestionsEnabled: boolean };

const DEFAULT_PREFS: PopupPrefs = { suggestionsEnabled: true };

export type PendingAssessment = { days: number; title: string };

/* ------------------------------------------------------------------ *
 * Helpers puros (sem React) — testáveis isoladamente
 * ------------------------------------------------------------------ */

/** Rota atual → contexto que a Cris recebe (título/seleção vêm das telas). */
export function buildPopupContext(route: string, topics: string[] = []): CrisContext {
  const clean = (route ?? '').trim() || '/';
  return {
    route: clean,
    screen: '',
    title: null,
    selection: null,
    detail: null,
    topics: topics.slice(0, 6),
  };
}

/**
 * Dias entre hoje e uma data legível por `Date.parse`.
 * Datas ambíguas ("30 ago") devolvem `null` para nunca gerar sugestão errada.
 */
export function daysUntilDate(value: string | undefined | null, now: Date = new Date()): number | null {
  const text = (value ?? '').trim();
  if (!text) return null;
  const parsed = Date.parse(text);
  if (Number.isNaN(parsed)) return null;
  const target = new Date(parsed);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfTarget = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime();
  const days = Math.round((startOfTarget - startOfToday) / 86400000);
  if (!Number.isFinite(days) || days < 0 || days > 365) return null;
  return days;
}

/** Próxima prova/teste com data confiável dentro da janela de sugestão. */
export function nextAssessment(
  events: { title: string; type: string; date?: string; done?: boolean }[],
  now: Date = new Date(),
): PendingAssessment | null {
  let best: PendingAssessment | null = null;
  for (const event of events ?? []) {
    if (event.done || (event.type !== 'Prova' && event.type !== 'Teste')) continue;
    const days = daysUntilDate(event.date, now);
    if (days === null || days > HINT_WINDOW_DAYS) continue;
    const title = (event.title ?? '').trim();
    if (!title) continue;
    if (!best || days < best.days) best = { days, title };
  }
  return best;
}

/** Títulos dos próximos compromissos do app (assuntos reais, sem inventar). */
export function upcomingTopics(
  events: { title: string; date?: string; done?: boolean }[],
  limit = 3,
  now: Date = new Date(),
): string[] {
  const entries: { title: string; days: number }[] = [];
  for (const event of events ?? []) {
    if (event.done) continue;
    const days = daysUntilDate(event.date, now);
    if (days === null) continue;
    const title = (event.title ?? '').trim();
    if (!title) continue;
    entries.push({ title, days });
  }
  entries.sort((a, b) => a.days - b.days);
  return entries.slice(0, Math.max(0, limit)).map(entry => entry.title);
}

/** Histórico da sessão enviado à IA: só turnos concluídos e com texto. */
export function toCrisHistory(turns: PopupTurn[]): { role: 'user' | 'assistant'; content: string }[] {
  return (turns ?? [])
    .filter(turn => !turn.pending && Boolean((turn.text ?? '').trim()))
    .map(turn => ({ role: turn.role, content: turn.text.trim() }));
}

/** Pergunta pronta da sugestão proativa de prova/teste. */
export function assessmentQuestion(hint: PendingAssessment): string {
  const when = hint.days === 0 ? 'hoje' : hint.days === 1 ? 'amanhã' : `em ${hint.days} dias`;
  return `Tenho ${hint.title} ${when}. Como você sugere que eu me prepare? Monte um plano curto de revisão.`;
}

/** Rótulo curto do cabeçalho (derivado do contexto completo). */
export function shortContextLabel(context: CrisContext): string {
  return describeScreen(context).replace(/^Tela aberta:\s*/, '');
}

/* ------------------------------------------------------------------ *
 * Componente
 * ------------------------------------------------------------------ */

export default function CrisPopup() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const { events } = useStudy();

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [turns, setTurns] = useState<PopupTurn[]>([]);
  const [busy, setBusy] = useState(false);
  const [prefs, setPrefs] = useState<PopupPrefs>(DEFAULT_PREFS);
  const [hintDismissed, setHintDismissed] = useState(false);

  const scrollRef = useRef<ScrollView | null>(null);
  const [memory, setMemory] = useState<CrisUserMemory>(EMPTY_CRIS_MEMORY);
  const abortRef = useRef<AbortController | null>(null);
  const turnsRef = useRef<PopupTurn[]>([]);
  const idRef = useRef(0);

  const route = (pathname ?? '/').replace(/^\/\(tabs\)/, '');

  useEffect(() => {
    turnsRef.current = turns;
  }, [turns]);

  // Memória persistente ("Sobre mim"): lida ao montar e de novo a cada
  // abertura, para refletir o que foi salvo em /cris-profile.
  const refreshMemory = useCallback(() => {
    void getCrisMemory().then(setMemory).catch(() => undefined);
  }, []);

  useEffect(() => {
    refreshMemory();
  }, [refreshMemory]);

  // Preferência de sugestões (persistida) — o histórico NÃO é persistido.
  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem(PREFS_KEY)
      .then(raw => {
        if (!active || !raw) return;
        const saved = JSON.parse(raw) as Partial<PopupPrefs>;
        setPrefs({ suggestionsEnabled: saved.suggestionsEnabled !== false });
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);

  // Contexto real da tela: rota + (em telas de estudo) os próximos prazos.
  const topics = useMemo(() => {
    if (route !== '/' && route !== '/planning') return [];
    return upcomingTopics(events);
  }, [events, route]);

  const context = useMemo(() => buildPopupContext(route, topics), [route, topics]);
  const contextLabel = useMemo(() => shortContextLabel(context), [context]);
  const hint = useMemo(
    () => (prefs.suggestionsEnabled ? nextAssessment(events) : null),
    [events, prefs.suggestionsEnabled],
  );

  const bottomPadding = Platform.OS === 'web' ? 12 : Math.max(insets.bottom, 8);
  const fabBottom = TAB_ROUTES.includes(route) ? TAB_BAR_BASE + bottomPadding + 16 : bottomPadding + 26;

  const toggleSuggestions = useCallback(() => {
    const next: PopupPrefs = { suggestionsEnabled: !prefs.suggestionsEnabled };
    setPrefs(next);
    void AsyncStorage.setItem(PREFS_KEY, JSON.stringify(next)).catch(() => undefined);
  }, [prefs.suggestionsEnabled]);

  // Aviso honesto na saudação: só aparece quando a config foi lida E nenhuma IA está pronta.
  // A leitura é tardia (import dinâmico) e nunca falha em voz alta — se der erro, não afirmamos nada.
  const [aiReady, setAiReady] = useState<boolean | null>(null);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    let unsubscribe: (() => void) | undefined;
    void (async () => {
      try {
        const apiConfig = await import('@/lib/api-config');
        // Relê a cada abertura e assina mudanças (ex.: ligar a IA em Ajustes -> IA).
        const apply = (config: AiConfig) => {
          if (!alive) return;
          setAiReady(apiConfig.isLocalAiReady(config.local) || apiConfig.isProviderAiReady(config.provider));
        };
        apply(await apiConfig.getAiConfig());
        unsubscribe = apiConfig.subscribeAiConfig(apply);
      } catch {
        if (alive) setAiReady(true);
      }
    })();
    return () => {
      alive = false;
      unsubscribe?.();
    };
  }, [open]);

  const openPopup = useCallback(() => {
    refreshMemory();
    setOpen(true);
  }, [refreshMemory]);
  const closePopup = useCallback(() => setOpen(false), []);

  const openAboutMe = useCallback(() => {
    setOpen(false);
    router.push('/cris-profile');
  }, []);

  const openAiSettings = useCallback(() => {
    setOpen(false);
    router.push('/api-settings');
  }, []);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const clearHistory = useCallback(() => {
    abortRef.current?.abort();
    setTurns([]);
    setDraft('');
    setHintDismissed(false);
  }, []);

  // Continua rolando para o fim enquanto a resposta cresce.
  useEffect(() => {
    if (!open) return;
    const timeout = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 40);
    return () => clearTimeout(timeout);
  }, [open, turns]);

  const send = useCallback(async (raw?: string) => {
    const question = (raw ?? draft).trim().slice(0, MAX_QUESTION);
    if (!question || busy) return;
    idRef.current += 1;
    const assistantId = `c-${idRef.current}`;
    const history = toCrisHistory(turnsRef.current);
    setDraft('');
    setHintDismissed(true);
    setTurns(current => [
      ...current,
      { id: `u-${idRef.current}`, role: 'user', text: question },
      { id: assistantId, role: 'assistant', text: '', pending: true },
    ]);
    setBusy(true);
    const controller = new AbortController();
    abortRef.current = controller;
    const aborted = () => controller.signal.aborted;
    const patchAssistant = (changes: Partial<PopupTurn>) => {
      setTurns(current => current.map(turn => (turn.id === assistantId ? { ...turn, ...changes } : turn)));
    };
    try {
      const reply = await streamCris(
        question,
        context,
        chunk => {
          if (aborted() || !chunk) return;
          setTurns(current => current.map(turn => (turn.id === assistantId ? { ...turn, text: `${turn.text}${chunk}` } : turn)));
        },
        { history, signal: controller.signal, memory },
      );
      if (aborted()) {
        // Cancelado: mantém o que já chegou e descarta a resposta pronta do cliente.
        patchAssistant({ pending: false, canceled: true });
      } else {
        patchAssistant({
          pending: false,
          text: reply.text,
          target: reply.target,
          latencyMs: reply.latencyMs,
          fallbackReason: reply.fallbackReason,
          failure: reply.failure ?? null,
          suggestions: reply.suggestions,
        });
      }
    } catch {
      setTurns(current => current.map(turn => (turn.id === assistantId
        ? { ...turn, pending: false, text: turn.text.trim() || 'Não foi possível falar com a IA agora.' }
        : turn)));
    } finally {
      abortRef.current = null;
      setBusy(false);
    }
  }, [busy, context, draft, memory]);

  const wide = width >= 900;
  const lastAssistant = [...turns].reverse().find(turn => turn.role === 'assistant' && !turn.pending);
  const chips = prefs.suggestionsEnabled && !busy ? (lastAssistant?.suggestions ?? []) : [];
  const showHint = Boolean(hint) && prefs.suggestionsEnabled && !hintDismissed && turns.length === 0;
  const greeting = memory.name ? `Oi, ${memory.name}! ${GREETING_BASE}` : `Oi! ${GREETING_BASE}`;
  const knowsMe = !isCrisMemoryEmpty(memory);

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Abrir a Cris, sua mentora de estudos"
        onPress={openPopup}
        style={({ pressed }) => [
          styles.fab,
          { backgroundColor: colors.primary, bottom: fabBottom },
          pressed && styles.pressed,
        ]}
      >
        <MaterialIcons name="auto-awesome" size={24} color="#FFFFFF" />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={closePopup}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboard}>
          <View style={[styles.overlay, wide ? styles.overlayWide : styles.overlaySheet]}>
            <Pressable accessibilityRole="button" accessibilityLabel="Fechar a Cris" onPress={closePopup} style={styles.backdrop} />
            <View
              accessibilityViewIsModal
              style={[
                styles.panel,
                wide ? styles.panelWide : styles.panelSheet,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <View style={styles.mark}>
                  <Text style={styles.markText}>✦</Text>
                </View>
                <View style={styles.headerText}>
                  <Text style={[styles.headerTitle, { color: colors.foreground }]}>Cris</Text>
                  <Text numberOfLines={1} style={[styles.headerSubtitle, { color: colors.muted }]}>{contextLabel}</Text>
                </View>
                <Pressable
                  accessibilityRole="switch"
                  accessibilityLabel={prefs.suggestionsEnabled ? 'Desligar sugestões da Cris' : 'Ligar sugestões da Cris'}
                  accessibilityState={{ checked: prefs.suggestionsEnabled }}
                  onPress={toggleSuggestions}
                  style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
                >
                  <MaterialIcons
                    name={prefs.suggestionsEnabled ? 'lightbulb' : 'lightbulb-outline'}
                    size={20}
                    color={prefs.suggestionsEnabled ? academicColors.warning : colors.muted}
                  />
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Sobre mim: o que a Cris sabe sobre você"
                  onPress={openAboutMe}
                  style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
                >
                  <MaterialIcons name="person-outline" size={20} color={memory.name ? colors.primary : colors.muted} />
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Configurar a IA da Cris"
                  onPress={openAiSettings}
                  style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
                >
                  <MaterialIcons name="settings" size={20} color={colors.muted} />
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Limpar histórico da conversa"
                  onPress={clearHistory}
                  style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
                >
                  <MaterialIcons name="delete-sweep" size={20} color={colors.muted} />
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Fechar a Cris"
                  onPress={closePopup}
                  style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
                >
                  <MaterialIcons name="close" size={22} color={colors.foreground} />
                </Pressable>
              </View>

              <ScrollView
                ref={scrollRef}
                style={styles.thread}
                contentContainerStyle={styles.threadContent}
                keyboardShouldPersistTaps="handled"
              >
                <View style={styles.intro}>
                  <View style={styles.introMark}>
                    <Text style={styles.introMarkText}>✦</Text>
                  </View>
                  <Text style={[styles.introText, { color: colors.foreground }]}>{greeting}</Text>
                </View>
                {!knowsMe ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Contar para a Cris quem eu sou"
                    onPress={openAboutMe}
                    style={({ pressed }) => [styles.fallbackRow, pressed && styles.pressed]}
                  >
                    <MaterialIcons name="person-outline" size={14} color={colors.primary} />
                    <Text style={[styles.fallbackText, { color: colors.primary }]}>
                      Ainda não sei quem você é nem o que você estuda. Toque aqui e me conte — eu uso isso para te ajudar melhor.
                    </Text>
                  </Pressable>
                ) : null}
                {aiReady === false ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Configurar a IA da Cris"
                    onPress={openAiSettings}
                    style={({ pressed }) => [styles.fallbackRow, pressed && styles.pressed]}
                  >
                    <MaterialIcons name="settings" size={14} color={academicColors.warning} />
                    <Text style={[styles.fallbackText, { color: academicColors.warning }]}>
                      Nenhuma IA conectada ainda. Toque aqui para conectar a Cris — sem isso eu respondo com o conteúdo pronto do app.
                    </Text>
                  </Pressable>
                ) : null}

                {showHint && hint ? (
                  <View style={styles.hint}>
                    <MaterialIcons name="lightbulb-outline" size={16} color={academicColors.warning} />
                    <View style={styles.hintBody}>
                      <Text style={styles.hintTitle}>
                        {hint.days === 0 ? `${hint.title} é hoje` : hint.days === 1 ? `${hint.title} é amanhã` : `${hint.title} em ${hint.days} dias`}
                      </Text>
                      <Text style={styles.hintText}>Quer um plano curto de revisão para chegar bem?</Text>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Montar plano de revisão"
                        onPress={() => void send(assessmentQuestion(hint))}
                        style={({ pressed }) => [styles.hintAction, pressed && styles.pressed]}
                      >
                        <Text style={styles.hintActionText}>Montar plano</Text>
                      </Pressable>
                    </View>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Dispensar sugestão"
                      onPress={() => setHintDismissed(true)}
                      style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
                    >
                      <MaterialIcons name="close" size={16} color={academicColors.muted} />
                    </Pressable>
                  </View>
                ) : null}

                {turns.map(turn => {
                  const isUser = turn.role === 'user';
                  const empty = !turn.text.trim();
                  return (
                    <View key={turn.id} style={[styles.turn, isUser ? styles.turnUser : styles.turnCris]}>
                      <View
                        style={[
                          styles.bubble,
                          isUser
                            ? { backgroundColor: colors.primary, borderColor: colors.primary }
                            : { backgroundColor: colors.background, borderColor: colors.border },
                        ]}
                      >
                        {turn.pending && empty ? (
                          <View style={styles.thinking}>
                            <ActivityIndicator size="small" color={colors.primary} />
                            <Text style={[styles.thinkingText, { color: colors.muted }]}>Cris está pensando…</Text>
                          </View>
                        ) : (
                          <Text style={[styles.bubbleText, { color: isUser ? '#FFFFFF' : colors.foreground }]}>
                            {empty && turn.canceled ? 'Chamada interrompida.' : turn.text}
                          </Text>
                        )}
                      </View>
                      {!isUser && !turn.pending ? (
                        <Text style={[styles.meta, { color: colors.muted }]}>
                          {turn.canceled
                            ? 'Interrompido por você'
                            : `${turn.target?.label ?? 'Resposta do app'}${turn.latencyMs ? ` · ${turn.latencyMs} ms` : ''}${turn.target?.kind === 'fallback' ? ' · sem IA conectada' : ''}`}
                        </Text>
                      ) : null}
                      {!isUser && turn.fallbackReason && !turn.failure ? (
                        <View style={styles.fallbackRow}>
                          <MaterialIcons name="info-outline" size={14} color={academicColors.warning} />
                          <Text style={[styles.fallbackText, { color: academicColors.warning }]}>{turn.fallbackReason}</Text>
                        </View>
                      ) : null}
                      {!isUser && turn.failure ? (
                        <View style={styles.failureCard}>
                          <View style={styles.fallbackRow}>
                            <MaterialIcons name="error-outline" size={14} color={academicColors.warning} />
                            <Text style={[styles.fallbackText, { color: academicColors.warning }]}>{turn.failure.message}</Text>
                          </View>
                          {turn.failure.kind === 'retired-model' || turn.failure.kind === 'invalid-key' || turn.failure.kind === 'rate-limit' ? (
                            <Pressable
                              accessibilityRole="button"
                              accessibilityLabel="Corrigir as configurações de IA agora"
                              onPress={openAiSettings}
                              style={({ pressed }) => [styles.inlineAction, { borderColor: colors.border }, pressed && styles.pressed]}
                            >
                              <Text style={[styles.inlineActionText, { color: colors.primary }]}>Corrigir agora</Text>
                            </Pressable>
                          ) : null}
                        </View>
                      ) : null}
                      {!isUser && !turn.pending && turn.target?.kind === 'fallback' ? (
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel="Abrir configurações de IA"
                          onPress={openAiSettings}
                          style={({ pressed }) => [styles.inlineAction, { borderColor: colors.border }, pressed && styles.pressed]}
                        >
                          <Text style={[styles.inlineActionText, { color: colors.primary }]}>Configurar IA</Text>
                        </Pressable>
                      ) : null}
                    </View>
                  );
                })}
              </ScrollView>

              {chips.length ? (
                <View style={[styles.chips, { borderTopColor: colors.border }]}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                    {chips.map(chip => (
                      <Pressable
                        key={chip}
                        accessibilityRole="button"
                        accessibilityLabel={chip}
                        onPress={() => void send(chip)}
                        style={({ pressed }) => [styles.chip, { borderColor: colors.border, backgroundColor: colors.background }, pressed && styles.pressed]}
                      >
                        <Text style={[styles.chipText, { color: colors.primary }]}>{chip}</Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              ) : null}

              <View style={[styles.composer, { borderTopColor: colors.border, paddingBottom: Math.max(insets.bottom, 10) }]}>
                <TextInput
                  value={draft}
                  onChangeText={setDraft}
                  placeholder="Pergunte algo à Cris…"
                  placeholderTextColor={colors.muted}
                  multiline
                  accessibilityLabel="Escreva sua pergunta para a Cris"
                  onKeyPress={event => {
                    const nativeEvent = event.nativeEvent as typeof event.nativeEvent & { shiftKey?: boolean };
                    if (!shouldSendChatOnEnter(nativeEvent.key, nativeEvent.shiftKey)) return;
                    event.preventDefault?.();
                    void send();
                  }}
                  style={[styles.input, { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border }]}
                />
                {busy ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Parar a resposta"
                    onPress={cancel}
                    style={({ pressed }) => [styles.sendButton, { backgroundColor: academicColors.danger }, pressed && styles.pressed]}
                  >
                    <MaterialIcons name="stop" size={20} color="#FFFFFF" />
                  </Pressable>
                ) : (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Enviar para a Cris"
                    disabled={!draft.trim()}
                    onPress={() => void send()}
                    style={({ pressed }) => [styles.sendButton, { backgroundColor: colors.primary }, !draft.trim() && styles.disabled, pressed && styles.pressed]}
                  >
                    <MaterialIcons name="send" size={20} color="#FFFFFF" />
                  </Pressable>
                )}
              </View>

              <Text style={[styles.note, { color: colors.muted }]}>
                Sua pergunta vai direto para a IA local ou para o provedor que você configurou — nada passa pelos servidores do app. Se a Cris repetir uma resposta, tente um modelo maior (Groq ou Gemini) em Configurar IA.
              </Text>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

/* ------------------------------------------------------------------ *
 * Estilos (tokens do app + paleta do tema)
 * ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  backdrop: { bottom: 0, left: 0, position: 'absolute', right: 0, top: 0 },
  bubble: { borderRadius: 14, borderWidth: 1, maxWidth: '92%', paddingHorizontal: 12, paddingVertical: 10 },
  bubbleText: { fontSize: 14, lineHeight: 20 },
  chip: { borderRadius: 999, borderWidth: 1, marginRight: 8, paddingHorizontal: 12, paddingVertical: 7 },
  chips: { borderTopWidth: 1, paddingHorizontal: 12, paddingVertical: 10 },
  chipText: { fontSize: 12, fontWeight: '700' },
  composer: { alignItems: 'flex-end', borderTopWidth: 1, flexDirection: 'row', paddingHorizontal: 12, paddingTop: 10 },
  disabled: { opacity: 0.45 },
  fab: { alignItems: 'center', borderRadius: 28, elevation: 6, height: 56, justifyContent: 'center', position: 'absolute', right: 18, shadowColor: '#111827', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.24, shadowRadius: 14, width: 56, zIndex: 40 },
  fallbackRow: { alignItems: 'flex-start', flexDirection: 'row', marginTop: 6 },
  fallbackText: { flex: 1, fontSize: 12, fontWeight: '600', lineHeight: 16, marginLeft: 6 },
  failureCard: { borderTopColor: academicColors.warning, borderTopWidth: 2, marginTop: 6, paddingTop: 4 },
  header: { alignItems: 'center', borderBottomWidth: 1, flexDirection: 'row', paddingHorizontal: 14, paddingVertical: 12 },
  headerSubtitle: { fontSize: 11, marginTop: 1 },
  headerText: { flex: 1, paddingRight: 8 },
  headerTitle: { fontSize: 16, fontWeight: '800' },
  hint: { alignItems: 'flex-start', backgroundColor: academicColors.violetSoft, borderRadius: 14, flexDirection: 'row', padding: 12 },
  hintAction: { alignSelf: 'flex-start', backgroundColor: academicColors.indigo, borderRadius: 999, marginTop: 8, paddingHorizontal: 14, paddingVertical: 7 },
  hintActionText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  hintBody: { flex: 1, paddingLeft: 8 },
  hintText: { color: academicColors.muted, fontSize: 12, lineHeight: 17, marginTop: 2 },
  hintTitle: { color: academicColors.ink, fontSize: 13, fontWeight: '800' },
  iconButton: { alignItems: 'center', height: 36, justifyContent: 'center', width: 36 },
  inlineAction: { alignSelf: 'flex-start', borderRadius: 999, borderWidth: 1, marginTop: 8, paddingHorizontal: 12, paddingVertical: 6 },
  inlineActionText: { fontSize: 12, fontWeight: '800' },
  input: { borderRadius: 14, borderWidth: 1, flex: 1, fontSize: 14, lineHeight: 19, marginRight: 8, maxHeight: 120, minHeight: 42, paddingHorizontal: 12, paddingVertical: 10 },
  intro: { alignItems: 'flex-start', flexDirection: 'row', marginBottom: 4 },
  introMark: { alignItems: 'center', backgroundColor: academicColors.violetSoft, borderRadius: 12, height: 32, justifyContent: 'center', marginRight: 10, width: 32 },
  introMarkText: { color: academicColors.violet, fontSize: 16, fontWeight: '800' },
  introText: { flex: 1, fontSize: 14, lineHeight: 20 },
  keyboard: { flex: 1 },
  mark: { alignItems: 'center', backgroundColor: academicColors.violetSoft, borderRadius: 12, height: 34, justifyContent: 'center', marginRight: 10, width: 34 },
  markText: { color: academicColors.violet, fontSize: 17, fontWeight: '800' },
  meta: { fontSize: 11, marginTop: 4 },
  note: { fontSize: 11, lineHeight: 15, paddingBottom: 12, paddingHorizontal: 14, paddingTop: 6 },
  overlay: { backgroundColor: 'rgba(15,19,32,0.42)', flex: 1 },
  overlaySheet: { justifyContent: 'flex-end' },
  overlayWide: { alignItems: 'flex-end', justifyContent: 'center', padding: 20 },
  panel: { overflow: 'hidden' },
  panelSheet: { borderTopLeftRadius: 22, borderTopRightRadius: 22, borderTopWidth: 1, maxHeight: '90%', width: '100%' },
  panelWide: { borderRadius: 18, borderWidth: 1, height: '100%', width: 420 },
  pressed: { opacity: 0.82 },
  sendButton: { alignItems: 'center', borderRadius: 14, height: 42, justifyContent: 'center', width: 42 },
  thinking: { alignItems: 'center', flexDirection: 'row' },
  thinkingText: { fontSize: 13, marginLeft: 8 },
  thread: { flexBasis: 'auto', flexGrow: 1, flexShrink: 1 },
  threadContent: { padding: 14 },
  turn: { marginBottom: 14 },
  turnCris: { alignItems: 'flex-start' },
  turnUser: { alignItems: 'flex-end' },
});
