// scripts/lib/ocr-training-loop-lib.test.mjs
// Tests for U-XRAY-OCR-TRAINING-LOOP pure core. Reference values + algebraic invariants — no
// toBeDefined() stubs. The calibration decides which pseudo-labels are TRUSTED enough to train a
// model on, so each test encodes WHY a trust verdict matters (a wrong calibration = silently
// training on garbage labels — the exact "garbage in, garbage out" failure this lib exists to gate).
//
// Calibration is on AGREEMENT FRACTION f = corroboration / n_models (ensemble-size-invariant), so a
// calibration stays valid when fleet contention changes how many models survive per print. A
// single-model run (n_models<2) can never mint trainable labels (the P1 the live run surfaced).

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  calibrateAgreement,
  expectedAccuracyForFraction,
  assignLabelTier,
  buildFcfText,
  buildTrainsetRow,
  classifyActiveLearning,
  aggregateTrainingLoop,
  DEFAULT_TIER_THRESHOLDS,
  MIN_ENSEMBLE_FOR_CORROBORATION,
  printCursorKey,
  parseCursorDoneSet,
  formatCursorLine,
  partitionByResumeCursor,
  isCorpusDrained,
  RETRYABLE_FAILURE_STATUSES,
} from "./ocr-training-loop-lib.mjs";

// ── calibrateAgreement ────────────────────────────────────────────────────────

test("calibrate: monotone data → raw precision per fraction preserved", () => {
  // f=0.5 dims: 5/10 correct (0.5). f=1.0 dims: 9/10 correct (0.9). Already non-decreasing.
  const samples = [
    ...Array.from({ length: 10 }, (_, i) => ({ f: 0.5, correct: i < 5 })),
    ...Array.from({ length: 10 }, (_, i) => ({ f: 1.0, correct: i < 9 })),
  ];
  const c = calibrateAgreement(samples);
  assert.equal(c.calibrated, true);
  assert.equal(c.totalN, 20);
  assert.equal(c.minF, 0.5);
  assert.equal(c.maxF, 1);
  const half = c.byF.find((b) => b.f === 0.5), full = c.byF.find((b) => b.f === 1);
  assert.equal(half.raw, 0.5);
  assert.equal(full.raw, 0.9);
  assert.equal(half.isotonic, 0.5);   // monotone already → isotonic == raw
  assert.equal(full.isotonic, 0.9);
});

test("calibrate: PAV repairs a NON-monotone violation (low-agreement scored higher = noise)", () => {
  // f=0.5: 9/10 (0.9). f=1.0: 5/10 (0.5). Violates 'more agreement ⇒ not less accurate'.
  // Weighted PAV pools the adjacent violators → both = 14/20 = 0.7.
  const samples = [
    ...Array.from({ length: 10 }, (_, i) => ({ f: 0.5, correct: i < 9 })),
    ...Array.from({ length: 10 }, (_, i) => ({ f: 1.0, correct: i < 5 })),
  ];
  const c = calibrateAgreement(samples);
  const half = c.byF.find((b) => b.f === 0.5), full = c.byF.find((b) => b.f === 1);
  assert.equal(half.raw, 0.9);          // raw preserved for transparency
  assert.equal(full.raw, 0.5);
  assert.equal(half.isotonic, 0.7);     // pooled
  assert.equal(full.isotonic, 0.7);
  assert.ok(half.isotonic <= full.isotonic); // monotone non-decreasing invariant holds
});

test("calibrate: reliable flag tracks the MIN_RELIABLE_SAMPLES floor", () => {
  const thin = calibrateAgreement(Array.from({ length: 10 }, () => ({ f: 1.0, correct: true })));
  assert.equal(thin.calibrated, true);
  assert.equal(thin.reliable, false);  // 10 < 50
  const thick = calibrateAgreement(Array.from({ length: 60 }, (_, i) => ({ f: 1.0, correct: i < 55 })));
  assert.equal(thick.reliable, true);  // 60 ≥ 50
});

