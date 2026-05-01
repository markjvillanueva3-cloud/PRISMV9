/**
 * Tests for MultiSetupFeasibilityChainEngine
 * 18+ tests covering all 4 methods + edge cases
 */
import { describe, it, expect } from "vitest";
import { multiSetupFeasibilityChainEngine as engine } from "../engines/MultiSetupFeasibilityChainEngine.js";

// ============================================================================
// Helper factories
// ============================================================================

function makeFeature(id: string, overrides: Record<string, any> = {}) {
  return {
    id,
    type: overrides.type ?? "pocket",
    dimensions: overrides.dimensions ?? { x: 20, y: 20, z: 10 },
    tolerance: overrides.tolerance ?? 0.05,
    requires_access_from: overrides.requires_access_from ?? ["top"],
    depends_on: overrides.depends_on,
    surface_finish_ra: overrides.surface_finish_ra,
    blocks_access_to: overrides.blocks_access_to,
    setup_options: overrides.setup_options,
    priority: overrides.priority,
  };
}

function makeSetup(id: string, faces: string[], orientation = "top", workholding = "vise") {
  return { id, orientation, workholding, accessible_faces: faces };
}

function makeTool(diameter: number, length: number, type = "endmill") {
  return { diameter, length, type };
}

// ============================================================================
// 1. analyzeFeasibility
// ============================================================================

describe("MultiSetupFeasibilityChainEngine — analyzeFeasibility", () => {
  it("should find a simple 2-setup part feasible", () => {
    const result = engine.analyzeFeasibility({
      features: [
        makeFeature("F1", { requires_access_from: ["top"] }),
        makeFeature("F2", { requires_access_from: ["bottom"] }),
      ],
      available_setups: [
        makeSetup("S1", ["top"]),
        makeSetup("S2", ["bottom"]),
      ],
      tools: [makeTool(10, 50)],
    });

    expect(result.feasible).toBe(true);
    expect(result.setup_sequence.length).toBe(2);
    expect(result.risk_score).toBeLessThan(0.9);
  });

  it("should detect infeasible part when feature unreachable from any setup", () => {
    const result = engine.analyzeFeasibility({
      features: [
        makeFeature("F1", { requires_access_from: ["left", "right"] }),
      ],
      available_setups: [
        makeSetup("S1", ["top"]),
        makeSetup("S2", ["bottom"]),
      ],
      tools: [makeTool(10, 50)],
    });

    expect(result.feasible).toBe(false);
    expect(result.dead_ends.length).toBeGreaterThan(0);
    expect(result.dead_ends.some(d => d.feature_id === "F1")).toBe(true);
  });

  it("should handle single setup with all features on same face", () => {
    const result = engine.analyzeFeasibility({
      features: [
        makeFeature("F1", { requires_access_from: ["top"] }),
        makeFeature("F2", { requires_access_from: ["top"] }),
        makeFeature("F3", { requires_access_from: ["top"] }),
      ],
      available_setups: [makeSetup("S1", ["top"])],
      tools: [makeTool(10, 50)],
    });

    expect(result.feasible).toBe(true);
    expect(result.setup_sequence.length).toBe(1);
    expect(result.setup_sequence[0].features_in_setup.length).toBe(3);
  });

  it("should return infeasible for empty features", () => {
    const result = engine.analyzeFeasibility({
      features: [],
      available_setups: [makeSetup("S1", ["top"])],
      tools: [makeTool(10, 50)],
    });

    expect(result.feasible).toBe(false);
    expect(result.risk_score).toBe(1.0);
  });

  it("should return infeasible for no available setups", () => {
    const result = engine.analyzeFeasibility({
      features: [makeFeature("F1")],
      available_setups: [],
      tools: [makeTool(10, 50)],
    });

    expect(result.feasible).toBe(false);
  });

  it("should handle 3-setup part with datum chain degradation", () => {
    const result = engine.analyzeFeasibility({
      features: [
        makeFeature("F1", { requires_access_from: ["top"], tolerance: 0.02 }),
        makeFeature("F2", { requires_access_from: ["left"], tolerance: 0.02, depends_on: ["F1"] }),
        makeFeature("F3", { requires_access_from: ["bottom"], tolerance: 0.02, depends_on: ["F2"] }),
      ],
      available_setups: [
        makeSetup("S1", ["top"], "top"),
        makeSetup("S2", ["left"], "left"),
        makeSetup("S3", ["bottom"], "bottom"),
      ],
      tools: [makeTool(10, 50)],
    });

    expect(result.feasible).toBe(true);
    expect(result.setup_sequence.length).toBe(3);
    expect(result.datum_chain_error_mm).toBeGreaterThan(0);
    expect(result.critical_path).toEqual(["F1", "F2", "F3"]);
  });

  it("should respect machine travel limits", () => {
    const result = engine.analyzeFeasibility({
      features: [
        makeFeature("F1", { dimensions: { x: 500, y: 500, z: 200 }, requires_access_from: ["top"] }),
      ],
      available_setups: [makeSetup("S1", ["top"])],
      tools: [makeTool(10, 250)],
      machine: { x_travel: 300, y_travel: 300, z_travel: 300 },
    });

    expect(result.feasible).toBe(false);
  });

  it("should detect tool too short", () => {
    const result = engine.analyzeFeasibility({
      features: [
        makeFeature("F1", { dimensions: { x: 10, y: 10, z: 100 }, requires_access_from: ["top"] }),
      ],
      available_setups: [makeSetup("S1", ["top"])],
      tools: [makeTool(10, 20)], // too short for 100mm depth + 5mm clearance
    });

    expect(result.feasible).toBe(false);
  });
});

