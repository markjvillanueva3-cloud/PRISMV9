/**
 * OutcomeRLBridgeEngine — XPROC-NEURAL-CONNECT-MS0 / U-CN12
 *
 * Verifies the RL fan-out bridge: pure discretisation helpers, the live
 * `outcome.completed` subscription, the synchronous handler seam, failure
 * isolation across the three RL kernels, adversarial inputs, 3-process
 * variability, replay-from-store, the dispatch wrapper, and the
 * XProcNeuralAutoFireEngine integration (6th component).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  OutcomeRLBridgeEngine,
  outcomeRLBridgeDispatch,
  discretizeState,
  discretizeAction,
  buildShaperEvent,
  computeReward,
  coerceFinite,
} from "../engines/OutcomeRLBridgeEngine.js";
import { CrossProcessQLearningTabularEngine } from "../engines/CrossProcessQLearningTabularEngine.js";
import { CrossProcessPolicyGradientEngine } from "../engines/CrossProcessPolicyGradientEngine.js";
import { CrossProcessMultiArmedBanditEngine } from "../engines/CrossProcessMultiArmedBanditEngine.js";
import { crossProcessOutcomeStore } from "../engines/CrossProcessOutcomeStore.js";
import { feedbackBusEngine } from "../engines/FeedbackBusEngine.js";
import { executeAIReasoningAction } from "../tools/dispatchers/aiReasoningDispatcher.js";

// ──────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────

/** Drain the FeedbackBusEngine's queueMicrotask delivery. */
const flush = async (): Promise<void> => {
  for (let i = 0; i < 4; i++) await Promise.resolve();
};

const ACTION_SPACE = OutcomeRLBridgeEngine.constants().ACTION_SPACE; // 25
const STATE_KEY_MAX = OutcomeRLBridgeEngine.constants().STATE_KEY_MAX; // 240
const ARM_NAME_MAX = OutcomeRLBridgeEngine.constants().ARM_NAME_MAX; // 120

interface MakeRecordOpts {
  id?: string;
  process?: "mill" | "lathe" | "wedm";
  kind?: "success" | "failure" | "operator_override" | "pending";
  failure_mode?: string;
  material?: string;
  operation?: string;
  tool_material?: string;
  tool_diameter_mm?: number;
  depth_of_cut_mm?: number;
  cutting_speed_m_min?: number;
  spindle_rpm?: number;
  feed_rate_mm_min?: number;
  target_ra_um?: number;
  actual_metrics?: Record<string, number>;
  predicted_metrics?: Record<string, number>;
}

let recCounter = 0;
function makeRecord(o: MakeRecordOpts = {}): Record<string, unknown> {
  recCounter += 1;
  const kind = o.kind ?? "success";
  return {
    schemaVersion: "1.0",
    id: o.id ?? `rec-${recCounter}-${Math.random().toString(36).slice(2, 8)}`,
    ts: new Date().toISOString(),
    bridge: "sf",
    process: o.process ?? "mill",
    request_summary: {
      material: o.material ?? "4140",
      operation: o.operation ?? "rough",
      ...(o.tool_material !== undefined ? { tool_material: o.tool_material } : {}),
      ...(o.tool_diameter_mm !== undefined ? { tool_diameter_mm: o.tool_diameter_mm } : {}),
      ...(o.depth_of_cut_mm !== undefined ? { depth_of_cut_mm: o.depth_of_cut_mm } : {}),
      ...(o.cutting_speed_m_min !== undefined ? { cutting_speed_m_min: o.cutting_speed_m_min } : {}),
      ...(o.spindle_rpm !== undefined ? { spindle_rpm: o.spindle_rpm } : {}),
      ...(o.feed_rate_mm_min !== undefined ? { feed_rate_mm_min: o.feed_rate_mm_min } : {}),
      ...(o.target_ra_um !== undefined ? { target_ra_um: o.target_ra_um } : {}),
    },
    response_summary: { metrics: o.predicted_metrics ?? {} },
    outcome: {
      kind,
      ...(o.failure_mode !== undefined ? { failure_mode: o.failure_mode } : {}),
      ...(o.actual_metrics !== undefined ? { actual_metrics: o.actual_metrics } : {}),
    },
  };
}

/** Wrap a record in the envelope CrossProcessOutcomeStore.recordOutcome publishes on `outcome.completed`. */
function busEnvelope(record: Record<string, unknown>): Record<string, unknown> {
  const o = record.outcome as { kind?: string } | undefined;
  return {
    id: record.id,
    bridge: record.bridge,
    process: record.process,
    previousKind: "pending",
    outcomeKind: o?.kind ?? "pending",
    record,
  };
}

