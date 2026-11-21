import { callApi, ApiError } from "./api.js";
import { validateItem, itemSubtotal, itemUnitPrice, listTotal, formatCurrency } from "./domain.js";
import { readShareToken, readShareTokenFromUrl, makeShareLink } from "./links.js";

const $ = selector => document.querySelector(selector);
const home = $("#home"), listView = $("#list-view"), invite = $("#invite-dialog");
const itemForm = $("#item-form"), itemName = $("#item-name"), itemDetails = $("#item-details");
const pendingItems = $("#items"), purchasedItems = $("#purchased-items");
const storageKey = "lista-junto:saved-lists:v1";
const shareBase = $('meta[name="share-base-url"]').content.trim();
const playUrl = $('meta[name="play-store-url"]').content.trim();
const isNative = window.Capacitor?.isNativePlatform?.() === true;
const inviteText = "Vem montar a lista de compras comigo. Abra o link para adicionar ou marcar itens.";
let active = null;
let creating = false;
let editingId = null;
let nativeActive = true;

function validSnapshot(data) {
  return data && typeof data.list?.name === "string" && Array.isArray(data.items)
    && data.items.every(item => item && typeof item.id === "string" && typeof item.name === "string");
}

function savedLists() {
  try {
    const rows = JSON.parse(localStorage.getItem(storageKey) || "[]");
    return Array.isArray(rows) ? rows.filter(row => row && /^[a-f0-9]{64}$/.test(row.token) && validSnapshot(row)) : [];
  } catch {
    return [];
  }
}

function writeSavedLists(rows) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(rows.slice(0, 50)));
    return true;
  } catch {
    return false;
  }
}

function remember(state) {
  const rows = savedLists();
  const previous = rows.find(row => row.token === state.token);
  const savedAt = state.savedAt ?? previous?.savedAt ?? new Date().toISOString();
  const row = { token: state.token, ...state.snapshot, savedAt };
  if (previous && JSON.stringify(previous) === JSON.stringify(row)) return;
  if (!writeSavedLists([row, ...rows.filter(entry => entry.token !== state.token)])) {
    notice("#list-notice", "Não foi possível salvar a lista neste dispositivo.", true);
  }
}

function notice(selector, text = "", error = false) {
  const target = $(selector);
  if (target.textContent !== text) target.textContent = text;
  target.classList.toggle("error", error);
  target.hidden = !text;
}

function syncHomeControls() {
  $("#create-button").disabled = creating || !$("#list-name").value.trim();
  $("#list-name").readOnly = creating;
}

function renderSavedLists() {
  const rows = savedLists().sort((a, b) => String(b.savedAt).localeCompare(String(a.savedAt)));
  const target = $("#saved-list-items");
  $("#saved-lists").hidden = rows.length === 0;
  target.replaceChildren(...rows.map(row => {
    const li = document.createElement("li");
    li.className = "saved-row";
    const open = button(row.list.name, "saved-list-open secondary");
    open.dataset.openToken = row.token;
    const remove = button("Remover", "secondary");
    remove.setAttribute("aria-label", `Remover ${row.list.name} deste dispositivo`);
    remove.dataset.removeToken = row.token;
    li.append(open, remove);
    return li;
  }));
}

function button(label, className = "") {
  const element = document.createElement("button");
  element.type = "button";
  element.className = className;
  element.textContent = label;
  return element;
}

