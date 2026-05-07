/**
 * HookCoverageMaximizerEngine Tests — Phase 0.23 U-UTL8
 */

import { describe, it, expect, beforeEach } from "vitest";
import { hookCoverageMaximizerEngine } from "../engines/HookCoverageMaximizerEngine.js";

describe("HookCoverageMaximizerEngine", () => {
  beforeEach(() => {
    hookCoverageMaximizerEngine.reset();
  });

  it("initializes with seeded hooks", async () => {
    const hook = await hookCoverageMaximizerEngine.getHook("pre_tool_dedup");
    expect(hook).not.toBeNull();
  });

  it("analyzes coverage", async () => {
    const analysis = await hookCoverageMaximizerEngine.analyze();
    expect(analysis.totalHooks).toBeGreaterThan(0);
    expect(analysis.activeHooks).toBeGreaterThanOrEqual(0);
  });

  it("identifies covered surfaces", async () => {
    const analysis = await hookCoverageMaximizerEngine.analyze();
    expect(Array.isArray(analysis.coveredSurfaces)).toBe(true);
  });

  it("identifies uncovered surfaces", async () => {
    const analysis = await hookCoverageMaximizerEngine.analyze();
    expect(Array.isArray(analysis.uncoveredSurfaces)).toBe(true);
  });

  it("calculates coverage percent", async () => {
    const analysis = await hookCoverageMaximizerEngine.analyze();
    expect(typeof analysis.coveragePercent).toBe("number");
    expect(analysis.coveragePercent).toBeGreaterThanOrEqual(0);
    expect(analysis.coveragePercent).toBeLessThanOrEqual(100);
  });

  it("provides recommendations", async () => {
    const analysis = await hookCoverageMaximizerEngine.analyze();
    expect(Array.isArray(analysis.recommendations)).toBe(true);
  });

  it("queries hooks by type", async () => {
    const hooks = await hookCoverageMaximizerEngine.query({ type: "pre" });
    expect(hooks.every(h => h.type === "pre")).toBe(true);
  });

  it("queries hooks by event", async () => {
    const hooks = await hookCoverageMaximizerEngine.query({ event: "Write" });
    expect(hooks.every(h => h.event === "Write")).toBe(true);
  });

  it("queries hooks by enabled status", async () => {
    const hooks = await hookCoverageMaximizerEngine.query({ enabled: true });
    expect(hooks.every(h => h.enabled === true)).toBe(true);
  });

  it("gets hook by id", async () => {
    const hook = await hookCoverageMaximizerEngine.getHook("post_write_awareness");
    expect(hook).not.toBeNull();
    expect(hook?.type).toBe("post");
  });

  it("returns null for unknown hook id", async () => {
    const hook = await hookCoverageMaximizerEngine.getHook("nonexistent");
    expect(hook).toBeNull();
  });

  it("respects query limit", async () => {
    const hooks = await hookCoverageMaximizerEngine.query({ limit: 2 });
    expect(hooks.length).toBeLessThanOrEqual(2);
  });

  it("returns count of hooks", () => {
    expect(hookCoverageMaximizerEngine.getCount()).toBeGreaterThanOrEqual(0);
  });

  it("reset clears state", () => {
    hookCoverageMaximizerEngine.reset();
    expect(hookCoverageMaximizerEngine.getCount()).toBe(0);
  });
});
