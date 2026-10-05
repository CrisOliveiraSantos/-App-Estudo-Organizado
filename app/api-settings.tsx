import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { AcademicButton, AcademicPill, academicColors, type AcademicTone } from '@/components/academic/design-system';
import { ScreenContainer } from '@/components/screen-container';
import {
  API_PROVIDERS,
  PROVIDER_ORDER,
  buildLocalUrl,
  isLocalAiReady,
  isProviderAiReady,
  localTestState,
  parseLocalUrl,
  providerTestState,
  providerTestTarget,
  testLocalAi,
  testProviderApi,
  useApiConfig,
  useLocalAiDetection,
  type AiTestStatus,
  type ApiProviderId,
  type ApiTestResult,
  type DetectedLocalServer,
  type LocalAiConfig,
  type ProviderAiConfig,
  type TestableProviderConfig,
} from '@/lib/api-config';

type LocalForm = { protocol: 'http' | 'https'; host: string; port: string };
type ProviderForm = { id: ApiProviderId; apiKey: string; baseUrl: string; model: string };

const DEFAULT_LOCAL_FORM: LocalForm = { protocol: 'http', host: 'localhost', port: '11434' };
const DEFAULT_PROVIDER_FORM: ProviderForm = {
  id: 'groq',
  apiKey: '',
  baseUrl: API_PROVIDERS.groq.baseUrl,
  model: API_PROVIDERS.groq.defaultModel,
};

type SectionBadge = { label: string; tone: AcademicTone };

/** "ativo" só com teste bem-sucedido; "não configurado" sem alvo; o resto é "configurado, não testado". */
function badgeFor(configured: boolean, state: AiTestStatus | null): SectionBadge {
  if (!configured) return { label: 'não configurado', tone: 'neutral' };
  if (state === 'success') return { label: 'ativo', tone: 'success' };
  if (state === 'error') return { label: 'falha no último teste', tone: 'warning' };
  return { label: 'configurado, não testado', tone: 'warning' };
}