function renderAvailability() {
  const { snapshot, status, writing, error, invited } = active;
  const available = Boolean(snapshot);
  const readOnly = status !== "ready";
  const disabled = readOnly || writing;
  $("#list-actions").hidden = !available;
  $("#list-content").hidden = !available;
  $("#delete-list-button").disabled = disabled;
  $("#save-item").disabled = disabled || !itemName.value.trim();
  itemName.readOnly = disabled;
  itemForm.querySelectorAll(".detail-fields input, .detail-fields select").forEach(field => { field.disabled = disabled; });
  listView.querySelectorAll("[data-toggle], [data-edit], [data-delete]").forEach(control => { control.disabled = disabled; });

  const panel = $("#sync-panel");
  let statusText = "";
  if (status === "offline") statusText = available ? "Sem conexão · lista salva" : "Sem conexão para abrir a lista.";
  if (status === "loading") statusText = available ? "Atualizando lista…" : "Carregando lista…";
  if (status === "error") statusText = error;
  if ($("#sync-status").textContent !== statusText) $("#sync-status").textContent = statusText;
  panel.hidden = !statusText;
  panel.classList.toggle("error", status === "error");
  $("#retry-button").hidden = status !== "offline" && status !== "error";
  $("#retry-button").disabled = Boolean(active.request);
  $("#install-panel").hidden = !available || !invited || !playUrl || isNative || !/Android/i.test(navigator.userAgent);
}

function itemMenu(item) {
  const menu = document.createElement("details");
  menu.className = "menu";
  const summary = document.createElement("summary");
  summary.className = "icon-button";
  summary.setAttribute("aria-label", `Opções de ${item.name}`);
  const icon = document.createElement("span");
  icon.setAttribute("aria-hidden", "true");
  icon.textContent = "⋯";
  summary.append(icon);
  const actions = document.createElement("div");
  actions.className = "menu-actions";
  const edit = button("Editar");
  edit.setAttribute("aria-label", `Editar ${item.name}`);
  edit.dataset.edit = item.id;
  const remove = button("Excluir", "danger");
  remove.setAttribute("aria-label", `Excluir ${item.name}`);
  remove.dataset.delete = item.id;
  actions.append(edit, remove);
  menu.append(summary, actions);
  return menu;
}

function itemRow(item) {
  const row = document.createElement("li");
  row.className = item.purchased ? "item-row sold-item" : "item-row";
  row.dataset.itemId = item.id;
  const label = document.createElement("label");
  label.className = "item-toggle";
  const check = document.createElement("input");
  check.type = "checkbox";
  check.checked = Boolean(item.purchased);
  check.dataset.toggle = item.id;
  check.setAttribute("aria-label", `${item.purchased ? "Desmarcar" : "Marcar"} ${item.name} como comprado`);

  const copy = document.createElement("span");
  copy.className = "item-copy";
  const name = document.createElement("strong");
  name.textContent = item.name;
  copy.append(name);
  const description = [item.quantity != null ? `${item.quantity} ${item.unit || "un"}` : "", item.notes].filter(Boolean).join(" · ");
  if (description) {
    const details = document.createElement("small");
    details.textContent = description;
    copy.append(details);
  }
  label.append(check, copy);
  row.append(label);

  const price = itemUnitPrice(item);
  const subtotal = itemSubtotal(item.quantity, price);
  if (subtotal !== null) {
    const prices = document.createElement("span");
    prices.className = "item-price";
    prices.textContent = formatCurrency(subtotal);
    const perUnit = document.createElement("small");
    perUnit.textContent = `${formatCurrency(Number(price))} / ${item.unit || "un"}`;
    prices.append(perUnit);
    row.append(prices);
  }
  row.append(itemMenu(item));
  return row;
}

function renderList() {
  const { list, items } = active.snapshot;
  const focused = document.activeElement;
  const focusedRow = focused?.closest(".item-row");
  const focusWasOnToggle = focused?.matches("[data-toggle]");
  const pending = items.filter(item => !item.purchased);
  const purchased = items.filter(item => item.purchased);
  $("#list-title").textContent = list.name;
  $("#pending-count").textContent = String(pending.length);
  $("#purchased-count").textContent = String(purchased.length);
  $("#items-state").textContent = items.length ? "Tudo comprado." : "Adicione o primeiro produto da lista.";
  $("#items-state").hidden = pending.length > 0;
  $("#purchased-section").hidden = purchased.length === 0;
  pendingItems.replaceChildren(...pending.map(itemRow));
  purchasedItems.replaceChildren(...purchased.map(itemRow));
  $("#list-total").textContent = items.some(item => itemSubtotal(item.quantity, itemUnitPrice(item)) !== null)
    ? formatCurrency(listTotal(items)) : "—";
  renderAvailability();

  if (focusedRow) {
    const row = [...listView.querySelectorAll(".item-row")].find(entry => entry.dataset.itemId === focusedRow.dataset.itemId);
    const control = row?.closest("details:not([open])") ? null : row?.querySelector(focusWasOnToggle ? "[data-toggle]" : "summary");
    (control ?? pendingItems.querySelector("[data-toggle]") ?? $("#purchased-section:not([hidden]) > summary") ?? itemName).focus({ preventScroll: true });
  }
}

