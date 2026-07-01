/**
 * CADArgEncoderEngine — vitest suite (CAD-DRAW-MAX-MS0/P1-U04).
 *
 * Closed-form assertions on per-op arg encoding: slot routing for size/
 * position/angle/count/tolerance, categorical hash determinism, log-
 * normalize math, R12 hostile-input handling, batch + pool, stats.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  CADArgEncoderEngine,
  ARG_EMBED_DIM,
  NUMERIC_SLOT_COUNT,
  CATEGORICAL_SLOT_COUNT,
} from "../engines/CADArgEncoderEngine.js";
import type { CADOperation } from "../interfaces/ICADCodeGenerator.js";

describe("CADArgEncoderEngine — P1-U04", () => {
  let eng: CADArgEncoderEngine;
  beforeEach(() => {
    eng = new CADArgEncoderEngine();
  });

  it("dim constants: ARG_EMBED_DIM=8, NUMERIC_SLOT_COUNT=5, CATEGORICAL_SLOT_COUNT=3 (5+3=8)", () => {
    expect(ARG_EMBED_DIM).toBe(8);
    expect(NUMERIC_SLOT_COUNT).toBe(5);
    expect(CATEGORICAL_SLOT_COUNT).toBe(3);
    expect(NUMERIC_SLOT_COUNT + CATEGORICAL_SLOT_COUNT).toBe(ARG_EMBED_DIM);
  });

  it("empty/undefined args → all-zero ARG_EMBED_DIM vector + totalEmptyArgs increments", () => {
    expect(eng.encodeArgs(undefined)).toEqual(new Array(8).fill(0));
    expect(eng.encodeArgs({})).toEqual(new Array(8).fill(0));
    expect(eng.getStats().totalEmptyArgs).toBe(2);
  });

  it("size slot (0): radius=1024 → ~1.0; depth=1024 → same slot, same value", () => {
    const a = eng.encodeArgs({ radius: 1024 });
    const b = eng.encodeArgs({ depth: 1024 });
    expect(a[0]).toBeCloseTo(1.0, 5);
    expect(b[0]).toBeCloseTo(1.0, 5);
  });

  it("position slot (1): x=1024 → ~1.0 in slot 1 only; angle/count untouched", () => {
    const v = eng.encodeArgs({ x: 1024 });
    expect(v[1]).toBeCloseTo(1.0, 5);
    expect(v[2]).toBe(0);
    expect(v[3]).toBe(0);
  });

  it("angle slot (2): angle=360 → log1p(360)/log1p(1024)", () => {
    const v = eng.encodeArgs({ angle: 360 });
    const expected = Math.log1p(360) / Math.log1p(1024);
    expect(v[2]).toBeCloseTo(expected, 5);
  });

  it("count slot (3): count=10 → log1p(10)/log1p(1024)", () => {
    const v = eng.encodeArgs({ count: 10 });
    const expected = Math.log1p(10) / Math.log1p(1024);
    expect(v[3]).toBeCloseTo(expected, 5);
  });

  it("tolerance slot (4): tol=0.01 → small positive value", () => {
    const v = eng.encodeArgs({ tolerance: 0.01 });
    expect(v[4]).toBeGreaterThan(0);
    expect(v[4]).toBeLessThan(0.01);
  });

  it("negative size preserves sign: radius=-1024 → ~-1.0 in slot 0", () => {
    const v = eng.encodeArgs({ radius: -1024 });
    expect(v[0]).toBeCloseTo(-1.0, 5);
  });

  it("log-normalize clips above ceiling: radius=1e9 still ≤ 1.0", () => {
    const v = eng.encodeArgs({ radius: 1e9 });
    expect(v[0]).toBeGreaterThan(0);
    expect(v[0]).toBeLessThanOrEqual(1.0);
  });

  it("NaN / Infinity in numeric arg → slot=0 + totalNonFiniteValues++", () => {
    eng.encodeArgs({ radius: Number.NaN });
    eng.encodeArgs({ radius: Number.POSITIVE_INFINITY });
    eng.encodeArgs({ radius: Number.NEGATIVE_INFINITY });
    expect(eng.getStats().totalNonFiniteValues).toBe(3);
  });

  it("categorical: operation='cut' fills slot 5; deterministic across calls", () => {
    const a = eng.encodeArgs({ operation: "cut" });
    const b = eng.encodeArgs({ operation: "cut" });
    expect(a[5]).toBe(b[5]);
    expect(a[5]).not.toBe(0);
  });

  it("categorical: different strings → different hashes (high probability)", () => {
    const a = eng.encodeArgs({ operation: "cut" });
    const b = eng.encodeArgs({ operation: "join" });
    expect(a[5]).not.toBe(b[5]);
  });

  it("plane='XY' fills slot 6 (categorical 2); type='hex' fills slot 7", () => {
    const v = eng.encodeArgs({ plane: "XY", type: "hex" });
    expect(v[6]).not.toBe(0);
    expect(v[7]).not.toBe(0);
  });

  it("boolean categorical args encode (true vs false → different hashes)", () => {
    const a = eng.encodeArgs({ kind: true });
    const b = eng.encodeArgs({ kind: false });
    expect(a[7]).not.toBe(0);
    expect(a[7]).not.toBe(b[7]);
  });

  it("determinism: same args → identical vectors", () => {
    const args = { radius: 5, x: 10, operation: "cut", plane: "XY" };
    expect(eng.encodeArgs(args)).toEqual(eng.encodeArgs(args));
  });

  it("encodeOpArgs: returns one vector per op (parallel to NN01 tokens)", () => {
    const ops: CADOperation[] = [
      { kind: "sketch_create", args: { plane: "XY" } },
      { kind: "feature_extrude", args: { distance: 10, operation: "cut" } },
    ];
    const rows = eng.encodeOpArgs(ops);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveLength(8);
    expect(rows[1]).toHaveLength(8);
    expect(eng.getStats().totalBatchEncodings).toBe(1);
  });

  it("encodeOpArgs: non-array throws TypeError (R12)", () => {
    expect(() => eng.encodeOpArgs(null as never)).toThrow(TypeError);
    expect(() => eng.encodeOpArgs("nope" as never)).toThrow(TypeError);
  });

  it("encodeOpArgsPooled: empty ops returns zero vector of correct length", () => {
    const v = eng.encodeOpArgsPooled([]);
    expect(v).toHaveLength(8);
    expect(v.every(x => x === 0)).toBe(true);
  });

  it("encodeOpArgsPooled: mean of two identical args == args vector", () => {
    const args = { radius: 5 };
    const op: CADOperation = { kind: "feature_extrude", args };
    const single = eng.encodeArgs(args);
    const pooled = eng.encodeOpArgsPooled([op, op]);
    for (let i = 0; i < 8; i++) expect(pooled[i]).toBeCloseTo(single[i], 10);
  });

  it("getStats tracks all 4 counters across mixed encodings", () => {
    eng.encodeArgs({});
    eng.encodeArgs({ radius: 5 });
    eng.encodeArgs({ radius: Number.NaN });
    eng.encodeOpArgs([{ kind: "sketch_create", args: {} }]);
    const s = eng.getStats();
    expect(s.totalEncodings).toBe(4); // 3 direct + 1 from batch
    expect(s.totalBatchEncodings).toBe(1);
    expect(s.totalEmptyArgs).toBe(2); // {} and the batch op's {}
    expect(s.totalNonFiniteValues).toBe(1);
  });
});
