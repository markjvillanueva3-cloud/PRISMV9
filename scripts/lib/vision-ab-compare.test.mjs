// scripts/lib/vision-ab-compare.test.mjs
// Tests for U-XRAY-VISION-AB pure A/B verdict core. Reference values + algebraic
// invariants — no toBeDefined() stubs. The pure functions decide a real, costly
// action (swap the production OCR model), so each test encodes WHY the verdict matters.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  perPrintF1,
  summarizeModelRun,
  rankModels,
  pairedF1Delta,
  determineWinner,
  buildUpgradeRecommendation,
  runModelOverPrints,
  DEFAULT_F1_MARGIN,
  DEFAULT_MIN_WIN_RATE,
  DEFAULT_MIN_COVERAGE,
  DEFAULT_LATENCY_BUDGET_MS,
} from "./vision-ab-compare.mjs";

// ── perPrintF1 (harmonic mean of P,R) ───────────────────────────────────────

test("perPrintF1: P=1 R=1 → 1", () => {
  assert.equal(perPrintF1({ precision: 1, recall: 1 }), 1);
});
test("perPrintF1: P=0.5 R=0.5 → 0.5", () => {
  assert.equal(perPrintF1({ precision: 0.5, recall: 0.5 }), 0.5);
});
test("perPrintF1: P=0.8 R=0.6 → 0.6857… (2·.48/1.4)", () => {
  assert.ok(Math.abs(perPrintF1({ precision: 0.8, recall: 0.6 }) - (0.96 / 1.4)) < 1e-9);
});
test("perPrintF1: recall 0 → 0 (not NaN)", () => {
  assert.equal(perPrintF1({ precision: 1, recall: 0 }), 0);
});
test("perPrintF1: both 0 → 0", () => {
  assert.equal(perPrintF1({ precision: 0, recall: 0 }), 0);
});
test("perPrintF1: null / NaN inputs → 0 (total, never throws)", () => {
  assert.equal(perPrintF1(null), 0);
  assert.equal(perPrintF1(undefined), 0);
  assert.equal(perPrintF1({ precision: NaN, recall: 0.5 }), 0);
  assert.equal(perPrintF1({ precision: Infinity, recall: 0.5 }), 0);
  assert.equal(perPrintF1({}), 0);
});

// ── summarizeModelRun ────────────────────────────────────────────────────────

test("summarizeModelRun: full agg + latencies → correct summary", () => {
  const s = summarizeModelRun({
    model: "m1",
    agg: { micro_f1: 0.8, micro_recall: 0.7, micro_precision: 0.9, mean_mae_mm: 0.5 },
    latencyMsList: [100, 200, 300],
    ocrOk: 3, count: 3,
  });
  assert.equal(s.model, "m1");
  assert.equal(s.f1, 0.8);
  assert.equal(s.recall, 0.7);
  assert.equal(s.precision, 0.9);
  assert.equal(s.maeMm, 0.5);
  assert.equal(s.p50LatencyMs, 200);           // R-7 percentile of [100,200,300] @0.5
  assert.equal(s.coverage, 1);
  assert.equal(s.ran, true);
});
test("summarizeModelRun: null agg → f1 0, ran false (a model that scored nothing)", () => {
  const s = summarizeModelRun({ model: "dead", agg: null, latencyMsList: [], ocrOk: 0, count: 5 });
  assert.equal(s.f1, 0);
  assert.equal(s.recall, 0);
  assert.equal(s.coverage, 0);
  assert.equal(s.p50LatencyMs, null);
  assert.equal(s.p95LatencyMs, null);
  assert.equal(s.ran, false);
});
test("summarizeModelRun: partial coverage (3/5) → 0.6", () => {
  const s = summarizeModelRun({ model: "m", agg: { micro_f1: 0.5 }, latencyMsList: [10, 20, 30], ocrOk: 3, count: 5 });
  assert.equal(s.coverage, 0.6);
  assert.equal(s.ran, true);
});
test("summarizeModelRun: missing model name → '(unknown)', no throw on {}", () => {
  const s = summarizeModelRun({});
  assert.equal(s.model, "(unknown)");
  assert.equal(s.f1, 0);
  assert.equal(s.count, 0);
});
test("summarizeModelRun: negative/NaN latencies filtered out of percentiles", () => {
  const s = summarizeModelRun({ model: "m", agg: { micro_f1: 0.5 }, latencyMsList: [-5, NaN, 100, 200], ocrOk: 2, count: 2 });
  assert.equal(s.p50LatencyMs, 150); // only [100,200] survive; p50 = 150
});

// ── rankModels ───────────────────────────────────────────────────────────────

