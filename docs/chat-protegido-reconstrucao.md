# Proteção do Chat durante a reconstrução

Data de início da reconstrução: 28 de agosto de 2026.

O módulo de Chat é uma área protegida por solicitação explícita da Cris. Nesta reconstrução não serão alterados seus arquivos, componentes, estilos, navegação interna, banco, integrações, mensagens ou lógica.

| Arquivo protegido | Assinatura de referência SHA-256 |
|---|---|
| `app/(tabs)/chat.tsx` | `f82eba411e82fa4191c393a519d95e30b7c5deab0d52ec23f1ad752b16599996` |
| `lib/supabase-chat.ts` | `33e7acf813901b7ec19e1cee7765092130a4ffb551440e9014430e16b5310daa` |
| `lib/supabase.ts` | `75083d04cd4b1bd6e719eaadf68383f2e21e4f2ec75558893ff2c6c2c00d5d6e` |
| `lib/chat-utils.ts` | `2579f5661de6eac117881f703c9f82b3fbe36ed282e42059656418b94374fe49` |
| `lib/local-chat-auth.ts` | `150ad34dc45194e98a3566bbeff6e9eb41dee2c0f9d30215e79d60ca6b8194c0` |

O layout global das abas também não será modificado, pois ele engloba o acesso ao Chat. O redesenho ficará restrito às telas de Início, Editor, Biblioteca, Planejamento, Configurações e novas rotas acadêmicas. Antes da entrega, as assinaturas acima serão comparadas novamente para confirmar a preservação do Chat.
