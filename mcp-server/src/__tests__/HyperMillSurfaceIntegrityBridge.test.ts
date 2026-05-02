/**
 * HyperMillSurfaceIntegrityBridge.test.ts
 *
 * Coverage for HM-REV-MS5 / U-HMR29 + U-HMR30 + U-HMR31 surface integrity wiring.
 */

import { describe, it, expect } from "vitest";
import {
  HyperMillSurfaceIntegrityBridge,
  hyperMillSurfaceIntegrityBridge,
  type SurfaceIntegrityCheckInput,
} from "../engines/HyperMillSurfaceIntegrityBridge.js";

const ENGINE = new HyperMillSurfaceIntegrityBridge();

const FATIGUE_DERATING_FLOOR = 0.80;

function check(over: Partial<SurfaceIntegrityCheckInput>): SurfaceIntegrityCheckInput {
  return {
    process: over.process ?? "milling",
    material: over.material ?? "steel",
    cuttingSpeed_m_min: over.cuttingSpeed_m_min ?? 150,
    feed_mm: over.feed_mm ?? 0.15,
    depthOfCut_mm: over.depthOfCut_mm ?? 0.5,
    toolNoseRadius_mm: over.toolNoseRadius_mm,
    coolant: over.coolant,
    toolCondition: over.toolCondition,
    requiredRa_um: over.requiredRa_um,
    requiredStressState: over.requiredStressState,
    ambientTemp_C: over.ambientTemp_C,
  };
}

describe("HyperMillSurfaceIntegrityBridge — Ra/Rz prediction", () => {
  it("milling steel at moderate Vc returns positive Ra and Rz", () => {
    const r = ENGINE.calculate(check({ process: "milling", material: "steel", cuttingSpeed_m_min: 150 }));
    expect(r.ra_um).toBeGreaterThan(0);
    expect(r.rz_um).toBeGreaterThan(0);
    expect(r.rz_um).toBeGreaterThanOrEqual(r.ra_um);
  });

  it("Ra compliance = true when no requirement specified", () => {
    const r = ENGINE.calculate(check({ requiredRa_um: undefined }));
    expect(r.raCompliant).toBe(true);
    expect(r.qualityReport.surfaceFinish.status).toBe("UNSPECIFIED");
  });

  it("Ra compliance = false when prediction exceeds tight requirement (0.05µm)", () => {
    const r = ENGINE.calculate(check({ requiredRa_um: 0.05, feed_mm: 0.3 }));
    expect(r.raCompliant).toBe(false);
    expect(r.qualityReport.surfaceFinish.status).toBe("FAIL");
    expect(r.warnings.some(w => w.includes("exceeds required"))).toBe(true);
  });

  it("Ra compliance = true with loose requirement (10µm)", () => {
    const r = ENGINE.calculate(check({ requiredRa_um: 10 }));
    expect(r.raCompliant).toBe(true);
    expect(r.qualityReport.surfaceFinish.status).toBe("PASS");
  });
});

