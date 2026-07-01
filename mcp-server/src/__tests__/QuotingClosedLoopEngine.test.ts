/**
 * QuotingClosedLoopEngine.test.ts —
 * QUOTING-SYNERGY-MS0/U-QP-CLOSED-LOOP-CORE (slot:charlie iter46 2026-05-26).
 *
 * Coverage matrix:
 *   - 3 pure helpers (splitTrainHoldout · detectDrift · shouldPromote)
 *   - 5 verdicts (INSUFFICIENT_DATA · NO_DRIFT_NO_OP · ROLLED_BACK ×3 · PROMOTED ·
 *     STAGE_FAILED ×2)
 *   - telemetry stage (psi-delta = before.mape − after.mape)
 *   - JSONL cycle-log append (real disk write to tmpdir)
 *   - frozen DEFAULTS map
 *
 * All thresholds + sample numbers are extracted to NAMED CONSTANTS below;
 * every assertion is a concrete equality check (no `toBeDefined`, no
 * `toBeUndefined`, no `not.toThrow`, no presence-only stubs).
 */

import { describe, it, expect, vi } from "vitest";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  QuotingClosedLoopEngine,
  splitTrainHoldout,
  detectDrift,
  shouldPromote,
  classifyOutcomeProvenance,
  gateOutboundAlignment,
  toOutcomeSignal,
  type ClosedLoopDeps,
  type QuoteOutcomeRecord,
  type AccuracyReport,
  type CalibrationFactors,
  type CoVVerdict,
  type CycleOutcomeSignal,
} from "../engines/QuotingClosedLoopEngine.js";

// ─── Named constants (eliminate magic numbers in expectations) ─────────────

/** Default drift gates from QuotingClosedLoopEngine.DEFAULTS — repeated here
 *  so the test reads as a contract spec rather than a regression-on-internals. */
const DRIFT_MAPE_THRESHOLD_PCT = 18;
const DRIFT_BIAS_THRESHOLD_PCT = 8;
const PROMOTION_MIN_IMPROVEMENT_PCT = 1;
const PROMOTION_REGRESSION_TOLERANCE_PCT = 0.5;
const DEFAULT_MIN_SAMPLE_SIZE = 20;
const DEFAULT_HOLDOUT_FRACTION = 0.2;

/** Scenario MAPE values used across the verdict tests. The "_DRIFTING_*"
 *  values exceed the drift gate; "_HEALTHY_*" stay under it. */
const MAPE_HEALTHY = 12;          // < 18 → drift gate stays closed
const BIAS_HEALTHY = 3;           // |3| < 8 → drift gate stays closed
const MAPE_DRIFTING_BEFORE = 22;  // > 18 → triggers retrain
const BIAS_DRIFTING_BEFORE = 9;   // |9| > 8 → triggers retrain
const MAPE_AFTER_BETTER = 14;     // 22 → 14 is an 8-pt improvement (> 1% gate)
const MAPE_AFTER_WORSE = 28;      // 22 → 28 is a 6-pt regression (> 0.5% tol)
const BIAS_AFTER_BETTER = 3;
const BIAS_AFTER_WORSE = 11;

/** Insufficient-data scenario count (must be < DEFAULT_MIN_SAMPLE_SIZE). */
const INSUFFICIENT_OUTCOMES_COUNT = 5;
const SUFFICIENT_OUTCOMES_COUNT = 25;

/** psi-delta expected on the happy PROMOTED path. */
const EXPECTED_PSI_DELTA = MAPE_DRIFTING_BEFORE - MAPE_AFTER_BETTER; // 22 − 14 = 8

/** Split-test sizes — pure-helper exercise. */
const SPLIT_TEST_N = 100;
const SPLIT_TEST_FRACTION = 0.2;
const SPLIT_TEST_TRAIN_COUNT = 80; // 100 × (1 − 0.2)
const SPLIT_TEST_HOLDOUT_COUNT = 20;

// ─── Test fixtures ──────────────────────────────────────────────────────────

function makeOutcomes(n: number): QuoteOutcomeRecord[] {
  return Array.from({ length: n }, (_, i) => ({
    quote_id: `Q-${i + 1}`,
    customer: i % 2 === 0 ? "ITW" : "Alcoa",
    predicted_quote_usd: 100 + i,
    actual_invoice_usd: 100 + i,
    accepted: true,
    material: "aluminum_6061",
    machine_class: "mill",
    observed_at: new Date(2026, 4, 26, 12, 0, i).toISOString(),
  }));
}

function makeAccuracy(overrides: Partial<AccuracyReport> = {}): AccuracyReport {
  return {
    sample_size: SUFFICIENT_OUTCOMES_COUNT,
    mape_pct: MAPE_HEALTHY,
    hit_rate_15pct: 0.78,
    hit_rate_10pct: 0.62,
    bias_pct: BIAS_HEALTHY,
    ...overrides,
  };
}

function makeFactors(): CalibrationFactors {
  return { material_cost_multiplier: 1.05, setup_overhead_pct: 0.18 };
}

function makeVerdict(safe: boolean, reason?: string): CoVVerdict {
  return safe
    ? { safe_to_activate: true, confidence: 0.92 }
    : { safe_to_activate: false, confidence: 0.41, rejected_reasons: [reason ?? "high-variance"] };
}

function makeHappyPathDeps(opts: {
  before?: Partial<AccuracyReport>;
  after?: Partial<AccuracyReport>;
  verdict?: CoVVerdict;
  outcomes?: number;
} = {}): ClosedLoopDeps {
  return {
    fetchOutcomes: vi.fn(async () => makeOutcomes(opts.outcomes ?? SUFFICIENT_OUTCOMES_COUNT)),
    runAccuracy: vi.fn(async () => makeAccuracy(opts.before ?? { mape_pct: MAPE_DRIFTING_BEFORE, bias_pct: BIAS_DRIFTING_BEFORE })),
    deriveWithCoV: vi.fn(async () => ({
      factors: makeFactors(),
      verdict: opts.verdict ?? makeVerdict(true),
    })),
    validateOnHoldout: vi.fn(async () => makeAccuracy(opts.after ?? { mape_pct: MAPE_AFTER_BETTER, bias_pct: BIAS_AFTER_BETTER })),
    writeActiveFactors: vi.fn(async () => "/tmp/active-factor.json"),
  };
}