function cancelRefresh(state) {
  const request = state.request;
  state.request = null;
  request?.abort();
}

function errorText(error) {
  return error instanceof ApiError ? error.message : "Não foi possível concluir. Tente novamente.";
}

async function refreshList(state = active) {
  if (!state || state !== active || state.request || state.writing) return;
  if (!navigator.onLine) {
    state.status = "offline";
    renderAvailability();
    return;
  }

  const request = new AbortController();
  const timeout = setTimeout(() => request.abort(), 10000);
  state.request = request;
  renderAvailability();
  try {
    const data = await callApi({ action: "get_list", token: state.token }, { signal: request.signal });
    if (!validSnapshot(data)) throw new ApiError("O serviço retornou a lista em formato inesperado.");
    if (state !== active || state.request !== request) return;
    const snapshot = { list: data.list, items: data.items };
    const changed = JSON.stringify(state.snapshot) !== JSON.stringify(snapshot);
    state.snapshot = snapshot;
    state.status = "ready";
    remember(state);
    if (changed) renderList();
  } catch (error) {
    if (state !== active || state.request !== request) return;
    state.status = error.code === "NETWORK_ERROR" ? "offline" : "error";
    state.error = errorText(error);
    if ([401, 403, 404, 410].includes(error.status)) {
      state.snapshot = null;
      $("#list-title").textContent = "Lista indisponível";
      invite.close();
    }
  } finally {
    clearTimeout(timeout);
    if (state === active && state.request === request) {
      state.request = null;
      renderAvailability();
    }
  }
}

function clearItemForm() {
  editingId = null;
  itemForm.reset();
  itemDetails.open = false;
  $("#item-form-title").textContent = "Adicionar produto";
  $("#save-item").textContent = "Adicionar";
  $("#cancel-edit").hidden = true;
}

function showHome(focus = false) {
  if (active) cancelRefresh(active);
  active = null;
  invite.close();
  listView.hidden = true;
  home.hidden = false;
  renderSavedLists();
  syncHomeControls();
  if (focus) $("#home-title").focus();
}

function openList(token, { snapshot = null, invited = false, focus = false } = {}) {
  if (active?.token === token && !snapshot) {
    void refreshList();
    return;
  }
  if (active) cancelRefresh(active);
  invite.close();
  const cached = savedLists().find(row => row.token === token);
  const state = {
    token, invited, writing: false, request: null, savedAt: new Date().toISOString(),
    snapshot: snapshot ?? (cached ? { list: cached.list, items: cached.items } : null),
    status: snapshot ? "ready" : "loading",
  };
  active = state;
  clearItemForm();
  notice("#home-notice");
  notice("#list-notice");
  listView.querySelectorAll("details[open]").forEach(details => { details.open = false; });
  home.hidden = true;
  listView.hidden = false;
  $("#list-title").textContent = "Lista de compras";
  if (state.snapshot) renderList();
  else renderAvailability();
  if (focus) $("#list-title").focus();
  if (snapshot) remember(state);
  else void refreshList(state);
}

function navigate(token, { replace = false, ...options } = {}) {
  const hash = token ? new URLSearchParams({ token }).toString() : "";
  if (location.hash.slice(1) !== hash) {
    history[replace ? "replaceState" : "pushState"](null, "", location.pathname + location.search + (hash ? "#" + hash : ""));
  }
  if (token) openList(token, options);
  else showHome(options.focus);
}

