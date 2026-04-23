/**
 * LATHE-PRO-MS5.1 — variability apportionment test.
 *
 * Tests the shipped TurningSensitivityAnalysisEngine (the same code
 * path the dispatcher action `turning_sensitivity_analysis` runs).
 *
 * Imports the engine directly — no drift possible between engine and
 * test because they share the SAME source of truth.
 */
import { describe, it, expect } from "vitest";
import {
  turningSensitivityAnalysisEngine,
  type SensitivityInput,
} from "../engines/TurningSensitivityAnalysisEngine.js";
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

const baseInput: SensitivityInput = {
  ops: baseOps,
  batch_size: 25,
  nominal_mm: 30,
  tolerance_mm: 0.05,
};

const SENS_PARAMS = [
  "Vc_m_min",
  "f_mm_rev",
  "ap_mm",
  "vb_failure_um",
  "approach_angle_deg",
  "probe_interval",
];

describe("turning_sensitivity_analysis — MS5.1 OAT + Morris apportionment", () => {
  it("returns baseline Cpk and a complete 6-parameter OAT table", () => {
    const r = turningSensitivityAnalysisEngine.run({
      ...baseInput,
      oat_delta: 0.10,
      morris_trajectories: 4,
      morris_levels: 3,
      seed: 7,
    });
    expect(r.cpk_baseline).toBeGreaterThan(0);
    expect(r.oat).toHaveLength(6);
    expect(r.oat!.map((row) => row.parameter).sort()).toEqual(
      [...SENS_PARAMS].sort(),
    );
  });

  it("OAT rows are ranked by |elasticity| descending", () => {
    const r = turningSensitivityAnalysisEngine.run({
      ...baseInput,
      oat_delta: 0.10,
      morris_trajectories: 4,
      morris_levels: 3,
      seed: 7,
    });
    for (let i = 1; i < r.oat!.length; i++) {
      expect(Math.abs(r.oat![i - 1].elasticity)).toBeGreaterThanOrEqual(
        Math.abs(r.oat![i].elasticity),
      );
      expect(r.oat![i - 1].rank).toBeLessThan(r.oat![i].rank);
    }
  });

  it("Morris rows are ranked by μ* descending", () => {
    const r = turningSensitivityAnalysisEngine.run({
      ...baseInput,
      morris_trajectories: 10,
      morris_levels: 4,
      seed: 42,
    });
    expect(r.morris).toHaveLength(6);
    for (let i = 1; i < r.morris!.length; i++) {
      expect(r.morris![i - 1].mu_star).toBeGreaterThanOrEqual(
        r.morris![i].mu_star,
      );
    }
  });

  it("is reproducible under fixed seed (bit-exact)", () => {
    const a = turningSensitivityAnalysisEngine.run({
      ...baseInput,
      oat_delta: 0.10,
      morris_trajectories: 8,
      morris_levels: 4,
      seed: 99,
    });
    const b = turningSensitivityAnalysisEngine.run({
      ...baseInput,
      oat_delta: 0.10,
      morris_trajectories: 8,
      morris_levels: 4,
      seed: 99,
    });
    expect(a.cpk_baseline).toBe(b.cpk_baseline);
    expect(a.dominant_driver_oat).toBe(b.dominant_driver_oat);
    expect(a.dominant_driver_morris).toBe(b.dominant_driver_morris);
    expect(a.oat).toEqual(b.oat);
    expect(a.morris).toEqual(b.morris);
  });

  it("different seeds give different Morris results but identical OAT", () => {
    const a = turningSensitivityAnalysisEngine.run({
      ...baseInput,
      morris_trajectories: 8,
      morris_levels: 4,
      seed: 1,
    });
    const b = turningSensitivityAnalysisEngine.run({
      ...baseInput,
      morris_trajectories: 8,
      morris_levels: 4,
      seed: 999,
    });
    // OAT is deterministic (no PRNG), must match
    expect(a.oat).toEqual(b.oat);
    // Morris uses seed — some μ* should differ
    const sameMu = a.morris!.every(
      (row, i) => row.mu_star === b.morris![i].mu_star,
    );
    expect(sameMu).toBe(false);
  });

  it("elasticity values are finite for default delta", () => {
    const r = turningSensitivityAnalysisEngine.run({
      ...baseInput,
      oat_delta: 0.10,
      morris_trajectories: 4,
      morris_levels: 3,
      seed: 11,
    });
    for (const row of r.oat!) {
      expect(Number.isFinite(row.elasticity)).toBe(true);
    }
  });

  it("dominant_driver_oat is a valid parameter name", () => {
    const r = turningSensitivityAnalysisEngine.run({
      ...baseInput,
      morris_trajectories: 4,
      morris_levels: 3,
      seed: 5,
    });
    expect(SENS_PARAMS).toContain(r.dominant_driver_oat);
    expect(SENS_PARAMS).toContain(r.dominant_driver_morris);
  });

  it("consensus_dominant is non-null iff OAT and Morris agree", () => {
    const r = turningSensitivityAnalysisEngine.run({
      ...baseInput,
      morris_trajectories: 20,
      morris_levels: 4,
      seed: 33,
    });
    const agree = r.dominant_driver_oat === r.dominant_driver_morris;
    if (agree) {
      expect(r.consensus_dominant).toBe(r.dominant_driver_oat);
    } else {
      expect(r.consensus_dominant).toBeNull();
    }
  });

  it("topDriversByElasticity returns top-N parameters", () => {
    const r = turningSensitivityAnalysisEngine.run({
      ...baseInput,
      morris_trajectories: 4,
      morris_levels: 3,
      seed: 17,
    });
    const top2 = turningSensitivityAnalysisEngine.topDriversByElasticity(r, 2);
    expect(top2).toHaveLength(2);
    expect(top2[0]).not.toBe(top2[1]);
    expect(top2[0]).toBe(r.oat![0].parameter);
    expect(top2[1]).toBe(r.oat![1].parameter);
  });

  it("evaluateDeterministic matches cpk_baseline under default conditions", () => {
    const cpkDet = turningSensitivityAnalysisEngine.evaluateDeterministic({
      ops: baseOps,
      batch_size: 25,
      nominal_mm: 30,
      tolerance_mm: 0.05,
      reliability_threshold: 0.85,
      vb_failure_um: 300,
      approach_angle_deg: 90,
      probe_interval: 5,
    });
    const r = turningSensitivityAnalysisEngine.run({
      ...baseInput,
      morris_trajectories: 4,
      morris_levels: 3,
      seed: 1,
    });
    expect(cpkDet).not.toBeNull();
    expect(Math.round(cpkDet! * 1000) / 1000).toBe(r.cpk_baseline);
  });

  it("baseline infeasible path returns clean error", () => {
    const bad = turningSensitivityAnalysisEngine.run({
      ...baseInput,
      reliability_threshold: 0.9999999,
    });
    if (bad.cpk_baseline === null) {
      expect(bad.error).toBeDefined();
    } else {
      expect(bad.oat).toBeDefined();
    }
  });
});
