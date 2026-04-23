/**
 * MillingHeadIntelligenceEngine tests
 * Covers all 7 planning methods + the executeAction dispatcher across 11
 * head types (b_axis, orthogonal, universal, nutating, angular, gear_driven).
 */

import { describe, expect, it } from "vitest";
import {
  millingHeadIntelligenceEngine,
  MillingHeadIntelligenceEngine,
  type MillingHeadConfig,
  type MillingHeadType,
  type BAxisOperation,
} from "../engines/MillingHeadIntelligenceEngine.js";

const DEFAULT_HEAD_LENGTH_MM = 150;
const DEFAULT_CLEARANCE_RADIUS_MM = 120;
const B_AXIS_DEFAULT_MIN_DEG = -120;
const B_AXIS_DEFAULT_MAX_DEG = 120;

function makeHeadConfig(overrides: Partial<MillingHeadConfig> = {}): MillingHeadConfig {
  return {
    headId: "H-TEST",
    headType: "b_axis_continuous",
    hasBAxis: true,
    bAxisRange_deg: { min: B_AXIS_DEFAULT_MIN_DEG, max: B_AXIS_DEFAULT_MAX_DEG },
    bAxisResolution_deg: 0.001,
    bAxisClampingTorque_Nm: 2000,
    maxSpindleRpm: 12000,
    spindlePower_kW: 22,
    spindleTorque_Nm: 150,
    spindleInterface: "HSK-A63",
    headWeight_kg: 40,
    headLength_mm: DEFAULT_HEAD_LENGTH_MM,
    minClearanceRadius_mm: DEFAULT_CLEARANCE_RADIUS_MM,
    coolantThroughSpindle: true,
    coolantPressure_bar: 70,
    supportedOperations: ["contour", "drill", "face"],
    maxToolDiameter_mm: 80,
    maxToolLength_mm: 200,
    ...overrides,
  };
}

function makeOperation(overrides: Partial<BAxisOperation> = {}): BAxisOperation {
  return {
    operationId: "OP-1",
    operationType: "face",
    requiredBAngle_deg: 0,
    toleranceAngle_deg: 0.5,
    surfaceNormal: { x: 0, y: 0, z: 1 },
    approachVector: { x: 0, y: 0, z: 1 },
    material: "steel",
    ...overrides,
  };
}

describe("MillingHeadIntelligenceEngine.planBAxisOperations", () => {
  it("rejects configurations without B-axis capability", () => {
    const cfg = makeHeadConfig({ hasBAxis: false, headType: "orthogonal_fixed" });
    const result = millingHeadIntelligenceEngine.planBAxisOperations([makeOperation()], cfg);
    expect(result.success).toBe(false);
    expect(result.error).toContain("B-axis");
  });

  it("plans a single op with normal=(0,0,1) at B=0 and reports isCapable=true", () => {
    const cfg = makeHeadConfig();
    const result = millingHeadIntelligenceEngine.planBAxisOperations([makeOperation()], cfg);
    expect(result.success).toBe(true);
    expect(result.data?.isCapable).toBe(true);
    expect(result.data?.bPositions).toHaveLength(1);
    expect(result.data?.bPositions[0].bAngle_deg).toBeCloseTo(0, 3);
  });

  it("rejects operations outside the B-axis range", () => {
    const cfg = makeHeadConfig({ bAxisRange_deg: { min: -30, max: 30 } });
    // normal (1,0,0) → B = atan2(1,0)*180/π = 90° — outside ±30°
    const op = makeOperation({ surfaceNormal: { x: 1, y: 0, z: 0 } });
    const result = millingHeadIntelligenceEngine.planBAxisOperations([op], cfg);
    expect(result.success).toBe(true);
    expect(result.data?.isCapable).toBe(false);
    expect(result.data?.collisionRisks.length).toBeGreaterThan(0);
    expect(result.data?.collisionRisks[0]).toContain("outside range");
  });

  it("flags interpolation requirement for contour operations", () => {
    const cfg = makeHeadConfig();
    const op = makeOperation({ operationType: "5-axis contour" });
    const result = millingHeadIntelligenceEngine.planBAxisOperations([op], cfg);
    expect(result.data?.interpolationRequired).toBe(true);
  });

  it("recommends upgrading when indexed head is used for interpolated ops", () => {
    const cfg = makeHeadConfig({
      headType: "b_axis_indexed",
      bAxisIndexPositions: 72,
    });
    const op = makeOperation({ operationType: "5-axis contour" });
    const result = millingHeadIntelligenceEngine.planBAxisOperations([op], cfg);
    const joined = (result.data?.recommendations ?? []).join(" ");
    expect(joined).toContain("continuous");
  });
});

