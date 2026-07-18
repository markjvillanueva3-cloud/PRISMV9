/**
 * Tests for build-global-cnc-tools-index.mjs (DB-COVERAGE-GAPFILL-MS0/U-GCNC01).
 * Run: node --test mcp-server/scripts/build-global-cnc-tools-index.test.mjs
 *
 * The generator's job is to mirror GLOBAL_CNC_TOOLS (the canonical .ts catalog source)
 * into the tracked dev JSON so dev == prod. These verify INTENT (R9):
 *  - parseCatalog pulls every record's fields by NAME (order-independent) and FAILS LOUD
 *    on an empty/changed source rather than mirroring an empty file over real data.
 *  - the interface declaration above the array is NOT mistaken for a data record.
 *  - summarize accounts for every record by type.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { parseCatalog, summarize } from "./build-global-cnc-tools-index.mjs";

// Fixture mirroring the real .ts: an interface block (must be ignored) then the array.
const FIXTURE = `
export interface GlobalCNCTool {
  partNumber: string;
  type: string;
  subType: string;
  productLine: string;
  manufacturer: string;
}

export const GLOBAL_CNC_TOOLS = [
  {partNumber:"8610C .250",type:"bushing",subType:"Tool Holder Bushing",productLine:"Bushings & Sleeves",manufacturer:"Global CNC"},
  {partNumber:"BMT45-8411A",type:"boring_bar_holder",subType:"BMT Holder",productLine:"BMT45",manufacturer:"Global CNC"},
  {partNumber:"BAF30-ER20-SLT-L-OS",type:"driven_drill_mill",subType:"Driven",productLine:"BAF30",manufacturer:"Global CNC"},
];
`;

test("parseCatalog extracts every record's fields by name (order-independent)", () => {
  const recs = parseCatalog(FIXTURE);
  assert.equal(recs.length, 3, "all 3 data records parsed (interface block ignored)");
  const bmt = recs.find((r) => r.partNumber === "BMT45-8411A");
  assert.equal(bmt.type, "boring_bar_holder");
  assert.equal(bmt.productLine, "BMT45");
  assert.equal(bmt.manufacturer, "Global CNC");
});

test("parseCatalog does NOT mistake the interface declaration for a data record", () => {
  const recs = parseCatalog(FIXTURE);
  // The interface field `partNumber: string;` would parse to {partNumber:"string"-less} —
  // it has no double-quoted partNumber value, so it must not appear as a record.
  assert.ok(!recs.some((r) => r.partNumber === "string"), "interface field not parsed as record");
});

test("parseCatalog THROWS on an empty source (fail-loud, never mirror empty over real data)", () => {
  assert.throws(() => parseCatalog("export const GLOBAL_CNC_TOOLS = [];"), /parsed 0 records/);
});

test("parseCatalog THROWS when no GLOBAL_CNC_TOOLS array is present (drift guard)", () => {
  assert.throws(() => parseCatalog("export const SOMETHING_ELSE = 5;"), /parsed 0 records/);
});

test("parseCatalog handles fields in a different order", () => {
  const reordered = `GLOBAL_CNC_TOOLS = [{type:"vdi_holder",manufacturer:"Global CNC",partNumber:"MP21.0620",productLine:"MP21"}]`;
  const recs = parseCatalog(reordered);
  assert.equal(recs.length, 1);
  assert.equal(recs[0].partNumber, "MP21.0620");
  assert.equal(recs[0].type, "vdi_holder");
});

test("summarize reports a per-type histogram summing to total", () => {
  const recs = parseCatalog(FIXTURE);
  const s = summarize(recs);
  assert.equal(s.total, 3);
  assert.deepEqual(s.byType, { bushing: 1, boring_bar_holder: 1, driven_drill_mill: 1 });
  const sum = Object.values(s.byType).reduce((a, b) => a + b, 0);
  assert.equal(sum, s.total, "histogram sums to total — no record lost");
});

test("parseCatalog tolerates part numbers with spaces and decimals", () => {
  const recs = parseCatalog(FIXTURE);
  assert.ok(recs.some((r) => r.partNumber === "8610C .250"), "space+decimal part number captured");
});

test("parseCatalog ignores a record missing the required partNumber/type keys", () => {
  const partial = `GLOBAL_CNC_TOOLS = [{subType:"x",productLine:"y"},{partNumber:"A1",type:"id_holder"}]`;
  const recs = parseCatalog(partial);
  assert.equal(recs.length, 1, "only the complete record is kept");
  assert.equal(recs[0].partNumber, "A1");
});
