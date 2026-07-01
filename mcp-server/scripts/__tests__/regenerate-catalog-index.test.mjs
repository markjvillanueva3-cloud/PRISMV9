/**
 * regenerate-catalog-index.test.mjs -- regression test for the record-aware catalog
 * merge (U-DBCON-1, slot:romeo 2026-06-12).
 *
 * Pins the behavior that BOTH CatalogCorpusLoaderEngine.readVendorFile AND
 * regenerate-catalog-index.countRecords must share (KEEP-IN-SYNC): a multi-section
 * catalog merges every array of RECORDS (designation/part_number) and EXCLUDES
 * non-record arrays (speed_feed_data, cutting_conditions, summary rows). Fails loud if
 * either copy drifts back to the old first-array-only behavior (the undercount bug).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { countRecords, inferEntry } from "../regenerate-catalog-index.mjs";

const SRC_DATA = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "src", "data");
const read = (f) => JSON.parse(readFileSync(resolve(SRC_DATA, f), "utf8"));

test("countRecords merges multi-section RECORD arrays (turning + threading inserts)", () => {
  const data = {
    summary: { total: 3 },
    turning_inserts: [{ designation: "CNMG" }, { designation: "DNMG" }],
    threading_inserts: [{ designation: "16ER" }],
    speed_feed_data: [{ material: "steel", vc: 100 }, { material: "ss", vc: 60 }],
  };
  // 2 turning + 1 threading = 3; speed_feed_data (no designation) is EXCLUDED.
  assert.equal(countRecords(data), 3);
});

test("countRecords: a non-record array never inflates the count, even when larger", () => {
  const data = { speed_feed_data: [{ vc: 1 }, { vc: 2 }, { vc: 3 }], turning_inserts: [{ designation: "A" }] };
  assert.equal(countRecords(data), 1); // only the record array, NOT the 3-row speed_feed_data
});

test("countRecords: flat array passes straight through", () => {
  assert.equal(countRecords([{ designation: "X" }, { designation: "Y" }]), 2);
});

test("countRecords: part_number also identifies a record array", () => {
  assert.equal(countRecords({ tools: [{ part_number: "P1" }, { part_number: "P2" }], notes: [{ text: "x" }] }), 2);
});

test("countRecords back-compat: object with NO record arrays falls back to first non-empty array", () => {
  assert.equal(countRecords({ rows: [{ vc: 1 }, { vc: 2 }] }), 2);
});

test("real orphans count record-aware (regression: fails if the merge logic drifts back to first-array)", () => {
  // The proven values U-DBCON-1 routed into CATALOG_INDEX. The OLD first-array behavior
  // would yield 356 / 2561 / 613 -- these assertions catch a regression to that.
  assert.equal(countRecords(read("tungaloy-tooling-extracted.json")), 356);
  assert.equal(countRecords(read("tungaloy-turning-extracted.json")), 2973);
  assert.equal(countRecords(read("widia-2022-extracted.json")), 1122);
});

test("inferEntry infers manufacturer + type for the routed orphans", () => {
  assert.deepEqual(inferEntry("tungaloy-tooling-extracted.json"),
    { file: "tungaloy-tooling-extracted.json", manufacturer: "Tungaloy", type: "holders", entries: 0 });
  assert.deepEqual(inferEntry("tungaloy-turning-extracted.json"),
    { file: "tungaloy-turning-extracted.json", manufacturer: "Tungaloy", type: "inserts", entries: 0 });
  assert.deepEqual(inferEntry("widia-2022-extracted.json"),
    { file: "widia-2022-extracted.json", manufacturer: "Widia", type: "inserts", entries: 0 });
});
