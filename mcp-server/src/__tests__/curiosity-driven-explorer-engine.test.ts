/**
 * Tests for CuriosityDrivenExplorerEngine (Phase 0.18 U-AGI5)
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  CuriosityDrivenExplorerEngine,
  curiosityDrivenExplorerEngine,
} from "../engines/CuriosityDrivenExplorerEngine.js";

describe("CuriosityDrivenExplorerEngine", () => {
  let e: CuriosityDrivenExplorerEngine;

  beforeEach(() => {
    e = new CuriosityDrivenExplorerEngine();
  });

  describe("observe() — validation", () => {
    it("rejects missing kind", () => {
      expect(() => e.observe({ target: "x" } as { kind: "other"; target: string })).toThrow(/kind/);
    });

    it("rejects missing or empty target", () => {
      expect(() => e.observe({ kind: "other", target: "" })).toThrow(/target/);
      expect(() => e.observe({ kind: "other", target: "   " })).toThrow(/target/);
    });

    it("rejects unknown kind", () => {
      expect(() =>
        e.observe({ kind: "alien" as "other", target: "x" })
      ).toThrow(/unknown kind/);
    });

    it("rejects negative ageDays", () => {
      expect(() => e.observe({ kind: "other", target: "x", ageDays: -1 })).toThrow(/non-negative/);
    });
  });

  describe("observe() — de-duplication", () => {
    it("returns null for a duplicate observation", () => {
      expect(e.observe({ kind: "other", target: "x" })).not.toBeNull();
      expect(e.observe({ kind: "other", target: "x" })).toBeNull();
      expect(e.size()).toBe(1);
    });

    it("treats same target with different kind as distinct", () => {
      e.observe({ kind: "other", target: "x" });
      e.observe({ kind: "orphan-route", target: "x" });
      expect(e.size()).toBe(2);
    });
  });

  describe("scoring + priority", () => {
    it("orphan-route and unregistered-file get a high base", () => {
      const a = e.observe({ kind: "orphan-route", target: "r1" })!;
      const b = e.observe({ kind: "unregistered-file", target: "f1" })!;
      expect(a.score).toBeGreaterThanOrEqual(3);
      expect(b.score).toBeGreaterThanOrEqual(3);
    });

    it("zero-citation tip gets a lower base", () => {
      const c = e.observe({ kind: "zero-citation-tip", target: "tip-1" })!;
      expect(c.score).toBeLessThan(3);
    });

    it("age adds a capped bonus", () => {
      const recent = e.observe({ kind: "other", target: "r", ageDays: 10 })!;
      const ancient = e.observe({ kind: "other", target: "a", ageDays: 10_000 })!;
      expect(ancient.score).toBeGreaterThanOrEqual(recent.score);
      expect(ancient.score - 1).toBeLessThanOrEqual(2); // age bonus capped at 2
    });

    it("priority bucket reflects the score", () => {
      const low = e.observe({ kind: "zero-citation-tip", target: "low" })!;
      const high = e.observe({ kind: "orphan-route", target: "high", ageDays: 1000 })!;
      expect(low.priority).toBe("low");
      expect(["medium", "high"]).toContain(high.priority);
    });

    it("rationale mentions kind and score", () => {
      const c = e.observe({ kind: "other", target: "x", ageDays: 5 })!;
      expect(c.rationale).toContain("other");
      expect(c.rationale).toContain(`score ${c.score}`);
    });
  });

  describe("rank() / pop()", () => {
    it("rank returns top-N by score descending", () => {
      e.observe({ kind: "zero-citation-tip", target: "low" });
      e.observe({ kind: "orphan-route", target: "high" });
      const top = e.rank(1);
      expect(top[0].target).toBe("high");
    });

    it("rank breaks ties by target name ascending", () => {
      e.observe({ kind: "other", target: "zulu" });
      e.observe({ kind: "other", target: "alpha" });
      const top = e.rank(2);
      expect(top.map((t) => t.target)).toEqual(["zulu", "alpha"].sort());
    });

    it("rank with limit=0 returns empty list", () => {
      e.observe({ kind: "other", target: "x" });
      expect(e.rank(0)).toEqual([]);
    });

    it("pop removes the top candidate permanently", () => {
      e.observe({ kind: "zero-citation-tip", target: "low" });
      e.observe({ kind: "orphan-route", target: "high" });
      const first = e.pop();
      expect(first?.target).toBe("high");
      expect(e.size()).toBe(1);
    });

    it("pop returns null when empty", () => {
      expect(e.pop()).toBeNull();
    });
  });

  describe("observeBatch()", () => {
    it("skips duplicates and returns only the new ones", () => {
      const added = e.observeBatch([
        { kind: "other", target: "a" },
        { kind: "other", target: "a" },
        { kind: "other", target: "b" },
      ]);
      expect(added.map((c) => c.target)).toEqual(["a", "b"]);
    });
  });

  describe("clear()", () => {
    it("empties the queue and seen set (dups can re-observe)", () => {
      e.observe({ kind: "other", target: "x" });
      e.clear();
      expect(e.size()).toBe(0);
      expect(e.observe({ kind: "other", target: "x" })).not.toBeNull();
    });
  });

  describe("module singleton", () => {
    it("exports a ready-to-use instance", () => {
      curiosityDrivenExplorerEngine.clear();
      curiosityDrivenExplorerEngine.observe({ kind: "other", target: "s" });
      expect(curiosityDrivenExplorerEngine.size()).toBe(1);
      curiosityDrivenExplorerEngine.clear();
    });
  });
});
