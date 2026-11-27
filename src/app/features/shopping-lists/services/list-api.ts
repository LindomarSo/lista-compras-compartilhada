import { supabaseKey } from '../../../core/platform.ts';
import { sharedPrefix } from '../models/links.ts';
import type { ListSnapshot, ShoppingItem } from '../models/shopping-list.ts';

const endpoint = 'https://oybwldwkedzabfyckjct.supabase.co/functions/v1/list-api';
const networkFailure = () => new ApiError('Não foi possível conectar ao serviço. Verifique sua internet e tente novamente.', { code: 'NETWORK_ERROR' });

export class ApiError extends Error {
  readonly options: { status?: number; code?: string };

  constructor(message: string, options: { status?: number; code?: string } = {}) {
    super(message);
    this.options = options;
    this.name = 'ApiError';
  }
  get status() { return this.options.status; }
  get code() { return this.options.code; }
}

export function messageOf(error: unknown): string {
  return error instanceof ApiError || error instanceof RangeError ? error.message : 'Não foi possível concluir. Tente novamente.';
}

type ApiBody = { action: string; token?: string } & Record<string, unknown>;
type ApiOptions = { fetchImpl?: typeof fetch; endpoint?: string; anonKey?: string; signal?: AbortSignal };

export async function callApi(body: ApiBody, options: ApiOptions = {}): Promise<Record<string, unknown>> {
  if (!body || typeof body.action !== 'string') throw new ApiError('Solicitação inválida.', { code: 'INVALID_REQUEST' });
  const { fetchImpl = globalThis.fetch, anonKey = supabaseKey() } = options;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (anonKey) {
    headers['apikey'] = anonKey;
    headers['Authorization'] = 'Bearer ' + anonKey;
  }
  const v2 = body.action === 'publish_list' || body.token?.startsWith(sharedPrefix);
  const timeout = AbortSignal.timeout(10000);
  const signal = options.signal ? AbortSignal.any([options.signal, timeout]) : timeout;
  let response: Response;
  try {
    response = await fetchImpl(options.endpoint ?? (v2 ? endpoint + '-v2' : endpoint), {
      method: 'POST', headers, body: JSON.stringify(body), signal,
    });
  } catch {
    throw networkFailure();
  }
  if (response.status === 504) throw networkFailure();
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    if (signal.aborted) throw networkFailure();
    throw new ApiError('O serviço retornou uma resposta inválida. Tente novamente.', { status: response.status, code: 'INVALID_RESPONSE' });
  }
  if (!response.ok) {
    const error = isRecord(payload) ? payload['error'] : undefined;
    throw new ApiError(typeof error === 'string' && error.length < 250 ? error : 'Não foi possível concluir a operação. Tente novamente.',
      { status: response.status, code: 'HTTP_ERROR' });
  }
  if (!isRecord(payload)) throw new ApiError('O serviço retornou dados em formato inesperado.');
  return payload;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function isItem(value: unknown): value is ShoppingItem {
  return isRecord(value) && typeof value['id'] === 'string' && typeof value['name'] === 'string';
}

export function isSnapshot(value: unknown): value is ListSnapshot {
  if (!isRecord(value)) return false;
  const list = value['list'];
  const items = value['items'];
  return isRecord(list) && typeof list['name'] === 'string' && Array.isArray(items) && items.every(isItem);
}

export function parseSnapshot(value: unknown): ListSnapshot {
  if (!isSnapshot(value)) throw new ApiError('O serviço retornou a lista em formato inesperado.');
  return { list: value.list, items: value.items };
}