// --- Provenance fixtures (U-QP-CLOSED-LOOP-PROVENANCE-GATE) ------------------

/** REAL batch: varied predicted_quote_usd + finite positive realized actuals,
 *  no placeholder markers -> classifyOutcomeProvenance returns `real`. */
function makeRealOutcomes(n: number): QuoteOutcomeRecord[] {
  return Array.from({ length: n }, (_, i) => ({
    quote_id: `Q-REAL-${i + 1}`,
    customer: i % 2 === 0 ? "ITW" : "Alcoa",
    part_id: `PN-${1000 + i}`,
    predicted_quote_usd: 100 + i * 7,
    actual_invoice_usd: 95 + i * 7,
    accepted: true,
    material: "aluminum_6061",
    machine_class: "mill",
    observed_at: new Date(2026, 5, 9, 12, 0, i).toISOString(),
  }));
}

/** SYNTHETIC batch: the runner's constant predicted-anchor (e.g. 100) stamped
 *  across every record, real-looking actuals, no markers -> `synthetic`. */
function makeSyntheticConstantOutcomes(n: number): QuoteOutcomeRecord[] {
  return Array.from({ length: n }, (_, i) => ({
    quote_id: `Q-SYN-${i + 1}`,
    customer: "ITW",
    part_id: `PN-${2000 + i}`,
    predicted_quote_usd: 100,
    actual_invoice_usd: 100 + (i % 3),
    accepted: true,
    material: "steel_1018",
    machine_class: "mill",
    observed_at: new Date(2026, 5, 9, 12, 0, i).toISOString(),
  }));
}

/** PLACEHOLDER batch: varied predicted + real actuals BUT a curated-bootstrap
 *  marker present (customer "manual-curation-bootstrap", part_id
 *  "INTERNAL-FIX-01") -> `synthetic`. */
function makePlaceholderOutcomes(n: number): QuoteOutcomeRecord[] {
  return Array.from({ length: n }, (_, i) => ({
    quote_id: `Q-PH-${i + 1}`,
    customer: "manual-curation-bootstrap",
    part_id: i === 0 ? "INTERNAL-FIX-01" : `PN-${3000 + i}`,
    predicted_quote_usd: 120 + i * 4,
    actual_invoice_usd: 118 + i * 4,
    accepted: true,
    observed_at: new Date(2026, 5, 9, 12, 0, i).toISOString(),
  }));
}

/** EMPTY batch: predicted varies but actual_invoice_usd is null-until-landed on
 *  every record -> `empty` (no realized actuals). */
function makeNullActualOutcomes(n: number): QuoteOutcomeRecord[] {
  return Array.from({ length: n }, (_, i) => ({
    quote_id: `Q-NULL-${i + 1}`,
    customer: "Alcoa",
    part_id: `PN-${4000 + i}`,
    predicted_quote_usd: 200 + i * 3,
    actual_invoice_usd: null,
    accepted: null,
    observed_at: new Date(2026, 5, 9, 12, 0, i).toISOString(),
  }));
}

/** Deps that drive a drift -> retrain -> validate -> improve cycle to the
 *  promote branch, so the PROVENANCE gate (not drift/CoV/MAPE) decides. */
function depsForBatch(batch: QuoteOutcomeRecord[]): ClosedLoopDeps {
  return {
    fetchOutcomes: vi.fn(async () => batch),
    runAccuracy: vi.fn(async () => makeAccuracy({ mape_pct: MAPE_DRIFTING_BEFORE, bias_pct: BIAS_DRIFTING_BEFORE })),
    deriveWithCoV: vi.fn(async () => ({ factors: makeFactors(), verdict: makeVerdict(true) })),
    validateOnHoldout: vi.fn(async () => makeAccuracy({ mape_pct: MAPE_AFTER_BETTER, bias_pct: BIAS_AFTER_BETTER })),
    writeActiveFactors: vi.fn(async () => "/tmp/active-factor.json"),
  };
}

// --- classifyOutcomeProvenance (pure) ---------------------------------------

describe("classifyOutcomeProvenance", () => {
  it("real batch (varied predicted + realized actuals + no markers) -> real + mayPromote", () => {
    const p = classifyOutcomeProvenance(makeRealOutcomes(SUFFICIENT_OUTCOMES_COUNT));
    expect(p.verdict).toBe("real");
    expect(p.mayPromote).toBe(true);
    expect(p.real_outcome_count).toBe(SUFFICIENT_OUTCOMES_COUNT);
  });

  it("all-null actual_invoice_usd -> empty + blocked (0 realized actuals)", () => {
    const p = classifyOutcomeProvenance(makeNullActualOutcomes(SUFFICIENT_OUTCOMES_COUNT));
    expect(p.verdict).toBe("empty");
    expect(p.mayPromote).toBe(false);
    expect(p.real_outcome_count).toBe(0);
  });

  it("curated placeholder marker present -> synthetic + blocked", () => {
    const p = classifyOutcomeProvenance(makePlaceholderOutcomes(SUFFICIENT_OUTCOMES_COUNT));
    expect(p.verdict).toBe("synthetic");
    expect(p.mayPromote).toBe(false);
  });

  it("constant predicted_quote_usd anchor (with actuals) -> synthetic + blocked", () => {
    const p = classifyOutcomeProvenance(makeSyntheticConstantOutcomes(SUFFICIENT_OUTCOMES_COUNT));
    expect(p.verdict).toBe("synthetic");
    expect(p.mayPromote).toBe(false);
  });

  it("empty array -> empty (pure, never throws)", () => {
    const p = classifyOutcomeProvenance([]);
    expect(p.verdict).toBe("empty");
    expect(p.mayPromote).toBe(false);
    expect(p.real_outcome_count).toBe(0);
  });
});

