/**
 * HyperMillDentalBlankRouter.test.ts
 *
 * Coverage for HM-REV-MS7 / U-HMR42 dental blank → strategy routing.
 * Validates 4 strategy types, 6 dental materials, cycle generation,
 * sintering shrinkage compensation, hyperMILL settings, tooling/compliance
 * notes, surface-finish gating, and dispatcher round-trip via
 * cam_hypermill_dental_route.
 *
 * CAM-EXHAUST-MS0 / U-CAM-HM-DENTAL-TESTS-01
 */

import { describe, it, expect } from "vitest";
import {
  HyperMillDentalBlankRouter,
  hyperMillDentalBlankRouter,
  type DentalBlankRouterInput,
  type DentalMaterial,
  type DentalBlankType,
  type DentalRestorationCategory,
} from "../engines/HyperMillDentalBlankRouter.js";

const ENGINE = new HyperMillDentalBlankRouter();

const ZIRCONIA_GREEN_SHRINKAGE_PCT = 22.0;
const RA_POLISH_THRESHOLD_UM = 0.8;
const TOLERANCE_SINTERED_ZIRCONIA_MM = 0.005;
const TOLERANCE_METAL_MM = 0.008;
const TOLERANCE_DEFAULT_MM = 0.01;

function dentalInput(over: Partial<DentalBlankRouterInput> & {
  material: DentalMaterial;
  blankType: DentalBlankType;
  restorationCategory: DentalRestorationCategory;
}): DentalBlankRouterInput {
  return {
    blankType: over.blankType,
    material: over.material,
    restorationCategory: over.restorationCategory,
    zirconiaState: over.zirconiaState,
    millingUnit: over.millingUnit,
    requiredRa_um: over.requiredRa_um,
  };
}

// ── Strategy routing logic ───────────────────────────────────────────────────

describe("HyperMillDentalBlankRouter — strategy routing", () => {
  it("PMMA disc → 4axis_disc strategy", () => {
    const r = ENGINE.route(dentalInput({
      blankType: "disc", material: "pmma", restorationCategory: "single_unit",
    }));
    expect(r.strategyType).toBe("4axis_disc");
  });

  it("PMMA block → 3axis_block strategy", () => {
    const r = ENGINE.route(dentalInput({
      blankType: "block", material: "pmma", restorationCategory: "single_unit",
    }));
    expect(r.strategyType).toBe("3axis_block");
  });

  it("composite disc → 4axis_disc strategy (composite shares PMMA routing)", () => {
    const r = ENGINE.route(dentalInput({
      blankType: "disc", material: "composite", restorationCategory: "single_unit",
    }));
    expect(r.strategyType).toBe("4axis_disc");
  });

  it("zirconia disc always routes to 3plus2_aaxis even for single_unit", () => {
    const r = ENGINE.route(dentalInput({
      blankType: "disc", material: "zirconia", restorationCategory: "single_unit",
    }));
    expect(r.strategyType).toBe("3plus2_aaxis");
  });

  it("zirconia disc multi_unit bridge → 3plus2_aaxis", () => {
    const r = ENGINE.route(dentalInput({
      blankType: "disc", material: "zirconia", restorationCategory: "multi_unit",
    }));
    expect(r.strategyType).toBe("3plus2_aaxis");
  });

  it("zirconia block → 5axis_simultaneous strategy", () => {
    const r = ENGINE.route(dentalInput({
      blankType: "block", material: "zirconia", restorationCategory: "single_unit",
    }));
    expect(r.strategyType).toBe("5axis_simultaneous");
  });

  it("CoCr block (implant) → 5axis_simultaneous strategy", () => {
    const r = ENGINE.route(dentalInput({
      blankType: "block", material: "cocr", restorationCategory: "implant_prosthetic",
    }));
    expect(r.strategyType).toBe("5axis_simultaneous");
  });

  it("titanium puck → 5axis_simultaneous strategy", () => {
    const r = ENGINE.route(dentalInput({
      blankType: "puck", material: "titanium_gr5", restorationCategory: "implant_prosthetic",
    }));
    expect(r.strategyType).toBe("5axis_simultaneous");
  });
});

// ── Sintering shrinkage compensation ─────────────────────────────────────────

