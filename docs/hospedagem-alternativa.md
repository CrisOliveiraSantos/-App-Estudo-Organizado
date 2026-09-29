# Hospedagem alternativa — GitHub Pages

## Estratégia adotada

O Estudo Organizado possui uma versão web estática hospedada no GitHub Pages, sem utilizar o domínio executivo da Cris. A interface Expo web é servida pelo repositório público `CrisOliveiraSantos/-App-Estudo-Organizado`, na ramificação `gh-pages`, em `https://crisoliveirasantos.github.io/-App-Estudo-Organizado/`.

Somente a exportação compilada é enviada a essa ramificação. O código-fonte, arquivos de ambiente, senhas e dados pessoais não fazem parte do envio. O cliente web usa o Supabase para autenticação, chat e sincronização; as políticas RLS do projeto Supabase permanecem responsáveis por proteger os dados.

## Autenticação e limitações

A URL padrão do Supabase foi atualizada para a hospedagem GitHub Pages e a rota `https://crisoliveirasantos.github.io/-App-Estudo-Organizado/auth/confirm` foi adicionada aos redirecionamentos permitidos. O link profundo nativo previamente cadastrado foi preservado.

O GitHub Pages hospeda apenas conteúdo estático. Assim, a interface, o planejamento local e o cliente Supabase funcionam nessa rota; o OCR que ainda depende do servidor anterior não pode ser considerado disponível na hospedagem alternativa até receber um serviço independente compatível.

## Correção de estilos

Na primeira publicação, a página abriu sem estilos porque o GitHub Pages ignorou a pasta `_expo`, que contém os recursos gerados pelo Expo. A exportação agora recria automaticamente o arquivo `.nojekyll`, que preserva esses recursos.

Uma segunda falha foi identificada após atualizações posteriores: a exportação ainda mantinha o caminho-base do nome provisório `/estudo-organizado`, embora o repositório publicado se chame `-App-Estudo-Organizado`. O resultado era que a página procurava CSS e JavaScript em uma URL inexistente. O caminho-base e a rota de confirmação foram alinhados ao nome real do repositório; os recursos publicados passaram a responder com HTTP 200 e a tela de Chat foi revisada visualmente em uma URL com identificador de versão.

## Validação pendente

Ainda é necessário abrir a nova URL em um Galaxy Tab A9+ e testar o cadastro/entrada de duas contas confirmadas, chat público, conversa privada e sincronização de dados de estudo.

## Referências

[1] [Criar um site GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site)

[2] [Configurar uma fonte de publicação do GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
