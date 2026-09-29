# Achados públicos sobre o AVA do IF Sudeste MG

Data da verificação: 15 de setembro de 2026.

O endereço `https://ead.ifsudestemg.edu.br` redireciona para uma tela de login do Moodle em `https://ead.ifsudestemg.edu.br/login/index.php?loginredirect=1`. A própria tela informa que o acesso usa o mesmo usuário e senha do Sistema SIGAA; também informa que o usuário é o CPF, somente números, e que alterações de cadastro ou senha no SIGAA podem levar aproximadamente uma hora para sincronizar com o Moodle.

A tela apresenta um link público para o SIGAA institucional, que aponta para `https://sig.ifsudestemg.edu.br/sigaa/verTelaLogin.do`.

Conclusão inicial: a integração deve priorizar uma API/token oficial do Moodle ou um mecanismo institucional autorizado. Automatizar o preenchimento de usuário e senha ou raspar páginas autenticadas não deve ser a base do produto. O aplicativo deve oferecer conexão manual, armazenamento protegido de tokens quando autorizados, botão Atualizar agora e sincronização automática somente após confirmar que o serviço e a instituição permitem esse acesso.

## Fonte oficial do Moodle

A documentação oficial de desenvolvedores do Moodle descreve um framework completo de Web Services para sistemas externos e informa que o próprio Moodle Mobile usa esse framework. O fluxo público descrito é: autenticação com usuário e senha em um endpoint de login, emissão de um token de sessão, validação de permissão contra a API selecionada e chamada das funções autorizadas. A documentação também indica que a documentação específica da API de uma instalação fica em **Site administration > Server > Web services > API Documentation**.

Fonte: https://moodledev.io/docs/5.0/apis/subsystems/external

## Atualização da auditoria — 15/09/2026

A documentação oficial do Calendar API confirma que o Moodle possui eventos de calendário e action events associados a atividades e prazos, com visibilidade condicionada às permissões da usuária: https://moodledev.io/docs/5.3/apis/core/calendar.

O endpoint legado de referência de funções Moodle ficou protegido por CAPTCHA durante a consulta. Por isso, a implementação usa funções oficiais conhecidas e tolera a ausência de cada função com avisos explícitos, sem inventar resultados: `core_calendar_get_action_events`, `mod_assign_get_assignments` e `mod_forum_get_forums_by_courses`. A disponibilidade concreta depende das funções que o administrador do AVA habilitar para o token institucional.

O SIGAA do IF Sudeste MG foi identificado como um sistema separado com autenticação institucional. Não foi encontrada, nesta etapa, uma API pública autorizada para sincronização automática. Portanto, o aplicativo mantém o SIGAA como conexão manual/futura, sem raspagem de tela e sem armazenamento de senha.
