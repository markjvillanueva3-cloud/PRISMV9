/**
 * Tests for EmbeddingFilterEngine (PP-INFRA-AWARE-FILTER)
 */

import { describe, it, expect } from "vitest";
import {
  EmbeddingFilterEngine,
  type FilterEmbedder,
} from "../engines/EmbeddingFilterEngine.js";

const SAMPLE_DIRECTIVE = `# PRISM Self-Awareness Directive

## Overview
This document describes what PRISM knows about itself.

## Machining
Kienzle force model applies to milling and turning operations.
Taylor tool life predicts wear based on cutting speed.

## EDM
Wire EDM uses electrical discharge to cut conductive materials.
Sinker EDM uses graphite electrodes with dielectric fluid.

## Materials
Tool steels include M2, D2, and S7 grades.
Tungsten carbide is the most common cutting insert material.
`;

/** Deterministic bag-of-words embedder keyed on a fixed vocabulary. */
function bowEmbedder(vocab: readonly string[], opts: { failBatch?: boolean; failEvery?: number } = {}): FilterEmbedder {
  let call = 0;
  const encode = (text: string) => {
    const tokens = text.toLowerCase().match(/[a-z0-9]+/g) ?? [];
    const vec = vocab.map((w) => tokens.filter((t) => t === w).length);
    const mag = Math.sqrt(vec.reduce((a, v) => a + v * v, 0));
    return mag === 0 ? vec.map(() => 0) : vec.map((v) => v / mag);
  };
  return {
    async embed(text: string) {
      call += 1;
      if (opts.failEvery && call % opts.failEvery === 0) {
        return { ok: false, vector: [], error: "simulated" };
      }
      return { ok: true, vector: encode(text), error: null };
    },
    async embedBatch(texts) {
      if (opts.failBatch) throw new Error("batch disabled");
      return texts.map((t) => ({ ok: true, vector: encode(t), error: null }));
    },
  };
}

function failingEmbedder(): FilterEmbedder {
  return {
    async embed() {
      return { ok: false, vector: [], error: "offline" };
    },
  };
}

const VOCAB = [
  "kienzle", "force", "model", "milling", "turning", "taylor", "tool", "life",
  "wire", "edm", "sinker", "graphite", "tool", "steel", "m2", "d2",
] as const;

