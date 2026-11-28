import { Component, input, output } from '@angular/core';
import { MatExpansionModule } from '@angular/material/expansion';
import { ItemRows, type ItemEditRequest } from '../item-rows/item-rows.ts';
import type { ShoppingItem } from '../../models/shopping-list.ts';

@Component({
  selector: 'lj-purchased-items',
  imports: [ItemRows, MatExpansionModule],
  templateUrl: './purchased-items.html',
  styleUrl: './purchased-items.scss',
})
export class PurchasedItems {
  readonly items = input.required<ShoppingItem[]>();
  readonly disabled = input(false);
  readonly toggled = output<{ item: ShoppingItem; purchased: boolean }>();
  readonly edited = output<ItemEditRequest>();
  readonly removed = output<ShoppingItem>();
}
