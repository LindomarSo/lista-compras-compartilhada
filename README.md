# Lista Junto

Frontend estático em HTML, CSS e JavaScript modular para GitHub Pages, incluindo o caminho `/lista-compras-compartilhada/`.

## Rodar e validar

Use Node.js 22 ou superior. Instale as dependências com `npm ci`, rode `npm test` e gere os arquivos estáticos com `npm run build`. Sirva a pasta `dist/` em um servidor local para conferir o app web. O workflow do GitHub Pages também publica `dist/`.

## Contrato confirmado da Edge Function

A função recebe `POST` JSON com `{ action, ...campos }`, responde JSON, e usa `create_list` sem token. As demais ações recebem `token` (64 caracteres hexadecimais). Os nomes de operações e propriedades já estão implementados em `src/app.js`: `get_list`, `add_item`, `update_item` e `delete_item`. A chave de serviço permanece exclusivamente no servidor da Edge Function.

A chave pública anon/publishable do Supabase pode ser configurada no `meta[name="supabase-anon-key"]` em `index.html` se for exigida pela configuração do projeto. Nunca use a `service_role` nesse campo. Sem a chave pública, o cliente chama a função sem cabeçalho `apikey`/`Authorization`.

## Configuração ainda a confirmar no Dashboard

O código colado define `verify_jwt` e a função permite qualquer origem (`Access-Control-Allow-Origin: *`). Para uso anônimo, verifique se a função está implantada com verificação JWT do gateway desativada; a validação SHA-256 do token da lista continua no código da função. A chave privada da lista é a autorização. O CORS deve ser restringido à origem de produção quando possível. Não tive acesso ao Dashboard para confirmar ou alterar esses itens.

O token de 256 bits é compartilhado por fragmento (`#token=...`), que não é enviado na requisição ao servidor Pages. O frontend não grava tokens em armazenamento persistente nem os imprime em logs. Nenhuma operação acessa as tabelas diretamente.

## Android com Capacitor

O projeto Android usa o identificador permanente `com.lindomarso.listajunto` e o nome `Lista Junto`. Para sincronizar o frontend com o projeto nativo, instale Android Studio e o Android SDK, depois rode:

```sh
npm ci
npm run android:sync
npm run android:open
```

O Android Studio pode gerar um Android App Bundle (AAB) assinado em **Build > Generate Signed Bundle / APK**. Preserve a chave de assinatura e não a armazene neste repositório. O projeto está configurado para target API 36, atualmente exigida para novos apps e atualizações na Play Store a partir de 31 de agosto de 2026 ([política de API da Play](https://support.google.com/googleplay/android-developer/answer/11926878?hl=en-EN)).

Os convites continuam apontando para `https://lindomarso.github.io/lista-compras-compartilhada/` e carregam o token no fragmento da URL. O app Android declara um App Link HTTPS para essa página. Para o Android verificar e abrir convites diretamente no app, publique também na raiz do domínio `https://lindomarso.github.io/.well-known/assetlinks.json` com o pacote `com.lindomarso.listajunto` e a impressão SHA-256 do certificado de assinatura usado pela Play Console. O exemplo está em `docs/assetlinks.json.example`. Como este repositório publica em um caminho de projeto, a associação na raiz do domínio precisa ser hospedada no site raiz de `lindomarso.github.io` ou o app deve passar a usar um domínio próprio. Sem esse arquivo no host, os convites ainda abrem no site, mas o Android não consegue confirmar automaticamente o App Link.

## Instalar no celular

O site inclui manifesto, ícone e service worker para instalação como aplicativo. Publique em HTTPS (GitHub Pages já oferece HTTPS). No Android, abra o site no Chrome e use **Instalar app** ou **Adicionar à tela inicial**. No iPhone, abra no Safari, toque em **Compartilhar** e escolha **Adicionar à Tela de Início**. A lista precisa de internet para sincronizar e compartilhar alterações.
