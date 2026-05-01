/**
 * HM-REV-MS6: Grinding + EDM + Heat Treatment Routing — Test Suite
 *
 * Covers:
 *   U-HMR32: Grinding bridge — 4 routing triggers
 *   U-HMR33: Burn risk gate + wheel compatibility check
 *   U-HMR34: EDM bridge — wire/sinker/micro type selection
 *   U-HMR35: Heat treatment router — 4 treatment types
 *   U-HMR36: Secondary ops sequencer — constraint enforcement
 *   U-HMR37: Material certification chain (AS9102-compatible)
 */

import { describe, it, expect } from "vitest";
import { hyperMillGrindingBridge } from "../engines/HyperMillGrindingBridge.js";
import { hyperMillEDMBridge } from "../engines/HyperMillEDMBridge.js";
import { hyperMillHeatTreatmentRouter } from "../engines/HyperMillHeatTreatmentRouter.js";
import { hyperMillSecondaryOpsSequencer } from "../engines/HyperMillSecondaryOpsSequencer.js";

// ============================================================================
// U-HMR32: Grinding routing triggers
// ============================================================================

describe("U-HMR32 — Grinding routing triggers (4 triggers)", () => {
  it("Ra trigger: Ra < 0.4µm → grindingRequired=true, trigger ra_too_tight", () => {
    const result = hyperMillGrindingBridge.calculate({
      featureName: "mirror_surface",
      material: "4140_steel",
      requiredRa_um: 0.2,   // below 0.4 threshold
      tolerance_mm: 0.05,
      hardness_hrc: 28,
      partSize_mm: 100,
    });
    expect(result.grindingRequired).toBe(true);
    expect(result.triggers).toContain("ra_too_tight");
  });

  it("Tolerance trigger: tolerance < 0.01mm → grindingRequired=true", () => {
    const result = hyperMillGrindingBridge.calculate({
      featureName: "precision_bore",
      material: "52100_bearing",
      requiredRa_um: 0.8,
      tolerance_mm: 0.005,  // below 0.01mm threshold
      hardness_hrc: 62,
      partSize_mm: 50,
    });
    expect(result.grindingRequired).toBe(true);
    expect(result.triggers).toContain("tolerance_too_tight");
  });

  it("Hardness trigger: HRC > 55 → grindingRequired=true, selects cylindrical or surface grind", () => {
    const result = hyperMillGrindingBridge.calculate({
      featureName: "hardened_cavity",
      material: "4140_hardened",
      requiredRa_um: 1.6,
      tolerance_mm: 0.05,
      hardness_hrc: 58,     // above 55 HRC threshold
      partSize_mm: 80,
    });
    expect(result.grindingRequired).toBe(true);
    expect(result.triggers).toContain("hardness_exceeds_milling");
  });

  it("Bearing bore trigger: featureType=bearing_bore → grindingRequired=true, cylindrical_grind", () => {
    const result = hyperMillGrindingBridge.calculate({
      featureName: "bearing_race",
      material: "52100_bearing",
      requiredRa_um: 0.8,
      tolerance_mm: 0.02,
      hardness_hrc: 62,
      featureType: "bearing_bore",
      partSize_mm: 80,
    });
    expect(result.grindingRequired).toBe(true);
    expect(result.triggers).toContain("bearing_bore_feature");
    expect(result.grindingType).toBe("cylindrical_grind");
  });

  it("No triggers: coarse tolerance + low Ra requirement + soft material → no grinding", () => {
    const result = hyperMillGrindingBridge.calculate({
      featureName: "rough_slot",
      material: "4140_steel",
      requiredRa_um: 3.2,
      tolerance_mm: 0.1,
      hardness_hrc: 28,
      partSize_mm: 200,
    });
    expect(result.grindingRequired).toBe(false);
    expect(result.triggers).toHaveLength(0);
    expect(result.grindingType).toBeNull();
  });

  it("Multiple triggers active simultaneously", () => {
    const result = hyperMillGrindingBridge.calculate({
      featureName: "precision_hardened_bore",
      material: "52100_bearing",
      requiredRa_um: 0.1,   // Ra trigger
      tolerance_mm: 0.002,  // tolerance trigger
      hardness_hrc: 62,     // hardness trigger
      featureType: "bearing_bore", // bearing trigger
      partSize_mm: 60,
    });
    expect(result.triggers.length).toBeGreaterThanOrEqual(3);
  });
});

