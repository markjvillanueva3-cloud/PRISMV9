/**
 * MultiSetupPlannerEngine Tests — CAMK-MS3/U05
 * Tests part orientation + fixturing optimization
 */
import { describe, it, expect } from "vitest";
import { multiSetupPlannerEngine, type Feature, type SetupPlannerInput } from "../engines/MultiSetupPlannerEngine.js";

const PART_BOUNDS = { min_x: -50, min_y: -50, min_z: -25, max_x: 50, max_y: 50, max_z: 25 };

function makeFeature(id: string, access: { x: number; y: number; z: number }, opts: Partial<Feature> = {}): Feature {
  return {
    id,
    type: opts.type ?? "pocket",
    access_direction: access,
    position: opts.position ?? { x: 0, y: 0, z: 0 },
    dimensions: opts.dimensions ?? { width: 20, length: 20, depth: 10 },
    tolerance_mm: opts.tolerance_mm,
    surface_finish_ra: opts.surface_finish_ra,
    is_datum: opts.is_datum,
  };
}

describe("MultiSetupPlannerEngine", () => {
  // ---- Visibility analysis ----
  it("features facing up are accessible from +Z orientation", () => {
    const features = [makeFeature("top_pocket", { x: 0, y: 0, z: 1 })];
    const orientations = [{ name: "+Z (top)", direction: { x: 0, y: 0, z: 1 } }];
    const vis = multiSetupPlannerEngine.visibilityAnalysis(features, orientations);
    expect(vis.get("+Z (top)")).toContain("top_pocket");
  });

  it("features facing down are not accessible from +Z", () => {
    const features = [makeFeature("bottom_pocket", { x: 0, y: 0, z: -1 })];
    const orientations = [{ name: "+Z (top)", direction: { x: 0, y: 0, z: 1 } }];
    const vis = multiSetupPlannerEngine.visibilityAnalysis(features, orientations);
    expect(vis.get("+Z (top)")).not.toContain("bottom_pocket");
  });

  // ---- Stability analysis ----
  it("stability check passes with sufficient clamping", () => {
    const orient = { name: "+Z (top)", direction: { x: 0, y: 0, z: 1 } };
    const result = multiSetupPlannerEngine.stabilityCheck(orient, 1000, 5000);
    expect(result.stable).toBe(true);
    expect(result.margin).toBeGreaterThanOrEqual(1.0);
  });

  it("stability check fails with insufficient clamping", () => {
    const orient = { name: "+Z (top)", direction: { x: 0, y: 0, z: 1 } };
    const result = multiSetupPlannerEngine.stabilityCheck(orient, 5000, 1000);
    expect(result.stable).toBe(false);
    expect(result.margin).toBeLessThan(1.0);
  });

  // ---- Single setup part (all features face up) ----
  it("simple top-only part needs 1 setup", () => {
    const features = [
      makeFeature("f1", { x: 0, y: 0, z: 1 }, { type: "pocket" }),
      makeFeature("f2", { x: 0, y: 0, z: 1 }, { type: "hole" }),
      makeFeature("f3", { x: 0, y: 0, z: 1 }, { type: "surface" }),
    ];
    const result = multiSetupPlannerEngine.plan({ features, part_bounds: PART_BOUNDS });
    expect(result.setup_count).toBe(1);
    expect(result.covered_features).toBe(3);
    expect(result.uncovered_features).toHaveLength(0);
  });

  // ---- Multi-setup part ----
  it("6-sided part needs multiple setups", () => {
    const features = [
      makeFeature("top", { x: 0, y: 0, z: 1 }, { type: "pocket" }),
      makeFeature("bottom", { x: 0, y: 0, z: -1 }, { type: "surface" }),
      makeFeature("front", { x: 0, y: -1, z: 0 }, { type: "slot" }),
      makeFeature("back", { x: 0, y: 1, z: 0 }, { type: "hole" }),
      makeFeature("left", { x: -1, y: 0, z: 0 }, { type: "profile" }),
      makeFeature("right", { x: 1, y: 0, z: 0 }, { type: "surface" }),
    ];
    const result = multiSetupPlannerEngine.plan({ features, part_bounds: PART_BOUNDS });
    expect(result.setup_count).toBeGreaterThan(1);
    expect(result.covered_features).toBe(6);
    expect(result.uncovered_features).toHaveLength(0);
  });

  // ---- Datum chain tolerance ----
  it("datum chain grows with setup count", () => {
    const features = [
      makeFeature("f1", { x: 0, y: 0, z: 1 }, { type: "pocket" }),
      makeFeature("f2", { x: 0, y: -1, z: 0 }, { type: "slot" }),
      makeFeature("f3", { x: 1, y: 0, z: 0 }, { type: "surface" }),
    ];
    const result = multiSetupPlannerEngine.plan({ features, part_bounds: PART_BOUNDS });
    if (result.setup_count > 1) {
      expect(result.datum_chain.length).toBe(result.setup_count - 1);
    }
    expect(result.total_tolerance_stack_mm).toBeGreaterThanOrEqual(0);
  });

  // ---- Monte Carlo tolerance ----
  it("Monte Carlo tolerance produces positive stack", () => {
    const features = [
      makeFeature("f1", { x: 0, y: 0, z: 1 }),
      makeFeature("f2", { x: 0, y: 0, z: -1 }),
      makeFeature("f3", { x: 0, y: -1, z: 0 }),
    ];
    const result = multiSetupPlannerEngine.plan({
      features, part_bounds: PART_BOUNDS, monte_carlo_samples: 5000,
    });
    if (result.setup_count > 1) {
      expect(result.total_tolerance_stack_mm).toBeGreaterThan(0);
    }
  });

  // ---- Algorithm recommendations ----
  it("recommends appropriate algorithms per feature type", () => {
    const features = [
      makeFeature("s1", { x: 0, y: 0, z: 1 }, { type: "pocket", tolerance_mm: 0.02 }),
      makeFeature("s2", { x: 0, y: 0, z: 1 }, { type: "hole" }),
      makeFeature("s3", { x: 0, y: 0, z: 1 }, { type: "surface" }),
    ];
    const result = multiSetupPlannerEngine.plan({ features, part_bounds: PART_BOUNDS });
    expect(result.setups[0].recommended_algorithms.length).toBeGreaterThan(0);
  });

  // ---- Greedy set cover ----
  it("greedy set cover selects minimum orientations", () => {
    const allFeatures = ["f1", "f2", "f3"];
    const orientMap = new Map([
      ["A", ["f1", "f2"]],
      ["B", ["f2", "f3"]],
      ["C", ["f1"]],
    ]);
    const selected = multiSetupPlannerEngine.greedySetCover(allFeatures, orientMap);
    expect(selected.length).toBeLessThanOrEqual(2); // A+B covers all
    // Verify all features covered
    const covered = new Set<string>();
    for (const name of selected) {
      orientMap.get(name)!.forEach(id => covered.add(id));
    }
    expect(covered.size).toBe(3);
  });

  // ---- Empty features ----
  it("handles empty features", () => {
    const result = multiSetupPlannerEngine.plan({ features: [], part_bounds: PART_BOUNDS });
    expect(result.setup_count).toBe(0);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  // ---- Datum surfaces preferred ----
  it("uses datum-marked features as datum face", () => {
    const features = [
      makeFeature("f1", { x: 0, y: 0, z: 1 }),
      makeFeature("datum_a", { x: 0, y: 0, z: 1 }, { is_datum: true }),
      makeFeature("f3", { x: 0, y: 0, z: 1 }),
    ];
    const result = multiSetupPlannerEngine.plan({ features, part_bounds: PART_BOUNDS });
    expect(result.setups[0].datum_face).toBe("datum_a");
  });

  // ---- Warnings ----
  it("includes warnings array", () => {
    const features = [
      makeFeature("f1", { x: 0, y: 0, z: 1 }),
      makeFeature("f2", { x: 0, y: 0, z: -1 }),
      makeFeature("f3", { x: 0, y: -1, z: 0 }),
      makeFeature("f4", { x: 0, y: 1, z: 0 }),
    ];
    const result = multiSetupPlannerEngine.plan({ features, part_bounds: PART_BOUNDS });
    expect(Array.isArray(result.warnings)).toBe(true);
  });

  // ---- Formula string ----
  it("includes formula in result", () => {
    const features = [makeFeature("f1", { x: 0, y: 0, z: 1 })];
    const result = multiSetupPlannerEngine.plan({ features, part_bounds: PART_BOUNDS });
    expect(result.formula).toContain("totalStack");
  });

  // ---- Stability margin in setups ----
  it("each setup has stability margin", () => {
    const features = [
      makeFeature("f1", { x: 0, y: 0, z: 1 }, { type: "pocket" }),
    ];
    const result = multiSetupPlannerEngine.plan({ features, part_bounds: PART_BOUNDS });
    expect(result.setups[0].stability_margin).toBeGreaterThan(0);
  });

  // ---- Tolerance within spec ----
  it("reports tolerance spec compliance", () => {
    const features = [
      makeFeature("f1", { x: 0, y: 0, z: 1 }),
      makeFeature("f2", { x: 0, y: 0, z: -1 }),
    ];
    const result = multiSetupPlannerEngine.plan({ features, part_bounds: PART_BOUNDS });
    expect(typeof result.tolerance_stack_within_spec).toBe("boolean");
  });
});
