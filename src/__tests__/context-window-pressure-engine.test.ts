import { describe, it, expect } from "vitest";
import { ContextWindowPressureEngine } from "../engines/ContextWindowPressureEngine.js";

describe("ContextWindowPressureEngine", () => {

  describe("read", () => {
    it("returns green at low utilization", () => {
      const engine = new ContextWindowPressureEngine(200000);
      const r = engine.read(50000);
      expect(r.status).toBe("green");
      expect(r.utilization).toBeCloseTo(0.25, 1);
    });

    it("returns yellow at 50-70%", () => {
      const engine = new ContextWindowPressureEngine(200000);
      const r = engine.read(120000);
      expect(r.status).toBe("yellow");
    });

    it("returns orange at 70-85%", () => {
      const engine = new ContextWindowPressureEngine(200000);
      const r = engine.read(150000);
      expect(r.status).toBe("orange");
    });

    it("returns red above threshold", () => {
      const engine = new ContextWindowPressureEngine(200000);
      const r = engine.read(180000);
      expect(r.status).toBe("red");
    });
  });

  describe("rate calculation", () => {
    it("calculates token rate from samples", () => {
      const engine = new ContextWindowPressureEngine(200000);
      const now = Date.now();
      engine.record(50000, now - 60000); // 1 min ago
      engine.record(60000, now - 30000); // 30s ago
      const r = engine.read(70000);
      expect(r.rate).toBeGreaterThan(0);
    });

    it("returns zero rate with single sample", () => {
      const engine = new ContextWindowPressureEngine(200000);
      const r = engine.read(50000);
      expect(r.rate).toBe(0);
    });
  });

  describe("optimalCompactionPoint", () => {
    it("returns false for healthy state", () => {
      const engine = new ContextWindowPressureEngine(200000);
      engine.record(30000);
      const p = engine.optimalCompactionPoint();
      expect(p.shouldCompactNow).toBe(false);
    });

    it("returns true over threshold", () => {
      const engine = new ContextWindowPressureEngine(200000);
      engine.record(100000);
      engine.record(180000);
      const p = engine.optimalCompactionPoint();
      expect(p.shouldCompactNow).toBe(true);
    });

    it("returns insufficient data without samples", () => {
      const engine = new ContextWindowPressureEngine(200000);
      const p = engine.optimalCompactionPoint();
      expect(p.reason).toContain("Insufficient");
    });
  });

  describe("oneLiner", () => {
    it("produces compact status", () => {
      const engine = new ContextWindowPressureEngine(200000);
      const line = engine.oneLiner(100000);
      expect(line).toContain("50%");
      expect(line).toContain("200K");
    });
  });

  describe("reset", () => {
    it("clears all samples", () => {
      const engine = new ContextWindowPressureEngine(200000);
      engine.record(50000);
      engine.record(100000);
      engine.reset();
      const p = engine.optimalCompactionPoint();
      expect(p.reason).toContain("Insufficient");
    });
  });
});
