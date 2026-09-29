# Project TODO

- [x] Confirmar escopo do MVP com o usuário
- [x] Inicializar projeto móvel Expo Estudo Organizado
- [x] Registrar plano de interface e fluxos em design.md
- [x] Personalizar identidade visual, tema e navegação principal
- [x] Gerar e configurar ícone exclusivo do aplicativo
- [x] Criar modelo local de metas, tarefas, notas, pastas e materiais
- [x] Implementar persistência local com AsyncStorage
- [x] Implementar tela Hoje com resumo de progresso e tarefas pendentes
- [x] Implementar criação e edição de metas
- [x] Implementar criação, conclusão e exclusão de tarefas
- [x] Implementar cálculo de progresso por meta
- [x] Implementar Biblioteca com notas, PDFs e pastas
- [x] Implementar editor de notas com salvamento manual
- [x] Implementar formatação essencial, copiar e colar
- [x] Implementar seleção de documentos e imagens do dispositivo
- [x] Implementar importação e registro local de PDFs
- [x] Implementar fluxo inicial de OCR para páginas/imagens escaneadas
- [x] Permitir copiar o texto reconhecido para uma nova nota
- [x] Implementar Configurações e limpeza de dados com confirmação
- [x] Adicionar testes unitários para regras de progresso
- [x] Validar tipos e fluxos principais
- [x] Preparar arquitetura para tabelas, gráficos, imagens e estilos ricos

## Upgrade solicitado — segunda etapa

- [x] Auditar o MVP e definir arquitetura para documentos ricos e PDFs completos
- [x] Evoluir o modelo de documentos para blocos ricos e metadados de edição
- [x] Implementar salvamento automático enquanto o usuário digita
- [x] Adicionar estilos ricos: títulos, subtítulos, citações, código, cores e destaque
- [x] Adicionar suporte de editor para tabelas editáveis
- [x] Adicionar inserção e gerenciamento de imagens nas notas
- [x] Adicionar gráficos configuráveis nas notas
- [x] Implementar busca global por título, conteúdo, pasta e texto OCR
- [x] Implementar renomear, mover e excluir documentos com confirmação
- [x] Melhorar organização visual da Biblioteca com filtros e ordenação
- [x] Implementar visualização de PDF página por página
- [x] Implementar seleção automática e manual de texto em PDF
- [x] Implementar cópia de textos selecionados de PDFs
- [x] Ampliar OCR para todas as páginas de documentos escaneados
- [x] Criar revisão e edição do texto OCR antes de salvar
- [x] Adicionar testes para regras centrais da expansão e regressão de progresso
- [x] Validar a expansão em tipos, testes, lint e fluxos principais

## Correção de experiência — editor visível

- [x] Adicionar Editor como área principal na barra inferior
- [x] Adicionar botão de acesso direto ao editor na tela Hoje
- [x] Tornar a tela do editor autoexplicativa, com título e ferramentas visíveis
- [x] Validar criação de nota e retorno para a Biblioteca

## Reformulação acadêmica e tablet

- [x] Redesenhar totalmente a tela inicial para painel acadêmico
- [x] Substituir textos genéricos por matérias e compromissos editáveis
- [x] Adicionar entidades editáveis para aulas, exercícios, provas, testes, visitas e outros eventos
- [x] Adaptar o layout para uso principal no Galaxy Tab A9+
- [x] Criar tela exclusiva do editor com lista de documentos recentes e pastas
- [x] Criar edição persistente célula a célula em tabelas
- [x] Criar edição persistente de dados e rótulos em gráficos
- [x] Validar o fluxo de edição, salvamento e reabertura no tablet

## Nova etapa — navegação, calendário, personalização e chat

