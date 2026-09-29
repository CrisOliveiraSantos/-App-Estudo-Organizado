import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

export type NotificationPermission = 'granted' | 'denied' | 'unavailable';

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

async function configureAndroidChannel() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('study-reminders', {
      name: 'Lembretes de estudos',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 200],
      lightColor: '#3346A8',
    });
  }
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (Platform.OS === 'web') {
    const browserNotification = (globalThis as { Notification?: { permission: string; requestPermission: () => Promise<string> } }).Notification;
    if (!browserNotification) return 'unavailable';
    if (browserNotification.permission === 'granted') return 'granted';
    const result = await browserNotification.requestPermission();
    return result === 'granted' ? 'granted' : 'denied';
  }

  await configureAndroidChannel();
  const current = await Notifications.getPermissionsAsync();
  if (current.status === 'granted') return 'granted';
  const requested = await Notifications.requestPermissionsAsync();
  return requested.status === 'granted' ? 'granted' : 'denied';
}

export async function scheduleStudyReminder(title: string, body: string, date: Date): Promise<{ ok: boolean; message: string }> {
  const permission = await requestNotificationPermission();
  if (permission !== 'granted') {
    return { ok: false, message: permission === 'unavailable' ? 'Notificações não estão disponíveis neste ambiente.' : 'Permissão de notificações não concedida.' };
  }

  if (Platform.OS === 'web') {
    const browserNotification = (globalThis as { Notification?: new (title: string, options?: { body?: string }) => unknown }).Notification;
    const delay = Math.max(0, date.getTime() - Date.now());
    setTimeout(() => { if (browserNotification) new browserNotification(title, { body }); }, Math.min(delay, 2_147_000_000));
    return { ok: true, message: 'Lembrete preparado no navegador enquanto esta página permanecer aberta.' };
  }

  await Notifications.scheduleNotificationAsync({
    content: { title, body, data: { type: 'study-reminder' } },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date, channelId: 'study-reminders' },
  });
  return { ok: true, message: 'Lembrete agendado no dispositivo.' };
}

export async function scheduleTestNotification(): Promise<{ ok: boolean; message: string }> {
  return scheduleStudyReminder('Estudo Organizado', 'Este é um teste de lembrete da Cris.', new Date(Date.now() + 5_000));
}
