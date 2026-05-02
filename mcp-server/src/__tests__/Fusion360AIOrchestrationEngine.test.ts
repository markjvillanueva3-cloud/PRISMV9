/**
 * Fusion360AIOrchestrationEngine.test.ts
 */

import { describe, it, expect } from "vitest";
import {
  Fusion360AIOrchestrationEngine,
  AITaskKindSchema,
  RouteTargetSchema,
  AIRequestSchema,
} from "../engines/Fusion360AIOrchestrationEngine.js";

describe("Fusion360AIOrchestrationEngine — happy path", () => {
  it("audit invariant passes (every task has a routing rule + targets are valid)", () => {
    const a = Fusion360AIOrchestrationEngine.auditRouting();
    expect(a.ok).toBe(true);
    expect(a.errors).toEqual([]);
  });

  it("strategy_suggest routes to prism_strategy (deterministic primary)", () => {
    const r = Fusion360AIOrchestrationEngine.route({ task: "strategy_suggest", payload: {} });
    expect(r.primary_target).toBe("prism_strategy");
    expect(r.fallback_targets).toContain("ollama_local");
    expect(r.rationale).toContain("Strategy selection is deterministic");
  });

  it("post_failure_diagnose routes to ollama_local (LLM primary for unstructured text)", () => {
    const r = Fusion360AIOrchestrationEngine.route({ task: "post_failure_diagnose", payload: {} });
    expect(r.primary_target).toBe("ollama_local");
    expect(r.fallback_targets).toContain("claude_remote");
    expect(r.fallback_targets).toContain("prism_safety");
  });

  it("safety_explain routes to prism_safety (rule engine primary)", () => {
    const r = Fusion360AIOrchestrationEngine.route({ task: "safety_explain", payload: {} });
    expect(r.primary_target).toBe("prism_safety");
  });

  it("kinematic_validate routes to prism_multiaxis (pure math)", () => {
    const r = Fusion360AIOrchestrationEngine.route({ task: "kinematic_validate", payload: {} });
    expect(r.primary_target).toBe("prism_multiaxis");
  });
});

describe("Fusion360AIOrchestrationEngine — full route table", () => {
  it("routes() returns all 8 task routings", () => {
    const all = Fusion360AIOrchestrationEngine.routes();
    expect(Object.keys(all).length).toBe(8);
    for (const task of AITaskKindSchema.options) {
      expect(all[task].task).toBe(task);
    }
  });

  it("every task in routes() has a non-empty rationale", () => {
    const all = Fusion360AIOrchestrationEngine.routes();
    for (const task of AITaskKindSchema.options) {
      expect(all[task].rationale.length).toBeGreaterThan(0);
    }
  });
});

describe("Fusion360AIOrchestrationEngine — tasksRoutedTo reverse lookup", () => {
  it("tasksRoutedTo('prism_strategy') returns the strategy + parameter optimization tasks", () => {
    const tasks = Fusion360AIOrchestrationEngine.tasksRoutedTo("prism_strategy");
    expect(tasks).toContain("strategy_suggest");
    expect(tasks).toContain("parameter_optimize");
  });

  it("tasksRoutedTo('prism_safety') returns the safety_explain task", () => {
    const tasks = Fusion360AIOrchestrationEngine.tasksRoutedTo("prism_safety");
    expect(tasks).toEqual(["safety_explain"]);
  });

  it("tasksRoutedTo('prism_material') returns the material_recommend task", () => {
    const tasks = Fusion360AIOrchestrationEngine.tasksRoutedTo("prism_material");
    expect(tasks).toEqual(["material_recommend"]);
  });

  it("tasksRoutedTo for an unused target returns empty array", () => {
    const tasks = Fusion360AIOrchestrationEngine.tasksRoutedTo("prism_controller_catalog");
    expect(tasks).toEqual([]);
  });
});

describe("Fusion360AIOrchestrationEngine — schema validation", () => {
  it("AITaskKindSchema rejects unknown task", () => {
    const bad: unknown = "magic_predict";
    expect(() => AITaskKindSchema.parse(bad)).toThrow();
  });

  it("RouteTargetSchema rejects unknown target", () => {
    const bad: unknown = "gemini_local";
    expect(() => RouteTargetSchema.parse(bad)).toThrow();
  });

  it("AIRequestSchema rejects max_latency_ms <= 0", () => {
    expect(() => AIRequestSchema.parse({
      task: "strategy_suggest", payload: {}, max_latency_ms: 0,
    })).toThrow();
  });

  it("AIRequestSchema rejects non-integer max_latency_ms", () => {
    expect(() => AIRequestSchema.parse({
      task: "strategy_suggest", payload: {}, max_latency_ms: 1.5,
    })).toThrow();
  });
});

describe("Fusion360AIOrchestrationEngine — dispatcher round-trip", () => {
  it("ACTIONS array exposes the orchestration actions", async () => {
    const mod = await import("../tools/dispatchers/camDispatcher.js");
    expect(mod.ACTIONS).toContain("cam_fusion360_ai_route");
    expect(mod.ACTIONS).toContain("cam_fusion360_ai_routes");
    expect(mod.ACTIONS).toContain("cam_fusion360_ai_tasks_routed_to");
    expect(mod.ACTIONS).toContain("cam_fusion360_ai_audit");
  });

  it("engine reachable via dynamic-import path", async () => {
    const mod = await import("../engines/Fusion360AIOrchestrationEngine.js");
    const r = mod.Fusion360AIOrchestrationEngine.route({ task: "strategy_suggest", payload: {} });
    expect(r.primary_target).toBe("prism_strategy");
  });
});
