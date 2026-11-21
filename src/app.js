import { callApi, ApiError } from "./api.js";
import { validateItem, itemSubtotal, listTotal, formatCurrency } from "./domain.js";
import { readShareToken, readShareTokenFromUrl, makeShareLink } from "./links.js";
const $ = selector => document.querySelector(selector);
const home = $("#home"), listView = $("#list-view"), notice = $("#notice");
let token = readShareToken(), list = null, items = [], busy = false, editingId = null;
const STORAGE_KEY = "lista-junto:saved-lists:v1";
function savedLists() { try { const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); return Array.isArray(value) ? value.filter(row => row && /^[a-f0-9]{64}$/.test(row.token)) : []; } catch { return []; } }
function saveCurrentList() {
  if (!token || !list) return;
  const rows = savedLists().filter(row => row.token !== token);
  rows.unshift({ token, list, items, savedAt: new Date().toISOString() });
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(rows.slice(0, 50))); } catch { message("Não foi possível salvar neste dispositivo. Libere espaço no armazenamento do navegador.", true); }
}
function renderSavedLists() {
  const rows = savedLists(), section = $("#saved-lists"), target = $("#saved-list-items"); target.replaceChildren(); section.hidden = rows.length === 0;
  rows.forEach(row => { const li = document.createElement("li"), open = document.createElement("button"), name = document.createElement("span"), action = document.createElement("span"), remove = document.createElement("button"); open.type = remove.type = "button"; open.className = "saved-list-open"; open.setAttribute("aria-label", `Abrir lista ${row.list?.name || "Lista salva"}`); name.className = "saved-list-name"; name.textContent = row.list?.name || "Lista salva"; action.className = "saved-list-action"; action.textContent = "Abrir lista →"; open.dataset.openToken = row.token; open.append(name, action); remove.className = "saved-list-delete"; remove.textContent = "Remover"; remove.dataset.removeToken = row.token; li.append(open, remove); target.append(li); });
}
function restoreLocalList(savedToken) { const row = savedLists().find(entry => entry.token === savedToken); if (!row) return false; token = row.token; list = row.list; items = row.items; location.hash = new URLSearchParams({ token }).toString(); $("#share-button").disabled = false; $("#save-item").disabled = false; showList(); render(); message("Lista aberta do armazenamento deste dispositivo. Conecte-se à internet para sincronizar alterações."); return true; }
// The source version also runs directly in a browser, where bare npm imports
// cannot be resolved. Load the native plugin only inside the bundled Android app.
if (window.Capacitor?.isNativePlatform?.()) {
  const { App } = await import("@capacitor/app");
  App.addListener("appUrlOpen", ({ url }) => {
    const shareBase = document.querySelector('meta[name="share-base-url"]')?.content || location.href;
    const incomingToken = readShareTokenFromUrl(url, shareBase);
    if (!incomingToken) return;
    location.hash = new URLSearchParams({ token: incomingToken }).toString();
    location.reload();
  });
}
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
function shareUrl() {
  const shareBase = document.querySelector('meta[name="share-base-url"]')?.content?.trim();
  const baseUrl = shareBase || new URL(location.pathname, location.origin).href;
  return makeShareLink(baseUrl, token);
}
function showList() {
  home.hidden = true;
  listView.hidden = false;
  $("#app-shell").classList.add("list-open");
  $("#list-title").textContent = list.name;
}
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
  list = data.list; items = data.items; saveCurrentList(); showList(); render();
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
    token = data.token; list = data.list; items = []; location.hash = new URLSearchParams({ token }).toString(); saveCurrentList(); showList(); render(); renderSavedLists(); message("Lista criada e salva neste dispositivo. Compartilhe o link para convidar outras pessoas.");
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
    clearItemForm(); saveCurrentList(); render(); message(editingId ? "Item atualizado." : "Item adicionado.");
  } catch (error) { message(errorText(error), true); }
  finally { setBusy(false); }
});
$("#items").addEventListener("click", async event => {
  const editId = event.target.dataset.edit, deleteId = event.target.dataset.delete;
  if (editId) { const item = items.find(candidate => candidate.id === editId); if (item) editItem(item); return; }
  if (!deleteId || busy) return;
  const item = items.find(candidate => candidate.id === deleteId); if (!item || !confirm(`Excluir “${item.name}” da lista?`)) return;
  setBusy(true); message("");
  try { const result = await run("delete_item", { item_id: deleteId }); if (result?.success !== true) throw new ApiError("O serviço não confirmou a exclusão.", { code: "INVALID_RESPONSE" }); items = items.filter(candidate => candidate.id !== deleteId); saveCurrentList(); render(); if (editingId === deleteId) clearItemForm(); message("Item excluído."); }
  catch (error) { message(errorText(error), true); }
  finally { setBusy(false); }
});
$("#items").addEventListener("change", async event => {
  const id = event.target.dataset.toggle; if (!id || busy) return;
  const item = items.find(candidate => candidate.id === id); if (!item) return;
  setBusy(true); message("");
  try { const saved = localItem(await run("update_item", { item_id: id, purchased: event.target.checked })); items = items.map(candidate => candidate.id === id ? saved : candidate); saveCurrentList(); render(); message(saved.purchased ? "Item marcado como comprado." : "Item voltou para pendentes."); }
  catch (error) { event.target.checked = !event.target.checked; message(errorText(error), true); }
  finally { setBusy(false); }
});
$("#cancel-edit").addEventListener("click", clearItemForm);
$("#share-button").addEventListener("click", async () => {
  const link = shareUrl();
  if (navigator.share) { try { await navigator.share({ title: list.name, text: "Confira nossa lista de compras", url: link }); return; } catch (error) { if (error.name === "AbortError") return; } }
  try { await navigator.clipboard.writeText(link); message("Link copiado. Envie para quem vai compartilhar a lista."); }
  catch { message("Não foi possível abrir o compartilhamento nem copiar o link. Verifique as permissões do navegador.", true); }
});
$("#saved-list-items").addEventListener("click", event => { if (event.target.dataset.openToken) { restoreLocalList(event.target.dataset.openToken); return; } const removeToken = event.target.dataset.removeToken; if (!removeToken || !confirm("Remover esta cópia salva neste dispositivo? A lista compartilhada continuará disponível pelo link.")) return; try { localStorage.setItem(STORAGE_KEY, JSON.stringify(savedLists().filter(row => row.token !== removeToken))); renderSavedLists(); message("Cópia local removida."); } catch { message("Não foi possível remover a cópia local.", true); } });
$("#delete-list-button").addEventListener("click", async () => {
  if (!token || busy || !confirm(`Excluir a lista “${list.name}” para todos? Esta ação não pode ser desfeita.`)) return;
  setBusy(true); message("");
  try {
    const result = await run("delete_list");
    if (result?.success !== true) throw new ApiError("O serviço não confirmou a exclusão da lista.", { code: "INVALID_RESPONSE" });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(savedLists().filter(row => row.token !== token)));
    token = null; list = null; items = []; location.hash = ""; listView.hidden = true; home.hidden = false; $("#app-shell").classList.remove("list-open"); renderSavedLists(); message("Lista excluída.");
  } catch (error) { message(error instanceof ApiError && error.status === 404 ? "A API atual não oferece exclusão de listas. A cópia local pode ser removida na página inicial." : errorText(error), true); }
  finally { setBusy(false); }
});
renderSavedLists();
if (token) { home.hidden = true; listView.hidden = false; $("#app-shell").classList.add("list-open"); $("#share-button").disabled = true; $("#save-item").disabled = true; $("#items-state").textContent = "Carregando lista…"; run("get_list").then(data => { if (!validListResponse(data)) throw new ApiError("O serviço retornou a lista em formato inesperado.", { code: "INVALID_RESPONSE" }); list = data.list; items = data.items; saveCurrentList(); $("#share-button").disabled = false; syncItemButton(); showList(); render(); }).catch(error => { if (restoreLocalList(token)) return; $("#items-state").textContent = errorText(error); message(errorText(error), true); }); }



if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
