# Notas técnicas externas — arquivos e PDF

Fonte consultada: documentação local do Expo SDK 54 em `/home/ubuntu/estudo-organizado_helper/docs/storage/document-picker/DOCS.md`.

- `expo-document-picker` funciona em Android, iOS e web e deve ser usado com `copyToCacheDirectory: true` quando o arquivo será lido imediatamente por outras APIs.
- O resultado precisa verificar `result.canceled` antes de acessar `result.assets`.
- No iOS, a URI escolhida pode ser temporária; para acesso persistente, o arquivo precisa ser copiado para `FileSystem.documentDirectory`.
- A seleção múltipla usa `multiple: true` e pode aceitar tipos MIME como `application/pdf` e `image/*`.
- A documentação não fornece um visualizador PDF nativo; a estratégia de PDF completo precisa de um módulo/renderizador adicional ou de uma implementação própria compatível com a plataforma.

URL de referência: https://docs.expo.dev/versions/latest/sdk/document-picker/
