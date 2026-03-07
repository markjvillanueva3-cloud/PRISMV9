import { describe, it, expect, beforeEach } from "vitest";
import { TokenAccountingEngine } from "../engines/TokenAccountingEngine.js";

describe("TokenAccountingEngine", () => {
  let engine: TokenAccountingEngine;

  beforeEach(() => {
    engine = new TokenAccountingEngine();
  });

  describe("record and getByTool", () => {
    it("tracks per-tool costs", () => {
      engine.record("Read", 100, 2000);
      engine.record("Read", 100, 3000);
      engine.record("Grep", 150, 800);
      const byTool = engine.getByTool();
      const read = byTool.find(t => t.tool === "Read")!;
      expect(read.callCount).toBe(2);
      expect(read.totalTokens).toBe(5200);
      expect(read.avgTokens).toBe(2600);
      expect(read.maxTokens).toBe(3100);
      expect(read.minTokens).toBe(2100);
    });
  });

  describe("getReport", () => {
    it("generates full report", () => {
      engine.record("Read", 100, 2000);
      engine.record("Grep", 150, 800);
      engine.record("Edit", 500, 200);
      const report = engine.getReport();
      expect(report.totalCalls).toBe(3);
      expect(report.totalTokens).toBe(3750);
      expect(report.byTool.length).toBe(3);
      expect(report.topExpensive.length).toBe(3);
      expect(report.efficiencyScore).toBeGreaterThan(0);
    });

    it("flags high-cost tools in recommendations", () => {
      // Agent with huge output — well above baseline
      engine.record("Agent", 500, 20000);
      engine.record("Agent", 500, 25000);
      const report = engine.getReport();
      expect(report.recommendations.some(r => r.includes("Agent"))).toBe(true);
    });

    it("flags high Read count", () => {
      for (let i = 0; i < 25; i++) {
        engine.record("Read", 100, 2000);
      }
      const report = engine.getReport();
      expect(report.recommendations.some(r => r.includes("Read"))).toBe(true);
    });

    it("handles empty state", () => {
      const report = engine.getReport();
      expect(report.totalCalls).toBe(0);
      expect(report.efficiencyScore).toBe(100);
    });
  });

  describe("getStatusLine", () => {
    it("returns compact status", () => {
      engine.record("Read", 100, 2000);
      const line = engine.getStatusLine();
      expect(line).toContain("Tokens:");
      expect(line).toContain("Efficiency:");
    });
  });

  describe("getBaseline", () => {
    it("returns known baselines", () => {
      const baseline = engine.getBaseline("Read");
      expect(baseline).not.toBeNull();
      expect(baseline!.avgOut).toBe(2000);
    });

    it("returns null for unknown tools", () => {
      expect(engine.getBaseline("UnknownTool")).toBeNull();
    });
  });

  describe("reset", () => {
    it("clears all records", () => {
      engine.record("Read", 100, 2000);
      engine.reset();
      expect(engine.getReport().totalCalls).toBe(0);
    });
  });
});
