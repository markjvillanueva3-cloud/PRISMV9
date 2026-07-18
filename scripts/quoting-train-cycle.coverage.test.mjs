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
test("QUOTING_DATA_SOURCES: stable 6-source manifest with the expected roles", () => {
  assert.equal(QUOTING_DATA_SOURCES.length, 6);
  const byKey = Object.fromEntries(QUOTING_DATA_SOURCES.map((s) => [s.key, s]));
  assert.equal(byKey.baseline.consumed, true, "baseline is always consumed");
  assert.equal(byKey.outbound_sold_orders.consumed, "outbound", "outbound is consumed only when the match ran");
  // U-CLT-TRAINING-SOURCES (2026-07-02): the 3 formerly-unconsumed sources now carry
  // conditional-consumed sentinels -- consumed only when their advisory arm ran this cycle.
  assert.equal(byKey.vendor_cost_index.consumed, "vendor_cost_index", "cost-index consumed only when its advisory arm ran");
  assert.equal(byKey.tool_purchases.consumed, "tool_purchases", "tool-purchases consumed only when its advisory arm ran");
  assert.equal(byKey.docustrata_invoices.consumed, "docustrata_invoices", "invoices consumed only when its (provenance-gated) arm ran");
  // U-QP-TRAINCYCLE-FEED: the $355M / 6,718 Orders-Closed actuals are consumed via an ADVISORY
  // distribution-match -- consumed only when the docustrata-actuals match ran this cycle.
  assert.equal(byKey.docustrata_actuals.consumed, "docustrata_actuals", "docustrata-actuals consumed only when the match ran");
  assert.equal(byKey.docustrata_actuals.file, "orders-closed-actuals.jsonl");
  assert.equal(byKey.outbound_sold_orders.file, "jm-sold-orders.json");
  assert.equal(byKey.vendor_cost_index.file, "jm-vendor-cost-index.json");
});

// ---------- all present, outbound consumed ----------
test("dataSourceCoverage: all present + outbound consumed (docustrata-actuals NOT) -> 2 of 6 consumed (33%)", () => {
  const cov = dataSourceCoverage(DIR, { existsImpl: presentExcept([]), outboundConsumed: true });
  assert.equal(cov.available_count, 6);
  assert.equal(cov.consumed_count, 2); // baseline + outbound (docustrata-actuals match did not run)
  assert.equal(cov.coverage_pct, 33); // round(2/6*100)
  assert.deepEqual(cov.unconsumed_available, ["vendor_cost_index", "tool_purchases", "docustrata_invoices", "docustrata_actuals"]);
});

// ---------- all present, both outbound AND docustrata-actuals consumed (U-QP-TRAINCYCLE-FEED) ----------
test("dataSourceCoverage: all present + outbound + docustrata-actuals consumed -> 3 of 6 (50%)", () => {
  const cov = dataSourceCoverage(DIR, {
    existsImpl: presentExcept([]),
    outboundConsumed: true,
    docustrataActualsConsumed: true,
  });
  assert.equal(cov.available_count, 6);
  assert.equal(cov.consumed_count, 3); // baseline + outbound + docustrata_actuals
  assert.equal(cov.coverage_pct, 50); // round(3/6*100)
  assert.deepEqual(cov.unconsumed_available, ["vendor_cost_index", "tool_purchases", "docustrata_invoices"]);
});

// ---------- all present, outbound NOT consumed ----------
test("dataSourceCoverage: nothing consumed -> only baseline counts (1 of 6, 17%); outbound + docustrata-actuals unconsumed", () => {
  const cov = dataSourceCoverage(DIR, { existsImpl: presentExcept([]), outboundConsumed: false });
  assert.equal(cov.consumed_count, 1);
  assert.equal(cov.coverage_pct, 17); // round(1/6*100)
  assert.ok(cov.unconsumed_available.includes("outbound_sold_orders"), "un-run outbound is unconsumed");
  assert.ok(cov.unconsumed_available.includes("docustrata_actuals"), "un-run docustrata-actuals is unconsumed");
});

// ---------- U-CLT-TRAINING-SOURCES: all 6 arms ran -> full coverage ----------
test("dataSourceCoverage: every conditional arm ran -> 6 of 6 (100%), nothing unconsumed", () => {
  const cov = dataSourceCoverage(DIR, {
    existsImpl: presentExcept([]),
    outboundConsumed: true,
    docustrataActualsConsumed: true,
    vendorCostIndexConsumed: true,
    toolPurchasesConsumed: true,
    docustrataInvoicesConsumed: true,
  });
  assert.equal(cov.available_count, 6);
  assert.equal(cov.consumed_count, 6);
  assert.equal(cov.coverage_pct, 100);
  assert.deepEqual(cov.unconsumed_available, []);
});

// ---------- U-CLT-TRAINING-SOURCES: a refused arm (stale/synthetic) stays unconsumed ----------
test("dataSourceCoverage: invoices arm refused (provenance/stale) -> 5 of 6 (83%), invoices named unconsumed", () => {
  const cov = dataSourceCoverage(DIR, {
    existsImpl: presentExcept([]),
    outboundConsumed: true,
    docustrataActualsConsumed: true,
    vendorCostIndexConsumed: true,
    toolPurchasesConsumed: true,
    docustrataInvoicesConsumed: false, // arm ran but REFUSED (source-synthetic-placeholder)
  });
  assert.equal(cov.consumed_count, 5);
  assert.equal(cov.coverage_pct, 83); // round(5/6*100)
  assert.deepEqual(cov.unconsumed_available, ["docustrata_invoices"]);
});

// ---------- some absent: consumed only counts PRESENT sources ----------
test("dataSourceCoverage: absent sources are excluded from available + never inflate consumed", () => {
  // only baseline + outbound present; outbound consumed
  const cov = dataSourceCoverage(DIR, {
    existsImpl: presentExcept(["jm-vendor-cost-index.json", "jm-tool-purchases.json", "docustrata-invoices.curated.json", "orders-closed-actuals.jsonl"]),
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
  assert.equal(cov.available_count, 5); // outbound + cost-index + tool + docustrata-invoices + docustrata-actuals
  assert.equal(cov.consumed_count, 1); // outbound only (baseline gone; docustrata-actuals match did not run)
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
