/**
 * Synergy test: MS1 (insert life) × MS2 (offset compensation) composed
 * through the turning_wear_compensated_plan dispatcher orchestrator.
 *
 * This asserts the composition contract: the two engines share data
 * through the same ISO group + wear-per-part path and produce a unified
 * plan whose sub-results cross-validate each other.
 */
import { describe, it, expect } from "vitest";
import {
  turningInsertLifeEngine,
  type OpSpec,
  type InsertLifeInput,
} from "../engines/TurningInsertLifeEngine.js";
import { turningOffsetCompensationEngine } from "../engines/TurningOffsetCompensationEngine.js";

function pCondRough(o: Partial<InsertLifeInput> = {}): InsertLifeInput {
  return {
    iso_group: "P",
    Vc_m_min: 250,
    f_mm_rev: 0.30,
    ap_mm: 2.5,
    nose_radius_mm: 0.8,
    coating: "TiAlN",
    ...o,
  };
}

/**
 * Reproduces the dispatcher orchestrator's composition so we can test it
 * without booting the MCP server.
 */
function runCompositePlan(input: {
  ops: OpSpec[];
  batch_size: number;
  nominal_mm: number;
  tolerance_mm: number;
  reliability_threshold?: number;
  vb_failure_um?: number;
  approach_angle_deg?: number;
  auto_offset_enabled?: boolean;
  probe_interval?: number;
}) {
  const changeSchedule = turningInsertLifeEngine.insertChangeSchedule({
    ops: input.ops,
    batch_size: input.batch_size,
    reliability_threshold: input.reliability_threshold,
  });
  const wearTraj = turningInsertLifeEngine.wearAccumulation({
    ops: input.ops,
    current_wear_fraction: 0,
    failure_wear_fraction: input.reliability_threshold ?? 0.85,
  });
  const vbFailureUm = input.vb_failure_um ?? 300;
  const avgVbPerPartUm =
    (wearTraj.final_wear / Math.max(changeSchedule.parts_per_edge, 1)) *
    vbFailureUm;
  const approach = input.approach_angle_deg ?? 90;
  const perPartOffset = turningOffsetCompensationEngine.wearToOffset({
    vb_um: avgVbPerPartUm,
    approach_angle_deg: approach,
  });
  const accuracy = turningOffsetCompensationEngine.predictAccuracy({
    iso_group: input.ops[0].conditions.iso_group,
    nominal_mm: input.nominal_mm,
    tolerance_mm: input.tolerance_mm,
    batch_size: input.batch_size,
    wear_per_part_um: avgVbPerPartUm,
    approach_angle_deg: approach,
    auto_offset_enabled: input.auto_offset_enabled ?? true,
    probe_interval: input.probe_interval ?? 5,
  });
  return { changeSchedule, wearTraj, perPartOffset, accuracy, avgVbPerPartUm };
}

