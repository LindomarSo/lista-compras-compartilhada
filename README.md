# Lista Junto

Frontend estático em HTML, CSS e JavaScript modular para GitHub Pages, incluindo o caminho `/lista-compras-compartilhada/`.

## Rodar e validar

Abra `index.html` em um servidor estático local. Rode `npm test` nesta pasta (Node.js 20+).

## Contrato confirmado da Edge Function

A função recebe `POST` JSON com `{ action, ...campos }`, responde JSON, e usa `create_list` sem token. As demais ações recebem `token` (64 caracteres hexadecimais). Os nomes de operações e propriedades já estão implementados em `src/app.js`: `get_list`, `add_item`, `update_item` e `delete_item`. A chave de serviço permanece exclusivamente no servidor da Edge Function.

A chave pública anon/publishable do Supabase pode ser configurada no `meta[name="supabase-anon-key"]` em `index.html` se for exigida pela configuração do projeto. Nunca use a `service_role` nesse campo. Sem a chave pública, o cliente chama a função sem cabeçalho `apikey`/`Authorization`.

## Configuração ainda a confirmar no Dashboard

O código colado define `verify_jwt` e a função permite qualquer origem (`Access-Control-Allow-Origin: *`). Para uso anônimo, verifique se a função está implantada com verificação JWT do gateway desativada; a validação SHA-256 do token da lista continua no código da função. A chave privada da lista é a autorização. O CORS deve ser restringido à origem de produção quando possível. Não tive acesso ao Dashboard para confirmar ou alterar esses itens.

O token de 256 bits é compartilhado por fragmento (`#token=...`), que não é enviado na requisição ao servidor Pages. O frontend não grava tokens em armazenamento persistente nem os imprime em logs. Nenhuma operação acessa as tabelas diretamente.
