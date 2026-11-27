import test from "node:test";
import assert from "node:assert/strict";
import { monthlyBalance, purchaseMonth } from "../src/app/features/monthly-balance/models/monthly-balance.ts";
import { localResult, suggestCategory } from "../src/app/features/shopping-lists/models/list-rules.ts";
import { sharedPrefix } from "../src/app/features/shopping-lists/models/links.ts";
import { priceCandidates } from "../src/app/features/label-reader/models/price-candidates.ts";
import { callApi } from "../src/app/features/shopping-lists/services/list-api.ts";

test("recognizes decimal prices and leaves competing prices for user review", () => {
  assert.deepEqual(priceCandidates("R$ 1.234, 56\n R$ 0,00\n 1.234,56"), [1234.56, 0]);
  assert.deepEqual(priceCandidates("12.99\n10,99"), [12.99, 10.99]);
  assert.deepEqual(priceCandidates("7891000000123\n500 g\n-2,99"), []);
});

test("suggests categories from accented product names and handles overlapping terms", () => {
  assert.equal(suggestCategory("Maçã Gala"), "produce");
  assert.equal(suggestCategory("Água sanitária"), "cleaning");
  assert.equal(suggestCategory("Papel higiênico"), "hygiene");
  assert.equal(suggestCategory("Produto desconhecido"), "other");
});

test("uses the São Paulo month across the UTC month boundary", () => {
  assert.equal(purchaseMonth("2026-12-01T02:59:59Z"), "2026-11");
  assert.equal(purchaseMonth("2026-12-01T03:00:00Z"), "2026-12");
});

test("keeps price and quantity at purchase, excludes undated legacy items and counts missing prices", () => {
  const fields = { name: "Maçã", quantity: 2, unit: "kg", estimated_price: 6.25, category: "dairy", notes: "" };
  const item = localResult({ items: [] }, { action: "add_item", fields });
  const change = (item, fields) => localResult({ items: [item] }, { action: "update_item", id: item.id, fields });
  const bought = change(item, { purchased: true });
  const edited = change(bought, { quantity: 5, unit: "un", estimated_price: 9.99, category: "produce" });
  const unpriced = change({ ...item, estimated_price: null }, { purchased: true });
  const legacy = { ...item, purchased: true };
  const month = purchaseMonth(bought.purchased_at);
  const summary = items => monthlyBalance([{ list: { name: "Feira" }, items }], month);
  assert.equal(summary([edited, legacy, unpriced]).cents, 1250);
  assert.equal(summary([edited, legacy, unpriced]).missing, 1);
  assert.deepEqual(summary([edited]).groups, [{ category: "produce", count: 1, cents: 1250 }]);
  assert.equal(summary([edited]).items[0].purchased_unit, "kg");
  assert.equal(summary([change(edited, { purchased: false })]).items.length, 0);
  assert.equal(summary([]).items.length, 0);
});

test("routes publish and new invites to v2 while retaining the legacy endpoint", async () => {
  const paths = [];
  const fetchImpl = async url => {
    paths.push(new URL(url).pathname);
    return new Response("{}");
  };
  await callApi({ action: "publish_list" }, { fetchImpl });
  await callApi({ action: "get_list", token: sharedPrefix.padEnd(64, "a") }, { fetchImpl });
  await callApi({ action: "get_list", token: "a".repeat(64) }, { fetchImpl });
  assert.deepEqual(paths, ["/functions/v1/list-api-v2", "/functions/v1/list-api-v2", "/functions/v1/list-api"]);
});