test("calibrate: empty/garbage → uncalibrated, never throws", () => {
  assert.equal(calibrateAgreement([]).calibrated, false);
  assert.equal(calibrateAgreement(null).calibrated, false);
  assert.equal(calibrateAgreement([{ f: 0, correct: true }, { f: 1.5, correct: true }, { foo: 1 }]).calibrated, false); // f out of (0,1] filtered
});

// ── expectedAccuracyForFraction ───────────────────────────────────────────────

test("expectedAccuracyForFraction: exact / clamp-high / clamp-low / nearest-lower / uncalibrated", () => {
  const c = calibrateAgreement([
    ...Array.from({ length: 4 }, () => ({ f: 0.5, correct: true })),  // f=0.5 → 1.0
    { f: 0.5, correct: false },                                       // f=0.5 → 4/5 = 0.8
    ...Array.from({ length: 5 }, () => ({ f: 1.0, correct: true })),  // f=1.0 → 1.0
  ]);
  assert.equal(expectedAccuracyForFraction(0.5, c), 0.8);
  assert.equal(expectedAccuracyForFraction(1.0, c), 1);
  assert.equal(expectedAccuracyForFraction(1.0, c), 1);  // at max
  assert.equal(expectedAccuracyForFraction(0.4, c), 0.8); // clamp low (<minF=0.5)
  assert.equal(expectedAccuracyForFraction(0.75, c), 0.8); // nearest-lower (between 0.5 and 1.0)
  assert.equal(expectedAccuracyForFraction(0.5, { byF: [] }), null); // uncalibrated → null, no fabrication
  assert.equal(expectedAccuracyForFraction(0.5, null), null);
});

// ── assignLabelTier ───────────────────────────────────────────────────────────

test("assignLabelTier: thresholds map accuracy → tier", () => {
  const cal = { byF: [{ f: 0.33, isotonic: 0.30 }, { f: 0.67, isotonic: 0.70 }, { f: 1.0, isotonic: 0.90 }] };
  assert.equal(assignLabelTier(1.0, cal).tier, "gold");    // 0.90 ≥ 0.85
  assert.equal(assignLabelTier(0.67, cal).tier, "silver"); // 0.70 ≥ 0.65
  assert.equal(assignLabelTier(0.33, cal).tier, "reject"); // 0.30 < 0.45
  const cal2 = { byF: [{ f: 0.5, isotonic: 0.50 }] };
  assert.equal(assignLabelTier(0.5, cal2).tier, "bronze"); // 0.50 in [0.45,0.65)
  assert.equal(assignLabelTier(0.5, { byF: [] }).tier, "uncalibrated");
});

test("assignLabelTier: custom thresholds honored", () => {
  const cal = { byF: [{ f: 1.0, isotonic: 0.70 }] };
  assert.equal(assignLabelTier(1.0, cal, { thresholds: { gold: 0.6 } }).tier, "gold"); // lowered gold floor
});

// ── buildTrainsetRow ──────────────────────────────────────────────────────────

const CAL = { byF: [{ f: 0.5, isotonic: 0.70 }, { f: 1.0, isotonic: 0.92 }] };

test("buildTrainsetRow: tiers each dim by agreement fraction; only gold/silver are trainable", () => {
  const fused = {
    summary: { n_models: 2 },
    dimensions: [
      { type: "diameter", value_mm: 10, corroboration: 2, n_models: 2, agreement_confidence: 0.97, value_spread_mm: 0.02 }, // f=1.0 → 0.92 gold
      { type: "linear", value_mm: 25, corroboration: 1, n_models: 2, agreement_confidence: 0.8, value_spread_mm: 0 },        // f=0.5 → 0.70 silver
    ],
  };
  const row = buildTrainsetRow({ part: "PN-1", image: "p.png" }, fused, CAL);
  assert.equal(row.corroboration_possible, true);
  assert.equal(row.labels[0].tier, "gold");
  assert.equal(row.labels[0].agreement_fraction, 1);
  assert.equal(row.labels[1].tier, "silver");
  assert.equal(row.labels[1].agreement_fraction, 0.5);
  assert.equal(row.trainable_label_count, 2);
  assert.equal(row.labels[0].trainable, true);
});