describe("HyperMillDentalBlankRouter — sintering shrinkage compensation", () => {
  it("zirconia GREEN state returns 22% shrinkage compensation", () => {
    const r = ENGINE.route(dentalInput({
      blankType: "disc", material: "zirconia", zirconiaState: "green",
      restorationCategory: "single_unit",
    }));
    expect(r.shrinkageCompensation_pct).toBe(ZIRCONIA_GREEN_SHRINKAGE_PCT);
  });

  it("zirconia SINTERED state returns null (no shrinkage compensation)", () => {
    const r = ENGINE.route(dentalInput({
      blankType: "disc", material: "zirconia", zirconiaState: "sintered",
      restorationCategory: "single_unit",
    }));
    expect(r.shrinkageCompensation_pct).toBeNull();
  });

  it("zirconia PRE_SINTERED state returns null (only green needs comp)", () => {
    const r = ENGINE.route(dentalInput({
      blankType: "disc", material: "zirconia", zirconiaState: "pre_sintered",
      restorationCategory: "single_unit",
    }));
    expect(r.shrinkageCompensation_pct).toBeNull();
  });

  it("non-zirconia materials return null shrinkage", () => {
    const materials: DentalMaterial[] = ["peek", "cocr", "titanium_gr5", "pmma", "composite"];
    for (const material of materials) {
      const r = ENGINE.route(dentalInput({
        blankType: "block", material, restorationCategory: "single_unit",
      }));
      expect(r.shrinkageCompensation_pct).toBeNull();
    }
  });

  it("zirconia green tooling note mentions the 22% compensation value", () => {
    const r = ENGINE.route(dentalInput({
      blankType: "disc", material: "zirconia", zirconiaState: "green",
      restorationCategory: "single_unit",
    }));
    const compNote = r.toolingNotes.find(n => n.includes("Compensate"));
    expect(compNote).toContain("22");
  });
});

// ── Cycle generation per strategy ────────────────────────────────────────────

describe("HyperMillDentalBlankRouter — cycle generation", () => {
  it("3plus2_aaxis returns 3 cycles (rough + equidistant + Z-level finish)", () => {
    const r = ENGINE.route(dentalInput({
      blankType: "disc", material: "zirconia", restorationCategory: "multi_unit",
    }));
    expect(r.cycles.length).toBe(3);
    expect(r.cycles[0].hyperMillCycle.includes("Roughing")).toBe(true);
    expect(r.cycles[1].hyperMillCycle.includes("Equidistant")).toBe(true);
    expect(r.cycles[2].hyperMillCycle.includes("Z-level Finishing")).toBe(true);
  });

  it("5axis_simultaneous returns 3 cycles (rough + equidistant + profile)", () => {
    const r = ENGINE.route(dentalInput({
      blankType: "block", material: "cocr", restorationCategory: "single_unit",
    }));
    expect(r.cycles.length).toBe(3);
    expect(r.cycles[2].hyperMillCycle.includes("Profile")).toBe(true);
  });

  it("3axis_block returns exactly 2 cycles (rough + equidistant)", () => {
    const r = ENGINE.route(dentalInput({
      blankType: "block", material: "pmma", restorationCategory: "single_unit",
    }));
    expect(r.cycles.length).toBe(2);
    expect(r.cycles[0].hyperMillCycle.includes("3D:Z-Level Roughing")).toBe(true);
  });

  it("4axis_disc returns exactly 2 cycles (indexed rough + indexed finish)", () => {
    const r = ENGINE.route(dentalInput({
      blankType: "disc", material: "pmma", restorationCategory: "single_unit",
    }));
    expect(r.cycles.length).toBe(2);
    expect(r.cycles[0].hyperMillCycle.includes("4-axis disc, indexed")).toBe(true);
  });

  it("zirconia GREEN cycle 0 spindle = 30000 RPM (high speed dry)", () => {
    const r = ENGINE.route(dentalInput({
      blankType: "disc", material: "zirconia", zirconiaState: "green",
      restorationCategory: "single_unit",
    }));
    expect(r.cycles[0].spindleRpm).toBe(30000);
  });

  it("zirconia SINTERED cycle 0 spindle = 10000 RPM (slow wet)", () => {
    const r = ENGINE.route(dentalInput({
      blankType: "disc", material: "zirconia", zirconiaState: "sintered",
      restorationCategory: "single_unit",
    }));
    expect(r.cycles[0].spindleRpm).toBe(10000);
  });

  it("PMMA cycle 0 spindle = 40000 RPM (very high speed)", () => {
    const r = ENGINE.route(dentalInput({
      blankType: "block", material: "pmma", restorationCategory: "single_unit",
    }));
    expect(r.cycles[0].spindleRpm).toBe(40000);
  });

  it("CoCr cycle 1 finish spindle = 25000 RPM", () => {
    const r = ENGINE.route(dentalInput({
      blankType: "block", material: "cocr", restorationCategory: "single_unit",
    }));
    expect(r.cycles[1].spindleRpm).toBe(25000);
  });

  it("titanium cycle 0 spindle = 25000 RPM (rough)", () => {
    const r = ENGINE.route(dentalInput({
      blankType: "block", material: "titanium_gr5", restorationCategory: "implant_prosthetic",
    }));
    expect(r.cycles[0].spindleRpm).toBe(25000);
  });
});

