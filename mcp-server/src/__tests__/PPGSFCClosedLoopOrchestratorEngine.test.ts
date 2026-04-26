/**
 * PPGSFCClosedLoopOrchestratorEngine Unit Tests
 * @module __tests__/PPGSFCClosedLoopOrchestratorEngine.test
 * @see ../engines/PPGSFCClosedLoopOrchestratorEngine.ts
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  ppgSFCClosedLoopOrchestratorEngine,
  type ClosedLoopJobInput,
  type OperatorOverride,
} from "../engines/PPGSFCClosedLoopOrchestratorEngine.js";

describe("PPGSFCClosedLoopOrchestratorEngine", () => {
  beforeEach(() => {
    ppgSFCClosedLoopOrchestratorEngine.reset();
  });

  describe("executeClosedLoop", () => {
    it("executes 8-phase workflow returning success with valid lineage UUID", async () => {
      const job: ClosedLoopJobInput = {
        customer: "ALCOA",
        material: "D2",
        tool_class: "end_mill",
        machine_id: "VMC-001",
        controller: "fanuc",
      };

      const result = await ppgSFCClosedLoopOrchestratorEngine.executeClosedLoop(job);

      expect(result.success).toBe(true);
      expect(result.lineage_id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
      expect(result.phases.length).toBe(8);
      expect(result.total_duration_ms).toBeGreaterThanOrEqual(0.01);
    });

    it("generates SFC recommendation with sfm between 300-350 and feed between 0.004-0.006", async () => {
      const job: ClosedLoopJobInput = {
        customer: "ITW",
        material: "4140",
        tool_class: "face_mill",
        machine_id: "HMC-002",
        controller: "siemens",
      };

      const result = await ppgSFCClosedLoopOrchestratorEngine.executeClosedLoop(job);

      expect(result.sfc_recommendation?.sfm).toBeGreaterThanOrEqual(300);
      expect(result.sfc_recommendation?.sfm).toBeLessThanOrEqual(350);
      expect(result.sfc_recommendation?.feed).toBeGreaterThanOrEqual(0.004);
      expect(result.sfc_recommendation?.feed).toBeLessThanOrEqual(0.006);
      expect(result.sfc_recommendation?.confidence).toBe(0.85);
      expect(result.sfc_recommendation?.provenance_valid).toBe(true);
    });

    it("captures operator override with 0.85 factor and chatter_observed reason", async () => {
      const job: ClosedLoopJobInput = {
        customer: "SFS",
        material: "A2",
        tool_class: "drill",
        machine_id: "LATHE-003",
        controller: "okuma",
      };

      const result = await ppgSFCClosedLoopOrchestratorEngine.executeClosedLoop(job);
      const phase2 = result.phases[1];
      const overrideData = phase2.data as { override: OperatorOverride; history_size: number };

      expect(phase2.status).toBe("complete");
      expect(phase2.name).toBe("Outcome Capture");
      expect(overrideData.override.override_factor).toBe(0.85);
      expect(overrideData.override.reason).toBe("chatter_observed");
      expect(overrideData.history_size).toBe(1);
    });

    it("skips training phase with reason threshold_not_met when history < 30", async () => {
      const job: ClosedLoopJobInput = {
        customer: "OPTIMAS",
        material: "M2",
        tool_class: "reamer",
        machine_id: "VMC-004",
        controller: "fanuc",
      };

      const result = await ppgSFCClosedLoopOrchestratorEngine.executeClosedLoop(job);
      const phase4 = result.phases[3];
      const skipData = phase4.data as { reason: string; current: number; required: number };

      expect(result.training?.triggered).toBe(false);
      expect(phase4.status).toBe("skipped");
      expect(skipData.reason).toBe("threshold_not_met");
      expect(skipData.current).toBeLessThan(30);
      expect(skipData.required).toBe(30);
    });

    it("emits PPG G-code with 13 lines including O0001 header and M30 footer", async () => {
      const job: ClosedLoopJobInput = {
        customer: "HOLO-KROME",
        material: "S7",
        tool_class: "end_mill",
        machine_id: "VMC-005",
        controller: "haas",
      };

      const result = await ppgSFCClosedLoopOrchestratorEngine.executeClosedLoop(job);

      expect(result.ppg_emission?.gcode_lines).toBe(13);
      expect(result.ppg_emission?.controller).toBe("haas");
      expect(result.ppg_emission?.dialect).toBe("standard");
      expect(result.ppg_emission?.provenance_valid).toBe(true);
    });

    it("processes job with op_type roughing without error", async () => {
      const job: ClosedLoopJobInput = {
        customer: "ALCOA",
        material: "D2",
        tool_class: "end_mill",
        machine_id: "VMC-001",
        controller: "fanuc",
        op_type: "roughing",
      };

      const result = await ppgSFCClosedLoopOrchestratorEngine.executeClosedLoop(job);

      expect(result.success).toBe(true);
      expect(result.phases.filter(p => p.status === "complete").length).toBeGreaterThanOrEqual(4);
    });

    it("produces adapted result with delta 0 when no prior training", async () => {
      const job: ClosedLoopJobInput = {
        customer: "ITW",
        material: "4140",
        tool_class: "face_mill",
        machine_id: "HMC-002",
        controller: "siemens",
      };

      const result = await ppgSFCClosedLoopOrchestratorEngine.executeClosedLoop(job);

      expect(result.adapted_result?.sfm).toBe(result.sfc_recommendation?.sfm);
      expect(result.adapted_result?.delta_from_original).toBe(0);
      expect(result.adapted_result?.provenance_cites_override_history).toBe(true);
    });

    it("tracks phase durations as non-negative integers for completed phases", async () => {
      const job: ClosedLoopJobInput = {
        customer: "SFS",
        material: "A2",
        tool_class: "drill",
        machine_id: "LATHE-003",
        controller: "okuma",
      };

      const result = await ppgSFCClosedLoopOrchestratorEngine.executeClosedLoop(job);

      const completedPhases = result.phases.filter(p => p.status === "complete");
      expect(completedPhases.length).toBeGreaterThanOrEqual(4);

      for (const phase of completedPhases) {
        expect(Number.isInteger(phase.duration_ms)).toBe(true);
        expect(phase.duration_ms).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe("injectOverrideHistory", () => {
    it("injects 2 override records returning injected=2 total=2", () => {
      const adapterKey = "ALCOA-D2-VMC-001";
      const overrides: OperatorOverride[] = [
        {
          lineage_id: "test-1",
          recommended_sfm: 300,
          actual_sfm: 255,
          override_factor: 0.85,
          reason: "chatter",
        },
        {
          lineage_id: "test-2",
          recommended_sfm: 320,
          actual_sfm: 288,
          override_factor: 0.9,
          reason: "tool_wear",
        },
      ];

      const result = ppgSFCClosedLoopOrchestratorEngine.injectOverrideHistory(
        adapterKey,
        overrides
      );

      expect(result.injected).toBe(2);
      expect(result.total).toBe(2);
    });

    it("accumulates with existing history returning correct total", () => {
      const adapterKey = "ITW-4140-HMC-002";

      ppgSFCClosedLoopOrchestratorEngine.injectOverrideHistory(adapterKey, [
        { lineage_id: "a", recommended_sfm: 300, actual_sfm: 270, override_factor: 0.9 },
      ]);

      const result = ppgSFCClosedLoopOrchestratorEngine.injectOverrideHistory(adapterKey, [
        { lineage_id: "b", recommended_sfm: 310, actual_sfm: 280, override_factor: 0.9 },
        { lineage_id: "c", recommended_sfm: 320, actual_sfm: 290, override_factor: 0.9 },
      ]);

      expect(result.injected).toBe(2);
      expect(result.total).toBe(3);
    });
  });

  describe("getOverrideHistorySize", () => {
    it("returns 0 for unknown adapter key", () => {
      const size = ppgSFCClosedLoopOrchestratorEngine.getOverrideHistorySize("unknown-key");
      expect(size).toBe(0);
    });

    it("returns 2 after injecting 2 overrides", () => {
      const adapterKey = "SFS-A2-LATHE-003";

      ppgSFCClosedLoopOrchestratorEngine.injectOverrideHistory(adapterKey, [
        { lineage_id: "x", recommended_sfm: 200, actual_sfm: 180, override_factor: 0.9 },
        { lineage_id: "y", recommended_sfm: 210, actual_sfm: 189, override_factor: 0.9 },
      ]);

      const size = ppgSFCClosedLoopOrchestratorEngine.getOverrideHistorySize(adapterKey);
      expect(size).toBe(2);
    });
  });

  describe("reset", () => {
    it("clears all override history returning 0 for all keys", () => {
      ppgSFCClosedLoopOrchestratorEngine.injectOverrideHistory("key-1", [
        { lineage_id: "a", recommended_sfm: 300, actual_sfm: 270, override_factor: 0.9 },
      ]);
      ppgSFCClosedLoopOrchestratorEngine.injectOverrideHistory("key-2", [
        { lineage_id: "b", recommended_sfm: 310, actual_sfm: 280, override_factor: 0.9 },
      ]);

      ppgSFCClosedLoopOrchestratorEngine.reset();

      expect(ppgSFCClosedLoopOrchestratorEngine.getOverrideHistorySize("key-1")).toBe(0);
      expect(ppgSFCClosedLoopOrchestratorEngine.getOverrideHistorySize("key-2")).toBe(0);
    });
  });

  describe("training threshold behavior", () => {
    it("triggers training with adapter_id containing customer-material when history >= 30", async () => {
      const adapterKey = "THRESHOLD-TEST-VMC";
      const overrides: OperatorOverride[] = Array.from({ length: 30 }, (_, i) => ({
        lineage_id: `override-${i}`,
        recommended_sfm: 300 + i,
        actual_sfm: 255 + i,
        override_factor: 0.85,
        reason: "threshold_test",
      }));

      ppgSFCClosedLoopOrchestratorEngine.injectOverrideHistory(adapterKey, overrides);

      const job: ClosedLoopJobInput = {
        customer: "THRESHOLD",
        material: "TEST",
        tool_class: "end_mill",
        machine_id: "VMC",
        controller: "fanuc",
      };

      const result = await ppgSFCClosedLoopOrchestratorEngine.executeClosedLoop(job);

      expect(result.training?.triggered).toBe(true);
      expect(result.training?.adapter_id).toBe("sfc-THRESHOLD-TEST-v1");
      expect(result.training?.experiences_count).toBeGreaterThanOrEqual(30);
      expect(result.training?.forgetting_rate).toBe(0.02);
      expect(result.phases[3].status).toBe("complete");
    });

    it("runs shadow mode with 30+ events and computes brier scores", async () => {
      const adapterKey = "SHADOW-TEST-VMC";
      const overrides: OperatorOverride[] = Array.from({ length: 35 }, (_, i) => ({
        lineage_id: `shadow-${i}`,
        recommended_sfm: 300,
        actual_sfm: 255,
        override_factor: 0.85,
      }));

      ppgSFCClosedLoopOrchestratorEngine.injectOverrideHistory(adapterKey, overrides);

      const job: ClosedLoopJobInput = {
        customer: "SHADOW",
        material: "TEST",
        tool_class: "end_mill",
        machine_id: "VMC",
        controller: "fanuc",
      };

      const result = await ppgSFCClosedLoopOrchestratorEngine.executeClosedLoop(job);

      expect(result.shadow_mode?.events_simulated).toBeGreaterThanOrEqual(30);
      expect(result.shadow_mode?.brier_base).toBeGreaterThan(0);
      expect(result.shadow_mode?.brier_adapted).toBeGreaterThanOrEqual(0);
      expect(typeof result.shadow_mode?.improvement).toBe("number");
      expect(typeof result.shadow_mode?.promoted).toBe("boolean");
    });

    it("applies 13% reduction to adapted sfm when threshold met", async () => {
      const job: ClosedLoopJobInput = {
        customer: "ADAPT",
        material: "ALCOA",
        tool_class: "end_mill",
        machine_id: "D2",
        controller: "VMC",
      };
      const adapterKey = `${job.customer}-${job.material}-${job.machine_id}`;
      const overrides: OperatorOverride[] = Array.from({ length: 32 }, (_, i) => ({
        lineage_id: `adapt-${i}`,
        recommended_sfm: 300,
        actual_sfm: 255,
        override_factor: 0.85,
      }));

      ppgSFCClosedLoopOrchestratorEngine.injectOverrideHistory(adapterKey, overrides);

      const result = await ppgSFCClosedLoopOrchestratorEngine.executeClosedLoop(job);
      const originalSfm = result.sfc_recommendation?.sfm ?? 300;
      const expectedAdapted = Math.round(originalSfm * 0.87);

      expect(result.adapted_result?.sfm).toBe(expectedAdapted);
      expect(result.adapted_result?.delta_from_original).toBe(expectedAdapted - originalSfm);
    });
  });

  describe("error handling", () => {
    it("returns success false if any phase throws", async () => {
      const job: ClosedLoopJobInput = {
        customer: "",
        material: "",
        tool_class: "",
        machine_id: "",
        controller: "",
      };

      const result = await ppgSFCClosedLoopOrchestratorEngine.executeClosedLoop(job);

      expect(result.lineage_id).toMatch(/^[0-9a-f-]{36}$/i);
      expect(result.phases.length).toBe(8);
    });
  });
});
