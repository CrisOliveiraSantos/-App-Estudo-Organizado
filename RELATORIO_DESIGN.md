# Relatório de design — Dolla × Estudo Organizado

> **Auditoria técnica de assets, fidelidade visual e pendências de entrega.**
> Data: 21/10/2026 · Branch: `gh-pages` · Commit base: `8832539`
> Escopo: **somente leitura e documentação.** Nenhum arquivo de código, token ou asset foi alterado.

---

## 0. Resumo executivo

| Pergunta | Resposta curta |
| --- | --- |
| Quais imagens de referência a Dolla entregou? | **10 imagens** (PNG/JPEG) + 2 protótipos HTML — **42,5 MB** só de imagens (**43,2 MB** em `assets/images/`), todos versionados no git. |
| Quantas dessas imagens foram realmente usadas? | **1**: `Ajustes Cris Mockup 1 tela desmonstração.png`, e apenas um **recorte de 160×160 px** dela (`cris-avatar.png`). |
| De onde saiu o rosto da Cris? | Do recorte **exato** em `x=677, y=777, 160×160` daquele PNG — **100% dos pixels idênticos** (MAD 0,00). Provado na §3. |
| Por que ele fica pixelizado? | Porque é um **recorte de tela**, não um asset: 160 px de um mockup renderizado, usados num FAB de 64 dp que pede **192 px** num aparelho 3×. Ampliação de 1,2× no quadro e ~1,6× no rosto. Detalhes na §4. |
| O que mais ficou de fora? | Donut de progresso, gráfico de barras, calendário com cabeçalho em gradiente, cartão-gradiente rosa, tipografia serifada dos títulos, ícones próprios, logo da Dolla, fundo de nebulosa/partículas, tela de login e uma **tela inteira (Conversas) ainda no design antigo**. §6–§7. |
| O ícone do app é da Dolla? | **Não.** `icon.png`, `splash-icon.png` e `android-icon-foreground.png` são **o mesmo arquivo do template Expo** (MD5 `035A78C8C6`); o ícone de verdade existe (`Mockup logo.png`, 2048×2048) mas nunca foi ligado. §7.1. |
| Dá para chegar a 100% de fidelidade com o que existe? | **Não.** Faltam fontes em vetor, camadas, imagens soltas e a especificação tipográfica. §8 lista o que precisa ser entregue. |

**Diagnóstico em uma frase:** o visual "Neon" do app foi reconstruído a partir de um **protótipo HTML simplificado** (`cris-mockup2.html`), não das imagens da Dolla. Isso entregou **cor, geometria e movimento** com boa fidelidade, mas deixou de fora **tudo o que é imagem** (logo, retrato, fundos, ilustrações, ícones) e **tudo o que é tipografia** (os títulos serifados dos mockups viraram Inter ExtraBold).

---

## 1. Inventário do que existe hoje em `assets/images/`

**22 arquivos rastreados no git, 43,22 MB.** Apenas **0,12%** disso (55,3 KB) é usado pelo app.

### 1.1 Referências de design (10 imagens + 1 HTML — 42,5 MB)

| Arquivo | Dimensões | Peso | O que é | Usado no app? |
| --- | --- | ---: | --- | --- |
| `Ajustes Cris Mockup (1).png` | 1600×2848 | 3,9 MB | Tela "Hoje" completa (donut 20%, stat cards, "Next tasks") | ❌ |
| `Ajustes Cris Mockup 1 tela demonstração.jpeg` | 1600×2848 | 3,9 MB | "Hoje" + painel de chat da Cris sobreposto + FAB | ❌ |
| **`Ajustes Cris Mockup 1 tela desmonstração.png`** | 1600×2848 | 4,1 MB | Mesma tela anterior; **fonte do recorte do avatar** | ⚠️ **1 recorte de 160×160** |
| `Ajustes Cris Mockup 4 telas.jpeg` | 1600×2848 | 5,1 MB | 4 painéis: "Cris vivo", 6 telas secundárias, chat, fluxo | ❌ |
| `Ajustes Cris Mockup outras telas.png` | 1600×2848 | 3,7 MB | "Hoje" alternativo: donut + **gráfico de barras** + cartão rosa + calendário ciano | ❌ |
| `Ajustes Cris Mockup várias telas e tema escuro.jpeg` | 2048×2048 | 6,2 MB | 4 painéis, 7 telas, **variações de tema escuro** (Manhã/Noite/Madrugada/Entardecer) | ❌ |
| `Ajustes Cris Mockup varias telas e temas claro.jpeg` | 2048×2048 | 4,9 MB | Os mesmos 4 painéis em **modo claro** | ❌ |
| `Mockup 3 telas demonstração.png` | 2048×2048 | 4,2 MB | "Sobre mim", **"Configuração de IA"** (provedores, temperatura) e "Modelo apontado" | ❌ |
| **`Mockup logo.png`** | 2048×2048 | 3,1 MB | **Ícone do app**: "C" neon ciano→magenta com glifo de caderno, em quadrado arredondado escuro | ❌ |
| `Mockup tela de loguin.png` | 1600×2848 | 3,4 MB | **Tela de login**: capelo + "Cris" serifado, "Estude com mais foco", Entrar / Entrar com Google | ❌ |
| `cris_estudo_organizado_mockup.html` | — | 23 KB | Protótipo HTML antigo (sem CSS de fonte declarado) | ❌ |