- [x] Corrigir corte do título no painel inicial e melhorar espaçamento responsivo
- [x] Adicionar botão de voltar visível e consistente nas telas internas
- [x] Renomear o acesso principal para Editor de texto
- [x] Garantir que apenas o acesso Editor de texto abra o editor completo
- [x] Criar calendário mensal interativo com seleção de dia e adição de eventos
- [x] Permitir selecionar e reorganizar eventos no calendário; arrastar fica preparado para a próxima etapa
- [x] Permitir editar e excluir matérias, lembretes, provas e tarefas diretamente nos cartões
- [x] Permitir escolher cores e emojis para matérias e eventos
- [x] Personalizar identidade com Cris como criadora do projeto
- [x] Criar sala de chat público com atualização periódica e fallback local
- [x] Criar conversa privada por destinatário no protótipo
- [x] Definir modelo de mensagens e destinatário para o chat
- [x] Remover dependências específicas do Manus do fluxo local; OCR e chat remoto continuam com backend configurável
- [x] Documentar dependências inevitáveis do sistema operacional e do aplicativo móvel
- [x] Validar tipos, testes e lint; salvar checkpoint após revisão final

## Editor completo — recursos restantes

- [x] Criar documento novo a partir da central do Editor
- [x] Exibir lista de documentos recentes com ações visíveis
- [x] Renomear documento pela central e pelo editor
- [x] Excluir documento pela central e pelo editor com confirmação
- [x] Duplicar documento preservando blocos, imagens, tabelas e gráficos
- [x] Mover documento entre pastas pela central do Editor
- [x] Exibir estado de autosave e salvar durante a digitação
- [x] Adicionar barra de formatação com títulos, subtítulos, negrito, itálico, sublinhado, listas e destaque
- [x] Tornar tabelas editáveis célula a célula com adição de linhas e colunas
- [x] Tornar gráficos editáveis com rótulos, valores e novos dados
- [x] Adicionar inserção e remoção de imagens
- [x] Validar abertura, edição, duplicação, exclusão e reabertura de documentos
- [x] Corrigir alinhamento visual da grade mensal do calendário após validação

## Salto de qualidade — produção

- [x] Auditar módulos nativos e escolher abordagem para documento rico e PDF
- [x] Criar histórico de versões do documento no fluxo de edição
- [x] Implementar desfazer e refazer no editor
- [x] Persistir estado de edição e recuperação após reabrir o documento
- [x] Criar autenticação própria com cadastro, hash de senha e sessão segura
- [x] Criar tabelas próprias para usuários, sessões e mensagens públicas/privadas
- [x] Substituir chat em memória por armazenamento compartilhado quando o banco está disponível
- [x] Adicionar atualização periódica entre dispositivos
- [x] Integrar visualizador PDF nativo para Development Build com navegação paginada
- [x] Integrar OCR por documento completo com revisão e seleção no fluxo de PDF
- [x] Validar hash de senha, tipos, testes e lint; validação nativa no aparelho ainda pendente
- [x] Atualizar documentação de dependências e infraestrutura própria

## Correção urgente — cadastro do Chat

- [x] Reproduzir erro JSON Parse error: Unexpected character:< no cadastro
- [x] Corrigir resolução da origem da API e preservar rota tRPC
- [x] Confirmar resposta JSON consistente da API local para sucesso e erro
- [x] Tratar respostas HTML/indisponibilidade com fallback local e mensagem compreensível
- [x] Testar contrato JSON, autenticação local e regressões do Chat
- [x] Salvar checkpoint da correção

## Migração para backend gratuito

- [x] Inspecionar conectores e configuração disponível para backend gratuito
- [x] Confirmar Supabase como provedor, URL pública e chaves anon necessárias
- [x] Preparar schema de perfis, mensagens, conversas e sincronização em docs/supabase-schema.sql
- [x] Configurar cliente Supabase com sessão persistente no aplicativo
- [x] Migrar login e cadastro do protótipo para Supabase Auth
- [x] Migrar chat público e privado para consultas e canal realtime do Supabase
- [x] Implementar camada de sincronização de matérias, eventos, metas e documentos
- [x] Implementar fila e reconciliação de alterações offline
- [x] Validar políticas RLS no projeto Supabase após aplicar docs/supabase-schema.sql
- [ ] Testar no Galaxy Tab A9+ e no preview web com schema remoto aplicado
- [ ] Salvar checkpoint da migração

## Ativação remota do Supabase

- [x] Aplicar o schema e as políticas RLS no projeto Supabase
- [x] Configurar confirmação de e-mail e URLs de redirecionamento
- [ ] Verificar autenticação, perfil e sessão no backend remoto
- [ ] Testar sala pública e conversa privada com duas contas
- [ ] Testar sincronização de matérias, eventos, metas e documentos
- [ ] Registrar as limitações do plano gratuito e concluir a ativação