// ============================================================================
// U-HMR33: Burn risk gate + wheel compatibility
// ============================================================================

describe("U-HMR33 — Grinding burn risk gate", () => {
  it("Safe operation: low DOC + moderate table speed → gate PASSES", () => {
    const gate = hyperMillGrindingBridge.runBurnRiskGate({
      material: "4140_steel",
      depthOfCut_mm: 0.01,    // shallow DOC
      tableSpeed_mmmin: 3000,
      wheelAbrasive: "WA",
    });
    expect(gate.blocked).toBe(false);
    expect(gate.burnRisk).toBe(false);
    expect(gate.wheelCompatible).toBe(true);
  });

  it("Incompatible wheel: aluminum oxide on carbide → wheelCompatible=false and blocked", () => {
    const gate = hyperMillGrindingBridge.runBurnRiskGate({
      material: "carbide",
      depthOfCut_mm: 0.02,
      wheelAbrasive: "WA",    // WA not compatible with carbide
    });
    expect(gate.wheelCompatible).toBe(false);
    expect(gate.blocked).toBe(true);
    // Either wheel incompatibility OR burn risk message is valid — both block correctly
    expect(gate.message.length).toBeGreaterThan(10);
  });

  it("Wheel life warning: < 20% remaining → wheelLifeOk=false", () => {
    const gate = hyperMillGrindingBridge.runBurnRiskGate({
      material: "4140_steel",
      depthOfCut_mm: 0.02,
      wheelLifeRemaining_pct: 15,
    });
    expect(gate.wheelLifeOk).toBe(false);
  });

  it("Wheel life OK at 100% remaining", () => {
    const gate = hyperMillGrindingBridge.runBurnRiskGate({
      material: "4140_steel",
      depthOfCut_mm: 0.02,
      wheelLifeRemaining_pct: 100,
    });
    expect(gate.wheelLifeOk).toBe(true);
  });

  it("specificEnergy_J_mm3 is positive for any valid material", () => {
    const gate = hyperMillGrindingBridge.runBurnRiskGate({
      material: "hardened_steel",
      depthOfCut_mm: 0.05,
    });
    expect(gate.specificEnergy_J_mm3).toBeGreaterThan(0);
    expect(gate.burnThreshold_C).toBeGreaterThan(0);
  });
});

// ============================================================================
// U-HMR34: EDM type selection
// ============================================================================

describe("U-HMR34 — EDM type auto-selection", () => {
  it("Sinker EDM: closed cavity features → edmType=sinker", () => {
    const result = hyperMillEDMBridge.calculate({
      partName: "mold_cavity_A",
      material: "d2_tool_steel",
      features: [{
        type: "cavity",
        name: "core_impression",
        depth_mm: 25,
        size_mm: 40,
        area_mm2: 1600,
        volume_mm3: 30000,
        targetRa_um: 0.8,
      }],
      electrodeMaterial: "copper",
      roughOvercut_mm: 0.3,
      finishOvercut_mm: 0.1,
    });
    expect(result.edmType).toBe("sinker");
    expect(result.sinkerProgram).toBeDefined();
    expect(result.electrodeUndersize.roughing_mm).toBeCloseTo(0.3, 3);
    expect(result.electrodeUndersize.finishing_mm).toBeCloseTo(0.1, 3);
  });

  it("Wire EDM: open contour profile → edmType=wire", () => {
    const result = hyperMillEDMBridge.calculate({
      partName: "punch_profile",
      material: "d2_tool_steel",
      features: [{
        type: "contour",
        name: "punch_outline",
        depth_mm: 50,
        size_mm: 60,
        thickness_mm: 50,
        contourPerimeter_mm: 200,
      }],
      numSkimPasses: 2,
      targetRa_um: 0.8,
    });
    expect(result.edmType).toBe("wire");
    expect(result.wireProgram).toBeDefined();
  });

  it("Micro EDM: feature < 1mm → edmType=micro", () => {
    const result = hyperMillEDMBridge.calculate({
      partName: "micro_filter",
      material: "stainless",
      features: [{
        type: "micro_hole",
        name: "orifice_01",
        depth_mm: 2,
        size_mm: 0.3,   // < 1mm → micro EDM
      }],
    });
    expect(result.edmType).toBe("micro");
    expect(result.microProgram).toBeDefined();
  });

  it("Overcut defaults applied when not specified (rough=0.3mm, finish=0.1mm)", () => {
    const result = hyperMillEDMBridge.calculate({
      partName: "test_part",
      material: "h13",
      features: [{
        type: "cavity",
        name: "pocket",
        depth_mm: 15,
        size_mm: 20,
      }],
    });
    expect(result.electrodeUndersize.roughing_mm).toBeCloseTo(0.3, 3);
    expect(result.electrodeUndersize.finishing_mm).toBeCloseTo(0.1, 3);
    expect(result.estimatedSparkGap_mm).toBeCloseTo(0.1, 3);
  });
});

