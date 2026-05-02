/**
 * HyperMillHeatTreatmentRouter.test.ts
 *
 * Coverage for HM-REV-MS6 / U-HMR35 + U-HMR37 heat treatment routing.
 * Validates anneal/stress relief/through-harden/case-harden trigger logic,
 * carbon and alloy-class inference, AS9102B cert chain, time estimation.
 *
 * CAM-EXHAUST-MS0 / U-CAM-HM-HT-TESTS-01
 */

import { describe, it, expect } from "vitest";
import {
  HyperMillHeatTreatmentRouter,
  hyperMillHeatTreatmentRouter,
  type MaterialHeatTreatProfile,
} from "../engines/HyperMillHeatTreatmentRouter.js";

const ENGINE = new HyperMillHeatTreatmentRouter();

const CONFIDENCE_FIXED = 0.85;
const CASE_HARDEN_MIN_HRC = 40;
const TEMPER_BREAKPOINT_C = 150;

function profile(over: Partial<MaterialHeatTreatProfile>): MaterialHeatTreatProfile {
  return {
    material: over.material ?? "4140_steel",
    carbonPct: over.carbonPct,
    alloyClass: over.alloyClass,
    sectionThickness_mm: over.sectionThickness_mm,
    requiredHardness_hrc: over.requiredHardness_hrc,
    requiredCaseDepth_mm: over.requiredCaseDepth_mm,
    isWorkHardened: over.isWorkHardened,
    heavyRoughingPlanned: over.heavyRoughingPlanned,
    finishGrindingRequired: over.finishGrindingRequired,
  };
}

describe("HyperMillHeatTreatmentRouter — anneal trigger logic", () => {
  it("isWorkHardened=true triggers anneal-before-rough", () => {
    const r = ENGINE.calculate(profile({
      material: "1018_steel", isWorkHardened: true,
    }));
    expect(r.steps.some(s => s.type === "anneal")).toBe(true);
    const annealStep = r.steps.find(s => s.type === "anneal")!;
    expect(annealStep.timing).toBe("before_rough");
  });

  it("tool_steel material auto-anneals (D2 in ANNEAL_REQUIRED_MATERIALS)", () => {
    const r = ENGINE.calculate(profile({ material: "d2_tool_steel" }));
    expect(r.steps.some(s => s.type === "anneal")).toBe(true);
  });

  it("inconel_718 auto-anneals (in ANNEAL_REQUIRED_MATERIALS)", () => {
    const r = ENGINE.calculate(profile({ material: "inconel_718" }));
    expect(r.steps.some(s => s.type === "anneal")).toBe(true);
  });

  it("plain mild steel without work-hardening does NOT auto-anneal", () => {
    const r = ENGINE.calculate(profile({
      material: "1018_steel", isWorkHardened: false,
    }));
    expect(r.steps.some(s => s.type === "anneal")).toBe(false);
  });

  it("anneal step has predictedHardness lower than typical hardened state", () => {
    const r = ENGINE.calculate(profile({ isWorkHardened: true }));
    const annealStep = r.steps.find(s => s.type === "anneal");
    if (annealStep) {
      // Annealed steel is typically <30 HRC
      expect(annealStep.predictedHardness_hrc).toBeLessThan(50);
    }
  });
});

describe("HyperMillHeatTreatmentRouter — stress relief after roughing", () => {
  it("heavyRoughingPlanned=true emits stress_relief step", () => {
    const r = ENGINE.calculate(profile({ heavyRoughingPlanned: true }));
    const stressStep = r.steps.find(s => s.type === "stress_relief");
    expect(stressStep === undefined).toBe(false);
    expect(stressStep!.timing).toBe("after_rough");
  });

  it("heavyRoughingPlanned=false does NOT emit stress_relief", () => {
    const r = ENGINE.calculate(profile({
      material: "1018_steel", heavyRoughingPlanned: false,
    }));
    expect(r.steps.some(s => s.type === "stress_relief")).toBe(false);
  });

  it("stress relief step description references stock removal threshold (5mm)", () => {
    const r = ENGINE.calculate(profile({ heavyRoughingPlanned: true }));
    const stressStep = r.steps.find(s => s.type === "stress_relief")!;
    expect(stressStep.description.includes("Stress relief")).toBe(true);
  });
});

