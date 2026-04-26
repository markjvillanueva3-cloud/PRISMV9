/**
 * SFCDriftCanaryEngine Tests — U-PPG-SFC-11
 *
 * Exit criteria verification:
 *   - Page-Hinkley fires within ≤10 events of injected drift
 *   - TTA engages and stays bounded (BN+LoRA-A only)
 *   - Canary ramp gated on drift signal
 *   - Circuit-breaker rolls back adapter on regression
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  sfcDriftCanaryEngine,
  type OverrideEvent,
  type CohortKey,
} from "../../engines/SFCDriftCanaryEngine.js";

describe("SFCDriftCanaryEngine", () => {
  beforeEach(() => {
    sfcDriftCanaryEngine.clear();
    sfcDriftCanaryEngine.configure({
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

  function makeCohort(suffix: string): CohortKey {
    return {
      material: `D2${suffix}`,
      tool_class: `TNMG-carbide${suffix}`,
      machine_id: `Okuma-LB45${suffix}`,
    };
  }

  function makeEvent(cohort: CohortKey, overrideFactor: number, index: number): OverrideEvent {
    return {
      timestamp: Date.now() + index * 1000,
      material: cohort.material,
      tool_class: cohort.tool_class,
      machine_id: cohort.machine_id,
      recommended_sfm: 300,
      actual_sfm: 300 * overrideFactor,
      override_factor: overrideFactor,
      lineage_id: `test-${index}`,
    };
  }

  function feedStableBaseline(cohort: CohortKey, count: number, factor: number): void {
    for (let i = 0; i < count; i++) {
      sfcDriftCanaryEngine.recordOverride(makeEvent(cohort, factor, i));
    }
  }

  describe("Page-Hinkley drift detection", () => {
    it("returns drifted=false for 30 stable 5% override events", () => {
      const cohort = makeCohort("-stable");
      feedStableBaseline(cohort, 30, 0.95);
      const result = sfcDriftCanaryEngine.recordOverride(makeEvent(cohort, 0.95, 30));
      expect(result.drift.drifted).toBe(false);
      expect(result.drift.event_count).toBe(31);
    });

    it("fires drifted=true within 10 events when override shifts from 5% to 20%", () => {
      const cohort = makeCohort("-drift");
      feedStableBaseline(cohort, 20, 0.95);

      let driftEvent = -1;
      for (let i = 20; i < 35; i++) {
        const result = sfcDriftCanaryEngine.recordOverride(makeEvent(cohort, 0.80, i));
        if (result.drift.drifted) {
          driftEvent = i - 20 + 1;
          break;
        }
      }

      expect(driftEvent).toBeGreaterThan(0);
      expect(driftEvent).toBeLessThanOrEqual(10);
    });

    it("computes baseline_override_rate=0.1 after 15 events with 10% override", () => {
      const cohort = makeCohort("-baseline");
      feedStableBaseline(cohort, 15, 0.90);

      const stats = sfcDriftCanaryEngine.getCohortStats(cohort);
      expect(stats!.event_count).toBe(15);
      expect(Math.abs(stats!.baseline_override_rate - 0.1)).toBeLessThan(0.01);
    });

    it("returns cusum>=0 and increments event_count on each event", () => {
      const cohort = makeCohort("-cusum");
      feedStableBaseline(cohort, 15, 0.90);
      const result = sfcDriftCanaryEngine.recordOverride(makeEvent(cohort, 0.70, 15));

      expect(result.drift.cusum).toBeGreaterThanOrEqual(0);
      expect(result.drift.event_count).toBe(16);
    });
  });

  describe("TTA engagement on drift", () => {
    it("returns tta.adapted=true with model_id containing sfc- prefix on drift", () => {
      const cohort = makeCohort("-tta");
      feedStableBaseline(cohort, 15, 0.95);

      let ttaResult = null;
      for (let i = 15; i < 30; i++) {
        const result = sfcDriftCanaryEngine.recordOverride(makeEvent(cohort, 0.70, i));
        if (result.tta && result.tta.adapted) {
          ttaResult = result.tta;
          break;
        }
      }

      expect(ttaResult).not.toBe(null);
      expect(ttaResult!.adapted).toBe(true);
      expect(ttaResult!.model_id.startsWith("sfc-")).toBe(true);
    });

    it("returns bn_updates and lora_updates both bounded ≤10 per adaptation", () => {
      const cohort = makeCohort("-bounded");
      feedStableBaseline(cohort, 15, 0.95);

      let maxBn = 0;
      let maxLora = 0;
      for (let i = 15; i < 30; i++) {
        const result = sfcDriftCanaryEngine.recordOverride(makeEvent(cohort, 0.65, i));
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
      feedStableBaseline(cohort, 15, 0.95);

      let canaryResult = null;
      for (let i = 15; i < 25; i++) {
        const result = sfcDriftCanaryEngine.recordOverride(makeEvent(cohort, 0.70, i));
        if (result.canary) {
          canaryResult = result.canary;
          break;
        }
      }

      expect(canaryResult!.stage).toBe("shadow");
      expect(canaryResult!.traffic_pct).toBe(0);
    });

    it("returns traffic_pct=0 for cohort without any recorded events", () => {
      const cohort = makeCohort("-empty");
      expect(sfcDriftCanaryEngine.getTrafficPct(cohort)).toBe(0);
    });

    it("returns shouldUseAdapter=false for cohort without canary", () => {
      const cohort = makeCohort("-noadapt");
      expect(sfcDriftCanaryEngine.shouldUseAdapter(cohort)).toBe(false);
    });
  });

  describe("Circuit breaker rollback", () => {
    it("returns stage=rolled_back with reason=circuit_breaker_tripped after repeated drift", () => {
      const cohort = makeCohort("-cb");
      feedStableBaseline(cohort, 15, 0.95);

      let rolledBackCanary = null;
      for (let i = 15; i < 50; i++) {
        const result = sfcDriftCanaryEngine.recordOverride(makeEvent(cohort, 0.60, i));
        if (result.canary?.stage === "rolled_back") {
          rolledBackCanary = result.canary;
          break;
        }
      }

      expect(rolledBackCanary!.stage).toBe("rolled_back");
      expect(rolledBackCanary!.rollback_reason).toBe("circuit_breaker_tripped");
    });

    it("returns traffic_pct=0 after circuit breaker trips", () => {
      const cohort = makeCohort("-cbtraffic");
      feedStableBaseline(cohort, 15, 0.95);

      for (let i = 15; i < 50; i++) {
        sfcDriftCanaryEngine.recordOverride(makeEvent(cohort, 0.60, i));
      }

      const canary = sfcDriftCanaryEngine.getCanaryState(cohort);
      expect(canary!.traffic_pct).toBe(0);
    });
  });

  describe("Manual rollback and listing", () => {
    it("rollback() sets stage=rolled_back with custom reason", () => {
      const cohort = makeCohort("-manual");
      feedStableBaseline(cohort, 15, 0.95);

      for (let i = 15; i < 25; i++) {
        sfcDriftCanaryEngine.recordOverride(makeEvent(cohort, 0.70, i));
      }

      const result = sfcDriftCanaryEngine.rollback(cohort, "user_requested");
      expect(result!.stage).toBe("rolled_back");
      expect(result!.rollback_reason).toBe("user_requested");
      expect(result!.traffic_pct).toBe(0);
    });

    it("listCanaries() returns 2 entries after creating canaries for 2 cohorts", () => {
      const cohort1 = makeCohort("-l1");
      const cohort2 = makeCohort("-l2");

      feedStableBaseline(cohort1, 15, 0.95);
      for (let i = 15; i < 25; i++) {
        sfcDriftCanaryEngine.recordOverride(makeEvent(cohort1, 0.70, i));
      }

      feedStableBaseline(cohort2, 15, 0.95);
      for (let i = 15; i < 25; i++) {
        sfcDriftCanaryEngine.recordOverride(makeEvent(cohort2, 0.70, i));
      }

      const canaries = sfcDriftCanaryEngine.listCanaries();
      expect(canaries.length).toBe(2);
    });

    it("resetCohort() returns true and getCohortStats returns undefined after reset", () => {
      const cohort = makeCohort("-reset");
      feedStableBaseline(cohort, 15, 0.95);

      const resetResult = sfcDriftCanaryEngine.resetCohort(cohort);
      expect(resetResult).toBe(true);

      const stats = sfcDriftCanaryEngine.getCohortStats(cohort);
      expect(stats).toBe(undefined);
    });
  });

  describe("runCanaryTest exit criteria validation", () => {
    it("returns passed=true and events_to_detection≤10 for 20% drift magnitude", () => {
      const result = sfcDriftCanaryEngine.runCanaryTest(0.05, 0.20, 20, 15);

      expect(result.passed).toBe(true);
      expect(result.events_to_detection).toBeGreaterThan(0);
      expect(result.events_to_detection).toBeLessThanOrEqual(10);
    });

    it("returns detection_event≥20 (after baseline phase) for 15% drift", () => {
      const result = sfcDriftCanaryEngine.runCanaryTest(0.05, 0.15, 20, 15);

      expect(result.passed).toBe(true);
      expect(result.detection_event).toBeGreaterThanOrEqual(20);
    });

    it("returns details array with length=35 for 20 baseline + 15 drift events", () => {
      const result = sfcDriftCanaryEngine.runCanaryTest(0.05, 0.20, 20, 15);

      expect(result.details.length).toBe(35);
      expect(result.details[0].cohort.material).toBe("canary-test");
    });
  });

  describe("Configuration", () => {
    it("configure() returns updated ph_delta=0.10 and ph_lambda=8.0", () => {
      const newConfig = sfcDriftCanaryEngine.configure({ ph_delta: 0.10, ph_lambda: 8.0 });

      expect(newConfig.ph_delta).toBe(0.10);
      expect(newConfig.ph_lambda).toBe(8.0);
    });

    it("getConfig() returns min_events=10 and baseline_window=20 from setup", () => {
      const config = sfcDriftCanaryEngine.getConfig();

      expect(config.min_events).toBe(10);
      expect(config.baseline_window).toBe(20);
    });
  });
});
