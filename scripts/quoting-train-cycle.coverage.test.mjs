/**
 * quoting-train-cycle.coverage — iter11 unit test for dataSourceCoverage + QUOTING_DATA_SOURCES.
 *
 * Pins the training-data-coverage report the train-cycle emits (data_source_coverage in --json
 * + a human line). Hermetic via an injected existsImpl — no real filesystem dependency.
 *
 * Run: node --test scripts/quoting-train-cycle.coverage.test.mjs
 *
 * @milestone QUOTING-SYNERGY-MS0/U-QP-TRAIN-DATA-COVERAGE (charlie /goal-yolo iter11)
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { dataSourceCoverage, QUOTING_DATA_SOURCES } from "./quoting-train-cycle.mjs";

const DIR = "/fake/state/shared/quoting";
// existsImpl that treats every listed basename as present on disk.
const presentExcept = (absent = []) => (p) => {
  const base = String(p).replace(/\\/g, "/").split("/").pop();
  return !absent.includes(base);
};

// ---------- manifest shape ----------
test("QUOTING_DATA_SOURCES: stable 5-source manifest with the expected roles", () => {
  assert.equal(QUOTING_DATA_SOURCES.length, 5);
  const byKey = Object.fromEntries(QUOTING_DATA_SOURCES.map((s) => [s.key, s]));
  assert.equal(byKey.baseline.consumed, true, "baseline is always consumed");
  assert.equal(byKey.outbound_sold_orders.consumed, "outbound", "outbound is consumed only when the match ran");
  assert.equal(byKey.vendor_cost_index.consumed, false, "cost-index not yet consumed");
  assert.equal(byKey.tool_purchases.consumed, false);
  assert.equal(byKey.docustrata_invoices.consumed, false);
  assert.equal(byKey.outbound_sold_orders.file, "jm-sold-orders.json");
  assert.equal(byKey.vendor_cost_index.file, "jm-vendor-cost-index.json");
});

// ---------- all present, outbound consumed ----------
test("dataSourceCoverage: all present + outbound consumed → 2 of 5 consumed (40%)", () => {
  const cov = dataSourceCoverage(DIR, { existsImpl: presentExcept([]), outboundConsumed: true });
  assert.equal(cov.available_count, 5);
  assert.equal(cov.consumed_count, 2); // baseline + outbound
  assert.equal(cov.coverage_pct, 40);
  assert.deepEqual(cov.unconsumed_available, ["vendor_cost_index", "tool_purchases", "docustrata_invoices"]);
});

// ---------- all present, outbound NOT consumed ----------
test("dataSourceCoverage: outbound NOT consumed → only baseline counts (1 of 5, 20%); outbound listed unconsumed", () => {
  const cov = dataSourceCoverage(DIR, { existsImpl: presentExcept([]), outboundConsumed: false });
  assert.equal(cov.consumed_count, 1);
  assert.equal(cov.coverage_pct, 20);
  assert.ok(cov.unconsumed_available.includes("outbound_sold_orders"), "un-run outbound is unconsumed");
});

// ---------- some absent: consumed only counts PRESENT sources ----------
test("dataSourceCoverage: absent sources are excluded from available + never inflate consumed", () => {
  // only baseline + outbound present; outbound consumed
  const cov = dataSourceCoverage(DIR, {
    existsImpl: presentExcept(["jm-vendor-cost-index.json", "jm-tool-purchases.json", "docustrata-invoices.curated.json"]),
    outboundConsumed: true,
  });
  assert.equal(cov.available_count, 2);
  assert.equal(cov.consumed_count, 2); // both present sources consumed
  assert.equal(cov.coverage_pct, 100);
  assert.deepEqual(cov.unconsumed_available, []);
});

// ---------- baseline absent but outbound present+consumed: consumed counts only present ----------
test("dataSourceCoverage: a consumed-by-default source that is ABSENT does not count toward consumed", () => {
  const cov = dataSourceCoverage(DIR, {
    existsImpl: presentExcept(["baseline-records.json"]),
    outboundConsumed: true,
  });
  // baseline absent (consumed:true but not present → excluded); outbound present+consumed
  assert.equal(cov.available_count, 4);
  assert.equal(cov.consumed_count, 1); // outbound only (baseline gone)
  assert.ok(!cov.sources.find((s) => s.key === "baseline").present);
  assert.equal(cov.sources.find((s) => s.key === "baseline").consumed, true); // flag still true; just not present
});

// ---------- none present: no div-by-zero ----------
test("dataSourceCoverage: zero present sources → coverage_pct 0, no NaN", () => {
  const cov = dataSourceCoverage(DIR, { existsImpl: () => false, outboundConsumed: true });
  assert.equal(cov.available_count, 0);
  assert.equal(cov.consumed_count, 0);
  assert.equal(cov.coverage_pct, 0);
  assert.deepEqual(cov.unconsumed_available, []);
});

// ---------- per-source present/consumed flags are concrete ----------
test("dataSourceCoverage: per-source flags reflect existence + consumption exactly", () => {
  const cov = dataSourceCoverage(DIR, { existsImpl: presentExcept([]), outboundConsumed: true });
  const cost = cov.sources.find((s) => s.key === "vendor_cost_index");
  assert.equal(cost.present, true);
  assert.equal(cost.consumed, false, "cost-index present but NOT consumed by the cycle");
  const outbound = cov.sources.find((s) => s.key === "outbound_sold_orders");
  assert.equal(outbound.consumed, true, "outbound consumed when the match ran");
});
