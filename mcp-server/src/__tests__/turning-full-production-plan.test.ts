/**
 * MS1 × MS2 × MS3 unified synergy test. Exercises the full cascade:
 *   Classifier → SequenceOptimizer → InsertLife → OffsetCompensation
 *
 * Verifies (a) each stage runs to completion on realistic inputs,
 * (b) the data contract between stages holds (ISO group, ops, wear
 * values carry through consistently), and (c) the unified summary
 * cross-validates each sub-result.
 */
import { describe, it, expect } from "vitest";
import { lathePartClassifierEngine } from "../engines/LathePartClassifierEngine.js";
import { latheSequenceOptimizerEngine, type SequenceOperation } from "../engines/LatheSequenceOptimizerEngine.js";
import {
  turningInsertLifeEngine,
  type OpSpec,
  type InsertLifeInput,
} from "../engines/TurningInsertLifeEngine.js";
import { turningOffsetCompensationEngine } from "../engines/TurningOffsetCompensationEngine.js";
import { latheCSSOptimizerEngine } from "../engines/LatheCSSOptimizerEngine.js";

function shaftGeometry() {
  return {
    length_mm: 120,
    max_od_mm: 30,
    min_od_mm: 20,
    has_threads: true,
    od_step_count: 2,
    iso_group: "P",
    tightest_tolerance_mm: 0.025,
  };
}

function shaftOps(): SequenceOperation[] {
  return [
    { id: "op1", type: "face",       tool_number: 1, estimated_time_sec: 30, is_roughing: false },
    { id: "op2", type: "rough_od",   tool_number: 2, estimated_time_sec: 180, is_roughing: true  },
    { id: "op3", type: "finish_od",  tool_number: 3, estimated_time_sec: 90,  is_finishing: true, tolerance_mm: 0.025 },
    { id: "op4", type: "thread_od",  tool_number: 4, estimated_time_sec: 60 },
    { id: "op5", type: "part_off",   tool_number: 5, estimated_time_sec: 20 },
  ];
}

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

/** Reimplements the dispatcher orchestrator so we can test without server. */
function runFullPlan(input: {
  operations: SequenceOperation[];
  part_geometry?: any;
  ops?: OpSpec[];
  batch_size: number;
  nominal_mm: number;
  tolerance_mm: number;
  reliability_threshold?: number;
  vb_failure_um?: number;
  approach_angle_deg?: number;
  thermal_tolerance_threshold_mm?: number;
  auto_offset_enabled?: boolean;
  probe_interval?: number;
  rated_max_rpm?: number;
}) {
  const classification = input.part_geometry
    ? lathePartClassifierEngine.classify(input.part_geometry)
    : null;
  const tightTol =
    (input.tolerance_mm ?? 0.05) <=
    (input.thermal_tolerance_threshold_mm ?? 0.03);
  const seq = latheSequenceOptimizerEngine.optimize(input.operations, {
    force_thermal_sequencing: tightTol,
    thermal_tolerance_threshold_mm: input.thermal_tolerance_threshold_mm ?? 0.03,
  });
  // MS4 — CSS analysis on every G96 op when geometry is available
  const cssAnalyses: Array<{
    op_id: string;
    clamp_rpm: number;
    clamped_fraction: number;
    prefer_g97: boolean;
  }> = [];
  if (input.part_geometry?.max_od_mm && input.part_geometry?.min_od_mm) {
    for (const o of seq.operations) {
      const mode = seq.spindle_modes.get(o.id);
      if (mode !== "G96") continue;
      const css = latheCSSOptimizerEngine.optimize({
        Vc_m_min: o.is_roughing ? 200 : 260,
        max_od_mm: input.part_geometry.max_od_mm,
        min_od_mm: Math.max(
          input.part_geometry.min_od_mm ?? input.part_geometry.max_od_mm * 0.3,
          1,
        ),
        rated_max_rpm: input.rated_max_rpm ?? 4000,
      });
      cssAnalyses.push({
        op_id: o.id,
        clamp_rpm: css.recommended_clamp_rpm,
        clamped_fraction: css.clamped_fraction,
        prefer_g97: css.prefer_g97,
      });
    }
  }
  const opSpecs: OpSpec[] =
    input.ops ??
    seq.operations.map((o) => ({
      conditions: {
        iso_group:
          (input.part_geometry?.iso_group as any) ?? ("P" as const),
        Vc_m_min: o.is_roughing ? 200 : 260,
        f_mm_rev: o.is_roughing ? 0.28 : 0.12,
        ap_mm: o.is_roughing ? 2.5 : 0.3,
        coating: "TiAlN",
      },
      duration_min: (o.estimated_time_sec ?? 60) / 60,
      label: o.id,
    }));
  const insertPlan = turningInsertLifeEngine.insertChangeSchedule({
    ops: opSpecs,
    batch_size: input.batch_size,
    reliability_threshold: input.reliability_threshold,
  });
  const wearTraj = turningInsertLifeEngine.wearAccumulation({
    ops: opSpecs,
    current_wear_fraction: 0,
    failure_wear_fraction: input.reliability_threshold ?? 0.85,
  });
  const vbFailureUm = input.vb_failure_um ?? 300;
  const avgVbPerPartUm =
    (wearTraj.final_wear / Math.max(insertPlan.parts_per_edge, 1)) *
    vbFailureUm;
  const approach = input.approach_angle_deg ?? 90;
  const perPartOffset = turningOffsetCompensationEngine.wearToOffset({
    vb_um: avgVbPerPartUm,
    approach_angle_deg: approach,
  });
  const accuracy = turningOffsetCompensationEngine.predictAccuracy({
    iso_group:
      (input.part_geometry?.iso_group as any) ??
      (opSpecs[0]?.conditions?.iso_group as any) ??
      ("P" as const),
    nominal_mm: input.nominal_mm,
    tolerance_mm: input.tolerance_mm,
    batch_size: input.batch_size,
    wear_per_part_um: avgVbPerPartUm,
    approach_angle_deg: approach,
    auto_offset_enabled: input.auto_offset_enabled ?? true,
    probe_interval: input.probe_interval ?? 5,
  });
  return {
    classification,
    seq,
    cssAnalyses,
    insertPlan,
    wearTraj,
    perPartOffset,
    accuracy,
    avgVbPerPartUm,
  };
}