## Ativação pelo navegador pessoal

- [x] Conectar à sessão Supabase já autenticada no navegador da Cris
- [x] Aplicar schema SQL e confirmar as tabelas remotas
- [x] Configurar confirmação de e-mail e URL de redirecionamento
- [ ] Validar o Chat e a sincronização com o banco remoto

## Robustez antes da ativação final

- [x] Tornar o schema Supabase idempotente e compatível com IDs locais
- [x] Criar fila persistente com reconciliação e tombstones para sincronização offline
- [x] Desligar chamadas tRPC do chat quando o Supabase estiver configurado
- [x] Restringir a leitura da conversa privada ao destinatário escolhido
- [x] Implementar processamento de links de confirmação de e-mail no app
- [x] Corrigir a compatibilidade do preview web com renderização sem `window`

## Bloqueio relatado no telefone

- [x] Confirmar que a versão instalada no telefone é anterior às correções Supabase pelo comportamento relatado
- [x] Remover da experiência do Chat a mensagem de contingência que manda pedir correção ao Manus
- [x] Remover do Chat toda chamada à API tRPC anterior e usar somente Supabase ou modo local
- [x] Criar checkpoint da versão atualizada para teste no telefone

## Construção e acesso no telefone

- [ ] Confirmar que a publicação da versão corrigida terminou no domínio gratuito
- [x] Orientar a abertura da versão nova em vez da instalação anterior
- [ ] Registrar o resultado do carregamento inicial no telefone

## Hospedagem alternativa gratuita

- [x] Avaliar GitHub Pages como rota alternativa para a versão web estática
- [x] Preparar e validar o build web estático compatível com GitHub Pages
- [x] Publicar a versão alternativa somente após confirmação explícita
- [ ] Validar o acesso da versão alternativa no telefone

## Correção visual do GitHub Pages

- [x] Preservar `.nojekyll` após cada exportação estática do Expo
- [x] Republicar os recursos estáticos para restaurar os estilos no GitHub Pages
- [x] Validar visualmente o carregamento de CSS na URL pública

## Correção do Chat web

- [x] Exibir ações visíveis e acessíveis de Criar conta e Entrar
- [x] Exibir botão Enviar acessível no compositor de mensagens
- [x] Enviar mensagem com Enter no navegador sem inserir quebra de linha
- [x] Republicar e validar visualmente os controles do fluxo de Chat corrigido

## Bloqueio crítico de login web

- [ ] Reproduzir o login com uma conta confirmada e registrar a mensagem retornada
- [x] Corrigir a persistência de sessão Supabase na hospedagem GitHub Pages
- [x] Exibir o resultado do login diretamente na tela, sem depender de alerta do navegador
- [x] Atualizar a tela de Chat imediatamente após a sessão ser criada
- [ ] Validar entrada, recarga da página e permanência da sessão no Chat
- [x] Republicar a correção de login após validação técnica

## Bloqueio crítico de estilos publicados

- [x] Identificar por que os recursos `_expo` falham após atualizações do GitHub Pages
- [x] Tornar os caminhos e o cache dos recursos estáticos confiáveis no GitHub Pages
- [x] Validar o Chat estilizado em uma sessão limpa antes de solicitar novo teste

## Bloqueio crítico do Editor web

- [x] Exibir um botão principal de novo documento com texto e ação clara
- [x] Abrir imediatamente o documento recém-criado no editor de conteúdo
- [x] Tornar a exclusão de documentos visível e confirmada
- [x] Garantir que ações do Editor não fiquem cobertas pela barra inferior
- [ ] Validar criar, abrir, editar e excluir no GitHub Pages antes de nova entrega

## Expansão de Editor, Configurações e conta

- [x] Tornar a barra do Editor clara para negrito, itálico e listas
- [x] Adicionar opções úteis de preferências e dados locais em Configurações
- [x] Criar tela de perfil com nome e dados de exibição editáveis
- [x] Adicionar recuperação de senha por e-mail com retorno seguro ao aplicativo
- [x] Informar o endereço de acesso cadastrado sem expor dados indevidos
- [x] Validar e publicar os novos fluxos web

