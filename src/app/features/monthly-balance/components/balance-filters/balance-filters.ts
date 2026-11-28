import { numberLabel, preferences, t } from '../../../../core/locale.ts';
import { Component, computed, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule, type MatSelectChange } from '@angular/material/select';
import { LucideCalendarDays, LucideLayers } from '@lucide/angular';
import type { SavedList } from '../../../shopping-lists/models/shopping-list.ts';

@Component({
  selector: 'lj-balance-filters',
  imports: [MatButtonModule, MatFormFieldModule, MatSelectModule, LucideCalendarDays, LucideLayers],
  templateUrl: './balance-filters.html',
  styleUrl: './balance-filters.scss',
})
export class BalanceFilters {
  readonly t = t;
  readonly month = input.required<string>();
  readonly months = input.required<readonly string[]>();
  readonly rows = input.required<readonly SavedList[]>();
  readonly monthOptions = computed(() => {
    const locale = preferences().locale;
    const full = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric', timeZone: 'UTC' });
    const short = new Intl.DateTimeFormat(locale, { month: 'short', year: 'numeric', timeZone: 'UTC' });
    return this.months().map(value => {
      const date = new Date(value + '-01T00:00:00Z');
      return { value, full: full.format(date), short: short.format(date) };
    });
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
    if (this.selected() === null) return t('Todas as listas');
    const chosen = this.chosen();
    return chosen.length === 1 ? chosen[0]!.list.name : t('{count} listas selecionadas', { count: numberLabel(chosen.length) });
  }
}
