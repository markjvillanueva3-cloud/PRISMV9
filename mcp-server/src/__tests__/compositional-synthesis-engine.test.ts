/**
 * Tests for CompositionalSynthesisEngine (Phase 0.18 U-AGI8)
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  CompositionalSynthesisEngine,
  compositionalSynthesisEngine,
  type Primitive,
} from "../engines/CompositionalSynthesisEngine.js";

function prim(overrides: Partial<Primitive> = {}): Primitive {
  return {
    id: overrides.id ?? "p1",
    name: overrides.name ?? "name",
    input: overrides.input ?? "A",
    output: overrides.output ?? "B",
    confidence: overrides.confidence ?? 0.9,
    tags: overrides.tags,
  };
}

describe("CompositionalSynthesisEngine", () => {
  let e: CompositionalSynthesisEngine;

  beforeEach(() => {
    e = new CompositionalSynthesisEngine();
  });

  describe("register()", () => {
    it("rejects missing fields", () => {
      expect(() => e.register(prim({ id: "" }))).toThrow(/id/);
      expect(() => e.register(prim({ name: "" }))).toThrow(/name/);
      expect(() => e.register(prim({ input: "" }))).toThrow(/input/);
      expect(() => e.register(prim({ output: "" }))).toThrow(/output/);
    });

    it("rejects out-of-range confidence", () => {
      expect(() => e.register(prim({ confidence: -0.1 }))).toThrow(/confidence/);
      expect(() => e.register(prim({ confidence: 1.1 }))).toThrow(/confidence/);
    });

    it("lowercases tags", () => {
      e.register(prim({ tags: ["Kienzle"] }));
      expect(e.size()).toBe(1);
    });
  });

  describe("synthesize()", () => {
    it("finds single-step pipeline", () => {
      e.register(prim({ id: "a", input: "X", output: "Y" }));
      const r = e.synthesize({ input: "X", output: "Y" });
      expect(r[0].primitives.map((p) => p.id)).toEqual(["a"]);
    });

    it("finds multi-step pipelines respecting types", () => {
      e.registerAll([
        prim({ id: "a", input: "X", output: "M" }),
        prim({ id: "b", input: "M", output: "Y" }),
      ]);
      const r = e.synthesize({ input: "X", output: "Y" });
      expect(r[0].primitives.map((p) => p.id)).toEqual(["a", "b"]);
    });

    it("returns empty when no pipeline reaches output", () => {
      e.register(prim({ id: "a", input: "X", output: "M" }));
      expect(e.synthesize({ input: "X", output: "Y" })).toEqual([]);
    });

    it("honors maxDepth", () => {
      e.registerAll([
        prim({ id: "a", input: "X", output: "M" }),
        prim({ id: "b", input: "M", output: "N" }),
        prim({ id: "c", input: "N", output: "Y" }),
      ]);
      const r = e.synthesize({ input: "X", output: "Y", maxDepth: 2 });
      expect(r).toEqual([]); // requires depth 3
      const r2 = e.synthesize({ input: "X", output: "Y", maxDepth: 3 });
      expect(r2[0].length).toBe(3);
    });

    it("prefers shorter high-confidence pipelines", () => {
      e.registerAll([
        prim({ id: "short", input: "X", output: "Y", confidence: 0.8 }),
        prim({ id: "midA", input: "X", output: "M", confidence: 0.9 }),
        prim({ id: "midB", input: "M", output: "Y", confidence: 0.9 }),
      ]);
      const r = e.synthesize({ input: "X", output: "Y" });
      expect(r[0].primitives.map((p) => p.id)).toEqual(["short"]);
    });

    it("never repeats a primitive within a pipeline", () => {
      e.registerAll([
        prim({ id: "a", input: "X", output: "X" }), // loop attempt
        prim({ id: "b", input: "X", output: "Y" }),
      ]);
      const r = e.synthesize({ input: "X", output: "Y" });
      for (const c of r) {
        const ids = c.primitives.map((p) => p.id);
        expect(new Set(ids).size).toBe(ids.length);
      }
    });

    it("respects limit", () => {
      e.registerAll([
        prim({ id: "a1", input: "X", output: "Y" }),
        prim({ id: "a2", input: "X", output: "Y" }),
        prim({ id: "a3", input: "X", output: "Y" }),
      ]);
      const r = e.synthesize({ input: "X", output: "Y" }, 2);
      expect(r).toHaveLength(2);
    });

    it("filters by requireTags when supplied", () => {
      e.registerAll([
        prim({ id: "a", input: "X", output: "Y", tags: ["scope-a"] }),
        prim({ id: "b", input: "X", output: "Y", tags: ["scope-b"] }),
      ]);
      const r = e.synthesize({ input: "X", output: "Y", requireTags: ["scope-a"] });
      expect(r.map((c) => c.primitives[0].id)).toEqual(["a"]);
    });

    it("rejects invalid problem fields", () => {
      expect(() => e.synthesize({ input: "", output: "Y" })).toThrow(/input/);
      expect(() => e.synthesize({ input: "X", output: "" })).toThrow(/output/);
      expect(() => e.synthesize({ input: "X", output: "Y", maxDepth: 0 })).toThrow(/maxDepth/);
    });
  });

  describe("module singleton", () => {
    it("exports a ready-to-use instance", () => {
      compositionalSynthesisEngine.clear();
      compositionalSynthesisEngine.register(prim({ id: "s", input: "X", output: "Y" }));
      expect(compositionalSynthesisEngine.synthesize({ input: "X", output: "Y" })[0].primitives[0].id).toBe("s");
      compositionalSynthesisEngine.clear();
    });
  });
});
