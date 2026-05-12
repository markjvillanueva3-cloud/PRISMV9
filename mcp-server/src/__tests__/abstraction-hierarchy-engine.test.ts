/**
 * Tests for AbstractionHierarchyEngine (Phase 0.18 U-AGI15)
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  AbstractionHierarchyEngine,
  abstractionHierarchyEngine,
  LEVEL_NAMES,
} from "../engines/AbstractionHierarchyEngine.js";

describe("AbstractionHierarchyEngine", () => {
  let e: AbstractionHierarchyEngine;

  beforeEach(() => {
    e = new AbstractionHierarchyEngine();
  });

  describe("addTip() / addAt()", () => {
    it("creates a tip at level 0", () => {
      const tip = e.addTip("keep toolpath offset > 0.5mm on thin walls");
      expect(tip.level).toBe(0);
      expect(tip.parentId).toBeNull();
      expect(tip.evidenceCount).toBe(1);
    });

    it("lowercases and dedupes tags", () => {
      const tip = e.addTip("x", ["Kienzle", "kienzle", "ISO"]);
      expect(tip.tags.sort()).toEqual(["iso", "kienzle"]);
    });

    it("rejects empty text", () => {
      expect(() => e.addTip("")).toThrow(/non-empty/);
    });

    it("rejects unknown parent id in addAt", () => {
      expect(() => e.addAt("rule", 1, "ghost")).toThrow(/Unknown parentId/);
    });

    it("rejects a parent whose level is not more abstract", () => {
      const tip = e.addTip("tip");
      expect(() => e.addAt("another tip", 0, tip.id)).toThrow(/more abstract/);
    });

    it("accepts parent at higher level", () => {
      const principle = e.addAt("principle", 2, null);
      const rule = e.addAt("rule", 1, principle.id);
      expect(rule.parentId).toBe(principle.id);
    });

    it("rejects invalid level", () => {
      expect(() => e.addAt("x", 4 as 3, null)).toThrow(/level must be 0/);
    });

    it("exports LEVEL_NAMES table for display code", () => {
      expect(LEVEL_NAMES[0]).toBe("tip");
      expect(LEVEL_NAMES[3]).toBe("law");
    });
  });

  describe("promote()", () => {
    it("creates a new parent at level+1 and reparents the node", () => {
      const tip = e.addTip("toolpath-offset on thin walls");
      const result = e.promote(tip.id, { text: "maintain rigidity near thin features", tags: ["thin-wall"] });
      expect(result.promotedTo).toBe(1);
      expect(result.node.level).toBe(1);
      expect(e.get(tip.id)?.parentId).toBe(result.node.id);
    });

    it("copies evidenceCount from the promoted child", () => {
      const tip = e.addTip("a");
      const { node: parent } = e.promote(tip.id, { text: "rule" });
      expect(parent.evidenceCount).toBe(1);
    });

    it("rejects promotion from level 3", () => {
      const law = e.addAt("law", 3, null);
      expect(() => e.promote(law.id, { text: "higher" })).toThrow(/already at top/);
    });

    it("throws on unknown node id", () => {
      expect(() => e.promote("ghost", { text: "rule" })).toThrow(/Unknown node/);
    });
  });

  describe("hierarchy()", () => {
    it("returns the chain from leaf to root", () => {
      const law = e.addAt("energy conservation", 3, null);
      const principle = e.addAt("do not waste heat", 2, law.id);
      const rule = e.addAt("insulate EDM dielectric bath", 1, principle.id);
      const tip = e.addAt("check bath at shift start", 0, rule.id);
      const chain = e.hierarchy(tip.id);
      expect(chain.map((n) => n.id)).toEqual([tip.id, rule.id, principle.id, law.id]);
    });

    it("stops at the root gracefully", () => {
      const tip = e.addTip("alone");
      expect(e.hierarchy(tip.id).map((n) => n.id)).toEqual([tip.id]);
    });

    it("returns empty for unknown id", () => {
      expect(e.hierarchy("ghost")).toEqual([]);
    });
  });

  describe("generalize()", () => {
    it("finds the most-abstract ancestor containing the term", () => {
      const law = e.addAt("rigidity law", 3, null);
      const rule = e.addAt("roughing depth rule", 1, law.id);
      const tip = e.addAt("keep ap ≤ 2mm in roughing", 0, rule.id);
      const found = e.generalize(tip.id, "rigidity");
      expect(found?.id).toBe(law.id);
    });

    it("prefers higher-level matches when multiple ancestors match", () => {
      const principle = e.addAt("thin wall principle", 2, null, ["thin-wall"]);
      const rule = e.addAt("thin wall roughing rule", 1, principle.id, ["thin-wall"]);
      const tip = e.addAt("reduce ae on thin walls", 0, rule.id, ["thin-wall"]);
      const found = e.generalize(tip.id, "thin-wall");
      expect(found?.id).toBe(principle.id);
    });

    it("returns null when no ancestor matches", () => {
      const tip = e.addTip("unrelated text");
      expect(e.generalize(tip.id, "kienzle")).toBeNull();
    });

    it("returns null for empty term", () => {
      const tip = e.addTip("x");
      expect(e.generalize(tip.id, "")).toBeNull();
      expect(e.generalize(tip.id, "   ")).toBeNull();
    });
  });

  describe("atLevel() / get() / size() / clear()", () => {
    it("atLevel filters by level", () => {
      e.addAt("p", 2, null);
      e.addTip("t1");
      e.addTip("t2");
      expect(e.atLevel(0)).toHaveLength(2);
      expect(e.atLevel(2)).toHaveLength(1);
    });

    it("atLevel rejects invalid levels", () => {
      expect(() => e.atLevel(5 as 3)).toThrow(/level must be/);
    });

    it("get returns null for unknown id", () => {
      expect(e.get("ghost")).toBeNull();
    });

    it("size + clear", () => {
      e.addTip("x");
      e.clear();
      expect(e.size()).toBe(0);
    });
  });

  describe("module singleton", () => {
    it("exports a ready-to-use instance", () => {
      abstractionHierarchyEngine.clear();
      abstractionHierarchyEngine.addTip("singleton tip");
      expect(abstractionHierarchyEngine.size()).toBe(1);
      abstractionHierarchyEngine.clear();
    });
  });
});
