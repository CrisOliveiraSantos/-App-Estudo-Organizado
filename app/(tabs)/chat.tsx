import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, FlatList, Image, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { NEON_LAYOUT, neonNavClearance } from '@/components/neon/nav-items';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useKeyboardInset } from '@/hooks/use-keyboard-inset';
import { useStudyActions, useStudyChatMessages, type ChatMessage } from '@/lib/study-store';
import { useColors } from '@/hooks/use-colors';
import { readLocalChatAccount, saveLocalChatAccount, type LocalChatAccount } from '@/lib/local-chat-auth';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { isMessageInConversation, listCloudMessages, readableSupabaseError, requestPasswordReset, sendCloudMessage, signInWithSupabase, signUpWithSupabase, subscribeToCloudMessages, type CloudMessage } from '@/lib/supabase-chat';
import { shouldSendChatOnEnter } from '@/lib/chat-utils';
import { hexToRgba } from '@/lib/theme-runtime';

type Room = 'Sala pública' | 'Conversa privada';
type VisibleMessage = { id: string; author: string; text: string; createdAt: string; isOwn: boolean };
type CloudUser = { id: string; email?: string; displayName: string };
type AuthFeedback = { tone: 'success' | 'error'; text: string } | null;

/**
 * Rosto da Cris. É o recorte de `cris-avatar-novo-Mockup.png` com o xadrez do
 * editor removido pixel a pixel (flood-fill a partir das bordas) e alpha real
 * preservado — `assets/brand/avatar/cris-avatar.png`, 512×512. `require` estático
 * para o Metro embutir o PNG no APK.
 */
const CRIS_AVATAR = require('../../assets/brand/avatar/cris-avatar.png');

function toCloudUser(user: { id: string; email?: string; user_metadata?: Record<string, unknown> }): CloudUser {
  return {
    id: user.id,
    email: user.email,
    displayName: String(user.user_metadata?.display_name ?? user.email?.split('@')[0] ?? 'Estudante'),
  };
}

