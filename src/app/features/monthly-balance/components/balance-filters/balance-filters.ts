import { Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import type { SavedList } from '../../../shopping-lists/models/shopping-list.ts';

@Component({
  selector: 'lj-balance-filters',
  imports: [MatButtonModule, MatCheckboxModule, MatFormFieldModule, MatInputModule],
  templateUrl: './balance-filters.html',
  styleUrl: './balance-filters.scss',
})
export class BalanceFilters {
  readonly month = input.required<string>();
  readonly rows = input.required<readonly SavedList[]>();
  readonly chosen = input.required<readonly SavedList[]>();
  readonly selected = input.required<ReadonlySet<string> | null>();
  readonly refreshable = input(false);
  readonly refreshing = input(false);
  readonly monthChanged = output<string>();
  readonly listChanged = output<{ token: string; checked: boolean }>();
  readonly refresh = output<void>();

  title(): string {
    if (this.selected() === null) return 'Todas as listas';
    const chosen = this.chosen();
    return chosen.length === 1 ? chosen[0]!.list.name : chosen.length + ' listas selecionadas';
  }
}
