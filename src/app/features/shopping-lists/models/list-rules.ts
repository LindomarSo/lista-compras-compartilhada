import { categories } from './shopping-list.ts';
import type { Category, ItemChange, ListSnapshot, ShoppingItem } from './shopping-list.ts';

type Numeric = string | number | null | undefined;

export function validateItem(item: { name?: unknown; quantity?: Numeric; unitPrice?: Numeric; notes?: unknown } | null) {
  const errors: Partial<Record<'name' | 'quantity' | 'unitPrice' | 'notes', string>> = {};
  if (typeof item?.name !== 'string' || !item.name.trim()) errors.name = 'Informe o nome do produto.';
  else if (item.name.trim().length > 120) errors.name = 'Use até 120 caracteres no nome.';
  if (item?.quantity != null && item.quantity !== '') {
    const quantity = Number(item.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0 || quantity > 1000000) errors.quantity = 'Informe uma quantidade maior que zero e de até {max}.';
  }
  if (item?.unitPrice != null && item.unitPrice !== '') {
    const price = Number(item.unitPrice);
    if (!Number.isFinite(price) || price < 0 || price > 100000000) errors.unitPrice = 'Informe um preço válido e não negativo.';
  }
  if (item?.notes !== undefined && (typeof item.notes !== 'string' || item.notes.length > 500)) errors.notes = 'As observações devem ter até 500 caracteres.';
  return errors;
}

export function itemSubtotal(quantity: Numeric, unitPrice: Numeric): number | null {
  if (quantity === '' || quantity == null || unitPrice === '' || unitPrice == null) return null;
  const q = Number(quantity);
  const p = Number(unitPrice);
  if (!Number.isFinite(q) || !Number.isFinite(p) || q < 0 || p < 0) return null;
  return Math.round((q * p + Number.EPSILON) * 100) / 100;
}

export function itemUnitPrice(item: { estimated_price?: Numeric; unitPrice?: Numeric }): Numeric {
  return Object.hasOwn(item, 'estimated_price') ? item.estimated_price : item.unitPrice;
}

export function listTotal(items: ShoppingItem[]): number {
  return items.reduce((sum, item) => sum + Math.round((itemSubtotal(item.quantity, itemUnitPrice(item)) ?? 0) * 100), 0) / 100;
}

export function isCategory(value: unknown): value is Category {
  return typeof value === 'string' && Object.hasOwn(categories, value);
}

const keywords: [Category, RegExp][] = [
  ['produce', /\b(tomate|batata|cebola|alho|banana|maca|laranja|alface|cenoura|limao|mamao|abacate|uva|brocolis|verdura)\w*\b/],
  ['meat', /\b(carne|frango|bife|file|peixe|linguica|bacon|costela|patinho|acem|tilapia|atum)\w*\b/],
  ['dairy', /\b(leite|queijo|iogurte|manteiga|requeijao|ricota|mucarela|mussarela)\w*\b/],
  ['pantry', /\b(arroz|feijao|massa|macarrao|farinha|acucar|sal|cafe|pao|biscoito|molho|oleo|azeite|ovo|aveia)\w*\b/],
  ['drinks', /\b(agua|suco|refrigerante|cerveja|vinho|cha|energetico)s?\b/],
  ['cleaning', /\b(detergente|desinfetante|alvejante|amaciante|sabao|saboes|esponja|limpador)(s|es)?\b/],
  ['hygiene', /\b(shampoo|xampu|sabonete|desodorante|fralda|absorvente|dentifricio)\w*\b/],
];

export function suggestCategory(name: string): Category {
  const normalized = name.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');
  if (/\b(papel higienico|pasta de dente|creme dental|escova de dentes)\b/.test(normalized)) return 'hygiene';
  if (/\b(agua sanitaria|lava roupas|sabao em po)\b/.test(normalized)) return 'cleaning';
  return keywords.find(([, pattern]) => pattern.test(normalized))?.[0] ?? 'other';
}

export function purchaseSnapshot(item: ShoppingItem, purchased: boolean, now = new Date()): Partial<ShoppingItem> {
  return purchased ? {
    purchased: true, purchased_at: now.toISOString(), purchased_price: itemUnitPrice(item) ?? null,
    purchased_quantity: item.quantity, purchased_unit: item.unit,
  } : { purchased: false, purchased_at: null, purchased_price: null, purchased_quantity: null, purchased_unit: null };
}

export function newLocalToken(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)), byte => byte.toString(16).padStart(2, '0')).join('');
}

export function localResult(snapshot: ListSnapshot, change: ItemChange): ShoppingItem | null {
  if (change.action === 'add_item') {
    if (snapshot.items.length >= 1000) throw new RangeError('A lista pode ter até 1.000 produtos.');
    return { id: crypto.randomUUID(), purchased: false, ...change.fields };
  }
  const item = snapshot.items.find(entry => entry.id === change.id);
  if (!item) throw new Error('Produto não encontrado.');
  if (change.action === 'delete_item') return null;
  const fields = change.fields;
  const purchase = 'purchased' in fields && fields.purchased !== item.purchased ? purchaseSnapshot(item, fields.purchased) : {};
  return { ...item, ...fields, ...purchase };
}
