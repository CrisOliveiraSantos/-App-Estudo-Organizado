# Pesquisa preliminar — IA local no Android

Data: 09 de setembro de 2026.

## Constatações oficiais

| Tecnologia | Constatação | Implicação para o Estudo Organizado |
|---|---|---|
| llama.cpp | O projeto mantém binding Android com exemplo em `examples/llama.android`; o fluxo lê metadados GGUF, carrega o modelo a partir do armazenamento privado do aplicativo e expõe tokens em Kotlin Flow. Também documenta compilação com Android NDK para `arm64-v8a`. | É o caminho mais direto para usar modelos GGUF no Android, mas exige módulo nativo Android e Development Build/prebuild, não apenas Expo Go ou GitHub Pages. |
| llama.cpp / Termux | A documentação mostra execução pelo Termux sem root, mas isso é uma experiência de terminal separada e não representa um terminal embutido seguro dentro do APK. A própria documentação alerta que contexto grande pode aumentar a memória e encerrar o processo. | Pode servir para desenvolvimento avançado, não deve ser usado como mecanismo de execução arbitrária dentro do aplicativo educacional. |
| ExecuTorch | A documentação Android oferece AAR via Maven Central, JNI e variantes de ABI `arm64-v8a` e `x86_64`; também menciona uso para LLM/LLaMA e backends XNNPACK, Vulkan e Qualcomm AI Engine. | É tecnicamente forte para inferência on-device, mas normalmente trabalha com modelos exportados/compilados para o runtime, não com GGUF diretamente; a integração nativa é mais complexa que llama.cpp. |
| MLC LLM | A documentação Android exige Android Studio, NDK, Rust e preparação/compilação de runtime e bibliotecas de modelo. O pacote permite baixar ou embutir pesos e declara requisitos de memória/VRAM; a documentação informa que aceleração significativa exige aparelho físico. | Pode oferecer boa aceleração, mas é a opção de maior complexidade operacional para o primeiro MVP. |

## Fontes

1. llama.cpp, `docs/android.md`: https://github.com/ggml-org/llama.cpp/blob/master/docs/android.md
2. PyTorch ExecuTorch, Using ExecuTorch on Android: https://docs.pytorch.org/executorch/1.0/using-executorch-android.html
3. MLC LLM, Android SDK: https://llm.mlc.ai/docs/deploy/android.html
4. Hugging Face, GGUF format: https://huggingface.co/docs/hub/en/gguf

## Recomendação provisória

Para o Galaxy Tab A9+ e um primeiro MVP, a recomendação é um módulo nativo Android baseado em llama.cpp, com modelo pequeno quantizado, baixado sob demanda e armazenado no espaço privado do aplicativo. A integração deve ser isolada em uma ponte nativa, com fallback explícito para modo remoto ou indisponível no web. O Chat protegido não deve compartilhar código, estado ou APIs com esse módulo.

## Compatibilidade com Expo e hardware

A documentação oficial do Expo informa que bibliotecas com código nativo não funcionam no Expo Go; é necessário um Development Build próprio. Para código nativo local, o Expo recomenda um módulo local via Expo Modules API, com Kotlin/Android e uma ponte TypeScript. A documentação também informa que, após instalar ou alterar código nativo, é preciso regenerar e recompilar o aplicativo com `expo prebuild`/`expo run:android` ou um build equivalente.

O Galaxy Tab A9+ oficial possui tela de 11 polegadas, opções de 4 GB/64 GB e 8 GB/128 GB, suporte a microSD de até 1 TB e CPU com frequências anunciadas de até 2,2 GHz. Isso favorece um modelo pequeno e carregado sob demanda, mas não justifica embutir um modelo grande no APK.

A orientação técnica da Arm sobre quantização explica que reduzir de FP32 para 4 bits pode diminuir bastante o tamanho dos pesos, mas com impacto de qualidade e custos de runtime; a escolha precisa equilibrar precisão, memória, banda e energia. Para o primeiro MVP, o alvo seguro é um modelo de aproximadamente 1 a 1,5 bilhão de parâmetros em quantização compatível, com contexto limitado e teste real no tablet.

## Modelos candidatos ao MVP

| Modelo | Ponto forte | Uso recomendado |
|---|---|---|
| Qwen2.5-Coder-1.5B | Cartão oficial especializado em geração, raciocínio e correção de código; licença Apache-2.0; 1,54B parâmetros e contexto declarado de 32.768 tokens no modelo base. | Melhor candidato inicial para explicar, completar e corrigir código. Deve ser usado em variante instruct/quantizada compatível com o runtime. |
| Gemma 3 1B IT | Modelo leve geral, multilíngue, com entrada de texto e imagem; contexto declarado de 32K na variante 1B. | Candidato para tutor geral de estudos, sujeito às condições de uso/licença Gemma e à conversão para o runtime escolhido. |
| SmolLM2 1.7B Instruct | Modelo compacto Apache-2.0, voltado a execução em dispositivo e com exemplos de inferência local. | Fallback geral leve; não é tão especializado em código quanto o Qwen Coder. |

