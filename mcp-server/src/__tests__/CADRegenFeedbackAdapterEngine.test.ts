/**
 * CADRegenFeedbackAdapterEngine — vitest suite (CAD-DRAW-MAX-MS0/P0-U03).
 *
 * Verifies regen-test result → OutcomeOverlay translation. Stub publisher
 * captures the exact overlay shape attached to each publish. Asserts the
 * three failure modes from the engine docstring: missing `passed` falls
 * back to per-metric derivation; missing both leaves regenerationOk OFF
 * the overlay (no false-coercion); R12 fail-loud on bad inputs.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { CADRegenFeedbackAdapterEngine, type RegenResultLike } from "../engines/CADRegenFeedbackAdapterEngine.js";
import type { OutcomeOverlay } from "../engines/HyperCADSOutcomePublisherEngine.js";
import type { LiveOpResult } from "../engines/HyperCADSLiveBridgeEngine.js";
import type { PublishResult } from "../engines/CADExecutionOutcomeBusEngine.js";

function stubPublisher() {
  const calls: Array<{ result: LiveOpResult; overlay: OutcomeOverlay }> = [];
  return {
    calls,
    publishLiveResult(result: LiveOpResult, overlay: OutcomeOverlay = {}): PublishResult {
      calls.push({ result, overlay: { ...overlay } });
      return { published: true, lineageId: `lin-${calls.length}`, timestamp: "t", subscribersNotified: 0, handlerErrors: 0, busOk: true };
    },
  };
}

function liveOk(): LiveOpResult {
  return { ok: true, opId: "op-1", scriptText: "stub", durationMs: 5, warnings: [], sessionOpCount: 1 };
}

describe("CADRegenFeedbackAdapterEngine — P0-U03", () => {
  let pub: ReturnType<typeof stubPublisher>;
  let eng: CADRegenFeedbackAdapterEngine;
  beforeEach(() => {
    pub = stubPublisher();
    eng = new CADRegenFeedbackAdapterEngine(pub as never);
  });

  it("regen.passed=true → overlay.regenerationOk=true", () => {
    eng.publishWithRegen(liveOk(), { passed: true });
    expect(pub.calls[0].overlay.regenerationOk).toBe(true);
    expect(eng.getStats().totalDerivedFromPassed).toBe(1);
  });

  it("regen.passed=false → overlay.regenerationOk=false (NEGATIVE signal must survive)", () => {
    eng.publishWithRegen(liveOk(), { passed: false });
    expect(pub.calls[0].overlay.regenerationOk).toBe(false);
  });

  it("no `passed`, metrics all passed → derives regenerationOk=true via metric AND", () => {
    const regen: RegenResultLike = { metrics: { volume: { passed: true }, bbox: { passed: true } } };
    eng.publishWithRegen(liveOk(), regen);
    expect(pub.calls[0].overlay.regenerationOk).toBe(true);
    expect(eng.getStats().totalDerivedFromMetrics).toBe(1);
    expect(eng.getStats().totalDerivedFromPassed).toBe(0);
  });

  it("no `passed`, one metric failed → derives regenerationOk=false", () => {
    const regen: RegenResultLike = { metrics: { volume: { passed: true }, bbox: { passed: false } } };
    eng.publishWithRegen(liveOk(), regen);
    expect(pub.calls[0].overlay.regenerationOk).toBe(false);
  });

  it("no `passed`, empty metrics → no regen signal in overlay (R12: never coerce to false)", () => {
    eng.publishWithRegen(liveOk(), { metrics: {} });
    expect("regenerationOk" in pub.calls[0].overlay).toBe(false);
    expect(eng.getStats().totalNoSignal).toBe(1);
  });

  it("no `passed`, no metrics → no regen signal in overlay (R12 fail-loud at LP04, not here)", () => {
    eng.publishWithRegen(liveOk(), {});
    expect("regenerationOk" in pub.calls[0].overlay).toBe(false);
    expect(eng.getStats().totalNoSignal).toBe(1);
  });

  it("metrics with only undefined `passed` fields → no signal (defensive: missing != failed)", () => {
    const regen: RegenResultLike = { metrics: { volume: {}, bbox: {} } };
    eng.publishWithRegen(liveOk(), regen);
    expect("regenerationOk" in pub.calls[0].overlay).toBe(false);
  });

  it("extraOverlay propagates (lineageId / collision) alongside regen-derived field", () => {
    eng.publishWithRegen(liveOk(), { passed: true }, { extraOverlay: { lineageId: "lin-abc", collision: false } });
    expect(pub.calls[0].overlay.regenerationOk).toBe(true);
    expect(pub.calls[0].overlay.lineageId).toBe("lin-abc");
    expect(pub.calls[0].overlay.collision).toBe(false);
  });

  it("deriveCollisionFromTopology=true + topologyFailed=true → overlay.collision=true", () => {
    eng.publishWithRegen(liveOk(), { passed: true, topologyFailed: true }, { deriveCollisionFromTopology: true });
    expect(pub.calls[0].overlay.collision).toBe(true);
    expect(eng.getStats().totalCollisionDerived).toBe(1);
  });

  it("deriveCollisionFromTopology=true + topologyFailed=false → overlay.collision=false", () => {
    eng.publishWithRegen(liveOk(), { passed: true, topologyFailed: false }, { deriveCollisionFromTopology: true });
    expect(pub.calls[0].overlay.collision).toBe(false);
  });

  it("deriveCollisionFromTopology=true + topologyFailed missing → overlay collision NOT set", () => {
    eng.publishWithRegen(liveOk(), { passed: true }, { deriveCollisionFromTopology: true });
    expect("collision" in pub.calls[0].overlay).toBe(false);
  });

  it("deriveCollisionFromTopology default off → topologyFailed=true does NOT touch collision", () => {
    eng.publishWithRegen(liveOk(), { passed: true, topologyFailed: true });
    expect("collision" in pub.calls[0].overlay).toBe(false);
    expect(eng.getStats().totalCollisionDerived).toBe(0);
  });

  it("`passed` wins over metric-AND when BOTH present (passed is authoritative)", () => {
    const regen: RegenResultLike = { passed: true, metrics: { volume: { passed: false } } };
    eng.publishWithRegen(liveOk(), regen);
    expect(pub.calls[0].overlay.regenerationOk).toBe(true);
    expect(eng.getStats().totalDerivedFromPassed).toBe(1);
    expect(eng.getStats().totalDerivedFromMetrics).toBe(0);
  });

  it("R12 fail-loud: null result throws TypeError, no publish recorded", () => {
    expect(() => eng.publishWithRegen(null as never, { passed: true })).toThrow(TypeError);
    expect(pub.calls).toHaveLength(0);
  });

  it("R12 fail-loud: null regen throws TypeError, no publish recorded", () => {
    expect(() => eng.publishWithRegen(liveOk(), null as never)).toThrow(TypeError);
    expect(pub.calls).toHaveLength(0);
  });

  it("getStats tracks all 4 buckets across mixed inputs", () => {
    eng.publishWithRegen(liveOk(), { passed: true });
    eng.publishWithRegen(liveOk(), { metrics: { v: { passed: true } } });
    eng.publishWithRegen(liveOk(), {});
    eng.publishWithRegen(liveOk(), { passed: false, topologyFailed: true }, { deriveCollisionFromTopology: true });
    const s = eng.getStats();
    expect(s.totalCalls).toBe(4);
    expect(s.totalDerivedFromPassed).toBe(2);
    expect(s.totalDerivedFromMetrics).toBe(1);
    expect(s.totalNoSignal).toBe(1);
    expect(s.totalCollisionDerived).toBe(1);
  });
});
