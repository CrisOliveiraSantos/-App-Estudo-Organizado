# Validação do Editor web

## Correção aplicada

A central de documentos permanece na rota `/editor` e a tela de edição detalhada passou a usar a rota separada `/document`. Antes da correção, ambas competiam pela rota `/editor`, o que fazia o documento novo retornar à lista em vez de abrir para edição.

Os controles que dependiam de `Pressable` com estilos não aplicados na web foram substituídos por controles compatíveis na central e na tela detalhada. O botão **Novo**, o botão **Criar novo documento**, as ações de Renomear, Duplicar, Mover e Excluir e as ferramentas do conteúdo ficam explicitamente visíveis. A lista passou a ter espaço inferior suficiente para não ficar coberta pela barra de abas.

## Verificação realizada

A página publicada da central exibiu os dois comandos de novo documento com texto visível. Um documento recém-criado já existente no navegador foi aberto diretamente na rota `/document` e exibiu título, área de texto, salvar, duplicar, excluir e ferramentas de formatação. A exclusão não foi acionada no navegador da Cris para não remover dados pessoais durante a validação; ela usa confirmação explícita tanto na lista quanto no editor.
