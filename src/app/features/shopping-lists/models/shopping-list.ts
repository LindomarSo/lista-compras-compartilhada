import type { Currency } from '../../../shared/locale-preferences.ts';

export const listNameMaxLength = 100;

export const categories = {
  produce: 'Hortifruti', meat: 'Açougue', dairy: 'Laticínios', pantry: 'Mercearia',
  drinks: 'Bebidas', cleaning: 'Limpeza', hygiene: 'Higiene', other: 'Outros',
} as const;

export type Category = keyof typeof categories;
export const units = ['un', 'kg', 'g', 'l', 'ml', 'pacote', 'caixa'] as const;

export interface ItemFields {
  name: string;
  quantity: number;
  unit: string;
  estimated_price: number | null;
  notes: string;
  category?: Category;
}

export interface ShoppingItem {
  id: string;
  name: string;
  quantity?: number | string | null;
  unit?: string;
  estimated_price?: number | string | null;
  unitPrice?: number | string | null;
  notes?: string;
  category?: Category;
  purchased?: boolean;
  purchased_at?: string | null;
  purchased_price?: number | string | null;
  purchased_quantity?: number | string | null;
  purchased_unit?: string | null;
}

export interface ListSnapshot {
  list: { name: string; currency?: Currency };
  items: ShoppingItem[];
}

export type ListKind = 'local' | 'shared';

export interface SavedList extends ListSnapshot {
  token: string;
  savedAt: string;
  local?: boolean;
  publishKey?: string;
}

export interface ListReference {
  token: string;
  kind: ListKind;
}

export type ItemChange = { action: 'add_item'; fields: ItemFields }
  | { action: 'update_item'; id: string; fields: ItemFields | { purchased: boolean } }
  | { action: 'delete_item'; id: string };
