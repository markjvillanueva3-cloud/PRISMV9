/**
 * HyperCADSOutcomePublisherEngine — vitest suite (CAD-DRAW-MAX-MS0/P0-U02).
 *
 * Verifies LiveOpResult → CADExecutionOutcome translation, R12 fail-loud
 * on bad input, success/failure routing, overlay propagation, stats,
 * and the scriptResult convenience entry. Uses a stub bus to capture
 * the exact CADExecutionOutcome shape that hits publish().
 */

import { describe, it, expect, beforeEach } from "vitest";
import { HyperCADSOutcomePublisherEngine, HYPERCADS_ADAPTER_ID } from "../engines/HyperCADSOutcomePublisherEngine.js";
import type { CADExecutionOutcome, PublishResult } from "../engines/CADExecutionOutcomeBusEngine.js";
import type { LiveOpResult } from "../engines/HyperCADSLiveBridgeEngine.js";

function stubBus(opts: { busOk?: boolean; throwOnPublish?: boolean } = {}) {
  const calls: Array<CADExecutionOutcome> = [];
  return {
    calls,
    publish(outcome: CADExecutionOutcome): PublishResult {
      if (opts.throwOnPublish) throw new TypeError("stub: malformed outcome");
      calls.push({ ...outcome });
      return {
        published: true,
        lineageId: outcome.lineageId ?? `lin-${calls.length}`,
        timestamp: outcome.timestamp ?? new Date().toISOString(),
        subscribersNotified: 0,
        handlerErrors: 0,
        busOk: opts.busOk !== false,
        busWarning: opts.busOk === false ? "stub-warning" : undefined,
      };
    },
  };
}

function liveOk(opId = "op-1", durationMs = 5): LiveOpResult {
  return { ok: true, opId, scriptText: "stub", durationMs, warnings: [], sessionOpCount: 1 };
}
function liveFail(error = "boom"): LiveOpResult {
  return { ok: false, opId: "op-x", scriptText: "stub", durationMs: 2, warnings: [], error, sessionOpCount: 0 };
}

