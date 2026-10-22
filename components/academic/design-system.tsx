import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, type StyleProp, type ViewStyle, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { isDarkScheme } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useColors } from '@/hooks/use-colors';
import { splitCardStyle } from '@/lib/card-style';
import {
  buildNeonTones,
  cardShadow,
  dollaTokens,
  glowShadow,
  gradientVector,
  hexToRgba,
  neonGradientSpec,
  neonMotion,
  neonRadius,
  neonType,
  neonFonts,
  type AcademicTone,
  type NeonGradientName,
} from '@/lib/theme-runtime';

export type { AcademicTone } from '@/lib/theme-runtime';

/**
 * Paleta clara histórica do design system.
 * Valores preservados para as telas que ainda importam `academicColors` diretamente;
 * telas migradas devem usar `useAcademicColors()`/`useAcademicPalette()`.
 */
export const academicColors = {
  indigo: '#3346A8',
  indigoDark: '#263585',
  violet: '#7C3AED',
  violetSoft: '#F3F1FF',
  canvas: '#F8F9FA',
  surface: '#FFFFFF',
  ink: '#1B2235',
  muted: '#687088',
  line: '#E4E8F2',
  success: '#18865B',
  warning: '#B67500',
  danger: '#C13B4A',
  info: '#2563EB',
  night: '#10131D',
  nightSurface: '#191E2B',
} as const;

/** Paleta viva do tema atual + tons prontos + material derivado. */
export function useAcademicPalette() {
  const colors = useColors();
  const scheme = useColorScheme();
  const isDark = isDarkScheme(scheme);
  return useMemo(
    () => ({
      colors,
      gradients: (name: NeonGradientName) => neonGradientSpec(name, colors),
      isDark,
      tones: buildNeonTones(colors, isDark),
    }),
    [colors, isDark],
  );
}

/** Nomes históricos + nomes do mockup, todos resolvidos pelo tema ativo. */
export function useAcademicColors() {
  const { colors, isDark } = useAcademicPalette();
  return useMemo(
    () => ({
      canvas: colors.background,
      danger: colors.error,
      indigo: colors.primary,
      indigoDark: colors.primary,
      info: colors.primary,
      ink: colors.foreground,
      line: colors.border,
      muted: colors.muted,
      night: colors.background,
      nightSurface: colors.surfaceAlt,
      success: colors.success,
      surface: colors.surface,
      surfaceAlt: colors.surfaceAlt,
      violet: colors.accentPurple,
      violetSoft: colors.lavender,
      warning: colors.warning,
      gold: colors.accentGold,
      green: colors.accentGreen,
      isDark,
      onPrimary: '#FFFFFF',
      orange: colors.accentOrange,
      pink: colors.accentPink,
      primary: colors.primary,
      purple: colors.accentPurple,
      rose: colors.accentRose,
      soft: colors.lavender,
      /** Aliases com o nome da especificação da Dolla (tema escuro). */
      cyan: colors.primary,
      panel: colors.surface,
    }),
    [colors, isDark],
  );
}

function useHoverState() {
  const [hovered, setHovered] = useState(false);
  const hoverProps = useMemo(
    () => ({ onHoverIn: () => setHovered(true), onHoverOut: () => setHovered(false) }),
    [],
  );
  return { hovered, hoverProps };
}

/**
 * Fundo com gradiente real (SVG) — substitui o `expo-linear-gradient` que não está instalado.
 * O gradiente vive numa camada absoluta própria e as crianças vêm por cima.
 *
 * Por que uma camada extra (e não o `<Svg>` direto em `absoluteFill`): o
 * `react-native-svg` 15 injeta `width: '100%'`, `height: '100%'` e `flex: 0` no
 * `style` do `<Svg>` (`Svg.js`, L107-118) e, no Yoga, `%` resolve contra o
 * **content box** do pai. Como quase todo chamador aplica `padding` no `style`
 * deste componente (`styles.card` + `cardPadded: 20`, `hero` 19, `topbar.bar`,
 * `sidebar`), o SVG saía 2×`padding` mais estreito e mais baixo que o card — a
 * área que sobrava mostrava a cor de fundo do wrapper: era a "faixa crua" à
 * direita e embaixo, que num `taskRow` (texto à direita do ícone) cai
 * exatamente **atrás do texto**. A camada absoluta não tem padding, então
 * `100%` do SVG = a área inteira do card.
 *
 * O `viewBox="0 0 100 100"` também saiu. Com ele, o RNSVG aplicava
 * `ViewBox.getTransform(..., align = "none", meetOrSlice = MEET)` — escala
 * **uniforme** por `min(scaleX, scaleY)` com centralização (letterbox) — e o
 * `Rect` de 100×100 virava um quadrado no meio do card. Sem `viewBox` não há
 * transform nenhum (`SvgView.drawChildren` só concatena a matriz quando
 * `mAlign != null`), a unidade do desenho é o px do canvas e o `Rect` com
 * `100%`/`100%` cobre o canvas inteiro; o gradiente (`gradientUnits` default,
 * `objectBoundingBox`) passa a correr de ponta a ponta como o
 * `linear-gradient(...)` do CSS.
 */
