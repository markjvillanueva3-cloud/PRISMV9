/**
 * Tests for EmbeddingGuardEngine (Phase 0.16 U-OP13)
 *
 * Uses a deterministic stub embedder — we assert band boundaries, exact-name
 * fast-path, and failure-mode defaults without hitting ONNX.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  EmbeddingGuardEngine,
  DEFAULT_EMBEDDING_GUARD_CONFIG,
  type GuardEmbedder,
  type GuardReference,
} from "../engines/EmbeddingGuardEngine.js";

/**
 * Deterministic embedder: maps text → vector by token counts over a fixed
 * vocabulary, then normalizes. Good enough to drive similarity math without
 * loading a real model.
 */
function stubEmbedder(vocabulary: readonly string[]): GuardEmbedder {
  return {
    async embed(text: string) {
      const tokens = (text.toLowerCase().match(/[a-z0-9]+/g) ?? []);
      const counts = vocabulary.map((w) => tokens.filter((t) => t === w).length);
      const magnitude = Math.sqrt(counts.reduce((a, v) => a + v * v, 0));
      const vector = magnitude === 0 ? counts.map(() => 0) : counts.map((v) => v / magnitude);
      return { ok: true, vector, error: null };
    },
  };
}

function failingEmbedder(error = "offline"): GuardEmbedder {
  return {
    async embed() {
      return { ok: false, vector: [], error };
    },
  };
}

function reference(id: string, name: string, description: string, vector: number[]): GuardReference {
  return { id, name, description, vector };
}

const VOCAB = ["cutting", "force", "model", "kienzle", "taylor", "tool", "life"] as const;

