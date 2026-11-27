import { Injectable, computed, inject, signal } from '@angular/core';
import { LIST_CATALOG } from '../../shopping-lists/interfaces/list-catalog.ts';
import { monthlyBalance, purchaseMonth } from '../models/monthly-balance.ts';

@Injectable({ providedIn: 'root' })
export class BalanceStore {
  private readonly catalog = inject(LIST_CATALOG);
  private readonly selection = signal<ReadonlySet<string> | null>(null);
  readonly month = signal(purchaseMonth());
  readonly rows = this.catalog.rows;
  readonly selected = computed(() => {
    const selection = this.selection();
    const replacements = this.catalog.replacements();
    return selection && new Set([...selection].map(token => replacements.get(token) ?? token));
  });
  readonly chosen = computed(() => {
    const selection = this.selected();
    return selection === null ? this.rows() : this.rows().filter(row => selection.has(row.token));
  });
  readonly summary = computed(() => monthlyBalance(this.chosen(), this.month() || purchaseMonth()));
  readonly refreshable = computed(() => this.chosen().some(row => !row.local));

  select(token: string, checked: boolean): void {
    if (!token) {
      this.selection.set(checked ? null : new Set());
      return;
    }
    const all = this.rows().map(row => row.token);
    const next = new Set(this.chosen().map(row => row.token));
    if (checked) next.add(token);
    else next.delete(token);
    this.selection.set(all.every(entry => next.has(entry)) ? null : next);
  }

  refresh(signal: AbortSignal): Promise<boolean> {
    return this.catalog.refresh(this.chosen().map(row => row.token), signal);
  }
}
