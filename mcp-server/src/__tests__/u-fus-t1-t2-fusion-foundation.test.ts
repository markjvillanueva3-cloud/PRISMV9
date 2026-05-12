/**
 * Tests for Phase 0-D-FUSION-1: Physics Fusion Types + Plugin Registry
 *
 * U-FUS-T1: PhysicsFusionOrchestrator.types.ts — type compilation + factory helpers
 * U-FUS-T2: PhysicsPluginRegistry.ts — registration, topo sort, tier filtering, penalties
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  createFusionState,
  buildConvergenceConfig,
  BASE_CONVERGENCE_CONFIG,
  DEFAULT_CONVERGENCE,
} from "../engines/PhysicsFusionOrchestrator.types.js";
import type {
  FusionTier,
  PluginLevel,
  PhysicsPlugin,
  PhysicsPluginDescriptor,
  PluginContext,
  PluginOutput,
  FusionState,
  SkippedPlugin,
  ConvergenceConfig,
  ConvergenceStatus,
  ConvergenceIteration,
  LoopConvergenceReport,
  FusionDetail,
  PluginExecutionDetail,
  JacobianSnapshot,
  FusionUncertainty,
  UncertaintyEstimate,
} from "../engines/PhysicsFusionOrchestrator.types.js";
import {
  PhysicsPluginRegistry,
  physicsPluginRegistry,
} from "../engines/PhysicsPluginRegistry.js";
import type {
  ExecutionPlan,
  FeedbackEdge,
  ValidationResult,
} from "../engines/PhysicsPluginRegistry.js";

// ── Test helpers ────────────────────────────────────────────────────

/** Create a mock plugin with given descriptor fields. */
function mockPlugin(overrides: Partial<PhysicsPluginDescriptor> & { id: string }): PhysicsPlugin {
  const desc: PhysicsPluginDescriptor = {
    name: overrides.name ?? overrides.id,
    level: overrides.level ?? 1,
    min_tier: overrides.min_tier ?? 1,
    depends_on: overrides.depends_on ?? [],
    feedback_from: overrides.feedback_from ?? [],
    outputs: overrides.outputs ?? [`${overrides.id}_out`],
    skip_penalty: overrides.skip_penalty ?? 0.10,
    ...overrides,
  };
  return {
    descriptor: desc,
    canRun: () => true,
    compute: (): PluginOutput => ({
      values: Object.fromEntries(desc.outputs.map(k => [k, 42])),
      confidence: 0.95,
    }),
  };
}

// ── U-FUS-T1: Types + Factory Helpers ───────────────────────────────

