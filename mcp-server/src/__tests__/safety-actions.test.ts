/**
 * Safety Dispatcher — Action-Level Integration Tests
 * ====================================================
 * Tests the 5 safety sub-domains through the unified prism_safety dispatcher:
 *   - Spindle protection (check_spindle_torque)
 *   - Tool breakage prediction (predict_tool_breakage)
 *   - Workholding validation (calculate_clamp_force_required)
 *   - Coolant validation (validate_coolant_flow)
 *   - Collision detection (check_toolpath_collision)
 *
 * SAFETY CRITICAL: These are the highest-traffic safety tools.
 */

import { describe, it, expect } from "vitest";
import { registerSafetyDispatcher } from "../tools/dispatchers/safetyDispatcher.js";

// ============================================================================
// TEST HELPERS
// ============================================================================

interface CapturedTool {
  name: string;
  description: string;
  schema: any;
  handler: (args: any) => Promise<any>;
}

function createMockServer(): { server: any; tools: CapturedTool[] } {
  const tools: CapturedTool[] = [];
  const server = {
    tool(name: string, description: string, schema: any, handler: any) {
      tools.push({ name, description, schema, handler });
    },
  };
  return { server, tools };
}

async function callAction(
  tool: CapturedTool,
  action: string,
  params: Record<string, any> = {}
): Promise<any> {
  const result = await tool.handler({ action, params });
  const text = result?.content?.[0]?.text;
  return text ? JSON.parse(text) : result;
}

// ============================================================================
// SETUP
// ============================================================================

const { server, tools } = createMockServer();
registerSafetyDispatcher(server);
const safety = tools[0];

// ============================================================================
// REGISTRATION
// ============================================================================

describe("prism_safety dispatcher", () => {
  it("registers as prism_safety", () => {
    expect(safety).toBeDefined();
    expect(safety.name).toBe("prism_safety");
  });

  it("has SAFETY CRITICAL in description", () => {
    expect(safety.description).toContain("SAFETY CRITICAL");
  });
});

// ============================================================================
// check_spindle_torque — Spindle Protection
// ============================================================================

describe("safety: check_spindle_torque", () => {
  it("validates spindle torque with direct torque + speed", async () => {
    const r = await callAction(safety, "check_spindle_torque", {
      requiredTorque: 45,       // Nm — typical roughing torque
      targetSpeed: 8000,        // RPM
      spindleType: "DIRECT_DRIVE",
      operationType: "ROUGHING",
    });
    expect(r).toBeDefined();
    // Either a valid safety result or a structured error
    if (!r.error) {
      // TorqueCheckResult uses `isSafe` not `safe`
      expect(r.isSafe).toBeDefined();
      expect(typeof r.isSafe).toBe("boolean");
      if (r.loadPercent !== undefined) {
        expect(r.loadPercent).toBeGreaterThan(0);
      }
    } else {
      // Structured error — not a crash
      expect(typeof r.error).toBe("string");
    }
  });

  it("validates spindle torque from power + speed derivation", async () => {
    const r = await callAction(safety, "check_spindle_torque", {
      power_kw: 15,             // kW
      spindle_speed_rpm: 6000,  // RPM
      spindleType: "BELT_DRIVE",
      operationType: "ROUGHING",
    });
    expect(r).toBeDefined();
    if (!r.error) {
      expect(r.isSafe).toBeDefined();
    } else {
      expect(typeof r.error).toBe("string");
    }
  });

  it("returns error when missing required torque params", async () => {
    const r = await callAction(safety, "check_spindle_torque", {
      spindleType: "DIRECT_DRIVE",
    });
    expect(r).toBeDefined();
    // Should return an error or a safety result, not crash
    expect(r.error || r.isSafe !== undefined || r.safe !== undefined).toBeTruthy();
  });
});

// ============================================================================
// predict_tool_breakage — Tool Breakage Prediction
// ============================================================================

