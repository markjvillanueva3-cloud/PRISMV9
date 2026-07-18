// quoting-cost-source-consumers.test.mjs -- U-CLT-TRAINING-SOURCES
// node:test / node:assert (matches the convention already used by
// scripts/lib/material-cost-basis-normalize.test.mjs). Real field shapes lifted from the
// actual state/shared/quoting/*.json files (never fabricated -- R9/R8).

import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_MAX_AGE_DAYS,
  checkFreshness,
  invoiceJoinKey,
  dedupeInvoicesAgainstActuals,
  matchDocustrataInvoices,
  vendorCostAdvisory,
  toolPurchaseAdvisory,
  detectSyntheticProvenance,
} from "./quoting-cost-source-consumers.mjs";

// ---------------------------------------------------------------------------
// detectSyntheticProvenance (3-of-3 finding 2026-07-02: never pass synthetic as real)
// ---------------------------------------------------------------------------

test("detectSyntheticProvenance: the REAL curated fixture's own note declares PLACEHOLDER -> synthetic", () => {
  // Verbatim excerpt from the live docustrata-invoices.curated.json note (2026-07-02).
  const doc = {
    note: "PROVENANCE HONESTY (charlie soul refuse: never pass synthetic as real): the revenue numbers (actual_invoice_usd) remain hand-curated PLACEHOLDER values in realistic JM-Die-shop ranges per machine-class; they are NOT extracted from real invoices.",
    invoices: [
      { customer: "ATF", part_id: "1069", material: "PLACEHOLDER", actual_invoice_usd: 268 },
      { customer: "AGRATI", part_id: "2210", material: "4140", actual_invoice_usd: 512 },
    ],
  };
  const p = detectSyntheticProvenance(doc);
  assert.equal(p.synthetic, true);
  assert.equal(p.marker, "note-declares-placeholder");
  assert.ok(p.note_excerpt.includes("PLACEHOLDER"), "excerpt carries the declaration for the snapshot");
});

test("detectSyntheticProvenance: no note but majority material:PLACEHOLDER rows -> synthetic", () => {
  const doc = {
    invoices: [
      { customer: "A", part_id: "1", material: "PLACEHOLDER", actual_invoice_usd: 100 },
      { customer: "B", part_id: "2", material: "PLACEHOLDER", actual_invoice_usd: 200 },
      { customer: "C", part_id: "3", material: "4140", actual_invoice_usd: 300 },
    ],
  };
  const p = detectSyntheticProvenance(doc);
  assert.equal(p.synthetic, true);
  assert.equal(p.marker, "material-placeholder-majority");
  assert.equal(p.placeholder_rows, 2);
  assert.equal(p.total_rows, 3);
});

test("detectSyntheticProvenance: clean real-extraction source -> NOT synthetic", () => {
  const doc = {
    note: "Extracted from JMD Orders-Closed invoice PDFs via docustrata-run-all-documents; per-line OCR confidence >= 0.8.",
    invoices: [
      { customer: "ATF", part_id: "1069", material: "4140", actual_invoice_usd: 268 },
      { customer: "FONTANA", part_id: "88-C", material: "A2", actual_invoice_usd: 1450 },
    ],
  };
  const p = detectSyntheticProvenance(doc);
  assert.equal(p.synthetic, false);
  assert.equal(p.marker, null);
  assert.equal(p.note_excerpt, null);
});

test("detectSyntheticProvenance: null/empty doc -> not synthetic, never throws (empty is handled by no-invoices-on-disk downstream)", () => {
  assert.equal(detectSyntheticProvenance(null).synthetic, false);
  assert.equal(detectSyntheticProvenance({}).synthetic, false);
  assert.equal(detectSyntheticProvenance({ invoices: [] }).synthetic, false);
});

// ---------------------------------------------------------------------------
// dedupe: both-empty join_key is NON-JOINABLE (null-matches-everything trap)
// ---------------------------------------------------------------------------

