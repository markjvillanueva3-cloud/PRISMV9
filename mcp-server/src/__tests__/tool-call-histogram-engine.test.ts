import { describe, it, expect } from "vitest";
import { ToolCallHistogramEngine } from "../engines/ToolCallHistogramEngine.js";

describe("ToolCallHistogramEngine", () => {
  describe("record and report", () => {
    it("tracks tool calls", () => {
      const engine = new ToolCallHistogramEngine();
      engine.record("Read", 500);
      engine.record("Read", 300);
      engine.record("Grep", 200);
      const r = engine.report();
      expect(r.totalCalls).toBe(3);
      expect(r.totalTokens).toBe(1000);
    });

    it("identifies top consumer", () => {
      const engine = new ToolCallHistogramEngine();
      engine.record("Read", 2000);
      engine.record("Grep", 100);
      engine.record("Edit", 50);
      const r = engine.report();
      expect(r.topConsumer).toBe("Read");
      expect(r.topPercent).toBeGreaterThan(80);
    });

    it("calculates percentages", () => {
      const engine = new ToolCallHistogramEngine();
      engine.record("Read", 500);
      engine.record("Grep", 500);
      const r = engine.report();
      expect(r.tools[0].percent).toBe(50);
    });

    it("calculates averages", () => {
      const engine = new ToolCallHistogramEngine();
      engine.record("Read", 100);
      engine.record("Read", 300);
      const r = engine.report();
      expect(r.tools[0].avgTokens).toBe(200);
    });
  });

  describe("format", () => {
    it("produces text histogram", () => {
      const engine = new ToolCallHistogramEngine();
      engine.record("Read", 800);
      engine.record("Grep", 200);
      const text = engine.format();
      expect(text).toContain("Read");
      expect(text).toContain("█");
    });

    it("handles empty state", () => {
      const engine = new ToolCallHistogramEngine();
      expect(engine.format()).toBe("No tool calls recorded");
    });

    it("limits displayed tools", () => {
      const engine = new ToolCallHistogramEngine();
      for (let i = 0; i < 15; i++) engine.record(`Tool${i}`, 100);
      const text = engine.format(5);
      expect(text).toContain("more tools");
    });
  });

  describe("oneLiner", () => {
    it("shows top 3 consumers", () => {
      const engine = new ToolCallHistogramEngine();
      engine.record("Read", 500);
      engine.record("Grep", 300);
      engine.record("Edit", 200);
      const line = engine.oneLiner();
      expect(line).toContain("Read:");
      expect(line).toContain("3 calls");
    });

    it("handles empty", () => {
      const engine = new ToolCallHistogramEngine();
      expect(engine.oneLiner()).toBe("No calls");
    });
  });

  describe("window", () => {
    it("filters by time", () => {
      const engine = new ToolCallHistogramEngine();
      engine.record("Read", 100);
      const recent = engine.window(5);
      expect(recent.length).toBe(1);
    });
  });

  describe("reset", () => {
    it("clears all data", () => {
      const engine = new ToolCallHistogramEngine();
      engine.record("Read", 100);
      engine.reset();
      expect(engine.report().totalCalls).toBe(0);
    });
  });
});
