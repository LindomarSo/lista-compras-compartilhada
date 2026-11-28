import { listCurrency, type Currency } from '../../../shared/locale-preferences.ts';
import { isCategory, itemSubtotal } from '../../shopping-lists/models/list-rules.ts';
import type { Category, ListSnapshot, ShoppingItem } from '../../shopping-lists/models/shopping-list.ts';

export const purchaseTimeZone = 'America/Sao_Paulo';
const monthFormat = new Intl.DateTimeFormat('en-US', {
  timeZone: purchaseTimeZone, year: 'numeric', month: '2-digit',
});

export function purchaseMonth(date: Date | string = new Date()): string {
  const stamp = new Date(date);
  if (!Number.isFinite(stamp.getTime())) return '';
  const parts = monthFormat.formatToParts(stamp);
  return [parts.find(part => part.type === 'year')?.value, parts.find(part => part.type === 'month')?.value].join('-');
}

export interface CategoryTotal { category: Category; count: number; cents: number }
export interface PurchaseEntry extends ShoppingItem {
  listName: string;
  category: Category;
  currency: Currency;
  purchased_at: string;
  subtotal: number | null;
}
interface CurrencyTotal {
  currency: Currency;
  count: number;
  cents: number;
  missing: number;
  groups: Map<Category, CategoryTotal>;
}

export function monthlyBalance(rows: readonly ListSnapshot[], month: string) {
  const items: PurchaseEntry[] = [];
  const totals = new Map<Currency, CurrencyTotal>();
  for (const { list, items: listItems } of rows) {
    const currency = listCurrency(list);
    for (const item of listItems) {
      if (!item.purchased || !item.purchased_at || purchaseMonth(item.purchased_at) !== month) continue;
      const total = totals.get(currency) ?? { currency, count: 0, cents: 0, missing: 0, groups: new Map() };
      const category = isCategory(item.category) ? item.category : 'other';
      const subtotal = itemSubtotal(item.purchased_quantity, item.purchased_price);
      const itemCents = Math.round((subtotal ?? 0) * 100);
      const group = total.groups.get(category) ?? { category, count: 0, cents: 0 };
      group.count++;
      group.cents += itemCents;
      total.groups.set(category, group);
      total.count++;
      total.cents += itemCents;
      if (subtotal === null) total.missing++;
      totals.set(currency, total);
      items.push({ ...item, listName: list.name, purchased_at: item.purchased_at, currency, category, subtotal });
    }
  }
  items.sort((a, b) => Date.parse(b.purchased_at) - Date.parse(a.purchased_at));
  return {
    items,
    totals: [...totals.values()].sort((a, b) => a.currency.localeCompare(b.currency)).map(({ groups, ...total }) => ({
      ...total, groups: [...groups.values()].sort((a, b) => b.cents - a.cents || b.count - a.count),
    })),
  };
}