function hardReset(): void {
  if (OutcomeRLBridgeEngine.isSubscribedToOutcomes()) OutcomeRLBridgeEngine.unsubscribeFromOutcomes();
  OutcomeRLBridgeEngine.reset();
  CrossProcessQLearningTabularEngine.reset();
  CrossProcessPolicyGradientEngine.reset();
  CrossProcessMultiArmedBanditEngine.reset();
  crossProcessOutcomeStore.clear();
  feedbackBusEngine.reset();
}

beforeEach(() => {
  hardReset();
});

afterEach(() => {
  vi.restoreAllMocks();
  hardReset();
});

// ──────────────────────────────────────────────────────────────────────────
// Pure helpers
// ──────────────────────────────────────────────────────────────────────────

describe("OutcomeRLBridgeEngine — pure helpers", () => {
  it("coerceFinite returns the number for finite inputs and rejects NaN/Infinity/non-numbers", () => {
    expect(coerceFinite(3.2)).toBe(3.2);
    expect(coerceFinite(0)).toBe(0);
    expect(coerceFinite(-7)).toBe(-7);
    const rejected = [NaN, Infinity, -Infinity, "5", null, undefined, {}, [3]].map((v) => coerceFinite(v));
    expect(rejected).toEqual([undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined]);
    expect(rejected.every((v) => v === undefined)).toBe(true);
  });

  it("discretizeState builds a deterministic, bounded, delimiter-safe key", () => {
    const rec = makeRecord({ process: "mill", material: "Ti-6Al-4V", operation: "finish", tool_material: "carbide", tool_diameter_mm: 8, depth_of_cut_mm: 1.5 });
    const k1 = discretizeState(rec as never);
    const k2 = discretizeState(rec as never);
    expect(k1).toBe(k2);
    expect(k1).toBe("mill|Ti-6Al-4V|finish|tm:carbide|td2|dc2"); // 8mm→td2 (edges 3,6,12,20); 1.5mm→dc2 (edges 0.5,1,2,4)
    expect(k1.length).toBeLessThanOrEqual(STATE_KEY_MAX);
  });

  it("discretizeState clips an oversize material and a pipe-laden field", () => {
    const k = discretizeState(makeRecord({ material: "X".repeat(5000), operation: "a|b|c|d" }) as never);
    expect(k.length).toBeLessThanOrEqual(STATE_KEY_MAX);
    expect(k).toContain("a/b/c/d"); // pipes replaced with "/" so the field can't bleed into others
  });

  it("discretizeState maps missing categoricals to '?' and missing numerics to bin 0", () => {
    const rec: Record<string, unknown> = { process: "lathe", request_summary: {}, response_summary: {}, outcome: { kind: "success" } };
    expect(discretizeState(rec as never)).toBe("lathe|?|?|tm:?|td0|dc0");
  });

  it("discretizeAction maps speed×feed onto the grid; missing params → mid tier", () => {
    // cutting_speed 120 m/min → bin 2 (edges 50,100,200,400); feed 200 mm/min → bin 2 (edges 50,150,400,1000)
    const a = discretizeAction(makeRecord({ cutting_speed_m_min: 120, feed_rate_mm_min: 200 }) as never);
    expect(a.speedTier).toBe(2);
    expect(a.feedTier).toBe(2);
    expect(a.actionIndex).toBe(2 * 5 + 2); // 12
    expect(a.actionIndex).toBeLessThan(ACTION_SPACE);

    // missing both → mid tier (2,2) → 12
    const b = discretizeAction(makeRecord({}) as never);
    expect(b.actionIndex).toBe(12);
    expect(b.speedTier).toBe(2);
    expect(b.feedTier).toBe(2);

    // extremes pin to the corner cells
    expect(discretizeAction(makeRecord({ cutting_speed_m_min: 9000, feed_rate_mm_min: 9000 }) as never).actionIndex).toBe(24);
    expect(discretizeAction(makeRecord({ cutting_speed_m_min: 10, feed_rate_mm_min: 10 }) as never).actionIndex).toBe(0);
  });

  it("discretizeAction derives cutting speed from rpm + diameter when the explicit field is absent", () => {
    // v = π·d·n/1000 = π·10·3500/1000 ≈ 109.96 m/min → bin 2
    expect(discretizeAction(makeRecord({ spindle_rpm: 3500, tool_diameter_mm: 10 }) as never).speedTier).toBe(2);
  });

  it("discretizeAction clips a long arm id to the bandit name limit", () => {
    const a = discretizeAction(makeRecord({ process: "mill", operation: "Z".repeat(400) }) as never);
    expect(a.armId.length).toBeLessThanOrEqual(ARM_NAME_MAX);
  });

  it("buildShaperEvent extracts metrics and infers safety/override counts", () => {
    const ev = buildShaperEvent(makeRecord({
      kind: "failure",
      failure_mode: "tool collision detected",
      target_ra_um: 0.8,
      actual_metrics: { ra_um: 1.6, tool_life_min: 22, cycle_time_s: 95 },
      predicted_metrics: { tool_life_min: 40, cycle_time_s: 80 },
    }) as never);
    expect(ev).toEqual({
      raActualMicrometers: 1.6,
      raTargetMicrometers: 0.8,
      toolLifeActualMin: 22,
      toolLifePredictedMin: 40,
      cycleTimeActualS: 95,
      cycleTimePredictedS: 80,
      safetyVetoCount: 1, // "collision" matched in failure_mode
      operatorOverrideCount: 0,
    });
  });

  it("buildShaperEvent infers operatorOverrideCount=1 for an operator_override outcome", () => {
    expect(buildShaperEvent(makeRecord({ kind: "operator_override" }) as never)).toEqual({ safetyVetoCount: 0, operatorOverrideCount: 1 });
  });

  it("buildShaperEvent drops non-finite metrics and a negative cycle time, keeping only the count fields", () => {
    // NaN/Inf → coerceFinite undefined; cycle_time -3 fails the cycleTimeActualS ≥ 0 guard; a clean
    // success has zero inferred safety/override counts → the event is exactly the two count fields.
    expect(buildShaperEvent(makeRecord({ kind: "success", actual_metrics: { ra_um: NaN, tool_life_min: Infinity, cycle_time_s: -3 } }) as never))
      .toEqual({ safetyVetoCount: 0, operatorOverrideCount: 0 });
  });

  it("computeReward = shaperReward + kindPrior; toggling the prior removes the offset", () => {
    // No metrics → shaperReward 0; success prior +0.5.
    const withPrior = computeReward(makeRecord({ kind: "success" }) as never, true);
    expect(withPrior.shaperReward).toBe(0);
    expect(withPrior.kindPrior).toBe(0.5);
    expect(withPrior.reward).toBe(0.5);
    expect(withPrior.source).toBe("shaper+kind_prior");

    const noPrior = computeReward(makeRecord({ kind: "success" }) as never, false);
    expect(noPrior.kindPrior).toBe(0);
    expect(noPrior.reward).toBe(0);
    expect(noPrior.source).toBe("shaper");

    // failure prior is -1.0, override prior is -0.5
    const fail = computeReward(makeRecord({ kind: "failure" }) as never, true);
    expect(fail.kindPrior).toBe(-1.0);
    expect(fail.reward).toBeCloseTo(fail.shaperReward - 1.0, 9);
    expect(Number.isFinite(fail.reward)).toBe(true);
    expect(computeReward(makeRecord({ kind: "operator_override" }) as never, true).kindPrior).toBe(-0.5);
  });
});

