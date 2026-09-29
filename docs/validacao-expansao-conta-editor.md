# Validação da expansão de Editor e conta

Data da validação: 28 de agosto de 2026.

| Item | Resultado |
|---|---|
| Exportação web | Concluída com `.nojekyll` e caminhos `/-App-Estudo-Organizado/_expo/` |
| Commit publicado | `afb6c08` na branch `gh-pages` |
| Estado do GitHub Pages | `built` |
| HTML público de `/document` | Contém a nova seção “Formatação do texto”, com Negrito, Itálico, Lista e Numerada |
| Navegador conectado | Exibiu a barra antiga mesmo após recarga forçada, indicando cache de pacote no navegador conectado; o HTML extraído da URL pública confirmou a versão nova |
| Perfil público | A rota `/profile` abriu corretamente, apresentando o estado seguro para entrar antes de editar informações de conta |
| Configurações públicas | A rota `/settings` exibiu visualmente Conta e acesso, atalhos de perfil/recuperação, escolhas de tema e ações de conteúdo |
| Chat público | Exibiu visualmente Criar conta, Entrar, Esqueci minha senha e Esqueci meu e-mail, com botões textuais acessíveis |
| Revisão final do documento no navegador conectado | Continuou exibindo a barra anterior somente nessa rota; a extração direta da mesma URL confirma que a resposta pública contém a barra nova, o que caracteriza cache local específico da página/documento |

Não foi solicitado envio de e-mail de recuperação durante a validação, portanto nenhuma conta da Cris foi alterada nem recebeu mensagem de teste.
