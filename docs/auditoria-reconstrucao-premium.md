# Auditoria inicial — reconstrução premium

## Limite de intervenção

O escopo aprovado é uma reconstrução visual, estrutural e de experiência para as áreas acadêmicas do Estudo Organizado. O Chat é uma exceção explícita: seus arquivos e fluxos permanecem intactos, conforme o registro em `docs/chat-protegido-reconstrucao.md`.

| Área | Estado atual | Estratégia de evolução |
|---|---|---|
| Navegação por abas | Seis abas compartilhadas: Hoje, Editor, Planejamento, Biblioteca, Conversas e Ajustes | Preservar o arquivo de abas para não afetar Conversas; aprimorar a linguagem visual dentro das telas permitidas |
| Painel inicial | Home, matérias, agenda, calendário e tarefas estão concentrados em uma tela | Separar seções reutilizáveis e priorizar resumo, progresso, agenda e atalhos acadêmicos |
| Planejamento | Metas e tarefas têm dados persistentes, mas a visão é única e compacta | Criar prioridades visuais, recortes temporais e estatísticas derivadas dos dados reais |
| Documentos | Há criação, abertura, busca, renomeação, cópia, movimentação e exclusão | Preservar esses fluxos e reconstruir a central com pastas, filtros, favoritos, modelos, grade/lista e melhor hierarquia |
| Editor detalhado | Possui autosave, histórico, blocos ricos, tabelas, imagens e gráficos | Reorganizar para uma superfície de escrita profissional com comandos explícitos e preparação para documentos acadêmicos |
| Biblioteca/PDF | Possui pesquisa, filtros, PDFs e OCR disponível conforme ambiente | Unificar visualmente com os documentos sem prometer OCR de servidor na hospedagem estática |
| Dados acadêmicos | Matérias, eventos, metas, tarefas, documentos, pastas e preferências vivem no estado persistente e sincronizável | Estender apenas metadados seguros e migrações compatíveis, sem apagar registros existentes |

## Decisões de implementação

O produto seguirá um sistema com azul-índigo como estrutura, violeta como destaque, superfícies claras e estados de sucesso, alerta e erro com contraste. A reconstrução adotará componentes reutilizáveis para seções, cartões de matéria, linhas de tarefa, barras de progresso, estados vazios e controles de documento.

Para preservar dados e reduzir riscos, não haverá recriação do banco nem remoção de campos existentes. As capacidades que dependem de infraestrutura adicional, como exportar DOCX/PDF fiel ou notificações em segundo plano, serão implementadas somente quando tiverem um caminho técnico funcional; até lá, a interface não apresentará resultados simulados como se fossem reais.

## Sequência prática

1. Definir tokens e componentes visuais fora do Chat.
2. Refatorar o painel acadêmico em blocos reutilizáveis sem perder a edição atual.
3. Evoluir matérias, tarefas, metas e calendário com dados já persistidos.
4. Reconstruir central e editor de documentos preservando o conteúdo salvo.
5. Validar responsividade, persistência, navegação e a assinatura inalterada dos arquivos do Chat.
