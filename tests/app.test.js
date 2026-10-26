import test from "node:test";
import assert from "node:assert/strict";
import { validateItem, itemSubtotal, listTotal } from "../src/domain.js";
import { makeShareLink, readShareToken } from "../src/links.js";
import { callApi, ApiError } from "../src/api.js";
test("validates item name, quantity, price and notes", () => {
  assert.deepEqual(validateItem({ name: " Arroz ", quantity: 2, unitPrice: 8.5, notes: "integral" }), {});
  assert.ok(validateItem({ name: " ", quantity: 0, unitPrice: -1 }).name);
  assert.ok(validateItem({ name: "Feijão", quantity: "x", unitPrice: "x" }).quantity);
});
test("computes subtotal and total without mixing unit and total price", () => {
  assert.equal(itemSubtotal(2, 3.25), 6.5);
  assert.equal(itemSubtotal(2, ""), null);
  assert.equal(listTotal([{ quantity: 2, estimated_price: 3.25, unitPrice: 3.25 }, { quantity: 1, unitPrice: 10 }]), 16.5);
});
test("puts 64-character backend token in URL fragment and reads it back", () => {
  const token = "a".repeat(64);
  const link = makeShareLink("https://lindomarso.github.io/lista-compras-compartilhada/", token);
  assert.equal(new URL(link).search, "");
  assert.equal(readShareToken(new URL(link)), token);
  assert.equal(readShareToken({ hash: "#token=not-a-real-token" }), null);
  assert.throws(() => makeShareLink("https://example.com/", "weak"), TypeError);
});
test("calls the actual API contract with POST JSON and optional public key headers", async () => {
  let call;
  const result = await callApi({ action: "get_list", token: "a".repeat(64) }, { anonKey: "public-demo-key", fetchImpl: async (...args) => { call = args; return { ok: true, status: 200, json: async () => ({ list: {}, items: [] }) }; } });
  assert.deepEqual(result, { list: {}, items: [] });
  assert.equal(call[1].method, "POST");
  assert.equal(call[1].headers.apikey, "public-demo-key");
  assert.equal(call[1].headers.Authorization, "Bearer public-demo-key");
  assert.deepEqual(JSON.parse(call[1].body), { action: "get_list", token: "a".repeat(64) });
});
test("normalizes network, HTTP and invalid JSON errors", async () => {
  await assert.rejects(callApi({ action: "get_list" }, { fetchImpl: async () => { throw Error("internal detail"); } }), e => e instanceof ApiError && e.code === "NETWORK_ERROR" && !e.message.includes("internal detail"));
  await assert.rejects(callApi({ action: "get_list" }, { fetchImpl: async () => ({ ok: false, status: 401, json: async () => ({ error: "Link inválido ou ausente." }) }) }), e => e.code === "HTTP_ERROR" && e.message === "Link inválido ou ausente.");
  await assert.rejects(callApi({ action: "get_list" }, { fetchImpl: async () => ({ ok: true, status: 200, json: async () => { throw Error(); } }) }), e => e.code === "INVALID_RESPONSE");
});
