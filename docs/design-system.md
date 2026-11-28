# Design system do Lista Junto

Edite `src/design-system/tokens.css` para mudar os valores visuais compartilhados entre as telas, os componentes Angular Material e a página de privacidade. O prefixo `--lj-` identifica as variáveis do projeto. Use `--lj-color-action` para a cor dos botões principais e dos links e `--lj-font-family` para a fonte da interface.

`--lj-control-height` define a altura dos campos, seletores e botões. Mantenha esse valor em pelo menos 44 px. `--lj-radius-default` define o arredondamento dos controles e superfícies, incluindo cartões e diálogos. Indicadores em formato de cápsula usam `--lj-radius-pill`.

Reutilize um token quando os elementos tiverem a mesma função visual. Crie um token com nome semântico quando um elemento precisar variar de forma independente, como o destaque do total ou a máscara da câmera. Mantenha as regras de composição nos estilos dos componentes. Edite `src/design-system/_breakpoints.scss` para mudar os pontos de quebra compartilhados, que são resolvidos pelo Sass.

Quando alterar `--lj-color-browser-theme`, `--lj-color-pwa-theme` ou `--lj-color-pwa-background`, rode `npm run tokens:sync` para atualizar o HTML e o manifesto. Esses três tokens aceitam cores hexadecimais literais. `npm run tokens:check` detecta divergências e também roda no início do build.

A fonte variável Inter fica em `src/design-system/fonts/`, com a licença OFL. O CSS a carrega do próprio app, usa `system-ui` como fallback e o service worker inclui o arquivo no cache inicial. [Inter 4.1](https://github.com/rsms/inter/releases/tag/v4.1)

Os ícones Lucide são importados individualmente de `@lucide/angular` e renderizados como SVG no app. Use `class="lj-icon"` para aplicar `--lj-icon-size`. Marque os SVGs decorativos com `aria-hidden="true"` e dê um nome acessível ao botão quando ele contiver somente o ícone. O build inclui os ícones nos arquivos JavaScript que entram no cache inicial do PWA.

Confira as três telas, a página de privacidade, os diálogos e os estados de foco, erro e desabilitado. Rode `npm test` e `npm run build`. Para verificar o PWA, sirva `dist/` por HTTP local, carregue o app e teste a reabertura offline após a instalação do service worker. As cores e imagens nativas de abertura e dos ícones instaláveis são mantidas separadamente.
