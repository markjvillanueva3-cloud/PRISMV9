/**
 * OutcomeEpisodicMemoryBridgeEngine.test.ts — XPROC-NEURAL-CONNECT-MS0 / U-CN08
 *
 * Verifies the bridge wires outcome.completed -> CrossProcessEpisodicMemoryEngine.store
 * with full coverage of:
 *   - subscription lifecycle
 *   - happy path event flow (success/failure/override)
 *   - key derivation (process/material/feature/decision)
 *   - features extraction (numeric fields prefixed req_/rsp_, non-numeric dropped)
 *   - skip paths (pending, unknown process, malformed payload)
 *   - configure rejection branches
 *   - adversarial payloads
 *   - variability: events span mill+lathe+wedm
 *   - recall round-trip
 *   - feature-count cap
 *   - dispatcher round-trip + namespace regression
 *   - bus end-to-end
 */
import { describe, it, expect, beforeEach } from "vitest";

import {
  OutcomeEpisodicMemoryBridgeEngine,
  outcomeEpisodicMemoryBridgeDispatch,
} from "../engines/OutcomeEpisodicMemoryBridgeEngine.js";
import { CrossProcessEpisodicMemoryEngine } from "../engines/CrossProcessEpisodicMemoryEngine.js";
import { feedbackBusEngine } from "../engines/FeedbackBusEngine.js";

function makeCompletedEnvelope(
  kind: "success" | "failure" | "operator_override" | "pending",
  opts?: {
    process?: string;
    material?: string;
    operation?: string;
    decision?: string;
    extraReq?: Record<string, unknown>;
    extraRsp?: Record<string, unknown>;
    id?: string;
  },
) {
  const process = opts?.process ?? "mill";
  const material = opts?.material ?? "steel";
  const operation = opts?.operation ?? "rough";
  const id = opts?.id ?? `evt-${Math.random().toString(36).slice(2, 8)}`;
  const request_summary: Record<string, unknown> = {
    material,
    operation,
    ...(opts?.decision ? { decision: opts.decision } : {}),
    ...(opts?.extraReq ?? {}),
  };
  const response_summary: Record<string, unknown> = opts?.extraRsp ?? {};
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
      request_summary,
      response_summary,
      outcome: { kind },
    },
  };
}

