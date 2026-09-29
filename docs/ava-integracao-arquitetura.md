# Arquitetura da integração acadêmica

## Decisão de segurança

O AVA do IF Sudeste MG é um Moodle e informa publicamente que usa as mesmas credenciais do SIGAA. A integração do Estudo Organizado não deve pedir ou armazenar a senha institucional em texto aberto. O caminho técnico correto é usar um serviço externo autorizado do Moodle, com token e permissões limitadas, ou uma autorização institucional equivalente.

A documentação oficial do Moodle descreve Web Services para sistemas externos e o fluxo de autenticação por sessão/token, validação de permissões e chamada apenas das funções autorizadas [1].

## Opções viáveis

| Abordagem | Como funciona | Vantagens | Limitações | Complexidade |
|---|---|---|---|---|
| Conexão por API/token do Moodle | A usuária autoriza um serviço do AVA; o aplicativo guarda apenas um token protegido e consulta cursos, materiais, avisos e atividades autorizados. | Mais segura, estável e adequada para atualização manual ou automática. | Depende de Web Services habilitados no Moodle e das permissões liberadas pela instituição. | Média |
| Atualização manual por arquivo/link | A usuária exporta materiais ou fornece links autorizados; o aplicativo importa e organiza os conteúdos. | Funciona mesmo quando a instituição não libera API e não exige credencial no aplicativo. | Não acompanha atualizações automaticamente e exige intervenção da usuária. | Baixa |

A automação de preenchimento de usuário e senha, ou a raspagem de páginas autenticadas, não será usada como base. Ela é frágil, pode quebrar com CAPTCHA, mudanças de layout e autenticação institucional, além de ampliar o risco sobre a conta acadêmica.

## Fluxo proposto

Primeiro, a usuária escolhe Moodle/AVA ou SIGAA, informa o endereço institucional e seleciona atualização manual ou automática. O aplicativo valida o endereço HTTPS e salva apenas a preferência local. Em uma etapa de autorização disponível no AVA, a usuária fornece um token limitado ou conclui um fluxo oficial de autorização; esse token deve ser armazenado em armazenamento seguro, nunca em AsyncStorage ou no código do cliente.

A primeira sincronização deve importar somente dados autorizados: disciplinas, seções, arquivos, links, avisos, tarefas e datas. Cada item recebe a origem, o identificador remoto, a data de atualização e o vínculo com a disciplina. A atualização posterior deve ser incremental, comparando identificadores e datas, evitando duplicatas e preservando alterações locais feitas no Estudo Organizado.

O modo automático só deve ser ativado quando a API estiver autorizada e o serviço oferecer uma forma estável de consulta. Caso contrário, a opção permanece manual e mostra a última sincronização, o motivo da limitação e o botão **Atualizar agora**.

## Estado implementado nesta etapa

A Central de Configurações já possui a seção **Conexões**, com seleção de Moodle/AVA ou SIGAA, endereço HTTPS, preferência manual/automática, salvamento local da configuração e aviso explícito de que a sincronização real aguarda API/token autorizado. Também foram corrigidos os atalhos incoerentes de Conta, Editor, Estudos e Dados, e Notificações agora possui preferências persistentes para tarefas, prazos, materiais e sincronização.

## Próxima etapa técnica

A próxima implementação deve criar o adaptador do Moodle, com validação de URL, armazenamento de token em SecureStore no Android e mecanismo equivalente protegido na web, chamadas somente pelo servidor quando necessário, importação incremental e testes com uma conta de teste ou endpoint autorizado. O SIGAA só deve ser integrado por API oficial ou autorização institucional; bibliotecas de scraping não serão incorporadas ao aplicativo.

## Referências

[1]: https://moodledev.io/docs/5.0/apis/subsystems/external "Moodle Developer Resources — External Services"
[2]: https://ead.ifsudestemg.edu.br/login/index.php?loginredirect=1 "AVA IF Sudeste MG — tela pública de acesso"
[3]: https://sig.ifsudestemg.edu.br/sigaa/verTelaLogin.do "SIGAA IF Sudeste MG — acesso institucional"
