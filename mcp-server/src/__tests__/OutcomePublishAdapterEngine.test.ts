/**
 * OutcomePublishAdapterEngine.test.ts — XPROC-NEURAL-CONNECT-MS0 / U-CN01
 */
import { describe, it, expect, beforeEach } from "vitest";

import {
  OutcomePublishAdapterEngine,
  outcomePublishAdapterDispatch,
} from "../engines/OutcomePublishAdapterEngine.js";
import {
  crossProcessOutcomeStore,
  OUTCOME_BRIDGES,
  OUTCOME_PROCESSES,
  type FeedbackEvent,
} from "../engines/CrossProcessOutcomeStore.js";
import { feedbackBusEngine } from "../engines/FeedbackBusEngine.js";

describe("OutcomePublishAdapterEngine — U-CN01", () => {
  beforeEach(() => {
    OutcomePublishAdapterEngine.reset();
    crossProcessOutcomeStore.clear();
    feedbackBusEngine.reset();
  });

  describe("publish — happy path", () => {
    it("publishes a pending outcome and returns { ok, id, bridge, process, outcome_kind:'pending' }", () => {
      const r = OutcomePublishAdapterEngine.publish({
        bridge: "sf",
        process: "mill",
        request_summary: { material: "steel", tool_diameter_mm: 6 },
      });
      expect(r.ok).toBe(true);
      if (r.ok) {
        expect(r.bridge).toBe("sf");
        expect(r.process).toBe("mill");
        expect(r.outcome_kind).toBe("pending");
        expect(r.id).toMatch(/^evt-/);
      }
    });

    it("publishes a success outcome with response metrics in one call", () => {
      const r = OutcomePublishAdapterEngine.publish({
        bridge: "post",
        process: "lathe",
        request_summary: { material: "aluminum", spindle_rpm: 3000 },
        response_summary: { primary_output: "G-code", success: true, metrics: { cycle_time_s: 42.7 } },
        outcome: { kind: "success", actual_metrics: { ra_um: 1.2 } },
      });
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.outcome_kind).toBe("success");
      const stats = OutcomePublishAdapterEngine.stats();
      expect(stats.total_published).toBe(1);
      expect(stats.by_bridge.post).toBe(1);
      expect(stats.by_process.lathe).toBe(1);
      expect(stats.by_outcome_kind.success).toBe(1);
    });

    it("fires the FeedbackBus 'outcome.recorded' event (the bridge subscribers depend on)", async () => {
      let received: FeedbackEvent | null = null;
      feedbackBusEngine.subscribe("outcome.recorded", (event) => {
        received = event;
      });
      const r = OutcomePublishAdapterEngine.publish({
        bridge: "ai",
        process: "wedm",
        outcome: { kind: "success" },
      });
      expect(r.ok).toBe(true);
      // Bus fan-out is async via queueMicrotask — flush.
      await Promise.resolve();
      await Promise.resolve();
      expect(received).not.toBeNull();
      if (received) {
        const ev = received as FeedbackEvent;
        expect(ev.topic).toBe("outcome.recorded");
        const payload = ev.payload as { outcomeKind: string; bridge: string; process: string };
        expect(payload.outcomeKind).toBe("success");
        expect(payload.bridge).toBe("ai");
        expect(payload.process).toBe("wedm");
      }
    });
  });

  describe("publishWithActuals", () => {
    it("attaches actual_metrics + outcome_kind in one call", () => {
      const r = OutcomePublishAdapterEngine.publishWithActuals({
        bridge: "sf",
        process: "mill",
        request_summary: { tool_diameter_mm: 10 },
        response_summary: { primary_output: "S/F", metrics: { rpm_recommended: 5000 } },
        outcome_kind: "success",
        actual_metrics: { ra_um: 1.6, cycle_time_s: 12.4 },
      });
      expect(r.ok).toBe(true);
      const stats = OutcomePublishAdapterEngine.stats();
      expect(stats.by_outcome_kind.success).toBe(1);
    });

    it("invalid outcome_kind → invalid_input (rejected, telemetry incremented)", () => {
      const r = OutcomePublishAdapterEngine.publishWithActuals({
        bridge: "sf",
        process: "mill",
        outcome_kind: "halfsuccess",
      });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.message).toMatch(/outcome_kind/);
      expect(OutcomePublishAdapterEngine.stats().total_rejected).toBe(1);
    });
  });

  describe("publishFailure", () => {
    it("emits kind=failure with failure_mode set", () => {
      const r = OutcomePublishAdapterEngine.publishFailure({
        bridge: "post",
        process: "lathe",
        failure_mode: "tool_breakage",
        request_summary: { material: "tool-steel" },
        actual_metrics: { breakage_event: 1 },
      });
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.outcome_kind).toBe("failure");
      const stats = OutcomePublishAdapterEngine.stats();
      expect(stats.by_outcome_kind.failure).toBe(1);
    });

    it("missing failure_mode → invalid_input (fail-fast on uninformative failures)", () => {
      const r = OutcomePublishAdapterEngine.publishFailure({
        bridge: "post",
        process: "lathe",
        failure_mode: "",
      });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.message).toMatch(/failure_mode/);
    });
  });

  describe("publishOverride", () => {
    it("emits kind=operator_override with override_reason carried into operator block", () => {
      const r = OutcomePublishAdapterEngine.publishOverride({
        bridge: "ai",
        process: "wedm",
        override_reason: "operator chose larger wire for thicker stock",
        operator_id: "op-007",
        operator_skill_level: "expert",
        request_summary: { workpiece_thickness_mm: 60 },
      });
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.outcome_kind).toBe("operator_override");
      const stats = OutcomePublishAdapterEngine.stats();
      expect(stats.by_outcome_kind.operator_override).toBe(1);
    });

    it("missing override_reason → invalid_input", () => {
      const r = OutcomePublishAdapterEngine.publishOverride({
        bridge: "ai",
        process: "wedm",
        override_reason: "",
      });
      expect(r.ok).toBe(false);
    });
  });

  describe("updateOutcome (pending → terminal transition)", () => {
    it("updates a pending event with a success outcome", () => {
      const r0 = OutcomePublishAdapterEngine.publish({
        bridge: "sf",
        process: "mill",
        request_summary: { material: "aluminum" },
      });
      expect(r0.ok).toBe(true);
      if (!r0.ok) return;
      const r1 = OutcomePublishAdapterEngine.updateOutcome({
        id: r0.id,
        kind: "success",
        actual_metrics: { ra_um: 0.8 },
      });
      expect(r1.ok).toBe(true);
      if (r1.ok) expect(r1.updated).toBe(true);
      expect(OutcomePublishAdapterEngine.stats().total_updated).toBe(1);
    });

    it("unknown id → ok:true, updated:false (idempotent ledger semantics)", () => {
      const r = OutcomePublishAdapterEngine.updateOutcome({
        id: "evt-does-not-exist",
        kind: "failure",
        failure_mode: "phantom",
      });
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.updated).toBe(false);
      expect(OutcomePublishAdapterEngine.stats().total_updated).toBe(0);
    });
  });

  describe("validation — failure modes", () => {
    it("missing bridge → invalid_input", () => {
      const r = OutcomePublishAdapterEngine.publish({ process: "mill" });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.message).toMatch(/bridge/);
    });

    it("unknown bridge name → invalid_input", () => {
      const r = OutcomePublishAdapterEngine.publish({ bridge: "skynet", process: "mill" });
      expect(r.ok).toBe(false);
    });

    it("missing process → invalid_input", () => {
      const r = OutcomePublishAdapterEngine.publish({ bridge: "sf" });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.message).toMatch(/process/);
    });

    it("unknown process name → invalid_input", () => {
      const r = OutcomePublishAdapterEngine.publish({ bridge: "sf", process: "casting" });
      expect(r.ok).toBe(false);
    });

    it("invalid outcome.kind → invalid_input", () => {
      const r = OutcomePublishAdapterEngine.publish({
        bridge: "sf",
        process: "mill",
        outcome: { kind: "halfsuccess" },
      });
      expect(r.ok).toBe(false);
    });
  });

  describe("validation — adversarial inputs", () => {
    it("NaN in actual_metrics → invalid_input", () => {
      const r = OutcomePublishAdapterEngine.publishWithActuals({
        bridge: "sf",
        process: "mill",
        outcome_kind: "success",
        actual_metrics: { ra_um: Number.NaN },
      });
      expect(r.ok).toBe(false);
    });

    it("Infinity in actual_metrics → invalid_input", () => {
      const r = OutcomePublishAdapterEngine.publishWithActuals({
        bridge: "sf",
        process: "mill",
        outcome_kind: "success",
        actual_metrics: { cycle_time_s: Number.POSITIVE_INFINITY },
      });
      expect(r.ok).toBe(false);
    });

    it("negative tool_diameter_mm → invalid_input (request_summary nonneg gate)", () => {
      const r = OutcomePublishAdapterEngine.publish({
        bridge: "sf",
        process: "mill",
        request_summary: { tool_diameter_mm: -3 },
      });
      expect(r.ok).toBe(false);
    });

    it("empty params {} → invalid_input (both bridge + process missing)", () => {
      const r = OutcomePublishAdapterEngine.publish({});
      expect(r.ok).toBe(false);
    });
  });

  describe("variability — exercise ≥3 spanning configurations", () => {
    it("publishes successfully across all 5 bridges", () => {
      for (const bridge of OUTCOME_BRIDGES) {
        const r = OutcomePublishAdapterEngine.publish({
          bridge, process: "mill", outcome: { kind: "success" },
        });
        expect(r.ok).toBe(true);
      }
      const stats = OutcomePublishAdapterEngine.stats();
      expect(stats.total_published).toBe(OUTCOME_BRIDGES.length);
      for (const b of OUTCOME_BRIDGES) expect(stats.by_bridge[b]).toBe(1);
    });

    it("publishes successfully across all 3 processes (mill/lathe/wedm)", () => {
      for (const process of OUTCOME_PROCESSES) {
        const r = OutcomePublishAdapterEngine.publish({
          bridge: "sf", process, outcome: { kind: "pending" },
        });
        expect(r.ok).toBe(true);
      }
      const stats = OutcomePublishAdapterEngine.stats();
      expect(stats.total_published).toBe(OUTCOME_PROCESSES.length);
      for (const p of OUTCOME_PROCESSES) expect(stats.by_process[p]).toBe(1);
    });

    it("publishes all 4 outcome kinds with correct telemetry per-kind", () => {
      OutcomePublishAdapterEngine.publish({ bridge: "sf", process: "mill", outcome: { kind: "success" } });
      OutcomePublishAdapterEngine.publishFailure({ bridge: "post", process: "lathe", failure_mode: "chatter" });
      OutcomePublishAdapterEngine.publishOverride({ bridge: "ai", process: "wedm", override_reason: "thicker wire" });
      OutcomePublishAdapterEngine.publish({ bridge: "feature", process: "mill" }); // pending default
      const stats = OutcomePublishAdapterEngine.stats();
      expect(stats.by_outcome_kind.success).toBe(1);
      expect(stats.by_outcome_kind.failure).toBe(1);
      expect(stats.by_outcome_kind.operator_override).toBe(1);
      expect(stats.by_outcome_kind.pending).toBe(1);
      expect(stats.total_published).toBe(4);
    });
  });

  describe("stats + reset", () => {
    it("stats returns deep copies (mutating result does not leak into engine state)", () => {
      OutcomePublishAdapterEngine.publish({ bridge: "sf", process: "mill", outcome: { kind: "success" } });
      const s1 = OutcomePublishAdapterEngine.stats();
      s1.by_bridge.sf = 999;
      s1.by_outcome_kind.success = 999;
      const s2 = OutcomePublishAdapterEngine.stats();
      expect(s2.by_bridge.sf).toBe(1);
      expect(s2.by_outcome_kind.success).toBe(1);
    });

    it("reset zeroes all counters", () => {
      OutcomePublishAdapterEngine.publish({ bridge: "sf", process: "mill", outcome: { kind: "success" } });
      OutcomePublishAdapterEngine.publishFailure({ bridge: "post", process: "lathe", failure_mode: "chatter" });
      expect(OutcomePublishAdapterEngine.stats().total_published).toBe(2);
      OutcomePublishAdapterEngine.reset();
      const s = OutcomePublishAdapterEngine.stats();
      expect(s.total_published).toBe(0);
      expect(s.total_updated).toBe(0);
      expect(s.total_rejected).toBe(0);
      expect(s.last_published_at).toBeNull();
    });
  });

  describe("dispatcher round-trip — end-to-end through outcomePublishAdapterDispatch", () => {
    it("xproc_outcome_publish goes through dispatcher and updates stats", () => {
      const r = outcomePublishAdapterDispatch("xproc_outcome_publish", {
        bridge: "sf",
        process: "mill",
        outcome: { kind: "success" },
      }) as { ok: boolean; outcome_kind: string };
      expect(r.ok).toBe(true);
      expect(r.outcome_kind).toBe("success");
      const stats = outcomePublishAdapterDispatch("xproc_outcome_adapter_stats", {}) as {
        ok: boolean; stats: { total_published: number };
      };
      expect(stats.stats.total_published).toBe(1);
    });

    it("xproc_outcome_publish_failure round-trips with required failure_mode", () => {
      const r = outcomePublishAdapterDispatch("xproc_outcome_publish_failure", {
        bridge: "post",
        process: "lathe",
        failure_mode: "deflection_exceeded",
      }) as { ok: boolean; outcome_kind: string };
      expect(r.ok).toBe(true);
      expect(r.outcome_kind).toBe("failure");
    });

    it("xproc_outcome_update round-trips for an existing pending event", () => {
      const pubResult = outcomePublishAdapterDispatch("xproc_outcome_publish", {
        bridge: "sf",
        process: "mill",
      }) as { ok: boolean; id: string };
      const upd = outcomePublishAdapterDispatch("xproc_outcome_update", {
        id: pubResult.id,
        kind: "success",
        actual_metrics: { ra_um: 0.8 },
      }) as { ok: boolean; updated: boolean };
      expect(upd.ok).toBe(true);
      expect(upd.updated).toBe(true);
    });

    it("xproc_outcome_adapter_reset zeroes the adapter telemetry", () => {
      outcomePublishAdapterDispatch("xproc_outcome_publish", {
        bridge: "sf", process: "mill", outcome: { kind: "success" },
      });
      const r = outcomePublishAdapterDispatch("xproc_outcome_adapter_reset", {}) as {
        ok: boolean; reset: boolean;
      };
      expect(r.ok).toBe(true);
      expect(r.reset).toBe(true);
      const stats = outcomePublishAdapterDispatch("xproc_outcome_adapter_stats", {}) as {
        stats: { total_published: number };
      };
      expect(stats.stats.total_published).toBe(0);
    });

    it("rejects unknown action via the dispatcher's default branch", () => {
      expect(() =>
        outcomePublishAdapterDispatch("xproc_outcome_publish_BOGUS", {}),
      ).toThrow(/unknown action/);
    });
  });
});
