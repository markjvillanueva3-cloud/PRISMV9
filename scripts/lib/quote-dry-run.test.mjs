// scripts/lib/quote-dry-run.test.mjs
//
// Tests for U-MMO-QUOTE-DRY-RUN.
// Run: node --test H:/prism/scripts/lib/quote-dry-run.test.mjs

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  WRIGHT_DEFAULT_LEARNING_FACTOR,
  wrightUnitFactor,
  wrightCumulativeFactor,
  wrightCurve,
  computeRiskPremium,
  computeShouldCost,
  quoteDryRun,
  summarizeQuote,
  buildDefaultEstimatePipeline,
} from "./quote-dry-run.mjs";
import { createPipeline, STAGE_IDS } from "./orchestrator-pipeline-shell.mjs";

// ---------------------------------------------------------------------------
// Wright's learning curve
// ---------------------------------------------------------------------------

describe("wrightUnitFactor", () => {
  it("returns 1.0 at n=1 (T_1 baseline)", () => {
    assert.equal(wrightUnitFactor(1), 1.0);
  });

  it("returns 0.80 at n=2 with 80% learning factor (canonical Wright)", () => {
    // T_2 / T_1 = 2^(log2(0.80)) = 0.80
    assert.ok(Math.abs(wrightUnitFactor(2, 0.80) - 0.80) < 1e-9);
  });

  it("returns 0.64 at n=4 with 80% (doubling-of-doubling)", () => {
    // T_4 = 0.80^2 = 0.64
    assert.ok(Math.abs(wrightUnitFactor(4, 0.80) - 0.64) < 1e-9);
  });

  it("returns 1.0 at n=1 regardless of learning factor", () => {
    assert.equal(wrightUnitFactor(1, 0.5), 1.0);
    assert.equal(wrightUnitFactor(1, 1.0), 1.0);
  });

  it("decreasing as n grows (learning curve goes down)", () => {
    assert.ok(wrightUnitFactor(10) < wrightUnitFactor(5));
    assert.ok(wrightUnitFactor(100) < wrightUnitFactor(10));
  });

  it("throws on invalid n", () => {
    assert.throws(() => wrightUnitFactor(0), /n must be >= 1/);
    assert.throws(() => wrightUnitFactor(-1), /n must be >= 1/);
    assert.throws(() => wrightUnitFactor(NaN), /n must be >= 1/);
  });

  it("throws on invalid learning factor", () => {
    assert.throws(() => wrightUnitFactor(2, 0), /learningFactor/);
    assert.throws(() => wrightUnitFactor(2, 1.5), /learningFactor/);
    assert.throws(() => wrightUnitFactor(2, -0.5), /learningFactor/);
  });
});

describe("wrightCumulativeFactor", () => {
  it("equals 1.0 at n=1", () => {
    assert.equal(wrightCumulativeFactor(1), 1.0);
  });

  it("equals 1 + 0.80 = 1.80 at n=2", () => {
    assert.ok(Math.abs(wrightCumulativeFactor(2, 0.80) - 1.80) < 1e-9);
  });

  it("grows monotonically", () => {
    assert.ok(wrightCumulativeFactor(10) > wrightCumulativeFactor(5));
    assert.ok(wrightCumulativeFactor(100) > wrightCumulativeFactor(50));
  });

  it("floors n to integer", () => {
    assert.equal(wrightCumulativeFactor(2.7), wrightCumulativeFactor(2));
  });
});

describe("wrightCurve", () => {
  it("returns n1 = costN1 exactly", () => {
    const c = wrightCurve(100);
    assert.equal(c.n1, 100);
  });

  it("n10 > n1 (cumulative grows)", () => {
    const c = wrightCurve(100);
    assert.ok(c.n10 > c.n1);
  });

  it("n100 > n10", () => {
    const c = wrightCurve(100);
    assert.ok(c.n100 > c.n10);
  });

  it("per-unit cost decreases with batch size", () => {
    const c = wrightCurve(100);
    assert.ok(c.perUnit_n10 < 100, `perUnit_n10=${c.perUnit_n10} should be < n1=100`);
    assert.ok(c.perUnit_n100 < c.perUnit_n10);
  });

  it("80% factor at N=10: per-unit ≈ 60% of N=1 (typical machining)", () => {
    const c = wrightCurve(100, 0.80);
    // cumulative factor at N=10 with b=0.80 ≈ 6.32 → per-unit ≈ 0.632 of N=1
    assert.ok(c.perUnit_n10 > 50 && c.perUnit_n10 < 80,
      `expected perUnit_n10 in (50,80), got ${c.perUnit_n10}`);
  });

  it("throws on negative cost", () => {
    assert.throws(() => wrightCurve(-10), /non-negative finite number/);
    assert.throws(() => wrightCurve(NaN), /non-negative finite number/);
  });

  it("handles zero cost", () => {
    const c = wrightCurve(0);
    assert.equal(c.n1, 0);
    assert.equal(c.n10, 0);
    assert.equal(c.n100, 0);
  });

  it("uses WRIGHT_DEFAULT_LEARNING_FACTOR when no factor provided", () => {
    const c1 = wrightCurve(100);
    const c2 = wrightCurve(100, WRIGHT_DEFAULT_LEARNING_FACTOR);
    assert.deepEqual(c1, c2);
  });
});

