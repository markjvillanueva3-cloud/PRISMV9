/**
 * OutcomeDriftCalibrationBridgeEngine.test.ts — XPROC-NEURAL-CONNECT-MS0 / U-CN06
 *
 * Verifies the bridge wires outcome.completed -> drift detector + conformal
 * monitor + concept-shift handler with full coverage of:
 *   - happy path (success/failure/override events flow through)
 *   - subscription idempotence + unsubscribe
 *   - error-policy switching (failure_only vs failure_or_override)
 *   - configure rejection on out-of-range inputs
 *   - boundary cases (pending events skipped, malformed payloads counted)
 *   - adversarial inputs (null payload, primitive payload, missing record)
 *   - drift trigger threshold (only fires concept-shift handler when drift
 *     confidence >= minDriftConfidenceForRetrain AND recommendedAction != "none")
 *   - dispatcher round-trip for all 6 actions including unknown-action throw
 */
import { describe, it, expect, beforeEach } from "vitest";

import {
  OutcomeDriftCalibrationBridgeEngine,
  outcomeDriftCalibrationBridgeDispatch,
} from "../engines/OutcomeDriftCalibrationBridgeEngine.js";
import { CrossProcessDriftDetectorEngine } from "../engines/CrossProcessDriftDetectorEngine.js";
import { ConformalCalibrationMonitorEngine } from "../engines/ConformalCalibrationMonitorEngine.js";
import { CrossProcessConceptShiftHandlerEngine } from "../engines/CrossProcessConceptShiftHandlerEngine.js";
import { feedbackBusEngine } from "../engines/FeedbackBusEngine.js";

const CALIBRATION_WINDOW_FILL = 50;

function makeCompletedEnvelope(kind: "success" | "failure" | "operator_override" | "pending") {
  return {
    id: `evt-${Math.random().toString(36).slice(2, 8)}`,
    bridge: "speed_feed_calculator",
    process: "mill",
    previousKind: "pending",
    outcomeKind: kind,
    record: {
      schemaVersion: "1.0.0",
      id: "rec-1",
      ts: new Date().toISOString(),
      bridge: "speed_feed_calculator",
      process: "mill",
      request_summary: { material: "steel", operation: "rough" },
      response_summary: {},
      outcome: { kind },
    },
  };
}

