/**
 * LATHE-PRO-MS5.2 capstone — turning_robust_optimizer test.
 *
 * Tests the shipped TurningRobustOptimizerEngine (the same code
 * path the dispatcher action `turning_robust_optimizer` runs).
 *
 * The robust optimizer ties together:
 *   • LATHE-PRO-MS1  InsertLife (change schedule + wear accumulation)
 *   • LATHE-PRO-MS2  OffsetCompensation (Cpk prediction)
 *   • LATHE-PRO-MS5  Stochastic wrapper (Monte Carlo over Gaussian σ)
 *   • LATHE-PRO-MS5.1 Sensitivity analysis (OAT screening)
 *
 * Imports the engine directly — tests exercise the real shipped code.
 */
import { describe, it, expect } from "vitest";
import {
  turningRobustOptimizerEngine,
  type RobustOptimizerInput,
} from "../engines/TurningRobustOptimizerEngine.js";
import type {
  OpSpec,
  InsertLifeInput,
} from "../engines/TurningInsertLifeEngine.js";

function pCond(o: Partial<InsertLifeInput> = {}): InsertLifeInput {
  return {
    iso_group: "P",
    Vc_m_min: 250,
    f_mm_rev: 0.25,
    ap_mm: 2.0,
    nose_radius_mm: 0.8,
    coating: "TiAlN",
    ...o,
  };
}

const baseOps: OpSpec[] = [
  { conditions: pCond(), duration_min: 2, label: "rough" },
  {
    conditions: pCond({ Vc_m_min: 280, f_mm_rev: 0.12, ap_mm: 0.3 }),
    duration_min: 0.5,
    label: "finish",
  },
];

const baseInput: RobustOptimizerInput = {
  ops: baseOps,
  batch_size: 25,
  nominal_mm: 30,
  tolerance_mm: 0.05,
};

const ALL_DIMS = [
  "Vc_m_min",
  "f_mm_rev",
  "ap_mm",
  "vb_failure_um",
  "approach_angle_deg",
  "probe_interval",
];

