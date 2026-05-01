/**
 * CAMInHostAssertionBundleEngine.test.ts — U-CAMTEST14
 * =====================================================
 *
 * Coverage:
 *   - happy path: all 7 assertions pass on a clean scenario
 *   - each assertion family fails individually under the right violation
 *   - hard_stop_trigger 4-way matrix (deliberate × observed)
 *   - pure helpers: p99 nearest-rank, band transition counting, gap detection
 *   - schema rejection on bad input (failure modes + adversarial)
 *   - bundle audit invariant
 *   - dispatcher round-trip
 */

import { describe, it, expect } from "vitest";
import {
  CAMInHostAssertionBundleEngine,
  AssertionNameSchema,
  ObservedFrameSchema,
  SessionStatsSchema,
  ScenarioExpectationsSchema,
  BundleResultSchema,
  HARD_STOP_BUDGET_FRAMES_DEFAULT,
  p99,
  countBandTransitions,
  firstHardStopSeq,
  seqGaps,
  type ObservedFrame,
  type SessionStats,
  type ScenarioExpectations,
  type EvaluateInput,
} from "../engines/CAMInHostAssertionBundleEngine.js";

// ── Test fixtures ────────────────────────────────────────────────────────────

function calmObserved(count: number): ObservedFrame[] {
  const out: ObservedFrame[] = [];
  for (let i = 0; i < count; i++) {
    out.push({ seq: i, latency_ms: 1.0, hard_stop: false, band: 0, payload_valid: true });
  }
  return out;
}

function calmStats(count: number): SessionStats {
  return {
    frames_in: count,
    frames_delivered: count,
    frames_queued: 0,
    frames_dropped: 0,
    frames_unknown_target: 0,
  };
}

function calmExpectations(count: number): ScenarioExpectations {
  return {
    expected_frame_count: count,
    expected_band_transitions: 0,
    deliberate_hard_stop: false,
    latency_p99_budget_ms: 100,
  };
}

function evaluateCalm(count: number): ReturnType<typeof CAMInHostAssertionBundleEngine.evaluate> {
  return CAMInHostAssertionBundleEngine.evaluate({
    observed: calmObserved(count),
    stats: calmStats(count),
    expectations: calmExpectations(count),
  });
}

// ── 1. Happy path ────────────────────────────────────────────────────────────

describe("CAMInHostAssertionBundleEngine — happy path", () => {
  it("all 7 assertions pass on a clean 12-frame scenario", () => {
    const result = evaluateCalm(12);
    expect(result.overall_pass).toBe(true);
    expect(result.assertions.length).toBe(7);
    for (const a of result.assertions) expect(a.pass).toBe(true);
  });

  it("ASSERTION_FAMILIES exposes exactly the 7 expected families", () => {
    expect(CAMInHostAssertionBundleEngine.ASSERTION_FAMILIES.length).toBe(7);
    expect(CAMInHostAssertionBundleEngine.ASSERTION_FAMILIES).toEqual([
      "frame_arrival",
      "latency_p99",
      "band_transitions",
      "hard_stop_trigger",
      "session_stats_reconcile",
      "encoder_schema",
      "reconnect_drain",
    ]);
  });

  it("derived metrics report correct frame count and zero p99 on calm baseline", () => {
    const result = evaluateCalm(12);
    expect(result.derived.frame_count).toBe(12);
    expect(result.derived.latency_p99_ms).toBe(1.0);
    expect(result.derived.band_transitions_observed).toBe(0);
    expect(result.derived.hard_stop_at_seq).toBeNull();
  });

  it("HARD_STOP_BUDGET_FRAMES_DEFAULT is 3", () => {
    expect(HARD_STOP_BUDGET_FRAMES_DEFAULT).toBe(3);
    expect(CAMInHostAssertionBundleEngine.HARD_STOP_BUDGET_FRAMES_DEFAULT).toBe(3);
  });
});

// ── 2. Per-family failure modes ─────────────────────────────────────────────

