# Atualizações

## 2026-09-29
- Reset para o commit 627d9bf para recuperar Chat, editor de código e IA que foram regredidos nos commits posteriores.
- Segurança: .env removido do rastreamento; .env.example criado como documentação.
- Auditoria completa iniciada conforme solicitado; findings serão consolidados em AUDITORIA.md.
- 2026-09-29 23:37 -03:00 — Correção de logs sensíveis em `lib/_core/auth.ts`, `lib/_core/api.ts`, `hooks/use-auth.ts`, `app/oauth/callback.tsx`, `server/_core/oauth.ts`, `server/_core/sdk.ts`, `server/_core/storageProxy.ts`, `server/_core/notification.ts` e `server/db.ts`: removidos fragmentos de tokens/códigos OAuth, valores de cookies e cabeçalhos, URLs com parâmetros de autenticação, objetos de usuário e detalhes brutos de erro/resposta; mantidos logs informativos sem dados sensíveis.
- 2026-09-29 — Segurança Moodle: restringidos os hosts a domínios `.edu.br`/`.edu` antes da chamada, mantendo HTTPS e sem registrar o token.
