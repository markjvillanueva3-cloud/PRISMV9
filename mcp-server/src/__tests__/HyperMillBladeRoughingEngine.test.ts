/**
 * HyperMillBladeRoughingEngine.test.ts
 *
 * Coverage for HM-REV-MS4 / U-HMR22 blade roughing wiring.
 * Validates entry strategy, approach angles, level generation, rest material
 * detection, channel-width gate, and cycle-code routing.
 *
 * CAM-EXHAUST-MS0 / U-CAM-HM-BLADE-TESTS-01
 */

import { describe, it, expect } from "vitest";
import {
  HyperMillBladeRoughingEngine,
  hyperMillBladeRoughingEngine,
  type BladeRoughingInput,
} from "../engines/HyperMillBladeRoughingEngine.js";

const ENGINE = new HyperMillBladeRoughingEngine();

const APPROACH_ANGLE_BLADE_DEG = 5;
const APPROACH_ANGLE_IMPELLER_DEG = 5;
const APPROACH_ANGLE_BLISK_DEG = 15;
const AP_AUTO_CAP_MM = 3.0;
const AP_DIAMETER_RATIO = 0.8;
const MAX_LEVELS = 50;
const CONFIDENCE_CLEAN = 0.92;
const CONFIDENCE_WARNED = 0.78;
const CHANNEL_TIGHT_RATIO = 0.10;
const DEEP_CHANNEL_RATIO = 3;
const WRAP_CLOSED_THRESHOLD_DEG = 120;
const HUB_SHROUD_CLOSED_THRESHOLD = 0.35;

function input(over: Partial<BladeRoughingInput>): BladeRoughingInput {
  return {
    geometryType: over.geometryType ?? "blade",
    channelType: over.channelType ?? "open",
    isoGroup: over.isoGroup,
    toolDiameterMm: over.toolDiameterMm ?? 10,
    channelDepthMm: over.channelDepthMm ?? 20,
    channelWidthMm: over.channelWidthMm ?? 20,
    levelCount: over.levelCount,
    needsRestMaterial: over.needsRestMaterial,
    ap_per_level_mm: over.ap_per_level_mm,
  };
}

describe("HyperMillBladeRoughingEngine — entry strategy by channel type", () => {
  it("open channel → radial_conventional, radialApproachAllowed=true", () => {
    const r = ENGINE.calculate(input({ channelType: "open" }));
    expect(r.entryStrategy).toBe("radial_conventional");
    expect(r.radialApproachAllowed).toBe(true);
  });

  it("closed channel → plunge_helical, radialApproachAllowed=false", () => {
    const r = ENGINE.calculate(input({ channelType: "closed" }));
    expect(r.entryStrategy).toBe("plunge_helical");
    expect(r.radialApproachAllowed).toBe(false);
  });

  it("closed channel emits warning about radial impossibility", () => {
    const r = ENGINE.calculate(input({ channelType: "closed" }));
    expect(r.warnings.some(w => w.includes("Closed channel"))).toBe(true);
    expect(r.warnings.some(w => w.includes("plunge/helical"))).toBe(true);
  });

  it("open channel does not emit closed-channel warning", () => {
    const r = ENGINE.calculate(input({ channelType: "open" }));
    expect(r.warnings.some(w => w.includes("Closed channel"))).toBe(false);
  });
});

describe("HyperMillBladeRoughingEngine — approach angles by geometry", () => {
  it("blade → 5° approach (shallow)", () => {
    const r = ENGINE.calculate(input({ geometryType: "blade" }));
    expect(r.approachAngle_deg).toBe(APPROACH_ANGLE_BLADE_DEG);
  });

  it("impeller → 5° approach (shroud separate from disk)", () => {
    const r = ENGINE.calculate(input({ geometryType: "impeller" }));
    expect(r.approachAngle_deg).toBe(APPROACH_ANGLE_IMPELLER_DEG);
  });

  it("blisk → 15° approach (integral disk requires steeper entry)", () => {
    const r = ENGINE.calculate(input({ geometryType: "blisk" }));
    expect(r.approachAngle_deg).toBe(APPROACH_ANGLE_BLISK_DEG);
  });

  it("blisk emits warning about integral disk + shorter tool reach", () => {
    const r = ENGINE.calculate(input({ geometryType: "blisk" }));
    expect(r.warnings.some(w => w.includes("Blisk"))).toBe(true);
    expect(r.warnings.some(w => w.includes("integral"))).toBe(true);
  });

  it("non-blisk geometries do not emit blisk warning", () => {
    const r = ENGINE.calculate(input({ geometryType: "blade" }));
    expect(r.warnings.some(w => w.includes("Blisk"))).toBe(false);
  });
});

