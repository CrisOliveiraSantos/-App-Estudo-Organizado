import { Text, View } from "react-native";

export type MonacoEditorProps = {
  value: string;
  language: string;
  onChange: (value: string) => void;
  theme?: "light" | "dark";
  readOnly?: boolean;
  height?: number | string;
};

export function MonacoEditor({ height = 420 }: MonacoEditorProps) {
  return (
    <View
      style={{
        alignItems: "center",
        height,
        justifyContent: "center",
        width: "100%",
      }}
    >
      <Text>Monaco Editor está disponível somente na versão Web.</Text>
    </View>
  );
}