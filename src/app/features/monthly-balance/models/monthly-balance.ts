import { isCategory, itemSubtotal } from '../../shopping-lists/models/list-rules.ts';
import type { Category, ListSnapshot, ShoppingItem } from '../../shopping-lists/models/shopping-list.ts';

const monthFormat = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit',
});

export function purchaseMonth(date: Date | string = new Date()): string {
  const stamp = new Date(date);
  if (!Number.isFinite(stamp.getTime())) return '';
  const parts = monthFormat.formatToParts(stamp);
  return [parts.find(part => part.type === 'year')?.value, parts.find(part => part.type === 'month')?.value].join('-');
}

export interface CategoryTotal { category: Category; count: number; cents: number }
export interface PurchaseEntry extends ShoppingItem { listName: string; category: Category; subtotal: number | null }

export function monthlyBalance(rows: readonly ListSnapshot[], month: string) {
  const items: PurchaseEntry[] = [];
  const groups = new Map<Category, CategoryTotal>();
  let cents = 0;
  let missing = 0;
  for (const { list, items: listItems } of rows) {
    for (const item of listItems) {
      if (!item.purchased || !item.purchased_at || purchaseMonth(item.purchased_at) !== month) continue;
      const category = isCategory(item.category) ? item.category : 'other';
      const subtotal = itemSubtotal(item.purchased_quantity, item.purchased_price);
      const itemCents = Math.round((subtotal ?? 0) * 100);
      const group = groups.get(category) ?? { category, count: 0, cents: 0 };
      group.count++;
      group.cents += itemCents;
      groups.set(category, group);
      cents += itemCents;
      if (subtotal === null) missing++;
      items.push({ ...item, listName: list.name, category, subtotal });
    }
  }
  items.sort((a, b) => Date.parse(b.purchased_at ?? '') - Date.parse(a.purchased_at ?? ''));
  return { items, cents, missing, groups: [...groups.values()].sort((a, b) => b.cents - a.cents || b.count - a.count) };
}
