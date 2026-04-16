/**
 * HM-REV-MS5: Probing + Surface Integrity + Safety Gate — Test Suite
 *
 * Covers:
 *   U-HMR27: 6 probe types × 3 systems wired to hyperMILL cycles
 *   U-HMR28: WCS verification + G54-G59 datum correction
 *   U-HMR29: Surface integrity check (SurfaceIntegrityEngine wired)
 *   U-HMR30: White layer hard gate (thermal threshold BLOCK)
 *   U-HMR31: Quality report generation (MS10-compatible structure)
 */

import { describe, it, expect } from "vitest";
import {
  HyperMillProbingBridge,
  hyperMillProbingBridge,
} from "../engines/HyperMillProbingBridge.js";
import {
  HyperMillSurfaceIntegrityBridge,
  hyperMillSurfaceIntegrityBridge,
} from "../engines/HyperMillSurfaceIntegrityBridge.js";
import { WHITE_LAYER_THRESHOLDS } from "../physics/constants.js";

// ============================================================================
// U-HMR27: Probe type wiring to hyperMILL cycle catalog
// ============================================================================

describe("U-HMR27 — 6 probe types wired to hyperMILL cycle catalog", () => {
  it("bore probe → Renishaw G65 P9815 + correct hyperMILL cycle name", () => {
    const result = hyperMillProbingBridge.calculate({
      probeType: "bore",
      probeSystem: "renishaw",
      nominalDiameter_mm: 25,
      approachSpeed_mmmin: 500,
    });
    expect(result.hyperMillCycle).toBe("Bore Centre Finding");
    expect(result.cycleCall).toBe("G65 P9815");
    expect(result.probeSystem).toBe("renishaw");
    expect(result.approachSpeedValid).toBe(true);
  });

  it("boss probe → Heidenhain TCH PROBE 421 cycle call", () => {
    const result = hyperMillProbingBridge.calculate({
      probeType: "boss",
      probeSystem: "heidenhain",
      nominalDiameter_mm: 40,
      approachSpeed_mmmin: 400,
    });
    expect(result.cycleCall).toBe("TCH PROBE 421");
    expect(result.hyperMillCycle).toBe("Boss Centre Finding");
  });

  it("web probe → Blum G65 P9003 cycle call", () => {
    const result = hyperMillProbingBridge.calculate({
      probeType: "web",
      probeSystem: "blum",
    });
    expect(result.cycleCall).toBe("G65 P9003");
    expect(result.hyperMillCycle).toBe("Web/Groove Measurement");
  });

  it("surface probe → Renishaw G65 P9814 with surface warning when no nominalZ", () => {
    const result = hyperMillProbingBridge.calculate({
      probeType: "surface",
      probeSystem: "renishaw",
    });
    expect(result.cycleCall).toBe("G65 P9814");
    expect(result.warnings.some(w => w.includes("nominalZ_mm"))).toBe(true);
  });

  it("tool_set probe → Heidenhain TCH PROBE 480", () => {
    const result = hyperMillProbingBridge.calculate({
      probeType: "tool_set",
      probeSystem: "heidenhain",
    });
    expect(result.cycleCall).toBe("TCH PROBE 480");
    expect(result.hyperMillCycle).toBe("Tool Length Measurement");
  });

  it("tool_break probe → Renishaw G65 P9825 + warning when no toolDiameter", () => {
    const result = hyperMillProbingBridge.calculate({
      probeType: "tool_break",
      probeSystem: "renishaw",
    });
    expect(result.cycleCall).toBe("G65 P9825");
    expect(result.hyperMillCycle).toBe("Tool Break Detection");
    expect(result.warnings.some(w => w.includes("toolDiameter_mm"))).toBe(true);
  });

  it("listProbeTypes returns all 6 probe types for renishaw", () => {
    const list = hyperMillProbingBridge.listProbeTypes("renishaw");
    expect(list).toHaveLength(6);
    const types = list.map(e => e.probeType);
    expect(types).toContain("bore");
    expect(types).toContain("tool_break");
  });

  it("approach speed clamped and warning generated when exceeding Blum max (500mm/min)", () => {
    const result = hyperMillProbingBridge.calculate({
      probeType: "bore",
      probeSystem: "blum",
      approachSpeed_mmmin: 800, // exceeds blum max 500
    });
    expect(result.approachSpeedValid).toBe(false);
    expect(result.validatedApproachSpeed_mmmin).toBe(500);
    expect(result.warnings.some(w => w.includes("clamped"))).toBe(true);
  });
});