describe("HyperMillBladeRoughingEngine — axial depth per level", () => {
  it("ap_auto = 0.8 × toolDiameter, capped at 3.0mm", () => {
    // D=10 → 0.8×10 = 8 → cap 3.0
    const r = ENGINE.calculate(input({ toolDiameterMm: 10 }));
    expect(r.ap_per_level_mm).toBe(AP_AUTO_CAP_MM);
  });

  it("ap_auto for small tool (D=2) = 0.8 × 2 = 1.6 (under cap)", () => {
    const r = ENGINE.calculate(input({ toolDiameterMm: 2 }));
    expect(r.ap_per_level_mm).toBeCloseTo(2 * AP_DIAMETER_RATIO, 2);
  });

  it("explicit ap_per_level_mm overrides auto calculation", () => {
    const r = ENGINE.calculate(input({ toolDiameterMm: 10, ap_per_level_mm: 1.5 }));
    expect(r.ap_per_level_mm).toBe(1.5);
  });
});

describe("HyperMillBladeRoughingEngine — level generation", () => {
  it("level count = ceil(channelDepth / ap_per_level)", () => {
    // depth=10, ap=2 → 5 levels
    const r = ENGINE.calculate(input({
      channelDepthMm: 10, ap_per_level_mm: 2,
    }));
    expect(r.levelCount).toBe(5);
    expect(r.levels.length).toBe(5);
  });

  it("explicit levelCount overrides computed count", () => {
    const r = ENGINE.calculate(input({
      channelDepthMm: 10, ap_per_level_mm: 2, levelCount: 3,
    }));
    expect(r.levelCount).toBe(3);
  });

  it("level count capped at MAX_LEVELS (50)", () => {
    // tiny ap with deep channel would naturally exceed 50 levels
    const r = ENGINE.calculate(input({
      channelDepthMm: 100, ap_per_level_mm: 0.5, // raw=200, must clamp
    }));
    expect(r.levelCount).toBeLessThanOrEqual(MAX_LEVELS);
    expect(r.levelCount).toBe(MAX_LEVELS);
  });

  it("level depths are monotonically increasing", () => {
    const r = ENGINE.calculate(input({
      channelDepthMm: 12, ap_per_level_mm: 3,
    }));
    for (let i = 1; i < r.levels.length; i++) {
      expect(r.levels[i].depthFromTop_mm).toBeGreaterThan(r.levels[i - 1].depthFromTop_mm);
    }
  });

  it("first level entry strategy matches selected entryStrategy", () => {
    const r = ENGINE.calculate(input({
      channelType: "closed", channelDepthMm: 10, ap_per_level_mm: 2,
    }));
    expect(r.levels[0].entryStrategy).toBe("plunge_helical");
  });

  it("closed channel: ALL levels use plunge_helical (no side entry permitted)", () => {
    const r = ENGINE.calculate(input({
      channelType: "closed", channelDepthMm: 10, ap_per_level_mm: 2,
    }));
    expect(r.levels.every(l => l.entryStrategy === "plunge_helical")).toBe(true);
  });

  it("open channel: subsequent levels can use radial_conventional", () => {
    const r = ENGINE.calculate(input({
      channelType: "open", channelDepthMm: 10, ap_per_level_mm: 2,
    }));
    // First level uses radial_conventional (entry strategy), then subsequent levels also use it
    expect(r.levels.every(l => l.entryStrategy === "radial_conventional")).toBe(true);
  });
});