function openCurrentUrl(focus = false) {
  const token = readShareToken();
  if (token) openList(token, { invited: true, focus });
  else {
    showHome(focus);
    notice("#home-notice", new URLSearchParams(location.hash.slice(1)).has("token") ? "O link do convite é inválido. Peça um novo link." : "", true);
  }
}

async function mutate(action, fields, applyResult) {
  const state = active;
  if (!state || state.status !== "ready" || state.writing) return;
  if (!navigator.onLine) {
    state.status = "offline";
    renderAvailability();
    return;
  }
  cancelRefresh(state);
  state.writing = true;
  let refreshAfterWrite = false;
  notice("#list-notice");
  renderAvailability();
  try {
    const result = await callApi({ action, token: state.token, ...fields });
    if (state === active) applyResult(state, result);
  } catch (error) {
    if (state !== active) return;
    if (error.code === "NETWORK_ERROR") state.status = "offline";
    refreshAfterWrite = [401, 403, 404, 410].includes(error.status);
    notice("#list-notice", errorText(error), true);
  } finally {
    if (state === active) {
      state.writing = false;
      renderAvailability();
      if (refreshAfterWrite) void refreshList(state);
    }
  }
}

function savedItem(data) {
  if (typeof data?.item?.id !== "string" || typeof data.item.name !== "string") {
    throw new ApiError("O serviço retornou o item em formato inesperado.");
  }
  return data.item;
}

function applyItem(state, item) {
  const items = state.snapshot.items;
  state.snapshot.items = items.some(entry => entry.id === item.id)
    ? items.map(entry => entry.id === item.id ? item : entry)
    : [...items, item];
  remember(state);
}

function fillItemForm(item) {
  editingId = item.id;
  itemName.value = item.name;
  $("#item-quantity").value = item.quantity ?? 1;
  $("#item-unit").value = item.unit || "un";
  $("#item-price").value = itemUnitPrice(item) ?? "";
  $("#item-notes").value = item.notes || "";
  $("#item-form-title").textContent = "Editar produto";
  $("#save-item").textContent = "Salvar";
  $("#cancel-edit").hidden = false;
  itemDetails.open = true;
  renderAvailability();
  itemName.focus();
}

$("#list-name").addEventListener("input", syncHomeControls);
$("#create-form").addEventListener("submit", async event => {
  event.preventDefault();
  const name = $("#list-name").value.trim();
  if (creating || !name) return;
  creating = true;
  syncHomeControls();
  notice("#home-notice", "Criando lista…");
  try {
    const data = await callApi({ action: "create_list", name });
    if (typeof data?.list?.name !== "string" || typeof data.token !== "string" || !/^[a-f0-9]{64}$/.test(data.token)) {
      throw new ApiError("O serviço retornou dados inesperados ao criar a lista.");
    }
    const snapshot = { list: data.list, items: [] };
    if (!home.hidden) navigate(data.token, { snapshot, focus: true });
    else remember({ token: data.token, snapshot });
  } catch (error) {
    notice("#home-notice", errorText(error), true);
  } finally {
    creating = false;
    syncHomeControls();
  }
});

$("#saved-list-items").addEventListener("click", event => {
  const open = event.target.closest("[data-open-token]");
  if (open) {
    navigate(open.dataset.openToken, { focus: true });
    return;
  }
  const remove = event.target.closest("[data-remove-token]");
  if (!remove || !confirm("Remover a lista salva neste dispositivo? O convite continua funcionando.")) return;
  if (!writeSavedLists(savedLists().filter(row => row.token !== remove.dataset.removeToken))) {
    notice("#home-notice", "Não foi possível remover a cópia local.", true);
    return;
  }
  renderSavedLists();
  ($("#saved-list-items button") ?? $("#list-name")).focus();
  notice("#home-notice", "Cópia local removida.");
});

