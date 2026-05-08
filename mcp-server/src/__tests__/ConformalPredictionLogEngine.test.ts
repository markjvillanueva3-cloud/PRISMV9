/**
 * U-NN-CONFORMAL05 — prediction-log bridge tests.
 *
 * Verifies: log → pairAndRecord round-trip pushes the (predictedSet,
 * actualLabel) pair into the CalibrationMonitor; TTL eviction with a
 * deterministic injected clock; FeedbackBus auto-sync subscribes,
 * receives 'outcome.recorded' events from CrossProcessOutcomeStore.record(),
 * and feeds the monitor in microtask time; pending count, duplicate-id
 * rejection, MAX_PENDING capacity guard, and dispatcher wrapper.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  ConformalPredictionLogEngine as PLE,
  conformalPredictionLog,
} from "../engines/ConformalPredictionLogEngine.js";
import { ConformalCalibrationMonitorEngine as CCM } from "../engines/ConformalCalibrationMonitorEngine.js";
import {
  feedbackBusEngine,
  type FeedbackEvent,
} from "../engines/FeedbackBusEngine.js";
import { CrossProcessOutcomeStore } from "../engines/CrossProcessOutcomeStore.js";

// Microtask drain — same depth as the LOOP03 NN auto-train tests because
// the chain length is identical (publish → subscriber → record → publish).
const flush = async () => {
  for (let i = 0; i < 4; i++) await Promise.resolve();
};

beforeEach(() => {
  PLE.reset();
  CCM.reset();
  CCM.configure({
    windowSize: 50,
    alpha: 0.1,
    driftTolerance: 0.05,
    consecutiveK: 5,
  });
  CCM.reset();
  feedbackBusEngine.reset();
  PLE.__setClockForTests(undefined);
});

afterEach(() => {
  PLE.disableAutoSync();
  PLE.__setClockForTests(undefined);
});

// ============================================================================
// 1. logPrediction — happy path + validation gates
// ============================================================================

describe("logPrediction()", () => {
  it("logs a valid prediction and increments pending + totalLogged", () => {
    const r = PLE.logPrediction({ id: "evt-1", predictedSet: [0, 2] });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.pending).toBe(1);
    expect(r.totalLogged).toBe(1);
    expect(PLE.pendingIds()).toEqual(["evt-1"]);
  });

  it("rejects empty predictedSet (degenerate output from upstream)", () => {
    const r = PLE.logPrediction({ id: "evt-1", predictedSet: [] });
    expect(r.ok).toBe(false);
  });

  it("rejects empty id", () => {
    const r = PLE.logPrediction({ id: "", predictedSet: [0] });
    expect(r.ok).toBe(false);
  });

  it("rejects non-integer label in predictedSet", () => {
    const r = PLE.logPrediction({ id: "evt-1", predictedSet: [0.5] });
    expect(r.ok).toBe(false);
  });

  it("rejects negative label in predictedSet", () => {
    const r = PLE.logPrediction({ id: "evt-1", predictedSet: [-1] });
    expect(r.ok).toBe(false);
  });

  it("rejects re-log of the same id without replace=true", () => {
    PLE.logPrediction({ id: "evt-1", predictedSet: [0] });
    const r = PLE.logPrediction({ id: "evt-1", predictedSet: [1] });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.message).toMatch(/already pending/);
    expect(PLE.status().totalDuplicates).toBe(1);
  });

  it("allows re-log of the same id with replace=true (overwrite)", () => {
    PLE.logPrediction({ id: "evt-1", predictedSet: [0, 1] });
    const r = PLE.logPrediction({ id: "evt-1", predictedSet: [2], replace: true });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.pending).toBe(1); // still 1 — overwrite
    expect(r.totalLogged).toBe(2); // lifetime counter advances
  });

  it("defensively copies predictedSet (caller mutation does not leak)", () => {
    const set = [0, 1];
    PLE.logPrediction({ id: "evt-1", predictedSet: set });
    set.push(2); // mutate the caller's array
    PLE.pairAndRecord({ id: "evt-1", actualLabel: 0 });
    const status = CCM.status();
    expect(status.totalRecorded).toBe(1);
    // Coverage was true → label 0 was in the original [0, 1] set.
    expect(status.covered).toBe(1);
  });
});

// ============================================================================
// 2. pairAndRecord — round-trip into the monitor
// ============================================================================

describe("pairAndRecord()", () => {
  it("pushes (predictedSet, actualLabel) into the monitor and evicts by default", () => {
    PLE.logPrediction({ id: "evt-1", predictedSet: [0, 2] });
    const r = PLE.pairAndRecord({ id: "evt-1", actualLabel: 2 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.covered).toBe(true);
    expect(r.predictedSet).toEqual([0, 2]);
    expect(r.pending).toBe(0); // evicted
    expect(CCM.status().total).toBe(1);
    expect(CCM.status().covered).toBe(1);
  });

  it("returns covered=false when label is NOT in the predicted set", () => {
    PLE.logPrediction({ id: "evt-1", predictedSet: [0, 1] });
    const r = PLE.pairAndRecord({ id: "evt-1", actualLabel: 2 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.covered).toBe(false);
    expect(CCM.status().covered).toBe(0);
  });

  it("rejects on unknown id and leaves the monitor untouched", () => {
    const r = PLE.pairAndRecord({ id: "ghost", actualLabel: 0 });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toBe("invalid_state");
    expect(CCM.status().total).toBe(0);
  });

  it("evict=false keeps the entry pending after recording", () => {
    PLE.logPrediction({ id: "evt-1", predictedSet: [1] });
    const r = PLE.pairAndRecord({ id: "evt-1", actualLabel: 1, evict: false });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.pending).toBe(1);
    expect(PLE.pendingIds()).toEqual(["evt-1"]);
    // Re-record allowed — useful for re-evaluating coverage at a different alpha
    const r2 = PLE.pairAndRecord({ id: "evt-1", actualLabel: 1 });
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;
    expect(CCM.status().total).toBe(2);
  });

  it("propagates monitor-side validation errors verbatim (no silent swallow)", () => {
    PLE.logPrediction({ id: "evt-1", predictedSet: [0] });
    const r = PLE.pairAndRecord({ id: "evt-1", actualLabel: -5 });
    expect(r.ok).toBe(false);
  });

  it("does NOT evict when monitor rejects (caller can fix and retry)", () => {
    PLE.logPrediction({ id: "evt-1", predictedSet: [0] });
    PLE.pairAndRecord({ id: "evt-1", actualLabel: -5 }); // bad label → rejected
    expect(PLE.pendingIds()).toEqual(["evt-1"]);
    const ok = PLE.pairAndRecord({ id: "evt-1", actualLabel: 0 });
    expect(ok.ok).toBe(true);
  });

  it("totalPaired counter advances on successful pairs", () => {
    PLE.logPrediction({ id: "a", predictedSet: [0] });
    PLE.logPrediction({ id: "b", predictedSet: [0] });
    PLE.pairAndRecord({ id: "a", actualLabel: 0 });
    PLE.pairAndRecord({ id: "b", actualLabel: 0 });
    expect(PLE.status().totalPaired).toBe(2);
  });
});

// ============================================================================
// 3. TTL prune — deterministic clock injection
// ============================================================================

describe("prune() with injected clock", () => {
  it("evicts entries older than the configured TTL", () => {
    let now = 1_000_000;
    PLE.__setClockForTests(() => now);
    PLE.configure({ ttlMs: 60_000 }); // 1 minute

    // t = 1_000_000 — log evt-old
    PLE.logPrediction({ id: "evt-old", predictedSet: [0] });
    now += 30_000; // 30s later
    PLE.logPrediction({ id: "evt-mid", predictedSet: [0] });
    now += 30_000; // 60s after start, 30s after evt-mid
    PLE.logPrediction({ id: "evt-new", predictedSet: [0] });

    // Now jump forward so evt-old is past TTL=60_000 but evt-mid + evt-new
    // are not. Total elapsed since evt-old = 90s; since evt-mid = 60s exactly
    // (boundary, not yet evicted); since evt-new = 30s.
    now += 31_000;

    const r = PLE.prune({});
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    // evt-old: age = 91_000 > 60_000 → evicted
    // evt-mid: age = 61_000 > 60_000 → evicted
    // evt-new: age = 31_000 < 60_000 → kept
    expect(r.evictedCount).toBe(2);
    expect(r.pending).toBe(1);
    expect(PLE.pendingIds()).toEqual(["evt-new"]);
    expect(PLE.status().totalEvicted).toBe(2);
  });

  it("prune({olderThanMs}) overrides the configured TTL for this sweep", () => {
    let now = 0;
    PLE.__setClockForTests(() => now);
    PLE.configure({ ttlMs: 24 * 60 * 60 * 1000 }); // 24h
    PLE.logPrediction({ id: "evt-1", predictedSet: [0] });
    now += 5 * 60 * 1000; // 5 minutes
    const r = PLE.prune({ olderThanMs: 60_000 }); // 1 minute override
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.evictedCount).toBe(1);
    expect(r.pending).toBe(0);
  });

  it("prune with no expired entries is a no-op", () => {
    PLE.logPrediction({ id: "evt-1", predictedSet: [0] });
    const r = PLE.prune({});
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.evictedCount).toBe(0);
    expect(r.pending).toBe(1);
  });

  it("rejects ttlMs below MIN_TTL_MS in configure", () => {
    const r = PLE.configure({ ttlMs: 1000 }); // 1 second — too short
    expect(r.ok).toBe(false);
  });
});

// ============================================================================
// 4. enableAutoSync — FeedbackBus integration
// ============================================================================

describe("enableAutoSync() — FeedbackBus integration", () => {
  it("subscribes to 'outcome.recorded' and pairs by id automatically", async () => {
    const store = new CrossProcessOutcomeStore();
    PLE.enableAutoSync({});

    // Pre-stage the prediction by id. We can't yet know the OutcomeStore id
    // before record(), so we use a known id for evt-1: store.record() returns
    // sequential ids starting at "evt-1".
    PLE.logPrediction({ id: "evt-1", predictedSet: [0, 2] });

    // Now record the outcome — this fires 'outcome.recorded' on the bus.
    const id = store.record({
      bridge: "sf",
      process: "mill",
      outcome: { kind: "success" }, // → label 0
    });
    expect(id).toBe("evt-1");

    await flush();

    // The auto-sync subscriber should have paired the prediction with
    // outcome 0, fed the monitor, and evicted the entry.
    expect(PLE.status().pending).toBe(0);
    expect(PLE.status().totalPaired).toBe(1);
    expect(CCM.status().total).toBe(1);
    expect(CCM.status().covered).toBe(1); // 0 is in predictedSet [0,2]
  });

  it("skips outcomes whose id was never logged (no panic, counted in skipped)", async () => {
    const store = new CrossProcessOutcomeStore();
    PLE.enableAutoSync({});
    // No logPrediction — outcome arrives orphan.
    store.record({ bridge: "sf", process: "mill", outcome: { kind: "success" } });
    await flush();
    expect(PLE.status().totalAutoSyncSkipped).toBe(1);
    expect(PLE.status().totalPaired).toBe(0);
    expect(CCM.status().total).toBe(0);
  });

  it("skips pending outcomes — they have no label yet", async () => {
    const store = new CrossProcessOutcomeStore();
    PLE.enableAutoSync({});
    PLE.logPrediction({ id: "evt-1", predictedSet: [0] });
    store.record({ bridge: "sf", process: "mill" }); // defaults to pending
    await flush();
    expect(PLE.status().totalAutoSyncSkipped).toBe(1);
    expect(PLE.status().pending).toBe(1); // entry still there
    expect(CCM.status().total).toBe(0);
  });

  it("evictAfterRecord:false keeps the entry pending after pairing", async () => {
    const store = new CrossProcessOutcomeStore();
    PLE.enableAutoSync({ evictAfterRecord: false });
    PLE.logPrediction({ id: "evt-1", predictedSet: [0] });
    store.record({ bridge: "sf", process: "mill", outcome: { kind: "success" } });
    await flush();
    expect(PLE.status().totalPaired).toBe(1);
    expect(PLE.status().pending).toBe(1); // not evicted
    expect(CCM.status().total).toBe(1);
  });

  it("rejects re-enable without disable first (catches silent double-subscribe)", () => {
    PLE.enableAutoSync({});
    const r = PLE.enableAutoSync({});
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.message).toMatch(/already active/);
  });

  it("disableAutoSync() unsubscribes; subsequent outcomes are NOT paired", async () => {
    const store = new CrossProcessOutcomeStore();
    PLE.enableAutoSync({});
    PLE.logPrediction({ id: "evt-1", predictedSet: [0] });
    expect(PLE.disableAutoSync().ok).toBe(true);
    store.record({ bridge: "sf", process: "mill", outcome: { kind: "success" } });
    await flush();
    expect(PLE.status().totalPaired).toBe(0);
    expect(PLE.status().pending).toBe(1); // prediction still logged
    expect(CCM.status().total).toBe(0);
  });

  it("disableAutoSync() is idempotent (second call returns removed=false)", () => {
    PLE.enableAutoSync({});
    expect(PLE.disableAutoSync().ok).toBe(true);
    const r = PLE.disableAutoSync();
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.removed).toBe(false);
  });

  it("end-to-end: 3 mixed outcomes flow predictor → log → bus → monitor", async () => {
    const store = new CrossProcessOutcomeStore();
    PLE.enableAutoSync({});
    PLE.logPrediction({ id: "evt-1", predictedSet: [0, 1] }); // label 0 → covered
    PLE.logPrediction({ id: "evt-2", predictedSet: [0] });    // label 1 → missed
    PLE.logPrediction({ id: "evt-3", predictedSet: [2] });    // label 2 → covered

    store.record({ bridge: "sf", process: "mill", outcome: { kind: "success" } });             // evt-1, label 0
    store.record({ bridge: "sf", process: "mill", outcome: { kind: "failure" } });             // evt-2, label 1
    store.record({ bridge: "sf", process: "mill", outcome: { kind: "operator_override" } });   // evt-3, label 2

    await flush();

    expect(PLE.status().pending).toBe(0);
    expect(PLE.status().totalPaired).toBe(3);
    expect(CCM.status().total).toBe(3);
    expect(CCM.status().covered).toBe(2); // evt-1 + evt-3
  });
});

// ============================================================================
// 5. State / capacity / status / constants
// ============================================================================

describe("state management", () => {
  it("status() reflects rolling counters", () => {
    PLE.logPrediction({ id: "a", predictedSet: [0] });
    PLE.logPrediction({ id: "b", predictedSet: [0] });
    PLE.pairAndRecord({ id: "a", actualLabel: 0 });
    const s = PLE.status();
    expect(s.pending).toBe(1);
    expect(s.totalLogged).toBe(2);
    expect(s.totalPaired).toBe(1);
    expect(s.autoSyncActive).toBe(false);
  });

  it("pendingIds() returns ascending-sorted array", () => {
    PLE.logPrediction({ id: "evt-z", predictedSet: [0] });
    PLE.logPrediction({ id: "evt-a", predictedSet: [0] });
    PLE.logPrediction({ id: "evt-m", predictedSet: [0] });
    expect(PLE.pendingIds()).toEqual(["evt-a", "evt-m", "evt-z"]);
  });

  it("reset() clears all state including auto-sync subscription", () => {
    PLE.enableAutoSync({});
    PLE.logPrediction({ id: "evt-1", predictedSet: [0] });
    expect(PLE.status().pending).toBe(1);
    expect(PLE.status().autoSyncActive).toBe(true);
    PLE.reset();
    const s = PLE.status();
    expect(s.pending).toBe(0);
    expect(s.totalLogged).toBe(0);
    expect(s.autoSyncActive).toBe(false);
    expect(feedbackBusEngine.subscriberCount("outcome.recorded")).toBe(0);
  });

  it("constants() reports DEFAULT_TTL_MS=24h, MIN_TTL_MS=60s, MAX_PENDING=100k, kind map", () => {
    const c = PLE.constants();
    expect(c.DEFAULT_TTL_MS).toBe(24 * 60 * 60 * 1000);
    expect(c.MIN_TTL_MS).toBe(60_000);
    expect(c.MAX_PENDING).toBe(100_000);
    expect(c.KIND_TO_LABEL.success).toBe(0);
    expect(c.KIND_TO_LABEL.failure).toBe(1);
    expect(c.KIND_TO_LABEL.operator_override).toBe(2);
    expect(c.KIND_TO_LABEL.pending).toBeNull();
  });
});

// ============================================================================
// 6. Dispatcher wrapper
// ============================================================================

describe("conformalPredictionLog() dispatcher wrapper", () => {
  it("xproc_predlog_log routes to logPrediction()", () => {
    const r = conformalPredictionLog("xproc_predlog_log", {
      id: "evt-1",
      predictedSet: [0, 1],
    }) as { ok: boolean; pending?: number };
    expect(r.ok).toBe(true);
    expect(r.pending).toBe(1);
  });

  it("xproc_predlog_pair routes to pairAndRecord() through the monitor", () => {
    conformalPredictionLog("xproc_predlog_log", { id: "evt-1", predictedSet: [0] });
    const r = conformalPredictionLog("xproc_predlog_pair", {
      id: "evt-1",
      actualLabel: 0,
    }) as { ok: boolean; covered?: boolean };
    expect(r.ok).toBe(true);
    expect(r.covered).toBe(true);
  });

  it("xproc_predlog_status returns the snapshot", () => {
    const s = conformalPredictionLog("xproc_predlog_status", {}) as { pending: number };
    expect(s.pending).toBe(0);
  });

  it("xproc_predlog_pending_ids routes to pendingIds()", () => {
    conformalPredictionLog("xproc_predlog_log", { id: "evt-1", predictedSet: [0] });
    const r = conformalPredictionLog("xproc_predlog_pending_ids", {}) as { ids: string[] };
    expect(r.ids).toEqual(["evt-1"]);
  });

  it("xproc_predlog_prune routes to prune()", () => {
    const r = conformalPredictionLog("xproc_predlog_prune", {}) as {
      ok: boolean;
      evictedCount?: number;
    };
    expect(r.ok).toBe(true);
    expect(r.evictedCount).toBe(0);
  });

  it("xproc_predlog_configure routes to configure()", () => {
    const r = conformalPredictionLog("xproc_predlog_configure", {
      ttlMs: 60_000,
    }) as { ok: boolean; ttlMs?: number };
    expect(r.ok).toBe(true);
    expect(r.ttlMs).toBe(60_000);
  });

  it("xproc_predlog_enable_autosync + xproc_predlog_disable_autosync round-trip", () => {
    const e = conformalPredictionLog("xproc_predlog_enable_autosync", {}) as {
      ok: boolean;
      active?: boolean;
    };
    expect(e.ok).toBe(true);
    expect(e.active).toBe(true);
    const d = conformalPredictionLog("xproc_predlog_disable_autosync", {}) as {
      ok: boolean;
      removed?: boolean;
    };
    expect(d.ok).toBe(true);
    expect(d.removed).toBe(true);
  });

  it("xproc_predlog_reset wipes state", () => {
    conformalPredictionLog("xproc_predlog_log", { id: "x", predictedSet: [0] });
    conformalPredictionLog("xproc_predlog_reset", {});
    const s = conformalPredictionLog("xproc_predlog_status", {}) as { pending: number };
    expect(s.pending).toBe(0);
  });

  it("xproc_predlog_constants returns engine constants", () => {
    const c = conformalPredictionLog("xproc_predlog_constants", {}) as {
      MAX_PENDING: number;
    };
    expect(c.MAX_PENDING).toBe(100_000);
  });

  it("unknown action throws descriptively", () => {
    expect(() => conformalPredictionLog("not_a_real_action", {})).toThrow(/unknown action/);
  });
});
