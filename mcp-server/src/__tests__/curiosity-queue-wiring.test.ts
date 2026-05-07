/**
 * curiosity-queue-wiring.test.ts — PP-0.18-SKILL-CURIOSITY-QUEUE
 *
 * Verifies CuriosityDrivenExplorerEngine is reachable through
 * aiReasoningDispatcher and that observe / observeBatch / rank / pop /
 * size / clear behave as the `/curiosity-queue` skill documents: dedup by
 * `${kind}:${target}`, base-weight scoring, age bonus capped at 2.0,
 * priority tiers (low < 2, medium < 4, high >= 4), rank stable ordering.
 */

import { describe, it, expect, beforeEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import {
  curiosityDrivenExplorerEngine,
  DEFAULT_EXPLORER_WEIGHTS,
} from "../engines/CuriosityDrivenExplorerEngine.js";

const DISPATCHER_PATH = path.join(__dirname, "..", "tools", "dispatchers", "aiReasoningDispatcher.ts");

describe("/curiosity-queue skill wiring (PP-0.18)", () => {
  const dispatcherSrc = fs.readFileSync(DISPATCHER_PATH, "utf8");
  const ACTIONS = [
    "curiosity_observe",
    "curiosity_observe_batch",
    "curiosity_rank",
    "curiosity_pop",
    "curiosity_size",
    "curiosity_clear",
  ];

  describe("dispatcher z.enum declares curiosity_* actions", () => {
    for (const a of ACTIONS) {
      it(`declares ${a}`, () => expect(dispatcherSrc).toContain(`"${a}"`));
    }
  });

  describe("dispatcher switch handles curiosity cases", () => {
    for (const a of ACTIONS) {
      it(`has case '${a}'`, () => expect(dispatcherSrc).toContain(`case "${a}"`));
    }
  });

  describe("engine singleton contracts", () => {
    beforeEach(() => curiosityDrivenExplorerEngine.clear());

    it("observe dedupes by kind:target", () => {
      const first = curiosityDrivenExplorerEngine.observe({ kind: "unregistered-file", target: "a.ts" });
      const second = curiosityDrivenExplorerEngine.observe({ kind: "unregistered-file", target: "a.ts" });
      expect(first).not.toBeNull();
      expect(second).toBeNull();
      expect(curiosityDrivenExplorerEngine.size()).toBe(1);
    });

    it("same target but different kind is NOT a duplicate", () => {
      curiosityDrivenExplorerEngine.observe({ kind: "unregistered-file", target: "a.ts" });
      const other = curiosityDrivenExplorerEngine.observe({ kind: "zero-citation-tip", target: "a.ts" });
      expect(other).not.toBeNull();
      expect(curiosityDrivenExplorerEngine.size()).toBe(2);
    });

    it("applies base weights from DEFAULT_EXPLORER_WEIGHTS", () => {
      const unreg = curiosityDrivenExplorerEngine.observe({ kind: "unregistered-file", target: "x" })!;
      const tip = curiosityDrivenExplorerEngine.observe({ kind: "zero-citation-tip", target: "y" })!;
      expect(unreg.score).toBe(DEFAULT_EXPLORER_WEIGHTS.base["unregistered-file"]);
      expect(tip.score).toBe(DEFAULT_EXPLORER_WEIGHTS.base["zero-citation-tip"]);
    });

    it("age bonus is capped at ageBonusCap", () => {
      const ancient = curiosityDrivenExplorerEngine.observe({
        kind: "unregistered-file",
        target: "ancient.ts",
        ageDays: 100_000, // well above any reasonable threshold
      })!;
      const w = DEFAULT_EXPLORER_WEIGHTS;
      expect(ancient.score).toBeCloseTo(w.base["unregistered-file"] + w.ageBonusCap, 5);
    });

    it("priority tiers: low < 2, medium < 4, high >= 4", () => {
      const low = curiosityDrivenExplorerEngine.observe({ kind: "zero-citation-tip", target: "low" })!;
      const med = curiosityDrivenExplorerEngine.observe({ kind: "never-accessed-asset", target: "med" })!;
      const high = curiosityDrivenExplorerEngine.observe({
        kind: "unregistered-file",
        target: "hi",
        ageDays: 150, // +1.5 → 4.5
      })!;
      expect(low.priority).toBe("low");
      expect(med.priority).toBe("medium");
      expect(high.priority).toBe("high");
    });

    it("rank returns descending score, ties broken by target asc", () => {
      curiosityDrivenExplorerEngine.observe({ kind: "zero-citation-tip", target: "b" });
      curiosityDrivenExplorerEngine.observe({ kind: "zero-citation-tip", target: "a" });
      curiosityDrivenExplorerEngine.observe({ kind: "unregistered-file", target: "z" });
      const ranked = curiosityDrivenExplorerEngine.rank(10);
      expect(ranked[0].target).toBe("z"); // highest score (base 3)
      expect(ranked[1].target).toBe("a"); // tie at base 1, lexical
      expect(ranked[2].target).toBe("b");
    });

    it("rank respects limit", () => {
      for (const t of ["a", "b", "c", "d", "e"]) {
        curiosityDrivenExplorerEngine.observe({ kind: "other", target: t });
      }
      expect(curiosityDrivenExplorerEngine.rank(3).length).toBe(3);
      expect(curiosityDrivenExplorerEngine.rank(0).length).toBe(0);
    });

    it("pop returns highest-score first and drains the queue", () => {
      curiosityDrivenExplorerEngine.observe({ kind: "zero-citation-tip", target: "cold" });
      curiosityDrivenExplorerEngine.observe({ kind: "orphan-route", target: "hot" });
      const first = curiosityDrivenExplorerEngine.pop();
      expect(first?.target).toBe("hot");
      const second = curiosityDrivenExplorerEngine.pop();
      expect(second?.target).toBe("cold");
      expect(curiosityDrivenExplorerEngine.pop()).toBeNull();
    });

    it("observeBatch returns only non-duplicate additions", () => {
      const added = curiosityDrivenExplorerEngine.observeBatch([
        { kind: "unregistered-file", target: "x" },
        { kind: "unregistered-file", target: "x" }, // dup
        { kind: "unregistered-file", target: "y" },
      ]);
      expect(added.length).toBe(2);
      expect(curiosityDrivenExplorerEngine.size()).toBe(2);
    });

    it("rejects invalid observations", () => {
      expect(() =>
        curiosityDrivenExplorerEngine.observe({ kind: "bogus" as any, target: "x" }),
      ).toThrow();
      expect(() =>
        curiosityDrivenExplorerEngine.observe({ kind: "other", target: "" }),
      ).toThrow();
      expect(() =>
        curiosityDrivenExplorerEngine.observe({ kind: "other", target: "x", ageDays: -1 }),
      ).toThrow();
      expect(() =>
        curiosityDrivenExplorerEngine.observe({ kind: "other", target: "x", ageDays: Number.POSITIVE_INFINITY }),
      ).toThrow();
    });

    it("clear wipes queue AND dedup memory", () => {
      curiosityDrivenExplorerEngine.observe({ kind: "other", target: "x" });
      curiosityDrivenExplorerEngine.clear();
      // After clear, the same key may be re-observed
      const c = curiosityDrivenExplorerEngine.observe({ kind: "other", target: "x" });
      expect(c).not.toBeNull();
      expect(curiosityDrivenExplorerEngine.size()).toBe(1);
    });

    it("rationale includes kind, base, and score", () => {
      const c = curiosityDrivenExplorerEngine.observe({ kind: "orphan-route", target: "r", ageDays: 50 })!;
      expect(c.rationale).toContain("orphan-route");
      expect(c.rationale).toMatch(/base 3/);
      expect(c.rationale).toMatch(/age 50d/);
      expect(c.rationale).toMatch(/score /);
    });
  });

  describe("skill file is present and well-formed", () => {
    const candidates = [
      path.join("H:", ".claude", "commands", "curiosity-queue.md"),
      path.join("h:", ".claude", "commands", "curiosity-queue.md"),
      "/h/.claude/commands/curiosity-queue.md",
    ];
    const skillPath = candidates.find((p) => fs.existsSync(p));

    it("skill file exists on H: drive", () => {
      expect(skillPath).toBeDefined();
    });

    it("skill frontmatter declares engine + all six actions", () => {
      if (!skillPath) return;
      const body = fs.readFileSync(skillPath, "utf8");
      expect(body).toContain("name: curiosity-queue");
      expect(body).toContain("CuriosityDrivenExplorerEngine");
      for (const a of ACTIONS) expect(body).toContain(a);
    });
  });
});