describe("CAMInHostAssertionBundleEngine — per-family failure modes", () => {
  it("frame_arrival fails when observed count < expected (missing frames)", () => {
    const result = CAMInHostAssertionBundleEngine.evaluate({
      observed: calmObserved(8),                  // observed only 8
      stats: calmStats(8),
      expectations: calmExpectations(12),         // expected 12
    });
    const a = CAMInHostAssertionBundleEngine.byName(result, "frame_arrival");
    expect(a.pass).toBe(false);
    expect(a.detail).toMatch(/8\/12/);
  });

  it("frame_arrival fails on duplicate seq numbers", () => {
    const observed = calmObserved(12);
    observed[5].seq = 4;                          // dupe of seq 4
    const result = CAMInHostAssertionBundleEngine.evaluate({
      observed,
      stats: calmStats(12),
      expectations: calmExpectations(12),
    });
    expect(CAMInHostAssertionBundleEngine.byName(result, "frame_arrival").pass).toBe(false);
  });

  it("latency_p99 fails when p99 exceeds budget", () => {
    // With 10 frames, p99 nearest-rank idx = ceil(0.99 * 10) - 1 = 9
    // → p99 lands on the highest sorted element. Setting frame 9 = 250 ms
    // pushes p99 to 250 > 100 ms budget.
    const observed = calmObserved(10);
    observed[9].latency_ms = 250;
    const result = CAMInHostAssertionBundleEngine.evaluate({
      observed,
      stats: calmStats(10),
      expectations: calmExpectations(10),
    });
    const a = CAMInHostAssertionBundleEngine.byName(result, "latency_p99");
    expect(a.pass).toBe(false);
    expect(a.metric?.p99_ms).toBe(250);
  });

  it("band_transitions fails when observed transitions != expected", () => {
    const observed = calmObserved(12);
    observed[3].band = 1; observed[4].band = 1;   // 0→1→0 = 2 transitions
    observed[5].band = 0;
    const result = CAMInHostAssertionBundleEngine.evaluate({
      observed,
      stats: calmStats(12),
      expectations: { ...calmExpectations(12), expected_band_transitions: 0 },
    });
    expect(CAMInHostAssertionBundleEngine.byName(result, "band_transitions").pass).toBe(false);
  });

  it("hard_stop_trigger fails when deliberate but no hard_stop observed", () => {
    const result = CAMInHostAssertionBundleEngine.evaluate({
      observed: calmObserved(12),
      stats: calmStats(12),
      expectations: { ...calmExpectations(12), deliberate_hard_stop: true },
    });
    const a = CAMInHostAssertionBundleEngine.byName(result, "hard_stop_trigger");
    expect(a.pass).toBe(false);
    expect(a.detail).toMatch(/no hard_stop observed/);
  });

  it("hard_stop_trigger fails when not deliberate but hard_stop fires", () => {
    const observed = calmObserved(12);
    observed[7].hard_stop = true;
    const result = CAMInHostAssertionBundleEngine.evaluate({
      observed,
      stats: calmStats(12),
      expectations: calmExpectations(12),
    });
    expect(CAMInHostAssertionBundleEngine.byName(result, "hard_stop_trigger").pass).toBe(false);
  });

  it("session_stats_reconcile fails when delivered+queued+dropped+unknown != frames_in", () => {
    const result = CAMInHostAssertionBundleEngine.evaluate({
      observed: calmObserved(12),
      stats: { frames_in: 12, frames_delivered: 10, frames_queued: 0, frames_dropped: 0, frames_unknown_target: 0 },
      expectations: calmExpectations(12),
    });
    expect(CAMInHostAssertionBundleEngine.byName(result, "session_stats_reconcile").pass).toBe(false);
  });

  it("encoder_schema fails when any payload_valid is false", () => {
    const observed = calmObserved(12);
    observed[3].payload_valid = false;
    const result = CAMInHostAssertionBundleEngine.evaluate({
      observed,
      stats: calmStats(12),
      expectations: calmExpectations(12),
    });
    const a = CAMInHostAssertionBundleEngine.byName(result, "encoder_schema");
    expect(a.pass).toBe(false);
    expect(a.metric?.invalid).toBe(1);
  });

  it("reconnect_drain fails when frames_dropped > 0", () => {
    const result = CAMInHostAssertionBundleEngine.evaluate({
      observed: calmObserved(12),
      stats: { frames_in: 12, frames_delivered: 10, frames_queued: 0, frames_dropped: 2, frames_unknown_target: 0 },
      expectations: calmExpectations(12),
    });
    expect(CAMInHostAssertionBundleEngine.byName(result, "reconnect_drain").pass).toBe(false);
  });
});

