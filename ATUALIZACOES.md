# Atualizações

## 2026-09-29
- Reset para o commit 627d9bf para recuperar Chat, editor de código e IA que foram regredidos nos commits posteriores.
- Segurança: .env removido do rastreamento; .env.example criado como documentação.
- Auditoria completa iniciada conforme solicitado; findings serão consolidados em AUDITORIA.md.
- 2026-09-29 23:37 -03:00 — Correção de logs sensíveis em `lib/_core/auth.ts`, `lib/_core/api.ts`, `hooks/use-auth.ts`, `app/oauth/callback.tsx`, `server/_core/oauth.ts`, `server/_core/sdk.ts`, `server/_core/storageProxy.ts`, `server/_core/notification.ts` e `server/db.ts`: removidos fragmentos de tokens/códigos OAuth, valores de cookies e cabeçalhos, URLs com parâmetros de autenticação, objetos de usuário e detalhes brutos de erro/resposta; mantidos logs informativos sem dados sensíveis.
- 2026-09-29 — Segurança Moodle: restringidos os hosts a domínios `.edu.br`/`.edu` antes da chamada, mantendo HTTPS e sem registrar o token.
- 2026-09-29 — Auditoria concluída; relatório completo criado em `AUDITORIA.md` com achados de segurança, qualidade, funcionalidades, desempenho, acessibilidade, banco, plataformas e dependências.
- 2026-09-30 — Fase 1 do Monaco: dependências `monaco-editor` e `@monaco-editor/react` confirmadas no `package.json`; criados os wrappers Web/native e a tela isolada `app/dev/monaco-lab.tsx`. Teste manual pendente: executar `npx expo start --web --port 8081` e abrir `/dev/monaco-lab`.
- 2026-09-30 — Fase 2 do Monaco: substituído somente o campo de edição do Espaço Código pelo componente Monaco; Play, persistência, troca de arquivos, Terminal Cris e Chat Cris mantidos. Teste manual pendente em `/code`.