describe("HyperMillBladeRoughingEngine — rest material zones", () => {
  it("needsRestMaterial=true always emits blade_root_fillet zone", () => {
    const r = ENGINE.calculate(input({ needsRestMaterial: true }));
    expect(r.restMaterialZones.some(z => z.location === "blade_root_fillet")).toBe(true);
  });

  it("needsRestMaterial=false yields no zones", () => {
    const r = ENGINE.calculate(input({ needsRestMaterial: false }));
    expect(r.restMaterialZones.length).toBe(0);
  });

  it("blade_root_fillet width = 0.3 × toolDiameter", () => {
    const r = ENGINE.calculate(input({ toolDiameterMm: 10 }));
    const fillet = r.restMaterialZones.find(z => z.location === "blade_root_fillet")!;
    expect(fillet.estimatedWidth_mm).toBeCloseTo(3.0, 4);
  });

  it("closed channel adds leading_edge_corner + trailing_edge_corner zones", () => {
    const r = ENGINE.calculate(input({
      channelType: "closed", needsRestMaterial: true,
    }));
    expect(r.restMaterialZones.some(z => z.location === "leading_edge_corner")).toBe(true);
    expect(r.restMaterialZones.some(z => z.location === "trailing_edge_corner")).toBe(true);
  });

  it("open channel does NOT add edge-corner zones", () => {
    const r = ENGINE.calculate(input({
      channelType: "open", needsRestMaterial: true,
    }));
    expect(r.restMaterialZones.some(z => z.location === "leading_edge_corner")).toBe(false);
  });

  it("deep channel (depth > 3×D) adds hub_junction_deep zone + warning", () => {
    const r = ENGINE.calculate(input({
      toolDiameterMm: 10, channelDepthMm: 35, // 3.5×D > 3×D
      ap_per_level_mm: 2.5, needsRestMaterial: true,
    }));
    expect(r.restMaterialZones.some(z => z.location === "hub_junction_deep")).toBe(true);
    expect(r.warnings.some(w => w.includes("Deep channel"))).toBe(true);
  });

  it("shallow channel (depth ≤ 3×D) does NOT add hub_junction_deep", () => {
    const r = ENGINE.calculate(input({
      toolDiameterMm: 10, channelDepthMm: 25, // 2.5×D < 3×D
      ap_per_level_mm: 2.5, needsRestMaterial: true,
    }));
    expect(r.restMaterialZones.some(z => z.location === "hub_junction_deep")).toBe(false);
  });

  it("requiresSmallTool=true on blade_root_fillet when toolDiameter > 6mm", () => {
    const r = ENGINE.calculate(input({ toolDiameterMm: 10 }));
    const fillet = r.restMaterialZones.find(z => z.location === "blade_root_fillet")!;
    expect(fillet.requiresSmallTool).toBe(true);
  });
});

describe("HyperMillBladeRoughingEngine — channel width clearance gate", () => {
  it("tight channel (clearance < 10% tool diameter) emits warning", () => {
    // D=10, channel=10.5 → clearance=0.5 → 5% of D < 10%
    const r = ENGINE.calculate(input({
      toolDiameterMm: 10, channelWidthMm: 10.5,
    }));
    expect(r.warnings.some(w => w.includes("Tight channel"))).toBe(true);
  });

  it("comfortable clearance does NOT emit tight-channel warning", () => {
    // D=10, channel=20 → clearance=10 → 100% of D
    const r = ENGINE.calculate(input({
      toolDiameterMm: 10, channelWidthMm: 20,
    }));
    expect(r.warnings.some(w => w.includes("Tight channel"))).toBe(false);
  });
});

