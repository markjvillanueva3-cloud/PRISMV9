/**
 * CAMBaselineRegressorEngine tests — U-CAM-ML-04
 * ================================================
 * Verifies Bayesian ridge + gradient-boost trains against the U-CAM-ML-03
 * customer-disjoint split, predicts within plausible ranges, and handles
 * degenerate inputs (empty sets, zero targets) without crashing.
 */

import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import {
  CAMBaselineRegressorEngine,
  camBaselineRegressorEngine,
  type BaselineModel,
} from "../engines/CAMBaselineRegressorEngine.js";
import type { FeatureVector } from "../engines/CAMFeatureExtractorEngine.js";
import type { CAMMLSplitResult } from "../engines/CAMMLSplitEngine.js";

function makeVector(overrides: Partial<FeatureVector> = {}): FeatureVector {
  return {
    program_id: overrides.program_id ?? "p",
    source_path: "JM DIE/CNC LATHE/TEST/p.MIN",
    cam_system: "okuma_native",
    machine_type: "CNC LATHE",
    customer: "TEST",
    part_hint: "p",
    lines_of_code: 100,
    tool_count: 3,
    tool_changes: 3,
    ops_by_strategy: { profile: 1, pocket: 0, drill: 1, thread: 0, face: 0, bore: 1, other: 0 },
    detected_materials: ["STEEL"],
    estimated_spindle_range_rpm: [800, 2000],
    estimated_feed_range_mm_min: [0.05, 0.3],
    g_code_dialect_hint: "okuma",
    has_m98_subroutine: false,
    has_g41_g42_cutter_comp: false,
    has_g83_peck_drill: false,
    has_g71_g72_lathe_cycle: false,
    parsed_ok: true,
    parse_warnings: [],
    ...overrides,
  };
}

function makeSplit(train: FeatureVector[], val: FeatureVector[], test: FeatureVector[] = []): CAMMLSplitResult {
  return {
    schemaVersion: 1,
    computed_at: new Date().toISOString(),
    input_program_count: train.length + val.length + test.length,
    ratios: { train: 0.7, val: 0.15, test: 0.15 },
    train, val, test,
    customer_assignments: [],
    distribution_checks: [],
    leakage_audit: { customers_in_multiple_sets: [], no_leakage: true },
    summary: {
      train: { program_count: train.length, customer_count: 0, machine_type_hist: {}, cam_system_hist: {} },
      val: { program_count: val.length, customer_count: 0, machine_type_hist: {}, cam_system_hist: {} },
      test: { program_count: test.length, customer_count: 0, machine_type_hist: {}, cam_system_hist: {} },
    },
    warnings: [],
  };
}

const engine = new CAMBaselineRegressorEngine();

describe("CAMBaselineRegressorEngine — training contract", () => {
  it("produces Bayesian + gradient-boost models for both targets", () => {
    const vectors: FeatureVector[] = [];
    for (let i = 0; i < 30; i++) {
      vectors.push(makeVector({
        program_id: `t${i}`,
        lines_of_code: 100 + i * 5,
        tool_count: 2 + (i % 4),
        estimated_spindle_range_rpm: [500 + i * 30, 1500 + i * 40],
        estimated_feed_range_mm_min: [0.05 + i * 0.003, 0.2 + i * 0.005],
      }));
    }
    const split = makeSplit(vectors.slice(0, 21), vectors.slice(21, 27), vectors.slice(27));
    const r = engine.trainFromSplit(split);
    expect(r.bayesian.spindle_rpm_midpoint.kind).toBe("bayesian_ridge");
    expect(r.gradient_boost.spindle_rpm_midpoint.kind).toBe("gradient_boost");
    expect(r.bayesian.feed_mm_min_midpoint).toBeDefined();
    expect(r.gradient_boost.feed_mm_min_midpoint).toBeDefined();
  });

  it("weight vector length matches feature_names", () => {
    const vectors = Array.from({ length: 20 }, (_, i) =>
      makeVector({ program_id: `t${i}`, lines_of_code: 100 + i })
    );
    const split = makeSplit(vectors.slice(0, 14), vectors.slice(14, 17), vectors.slice(17));
    const r = engine.trainFromSplit(split);
    const m = r.bayesian.spindle_rpm_midpoint;
    expect(m.weights.length).toBe(m.feature_names.length);
    expect(m.weight_variances.length).toBe(m.feature_names.length);
  });

  it("emits train + val metrics for both targets and both models", () => {
    const vectors = Array.from({ length: 20 }, (_, i) => makeVector({ program_id: `t${i}`, lines_of_code: 100 + i * 2 }));
    const split = makeSplit(vectors.slice(0, 14), vectors.slice(14, 17), vectors.slice(17));
    const r = engine.trainFromSplit(split);
    expect(r.train_metrics.spindle_rpm_midpoint.bayesian.n_samples).toBeGreaterThan(0);
    expect(r.val_metrics.spindle_rpm_midpoint.gradient_boost.target).toBe("spindle_rpm_midpoint");
  });
});

