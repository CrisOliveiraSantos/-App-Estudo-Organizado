/**
 * Tela de login da Cris — tradução do mockup `tela de login completa.png`.
 *
 * Layout: céu estrelado da Madrugada (`ThemeBackground vivid`), marca vetorial
 * (chapéu + "Cris" em Bodoni Moda, ver `components/neon/cris-logo.tsx`), tagline
 * e um painel translúcido com e-mail/senha.
 *
 * Autenticação: a mesma dupla do resto do app — Supabase quando
 * `EXPO_PUBLIC_SUPABASE_URL/ANON_KEY` existem, conta local em `AsyncStorage`
 * quando não existem (modo offline, que é o padrão neste repositório). O botão
 * do Google só aparece habilitado com Supabase configurado, porque OAuth precisa
 * de provedor e redirect cadastrados; sem isso ele explica o motivo em vez de
 * falhar em silêncio.
 *
 * O gradiente do mockup é feito com `<NeonGradient>` (SVG) e não com
 * `react-native-linear-gradient`, que não é dependência do projeto.
 */

import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { NeonGradient, useAcademicPalette } from '@/components/academic/design-system';
import { CrisLogo } from '@/components/neon/cris-logo';
import { ThemeBackground } from '@/components/theme-background';
import { readLocalChatAccount, saveLocalChatAccount } from '@/lib/local-chat-auth';
import { consumeSupabaseAuthLink, getSupabaseOAuthRedirectUrl } from '@/lib/supabase-auth-link';
import { readableSupabaseError, requestPasswordReset, signInWithSupabase, signUpWithSupabase } from '@/lib/supabase-chat';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { glowShadow, cardShadow, hexToRgba, neonFonts, neonGradientAngles } from '@/lib/theme-runtime';

type Mode = 'login' | 'register' | 'recovery';
type Feedback = { tone: 'error' | 'success'; text: string } | null;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** "G" oficial do Google (quatro paths, cores de marca). */
function GoogleGlyph({ size = 20 }: { size?: number }) {
  return (
    <Svg height={size} viewBox="0 0 24 24" width={size}>
      <Path
        d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47a5.54 5.54 0 0 1-2.4 3.63v3h3.86c2.26-2.09 3.56-5.17 3.56-8.87z"
        fill="#4285F4"
      />
      <Path
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09A11.99 11.99 0 0 0 12 24z"
        fill="#34A853"
      />
      <Path d="M5.27 14.29a7.2 7.2 0 0 1 0-4.58V6.62H1.29a11.98 11.98 0 0 0 0 10.76l3.98-3.09z" fill="#FBBC05" />
      <Path
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75z"
        fill="#EA4335"
      />
    </Svg>
  );
}

function FieldGlyph({ color, name, size = 16 }: { color: string; name: 'mail' | 'lock' | 'user'; size?: number }) {
  return (
    <Svg fill="none" height={size} viewBox="0 0 24 24" width={size}>
      {name === 'mail' ? (
        <>
          <Rect height={15} rx={3} stroke={color} strokeWidth={1.7} width={19} x={2.5} y={4.5} />
          <Path d="M3.6 6.6 12 12.7l8.4-6.1" stroke={color} strokeLinecap="round" strokeWidth={1.7} />
        </>
      ) : null}
      {name === 'lock' ? (
        <>
          <Rect height={10.5} rx={2.6} stroke={color} strokeWidth={1.7} width={15} x={4.5} y={10} />
          <Path d="M8.2 10V7.6a3.8 3.8 0 0 1 7.6 0V10" stroke={color} strokeLinecap="round" strokeWidth={1.7} />
          <Circle cx={12} cy={15.2} fill={color} r={1.4} />
        </>
      ) : null}
      {name === 'user' ? (
        <>
          <Circle cx={12} cy={8.2} r={3.6} stroke={color} strokeWidth={1.7} />
          <Path d="M4.8 20.2c.6-3.7 3.6-6 7.2-6s6.6 2.3 7.2 6" stroke={color} strokeLinecap="round" strokeWidth={1.7} />
        </>
      ) : null}
    </Svg>
  );
}

