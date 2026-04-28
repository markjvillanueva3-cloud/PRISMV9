/**
 * aiReasoningDispatcher U-WIRE29 round-trip tests — StatisticalLearningBoundsEngine.
 *
 * Validates bounds_pac_complexity / bounds_vc / bounds_rademacher /
 * bounds_pac_bayes through prism_ai. The engine is pure math (PAC/VC/
 * Rademacher/PAC-Bayes generalization bounds) — no state, no I/O.
 *
 * @milestone ENGINE-WIRE-MS0
 * @unit U-WIRE29
 */

import { describe, it, expect } from "vitest";
import {
  StatisticalLearningBoundsEngine,
  statisticalLearningBoundsEngine,
} from "../engines/StatisticalLearningBoundsEngine.js";
import {
  AI_REASONING_ACTIONS,
  ACTION_AI_REASONING_SCHEMAS,
  type AIReasoningAction,
} from "../schemas/aiReasoningActionSchemas.js";
import { executeAIReasoningAction } from "../tools/dispatchers/aiReasoningDispatcher.js";

describe("U-WIRE29 — engine direct: StatisticalLearningBoundsEngine", () => {
  it("pacSampleComplexity matches the closed-form (1/ε)·(ln|H| + ln(1/δ))", () => {
    const fresh = new StatisticalLearningBoundsEngine();
    // |H|=100, ε=0.1, δ=0.05 → m ≥ (1/0.1)·(ln(100) + ln(20)) = 10·(4.605+2.996) ≈ 76.0
    const r = fresh.pacSampleComplexity({ hypothesisClassSize: 100, epsilon: 0.1, delta: 0.05 });
    const expected = Math.ceil((1 / 0.1) * (Math.log(100) + Math.log(1 / 0.05)));
    expect(r.value).toBe(expected);
    expect(r.formula).toMatch(/m\s*≥\s*\(1\/ε\)/);
  });

  it("pacSampleComplexity grows monotonically as ε shrinks (tighter accuracy → more samples)", () => {
    const fresh = new StatisticalLearningBoundsEngine();
    const looser = fresh.pacSampleComplexity({ hypothesisClassSize: 100, epsilon: 0.5, delta: 0.05 });
    const tighter = fresh.pacSampleComplexity({ hypothesisClassSize: 100, epsilon: 0.01, delta: 0.05 });
    expect(tighter.value).toBeGreaterThan(looser.value);
  });

  it("pacSampleComplexity grows as |H| grows (richer classes → more samples)", () => {
    const fresh = new StatisticalLearningBoundsEngine();
    const small = fresh.pacSampleComplexity({ hypothesisClassSize: 10, epsilon: 0.1, delta: 0.05 });
    const large = fresh.pacSampleComplexity({ hypothesisClassSize: 1_000_000, epsilon: 0.1, delta: 0.05 });
    expect(large.value).toBeGreaterThan(small.value);
  });

  it("pacSampleComplexity throws on |H|<1, ε∉(0,1), δ∉(0,1)", () => {
    const fresh = new StatisticalLearningBoundsEngine();
    expect(() => fresh.pacSampleComplexity({ hypothesisClassSize: 0, epsilon: 0.1, delta: 0.05 })).toThrow(/H/);
    expect(() => fresh.pacSampleComplexity({ hypothesisClassSize: 10, epsilon: 0, delta: 0.05 })).toThrow(/epsilon/);
    expect(() => fresh.pacSampleComplexity({ hypothesisClassSize: 10, epsilon: 1, delta: 0.05 })).toThrow(/epsilon/);
    expect(() => fresh.pacSampleComplexity({ hypothesisClassSize: 10, epsilon: 0.1, delta: 0 })).toThrow(/delta/);
    expect(() => fresh.pacSampleComplexity({ hypothesisClassSize: 10, epsilon: 0.1, delta: 1 })).toThrow(/delta/);
  });

  it("vcBound is non-negative + decreases as n grows (1/√n scaling)", () => {
    const fresh = new StatisticalLearningBoundsEngine();
    const small = fresh.vcBound({ vcDim: 10, n: 100, delta: 0.05 });
    const large = fresh.vcBound({ vcDim: 10, n: 100_000, delta: 0.05 });
    expect(small.value).toBeGreaterThanOrEqual(0);
    expect(large.value).toBeGreaterThanOrEqual(0);
    expect(large.value).toBeLessThan(small.value);
  });

  it("vcBound rejects negative VC dim and non-integer / non-positive n", () => {
    const fresh = new StatisticalLearningBoundsEngine();
    expect(() => fresh.vcBound({ vcDim: -1, n: 100, delta: 0.05 })).toThrow(/vcDim/);
    expect(() => fresh.vcBound({ vcDim: 5, n: 0, delta: 0.05 })).toThrow(/n/);
    expect(() => fresh.vcBound({ vcDim: 5, n: 1.5, delta: 0.05 })).toThrow(/n/);
  });

  it("rademacherBound has the expected affine-in-R̂ structure: bound = 2·R̂_n + slack(n,δ)", () => {
    const fresh = new StatisticalLearningBoundsEngine();
    const a = fresh.rademacherBound({ empiricalRademacher: 0.0, n: 1000, delta: 0.05 });
    const b = fresh.rademacherBound({ empiricalRademacher: 0.1, n: 1000, delta: 0.05 });
    // Doubling slope: increasing R̂_n by Δ should raise the bound by ~2·Δ
    expect(b.value - a.value).toBeCloseTo(0.2, 4);
  });

  it("rademacherBound rejects negative empirical complexity + non-positive n", () => {
    const fresh = new StatisticalLearningBoundsEngine();
    expect(() => fresh.rademacherBound({ empiricalRademacher: -0.1, n: 100, delta: 0.05 })).toThrow(/Rademacher/);
    expect(() => fresh.rademacherBound({ empiricalRademacher: 0.5, n: 0, delta: 0.05 })).toThrow(/n/);
  });

  it("pacBayesBound ≥ 0, decreases with n, requires n>1 (denominator 2(n-1))", () => {
    const fresh = new StatisticalLearningBoundsEngine();
    expect(() => fresh.pacBayesBound({ kl: 0.1, n: 1, delta: 0.05 })).toThrow(/n/);
    const small = fresh.pacBayesBound({ kl: 0.5, n: 100, delta: 0.05 });
    const large = fresh.pacBayesBound({ kl: 0.5, n: 10_000, delta: 0.05 });
    expect(small.value).toBeGreaterThanOrEqual(0);
    expect(large.value).toBeLessThan(small.value);
  });

  it("formulas are non-empty descriptive strings (used in advisory output)", () => {
    const fresh = new StatisticalLearningBoundsEngine();
    expect(fresh.pacSampleComplexity({ hypothesisClassSize: 10, epsilon: 0.1, delta: 0.05 }).formula.length).toBeGreaterThan(0);
    expect(fresh.vcBound({ vcDim: 5, n: 100, delta: 0.05 }).formula.length).toBeGreaterThan(0);
    expect(fresh.rademacherBound({ empiricalRademacher: 0.1, n: 100, delta: 0.05 }).formula.length).toBeGreaterThan(0);
    expect(fresh.pacBayesBound({ kl: 0.1, n: 100, delta: 0.05 }).formula.length).toBeGreaterThan(0);
  });
});