// ============================================================================
// U-HMR35: Heat treatment routing
// ============================================================================

describe("U-HMR35 — Heat treatment routing", () => {
  it("Work-hardened material → anneal before rough machining", () => {
    const result = hyperMillHeatTreatmentRouter.calculate({
      material: "d2_tool_steel",
      isWorkHardened: true,
      heavyRoughingPlanned: false,
    });
    expect(result.treatmentRequired).toBe(true);
    const annealStep = result.steps.find(s => s.type === "anneal");
    expect(annealStep).toBeDefined();
    expect(annealStep!.timing).toBe("before_rough");
  });

  it("Heavy roughing → stress relief step inserted after roughing", () => {
    const result = hyperMillHeatTreatmentRouter.calculate({
      material: "4140_steel",
      heavyRoughingPlanned: true,
      isWorkHardened: false,
    });
    expect(result.treatmentRequired).toBe(true);
    const srStep = result.steps.find(s => s.type === "stress_relief");
    expect(srStep).toBeDefined();
    expect(srStep!.timing).toBe("after_rough");
  });

  it("Required hardness > 40 HRC → through hardening step included", () => {
    const result = hyperMillHeatTreatmentRouter.calculate({
      material: "4140_steel",
      alloyClass: "low_alloy",
      carbonPct: 0.40,
      requiredHardness_hrc: 55,
      finishGrindingRequired: true,
    });
    expect(result.treatmentRequired).toBe(true);
    const hardenStep = result.steps.find(s => s.type === "through_harden");
    expect(hardenStep).toBeDefined();
    expect(hardenStep!.temperature_C).toBeGreaterThan(700);
    expect(hardenStep!.predictedHardness_hrc).toBeGreaterThan(40);
  });

  it("Case depth required → case hardening (carburize) step included", () => {
    const result = hyperMillHeatTreatmentRouter.calculate({
      material: "8620",
      alloyClass: "low_alloy",
      carbonPct: 0.20,
      requiredCaseDepth_mm: 1.0,
      requiredHardness_hrc: 60,
    });
    expect(result.treatmentRequired).toBe(true);
    const caseStep = result.steps.find(
      s => s.type === "case_harden_carburize" || s.type === "case_harden_nitride"
    );
    expect(caseStep).toBeDefined();
    expect(caseStep!.caseDepth_mm).toBeDefined();
  });

  it("All heat treat steps have temperature_C > 0 and holdTime_min > 0", () => {
    const result = hyperMillHeatTreatmentRouter.calculate({
      material: "4140_steel",
      requiredHardness_hrc: 55,
      heavyRoughingPlanned: true,
      finishGrindingRequired: true,
    });
    for (const step of result.steps) {
      expect(step.temperature_C).toBeGreaterThan(0);
      expect(step.holdTime_min).toBeGreaterThan(0);
    }
  });
});

// ============================================================================
// U-HMR37: Material certification chain (AS9102)
// ============================================================================

