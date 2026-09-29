import { Platform, Text, View, type StyleProp, type ViewStyle } from 'react-native';

type Props = { source: string; style?: StyleProp<ViewStyle> };

export function NativePdfViewer({ source, style }: Props) {
  if (Platform.OS === 'web') {
    return <View className="h-[420px] rounded-2xl bg-background border border-border items-center justify-center px-5"><Text className="text-foreground font-semibold text-center">A visualização completa funciona no Development Build Android/iOS.</Text><Text className="text-muted text-xs text-center mt-2" numberOfLines={2}>{source}</Text></View>;
  }
  // react-native-pdf is loaded only on native builds; it is not required by the web preview.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Pdf = require('react-native-pdf').default;
  return <Pdf source={{ uri: source }} style={style} enablePaging horizontal spacing={8} trustAllCerts={false} />;
}
