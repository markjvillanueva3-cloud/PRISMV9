/**
 * CADParameterPredictorEngine — U-CADC31 tests
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, copyFileSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import {
  CADParameterPredictorEngine,
  type TargetGeometry,
  type TrainingSample,
  type PredictableParam,
} from "../engines/CADParameterPredictorEngine.js";

const MODEL_SRC = resolve(__dirname, "../../data/models/cad_param_predictor.json");
let tmpDir: string;
let tmpModel: string;
let engine: CADParameterPredictorEngine;

function makeBoxGeom(x = 80, y = 60, z = 40): TargetGeometry {
  return {
    volume_mm3: x * y * z,
    bbox: { x_mm: x, y_mm: y, z_mm: z },
    faceCount: 6,
    edgeCount: 12,
  };
}

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), "cad-param-pred-"));
  tmpModel = join(tmpDir, "model.json");
  copyFileSync(MODEL_SRC, tmpModel);
  engine = new CADParameterPredictorEngine(tmpModel);
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

describe("CADParameterPredictorEngine — model loading", () => {
  it("loads and validates the shipped JSON model", () => {
    const info = engine.getModelInfo();
    expect(info.version).toBe("0.1.0-prior");
    expect(info.corpusSize).toBe(0);
    expect(info.rmsePct).toBeNull();
  });

  it("rejects a malformed model JSON", () => {
    const bad = join(tmpDir, "bad.json");
    writeFileSync(bad, JSON.stringify({ schemaVersion: 1 }));
    expect(() => new CADParameterPredictorEngine(bad)).toThrow();
  });
});

describe("CADParameterPredictorEngine — predict() shape", () => {
  it("emits all 16 model parameters when no featureType is provided", () => {
    const r = engine.predict(makeBoxGeom());
    const keys = Object.keys(r.parameters).sort();
    expect(keys).toEqual([
      "boss_diameter_mm","boss_height_mm","chamfer_size_mm",
      "counterbore_depth_mm","counterbore_diameter_mm","countersink_angle_deg",
      "extrusion_depth_mm","fillet_radius_mm","groove_depth_mm","groove_width_mm",
      "hole_depth_mm","hole_diameter_mm","pocket_depth_mm",
      "slot_length_mm","slot_width_mm","thread_pitch_mm",
    ]);
    expect(r.geometryFingerprint.longestDim_mm).toBe(80);
    expect(r.geometryFingerprint.aspectRatio).toBeCloseTo(80 / 40, 5);
    expect(r.meanConfidence).toBeGreaterThan(0);
    expect(r.meanConfidence).toBeLessThanOrEqual(1);
  });

  it("restricts output to feature-relevant params when featureType is supplied", () => {
    const g = { ...makeBoxGeom(), featureType: "through_hole" as const };
    const r = engine.predict(g);
    const keys = Object.keys(r.parameters).sort();
    expect(keys).toEqual(["hole_depth_mm", "hole_diameter_mm"]);
  });

  it("expands tapped_hole to thread_pitch + hole dims", () => {
    const r = engine.predict({ ...makeBoxGeom(), featureType: "tapped_hole" });
    const keys = Object.keys(r.parameters).sort();
    expect(keys).toEqual(["hole_depth_mm", "hole_diameter_mm", "thread_pitch_mm"]);
  });

  it("emits 4 outputs for counterbore (hole + cbore dims)", () => {
    const r = engine.predict({ ...makeBoxGeom(), featureType: "counterbore" });
    const keys = Object.keys(r.parameters).sort();
    expect(keys).toEqual([
      "counterbore_depth_mm", "counterbore_diameter_mm", "hole_depth_mm", "hole_diameter_mm",
    ]);
  });
});

describe("CADParameterPredictorEngine — predict() values", () => {
  it("predicts hole_diameter = 0.18 · min(bbox.x,y) per shipped prior", () => {
    const r = engine.predict({ ...makeBoxGeom(80, 60, 40), featureType: "through_hole" });
    expect(r.parameters.hole_diameter_mm!.value).toBeCloseTo(0.18 * 60, 5);
    expect(r.parameters.hole_diameter_mm!.unit).toBe("mm");
  });

  it("predicts hole_depth = 0.85 · bbox_z per shipped prior", () => {
    const r = engine.predict({ ...makeBoxGeom(80, 60, 40), featureType: "blind_hole" });
    expect(r.parameters.hole_depth_mm!.value).toBeCloseTo(0.85 * 40, 5);
  });

  it("predicts countersink_angle = 90° (pure intercept output)", () => {
    const r = engine.predict({ ...makeBoxGeom(), featureType: "countersink" });
    expect(r.parameters.countersink_angle_deg!.value).toBe(90);
    expect(r.parameters.countersink_angle_deg!.unit).toBe("deg");
  });

  it("clamps below minValue and emits warning", () => {
    // hole_diameter_mm: intercept=0, weight=0.18·bbox_min_xy, minValue=0.5.
    // bbox_min_xy=1 → raw 0.18 → clamps to 0.5.
    const tiny = makeBoxGeom(1, 1, 1);
    const r = engine.predict({ ...tiny, featureType: "through_hole" });
    const hd = r.parameters.hole_diameter_mm!;
    expect(hd.value).toBe(0.5);
    expect(hd.warning).toMatch(/clamped to minValue/);
  });

  it("clamps above maxValue and emits warning", () => {
    const huge = makeBoxGeom(2000, 2000, 2000);
    const all = engine.predict(huge);
    const ext = all.parameters.extrusion_depth_mm!;
    expect(ext.value).toBe(500);
    expect(ext.warning).toMatch(/clamped to maxValue/);
  });

  it("ISO 4762 cbore relations: cbore_dia = 1.5·hole, cbore_depth = 1.05·hole", () => {
    const r = engine.predict({ ...makeBoxGeom(40, 30, 20), featureType: "counterbore" });
    const hole = r.parameters.hole_diameter_mm!.value;
    expect(r.parameters.counterbore_diameter_mm!.value).toBeCloseTo(1.5 * hole, 5);
    expect(r.parameters.counterbore_depth_mm!.value).toBeCloseTo(1.05 * hole, 5);
  });

  it("ISO 261 thread pitch ≈ 0.18 · hole_diameter", () => {
    const r = engine.predict({ ...makeBoxGeom(40, 30, 20), featureType: "tapped_hole" });
    const hole = r.parameters.hole_diameter_mm!.value;
    expect(r.parameters.thread_pitch_mm!.value).toBeCloseTo(0.18 * hole, 5);
  });

  it("AtomicValue contract: every prediction has positive uncertainty + nonempty source", () => {
    const r = engine.predict(makeBoxGeom());
    for (const p of Object.values(r.parameters)) {
      expect(typeof p!.value).toBe("number");
      expect(Number.isFinite(p!.value)).toBe(true);
      expect(p!.uncertainty).toBeGreaterThan(0);
      expect(p!.confidence).toBeGreaterThan(0);
      expect(p!.confidence).toBeLessThanOrEqual(1);
      expect(p!.source.length).toBeGreaterThan(10);
    }
  });

  it("confidence drops + uncertainty fraction widens for sliver geometry (aspectRatio > 50)", () => {
    const normal = engine.predict({ ...makeBoxGeom(40, 30, 20), featureType: "blind_hole" });
    const sliver = engine.predict({ ...makeBoxGeom(2000, 30, 20), featureType: "blind_hole" });
    expect(sliver.parameters.hole_diameter_mm!.confidence)
      .toBeLessThan(normal.parameters.hole_diameter_mm!.confidence);
    const fracN = normal.parameters.hole_diameter_mm!.uncertainty / normal.parameters.hole_diameter_mm!.value;
    const fracS = sliver.parameters.hole_diameter_mm!.uncertainty / sliver.parameters.hole_diameter_mm!.value;
    expect(fracS).toBeGreaterThan(fracN);
  });
});

describe("CADParameterPredictorEngine — input validation", () => {
  it("throws on non-positive volume", () => {
    expect(() => engine.predict({ ...makeBoxGeom(), volume_mm3: 0 })).toThrow(/volume_mm3/);
    expect(() => engine.predict({ ...makeBoxGeom(), volume_mm3: -1 })).toThrow(/volume_mm3/);
  });

  it("throws on zero/negative bbox dim", () => {
    const g = makeBoxGeom();
    g.bbox.z_mm = 0;
    expect(() => engine.predict(g)).toThrow(/bbox/);
    const g2 = makeBoxGeom();
    g2.bbox.x_mm = -5;
    expect(() => engine.predict(g2)).toThrow(/bbox/);
  });

  it("throws on negative face/edge count", () => {
    expect(() => engine.predict({ ...makeBoxGeom(), faceCount: -1 })).toThrow(/face/);
    expect(() => engine.predict({ ...makeBoxGeom(), edgeCount: -1 })).toThrow(/edge/);
  });
});

describe("CADParameterPredictorEngine — train()", () => {
  it("rejects fewer than 3 samples", () => {
    expect(() => engine.train([])).toThrow(/≥3 samples/);
    expect(() => engine.train([{ geometry: makeBoxGeom(), truth: {} }])).toThrow(/≥3 samples/);
  });

  it("refits hole_depth coefficients to a synthetic 1.2·z relationship", () => {
    const samples: TrainingSample[] = [];
    for (const z of [10, 20, 30, 40, 50, 60, 70, 80, 90, 100]) {
      samples.push({
        geometry: makeBoxGeom(80, 60, z),
        truth: {
          hole_depth_mm: { value: 1.2 * z, unit: "mm", uncertainty: 0.1, confidence: 1, source: "synthetic" },
        },
      });
    }
    const before = engine.getModelInfo().version;
    const out = engine.train(samples, { corpusName: "test-synthetic" });
    expect(out.updated).toContain("hole_depth_mm");
    expect(out.n).toBe(10);

    const persisted = JSON.parse(readFileSync(tmpModel, "utf8"));
    expect(persisted.version).not.toBe(before);
    expect(persisted.version).toBe("0.1.1");
    expect(persisted.corpusSize).toBe(10);
    expect(typeof persisted.trainedAt).toBe("string");

    engine.reload();
    const r = engine.predict({ ...makeBoxGeom(80, 60, 50), featureType: "blind_hole" });
    expect(r.parameters.hole_depth_mm!.value).toBeCloseTo(60, 0);
  });
});

describe("CADParameterPredictorEngine — evaluate()", () => {
  it("RMSE ≈ 0 on samples that exactly match the prior", () => {
    const samples: TrainingSample[] = [];
    for (const dim of [40, 50, 60, 70, 80]) {
      const g = makeBoxGeom(dim + 20, dim, 30);
      const expected = 0.18 * dim;
      samples.push({
        geometry: g,
        truth: { hole_diameter_mm: { value: expected, unit: "mm", uncertainty: 0, confidence: 1, source: "prior-match" } },
      });
    }
    const report = engine.evaluate(samples);
    expect(report.validationSetSize).toBe(5);
    expect(report.perParam.hole_diameter_mm.rmsePct).toBeLessThan(0.001);
    expect(report.perParam.hole_diameter_mm.n).toBe(5);
    expect(report.passesExitCriterion).toBe(true);
  });

  it("flags failure when truth diverges 30% from prior", () => {
    const samples: TrainingSample[] = [];
    for (const dim of [40, 50, 60, 70, 80]) {
      const g = makeBoxGeom(dim + 20, dim, 30);
      const biased = 0.18 * dim * 1.3;
      samples.push({
        geometry: g,
        truth: { hole_diameter_mm: { value: biased, unit: "mm", uncertainty: 0, confidence: 1, source: "biased" } },
      });
    }
    const report = engine.evaluate(samples);
    expect(report.overall.rmsePct).toBeGreaterThan(20);
    expect(report.overall.rmsePct).toBeLessThan(35);
    expect(report.passesExitCriterion).toBe(false);

    const persisted = JSON.parse(readFileSync(tmpModel, "utf8"));
    expect(persisted.metrics.rmsePct).toBeGreaterThan(20);
    expect(typeof persisted.metrics.lastEvaluatedAt).toBe("string");
  });

  it("rejects empty validation sets", () => {
    expect(() => engine.evaluate([])).toThrow(/empty validation set/);
  });
});

describe("CADParameterPredictorEngine — classification integration", () => {
  it("uses LearningClassification.featureType + .confidence when geometry.featureType is absent", () => {
    const g: TargetGeometry = {
      ...makeBoxGeom(30, 20, 50),
      classification: {
        featureId: "f1",
        featureType: "through_hole",
        geometricFamily: "rotational",
        sizeClass: "small",
        complexityTier: "simple",
        strategyHint: "parametric",
        riskProfile: { volume: 0.2, bbox: 0.2, featureCount: 0.1, topology: 0.2 },
        confidence: 0.92,
        rationale: ["test"],
      },
    };
    const r = engine.predict(g);
    expect(Object.keys(r.parameters).sort()).toEqual(["hole_depth_mm", "hole_diameter_mm"]);
    expect(r.parameters.hole_diameter_mm!.confidence).toBeCloseTo(0.92, 5);
  });
});

describe("CADParameterPredictorEngine — coverage of all 21 FeatureType values", () => {
  it("emits ≥1 parameter for every taxonomy entry, every prediction has a source", () => {
    const allTypes = [
      "through_hole","blind_hole","counterbore","countersink","tapped_hole",
      "pocket_rectangular","pocket_circular","pocket_freeform",
      "slot_through","slot_blind","keyway",
      "boss_circular","boss_rectangular",
      "fillet","chamfer","face","step","groove","thread_external",
      "contour_2d","contour_3d",
    ] as const;
    expect(allTypes.length).toBe(21);
    for (const t of allTypes) {
      const r = engine.predict({ ...makeBoxGeom(), featureType: t });
      expect(Object.keys(r.parameters).length).toBeGreaterThanOrEqual(1);
      for (const p of Object.values(r.parameters)) {
        expect(p!.source.length).toBeGreaterThan(10);
      }
    }
  });
});
