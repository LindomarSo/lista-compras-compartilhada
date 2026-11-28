import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { currencySharedPrefix, sharedPrefix, tokenPattern } from '../models/links.ts';
import { localResult, newLocalToken } from '../models/list-rules.ts';
import { listCurrency, type Currency } from '../../../shared/locale-preferences.ts';
import type { ItemChange, ListReference, ListSnapshot, SavedList } from '../models/shopping-list.ts';
import type { ListCatalog } from '../interfaces/list-catalog.ts';
import { ApiError, callApi, isItem, isRecord, isSnapshot, parseSnapshot } from './list-api.ts';

export const storageKey = 'lista-junto:saved-lists:v1';

function readRows(): SavedList[] {
  try {
    const rows: unknown = JSON.parse(localStorage.getItem(storageKey) || '[]');
    if (!Array.isArray(rows)) return [];
    return rows.filter((row): row is SavedList => isRecord(row) && typeof row['token'] === 'string'
      && tokenPattern.test(row['token']) && isSnapshot(row)).sort((a, b) => String(b.savedAt).localeCompare(String(a.savedAt)));
  } catch {
    return [];
  }
}

@Injectable({ providedIn: 'root' })
export class ListRepository implements ListCatalog {
  private readonly saved = signal(readRows());
  private readonly promotedTokens = signal<ReadonlyMap<string, string>>(new Map());
  readonly rows = this.saved.asReadonly();
  readonly replacements = this.promotedTokens.asReadonly();

  constructor() {
    const sync = (event: StorageEvent) => {
      if (event.key === storageKey || event.key === null) this.saved.set(readRows());
    };
    window.addEventListener('storage', sync);
    inject(DestroyRef).onDestroy(() => window.removeEventListener('storage', sync));
  }

  cached({ token, kind }: ListReference): SavedList | undefined {
    return readRows().find(row => row.token === token && Boolean(row.local) === (kind === 'local'));
  }

  create(name: string, currency: Currency): SavedList {
    const row = { list: { name, currency }, items: [], token: newLocalToken(), local: true, publishKey: newLocalToken(), savedAt: new Date().toISOString() };
    this.put(row);
    return row;
  }

  forget(token: string): void {
    this.write(readRows().filter(row => row.token !== token));
  }

  async open(ref: ListReference, signal: AbortSignal): Promise<ListSnapshot> {
    if (ref.kind === 'local') {
      const row = this.cached(ref);
      if (!row) throw new ApiError('Esta lista local não está salva neste aparelho.', { status: 404 });
      return row;
    }
    if (!navigator.onLine) throw new ApiError('Sem conexão para atualizar a lista.', { code: 'NETWORK_ERROR' });
    const snapshot = parseSnapshot(await callApi({ action: 'get_list', token: ref.token }, { signal }), ref.token);
    if (!signal.aborted) this.rememberRemote(ref.token, snapshot);
    return snapshot;
  }

  async change(ref: ListReference, snapshot: ListSnapshot, change: ItemChange): Promise<ListSnapshot> {
    const cached = this.cached(ref);
    let item;
    if (ref.kind === 'local') {
      if (!cached) throw new ApiError('Esta lista local não está salva neste aparelho.');
      snapshot = cached;
      item = localResult(snapshot, change);
    } else {
      const body = { action: change.action, token: ref.token, ...('id' in change ? { item_id: change.id } : {}),
        ...('fields' in change ? change.fields : {}) };
      const result = await callApi(body);
      if (change.action === 'delete_item') {
        if (result['success'] !== true) throw new ApiError('O serviço não confirmou a exclusão.');
        item = null;
      } else {
        item = result['item'];
        if (!isItem(item)) throw new ApiError('O serviço retornou o item em formato inesperado.');
      }
    }
    const items = item === null && 'id' in change ? snapshot.items.filter(entry => entry.id !== change.id)
      : isItem(item) ? snapshot.items.some(entry => entry.id === item.id)
        ? snapshot.items.map(entry => entry.id === item.id ? item : entry) : [...snapshot.items, item] : snapshot.items;
    const next = { list: snapshot.list, items };
    if (ref.kind === 'local' && cached) this.put({ ...cached, ...next });
    if (ref.kind === 'shared') this.rememberRemote(ref.token, next);
    return next;
  }

