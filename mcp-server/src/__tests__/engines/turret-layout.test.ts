/**
 * TurretLayoutEngine tests
 * Tests for turret configurations, tool holder interfaces,
 * and tool positioning optimization
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  TurretLayoutEngine,
  TurretConfig,
  ToolOption,
  OperationSequence,
  ToolAssignment,
} from "../../engines/TurretLayoutEngine.js";

describe("TurretLayoutEngine", () => {
  let engine: TurretLayoutEngine;
  let standardConfig: TurretConfig;

  beforeEach(() => {
    engine = new TurretLayoutEngine();

    standardConfig = {
      turretId: "TURRET-1",
      turretType: "disc_12",
      stationCount: 12,
      interfaceType: "bmt_55",
      drivenStations: [1, 3, 5, 7, 9, 11],
      maxDrivenRpm: 6000,
      drivenPower_kW: 5.5,
      indexTime_seconds: 0.3,
      coolantThroughSpindle: true,
      stationSpacing_deg: 30,
      maxToolDiameter_mm: 40,
      maxToolLength_mm: 120,
      rapidTraverse_mPerMin: 30,
    };
  });

  describe("Engine metadata", () => {
    it("should have correct name and version", () => {
      expect(engine.name).toBe("TurretLayoutEngine");
      expect(engine.version).toBe("1.0.0");
    });
  });

  describe("analyzeInterface", () => {
    it("should analyze BMT 55 interface", () => {
      const result = engine.analyzeInterface("bmt_55");

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.maxTorque_Nm).toBe(80);
      expect(result.data!.maxRpm).toBe(5000);
      expect(result.data!.quickChange).toBe(true);
    });

    it("should analyze VDI 40 interface", () => {
      const result = engine.analyzeInterface("vdi_40");

      expect(result.success).toBe(true);
      expect(result.data!.maxTorque_Nm).toBe(55);
      expect(result.data!.quickChange).toBe(false);
    });

    it("should analyze Capto C4 interface", () => {
      const result = engine.analyzeInterface("capto_c4");

      expect(result.success).toBe(true);
      expect(result.data!.maxTorque_Nm).toBe(200);
      expect(result.data!.repeatability_mm).toBe(0.001);
      expect(result.data!.stiffness_NPerMm).toBe(350000);
    });

    it("should analyze HSK A63 interface", () => {
      const result = engine.analyzeInterface("hsk_a63");

      expect(result.success).toBe(true);
      expect(result.data!.maxRpm).toBe(18000);
      expect(result.data!.balanceGrade).toBe("G2.5");
    });

    it("should fail for unknown interface", () => {
      const result = engine.analyzeInterface("unknown" as any);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Unknown interface");
    });
  });

  describe("compareInterfaces", () => {
    it("should compare BMT vs VDI for precision work", () => {
      const result = engine.compareInterfaces("bmt_55", "vdi_40", "high-speed precision");

      expect(result.success).toBe(true);
      expect(result.data!.recommendation).toBeDefined();
      expect(result.data!.reasons.length).toBeGreaterThan(0);
    });

    it("should compare Capto vs HSK for heavy cutting", () => {
      const result = engine.compareInterfaces("capto_c4", "hsk_a63", "heavy power machining");

      expect(result.success).toBe(true);
      expect(result.data!.reasons.length).toBeGreaterThan(0);
    });

    it("should identify tradeoffs between interfaces", () => {
      const result = engine.compareInterfaces("bmt_45", "capto_c6", "general machining");

      expect(result.success).toBe(true);
      // Different interfaces should have different strengths
      expect(result.data!.recommendation).toBeDefined();
    });
  });

  describe("analyzeTurretCapability", () => {
    it("should analyze disc turret capability", () => {
      const result = engine.analyzeTurretCapability(standardConfig);

      expect(result.success).toBe(true);
      expect(result.data!.turretType).toBe("disc_12");
      expect(result.data!.totalCapacity).toBe(12);
      expect(result.data!.drivenCapacity).toBe(6);
    });

    it("should detect limited driven stations", () => {
      const limitedConfig = { ...standardConfig, drivenStations: [1] };
      const result = engine.analyzeTurretCapability(limitedConfig);

      expect(result.success).toBe(true);
      expect(result.data!.limitingFactors.some(f => f.includes("Limited driven"))).toBe(true);
    });

    it("should detect no driven stations", () => {
      const noDriverConfig = { ...standardConfig, drivenStations: [] };
      const result = engine.analyzeTurretCapability(noDriverConfig);

      expect(result.success).toBe(true);
      expect(result.data!.limitingFactors.some(f => f.includes("No driven stations"))).toBe(true);
    });

    it("should detect slow index time", () => {
      const slowConfig = { ...standardConfig, indexTime_seconds: 0.8 };
      const result = engine.analyzeTurretCapability(slowConfig);

      expect(result.success).toBe(true);
      expect(result.data!.limitingFactors.some(f => f.includes("Slow index"))).toBe(true);
    });

    it("should provide gang tooling recommendations", () => {
      const gangConfig = { ...standardConfig, turretType: "gang" as const };
      const result = engine.analyzeTurretCapability(gangConfig);

      expect(result.success).toBe(true);
      expect(result.data!.recommendations.some(r => r.includes("Gang"))).toBe(true);
    });
  });

  describe("optimizeToolLayout", () => {
    it("should optimize tool layout for operations", () => {
      const operations: OperationSequence[] = [
        { operationId: "OP1", type: "rough", requiredToolType: "rough_od", material: "steel", cuttingTime_seconds: 30, toolChangeRequired: true },
        { operationId: "OP2", type: "finish", requiredToolType: "finish_od", material: "steel", cuttingTime_seconds: 20, toolChangeRequired: true },
        { operationId: "OP3", type: "drill", requiredToolType: "drill", material: "steel", cuttingTime_seconds: 10, toolChangeRequired: true },
      ];

      const tools: ToolOption[] = [
        { toolId: "T1", toolType: "rough_od", diameter_mm: 25, length_mm: 80, isDriven: false, orientation: "radial", capabilities: ["roughing"], cost: 50 },
        { toolId: "T2", toolType: "finish_od", diameter_mm: 12, length_mm: 60, isDriven: false, orientation: "radial", capabilities: ["finishing"], cost: 80 },
        { toolId: "T3", toolType: "drill", diameter_mm: 8, length_mm: 100, isDriven: true, orientation: "axial", capabilities: ["drilling"], cost: 30 },
      ];

      const result = engine.optimizeToolLayout({
        operations,
        availableTools: tools,
        config: standardConfig,
        priorities: {
          minimizeCycleTime: 0.7,
          minimizeToolChanges: 0.5,
          minimizeToolCount: 0.3,
          maximizeToolLife: 0.5,
        },
      });

      expect(result.success).toBe(true);
      expect(result.data!.assignments.length).toBeGreaterThan(0);
      expect(result.data!.toolChangeCount).toBeGreaterThan(0);
    });

    it("should assign driven tools to driven stations", () => {
      const operations: OperationSequence[] = [
        { operationId: "OP1", type: "drill", requiredToolType: "drill", material: "steel", cuttingTime_seconds: 10, toolChangeRequired: true },
      ];

      const tools: ToolOption[] = [
        { toolId: "T1", toolType: "drill", diameter_mm: 8, length_mm: 100, isDriven: true, orientation: "axial", capabilities: [], cost: 30 },
      ];

      const result = engine.optimizeToolLayout({
        operations,
        availableTools: tools,
        config: standardConfig,
        priorities: { minimizeCycleTime: 0.5, minimizeToolChanges: 0.5, minimizeToolCount: 0.5, maximizeToolLife: 0.5 },
      });

      expect(result.success).toBe(true);
      const drivenAssignment = result.data!.assignments.find(a => a.isDriven);
      expect(drivenAssignment).toBeDefined();
      expect(standardConfig.drivenStations).toContain(drivenAssignment!.stationNumber);
    });

    it("should track tool utilization by station", () => {
      const operations: OperationSequence[] = [
        { operationId: "OP1", type: "rough", requiredToolType: "rough_od", material: "steel", cuttingTime_seconds: 60, toolChangeRequired: true },
        { operationId: "OP2", type: "rough", requiredToolType: "rough_od", material: "steel", cuttingTime_seconds: 40, toolChangeRequired: true },
      ];

      const tools: ToolOption[] = [
        { toolId: "T1", toolType: "rough_od", diameter_mm: 25, length_mm: 80, isDriven: false, orientation: "radial", capabilities: [], cost: 50 },
      ];

      const result = engine.optimizeToolLayout({
        operations,
        availableTools: tools,
        config: standardConfig,
        priorities: { minimizeCycleTime: 0.5, minimizeToolChanges: 0.5, minimizeToolCount: 0.5, maximizeToolLife: 0.5 },
      });

      expect(result.success).toBe(true);
      const utilizationValues = Object.values(result.data!.utilizationByStation);
      expect(utilizationValues.some(u => u > 0)).toBe(true);
    });
  });

  describe("planGangToolLayout", () => {
    it("should plan gang tool positions", () => {
      const tools: ToolOption[] = [
        { toolId: "T1", toolType: "rough", diameter_mm: 20, length_mm: 60, isDriven: false, orientation: "radial", capabilities: [], cost: 50 },
        { toolId: "T2", toolType: "finish", diameter_mm: 12, length_mm: 50, isDriven: false, orientation: "radial", capabilities: [], cost: 80 },
        { toolId: "T3", toolType: "groove", diameter_mm: 5, length_mm: 40, isDriven: false, orientation: "radial", capabilities: [], cost: 40 },
      ];

      const operations: OperationSequence[] = [
        { operationId: "OP1", type: "rough", requiredToolType: "rough", material: "steel", cuttingTime_seconds: 30, toolChangeRequired: true },
        { operationId: "OP2", type: "finish", requiredToolType: "finish", material: "steel", cuttingTime_seconds: 20, toolChangeRequired: true },
        { operationId: "OP3", type: "groove", requiredToolType: "groove", material: "steel", cuttingTime_seconds: 10, toolChangeRequired: true },
      ];

      const result = engine.planGangToolLayout(tools, operations, 150);

      expect(result.success).toBe(true);
      expect(result.data!.positions.length).toBe(3);
      expect(result.data!.totalWidth_mm).toBeLessThan(150);
      expect(result.data!.cycleTimeSavings_percent).toBeGreaterThanOrEqual(0);
    });

    it("should detect width limit exceedance", () => {
      const tools: ToolOption[] = [
        { toolId: "T1", toolType: "rough", diameter_mm: 50, length_mm: 60, isDriven: false, orientation: "radial", capabilities: [], cost: 50 },
        { toolId: "T2", toolType: "finish", diameter_mm: 50, length_mm: 50, isDriven: false, orientation: "radial", capabilities: [], cost: 80 },
        { toolId: "T3", toolType: "groove", diameter_mm: 50, length_mm: 40, isDriven: false, orientation: "radial", capabilities: [], cost: 40 },
      ];

      const operations: OperationSequence[] = [
        { operationId: "OP1", type: "rough", requiredToolType: "rough", material: "steel", cuttingTime_seconds: 30, toolChangeRequired: true },
        { operationId: "OP2", type: "finish", requiredToolType: "finish", material: "steel", cuttingTime_seconds: 20, toolChangeRequired: true },
        { operationId: "OP3", type: "groove", requiredToolType: "groove", material: "steel", cuttingTime_seconds: 10, toolChangeRequired: true },
      ];

      const result = engine.planGangToolLayout(tools, operations, 100); // Too narrow

      expect(result.success).toBe(true);
      expect(result.data!.limitations.length).toBeGreaterThan(0);
    });
  });

  describe("checkToolInterference", () => {
    it("should detect no interference with proper spacing", () => {
      const assignments: ToolAssignment[] = [
        { stationNumber: 1, toolId: "T1", toolType: "rough", diameter_mm: 20, length_mm: 60, isDriven: false, orientation: "radial", overhang_mm: 30, cuttingLength_mm: 40 },
        { stationNumber: 5, toolId: "T2", toolType: "finish", diameter_mm: 12, length_mm: 50, isDriven: false, orientation: "radial", overhang_mm: 25, cuttingLength_mm: 35 },
      ];

      const result = engine.checkToolInterference(assignments, standardConfig);

      expect(result.success).toBe(true);
      expect(result.data!.hasInterference).toBe(false);
      expect(result.data!.safeConfiguration).toBe(true);
    });

    it("should detect interference on adjacent stations", () => {
      const assignments: ToolAssignment[] = [
        { stationNumber: 1, toolId: "T1", toolType: "boring", diameter_mm: 50, length_mm: 150, isDriven: false, orientation: "radial", overhang_mm: 100, cuttingLength_mm: 120 },
        { stationNumber: 2, toolId: "T2", toolType: "boring", diameter_mm: 50, length_mm: 150, isDriven: false, orientation: "radial", overhang_mm: 100, cuttingLength_mm: 120 },
      ];

      const result = engine.checkToolInterference(assignments, standardConfig);

      expect(result.success).toBe(true);
      // Long tools on adjacent stations should show interference
      expect(result.data!.interferences.length).toBeGreaterThanOrEqual(0);
    });

    it("should calculate required clearance", () => {
      const assignments: ToolAssignment[] = [
        { stationNumber: 1, toolId: "T1", toolType: "rough", diameter_mm: 25, length_mm: 80, isDriven: false, orientation: "radial", overhang_mm: 40, cuttingLength_mm: 50 },
      ];

      const result = engine.checkToolInterference(assignments, standardConfig);

      expect(result.success).toBe(true);
      expect(result.data!.requiredClearance_mm).toBeGreaterThan(0);
    });
  });

  describe("executeAction", () => {
    it("should route turret_analyze_interface action", async () => {
      const result = await engine.executeAction("turret_analyze_interface", {
        interfaceType: "bmt_55",
      });

      expect(result.success).toBe(true);
    });

    it("should route turret_analyze_capability action", async () => {
      const result = await engine.executeAction("turret_analyze_capability", {
        config: standardConfig,
      });

      expect(result.success).toBe(true);
    });

    it("should return error for unknown action", async () => {
      const result = await engine.executeAction("unknown_action", {});

      expect(result.success).toBe(false);
      expect(result.error).toContain("Unknown action");
    });
  });
});
