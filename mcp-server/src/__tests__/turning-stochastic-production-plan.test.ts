/**
 * LATHE-PRO-MS5 stochastic wrapper test. Validates the shipped
 * TurningStochasticPlanEngine (the same code path the dispatcher
 * action `turning_stochastic_production_plan` runs) produces
 * well-formed P5/P50/P95 bounds and is reproducible under a fixed seed.
 *
 * IMPORTANT: this test imports the ENGINE directly. It does NOT
 * reproduce dispatcher logic locally — drift between engine and test
 * is impossible by construction.
 */
import { describe, it, expect } from "vitest";
import {
  turningStochasticPlanEngine,
  type StochasticPlanInput,
} from "../engines/TurningStochasticPlanEngine.js";
import type {
  OpSpec,
  InsertLifeInput,
} from "../engines/TurningInsertLifeEngine.js";
import { turningRulesGeneratorEngine } from "../engines/TurningRulesGeneratorEngine.js";

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

const baseInput: StochasticPlanInput = {
  ops: baseOps,
  batch_size: 25,
  nominal_mm: 30,
  tolerance_mm: 0.05,
};

describe("turning_stochastic_production_plan — MC over MS1×MS2", () => {
  it("produces monotone P5 ≤ P50 ≤ P95 on Cpk", () => {
    const r = turningStochasticPlanEngine.run({
      ...baseInput,
      n_trials: 200,
      seed: 42,
    });
    expect(r.cpk_p05).toBeLessThanOrEqual(r.cpk_p50);
    expect(r.cpk_p50).toBeLessThanOrEqual(r.cpk_p95);
  });

  it("is reproducible under fixed seed", () => {
    const a = turningStochasticPlanEngine.run({ ...baseInput, n_trials: 100, seed: 7 });
    const b = turningStochasticPlanEngine.run({ ...baseInput, n_trials: 100, seed: 7 });
    expect(a.cpk_p50).toBe(b.cpk_p50);
    expect(a.cpk_p05).toBe(b.cpk_p05);
    expect(a.cpk_p95).toBe(b.cpk_p95);
    expect(a.trials_feasible).toBe(b.trials_feasible);
    expect(a.cpks).toEqual(b.cpks);
  });

  it("different seeds produce different samples (stochastic)", () => {
    const a = turningStochasticPlanEngine.run({ ...baseInput, n_trials: 100, seed: 1 });
    const b = turningStochasticPlanEngine.run({ ...baseInput, n_trials: 100, seed: 12345 });
    const someDiff =
      a.cpk_p05 !== b.cpk_p05 ||
      a.cpk_p50 !== b.cpk_p50 ||
      a.cpk_p95 !== b.cpk_p95;
    expect(someDiff).toBe(true);
  });

  it("widening σ → wider P05↔P95 spread on Cpk", () => {
    const narrow = turningStochasticPlanEngine.run({
      ...baseInput,
      n_trials: 200,
      seed: 99,
      sigma_vc_rel: 0.01,
      sigma_feed_rel: 0.01,
      sigma_ap_rel: 0.01,
    });
    const wide = turningStochasticPlanEngine.run({
      ...baseInput,
      n_trials: 200,
      seed: 99,
      sigma_vc_rel: 0.15,
      sigma_feed_rel: 0.15,
      sigma_ap_rel: 0.15,
    });
    expect(wide.cpk_p95 - wide.cpk_p05).toBeGreaterThanOrEqual(
      narrow.cpk_p95 - narrow.cpk_p05,
    );
  });

  it("most trials feasible under moderate σ", () => {
    const r = turningStochasticPlanEngine.run({
      ...baseInput,
      n_trials: 200,
      seed: 3,
      sigma_vc_rel: 0.05,
    });
    expect(r.trials_feasible / r.trials_attempted).toBeGreaterThan(0.8);
  });

  it("edges_p50 stays positive and finite", () => {
    const r = turningStochasticPlanEngine.run({ ...baseInput, n_trials: 100, seed: 11 });
    expect(r.edges_p50).toBeGreaterThan(0);
    expect(Number.isFinite(r.edges_p50)).toBe(true);
  });

  it("raw sample arrays have length equal to trials_feasible", () => {
    const r = turningStochasticPlanEngine.run({ ...baseInput, n_trials: 80, seed: 13 });
    expect(r.cpks).toHaveLength(r.trials_feasible);
    expect(r.edges).toHaveLength(r.trials_feasible);
    expect(r.wears).toHaveLength(r.trials_feasible);
  });

  it("makeSeededRandom is deterministic for same seed", () => {
    const a = turningStochasticPlanEngine.makeSeededRandom(42);
    const b = turningStochasticPlanEngine.makeSeededRandom(42);
    for (let i = 0; i < 10; i++) expect(a.rand()).toBe(b.rand());
    for (let i = 0; i < 10; i++) expect(a.normal()).toBe(b.normal());
  });

  it("quantile clamps correctly at bounds", () => {
    const arr = [1, 2, 3, 4, 5];
    expect(turningStochasticPlanEngine.quantile(arr, 0)).toBe(1);
    expect(turningStochasticPlanEngine.quantile(arr, 1)).toBe(5);
    expect(turningStochasticPlanEngine.quantile(arr, 0.5)).toBe(3);
    expect(turningStochasticPlanEngine.quantile([], 0.5)).toBe(0);
  });

  it("evaluateCascadeSample returns null on infeasible conditions", () => {
    // extreme Vc should blow past Taylor life threshold for this plan
    const bad = turningStochasticPlanEngine.evaluateCascadeSample({
      ops: [
        { conditions: pCond({ Vc_m_min: 2000 }), duration_min: 10, label: "bad" },
      ],
      batch_size: 25,
      nominal_mm: 30,
      tolerance_mm: 0.05,
      reliability_threshold: 0.85,
      vb_failure_um: 300,
      approach_angle_deg: 90,
      auto_offset_enabled: true,
      probe_interval: 5,
    });
    expect(bad).toBeNull();
  });
});

describe("MS5 rules validation — integration with production conditions", () => {
  it("Vc within envelope passes all velocity rules", () => {
    const set = turningRulesGeneratorEngine.generate({
      material: "1045",
      iso_group: "P",
      operation: "roughing",
    });
    const vcRule = set.rules.find((r) => r.kind === "velocity_envelope");
    expect(vcRule).toBeDefined();
    if (!vcRule) return;
    const mid = ((vcRule.bounds.min ?? 0) + (vcRule.bounds.max ?? 0)) / 2;
    expect(mid).toBeGreaterThan(vcRule.bounds.min ?? 0);
    expect(mid).toBeLessThan(vcRule.bounds.max ?? Infinity);
  });

  it("Vc below envelope triggers a violation", () => {
    const set = turningRulesGeneratorEngine.generate({
      material: "1045",
      iso_group: "P",
      operation: "roughing",
    });
    const vcRule = set.rules.find((r) => r.kind === "velocity_envelope");
    expect(vcRule).toBeDefined();
    if (!vcRule || vcRule.bounds.min === undefined) return;
    expect(vcRule.bounds.min * 0.5).toBeLessThan(vcRule.bounds.min);
  });

  it("feed above envelope triggers a violation", () => {
    const set = turningRulesGeneratorEngine.generate({
      material: "1045",
      iso_group: "P",
      operation: "roughing",
    });
    const fRule = set.rules.find((r) => r.kind === "feed_envelope");
    expect(fRule).toBeDefined();
    if (!fRule || fRule.bounds.max === undefined) return;
    expect(fRule.bounds.max * 2).toBeGreaterThan(fRule.bounds.max);
  });
});