export function NeonGradient({
  angle,
  children,
  colors,
  name = 'panel',
  style,
}: {
  angle?: number;
  children?: ReactNode;
  colors?: readonly [string, string];
  name?: NeonGradientName;
  style?: StyleProp<ViewStyle>;
}) {
  const { gradients } = useAcademicPalette();
  const rawId = useId();
  const gradientId = `neon-${rawId.replace(/[^a-zA-Z0-9]/g, '')}`;
  const spec = useMemo(() => {
    if (colors && colors.length === 2) {
      return { angle: angle ?? 100, stops: [colors[0], colors[1]] as [string, string] };
    }
    return gradients(name);
  }, [angle, colors, gradients, name]);
  const vector = useMemo(() => gradientVector(spec.angle), [spec.angle]);
  return (
    <View style={style}>
      <View pointerEvents="none" style={styles.gradientLayer}>
        {/*
          `width`/`height` explícitos são obrigatórios: no web um `<svg>` sem
          esses atributos assume o tamanho intrínseco de 300×150 (replaced
          element) e o gradiente pintava um retângulo de 300×150 a partir do
          canto do botão, vazando por cima do conteúdo seguinte em botões
          baixos (ex.: "Entrar com Google", 304×52). O `style` absoluto sozinho
          não estica o SVG — ele só posiciona a caixa.
        */}
        <Svg height="100%" pointerEvents="none" style={StyleSheet.absoluteFill} width="100%">
          <Defs>
            <LinearGradient id={gradientId} x1={vector.x1} x2={vector.x2} y1={vector.y1} y2={vector.y2}>
              <Stop offset="0" stopColor={spec.stops[0]} />
              <Stop offset="1" stopColor={spec.stops[1]} />
            </LinearGradient>
          </Defs>
          <Rect fill={`url(#${gradientId})`} height="100%" width="100%" x="0" y="0" />
        </Svg>
      </View>
      {children}
    </View>
  );
}