test("dedupeInvoicesAgainstActuals: keyless invoice ('|') is NEVER excluded as a duplicate of keyless actuals", () => {
  // The live actuals corpus carries 1,208 keyless '|' join_key rows; a keyless invoice must
  // NOT silently vanish as a "duplicate" of those unrelated orders. It stays unique.
  const actualsKeys = new Set(["|", "ATF|1069"]);
  const invoices = [
    { actual_invoice_usd: 500 }, // no customer, no part_id -> join_key "|"
    { customer: "ATF", part_id: "1069", actual_invoice_usd: 268 }, // legit duplicate
  ];
  const { unique, duplicates, total } = dedupeInvoicesAgainstActuals(invoices, actualsKeys);
  assert.equal(total, 2);
  assert.equal(unique.length, 1, "keyless invoice survives; only the real key-match is excluded");
  assert.equal(unique[0].actual_invoice_usd, 500);
  assert.deepEqual(duplicates, ["ATF|1069"]);
});

// ---------------------------------------------------------------------------
// checkFreshness
// ---------------------------------------------------------------------------

test("checkFreshness: fresh file within max age", () => {
  const now = Date.parse("2026-07-02T00:00:00.000Z");
  const mtime = Date.parse("2026-06-25T00:00:00.000Z"); // 7 days old
  const r = checkFreshness(mtime, now, 45);
  assert.equal(r.present, true);
  assert.equal(r.fresh, true);
  assert.equal(r.reason, null);
  assert.ok(Math.abs(r.age_days - 7) < 0.01);
});

test("checkFreshness: stale file beyond max age -> refused, not silently folded (R12)", () => {
  const now = Date.parse("2026-07-02T00:00:00.000Z");
  const mtime = Date.parse("2026-05-01T00:00:00.000Z"); // ~62 days old
  const r = checkFreshness(mtime, now, 45);
  assert.equal(r.present, true);
  assert.equal(r.fresh, false);
  assert.equal(r.reason, "source-stale");
  assert.ok(r.age_days > 45);
});

test("checkFreshness: missing source (null mtime) -> present:false, never throws", () => {
  const r = checkFreshness(null, Date.now());
  assert.equal(r.present, false);
  assert.equal(r.fresh, false);
  assert.equal(r.reason, "source-missing");
});

test("checkFreshness: real fixture mtimes vs a fixed 'now' -- exercises the actual repo file ages honestly", () => {
  // U-CLT: at authoring time (2026-07-02) jm-vendor-cost-index.json (2026-05-29) is
  // ~34 days old -- fresh under the 45-day default, but this test pins the boundary
  // behavior so a future default-age change is caught, not silently drifted.
  const now = Date.parse("2026-07-02T16:50:10.997Z");
  const vendorIndexMtime = Date.parse("2026-05-29T18:15:53.328Z");
  const r = checkFreshness(vendorIndexMtime, now, DEFAULT_MAX_AGE_DAYS);
  assert.equal(r.present, true);
  assert.equal(r.fresh, true);
});

test("checkFreshness: future mtime (clock skew) is refused, never trusted", () => {
  const now = Date.parse("2026-07-02T00:00:00.000Z");
  const mtime = Date.parse("2026-07-10T00:00:00.000Z"); // in the future
  const r = checkFreshness(mtime, now, 45);
  assert.equal(r.fresh, false);
  assert.equal(r.reason, "future-mtime");
});

// ---------------------------------------------------------------------------
// invoiceJoinKey / dedupeInvoicesAgainstActuals
// ---------------------------------------------------------------------------

test("invoiceJoinKey: matches the orders-closed-actuals join_key convention exactly", () => {
  // Real actuals[0].join_key = "ELITE|340-HWHPLG" for {customer:"ELITE", part_id:"340-HWHPLG"}
  assert.equal(invoiceJoinKey("ELITE", "340-HWHPLG"), "ELITE|340-HWHPLG");
});

test("invoiceJoinKey: numeric part_id (real curated-invoice shape) coerces to string, no throw", () => {
  // Real docustrata-invoices.curated.json has part_id as a STRING ("1069"), but guard the
  // numeric case defensively since JSON numeric-looking ids are a real-world hazard.
  assert.equal(invoiceJoinKey("ATF", 1069), "ATF|1069");
});