// --- provenance promotion gate through runCycle -----------------------------

describe("provenance promotion gate (runCycle)", () => {
  it("REAL outcomes promote: writeActiveFactors called once, verdict PROMOTED", async () => {
    const deps = depsForBatch(makeRealOutcomes(SUFFICIENT_OUTCOMES_COUNT));
    const r = await QuotingClosedLoopEngine.runCycle(deps);
    expect(r.verdict).toBe("PROMOTED");
    expect(r.provenance?.verdict).toBe("real");
    expect(deps.writeActiveFactors).toHaveBeenCalledTimes(1);
  });

  it("SYNTHETIC constant-anchor outcomes are WITHHELD from the live path", async () => {
    const deps = depsForBatch(makeSyntheticConstantOutcomes(SUFFICIENT_OUTCOMES_COUNT));
    const r = await QuotingClosedLoopEngine.runCycle(deps);
    expect(r.verdict).toBe("WITHHELD_SYNTHETIC");
    expect(r.provenance?.verdict).toBe("synthetic");
    expect(deps.writeActiveFactors).not.toHaveBeenCalled();
    expect(r.factors_withheld).toEqual(makeFactors());
  });

  it("PLACEHOLDER-marker outcomes are WITHHELD (never reach the quote-time file)", async () => {
    const deps = depsForBatch(makePlaceholderOutcomes(SUFFICIENT_OUTCOMES_COUNT));
    const r = await QuotingClosedLoopEngine.runCycle(deps);
    expect(r.verdict).toBe("WITHHELD_SYNTHETIC");
    expect(deps.writeActiveFactors).not.toHaveBeenCalled();
  });

  it("all-null-actual outcomes short-circuit to INSUFFICIENT_DATA (no train, no promote)", async () => {
    const deps = depsForBatch(makeNullActualOutcomes(SUFFICIENT_OUTCOMES_COUNT));
    const r = await QuotingClosedLoopEngine.runCycle(deps);
    expect(r.verdict).toBe("INSUFFICIENT_DATA");
    expect(r.provenance?.verdict).toBe("empty");
    expect(deps.runAccuracy).not.toHaveBeenCalled();
    expect(deps.writeActiveFactors).not.toHaveBeenCalled();
  });

  it("allowSyntheticPromotion=true overrides the gate (logged) -> PROMOTED + written", async () => {
    const deps = depsForBatch(makeSyntheticConstantOutcomes(SUFFICIENT_OUTCOMES_COUNT));
    const r = await QuotingClosedLoopEngine.runCycle(deps, { allowSyntheticPromotion: true });
    expect(r.verdict).toBe("PROMOTED");
    expect(deps.writeActiveFactors).toHaveBeenCalledTimes(1);
    expect(r.warnings.some((w) => w.includes("SYNTHETIC PROMOTION OVERRIDE"))).toBe(true);
  });
});

// --- gateOutboundAlignment (pure) -------------------------------------------

describe("gateOutboundAlignment", () => {
  it("reliable reference + aligned ratio -> aligned, block false", () => {
    const g = gateOutboundAlignment({ ok: true, referenceReliable: true, verdict: "aligned", medianRatio: 1.02, alignTolerance: 0.15 });
    expect(g.verdict).toBe("aligned");
    expect(g.block).toBe(false);
  });

  it("reliable reference + HIGH drift beyond tolerance -> withheld-outbound-drift, block true", () => {
    const g = gateOutboundAlignment({ ok: true, referenceReliable: true, verdict: "predicted-high", medianRatio: 1.5, alignTolerance: 0.15 });
    expect(g.verdict).toBe("withheld-outbound-drift");
    expect(g.block).toBe(true);
  });

  it("ratio WITHIN tolerance (1.10 vs tol 0.15) -> aligned (does not block)", () => {
    const g = gateOutboundAlignment({ ok: true, referenceReliable: true, verdict: "aligned", medianRatio: 1.10, alignTolerance: 0.15 });
    expect(g.verdict).toBe("aligned");
    expect(g.block).toBe(false);
  });

  it("UNRELIABLE reference + high ratio -> unverified, block false (directional-only never vetoes)", () => {
    const g = gateOutboundAlignment({ ok: true, referenceReliable: false, reliabilityVerdict: "insufficient-reference", verdict: "predicted-high", medianRatio: 2.0, alignTolerance: 0.15 });
    expect(g.verdict).toBe("unverified");
    expect(g.block).toBe(false);
  });

  it("predicted-LOW (ratio 0.7) -> aligned, block false (under-pricing is not a margin hazard)", () => {
    const g = gateOutboundAlignment({ ok: true, referenceReliable: true, verdict: "predicted-low", medianRatio: 0.7, alignTolerance: 0.15 });
    expect(g.verdict).toBe("aligned");
    expect(g.block).toBe(false);
  });

  it("ok:false / null / undefined match -> unverified, block false (never throws)", () => {
    expect(gateOutboundAlignment({ ok: false }).verdict).toBe("unverified");
    expect(gateOutboundAlignment(null).verdict).toBe("unverified");
    expect(gateOutboundAlignment(undefined).block).toBe(false);
  });

  it("explicit driftTolerance override tightens the gate: ratio 1.10 with tol 0.05 -> withheld", () => {
    const g = gateOutboundAlignment(
      { ok: true, referenceReliable: true, verdict: "aligned", medianRatio: 1.10, alignTolerance: 0.15 },
      { driftTolerance: 0.05 },
    );
    expect(g.verdict).toBe("withheld-outbound-drift");
    expect(g.block).toBe(true);
  });
});

// ─── Pure helpers ──────────────────────────────────────────────────────────