/** Card do mockup: gradiente `panel`, borda viva, raio 20, elevação e hover sutil. */
export function AcademicCard({
  children,
  emphasis = false,
  glow = false,
  padded = true,
  style,
}: {
  children: ReactNode;
  emphasis?: boolean;
  glow?: boolean;
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useAcademicPalette();
  /**
   * O `style` do chamador chega com layout e conteúdo misturados
   * (`styles.documentCard` traz `flex: 1`, `marginBottom: 11` e `padding: 15` no
   * mesmo objeto), então ele é partido em duas caixas: layout/`margin`/`flex`/
   * medidas vão para a **externa** (é ela que ocupa o espaço e sustenta a sombra)
   * e `padding*`/`border*`/`backgroundColor`/`overflow` + arranjo do conteúdo
   * ficam na **interna** (é ela que desenha a borda e espaça o conteúdo). Sem a
   * partição, um `padding: 15` na caixa externa viraria espaço morto entre a
   * sombra e a borda, e um `marginBottom: 11` na interna entraria no retângulo que
   * o `elevation` usa como contorno.
   */
  const { box, content } = splitCardStyle(StyleSheet.flatten(style));
  return (
    <View
      style={[
        styles.cardBox,
        /**
         * Fundo opaco explícito — é ele que mata o "ghost box" do Android.
         * `elevation` desenha a sombra a partir do **outline** da view, e uma view
         * que só tem `borderRadius`/`borderWidth` (sem `backgroundColor`) não
         * oferece um contorno sólido: o Android cai no retângulo cru dos limites
         * do card e a mancha quadrada aparece ao redor/por baixo do gradiente —
         * que é `rgba(...,0.96)` e deixa 4% dela passar. Com uma base opaca o
         * contorno volta a ser o retângulo arredondado de 20 px (é o que a pílula
         * da bottom nav já fazia com `hexToRgba(surfaceAlt, 0.9)` e por isso nunca
         * teve o artefato). `surface` é a 1ª parada do gradiente `panel`, então o
         * visual não muda — só deixa de ser translúcido. E ele **precisa** ficar na
         * caixa que carrega a sombra: é o outline dela que o Android projeta.
         *
         * `panel` é `[hexToRgba(surface, .96), hexToRgba(surfaceAlt, .96)]`, então a
         * base `surface` **é** a 1ª parada (96% dela sobre ela mesma = a mesma cor) e
         * a regra "cor do wrapper = 1ª parada do gradiente" já está cumprida aqui. O
         * que faltava não era a cor, era **área pintada**: o `<Svg>` do `NeonGradient`
         * saía menor que o card por causa do `padding` e esse `surface` aparecia na
         * fresta (ver o JSDoc de `NeonGradient`). Deixar o wrapper `transparent`
         * não taparia a fresta e ainda traria o ghost box de volta.
         */
        { backgroundColor: colors.surface },
        cardShadow(emphasis ? 'floating' : 'card', emphasis ? undefined : dollaTokens.elevation.card),
        glow && glowShadow(colors.primary, 'soft'),
        box,
      ]}
    >
      {/*
       * Caixa interna: é ela que tem `overflow: 'hidden'` (borda, raio e o clip do
       * SVG) e o gradiente. `elevation` na *mesma* view que tem `overflow` é o que
       * fazia o Android desenhar o resíduo da sombra dentro do card (cinza claro no
       * tema claro, cinza escuro no escuro, rente à borda). É o único ponto do app
       * onde as duas coisas coincidiam: `heroShadow` (Home), os wrappers de
       * `topbar`/`sidebar` e a pílula da bottom nav também carregam `cardShadow`,
       * mas nenhum deles tem `overflow` — e nenhum deles mostrou o resíduo.
       */}
      <NeonGradient
        name="panel"
        style={[
          styles.card,
          padded && styles.cardPadded,
          /**
           * Card da Dolla: borda de **1 px** na cor cheia do token
           * (`#202B40` no tema Neon), em vez do `0.5 px` translúcido anterior.
           * `emphasis` continua com o contorno ciano, que é a hierarquia
           * "selecionado" da especificação.
           */
          { borderColor: emphasis ? hexToRgba(colors.primary, 0.55) : colors.border },
          content,
        ]}
      >
        {children}
      </NeonGradient>
    </View>
  );
}

export function AcademicSection({
  actionLabel,
  children,
  eyebrow,
  onAction,
  title,
}: {
  actionLabel?: string;
  children: ReactNode;
  eyebrow?: string;
  onAction?: () => void;
  title: string;
}) {
  const { colors } = useAcademicPalette();
  const { hovered, hoverProps } = useHoverState();
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeading}>
        <View style={styles.sectionTitleWrap}>
          {eyebrow ? <Text style={[styles.eyebrow, { color: colors.primary }]}>{eyebrow}</Text> : null}
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{title}</Text>
        </View>
        {actionLabel && onAction ? (
          <Pressable
            {...hoverProps}
            accessibilityLabel={actionLabel}
            accessibilityRole="button"
            onPress={onAction}
            style={({ pressed }) => [styles.textAction, pressed && styles.pressed]}
          >
            <Text style={[styles.textActionLabel, { color: hovered ? colors.accentPink : colors.primary }]}>
              {actionLabel}
            </Text>
          </Pressable>
        ) : null}
      </View>
      {children}
    </View>
  );
}