// ── Coolant routing per material ─────────────────────────────────────────────

describe("HyperMillDentalBlankRouter — coolant routing", () => {
  it("zirconia GREEN cycles use 'dry' coolant", () => {
    const r = ENGINE.route(dentalInput({
      blankType: "disc", material: "zirconia", zirconiaState: "green",
      restorationCategory: "single_unit",
    }));
    expect(r.cycles[0].coolant).toBe("dry");
  });

  it("zirconia SINTERED cycles use 'wet_through_spindle' coolant", () => {
    const r = ENGINE.route(dentalInput({
      blankType: "disc", material: "zirconia", zirconiaState: "sintered",
      restorationCategory: "single_unit",
    }));
    expect(r.cycles[0].coolant).toBe("wet_through_spindle");
  });

  it("CoCr cycles use 'wet_through_spindle' coolant", () => {
    const r = ENGINE.route(dentalInput({
      blankType: "block", material: "cocr", restorationCategory: "single_unit",
    }));
    expect(r.cycles[0].coolant).toBe("wet_through_spindle");
  });

  it("titanium cycles use 'wet_through_spindle' coolant", () => {
    const r = ENGINE.route(dentalInput({
      blankType: "block", material: "titanium_gr5", restorationCategory: "implant_prosthetic",
    }));
    expect(r.cycles[0].coolant).toBe("wet_through_spindle");
  });

  it("PEEK cycles use 'air_blast' coolant", () => {
    const r = ENGINE.route(dentalInput({
      blankType: "block", material: "peek", restorationCategory: "single_unit",
    }));
    expect(r.cycles[0].coolant).toBe("air_blast");
  });

  it("PMMA cycles use 'dry' coolant", () => {
    const r = ENGINE.route(dentalInput({
      blankType: "block", material: "pmma", restorationCategory: "single_unit",
    }));
    expect(r.cycles[0].coolant).toBe("dry");
  });
});

// ── HyperMILL settings ───────────────────────────────────────────────────────

describe("HyperMillDentalBlankRouter — hyperMILL settings", () => {
  it("CoCr settings: climbMilling=true, coolant=through_spindle, maxRpm=30000", () => {
    const r = ENGINE.route(dentalInput({
      blankType: "block", material: "cocr", restorationCategory: "single_unit",
    }));
    expect(r.hyperMillSettings.climbMilling).toBe(true);
    expect(r.hyperMillSettings.coolantType).toBe("through_spindle");
    expect(r.hyperMillSettings.maxSpindleRpm).toBe(30000);
  });

  it("titanium settings: climbMilling=true, coolant=through_spindle, maxRpm=60000", () => {
    const r = ENGINE.route(dentalInput({
      blankType: "block", material: "titanium_gr5", restorationCategory: "implant_prosthetic",
    }));
    expect(r.hyperMillSettings.climbMilling).toBe(true);
    expect(r.hyperMillSettings.coolantType).toBe("through_spindle");
    expect(r.hyperMillSettings.maxSpindleRpm).toBe(60000);
  });

  it("zirconia sintered: machiningTolerance=0.005mm, maxRpm=20000", () => {
    const r = ENGINE.route(dentalInput({
      blankType: "disc", material: "zirconia", zirconiaState: "sintered",
      restorationCategory: "single_unit",
    }));
    expect(r.hyperMillSettings.machiningTolerance_mm).toBe(TOLERANCE_SINTERED_ZIRCONIA_MM);
    expect(r.hyperMillSettings.maxSpindleRpm).toBe(20000);
    expect(r.hyperMillSettings.coolantType).toBe("through_spindle_wet");
  });

  it("CoCr: machiningTolerance=0.008mm (metals)", () => {
    const r = ENGINE.route(dentalInput({
      blankType: "block", material: "cocr", restorationCategory: "single_unit",
    }));
    expect(r.hyperMillSettings.machiningTolerance_mm).toBe(TOLERANCE_METAL_MM);
  });

  it("PMMA: machiningTolerance=0.01mm (default), climbMilling=false", () => {
    const r = ENGINE.route(dentalInput({
      blankType: "block", material: "pmma", restorationCategory: "single_unit",
    }));
    expect(r.hyperMillSettings.machiningTolerance_mm).toBe(TOLERANCE_DEFAULT_MM);
    expect(r.hyperMillSettings.climbMilling).toBe(false);
    expect(r.hyperMillSettings.coolantType).toBe("dry");
  });

  it("PEEK: coolant=air_blast in hyperMILL settings", () => {
    const r = ENGINE.route(dentalInput({
      blankType: "block", material: "peek", restorationCategory: "single_unit",
    }));
    expect(r.hyperMillSettings.coolantType).toBe("air_blast");
    expect(r.hyperMillSettings.climbMilling).toBe(false);
  });
});

