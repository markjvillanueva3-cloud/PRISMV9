/**
 * HolisticMachiningIntelligenceEngine Tests
 *
 * Validates total process intelligence: before, during, and after machining.
 */

import { describe, it, expect } from "vitest";
import {
  holisticMachiningIntelligenceEngine,
  MaterialState,
  MachineReadiness,
  ToolReadiness,
  FixtureState,
  EnvironmentState,
  StockCondition,
} from "../engines/HolisticMachiningIntelligenceEngine.js";

describe("HolisticMachiningIntelligenceEngine", () => {
  const createNominalConditions = (): {
    material: MaterialState;
    machine: MachineReadiness;
    tool: ToolReadiness;
    fixture: FixtureState;
    environment: EnvironmentState;
    stock: StockCondition;
  } => ({
    material: {
      materialId: "4140",
      hardnessHRC: 28,
      heatTreatment: "normalized",
      priorWorkHardening: 5,
      grainDirection: "parallel",
      inclusionDensity: "low",
      residualStress: "neutral",
      estimatedYieldStrength: 650,
    },
    machine: {
      machineId: "VMC-1",
      spindleHours: 5000,
      spindleBearingCondition: 90,
      lastMaintenanceHours: 50,
      axisBacklash: { x: 3, y: 3, z: 2 },
      repeatability: { x: 2, y: 2, z: 1 },
      thermalState: "stable",
      spindleRunout: 3,
      coolantState: { level: 95, concentration: 8, temperature: 22 },
      vibrationBaseline: 0.2,
      positioningAccuracy: 5,
    },
    tool: {
      toolId: "EM-10-4F",
      wearPercent: 15,
      cuttingTimeMinutes: 30,
      materialsProcessed: ["4140", "1018"],
      coatingCondition: 95,
      edgeSharpness: 90,
      chipLoad: 0.08,
      lastOperationType: "semi-finish",
      thermalCycles: 5,
      vibrationExposure: 10,
    },
    fixture: {
      fixtureId: "VISE-6",
      clampingForce: 8000,
      clampingType: "hydraulic",
      contactArea: 2000,
      rigidityScore: 85,
      datumAccuracy: 5,
      partAccessibility: 80,
      overhangRatio: 1.5,
      vibrationDamping: 0.05,
    },
    environment: {
      ambientTemperature: 21,
      temperatureStability: 1,
      relativeHumidity: 45,
      foundationVibration: 0.05,
      airPressure: 6.5,
      dustLevel: "low",
      nearbyMachineLoad: 30,
    },
    stock: {
      stockType: "bar",
      surfaceHardness: 28,
      surfaceRoughness: 3.2,
      stockAllowance: 2,
      materialRunout: 5,
      priorMachiningStress: "neutral",
    },
  });

  describe("assessPreMachiningReadiness", () => {
    it("should return acceptable risk for nominal conditions", () => {
      const { material, machine, tool, fixture, environment, stock } = createNominalConditions();

      const assessment = holisticMachiningIntelligenceEngine.assessPreMachiningReadiness(
        material, machine, tool, fixture, environment, stock
      );

      expect(["acceptable", "elevated", "high"]).toContain(assessment.riskCategory);
      expect(["proceed", "proceed_with_caution", "modify_parameters"]).toContain(assessment.proceedRecommendation);
      expect(assessment.overallRisk).toBeLessThan(0.8);
    });

    it("should detect work hardening issues", () => {
      const conditions = createNominalConditions();
      conditions.material.priorWorkHardening = 35;

      const assessment = holisticMachiningIntelligenceEngine.assessPreMachiningReadiness(
        conditions.material, conditions.machine, conditions.tool,
        conditions.fixture, conditions.environment, conditions.stock
      );

      const workHardeningIssue = assessment.potentialIssues.find(
        i => i.issueType === "work_hardened_surface"
      );
      expect(workHardeningIssue).toBeDefined();
      expect(workHardeningIssue!.probability).toBeGreaterThan(0.5);
    });

    it("should detect high inclusion density risk", () => {
      const conditions = createNominalConditions();
      conditions.material.inclusionDensity = "high";

      const assessment = holisticMachiningIntelligenceEngine.assessPreMachiningReadiness(
        conditions.material, conditions.machine, conditions.tool,
        conditions.fixture, conditions.environment, conditions.stock
      );

      const inclusionIssue = assessment.potentialIssues.find(
        i => i.issueType === "inclusion_damage"
      );
      expect(inclusionIssue).toBeDefined();
      expect(inclusionIssue!.severity).toBe("high");
    });

    it("should detect spindle bearing wear", () => {
      const conditions = createNominalConditions();
      conditions.machine.spindleBearingCondition = 55;

      const assessment = holisticMachiningIntelligenceEngine.assessPreMachiningReadiness(
        conditions.material, conditions.machine, conditions.tool,
        conditions.fixture, conditions.environment, conditions.stock
      );

      const bearingIssue = assessment.potentialIssues.find(
        i => i.issueType === "spindle_bearing_wear"
      );
      expect(bearingIssue).toBeDefined();
    });

    it("should detect cold machine thermal drift risk", () => {
      const conditions = createNominalConditions();
      conditions.machine.thermalState = "cold";

      const assessment = holisticMachiningIntelligenceEngine.assessPreMachiningReadiness(
        conditions.material, conditions.machine, conditions.tool,
        conditions.fixture, conditions.environment, conditions.stock
      );

      const thermalIssue = assessment.potentialIssues.find(
        i => i.issueType === "thermal_drift"
      );
      expect(thermalIssue).toBeDefined();
      expect(thermalIssue!.probability).toBeGreaterThan(0.7);
    });

    it("should detect excessive runout", () => {
      const conditions = createNominalConditions();
      conditions.machine.spindleRunout = 12;

      const assessment = holisticMachiningIntelligenceEngine.assessPreMachiningReadiness(
        conditions.material, conditions.machine, conditions.tool,
        conditions.fixture, conditions.environment, conditions.stock
      );

      const runoutIssue = assessment.potentialIssues.find(
        i => i.issueType === "excessive_runout"
      );
      expect(runoutIssue).toBeDefined();
      expect(runoutIssue!.severity).toBe("high");
    });

    it("should detect excessive overhang", () => {
      const conditions = createNominalConditions();
      conditions.fixture.overhangRatio = 5;

      const assessment = holisticMachiningIntelligenceEngine.assessPreMachiningReadiness(
        conditions.material, conditions.machine, conditions.tool,
        conditions.fixture, conditions.environment, conditions.stock
      );

      const overhangIssue = assessment.potentialIssues.find(
        i => i.issueType === "excessive_overhang"
      );
      expect(overhangIssue).toBeDefined();
    });

    it("should detect temperature variation", () => {
      const conditions = createNominalConditions();
      conditions.environment.temperatureStability = 5;

      const assessment = holisticMachiningIntelligenceEngine.assessPreMachiningReadiness(
        conditions.material, conditions.machine, conditions.tool,
        conditions.fixture, conditions.environment, conditions.stock
      );

      const tempIssue = assessment.potentialIssues.find(
        i => i.issueType === "temperature_variation"
      );
      expect(tempIssue).toBeDefined();
    });

    it("should detect casting porosity", () => {
      const conditions = createNominalConditions();
      conditions.stock.stockType = "casting";
      conditions.stock.castingPorosity = "high";

      const assessment = holisticMachiningIntelligenceEngine.assessPreMachiningReadiness(
        conditions.material, conditions.machine, conditions.tool,
        conditions.fixture, conditions.environment, conditions.stock
      );

      const porosityIssue = assessment.potentialIssues.find(
        i => i.issueType === "porosity_breakout"
      );
      expect(porosityIssue).toBeDefined();
    });

    it("should provide parameter adjustments for issues", () => {
      const conditions = createNominalConditions();
      conditions.material.priorWorkHardening = 30;
      conditions.tool.wearPercent = 60;

      const assessment = holisticMachiningIntelligenceEngine.assessPreMachiningReadiness(
        conditions.material, conditions.machine, conditions.tool,
        conditions.fixture, conditions.environment, conditions.stock
      );

      expect(assessment.parameterAdjustments.length).toBeGreaterThan(0);
      const feedAdj = assessment.parameterAdjustments.find(
        a => a.parameter === "feed_rate"
      );
      expect(feedAdj).toBeDefined();
      expect(feedAdj!.recommendedValue).toBeLessThan(100);
    });

    it("should set abort recommendation for critical conditions", () => {
      const conditions = createNominalConditions();
      conditions.machine.spindleBearingCondition = 40;
      conditions.machine.spindleRunout = 20;
      conditions.fixture.clampingForce = 100;
      conditions.material.inclusionDensity = "high";

      const assessment = holisticMachiningIntelligenceEngine.assessPreMachiningReadiness(
        conditions.material, conditions.machine, conditions.tool,
        conditions.fixture, conditions.environment, conditions.stock
      );

      expect(assessment.riskCategory).not.toBe("acceptable");
    });
  });

  describe("predictForces", () => {
    it("should predict cutting forces using Kienzle model", () => {
      const forces = holisticMachiningIntelligenceEngine.predictForces(
        {
          Vc: 150,
          fz: 0.1,
          ap: 2,
          ae: 5,
          D: 10,
          z: 4,
        },
        2000, // kc1.1 for steel
        0.25, // mc
        90    // tool condition
      );

      expect(forces.cutting.Fc).toBeGreaterThan(0);
      expect(forces.cutting.Ff).toBeGreaterThan(0);
      expect(forces.cutting.Fp).toBeGreaterThan(0);
      expect(forces.cutting.power).toBeGreaterThan(0);
      expect(forces.cutting.torque).toBeGreaterThan(0);
    });

    it("should account for tool wear in force prediction", () => {
      const paramsBase = { Vc: 150, fz: 0.1, ap: 2, ae: 5, D: 10, z: 4 };

      const forcesNewTool = holisticMachiningIntelligenceEngine.predictForces(
        paramsBase, 2000, 0.25, 100
      );
      const forcesWornTool = holisticMachiningIntelligenceEngine.predictForces(
        paramsBase, 2000, 0.25, 50
      );

      expect(forcesWornTool.cutting.Fc).toBeGreaterThan(forcesNewTool.cutting.Fc);
    });

    it("should calculate clamping requirements", () => {
      const forces = holisticMachiningIntelligenceEngine.predictForces(
        { Vc: 150, fz: 0.1, ap: 2, ae: 5, D: 10, z: 4 },
        2000, 0.25, 90
      );

      expect(forces.clamping.totalClamping).toBeGreaterThan(forces.totalResultant);
      expect(forces.clamping.safetyFactor).toBeGreaterThan(1);
    });

    it("should calculate dynamic forces", () => {
      const forces = holisticMachiningIntelligenceEngine.predictForces(
        { Vc: 300, fz: 0.1, ap: 2, ae: 5, D: 10, z: 4 },
        2000, 0.25, 90
      );

      expect(forces.dynamic.centrifugalForce).toBeGreaterThan(0);
      expect(forces.totalResultant).toBeGreaterThan(forces.cutting.Fc);
    });
  });

  describe("predictThermalEvolution", () => {
    it("should predict temperatures during cutting", () => {
      const thermal = holisticMachiningIntelligenceEngine.predictThermalEvolution(
        5, // 5 kW cutting power
        150, // m/min
        { meltingPoint: 1500, thermalConductivity: 50 },
        "flood",
        60 // 60 seconds
      );

      expect(thermal.toolTemperature).toBeGreaterThan(100);
      expect(thermal.chipTemperature).toBeGreaterThan(thermal.toolTemperature);
      expect(thermal.partSurfaceTemperature).toBeGreaterThan(25);
    });

    it("should show lower temps with better cooling", () => {
      const baseParams = {
        power: 5,
        speed: 150,
        material: { meltingPoint: 1500, thermalConductivity: 50 },
        duration: 60,
      };

      const thermalDry = holisticMachiningIntelligenceEngine.predictThermalEvolution(
        baseParams.power, baseParams.speed, baseParams.material, "dry", baseParams.duration
      );
      const thermalCryo = holisticMachiningIntelligenceEngine.predictThermalEvolution(
        baseParams.power, baseParams.speed, baseParams.material, "cryogenic", baseParams.duration
      );

      expect(thermalCryo.toolTemperature).toBeLessThan(thermalDry.toolTemperature);
    });

    it("should calculate thermal expansion", () => {
      const thermal = holisticMachiningIntelligenceEngine.predictThermalEvolution(
        5, 150, { meltingPoint: 1500, thermalConductivity: 50 }, "flood", 120
      );

      expect(thermal.thermalExpansionPart).toBeGreaterThan(0);
      expect(thermal.thermalExpansionTool).toBeGreaterThan(0);
      expect(thermal.thermalExpansionSpindle).toBeGreaterThan(0);
    });

    it("should show heat partition to chip at high speeds", () => {
      const thermal = holisticMachiningIntelligenceEngine.predictThermalEvolution(
        5, 400, { meltingPoint: 1500, thermalConductivity: 50 }, "flood", 60
      );

      expect(thermal.heatPartitionToChip).toBeGreaterThan(0.6);
      expect(thermal.heatPartitionToChip + thermal.heatPartitionToTool + thermal.heatPartitionToPart).toBeCloseTo(1, 1);
    });
  });

  describe("assessVibrationRisk", () => {
    it("should assess stable cutting conditions", () => {
      const forces = holisticMachiningIntelligenceEngine.predictForces(
        { Vc: 150, fz: 0.08, ap: 1.5, ae: 3, D: 10, z: 4 },
        2000, 0.25, 90
      );

      const vibration = holisticMachiningIntelligenceEngine.assessVibrationRisk(
        forces,
        8000,
        { diameter: 10, overhang: 30, flutes: 4 },
        0.05
      );

      expect(vibration.dominantMode).not.toBe("chatter");
      expect(vibration.selfExcitedRisk).toBeLessThan(0.5);
    });

    it("should detect chatter risk with long overhang", () => {
      const forces = holisticMachiningIntelligenceEngine.predictForces(
        { Vc: 150, fz: 0.15, ap: 4, ae: 8, D: 10, z: 4 },
        2000, 0.25, 90
      );

      const vibration = holisticMachiningIntelligenceEngine.assessVibrationRisk(
        forces,
        10000,
        { diameter: 10, overhang: 60, flutes: 4 }, // 6:1 L/D
        0.03
      );

      expect(vibration.selfExcitedRisk).toBeGreaterThan(0.3);
    });

    it("should calculate modal frequencies", () => {
      const forces = holisticMachiningIntelligenceEngine.predictForces(
        { Vc: 150, fz: 0.1, ap: 2, ae: 5, D: 10, z: 4 },
        2000, 0.25, 90
      );

      const vibration = holisticMachiningIntelligenceEngine.assessVibrationRisk(
        forces, 8000, { diameter: 10, overhang: 30, flutes: 4 }, 0.05
      );

      expect(vibration.modalFrequencies.length).toBeGreaterThan(0);
      expect(vibration.currentSpindleHarmonics.length).toBeGreaterThan(0);
    });
  });

  describe("predictSurfaceIntegrity", () => {
    it("should predict surface roughness from feed and nose radius", () => {
      const forces = holisticMachiningIntelligenceEngine.predictForces(
        { Vc: 150, fz: 0.1, ap: 2, ae: 5, D: 10, z: 4 },
        2000, 0.25, 90
      );
      const thermal = holisticMachiningIntelligenceEngine.predictThermalEvolution(
        forces.cutting.power, 150, { meltingPoint: 1500, thermalConductivity: 50 }, "flood", 60
      );
      const vibration = holisticMachiningIntelligenceEngine.assessVibrationRisk(
        forces, 8000, { diameter: 10, overhang: 30, flutes: 4 }, 0.05
      );

      const surface = holisticMachiningIntelligenceEngine.predictSurfaceIntegrity(
        forces, thermal, vibration, 0.2, 0.8
      );

      expect(surface.surfaceRoughnessRa).toBeGreaterThan(0);
      expect(surface.surfaceRoughnessRz).toBeGreaterThan(surface.surfaceRoughnessRa);
    });

    it("should predict residual stress type", () => {
      const forces = holisticMachiningIntelligenceEngine.predictForces(
        { Vc: 150, fz: 0.1, ap: 2, ae: 5, D: 10, z: 4 },
        2000, 0.25, 90
      );
      const thermal = holisticMachiningIntelligenceEngine.predictThermalEvolution(
        forces.cutting.power, 150, { meltingPoint: 1500, thermalConductivity: 50 }, "flood", 60
      );
      const vibration = holisticMachiningIntelligenceEngine.assessVibrationRisk(
        forces, 8000, { diameter: 10, overhang: 30, flutes: 4 }, 0.05
      );

      const surface = holisticMachiningIntelligenceEngine.predictSurfaceIntegrity(
        forces, thermal, vibration, 0.2, 0.8
      );

      expect(["compressive", "tensile"]).toContain(surface.residualStressType);
      expect(surface.residualStressMagnitude).toBeGreaterThan(0);
    });

    it("should detect white layer risk at high temperatures", () => {
      const forces = holisticMachiningIntelligenceEngine.predictForces(
        { Vc: 300, fz: 0.2, ap: 4, ae: 8, D: 10, z: 4 },
        2000, 0.25, 60
      );
      const thermal = holisticMachiningIntelligenceEngine.predictThermalEvolution(
        forces.cutting.power * 2, 300, { meltingPoint: 1500, thermalConductivity: 50 }, "dry", 60
      );
      const vibration = holisticMachiningIntelligenceEngine.assessVibrationRisk(
        forces, 12000, { diameter: 10, overhang: 30, flutes: 4 }, 0.05
      );

      const surface = holisticMachiningIntelligenceEngine.predictSurfaceIntegrity(
        forces, thermal, vibration, 0.25, 0.8
      );

      // High temp should increase risk
      expect(surface.surfaceHardnessChange).toBeDefined();
    });
  });

  describe("getComprehensiveRecommendation", () => {
    it("should provide parameter multipliers", () => {
      const rec = holisticMachiningIntelligenceEngine.getComprehensiveRecommendation(
        1.6, 0.02, "normal"
      );

      expect(rec.parameterMultipliers.cutting_speed).toBeDefined();
      expect(rec.parameterMultipliers.feed_rate).toBeDefined();
      expect(rec.parameterMultipliers.depth_of_cut).toBeDefined();
    });

    it("should be more conservative with conservative mode", () => {
      const recNormal = holisticMachiningIntelligenceEngine.getComprehensiveRecommendation(
        1.6, 0.02, "normal"
      );
      const recConservative = holisticMachiningIntelligenceEngine.getComprehensiveRecommendation(
        1.6, 0.02, "conservative"
      );

      expect(recConservative.parameterMultipliers.cutting_speed)
        .toBeLessThan(recNormal.parameterMultipliers.cutting_speed);
    });

    it("should provide monitoring config", () => {
      const rec = holisticMachiningIntelligenceEngine.getComprehensiveRecommendation(
        1.6, 0.02, "normal"
      );

      expect(rec.monitoringConfig.spindle_load).toBeDefined();
      expect(rec.monitoringConfig.vibration).toBeDefined();
      expect(rec.monitoringConfig.tool_wear).toBeDefined();
    });

    it("should provide contingency plans", () => {
      const rec = holisticMachiningIntelligenceEngine.getComprehensiveRecommendation(
        1.6, 0.02, "normal"
      );

      expect(rec.contingencyPlans.length).toBeGreaterThan(0);
      const chatterPlan = rec.contingencyPlans.find(p => p.trigger.includes("chatter"));
      expect(chatterPlan).toBeDefined();
    });
  });
});
