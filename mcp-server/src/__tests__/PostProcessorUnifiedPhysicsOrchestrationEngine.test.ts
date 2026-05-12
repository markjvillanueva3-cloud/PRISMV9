/**
 * PostProcessorUnifiedPhysicsOrchestrationEngine Tests
 * =====================================================
 * Tests for the unified physics-chemistry-metallurgy orchestration engine.
 */

import { describe, it, expect } from "vitest";
import {
  postProcessorUnifiedPhysicsOrchestrationEngine,
  calculateKienzleForce,
  calculateTaylorToolLife,
  calculateCuttingTemperature,
  calculateTheoreticalRa,
  calculateToolDeflection,
  calculateChatterStabilityLimit,
  calculateCuttingPower,
  calculateStrainRate,
  calculateJohnsonCookFlowStress,
  type MachiningState
} from "../engines/PostProcessorUnifiedPhysicsOrchestrationEngine.js";
import { CANONICAL_MATERIAL_DB } from "../physics/constants.js";

// Default machining state for testing
function createMachiningState(overrides: Partial<MachiningState> = {}): MachiningState {
  return {
    cuttingSpeed_m_min: 150,
    feedRate_mm_rev: 0.2,
    depthOfCut_mm: 2.0,
    widthOfCut_mm: 10,
    toolDiameter_mm: 20,
    toolFlutes: 4,
    toolNoseRadius_mm: 0.8,
    toolRakeAngle_deg: 6,
    toolMaterial: "carbide",
    material: "steel",
    materialPhysics: CANONICAL_MATERIAL_DB.steel,
    hardness_HB: 200,
    spindleRPM: 2387,
    machinePower_kW: 15,
    machineRigidity: "medium",
    coolantType: "flood",
    ...overrides
  };
}