export function AcademicButton({
  compact = false,
  disabled = false,
  icon,
  label,
  onPress,
  style,
  tone = 'indigo',
}: {
  compact?: boolean;
  disabled?: boolean;
  icon?: ReactNode;
  label: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  tone?: AcademicTone;
}) {
  const { colors, tones } = useAcademicPalette();
  const { hovered, hoverProps } = useHoverState();
  const palette = tones[tone];
  const primary = tone === 'indigo' || tone === 'violet' || tone === 'primary' || tone === 'accent';
  return (
    <Pressable
      {...hoverProps}
      accessibilityLabel={label}
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        compact && styles.buttonCompact,
        !primary && { backgroundColor: palette.fill, borderColor: palette.border, borderWidth: 1 },
        disabled && styles.disabled,
        /**
         * O glow é `elevation`: sem fundo sólido o Android desenha a sombra pelo
         * retângulo cru dos limites. Os tons primários não pintam
         * `backgroundColor` (o fundo é o SVG do `NeonGradient buttonGradient`),
         * então a base `primary` entra junto do glow — o SVG cobre o botão
         * inteiro e ela é invisível. Os secundários não têm glow (só a troca de
         * borda) e já usam `palette.fill` como fundo.
         */
        hovered && !disabled && (primary ? [glowShadow(colors.primary, 'strong'), { backgroundColor: colors.primary }] : { borderColor: colors.primary }),
        hovered && !disabled && styles.lift,
        pressed && styles.pressed,
        style,
      ]}
    >
      {primary ? (
        <NeonGradient
          angle={dollaTokens.gradient.angle}
          colors={[colors.primary, colors.accentPink]}
          style={styles.buttonGradient}
        />
      ) : null}
      {icon}
      <Text style={[styles.buttonText, !primary && { color: palette.text }, icon ? styles.buttonTextWithIcon : null]}>
        {label}
      </Text>
    </Pressable>
  );
}

export function AcademicPill({
  label,
  size = 'compact',
  tone = 'neutral',
}: {
  label: string;
  size?: 'compact' | 'chip';
  tone?: AcademicTone;
}) {
  const { tones } = useAcademicPalette();
  const palette = tones[tone];
  return (
    <View
      style={[
        styles.pill,
        size === 'chip' && styles.pillChip,
        { backgroundColor: palette.fill, borderColor: palette.border },
      ]}
    >
      <Text style={[styles.pillText, { color: palette.text }]}>{label}</Text>
    </View>
  );
}

export function AcademicProgress({
  color,
  height = 8,
  value,
}: {
  color?: string;
  height?: number;
  value: number;
}) {
  const { colors } = useAcademicPalette();
  const safe = Math.max(0, Math.min(100, Math.round(value)));
  const width = useRef(new Animated.Value(safe)).current;
  useEffect(() => {
    const animation = Animated.timing(width, {
      duration: neonMotion.progress,
      easing: Easing.out(Easing.cubic),
      toValue: safe,
      useNativeDriver: false,
    });
    animation.start();
    return () => animation.stop();
  }, [safe, width]);
  return (
    <View
      accessibilityLabel={`Progresso: ${safe}%`}
      accessibilityRole="progressbar"
      accessibilityValue={{ max: 100, min: 0, now: safe }}
      style={[styles.progressTrack, { backgroundColor: colors.border, height }]}
    >
      <Animated.View
        style={[
          styles.progressFill,
          { borderRadius: height, width: width.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }) },
          /**
           * O ramo sem `color` pinta o preenchimento com o SVG
           * `progressGradient`; sem base sólida o glow (que é `elevation`) sairia
           * pelo retângulo cru dos limites. A base `primary` fica debaixo do SVG,
           * que cobre o fill inteiro.
           */
          color ? { backgroundColor: color } : [glowShadow(colors.primary, 'soft'), { backgroundColor: colors.primary }],
        ]}
      >
        {color ? null : <NeonGradient colors={[colors.primary, colors.accentPink]} style={styles.progressGradient} />}
      </Animated.View>
    </View>
  );
}