test("buildTrainsetRow: P1 REGRESSION — a single-model run mints ZERO trainable labels", () => {
  // The live bug: calibration from a multi-model ensemble applied to a print where only 1 model
  // survived. Its dims have corroboration 1, n_models 1 → f=1.0 (self-agreement, NOT corroboration).
  // No dim may be trainable: a 1-model run has no agreement signal at all.
  const fused = {
    summary: { n_models: 1 },
    dimensions: [
      { type: "diameter", value_mm: 10, corroboration: 1, n_models: 1, agreement_confidence: 0.9, value_spread_mm: 0 },
      { type: "linear", value_mm: 25, corroboration: 1, n_models: 1, agreement_confidence: 0.9, value_spread_mm: 0 },
    ],
  };
  const row = buildTrainsetRow({ part: "PN-solo", image: "s.png" }, fused, CAL);
  assert.equal(row.corroboration_possible, false);
  assert.equal(row.trainable_label_count, 0);                 // ← the leak is closed
  assert.ok(row.labels.every((l) => l.trainable === false));
  // honest tier: a single-model dim is "no_corroboration", NOT an accuracy tier (no misleading gold)
  assert.ok(row.labels.every((l) => l.tier === "no_corroboration"));
  assert.ok(row.labels.every((l) => l.expected_accuracy === null));
});

test("buildTrainsetRow: records non-dimension coverage (gdt/notes/profiles/finish) the ensemble read", () => {
  // WHY: fuseEnsemble now unions gdt/notes/profiles/surface_finishes (previously dropped). The
  // trainset row must RECORD how much it captured so the closed-loop corpus is not dimension-only.
  const fused = {
    summary: { n_models: 2 },
    dimensions: [{ type: "diameter", value_mm: 10, corroboration: 2, n_models: 2, agreement_confidence: 0.97, value_spread_mm: 0 }],
    gdt: [{ symbol: "position" }, { symbol: "flatness" }],
    notes: [{ category: "finish", text: "black oxide" }],
    profiles: [{ name: "bore", type: "hole" }],
    surface_finishes: [{ ra_um: 0.8 }, { ra_um: 1.6 }, { ra_um: 3.2 }],
  };
  const row = buildTrainsetRow({ part: "PN-gdt", image: "g.png" }, fused, CAL);
  assert.equal(row.gdt_count, 2);
  assert.equal(row.note_count, 1);
  assert.equal(row.profile_count, 1);
  assert.equal(row.surface_finish_count, 3);
});

test("buildTrainsetRow: non-dim counts default to 0 when the fused object omits the fields (back-compat)", () => {
  // A legacy fused object (pre-union, dimensions only) must not throw and must report zero coverage.
  const fused = { summary: { n_models: 2 }, dimensions: [] };
  const row = buildTrainsetRow({ part: "PN-old", image: "o.png" }, fused, CAL);
  assert.equal(row.gdt_count, 0);
  assert.equal(row.note_count, 0);
  assert.equal(row.profile_count, 0);
  assert.equal(row.surface_finish_count, 0);
});

// ── buildFcfText + GD&T trainable labels (U-XRAY-GDT-LABEL-TIER) ───────────────

test("buildFcfText: full FCF renders symbol + tolerance+unit + material condition + datums", () => {
  const s = buildFcfText({ symbol: "position", tolerance_value: 0.1, tolerance_unit: "mm", material_condition: "MMC", datum_references: ["A", "B"] });
  assert.equal(s, "position 0.1mm MMC [A|B]");
});

test("buildFcfText: no datums + no unit renders just symbol + tolerance", () => {
  assert.equal(buildFcfText({ symbol: "flatness", tolerance_value: 0.05, datum_references: [] }), "flatness 0.05");
});

test("buildFcfText: nothing structured -> falls back to verbatim raw_text", () => {
  assert.equal(buildFcfText({ raw_text: "TP .010 A B C" }), "TP .010 A B C");
});

test("buildFcfText: malformed input -> empty string (no throw)", () => {
  assert.equal(buildFcfText(null), "");
  assert.equal(buildFcfText("garbage"), "");
  assert.equal(buildFcfText({}), "");
});