// ---------------------------------------------------------------------------
// Risk premium
// ---------------------------------------------------------------------------

describe("computeRiskPremium", () => {
  it("returns 0% when all stages high-confidence", () => {
    const decomp = [{ stage: "A", confidence: 0.9 }, { stage: "B", confidence: 0.85 }];
    assert.equal(computeRiskPremium(decomp).premium_pct, 0.0);
  });

  it("returns 8% when 3-4 stages are low-confidence", () => {
    const decomp = [
      { stage: "A", confidence: 0.2 }, { stage: "B", confidence: 0.3 },
      { stage: "C", confidence: 0.4 }, { stage: "D", confidence: 0.5 },
      { stage: "E", confidence: 0.9 },
    ];
    const r = computeRiskPremium(decomp);
    assert.equal(r.low_confidence_count, 4);
    assert.equal(r.premium_pct, 0.08);
  });

  it("returns 15% when 5-6 stages low-conf", () => {
    const decomp = Array.from({ length: 6 }, () => ({ confidence: 0.3 }));
    const r = computeRiskPremium(decomp);
    assert.equal(r.low_confidence_count, 6);
    assert.equal(r.premium_pct, 0.15);
  });

  it("returns 25% when >6 stages low-conf", () => {
    const decomp = Array.from({ length: 10 }, () => ({ confidence: 0.2 }));
    const r = computeRiskPremium(decomp);
    assert.equal(r.premium_pct, 0.25);
  });

  it("respects custom threshold", () => {
    const decomp = [{ confidence: 0.7 }, { confidence: 0.8 }];
    const r = computeRiskPremium(decomp, 0.9); // higher threshold catches everything
    assert.equal(r.low_confidence_count, 2);
  });

  it("rejects non-array input", () => {
    assert.throws(() => computeRiskPremium("not array"), /must be an array/);
  });
});

// ---------------------------------------------------------------------------
// Should-cost
// ---------------------------------------------------------------------------

describe("computeShouldCost", () => {
  it("should_cost ≤ raw cost sum (theoretical minimum trims slack)", () => {
    const decomp = [
      { stage: "A", cost: 100, confidence: 0.9 },
      { stage: "B", cost: 50, confidence: 0.6 },
    ];
    const sc = computeShouldCost(decomp);
    const rawSum = 150;
    assert.ok(sc.should_cost <= rawSum, `should_cost=${sc.should_cost} > rawSum=${rawSum}`);
  });

  it("margin_floor = should_cost * (1 + minimumMarginPct)", () => {
    const decomp = [{ cost: 100, confidence: 1.0 }];
    const sc = computeShouldCost(decomp, { minimumMarginPct: 0.10 });
    assert.equal(sc.should_cost, 100);
    assert.equal(sc.margin_floor, 110);
  });

  it("default minimum margin is 8%", () => {
    const decomp = [{ cost: 100, confidence: 1.0 }];
    const sc = computeShouldCost(decomp);
    assert.equal(sc.margin_floor, 108);
  });

  it("floors confidence at 0.5 (no stage can drag below half-credit)", () => {
    const decomp = [{ cost: 100, confidence: 0.1 }];
    const sc = computeShouldCost(decomp);
    // should_cost = 100 * max(0.1, 0.5) = 50
    assert.equal(sc.should_cost, 50);
  });
});

// ---------------------------------------------------------------------------
// quoteDryRun end-to-end
// ---------------------------------------------------------------------------

