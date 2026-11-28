import { Component, DestroyRef, inject, signal } from '@angular/core';
import { LucideChartNoAxesColumnIncreasing } from '@lucide/angular';
import { BalanceStore } from '../../services/balance-store.ts';
import { BalanceFilters } from '../../components/balance-filters/balance-filters.ts';
import { CategorySummary } from '../../components/category-summary/category-summary.ts';
import { PurchaseHistory } from '../../components/purchase-history/purchase-history.ts';
import { TotalCard } from '../../components/total-card/total-card.ts';

@Component({
  selector: 'lj-balance-page',
  imports: [BalanceFilters, CategorySummary, PurchaseHistory, TotalCard, LucideChartNoAxesColumnIncreasing],
  templateUrl: './balance-page.html',
  styleUrl: './balance-page.scss',
})
export class BalancePage {
  readonly store = inject(BalanceStore);
  private readonly controller = new AbortController();
  readonly refreshing = signal(false);
  readonly notice = signal('');

  constructor() {
    inject(DestroyRef).onDestroy(() => this.controller.abort());
  }

  setMonth(value: string): void {
    if (!value || /^\d{4}-(0[1-9]|1[0-2])$/.test(value)) this.store.month.set(value);
  }

  async refresh(): Promise<void> {
    if (this.refreshing()) return;
    if (!navigator.onLine) {
      this.notice.set('Sem conexão. O balanço usa as últimas listas salvas.');
      return;
    }
    this.refreshing.set(true);
    this.notice.set('Atualizando listas compartilhadas…');
    try {
      const complete = await this.store.refresh(this.controller.signal);
      if (!this.controller.signal.aborted) this.notice.set(complete ? 'Listas atualizadas.'
        : 'Algumas listas não puderam ser atualizadas. Exibindo a última versão salva.');
    } catch {
      if (!this.controller.signal.aborted) this.notice.set('Não foi possível atualizar. Exibindo a última versão salva.');
    } finally {
      this.refreshing.set(false);
    }
  }
}