test("buildTrainsetRow: a 2-of-2 corroborated GD&T frame becomes a trainable gold label with fcf_text", () => {
  const fused = {
    summary: { n_models: 2 },
    dimensions: [],
    gdt: [{ symbol: "position", tolerance_value: 0.1, tolerance_unit: "mm", material_condition: "MMC", datum_references: ["A", "B"], corroboration: 2, n_models: 2, hallucination_candidate: false }],
  };
  const row = buildTrainsetRow({ part: "PN-gdt", image: "g.png" }, fused, CAL);
  assert.equal(row.gdt_labels.length, 1);
  const g = row.gdt_labels[0];
  assert.equal(g.agreement_fraction, 1);          // 2/2
  assert.equal(g.tier, "gold");                    // f=1.0 -> isotonic 0.92 -> gold
  assert.equal(g.trainable, true);
  assert.equal(g.fcf_text, "position 0.1mm MMC [A|B]");
  assert.equal(g.calibration_basis, "dimension-agreement");  // R12 honesty: NOT GD&T-specific
  assert.equal(row.trainable_gdt_label_count, 1);
});

test("buildTrainsetRow: single-model run mints ZERO trainable GD&T labels (same gate as dims)", () => {
  const fused = {
    summary: { n_models: 1 },
    dimensions: [],
    gdt: [{ symbol: "flatness", tolerance_value: 0.05, datum_references: [], corroboration: 1, n_models: 1, hallucination_candidate: false }],
  };
  const row = buildTrainsetRow({ part: "PN-solo", image: "s.png" }, fused, CAL);
  assert.equal(row.gdt_labels.length, 1);
  assert.equal(row.gdt_labels[0].tier, "no_corroboration");
  assert.equal(row.gdt_labels[0].trainable, false);
  assert.equal(row.gdt_labels[0].expected_accuracy, null);
  assert.equal(row.trainable_gdt_label_count, 0);
});

test("buildTrainsetRow: a singleton GD&T frame in a multi-model run is kept, flagged, not trainable", () => {
  // corroboration 1 of n_models 2 -> f=0.5 -> isotonic 0.70 -> silver IS trainable; but the frame
  // is a hallucination candidate (1 of >=2). It still tiers by agreement (recall-first kept); the
  // hallucination flag routes the print to active-learning review at the run level (classifyActiveLearning).
  const fused = {
    summary: { n_models: 2, n_hallucination_candidates: 1 },
    dimensions: [],
    gdt: [{ symbol: "position", tolerance_value: 0.2, datum_references: ["A"], corroboration: 1, n_models: 2, hallucination_candidate: true }],
  };
  const row = buildTrainsetRow({ part: "PN-1of2", image: "h.png" }, fused, CAL);
  assert.equal(row.gdt_labels[0].agreement_fraction, 0.5);
  assert.equal(row.gdt_labels[0].hallucination_candidate, true);
  assert.equal(row.gdt_labels[0].tier, "silver");  // f=0.5 -> 0.70 -> silver (recall-first; AL-queue gates it)
});

test("buildTrainsetRow: no gdt field -> empty gdt_labels, zero count (back-compat)", () => {
  const row = buildTrainsetRow({ part: "PN-old", image: "o.png" }, { summary: { n_models: 2 }, dimensions: [] }, CAL);
  assert.deepEqual(row.gdt_labels, []);
  assert.equal(row.trainable_gdt_label_count, 0);
});

// ── classifyActiveLearning ────────────────────────────────────────────────────

test("classifyActiveLearning: flags single-model / ambiguous / hallucination / no-trainable", () => {
  // single-model run → review (no corroboration), even if it produced labels
  const solo = classifyActiveLearning({ fused: { summary: { n_models: 1 } }, trainsetRow: { n_models: 1, trainable_label_count: 0 } });
  assert.equal(solo.needsReview, true);
  assert.match(solo.reasons[0], /single-model/);
  assert.equal(classifyActiveLearning({ fused: { summary: { n_models: 2, n_ambiguous_pairs: 1 } }, trainsetRow: { trainable_label_count: 2 } }).needsReview, true);
  assert.equal(classifyActiveLearning({ fused: { summary: { n_models: 2, n_hallucination_candidates: 2 } }, trainsetRow: { trainable_label_count: 2 } }).needsReview, true);
  // clean 2-model run with trainable labels → no review
  assert.equal(classifyActiveLearning({ fused: { summary: { n_models: 2, n_ambiguous_pairs: 0, n_hallucination_candidates: 0 } }, trainsetRow: { trainable_label_count: 3 } }).needsReview, false);
});

