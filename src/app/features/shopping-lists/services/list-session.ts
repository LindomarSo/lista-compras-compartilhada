import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { ListRepository, storageKey } from './list-repository.ts';
import { ApiError, messageOf } from './list-api.ts';
import type { ItemChange, ListReference, ListSnapshot, SavedList } from '../models/shopping-list.ts';

@Injectable()
export class ListSession {
  private readonly repository = inject(ListRepository);
  private readonly destroy = inject(DestroyRef);
  private request?: AbortController;
  private revision = 0;
  private nativeActive = true;
  readonly reference = signal<ListReference | null>(null);
  readonly snapshot = signal<ListSnapshot | null>(null);
  readonly status = signal<'loading' | 'ready' | 'offline' | 'error'>('loading');
  readonly busy = signal(false);
  readonly notice = signal('');
  readonly error = signal('');
  readonly canEdit = computed(() => this.status() === 'ready' && !this.busy());
  readonly canRetry = computed(() => ['error', 'offline'].includes(this.status()) && this.reference()?.kind === 'shared');

  constructor() {
    const refresh = () => {
      if (this.nativeActive && navigator.onLine && !document.hidden && this.reference()?.kind === 'shared') void this.refresh();
    };
    const offline = () => {
      if (this.reference()?.kind === 'shared') {
        this.cancelRequest();
        this.status.set('offline');
      }
    };
    const native = (event: Event) => {
      this.nativeActive = (event as CustomEvent<boolean>).detail;
      refresh();
    };
    const storage = (event: StorageEvent) => {
      if (this.reference()?.kind === 'local' && !this.busy() && (event.key === storageKey || event.key === null)) void this.refresh();
    };
    const interval = window.setInterval(refresh, 15000);
    window.addEventListener('online', refresh);
    window.addEventListener('offline', offline);
    window.addEventListener('lista-junto-native-active', native);
    window.addEventListener('storage', storage);
    document.addEventListener('visibilitychange', refresh);
    this.destroy.onDestroy(() => {
      ++this.revision;
      this.cancelRequest();
      window.clearInterval(interval);
      window.removeEventListener('online', refresh);
      window.removeEventListener('offline', offline);
      window.removeEventListener('lista-junto-native-active', native);
      window.removeEventListener('storage', storage);
      document.removeEventListener('visibilitychange', refresh);
    });
  }

  open(ref: ListReference): void {
    ++this.revision;
    this.cancelRequest();
    this.reference.set(ref);
    this.snapshot.set(this.repository.cached(ref) ?? null);
    this.status.set('loading');
    this.busy.set(false);
    this.notice.set('');
    this.error.set('');
    void this.refresh();
  }

  async refresh(): Promise<void> {
    const ref = this.reference();
    if (!ref || this.request || this.busy()) return;
    const controller = new AbortController();
    this.request = controller;
    try {
      const snapshot = await this.repository.open(ref, controller.signal);
      if (controller.signal.aborted) return;
      this.snapshot.set(snapshot);
      this.status.set('ready');
      this.error.set('');
    } catch (error) {
      if (controller.signal.aborted) return;
      const offline = error instanceof ApiError && error.code === 'NETWORK_ERROR';
      if (error instanceof ApiError && [401, 403, 404, 410].includes(error.status ?? 0)) {
        this.snapshot.set(null);
        if (ref.kind === 'shared' && [404, 410].includes(error.status ?? 0)) {
          try { this.repository.forget(ref.token); } catch { /* Storage can be unavailable. */ }
        }
      }
      this.status.set(offline ? 'offline' : 'error');
      this.error.set(messageOf(error));
    } finally {
      if (this.request === controller) this.request = undefined;
    }
  }

  async change(change: ItemChange, notice: string): Promise<boolean> {
    const snapshot = this.snapshot();
    if (!snapshot) return false;
    return (await this.run(async (ref, current) => {
      const next = await this.repository.change(ref, snapshot, change);
      if (current()) {
        this.snapshot.set(next);
        this.notice.set(notice);
      }
      return true;
    })) ?? false;
  }

  publish(): Promise<SavedList | null> {
    return this.run(async ref => this.repository.publish(ref));
  }

  delete(): Promise<boolean | null> {
    return this.run(async ref => {
      await this.repository.delete(ref);
      return true;
    });
  }

  private async run<T>(operation: (ref: ListReference, current: () => boolean) => Promise<T>): Promise<T | null> {
    const ref = this.reference();
    if (!ref || !this.canEdit()) return null;
    const revision = this.revision;
    const current = () => revision === this.revision;
    this.cancelRequest();
    this.busy.set(true);
    this.error.set('');
    this.notice.set('');
    try {
      const result = await operation(ref, current);
      return current() ? result : null;
    } catch (error) {
      if (current()) {
        this.error.set(messageOf(error));
        if (ref.kind === 'shared' && error instanceof ApiError && error.code === 'NETWORK_ERROR') this.status.set('offline');
      }
      return null;
    } finally {
      if (current()) this.busy.set(false);
    }
  }

  private cancelRequest(): void {
    this.request?.abort();
    this.request = undefined;
  }
}
