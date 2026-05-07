/**
 * AlgorithmOrchestratorEngine Tests — Phase 0.23 U-UTL2
 */

import { describe, it, expect, beforeEach } from "vitest";
import { algorithmOrchestratorEngine } from "../engines/AlgorithmOrchestratorEngine.js";

describe("AlgorithmOrchestratorEngine", () => {
  beforeEach(() => {
    algorithmOrchestratorEngine.reset();
  });

  it("initializes with seeded algorithms", async () => {
    const algo = await algorithmOrchestratorEngine.getAlgorithm("kienzle");
    expect(algo).not.toBeNull();
  });

  it("queries algorithms by category", async () => {
    const results = await algorithmOrchestratorEngine.query({ category: "force" });
    expect(results.every(a => a.category === "force")).toBe(true);
  });

  it("queries algorithms by domain", async () => {
    const results = await algorithmOrchestratorEngine.query({ domain: "mill" });
    expect(results.length).toBeGreaterThan(0);
  });

  it("queries algorithms by input type", async () => {
    const results = await algorithmOrchestratorEngine.query({ inputType: "cutting_params" });
    expect(results.every(a => a.inputTypes.includes("cutting_params"))).toBe(true);
  });

  it("recommends algorithm for problem type", async () => {
    const result = await algorithmOrchestratorEngine.recommend("force", "lathe");
    expect(result.algorithmId).toBeDefined();
    expect(result.confidence).toBeGreaterThan(0);
  });

  it("provides alternatives in recommendation", async () => {
    const result = await algorithmOrchestratorEngine.recommend("force", "mill");
    expect(Array.isArray(result.alternatives)).toBe(true);
  });

  it("includes reasoning in recommendation", async () => {
    const result = await algorithmOrchestratorEngine.recommend("force", "mill");
    expect(result.reasoning).toBeDefined();
    expect(typeof result.reasoning).toBe("string");
  });

  it("gets algorithm by id", async () => {
    const algo = await algorithmOrchestratorEngine.getAlgorithm("taylor");
    expect(algo).not.toBeNull();
    expect(algo?.name).toContain("Taylor");
  });

  it("returns null for unknown algorithm id", async () => {
    const algo = await algorithmOrchestratorEngine.getAlgorithm("nonexistent");
    expect(algo).toBeNull();
  });

  it("respects query limit", async () => {
    const results = await algorithmOrchestratorEngine.query({ limit: 3 });
    expect(results.length).toBeLessThanOrEqual(3);
  });

  it("returns count of algorithms", () => {
    expect(algorithmOrchestratorEngine.getCount()).toBeGreaterThanOrEqual(0);
  });

  it("reset clears state", () => {
    algorithmOrchestratorEngine.reset();
    expect(algorithmOrchestratorEngine.getCount()).toBe(0);
  });
});
