import { Component, computed, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule, type MatSelectChange } from '@angular/material/select';
import { LucideCalendarDays, LucideLayers } from '@lucide/angular';
import type { SavedList } from '../../../shopping-lists/models/shopping-list.ts';
import { purchaseMonth } from '../../models/monthly-balance.ts';

const fullMonth = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const shortMonth = new Intl.DateTimeFormat('pt-BR', { month: 'short', year: 'numeric', timeZone: 'UTC' });

@Component({
  selector: 'lj-balance-filters',
  imports: [MatButtonModule, MatFormFieldModule, MatSelectModule, LucideCalendarDays, LucideLayers],
  templateUrl: './balance-filters.html',
  styleUrl: './balance-filters.scss',
})
export class BalanceFilters {
  readonly month = input.required<string>();
  readonly rows = input.required<readonly SavedList[]>();
  readonly monthOptions = computed(() => {
    const years = new Set([purchaseMonth().slice(0, 4), this.month().slice(0, 4)]);
    for (const row of this.rows()) {
      for (const item of row.items) {
        if (!item.purchased || !item.purchased_at) continue;
        const month = purchaseMonth(item.purchased_at);
        if (/^\d{4}-\d{2}$/.test(month)) years.add(month.slice(0, 4));
      }
    }
    return [...years].filter(Boolean).sort().reverse().flatMap(year =>
      Array.from({ length: 12 }, (_, index) => {
        const value = year + '-' + String(12 - index).padStart(2, '0');
        const date = new Date(value + '-01T00:00:00Z');
        return { value, full: fullMonth.format(date), short: shortMonth.format(date) };
      }),
    );
  });
  readonly monthLabel = computed(() => this.monthOptions().find(option => option.value === this.month()));
  readonly chosen = input.required<readonly SavedList[]>();
  readonly selected = input.required<ReadonlySet<string> | null>();
  readonly selectionValue = computed(() => {
    const tokens = this.chosen().map(row => row.token);
    return this.selected() === null ? ['', ...tokens] : tokens;
  });
  readonly refreshable = input(false);
  readonly refreshing = input(false);
  readonly monthChanged = output<string>();
  readonly listChanged = output<{ token: string; checked: boolean }>();
  readonly refresh = output<void>();

  changeLists({ source, value }: MatSelectChange<string[]>): void {
    // Material emits one change per option when Ctrl+A toggles the whole menu.
    queueMicrotask(() => {
      if (source.value !== value) return;
      const previous = this.selectionValue();
      const token = value.find(entry => !previous.includes(entry)) ??
        previous.find(entry => !value.includes(entry));
      if (token !== undefined) this.listChanged.emit({ token, checked: value.includes(token) });
    });
  }

  title(): string {
    if (this.selected() === null) return 'Todas as listas';
    const chosen = this.chosen();
    return chosen.length === 1 ? chosen[0]!.list.name : chosen.length + ' listas selecionadas';
  }
}