// ──────────────────────────────────────────────────────────────────────────
// Subscription lifecycle + live bus path
// ──────────────────────────────────────────────────────────────────────────

describe("OutcomeRLBridgeEngine — subscription + live `outcome.completed` path", () => {
  it("subscribeToOutcomes is idempotent and reflected in stats/status", () => {
    expect(OutcomeRLBridgeEngine.isSubscribedToOutcomes()).toBe(false);
    expect(OutcomeRLBridgeEngine.subscribeToOutcomes()).toEqual({ ok: true, alreadySubscribed: false });
    expect(OutcomeRLBridgeEngine.isSubscribedToOutcomes()).toBe(true);
    expect(OutcomeRLBridgeEngine.subscribeToOutcomes()).toEqual({ ok: true, alreadySubscribed: true });
    expect(OutcomeRLBridgeEngine.stats().subscribed).toBe(true);
    expect(feedbackBusEngine.subscriberCount("outcome.completed")).toBe(1); // only one bus subscriber (idempotent)
    expect(OutcomeRLBridgeEngine.unsubscribeFromOutcomes()).toEqual({ ok: true, wasSubscribed: true });
    expect(OutcomeRLBridgeEngine.unsubscribeFromOutcomes()).toEqual({ ok: true, wasSubscribed: false });
    expect(feedbackBusEngine.subscriberCount("outcome.completed")).toBe(0);
  });

  it("a terminal `outcome.completed` event fans a (state, action, reward) tuple to all three RL kernels", async () => {
    OutcomeRLBridgeEngine.subscribeToOutcomes();
    const rec = makeRecord({ process: "mill", material: "4140", operation: "rough", cutting_speed_m_min: 120, feed_rate_mm_min: 300, kind: "success", actual_metrics: { ra_um: 0.6 } });
    feedbackBusEngine.publish("outcome.completed", busEnvelope(rec));
    await flush();

    const s = OutcomeRLBridgeEngine.stats();
    expect(s.total_events_seen).toBe(1);
    expect(s.total_processed).toBe(1);
    expect(s.total_skipped_pending).toBe(0);
    expect(s.total_skipped_bad_payload).toBe(0);
    expect(s.total_fanned).toEqual({ qlearn: 1, policy: 1, bandit: 1 });
    expect(s.failures).toEqual({ qlearn: 0, policy: 0, bandit: 0, decode: 0 });
    expect(s.last?.kind).toBe("success");
    expect(s.last?.process).toBe("mill");
    expect(s.last?.action).toBe(2 * 5 + 2); // speed 120→bin2, feed 300→bin2
    expect(s.last?.reward).toBeCloseTo((s.last?.shaperReward ?? NaN) + 0.5, 9);

    // Downstream engines actually received the tuple.
    const ql = CrossProcessQLearningTabularEngine.stats();
    expect(ql.numStates).toBe(1);
    expect(ql.numStateActionPairs).toBe(1);
    expect(CrossProcessQLearningTabularEngine.getQRow(s.last?.state ?? "", ACTION_SPACE)?.length).toBe(ACTION_SPACE);

    const bandit = CrossProcessMultiArmedBanditEngine.getStats();
    expect(bandit.totalPulls).toBe(1);
    expect(bandit.arms).toHaveLength(1);
    expect(bandit.arms[0].pulls).toBe(1);
    expect(bandit.arms[0].armId).toBe(s.last?.armId);

    const pg = CrossProcessPolicyGradientEngine.stats();
    expect(pg.numStates).toBe(1);
    expect(pg.numTrajectories).toBe(0); // committed → trajectory deleted
  });

  it("handleOutcomeRecord (test seam) processes a record directly and reports the fan-out", () => {
    const res = OutcomeRLBridgeEngine.handleOutcomeRecord(makeRecord({ kind: "success" }));
    expect(res.ok).toBe(true);
    expect(res.status).toBe("processed");
    expect(res.fanned).toEqual({ qlearn: true, policy: true, bandit: true });
    expect(res.failed).toEqual({ qlearn: false, policy: false, bandit: false });
    expect(res.tuple?.kind).toBe("success");
    expect(OutcomeRLBridgeEngine.stats().total_processed).toBe(1);
  });
});