// ── 3. hard_stop_trigger 4-way matrix ──────────────────────────────────────

describe("CAMInHostAssertionBundleEngine — hard_stop_trigger matrix", () => {
  function buildHardStop(deliberate: boolean, hsAtSeq: number | null, redAtSeq: number | null): EvaluateInput {
    const observed = calmObserved(12);
    if (redAtSeq !== null) observed[redAtSeq].band = 2;
    if (hsAtSeq !== null) observed[hsAtSeq].hard_stop = true;
    return {
      observed,
      stats: calmStats(12),
      expectations: { ...calmExpectations(12), deliberate_hard_stop: deliberate, expected_band_transitions: redAtSeq !== null ? 1 : 0 },
    };
  }

  it("deliberate + hard_stop within budget = pass", () => {
    // red band at 4, hard_stop at 6 = distance 2 ≤ 3 (budget)
    const result = CAMInHostAssertionBundleEngine.evaluate(buildHardStop(true, 6, 4));
    expect(CAMInHostAssertionBundleEngine.byName(result, "hard_stop_trigger").pass).toBe(true);
  });

  it("deliberate + hard_stop exceeds budget = fail", () => {
    // red band at 2, hard_stop at 8 = distance 6 > 3 (budget)
    const result = CAMInHostAssertionBundleEngine.evaluate(buildHardStop(true, 8, 2));
    expect(CAMInHostAssertionBundleEngine.byName(result, "hard_stop_trigger").pass).toBe(false);
  });

  it("not deliberate + no hard_stop = pass", () => {
    const result = CAMInHostAssertionBundleEngine.evaluate(buildHardStop(false, null, null));
    expect(CAMInHostAssertionBundleEngine.byName(result, "hard_stop_trigger").pass).toBe(true);
  });

  it("not deliberate + observed hard_stop = fail", () => {
    const result = CAMInHostAssertionBundleEngine.evaluate(buildHardStop(false, 5, null));
    expect(CAMInHostAssertionBundleEngine.byName(result, "hard_stop_trigger").pass).toBe(false);
  });

  it("custom hard_stop_budget_frames overrides the default", () => {
    // Distance 6, default budget 3 → fail; custom budget 6 → pass.
    const inp = buildHardStop(true, 8, 2);
    const r1 = CAMInHostAssertionBundleEngine.evaluate({ ...inp });
    expect(CAMInHostAssertionBundleEngine.byName(r1, "hard_stop_trigger").pass).toBe(false);
    const r2 = CAMInHostAssertionBundleEngine.evaluate({ ...inp, hard_stop_budget_frames: 6 });
    expect(CAMInHostAssertionBundleEngine.byName(r2, "hard_stop_trigger").pass).toBe(true);
  });
});

// ── 4. Pure helpers ────────────────────────────────────────────────────────