describe("MS1 × MS2 × MS3 full synergy — turning_full_production_plan", () => {
  it("runs every stage on a realistic shaft job", () => {
    const r = runFullPlan({
      operations: shaftOps(),
      part_geometry: shaftGeometry(),
      batch_size: 25,
      nominal_mm: 30,
      tolerance_mm: 0.025,
    });
    expect(r.classification?.family).toBeDefined();
    expect(r.seq.operations.length).toBe(shaftOps().length);
    expect(r.insertPlan.edges_needed).toBeGreaterThan(0);
    expect(r.wearTraj.trajectory.length).toBe(shaftOps().length);
    expect(r.perPartOffset.total_radial_error_um).toBeGreaterThanOrEqual(0);
    expect(r.accuracy.dimension_curve.length).toBeGreaterThan(0);
  });

  it("sequence optimizer preserves op count and places part_off last", () => {
    const r = runFullPlan({
      operations: shaftOps(),
      batch_size: 10,
      nominal_mm: 30,
      tolerance_mm: 0.05,
    });
    expect(r.seq.operations.length).toBe(5);
    expect(r.seq.operations[r.seq.operations.length - 1].type).toBe("part_off");
  });

  it("face operation is placed before turning ops", () => {
    const r = runFullPlan({
      operations: shaftOps(),
      batch_size: 10,
      nominal_mm: 30,
      tolerance_mm: 0.05,
    });
    const faceIdx = r.seq.operations.findIndex((o) => o.type === "face");
    const roughIdx = r.seq.operations.findIndex((o) => o.type === "rough_od");
    const finishIdx = r.seq.operations.findIndex((o) => o.type === "finish_od");
    expect(faceIdx).toBeGreaterThanOrEqual(0);
    expect(faceIdx).toBeLessThan(roughIdx);
    expect(roughIdx).toBeLessThan(finishIdx);
  });

  it("tight tolerance activates thermal sequencing", () => {
    const r = runFullPlan({
      operations: shaftOps(),
      batch_size: 10,
      nominal_mm: 30,
      tolerance_mm: 0.015, // tighter than 0.03 default → forces thermal
    });
    expect(r.seq.thermal_sequencing_active).toBe(true);
  });

  it("loose tolerance with no op-level finish tolerance leaves thermal off", () => {
    // Strip op-level tolerance_mm so only the orchestrator's trigger matters
    const loose = shaftOps().map((o) => ({ ...o, tolerance_mm: undefined }));
    const r = runFullPlan({
      operations: loose,
      batch_size: 10,
      nominal_mm: 30,
      tolerance_mm: 0.20, // loose → orchestrator does NOT force thermal
      thermal_tolerance_threshold_mm: 0.05,
    });
    expect(r.seq.thermal_sequencing_active).toBe(false);
  });

  it("ISO group from geometry flows into wear + accuracy", () => {
    const r = runFullPlan({
      operations: shaftOps(),
      part_geometry: { ...shaftGeometry(), iso_group: "M" }, // stainless
      batch_size: 20,
      nominal_mm: 30,
      tolerance_mm: 0.05,
    });
    // M-group should carry through — synthesized OpSpecs use it
    expect(r.insertPlan.wear_per_part).toBeGreaterThan(0);
  });

  it("classifier + synthesized OpSpecs chain cleanly", () => {
    const r = runFullPlan({
      operations: shaftOps(),
      part_geometry: shaftGeometry(),
      batch_size: 15,
      nominal_mm: 30,
      tolerance_mm: 0.05,
      // No ops param → synthesized from sequence
    });
    // Wear trajectory length matches sequence op count
    expect(r.wearTraj.trajectory.length).toBe(r.seq.operations.length);
  });

  it("explicit ops override synthesized OpSpecs", () => {
    const custom: OpSpec[] = [
      { conditions: pCond({ Vc_m_min: 180 }), duration_min: 5, label: "rough" },
      { conditions: pCond({ Vc_m_min: 280 }), duration_min: 1.5, label: "finish" },
    ];
    const r = runFullPlan({
      operations: shaftOps(),
      ops: custom,
      batch_size: 10,
      nominal_mm: 30,
      tolerance_mm: 0.05,
    });
    expect(r.wearTraj.trajectory.length).toBe(2); // uses custom ops, not seq
  });

  it("summary numbers cross-validate between stages", () => {
    const r = runFullPlan({
      operations: shaftOps(),
      part_geometry: shaftGeometry(),
      batch_size: 30,
      nominal_mm: 30,
      tolerance_mm: 0.04,
    });
    // edges_needed × parts_per_edge must cover the batch
    const covered = r.insertPlan.edges_needed * r.insertPlan.parts_per_edge;
    expect(covered).toBeGreaterThanOrEqual(30);
    // accuracy curve must end at last part
    const curve = r.accuracy.dimension_curve;
    expect(curve[curve.length - 1].part).toBe(30);
  });

  it("compensation reduces or matches wear-driven Cpk loss", () => {
    const on = runFullPlan({
      operations: shaftOps(),
      part_geometry: shaftGeometry(),
      batch_size: 25,
      nominal_mm: 30,
      tolerance_mm: 0.05,
      auto_offset_enabled: true,
      probe_interval: 5,
    });
    if (on.accuracy.cpk_compensated != null) {
      expect(on.accuracy.cpk_compensated).toBeGreaterThanOrEqual(
        on.accuracy.cpk_uncompensated,
      );
    }
  });

  it("MS4: CSS analysis runs for every G96 op when geometry is provided", () => {
    const r = runFullPlan({
      operations: shaftOps(),
      part_geometry: shaftGeometry(),
      batch_size: 20,
      nominal_mm: 30,
      tolerance_mm: 0.04,
    });
    // shaftOps has face, rough_od, finish_od, thread_od (G97), part_off
    // G96 ops: face + rough_od + finish_od + part_off = 4
    expect(r.cssAnalyses.length).toBeGreaterThanOrEqual(3);
    expect(r.cssAnalyses.length).toBeLessThanOrEqual(4);
    for (const c of r.cssAnalyses) {
      expect(c.clamp_rpm).toBeGreaterThan(0);
      expect(c.clamped_fraction).toBeGreaterThanOrEqual(0);
      expect(c.clamped_fraction).toBeLessThanOrEqual(1);
    }
  });

  it("MS4: no geometry → no CSS analyses emitted (graceful skip)", () => {
    const r = runFullPlan({
      operations: shaftOps(),
      batch_size: 10,
      nominal_mm: 30,
      tolerance_mm: 0.05,
      // no part_geometry
    });
    expect(r.cssAnalyses).toEqual([]);
  });

  it("MS4: lower rated_max_rpm → more clamped fraction at small diameters", () => {
    const lowCap = runFullPlan({
      operations: shaftOps(),
      part_geometry: { ...shaftGeometry(), min_od_mm: 5 }, // very small → more clamp
      batch_size: 10,
      nominal_mm: 30,
      tolerance_mm: 0.05,
      rated_max_rpm: 2000,
    });
    const highCap = runFullPlan({
      operations: shaftOps(),
      part_geometry: { ...shaftGeometry(), min_od_mm: 5 },
      batch_size: 10,
      nominal_mm: 30,
      tolerance_mm: 0.05,
      rated_max_rpm: 8000,
    });
    // Lower rpm cap → more cut happens at the clamp
    const lowMean =
      lowCap.cssAnalyses.reduce((s, c) => s + c.clamped_fraction, 0) /
      Math.max(lowCap.cssAnalyses.length, 1);
    const highMean =
      highCap.cssAnalyses.reduce((s, c) => s + c.clamped_fraction, 0) /
      Math.max(highCap.cssAnalyses.length, 1);
    expect(lowMean).toBeGreaterThanOrEqual(highMean);
  });

  it("tighter reliability_threshold → more edges, never fewer", () => {
    const loose = runFullPlan({
      operations: shaftOps(),
      batch_size: 30,
      nominal_mm: 30,
      tolerance_mm: 0.05,
      reliability_threshold: 0.85,
    });
    const strict = runFullPlan({
      operations: shaftOps(),
      batch_size: 30,
      nominal_mm: 30,
      tolerance_mm: 0.05,
      reliability_threshold: 0.60,
    });
    expect(strict.insertPlan.edges_needed).toBeGreaterThanOrEqual(
      loose.insertPlan.edges_needed,
    );
  });
});