describe("MillingHeadIntelligenceEngine.analyzeOrthogonalHead", () => {
  it("returns success with a reach envelope containing a headstock restricted zone", () => {
    const cfg = makeHeadConfig({ headType: "orthogonal_fixed", hasBAxis: false });
    const result = millingHeadIntelligenceEngine.analyzeOrthogonalHead(cfg, {
      x: 200, y: 100, z: 150,
    });
    expect(result.success).toBe(true);
    expect(result.data?.reachEnvelope.restrictedZones.length).toBeGreaterThan(0);
    expect(result.data?.reachEnvelope.restrictedZones[0].description).toContain("Headstock");
  });

  it("reports orthogonal_fixed head limitation for single-angle operations", () => {
    const cfg = makeHeadConfig({ headType: "orthogonal_fixed", hasBAxis: false });
    const result = millingHeadIntelligenceEngine.analyzeOrthogonalHead(cfg, { x: 100, y: 100, z: 100 });
    expect(result.data?.limitingFactors.join(" ")).toContain("Fixed angle");
  });

  it("flags heavy heads (>50 kg) as a traverse-acceleration limit", () => {
    const cfg = makeHeadConfig({ headWeight_kg: 60 });
    const result = millingHeadIntelligenceEngine.analyzeOrthogonalHead(cfg, { x: 100, y: 100, z: 100 });
    expect(result.data?.limitingFactors.some(f => f.includes("Heavy head"))).toBe(true);
  });

  it("flags missing through-spindle coolant as a limiting factor", () => {
    const cfg = makeHeadConfig({ coolantThroughSpindle: false });
    const result = millingHeadIntelligenceEngine.analyzeOrthogonalHead(cfg, { x: 100, y: 100, z: 100 });
    expect(result.data?.limitingFactors.some(f => f.includes("through-spindle"))).toBe(true);
  });

  it("returns error for an unknown head type", () => {
    const cfg = makeHeadConfig({ headType: "fictional_head" as MillingHeadType });
    const result = millingHeadIntelligenceEngine.analyzeOrthogonalHead(cfg, { x: 100, y: 100, z: 100 });
    expect(result.success).toBe(false);
    expect(result.error).toContain("Unknown head type");
  });
});

