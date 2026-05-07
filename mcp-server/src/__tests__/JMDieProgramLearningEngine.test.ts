/**
 * JMDieProgramLearningEngine Tests — Phase 0.23 U-UTL14
 */

import { describe, it, expect, beforeEach } from "vitest";
import { jmDieProgramLearningEngine } from "../engines/JMDieProgramLearningEngine.js";

describe("JMDieProgramLearningEngine", () => {
  beforeEach(() => {
    jmDieProgramLearningEngine.reset();
  });

  it("initializes with seeded patterns", async () => {
    const stats = await jmDieProgramLearningEngine.getStats();
    expect(stats.extractedPatterns).toBeGreaterThan(0);
  });

  it("queries patterns by machine type", async () => {
    const patterns = await jmDieProgramLearningEngine.query({ machineType: "lathe" });
    expect(patterns.every(p => p.machineType === "lathe")).toBe(true);
  });

  it("queries patterns by category", async () => {
    const patterns = await jmDieProgramLearningEngine.query({ category: "roughing" });
    expect(patterns.every(p => p.category === "roughing")).toBe(true);
  });

  it("queries patterns by min frequency", async () => {
    const patterns = await jmDieProgramLearningEngine.query({ minFrequency: 100 });
    expect(patterns.every(p => p.frequency >= 100)).toBe(true);
  });

  it("gets pattern by id", async () => {
    const patterns = await jmDieProgramLearningEngine.query({ limit: 1 });
    if (patterns.length > 0) {
      const pattern = await jmDieProgramLearningEngine.getPattern(patterns[0].id);
      expect(pattern).not.toBeNull();
    }
  });

  it("returns null for unknown pattern id", async () => {
    const pattern = await jmDieProgramLearningEngine.getPattern("nonexistent");
    expect(pattern).toBeNull();
  });

  it("gets tips for machine type", async () => {
    const tips = await jmDieProgramLearningEngine.getTips("lathe");
    expect(Array.isArray(tips)).toBe(true);
  });

  it("gets tips for all machine types when none specified", async () => {
    const tips = await jmDieProgramLearningEngine.getTips();
    expect(Array.isArray(tips)).toBe(true);
  });

  it("gets top patterns for machine type", async () => {
    const patterns = await jmDieProgramLearningEngine.getTopPatterns("mill", 3);
    expect(patterns.length).toBeLessThanOrEqual(3);
    expect(patterns.every(p => p.machineType === "mill")).toBe(true);
  });

  it("respects query limit", async () => {
    const patterns = await jmDieProgramLearningEngine.query({ limit: 5 });
    expect(patterns.length).toBeLessThanOrEqual(5);
  });

  it("stats show total programs analyzed", async () => {
    const stats = await jmDieProgramLearningEngine.getStats();
    expect(stats.totalPrograms).toBe(36929);
  });

  it("stats include machine type breakdown", async () => {
    const stats = await jmDieProgramLearningEngine.getStats();
    expect(stats.byMachineType).toBeDefined();
  });

  it("stats include category breakdown", async () => {
    const stats = await jmDieProgramLearningEngine.getStats();
    expect(stats.byCategory).toBeDefined();
  });

  it("stats include extracted tips count", async () => {
    const stats = await jmDieProgramLearningEngine.getStats();
    expect(typeof stats.extractedTips).toBe("number");
  });

  it("reset clears state", async () => {
    await jmDieProgramLearningEngine.getStats();
    jmDieProgramLearningEngine.reset();
    const stats = await jmDieProgramLearningEngine.getStats();
    expect(stats.extractedPatterns).toBeGreaterThan(0);
  });
});