// ── aggregateTrainingLoop ─────────────────────────────────────────────────────

test("aggregateTrainingLoop: rolls up tier totals, trainable yield, AL queue", () => {
  const perPart = [
    { trainsetRow: { labels: [{ tier: "gold", trainable: true }, { tier: "reject", trainable: false }] }, activeLearning: { needsReview: true } },
    { trainsetRow: { labels: [{ tier: "silver", trainable: true }, { tier: "gold", trainable: true }] }, activeLearning: { needsReview: false } },
  ];
  const agg = aggregateTrainingLoop(perPart, { calibrated: true, reliable: false, totalN: 28, byF: [] });
  assert.equal(agg.parts, 2);
  assert.equal(agg.total_labels, 4);
  assert.equal(agg.trainable_labels, 3);          // 2 gold + 1 silver
  assert.equal(agg.trainable_yield, 0.75);        // 3/4
  assert.equal(agg.tier_totals.gold, 2);
  assert.equal(agg.tier_totals.reject, 1);
  assert.equal(agg.active_learning_queue, 1);
  assert.equal(agg.calibration.reliable, false);
});

test("aggregateTrainingLoop: rolls up non-dimension coverage across parts (missing counts -> 0)", () => {
  const perPart = [
    { trainsetRow: { labels: [], gdt_count: 2, note_count: 1, profile_count: 0, surface_finish_count: 3 }, activeLearning: { needsReview: false } },
    { trainsetRow: { labels: [], gdt_count: 1, note_count: 4 /* profile/finish absent -> treated as 0 */ }, activeLearning: { needsReview: false } },
  ];
  const agg = aggregateTrainingLoop(perPart, { calibrated: true, reliable: true, totalN: 40, byF: [] });
  assert.deepEqual(agg.non_dim_coverage, { gdt: 3, notes: 5, profiles: 0, surface_finishes: 3 });
});

test("aggregateTrainingLoop: rolls up trainable GD&T labels across parts (missing -> 0)", () => {
  const perPart = [
    { trainsetRow: { labels: [], trainable_gdt_label_count: 2 }, activeLearning: { needsReview: false } },
    { trainsetRow: { labels: [] /* no gdt count -> 0 */ }, activeLearning: { needsReview: false } },
    { trainsetRow: { labels: [], trainable_gdt_label_count: 1 }, activeLearning: { needsReview: false } },
  ];
  const agg = aggregateTrainingLoop(perPart, { calibrated: true, reliable: true, totalN: 40, byF: [] });
  assert.equal(agg.trainable_gdt_labels, 3);
});

test("constants are the documented values", () => {
  assert.deepEqual(DEFAULT_TIER_THRESHOLDS, { gold: 0.85, silver: 0.65, bronze: 0.45 });
  assert.equal(MIN_ENSEMBLE_FOR_CORROBORATION, 2);
});

// ── RESUME CURSOR (STEP 1 — reaper-survivable corpus runs) ──────────────────────
// WHY these matter: a corpus run reaped at print N/M must restart processing ONLY prints >N
// (re-OCR count = 0). A test that doesn't fail when the cursor silently re-runs done prints would
// hide the exact non-terminating-GPU-burn failure (RISK 1) the cursor exists to prevent.

test("printCursorKey: collapses cross-path duplicates to one identity (JM stores a print at many paths)", () => {
  // The SAME drawing reached via two different corpus paths must map to ONE key, else a restart
  // re-OCRs it just because the worklist listed a different path. Basename, lowercased.
  assert.equal(printCursorKey("JM DIE/AAAS/26815/part_A.pdf"), "part_a.pdf");
  assert.equal(printCursorKey("H:\\PRISM\\Docustrata\\x\\PART_A.PDF"), "part_a.pdf");
  assert.equal(printCursorKey("part_a.pdf"), printCursorKey("other/dir/PART_A.pdf"));
  // blank / null → null (caller never cursor-skips a keyless entry)
  assert.equal(printCursorKey(""), null);
  assert.equal(printCursorKey("   "), null);
  assert.equal(printCursorKey(null), null);
});

