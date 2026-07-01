import { describe, it, expect, beforeEach } from "vitest";
import { HookEfficiencyEngine } from "../engines/HookEfficiencyEngine.js";

describe("HookEfficiencyEngine", () => {
  let engine: HookEfficiencyEngine;

  beforeEach(() => {
    engine = new HookEfficiencyEngine();
  });

  describe("record and getStats", () => {
    it("tracks saves", () => {
      engine.record("read-after-edit", "Read", "block");
      engine.record("grep-dedup", "Grep", "warn");
      const stats = engine.getStats();
      expect(stats.totalSaves).toBe(2);
      expect(stats.totalTokensSaved).toBeGreaterThan(0);
    });

    it("groups by hook", () => {
      engine.record("read-after-edit", "Read", "block");
      engine.record("read-after-edit", "Read", "block");
      engine.record("grep-dedup", "Grep", "warn");
      const stats = engine.getStats();
      expect(stats.byHook["read-after-edit"].count).toBe(2);
      expect(stats.byHook["grep-dedup"].count).toBe(1);
    });

    it("groups by action", () => {
      engine.record("a", "Read", "block");
      engine.record("b", "Grep", "warn");
      engine.record("c", "Bash", "rewrite");
      const stats = engine.getStats();
      expect(stats.byAction["block"].count).toBe(1);
      expect(stats.byAction["warn"].count).toBe(1);
      expect(stats.byAction["rewrite"].count).toBe(1);
    });

    it("applies action multipliers", () => {
      // Block = 100%, warn = 30%, rewrite = 50%
      engine.record("a", "Read", "block", 1000);
      engine.record("b", "Read", "warn", 1000);
      engine.record("c", "Read", "rewrite", 1000);
      const stats = engine.getStats();
      expect(stats.totalTokensSaved).toBe(1000 + 300 + 500);
    });

    it("returns top savers sorted by tokens", () => {
      engine.record("small", "Grep", "warn", 100);
      engine.record("big", "Agent", "block", 5000);
      engine.record("big", "Agent", "block", 5000);
      const stats = engine.getStats();
      expect(stats.topSavers[0].hook).toBe("big");
    });
  });

  describe("getStatusLine", () => {
    it("returns empty message for new session", () => {
      expect(engine.getStatusLine()).toContain("0 saves");
    });

    it("returns summary with saves", () => {
      engine.record("read-dedup", "Read", "block");
      const line = engine.getStatusLine();
      expect(line).toContain("1 saves");
      expect(line).toContain("tokens saved");
    });
  });

  describe("getRecent", () => {
    it("filters by time window", () => {
      engine.record("a", "Read", "block");
      const recent = engine.getRecent(10);
      expect(recent.length).toBe(1);
    });
  });

  describe("getROI", () => {
    it("calculates budget percentage saved", () => {
      engine.record("a", "Read", "block", 15000);
      const roi = engine.getROI(150000);
      expect(roi.tokensSaved).toBe(15000);
      expect(roi.budgetPercent).toBe(10);
      expect(roi.callsBlocked).toBe(1);
    });
  });

  describe("reset", () => {
    it("clears all tracking", () => {
      engine.record("a", "Read", "block");
      engine.reset();
      expect(engine.getStats().totalSaves).toBe(0);
    });
  });
});
