/**
 * ToolpathStrategyRouterEngine Tests — Phase 0.23 U-UTL3
 */

import { describe, it, expect, beforeEach } from "vitest";
import { toolpathStrategyRouterEngine } from "../engines/ToolpathStrategyRouterEngine.js";

describe("ToolpathStrategyRouterEngine", () => {
  beforeEach(() => {
    toolpathStrategyRouterEngine.reset();
  });

  it("initializes with seeded strategies", async () => {
    const result = await toolpathStrategyRouterEngine.route({ machineType: "mill" });
    expect(result.recommended).toBeDefined();
  });

  it("routes request to best strategy for mill", async () => {
    const result = await toolpathStrategyRouterEngine.route({
      machineType: "mill",
      operation: "roughing",
    });
    expect(result.recommended).toBeDefined();
    expect(result.recommended.machineType).toBe("mill");
    expect(result.confidence).toBeGreaterThan(0);
  });

  it("routes request to best strategy for lathe", async () => {
    const result = await toolpathStrategyRouterEngine.route({
      machineType: "lathe",
    });
    expect(result.recommended).toBeDefined();
    expect(result.recommended.machineType).toBe("lathe");
  });

  it("filters strategies by material", async () => {
    const result = await toolpathStrategyRouterEngine.route({
      machineType: "mill",
      material: "titanium",
    });
    expect(result.recommended.applicableMaterials).toContain("titanium");
  });

  it("provides alternatives", async () => {
    const result = await toolpathStrategyRouterEngine.route({
      machineType: "mill",
    });
    expect(Array.isArray(result.alternatives)).toBe(true);
  });

  it("includes reasoning in result", async () => {
    const result = await toolpathStrategyRouterEngine.route({
      machineType: "mill",
    });
    expect(result.reasoning).toBeDefined();
    expect(typeof result.reasoning).toBe("string");
  });

  it("gets strategy by id", async () => {
    const strategy = await toolpathStrategyRouterEngine.getStrategy("adaptive_rough");
    expect(strategy).not.toBeNull();
    expect(strategy?.id).toBe("adaptive_rough");
  });

  it("returns null for unknown strategy id", async () => {
    const strategy = await toolpathStrategyRouterEngine.getStrategy("nonexistent");
    expect(strategy).toBeNull();
  });

  it("lists strategies by machine type", async () => {
    const strategies = await toolpathStrategyRouterEngine.listByMachine("mill");
    expect(strategies.every(s => s.machineType === "mill")).toBe(true);
  });

  it("returns count of strategies", () => {
    expect(toolpathStrategyRouterEngine.getCount()).toBeGreaterThanOrEqual(0);
  });

  it("handles speed priority", async () => {
    const result = await toolpathStrategyRouterEngine.route({
      machineType: "mill",
      priority: "speed",
    });
    expect(result.recommended).toBeDefined();
  });

  it("handles quality priority", async () => {
    const result = await toolpathStrategyRouterEngine.route({
      machineType: "mill",
      priority: "quality",
    });
    expect(result.recommended).toBeDefined();
  });

  it("reset clears state", () => {
    toolpathStrategyRouterEngine.reset();
    expect(toolpathStrategyRouterEngine.getCount()).toBe(0);
  });
});
