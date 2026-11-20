# Google Play release draft

## Store listing

- **App name:** Lista Junto
- **Suggested category:** Productivity
- **Short description:** Crie e compartilhe listas de compras com família e amigos.
- **Full description:**

  Organize as compras da casa em uma lista compartilhada. Crie uma lista, envie o link privado para quem vai comprar e acompanhe os itens em um só lugar.

  - Adicione produtos, quantidades, unidades, preços estimados e observações.
  - Marque o que já foi comprado e veja o total estimado.
  - Compartilhe a lista por link, sem criar uma conta.

  É necessária conexão com a internet para carregar e atualizar listas.

## Materiais e configuração pendentes

- Criar a política de privacidade em uma URL pública HTTPS e informar essa URL na Play Console.
- Confirmar com a implementação da Edge Function/Supabase quais dados são armazenados, por quanto tempo, como são apagados e quais logs ou subprocessadores existem; usar essa confirmação para concluir a política e o formulário Data safety.
- Capturar telas do app Android em aparelho/emulador: início, lista vazia, lista com itens, item comprado e compartilhamento. Usar os tamanhos aceitos pela Play Console ao iniciar o cadastro.
- Configurar Google Play App Signing e guardar a chave de upload em local seguro fora do repositório.
- Obter o SHA-256 do certificado de assinatura da Play, preencher `docs/assetlinks.json.example` e publicar o arquivo no caminho `.well-known/assetlinks.json` na raiz do domínio usado pelos convites.
- Criar o cadastro do app com o identificador permanente `com.lindomarso.listajunto`, revisar declarações de conteúdo/acesso e enviar o AAB para teste interno antes da faixa de produção.

## Dados conhecidos para revisão de Data safety

- Não há cadastro/login de usuário no cliente atual.
- Nome da lista, itens, quantidades, unidades, preços e observações são enviados à Edge Function do Supabase para operações da lista.
- O link contém um token privado no fragmento da URL; o cliente usa esse token para autorizar operações e não o grava em armazenamento persistente.
- O cliente não inclui SDK de anúncios ou analytics no código atual.
- Retenção, logs de servidor, exclusão completa da lista e subprocessadores precisam ser confirmados no backend antes de declarar os dados como não coletados ou temporários.
