# Google Play release draft

## Store listing

- **App name (pt-BR):** Lista Junto – Lista de compras
- **Suggested category:** Productivity
- **Short description (pt-BR):** Monte a lista, convide pelo WhatsApp e comprem juntos. Sem cadastro.
- **Full description:**

  Organize as compras da casa em uma lista compartilhada. Crie uma lista, envie o link privado para quem vai comprar e acompanhe os itens em um só lugar.

  - Adicione um produto pelo nome e preencha quantidade, preço e observações quando precisar.
  - Veja o que falta comprar, marque o que já pegou e acompanhe o total estimado.
  - Convide pelo WhatsApp ou compartilhe o link. Quem receber pode participar pelo app ou pelo navegador, sem criar conta.

  É necessária conexão para criar listas, carregar convites pela primeira vez e enviar alterações. Listas já abertas ficam disponíveis para consulta neste dispositivo.

## Capturas e experimento

Capture o app Android com dados fictícios, usando a interface da versão enviada à Play. Prepare quatro imagens verticais em 1080 × 1920 px, em JPEG ou PNG sem transparência. Nos convites, use a tela de ações com o link oculto e sem contatos reais.

| Ordem | Tela | Texto sugerido |
| --- | --- | --- |
| 1 | Lista com o campo **Adicionar produto** em destaque | Monte a lista em segundos |
| 2 | Diálogo **Convidar para a lista** | Convide pelo WhatsApp |
| 3 | Duas capturas da mesma lista, após marcar um produto em outro celular | Comprem juntos |
| 4 | Lista com preços e **Total estimado** | Confira o total estimado |

Quando houver tráfego suficiente para um experimento na Play Console, compare a primeira captura com uma versão que diga **Uma lista para as compras da casa**, mantendo as imagens e os demais elementos iguais. Use a métrica de novos instaladores retidos oferecida pela Play Console e avalie o intervalo de confiança antes de escolher uma versão.

## Materiais e configuração pendentes

- Revisar a [política de privacidade](../privacidade.html), publicar pelo GitHub Pages e informar `https://lindomarso.github.io/lista-compras-compartilhada/privacidade.html` na Play Console.
- Confirmar com a implementação da Edge Function/Supabase quais dados são armazenados, por quanto tempo, como são apagados e quais logs ou subprocessadores existem; usar essa confirmação para concluir a política e o formulário Data safety.
- Produzir as quatro capturas Android indicadas acima.
- Configurar Google Play App Signing e guardar a chave de upload em local seguro fora do repositório.
- Obter o SHA-256 do certificado de assinatura da Play, preencher `docs/assetlinks.json.example` e publicar o arquivo no caminho `.well-known/assetlinks.json` na raiz do domínio usado pelos convites.
- Criar o cadastro do app com o identificador permanente `com.lindomarso.listajunto`, revisar declarações de conteúdo/acesso e enviar o AAB para teste interno antes da faixa de produção.
- Depois de confirmar que a ficha pública abre para usuários no Brasil, preencher a meta `play-store-url` em `index.html` com `https://play.google.com/store/apps/details?id=com.lindomarso.listajunto` e publicar a web. A opção aparece em convites abertos no navegador Android.

## Teste em dois celulares

1. Instale a versão assinada pela Play no primeiro Android. Confira o domínio como `verified` em `adb shell pm get-app-links com.lindomarso.listajunto` após publicar o `assetlinks.json` e executar `adb shell pm verify-app-links --re-verify com.lindomarso.listajunto`.
2. Crie **Compras da semana**, adicione um produto só pelo nome e compartilhe via WhatsApp. No segundo celular, abra o convite sem o app e marque o produto. Confirme a mudança no primeiro aparelho dentro de um ciclo de atualização de 15 segundos, somado ao tempo da requisição.
3. Instale a versão de teste no segundo Android e reabra o mesmo convite com o app fechado e depois em execução. Nas duas situações, confirme que abre a lista do convite. Com o app em segundo plano, altere um item no outro dispositivo e confira a atualização ao voltar.
4. Reabra a lista em **Minhas listas** sem rede, confira o aviso e reative a conexão. Confirme que a edição é liberada após a atualização e que o rascunho do produto permanece enquanto chegam alterações.
5. Com TalkBack, percorra o campo de produto, **Convidar**, o menu da lista, o checkbox e o menu de cada item. Confirme a marcação, a abertura do menu e o retorno do foco ao fechar o diálogo.

## Piloto com 10 duplas

Convide 10 duplas a fazer uma compra real. Observe cada dupla usando um identificador como `D01`, sem registrar o link da lista, nomes de produtos ou contatos. Registre tempo da abertura inicial até o primeiro item, envio de convite, primeira ação da outra pessoa e se a mesma lista foi reutilizada em sete dias. Acompanhe manualmente os campos abaixo.

| Dupla | Primeiro item (s) | Convite enviado? | Outra pessoa adicionou ou marcou? | Reutilizou em até 7 dias? | Onde houve dificuldade |
| --- | --- | --- | --- | --- | --- |
| D01 | | | | | |

A métrica principal é o número de listas compartilhadas com pelo menos uma ação da outra pessoa dividido pelo número de listas compartilhadas no piloto. Registre também quantas duplas chegaram a compartilhar e quantas voltaram em sete dias.

## Dados conhecidos para revisão de Data safety

- Não há cadastro/login de usuário no cliente atual.
- Nome da lista, itens, quantidades, unidades, preços e observações são enviados à Edge Function do Supabase para operações da lista.
- O link contém um token privado no fragmento da URL. O cliente guarda o token e a última versão da lista no armazenamento local para reabrir listas e consultá-las sem conexão.
- O cliente não inclui SDK de anúncios ou analytics no código atual.
- Retenção, logs de servidor, exclusão completa da lista e subprocessadores precisam ser confirmados no backend antes de declarar os dados como não coletados ou temporários.