// ============================================================================
// 2. checkDatumChain
// ============================================================================

describe("MultiSetupFeasibilityChainEngine — checkDatumChain", () => {
  it("should compute RSS datum chain error correctly", () => {
    const result = engine.checkDatumChain({
      setups: [
        { datum_features: ["D1"], positioning_error_mm: 0.01, repeatability_mm: 0.005 },
        { datum_features: ["D2"], positioning_error_mm: 0.01, repeatability_mm: 0.005 },
      ],
      critical_tolerance: 0.1,
    });

    // Each setup: √(0.01² + 0.005²) = √(0.000125) ≈ 0.01118
    // RSS: √(0.01118² + 0.01118²) = √(2 * 0.000125) ≈ 0.01581
    expect(result.cumulative_rss_error_mm).toBeCloseTo(0.01581, 4);
    expect(result.worst_case_error_mm).toBeCloseTo(0.02236, 4);
    expect(result.tolerance_met).toBe(true);
    expect(result.probability_meeting_tolerance).toBeGreaterThan(0.9);
  });

  it("should detect tolerance violation for tight tolerance", () => {
    const result = engine.checkDatumChain({
      setups: [
        { datum_features: ["D1"], positioning_error_mm: 0.02, repeatability_mm: 0.01 },
        { datum_features: ["D2"], positioning_error_mm: 0.02, repeatability_mm: 0.01 },
        { datum_features: ["D3"], positioning_error_mm: 0.02, repeatability_mm: 0.01 },
      ],
      critical_tolerance: 0.01, // very tight
    });

    expect(result.tolerance_met).toBe(false);
    expect(result.margin_mm).toBeLessThan(0);
  });

  it("should handle empty setups", () => {
    const result = engine.checkDatumChain({
      setups: [],
      critical_tolerance: 0.1,
    });

    expect(result.cumulative_rss_error_mm).toBe(0);
    expect(result.tolerance_met).toBe(true);
  });

  it("should compute per-setup contribution percentages", () => {
    const result = engine.checkDatumChain({
      setups: [
        { datum_features: ["D1"], positioning_error_mm: 0.01, repeatability_mm: 0.005 },
        { datum_features: ["D2"], positioning_error_mm: 0.02, repeatability_mm: 0.01 },
      ],
      critical_tolerance: 0.5,
    });

    expect(result.per_setup_contribution.length).toBe(2);
    // Second setup has larger error, so higher percentage
    expect(result.per_setup_contribution[1].pct_of_total).toBeGreaterThan(
      result.per_setup_contribution[0].pct_of_total
    );
    const totalPct = result.per_setup_contribution.reduce((s, c) => s + c.pct_of_total, 0);
    expect(totalPct).toBeCloseTo(100, -1); // approximately 100%
  });
});

// ============================================================================
// 3. findOptimalSequence
// ============================================================================

