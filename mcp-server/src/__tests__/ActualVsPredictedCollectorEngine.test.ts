/**
 * ActualVsPredictedCollectorEngine Tests (U-MIO31A)
 * =================================================
 * Covers: ring buffer, JM DIE 2× weighting, residual stats,
 * batch emission, accuracy trend detection, edge cases.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  ActualVsPredictedCollectorEngine,
  type ObservationInput,
  type NeuralTarget,
} from "../engines/ActualVsPredictedCollectorEngine.js";

function makeObs(overrides: Partial<ObservationInput> = {}): ObservationInput {
  return {
    job_id: "J-1001",
    context: { material: "D2", iso_group: "H" },
    targets: {
      cutting_force_n: { predicted: 500, actual: 520 },
    },
    ...overrides,
  };
}

describe("ActualVsPredictedCollectorEngine — record()", () => {
  let engine: ActualVsPredictedCollectorEngine;
  beforeEach(() => { engine = new ActualVsPredictedCollectorEngine(); });

  it("records a valid single observation", () => {
    const ex = engine.record(makeObs());
    expect(ex.observation_id).toBeDefined();
    expect(ex.labels.cutting_force_n).toBe(520);
    expect(ex.predictions.cutting_force_n).toBe(500);
    expect(ex.residuals.cutting_force_n).toBe(20);
    expect(ex.weight).toBe(1.0);
    expect(ex.jm_die_proven).toBe(false);
    expect(engine.size).toBe(1);
  });

  it("applies 2× weight when jm_die_proven=true", () => {
    const ex = engine.record(makeObs({ jm_die_proven: true }));
    expect(ex.weight).toBe(2.0);
    expect(ex.jm_die_proven).toBe(true);
  });

  it("uses custom proven_program_weight from config", () => {
    const custom = new ActualVsPredictedCollectorEngine({ proven_program_weight: 3.5 });
    const ex = custom.record(makeObs({ jm_die_proven: true }));
    expect(ex.weight).toBe(3.5);
  });

  it("skips invalid (non-finite) target pairs", () => {
    const ex = engine.record({
      job_id: "J-2",
      context: { material: "D2" },
      targets: {
        cutting_force_n: { predicted: 500, actual: 520 },
        power_kw: { predicted: NaN, actual: 5 },
        temperature_c: { predicted: 100, actual: Infinity },
      },
    });
    expect(ex.labels.cutting_force_n).toBe(520);
    expect(ex.labels.power_kw).toBeUndefined();
    expect(ex.labels.temperature_c).toBeUndefined();
  });

  it("throws when no valid targets present", () => {
    expect(() => engine.record({
      job_id: "J-3",
      context: { material: "D2" },
      targets: { power_kw: { predicted: NaN, actual: NaN } },
    })).toThrow(/no valid target pairs/);
  });

  it("throws when context or targets missing", () => {
    expect(() => engine.record({ job_id: "X" } as any)).toThrow(/context and targets/);
  });

  it("preserves supplied observation_id and timestamp", () => {
    const ts = "2026-04-18T12:00:00.000Z";
    const ex = engine.record(makeObs({ observation_id: "my-obs-1", timestamp: ts }));
    expect(ex.observation_id).toBe("my-obs-1");
    expect(ex.timestamp).toBe(ts);
  });
});

describe("ActualVsPredictedCollectorEngine — ring buffer", () => {
  it("evicts oldest when buffer exceeds capacity", () => {
    const engine = new ActualVsPredictedCollectorEngine({ buffer_capacity: 3, min_batch_size: 1 });
    engine.record(makeObs({ observation_id: "a" }));
    engine.record(makeObs({ observation_id: "b" }));
    engine.record(makeObs({ observation_id: "c" }));
    engine.record(makeObs({ observation_id: "d" }));
    expect(engine.size).toBe(3);
    const batch = engine.emitTrainingBatch();
    const ids = batch!.examples.map(e => e.observation_id);
    expect(ids).toEqual(["b", "c", "d"]);
  });

  it("recordBatch inserts all in order", () => {
    const engine = new ActualVsPredictedCollectorEngine();
    const out = engine.recordBatch([
      makeObs({ observation_id: "o1" }),
      makeObs({ observation_id: "o2" }),
      makeObs({ observation_id: "o3" }),
    ]);
    expect(out).toHaveLength(3);
    expect(engine.size).toBe(3);
  });

  it("clear() empties the buffer", () => {
    const engine = new ActualVsPredictedCollectorEngine();
    engine.record(makeObs());
    engine.clear();
    expect(engine.size).toBe(0);
  });
});

describe("ActualVsPredictedCollectorEngine — residual stats", () => {
  let engine: ActualVsPredictedCollectorEngine;
  beforeEach(() => { engine = new ActualVsPredictedCollectorEngine(); });

  it("computes MAE, bias, RMSE correctly", () => {
    // residuals: +10, -10, +20  → mae=(10+10+20)/3=13.33, bias=20/3=6.667, rmse=sqrt((100+100+400)/3)=sqrt(200)=14.14
    engine.record(makeObs({ targets: { cutting_force_n: { predicted: 100, actual: 110 } } }));
    engine.record(makeObs({ targets: { cutting_force_n: { predicted: 100, actual: 90 } } }));
    engine.record(makeObs({ targets: { cutting_force_n: { predicted: 100, actual: 120 } } }));

    const s = engine.getResidualStats("cutting_force_n")!;
    expect(s.n).toBe(3);
    expect(s.mae).toBeCloseTo(13.333333, 4);
    expect(s.bias).toBeCloseTo(6.666667, 4);
    expect(s.rmse).toBeCloseTo(14.142136, 4);
    expect(s.min_residual).toBe(-10);
    expect(s.max_residual).toBe(20);
  });

  it("returns null for target with no data", () => {
    engine.record(makeObs());
    expect(engine.getResidualStats("temperature_c")).toBeNull();
  });

  it("getAllResidualStats returns only targets with data", () => {
    engine.record(makeObs({
      targets: {
        cutting_force_n: { predicted: 500, actual: 510 },
        power_kw: { predicted: 3, actual: 3.2 },
      },
    }));
    const all = engine.getAllResidualStats();
    const targets = all.map(s => s.target).sort();
    expect(targets).toEqual(["cutting_force_n", "power_kw"]);
  });
});

describe("ActualVsPredictedCollectorEngine — emitTrainingBatch()", () => {
  it("returns null below min_batch_size", () => {
    const engine = new ActualVsPredictedCollectorEngine({ min_batch_size: 5 });
    for (let i = 0; i < 4; i++) engine.record(makeObs());
    expect(engine.emitTrainingBatch()).toBeNull();
  });

  it("emits batch at/above min_batch_size with correct totals", () => {
    const engine = new ActualVsPredictedCollectorEngine({ min_batch_size: 2 });
    engine.record(makeObs({ jm_die_proven: true }));
    engine.record(makeObs());
    const batch = engine.emitTrainingBatch()!;
    expect(batch).not.toBeNull();
    expect(batch.examples).toHaveLength(2);
    expect(batch.total_weight).toBe(3.0); // 2.0 + 1.0
    expect(batch.jm_die_proven_count).toBe(1);
    expect(batch.coverage).toContain("cutting_force_n");
    expect(batch.batch_id).toMatch(/^batch-/);
  });

  it("does NOT clear buffer after emit", () => {
    const engine = new ActualVsPredictedCollectorEngine({ min_batch_size: 1 });
    engine.record(makeObs());
    engine.emitTrainingBatch();
    expect(engine.size).toBe(1);
  });

  it("coverage reflects union of all target keys in batch", () => {
    const engine = new ActualVsPredictedCollectorEngine({ min_batch_size: 1 });
    engine.record(makeObs({ targets: { cutting_force_n: { predicted: 1, actual: 2 } } }));
    engine.record(makeObs({ targets: { power_kw: { predicted: 1, actual: 2 } } }));
    engine.record(makeObs({ targets: { tool_life_min: { predicted: 60, actual: 55 } } }));
    const batch = engine.emitTrainingBatch()!;
    expect(batch.coverage.sort()).toEqual(["cutting_force_n", "power_kw", "tool_life_min"]);
  });
});

describe("ActualVsPredictedCollectorEngine — accuracyTrend()", () => {
  it("reports insufficient_data below 10 samples", () => {
    const engine = new ActualVsPredictedCollectorEngine();
    for (let i = 0; i < 5; i++) engine.record(makeObs());
    const trend = engine.accuracyTrend("cutting_force_n");
    expect(trend.trend).toBe("insufficient_data");
    expect(trend.n).toBe(5);
  });

  it("detects improving trend (later half has smaller RMSE)", () => {
    const engine = new ActualVsPredictedCollectorEngine();
    // First half: large residuals ±50
    for (let i = 0; i < 10; i++) {
      engine.record(makeObs({
        targets: { cutting_force_n: { predicted: 100, actual: i % 2 === 0 ? 150 : 50 } },
      }));
    }
    // Second half: small residuals ±2
    for (let i = 0; i < 10; i++) {
      engine.record(makeObs({
        targets: { cutting_force_n: { predicted: 100, actual: i % 2 === 0 ? 102 : 98 } },
      }));
    }
    const trend = engine.accuracyTrend("cutting_force_n");
    expect(trend.trend).toBe("improving");
    expect(trend.first_half_rmse).toBeGreaterThan(trend.second_half_rmse);
    expect(trend.improvement_delta).toBeGreaterThan(0);
  });

  it("detects degrading trend (later half has larger RMSE)", () => {
    const engine = new ActualVsPredictedCollectorEngine();
    for (let i = 0; i < 10; i++) {
      engine.record(makeObs({
        targets: { cutting_force_n: { predicted: 100, actual: i % 2 === 0 ? 101 : 99 } },
      }));
    }
    for (let i = 0; i < 10; i++) {
      engine.record(makeObs({
        targets: { cutting_force_n: { predicted: 100, actual: i % 2 === 0 ? 200 : 0 } },
      }));
    }
    const trend = engine.accuracyTrend("cutting_force_n");
    expect(trend.trend).toBe("degrading");
    expect(trend.improvement_delta).toBeLessThan(0);
  });

  it("detects stable trend within 2% noise band", () => {
    const engine = new ActualVsPredictedCollectorEngine();
    for (let i = 0; i < 20; i++) {
      engine.record(makeObs({
        targets: { cutting_force_n: { predicted: 100, actual: i % 2 === 0 ? 110 : 90 } },
      }));
    }
    const trend = engine.accuracyTrend("cutting_force_n");
    expect(trend.trend).toBe("stable");
  });
});

describe("ActualVsPredictedCollectorEngine — config validation", () => {
  it("throws on non-positive buffer_capacity", () => {
    expect(() => new ActualVsPredictedCollectorEngine({ buffer_capacity: 0 })).toThrow();
  });

  it("throws on non-positive min_batch_size", () => {
    expect(() => new ActualVsPredictedCollectorEngine({ min_batch_size: 0 })).toThrow();
  });

  it("throws on non-positive proven_program_weight", () => {
    expect(() => new ActualVsPredictedCollectorEngine({ proven_program_weight: 0 })).toThrow();
  });

  it("getConfig returns merged defaults", () => {
    const e = new ActualVsPredictedCollectorEngine({ min_batch_size: 8 });
    const cfg = e.getConfig();
    expect(cfg.min_batch_size).toBe(8);
    expect(cfg.buffer_capacity).toBe(10000);
    expect(cfg.proven_program_weight).toBe(2.0);
  });
});