describe("splitTrainHoldout", () => {
  it("empty input yields empty train + empty holdout arrays", () => {
    const r = splitTrainHoldout([], SPLIT_TEST_FRACTION);
    expect(r.train).toEqual([]);
    expect(r.holdout).toEqual([]);
  });

  it("single record → holdout=[42], train=[] (Math.max(1, …) floor on holdout count)", () => {
    const r = splitTrainHoldout([42], SPLIT_TEST_FRACTION);
    expect(r.train).toEqual([]);
    expect(r.holdout).toEqual([42]);
  });

  it("100 records @ 0.2 → 80 train [0..79] / 20 holdout [80..99]", () => {
    const records = Array.from({ length: SPLIT_TEST_N }, (_, i) => i);
    const r = splitTrainHoldout(records, SPLIT_TEST_FRACTION);
    expect(r.train).toEqual(Array.from({ length: SPLIT_TEST_TRAIN_COUNT }, (_, i) => i));
    expect(r.holdout).toEqual(Array.from({ length: SPLIT_TEST_HOLDOUT_COUNT }, (_, i) => i + SPLIT_TEST_TRAIN_COUNT));
  });

  it("fraction clamped to [0, 0.5]: 0.9 input yields 5/5 split on 10 records", () => {
    const records = Array.from({ length: 10 }, (_, i) => i);
    const r = splitTrainHoldout(records, 0.9);
    expect(r.train).toEqual([0, 1, 2, 3, 4]);
    expect(r.holdout).toEqual([5, 6, 7, 8, 9]);
  });

  it("negative fraction clamps to 0, then Math.max(1, …) → train=[0..8], holdout=[9]", () => {
    const records = Array.from({ length: 10 }, (_, i) => i);
    const r = splitTrainHoldout(records, -1);
    expect(r.train).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
    expect(r.holdout).toEqual([9]);
  });
});

describe("detectDrift", () => {
  it("both signals under thresholds → drift=false with 0 reasons", () => {
    const r = detectDrift(
      makeAccuracy({ mape_pct: MAPE_HEALTHY, bias_pct: BIAS_HEALTHY }),
      { mape: DRIFT_MAPE_THRESHOLD_PCT, bias: DRIFT_BIAS_THRESHOLD_PCT },
    );
    expect(r.drift).toBe(false);
    expect(r.reasons).toEqual([]);
  });

  it("MAPE 22 > 18 threshold → drift=true with single mape reason", () => {
    const r = detectDrift(
      makeAccuracy({ mape_pct: MAPE_DRIFTING_BEFORE, bias_pct: BIAS_HEALTHY }),
      { mape: DRIFT_MAPE_THRESHOLD_PCT, bias: DRIFT_BIAS_THRESHOLD_PCT },
    );
    expect(r.drift).toBe(true);
    expect(r.reasons).toHaveLength(1);
    expect(r.reasons[0]).toContain("mape 22.00%");
  });

  it("absolute bias -10 > 8 threshold (under-quoting) → drift=true with single bias reason", () => {
    const r = detectDrift(
      makeAccuracy({ mape_pct: MAPE_HEALTHY, bias_pct: -10 }),
      { mape: DRIFT_MAPE_THRESHOLD_PCT, bias: DRIFT_BIAS_THRESHOLD_PCT },
    );
    expect(r.drift).toBe(true);
    expect(r.reasons).toHaveLength(1);
    expect(r.reasons[0]).toContain("|bias| 10.00%");
  });

  it("both signals exceed → drift=true with exactly 2 reasons (mape then bias)", () => {
    const r = detectDrift(
      makeAccuracy({ mape_pct: 25, bias_pct: 12 }),
      { mape: DRIFT_MAPE_THRESHOLD_PCT, bias: DRIFT_BIAS_THRESHOLD_PCT },
    );
    expect(r.drift).toBe(true);
    expect(r.reasons).toHaveLength(2);
    expect(r.reasons[0]).toContain("mape");
    expect(r.reasons[1]).toContain("bias");
  });
});

describe("shouldPromote", () => {
  const gate = {
    minImprovementPct: PROMOTION_MIN_IMPROVEMENT_PCT,
    regressionTolerancePct: PROMOTION_REGRESSION_TOLERANCE_PCT,
  };

  it("cold-start (currentReport undefined) → promote=true with cold-start reason", () => {
    const r = shouldPromote(makeAccuracy({ mape_pct: MAPE_AFTER_BETTER }), undefined, gate);
    expect(r.promote).toBe(true);
    expect(r.reason).toContain("cold-start");
  });

  it("new MAPE 14 beats current 22 by 8 pts (>1 gate) → promote=true with delta=8.00%", () => {
    const r = shouldPromote(
      makeAccuracy({ mape_pct: MAPE_AFTER_BETTER }),
      makeAccuracy({ mape_pct: MAPE_DRIFTING_BEFORE }),
      gate,
    );
    expect(r.promote).toBe(true);
    expect(r.reason).toContain("beats current");
    expect(r.reason).toContain("8.00%");
  });

  it("new 21.7 vs current 22 → Δ=0.30 < 1.0% gate AND Δ > −0.5% tolerance → promote=false noise-band", () => {
    const r = shouldPromote(
      makeAccuracy({ mape_pct: 21.7 }),
      makeAccuracy({ mape_pct: MAPE_DRIFTING_BEFORE }),
      gate,
    );
    expect(r.promote).toBe(false);
    expect(r.reason).toContain("did not improve");
  });

  it("new 24 vs current 22 → Δ=−2 worse than −0.5% tolerance → promote=false regression", () => {
    const r = shouldPromote(
      makeAccuracy({ mape_pct: 24 }),
      makeAccuracy({ mape_pct: MAPE_DRIFTING_BEFORE }),
      gate,
    );
    expect(r.promote).toBe(false);
    expect(r.reason).toContain("regresses");
    expect(r.reason).toContain("2.00%");
  });
});

// ─── runCycle: verdicts ────────────────────────────────────────────────────

