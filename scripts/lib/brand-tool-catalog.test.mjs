#!/usr/bin/env node
/**
 * brand-tool-catalog.test.mjs -- real-value + adversarial tests for the unified brand-tool loader.
 * Run: node scripts/lib/brand-tool-catalog.test.mjs   (node:test auto-runs on exit)
 *
 * R9/R15 coverage contract: every transform asserts a REAL value (never toBeDefined stubs);
 * each surface has the happy path + >=3 failure modes + >=2 adversarial inputs. The loader is
 * exercised against a temp fixture dir (hermetic) AND the live corpus is asserted via a
 * non-fatal smoke check that skips loud when the data dir is absent.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  MM_PER_INCH, normalizeRecord, categorize, detectUnit, inferBrand, canonicalBrand,
  isPlausibleGeometry, isEndmillOversizeDia, ENDMILL_DIA_MAX_MM, SHANK_RATIO_MAX,
  OAL_MAX_MM, LCF_MAX_MM, SHANK_MAX_MM, plausibleLengthMm,
  discoverCatalogFiles, loadBrandCatalog, DEFAULT_DATA_DIR,
} from "./brand-tool-catalog.mjs";

// ## inferBrand
test("inferBrand: simple, alias, multi-word, acronym", () => {
  assert.equal(inferBrand("helical-tools.json"), "Helical");
  assert.equal(inferBrand("big-daishowa-holder-extracted.json"), "Big Daishowa");
  assert.equal(inferBrand("ma-ford-tools-extracted.json"), "MA Ford");
  assert.equal(inferBrand("global-cnc-tools.json"), "Global CNC");
  assert.equal(inferBrand("osg-tools.json"), "OSG"); // <=3 chars -> upper
});

// ## detectUnit (UNITS-FIRST)
test("detectUnit: explicit inch key", () => {
  assert.equal(detectUnit({ unit: "inches", diameter: 0.5 }), "inches");
});
test("detectUnit: snake_case _mm wins", () => {
  assert.equal(detectUnit({ cutting_diameter_mm: 10 }), "mm");
});
test("detectUnit: inch-only key", () => {
  assert.equal(detectUnit({ ic_inch: 0.5 }), "inches");
});
test("detectUnit: camelCase solid heuristic (small dia => inch)", () => {
  assert.equal(detectUnit({ diameter: 0.5, numberOfFlutes: 3 }), "inches");
});
test("detectUnit: camelCase large solid dia => mm", () => {
  assert.equal(detectUnit({ diameter: 12, fluteLength: 30 }), "mm");
});
test("detectUnit: no cue => unknown (never assume metric)", () => {
  assert.equal(detectUnit({ designation: "X", type: "holder" }), "unknown");
});

// ## categorize
test("categorize: every primary class + fallbacks", () => {
  assert.equal(categorize({ type: "flat_end_mill" }), "solid_mill");
  assert.equal(categorize({ type: "end_mill", subtype: "indexable" }), "indexable_mill");
  assert.equal(categorize({ type: "drill" }), "drill");
  assert.equal(categorize({ type: "holemaking" }), "drill");
  assert.equal(categorize({ type: "turning_insert" }), "insert");
  assert.equal(categorize({ type: "thread_mill" }), "thread");
  assert.equal(categorize({ type: "holder" }), "holder");
  assert.equal(categorize({ type: "reamer" }), "reamer");
  assert.equal(categorize({ type: "turning_tool" }), "turning");
  assert.equal(categorize({ type: "boring_bar" }), "turning");
  assert.equal(categorize({ type: "countersink" }), "drill");
  assert.equal(categorize({ isoNumber: "CNMG120408" }), "insert"); // cue fallback
  assert.equal(categorize({ numberOfFlutes: 4 }), "solid_mill");   // cue fallback
  assert.equal(categorize({ type: "mystery" }), "unknown");
});

// ## canonicalBrand -- collapse source casing/punctuation splits
test("canonicalBrand: ISCAR/Iscar and YG-1/YG1 collapse to one", () => {
  assert.equal(canonicalBrand("Iscar"), "ISCAR");
  assert.equal(canonicalBrand("ISCAR"), "ISCAR");
  assert.equal(canonicalBrand("YG1"), "YG-1");
  assert.equal(canonicalBrand("YG-1"), "YG-1");
  assert.equal(canonicalBrand("UnknownMaker"), "UnknownMaker"); // pass-through
});

// ## normalizeRecord -- happy paths (3 schema families)
test("normalizeRecord: camelCase inch solid -> mm geometry", () => {
  const r = normalizeRecord({
    productId: "04287", type: "flat_end_mill", unit: "inches",
    diameter: 0.5, shaftDiameter: 0.5, fluteLength: 0.625, overallLength: 4,
    numberOfFlutes: 3, cornerRadius: 0, coating: "ZrN", bodyMaterial: "carbide",
  }, "Helical");
  assert.equal(r.id, "04287");
  assert.equal(r.brand, "Helical");
  assert.equal(r.category, "solid_mill");
  assert.equal(r.unit_source, "inches");
  assert.equal(r.diameter_mm, 12.7);              // 0.5 * 25.4
  assert.equal(r.oal_mm, 101.6);                  // 4 * 25.4
  assert.equal(r.num_flutes, 3);
  assert.equal(r.geometry_complete, true);
});
test("normalizeRecord: snake_case mm copied verbatim (NO double-scale)", () => {
  const r = normalizeRecord({
    designation: "R217.69", manufacturer: "Kennametal", type: "end_mill",
    subtype: "indexable", cutting_diameter_mm: 10, shank_diameter_mm: 8, overall_length_mm: 100,
  });
  assert.equal(r.category, "indexable_mill");
  assert.equal(r.unit_source, "mm");
  assert.equal(r.diameter_mm, 10);   // unchanged
  assert.equal(r.shank_mm, 8);
  assert.equal(r.oal_mm, 100);
  assert.equal(r.geometry_complete, true);
});
test("normalizeRecord: turning insert uses inscribed circle", () => {
  const r = normalizeRecord({
    catalogNumber: "CNGG430FS", isoNumber: "CNGG120401FS", type: "turning_insert",
    shape: "diamond_80", ic_mm: 12.7, cornerRadius_mm: 0.1,
  });
  assert.equal(r.category, "insert");
  assert.equal(r.diameter_mm, 12.7);
  assert.equal(r.corner_radius_mm, 0.1);
  assert.equal(r.iso_number, "CNGG120401FS");
  assert.equal(r.geometry_complete, true);
});

// ## normalizeRecord -- failure modes
test("normalizeRecord: null / non-object -> null", () => {
  assert.equal(normalizeRecord(null), null);
  assert.equal(normalizeRecord(42), null);
  assert.equal(normalizeRecord("x"), null);
});
test("normalizeRecord: no id -> null", () => {
  assert.equal(normalizeRecord({ type: "flat_end_mill", diameter: 0.5 }), null);
});
test("normalizeRecord: unknown category + no diameter cue -> null", () => {
  assert.equal(normalizeRecord({ designation: "X", type: "mystery" }), null);
});
test("normalizeRecord: holder name-only -> kept but geometry_complete false", () => {
  const r = normalizeRecord({ designation: "MEGA10N", manufacturer: "Big Daishowa", type: "holder" });
  assert.equal(r.category, "holder");
  assert.equal(r.geometry_complete, false);
  assert.equal(r.unit_source, "unknown");
});

// ## normalizeRecord -- adversarial
test("normalizeRecord: mm key resolves mm and copies verbatim", () => {
  const r = normalizeRecord({ designation: "Q", type: "holder", cutting_diameter_mm: 32 });
  assert.equal(r.unit_source, "mm");
  assert.equal(r.diameter_mm, 32);
});
test("normalizeRecord: unknown-unit cutter dia is NOT fabricated to mm (units-first rail)", () => {
  // boring_bar (category turning) with a bare camel diameter, no unit key, no _mm/_inch,
  // no solid-flute cue -> unit MUST resolve unknown and diameter_mm MUST stay null.
  // This pins the no-25.4x-guess safety rail (the file's raison d'etre): if toMm ever
  // fabricated an mm value for unknown units, THIS assertion flips red.
  const r = normalizeRecord({ productId: "BB1", type: "boring_bar", diameter: 0.5 });
  assert.equal(r.category, "turning");
  assert.equal(r.unit_source, "unknown");
  assert.equal(r.diameter_mm, null);
  assert.equal(r.geometry_complete, false);
});
test("normalizeRecord: NaN / negative / string numbers coerced safely", () => {
  const r = normalizeRecord({
    productId: "S", type: "flat_end_mill", unit: "inches",
    diameter: "0.25", fluteLength: NaN, overallLength: 2, numberOfFlutes: "4",
  });
  assert.equal(r.diameter_mm, 6.35);  // "0.25" -> 0.25 * 25.4
  assert.equal(r.flute_len_mm, null); // NaN -> null, not 0
  assert.equal(r.num_flutes, 4);      // "4" -> 4
});
test("normalizeRecord: inch insert via ic_inch only", () => {
  const r = normalizeRecord({ catalogNumber: "I", type: "turning_insert", ic_inch: 0.5, cornerRadius_mm: 0.8 });
  assert.equal(r.diameter_mm, 12.7);  // ic_inch 0.5 -> mm
  assert.equal(r.geometry_complete, true);
});

// ## isPlausibleGeometry -- guards source mis-parses
test("isPlausibleGeometry: rejects impossible, accepts real, passes name-only", () => {
  assert.equal(isPlausibleGeometry("drill", 380), false);       // YG1-380.0 mis-parse
  assert.equal(isPlausibleGeometry("drill", 6.35), true);       // real 1/4 drill
  assert.equal(isPlausibleGeometry("solid_mill", 152.4), true); // type-BLIND dia-ceiling admits 152.4 for the CATEGORY; the type-aware end-mill gate still drops a 152.4mm end_mill (see U-BRAND-CATALOG-CLEANUP test below)
  assert.equal(isPlausibleGeometry("solid_mill", 500), false);  // no 500mm solid endmill
  assert.equal(isPlausibleGeometry("indexable_mill", 311), true); // ISCAR face mill OK
  assert.equal(isPlausibleGeometry("indexable_mill", 400), false);
  assert.equal(isPlausibleGeometry("insert", 12.7), true);
  assert.equal(isPlausibleGeometry("insert", 80), false);
  assert.equal(isPlausibleGeometry("solid_mill", 0), false);    // zero/negative
  assert.equal(isPlausibleGeometry("solid_mill", -5), false);
  assert.equal(isPlausibleGeometry("holder", null), true);      // name-only: nothing to judge
  assert.equal(isPlausibleGeometry("holder", 200), true);       // no dia ceiling for holders
});
test("normalizeRecord: 380mm drill flagged geometry_plausible false", () => {
  const r = normalizeRecord({ designation: "YG1-380.0", manufacturer: "YG-1", type: "drill", cutting_diameter_mm: 380, shank_diameter_mm: 380 });
  assert.equal(r.category, "drill");
  assert.equal(r.diameter_mm, 380);
  assert.equal(r.geometry_plausible, false);
});

// ## End-mill mis-parse gates (U-BRAND-CATALOG-CLEANUP 2026-06-20)
test("isEndmillOversizeDia: end mills >80mm flagged, face/shell + non-endmill spared", () => {
  assert.equal(ENDMILL_DIA_MAX_MM, 80);
  assert.equal(SHANK_RATIO_MAX, 8);
  assert.equal(isEndmillOversizeDia("indexable_mill", "end_mill", 102.67), true); // ISCAR ECS-A mis-parse
  assert.equal(isEndmillOversizeDia("solid_mill", "flat_end_mill", 200), true);
  assert.equal(isEndmillOversizeDia("indexable_mill", "face mill", 100), false);  // real face mill spared
  assert.equal(isEndmillOversizeDia("solid_mill", "shell mill", 120), false);     // shell mill spared
  assert.equal(isEndmillOversizeDia("solid_mill", "flat_end_mill", 50), false);   // under ceiling
  assert.equal(isEndmillOversizeDia("drill", "drill", 100), false);               // not an end mill
});
test("normalizeRecord: bad-diameter end mill (ISCAR ECS-A) -> geometry_plausible false", () => {
  const r = normalizeRecord({ designation: "M ECS-A1.00X06-2T", manufacturer: "ISCAR", type: "end_mill", subtype: "indexable", cutting_diameter_mm: 102.67, shank_diameter_mm: 5.99 });
  assert.equal(r.category, "indexable_mill");
  assert.equal(r.diameter_mm, 102.67);
  assert.equal(r.geometry_plausible, false); // dropped from every CAM lane
});
test("normalizeRecord: bad-shank end mill -> diameter kept, shank nulled, record SURVIVES", () => {
  const r = normalizeRecord({ designation: "ACCU-0.3750", manufacturer: "Accupro", type: "end_mill", cutting_diameter_mm: 9.5, shank_diameter_mm: 0.8, num_flutes: 4 });
  assert.equal(r.category, "solid_mill");
  assert.equal(r.diameter_mm, 9.5);   // usable diameter preserved
  assert.equal(r.shank_mm, null);     // impossible 0.8mm shank dropped -> emitter falls back to Dc
  assert.equal(r.geometry_plausible, true); // record is KEPT (not dropped)
});
test("normalizeRecord: real large face mill is NOT dropped", () => {
  const r = normalizeRecord({ designation: "FACE-100", manufacturer: "Sandvik", type: "face mill", subtype: "indexable", cutting_diameter_mm: 100, shank_diameter_mm: 22 });
  assert.equal(r.geometry_plausible, true);
  assert.equal(r.shank_mm, 22); // plausible shank preserved (ratio 4.5 < 8)
});
test("normalizeRecord: clean end mill keeps diameter + shank, stays plausible", () => {
  const r = normalizeRecord({ designation: "EM-12", type: "flat_end_mill", cutting_diameter_mm: 12, shank_diameter_mm: 12, num_flutes: 3 });
  assert.equal(r.geometry_plausible, true);
  assert.equal(r.shank_mm, 12);
});
test("normalizeRecord: 152.4mm 'end_mill' (MA Ford 6in mis-parse) dropped -- type-aware gate overrides the category dia-ceiling", () => {
  // MA Ford 'MA -6.0000-3F' carries cutting_diameter_mm 152.4 with a meter-scale OAL -- a solid end
  // mill cannot be 6in; the category-only ceiling admits it but isEndmillOversizeDia (>80mm) drops it.
  const r = normalizeRecord({ designation: "MA-6.0000-3F", manufacturer: "MA Ford", type: "end_mill", cutting_diameter_mm: 152.4, shank_diameter_mm: 25.4 });
  assert.equal(isPlausibleGeometry("solid_mill", 152.4), true); // type-blind ceiling alone admits it
  assert.equal(r.geometry_plausible, false);                    // but the end-mill gate drops it
});

// ## loadBrandCatalog -- hermetic fixture dir
test("loadBrandCatalog: loads good, records malformed (non-fatal), parses wrappers", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "brandcat-"));
  try {
    fs.writeFileSync(path.join(dir, "acme-tools.json"), JSON.stringify([
      { productId: "A1", type: "flat_end_mill", unit: "inches", diameter: 0.5, overallLength: 3, numberOfFlutes: 4 },
      { productId: "A2", type: "drill", unit: "inches", diameter: 0.25, overallLength: 2 },
      { junk: true }, // filtered (no id/category)
    ]));
    fs.writeFileSync(path.join(dir, "wrapped-tools.json"), JSON.stringify({
      tools: [{ designation: "W1", type: "turning_insert", ic_mm: 9.525, cornerRadius_mm: 0.4 }],
    }));
    fs.writeFileSync(path.join(dir, "broken-tools.json"), "{ this is not json ");

    const cat = loadBrandCatalog({ dataDir: dir });
    assert.equal(cat.stats.total, 3);                 // 2 acme + 1 wrapped; junk dropped
    assert.equal(cat.stats.files_errored, 1);         // broken recorded, not thrown
    assert.equal(cat.byCategory.solid_mill, 1);
    assert.equal(cat.byCategory.drill, 1);
    assert.equal(cat.byCategory.insert, 1);
    assert.ok(cat.byBrand.Acme >= 2);
    const broken = cat.files.find((f) => f.file === "broken-tools.json");
    assert.ok(broken.error, "broken file error recorded");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
test("loadBrandCatalog: record-level dedup -- true dup collapses, complementary kept, prefer complete", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "brandcat-dedup-"));
  try {
    // File A (rich): DUP1 complete, UNIQUE_A
    fs.writeFileSync(path.join(dir, "acme-tools.json"), JSON.stringify([
      { productId: "DUP1", manufacturer: "Acme", type: "flat_end_mill", unit: "inches", diameter: 0.5, overallLength: 3, numberOfFlutes: 4 },
      { productId: "UNIQUE_A", manufacturer: "Acme", type: "drill", unit: "inches", diameter: 0.25, overallLength: 2 },
    ]));
    // File B (extracted): DUP1 again (sparse, no OAL -> incomplete) + DUP1-as-complete elsewhere; UNIQUE_B
    fs.writeFileSync(path.join(dir, "acme-extracted.json"), JSON.stringify([
      { designation: "DUP1", manufacturer: "Acme", type: "flat_end_mill", cutting_diameter_mm: 12.7 }, // no OAL/flute -> incomplete dup of DUP1
      { designation: "UNIQUE_B", manufacturer: "Acme", type: "end_mill", cutting_diameter_mm: 8, overall_length_mm: 50 },
    ]));
    const cat = loadBrandCatalog({ dataDir: dir });
    // DUP1 collapses to ONE; UNIQUE_A + UNIQUE_B both kept -> 3 records
    assert.equal(cat.stats.total, 3);
    assert.equal(cat.stats.duplicates_dropped, 1);
    const dup1 = cat.records.filter((r) => r.id === "DUP1");
    assert.equal(dup1.length, 1, "DUP1 deduped to one");
    assert.equal(dup1[0].geometry_complete, true, "kept the geometry-complete copy (rich file's OAL)");
    assert.ok(cat.records.some((r) => r.id === "UNIQUE_A") && cat.records.some((r) => r.id === "UNIQUE_B"));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("loadBrandCatalog: empty dir -> zero records, no throw", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "brandcat-empty-"));
  try {
    const cat = loadBrandCatalog({ dataDir: dir });
    assert.equal(cat.stats.total, 0);
    assert.equal(cat.stats.brands, 0);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
test("discoverCatalogFiles: throws on missing dir", () => {
  assert.throws(() => discoverCatalogFiles(path.join(os.tmpdir(), "definitely-not-here-xyz")));
});

// ## live corpus smoke (non-fatal skip if absent)
test("live corpus: spans many brands with geometry coverage (smoke)", () => {
  if (!fs.existsSync(DEFAULT_DATA_DIR)) {
    console.log("  [skip] live data dir absent");
    return;
  }
  const cat = loadBrandCatalog();
  assert.ok(cat.stats.total > 1000, `expected >1000 records, got ${cat.stats.total}`);
  assert.ok(cat.stats.brands >= 8, `expected >=8 brands, got ${cat.stats.brands}`);
  assert.equal(cat.stats.files_errored, 0, "no live file should error");
  assert.ok(cat.byCategory.solid_mill > 0 && cat.byCategory.insert > 0);
});

test("MM_PER_INCH is the canonical constant", () => {
  assert.equal(MM_PER_INCH, 25.4);
});

// ## Length mis-parse sanitize (U-FUSION-INCH-CLEAN 2026-06-21)
test("plausibleLengthMm: in/out of bounds", () => {
  assert.equal(plausibleLengthMm(100, OAL_MAX_MM), true);
  assert.equal(plausibleLengthMm(OAL_MAX_MM, OAL_MAX_MM), true); // inclusive upper bound
  assert.equal(plausibleLengthMm(OAL_MAX_MM + 0.1, OAL_MAX_MM), false);
  assert.equal(plausibleLengthMm(0, OAL_MAX_MM), false);
  assert.equal(plausibleLengthMm(-5, OAL_MAX_MM), false);
  assert.equal(plausibleLengthMm(null, OAL_MAX_MM), false);
  assert.equal(plausibleLengthMm(NaN, OAL_MAX_MM), false);
});

test("normalizeRecord: garbage OAL (>1000mm) is nulled, diameter KEPT (R12 no-drop)", () => {
  const r = normalizeRecord({ designation: "Generic UNK-2.5000-4F", manufacturer: "Generic", type: "end_mill",
    cutting_diameter_mm: 63.5, overall_length_mm: 1447.8, num_flutes: 4 });
  assert.equal(r.diameter_mm, 63.5, "usable cutting diameter preserved");
  assert.equal(r.oal_mm, null, "impossible 1447.8mm OAL nulled");
  assert.equal(r.geometry_plausible, true, "tool not dropped -- diameter is fine");
});

test("normalizeRecord: garbage flute length (>1000mm) is nulled", () => {
  const r = normalizeRecord({ designation: "Flash EBAI-B3", manufacturer: "Flash", type: "end_mill",
    cutting_diameter_mm: 25.4, flute_length_mm: 1270, overall_length_mm: 90 });
  assert.equal(r.flute_len_mm, null, "impossible 1270mm flute nulled");
  assert.equal(r.oal_mm, 90, "valid OAL preserved");
});

test("normalizeRecord: oversize shank (>250mm) and non-positive shank are nulled", () => {
  const big = normalizeRecord({ designation: "Flash ECI-5", manufacturer: "Flash", type: "end_mill",
    cutting_diameter_mm: 6.35, shank_diameter_mm: 25374.6, num_flutes: 3 });
  assert.equal(big.shank_mm, null, "impossible 25374mm shank nulled -> emitter falls back SFDM=DC");
  assert.equal(big.diameter_mm, 6.35);
  const zero = normalizeRecord({ designation: "Z", manufacturer: "X", type: "end_mill",
    cutting_diameter_mm: 6, shank_diameter_mm: 0 });
  assert.equal(zero.shank_mm, null, "0 shank nulled");
});

test("normalizeRecord: valid lengths within bounds are untouched", () => {
  const r = normalizeRecord({ designation: "EM-12", manufacturer: "Helical", type: "flat_end_mill",
    cutting_diameter_mm: 12.7, shank_diameter_mm: 12.7, flute_length_mm: 25, overall_length_mm: 76, num_flutes: 4 });
  assert.equal(r.oal_mm, 76);
  assert.equal(r.flute_len_mm, 25);
  assert.equal(r.shank_mm, 12.7);
});
