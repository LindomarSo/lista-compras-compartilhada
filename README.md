# Lista Junto

Frontend estático em Angular e Angular Material para GitHub Pages e Android com Capacitor. A aplicação web também funciona no caminho `/lista-compras-compartilhada/`.

## Rodar e validar

Use Node.js 24.15 ou superior da série 24. Instale as dependências com `npm ci` e rode `npm start` para desenvolver ou `npm test` para verificar as regras de negócio. O comando `npm run build` gera `dist/`, que o GitHub Pages publica e o Capacitor usa. Sirva essa pasta por HTTP local para verificar o service worker e o uso offline.

Consulte o [design system](docs/design-system.md) para ajustar os estilos compartilhados e as cores do PWA.

O frontend fica em `src/app/`. Cada feature reúne suas páginas, componentes, modelos e serviços. `core/` contém a navegação e a integração da plataforma. `shared/` concentra utilitários usados por mais de uma feature.

## Contrato confirmado da Edge Function

### Compartilhamento das listas novas

Listas novas funcionam no aparelho, inclusive sem internet. O idioma segue a preferência do dispositivo em português do Brasil, inglês ou espanhol. As traduções acompanham o app e ficam no cache do PWA. A região define a moeda quando a lista é criada. BRL é a moeda padrão e também é usada pelas listas existentes. USD, EUR e MXN são definidos nas regiões compatíveis. O Balanço apresenta os valores por moeda e preserva o mês de compra no fuso de São Paulo.

**Convidar** publica a lista e seus itens numa operação e recebe o token após a gravação. A mesma tentativa reutiliza o token. BRL usa `list-api-v2`. USD, EUR e MXN usam `list-api-v3` com prefixo próprio, que impede acesso pelas APIs de versões que tratavam todos os preços como reais. O convite orienta quem usa uma versão anterior a atualizar o app ou abrir a versão web. A função `list-api` continua atendendo aos convites legados.

Valide primeiro em um projeto Supabase de teste com um convite antigo em BRL e um novo em cada moeda. Confira as migrações já aplicadas no projeto de destino para evitar reaplicar as anteriores. Aplique a migração de moeda antes das funções e publique a versão web antes da distribuição do Android. Configure `LISTA_JUNTO_ORIGINS` com as origens da web e do Android e inclua a origem do servidor local no ambiente de teste.

```sh
supabase db push
supabase secrets set LISTA_JUNTO_ORIGINS=https://lindomarso.github.io,https://localhost
supabase functions deploy list-api-v2 --no-verify-jwt
supabase functions deploy list-api-v3 --no-verify-jwt
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

### Gerar o AAB pelo GitHub Actions

Configure os quatro *repository secrets* em **Settings → Secrets and variables → Actions**. Use a chave de upload já cadastrada na Play Console para o pacote `com.lindomarso.listajunto`.

| Secret | Valor |
| --- | --- |
| `ANDROID_UPLOAD_KEYSTORE_BASE64` | Conteúdo do arquivo de chave de upload (.jks ou .keystore) em Base64 |
| `ANDROID_UPLOAD_STORE_PASSWORD` | Senha do arquivo de chave |
| `ANDROID_UPLOAD_KEY_ALIAS` | Alias da chave de upload |
| `ANDROID_UPLOAD_KEY_PASSWORD` | Senha da chave de upload. Se for igual à senha do arquivo, use o mesmo valor. |

No PowerShell, com o GitHub CLI autenticado e a partir do repositório, envie a chave direto para o secret substituindo o caminho de exemplo pelo caminho do seu arquivo.

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes('C:\caminho\chave-upload.jks')) | gh secret set ANDROID_UPLOAD_KEYSTORE_BASE64
```

1. Com o workflow na `main`, abra **Actions → Gerar AAB para Google Play → Run workflow** e selecione `main`.
2. Preencha `version_code` com um inteiro maior que o maior código já enviado à Play Console. Preencha `version_name` com a versão exibida aos usuários, por exemplo `1.0.1`.
3. Abra a execução concluída e baixe `lista-junto-<version_code>-r<tentativa>.aab` em **Artifacts**. O download fica disponível por 14 dias. Envie o AAB pela Play Console à faixa desejada.

Para testar diretamente no Android, marque `test_only` ao iniciar o workflow. Baixe e instale o APK de teste. Esse build usa assinatura de debug e o pacote separado `com.lindomarso.listajunto.teste`, que pode coexistir com o app de produção. O AAB gerado nessa opção também usa o pacote e a assinatura de teste.

O fluxo Android funciona em repositório privado com GitHub Actions habilitado e é independente do GitHub Pages, que hospeda a página de privacidade e a web dos convites.

Os convites continuam apontando para `https://lindomarso.github.io/lista-compras-compartilhada/` e carregam o token no fragmento da URL. O app Android declara um App Link HTTPS para essa página. Para o Android verificar e abrir convites diretamente no app, publique também na raiz do domínio `https://lindomarso.github.io/.well-known/assetlinks.json` com o pacote `com.lindomarso.listajunto` e a impressão SHA-256 do certificado de assinatura usado pela Play Console. O exemplo está em `docs/assetlinks.json.example`. Como este repositório publica em um caminho de projeto, a associação na raiz do domínio precisa ser hospedada no site raiz de `lindomarso.github.io` ou o app deve passar a usar um domínio próprio. Sem esse arquivo no host, os convites ainda abrem no site, mas o Android não consegue confirmar automaticamente o App Link.

A ficha, o roteiro de capturas Android, os testes em dois celulares e o piloto estão em [docs/google-play-release.md](docs/google-play-release.md).

## Instalar no celular

O site inclui manifesto, ícone e service worker para instalação como aplicativo. Publique em HTTPS (GitHub Pages já oferece HTTPS). No Android, abra o site no Chrome e use **Instalar app** ou **Adicionar à tela inicial**. No iPhone, abra no Safari, toque em **Compartilhar** e escolha **Adicionar à Tela de Início**.
