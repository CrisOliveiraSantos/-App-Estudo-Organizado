# Build de produção (APK Android)

Este projeto usa **EAS Build**. O perfil `preview` gera um **APK** assinado para instalar direto no celular; o perfil `production` gera um **AAB** para a Play Store.

> Regra de ouro: nunca commite `.env`, keystores (`*.jks`, `*.p12`) nem o arquivo de credenciais do EAS. Use variáveis de ambiente do EAS para os valores públicos do app.

## 1. O que já está configurado

- `eas.json`
  - `build.preview.distribution`: `internal`
  - `build.preview.android.buildType`: `apk`
  - `build.production.android.buildType`: `app-bundle` (`.aab`)
  - `cli.appVersionSource`: `local` — o `versionCode` **não** é incrementado sozinho.
- `app.config.ts`
  - `android.package`: `com.app.estudoorganizado`
  - `android.versionCode`: `1`
  - `version`: `1.0.0`

## 2. Pré-requisitos

1. Node.js 20 ou superior.
2. Uma conta Expo com acesso ao projeto `4fd21b1e-eea8-4f62-a578-f821f8a42050`.
3. EAS CLI. Não precisa instalar globalmente:
   ```bash
   npx eas-cli@latest --version
   ```
4. Celular Android com espaço livre e permissão para instalar apps de fontes desconhecidas.

## 3. Login e vínculo do projeto

```bash
npx eas-cli@latest login
npx eas-cli@latest whoami
```

O `whoami` deve mostrar o usuário dono do projeto. Se aparecer `Not logged in`, refaça o login.

O vínculo já está em `app.config.ts` (`extra.eas.projectId`). Para conferir:

```bash
npx eas-cli@latest project:info
```

## 4. Variáveis de ambiente do build

O `.env` local é ignorado pelo Git e **não é enviado** para o EAS. Tudo que o app precisa em tempo de build (por exemplo `EXPO_PUBLIC_SUPABASE_URL` e `EXPO_PUBLIC_SUPABASE_ANON_KEY`) deve existir no ambiente do EAS.

Opção recomendada, uma vez por projeto/ambiente:

```bash
npx eas-cli@latest env:set --environment preview --name EXPO_PUBLIC_SUPABASE_URL --value "https://SEU-PROJETO.supabase.co" --visibility plaintext
npx eas-cli@latest env:set --environment preview --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "SUA_CHAVE_ANON" --visibility sensitive
```

Para listar o que já está configurado:

```bash
npx eas-cli@latest env:list --environment preview
```

> A chave `anon` do Supabase é pública por natureza (vai no bundle), mas continua sendo uma credencial: não a coloque em arquivo versionado. Chaves de IA **não** entram no build; elas são configuradas pela própria usuária em Ajustes → APIs de IA e ficam no SecureStore do aparelho.

## 5. Checklist antes de gerar

```bash
npx tsc --noEmit
npx vitest run
git status --short
```

- `tsc` deve terminar com `exit 0`.
- `vitest` deve passar (o teste de conexão do Supabase é pulado quando as variáveis não estão no ambiente local).
- O `git status` deve estar limpo; o EAS empacota o repositório, não a pasta de trabalho com arquivos não commitados.

Confira também `android.versionCode` em `app.config.ts`. Para um novo envio à Play Store, ele **precisa** ser maior que o anterior (`2`, `3`, ...). Para APK interno, o mesmo valor pode ser reinstalado por cima **desde que a assinatura seja a mesma**.

## 6. Gerar o APK (perfil `preview`)

```bash
npx eas-cli@latest build --platform android --profile preview
```

- O terminal mostra o andamento e, no fim, um link do tipo `https://expo.dev/accounts/.../builds/...`.
- O build roda na nuvem; pode fechar o terminal e acompanhar pelo link.
- Para rodar sem perguntas (CI ou script):
  ```bash
  npx eas-cli@latest build --platform android --profile preview --non-interactive
  ```
- Para baixar o artefato direto pela CLI depois que terminar:
  ```bash
  npx eas-cli@latest build:list --platform android --limit 1
  ```

## 7. Instalar no celular

### Pelo link (mais simples)

1. Abra o link do build no **celular** (ou escaneie o QR code mostrado pelo EAS).
2. Toque em **Download** / **Install**.
3. Se o Android bloquear, permita "Instalar apps desconhecidos" para o navegador ou gerenciador de arquivos usado.
4. Abra o app **Estudo Organizado**.

### Por USB (ADB)

```bash
adb install -r caminho\para\estudo-organizado.apk
```

`-r` reinstala mantendo os dados, quando a assinatura é a mesma. Se o Android recusar com `INSTALL_FAILED_UPDATE_INCOMPATIBLE` ou `signatures do not match`, será preciso desinstalar a versão antiga — isso apaga os dados locais do app (notas, PDFs e preferências). Faça backup antes se for importante.

## 8. Instalar por cima de um build anterior

- **Mesma assinatura EAS** + **mesmo `applicationId`** (`com.app.estudoorganizado`) = instalação por cima, preservando dados.
- Um build feito com `expo run:android` usa a keystore de **debug**, diferente da keystore do EAS. Nesse caso o Android recusa a atualização; desinstale a versão de desenvolvimento antes.
- O Expo Go é outro aplicativo (`host.exp.exponent`) e não conflita com o APK.

## 9. Gerar o AAB da Play Store

```bash
npx eas-cli@latest build --platform android --profile production
```

Antes de cada envio, aumente `android.versionCode` em `app.config.ts`. O perfil `production` usa `app-bundle` e `distribution: store` (padrão). O upload pode ser feito com:

```bash
npx eas-cli@latest submit --platform android --profile production
```

## 10. Problemas comuns

| Sintoma | Causa provável | Solução |
| --- | --- | --- |
| `Not logged in` | Sessão EAS expirada | `npx eas-cli@latest login` |
| `Project not found` | `projectId`/conta errada | `npx eas-cli@latest project:info` e confira o login |
| App abre sem Supabase/API | Variável não existe no ambiente do EAS | `npx eas-cli@latest env:list --environment preview` e recrie |
| `INSTALL_FAILED_UPDATE_INCOMPATIBLE` | Assinatura diferente | Desinstalar a versão antiga (perde dados locais) |
| Build falha em `expo doctor` | Dependência incompatível | `npx expo install --check` e refaça o commit |
| APK instala mas não atualiza | `versionCode` igual e instalador exigente | Aumente `android.versionCode` |
| Build antigo com código desatualizado | Arquivos não commitados | Faça commit/push antes do build |

## 11. Build local (opcional)

Se precisar gerar o APK sem a nuvem, é necessário ter Android SDK, Java 17 e as variáveis `ANDROID_HOME`/`JAVA_HOME` configuradas:

```bash
npx eas-cli@latest build --platform android --profile preview --local
```

O caminho da nuvem é o recomendado para este projeto, porque não depende da máquina de desenvolvimento.

## 12. Referências

- Documentação do EAS Build: <https://docs.expo.dev/build/introduction/>
- Perfis de build: <https://docs.expo.dev/build/eas-json/>
- Variáveis de ambiente: <https://docs.expo.dev/build-reference/variables/>
- Instalação interna: <https://docs.expo.dev/build/internal-distribution/>