// ── Tooling notes per material ───────────────────────────────────────────────

describe("HyperMillDentalBlankRouter — tooling + compliance notes", () => {
  it("zirconia tooling note mandates diamond-coated carbide", () => {
    const r = ENGINE.route(dentalInput({
      blankType: "disc", material: "zirconia", restorationCategory: "single_unit",
    }));
    expect(r.toolingNotes.some(n => n.includes("Diamond-coated"))).toBe(true);
  });

  it("zirconia sintered tooling note mandates diamond tools", () => {
    const r = ENGINE.route(dentalInput({
      blankType: "disc", material: "zirconia", zirconiaState: "sintered",
      restorationCategory: "single_unit",
    }));
    expect(r.toolingNotes.some(n => n.includes("diamond tools mandatory"))).toBe(true);
  });

  it("CoCr tooling note mandates climb milling", () => {
    const r = ENGINE.route(dentalInput({
      blankType: "block", material: "cocr", restorationCategory: "implant_prosthetic",
    }));
    expect(r.toolingNotes.some(n => n.includes("climb milling ONLY"))).toBe(true);
    expect(r.toolingNotes.some(n => n.includes("TiAlN coated"))).toBe(true);
  });

  it("titanium tooling note mandates AlCrN coating + climb milling", () => {
    const r = ENGINE.route(dentalInput({
      blankType: "block", material: "titanium_gr5", restorationCategory: "implant_prosthetic",
    }));
    expect(r.toolingNotes.some(n => n.includes("AlCrN"))).toBe(true);
    expect(r.toolingNotes.some(n => n.includes("climb milling mandatory"))).toBe(true);
  });

  it("PEEK tooling note specifies positive rake (PCD or sharp carbide)", () => {
    const r = ENGINE.route(dentalInput({
      blankType: "block", material: "peek", restorationCategory: "single_unit",
    }));
    expect(r.toolingNotes.some(n => n.includes("rake"))).toBe(true);
    expect(r.toolingNotes.some(n => n.includes("Air blast"))).toBe(true);
  });

  it("zirconia compliance includes ISO 6872 + EU MDR Class IIa", () => {
    const r = ENGINE.route(dentalInput({
      blankType: "disc", material: "zirconia", restorationCategory: "single_unit",
    }));
    expect(r.complianceNotes.some(n => n.includes("ISO 6872"))).toBe(true);
    expect(r.complianceNotes.some(n => n.includes("EU MDR"))).toBe(true);
  });

  it("CoCr compliance includes ASTM F75/F1537 + FDA 21 CFR 820.70", () => {
    const r = ENGINE.route(dentalInput({
      blankType: "block", material: "cocr", restorationCategory: "implant_prosthetic",
    }));
    expect(r.complianceNotes.some(n => n.includes("ASTM F75/F1537"))).toBe(true);
    expect(r.complianceNotes.some(n => n.includes("FDA 21 CFR 820.70"))).toBe(true);
  });

  it("titanium compliance includes ASTM F136 Ti-6Al-4V ELI", () => {
    const r = ENGINE.route(dentalInput({
      blankType: "block", material: "titanium_gr5", restorationCategory: "implant_prosthetic",
    }));
    expect(r.complianceNotes.some(n => n.includes("ASTM F136"))).toBe(true);
  });

  it("PMMA tooling note flags it as provisional only (not for permanent restorations)", () => {
    const r = ENGINE.route(dentalInput({
      blankType: "block", material: "pmma", restorationCategory: "single_unit",
    }));
    expect(r.toolingNotes.some(n => n.includes("provisional"))).toBe(true);
  });
});

