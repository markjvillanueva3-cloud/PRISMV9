/**
 * HyperMillMoldCycleEngine.test.ts
 *
 * Coverage for HM-REV-MS4 / U-HMR24 mold-die machining cycle planner.
 */

import { describe, it, expect } from "vitest";
import {
  HyperMillMoldCycleEngine,
  hyperMillMoldCycleEngine,
  type MoldCycleInput,
  type SpiFinishGrade,
} from "../engines/HyperMillMoldCycleEngine.js";

const ENGINE = new HyperMillMoldCycleEngine();

const SPI_GRADE_COUNT = 12;
const COPPER_KC11 = 700;
const GRAPHITE_KC11 = 500;
const A1_RA = 0.012;
const D3_RA = 3.20;
const ADAPTIVE_RADIAL_FACTOR = 0.15;
const STD_RADIAL_FACTOR = 0.5;

function input(over: Partial<MoldCycleInput>): MoldCycleInput {
  return {
    featureType: over.featureType ?? "cavity",
    spiGrade: over.spiGrade,
    partLengthMm: over.partLengthMm ?? 100,
    partWidthMm: over.partWidthMm ?? 80,
    partDepthMm: over.partDepthMm ?? 30,
    toolDiameterMm: over.toolDiameterMm ?? 10,
    partingLineZ_mm: over.partingLineZ_mm,
    electrodeMaterial: over.electrodeMaterial,
    useAdaptiveClearing: over.useAdaptiveClearing,
    allowanceMm: over.allowanceMm,
  };
}

describe("HyperMillMoldCycleEngine — cavity feature path", () => {
  it("cavity returns Opt3d cycle code and a non-empty roughing plan", () => {
    const r = ENGINE.calculate(input({ featureType: "cavity" }));
    expect(r.cycleCode).toBe("Opt3d");
    expect(r.cavityPlan?.cycleCode).toBe("Opt3d");
    expect(r.cavityPlan?.levelCount).toBeGreaterThanOrEqual(1);
  });

  it("cavity stepdown defaults to 0.5 × tool diameter (5mm on 10mm tool)", () => {
    const r = ENGINE.calculate(input({ featureType: "cavity", toolDiameterMm: 10 }));
    expect(r.cavityPlan?.stepdownMm).toBeCloseTo(5, 6);
  });

  it("cavity adaptive clearing reduces radial engagement to 15% of tool diameter", () => {
    const r = ENGINE.calculate(input({
      featureType: "cavity", toolDiameterMm: 10, useAdaptiveClearing: true,
    }));
    expect(r.cavityPlan?.radialEngagementMm).toBeCloseTo(10 * ADAPTIVE_RADIAL_FACTOR, 6);
    expect(r.cavityPlan?.adaptive).toBe(true);
  });

  it("cavity non-adaptive uses 50% radial engagement (5mm on 10mm tool)", () => {
    const r = ENGINE.calculate(input({
      featureType: "cavity", toolDiameterMm: 10, useAdaptiveClearing: false,
    }));
    expect(r.cavityPlan?.radialEngagementMm).toBeCloseTo(10 * STD_RADIAL_FACTOR, 6);
    expect(r.cavityPlan?.adaptive).toBe(false);
  });

  it("deep cavity (>100mm) emits trochoidal-paths warning", () => {
    const r = ENGINE.calculate(input({ featureType: "cavity", partDepthMm: 150 }));
    const hasDeepWarn = r.warnings.some(w => w.includes("trochoidal"));
    expect(hasDeepWarn).toBe(true);
  });

  it("cavity level count = ceil(depth / stepdown) — 30mm depth ÷ 5mm stepdown = 6 levels", () => {
    const r = ENGINE.calculate(input({ featureType: "cavity", partDepthMm: 30, toolDiameterMm: 10 }));
    expect(r.cavityPlan?.levelCount).toBe(6);
  });
});

