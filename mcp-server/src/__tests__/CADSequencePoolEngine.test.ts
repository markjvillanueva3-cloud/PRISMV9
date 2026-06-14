/**
 * CADSequencePoolEngine — vitest suite (CAD-DRAW-MAX-MS0/P1-U05).
 *
 * Closed-form assertions on all 5 strategies, R12 fail-loud, exp-decay
 * → mean/last limits, attention determinism, poolAll, stats.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  CADSequencePoolEngine,
  POOL_STRATEGIES,
  DEFAULT_EXP_DECAY_ALPHA,
} from "../engines/CADSequencePoolEngine.js";

describe("CADSequencePoolEngine — P1-U05", () => {
  let eng: CADSequencePoolEngine;
  beforeEach(() => {
    eng = new CADSequencePoolEngine();
  });

  it("POOL_STRATEGIES contains exactly the 5 documented strategies", () => {
    expect([...POOL_STRATEGIES].sort()).toEqual(["attention", "exp-decay", "last", "max", "mean"]);
    expect(DEFAULT_EXP_DECAY_ALPHA).toBe(0.3);
  });

  it("mean: pool([[1,1],[2,2],[3,3]]) → [2,2]", () => {
    expect(eng.pool([[1, 1], [2, 2], [3, 3]], { strategy: "mean" })).toEqual([2, 2]);
  });

  it("max: per-dim max-pool", () => {
    expect(eng.pool([[1, 3, 0], [2, 1, 5], [0, 2, 2]], { strategy: "max" })).toEqual([2, 3, 5]);
  });

  it("last: returns final row verbatim", () => {
    const out = eng.pool([[1, 2], [3, 4], [5, 6]], { strategy: "last" });
    expect(out).toEqual([5, 6]);
  });

  it("last: returns a COPY (caller mutation does not leak back)", () => {
    const rows = [[1, 2], [3, 4]];
    const out = eng.pool(rows, { strategy: "last" });
    out[0] = 999;
    expect(rows[1][0]).toBe(3);
  });

  it("exp-decay with α→0 equals mean (uniform weights)", () => {
    const rows = [[1, 0], [0, 1], [1, 1]];
    const exp0 = eng.pool(rows, { strategy: "exp-decay", alpha: 1e-9 });
    const mean = eng.pool(rows, { strategy: "mean" });
    for (let i = 0; i < 2; i++) expect(exp0[i]).toBeCloseTo(mean[i], 6);
  });

  it("exp-decay with α→∞ ≈ last (only final row weight)", () => {
    const rows = [[1, 1], [0, 0], [10, 20]];
    const expLarge = eng.pool(rows, { strategy: "exp-decay", alpha: 100 });
    expect(expLarge[0]).toBeCloseTo(10, 6);
    expect(expLarge[1]).toBeCloseTo(20, 6);
  });

  it("exp-decay default uses DEFAULT_EXP_DECAY_ALPHA when alpha omitted", () => {
    const rows = [[1, 0], [2, 0]];
    const a = eng.pool(rows, { strategy: "exp-decay" });
    const b = eng.pool(rows, { strategy: "exp-decay", alpha: DEFAULT_EXP_DECAY_ALPHA });
    expect(a).toEqual(b);
  });

  it("default strategy is exp-decay (when opts.strategy omitted)", () => {
    const rows = [[1, 0], [2, 0]];
    const defaulted = eng.pool(rows);
    const explicit = eng.pool(rows, { strategy: "exp-decay" });
    expect(defaulted).toEqual(explicit);
  });

  it("attention: all-identical rows → returns the row (softmax uniform → mean)", () => {
    const rows = [[1, 2], [1, 2], [1, 2]];
    const out = eng.pool(rows, { strategy: "attention" });
    expect(out[0]).toBeCloseTo(1, 6);
    expect(out[1]).toBeCloseTo(2, 6);
  });

  it("attention: one dominant row gets most of the weight", () => {
    const rows = [[0, 0], [0, 0], [10, 10]];
    const out = eng.pool(rows, { strategy: "attention" });
    expect(out[0]).toBeGreaterThan(7);
    expect(out[1]).toBeGreaterThan(7);
  });

  it("attention: deterministic — same input → identical output across calls", () => {
    const rows = [[1, 2, 3], [4, 5, 6], [7, 8, 9]];
    expect(eng.pool(rows, { strategy: "attention" })).toEqual(eng.pool(rows, { strategy: "attention" }));
  });

  it("attention with queryOverride=[10,0] → row[0]=[10,0] dominates output", () => {
    const rows = [[10, 0], [0, 10]];
    const out = eng.pool(rows, { strategy: "attention", attentionQuery: [10, 0] });
    expect(out[0]).toBeGreaterThan(9);
    expect(out[1]).toBeLessThan(1);
  });

  it("attention with mismatched queryOverride width → throws TypeError", () => {
    expect(() => eng.pool([[1, 2]], { strategy: "attention", attentionQuery: [1, 2, 3] })).toThrow(TypeError);
  });

  it("empty rows + expectedDim=5 → zeros(5)", () => {
    const out = eng.pool([], { strategy: "mean", expectedDim: 5 });
    expect(out).toEqual([0, 0, 0, 0, 0]);
    expect(eng.getStats().totalEmptyInputs).toBe(1);
  });

  it("empty rows without expectedDim → empty vector []", () => {
    expect(eng.pool([])).toEqual([]);
  });

  it("R12 fail-loud: row-width mismatch throws TypeError + counter increments", () => {
    expect(() => eng.pool([[1, 2], [3]])).toThrow(TypeError);
    expect(eng.getStats().totalRejectedWidthMismatch).toBe(1);
  });

  it("R12 fail-loud: unknown strategy throws TypeError", () => {
    expect(() => eng.pool([[1, 2]], { strategy: "not-a-strategy" as never })).toThrow(TypeError);
  });

  it("R12 fail-loud: non-array rows throws TypeError", () => {
    expect(() => eng.pool(null as never)).toThrow(TypeError);
  });

  it("poolAll returns all 5 strategies with width=3 + mean entry == direct mean call", () => {
    const rows = [[1, 2, 3], [4, 5, 6]];
    const all = eng.poolAll(rows);
    const expectedKeys = ["mean", "max", "last", "exp-decay", "attention"];
    for (const s of expectedKeys) {
      expect(all[s as never] as number[]).toHaveLength(3);
    }
    // Cross-check: poolAll.mean must equal pool(rows, {strategy:"mean"})
    expect(all.mean).toEqual(eng.pool(rows, { strategy: "mean" }));
    expect(all.last).toEqual([4, 5, 6]);
  });

  it("getStats tracks calls per strategy + total + empty + rejected", () => {
    eng.pool([[1, 0]], { strategy: "mean" });
    eng.pool([[1, 0]], { strategy: "max" });
    eng.pool([[1, 0]], { strategy: "last" });
    eng.pool([], { strategy: "mean", expectedDim: 1 });
    try { eng.pool([[1, 2], [3]]); } catch {}
    const s = eng.getStats();
    expect(s.totalPools).toBe(5);
    expect(s.byStrategy.mean).toBe(2);
    expect(s.byStrategy.max).toBe(1);
    expect(s.byStrategy.last).toBe(1);
    expect(s.byStrategy["exp-decay"]).toBe(1);
    expect(s.totalEmptyInputs).toBe(1);
    expect(s.totalRejectedWidthMismatch).toBe(1);
  });
});