// ──────────────────────────────────────────────────────────────────────────
// Failure modes
// ──────────────────────────────────────────────────────────────────────────

describe("OutcomeRLBridgeEngine — failure modes", () => {
  it("skips a bad payload (null, empty object, non-object record) without fanning out", () => {
    OutcomeRLBridgeEngine.__testHandle(null);
    OutcomeRLBridgeEngine.__testHandle({});
    OutcomeRLBridgeEngine.__testHandle({ record: 42 });
    OutcomeRLBridgeEngine.__testHandle({ record: "nope" });
    const s = OutcomeRLBridgeEngine.stats();
    expect(s.total_events_seen).toBe(4);
    expect(s.total_skipped_bad_payload).toBe(4);
    expect(s.total_processed).toBe(0);
    expect(s.total_fanned).toEqual({ qlearn: 0, policy: 0, bandit: 0 });
    expect(OutcomeRLBridgeEngine.handleOutcomeRecord(123).status).toBe("skipped_bad_payload");
  });

  it("skips a pending outcome (and a record with no outcome at all)", () => {
    OutcomeRLBridgeEngine.__testHandle(busEnvelope(makeRecord({ kind: "pending" })));
    const noOutcome: Record<string, unknown> = { id: "x", process: "mill", request_summary: {}, response_summary: {} };
    OutcomeRLBridgeEngine.__testHandle({ record: noOutcome });
    const s = OutcomeRLBridgeEngine.stats();
    expect(s.total_events_seen).toBe(2);
    expect(s.total_skipped_pending).toBe(2);
    expect(s.total_processed).toBe(0);
    expect(s.total_fanned).toEqual({ qlearn: 0, policy: 0, bandit: 0 });
  });

  it("isolates a downstream engine that throws — the other two kernels still receive the tuple", () => {
    const spy = vi.spyOn(CrossProcessQLearningTabularEngine, "update").mockImplementation(() => {
      throw new Error("q-table boom");
    });
    const res = OutcomeRLBridgeEngine.handleOutcomeRecord(makeRecord({ kind: "success" }));
    expect(res.status).toBe("processed");
    expect(res.fanned).toEqual({ qlearn: false, policy: true, bandit: true });
    expect(res.failed).toEqual({ qlearn: true, policy: false, bandit: false });
    const s = OutcomeRLBridgeEngine.stats();
    expect(s.failures.qlearn).toBe(1);
    expect(s.failures.policy).toBe(0);
    expect(s.failures.bandit).toBe(0);
    expect(s.total_fanned).toEqual({ qlearn: 0, policy: 1, bandit: 1 });
    expect(s.total_processed).toBe(1);
    spy.mockRestore();
  });

  it("isolates a downstream engine that returns {ok:false} (rejects rather than throws)", () => {
    const spy = vi.spyOn(CrossProcessMultiArmedBanditEngine, "update").mockReturnValue({
      ok: false,
      error: "unknown_arm",
      message: "simulated rejection",
    } as never);
    const res = OutcomeRLBridgeEngine.handleOutcomeRecord(makeRecord({ kind: "failure" }));
    expect(res.status).toBe("processed");
    expect(res.fanned).toEqual({ qlearn: true, policy: true, bandit: false });
    expect(res.failed.bandit).toBe(true);
    expect(OutcomeRLBridgeEngine.stats().failures.bandit).toBe(1);
    spy.mockRestore();
  });

  it("a thrown downstream error inside the live bus callback is contained (bus stays healthy, bridge keeps counting)", async () => {
    const spy = vi.spyOn(CrossProcessPolicyGradientEngine, "step").mockImplementation(() => {
      throw new Error("policy boom");
    });
    OutcomeRLBridgeEngine.subscribeToOutcomes();
    feedbackBusEngine.publish("outcome.completed", busEnvelope(makeRecord({ kind: "success" })));
    feedbackBusEngine.publish("outcome.completed", busEnvelope(makeRecord({ kind: "success" })));
    await flush();
    const s = OutcomeRLBridgeEngine.stats();
    expect(s.total_events_seen).toBe(2);
    expect(s.total_processed).toBe(2);
    expect(s.failures.policy).toBe(2);
    expect(s.failures.decode).toBe(0); // downstream throw is caught in processRecord, not the callback
    expect(s.total_fanned).toEqual({ qlearn: 2, policy: 0, bandit: 2 });
    spy.mockRestore();
  });
});