test("dedupeInvoicesAgainstActuals: happy path -- no overlap (real 2026-07-02 fixture state)", () => {
  // Real docustrata-invoices.curated.json invoices vs a snapshot of real
  // orders-closed-actuals.jsonl join_keys -- verified 2026-07-02 there is ZERO overlap today.
  const invoices = [
    { date: "2026-04-15", customer: "ATF", part_id: "1069", material: "PLACEHOLDER", predicted_quote_usd: 245.0, actual_invoice_usd: 268.0, quantity: 25 },
    { date: "2026-03-30", customer: "AGRATI", part_id: "0021", material: "tool_steel_a2", predicted_quote_usd: 175.0, actual_invoice_usd: 182.0, quantity: 50 },
  ];
  const actualsJoinKeys = new Set(["ELITE|340-HWHPLG", "MID WEST FABRICATING ROCKMILL|RM124-00."]);
  const r = dedupeInvoicesAgainstActuals(invoices, actualsJoinKeys);
  assert.equal(r.total, 2);
  assert.equal(r.unique.length, 2);
  assert.equal(r.duplicates.length, 0);
});

test("dedupeInvoicesAgainstActuals: FAILURE MODE -- overlapping join_key is excluded, named, not silently dropped", () => {
  const invoices = [
    { customer: "ELITE", part_id: "340-HWHPLG", actual_invoice_usd: 999.0 }, // same key as a real actuals row
    { customer: "ATF", part_id: "1069", actual_invoice_usd: 268.0 },
  ];
  const actualsJoinKeys = new Set(["ELITE|340-HWHPLG"]);
  const r = dedupeInvoicesAgainstActuals(invoices, actualsJoinKeys);
  assert.equal(r.total, 2);
  assert.equal(r.unique.length, 1);
  assert.equal(r.unique[0].customer, "ATF");
  assert.deepEqual(r.duplicates, ["ELITE|340-HWHPLG"]);
});

test("dedupeInvoicesAgainstActuals: FAILURE MODE -- empty/missing invoices array degrades gracefully", () => {
  const r = dedupeInvoicesAgainstActuals(undefined, new Set());
  assert.equal(r.total, 0);
  assert.deepEqual(r.unique, []);
  assert.deepEqual(r.duplicates, []);
});

test("dedupeInvoicesAgainstActuals: ADVERSARIAL -- non-object entries in the array are skipped, not thrown", () => {
  const invoices = [null, undefined, "not-an-object", { customer: "ATF", part_id: "1069", actual_invoice_usd: 268.0 }];
  const r = dedupeInvoicesAgainstActuals(invoices, new Set());
  assert.equal(r.total, 4);
  assert.equal(r.unique.length, 1);
});

// ---------------------------------------------------------------------------
// matchDocustrataInvoices
// ---------------------------------------------------------------------------

/** Minimal stand-in for matchPredictedToActuals (the real fn is unit-tested in
 * quoting-actuals-match.mjs; here we only prove the ARM wires deduped prices INTO it
 * correctly, mirroring an R9 "mock what you don't own, assert what you do" split). */
function fakeMatchFn(predicted, actual) {
  return {
    ok: true,
    advisory: true,
    predicted_median: predicted.length,
    actual_median: actual.length,
    verdict: "test-stub",
  };
}

test("matchDocustrataInvoices: happy path -- dedupes then matches predicted vs unique invoice prices", () => {
  const invoices = [
    { customer: "ATF", part_id: "1069", actual_invoice_usd: 268.0 },
    { customer: "AGRATI", part_id: "0021", actual_invoice_usd: 182.0 },
  ];
  const actualsJoinKeys = new Set(); // no overlap
  const r = matchDocustrataInvoices([100, 200, 300], invoices, actualsJoinKeys, fakeMatchFn);
  assert.equal(r.ok, true);
  assert.equal(r.advisory, true);
  assert.equal(r.deduped, 2);
  assert.equal(r.duplicates_excluded, 0);
  assert.equal(r.total_invoices, 2);
  assert.equal(r.actual_median, 2); // fakeMatchFn echoes actual.length -- proves 2 prices reached it
});

test("matchDocustrataInvoices: FAILURE MODE -- no invoices on disk (empty array)", () => {
  const r = matchDocustrataInvoices([100], [], new Set(), fakeMatchFn);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "no-invoices-on-disk");
  assert.equal(r.total_invoices, 0);
});

