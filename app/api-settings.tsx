import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { AcademicButton, AcademicPill, academicColors, type AcademicTone } from '@/components/academic/design-system';
import { ScreenContainer } from '@/components/screen-container';
import {
  API_PROVIDERS,
  PROVIDER_LIVE_MODEL,
  PROVIDER_ORDER,
  buildLocalUrl,
  isLocalAiReady,
  isModelInList,
  isProviderAiReady,
  localTestState,
  normalizeModelId,
  parseLocalUrl,
  providerTestState,
  providerTestTarget,
  suggestLiveModel,
  testLocalAi,
  testProviderApi,
  testProviderModel,
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

  // "Modelo vivo": a lista real de modelos só existe depois de testar (/models).
  // Se o modelo preenchido não estiver nela, a Cris falha com 404 ao enviar.
  const providerFormModel = providerForm.model.trim() || providerPreset.defaultModel;
  const testedModels = providerResult?.models?.length ? providerResult.models.map(normalizeModelId) : [];
  const modelListKnown = testedModels.length > 0;
  const modelRetired = modelListKnown && !isModelInList(testedModels, providerFormModel);
  const liveModelAlias = PROVIDER_LIVE_MODEL[providerForm.id];
  const suggestedModel = suggestLiveModel(providerForm.id, testedModels);
  const modelOptions = modelListKnown
    ? Array.from(new Set([suggestedModel, liveModelAlias, ...testedModels.slice(0, 3)].filter(Boolean)))
    : [];

  /** Qual fonte a Cris realmente usa agora (o modo escolhido, se operante; senão, a outra; senão, nenhuma). */
  const activeSource =
    config.mode === 'local'
      ? localActive
        ? 'IA local'
        : providerActive
          ? 'API de terceiros (o modo escolhido não está operante)'
          : null
      : providerActive
        ? 'API de terceiros'
        : localActive
          ? 'IA local (o modo escolhido não está operante)'
          : null;

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
    // No sucesso, salva também o endereço testado ("Conexão OK" = IA local configurada e ativa).
    // Na falha, mantém o endereço salvo e só registra que o último teste falhou.
    await saveLocal({
      ...config.local,
      ...(result.ok
        ? {
            url: localUrl,
            backend: selectedServer?.name ?? config.local.backend,
            model: selectedServer?.models[0] ?? config.local.model,
          }
        : {}),
      lastTestStatus: result.ok ? 'success' : 'error',
      lastTestedAt: new Date().toISOString(),
      lastTestedTarget: localUrl,
    });
  }, [config.local, localUrl, saveLocal, selectedServer]);

  const runProviderTest = useCallback(async () => {
    setTestingProvider(true);
    setProviderResult(null);
    // Mesma configuração que será salva (usa os padrões do provedor quando o campo está vazio),
    // para que o alvo testado seja exatamente o alvo salvo.
    const tested: ProviderAiConfig = {
      ...config.provider,
      id: providerForm.id,
      apiKey: providerForm.apiKey.trim(),
      baseUrl: providerForm.baseUrl.trim() || providerPreset.baseUrl,
      model: providerForm.model.trim() || providerPreset.defaultModel,
    };
    const payload: TestableProviderConfig = {
      id: tested.id,
      apiKey: tested.apiKey,
      baseUrl: tested.baseUrl,
      model: tested.model,
    };
    // Passo 1 — GET /models: valida chave + URL base (e traz a lista real de modelos).
    const connection = await testProviderApi(payload);
    // Passo 2 — POST /chat/completions: valida o MODELO de verdade. O GET /models
    // pode passar enquanto o envio dá 404 ("modelo aposentado"), então o badge só
    // fica verde se ESTE passo também responder. Mantém a lista do passo 1 para
    // os chips de modelos vivos continuarem aparecendo.
    let effective: ApiTestResult = connection;
    if (connection.ok) {
      const modelTest = await testProviderModel(payload);
      effective = { ...modelTest, models: connection.models };
    }
    setProviderResult(effective);
    setStatus(effective.message);
    setTestingProvider(false);
    // Com a conexão OK, a chave é gravada (mesmo com o modelo aposentado, para
    // não obrigar a colar de novo) — mas o status fica "falha", então o app
    // sabe que ainda NÃO está ativo e a Cris mostra o aviso. Na falha de rede,
    // mantém o que já estava salvo e só registra o resultado do teste.
    const connectionOk = connection.ok;
    await saveProvider({
      ...config.provider,
      ...(connectionOk
        ? { id: tested.id, apiKey: tested.apiKey, baseUrl: tested.baseUrl, model: tested.model }
        : {}),
      lastTestStatus: effective.ok ? 'success' : 'error',
      lastTestedAt: new Date().toISOString(),
      lastTestedTarget: providerTestTarget(payload),
    });
  }, [config.provider, providerPreset, providerForm, saveProvider]);

  // "Testar modelo": envia APENAS o POST /chat/completions (não salva nada).
  // Serve para confirmar se o modelo escolhido responde, mostrando o erro exato.
  const runProviderModelTest = useCallback(async () => {
    setTestingProvider(true);
    const payload: TestableProviderConfig = {
      id: providerForm.id,
      apiKey: providerForm.apiKey.trim(),
      baseUrl: providerForm.baseUrl.trim() || providerPreset.baseUrl,
      model: providerForm.model.trim() || providerPreset.defaultModel,
    };
    const result = await testProviderModel(payload);
    // Preserva a lista de modelos já conhecida (do teste de conexão) para os chips.
    setProviderResult(previous => ({ ...result, models: previous?.models?.length ? previous.models : [] }));
    setStatus(result.message);
    setTestingProvider(false);
  }, [providerForm, providerPreset]);

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

  /** Troca só o campo Modelo (mantém a lista de /models para o usuário escolher). */
  const applyProviderModel = useCallback((model: string) => {
    setProviderForm(prev => ({ ...prev, model }));
  }, []);

  const openKeyPage = useCallback(() => {
    if (!providerPreset.keyUrl) return;
    void Linking.openURL(providerPreset.keyUrl);
  }, [providerPreset.keyUrl]);

  return (
    <ScreenContainer style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text numberOfLines={1} style={styles.eyebrow}>CRIS · APIS DE IA</Text>
            {/*
              Auto-ajuste em vez de reticências: com o botão "Voltar" ao lado, a
              coluna era espremida e o título longo aparecia cortado. `headerCopy`
              (flex: 1) dá a largura e o `adjustsFontSizeToFit` reduz a fonte até
              caber em uma linha, sem perder o texto.
            */}
            <Text adjustsFontSizeToFit minimumFontScale={0.68} numberOfLines={1} style={styles.title}>IA local ou API de terceiros</Text>
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

        <View style={[styles.notice, styles.scopeNotice]}>
          <Text style={styles.noticeIcon}>📄</Text>
          <View style={styles.noticeCopy}>
            <Text style={styles.noticeTitle}>A IA lê o contexto, não os arquivos brutos</Text>
            <Text style={styles.noticeText}>
              A Cris usa o perfil da memória, matérias, tarefas, metas, eventos e os títulos das notas/PDFs. Ela não abre
              automaticamente PDF, Word, DOCX ou imagens: copie o trecho no chat ou use o leitor interno → Flashcards.
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
          <Text style={styles.modeActiveNote}>
            {activeSource ? `Fonte ativa agora: ${activeSource}.` : 'Nenhuma IA ativa agora — a Cris usa a resposta pronta do app.'}
          </Text>
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
              label="Usar modelo recomendado"
              tone="ghost"
              compact
              onPress={() => applyProviderModel(modelListKnown ? suggestedModel : providerPreset.defaultModel)}
            />
          </View>

          {modelOptions.length ? (
            <View>
              <Text style={styles.helper}>Modelos disponíveis no {providerPreset.label} (toque para usar):</Text>
              <View style={styles.providerGrid}>
                {modelOptions.map(model => (
                  <TouchableOpacity
                    key={model}
                    onPress={() => applyProviderModel(model)}
                    style={styles.providerChip}
                    accessibilityRole="button"
                    accessibilityLabel={`Usar modelo ${model}`}
                  >
                    <View style={[styles.providerDot, { backgroundColor: academicColors.indigo }]} />
                    <Text style={styles.providerChipText}>{model}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.helper}>
                Recomendado: {providerPreset.defaultModel}
                {liveModelAlias && liveModelAlias !== providerPreset.defaultModel
                  ? ` · reserva que nunca envelhece: ${liveModelAlias}`
                  : ''}
              </Text>
            </View>
          ) : null}

          {modelRetired || providerResult?.reason === 'model' ? (
            <View style={styles.warn}>
              <Text style={styles.warnTitle}>❌ O modelo “{providerFormModel}” não funciona mais</Text>
              <Text style={styles.warnText}>
                Ele pode ter sido aposentado pelo {providerPreset.label}. Modelos disponíveis:{' '}
                {modelOptions.length ? modelOptions.join(' · ') : 'teste a conexão para ver a lista'}.
                Toque em “Usar modelo recomendado”{suggestedModel ? ` (${suggestedModel})` : ''} para corrigir — a Cris
                volta a responder na hora.
              </Text>
            </View>
          ) : null}

          <View style={styles.buttonRow}>
            <AcademicButton
              label="Testar"
              tone="ghost"
              onPress={() => void runProviderTest()}
              disabled={testingProvider || !providerForm.baseUrl.trim() || !providerForm.apiKey.trim()}
            />
            <AcademicButton
              label="Testar modelo"
              tone="ghost"
              onPress={() => void runProviderModelTest()}
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
          <Text style={styles.helper}>Quando o teste dá certo, a configuração é salva neste dispositivo.</Text>

          <View style={styles.warn}>
            <Text style={styles.warnTitle}>Segurança</Text>
            <Text style={styles.warnText}>
              A chave nunca é enviada ao Estudo Organizado. Evite chaves com permissões amplas e revogue no provedor se
              desconfiar de exposição. O teste valida a conexão (/models) e faz uma chamada mínima (1 token) para
              confirmar que o modelo responde — a chave continua saindo só no cabeçalho da sua própria requisição.
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
  headerCopy: { flex: 1 },
  eyebrow: { color: academicColors.violet, fontSize: 11, fontWeight: '900', letterSpacing: 1.3 },
  title: { color: academicColors.ink, fontSize: 30, fontWeight: '900', lineHeight: 36, marginTop: 5 },
  subtitle: { color: academicColors.muted, fontSize: 14, lineHeight: 20, marginTop: 6, maxWidth: 640 },
  back: { backgroundColor: '#FFFFFF', borderColor: academicColors.line, borderRadius: 10, borderWidth: 1, paddingHorizontal: 13, paddingVertical: 9 },
  backText: { color: academicColors.indigo, fontWeight: '800' },
  notice: { backgroundColor: '#FFFFFF', borderColor: '#DCE8E2', borderRadius: 14, borderWidth: 1, flexDirection: 'row', gap: 12, padding: 15 },
  scopeNotice: { backgroundColor: '#F7F8FF', borderColor: '#DDE1F4' },
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
  modeActiveNote: { color: academicColors.ink, fontSize: 12, fontWeight: '800', marginTop: 2 },
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