### 1.2 Assets nativos do app (7 arquivos — 0,64 MB)

| Arquivo | Dimensões | Peso | Origem | Status |
| --- | ---: | ---: | --- | --- |
| `icon.png` | 512×512 | 184,5 KB | **Template Expo** (livro azul + check verde) | 🔴 não é a marca Dolla |
| `splash-icon.png` | 512×512 | 184,5 KB | **Mesmo arquivo** (`MD5 035A78C8C6`) | 🔴 idem |
| `android-icon-foreground.png` | 512×512 | 184,5 KB | **Mesmo arquivo** | 🔴 idem |
| `favicon.png` | 192×192 | 26,6 KB | Versão 192 px da mesma arte Expo | 🔴 idem |
| `android-icon-background.png` | 512×512 | 17,1 KB | **Grid de guia do Expo** (linhas tracejadas em fundo azul-claro) | 🔴 não é design |
| `android-icon-monochrome.png` | 432×432 | 4,0 KB | Placeholder do Expo (letra "A" cinza) | 🔴 não é design |
| **`cris-avatar.png`** | **160×160** | **55,3 KB** | **Recorte do mockup** (§3) | 🟢 **único asset de design em uso** |

> Os 4 arquivos `react-logo*.png` / `partial-react-logo.png` (24,6 KB) são sobras do template e não são referenciados por nenhum arquivo.

### 1.3 Onde cada asset é carregado (busca no código)

Uma varredura por `require(...)` / `import` de imagens em `app/`, `components/`, `lib/` e `server/` retorna **um único** asset de design:

```ts
// components/neon/fab.tsx:30
const CRIS_FACE = require('../../assets/images/cris-avatar.png');
```

Todo o resto do visual é **código**: cor vem de `lib/_core/theme.ts`, geometria de `lib/theme-runtime.ts` e `components/neon/nav-items.ts`, desenho de `react-native-svg` (gradientes) e glifos de `@expo/vector-icons` (Material Icons).

---

## 2. Qual referência foi de fato usada

Existem **duas** referências no projeto e elas não são equivalentes:

| | Referência A — imagens da Dolla | Referência B — `cris-mockup2.html` |
| --- | --- | --- |
| Arquivos | 10 PNG/JPEG, 42,5 MB, 1600×2848 ou 2048×2048 | 1 HTML, 62,8 KB, 1106 linhas |
| O que contém | telas completas, logo, retrato, ilustrações, fundos, gráficos | só **caixas, cores e geometria** (`.card`, `.topbar`, `.bottomnav`, `.fab`) |
| Tipografia | títulos **serifados** com gradiente ("Hoje", "Cris"), texto em sans | `body{font:14px/1.45 Inter,ui-sans-serif,…}` (HTML:39) — **100% Inter**; `.topbar h1` = 26 px sem serifa |
| Logo | "C" neon com caderno (`Mockup logo.png`), capelo + "Cris" (`tela de loguin`) | `.brand` é **só texto** (`<strong>Cris</strong>`, HTML:80-83) — nenhuma imagem |
| Login | capelo, "Estude com mais foco", Entrar, **Entrar com Google** | `.btn-google` existe no CSS (HTML:69-70) e nunca foi implementado no app |
| Gráficos | donut 20%, 8 barras coloridas, anéis de progresso | **nenhum** gráfico |
| Fundo | nebulosa, planetas, estrelas de 4 pontas, arcos de luz | 40 `.particles` (bolinhas de 2-5 px) |

**O código seguiu a Referência B.** Todos os arquivos do shell citam o HTML nominalmente:

- `components/neon/nav-items.ts:5` — "copiada do objeto `pages` do mockup (`cris-mockup2.html`, linhas 307-313)";
- `app/(tabs)/_layout.tsx:2` — "casca das abas traduzida do `cris-mockup2.html`";
- `lib/theme-runtime.ts:2` — "tokens derivados do mockup `cris-mockup2.html`";
- `lib/_core/theme.ts:72` — "a paleta do mockup oficial da Dolla".

Isso foi uma escolha razoável — o HTML é legível por máquina, dá para copiar `padding`, `border-radius` e `transition` com precisão —, mas tem uma consequência direta: **tudo o que existe só nas imagens não entrou**. A única exceção é o rosto da Cris, adicionado depois (commit `ae209ce`), e justamente por isso é o único ponto que *parece* da Dolla no app.