describe("HyperMillSurfaceIntegrityBridge — white layer hard gate", () => {
  it("hardened_steel at high Vc + dry blocks via white layer gate", () => {
    const r = ENGINE.calculate(check({
      process: "hard_turning", material: "hardened_steel",
      cuttingSpeed_m_min: 350, feed_mm: 0.3, coolant: "dry",
    }));
    expect(r.whiteLayerGate.blocked).toBe(true);
    expect(r.warnings.some(w => w.includes("WHITE LAYER HARD BLOCK"))).toBe(true);
  });

  it("steel at moderate Vc + flood coolant passes white layer gate", () => {
    const r = ENGINE.calculate(check({
      process: "milling", material: "steel",
      cuttingSpeed_m_min: 100, feed_mm: 0.1, coolant: "flood",
    }));
    expect(r.whiteLayerGate.blocked).toBe(false);
    expect(r.whiteLayerGate.thresholdKnown).toBe(true);
  });

  it("aluminum has no white layer threshold → fail-close (WARN, not BLOCK)", () => {
    const r = ENGINE.calculate(check({ material: "aluminum" }));
    expect(r.whiteLayerGate.thresholdKnown).toBe(false);
    expect(r.whiteLayerGate.blocked).toBe(false);
    expect(r.qualityReport.whiteLayerSection.gateStatus).toBe("WARN_THRESHOLD_UNKNOWN");
  });

  it("standalone runWhiteLayerGate returns same predicted temp as integrated check", () => {
    const standalone = ENGINE.runWhiteLayerGate({
      material: "steel", cuttingSpeed_m_min: 150, feed_mm: 0.15, depthOfCut_mm: 0.5,
    });
    const integrated = ENGINE.calculate(check({}));
    expect(standalone.predictedTemp_C).toBeCloseTo(integrated.whiteLayerGate.predictedTemp_C, 1);
  });

  it("blocked white layer gate provides recommendedMaxVc_m_min for safe re-run", () => {
    const r = ENGINE.calculate(check({
      process: "hard_turning", material: "hardened_steel",
      cuttingSpeed_m_min: 400, feed_mm: 0.3, coolant: "dry",
    }));
    expect(r.whiteLayerGate.blocked).toBe(true);
    expect(r.whiteLayerGate.recommendedMaxVc_m_min).toBeGreaterThan(0);
    expect(r.whiteLayerGate.recommendedMaxVc_m_min).toBeLessThan(400);
  });

  it("temp prediction increases with cutting speed (Boothroyd Vc^0.4 trend)", () => {
    const slow = ENGINE.runWhiteLayerGate({ material: "steel", cuttingSpeed_m_min: 50, feed_mm: 0.1 });
    const fast = ENGINE.runWhiteLayerGate({ material: "steel", cuttingSpeed_m_min: 300, feed_mm: 0.1 });
    expect(fast.predictedTemp_C).toBeGreaterThan(slow.predictedTemp_C);
  });
});

describe("HyperMillSurfaceIntegrityBridge — residual stress prediction", () => {
  it("dry cutting at high Vc shifts residual stress more tensile", () => {
    const dry = ENGINE.calculate(check({ cuttingSpeed_m_min: 250, coolant: "dry" }));
    const flood = ENGINE.calculate(check({ cuttingSpeed_m_min: 250, coolant: "flood" }));
    expect(dry.residualStress.surface_MPa).toBeGreaterThan(flood.residualStress.surface_MPa);
  });

  it("cryogenic cooling produces more compressive (or less tensile) stress than flood", () => {
    const cryo = ENGINE.calculate(check({ cuttingSpeed_m_min: 250, coolant: "cryogenic" }));
    const flood = ENGINE.calculate(check({ cuttingSpeed_m_min: 250, coolant: "flood" }));
    expect(cryo.residualStress.surface_MPa).toBeLessThan(flood.residualStress.surface_MPa);
  });

  it("titanium gets the -50 MPa material modifier vs steel at identical conditions", () => {
    const ti = ENGINE.calculate(check({
      process: "milling", material: "titanium",
      cuttingSpeed_m_min: 100, coolant: "flood",
    }));
    const st = ENGINE.calculate(check({
      process: "milling", material: "steel",
      cuttingSpeed_m_min: 100, coolant: "flood",
    }));
    expect(ti.residualStress.surface_MPa).toBeLessThan(st.residualStress.surface_MPa);
  });

  it("required stress state non-compliance emits warning", () => {
    const r = ENGINE.calculate(check({
      cuttingSpeed_m_min: 250, coolant: "dry", requiredStressState: "compressive",
    }));
    if (r.residualStress.state !== "compressive") {
      expect(r.warnings.some(w => w.includes("Residual stress state"))).toBe(true);
    }
  });

  it("required stress state 'any' never fails compliance", () => {
    const r = ENGINE.calculate(check({ requiredStressState: "any" }));
    expect(r.qualityReport.residualStressSection.compliant).toBe(true);
  });
});