function formatTestedAt(value: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (input: number) => String(input).padStart(2, '0');
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)} às ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function ApiSettingsScreen() {
  const { config, loading, saveLocal, saveProvider, setMode } = useApiConfig();
  const { servers, scanning, message: scanMessage, scan } = useLocalAiDetection();

  const [localForm, setLocalForm] = useState<LocalForm>(DEFAULT_LOCAL_FORM);
  const [providerForm, setProviderForm] = useState<ProviderForm>(DEFAULT_PROVIDER_FORM);
  const [selectedServer, setSelectedServer] = useState<DetectedLocalServer | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [testingLocal, setTestingLocal] = useState(false);
  const [testingProvider, setTestingProvider] = useState(false);
  const [localResult, setLocalResult] = useState<ApiTestResult | null>(null);
  const [localHint, setLocalHint] = useState<string | null>(null);
  const [providerResult, setProviderResult] = useState<ApiTestResult | null>(null);
  const [status, setStatus] = useState('Configuração somente neste dispositivo');

  const initialized = useRef(false);
  useEffect(() => {
    if (loading || initialized.current) return;
    initialized.current = true;
    setLocalForm(parseLocalUrl(config.local.url));
    setProviderForm({
      id: config.provider.id,
      apiKey: config.provider.apiKey,
      baseUrl: config.provider.baseUrl || API_PROVIDERS[config.provider.id].baseUrl,
      model: config.provider.model || API_PROVIDERS[config.provider.id].defaultModel,
    });
  }, [loading, config]);

  const providerPreset = API_PROVIDERS[providerForm.id];
  const localUrl = buildLocalUrl(localForm.protocol, localForm.host, localForm.port);
  const providerFormTarget = providerTestTarget({
    id: providerForm.id,
    apiKey: providerForm.apiKey.trim(),
    baseUrl: providerForm.baseUrl.trim(),
    model: providerForm.model.trim(),
  });

  const localActive = isLocalAiReady(config.local);
  const providerActive = isProviderAiReady(config.provider);
  const localBadge = badgeFor(Boolean(config.local.url.trim()), localTestState(config.local));
  const providerBadge = badgeFor(Boolean(config.provider.apiKey.trim()), providerTestState(config.provider));
  const localChanged = localUrl !== config.local.url;
  const providerChanged = providerFormTarget !== providerTestTarget(config.provider);

  const modeWarning =
    config.mode === 'local'
      ? localActive
        ? null
        : 'Modo local selecionado, mas nenhuma IA local está ativa. Detecte um servidor e clique em “Testar” na seção IA Local.'
      : providerActive
        ? null
        : 'Modo API selecionado, mas nenhuma chave está ativa. Salve a chave e clique em “Testar” na seção API de Terceiros.';

  const runLocalTest = useCallback(async () => {
    setTestingLocal(true);
    setLocalResult(null);
    setLocalHint(null);
    const result = await testLocalAi(localUrl);
    setLocalResult(result);
    setStatus(result.message);
    setTestingLocal(false);
    await saveLocal({
      ...config.local,
      lastTestStatus: result.ok ? 'success' : 'error',
      lastTestedAt: new Date().toISOString(),
      lastTestedTarget: localUrl,
    });
  }, [config.local, localUrl, saveLocal]);

  const runProviderTest = useCallback(async () => {
    setTestingProvider(true);
    setProviderResult(null);
    const payload: TestableProviderConfig = {
      id: providerForm.id,
      apiKey: providerForm.apiKey,
      baseUrl: providerForm.baseUrl,
      model: providerForm.model,
    };
    const result = await testProviderApi(payload);
    setProviderResult(result);
    setStatus(result.message);
    setTestingProvider(false);
    await saveProvider({
      ...config.provider,
      lastTestStatus: result.ok ? 'success' : 'error',
      lastTestedAt: new Date().toISOString(),
      lastTestedTarget: providerTestTarget({
        id: providerForm.id,
        apiKey: providerForm.apiKey.trim(),
        baseUrl: providerForm.baseUrl.trim(),
        model: providerForm.model.trim(),
      }),
    });
  }, [config.provider, providerForm, saveProvider]);

  const persistLocal = useCallback(async () => {
    const next: LocalAiConfig = {
      url: localUrl,
      backend: selectedServer?.name ?? config.local.backend,
      model: selectedServer?.models[0] ?? config.local.model,
      lastTestStatus: config.local.lastTestStatus,
      lastTestedAt: config.local.lastTestedAt,
      lastTestedTarget: config.local.lastTestedTarget,
    };
    await saveLocal(next);
    setStatus('Preferências de IA local salvas somente neste dispositivo.');
  }, [config.local, localUrl, saveLocal, selectedServer]);

  const persistProvider = useCallback(async () => {
    const next: ProviderAiConfig = {
      id: providerForm.id,
      apiKey: providerForm.apiKey.trim(),
      baseUrl: providerForm.baseUrl.trim(),
      model: providerForm.model.trim(),
      lastTestStatus: config.provider.lastTestStatus,
      lastTestedAt: config.provider.lastTestedAt,
      lastTestedTarget: config.provider.lastTestedTarget,
    };
    await saveProvider(next);
    setStatus(`Chave do ${providerPreset.label} salva somente neste dispositivo.`);
  }, [config.provider, providerForm, providerPreset.label, saveProvider]);

  const selectServer = useCallback((server: DetectedLocalServer) => {
    setSelectedServer(server);
    setLocalForm({ protocol: server.protocol, host: server.host, port: String(server.port) });
    setLocalResult(null);
    setLocalHint(`${server.name} detectado em ${server.latencyMs} ms — clique em “Testar” para validar a conexão.`);
    setStatus(`${server.name} detectado em ${server.latencyMs} ms. Clique em “Testar” para validar a conexão.`);
  }, []);

  const changeProvider = useCallback((id: ApiProviderId) => {
    const preset = API_PROVIDERS[id];
    setProviderForm(prev => ({ ...prev, id, baseUrl: preset.baseUrl, model: preset.defaultModel }));
    setProviderResult(null);
  }, []);

  const openKeyPage = useCallback(() => {
    if (!providerPreset.keyUrl) return;
    void Linking.openURL(providerPreset.keyUrl);
  }, [providerPreset.keyUrl]);

  return (
    <ScreenContainer style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>CRIS · APIS DE IA</Text>
            <Text style={styles.title}>IA local ou API de terceiros</Text>
            <Text style={styles.subtitle}>
              Conecte a Cris a um servidor de IA no seu dispositivo (Ollama, LM Studio, llama.cpp) ou a um provedor na
              nuvem. O Estudo Organizado não hospeda nem paga por IA: a conexão sai direto do seu aparelho.
            </Text>
          </View>
          <TouchableOpacity onPress={() => router.back()} style={styles.back} accessibilityRole="button" accessibilityLabel="Voltar">
            <Text style={styles.backText}>Voltar</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.notice}>
          <Text style={styles.noticeIcon}>🔒</Text>
          <View style={styles.noticeCopy}>
            <Text style={styles.noticeTitle}>A chave fica só no seu dispositivo</Text>
            <Text style={styles.noticeText}>
              No Android a chave é guardada no armazenamento seguro (SecureStore); na web fica no localStorage do
              navegador. Nada é enviado para os servidores do aplicativo.
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Modo ativo</Text>
          <Text style={styles.sectionHint}>Escolha a fonte que a Cris deve priorizar.</Text>
          <View style={styles.modeRow}>
            {([
              { id: 'local', label: 'IA local', detail: 'Roda no meu dispositivo ou rede' },
              { id: 'provider', label: 'API de terceiros', detail: 'Groq, Gemini, OpenAI ou OpenRouter' },
            ] as const).map(option => {
              const active = config.mode === option.id;
              const operational = option.id === 'local' ? localActive : providerActive;
              return (
                <TouchableOpacity
                  key={option.id}
                  onPress={() => void setMode(option.id)}
                  style={[styles.modeCard, active && styles.modeCardActive]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                >
                  <Text style={[styles.modeTitle, active && styles.modeTitleActive]}>{option.label}</Text>
                  <Text style={styles.modeDetail}>{option.detail}</Text>
                  <Text style={[styles.modeState, operational ? styles.modeStateOk : styles.modeStateWarn]}>
                    {operational ? '● ativa agora' : '○ não ativa'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {modeWarning ? (
            <View style={styles.warn}>
              <Text style={styles.warnTitle}>Modo escolhido ainda não está operante</Text>
              <Text style={styles.warnText}>{modeWarning}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>IA Local</Text>
            <AcademicPill label={localBadge.label} tone={localBadge.tone} />
          </View>
          <Text style={styles.sectionHint}>
            Busca em portas conhecidas (11434, 1234, 5001, 8000, 8080, 5000, 11435) e permite ajustar o endereço.
          </Text>

          <View style={styles.buttonRow}>
            <AcademicButton
              label={scanning ? 'Procurando…' : 'Detectar IA local'}
              onPress={() => void scan(localForm.host, localForm.protocol)}
              disabled={scanning}
            />
          </View>
          {scanMessage ? <Text style={styles.helper}>{scanMessage}</Text> : null}

          {servers.length > 0 ? (
            <View style={styles.serverList}>
              {servers.map(server => {
                const active = selectedServer?.url === server.url;
                return (
                  <TouchableOpacity
                    key={server.url}
                    onPress={() => selectServer(server)}
                    style={[styles.serverItem, active && styles.serverItemActive]}
                    accessibilityRole="button"
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.serverName}>{server.name}</Text>
                      <Text style={styles.serverUrl}>{server.url}</Text>
                      <Text style={styles.serverMeta}>
                        {server.models.length ? `${server.models.length} modelo(s)` : 'sem lista de modelos'} · {server.latencyMs} ms
                      </Text>
                    </View>
                    <Text style={styles.serverAction}>{active ? 'selecionado' : 'usar'}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : null}

          <Text style={styles.fieldLabel}>Protocolo</Text>
          <View style={styles.segment}>
            {(['http', 'https'] as const).map(protocol => {
              const active = localForm.protocol === protocol;
              return (
                <TouchableOpacity
                  key={protocol}
                  onPress={() => setLocalForm(prev => ({ ...prev, protocol }))}
                  style={[styles.segmentItem, active && styles.segmentItemActive]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                >
                  <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{protocol.toUpperCase()}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.fieldLabel}>IP ou host</Text>
          <TextInput
            value={localForm.host}
            onChangeText={value => setLocalForm(prev => ({ ...prev, host: value }))}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="192.168.0.10"
            placeholderTextColor={academicColors.muted}
            style={styles.input}
          />

          <Text style={styles.fieldLabel}>Porta</Text>
          <TextInput
            value={localForm.port}
            onChangeText={value => setLocalForm(prev => ({ ...prev, port: value.replace(/[^0-9]/g, '') }))}
            keyboardType="number-pad"
            placeholder="11434"
            placeholderTextColor={academicColors.muted}
            style={styles.input}
          />

          <Text style={styles.endpointPreview}>{localUrl ? `${localUrl}/v1/models` : 'Informe o endereço para ver a rota de teste'}</Text>

          <View style={styles.buttonRow}>
            <AcademicButton label="Testar" tone="ghost" onPress={() => void runLocalTest()} disabled={testingLocal || !localUrl} />
            <AcademicButton label="Salvar IA local" tone="violet" onPress={() => void persistLocal()} disabled={!localUrl} />
          </View>
          <TestFeedback result={localResult} testing={testingLocal} hint={localHint} />
          {config.local.lastTestedAt ? (
            <Text style={styles.helper}>
              Último teste: {formatTestedAt(config.local.lastTestedAt)}
              {localChanged ? ' · alterações não salvas' : ''}
            </Text>
          ) : null}

          <View style={styles.warn}>
            <Text style={styles.warnTitle}>Aviso sobre CORS (navegador)</Text>
            <Text style={styles.warnText}>
              Na web, o navegador pode bloquear a leitura do servidor local mesmo com ele ligado. Rode o app no Android
              para o teste mais confiável ou libere as origens no servidor (ex.: Ollama com OLLAMA_ORIGINS=*). No
              Android, use o IP da rede (ex.: 192.168.0.10), não “localhost”.
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>API de Terceiros</Text>
            <AcademicPill label={providerBadge.label} tone={providerBadge.tone} />
          </View>
          <Text style={styles.sectionHint}>Use uma chave própria. O app só envia a chave para o provedor escolhido.</Text>

          <View style={styles.providerGrid}>
            {PROVIDER_ORDER.map(id => {
              const preset = API_PROVIDERS[id];
              const active = providerForm.id === id;
              return (
                <TouchableOpacity
                  key={id}
                  onPress={() => changeProvider(id)}
                  style={[styles.providerChip, active && { borderColor: preset.accent, backgroundColor: '#FFFFFF' }]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                >
                  <View style={[styles.providerDot, { backgroundColor: preset.accent }]} />
                  <Text style={[styles.providerChipText, active && { color: academicColors.ink }]}>{preset.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={styles.providerHint}>{providerPreset.hint}</Text>

          <Text style={styles.fieldLabel}>Chave de API</Text>
          <View style={styles.keyRow}>
            <TextInput
              value={providerForm.apiKey}
              onChangeText={value => setProviderForm(prev => ({ ...prev, apiKey: value }))}
              secureTextEntry={!showKey}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="cole sua chave aqui"
              placeholderTextColor={academicColors.muted}
              style={[styles.input, styles.keyInput]}
            />
            <TouchableOpacity
              onPress={() => setShowKey(value => !value)}
              style={styles.keyToggle}
              accessibilityRole="button"
              accessibilityLabel={showKey ? 'Ocultar chave' : 'Mostrar chave'}
            >
              <Text style={styles.keyToggleText}>{showKey ? 'Ocultar' : 'Mostrar'}</Text>
            </TouchableOpacity>
          </View>

          {providerPreset.keyUrl ? (
            <TouchableOpacity onPress={openKeyPage} style={styles.linkButton} accessibilityRole="link">
              <Text style={styles.linkText}>Gerar chave no {providerPreset.label} ↗</Text>
            </TouchableOpacity>
          ) : null}

          <Text style={styles.fieldLabel}>URL base (compatível com OpenAI)</Text>
          <TextInput
            value={providerForm.baseUrl}
            onChangeText={value => setProviderForm(prev => ({ ...prev, baseUrl: value }))}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="https://api.exemplo.com/v1"
            placeholderTextColor={academicColors.muted}
            style={styles.input}
          />

          <Text style={styles.fieldLabel}>Modelo</Text>
          <TextInput
            value={providerForm.model}
            onChangeText={value => setProviderForm(prev => ({ ...prev, model: value }))}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder={providerPreset.defaultModel || 'nome-do-modelo'}
            placeholderTextColor={academicColors.muted}
            style={styles.input}
          />

          <View style={styles.buttonRow}>
            <AcademicButton
              label="Testar"
              tone="ghost"
              onPress={() => void runProviderTest()}
              disabled={testingProvider || !providerForm.baseUrl.trim() || !providerForm.apiKey.trim()}
            />
            <AcademicButton
              label="Salvar API de terceiros"
              tone="violet"
              onPress={() => void persistProvider()}
              disabled={!providerForm.baseUrl.trim() || !providerForm.apiKey.trim()}
            />
          </View>
          <TestFeedback result={providerResult} testing={testingProvider} />
          {config.provider.lastTestedAt ? (
            <Text style={styles.helper}>
              Último teste: {formatTestedAt(config.provider.lastTestedAt)}
              {providerChanged ? ' · alterações não salvas' : ''}
            </Text>
          ) : null}
          <Text style={styles.helper}>A chave não é gravada pelo botão “Testar” — só pelo “Salvar”.</Text>

          <View style={styles.warn}>
            <Text style={styles.warnTitle}>Segurança</Text>
            <Text style={styles.warnText}>
              A chave nunca é enviada ao Estudo Organizado. Evite chaves com permissões amplas e revogue no provedor se
              desconfiar de exposição. O teste consulta apenas /models para validar a conexão.
            </Text>
          </View>
        </View>

        <Text style={styles.status}>{status}</Text>
      </ScrollView>
    </ScreenContainer>
  );
}

function TestFeedback({ result, testing, hint }: { result: ApiTestResult | null; testing: boolean; hint?: string | null }) {
  if (testing) {
    return (
      <View style={[styles.feedback, styles.feedbackNeutral]}>
        <Text style={styles.feedbackText}>Testando conexão…</Text>
      </View>
    );
  }
  if (!result) {
    if (!hint) return null;
    return (
      <View style={[styles.feedback, styles.feedbackNeutral]}>
        <Text style={styles.feedbackText}>{hint}</Text>
      </View>
    );
  }
  return (
    <View style={[styles.feedback, result.ok ? styles.feedbackOk : styles.feedbackError]}>
      <Text style={[styles.feedbackTitle, { color: result.ok ? academicColors.success : academicColors.danger }]}>
        {result.ok ? 'Conexão OK' : 'Falha na conexão'}
      </Text>
      <Text style={styles.feedbackText}>{result.message}</Text>
      {result.ok && result.models.length ? (
        <Text style={styles.feedbackModels} numberOfLines={3}>
          {result.models.slice(0, 8).join(' · ')}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: academicColors.canvas },
  content: { padding: 24, paddingBottom: 120, gap: 18 },
  header: { alignItems: 'flex-start', flexDirection: 'row', gap: 16, justifyContent: 'space-between' },
  eyebrow: { color: academicColors.violet, fontSize: 11, fontWeight: '900', letterSpacing: 1.3 },
  title: { color: academicColors.ink, fontSize: 30, fontWeight: '900', lineHeight: 36, marginTop: 5 },
  subtitle: { color: academicColors.muted, fontSize: 14, lineHeight: 20, marginTop: 6, maxWidth: 640 },
  back: { backgroundColor: '#FFFFFF', borderColor: academicColors.line, borderRadius: 10, borderWidth: 1, paddingHorizontal: 13, paddingVertical: 9 },
  backText: { color: academicColors.indigo, fontWeight: '800' },
  notice: { backgroundColor: '#FFFFFF', borderColor: '#DCE8E2', borderRadius: 14, borderWidth: 1, flexDirection: 'row', gap: 12, padding: 15 },
  noticeIcon: { fontSize: 22 },
  noticeCopy: { flex: 1 },
  noticeTitle: { color: academicColors.ink, fontWeight: '900' },
  noticeText: { color: academicColors.muted, fontSize: 12, lineHeight: 18, marginTop: 4 },
  section: { backgroundColor: '#FFFFFF', borderColor: academicColors.line, borderRadius: 16, borderWidth: 1, gap: 8, padding: 16 },
  sectionHead: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  sectionTitle: { color: academicColors.ink, fontSize: 18, fontWeight: '900' },
  sectionHint: { color: academicColors.muted, fontSize: 12, lineHeight: 18 },
  modeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 6 },
  modeCard: { borderColor: academicColors.line, borderRadius: 12, borderWidth: 1, flexGrow: 1, minWidth: 150, padding: 12 },
  modeCardActive: { backgroundColor: academicColors.violetSoft, borderColor: academicColors.violet },
  modeTitle: { color: academicColors.ink, fontSize: 14, fontWeight: '800' },
  modeTitleActive: { color: academicColors.violet },
  modeDetail: { color: academicColors.muted, fontSize: 11, lineHeight: 16, marginTop: 3 },
  modeState: { fontSize: 11, fontWeight: '800', marginTop: 6 },
  modeStateOk: { color: academicColors.success },
  modeStateWarn: { color: academicColors.warning },
  buttonRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 6 },
  helper: { color: academicColors.muted, fontSize: 12, lineHeight: 18 },
  serverList: { gap: 8, marginTop: 4 },
  serverItem: { alignItems: 'center', borderColor: academicColors.line, borderRadius: 12, borderWidth: 1, flexDirection: 'row', gap: 10, padding: 12 },
  serverItemActive: { backgroundColor: academicColors.violetSoft, borderColor: academicColors.violet },
  serverName: { color: academicColors.ink, fontSize: 13, fontWeight: '800' },
  serverUrl: { color: academicColors.indigo, fontSize: 12, marginTop: 2 },
  serverMeta: { color: academicColors.muted, fontSize: 11, marginTop: 2 },
  serverAction: { color: academicColors.violet, fontSize: 12, fontWeight: '800' },
  fieldLabel: { color: '#24324A', fontSize: 12, fontWeight: '800', marginTop: 10 },
  segment: { borderColor: academicColors.line, borderRadius: 10, borderWidth: 1, flexDirection: 'row', overflow: 'hidden' },
  segmentItem: { alignItems: 'center', flex: 1, paddingVertical: 9 },
  segmentItemActive: { backgroundColor: academicColors.indigo },
  segmentText: { color: academicColors.indigo, fontSize: 12, fontWeight: '800' },
  segmentTextActive: { color: '#FFFFFF' },
  input: { backgroundColor: '#FBFBFD', borderColor: academicColors.line, borderRadius: 10, borderWidth: 1, color: academicColors.ink, fontSize: 13, minHeight: 44, paddingHorizontal: 12, paddingVertical: 8 },
  endpointPreview: { color: academicColors.muted, fontSize: 11, marginTop: 6 },
  warn: { backgroundColor: '#FFF8E8', borderColor: '#F0DFB0', borderRadius: 12, borderWidth: 1, marginTop: 8, padding: 12 },
  warnTitle: { color: academicColors.warning, fontSize: 12, fontWeight: '900' },
  warnText: { color: academicColors.muted, fontSize: 11, lineHeight: 17, marginTop: 4 },
  providerGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  providerChip: { alignItems: 'center', backgroundColor: '#F7F8FB', borderColor: academicColors.line, borderRadius: 999, borderWidth: 1, flexDirection: 'row', gap: 7, paddingHorizontal: 12, paddingVertical: 8 },
  providerDot: { borderRadius: 5, height: 10, width: 10 },
  providerChipText: { color: academicColors.muted, fontSize: 12, fontWeight: '800' },
  providerHint: { color: academicColors.muted, fontSize: 11, lineHeight: 17, marginTop: 4 },
  keyRow: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  keyInput: { flex: 1 },
  keyToggle: { borderColor: academicColors.line, borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 11 },
  keyToggleText: { color: academicColors.indigo, fontSize: 12, fontWeight: '800' },
  linkButton: { alignSelf: 'flex-start', marginTop: 4, paddingVertical: 6 },
  linkText: { color: academicColors.violet, fontSize: 12, fontWeight: '800' },
  feedback: { borderRadius: 12, borderWidth: 1, marginTop: 8, padding: 12 },
  feedbackOk: { backgroundColor: '#E8F6EF', borderColor: '#BFE3D2' },
  feedbackError: { backgroundColor: '#FDECEF', borderColor: '#F3C4CC' },
  feedbackNeutral: { backgroundColor: '#F3F4F6', borderColor: academicColors.line },
  feedbackTitle: { fontSize: 12, fontWeight: '900' },
  feedbackText: { color: academicColors.muted, fontSize: 11, lineHeight: 17, marginTop: 3 },
  feedbackModels: { color: academicColors.ink, fontSize: 11, marginTop: 6 },
  status: { color: academicColors.muted, fontSize: 12, textAlign: 'center' },
});
