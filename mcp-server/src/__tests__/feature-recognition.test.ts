/**
 * FeatureRecognitionEngine Tests — CAMX-V17-P0A/U04 (final unit)
 * Standalone unit coverage for FeatureRecognitionEngine.recognize/classify
 * and private pattern detection exposed via the recognize() result.
 */
import { describe, it, expect } from "vitest";
import {
  featureRecognitionEngine,
  type FeatureType,
  type FeatureDimensions,
  type RecognizedFeature,
} from "../engines/FeatureRecognitionEngine.js";

const mkInput = (
  type: FeatureType,
  dimensions: FeatureDimensions,
  position: { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 },
) => ({ type, dimensions, position });

describe("FeatureRecognitionEngine.recognize", () => {
  it("recognizes a single through_hole with high confidence", () => {
    const result = featureRecognitionEngine.recognize([
      mkInput("through_hole", { diameter_mm: 10, depth_mm: 20 }),
    ]);
    expect(result.total_features).toBe(1);
    expect(result.features[0].type).toBe("through_hole");
    expect(result.features[0].confidence).toBeCloseTo(0.95, 5);
    expect(result.features[0].id).toBe("F001");
  });

  it("assigns sequential zero-padded IDs (F001, F002, F003)", () => {
    const result = featureRecognitionEngine.recognize([
      mkInput("through_hole", { diameter_mm: 6 }),
      mkInput("through_hole", { diameter_mm: 8 }),
      mkInput("chamfer", { length_mm: 20, depth_mm: 2 }),
    ]);
    expect(result.features.map(f => f.id)).toEqual(["F001", "F002", "F003"]);
  });

  it("recognizes multiple heterogeneous features", () => {
    const result = featureRecognitionEngine.recognize([
      mkInput("pocket_rectangular", { length_mm: 50, width_mm: 40, depth_mm: 10 }),
      mkInput("blind_hole", { diameter_mm: 5, depth_mm: 12 }),
      mkInput("face", { length_mm: 100, width_mm: 80 }),
    ]);
    expect(result.total_features).toBe(3);
    const types = new Set(result.features.map(f => f.type));
    expect(types.has("pocket_rectangular")).toBe(true);
    expect(types.has("blind_hole")).toBe(true);
    expect(types.has("face")).toBe(true);
  });

  it("warns on very small diameter (< 1 mm)", () => {
    const result = featureRecognitionEngine.recognize([
      mkInput("through_hole", { diameter_mm: 0.5, depth_mm: 3 }),
    ]);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]).toMatch(/micro-machining/);
  });

  it("warns when L/D > 10 (deep hole) and adds engine note", () => {
    const result = featureRecognitionEngine.recognize([
      mkInput("through_hole", { diameter_mm: 3, depth_mm: 45 }), // L/D = 15
    ]);
    expect(result.warnings.some(w => /L\/D/.test(w))).toBe(true);
    expect(result.features[0].notes.some(n => /peck drilling|gun drilling/i.test(n))).toBe(true);
  });

  it("does not warn when L/D ≤ 10", () => {
    const result = featureRecognitionEngine.recognize([
      mkInput("through_hole", { diameter_mm: 5, depth_mm: 25 }), // L/D = 5
    ]);
    expect(result.warnings.some(w => /L\/D/.test(w))).toBe(false);
    expect(result.features[0].notes).toEqual([]);
  });

  it("returns total_features = 0 and no warnings for empty input", () => {
    const result = featureRecognitionEngine.recognize([]);
    expect(result.total_features).toBe(0);
    expect(result.features).toEqual([]);
    expect(result.warnings).toEqual([]);
    expect(result.groups).toEqual([]);
  });

  it("sums estimated_operations across features", () => {
    // counterbore → 2 ops, chamfer → 1 op → total 3
    const result = featureRecognitionEngine.recognize([
      mkInput("counterbore", { diameter_mm: 10, depth_mm: 5 }),
      mkInput("chamfer", { length_mm: 30, depth_mm: 1 }),
    ]);
    expect(result.estimated_operations).toBe(3);
  });

  it("produces complexity_score inside [0, 10]", () => {
    const many = Array.from({ length: 20 }, (_, i) =>
      mkInput("pocket_freeform", { length_mm: 50, width_mm: 50, depth_mm: 20 }, { x: i * 10, y: 0, z: 0 }),
    );
    const result = featureRecognitionEngine.recognize(many);
    expect(result.complexity_score).toBeGreaterThanOrEqual(0);
    expect(result.complexity_score).toBeLessThanOrEqual(10);
  });

  it("rounds complexity_score to one decimal place", () => {
    const result = featureRecognitionEngine.recognize([
      mkInput("through_hole", { diameter_mm: 8 }),
      mkInput("pocket_rectangular", { length_mm: 50, width_mm: 50, depth_mm: 10 }),
    ]);
    // 0.3 (simple) + 0.6 (moderate) = 0.9
    expect(result.complexity_score).toBeCloseTo(0.9, 5);
  });

  it("preserves input position in recognized feature", () => {
    const result = featureRecognitionEngine.recognize([
      mkInput("blind_hole", { diameter_mm: 6, depth_mm: 10 }, { x: 12.5, y: -7.25, z: 3 }),
    ]);
    expect(result.features[0].position).toEqual({ x: 12.5, y: -7.25, z: 3 });
  });

  it("defaults orientation axis to z", () => {
    const result = featureRecognitionEngine.recognize([
      mkInput("through_hole", { diameter_mm: 10 }),
    ]);
    expect(result.features[0].orientation.axis).toBe("z");
  });
});