test("matchDocustrataInvoices: FAILURE MODE -- every invoice is a duplicate of docustrata_actuals", () => {
  const invoices = [{ customer: "ELITE", part_id: "340-HWHPLG", actual_invoice_usd: 337.5 }];
  const actualsJoinKeys = new Set(["ELITE|340-HWHPLG"]);
  const r = matchDocustrataInvoices([100], invoices, actualsJoinKeys, fakeMatchFn);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "all-invoices-already-in-actuals");
  assert.equal(r.duplicates_excluded, 1);
});

test("matchDocustrataInvoices: FAILURE MODE -- no match function injected (R8: never re-implement quoting-actuals-match's math)", () => {
  const r = matchDocustrataInvoices([100], [{ customer: "A", part_id: "1", actual_invoice_usd: 10 }], new Set(), null);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "no-match-fn");
});

test("matchDocustrataInvoices: ADVERSARIAL -- unique invoices exist but all have non-priceable actual_invoice_usd (0/negative/NaN)", () => {
  const invoices = [
    { customer: "A", part_id: "1", actual_invoice_usd: 0 },
    { customer: "B", part_id: "2", actual_invoice_usd: -5 },
    { customer: "C", part_id: "3", actual_invoice_usd: "not-a-number" },
  ];
  const r = matchDocustrataInvoices([100], invoices, new Set(), fakeMatchFn);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "no-priceable-unique-invoices");
  assert.equal(r.deduped, 3);
});

// ---------------------------------------------------------------------------
// vendorCostAdvisory
// ---------------------------------------------------------------------------

test("vendorCostAdvisory: happy path -- >=3 high-confidence grades -> reliable:true, both medians reported", () => {
  const grades = {
    H13: { usd_per_in3: 1.58, confidence: "high", block_n: 5 },
    "4140": { usd_per_in3: 1.62, confidence: "high", block_n: 6 },
    D2: { usd_per_in3: 1.4, confidence: "high", block_n: 4 },
  };
  // real jm-vendor-cost-index.json categories.material.unitCost shape
  const materialPrior = { count: 5652, spend: 2711841.54, vendorCount: 32, unitCost: { min: 0, median: 3.39, max: 999, n: 5600 } };
  const r = vendorCostAdvisory(grades, materialPrior);
  assert.equal(r.ok, true);
  assert.equal(r.reliable, true);
  assert.equal(r.normalized_grade_count, 3);
  assert.equal(r.normalized_high_confidence_count, 3);
  assert.equal(r.normalized_median_usd_per_in3, 1.58);
  assert.equal(r.blended_index_median, 3.39);
  assert.match(r.units_caveat, /NOT the same grain/);
});

test("vendorCostAdvisory: FAILURE MODE (units-ambiguous, R12) -- <3 high-confidence grades -> reliable:false, NEVER folds into calibration silently", () => {
  const grades = {
    H13: { usd_per_in3: 1.58, confidence: "high", block_n: 5 },
    "4340": { usd_per_in3: null, confidence: "none", block_n: 0 }, // real jm-material-cost-basis.json 4340 shape
  };
  const materialPrior = { unitCost: { median: 3.39, n: 5600 } };
  const r = vendorCostAdvisory(grades, materialPrior);
  assert.equal(r.ok, true);
  assert.equal(r.reliable, false);
  assert.match(r.reliability_reason, /only 1 high-confidence grade/);
});

test("vendorCostAdvisory: FAILURE MODE -- no consumable grades in basis at all", () => {
  const grades = { "4340": { usd_per_in3: null, confidence: "none", block_n: 0 } };
  const r = vendorCostAdvisory(grades, { unitCost: { median: 3.39 } });
  assert.equal(r.ok, false);
  assert.equal(r.reason, "no-consumable-grades-in-basis");
  assert.equal(r.reliable, false);
});

test("vendorCostAdvisory: FAILURE MODE -- missing/zero blended prior (jm-vendor-cost-index.json absent or malformed)", () => {
  const grades = { H13: { usd_per_in3: 1.58, confidence: "high", block_n: 5 } };
  const r1 = vendorCostAdvisory(grades, null);
  assert.equal(r1.ok, false);
  assert.equal(r1.reason, "no-blended-material-prior");
  const r2 = vendorCostAdvisory(grades, { unitCost: { median: 0 } });
  assert.equal(r2.ok, false);
});

