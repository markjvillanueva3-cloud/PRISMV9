/**
 * EmbeddingGuardEngine.test.ts -- XGAL-WIRE / U-XGAL-EMBEDDING-GUARD
 *
 * Real reference-value tests for the tiered cosine-similarity guard. The engine
 * shipped WITHOUT a test (caught during the cross-galaxy unwired-engine audit,
 * 2026-06-15). Uses a deterministic FAKE embedder (vector-by-text map) so the
 * green/yellow/red band logic is exercised WITHOUT loading the ONNX model --
 * fast + hermetic. Covers happy (all 3 bands) + >=3 failure modes (offline
 * embedder, no references, dimension mismatch) + >=2 adversarial (empty/NaN
 * vectors, bad topK) + the validation guards.
 */
import { describe, it, expect } from "vitest";
import {
  EmbeddingGuardEngine,
  DEFAULT_EMBEDDING_GUARD_CONFIG,
  type GuardEmbedder,
} from "../engines/EmbeddingGuardEngine.js";

/** Deterministic embedder: maps the exact embed text -> a fixed vector. */
function fakeEmbedder(map: Record<string, number[]>, failOn?: Set<string>): GuardEmbedder {
  return {
    async embed(text: string) {
      if (failOn?.has(text)) return { ok: false, vector: [], error: "forced offline" };
      const v = map[text];
      if (!v) return { ok: false, vector: [], error: `no mapping for "${text}"` };
      return { ok: true, vector: v, error: null };
    },
  };
}

// The engine embeds the candidate as `${name}\n${description}` (see evaluate()).
const candText = (name: string, description: string) => `${name}\n${description}`;

const REF = { id: "r1", name: "FooEngine", description: "computes foo", vector: [1, 0] };

describe("EmbeddingGuardEngine -- band logic (happy: all 3 bands)", () => {
  it("high cosine (different name) -> RED + requiresJustification", async () => {
    const cand = { id: "c1", name: "FooKalc", description: "computes foo" };
    // [0.99, 0.14] vs [1,0] -> cos ~= 0.990 > redAt(0.85)
    const eng = new EmbeddingGuardEngine(fakeEmbedder({ [candText(cand.name, cand.description)]: [0.99, 0.14] }));
    eng.addReference(REF);
    const d = await eng.evaluate(cand);
    expect(d.band).toBe("red");
    expect(d.requiresJustification).toBe(true);
    expect(d.topMatches[0].reference.id).toBe("r1");
    expect(d.topMatches[0].similarity).toBeGreaterThan(0.85);
  });

  it("mid cosine -> YELLOW", async () => {
    const cand = { id: "c2", name: "BarEngine", description: "computes bar" };
    // [0.8, 0.6] vs [1,0] -> cos = 0.8, in [0.70, 0.85]
    const eng = new EmbeddingGuardEngine(fakeEmbedder({ [candText(cand.name, cand.description)]: [0.8, 0.6] }));
    eng.addReference(REF);
    const d = await eng.evaluate(cand);
    expect(d.band).toBe("yellow");
    expect(d.requiresJustification).toBe(true);
  });

  it("low cosine -> GREEN, no justification", async () => {
    const cand = { id: "c3", name: "BazEngine", description: "computes baz" };
    // [0, 1] vs [1,0] -> cos = 0
    const eng = new EmbeddingGuardEngine(fakeEmbedder({ [candText(cand.name, cand.description)]: [0, 1] }));
    eng.addReference(REF);
    const d = await eng.evaluate(cand);
    expect(d.band).toBe("green");
    expect(d.requiresJustification).toBe(false);
  });

  it("exact name collision -> RED via fast-path (no embed needed)", async () => {
    const cand = { id: "c4", name: "FooEngine", description: "totally different desc" };
    // embedder map intentionally EMPTY -> proves the exact-name path short-circuits before embedding
    const eng = new EmbeddingGuardEngine(fakeEmbedder({}));
    eng.addReference(REF);
    const d = await eng.evaluate(cand);
    expect(d.band).toBe("red");
    expect(d.rationale).toMatch(/exact name collision/);
    expect(d.topMatches[0].similarity).toBe(1);
  });
});