// ── Surface finish gating ────────────────────────────────────────────────────

describe("HyperMillDentalBlankRouter — surface finish gating", () => {
  it("Ra < 0.8µm + CoCr emits polishing warning", () => {
    const r = ENGINE.route(dentalInput({
      blankType: "block", material: "cocr", restorationCategory: "implant_prosthetic",
      requiredRa_um: 0.4,
    }));
    expect(r.warnings.some(w => w.includes("electrolytic polishing"))).toBe(true);
  });

  it("Ra < 0.8µm + titanium emits polishing warning", () => {
    const r = ENGINE.route(dentalInput({
      blankType: "block", material: "titanium_gr5", restorationCategory: "implant_prosthetic",
      requiredRa_um: 0.5,
    }));
    expect(r.warnings.some(w => w.includes("electrolytic polishing"))).toBe(true);
  });

  it("Ra >= 0.8µm + CoCr does NOT emit polishing warning", () => {
    const r = ENGINE.route(dentalInput({
      blankType: "block", material: "cocr", restorationCategory: "implant_prosthetic",
      requiredRa_um: RA_POLISH_THRESHOLD_UM,
    }));
    expect(r.warnings.some(w => w.includes("electrolytic polishing"))).toBe(false);
  });

  it("Ra < 0.8µm + zirconia (non-metal) does NOT emit polishing warning", () => {
    const r = ENGINE.route(dentalInput({
      blankType: "disc", material: "zirconia", restorationCategory: "single_unit",
      requiredRa_um: 0.4,
    }));
    expect(r.warnings.some(w => w.includes("electrolytic polishing"))).toBe(false);
  });
});

// ── Output structure + axis config ───────────────────────────────────────────

describe("HyperMillDentalBlankRouter — output structure", () => {
  it("3plus2_aaxis axisConfig mentions A and C axes", () => {
    const r = ENGINE.route(dentalInput({
      blankType: "disc", material: "zirconia", restorationCategory: "multi_unit",
    }));
    expect(r.axisConfig.includes("A")).toBe(true);
    expect(r.axisConfig.includes("C")).toBe(true);
  });

  it("5axis_simultaneous axisConfig mentions continuous 5-axis", () => {
    const r = ENGINE.route(dentalInput({
      blankType: "block", material: "titanium_gr5", restorationCategory: "implant_prosthetic",
    }));
    expect(r.axisConfig.includes("continuous 5-axis")).toBe(true);
  });

  it("3axis_block axisConfig is X+Y+Z only", () => {
    const r = ENGINE.route(dentalInput({
      blankType: "block", material: "pmma", restorationCategory: "single_unit",
    }));
    expect(r.axisConfig.includes("X + Y + Z")).toBe(true);
    expect(r.axisConfig.includes("3-axis")).toBe(true);
  });

  it("4axis_disc axisConfig is X+Y+Z+A indexed", () => {
    const r = ENGINE.route(dentalInput({
      blankType: "disc", material: "pmma", restorationCategory: "single_unit",
    }));
    expect(r.axisConfig.includes("4-axis")).toBe(true);
    expect(r.axisConfig.includes("indexed")).toBe(true);
  });

  it("strategyDescription is non-empty for all strategy types", () => {
    const types: Array<{ blank: DentalBlankType; mat: DentalMaterial }> = [
      { blank: "disc", mat: "zirconia" },     // 3plus2_aaxis
      { blank: "block", mat: "titanium_gr5" }, // 5axis_simultaneous
      { blank: "block", mat: "pmma" },         // 3axis_block
      { blank: "disc", mat: "pmma" },          // 4axis_disc
    ];
    for (const { blank, mat } of types) {
      const r = ENGINE.route(dentalInput({
        blankType: blank, material: mat, restorationCategory: "single_unit",
      }));
      expect(r.strategyDescription.length).toBeGreaterThan(20);
    }
  });

  it("each cycle has positive stepover, spindleRpm, and feedRate", () => {
    const r = ENGINE.route(dentalInput({
      blankType: "disc", material: "zirconia", restorationCategory: "multi_unit",
    }));
    for (const cycle of r.cycles) {
      expect(cycle.stepoverMm).toBeGreaterThan(0);
      expect(cycle.spindleRpm).toBeGreaterThan(0);
      expect(cycle.feedRate_mm_min).toBeGreaterThan(0);
    }
  });

  it("cycle 2 (Z-level finishing) feed = 0.6× cycle 1 finish feed for 3plus2_aaxis", () => {
    const r = ENGINE.route(dentalInput({
      blankType: "disc", material: "zirconia", zirconiaState: "green",
      restorationCategory: "multi_unit",
    }));
    const expected = Math.round(r.cycles[1].feedRate_mm_min * 0.6);
    expect(r.cycles[2].feedRate_mm_min).toBe(expected);
  });
});