> **Nota técnica sobre as imagens.** São concept arts geradas por IA (texto embaralhado: "Storcas", "Pictars", "Calendarr", "Documents 9", "Splinders"). Elas **não são um spec sheet** — não indicam medidas, estados, contraste nem fonte. Servem como **direção de arte**; a especificação executável é o HTML. "100% de fidelidade" precisa, portanto, ser definido **componente por componente**, e não como igualdade pixel a pixel com a imagem.

---

## 3. Por que a Cris está pixelizada — prova forense

### 3.1 Origem exata do recorte

`assets/images/cris-avatar.png` **não é um asset entregue pela Dolla**: é um recorte de tela.

| Propriedade | Valor |
| --- | --- |
| Arquivo-fonte | `assets/images/Ajustes Cris Mockup 1 tela desmonstração.png` (1600×2848) |
| Região recortada | `x=677, y=777, w=160, h=160` |
| Centro do recorte | (757, 857) — o anel magenta do avatar no cabeçalho do painel de chat |
| Máscara | circular, **19.292 px opacos** de 25.600 → diâmetro útil ≈ **157 px** |
| Peso | 55,3 KB (PNG de 160×160 com compressão baixa) |

**Prova:** comparando os pixels opacos do PNG com a região correspondente de cada uma das 10 imagens, só **um** arquivo coincide:

```
Ajustes Cris Mockup 1 tela desmonstração.png    MAD=  0,00   exatos=19292/19292 (100,0%)   max=0
Ajustes Cris Mockup 1 tela demonstração.jpeg    MAD= 64,85   exatos=    0/19292 (  0,0%)
Ajustes Cris Mockup (1).png                     MAD= 51,48   exatos=    1/19292 (  0,0%)
Ajustes Cris Mockup outras telas.png            MAD= 60,20   exatos=   17/19292 (  0,1%)
Mockup 3 telas demonstração.png                 MAD= 60,47   exatos=   19/19292 (  0,1%)
Mockup logo.png                                 MAD= 51,72   exatos=    0/19292 (  0,0%)
Mockup tela de loguin.png                       MAD= 65,34   exatos=    0/19292 (  0,0%)
Ajustes Cris Mockup 4 telas.jpeg                MAD= 65,29   exatos=    0/19292 (  0,0%)
Ajustes Cris Mockup várias telas … escuro.jpeg  MAD= 86,81   exatos=    0/19292 (  0,0%)
Ajustes Cris Mockup varias telas … claro.jpeg   MAD= 56,70   exatos=    1/19292 (  0,0%)
```

MAD 0,00 com **100% dos pixels idênticos e erro máximo 0** só acontece quando o PNG foi literalmente *copiado* daquela região. Nem a versão JPEG da mesma tela (nome escrito corretamente, `demonstração`) serve: recompressão JPEG já altera todos os pixels (MAD 64,85).

### 3.2 O que isso significa

O avatar é **uma captura de tela de uma tela**: herda o tamanho em que a Cris aparecia naquela composição, o anel magenta que já vinha desenhado nela e a suavização da arte original. Ele nunca teve resolução própria — não existe "original" maior em lugar nenhum do repositório.

---

## 4. A conta da pixelização

| Grandeza | Valor | Observação |
| --- | --- | --- |
| Largura da arte do mockup | 1600 px | a tela do celular dentro dela ocupa ~70% (≈1.130 px) |
| Escala do mockup | ≈3,1 px por dp | para um aparelho de 360 dp de largura |
| **Resolução útil do avatar** | **160 px ≈ 51 dp** | é este o "tamanho de projeto" do retrato |
| FAB no app | **64 dp** | `dollaTokens.layout.fabSize`, 64 em qualquer largura (`nav-items.ts:99`) |
| Pixels físicos pedidos pelo FAB | **168 px** (2,625×) a **192 px** (3×) | densidades comuns de Android |
| Ampliação do PNG inteiro | **1,05× a 1,20×** | 160 px → 168-192 px |
| Ampliação do rosto | **≈1,4× a 1,6×** | o rosto ocupa ~110-120 px dos 160 |
| Ampliação com o toque | **até 1,38×** | `scale` 1,15 na animação (`fab.tsx:78`) |
| Peso do arquivo | 55,3 KB para 160×160 | ≈2,2 bytes por pixel — PNG **não otimizado** |

Ou seja: o app exibe um retrato de **~51 dp de resolução** num círculo de **64 dp**, com ampliação extra na animação. O resultado é exatamente o que se vê no celular: contorno macio, olhos "borrados" e o anel magenta serrilhado.

**Agravantes visuais** (independentes da resolução):