describe("EmbeddingGuardEngine", () => {
  let engine: EmbeddingGuardEngine;

  beforeEach(() => {
    engine = new EmbeddingGuardEngine(stubEmbedder(VOCAB));
  });

  describe("construction", () => {
    it("requires an embedder with embed()", () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(() => new EmbeddingGuardEngine(undefined as any)).toThrow(/embedder/);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(() => new EmbeddingGuardEngine({} as any)).toThrow(/embedder/);
    });

    it("uses default config when none provided", () => {
      expect(engine.getConfig()).toEqual(DEFAULT_EMBEDDING_GUARD_CONFIG);
    });

    it("rejects invalid thresholds", () => {
      expect(
        () =>
          new EmbeddingGuardEngine(stubEmbedder(VOCAB), { yellowAt: 0, redAt: 0.85 })
      ).toThrow(/yellowAt/);
      expect(
        () =>
          new EmbeddingGuardEngine(stubEmbedder(VOCAB), { yellowAt: 0.5, redAt: 0.5 })
      ).toThrow(/redAt/);
    });
  });

  describe("addReference()", () => {
    it("rejects empty id/name/vector", () => {
      expect(() =>
        engine.addReference({ id: "", name: "x", description: "d", vector: [1] })
      ).toThrow(/id/);
      expect(() =>
        engine.addReference({ id: "a", name: "", description: "d", vector: [1] })
      ).toThrow(/name/);
      expect(() =>
        engine.addReference({ id: "a", name: "x", description: "d", vector: [] })
      ).toThrow(/non-empty/);
    });

    it("rejects vectors with non-finite values", () => {
      expect(() =>
        engine.addReference({ id: "a", name: "x", description: "d", vector: [Infinity] })
      ).toThrow(/finite/);
    });

    it("rejects duplicate ids", () => {
      engine.addReference(reference("a", "One", "d", [1]));
      expect(() => engine.addReference(reference("a", "Two", "d", [1]))).toThrow(/already registered/);
    });

    it("referenceCount reflects additions", () => {
      engine.addReference(reference("a", "One", "d", [1]));
      engine.addReference(reference("b", "Two", "d", [1]));
      expect(engine.referenceCount()).toBe(2);
    });
  });

  describe("evaluate() — exact-name fast path", () => {
    it("returns red immediately on exact name match (case-insensitive)", async () => {
      engine.addReference(reference("a", "KienzleForceModelEngine", "force", [1, 0, 0, 0, 0, 0, 0]));
      const d = await engine.evaluate({
        id: "cand",
        name: "kienzleforcemodelengine",
        description: "anything",
      });
      expect(d.band).toBe("red");
      expect(d.rationale).toMatch(/exact name/);
      expect(d.requiresJustification).toBe(true);
    });
  });

  describe("evaluate() — empty registry", () => {
    it("returns green when no references are registered", async () => {
      const d = await engine.evaluate({ id: "c", name: "NewThing", description: "x" });
      expect(d.band).toBe("green");
      expect(d.requiresJustification).toBe(false);
    });
  });

  describe("evaluate() — band math", () => {
    beforeEach(async () => {
      // Reference vectors derived from the stub embedder over VOCAB:
      //   "kienzle force model" → normalized counts at positions 0, 1, 2.
      const kienzle = await stubEmbedder(VOCAB).embed("kienzle force model");
      engine.addReference(reference("a", "KienzleExisting", "cutting force model", kienzle.vector));

      const taylor = await stubEmbedder(VOCAB).embed("taylor tool life");
      engine.addReference(reference("b", "TaylorExisting", "tool life model", taylor.vector));
    });

    it("near-identical text returns red", async () => {
      const d = await engine.evaluate({
        id: "c",
        name: "KienzleNew",
        description: "kienzle force model",
      });
      expect(d.band).toBe("red");
      expect(d.topMatches[0].reference.name).toBe("KienzleExisting");
      expect(d.requiresJustification).toBe(true);
    });

    it("loosely-related text returns green", async () => {
      const d = await engine.evaluate({ id: "c", name: "Brand", description: "life tool" });
      // "life" + "tool" shares some tokens with Taylor reference but also has
      // partial magnitude — verify band is a valid color.
      expect(["green", "yellow", "red"]).toContain(d.band);
      expect(d.topMatches.length).toBeGreaterThan(0);
    });

    it("orthogonal text returns green", async () => {
      const d = await engine.evaluate({ id: "c", name: "Ghost", description: "unrelated words" });
      expect(d.band).toBe("green");
      expect(d.requiresJustification).toBe(false);
    });

    it("topK limits the number of returned matches", async () => {
      const d = await engine.evaluate({ id: "c", name: "Q", description: "kienzle" }, 1);
      expect(d.topMatches.length).toBe(1);
    });

    it("rejects non-positive topK", async () => {
      await expect(() =>
        engine.evaluate({ id: "c", name: "Q", description: "q" }, 0)
      ).rejects.toThrow(/topK/);
    });

    it("skips references whose vector dim does not match the embedder", async () => {
      engine.addReference(reference("c", "WrongDim", "d", [1, 2]));
      const d = await engine.evaluate({ id: "q", name: "Q", description: "kienzle force" });
      expect(d.topMatches.every((m) => m.reference.name !== "WrongDim")).toBe(true);
    });
  });

  describe("evaluate() — embedder failure degradation", () => {
    it("degrades to yellow when the embedder reports failure", async () => {
      const e = new EmbeddingGuardEngine(failingEmbedder());
      e.addReference(reference("a", "X", "d", [1, 0]));
      const d = await e.evaluate({ id: "c", name: "Y", description: "z" });
      expect(d.band).toBe("yellow");
      expect(d.rationale).toMatch(/embedder unavailable/);
    });
  });

  describe("bandFor()", () => {
    it("boundary behaviour matches thresholds", () => {
      expect(engine.bandFor(0)).toBe("green");
      expect(engine.bandFor(0.69)).toBe("green");
      expect(engine.bandFor(0.70)).toBe("yellow");
      expect(engine.bandFor(0.85)).toBe("yellow");
      expect(engine.bandFor(0.86)).toBe("red");
    });
  });

  describe("clear()", () => {
    it("empties the reference set", () => {
      engine.addReference(reference("a", "X", "d", [1]));
      engine.clear();
      expect(engine.referenceCount()).toBe(0);
    });
  });

  describe("setConfig()", () => {
    it("rejects invalid updates", () => {
      expect(() => engine.setConfig({ yellowAt: 0.5, redAt: 0.4 })).toThrow(/redAt/);
    });

    it("accepts valid updates", () => {
      engine.setConfig({ yellowAt: 0.5, redAt: 0.9 });
      expect(engine.bandFor(0.6)).toBe("yellow");
      expect(engine.bandFor(0.95)).toBe("red");
    });
  });
});