/** Aba em pílula (`.tabs`/`.tab` do mockup): ativa = fundo cyan translúcido + glow. */
export function AcademicTab({
  active = false,
  icon,
  label,
  onPress,
  style,
}: {
  active?: boolean;
  icon?: ReactNode;
  label: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useAcademicPalette();
  const { hovered, hoverProps } = useHoverState();
  return (
    <Pressable
      {...hoverProps}
      accessibilityLabel={label}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.tab,
        { backgroundColor: active ? hexToRgba(colors.primary, 0.16) : 'transparent' },
        active && { borderColor: hexToRgba(colors.primary, 0.4) },
        !active && hovered && { borderColor: hexToRgba(colors.primary, 0.3) },
        active && glowShadow(colors.primary, 'soft'),
        pressed && styles.pressed,
        style,
      ]}
    >
      {icon}
      <Text
        style={[styles.tabText, { color: active ? colors.primary : colors.muted }, icon ? styles.tabTextWithIcon : null]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/** Linha de toggle 48×26 do mockup, com trilho em gradiente quando ligada. */
export function NeonToggle({
  description,
  disabled = false,
  label,
  last = false,
  onToggle,
  value,
}: {
  description?: string;
  disabled?: boolean;
  label: string;
  last?: boolean;
  onToggle: (next: boolean) => void;
  value: boolean;
}) {
  const { colors } = useAcademicPalette();
  const shift = useRef(new Animated.Value(value ? 1 : 0)).current;
  useEffect(() => {
    const animation = Animated.timing(shift, {
      duration: neonMotion.fast,
      easing: Easing.out(Easing.cubic),
      toValue: value ? 1 : 0,
      useNativeDriver: false,
    });
    animation.start();
    return () => animation.stop();
  }, [shift, value]);
  const translateX = shift.interpolate({ inputRange: [0, 1], outputRange: [0, 22] });
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      disabled={disabled}
      onPress={() => onToggle(!value)}
      style={({ pressed }) => [
        styles.toggleRow,
        !last && { borderBottomColor: colors.border, borderBottomWidth: 1 },
        disabled && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.toggleCopy}>
        <Text style={[styles.toggleLabel, { color: colors.foreground }]}>{label}</Text>
        {description ? <Text style={[styles.toggleDescription, { color: colors.muted }]}>{description}</Text> : null}
      </View>
      <View style={[styles.toggleTrack, { backgroundColor: value ? hexToRgba(colors.primary, 0.22) : colors.border }]}>
        {value ? <NeonGradient colors={[colors.primary, colors.accentPink]} style={styles.toggleTrackGradient} /> : null}
        <Animated.View style={[styles.toggleThumb, { transform: [{ translateX }] }]} />
      </View>
    </Pressable>
  );
}

/** Faixa de aviso (`.banner.red`/`.banner.yellow`), agora derivada do tom do tema. */
export function NeonBanner({
  children,
  style,
  title,
  tone = 'info',
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  title?: string;
  tone?: 'danger' | 'info' | 'success' | 'warning';
}) {
  const { tones } = useAcademicPalette();
  const palette = tones[tone];
  return (
    <View
      accessibilityRole="alert"
      style={[styles.banner, { backgroundColor: palette.fill, borderColor: palette.border }, style]}
    >
      <View style={styles.bannerBody}>
        {title ? <Text style={[styles.bannerTitle, { color: palette.text }]}>{title}</Text> : null}
        {typeof children === 'string' ? (
          <Text style={[styles.bannerText, { color: palette.text }]}>{children}</Text>
        ) : (
          children
        )}
      </View>
    </View>
  );
}

export function AcademicEmptyState({
  actionLabel,
  description,
  icon,
  onAction,
  title,
}: {
  actionLabel?: string;
  description: string;
  /**
   * Glifo opcional no selo. O padrão é um **check** (✓): a estrela de quatro
   * pontas que ficava aqui era lida como o ícone do Gemini e não tem relação
   * com "nada pendente".
   */
  icon?: ReactNode;
  onAction?: () => void;
  title: string;
}) {
  const { colors, tones } = useAcademicPalette();
  return (
    <AcademicCard style={styles.emptyState}>
      <View style={[styles.emptyMark, { backgroundColor: tones.accent.fill, borderColor: tones.accent.border }]}>
        {icon ?? <Text style={[styles.emptyMarkText, { color: tones.accent.text }]}>✓</Text>}
      </View>
      <Text style={[styles.emptyTitle, { color: colors.foreground }]}>{title}</Text>
      <Text style={[styles.emptyDescription, { color: colors.muted }]}>{description}</Text>
      {actionLabel && onAction ? <AcademicButton compact label={actionLabel} onPress={onAction} /> : null}
    </AcademicCard>
  );
}

const styles = StyleSheet.create({
  banner: { borderRadius: neonRadius.banner, borderWidth: 1, marginBottom: 18, paddingHorizontal: 18, paddingVertical: 14 },
  bannerBody: { flex: 1, gap: 4 },
  bannerText: { fontSize: neonType.body.size, lineHeight: 19 },
  bannerTitle: { fontSize: neonType.link.size, fontWeight: neonType.cardTitle.weight },
  button: {
    alignItems: 'center',
    borderRadius: neonRadius.button,
    flexDirection: 'row',
    justifyContent: 'center',
    minHeight: 46,
    overflow: 'hidden',
    paddingHorizontal: 16,
  },
  buttonCompact: { alignSelf: 'flex-start', minHeight: 38, paddingHorizontal: 12 },
  buttonGradient: { bottom: 0, borderRadius: neonRadius.button, left: 0, position: 'absolute', right: 0, top: 0 },
  buttonText: { color: '#FFFFFF', fontSize: neonType.body.size, fontWeight: '800' },
  buttonTextWithIcon: { marginLeft: 8 },
  /**
   * Caixa **interna** do card: borda viva, raio e recorte (o `Rect` do
   * `NeonGradient` é quadrado e precisa do clip do raio). `flexGrow` para cobrir a
   * caixa externa quando ela é esticada por `flex: 1`/`minHeight` do chamador —
   * `flexGrow` e não `flex: 1` porque `flex: 1` zera o `flexBasis` e zeraria a
   * altura hipotética do card em containers de altura automática.
   */
  card: { borderRadius: neonRadius.card, borderWidth: 1, flexGrow: 1, overflow: 'hidden' },
  /**
   * Caixa **externa** do card: só o raio (contorno arredondado para a base opaca e
   * para o `elevation`) + o que o chamador manda de layout. Borda, gradiente e
   * `overflow` vivem na interna de propósito.
   */
  cardBox: { borderRadius: neonRadius.card, marginBottom: 16 },
  cardPadded: { padding: dollaTokens.layout.cardPadding },
  disabled: { opacity: 0.48 },
  emptyDescription: { fontSize: neonType.body.size, lineHeight: 20, marginTop: 6, textAlign: 'center' },
  emptyMark: {
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    marginBottom: 12,
    width: 44,
  },
  emptyMarkText: { fontSize: 22, fontWeight: '800' },
  emptyState: { alignItems: 'center', paddingVertical: 26 },
  emptyTitle: { fontSize: 16, fontWeight: '800' },
  eyebrow: {
    fontSize: neonType.eyebrow.size,
    fontWeight: neonType.eyebrow.weight,
    letterSpacing: neonType.eyebrow.letterSpacing,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  gradientLayer: { bottom: 0, left: 0, position: 'absolute', right: 0, top: 0 },
  lift: { transform: [{ translateY: -2 }] },
  pill: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 24,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  pillChip: { borderRadius: neonRadius.chip, minHeight: 30, paddingHorizontal: 14, paddingVertical: 6 },
  pillText: { fontSize: neonType.pill.size, fontWeight: neonType.pill.weight },
  pressed: { opacity: 0.85, transform: [{ scale: 0.985 }] },
  progressFill: { height: '100%', overflow: 'hidden' },
  progressGradient: { borderRadius: 999, bottom: 0, left: 0, position: 'absolute', right: 0, top: 0 },
  progressTrack: { borderRadius: 999, overflow: 'hidden', width: '100%' },
  section: { marginBottom: 26 },
  sectionHeading: { alignItems: 'flex-end', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitle: { fontFamily: neonFonts.display, fontSize: 20, fontWeight: 'normal', letterSpacing: -0.4 },
  sectionTitleWrap: { flex: 1, paddingRight: 12 },
  tab: {
    alignItems: 'center',
    borderColor: 'transparent',
    borderRadius: neonRadius.tab,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 38,
    paddingHorizontal: 16,
  },
  tabText: { fontSize: neonType.body.size, fontWeight: '600' },
  tabTextWithIcon: { marginLeft: 8 },
  textAction: { justifyContent: 'center', minHeight: 36, paddingLeft: 12 },
  textActionLabel: { fontSize: neonType.link.size, fontWeight: neonType.link.weight },
  toggleCopy: { flex: 1, paddingRight: 14 },
  toggleDescription: { fontSize: neonType.meta.size, lineHeight: 17, marginTop: 3 },
  toggleLabel: { fontSize: neonType.body.size, fontWeight: '700' },
  toggleRow: { alignItems: 'center', flexDirection: 'row', minHeight: 56, paddingVertical: 12 },
  toggleThumb: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    height: 20,
    left: 3,
    position: 'absolute',
    top: 3,
    width: 20,
  },
  toggleTrack: { borderRadius: neonRadius.toggle, height: 26, overflow: 'hidden', width: 48 },
  toggleTrackGradient: {
    bottom: 0,
    borderRadius: neonRadius.toggle,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
});

export const academicStyles = styles;



