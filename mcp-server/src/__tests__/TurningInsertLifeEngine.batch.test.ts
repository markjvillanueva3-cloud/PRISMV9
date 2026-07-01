/**
 * TurningInsertLifeEngine — batchLifePlan / wearAccumulation /
 * insertChangeSchedule tests (LATHE-PRO-MS1 wiring unit).
 *
 * Focuses on the 3 new batch/wear/scheduling methods. The predictLife
 * path is covered by TurningInsertLifeEngine.test.ts.
 */
import { describe, it, expect } from "vitest";
import {
  turningInsertLifeEngine,
  type InsertLifeInput,
  type OpSpec,
} from "../engines/TurningInsertLifeEngine.js";

function roughingConditions(
  overrides: Partial<InsertLifeInput> = {},
): InsertLifeInput {
  return {
    iso_group: "P",
    Vc_m_min: 250,
    f_mm_rev: 0.30,
    ap_mm: 2.5,
    nose_radius_mm: 0.8,
    coating: "TiAlN",
    ...overrides,
  };
}

function finishConditions(
  overrides: Partial<InsertLifeInput> = {},
): InsertLifeInput {
  return {
    iso_group: "P",
    Vc_m_min: 280,
    f_mm_rev: 0.12,
    ap_mm: 0.4,
    nose_radius_mm: 0.4,
    coating: "TiAlN",
    ...overrides,
  };
}

describe("TurningInsertLifeEngine.batchLifePlan", () => {
  it("returns a single insert when batch wear stays below threshold", () => {
    const ops: OpSpec[] = [
      { conditions: finishConditions(), duration_min: 0.5, label: "finish" },
    ];
    const plan = turningInsertLifeEngine.batchLifePlan({
      ops,
      batch_size: 3,
      reliability_threshold: 0.85,
    });
    expect(plan.inserts_used).toBe(1);
    expect(plan.change_points).toHaveLength(0);
    expect(plan.final_wear_fraction).toBeGreaterThan(0);
    expect(plan.final_wear_fraction).toBeLessThan(0.85);
  });

  it("schedules at least one change when cumulative wear crosses threshold", () => {
    const ops: OpSpec[] = [
      { conditions: roughingConditions(), duration_min: 4.0 },
    ];
    const plan = turningInsertLifeEngine.batchLifePlan({
      ops,
      batch_size: 20,
      reliability_threshold: 0.85,
    });
    expect(plan.inserts_used).toBeGreaterThan(1);
    expect(plan.change_points.length).toBe(plan.inserts_used - 1);
    for (const cp of plan.change_points) {
      expect(cp.cumulative_wear).toBeGreaterThanOrEqual(0.85);
    }
  });

  it("computes cost when insert_cost_usd_per_edge is supplied", () => {
    const ops: OpSpec[] = [{ conditions: roughingConditions(), duration_min: 3 }];
    const plan = turningInsertLifeEngine.batchLifePlan({
      ops,
      batch_size: 10,
      insert_cost_usd_per_edge: 12.5,
    });
    expect(plan.cost_usd).toBeCloseTo(plan.inserts_used * 12.5, 2);
  });

  it("throws on empty ops", () => {
    expect(() =>
      turningInsertLifeEngine.batchLifePlan({ ops: [], batch_size: 1 }),
    ).toThrow(/ops required/);
  });

  it("throws on zero batch size", () => {
    expect(() =>
      turningInsertLifeEngine.batchLifePlan({
        ops: [{ conditions: roughingConditions(), duration_min: 1 }],
        batch_size: 0,
      }),
    ).toThrow(/batch_size must be a positive integer/);
  });

  it("throws on out-of-range reliability threshold", () => {
    expect(() =>
      turningInsertLifeEngine.batchLifePlan({
        ops: [{ conditions: roughingConditions(), duration_min: 1 }],
        batch_size: 1,
        reliability_threshold: 1.2,
      }),
    ).toThrow(/reliability_threshold/);
  });

  it("respects operation order when summing wear per part", () => {
    const ops: OpSpec[] = [
      { conditions: roughingConditions(), duration_min: 2, label: "rough" },
      { conditions: finishConditions(), duration_min: 0.5, label: "finish" },
    ];
    const plan = turningInsertLifeEngine.batchLifePlan({ ops, batch_size: 2 });
    expect(plan.ops_per_part).toBe(2);
    expect(plan.wear_per_part).toBeGreaterThan(0);
  });

  it("monotonically increases inserts_used with batch size at fixed conditions", () => {
    const ops: OpSpec[] = [{ conditions: roughingConditions(), duration_min: 3 }];
    const small = turningInsertLifeEngine.batchLifePlan({ ops, batch_size: 5 });
    const large = turningInsertLifeEngine.batchLifePlan({ ops, batch_size: 50 });
    expect(large.inserts_used).toBeGreaterThanOrEqual(small.inserts_used);
  });
});

