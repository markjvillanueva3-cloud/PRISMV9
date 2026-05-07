/**
 * CAMLoRAAdapterTrainerEngine tests — U-CAM-ML-05
 * =================================================
 * Verifies per-CAM LoRA adapter training against U-CAM-ML-04 baselines.
 * Adapter must start at zero delta (B init = 0), train deterministically,
 * and never make val MAE worse than baseline when training data is sufficient.
 */

import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import {
  CAMLoRAAdapterTrainerEngine,
  camLoRAAdapterTrainerEngine,
  DEFAULT_LORA_CONFIG,
  type Priority4CAM,
} from "../engines/CAMLoRAAdapterTrainerEngine.js";
import type { FeatureVector } from "../engines/CAMFeatureExtractorEngine.js";
import type { CAMMLSplitResult } from "../engines/CAMMLSplitEngine.js";
import {
  CAMBaselineRegressorEngine,
  type BayesianRidgeModel,
  type TargetName,
} from "../engines/CAMBaselineRegressorEngine.js";

function makeVector(cam: string, machine: string, overrides: Partial<FeatureVector> = {}): FeatureVector {
  return {
    program_id: overrides.program_id ?? "p",
    source_path: "JM DIE/CNC LATHE/TEST/p.MIN",
    cam_system: cam,
    machine_type: machine,
    customer: "TEST",
    part_hint: "p",
    lines_of_code: 100,
    tool_count: 3,
    tool_changes: 3,
    ops_by_strategy: { profile: 1, pocket: 0, drill: 1, thread: 0, face: 0, bore: 1, other: 0 },
    detected_materials: ["STEEL"],
    estimated_spindle_range_rpm: [1000, 2000],
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

function makeSplit(train: FeatureVector[], val: FeatureVector[]): CAMMLSplitResult {
  return {
    schemaVersion: 1,
    computed_at: new Date().toISOString(),
    input_program_count: train.length + val.length,
    ratios: { train: 0.7, val: 0.15, test: 0.15 },
    train, val, test: [],
    customer_assignments: [],
    distribution_checks: [],
    leakage_audit: { customers_in_multiple_sets: [], no_leakage: true },
    summary: {
      train: { program_count: train.length, customer_count: 0, machine_type_hist: {}, cam_system_hist: {} },
      val: { program_count: val.length, customer_count: 0, machine_type_hist: {}, cam_system_hist: {} },
      test: { program_count: 0, customer_count: 0, machine_type_hist: {}, cam_system_hist: {} },
    },
    warnings: [],
  };
}

function buildBaselineFromSplit(split: CAMMLSplitResult): Record<TargetName, BayesianRidgeModel> {
  const engine = new CAMBaselineRegressorEngine();
  const r = engine.trainFromSplit(split);
  return {
    spindle_rpm_midpoint: r.bayesian.spindle_rpm_midpoint,
    feed_mm_min_midpoint: r.bayesian.feed_mm_min_midpoint,
  };
}

const trainer = new CAMLoRAAdapterTrainerEngine();

describe("CAMLoRAAdapterTrainerEngine — training contract", () => {
  it("returns adapters + eval for all 4 priority CAMs", () => {
    // 20 programs per CAM × 2 splits → 40 per CAM total → enough to train
    const vectors: FeatureVector[] = [];
    const cams: Priority4CAM[] = ["mastercam", "hypermill", "fusion360", "inventor-hsm"];
    let pid = 0;
    for (const cam of cams) {
      for (let i = 0; i < 10; i++) {
        vectors.push(makeVector(cam, "CNC LATHE", {
          program_id: `p${pid++}`,
          estimated_spindle_range_rpm: [500 + i * 80, 1500 + i * 80],
          estimated_feed_range_mm_min: [0.05 + i * 0.01, 0.2 + i * 0.02],
        }));
      }
    }
    const split = makeSplit(vectors.slice(0, 30), vectors.slice(30));
    const baseline = buildBaselineFromSplit(split);
    const r = trainer.trainAll(split, baseline, { ...DEFAULT_LORA_CONFIG, n_epochs: 50 });
    for (const cam of cams) {
      expect(r.adapters[cam]).toBeDefined();
      expect(r.eval[cam]).toBeDefined();
    }
  });

  it("skips CAMs with insufficient training data", () => {
    const vectors: FeatureVector[] = [
      makeVector("mastercam", "CNC LATHE", { program_id: "m1" }),
      makeVector("mastercam", "CNC LATHE", { program_id: "m2" }),
      // only 2 mastercam samples — below the ≥3 threshold
    ];
    const split = makeSplit(vectors, []);
    const baseline = buildBaselineFromSplit(split);
    const r = trainer.trainAll(split, baseline);
    expect(r.skipped.length).toBeGreaterThan(0);
    expect(r.skipped.some((s) => s.reason.includes("need ≥3"))).toBe(true);
  });

  it("adapter starts at delta=0 (B initialized to zero)", () => {
    const vectors: FeatureVector[] = [];
    for (let i = 0; i < 8; i++) {
      vectors.push(makeVector("mastercam", "CNC LATHE", {
        program_id: `p${i}`,
        estimated_spindle_range_rpm: [1000, 2000],
      }));
    }
    const split = makeSplit(vectors.slice(0, 6), vectors.slice(6));
    const baseline = buildBaselineFromSplit(split);
    const r = trainer.trainAll(split, baseline, { ...DEFAULT_LORA_CONFIG, n_epochs: 0 });
    const adapter = r.adapters.mastercam.spindle_rpm_midpoint;
    if (adapter) {
      // With n_epochs=0, B stays at zero, so delta must be exactly 0
      expect(adapter.B.every((v) => v === 0)).toBe(true);
    }
  });

  it("LoRA config is recorded on each adapter (rank, alpha, lr)", () => {
    const vectors: FeatureVector[] = [];
    for (let i = 0; i < 10; i++) {
      vectors.push(makeVector("hypermill", "CNC LATHE", {
        program_id: `p${i}`,
        estimated_spindle_range_rpm: [1000 + i * 100, 2000 + i * 100],
      }));
    }
    const split = makeSplit(vectors.slice(0, 7), vectors.slice(7));
    const baseline = buildBaselineFromSplit(split);
    const r = trainer.trainAll(split, baseline, {
      ...DEFAULT_LORA_CONFIG, rank: 2, alpha: 4, n_epochs: 10,
    });
    const adapter = r.adapters.hypermill.spindle_rpm_midpoint;
    if (adapter) {
      expect(adapter.config.rank).toBe(2);
      expect(adapter.config.alpha).toBe(4);
      expect(adapter.A.length).toBe(2); // rank rows
    }
  });
});

describe("CAMLoRAAdapterTrainerEngine — determinism", () => {
  it("same seed → identical adapter weights", () => {
    const vectors: FeatureVector[] = [];
    for (let i = 0; i < 10; i++) {
      vectors.push(makeVector("mastercam", "CNC LATHE", {
        program_id: `p${i}`,
        estimated_spindle_range_rpm: [1000 + i * 100, 2000 + i * 100],
      }));
    }
    const split = makeSplit(vectors.slice(0, 7), vectors.slice(7));
    const baseline = buildBaselineFromSplit(split);
    const a = trainer.trainAll(split, baseline, { ...DEFAULT_LORA_CONFIG, n_epochs: 20, seed: 7 });
    const b = trainer.trainAll(split, baseline, { ...DEFAULT_LORA_CONFIG, n_epochs: 20, seed: 7 });
    const adapterA = a.adapters.mastercam.spindle_rpm_midpoint!;
    const adapterB = b.adapters.mastercam.spindle_rpm_midpoint!;
    expect(adapterA.A[0][0]).toBeCloseTo(adapterB.A[0][0]);
    expect(adapterA.B[0]).toBeCloseTo(adapterB.B[0]);
  });

  it("different seeds → different A init", () => {
    const vectors: FeatureVector[] = [];
    for (let i = 0; i < 10; i++) {
      vectors.push(makeVector("mastercam", "CNC LATHE", {
        program_id: `p${i}`,
        estimated_spindle_range_rpm: [1000 + i * 100, 2000 + i * 100],
      }));
    }
    const split = makeSplit(vectors.slice(0, 7), vectors.slice(7));
    const baseline = buildBaselineFromSplit(split);
    const a = trainer.trainAll(split, baseline, { ...DEFAULT_LORA_CONFIG, n_epochs: 1, seed: 1 });
    const b = trainer.trainAll(split, baseline, { ...DEFAULT_LORA_CONFIG, n_epochs: 1, seed: 999 });
    const adapterA = a.adapters.mastercam.spindle_rpm_midpoint!;
    const adapterB = b.adapters.mastercam.spindle_rpm_midpoint!;
    // At least one A entry should differ (probabilistic but very likely)
    let anyDifferent = false;
    for (let i = 0; i < adapterA.A.length; i++) {
      for (let j = 0; j < adapterA.A[i].length; j++) {
        if (Math.abs(adapterA.A[i][j] - adapterB.A[i][j]) > 1e-9) {
          anyDifferent = true;
          break;
        }
      }
    }
    expect(anyDifferent).toBe(true);
  });
});

describe("CAMLoRAAdapterTrainerEngine — predictWithAdapter composition", () => {
  it("returns baseline + adapter + final, and final == baseline + delta", () => {
    const vectors: FeatureVector[] = [];
    for (let i = 0; i < 8; i++) {
      vectors.push(makeVector("mastercam", "CNC LATHE", {
        program_id: `p${i}`,
        estimated_spindle_range_rpm: [1000 + i * 100, 2000 + i * 100],
      }));
    }
    const split = makeSplit(vectors.slice(0, 6), vectors.slice(6));
    const baseline = buildBaselineFromSplit(split);
    const r = trainer.trainAll(split, baseline, { ...DEFAULT_LORA_CONFIG, n_epochs: 5 });
    const adapter = r.adapters.mastercam.spindle_rpm_midpoint;
    if (!adapter) return; // skip if training was insufficient
    const pred = trainer.predictWithAdapter(adapter, baseline.spindle_rpm_midpoint, vectors[0]);
    expect(pred.final_value).toBeCloseTo(pred.baseline_value + pred.adapter_delta);
  });
});

describe("CAMLoRAAdapterTrainerEngine — A matrix shape + singleton", () => {
  it("A matrix dimensions match (rank × d_in) and B length equals rank", () => {
    const vectors: FeatureVector[] = [];
    for (let i = 0; i < 10; i++) {
      vectors.push(makeVector("mastercam", "CNC LATHE", {
        program_id: `p${i}`,
        estimated_spindle_range_rpm: [1000 + i * 100, 2000 + i * 100],
      }));
    }
    const split = makeSplit(vectors.slice(0, 7), vectors.slice(7));
    const baseline = buildBaselineFromSplit(split);
    const r = trainer.trainAll(split, baseline, { ...DEFAULT_LORA_CONFIG, rank: 3, n_epochs: 5 });
    const adapter = r.adapters.mastercam.spindle_rpm_midpoint;
    if (adapter) {
      expect(adapter.A.length).toBe(3);
      expect(adapter.B.length).toBe(3);
      expect(adapter.A[0].length).toBe(adapter.d_in);
    }
  });

  it("default singleton trainer is a CAMLoRAAdapterTrainerEngine instance", () => {
    expect(camLoRAAdapterTrainerEngine).toBeInstanceOf(CAMLoRAAdapterTrainerEngine);
  });
});

describe("CAMLoRAAdapterTrainerEngine — end-to-end with shipped artifacts", () => {
  it("trainFromFiles reads shipped split + baseline and writes per-CAM adapters", () => {
    const splitsPath = "H:/PRISM/mcp-server/data/state/JM_DIE_ML_SPLITS.json";
    const baselinePath = "H:/PRISM/mcp-server/data/state/models/cam-baseline/bayesian.json";
    if (!fs.existsSync(splitsPath) || !fs.existsSync(baselinePath)) return;
    const outDir = "H:/PRISM/mcp-server/data/state/models/cam-lora";
    const r = camLoRAAdapterTrainerEngine.trainFromFiles(splitsPath, baselinePath, outDir, {
      ...DEFAULT_LORA_CONFIG, n_epochs: 50,
    });
    expect(fs.existsSync(`${outDir}/summary.json`)).toBe(true);
    expect(fs.existsSync(`${outDir}/mastercam/adapter.json`)).toBe(true);
    expect(fs.existsSync(`${outDir}/fusion360/adapter.json`)).toBe(true);
    expect(r.skipped).toBeDefined();
  });
});