describe("turning_robust_optimizer — MS5.2 capstone", () => {
  it("returns a valid best point and a grid of expected size", () => {
    const r = turningRobustOptimizerEngine.run({
      ...baseInput,
      grid_steps: 3,
      n_trials: 30,
      seed: 42,
    });
    expect(r.error).toBeUndefined();
    expect(r.grid?.length).toBe(9);
    expect(r.best_point).toBeDefined();
    expect(Number.isFinite(r.best_point!.p05)).toBe(true);
  });

  it("best_point.p05 is >= every candidate grid point's p05", () => {
    const r = turningRobustOptimizerEngine.run({
      ...baseInput,
      grid_steps: 3,
      n_trials: 40,
      seed: 7,
    });
    const floor = r.min_feasibility_rate!;
    const feasible = r.grid!.filter((g) => g.feasRate >= floor);
    const candidates = feasible.length > 0 ? feasible : r.grid!;
    for (const g of candidates) {
      expect(r.best_point!.p05).toBeGreaterThanOrEqual(g.p05);
    }
  });

  it("is reproducible under fixed seed (bit-exact grid + best point)", () => {
    const a = turningRobustOptimizerEngine.run({
      ...baseInput,
      grid_steps: 3,
      n_trials: 30,
      seed: 99,
    });
    const b = turningRobustOptimizerEngine.run({
      ...baseInput,
      grid_steps: 3,
      n_trials: 30,
      seed: 99,
    });
    expect(a.best_point!.p05).toBe(b.best_point!.p05);
    expect(a.best_point!.factors).toEqual(b.best_point!.factors);
    expect(a.top2_drivers).toEqual(b.top2_drivers);
    expect(a.grid).toEqual(b.grid);
  });

  it("selects exactly 2 distinct drivers from the 6-dim parameter set", () => {
    const r = turningRobustOptimizerEngine.run({
      ...baseInput,
      grid_steps: 3,
      n_trials: 25,
      seed: 3,
    });
    expect(r.top2_drivers).toHaveLength(2);
    for (const d of r.top2_drivers!) expect(ALL_DIMS).toContain(d);
    expect(r.top2_drivers![0]).not.toBe(r.top2_drivers![1]);
  });

  it("baseline point (factors = 1.0) appears in the grid at centre when steps is odd", () => {
    const r = turningRobustOptimizerEngine.run({
      ...baseInput,
      grid_steps: 5,
      n_trials: 25,
      seed: 11,
      adjust_range: 0.10,
    });
    const centre = r.grid!.find(
      (g) =>
        Math.abs(g.factors[r.top2_drivers![0]] - 1.0) < 1e-6 &&
        Math.abs(g.factors[r.top2_drivers![1]] - 1.0) < 1e-6,
    );
    expect(centre).toBeDefined();
  });

  it("wider adjust_range covers wider factor span", () => {
    const narrow = turningRobustOptimizerEngine.run({
      ...baseInput,
      grid_steps: 3,
      n_trials: 20,
      seed: 5,
      adjust_range: 0.05,
    });
    const wide = turningRobustOptimizerEngine.run({
      ...baseInput,
      grid_steps: 3,
      n_trials: 20,
      seed: 5,
      adjust_range: 0.25,
    });
    const spanOf = (r: ReturnType<typeof turningRobustOptimizerEngine.run>) => {
      if (!r.grid || !r.top2_drivers) return 0;
      const d = r.top2_drivers[0];
      const vals = r.grid.map((g) => g.factors[d]);
      return Math.max(...vals) - Math.min(...vals);
    };
    expect(spanOf(wide)).toBeGreaterThan(spanOf(narrow));
  });

  it("cpk_p05_lift is finite (best is argmax over feasible grid)", () => {
    const r = turningRobustOptimizerEngine.run({
      ...baseInput,
      grid_steps: 3,
      n_trials: 25,
      seed: 21,
    });
    expect(Number.isFinite(r.cpk_p05_lift ?? NaN)).toBe(true);
  });

  it("all grid points have P5 ≤ P50 ≤ P95 (quantile monotonicity)", () => {
    const r = turningRobustOptimizerEngine.run({
      ...baseInput,
      grid_steps: 3,
      n_trials: 30,
      seed: 31,
    });
    for (const g of r.grid!) {
      expect(g.p05).toBeLessThanOrEqual(g.p50);
      expect(g.p50).toBeLessThanOrEqual(g.p95);
    }
  });

  it("all grid points have feasRate ∈ [0,1]", () => {
    const r = turningRobustOptimizerEngine.run({
      ...baseInput,
      grid_steps: 3,
      n_trials: 30,
      seed: 43,
    });
    for (const g of r.grid!) {
      expect(g.feasRate).toBeGreaterThanOrEqual(0);
      expect(g.feasRate).toBeLessThanOrEqual(1);
    }
  });

  it("returns baseline infeasible error when conditions are impossible", () => {
    const r = turningRobustOptimizerEngine.run({
      ...baseInput,
      grid_steps: 3,
      n_trials: 10,
      seed: 1,
      reliability_threshold: 0.99999,
    });
    if (r.cpk_baseline === null) {
      expect(r.error).toBeDefined();
    } else {
      expect(Number.isFinite(r.cpk_baseline)).toBe(true);
    }
  });

  it("grid size equals grid_steps²", () => {
    const r = turningRobustOptimizerEngine.run({
      ...baseInput,
      grid_steps: 4,
      n_trials: 15,
      seed: 17,
    });
    expect(r.grid!.length).toBe(16);
  });

  it("top2 drivers remain valid across different op specs", () => {
    const r1 = turningRobustOptimizerEngine.run({
      ...baseInput,
      grid_steps: 3,
      n_trials: 15,
      seed: 1,
    });
    const r2 = turningRobustOptimizerEngine.run({
      ops: [
        { conditions: pCond({ iso_group: "M", Vc_m_min: 180 }), duration_min: 3, label: "rough" },
      ],
      batch_size: 50,
      nominal_mm: 50,
      tolerance_mm: 0.02,
      grid_steps: 3,
      n_trials: 15,
      seed: 1,
    });
    expect(r1.top2_drivers).toHaveLength(2);
    expect(r2.top2_drivers).toHaveLength(2);
  });

  it("best_point.factors has exactly 6 entries (all dims present)", () => {
    const r = turningRobustOptimizerEngine.run({
      ...baseInput,
      grid_steps: 3,
      n_trials: 20,
      seed: 77,
    });
    const keys = Object.keys(r.best_point!.factors);
    expect(keys).toHaveLength(6);
    expect(keys).toEqual(expect.arrayContaining(ALL_DIMS));
  });

  it("best_point's p05 matches the max p05 among feasible candidates", () => {
    const r = turningRobustOptimizerEngine.run({
      ...baseInput,
      grid_steps: 3,
      n_trials: 30,
      seed: 51,
    });
    const floor = r.min_feasibility_rate!;
    const feasible = r.grid!.filter((g) => g.feasRate >= floor);
    const pool = feasible.length > 0 ? feasible : r.grid!;
    const maxP05 = Math.max(...pool.map((g) => g.p05));
    expect(r.best_point!.p05).toBe(maxP05);
  });
});