// ──────────────────────────────────────────────────────────────────────────
// Adversarial inputs
// ──────────────────────────────────────────────────────────────────────────

describe("OutcomeRLBridgeEngine — adversarial inputs", () => {
  it("NaN/Infinity/negative metric readings degrade gracefully — record still processed, reward finite", () => {
    const res = OutcomeRLBridgeEngine.handleOutcomeRecord(makeRecord({
      kind: "success",
      actual_metrics: { ra_um: NaN, tool_life_min: Infinity, cycle_time_s: -5, safety_veto_count: NaN },
      predicted_metrics: { tool_life_min: -Infinity, cycle_time_s: 0 },
    }));
    expect(res.status).toBe("processed");
    expect(res.fanned).toEqual({ qlearn: true, policy: true, bandit: true });
    expect(Number.isFinite(res.tuple?.reward)).toBe(true);
    expect(Number.isFinite(res.tuple?.shaperReward)).toBe(true);
    expect(res.tuple?.reward).toBe(0.5); // all metrics dropped → shaper 0, success prior +0.5
  });

  it("a multi-kilobyte state-key input is truncated below the Q-engine limit and still processed", () => {
    const res = OutcomeRLBridgeEngine.handleOutcomeRecord(makeRecord({ material: "M".repeat(8000), operation: "O".repeat(8000), kind: "success" }));
    expect(res.status).toBe("processed");
    expect(res.tuple?.state.length ?? Infinity).toBeLessThanOrEqual(STATE_KEY_MAX);
    expect(res.fanned.qlearn).toBe(true);
  });

  it("an enormous record.id is clipped before being used as the policy episodeId", () => {
    const res = OutcomeRLBridgeEngine.handleOutcomeRecord(makeRecord({ id: "e".repeat(2000), kind: "success" }));
    expect(res.status).toBe("processed");
    expect(res.fanned.policy).toBe(true); // would be rejected by the 128-char episodeId schema if not clipped
  });
});

// ──────────────────────────────────────────────────────────────────────────
// Variability — 3 processes spanning
// ──────────────────────────────────────────────────────────────────────────