describe("MillingHeadIntelligenceEngine.planUniversalHeadOrientation", () => {
  it("rejects non-universal head types", () => {
    const cfg = makeHeadConfig({ headType: "orthogonal_fixed" });
    const result = millingHeadIntelligenceEngine.planUniversalHeadOrientation(
      { x: 0, y: 0, z: 1 }, cfg,
    );
    expect(result.success).toBe(false);
    expect(result.error).toContain("universal");
  });

  it("computes A=0 and C=0 for a vertical (0,0,1) tool on a universal_ac head (singularity)", () => {
    const cfg = makeHeadConfig({ headType: "universal_ac" });
    const result = millingHeadIntelligenceEngine.planUniversalHeadOrientation(
      { x: 0, y: 0, z: 1 }, cfg,
    );
    expect(result.success).toBe(true);
    expect(result.data?.aAngle_deg).toBeCloseTo(0, 1);
    expect(result.data?.singularityRisk).toBe(true);
    expect(result.data?.optimalApproach).toContain("vertical");
  });

  it("computes A=90 for a (1,0,0) tool on universal_ac (fully tilted from Z to X)", () => {
    const cfg = makeHeadConfig({ headType: "universal_ac" });
    const result = millingHeadIntelligenceEngine.planUniversalHeadOrientation(
      { x: 1, y: 0, z: 0 }, cfg,
    );
    expect(result.data?.aAngle_deg).toBeCloseTo(90, 1);
    // 90° is within the default bRange of [-120, 120] → reachable=true
    expect(result.data?.reachable).toBe(true);
    expect(result.data?.toolVector.x).toBeCloseTo(1, 3);
  });

  it("flags reachable=false when A exceeds the configured bAxisRange", () => {
    // Narrow range: [-60, 60]. With (1,0,0), A = 90° > 60° → unreachable
    const cfg = makeHeadConfig({
      headType: "universal_ac",
      bAxisRange_deg: { min: -60, max: 60 },
    });
    const result = millingHeadIntelligenceEngine.planUniversalHeadOrientation(
      { x: 1, y: 0, z: 0 }, cfg,
    );
    expect(result.data?.reachable).toBe(false);
    expect(result.data?.optimalApproach).toContain("outside axis limits");
  });

  it("normalizes the target vector internally before computing angles", () => {
    const cfg = makeHeadConfig({ headType: "universal_ac" });
    const normalized = millingHeadIntelligenceEngine.planUniversalHeadOrientation(
      { x: 0, y: 0, z: 1 }, cfg,
    );
    const scaled = millingHeadIntelligenceEngine.planUniversalHeadOrientation(
      { x: 0, y: 0, z: 5 }, cfg, // same direction, 5× magnitude
    );
    expect(scaled.data?.aAngle_deg).toBeCloseTo(normalized.data?.aAngle_deg ?? 0, 3);
    expect(scaled.data?.toolVector.z).toBeCloseTo(1, 3);
  });
});

describe("MillingHeadIntelligenceEngine.analyzeAngularHead", () => {
  it("returns an angular analysis with speed and torque characteristics", () => {
    const result = millingHeadIntelligenceEngine.analyzeAngularHead("gear_driven_90", {
      requiredAngle_deg: 90,
      cuttingPower_kW: 5,
      rpm: 4000,
    });
    expect(result.success).toBe(true);
    expect(result.data?.fixedAngle_deg).toBe(90);
    expect(result.data?.gearRatio).toBeGreaterThan(1);
    expect(result.data?.torqueIncrease_percent).toBeGreaterThan(0);
  });

  it("flags fixed-angle mismatch when requiredAngle differs from fixed angle", () => {
    const result = millingHeadIntelligenceEngine.analyzeAngularHead("angular_fixed", {
      requiredAngle_deg: 45,
      cuttingPower_kW: 5,
      rpm: 3000,
    });
    expect(result.data?.limitations.some(l => l.includes("cannot achieve"))).toBe(true);
  });

  it("flags operations exceeding head power or RPM capacity", () => {
    const result = millingHeadIntelligenceEngine.analyzeAngularHead("angular_adjustable", {
      requiredAngle_deg: 45,
      cuttingPower_kW: 50,   // far exceeds 7 kW angular_adjustable capacity
      rpm: 20000,            // far exceeds 5000 RPM capacity
    });
    const joined = result.data?.limitations.join(" ") ?? "";
    expect(joined).toContain("exceeds");
  });

  it("returns an error for an unknown head type", () => {
    const result = millingHeadIntelligenceEngine.analyzeAngularHead(
      "nonexistent" as MillingHeadType,
      { requiredAngle_deg: 45, cuttingPower_kW: 5, rpm: 3000 },
    );
    expect(result.success).toBe(false);
    expect(result.error).toContain("Unknown head type");
  });
});

