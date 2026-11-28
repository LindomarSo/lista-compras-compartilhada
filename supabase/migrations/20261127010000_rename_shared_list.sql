create function public.lista_junto_rename(key_hash text, new_name text)
returns jsonb
language sql
security definer
set search_path = ''
as $$
  with renamed as (
    update public.lista_junto_shared_lists
    set name = new_name
    where token_hash = key_hash
    returning name, items
  )
  select coalesce(
    (select jsonb_build_object('list', jsonb_build_object('name', name), 'items', items) from renamed),
    jsonb_build_object('status', 404, 'error', 'Lista indisponível.')
  );
$$;

revoke all on function public.lista_junto_rename(text, text) from public, anon, authenticated;
grant execute on function public.lista_junto_rename(text, text) to service_role;