export default function ChatScreen() {
  const colors = useColors();
  const { width } = useWindowDimensions();
  /**
   * Folga do fim do compositor (e do `AuthPanel`): a pílula da bottom nav é
   * `position:absolute` e não reserva espaço sozinha, então o campo de digitação
   * precisa terminar **acima** dela (`neonNavClearance` = 84 + 12 + 20 = 116,
   * mais 8 px de respiro).
   *
   * Antes a conta era `neonFabClearance` (176) + `insets.bottom` + 8 = ~208/232:
   * a faixa em que o FAB da Cris pairava sobre o compositor, o que empurrava o
   * input ~90 px para cima (o "espaço vazio" embaixo) e espremia a lista. O FAB
   * sai de cena nesta aba (ver `components/cris-popup.tsx`), então a folga é só
   * a da pílula. `insets.bottom` **não** entra: o `SafeAreaView` do
   * `ScreenContainer` já o aplica por fora e somar de novo subia o input.
   */
  const navClearance = neonNavClearance(width >= NEON_LAYOUT.breakpoint) + 8;
  /**
   * Teclado: o compositor sobe por `keyboard.inset` (já sem o inset do aparelho
   * e sem o que a janela do Android encolheu sozinha) e a lista rola para a
   * última mensagem assim que ele aparece — antes o campo de digitação ficava
   * escondido atrás do teclado.
   */
  const keyboard = useKeyboardInset();
  const listRef = useRef<FlatList<VisibleMessage>>(null);
  const scrollToLatest = useCallback((animated: boolean) => {
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated }));
  }, []);
  useEffect(() => {
    if (keyboard.visible) scrollToLatest(true);
  }, [keyboard.visible, scrollToLatest]);
  const chatMessages = useStudyChatMessages();
  const { addChatMessage } = useStudyActions();
  const [localAccount, setLocalAccount] = useState<LocalChatAccount | null>(null);
  const [cloudUser, setCloudUser] = useState<CloudUser | null>(null);
  const [cloudMessages, setCloudMessages] = useState<CloudMessage[]>([]);
  const [pendingMessages, setPendingMessages] = useState<ChatMessage[]>([]);
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'recovery'>('register');
  const [authEmail, setAuthEmail] = useState('');
  const [authName, setAuthName] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authPending, setAuthPending] = useState(false);
  const [authFeedback, setAuthFeedback] = useState<AuthFeedback>(null);
  const [room, setRoom] = useState<Room>('Sala pública');
  const [recipient, setRecipient] = useState('');
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const sendingRef = useRef(false);
  const [connected, setConnected] = useState(false);

  /**
   * Conta local: relida a cada foco. A tela de login (`/login`) grava a
   * identidade e volta para o chat; como a aba continua montada atrás da pilha,
   * um `useEffect` de mount não veria a conta nova.
   */
  useFocusEffect(
    useCallback(() => {
      if (isSupabaseConfigured) return;
      void readLocalChatAccount().then(setLocalAccount);
    }, []),
  );

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    const setUser = (user: { id: string; email?: string; user_metadata?: Record<string, unknown> } | null) => {
      if (!active) return;
      setCloudUser(user ? toCloudUser(user) : null);
    };
    void supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
    return () => { active = false; data.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured || !cloudUser?.email) return;
    let active = true;
    const cloudRoom = room === 'Sala pública' ? 'public' : 'private';
    void listCloudMessages(cloudRoom, cloudUser.email, recipient)
      .then(items => { if (active) setCloudMessages(items); })
      .catch(() => { if (active) setConnected(false); });
    const cleanup = subscribeToCloudMessages(message => {
      if (!active || !isMessageInConversation(message, cloudRoom, cloudUser.email, recipient)) return;
      setCloudMessages(current => current.some(item => item.id === message.id) ? current : [...current, message]);
    });
    return () => { active = false; cleanup(); };
  }, [cloudUser?.email, recipient, room]);

  useEffect(() => {
    setConnected(isSupabaseConfigured ? Boolean(cloudUser) : Boolean(localAccount));
  }, [cloudUser, localAccount]);

  const submitAuth = async () => {
    const email = authEmail.trim();
    if (!email || (authMode !== 'recovery' && !authPassword)) {
      Alert.alert('Preencha seus dados', authMode === 'recovery' ? 'Informe o e-mail para continuar.' : 'Informe e-mail e senha para continuar.');
      return;
    }
    setAuthFeedback(null);
    setAuthPending(true);
    try {
      if (isSupabaseConfigured) {
        if (authMode === 'recovery') {
          await requestPasswordReset(email);
          setAuthFeedback({ tone: 'success', text: 'Se houver uma conta com este endereço, você receberá instruções para criar uma nova senha. Verifique a caixa de entrada e o spam.' });
        } else if (authMode === 'register') {
          const data = await signUpWithSupabase(email, authPassword, authName.trim() || 'Estudante');
          if (data.session?.user) {
            setCloudUser(toCloudUser(data.session.user));
            setAuthFeedback({ tone: 'success', text: 'Conta criada e acesso iniciado.' });
          } else {
            setAuthFeedback({ tone: 'success', text: 'Conta criada. Confirme o e-mail recebido e volte a esta página para entrar.' });
          }
        } else {
          const data = await signInWithSupabase(email, authPassword);
          const user = data.user ?? data.session?.user;
          if (!user) throw new Error('Não foi possível iniciar a sessão. Tente entrar novamente.');
          setCloudUser(toCloudUser(user));
          setAuthFeedback({ tone: 'success', text: 'Acesso realizado. Abrindo suas conversas…' });
        }
      } else {
        const existing = await readLocalChatAccount();
        if (authMode === 'login' && existing && existing.email.toLowerCase() !== email.toLowerCase()) {
          Alert.alert('Conta local diferente', 'Este dispositivo está no modo local. Entre com o e-mail usado neste aparelho ou crie uma identidade local.');
          return;
        }
        const fallback: LocalChatAccount = existing ?? {
          id: `local-${Date.now()}`,
          email: email.toLowerCase(),
          displayName: authName.trim() || email.split('@')[0] || 'Estudante',
        };
        await saveLocalChatAccount(fallback);
        setLocalAccount(fallback);
        setAuthFeedback({ tone: 'success', text: 'Modo local iniciado. As mensagens ficam disponíveis somente neste dispositivo.' });
      }
      setAuthPassword('');
    } catch (error) {
      const text = isSupabaseConfigured ? readableSupabaseError(error) : 'Revise os dados e tente novamente.';
      setAuthFeedback({ tone: 'error', text });
      if (Platform.OS !== 'web') Alert.alert('Não foi possível entrar', text);
    } finally {
      setAuthPending(false);
    }
  };

  const visibleMessages = useMemo<VisibleMessage[]>(() => {
    if (isSupabaseConfigured) {
      const cloud = cloudMessages.map(message => ({
        id: message.id,
        author: message.sender_name,
        text: message.text,
        createdAt: new Date(message.created_at).toLocaleString('pt-BR'),
        isOwn: message.sender_id === cloudUser?.id,
      }));
      const pending = pendingMessages
        .filter(message => message.room === room)
        .map(message => ({ ...message, isOwn: true }));
      return Array.from(new Map([...cloud, ...pending].map(message => [message.id, message])).values());
    }
    return chatMessages.filter(message => message.room === room)
      .map(message => ({ ...message, isOwn: message.author === localAccount?.displayName || message.author === 'Cris' }));
  }, [chatMessages, cloudMessages, cloudUser?.id, localAccount?.displayName, pendingMessages, room]);

  /**
   * Mensagem nova (minha, da Cris ou da nuvem): a lista acompanha o fim. Com o
   * teclado aberto isso também mantém o compositor e a última bolha visíveis.
   */
  useEffect(() => {
    scrollToLatest(false);
  }, [scrollToLatest, visibleMessages.length]);

  const send = async () => {
    const text = draft.trim();
    if (!text || sendingRef.current) return;
    if (room === 'Conversa privada' && !recipient.trim()) {
      Alert.alert('Informe o destinatário', 'Digite o e-mail da pessoa antes de enviar uma mensagem privada.');
      return;
    }
    sendingRef.current = true;
    setSending(true);
    setDraft('');
    try {
      if (isSupabaseConfigured) {
        const sent = await sendCloudMessage({ text, room: room === 'Sala pública' ? 'public' : 'private', recipientEmail: recipient });
        setCloudMessages(current => current.some(message => message.id === sent.id) ? current : [...current, sent]);
      } else {
        addChatMessage(text, room);
      }
    } catch (error) {
      const localMessage: ChatMessage = { id: `pending-${Date.now()}`, author: cloudUser?.displayName ?? localAccount?.displayName ?? 'Estudante', text, room, createdAt: 'Agora' };
      if (isSupabaseConfigured) setPendingMessages(current => [...current, localMessage]);
      else addChatMessage(text, room);
      Alert.alert('Mensagem mantida neste dispositivo', isSupabaseConfigured ? `${readableSupabaseError(error)} A mensagem continua visível neste aparelho; envie novamente quando a conexão voltar.` : 'O servidor de conversa não respondeu. A mensagem continua disponível neste dispositivo.');
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  };

  const handleDraftKeyPress = (key: string, shiftKey?: boolean) => {
    if (!shouldSendChatOnEnter(key, shiftKey)) return;
    void send();
  };

  /**
   * Item da lista com identidade estável: sem o `useCallback`, cada tecla no
   * compositor recriava a função e o FlatList redesenhava as bolhas visíveis.
   *
   * Precisa ficar **antes** do `return` do `AuthPanel`: hooks não podem viver
   * depois de uma saída antecipada (era o erro #310 do React ao sair do login).
   */
  const renderMessage = useCallback(
    ({ item }: { item: VisibleMessage }) => (
      <View className={`mb-3 max-w-[88%] ${item.isOwn ? 'self-end' : 'self-start'}`}>
        <Text className="text-muted text-[11px] mb-1">{item.author} · {item.createdAt}</Text>
        <View className={`rounded-2xl px-4 py-3 ${item.isOwn ? 'bg-primary rounded-tr-sm' : 'bg-surface border border-border rounded-tl-sm'}`}>
          <Text className={item.isOwn ? 'text-white leading-5' : 'text-foreground leading-5'}>{item.text}</Text>
        </View>
      </View>
    ),
    [],
  );

  if (!cloudUser && !localAccount) {
    return (
      <ScreenContainer edges={['bottom', 'left', 'right']}>
        <View className="flex-1" style={{ paddingBottom: keyboard.visible ? keyboard.inset : 0 }}>
          <AuthPanel
            navClearance={navClearance}
            mode={authMode}
            setMode={setAuthMode}
            email={authEmail}
            setEmail={setAuthEmail}
            name={authName}
            setName={setAuthName}
            password={authPassword}
            setPassword={setAuthPassword}
            submit={submitAuth}
            loading={authPending}
            feedback={authFeedback}
            colors={colors}
            usesSupabase={isSupabaseConfigured}
            forgotEmail={() => setAuthFeedback({ tone: 'success', text: 'Por segurança, o aplicativo não revela endereços de contas sem uma sessão iniciada. Verifique as caixas de entrada que você usa ou entre em outro dispositivo e abra Configurações › Meu perfil.' })}
          />
        </View>
      </ScreenContainer>
    );
  }

  const accountName = cloudUser?.displayName ?? localAccount?.displayName ?? 'Estudante';
  const privateRecipientReady = room === 'Sala pública' || Boolean(recipient.trim());
  return (
    <ScreenContainer edges={['bottom', 'left', 'right']}>
      <View className="flex-1">
        {/*
          O shell das abas já reserva o inset de cima (frame + topbar), então o
          `SafeAreaView` daqui **não** repete `top` e o cabeçalho começa logo
          abaixo da topbar: antes eram ~36 px perdidos (inset + `pt-5`) entre a
          barra e "COMUNIDADE DE ESTUDOS".
        */}
        <View className="px-5 pt-2">
          <View className="flex-row items-start justify-between">
            <View className="flex-1 pr-3">
              {/*
                O título divide a linha com o avatar da Cris e com o nome da
                conta no overline. `numberOfLines` + `adjustsFontSizeToFit`
                mantêm "Conversas" inteiro em telas estreitas, em vez de cortar
                com reticências quando o bloco da direita cresce.
              */}
              <Text adjustsFontSizeToFit minimumFontScale={0.75} numberOfLines={1} className="text-xs font-semibold text-primary">COMUNIDADE DE ESTUDOS · {accountName}</Text>
              <Text adjustsFontSizeToFit minimumFontScale={0.8} numberOfLines={1} className="text-3xl font-bold text-foreground mt-1">Conversas</Text>
              <Text className="text-muted mt-2">Troque ideias, materiais e dúvidas com outros estudantes.</Text>
              {cloudUser && <TouchableOpacity onPress={() => router.push('/profile')} accessibilityRole="button" accessibilityLabel="Abrir meu perfil" style={styles.profileShortcut}><Text style={{ color: colors.primary, fontWeight: '800', fontSize: 13 }}>Meu perfil e configurações da conta</Text></TouchableOpacity>}
            </View>
            {/*
              O rosto da Cris no header (mockup de login/chat). É o mesmo arquivo
              do FAB: enquanto o FAB é a ação, aqui ele é a identidade — tocar
              abre o perfil da Cris.
            */}
            <Pressable
              accessibilityLabel="Ver o perfil da Cris"
              accessibilityRole="button"
              onPress={() => router.push('/cris-profile')}
              style={({ pressed }) => [
                styles.headerAvatarRing,
                { backgroundColor: colors.surfaceAlt, borderColor: hexToRgba(colors.primary, 0.55) },
                pressed && styles.pressed,
              ]}
            >
              <Image accessibilityIgnoresInvertColors source={CRIS_AVATAR} style={styles.headerAvatar} />
            </Pressable>
          </View>
          <View className="flex-row bg-surface border border-border rounded-2xl p-1 mt-3 mb-3">
            <Pressable
              onPress={() => setRoom('Sala pública')}
              accessibilityRole="button"
              accessibilityLabel="Abrir sala pública"
              style={({ pressed }) => [styles.roomChoice, room === 'Sala pública' && { backgroundColor: colors.primary }, pressed && styles.pressed]}
            >
              <Text className={`font-semibold ${room === 'Sala pública' ? 'text-white' : 'text-muted'}`}>Sala pública</Text>
            </Pressable>
            <Pressable
              onPress={() => setRoom('Conversa privada')}
              accessibilityRole="button"
              accessibilityLabel="Abrir conversa privada"
              style={({ pressed }) => [styles.roomChoice, room === 'Conversa privada' && { backgroundColor: colors.primary }, pressed && styles.pressed]}
            >
              <Text className={`font-semibold ${room === 'Conversa privada' ? 'text-white' : 'text-muted'}`}>Privada</Text>
            </Pressable>
          </View>
          {room === 'Conversa privada' && (
            <View className="flex-row items-center bg-surface border border-border rounded-xl px-3 mb-4">
              <IconSymbol name="person.2.fill" size={17} color={colors.muted} />
              <TextInput value={recipient} onChangeText={setRecipient} autoCapitalize="none" keyboardType="email-address" placeholder="E-mail da pessoa" placeholderTextColor={colors.muted} className="flex-1 px-2 py-3 text-foreground" />
            </View>
          )}
          <View className="flex-row items-center mb-3">
            <View className={`h-2 w-2 rounded-full mr-2 ${connected && privateRecipientReady ? 'bg-success' : 'bg-warning'}`} />
            <Text className="text-muted text-xs">{connected ? privateRecipientReady ? 'Conectado · mensagens atualizadas em tempo real' : 'Informe o e-mail para abrir a conversa privada' : 'Modo local · conecte-se para conversar entre dispositivos'}</Text>
          </View>
        </View>
        <FlatList
          ref={listRef}
          data={visibleMessages}
          keyExtractor={item => item.id}
          /**
           * `flex: 1` + `minHeight: 0`: a lista ocupa **todo** o espaço que sobra
           * entre o cabeçalho e o compositor e é ela quem encolhe quando o
           * teclado abre — o compositor fica com a altura que precisa e nunca é
           * coberto nem cobre a última bolha. Sem `minHeight: 0` o flexbox do
           * web mantém a altura do conteúdo e a lista passa por baixo do input.
           */
          style={{ flex: 1, minHeight: 0 }}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: 16, flexGrow: 1 }}
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          keyboardShouldPersistTaps="handled"
          /**
           * Lista incremental: as conversas em nuvem podem ter centenas de
           * mensagens e o mockup de banco local já traz um histórico. Só as 10
           * primeiras entram no primeiro frame e a janela de montagem fica em
           * 5 telas — trocar de aba não espera a lista inteira.
           */
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={5}
          /** Conteúdo cresceu (mensagem nova ou teclado abrindo): acompanha o fim. */
          onContentSizeChange={() => scrollToLatest(false)}
          ListEmptyComponent={<View className="bg-surface border border-border rounded-2xl p-5 mt-4"><Text className="text-foreground font-bold">Ainda não há mensagens</Text><Text className="text-muted mt-1">Comece a conversa compartilhando uma dúvida ou material.</Text></View>}
          /** Aviso de privacidade rola junto com as mensagens em vez de ocupar faixa fixa sobre elas. */
          ListFooterComponent={<Text className="text-muted text-[10px] mt-4 text-center leading-4">Conversas privadas são visíveis somente para os dois participantes.</Text>}
          renderItem={renderMessage}
        />
        {/*
          Compositor: fica **fora** da lista (a lista termina acima dele) e é o
          único container que recebe o `paddingBottom` dinâmico — fechado ele
          reserva a folga da pílula, aberto ele sobe exatamente o que o teclado
          ocupa. O aviso de privacidade saiu daqui: era uma faixa fixa de texto
          dentro do mesmo padding, ou seja, mais altura opaca sobre as mensagens.
        */}
        <View
          className="px-5 pt-2 border-t border-border bg-background"
          style={{ paddingBottom: keyboard.visible ? keyboard.inset + 12 : navClearance }}
        >
          <View className="flex-row items-end bg-surface border border-border rounded-2xl px-3 py-2">
            <TextInput
              value={draft}
              onChangeText={setDraft}
              onSubmitEditing={() => { if (Platform.OS === 'web') void send(); }}
              onKeyPress={event => {
                const nativeEvent = event.nativeEvent as typeof event.nativeEvent & { shiftKey?: boolean };
                if (!shouldSendChatOnEnter(nativeEvent.key, nativeEvent.shiftKey)) return;
                event.preventDefault?.();
                handleDraftKeyPress(nativeEvent.key, nativeEvent.shiftKey);
              }}
              placeholder="Escreva uma mensagem…"
              placeholderTextColor={colors.muted}
              multiline={Platform.OS !== 'web'}
              returnKeyType="send"
              blurOnSubmit={false}
              className="flex-1 text-foreground max-h-24 px-1 py-2"
            />
            <Pressable
              onPress={() => { void send(); }}
              disabled={!draft.trim() || sending}
              accessibilityRole="button"
              accessibilityLabel="Enviar mensagem"
              style={({ pressed }) => [styles.sendButton, { backgroundColor: colors.primary }, (!draft.trim() || sending) && styles.disabledButton, pressed && styles.pressed]}
            >
              <IconSymbol name="paperplane.fill" size={19} color="#fff" />
              <Text style={styles.sendButtonText}>{sending ? '...' : 'Enviar'}</Text>
            </Pressable>
          </View>
          {/* Dica de teclado só no desktop: no celular o Enter quebra linha e a linha extra virava faixa vazia. */}
          {Platform.OS === 'web' && (
            <Text className="text-muted text-[10px] mt-1 text-center">Pressione Enter para enviar.</Text>
          )}
        </View>
      </View>
    </ScreenContainer>
  );
}