describe("QuotingClosedLoopEngine.runCycle — verdicts", () => {
  it("INSUFFICIENT_DATA when outcomes < minSampleSize → measure/derive skipped, warning cites count", async () => {
    const deps = makeHappyPathDeps({ outcomes: INSUFFICIENT_OUTCOMES_COUNT });
    const r = await QuotingClosedLoopEngine.runCycle(deps, { minSampleSize: DEFAULT_MIN_SAMPLE_SIZE });
    expect(r.verdict).toBe("INSUFFICIENT_DATA");
    expect(r.drift_detected).toBe(false);
    expect(r.warnings.some((w) => w.includes(`only ${INSUFFICIENT_OUTCOMES_COUNT} outcomes`))).toBe(true);
    expect(deps.runAccuracy).toHaveBeenCalledTimes(0);
    expect(deps.deriveWithCoV).toHaveBeenCalledTimes(0);
    expect(deps.writeActiveFactors).toHaveBeenCalledTimes(0);
  });

  it("NO_DRIFT_NO_OP when accuracy under both gates → stages = [observed, measured, drift_evaluated]", async () => {
    const deps = makeHappyPathDeps({ before: { mape_pct: MAPE_HEALTHY, bias_pct: BIAS_HEALTHY } });
    const r = await QuotingClosedLoopEngine.runCycle(deps);
    expect(r.verdict).toBe("NO_DRIFT_NO_OP");
    expect(r.drift_detected).toBe(false);
    expect(r.accuracy_before?.mape_pct).toBe(MAPE_HEALTHY);
    expect(r.stages.map((s) => s.stage)).toEqual(["observed", "measured", "drift_evaluated"]);
    expect(deps.deriveWithCoV).toHaveBeenCalledTimes(0);
    expect(deps.validateOnHoldout).toHaveBeenCalledTimes(0);
    expect(deps.writeActiveFactors).toHaveBeenCalledTimes(0);
  });

  it("ROLLED_BACK on UNSAFE CoV → validate skipped, rejected_reasons surfaced in warnings", async () => {
    const deps = makeHappyPathDeps({
      before: { mape_pct: 25, bias_pct: 10 },
      verdict: makeVerdict(false, "residual stdev > 2x window"),
    });
    const r = await QuotingClosedLoopEngine.runCycle(deps);
    expect(r.verdict).toBe("ROLLED_BACK");
    expect(r.drift_detected).toBe(true);
    expect(r.warnings.some((w) => w.includes("CoV verdict UNSAFE"))).toBe(true);
    expect(r.warnings.some((w) => w.includes("residual stdev"))).toBe(true);
    expect(deps.validateOnHoldout).toHaveBeenCalledTimes(0);
    expect(deps.writeActiveFactors).toHaveBeenCalledTimes(0);
  });

  it("ROLLED_BACK when holdout MAPE 28 regresses from 22 (Δ=−6 beyond 0.5% tol) → write skipped", async () => {
    const deps = makeHappyPathDeps({
      before: { mape_pct: MAPE_DRIFTING_BEFORE, bias_pct: BIAS_DRIFTING_BEFORE },
      after: { mape_pct: MAPE_AFTER_WORSE, bias_pct: BIAS_AFTER_WORSE },
    });
    const r = await QuotingClosedLoopEngine.runCycle(deps);
    expect(r.verdict).toBe("ROLLED_BACK");
    expect(r.accuracy_before?.mape_pct).toBe(MAPE_DRIFTING_BEFORE);
    expect(r.accuracy_after?.mape_pct).toBe(MAPE_AFTER_WORSE);
    expect(r.warnings.some((w) => w.startsWith("promotion blocked"))).toBe(true);
    expect(r.warnings.some((w) => w.includes("regresses"))).toBe(true);
    expect(deps.writeActiveFactors).toHaveBeenCalledTimes(0);
  });

  it("ROLLED_BACK when writeActiveFactors throws → 'disk full' in warnings + promoted stage ok=false", async () => {
    const deps = makeHappyPathDeps({
      before: { mape_pct: MAPE_DRIFTING_BEFORE, bias_pct: BIAS_DRIFTING_BEFORE },
      after: { mape_pct: MAPE_AFTER_BETTER, bias_pct: BIAS_AFTER_BETTER },
    });
    deps.writeActiveFactors = vi.fn(async () => {
      throw new Error("disk full");
    });
    const r = await QuotingClosedLoopEngine.runCycle(deps);
    expect(r.verdict).toBe("ROLLED_BACK");
    expect(r.warnings.some((w) => w.includes("active-factor write failed"))).toBe(true);
    expect(r.warnings.some((w) => w.includes("disk full"))).toBe(true);
    const promotedStage = r.stages.find((s) => s.stage === "promoted");
    expect(promotedStage?.ok).toBe(false);
    expect(promotedStage?.reason).toBe("disk full");
  });

  it("PROMOTED happy path: drifting 22 → 14 MAPE, factors written exactly once with derived factor body", async () => {
    const deps = makeHappyPathDeps({
      before: { mape_pct: MAPE_DRIFTING_BEFORE, bias_pct: BIAS_DRIFTING_BEFORE },
      after: { mape_pct: MAPE_AFTER_BETTER, bias_pct: BIAS_AFTER_BETTER },
    });
    const r = await QuotingClosedLoopEngine.runCycle(deps);
    expect(r.verdict).toBe("PROMOTED");
    expect(r.drift_detected).toBe(true);
    expect(r.factors_promoted).toEqual(makeFactors());
    expect(r.accuracy_before?.mape_pct).toBe(MAPE_DRIFTING_BEFORE);
    expect(r.accuracy_after?.mape_pct).toBe(MAPE_AFTER_BETTER);
    expect(deps.writeActiveFactors).toHaveBeenCalledTimes(1);
    expect(deps.writeActiveFactors).toHaveBeenCalledWith(makeFactors());
  });

  it("STAGE_FAILED when fetchOutcomes throws → stages = [observed: ok=false], reason carries message", async () => {
    const deps = makeHappyPathDeps();
    deps.fetchOutcomes = vi.fn(async () => {
      throw new Error("registry offline");
    });
    const r = await QuotingClosedLoopEngine.runCycle(deps);
    expect(r.verdict).toBe("STAGE_FAILED");
    expect(r.stages).toHaveLength(1);
    expect(r.stages[0].stage).toBe("observed");
    expect(r.stages[0].ok).toBe(false);
    expect(r.stages[0].reason).toBe("registry offline");
  });

  it("STAGE_FAILED when runAccuracy throws → observed.ok=true then measured.ok=false (chain stops)", async () => {
    const deps = makeHappyPathDeps();
    deps.runAccuracy = vi.fn(async () => {
      throw new Error("accuracy engine crash");
    });
    const r = await QuotingClosedLoopEngine.runCycle(deps);
    expect(r.verdict).toBe("STAGE_FAILED");
    expect(r.stages.find((s) => s.stage === "observed")?.ok).toBe(true);
    const measured = r.stages.find((s) => s.stage === "measured");
    expect(measured?.ok).toBe(false);
    expect(measured?.reason).toBe("accuracy engine crash");
    expect(deps.deriveWithCoV).toHaveBeenCalledTimes(0);
  });
});