## Reconstrução visual e estrutural — experiência acadêmica premium

- [x] Preservar o Chat como área protegida: sem alterações de arquivos, lógica, estilo, banco ou navegação interna
- [x] Definir a identidade visual acadêmica moderna em azul-índigo, violeta e superfícies claras acessíveis
- [x] Reconstruir a Home como painel pessoal com saudação, resumo, progresso, agenda, matérias e atalhos
- [x] Reconstruir o calendário com navegação mensal, hoje, seleção de dia e eventos categorizados
- [x] Redesenhar cartões de matérias e tarefas com prioridade, prazo e progresso real
- [x] Criar páginas individuais de matéria com tarefas, eventos, notas, documentos e atalhos
- [x] Reconstruir a central Meus Documentos com busca, recentes, favoritos, pastas, ordenação e grade/lista
- [x] Reestruturar o editor profissional com menus, barra de ferramentas, régua, página e barra de status
- [x] Adicionar modelos acadêmicos, favoritos, exportação e compartilhamento de documentos
- [x] Alinhar Biblioteca ao sistema visual premium sem alterar a lógica de PDFs e OCR
- [x] Alinhar Configurações e Perfil ao sistema visual premium sem alterar os fluxos de conta
- [x] Revalidar as assinaturas do Chat protegido após a publicação final
- [x] Validar visualmente a experiência web sem modificar o Chat e publicar a atualização

## Correção visual radical — produto educacional premium

- [x] Registrar o briefing: interface leve, elegante, premium e sem aparência de admin/template
- [x] Congelar arquivos, APIs, lógica, mensagens, dados e navegação interna do Chat
- [x] Reestruturar o sistema visual com fundo #F8F9FA, neutros, bordas discretas e cor de ação controlada
- [x] Reconstruir Home assimétrica com saudação, métricas em três colunas, calendário/agendas e continuar de onde parou
- [x] Reconstruir Configurações como central lateral dinâmica com Perfil, Conta, Aparência, Notificações, Editor, Estudos, Privacidade, Dados e Sobre
- [x] Refinar central de documentos com busca, pastas, recentes, favoritos e listas leves
- [x] Refinar Editor Acadêmico com folha real, toolbar universitária, TCC, sumários, notas de rodapé e referências ABNT
- [x] Validar responsividade desktop/tablet, preservação dos dados e isolamento absoluto do Chat
- [x] Publicar a correção visual radical no GitHub Pages e salvar checkpoint

---

## Histórico visual preservado

- [x] Reconstrução premium anterior publicada no commit 29cd9c4
- [x] Chat mantido intocável na reconstrução anterior

## Nova expansão — programação e IA local offline

- [x] Definir limites de segurança, permissões e compatibilidade Android para terminal e editor de código
- [ ] Pesquisar e escolher runtime local para modelos GGUF/LLM no Android
- [x] Criar editor de código com abas, pastas, busca, destaque de sintaxe e salvamento local
- [x] Criar terminal educacional sandboxed, sem acesso irrestrito ao sistema ou execução arbitrária
- [ ] Integrar IA local opcional com download de modelo, gerenciamento de armazenamento e modo offline
- [x] Adicionar ações da IA para explicar, corrigir, completar e gerar testes de código
- [ ] Validar desempenho, memória, bateria, privacidade e preservação integral do Chat

## Expansão Sandbox, Editor de Código e IA Cris

- [x] Auditar integração atual com GitHub, branch pública, publicação e estado do repositório
- [x] Preservar Chat, Supabase, dados e APIs existentes; documentar o limite de não regressão
- [x] Definir permissões e arquitetura da Sandbox sem shell irrestrito ou acesso a segredos
- [x] Criar central de projetos e arquivos do Editor de Código com autosave, abas e busca
- [x] Criar terminal educacional controlado com comandos permitidos, limites de tempo e saída
- [x] Criar interface visual da IA local Cris com modo offline, estado do modelo e privacidade
- [x] Adicionar ações da Cris para ler, explicar, sugerir, editar com confirmação e gerar testes
- [x] Adicionar botão da Cris na Home e painel contextual no Editor de Código
- [ ] Adicionar presença opcional da Cris no chat geral e nas conversas privadas, com consentimento e identificação clara
- [x] Adicionar configurações de energia, armazenamento, downloads, privacidade, modo offline e sustentabilidade
- [x] Criar testes de Sandbox, terminal, permissões, persistência, IA, Chat e regressões
- [ ] Validar web, Development Build Android e Galaxy Tab A9+ conforme recursos disponíveis
- [x] Verificar publicação e integração GitHub antes de nova entrega
- [ ] Salvar checkpoint somente após validação automatizada e revisão visual

