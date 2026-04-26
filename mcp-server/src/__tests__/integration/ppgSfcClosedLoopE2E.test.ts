/**
 * PPG+SFC Closed Loop E2E Integration Test — U-PPG-SFC-14
 * ========================================================
 *
 * End-to-end test proving the closed-loop learning system works.
 *
 * @module __tests__/integration/ppgSfcClosedLoopE2E.test.ts
 * @milestone PSAU-PPG-SFC U-PPG-SFC-14
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  ppgSFCClosedLoopOrchestratorEngine,
  type ClosedLoopJobInput,
  type OperatorOverride,
} from "../../engines/PPGSFCClosedLoopOrchestratorEngine.js";

interface OutcomeCaptureData {
  override: OperatorOverride;
  history_size: number;
}

interface ThresholdCheckData {
  history_size: number;
  threshold: number;
  threshold_met: boolean;
}

describe("PPGSFCClosedLoopE2E", () => {
  const ALCOA_D2_JOB: ClosedLoopJobInput = {
    customer: "ALCOA",
    material: "D2",
    tool_class: "TNMG-carbide",
    machine_id: "Okuma-LB45",
    controller: "Okuma-OSP",
    op_type: "roughing",
  };

  beforeEach(() => {
    ppgSFCClosedLoopOrchestratorEngine.reset();
  });

  describe("executeClosedLoop()", () => {
    it("completes phases 1-2 and 7-8; skips 3-6 on fresh job (no training history)", async () => {
      const result = await ppgSFCClosedLoopOrchestratorEngine.executeClosedLoop(ALCOA_D2_JOB);

      expect(result.success).toBe(true);
      expect(result.lineage_id.length).toBe(36);
      expect(result.phases[0].status).toBe("complete");
      expect(result.phases[1].status).toBe("complete");
      expect(result.phases[2].status).toBe("complete");
      const thresholdData = result.phases[2].data as unknown as ThresholdCheckData;
      expect(thresholdData.threshold_met).toBe(false);
      expect(result.phases[3].status).toBe("skipped");
      expect(result.phases[4].status).toBe("skipped");
      expect(result.phases[5].status).toBe("skipped");
      expect(result.phases[6].status).toBe("complete");
      expect(result.phases[7].status).toBe("complete");
    });

    it("returns SFC sfm > 100 and feed > 0.001 with valid provenance", async () => {
      const result = await ppgSFCClosedLoopOrchestratorEngine.executeClosedLoop(ALCOA_D2_JOB);

      expect(result.sfc_recommendation!.sfm).toBeGreaterThan(100);
      expect(result.sfc_recommendation!.sfm).toBeLessThan(1000);
      expect(result.sfc_recommendation!.feed).toBeGreaterThan(0.001);
      expect(result.sfc_recommendation!.feed).toBeLessThan(0.1);
      expect(result.sfc_recommendation!.confidence).toBeGreaterThan(0.5);
      expect(result.sfc_recommendation!.provenance_valid).toBe(true);
    });

    it("returns PPG with >5 gcode lines for Okuma-OSP controller", async () => {
      const result = await ppgSFCClosedLoopOrchestratorEngine.executeClosedLoop(ALCOA_D2_JOB);

      expect(result.ppg_emission!.gcode_lines).toBeGreaterThan(5);
      expect(result.ppg_emission!.controller).toBe("Okuma-OSP");
      expect(result.ppg_emission!.provenance_valid).toBe(true);
    });

    it("threads lineage_id through outcome capture phase", async () => {
      const result = await ppgSFCClosedLoopOrchestratorEngine.executeClosedLoop(ALCOA_D2_JOB);
      const outcomeData = result.phases[1].data as unknown as OutcomeCaptureData;

      expect(outcomeData.override.lineage_id).toBe(result.lineage_id);
    });

    it("captures operator override with factor 0.85 and reason chatter_observed", async () => {
      const result = await ppgSFCClosedLoopOrchestratorEngine.executeClosedLoop(ALCOA_D2_JOB);
      const outcomeData = result.phases[1].data as unknown as OutcomeCaptureData;

      expect(outcomeData.override.override_factor).toBe(0.85);
      expect(outcomeData.override.reason).toBe("chatter_observed");
    });

    it("accumulates history: 1 after first call, 3 after third call", async () => {
      const adapterKey = `${ALCOA_D2_JOB.customer}-${ALCOA_D2_JOB.material}-${ALCOA_D2_JOB.machine_id}`;

      await ppgSFCClosedLoopOrchestratorEngine.executeClosedLoop(ALCOA_D2_JOB);
      expect(ppgSFCClosedLoopOrchestratorEngine.getOverrideHistorySize(adapterKey)).toBe(1);

      await ppgSFCClosedLoopOrchestratorEngine.executeClosedLoop(ALCOA_D2_JOB);
      await ppgSFCClosedLoopOrchestratorEngine.executeClosedLoop(ALCOA_D2_JOB);
      expect(ppgSFCClosedLoopOrchestratorEngine.getOverrideHistorySize(adapterKey)).toBe(3);
    });

    it("completes full workflow in under 5000ms", async () => {
      const result = await ppgSFCClosedLoopOrchestratorEngine.executeClosedLoop(ALCOA_D2_JOB);

      expect(result.total_duration_ms).toBeGreaterThan(0);
      expect(result.total_duration_ms).toBeLessThan(5000);
    });
  });

  describe("Full closed-loop with training (30+ history events)", () => {
    it("triggers training, shadow mode, and promotion when threshold met", async () => {
      const adapterKey = `${ALCOA_D2_JOB.customer}-${ALCOA_D2_JOB.material}-${ALCOA_D2_JOB.machine_id}`;

      const syntheticOverrides: OperatorOverride[] = Array.from({ length: 29 }, (_, i) => ({
        lineage_id: `synthetic-${i}`,
        recommended_sfm: 320,
        actual_sfm: 272,
        override_factor: 0.85,
        reason: "synthetic_test",
      }));
      ppgSFCClosedLoopOrchestratorEngine.injectOverrideHistory(adapterKey, syntheticOverrides);

      const result = await ppgSFCClosedLoopOrchestratorEngine.executeClosedLoop(ALCOA_D2_JOB);
      const thresholdData = result.phases[2].data as unknown as ThresholdCheckData;

      expect(result.success).toBe(true);
      expect(thresholdData.threshold_met).toBe(true);
      expect(result.phases[3].status).toBe("complete");
      expect(result.training!.triggered).toBe(true);
      expect(result.training!.adapter_id).toContain("sfc-ALCOA-D2");
      expect(result.training!.experiences_count).toBe(30);
      expect(result.phases[4].status).toBe("complete");
      expect(result.shadow_mode!.events_simulated).toBeGreaterThan(0);
      expect(result.shadow_mode!.brier_base).toBeGreaterThan(0);
      expect(result.shadow_mode!.improvement).toBeGreaterThan(0);
      expect(result.shadow_mode!.promoted).toBe(true);
      expect(result.phases[5].status).toBe("complete");
    });

    it("adapted result cites override history after training", async () => {
      const adapterKey = `${ALCOA_D2_JOB.customer}-${ALCOA_D2_JOB.material}-${ALCOA_D2_JOB.machine_id}`;

      const syntheticOverrides: OperatorOverride[] = Array.from({ length: 35 }, () => ({
        lineage_id: `synthetic-${Math.random()}`,
        recommended_sfm: 320,
        actual_sfm: 272,
        override_factor: 0.85,
        reason: "chatter",
      }));
      ppgSFCClosedLoopOrchestratorEngine.injectOverrideHistory(adapterKey, syntheticOverrides);

      const result = await ppgSFCClosedLoopOrchestratorEngine.executeClosedLoop(ALCOA_D2_JOB);

      expect(result.adapted_result!.provenance_cites_override_history).toBe(true);
    });

    it("shadow mode Brier improvement is positive for consistent override pattern", async () => {
      const adapterKey = `${ALCOA_D2_JOB.customer}-${ALCOA_D2_JOB.material}-${ALCOA_D2_JOB.machine_id}`;

      const syntheticOverrides: OperatorOverride[] = Array.from({ length: 30 }, () => ({
        lineage_id: `synthetic-${Math.random()}`,
        recommended_sfm: 320,
        actual_sfm: 272,
        override_factor: 0.85,
        reason: "chatter",
      }));
      ppgSFCClosedLoopOrchestratorEngine.injectOverrideHistory(adapterKey, syntheticOverrides);

      const result = await ppgSFCClosedLoopOrchestratorEngine.executeClosedLoop(ALCOA_D2_JOB);

      expect(result.shadow_mode!.improvement).toBeGreaterThan(0);
    });
  });

  describe("injectOverrideHistory()", () => {
    it("returns injected=2 and total=2 for fresh key with 2 events", () => {
      const result = ppgSFCClosedLoopOrchestratorEngine.injectOverrideHistory("TEST-KEY", [
        { lineage_id: "1", recommended_sfm: 300, actual_sfm: 255, override_factor: 0.85 },
        { lineage_id: "2", recommended_sfm: 300, actual_sfm: 270, override_factor: 0.9 },
      ]);

      expect(result.injected).toBe(2);
      expect(result.total).toBe(2);
      expect(ppgSFCClosedLoopOrchestratorEngine.getOverrideHistorySize("TEST-KEY")).toBe(2);
    });

    it("accumulates: inject 1, then inject 1 more = total 2", () => {
      ppgSFCClosedLoopOrchestratorEngine.injectOverrideHistory("TEST-KEY", [
        { lineage_id: "1", recommended_sfm: 300, actual_sfm: 255, override_factor: 0.85 },
      ]);

      const result = ppgSFCClosedLoopOrchestratorEngine.injectOverrideHistory("TEST-KEY", [
        { lineage_id: "2", recommended_sfm: 300, actual_sfm: 270, override_factor: 0.9 },
      ]);

      expect(result.injected).toBe(1);
      expect(result.total).toBe(2);
    });
  });

  describe("reset()", () => {
    it("clears override history to 0", async () => {
      const adapterKey = `${ALCOA_D2_JOB.customer}-${ALCOA_D2_JOB.material}-${ALCOA_D2_JOB.machine_id}`;

      await ppgSFCClosedLoopOrchestratorEngine.executeClosedLoop(ALCOA_D2_JOB);
      expect(ppgSFCClosedLoopOrchestratorEngine.getOverrideHistorySize(adapterKey)).toBe(1);

      ppgSFCClosedLoopOrchestratorEngine.reset();

      expect(ppgSFCClosedLoopOrchestratorEngine.getOverrideHistorySize(adapterKey)).toBe(0);
    });
  });

  describe("JM Die ALCOA D2 worked example (milestone exit criteria)", () => {
    it("full loop: 30 historical overrides -> training -> shadow promotes -> adapted cites history", async () => {
      const adapterKey = `${ALCOA_D2_JOB.customer}-${ALCOA_D2_JOB.material}-${ALCOA_D2_JOB.machine_id}`;

      const historicalOverrides: OperatorOverride[] = Array.from({ length: 30 }, (_, i) => ({
        lineage_id: `historical-${i}`,
        recommended_sfm: 320,
        actual_sfm: 270 + (i % 5),
        override_factor: 0.84 + (i % 5) * 0.01,
        reason: i % 2 === 0 ? "chatter" : "tool_wear",
      }));
      ppgSFCClosedLoopOrchestratorEngine.injectOverrideHistory(adapterKey, historicalOverrides);

      const result = await ppgSFCClosedLoopOrchestratorEngine.executeClosedLoop(ALCOA_D2_JOB);

      expect(result.success).toBe(true);
      expect(result.sfc_recommendation!.provenance_valid).toBe(true);
      expect(result.training!.triggered).toBe(true);
      expect(result.shadow_mode!.promoted).toBe(true);
      expect(result.adapted_result!.provenance_cites_override_history).toBe(true);
      expect(result.ppg_emission!.gcode_lines).toBeGreaterThan(5);
      expect(result.ppg_emission!.provenance_valid).toBe(true);
      expect(result.lineage_id.length).toBe(36);
    });
  });
});
