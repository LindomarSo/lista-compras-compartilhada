# Lista Junto

Frontend estático em Angular e Angular Material para GitHub Pages e Android com Capacitor. A aplicação web também funciona no caminho `/lista-compras-compartilhada/`.

## Rodar e validar

Use Node.js 24.15 ou superior da série 24. Instale as dependências com `npm ci` e rode `npm start` para desenvolver ou `npm test` para verificar as regras de negócio. O comando `npm run build` gera `dist/`, que o GitHub Pages publica e o Capacitor usa. Sirva essa pasta por HTTP local para verificar o service worker e o uso offline.

O frontend fica em `src/app/`. Cada feature reúne suas páginas, componentes, modelos e serviços. `core/` contém a navegação e a integração da plataforma. `shared/` concentra utilitários usados por mais de uma feature.

## Contrato confirmado da Edge Function

### Compartilhamento das listas novas

Listas novas funcionam no aparelho, inclusive sem internet. **Convidar** envia a lista e os itens em uma única operação para `list-api-v2`, que devolve o token do convite depois de gravar os dados. Repetir uma tentativa reutiliza o mesmo token. A versão antiga continua em `list-api`, e os convites anteriores seguem funcionando com esse contrato. Listas antigas não registram dados para o balanço mensal.

Para ativar o compartilhamento em um ambiente Supabase, confira as migrações remotas do projeto e aplique a migração em `supabase/migrations/` antes de publicar a nova função. A função usa o token do convite como autorização. Em produção, configure as origens da web e do Android com `LISTA_JUNTO_ORIGINS`. Acrescente a origem do servidor local quando estiver testando.

```sh
supabase db push
supabase secrets set LISTA_JUNTO_ORIGINS=https://lindomarso.github.io,https://localhost
supabase functions deploy list-api-v2 --no-verify-jwt
```

No Android, o modelo de OCR acompanha o app. Na web, o navegador baixa o modelo do próprio site na primeira leitura e pode reutilizá-lo offline pelo service worker. O quadro da câmera fica na memória do aparelho.

### Contrato anterior

A função anterior recebe `POST` JSON com `{ action, ...campos }` e responde JSON. O cliente Angular mantém as operações `get_list`, `add_item`, `update_item`, `delete_item` e `delete_list` para listas com token de 64 caracteres hexadecimais. A chave de serviço permanece exclusivamente no servidor da Edge Function.

A chave pública anon/publishable do Supabase pode ser configurada no `meta[name="supabase-anon-key"]` em `index.html` se for exigida pela configuração do projeto. Nunca use a `service_role` nesse campo. Sem a chave pública, o cliente chama a função sem cabeçalho `apikey`/`Authorization`.

## Configuração ainda a confirmar no Dashboard

O código colado define `verify_jwt` e a função permite qualquer origem (`Access-Control-Allow-Origin: *`). Para uso anônimo, verifique se a função está implantada com verificação JWT do gateway desativada; a validação SHA-256 do token da lista continua no código da função. A chave privada da lista é a autorização. O CORS deve ser restringido à origem de produção quando possível. Não tive acesso ao Dashboard para confirmar ou alterar esses itens.

O token de 256 bits é compartilhado por fragmento (`#token=...`), que não é enviado na requisição ao servidor Pages. O frontend guarda o token e a última versão da lista no armazenamento local deste dispositivo para **Minhas listas**. A lista aberta busca alterações a cada 15 segundos enquanto estiver visível e online, ao voltar para ela e ao reconectar. A cópia offline permite consulta. Nenhuma operação acessa as tabelas diretamente.

## Android com Capacitor

O projeto Android usa o identificador permanente `com.lindomarso.listajunto` e o nome `Lista Junto`. Para sincronizar o frontend com o projeto nativo, instale Android Studio e o Android SDK, depois rode:

```sh
npm ci
npm run android:sync
npm run android:open
```

O Android Studio pode gerar um Android App Bundle (AAB) assinado em **Build > Generate Signed Bundle / APK**. Preserve a chave de assinatura e não a armazene neste repositório. O projeto está configurado para target API 36, atualmente exigida para novos apps e atualizações na Play Store a partir de 31 de agosto de 2026 ([política de API da Play](https://support.google.com/googleplay/android-developer/answer/11926878?hl=en-EN)).

Os convites continuam apontando para `https://lindomarso.github.io/lista-compras-compartilhada/` e carregam o token no fragmento da URL. O app Android declara um App Link HTTPS para essa página. Para o Android verificar e abrir convites diretamente no app, publique também na raiz do domínio `https://lindomarso.github.io/.well-known/assetlinks.json` com o pacote `com.lindomarso.listajunto` e a impressão SHA-256 do certificado de assinatura usado pela Play Console. O exemplo está em `docs/assetlinks.json.example`. Como este repositório publica em um caminho de projeto, a associação na raiz do domínio precisa ser hospedada no site raiz de `lindomarso.github.io` ou o app deve passar a usar um domínio próprio. Sem esse arquivo no host, os convites ainda abrem no site, mas o Android não consegue confirmar automaticamente o App Link.

A ficha, o roteiro de capturas Android, os testes em dois celulares e o piloto estão em [docs/google-play-release.md](docs/google-play-release.md).

## Instalar no celular

O site inclui manifesto, ícone e service worker para instalação como aplicativo. Publique em HTTPS (GitHub Pages já oferece HTTPS). No Android, abra o site no Chrome e use **Instalar app** ou **Adicionar à tela inicial**. No iPhone, abra no Safari, toque em **Compartilhar** e escolha **Adicionar à Tela de Início**.
