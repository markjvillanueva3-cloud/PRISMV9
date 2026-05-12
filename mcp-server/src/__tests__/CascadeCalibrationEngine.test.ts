/**
 * CascadeCalibrationEngine — U-OCN04 test suite (OCTOPUS-NEURAL-MS0).
 *
 * Covers the 5 cases the atomized spec calls out plus extras:
 *   1. happy: 3 tiers × 5 probes pass → frontier sorted by cost, thresholds populated
 *   2. all-tiers-fail: every probe scores 0 → alarm, no cheapestQualifying, fallback still set
 *   3. oversized probe set: 100 probes but maxProbesPerTier=10 → caps + alarm + truncated=true
 *   4. missing baseline: no expected provided → engine still returns valid frontier
 *   5. NaN scores: probe.score returns NaN → coerced to 0 + alarm noted
 *   + cost runaway: maxBudgetUsd=1, costPerProbe=0.5 → stops at 2 probes, truncated
 *   + tier.invoke throws: counted as probesFailed, engine doesn't surface the throw
 *   + probe.score throws: counted as probesFailed
 *   + variance reported for multi-probe tiers
 *   + validate rejects bad inputs
 *   + dispatcher round-trip placeholder (engine wired but no live tier callables)
 *
 * @module __tests__/CascadeCalibrationEngine.test
 * @milestone OCTOPUS-NEURAL-MS0/U-OCN04
 */

import { describe, it, expect } from "vitest";
import { CascadeCalibrationEngine, type Tier, type Probe } from "../engines/CascadeCalibrationEngine.js";

// ── Builders ────────────────────────────────────────────────────────────────

/** Cheap-mid-strong stub tier ladder; each invoke returns its answer factory's output. */
function tier(id: string, costPerProbe: number, answerFn: (prompt: string) => string, latencyMs = 50, alwaysFail = false): Tier {
  return {
    id,
    costPerProbe,
    invoke: async (prompt) => {
      if (alwaysFail) return { ok: false, answer: "", latencyMs };
      return { ok: true, answer: answerFn(prompt), latencyMs };
    },
  };
}