describe("MultiSetupFeasibilityChainEngine — findOptimalSequence", () => {
  it("should find optimal sequence with constraints", () => {
    const result = engine.findOptimalSequence({
      features: [
        { id: "F1", setup_options: ["S1", "S2"] },
        { id: "F2", setup_options: ["S1", "S2"] },
        { id: "F3", setup_options: ["S2"] },
      ],
      constraints: [{ before: "F1", after: "F2" }],
      optimization: "min_setups",
    });

    expect(result.optimal_sequence.length).toBe(3);
    // F1 must come before F2
    expect(result.optimal_sequence.indexOf("F1")).toBeLessThan(
      result.optimal_sequence.indexOf("F2")
    );
  });

  it("should detect circular dependencies", () => {
    const result = engine.findOptimalSequence({
      features: [
        { id: "F1", setup_options: ["S1"] },
        { id: "F2", setup_options: ["S1"] },
      ],
      constraints: [
        { before: "F1", after: "F2" },
        { before: "F2", after: "F1" },
      ],
      optimization: "min_setups",
    });

    expect(result.eliminated.length).toBeGreaterThan(0);
    expect(result.eliminated[0].reason).toContain("Circular dependency");
  });

  it("should handle no constraints", () => {
    const result = engine.findOptimalSequence({
      features: [
        { id: "F1", setup_options: ["S1"] },
        { id: "F2", setup_options: ["S1"] },
      ],
      constraints: [],
      optimization: "min_setups",
    });

    expect(result.optimal_sequence.length).toBe(2);
    expect(result.cost).toBeDefined();
  });

  it("should handle empty features", () => {
    const result = engine.findOptimalSequence({
      features: [],
      constraints: [],
      optimization: "min_setups",
    });

    expect(result.optimal_sequence).toEqual([]);
    expect(result.cost).toBe(0);
  });

  it("should provide alternatives within 10% cost", () => {
    const result = engine.findOptimalSequence({
      features: [
        { id: "F1", setup_options: ["S1", "S2"] },
        { id: "F2", setup_options: ["S1", "S2"] },
        { id: "F3", setup_options: ["S1", "S2"] },
      ],
      constraints: [],
      optimization: "min_setups",
    });

    // With no constraints, multiple orderings should exist
    expect(result.optimal_sequence.length).toBe(3);
    // Alternatives should have cost_delta_pct <= 10
    for (const alt of result.alternatives) {
      expect(alt.cost_delta_pct).toBeLessThanOrEqual(10);
    }
  });
});

// ============================================================================
// 4. detectDeadEnds
// ============================================================================

describe("MultiSetupFeasibilityChainEngine — detectDeadEnds", () => {
  it("should detect pocket blocking hole access", () => {
    const result = engine.detectDeadEnds({
      features: [
        { id: "pocket", blocks_access_to: ["hole"] },
        { id: "hole" },
      ],
    });

    expect(result.dead_ends.length).toBeGreaterThan(0);
    expect(result.dead_ends.some(d => d.feature_id === "hole")).toBe(true);
    expect(result.dead_ends[0].resolution).toBeTruthy();
  });

  it("should detect no dead-ends for independent features", () => {
    const result = engine.detectDeadEnds({
      features: [
        { id: "F1" },
        { id: "F2" },
        { id: "F3" },
      ],
    });

    expect(result.dead_ends.length).toBe(0);
    expect(result.has_cycles).toBe(false);
  });

  it("should produce topological order for dependency chain", () => {
    const result = engine.detectDeadEnds({
      features: [
        { id: "F3", depends_on: ["F2"] },
        { id: "F2", depends_on: ["F1"] },
        { id: "F1" },
      ],
    });

    expect(result.topological_order).toEqual(["F1", "F2", "F3"]);
    expect(result.dependency_graph.length).toBe(2);
  });

  it("should detect cycles in dependency graph", () => {
    const result = engine.detectDeadEnds({
      features: [
        { id: "A", depends_on: ["C"] },
        { id: "B", depends_on: ["A"] },
        { id: "C", depends_on: ["B"] },
      ],
    });

    expect(result.has_cycles).toBe(true);
    expect(result.cycle_members).toBeDefined();
    expect(result.cycle_members!.length).toBe(3);
  });

  it("should handle empty features", () => {
    const result = engine.detectDeadEnds({ features: [] });

    expect(result.dead_ends).toEqual([]);
    expect(result.topological_order).toEqual([]);
    expect(result.has_cycles).toBe(false);
  });

  it("should provide resolution suggestions for dead-ends", () => {
    const result = engine.detectDeadEnds({
      features: [
        { id: "bore", blocks_access_to: ["internal_thread"] },
        { id: "internal_thread" },
      ],
    });

    for (const de of result.dead_ends) {
      expect(de.resolution.length).toBeGreaterThan(0);
    }
  });
});

// ============================================================================
// 5. calculate() generic entry point
// ============================================================================

describe("MultiSetupFeasibilityChainEngine — calculate()", () => {
  it("should route to analyzeFeasibility by default", () => {
    const result = engine.calculate({
      features: [makeFeature("F1")],
      available_setups: [makeSetup("S1", ["top"])],
      tools: [makeTool(10, 50)],
    });

    expect(result.feasible).toBeDefined();
  });

  it("should route to checkDatumChain", () => {
    const result = engine.calculate({
      method: "checkDatumChain",
      setups: [{ datum_features: ["D1"], positioning_error_mm: 0.01, repeatability_mm: 0.005 }],
      critical_tolerance: 0.1,
    });

    expect(result.cumulative_rss_error_mm).toBeDefined();
  });

  it("should return error for unknown method", () => {
    const result = engine.calculate({ method: "nonExistentMethod" });
    expect(result.error).toContain("Unknown method");
  });
});