describe("quoteDryRun", () => {
  function buildPipelineWithSomeRealStages() {
    const p = createPipeline({ mode: "estimate" });
    p.registerStage("MATERIAL_RESOLVE", {
      engineRef: "MaterialEquivalenceEngine",
      run: () => ({
        cost: 47.20, confidence: 0.95, duration_estimate_sec: 0,
        evidence: ["4140 bar from local stock"],
        gdnt_passthrough: null, trace: "material resolved", output: {}, deferred: false,
      }),
    });
    p.registerStage("CAM_STRATEGY", {
      engineRef: "CAMKernelOrchestratorEngine",
      run: () => ({
        cost: 64.50, confidence: 0.75, duration_estimate_sec: 1200,
        evidence: ["adaptive-clearing + HSM-finish"],
        gdnt_passthrough: null, trace: "cam picked", output: {}, deferred: false,
      }),
    });
    p.registerStage("SSF", {
      engineRef: "SpeedFeedOrchestratorEngine",
      run: () => ({
        cost: 11.30, confidence: 0.90, duration_estimate_sec: 0,
        evidence: ["Kienzle 4140 + Taylor C-10"],
        gdnt_passthrough: null, trace: "ssf computed", output: {}, deferred: false,
      }),
    });
    return p;
  }

  it("returns spec-compliant 3-band quote", () => {
    const p = buildPipelineWithSomeRealStages();
    const r = quoteDryRun({ rfq: { id: "TEST-001" }, pipeline: p });
    assert.ok(r.quote_low_p50);
    assert.ok(r.quote_med_p95);
    assert.ok(r.quote_high_p99);
    assert.equal(typeof r.quote_low_p50.dollars, "number");
    assert.ok(r.quote_high_p99.dollars >= r.quote_low_p50.dollars,
      `p99 dollars ${r.quote_high_p99.dollars} must be >= p50 ${r.quote_low_p50.dollars}`);
  });

  it("decomposition has one row per stage", () => {
    const p = buildPipelineWithSomeRealStages();
    const r = quoteDryRun({ rfq: { id: "X" }, pipeline: p });
    assert.equal(r.decomposition.length, STAGE_IDS.length);
  });

  it("flags deferred + errored stages", () => {
    const p = buildPipelineWithSomeRealStages();
    const r = quoteDryRun({ rfq: { id: "X" }, pipeline: p });
    // Only 3 stages registered → 13 deferred
    assert.equal(r.deferred_stages.length, 13);
    assert.equal(r.errored_stages.length, 0);
  });

  it("quote_reliability = GAMMA when most stages deferred", () => {
    const p = buildPipelineWithSomeRealStages();
    const r = quoteDryRun({ rfq: { id: "X" }, pipeline: p });
    assert.equal(r.quote_reliability, "GAMMA");
  });

  it("quote_reliability = ALPHA when all stages built + high confidence", () => {
    const p = createPipeline({ mode: "estimate" });
    for (const stage of STAGE_IDS) {
      p.registerStage(stage, {
        engineRef: `Engine_${stage}`,
        run: () => ({
          cost: 10, confidence: 0.95, duration_estimate_sec: 60,
          evidence: [], gdnt_passthrough: null, trace: "", output: {}, deferred: false,
        }),
      });
    }
    const r = quoteDryRun({ rfq: { id: "X" }, pipeline: p });
    assert.equal(r.quote_reliability, "ALPHA");
    assert.equal(r.quote_low_p50.confidence, 0.93);  // ALPHA label
  });

  it("includes Wright's curve for batch sizing", () => {
    const p = buildPipelineWithSomeRealStages();
    const r = quoteDryRun({ rfq: { id: "X" }, pipeline: p });
    assert.ok(r.wright_curve);
    assert.ok(r.wright_curve.n1 >= 0);
    assert.ok(r.wright_curve.n10 > r.wright_curve.n1 || (r.wright_curve.n1 === 0 && r.wright_curve.n10 === 0));
    assert.ok(r.wright_curve.n100 >= r.wright_curve.n10);
  });

  it("includes should_cost + margin_floor", () => {
    const p = buildPipelineWithSomeRealStages();
    const r = quoteDryRun({ rfq: { id: "X" }, pipeline: p });
    assert.ok(typeof r.should_cost === "number");
    assert.ok(r.margin_floor >= r.should_cost);
  });

  it("includes alt_methods if passed in", () => {
    const p = buildPipelineWithSomeRealStages();
    const alts = [{ method: "macro", total: 310, savings: 110, tradeoff: "Okuma only" }];
    const r = quoteDryRun({ rfq: { id: "X" }, pipeline: p, altMethods: alts });
    assert.deepEqual(r.alt_methods, alts);
  });

  it("includes win_probability if provided", () => {
    const p = buildPipelineWithSomeRealStages();
    const r = quoteDryRun({ rfq: { id: "X" }, pipeline: p, winProbability: 0.62 });
    assert.equal(r.win_probability, 0.62);
  });

  it("includes risk_premium (dollars added for unknowns)", () => {
    const p = buildPipelineWithSomeRealStages();
    const r = quoteDryRun({ rfq: { id: "X" }, pipeline: p });
    assert.ok(typeof r.risk_premium === "number");
    // 13 deferred stages → all in low_confidence bucket → 25% premium
    assert.ok(r.risk_premium > 0, `expected positive risk_premium, got ${r.risk_premium}`);
  });

  it("includes a 1-line summary string", () => {
    const p = buildPipelineWithSomeRealStages();
    const r = quoteDryRun({ rfq: { id: "X" }, pipeline: p });
    assert.match(r.summary, /Quote (ALPHA|BETA|GAMMA):/);
    assert.match(r.summary, /\$\d+/);
  });

  it("rejects null rfq", () => {
    const p = buildPipelineWithSomeRealStages();
    assert.throws(() => quoteDryRun({ rfq: null, pipeline: p }), /rfq object required/);
  });

  it("rejects missing pipeline", () => {
    assert.throws(() => quoteDryRun({ rfq: {} }), /pipeline with .run/);
  });

  it("R12: refuses to quote from an execute-mode pipeline (safety)", () => {
    const p = createPipeline({ mode: "execute" });
    assert.throws(() => quoteDryRun({ rfq: {}, pipeline: p }), /must be in 'estimate' mode/);
  });
});

