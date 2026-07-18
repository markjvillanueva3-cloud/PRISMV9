/**
 * CADPerAdapterFeedbackCollectorEngine — U-CADC-LP02 / CAD-COMPLETE-MS0
 *
 * Verifies (1) ingest() routing by cadSystem == NN head, (2) per-head
 * buffer growth + FIFO eviction, (3) windowed metric arithmetic
 * (success/failure/collision/regenOk rates, mean + nearest-rank p50/p95),
 * (4) malformed-outcome rejection without throwing, (5) copy semantics,
 * and (6) the REAL LP01→LP02 subscription contract end-to-end via attach().
 *
 * Mock policy (R9): the SUT pair here is the LP01 outcome bus + the LP02
 * collector — BOTH are used REAL (no mock). The only stubbed module is the
 * durable JSONL sink OutcomeCaptureBusEngine, a filesystem dependency
 * boundary that is transitively reached by LP01.publish() and is NOT part
 * of LP02's contract (that boundary has its own non-mocked durable test in
 * CADExecutionOutcomeBusEngine.durable.test.ts). Stubbing it keeps the
 * LP01↔LP02 path fully real while avoiding test-data pollution of the
 * production outcome shard.
 *
 * @module __tests__/CADPerAdapterFeedbackCollectorEngine.test
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  CADPerAdapterFeedbackCollectorEngine,
  cadPerAdapterFeedbackCollectorEngine,
  type FeedbackSample,
} from "../engines/CADPerAdapterFeedbackCollectorEngine.js";
import {
  CADExecutionOutcomeBusEngine,
  type CADExecutionOutcome,
} from "../engines/CADExecutionOutcomeBusEngine.js";

// Stub ONLY the durable filesystem sink — LP01 bus + LP02 collector stay real.
vi.mock("../engines/OutcomeCaptureBusEngine.js", () => {
  const stub = {
    record(input: { lineage_id?: string }) {
      return { ok: true, event_id: "e-x", lineage_id: input.lineage_id ?? "l-x", path: "/tmp/x.jsonl", bytes: 1 };
    },
  };
  return { outcomeCaptureBusEngine: stub };
});

const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;

/** Hand-built outcome for direct ingest() tests. */
const outcome = (over: Partial<CADExecutionOutcome> = {}): CADExecutionOutcome => ({
  adapterId: "fusion360",
  success: true,
  timingMs: 100,
  lineageId: "lin-0",
  timestamp: "2026-05-20T12:00:00.000Z",
  ...over,
});