describe("HyperMillMoldCycleEngine — core feature path", () => {
  it("core returns Opt3d cycle code with corePlan", () => {
    const r = ENGINE.calculate(input({ featureType: "core" }));
    expect(r.cycleCode).toBe("Opt3d");
    expect(r.corePlan?.cycleCode).toBe("Opt3d");
  });

  it("core uses 0.4 × tool diameter stepdown (4mm on 10mm tool)", () => {
    const r = ENGINE.calculate(input({ featureType: "core", toolDiameterMm: 10 }));
    expect(r.corePlan?.stepdownMm).toBeCloseTo(4, 6);
  });

  it("core uses negative parting line offset (= -allowanceMm)", () => {
    const r = ENGINE.calculate(input({ featureType: "core", allowanceMm: 0.3 }));
    expect(r.corePlan?.partingLineOffsetMm).toBeCloseTo(-0.3, 6);
  });

  it("core without partingLineZ_mm emits warning suggesting CAD verification", () => {
    const r = ENGINE.calculate(input({ featureType: "core" }));
    const hasWarn = r.warnings.some(w => w.includes("partingLineZ_mm"));
    expect(hasWarn).toBe(true);
  });

  it("core with partingLineZ_mm provided does NOT emit the missing-parting warning", () => {
    const r = ENGINE.calculate(input({ featureType: "core", partingLineZ_mm: 15 }));
    const hasWarn = r.warnings.some(w => w.includes("partingLineZ_mm"));
    expect(hasWarn).toBe(false);
  });
});

describe("HyperMillMoldCycleEngine — parting line feature", () => {
  it("parting_line returns PL_SPLIT cycle code with split regions", () => {
    const r = ENGINE.calculate(input({ featureType: "parting_line", partingLineZ_mm: 15, partDepthMm: 30 }));
    expect(r.cycleCode).toBe("PL_SPLIT");
    expect(r.partingLineSplit?.partingLineZ).toBe(15);
    expect(r.partingLineSplit?.cavityRegion.zMin).toBe(15);
    expect(r.partingLineSplit?.coreRegion.zMax).toBe(15);
  });

  it("parting_line without partingLineZ_mm defaults to depth/2", () => {
    const r = ENGINE.calculate(input({ featureType: "parting_line", partDepthMm: 30 }));
    expect(r.partingLineSplit?.partingLineZ).toBe(15);
  });

  it("parting_line emits undercut-verification warning", () => {
    const r = ENGINE.calculate(input({ featureType: "parting_line" }));
    expect(r.warnings.some(w => w.includes("undercuts"))).toBe(true);
  });
});

describe("HyperMillMoldCycleEngine — electrode feature", () => {
  it("electrode defaults to graphite when material not specified", () => {
    const r = ENGINE.calculate(input({ featureType: "electrode" }));
    expect(r.electrodePlan?.material).toBe("graphite");
    expect(r.electrodePlan?.kc1_1).toBe(GRAPHITE_KC11);
  });

  it("copper electrode uses kc1.1 = 700 N/mm² (ISO N group)", () => {
    const r = ENGINE.calculate(input({ featureType: "electrode", electrodeMaterial: "copper" }));
    expect(r.electrodePlan?.kc1_1).toBe(COPPER_KC11);
    expect(r.electrodePlan?.edm_Ra_um).toBeCloseTo(0.80, 3);
  });

  it("graphite electrode emits dust-extraction safety warning (no coolant rule)", () => {
    const r = ENGINE.calculate(input({ featureType: "electrode", electrodeMaterial: "graphite" }));
    expect(r.warnings.some(w => w.includes("dust extraction"))).toBe(true);
    expect(r.warnings.some(w => w.includes("conductive slurry"))).toBe(true);
  });

  it("graphite achievable EDM Ra ≈ 1.6 µm (D2 grade)", () => {
    const r = ENGINE.calculate(input({ featureType: "electrode", electrodeMaterial: "graphite" }));
    expect(r.electrodePlan?.edm_Ra_um).toBeCloseTo(1.60, 3);
  });

  it("electrode with non-EDM SPI grade (B1) emits 'verify electrode is needed' warning", () => {
    const r = ENGINE.calculate(input({
      featureType: "electrode", electrodeMaterial: "copper", spiGrade: "B1",
    }));
    expect(r.warnings.some(w => w.includes("does not require EDM"))).toBe(true);
  });
});