1. **Anel duplicado** — o PNG já traz o anel magenta do mockup; ele é desenhado por cima do gradiente ciano→magenta e dentro de outro anel rosa pulsante (`fab.tsx:111`). São três molduras concêntricas onde o mockup tem uma.
2. **`resizeMode="cover"`** num quadro de 64 dp (`fab.tsx:119`) — em qualquer densidade diferente de 1 o bitmap é reescalado de novo.
3. **A arte em si é um retrato estilizado de ~50 dp** — detalhe de olhos/boca existe em poucos pixels; nenhuma interpolação recupera isso.
4. **Filtros não resolvem** — `blur`, `sharpen` ou upscale por IA só mudam o tipo de artefato. A única correção é **entregar o retrato em alta**.

---

## 5. O que foi implementado (e está bom)

O app **não é um esqueleto**: existe um design system Neon real, com tokens, componentes e movimento. O que falta é **conteúdo gráfico e tipografia**, não estrutura.

### 5.1 Tokens

| Token | Valor | Arquivo |
| --- | --- | --- |
| Ciano de marca | `#00E5FF` | `lib/_core/theme.ts` (paleta `neon`) |
| Fundo profundo | `#080A12` | idem |
| Superfície / borda | `#101522` / `#202B40` | idem |
| Texto / texto suave | `#F4F7FF` / `#91A0B8` | idem |
| Magenta de destaque | `#E34BFF` | idem |
| Raios | base 20 px + variantes | `lib/theme-runtime.ts` |
| Gradientes nomeados | `brand` (100°), `brandSteep` (140°), `panel` (145°), `hero` (135°), `activeNav` (100°), `bubbleMe` (100°) | `lib/theme-runtime.ts` |
| Movimento | `--transition .25s` + `fadeUp` | `lib/theme-runtime.ts`, `components/neon/reveal.tsx` |

### 5.2 Componentes (`components/academic/design-system.tsx`)

`academicColors`, `useAcademicPalette`, `useAcademicColors`, `NeonGradient` (SVG multi-stop), `AcademicCard`, `AcademicSection`, `AcademicButton`, `AcademicPill`, `AcademicProgress`, `AcademicTab`, `NeonToggle`, `NeonBanner`, `AcademicEmptyState` — todos com `dark`/`light` e leitura do tema ativo.

### 5.3 Shell (`components/neon/`)

| Arquivo | O que entrega |
| --- | --- |
| `sidebar.tsx` | 245 px em telas ≥900 dp, colapsa em trilho; item ativo com `activeNav` + barra ciano |
| `topbar.tsx` | eyebrow ciano (11 px, letter-spacing 1,6, uppercase), saudação, botão de tema 40×40 |
| `fab.tsx` | FAB 64 dp, anel pulsante, rosto da Cris, `scale` 1,15 ao toque |
| `particles.tsx` | 40 partículas (2-5 px, 8-16 s, opacidade 0,15-0,4) |
| `pulse.tsx` / `reveal.tsx` | anel pulsante e entrada `fadeUp` |
| `nav-items.ts` | 6 páginas, ordem, rótulos, ícones e tamanhos (fonte única) |

### 5.4 Telas

- **6 abas** montadas: Hoje, Editor, Planejamento, Biblioteca, Conversas, Ajustes.
- **Telas de pilha**: matéria, perfil, flashcards, importar, documento, PDF, navegador, laboratório de código, ajustes de IA, ajustes de API, perfil da Cris.
- **Tema por horário**: 4 esquemas (Amanhecer/Oceano/Entardecer/Neon) + `auto`, com botão de ciclo no topbar.
- **Claro/escuro**: `theme-preference` com `auto | dark | light` persistido.

Para o que o HTML descrevia, a fidelidade é **alta**: larguras, raios, espaçamentos, gradientes e transições batem com `.card`, `.topbar`, `.bottomnav`, `.fab` e `.tabs`. O problema está no que o HTML **não** descrevia.

---

## 6. O que não foi implementado

### 6.1 Gráficos e widgets dos mockups

| Item do mockup | Onde aparece | O que o app tem hoje | Impacto |
| --- | --- | --- | --- |
| **Donut de progresso "20%"** (anel ciano + trilho escuro + número central) | `Mockup (1).png`, `outras telas.png`, `4 telas.jpeg` | `AcademicProgress` **linear** (barra) — `app/(tabs)/index.tsx` | 🔴 alto: é o elemento mais identitário da tela "Hoje" |
| **Gráfico de barras "Progresso de estudo"** (8 barras em gradiente) | `outras telas.png` | não existe | 🟠 médio |
| **Cartão-gradiente rosa** com avatar e números | `outras telas.png`, `4 telas` | `AcademicCard` neutro | 🟠 médio |
| **Calendário** com cabeçalho em gradiente ciano e dias circulados em gradiente | `outras telas.png` | cartão comum com dias | 🟡 baixo/médio |
| **Stat cards** com ícone em pílula colorida | todas as telas "Hoje" | existem, com pílula chapada | 🟢 baixo |

### 6.2 Identidade e tipografia

