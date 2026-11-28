import { numberLabel, t } from '../../../../core/locale.ts';
import { Component, input } from '@angular/core';
import { LucideShoppingBag, LucideShoppingCart } from '@lucide/angular';
import type { Currency } from '../../../../shared/locale-preferences.ts';
import { formatCurrency } from '../../../../shared/format-currency.ts';

@Component({
  selector: 'lj-total-card',
  imports: [LucideShoppingBag, LucideShoppingCart],
  templateUrl: './total-card.html',
  styleUrl: './total-card.scss',
})
export class TotalCard {
  readonly t = t;
  readonly cents = input.required<number>();
  readonly count = input.required<number>();
  readonly missing = input.required<number>();
  readonly currency = input.required<Currency>();
  readonly showCode = input(false);
  readonly formatCurrency = formatCurrency;
  readonly numberLabel = numberLabel;
}