describe("HyperCADSOutcomePublisherEngine — P0-U02", () => {
  let engine: HyperCADSOutcomePublisherEngine;
  let bus: ReturnType<typeof stubBus>;
  beforeEach(() => {
    bus = stubBus();
    engine = new HyperCADSOutcomePublisherEngine(bus as never);
  });

  it("HYPERCADS_ADAPTER_ID is the canonical string 'hypercads' (cross-adapter invariant)", () => {
    expect(HYPERCADS_ADAPTER_ID).toBe("hypercads");
    expect(HYPERCADS_ADAPTER_ID.length).toBe(9);
  });

  it("emits adapterId='hypercads' on every outcome (single-adapter invariant)", () => {
    engine.publishLiveResult(liveOk());
    engine.publishLiveResult(liveFail());
    expect(bus.calls).toHaveLength(2);
    expect(bus.calls[0].adapterId).toBe("hypercads");
    expect(bus.calls[1].adapterId).toBe("hypercads");
  });

  it("happy path: ok=true → success=true, scriptId=opId, timingMs=durationMs, no errorMessage key", () => {
    engine.publishLiveResult(liveOk("op-42", 17));
    expect(bus.calls[0].scriptId).toBe("op-42");
    expect(bus.calls[0].success).toBe(true);
    expect(bus.calls[0].timingMs).toBe(17);
    expect("errorMessage" in bus.calls[0]).toBe(false);
  });

  it("failure path: ok=false propagates error string verbatim into errorMessage", () => {
    engine.publishLiveResult(liveFail("AC Python null ref"));
    expect(bus.calls[0].success).toBe(false);
    expect(bus.calls[0].errorMessage).toBe("AC Python null ref");
    expect(bus.calls[0].timingMs).toBe(2);
  });

  it("overlay collision=false / regenerationOk=true / lineageId='lin-deadbeef' all reach the bus", () => {
    engine.publishLiveResult(liveOk(), { collision: false, regenerationOk: true, lineageId: "lin-deadbeef" });
    expect(bus.calls[0].collision).toBe(false);
    expect(bus.calls[0].regenerationOk).toBe(true);
    expect(bus.calls[0].lineageId).toBe("lin-deadbeef");
  });

  it("missing overlay → outcome has NO collision/regenerationOk/lineageId keys (not just undefined)", () => {
    engine.publishLiveResult(liveOk());
    expect("collision" in bus.calls[0]).toBe(false);
    expect("regenerationOk" in bus.calls[0]).toBe(false);
    expect("lineageId" in bus.calls[0]).toBe(false);
  });

  it("negative durationMs clamps to exactly 0 (bus contract: timingMs ≥ 0)", () => {
    engine.publishLiveResult({ ...liveOk(), durationMs: -1 });
    expect(bus.calls[0].timingMs).toBe(0);
  });

  it("NaN durationMs → 0; +Infinity durationMs → 0 (R12 hostile-input handling)", () => {
    engine.publishLiveResult({ ...liveOk(), durationMs: Number.NaN });
    engine.publishLiveResult({ ...liveOk(), durationMs: Number.POSITIVE_INFINITY });
    expect(bus.calls[0].timingMs).toBe(0);
    expect(bus.calls[1].timingMs).toBe(0);
  });

  it("R12 fail-loud: null/undefined/string result throws TypeError + increments totalRejected", () => {
    expect(() => engine.publishLiveResult(null as never)).toThrow(TypeError);
    expect(() => engine.publishLiveResult(undefined as never)).toThrow(TypeError);
    expect(() => engine.publishLiveResult("not-an-object" as never)).toThrow(TypeError);
    const s = engine.getStats();
    expect(s.totalRejected).toBe(3);
    expect(s.totalAccepted).toBe(0);
    expect(bus.calls).toHaveLength(0);
  });

  it("publishScriptResult routes through the same translator with the supplied scriptId", () => {
    engine.publishScriptResult({ ok: true, durationMs: 33 }, "script-99");
    expect(bus.calls[0].adapterId).toBe("hypercads");
    expect(bus.calls[0].scriptId).toBe("script-99");
    expect(bus.calls[0].success).toBe(true);
    expect(bus.calls[0].timingMs).toBe(33);
  });

  it("publishScriptResult throws on empty/null scriptId (R12)", () => {
    expect(() => engine.publishScriptResult({ ok: true, durationMs: 1 }, "")).toThrow(TypeError);
    expect(() => engine.publishScriptResult({ ok: true, durationMs: 1 }, null as never)).toThrow(TypeError);
    expect(engine.getStats().totalRejected).toBe(2);
  });

  it("publishScriptResult propagates error message on failure", () => {
    engine.publishScriptResult({ ok: false, durationMs: 1, error: "regen failed" }, "s-1");
    expect(bus.calls[0].success).toBe(false);
    expect(bus.calls[0].errorMessage).toBe("regen failed");
  });

  it("stats: success/failure counts + totalPublishedOk increment per call (3 publishes → 2 success, 1 failure)", () => {
    engine.publishLiveResult(liveOk());
    engine.publishLiveResult(liveOk());
    engine.publishLiveResult(liveFail());
    const s = engine.getStats();
    expect(s.totalAccepted).toBe(3);
    expect(s.successCount).toBe(2);
    expect(s.failureCount).toBe(1);
    expect(s.totalPublishedOk).toBe(3);
    expect(s.totalPublishedBusWarn).toBe(0);
  });

  it("stats: bus warning routes to totalPublishedBusWarn (not totalPublishedOk)", () => {
    const warnBus = stubBus({ busOk: false });
    const eng = new HyperCADSOutcomePublisherEngine(warnBus as never);
    eng.publishLiveResult(liveOk());
    eng.publishLiveResult(liveOk());
    const s = eng.getStats();
    expect(s.totalPublishedOk).toBe(0);
    expect(s.totalPublishedBusWarn).toBe(2);
    expect(s.totalAccepted).toBe(2);
  });

  it("bus throws propagate to caller (no swallow) — telemetry still incremented (R12)", () => {
    const throwBus = stubBus({ throwOnPublish: true });
    const eng = new HyperCADSOutcomePublisherEngine(throwBus as never);
    expect(() => eng.publishLiveResult(liveOk())).toThrow(TypeError);
    expect(eng.getStats().totalAccepted).toBe(1);
    expect(eng.getStats().totalPublishedOk).toBe(0);
  });

  it("PublishResult lineageId is surfaced back to the caller", () => {
    const r = engine.publishLiveResult(liveOk("op-77"));
    expect(typeof r.lineageId).toBe("string");
    expect(r.lineageId.length).toBeGreaterThan(0);
    expect(r.busOk).toBe(true);
  });

  it("default singleton constructs with the global bus (smoke test on the export)", async () => {
    const mod = await import("../engines/HyperCADSOutcomePublisherEngine.js");
    expect(mod.hyperCADSOutcomePublisherEngine).toBeInstanceOf(HyperCADSOutcomePublisherEngine);
  });
});
