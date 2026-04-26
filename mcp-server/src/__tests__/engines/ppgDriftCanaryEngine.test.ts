/**
 * PPGDriftCanaryEngine Tests — U-PPG-SFC-12
 *
 * Exit criteria verification:
 *   - Page-Hinkley fires within ≤10 events of injected drift
 *   - TTA engages and stays bounded (BN+LoRA-A only)
 *   - Canary ramp gated on drift signal
 *   - Circuit-breaker rolls back adapter on regression
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  ppgDriftCanaryEngine,
  type AlarmEvent,
  type DialectCohortKey,
} from "../../engines/PPGDriftCanaryEngine.js";

describe("PPGDriftCanaryEngine", () => {
  beforeEach(() => {
    ppgDriftCanaryEngine.clear();
    ppgDriftCanaryEngine.configure({
      min_events: 10,
      baseline_window: 20,
      ph_delta: 0.02,
      ph_lambda: 0.5,
      events_per_stage: 5,
      circuit_breaker_threshold: 3,
      tta_entropy_threshold: 2.5,
      tta_diversity_threshold: 0.01,
    });
  });

  function makeCohort(suffix: string): DialectCohortKey {
    return {
      dialect: `fanuc${suffix}`,
      dialect_version: `1.0${suffix}`,
      controller: `Fanuc-30i${suffix}`,
    };
  }

  function makeEvent(
    cohort: DialectCohortKey,
    severity: "info" | "warning" | "error" | "critical",
    rejected: boolean,
    index: number,
  ): AlarmEvent {
    return {
      timestamp: Date.now() + index * 1000,
      dialect: cohort.dialect,
      dialect_version: cohort.dialect_version,
      controller: cohort.controller,
      machine_id: `machine-${index}`,
      alarm_severity: severity,
      line_rejected: rejected,
      lineage_id: `test-${index}`,
    };
  }

  function feedStableBaseline(cohort: DialectCohortKey, count: number): void {
    for (let i = 0; i < count; i++) {
      ppgDriftCanaryEngine.recordAlarm(makeEvent(cohort, "info", false, i));
    }
  }

  function feedHighAlarmEvents(cohort: DialectCohortKey, startIndex: number, count: number): void {
    for (let i = 0; i < count; i++) {
      ppgDriftCanaryEngine.recordAlarm(makeEvent(cohort, "error", true, startIndex + i));
    }
  }

  describe("Page-Hinkley drift detection", () => {
    it("returns drifted=false for 30 stable low-severity events", () => {
      const cohort = makeCohort("-stable");
      feedStableBaseline(cohort, 30);
      const result = ppgDriftCanaryEngine.recordAlarm(makeEvent(cohort, "info", false, 30));
      expect(result.drift.drifted).toBe(false);
      expect(result.drift.event_count).toBe(31);
    });

    it("fires drifted=true within 10 events when alarm severity shifts from info to error", () => {
      const cohort = makeCohort("-drift");
      feedStableBaseline(cohort, 20);

      let driftEvent = -1;
      for (let i = 20; i < 35; i++) {
        const result = ppgDriftCanaryEngine.recordAlarm(makeEvent(cohort, "error", true, i));
        if (result.drift.drifted) {
          driftEvent = i - 20 + 1;
          break;
        }
      }

      expect(driftEvent).toBeGreaterThan(0);
      expect(driftEvent).toBeLessThanOrEqual(10);
    });

    it("computes baseline_alarm_rate close to 0.1 after 15 info events", () => {
      const cohort = makeCohort("-baseline");
      feedStableBaseline(cohort, 15);

      const stats = ppgDriftCanaryEngine.getCohortStats(cohort);
      expect(stats).not.toBe(undefined);
      expect(stats!.event_count).toBe(15);
      expect(stats!.baseline_alarm_rate).toBeLessThan(0.2);
    });

    it("returns cusum>=0 and increments event_count on each event", () => {
      const cohort = makeCohort("-cusum");
      feedStableBaseline(cohort, 15);
      const result = ppgDriftCanaryEngine.recordAlarm(makeEvent(cohort, "critical", true, 15));

      expect(result.drift.cusum).toBeGreaterThanOrEqual(0);
      expect(result.drift.event_count).toBe(16);
    });

    it("tracks both alarm_rate and reject_rate in drift detection", () => {
      const cohort = makeCohort("-rates");
      feedStableBaseline(cohort, 15);
      const result = ppgDriftCanaryEngine.recordAlarm(makeEvent(cohort, "error", true, 15));

      expect(result.drift.baseline_alarm_rate).toBeGreaterThanOrEqual(0);
      expect(result.drift.current_alarm_rate).toBeGreaterThanOrEqual(0);
      expect(result.drift.baseline_reject_rate).toBeGreaterThanOrEqual(0);
      expect(result.drift.current_reject_rate).toBeGreaterThanOrEqual(0);
    });
  });

  describe("TTA engagement on drift", () => {
    it("returns tta.adapted=true with model_id containing ppg- prefix on drift", () => {
      const cohort = makeCohort("-tta");
      feedStableBaseline(cohort, 15);

      let ttaResult = null;
      for (let i = 15; i < 30; i++) {
        const result = ppgDriftCanaryEngine.recordAlarm(makeEvent(cohort, "critical", true, i));
        if (result.tta && result.tta.adapted) {
          ttaResult = result.tta;
          break;
        }
      }

      expect(ttaResult).not.toBe(null);
      expect(ttaResult!.adapted).toBe(true);
      expect(ttaResult!.model_id.startsWith("ppg-")).toBe(true);
    });

    it("returns bn_updates and lora_updates both bounded ≤10 per adaptation", () => {
      const cohort = makeCohort("-bounded");
      feedStableBaseline(cohort, 15);

      let maxBn = 0;
      let maxLora = 0;
      for (let i = 15; i < 30; i++) {
        const result = ppgDriftCanaryEngine.recordAlarm(makeEvent(cohort, "critical", true, i));
        if (result.tta) {
          maxBn = Math.max(maxBn, result.tta.bn_updates);
          maxLora = Math.max(maxLora, result.tta.lora_updates);
        }
      }

      expect(maxBn).toBeLessThanOrEqual(10);
      expect(maxLora).toBeLessThanOrEqual(10);
    });
  });

  describe("Canary ramp progression", () => {
    it("returns canary.stage=shadow with traffic_pct=0 on first drift", () => {
      const cohort = makeCohort("-canary");
      feedStableBaseline(cohort, 15);

      let canaryResult = null;
      for (let i = 15; i < 25; i++) {
        const result = ppgDriftCanaryEngine.recordAlarm(makeEvent(cohort, "error", true, i));
        if (result.canary) {
          canaryResult = result.canary;
          break;
        }
      }

      expect(canaryResult).not.toBe(null);
      expect(canaryResult!.stage).toBe("shadow");
      expect(canaryResult!.traffic_pct).toBe(0);
    });

    it("returns traffic_pct=0 for cohort without any recorded events", () => {
      const cohort = makeCohort("-empty");
      expect(ppgDriftCanaryEngine.getTrafficPct(cohort)).toBe(0);
    });

    it("returns shouldUseAdapter=false for cohort without canary", () => {
      const cohort = makeCohort("-noadapt");
      expect(ppgDriftCanaryEngine.shouldUseAdapter(cohort)).toBe(false);
    });
  });

  describe("Circuit breaker rollback", () => {
    it("returns stage=rolled_back with reason=circuit_breaker_tripped after repeated drift", () => {
      const cohort = makeCohort("-cb");
      feedStableBaseline(cohort, 15);

      let rolledBackCanary = null;
      for (let i = 15; i < 50; i++) {
        const result = ppgDriftCanaryEngine.recordAlarm(makeEvent(cohort, "critical", true, i));
        if (result.canary?.stage === "rolled_back") {
          rolledBackCanary = result.canary;
          break;
        }
      }

      expect(rolledBackCanary).not.toBe(null);
      expect(rolledBackCanary!.stage).toBe("rolled_back");
      expect(rolledBackCanary!.rollback_reason).toBe("circuit_breaker_tripped");
    });

    it("returns traffic_pct=0 after circuit breaker trips", () => {
      const cohort = makeCohort("-cbtraffic");
      feedStableBaseline(cohort, 15);

      for (let i = 15; i < 50; i++) {
        ppgDriftCanaryEngine.recordAlarm(makeEvent(cohort, "critical", true, i));
      }

      const canary = ppgDriftCanaryEngine.getCanaryState(cohort);
      expect(canary).not.toBe(undefined);
      expect(canary!.traffic_pct).toBe(0);
    });
  });

  describe("Manual rollback and listing", () => {
    it("rollback() sets stage=rolled_back with custom reason", () => {
      const cohort = makeCohort("-manual");
      feedStableBaseline(cohort, 15);

      for (let i = 15; i < 25; i++) {
        ppgDriftCanaryEngine.recordAlarm(makeEvent(cohort, "error", true, i));
      }

      const result = ppgDriftCanaryEngine.rollback(cohort, "user_requested");
      expect(result).not.toBe(undefined);
      expect(result!.stage).toBe("rolled_back");
      expect(result!.rollback_reason).toBe("user_requested");
      expect(result!.traffic_pct).toBe(0);
    });

    it("listCanaries() returns 2 entries after creating canaries for 2 cohorts", () => {
      const cohort1 = makeCohort("-l1");
      const cohort2 = makeCohort("-l2");

      feedStableBaseline(cohort1, 15);
      for (let i = 15; i < 25; i++) {
        ppgDriftCanaryEngine.recordAlarm(makeEvent(cohort1, "error", true, i));
      }

      feedStableBaseline(cohort2, 15);
      for (let i = 15; i < 25; i++) {
        ppgDriftCanaryEngine.recordAlarm(makeEvent(cohort2, "error", true, i));
      }

      const canaries = ppgDriftCanaryEngine.listCanaries();
      expect(canaries.length).toBe(2);
    });

    it("resetCohort() returns true and getCohortStats returns undefined after reset", () => {
      const cohort = makeCohort("-reset");
      feedStableBaseline(cohort, 15);

      const resetResult = ppgDriftCanaryEngine.resetCohort(cohort);
      expect(resetResult).toBe(true);

      const stats = ppgDriftCanaryEngine.getCohortStats(cohort);
      expect(stats).toBe(undefined);
    });
  });

  describe("runCanaryTest exit criteria validation", () => {
    it("returns passed=true and events_to_detection≤10 for 50% drift magnitude", () => {
      const result = ppgDriftCanaryEngine.runCanaryTest(0.1, 0.5, 20, 15);

      expect(result.passed).toBe(true);
      expect(result.events_to_detection).toBeGreaterThan(0);
      expect(result.events_to_detection).toBeLessThanOrEqual(10);
    });

    it("returns detection_event≥20 (after baseline phase) for alarm rate drift", () => {
      const result = ppgDriftCanaryEngine.runCanaryTest(0.1, 0.4, 20, 15);

      expect(result.passed).toBe(true);
      expect(result.detection_event).toBeGreaterThanOrEqual(20);
    });

    it("returns details array with length=35 for 20 baseline + 15 drift events", () => {
      const result = ppgDriftCanaryEngine.runCanaryTest(0.1, 0.5, 20, 15);

      expect(result.details.length).toBe(35);
      expect(result.details[0].cohort.dialect).toBe("canary-test");
    });
  });

  describe("Configuration", () => {
    it("configure() returns updated ph_delta=0.10 and ph_lambda=8.0", () => {
      const newConfig = ppgDriftCanaryEngine.configure({ ph_delta: 0.10, ph_lambda: 8.0 });

      expect(newConfig.ph_delta).toBe(0.10);
      expect(newConfig.ph_lambda).toBe(8.0);
    });

    it("getConfig() returns min_events=10 and baseline_window=20 from setup", () => {
      const config = ppgDriftCanaryEngine.getConfig();

      expect(config.min_events).toBe(10);
      expect(config.baseline_window).toBe(20);
    });

    it("getConfig() returns alarm_rate_weight between 0 and 1", () => {
      const config = ppgDriftCanaryEngine.getConfig();

      expect(config.alarm_rate_weight).toBeGreaterThan(0);
      expect(config.alarm_rate_weight).toBeLessThanOrEqual(1);
    });
  });
});