function EyeGlyph({ color, off = false, size = 18 }: { color: string; off?: boolean; size?: number }) {
  return (
    <Svg fill="none" height={size} viewBox="0 0 24 24" width={size}>
      <Path
        d="M2.5 12S6.2 5.6 12 5.6 21.5 12 21.5 12 17.8 18.4 12 18.4 2.5 12 2.5 12Z"
        stroke={color}
        strokeLinecap="round"
        strokeWidth={1.6}
      />
      <Circle cx={12} cy={12} r={3} stroke={color} strokeWidth={1.6} />
      {off ? <Path d="M4 20 20 4" stroke={color} strokeLinecap="round" strokeWidth={1.6} /> : null}
    </Svg>
  );
}
/**
 * Campo de texto do mockup: rótulo em caixa alta com ícone, caixa translúcida e
 * brilho ciano no foco. O olho da senha é um botão separado (alvo de 40 px).
 */
function NeonField({
  autoCapitalize = 'none',
  autoComplete,
  icon,
  keyboardType = 'default',
  label,
  onChangeText,
  onSubmitEditing,
  placeholder,
  returnKeyType,
  secure = false,
  value,
}: {
  autoCapitalize?: 'characters' | 'none' | 'sentences' | 'words';
  autoComplete?: 'email' | 'name' | 'new-password' | 'off' | 'password';
  icon: 'lock' | 'mail' | 'user';
  keyboardType?: 'default' | 'email-address';
  label: string;
  onChangeText: (value: string) => void;
  onSubmitEditing?: () => void;
  placeholder: string;
  returnKeyType?: 'done' | 'go' | 'next' | 'send';
  secure?: boolean;
  value: string;
}) {
  const { colors } = useAcademicPalette();
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);
  return (
    <View style={styles.field}>
      <View style={styles.fieldLabelRow}>
        <FieldGlyph color={focused ? colors.primary : colors.muted} name={icon} />
        <Text style={[styles.fieldLabel, { color: focused ? colors.primary : colors.muted }]}>{label}</Text>
      </View>
      <View
        style={[
          styles.inputShell,
          {
            backgroundColor: hexToRgba(colors.background, 0.55),
            borderColor: focused ? colors.primary : colors.border,
          },
          focused ? glowShadow(colors.primary, 'soft') : null,
        ]}
      >
        <TextInput
          autoCapitalize={autoCapitalize}
          autoComplete={autoComplete}
          keyboardType={keyboardType}
          onBlur={() => setFocused(false)}
          onChangeText={onChangeText}
          onFocus={() => setFocused(true)}
          onSubmitEditing={onSubmitEditing}
          placeholder={placeholder}
          placeholderTextColor={hexToRgba(colors.muted, 0.85)}
          returnKeyType={returnKeyType}
          secureTextEntry={secure && !revealed}
          selectionColor={colors.primary}
          style={[styles.input, { color: colors.foreground }]}
          value={value}
        />
        {secure ? (
          <Pressable
            accessibilityLabel={revealed ? 'Ocultar senha' : 'Mostrar senha'}
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => setRevealed(current => !current)}
            style={styles.eyeButton}
          >
            <EyeGlyph color={colors.muted} off={revealed} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const COPY: Record<Mode, { hint: string; submit: string; title: string }> = {
  login: {
    hint: 'Entre com seu e-mail e senha para continuar de onde parou.',
    submit: 'Entrar',
    title: 'Bem-vinda de volta',
  },
  recovery: {
    hint: 'Informe o e-mail da conta. A Cris envia um link seguro para você criar uma nova senha.',
    submit: 'Enviar link de recuperação',
    title: 'Recuperar senha',
  },
  register: {
    hint: 'Escolha um nome, um e-mail e uma senha de pelo menos 8 caracteres.',
    submit: 'Criar conta',
    title: 'Crie sua conta',
  },
};

export default function LoginScreen() {
  const { colors } = useAcademicPalette();
  const [email, setEmail] = useState('');
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [googlePending, setGooglePending] = useState(false);
  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);

  const goToChat = useCallback(() => {
    router.replace('/chat');
  }, []);

  /**
   * O retorno do OAuth (web `?code=` ou nativo) chega como sessão nova: quem
   * avisa é o listener, não o botão. `SIGNED_IN` também cobre o link mágico.
   */
  useEffect(() => {
    const client = supabase;
    if (!client) return;
    const { data } = client.auth.onAuthStateChange((event, session) => {
      if (session?.user && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) goToChat();
    });
    return () => data.subscription.unsubscribe();
  }, [goToChat]);

  const submit = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      setFeedback({ text: 'Digite um e-mail válido (ex.: nome@escola.com).', tone: 'error' });
      return;
    }
    if (mode !== 'recovery' && password.length < 8) {
      setFeedback({ text: 'A senha precisa de pelo menos 8 caracteres.', tone: 'error' });
      return;
    }
    if (mode === 'register' && !name.trim()) {
      setFeedback({ text: 'Como a Cris deve te chamar? Informe seu nome.', tone: 'error' });
      return;
    }
    setFeedback(null);
    setPending(true);
    try {
      if (isSupabaseConfigured) {
        if (mode === 'recovery') {
          await requestPasswordReset(normalizedEmail);
          setFeedback({
            text: 'Se existir uma conta com este e-mail, o link de recuperação chegará em instantes. Confira também o spam.',
            tone: 'success',
          });
          setMode('login');
        } else if (mode === 'register') {
          const data = await signUpWithSupabase(normalizedEmail, password, name.trim());
          if (data.session?.user) {
            goToChat();
          } else {
            setFeedback({ text: 'Conta criada! Confirme o e-mail recebido e volte aqui para entrar.', tone: 'success' });
            setMode('login');
          }
        } else {
          await signInWithSupabase(normalizedEmail, password);
          goToChat();
        }
      } else {
        const existing = await readLocalChatAccount();
        if (mode === 'login' && existing && existing.email.toLowerCase() !== normalizedEmail) {
          setFeedback({
            text: `Este aparelho está no modo local com a conta ${existing.email}. Entre com ela ou crie outra identidade local.`,
            tone: 'error',
          });
          return;
        }
        await saveLocalChatAccount({
          displayName: name.trim() || existing?.displayName || normalizedEmail.split('@')[0] || 'Estudante',
          email: normalizedEmail,
          id: normalizedEmail,
        });
        goToChat();
      }
    } catch (error) {
      setFeedback({ text: readableSupabaseError(error), tone: 'error' });
    } finally {
      setPending(false);
    }
  };

  const continueWithGoogle = async () => {
    const client = supabase;
    if (!client) {
      setFeedback({
        text: 'O Google precisa do Supabase configurado (URL/chave + provedor Google). Enquanto isso, use e-mail e senha: o modo local funciona offline.',
        tone: 'error',
      });
      return;
    }
    setFeedback(null);
    setGooglePending(true);
    try {
      const redirectTo = getSupabaseOAuthRedirectUrl();
      const { data, error } = await client.auth.signInWithOAuth({
        options: { redirectTo, skipBrowserRedirect: Platform.OS !== 'web' },
        provider: 'google',
      });
      if (error) throw error;
      if (Platform.OS !== 'web' && data?.url) {
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
        if (result.type === 'success') {
          const consumed = await consumeSupabaseAuthLink(result.url);
          if (consumed.error) throw new Error(consumed.error);
        }
      }
    } catch (error) {
      setFeedback({ text: readableSupabaseError(error), tone: 'error' });
    } finally {
      setGooglePending(false);
    }
  };

  const copy = COPY[mode];
  const feedbackTone = feedback?.tone === 'success' ? colors.success : colors.error;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Arte da Madrugada em modo `vivid`: o véu cai pela metade e as estrelas aparecem. */}
      <ThemeBackground vivid />
      <SafeAreaView edges={['top', 'bottom', 'left', 'right']} style={styles.safe}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          keyboardShouldPersistTaps="handled"
          style={styles.scroll}
        >
          <Pressable
            accessibilityLabel="Voltar para o aplicativo"
            accessibilityRole="button"
            onPress={() => {
              if (router.canGoBack()) router.back();
              else router.replace('/chat');
            }}
            style={({ pressed }) => [
              styles.backButton,
              { backgroundColor: hexToRgba(colors.surface, 0.55), borderColor: colors.border },
              pressed && styles.disabled,
            ]}
          >
            <Svg fill="none" height={18} viewBox="0 0 24 24" width={18}>
              <Path
                d="M14.5 5.5 8 12l6.5 6.5"
                stroke={colors.foreground}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
              />
            </Svg>
          </Pressable>

          <View style={styles.header}>
            <CrisLogo size={132} />
            <Text
              style={[
                styles.tagline,
                { color: colors.primary, textShadowColor: hexToRgba(colors.accentPink, 0.55) },
                styles.taglineGlow,
              ]}
            >
              Estude com mais foco
            </Text>
          </View>

          <View
            style={[
              styles.card,
              cardShadow('auth', 8),
              { backgroundColor: hexToRgba(colors.surface, 0.82), borderColor: hexToRgba(colors.primary, 0.24) },
            ]}
          >
            <Text style={[styles.formTitle, { color: colors.foreground }]}>{copy.title}</Text>
            <Text style={[styles.modeHint, { color: colors.muted }]}>{copy.hint}</Text>

            <View style={[styles.fields, { marginTop: 16 }]}>
              {mode === 'register' ? (
                <NeonField
                  autoCapitalize="words"
                  autoComplete="name"
                  icon="user"
                  label="Nome"
                  onChangeText={setName}
                  placeholder="Como a Cris te chama"
                  returnKeyType="next"
                  value={name}
                />
              ) : null}
              <NeonField
                autoComplete="email"
                icon="mail"
                keyboardType="email-address"
                label="E-mail"
                onChangeText={setEmail}
                placeholder="seu@email.com"
                returnKeyType="next"
                value={email}
              />
              {mode !== 'recovery' ? (
                <NeonField
                  autoComplete={mode === 'register' ? 'new-password' : 'password'}
                  icon="lock"
                  label="Senha"
                  onChangeText={setPassword}
                  onSubmitEditing={() => {
                    void submit();
                  }}
                  placeholder="Mínimo de 8 caracteres"
                  returnKeyType="go"
                  secure
                  value={password}
                />
              ) : null}
            </View>

            {feedback ? (
              <View
                style={[
                  styles.feedback,
                  {
                    backgroundColor: hexToRgba(feedbackTone, 0.12),
                    borderColor: hexToRgba(feedbackTone, 0.45),
                  },
                ]}
              >
                <Text style={{ color: feedbackTone, fontFamily: neonFonts.medium, fontSize: 12, lineHeight: 17 }}>
                  {feedback.text}
                </Text>
              </View>
            ) : null}

            <View style={[styles.actions, { marginTop: 18 }]}>
              <Pressable
                accessibilityLabel={copy.submit}
                accessibilityRole="button"
                disabled={pending}
                onPress={() => {
                  void submit();
                }}
                style={({ pressed }) => [pressed && styles.pressed, pending && styles.disabled]}
              >
                <NeonGradient
                  angle={neonGradientAngles.brand}
                  colors={[colors.primary, colors.accentPink]}
                  style={{ borderRadius: 999, padding: 1.5 }}
                >
                  <View style={[styles.primaryInner, { backgroundColor: hexToRgba(colors.background, 0.92) }]}>
                    {pending ? (
                      <ActivityIndicator color={colors.primary} />
                    ) : (
                      <Text style={[styles.primaryLabel, { color: colors.foreground }]}>{copy.submit}</Text>
                    )}
                  </View>
                </NeonGradient>
              </Pressable>

              {mode !== 'recovery' ? (
                <Pressable
                  accessibilityLabel="Entrar com o Google"
                  accessibilityRole="button"
                  disabled={googlePending}
                  onPress={() => {
                    void continueWithGoogle();
                  }}
                  style={({ pressed }) => [pressed && styles.pressed, googlePending && styles.disabled]}
                >
                  <NeonGradient
                    angle={neonGradientAngles.brand}
                    colors={[colors.primary, colors.accentPink]}
                    style={{ borderRadius: 999 }}
                  >
                    <View style={styles.googleInner}>
                      {googlePending ? (
                        <ActivityIndicator color="#0B0F1A" />
                      ) : (
                        <>
                          <GoogleGlyph />
                          <Text style={styles.googleLabel}>Entrar com Google</Text>
                        </>
                      )}
                    </View>
                  </NeonGradient>
                </Pressable>
              ) : null}
            </View>

            <View style={styles.linkRow}>
              <Pressable
                accessibilityLabel="Esqueci minha senha"
                accessibilityRole="button"
                onPress={() => {
                  setFeedback(null);
                  setMode('recovery');
                }}
              >
                <Text style={[styles.link, { color: colors.primary }]}>Esqueci minha senha</Text>
              </Pressable>
              <Pressable
                accessibilityLabel={mode === 'register' ? 'Já tenho conta' : 'Criar conta'}
                accessibilityRole="button"
                onPress={() => {
                  setFeedback(null);
                  setMode(mode === 'register' ? 'login' : 'register');
                }}
              >
                <Text style={[styles.link, { color: colors.accentPink }]}>
                  {mode === 'register' ? 'Já tenho conta' : 'Criar conta'}
                </Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: colors.muted }]}>
              {isSupabaseConfigured
                ? 'Sua conta sincroniza as conversas entre aparelhos.'
                : 'Modo local: seus estudos ficam neste aparelho. Configure o Supabase para sincronizar e habilitar o Google.'}
            </Text>
            <Text
              style={[
                styles.footerText,
                { color: hexToRgba(colors.muted, 0.7), fontFamily: neonFonts.brandRegular, fontSize: 14 },
              ]}
            >
              Cris · Estudo organizado
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  actions: { gap: 12 },
  backButton: { alignItems: 'center', borderRadius: 999, borderWidth: 1, height: 40, justifyContent: 'center', width: 40 },
  card: { borderRadius: 26, borderWidth: 1, padding: 20 },
  content: { flexGrow: 1, justifyContent: 'center', paddingBottom: 22, paddingHorizontal: 22, paddingTop: 8 },
  disabled: { opacity: 0.5 },
  eyeButton: { alignItems: 'center', height: 40, justifyContent: 'center', width: 40 },
  feedback: { borderRadius: 12, borderWidth: 1, marginTop: 14, paddingHorizontal: 12, paddingVertical: 10 },
  field: { gap: 6 },
  fieldLabel: { fontFamily: neonFonts.strong, fontSize: 11, letterSpacing: 0.9, textTransform: 'uppercase' },
  fieldLabelRow: { alignItems: 'center', flexDirection: 'row', gap: 6, paddingLeft: 2 },
  fields: { gap: 14 },
  footer: { alignItems: 'center', gap: 6, marginTop: 18, paddingHorizontal: 14 },
  footerText: { fontSize: 11, lineHeight: 16, textAlign: 'center' },
  formTitle: { fontFamily: neonFonts.strong, fontSize: 20, letterSpacing: -0.4 },
  googleInner: { alignItems: 'center', borderRadius: 999, flexDirection: 'row', gap: 10, justifyContent: 'center', minHeight: 52 },
  googleLabel: { color: '#0B0F1A', fontFamily: neonFonts.strong, fontSize: 15 },
  header: { alignItems: 'center', gap: 4, marginBottom: 18 },
  input: { flex: 1, fontFamily: neonFonts.body, fontSize: 15, minHeight: 50, paddingHorizontal: 4, paddingVertical: 12 },
  inputShell: { alignItems: 'center', borderRadius: 14, borderWidth: 1, flexDirection: 'row', paddingLeft: 14, paddingRight: 4 },
  link: { fontFamily: neonFonts.strong, fontSize: 13 },
  linkRow: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between', marginTop: 18, paddingHorizontal: 2 },
  modeHint: { fontFamily: neonFonts.body, fontSize: 12, lineHeight: 17, marginTop: 4 },
  pressed: { opacity: 0.86, transform: [{ scale: 0.99 }] },
  primaryInner: { alignItems: 'center', borderRadius: 999, justifyContent: 'center', minHeight: 52 },
  primaryLabel: { fontFamily: neonFonts.strong, fontSize: 15, letterSpacing: 0.3 },
  root: { flex: 1 },
  safe: { flex: 1 },
  scroll: { flex: 1 },
  tagline: { fontFamily: neonFonts.strong, fontSize: 17, letterSpacing: 0.2, textAlign: 'center' },
  taglineGlow: { textShadowOffset: { height: 0, width: 0 }, textShadowRadius: 16 },
});

