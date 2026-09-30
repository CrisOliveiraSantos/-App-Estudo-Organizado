# Auditoria — Estudo Organizado
Data: 2026-09-29

Escopo: análise estática do repositório. Chat, editor, IA e temas não foram alterados. A integração Moodle permanece inativa.

Validação: os diagnósticos do editor não apontaram erros. `pnpm check` e auditoria automatizada de dependências não puderam ser executados porque `pnpm`/Node não estão disponíveis.

Correções de segurança aplicadas antes deste relatório: `.env` removido do rastreamento, logs sensíveis saneados e allowlist HTTPS `.edu.br`/`.edu` adicionada ao Moodle.

## 🔴 CRÍTICO (quebra o app ou expõe dados)
- Nenhum achado crítico pendente identificado nesta revisão estática.

## 🟠 ALTO
- Token Moodle na query string: `wstoken` é enviado na URL de cada chamada. O código do app não registra essa URL, mas logs de proxy, servidor web ou Moodle podem registrar query strings — `server/academic.ts:18` — verificar suporte a autenticação por header na instalação Moodle ou configurar redação de `wstoken` em toda a infraestrutura.

## 🟡 MÉDIO
- Dados locais sem criptografia em repouso: o estado persistido inclui notas, conteúdo e referências de imagens/PDF em AsyncStorage — `lib/study-store.tsx:227` — avaliar armazenamento criptografado para conteúdo privado.
- Dados Web acessíveis a JavaScript: o perfil fica em `localStorage` e o token acadêmico em `sessionStorage` — `lib/_core/auth.ts:78`, `lib/academic-credentials.ts:10` — minimizar dados pessoais e preferir sessão HttpOnly quando viável.
- Integridade e desempenho do banco: schema não declara FKs nem índices para `local_sessions.accountId` e `chat_messages.room/senderId/recipientId/createdAt`; `relations.ts` está vazio e as consultas ordenam/filtram essas colunas — `drizzle/schema.ts:37`, `drizzle/schema.ts:45`, `drizzle/relations.ts:1`, `server/db.ts:62` — adicionar relações, FKs e índices compostos. As migrations existentes correspondem às tabelas atuais.
- Alvos de toque pequenos: a busca encontrou 30 estilos com `minHeight` abaixo de 40 dp; parte é decorativa, mas vários são ações, filtros ou campos — `components/academic/design-system.tsx:78`, `app/document.tsx:160`, `app/(tabs)/planning.tsx:88` — revisar controles interativos para alvo mínimo de 44 dp. Chat/editor não foram alterados.
- Contraste de alerta insuficiente: texto `#B67500` sobre `#FFF5DE` mede 3,50:1, abaixo de 4,5:1 para texto normal — `components/academic/design-system.tsx:28` — escurecer o texto ou clarear o fundo em revisão futura de tema.
- Falha de persistência silenciosa: erros do `AsyncStorage.setItem` são descartados, podendo perder alterações após recarregar sem avisar — `lib/study-store.tsx:227` — apresentar estado de erro e opção de repetição.
- Teste de logout desativado: `auth.logout` está implementado, mas seu teste está em `describe.skip` — `tests/auth.logout.test.ts:45` — reativar e corrigir o teste.
- Prévia PDF Web limitada: a variante Web mostra uma mensagem em vez de renderizar o PDF — `components/native-pdf-viewer.web.tsx:3` — implementar um visualizador Web ou manter a limitação claramente indicada.
- Imagens sem descrição alternativa: imagens de documento e páginas PDF não expõem texto alternativo — `app/document.tsx:123`, `app/pdf.tsx:28` — fornecer rótulo ou descrição acessível.
- Sincronização Moodle sequencial: a importação percorre até 30 cursos e faz uma chamada remota por curso — `server/academic.ts:82` — quando ativada, avaliar endpoint em lote, concorrência limitada e timeout.

## 🟢 BAIXO
- Componentes possivelmente órfãos e dependência sem uso direto: `HelloWave`, `ParallaxScrollView`, `ExternalLink`, `Collapsible` não têm referências de uso no código-fonte; `expo-image` está declarado sem import detectado — `components/hello-wave.tsx:3`, `components/parallax-scroll-view.tsx:24`, `components/external-link.tsx:7`, `components/ui/collapsible.tsx:7`, `package.json:46` — confirmar antes de remover.
- Artefatos Web grandes: bundle JavaScript tem cerca de 3,1 MB e o source map cerca de 10,3 MB, duplicados entre `_expo/` e `dist-github-pages/` — `dist-github-pages/_expo/static/js/web/entry-270335d8726c6ebd7e83df05ffbbd1fc.js:1` — revisar source maps públicos e evitar manter cópias geradas duplicadas se o fluxo permitir.
- Verificação de vulnerabilidades pendente: versões estão fixadas no `pnpm-lock.yaml`, mas não foi possível executar auditoria do registry sem Node/pnpm — `package.json:100` — executar `pnpm audit` em ambiente com a ferramenta disponível.

## 📊 RESUMO
- Total de problemas: 14
- Críticos: 0 | Altos: 1 | Médios: 10 | Baixos: 3
- Próximos passos sugeridos (em ordem de prioridade):
  1. Evitar exposição do `wstoken` em logs de infraestrutura ou usar header se suportado pelo Moodle.
  2. Proteger dados locais e falhas de persistência; adicionar FKs e índices.
  3. Corrigir alvos de toque, contraste e descrições de imagens.
  4. Reativar o teste de logout e decidir o suporte de PDF Web.
  5. Executar `pnpm check`, testes e auditoria de vulnerabilidades num ambiente com Node/pnpm.
  6. Confirmar componentes/dependências órfãos e revisar tamanho dos artefatos publicados.