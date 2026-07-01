#!/usr/bin/env node
/**
 * build-brand-tool-catalog-index.test.mjs -- tests for the app-consumable catalog index.
 * Run: node scripts/build-brand-tool-catalog-index.test.mjs   (node:test auto-runs on exit)
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { buildIndex } from "./build-brand-tool-catalog-index.mjs";

const fake = {
  records: [
    { brand: "Sandvik", category: "solid_mill", geometry_complete: true },
    { brand: "Sandvik", category: "drill", geometry_complete: false },
    { brand: "ISCAR", category: "insert", geometry_complete: true },
    { brand: "ISCAR", category: "insert", geometry_complete: true },
  ],
  stats: { total: 4, brands: 2, geometry_complete_pct: 75, duplicates_dropped: 9 },
};

test("buildIndex: totals + dedup carried from catalog stats", () => {
  const idx = buildIndex(fake);
  assert.equal(idx.totals.tools, 4);
  assert.equal(idx.totals.brands, 2);
  assert.equal(idx.totals.duplicatesDropped, 9);
  assert.equal(idx.schemaVersion, "1.0.0");
});

test("buildIndex: byCategory aggregate", () => {
  const idx = buildIndex(fake);
  assert.equal(idx.byCategory.solid_mill, 1);
  assert.equal(idx.byCategory.drill, 1);
  assert.equal(idx.byCategory.insert, 2);
});

test("buildIndex: per-brand sorted with category matrix + geometry pct", () => {
  const idx = buildIndex(fake);
  assert.equal(idx.brands[0].brand, "ISCAR");     // sorted
  assert.equal(idx.brands[1].brand, "Sandvik");
  assert.equal(idx.brands[1].total, 2);
  assert.equal(idx.brands[1].categories.solid_mill, 1);
  assert.equal(idx.brands[1].categories.drill, 1);
  assert.equal(idx.brands[1].geometryCompletePct, 50);  // 1 of 2 complete
  assert.equal(idx.brands[0].geometryCompletePct, 100); // both inserts complete
});

test("buildIndex: file pointers per format + brandSlug", () => {
  const idx = buildIndex(fake);
  const sandvik = idx.brands.find((b) => b.brand === "Sandvik");
  assert.equal(sandvik.slug, "SANDVIK");
  assert.equal(sandvik.files.fusion, "fusion/PRISM_SANDVIK.tools");
  assert.equal(sandvik.files.hypermill, "hypermill/PRISM_SANDVIK.hmt.sql");
  assert.equal(sandvik.files.mastercam, "mastercam/PRISM_SANDVIK_tools.csv");
  assert.equal(sandvik.files["mastercam-inserts"], "mastercam-inserts/PRISM_SANDVIK_inserts.csv");
  assert.equal(sandvik.files["hypermill-inserts"], "hypermill-inserts/PRISM_SANDVIK_inserts.hmt.sql");
  assert.equal(sandvik.files["mastercam-holders"], "mastercam-holders/PRISM_SANDVIK_holders.csv");
  assert.equal(sandvik.files["hypermill-holders"], "hypermill-holders/PRISM_SANDVIK_holders.hmt.sql");
  assert.equal(Object.keys(sandvik.files).length, 7, "all 7 format lanes pointed to");
});

test("buildIndex: brand with non-alnum chars slugged for file pointers", () => {
  const idx = buildIndex({ records: [{ brand: "YG-1", category: "drill", geometry_complete: true }], stats: { total: 1, brands: 1, geometry_complete_pct: 100, duplicates_dropped: 0 } });
  assert.equal(idx.brands[0].slug, "YG_1");
  assert.equal(idx.brands[0].files.fusion, "fusion/PRISM_YG_1.tools");
});

test("buildIndex: empty catalog -> empty index, no throw", () => {
  const idx = buildIndex({ records: [], stats: { total: 0, brands: 0, geometry_complete_pct: 0, duplicates_dropped: 0 } });
  assert.equal(idx.brands.length, 0);
  assert.deepEqual(idx.byCategory, {});
});