describe("FeatureRecognitionEngine.classify", () => {
  const baseFeature = (overrides: Partial<RecognizedFeature> = {}): RecognizedFeature => ({
    id: "F001",
    type: "through_hole",
    confidence: 0.95,
    dimensions: { diameter_mm: 20, depth_mm: 20 },
    position: { x: 0, y: 0, z: 0 },
    orientation: { axis: "z" },
    notes: [],
    ...overrides,
  });

  it("classifies a simple through_hole with rule-based difficulty", () => {
    const c = featureRecognitionEngine.classify(baseFeature());
    expect(c.feature_id).toBe("F001");
    expect(c.primary_type).toBe("through_hole");
    expect(c.manufacturing_difficulty).toBe("simple");
    expect(c.required_operations).toContain("drilling");
    expect(c.tool_requirements).toContain("twist_drill");
    expect(c.accessibility).toBe("open");
  });

  it("classifies pocket_freeform as complex", () => {
    const c = featureRecognitionEngine.classify(
      baseFeature({ type: "pocket_freeform", dimensions: { length_mm: 80, width_mm: 60, depth_mm: 15 } }),
    );
    expect(c.manufacturing_difficulty).toBe("complex");
    expect(c.tool_requirements).toEqual(expect.arrayContaining(["end_mill", "ball_mill"]));
  });

  it("scales cycle time with diameter above 20mm reference", () => {
    const small = featureRecognitionEngine.classify(baseFeature({ dimensions: { diameter_mm: 10, depth_mm: 20 } }));
    const large = featureRecognitionEngine.classify(baseFeature({ dimensions: { diameter_mm: 60, depth_mm: 20 } }));
    expect(large.estimated_cycle_time_sec).toBeGreaterThan(small.estimated_cycle_time_sec);
  });

  it("scales cycle time with depth above 20mm reference", () => {
    const shallow = featureRecognitionEngine.classify(baseFeature({ dimensions: { diameter_mm: 20, depth_mm: 10 } }));
    const deep = featureRecognitionEngine.classify(baseFeature({ dimensions: { diameter_mm: 20, depth_mm: 80 } }));
    expect(deep.estimated_cycle_time_sec).toBeGreaterThan(shallow.estimated_cycle_time_sec);
  });

  it("returns integer cycle time (rounded)", () => {
    const c = featureRecognitionEngine.classify(baseFeature());
    expect(Number.isInteger(c.estimated_cycle_time_sec)).toBe(true);
  });

  it("keyway classified as restricted accessibility", () => {
    const c = featureRecognitionEngine.classify(baseFeature({ type: "keyway", dimensions: { length_mm: 30, width_mm: 6, depth_mm: 4 } }));
    expect(c.accessibility).toBe("restricted");
    expect(c.tool_requirements).toContain("keyway_cutter");
  });
});