describe("TurningInsertLifeEngine.wearAccumulation", () => {
  it("accumulates wear across ops from a fresh edge", () => {
    const ops: OpSpec[] = [
      { conditions: roughingConditions(), duration_min: 1 },
      { conditions: roughingConditions(), duration_min: 1 },
    ];
    const r = turningInsertLifeEngine.wearAccumulation({ ops });
    expect(r.start_wear).toBe(0);
    expect(r.final_wear).toBeGreaterThan(0);
    expect(r.trajectory).toHaveLength(2);
    expect(r.trajectory[1].cumulative_wear).toBeGreaterThan(
      r.trajectory[0].cumulative_wear,
    );
  });

  it("honors the starting wear fraction", () => {
    const ops: OpSpec[] = [{ conditions: finishConditions(), duration_min: 0.2 }];
    const a = turningInsertLifeEngine.wearAccumulation({
      ops,
      current_wear_fraction: 0,
    });
    const b = turningInsertLifeEngine.wearAccumulation({
      ops,
      current_wear_fraction: 0.4,
    });
    expect(b.final_wear).toBeGreaterThan(a.final_wear);
    expect(b.final_wear - a.final_wear).toBeCloseTo(0.4, 5);
  });

  it("flags first_failure_op_index when a long op exhausts the remaining life", () => {
    const ops: OpSpec[] = [
      { conditions: roughingConditions(), duration_min: 30 },
    ];
    const r = turningInsertLifeEngine.wearAccumulation({
      ops,
      current_wear_fraction: 0.9,
      failure_wear_fraction: 1.0,
    });
    expect(r.will_exceed).toBe(true);
    expect(r.first_failure_op_index).toBe(0);
    expect(r.time_until_failure_min).not.toBeNull();
    expect(r.time_until_failure_min).toBeGreaterThanOrEqual(0);
  });

  it("never reports failure when wear stays below threshold", () => {
    const ops: OpSpec[] = [
      { conditions: finishConditions(), duration_min: 0.2 },
    ];
    const r = turningInsertLifeEngine.wearAccumulation({
      ops,
      current_wear_fraction: 0,
      failure_wear_fraction: 1.0,
    });
    expect(r.will_exceed).toBe(false);
    expect(r.first_failure_op_index).toBeNull();
    expect(r.time_until_failure_min).toBeNull();
  });

  it("throws on invalid current_wear_fraction", () => {
    expect(() =>
      turningInsertLifeEngine.wearAccumulation({
        ops: [{ conditions: finishConditions(), duration_min: 1 }],
        current_wear_fraction: 1.5,
      }),
    ).toThrow(/current_wear_fraction/);
  });

  it("throws on negative duration", () => {
    expect(() =>
      turningInsertLifeEngine.wearAccumulation({
        ops: [{ conditions: finishConditions(), duration_min: -1 }],
      }),
    ).toThrow(/duration_min must be > 0/);
  });
});

