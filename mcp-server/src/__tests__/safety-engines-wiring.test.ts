/**
 * Tests for Safety-Critical Engine Wiring Batch:
 * ThreadCalculation, ToolBreakage, SpindleProtection, CoolantValidation
 */
import { describe, it, expect } from "vitest";
import { threadEngine } from "../engines/ThreadCalculationEngine.js";
import { toolBreakageEngine } from "../engines/ToolBreakageEngine.js";
import { spindleProtectionEngine } from "../engines/SpindleProtectionEngine.js";
import { coolantValidationEngine } from "../engines/CoolantValidationEngine.js";

// ── Thread Calculation ───────────────────────────────────────────
describe("ThreadCalculationEngine", () => {
  it("parses ISO metric thread", () => {
    const r = threadEngine.parseThreadDesignation("M10x1.5");
    expect(r).not.toBeNull();
    expect(r!.type).toBe("ISO");
    expect(r!.nominalDiameter).toBeCloseTo(10, 0);
    expect(r!.pitch).toBeCloseTo(1.5, 1);
  });

  it("parses UNC thread", () => {
    const r = threadEngine.parseThreadDesignation("1/4-20 UNC");
    expect(r).not.toBeNull();
    expect(r!.type).toBe("UNC");
  });

  it("calculates tap drill at 75% engagement", () => {
    const r = threadEngine.calculateTapDrill("M10x1.5", 75);
    expect(r).not.toBeNull();
    expect(r!.tapDrillMM).toBeGreaterThan(8);
    expect(r!.tapDrillMM).toBeLessThan(10);
    expect(r!.engagementPercent).toBeCloseTo(75, 0);
  });

  it("lower engagement = larger drill", () => {
    const r50 = threadEngine.calculateTapDrill("M10x1.5", 50);
    const r75 = threadEngine.calculateTapDrill("M10x1.5", 75);
    expect(r50).not.toBeNull();
    expect(r75).not.toBeNull();
    expect(r50!.tapDrillMM).toBeGreaterThan(r75!.tapDrillMM);
  });

  it("calculates thread mill params", () => {
    const r = threadEngine.calculateThreadMillParams("M10x1.5", 6, "steel", true);
    expect(r).not.toBeNull();
    expect(r!.rpm).toBeGreaterThan(0);
    expect(r!.feedRate).toBeGreaterThan(0);
  });

  it("calculates stripping strength", () => {
    const r = threadEngine.calculateStrippingStrength("M10x1.5", 10, 400);
    expect(r).not.toBeNull();
    expect(r!.internalStrippingForce).toBeGreaterThan(0);
    expect(r!.safetyFactor).toBeGreaterThan(0);
  });

  it("returns null for invalid designation", () => {
    const r = threadEngine.parseThreadDesignation("INVALID");
    expect(r).toBeNull();
  });
});

// ── Tool Breakage Prediction ─────────────────────────────────────
describe("ToolBreakageEngine", () => {
  const tool = {
    diameter: 10,
    shankDiameter: 10,
    fluteLength: 30,
    overallLength: 75,
    stickout: 45,
    numberOfFlutes: 4,
    helixAngle: 30,
    coreRatio: 0.6,
  };

  const forces = { Fc: 500, Ff: 200, Fp: 150 };

  const conditions = {
    cuttingSpeed: 150,
    feedPerTooth: 0.08,
    axialDepth: 5,
    radialDepth: 5,
    spindleSpeed: 4775,
  };

  it("predicts breakage risk", () => {
    const r = toolBreakageEngine.predictBreakage(tool, forces, conditions);
    expect(r.overallRisk).toBeDefined();
    expect(r.breakageProbability).toBeGreaterThanOrEqual(0);
    expect(r.breakageProbability).toBeLessThanOrEqual(100);
    expect(r.primaryFailureMode).toBeDefined();
  });

  it("analyzes tool stress", () => {
    const r = toolBreakageEngine.calculateToolStress(tool, forces);
    expect(r.vonMisesStress).toBeGreaterThan(0);
    expect(r.safetyFactor).toBeGreaterThan(0);
    expect(r.isSafe).toBeDefined();
  });

  it("gets safe cutting limits", () => {
    const r = toolBreakageEngine.getSafeCuttingLimits(tool, "CARBIDE", "STEEL");
    expect(r).toBeDefined();
  });

  it("small tool + high forces = higher risk", () => {
    const smallTool = { ...tool, diameter: 3, shankDiameter: 3, stickout: 25 };
    const highForces = { Fc: 800, Ff: 400, Fp: 300 };
    const r = toolBreakageEngine.predictBreakage(smallTool, highForces, conditions);
    expect(r.breakageProbability).toBeGreaterThan(30);
  });

  it("interrupted cut increases risk", () => {
    const normal = toolBreakageEngine.predictBreakage(tool, forces, conditions, "CARBIDE");
    const interrupted = toolBreakageEngine.predictBreakage(
      tool, forces, conditions, "CARBIDE", { isInterrupted: true }
    );
    expect(interrupted.breakageProbability).toBeGreaterThanOrEqual(
      normal.breakageProbability
    );
  });
});