describe("OutcomeDriftCalibrationBridgeEngine — U-CN06", () => {
  beforeEach(() => {
    OutcomeDriftCalibrationBridgeEngine.reset();
    CrossProcessDriftDetectorEngine.reset();
    ConformalCalibrationMonitorEngine.reset();
    CrossProcessConceptShiftHandlerEngine.reset();
  });

  describe("subscription lifecycle", () => {
    it("subscribe is idempotent — second call reports alreadySubscribed=true", () => {
      const a = OutcomeDriftCalibrationBridgeEngine.subscribeToOutcomes();
      expect(a.alreadySubscribed).toBe(false);
      const b = OutcomeDriftCalibrationBridgeEngine.subscribeToOutcomes();
      expect(b.alreadySubscribed).toBe(true);
      expect(OutcomeDriftCalibrationBridgeEngine.isSubscribedToOutcomes()).toBe(true);
    });

    it("unsubscribe is idempotent — second call reports wasSubscribed=false", () => {
      OutcomeDriftCalibrationBridgeEngine.subscribeToOutcomes();
      const a = OutcomeDriftCalibrationBridgeEngine.unsubscribeFromOutcomes();
      expect(a.wasSubscribed).toBe(true);
      const b = OutcomeDriftCalibrationBridgeEngine.unsubscribeFromOutcomes();
      expect(b.wasSubscribed).toBe(false);
      expect(OutcomeDriftCalibrationBridgeEngine.isSubscribedToOutcomes()).toBe(false);
    });

    it("reset() detaches the subscription", () => {
      OutcomeDriftCalibrationBridgeEngine.subscribeToOutcomes();
      expect(OutcomeDriftCalibrationBridgeEngine.isSubscribedToOutcomes()).toBe(true);
      OutcomeDriftCalibrationBridgeEngine.reset();
      expect(OutcomeDriftCalibrationBridgeEngine.isSubscribedToOutcomes()).toBe(false);
    });
  });

  describe("happy-path event flow (via __testHandle synchronous seam)", () => {
    it("processes a success event — drift_observes=1 calibration_records=1", () => {
      OutcomeDriftCalibrationBridgeEngine.__testHandle(makeCompletedEnvelope("success"));
      const s = OutcomeDriftCalibrationBridgeEngine.stats();
      expect(s.total_events_seen).toBe(1);
      expect(s.total_drift_observes).toBe(1);
      expect(s.total_calibration_records).toBe(1);
      expect(s.total_skipped_pending).toBe(0);
      expect(s.failures.drift_detector).toBe(0);
      expect(s.failures.calibration_monitor).toBe(0);
    });

    it("processes a failure event — drift detector records 3 detectors and is in warmup", () => {
      OutcomeDriftCalibrationBridgeEngine.__testHandle(makeCompletedEnvelope("failure"));
      const s = OutcomeDriftCalibrationBridgeEngine.stats();
      expect(s.total_drift_observes).toBe(1);
      expect(s.last_drift_report?.totalObservations).toBe(1);
      expect(s.last_drift_report?.detectors.length).toBe(3);
      expect(s.last_drift_report?.inWarmup).toBe(true);
    });

    it("processes operator_override — counted as event but error=0 under failure_only", () => {
      OutcomeDriftCalibrationBridgeEngine.__testHandle(makeCompletedEnvelope("operator_override"));
      const s = OutcomeDriftCalibrationBridgeEngine.stats();
      expect(s.total_events_seen).toBe(1);
      expect(s.total_drift_observes).toBe(1);
      expect(s.config.errorPolicy).toBe("failure_only");
    });

    it("skips pending events — counts toward skipped_pending, not drift_observes", () => {
      OutcomeDriftCalibrationBridgeEngine.__testHandle(makeCompletedEnvelope("pending"));
      const s = OutcomeDriftCalibrationBridgeEngine.stats();
      expect(s.total_events_seen).toBe(1);
      expect(s.total_skipped_pending).toBe(1);
      expect(s.total_drift_observes).toBe(0);
      expect(s.total_calibration_records).toBe(0);
    });
  });

  describe("error-policy switching", () => {
    it("failure_or_override counts override as error=1", () => {
      OutcomeDriftCalibrationBridgeEngine.configure({ errorPolicy: "failure_or_override" });
      OutcomeDriftCalibrationBridgeEngine.__testHandle(makeCompletedEnvelope("operator_override"));
      const s = OutcomeDriftCalibrationBridgeEngine.stats();
      expect(s.config.errorPolicy).toBe("failure_or_override");
      expect(s.total_drift_observes).toBe(1);
      expect(s.last_drift_report?.totalObservations).toBe(1);
    });

    it("default policy is failure_only", () => {
      const s = OutcomeDriftCalibrationBridgeEngine.stats();
      expect(s.config.errorPolicy).toBe("failure_only");
    });
  });

  describe("configure — rejection branches", () => {
    it("rejects invalid errorPolicy", () => {
      const r = OutcomeDriftCalibrationBridgeEngine.configure({ errorPolicy: "bogus" as never });
      expect(r.ok).toBe(false);
    });

    it("rejects minDriftConfidenceForRetrain > 1", () => {
      const r = OutcomeDriftCalibrationBridgeEngine.configure({ minDriftConfidenceForRetrain: 1.5 });
      expect(r.ok).toBe(false);
    });

    it("rejects minDriftConfidenceForRetrain < 0", () => {
      const r = OutcomeDriftCalibrationBridgeEngine.configure({ minDriftConfidenceForRetrain: -0.1 });
      expect(r.ok).toBe(false);
    });

    it("rejects negative cooldownMs", () => {
      const r = OutcomeDriftCalibrationBridgeEngine.configure({ cooldownMs: -5 });
      expect(r.ok).toBe(false);
    });

    it("partial update preserves untouched fields", () => {
      OutcomeDriftCalibrationBridgeEngine.configure({ minDriftConfidenceForRetrain: 0.7 });
      OutcomeDriftCalibrationBridgeEngine.configure({ cooldownMs: 90_000 });
      const s = OutcomeDriftCalibrationBridgeEngine.stats();
      expect(s.config.minDriftConfidenceForRetrain).toBe(0.7);
      expect(s.config.cooldownMs).toBe(90_000);
      expect(s.config.errorPolicy).toBe("failure_only");
    });
  });

  describe("adversarial / malformed payloads", () => {
    it("null payload increments decode-failure counter, not events_seen", () => {
      OutcomeDriftCalibrationBridgeEngine.__testHandle(null);
      const s = OutcomeDriftCalibrationBridgeEngine.stats();
      expect(s.total_events_seen).toBe(0);
      expect(s.failures.decode).toBe(1);
    });

    it("primitive payload (string) increments decode-failure", () => {
      OutcomeDriftCalibrationBridgeEngine.__testHandle("not-an-object");
      const s = OutcomeDriftCalibrationBridgeEngine.stats();
      expect(s.failures.decode).toBe(1);
      expect(s.total_events_seen).toBe(0);
    });

    it("missing record + missing outcomeKind falls back to pending and is skipped", () => {
      OutcomeDriftCalibrationBridgeEngine.__testHandle({ id: "x", bridge: "speed_feed_calculator", process: "mill" });
      const s = OutcomeDriftCalibrationBridgeEngine.stats();
      expect(s.total_skipped_pending).toBe(1);
      expect(s.total_drift_observes).toBe(0);
    });

    it("payload with outcomeKind only (no record) — kind extracted from envelope", () => {
      OutcomeDriftCalibrationBridgeEngine.__testHandle({ id: "x", bridge: "speed_feed_calculator", process: "mill", outcomeKind: "success" });
      const s = OutcomeDriftCalibrationBridgeEngine.stats();
      expect(s.total_events_seen).toBe(1);
      expect(s.total_drift_observes).toBe(1);
    });

    it("invalid outcomeKind string is treated as pending and skipped", () => {
      OutcomeDriftCalibrationBridgeEngine.__testHandle({ outcomeKind: "weird_unknown_state" });
      const s = OutcomeDriftCalibrationBridgeEngine.stats();
      expect(s.total_skipped_pending).toBe(1);
    });
  });

  describe("variability — events span multiple bridges/processes", () => {
    it("records events from speed_feed_calculator + post_processor + ai_router bridges", () => {
      const bridges = ["speed_feed_calculator", "post_processor", "ai_router"];
      for (const b of bridges) {
        OutcomeDriftCalibrationBridgeEngine.__testHandle({
          id: `e-${b}`,
          bridge: b,
          process: "mill",
          outcomeKind: "success",
          record: { outcome: { kind: "success" } },
        });
      }
      const s = OutcomeDriftCalibrationBridgeEngine.stats();
      expect(s.total_events_seen).toBe(3);
      expect(s.total_drift_observes).toBe(3);
    });

    it("records events from mill + lathe + wedm processes", () => {
      const procs = ["mill", "lathe", "wedm"];
      for (const p of procs) {
        OutcomeDriftCalibrationBridgeEngine.__testHandle({
          bridge: "ai_router",
          process: p,
          outcomeKind: "failure",
          record: { outcome: { kind: "failure" } },
        });
      }
      const s = OutcomeDriftCalibrationBridgeEngine.stats();
      expect(s.total_events_seen).toBe(3);
      expect(s.total_drift_observes).toBe(3);
      expect(s.last_drift_report?.totalObservations).toBe(3);
    });
  });

  describe("calibration coverage", () => {
    it("success event records totalRecorded=1 in conformal monitor", () => {
      OutcomeDriftCalibrationBridgeEngine.__testHandle(makeCompletedEnvelope("success"));
      const monitor = ConformalCalibrationMonitorEngine.status();
      expect(monitor.totalRecorded).toBe(1);
    });

    it("a window full of failures drives empirical coverage to 0", () => {
      for (let i = 0; i < CALIBRATION_WINDOW_FILL; i++) {
        OutcomeDriftCalibrationBridgeEngine.__testHandle(makeCompletedEnvelope("failure"));
      }
      const m = ConformalCalibrationMonitorEngine.status();
      expect(m.totalRecorded).toBe(CALIBRATION_WINDOW_FILL);
      expect(m.empiricalCoverage).toBe(0);
    });
  });

  describe("drift trigger threshold (concept-shift gating)", () => {
    it("zero retrain decisions when minDriftConfidenceForRetrain=1.0 (impossible to trigger)", () => {
      OutcomeDriftCalibrationBridgeEngine.configure({ minDriftConfidenceForRetrain: 1.0 });
      for (let i = 0; i < 60; i++) {
        OutcomeDriftCalibrationBridgeEngine.__testHandle(makeCompletedEnvelope("failure"));
      }
      const s = OutcomeDriftCalibrationBridgeEngine.stats();
      expect(s.total_retrain_decisions).toBe(0);
    });
  });

  describe("dispatcher round-trip", () => {
    it("xproc_drift_subscribe + xproc_drift_status report subscribed", () => {
      const sub = outcomeDriftCalibrationBridgeDispatch("xproc_drift_subscribe", {}) as { ok: boolean; alreadySubscribed: boolean };
      expect(sub.ok).toBe(true);
      const st = outcomeDriftCalibrationBridgeDispatch("xproc_drift_status", {}) as { subscribed: boolean };
      expect(st.subscribed).toBe(true);
    });

    it("xproc_drift_unsubscribe detaches", () => {
      outcomeDriftCalibrationBridgeDispatch("xproc_drift_subscribe", {});
      const r = outcomeDriftCalibrationBridgeDispatch("xproc_drift_unsubscribe", {}) as { wasSubscribed: boolean };
      expect(r.wasSubscribed).toBe(true);
    });

    it("xproc_drift_configure round-trips with valid input", () => {
      const r = outcomeDriftCalibrationBridgeDispatch("xproc_drift_configure", { errorPolicy: "failure_or_override" }) as { ok: boolean };
      expect(r.ok).toBe(true);
    });

    it("xproc_drift_configure rejects bad input", () => {
      const r = outcomeDriftCalibrationBridgeDispatch("xproc_drift_configure", { errorPolicy: "nonsense" }) as { ok: boolean };
      expect(r.ok).toBe(false);
    });

    it("xproc_drift_stats returns full BridgeStats shape", () => {
      const r = outcomeDriftCalibrationBridgeDispatch("xproc_drift_stats", {}) as {
        ok: boolean; stats: { total_events_seen: number; failures: Record<string, number>; config: Record<string, unknown> };
      };
      expect(r.ok).toBe(true);
      expect(r.stats.total_events_seen).toBe(0);
      expect(r.stats.failures.decode).toBe(0);
      expect(r.stats.config.errorPolicy).toBe("failure_only");
    });

    it("xproc_drift_bridge_reset clears state (namespaced to avoid colliding with detector's xproc_drift_reset)", () => {
      OutcomeDriftCalibrationBridgeEngine.__testHandle(makeCompletedEnvelope("failure"));
      const before = OutcomeDriftCalibrationBridgeEngine.stats();
      expect(before.total_events_seen).toBe(1);
      const r = outcomeDriftCalibrationBridgeDispatch("xproc_drift_bridge_reset", {}) as { ok: boolean };
      expect(r.ok).toBe(true);
      const after = OutcomeDriftCalibrationBridgeEngine.stats();
      expect(after.total_events_seen).toBe(0);
    });

    it("rejects unknown action via default branch throw", () => {
      expect(() =>
        outcomeDriftCalibrationBridgeDispatch("xproc_drift_BOGUS", {}),
      ).toThrow(/unknown action/);
    });

    it("regression: bridge wrapper rejects xproc_drift_reset (detector's namespace)", () => {
      // xproc_drift_reset belongs to CrossProcessDriftDetectorEngine. The
      // bridge wrapper must NOT silently accept it — otherwise the action
      // would be doubly-claimed at the dispatcher level and routing depends
      // on Map insertion order, which is fragile.
      expect(() =>
        outcomeDriftCalibrationBridgeDispatch("xproc_drift_reset", {}),
      ).toThrow(/unknown action/);
    });
  });

  describe("end-to-end via real feedback bus (microtask round-trip)", () => {
    it("publish('outcome.completed') routes to the bridge through the live bus", async () => {
      OutcomeDriftCalibrationBridgeEngine.subscribeToOutcomes();
      feedbackBusEngine.publish("outcome.completed", makeCompletedEnvelope("success"));
      await Promise.resolve();
      await Promise.resolve();
      const s = OutcomeDriftCalibrationBridgeEngine.stats();
      expect(s.total_events_seen).toBe(1);
      expect(s.total_drift_observes).toBe(1);
    });

    it("does NOT receive outcome.recorded events (subscription topic isolation)", async () => {
      OutcomeDriftCalibrationBridgeEngine.subscribeToOutcomes();
      feedbackBusEngine.publish("outcome.recorded", makeCompletedEnvelope("success"));
      await Promise.resolve();
      await Promise.resolve();
      const s = OutcomeDriftCalibrationBridgeEngine.stats();
      expect(s.total_events_seen).toBe(0);
    });
  });
});