describe("MillingHeadIntelligenceEngine.recommendMillingHead", () => {
  it("recommends b_axis_continuous for high-power interpolated work", () => {
    const result = millingHeadIntelligenceEngine.recommendMillingHead(
      [{ type: "contour", angles: [0, 30, 60], powerRequired_kW: 18, interpolation: true }],
      { budget: "high", accuracy_mm: 0.02, production: false },
    );
    expect(result.data?.recommendedHead).toBe("b_axis_continuous");
    expect(result.data?.estimatedCost).toBe("high");
  });

  it("recommends universal_ac for low-power interpolated work", () => {
    const result = millingHeadIntelligenceEngine.recommendMillingHead(
      [{ type: "contour", angles: [0, 30], powerRequired_kW: 8, interpolation: true }],
      { budget: "medium", accuracy_mm: 0.05, production: true },
    );
    expect(result.data?.recommendedHead).toBe("universal_ac");
  });

  it("recommends universal_bc when max angle exceeds 90°", () => {
    const result = millingHeadIntelligenceEngine.recommendMillingHead(
      [{ type: "angular", angles: [120], powerRequired_kW: 10, interpolation: false }],
      { budget: "high", accuracy_mm: 0.05, production: false },
    );
    expect(result.data?.recommendedHead).toBe("universal_bc");
  });

  it("recommends orthogonal_fixed for single-angle 90° work", () => {
    const result = millingHeadIntelligenceEngine.recommendMillingHead(
      [{ type: "side_mill", angles: [90], powerRequired_kW: 8, interpolation: false }],
      { budget: "low", accuracy_mm: 0.05, production: true },
    );
    expect(result.data?.recommendedHead).toBe("orthogonal_fixed");
    expect(result.data?.estimatedCost).toBe("low");
  });

  it("warns about budget mismatch when high-cost head is required but budget is low", () => {
    const result = millingHeadIntelligenceEngine.recommendMillingHead(
      [{ type: "contour", angles: [0, 30], powerRequired_kW: 18, interpolation: true }],
      { budget: "low", accuracy_mm: 0.02, production: false },
    );
    expect(result.data?.tradeoffs.join(" ")).toContain("exceeds budget");
  });
});

describe("MillingHeadIntelligenceEngine.checkCollision", () => {
  it("reports no collision for a small part well inside the clearance radius", () => {
    const cfg = makeHeadConfig({
      headLength_mm: 50,
      minClearanceRadius_mm: 200,
    });
    const result = millingHeadIntelligenceEngine.checkCollision(cfg, {
      diameter_mm: 20,
      length_mm: 100,
      features: [],
    });
    expect(result.success).toBe(true);
    expect(result.data?.hasCollision).toBe(false);
    expect(result.data?.collisionPoints).toEqual([]);
  });

  it("detects collisions when head swing exceeds clearance for large part diameters", () => {
    const cfg = makeHeadConfig({
      headLength_mm: 300,
      minClearanceRadius_mm: 20,
    });
    const result = millingHeadIntelligenceEngine.checkCollision(cfg, {
      diameter_mm: 500,
      length_mm: 300,
      features: [],
    });
    expect(result.data?.hasCollision).toBe(true);
    expect(result.data?.collisionPoints.length).toBeGreaterThan(0);
    expect(result.data?.recommendations.length).toBeGreaterThan(0);
  });

  it("reports a safeBRange_deg equal to the configured B range when no collisions occur", () => {
    const cfg = makeHeadConfig({
      headLength_mm: 50,
      minClearanceRadius_mm: 200,
      bAxisRange_deg: { min: -60, max: 60 },
    });
    const result = millingHeadIntelligenceEngine.checkCollision(cfg, {
      diameter_mm: 10, length_mm: 50, features: [],
    });
    expect(result.data?.safeBRange_deg).toEqual({ min: -60, max: 60 });
  });
});

