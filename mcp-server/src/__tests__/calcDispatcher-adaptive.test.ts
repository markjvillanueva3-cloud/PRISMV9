/**
 * calcDispatcher Adaptive Actions Tests — Phase 0.26 Integration
 */

import { describe, it, expect } from "vitest";

describe("calcDispatcher adaptive actions", () => {
  describe("adaptive_system_analysis", () => {
    it("performs system-wide adaptive analysis for milling", async () => {
      const { adaptiveSystemIntegrationEngine } = await import("../engines/AdaptiveSystemIntegrationEngine.js");

      const result = adaptiveSystemIntegrationEngine.analyzeSystemWide({
        domain: "milling",
        conditions: {
          cutting_speed_mpm: 150,
          feed_mm_rev: 0.15,
          depth_of_cut_mm: 2.5,
          tool_diameter_mm: 12,
          material: "steel",
        },
      });

      expect(result.adaptive).toBeDefined();
      expect(result.adaptive.feedOverride).toBeGreaterThan(0);
      expect(result.riskAssessment).toBeDefined();
      expect(result.business).toBeDefined();
      expect(result.systemStatus).toBeDefined();
    });

    it("includes self-awareness capabilities for milling", async () => {
      const { adaptiveSystemIntegrationEngine } = await import("../engines/AdaptiveSystemIntegrationEngine.js");

      const result = adaptiveSystemIntegrationEngine.analyzeSystemWide({
        domain: "milling",
        conditions: {
          cutting_speed_mpm: 200,
          feed_mm_rev: 0.2,
          depth_of_cut_mm: 3,
          tool_diameter_mm: 16,
          material: "aluminum",
        },
      });

      expect(result.adaptive).toBeDefined();
      expect(result.selfAwareness.capabilitiesUsed.length).toBeGreaterThan(0);
      expect(result.selfAwareness.enginesInvoked.length).toBeGreaterThan(0);
    });
  });

  describe("adaptive_post_processor", () => {
    it("generates Fanuc post-processor injection", async () => {
      const { adaptiveSystemIntegrationEngine } = await import("../engines/AdaptiveSystemIntegrationEngine.js");
      const { adaptivePhysicsBridgeEngine } = await import("../engines/AdaptivePhysicsBridgeEngine.js");

      const conditions = {
        cutting_speed_mpm: 150,
        feed_mm_rev: 0.15,
        depth_of_cut_mm: 2,
        tool_diameter_mm: 12,
        material: "steel" as const,
      };

      const adaptive = adaptivePhysicsBridgeEngine.performIntegratedAnalysis(
        conditions, 8, 22, 0, 3, "flood"
      );

      const result = adaptiveSystemIntegrationEngine.generatePostProcessorInjection("fanuc", adaptive);

      expect(result.controller).toBe("fanuc");
      expect(result.feedOverrideBlock.length).toBeGreaterThan(0);
      expect(result.adaptiveControlBlock.length).toBeGreaterThan(0);
    });

    it("generates Haas post-processor injection", async () => {
      const { adaptiveSystemIntegrationEngine } = await import("../engines/AdaptiveSystemIntegrationEngine.js");
      const { adaptivePhysicsBridgeEngine } = await import("../engines/AdaptivePhysicsBridgeEngine.js");

      const conditions = {
        cutting_speed_mpm: 180,
        feed_mm_rev: 0.2,
        depth_of_cut_mm: 3,
        tool_diameter_mm: 16,
        material: "aluminum" as const,
      };

      const adaptive = adaptivePhysicsBridgeEngine.performIntegratedAnalysis(
        conditions, 5, 15, 0, 3, "flood"
      );

      const result = adaptiveSystemIntegrationEngine.generatePostProcessorInjection("haas", adaptive);

      expect(result.controller).toBe("haas");
      expect(result.feedOverrideBlock.some(line => line.includes("ADAPTIVE"))).toBe(true);
    });
  });

  describe("adaptive_erp_metrics", () => {
    it("calculates ERP process metrics", async () => {
      const { adaptiveSystemIntegrationEngine } = await import("../engines/AdaptiveSystemIntegrationEngine.js");
      const { adaptivePhysicsBridgeEngine } = await import("../engines/AdaptivePhysicsBridgeEngine.js");

      const conditions = {
        cutting_speed_mpm: 120,
        feed_mm_rev: 0.12,
        depth_of_cut_mm: 2,
        tool_diameter_mm: 10,
        material: "stainless" as const,
      };

      const adaptive = adaptivePhysicsBridgeEngine.performIntegratedAnalysis(
        conditions, 6, 18, 10, 3, "flood"
      );

      const result = adaptiveSystemIntegrationEngine.getERPProcessMetrics(
        adaptive, "JOB-2024-001", "OP-020"
      );

      expect(result.jobId).toBe("JOB-2024-001");
      expect(result.operationId).toBe("OP-020");
      expect(result.processCapabilityIndex).toBeGreaterThan(0);
      expect(result.expectedFirstPassYield).toBeGreaterThan(50);
      expect(result.qualityPrediction).toBeDefined();
    });

    it("calculates cycle time efficiency from feed override", async () => {
      const { adaptiveSystemIntegrationEngine } = await import("../engines/AdaptiveSystemIntegrationEngine.js");
      const { adaptivePhysicsBridgeEngine } = await import("../engines/AdaptivePhysicsBridgeEngine.js");

      const conditions = {
        cutting_speed_mpm: 200,
        feed_mm_rev: 0.18,
        depth_of_cut_mm: 2.5,
        tool_diameter_mm: 12,
        material: "steel" as const,
      };

      const adaptive = adaptivePhysicsBridgeEngine.performIntegratedAnalysis(
        conditions, 10, 25, 30, 3, "flood"
      );

      const result = adaptiveSystemIntegrationEngine.getERPProcessMetrics(adaptive);

      expect(result.cycleTimeEfficiency).toBeGreaterThan(0);
      expect(result.processCapabilityIndex).toBeGreaterThan(0);
      expect(result.qualityPrediction.overallPassProbability).toBeGreaterThan(0);
    });
  });

  describe("adaptive_wedm_params", () => {
    it("calculates WEDM parameters for rough cutting", async () => {
      const { adaptiveSystemIntegrationEngine } = await import("../engines/AdaptiveSystemIntegrationEngine.js");

      const result = adaptiveSystemIntegrationEngine.getWEDMAdaptiveParams({
        wire_diameter_mm: 0.25,
        workpiece_thickness_mm: 25.4,
        material: "D2",
        cutting_mode: "rough",
      });

      expect(result.adaptive_on_time_us).toBeGreaterThan(0);
      expect(result.adaptive_off_time_us).toBeGreaterThan(result.adaptive_on_time_us);
      expect(result.adaptive_current_A).toBeGreaterThan(0);
      expect(result.adaptive_voltage_V).toBe(60);
      expect(result.wire_tension_N).toBe(15);
    });

    it("calculates WEDM parameters for finish cutting", async () => {
      const { adaptiveSystemIntegrationEngine } = await import("../engines/AdaptiveSystemIntegrationEngine.js");

      const result = adaptiveSystemIntegrationEngine.getWEDMAdaptiveParams({
        wire_diameter_mm: 0.2,
        workpiece_thickness_mm: 12.7,
        material: "S7",
        cutting_mode: "finish",
        target_surface_finish_um: 0.5,
      });

      expect(result.adaptive_on_time_us).toBeLessThan(2);
      expect(result.adaptive_voltage_V).toBe(35);
      expect(result.wire_tension_N).toBe(12);
      expect(result.recommendations).toContain("Use multiple skim passes for sub-micron finish");
    });

    it("recommends submerged cutting for thick workpieces", async () => {
      const { adaptiveSystemIntegrationEngine } = await import("../engines/AdaptiveSystemIntegrationEngine.js");

      const result = adaptiveSystemIntegrationEngine.getWEDMAdaptiveParams({
        wire_diameter_mm: 0.25,
        workpiece_thickness_mm: 150,
        material: "A2",
        cutting_mode: "rough",
      });

      expect(result.recommendations).toContain("Consider submerged cutting for thermal stability");
      expect(result.flushing_pressure_bar).toBe(8);
    });
  });

  describe("integration with calc dispatcher pattern", () => {
    it("handles missing parameters with defaults", async () => {
      const { adaptiveSystemIntegrationEngine } = await import("../engines/AdaptiveSystemIntegrationEngine.js");

      const result = adaptiveSystemIntegrationEngine.analyzeSystemWide({
        domain: "milling",
        conditions: {
          cutting_speed_mpm: 100,
          feed_mm_rev: 0.1,
          depth_of_cut_mm: 1,
          material: "steel",
        },
      });

      expect(result.adaptive).toBeDefined();
      expect(result.adaptive.feedOverride).toBeGreaterThan(0);
    });

    it("maps material ISO codes correctly", async () => {
      const { adaptiveSystemIntegrationEngine } = await import("../engines/AdaptiveSystemIntegrationEngine.js");

      const steelResult = adaptiveSystemIntegrationEngine.analyzeSystemWide({
        domain: "milling",
        conditions: {
          cutting_speed_mpm: 150,
          feed_mm_rev: 0.15,
          depth_of_cut_mm: 2,
          material: "steel",
        },
      });

      const titaniumResult = adaptiveSystemIntegrationEngine.analyzeSystemWide({
        domain: "milling",
        conditions: {
          cutting_speed_mpm: 50,
          feed_mm_rev: 0.08,
          depth_of_cut_mm: 1,
          material: "titanium",
        },
      });

      expect(steelResult.adaptive).toBeDefined();
      expect(titaniumResult.adaptive).toBeDefined();
    });
  });
});
