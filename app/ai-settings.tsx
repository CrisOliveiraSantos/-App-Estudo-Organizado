import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { AcademicButton, academicColors } from '@/components/academic/design-system';

type AiSettings = {
  offlinePreferred: boolean;
  lowPowerMode: boolean;
  privateContext: boolean;
  wifiOnlyDownloads: boolean;
  storageLimitMb: number;
};

const SETTINGS_KEY = '@estudo-organizado/cris-ai-settings-v1';
const DEFAULT_SETTINGS: AiSettings = { offlinePreferred: true, lowPowerMode: true, privateContext: true, wifiOnlyDownloads: true, storageLimitMb: 2048 };

export default function AiSettingsScreen() {
  const [settings, setSettings] = useState<AiSettings>(DEFAULT_SETTINGS);
  const [status, setStatus] = useState('Preferências somente neste dispositivo');

  useEffect(() => {
    AsyncStorage.getItem(SETTINGS_KEY).then(raw => {
      if (!raw) return;
      try { setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(raw) }); } catch { /* defaults */ }
    });
  }, []);

  const save = (next: AiSettings) => {
    setSettings(next);
    setStatus('Salvando preferências…');
    AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(next)).then(() => setStatus('Preferências salvas neste dispositivo'));
  };

  const toggle = (key: keyof Pick<AiSettings, 'offlinePreferred' | 'lowPowerMode' | 'privateContext' | 'wifiOnlyDownloads'>) => save({ ...settings, [key]: !settings[key] });

  return <ScreenContainer style={styles.screen}>
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.header}><View><Text style={styles.eyebrow}>CRIS · CONFIGURAÇÕES</Text><Text style={styles.title}>Cris online e offline</Text><Text style={styles.subtitle}>Controle como a Cris alterna entre nuvem, cache local, modelo no dispositivo, bateria, armazenamento e contexto privado.</Text></View><TouchableOpacity onPress={() => router.back()} style={styles.back}><Text style={styles.backText}>Voltar</Text></TouchableOpacity></View>
      <View style={styles.notice}><Text style={styles.noticeIcon}>◌</Text><View style={styles.noticeCopy}><Text style={styles.noticeTitle}>Transparência por padrão</Text><Text style={styles.noticeText}>Na web e no aplicativo, a Cris pode usar o modo online quando houver conexão. O modo local GGUF será instalado de forma assistida no Android, sem exigir que você procure arquivos no dispositivo.</Text></View></View>
      <View style={styles.section}><Text style={styles.sectionTitle}>Comportamento</Text><SettingRow title="Preferir modo offline" description="Quando o modelo local estiver instalado, priorizar o processamento no tablet." checked={settings.offlinePreferred} onPress={() => toggle('offlinePreferred')} /><SettingRow title="Modo de baixo consumo" description="Reduzir contexto e atividade para preservar bateria." checked={settings.lowPowerMode} onPress={() => toggle('lowPowerMode')} /><SettingRow title="Contexto privado" description="Enviar somente o trecho ou arquivo escolhido para a Cris." checked={settings.privateContext} onPress={() => toggle('privateContext')} /><SettingRow title="Baixar somente no Wi-Fi" description="Evitar downloads grandes usando dados móveis." checked={settings.wifiOnlyDownloads} onPress={() => toggle('wifiOnlyDownloads')} /></View>
      <View style={styles.section}><Text style={styles.sectionTitle}>Armazenamento</Text><View style={styles.storageRow}><View style={{ flex: 1 }}><Text style={styles.settingTitle}>Limite do modelo local</Text><Text style={styles.settingDescription}>Modelo recomendado para o Galaxy Tab A9+: pequeno e quantizado.</Text></View><Text style={styles.storageValue}>{settings.storageLimitMb} MB</Text></View><View style={styles.storageOptions}>{[1024, 2048, 4096].map(value => <TouchableOpacity key={value} onPress={() => save({ ...settings, storageLimitMb: value })} style={[styles.storageOption, settings.storageLimitMb === value && styles.storageOptionSelected]} accessibilityRole="radio" accessibilityState={{ selected: settings.storageLimitMb === value }}><Text style={[styles.storageOptionText, settings.storageLimitMb === value && styles.storageOptionTextSelected]}>{value >= 1024 ? `${value / 1024} GB` : `${value} MB`}</Text></TouchableOpacity>)}</View></View>
      <View style={styles.section}><Text style={styles.sectionTitle}>Modelo, rede e privacidade</Text><View style={styles.modelCard}><View style={styles.modelIcon}><Text style={styles.modelIconText}>C</Text></View><View style={{ flex: 1 }}><Text style={styles.settingTitle}>Modelo de código Cris</Text><Text style={styles.settingDescription}>Online disponível · GGUF compacto será instalado pelo próprio app no Android</Text></View><View style={styles.pending}><Text style={styles.pendingText}>Híbrida</Text></View></View><AcademicButton label="Ver espaço Código" onPress={() => router.push('/code')} compact tone="violet" /></View>
      <Text style={styles.status}>{status}</Text>
    </ScrollView>
  </ScreenContainer>;
}

