/**
 * Tests for LocalEmbeddingEngine (PP-INFRA-LOCAL-EMBED)
 *
 * The ONNX model download is heavy (~25 MB) and not guaranteed available
 * in every CI environment. These tests cover input validation, cosine
 * similarity math, and the not-loaded fall-through. A separate integration
 * suite exercises the actual pipeline.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  LocalEmbeddingEngine,
  localEmbeddingEngine,
  DEFAULT_MODEL,
  DEFAULT_DIM,
} from "../engines/LocalEmbeddingEngine.js";

describe("LocalEmbeddingEngine", () => {
  let engine: LocalEmbeddingEngine;

  beforeEach(() => {
    engine = new LocalEmbeddingEngine();
  });

  describe("defaults", () => {
    it("exposes a default model + dim constant", () => {
      expect(DEFAULT_MODEL).toBe("Xenova/all-MiniLM-L6-v2");
      expect(DEFAULT_DIM).toBe(384);
    });

    it("starts unloaded", () => {
      expect(engine.isLoaded()).toBe(false);
      expect(engine.getModel()).toBe(DEFAULT_MODEL);
    });
  });

  describe("embed() input validation", () => {
    it("rejects non-string input", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await expect(() => engine.embed(42 as any)).rejects.toThrow(/text must be string/);
    });

    it("rejects empty string", async () => {
      await expect(() => engine.embed("")).rejects.toThrow(/non-empty/);
    });

    it("rejects excessively long input", async () => {
      const long = "a".repeat(21_000);
      await expect(() => engine.embed(long)).rejects.toThrow(/too long/);
    });
  });

  describe("embedBatch() input validation", () => {
    it("rejects empty array", async () => {
      await expect(() => engine.embedBatch([])).rejects.toThrow(/non-empty/);
    });
  });

  describe("cosineSimilarity()", () => {
    it("is 1 for identical unit vectors", () => {
      const v = [0.6, 0.8];
      expect(engine.cosineSimilarity(v, v)).toBeCloseTo(1, 6);
    });

    it("is 0 for orthogonal vectors", () => {
      expect(engine.cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0, 6);
    });

    it("is negative for opposite vectors", () => {
      expect(engine.cosineSimilarity([1, 0], [-1, 0])).toBeCloseTo(-1, 6);
    });

    it("rejects length mismatch", () => {
      expect(() => engine.cosineSimilarity([1, 2, 3], [1, 2])).toThrow(/length/);
    });

    it("rejects empty vectors", () => {
      expect(() => engine.cosineSimilarity([], [1])).toThrow(/non-empty/);
      expect(() => engine.cosineSimilarity([1], [])).toThrow(/non-empty/);
    });

    it("returns 0 when either vector is all-zero", () => {
      expect(engine.cosineSimilarity([0, 0], [1, 1])).toBe(0);
    });

    it("rejects non-array input", () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(() => engine.cosineSimilarity("a" as any, [1])).toThrow(/arrays/);
    });
  });

  describe("load() fall-through when transformers unavailable", () => {
    it("always returns a boolean", async () => {
      const loaded = await engine.load({ model: "nonexistent/model-that-cannot-exist" });
      expect(typeof loaded).toBe("boolean");
    });
  });

  describe("unload()", () => {
    it("resets model name and loaded flag", () => {
      engine.unload();
      expect(engine.isLoaded()).toBe(false);
      expect(engine.getModel()).toBe(DEFAULT_MODEL);
    });
  });

  describe("module singleton", () => {
    it("exports an instance", () => {
      expect(localEmbeddingEngine).toBeInstanceOf(LocalEmbeddingEngine);
    });
  });
});