describe("turning_robust_optimizer — MS5.3 envelope-aware augment", () => {
  const envelopeCtx = {
    material: "1045",
    iso_group: "P" as const,
    operation: "roughing" as const,
  };

  it("without envelope_context, envelope_used = false and no margin fields", () => {
    const r = turningRobustOptimizerEngine.run({
      ...baseInput,
      grid_steps: 3,
      n_trials: 25,
      seed: 1,
    });
    expect(r.envelope_used).toBe(false);
    expect(r.best_envelope_margin).toBeUndefined();
    expect(r.baseline_envelope_margin).toBeUndefined();
    for (const g of r.grid!) {
      expect(g.envelope_min_margin).toBeUndefined();
    }
  });

  it("with envelope_context, every grid point has envelope_min_margin", () => {
    const r = turningRobustOptimizerEngine.run({
      ...baseInput,
      grid_steps: 3,
      n_trials: 25,
      seed: 1,
      envelope_context: envelopeCtx,
    });
    expect(r.envelope_used).toBe(true);
    expect(r.best_envelope_margin).toBeDefined();
    expect(r.baseline_envelope_margin).toBeDefined();
    for (const g of r.grid!) {
      expect(g.envelope_min_margin).toBeDefined();
      expect(Number.isFinite(g.envelope_min_margin!)).toBe(true);
    }
  });

  it("envelope_weight = 0 gives same best_point as pure P5 ranking", () => {
    const pure = turningRobustOptimizerEngine.run({
      ...baseInput,
      grid_steps: 3,
      n_trials: 25,
      seed: 2,
    });
    const zeroWeight = turningRobustOptimizerEngine.run({
      ...baseInput,
      grid_steps: 3,
      n_trials: 25,
      seed: 2,
      envelope_context: envelopeCtx,
      envelope_weight: 0,
    });
    // Composite score reduces to p05 when weight = 0 → argmax identical
    expect(zeroWeight.best_point!.p05).toBe(pure.best_point!.p05);
    expect(zeroWeight.best_point!.factors).toEqual(pure.best_point!.factors);
  });

  it("positive envelope_weight can shift best_point toward higher margin", () => {
    // With a large weight, a point with slightly lower P5 but much higher
    // margin should win. We don't assert strict shift (landscape-dependent),
    // but we DO assert that score is monotone increasing in (p05, margin).
    const r = turningRobustOptimizerEngine.run({
      ...baseInput,
      grid_steps: 3,
      n_trials: 30,
      seed: 3,
      envelope_context: envelopeCtx,
      envelope_weight: 2.0,
    });
    for (const g of r.grid!) {
      expect(g.score).toBeCloseTo(
        Math.round((g.p05 + 2.0 * g.envelope_min_margin!) * 10000) / 10000,
        4,
      );
    }
    // best_point is argmax of score, not p05
    const maxScore = Math.max(...r.grid!.map((g) => g.score!));
    expect(r.best_point!.score).toBe(maxScore);
  });

  it("composite score is deterministic under fixed seed", () => {
    const a = turningRobustOptimizerEngine.run({
      ...baseInput,
      grid_steps: 3,
      n_trials: 25,
      seed: 77,
      envelope_context: envelopeCtx,
      envelope_weight: 1.5,
    });
    const b = turningRobustOptimizerEngine.run({
      ...baseInput,
      grid_steps: 3,
      n_trials: 25,
      seed: 77,
      envelope_context: envelopeCtx,
      envelope_weight: 1.5,
    });
    expect(a.best_point!.score).toBe(b.best_point!.score);
    expect(a.best_point!.envelope_min_margin).toBe(b.best_point!.envelope_min_margin);
    expect(a.best_envelope_margin).toBe(b.best_envelope_margin);
  });

  it("source string reflects envelope-aware mode when enabled", () => {
    const off = turningRobustOptimizerEngine.run({
      ...baseInput,
      grid_steps: 3,
      n_trials: 20,
      seed: 4,
    });
    const on = turningRobustOptimizerEngine.run({
      ...baseInput,
      grid_steps: 3,
      n_trials: 20,
      seed: 4,
      envelope_context: envelopeCtx,
    });
    expect(off.source).not.toContain("envelope");
    expect(on.source).toContain("envelope");
  });
});