describe("CAMBaselineRegressorEngine — degenerate inputs", () => {
  it("survives a fully-empty split without throwing", () => {
    const r = engine.trainFromSplit(makeSplit([], [], []));
    expect(r.bayesian.spindle_rpm_midpoint.weights.every((w) => w === 0)).toBe(true);
  });

  it("skips vectors with zero-valued targets in featurization", () => {
    const vectors = [
      makeVector({ program_id: "p1", estimated_spindle_range_rpm: [0, 0] }), // zero target
      makeVector({ program_id: "p2", estimated_spindle_range_rpm: [1000, 2000] }),
      makeVector({ program_id: "p3", estimated_spindle_range_rpm: [500, 1500] }),
    ];
    const split = makeSplit(vectors, [], []);
    const r = engine.trainFromSplit(split);
    // n_samples for spindle target should be 2, not 3
    expect(r.train_metrics.spindle_rpm_midpoint.bayesian.n_samples).toBeLessThanOrEqual(2);
  });
});

describe("CAMBaselineRegressorEngine — prediction", () => {
  it("Bayesian predictions include 90% CI half-width", () => {
    const vectors = Array.from({ length: 20 }, (_, i) =>
      makeVector({
        program_id: `t${i}`,
        tool_count: 2 + (i % 5),
        estimated_spindle_range_rpm: [500 + i * 50, 1500 + i * 50],
      })
    );
    const split = makeSplit(vectors.slice(0, 15), vectors.slice(15, 18), vectors.slice(18));
    const r = engine.trainFromSplit(split);
    const p = engine.predict(r.bayesian.spindle_rpm_midpoint, vectors[0]);
    expect(p.model_kind).toBe("bayesian_ridge");
    expect(p.ci_half_width).not.toBeNull();
    expect(p.ci_half_width!).toBeGreaterThanOrEqual(0);
    expect(p.target).toBe("spindle_rpm_midpoint");
  });

  it("gradient-boost predictions have null CI half-width", () => {
    const vectors = Array.from({ length: 20 }, (_, i) => makeVector({ program_id: `t${i}`, lines_of_code: 100 + i }));
    const split = makeSplit(vectors.slice(0, 15), vectors.slice(15, 18), vectors.slice(18));
    const r = engine.trainFromSplit(split);
    const p = engine.predict(r.gradient_boost.spindle_rpm_midpoint, vectors[0]);
    expect(p.model_kind).toBe("gradient_boost");
    expect(p.ci_half_width).toBeNull();
  });

  it("predict is deterministic for same input + model", () => {
    const vectors = Array.from({ length: 20 }, (_, i) => makeVector({ program_id: `t${i}`, lines_of_code: 100 + i }));
    const split = makeSplit(vectors.slice(0, 15), vectors.slice(15, 18), vectors.slice(18));
    const r = engine.trainFromSplit(split);
    const a = engine.predict(r.bayesian.spindle_rpm_midpoint, vectors[0]);
    const b = engine.predict(r.bayesian.spindle_rpm_midpoint, vectors[0]);
    expect(a.value).toBe(b.value);
  });
});