// ── Spindle Protection ───────────────────────────────────────────
describe("SpindleProtectionEngine", () => {
  const spindle = {
    type: "DIRECT_DRIVE" as const,
    bearingType: "ANGULAR_CONTACT" as const,
    coolingType: "OIL_JET" as const,
    ratedPower: 22,
    peakPower: 30,
    ratedTorque: 70,
    peakTorque: 120,
    minSpeed: 50,
    maxSpeed: 12000,
    ratedSpeed: 3000,
    cornerSpeed: 1500,
    maxTemperature: 70,
    warningTemperature: 60,
    maxRadialLoad: 5000,
    maxAxialLoad: 3000,
  };

  const requirements = {
    requiredTorque: 40,
    requiredPower: 12,
    targetSpeed: 3000,
    operationType: "ROUGHING" as const,
  };

  it("checks spindle torque", () => {
    const r = spindleProtectionEngine.checkSpindleTorque(spindle, requirements);
    expect(r.requiredTorque).toBe(40);
    expect(r.availableTorque).toBeGreaterThan(0);
    expect(r.loadPercent).toBeGreaterThan(0);
  });

  it("checks spindle power", () => {
    const r = spindleProtectionEngine.checkSpindlePower(spindle, requirements);
    expect(r).toBeDefined();
  });

  it("gets safe envelope", () => {
    const r = spindleProtectionEngine.getSpindleSafeEnvelope(spindle, requirements);
    expect(r).toBeDefined();
    expect(r.warnings).toBeDefined();
    expect(r.recommendations).toBeDefined();
  });

  it("overload detected when torque exceeds rated", () => {
    const overload = { ...requirements, requiredTorque: 150 };
    const r = spindleProtectionEngine.checkSpindleTorque(spindle, overload);
    expect(r.loadPercent).toBeGreaterThan(100);
  });
});

// ── Coolant Validation ───────────────────────────────────────────
describe("CoolantValidationEngine", () => {
  const system = {
    delivery: "FLOOD" as const,
    coolantType: "WATER_SOLUBLE" as const,
    flowRate: 20,
    pressure: 10,
    concentration: 8,
  };

  const opParams = {
    operation: "MILLING_GENERAL" as const,
    toolDiameter: 20,
    cuttingSpeed: 150,
    feedRate: 500,
  };

  it("validates coolant flow", () => {
    const r = coolantValidationEngine.validateCoolantFlow(system, opParams);
    expect(r.requiredFlow).toBeGreaterThan(0);
    expect(r.isAdequate).toBeDefined();
  });

  it("validates full coolant setup", () => {
    const r = coolantValidationEngine.validateCoolant(system, opParams);
    expect(r).toBeDefined();
    expect(r.warnings).toBeDefined();
    expect(r.recommendations).toBeDefined();
  });

  it("calculates chip evacuation for deep drilling", () => {
    const drillOp = {
      ...opParams,
      operation: "DRILLING_DEEP" as const,
      holeDepth: 60,
      toolDiameter: 10,
    };
    const r = coolantValidationEngine.calculateChipEvacuation(drillOp, system);
    expect(r.ldRatio).toBeCloseTo(6, 0);
    expect(r.evacuationType).toBeDefined();
  });

  it("low flow triggers warning", () => {
    const lowFlow = { ...system, flowRate: 1 };
    const r = coolantValidationEngine.validateCoolantFlow(lowFlow, opParams);
    expect(r.isAdequate).toBe(false);
    expect(r.warnings.length).toBeGreaterThan(0);
  });

  it("TSC required for deep drilling", () => {
    const deepDrill = {
      ...opParams,
      operation: "DRILLING_DEEP" as const,
      holeDepth: 100,
      toolDiameter: 8,
    };
    const r = coolantValidationEngine.validateCoolant(system, deepDrill);
    expect(r.recommendations.length).toBeGreaterThan(0);
  });
});
