/**
 * CADSearchUniversalEngine.test.ts — U-FS-08 (PHASE-47)
 */

import { describe, it, expect, beforeEach } from "vitest";
import { CADSearchUniversalEngine } from "../engines/CADSearchUniversalEngine.js";
import type { SearchDocument } from "../schemas/cadSearchUniversalSchema.js";

function doc(
  id: string,
  name: string,
  opts: Partial<SearchDocument> = {},
): SearchDocument {
  return {
    id,
    canonicalName: name,
    description: opts.description ?? "",
    embedding: opts.embedding,
    perceptualHash: opts.perceptualHash,
    spec: opts.spec ?? { numericSpecs: {}, tags: [] },
  };
}

describe("CADSearchUniversalEngine (U-FS-08)", () => {
  let eng: CADSearchUniversalEngine;

  beforeEach(() => {
    eng = new CADSearchUniversalEngine();
  });

  describe("indexing", () => {
    it("indexes and retrieves a document", () => {
      eng.index(doc("A", "PN-100"));
      expect(eng.size).toBe(1);
      expect(eng.get("A")?.canonicalName).toBe("PN-100");
    });

    it("enforces consistent embedding dimension", () => {
      eng.index(doc("A", "PN-100", { embedding: [1, 0, 0] }));
      expect(() =>
        eng.index(doc("B", "PN-200", { embedding: [1, 0] })),
      ).toThrow(/dim mismatch/);
    });

    it("removes + clears", () => {
      eng.index(doc("A", "x"));
      eng.index(doc("B", "y"));
      eng.remove("A");
      expect(eng.size).toBe(1);
      eng.clear();
      expect(eng.size).toBe(0);
    });
  });

  describe("full-text search", () => {
    beforeEach(() => {
      eng.index(doc("A", "Bracket", { description: "aluminum extrusion bracket" }));
      eng.index(doc("B", "Frame", { description: "steel welded frame" }));
      eng.index(
        doc("C", "Housing", {
          description: "aluminum housing",
          spec: {
            numericSpecs: {},
            tags: ["aluminum", "housing"],
          } as SearchDocument["spec"],
        }),
      );
    });

    it("finds documents matching single token", () => {
      const res = eng.search({ mode: "full_text", text: "aluminum" });
      expect(res.length).toBe(2);
      const ids = res.map((r) => r.id).sort();
      expect(ids).toEqual(["A", "C"]);
    });

    it("scores multi-token queries", () => {
      const res = eng.search({ mode: "full_text", text: "aluminum bracket" });
      const a = res.find((r) => r.id === "A");
      const c = res.find((r) => r.id === "C");
      expect((a?.subscores.full_text ?? 0)).toBeGreaterThan(c?.subscores.full_text ?? 0);
    });
  });

  describe("semantic search", () => {
    it("ranks by cosine similarity", () => {
      eng.index(doc("A", "A", { embedding: [1, 0, 0] }));
      eng.index(doc("B", "B", { embedding: [0, 1, 0] }));
      eng.index(doc("C", "C", { embedding: [0.9, 0.1, 0] }));
      const res = eng.search({
        mode: "semantic",
        embedding: [1, 0, 0],
      });
      expect(res[0].id).toBe("A");
      expect(res[1].id).toBe("C");
    });
  });

  describe("visual search", () => {
    it("ranks by perceptual hash similarity", () => {
      eng.index(doc("A", "A", { perceptualHash: "f0f0f0f0" }));
      eng.index(doc("B", "B", { perceptualHash: "0f0f0f0f" }));
      eng.index(doc("C", "C", { perceptualHash: "f0f0f0f7" }));
      const res = eng.search({
        mode: "visual",
        perceptualHash: "f0f0f0f0",
      });
      expect(res[0].id).toBe("A");
      expect(res[1].id).toBe("C");
    });
  });

  describe("spec + tolerance", () => {
    beforeEach(() => {
      eng.index(
        doc("A", "a", {
          spec: {
            material: "AL6061",
            numericSpecs: { depth: 10 },
            tags: ["bracket"],
          } as SearchDocument["spec"],
        }),
      );
      eng.index(
        doc("B", "b", {
          spec: {
            material: "AL6061",
            numericSpecs: { depth: 25 },
            tags: ["frame"],
          } as SearchDocument["spec"],
        }),
      );
      eng.index(
        doc("C", "c", {
          spec: {
            material: "D2",
            numericSpecs: { depth: 10 },
            tags: [],
          } as SearchDocument["spec"],
        }),
      );
    });

    it("filters by spec equality", () => {
      const res = eng.search({
        mode: "spec",
        specFilter: { material: "AL6061" },
      });
      const ids = res.map((r) => r.id).sort();
      expect(ids).toEqual(["A", "B"]);
    });

    it("filters by tolerance range", () => {
      const res = eng.search({
        mode: "tolerance",
        toleranceRanges: [{ key: "depth", min: 9, max: 20 }],
      });
      const ids = res.map((r) => r.id).sort();
      expect(ids).toEqual(["A", "C"]);
    });
  });

  describe("natural language search", () => {
    beforeEach(() => {
      eng.index(
        doc("A", "bracket-aluminum", {
          description: "aluminum bracket",
          spec: {
            material: "AL6061",
            numericSpecs: { depth: 12 },
            tags: ["bracket"],
          } as SearchDocument["spec"],
        }),
      );
      eng.index(
        doc("B", "steel-frame", {
          description: "steel frame",
          spec: {
            material: "STEEL",
            numericSpecs: { depth: 50 },
            tags: ["frame"],
          } as SearchDocument["spec"],
        }),
      );
    });

    it("parses key=value + key<N + tag: + free text", () => {
      const res = eng.search({
        mode: "natural_language",
        naturalLanguage: "material=AL6061 depth<20 tag:bracket aluminum",
      });
      expect(res.length).toBeGreaterThan(0);
      expect(res[0].id).toBe("A");
    });
  });

  describe("unified mode + RRF fusion", () => {
    it("combines multiple signals with RRF", () => {
      eng.index(
        doc("A", "aluminum-bracket", {
          description: "aluminum bracket",
          embedding: [1, 0, 0],
          spec: {
            material: "AL6061",
            numericSpecs: {},
            tags: [],
          } as SearchDocument["spec"],
        }),
      );
      eng.index(
        doc("B", "steel-frame", {
          description: "steel frame",
          embedding: [0, 1, 0],
          spec: {
            material: "STEEL",
            numericSpecs: {},
            tags: [],
          } as SearchDocument["spec"],
        }),
      );

      const res = eng.search({
        mode: "unified",
        text: "aluminum",
        embedding: [1, 0, 0],
        specFilter: { material: "AL6061" },
      });
      expect(res[0].id).toBe("A");
      expect(res[0].subscores.full_text).toBeDefined();
      expect(res[0].subscores.semantic).toBeDefined();
      expect(res[0].subscores.spec).toBeDefined();
    });

    it("respects limit", () => {
      for (let i = 0; i < 30; i++) {
        eng.index(doc(`D${i}`, `doc-${i}`, { description: "aluminum" }));
      }
      const res = eng.search({ mode: "full_text", text: "aluminum", limit: 5 });
      expect(res.length).toBe(5);
    });

    it("returns empty when nothing matches", () => {
      eng.index(doc("A", "x"));
      const res = eng.search({ mode: "full_text", text: "nonexistent_term" });
      expect(res.length).toBe(0);
    });
  });
});