Fontes adicionais: Samsung Galaxy Tab A9+ https://www.samsung.com/levant/tablets/galaxy-tab-a/galaxy-tab-a9-plus-wifi-graphite-64gb-sm-x210nzaamea/; Arm quantization https://developer.arm.com/community/arm-community-blogs/b/ai-blog/posts/llm-quantization-for-mobile-deployment; Qwen2.5-Coder https://huggingface.co/Qwen/Qwen2.5-Coder-1.5B; Gemma 3 1B https://huggingface.co/google/gemma-3-1b-it; SmolLM2 https://huggingface.co/HuggingFaceTB/SmolLM2-1.7B-Instruct; Expo custom native code https://docs.expo.dev/workflow/customizing/; Expo Development Builds https://docs.expo.dev/develop/development-builds/introduction/.

## Arquitetura proposta do Editor de Código e terminal

O Editor de Código deve ser uma área independente do Editor acadêmico, com projetos locais, pastas, arquivos, abas, busca, destaque de sintaxe, desfazer/refazer, autosave e execução por projeto. O núcleo de arquivos deve usar armazenamento privado do aplicativo, com exportação/importação explícita por seletor de documentos; não deve expor diretamente o sistema de arquivos inteiro do Android.

Para web, a edição pode usar um componente de editor de texto com destaque e o terminal deve permanecer simulado/educacional. Para Android, uma versão realmente integrada com execução exige Development Build e módulo nativo. A arquitetura deve manter uma interface TypeScript comum e duas implementações: `CodeWorkspaceWeb` sem execução arbitrária e `CodeWorkspaceAndroid` com capacidades nativas limitadas.

O terminal não deve ser um shell Linux irrestrito dentro do APK. A versão segura deve executar apenas comandos educacionais permitidos, como listar arquivos do projeto, criar pastas, executar testes simples e visualizar resultados. A lista inicial pode incluir `pwd` virtual, `ls`, `cat`, `mkdir`, `touch`, `node`/`python` apenas se houver runtime embutido e estritamente sandboxed; sem acesso a senhas, banco, rede, processos do sistema, `/data`, `adb`, root ou comandos destrutivos. Cada execução deve ter limite de tempo, memória, saída e espaço em disco.

Para suportar linguagens reais como JavaScript ou Python sem criar uma brecha, a opção preferida é interpretar somente um subconjunto/runner WASM com permissões isoladas, ou oferecer primeiro análise estática e testes pré-configurados. O terminal nativo completo deve ser uma etapa posterior, testada apenas em Development Build no Galaxy Tab A9+.

## Como o editor pode se inspirar em produtos profissionais sem copiá-los

A experiência pode combinar árvore de projeto, abas, painel de problemas, terminal inferior, busca global, comandos de teclado, snippets e assistente contextual. A identidade, os nomes, os ícones, o layout e os fluxos devem ser próprios do Estudo Organizado, direcionados à aprendizagem: cada projeto terá objetivos, exercícios, testes, explicações e histórico de estudo. A inspiração é funcional, não uma cópia visual ou de código.

## Roadmap recomendado

### MVP 1 — experiência de programação sem risco

Criar a navegação `Código` com projetos locais, árvore de arquivos, abas, busca, snippets, destaque de sintaxe, autosave, desfazer/refazer e exportação. Nesta etapa, o terminal é um console educacional simulado que executa apenas ações internas sobre o projeto, e a IA pode funcionar por integração remota opcional ou permanecer desativada no web.

### MVP 2 — IA local nativa

Criar um módulo local Expo/Android baseado em llama.cpp, com ponte TypeScript e armazenamento privado para o modelo. Baixar sob demanda uma variante quantizada pequena do modelo de código, verificar checksum, mostrar espaço ocupado, permitir apagar o modelo e oferecer um modo de teste com contexto curto. O app deve apresentar claramente quando a resposta é local e quando o modo offline não está disponível.

### MVP 3 — assistente contextual de programação

Adicionar ações selecionáveis no editor: explicar trecho, corrigir erro, completar código, gerar testes, criar resumo e sugerir exercícios. O conteúdo enviado ao modelo deve ser limitado ao projeto selecionado e ficar no dispositivo; nenhum arquivo do Chat ou dado do Supabase deve ser incluído automaticamente.

### MVP 4 — execução controlada

Somente depois de medir memória, bateria e estabilidade no Galaxy Tab A9+, adicionar um runner sandboxed. A primeira versão deve executar linguagens e comandos previamente aprovados em ambiente isolado, com limites de tempo, memória, saída e armazenamento. A opção de terminal Linux completo deve continuar desativada por padrão e não deve ser confundida com o terminal interno seguro.

### Critério de sucesso

O primeiro lançamento desta expansão só deve ser considerado pronto quando for possível criar um projeto, editar e salvar arquivos, pesquisar no projeto, pedir uma explicação local, apagar o modelo, usar o modo offline sem rede e sair sem alterar o Chat, o Supabase ou os documentos acadêmicos existentes.