describe("CADPerAdapterFeedbackCollectorEngine", () => {
  let collector: CADPerAdapterFeedbackCollectorEngine;

  beforeEach(() => {
    collector = new CADPerAdapterFeedbackCollectorEngine();
    // Importing the engine module runs its body, which auto-attaches the
    // PRODUCTION singleton to the production LP01 bus. No test here publishes
    // on that production bus, but reset it each test anyway so a future test
    // sharing this vitest worker cannot inherit collected state.
    cadPerAdapterFeedbackCollectorEngine.reset();
  });

  // ─── ingest() — routing + buffer growth ────────────────────────────────
  describe("ingest()", () => {
    it("accepts a valid outcome, routes it to its head buffer which grows", () => {
      expect(collector.ingest(outcome())).toBe(true);
      expect(collector.getStats().totalIngested).toBe(1);
      expect(collector.getFeedbackBuffer("fusion360").length).toBe(1);
    });

    it("derives every FeedbackSample field, coercing optional outcome fields", () => {
      collector.ingest(outcome({
        adapterId: "freecad",
        scriptId: "P-7",
        success: false,
        errorMessage: "regen failed",
        timingMs: 321,
        collision: true,
        regenerationOk: true,
        lineageId: "lin-abc",
        timestamp: "2026-05-20T01:02:03.000Z",
      }));
      const s = collector.getFeedbackBuffer("freecad")[0];
      expect(s).toEqual<FeedbackSample>({
        headId: "freecad",
        success: false,
        timingMs: 321,
        collision: true,
        regenerationOk: true,
        errorMessage: "regen failed",
        scriptId: "P-7",
        lineageId: "lin-abc",
        timestamp: "2026-05-20T01:02:03.000Z",
      });
    });

    it("coerces absent collision / regenerationOk to false (not undefined)", () => {
      collector.ingest({ adapterId: "freecad", success: true, timingMs: 5, lineageId: "l", timestamp: "2026-05-20T00:00:00Z" });
      const s = collector.getFeedbackBuffer("freecad")[0];
      expect(s.collision).toBe(false);
      expect(s.regenerationOk).toBe(false);
    });

    it("substitutes an ingest-time ISO timestamp + empty lineage for a hand-built outcome with neither", () => {
      collector.ingest({ adapterId: "freecad", success: true, timingMs: 5 });
      const s = collector.getFeedbackBuffer("freecad")[0];
      expect(s.lineageId).toBe("");
      expect(s.timestamp).toMatch(ISO_RE);
    });

    it("routes 3 adapters into 3 independent head buffers (variability floor)", () => {
      collector.ingest(outcome({ adapterId: "freecad" }));
      collector.ingest(outcome({ adapterId: "fusion360" }));
      collector.ingest(outcome({ adapterId: "mastercam" }));
      expect(collector.listHeads()).toEqual(["freecad", "fusion360", "mastercam"]);
      expect(collector.getFeedbackBuffer("freecad").length).toBe(1);
      expect(collector.getFeedbackBuffer("fusion360").length).toBe(1);
      expect(collector.getFeedbackBuffer("mastercam").length).toBe(1);
    });

    it("drops a malformed outcome — counts it, returns false, never throws", () => {
      expect(collector.ingest({ adapterId: "", success: true, timingMs: 1 } as CADExecutionOutcome)).toBe(false);
      expect(collector.ingest(outcome({ timingMs: NaN }))).toBe(false);
      expect(collector.ingest(outcome({ timingMs: -1 }))).toBe(false);
      expect(collector.ingest({ adapterId: "x", success: "yes", timingMs: 1 } as unknown as CADExecutionOutcome)).toBe(false);
      expect(collector.ingest(null as unknown as CADExecutionOutcome)).toBe(false);
      expect(collector.getStats().malformedDropped).toBe(5);
      expect(collector.getStats().totalIngested).toBe(0);
    });

    it("evicts FIFO at maxBufferSize — buffer caps, evictions counted, oldest dropped", () => {
      const capped = new CADPerAdapterFeedbackCollectorEngine({ maxBufferSize: 5 });
      for (let i = 1; i <= 8; i++) capped.ingest(outcome({ timingMs: i }));
      const buf = capped.getFeedbackBuffer("fusion360");
      expect(buf.length).toBe(5);
      expect(buf[0].timingMs).toBe(4); // samples 1-3 evicted, 4-8 retained
      expect(buf[4].timingMs).toBe(8);
      expect(capped.getStats().byHead.fusion360.evicted).toBe(3);
    });
  });

  // ─── windowed metrics ──────────────────────────────────────────────────
  describe("getMetrics()", () => {
    it("computes successRate / failureRate exactly", () => {
      collector.ingest(outcome({ success: true }));
      collector.ingest(outcome({ success: true }));
      collector.ingest(outcome({ success: true }));
      collector.ingest(outcome({ success: false }));
      const m = collector.getMetrics("fusion360");
      expect(m.windowCount).toBe(4);
      expect(m.successRate).toBe(0.75);
      expect(m.failureRate).toBe(0.25);
      expect(m.successRate + m.failureRate).toBe(1);
    });

    it("computes collisionRate / regenOkRate exactly", () => {
      collector.ingest(outcome({ collision: true }));
      collector.ingest(outcome({ collision: true }));
      collector.ingest(outcome({ regenerationOk: true }));
      collector.ingest(outcome({}));
      const m = collector.getMetrics("fusion360");
      expect(m.collisionRate).toBe(0.5);
      expect(m.regenOkRate).toBe(0.25);
    });

    it("computes mean + nearest-rank p50 / p95 timing", () => {
      for (const t of [40, 10, 30, 20]) collector.ingest(outcome({ timingMs: t }));
      const m = collector.getMetrics("fusion360");
      expect(m.meanTimingMs).toBe(25);
      expect(m.p50TimingMs).toBe(20); // ceil(0.5*4)=2 → sorted[1]
      expect(m.p95TimingMs).toBe(40); // ceil(0.95*4)=4 → sorted[3]
    });

    it("window smaller than buffer — uses only the last N samples", () => {
      for (let i = 1; i <= 10; i++) collector.ingest(outcome({ timingMs: i }));
      const m = collector.getMetrics("fusion360", 3);
      expect(m.bufferSize).toBe(10);
      expect(m.windowSize).toBe(3);
      expect(m.windowCount).toBe(3);
      expect(m.meanTimingMs).toBe(9); // last 3 = 8,9,10
    });

    it("window larger than buffer — uses the whole buffer", () => {
      collector.ingest(outcome());
      collector.ingest(outcome());
      collector.ingest(outcome());
      const m = collector.getMetrics("fusion360", 100);
      expect(m.windowSize).toBe(100);
      expect(m.windowCount).toBe(3);
    });

    it("unknown head — zero-filled metrics, lastTimestamp null, never throws", () => {
      const m = collector.getMetrics("does-not-exist");
      expect(m.bufferSize).toBe(0);
      expect(m.windowCount).toBe(0);
      expect(m.successRate).toBe(0);
      expect(m.failureRate).toBe(0);
      expect(m.collisionRate).toBe(0);
      expect(m.regenOkRate).toBe(0);
      expect(m.meanTimingMs).toBe(0);
      expect(m.p50TimingMs).toBe(0);
      expect(m.p95TimingMs).toBe(0);
      expect(m.lastTimestamp).toBeNull();
    });

    it("invalid window arg (0 / negative / NaN / non-integer) falls back to the default", () => {
      const c = new CADPerAdapterFeedbackCollectorEngine({ windowSize: 7 });
      for (let i = 0; i < 20; i++) c.ingest(outcome());
      for (const bad of [0, -1, NaN, 1.5]) {
        const m = c.getMetrics("fusion360", bad);
        expect(m.windowSize).toBe(7);
        expect(m.windowCount).toBe(7);
      }
    });

    it("getAllMetrics returns one entry per head, sorted by headId", () => {
      collector.ingest(outcome({ adapterId: "mastercam" }));
      collector.ingest(outcome({ adapterId: "freecad" }));
      const all = collector.getAllMetrics();
      expect(all.map((m) => m.headId)).toEqual(["freecad", "mastercam"]);
    });
  });

  // ─── copy semantics + lifecycle ────────────────────────────────────────
  describe("buffer access + lifecycle", () => {
    it("getFeedbackBuffer returns a copy — mutating it cannot corrupt live state", () => {
      collector.ingest(outcome({ timingMs: 111 }));
      const buf = collector.getFeedbackBuffer("fusion360");
      buf[0].timingMs = 999;
      buf.push({ ...buf[0], headId: "injected" });
      const fresh = collector.getFeedbackBuffer("fusion360");
      expect(fresh.length).toBe(1);
      expect(fresh[0].timingMs).toBe(111);
    });

    it("getFeedbackBuffer with limit returns only the last N samples", () => {
      for (let i = 1; i <= 5; i++) collector.ingest(outcome({ timingMs: i }));
      const last2 = collector.getFeedbackBuffer("fusion360", 2);
      expect(last2.map((s) => s.timingMs)).toEqual([4, 5]);
    });

    it("getStats reports totalIngested / malformedDropped / headCount / byHead", () => {
      collector.ingest(outcome({ adapterId: "freecad" }));
      collector.ingest(outcome({ adapterId: "freecad" }));
      collector.ingest(outcome({ adapterId: "fusion360" }));
      collector.ingest(outcome({ timingMs: NaN }));
      const s = collector.getStats();
      expect(s.totalIngested).toBe(3);
      expect(s.malformedDropped).toBe(1);
      expect(s.headCount).toBe(2);
      expect(s.byHead.freecad).toEqual({ samples: 2, evicted: 0 });
      expect(s.byHead.fusion360).toEqual({ samples: 1, evicted: 0 });
    });

    it("reset() clears every buffer and zeroes all counters", () => {
      collector.ingest(outcome());
      collector.ingest(outcome({ timingMs: NaN }));
      collector.reset();
      const s = collector.getStats();
      expect(s.totalIngested).toBe(0);
      expect(s.malformedDropped).toBe(0);
      expect(s.headCount).toBe(0);
      expect(collector.listHeads()).toEqual([]);
      expect(collector.getFeedbackBuffer("fusion360")).toEqual([]);
    });
  });

  // ─── REAL LP01 → LP02 subscription contract (no mock of either) ─────────
  describe("attach() — real bus subscription contract", () => {
    it("attach() wires ingest to a REAL CADExecutionOutcomeBusEngine — publishes route into the collector", () => {
      const bus = new CADExecutionOutcomeBusEngine();
      const off = collector.attach(bus);
      expect(typeof off).toBe("function");

      bus.publish({ adapterId: "fusion360", success: true, timingMs: 100 });
      bus.publish({ adapterId: "fusion360", success: false, timingMs: 300, errorMessage: "boom" });
      bus.publish({ adapterId: "mastercam", success: true, timingMs: 50, collision: true });

      // The collector's state must reflect what flowed through the real bus.
      expect(collector.getStats().totalIngested).toBe(3);
      expect(collector.listHeads()).toEqual(["fusion360", "mastercam"]);
      const fm = collector.getMetrics("fusion360");
      expect(fm.windowCount).toBe(2);
      expect(fm.successRate).toBe(0.5);
      // LP01 publish() stamps a real lineageId — the bus path is fully exercised.
      expect(collector.getFeedbackBuffer("fusion360")[0].lineageId.length).toBeGreaterThan(0);
      expect(collector.getMetrics("mastercam").collisionRate).toBe(1);
    });

    it("the unsubscribe handle from attach() stops further collection", () => {
      const bus = new CADExecutionOutcomeBusEngine();
      const off = collector.attach(bus);
      bus.publish({ adapterId: "freecad", success: true, timingMs: 10 });
      off();
      bus.publish({ adapterId: "freecad", success: true, timingMs: 20 });
      expect(collector.getStats().totalIngested).toBe(1);
    });

    it("attach() rejects a non-bus argument with a descriptive TypeError", () => {
      expect(() => collector.attach(null as unknown as CADExecutionOutcomeBusEngine)).toThrow(/subscribe/);
      expect(() => collector.attach({} as unknown as CADExecutionOutcomeBusEngine)).toThrow(/subscribe/);
    });
  });

  // ─── dispatcher schema round-trip ──────────────────────────────────────
  it("prism_cad LP02 action schemas parse valid params + reject bad ones", async () => {
    const { ACTION_CAD_SCHEMAS } = await import("../schemas/cadActionSchemas.js");
    const metrics = ACTION_CAD_SCHEMAS.cad_feedback_metrics;
    const buffer = ACTION_CAD_SCHEMAS.cad_feedback_buffer;
    const stats = ACTION_CAD_SCHEMAS.cad_feedback_stats;
    expect(typeof metrics.safeParse).toBe("function");
    expect(typeof buffer.safeParse).toBe("function");
    expect(typeof stats.safeParse).toBe("function");

    // metrics — headId + window both optional; window must be a positive int
    expect(metrics.safeParse({}).success).toBe(true);
    expect(metrics.safeParse({ headId: "fusion360", window: 25 }).success).toBe(true);
    expect(metrics.safeParse({ window: -1 }).success).toBe(false);
    expect(metrics.safeParse({ window: 1.5 }).success).toBe(false);

    // buffer — headId REQUIRED, limit optional positive int
    expect(buffer.safeParse({ headId: "freecad" }).success).toBe(true);
    expect(buffer.safeParse({ headId: "freecad", limit: 10 }).success).toBe(true);
    expect(buffer.safeParse({}).success).toBe(false);
    expect(buffer.safeParse({ headId: "" }).success).toBe(false);

    // stats — strict empty
    expect(stats.safeParse({}).success).toBe(true);
    expect(stats.safeParse({ extra: 1 }).success).toBe(false);
  });
});