test("rankModels: highest F1 first", () => {
  const r = rankModels([
    { model: "a", f1: 0.5, coverage: 1, p95LatencyMs: 100 },
    { model: "b", f1: 0.8, coverage: 1, p95LatencyMs: 200 },
  ]);
  assert.equal(r[0].model, "b");
  assert.equal(r[1].model, "a");
});
test("rankModels: F1 tie → higher coverage wins", () => {
  const r = rankModels([
    { model: "lowcov", f1: 0.7, coverage: 0.5, p95LatencyMs: 100 },
    { model: "hicov", f1: 0.7, coverage: 1.0, p95LatencyMs: 100 },
  ]);
  assert.equal(r[0].model, "hicov");
});
test("rankModels: F1+coverage tie → lower latency wins", () => {
  const r = rankModels([
    { model: "slow", f1: 0.7, coverage: 1, p95LatencyMs: 5000 },
    { model: "fast", f1: 0.7, coverage: 1, p95LatencyMs: 1000 },
  ]);
  assert.equal(r[0].model, "fast");
});
test("rankModels: full tie → deterministic name asc", () => {
  const r = rankModels([
    { model: "zeta", f1: 0.7, coverage: 1, p95LatencyMs: 100 },
    { model: "alpha", f1: 0.7, coverage: 1, p95LatencyMs: 100 },
  ]);
  assert.equal(r[0].model, "alpha");
});
test("rankModels: null/non-array → [] ; does NOT mutate input", () => {
  assert.deepEqual(rankModels(null), []);
  const input = [{ model: "a", f1: 0.5, coverage: 1, p95LatencyMs: 100 }, { model: "b", f1: 0.9, coverage: 1, p95LatencyMs: 100 }];
  const snapshot = input.map((x) => x.model).join(",");
  rankModels(input);
  assert.equal(input.map((x) => x.model).join(","), snapshot); // input order preserved
});

// ── pairedF1Delta (within-subjects sign count, candidate perspective) ────────

test("pairedF1Delta: candidate wins every print", () => {
  const base = [{ precision: 0.5, recall: 0.5 }, { precision: 0.4, recall: 0.4 }];
  const cand = [{ precision: 1, recall: 1 }, { precision: 0.9, recall: 0.9 }];
  const d = pairedF1Delta(base, cand);
  assert.equal(d.nPaired, 2);
  assert.equal(d.wins, 2);
  assert.equal(d.losses, 0);
  assert.equal(d.winRate, 1);
  assert.ok(d.meanF1Delta > 0);
});
test("pairedF1Delta: candidate loses every print", () => {
  const base = [{ precision: 1, recall: 1 }];
  const cand = [{ precision: 0.5, recall: 0.5 }];
  const d = pairedF1Delta(base, cand);
  assert.equal(d.wins, 0);
  assert.equal(d.losses, 1);
  assert.equal(d.winRate, 0);
  assert.equal(d.meanF1Delta, -0.5);
});
test("pairedF1Delta: identical → all ties", () => {
  const x = [{ precision: 0.7, recall: 0.7 }, { precision: 0.6, recall: 0.6 }];
  const d = pairedF1Delta(x, x);
  assert.equal(d.ties, 2);
  assert.equal(d.wins, 0);
  assert.equal(d.losses, 0);
  assert.equal(d.winRate, 0);
  assert.equal(d.meanF1Delta, 0);
});
test("pairedF1Delta: mismatched lengths → nPaired = min", () => {
  const d = pairedF1Delta([{ precision: 1, recall: 1 }, { precision: 1, recall: 1 }], [{ precision: 0.5, recall: 0.5 }]);
  assert.equal(d.nPaired, 1);
});
test("pairedF1Delta: null entries skipped", () => {
  const d = pairedF1Delta([{ precision: 1, recall: 1 }, null], [{ precision: 0.5, recall: 0.5 }, { precision: 1, recall: 1 }]);
  assert.equal(d.nPaired, 1);
  assert.equal(d.losses, 1);
});
test("pairedF1Delta: empty → nPaired 0, null rates", () => {
  const d = pairedF1Delta([], []);
  assert.equal(d.nPaired, 0);
  assert.equal(d.meanF1Delta, null);
  assert.equal(d.winRate, null);
});

// ── determineWinner ──────────────────────────────────────────────────────────

const BASE = "qwen3-vl:8b-instruct";

function sum(model, f1, coverage = 1, p95 = 1000) {
  return { model, f1, recall: f1, precision: f1, maeMm: 0.1, p50LatencyMs: p95 / 2, p95LatencyMs: p95, meanLatencyMs: p95 / 2, coverage, ocrOk: coverage > 0 ? 5 : 0, count: 5, ran: coverage > 0 };
}