// ─── runCycle: telemetry + structure ───────────────────────────────────────

describe("QuotingClosedLoopEngine.runCycle — telemetry + structure", () => {
  it("feedPSIDelta receives before.mape − after.mape (22 − 14 = 8) on PROMOTED cycle", async () => {
    const feed = vi.fn(async () => {});
    const deps: ClosedLoopDeps = {
      ...makeHappyPathDeps({
        before: { mape_pct: MAPE_DRIFTING_BEFORE, bias_pct: BIAS_DRIFTING_BEFORE },
        after: { mape_pct: MAPE_AFTER_BETTER, bias_pct: BIAS_AFTER_BETTER },
      }),
      feedPSIDelta: feed,
    };
    const r = await QuotingClosedLoopEngine.runCycle(deps);
    expect(r.verdict).toBe("PROMOTED");
    expect(feed).toHaveBeenCalledTimes(1);
    expect(feed).toHaveBeenCalledWith(EXPECTED_PSI_DELTA);
    expect(r.stages.find((s) => s.stage === "telemetered")?.ok).toBe(true);
  });

  it("telemetered stage absent from stages[] when feedPSIDelta is omitted", async () => {
    const deps = makeHappyPathDeps({
      before: { mape_pct: MAPE_DRIFTING_BEFORE, bias_pct: BIAS_DRIFTING_BEFORE },
      after: { mape_pct: MAPE_AFTER_BETTER, bias_pct: BIAS_AFTER_BETTER },
    });
    const r = await QuotingClosedLoopEngine.runCycle(deps);
    expect(r.verdict).toBe("PROMOTED");
    expect(r.stages.map((s) => s.stage)).not.toContain("telemetered");
  });

  // --- feedOutcome: full-distribution self-learning telemetry ----------------
  // (U-QP-CLOSED-LOOP-OUTCOME-TELEMETRY) — UNLIKE feedPSIDelta (PROMOTED-only),
  // feedOutcome fires once on EVERY terminal verdict so the PSN learns the loop's
  // own behavior distribution (withhold rate, rollback rate, no-drift rate).

  it("feedOutcome fires exactly once on PROMOTED with applied=true + numeric mape_delta", async () => {
    const seen: CycleOutcomeSignal[] = [];
    const deps: ClosedLoopDeps = {
      ...makeHappyPathDeps({
        before: { mape_pct: MAPE_DRIFTING_BEFORE, bias_pct: BIAS_DRIFTING_BEFORE },
        after: { mape_pct: MAPE_AFTER_BETTER, bias_pct: BIAS_AFTER_BETTER },
      }),
      feedOutcome: vi.fn(async (s: CycleOutcomeSignal) => {
        seen.push(s);
      }),
    };
    const r = await QuotingClosedLoopEngine.runCycle(deps);
    expect(r.verdict).toBe("PROMOTED");
    expect(deps.feedOutcome).toHaveBeenCalledTimes(1);
    expect(seen).toHaveLength(1);
    expect(seen[0].cycle_id).toBe(r.cycle_id);
    expect(seen[0].verdict).toBe("PROMOTED");
    expect(seen[0].applied).toBe(true);
    expect(seen[0].drift_detected).toBe(true);
    expect(seen[0].mape_delta).toBe(EXPECTED_PSI_DELTA); // 22 − 14 = 8
    expect(seen[0].provenance).toBe("real");
  });

  it("feedOutcome fires on NO_DRIFT_NO_OP with applied=false + null mape_delta (no after-accuracy)", async () => {
    const seen: CycleOutcomeSignal[] = [];
    const deps: ClosedLoopDeps = {
      ...makeHappyPathDeps({ before: { mape_pct: MAPE_HEALTHY, bias_pct: BIAS_HEALTHY } }),
      feedOutcome: vi.fn(async (s: CycleOutcomeSignal) => {
        seen.push(s);
      }),
    };
    const r = await QuotingClosedLoopEngine.runCycle(deps);
    expect(r.verdict).toBe("NO_DRIFT_NO_OP");
    expect(deps.feedOutcome).toHaveBeenCalledTimes(1);
    expect(seen[0].verdict).toBe("NO_DRIFT_NO_OP");
    expect(seen[0].applied).toBe(false);
    expect(seen[0].drift_detected).toBe(false);
    expect(seen[0].mape_delta).toBeNull(); // never validated → no after-accuracy
  });

  it("feedOutcome fires on ROLLED_BACK (validation regressed) with applied=false + numeric mape_delta", async () => {
    const seen: CycleOutcomeSignal[] = [];
    const deps: ClosedLoopDeps = {
      ...makeHappyPathDeps({
        before: { mape_pct: MAPE_DRIFTING_BEFORE, bias_pct: BIAS_DRIFTING_BEFORE },
        after: { mape_pct: MAPE_AFTER_WORSE, bias_pct: BIAS_AFTER_WORSE },
      }),
      feedOutcome: vi.fn(async (s: CycleOutcomeSignal) => {
        seen.push(s);
      }),
    };
    const r = await QuotingClosedLoopEngine.runCycle(deps);
    expect(r.verdict).toBe("ROLLED_BACK");
    expect(deps.feedOutcome).toHaveBeenCalledTimes(1);
    expect(seen[0].verdict).toBe("ROLLED_BACK");
    expect(seen[0].applied).toBe(false);
    // before+after both computed, so the (non-applied) improvement is reported:
    // 22 − 28 = −6 (a regression the loop correctly refused to apply).
    expect(seen[0].mape_delta).toBe(MAPE_DRIFTING_BEFORE - MAPE_AFTER_WORSE);
  });

  it("feedOutcome fires on WITHHELD_SYNTHETIC with applied=false + provenance=synthetic", async () => {
    const seen: CycleOutcomeSignal[] = [];
    const deps: ClosedLoopDeps = {
      ...depsForBatch(makeSyntheticConstantOutcomes(SUFFICIENT_OUTCOMES_COUNT)),
      feedOutcome: vi.fn(async (s: CycleOutcomeSignal) => {
        seen.push(s);
      }),
    };
    const r = await QuotingClosedLoopEngine.runCycle(deps);
    expect(r.verdict).toBe("WITHHELD_SYNTHETIC");
    expect(deps.feedOutcome).toHaveBeenCalledTimes(1);
    expect(seen[0].verdict).toBe("WITHHELD_SYNTHETIC");
    expect(seen[0].applied).toBe(false);
    expect(seen[0].provenance).toBe("synthetic");
  });

  it("feedOutcome fires on INSUFFICIENT_DATA with applied=false + null mape_delta", async () => {
    const seen: CycleOutcomeSignal[] = [];
    const deps: ClosedLoopDeps = {
      ...makeHappyPathDeps({ outcomes: INSUFFICIENT_OUTCOMES_COUNT }),
      feedOutcome: vi.fn(async (s: CycleOutcomeSignal) => {
        seen.push(s);
      }),
    };
    const r = await QuotingClosedLoopEngine.runCycle(deps, { minSampleSize: DEFAULT_MIN_SAMPLE_SIZE });
    expect(r.verdict).toBe("INSUFFICIENT_DATA");
    expect(deps.feedOutcome).toHaveBeenCalledTimes(1);
    expect(seen[0].verdict).toBe("INSUFFICIENT_DATA");
    expect(seen[0].applied).toBe(false);
    expect(seen[0].mape_delta).toBeNull();
  });

  it("a thrown feedOutcome is swallowed (fail-soft) and does NOT change the verdict", async () => {
    const deps: ClosedLoopDeps = {
      ...makeHappyPathDeps({
        before: { mape_pct: MAPE_DRIFTING_BEFORE, bias_pct: BIAS_DRIFTING_BEFORE },
        after: { mape_pct: MAPE_AFTER_BETTER, bias_pct: BIAS_AFTER_BETTER },
      }),
      feedOutcome: vi.fn(async () => {
        throw new Error("ledger disk full");
      }),
    };
    // Telemetry must never break the cycle (R12) — runCycle resolves PROMOTED.
    const r = await QuotingClosedLoopEngine.runCycle(deps);
    expect(r.verdict).toBe("PROMOTED");
    expect(deps.feedOutcome).toHaveBeenCalledTimes(1);
    expect(deps.writeActiveFactors).toHaveBeenCalledTimes(1); // factors still applied
  });

  it("feedOutcome omitted → runCycle still resolves the verdict normally", async () => {
    const deps = makeHappyPathDeps({
      before: { mape_pct: MAPE_DRIFTING_BEFORE, bias_pct: BIAS_DRIFTING_BEFORE },
      after: { mape_pct: MAPE_AFTER_BETTER, bias_pct: BIAS_AFTER_BETTER },
    });
    const r = await QuotingClosedLoopEngine.runCycle(deps);
    expect(r.verdict).toBe("PROMOTED");
  });

  // --- toOutcomeSignal (pure projection of a REAL CycleResult) ---------------
  // Project real results (no hand-built/casted CycleResult) so the projection is
  // tested against the exact shape runCycle emits.

  it("toOutcomeSignal: mape_delta is numeric when a PROMOTED result has both before+after accuracy", async () => {
    const result = await QuotingClosedLoopEngine.runCycle(
      makeHappyPathDeps({
        before: { mape_pct: MAPE_DRIFTING_BEFORE, bias_pct: BIAS_DRIFTING_BEFORE },
        after: { mape_pct: MAPE_AFTER_BETTER, bias_pct: BIAS_AFTER_BETTER },
      }),
    );
    expect(result.verdict).toBe("PROMOTED");
    const sig = toOutcomeSignal(result);
    expect(sig.cycle_id).toBe(result.cycle_id);
    expect(sig.mape_delta).toBe(EXPECTED_PSI_DELTA);
    expect(sig.applied).toBe(true);
    expect(sig.provenance).toBe("real");
  });

  it("toOutcomeSignal: mape_delta is null when a NO_DRIFT_NO_OP result never validated", async () => {
    const result = await QuotingClosedLoopEngine.runCycle(
      makeHappyPathDeps({ before: { mape_pct: MAPE_HEALTHY, bias_pct: BIAS_HEALTHY } }),
    );
    expect(result.verdict).toBe("NO_DRIFT_NO_OP");
    const sig = toOutcomeSignal(result);
    expect(sig.mape_delta).toBeNull();
    expect(sig.applied).toBe(false);
  });

  it("stage order on PROMOTED path = observed → measured → drift_evaluated → retrained → validated → promoted", async () => {
    const deps = makeHappyPathDeps({
      before: { mape_pct: MAPE_DRIFTING_BEFORE, bias_pct: BIAS_DRIFTING_BEFORE },
      after: { mape_pct: MAPE_AFTER_BETTER, bias_pct: BIAS_AFTER_BETTER },
    });
    const r = await QuotingClosedLoopEngine.runCycle(deps);
    expect(r.stages.map((s) => s.stage)).toEqual([
      "observed",
      "measured",
      "drift_evaluated",
      "retrained",
      "validated",
      "promoted",
    ]);
  });

  it("two consecutive cycles produce distinct cycle_ids (timestamp + random suffix)", async () => {
    const deps = makeHappyPathDeps({ outcomes: INSUFFICIENT_OUTCOMES_COUNT });
    const r1 = await QuotingClosedLoopEngine.runCycle(deps);
    const r2 = await QuotingClosedLoopEngine.runCycle(deps);
    expect(r1.cycle_id).not.toBe(r2.cycle_id);
    expect(r1.cycle_id.startsWith("cycle-")).toBe(true);
    expect(r2.cycle_id.startsWith("cycle-")).toBe(true);
  });
});