describe("EmbeddingGuardEngine -- failure modes", () => {
  it("no references registered -> GREEN", async () => {
    const eng = new EmbeddingGuardEngine(fakeEmbedder({}));
    const d = await eng.evaluate({ id: "c", name: "X", description: "y" });
    expect(d.band).toBe("green");
    expect(d.rationale).toMatch(/no registered references/);
  });

  it("embedder offline -> YELLOW (block not silently lost)", async () => {
    const cand = { id: "c", name: "NewThing", description: "novel" };
    const t = candText(cand.name, cand.description);
    const eng = new EmbeddingGuardEngine(fakeEmbedder({ [t]: [1, 0] }, new Set([t])));
    eng.addReference(REF);
    const d = await eng.evaluate(cand);
    expect(d.band).toBe("yellow");
    expect(d.requiresJustification).toBe(true);
    expect(d.rationale).toMatch(/embedder unavailable/);
  });

  it("dimension mismatch -> no comparable refs -> GREEN with mismatch rationale", async () => {
    const cand = { id: "c", name: "NewThing", description: "novel" };
    // candidate embeds to a 3-dim vector; the only reference is 2-dim -> filtered out
    const eng = new EmbeddingGuardEngine(fakeEmbedder({ [candText(cand.name, cand.description)]: [1, 0, 0] }));
    eng.addReference(REF); // 2-dim
    const d = await eng.evaluate(cand);
    expect(d.band).toBe("green");
    expect(d.rationale).toMatch(/dimension mismatch/);
  });
});

describe("EmbeddingGuardEngine -- adversarial + validation", () => {
  it("rejects a reference with an empty vector", () => {
    const eng = new EmbeddingGuardEngine(fakeEmbedder({}));
    expect(() => eng.addReference({ id: "x", name: "X", description: "d", vector: [] })).toThrow(/non-empty/);
  });
  it("rejects a reference with a non-finite vector value (NaN/Infinity)", () => {
    const eng = new EmbeddingGuardEngine(fakeEmbedder({}));
    expect(() => eng.addReference({ id: "x", name: "X", description: "d", vector: [1, NaN] })).toThrow(/finite/);
    expect(() => eng.addReference({ id: "y", name: "Y", description: "d", vector: [Infinity] })).toThrow(/finite/);
  });
  it("rejects duplicate reference id", () => {
    const eng = new EmbeddingGuardEngine(fakeEmbedder({}));
    eng.addReference(REF);
    expect(() => eng.addReference(REF)).toThrow(/already registered/);
  });
  it("rejects an invalid config (redAt <= yellowAt)", () => {
    expect(() => new EmbeddingGuardEngine(fakeEmbedder({}), { yellowAt: 0.8, redAt: 0.7 })).toThrow(/redAt must be > yellowAt/);
  });
  it("rejects a config band outside (0,1)", () => {
    expect(() => new EmbeddingGuardEngine(fakeEmbedder({}), { yellowAt: 0, redAt: 0.85 })).toThrow(/yellowAt/);
    expect(() => new EmbeddingGuardEngine(fakeEmbedder({}), { yellowAt: 0.7, redAt: 1 })).toThrow(/redAt/);
  });
  it("requires an embedder with embed(text)", () => {
    // @ts-expect-error -- intentionally passing a non-embedder
    expect(() => new EmbeddingGuardEngine({})).toThrow(/embedder/);
  });
  it("rejects bad topK (non-positive / non-integer)", async () => {
    const eng = new EmbeddingGuardEngine(fakeEmbedder({}));
    eng.addReference(REF);
    await expect(eng.evaluate({ id: "c", name: "Z", description: "d" }, 0)).rejects.toThrow(/topK/);
    await expect(eng.evaluate({ id: "c", name: "Z", description: "d" }, 1.5)).rejects.toThrow(/topK/);
  });
  it("rejects a candidate missing required fields", async () => {
    const eng = new EmbeddingGuardEngine(fakeEmbedder({}));
    // @ts-expect-error -- missing description
    await expect(eng.evaluate({ id: "c", name: "Z" })).rejects.toThrow(/description/);
  });
  it("default config is the documented 0.70 / 0.85", () => {
    expect(DEFAULT_EMBEDDING_GUARD_CONFIG.yellowAt).toBe(0.70);
    expect(DEFAULT_EMBEDDING_GUARD_CONFIG.redAt).toBe(0.85);
  });
});