describe("HyperMillMoldCycleEngine — SPI finish lookup", () => {
  it("getSpiFinish('A1') returns Ra=0.012µm with diamond_buff_3um polishing", () => {
    const a1 = ENGINE.getSpiFinish("A1");
    expect(a1.target_Ra_um).toBeCloseTo(A1_RA, 4);
    expect(a1.polishingRequired).toBe("diamond_buff_3um");
    expect(a1.requiresEDM).toBe(false);
  });

  it("getSpiFinish('D3') is EDM-required with no polishing step", () => {
    const d3 = ENGINE.getSpiFinish("D3");
    expect(d3.target_Ra_um).toBeCloseTo(D3_RA, 3);
    expect(d3.requiresEDM).toBe(true);
    expect(d3.polishingRequired).toBeNull();
  });

  it("listSpiGrades returns 12 grades sorted ascending by Ra", () => {
    const grades = ENGINE.listSpiGrades();
    expect(grades.length).toBe(SPI_GRADE_COUNT);
    for (let i = 1; i < grades.length; i++) {
      expect(grades[i]?.target_Ra_um).toBeGreaterThanOrEqual(grades[i - 1]?.target_Ra_um ?? 0);
    }
  });

  it("listSpiGrades includes all 4 EDM grades (D1/D2/D3 require EDM, A1 does not)", () => {
    const grades = ENGINE.listSpiGrades();
    const edmGrades = grades.filter(g => g.requiresEDM).map(g => g.grade);
    expect(edmGrades).toEqual(expect.arrayContaining(["D1", "D2", "D3"]));
    expect(grades.find(g => g.grade === "A1")?.requiresEDM).toBe(false);
  });

  it("calculate() with EDM-required SPI grade emits process warning", () => {
    const r = ENGINE.calculate(input({ featureType: "cavity", spiGrade: "D2" }));
    expect(r.warnings.some(w => w.includes("EDM process required"))).toBe(true);
  });

  it("calculate() with polishing-required SPI grade emits polish-step warning", () => {
    const r = ENGINE.calculate(input({ featureType: "cavity", spiGrade: "A2" }));
    expect(r.warnings.some(w => w.includes("manual polishing required"))).toBe(true);
  });
});

describe("HyperMillMoldCycleEngine — getElectrodeKc11", () => {
  it("copper kc1.1 = 700 N/mm²", () => {
    expect(ENGINE.getElectrodeKc11("copper")).toBe(COPPER_KC11);
  });

  it("graphite kc1.1 = 500 N/mm² (lower than copper)", () => {
    expect(ENGINE.getElectrodeKc11("graphite")).toBe(GRAPHITE_KC11);
    expect(ENGINE.getElectrodeKc11("graphite")).toBeLessThan(ENGINE.getElectrodeKc11("copper"));
  });
});

describe("HyperMillMoldCycleEngine — tool size warnings", () => {
  it("tool diameter > 50% of smallest part dimension emits fit warning", () => {
    const r = ENGINE.calculate(input({
      featureType: "cavity", partLengthMm: 100, partWidthMm: 20, toolDiameterMm: 15,
    }));
    expect(r.warnings.some(w => w.includes("verify fit"))).toBe(true);
  });

  it("tool diameter ≤ 50% of smallest dim does NOT emit fit warning", () => {
    const r = ENGINE.calculate(input({
      featureType: "cavity", partLengthMm: 100, partWidthMm: 80, toolDiameterMm: 10,
    }));
    expect(r.warnings.some(w => w.includes("verify fit"))).toBe(false);
  });
});

describe("HyperMillMoldCycleEngine — confidence + source", () => {
  it("clean inputs (no warnings) produce confidence ≥ 0.9", () => {
    const r = ENGINE.calculate(input({
      featureType: "cavity", toolDiameterMm: 5, partLengthMm: 100, partWidthMm: 80, partDepthMm: 30,
    }));
    expect(r.confidence).toBeGreaterThanOrEqual(0.9);
  });

  it("warnings (but not unsupported) produce confidence ≈ 0.75", () => {
    const r = ENGINE.calculate(input({ featureType: "core" })); // missing parting line warning
    expect(r.confidence).toBeCloseTo(0.75, 2);
  });

  it("source attributes hyperMILL + SPI standard", () => {
    const r = ENGINE.calculate(input({}));
    expect(r.source).toContain("hypermill");
    expect(r.source).toContain("SPI");
  });
});

describe("HyperMillMoldCycleEngine — singleton + dispatcher round-trip", () => {
  it("singleton instance is reachable and produces identical results", () => {
    const r1 = ENGINE.calculate(input({ featureType: "cavity" }));
    const r2 = hyperMillMoldCycleEngine.calculate(input({ featureType: "cavity" }));
    expect(r2.cycleCode).toBe(r1.cycleCode);
    expect(r2.cavityPlan?.stepdownMm).toBe(r1.cavityPlan?.stepdownMm);
  });

  it("dispatcher exposes cam_hypermill_mold_cycle and cam_hypermill_mold_pipeline actions", async () => {
    const mod = await import("../tools/dispatchers/camDispatcher.js");
    expect(mod.ACTIONS).toContain("cam_hypermill_mold_cycle");
    expect(mod.ACTIONS).toContain("cam_hypermill_mold_pipeline");
  });

  it("engine reachable via dynamic-import path", async () => {
    const mod = await import("../engines/HyperMillMoldCycleEngine.js");
    const r = mod.hyperMillMoldCycleEngine.calculate(input({ featureType: "cavity" }));
    expect(r.featureType).toBe("cavity");
  });
});