// ─── Cycle log ─────────────────────────────────────────────────────────────

describe("QuotingClosedLoopEngine.appendCycleLog", () => {
  it("writes one JSONL line per call, creates parent dir, two cycles → two distinct parseable lines", async () => {
    const dir = join(tmpdir(), `qcle-log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);
    const path = join(dir, "cycles.jsonl");

    const result = {
      cycle_id: "cycle-test-1",
      started_at: "2026-05-26T00:00:00.000Z",
      finished_at: "2026-05-26T00:00:01.000Z",
      verdict: "PROMOTED" as const,
      stages: [],
      drift_detected: true,
      warnings: [],
    };

    await QuotingClosedLoopEngine.appendCycleLog(path, result);
    await QuotingClosedLoopEngine.appendCycleLog(path, { ...result, cycle_id: "cycle-test-2" });

    const content = await fs.readFile(path, "utf8");
    const lines = content.trim().split("\n");
    expect(lines).toHaveLength(2);
    expect(JSON.parse(lines[0]).cycle_id).toBe("cycle-test-1");
    expect(JSON.parse(lines[1]).cycle_id).toBe("cycle-test-2");

    await fs.rm(dir, { recursive: true, force: true });
  });

  it("fail-soft: illegal Windows path (CON device + glob chars) → no file created, no throw bubbles up", async () => {
    // Windows reserves CON/PRN/AUX/NUL/COM*/LPT* as device names; combined
    // with glob metacharacters this is rejected by mkdir on both platforms.
    const bogus = "CON\\<>\\*?\\cycles.jsonl";
    await QuotingClosedLoopEngine.appendCycleLog(bogus, {
      cycle_id: "x",
      started_at: "x",
      finished_at: "x",
      verdict: "STAGE_FAILED",
      stages: [],
      drift_detected: false,
      warnings: [],
    });
    // Confirm no file was created at the bogus path (the engine swallows
    // the error per Logger.warn, never throws — concrete observable behavior).
    let createdFile = false;
    try {
      await fs.stat(bogus);
      createdFile = true;
    } catch {
      createdFile = false;
    }
    expect(createdFile).toBe(false);
  });

  it("cycleLogPath option auto-writes a single JSONL line on PROMOTED cycle, line round-trips full record", async () => {
    const dir = join(tmpdir(), `qcle-auto-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);
    const path = join(dir, "auto-cycles.jsonl");

    const deps = makeHappyPathDeps({
      before: { mape_pct: MAPE_DRIFTING_BEFORE, bias_pct: BIAS_DRIFTING_BEFORE },
      after: { mape_pct: MAPE_AFTER_BETTER, bias_pct: BIAS_AFTER_BETTER },
    });
    const r = await QuotingClosedLoopEngine.runCycle(deps, { cycleLogPath: path });
    expect(r.verdict).toBe("PROMOTED");

    const content = await fs.readFile(path, "utf8");
    const lines = content.trim().split("\n");
    expect(lines).toHaveLength(1);
    const written = JSON.parse(lines[0]);
    expect(written.verdict).toBe("PROMOTED");
    expect(written.accuracy_before.mape_pct).toBe(MAPE_DRIFTING_BEFORE);
    expect(written.accuracy_after.mape_pct).toBe(MAPE_AFTER_BETTER);
    expect(written.drift_detected).toBe(true);
    expect(written.factors_promoted).toEqual(makeFactors());

    await fs.rm(dir, { recursive: true, force: true });
  });
});