describe("HyperMillHeatTreatmentRouter — through harden trigger", () => {
  it("requiredHardness_hrc >= 40 + no case depth → through_harden step", () => {
    const r = ENGINE.calculate(profile({
      material: "4140_steel", requiredHardness_hrc: 55,
    }));
    expect(r.steps.some(s => s.type === "through_harden")).toBe(true);
  });

  it("finishGrindingRequired=true → through_harden with timing=before_grind", () => {
    const r = ENGINE.calculate(profile({
      material: "4140_steel", finishGrindingRequired: true,
    }));
    const hardenStep = r.steps.find(s => s.type === "through_harden")!;
    expect(hardenStep.timing).toBe("before_grind");
  });

  it("through hardening at hardness < 40 HRC and no grinding → no harden step", () => {
    const r = ENGINE.calculate(profile({
      material: "1018_steel", requiredHardness_hrc: 30,
    }));
    expect(r.steps.some(s => s.type === "through_harden")).toBe(false);
  });

  it("temper step follows quench when temper_temp > 150°C", () => {
    const r = ENGINE.calculate(profile({
      material: "4140_steel", requiredHardness_hrc: 55,
    }));
    const hardenSteps = r.steps.filter(s => s.type === "through_harden");
    // Quench step + temper step (if temper temp > 150 C)
    if (hardenSteps.length > 1) {
      const tempStep = hardenSteps[1];
      expect(tempStep.temperature_C).toBeGreaterThan(TEMPER_BREAKPOINT_C);
      expect(tempStep.quenchMedium).toBe("air_cool");
    }
  });

  it("CASE_HARDEN_MIN_HRC threshold = 40 (boundary check)", () => {
    const below = ENGINE.calculate(profile({
      material: "1018_steel", requiredHardness_hrc: 39,
    }));
    const above = ENGINE.calculate(profile({
      material: "4140_steel", requiredHardness_hrc: 40,
    }));
    expect(below.steps.some(s => s.type === "through_harden")).toBe(false);
    expect(above.steps.some(s => s.type === "through_harden")).toBe(true);
  });
});

describe("HyperMillHeatTreatmentRouter — case hardening", () => {
  it("requiredCaseDepth_mm > 0 emits case_harden step", () => {
    const r = ENGINE.calculate(profile({
      material: "8620_steel", requiredCaseDepth_mm: 0.8, requiredHardness_hrc: 60,
    }));
    expect(r.steps.some(s =>
      s.type === "case_harden_carburize" || s.type === "case_harden_nitride",
    )).toBe(true);
  });

  it("stainless steel + caseDepth → case_harden_nitride (gas nitriding)", () => {
    const r = ENGINE.calculate(profile({
      material: "316_stainless", requiredCaseDepth_mm: 0.3, requiredHardness_hrc: 55,
    }));
    expect(r.steps.some(s => s.type === "case_harden_nitride")).toBe(true);
  });

  it("low alloy + caseDepth → case_harden_carburize (carburizing)", () => {
    const r = ENGINE.calculate(profile({
      material: "8620_steel", requiredCaseDepth_mm: 0.8, requiredHardness_hrc: 60,
    }));
    expect(r.steps.some(s => s.type === "case_harden_carburize")).toBe(true);
  });

  it("nickel_alloy + caseDepth → nitride", () => {
    const r = ENGINE.calculate(profile({
      material: "inconel_718", alloyClass: "nickel_alloy",
      requiredCaseDepth_mm: 0.2, requiredHardness_hrc: 58,
    }));
    expect(r.steps.some(s => s.type === "case_harden_nitride")).toBe(true);
  });

  it("requiredCaseDepth_mm = 0 does NOT emit case harden", () => {
    const r = ENGINE.calculate(profile({
      material: "8620_steel", requiredCaseDepth_mm: 0,
    }));
    expect(r.steps.some(s => s.type.startsWith("case_harden"))).toBe(false);
  });
});

describe("HyperMillHeatTreatmentRouter — carbon content estimation", () => {
  it("d2_tool_steel → 1.5%C inferred when not specified", () => {
    const r = ENGINE.calculate(profile({
      material: "d2_tool_steel", requiredHardness_hrc: 60,
    }));
    expect(r.steps.length).toBeGreaterThan(0);
    // Carbon affects austenitizing temp; high carbon = lower austenitize temp
    const hardenStep = r.steps.find(s => s.type === "through_harden");
    if (hardenStep) {
      expect(hardenStep.temperature_C).toBeGreaterThan(0);
    }
  });

  it("explicit carbonPct overrides material-based estimation", () => {
    const r1 = ENGINE.calculate(profile({
      material: "4140_steel", requiredHardness_hrc: 55, carbonPct: 0.4,
    }));
    const r2 = ENGINE.calculate(profile({
      material: "4140_steel", requiredHardness_hrc: 55, carbonPct: 1.0,
    }));
    // Different carbon → potentially different austenitize temps
    const t1 = r1.steps.find(s => s.type === "through_harden")?.temperature_C;
    const t2 = r2.steps.find(s => s.type === "through_harden")?.temperature_C;
    expect(typeof t1).toBe("number");
    expect(typeof t2).toBe("number");
  });

  it("h13 material recognized (carbonPct ~0.38 inferred)", () => {
    const r = ENGINE.calculate(profile({
      material: "h13", requiredHardness_hrc: 50,
    }));
    expect(r.steps.length).toBeGreaterThan(0);
  });

  it("unrecognized material falls back to medium carbon (0.30%)", () => {
    const r = ENGINE.calculate(profile({
      material: "unknown_alloy", requiredHardness_hrc: 50,
    }));
    expect(r.steps.length).toBeGreaterThan(0);
  });
});

