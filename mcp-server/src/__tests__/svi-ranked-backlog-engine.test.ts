/**
 * Tests for SVIRankedBacklogEngine (Phase 0.14 U-SVI6)
 */

import { describe, it, expect } from "vitest";
import {
  SVIRankedBacklogEngine,
  sviRankedBacklogEngine,
  type BacklogUnit,
} from "../engines/SVIRankedBacklogEngine.js";

function makeUnit(
  id: string,
  overrides: Partial<BacklogUnit> & { psiDelta?: number; hours?: number } = {}
): BacklogUnit {
  const psiDelta = overrides.psiDelta ?? 1;
  const hours = overrides.hours ?? 1;
  return {
    id,
    title: overrides.title ?? `Unit ${id}`,
    estimatedHours: hours,
    projection: {
      psiDelta,
      rationale: [],
      risk: "medium",
      badge: `Ψ ${psiDelta >= 0 ? "+" : ""}${psiDelta.toFixed(2)}`,
    },
    status: overrides.status,
    dependencies: overrides.dependencies,
    tags: overrides.tags,
  };
}

describe("SVIRankedBacklogEngine", () => {
  const engine = new SVIRankedBacklogEngine();

  describe("scoreOne()", () => {
    it("equals psiDelta / estimatedHours", () => {
      const u = makeUnit("a", { psiDelta: 4, hours: 2 });
      expect(engine.scoreOne(u)).toBe(2);
    });

    it("rounds to 4 decimal places", () => {
      const u = makeUnit("a", { psiDelta: 1, hours: 3 });
      expect(engine.scoreOne(u)).toBeCloseTo(0.3333, 4);
    });

    it("rejects zero or negative estimatedHours", () => {
      expect(() => engine.scoreOne(makeUnit("a", { hours: 0 }))).toThrow(/estimatedHours/);
      expect(() => engine.scoreOne(makeUnit("a", { hours: -1 }))).toThrow(/estimatedHours/);
    });
  });

  describe("rank() — ordering", () => {
    it("orders units by score descending", () => {
      const ranked = engine.rank([
        makeUnit("a", { psiDelta: 1, hours: 10 }), // 0.1
        makeUnit("b", { psiDelta: 5, hours: 1 }), // 5.0
        makeUnit("c", { psiDelta: 2, hours: 2 }), // 1.0
      ]);
      expect(ranked.map((r) => r.id)).toEqual(["b", "c", "a"]);
      expect(ranked[0].rank).toBe(1);
      expect(ranked[2].rank).toBe(3);
    });

    it("breaks ties by id ascending for deterministic ordering", () => {
      const ranked = engine.rank([
        makeUnit("z", { psiDelta: 1, hours: 1 }),
        makeUnit("a", { psiDelta: 1, hours: 1 }),
        makeUnit("m", { psiDelta: 1, hours: 1 }),
      ]);
      expect(ranked.map((r) => r.id)).toEqual(["a", "m", "z"]);
    });
  });

  describe("rank() — dependencies", () => {
    it("flags units whose dependencies are not completed as blocked", () => {
      const ranked = engine.rank([
        makeUnit("a", { psiDelta: 10, hours: 1, dependencies: ["b"] }),
        makeUnit("b", { psiDelta: 1, hours: 1, status: "in_progress" }),
      ]);
      const a = ranked.find((r) => r.id === "a")!;
      expect(a.blockedByUnresolved).toBe(true);
    });

    it("treats completed dependencies as resolved", () => {
      const ranked = engine.rank([
        makeUnit("a", { psiDelta: 10, hours: 1, dependencies: ["b"] }),
        makeUnit("b", { psiDelta: 1, hours: 1, status: "completed" }),
      ]);
      // completed units are excluded by default, so only 'a' remains
      expect(ranked).toHaveLength(1);
      expect(ranked[0].id).toBe("a");
      expect(ranked[0].blockedByUnresolved).toBe(false);
    });

    it("pushes blocked units below equally-scored unblocked units", () => {
      const ranked = engine.rank([
        makeUnit("a", { psiDelta: 10, hours: 1, dependencies: ["z"] }),
        makeUnit("z", { psiDelta: 1, hours: 1 }),
      ]);
      expect(ranked[0].id).toBe("z");
      expect(ranked[1].id).toBe("a");
      expect(ranked[1].blockedByUnresolved).toBe(true);
    });

    it("disables dependency handling when respectDependencies=false", () => {
      const ranked = engine.rank(
        [
          makeUnit("a", { psiDelta: 10, hours: 1, dependencies: ["z"] }),
          makeUnit("z", { psiDelta: 1, hours: 1 }),
        ],
        { respectDependencies: false }
      );
      expect(ranked[0].id).toBe("a");
      expect(ranked[0].blockedByUnresolved).toBe(false);
    });
  });

  describe("rank() — filtering", () => {
    it("excludes completed units by default", () => {
      const ranked = engine.rank([
        makeUnit("a", { psiDelta: 5, hours: 1, status: "completed" }),
        makeUnit("b", { psiDelta: 1, hours: 1 }),
      ]);
      expect(ranked.map((r) => r.id)).toEqual(["b"]);
    });

    it("respects excludeCompleted=false", () => {
      const ranked = engine.rank(
        [
          makeUnit("a", { psiDelta: 5, hours: 1, status: "completed" }),
          makeUnit("b", { psiDelta: 1, hours: 1 }),
        ],
        { excludeCompleted: false }
      );
      expect(ranked).toHaveLength(2);
    });

    it("filters by includeTags when provided", () => {
      const ranked = engine.rank(
        [
          makeUnit("a", { psiDelta: 5, hours: 1, tags: ["phase-0.13"] }),
          makeUnit("b", { psiDelta: 10, hours: 1, tags: ["phase-0.14"] }),
          makeUnit("c", { psiDelta: 1, hours: 1, tags: ["phase-0.14"] }),
        ],
        { includeTags: ["phase-0.14"] }
      );
      expect(ranked.map((r) => r.id)).toEqual(["b", "c"]);
    });

    it("ignores includeTags when empty array", () => {
      const ranked = engine.rank(
        [
          makeUnit("a", { psiDelta: 5, hours: 1, tags: ["x"] }),
          makeUnit("b", { psiDelta: 1, hours: 1, tags: ["y"] }),
        ],
        { includeTags: [] }
      );
      expect(ranked).toHaveLength(2);
    });

    it("limit caps the output size", () => {
      const ranked = engine.rank(
        Array.from({ length: 10 }, (_, i) => makeUnit(`u${i}`, { psiDelta: i, hours: 1 })),
        { limit: 3 }
      );
      expect(ranked).toHaveLength(3);
    });

    it("limit=0 returns empty array", () => {
      const ranked = engine.rank([makeUnit("a")], { limit: 0 });
      expect(ranked).toHaveLength(0);
    });
  });

  describe("rank() — validation", () => {
    it("throws on duplicate ids", () => {
      expect(() => engine.rank([makeUnit("a"), makeUnit("a")])).toThrow(/Duplicate/);
    });

    it("throws when any unit has zero estimatedHours", () => {
      expect(() => engine.rank([makeUnit("a", { hours: 0 })])).toThrow(/estimatedHours/);
    });
  });

  describe("summary()", () => {
    it("counts total, blocked, and sums psiDelta", () => {
      const ranked = engine.rank([
        makeUnit("a", { psiDelta: 3, hours: 1 }),
        makeUnit("b", { psiDelta: 2, hours: 1, dependencies: ["z"] }),
      ]);
      const s = engine.summary(ranked);
      expect(s.total).toBe(2);
      expect(s.blocked).toBe(1);
      expect(s.totalPsiPotential).toBe(5);
      expect(s.top?.id).toBe("a");
    });

    it("handles an empty ranked list", () => {
      expect(engine.summary([])).toEqual({ total: 0, blocked: 0, totalPsiPotential: 0, top: null });
    });
  });

  describe("module singleton", () => {
    it("exposes a ready-to-use instance", () => {
      const r = sviRankedBacklogEngine.rank([makeUnit("a", { psiDelta: 2, hours: 1 })]);
      expect(r[0].score).toBe(2);
    });
  });
});