test("determineWinner: candidate beats margin + paired → UPGRADE", () => {
  const v = determineWinner([sum(BASE, 0.70), sum("big", 0.75)], {
    baselineModel: BASE,
    paired: { big: { winRate: 0.8, nPaired: 5 } },
  });
  assert.equal(v.action, "upgrade");
  assert.equal(v.recommendedModel, "big");
  assert.equal(v.deltaF1, 0.05);
  assert.equal(v.beatsMargin, true);
});
test("determineWinner: gain below margin → STAY", () => {
  const v = determineWinner([sum(BASE, 0.70), sum("big", 0.71)], { baselineModel: BASE });
  assert.equal(v.action, "stay");
  assert.equal(v.recommendedModel, BASE);
  assert.equal(v.beatsMargin, false);
});
test("determineWinner: aggregate beats margin but paired win-rate too low → STAY (per-print not corroborated)", () => {
  const v = determineWinner([sum(BASE, 0.70), sum("big", 0.80)], {
    baselineModel: BASE,
    paired: { big: { winRate: 0.3, nPaired: 10 } },
  });
  assert.equal(v.action, "stay");
  assert.equal(v.beatsMargin, false);
});
test("determineWinner: beats margin, NO paired data supplied → UPGRADE on F1 alone", () => {
  const v = determineWinner([sum(BASE, 0.70), sum("big", 0.80)], { baselineModel: BASE });
  assert.equal(v.action, "upgrade");
  assert.equal(v.recommendedModel, "big");
});
test("determineWinner: baseline absent from set → INCONCLUSIVE", () => {
  const v = determineWinner([sum("x", 0.7), sum("y", 0.9)], { baselineModel: BASE });
  assert.equal(v.action, "inconclusive");
});
test("determineWinner: baseline ran zero prints → INCONCLUSIVE (no floor)", () => {
  const v = determineWinner([sum(BASE, 0, 0), sum("big", 0.8)], { baselineModel: BASE });
  assert.equal(v.action, "inconclusive");
});
test("determineWinner: empty summaries → INCONCLUSIVE", () => {
  const v = determineWinner([], { baselineModel: BASE });
  assert.equal(v.action, "inconclusive");
});
test("determineWinner: only baseline present → STAY (no candidate)", () => {
  const v = determineWinner([sum(BASE, 0.7)], { baselineModel: BASE });
  assert.equal(v.action, "stay");
  assert.equal(v.recommendedModel, BASE);
});
test("determineWinner: candidate wins F1 but latency over budget → still UPGRADE with warning", () => {
  const v = determineWinner([sum(BASE, 0.70, 1, 1000), sum("big", 0.80, 1, DEFAULT_LATENCY_BUDGET_MS + 5000)], { baselineModel: BASE });
  assert.equal(v.action, "upgrade");
  assert.ok(v.latencyWarning && v.latencyWarning.includes("latency"));
});
test("determineWinner: exact margin boundary (delta == margin) → UPGRADE (>=)", () => {
  const v = determineWinner([sum(BASE, 0.70), sum("big", +(0.70 + DEFAULT_F1_MARGIN).toFixed(4))], { baselineModel: BASE });
  assert.equal(v.action, "upgrade");
});
test("determineWinner: ranked array is returned, baseline included", () => {
  const v = determineWinner([sum(BASE, 0.70), sum("big", 0.75)], { baselineModel: BASE });
  assert.equal(v.ranked.length, 2);
  assert.equal(v.ranked[0].model, "big"); // higher F1 ranked first
});

test("determineWinner: candidate beats F1 margin but coverage below floor → STAY (partial-set F1 not comparable)", () => {
  // candidate OCR'd only 1/5 prints (coverage 0.2) but fluked F1 0.95 on it.
  const lowCov = { model: "big", f1: 0.95, recall: 0.95, precision: 0.95, maeMm: 0.1, p50LatencyMs: 500, p95LatencyMs: 1000, meanLatencyMs: 500, coverage: 0.2, ocrOk: 1, count: 5, ran: true };
  const v = determineWinner([sum(BASE, 0.70), lowCov], { baselineModel: BASE }); // no paired data → F1-only path
  assert.equal(v.action, "stay");
  assert.ok(/below floor/.test(v.rationale));
});
test("determineWinner: minCoverage opt override lets a partial candidate through", () => {
  const lowCov = { model: "big", f1: 0.95, recall: 0.95, precision: 0.95, maeMm: 0.1, p50LatencyMs: 500, p95LatencyMs: 1000, meanLatencyMs: 500, coverage: 0.2, ocrOk: 1, count: 5, ran: true };
  const v = determineWinner([sum(BASE, 0.70), lowCov], { baselineModel: BASE, minCoverage: 0.1 });
  assert.equal(v.action, "upgrade");
});
test("DEFAULT_MIN_COVERAGE is a sane fraction", () => {
  assert.ok(DEFAULT_MIN_COVERAGE > 0 && DEFAULT_MIN_COVERAGE <= 1);
});

// ── buildUpgradeRecommendation ───────────────────────────────────────────────

