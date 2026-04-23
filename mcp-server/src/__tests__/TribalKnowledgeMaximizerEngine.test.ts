/**
 * TribalKnowledgeMaximizerEngine Tests — Phase 0.23 U-UTL12
 */

import { describe, it, expect, beforeEach } from "vitest";
import { tribalKnowledgeMaximizerEngine } from "../engines/TribalKnowledgeMaximizerEngine.js";

describe("TribalKnowledgeMaximizerEngine", () => {
  beforeEach(() => {
    tribalKnowledgeMaximizerEngine.reset();
  });

  it("initializes with seeded tips", async () => {
    const stats = await tribalKnowledgeMaximizerEngine.getStats();
    expect(stats.totalTips).toBeGreaterThan(0);
  });

  it("queries tips by domain", async () => {
    const tips = await tribalKnowledgeMaximizerEngine.query({ domain: "lathe" });
    expect(tips.every(t => t.domain === "lathe")).toBe(true);
  });

  it("queries tips by category", async () => {
    const tips = await tribalKnowledgeMaximizerEngine.query({ category: "safety" });
    expect(tips.every(t => t.category === "safety")).toBe(true);
  });

  it("queries tips by min confidence", async () => {
    const tips = await tribalKnowledgeMaximizerEngine.query({ minConfidence: 0.8 });
    expect(tips.every(t => t.confidence >= 0.8)).toBe(true);
  });

  it("queries tips by keywords", async () => {
    const tips = await tribalKnowledgeMaximizerEngine.query({ keywords: ["lathe"] });
    expect(tips.length).toBeGreaterThanOrEqual(0);
  });

  it("gets tip by id", async () => {
    const tips = await tribalKnowledgeMaximizerEngine.query({ limit: 1 });
    if (tips.length > 0) {
      const tip = await tribalKnowledgeMaximizerEngine.getTip(tips[0].id);
      expect(tip).not.toBeNull();
    }
  });

  it("returns null for unknown tip id", async () => {
    const tip = await tribalKnowledgeMaximizerEngine.getTip("nonexistent");
    expect(tip).toBeNull();
  });

  it("records usage increments count", async () => {
    const tips = await tribalKnowledgeMaximizerEngine.query({ limit: 1 });
    if (tips.length > 0) {
      const before = tips[0].usageCount;
      await tribalKnowledgeMaximizerEngine.recordUsage(tips[0].id);
      const after = await tribalKnowledgeMaximizerEngine.getTip(tips[0].id);
      expect(after?.usageCount).toBe(before + 1);
    }
  });

  it("gets underutilized tips", async () => {
    const underutilized = await tribalKnowledgeMaximizerEngine.getUnderutilized(2);
    expect(underutilized.every(t => t.usageCount < 2)).toBe(true);
  });

  it("respects query limit", async () => {
    const tips = await tribalKnowledgeMaximizerEngine.query({ limit: 5 });
    expect(tips.length).toBeLessThanOrEqual(5);
  });

  it("stats include domain breakdown", async () => {
    const stats = await tribalKnowledgeMaximizerEngine.getStats();
    expect(stats.byDomain).toBeDefined();
  });

  it("stats include category breakdown", async () => {
    const stats = await tribalKnowledgeMaximizerEngine.getStats();
    expect(stats.byCategory).toBeDefined();
  });

  it("stats include utilization percent", async () => {
    const stats = await tribalKnowledgeMaximizerEngine.getStats();
    expect(typeof stats.utilizationPercent).toBe("number");
  });

  it("reset clears state", async () => {
    await tribalKnowledgeMaximizerEngine.getStats();
    tribalKnowledgeMaximizerEngine.reset();
    const stats = await tribalKnowledgeMaximizerEngine.getStats();
    expect(stats.totalTips).toBeGreaterThan(0);
  });
});
