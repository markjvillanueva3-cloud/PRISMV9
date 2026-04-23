import { describe, it, expect } from "vitest";
import {
  ReplanTriggerEngine,
  replanTriggerEngine,
  type PlanSnapshot,
} from "../engines/ReplanTriggerEngine.js";

const basePlan = (): PlanSnapshot => ({
  planId: "p1",
  createdAt: 1_000,
  preconditions: { machine_online: true, tool_loaded: "T1" },
  deadlines: { task_A: 10_000 },
  resources: ["lathe-1"],
  assumptions: { material_in_stock: true },
});

describe("ReplanTriggerEngine", () => {
  it("singleton has matching class name", () => {
    expect(replanTriggerEngine).toBeInstanceOf(ReplanTriggerEngine);
    expect(replanTriggerEngine.name).toBe("ReplanTriggerEngine");
  });

  it("all preconditions met returns shouldReplan=false", () => {
    const engine = new ReplanTriggerEngine();
    const v = engine.evaluate({
      plan: basePlan(),
      currentState: { machine_online: true, tool_loaded: "T1", material_in_stock: true },
      currentTime: 5_000,
    });
    expect(v.shouldReplan).toBe(false);
    expect(v.severity).toBe("none");
    expect(v.reasons.length).toBe(0);
  });

  it("precondition invalidated triggers full severity", () => {
    const engine = new ReplanTriggerEngine();
    const v = engine.evaluate({
      plan: basePlan(),
      currentState: { machine_online: false, tool_loaded: "T1", material_in_stock: true },
      currentTime: 5_000,
    });
    expect(v.shouldReplan).toBe(true);
    expect(v.severity).toBe("full");
    expect(v.reasons.some((r) => r.kind === "precondition_invalidated")).toBe(true);
  });

  it("deadline missed triggers full severity", () => {
    const engine = new ReplanTriggerEngine();
    const v = engine.evaluate({
      plan: basePlan(),
      currentState: { machine_online: true, tool_loaded: "T1", material_in_stock: true },
      currentTime: 20_000,
    });
    expect(v.severity).toBe("full");
    expect(v.reasons.some((r) => r.kind === "deadline_missed")).toBe(true);
  });

  it("resource_lost triggers full severity", () => {
    const engine = new ReplanTriggerEngine();
    const v = engine.evaluate({
      plan: basePlan(),
      currentState: { machine_online: true, tool_loaded: "T1", material_in_stock: true },
      currentTime: 5_000,
      lostResources: ["lathe-1"],
    });
    expect(v.severity).toBe("full");
    expect(v.reasons.some((r) => r.kind === "resource_lost")).toBe(true);
  });

  it("assumption violated triggers patch severity", () => {
    const engine = new ReplanTriggerEngine();
    const v = engine.evaluate({
      plan: basePlan(),
      currentState: { machine_online: true, tool_loaded: "T1", material_in_stock: false },
      currentTime: 5_000,
    });
    expect(v.severity).toBe("patch");
    expect(v.reasons.some((r) => r.kind === "assumption_violated")).toBe(true);
  });

  it("external events trigger patch severity", () => {
    const engine = new ReplanTriggerEngine();
    const v = engine.evaluate({
      plan: basePlan(),
      currentState: { machine_online: true, tool_loaded: "T1", material_in_stock: true },
      currentTime: 5_000,
      externalEvents: ["operator_paused_queue"],
    });
    expect(v.severity).toBe("patch");
  });

  it("low time budget triggers patch severity", () => {
    const engine = new ReplanTriggerEngine();
    const v = engine.evaluate({
      plan: basePlan(),
      currentState: { machine_online: true, tool_loaded: "T1", material_in_stock: true },
      currentTime: 5_000,
      timeBudgetRemainingMs: 100,
      minTimeBudgetMs: 10_000,
    });
    expect(v.severity).toBe("patch");
    expect(v.reasons.some((r) => r.kind === "time_budget_exceeded")).toBe(true);
  });

  it("lost resource not in plan does not flag", () => {
    const engine = new ReplanTriggerEngine();
    const v = engine.evaluate({
      plan: basePlan(),
      currentState: { machine_online: true, tool_loaded: "T1", material_in_stock: true },
      currentTime: 5_000,
      lostResources: ["unrelated-mill"],
    });
    expect(v.reasons.some((r) => r.kind === "resource_lost")).toBe(false);
  });

  it("FAIL: missing plan rejected", () => {
    const engine = new ReplanTriggerEngine();
    expect(() => engine.evaluate({
      plan: undefined as unknown as PlanSnapshot,
      currentState: {},
    })).toThrow(/plan\.planId required/);
  });

  it("FAIL: missing preconditions rejected", () => {
    const engine = new ReplanTriggerEngine();
    expect(() => engine.evaluate({
      plan: { planId: "p", createdAt: 0, preconditions: undefined as unknown as Record<string, unknown> },
      currentState: {},
    })).toThrow(/plan\.preconditions required/);
  });

  it("FAIL: missing currentState rejected", () => {
    const engine = new ReplanTriggerEngine();
    expect(() => engine.evaluate({
      plan: basePlan(),
      currentState: null as unknown as Record<string, unknown>,
    })).toThrow(/currentState required/);
  });

  it("ADV: multiple reasons accumulate correctly", () => {
    const engine = new ReplanTriggerEngine();
    const v = engine.evaluate({
      plan: basePlan(),
      currentState: { machine_online: false, tool_loaded: "T2", material_in_stock: false },
      currentTime: 20_000,
    });
    expect(v.reasons.length).toBeGreaterThanOrEqual(3);
    expect(v.severity).toBe("full");
  });

  it("ADV: deep-equal comparison works for nested objects", () => {
    const engine = new ReplanTriggerEngine();
    const plan: PlanSnapshot = {
      planId: "p",
      createdAt: 0,
      preconditions: { config: { tool: { id: "T1", ratio: 0.5 } } },
    };
    const v1 = engine.evaluate({
      plan,
      currentState: { config: { tool: { id: "T1", ratio: 0.5 } } },
    });
    expect(v1.shouldReplan).toBe(false);
    const v2 = engine.evaluate({
      plan,
      currentState: { config: { tool: { id: "T1", ratio: 0.6 } } },
    });
    expect(v2.shouldReplan).toBe(true);
  });
});