describe("HyperMillBladeRoughingEngine — cycle code routing", () => {
  it("blade geometry → BrX5 cycle", () => {
    const r = ENGINE.calculate(input({ geometryType: "blade" }));
    expect(r.cycleCode).toBe("BrX5");
  });

  it("blisk geometry → BrX5 cycle (shares blade roughing)", () => {
    const r = ENGINE.calculate(input({ geometryType: "blisk" }));
    expect(r.cycleCode).toBe("BrX5");
  });

  it("impeller with D ≥ 8mm → ItmX5 (tangent for barrel tools)", () => {
    const r = ENGINE.calculate(input({ geometryType: "impeller", toolDiameterMm: 12 }));
    expect(r.cycleCode).toBe("ItmX5");
  });

  it("impeller with D < 8mm → IrX5 (standard impeller roughing)", () => {
    const r = ENGINE.calculate(input({ geometryType: "impeller", toolDiameterMm: 6 }));
    expect(r.cycleCode).toBe("IrX5");
  });
});

describe("HyperMillBladeRoughingEngine — confidence + source", () => {
  it("clean run (no warnings) → 0.92 confidence", () => {
    const r = ENGINE.calculate(input({
      geometryType: "blade", channelType: "open",
      toolDiameterMm: 6, channelDepthMm: 12, channelWidthMm: 18,
      needsRestMaterial: false,
    }));
    expect(r.warnings.length).toBe(0);
    expect(r.confidence).toBeCloseTo(CONFIDENCE_CLEAN, 2);
  });

  it("warned run (no DEFLECTION) → 0.78 confidence", () => {
    const r = ENGINE.calculate(input({
      geometryType: "blisk", // emits Blisk warning
      channelType: "open",
      toolDiameterMm: 6, channelDepthMm: 12, channelWidthMm: 18,
    }));
    expect(r.warnings.length).toBeGreaterThan(0);
    expect(r.confidence).toBeCloseTo(CONFIDENCE_WARNED, 2);
  });

  it("source attributes hyperMILL v33 blade module", () => {
    const r = ENGINE.calculate(input({}));
    expect(r.source.includes("hypermill-v33")).toBe(true);
    expect(r.source.includes("blade-module")).toBe(true);
  });
});

describe("HyperMillBladeRoughingEngine — classifyChannel standalone", () => {
  it("wrap angle > 120° → closed channel", () => {
    const r = ENGINE.classifyChannel(0.5, 130);
    expect(r.channelType).toBe("closed");
    expect(r.reason.includes("wrap angle")).toBe(true);
  });

  it("hub/shroud ratio < 0.35 → closed channel (deep)", () => {
    const r = ENGINE.classifyChannel(0.30, 90);
    expect(r.channelType).toBe("closed");
    expect(r.reason.includes("Hub/shroud")).toBe(true);
  });

  it("normal geometry (wrap=90°, hub/shroud=0.5) → open channel", () => {
    const r = ENGINE.classifyChannel(0.5, 90);
    expect(r.channelType).toBe("open");
  });

  it("threshold boundary: wrap=120 exactly → open (not > 120)", () => {
    const r = ENGINE.classifyChannel(0.5, WRAP_CLOSED_THRESHOLD_DEG);
    expect(r.channelType).toBe("open");
  });

  it("threshold boundary: hubShroud=0.35 exactly → open (not < 0.35)", () => {
    const r = ENGINE.classifyChannel(HUB_SHROUD_CLOSED_THRESHOLD, 90);
    expect(r.channelType).toBe("open");
  });
});

describe("HyperMillBladeRoughingEngine — singleton + dispatcher round-trip", () => {
  it("singleton produces identical entry + cycle as fresh instance", () => {
    const r1 = ENGINE.calculate(input({}));
    const r2 = hyperMillBladeRoughingEngine.calculate(input({}));
    expect(r2.entryStrategy).toBe(r1.entryStrategy);
    expect(r2.cycleCode).toBe(r1.cycleCode);
    expect(r2.confidence).toBe(r1.confidence);
  });

  it("dispatcher exposes cam_hypermill_blade_roughing action", async () => {
    const mod = await import("../tools/dispatchers/camDispatcher.js");
    expect(mod.ACTIONS).toContain("cam_hypermill_blade_roughing");
  });

  it("engine reachable via dynamic-import path used by dispatcher", async () => {
    const mod = await import("../engines/HyperMillBladeRoughingEngine.js");
    const r = mod.hyperMillBladeRoughingEngine.calculate(input({}));
    expect(r.cycleCode).toBe("BrX5");
  });
});