describe("MillingHeadIntelligenceEngine.planInterpolation", () => {
  it("rejects indexed heads that cannot interpolate", () => {
    const cfg = makeHeadConfig({ headType: "b_axis_indexed" });
    const result = millingHeadIntelligenceEngine.planInterpolation(
      { b: 0, x: 0, z: 0 },
      { b: 30, x: 10, z: 5 },
      cfg,
      "steel",
    );
    expect(result.success).toBe(false);
    expect(result.error).toContain("does not support interpolation");
  });

  it("rejects fixed heads that cannot interpolate", () => {
    const cfg = makeHeadConfig({ headType: "orthogonal_fixed", hasBAxis: false });
    const result = millingHeadIntelligenceEngine.planInterpolation(
      { b: 0, x: 0, z: 0 },
      { b: 15, x: 5, z: 5 },
      cfg,
      "steel",
    );
    expect(result.success).toBe(false);
  });

  it("generates multiple path segments when the B-axis sweep is large", () => {
    const cfg = makeHeadConfig({ headType: "universal_ac" });
    const result = millingHeadIntelligenceEngine.planInterpolation(
      { b: 0, x: 0, z: 0 },
      { b: 60, x: 30, z: 10 },
      cfg,
      "steel",
    );
    expect(result.success).toBe(true);
    // 60° / 15° per segment = 4 segments
    expect(result.data?.interpolationPath.length).toBeGreaterThanOrEqual(4);
    expect(result.data?.type).toBe("simultaneous");
  });

  it("uses higher feed for aluminum than for titanium", () => {
    const cfg = makeHeadConfig({ headType: "universal_ac" });
    const aluminum = millingHeadIntelligenceEngine.planInterpolation(
      { b: 0, x: 0, z: 0 }, { b: 10, x: 5, z: 5 }, cfg, "aluminum",
    );
    const titanium = millingHeadIntelligenceEngine.planInterpolation(
      { b: 0, x: 0, z: 0 }, { b: 10, x: 5, z: 5 }, cfg, "titanium",
    );
    expect(aluminum.data!.feedRate_mmPerMin).toBeGreaterThan(titanium.data!.feedRate_mmPerMin);
  });
});

describe("MillingHeadIntelligenceEngine.executeAction", () => {
  const engine = new MillingHeadIntelligenceEngine();

  it("routes milling_head_plan_baxis to planBAxisOperations", async () => {
    const result = await engine.executeAction("milling_head_plan_baxis", {
      operations: [makeOperation()],
      config: makeHeadConfig(),
    });
    expect(result.success).toBe(true);
  });

  it("routes milling_head_analyze_orthogonal to analyzeOrthogonalHead", async () => {
    const result = await engine.executeAction("milling_head_analyze_orthogonal", {
      config: makeHeadConfig({ headType: "orthogonal_fixed", hasBAxis: false }),
      partEnvelope: { x: 100, y: 100, z: 100 },
    });
    expect(result.success).toBe(true);
  });

  it("routes milling_head_plan_universal to planUniversalHeadOrientation", async () => {
    const result = await engine.executeAction("milling_head_plan_universal", {
      targetVector: { x: 0, y: 0, z: 1 },
      config: makeHeadConfig({ headType: "universal_ac" }),
    });
    expect(result.success).toBe(true);
  });

  it("routes milling_head_analyze_angular to analyzeAngularHead", async () => {
    const result = await engine.executeAction("milling_head_analyze_angular", {
      headType: "angular_adjustable",
      operation: { requiredAngle_deg: 45, cuttingPower_kW: 5, rpm: 3000 },
    });
    expect(result.success).toBe(true);
  });

  it("routes milling_head_recommend to recommendMillingHead", async () => {
    const result = await engine.executeAction("milling_head_recommend", {
      operations: [{ type: "face", angles: [90], powerRequired_kW: 8, interpolation: false }],
      constraints: { budget: "low", accuracy_mm: 0.05, production: true },
    });
    expect(result.success).toBe(true);
  });

  it("routes milling_head_check_collision to checkCollision", async () => {
    const result = await engine.executeAction("milling_head_check_collision", {
      config: makeHeadConfig({ minClearanceRadius_mm: 200, headLength_mm: 50 }),
      partGeometry: { diameter_mm: 10, length_mm: 50, features: [] },
    });
    expect(result.success).toBe(true);
  });

  it("routes milling_head_plan_interpolation to planInterpolation", async () => {
    const result = await engine.executeAction("milling_head_plan_interpolation", {
      startState: { b: 0, x: 0, z: 0 },
      endState: { b: 10, x: 5, z: 5 },
      config: makeHeadConfig({ headType: "universal_ac" }),
      material: "aluminum",
    });
    expect(result.success).toBe(true);
  });

  it("returns success=false for unknown actions", async () => {
    const result = await engine.executeAction("milling_head_nonexistent", {});
    expect(result.success).toBe(false);
    expect(result.error).toContain("Unknown action");
  });
});
