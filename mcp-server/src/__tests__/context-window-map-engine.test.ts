import { describe, it, expect } from "vitest";
import { ContextWindowMapEngine } from "../engines/ContextWindowMapEngine.js";

describe("ContextWindowMapEngine", () => {
  describe("add and map", () => {
    it("tracks added segments", () => {
      const engine = new ContextWindowMapEngine();
      engine.add("file", "src/a.ts", 500);
      engine.add("tool-output", "grep result", 200);
      const m = engine.map();
      expect(m.segments.length).toBe(2);
      expect(m.totalTokens).toBe(700);
    });

    it("groups by type", () => {
      const engine = new ContextWindowMapEngine();
      engine.add("file", "a.ts", 500);
      engine.add("file", "b.ts", 300);
      engine.add("conversation", "turn 1", 200);
      const m = engine.map();
      expect(m.byType["file"].count).toBe(2);
      expect(m.byType["file"].tokens).toBe(800);
    });

    it("identifies largest segments", () => {
      const engine = new ContextWindowMapEngine();
      engine.add("file", "big.ts", 5000);
      engine.add("file", "small.ts", 100);
      const m = engine.map();
      expect(m.largestSegments[0].label).toBe("big.ts");
    });
  });

  describe("remove", () => {
    it("removes a segment by id", () => {
      const engine = new ContextWindowMapEngine();
      const id = engine.add("file", "a.ts", 500);
      expect(engine.remove(id)).toBe(true);
      expect(engine.map().segments.length).toBe(0);
    });

    it("returns false for unknown id", () => {
      const engine = new ContextWindowMapEngine();
      expect(engine.remove("nonexistent")).toBe(false);
    });
  });

  describe("stale detection", () => {
    it("marks segments as stale manually", () => {
      const engine = new ContextWindowMapEngine();
      const id = engine.add("file", "old.ts", 1000);
      engine.markStale(id);
      const m = engine.map();
      expect(m.staleTokens).toBe(1000);
    });

    it("reclaimable returns stale segments", () => {
      const engine = new ContextWindowMapEngine();
      const id = engine.add("tool-output", "old result", 2000);
      engine.markStale(id);
      const r = engine.reclaimable();
      expect(r.totalTokens).toBe(2000);
      expect(r.segments.length).toBe(1);
    });
  });

  describe("utilization", () => {
    it("calculates percentage", () => {
      const engine = new ContextWindowMapEngine(10000);
      engine.add("file", "a.ts", 5000);
      expect(engine.utilization()).toBe(50);
    });
  });

  describe("chart", () => {
    it("produces ASCII bar chart", () => {
      const engine = new ContextWindowMapEngine();
      engine.add("file", "a.ts", 500);
      engine.add("conversation", "turn", 200);
      const chart = engine.chart();
      expect(chart).toContain("file");
      expect(chart).toContain("#");
    });
  });

  describe("oneLiner", () => {
    it("produces compact status", () => {
      const engine = new ContextWindowMapEngine(100000);
      engine.add("file", "a.ts", 500);
      const line = engine.oneLiner();
      expect(line).toContain("500/100000");
      expect(line).toContain("1 segments");
    });
  });

  describe("reset", () => {
    it("clears all segments", () => {
      const engine = new ContextWindowMapEngine();
      engine.add("file", "a.ts", 500);
      engine.reset();
      expect(engine.map().segments.length).toBe(0);
    });
  });
});
