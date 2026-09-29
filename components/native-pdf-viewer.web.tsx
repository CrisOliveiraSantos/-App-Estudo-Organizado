import { Text, View } from 'react-native';

export function NativePdfViewer({ source }: { source: string; style?: unknown }) {
  return <View className="h-[420px] rounded-2xl bg-background border border-border items-center justify-center px-5"><Text className="text-foreground font-semibold text-center">A visualização nativa de PDF será usada no Development Build.</Text><Text className="text-muted text-xs text-center mt-2" numberOfLines={2}>{source}</Text></View>;
}