function AuthPanel({ mode, setMode, email, setEmail, name, setName, password, setPassword, submit, loading, feedback, colors, usesSupabase, forgotEmail, navClearance }: { mode: 'login' | 'register' | 'recovery'; setMode: (value: 'login' | 'register' | 'recovery') => void; email: string; setEmail: (value: string) => void; name: string; setName: (value: string) => void; password: string; setPassword: (value: string) => void; submit: () => void; loading: boolean; feedback: AuthFeedback; colors: ReturnType<typeof useColors>; usesSupabase: boolean; forgotEmail: () => void; navClearance: number }) {
  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingBottom: navClearance, paddingHorizontal: 24 }}
      keyboardShouldPersistTaps="handled"
    >
      {/*
        Hero em pílula translúcida (e não `bg-primary` sólido): no tema Neon o
        primário é ciano vivo e o texto branco de 30 px ficava ilegível em cima
        dele. Aqui o acento entra no fundo a 14%, no texto de apoio e na borda.
      */}
      <View
        className="rounded-3xl p-6 mb-5"
        style={{ backgroundColor: hexToRgba(colors.primary, 0.14), borderColor: hexToRgba(colors.primary, 0.4), borderWidth: 1 }}
      >
        <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '800', letterSpacing: 1.2 }}>ESTUDO ORGANIZADO</Text>
        <Text style={{ color: colors.foreground, fontSize: 26, fontWeight: '800', marginTop: 4 }}>Entre para conversar</Text>
        <Text style={{ color: colors.muted, lineHeight: 20, marginTop: 8 }}>Crie uma identidade própria para participar da sala pública e conversar em particular com outros estudantes.</Text>
      </View>
      {/*
        A tela de login da Dolla (`app/login.tsx`) é a entrada oficial. Este
        atalho existe para o painel antigo não virar uma segunda porta sem saída
        — quem já estava acostumado com o formulário inline continua nele.
      */}
      <TouchableOpacity
        accessibilityLabel="Abrir a tela de login da Cris"
        accessibilityRole="button"
        onPress={() => router.push('/login')}
        style={[styles.loginShortcut, { borderColor: colors.border, borderRadius: 12, borderWidth: 1, marginBottom: 16 }]}
      >
        <Text style={{ color: colors.primary, fontWeight: '800' }}>Entrar pela tela de login da Cris →</Text>
      </TouchableOpacity>
      <View className="bg-surface border border-border rounded-3xl p-5">
        {mode !== 'recovery' && <View className="flex-row bg-background rounded-xl p-1 mb-5">
          <Pressable
            onPress={() => setMode('register')}
            accessibilityRole="button"
            accessibilityLabel="Criar conta"
            style={({ pressed }) => [styles.authChoice, { backgroundColor: mode === 'register' ? colors.primary : colors.background }, pressed && styles.pressed]}
          >
            <Text className={mode === 'register' ? 'text-white font-bold' : 'text-muted font-semibold'}>Criar conta</Text>
          </Pressable>
          <Pressable
            onPress={() => setMode('login')}
            accessibilityRole="button"
            accessibilityLabel="Entrar na conta existente"
            style={({ pressed }) => [styles.authChoice, { backgroundColor: mode === 'login' ? colors.primary : colors.background }, pressed && styles.pressed]}
          >
            <Text className={mode === 'login' ? 'text-white font-bold' : 'text-muted font-semibold'}>Entrar</Text>
          </Pressable>
        </View>}
        {mode === 'recovery' && <View style={[styles.recoveryHeader, { backgroundColor: `${colors.primary}12` }]}><Text className="text-foreground font-bold">Recuperar senha</Text><Text className="text-muted text-xs leading-5 mt-1">Informe o e-mail usado na conta. Por segurança, o resultado será o mesmo mesmo se ele não estiver cadastrado.</Text></View>}
        {mode === 'register' && <TextInput value={name} onChangeText={setName} placeholder="Seu nome de exibição" placeholderTextColor={colors.muted} className="bg-background border border-border rounded-xl px-3 py-3 text-foreground mb-3" />}
        <TextInput value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="Seu e-mail" placeholderTextColor={colors.muted} className="bg-background border border-border rounded-xl px-3 py-3 text-foreground mb-3" />
        {mode !== 'recovery' && <TextInput value={password} onChangeText={setPassword} onSubmitEditing={() => { void submit(); }} secureTextEntry placeholder="Senha com pelo menos 8 caracteres" placeholderTextColor={colors.muted} returnKeyType="go" className="bg-background border border-border rounded-xl px-3 py-3 text-foreground" />}
        <Pressable
          onPress={() => { void submit(); }}
          disabled={loading}
          accessibilityRole="button"
          accessibilityLabel={mode === 'register' ? 'Criar minha conta' : mode === 'recovery' ? 'Enviar e-mail de recuperação' : 'Entrar na conta'}
          style={({ pressed }) => [styles.authSubmit, { backgroundColor: colors.primary }, loading && styles.disabledButton, pressed && styles.pressed]}
        >
          <Text className="text-white font-bold">{loading ? 'Aguarde…' : mode === 'register' ? 'Criar minha conta' : mode === 'recovery' ? 'Enviar e-mail para recuperar senha' : 'Entrar na conta'}</Text>
        </Pressable>
        {feedback && (
          <View style={[styles.authFeedback, { backgroundColor: feedback.tone === 'success' ? `${colors.success}18` : `${colors.error}18`, borderColor: feedback.tone === 'success' ? colors.success : colors.error }]}>
            <Text style={{ color: feedback.tone === 'success' ? colors.success : colors.error }}>{feedback.text}</Text>
          </View>
        )}
        {usesSupabase && mode !== 'recovery' && <View style={styles.recoveryLinks}><TouchableOpacity onPress={() => { setMode('recovery'); setPassword(''); }} accessibilityRole="button" accessibilityLabel="Esqueci minha senha" style={styles.recoveryLinkButton}><Text style={[styles.recoveryLink, { color: colors.primary }]}>Esqueci minha senha</Text></TouchableOpacity><TouchableOpacity onPress={forgotEmail} accessibilityRole="button" accessibilityLabel="Esqueci meu e-mail" style={styles.recoveryLinkButton}><Text style={[styles.recoveryLink, { color: colors.primary }]}>Esqueci meu e-mail</Text></TouchableOpacity></View>}
        {mode === 'recovery' && <TouchableOpacity onPress={() => setMode('login')} accessibilityRole="button" accessibilityLabel="Voltar para entrar" style={styles.recoveryLinkButton}><Text style={[styles.recoveryLink, { color: colors.primary }]}>Voltar para Entrar</Text></TouchableOpacity>}
        <Text className="text-muted text-xs leading-5 mt-4">{usesSupabase ? mode === 'recovery' ? 'O link abre uma página segura para você definir a nova senha.' : 'Você receberá um e-mail para confirmar a conta. Seus estudos locais continuam disponíveis mesmo sem conexão.' : 'O modo local permanece disponível neste dispositivo se o servidor estiver indisponível.'}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  authFeedback: { borderRadius: 10, borderWidth: 1, marginTop: 12, padding: 12 },
  authChoice: { alignItems: 'center', borderRadius: 10, flex: 1, justifyContent: 'center', minHeight: 42, paddingHorizontal: 8 },
  authSubmit: { alignItems: 'center', borderRadius: 12, justifyContent: 'center', marginTop: 16, minHeight: 50, paddingHorizontal: 16 },
  disabledButton: { opacity: 0.5 },
  /**
   * Avatar do header: anel de 1,5 px + foto circular de 34 px dentro de uma
   * caixa de 44 px (alvo de toque do Material/Apple). O PNG já tem alpha fora
   * do círculo, então o `backgroundColor` da caixa só aparece no respiro do anel.
   */
  headerAvatar: { borderRadius: 17, height: 34, width: 34 },
  headerAvatarRing: { alignItems: 'center', borderRadius: 22, borderWidth: 1.5, height: 44, justifyContent: 'center', width: 44 },
  loginShortcut: { alignItems: 'center', alignSelf: 'stretch', justifyContent: 'center', minHeight: 44, paddingHorizontal: 4 },
  pressed: { opacity: 0.84, transform: [{ scale: 0.98 }] },
  profileShortcut: { alignSelf: 'flex-start', minHeight: 34, justifyContent: 'center', marginTop: 5 },
  recoveryHeader: { borderRadius: 10, marginBottom: 14, padding: 12 },
  recoveryLink: { fontSize: 13, fontWeight: '800' },
  recoveryLinkButton: { alignSelf: 'flex-start', minHeight: 38, justifyContent: 'center', paddingRight: 12 },
  recoveryLinks: { flexDirection: 'row', gap: 16, marginTop: 10 },
  roomChoice: { alignItems: 'center', borderRadius: 12, flex: 1, justifyContent: 'center', minHeight: 46, paddingHorizontal: 8 },
  sendButton: { alignItems: 'center', borderRadius: 12, justifyContent: 'center', marginLeft: 8, minHeight: 48, minWidth: 76, paddingHorizontal: 10 },
  sendButtonText: { color: '#fff', fontSize: 10, fontWeight: '700', marginTop: 1 },
});