describe("CAMInHostAssertionBundleEngine — pure helpers", () => {
  it("p99 returns 0 on empty array", () => {
    expect(p99([])).toBe(0);
  });

  it("p99 returns the only element on singleton", () => {
    expect(p99([42])).toBe(42);
  });

  it("p99 nearest-rank on 100 sorted values returns the 99th element (1-indexed)", () => {
    const arr = Array.from({ length: 100 }, (_, i) => i + 1); // 1..100
    expect(p99(arr)).toBe(99);
  });

  it("countBandTransitions returns 0 on a single frame", () => {
    expect(countBandTransitions([{ seq: 0, latency_ms: 0, hard_stop: false, band: 0, payload_valid: true }])).toBe(0);
  });

  it("countBandTransitions counts 0→nonzero and nonzero→0 transitions only", () => {
    const obs: ObservedFrame[] = [
      { seq: 0, latency_ms: 0, hard_stop: false, band: 0, payload_valid: true },
      { seq: 1, latency_ms: 0, hard_stop: false, band: 1, payload_valid: true },
      { seq: 2, latency_ms: 0, hard_stop: false, band: 2, payload_valid: true }, // 1→2 NOT a transition (both nonzero)
      { seq: 3, latency_ms: 0, hard_stop: false, band: 0, payload_valid: true }, // 2→0 IS a transition
    ];
    expect(countBandTransitions(obs)).toBe(2);
  });

  it("firstHardStopSeq returns null when none observed", () => {
    expect(firstHardStopSeq(calmObserved(5))).toBeNull();
  });

  it("firstHardStopSeq returns the lowest seq with hard_stop=true", () => {
    const obs = calmObserved(10);
    obs[7].hard_stop = true;
    obs[3].hard_stop = true;
    expect(firstHardStopSeq(obs)).toBe(3);
  });

  it("seqGaps detects missing seq numbers in the observed range", () => {
    const obs: ObservedFrame[] = [
      { seq: 0, latency_ms: 0, hard_stop: false, band: 0, payload_valid: true },
      { seq: 2, latency_ms: 0, hard_stop: false, band: 0, payload_valid: true },
      { seq: 5, latency_ms: 0, hard_stop: false, band: 0, payload_valid: true },
    ];
    const g = seqGaps(obs);
    expect(g.missing).toEqual([1, 3, 4]);
    expect(g.duplicate).toEqual([]);
  });

  it("seqGaps detects duplicate seq numbers", () => {
    const obs: ObservedFrame[] = [
      { seq: 0, latency_ms: 0, hard_stop: false, band: 0, payload_valid: true },
      { seq: 1, latency_ms: 0, hard_stop: false, band: 0, payload_valid: true },
      { seq: 1, latency_ms: 0, hard_stop: false, band: 0, payload_valid: true },
    ];
    const g = seqGaps(obs);
    expect(g.duplicate).toEqual([1]);
  });
});

// ── 5. Schema validation (failure modes + adversarial) ────────────────────

describe("CAMInHostAssertionBundleEngine — schema validation", () => {
  it("ObservedFrameSchema rejects negative seq", () => {
    expect(() => ObservedFrameSchema.parse({ seq: -1, latency_ms: 0 })).toThrow();
  });

  it("ObservedFrameSchema rejects band 3 (out of [0..2] range)", () => {
    expect(() => ObservedFrameSchema.parse({ seq: 0, latency_ms: 0, band: 3 })).toThrow();
  });

  it("ObservedFrameSchema rejects negative latency (adversarial)", () => {
    expect(() => ObservedFrameSchema.parse({ seq: 0, latency_ms: -1 })).toThrow();
  });

  it("SessionStatsSchema rejects negative frames_dropped", () => {
    expect(() => SessionStatsSchema.parse({
      frames_in: 12, frames_delivered: 10, frames_queued: 0, frames_dropped: -1, frames_unknown_target: 0,
    })).toThrow();
  });

  it("ScenarioExpectationsSchema rejects expected_frame_count = 0", () => {
    expect(() => ScenarioExpectationsSchema.parse({
      expected_frame_count: 0, expected_band_transitions: 0, deliberate_hard_stop: false, latency_p99_budget_ms: 100,
    })).toThrow();
  });

  it("ScenarioExpectationsSchema rejects negative latency budget", () => {
    expect(() => ScenarioExpectationsSchema.parse({
      expected_frame_count: 12, expected_band_transitions: 0, deliberate_hard_stop: false, latency_p99_budget_ms: -1,
    })).toThrow();
  });

  it("AssertionNameSchema rejects unknown family", () => {
    const bad: unknown = "tool_breakage";
    expect(() => AssertionNameSchema.parse(bad)).toThrow();
  });
});