  async delete(ref: ListReference): Promise<void> {
    if (ref.kind === 'shared') {
      const result = await callApi({ action: 'delete_list', token: ref.token });
      if (result['success'] !== true) throw new ApiError('O serviço não confirmou a exclusão.');
    }
    this.forget(ref.token);
  }

  async rename(ref: ListReference, name: string): Promise<ListSnapshot> {
    if (ref.kind === 'shared') {
      const snapshot = parseSnapshot(await callApi({ action: 'rename_list', token: ref.token, name }), ref.token);
      this.rememberRemote(ref.token, snapshot);
      return snapshot;
    }
    const row = this.cached(ref);
    if (!row) throw new ApiError('Esta lista local não está salva neste aparelho.');
    const next = { ...row, list: { ...row.list, name } };
    this.put(next);
    return next;
  }

  async publish(ref: ListReference): Promise<SavedList> {
    if (!navigator.onLine) throw new ApiError('Conecte-se à internet para compartilhar esta lista.');
    const row = this.cached(ref);
    if (!row) throw new ApiError('Esta lista local não está salva neste aparelho.');
    const publishKey = row.publishKey || newLocalToken();
    if (!row.publishKey) this.put({ ...row, publishKey });
    const result = await callApi({ action: 'publish_list', publish_key: publishKey, list: row.list, items: row.items });
    const token = result['token'];
    const latest = this.cached(ref);
    if (!latest || latest.list.name !== row.list.name || JSON.stringify(latest.items) !== JSON.stringify(row.items)) {
      throw new ApiError('A lista mudou durante o compartilhamento. Abra a versão mais recente e tente novamente.');
    }
    if (typeof token !== 'string' || !tokenPattern.test(token) || !token.startsWith(listCurrency(row.list) === 'BRL' ? sharedPrefix : currencySharedPrefix)) {
      throw new ApiError('O serviço não confirmou a sincronização da lista.');
    }
    const snapshot = parseSnapshot(result, token);
    if (snapshot.list.currency !== listCurrency(row.list)) throw new ApiError('O serviço não confirmou a sincronização da lista.');
    const promoted = { ...snapshot, token, savedAt: row.savedAt };
    this.put(promoted, row.token);
    this.promotedTokens.update(entries => new Map(entries).set(row.token, token));
    return promoted;
  }

  async refresh(tokens: string[], signal: AbortSignal): Promise<boolean> {
    const queue = readRows().filter(row => !row.local && tokens.includes(row.token));
    let complete = navigator.onLine;
    await Promise.all(Array.from({ length: Math.min(4, queue.length) }, async () => {
      while (queue.length && !signal.aborted && navigator.onLine) {
        const row = queue.shift()!;
        try {
          const data = await callApi({ action: 'get_list', token: row.token }, { signal });
          if (!signal.aborted && this.isUnchanged(row)) this.rememberRemote(row.token, parseSnapshot(data, row.token));
        } catch (error) {
          if (!signal.aborted && this.isUnchanged(row) && error instanceof ApiError && [404, 410].includes(error.status ?? 0)) this.forget(row.token);
          else complete = false;
        }
      }
    }));
    return complete && !signal.aborted && navigator.onLine;
  }

  private isUnchanged(row: SavedList): boolean {
    return JSON.stringify(this.cached({ token: row.token, kind: 'shared' })) === JSON.stringify(row);
  }

  private rememberRemote(token: string, snapshot: ListSnapshot): void {
    const previous = this.cached({ token, kind: 'shared' });
    try {
      this.put({ ...snapshot, token, savedAt: previous?.savedAt ?? new Date().toISOString() });
    } catch {
      // A shared list remains usable in memory if the browser refuses local storage.
    }
  }

  private put(row: SavedList, replaces = row.token): void {
    const rows = readRows();
    if (replaces === row.token && JSON.stringify(rows.find(entry => entry.token === row.token)) === JSON.stringify(row)) return;
    this.write([row, ...rows.filter(entry => entry.token !== replaces && entry.token !== row.token)]);
  }

  private write(rows: SavedList[]): void {
    try {
      localStorage.setItem(storageKey, JSON.stringify(rows));
      this.saved.set([...rows].sort((a, b) => String(b.savedAt).localeCompare(String(a.savedAt))));
    } catch {
      throw new ApiError('Não foi possível salvar a alteração neste aparelho.');
    }
  }
}
