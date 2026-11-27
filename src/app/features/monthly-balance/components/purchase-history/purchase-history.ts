import { Component, input } from '@angular/core';
import { MatExpansionModule } from '@angular/material/expansion';
import { categories } from '../../../shopping-lists/models/shopping-list.ts';
import { formatCurrency } from '../../../../shared/format-currency.ts';
import type { PurchaseEntry } from '../../models/monthly-balance.ts';

@Component({
  selector: 'lj-purchase-history',
  imports: [MatExpansionModule],
  templateUrl: './purchase-history.html',
  styleUrl: './purchase-history.scss',
})
export class PurchaseHistory {
  readonly items = input.required<PurchaseEntry[]>();
  readonly categories = categories;
  readonly currency = formatCurrency;
}