describe("OutcomeRLBridgeEngine — process/outcome variability", () => {
  it("mill/success, lathe/failure, wedm/operator_override produce 3 distinct states with sign-correct rewards", () => {
    const r1 = OutcomeRLBridgeEngine.handleOutcomeRecord(makeRecord({ process: "mill", operation: "rough", kind: "success", actual_metrics: { ra_um: 0.5 }, target_ra_um: 0.8 }));
    const r2 = OutcomeRLBridgeEngine.handleOutcomeRecord(makeRecord({ process: "lathe", operation: "od_turn", kind: "failure", failure_mode: "insert breakage" }));
    const r3 = OutcomeRLBridgeEngine.handleOutcomeRecord(makeRecord({ process: "wedm", operation: "rough_cut", kind: "operator_override" }));

    expect(r1.status).toBe("processed");
    expect(r2.status).toBe("processed");
    expect(r3.status).toBe("processed");
    expect(new Set([r1.tuple?.state, r2.tuple?.state, r3.tuple?.state]).size).toBe(3);
    expect(r1.tuple?.reward).toBeGreaterThan(0); // success: shaper (Ra beat target) + 0.5
    expect(r2.tuple?.reward).toBeLessThan(0); // failure: shaper(≤0) − 1.0
    expect(r3.tuple?.reward).toBeLessThan(0); // override: shaper override penalty − 0.5

    const s = OutcomeRLBridgeEngine.stats();
    expect(s.total_processed).toBe(3);
    expect(s.total_fanned).toEqual({ qlearn: 3, policy: 3, bandit: 3 });
    expect(CrossProcessQLearningTabularEngine.stats().numStates).toBe(3);
    expect(CrossProcessMultiArmedBanditEngine.getStats().totalPulls).toBe(3);
  });
});

// ──────────────────────────────────────────────────────────────────────────
// Config
// ──────────────────────────────────────────────────────────────────────────

describe("OutcomeRLBridgeEngine — configure", () => {
  it("toggling applyKindPrior changes the realised reward; bad input is rejected", () => {
    expect(OutcomeRLBridgeEngine.configure({ applyKindPrior: false })).toEqual({ ok: true, config: { applyKindPrior: false } });
    const r1 = OutcomeRLBridgeEngine.handleOutcomeRecord(makeRecord({ kind: "success" })); // no metrics → 0
    expect(r1.tuple?.reward).toBe(0);
    expect(r1.tuple?.kindPrior).toBe(0);

    expect(OutcomeRLBridgeEngine.configure({ applyKindPrior: true })).toEqual({ ok: true, config: { applyKindPrior: true } });
    const r2 = OutcomeRLBridgeEngine.handleOutcomeRecord(makeRecord({ kind: "success" }));
    expect(r2.tuple?.reward).toBe(0.5);
    expect(r2.tuple?.kindPrior).toBe(0.5);

    const bad = OutcomeRLBridgeEngine.configure({ applyKindPrior: "yes" });
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.error).toBe("invalid_input");
  });

  it("reset() restores the default config and detaches the subscription", () => {
    OutcomeRLBridgeEngine.subscribeToOutcomes();
    OutcomeRLBridgeEngine.configure({ applyKindPrior: false });
    OutcomeRLBridgeEngine.handleOutcomeRecord(makeRecord({ kind: "success" }));
    OutcomeRLBridgeEngine.reset();
    const s = OutcomeRLBridgeEngine.stats();
    expect(s.subscribed).toBe(false);
    expect(s.config).toEqual({ applyKindPrior: true });
    expect(s.total_processed).toBe(0);
    expect(s.last).toBeNull();
  });
});

// ──────────────────────────────────────────────────────────────────────────
// Replay from store
// ──────────────────────────────────────────────────────────────────────────

describe("OutcomeRLBridgeEngine — replayFromStore", () => {
  it("re-processes recent terminal outcomes, skipping pending ones", () => {
    // Seed the singleton store directly with terminal records (these also publish `outcome.recorded`,
    // but the bridge is NOT subscribed here so nothing is double-counted).
    for (let i = 0; i < 5; i++) {
      crossProcessOutcomeStore.record({ bridge: "sf", process: "mill", request_summary: { material: `M${i}`, operation: "rough" }, response_summary: {}, outcome: { kind: "success" } });
    }
    crossProcessOutcomeStore.record({ bridge: "post", process: "lathe", request_summary: { material: "L1" }, response_summary: {}, outcome: { kind: "pending" } });

    const res = OutcomeRLBridgeEngine.replayFromStore({ limit: 50 });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.scanned).toBe(6);
      expect(res.replayed).toBe(5);
      expect(res.skipped).toBe(1);
      expect(res.fanned).toEqual({ qlearn: 5, policy: 5, bandit: 5 });
    }
    expect(CrossProcessQLearningTabularEngine.stats().numStates).toBe(5);
  });

  it("honours the process filter and rejects an invalid limit", () => {
    crossProcessOutcomeStore.record({ bridge: "sf", process: "mill", request_summary: { material: "A" }, response_summary: {}, outcome: { kind: "success" } });
    crossProcessOutcomeStore.record({ bridge: "sf", process: "lathe", request_summary: { material: "B" }, response_summary: {}, outcome: { kind: "success" } });
    const res = OutcomeRLBridgeEngine.replayFromStore({ process: "mill" });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.scanned).toBe(1);
      expect(res.replayed).toBe(1);
    }
    const bad = OutcomeRLBridgeEngine.replayFromStore({ limit: -1 });
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.error).toBe("invalid_input");
  });
});

