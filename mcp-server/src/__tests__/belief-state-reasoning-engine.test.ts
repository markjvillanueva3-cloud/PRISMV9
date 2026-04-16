/**
 * Tests for BeliefStateReasoningEngine (Phase 0.18 U-AGI13)
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  BeliefStateReasoningEngine,
  beliefStateReasoningEngine,
} from "../engines/BeliefStateReasoningEngine.js";

describe("BeliefStateReasoningEngine", () => {
  let e: BeliefStateReasoningEngine;

  beforeEach(() => {
    e = new BeliefStateReasoningEngine();
  });

  describe("set() / get()", () => {
    it("stores and normalizes a distribution", () => {
      const entry = e.set("file", { current: 80, stale: 15, corrupt: 5 });
      const sum = Object.values(entry.distribution).reduce((a, v) => a + v, 0);
      expect(sum).toBeCloseTo(1, 4);
    });

    it("rejects empty id", () => {
      expect(() => e.set("", { a: 1 })).toThrow(/non-empty/);
    });

    it("rejects empty or invalid distribution", () => {
      expect(() => e.set("x", {})).toThrow(/at least one/);
      expect(() => e.set("x", { a: -1 })).toThrow(/at least one/);
    });

    it("treats all-zero input as uniform over provided states", () => {
      const entry = e.set("x", { a: 0, b: 0, c: 0 });
      for (const p of Object.values(entry.distribution)) {
        expect(p).toBeCloseTo(1 / 3, 4);
      }
    });

    it("stamps updatedAt", () => {
      const entry = e.set("x", { a: 1 }, "test", "2026-04-16T00:00:00.000Z");
      expect(entry.updatedAt).toBe("2026-04-16T00:00:00.000Z");
    });

    it("get returns null for unknown id", () => {
      expect(e.get("ghost")).toBeNull();
    });
  });

  describe("update() — Bayesian", () => {
    it("shifts probability mass toward observed state", () => {
      e.set("file", { current: 50, stale: 50 });
      e.update("file", { current: 10, stale: 1 });
      expect(e.probabilityOf("file", "current")).toBeGreaterThan(e.probabilityOf("file", "stale"));
    });

    it("zero likelihood fully eliminates a state", () => {
      e.set("file", { a: 50, b: 50 });
      e.update("file", { a: 1, b: 0 });
      expect(e.probabilityOf("file", "a")).toBeCloseTo(1, 4);
      expect(e.probabilityOf("file", "b")).toBe(0);
    });

    it("renormalizes after update", () => {
      e.set("file", { a: 50, b: 50 });
      e.update("file", { a: 2, b: 8 });
      const sum = Object.values(e.get("file")!.distribution).reduce((a, v) => a + v, 0);
      expect(sum).toBeCloseTo(1, 4);
    });

    it("throws for unknown belief id", () => {
      expect(() => e.update("ghost", { a: 1 })).toThrow(/Unknown belief/);
    });

    it("rejects negative likelihoods", () => {
      e.set("x", { a: 1 });
      expect(() => e.update("x", { a: -1 })).toThrow(/non-negative/);
    });

    it("introduces new states when likelihood names a previously-unseen one", () => {
      e.set("x", { a: 1, b: 1 });
      e.update("x", { a: 0.1, b: 0.1, c: 1 });
      expect(e.probabilityOf("x", "c")).toBeGreaterThan(0);
    });

    it("states absent from likelihood default to 1× (no change beyond renorm)", () => {
      e.set("x", { a: 0.5, b: 0.5 });
      e.update("x", {});
      expect(e.probabilityOf("x", "a")).toBeCloseTo(0.5, 4);
      expect(e.probabilityOf("x", "b")).toBeCloseTo(0.5, 4);
    });
  });

  describe("topK()", () => {
    it("returns the most likely states in descending probability", () => {
      e.set("file", { current: 60, stale: 30, corrupt: 10 });
      const top = e.topK("file", 2);
      expect(top[0].state).toBe("current");
      expect(top[1].state).toBe("stale");
    });

    it("breaks ties alphabetically", () => {
      e.set("x", { z: 1, a: 1, m: 1 });
      const top = e.topK("x", 3);
      expect(top.map((t) => t.state)).toEqual(["a", "m", "z"]);
    });

    it("returns empty for unknown id or k<=0", () => {
      expect(e.topK("ghost")).toEqual([]);
      e.set("x", { a: 1 });
      expect(e.topK("x", 0)).toEqual([]);
      expect(e.topK("x", -1)).toEqual([]);
    });

    it("caps at the number of available states", () => {
      e.set("x", { a: 1 });
      expect(e.topK("x", 10)).toHaveLength(1);
    });
  });

  describe("entropy()", () => {
    it("is zero for a certain belief", () => {
      e.set("x", { a: 1, b: 0, c: 0 });
      expect(e.entropy("x")).toBe(0);
    });

    it("is log2(N) for a uniform distribution of N states", () => {
      e.set("x", { a: 1, b: 1, c: 1, d: 1 });
      expect(e.entropy("x")).toBeCloseTo(2, 3);
    });

    it("is zero for unknown belief id", () => {
      expect(e.entropy("ghost")).toBe(0);
    });

    it("lies strictly between 0 and log2(N) for non-uniform distributions", () => {
      e.set("x", { a: 0.9, b: 0.1 });
      const h = e.entropy("x");
      expect(h).toBeGreaterThan(0);
      expect(h).toBeLessThan(1);
    });
  });

  describe("probabilityOf()", () => {
    it("returns 0 for unknown id or state", () => {
      expect(e.probabilityOf("ghost", "a")).toBe(0);
      e.set("x", { a: 1 });
      expect(e.probabilityOf("x", "never")).toBe(0);
    });
  });

  describe("lifecycle", () => {
    it("list returns all beliefs", () => {
      e.set("a", { x: 1 });
      e.set("b", { y: 1 });
      expect(e.list().map((b) => b.id).sort()).toEqual(["a", "b"]);
    });

    it("delete removes a belief", () => {
      e.set("a", { x: 1 });
      expect(e.delete("a")).toBe(true);
      expect(e.delete("a")).toBe(false);
    });

    it("clear empties the engine", () => {
      e.set("a", { x: 1 });
      e.clear();
      expect(e.size()).toBe(0);
    });
  });

  describe("module singleton", () => {
    it("exports a ready-to-use instance", () => {
      beliefStateReasoningEngine.clear();
      beliefStateReasoningEngine.set("s", { a: 1, b: 1 });
      expect(beliefStateReasoningEngine.entropy("s")).toBeCloseTo(1, 3);
      beliefStateReasoningEngine.clear();
    });
  });
});