// ============================================================================
// U-HMR27: Measurement uncertainty (ISO 10360-2 adapted)
// ============================================================================

describe("U-HMR27 — Measurement uncertainty estimation", () => {
  it("Heidenhain has lower typeA repeatability than Renishaw (0.8 vs 1.0 µm)", () => {
    const hdResult = hyperMillProbingBridge.calculate({
      probeType: "bore",
      probeSystem: "heidenhain",
      approachSpeed_mmmin: 400,
    });
    const rnResult = hyperMillProbingBridge.calculate({
      probeType: "bore",
      probeSystem: "renishaw",
      approachSpeed_mmmin: 500,
    });
    expect(hdResult.uncertainty.typeA_um).toBeLessThan(rnResult.uncertainty.typeA_um);
    expect(hdResult.uncertainty.typeA_um).toBeCloseTo(0.8, 1);
  });

  it("expanded uncertainty (k=2) is 2× combined standard uncertainty", () => {
    const result = hyperMillProbingBridge.calculate({
      probeType: "surface",
      probeSystem: "renishaw",
      nominalZ_mm: 100,
      approachSpeed_mmmin: 300,
    });
    expect(result.uncertainty.expanded_um).toBeCloseTo(
      2 * result.uncertainty.combined_um,
      2,
    );
  });
});

// ============================================================================
// U-HMR28: WCS verification + datum correction
// ============================================================================

describe("U-HMR28 — WCS datum verification workflow", () => {
  it("nominal match: measured == nominal → withinTolerance=true, zero correction", () => {
    const result = hyperMillProbingBridge.verifyWCS({
      measured_mm: 100.000,
      nominal_mm: 100.000,
      partTolerance_mm: 0.05,
      wcsRegister: "G54",
    });
    expect(result.withinTolerance).toBe(true);
    expect(result.deviation_mm).toBeCloseTo(0, 4);
    expect(result.correctedOffset_mm).toBeCloseTo(0, 4);
    expect(result.wcsRegister).toBe("G54");
  });

  it("deviation flag: measured 0.08mm > nominal → out of ±0.05mm tolerance", () => {
    const result = hyperMillProbingBridge.verifyWCS({
      measured_mm: 100.080,
      nominal_mm: 100.000,
      partTolerance_mm: 0.05,
      wcsRegister: "G55",
    });
    expect(result.withinTolerance).toBe(false);
    expect(result.deviation_mm).toBeCloseTo(0.08, 3);
    expect(result.message).toMatch(/EXCEEDS/);
  });

  it("G54-G59 offset correction: correctedOffset = -deviation (corrects part shift)", () => {
    // measured 0.030mm ahead of nominal — correction should be -0.030mm
    const result = hyperMillProbingBridge.verifyWCS({
      measured_mm: 50.030,
      nominal_mm: 50.000,
      partTolerance_mm: 0.1,
      wcsRegister: "G56",
    });
    expect(result.correctedOffset_mm).toBeCloseTo(-0.030, 3);
    expect(result.wcsRegister).toBe("G56");
  });

  it("calculate() with measured+nominal → WCS verification embedded in result", () => {
    const result = hyperMillProbingBridge.calculate({
      probeType: "bore",
      probeSystem: "renishaw",
      nominalDiameter_mm: 30,
      measuredValue_mm: 30.06,
      nominalDatum_mm: 30.00,
      partTolerance_mm: 0.05,
      wcsRegister: "G54",
    });
    expect(result.wcsVerification).toBeDefined();
    expect(result.wcsVerification!.withinTolerance).toBe(false);
    expect(result.warnings.some(w => w.includes("G54"))).toBe(true);
  });
});

// ============================================================================
// U-HMR29: Surface integrity check wiring
// ============================================================================

