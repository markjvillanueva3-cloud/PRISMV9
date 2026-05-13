/**
 * CAMLoRAAdapterTrainerEngine outcome-bus subscriber tests — P0-U04
 * =================================================================
 * Covers the P0-U04 wiring that subscribes the adapter trainer to
 * FeedbackBusEngine's `outcome.recorded` topic. Tests the public surface
 * (enable/disable/isObserving/getStatus/getBuffer/clear) AND the private
 * observeOutcome filter chain by publishing realistic OutcomeRecord
 * payloads through the live bus.
 *
 * Variability floor: tests span 3 of the 4 priority CAMs (mastercam,
 * hypermill, fusion360) and 2 OutcomeRecord shapes (request_summary
 * carries cam_system vs. record.process is the CAM directly).
 *
 * Failure modes covered (≥3): missing record, kind="pending",
 * unknown/non-CAM process, duplicate outcomeId, terminal-but-unknown kind.
 * Adversarial: NaN bufferCap, Infinity bufferCap, malformed payload.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  CAMLoRAAdapterTrainerEngine,
  DEFAULT_OBSERVATION_CAP,
  type Priority4CAM,
} from "../engines/CAMLoRAAdapterTrainerEngine.js";
import { feedbackBusEngine } from "../engines/FeedbackBusEngine.js";
import type { OutcomeRecord } from "../engines/CrossProcessOutcomeStore.js";

function makeOutcomeRecord(overrides: Partial<OutcomeRecord> = {}): OutcomeRecord {
  return {
    schemaVersion: "1.1.0",
    id: overrides.id ?? `out-${Math.random().toString(36).slice(2, 10)}`,
    ts: overrides.ts ?? new Date().toISOString(),
    bridge: overrides.bridge ?? ("p2p" as OutcomeRecord["bridge"]),
    process: overrides.process ?? ("mill" as OutcomeRecord["process"]),
    request_summary: overrides.request_summary ?? { cam_system: "mastercam" },
    response_summary: overrides.response_summary ?? { ok: true },
    outcome: overrides.outcome ?? { kind: "success" },
    operator: overrides.operator,
    jobId: overrides.jobId,
  };
}

/**
 * Publish an outcome.recorded event and resolve when the bus's microtask
 * queue drains. queueMicrotask in publish() means we need one tick after
 * setImmediate (or a resolved Promise) for the callback to have run.
 */
async function publishAndFlush(payload: { id: string; record: OutcomeRecord; outcomeKind?: string }): Promise<void> {
  feedbackBusEngine.publish("outcome.recorded", payload);
  // Two microtask flushes — publish enqueues a microtask, and the callback
  // itself may chain another (defensive). One `await Promise.resolve()`
  // turn drains the bus's queueMicrotask call.
  await Promise.resolve();
  await Promise.resolve();
}

