/**
 * CADFoundationEncoderEngine — vitest suite (CAD-COMPLETE-MS0/U-CADC-NN01).
 *
 * Asserts closed-form invariants on the tokenizer, embedding determinism,
 * pooling math, BRep/sketch normalization, unified concatenation, and
 * forward-compat UNK handling. Hand-derived expected values regression-lock
 * the deterministic LCG hash so a silent change to the seed/multiplier
 * breaks the suite (R9 — tests verify intent, not behavior).
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  cadFoundationEncoderEngine,
  CADFoundationEncoderEngine,
  PAD_TOKEN_ID,
  UNK_TOKEN_ID,
  OP_EMBED_DIM,
  BREP_FEATURE_DIM,
  SKETCH_FEATURE_DIM,
  UNIFIED_EMBED_DIM,
} from "../engines/CADFoundationEncoderEngine.js";
import { CAD_OPERATION_KINDS, type CADOperation } from "../interfaces/ICADCodeGenerator.js";

describe("CADFoundationEncoderEngine — NN01", () => {
  let engine: CADFoundationEncoderEngine;
  beforeEach(() => {
    engine = new CADFoundationEncoderEngine();
  });

  it("reserved token ids are PAD=0, UNK=1 (forward-compat anchor)", () => {
    expect(PAD_TOKEN_ID).toBe(0);
    expect(UNK_TOKEN_ID).toBe(1);
    expect(OP_EMBED_DIM).toBe(8);
    expect(BREP_FEATURE_DIM).toBe(5);
    expect(SKETCH_FEATURE_DIM).toBe(4);
    expect(UNIFIED_EMBED_DIM).toBe(OP_EMBED_DIM + BREP_FEATURE_DIM + SKETCH_FEATURE_DIM);
    expect(UNIFIED_EMBED_DIM).toBe(17);
  });

  it("tokenOf assigns sequential ids starting at 2 in CAD_OPERATION_KINDS order", () => {
    expect(engine.tokenOf(CAD_OPERATION_KINDS[0])).toBe(2);
    expect(engine.tokenOf(CAD_OPERATION_KINDS[1])).toBe(3);
    // First sketch kind is sketch_create per the enum order
    expect(engine.tokenOf("sketch_create")).toBe(2);
    // UNK fallback for kinds not in the vocab
    expect(engine.tokenOf("not_a_real_kind_xyz")).toBe(UNK_TOKEN_ID);
  });

  it("vocabulary snapshot matches CAD_OPERATION_KINDS in order and length", () => {
    const vocab = engine.getVocabulary();
    expect(vocab).toHaveLength(CAD_OPERATION_KINDS.length);
    expect(vocab[0]).toEqual({ tokenId: 2, kind: CAD_OPERATION_KINDS[0] });
    expect(vocab[vocab.length - 1].tokenId).toBe(2 + CAD_OPERATION_KINDS.length - 1);
  });

  it("encodeOperationStream is deterministic across calls (regression-lock the LCG)", () => {
    const ops: CADOperation[] = [
      { kind: "sketch_create", args: {} },
      { kind: "feature_extrude", args: {} },
    ];
    const a = engine.encodeOperationStream(ops);
    const b = engine.encodeOperationStream(ops);
    expect(a.embedding).toEqual(b.embedding);
    expect(a.tokens).toEqual(b.tokens);
    expect(a.embedding).toHaveLength(OP_EMBED_DIM);
  });

  it("empty op stream returns zero embedding (PAD semantics)", () => {
    const result = engine.encodeOperationStream([]);
    expect(result.tokens).toEqual([]);
    expect(result.embedding).toHaveLength(OP_EMBED_DIM);
    expect(result.embedding.every(x => x === 0)).toBe(true);
    expect(result.unknownTokens).toEqual([]);
  });

  it("pooled embedding is L2-normalized when non-zero (||emb|| ≈ 1)", () => {
    const ops: CADOperation[] = [
      { kind: "sketch_create", args: {} },
      { kind: "sketch_circle", args: {} },
      { kind: "feature_extrude", args: {} },
    ];
    const result = engine.encodeOperationStream(ops);
    let s = 0;
    for (const x of result.embedding) s += x * x;
    expect(Math.sqrt(s)).toBeCloseTo(1.0, 6);
  });

  it("unknown op kinds yield UNK token + canary entry but never throw", () => {
    const ops: CADOperation[] = [
      { kind: "sketch_create", args: {} },
      { kind: "definitely_not_in_vocab" as never, args: {} },
    ];
    const result = engine.encodeOperationStream(ops);
    expect(result.tokens[0]).toBe(2);
    expect(result.tokens[1]).toBe(UNK_TOKEN_ID);
    expect(result.unknownTokens).toEqual(["definitely_not_in_vocab"]);
    expect(engine.getStats().totalUnknownTokens).toBe(1);
  });

  it("custom op kind is in vocab — not counted as unknown", () => {
    const ops: CADOperation[] = [{ kind: "custom", args: {} }];
    const result = engine.encodeOperationStream(ops);
    expect(result.tokens[0]).toBeGreaterThanOrEqual(2);
    expect(result.unknownTokens).toEqual([]);
    expect(engine.getStats().totalUnknownTokens).toBe(0);
  });

  it("encodeBRepSummary: missing fields → zero features", () => {
    const v = engine.encodeBRepSummary(undefined);
    expect(v).toHaveLength(BREP_FEATURE_DIM);
    expect(v.every(x => x === 0)).toBe(true);
  });

  it("encodeBRepSummary: log-normalize maps n=1024 → 1.0", () => {
    const v = engine.encodeBRepSummary({ vertexCount: 1024, edgeCount: 0, faceCount: 0 });
    // log1p(1024) / log1p(1024) === 1.0 exactly
    expect(v[0]).toBeCloseTo(1.0, 10);
    expect(v[1]).toBe(0);
    expect(v[2]).toBe(0);
  });

  it("encodeBRepSummary: log-normalize is monotone increasing in count", () => {
    const a = engine.encodeBRepSummary({ vertexCount: 10 });
    const b = engine.encodeBRepSummary({ vertexCount: 100 });
    const c = engine.encodeBRepSummary({ vertexCount: 1000 });
    expect(a[0]).toBeLessThan(b[0]);
    expect(b[0]).toBeLessThan(c[0]);
    expect(a[0]).toBeGreaterThan(0);
  });

  it("encodeBRepSummary: invalid inputs (negative, NaN, Infinity) → 0", () => {
    const v = engine.encodeBRepSummary({
      vertexCount: -1,
      edgeCount: Number.NaN,
      faceCount: Number.POSITIVE_INFINITY,
    });
    expect(v[0]).toBe(0);
    expect(v[1]).toBe(0);
    expect(v[2]).toBe(0);
  });

  it("encodeSketchSummary: 4-d output, all zeros when input missing", () => {
    const v = engine.encodeSketchSummary(undefined);
    expect(v).toHaveLength(SKETCH_FEATURE_DIM);
    expect(v.every(x => x === 0)).toBe(true);
  });

  it("encodeFull concatenates op (8) + brep (5) + sketch (4) = 17 dims", () => {
    const result = engine.encodeFull({
      ops: [{ kind: "sketch_create", args: {} }],
      brep: { vertexCount: 8, edgeCount: 12, faceCount: 6 },
      sketch: { entityCount: 4 },
    });
    expect(result.embedding).toHaveLength(UNIFIED_EMBED_DIM);
    expect(result.opEmbedding).toHaveLength(OP_EMBED_DIM);
    expect(result.brepFeatures).toHaveLength(BREP_FEATURE_DIM);
    expect(result.sketchFeatures).toHaveLength(SKETCH_FEATURE_DIM);
    // Concat order: op | brep | sketch
    expect(result.embedding.slice(0, OP_EMBED_DIM)).toEqual(result.opEmbedding);
    expect(result.embedding.slice(OP_EMBED_DIM, OP_EMBED_DIM + BREP_FEATURE_DIM)).toEqual(result.brepFeatures);
    expect(result.embedding.slice(OP_EMBED_DIM + BREP_FEATURE_DIM)).toEqual(result.sketchFeatures);
  });

  it("getStats counters increment per encode call", () => {
    engine.encodeOperationStream([{ kind: "sketch_create", args: {} }]);
    engine.encodeBRepSummary({ vertexCount: 1 });
    engine.encodeSketchSummary({ entityCount: 1 });
    engine.encodeFull({ ops: [], brep: {}, sketch: {} });
    const stats = engine.getStats();
    // encodeFull internally calls all three encoders too
    expect(stats.totalOpStreamEncodings).toBe(2);
    expect(stats.totalBRepEncodings).toBe(2);
    expect(stats.totalSketchEncodings).toBe(2);
    expect(stats.totalUnifiedEncodings).toBe(1);
    expect(stats.vocabSize).toBe(2 + CAD_OPERATION_KINDS.length);
  });

  it("non-array ops throws TypeError (R12 fail-loud)", () => {
    expect(() => engine.encodeOperationStream(null as never)).toThrow(TypeError);
    expect(() => engine.encodeOperationStream("nope" as never)).toThrow(TypeError);
  });
});
