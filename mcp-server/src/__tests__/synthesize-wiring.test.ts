/**
 * synthesize-wiring.test.ts — PP-0.18-SKILL-SYNTHESIZE
 *
 * Verifies that the engines backing the `/synthesize` skill are reachable
 * through aiReasoningDispatcher and that their contracts match the skill's
 * documented actions.
 */

import { describe, it, expect, beforeEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { compositionalSynthesisEngine } from "../engines/CompositionalSynthesisEngine.js";

const DISPATCHER_PATH = path.join(__dirname, "..", "tools", "dispatchers", "aiReasoningDispatcher.ts");

describe("/synthesize skill wiring (PP-0.18)", () => {
  const dispatcherSrc = fs.readFileSync(DISPATCHER_PATH, "utf8");

  describe("dispatcher z.enum declares compositional_synthesis_* actions", () => {
    for (const action of [
      "compositional_synthesis_register",
      "compositional_synthesis_synthesize",
      "compositional_synthesis_size",
      "compositional_synthesis_clear",
    ]) {
      it(`declares ${action}`, () => {
        expect(dispatcherSrc).toContain(`"${action}"`);
      });
    }
  });

  describe("dispatcher switch handles compositional_synthesis cases", () => {
    for (const action of [
      "compositional_synthesis_register",
      "compositional_synthesis_synthesize",
      "compositional_synthesis_size",
      "compositional_synthesis_clear",
    ]) {
      it(`has case '${action}'`, () => {
        expect(dispatcherSrc).toContain(`case "${action}"`);
      });
    }
  });

  describe("engine singleton contracts", () => {
    beforeEach(() => compositionalSynthesisEngine.clear());

    it("registerAll + synthesize end-to-end", () => {
      compositionalSynthesisEngine.registerAll([
        { id: "p1", name: "geom→path", input: "part-geometry", output: "toolpath", confidence: 0.9, tags: ["milling"] },
        { id: "p2", name: "path→time", input: "toolpath", output: "cycle-time", confidence: 0.8, tags: ["milling"] },
        { id: "p3", name: "path→ra", input: "toolpath", output: "surface-finish", confidence: 0.75, tags: ["milling", "finishing"] },
      ]);
      const candidates = compositionalSynthesisEngine.synthesize({
        input: "part-geometry",
        output: "cycle-time",
        maxDepth: 4,
      });
      expect(candidates.length).toBeGreaterThan(0);
      expect(candidates[0].primitives.map((p) => p.id)).toEqual(["p1", "p2"]);
      expect(candidates[0].length).toBe(2);
      expect(candidates[0].score).toBeGreaterThan(0);
      expect(candidates[0].score).toBeLessThanOrEqual(1);
    });

    it("tag filter excludes primitives not matching requireTags", () => {
      compositionalSynthesisEngine.registerAll([
        { id: "a", name: "a", input: "x", output: "y", confidence: 0.9, tags: ["milling"] },
        { id: "b", name: "b", input: "y", output: "z", confidence: 0.9, tags: ["turning"] },
      ]);
      // requireTags=["milling"] excludes `b`, so x→z has no pipeline.
      const noPipelines = compositionalSynthesisEngine.synthesize({
        input: "x",
        output: "z",
        requireTags: ["milling"],
      });
      expect(noPipelines.length).toBe(0);
    });

    it("shorter pipelines outscore longer at equal confidence", () => {
      compositionalSynthesisEngine.registerAll([
        { id: "direct", name: "direct", input: "x", output: "z", confidence: 0.8 },
        { id: "hop1", name: "hop1", input: "x", output: "y", confidence: 0.8 },
        { id: "hop2", name: "hop2", input: "y", output: "z", confidence: 0.8 },
      ]);
      const candidates = compositionalSynthesisEngine.synthesize({ input: "x", output: "z" });
      expect(candidates[0].primitives.map((p) => p.id)).toEqual(["direct"]);
      // length-penalty means 1-hop at 0.8 conf beats 2-hop at 0.8 conf.
      expect(candidates[0].score).toBeGreaterThan(candidates[1].score);
    });

    it("rejects malformed problems", () => {
      expect(() => compositionalSynthesisEngine.synthesize({ input: "", output: "y" } as any)).toThrow();
      expect(() => compositionalSynthesisEngine.synthesize({ input: "x", output: "" } as any)).toThrow();
      expect(() => compositionalSynthesisEngine.synthesize({ input: "x", output: "y", maxDepth: 0 })).toThrow();
    });
  });

  describe("skill file is present and well-formed", () => {
    const candidates = [
      path.join("H:", ".claude", "commands", "synthesize.md"),
      path.join("h:", ".claude", "commands", "synthesize.md"),
      "/h/.claude/commands/synthesize.md",
    ];
    const skillPath = candidates.find((p) => fs.existsSync(p));

    it("skill file exists on H: drive", () => {
      expect(skillPath).toBeDefined();
    });

    it("skill frontmatter lists the compositional_synthesis actions", () => {
      if (!skillPath) return;
      const body = fs.readFileSync(skillPath, "utf8");
      expect(body).toContain("CompositionalSynthesisEngine");
      expect(body).toContain("compositional_synthesis_register");
      expect(body).toContain("compositional_synthesis_synthesize");
      expect(body).toContain("name: synthesize");
    });
  });
});
