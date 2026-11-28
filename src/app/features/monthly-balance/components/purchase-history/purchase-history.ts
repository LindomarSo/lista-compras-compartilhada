import { numberLabel, preferences, t, unitLabel } from '../../../../core/locale.ts';
import { Component, input } from '@angular/core';
import { MatExpansionModule } from '@angular/material/expansion';
import { categories } from '../../../shopping-lists/models/shopping-list.ts';
import { formatCurrency } from '../../../../shared/format-currency.ts';
import { purchaseTimeZone, type PurchaseEntry } from '../../models/monthly-balance.ts';

@Component({
  selector: 'lj-purchase-history',
  imports: [MatExpansionModule],
  templateUrl: './purchase-history.html',
  styleUrl: './purchase-history.scss',
})
export class PurchaseHistory {
  readonly t = t;
  readonly items = input.required<PurchaseEntry[]>();
  readonly categories = categories;
  readonly formatCurrency = formatCurrency;
  readonly showCodes = input(false);
  readonly numberLabel = numberLabel;
  readonly unitLabel = unitLabel;

  date(value: string): string {
    return new Intl.DateTimeFormat(preferences().locale, { dateStyle: 'short', timeZone: purchaseTimeZone }).format(new Date(value));
  }
}
