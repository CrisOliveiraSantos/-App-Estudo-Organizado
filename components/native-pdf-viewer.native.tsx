import Pdf from 'react-native-pdf';
import type { StyleProp, ViewStyle } from 'react-native';

export function NativePdfViewer({ source, style }: { source: string; style?: StyleProp<ViewStyle> }) {
  return <Pdf source={{ uri: source }} style={style} enablePaging horizontal spacing={8} trustAllCerts={false} />;
}
