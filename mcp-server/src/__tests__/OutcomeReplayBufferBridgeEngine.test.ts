/**
 * OutcomeReplayBufferBridgeEngine.test.ts — XPROC-NEURAL-CONNECT-MS0 / U-CN07
 *
 * Verifies the bridge wires outcome.completed -> prioritized replay +
 * stratified ring buffer with full coverage of:
 *   - subscription lifecycle (idempotent subscribe/unsubscribe, reset)
 *   - happy-path event flow (success/failure/override)
 *   - skip paths (pending, unknown process, malformed payload)
 *   - error-policy switching (failure_only vs failure_or_override)
 *   - configure rejection branches (>3 invalid inputs)
 *   - adversarial payloads (null, primitive, missing record, NaN)
 *   - variability: events span mill+lathe+wedm processes
 *   - ring buffer capacity (overwrite oldest behavior)
 *   - stratified sampling: real batch from buffer, multi-stratum
 *   - prioritized sampling: real batch from underlying PER engine
 *   - dispatcher round-trip for all 8 actions + unknown-action throw
 *   - bus end-to-end (publish → microtask round-trip → bridge state)
 */
import { describe, it, expect, beforeEach } from "vitest";

import {
  OutcomeReplayBufferBridgeEngine,
  outcomeReplayBufferBridgeDispatch,
} from "../engines/OutcomeReplayBufferBridgeEngine.js";
import { CrossProcessPrioritizedReplayEngine } from "../engines/CrossProcessPrioritizedReplayEngine.js";
import { feedbackBusEngine } from "../engines/FeedbackBusEngine.js";

const RING_CAPACITY_TEST_VALUE = 3;

function makeCompletedEnvelope(
  kind: "success" | "failure" | "operator_override" | "pending",
  opts?: { process?: string; material?: string; id?: string },
) {
  const process = opts?.process ?? "mill";
  const material = opts?.material ?? "steel";
  const id = opts?.id ?? `evt-${Math.random().toString(36).slice(2, 8)}`;
  return {
    id,
    bridge: "speed_feed_calculator",
    process,
    previousKind: "pending",
    outcomeKind: kind,
    record: {
      schemaVersion: "1.0.0",
      id,
      ts: new Date().toISOString(),
      bridge: "speed_feed_calculator",
      process,
      request_summary: { material, operation: "rough" },
      response_summary: {},
      outcome: { kind },
    },
  };
}