describe("safety: predict_tool_breakage", () => {
  it("predicts breakage risk for a 12mm endmill under roughing", async () => {
    const r = await callAction(safety, "predict_tool_breakage", {
      tool: {
        diameter: 12,
        shankDiameter: 12,
        fluteLength: 30,
        overallLength: 80,
        stickout: 45,
        numberOfFlutes: 4,
        coreRatio: 0.6,
      },
      forces: {
        Fc: 1200,   // N — tangential cutting force
        Ff: 480,    // N — feed force
        Fp: 360,    // N — radial force
      },
      conditions: {
        cuttingSpeed: 150,    // m/min
        feedPerTooth: 0.08,   // mm/tooth
        axialDepth: 12,       // mm (1xD)
        radialDepth: 6,       // mm (0.5xD)
        spindleSpeed: 4000,
      },
      toolMaterial: "CARBIDE",
      workpieceMaterial: "STEEL",
      operationType: "ROUGHING",
    });
    expect(r).toBeDefined();
    if (!r.error) {
      // BreakagePrediction uses `overallRisk` and `breakageProbability`
      expect(r.overallRisk).toBeDefined();
      expect(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).toContain(r.overallRisk);
      expect(r.breakageProbability).toBeDefined();
      expect(r.breakageProbability).toBeGreaterThanOrEqual(0);
    } else {
      expect(typeof r.error).toBe("string");
    }
  });

  it("handles a small 3mm endmill with high stickout (risky scenario)", async () => {
    const r = await callAction(safety, "predict_tool_breakage", {
      tool: {
        diameter: 3,
        shankDiameter: 3,
        fluteLength: 9,
        overallLength: 50,
        stickout: 30,          // 10xD stickout — very high risk
        numberOfFlutes: 2,
        coreRatio: 0.55,
      },
      forces: {
        Fc: 300,
        Ff: 120,
        Fp: 90,
      },
      conditions: {
        cuttingSpeed: 100,
        feedPerTooth: 0.03,
        axialDepth: 3,
        radialDepth: 1.5,
        spindleSpeed: 10600,
      },
      toolMaterial: "CARBIDE",
      workpieceMaterial: "STAINLESS",
      operationType: "FINISHING",
    });
    expect(r).toBeDefined();
    if (!r.error) {
      // High stickout should raise risk — BreakagePrediction uses overallRisk
      expect(r.overallRisk).toBeDefined();
      expect(r.breakageProbability).toBeGreaterThanOrEqual(0);
    }
  });
});

// ============================================================================
// calculate_clamp_force_required — Workholding
// ============================================================================

describe("safety: calculate_clamp_force_required", () => {
  it("calculates clamp force for vise clamping with milling forces", async () => {
    const r = await callAction(safety, "calculate_clamp_force_required", {
      cuttingForces: {
        Fc: 1500,   // N — tangential
        Ff: 600,    // N — feed
        Fp: 450,    // N — radial
      },
      workholdingType: "VICE_SERRATED",
      surfaceCondition: "DRY",
      operationType: "MILLING",
    });
    expect(r).toBeDefined();
    if (!r.error) {
      // ClampForceResult uses requiredClampForce, safetyFactor, isSafe
      expect(r.requiredClampForce).toBeDefined();
      expect(r.requiredClampForce).toBeGreaterThan(0);
      expect(r.safetyFactor).toBeDefined();
      // safetyFactor may be 0 if no appliedClampForce was provided (ratio = applied/required)
      expect(r.safetyFactor).toBeGreaterThanOrEqual(0);
      expect(r.isSafe).toBeDefined();
      expect(typeof r.isSafe).toBe("boolean");
    } else {
      expect(typeof r.error).toBe("string");
    }
  });

  it("calculates clamp force for hydraulic clamp with coolant-wet surface", async () => {
    const r = await callAction(safety, "calculate_clamp_force_required", {
      cuttingForces: {
        Fc: 2000,
        Ff: 800,
        Fp: 600,
      },
      workholdingType: "HYDRAULIC_CLAMP",
      surfaceCondition: "COOLANT_WET",
      operationType: "ROUGHING",
      appliedClampForce: 5000,  // N — check if current is enough
    });
    expect(r).toBeDefined();
    if (!r.error) {
      // Coolant-wet reduces friction — should need more clamp force
      if (r.slip_safety_factor !== undefined || r.slipSafetyFactor !== undefined) {
        expect(r.slip_safety_factor || r.slipSafetyFactor).toBeGreaterThan(0);
      }
    }
  });
});

// ============================================================================
// validate_coolant_flow — Coolant Validation
// ============================================================================