function SettingRow({ title, description, checked, onPress }: { title: string; description: string; checked: boolean; onPress: () => void }) {
  return <TouchableOpacity onPress={onPress} style={styles.settingRow} accessibilityRole="switch" accessibilityState={{ checked }}><View style={styles.settingCopy}><Text style={styles.settingTitle}>{title}</Text><Text style={styles.settingDescription}>{description}</Text></View><View style={[styles.switch, checked && styles.switchOn]}><View style={[styles.knob, checked && styles.knobOn]} /></View></TouchableOpacity>;
}

const styles = StyleSheet.create({ screen: { backgroundColor: academicColors.canvas }, content: { padding: 24, paddingBottom: 120, gap: 18 }, header: { alignItems: 'flex-start', flexDirection: 'row', gap: 16, justifyContent: 'space-between' }, eyebrow: { color: academicColors.violet, fontSize: 11, fontWeight: '900', letterSpacing: 1.3 }, title: { color: academicColors.ink, fontSize: 30, fontWeight: '900', lineHeight: 36, marginTop: 5 }, subtitle: { color: academicColors.muted, fontSize: 14, lineHeight: 20, marginTop: 6, maxWidth: 600 }, back: { backgroundColor: '#FFFFFF', borderColor: academicColors.line, borderRadius: 10, borderWidth: 1, paddingHorizontal: 13, paddingVertical: 9 }, backText: { color: academicColors.indigo, fontWeight: '800' }, notice: { backgroundColor: '#FFFFFF', borderColor: '#DCE8E2', borderRadius: 14, borderWidth: 1, flexDirection: 'row', gap: 12, padding: 15 }, noticeIcon: { color: academicColors.success, fontSize: 24 }, noticeCopy: { flex: 1 }, noticeTitle: { color: academicColors.ink, fontWeight: '900' }, noticeText: { color: academicColors.muted, fontSize: 12, lineHeight: 18, marginTop: 4 }, section: { backgroundColor: '#FFFFFF', borderColor: academicColors.line, borderRadius: 16, borderWidth: 1, padding: 16 }, sectionTitle: { color: academicColors.ink, fontSize: 18, fontWeight: '900', marginBottom: 5 }, settingRow: { alignItems: 'center', borderTopColor: '#EEF0F4', borderTopWidth: 1, flexDirection: 'row', gap: 14, paddingVertical: 14 }, settingCopy: { flex: 1 }, settingTitle: { color: '#24324A', fontSize: 13, fontWeight: '800' }, settingDescription: { color: academicColors.muted, fontSize: 11, lineHeight: 17, marginTop: 3 }, switch: { backgroundColor: '#DDE2EA', borderRadius: 12, height: 24, padding: 3, width: 42 }, switchOn: { backgroundColor: academicColors.success }, knob: { backgroundColor: '#FFFFFF', borderRadius: 9, height: 18, width: 18 }, knobOn: { alignSelf: 'flex-end' }, storageRow: { alignItems: 'center', flexDirection: 'row', gap: 12, marginTop: 8 }, storageValue: { color: academicColors.indigo, fontSize: 15, fontWeight: '900' }, storageOptions: { flexDirection: 'row', gap: 9, marginTop: 15 }, storageOption: { borderColor: academicColors.line, borderRadius: 9, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 9 }, storageOptionSelected: { backgroundColor: '#F0EEFF', borderColor: academicColors.violet }, storageOptionText: { color: academicColors.muted, fontSize: 12, fontWeight: '800' }, storageOptionTextSelected: { color: academicColors.violet }, modelCard: { alignItems: 'center', flexDirection: 'row', gap: 10, marginTop: 9, marginBottom: 14 }, modelIcon: { alignItems: 'center', backgroundColor: '#F0EEFF', borderRadius: 12, height: 40, justifyContent: 'center', width: 40 }, modelIconText: { color: academicColors.violet, fontSize: 18, fontWeight: '900' }, pending: { backgroundColor: '#FFF5DE', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 5 }, pendingText: { color: academicColors.warning, fontSize: 10, fontWeight: '900' }, status: { color: academicColors.muted, fontSize: 11, textAlign: 'center' }, });
