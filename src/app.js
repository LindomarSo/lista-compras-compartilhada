import { callApi, ApiError } from "./api.js";
import { validateItem, itemSubtotal, listTotal, formatCurrency } from "./domain.js";
import { readShareToken, makeShareLink } from "./links.js";
const $ = selector => document.querySelector(selector);
const home = $("#home"), listView = $("#list-view"), notice = $("#notice");
let token = readShareToken(), list = null, items = [], busy = false, editingId = null;
function message(text, isError = false) { notice.textContent = text; notice.classList.toggle("error", isError); notice.hidden = !text; }
function setBusy(value) {
  busy = value;
  document.querySelectorAll("button").forEach(button => { button.disabled = value; });
  if (!value) { syncCreateButton(); syncItemButton(); }
}
function syncCreateButton() { $("#create-button").disabled = busy || !$("#list-name").value.trim(); }
function syncItemButton() { $("#save-item").disabled = busy || !$("#item-name").value.trim(); }
async function run(action, fields = {}) { return callApi({ action, ...(action === "create_list" ? {} : { token }), ...fields }); }
function errorText(error) { return error instanceof ApiError ? error.message : "Ocorreu um erro inesperado. Tente novamente."; }
function shareUrl() { return makeShareLink(new URL(location.pathname, location.origin).href, token); }
function showList() { home.hidden = true; listView.hidden = false; $("#list-title").textContent = list.name; $("#share-link").value = shareUrl(); }
function render() {
  const target = $("#items"); target.replaceChildren();
  const pending = items.filter(item => !item.purchased), purchased = items.filter(item => item.purchased);
  $("#item-count").textContent = `${pending.length} pendente${pending.length === 1 ? "" : "s"} · ${purchased.length} comprado${purchased.length === 1 ? "" : "s"}`;
  $("#items-state").hidden = items.length > 0;
  $("#items-state").textContent = items.length ? "" : "Sua lista está vazia. Adicione o primeiro item acima.";
  for (const item of [...pending, ...purchased]) {
    const li = document.createElement("li"); li.className = `item-row${item.purchased ? " purchased" : ""}`;
    const check = document.createElement("input"); check.type = "checkbox"; check.checked = Boolean(item.purchased); check.setAttribute("aria-label", `${item.purchased ? "Desmarcar" : "Marcar"} ${item.name} como comprado`); check.dataset.toggle = item.id;
    const copy = document.createElement("div"); copy.className = "item-copy";
    const name = document.createElement("strong"); name.textContent = item.name; copy.append(name);
    const details = [item.quantity != null ? `${item.quantity} ${item.unit || "un"}` : null, item.notes].filter(Boolean).join(" · ");
    if (details) { const p = document.createElement("p"); p.textContent = details; copy.append(p); }
    const price = document.createElement("div"); price.className = "item-price";
    const subtotal = itemSubtotal(item.quantity, item.estimated_price);
    const mainPrice = document.createElement("strong"); mainPrice.textContent = subtotal === null ? "—" : formatCurrency(subtotal); price.append(mainPrice);
    if (item.estimated_price != null) { const small = document.createElement("small"); small.textContent = `${formatCurrency(Number(item.estimated_price))} / ${item.unit || "un"}`; price.append(small); }
    const actions = document.createElement("div"); actions.className = "item-actions";
    const edit = document.createElement("button"); edit.type = "button"; edit.textContent = "Editar"; edit.setAttribute("aria-label", `Editar ${item.name}`); edit.dataset.edit = item.id;
    const del = document.createElement("button"); del.type = "button"; del.textContent = "Excluir"; del.className = "delete"; del.setAttribute("aria-label", `Excluir ${item.name}`); del.dataset.delete = item.id;
    actions.append(edit, del); li.append(check, copy, price, actions); target.append(li);
  }
  $("#list-total").textContent = formatCurrency(listTotal(items));
}
function validListResponse(data) { return data && data.list && typeof data.list.name === "string" && Array.isArray(data.items) && data.items.every(i => i && typeof i.id === "string" && typeof i.name === "string"); }
async function loadList() {
  const data = await run("get_list");
  if (!validListResponse(data)) throw new ApiError("O serviço retornou a lista em formato inesperado.", { code: "INVALID_RESPONSE" });
  list = data.list; items = data.items; showList(); render();
}
$("#list-name").addEventListener("input", syncCreateButton);
$("#item-name").addEventListener("input", syncItemButton);
syncCreateButton();
syncItemButton();
function clearItemForm() { editingId = null; $("#item-form").reset(); $("#item-quantity").value = "1"; $("#item-form-title").textContent = "Adicionar item"; $("#save-item").textContent = "Adicionar item"; $("#cancel-edit").hidden = true; }
function editItem(item) { editingId = item.id; $("#item-name").value = item.name; $("#item-quantity").value = item.quantity ?? 1; $("#item-unit").value = item.unit || "un"; $("#item-price").value = item.estimated_price ?? ""; $("#item-notes").value = item.notes || ""; $("#item-form-title").textContent = "Editar item"; $("#save-item").textContent = "Salvar alterações"; $("#cancel-edit").hidden = false; $("#item-name").focus(); }
function itemFields() { return { name: $("#item-name").value.trim(), quantity: Number($("#item-quantity").value), unit: $("#item-unit").value, estimated_price: $("#item-price").value === "" ? null : Number($("#item-price").value), notes: $("#item-notes").value.trim() }; }
function localItem(data) { if (!data?.item || typeof data.item.id !== "string" || typeof data.item.name !== "string") throw new ApiError("O serviço retornou o item em formato inesperado.", { code: "INVALID_RESPONSE" }); return data.item; }
$("#create-form").addEventListener("submit", async event => {
  event.preventDefault(); if (busy) return;
  const name = $("#list-name").value.trim(); if (!name) return message("Informe o nome da lista.", true);
  setBusy(true); message(""); const button = $("#create-button"); button.disabled = true;
  try {
    const data = await run("create_list", { name });
    if (!data?.list || typeof data.list.name !== "string" || typeof data.token !== "string" || !/^[a-f0-9]{64}$/.test(data.token)) throw new ApiError("O serviço retornou dados inesperados ao criar a lista.", { code: "INVALID_RESPONSE" });
    token = data.token; list = data.list; items = []; location.hash = new URLSearchParams({ token }).toString(); showList(); render(); message("Lista criada. Compartilhe o link para convidar outras pessoas.");
  } catch (error) { message(errorText(error), true); }
  finally { setBusy(false); syncCreateButton(); }
});
$("#item-form").addEventListener("submit", async event => {
  event.preventDefault(); if (busy) return;
  const fields = itemFields(), errors = validateItem({ ...fields, unitPrice: fields.estimated_price });
  if (Object.keys(errors).length) return message(Object.values(errors)[0], true);
  setBusy(true); message(""); $("#save-item").disabled = true;
  try {
    const data = editingId ? await run("update_item", { item_id: editingId, ...fields }) : await run("add_item", fields);
    const saved = localItem(data);
    if (editingId) items = items.map(item => item.id === saved.id ? saved : item); else items = [...items, saved];
    clearItemForm(); render(); message(editingId ? "Item atualizado." : "Item adicionado.");
  } catch (error) { message(errorText(error), true); }
  finally { setBusy(false); }
});
$("#items").addEventListener("click", async event => {
  const editId = event.target.dataset.edit, deleteId = event.target.dataset.delete;
  if (editId) { const item = items.find(candidate => candidate.id === editId); if (item) editItem(item); return; }
  if (!deleteId || busy) return;
  const item = items.find(candidate => candidate.id === deleteId); if (!item || !confirm(`Excluir “${item.name}” da lista?`)) return;
  setBusy(true); message("");
  try { const result = await run("delete_item", { item_id: deleteId }); if (result?.success !== true) throw new ApiError("O serviço não confirmou a exclusão.", { code: "INVALID_RESPONSE" }); items = items.filter(candidate => candidate.id !== deleteId); render(); if (editingId === deleteId) clearItemForm(); message("Item excluído."); }
  catch (error) { message(errorText(error), true); }
  finally { setBusy(false); }
});
$("#items").addEventListener("change", async event => {
  const id = event.target.dataset.toggle; if (!id || busy) return;
  const item = items.find(candidate => candidate.id === id); if (!item) return;
  setBusy(true); message("");
  try { const saved = localItem(await run("update_item", { item_id: id, purchased: event.target.checked })); items = items.map(candidate => candidate.id === id ? saved : candidate); render(); message(saved.purchased ? "Item marcado como comprado." : "Item voltou para pendentes."); }
  catch (error) { event.target.checked = !event.target.checked; message(errorText(error), true); }
  finally { setBusy(false); }
});
$("#cancel-edit").addEventListener("click", clearItemForm);
$("#share-button").addEventListener("click", async () => {
  const link = shareUrl(); $("#share-panel").hidden = false;
  if (navigator.share) { try { await navigator.share({ title: list.name, text: "Confira nossa lista de compras", url: link }); return; } catch (error) { if (error.name === "AbortError") return; } }
  try { await navigator.clipboard.writeText(link); message("Link copiado. Envie para quem vai compartilhar a lista."); }
  catch { $("#share-link").focus(); $("#share-link").select(); message("Selecione e copie o link para compartilhar."); }
});
$("#copy-button").addEventListener("click", async () => { try { await navigator.clipboard.writeText(shareUrl()); message("Link copiado."); } catch { $("#share-link").focus(); $("#share-link").select(); message("Selecione e copie o link para compartilhar."); } });
if (token) { home.hidden = true; listView.hidden = false; $("#share-button").disabled = true; $("#save-item").disabled = true; $("#items-state").textContent = "Carregando lista…"; run("get_list").then(data => { if (!validListResponse(data)) throw new ApiError("O serviço retornou a lista em formato inesperado.", { code: "INVALID_RESPONSE" }); list = data.list; items = data.items; $("#share-button").disabled = false; syncItemButton(); showList(); render(); }).catch(error => { $("#items-state").textContent = errorText(error); message(errorText(error), true); }); }


