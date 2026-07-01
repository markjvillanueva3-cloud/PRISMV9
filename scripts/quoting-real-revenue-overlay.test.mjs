/**
 * quoting-real-revenue-overlay.test.mjs — pure-function tests for the
 * real-revenue overlay. node --test.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { canonicalKey, buildRevenueIndex, overlayRevenue } from "./quoting-real-revenue-overlay.mjs";

test("canonicalKey — normalizes to uppercase pipe", () => {
  assert.equal(canonicalKey("agrati", "ag-1138-l"), "AGRATI|AG-1138-L");
  assert.equal(canonicalKey(" Atf ", " af-102-05 "), "ATF|AF-102-05");
});

test("canonicalKey — rejects empty halves", () => {
  assert.equal(canonicalKey("", "p1"), null);
  assert.equal(canonicalKey("c", ""), null);
  assert.equal(canonicalKey(null, "p1"), null);
  assert.equal(canonicalKey(undefined, undefined), null);
});

test("buildRevenueIndex — happy path on curated set", () => {
  const invoices = [
    { customer: "ATF", part_id: "AF-102-05", actual_invoice_usd: 268.0, predicted_quote_usd: 245.0, quantity: 25 },
    { customer: "ALLFAST", part_id: "AL-50-S", actual_invoice_usd: 182.0 },
  ];
  const { index, warnings, skipped } = buildRevenueIndex(invoices);
  assert.equal(index.size, 2);
  assert.equal(skipped, 0);
  assert.deepEqual(warnings, []);
  assert.equal(index.get("ATF|AF-102-05").actual_revenue_usd, 268.0);
});

test("buildRevenueIndex — drops invalid records", () => {
  const invoices = [
    { customer: "X", part_id: "P1", actual_invoice_usd: NaN },
    { customer: "Y", part_id: "P1", actual_invoice_usd: -10 },
    { customer: "", part_id: "P1", actual_invoice_usd: 100 },
    { customer: "Z", part_id: "P2", actual_invoice_usd: 200 },
  ];
  const { index, skipped } = buildRevenueIndex(invoices);
  assert.equal(index.size, 1);
  assert.equal(skipped, 3);
});

test("buildRevenueIndex — non-array input fail-soft", () => {
  const r = buildRevenueIndex(null);
  assert.equal(r.index.size, 0);
  assert.ok(r.warnings.length > 0);
});

test("buildRevenueIndex — duplicate key warns + last-wins", () => {
  const invoices = [
    { customer: "X", part_id: "P1", actual_invoice_usd: 100 },
    { customer: "X", part_id: "P1", actual_invoice_usd: 150 },
  ];
  const { index, warnings } = buildRevenueIndex(invoices);
  assert.equal(index.size, 1);
  assert.equal(index.get("X|P1").actual_revenue_usd, 150);
  assert.equal(warnings.length, 1);
  assert.ok(warnings[0].includes("duplicate"));
});

test("overlayRevenue — strict policy exact match", () => {
  const { index } = buildRevenueIndex([
    { customer: "AGRATI", part_id: "AG-1138-L", actual_invoice_usd: 338 },
  ]);
  const records = [
    { customer: "AGRATI", part_id: "AG-1138-L", actual_revenue_usd: 100, revenue_source: "docustrata-synth" },
    { customer: "ATF", part_id: "AF-102-05", actual_revenue_usd: 200, revenue_source: "docustrata-synth" },
  ];
  const { records: out, report } = overlayRevenue(records, index, { policy: "strict" });
  assert.equal(report.matched, 1);
  assert.equal(report.unmatched, 1);
  assert.equal(out[0].actual_revenue_usd, 338);
  assert.equal(out[0].revenue_source, "docustrata-real");
  assert.equal(out[1].actual_revenue_usd, 200);
  assert.equal(out[1].revenue_source, "docustrata-synth");
});

test("overlayRevenue — fuzzy-customer policy matches substring", () => {
  const { index } = buildRevenueIndex([
    { customer: "JM DIE COMPANY", part_id: "INTERNAL-FIX-01", actual_invoice_usd: 875 },
  ]);
  const records = [
    { customer: "JM DIE", part_id: "INTERNAL-FIX-01", actual_revenue_usd: 100 },
  ];
  const { records: out, report } = overlayRevenue(records, index, { policy: "fuzzy-customer" });
  assert.equal(report.matched, 1);
  assert.equal(out[0].actual_revenue_usd, 875);
  assert.equal(out[0].revenue_source, "docustrata-real");
});

test("overlayRevenue — purity: input records not mutated", () => {
  const { index } = buildRevenueIndex([
    { customer: "X", part_id: "P1", actual_invoice_usd: 999 },
  ]);
  const inputs = [{ customer: "X", part_id: "P1", actual_revenue_usd: 1 }];
  const snapshot = JSON.stringify(inputs);
  overlayRevenue(inputs, index, { policy: "strict" });
  assert.equal(JSON.stringify(inputs), snapshot);
});

test("overlayRevenue — empty records returns empty + zero-counts", () => {
  const { index } = buildRevenueIndex([{ customer: "X", part_id: "P1", actual_invoice_usd: 100 }]);
  const { records: out, report } = overlayRevenue([], index);
  assert.deepEqual(out, []);
  assert.equal(report.matched, 0);
  assert.equal(report.unmatched, 0);
});

test("overlayRevenue — non-array input fail-soft", () => {
  const { index } = buildRevenueIndex([]);
  const { records, report } = overlayRevenue(null, index);
  assert.deepEqual(records, []);
  assert.equal(report.total, 0);
});

test("overlayRevenue — source_hits counts match buckets", () => {
  const { index } = buildRevenueIndex([
    { customer: "A", part_id: "P1", actual_invoice_usd: 100 },
  ]);
  const recs = [
    { customer: "A", part_id: "P1", actual_revenue_usd: 1 },
    { customer: "B", part_id: "P2", actual_revenue_usd: 2 },
    { customer: "C", part_id: "P3", actual_revenue_usd: 3, revenue_source: "stub" },
  ];
  const { report } = overlayRevenue(recs, index);
  assert.equal(report.source_hits["docustrata-real"], 1);
  assert.equal(report.source_hits["docustrata-synth"], 1); // B had no prior source → default
  assert.equal(report.source_hits["stub"], 1);
});
