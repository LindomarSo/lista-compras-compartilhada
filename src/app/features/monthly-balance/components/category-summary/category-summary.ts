import { numberLabel, t } from '../../../../core/locale.ts';
import { Component, input } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { LucideTag } from '@lucide/angular';
import { categories } from '../../../shopping-lists/models/shopping-list.ts';
import type { Currency } from '../../../../shared/locale-preferences.ts';
import { formatCurrency } from '../../../../shared/format-currency.ts';
import type { CategoryTotal } from '../../models/monthly-balance.ts';

@Component({
  selector: 'lj-category-summary',
  imports: [MatCardModule, LucideTag],
  templateUrl: './category-summary.html',
  styleUrl: './category-summary.scss',
})
export class CategorySummary {
  readonly t = t;
  readonly groups = input.required<CategoryTotal[]>();
  readonly cents = input.required<number>();
  readonly categories = categories;
  readonly currency = input.required<Currency>();
  readonly showCode = input(false);
  readonly formatCurrency = formatCurrency;
  readonly numberLabel = numberLabel;
}