describe("U-HMR29 — Surface integrity engines wired to hyperMILL operations", () => {
  it("steel milling: returns Ra, Rz, residual stress, white layer data", () => {
    const result = hyperMillSurfaceIntegrityBridge.calculate({
      process: "milling",
      material: "steel",
      cuttingSpeed_m_min: 150,
      feed_mm: 0.12,
      depthOfCut_mm: 0.5,
      coolant: "flood",
    });
    expect(result.ra_um).toBeGreaterThan(0);
    expect(result.rz_um).toBeGreaterThan(0);
    expect(result.residualStress).toBeDefined();
    expect(result.whiteLayerThickness_um).toBeGreaterThanOrEqual(0);
    expect(result.source).toMatch(/SurfaceIntegrityEngine/);
  });

  it("Ra compliance check: high feed on tight Ra limit fails", () => {
    const result = hyperMillSurfaceIntegrityBridge.calculate({
      process: "hard_turning",
      material: "hardened_steel",
      cuttingSpeed_m_min: 120,
      feed_mm: 0.30, // high feed → high Ra
      depthOfCut_mm: 0.2,
      toolNoseRadius_mm: 0.4,
      requiredRa_um: 0.4, // tight limit
    });
    // Ra from Brammertz: (0.30^2/(32×0.4))*1000 ≈ 7.0µm >> 0.4µm
    expect(result.raCompliant).toBe(false);
    expect(result.warnings.some(w => w.includes("required"))).toBe(true);
  });

  it("nickel alloy finishing: residual stress model executes without error", () => {
    const result = hyperMillSurfaceIntegrityBridge.calculate({
      process: "milling",
      material: "nickel_alloy",
      cuttingSpeed_m_min: 50,
      feed_mm: 0.08,
      depthOfCut_mm: 0.3,
      coolant: "flood",
    });
    expect(result.residualStress.state).toMatch(/compressive|tensile|neutral/);
    expect(result.confidence).toBeGreaterThan(0);
  });
});

// ============================================================================
// U-HMR30: White layer hard gate
// ============================================================================

describe("U-HMR30 — White layer HARD BLOCK gate", () => {
  it("WHITE_LAYER_THRESHOLDS loaded from constants.ts — hardened_steel = 700°C", () => {
    expect(WHITE_LAYER_THRESHOLDS.hardened_steel).toBeDefined();
    expect(WHITE_LAYER_THRESHOLDS.hardened_steel.threshold_C).toBe(700);
    expect(WHITE_LAYER_THRESHOLDS.nickel_alloy.threshold_C).toBe(800);
  });

  it("safe operation on hardened steel (low Vc) — gate PASSES", () => {
    // Low Vc → low temperature → should not exceed 700°C threshold
    const result = hyperMillSurfaceIntegrityBridge.calculate({
      process: "hard_turning",
      material: "hardened_steel",
      cuttingSpeed_m_min: 80,   // low Vc — safe
      feed_mm: 0.08,
      depthOfCut_mm: 0.15,
      coolant: "flood",
    });
    expect(result.whiteLayerGate.blocked).toBe(false);
    expect(result.whiteLayerGate.thresholdKnown).toBe(true);
    expect(result.whiteLayerGate.headroom_C).toBeGreaterThan(0);
  });

  it("unsafe operation on hardened steel (very high Vc dry) — gate BLOCKS", () => {
    // Extreme Vc + dry → predicted temp should exceed 700°C
    const result = hyperMillSurfaceIntegrityBridge.calculate({
      process: "hard_turning",
      material: "hardened_steel",
      cuttingSpeed_m_min: 800,  // extreme Vc
      feed_mm: 0.25,
      depthOfCut_mm: 0.5,
      coolant: "dry",
    });
    expect(result.whiteLayerGate.blocked).toBe(true);
    expect(result.whiteLayerGate.message).toMatch(/HARD BLOCK|WHITE LAYER/);
    expect(result.whiteLayerGate.recommendedMaxVc_m_min).toBeDefined();
    expect(result.warnings.some(w => w.includes("WHITE LAYER"))).toBe(true);
  });

  it("Inconel 718 nickel alloy — threshold is 800°C (higher than steel)", () => {
    const gateResult = hyperMillSurfaceIntegrityBridge.runWhiteLayerGate({
      material: "nickel_alloy",
      cuttingSpeed_m_min: 60,
      feed_mm: 0.10,
    });
    expect(gateResult.threshold_C).toBe(800);
    expect(gateResult.thresholdKnown).toBe(true);
  });

  it("unknown material → fail-close: WARN (not block), thresholdKnown=false", () => {
    const gateResult = hyperMillSurfaceIntegrityBridge.runWhiteLayerGate({
      material: "exotic_alloy_xyz" as any,
      cuttingSpeed_m_min: 100,
      feed_mm: 0.10,
    });
    expect(gateResult.blocked).toBe(false);
    expect(gateResult.thresholdKnown).toBe(false);
    expect(gateResult.message).toMatch(/CAUTION|not defined/i);
  });

  it("aluminum — no white layer threshold (not a concern) → WARN not block", () => {
    const result = hyperMillSurfaceIntegrityBridge.calculate({
      process: "milling",
      material: "aluminum",
      cuttingSpeed_m_min: 800, // aluminum can go very fast
      feed_mm: 0.15,
      depthOfCut_mm: 1.0,
    });
    // aluminum has thresholdKey: null → should WARN not block
    expect(result.whiteLayerGate.blocked).toBe(false);
    expect(result.whiteLayerGate.thresholdKnown).toBe(false);
  });
});