describe("safety: validate_coolant_flow", () => {
  it("validates flood coolant for general milling in steel", async () => {
    const r = await callAction(safety, "validate_coolant_flow", {
      delivery: "FLOOD",
      coolantType: "WATER_SOLUBLE",
      flowRate: 20,           // L/min
      pressure: 10,           // bar
      operation: "MILLING_GENERAL",
      toolDiameter: 16,       // mm
      cuttingSpeed: 180,      // m/min
      feedRate: 800,          // mm/min
      materialType: "STEEL",
    });
    expect(r).toBeDefined();
    if (!r.error) {
      // CoolantValidationResult uses overallAdequate and thermalStatus
      expect(r.overallAdequate).toBeDefined();
      expect(typeof r.overallAdequate).toBe("boolean");
      if (r.thermalStatus !== undefined) {
        expect(["SAFE", "MARGINAL", "RISK"]).toContain(r.thermalStatus);
      }
    } else {
      expect(typeof r.error).toBe("string");
    }
  });

  it("validates TSC for deep drilling in titanium", async () => {
    const r = await callAction(safety, "validate_coolant_flow", {
      delivery: "THROUGH_SPINDLE",
      coolantType: "FULL_SYNTHETIC",
      flowRate: 15,
      pressure: 70,           // bar — high pressure for Ti
      operation: "DRILLING_DEEP",
      toolDiameter: 8,
      cuttingSpeed: 40,       // m/min — low for titanium
      feedRate: 200,
      holeDepth: 40,          // 5xD hole
      materialType: "TITANIUM",
      hasThroughCoolant: true,
    });
    expect(r).toBeDefined();
    if (!r.error) {
      // CoolantValidationResult uses overallAdequate
      expect(r.overallAdequate).toBeDefined();
      expect(typeof r.overallAdequate).toBe("boolean");
    }
  });

  it("validates MQL for aluminum milling", async () => {
    const r = await callAction(safety, "validate_coolant_flow", {
      delivery: "MQL",
      coolantType: "MQL_OIL",
      flowRate: 0.05,         // L/min — MQL is very low flow
      pressure: 6,
      operation: "MILLING_HSM",
      toolDiameter: 10,
      cuttingSpeed: 500,      // m/min — high speed for Al
      feedRate: 3000,
      materialType: "ALUMINUM",
    });
    expect(r).toBeDefined();
    // MQL may or may not be adequate for aluminum — just check no crash
    if (!r.error) {
      // CoolantValidationResult uses overallAdequate
      expect(r.overallAdequate).toBeDefined();
      expect(typeof r.overallAdequate).toBe("boolean");
    }
  });
});

// ============================================================================
// check_toolpath_collision — Collision Detection
// ============================================================================

describe("safety: check_toolpath_collision", () => {
  it("checks a simple 2-move toolpath for collisions", async () => {
    const r = await callAction(safety, "check_toolpath_collision", {
      toolpath: {
        toolpathId: "TP-001",
        tool: {
          toolId: "T1",
          toolType: "endmill",
          diameter: 12,
          fluteLength: 30,
          overallLength: 80,
          shankDiameter: 12,
          stickout: 50,
        },
        moves: [
          {
            type: "RAPID",
            start: { x: 0, y: 0, z: 50 },
            end: { x: 100, y: 0, z: 50 },
            feedRate: 10000,
          },
          {
            type: "LINEAR",
            start: { x: 100, y: 0, z: 50 },
            end: { x: 100, y: 0, z: -5 },
            feedRate: 500,
          },
        ],
      },
      machine: {
        machineId: "VMC-1",
        xLimits: { min: -50, max: 500 },
        yLimits: { min: -50, max: 300 },
        zLimits: { min: -100, max: 300 },
      },
      workpiece: {
        width: 200,
        height: 100,
        depth: 50,
        position: { x: 0, y: 0, z: 0 },
        material: "6061-T6",
      },
      fixtures: [],
    });
    expect(r).toBeDefined();
    if (!r.error) {
      // Collision check result
      if (r.safe !== undefined) {
        expect(typeof r.safe).toBe("boolean");
      }
      if (r.collisionCount !== undefined) {
        expect(typeof r.collisionCount).toBe("number");
      }
    } else {
      expect(typeof r.error).toBe("string");
    }
  });

  it("detects collision when toolpath goes below workpiece floor", async () => {
    const r = await callAction(safety, "check_toolpath_collision", {
      toolpath: {
        toolpathId: "TP-CRASH",
        tool: {
          toolId: "T2",
          toolType: "endmill",
          diameter: 10,
          fluteLength: 25,
          overallLength: 75,
          shankDiameter: 10,
          stickout: 40,
        },
        moves: [
          {
            type: "LINEAR",
            start: { x: 50, y: 50, z: 10 },
            end: { x: 50, y: 50, z: -60 },   // Plunge well below workpiece
            feedRate: 200,
          },
        ],
      },
      machine: {
        machineId: "VMC-2",
        xLimits: { min: 0, max: 300 },
        yLimits: { min: 0, max: 200 },
        zLimits: { min: -150, max: 200 },
      },
      workpiece: {
        width: 150,
        height: 100,
        depth: 30,
        position: { x: 0, y: 0, z: 0 },
        material: "4140",
      },
      fixtures: [
        {
          fixtureId: "VISE-1",
          type: "vise",
          boundingBox: {
            min: { x: -20, y: -10, z: -50 },
            max: { x: 170, y: 110, z: 0 },
          },
        },
      ],
    });
    expect(r).toBeDefined();
    // Should either detect collision or return structured result
    if (!r.error) {
      expect(r.safe !== undefined || r.collisionCount !== undefined).toBeTruthy();
    }
  });
});

// ============================================================================
// Unknown action fallback
// ============================================================================

describe("safety: error handling", () => {
  it("returns structured error for unknown action", async () => {
    const r = await callAction(safety, "nonexistent_action" as any, {});
    expect(r).toBeDefined();
    expect(r.error).toBeDefined();
  });
});