// ── 6. Audit invariant ────────────────────────────────────────────────────

describe("CAMInHostAssertionBundleEngine — audit", () => {
  it("auditBundle passes on a clean bundle", () => {
    const result = evaluateCalm(12);
    const audit = CAMInHostAssertionBundleEngine.auditBundle(result);
    expect(audit.ok).toBe(true);
    expect(audit.errors).toEqual([]);
  });

  it("auditBundle flags missing assertion family", () => {
    const result = evaluateCalm(12);
    const tampered = { ...result, assertions: result.assertions.slice(0, 6) };
    const audit = CAMInHostAssertionBundleEngine.auditBundle(tampered);
    expect(audit.ok).toBe(false);
    expect(audit.errors.some(e => e.includes("expected 7"))).toBe(true);
  });

  it("auditBundle flags overall_pass mismatch", () => {
    const result = evaluateCalm(12);
    const tampered = { ...result, overall_pass: false };
    const audit = CAMInHostAssertionBundleEngine.auditBundle(tampered);
    expect(audit.ok).toBe(false);
    expect(audit.errors.some(e => e.includes("does not match"))).toBe(true);
  });

  it("BundleResultSchema parses a real bundle round-trip", () => {
    const result = evaluateCalm(12);
    expect(() => BundleResultSchema.parse(result)).not.toThrow();
  });
});

// ── 7. Filter helpers ─────────────────────────────────────────────────────

describe("CAMInHostAssertionBundleEngine — filter helpers", () => {
  it("failed() returns empty array when all pass", () => {
    expect(CAMInHostAssertionBundleEngine.failed(evaluateCalm(12))).toEqual([]);
  });

  it("failed() returns only the failing families", () => {
    const result = CAMInHostAssertionBundleEngine.evaluate({
      observed: calmObserved(8),
      stats: calmStats(8),
      expectations: calmExpectations(12),  // observed != expected ⇒ fail
    });
    const failed = CAMInHostAssertionBundleEngine.failed(result);
    expect(failed.length).toBe(1);
    expect(failed[0].name).toBe("frame_arrival");
  });

  it("byName throws if asked for a family that does not exist in the bundle", () => {
    const result = evaluateCalm(12);
    const tampered = { ...result, assertions: result.assertions.filter(a => a.name !== "latency_p99") };
    expect(() => CAMInHostAssertionBundleEngine.byName(tampered, "latency_p99")).toThrow(/missing family/);
  });
});

// ── 8. Dispatcher round-trip ─────────────────────────────────────────────

describe("U-CAMTEST14 — dispatcher round-trip (prism_cam)", () => {
  it("ACTIONS array exposes all assertion bundle actions", async () => {
    const mod = await import("../tools/dispatchers/camDispatcher.js");
    expect(mod.ACTIONS).toContain("cam_assertion_bundle_evaluate");
    expect(mod.ACTIONS).toContain("cam_assertion_bundle_failed");
    expect(mod.ACTIONS).toContain("cam_assertion_bundle_by_name");
    expect(mod.ACTIONS).toContain("cam_assertion_bundle_audit");
    expect(mod.ACTIONS).toContain("cam_assertion_bundle_families");
  });

  it("engine reachable via the same dynamic-import path the dispatcher uses", async () => {
    const mod = await import("../engines/CAMInHostAssertionBundleEngine.js");
    expect(mod.CAMInHostAssertionBundleEngine.ASSERTION_FAMILIES.length).toBe(7);
  });

  it("evaluation through engine returns 7-assertion bundle ready for dispatcher pipeline", async () => {
    const mod = await import("../engines/CAMInHostAssertionBundleEngine.js");
    const result = mod.CAMInHostAssertionBundleEngine.evaluate({
      observed: calmObserved(12),
      stats: calmStats(12),
      expectations: calmExpectations(12),
    });
    expect(result.assertions.length).toBe(7);
    expect(result.overall_pass).toBe(true);
  });
});