itemName.addEventListener("input", renderAvailability);
itemForm.addEventListener("invalid", event => {
  if (itemDetails.contains(event.target)) itemDetails.open = true;
}, true);
itemForm.addEventListener("submit", event => {
  event.preventDefault();
  const price = $("#item-price").value;
  const fields = {
    name: itemName.value.trim(),
    quantity: Number($("#item-quantity").value),
    unit: $("#item-unit").value,
    estimated_price: price === "" ? null : Number(price),
    notes: $("#item-notes").value.trim(),
  };
  const errors = validateItem({ ...fields, unitPrice: fields.estimated_price });
  if (Object.keys(errors).length) {
    if (!errors.name) itemDetails.open = true;
    notice("#list-notice", Object.values(errors)[0], true);
    return;
  }
  const itemId = editingId;
  void mutate(itemId ? "update_item" : "add_item", itemId ? { item_id: itemId, ...fields } : fields, (state, data) => {
    const item = savedItem(data);
    clearItemForm();
    notice("#list-notice", itemId ? "Produto atualizado." : "Produto adicionado.");
    applyItem(state, item);
    renderList();
    itemName.focus();
  });
});

$("#cancel-edit").addEventListener("click", () => {
  clearItemForm();
  renderAvailability();
  itemName.focus();
});

function onItemAction(event) {
  const control = event.target.closest("[data-edit], [data-delete]");
  if (!control || !active?.snapshot) return;
  const itemId = control.dataset.edit ?? control.dataset.delete;
  const item = active.snapshot.items.find(entry => entry.id === itemId);
  if (!item) return;
  const menu = control.closest("details");
  menu.open = false;
  menu.querySelector("summary").focus();
  if (control.dataset.edit) {
    fillItemForm(item);
  } else if (confirm(`Excluir “${item.name}” da lista?`)) {
    void mutate("delete_item", { item_id: itemId }, (state, result) => {
      if (result?.success !== true) throw new ApiError("O serviço não confirmou a exclusão.");
      state.snapshot.items = state.snapshot.items.filter(entry => entry.id !== itemId);
      if (editingId === itemId) clearItemForm();
      notice("#list-notice", "Produto excluído.");
      remember(state);
      renderList();
      (pendingItems.querySelector("[data-toggle]") ?? itemName).focus({ preventScroll: true });
    });
  }
}

async function onItemToggle(event) {
  const check = event.target;
  const item = active?.snapshot?.items.find(entry => entry.id === check.dataset.toggle);
  if (!item) return;
  const purchased = check.checked;
  check.checked = Boolean(item.purchased);
  const row = check.closest(".item-row");
  const next = row.nextElementSibling ?? row.previousElementSibling;
  const state = active;
  let updated = false;
  await mutate("update_item", { item_id: item.id, purchased }, (current, data) => {
    const saved = savedItem(data);
    applyItem(current, saved);
    renderList();
    notice("#list-notice", saved.purchased ? "Produto marcado como comprado." : "Produto voltou para a lista.");
    updated = true;
  });
  if (!updated || active !== state) return;
  const nextCheck = [...listView.querySelectorAll("[data-toggle]")].find(input => input.dataset.toggle === next?.dataset.itemId);
  const summary = $("#purchased-section:not([hidden]) > summary");
  (nextCheck ?? (purchased ? summary : pendingItems.querySelector("[data-toggle]")) ?? itemName).focus({ preventScroll: true });
}

for (const rows of [pendingItems, purchasedItems]) {
  rows.addEventListener("click", onItemAction);
  rows.addEventListener("change", onItemToggle);
}

$("#delete-list-button").addEventListener("click", () => {
  const name = active.snapshot.list.name;
  const menu = $("#delete-list-button").closest("details");
  menu.open = false;
  menu.querySelector("summary").focus();
  if (!confirm(`Excluir a lista “${name}” para todos? Esta ação não pode ser desfeita.`)) return;
  void mutate("delete_list", {}, (state, result) => {
    if (result?.success !== true) throw new ApiError("O serviço não confirmou a exclusão da lista.");
    const removed = writeSavedLists(savedLists().filter(row => row.token !== state.token));
    navigate(null, { replace: true, focus: true });
    notice("#home-notice", removed ? "Lista excluída." : "Lista excluída. Não foi possível remover a cópia local.", !removed);
  });
});