| Item | Mockup | App | Impacto |
| --- | --- | --- | --- |
| **Títulos serifados com gradiente** ("Hoje", "Cris", "Bem-vindo") | sim | Inter 700/800 sem serifa | 🔴 alto: muda o "tom" da marca |
| **Logo "C" neon com caderno** | `Mockup logo.png` | quadrado com gradiente + letra `C` desenhada em texto (`sidebar.tsx`) | 🔴 alto |
| **Retrato da Cris na Home / topbar** | foto em círculo com anel, em todas as telas | Home: círculo com **iniciais em texto** (`index.tsx:484-485`); topbar: **nenhum retrato** — só 3 botões com emoji | 🟠 médio |
| **Ícones próprios** (casa com telhado, caneta, camadas, livro aberto, balão, sparkle, capelo) | sim | `MaterialIcons` genéricos | 🟠 médio |
| **Fundo de nebulosa** (planetas, arcos de luz, estrelas de 4 pontas) | sim | `#080A12` liso + 40 bolinhas | 🟠 médio |

### 6.3 Telas ausentes ou fora do padrão

| Tela | Situação |
| --- | --- |
| **Login / cadastro** (`Mockup tela de loguin.png`: capelo, "Estude com mais foco", Entrar, **Entrar com Google**) | 🔴 **não existe**. O app autentica dentro da aba Conversas (`chat.tsx`), com e-mail/senha e **sem Google**. Não há rota `login`. |
| **Conversas** (`app/(tabs)/chat.tsx`) | 🔴 **fora do design system**: 44 `className` das classes antigas (`bg-lavender`, `surface`, `text-foreground`…), **zero** componentes Neon. Visualmente é outro app. |
| **Callback / confirmação** | 🟡 `callback.tsx` (7 classes antigas) e `confirm.tsx` (9) seguem o padrão antigo. |
| **Configuração de IA** (`Mockup 3 telas demonstração.png`) | 🟡 as telas existem (`ai-settings`, `api-settings`), mas em layout Neon genérico — sem o grid de cartões de provedor, o seletor de temperatura e a grade "Modelo apontado" do mockup. |
| **Perfil da Cris** | 🟡 existe (`cris-profile`), sem a composição "Sobre mim" do mockup. |
| **Splash** | 🔴 usa o splash nativo com o ícone Expo; o mockup pede logo + gradiente. |
| **Variações de tema** (Manhã/Tarde/Noite/Madrugada + 7 telas no claro) | 🟡 há 4 esquemas e claro/escuro, mas não as composições exatas das duas pranchas. |
| **FAB com rótulo** (pílula "✧ Cris" / FAB com badge de capelo) | 🟡 o app usa círculo de 64 dp só com o rosto. |
| **Popup da Cris** | 🟢 existe e é funcional (`components/cris-popup.tsx`), mas em `StyleSheet` próprio, sem borda em gradiente e sem os chips do mockup. |

---

## 7. Identidade nativa (ícone, splash, fontes)

### 7.1 O app ainda se apresenta como template

Configuração atual (`app.config.ts:88-92` e bloco `splash`):

```ts
icon: "./assets/images/icon.png",              // ← livro azul + check verde do Expo
android: { adaptiveIcon: { backgroundColor: "#E6F4FE" } }   // ← azul-claro do template
splash: { image: "./assets/images/splash-icon.png", imageWidth: 200,
          resizeMode: "contain", backgroundColor: "#ffffff" }
```

| Item | Deveria ser (mockup) | É hoje |
| --- | --- | --- |
| Ícone do app | "C" neon + caderno em fundo `#080A12` | livro/check do **Expo** (mesmo MD5 em 3 arquivos) |
| `adaptiveIcon.backgroundColor` | `#080A12` | `#E6F4FE` (azul-claro do template) |
| Foreground do ícone adaptativo | logo com 66% de zona segura | imagem do Expo **sem margem** (pode ser cortada) |
| Monocromo (tema escuro do Android 13+) | silhueta do "C"/caderno | letra "A" cinza do Expo |
| Splash | logo neon sobre `#080A12` (gradiente só se a Dolla fornecer o fundo) | ícone do Expo, `200 px`, fundo **branco puro** |
| `favicon.png` | logo Dolla | arte do Expo em 192 px |
| Ícone da web | `logoUrl` | `"/manus-storage/estudo-organizado-icon_edcd5289.png"` — **caminho morto**, não existe no repositório (`app.config.ts:70`) |

E o logo **em tela** também não é imagem: a sidebar desenha um quadrado `NeonGradient` com a letra `C` em texto (`sidebar.tsx:80-95`). Ou seja, **não existe nenhum arquivo de logo Dolla em uso no app** — e existe um (`Mockup logo.png`, 2048×2048) que nunca foi ligado.

### 7.2 Fontes