test("formatCursorLine ↔ parseCursorDoneSet: round-trips a done key; defaults status=labeled", () => {
  const line = formatCursorLine({ key: "DIR/Foo.png", status: "labeled", trainable: 5, n_models: 3, ts: "2026-06-08T00:00:00Z" });
  assert.ok(line.endsWith("\n"), "cursor line must be newline-terminated for O_APPEND");
  const rec = JSON.parse(line);
  assert.equal(rec.key, "foo.png");          // canonicalized
  assert.equal(rec.status, "labeled");
  assert.equal(rec.trainable, 5);
  assert.equal(rec.ts, "2026-06-08T00:00:00Z");
  const done = parseCursorDoneSet(line);
  assert.ok(done.has("foo.png"));
  // status defaults to "labeled"; non-finite trainable → 0
  const d2 = JSON.parse(formatCursorLine({ key: "x.png" }));
  assert.equal(d2.status, "labeled");
  assert.equal(d2.trainable, 0);
});

test("parseCursorDoneSet: a TORN final line (kill mid-write) is skipped, never aborts resume", () => {
  // The kill scenario: the last cursor line was half-written when the reaper struck. parse MUST
  // recover every COMPLETE prior line and ignore the torn tail — not throw away the whole cursor.
  const text =
    formatCursorLine({ key: "a.png" }) +
    formatCursorLine({ key: "b.png" }) +
    '{"key":"c.png","status":"lab';   // torn — no closing brace/newline
  const done = parseCursorDoneSet(text);
  assert.equal(done.size, 2, "two complete lines recovered");
  assert.ok(done.has("a.png") && done.has("b.png"));
  assert.ok(!done.has("c.png"), "torn line contributes nothing — c.png will be (correctly) re-processed");
  // blank lines + garbage are skipped too
  assert.equal(parseCursorDoneSet("\n\n  \nnot json\n").size, 0);
  assert.equal(parseCursorDoneSet("").size, 0);
  assert.equal(parseCursorDoneSet(null).size, 0);
});

test("parseCursorDoneSet: accepts legacy {image}/{part} keys (cursor written before {key} field)", () => {
  const done = parseCursorDoneSet('{"image":"DIR/old1.png"}\n{"part":"OLD2.PNG"}\n');
  assert.ok(done.has("old1.png") && done.has("old2.png"));
});

// --retry-failed: a stronger model lineup (e.g. qwen3-vl:32b) must get another attempt at the prints
// the 2-model ensemble could not read (~15% measured 2026-06-19). WHY it matters: without this the
// ensemble-failed prints are cursored done forever -> a model upgrade can NEVER recover them = a
// permanent recall hole exactly where "delta missed clearly-visible dims" comes from.
test("parseCursorDoneSet: default keeps failed prints DONE; --retry-failed re-queues recoverable failures only", () => {
  const text =
    formatCursorLine({ key: "good.pdf", status: "labeled" }) +
    formatCursorLine({ key: "ensfail.pdf", status: "skipped-ensemble-failed" }) +
    formatCursorLine({ key: "rasterfail.pdf", status: "skipped-rasterize-failed" }) +
    formatCursorLine({ key: "missing.pdf", status: "skipped-missing" }) +
    formatCursorLine({ key: "paperwork.pdf", status: "skipped-all-paperwork" });
  // DEFAULT: every cursored print is done (back-compat) -- failures stay skipped.
  const dflt = parseCursorDoneSet(text);
  assert.equal(dflt.size, 5, "default: all 5 cursored prints are done");
  // --retry-failed: re-queue ONLY ensemble-failed + rasterize-failed; labeled/missing/paperwork stay done.
  const retry = parseCursorDoneSet(text, { retryFailed: true });
  assert.ok(retry.has("good.pdf"), "labeled stays done");
  assert.ok(retry.has("missing.pdf"), "missing file is NOT model-recoverable -> stays done");
  assert.ok(retry.has("paperwork.pdf"), "confident paperwork is NOT model-recoverable -> stays done");
  assert.ok(!retry.has("ensfail.pdf"), "ensemble-failed is re-queued");
  assert.ok(!retry.has("rasterfail.pdf"), "rasterize-failed is re-queued");
  assert.equal(retry.size, 3, "exactly the 2 recoverable failures are re-queued");
});

