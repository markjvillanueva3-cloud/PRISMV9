#!/usr/bin/env node
/**
 * holder-taper.test.mjs -- tests for holder designation -> taper -> geometry resolution.
 * Run: node scripts/lib/holder-taper.test.mjs   (node:test auto-runs on exit)
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { parseHolderTaper, taperGeometry, resolveHolder } from "./holder-taper.mjs";

test("parseHolderTaper: Big-Plus BBT -> BT", () => {
  assert.equal(parseHolderTaper("BBT50-MEGA32D-105"), "BT50");
  assert.equal(parseHolderTaper("BBT40-GTG5-10-140-65"), "BT40");
  assert.equal(parseHolderTaper("BIG-PLUS 30"), "BT30");
});
test("parseHolderTaper: HSK / CAT / Capto / KM / ER", () => {
  assert.equal(parseHolderTaper("HSK-A63-ER32-100"), "HSK-A63");
  assert.equal(parseHolderTaper("CAT40-EM-0500"), "CAT40");
  assert.equal(parseHolderTaper("CV40-SLN"), "CAT40");
  assert.equal(parseHolderTaper("CAPTO C5 HOLDER"), "CAPTO-C5");
  assert.equal(parseHolderTaper("KM40 TLS"), "KM40");
  assert.equal(parseHolderTaper("ER-32-4NL"), "ER32");
});
test("parseHolderTaper: no taper -> null (MEGA head, junk, empty)", () => {
  assert.equal(parseHolderTaper("MEGA10N"), null);   // collet-chuck head, no spindle taper
  assert.equal(parseHolderTaper("MEGA13N-4"), null);
  assert.equal(parseHolderTaper(""), null);
  assert.equal(parseHolderTaper(null), null);
});

test("taperGeometry: steep tapers carry real book values", () => {
  assert.deepEqual(taperGeometry("BT40"), { body_diameter_mm: 63, gauge_length_mm: 65.4, projection_mm: 90, max_rpm: 15000 });
  assert.equal(taperGeometry("BT50").body_diameter_mm, 100);
  assert.equal(taperGeometry("HSK-A63").max_rpm, 25000);
  assert.equal(taperGeometry("CAT50").body_diameter_mm, 100);
});
test("taperGeometry: KM scales with size; ER reuses ER_COLLET", () => {
  const km40 = taperGeometry("KM40");
  assert.equal(km40.body_diameter_mm, 40);
  assert.ok(km40.gauge_length_mm > 40 && km40.projection_mm > km40.gauge_length_mm);
  const er32 = taperGeometry("ER32");
  assert.equal(er32.body_diameter_mm, 63);          // ER32 bodyDia from ER_COLLET
  assert.ok(er32.gauge_length_mm > 0);
});
test("taperGeometry: unknown -> null", () => {
  assert.equal(taperGeometry("BT99"), null);
  assert.equal(taperGeometry(null), null);
  assert.equal(taperGeometry("MYSTERY"), null);
});

test("resolveHolder: full path", () => {
  const r = resolveHolder("BBT50-MEGA32D-105");
  assert.equal(r.taper, "BT50");
  assert.equal(r.geometry.body_diameter_mm, 100);
  assert.equal(resolveHolder("MEGA10N"), null);
});