test("buildUpgradeRecommendation: upgrade + selection already matches → no-change", () => {
  const v = determineWinner([sum(BASE, 0.70), sum("big", 0.80)], { baselineModel: BASE });
  const rec = buildUpgradeRecommendation(v, { model: "big" });
  assert.equal(rec.action, "upgrade");
  assert.equal(rec.recommendedModel, "big");
  assert.equal(rec.alreadySelected, true);
  assert.ok(/no change/i.test(rec.nextStep));
});
test("buildUpgradeRecommendation: upgrade + selection differs → add-to-preference step", () => {
  const v = determineWinner([sum(BASE, 0.70), sum("big", 0.80)], { baselineModel: BASE });
  const rec = buildUpgradeRecommendation(v, { model: BASE });
  assert.equal(rec.alreadySelected, false);
  assert.ok(/BIG_VISION_PREFERENCE|PRISM_VISION_MODEL/.test(rec.nextStep));
  assert.equal(rec.evidence.candidateModel, "big");
  assert.equal(rec.evidence.deltaF1, 0.1);
});
test("buildUpgradeRecommendation: stay verdict → keep-default step", () => {
  const v = determineWinner([sum(BASE, 0.70), sum("big", 0.705)], { baselineModel: BASE });
  const rec = buildUpgradeRecommendation(v, null);
  assert.equal(rec.action, "stay");
  assert.equal(rec.currentSelection, null);
  assert.ok(/keep the safe default/i.test(rec.nextStep));
});
test("buildUpgradeRecommendation: inconclusive → re-run guidance", () => {
  const v = determineWinner([], { baselineModel: BASE });
  const rec = buildUpgradeRecommendation(v);
  assert.equal(rec.action, "inconclusive");
  assert.ok(/inconclusive/i.test(rec.nextStep));
});

test("buildUpgradeRecommendation: thinking-trap recommendation → WARNING, flagged", () => {
  // Force an upgrade verdict whose recommended model is a bare (thinking-trap) tag.
  const trapVerdict = {
    action: "upgrade", recommendedModel: "qwen3-vl:32b", baselineModel: BASE,
    baselineF1: 0.7, candidateModel: "qwen3-vl:32b", candidateF1: 0.85, deltaF1: 0.15, marginF1: 0.02,
  };
  const rec = buildUpgradeRecommendation(trapVerdict, null);
  assert.equal(rec.recommendedIsThinkingTrap, true);
  assert.ok(/WARNING/.test(rec.nextStep) && /-instruct/.test(rec.nextStep));
});
test("buildUpgradeRecommendation: instruct recommendation is NOT flagged a trap", () => {
  const v = determineWinner([sum(BASE, 0.70), sum("qwen3-vl:32b-instruct", 0.85)], { baselineModel: BASE });
  const rec = buildUpgradeRecommendation(v, null);
  assert.equal(rec.recommendedIsThinkingTrap, false);
});

// ── runModelOverPrints (impure shell — hermetic via injected deps) ───────────

test("runModelOverPrints: every OCR failure → null per-print, coverage 0, no latency (silent-bias guard)", () => {
  // Injected curl that always fails → ocrPngWithModel returns {error} for every print.
  const fakeSpawn = () => ({ status: 1, stdout: "" });
  const fakeRead = () => Buffer.from("fake-image-bytes");
  let clock = 1000;
  const fakeNow = () => (clock += 50);
  const prints = [
    { seed: 1, png: "/tmp/a.png", workDir: "/tmp", truth: { dimensions: [], title_block: {} } },
    { seed: 2, png: "/tmp/b.png", workDir: "/tmp", truth: { dimensions: [], title_block: {} } },
  ];
  const run = runModelOverPrints({ model: "m", prints, spawn: fakeSpawn, readFile: fakeRead, now: fakeNow });
  assert.equal(run.count, 2);
  assert.equal(run.ocrOk, 0);
  assert.deepEqual(run.perPrintScores, [null, null]); // index-aligned nulls for pairedF1Delta
  assert.equal(run.latencyMsList.length, 0);          // NO latency recorded for failures (no flattering)
  assert.equal(run.cases.length, 2);
  assert.ok(run.cases.every((c) => typeof c.error === "string"));
  // and the summary correctly reports a dead model — never a misleading high F1
  const s = summarizeModelRun(run);
  assert.equal(s.coverage, 0);
  assert.equal(s.ran, false);
  assert.equal(s.f1, 0);
});

// ── exported defaults are sane ───────────────────────────────────────────────

test("default knobs are in sane ranges", () => {
  assert.ok(DEFAULT_F1_MARGIN > 0 && DEFAULT_F1_MARGIN < 0.5);
  assert.ok(DEFAULT_MIN_WIN_RATE > 0 && DEFAULT_MIN_WIN_RATE <= 1);
  assert.ok(DEFAULT_LATENCY_BUDGET_MS > 0);
});