test("parseCursorDoneSet: LAST status wins -- a print failed-then-labeled is DONE even under --retry-failed", () => {
  // a print ensemble-failed on an early run, then a later run (better model) labeled it.
  const text =
    formatCursorLine({ key: "x.pdf", status: "skipped-ensemble-failed" }) +
    formatCursorLine({ key: "x.pdf", status: "labeled" });
  assert.ok(parseCursorDoneSet(text, { retryFailed: true }).has("x.pdf"), "later success wins -> not re-queued");
  // and the inverse: labeled-then-failed (a regression) IS re-queued under retry
  const text2 =
    formatCursorLine({ key: "y.pdf", status: "labeled" }) +
    formatCursorLine({ key: "y.pdf", status: "skipped-ensemble-failed" });
  assert.ok(!parseCursorDoneSet(text2, { retryFailed: true }).has("y.pdf"), "latest is a failure -> re-queued");
});

test("RETRYABLE_FAILURE_STATUSES: exactly the model-recoverable failure statuses", () => {
  assert.ok(RETRYABLE_FAILURE_STATUSES.has("skipped-ensemble-failed"));
  assert.ok(RETRYABLE_FAILURE_STATUSES.has("skipped-rasterize-failed"));
  assert.ok(!RETRYABLE_FAILURE_STATUSES.has("skipped-missing"), "missing file is not model-recoverable");
  assert.ok(!RETRYABLE_FAILURE_STATUSES.has("skipped-all-paperwork"), "confident paperwork is not model-recoverable");
  assert.ok(!RETRYABLE_FAILURE_STATUSES.has("labeled"));
  assert.equal(RETRYABLE_FAILURE_STATUSES.size, 2, "exactly two recoverable statuses");
});

test("partitionByResumeCursor: skips done keys, keeps todo order, NEVER re-runs a processed print", () => {
  const worklist = ["dir/a.pdf", "dir/b.pdf", "dir/c.pdf", "dir/d.pdf"];
  const done = parseCursorDoneSet(formatCursorLine({ key: "b.pdf" }) + formatCursorLine({ key: "d.pdf" }));
  const { todo, skipped, skippedDone } = partitionByResumeCursor(worklist, done);
  assert.deepEqual(todo, ["dir/a.pdf", "dir/c.pdf"], "only un-done prints, original order");
  assert.equal(skippedDone, 2);
  assert.equal(skipped.length, 2);
  // THE invariant: re-running with the prior todo all marked done → ZERO re-OCR
  const allDone = parseCursorDoneSet(worklist.map((w) => formatCursorLine({ key: w })).join(""));
  assert.equal(partitionByResumeCursor(worklist, allDone).todo.length, 0, "fully-processed corpus → re-OCR count 0");
});

test("partitionByResumeCursor: a print listed twice in the worklist is processed once (in-worklist de-dup)", () => {
  const worklist = ["x/p.pdf", "y/P.PDF", "z/p.pdf"]; // all the same print
  const { todo, skippedDone } = partitionByResumeCursor(worklist, new Set());
  assert.equal(todo.length, 1, "same print via 3 paths → processed once");
  assert.equal(skippedDone, 2);
});

