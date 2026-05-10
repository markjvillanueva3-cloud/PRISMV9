/**
 * TribalKnowledgeOutcomeBridgeEngine.test.ts — XPROC-NEURAL-CONNECT-MS0 / U-CN04
 *
 * Verifies the bus → bucket → candidate-tip pipeline. The acceptance test
 * from the envelope:
 *   "Tests on 10-event corpus assert ≥ 1 candidate emitted."
 */
import { describe, it, expect, beforeEach } from "vitest";

import {
  TribalKnowledgeOutcomeBridgeEngine,
  tribalKnowledgeOutcomeBridgeDispatch,
} from "../engines/TribalKnowledgeOutcomeBridgeEngine.js";
import { feedbackBusEngine } from "../engines/FeedbackBusEngine.js";

const TOPIC = "outcome.recorded";

function buildEvent(opts: {
  id?: string;
  process?: string;
  material?: string;
  operation?: string;
  kind?: "success" | "failure" | "operator_override" | "pending";
}): Record<string, unknown> {
  return {
    id: opts.id ?? `evt-${Math.random().toString(36).slice(2, 10)}`,
    bridge: "sf",
    process: opts.process ?? "mill",
    request_summary: { material: opts.material ?? "steel", operation: opts.operation ?? "rough" },
    response_summary: {},
    outcome: { kind: opts.kind ?? "success" },
  };
}