function shareUrl() {
  return makeShareLink(shareBase || new URL(location.pathname, location.origin).href, active.token);
}

$("#share-button").addEventListener("click", () => {
  notice("#invite-notice");
  $("#manual-copy").hidden = true;
  $("#invite-link").value = "";
  $("#send-invite-button").hidden = !isNative && !navigator.share;
  invite.showModal();
  if ($("#send-invite-button").hidden) $("#copy-link-button").focus();
});

invite.addEventListener("close", () => {
  $("#invite-link").value = "";
});

$("#send-invite-button").addEventListener("click", async () => {
  const state = active;
  const options = { title: state.snapshot.list.name, text: inviteText, url: shareUrl() };
  try {
    if (isNative) {
      const { Share } = await import("@capacitor/share");
      await Share.share({ ...options, dialogTitle: "Convidar para a lista" });
    } else {
      await navigator.share(options);
    }
    if (active === state) invite.close();
  } catch (error) {
    if (active !== state || !invite.open || error.name === "AbortError" || error.message === "Share canceled") return;
    notice("#invite-notice", "Não foi possível abrir o compartilhamento. Use Copiar link.", true);
  }
});

$("#copy-link-button").addEventListener("click", async () => {
  const state = active;
  const url = shareUrl();
  try {
    if (isNative) {
      const { Clipboard } = await import("@capacitor/clipboard");
      await Clipboard.write({ string: url });
    } else {
      await navigator.clipboard.writeText(url);
    }
    if (state === active && invite.open) notice("#invite-notice", "Link copiado.");
  } catch {
    if (state !== active || !invite.open) return;
    const input = $("#invite-link");
    input.value = url;
    $("#manual-copy").hidden = false;
    input.focus();
    input.select();
    notice("#invite-notice", "Selecione e copie o link para enviar o convite.");
  }
});

document.addEventListener("click", event => {
  for (const menu of listView.querySelectorAll(".menu[open]")) {
    if (!menu.contains(event.target)) menu.open = false;
  }
});
listView.addEventListener("keydown", event => {
  const menu = event.target.closest(".menu[open]");
  if (event.key === "Escape" && menu) {
    menu.open = false;
    menu.querySelector("summary").focus();
  }
});

$(".brand").addEventListener("click", event => {
  if (event.button || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
  event.preventDefault();
  notice("#home-notice");
  navigate(null, { focus: true });
});
$("#retry-button").addEventListener("click", () => { void refreshList(); });
if (playUrl) $("#install-link").href = playUrl;
window.addEventListener("hashchange", () => openCurrentUrl(true));
function refreshVisibleList() {
  if (nativeActive && !document.hidden && navigator.onLine) void refreshList();
}
window.addEventListener("online", refreshVisibleList);
window.addEventListener("offline", () => {
  if (!active) return;
  cancelRefresh(active);
  active.status = "offline";
  renderAvailability();
});
document.addEventListener("visibilitychange", refreshVisibleList);
setInterval(refreshVisibleList, 15000);

openCurrentUrl();

if (isNative) {
  void (async () => {
    const { App } = await import("@capacitor/app");
    let handledIncomingLink = false;
    const openInvite = url => {
      const token = readShareTokenFromUrl(url, shareBase);
      if (!token) return;
      handledIncomingLink = true;
      navigate(token, { invited: true, focus: true });
    };
    await App.addListener("appUrlOpen", ({ url }) => openInvite(url));
    await App.addListener("appStateChange", ({ isActive }) => {
      nativeActive = isActive;
      refreshVisibleList();
    });
    const launch = await App.getLaunchUrl();
    if (!handledIncomingLink && launch?.url) openInvite(launch.url);
  })().catch(() => {});
} else if ("serviceWorker" in navigator && location.protocol !== "file:") {
  window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(() => {}));
}