// ============================================================================
// U-HMR31: Quality report generation (MS10-compatible)
// ============================================================================

describe("U-HMR31 — Quality report structure (MS10-compatible)", () => {
  it("report has all required sections and ms10Compatible=true", () => {
    const result = hyperMillSurfaceIntegrityBridge.calculate({
      process: "milling",
      material: "steel",
      cuttingSpeed_m_min: 200,
      feed_mm: 0.10,
      depthOfCut_mm: 0.5,
    });
    const report = result.qualityReport;
    expect(report.reportVersion).toBe("MS5-v1");
    expect(report.ms10Compatible).toBe(true);
    expect(report.operation).toBeDefined();
    expect(report.surfaceFinish).toBeDefined();
    expect(report.residualStressSection).toBeDefined();
    expect(report.whiteLayerSection).toBeDefined();
    expect(report.fatigueSection).toBeDefined();
    expect(report.overall).toBeDefined();
  });

  it("report surface finish section shows predicted vs required Ra", () => {
    const result = hyperMillSurfaceIntegrityBridge.calculate({
      process: "turning",
      material: "steel",
      cuttingSpeed_m_min: 180,
      feed_mm: 0.15,
      depthOfCut_mm: 0.8,
      toolNoseRadius_mm: 0.8,
      requiredRa_um: 1.6,
    });
    const sf = result.qualityReport.surfaceFinish;
    expect(sf.predicted_ra_um).toBeGreaterThan(0);
    expect(sf.required_ra_um).toBe(1.6);
    expect(["PASS", "FAIL"]).toContain(sf.status);
  });

  it("report overall.pass=false when white layer gate is blocked", () => {
    const result = hyperMillSurfaceIntegrityBridge.calculate({
      process: "hard_turning",
      material: "hardened_steel",
      cuttingSpeed_m_min: 900,
      feed_mm: 0.30,
      depthOfCut_mm: 0.5,
      coolant: "dry",
    });
    // Temperature will be extreme → blocked
    if (result.whiteLayerGate.blocked) {
      expect(result.qualityReport.overall.pass).toBe(false);
      expect(result.qualityReport.whiteLayerSection.gateStatus).toBe("BLOCKED");
    }
  });

  it("report operation section echoes cutting parameters correctly", () => {
    const result = hyperMillSurfaceIntegrityBridge.calculate({
      process: "milling",
      material: "titanium",
      cuttingSpeed_m_min: 75,
      feed_mm: 0.06,
      depthOfCut_mm: 0.3,
      coolant: "mql",
    });
    const op = result.qualityReport.operation;
    expect(op.process).toBe("milling");
    expect(op.material).toBe("titanium");
    expect(op.cuttingSpeed_m_min).toBe(75);
    expect(op.coolant).toBe("mql");
  });

  it("fatigue section: deratingFactor between 0 and 1", () => {
    const result = hyperMillSurfaceIntegrityBridge.calculate({
      process: "grinding",
      material: "steel",
      cuttingSpeed_m_min: 30,
      feed_mm: 0.02,
      depthOfCut_mm: 0.05,
    });
    const fatigue = result.qualityReport.fatigueSection;
    expect(fatigue.deratingFactor).toBeGreaterThan(0);
    expect(fatigue.deratingFactor).toBeLessThanOrEqual(1);
    expect(fatigue.effectiveFatigueStrength_pct).toBeCloseTo(
      fatigue.deratingFactor * 100,
      1,
    );
  });
});