describe("U-WIRE29 — schema integrity", () => {
  it("all 4 bounds_* actions are in AI_REASONING_ACTIONS exactly once", () => {
    const actions = AI_REASONING_ACTIONS as readonly string[];
    for (const a of ["bounds_pac_complexity", "bounds_vc", "bounds_rademacher", "bounds_pac_bayes"]) {
      expect(actions.filter((x) => x === a).length).toBe(1);
    }
  });

  it("Zod schemas exist for all 4 actions", () => {
    const map = ACTION_AI_REASONING_SCHEMAS as Record<string, unknown>;
    for (const a of ["bounds_pac_complexity", "bounds_vc", "bounds_rademacher", "bounds_pac_bayes"]) {
      expect(typeof map[a]).toBe("object");
    }
  });

  it("schemas enforce the OPEN interval (0,1) for ε and δ — exactly 0 or 1 must reject", () => {
    const map = ACTION_AI_REASONING_SCHEMAS as Record<string, { safeParse: (x: unknown) => { success: boolean } }>;
    expect(map.bounds_pac_complexity.safeParse({ hypothesisClassSize: 10, epsilon: 0, delta: 0.05 }).success).toBe(false);
    expect(map.bounds_pac_complexity.safeParse({ hypothesisClassSize: 10, epsilon: 1, delta: 0.05 }).success).toBe(false);
    expect(map.bounds_pac_complexity.safeParse({ hypothesisClassSize: 10, epsilon: 0.1, delta: 0 }).success).toBe(false);
    expect(map.bounds_pac_complexity.safeParse({ hypothesisClassSize: 10, epsilon: 0.1, delta: 1 }).success).toBe(false);
    expect(map.bounds_pac_complexity.safeParse({ hypothesisClassSize: 10, epsilon: 0.1, delta: 0.05 }).success).toBe(true);
  });

  it("bounds_pac_complexity rejects |H|<1", () => {
    const map = ACTION_AI_REASONING_SCHEMAS as Record<string, { safeParse: (x: unknown) => { success: boolean } }>;
    expect(map.bounds_pac_complexity.safeParse({ hypothesisClassSize: 0, epsilon: 0.1, delta: 0.05 }).success).toBe(false);
    expect(map.bounds_pac_complexity.safeParse({ hypothesisClassSize: 0.5, epsilon: 0.1, delta: 0.05 }).success).toBe(false);
    expect(map.bounds_pac_complexity.safeParse({ hypothesisClassSize: 1, epsilon: 0.1, delta: 0.05 }).success).toBe(true);
  });

  it("bounds_vc + bounds_rademacher require positive integer n; bounds_pac_bayes requires n>1", () => {
    const map = ACTION_AI_REASONING_SCHEMAS as Record<string, { safeParse: (x: unknown) => { success: boolean } }>;
    expect(map.bounds_vc.safeParse({ vcDim: 5, n: 0, delta: 0.05 }).success).toBe(false);
    expect(map.bounds_vc.safeParse({ vcDim: 5, n: 1.5, delta: 0.05 }).success).toBe(false);
    expect(map.bounds_vc.safeParse({ vcDim: 5, n: 100, delta: 0.05 }).success).toBe(true);

    expect(map.bounds_rademacher.safeParse({ empiricalRademacher: 0.5, n: -1, delta: 0.05 }).success).toBe(false);
    expect(map.bounds_rademacher.safeParse({ empiricalRademacher: 0.5, n: 100, delta: 0.05 }).success).toBe(true);

    expect(map.bounds_pac_bayes.safeParse({ kl: 0.1, n: 1, delta: 0.05 }).success).toBe(false);
    expect(map.bounds_pac_bayes.safeParse({ kl: 0.1, n: 2, delta: 0.05 }).success).toBe(true);
  });

  it("bounds_vc rejects negative vcDim; bounds_rademacher rejects negative empiricalRademacher", () => {
    const map = ACTION_AI_REASONING_SCHEMAS as Record<string, { safeParse: (x: unknown) => { success: boolean } }>;
    expect(map.bounds_vc.safeParse({ vcDim: -1, n: 100, delta: 0.05 }).success).toBe(false);
    expect(map.bounds_vc.safeParse({ vcDim: 0, n: 100, delta: 0.05 }).success).toBe(true);
    expect(map.bounds_rademacher.safeParse({ empiricalRademacher: -0.1, n: 100, delta: 0.05 }).success).toBe(false);
    expect(map.bounds_rademacher.safeParse({ empiricalRademacher: 0, n: 100, delta: 0.05 }).success).toBe(true);
  });
});

