/**
 * HyperMillGrindingBridge.test.ts
 *
 * Coverage for HM-REV-MS6 / U-HMR32 + U-HMR33 grinding routing + burn risk gate.
 */

import { describe, it, expect } from "vitest";
import {
  HyperMillGrindingBridge,
  hyperMillGrindingBridge,
  type GrindingRouteInput,
} from "../engines/HyperMillGrindingBridge.js";

const ENGINE = new HyperMillGrindingBridge();

const RA_GRINDING_THRESHOLD_UM = 0.4;
const TOLERANCE_GRINDING_THRESHOLD_MM = 0.010;
const HARDNESS_GRINDING_THRESHOLD_HRC = 55;
const WHEEL_LIFE_MIN_PCT = 20;
const HARDENED_STEEL_BURN_C = 540;
const STEEL_4140_BURN_C = 600;
const DEFAULT_BURN_C = 580;

function route(over: Partial<GrindingRouteInput>): GrindingRouteInput {
  return {
    featureName: over.featureName ?? "test_feature",
    material: over.material ?? "4140_steel",
    requiredRa_um: over.requiredRa_um ?? 1.6,
    tolerance_mm: over.tolerance_mm ?? 0.05,
    hardness_hrc: over.hardness_hrc ?? 30,
    featureType: over.featureType,
    partSize_mm: over.partSize_mm ?? 100,
    partWidth_mm: over.partWidth_mm,
    stock_mm: over.stock_mm,
    wheelSpec: over.wheelSpec,
    controller: over.controller,
    wheelDiameter_mm: over.wheelDiameter_mm,
    wheelWidth_mm: over.wheelWidth_mm,
    tableSpeed_mmmin: over.tableSpeed_mmmin,
    depthOfCut_mm: over.depthOfCut_mm,
    wheelLifeRemaining_pct: over.wheelLifeRemaining_pct,
    wheelAbrasive: over.wheelAbrasive,
  };
}

describe("HyperMillGrindingBridge — trigger 1: Ra below 0.4µm", () => {
  it("Ra = 0.2µm (< 0.4) triggers ra_too_tight + grindingRequired", () => {
    const r = ENGINE.calculate(route({ requiredRa_um: 0.2 }));
    expect(r.grindingRequired).toBe(true);
    expect(r.triggers).toContain("ra_too_tight");
  });

  it("Ra = 0.4µm (boundary, NOT <) does not trigger ra_too_tight", () => {
    const r = ENGINE.calculate(route({ requiredRa_um: RA_GRINDING_THRESHOLD_UM }));
    expect(r.triggers.includes("ra_too_tight")).toBe(false);
  });

  it("Ra = 1.6µm (loose) does not trigger ra_too_tight", () => {
    const r = ENGINE.calculate(route({ requiredRa_um: 1.6 }));
    expect(r.triggers.includes("ra_too_tight")).toBe(false);
  });
});

describe("HyperMillGrindingBridge — trigger 2: tolerance below 0.01mm", () => {
  it("tolerance = 0.005mm triggers tolerance_too_tight", () => {
    const r = ENGINE.calculate(route({ tolerance_mm: 0.005 }));
    expect(r.triggers).toContain("tolerance_too_tight");
    expect(r.grindingRequired).toBe(true);
  });

  it("tolerance = 0.010mm (boundary, NOT <) does not trigger", () => {
    const r = ENGINE.calculate(route({ tolerance_mm: TOLERANCE_GRINDING_THRESHOLD_MM }));
    expect(r.triggers.includes("tolerance_too_tight")).toBe(false);
  });
});

describe("HyperMillGrindingBridge — trigger 3: hardness above 55 HRC", () => {
  it("hardness = 60 HRC triggers hardness_exceeds_milling", () => {
    const r = ENGINE.calculate(route({ hardness_hrc: 60 }));
    expect(r.triggers).toContain("hardness_exceeds_milling");
    expect(r.grindingRequired).toBe(true);
  });

  it("hardness = 55 HRC (boundary, NOT >) does not trigger", () => {
    const r = ENGINE.calculate(route({ hardness_hrc: HARDNESS_GRINDING_THRESHOLD_HRC }));
    expect(r.triggers.includes("hardness_exceeds_milling")).toBe(false);
  });
});

