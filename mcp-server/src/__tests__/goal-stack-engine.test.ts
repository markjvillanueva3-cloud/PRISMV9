/**
 * Tests for GoalStackEngine (Phase 0.13 U-SAW3)
 */

import { describe, it, expect, beforeEach } from "vitest";
import { GoalStackEngine, goalStackEngine } from "../engines/GoalStackEngine.js";

describe("GoalStackEngine", () => {
  let e: GoalStackEngine;

  beforeEach(() => {
    e = new GoalStackEngine();
  });

  describe("push()", () => {
    it("creates a root-level goal with depth 0", () => {
      const g = e.push("ship the MVP");
      expect(g.id).toBe("g1");
      expect(g.text).toBe("ship the MVP");
      expect(g.depth).toBe(0);
      expect(g.parentId).toBeNull();
      expect(g.status).toBe("active");
      expect(g.childIds).toEqual([]);
    });

    it("assigns sequential ids", () => {
      const a = e.push("a");
      const b = e.push("b");
      const c = e.push("c");
      expect([a.id, b.id, c.id]).toEqual(["g1", "g2", "g3"]);
    });

    it("trims whitespace from text", () => {
      const g = e.push("   draft   ");
      expect(g.text).toBe("draft");
    });

    it("throws on empty or whitespace-only text", () => {
      expect(() => e.push("")).toThrow(/non-empty/);
      expect(() => e.push("   ")).toThrow(/non-empty/);
    });

    it("threads a parent goal into parentId and childIds", () => {
      const parent = e.push("build feature");
      const child = e.push("write tests", { parentId: parent.id });
      expect(child.parentId).toBe(parent.id);
      expect(child.depth).toBe(1);
      expect(e.get(parent.id)?.childIds).toEqual([child.id]);
    });

    it("rejects unknown parentId", () => {
      expect(() => e.push("orphan", { parentId: "g99" })).toThrow(/unknown parentId/);
    });

    it("records createdAt when at is supplied", () => {
      const g = e.push("scheduled", { at: "2026-04-16T00:00:00.000Z" });
      expect(g.createdAt).toBe("2026-04-16T00:00:00.000Z");
      expect(g.updatedAt).toBe("2026-04-16T00:00:00.000Z");
    });
  });

  describe("complete() / abandon()", () => {
    it("complete() flips status and returns the goal", () => {
      const g = e.push("x");
      const r = e.complete(g.id, "2026-04-16T12:00:00.000Z");
      expect(r?.status).toBe("completed");
      expect(r?.updatedAt).toBe("2026-04-16T12:00:00.000Z");
    });

    it("abandon() flips status to abandoned", () => {
      const g = e.push("y");
      expect(e.abandon(g.id)?.status).toBe("abandoned");
    });

    it("returns null for unknown id", () => {
      expect(e.complete("g999")).toBeNull();
      expect(e.abandon("g999")).toBeNull();
    });

    it("is idempotent on a non-active goal", () => {
      const g = e.push("z");
      e.complete(g.id, "2026-04-16T12:00:00.000Z");
      const r = e.complete(g.id, "2026-04-16T13:00:00.000Z");
      expect(r?.status).toBe("completed");
      expect(r?.updatedAt).toBe("2026-04-16T12:00:00.000Z"); // unchanged
    });
  });

  describe("completeCascade()", () => {
    it("completes goal and all active descendants", () => {
      const root = e.push("root");
      const a = e.push("a", { parentId: root.id });
      const b = e.push("b", { parentId: root.id });
      const aa = e.push("aa", { parentId: a.id });

      const changed = e.completeCascade(root.id);
      expect(changed).toBe(4);
      expect(e.get(root.id)?.status).toBe("completed");
      expect(e.get(a.id)?.status).toBe("completed");
      expect(e.get(b.id)?.status).toBe("completed");
      expect(e.get(aa.id)?.status).toBe("completed");
    });

    it("skips already non-active descendants in count", () => {
      const root = e.push("root");
      const child = e.push("child", { parentId: root.id });
      e.abandon(child.id);
      const changed = e.completeCascade(root.id);
      expect(changed).toBe(1); // only root flipped
      expect(e.get(child.id)?.status).toBe("abandoned");
    });

    it("returns 0 on unknown id", () => {
      expect(e.completeCascade("g999")).toBe(0);
    });
  });

  describe("current()", () => {
    it("returns null when the stack is empty", () => {
      expect(e.current()).toBeNull();
    });

    it("returns the deepest active goal", () => {
      const a = e.push("root");
      const b = e.push("child", { parentId: a.id });
      expect(e.current()?.id).toBe(b.id);
    });

    it("skips completed goals when choosing current", () => {
      const a = e.push("root");
      const b = e.push("child", { parentId: a.id });
      e.complete(b.id);
      expect(e.current()?.id).toBe(a.id);
    });

    it("returns null when no goal is active", () => {
      const a = e.push("root");
      e.abandon(a.id);
      expect(e.current()).toBeNull();
    });

    it("tie-breaks equal-depth active goals by latest insertion", () => {
      const a = e.push("a"); // depth 0
      const b = e.push("b"); // depth 0
      expect(e.current()?.id).toBe(b.id);
    });
  });

  describe("topN()", () => {
    it("returns an empty array when n <= 0", () => {
      e.push("x");
      expect(e.topN(0)).toEqual([]);
      expect(e.topN(-1)).toEqual([]);
    });

    it("returns up to n active goals", () => {
      for (let i = 0; i < 7; i += 1) e.push(`goal-${i}`);
      expect(e.topN(5)).toHaveLength(5);
    });

    it("excludes completed and abandoned goals", () => {
      const a = e.push("a");
      const b = e.push("b");
      e.complete(a.id);
      e.abandon(b.id);
      const c = e.push("c");
      const top = e.topN(5);
      expect(top.map((g) => g.id)).toEqual([c.id]);
    });

    it("orders by priority desc, then depth desc, then insertion asc", () => {
      const low = e.push("low", { priority: 1 });
      const mid = e.push("mid", { priority: 5 });
      const highRoot = e.push("high-root", { priority: 10 });
      const highDeep = e.push("high-deep", { parentId: highRoot.id, priority: 10 });

      const top = e.topN(10).map((g) => g.id);
      expect(top[0]).toBe(highDeep.id); // same priority, deeper wins
      expect(top[1]).toBe(highRoot.id);
      expect(top[2]).toBe(mid.id);
      expect(top[3]).toBe(low.id);
    });

    it("defaults n=5 when no argument supplied", () => {
      for (let i = 0; i < 8; i += 1) e.push(`goal-${i}`);
      expect(e.topN()).toHaveLength(5);
    });
  });

  describe("tree()", () => {
    it("returns root goals with nested children annotated", () => {
      const root = e.push("r");
      const a = e.push("a", { parentId: root.id });
      const aa = e.push("aa", { parentId: a.id });

      const tree = e.tree();
      expect(tree).toHaveLength(1);
      expect(tree[0].id).toBe(root.id);
      expect(tree[0].children).toHaveLength(1);
      expect(tree[0].children[0].id).toBe(a.id);
      expect((tree[0].children[0] as unknown as { children: unknown[] }).children).toHaveLength(1);
    });

    it("returns empty array when no goals exist", () => {
      expect(e.tree()).toEqual([]);
    });
  });

  describe("activeCount() / all() / get()", () => {
    it("activeCount reflects only active goals", () => {
      const a = e.push("a");
      e.push("b");
      e.complete(a.id);
      expect(e.activeCount()).toBe(1);
    });

    it("all() returns goals in insertion order", () => {
      e.push("a");
      e.push("b");
      e.push("c");
      expect(e.all().map((g) => g.text)).toEqual(["a", "b", "c"]);
    });

    it("get() returns null for unknown id", () => {
      expect(e.get("g99")).toBeNull();
    });
  });

  describe("toJSON / fromJSON round-trip", () => {
    it("preserves goals, ids, and counter", () => {
      const root = e.push("root");
      e.push("child", { parentId: root.id });
      e.complete(root.id);

      const json = e.toJSON();
      const restored = GoalStackEngine.fromJSON(json);

      expect(restored.all().map((g) => g.id)).toEqual(e.all().map((g) => g.id));
      expect(restored.get(root.id)?.status).toBe("completed");

      const next = restored.push("after-restore");
      expect(next.id).toBe("g3"); // counter continues
    });

    it("rejects unsupported schemaVersion", () => {
      expect(() => GoalStackEngine.fromJSON({ schemaVersion: 2, goals: [], nextId: 1 })).toThrow(
        /schemaVersion/
      );
    });
  });

  describe("clear()", () => {
    it("resets all state", () => {
      e.push("a");
      e.push("b");
      e.clear();
      expect(e.all()).toEqual([]);
      expect(e.activeCount()).toBe(0);
      const next = e.push("fresh");
      expect(next.id).toBe("g1");
    });
  });

  describe("module singleton", () => {
    it("exports a ready-to-use goalStackEngine", () => {
      goalStackEngine.clear();
      expect(goalStackEngine.activeCount()).toBe(0);
      goalStackEngine.push("singleton-goal");
      expect(goalStackEngine.activeCount()).toBe(1);
      goalStackEngine.clear();
    });
  });
});