describe("OutcomeEpisodicMemoryBridgeEngine — U-CN08", () => {
  beforeEach(() => {
    OutcomeEpisodicMemoryBridgeEngine.reset();
    CrossProcessEpisodicMemoryEngine.reset();
  });

  describe("subscription lifecycle", () => {
    it("subscribe is idempotent — second call reports alreadySubscribed=true", () => {
      const a = OutcomeEpisodicMemoryBridgeEngine.subscribeToOutcomes();
      expect(a.alreadySubscribed).toBe(false);
      const b = OutcomeEpisodicMemoryBridgeEngine.subscribeToOutcomes();
      expect(b.alreadySubscribed).toBe(true);
      expect(OutcomeEpisodicMemoryBridgeEngine.isSubscribedToOutcomes()).toBe(true);
    });

    it("unsubscribe is idempotent — second call reports wasSubscribed=false", () => {
      OutcomeEpisodicMemoryBridgeEngine.subscribeToOutcomes();
      const a = OutcomeEpisodicMemoryBridgeEngine.unsubscribeFromOutcomes();
      expect(a.wasSubscribed).toBe(true);
      const b = OutcomeEpisodicMemoryBridgeEngine.unsubscribeFromOutcomes();
      expect(b.wasSubscribed).toBe(false);
      expect(OutcomeEpisodicMemoryBridgeEngine.isSubscribedToOutcomes()).toBe(false);
    });

    it("reset() detaches subscription and clears state", () => {
      OutcomeEpisodicMemoryBridgeEngine.subscribeToOutcomes();
      OutcomeEpisodicMemoryBridgeEngine.__testHandle(makeCompletedEnvelope("success"));
      expect(OutcomeEpisodicMemoryBridgeEngine.stats().total_events_seen).toBe(1);
      OutcomeEpisodicMemoryBridgeEngine.reset();
      expect(OutcomeEpisodicMemoryBridgeEngine.isSubscribedToOutcomes()).toBe(false);
      expect(OutcomeEpisodicMemoryBridgeEngine.stats().total_events_seen).toBe(0);
    });
  });

  describe("happy-path event flow", () => {
    it("success event stores one episode with episodic outcome=success", () => {
      OutcomeEpisodicMemoryBridgeEngine.__testHandle(makeCompletedEnvelope("success"));
      const s = OutcomeEpisodicMemoryBridgeEngine.stats();
      expect(s.total_events_seen).toBe(1);
      expect(s.total_stored).toBe(1);
      expect(s.failures.episodic_store).toBe(0);
      const mem = CrossProcessEpisodicMemoryEngine.stats();
      expect(mem.total).toBe(1);
    });

    it("failure event stores with episodic outcome=fail", () => {
      OutcomeEpisodicMemoryBridgeEngine.__testHandle(makeCompletedEnvelope("failure"));
      expect(OutcomeEpisodicMemoryBridgeEngine.stats().total_stored).toBe(1);
      const r = CrossProcessEpisodicMemoryEngine.recall({
        key: { process: "mill", material: "steel", feature: "rough", decision: "approved" },
        n: 1,
      });
      expect(r.episodes.length).toBe(1);
      expect(r.episodes[0].episode.outcome).toBe("fail");
    });

    it("operator_override event maps to episodic outcome=marginal", () => {
      OutcomeEpisodicMemoryBridgeEngine.__testHandle(makeCompletedEnvelope("operator_override"));
      const r = CrossProcessEpisodicMemoryEngine.recall({
        key: { process: "mill", material: "steel", feature: "rough", decision: "approved" },
        n: 1,
      });
      expect(r.episodes.length).toBe(1);
      expect(r.episodes[0].episode.outcome).toBe("marginal");
    });

    it("pending event is skipped — no store, skipped_pending++", () => {
      OutcomeEpisodicMemoryBridgeEngine.__testHandle(makeCompletedEnvelope("pending"));
      const s = OutcomeEpisodicMemoryBridgeEngine.stats();
      expect(s.total_skipped_pending).toBe(1);
      expect(s.total_stored).toBe(0);
    });

    it("unknown process is skipped — drilling not in mill/lathe/wedm", () => {
      OutcomeEpisodicMemoryBridgeEngine.__testHandle(
        makeCompletedEnvelope("success", { process: "drilling" }),
      );
      const s = OutcomeEpisodicMemoryBridgeEngine.stats();
      expect(s.total_skipped_unknown_process).toBe(1);
      expect(s.total_stored).toBe(0);
    });
  });

  describe("key derivation", () => {
    it("uses default decision=approved when request_summary has no decision", () => {
      OutcomeEpisodicMemoryBridgeEngine.__testHandle(makeCompletedEnvelope("success"));
      const r = CrossProcessEpisodicMemoryEngine.recall({
        key: { process: "mill", material: "steel", feature: "rough", decision: "approved" },
        n: 1,
      });
      expect(r.episodes.length).toBe(1);
      expect(r.episodes[0].episode.key.decision).toBe("approved");
    });

    it("honors explicit decision from request_summary", () => {
      OutcomeEpisodicMemoryBridgeEngine.__testHandle(
        makeCompletedEnvelope("success", { decision: "vetoed" }),
      );
      const r = CrossProcessEpisodicMemoryEngine.recall({
        key: { process: "mill", material: "steel", feature: "rough", decision: "vetoed" },
        n: 1,
      });
      expect(r.episodes.length).toBe(1);
      expect(r.episodes[0].episode.key.decision).toBe("vetoed");
    });

    it("falls back to 'unknown' when material/operation missing", () => {
      OutcomeEpisodicMemoryBridgeEngine.__testHandle({
        id: "x",
        bridge: "sf",
        process: "mill",
        outcomeKind: "success",
        record: { process: "mill", request_summary: {}, response_summary: {}, outcome: { kind: "success" } },
      });
      const r = CrossProcessEpisodicMemoryEngine.recall({
        key: { process: "mill", material: "unknown", feature: "unknown", decision: "approved" },
        n: 1,
      });
      expect(r.episodes.length).toBe(1);
      expect(r.episodes[0].episode.key.material).toBe("unknown");
      expect(r.episodes[0].episode.key.feature).toBe("unknown");
    });

    it("ignores invalid decision values, falls back to default", () => {
      OutcomeEpisodicMemoryBridgeEngine.__testHandle(
        makeCompletedEnvelope("success", { decision: "garbage" }),
      );
      const r = CrossProcessEpisodicMemoryEngine.recall({
        key: { process: "mill", material: "steel", feature: "rough", decision: "approved" },
        n: 1,
      });
      expect(r.episodes.length).toBe(1);
      expect(r.episodes[0].episode.key.decision).toBe("approved");
    });
  });

  describe("features extraction", () => {
    it("extracts numeric fields from request_summary with req_ prefix", () => {
      OutcomeEpisodicMemoryBridgeEngine.__testHandle(
        makeCompletedEnvelope("success", { extraReq: { tool_diameter_mm: 6, depth_mm: 2.5 } }),
      );
      const r = CrossProcessEpisodicMemoryEngine.recall({
        key: { process: "mill", material: "steel", feature: "rough", decision: "approved" },
        n: 1,
      });
      expect(r.episodes.length).toBe(1);
      expect(r.episodes[0].episode.features.req_tool_diameter_mm).toBe(6);
      expect(r.episodes[0].episode.features.req_depth_mm).toBe(2.5);
    });

    it("extracts numeric fields from response_summary with rsp_ prefix", () => {
      OutcomeEpisodicMemoryBridgeEngine.__testHandle(
        makeCompletedEnvelope("success", { extraRsp: { mrr_cm3_min: 12.3, cycle_time_s: 45 } }),
      );
      const r = CrossProcessEpisodicMemoryEngine.recall({
        key: { process: "mill", material: "steel", feature: "rough", decision: "approved" },
        n: 1,
      });
      expect(r.episodes.length).toBe(1);
      expect(r.episodes[0].episode.features.rsp_mrr_cm3_min).toBe(12.3);
      expect(r.episodes[0].episode.features.rsp_cycle_time_s).toBe(45);
    });

    it("drops non-numeric and non-finite values (feature count stays minimal)", () => {
      OutcomeEpisodicMemoryBridgeEngine.__testHandle(
        makeCompletedEnvelope("success", {
          extraReq: {
            tool_diameter_mm: 6,         // numeric — kept
            tool_name: "endmill_carbide", // string — dropped
            invalid_nan: NaN,             // non-finite — dropped
            invalid_inf: Infinity,        // non-finite — dropped
          },
        }),
      );
      const r = CrossProcessEpisodicMemoryEngine.recall({
        key: { process: "mill", material: "steel", feature: "rough", decision: "approved" },
        n: 1,
      });
      expect(r.episodes.length).toBe(1);
      const featKeys = Object.keys(r.episodes[0].episode.features).sort();
      // Only the one finite-numeric req field survives — everything else dropped.
      expect(featKeys).toEqual(["req_tool_diameter_mm"]);
      expect(r.episodes[0].episode.features.req_tool_diameter_mm).toBe(6);
    });

    it("respects maxFeatureCount cap exactly", () => {
      OutcomeEpisodicMemoryBridgeEngine.configure({ maxFeatureCount: 3 });
      const extraReq: Record<string, unknown> = {};
      for (let i = 0; i < 10; i++) extraReq[`feat_${i}`] = i;
      OutcomeEpisodicMemoryBridgeEngine.__testHandle(
        makeCompletedEnvelope("success", { extraReq }),
      );
      const r = CrossProcessEpisodicMemoryEngine.recall({
        key: { process: "mill", material: "steel", feature: "rough", decision: "approved" },
        n: 1,
      });
      expect(r.episodes.length).toBe(1);
      expect(Object.keys(r.episodes[0].episode.features).length).toBe(3);
    });
  });

  describe("configure — rejection branches", () => {
    it("rejects invalid defaultDecision enum value", () => {
      const r = OutcomeEpisodicMemoryBridgeEngine.configure({
        defaultDecision: "nonsense" as never,
      });
      expect(r.ok).toBe(false);
    });

    it("rejects maxFeatureCount < 1", () => {
      const r = OutcomeEpisodicMemoryBridgeEngine.configure({ maxFeatureCount: 0 });
      expect(r.ok).toBe(false);
    });

    it("rejects maxFeatureCount > 1000", () => {
      const r = OutcomeEpisodicMemoryBridgeEngine.configure({ maxFeatureCount: 5000 });
      expect(r.ok).toBe(false);
    });

    it("rejects non-integer maxFeatureCount", () => {
      const r = OutcomeEpisodicMemoryBridgeEngine.configure({ maxFeatureCount: 2.5 });
      expect(r.ok).toBe(false);
    });

    it("partial update preserves untouched fields", () => {
      OutcomeEpisodicMemoryBridgeEngine.configure({ maxFeatureCount: 32 });
      OutcomeEpisodicMemoryBridgeEngine.configure({ defaultDecision: "override" });
      const s = OutcomeEpisodicMemoryBridgeEngine.stats();
      expect(s.config.maxFeatureCount).toBe(32);
      expect(s.config.defaultDecision).toBe("override");
    });
  });

  describe("adversarial / malformed payloads", () => {
    it("null payload → decode failure, no events seen", () => {
      OutcomeEpisodicMemoryBridgeEngine.__testHandle(null);
      const s = OutcomeEpisodicMemoryBridgeEngine.stats();
      expect(s.failures.decode).toBe(1);
      expect(s.total_events_seen).toBe(0);
    });

    it("primitive payload → decode failure", () => {
      OutcomeEpisodicMemoryBridgeEngine.__testHandle("not-an-object");
      expect(OutcomeEpisodicMemoryBridgeEngine.stats().failures.decode).toBe(1);
    });

    it("missing record + missing outcomeKind → skipped_pending", () => {
      OutcomeEpisodicMemoryBridgeEngine.__testHandle({
        id: "x", bridge: "sf", process: "mill",
      });
      expect(OutcomeEpisodicMemoryBridgeEngine.stats().total_skipped_pending).toBe(1);
    });

    it("invalid outcomeKind string is treated as pending and skipped", () => {
      OutcomeEpisodicMemoryBridgeEngine.__testHandle({
        outcomeKind: "weird_unknown_state",
      });
      expect(OutcomeEpisodicMemoryBridgeEngine.stats().total_skipped_pending).toBe(1);
    });
  });

  describe("variability — events span supported processes", () => {
    it("stores episodes from mill + lathe + wedm processes", () => {
      for (const p of ["mill", "lathe", "wedm"]) {
        OutcomeEpisodicMemoryBridgeEngine.__testHandle(
          makeCompletedEnvelope("success", { process: p, material: "4140" }),
        );
      }
      expect(OutcomeEpisodicMemoryBridgeEngine.stats().total_stored).toBe(3);
      expect(CrossProcessEpisodicMemoryEngine.stats().total).toBe(3);
    });

    it("stores episodes across multiple materials", () => {
      for (const m of ["4140", "316L", "Ti-6Al-4V"]) {
        OutcomeEpisodicMemoryBridgeEngine.__testHandle(
          makeCompletedEnvelope("success", { material: m }),
        );
      }
      expect(OutcomeEpisodicMemoryBridgeEngine.stats().total_stored).toBe(3);
    });
  });

  describe("recall round-trip", () => {
    it("stored episode is recallable by partial key (process+material)", () => {
      OutcomeEpisodicMemoryBridgeEngine.__testHandle(
        makeCompletedEnvelope("success", { material: "Ti-6Al-4V", operation: "finish" }),
      );
      const r = CrossProcessEpisodicMemoryEngine.recall({
        key: { process: "mill", material: "Ti-6Al-4V" },
        n: 5,
      });
      expect(r.episodes.length).toBe(1);
      expect(r.episodes[0].episode.key.material).toBe("Ti-6Al-4V");
      expect(r.episodes[0].episode.key.feature).toBe("finish");
    });
  });

  describe("dispatcher round-trip", () => {
    it("xproc_episodic_bridge_subscribe + status report subscribed", () => {
      const sub = outcomeEpisodicMemoryBridgeDispatch("xproc_episodic_bridge_subscribe", {}) as { ok: boolean };
      expect(sub.ok).toBe(true);
      const st = outcomeEpisodicMemoryBridgeDispatch("xproc_episodic_bridge_status", {}) as { subscribed: boolean };
      expect(st.subscribed).toBe(true);
    });

    it("xproc_episodic_bridge_unsubscribe detaches", () => {
      outcomeEpisodicMemoryBridgeDispatch("xproc_episodic_bridge_subscribe", {});
      const r = outcomeEpisodicMemoryBridgeDispatch("xproc_episodic_bridge_unsubscribe", {}) as { wasSubscribed: boolean };
      expect(r.wasSubscribed).toBe(true);
    });

    it("xproc_episodic_bridge_configure round-trips valid input", () => {
      const r = outcomeEpisodicMemoryBridgeDispatch("xproc_episodic_bridge_configure", {
        defaultDecision: "override",
      }) as { ok: boolean };
      expect(r.ok).toBe(true);
    });

    it("xproc_episodic_bridge_configure rejects bad input", () => {
      const r = outcomeEpisodicMemoryBridgeDispatch("xproc_episodic_bridge_configure", {
        defaultDecision: "garbage",
      }) as { ok: boolean };
      expect(r.ok).toBe(false);
    });

    it("xproc_episodic_bridge_stats returns initial-state shape", () => {
      const r = outcomeEpisodicMemoryBridgeDispatch("xproc_episodic_bridge_stats", {}) as {
        ok: boolean; stats: { total_events_seen: number; total_stored: number; config: Record<string, unknown> };
      };
      expect(r.ok).toBe(true);
      expect(r.stats.total_events_seen).toBe(0);
      expect(r.stats.total_stored).toBe(0);
      expect(r.stats.config.defaultDecision).toBe("approved");
    });

    it("xproc_episodic_bridge_reset clears state", () => {
      OutcomeEpisodicMemoryBridgeEngine.__testHandle(makeCompletedEnvelope("success"));
      expect(OutcomeEpisodicMemoryBridgeEngine.stats().total_events_seen).toBe(1);
      const r = outcomeEpisodicMemoryBridgeDispatch("xproc_episodic_bridge_reset", {}) as { ok: boolean };
      expect(r.ok).toBe(true);
      expect(OutcomeEpisodicMemoryBridgeEngine.stats().total_events_seen).toBe(0);
    });

    it("rejects unknown action via default branch throw", () => {
      expect(() =>
        outcomeEpisodicMemoryBridgeDispatch("xproc_episodic_bridge_BOGUS", {}),
      ).toThrow(/unknown action/);
    });

    it("regression: rejects pre-existing xproc_episodic_store (engine's namespace)", () => {
      expect(() =>
        outcomeEpisodicMemoryBridgeDispatch("xproc_episodic_store", {}),
      ).toThrow(/unknown action/);
    });
  });

  describe("end-to-end via real feedback bus", () => {
    it("publish('outcome.completed') routes to the bridge through the live bus", async () => {
      OutcomeEpisodicMemoryBridgeEngine.subscribeToOutcomes();
      feedbackBusEngine.publish("outcome.completed", makeCompletedEnvelope("success"));
      await Promise.resolve();
      await Promise.resolve();
      const s = OutcomeEpisodicMemoryBridgeEngine.stats();
      expect(s.total_events_seen).toBe(1);
      expect(s.total_stored).toBe(1);
    });

    it("does NOT receive outcome.recorded events (subscription topic isolation)", async () => {
      OutcomeEpisodicMemoryBridgeEngine.subscribeToOutcomes();
      feedbackBusEngine.publish("outcome.recorded", makeCompletedEnvelope("success"));
      await Promise.resolve();
      await Promise.resolve();
      const s = OutcomeEpisodicMemoryBridgeEngine.stats();
      expect(s.total_events_seen).toBe(0);
    });
  });
});