describe("HyperMillGrindingBridge — trigger 4: bearing/cylindrical features", () => {
  it("bearing_bore feature type triggers bearing_bore_feature", () => {
    const r = ENGINE.calculate(route({ featureType: "bearing_bore" }));
    expect(r.triggers).toContain("bearing_bore_feature");
    expect(r.grindingType).toBe("cylindrical_grind");
  });

  it("cylindrical_id feature triggers bearing_bore_feature + cylindrical_grind type", () => {
    const r = ENGINE.calculate(route({ featureType: "cylindrical_id" }));
    expect(r.triggers).toContain("bearing_bore_feature");
    expect(r.grindingType).toBe("cylindrical_grind");
  });

  it("flat_surface feature does NOT trigger bearing_bore", () => {
    const r = ENGINE.calculate(route({ featureType: "flat_surface" }));
    expect(r.triggers.includes("bearing_bore_feature")).toBe(false);
  });

  it("bar feature routes to centerless grinding when triggered", () => {
    const r = ENGINE.calculate(route({ featureType: "bar", requiredRa_um: 0.2 }));
    expect(r.grindingType).toBe("centerless");
  });

  it("profile feature routes to creep_feed grinding when triggered", () => {
    const r = ENGINE.calculate(route({ featureType: "profile", requiredRa_um: 0.2 }));
    expect(r.grindingType).toBe("creep_feed");
  });
});

describe("HyperMillGrindingBridge — no triggers (milling sufficient)", () => {
  it("loose Ra + tolerance + soft material + flat = grindingRequired=false", () => {
    const r = ENGINE.calculate(route({
      requiredRa_um: 1.6, tolerance_mm: 0.05, hardness_hrc: 30, featureType: "flat_surface",
    }));
    expect(r.grindingRequired).toBe(false);
    expect(r.triggers).toEqual([]);
    expect(r.grindingType).toBeNull();
    expect(r.justification).toContain("Milling sufficient");
  });

  it("no triggers → no grindingProgram returned (=== undefined)", () => {
    const r = ENGINE.calculate(route({ requiredRa_um: 3.2, tolerance_mm: 0.1 }));
    expect(r.grindingProgram === undefined).toBe(true);
  });
});

describe("HyperMillGrindingBridge — burn risk gate (specific energy + Jaeger temp)", () => {
  it("burn risk gate exposes 4140_steel threshold of 600°C and runs Jaeger temperature math", () => {
    const gate = ENGINE.runBurnRiskGate({
      material: "4140_steel", depthOfCut_mm: 0.005, tableSpeed_mmmin: 8000,
    });
    expect(gate.burnThreshold_C).toBe(STEEL_4140_BURN_C);
    expect(gate.specificEnergy_J_mm3).toBeGreaterThan(0);
    expect(gate.blocked).toBe(gate.burnRisk || !gate.wheelCompatible);
  });

  it("aggressive cut on inconel triggers burn risk block with explicit message", () => {
    const gate = ENGINE.runBurnRiskGate({
      material: "inconel", depthOfCut_mm: 0.5, tableSpeed_mmmin: 100,
    });
    expect(gate.burnRisk).toBe(true);
    expect(gate.blocked).toBe(true);
    expect(gate.message).toContain("BURN RISK BLOCK");
  });

  it("burn threshold for hardened_steel = 540°C", () => {
    const gate = ENGINE.runBurnRiskGate({
      material: "hardened_steel", depthOfCut_mm: 0.02,
    });
    expect(gate.burnThreshold_C).toBe(HARDENED_STEEL_BURN_C);
  });

  it("unknown material falls back to default burn threshold (580°C)", () => {
    const gate = ENGINE.runBurnRiskGate({
      material: "unobtainium_xyz", depthOfCut_mm: 0.02,
    });
    expect(gate.burnThreshold_C).toBe(DEFAULT_BURN_C);
  });

  it("specific energy increases with depth of cut (Malkin size effect)", () => {
    const shallow = ENGINE.runBurnRiskGate({ material: "4140_steel", depthOfCut_mm: 0.01 });
    const deep = ENGINE.runBurnRiskGate({ material: "4140_steel", depthOfCut_mm: 0.05 });
    expect(deep.specificEnergy_J_mm3).toBeGreaterThan(shallow.specificEnergy_J_mm3);
  });

  it("burn risk gate message always names the offending material when blocked", () => {
    const gate = ENGINE.runBurnRiskGate({
      material: "inconel", depthOfCut_mm: 0.5, tableSpeed_mmmin: 100,
    });
    expect(gate.blocked).toBe(true);
    expect(gate.message).toContain("inconel");
  });
});

