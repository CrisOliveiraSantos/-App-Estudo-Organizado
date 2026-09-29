import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Platform } from 'react-native';
import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColors } from '@/hooks/use-colors';

export default function TabLayout() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const bottomPadding = Platform.OS === 'web' ? 12 : Math.max(insets.bottom, 8);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarButton: HapticTab,
        tabBarStyle: {
          paddingTop: 8,
          paddingBottom: bottomPadding,
          height: 56 + bottomPadding,
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Hoje', tabBarIcon: ({ color }) => <IconSymbol size={24} name="house.fill" color={color} /> }} />
      <Tabs.Screen name="editor" options={{ title: 'Editor', tabBarIcon: ({ color }) => <IconSymbol size={24} name="note.text" color={color} /> }} />
      <Tabs.Screen name="code" options={{ title: 'Código', tabBarIcon: ({ color }) => <IconSymbol size={24} name="chevron.right" color={color} /> }} />
      <Tabs.Screen name="planning" options={{ title: 'Planejamento', tabBarIcon: ({ color }) => <IconSymbol size={24} name="chart.bar.fill" color={color} /> }} />
      <Tabs.Screen name="library" options={{ title: 'Biblioteca', tabBarIcon: ({ color }) => <IconSymbol size={24} name="book.fill" color={color} /> }} />
      <Tabs.Screen name="chat" options={{ title: 'Conversas', tabBarIcon: ({ color }) => <IconSymbol size={24} name="bubble.left.and.bubble.right.fill" color={color} /> }} />
      <Tabs.Screen name="settings" options={{ title: 'Ajustes', tabBarIcon: ({ color }) => <IconSymbol size={24} name="gearshape.fill" color={color} /> }} />
    </Tabs>
  );
}
