/**
 * WEDM_DRIFT_BASELINE.json tests — WEDM AGI Phase 3 / P3-MS1 / U-P3-04.
 *
 * Exit gate: the shipped baseline validates at schemaVersion 2, enumerates
 * ≥ 10 canonical model heads, and every model entry is self-consistent with
 * WEDMDriftDetectionEngine defaults.
 */
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const BASELINE_PATH = path.join(
  process.cwd(),
  "data",
  "state",
  "WEDM_DRIFT_BASELINE.json",
);

type Baseline = {
  schemaVersion: number;
  source: string;
  retainPolicy: {
    driftScoreThreshold: number;
    minSamples: number;
    maxAgeDays: number;
    minRetention: number;
  };
  detectorDefaults: {
    psi: { buckets: number; severe: number; drift: number; moderate: number };
    ks: { criticalAlpha: number; criticalCoefficient: number };
    pageHinkley: { deltaSigmas: number; lambdaSqrtN: number };
  };
  models: Record<
    string,
    {
      modelId: string;
      family: string;
      target: string;
      baseline: Record<string, number>;
      current: Record<string, number>;
      drift: { score: number; trend: string; lastCheck: string };
      threshold: number;
      minRetention: number;
      windowSize: number;
    }
  >;
};

function loadBaseline(): Baseline {
  return JSON.parse(fs.readFileSync(BASELINE_PATH, "utf8")) as Baseline;
}

describe("WEDM_DRIFT_BASELINE.json — schema + coverage", () => {
  it("validates at schemaVersion 2", () => {
    const b = loadBaseline();
    expect(b.schemaVersion).toBe(2);
  });

  it("declares ≥10 canonical WEDM model heads", () => {
    const b = loadBaseline();
    const ids = Object.keys(b.models);
    expect(ids.length).toBeGreaterThanOrEqual(10);
  });

  it("preserves the three v1 models as a compatibility checkpoint", () => {
    const b = loadBaseline();
    expect(b.models.neural_ra).toBeDefined();
    expect(b.models.neural_mrr).toBeDefined();
    expect(b.models.wire_break_predictor).toBeDefined();
  });

  it("retainPolicy matches WEDMModelUpdateEngine default floor", () => {
    const b = loadBaseline();
    expect(b.retainPolicy.minRetention).toBe(0.95);
    expect(b.retainPolicy.driftScoreThreshold).toBeGreaterThan(0);
  });

  it("detectorDefaults align with WEDMDriftDetectionEngine", () => {
    const b = loadBaseline();
    expect(b.detectorDefaults.psi.buckets).toBe(10);
    expect(b.detectorDefaults.psi.severe).toBe(0.50);
    expect(b.detectorDefaults.psi.drift).toBe(0.25);
    expect(b.detectorDefaults.psi.moderate).toBe(0.10);
    expect(b.detectorDefaults.ks.criticalCoefficient).toBeCloseTo(1.36, 2);
    expect(b.detectorDefaults.pageHinkley.lambdaSqrtN).toBeGreaterThan(0);
  });
});

describe("WEDM_DRIFT_BASELINE.json — per-model consistency", () => {
  it("every model entry has a positive threshold and minRetention in (0,1]", () => {
    const b = loadBaseline();
    for (const [k, m] of Object.entries(b.models)) {
      expect(m.threshold, `${k} threshold`).toBeGreaterThan(0);
      expect(m.minRetention, `${k} minRetention`).toBeGreaterThan(0);
      expect(m.minRetention, `${k} minRetention`).toBeLessThanOrEqual(1);
    }
  });

  it("every model entry has a modelId, family, target, and windowSize ≥ 50", () => {
    const b = loadBaseline();
    for (const [k, m] of Object.entries(b.models)) {
      expect(m.modelId, `${k} modelId`).toBeTruthy();
      expect(m.family, `${k} family`).toBeTruthy();
      expect(m.target, `${k} target`).toBeTruthy();
      expect(m.windowSize, `${k} windowSize`).toBeGreaterThanOrEqual(50);
    }
  });

  it("every drift.score respects its model threshold (no pre-shipped drift)", () => {
    const b = loadBaseline();
    for (const [k, m] of Object.entries(b.models)) {
      expect(m.drift.score, `${k} drift.score`).toBeGreaterThanOrEqual(0);
      expect(m.drift.score, `${k} drift.score < threshold`).toBeLessThan(m.threshold);
    }
  });

  it("baseline stats are non-empty and numeric", () => {
    const b = loadBaseline();
    for (const [k, m] of Object.entries(b.models)) {
      const keys = Object.keys(m.baseline);
      expect(keys.length, `${k} baseline keys`).toBeGreaterThan(0);
      for (const val of Object.values(m.baseline)) {
        expect(Number.isFinite(val), `${k} baseline value`).toBe(true);
      }
    }
  });

  it("no duplicate modelIds across the catalog", () => {
    const b = loadBaseline();
    const ids = Object.values(b.models).map((m) => m.modelId);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
