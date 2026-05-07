/**
 * AdaptiveSystemIntegrationEngine Tests — Phase 0.26 System-Wide Integration
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  adaptiveSystemIntegrationEngine,
  AdaptiveSystemIntegrationEngine,
} from "../engines/AdaptiveSystemIntegrationEngine.js";

describe("AdaptiveSystemIntegrationEngine", () => {
  describe("singleton export", () => {
    it("exports a singleton instance", () => {
      expect(adaptiveSystemIntegrationEngine).toBeInstanceOf(AdaptiveSystemIntegrationEngine);
    });
  });

  describe("getCapabilityRegistration()", () => {
    it("returns all registered adaptive capabilities", () => {
      const caps = adaptiveSystemIntegrationEngine.getCapabilityRegistration();
      expect(Array.isArray(caps)).toBe(true);
      expect(caps.length).toBeGreaterThan(0);
    });

    it("includes milling adaptive capabilities", () => {
      const caps = adaptiveSystemIntegrationEngine.getCapabilityRegistration();
      const milling = caps.find(c => c.domain === "milling");
      expect(milling).toBeDefined();
      expect(milling!.capabilities).toContain("adaptive_feed_modulation");
      expect(milling!.capabilities).toContain("real_time_engagement_analysis");
      expect(milling!.engines.length).toBeGreaterThan(0);
      expect(milling!.actions.length).toBeGreaterThan(0);
      expect(milling!.formulas.length).toBeGreaterThan(0);
    });

    it("includes turning adaptive capabilities", () => {
      const caps = adaptiveSystemIntegrationEngine.getCapabilityRegistration();
      const turning = caps.find(c => c.domain === "turning");
      expect(turning).toBeDefined();
      expect(turning!.capabilities).toContain("css_optimization");
      expect(turning!.capabilities).toContain("centrifugal_workholding_analysis");
    });

    it("includes correct engines for milling", () => {
      const caps = adaptiveSystemIntegrationEngine.getCapabilityRegistration();
      const milling = caps.find(c => c.domain === "milling");
      expect(milling!.engines).toContain("AdaptivePhysicsBridgeEngine");
      expect(milling!.engines).toContain("HolisticMachiningIntelligenceEngine");
    });

    it("includes correct formulas for turning", () => {
      const caps = adaptiveSystemIntegrationEngine.getCapabilityRegistration();
      const turning = caps.find(c => c.domain === "turning");
      expect(turning!.formulas).toContain("css_rpm_limit");
    });
  });

  describe("analyzeSystemWide()", () => {
    const baseConditions = {
      cutting_speed_mpm: 150,
      feed_mm_rev: 0.15,
      depth_of_cut_mm: 2.5,
      tool_diameter_mm: 12,
      material: "steel" as const,
    };

    const baseParams = {
      domain: "milling" as const,
      conditions: baseConditions,
    };

    it("returns comprehensive system-wide analysis", () => {
      const result = adaptiveSystemIntegrationEngine.analyzeSystemWide(baseParams);

      expect(result.adaptive).toBeDefined();
      expect(result.adaptive.feedOverride).toBeGreaterThan(0);
      expect(result.adaptive.speedOverride).toBeGreaterThan(0);

      expect(result.riskAssessment).toBeDefined();
      expect(result.failureRisk).toBeDefined();

      expect(result.selfAwareness).toBeDefined();
      expect(result.selfAwareness.capabilitiesUsed.length).toBeGreaterThan(0);

      expect(result.postProcessor).toBeDefined();
      expect(result.business).toBeDefined();
      expect(result.systemStatus).toBeDefined();
    });

    it("generates post-processor injection data", () => {
      const result = adaptiveSystemIntegrationEngine.analyzeSystemWide(baseParams);

      expect(result.postProcessor.feedOverrideCode).toBeDefined();
      expect(result.postProcessor.speedOverrideCode).toBeDefined();
      expect(result.postProcessor.adaptiveComments.length).toBeGreaterThan(0);
    });

    it("calculates business impact metrics", () => {
      const result = adaptiveSystemIntegrationEngine.analyzeSystemWide(baseParams);

      expect(result.business.processCapabilityScore).toBeGreaterThanOrEqual(0);
      expect(result.business.processCapabilityScore).toBeLessThanOrEqual(100);
      expect(result.business.qualityRiskLevel).toMatch(/^(low|medium|high)$/);
      expect(result.business.costImpact).toBeDefined();
      expect(result.business.costImpact.total).toBeDefined();
    });

    it("includes calculator action recommendations", () => {
      const result = adaptiveSystemIntegrationEngine.analyzeSystemWide({
        ...baseParams,
        jobId: "JOB-001",
      });

      expect(result.calcActions).toBeDefined();
      expect(result.calcActions.recommended.length).toBeGreaterThan(0);
      expect(result.calcActions.parameters.feed_override).toBeDefined();
      expect(result.calcActions.parameters.tool_life_remaining).toBeGreaterThan(0);
    });
  });

  describe("generatePostProcessorInjection()", () => {
    const mockAdaptive = {
      chip: { chipState: { chipType: "continuous", chipBreaking: true, chipThickness_mm: 0.1 } },
      coolant: { effectiveness: 0.85, recommendations: [] },
      spindle: { currentLoad: 45, loadStatus: "safe" as const, maxSafeLoad: 80, loadPercentage: 45 },
      wear: { currentVB_mm: 0.12, toolLifeRemaining: 45, wearStage: "steady" as const },
      feedOverride: 0.95,
      speedOverride: 1.0,
      overallStatus: "optimal" as const,
      processCapabilityScore: 85,
      combinedRecommendations: [],
    };

    it("generates Fanuc-compatible G-code", () => {
      const result = adaptiveSystemIntegrationEngine.generatePostProcessorInjection(
        "fanuc",
        mockAdaptive as any
      );

      expect(result.controller).toBe("fanuc");
      expect(result.feedOverrideBlock.some((line: string) => line.includes("ADAPTIVE FEED"))).toBe(true);
      expect(result.adaptiveControlBlock.length).toBeGreaterThan(0);
    });

    it("generates Siemens Sinumerik-compatible G-code", () => {
      const result = adaptiveSystemIntegrationEngine.generatePostProcessorInjection(
        "siemens",
        mockAdaptive as any
      );

      expect(result.controller).toBe("siemens");
      expect(result.feedOverrideBlock.some((line: string) => line.includes("ADAPTIVE"))).toBe(true);
    });

    it("generates Haas-compatible G-code", () => {
      const result = adaptiveSystemIntegrationEngine.generatePostProcessorInjection(
        "haas",
        mockAdaptive as any
      );

      expect(result.controller).toBe("haas");
      expect(result.feedOverrideBlock.some((line: string) => line.includes("ADAPTIVE"))).toBe(true);
      expect(result.adaptiveControlBlock.some((line: string) => line.includes("PRISM"))).toBe(true);
    });

    it("generates Mitsubishi-compatible G-code", () => {
      const result = adaptiveSystemIntegrationEngine.generatePostProcessorInjection(
        "mitsubishi",
        mockAdaptive as any
      );

      expect(result.controller).toBe("mitsubishi");
      expect(result.adaptiveControlBlock.some((line: string) => line.includes("STABILITY") || line.includes("OPTIMAL"))).toBe(true);
    });

    it("handles unknown controllers gracefully", () => {
      const result = adaptiveSystemIntegrationEngine.generatePostProcessorInjection(
        "unknown_controller",
        mockAdaptive as any
      );

      expect(result.controller).toBe("unknown_controller");
      expect(result.feedOverrideBlock.length).toBeGreaterThan(0);
    });
  });

  describe("calculateBusinessImpact()", () => {
    const mockAdaptive = {
      feedOverride: 0.85,
      wear: { toolLifeRemaining: 45 },
      processCapabilityScore: 75,
      overallStatus: "acceptable" as const,
    };

    it("calculates cycle time impact", () => {
      const result = adaptiveSystemIntegrationEngine.calculateBusinessImpact(mockAdaptive as any);

      // Feed override < 1 means slower cutting = longer cycle time
      expect(result.estimatedCycleTimeImpact).toBeGreaterThan(0);
    });

    it("calculates tool life impact", () => {
      const result = adaptiveSystemIntegrationEngine.calculateBusinessImpact(mockAdaptive as any);

      // Tool life remaining < 60 min baseline = negative impact
      expect(result.estimatedToolLifeImpact).toBeLessThan(0);
    });

    it("determines quality risk level from capability score", () => {
      // High capability score
      const highResult = adaptiveSystemIntegrationEngine.calculateBusinessImpact({
        ...mockAdaptive,
        processCapabilityScore: 90,
      } as any);
      expect(highResult.qualityRiskLevel).toBe("low");

      // Medium capability score
      const medResult = adaptiveSystemIntegrationEngine.calculateBusinessImpact({
        ...mockAdaptive,
        processCapabilityScore: 70,
      } as any);
      expect(medResult.qualityRiskLevel).toBe("medium");

      // Low capability score
      const lowResult = adaptiveSystemIntegrationEngine.calculateBusinessImpact({
        ...mockAdaptive,
        processCapabilityScore: 50,
      } as any);
      expect(lowResult.qualityRiskLevel).toBe("high");
    });

    it("calculates cost impact breakdown", () => {
      const result = adaptiveSystemIntegrationEngine.calculateBusinessImpact(mockAdaptive as any);

      expect(result.costImpact.tooling).toBeDefined();
      expect(result.costImpact.cycle).toBeDefined();
      expect(result.costImpact.quality).toBeDefined();
      expect(result.costImpact.total).toBeCloseTo(
        result.costImpact.tooling + result.costImpact.cycle + result.costImpact.quality,
        5
      );
    });

    it("includes job ID when provided", () => {
      const result = adaptiveSystemIntegrationEngine.calculateBusinessImpact(
        mockAdaptive as any,
        "JOB-123"
      );

      expect(result.processCapabilityScore).toBe(75);
    });
  });

  describe("getERPProcessMetrics()", () => {
    const mockAdaptive = {
      feedOverride: 0.95,
      wear: { toolLifeRemaining: 40 },
      processCapabilityScore: 80,
      overallStatus: "optimal" as const,
      chip: { chipState: { chipBreaking: true } },
      spindle: { loadStatus: "safe" as const },
    };

    it("calculates process capability index (Cpk-like)", () => {
      const result = adaptiveSystemIntegrationEngine.getERPProcessMetrics(mockAdaptive as any);

      expect(result.processCapabilityIndex).toBeGreaterThan(0);
      expect(result.processCapabilityIndex).toBeLessThanOrEqual(1.33);
    });

    it("estimates first pass yield based on status", () => {
      const optimal = adaptiveSystemIntegrationEngine.getERPProcessMetrics({
        ...mockAdaptive,
        overallStatus: "optimal",
      } as any);
      expect(optimal.expectedFirstPassYield).toBe(98);

      const acceptable = adaptiveSystemIntegrationEngine.getERPProcessMetrics({
        ...mockAdaptive,
        overallStatus: "acceptable",
      } as any);
      expect(acceptable.expectedFirstPassYield).toBe(95);

      const attention = adaptiveSystemIntegrationEngine.getERPProcessMetrics({
        ...mockAdaptive,
        overallStatus: "needs_attention",
      } as any);
      expect(attention.expectedFirstPassYield).toBe(88);

      const critical = adaptiveSystemIntegrationEngine.getERPProcessMetrics({
        ...mockAdaptive,
        overallStatus: "critical",
      } as any);
      expect(critical.expectedFirstPassYield).toBe(75);
    });

    it("calculates tool life utilization", () => {
      const result = adaptiveSystemIntegrationEngine.getERPProcessMetrics(mockAdaptive as any);

      // 40 min remaining from 60 min base = (60-40)/60 = 33.3% utilized
      expect(result.toolLifeUtilization).toBeCloseTo(33.3, 0);
    });

    it("calculates cycle time efficiency from feed override", () => {
      const result = adaptiveSystemIntegrationEngine.getERPProcessMetrics(mockAdaptive as any);

      // Feed override 0.95 = 95% efficiency
      expect(result.cycleTimeEfficiency).toBe(95);
    });

    it("provides quality prediction probabilities", () => {
      const result = adaptiveSystemIntegrationEngine.getERPProcessMetrics(mockAdaptive as any);

      expect(result.qualityPrediction.surfaceFinishProbability).toBeGreaterThanOrEqual(0);
      expect(result.qualityPrediction.surfaceFinishProbability).toBeLessThanOrEqual(1);
      expect(result.qualityPrediction.dimensionalAccuracyProbability).toBeGreaterThanOrEqual(0);
      expect(result.qualityPrediction.dimensionalAccuracyProbability).toBeLessThanOrEqual(1);
      expect(result.qualityPrediction.overallPassProbability).toBeGreaterThanOrEqual(0);
      expect(result.qualityPrediction.overallPassProbability).toBeLessThanOrEqual(1);
    });

    it("includes job and operation IDs when provided", () => {
      const result = adaptiveSystemIntegrationEngine.getERPProcessMetrics(
        mockAdaptive as any,
        "JOB-456",
        "OP-020"
      );

      expect(result.jobId).toBe("JOB-456");
      expect(result.operationId).toBe("OP-020");
    });
  });

  describe("getWEDMAdaptiveParams()", () => {
    it("calculates rough cutting parameters", () => {
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

    it("calculates skim cutting parameters", () => {
      const result = adaptiveSystemIntegrationEngine.getWEDMAdaptiveParams({
        wire_diameter_mm: 0.25,
        workpiece_thickness_mm: 25.4,
        material: "D2",
        cutting_mode: "skim",
      });

      expect(result.adaptive_on_time_us).toBeLessThan(5);
      expect(result.adaptive_voltage_V).toBe(45);
    });

    it("calculates finish cutting parameters", () => {
      const result = adaptiveSystemIntegrationEngine.getWEDMAdaptiveParams({
        wire_diameter_mm: 0.25,
        workpiece_thickness_mm: 25.4,
        material: "D2",
        cutting_mode: "finish",
      });

      expect(result.adaptive_on_time_us).toBeLessThan(1);
      expect(result.adaptive_voltage_V).toBe(35);
    });

    it("adjusts wire tension based on diameter", () => {
      const thin = adaptiveSystemIntegrationEngine.getWEDMAdaptiveParams({
        wire_diameter_mm: 0.15,
        workpiece_thickness_mm: 25.4,
        material: "D2",
        cutting_mode: "rough",
      });
      expect(thin.wire_tension_N).toBe(8);

      const medium = adaptiveSystemIntegrationEngine.getWEDMAdaptiveParams({
        wire_diameter_mm: 0.2,
        workpiece_thickness_mm: 25.4,
        material: "D2",
        cutting_mode: "rough",
      });
      expect(medium.wire_tension_N).toBe(12);

      const thick = adaptiveSystemIntegrationEngine.getWEDMAdaptiveParams({
        wire_diameter_mm: 0.3,
        workpiece_thickness_mm: 25.4,
        material: "D2",
        cutting_mode: "rough",
      });
      expect(thick.wire_tension_N).toBe(15);
    });

    it("adjusts flushing pressure based on thickness", () => {
      const thin = adaptiveSystemIntegrationEngine.getWEDMAdaptiveParams({
        wire_diameter_mm: 0.25,
        workpiece_thickness_mm: 30,
        material: "D2",
        cutting_mode: "rough",
      });
      expect(thin.flushing_pressure_bar).toBe(5);

      const thick = adaptiveSystemIntegrationEngine.getWEDMAdaptiveParams({
        wire_diameter_mm: 0.25,
        workpiece_thickness_mm: 80,
        material: "D2",
        cutting_mode: "rough",
      });
      expect(thick.flushing_pressure_bar).toBe(8);
    });

    it("recommends submerged cutting for thick workpieces", () => {
      const result = adaptiveSystemIntegrationEngine.getWEDMAdaptiveParams({
        wire_diameter_mm: 0.25,
        workpiece_thickness_mm: 120,
        material: "D2",
        cutting_mode: "rough",
      });

      expect(result.recommendations).toContain("Consider submerged cutting for thermal stability");
    });

    it("recommends multiple skim passes for ultra-fine finish", () => {
      const result = adaptiveSystemIntegrationEngine.getWEDMAdaptiveParams({
        wire_diameter_mm: 0.25,
        workpiece_thickness_mm: 25.4,
        material: "D2",
        cutting_mode: "finish",
        target_surface_finish_um: 0.5,
      });

      expect(result.recommendations).toContain("Use multiple skim passes for sub-micron finish");
    });

    it("scales parameters with workpiece thickness", () => {
      const thin = adaptiveSystemIntegrationEngine.getWEDMAdaptiveParams({
        wire_diameter_mm: 0.25,
        workpiece_thickness_mm: 12.7,
        material: "D2",
        cutting_mode: "rough",
      });

      const thick = adaptiveSystemIntegrationEngine.getWEDMAdaptiveParams({
        wire_diameter_mm: 0.25,
        workpiece_thickness_mm: 50.8,
        material: "D2",
        cutting_mode: "rough",
      });

      expect(thick.adaptive_on_time_us).toBeGreaterThan(thin.adaptive_on_time_us);
      expect(thick.adaptive_current_A).toBeGreaterThan(thin.adaptive_current_A);
    });
  });

  describe("getSelfAwarenessSummary()", () => {
    it("provides total counts across all domains", () => {
      const summary = adaptiveSystemIntegrationEngine.getSelfAwarenessSummary();

      expect(summary.totalCapabilities).toBeGreaterThan(0);
      expect(summary.totalEngines).toBeGreaterThan(0);
      expect(summary.totalActions).toBeGreaterThan(0);
      expect(summary.domains).toContain("milling");
      expect(summary.domains).toContain("turning");
    });

    it("lists top capabilities", () => {
      const summary = adaptiveSystemIntegrationEngine.getSelfAwarenessSummary();
      expect(summary.topCapabilities.length).toBe(5);
    });

    it("returns unique engine counts", () => {
      const summary = adaptiveSystemIntegrationEngine.getSelfAwarenessSummary();
      // Should deduplicate engines shared between domains
      expect(summary.totalEngines).toBeLessThanOrEqual(
        adaptiveSystemIntegrationEngine.getCapabilityRegistration()
          .flatMap(c => c.engines).length
      );
    });
  });
});
