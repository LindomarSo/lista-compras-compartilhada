create table public.lista_junto_shared_lists (
  token_hash text primary key,
  name text not null,
  items jsonb not null default '[]'
);

alter table public.lista_junto_shared_lists enable row level security;
revoke all on public.lista_junto_shared_lists from public, anon, authenticated;

create function public.lista_junto_apply(key_hash text, payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  saved public.lista_junto_shared_lists%rowtype;
  operation text := payload->>'action';
  item_id text := payload->>'item_id';
  changes jsonb := payload->'fields';
  item jsonb;
  replacement jsonb;
  purchased boolean;
begin
  if operation = 'publish_list' then
    insert into public.lista_junto_shared_lists (token_hash, name, items)
    values (key_hash, payload->>'name', payload->'items')
    on conflict (token_hash) do update set name = excluded.name, items = excluded.items
    returning * into saved;
  elsif operation = 'get_list' then
    select * into saved from public.lista_junto_shared_lists where token_hash = key_hash;
  else
    select * into saved from public.lista_junto_shared_lists where token_hash = key_hash for update;
  end if;
  if not found then return jsonb_build_object('status', 404, 'error', 'Lista indisponível.'); end if;

  if operation in ('get_list', 'publish_list') then
    return jsonb_build_object('list', jsonb_build_object('name', saved.name), 'items', saved.items);
  elsif operation = 'delete_list' then
    delete from public.lista_junto_shared_lists where token_hash = key_hash;
    return jsonb_build_object('success', true);
  elsif operation = 'add_item' then
    if jsonb_array_length(saved.items) >= 1000 then
      return jsonb_build_object('status', 400, 'error', 'A lista pode ter até 1.000 produtos.');
    end if;
    item := changes || jsonb_build_object('id', gen_random_uuid(), 'purchased', false);
    update public.lista_junto_shared_lists
    set items = saved.items || jsonb_build_array(item) where token_hash = key_hash;
    return jsonb_build_object('item', item);
  end if;

  select value into item from jsonb_array_elements(saved.items) where value->>'id' = item_id;
  if not found then return jsonb_build_object('status', 404, 'error', 'Produto não encontrado.'); end if;

  if operation = 'delete_item' then
    select coalesce(jsonb_agg(value order by ord), '[]'::jsonb) into replacement
    from jsonb_array_elements(saved.items) with ordinality as entries(value, ord)
    where value->>'id' <> item_id;
    update public.lista_junto_shared_lists set items = replacement where token_hash = key_hash;
    return jsonb_build_object('success', true);
  end if;

  if changes ? 'purchased' then
    purchased := (changes->>'purchased')::boolean;
    if (item->>'purchased')::boolean is distinct from purchased then
      if purchased then
        changes := changes || jsonb_build_object(
          'purchased_at', statement_timestamp(), 'purchased_price', item->'estimated_price',
          'purchased_quantity', item->'quantity', 'purchased_unit', item->'unit'
        );
      else
        changes := changes || jsonb_build_object(
          'purchased_at', null, 'purchased_price', null, 'purchased_quantity', null, 'purchased_unit', null
        );
      end if;
    end if;
  end if;

  item := item || changes;
  select jsonb_agg(case when value->>'id' = item_id then item else value end order by ord) into replacement
  from jsonb_array_elements(saved.items) with ordinality as entries(value, ord);
  update public.lista_junto_shared_lists set items = replacement where token_hash = key_hash;
  return jsonb_build_object('item', item);
end;
$$;

revoke all on function public.lista_junto_apply(text, jsonb) from public, anon, authenticated;
grant execute on function public.lista_junto_apply(text, jsonb) to service_role;
