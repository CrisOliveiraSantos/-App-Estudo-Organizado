import { useState } from "react";
import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { MonacoEditor } from "@/components/monaco-editor";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";

const LANGUAGES = ["typescript", "javascript", "python", "json", "markdown"] as const;
const SAMPLE_CODE = `type StudySession = {
  subject: string;
  minutes: number;
};

const session: StudySession = {
  subject: "Programação",
  minutes: 45,
};

console.log(\`Estudei \${session.minutes} minutos de \${session.subject}.\`);`;

export default function MonacoLabScreen() {
  const colors = useColors();
  const [value, setValue] = useState(SAMPLE_CODE);
  const [language, setLanguage] = useState<string>("typescript");
  const [editorTheme, setEditorTheme] = useState<"light" | "dark">("light");

  return (
    <ScreenContainer
      edges={["top", "bottom", "left", "right"]}
      style={[styles.screen, { backgroundColor: colors.background }]}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.heading}>
            <Text style={[styles.eyebrow, { color: colors.primary }]}>TESTE ISOLADO</Text>
            <Text style={[styles.title, { color: colors.foreground }]}>Monaco Editor</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Voltar"
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.backButton,
              { borderColor: colors.border, backgroundColor: colors.surface },
              pressed && styles.pressed,
            ]}
          >
            <Text style={{ color: colors.foreground }}>Voltar</Text>
          </Pressable>
        </View>

        <Text style={[styles.label, { color: colors.foreground }]}>Linguagem</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.segmentRow}>
            {LANGUAGES.map((item) => {
              const selected = language === item;
              return (
                <Pressable
                  key={item}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => setLanguage(item)}
                  style={({ pressed }) => [
                    styles.segment,
                    {
                      backgroundColor: selected ? colors.primary : colors.surface,
                      borderColor: selected ? colors.primary : colors.border,
                    },
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={{ color: selected ? "#FFFFFF" : colors.foreground }}>{item}</Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>

        <Text style={[styles.label, { color: colors.foreground }]}>Tema do editor</Text>
        <View style={styles.segmentRow}>
          {(["light", "dark"] as const).map((item) => {
            const selected = editorTheme === item;
            return (
              <Pressable
                key={item}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => setEditorTheme(item)}
                style={({ pressed }) => [
                  styles.segment,
                  {
                    backgroundColor: selected ? colors.primary : colors.surface,
                    borderColor: selected ? colors.primary : colors.border,
                  },
                  pressed && styles.pressed,
                ]}
              >
                <Text style={{ color: selected ? "#FFFFFF" : colors.foreground }}>
                  {item === "light" ? "Claro" : "Escuro"}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={[styles.editorFrame, { borderColor: colors.border }]}>
          <MonacoEditor
            value={value}
            language={language}
            onChange={setValue}
            theme={editorTheme}
            height={480}
          />
        </View>

        <View style={[styles.output, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.label, { color: colors.foreground }]}>Saída de debug</Text>
          <ScrollView nestedScrollEnabled style={styles.outputScroll}>
            <Text selectable style={[styles.outputText, { color: colors.muted }]}>{value}</Text>
          </ScrollView>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { gap: 14, padding: 20, paddingBottom: 36 },
  header: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", gap: 12 },
  heading: { flex: 1 },
  eyebrow: { fontSize: 11, fontWeight: "800" },
  title: { fontSize: 24, fontWeight: "800", marginTop: 4 },
  backButton: { alignItems: "center", borderRadius: 8, borderWidth: 1, justifyContent: "center", minHeight: 44, minWidth: 64, paddingHorizontal: 12 },
  label: { fontSize: 13, fontWeight: "700" },
  segmentRow: { flexDirection: "row", gap: 8 },
  segment: { alignItems: "center", borderRadius: 8, borderWidth: 1, justifyContent: "center", minHeight: 44, paddingHorizontal: 14 },
  pressed: { opacity: 0.75 },
  editorFrame: { borderRadius: 8, borderWidth: 1, overflow: "hidden", width: "100%" },
  output: { borderRadius: 8, borderWidth: 1, gap: 8, padding: 12 },
  outputScroll: { maxHeight: 220 },
  outputText: { fontFamily: "monospace", fontSize: 12, lineHeight: 18 },
});