describe("TurningInsertLifeEngine.insertChangeSchedule", () => {
  it("computes parts_per_edge and edges_needed for a simple batch", () => {
    const ops: OpSpec[] = [{ conditions: roughingConditions(), duration_min: 2 }];
    const s = turningInsertLifeEngine.insertChangeSchedule({
      ops,
      batch_size: 25,
      reliability_threshold: 0.85,
    });
    expect(s.parts_per_edge).toBeGreaterThan(0);
    expect(s.edges_needed).toBeGreaterThanOrEqual(1);
    expect(s.schedule.length).toBe(s.edges_needed);
    const totalParts = s.schedule.reduce((sum, e) => sum + e.parts_on_edge, 0);
    expect(totalParts).toBe(25);
  });

  it("never lets a single edge carry more than {threshold} wear", () => {
    // Derive the per-part duration from the ACTUAL predicted life so wear_per_part
    // stays a safe fraction below the threshold. This keeps the batch schedulable
    // (multiple parts per edge) and robust to predictLife re-calibration: a fixed
    // 3-min part exceeds an aggressive ~3-min insert life (wear_per_part > 0.80),
    // which is infeasible by construction and would correctly throw.
    const lifeMin = turningInsertLifeEngine.predictLife(roughingConditions()).tool_life_min;
    const ops: OpSpec[] = [
      { conditions: roughingConditions(), duration_min: lifeMin * 0.3 },
    ];
    const s = turningInsertLifeEngine.insertChangeSchedule({
      ops,
      batch_size: 40,
      reliability_threshold: 0.80,
    });
    expect(s.schedule.length).toBeGreaterThan(0);
    for (const e of s.schedule) {
      expect(e.final_wear).toBeLessThanOrEqual(0.80 + 1e-9);
    }
  });

  it("edges have non-overlapping, contiguous part ranges covering the batch", () => {
    const ops: OpSpec[] = [{ conditions: roughingConditions(), duration_min: 2.5 }];
    const s = turningInsertLifeEngine.insertChangeSchedule({
      ops,
      batch_size: 30,
    });
    let expectedStart = 0;
    for (const e of s.schedule) {
      expect(e.starts_at_part).toBe(expectedStart);
      expect(e.ends_at_part).toBe(expectedStart + e.parts_on_edge - 1);
      expectedStart = e.ends_at_part + 1;
    }
    expect(expectedStart).toBe(30);
  });

  it("utilization stays within (0, 100] and reflects packing efficiency", () => {
    const ops: OpSpec[] = [{ conditions: roughingConditions(), duration_min: 2 }];
    const s = turningInsertLifeEngine.insertChangeSchedule({ ops, batch_size: 30 });
    expect(s.utilization_pct).toBeGreaterThan(0);
    expect(s.utilization_pct).toBeLessThanOrEqual(100);
  });

  it("throws when a single part would exceed the reliability threshold", () => {
    // Burn through most of the insert life within one part so the engine
    // rejects the batch as impossible with the given threshold
    const heavy: InsertLifeInput = {
      iso_group: "P",
      Vc_m_min: 300,
      f_mm_rev: 0.35,
      ap_mm: 3.0,
      coating: "TiAlN",
    };
    const lifeMin = turningInsertLifeEngine.predictLife(heavy).tool_life_min;
    // Pick a duration that makes wear_per_part ~0.95 (≥ 1.0 → safer throw)
    expect(() =>
      turningInsertLifeEngine.insertChangeSchedule({
        ops: [{ conditions: heavy, duration_min: lifeMin * 1.1 }],
        batch_size: 5,
        reliability_threshold: 0.85,
      }),
    ).toThrow(/cannot fit on a single edge|exceeds threshold/);
  });

  it("returns exactly ceil(batch / parts_per_edge) edges", () => {
    const ops: OpSpec[] = [{ conditions: roughingConditions(), duration_min: 2 }];
    const s = turningInsertLifeEngine.insertChangeSchedule({
      ops,
      batch_size: 27,
      reliability_threshold: 0.85,
    });
    const expected = Math.ceil(27 / s.parts_per_edge);
    expect(s.edges_needed).toBe(expected);
  });
});