O que existe e funciona bem: **Inter em 4 pesos**, empacotada e carregada antes da primeira pintura (`app/_layout.tsx:26-31`, `useFonts`), exposta como `neonFonts` (`theme-runtime.ts:160-165`): `Inter_400Regular`, `Inter_600SemiBold`, `Inter_700Bold`, `Inter_800ExtraBold`.

O que falta:

- **Nenhuma serifada/display.** Os mockups usam títulos com serifa e gradiente ("Hoje", "Cris", "Bem-vindo"); o app usa `Inter_800ExtraBold`. É a diferença visual mais perceptível entre app e prancha.
- **Nenhum `assets/fonts/`** — tudo vem de pacote. Se a Dolla mandar uma fonte própria (licenciada), é preciso adicionar em `assets/fonts/` + `useFonts` em `app/_layout.tsx` + regenerar o prebuild.
- **O HTML não resolve isso**: ele é `Inter` puro (`cris-mockup2.html:39`). A serifada **só existe nas imagens**, sem nome, sem pesos, sem licença. Isso não é deduzível — precisa ser entregue.

### 7.3 Custo dos mockups no repositório

São **42,5 MB** de PNG/JPEG dentro de `assets/images/`. Eles **não entram no APK/AAB** (Metro só empacota o que é `require`-ado — hoje, um único PNG de 55 KB), mas entram em **todo clone, todo CI e todo deploy da branch `gh-pages`**. Para uma auditoria isso é aceitável; como prática permanente, o ideal é `docs/design/` com versões recomprimidas (JPEG/WebP em qualidade ~82) e os originais fora do git.

---

## 8. O que a Dolla precisa entregar

Para sair de "parecido" para **fiel e nítido**, esta é a lista mínima. Cada item diz **o formato exato** que o React Native/Expo consome.

### 8.1 Prioridade 1 — o que o usuário vê no primeiro segundo

| # | Entrega | Especificação técnica | Por que |
| --- | --- | --- | --- |
| 1 | **Retrato da Cris** | `cris-portrait.svg` (vetor, se a arte permitir) **+** `cris-portrait-1024.png` e `cris-portrait-2048.png`, **fundo transparente**, enquadramento busto, **sem anel/moldura** — a moldura é do app. Opcional: 3 expressões (neutra, atenta, comemorando) | elimina a pixelização na raiz (§4) e permite usar no FAB, no topbar, no perfil e no cartão da mentora |
| 2 | **Logo (símbolo)** | `logo-mark.svg` (colorido, viewBox 0 0 1024 1024) + `logo-mark-mono.svg` (1 cor) + PNG 1024/512 com **fundo transparente** | vira `icon.png`, `android-icon-monochrome.png`, logo da sidebar e favicon |
| 3 | **Ícone do app (pronto para loja)** | PNG **1024×1024** sem transparência (Play Store), foreground do adaptativo **1024×1024** com o símbolo dentro de **66% centrais**, `backgroundColor: #080A12` | hoje o app é publicado com a cara do Expo (§7.1) |
| 4 | **Splash** | PNG **512×512** transparente do logo (o Expo escala via `imageWidth`) + cor de fundo `#080A12`; se quiser gradiente, **imagem de fundo 1242×2688** | `expo-splash-screen` só aceita imagem + cor; gradiente exige imagem de fundo |
| 5 | **Fonte display (serifada)** | Nome + **licença** (Google Fonts? Adobe? própria) + arquivos `.ttf`/`.otf` de **todos os pesos usados** (ex.: 600/700) + itálicas se houver + valores de `letter-spacing` e `line-height` por tamanho | sem isso os títulos **nunca** vão bater (§7.2) |
| 6 | **Confirmação da paleta** | HEX de: ciano de marca, magenta, fundo, superfície, borda, texto, texto suave, sucesso/alerta/erro — mais os **pares de contraste AA** | o app já usa `#00E5FF`/`#080A12`/`#E34BFF`; falta a Dolla **validar** como oficial |

### 8.2 Prioridade 2 — o que dá o "acabamento" Dolla

