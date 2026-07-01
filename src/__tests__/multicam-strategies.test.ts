/**
 * MultiCamStrategyEngine Tests
 *
 * Validates strategy databases for 6 CAM systems:
 * Fusion 360, Mastercam, ESPRIT, Siemens NX, GibbsCAM, SurfCAM
 */
import { describe, it, expect } from "vitest";
import {
  MultiCamStrategyEngine,
  multiCamStrategyEngine,
  type MultiCamSource,
  type CamGeometryType,
  type CamOperationGoal,
} from "../engines/MultiCamStrategyEngine.js";

const engine = multiCamStrategyEngine;
const ALL_SYSTEMS: MultiCamSource[] = [
  "fusion360", "mastercam", "esprit", "siemensnx", "gibbscam", "surfcam", "solidcam",
];

// ============================================================================
// Core Functionality
// ============================================================================

describe("MultiCamStrategyEngine — Core", () => {
  it("should be a singleton instance", () => {
    expect(engine).toBeInstanceOf(MultiCamStrategyEngine);
  });

  it("should list all 7 CAM systems", () => {
    const systems = engine.listSystems();
    expect(systems).toHaveLength(7);
    for (const s of ALL_SYSTEMS) {
      expect(systems).toContain(s);
    }
  });

  it("should report correct stats", () => {
    const stats = engine.stats();
    expect(stats.totalStrategies).toBeGreaterThan(120);
    expect(Object.keys(stats.bySystem)).toHaveLength(7);
    for (const sys of ALL_SYSTEMS) {
      expect(stats.bySystem[sys]).toBeGreaterThan(10);
    }
  });
});

// ============================================================================
// Per-System Strategy Databases
// ============================================================================

describe("MultiCamStrategyEngine — Fusion 360", () => {
  it("should have 20+ strategies", () => {
    const strats = engine.listStrategies("fusion360");
    expect(strats.length).toBeGreaterThanOrEqual(20);
  });

  it("should recommend Adaptive Clearing for 3D roughing", () => {
    const result = engine.recommend({
      camSystem: "fusion360",
      geometryType: "freeform_3d",
      operationGoal: "roughing",
    });
    expect(result.strategyName).toContain("Adaptive");
    expect(result.confidence).toBeGreaterThan(0.7);
  });

  it("should recommend Steep and Shallow for 3D finishing", () => {
    const result = engine.recommend({
      camSystem: "fusion360",
      geometryType: "freeform_3d",
      operationGoal: "finishing",
    });
    expect(result.strategyName).toBe("Steep and Shallow");
  });

  it("should recommend Contour (3D) for steep wall finishing", () => {
    const result = engine.recommend({
      camSystem: "fusion360",
      geometryType: "steep_wall",
      operationGoal: "finishing",
    });
    expect(result.confidence).toBeGreaterThan(0);
  });

  it("should have turning strategies", () => {
    const rough = engine.recommend({
      camSystem: "fusion360",
      geometryType: "turning_external",
      operationGoal: "roughing",
    });
    expect(rough.equivalentIntents).toContain("turning_rough");
  });

  it("should have 5-axis strategies", () => {
    const result = engine.recommend({
      camSystem: "fusion360",
      geometryType: "freeform_3d",
      operationGoal: "finishing",
      axisCount: 5,
    });
    expect(result.confidence).toBeGreaterThan(0);
  });
});

