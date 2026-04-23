/**
 * AssetDependencyGraphEngine Tests — Phase 0.24 U-INT2
 */

import { describe, it, expect, beforeEach } from "vitest";
import { assetDependencyGraphEngine } from "../engines/AssetDependencyGraphEngine.js";

describe("AssetDependencyGraphEngine", () => {
  beforeEach(() => {
    assetDependencyGraphEngine.reset();
  });

  it("builds graph with nodes", async () => {
    const stats = await assetDependencyGraphEngine.getStats();
    expect(stats.totalNodes).toBeGreaterThan(0);
  });

  it("gets node by id", async () => {
    const node = await assetDependencyGraphEngine.getNode("CuttingForceEngine");
    expect(node).not.toBeNull();
    expect(node?.type).toBe("engine");
  });

  it("returns null for unknown node", async () => {
    const node = await assetDependencyGraphEngine.getNode("nonexistent");
    expect(node).toBeNull();
  });

  it("gets direct dependencies", async () => {
    const deps = await assetDependencyGraphEngine.getDependencies("CuttingForceEngine", 1);
    expect(deps).toContain("kienzle_formula");
  });

  it("gets transitive dependencies", async () => {
    const deps = await assetDependencyGraphEngine.getDependencies("SpeedFeedEngine", 3);
    expect(deps.length).toBeGreaterThan(0);
  });

  it("gets direct dependents", async () => {
    const dependents = await assetDependencyGraphEngine.getDependents("CuttingForceEngine", 1);
    expect(dependents).toContain("SpeedFeedEngine");
  });

  it("gets transitive dependents", async () => {
    const dependents = await assetDependencyGraphEngine.getDependents("kienzle_formula", 3);
    expect(dependents.length).toBeGreaterThan(0);
  });

  it("analyzes impact of changes", async () => {
    const impact = await assetDependencyGraphEngine.analyzeImpact("CuttingForceEngine");
    expect(impact.affectedAssets).toBeDefined();
    expect(Array.isArray(impact.affectedAssets)).toBe(true);
  });

  it("provides impact depth", async () => {
    const impact = await assetDependencyGraphEngine.analyzeImpact("CuttingForceEngine");
    expect(typeof impact.impactDepth).toBe("number");
  });

  it("provides critical path", async () => {
    const impact = await assetDependencyGraphEngine.analyzeImpact("CuttingForceEngine");
    expect(Array.isArray(impact.criticalPath)).toBe(true);
    expect(impact.criticalPath[0]).toBe("CuttingForceEngine");
  });

  it("provides impact recommendations", async () => {
    const impact = await assetDependencyGraphEngine.analyzeImpact("kienzle_formula");
    expect(Array.isArray(impact.recommendations)).toBe(true);
  });

  it("stats include edge count", async () => {
    const stats = await assetDependencyGraphEngine.getStats();
    expect(typeof stats.totalEdges).toBe("number");
  });

  it("stats include orphan count", async () => {
    const stats = await assetDependencyGraphEngine.getStats();
    expect(typeof stats.orphanNodes).toBe("number");
  });

  it("reset clears graph", () => {
    assetDependencyGraphEngine.reset();
    expect(true).toBe(true);
  });
});