test("vendorCostAdvisory: ADVERSARIAL -- zero-record materialBasisGrades object (empty {})", () => {
  const r = vendorCostAdvisory({}, { unitCost: { median: 3.39 } });
  assert.equal(r.ok, false);
  assert.equal(r.reason, "no-consumable-grades-in-basis");
});

// ---------------------------------------------------------------------------
// toolPurchaseAdvisory
// ---------------------------------------------------------------------------

test("toolPurchaseAdvisory: happy path -- purchase spend/count with a reconciliation multiplier", () => {
  // real jm-tool-purchases.json byType shape (subset)
  const byType = {
    "carbide-blank": { count: 5372, spend: 4338880.38 },
    "end-mill": { count: 144, spend: 24990.34 },
  };
  const ledger = { byType: { "carbide-blank": { multiplier: 1.05 } } };
  const r = toolPurchaseAdvisory(byType, ledger);
  assert.equal(r.ok, true);
  assert.equal(r.type_count, 2);
  assert.equal(r.reconciled_with_consumption_ledger, 1);
  const carbide = r.per_type.find((t) => t.type === "carbide-blank");
  assert.ok(Math.abs(carbide.purchase_usd_per_line_item - 4338880.38 / 5372) < 0.001);
  assert.equal(carbide.consumption_multiplier, 1.05);
  assert.ok(Math.abs(carbide.delta_pct - 0.05) < 0.001);
  assert.equal(carbide.within_band, true);
  const endmill = r.per_type.find((t) => t.type === "end-mill");
  assert.equal(endmill.consumption_multiplier, null);
});

test("toolPurchaseAdvisory: FAILURE MODE -- no priced tool types (all count/spend 0 or missing)", () => {
  const byType = { misc: { count: 0, spend: 0 }, drill: { spend: 100 } }; // no count on drill
  const r = toolPurchaseAdvisory(byType, { byType: {} });
  assert.equal(r.ok, false);
  assert.equal(r.reason, "no-priced-tool-types");
});

test("toolPurchaseAdvisory: FAILURE MODE -- empty tool_purchases.json byType", () => {
  const r = toolPurchaseAdvisory({}, { byType: {} });
  assert.equal(r.ok, false);
});

test("toolPurchaseAdvisory: FAILURE MODE -- missing/malformed ledger degrades to no-multiplier, never throws", () => {
  const byType = { insert: { count: 212, spend: 53090.16 } };
  const r1 = toolPurchaseAdvisory(byType, null);
  assert.equal(r1.ok, true);
  assert.equal(r1.per_type[0].consumption_multiplier, null);
  const r2 = toolPurchaseAdvisory(byType, undefined);
  assert.equal(r2.ok, true);
});

test("toolPurchaseAdvisory: ADVERSARIAL -- large delta_pct flips within_band to false (drift detection actually fires)", () => {
  const byType = { reamer: { count: 331, spend: 94418.88 } };
  const ledger = { byType: { reamer: { multiplier: 1.2 } } }; // clamp ceiling per ConsumableCostBasisEngine, still a 20% delta > default 50%? no -- test the OTHER direction
  const r = toolPurchaseAdvisory(byType, ledger, { bandPct: 0.1 }); // tighten the band to 10% so a 20% multiplier trips it
  const reamer = r.per_type.find((t) => t.type === "reamer");
  assert.equal(reamer.within_band, false);
  assert.ok(Math.abs(reamer.delta_pct - 0.2) < 0.001);
});

test("toolPurchaseAdvisory: ADVERSARIAL -- non-finite multiplier in ledger is treated as absent, not NaN-propagated", () => {
  const byType = { tap: { count: 17, spend: 942.71 } };
  const ledger = { byType: { tap: { multiplier: "not-a-number" } } };
  const r = toolPurchaseAdvisory(byType, ledger);
  assert.equal(r.per_type[0].consumption_multiplier, null);
  assert.equal(r.per_type[0].within_band, undefined);
});
