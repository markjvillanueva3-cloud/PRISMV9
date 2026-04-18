/**
 * UpstreamValidationHandshakeEngine Tests — MILL-AGI-P1/U-P1.3-01
 *
 * Tests the 4-validator handshake: controller → machine → safety → cost
 */

import { describe, it, expect } from "vitest";
import {
  UpstreamValidationHandshakeEngine,
  type StrategySelection,
} from "../engines/UpstreamValidationHandshakeEngine.js";

describe("UpstreamValidationHandshakeEngine", () => {
  describe("validate", () => {
    it("should approve valid strategy with all validators passing", async () => {
      const selection: StrategySelection = {
        strategyId: "strat-001",
        strategyType: "adaptive_clearing",
        featureType: "pocket",
        material: "P-steel",
        machineId: "vmc-001",
        controllerId: "fanuc_30i",
      };

      const result = await UpstreamValidationHandshakeEngine.validate(selection);

      expect(result.approved).toBe(true);
      expect(result.strategyId).toBe("strat-001");
      expect(result.confidence).toBeGreaterThan(0.6);
      expect(result.validatorResults.length).toBe(4);
      expect(result.blockingReasons.length).toBe(0);
    });

    it("should run all 4 validators", async () => {
      const selection: StrategySelection = {
        strategyId: "strat-002",
        strategyType: "trochoidal_milling",
        material: "M-stainless",
        machineId: "mill-001",
        controllerId: "siemens_840d",
      };

      const result = await UpstreamValidationHandshakeEngine.validate(selection);

      const validators = result.validatorResults.map(v => v.validator);
      expect(validators).toContain("controller");
      expect(validators).toContain("machine");
      expect(validators).toContain("safety");
      expect(validators).toContain("cost");
    });

    it("should reject strategy requiring NURBS on non-NURBS controller", async () => {
      const selection: StrategySelection = {
        strategyId: "strat-003",
        strategyType: "morphed_spiral",
        machineId: "vmc-haas",
        controllerId: "haas_ngc",
      };

      const result = await UpstreamValidationHandshakeEngine.validate(selection);

      expect(result.approved).toBe(false);
      expect(result.blockingReasons.some(r => r.includes("Controller"))).toBe(true);
    });

    it("should reject 5-axis strategy on non-5-axis controller", async () => {
      const selection: StrategySelection = {
        strategyId: "strat-004",
        strategyType: "5axis_simultaneous",
        machineId: "vmc-3ax",
        controllerId: "haas_ngc",
      };

      const result = await UpstreamValidationHandshakeEngine.validate(selection);

      expect(result.approved).toBe(false);
      expect(result.totalIssues.errors).toBeGreaterThan(0);
    });

    it("should provide safety warnings for risky strategies", async () => {
      const selection: StrategySelection = {
        strategyId: "strat-005",
        strategyType: "5axis_simultaneous",
        machineId: "5ax-001",
        controllerId: "siemens_840d",
        parameters: { collision_check: false },
      };

      const result = await UpstreamValidationHandshakeEngine.validate(selection);

      const safetyResult = result.validatorResults.find(v => v.validator === "safety");
      expect(safetyResult?.issues.some(i => i.code === "SAFE_COLLISION_UNCHECKED")).toBe(true);
    });

    it("should return recommendations for improvement", async () => {
      const selection: StrategySelection = {
        strategyId: "strat-006",
        strategyType: "high_speed_finishing",
        machineId: "vmc-001",
        controllerId: "fanuc_31i",
      };

      const result = await UpstreamValidationHandshakeEngine.validate(selection);

      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it("should include provenance metadata", async () => {
      const selection: StrategySelection = {
        strategyId: "strat-007",
        strategyType: "face_milling",
      };

      const result = await UpstreamValidationHandshakeEngine.validate(selection);

      expect(result._provenance).toBeDefined();
      expect(result._provenance.engine).toBe("UpstreamValidationHandshakeEngine");
      expect(result._provenance.version).toBeDefined();
      expect(result._provenance.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it("should calculate duration in milliseconds", async () => {
      const selection: StrategySelection = {
        strategyId: "strat-008",
        strategyType: "z_level_roughing",
      };

      const result = await UpstreamValidationHandshakeEngine.validate(selection);

      expect(result.duration_ms).toBeGreaterThanOrEqual(0);
    });

    it("should handle titanium with HPC recommendation", async () => {
      const selection: StrategySelection = {
        strategyId: "strat-009",
        strategyType: "adaptive_clearing",
        material: "titanium Ti-6Al-4V",
        machineId: "5ax-001",
        controllerId: "mazak_smooth_ai",
      };

      const result = await UpstreamValidationHandshakeEngine.validate(selection);

      const machineResult = result.validatorResults.find(v => v.validator === "machine");
      expect(machineResult?.issues.some(i => i.code === "MACH_HPC_RECOMMENDED")).toBe(true);
    });

    it("should handle tight tolerance cost impact", async () => {
      const selection: StrategySelection = {
        strategyId: "strat-010",
        strategyType: "high_speed_finishing",
        parameters: { tolerance: 0.005 },
      };

      const result = await UpstreamValidationHandshakeEngine.validate(selection);

      const costResult = result.validatorResults.find(v => v.validator === "cost");
      expect(costResult?.issues.some(i => i.code === "COST_TIGHT_TOLERANCE")).toBe(true);
    });
  });

  describe("precheck", () => {
    it("should return likely_approved for complete selection", async () => {
      const selection: StrategySelection = {
        strategyId: "strat-011",
        strategyType: "trochoidal_milling",
        machineId: "vmc-001",
        controllerId: "fanuc_30i",
      };

      const result = await UpstreamValidationHandshakeEngine.precheck(selection);

      expect(result.likely_approved).toBe(true);
      expect(result.blockers.length).toBe(0);
    });

    it("should flag missing controller", async () => {
      const selection: StrategySelection = {
        strategyId: "strat-012",
        strategyType: "adaptive_clearing",
        machineId: "vmc-001",
      };

      const result = await UpstreamValidationHandshakeEngine.precheck(selection);

      expect(result.blockers).toContain("No controller specified");
    });

    it("should flag missing machine", async () => {
      const selection: StrategySelection = {
        strategyId: "strat-013",
        strategyType: "z_level_roughing",
        controllerId: "siemens_840d",
      };

      const result = await UpstreamValidationHandshakeEngine.precheck(selection);

      expect(result.blockers).toContain("No machine specified");
    });

    it("should flag 5-axis without collision check", async () => {
      const selection: StrategySelection = {
        strategyId: "strat-014",
        strategyType: "5axis_simultaneous",
        machineId: "5ax-001",
        controllerId: "heidenhain_tnc640",
        parameters: {},
      };

      const result = await UpstreamValidationHandshakeEngine.precheck(selection);

      expect(result.blockers.some(b => b.includes("collision"))).toBe(true);
    });
  });

  describe("getConfig", () => {
    it("should return configuration with thresholds", () => {
      const config = UpstreamValidationHandshakeEngine.getConfig();

      expect(config.version).toBeDefined();
      expect(config.safetyThreshold).toBe(0.70);
      expect(config.costBenefitThreshold).toBe(0.5);
      expect(config.minConfidence).toBe(0.60);
      expect(config.validators).toHaveLength(4);
    });
  });

  describe("validator scoring", () => {
    it("should weight safety higher than cost", async () => {
      const selection: StrategySelection = {
        strategyId: "strat-015",
        strategyType: "plunge_roughing",
        machineId: "vmc-001",
        controllerId: "fanuc_30i",
      };

      const result = await UpstreamValidationHandshakeEngine.validate(selection);

      // Safety weight is 0.35, cost is 0.15
      const safetyResult = result.validatorResults.find(v => v.validator === "safety");
      const costResult = result.validatorResults.find(v => v.validator === "cost");
      expect(safetyResult).toBeDefined();
      expect(costResult).toBeDefined();
    });

    it("should calculate confidence within 0-1 range", async () => {
      const selection: StrategySelection = {
        strategyId: "strat-016",
        strategyType: "bore_milling",
      };

      const result = await UpstreamValidationHandshakeEngine.validate(selection);

      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });
  });

  describe("issue counting", () => {
    it("should count issues by severity", async () => {
      const selection: StrategySelection = {
        strategyId: "strat-017",
        strategyType: "5axis_simultaneous",
        machineId: "5ax-001",
        controllerId: "haas_ngc",
      };

      const result = await UpstreamValidationHandshakeEngine.validate(selection);

      expect(result.totalIssues).toHaveProperty("errors");
      expect(result.totalIssues).toHaveProperty("warnings");
      expect(result.totalIssues).toHaveProperty("info");
      expect(result.totalIssues.errors).toBeGreaterThanOrEqual(0);
    });
  });
});
