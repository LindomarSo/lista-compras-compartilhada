const currencies = new Set(["USD", "EUR", "MXN"]);
const tokenPattern = /^[a-f0-9]{64}$/;
const uuidPattern = /^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/;
const categories = new Set(["produce", "meat", "dairy", "pantry", "drinks", "cleaning", "hygiene", "other"]);
const units = new Set(["un", "kg", "g", "l", "ml", "pacote", "caixa"]);
type Fields = Record<string, unknown>;
const actions = new Set(["publish_list", "get_list", "rename_list", "delete_list", "add_item", "update_item", "delete_item"]);
const configuredOrigins = Deno.env.get("LISTA_JUNTO_ORIGINS");
const origins = new Set(configuredOrigins?.split(",").map(origin => origin.trim().replace(/\/$/, "")));
const supabaseUrl = Deno.env.get("SUPABASE_URL");
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

function record(value: unknown): Fields {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Dados inválidos.");
  return value as Fields;
}

function label(value: unknown, max: number) {
  if (typeof value !== "string" || !value.trim() || value.trim().length > max) throw new Error("Nome inválido.");
  return value.trim();
}

function id(value: unknown, pattern: RegExp) {
  if (typeof value !== "string" || !pattern.test(value)) throw new Error("Identificador inválido.");
  return value;
}

function price(value: unknown) {
  if (value === null) return null;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 100000000) throw new Error("Preço inválido.");
  return value;
}

function quantity(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0 || value > 1000000) throw new Error("Quantidade inválida.");
  return value;
}

function option(value: unknown, values: Set<string>, message = "Unidade ou categoria inválida.") {
  if (typeof value !== "string" || !values.has(value)) throw new Error(message);
  return value;
}

function itemFields(row: Fields) {
  if (typeof row.notes !== "string" || row.notes.length > 500) throw new Error("Observações inválidas.");
  return {
    name: label(row.name, 120), quantity: quantity(row.quantity), unit: option(row.unit, units),
    estimated_price: price(row.estimated_price), notes: row.notes, category: option(row.category, categories),
  };
}

function publishedItem(value: unknown) {
  const row = record(value);
  if (typeof row.purchased !== "boolean") throw new Error("Estado de compra inválido.");
  const base = { ...itemFields(row), id: id(row.id, uuidPattern), purchased: row.purchased };
  if (!row.purchased) return base;
  if (typeof row.purchased_at !== "string" || !Number.isFinite(Date.parse(row.purchased_at))) throw new Error("Data de compra inválida.");
  return {
    ...base, purchased_at: new Date(row.purchased_at).toISOString(), purchased_price: price(row.purchased_price),
    purchased_quantity: quantity(row.purchased_quantity), purchased_unit: option(row.purchased_unit, units),
  };
}

async function digest(value: string) {
  const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
  return Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");
}

export function serveListApi(version: 2 | 3) {
  const sharedPrefix = version === 2 ? "a112da7a" : "f4d39a6c";
  Deno.serve(async request => {
    const origin = request.headers.get("origin");
    const headers = {
      "Access-Control-Allow-Origin": origin && origins.has(origin) ? origin : configuredOrigins ? "null" : "*",
      "Access-Control-Allow-Headers": "content-type, authorization, apikey",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Cache-Control": "no-store",
      "Content-Type": "application/json; charset=utf-8",
      Vary: "Origin",
    };
    const respond = (value: Fields, status = 200) => new Response(JSON.stringify(value), { status, headers });
    if (origin && configuredOrigins && !origins.has(origin)) {
      headers["Access-Control-Allow-Origin"] = "";
      return respond({ error: "Origem não permitida." }, 403);
    }
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
    if (request.method !== "POST") return respond({ error: "Método não permitido." }, 405);

    let token: string;
    let payload: Fields;
    let publish = false;
    try {
      const body = record(await request.json());
      const action = option(body.action, actions);
      publish = action === "publish_list";
      if (publish) {
        const key = id(body.publish_key, tokenPattern);
        token = sharedPrefix + (await digest("lista-junto-v" + version + ":" + key)).slice(sharedPrefix.length);
        if (!Array.isArray(body.items) || body.items.length > 1000) throw new Error("A lista pode ter até 1.000 produtos.");
        const items = body.items.map(publishedItem);
        if (new Set(items.map(item => item.id)).size !== items.length) throw new Error("Itens duplicados.");
        const list = record(body.list);
        if (version === 2 && list.currency !== undefined && list.currency !== "BRL") {
          throw new Error("Moeda inválida.");
        }
        const currency = version === 3 ? option(list.currency, currencies, "Moeda inválida.") : "BRL";
        payload = { action, name: label(list.name, 100), items, currency };
      } else {
        token = id(body.token, tokenPattern);
        if (!token.startsWith(sharedPrefix)) return respond({ error: "Lista indisponível." }, 404);
        payload = { action };
        if (action === "rename_list") payload.name = label(body.name, 100);
        if (action === "add_item") payload.fields = itemFields(body);
        if (action === "update_item" || action === "delete_item") payload.item_id = id(body.item_id, uuidPattern);
        if (action === "update_item") {
          if (Object.hasOwn(body, "purchased")) {
            if (typeof body.purchased !== "boolean") throw new Error("Estado de compra inválido.");
            payload.fields = { purchased: body.purchased };
          } else {
            payload.fields = itemFields(body);
          }
        }
      }
    } catch (error) {
      return respond({ error: error instanceof SyntaxError ? "Solicitação inválida." : (error as Error).message }, 400);
    }

    try {
      if (!supabaseUrl || !serviceKey) throw new Error("Serviço indisponível.");
      const keyHash = await digest(token);
      const renaming = payload.action === "rename_list";
      const operation = renaming ? "lista_junto_rename" : "lista_junto_apply";
      const args = renaming ? { key_hash: keyHash, new_name: payload.name } : { key_hash: keyHash, payload };
      const response = await fetch(supabaseUrl + "/rest/v1/rpc/" + operation, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: serviceKey, Authorization: "Bearer " + serviceKey },
        body: JSON.stringify(args),
      });
      if (!response.ok) throw new Error("Falha no banco de dados.");
      const { status, ...result } = record(await response.json());
      if (typeof status === "number") return respond(result, status);
      return respond(publish ? { ...result, token } : result);
    } catch {
      return respond({ error: "Não foi possível sincronizar. Tente novamente." }, 503);
    }
  });
}
