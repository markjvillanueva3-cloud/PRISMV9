import { describe, it, expect } from "vitest";
import { SessionTokenLedgerEngine } from "../engines/SessionTokenLedgerEngine.js";

describe("SessionTokenLedgerEngine", () => {
  describe("record and summary", () => {
    it("tracks entries", () => {
      const engine = new SessionTokenLedgerEngine();
      engine.record("Read", 100, 500);
      engine.record("Grep", 50, 200);
      const s = engine.summary();
      expect(s.totalEntries).toBe(2);
      expect(s.totalInput).toBe(150);
      expect(s.totalOutput).toBe(700);
      expect(s.totalTokens).toBe(850);
    });

    it("aggregates by tool", () => {
      const engine = new SessionTokenLedgerEngine();
      engine.record("Read", 100, 500);
      engine.record("Read", 100, 300);
      engine.record("Grep", 50, 200);
      const s = engine.summary();
      expect(s.topTools[0].tool).toBe("Read");
      expect(s.topTools[0].count).toBe(2);
      expect(s.topTools[0].avgCost).toBe(500);
    });

    it("shows recent entries", () => {
      const engine = new SessionTokenLedgerEngine();
      for (let i = 0; i < 10; i++) {
        engine.record("Read", 100, 100);
      }
      const s = engine.summary();
      expect(s.recentEntries.length).toBe(5);
    });
  });

  describe("recordFromText", () => {
    it("estimates tokens from text length", () => {
      const engine = new SessionTokenLedgerEngine();
      engine.recordFromText("Read", "x".repeat(400), "y".repeat(2000));
      const s = engine.summary();
      expect(s.totalInput).toBe(100);
      expect(s.totalOutput).toBe(500);
    });
  });

  describe("project", () => {
    it("reports healthy status for low usage", () => {
      const engine = new SessionTokenLedgerEngine(200000);
      engine.record("Read", 100, 500);
      const p = engine.project();
      expect(p.status).toBe("healthy");
      expect(p.tokensRemaining).toBe(199400);
    });

    it("reports critical status for high usage", () => {
      const engine = new SessionTokenLedgerEngine(1000);
      engine.record("Read", 500, 400);
      const p = engine.project();
      expect(p.status).toBe("critical");
    });

    it("reports warning status for moderate usage", () => {
      const engine = new SessionTokenLedgerEngine(1000);
      engine.record("Read", 350, 300);
      const p = engine.project();
      expect(p.status).toBe("warning");
    });
  });

  describe("mostExpensive", () => {
    it("finds the costliest entry", () => {
      const engine = new SessionTokenLedgerEngine();
      engine.record("Read", 100, 200);
      engine.record("Agent", 500, 2000, "big query");
      engine.record("Grep", 50, 100);
      const exp = engine.mostExpensive();
      expect(exp).toBeDefined();
      expect(exp!.tool).toBe("Agent");
      expect(exp!.label).toBe("big query");
    });

    it("returns undefined for empty ledger", () => {
      const engine = new SessionTokenLedgerEngine();
      expect(engine.mostExpensive()).toBeUndefined();
    });
  });

  describe("oneLiner", () => {
    it("produces compact status line", () => {
      const engine = new SessionTokenLedgerEngine(100000);
      engine.record("Read", 100, 500);
      const line = engine.oneLiner();
      expect(line).toContain("600/100000");
      expect(line).toContain("healthy");
    });
  });

  describe("reset", () => {
    it("clears all entries", () => {
      const engine = new SessionTokenLedgerEngine();
      engine.record("Read", 100, 500);
      engine.reset();
      expect(engine.count).toBe(0);
      expect(engine.summary().totalTokens).toBe(0);
    });
  });
});