// ──────────────────────────────────────────────────────────────────────────
// Dispatch wrapper
// ──────────────────────────────────────────────────────────────────────────

describe("OutcomeRLBridgeEngine — dispatch wrapper", () => {
  it("routes every xproc_rl_bridge_* action and throws on an unknown one", () => {
    expect(outcomeRLBridgeDispatch("xproc_rl_bridge_subscribe", {})).toEqual({ ok: true, alreadySubscribed: false });
    expect(outcomeRLBridgeDispatch("xproc_rl_bridge_status", {})).toEqual({ ok: true, subscribed: true });
    expect(outcomeRLBridgeDispatch("xproc_rl_bridge_configure", { applyKindPrior: false })).toEqual({ ok: true, config: { applyKindPrior: false } });

    const statsRes = outcomeRLBridgeDispatch("xproc_rl_bridge_stats", {}) as { ok: boolean; stats: { subscribed: boolean; config: { applyKindPrior: boolean } } };
    expect(statsRes.ok).toBe(true);
    expect(statsRes.stats.subscribed).toBe(true);
    expect(statsRes.stats.config).toEqual({ applyKindPrior: false });

    const replayRes = outcomeRLBridgeDispatch("xproc_rl_bridge_replay", {}) as { ok: boolean; scanned: number };
    expect(replayRes.ok).toBe(true);
    expect(replayRes.scanned).toBe(0);

    expect(outcomeRLBridgeDispatch("xproc_rl_bridge_unsubscribe", {})).toEqual({ ok: true, wasSubscribed: true });
    expect(outcomeRLBridgeDispatch("xproc_rl_bridge_reset", {})).toEqual({ ok: true });
    expect(() => outcomeRLBridgeDispatch("xproc_rl_bridge_bogus", {})).toThrow(/unknown action/);
  });
});

// ──────────────────────────────────────────────────────────────────────────
// prism_ai dispatcher round-trip (route + schema + switch all wired)
// ──────────────────────────────────────────────────────────────────────────

describe("OutcomeRLBridgeEngine — prism_ai dispatcher round-trip", () => {
  it("every xproc_rl_bridge_* action is reachable through executeAIReasoningAction (route + Zod schema + switch case)", async () => {
    const sub = await executeAIReasoningAction("xproc_rl_bridge_subscribe", {});
    expect(sub.success).toBe(true);
    expect(sub.data).toEqual({ ok: true, alreadySubscribed: false });
    expect(OutcomeRLBridgeEngine.isSubscribedToOutcomes()).toBe(true);

    const status = await executeAIReasoningAction("xproc_rl_bridge_status", {});
    expect(status.success).toBe(true);
    expect(status.data).toEqual({ ok: true, subscribed: true });

    const cfg = await executeAIReasoningAction("xproc_rl_bridge_configure", { applyKindPrior: false });
    expect(cfg.success).toBe(true);
    expect(cfg.data).toEqual({ ok: true, config: { applyKindPrior: false } });

    // The dispatcher's strict Zod schema rejects a wrong-typed param before the engine is even called.
    const badType = await executeAIReasoningAction("xproc_rl_bridge_configure", { applyKindPrior: "nope" });
    expect(badType.success).toBe(false);

    const replay = await executeAIReasoningAction("xproc_rl_bridge_replay", { limit: 5 });
    expect(replay.success).toBe(true);
    expect((replay.data as { ok: boolean; scanned: number }).ok).toBe(true);
    expect((replay.data as { ok: boolean; scanned: number }).scanned).toBe(0);

    const stats = await executeAIReasoningAction("xproc_rl_bridge_stats", {});
    expect(stats.success).toBe(true);
    expect((stats.data as { ok: boolean; stats: { subscribed: boolean; config: { applyKindPrior: boolean } } }).stats.config).toEqual({ applyKindPrior: false });

    const unsub = await executeAIReasoningAction("xproc_rl_bridge_unsubscribe", {});
    expect(unsub.success).toBe(true);
    expect(unsub.data).toEqual({ ok: true, wasSubscribed: true });

    const reset = await executeAIReasoningAction("xproc_rl_bridge_reset", {});
    expect(reset.success).toBe(true);
    expect(reset.data).toEqual({ ok: true });
    expect(OutcomeRLBridgeEngine.isSubscribedToOutcomes()).toBe(false);
  });

  it("a real outcome routed through the dispatcher-activated bridge reaches the Q-learner", async () => {
    await executeAIReasoningAction("xproc_rl_bridge_subscribe", {});
    feedbackBusEngine.publish("outcome.completed", busEnvelope(makeRecord({ kind: "success", cutting_speed_m_min: 250, feed_rate_mm_min: 600 })));
    await flush();
    const stats = await executeAIReasoningAction("xproc_rl_bridge_stats", {});
    expect((stats.data as { stats: { total_processed: number; total_fanned: { qlearn: number } } }).stats.total_processed).toBe(1);
    expect((stats.data as { stats: { total_fanned: { qlearn: number } } }).stats.total_fanned.qlearn).toBe(1);
    expect(CrossProcessQLearningTabularEngine.stats().numStates).toBe(1);
    await executeAIReasoningAction("xproc_rl_bridge_reset", {});
  });
});