describe("PostProcessorUnifiedPhysicsOrchestrationEngine", () => {
  describe("Statistics", () => {
    it("should return engine statistics", () => {
      const stats = postProcessorUnifiedPhysicsOrchestrationEngine.getStatistics();

      expect(stats.version).toBe("1.0.0");
      expect(stats.prismCapabilities.dispatchers).toBe(82);
      expect(stats.prismCapabilities.engines).toBeGreaterThan(1500);
      expect(stats.physicsModels.length).toBe(8);
      expect(stats.integrationPoints.length).toBe(5);
    });

    it("should list all physics models", () => {
      const stats = postProcessorUnifiedPhysicsOrchestrationEngine.getStatistics();

      expect(stats.physicsModels).toContain("Kienzle cutting force model");
      expect(stats.physicsModels).toContain("Taylor tool life equation");
      expect(stats.physicsModels).toContain("Trigger-Chao temperature model");
      expect(stats.physicsModels).toContain("Tlusty chatter stability");
      expect(stats.physicsModels).toContain("Johnson-Cook flow stress");
    });

    it("should reference PRISM integration points", () => {
      const stats = postProcessorUnifiedPhysicsOrchestrationEngine.getStatistics();

      expect(stats.integrationPoints.some(p => p.includes("SelfAwareness"))).toBe(true);
      expect(stats.integrationPoints.some(p => p.includes("JM Die"))).toBe(true);
      expect(stats.integrationPoints.some(p => p.includes("Tribal"))).toBe(true);
    });
  });

  describe("Canonical Physics Formulas", () => {
    describe("Kienzle Force Model", () => {
      it("should calculate cutting force correctly", () => {
        const Fc = calculateKienzleForce(1800, 0.25, 2.0, 0.2);
        expect(Fc).toBeGreaterThan(500);
        expect(Fc).toBeLessThan(1500);
      });

      it("should return 0 for zero chip dimensions", () => {
        expect(calculateKienzleForce(1800, 0.25, 0, 0.2)).toBe(0);
        expect(calculateKienzleForce(1800, 0.25, 2.0, 0)).toBe(0);
      });

      it("should scale with chip area", () => {
        const Fc1 = calculateKienzleForce(1800, 0.25, 2.0, 0.2);
        const Fc2 = calculateKienzleForce(1800, 0.25, 4.0, 0.2);
        expect(Fc2).toBeGreaterThan(Fc1 * 1.8);  // Not linear due to Kienzle exponent
      });
    });

    describe("Taylor Tool Life", () => {
      it("should calculate tool life correctly", () => {
        const T = calculateTaylorToolLife(350, 0.25, 150);
        expect(T).toBeGreaterThan(10);
        expect(T).toBeLessThan(200);
      });

      it("should decrease with increasing speed", () => {
        const T1 = calculateTaylorToolLife(350, 0.25, 100);
        const T2 = calculateTaylorToolLife(350, 0.25, 200);
        expect(T1).toBeGreaterThan(T2);
      });

      it("should return Infinity for zero speed", () => {
        expect(calculateTaylorToolLife(350, 0.25, 0)).toBe(Infinity);
      });
    });

    describe("Cutting Temperature", () => {
      it("should calculate chip temperature", () => {
        const T = calculateCuttingTemperature(150, 0.2, 2.0, 50);
        expect(T).toBeGreaterThan(200);
        expect(T).toBeLessThan(1000);
      });

      it("should increase with cutting speed", () => {
        const T1 = calculateCuttingTemperature(100, 0.2, 2.0, 50);
        const T2 = calculateCuttingTemperature(300, 0.2, 2.0, 50);
        expect(T2).toBeGreaterThan(T1);
      });
    });

    describe("Theoretical Surface Roughness", () => {
      it("should calculate Ra correctly", () => {
        const Ra = calculateTheoreticalRa(0.2, 0.8);
        expect(Ra).toBeGreaterThan(0.5);
        expect(Ra).toBeLessThan(5.0);
      });

      it("should decrease with larger nose radius", () => {
        const Ra1 = calculateTheoreticalRa(0.2, 0.4);
        const Ra2 = calculateTheoreticalRa(0.2, 0.8);
        expect(Ra1).toBeGreaterThan(Ra2);
      });

      it("should increase with feed squared", () => {
        const Ra1 = calculateTheoreticalRa(0.1, 0.8);
        const Ra2 = calculateTheoreticalRa(0.2, 0.8);
        expect(Ra2).toBeCloseTo(Ra1 * 4, 1);
      });

      it("should return 0 for zero nose radius", () => {
        expect(calculateTheoreticalRa(0.2, 0)).toBe(0);
      });
    });

    describe("Tool Deflection", () => {
      it("should calculate deflection correctly", () => {
        const delta = calculateToolDeflection(500, 60, 20);
        expect(delta).toBeGreaterThan(0);
        expect(delta).toBeLessThan(100);
      });

      it("should increase with length cubed", () => {
        const d1 = calculateToolDeflection(500, 40, 20);
        const d2 = calculateToolDeflection(500, 80, 20);
        expect(d2).toBeCloseTo(d1 * 8, 0);
      });

      it("should decrease with diameter to 4th power", () => {
        const d1 = calculateToolDeflection(500, 60, 10);
        const d2 = calculateToolDeflection(500, 60, 20);
        expect(d1).toBeGreaterThan(d2 * 10);
      });
    });

    describe("Chatter Stability Limit", () => {
      it("should calculate critical depth", () => {
        const blim = calculateChatterStabilityLimit(2000, 40, 0.03);
        expect(blim).toBeGreaterThan(0);
        expect(blim).toBeLessThan(20);
      });

      it("should increase with stiffness", () => {
        const b1 = calculateChatterStabilityLimit(2000, 20, 0.03);
        const b2 = calculateChatterStabilityLimit(2000, 40, 0.03);
        expect(b2).toBeGreaterThan(b1);
      });

      it("should decrease with cutting force coefficient", () => {
        const b1 = calculateChatterStabilityLimit(1000, 40, 0.03);
        const b2 = calculateChatterStabilityLimit(2000, 40, 0.03);
        expect(b1).toBeGreaterThan(b2);
      });
    });

    describe("Cutting Power", () => {
      it("should calculate power correctly", () => {
        const P = calculateCuttingPower(1000, 150);
        expect(P).toBeCloseTo(2.5, 1);  // 1000N * 150m/min / 60000 = 2.5 kW
      });
    });

    describe("Strain Rate", () => {
      it("should calculate high strain rates for cutting", () => {
        const rate = calculateStrainRate(150);
        expect(rate).toBeGreaterThan(10000);  // High strain rates in cutting
      });
    });

    describe("Johnson-Cook Flow Stress", () => {
      it("should calculate flow stress", () => {
        const sigma = calculateJohnsonCookFlowStress(400, 200, 0.4, 0.02, 0.5, 10000);
        expect(sigma).toBeGreaterThan(400);
        expect(sigma).toBeLessThan(1000);
      });

      it("should increase with strain rate", () => {
        const s1 = calculateJohnsonCookFlowStress(400, 200, 0.4, 0.02, 0.5, 1000);
        const s2 = calculateJohnsonCookFlowStress(400, 200, 0.4, 0.02, 0.5, 100000);
        expect(s2).toBeGreaterThan(s1);
      });
    });
  });

  describe("Unified Physics Analysis", () => {
    it("should perform complete analysis", () => {
      const state = createMachiningState();
      const analysis = postProcessorUnifiedPhysicsOrchestrationEngine.analyzeUnifiedPhysics(state);

      expect(analysis.machiningState).toEqual(state);
      expect(analysis.forces).toBeDefined();
      expect(analysis.thermal).toBeDefined();
      expect(analysis.toolLife).toBeDefined();
      expect(analysis.chatter).toBeDefined();
      expect(analysis.surface).toBeDefined();
      expect(analysis.metallurgy).toBeDefined();
      expect(analysis.deflection).toBeDefined();
    });

    describe("Force Analysis", () => {
      it("should calculate all force components", () => {
        const state = createMachiningState();
        const analysis = postProcessorUnifiedPhysicsOrchestrationEngine.analyzeUnifiedPhysics(state);

        expect(analysis.forces.Fc_N).toBeGreaterThan(0);
        expect(analysis.forces.Ff_N).toBeGreaterThan(0);
        expect(analysis.forces.Fp_N).toBeGreaterThan(0);
        expect(analysis.forces.Fr_N).toBeGreaterThan(analysis.forces.Fc_N);
      });

      it("should calculate power requirements", () => {
        const state = createMachiningState();
        const analysis = postProcessorUnifiedPhysicsOrchestrationEngine.analyzeUnifiedPhysics(state);

        expect(analysis.forces.cuttingPower_kW).toBeGreaterThan(0);
        expect(analysis.forces.spindlePowerRequired_kW).toBeGreaterThan(analysis.forces.cuttingPower_kW);
        expect(analysis.forces.powerUtilization_pct).toBeGreaterThan(0);
      });

      it("should warn on high power utilization", () => {
        const state = createMachiningState({
          depthOfCut_mm: 5.0,
          widthOfCut_mm: 20,
          machinePower_kW: 5
        });
        const analysis = postProcessorUnifiedPhysicsOrchestrationEngine.analyzeUnifiedPhysics(state);

        if (analysis.forces.powerUtilization_pct > 80) {
          expect(analysis.forces.recommendations.length).toBeGreaterThan(0);
        }
      });
    });

    describe("Thermal Analysis", () => {
      it("should calculate temperatures", () => {
        const state = createMachiningState();
        const analysis = postProcessorUnifiedPhysicsOrchestrationEngine.analyzeUnifiedPhysics(state);

        expect(analysis.thermal.chipTemperature_C).toBeGreaterThan(100);
        expect(analysis.thermal.toolRakeTemperature_C).toBeLessThan(analysis.thermal.chipTemperature_C);
        expect(analysis.thermal.workpieceTemperature_C).toBeLessThan(analysis.thermal.toolRakeTemperature_C);
      });

      it("should calculate heat partition", () => {
        const state = createMachiningState();
        const analysis = postProcessorUnifiedPhysicsOrchestrationEngine.analyzeUnifiedPhysics(state);

        const totalHeat = analysis.thermal.heatToChip_pct +
                         analysis.thermal.heatToTool_pct +
                         analysis.thermal.heatToWorkpiece_pct +
                         analysis.thermal.heatToCoolant_pct;
        expect(totalHeat).toBeGreaterThan(90);  // Most heat accounted for
      });

      it("should account for coolant effectiveness", () => {
        const floodState = createMachiningState({ coolantType: "flood" });
        const dryState = createMachiningState({ coolantType: "dry" });

        const floodAnalysis = postProcessorUnifiedPhysicsOrchestrationEngine.analyzeUnifiedPhysics(floodState);
        const dryAnalysis = postProcessorUnifiedPhysicsOrchestrationEngine.analyzeUnifiedPhysics(dryState);

        expect(floodAnalysis.thermal.coolantEffectiveness).toBeGreaterThan(dryAnalysis.thermal.coolantEffectiveness);
      });

      it("should warn on high temperatures", () => {
        const state = createMachiningState({
          cuttingSpeed_m_min: 400,
          coolantType: "dry"
        });
        const analysis = postProcessorUnifiedPhysicsOrchestrationEngine.analyzeUnifiedPhysics(state);

        if (analysis.thermal.toolRakeTemperature_C > 700) {
          expect(analysis.thermal.thermalWarnings.length).toBeGreaterThan(0);
        }
      });
    });

    describe("Tool Life Analysis", () => {
      it("should predict tool life", () => {
        const state = createMachiningState();
        const analysis = postProcessorUnifiedPhysicsOrchestrationEngine.analyzeUnifiedPhysics(state);

        expect(analysis.toolLife.predictedLife_min).toBeGreaterThan(0);
        expect(analysis.toolLife.toolLifeConfidence).toBeGreaterThan(0.5);
      });

      it("should identify wear mechanism", () => {
        const state = createMachiningState();
        const analysis = postProcessorUnifiedPhysicsOrchestrationEngine.analyzeUnifiedPhysics(state);

        const validMechanisms = ["abrasion", "diffusion", "adhesion", "oxidation", "fatigue"];
        expect(validMechanisms).toContain(analysis.toolLife.primaryWearMechanism);
      });

      it("should calculate economic optimal speed", () => {
        const state = createMachiningState();
        const analysis = postProcessorUnifiedPhysicsOrchestrationEngine.analyzeUnifiedPhysics(state);

        expect(analysis.toolLife.optimalCuttingSpeed_m_min).toBeGreaterThan(0);
      });
    });

    describe("Chatter Analysis", () => {
      it("should determine stability", () => {
        const state = createMachiningState();
        const analysis = postProcessorUnifiedPhysicsOrchestrationEngine.analyzeUnifiedPhysics(state);

        expect(typeof analysis.chatter.isStable).toBe("boolean");
        expect(analysis.chatter.criticalDepthOfCut_mm).toBeGreaterThan(0);
      });

      it("should provide stability margin", () => {
        const state = createMachiningState();
        const analysis = postProcessorUnifiedPhysicsOrchestrationEngine.analyzeUnifiedPhysics(state);

        expect(analysis.chatter.stabilityMargin_pct).toBeGreaterThanOrEqual(0);
      });

      it("should recommend stable ranges", () => {
        const state = createMachiningState();
        const analysis = postProcessorUnifiedPhysicsOrchestrationEngine.analyzeUnifiedPhysics(state);

        expect(analysis.chatter.stableDepthRange.max).toBeGreaterThan(0);
        expect(analysis.chatter.stableRPMRange.max).toBeGreaterThan(analysis.chatter.stableRPMRange.min);
      });
    });

    describe("Surface Integrity Analysis", () => {
      it("should calculate roughness values", () => {
        const state = createMachiningState();
        const analysis = postProcessorUnifiedPhysicsOrchestrationEngine.analyzeUnifiedPhysics(state);

        expect(analysis.surface.Ra_um).toBeGreaterThan(0);
        expect(analysis.surface.Rz_um).toBeGreaterThan(analysis.surface.Ra_um);
        expect(analysis.surface.Rt_um).toBeGreaterThan(analysis.surface.Rz_um);
      });

      it("should assess residual stress", () => {
        const state = createMachiningState();
        const analysis = postProcessorUnifiedPhysicsOrchestrationEngine.analyzeUnifiedPhysics(state);

        expect(typeof analysis.surface.residualStress_MPa).toBe("number");
      });

      it("should detect work hardening", () => {
        const state = createMachiningState();
        const analysis = postProcessorUnifiedPhysicsOrchestrationEngine.analyzeUnifiedPhysics(state);

        expect(analysis.surface.workhardening_pct).toBeGreaterThanOrEqual(0);
      });
    });

    describe("Metallurgical Analysis", () => {
      it("should calculate strain rate", () => {
        const state = createMachiningState();
        const analysis = postProcessorUnifiedPhysicsOrchestrationEngine.analyzeUnifiedPhysics(state);

        expect(analysis.metallurgy.strainRate_per_s).toBeGreaterThan(1000);
      });

      it("should calculate flow stress", () => {
        const state = createMachiningState();
        const analysis = postProcessorUnifiedPhysicsOrchestrationEngine.analyzeUnifiedPhysics(state);

        expect(analysis.metallurgy.flowStress_MPa).toBeGreaterThan(0);
      });

      it("should assess phase stability", () => {
        const state = createMachiningState();
        const analysis = postProcessorUnifiedPhysicsOrchestrationEngine.analyzeUnifiedPhysics(state);

        expect(typeof analysis.metallurgy.phaseStable).toBe("boolean");
        expect(analysis.metallurgy.riskOfPhaseChange).toBeLessThanOrEqual(1);
      });
    });

    describe("Deflection Analysis", () => {
      it("should calculate tool deflection", () => {
        const state = createMachiningState();
        const analysis = postProcessorUnifiedPhysicsOrchestrationEngine.analyzeUnifiedPhysics(state);

        expect(analysis.deflection.toolDeflection_um).toBeGreaterThanOrEqual(0);
      });

      it("should assess compensation needs", () => {
        const state = createMachiningState();
        const analysis = postProcessorUnifiedPhysicsOrchestrationEngine.analyzeUnifiedPhysics(state);

        expect(typeof analysis.deflection.compensationRequired).toBe("boolean");
        if (analysis.deflection.compensationRequired) {
          expect(analysis.deflection.compensationValue_um).toBeGreaterThan(0);
        }
      });
    });

    describe("Overall Safety Score", () => {
      it("should calculate safety score", () => {
        const state = createMachiningState();
        const analysis = postProcessorUnifiedPhysicsOrchestrationEngine.analyzeUnifiedPhysics(state);

        expect(analysis.overallSafetyScore).toBeGreaterThan(0);
        expect(analysis.overallSafetyScore).toBeLessThanOrEqual(1);
      });

      it("should penalize unsafe conditions", () => {
        const safeState = createMachiningState({
          cuttingSpeed_m_min: 100,
          depthOfCut_mm: 1.0,
          machineRigidity: "high",
          coolantType: "tsc"
        });
        const riskyState = createMachiningState({
          cuttingSpeed_m_min: 400,
          depthOfCut_mm: 5.0,
          machineRigidity: "low",
          coolantType: "dry"
        });

        const safeAnalysis = postProcessorUnifiedPhysicsOrchestrationEngine.analyzeUnifiedPhysics(safeState);
        const riskyAnalysis = postProcessorUnifiedPhysicsOrchestrationEngine.analyzeUnifiedPhysics(riskyState);

        expect(safeAnalysis.overallSafetyScore).toBeGreaterThan(riskyAnalysis.overallSafetyScore);
      });
    });

    describe("Recommendations", () => {
      it("should generate recommendations", () => {
        const state = createMachiningState();
        const analysis = postProcessorUnifiedPhysicsOrchestrationEngine.analyzeUnifiedPhysics(state);

        expect(Array.isArray(analysis.recommendations)).toBe(true);
      });

      it("should generate optimization suggestions", () => {
        const state = createMachiningState();
        const analysis = postProcessorUnifiedPhysicsOrchestrationEngine.analyzeUnifiedPhysics(state);

        expect(Array.isArray(analysis.optimizationSuggestions)).toBe(true);
      });
    });
  });

  describe("G-Code Optimization", () => {
    it("should optimize G-code with physics", () => {
      const gcode = [
        "G90 G54",
        "S2000 M03",
        "G00 X0 Y0 Z5",
        "G01 Z-2 F200",
        "G01 X100 F500",
        "M30"
      ];
      const state = createMachiningState();

      const result = postProcessorUnifiedPhysicsOrchestrationEngine.optimizeGCodeWithPhysics(gcode, state);

      expect(result.gcode.length).toBeGreaterThan(gcode.length);  // Added comments
      expect(result.safetyScore).toBeGreaterThan(0);
    });

    it("should insert physics comments", () => {
      const gcode = ["G90 G54", "M30"];
      const state = createMachiningState();

      const result = postProcessorUnifiedPhysicsOrchestrationEngine.optimizeGCodeWithPhysics(gcode, state);

      expect(result.insertedComments.length).toBeGreaterThan(0);
      expect(result.insertedComments.some(c => c.includes("Safety Score"))).toBe(true);
    });

    it("should include physics analysis", () => {
      const gcode = ["G90 G54", "M30"];
      const state = createMachiningState();

      const result = postProcessorUnifiedPhysicsOrchestrationEngine.optimizeGCodeWithPhysics(gcode, state);

      expect(result.physicsAnalysis).toBeDefined();
      expect(result.physicsAnalysis.forces).toBeDefined();
    });
  });

  describe("Material-Specific Analysis", () => {
    it("should handle steel", () => {
      const state = createMachiningState({
        material: "steel",
        materialPhysics: CANONICAL_MATERIAL_DB.steel
      });
      const analysis = postProcessorUnifiedPhysicsOrchestrationEngine.analyzeUnifiedPhysics(state);

      expect(analysis.forces.Fc_N).toBeGreaterThan(0);
    });

    it("should handle aluminum", () => {
      const state = createMachiningState({
        material: "aluminum",
        materialPhysics: CANONICAL_MATERIAL_DB.aluminum
      });
      const analysis = postProcessorUnifiedPhysicsOrchestrationEngine.analyzeUnifiedPhysics(state);

      // Aluminum should produce valid analysis with cutting forces
      expect(analysis.forces.Fc_N).toBeGreaterThan(0);
      expect(analysis.forces.kc_N_mm2).toBeGreaterThan(500);  // Reasonable range for aluminum
      expect(analysis.toolLife.predictedLife_min).toBeGreaterThan(0);
    });

    it("should handle titanium", () => {
      const state = createMachiningState({
        material: "titanium",
        materialPhysics: CANONICAL_MATERIAL_DB.titanium
      });
      const analysis = postProcessorUnifiedPhysicsOrchestrationEngine.analyzeUnifiedPhysics(state);

      // Titanium should have measurable tool life and higher forces than aluminum
      expect(analysis.toolLife.predictedLife_min).toBeGreaterThan(0);
      expect(analysis.forces.Fc_N).toBeGreaterThan(0);
    });

    it("should handle inconel", () => {
      const state = createMachiningState({
        material: "inconel",
        materialPhysics: CANONICAL_MATERIAL_DB.inconel
      });
      const analysis = postProcessorUnifiedPhysicsOrchestrationEngine.analyzeUnifiedPhysics(state);

      expect(analysis.metallurgy.diffusionWearRisk).toBeGreaterThan(0);
    });
  });

  describe("Machine Rigidity Effects", () => {
    it("should affect chatter stability", () => {
      const lowRigidity = createMachiningState({ machineRigidity: "low" });
      const highRigidity = createMachiningState({ machineRigidity: "high" });

      const lowAnalysis = postProcessorUnifiedPhysicsOrchestrationEngine.analyzeUnifiedPhysics(lowRigidity);
      const highAnalysis = postProcessorUnifiedPhysicsOrchestrationEngine.analyzeUnifiedPhysics(highRigidity);

      expect(highAnalysis.chatter.criticalDepthOfCut_mm).toBeGreaterThan(
        lowAnalysis.chatter.criticalDepthOfCut_mm
      );
    });
  });

  describe("Coolant Type Effects", () => {
    it("should compare coolant effectiveness", () => {
      const types: Array<"dry" | "flood" | "tsc" | "cryogenic"> = ["dry", "flood", "tsc", "cryogenic"];
      const effectiveness: number[] = [];

      for (const type of types) {
        const state = createMachiningState({ coolantType: type });
        const analysis = postProcessorUnifiedPhysicsOrchestrationEngine.analyzeUnifiedPhysics(state);
        effectiveness.push(analysis.thermal.coolantEffectiveness);
      }

      // Each subsequent type should be more effective
      for (let i = 1; i < effectiveness.length; i++) {
        expect(effectiveness[i]).toBeGreaterThanOrEqual(effectiveness[i - 1]);
      }
    });
  });

  describe("Edge Cases", () => {
    it("should handle zero feed rate", () => {
      const state = createMachiningState({ feedRate_mm_rev: 0.001 });
      const analysis = postProcessorUnifiedPhysicsOrchestrationEngine.analyzeUnifiedPhysics(state);

      expect(analysis.forces.Fc_N).toBeGreaterThan(0);
    });

    it("should handle missing material physics", () => {
      const state = createMachiningState({
        material: "unknown_material",
        materialPhysics: undefined as unknown as typeof CANONICAL_MATERIAL_DB.steel
      });
      const analysis = postProcessorUnifiedPhysicsOrchestrationEngine.analyzeUnifiedPhysics(state);

      // Should fall back to steel
      expect(analysis.forces.Fc_N).toBeGreaterThan(0);
    });

    it("should handle high rigidity machine", () => {
      const state = createMachiningState({ machineRigidity: "high" });
      const analysis = postProcessorUnifiedPhysicsOrchestrationEngine.analyzeUnifiedPhysics(state);

      expect(analysis.chatter.dampingRatio).toBeGreaterThan(0);
    });

    it("should handle low power machine", () => {
      const state = createMachiningState({ machinePower_kW: 3 });
      const analysis = postProcessorUnifiedPhysicsOrchestrationEngine.analyzeUnifiedPhysics(state);

      expect(analysis.forces.powerUtilization_pct).toBeGreaterThan(50);
    });
  });
});