| # | Entrega | Especificação técnica | Por que |
| --- | --- | --- | --- |
| 7 | **Pacote de ícones** | SVG, grade **24×24**, traço **1,75-2 px**, cantos arredondados, `stroke="currentColor"` (para herdar a cor do tema), 2 variantes: outline e preenchido. Conjunto mínimo (16): casa, nota/editor, gráfico, livro, conversa, engrenagem, documento, cartão/flashcard, importar, camadas/matéria, pessoa, sparkle IA, capelo, calendário, alvo, busca — mais `close`, `check`, `chevron`, `trash`, `lightbulb` | hoje são `MaterialIcons` genéricos. O app já centraliza isso em **`IconSymbol`** (`components/ui/icon-symbol.tsx` + `icon-symbol.ios.tsx`), que mapeia nomes tipo `house.fill` → Material: **trocar o pacote é mexer em 2 arquivos** |
| 8 | **Fundo do app** | PNG **1080×2340** e **1440×3120** (ou `@2x`/`@3x`), **em camadas separadas**: `bg-nebula.png` (estática) + `bg-stars.png` (tileável, para parallax) + opcional `bg-arcs.svg`. Uma versão por esquema de tema (Neon, Amanhecer, Entardecer, Oceano) | o app tem `#080A12` liso + 40 bolinhas; o mockup tem nebulosa, planetas e arcos de luz |
| 9 | **Donut de progresso** | SVG do anel (`donut-bg.svg` + `donut-progress.svg`) **ou** spec numérica: diâmetro, espessura, `stroke-linecap`, ângulo inicial (ex.: -90°), gradiente (stops), animação de entrada | é o widget mais identitário da tela "Hoje" e o app só tem barra linear (§6.1) |
| 10 | **Gráfico de barras** | Spec: 8 séries, largura, raio do topo, gradiente por barra, eixo, rótulos | existe no mockup `outras telas.png`, não existe no app |
| 11 | **Cartão-gradiente rosa + ilustrações** | PNG/SVG dos elementos soltos (avatar decorativo, brilhos, "confete") e o gradiente do cartão (stops + ângulo) | o app usa `AcademicCard` neutro no lugar |
| 12 | **Estados e micro-ilustrações** | Empty states, erro, sucesso, offline (SVG 240×240) | `AcademicEmptyState` hoje usa ícone + texto |
| 13 | **Tela de login** | Asset do capelo/ilustração (SVG/PNG transparente) + confirmação do layout (`Mockup tela de loguin.png`); se houver login Google, **credenciais OAuth** e o fluxo | a tela **não existe** no app (§6.3) |

### 8.3 Prioridade 3 — telas e handoff

| # | Entrega | Especificação |
| --- | --- | --- |
| 14 | **Configuração de IA** | Layout dos cartões de provedor, seletor de temperatura e grade "Modelo apontado" (`Mockup 3 telas demonstração.png`) — como Figma com medidas, ou SVG das peças |
| 15 | **Perfil "Sobre mim" da Cris** | Composição + textos definitivos (o mockup tem texto inventado por IA) |
| 16 | **Figma organizado** | 1 página por prancha, **estilos de cor e texto nomeados**, componentes, e export `1x/2x/3x` |
| 17 | **Clean plates** | As mesmas telas **sem texto e sem ícones** (só fundo + cards), para servir de referência de composição sem o ruído do texto gerado por IA |
| 18 | **Licença de uso** | Direito de uso comercial do retrato da Cris e do logo; se a arte é gerada por IA, a declaração de ferramenta/termos |

### 8.4 Como entregar (para não haver retrabalho)

```
assets/brand/                 ← nova pasta, versionada
├── logo-mark.svg             (colorido, viewBox 1024)
├── logo-mark-mono.svg        (1 cor)
├── logo-mark-1024.png        (sem transparência, loja)
├── logo-foreground-1024.png  (adaptativo, símbolo em 66%)
├── logo-splash-512.png       (transparente)
├── cris-portrait-1024.png    (transparente, sem anel)
├── cris-portrait-2048.png
├── cris-portrait.svg         (se a arte permitir)
├── icons/                    (24×24, outline + filled, SVG otimizado)
├── backgrounds/              (bg-nebula-1080x2340.png, bg-stars-tile.png, …)
└── fonts/                    (formato .ttf/.otf + LICENÇA.txt)
```

Regras que evitam 90% dos problemas:

1. **SVG antes de PNG** — `react-native-svg` já está no projeto; vetor resolve densidade de tela de uma vez.
2. **PNG só quando houver gradiente/foto**, sempre em `@1x/@2x/@3x` ou um único arquivo grande (o RN reduz, não amplia).
3. **Nada de moldura embutida** no retrato/logo — anel, glow e sombra são do app (foi exatamente isso que gerou o anel triplo, §4).
4. **Transparência de verdade** (alpha), não fundo preto chapado.
5. **SVG otimizado** (SVGO) e PNG com `pngquant`/`oxipng` — o `cris-avatar.png` atual gasta 55 KB para 160 px (2,2 bytes/pixel), sinal claro de compressão folgada.
6. **Nomear com o destino final** (`logo-splash-512.png`), não com o nome da prancha (`Mockup logo.png`).

---

## 9. Perguntas que só a Dolla pode responder