async function flushBus(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

describe("TribalKnowledgeOutcomeBridgeEngine — U-CN04", () => {
  beforeEach(() => {
    TribalKnowledgeOutcomeBridgeEngine.reset();
    feedbackBusEngine.reset();
  });

  describe("subscription lifecycle", () => {
    it("subscribeToOutcomes is idempotent", () => {
      const r1 = TribalKnowledgeOutcomeBridgeEngine.subscribeToOutcomes();
      expect(r1.alreadySubscribed).toBe(false);
      const r2 = TribalKnowledgeOutcomeBridgeEngine.subscribeToOutcomes();
      expect(r2.alreadySubscribed).toBe(true);
      expect(TribalKnowledgeOutcomeBridgeEngine.isSubscribedToOutcomes()).toBe(true);
    });

    it("unsubscribeFromOutcomes is idempotent", () => {
      TribalKnowledgeOutcomeBridgeEngine.subscribeToOutcomes();
      const r1 = TribalKnowledgeOutcomeBridgeEngine.unsubscribeFromOutcomes();
      expect(r1.wasSubscribed).toBe(true);
      const r2 = TribalKnowledgeOutcomeBridgeEngine.unsubscribeFromOutcomes();
      expect(r2.wasSubscribed).toBe(false);
      expect(TribalKnowledgeOutcomeBridgeEngine.isSubscribedToOutcomes()).toBe(false);
    });

    it("registers exactly one bus subscriber regardless of repeat calls", () => {
      TribalKnowledgeOutcomeBridgeEngine.subscribeToOutcomes();
      TribalKnowledgeOutcomeBridgeEngine.subscribeToOutcomes();
      TribalKnowledgeOutcomeBridgeEngine.subscribeToOutcomes();
      expect(feedbackBusEngine.subscriberCount(TOPIC)).toBe(1);
    });
  });

  describe("event aggregation", () => {
    it("publishing 5 success events on the same bucket emits 1 candidate", async () => {
      TribalKnowledgeOutcomeBridgeEngine.subscribeToOutcomes();
      for (let i = 0; i < 5; i++) {
        feedbackBusEngine.publish(TOPIC, {
          record: buildEvent({ id: `s${i}`, process: "mill", material: "steel", operation: "rough", kind: "success" }),
        });
      }
      await flushBus();
      const stats = TribalKnowledgeOutcomeBridgeEngine.stats();
      expect(stats.total_candidates_emitted).toBe(1);
      const bucket = stats.buckets.find(b => b.process === "mill" && b.material === "steel");
      expect(bucket?.success_count).toBe(5);
      expect(bucket?.emitted_tip_ids.length).toBe(1);
    });

    it("4 successes do NOT emit (below threshold of 5)", async () => {
      TribalKnowledgeOutcomeBridgeEngine.subscribeToOutcomes();
      for (let i = 0; i < 4; i++) {
        feedbackBusEngine.publish(TOPIC, {
          record: buildEvent({ id: `s${i}`, kind: "success" }),
        });
      }
      await flushBus();
      const stats = TribalKnowledgeOutcomeBridgeEngine.stats();
      expect(stats.total_candidates_emitted).toBe(0);
    });

    it("envelope acceptance: 10-event corpus emits ≥ 1 candidate (10 successes on same bucket → 2)", async () => {
      TribalKnowledgeOutcomeBridgeEngine.subscribeToOutcomes();
      for (let i = 0; i < 10; i++) {
        feedbackBusEngine.publish(TOPIC, {
          record: buildEvent({ id: `s${i}`, kind: "success" }),
        });
      }
      await flushBus();
      const stats = TribalKnowledgeOutcomeBridgeEngine.stats();
      expect(stats.total_candidates_emitted).toBeGreaterThanOrEqual(1);
      // 10 / 5 = 2 emit boundaries (at counts 5 and 10).
      expect(stats.total_candidates_emitted).toBe(2);
    });

    it("3 failures on the same bucket signal one contradiction", async () => {
      TribalKnowledgeOutcomeBridgeEngine.subscribeToOutcomes();
      for (let i = 0; i < 3; i++) {
        feedbackBusEngine.publish(TOPIC, {
          record: buildEvent({ id: `f${i}`, kind: "failure" }),
        });
      }
      await flushBus();
      const stats = TribalKnowledgeOutcomeBridgeEngine.stats();
      expect(stats.total_contradictions_signaled).toBe(1);
      const bucket = stats.buckets[0];
      expect(bucket.failure_count).toBe(3);
      expect(bucket.contradiction_signaled_at.length).toBe(1);
    });

    it("pending and override events do NOT emit candidates or contradictions", async () => {
      TribalKnowledgeOutcomeBridgeEngine.subscribeToOutcomes();
      for (let i = 0; i < 10; i++) {
        feedbackBusEngine.publish(TOPIC, {
          record: buildEvent({ id: `p${i}`, kind: "pending" }),
        });
      }
      for (let i = 0; i < 10; i++) {
        feedbackBusEngine.publish(TOPIC, {
          record: buildEvent({ id: `o${i}`, kind: "operator_override" }),
        });
      }
      await flushBus();
      const stats = TribalKnowledgeOutcomeBridgeEngine.stats();
      expect(stats.total_candidates_emitted).toBe(0);
      expect(stats.total_contradictions_signaled).toBe(0);
      expect(stats.total_events_seen).toBe(20);
    });

    it("buckets are per (process, material, operation) tuple — different keys do not merge", async () => {
      TribalKnowledgeOutcomeBridgeEngine.subscribeToOutcomes();
      // 4 successes on mill/steel/rough
      for (let i = 0; i < 4; i++) {
        feedbackBusEngine.publish(TOPIC, {
          record: buildEvent({ id: `a${i}`, process: "mill", material: "steel", operation: "rough", kind: "success" }),
        });
      }
      // 4 successes on lathe/aluminum/finish — different bucket
      for (let i = 0; i < 4; i++) {
        feedbackBusEngine.publish(TOPIC, {
          record: buildEvent({ id: `b${i}`, process: "lathe", material: "aluminum", operation: "finish", kind: "success" }),
        });
      }
      await flushBus();
      const stats = TribalKnowledgeOutcomeBridgeEngine.stats();
      expect(stats.buckets.length).toBe(2);
      expect(stats.total_candidates_emitted).toBe(0); // neither bucket reached 5
    });

    it("malformed payload is silently swallowed without breaking subscription", async () => {
      TribalKnowledgeOutcomeBridgeEngine.subscribeToOutcomes();
      feedbackBusEngine.publish(TOPIC, "not-an-object");
      feedbackBusEngine.publish(TOPIC, null);
      feedbackBusEngine.publish(TOPIC, { record: null });
      feedbackBusEngine.publish(TOPIC, { record: { /* missing fields */ } });
      await flushBus();
      // subscription survives
      expect(TribalKnowledgeOutcomeBridgeEngine.isSubscribedToOutcomes()).toBe(true);
      // valid event still propagates afterward
      for (let i = 0; i < 5; i++) {
        feedbackBusEngine.publish(TOPIC, { record: buildEvent({ id: `g${i}`, kind: "success" }) });
      }
      await flushBus();
      expect(TribalKnowledgeOutcomeBridgeEngine.stats().total_candidates_emitted).toBe(1);
    });

    it("does NOT fire when unsubscribed", async () => {
      TribalKnowledgeOutcomeBridgeEngine.subscribeToOutcomes();
      TribalKnowledgeOutcomeBridgeEngine.unsubscribeFromOutcomes();
      for (let i = 0; i < 10; i++) {
        feedbackBusEngine.publish(TOPIC, { record: buildEvent({ id: `u${i}`, kind: "success" }) });
      }
      await flushBus();
      expect(TribalKnowledgeOutcomeBridgeEngine.stats().total_events_seen).toBe(0);
    });
  });

  describe("configure", () => {
    it("custom successThreshold = 3 emits at 3 successes instead of 5", async () => {
      TribalKnowledgeOutcomeBridgeEngine.configure({ successThreshold: 3 });
      TribalKnowledgeOutcomeBridgeEngine.subscribeToOutcomes();
      for (let i = 0; i < 3; i++) {
        feedbackBusEngine.publish(TOPIC, { record: buildEvent({ id: `s${i}`, kind: "success" }) });
      }
      await flushBus();
      expect(TribalKnowledgeOutcomeBridgeEngine.stats().total_candidates_emitted).toBe(1);
    });

    it("rejects non-integer thresholds", () => {
      const r = TribalKnowledgeOutcomeBridgeEngine.configure({ successThreshold: 1.5 });
      expect(r.ok).toBe(false);
    });

    it("rejects threshold < 1", () => {
      const r = TribalKnowledgeOutcomeBridgeEngine.configure({ failureThreshold: 0 });
      expect(r.ok).toBe(false);
    });
  });

  describe("dispatcher round-trip", () => {
    beforeEach(() => {
      tribalKnowledgeOutcomeBridgeDispatch("xproc_tribal_outcome_reset", {});
    });

    it("xproc_tribal_subscribe_outcomes round-trips with status check", () => {
      const sub = tribalKnowledgeOutcomeBridgeDispatch("xproc_tribal_subscribe_outcomes", {}) as {
        ok: boolean; alreadySubscribed: boolean;
      };
      expect(sub.ok).toBe(true);
      expect(sub.alreadySubscribed).toBe(false);
      const status = tribalKnowledgeOutcomeBridgeDispatch("xproc_tribal_outcome_subscription_status", {}) as {
        ok: boolean; subscribed: boolean;
      };
      expect(status.subscribed).toBe(true);
    });

    it("xproc_tribal_outcome_configure round-trips with new thresholds", () => {
      const r = tribalKnowledgeOutcomeBridgeDispatch("xproc_tribal_outcome_configure", {
        successThreshold: 7,
      }) as { ok: boolean; config: { successThreshold: number } };
      expect(r.ok).toBe(true);
      expect(r.config.successThreshold).toBe(7);
    });

    it("xproc_tribal_outcome_stats returns stats envelope", () => {
      const r = tribalKnowledgeOutcomeBridgeDispatch("xproc_tribal_outcome_stats", {}) as {
        ok: boolean; stats: { total_events_seen: number };
      };
      expect(r.ok).toBe(true);
      expect(r.stats.total_events_seen).toBe(0);
    });

    it("rejects unknown action via the dispatcher's default branch", () => {
      expect(() =>
        tribalKnowledgeOutcomeBridgeDispatch("xproc_tribal_outcome_BOGUS", {}),
      ).toThrow(/unknown action/);
    });
  });
});