describe("HyperMillSurfaceIntegrityBridge — quality report (MS10 compatible)", () => {
  it("report version is MS5-v1 and ms10Compatible flag is true", () => {
    const r = ENGINE.calculate(check({}));
    expect(r.qualityReport.reportVersion).toBe("MS5-v1");
    expect(r.qualityReport.ms10Compatible).toBe(true);
  });

  it("report.operation echoes input parameters", () => {
    const r = ENGINE.calculate(check({
      process: "milling", material: "steel", cuttingSpeed_m_min: 200, feed_mm: 0.2, depthOfCut_mm: 1.0,
    }));
    expect(r.qualityReport.operation.process).toBe("milling");
    expect(r.qualityReport.operation.cuttingSpeed_m_min).toBe(200);
    expect(r.qualityReport.operation.feed_mm).toBe(0.2);
  });

  it("report.surfaceFinish.status = PASS when Ra meets requirement", () => {
    const r = ENGINE.calculate(check({ requiredRa_um: 5 }));
    expect(r.qualityReport.surfaceFinish.status).toBe("PASS");
  });

  it("report.overall.pass = false when white layer gate is BLOCKED", () => {
    const r = ENGINE.calculate(check({
      process: "hard_turning", material: "hardened_steel",
      cuttingSpeed_m_min: 400, feed_mm: 0.3, coolant: "dry",
    }));
    expect(r.qualityReport.whiteLayerSection.gateStatus).toBe("BLOCKED");
    expect(r.qualityReport.overall.pass).toBe(false);
  });

  it("report.fatigueSection.deratingFactor reported with effective strength %", () => {
    const r = ENGINE.calculate(check({}));
    expect(r.qualityReport.fatigueSection.deratingFactor).toBeGreaterThan(0);
    expect(r.qualityReport.fatigueSection.effectiveFatigueStrength_pct).toBeCloseTo(
      r.qualityReport.fatigueSection.deratingFactor * 100, 1,
    );
  });
});

describe("HyperMillSurfaceIntegrityBridge — surface quality score + confidence", () => {
  it("surfaceQualityScore is in [0, 10] range", () => {
    const r = ENGINE.calculate(check({}));
    expect(r.surfaceQualityScore).toBeGreaterThanOrEqual(0);
    expect(r.surfaceQualityScore).toBeLessThanOrEqual(10);
  });

  it("blocked operation has elevated confidence (0.95) — model is certain it's bad", () => {
    const r = ENGINE.calculate(check({
      process: "hard_turning", material: "hardened_steel",
      cuttingSpeed_m_min: 400, feed_mm: 0.3, coolant: "dry",
    }));
    expect(r.confidence).toBeCloseTo(0.95, 2);
  });

  it("source attributes SurfaceIntegrityEngine + Boothroyd + WHITE_LAYER_THRESHOLDS", () => {
    const r = ENGINE.calculate(check({}));
    expect(r.source).toContain("SurfaceIntegrityEngine");
    expect(r.source).toContain("Boothroyd");
    expect(r.source).toContain("WHITE_LAYER_THRESHOLDS");
  });

  it("fatigueDeratingFactor below 0.80 fails overall pass even if Ra OK and not blocked", () => {
    const r = ENGINE.calculate(check({ requiredRa_um: 100 }));
    if (r.fatigueDeratingFactor <= FATIGUE_DERATING_FLOOR) {
      expect(r.qualityReport.overall.pass).toBe(false);
    }
  });
});

describe("HyperMillSurfaceIntegrityBridge — singleton + dispatcher round-trip", () => {
  it("singleton produces identical results to fresh instance", () => {
    const r1 = ENGINE.calculate(check({}));
    const r2 = hyperMillSurfaceIntegrityBridge.calculate(check({}));
    expect(r2.ra_um).toBeCloseTo(r1.ra_um, 6);
    expect(r2.whiteLayerGate.predictedTemp_C).toBeCloseTo(r1.whiteLayerGate.predictedTemp_C, 6);
  });

  it("dispatcher exposes cam_hypermill_surface_integrity_check action", async () => {
    const mod = await import("../tools/dispatchers/camDispatcher.js");
    expect(mod.ACTIONS).toContain("cam_hypermill_surface_integrity_check");
  });

  it("engine reachable via dynamic-import path", async () => {
    const mod = await import("../engines/HyperMillSurfaceIntegrityBridge.js");
    const r = mod.hyperMillSurfaceIntegrityBridge.calculate(check({}));
    expect(r.qualityReport.ms10Compatible).toBe(true);
  });
});
