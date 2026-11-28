import test from "node:test";
import assert from "node:assert/strict";
import { parseDecimal, resolvePreferences } from "../src/app/shared/locale-preferences.ts";

test("selects a supported language independently of the primary region's currency", () => {
  for (const [tags, language, locale, currency] of [
    [["pt-BR"], "pt-BR", "pt-BR", "BRL"],
    [["en-US"], "en", "en-US", "USD"],
    [["es-MX"], "es", "es-MX", "MXN"],
    [["pt-PT"], "pt-BR", "pt-PT", "EUR"],
    [["fr-FR"], "pt-BR", "pt-BR", "EUR"],
    [["fr-FR", "en-US"], "en", "en-US", "EUR"],
    [["ja-JP", "es-MX"], "es", "es-MX", "BRL"],
    [["en"], "en", "en", "BRL"],
    [["bad_locale", "es-MX"], "es", "es-MX", "MXN"],
    [[], "pt-BR", "pt-BR", "BRL"],
  ]) {
    assert.deepEqual(resolvePreferences(tags), { language, locale, currency });
  }
});

test("parses prices with either decimal separator and keeps invalid input distinct from a blank price", () => {
  for (const input of ["5,90", "5.90", " 5.90 "]) assert.equal(parseDecimal(input, 2), 5.9);
  for (const input of ["1.234,56", "1,234.56"]) assert.equal(parseDecimal(input, 2), 1234.56);
  for (const input of ["1,234", "1.234", ".", "4e2", "5,2,0", "-10"]) assert.ok(Number.isNaN(parseDecimal(input, 2)));
  assert.equal(parseDecimal(""), null);
  assert.equal(parseDecimal("0,125"), .125);
});
