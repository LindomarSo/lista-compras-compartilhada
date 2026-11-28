import { Component, input } from '@angular/core';
import { LucideShoppingBag, LucideShoppingCart } from '@lucide/angular';
import { formatCurrency } from '../../../../shared/format-currency.ts';

@Component({
  selector: 'lj-total-card',
  imports: [LucideShoppingBag, LucideShoppingCart],
  templateUrl: './total-card.html',
  styleUrl: './total-card.scss',
})
export class TotalCard {
  readonly cents = input.required<number>();
  readonly count = input.required<number>();
  readonly missing = input.required<number>();
  readonly currency = formatCurrency;
}