## Auditoria de integração e versão física

- [x] Confirmar se o Editor de Código está presente na versão web, no código atual e no build físico
- [x] Auditar notificações locais e push: configuração, solicitação de permissão, agendamento, recebimento e teste real
- [x] Auditar IA local Cris, runtime GGUF e status de instalação no Android
- [x] Auditar Sandbox e terminal: interface disponível versus execução real isolada
- [x] Auditar Supabase/Auth/Realtime e sincronização sem declarar teste real não realizado
- [x] Auditar GitHub Pages, branch gh-pages e diferença entre publicação web e APK físico
- [x] Produzir matriz de prontidão das integrações e orientar atualização do build físico

## Publicação imediata no GitHub Pages

- [x] Exportar a versão atual com `export:github-pages`
- [x] Confirmar `baseUrl` `/-App-Estudo-Organizado`, `.nojekyll` e ausência de segredos no artefato
- [x] Atualizar a branch pública `gh-pages` somente com artefatos estáticos
- [x] Validar GitHub Pages, recursos principais e rotas `/`, `/code` e `/ai-settings`
- [x] Entregar URL pública com parâmetro de cache atualizado

## Diagnóstico de acesso público — Editor, terminal e IA local

- [ ] Reproduzir a URL pública sem cache e confirmar se os atalhos e rotas novas aparecem
- [ ] Verificar se a Home publicada aponta para `/code` e `/ai-settings`
- [ ] Comparar o JavaScript público com o commit `c7c8bb26`
- [ ] Explicar com precisão a diferença entre interface web, terminal educacional e integração real
- [ ] Definir as etapas restantes para editor completo, terminal executável e IA local offline

## Implementação imediata das integrações

- [x] Tornar Código uma entrada visível e persistente na navegação web
- [x] Implementar ações de arquivo e terminal educacional com feedback verificável
- [x] Implementar notificações locais reais com permissão e agendamento
- [x] Integrar camada de provedores da Cris e estado explícito offline/preparado
- [ ] Criar ponte nativa Android para execução real e IA GGUF, sem declarar concluída antes do Development Build
- [x] Validar todas as integrações sem alterar o Chat protegido
- [ ] Publicar a implementação atualizada no GitHub Pages e orientar o build Android


## Integrações imediatas — rodada atual

- [x] Expor o Espaço Código como aba permanente na navegação principal
- [x] Conectar a aba Código ao editor, terminal educacional e painel da Cris existentes
- [x] Adicionar o config plugin do expo-notifications ao app.config.ts
- [x] Validar TypeScript e testes após as alterações
- [ ] Testar notificações locais em Development Build Android no Galaxy Tab A9+
- [ ] Integrar runtime nativo GGUF/llama.cpp no Development Build Android
- [ ] Implementar runner nativo sandboxed para execução real de código no Android
- [ ] Validar fluxo remoto do Chat e sincronização com duas contas reais


## Nova diretriz — Cris híbrida online/offline

- [x] Exibir a Cris imediatamente na versão web e no aplicativo, sem exigir configuração manual
- [x] Implementar atendimento online da Cris por backend seguro, sem expor credenciais no cliente
- [ ] Detectar conectividade e selecionar automaticamente entre modo online, cache local e modo offline disponível
- [ ] Mostrar claramente o modo atual da Cris e a qualidade/indisponibilidade da conexão
- [ ] Preparar instalação assistida do modelo local Android, sem exigir que o usuário procure arquivos GGUF
- [ ] Permitir modelos locais opcionais e remoção/troca pelo próprio aplicativo
- [x] Preservar o Chat original e manter a Cris como recurso separado e controlável


## Área institucional da criadora

