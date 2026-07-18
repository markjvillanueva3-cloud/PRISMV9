/**
 * CADExecutionOutcomeBusEngine — U-CADC-LP01 / CAD-COMPLETE-MS0
 *
 * Verifies (1) input validation at the boundary, (2) durable + in-process
 * dual-channel emission, (3) subscriber isolation under throwing handlers,
 * (4) stats arithmetic exactness, (5) cross-adapter variability across
 * freecad/fusion360/mastercam, and (6) lineage-id threading + auto-stamp.
 *
 * The downstream OutcomeCaptureBus is mocked because it touches the
 * filesystem (JSONL shard). The SUT here is the CAD bus itself, not the
 * downstream capture bus — the mock is a dependency boundary, not a
 * substitute for the system under test. The non-mocked durable-channel
 * contract is verified separately in CADExecutionOutcomeBusEngine.durable.test.ts.
 *
 * @module __tests__/CADExecutionOutcomeBusEngine.test
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  CADExecutionOutcomeBusEngine,
  type CADExecutionOutcome,
} from "../engines/CADExecutionOutcomeBusEngine.js";

// Mock the durable JSONL bus so tests assert behavior, not disk effects.
vi.mock("../engines/OutcomeCaptureBusEngine.js", () => {
  const calls: Array<{ domain: string; kind: string; lineage_id?: string; severity?: string; context?: Record<string, unknown> }> = [];
  const stub = {
    record(input: { domain: string; kind: string; lineage_id?: string; severity?: string; context?: Record<string, unknown> }) {
      calls.push(input);
      return {
        ok: true,
        event_id: "e-" + calls.length,
        lineage_id: input.lineage_id ?? "l-" + calls.length,
        path: "/tmp/x.jsonl",
        bytes: 100,
      };
    },
  };
  return { outcomeCaptureBusEngine: stub, __mockCalls: calls };
});

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;

const goodOutcome = (over: Partial<CADExecutionOutcome> = {}): CADExecutionOutcome => ({
  adapterId: "fusion360",
  success: true,
  timingMs: 250,
  ...over,
});

describe("CADExecutionOutcomeBusEngine", () => {
  let bus: CADExecutionOutcomeBusEngine;

  beforeEach(() => {
    bus = new CADExecutionOutcomeBusEngine();
  });

  // ─── happy path — exact stats arithmetic ───────────────────────────────
  it("publishes a success outcome with exact counter updates", () => {
    const r = bus.publish(goodOutcome());
    expect(r.published).toBe(true);
    expect(r.lineageId).toMatch(UUID_RE);
    expect(r.timestamp).toMatch(ISO_RE);
    expect(r.busOk).toBe(true);
    expect(r.subscribersNotified).toBe(0);
    expect(r.handlerErrors).toBe(0);

    const s = bus.getStats();
    expect(s.totalPublished).toBe(1);
    expect(s.totalSuccess).toBe(1);
    expect(s.totalFailure).toBe(0);
    expect(s.byAdapter.fusion360).toEqual({ success: 1, failure: 0, collisions: 0, regenOk: 0 });
  });

  it("counts failure / collision / regenerationOk independently with exact totals", () => {
    bus.publish(goodOutcome({ success: false, errorMessage: "boom", timingMs: 99 }));
    bus.publish(goodOutcome({ success: false, collision: true, timingMs: 10 }));
    bus.publish(goodOutcome({ regenerationOk: true }));
    const s = bus.getStats();
    expect(s.totalPublished).toBe(3);
    expect(s.totalSuccess).toBe(1);
    expect(s.totalFailure).toBe(2);
    expect(s.byAdapter.fusion360).toEqual({ success: 1, failure: 2, collisions: 1, regenOk: 1 });
  });

  // ─── variability floor — ≥3 spanning adapters ──────────────────────────
  it("tracks per-adapter stats independently across freecad / fusion360 / mastercam", () => {
    bus.publish(goodOutcome({ adapterId: "freecad", success: true }));
    bus.publish(goodOutcome({ adapterId: "fusion360", success: false, errorMessage: "x" }));
    bus.publish(goodOutcome({ adapterId: "mastercam", success: true, collision: true }));
    const s = bus.getStats();
    expect(Object.keys(s.byAdapter).sort()).toEqual(["freecad", "fusion360", "mastercam"]);
    expect(s.byAdapter.freecad).toEqual({ success: 1, failure: 0, collisions: 0, regenOk: 0 });
    expect(s.byAdapter.fusion360).toEqual({ success: 0, failure: 1, collisions: 0, regenOk: 0 });
    expect(s.byAdapter.mastercam).toEqual({ success: 1, failure: 0, collisions: 1, regenOk: 0 });
  });

  // ─── subscriber fan-out + isolation ────────────────────────────────────
  it("delivers each publish to every subscriber in order", () => {
    const seenA: string[] = [];
    const seenB: string[] = [];
    bus.subscribe((o) => seenA.push(o.scriptId ?? ""));
    bus.subscribe((o) => seenB.push(o.scriptId ?? ""));
    bus.publish(goodOutcome({ scriptId: "P1" }));
    bus.publish(goodOutcome({ scriptId: "P2" }));
    expect(seenA).toEqual(["P1", "P2"]);
    expect(seenB).toEqual(["P1", "P2"]);
  });

  it("isolates a throwing subscriber — other subscribers still receive the publish", () => {
    const seenGood: string[] = [];
    bus.subscribe(() => { throw new Error("boom"); });
    bus.subscribe((o) => seenGood.push(o.adapterId));
    const r = bus.publish(goodOutcome());
    expect(r.handlerErrors).toBe(1);
    expect(r.subscribersNotified).toBe(1);
    expect(seenGood).toEqual(["fusion360"]);
    expect(bus.getStats().handlerErrors).toBe(1);
  });

  it("unsubscribe stops further deliveries and is idempotent", () => {
    const seen: string[] = [];
    const off = bus.subscribe((o) => seen.push(o.adapterId));
    bus.publish(goodOutcome());
    off();
    off(); // second call must not throw and must not affect state
    bus.publish(goodOutcome());
    expect(seen).toEqual(["fusion360"]);
    expect(bus.listSubscribers()).toBe(0);
  });

  it("freezes the outcome handed to subscribers (defensive immutability)", () => {
    let captured: Readonly<CADExecutionOutcome> | null = null;
    bus.subscribe((o) => { captured = o; });
    bus.publish(goodOutcome());
    expect(captured).not.toBeNull();
    expect(Object.isFrozen(captured)).toBe(true);
  });

  // ─── lineage threading ─────────────────────────────────────────────────
  it("uses caller-supplied lineageId verbatim when provided", () => {
    const r = bus.publish(goodOutcome({ lineageId: "lin-fixed-abc-123" }));
    expect(r.lineageId).toBe("lin-fixed-abc-123");
  });

  it("auto-issues a unique UUID-shape lineageId when caller omits it", () => {
    const r1 = bus.publish(goodOutcome());
    const r2 = bus.publish(goodOutcome());
    expect(r1.lineageId).toMatch(UUID_RE);
    expect(r2.lineageId).toMatch(UUID_RE);
    expect(r1.lineageId).not.toBe(r2.lineageId);
  });

  // ─── validation (≥3 failure modes + ≥2 adversarial inputs) ─────────────
  it("rejects empty adapterId with a descriptive error", () => {
    expect(() => bus.publish({ adapterId: "", success: true, timingMs: 10 })).toThrow(/adapterId/);
  });
  it("rejects non-boolean success with a descriptive error", () => {
    expect(() => bus.publish({ adapterId: "x", success: "yes" as unknown as boolean, timingMs: 10 })).toThrow(/success/);
  });
  it("rejects negative timingMs with a descriptive error", () => {
    expect(() => bus.publish(goodOutcome({ timingMs: -1 }))).toThrow(/timingMs/);
  });
  it("rejects NaN timingMs (adversarial)", () => {
    expect(() => bus.publish(goodOutcome({ timingMs: NaN }))).toThrow(/timingMs/);
  });
  it("rejects Infinity timingMs (adversarial)", () => {
    expect(() => bus.publish(goodOutcome({ timingMs: Infinity }))).toThrow(/timingMs/);
  });
  it("rejects null outcome (adversarial)", () => {
    expect(() => bus.publish(null as unknown as CADExecutionOutcome)).toThrow(/outcome/);
  });
  it("rejects non-function subscriber (adversarial)", () => {
    expect(() => bus.subscribe(42 as unknown as (o: Readonly<CADExecutionOutcome>) => void)).toThrow(/function/);
  });

  // ─── durable bus contract ──────────────────────────────────────────────
  it("counts busWriteFailures and surfaces warning when downstream record() throws", async () => {
    const mockMod = (await import("../engines/OutcomeCaptureBusEngine.js")) as unknown as {
      outcomeCaptureBusEngine: { record: (i: unknown) => unknown };
    };
    const originalRecord = mockMod.outcomeCaptureBusEngine.record;
    mockMod.outcomeCaptureBusEngine.record = () => { throw new Error("disk full"); };
    try {
      const r = bus.publish(goodOutcome());
      expect(r.busOk).toBe(false);
      expect(r.busWarning).toMatch(/disk full/);
      expect(bus.getStats().busWriteFailures).toBe(1);
    } finally {
      mockMod.outcomeCaptureBusEngine.record = originalRecord;
    }
  });

  it("counts busWriteFailures when downstream record() returns ok:false", async () => {
    const mockMod = (await import("../engines/OutcomeCaptureBusEngine.js")) as unknown as {
      outcomeCaptureBusEngine: { record: (i: unknown) => unknown };
    };
    const originalRecord = mockMod.outcomeCaptureBusEngine.record;
    mockMod.outcomeCaptureBusEngine.record = () => ({
      ok: false, event_id: "x", lineage_id: "y", path: "", bytes: 0, warning: "rejected by schema",
    });
    try {
      const r = bus.publish(goodOutcome());
      expect(r.busOk).toBe(false);
      expect(r.busWarning).toMatch(/rejected by schema/);
      expect(bus.getStats().busWriteFailures).toBe(1);
    } finally {
      mockMod.outcomeCaptureBusEngine.record = originalRecord;
    }
  });

  // ─── lifecycle helpers ─────────────────────────────────────────────────
  it("reset() clears subscribers and zeroes all counters", () => {
    bus.subscribe(() => { /* no-op */ });
    bus.publish(goodOutcome());
    bus.reset();
    const s = bus.getStats();
    expect(s.totalPublished).toBe(0);
    expect(s.totalSuccess).toBe(0);
    expect(s.totalFailure).toBe(0);
    expect(s.handlerErrors).toBe(0);
    expect(s.busWriteFailures).toBe(0);
    expect(s.subscriberCount).toBe(0);
    expect(bus.listSubscribers()).toBe(0);
    expect(Object.keys(s.byAdapter)).toEqual([]);
  });

  // ─── round-trip E2E (publisher → subscriber sees full payload) ─────────
  it("round-trip: subscriber receives the published payload with auto-stamped fields", () => {
    let received: CADExecutionOutcome | null = null;
    bus.subscribe((o) => { received = o; });
    bus.publish(goodOutcome({
      adapterId: "fusion360",
      scriptId: "DEMO-42",
      success: true,
      timingMs: 1234,
      collision: false,
      regenerationOk: true,
    }));
    expect(received).not.toBeNull();
    expect(received!.adapterId).toBe("fusion360");
    expect(received!.scriptId).toBe("DEMO-42");
    expect(received!.success).toBe(true);
    expect(received!.timingMs).toBe(1234);
    expect(received!.collision).toBe(false);
    expect(received!.regenerationOk).toBe(true);
    expect(received!.lineageId).toMatch(UUID_RE);
    expect(received!.timestamp).toMatch(ISO_RE);
  });

  it("round-trip dispatcher schema → engine: validated params propagate to bus state", async () => {
    // R8: round-trip through the dispatcher schema surface, not only the engine singleton.
    const { ACTION_CAD_SCHEMAS } = await import("../schemas/cadActionSchemas.js");

    // Schema map exposes all 3 LP01 actions
    const publishSchema = ACTION_CAD_SCHEMAS.cad_outcome_publish;
    const statsSchema = ACTION_CAD_SCHEMAS.cad_outcome_stats;
    const subsSchema = ACTION_CAD_SCHEMAS.cad_outcome_subscribers;
    expect(typeof publishSchema.safeParse).toBe("function");
    expect(typeof statsSchema.safeParse).toBe("function");
    expect(typeof subsSchema.safeParse).toBe("function");

    // Happy-path payload parses + data shape matches
    const okParse = publishSchema.safeParse({
      adapterId: "freecad", success: true, timingMs: 42,
    });
    expect(okParse.success).toBe(true);
    if (okParse.success) {
      expect(okParse.data.adapterId).toBe("freecad");
      expect(okParse.data.success).toBe(true);
      expect(okParse.data.timingMs).toBe(42);
    }

    // Boundary: empty adapterId rejected
    const emptyAdapter = publishSchema.safeParse({ adapterId: "", success: true, timingMs: 42 });
    expect(emptyAdapter.success).toBe(false);

    // Boundary: negative timingMs rejected
    const negTime = publishSchema.safeParse({ adapterId: "x", success: true, timingMs: -5 });
    expect(negTime.success).toBe(false);

    // Boundary: NaN timingMs rejected (adversarial)
    const nanTime = publishSchema.safeParse({ adapterId: "x", success: true, timingMs: NaN });
    expect(nanTime.success).toBe(false);

    // Stats/subscribers actions are strict empty — extra fields rejected
    const extraStats = statsSchema.safeParse({ extra: 1 });
    expect(extraStats.success).toBe(false);
    const extraSubs = subsSchema.safeParse({ extra: 1 });
    expect(extraSubs.success).toBe(false);

    // Empty {} accepted for inspection actions
    const okStats = statsSchema.safeParse({});
    expect(okStats.success).toBe(true);
    const okSubs = subsSchema.safeParse({});
    expect(okSubs.success).toBe(true);
  });

  it("round-trip: getStats() reflects the exact sequence of 5 mixed publishes", () => {
    bus.publish(goodOutcome({ adapterId: "freecad", success: true, timingMs: 100 }));
    bus.publish(goodOutcome({ adapterId: "freecad", success: false, timingMs: 200 }));
    bus.publish(goodOutcome({ adapterId: "fusion360", success: true, collision: true, timingMs: 50 }));
    bus.publish(goodOutcome({ adapterId: "mastercam", success: true, regenerationOk: true, timingMs: 75 }));
    bus.publish(goodOutcome({ adapterId: "mastercam", success: false, errorMessage: "z", timingMs: 12 }));
    const s = bus.getStats();
    expect(s.totalPublished).toBe(5);
    expect(s.totalSuccess).toBe(3);
    expect(s.totalFailure).toBe(2);
    expect(s.byAdapter.freecad).toEqual({ success: 1, failure: 1, collisions: 0, regenOk: 0 });
    expect(s.byAdapter.fusion360).toEqual({ success: 1, failure: 0, collisions: 1, regenOk: 0 });
    expect(s.byAdapter.mastercam).toEqual({ success: 1, failure: 1, collisions: 0, regenOk: 1 });
  });
});