// ── Defaults + adversarial inputs ────────────────────────────────────────────

describe("HyperMillDentalBlankRouter — defaults + adversarial inputs", () => {
  it("zirconiaState defaults to 'green' (22% shrinkage applied)", () => {
    const r = ENGINE.route(dentalInput({
      blankType: "disc", material: "zirconia", restorationCategory: "single_unit",
    }));
    expect(r.shrinkageCompensation_pct).toBe(ZIRCONIA_GREEN_SHRINKAGE_PCT);
  });

  it("requiredRa_um defaults to 0.8 (no polishing warning for CoCr at default)", () => {
    const r = ENGINE.route(dentalInput({
      blankType: "block", material: "cocr", restorationCategory: "implant_prosthetic",
    }));
    expect(r.warnings.some(w => w.includes("electrolytic polishing"))).toBe(false);
  });

  it("calling route twice increments calcCount", () => {
    const fresh = new HyperMillDentalBlankRouter();
    fresh.route(dentalInput({
      blankType: "disc", material: "pmma", restorationCategory: "single_unit",
    }));
    fresh.route(dentalInput({
      blankType: "block", material: "pmma", restorationCategory: "single_unit",
    }));
    expect(fresh.stats().calculations).toBe(2);
  });

  it("composite block uses 3axis_block (matches PMMA branch)", () => {
    const r = ENGINE.route(dentalInput({
      blankType: "block", material: "composite", restorationCategory: "single_unit",
    }));
    expect(r.strategyType).toBe("3axis_block");
    expect(r.cycles.length).toBe(2);
  });

  it("zirconia GREEN tolerance = 0.01 (default), not the metal/sintered values", () => {
    const r = ENGINE.route(dentalInput({
      blankType: "disc", material: "zirconia", zirconiaState: "green",
      restorationCategory: "single_unit",
    }));
    expect(r.hyperMillSettings.machiningTolerance_mm).toBe(TOLERANCE_DEFAULT_MM);
  });
});

// ── Singleton + dispatcher round-trip ────────────────────────────────────────

describe("HyperMillDentalBlankRouter — singleton + dispatcher round-trip", () => {
  it("singleton produces identical strategy + cycle count as fresh instance", () => {
    const r1 = ENGINE.route(dentalInput({
      blankType: "disc", material: "zirconia", zirconiaState: "green",
      restorationCategory: "multi_unit",
    }));
    const r2 = hyperMillDentalBlankRouter.route(dentalInput({
      blankType: "disc", material: "zirconia", zirconiaState: "green",
      restorationCategory: "multi_unit",
    }));
    expect(r2.strategyType).toBe(r1.strategyType);
    expect(r2.cycles.length).toBe(r1.cycles.length);
    expect(r2.shrinkageCompensation_pct).toBe(r1.shrinkageCompensation_pct);
  });

  it("dispatcher exposes cam_hypermill_dental_route in ACTIONS", async () => {
    const mod = await import("../tools/dispatchers/camDispatcher.js");
    expect(mod.ACTIONS.includes("cam_hypermill_dental_route")).toBe(true);
  });

  it("engine reachable via dynamic import path used by dispatcher", async () => {
    const mod = await import("../engines/HyperMillDentalBlankRouter.js");
    const r = mod.hyperMillDentalBlankRouter.route(dentalInput({
      blankType: "block", material: "titanium_gr5", restorationCategory: "implant_prosthetic",
    }));
    expect(r.strategyType).toBe("5axis_simultaneous");
    expect(r.cycles.length).toBe(3);
  });
});