/** Probe that scores exact-match against a golden answer (1 if matches, 0 otherwise). */
function exactProbe(id: string, prompt: string, expected: string): Probe {
  return {
    id,
    prompt,
    expected,
    score: (answer, exp) => (answer === exp ? 1 : 0),
  };
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe("CascadeCalibrationEngine — U-OCN04 probe-based calibration", () => {
  // 1. happy: 3 tiers × 5 probes all pass → frontier sorted by cost, cheapestQualifying populated
  it("happy: 3 tiers × 5 probes all match expected → cheapest qualifying = lowest-cost tier", async () => {
    const eng = new CascadeCalibrationEngine();
    const probes: Probe[] = [];
    for (let i = 0; i < 5; i++) probes.push(exactProbe(`p${i}`, `q${i}`, `a${i}`));
    const oracle = (prompt: string): string => `a${prompt.slice(1)}`; // all tiers correct
    const r = await eng.calibrate({
      tiers: [
        tier("kimi-cheap",  0.001, oracle, 100),
        tier("sonnet-mid",  0.01,  oracle, 50),
        tier("opus-strong", 0.05,  oracle, 30),
      ],
      probes,
    });
    expect(r.ok).toBe(true);
    expect(r.frontier.length).toBe(3);
    // Frontier sorted ascending by meanCost — cheap tier first.
    expect(r.frontier[0].tierId).toBe("kimi-cheap");
    expect(r.frontier[2].tierId).toBe("opus-strong");
    // All tiers scored 1.0 mean → all qualify.
    expect(r.frontier.every((t) => t.meanScore === 1)).toBe(true);
    expect(r.frontier.every((t) => t.qualifies)).toBe(true);
    // Cheapest qualifying = kimi; defer = sonnet; fallback = highest-mean-score (tie → first encountered).
    expect(r.thresholds.cheapestQualifying).toBe("kimi-cheap");
    expect(r.thresholds.deferEscalation).toBe("sonnet-mid");
    expect(r.thresholds.fallback).not.toBeNull();
    expect(r.totalCostUsd).toBeCloseTo(5 * (0.001 + 0.01 + 0.05), 5);
    expect(r.alarm).toBeNull();
    expect(r.truncated).toBe(false);
  });

  // 2. all-tiers-fail: probes score 0 everywhere → alarm, no qualifying tier
  it("all-tiers-fail: every probe scores 0 → alarm, cheapestQualifying=null, fallback still set", async () => {
    const eng = new CascadeCalibrationEngine();
    const probes: Probe[] = [exactProbe("p1", "q1", "right"), exactProbe("p2", "q2", "right")];
    // All tiers answer 'wrong' so score=0.
    const r = await eng.calibrate({
      tiers: [
        tier("cheap",  0.001, () => "wrong"),
        tier("mid",    0.01,  () => "wrong"),
        tier("strong", 0.05,  () => "wrong"),
      ],
      probes,
    });
    expect(r.frontier.every((t) => t.meanScore === 0)).toBe(true);
    expect(r.frontier.every((t) => !t.qualifies)).toBe(true);
    expect(r.thresholds.cheapestQualifying).toBeNull();
    expect(r.thresholds.deferEscalation).toBeNull();
    expect(r.thresholds.fallback).not.toBeNull(); // last-resort still chosen
    expect(r.alarm).toContain("No tier qualifies");
    expect(r.alarm).toContain("Preserve last-known-good");
  });

  // 3. oversized probe set
  it("oversized probe set: 100 probes with maxProbesPerTier=10 → caps + alarm + truncated", async () => {
    const eng = new CascadeCalibrationEngine();
    const probes: Probe[] = [];
    for (let i = 0; i < 100; i++) probes.push(exactProbe(`p${i}`, `q${i}`, `a${i}`));
    const oracle = (prompt: string): string => `a${prompt.slice(1)}`;
    const r = await eng.calibrate({
      tiers: [tier("kimi", 0.001, oracle)],
      probes,
      maxProbesPerTier: 10,
    });
    expect(r.frontier[0].probesRun).toBe(10);
    expect(r.truncated).toBe(true);
    expect(r.alarm).toContain("Probe set capped at maxProbesPerTier=10");
  });

  // 4. missing baseline: no expected provided → engine still produces valid frontier
  it("missing baseline: probes without expected still score (length-based heuristic) → valid frontier", async () => {
    const eng = new CascadeCalibrationEngine();
    // Score by answer-length heuristic (no `expected` reference).
    const lenProbe = (id: string, prompt: string): Probe => ({
      id,
      prompt,
      score: (answer) => (answer.length >= 5 ? 1 : 0),
    });
    const probes = [lenProbe("p1", "Q"), lenProbe("p2", "Q")];
    const r = await eng.calibrate({
      tiers: [
        tier("cheap",  0.001, () => "OK"),    // 2 chars → score 0
        tier("strong", 0.05,  () => "PRISM!"), // 6 chars → score 1
      ],
      probes,
      scoreFloor: 0.5,
    });
    expect(r.frontier.find((t) => t.tierId === "cheap")?.meanScore).toBe(0);
    expect(r.frontier.find((t) => t.tierId === "strong")?.meanScore).toBe(1);
    expect(r.thresholds.cheapestQualifying).toBe("strong");
  });

  // 5. NaN scores: probe.score returns NaN → coerced to 0 + alarm
  it("NaN scores: probe.score returns NaN/Infinity → coerced to 0, alarm notes the issue", async () => {
    const eng = new CascadeCalibrationEngine();
    const broken: Probe = {
      id: "broken",
      prompt: "q",
      score: () => Number.NaN,
    };
    const ok: Probe = {
      id: "ok",
      prompt: "q",
      score: () => 1,
    };
    const r = await eng.calibrate({
      tiers: [tier("cheap", 0.001, () => "a")],
      probes: [broken, ok],
    });
    expect(r.alarm).toContain("NaN/Infinity");
    // 1 of 2 scored 0 (NaN coerced), 1 scored 1 → mean 0.5
    expect(r.frontier[0].meanScore).toBeCloseTo(0.5, 5);
  });

  // 6. cost runaway: maxBudgetUsd hard cap stops calibration
  it("cost runaway: maxBudgetUsd=1, costPerProbe=0.5 → stops after 2 probes, truncated=true", async () => {
    const eng = new CascadeCalibrationEngine();
    const probes: Probe[] = [];
    for (let i = 0; i < 10; i++) probes.push(exactProbe(`p${i}`, `q${i}`, `a${i}`));
    const oracle = (prompt: string): string => `a${prompt.slice(1)}`;
    const r = await eng.calibrate({
      tiers: [tier("kimi", 0.5, oracle)],
      probes,
      maxBudgetUsd: 1.0,
    });
    expect(r.frontier[0].probesRun).toBe(2);
    expect(r.totalCostUsd).toBeCloseTo(1.0, 5);
    expect(r.truncated).toBe(true);
    expect(r.alarm).toContain("Budget cap hit");
  });

  // 7. tier.invoke throws: counted as probesFailed, engine swallows the throw
  it("tier.invoke throws: counts as probesFailed; engine does not propagate", async () => {
    const eng = new CascadeCalibrationEngine();
    const flakyTier: Tier = {
      id: "flaky",
      costPerProbe: 0.01,
      invoke: async () => { throw new Error("network reset"); },
    };
    const probes = [exactProbe("p1", "q1", "a1"), exactProbe("p2", "q2", "a2")];
    const r = await eng.calibrate({ tiers: [flakyTier], probes });
    expect(r.frontier[0].probesFailed).toBe(2);
    expect(r.frontier[0].probesRun).toBe(2);
    expect(r.frontier[0].meanScore).toBe(0);
    expect(r.frontier[0].qualifies).toBe(false);
  });

  // 8. tier returns ok:false: counted as probesFailed
  it("tier returns ok:false: counted as probesFailed (transport error, not score=0)", async () => {
    const eng = new CascadeCalibrationEngine();
    const probes = [exactProbe("p1", "q1", "a1"), exactProbe("p2", "q2", "a2")];
    const r = await eng.calibrate({
      tiers: [tier("downed", 0.01, () => "", 50, true)],
      probes,
    });
    expect(r.frontier[0].probesFailed).toBe(2);
    expect(r.frontier[0].meanScore).toBe(0);
  });

  // 9. probe.score throws: counted as probesFailed
  it("probe.score throws: counts as probesFailed; engine continues to next probe", async () => {
    const eng = new CascadeCalibrationEngine();
    const throwing: Probe = {
      id: "throws",
      prompt: "q1",
      score: () => { throw new Error("scorer blew up"); },
    };
    const fine = exactProbe("fine", "q2", "a2");
    const r = await eng.calibrate({
      tiers: [tier("cheap", 0.001, (p) => p === "q2" ? "a2" : "?")],
      probes: [throwing, fine],
    });
    expect(r.frontier[0].probesFailed).toBe(1);
    // Only the "fine" probe contributes to the mean → meanScore = 1.
    expect(r.frontier[0].meanScore).toBe(1);
  });

  // 10. variance: multi-probe tiers report scoreVariance
  it("variance: tier scoring [0,1,0,1] reports nonzero variance", async () => {
    const eng = new CascadeCalibrationEngine();
    // Alternating right/wrong probes.
    const probes: Probe[] = [
      exactProbe("p1", "q1", "right"),
      exactProbe("p2", "q2", "right"),
      exactProbe("p3", "q3", "right"),
      exactProbe("p4", "q4", "right"),
    ];
    let toggle = false;
    const flakyOracle = (): string => { toggle = !toggle; return toggle ? "right" : "wrong"; };
    const r = await eng.calibrate({
      tiers: [tier("flippy", 0.001, flakyOracle)],
      probes,
    });
    expect(r.frontier[0].scoreVariance).toBeGreaterThan(0);
    expect(r.frontier[0].meanScore).toBeCloseTo(0.5, 5);
  });

  // 11. validate
  it("validate: rejects empty tiers / empty probes / bad cost / bad maxBudget", async () => {
    const eng = new CascadeCalibrationEngine();
    const goodProbe = exactProbe("p1", "q", "a");
    const goodTier = tier("t1", 0.001, () => "a");
    await expect(eng.calibrate({ tiers: [], probes: [goodProbe] })).rejects.toThrow(/tiers/);
    await expect(eng.calibrate({ tiers: [goodTier], probes: [] })).rejects.toThrow(/probes/);
    await expect(eng.calibrate({ tiers: [{ id: "x", costPerProbe: -1, invoke: async () => ({ ok: true, answer: "", latencyMs: 1 }) }], probes: [goodProbe] })).rejects.toThrow(/costPerProbe/);
    await expect(eng.calibrate({ tiers: [goodTier], probes: [goodProbe], maxBudgetUsd: -1 })).rejects.toThrow(/maxBudgetUsd/);
    await expect(eng.calibrate({ tiers: [goodTier], probes: [goodProbe], maxProbesPerTier: 0 })).rejects.toThrow(/maxProbesPerTier/);
    await expect(eng.calibrate({ tiers: [goodTier], probes: [goodProbe], scoreFloor: 1.5 })).rejects.toThrow(/scoreFloor/);
  });

  // 12. fallback chosen as highest-mean-score even when no tier qualifies
  it("fallback selection: highest-mean-score tier surfaces even when no tier crosses scoreFloor", async () => {
    const eng = new CascadeCalibrationEngine();
    // Scores 0.3 on tier A, 0.4 on tier B (both below floor 0.5) → fallback = tier B.
    const probes: Probe[] = [
      { id: "p1", prompt: "q1", score: (a) => (a === "A" ? 0.3 : 0.4) },
      { id: "p2", prompt: "q2", score: (a) => (a === "A" ? 0.3 : 0.4) },
    ];
    const r = await eng.calibrate({
      tiers: [
        tier("a-tier", 0.001, () => "A"),
        tier("b-tier", 0.05,  () => "B"),
      ],
      probes,
      scoreFloor: 0.5,
    });
    expect(r.thresholds.cheapestQualifying).toBeNull();
    expect(r.thresholds.fallback).toBe("b-tier");
    expect(r.alarm).toContain("No tier qualifies");
  });
});

// ─── dispatcher round-trip ─────────────────────────────────────────────────
describe("prism_ai:cascade_calibrate — dispatcher contract (U-OCN04 wiring + reviewer P2#3)", () => {
  it("dispatcher action present in AI_REASONING_ACTIONS enum", async () => {
    const { AI_REASONING_ACTIONS } = await import("../schemas/aiReasoningActionSchemas.js");
    expect((AI_REASONING_ACTIONS as readonly string[]).includes("cascade_calibrate")).toBe(true);
  });

  it("MCP path returns ok:false with explicit error — no silent skip (reviewer P2#3)", async () => {
    // The engine API requires function-typed inputs (tier.invoke, probe.score)
    // that don't survive JSON serialization. Per reviewer P2#3, the dispatcher
    // case must surface this as ok:false / explicit error, NOT ok:true with a
    // friendly message (which would let naive callers silently believe their
    // calibration ran). This test pins that behavior.
    const { executeAIReasoningAction } = await import("../tools/dispatchers/aiReasoningDispatcher.js");
    const out = await executeAIReasoningAction("cascade_calibrate" as never, { summary: "user-supplied" });
    expect(out.success).toBe(true); // dispatcher success (action recognized) — but payload below is ok:false
    const data = out.data as { ok: boolean; error: string; in_process_api: string; cli: string };
    expect(data.ok).toBe(false);
    expect(data.error).toMatch(/cannot run over MCP/);
    expect(data.error).toMatch(/did NOT run/);
    expect(data.in_process_api).toMatch(/cascadeCalibrationEngine\.calibrate/);
    expect(data.cli).toMatch(/scripts\/cascade-calibrate\.mjs/);
  });
});