- [x] Criar uma apresentação institucional de autoria da Cris no início do programa
- [x] Explicar o propósito acadêmico do Estudo Organizado e seus módulos principais
- [x] Exibir telefone e e-mail de contato fornecidos pela criadora
- [x] Adicionar acesso institucional nas Configurações/Sobre sem alterar o Chat protegido
- [ ] Validar layout, links de contato e responsividade no web/tablet


## Expansão do Espaço Código — experiência VS Code-inspired

- [x] Adicionar botão Play/Executar visível no cabeçalho e no editor
- [x] Exibir estado de execução, saída, erros didáticos e tempo de execução
- [x] Criar abas de arquivos e indicador de arquivo ativo/modificado
- [x] Ampliar o terminal educacional com comandos permitidos, ajuda contextual e histórico
- [x] Permitir execução segura de exemplos suportados sem acesso ao sistema ou à rede
- [x] Refinar a composição visual do editor para aproximar fluxos funcionais do VS Code
- [x] Validar acessibilidade, persistência, tipos, testes e preservação do Chat


## Publicação solicitada no GitHub Pages

- [x] Sincronizar o build atual do Espaço Código com a branch pública do GitHub Pages
- [x] Validar a URL pública no telefone e no computador por respostas HTTP e carregamento de recursos
- [x] Entregar à Cris o endereço correto para teste


## Correção de publicação — Código integrado ao Estudo Organizado

- [x] Confirmar o endereço principal esperado pela Cris e o estado da URL pública atual
- [x] Garantir que a Home completa seja a entrada oficial do programa
- [x] Manter Código integrado à aba e aos atalhos internos, sem apresentá-lo como aplicativo separado
- [x] Republicar a versão completa e validar Home, navegação e Código no mesmo domínio


## Correção do Espaço Código — saída, terminal e Cris interativa

- [x] Corrigir a renderização de quebras de linha na saída do Play
- [x] Separar visualmente saída normal, erros e estado da Sandbox
- [x] Explicar o propósito da Cris Sandbox e os limites atuais do terminal
- [x] Organizar comandos do terminal com ajuda contextual e exemplos visíveis
- [x] Adicionar chat interativo da Cris no Espaço Código para teste online/local
- [x] Validar segurança, persistência, tipos, testes e preservação do Chat geral


## Ajustes de leitura móvel e temas

- [x] Tornar o histórico da conversa da Cris rolável e impedir que respostas longas sejam cobertas pelo compositor
- [x] Ajustar o layout móvel do painel da Cris para respeitar a barra inferior e o teclado
- [x] Fazer as opções de tema alterarem cores, superfícies, bordas e textos de forma visível
- [x] Adicionar temas Claro, Escuro, Violeta, Oceano e Alto contraste com persistência local
- [x] Validar a Cris no telefone, o seletor de temas e a preservação do Chat geral


## Correção prioritária — Cris e execução real do Código

- [x] Remover o limite artificial que corta respostas longas da Cris
- [x] Exibir respostas em janela média com cerca de 15 linhas e rolagem interna
- [x] Garantir que o compositor não cubra o histórico nem a última resposta
- [x] Fazer o Play mostrar estado, saída, erros e conclusão verificáveis
- [x] Corrigir o fluxo para Explicar código analisar exatamente o arquivo aberto
- [x] Revisar o texto da Cris para usar linguagem feminina e remover “o Cris”
- [x] Validar o editor e o Play sem apresentar execução nativa inexistente como pronta
- [x] Republicar a correção no GitHub Pages após testes


## Integração acadêmica e reconstrução das Configurações

- [x] Mapear se o AVA/Moodle/SIGAA oferece API, token ou serviço autorizado para integração
- [x] Definir conexão manual com consentimento, sem armazenar senha em texto aberto
- [ ] Importar cursos, disciplinas, materiais, avisos, tarefas e prazos para o Estudo Organizado
- [x] Adicionar botão Atualizar agora e estado da última sincronização
- [ ] Preparar sincronização automática apenas quando houver API/autorização compatível
- [ ] Reconstruir Perfil com foto opcional, identidade e dados editáveis
- [x] Tornar Conta responsável por sessão, recuperação, segurança e dispositivos
- [x] Tornar Aparência funcional com temas visivelmente distintos e persistentes
- [x] Expandir Notificações para tarefas, prazos, materiais novos e sincronização
- [x] Transformar Editor, Estudos, Privacidade e Dados em configurações reais, sem atalhos incoerentes
- [x] Preservar o Chat protegido durante toda a integração