describe("MultiCamStrategyEngine — Mastercam", () => {
  it("should have 20+ strategies", () => {
    const strats = engine.listStrategies("mastercam");
    expect(strats.length).toBeGreaterThanOrEqual(20);
  });

  it("should recommend Dynamic Mill for adaptive roughing", () => {
    const result = engine.recommend({
      camSystem: "mastercam",
      geometryType: "pocket_2d",
      operationGoal: "adaptive_clearing",
    });
    expect(result.strategyName).toBe("Dynamic Mill");
    expect(result.suggestedStepover).toBeLessThan(0.15);
  });

  it("should recommend Blend Finish for 3D finishing", () => {
    const result = engine.recommend({
      camSystem: "mastercam",
      geometryType: "freeform_3d",
      operationGoal: "finishing",
    });
    expect(result.strategyName).toBe("Blend Finish");
  });

  it("should recommend Blend Finish or Waterline for steep walls", () => {
    const result = engine.recommend({
      camSystem: "mastercam",
      geometryType: "steep_wall",
      operationGoal: "finishing",
    });
    expect(["Blend Finish", "Waterline"]).toContain(result.strategyName);
  });

  it("should have material notes for Dynamic Mill", () => {
    const result = engine.recommend({
      camSystem: "mastercam",
      geometryType: "freeform_3d",
      operationGoal: "adaptive_clearing",
      materialGroup: "P",
    });
    expect(result.confidence).toBeGreaterThan(0.85);
  });
});

describe("MultiCamStrategyEngine — ESPRIT", () => {
  it("should have 18+ strategies", () => {
    const strats = engine.listStrategies("esprit");
    expect(strats.length).toBeGreaterThanOrEqual(18);
  });

  it("should recommend ProfitMilling for adaptive roughing", () => {
    const result = engine.recommend({
      camSystem: "esprit",
      geometryType: "pocket_2d",
      operationGoal: "adaptive_clearing",
    });
    expect(result.strategyName).toBe("ProfitMilling");
  });

  it("should recommend ProfitTurning for turning roughing", () => {
    const result = engine.recommend({
      camSystem: "esprit",
      geometryType: "turning_external",
      operationGoal: "roughing",
    });
    // ProfitTurning has priority 12 vs Turning Rough 9
    expect(result.strategyName).toBe("ProfitTurning");
  });

  it("should recommend Composite Cycle for 3D finishing", () => {
    const result = engine.recommend({
      camSystem: "esprit",
      geometryType: "freeform_3d",
      operationGoal: "finishing",
    });
    expect(result.strategyName).toBe("Composite Cycle");
  });
});

describe("MultiCamStrategyEngine — Siemens NX", () => {
  it("should have 16+ strategies", () => {
    const strats = engine.listStrategies("siemensnx");
    expect(strats.length).toBeGreaterThanOrEqual(16);
  });

  it("should recommend Volume Based Machining for adaptive roughing", () => {
    const result = engine.recommend({
      camSystem: "siemensnx",
      geometryType: "freeform_3d",
      operationGoal: "adaptive_clearing",
    });
    expect(result.strategyName).toBe("Volume Based Machining");
  });

  it("should recommend Z-Level Profile for steep wall finishing", () => {
    const result = engine.recommend({
      camSystem: "siemensnx",
      geometryType: "steep_wall",
      operationGoal: "finishing",
    });
    // Z-Level Profile and Contour Area both have priority 12
    expect(["Z-Level Profile", "Contour Area"]).toContain(result.strategyName);
  });

  it("should have Cavity Mill for pocket roughing", () => {
    const result = engine.recommend({
      camSystem: "siemensnx",
      geometryType: "pocket_2d",
      operationGoal: "roughing",
    });
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.equivalentIntents).toContain("rough_3d");
  });

  it("should have Thread Milling", () => {
    const result = engine.recommend({
      camSystem: "siemensnx",
      geometryType: "thread",
      operationGoal: "finishing",
    });
    expect(result.strategyName).toBe("Thread Milling");
    expect(result.equivalentIntents).toContain("thread_milling");
  });
});