describe("FeatureRecognitionEngine pattern detection (via recognize)", () => {
  it("detects linear X-axis hole pattern (Y and Z aligned)", () => {
    const result = featureRecognitionEngine.recognize([
      mkInput("through_hole", { diameter_mm: 8 }, { x: 0, y: 50, z: 0 }),
      mkInput("through_hole", { diameter_mm: 8 }, { x: 25, y: 50, z: 0 }),
      mkInput("through_hole", { diameter_mm: 8 }, { x: 50, y: 50, z: 0 }),
      mkInput("through_hole", { diameter_mm: 8 }, { x: 75, y: 50, z: 0 }),
    ]);
    expect(result.groups.length).toBe(1);
    const g = result.groups[0];
    expect(g.pattern_type).toBe("linear");
    expect(g.pattern_count).toBe(4);
    expect(g.pattern_spacing_mm).toBeCloseTo(25, 2);
  });

  it("detects linear Y-axis hole pattern (X and Z aligned)", () => {
    const result = featureRecognitionEngine.recognize([
      mkInput("blind_hole", { diameter_mm: 4, depth_mm: 6 }, { x: 10, y: 0, z: 0 }),
      mkInput("blind_hole", { diameter_mm: 4, depth_mm: 6 }, { x: 10, y: 15, z: 0 }),
      mkInput("blind_hole", { diameter_mm: 4, depth_mm: 6 }, { x: 10, y: 30, z: 0 }),
    ]);
    const g = result.groups.find(x => x.pattern_type === "linear");
    expect(g).toBeDefined();
    expect(g!.pattern_spacing_mm).toBeCloseTo(15, 2);
    expect(g!.pattern_count).toBe(3);
  });

  it("does not group singleton features", () => {
    const result = featureRecognitionEngine.recognize([
      mkInput("through_hole", { diameter_mm: 5 }, { x: 0, y: 0, z: 0 }),
      mkInput("chamfer", { length_mm: 10, depth_mm: 1 }, { x: 50, y: 50, z: 0 }),
    ]);
    expect(result.groups.length).toBe(0);
  });

  it("groups 3+ same-type features even without strict alignment", () => {
    // 3 holes scattered — not X-linear, not Y-linear, but ≥3 of same type → group (pattern_type 'none')
    const result = featureRecognitionEngine.recognize([
      mkInput("through_hole", { diameter_mm: 6 }, { x: 0, y: 0, z: 0 }),
      mkInput("through_hole", { diameter_mm: 6 }, { x: 20, y: 15, z: 0 }),
      mkInput("through_hole", { diameter_mm: 6 }, { x: 35, y: 35, z: 0 }),
    ]);
    expect(result.groups.length).toBe(1);
    expect(result.groups[0].pattern_count).toBe(3);
    expect(result.groups[0].pattern_type).toBe("none");
  });

  it("separates groups by feature type", () => {
    const result = featureRecognitionEngine.recognize([
      mkInput("through_hole", { diameter_mm: 6 }, { x: 0, y: 10, z: 0 }),
      mkInput("through_hole", { diameter_mm: 6 }, { x: 20, y: 10, z: 0 }),
      mkInput("through_hole", { diameter_mm: 6 }, { x: 40, y: 10, z: 0 }),
      mkInput("blind_hole", { diameter_mm: 4, depth_mm: 5 }, { x: 0, y: 50, z: 0 }),
      mkInput("blind_hole", { diameter_mm: 4, depth_mm: 5 }, { x: 15, y: 50, z: 0 }),
      mkInput("blind_hole", { diameter_mm: 4, depth_mm: 5 }, { x: 30, y: 50, z: 0 }),
    ]);
    expect(result.groups.length).toBe(2);
    const types = result.groups.map(g => g.features[0].type).sort();
    expect(types).toEqual(["blind_hole", "through_hole"]);
  });
});
