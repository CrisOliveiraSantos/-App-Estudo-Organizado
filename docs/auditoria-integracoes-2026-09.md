# Auditoria de integrações do Estudo Organizado

**Data da auditoria:** 15 de setembro de 2026  
**Escopo:** Editor de Código, Sandbox, IA Cris, notificações, Supabase, GitHub Pages e divergência com o aplicativo físico.

## Conclusão executiva

A verificação confirmou que o projeto-fonte atual contém uma primeira interface funcional do **Espaço Código**, com editor local, autosave, terminal educacional simulado e painel visual da Cris. Entretanto, a versão física examinada pela usuária pode estar baseada em um build anterior, e a branch pública `gh-pages` do GitHub ainda está no commit `7f251ed`, anterior ao checkpoint atual `c2254e7f`. Portanto, a ausência do Editor de Código no tablet é explicável por divergência de distribuição; não significa que a tela não exista no projeto-fonte atual.

Também foi confirmado que **notificações do dispositivo ainda não estão integradas**. O pacote `expo-notifications` está listado nas dependências, mas não há uso de APIs de permissão, token, agendamento ou recebimento no aplicativo, nem plugin correspondente no `app.config.ts`. O arquivo `server/_core/notification.ts` é uma integração de notificação interna do serviço do projeto, não uma implementação de notificações locais ou push para usuários do tablet.

## Matriz de prontidão

| Área | Estado comprovado | Limite atual |
|---|---|---|
| Editor de Código | Interface existe em `app/code.tsx`; rota registrada; atalho na Home; autosave local | Não foi comprovado no APK físico; destaque de sintaxe avançado, abas e execução real ainda não estão completos |
| Terminal | Sandbox lógica em `lib/code-workspace.ts`; comandos permitidos `help`, `pwd`, `ls`, `cat`, `clear` e `status`; sem shell real | No modo web e no MVP atual, não executa JavaScript/TypeScript nem processos do Android |
| IA Cris | Painel visual, ações de explicar, ideias, testes e revisão; configurações persistentes de privacidade, energia, armazenamento e Wi-Fi | Não há modelo local carregado; as respostas atuais são interface/regras preparatórias, não inferência de LLM |
| IA GGUF/llama.cpp | Não integrada | Não há runtime nativo, módulo Expo, modelo GGUF, download ou Development Build específico |
| Notificações | Dependência instalada e seção visual em Configurações | Não há solicitação de permissão, agendamento, listener, token push ou teste de recebimento |
| Supabase Auth/Chat/Realtime | Cliente, autenticação, mensagens e sincronização aparecem implementados no código existente | O teste multiusuário físico e a persistência em dispositivo real ainda precisam ser confirmados pela usuária |
| GitHub | Repositório público existe e o CLI está autenticado; a branch `gh-pages` está configurada | `gh-pages` ainda aponta para `7f251ed`, enquanto o código atual está em `c2254e7f`; o Editor de Código não foi publicado nessa branch |
| APK/Development Build | Não há diretórios nativos `android/` ou `ios/` no repositório auditado | Não é possível concluir que o APK físico contenha as alterações do checkpoint atual sem reinstalar um build atualizado |

## Evidências principais

O projeto atual contém os arquivos `app/code.tsx`, `app/ai-settings.tsx`, `lib/code-workspace.ts` e `tests/code-workspace.test.ts`. A rota `code` está registrada no layout raiz e a Home possui o atalho “Espaço Código · Cris”. A tela foi renderizada com sucesso na prévia web e os controles ficaram visíveis.

A Sandbox atual é deliberadamente limitada. Ela não chama `child_process`, não abre shell do sistema, não acessa rede, não acessa segredos e não executa código arbitrário. Isso é uma característica de segurança, mas também significa que o termo “terminal” ainda representa um terminal educacional simulado, não um ambiente de compilação e execução.

A validação automatizada atual passou em **23 testes**, com **1 teste legado pulado**, e `pnpm check` não apresentou erros. O lint não apresentou erros; permanece apenas o aviso conhecido sobre `MODULE_TYPELESS_PACKAGE_JSON` no arquivo de configuração do ESLint.

## Diagnóstico da ausência no tablet

A causa mais provável é a versão instalada no tablet não corresponder ao código atual. O projeto-fonte está no checkpoint `c2254e7f`, mas a branch pública `gh-pages` consultada está em `7f251ed`. Além disso, a existência de uma tela no projeto Expo não atualiza automaticamente um APK já instalado. É necessário gerar e instalar um novo Development Build ou APK contendo a rota e os arquivos atuais.

Não foi possível inspecionar diretamente a versão instalada no Galaxy Tab A9+ a partir do ambiente de desenvolvimento. Para confirmar o diagnóstico fisicamente, é necessário comparar a versão exibida em **Configurações > Sobre** do aplicativo ou instalar o build atualizado e abrir o atalho “Espaço Código · Cris” na Home.

## O que ainda precisa ser feito

A próxima etapa técnica deve publicar o artefato web atual na branch `gh-pages` e, separadamente, preparar um Development Build Android. Depois disso, deve ser implementado o módulo de notificações real, com permissão, agendamento local, tratamento em primeiro plano e teste no tablet.

A IA local deve permanecer separada até existir um runtime Android validado. O painel atual não deve ser apresentado como IA funcionando offline. A integração GGUF exigirá um módulo nativo, gerenciamento de download e armazenamento, cancelamento, limite de memória, estados de erro e testes de desempenho. A presença da Cris no Chat geral ou privado também não deve ser adicionada enquanto a exigência de proteção absoluta do Chat permanecer vigente.

## Recomendações imediatas

1. Publicar o checkpoint `c2254e7f` na branch `gh-pages` e validar a rota pública `/code`.
2. Gerar um Development Build Android novo e instalar no Galaxy Tab A9+ antes de avaliar a presença do Editor.
3. Implementar notificações locais reais antes de prometer lembretes, sem misturar essa integração com a IA local.

## Rechecagem pública após a publicação `c7c8bb26`

A rechecagem com cache-busting confirmou HTTP 200 para `/`, `/code`, `/ai-settings` e `/editor`. Todas essas páginas referenciam o bundle `entry-71d596a04fb26193a1bf9c4b5ea419bd.js`. O JavaScript público contém os marcadores “Espaço Código”, “Sandbox protegida” e “IA local”. Portanto, a interface foi publicada.

A experiência não aparece como uma aba independente chamada “Editor de Código”. O acesso atual é um cartão chamado **Espaço Código · Cris** no topo da Home, e o terminal fica mais abaixo dentro da mesma tela. A IA local não está funcionando como modelo: a tela apenas apresenta a interface, ações preparatórias e o estado “GGUF compacto · ainda não instalado”.

Se a usuária abriu uma versão sem `?v=c7c8bb2`, o navegador pode ter mantido o bundle antigo. O acesso de verificação é `https://crisoliveirasantos.github.io/-App-Estudo-Organizado/code?v=c7c8bb26`; isso confirma a tela diretamente, mas não transforma a Sandbox em terminal real nem instala a IA local.