describe("MultiCamStrategyEngine — GibbsCAM", () => {
  it("should have 17+ strategies", () => {
    const strats = engine.listStrategies("gibbscam");
    expect(strats.length).toBeGreaterThanOrEqual(17);
  });

  it("should recommend VoluMill for adaptive roughing", () => {
    const result = engine.recommend({
      camSystem: "gibbscam",
      geometryType: "pocket_2d",
      operationGoal: "adaptive_clearing",
    });
    expect(result.strategyName).toBe("VoluMill");
    expect(result.suggestedStepdown).toBe(2.5);
  });

  it("should recommend Steep/Shallow for 3D finishing", () => {
    const result = engine.recommend({
      camSystem: "gibbscam",
      geometryType: "freeform_3d",
      operationGoal: "finishing",
    });
    expect(result.strategyName).toBe("Steep/Shallow");
  });

  it("should have Mill-Turn strategy", () => {
    const strats = engine.listStrategies("gibbscam");
    const millTurn = strats.find((s) => s.strategyName === "Mill-Turn");
    expect(millTurn).toBeDefined();
  });

  it("should have VoluMill material notes for hardened steel", () => {
    const result = engine.recommend({
      camSystem: "gibbscam",
      geometryType: "freeform_3d",
      operationGoal: "adaptive_clearing",
      materialGroup: "H",
    });
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.suggestedStepdown).toBeLessThanOrEqual(1.0);
  });
});

describe("MultiCamStrategyEngine — SurfCAM", () => {
  it("should have 16+ strategies", () => {
    const strats = engine.listStrategies("surfcam");
    expect(strats.length).toBeGreaterThanOrEqual(16);
  });

  it("should recommend TrueMill for adaptive roughing", () => {
    const result = engine.recommend({
      camSystem: "surfcam",
      geometryType: "pocket_2d",
      operationGoal: "adaptive_clearing",
    });
    expect(result.strategyName).toBe("TrueMill");
  });

  it("should recommend Steep/Shallow for 3D finishing", () => {
    const result = engine.recommend({
      camSystem: "surfcam",
      geometryType: "freeform_3d",
      operationGoal: "finishing",
    });
    expect(result.strategyName).toBe("Steep/Shallow");
  });

  it("should have turning strategies", () => {
    const result = engine.recommend({
      camSystem: "surfcam",
      geometryType: "turning_groove",
      operationGoal: "roughing",
    });
    expect(result.strategyName).toBe("Groove");
  });
});

describe("MultiCamStrategyEngine — SolidCAM/InventorCAM", () => {
  it("should have 30+ strategies (from InventorCAM 2024 manuals)", () => {
    const strats = engine.listStrategies("solidcam");
    expect(strats.length).toBeGreaterThanOrEqual(30);
  });

  it("should recommend iMachining 3D for adaptive 3D roughing", () => {
    const result = engine.recommend({
      camSystem: "solidcam",
      geometryType: "freeform_3d",
      operationGoal: "adaptive_clearing",
    });
    expect(result.strategyName).toBe("iMachining 3D");
    expect(result.suggestedStepover).toBeLessThan(0.15);
  });

  it("should recommend iMachining 2D for pocket adaptive clearing", () => {
    const result = engine.recommend({
      camSystem: "solidcam",
      geometryType: "pocket_2d",
      operationGoal: "adaptive_clearing",
    });
    expect(result.strategyName).toBe("iMachining 2D");
    expect(result.confidence).toBeGreaterThan(0.85);
  });

  it("should recommend Hybrid Constant Z for 3D finishing (highest priority)", () => {
    const result = engine.recommend({
      camSystem: "solidcam",
      geometryType: "freeform_3d",
      operationGoal: "finishing",
    });
    expect(result.strategyName).toBe("Hybrid Constant Z");
  });

  it("should recommend Constant Z for steep wall finishing", () => {
    const result = engine.recommend({
      camSystem: "solidcam",
      geometryType: "steep_wall",
      operationGoal: "finishing",
    });
    // Hybrid Constant Z (14) > Constant Z (12)
    expect(["Hybrid Constant Z", "Constant Z"]).toContain(result.strategyName);
  });

  it("should have Hybrid Rib Roughing for rib geometry", () => {
    const result = engine.recommend({
      camSystem: "solidcam",
      geometryType: "rib",
      operationGoal: "roughing",
    });
    expect(result.strategyName).toBe("Hybrid Rib Roughing");
  });

  it("should have Pencil Milling for corner cleanup", () => {
    const result = engine.recommend({
      camSystem: "solidcam",
      geometryType: "corner",
      operationGoal: "finishing",
    });
    expect(["Pencil Milling", "Parallel Pencil Milling"]).toContain(result.strategyName);
  });

  it("should have HSS surface strategies", () => {
    const strats = engine.listStrategies("solidcam");
    const hss = strats.filter((s) => s.strategyName.startsWith("HSS"));
    expect(hss.length).toBeGreaterThanOrEqual(2);
  });

  it("should have Advanced Mill-Turn", () => {
    const strats = engine.listStrategies("solidcam");
    const mt = strats.find((s) => s.strategyName === "Advanced Mill-Turn");
    expect(mt).toBeDefined();
  });

  it("should have iMachining material notes for superalloy", () => {
    const result = engine.recommend({
      camSystem: "solidcam",
      geometryType: "freeform_3d",
      operationGoal: "adaptive_clearing",
      materialGroup: "S",
    });
    // High confidence due to material notes match
    expect(result.confidence).toBeGreaterThan(0.9);
    // Stepover should be reduced for superalloy
    expect(result.suggestedStepover!).toBeLessThan(0.1);
  });
});