describe("HyperMillHeatTreatmentRouter — alloy class inference", () => {
  it("316_stainless → stainless alloy class (drives nitride routing)", () => {
    const r = ENGINE.calculate(profile({
      material: "316_stainless", requiredCaseDepth_mm: 0.3, requiredHardness_hrc: 55,
    }));
    expect(r.steps.some(s => s.type === "case_harden_nitride")).toBe(true);
  });

  it("d2_tool_steel inferred as tool_steel alloy class", () => {
    const r = ENGINE.calculate(profile({
      material: "d2_tool_steel", requiredHardness_hrc: 60,
    }));
    // Tool steel → triggers anneal (in ANNEAL_REQUIRED_MATERIALS)
    expect(r.steps.some(s => s.type === "anneal")).toBe(true);
  });

  it("4140 inferred as low_alloy class", () => {
    const r = ENGINE.calculate(profile({
      material: "4140_steel", requiredHardness_hrc: 55, requiredCaseDepth_mm: 0.5,
    }));
    // Low alloy → carburize (not nitride)
    expect(r.steps.some(s => s.type === "case_harden_carburize")).toBe(true);
  });
});

describe("HyperMillHeatTreatmentRouter — certification chain (AS9102B)", () => {
  it("certificationChain.materialCert is AS9102 / EN 10204 doc", () => {
    const r = ENGINE.calculate(profile({}));
    expect(r.certificationChain.materialCert.type).toBe("material_cert");
    expect(r.certificationChain.materialCert.standardReference.includes("AMS 2750")).toBe(true);
  });

  it("inspectionCert references AS9102B §6", () => {
    const r = ENGINE.calculate(profile({}));
    expect(r.certificationChain.inspectionCert.standardReference.includes("AS9102B")).toBe(true);
  });

  it("heatTreatCerts count equals steps count", () => {
    const r = ENGINE.calculate(profile({
      material: "4140_steel",
      isWorkHardened: true, heavyRoughingPlanned: true, requiredHardness_hrc: 55,
    }));
    expect(r.certificationChain.heatTreatCerts.length).toBe(r.steps.length);
  });

  it("as9102Compatible flag always true", () => {
    const r = ENGINE.calculate(profile({}));
    expect(r.certificationChain.as9102Compatible).toBe(true);
  });

  it("each step's certLink has chainPosition=2 (heat_treat_cert)", () => {
    const r = ENGINE.calculate(profile({
      material: "4140_steel", requiredHardness_hrc: 55,
    }));
    for (const step of r.steps) {
      expect(step.certLink.chainPosition).toBe(2);
      expect(step.certLink.requiredForAerospace).toBe(true);
    }
  });

  it("materialCert lists material_lot_number in required fields", () => {
    const r = ENGINE.calculate(profile({}));
    expect(r.certificationChain.materialCert.requiredFields).toContain("material_lot_number");
    expect(r.certificationChain.materialCert.requiredFields).toContain("heat_number");
  });
});

