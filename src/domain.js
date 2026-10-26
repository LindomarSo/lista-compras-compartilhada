export function validateItem(item) {
  const errors = {};
  if (!item || typeof item.name !== "string" || !item.name.trim()) errors.name = "Informe o nome do produto.";
  else if (item.name.trim().length > 120) errors.name = "Use até 120 caracteres no nome.";
  if (item?.quantity !== undefined && item.quantity !== "") {
    const quantity = Number(item.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0 || quantity > 1000000) errors.quantity = "A quantidade deve ser maior que zero.";
  }
  if (item?.unitPrice !== undefined && item.unitPrice !== "") {
    const price = Number(item.unitPrice);
    if (!Number.isFinite(price) || price < 0 || price > 100000000) errors.unitPrice = "Informe um preço válido e não negativo.";
  }
  if (item?.notes !== undefined && (typeof item.notes !== "string" || item.notes.length > 500)) errors.notes = "As observações devem ter até 500 caracteres.";
  return errors;
}
export function itemSubtotal(quantity, unitPrice) {
  const q = Number(quantity), p = Number(unitPrice);
  if (quantity === "" || quantity == null || unitPrice === "" || unitPrice == null || !Number.isFinite(q) || !Number.isFinite(p) || q < 0 || p < 0) return null;
  return Math.round((q * p + Number.EPSILON) * 100) / 100;
}
export function listTotal(items) {
  return items.reduce((sum, item) => sum + (itemSubtotal(item.quantity, item.unitPrice) ?? 0), 0);
}
export function formatCurrency(value) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}