// ─── Defaults ──────────────────────────────────────────────────────────────

describe("QuotingClosedLoopEngine.DEFAULTS", () => {
  it("exposes the six documented thresholds with the values claimed in JSDoc", () => {
    expect(QuotingClosedLoopEngine.DEFAULTS.minSampleSize).toBe(DEFAULT_MIN_SAMPLE_SIZE);
    expect(QuotingClosedLoopEngine.DEFAULTS.holdoutFraction).toBe(DEFAULT_HOLDOUT_FRACTION);
    expect(QuotingClosedLoopEngine.DEFAULTS.driftMapeThresholdPct).toBe(DRIFT_MAPE_THRESHOLD_PCT);
    expect(QuotingClosedLoopEngine.DEFAULTS.driftBiasThresholdPct).toBe(DRIFT_BIAS_THRESHOLD_PCT);
    expect(QuotingClosedLoopEngine.DEFAULTS.promotionMinImprovementPct).toBe(PROMOTION_MIN_IMPROVEMENT_PCT);
    expect(QuotingClosedLoopEngine.DEFAULTS.promotionRegressionTolerancePct).toBe(PROMOTION_REGRESSION_TOLERANCE_PCT);
  });

  it("DEFAULTS object is frozen — write attempt is no-op (Object.isFrozen=true and value unchanged)", () => {
    expect(Object.isFrozen(QuotingClosedLoopEngine.DEFAULTS)).toBe(true);
    try {
      (QuotingClosedLoopEngine.DEFAULTS as unknown as Record<string, number>).minSampleSize = 999;
    } catch {
      /* strict-mode throws on frozen-prop write; we read-back below either way */
    }
    expect(QuotingClosedLoopEngine.DEFAULTS.minSampleSize).toBe(DEFAULT_MIN_SAMPLE_SIZE);
  });
});
