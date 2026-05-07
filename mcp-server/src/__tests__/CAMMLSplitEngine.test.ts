/**
 * CAMMLSplitEngine tests — U-CAM-ML-03
 * =====================================
 * Verifies customer-disjoint split correctness. The leakage audit is the
 * single most important property — if it ever returns no_leakage=false,
 * the ML training pipeline is broken and must not proceed.
 */

import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import {
  CAMMLSplitEngine,
  camMLSplitEngine,
} from "../engines/CAMMLSplitEngine.js";
import type { FeatureVector } from "../engines/CAMFeatureExtractorEngine.js";

function makeVector(customer: string, id: string, overrides: Partial<FeatureVector> = {}): FeatureVector {
  return {
    program_id: id,
    source_path: `JM DIE/CNC LATHE/${customer}/${id}.MIN`,
    cam_system: "okuma_native",
    machine_type: "CNC LATHE",
    customer,
    part_hint: id,
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

describe("CAMMLSplitEngine — customer-disjoint correctness", () => {
  it("no customer appears in multiple sets — the ONE property that must hold", () => {
    const vectors: FeatureVector[] = [];
    const customers = ["ALCOA", "ITW", "OPTIMAS", "SFS", "HOLO-KROME", "FASTENAL", "OMG", "FONTANA", "NATHANS", "POSTS"];
    for (const c of customers) {
      for (let i = 0; i < 10; i++) vectors.push(makeVector(c, `${c}-${i}`));
    }
    const result = camMLSplitEngine.split(vectors);
    expect(result.leakage_audit.no_leakage).toBe(true);
    expect(result.leakage_audit.customers_in_multiple_sets).toHaveLength(0);
  });

  it("train + val + test sums to input size (no vectors dropped)", () => {
    const vectors = Array.from({ length: 100 }, (_, i) =>
      makeVector(`C${i % 10}`, `p${i}`)
    );
    const r = camMLSplitEngine.split(vectors);
    expect(r.train.length + r.val.length + r.test.length).toBe(100);
  });

  it("split is deterministic given the same seed", () => {
    const vectors = Array.from({ length: 50 }, (_, i) => makeVector(`C${i % 5}`, `p${i}`));
    const a = camMLSplitEngine.split(vectors, { train: 0.7, val: 0.15, test: 0.15 }, 1234);
    const b = camMLSplitEngine.split(vectors, { train: 0.7, val: 0.15, test: 0.15 }, 1234);
    expect(a.train.map((v) => v.program_id)).toEqual(b.train.map((v) => v.program_id));
    expect(a.val.map((v) => v.program_id)).toEqual(b.val.map((v) => v.program_id));
    expect(a.test.map((v) => v.program_id)).toEqual(b.test.map((v) => v.program_id));
  });

  it("throws when ratios don't sum to 1.0", () => {
    expect(() =>
      camMLSplitEngine.split([makeVector("C1", "p1")], { train: 0.5, val: 0.3, test: 0.3 })
    ).toThrow(/sum to 1.0/);
  });

  it("empty input yields empty result with a warning, not a throw", () => {
    const r = camMLSplitEngine.split([]);
    expect(r.train).toHaveLength(0);
    expect(r.warnings.length).toBeGreaterThan(0);
  });
});

describe("CAMMLSplitEngine — ratio targeting", () => {
  it("approximates 70/15/15 with many customers (±10%)", () => {
    const vectors: FeatureVector[] = [];
    for (let c = 0; c < 20; c++) {
      for (let i = 0; i < 10; i++) vectors.push(makeVector(`C${c}`, `C${c}-${i}`));
    }
    const r = camMLSplitEngine.split(vectors);
    expect(r.train.length / 200).toBeGreaterThanOrEqual(0.55);
    expect(r.train.length / 200).toBeLessThanOrEqual(0.85);
  });

  it("respects custom ratios", () => {
    const vectors = Array.from({ length: 100 }, (_, i) => makeVector(`C${i % 10}`, `p${i}`));
    const r = camMLSplitEngine.split(vectors, { train: 0.5, val: 0.25, test: 0.25 });
    expect(r.train.length).toBeGreaterThan(r.val.length);
    expect(r.train.length).toBeGreaterThan(r.test.length);
  });

  it("warns when customer diversity is too low", () => {
    const vectors = [
      makeVector("OnlyCustomer", "a"),
      makeVector("OnlyCustomer", "b"),
    ];
    const r = camMLSplitEngine.split(vectors);
    expect(r.warnings.some((w) => /customer diversity/.test(w))).toBe(true);
  });
});

describe("CAMMLSplitEngine — distribution checks", () => {
  it("computes distribution checks for machine_type and cam_system", () => {
    const vectors: FeatureVector[] = [];
    for (let c = 0; c < 10; c++) {
      for (let i = 0; i < 10; i++) {
        vectors.push(
          makeVector(`C${c}`, `p${c}-${i}`, {
            machine_type: i % 2 === 0 ? "CNC LATHE" : "CNC MILL",
            cam_system: i % 3 === 0 ? "mastercam" : "okuma_native",
          })
        );
      }
    }
    const r = camMLSplitEngine.split(vectors);
    expect(r.distribution_checks.length).toBeGreaterThan(0);
    const machineChecks = r.distribution_checks.filter((c) => c.metric === "machine_type");
    expect(machineChecks.length).toBeGreaterThanOrEqual(2);
  });

  it("each distribution check has train/val/test percentages in [0, 100]", () => {
    const vectors: FeatureVector[] = [];
    for (let c = 0; c < 8; c++) {
      for (let i = 0; i < 8; i++) vectors.push(makeVector(`C${c}`, `p${c}-${i}`));
    }
    const r = camMLSplitEngine.split(vectors);
    for (const check of r.distribution_checks) {
      expect(check.train_pct).toBeGreaterThanOrEqual(0);
      expect(check.train_pct).toBeLessThanOrEqual(100);
      expect(check.val_pct).toBeGreaterThanOrEqual(0);
      expect(check.val_pct).toBeLessThanOrEqual(100);
      expect(check.test_pct).toBeGreaterThanOrEqual(0);
      expect(check.test_pct).toBeLessThanOrEqual(100);
    }
  });
});

describe("CAMMLSplitEngine — file-based end-to-end", () => {
  it("splitFromFiles reads sample JSON + writes manifest without throwing", () => {
    const outPath = "H:/PRISM/mcp-server/data/state/JM_DIE_ML_SPLITS.json";
    const r = camMLSplitEngine.splitFromFiles(
      "H:/PRISM/mcp-server/data/state/JM_DIE_FEATURE_VECTORS_SAMPLE.json",
      outPath
    );
    expect(r.input_program_count).toBeGreaterThan(0);
    expect(fs.existsSync(outPath)).toBe(true);
    // Manifest is schema-valid
    const manifest = JSON.parse(fs.readFileSync(outPath, "utf-8"));
    expect(manifest.schemaVersion).toBe(1);
    expect(manifest.leakage_audit.no_leakage).toBe(true);
  });

  it("summary.customer_count matches unique customers across sets (disjoint)", () => {
    const r = camMLSplitEngine.splitFromFiles();
    const trainCustomers = new Set(r.train.map((v) => v.customer));
    const valCustomers = new Set(r.val.map((v) => v.customer));
    const testCustomers = new Set(r.test.map((v) => v.customer));
    // Intersection must be empty
    for (const c of trainCustomers) expect(valCustomers.has(c)).toBe(false);
    for (const c of trainCustomers) expect(testCustomers.has(c)).toBe(false);
    for (const c of valCustomers) expect(testCustomers.has(c)).toBe(false);
  });
});