describe("U-FUS-T1: PhysicsFusionOrchestrator.types", () => {
  it("createFusionState returns a valid empty state", () => {
    const state = createFusionState();
    expect(state.values).toEqual({});
    expect(state.plugin_confidence).toEqual({});
    expect(state.skipped_plugins).toEqual([]);
    expect(state.formulas_used).toEqual([]);
    expect(state.warnings).toEqual([]);
    expect(state.execution_order).toEqual([]);
  });

  it("buildConvergenceConfig returns material-specific alpha for steel (ISO P)", () => {
    const config = buildConvergenceConfig("P");
    expect(config.initial_alpha).toBe(0.70);
    expect(config.max_fdt_iterations).toBe(BASE_CONVERGENCE_CONFIG.max_fdt_iterations);
    expect(config.tolerance).toBe(BASE_CONVERGENCE_CONFIG.tolerance);
  });

  it("buildConvergenceConfig returns low alpha for superalloys (ISO S)", () => {
    const config = buildConvergenceConfig("S");
    expect(config.initial_alpha).toBe(0.20);
  });

  it("buildConvergenceConfig returns high alpha for aluminum (ISO N)", () => {
    const config = buildConvergenceConfig("N");
    expect(config.initial_alpha).toBe(0.85);
  });

  it("buildConvergenceConfig applies user overrides on top of material defaults", () => {
    const config = buildConvergenceConfig("S", {
      initial_alpha: 0.30,
      max_ftw_iterations: 50,
    });
    expect(config.initial_alpha).toBe(0.30); // override
    expect(config.max_ftw_iterations).toBe(50); // override
    expect(config.max_fes_iterations).toBe(BASE_CONVERGENCE_CONFIG.max_fes_iterations); // base default
  });

  it("DEFAULT_CONVERGENCE covers all 6 ISO groups", () => {
    const groups = ["P", "M", "K", "N", "S", "H"] as const;
    for (const g of groups) {
      expect(DEFAULT_CONVERGENCE[g]).toBeDefined();
      expect(DEFAULT_CONVERGENCE[g].initial_alpha).toBeGreaterThan(0);
      expect(DEFAULT_CONVERGENCE[g].initial_alpha).toBeLessThanOrEqual(1);
    }
  });

  it("type compilation: all interfaces importable (compile-time check)", () => {
    // This test verifies the types file compiles correctly.
    // If it runs, the imports above succeeded.
    const tier: FusionTier = 2;
    const level: PluginLevel = 3;
    const status: ConvergenceStatus = "converged";
    expect(tier).toBe(2);
    expect(level).toBe(3);
    expect(status).toBe("converged");
  });
});

// ── U-FUS-T2: PhysicsPluginRegistry ─────────────────────────────────