describe("U-WIRE29 — dispatcher round-trip: prism_ai", () => {
  it("bounds_pac_complexity happy path returns {value, formula} matching closed form", async () => {
    const r = await executeAIReasoningAction("bounds_pac_complexity" as AIReasoningAction, {
      hypothesisClassSize: 100, epsilon: 0.1, delta: 0.05,
    });
    expect(r.success).toBe(true);
    const data = r.data as { value?: number; formula?: string };
    expect(typeof data.value).toBe("number");
    const expected = Math.ceil((1 / 0.1) * (Math.log(100) + Math.log(1 / 0.05)));
    expect(data.value).toBe(expected);
    expect((data.formula ?? "").length).toBeGreaterThan(0);
  });

  it("bounds_vc happy path returns finite non-negative value", async () => {
    const r = await executeAIReasoningAction("bounds_vc" as AIReasoningAction, {
      vcDim: 10, n: 1000, delta: 0.05,
    });
    expect(r.success).toBe(true);
    const data = r.data as { value?: number; formula?: string };
    expect(typeof data.value).toBe("number");
    expect(Number.isFinite(data.value ?? NaN)).toBe(true);
    expect(data.value).toBeGreaterThanOrEqual(0);
  });

  it("bounds_rademacher happy path: 2·R̂ + slack — slope-2 in R̂ matches engine output", async () => {
    const a = await executeAIReasoningAction("bounds_rademacher" as AIReasoningAction, {
      empiricalRademacher: 0.0, n: 1000, delta: 0.05,
    });
    const b = await executeAIReasoningAction("bounds_rademacher" as AIReasoningAction, {
      empiricalRademacher: 0.1, n: 1000, delta: 0.05,
    });
    expect(a.success).toBe(true);
    expect(b.success).toBe(true);
    const av = (a.data as { value: number }).value;
    const bv = (b.data as { value: number }).value;
    expect(bv - av).toBeCloseTo(0.2, 4);
  });

  it("bounds_pac_bayes happy path returns positive bound at small KL", async () => {
    const r = await executeAIReasoningAction("bounds_pac_bayes" as AIReasoningAction, {
      kl: 0.5, n: 1000, delta: 0.05,
    });
    expect(r.success).toBe(true);
    const data = r.data as { value?: number; formula?: string };
    expect(typeof data.value).toBe("number");
    expect(data.value).toBeGreaterThan(0);
  });

  it("FAIL: bounds_pac_complexity with epsilon=0 → schema rejects (open interval)", async () => {
    const r = await executeAIReasoningAction("bounds_pac_complexity" as AIReasoningAction, {
      hypothesisClassSize: 10, epsilon: 0, delta: 0.05,
    });
    expect(r.success).toBe(false);
    expect(typeof r.error).toBe("string");
    expect((r.error ?? "").length).toBeGreaterThan(0);
  });

  it("FAIL: bounds_vc with n=0 → schema rejects", async () => {
    const r = await executeAIReasoningAction("bounds_vc" as AIReasoningAction, {
      vcDim: 5, n: 0, delta: 0.05,
    });
    expect(r.success).toBe(false);
    expect(typeof r.error).toBe("string");
  });

  it("FAIL: bounds_rademacher with negative empiricalRademacher → schema rejects", async () => {
    const r = await executeAIReasoningAction("bounds_rademacher" as AIReasoningAction, {
      empiricalRademacher: -0.5, n: 100, delta: 0.05,
    });
    expect(r.success).toBe(false);
    expect(typeof r.error).toBe("string");
  });

  it("FAIL: bounds_pac_bayes with n=1 → schema rejects (denominator would be 2·0)", async () => {
    const r = await executeAIReasoningAction("bounds_pac_bayes" as AIReasoningAction, {
      kl: 0.1, n: 1, delta: 0.05,
    });
    expect(r.success).toBe(false);
    expect(typeof r.error).toBe("string");
  });

  it("FAIL: bounds_pac_complexity with missing field → schema rejects", async () => {
    const r = await executeAIReasoningAction("bounds_pac_complexity" as AIReasoningAction, {
      epsilon: 0.1, delta: 0.05,
    });
    expect(r.success).toBe(false);
    expect(typeof r.error).toBe("string");
  });
});

describe("U-WIRE29 — singleton continuity", () => {
  it("statisticalLearningBoundsEngine singleton identity is stable across re-imports", async () => {
    const mod = await import("../engines/StatisticalLearningBoundsEngine.js");
    expect(mod.statisticalLearningBoundsEngine).toBe(statisticalLearningBoundsEngine);
  });
});