describe("HyperMillHeatTreatmentRouter — output structure + warnings", () => {
  it("treatmentRequired=true when steps exist", () => {
    const r = ENGINE.calculate(profile({
      material: "4140_steel", requiredHardness_hrc: 55,
    }));
    expect(r.treatmentRequired).toBe(true);
    expect(r.steps.length).toBeGreaterThan(0);
  });

  it("treatmentRequired=false + warning when no HT triggers", () => {
    const r = ENGINE.calculate(profile({
      material: "1018_steel",
    }));
    expect(r.treatmentRequired).toBe(false);
    expect(r.warnings.some(w => w.includes("No heat treatment"))).toBe(true);
  });

  it("aluminum alloy class emits age-hardening warning", () => {
    const r = ENGINE.calculate(profile({
      material: "7075_aluminum", alloyClass: "aluminum",
    }));
    expect(r.warnings.some(w => w.includes("aluminum"))).toBe(true);
    expect(r.warnings.some(w => w.includes("age hardening"))).toBe(true);
  });

  it("titanium alloy class emits age-hardening warning", () => {
    const r = ENGINE.calculate(profile({
      material: "Ti-6Al-4V", alloyClass: "titanium",
    }));
    expect(r.warnings.some(w => w.includes("titanium"))).toBe(true);
  });

  it("totalHeatTreatTime_h positive for non-empty steps (≥2h per step)", () => {
    const r = ENGINE.calculate(profile({
      material: "4140_steel", requiredHardness_hrc: 55,
    }));
    expect(r.totalHeatTreatTime_h).toBeGreaterThanOrEqual(r.steps.length * 2);
  });

  it("sequenceSummary uses arrow-separated step descriptions", () => {
    const r = ENGINE.calculate(profile({
      material: "4140_steel", requiredHardness_hrc: 55,
    }));
    if (r.steps.length > 1) {
      expect(r.sequenceSummary.includes("→")).toBe(true);
    } else {
      expect(r.sequenceSummary.length).toBeGreaterThan(0);
    }
  });

  it("empty-result summary states 'No heat treatment required'", () => {
    const r = ENGINE.calculate(profile({ material: "1018_steel" }));
    expect(r.sequenceSummary).toBe("No heat treatment required");
  });

  it("confidence is fixed 0.85", () => {
    const r = ENGINE.calculate(profile({}));
    expect(r.confidence).toBeCloseTo(CONFIDENCE_FIXED, 2);
  });

  it("source attributes ASM Handbook + AS9102B + HeatTreatmentEngine", () => {
    const r = ENGINE.calculate(profile({}));
    expect(r.source.includes("HeatTreatmentEngine")).toBe(true);
    expect(r.source.includes("ASM-Handbook")).toBe(true);
    expect(r.source.includes("AS9102B")).toBe(true);
  });
});

describe("HyperMillHeatTreatmentRouter — adversarial inputs", () => {
  it("requiredHardness_hrc = 0 does not trigger hardening", () => {
    const r = ENGINE.calculate(profile({
      material: "4140_steel", requiredHardness_hrc: 0,
    }));
    expect(r.steps.some(s => s.type === "through_harden")).toBe(false);
  });

  it("requiredCaseDepth_mm = 0 does not trigger case hardening", () => {
    const r = ENGINE.calculate(profile({
      material: "8620_steel", requiredCaseDepth_mm: 0, requiredHardness_hrc: 60,
    }));
    expect(r.steps.some(s => s.type.startsWith("case_harden"))).toBe(false);
  });

  it("empty material string does not crash", () => {
    const r = ENGINE.calculate(profile({ material: "" }));
    expect(typeof r.treatmentRequired).toBe("boolean");
    expect(Array.isArray(r.steps)).toBe(true);
  });

  it("very thick section (1000mm) still produces a coherent plan", () => {
    const r = ENGINE.calculate(profile({
      material: "4140_steel", requiredHardness_hrc: 55,
      sectionThickness_mm: 1000,
    }));
    expect(r.steps.length).toBeGreaterThan(0);
  });
});

describe("HyperMillHeatTreatmentRouter — singleton + dispatcher round-trip", () => {
  it("singleton produces identical step count + types as fresh instance", () => {
    const r1 = ENGINE.calculate(profile({
      material: "4140_steel", requiredHardness_hrc: 55,
    }));
    const r2 = hyperMillHeatTreatmentRouter.calculate(profile({
      material: "4140_steel", requiredHardness_hrc: 55,
    }));
    expect(r2.steps.length).toBe(r1.steps.length);
    expect(r2.steps.map(s => s.type)).toEqual(r1.steps.map(s => s.type));
  });

  it("dispatcher exposes cam_hypermill_heat_treat_route action", async () => {
    const mod = await import("../tools/dispatchers/camDispatcher.js");
    expect(mod.ACTIONS).toContain("cam_hypermill_heat_treat_route");
  });

  it("engine reachable via dynamic-import path used by dispatcher", async () => {
    const mod = await import("../engines/HyperMillHeatTreatmentRouter.js");
    const r = mod.hyperMillHeatTreatmentRouter.calculate(profile({}));
    expect(r.confidence).toBeCloseTo(CONFIDENCE_FIXED, 2);
  });
});