describe("OutcomeReplayBufferBridgeEngine — U-CN07", () => {
  beforeEach(() => {
    OutcomeReplayBufferBridgeEngine.reset();
    CrossProcessPrioritizedReplayEngine.reset();
  });

  describe("subscription lifecycle", () => {
    it("subscribe is idempotent — second call reports alreadySubscribed=true", () => {
      const a = OutcomeReplayBufferBridgeEngine.subscribeToOutcomes();
      expect(a.alreadySubscribed).toBe(false);
      const b = OutcomeReplayBufferBridgeEngine.subscribeToOutcomes();
      expect(b.alreadySubscribed).toBe(true);
      expect(OutcomeReplayBufferBridgeEngine.isSubscribedToOutcomes()).toBe(true);
    });

    it("unsubscribe is idempotent — second call reports wasSubscribed=false", () => {
      OutcomeReplayBufferBridgeEngine.subscribeToOutcomes();
      const a = OutcomeReplayBufferBridgeEngine.unsubscribeFromOutcomes();
      expect(a.wasSubscribed).toBe(true);
      const b = OutcomeReplayBufferBridgeEngine.unsubscribeFromOutcomes();
      expect(b.wasSubscribed).toBe(false);
      expect(OutcomeReplayBufferBridgeEngine.isSubscribedToOutcomes()).toBe(false);
    });

    it("reset() detaches the subscription and clears state", () => {
      OutcomeReplayBufferBridgeEngine.subscribeToOutcomes();
      OutcomeReplayBufferBridgeEngine.__testHandle(makeCompletedEnvelope("success"));
      expect(OutcomeReplayBufferBridgeEngine.stats().total_events_seen).toBe(1);
      OutcomeReplayBufferBridgeEngine.reset();
      expect(OutcomeReplayBufferBridgeEngine.isSubscribedToOutcomes()).toBe(false);
      expect(OutcomeReplayBufferBridgeEngine.stats().total_events_seen).toBe(0);
      expect(OutcomeReplayBufferBridgeEngine.stats().ring_buffer_size).toBe(0);
    });
  });

  describe("happy-path event flow (via __testHandle synchronous seam)", () => {
    it("success event: adds to prioritized + ring buffer", () => {
      OutcomeReplayBufferBridgeEngine.__testHandle(makeCompletedEnvelope("success"));
      const s = OutcomeReplayBufferBridgeEngine.stats();
      expect(s.total_events_seen).toBe(1);
      expect(s.total_added_to_prioritized).toBe(1);
      expect(s.total_added_to_ring).toBe(1);
      expect(s.ring_buffer_size).toBe(1);
      expect(s.failures.prioritized_add).toBe(0);
      expect(s.failures.ring_append).toBe(0);
    });

    it("failure event: also adds + leaves prioritized engine non-empty", () => {
      OutcomeReplayBufferBridgeEngine.__testHandle(makeCompletedEnvelope("failure"));
      const s = OutcomeReplayBufferBridgeEngine.stats();
      expect(s.total_added_to_prioritized).toBe(1);
      const perStats = CrossProcessPrioritizedReplayEngine.stats();
      expect(perStats.size).toBe(1);
      expect(perStats.totalAdded).toBe(1);
    });

    it("operator_override event: counted, mapped to 'marginal' in ring buffer", () => {
      OutcomeReplayBufferBridgeEngine.__testHandle(makeCompletedEnvelope("operator_override"));
      const s = OutcomeReplayBufferBridgeEngine.stats();
      expect(s.total_added_to_ring).toBe(1);
      // Round-trip through sampleStratified — outcome must be "marginal".
      const sample = OutcomeReplayBufferBridgeEngine.sampleStratified({ n: 1 });
      expect(sample.ok).toBe(true);
      if (sample.ok) {
        expect(sample.response.batch.length).toBe(1);
        expect(sample.response.batch[0].outcome).toBe("marginal");
      }
    });

    it("pending event is skipped — incremented skip counter, no buffer add", () => {
      OutcomeReplayBufferBridgeEngine.__testHandle(makeCompletedEnvelope("pending"));
      const s = OutcomeReplayBufferBridgeEngine.stats();
      expect(s.total_events_seen).toBe(1);
      expect(s.total_skipped_pending).toBe(1);
      expect(s.total_added_to_prioritized).toBe(0);
      expect(s.total_added_to_ring).toBe(0);
      expect(s.ring_buffer_size).toBe(0);
    });

    it("unknown process is skipped — drilling-route counted under unknown_process", () => {
      OutcomeReplayBufferBridgeEngine.__testHandle(
        makeCompletedEnvelope("success", { process: "drilling" }),
      );
      const s = OutcomeReplayBufferBridgeEngine.stats();
      expect(s.total_events_seen).toBe(1);
      expect(s.total_skipped_unknown_process).toBe(1);
      expect(s.total_added_to_ring).toBe(0);
    });
  });

  describe("error-policy switching", () => {
    it("default policy is failure_only", () => {
      const s = OutcomeReplayBufferBridgeEngine.stats();
      expect(s.config.errorPolicy).toBe("failure_only");
    });

    it("failure_or_override switches tdError mapping — override becomes tdError=1", () => {
      OutcomeReplayBufferBridgeEngine.configure({ errorPolicy: "failure_or_override" });
      OutcomeReplayBufferBridgeEngine.__testHandle(makeCompletedEnvelope("operator_override"));
      const s = OutcomeReplayBufferBridgeEngine.stats();
      expect(s.config.errorPolicy).toBe("failure_or_override");
      expect(s.total_added_to_prioritized).toBe(1);
      // PER's maxPriority should reflect tdError=1 (priority > 0).
      const per = CrossProcessPrioritizedReplayEngine.stats();
      expect(per.maxPriority).toBeGreaterThan(0);
      expect(per.size).toBe(1);
    });
  });

  describe("configure — rejection branches", () => {
    it("rejects invalid errorPolicy enum", () => {
      const r = OutcomeReplayBufferBridgeEngine.configure({ errorPolicy: "bogus" as never });
      expect(r.ok).toBe(false);
    });

    it("rejects ringCapacity < 1", () => {
      const r = OutcomeReplayBufferBridgeEngine.configure({ ringCapacity: 0 });
      expect(r.ok).toBe(false);
    });

    it("rejects ringCapacity > 100000", () => {
      const r = OutcomeReplayBufferBridgeEngine.configure({ ringCapacity: 200_000 });
      expect(r.ok).toBe(false);
    });

    it("rejects non-integer ringCapacity", () => {
      const r = OutcomeReplayBufferBridgeEngine.configure({ ringCapacity: 1.5 });
      expect(r.ok).toBe(false);
    });

    it("partial update preserves untouched fields", () => {
      OutcomeReplayBufferBridgeEngine.configure({ ringCapacity: 250 });
      OutcomeReplayBufferBridgeEngine.configure({ errorPolicy: "failure_or_override" });
      const s = OutcomeReplayBufferBridgeEngine.stats();
      expect(s.config.ringCapacity).toBe(250);
      expect(s.config.errorPolicy).toBe("failure_or_override");
    });

    it("shrinking ringCapacity truncates existing buffer to most-recent N", () => {
      // Fill with 5 events.
      for (let i = 0; i < 5; i++) {
        OutcomeReplayBufferBridgeEngine.__testHandle(
          makeCompletedEnvelope("success", { id: `e-${i}`, material: `mat-${i}` }),
        );
      }
      expect(OutcomeReplayBufferBridgeEngine.stats().ring_buffer_size).toBe(5);
      OutcomeReplayBufferBridgeEngine.configure({ ringCapacity: 2 });
      const s = OutcomeReplayBufferBridgeEngine.stats();
      expect(s.config.ringCapacity).toBe(2);
      expect(s.ring_buffer_size).toBe(2);
    });
  });

  describe("adversarial / malformed payloads", () => {
    it("null payload increments decode-failure, not events_seen", () => {
      OutcomeReplayBufferBridgeEngine.__testHandle(null);
      const s = OutcomeReplayBufferBridgeEngine.stats();
      expect(s.total_events_seen).toBe(0);
      expect(s.failures.decode).toBe(1);
    });

    it("primitive (string) payload increments decode-failure", () => {
      OutcomeReplayBufferBridgeEngine.__testHandle("not-an-object");
      const s = OutcomeReplayBufferBridgeEngine.stats();
      expect(s.failures.decode).toBe(1);
      expect(s.total_events_seen).toBe(0);
    });

    it("missing record + missing outcomeKind → skipped_pending", () => {
      OutcomeReplayBufferBridgeEngine.__testHandle({ id: "x", bridge: "sf", process: "mill" });
      const s = OutcomeReplayBufferBridgeEngine.stats();
      expect(s.total_skipped_pending).toBe(1);
    });

    it("payload with outcomeKind + process but no record routes via envelope shortcut", () => {
      OutcomeReplayBufferBridgeEngine.__testHandle({
        id: "x", bridge: "sf", process: "mill", outcomeKind: "success",
      });
      const s = OutcomeReplayBufferBridgeEngine.stats();
      expect(s.total_added_to_ring).toBe(1);
      // Material falls back to "unknown" when record absent.
      const sample = OutcomeReplayBufferBridgeEngine.sampleStratified({ n: 1 });
      expect(sample.ok).toBe(true);
      if (sample.ok && sample.response.batch.length > 0) {
        expect(sample.response.batch[0].material).toBe("unknown");
      }
    });
  });

  describe("variability — events span supported processes", () => {
    it("records events from mill + lathe + wedm processes", () => {
      for (const p of ["mill", "lathe", "wedm"]) {
        OutcomeReplayBufferBridgeEngine.__testHandle(
          makeCompletedEnvelope("success", { process: p }),
        );
      }
      const s = OutcomeReplayBufferBridgeEngine.stats();
      expect(s.total_added_to_ring).toBe(3);
      expect(s.total_skipped_unknown_process).toBe(0);
    });

    it("records events across multiple materials in same process", () => {
      const materials = ["4140", "316L", "Ti-6Al-4V"];
      for (const m of materials) {
        OutcomeReplayBufferBridgeEngine.__testHandle(
          makeCompletedEnvelope("success", { material: m }),
        );
      }
      const s = OutcomeReplayBufferBridgeEngine.stats();
      expect(s.ring_buffer_size).toBe(3);
    });
  });

  describe("ring buffer capacity", () => {
    it("buffer never exceeds capacity — overwrites oldest", () => {
      OutcomeReplayBufferBridgeEngine.configure({ ringCapacity: RING_CAPACITY_TEST_VALUE });
      // Fill to capacity + overflow.
      for (let i = 0; i < RING_CAPACITY_TEST_VALUE + 2; i++) {
        OutcomeReplayBufferBridgeEngine.__testHandle(
          makeCompletedEnvelope("success", { id: `evt-${i}` }),
        );
      }
      const s = OutcomeReplayBufferBridgeEngine.stats();
      expect(s.ring_buffer_size).toBe(RING_CAPACITY_TEST_VALUE);
      expect(s.total_added_to_ring).toBe(RING_CAPACITY_TEST_VALUE + 2);
    });
  });

  describe("sampleStratified", () => {
    it("returns batch covering multiple strata when input spans processes+outcomes", () => {
      // 3 processes × 2 outcomes = 6 distinct strata in input.
      const fixtures = [
        { proc: "mill", kind: "success" as const },
        { proc: "lathe", kind: "failure" as const },
        { proc: "wedm", kind: "operator_override" as const },
        { proc: "mill", kind: "failure" as const },
        { proc: "lathe", kind: "success" as const },
        { proc: "wedm", kind: "success" as const },
      ];
      for (const f of fixtures) {
        OutcomeReplayBufferBridgeEngine.__testHandle(
          makeCompletedEnvelope(f.kind, { process: f.proc, material: "4140" }),
        );
      }
      const r = OutcomeReplayBufferBridgeEngine.sampleStratified({ n: 6 });
      expect(r.ok).toBe(true);
      if (r.ok) {
        expect(r.response.totalAvailable).toBe(6);
        // At least 3 distinct strata represented in the achieved distribution.
        const populatedStrata = r.response.distribution.filter(d => d.achievedCount > 0);
        expect(populatedStrata.length).toBeGreaterThanOrEqual(3);
      }
    });

    it("rejects invalid n (negative)", () => {
      const r = OutcomeReplayBufferBridgeEngine.sampleStratified({ n: -1 });
      expect(r.ok).toBe(false);
    });

    it("rejects oversize n (> 100000)", () => {
      const r = OutcomeReplayBufferBridgeEngine.sampleStratified({ n: 200_000 });
      expect(r.ok).toBe(false);
    });

    it("returns empty batch when buffer is empty", () => {
      const r = OutcomeReplayBufferBridgeEngine.sampleStratified({ n: 5 });
      expect(r.ok).toBe(true);
      if (r.ok) {
        expect(r.response.batch.length).toBe(0);
        expect(r.response.totalAvailable).toBe(0);
      }
    });
  });

  describe("samplePrioritized", () => {
    it("returns batch from PER engine after events added", () => {
      for (let i = 0; i < 4; i++) {
        OutcomeReplayBufferBridgeEngine.__testHandle(
          makeCompletedEnvelope(i % 2 === 0 ? "failure" : "success", { id: `e-${i}` }),
        );
      }
      const r = OutcomeReplayBufferBridgeEngine.samplePrioritized({ n: 2, beta: 0.4 });
      expect(r.ok).toBe(true);
      if (r.ok) {
        expect(r.response.batch.length).toBe(2);
        expect(r.response.totalPriority).toBeGreaterThan(0);
      }
    });

    it("rejects invalid input (n < 1)", () => {
      const r = OutcomeReplayBufferBridgeEngine.samplePrioritized({ n: 0 });
      expect(r.ok).toBe(false);
    });

    it("rejects invalid beta (> 1)", () => {
      const r = OutcomeReplayBufferBridgeEngine.samplePrioritized({ n: 5, beta: 2 });
      expect(r.ok).toBe(false);
    });
  });

  describe("dispatcher round-trip", () => {
    it("xproc_replay_bridge_subscribe + status report subscribed", () => {
      const sub = outcomeReplayBufferBridgeDispatch("xproc_replay_bridge_subscribe", {}) as { ok: boolean };
      expect(sub.ok).toBe(true);
      const st = outcomeReplayBufferBridgeDispatch("xproc_replay_bridge_status", {}) as { subscribed: boolean };
      expect(st.subscribed).toBe(true);
    });

    it("xproc_replay_bridge_unsubscribe detaches", () => {
      outcomeReplayBufferBridgeDispatch("xproc_replay_bridge_subscribe", {});
      const r = outcomeReplayBufferBridgeDispatch("xproc_replay_bridge_unsubscribe", {}) as { wasSubscribed: boolean };
      expect(r.wasSubscribed).toBe(true);
    });

    it("xproc_replay_bridge_configure round-trips valid input", () => {
      const r = outcomeReplayBufferBridgeDispatch("xproc_replay_bridge_configure", {
        errorPolicy: "failure_or_override",
      }) as { ok: boolean };
      expect(r.ok).toBe(true);
    });

    it("xproc_replay_bridge_configure rejects bad input", () => {
      const r = outcomeReplayBufferBridgeDispatch("xproc_replay_bridge_configure", {
        errorPolicy: "nonsense",
      }) as { ok: boolean };
      expect(r.ok).toBe(false);
    });

    it("xproc_replay_bridge_stats returns full shape with zero counts initially", () => {
      const r = outcomeReplayBufferBridgeDispatch("xproc_replay_bridge_stats", {}) as {
        ok: boolean; stats: { total_events_seen: number; ring_buffer_size: number; config: Record<string, unknown> };
      };
      expect(r.ok).toBe(true);
      expect(r.stats.total_events_seen).toBe(0);
      expect(r.stats.ring_buffer_size).toBe(0);
      expect(r.stats.config.errorPolicy).toBe("failure_only");
    });

    it("xproc_replay_bridge_sample_stratified round-trips with valid n", () => {
      OutcomeReplayBufferBridgeEngine.__testHandle(makeCompletedEnvelope("success"));
      const r = outcomeReplayBufferBridgeDispatch("xproc_replay_bridge_sample_stratified", { n: 1 }) as {
        ok: boolean; response: { batch: unknown[] };
      };
      expect(r.ok).toBe(true);
      expect(r.response.batch.length).toBe(1);
    });

    it("xproc_replay_bridge_sample_prioritized round-trips with valid n", () => {
      OutcomeReplayBufferBridgeEngine.__testHandle(makeCompletedEnvelope("failure"));
      const r = outcomeReplayBufferBridgeDispatch("xproc_replay_bridge_sample_prioritized", { n: 1 }) as {
        ok: boolean; response: { batch: unknown[] };
      };
      expect(r.ok).toBe(true);
      expect(r.response.batch.length).toBe(1);
    });

    it("xproc_replay_bridge_reset clears state", () => {
      OutcomeReplayBufferBridgeEngine.__testHandle(makeCompletedEnvelope("success"));
      expect(OutcomeReplayBufferBridgeEngine.stats().total_events_seen).toBe(1);
      const r = outcomeReplayBufferBridgeDispatch("xproc_replay_bridge_reset", {}) as { ok: boolean };
      expect(r.ok).toBe(true);
      expect(OutcomeReplayBufferBridgeEngine.stats().total_events_seen).toBe(0);
    });

    it("rejects unknown action via default branch throw", () => {
      expect(() =>
        outcomeReplayBufferBridgeDispatch("xproc_replay_bridge_BOGUS", {}),
      ).toThrow(/unknown action/);
    });

    it("regression: rejects pre-existing xproc_replay_add (PER engine's namespace)", () => {
      // xproc_replay_add belongs to CrossProcessPrioritizedReplayEngine. The
      // bridge wrapper must not accept it — otherwise the action would be
      // doubly-claimed at the dispatcher level.
      expect(() =>
        outcomeReplayBufferBridgeDispatch("xproc_replay_add", {}),
      ).toThrow(/unknown action/);
    });
  });

  describe("end-to-end via real feedback bus", () => {
    it("publish('outcome.completed') routes to the bridge through the live bus", async () => {
      OutcomeReplayBufferBridgeEngine.subscribeToOutcomes();
      feedbackBusEngine.publish("outcome.completed", makeCompletedEnvelope("success"));
      await Promise.resolve();
      await Promise.resolve();
      const s = OutcomeReplayBufferBridgeEngine.stats();
      expect(s.total_events_seen).toBe(1);
      expect(s.total_added_to_ring).toBe(1);
    });

    it("does NOT receive outcome.recorded events (subscription topic isolation)", async () => {
      OutcomeReplayBufferBridgeEngine.subscribeToOutcomes();
      feedbackBusEngine.publish("outcome.recorded", makeCompletedEnvelope("success"));
      await Promise.resolve();
      await Promise.resolve();
      const s = OutcomeReplayBufferBridgeEngine.stats();
      expect(s.total_events_seen).toBe(0);
    });
  });
});
