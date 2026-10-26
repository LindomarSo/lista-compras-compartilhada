const API_URL = "https://oybwldwkedzabfyckjct.supabase.co/functions/v1/list-api";
const publicKey = typeof document !== "undefined" ? document.querySelector('meta[name="supabase-anon-key"]')?.content?.trim() : undefined;
export class ApiError extends Error {
  constructor(message, { status = null, code = "API_ERROR" } = {}) { super(message); this.name = "ApiError"; this.status = status; this.code = code; }
}
export async function callApi(body, { fetchImpl = globalThis.fetch, endpoint = API_URL, anonKey = publicKey } = {}) {
  if (!body || typeof body !== "object" || typeof body.action !== "string")
    throw new ApiError("Solicitação inválida.", { code: "INVALID_REQUEST" });
  const headers = { "Content-Type": "application/json" };
  if (anonKey) { headers.apikey = anonKey; headers.Authorization = `Bearer ${anonKey}`; }
  let response;
  try { response = await fetchImpl(endpoint, { method: "POST", headers, body: JSON.stringify(body) }); }
  catch { throw new ApiError("Não foi possível conectar ao serviço. Verifique sua internet e tente novamente.", { code: "NETWORK_ERROR" }); }
  let payload;
  try { payload = await response.json(); }
  catch { throw new ApiError("O serviço retornou uma resposta inválida. Tente novamente mais tarde.", { status: response.status, code: "INVALID_RESPONSE" }); }
  if (!response.ok) {
    const message = typeof payload?.error === "string" && payload.error.length < 250 ? payload.error : "Não foi possível concluir a operação. Tente novamente.";
    throw new ApiError(message, { status: response.status, code: "HTTP_ERROR" });
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload))
    throw new ApiError("O serviço retornou dados em formato inesperado.", { status: response.status, code: "INVALID_RESPONSE" });
  return payload;
}

