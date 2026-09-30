import Editor from "@monaco-editor/react";
import { View } from "react-native";
import { useThemeContext } from "@/lib/theme-provider";

export type MonacoEditorProps = {
  value: string;
  language: string;
  onChange: (value: string) => void;
  theme?: "light" | "dark";
  readOnly?: boolean;
  height?: number | string;
};

export function MonacoEditor({
  value,
  language,
  onChange,
  theme,
  readOnly = false,
  height = 420,
}: MonacoEditorProps) {
  const { colorScheme } = useThemeContext();
  const resolvedTheme = theme ?? (colorScheme === "dark" ? "dark" : "light");

  return (
    <View style={{ height, width: "100%" }}>
      <Editor
        height="100%"
        width="100%"
        language={language}
        value={value}
        theme={resolvedTheme === "dark" ? "vs-dark" : "vs"}
        onChange={(nextValue) => onChange(nextValue ?? "")}
        options={{
          automaticLayout: true,
          minimap: { enabled: false },
          readOnly,
          scrollBeyondLastLine: false,
        }}
      />
    </View>
  );
}