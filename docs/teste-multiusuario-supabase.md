# Roteiro de validação multiusuário — Estudo Organizado

Este roteiro valida o fluxo real do Supabase com **duas contas distintas e confirmadas**. As senhas não devem ser compartilhadas. Execute cada conta em um perfil de navegador diferente ou, idealmente, em dois dispositivos diferentes.

## Preparação

1. Abra o Estudo Organizado e entre na aba **Chat** usando a primeira conta.
2. Selecione **Criar conta**, informe nome, e-mail e uma senha de pelo menos oito caracteres. Após o aviso de confirmação, abra o e-mail recebido e conclua o link.
3. Repita o mesmo processo no segundo perfil ou dispositivo com a segunda conta.
4. Volte ao aplicativo e use **Entrar** com cada conta já confirmada. A tela deve exibir o status de conexão e manter a sessão após fechar e abrir novamente o aplicativo.

## Chat público

| Ação | Resultado esperado |
|---|---|
| A primeira conta envia uma mensagem na sala pública | A mensagem aparece imediatamente para a primeira conta. |
| A segunda conta abre a sala pública | A mesma mensagem aparece sem recarregar manualmente. |
| A segunda conta responde | A resposta chega à primeira conta em tempo real. |

## Chat privado e isolamento

| Ação | Resultado esperado |
|---|---|
| A primeira conta escolhe **Privado**, informa o e-mail da segunda e envia uma mensagem | A conversa aparece somente para as duas participantes. |
| A segunda conta abre o chat privado com o e-mail da primeira | A mensagem recebida aparece no mesmo histórico. |
| Troque para uma conversa com outro e-mail ou deixe o destinatário vazio | A mensagem privada anterior não deve aparecer. |

## Sincronização de estudos

1. Na primeira conta, crie ou edite uma matéria, um evento e um documento no **Editor de texto**.
2. Aguarde a indicação de sincronização concluída e abra a mesma conta no segundo perfil/dispositivo.
3. Confirme que os três registros aparecem sem duplicação. Edite um deles no segundo perfil e confirme que a alteração retorna ao primeiro.
4. Desative a conexão por um momento, faça uma alteração em um registro e reative a rede. A alteração deve entrar na fila local, ser enviada posteriormente e não criar cópias adicionais.

## Registro do resultado

Anote apenas se cada item foi aprovado, reprovado ou ficou bloqueado. Não envie senhas, links de confirmação, tokens, capturas de e-mail ou outros dados de acesso.
