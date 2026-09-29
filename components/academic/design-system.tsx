import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle, View } from 'react-native';

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

export type AcademicTone = 'indigo' | 'violet' | 'success' | 'warning' | 'danger' | 'neutral' | 'ghost';

const tones: Record<AcademicTone, { fill: string; text: string }> = {
  indigo: { fill: '#E8EBFF', text: academicColors.indigo },
  violet: { fill: academicColors.violetSoft, text: academicColors.violet },
  success: { fill: '#E8F6EF', text: academicColors.success },
  warning: { fill: '#FFF5DE', text: academicColors.warning },
  danger: { fill: '#FDECEF', text: academicColors.danger },
  neutral: { fill: '#F3F4F6', text: academicColors.muted },
  ghost: { fill: 'transparent', text: academicColors.indigo },
};

export function AcademicCard({ children, style, emphasis = false }: { children: ReactNode; style?: StyleProp<ViewStyle>; emphasis?: boolean }) {
  return <View style={[styles.card, emphasis && styles.cardEmphasis, style]}>{children}</View>;
}

export function AcademicSection({ eyebrow, title, actionLabel, onAction, children }: { eyebrow?: string; title: string; actionLabel?: string; onAction?: () => void; children: ReactNode }) {
  return <View style={styles.section}>
    <View style={styles.sectionHeading}>
      <View style={styles.sectionTitleWrap}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {actionLabel && onAction ? <Pressable accessibilityRole="button" accessibilityLabel={actionLabel} onPress={onAction} style={({ pressed }) => [styles.textAction, pressed && styles.pressed]}><Text style={styles.textActionLabel}>{actionLabel}</Text></Pressable> : null}
    </View>
    {children}
  </View>;
}

export function AcademicButton({ label, onPress, tone = 'indigo', compact = false, disabled = false, icon }: { label: string; onPress: () => void; tone?: AcademicTone; compact?: boolean; disabled?: boolean; icon?: ReactNode }) {
  const isPrimary = tone === 'indigo' || tone === 'violet';
  const isDanger = tone === 'danger';
  const palette = tones[tone];
  const fill = tone === 'violet' ? academicColors.violet : isDanger ? academicColors.danger : academicColors.indigo;
  return <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.button, compact && styles.buttonCompact, isPrimary ? { backgroundColor: fill } : { backgroundColor: palette.fill, borderColor: tone === 'ghost' ? academicColors.line : palette.fill, borderWidth: tone === 'ghost' ? 1 : 0 }, disabled && styles.disabled, pressed && styles.pressed]}>
    {icon}
    <Text style={[styles.buttonText, !isPrimary && { color: palette.text }, icon ? styles.buttonTextWithIcon : null]}>{label}</Text>
  </Pressable>;
}

export function AcademicPill({ label, tone = 'neutral' }: { label: string; tone?: AcademicTone }) {
  const palette = tones[tone];
  return <View style={[styles.pill, { backgroundColor: palette.fill }]}><Text style={[styles.pillText, { color: palette.text }]}>{label}</Text></View>;
}

export function AcademicProgress({ value, color = academicColors.indigo, height = 8 }: { value: number; color?: string; height?: number }) {
  const safe = Math.max(0, Math.min(100, Math.round(value)));
  return <View accessibilityRole="progressbar" accessibilityLabel={`Progresso: ${safe}%`} accessibilityValue={{ min: 0, max: 100, now: safe }} style={[styles.progressTrack, { height }]}><View accessibilityElementsHidden style={{ backgroundColor: color, borderRadius: height, height: '100%', width: `${safe}%` }} /></View>;
}

export function AcademicEmptyState({ title, description, actionLabel, onAction }: { title: string; description: string; actionLabel?: string; onAction?: () => void }) {
  return <AcademicCard style={styles.emptyState}><View style={styles.emptyMark}><Text style={styles.emptyMarkText}>✦</Text></View><Text style={styles.emptyTitle}>{title}</Text><Text style={styles.emptyDescription}>{description}</Text>{actionLabel && onAction ? <AcademicButton compact label={actionLabel} onPress={onAction} /> : null}</AcademicCard>;
}

const styles = StyleSheet.create({
  button: { alignItems: 'center', borderRadius: 12, flexDirection: 'row', justifyContent: 'center', minHeight: 46, paddingHorizontal: 16 },
  buttonCompact: { alignSelf: 'flex-start', minHeight: 38, paddingHorizontal: 12 },
  buttonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  buttonTextWithIcon: { marginLeft: 8 },
  card: { backgroundColor: academicColors.surface, borderColor: academicColors.line, borderRadius: 16, borderWidth: 1, padding: 18, shadowColor: '#111827', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.025, shadowRadius: 9 },
  cardEmphasis: { borderColor: '#D8DDF0', shadowOpacity: 0.04 },
  disabled: { opacity: 0.48 },
  emptyDescription: { color: academicColors.muted, fontSize: 14, lineHeight: 20, marginTop: 6, textAlign: 'center' },
  emptyMark: { alignItems: 'center', backgroundColor: academicColors.violetSoft, borderRadius: 16, height: 44, justifyContent: 'center', marginBottom: 12, width: 44 },
  emptyMarkText: { color: academicColors.violet, fontSize: 22, fontWeight: '800' },
  emptyState: { alignItems: 'center', paddingVertical: 26 },
  emptyTitle: { color: academicColors.ink, fontSize: 16, fontWeight: '800' },
  eyebrow: { color: academicColors.violet, fontSize: 11, fontWeight: '900', letterSpacing: 0.8, marginBottom: 4, textTransform: 'uppercase' },
  pill: { alignSelf: 'flex-start', borderRadius: 999, minHeight: 24, paddingHorizontal: 9, paddingVertical: 4 },
  pillText: { fontSize: 11, fontWeight: '800' },
  pressed: { opacity: 0.82, transform: [{ scale: 0.985 }] },
  progressTrack: { backgroundColor: '#E8ECF7', borderRadius: 999, overflow: 'hidden', width: '100%' },
  section: { marginBottom: 26 },
  sectionHeading: { alignItems: 'flex-end', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitle: { color: academicColors.ink, fontSize: 20, fontWeight: '800', letterSpacing: -0.25 },
  sectionTitleWrap: { flex: 1, paddingRight: 12 },
  textAction: { justifyContent: 'center', minHeight: 36, paddingLeft: 12 },
  textActionLabel: { color: academicColors.indigo, fontSize: 13, fontWeight: '800' },
});

export const academicStyles = styles;
