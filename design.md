# Design de produto — Estudo Organizado

## Direção da reconstrução

O **Estudo Organizado**, criado por **Cris**, será um espaço acadêmico pessoal: organizado, tecnológico, acolhedor e focado em avanço visível. A experiência deve transmitir progresso real sem se tornar um painel administrativo pesado. A referência do Véríxa inspira a hierarquia do editor profissional e da central de documentos; a identidade própria do Estudo Organizado permanece independente.

O **Chat é uma área protegida**. Não serão alterados seus componentes, arquivos, aparência, dados, integrações, mensagens ou navegação interna. A barra inferior compartilhada também será preservada para não afetar essa área; a nova linguagem visual será aplicada somente dentro das telas acadêmicas permitidas.

## Sistema visual

| Token | Claro | Escuro | Uso |
|---|---:|---:|---|
| Índigo estrutural | `#3346A8` | `#8798FF` | Navegação, ações primárias, foco e progresso |
| Violeta de destaque | `#7C3AED` | `#B29BFF` | Chamadas de ação secundárias, dicas e seleção |
| Fundo | `#F5F7FC` | `#10131D` | Base da aplicação |
| Superfície | `#FFFFFF` | `#191E2B` | Blocos de conteúdo e folhas de documento |
| Texto | `#1B2235` | `#F2F4FA` | Títulos e conteúdo principal |
| Texto secundário | `#687088` | `#AAB2C5` | Metadados e contexto |
| Borda | `#E4E8F2` | `#30384E` | Separação discreta |
| Sucesso | `#18865B` | `#55D69A` | Conclusões e progresso saudável |
| Alerta | `#B67500` | `#FFC96B` | Prazos e atenção |
| Erro | `#C13B4A` | `#FF8793` | Exclusões e falhas |

O layout utilizará superfícies brancas ou escuras bem delimitadas, sombras muito suaves, bordas discretas e detalhes violeta pontuais. A escala tipográfica seguirá títulos curtos e fortes, textos auxiliares menores porém legíveis e alta densidade de informação no tablet/desktop sem poluição visual. Em telas pequenas, os blocos passam de colunas para uma pilha vertical, a barra de ferramentas do editor usa rolagem horizontal e ações ficam sempre acessíveis.

## Lista de telas

| Tela | Conteúdo principal | Função | Ação prioritária |
|---|---|---|---|
| Hoje | Saudação dinâmica, contexto do dia, progresso, próximos compromissos, matérias, tarefas e atividade recente | Decidir o próximo passo acadêmico | Adicionar tarefa ou abrir o próximo compromisso |
| Planejamento | Metas, tarefas por recorte temporal, prioridade, progresso semanal e estatísticas úteis | Criar, concluir e acompanhar metas/tarefas | Nova tarefa ou nova meta |
| Matéria | Identidade da matéria, professor, progresso, tarefas, avaliações, documentos e eventos vinculados | Concentrar a rotina de cada disciplina | Nova tarefa, nota, documento ou compromisso |
| Calendário | Mês navegável, hoje, dias com categorias e agenda do dia selecionado | Visualizar e incluir compromissos | Adicionar compromisso ao dia |
| Meus Documentos | Busca, recentes, favoritos, pastas, filtros, ordenação e alternância grade/lista | Organizar e abrir trabalhos acadêmicos | Novo documento ou modelo |
| Documento | Cabeçalho, menus, barra de ferramentas, régua, folha de escrita e estado de salvamento | Criar TCC, artigos, relatórios, resumos e anotações | Escrever e salvar automaticamente |
| Biblioteca | PDFs, OCR disponível, materiais e pastas | Consultar e organizar fontes de estudo | Importar material |
| Configurações | Conta, aparência, estudos, editor, privacidade, dados e preferências | Ajustar a experiência pessoal | Abrir a categoria desejada |
| Perfil | Dados de exibição e acesso da conta autenticada | Gerenciar a própria identidade | Salvar perfil |
| Conversas | **Mantida sem qualquer alteração** | Comunicação existente | Enviar mensagem |

## Fluxos principais

### Organizar o dia

1. A pessoa abre **Hoje** e lê uma saudação ligada ao horário e ao status real das tarefas.
2. Observa o progresso e os próximos compromissos, sem números inventados.
3. Toca em uma matéria, tarefa ou evento para abrir o contexto correspondente.
4. Conclui uma tarefa; indicadores e mensagem motivacional contextual são atualizados.

### Criar e organizar um documento

1. A pessoa abre **Editor** e encontra **Meus Documentos** com pesquisa, pastas, recentes e modelos.
2. Toca em **Novo documento** ou escolhe um modelo de resumo, relatório, artigo, fichamento ou trabalho acadêmico.
3. O editor abre uma folha de escrita, preservando título, conteúdo, blocos, imagens, tabelas, gráficos e autosave já existentes.
4. A pessoa usa as ferramentas de texto, salva automaticamente e retorna à central; o item reaparece como recente.

### Acompanhar uma matéria

1. A pessoa toca em um cartão de matéria no painel.
2. Visualiza professor, progresso derivado, pendências, avaliações, eventos e documentos ligados à disciplina.
3. Usa um atalho para incluir uma tarefa, nota, documento ou compromisso.
4. As alterações retornam ao painel, à agenda e às estatísticas sem apagar dados anteriores.

### Recuperar organização após um prazo

1. A pessoa abre **Planejamento** e seleciona tarefas de Hoje, Amanhã, Próximas, Atrasadas ou Concluídas.
2. Identifica prioridade e prazo com indicadores consistentes.
3. Conclui ou reprioriza uma tarefa existente; o progresso de sua meta é recalculado.

## Componentes reutilizáveis

O sistema terá cabeçalho de contexto, seção com ação, cartão de matéria, linha de tarefa, indicador de progresso, calendário mensal, selo de categoria/prioridade, estado vazio, barra de ferramentas do documento e menus de documentos. Todos usarão os mesmos tokens, espaçamentos e áreas de toque. Nenhum componente acadêmico deve importar ou alterar componentes do Chat.

## Limites de implementação honesta

Autosave e histórico usarão a persistência existente. PDFs e OCR continuarão explicitando quando dependem de processamento disponível no ambiente. Exportação DOCX/PDF e compartilhamento serão adicionados somente quando gerarem arquivos ou ações reais, não uma simulação visual. Notificações internas discretas podem comunicar estados locais; alertas de sistema em segundo plano exigem configuração própria e serão tratados como uma etapa separada.