test("partitionByResumeCursor: splits worklist-dup vs cursor-done; distinctTotal is the true denominator; skippedDone is their sum", () => {
  // 5 listed: a (todo), b (cursor-done), c (todo), A.PDF (re-filed dup of a), B.PDF (re-filed dup of b)
  const worklist = ["dir/a.pdf", "dir/b.pdf", "dir/c.pdf", "other/A.PDF", "other/B.PDF"];
  const done = parseCursorDoneSet(formatCursorLine({ key: "b.pdf" }));
  const r = partitionByResumeCursor(worklist, done);
  assert.deepEqual(r.todo, ["dir/a.pdf", "dir/c.pdf"], "only un-done distinct prints");
  assert.equal(r.skippedCursorDone, 1, "b.pdf is in the cursor (genuine prior-run progress)");
  assert.equal(r.skippedWorklistDup, 2, "A.PDF + B.PDF are re-filed basename duplicates, NOT lost coverage");
  assert.equal(r.skippedDone, 3, "back-compat sum = worklist-dup + cursor-done");
  assert.equal(r.distinctTotal, 3, "TRUE denominator = distinct basenames a/b/c, NOT the 5 listed lines");
});

test("partitionByResumeCursor: completion invariant -- corpus done when skippedCursorDone === distinctTotal and todo === 0", () => {
  const worklist = ["d/a.pdf", "d/b.pdf", "e/A.PDF"]; // 2 distinct (a, b) + 1 re-filed dup
  const allDistinctDone = parseCursorDoneSet(formatCursorLine({ key: "a.pdf" }) + formatCursorLine({ key: "b.pdf" }));
  const r = partitionByResumeCursor(worklist, allDistinctDone);
  assert.equal(r.todo.length, 0, "every distinct print processed -> nothing left to OCR");
  assert.equal(r.distinctTotal, 2, "denominator is the 2 distinct prints");
  assert.equal(r.skippedCursorDone, 2, "both distinct prints counted as resumed-done (100%)");
  assert.equal(r.skippedWorklistDup, 1, "the re-filed dup, correctly excluded from the denominator");
});

test("partitionByResumeCursor: keyless (blank) worklist entries are dropped from todo, counted", () => {
  const { todo, skippedNullKey } = partitionByResumeCursor(["", "  ", "real.pdf"], new Set());
  assert.deepEqual(todo, ["real.pdf"]);
  assert.equal(skippedNullKey, 2);
  // adversarial: non-array inputs never throw
  assert.deepEqual(partitionByResumeCursor(null, null).todo, []);
});

// --until-complete fast-exit predicate (operator 2026-06-19 "do it all until complete"). WHY it matters:
// a continuous backstop relaunches the task every ~30min; on a DRAINED corpus it must report "done" so
// the runner skips the 24-print calibration (else GPU burns forever post-completion). A FALSE positive
// here would silently re-grind; a wrong TRUE on an empty corpus would mask a misconfigured run (R12).
test("isCorpusDrained: TRUE only when the worklist is non-empty AND every distinct print is cursored", () => {
  const worklist = ["a.pdf", "b.pdf", "c.pdf"];
  // partial -> not drained (the loop must keep going)
  assert.equal(isCorpusDrained(worklist, new Set(["a.pdf"])), false, "1 of 3 done is NOT drained");
  assert.equal(isCorpusDrained(worklist, new Set(["a.pdf", "b.pdf"])), false, "2 of 3 done is NOT drained");
  // all distinct prints cursored -> drained (fast-exit)
  assert.equal(isCorpusDrained(worklist, new Set(["a.pdf", "b.pdf", "c.pdf"])), true, "all 3 done IS drained");
  // worklist-internal dup does not block drain: 3 distinct, all done
  assert.equal(isCorpusDrained(["a.pdf", "a.pdf", "b.pdf", "c.pdf"], new Set(["a.pdf", "b.pdf", "c.pdf"])), true, "dup-listed but distinct set done");
});

test("isCorpusDrained: an empty/blank worklist is NEVER 'drained' (a missing corpus must fail loud, not no-op)", () => {
  assert.equal(isCorpusDrained([], new Set(["a.pdf"])), false, "empty worklist is not drained");
  assert.equal(isCorpusDrained(["", "  "], new Set()), false, "all-blank worklist is not drained");
  // adversarial: non-array / non-Set inputs never throw, never falsely claim drained
  assert.equal(isCorpusDrained(null, null), false);
  assert.equal(isCorpusDrained(undefined, undefined), false);
});