describe("HyperMillGrindingBridge — wheel compatibility checks", () => {
  it("CBN wheel on hardened_steel is compatible (no wheel-incompat warning)", () => {
    const r = ENGINE.calculate(route({
      hardness_hrc: 60, material: "hardened_steel", wheelAbrasive: "CBN",
      requiredRa_um: 0.2, depthOfCut_mm: 0.005, tableSpeed_mmmin: 8000,
    }));
    expect(r.burnRiskGate.wheelCompatible).toBe(true);
  });

  it("aluminum_oxide (WA) on tungsten_carbide is incompatible → blocked", () => {
    const r = ENGINE.calculate(route({
      material: "tungsten_carbide", wheelAbrasive: "WA",
      requiredRa_um: 0.2,
    }));
    expect(r.burnRiskGate.wheelCompatible).toBe(false);
    expect(r.burnRiskGate.blocked).toBe(true);
    expect(r.warnings.some(w => w.includes("incompatible"))).toBe(true);
  });

  it("wheel abrasive omitted → wheelCompatible defaults to true (don't block on unknown)", () => {
    const gate = ENGINE.runBurnRiskGate({
      material: "4140_steel", depthOfCut_mm: 0.01,
    });
    expect(gate.wheelCompatible).toBe(true);
  });
});

describe("HyperMillGrindingBridge — wheel life check", () => {
  it("wheelLifeRemaining_pct = 10% (< 20) emits dress/replace warning", () => {
    const r = ENGINE.calculate(route({
      requiredRa_um: 0.2, wheelLifeRemaining_pct: 10, depthOfCut_mm: 0.005, tableSpeed_mmmin: 8000,
    }));
    expect(r.burnRiskGate.wheelLifeOk).toBe(false);
    expect(r.warnings.some(w => w.includes("dress or replace"))).toBe(true);
  });

  it("wheelLifeRemaining_pct = 20 (boundary, >=) is OK", () => {
    const gate = ENGINE.runBurnRiskGate({
      material: "4140_steel", depthOfCut_mm: 0.01, wheelLifeRemaining_pct: WHEEL_LIFE_MIN_PCT,
    });
    expect(gate.wheelLifeOk).toBe(true);
  });

  it("wheelLifeRemaining_pct omitted → defaults to OK", () => {
    const gate = ENGINE.runBurnRiskGate({ material: "4140_steel", depthOfCut_mm: 0.01 });
    expect(gate.wheelLifeOk).toBe(true);
  });
});

describe("HyperMillGrindingBridge — wheel spec recommendation", () => {
  it("hardened_steel recommends CBN-B126", () => {
    const r = ENGINE.calculate(route({ material: "hardened_steel", requiredRa_um: 0.2 }));
    expect(r.recommendedWheelSpec).toBe("CBN-B126");
  });

  it("aluminum recommends C46K8V (silicon carbide)", () => {
    const r = ENGINE.calculate(route({ material: "aluminum", requiredRa_um: 0.2 }));
    expect(r.recommendedWheelSpec).toBe("C46K8V");
  });

  it("explicit wheelSpec override is honored over default recommendation", () => {
    const r = ENGINE.calculate(route({
      material: "4140_steel", wheelSpec: "CUSTOM-XYZ", requiredRa_um: 0.2,
    }));
    expect(r.recommendedWheelSpec).toBe("CUSTOM-XYZ");
  });
});

describe("HyperMillGrindingBridge — singleton + dispatcher round-trip", () => {
  it("singleton produces identical result to fresh instance", () => {
    const r1 = ENGINE.calculate(route({ requiredRa_um: 0.2 }));
    const r2 = hyperMillGrindingBridge.calculate(route({ requiredRa_um: 0.2 }));
    expect(r2.grindingRequired).toBe(r1.grindingRequired);
    expect(r2.triggers).toEqual(r1.triggers);
  });

  it("dispatcher exposes cam_hypermill_grinding_route action", async () => {
    const mod = await import("../tools/dispatchers/camDispatcher.js");
    expect(mod.ACTIONS).toContain("cam_hypermill_grinding_route");
  });

  it("engine reachable via dynamic-import path returns route result", async () => {
    const mod = await import("../engines/HyperMillGrindingBridge.js");
    const r = mod.hyperMillGrindingBridge.calculate(route({ requiredRa_um: 0.2 }));
    expect(r.grindingRequired).toBe(true);
  });
});
