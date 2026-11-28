import { Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import type { MatCheckboxChange } from '@angular/material/checkbox';
import { LucidePencil, LucideTrash } from '@lucide/angular';
import { categories } from '../../models/shopping-list.ts';
import type { ShoppingItem } from '../../models/shopping-list.ts';
import { isCategory, itemSubtotal, itemUnitPrice } from '../../models/list-rules.ts';
import { formatCurrency } from '../../../../shared/format-currency.ts';

export interface ItemEditRequest {
  item: ShoppingItem;
  trigger: HTMLButtonElement;
}

@Component({
  selector: 'lj-item-rows',
  imports: [MatButtonModule, MatCheckboxModule, LucidePencil, LucideTrash],
  templateUrl: './item-rows.html',
  styleUrl: './item-rows.scss',
})
export class ItemRows {
  readonly items = input.required<ShoppingItem[]>();
  readonly disabled = input(false);
  readonly toggled = output<{ item: ShoppingItem; purchased: boolean }>();
  readonly edited = output<ItemEditRequest>();
  readonly removed = output<ShoppingItem>();
  readonly currency = formatCurrency;

  requestEdit(item: ShoppingItem, event: MouseEvent): void {
    if (event.currentTarget instanceof HTMLButtonElement) this.edited.emit({ item, trigger: event.currentTarget });
  }

  details(item: ShoppingItem): string {
    return [item.quantity != null ? item.quantity + ' ' + (item.unit || 'un') : '',
      isCategory(item.category) ? categories[item.category] : '', item.notes].filter(Boolean).join(' · ');
  }

  subtotal(item: ShoppingItem): number | null {
    return itemSubtotal(item.quantity, itemUnitPrice(item));
  }

  unitPrice(item: ShoppingItem): number {
    return Number(itemUnitPrice(item));
  }

  toggle(item: ShoppingItem, change: MatCheckboxChange): void {
    const purchased = change.checked;
    change.source.checked = item.purchased === true;
    this.toggled.emit({ item, purchased });
  }
}