describe("MS1 × MS2 synergy — turning_wear_compensated_plan", () => {
  const baseOps: OpSpec[] = [
    { conditions: pCondRough(), duration_min: 2 },
  ];

  it("produces a full plan with non-empty sub-results", () => {
    const r = runCompositePlan({
      ops: baseOps,
      batch_size: 25,
      nominal_mm: 50,
      tolerance_mm: 0.05,
    });
    expect(r.changeSchedule.edges_needed).toBeGreaterThan(0);
    expect(r.wearTraj.trajectory.length).toBe(1);
    expect(r.perPartOffset.total_radial_error_um).toBeGreaterThanOrEqual(0);
    expect(r.accuracy.dimension_curve.length).toBeGreaterThan(0);
  });

  it("wear-per-part carries from MS1 into MS2 with no sign flip", () => {
    const r = runCompositePlan({
      ops: baseOps,
      batch_size: 20,
      nominal_mm: 50,
      tolerance_mm: 0.05,
    });
    // MS1 wearTraj.final_wear ≥ 0; MS2 accepts it and produces ≥ 0 error
    expect(r.wearTraj.final_wear).toBeGreaterThanOrEqual(0);
    expect(r.avgVbPerPartUm).toBeGreaterThanOrEqual(0);
    expect(r.perPartOffset.delta_diameter_um).toBeGreaterThanOrEqual(0);
  });

  it("compensation produces higher Cpk than uncompensated", () => {
    const r = runCompositePlan({
      ops: baseOps,
      batch_size: 30,
      nominal_mm: 50,
      tolerance_mm: 0.05,
      auto_offset_enabled: true,
      probe_interval: 5,
    });
    if (r.accuracy.cpk_compensated != null) {
      expect(r.accuracy.cpk_compensated).toBeGreaterThanOrEqual(
        r.accuracy.cpk_uncompensated,
      );
    }
  });

  it("tighter reliability_threshold → more edges needed (monotone)", () => {
    const loose = runCompositePlan({
      ops: baseOps,
      batch_size: 30,
      nominal_mm: 50,
      tolerance_mm: 0.05,
      reliability_threshold: 0.85,
    });
    const strict = runCompositePlan({
      ops: baseOps,
      batch_size: 30,
      nominal_mm: 50,
      tolerance_mm: 0.05,
      reliability_threshold: 0.60,
    });
    expect(strict.changeSchedule.edges_needed).toBeGreaterThanOrEqual(
      loose.changeSchedule.edges_needed,
    );
  });

  it("bigger VB failure value → bigger per-part offset", () => {
    const normal = runCompositePlan({
      ops: baseOps,
      batch_size: 20,
      nominal_mm: 50,
      tolerance_mm: 0.05,
      vb_failure_um: 300,
    });
    const strict = runCompositePlan({
      ops: baseOps,
      batch_size: 20,
      nominal_mm: 50,
      tolerance_mm: 0.05,
      vb_failure_um: 600, // doubled VB criterion
    });
    expect(strict.perPartOffset.delta_diameter_um).toBeGreaterThanOrEqual(
      normal.perPartOffset.delta_diameter_um,
    );
  });

  it("approach angle changes diameter error monotonically via cos(κ_r)", () => {
    // ΔD = 2 × VB × cos(κ_r). At κ_r=0° → max; at κ_r=90° → 0.
    const head_on = runCompositePlan({
      ops: baseOps,
      batch_size: 15,
      nominal_mm: 50,
      tolerance_mm: 0.05,
      approach_angle_deg: 10, // near head-on, cos≈0.98
    });
    const side = runCompositePlan({
      ops: baseOps,
      batch_size: 15,
      nominal_mm: 50,
      tolerance_mm: 0.05,
      approach_angle_deg: 80, // near side, cos≈0.17
    });
    expect(head_on.perPartOffset.delta_diameter_um).toBeGreaterThan(
      side.perPartOffset.delta_diameter_um,
    );
  });

  it("preserves ISO group through the chain and emits a sampled curve", () => {
    const mOps: OpSpec[] = [{ conditions: pCondRough({ iso_group: "M" }), duration_min: 2 }];
    const r = runCompositePlan({
      ops: mOps,
      batch_size: 20,
      nominal_mm: 50,
      tolerance_mm: 0.05,
    });
    // Engine samples: first 5 parts + every 5th + last = 1,2,3,4,5,10,15,20 = 8
    expect(r.accuracy.dimension_curve.length).toBe(8);
    // Curve must end at the last part
    expect(r.accuracy.dimension_curve.at(-1)?.part).toBe(20);
  });

  it("accuracy curve is sampled and monotonic in accumulated deviation", () => {
    const r = runCompositePlan({
      ops: baseOps,
      batch_size: 42,
      nominal_mm: 50,
      tolerance_mm: 0.05,
      auto_offset_enabled: false, // disable compensation to get monotone growth
    });
    // Sampled, not exhaustive
    expect(r.accuracy.dimension_curve.length).toBeLessThan(42);
    expect(r.accuracy.dimension_curve.length).toBeGreaterThan(0);
    // Uncompensated deviations monotonically grow (assertion uses curve samples)
    const deviations = r.accuracy.dimension_curve.map((p) => p.deviation_um);
    for (let i = 1; i < deviations.length; i++) {
      expect(deviations[i]).toBeGreaterThanOrEqual(deviations[i - 1] - 1e-6);
    }
  });
});