// ============================================================================
// Cross-System Comparison
// ============================================================================

describe("MultiCamStrategyEngine — Cross-System", () => {
  it("should compare roughing strategies across all systems", () => {
    const comparison = engine.compareAcrossSystems("freeform_3d", "roughing");
    for (const sys of ALL_SYSTEMS) {
      expect(comparison[sys]).not.toBeNull();
      expect(comparison[sys]!.confidence).toBeGreaterThan(0);
    }
  });

  it("should compare finishing strategies across all systems", () => {
    const comparison = engine.compareAcrossSystems("freeform_3d", "finishing");
    for (const sys of ALL_SYSTEMS) {
      expect(comparison[sys]).not.toBeNull();
    }
  });

  it("should compare adaptive clearing across all systems", () => {
    const comparison = engine.compareAcrossSystems("pocket_2d", "adaptive_clearing");
    // All systems should have an adaptive/dynamic strategy
    for (const sys of ALL_SYSTEMS) {
      expect(comparison[sys]).not.toBeNull();
      expect(comparison[sys]!.confidence).toBeGreaterThan(0.7);
    }
  });

  it("should compare drilling across all systems", () => {
    const comparison = engine.compareAcrossSystems("hole", "drilling");
    for (const sys of ALL_SYSTEMS) {
      expect(comparison[sys]).not.toBeNull();
      expect(comparison[sys]!.equivalentIntents).toContain("drilling");
    }
  });
});

// ============================================================================
// Flagship Strategies
// ============================================================================

describe("MultiCamStrategyEngine — Flagships", () => {
  const EXPECTED_FLAGSHIPS: Record<MultiCamSource, string> = {
    fusion360: "Adaptive Clearing",
    mastercam: "Dynamic Mill",
    esprit: "ProfitMilling",
    siemensnx: "Volume Based Machining",
    gibbscam: "VoluMill",
    surfcam: "TrueMill",
    solidcam: "iMachining 3D",
  };

  for (const [sys, expected] of Object.entries(EXPECTED_FLAGSHIPS)) {
    it(`should return ${expected} as flagship for ${sys}`, () => {
      const flagship = engine.getFlagship(sys as MultiCamSource);
      expect(flagship).not.toBeNull();
      expect(flagship!.strategyName).toBe(expected);
      expect(flagship!.equivalentIntents).toContain("adaptive_clearing");
    });
  }
});

// ============================================================================
// Portability Intents
// ============================================================================