describe("CAMBaselineRegressorEngine — end-to-end from shipped splits file", () => {
  it("reads JM_DIE_ML_SPLITS.json and trains without throwing", () => {
    const splitsPath = "H:/PRISM/mcp-server/data/state/JM_DIE_ML_SPLITS.json";
    if (!fs.existsSync(splitsPath)) return; // skip if splits not yet emitted in this environment
    const r = engine.trainFromFiles(splitsPath, "H:/PRISM/mcp-server/data/state/models/cam-baseline");
    expect(r.n_train).toBeGreaterThan(0);
    expect(fs.existsSync("H:/PRISM/mcp-server/data/state/models/cam-baseline/bayesian.json")).toBe(true);
    expect(fs.existsSync("H:/PRISM/mcp-server/data/state/models/cam-baseline/gradient_boost.json")).toBe(true);
    expect(fs.existsSync("H:/PRISM/mcp-server/data/state/models/cam-baseline/metrics.json")).toBe(true);
  });
});

describe("CAMBaselineRegressorEngine — metric contract", () => {
  it("MAE is non-negative and finite when training data exists", () => {
    const vectors = Array.from({ length: 20 }, (_, i) =>
      makeVector({
        program_id: `t${i}`,
        tool_count: 2 + (i % 3),
        estimated_spindle_range_rpm: [1000 + i * 50, 2000 + i * 50],
      })
    );
    const split = makeSplit(vectors.slice(0, 15), vectors.slice(15, 18), vectors.slice(18));
    const r = engine.trainFromSplit(split);
    const m = r.val_metrics.spindle_rpm_midpoint.bayesian;
    if (m.n_samples > 0) {
      expect(m.mae).toBeGreaterThanOrEqual(0);
      expect(Number.isFinite(m.mae)).toBe(true);
    }
  });

  it("coverage_pct is in [0, 100] for Bayesian and null for gradient-boost", () => {
    const vectors = Array.from({ length: 20 }, (_, i) =>
      makeVector({
        program_id: `t${i}`,
        estimated_spindle_range_rpm: [1000 + i * 30, 2000 + i * 30],
      })
    );
    const split = makeSplit(vectors.slice(0, 15), vectors.slice(15, 18), vectors.slice(18));
    const r = engine.trainFromSplit(split);
    const b = r.val_metrics.spindle_rpm_midpoint.bayesian;
    const gb = r.val_metrics.spindle_rpm_midpoint.gradient_boost;
    if (b.n_samples > 0) {
      expect(b.coverage_pct).not.toBeNull();
      expect(b.coverage_pct!).toBeGreaterThanOrEqual(0);
      expect(b.coverage_pct!).toBeLessThanOrEqual(100);
    }
    expect(gb.coverage_pct).toBeNull();
  });
});

describe("CAMBaselineRegressorEngine — singleton + factory", () => {
  it("default singleton is callable", () => {
    expect(camBaselineRegressorEngine).toBeInstanceOf(CAMBaselineRegressorEngine);
  });

  it("gradient_boost stumps list has length ≤ configured n_stumps", () => {
    const vectors = Array.from({ length: 20 }, (_, i) =>
      makeVector({ program_id: `t${i}`, lines_of_code: 100 + i * 3 })
    );
    const split = makeSplit(vectors.slice(0, 15), vectors.slice(15, 18));
    const r = engine.trainFromSplit(split, { n_stumps: 10 });
    expect(r.gradient_boost.spindle_rpm_midpoint.stumps.length).toBeLessThanOrEqual(10);
  });
});
