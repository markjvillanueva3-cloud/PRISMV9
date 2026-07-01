import { describe, it, expect } from "vitest";
import { ToolCallThrottleEngine } from "../engines/ToolCallThrottleEngine.js";

describe("ToolCallThrottleEngine", () => {
  describe("check", () => {
    it("allows normal calls", () => {
      const engine = new ToolCallThrottleEngine();
      const result = engine.check("Read");
      expect(result.allowed).toBe(true);
    });

    it("throttles burst calls", () => {
      const engine = new ToolCallThrottleEngine();
      // Read burst limit is 5 in 10s
      for (let i = 0; i < 5; i++) {
        engine.check("Read");
      }
      const result = engine.check("Read");
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("burst");
    });

    it("allows different tools independently", () => {
      const engine = new ToolCallThrottleEngine();
      engine.check("Read");
      engine.check("Read");
      engine.check("Read");
      const result = engine.check("Grep");
      expect(result.allowed).toBe(true);
    });

    it("reports calls in window", () => {
      const engine = new ToolCallThrottleEngine();
      engine.check("Read");
      engine.check("Read");
      const result = engine.check("Read");
      expect(result.callsInWindow).toBe(3);
    });
  });

  describe("setRule", () => {
    it("allows custom rules", () => {
      const engine = new ToolCallThrottleEngine();
      engine.setRule("Custom", 2, 1, 1000);
      engine.check("Custom");
      const result = engine.check("Custom");
      expect(result.allowed).toBe(false);
    });
  });

  describe("stats", () => {
    it("tracks checks and throttles", () => {
      const engine = new ToolCallThrottleEngine();
      engine.setRule("Test", 1, 1, 1000);
      engine.check("Test");
      engine.check("Test");
      const stats = engine.stats();
      expect(stats.totalChecks).toBe(2);
      expect(stats.totalThrottled).toBe(1);
      expect(stats.throttleRate).toBe(50);
    });

    it("breaks down per tool", () => {
      const engine = new ToolCallThrottleEngine();
      engine.check("Read");
      engine.check("Grep");
      const stats = engine.stats();
      expect(stats.perTool.length).toBe(2);
    });
  });

  describe("oneLiner", () => {
    it("produces compact status", () => {
      const engine = new ToolCallThrottleEngine();
      engine.check("Read");
      const line = engine.oneLiner();
      expect(line).toContain("1 checks");
      expect(line).toContain("Throttle");
    });
  });

  describe("reset", () => {
    it("clears all state", () => {
      const engine = new ToolCallThrottleEngine();
      engine.check("Read");
      engine.reset();
      expect(engine.stats().totalChecks).toBe(0);
    });
  });
});