// ──────────────────────────────────────────────────────────────────────────
// XProcNeuralAutoFireEngine integration (6th component)
// ──────────────────────────────────────────────────────────────────────────

describe("OutcomeRLBridgeEngine — XProcNeuralAutoFireEngine integration", () => {
  it("activate() turns the RL bridge on as the 6th component; deactivate() turns it off", async () => {
    const { XProcNeuralAutoFireEngine } = await import("../engines/XProcNeuralAutoFireEngine.js");
    const { crossProcessNeuralLearningEngine } = await import("../engines/CrossProcessNeuralLearningEngine.js");
    const { TribalKnowledgeOutcomeBridgeEngine } = await import("../engines/TribalKnowledgeOutcomeBridgeEngine.js");
    const { OutcomeDriftCalibrationBridgeEngine } = await import("../engines/OutcomeDriftCalibrationBridgeEngine.js");
    const { OutcomeReplayBufferBridgeEngine } = await import("../engines/OutcomeReplayBufferBridgeEngine.js");
    const { OutcomeEpisodicMemoryBridgeEngine } = await import("../engines/OutcomeEpisodicMemoryBridgeEngine.js");

    const resetClosedLoop = (): void => {
      try { if (crossProcessNeuralLearningEngine.autoTrainStatus().active) crossProcessNeuralLearningEngine.disableAutoTrain(); } catch { /* ignore */ }
      TribalKnowledgeOutcomeBridgeEngine.reset();
      OutcomeDriftCalibrationBridgeEngine.reset();
      OutcomeReplayBufferBridgeEngine.reset();
      OutcomeEpisodicMemoryBridgeEngine.reset();
      OutcomeRLBridgeEngine.reset();
      XProcNeuralAutoFireEngine.reset();
      feedbackBusEngine.reset();
    };

    resetClosedLoop();
    expect(OutcomeRLBridgeEngine.isSubscribedToOutcomes()).toBe(false);

    const r = XProcNeuralAutoFireEngine.activate();
    expect(r.ok).toBe(true);
    expect(r.alreadyActivated).toBe(false);
    expect(r.components.map((c) => c.key)).toContain("rl_bridge");
    expect(r.components.find((c) => c.key === "rl_bridge")).toEqual({ key: "rl_bridge", action: "enabled", ownedByAutoFire: true });
    expect(OutcomeRLBridgeEngine.isSubscribedToOutcomes()).toBe(true);
    expect(XProcNeuralAutoFireEngine.status().components.find((c) => c.key === "rl_bridge")).toEqual({ key: "rl_bridge", active: true, ownedByAutoFire: true });

    // A live outcome now flows through the RL bridge end-to-end.
    feedbackBusEngine.publish("outcome.completed", busEnvelope(makeRecord({ kind: "success", cutting_speed_m_min: 80, feed_rate_mm_min: 100 })));
    await flush();
    expect(OutcomeRLBridgeEngine.stats().total_processed).toBeGreaterThanOrEqual(1);

    const d = XProcNeuralAutoFireEngine.deactivate();
    expect(d.ok).toBe(true);
    expect(OutcomeRLBridgeEngine.isSubscribedToOutcomes()).toBe(false);

    resetClosedLoop(); // leave the closed loop clean for the next file
  });
});