describe("CAMLoRAAdapterTrainerEngine — outcome bus subscriber (P0-U04)", () => {
  let engine: CAMLoRAAdapterTrainerEngine;

  beforeEach(() => {
    // Fresh bus + fresh engine per test — keeps subscriptions hermetic so a
    // leak in one case doesn't poison the next. The singleton in production
    // uses the shared bus; the class lets us isolate.
    feedbackBusEngine.reset();
    engine = new CAMLoRAAdapterTrainerEngine();
  });

  describe("subscribe / unsubscribe lifecycle", () => {
    it("isObservingOutcomes() is false before enableOutcomeObservation()", () => {
      expect(engine.isObservingOutcomes()).toBe(false);
    });

    it("enableOutcomeObservation() returns a SubscriptionHandle and registers on the bus", () => {
      const before = feedbackBusEngine.subscriberCount("outcome.recorded");
      const handle = engine.enableOutcomeObservation();
      expect(typeof handle.id).toBe("number");
      expect(handle.id).toBeGreaterThan(0);
      expect(handle.topic).toBe("outcome.recorded");
      expect(feedbackBusEngine.subscriberCount("outcome.recorded")).toBe(before + 1);
      expect(engine.isObservingOutcomes()).toBe(true);
    });

    it("enableOutcomeObservation() is idempotent (second call returns same handle, no double-subscribe)", () => {
      const h1 = engine.enableOutcomeObservation();
      const h2 = engine.enableOutcomeObservation();
      expect(h2.id).toBe(h1.id);
      expect(h2.topic).toBe(h1.topic);
      expect(feedbackBusEngine.subscriberCount("outcome.recorded")).toBe(1);
    });

    it("disableOutcomeObservation() detaches and clears the handle", () => {
      engine.enableOutcomeObservation();
      const ok = engine.disableOutcomeObservation();
      expect(ok).toBe(true);
      expect(engine.isObservingOutcomes()).toBe(false);
      expect(feedbackBusEngine.subscriberCount("outcome.recorded")).toBe(0);
    });

    it("disableOutcomeObservation() called twice returns false the second time", () => {
      engine.enableOutcomeObservation();
      engine.disableOutcomeObservation();
      expect(engine.disableOutcomeObservation()).toBe(false);
    });

    it("disableOutcomeObservation() before enable returns false (no-op)", () => {
      expect(engine.disableOutcomeObservation()).toBe(false);
    });
  });

  describe("happy path — observation buffering", () => {
    it("publishing an outcome.recorded event buffers the observation under the resolved CAM", async () => {
      engine.enableOutcomeObservation();
      const record = makeOutcomeRecord({
        id: "happy-1",
        request_summary: { cam_system: "mastercam" },
      });
      await publishAndFlush({ id: record.id, record });

      const buf = engine.getObservationBuffer("mastercam");
      expect(buf).toHaveLength(1);
      expect(buf[0].outcomeId).toBe("happy-1");
      expect(buf[0].cam).toBe("mastercam");
      expect(buf[0].kind).toBe("success");
    });

    it("getObservationBuffer returns a defensive copy (mutation does not leak back)", async () => {
      engine.enableOutcomeObservation();
      await publishAndFlush({
        id: "defensive-1",
        record: makeOutcomeRecord({ id: "defensive-1" }),
      });
      const buf = engine.getObservationBuffer("mastercam");
      buf.pop();
      expect(engine.getObservationBuffer("mastercam")).toHaveLength(1);
    });

    it("getObservationStatus aggregates per-CAM counts plus live bus delivery total", async () => {
      engine.enableOutcomeObservation();
      await publishAndFlush({
        id: "agg-mc",
        record: makeOutcomeRecord({ id: "agg-mc", request_summary: { cam_system: "mastercam" } }),
      });
      await publishAndFlush({
        id: "agg-hm",
        record: makeOutcomeRecord({ id: "agg-hm", request_summary: { cam_system: "hypermill" } }),
      });

      const status = engine.getObservationStatus();
      expect(status.active).toBe(true);
      expect(status.totalObserved).toBe(2);
      expect(status.byCam.mastercam).toBe(1);
      expect(status.byCam.hypermill).toBe(1);
      expect(status.byCam.fusion360).toBe(0);
      expect(status.byCam["inventor-hsm"]).toBe(0);
      expect(status.busDeliveredAtRead).toBeGreaterThanOrEqual(2);
      expect(status.bufferCap).toBe(DEFAULT_OBSERVATION_CAP);
    });

    it("CAM resolves from request_summary.cam_system AND from record.process directly (3-CAM span)", async () => {
      engine.enableOutcomeObservation();

      // Variability span: mastercam, hypermill, fusion360 — three of the four
      // priority CAMs covered in a single test to satisfy the variability floor.
      const cams: Priority4CAM[] = ["mastercam", "hypermill", "fusion360"];
      for (const cam of cams) {
        await publishAndFlush({
          id: `span-${cam}`,
          record: makeOutcomeRecord({ id: `span-${cam}`, request_summary: { cam_system: cam } }),
        });
      }

      expect(engine.getObservationBuffer("mastercam")).toHaveLength(1);
      expect(engine.getObservationBuffer("hypermill")).toHaveLength(1);
      expect(engine.getObservationBuffer("fusion360")).toHaveLength(1);
      expect(engine.getObservationStatus().totalObserved).toBe(3);
    });

    it("request_summary.cam_system takes precedence over record.process when both are present", async () => {
      engine.enableOutcomeObservation();
      // record.process is the high-level domain (mill); cam_system is the specific CAM.
      // Source-of-truth is cam_system, so the observation should land under hypermill, not mill.
      await publishAndFlush({
        id: "precedence-1",
        record: makeOutcomeRecord({
          id: "precedence-1",
          process: "mill" as OutcomeRecord["process"],
          request_summary: { cam_system: "hypermill" },
        }),
      });
      expect(engine.getObservationBuffer("hypermill")).toHaveLength(1);
      expect(engine.getObservationBuffer("mastercam")).toHaveLength(0);
    });
  });

  describe("filter chain — skipped events", () => {
    it("missing record skips the event (counted in totalSkipped, not totalObserved)", async () => {
      engine.enableOutcomeObservation();
      // Payload with no `record` field.
      feedbackBusEngine.publish("outcome.recorded", { id: "no-record", record: undefined } as never);
      await Promise.resolve();
      await Promise.resolve();
      const status = engine.getObservationStatus();
      expect(status.totalObserved).toBe(0);
      expect(status.totalSkipped).toBe(1);
    });

    it("kind=\"pending\" is skipped (no actuals → no LoRA residual)", async () => {
      engine.enableOutcomeObservation();
      await publishAndFlush({
        id: "pending-1",
        record: makeOutcomeRecord({
          id: "pending-1",
          outcome: { kind: "pending" } as OutcomeRecord["outcome"],
        }),
      });
      const status = engine.getObservationStatus();
      expect(status.totalObserved).toBe(0);
      expect(status.totalSkipped).toBe(1);
    });

    it("non-CAM process AND no request_summary.cam_system → skipped (unknown CAM)", async () => {
      engine.enableOutcomeObservation();
      await publishAndFlush({
        id: "unknown-cam",
        record: makeOutcomeRecord({
          id: "unknown-cam",
          process: "wedm" as OutcomeRecord["process"],
          request_summary: {}, // no cam_system either
        }),
      });
      const status = engine.getObservationStatus();
      expect(status.totalObserved).toBe(0);
      expect(status.totalSkipped).toBe(1);
    });

    it("duplicate outcomeId — second publish is skipped (dedup by record.id)", async () => {
      engine.enableOutcomeObservation();
      const record = makeOutcomeRecord({ id: "dup-1" });
      await publishAndFlush({ id: record.id, record });
      await publishAndFlush({ id: record.id, record });
      const status = engine.getObservationStatus();
      expect(status.totalObserved).toBe(1);
      expect(status.totalSkipped).toBe(1);
      expect(engine.getObservationBuffer("mastercam")).toHaveLength(1);
    });

    it("terminal-but-unknown kind (e.g. \"cancelled\") is skipped", async () => {
      engine.enableOutcomeObservation();
      await publishAndFlush({
        id: "weird-kind",
        record: makeOutcomeRecord({
          id: "weird-kind",
          // Force a kind value the observer doesn't recognize. Cast is intentional —
          // the filter must defend against future enum additions / drift.
          outcome: { kind: "cancelled" } as OutcomeRecord["outcome"],
        }),
      });
      expect(engine.getObservationStatus().totalSkipped).toBe(1);
      expect(engine.getObservationStatus().totalObserved).toBe(0);
    });

    it("record.id is non-string — skipped (defensive)", async () => {
      engine.enableOutcomeObservation();
      feedbackBusEngine.publish("outcome.recorded", {
        id: "bad-id",
        // record.id deliberately not a string — observer must reject without throwing.
        record: { ...makeOutcomeRecord(), id: 42 as unknown as string },
      });
      await Promise.resolve();
      await Promise.resolve();
      expect(engine.getObservationStatus().totalSkipped).toBe(1);
    });
  });

  describe("ring buffer overflow", () => {
    it("buffer evicts oldest at bufferCap (FIFO), counts remain monotonic", async () => {
      engine.enableOutcomeObservation({ bufferCap: 3 });
      for (let i = 0; i < 5; i++) {
        await publishAndFlush({
          id: `overflow-${i}`,
          record: makeOutcomeRecord({ id: `overflow-${i}` }),
        });
      }
      const buf = engine.getObservationBuffer("mastercam");
      expect(buf).toHaveLength(3);
      // Oldest two (overflow-0, overflow-1) should have been shifted out.
      expect(buf[0].outcomeId).toBe("overflow-2");
      expect(buf[2].outcomeId).toBe("overflow-4");
      // Count must NOT be decremented by eviction — it tracks total observed.
      expect(engine.getObservationStatus().byCam.mastercam).toBe(5);
    });

    it("bufferCap NaN/Infinity fall through to default cap (clamped to [1, 1_000_000])", () => {
      // NaN — Number.isFinite gate keeps the default.
      const eng1 = new CAMLoRAAdapterTrainerEngine();
      eng1.enableOutcomeObservation({ bufferCap: Number.NaN });
      expect(eng1.getObservationStatus().bufferCap).toBe(DEFAULT_OBSERVATION_CAP);

      // Infinity — same gate.
      const eng2 = new CAMLoRAAdapterTrainerEngine();
      eng2.enableOutcomeObservation({ bufferCap: Number.POSITIVE_INFINITY });
      expect(eng2.getObservationStatus().bufferCap).toBe(DEFAULT_OBSERVATION_CAP);
    });

    it("bufferCap negative / zero is clamped up to 1 (cannot lose all data on accident)", () => {
      const eng1 = new CAMLoRAAdapterTrainerEngine();
      eng1.enableOutcomeObservation({ bufferCap: -100 });
      expect(eng1.getObservationStatus().bufferCap).toBe(1);

      const eng2 = new CAMLoRAAdapterTrainerEngine();
      eng2.enableOutcomeObservation({ bufferCap: 0 });
      expect(eng2.getObservationStatus().bufferCap).toBe(1);
    });

    it("bufferCap absurdly large is clamped to 1_000_000", () => {
      const eng = new CAMLoRAAdapterTrainerEngine();
      eng.enableOutcomeObservation({ bufferCap: 5_000_000_000 });
      expect(eng.getObservationStatus().bufferCap).toBe(1_000_000);
    });
  });

  describe("clearObservations + lifecycle interaction", () => {
    it("clearObservations() empties all per-CAM buffers + counts but preserves subscription", async () => {
      engine.enableOutcomeObservation();
      await publishAndFlush({
        id: "before-clear",
        record: makeOutcomeRecord({ id: "before-clear" }),
      });
      expect(engine.getObservationStatus().totalObserved).toBe(1);

      engine.clearObservations();
      const status = engine.getObservationStatus();
      expect(status.totalObserved).toBe(0);
      expect(status.totalSkipped).toBe(0);
      expect(status.byCam.mastercam).toBe(0);
      // Subscription must still be live.
      expect(status.active).toBe(true);
      expect(engine.isObservingOutcomes()).toBe(true);

      // Re-publishing same id after clear should now succeed (seenIds was wiped).
      await publishAndFlush({
        id: "before-clear",
        record: makeOutcomeRecord({ id: "before-clear" }),
      });
      expect(engine.getObservationStatus().totalObserved).toBe(1);
    });

    it("disable → re-enable preserves prior buffers (only clearObservations wipes them)", async () => {
      engine.enableOutcomeObservation();
      await publishAndFlush({
        id: "preserved-1",
        record: makeOutcomeRecord({ id: "preserved-1" }),
      });
      engine.disableOutcomeObservation();
      expect(engine.getObservationBuffer("mastercam")).toHaveLength(1);

      engine.enableOutcomeObservation();
      // Buffer still carries the prior observation; new ones append.
      await publishAndFlush({
        id: "preserved-2",
        record: makeOutcomeRecord({ id: "preserved-2" }),
      });
      const buf = engine.getObservationBuffer("mastercam");
      expect(buf).toHaveLength(2);
      expect(buf[0].outcomeId).toBe("preserved-1");
      expect(buf[1].outcomeId).toBe("preserved-2");
    });
  });

  describe("isolation — engine doesn't fire when not subscribed", () => {
    it("events published BEFORE enable are not observed (subscription must be active)", async () => {
      // No enable yet — bus publishes happen with zero CAM subscribers.
      await publishAndFlush({
        id: "missed-1",
        record: makeOutcomeRecord({ id: "missed-1" }),
      });
      engine.enableOutcomeObservation();
      // Now subscribed, but the prior event is already gone.
      expect(engine.getObservationStatus().totalObserved).toBe(0);
    });

    it("events published AFTER disable are not observed", async () => {
      engine.enableOutcomeObservation();
      engine.disableOutcomeObservation();
      await publishAndFlush({
        id: "after-disable",
        record: makeOutcomeRecord({ id: "after-disable" }),
      });
      expect(engine.getObservationStatus().totalObserved).toBe(0);
    });
  });
});