## Integração acadêmica — primeira entrega validada

- [x] Documentar Moodle Web Services, opções de integração e limites do SIGAA/AVA
- [x] Criar conexão de Moodle/AVA ou SIGAA com endereço HTTPS e preferência manual/automática
- [x] Proteger o teste do Moodle com autenticação do aplicativo
- [x] Testar o Web Service Moodle sem armazenar o token nas preferências
- [x] Buscar disciplinas autorizadas pelo Moodle e importar matérias sem duplicação
- [x] Reconstruir Conta, Aparência, Notificações, Editor, Estudos e Dados sem atalhos incoerentes
- [ ] Importar materiais, avisos, tarefas e prazos após validar as funções disponíveis no AVA
- [ ] Ativar sincronização automática somente depois de API autorizada e política de execução definida


## Integração acadêmica — conteúdos autorizados

- [x] Consultar disciplinas pelo Web Service Moodle com sessão do aplicativo
- [x] Buscar módulos e materiais autorizados por disciplina
- [x] Importar disciplinas para o Planejamento sem duplicar nomes existentes
- [x] Importar módulos como documentos locais com descrição e link de origem
- [x] Persistir data da última atualização manual
- [ ] Integrar avisos, tarefas e prazos como eventos e lembretes
- [ ] Ativar sincronização automática em segundo plano após autorização institucional


## Conclusão da integração acadêmica

- [x] Auditar as funções oficiais do Moodle disponíveis para avisos, tarefas e prazos
- [x] Mapear tarefas do Moodle para metas/tarefas do Planejamento
- [x] Mapear prazos e datas de entrega para a Agenda do Estudo Organizado
- [x] Importar avisos como documentos ou comunicados na Biblioteca
- [x] Evitar duplicações usando identificadores e origem do Moodle
- [x] Persistir estado, data e resultado da última sincronização
- [ ] Criar atualização automática somente se a API institucional permitir execução autorizada
- [x] Validar Configurações, segurança, Chat protegido e publicação final


## Feedback visual e conteúdos do Moodle

- [x] Criar botão claro “Clique aqui para sincronizar com Moodle”
- [x] Exibir carregamento, progresso, sucesso, aviso e erro da sincronização
- [x] Mostrar resumo com total de disciplinas, tarefas, textos, PDFs e vídeos encontrados
- [x] Importar textos e descrições autorizadas como documentos locais
- [x] Registrar PDFs por link de origem sem redistribuir arquivos protegidos
- [x] Registrar vídeos autorizados e links públicos do YouTube
- [x] Permitir abrir vídeos autorizados dentro do Estudo Organizado
- [x] Importar tarefas e prazos sem dados pessoais desnecessários
- [x] Validar duplicação, segurança, responsividade e preservação do Chat


## Correção urgente — acesso visível ao Moodle

- [x] Adicionar cartão visível do Moodle na Home
- [x] Criar botão “Trazer conteúdos do Moodle” com acesso à conexão
- [x] Garantir que o botão execute a sincronização real após autorização
- [x] Validar feedback, importação e publicação no endereço principal


## Otimização PageSpeed — rodada mobile

- [ ] Analisar o JSON real do PageSpeed e o bundle web atual
- [ ] Reduzir JavaScript não usado e tarefas longas que elevam o TBT
- [ ] Melhorar o LCP e adiar recursos não críticos sem quebrar a Home
- [ ] Corrigir erros ativos do console e revisar encerramentos prematuros
- [x] Configurar cache eficiente e gerar/verificar source maps
- [ ] Otimizar carregamento de fontes e evitar bloqueios de renderização
- [x] Adicionar nomes acessíveis aos progressbars e atributos ARIA obrigatórios
- [x] Adicionar title, meta description, Open Graph e metadados de navegação
- [x] Validar Editor, Código, Moodle, Chat protegido e regressões
- [ ] Republicar o build otimizado no GitHub Pages