1. **Retrato da Cris** — existe o **original em alta** (≥2048 px) ou o vetor? A arte é render 3D, ilustração vetorial ou foto tratada? Pode ser reentregue **sem o anel magenta** e com fundo transparente?
2. **Fonte dos títulos** — qual é o nome exato da serifada das pranchas, quais pesos são usados e qual a licença (Google Fonts, Adobe, própria)? Ou a intenção era Inter mesmo (como no HTML) e as pranchas estão desatualizadas?
3. **Logo** — o símbolo oficial é o **"C" com caderno** (`Mockup logo.png`) ou o **capelo + "Cris"** da tela de login? Existe versão vetorial monocromática?
4. **Paleta** — `#00E5FF` / `#080A12` / `#E34BFF` estão aprovados como oficiais? Nas pranchas de **modo claro** o fundo é outro: qual o HEX correto de cada superfície clara?
5. **Login** — "Entrar com Google" faz parte do MVP (aparece na prancha **e** no CSS do HTML) ou o login por e-mail/senha atual basta? Se sim, há credenciais OAuth?
6. **Conteúdo** — os textos das pranchas são **placeholder** (o texto está embaralhado por serem imagens geradas por IA). Quem entrega a copy final de "Sobre mim", dos nomes de matérias e dos cards?
7. **Donut "20%"** — o número é progresso real (calculado de tarefas/conteúdos) ou ilustrativo? Qual a regra de cálculo?

---

## 10. O que acontece quando os assets chegarem (esforço estimado)

| Bloco | Depende de | Esforço | Arquivos tocados |
| --- | --- | --- | --- |
| Ícone, adaptativo, monocromo, favicon | §8.1 #2-3 | ~30 min | `app.config.ts`, `assets/images/*` |
| Splash com fundo `#080A12` | §8.1 #4 | ~30 min | `app.config.ts` |
| Retrato em FAB, topbar, perfil, cartão da mentora | §8.1 #1 | 2-3 h | `fab.tsx`, `topbar.tsx`, `profile.tsx`, `design-system.tsx` |
| Fonte display (nova família) | §8.1 #5 | 2-4 h + rebuild nativo | `app/_layout.tsx`, `lib/theme-runtime.ts`, `app.config.ts` (plugin) |
| Donut + gráfico de barras | §8.2 #9-10 | 6-10 h | novo `components/neon/donut.tsx`, `index.tsx` |
| Fundo em camadas com parallax | §8.2 #8 | 4-6 h | `particles.tsx`, novo `background.tsx` |
| Pacote de ícones próprio | §8.2 #7 | 4-6 h | **2** arquivos: `icon-symbol.ios.tsx` + `icon-symbol.tsx` |
| Migrar **Conversas** para o Neon | — (não depende de asset) | 8-12 h | `app/(tabs)/chat.tsx`, `callback.tsx`, `confirm.tsx` |
| Tela de login | §8.2 #13 + OAuth | 10-16 h | nova rota `app/login.tsx`, backend |
| Telas de IA/Cris conforme prancha | §8.3 #14-15 | 6-10 h | `ai-settings.tsx`, `api-settings.tsx`, `cris-profile.tsx` |

> Dois itens **não dependem de nada da Dolla** e já poderiam ser feitos: migrar `chat.tsx` para o design system (§6.3) e implementar o donut como componente próprio (o visual está claro nas pranchas: anel ciano sobre trilho escuro, número central).

---

## 11. Anexo — metodologia e reprodutibilidade

### 11.1 Como a origem do avatar foi provada

1. Lido `assets/images/cris-avatar.png` (160×160, RGBA).
2. Para cada uma das 10 pranchas, recortada a região `(677, 777, 160, 160)`.
3. Comparados **somente os pixels com alpha > 0** do avatar (19.292 px) com o recorte correspondente, calculando: **MAD** (diferença média absoluta por canal), **quantos pixels são exatamente iguais** e **maior diferença**.
4. Resultado: **MAD 0,00 / 19.292 de 19.292 exatos / máximo 0** apenas contra `Ajustes Cris Mockup 1 tela desmonstração.png`; todas as outras pranchas ficaram entre MAD 51 e 87.

Scripts usados (fora do repositório, em `%TEMP%\dolla-audit\`): `CrisMatcher.cs` (busca a região do anel magenta em cada prancha) e `AvatarDiff.cs` (compara o PNG com a região de cada prancha). Nada foi adicionado ao projeto.

### 11.2 Inventário verificado

- Dimensões e pesos lidos por `System.Drawing` / `Get-ChildItem`.
- Duplicidade dos assets do Expo confirmada por **MD5 idêntico** (`035A78C8C6…`) em `icon.png`, `splash-icon.png` e `android-icon-foreground.png`.
- Uso de assets confirmado por busca textual por `require(`, `assets/images` e `import` em `app/`, `components/`, `lib/`, `server/`.

### 11.3 Escopo

- **Somente leitura de código.** Nenhum arquivo `.ts`/`.tsx`/`.json`/config foi modificado.
- O único arquivo adicionado é este `RELATORIO_DESIGN.md`.
- Os 42,5 MB de pranchas permanecem no repositório, sem otimização.

---

*Relatório gerado a partir de auditoria manual + verificação pixel a pixel. Números de linha citados referem-se ao commit `8832539` da branch `gh-pages`.*