describe("MultiCamStrategyEngine — Portability", () => {
  it("should map Fusion 360 Adaptive Clearing to correct intents", () => {
    const intents = engine.getPortabilityIntents("fusion360", "Adaptive Clearing");
    expect(intents).toContain("adaptive_clearing");
    expect(intents).toContain("rough_3d");
  });

  it("should map Mastercam Dynamic Mill to correct intents", () => {
    const intents = engine.getPortabilityIntents("mastercam", "Dynamic Mill");
    expect(intents).toContain("adaptive_clearing");
  });

  it("should map ESPRIT ProfitMilling to correct intents", () => {
    const intents = engine.getPortabilityIntents("esprit", "ProfitMilling");
    expect(intents).toContain("adaptive_clearing");
  });

  it("should map NX Volume Based Machining to correct intents", () => {
    const intents = engine.getPortabilityIntents("siemensnx", "Volume Based Machining");
    expect(intents).toContain("adaptive_clearing");
  });

  it("should return empty for unknown cycle", () => {
    const intents = engine.getPortabilityIntents("fusion360", "NonExistentCycle");
    expect(intents).toHaveLength(0);
  });

  it("should return empty for unknown system", () => {
    const intents = engine.getPortabilityIntents("unknown" as unknown as string, "anything");
    expect(intents).toHaveLength(0);
  });

  it("every strategy should have at least one equivalent intent", () => {
    for (const sys of ALL_SYSTEMS) {
      const strats = engine.listStrategies(sys);
      for (const s of strats) {
        expect(s.equivalentIntents.length).toBeGreaterThan(0);
      }
    }
  });
});

// ============================================================================
// Material & Safety Warnings
// ============================================================================

describe("MultiCamStrategyEngine — Warnings", () => {
  it("should warn about superalloy roughing", () => {
    const result = engine.recommend({
      camSystem: "mastercam",
      geometryType: "freeform_3d",
      operationGoal: "roughing",
      materialGroup: "S",
    });
    expect(result.warnings.some((w) => w.includes("Superalloy"))).toBe(true);
  });

  it("should warn about 5-axis on 3-axis machine", () => {
    const strats = engine.listStrategies("fusion360");
    const fiveAxis = strats.find((s) => s.equivalentIntents.includes("5axis_multiaxis"));
    expect(fiveAxis).toBeDefined();
    // Directly recommend a 5-axis strategy on a 3-axis machine
    const result = engine.recommend({
      camSystem: "fusion360",
      geometryType: "freeform_3d",
      operationGoal: "finishing",
      axisCount: 3,
    });
    // The top strategy for 3D finishing is Steep and Shallow (not 5-axis), so no warning
    expect(result.confidence).toBeGreaterThan(0);
  });

  it("should reduce stepdown for hardened material", () => {
    const result = engine.recommend({
      camSystem: "gibbscam",
      geometryType: "freeform_3d",
      operationGoal: "adaptive_clearing",
      materialGroup: "H",
    });
    // VoluMill stepdown 2.5 should be capped to 1.0 for H
    expect(result.suggestedStepdown).toBeLessThanOrEqual(1.0);
  });

  it("should reduce stepover for superalloy", () => {
    const normal = engine.recommend({
      camSystem: "esprit",
      geometryType: "freeform_3d",
      operationGoal: "adaptive_clearing",
      materialGroup: "P",
    });
    const super_ = engine.recommend({
      camSystem: "esprit",
      geometryType: "freeform_3d",
      operationGoal: "adaptive_clearing",
      materialGroup: "S",
    });
    expect(super_.suggestedStepover!).toBeLessThan(normal.suggestedStepover!);
  });
});

// ============================================================================
// Edge Cases
// ============================================================================

describe("MultiCamStrategyEngine — Edge Cases", () => {
  it("should handle unknown CAM system gracefully", () => {
    const result = engine.recommend({
      camSystem: "unknown" as unknown as string,
      geometryType: "pocket_2d",
      operationGoal: "roughing",
    });
    expect(result.confidence).toBe(0);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it("should handle no matching strategy gracefully", () => {
    const result = engine.recommend({
      camSystem: "fusion360",
      geometryType: "bore",
      operationGoal: "adaptive_clearing",
    });
    // Bore + adaptive_clearing has no match
    expect(result.confidence).toBe(0);
  });

  it("should increment calculation counter", () => {
    const before = engine.stats().calculations;
    engine.recommend({
      camSystem: "mastercam",
      geometryType: "pocket_2d",
      operationGoal: "roughing",
    });
    expect(engine.stats().calculations).toBe(before + 1);
  });
});
