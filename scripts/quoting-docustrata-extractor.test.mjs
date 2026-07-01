/**
 * quoting-docustrata-extractor.test — iter42 unit test for extractor adapter.
 *
 * Tests pure-fn boundaries (parseCuratedSource, conditionedRecordToRevenueRecord,
 * rawInvoiceToRevenueRecord, applyMaxRecords) + the async entry-point against
 * temp curated sidecars. Engine market-conditioning is bypassed in tests via
 * skipMarketConditioning=true to keep these tests independent of mcp-server/dist.
 *
 * Run: node --test scripts/quoting-docustrata-extractor.test.mjs
 *
 * @milestone QUOTING-SYNERGY-MS0/U-QP-DOCUSTRATA-EXTRACTOR-WIRE (charlie /goal-yolo iter42)
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  parseCuratedSource,
  conditionedRecordToRevenueRecord,
  rawInvoiceToRevenueRecord,
  applyMaxRecords,
  extractDocustrataRevenueRecords,
  REVENUE_BOUNDS,
  SUPPORTED_CURATED_SCHEMA_VERSIONS,
} from "./quoting-docustrata-extractor.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ---------- parseCuratedSource ----------

test("parseCuratedSource: valid 1.0.0 payload returns invoices", () => {
  const content = JSON.stringify({
    schema_version: "1.0.0",
    invoices: [{ customer: "ALCOA", part_id: "p1", actual_invoice_usd: 1500 }],
  });
  const r = parseCuratedSource(content);
  assert.equal(r.ok, true);
  assert.equal(r.invoices.length, 1);
});

test("parseCuratedSource: malformed JSON returns parse-error", () => {
  const r = parseCuratedSource("{not-json");
  assert.equal(r.ok, false);
  assert.match(r.reason, /parse-error/);
});

test("parseCuratedSource: unsupported schema returns reason", () => {
  const r = parseCuratedSource(JSON.stringify({ schema_version: "9.9.9", invoices: [] }));
  assert.equal(r.ok, false);
  assert.match(r.reason, /unsupported-schema-version/);
});

test("parseCuratedSource: missing invoices array returns reason", () => {
  const r = parseCuratedSource(JSON.stringify({ schema_version: "1.0.0" }));
  assert.equal(r.ok, false);
  assert.match(r.reason, /missing-or-non-array-invoices/);
});

test("parseCuratedSource: non-object payload returns reason", () => {
  const r = parseCuratedSource(JSON.stringify(["not-an-object"]));
  assert.equal(r.ok, false);
});

// ---------- conditionedRecordToRevenueRecord ----------

test("conditionedRecordToRevenueRecord: full happy-path with market_adjusted revenue", () => {
  const rec = {
    customer: "alcoa",
    part_id: "P1",
    market_adjusted_invoice_usd: 1500.123,
    actual_invoice_usd: 1400,
  };
  const out = conditionedRecordToRevenueRecord(rec);
  assert.equal(out.customer, "ALCOA");
  assert.equal(out.part_id, "P1");
  assert.equal(out.revenue, 1500.12); // rounded to cents
});

test("conditionedRecordToRevenueRecord: falls back to actual_invoice_usd when no market-adjusted", () => {
  const rec = { customer: "ITW", part_id: "P2", actual_invoice_usd: 800 };
  const out = conditionedRecordToRevenueRecord(rec);
  assert.equal(out.revenue, 800);
});

test("conditionedRecordToRevenueRecord: rejects below-min revenue", () => {
  const rec = { customer: "ALCOA", part_id: "P1", market_adjusted_invoice_usd: 0.001 };
  assert.equal(conditionedRecordToRevenueRecord(rec), null);
});

test("conditionedRecordToRevenueRecord: rejects above-max revenue", () => {
  const rec = { customer: "ALCOA", part_id: "P1", market_adjusted_invoice_usd: REVENUE_BOUNDS.max + 1 };
  assert.equal(conditionedRecordToRevenueRecord(rec), null);
});

test("conditionedRecordToRevenueRecord: rejects NaN/Infinity revenue", () => {
  assert.equal(conditionedRecordToRevenueRecord({ customer: "X", part_id: "P", market_adjusted_invoice_usd: NaN }), null);
  assert.equal(conditionedRecordToRevenueRecord({ customer: "X", part_id: "P", market_adjusted_invoice_usd: Infinity }), null);
});

test("conditionedRecordToRevenueRecord: null/undefined inputs return null", () => {
  assert.equal(conditionedRecordToRevenueRecord(null), null);
  assert.equal(conditionedRecordToRevenueRecord(undefined), null);
  assert.equal(conditionedRecordToRevenueRecord({}), null);
});

test("conditionedRecordToRevenueRecord: uppercases customer + trims whitespace", () => {
  const out = conditionedRecordToRevenueRecord({ customer: "  alcoa inc  ", part_id: " P1 ", market_adjusted_invoice_usd: 100 });
  assert.equal(out.customer, "ALCOA INC");
  assert.equal(out.part_id, "P1");
});

// ---------- rawInvoiceToRevenueRecord ----------

test("rawInvoiceToRevenueRecord: maps raw invoice without engine pass", () => {
  const out = rawInvoiceToRevenueRecord({ customer: "ITW", part_id: "P3", actual_invoice_usd: 250 });
  assert.equal(out.customer, "ITW");
  assert.equal(out.part_id, "P3");
  assert.equal(out.revenue, 250);
});

test("rawInvoiceToRevenueRecord: rejects out-of-bounds revenue", () => {
  assert.equal(rawInvoiceToRevenueRecord({ customer: "X", part_id: "P", actual_invoice_usd: 0 }), null);
  assert.equal(rawInvoiceToRevenueRecord({ customer: "X", part_id: "P", actual_invoice_usd: 1e10 }), null);
});

// ---------- applyMaxRecords ----------

test("applyMaxRecords: caps to default 5000", () => {
  const rows = Array.from({ length: 6000 }, (_, i) => ({ customer: "X", part_id: `P${i}`, revenue: 1 }));
  assert.equal(applyMaxRecords(rows, undefined).length, 5000);
});

test("applyMaxRecords: caps to custom value", () => {
  const rows = Array.from({ length: 100 }, (_, i) => ({ customer: "X", part_id: `P${i}`, revenue: 1 }));
  assert.equal(applyMaxRecords(rows, 10).length, 10);
});

test("applyMaxRecords: hard upper bound 50k even if caller passes higher", () => {
  const rows = Array.from({ length: 60_000 }, () => ({ customer: "X", part_id: "P", revenue: 1 }));
  assert.equal(applyMaxRecords(rows, 100_000).length, 50_000);
});

test("applyMaxRecords: floor of 1 even if caller passes 0/negative", () => {
  const rows = [{ customer: "X", part_id: "P", revenue: 1 }, { customer: "Y", part_id: "Q", revenue: 1 }];
  assert.equal(applyMaxRecords(rows, 0).length, 1);
  assert.equal(applyMaxRecords(rows, -10).length, 1);
});

test("applyMaxRecords: non-array returns empty", () => {
  assert.deepEqual(applyMaxRecords(null, 100), []);
  assert.deepEqual(applyMaxRecords(undefined, 100), []);
});

// ---------- extractDocustrataRevenueRecords (async, tmp file) ----------

async function writeTmpCurated(payload) {
  const tmp = resolve(__dirname, `.tmp-curated-${process.pid}-${Date.now()}.json`);
  await fs.writeFile(tmp, JSON.stringify(payload));
  return tmp;
}

test("extractDocustrataRevenueRecords: happy path skipConditioning=true", async () => {
  const tmp = await writeTmpCurated({
    schema_version: "1.0.0",
    invoices: [
      { customer: "ALCOA", part_id: "p1", actual_invoice_usd: 1500 },
      { customer: "itw", part_id: "p2", actual_invoice_usd: 800 },
    ],
  });
  try {
    const r = await extractDocustrataRevenueRecords({ curatedPath: tmp, skipMarketConditioning: true });
    assert.equal(r.ok, true);
    assert.equal(r.records.length, 2);
    assert.equal(r.records[0].customer, "ALCOA");
    assert.equal(r.records[1].customer, "ITW"); // uppercased
    assert.equal(r.source, "docustrata-historical-pricing-trainer");
    assert.equal(r.schema_version, "1.0.0");
    assert.equal(r.stats.market_conditioning.applied, false);
  } finally {
    await fs.unlink(tmp);
  }
});

test("extractDocustrataRevenueRecords: missing curated source returns ok:false", async () => {
  const r = await extractDocustrataRevenueRecords({ curatedPath: "scripts/.does-not-exist.json", skipMarketConditioning: true });
  assert.equal(r.ok, false);
  assert.match(r.reason, /no-curated-source/);
});

test("extractDocustrataRevenueRecords: malformed curated source returns parse-error", async () => {
  const tmp = resolve(__dirname, `.tmp-curated-${process.pid}-${Date.now()}.json`);
  await fs.writeFile(tmp, "{not-json");
  try {
    const r = await extractDocustrataRevenueRecords({ curatedPath: tmp, skipMarketConditioning: true });
    assert.equal(r.ok, false);
    assert.match(r.reason, /parse-error/);
  } finally {
    await fs.unlink(tmp);
  }
});

test("extractDocustrataRevenueRecords: skips invoices missing required fields", async () => {
  const tmp = await writeTmpCurated({
    schema_version: "1.0.0",
    invoices: [
      { customer: "ALCOA", part_id: "p1", actual_invoice_usd: 1500 },        // good
      { customer: "ITW",   part_id: "p2", actual_invoice_usd: null },        // skip — null revenue
      { customer: null,    part_id: "p3", actual_invoice_usd: 800 },         // skip — null customer
      { customer: "BRADY", part_id: "p4", actual_invoice_usd: 999999999 },   // skip — exceeds bounds
      { customer: "SFS",   part_id: "p5", actual_invoice_usd: 1200 },        // good
    ],
  });
  try {
    const r = await extractDocustrataRevenueRecords({ curatedPath: tmp, skipMarketConditioning: true });
    assert.equal(r.ok, true);
    assert.equal(r.records.length, 2);
    assert.equal(r.stats.skipped_count, 3);
    assert.deepEqual(r.records.map((x) => x.customer).sort(), ["ALCOA", "SFS"]);
  } finally {
    await fs.unlink(tmp);
  }
});

test("extractDocustrataRevenueRecords: respects maxRecords", async () => {
  const invoices = Array.from({ length: 100 }, (_, i) => ({
    customer: `C${i}`,
    part_id: `P${i}`,
    actual_invoice_usd: 100 + i,
  }));
  const tmp = await writeTmpCurated({ schema_version: "1.0.0", invoices });
  try {
    const r = await extractDocustrataRevenueRecords({ curatedPath: tmp, skipMarketConditioning: true, maxRecords: 5 });
    assert.equal(r.records.length, 5);
    assert.equal(r.stats.bounded_count, 5);
    assert.equal(r.stats.mapped_count, 100);
  } finally {
    await fs.unlink(tmp);
  }
});

test("extractDocustrataRevenueRecords: variability ≥3 — mill, wire-EDM, lathe materials all extract", async () => {
  // Variability requirement from spec — covers CBE diversity gate.
  const tmp = await writeTmpCurated({
    schema_version: "1.0.0",
    invoices: [
      { customer: "ALCOA", part_id: "MILL-1", material: "AL6061", actual_invoice_usd: 250 },
      { customer: "ITW", part_id: "WEDM-1", material: "D2", actual_invoice_usd: 1800 },
      { customer: "BRADY", part_id: "LATHE-1", material: "316SS", actual_invoice_usd: 950 },
    ],
  });
  try {
    const r = await extractDocustrataRevenueRecords({ curatedPath: tmp, skipMarketConditioning: true });
    assert.equal(r.records.length, 3);
    const customers = new Set(r.records.map((x) => x.customer));
    assert.equal(customers.size, 3, "3 distinct customers spanning mill+wire-EDM+lathe");
  } finally {
    await fs.unlink(tmp);
  }
});

test("SUPPORTED_CURATED_SCHEMA_VERSIONS contains 1.0.0", () => {
  assert.equal(SUPPORTED_CURATED_SCHEMA_VERSIONS.has("1.0.0"), true);
});

test("REVENUE_BOUNDS sane defaults (matches iter19 validator)", () => {
  assert.equal(REVENUE_BOUNDS.min, 0.01);
  assert.equal(REVENUE_BOUNDS.max, 10_000_000);
});
