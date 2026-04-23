/**
 * generalize-wiring.test.ts — PP-0.18-SKILL-GENERALIZE
 *
 * Verifies that AbstractionHierarchyEngine is reachable through
 * aiReasoningDispatcher and that the actions the `/generalize` skill
 * invokes (add_tip / promote / hierarchy / generalize / at_level / get /
 * size / clear) match the engine singleton.
 */

import { describe, it, expect, beforeEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { abstractionHierarchyEngine } from "../engines/AbstractionHierarchyEngine.js";

const DISPATCHER_PATH = path.join(__dirname, "..", "tools", "dispatchers", "aiReasoningDispatcher.ts");

describe("/generalize skill wiring (PP-0.18)", () => {
  const dispatcherSrc = fs.readFileSync(DISPATCHER_PATH, "utf8");
  const ACTIONS = [
    "abstraction_add_tip",
    "abstraction_add_at",
    "abstraction_promote",
    "abstraction_hierarchy",
    "abstraction_generalize",
    "abstraction_at_level",
    "abstraction_get",
    "abstraction_size",
    "abstraction_clear",
  ];

  describe("dispatcher z.enum declares abstraction_* actions", () => {
    for (const action of ACTIONS) {
      it(`declares ${action}`, () => {
        expect(dispatcherSrc).toContain(`"${action}"`);
      });
    }
  });

  describe("dispatcher switch handles abstraction cases", () => {
    for (const action of ACTIONS) {
      it(`has case '${action}'`, () => {
        expect(dispatcherSrc).toContain(`case "${action}"`);
      });
    }
  });

  describe("engine singleton contracts", () => {
    beforeEach(() => abstractionHierarchyEngine.clear());

    it("addTip creates a level-0 node with evidenceCount 1", () => {
      const node = abstractionHierarchyEngine.addTip(
        "On 17-4 PH roughing, flood coolant at 80 psi min.",
        ["stainless", "coolant", "roughing"],
      );
      expect(node.level).toBe(0);
      expect(node.parentId).toBeNull();
      expect(node.evidenceCount).toBe(1);
      expect(node.tags).toContain("stainless");
      expect(node.id).toMatch(/^h\d+$/);
    });

    it("promote creates a parent one level above the child", () => {
      const tip = abstractionHierarchyEngine.addTip("flood coolant 80 psi on 17-4 PH", ["coolant"]);
      const { node: parent, promotedTo, supportingChildren } = abstractionHierarchyEngine.promote(tip.id, {
        text: "Martensitic stainless requires continuous coolant during roughing",
        tags: ["stainless", "coolant"],
      });
      expect(parent.level).toBe(1);
      expect(promotedTo).toBe(1);
      expect(supportingChildren).toContain(tip.id);
      expect(abstractionHierarchyEngine.get(tip.id)?.parentId).toBe(parent.id);
      expect(parent.evidenceCount).toBe(tip.evidenceCount);
    });

    it("hierarchy walks from leaf to root", () => {
      const tip = abstractionHierarchyEngine.addTip("a concrete observation", ["x"]);
      const { node: rule } = abstractionHierarchyEngine.promote(tip.id, { text: "A rule", tags: ["x"] });
      const { node: principle } = abstractionHierarchyEngine.promote(rule.id, { text: "A principle", tags: ["x"] });
      const chain = abstractionHierarchyEngine.hierarchy(tip.id);
      expect(chain.map((n) => n.id)).toEqual([tip.id, rule.id, principle.id]);
      expect(chain.map((n) => n.level)).toEqual([0, 1, 2]);
    });

    it("generalize returns most-abstract ancestor matching the term", () => {
      const tip = abstractionHierarchyEngine.addTip("flood coolant 80 psi on 17-4 PH", ["coolant"]);
      const { node: rule } = abstractionHierarchyEngine.promote(tip.id, {
        text: "Martensitic stainless requires continuous coolant during roughing",
        tags: ["coolant"],
      });
      const { node: principle } = abstractionHierarchyEngine.promote(rule.id, {
        text: "Chip-workpiece welding is prevented by maintaining lubricating film",
        tags: ["lubrication"],
      });
      const match = abstractionHierarchyEngine.generalize(tip.id, "coolant");
      expect(match).not.toBeNull();
      expect(match?.id).toBe(rule.id); // principle doesn't mention "coolant"
      const lubMatch = abstractionHierarchyEngine.generalize(tip.id, "lubrication");
      expect(lubMatch?.id).toBe(principle.id);
      const missing = abstractionHierarchyEngine.generalize(tip.id, "chatter");
      expect(missing).toBeNull();
    });

    it("atLevel filters by level", () => {
      const tip = abstractionHierarchyEngine.addTip("t1", []);
      abstractionHierarchyEngine.promote(tip.id, { text: "r1" });
      expect(abstractionHierarchyEngine.atLevel(0).length).toBe(1);
      expect(abstractionHierarchyEngine.atLevel(1).length).toBe(1);
      expect(abstractionHierarchyEngine.atLevel(2).length).toBe(0);
    });

    it("rejects invalid inputs", () => {
      expect(() => abstractionHierarchyEngine.addTip("", [])).toThrow();
      expect(() => abstractionHierarchyEngine.addAt("x", 5 as any, null)).toThrow();
      expect(() => abstractionHierarchyEngine.promote("nonexistent", { text: "x" })).toThrow();
    });

    it("cannot promote beyond law (level 3)", () => {
      const n = abstractionHierarchyEngine.addAt("already a law", 3, null, []);
      expect(() => abstractionHierarchyEngine.promote(n.id, { text: "higher" })).toThrow();
    });

    it("tags are lowercased and deduplicated", () => {
      const n = abstractionHierarchyEngine.addTip("x", ["Coolant", "COOLANT", "stainless"]);
      expect(n.tags).toEqual(["coolant", "stainless"]);
    });

    it("size and clear work", () => {
      abstractionHierarchyEngine.addTip("a", []);
      abstractionHierarchyEngine.addTip("b", []);
      expect(abstractionHierarchyEngine.size()).toBe(2);
      abstractionHierarchyEngine.clear();
      expect(abstractionHierarchyEngine.size()).toBe(0);
    });

    it("generalize returns null for empty term", () => {
      const tip = abstractionHierarchyEngine.addTip("x", []);
      expect(abstractionHierarchyEngine.generalize(tip.id, "  ")).toBeNull();
    });
  });

  describe("skill file is present and well-formed", () => {
    const candidates = [
      path.join("H:", ".claude", "commands", "generalize.md"),
      path.join("h:", ".claude", "commands", "generalize.md"),
      "/h/.claude/commands/generalize.md",
    ];
    const skillPath = candidates.find((p) => fs.existsSync(p));

    it("skill file exists on H: drive", () => {
      expect(skillPath).toBeDefined();
    });

    it("skill frontmatter declares engine and the abstraction actions", () => {
      if (!skillPath) return;
      const body = fs.readFileSync(skillPath, "utf8");
      expect(body).toContain("name: generalize");
      expect(body).toContain("AbstractionHierarchyEngine");
      expect(body).toContain("abstraction_add_tip");
      expect(body).toContain("abstraction_promote");
      expect(body).toContain("abstraction_generalize");
      expect(body).toContain("abstraction_hierarchy");
    });
  });
});