// ---------------------------------------------------------------------------
// summarizeQuote + buildDefaultEstimatePipeline
// ---------------------------------------------------------------------------

describe("summarizeQuote", () => {
  it("formats 3 bands + lead days + reliability", () => {
    const s = summarizeQuote(
      { dollars: 100, lead_days: 7, confidence: 0.93 },
      { dollars: 120, lead_days: 9, confidence: 0.93 },
      { dollars: 150, lead_days: 12, confidence: 0.93 },
      "ALPHA"
    );
    assert.match(s, /ALPHA/);
    assert.match(s, /\$100\/p50/);
    assert.match(s, /\$120\/p95/);
    assert.match(s, /\$150\/p99/);
    assert.match(s, /lead 9d/);
  });
});

describe("buildDefaultEstimatePipeline", () => {
  it("returns an estimate-mode pipeline with all 16 noop stages", () => {
    const p = buildDefaultEstimatePipeline();
    assert.equal(p.mode, "estimate");
    const stages = p.listStages();
    assert.equal(stages.length, 16);
    assert.equal(stages.every((s) => s.isNoop), true);
  });

  it("when used with quoteDryRun on a fresh RFQ, returns GAMMA with all deferred", () => {
    const p = buildDefaultEstimatePipeline();
    const r = quoteDryRun({ rfq: { id: "COLDSTART" }, pipeline: p });
    assert.equal(r.quote_reliability, "GAMMA");
    assert.equal(r.deferred_stages.length, 16);
    assert.equal(r.quote_low_p50.dollars, 0);  // honestly underestimated to $0
  });
});

// ---------------------------------------------------------------------------
// Anti-regression
// ---------------------------------------------------------------------------

describe("anti-regression invariants", () => {
  it("WRIGHT_DEFAULT_LEARNING_FACTOR is in (0, 1]", () => {
    assert.ok(WRIGHT_DEFAULT_LEARNING_FACTOR > 0);
    assert.ok(WRIGHT_DEFAULT_LEARNING_FACTOR <= 1);
  });

  it("identical RFQ + pipeline produces identical quote (deterministic)", () => {
    const make = () => {
      const p = createPipeline({ mode: "estimate" });
      p.registerStage("CAM_STRATEGY", {
        engineRef: "TestCAM",
        run: () => ({ cost: 50, confidence: 0.8, duration_estimate_sec: 100, evidence: [], gdnt_passthrough: null, trace: "", output: {}, deferred: false }),
      });
      return p;
    };
    const a = quoteDryRun({ rfq: { id: "DET" }, pipeline: make() });
    const b = quoteDryRun({ rfq: { id: "DET" }, pipeline: make() });
    assert.equal(a.quote_low_p50.dollars, b.quote_low_p50.dollars);
    assert.equal(a.quote_high_p99.dollars, b.quote_high_p99.dollars);
    assert.equal(a.quote_reliability, b.quote_reliability);
    assert.deepEqual(a.wright_curve, b.wright_curve);
  });
});