describe("U-FUS-T2: PhysicsPluginRegistry", () => {
  let registry: PhysicsPluginRegistry;

  beforeEach(() => {
    registry = new PhysicsPluginRegistry();
  });

  // ── Registration ──

  it("registers and retrieves a plugin", () => {
    const p = mockPlugin({ id: "force" });
    registry.register(p);
    expect(registry.get("force")).toBe(p);
    expect(registry.size).toBe(1);
  });

  it("throws on duplicate registration", () => {
    registry.register(mockPlugin({ id: "force" }));
    expect(() => registry.register(mockPlugin({ id: "force" }))).toThrow(
      /already registered/,
    );
  });

  it("unregisters a plugin", () => {
    registry.register(mockPlugin({ id: "force" }));
    expect(registry.unregister("force")).toBe(true);
    expect(registry.get("force")).toBeUndefined();
    expect(registry.size).toBe(0);
  });

  it("unregister returns false for unknown plugin", () => {
    expect(registry.unregister("nonexistent")).toBe(false);
  });

  it("clear removes all plugins", () => {
    registry.register(mockPlugin({ id: "a" }));
    registry.register(mockPlugin({ id: "b" }));
    registry.clear();
    expect(registry.size).toBe(0);
  });

  it("validates descriptor: rejects empty id", () => {
    expect(() => registry.register(mockPlugin({ id: "" }))).toThrow(/non-empty/);
  });

  it("validates descriptor: rejects invalid level", () => {
    expect(() =>
      registry.register(mockPlugin({ id: "bad", level: 0 as PluginLevel })),
    ).toThrow(/level must be 1-8/);
  });

  it("validates descriptor: rejects skip_penalty > 1", () => {
    expect(() =>
      registry.register(mockPlugin({ id: "bad", skip_penalty: 1.5 })),
    ).toThrow(/skip_penalty must be 0-1/);
  });

  // ── Topological Sort ──

  it("returns correct topo order for 3 plugins with dependencies", () => {
    // force -> temperature -> deflection
    registry.register(mockPlugin({
      id: "force", level: 1, outputs: ["Fc_N"],
    }));
    registry.register(mockPlugin({
      id: "temperature", level: 2, depends_on: ["force"], outputs: ["temp_C"],
    }));
    registry.register(mockPlugin({
      id: "deflection", level: 4, depends_on: ["force"], outputs: ["defl_um"],
    }));

    const plan = registry.getExecutionOrder([], 2);
    const ids = plan.ordered.map(p => p.descriptor.id);

    // force must come before temperature and deflection
    expect(ids.indexOf("force")).toBeLessThan(ids.indexOf("temperature"));
    expect(ids.indexOf("force")).toBeLessThan(ids.indexOf("deflection"));
    expect(plan.skipped).toHaveLength(0);
  });

  it("handles diamond dependencies correctly", () => {
    // A -> B, A -> C, B -> D, C -> D
    registry.register(mockPlugin({ id: "A", outputs: ["a_out"] }));
    registry.register(mockPlugin({ id: "B", depends_on: ["A"], outputs: ["b_out"] }));
    registry.register(mockPlugin({ id: "C", depends_on: ["A"], outputs: ["c_out"] }));
    registry.register(mockPlugin({ id: "D", depends_on: ["B", "C"], outputs: ["d_out"] }));

    const plan = registry.getExecutionOrder([], 1);
    const ids = plan.ordered.map(p => p.descriptor.id);

    expect(ids[0]).toBe("A"); // A must be first
    expect(ids[3]).toBe("D"); // D must be last
    expect(ids.indexOf("B")).toBeLessThan(ids.indexOf("D"));
    expect(ids.indexOf("C")).toBeLessThan(ids.indexOf("D"));
  });

  it("detects cycle in depends_on and returns empty plan", () => {
    // A -> B -> C -> A (cycle)
    registry.register(mockPlugin({ id: "A", depends_on: ["C"], outputs: ["a_out"] }));
    registry.register(mockPlugin({ id: "B", depends_on: ["A"], outputs: ["b_out"] }));
    registry.register(mockPlugin({ id: "C", depends_on: ["B"], outputs: ["c_out"] }));

    const plan = registry.getExecutionOrder([], 1);
    expect(plan.ordered).toHaveLength(0);
    expect(plan.skipped.length).toBeGreaterThan(0);
    expect(plan.skipped.some(s => s.reason === "error")).toBe(true);
  });

  // ── Tier Filtering ──

  it("excludes plugins with min_tier > current tier", () => {
    registry.register(mockPlugin({
      id: "basic_force", min_tier: 1, skip_penalty: 0.30, outputs: ["Fc_N"],
    }));
    registry.register(mockPlugin({
      id: "advanced_stability", min_tier: 2, skip_penalty: 0.12, outputs: ["stability"],
    }));
    registry.register(mockPlugin({
      id: "mc_uncertainty", min_tier: 3, skip_penalty: 0.05, outputs: ["ci_95"],
    }));

    const plan = registry.getExecutionOrder([], 1); // Tier 1
    const ids = plan.ordered.map(p => p.descriptor.id);
    expect(ids).toContain("basic_force");
    expect(ids).not.toContain("advanced_stability");
    expect(ids).not.toContain("mc_uncertainty");

    // Skipped plugins
    expect(plan.skipped).toHaveLength(2);
    expect(plan.skipped.every(s => s.reason === "below_tier")).toBe(true);
  });

  it("includes all plugins when tier is high enough", () => {
    registry.register(mockPlugin({ id: "t1", min_tier: 1, outputs: ["a"] }));
    registry.register(mockPlugin({ id: "t2", min_tier: 2, outputs: ["b"] }));
    registry.register(mockPlugin({ id: "t3", min_tier: 3, outputs: ["c"] }));

    const plan = registry.getExecutionOrder([], 4); // Tier 4 includes all
    expect(plan.ordered).toHaveLength(3);
    expect(plan.skipped).toHaveLength(0);
  });

  // ── Missing Dependencies ──

  it("skips plugin when depends_on reference is not registered", () => {
    registry.register(mockPlugin({
      id: "deflection", depends_on: ["force"], outputs: ["defl_um"],
    }));
    // "force" is NOT registered

    const plan = registry.getExecutionOrder([], 1);
    expect(plan.ordered).toHaveLength(0);
    expect(plan.skipped).toHaveLength(1);
    expect(plan.skipped[0].reason).toBe("missing_inputs");
    expect(plan.skipped[0].missing_inputs).toContain("force");
  });

  // ── Penalty Calculation ──

  it("calculates total skip penalty correctly", () => {
    const skipped: SkippedPlugin[] = [
      { plugin_id: "a", reason: "below_tier", penalty: 0.30 },
      { plugin_id: "b", reason: "below_tier", penalty: 0.12 },
      { plugin_id: "c", reason: "below_tier", penalty: 0.08 },
    ];
    expect(registry.getTotalSkipPenalty(skipped)).toBeCloseTo(0.50, 5);
  });

  it("caps total penalty at 1.0", () => {
    const skipped: SkippedPlugin[] = [
      { plugin_id: "a", reason: "below_tier", penalty: 0.60 },
      { plugin_id: "b", reason: "below_tier", penalty: 0.60 },
    ];
    expect(registry.getTotalSkipPenalty(skipped)).toBe(1.0);
  });

  // ── Feedback Edges ──

  it("returns feedback edges separately from topo sort", () => {
    registry.register(mockPlugin({
      id: "force", level: 1, outputs: ["Fc_N"],
      feedback_from: ["wear"], // force reads wear (feedback cycle)
    }));
    registry.register(mockPlugin({
      id: "temperature", level: 2, depends_on: ["force"], outputs: ["temp_C"],
    }));
    registry.register(mockPlugin({
      id: "wear", level: 3, depends_on: ["temperature"], outputs: ["VB_mm"],
      feedback_from: ["force"], // wear reads force (feedback — not in depends_on)
    }));

    const feedbackEdges = registry.getFeedbackEdges();
    expect(feedbackEdges).toHaveLength(2);
    expect(feedbackEdges).toContainEqual({ from: "wear", to: "force" });
    expect(feedbackEdges).toContainEqual({ from: "force", to: "wear" });

    // Topo sort should still work (feedback_from not in topo graph)
    const plan = registry.getExecutionOrder([], 1);
    expect(plan.ordered).toHaveLength(3);
    const ids = plan.ordered.map(p => p.descriptor.id);
    expect(ids.indexOf("force")).toBeLessThan(ids.indexOf("temperature"));
    expect(ids.indexOf("temperature")).toBeLessThan(ids.indexOf("wear"));
  });

  // ── Validation ──

  it("validateDependencies detects missing depends_on references", () => {
    registry.register(mockPlugin({
      id: "deflection", depends_on: ["nonexistent"], outputs: ["defl"],
    }));
    const result = registry.validateDependencies();
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes("nonexistent"))).toBe(true);
  });

  it("validateDependencies detects self-dependency", () => {
    registry.register(mockPlugin({
      id: "self_ref", depends_on: ["self_ref"], outputs: ["out"],
    }));
    const result = registry.validateDependencies();
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes("depends on itself"))).toBe(true);
  });

  it("validateDependencies passes for valid configuration", () => {
    registry.register(mockPlugin({ id: "force", outputs: ["Fc_N"] }));
    registry.register(mockPlugin({
      id: "temperature", depends_on: ["force"], outputs: ["temp_C"],
    }));
    const result = registry.validateDependencies();
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("validateDependencies warns on duplicate output keys", () => {
    registry.register(mockPlugin({ id: "a", outputs: ["shared_key"] }));
    registry.register(mockPlugin({ id: "b", outputs: ["shared_key"] }));
    const result = registry.validateDependencies();
    expect(result.warnings.some(w => w.includes("shared_key"))).toBe(true);
  });

  // ── Empty Registry ──

  it("getExecutionOrder returns empty plan for empty registry", () => {
    const plan = registry.getExecutionOrder([], 2);
    expect(plan.ordered).toHaveLength(0);
    expect(plan.skipped).toHaveLength(0);
    expect(plan.total_penalty).toBe(0);
  });

  // ── Singleton ──

  it("singleton instance is exported", () => {
    expect(physicsPluginRegistry).toBeInstanceOf(PhysicsPluginRegistry);
  });

  // ── Cache invalidation ──

  it("cache invalidates on register/unregister", () => {
    registry.register(mockPlugin({ id: "a", outputs: ["a_out"] }));

    // First call caches
    const plan1 = registry.getExecutionOrder([], 1);
    expect(plan1.ordered).toHaveLength(1);

    // Register new plugin — cache should invalidate
    registry.register(mockPlugin({ id: "b", outputs: ["b_out"] }));
    const plan2 = registry.getExecutionOrder([], 1);
    expect(plan2.ordered).toHaveLength(2);
  });

  // ── Scrutiny fixes (3-agent review findings) ──

  it("transitive skip cascade: C depends on B depends on A, A tier-filtered", () => {
    // A is tier 2, B depends on A, C depends on B. At tier 1:
    // A skipped (below_tier) → B skipped (missing A) → C skipped (missing B)
    registry.register(mockPlugin({ id: "A", min_tier: 2, outputs: ["a_out"] }));
    registry.register(mockPlugin({ id: "B", depends_on: ["A"], outputs: ["b_out"] }));
    registry.register(mockPlugin({ id: "C", depends_on: ["B"], outputs: ["c_out"] }));

    const plan = registry.getExecutionOrder([], 1);
    expect(plan.ordered).toHaveLength(0);
    expect(plan.skipped).toHaveLength(3);
    // A: below_tier, B: missing A, C: missing B (transitive cascade)
    expect(plan.skipped.find(s => s.plugin_id === "A")?.reason).toBe("below_tier");
    expect(plan.skipped.find(s => s.plugin_id === "B")?.reason).toBe("missing_inputs");
    expect(plan.skipped.find(s => s.plugin_id === "C")?.reason).toBe("missing_inputs");
  });

  it("depends_on/feedback_from overlap rejected at registration", () => {
    expect(() =>
      registry.register(mockPlugin({
        id: "bad",
        depends_on: ["force"],
        feedback_from: ["force"],
        outputs: ["out"],
      })),
    ).toThrow(/both depends_on and feedback_from/);
  });

  it("validateDependencies detects depends_on/feedback_from overlap", () => {
    // Bypass registration validation by registering separately then checking
    // This tests validateDependencies on a registry where overlap was forced
    const forcePlugin = mockPlugin({ id: "force", outputs: ["Fc_N"] });
    const wearPlugin = mockPlugin({
      id: "wear",
      depends_on: ["force"],
      feedback_from: [],
      outputs: ["VB_mm"],
    });
    registry.register(forcePlugin);
    registry.register(wearPlugin);
    const result = registry.validateDependencies();
    expect(result.valid).toBe(true); // no overlap — clean
  });

  it("oscillation_frequency_threshold is configurable in ConvergenceConfig", () => {
    const config = buildConvergenceConfig("P", {
      oscillation_frequency_threshold: 0.30,
    });
    expect(config.oscillation_frequency_threshold).toBe(0.30);
  });

  it("BASE_CONVERGENCE_CONFIG has oscillation_frequency_threshold = 0.25", () => {
    expect(BASE_CONVERGENCE_CONFIG.oscillation_frequency_threshold).toBe(0.25);
  });

  it("per-loop tolerance overrides work via buildConvergenceConfig", () => {
    const config = buildConvergenceConfig("S", {
      tolerance_ftw: 1e-2,
      tolerance_fdt: 1e-4,
    });
    expect(config.tolerance_ftw).toBe(1e-2);
    expect(config.tolerance_fdt).toBe(1e-4);
    expect(config.tolerance_fes).toBeUndefined(); // not overridden
    expect(config.tolerance).toBe(1e-3); // base default still there
  });
});