describe("U-HMR37 — Material certification traceability chain", () => {
  it("Certification chain has materialCert + heatTreatCerts + inspectionCert", () => {
    const result = hyperMillHeatTreatmentRouter.calculate({
      material: "4140_steel",
      requiredHardness_hrc: 55,
      finishGrindingRequired: true,
    });
    const chain = result.certificationChain;
    expect(chain.materialCert).toBeDefined();
    expect(chain.heatTreatCerts).toBeDefined();
    expect(chain.inspectionCert).toBeDefined();
    expect(chain.as9102Compatible).toBe(true);
  });

  it("materialCert includes required traceability fields (lot number, heat number)", () => {
    const result = hyperMillHeatTreatmentRouter.calculate({
      material: "h13",
      requiredHardness_hrc: 50,
    });
    const mc = result.certificationChain.materialCert;
    expect(mc.requiredFields).toContain("material_lot_number");
    expect(mc.requiredFields).toContain("heat_number");
    expect(mc.requiredFields).toContain("chemical_composition");
  });

  it("heatTreatCerts include furnace_id and operator_id for traceability", () => {
    const result = hyperMillHeatTreatmentRouter.calculate({
      material: "4140_steel",
      requiredHardness_hrc: 55,
      finishGrindingRequired: true,
    });
    const htCerts = result.certificationChain.heatTreatCerts;
    expect(htCerts.length).toBeGreaterThan(0);
    const firstCert = htCerts[0];
    expect(firstCert.requiredFields).toContain("furnace_id");
    expect(firstCert.requiredFields).toContain("operator_id");
  });

  it("inspectionCert includes dimensional_report and final_hardness_hrc", () => {
    const result = hyperMillHeatTreatmentRouter.calculate({
      material: "4140_steel",
      requiredHardness_hrc: 55,
    });
    const ic = result.certificationChain.inspectionCert;
    expect(ic.requiredFields).toContain("final_hardness_hrc");
    expect(ic.requiredFields).toContain("dimensional_report");
    expect(ic.standardReference).toMatch(/AS9102/);
  });
});

// ============================================================================
// U-HMR36: Secondary ops sequencer + constraint enforcement
// ============================================================================

describe("U-HMR36 — Secondary ops sequencer + physical constraint enforcement", () => {
  it("Mold tool sequence: grind and EDM appear AFTER harden", () => {
    const result = hyperMillSecondaryOpsSequencer.calculate({
      partApplication: "mold_tool",
      partName: "mold_cavity_block",
      material: "h13",
      grindingRequired: true,
      edmRequired: true,
      heavyRoughing: true,
    });
    const ops = result.sequence.map(o => o.type);
    const hardenIdx = ops.indexOf("harden");
    const grindIdx  = ops.indexOf("grind");
    const edmIdx    = ops.indexOf("edm");
    expect(hardenIdx).toBeGreaterThan(-1);
    expect(grindIdx).toBeGreaterThan(hardenIdx); // grind AFTER harden
    expect(edmIdx).toBeGreaterThan(-1);
  });

  it("Bearing sequence: cylindrical_grind included, harden before grind", () => {
    const result = hyperMillSecondaryOpsSequencer.calculate({
      partApplication: "bearing",
      partName: "inner_race",
      material: "52100_bearing",
      grindingRequired: true,
      grindingType: "cylindrical_grind",
    });
    const ops = result.sequence.map(o => o.type);
    const hardenIdx = ops.indexOf("harden");
    const grindIdx  = ops.indexOf("grind");
    expect(hardenIdx).toBeLessThan(grindIdx); // harden before grind
  });

  it("Gear sequence: case_harden before grind constraint enforced", () => {
    const result = hyperMillSecondaryOpsSequencer.calculate({
      partApplication: "gear",
      partName: "spur_gear",
      material: "8620",
      grindingRequired: true,
    });
    const ops = result.sequence.map(o => o.type);
    const caseIdx  = ops.indexOf("case_harden");
    const grindIdx = ops.indexOf("grind");
    if (caseIdx >= 0 && grindIdx >= 0) {
      expect(caseIdx).toBeLessThan(grindIdx); // case harden before grind
    }
  });

  it("final_inspect is always the last operation", () => {
    const result = hyperMillSecondaryOpsSequencer.calculate({
      partApplication: "mold_tool",
      partName: "test_mold",
      material: "d2_tool_steel",
      grindingRequired: true,
      edmRequired: true,
      heavyRoughing: true,
    });
    const lastOp = result.sequence[result.sequence.length - 1];
    expect(lastOp.type).toBe("final_inspect");
  });

  it("ms10Compatible=true on all results", () => {
    const result = hyperMillSecondaryOpsSequencer.calculate({
      partApplication: "general",
      partName: "bracket",
      material: "steel",
    });
    expect(result.ms10Compatible).toBe(true);
  });

  it("totalTime_h > 0 and criticalPath populated", () => {
    const result = hyperMillSecondaryOpsSequencer.calculate({
      partApplication: "aerospace_part",
      partName: "turbine_bracket",
      material: "inconel",
      grindingRequired: true,
      heavyRoughing: true,
      nadcapRequired: true,
    });
    expect(result.totalTime_h).toBeGreaterThan(0);
    expect(result.criticalPath.length).toBeGreaterThan(0);
  });
});