describe("EmbeddingFilterEngine", () => {
  describe("construction", () => {
    it("requires an embedder with embed()", () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(() => new EmbeddingFilterEngine({} as any)).toThrow(/embedder/);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(() => new EmbeddingFilterEngine(undefined as any)).toThrow(/embedder/);
    });
  });

  describe("filter() — option validation", () => {
    const engine = new EmbeddingFilterEngine(bowEmbedder(VOCAB));

    it("rejects negative maxLines", async () => {
      await expect(() =>
        engine.filter(SAMPLE_DIRECTIVE, "kienzle", { maxLines: -1 })
      ).rejects.toThrow(/maxLines/);
    });

    it("rejects out-of-range minScore", async () => {
      await expect(() =>
        engine.filter(SAMPLE_DIRECTIVE, "kienzle", { minScore: 1.5 })
      ).rejects.toThrow(/minScore/);
    });

    it("rejects out-of-range headerBias", async () => {
      await expect(() =>
        engine.filter(SAMPLE_DIRECTIVE, "kienzle", { headerBias: 2 })
      ).rejects.toThrow(/headerBias/);
    });
  });

  describe("filter() — empty / trivial inputs", () => {
    const engine = new EmbeddingFilterEngine(bowEmbedder(VOCAB));

    it("returns trivial result for an empty directive", async () => {
      const r = await engine.filter("", "kienzle");
      expect(r.kept).toEqual([]);
      expect(r.inputLineCount).toBe(0);
      expect(r.compressionRatio).toBe(1);
      expect(r.fallbackUsed).toBe("none");
    });

    it("preserves original line ordering", async () => {
      const r = await engine.filter(SAMPLE_DIRECTIVE, "kienzle force milling", { maxLines: 6 });
      for (let i = 1; i < r.kept.length; i += 1) {
        expect(r.kept[i].lineNumber).toBeGreaterThan(r.kept[i - 1].lineNumber);
      }
    });
  });

  describe("filter() — embedding path", () => {
    const engine = new EmbeddingFilterEngine(bowEmbedder(VOCAB));

    it("ranks prompt-relevant lines above unrelated ones", async () => {
      const r = await engine.filter(SAMPLE_DIRECTIVE, "kienzle force milling", { maxLines: 3 });
      const joined = r.kept.map((k) => k.text.toLowerCase()).join(" | ");
      expect(joined).toContain("kienzle");
    });

    it("respects maxLines cap", async () => {
      const r = await engine.filter(SAMPLE_DIRECTIVE, "kienzle", { maxLines: 2 });
      expect(r.kept.length).toBeLessThanOrEqual(2);
    });

    it("applies header bias so section titles survive", async () => {
      const r = await engine.filter(SAMPLE_DIRECTIVE, "machining", {
        maxLines: 10,
        headerBias: 0.5,
      });
      const headers = r.kept.filter((k) => k.text.startsWith("#"));
      expect(headers.length).toBeGreaterThan(0);
    });

    it("reports embedderOk=true and fallbackUsed=none on happy path", async () => {
      const r = await engine.filter(SAMPLE_DIRECTIVE, "kienzle");
      expect(r.embedderOk).toBe(true);
      expect(r.fallbackUsed).toBe("none");
    });

    it("scores are rounded to four decimals", async () => {
      const r = await engine.filter(SAMPLE_DIRECTIVE, "kienzle", { maxLines: 25 });
      for (const k of r.kept) {
        const decimals = (k.score.toString().split(".")[1] ?? "").length;
        expect(decimals).toBeLessThanOrEqual(4);
      }
    });

    it("droppedCount = inputLineCount - kept.length", async () => {
      const r = await engine.filter(SAMPLE_DIRECTIVE, "kienzle", { maxLines: 3 });
      expect(r.droppedCount).toBe(r.inputLineCount - r.kept.length);
    });
  });

  describe("filter() — batch failure falls back to per-line embeds", () => {
    it("uses per-line path when batch throws", async () => {
      const engine = new EmbeddingFilterEngine(bowEmbedder(VOCAB, { failBatch: true }));
      const r = await engine.filter(SAMPLE_DIRECTIVE, "kienzle", { maxLines: 3 });
      expect(r.embedderOk).toBe(true);
      expect(r.fallbackUsed).toBe("none");
    });
  });

  describe("filter() — embedder fully offline", () => {
    it("falls back to Jaccard scoring and reports fallbackUsed=jaccard", async () => {
      const engine = new EmbeddingFilterEngine(failingEmbedder());
      const r = await engine.filter(SAMPLE_DIRECTIVE, "kienzle force", { maxLines: 3 });
      expect(r.embedderOk).toBe(false);
      expect(r.fallbackUsed).toBe("jaccard");
      // Jaccard fallback should still pick lines containing "kienzle" or "force"
      const joined = r.kept.map((k) => k.text.toLowerCase()).join(" | ");
      expect(joined).toContain("kienzle");
    });
  });

  describe("filter() — no batch method available", () => {
    it("goes through per-line embed and still succeeds", async () => {
      const inner = bowEmbedder(VOCAB);
      // Deliberately strip embedBatch to force per-line.
      const engine = new EmbeddingFilterEngine({ embed: inner.embed });
      const r = await engine.filter(SAMPLE_DIRECTIVE, "kienzle", { maxLines: 3 });
      expect(r.embedderOk).toBe(true);
      // fallbackUsed=none when every per-line embed succeeded
      expect(r.fallbackUsed).toBe("none");
    });
  });

  describe("filter() — minScore threshold", () => {
    const engine = new EmbeddingFilterEngine(bowEmbedder(VOCAB));

    it("filters out lines below minScore", async () => {
      const r = await engine.filter(SAMPLE_DIRECTIVE, "kienzle", { minScore: 0.9 });
      for (const k of r.kept) expect(k.score).toBeGreaterThanOrEqual(0.9);
    });
  });
});
