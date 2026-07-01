#!/usr/bin/env node
/**
 * Tests for extract-catalog-cutting-params.mjs pure helpers.
 * Real reference values + algebraic invariants (R9) -- no toBeDefined stubs.
 * Run: node scripts/extract-catalog-cutting-params.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  coerceJsonArray, normalizeUnits, validateRecord, recordToTribalTip,
  toManufacturerSpeedFeed, slug, guessVendor, normalizeIso, catalogPriority,
} from "./extract-catalog-cutting-params.mjs";

test("catalogPriority: cutting-tool makers first, workholding last", () => {
  assert.equal(catalogPriority("GC_2023-2024_US_Milling.pdf"), 0); // sandvik/tungaloy maker
  assert.equal(catalogPriority("Milling 2018.1.pdf"), 0); // seco
  assert.equal(catalogPriority("Some Generic Endmill Catalog.pdf"), 1); // generic cutting word
  assert.equal(catalogPriority("543f80b8_2016_orange_vise_catalog.pdf"), 3); // workholding, no SFM
  assert.equal(catalogPriority("CAMFIX_Catalog.pdf"), 3);
  // ordering invariant: maker < generic < unknown < workholding
  assert.ok(catalogPriority("seco.pdf") < catalogPriority("random.pdf"));
  assert.ok(catalogPriority("random.pdf") < catalogPriority("orange vise.pdf"));
});

test("normalizeIso: single letter passthrough", () => {
  assert.equal(normalizeIso("P"), "P");
  assert.equal(normalizeIso("m"), "M");
});
test("normalizeIso: embedded letter (P25, ISO M, (K))", () => {
  assert.equal(normalizeIso("P25"), "P");
  assert.equal(normalizeIso("ISO M"), "M");
  assert.equal(normalizeIso("(K)"), "K");
});
test("normalizeIso: material name -> ISO group", () => {
  assert.equal(normalizeIso("stainless steel"), "M");
  assert.equal(normalizeIso("cast iron"), "K");
  assert.equal(normalizeIso("aluminium"), "N");
  assert.equal(normalizeIso("titanium"), "S");
  assert.equal(normalizeIso("hardened 55 HRC"), "H");
  assert.equal(normalizeIso("alloy steel"), "P");
});
test("normalizeIso: ambiguous/empty -> null (not guessed)", () => {
  assert.equal(normalizeIso("SM"), null);
  assert.equal(normalizeIso(""), null);
  assert.equal(normalizeIso(null), null);
});
test("validateRecord: recovers a material-named record via normalizeIso", () => {
  const v = validateRecord({ series: "AH725", iso_group: "stainless", tool_type: "insert", feed_type: "fz_per_tooth", feed_min: 0.1, feed_max: 0.3, feed_unit: "mm", vc_min: 120, vc_max: 200, vc_unit: "m/min" });
  assert.equal(v.ok, true);
  assert.equal(v.normalized.iso_group, "M");
});

test("coerceJsonArray: strips markdown fences and parses", () => {
  const t = "```json\n[{\"series\":\"X\"}]\n```";
  assert.deepEqual(coerceJsonArray(t), [{ series: "X" }]);
});
test("coerceJsonArray: extracts array embedded in prose", () => {
  assert.deepEqual(coerceJsonArray('Here you go: [{"a":1}] done'), [{ a: 1 }]);
});
test("coerceJsonArray: empty / non-string / no-array -> []", () => {
  assert.deepEqual(coerceJsonArray("NONE"), []);
  assert.deepEqual(coerceJsonArray(null), []);
  assert.deepEqual(coerceJsonArray("[broken"), []);
});

test("normalizeUnits: sfm -> m/min (350 sfm = 106.68)", () => {
  const n = normalizeUnits({ vc_min: 350, vc_max: 350, vc_unit: "sfm", fz_min: 0.003, fz_max: 0.003, fz_unit: "in" });
  assert.equal(n.vc_min_mpm, 106.68); // 350 * 0.3048
  assert.equal(n.fz_min_mm, 0.0762); // 0.003 * 25.4
});
test("normalizeUnits: metric passthrough unchanged", () => {
  const n = normalizeUnits({ vc_min: 120, vc_max: 150, vc_unit: "m/min", fz_min: 0.05, fz_max: 0.08, fz_unit: "mm" });
  assert.equal(n.vc_min_mpm, 120);
  assert.equal(n.vc_max_mpm, 150);
  assert.equal(n.fz_max_mm, 0.08);
});
test("normalizeUnits: missing values -> null (JSON-safe, not NaN)", () => {
  const n = normalizeUnits({ vc_min: 100, vc_max: 100, vc_unit: "m/min" });
  assert.equal(n.fz_min_mm, null);
});

test("validateRecord: accepts a real Sandvik-style steel record", () => {
  const v = validateRecord({ series: "CoroMill 390", iso_group: "P", vc_min: 150, vc_max: 250, vc_unit: "m/min", fz_min: 0.1, fz_max: 0.3, fz_unit: "mm", tool_type: "insert" });
  assert.equal(v.ok, true);
  assert.equal(v.normalized.iso_group, "P");
  assert.equal(v.normalized.vc_min_mpm, 150);
});
test("validateRecord: rejects bad ISO group", () => {
  assert.equal(validateRecord({ series: "X", iso_group: "Z", vc_min: 100, vc_max: 100, vc_unit: "m/min" }).ok, false);
});
test("validateRecord: rejects inverted vc range", () => {
  assert.equal(validateRecord({ series: "X", iso_group: "P", vc_min: 300, vc_max: 100, vc_unit: "m/min" }).ok, false);
});
test("validateRecord: rejects record with no cutting values", () => {
  assert.equal(validateRecord({ series: "X", iso_group: "P" }).ok, false);
});
test("validateRecord: rejects absurd vc (>3000 m/min)", () => {
  assert.equal(validateRecord({ series: "X", iso_group: "N", vc_min: 100, vc_max: 5000, vc_unit: "m/min" }).ok, false);
});
test("validateRecord: rejects NaN/Infinity feed (adversarial)", () => {
  assert.equal(validateRecord({ series: "X", iso_group: "P", fz_min: 0.1, fz_max: Infinity, fz_unit: "mm" }).ok, false);
});

test("recordToTribalTip: milling -> fz mm/tooth sentence", () => {
  const tip = recordToTribalTip({ series: "JS512", tool_type: "end_mill", coating: "TiAlN", iso_group: "P", operation: "rough", vc_min_mpm: 120, vc_max_mpm: 150, feed_type: "fz_per_tooth", feed_min_mm: 0.05, feed_max_mm: 0.08 }, "seco");
  assert.match(tip, /seco JS512/);
  assert.match(tip, /TiAlN-coated/);
  assert.match(tip, /steel \(ISO P\)/);
  assert.match(tip, /Vc 120-150 m\/min/);
  assert.match(tip, /fz 0\.05-0\.08 mm\/tooth/);
});
test("recordToTribalTip: turning -> fn mm/rev (NOT fz)", () => {
  const tip = recordToTribalTip({ series: "T9215", tool_type: "turning", coating: "unknown", iso_group: "P", operation: "general", vc_min_mpm: 150, vc_max_mpm: 400, feed_type: "fn_per_rev", feed_min_mm: 0.2, feed_max_mm: 1.5 }, "tungaloy");
  assert.match(tip, /fn 0\.2-1\.5 mm\/rev/);
  assert.doesNotMatch(tip, /mm\/tooth/);
});

test("validateRecord: REJECTS impossible 4mm/tooth milling feed (the real bug)", () => {
  // column-confusion: an ap/depth value misread as fz. Must NOT pollute SFC.
  const v = validateRecord({ series: "X", tool_type: "end_mill", iso_group: "M", feed_type: "fz_per_tooth", feed_min: 0.5, feed_max: 4.0, feed_unit: "mm", vc_min: 100, vc_max: 200, vc_unit: "m/min" });
  assert.equal(v.ok, false);
  assert.match(v.reason, /feed-range/);
});
test("validateRecord: ACCEPTS 1.5 mm/rev turning feed (plausible fn)", () => {
  const v = validateRecord({ series: "T9215", tool_type: "turning", iso_group: "P", feed_type: "fn_per_rev", feed_min: 0.2, feed_max: 1.5, feed_unit: "mm", vc_min: 150, vc_max: 400, vc_unit: "m/min" });
  assert.equal(v.ok, true);
  assert.equal(v.normalized.feed_type, "fn_per_rev");
});
test("normalizeUnits: infers fn_per_rev from turning tool_type", () => {
  const n = normalizeUnits({ tool_type: "drill", feed_min: 0.1, feed_max: 0.3, feed_unit: "mm", vc_min: 80, vc_max: 80, vc_unit: "m/min" });
  assert.equal(n.feed_type, "fn_per_rev");
  assert.equal(n.fz_min_mm, null); // per-rev feed is NOT exposed as milling fz
  assert.equal(n.feed_min_mm, 0.1);
});

test("toManufacturerSpeedFeed: groups series+iso, widest range, oscar schema", () => {
  const recs = [
    { series: "JS512", iso_group: "P", vc_min_mpm: 100, vc_max_mpm: 200, fz_min_mm: 0.05, fz_max_mm: 0.1 },
    { series: "JS512", iso_group: "P", vc_min_mpm: 120, vc_max_mpm: 225, fz_min_mm: 0.04, fz_max_mm: 0.17 },
    { series: "JS512", iso_group: "N", vc_min_mpm: 300, vc_max_mpm: 570, fz_min_mm: 0.06, fz_max_mm: 0.2 },
  ];
  const msf = toManufacturerSpeedFeed(recs);
  assert.equal(msf.length, 2); // P and N
  const p = msf.find((m) => m.isoGroup === "P");
  assert.equal(p.series, "JS512");
  assert.equal(p.vc_min, 100); // widest min across the two P rows
  assert.equal(p.vc_max, 225); // widest max
  assert.equal(p.fz_min, 0.04);
  assert.equal(p.fz_max, 0.17);
});

test("slug + guessVendor: real catalog filenames", () => {
  assert.equal(slug("GC_2023-2024_US_Milling.pdf"), "gc_2023-2024_us_milling".replace(/_/g, "-").replace(/[^a-z0-9]+/g, "-"));
  assert.equal(guessVendor("GC_2023-2024_US_Milling.pdf"), "tungaloy"); // GC = Tungaloy General Catalog (was mislabeled sandvik)
  assert.equal(guessVendor("Master Catalog 2018 Vol. 2 Rotating Tools English Inch.pdf"), "kennametal");
  assert.equal(guessVendor("Accupro 2013.pdf"), "accupro");
  assert.equal(guessVendor("Milling 2018.1.pdf"), "seco"); // SECO catalog naming (grades H15/XOMX), was mislabeled "milling"
  assert.equal(guessVendor("Turning 2018.1.pdf"), "seco");
});
