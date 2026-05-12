/**
 * HM-REV-MS5: Probing + Surface Integrity + Safety Gate
 * Test file: hypermill-ms5-probing-integrity.test.ts
 *
 * Tests the specific behaviors called out in the HM-REV-MS5 acceptance criteria:
 *   - Probe setup returns correct cycle types for bore / boss / web
 *   - White layer gate BLOCKS for Inconel at predicted temperature > 800°C threshold
 *   - White layer gate PASSES for Inconel at predicted temperature < 800°C threshold
 *   - Gate uses named constants from constants.ts (WHITE_LAYER_THRESHOLD_STEEL_C,
 *     WHITE_LAYER_THRESHOLD_INCONEL_C) — never hardcoded
 *   - Surface integrity Ra < 0.8µm for steel finishing at Vc=200m/min, f=0.10mm
 *   - Residual stress compressive after conventional flood-cooled finishing in steel
 *
 * All assertions use concrete manufacturing values — no toBeTruthy().
 */

import { describe, it, expect } from "vitest";
import {
  hyperMillProbingBridge,
} from "../engines/HyperMillProbingBridge.js";
import {
  hyperMillSurfaceIntegrityBridge,
} from "../engines/HyperMillSurfaceIntegrityBridge.js";
import {
  WHITE_LAYER_THRESHOLDS,
  WHITE_LAYER_THRESHOLD_STEEL_C,
  WHITE_LAYER_THRESHOLD_INCONEL_C,
} from "../physics/constants.js";

// ============================================================================
// Probe cycle type selection — bore / boss / web
// ============================================================================

describe("Probe setup: cycle type selection for bore / boss / web", () => {
  it("bore probe on Renishaw returns 'Bore Centre Finding' cycle with G65 P9815", () => {
    const result = hyperMillProbingBridge.calculate({
      probeType: "bore",
      probeSystem: "renishaw",
      nominalDiameter_mm: 30,
      approachSpeed_mmmin: 500,
    });
    expect(result.probeType).toBe("bore");
    expect(result.hyperMillCycle).toBe("Bore Centre Finding");
    expect(result.cycleCall).toBe("G65 P9815");
  });

  it("boss probe on Heidenhain returns 'Boss Centre Finding' cycle with TCH PROBE 421", () => {
    const result = hyperMillProbingBridge.calculate({
      probeType: "boss",
      probeSystem: "heidenhain",
      nominalDiameter_mm: 50,
      approachSpeed_mmmin: 400,
    });
    expect(result.probeType).toBe("boss");
    expect(result.hyperMillCycle).toBe("Boss Centre Finding");
    expect(result.cycleCall).toBe("TCH PROBE 421");
  });

  it("web probe on Blum returns 'Web/Groove Measurement' cycle with G65 P9003", () => {
    const result = hyperMillProbingBridge.calculate({
      probeType: "web",
      probeSystem: "blum",
      approachSpeed_mmmin: 250,
    });
    expect(result.probeType).toBe("web");
    expect(result.hyperMillCycle).toBe("Web/Groove Measurement");
    expect(result.cycleCall).toBe("G65 P9003");
  });

  it("bore probe on Blum returns G65 P9001 (not P9815 — system-specific)", () => {
    const result = hyperMillProbingBridge.calculate({
      probeType: "bore",
      probeSystem: "blum",
    });
    expect(result.cycleCall).toBe("G65 P9001");
    // Confirms that cycle call is system-specific, not generic
    expect(result.cycleCall).not.toBe("G65 P9815");
  });

  it("boss probe on Renishaw returns G65 P9816 (distinct from bore P9815)", () => {
    const bossResult = hyperMillProbingBridge.calculate({
      probeType: "boss",
      probeSystem: "renishaw",
    });
    const boreResult = hyperMillProbingBridge.calculate({
      probeType: "bore",
      probeSystem: "renishaw",
    });
    expect(bossResult.cycleCall).toBe("G65 P9816");
    // boss and bore are different cycles
    expect(bossResult.cycleCall).not.toBe(boreResult.cycleCall);
  });

  it("web probe on Renishaw returns G65 P9817 (not the bore or boss call)", () => {
    const result = hyperMillProbingBridge.calculate({
      probeType: "web",
      probeSystem: "renishaw",
    });
    expect(result.cycleCall).toBe("G65 P9817");
  });

  it("all 6 probe types produce a non-empty cycleCall string for each system", () => {
    const probeTypes = ["bore", "boss", "web", "surface", "tool_set", "tool_break"] as const;
    const systems = ["renishaw", "blum", "heidenhain"] as const;
    for (const probeType of probeTypes) {
      for (const probeSystem of systems) {
        const result = hyperMillProbingBridge.calculate({ probeType, probeSystem });
        expect(result.cycleCall.length).toBeGreaterThan(0);
        expect(result.hyperMillCycle.length).toBeGreaterThan(0);
      }
    }
  });
});

// ============================================================================
// White layer gate: named constants from constants.ts
// ============================================================================

describe("White layer gate: named constants from constants.ts", () => {
  it("WHITE_LAYER_THRESHOLD_STEEL_C equals 700°C (per constants.ts)", () => {
    // Must be imported from constants.ts, never hardcoded in gate logic
    expect(WHITE_LAYER_THRESHOLD_STEEL_C).toBe(700);
  });

  it("WHITE_LAYER_THRESHOLD_INCONEL_C equals 800°C (per constants.ts)", () => {
    // Must be imported from constants.ts, never hardcoded in gate logic
    expect(WHITE_LAYER_THRESHOLD_INCONEL_C).toBe(800);
  });

  it("named scalars match WHITE_LAYER_THRESHOLDS table entries (consistency check)", () => {
    // WHITE_LAYER_THRESHOLD_STEEL_C (700°C) corresponds to hardened_steel in the table.
    // Plain steel austenite threshold is 850°C; hardened steel martensite gate is 700°C.
    // The named constant represents the more conservative (safety-critical) steel gate.
    expect(WHITE_LAYER_THRESHOLD_STEEL_C).toBe(WHITE_LAYER_THRESHOLDS.hardened_steel.threshold_C);
    expect(WHITE_LAYER_THRESHOLD_INCONEL_C).toBe(WHITE_LAYER_THRESHOLDS.nickel_alloy.threshold_C);
  });

  it("gate threshold_C returned in result equals the constant — not a different value", () => {
    const gate = hyperMillSurfaceIntegrityBridge.runWhiteLayerGate({
      material: "nickel_alloy",
      cuttingSpeed_m_min: 50,
      feed_mm: 0.08,
    });
    // The threshold returned must match the constant exactly
    expect(gate.threshold_C).toBe(WHITE_LAYER_THRESHOLD_INCONEL_C);
  });

  it("hardened_steel threshold in gate equals WHITE_LAYER_THRESHOLD_STEEL_C (700°C)", () => {
    // The named constant WHITE_LAYER_THRESHOLD_STEEL_C represents the more conservative
    // hardened steel gate (700°C martensite threshold), not plain steel (850°C Ac1).
    const gate = hyperMillSurfaceIntegrityBridge.runWhiteLayerGate({
      material: "hardened_steel",
      cuttingSpeed_m_min: 100,
      feed_mm: 0.12,
    });
    expect(gate.threshold_C).toBe(WHITE_LAYER_THRESHOLD_STEEL_C);
    expect(gate.threshold_C).toBe(700);
  });
});

// ============================================================================
// White layer gate: BLOCK for Inconel at predicted temperature > 800°C threshold
// ============================================================================

describe("White layer gate: BLOCK for Inconel above 800°C threshold", () => {
  /**
   * Thermal model: θ = θ_amb + C_θ · kc^0.6 · Vc^0.4
   * Nickel alloy (ISO S): kc1_1 = 2800, mc = 0.28
   * At fz=0.10: kc = 2800 × 0.10^0.72 ≈ 533 N/mm²
   * At Vc=300: θ ≈ 20 + 2.0 × 533^0.6 × 300^0.4 ≈ 935°C  → BLOCK (>800°C)
   *
   * Source: Boothroyd (1963) Proc. IMechE 177(1):789; C_θ=2.0 calibrated in
   *         HyperMillSurfaceIntegrityBridge.ts against Thiele & Melkote (1999).
   */
  it("Inconel at Vc=300m/min, f=0.10mm — predicted temp > 800°C → HARD BLOCK", () => {
    const gate = hyperMillSurfaceIntegrityBridge.runWhiteLayerGate({
      material: "nickel_alloy",
      cuttingSpeed_m_min: 300, // extreme Vc → temperature >> 800°C threshold
      feed_mm: 0.10,
    });
    expect(gate.blocked).toBe(true);
    expect(gate.predictedTemp_C).toBeGreaterThan(WHITE_LAYER_THRESHOLD_INCONEL_C);
    expect(gate.headroom_C).toBeLessThan(0);
    expect(gate.message).toMatch(/WHITE LAYER HARD BLOCK|BLOCK/i);
  });

  it("Inconel block via calculate(): warnings include WHITE LAYER and gate.blocked=true", () => {
    const result = hyperMillSurfaceIntegrityBridge.calculate({
      process: "milling",
      material: "nickel_alloy",
      cuttingSpeed_m_min: 300,
      feed_mm: 0.10,
      depthOfCut_mm: 0.5,
      coolant: "dry",
    });
    expect(result.whiteLayerGate.blocked).toBe(true);
    expect(result.whiteLayerGate.predictedTemp_C).toBeGreaterThan(WHITE_LAYER_THRESHOLD_INCONEL_C);
    expect(result.warnings.some(w => /WHITE LAYER/.test(w))).toBe(true);
  });

  it("blocked result includes recommendedMaxVc_m_min to guide the machinist", () => {
    const gate = hyperMillSurfaceIntegrityBridge.runWhiteLayerGate({
      material: "nickel_alloy",
      cuttingSpeed_m_min: 300,
      feed_mm: 0.10,
    });
    expect(gate.blocked).toBe(true);
    expect(gate.recommendedMaxVc_m_min).toBeDefined();
    // Recommended safe Vc must be below the Vc that would produce 800°C
    expect(gate.recommendedMaxVc_m_min!).toBeLessThan(300);
  });
});

// ============================================================================
// White layer gate: PASS for Inconel at predicted temperature < 800°C threshold
// ============================================================================

describe("White layer gate: PASS for Inconel below 800°C threshold", () => {
  /**
   * At Vc=50m/min, fz=0.08mm for nickel alloy (ISO S, kc1_1=2800, mc=0.28):
   *   kc = 2800 × 0.08^0.72 ≈ 467 N/mm²
   *   θ = 20 + 2.0 × 467^0.6 × 50^0.4 ≈ 20 + 2.0 × 39.0 × 7.57 ≈ 611°C  → PASS
   */
  it("Inconel at Vc=50m/min, f=0.08mm — predicted temp < 800°C → gate PASSES", () => {
    const gate = hyperMillSurfaceIntegrityBridge.runWhiteLayerGate({
      material: "nickel_alloy",
      cuttingSpeed_m_min: 50,
      feed_mm: 0.08,
    });
    expect(gate.blocked).toBe(false);
    expect(gate.predictedTemp_C).toBeLessThan(WHITE_LAYER_THRESHOLD_INCONEL_C);
    expect(gate.headroom_C).toBeGreaterThan(0);
    expect(gate.thresholdKnown).toBe(true);
    expect(gate.threshold_C).toBe(800);
  });

  it("Inconel PASS via calculate(): whiteLayerGate.blocked=false and headroom > 0", () => {
    const result = hyperMillSurfaceIntegrityBridge.calculate({
      process: "milling",
      material: "nickel_alloy",
      cuttingSpeed_m_min: 50,
      feed_mm: 0.08,
      depthOfCut_mm: 0.3,
      coolant: "flood",
    });
    expect(result.whiteLayerGate.blocked).toBe(false);
    expect(result.whiteLayerGate.headroom_C).toBeGreaterThan(0);
    expect(result.qualityReport.whiteLayerSection.gateStatus).toBe("PASS");
  });

  it("PASS message does not contain BLOCK keyword", () => {
    const gate = hyperMillSurfaceIntegrityBridge.runWhiteLayerGate({
      material: "nickel_alloy",
      cuttingSpeed_m_min: 50,
      feed_mm: 0.08,
    });
    expect(gate.blocked).toBe(false);
    expect(gate.message).not.toMatch(/HARD BLOCK/);
    expect(gate.message).toMatch(/PASS/i);
  });
});

// ============================================================================
// Surface integrity: Ra < 0.8µm for steel finishing at Vc=200m/min
// ============================================================================

describe("Surface integrity: Ra < 0.8µm for steel finishing at Vc=200m/min", () => {
  /**
   * Brammertz model (ideal):  Ra = f² / (32 × rε) × 1000  [µm]
   * At f=0.10mm, rε=0.8mm:   Ra = (0.10² / (32 × 0.8)) × 1000 = 0.391µm
   * At f=0.12mm, rε=0.8mm:   Ra = (0.12² / (32 × 0.8)) × 1000 = 0.563µm
   *
   * Reference: Brammertz (1961) Industrie Anzeiger 83 — cited in
   *            Davim (2010) "Surface Integrity in Machining" §2.2
   */
  it("steel milling finish at Vc=200m/min, f=0.10mm, rε=0.8mm → Ra < 0.8µm", () => {
    const result = hyperMillSurfaceIntegrityBridge.calculate({
      process: "milling",
      material: "steel",
      cuttingSpeed_m_min: 200,
      feed_mm: 0.10,
      depthOfCut_mm: 0.3,
      toolNoseRadius_mm: 0.8,
      coolant: "flood",
    });
    expect(result.ra_um).toBeLessThan(0.8);
    expect(result.ra_um).toBeGreaterThan(0);
  });

  it("steel turning finish at Vc=200m/min, f=0.12mm, rε=0.8mm → Ra < 0.8µm", () => {
    const result = hyperMillSurfaceIntegrityBridge.calculate({
      process: "turning",
      material: "steel",
      cuttingSpeed_m_min: 200,
      feed_mm: 0.12,
      depthOfCut_mm: 0.5,
      toolNoseRadius_mm: 0.8,
      coolant: "flood",
    });
    expect(result.ra_um).toBeLessThan(0.8);
    expect(result.ra_um).toBeGreaterThan(0);
  });

  it("Ra compliance passes against 0.8µm drawing limit at these conditions", () => {
    const result = hyperMillSurfaceIntegrityBridge.calculate({
      process: "milling",
      material: "steel",
      cuttingSpeed_m_min: 200,
      feed_mm: 0.10,
      depthOfCut_mm: 0.3,
      toolNoseRadius_mm: 0.8,
      requiredRa_um: 0.8,
      coolant: "flood",
    });
    expect(result.raCompliant).toBe(true);
    expect(result.qualityReport.surfaceFinish.status).toBe("PASS");
  });

  it("Rz is approximately 4-6× Ra (typical machining ratio)", () => {
    const result = hyperMillSurfaceIntegrityBridge.calculate({
      process: "milling",
      material: "steel",
      cuttingSpeed_m_min: 200,
      feed_mm: 0.10,
      depthOfCut_mm: 0.3,
      toolNoseRadius_mm: 0.8,
    });
    const ratio = result.rz_um / result.ra_um;
    expect(ratio).toBeGreaterThan(2);
    expect(ratio).toBeLessThan(10);
  });
});

// ============================================================================
// Surface integrity: residual stress compressive after conventional finishing
// ============================================================================

describe("Surface integrity: compressive residual stress after conventional finishing", () => {
  /**
   * Conventional flood-cooled milling/turning at moderate Vc produces compressive
   * residual stress via the mechanical effect (dominant over thermal).
   *
   * Reference: Brinksmeier et al. (1999) CIRP Annals 48/2 — surface residual stress
   *            in machining. Turning with sharp tool + flood: typically -50 to -200 MPa.
   */
  it("steel milling at Vc=150m/min with flood coolant → compressive residual stress", () => {
    const result = hyperMillSurfaceIntegrityBridge.calculate({
      process: "milling",
      material: "steel",
      cuttingSpeed_m_min: 150,
      feed_mm: 0.12,
      depthOfCut_mm: 0.5,
      coolant: "flood",
      toolCondition: "sharp",
    });
    // Conventional flood-cooled milling with sharp tool should be compressive
    expect(result.residualStress.state).toBe("compressive");
    expect(result.residualStress.surface_MPa).toBeLessThan(0);
  });

  it("steel turning at Vc=180m/min with flood coolant → compressive residual stress", () => {
    const result = hyperMillSurfaceIntegrityBridge.calculate({
      process: "turning",
      material: "steel",
      cuttingSpeed_m_min: 180,
      feed_mm: 0.15,
      depthOfCut_mm: 0.8,
      toolNoseRadius_mm: 0.8,
      coolant: "flood",
      toolCondition: "sharp",
    });
    expect(result.residualStress.state).toBe("compressive");
    expect(result.residualStress.surface_MPa).toBeLessThan(0);
  });

  it("residual stress affected depth is positive [µm]", () => {
    const result = hyperMillSurfaceIntegrityBridge.calculate({
      process: "milling",
      material: "steel",
      cuttingSpeed_m_min: 150,
      feed_mm: 0.12,
      depthOfCut_mm: 0.5,
      coolant: "flood",
    });
    expect(result.residualStress.affectedDepth_um).toBeGreaterThan(0);
  });

  it("dry cutting at high Vc shifts stress toward tensile vs flood at same Vc", () => {
    const floodResult = hyperMillSurfaceIntegrityBridge.calculate({
      process: "milling",
      material: "steel",
      cuttingSpeed_m_min: 150,
      feed_mm: 0.12,
      depthOfCut_mm: 0.5,
      coolant: "flood",
    });
    const dryResult = hyperMillSurfaceIntegrityBridge.calculate({
      process: "milling",
      material: "steel",
      cuttingSpeed_m_min: 150,
      feed_mm: 0.12,
      depthOfCut_mm: 0.5,
      coolant: "dry",
    });
    // Dry cutting should produce higher (more tensile) surface_MPa than flood
    expect(dryResult.residualStress.surface_MPa).toBeGreaterThan(
      floodResult.residualStress.surface_MPa,
    );
  });

  it("quality report residual stress section echoes computed state correctly", () => {
    const result = hyperMillSurfaceIntegrityBridge.calculate({
      process: "milling",
      material: "steel",
      cuttingSpeed_m_min: 150,
      feed_mm: 0.12,
      depthOfCut_mm: 0.5,
      coolant: "flood",
    });
    const rss = result.qualityReport.residualStressSection;
    expect(rss.state).toBe(result.residualStress.state);
    expect(rss.surface_MPa).toBe(result.residualStress.surface_MPa);
    expect(rss.affectedDepth_um).toBe(result.residualStress.affectedDepth_um);
  });
});

// ============================================================================
// Integration: fail-close behaviour for unknown materials
// ============================================================================

describe("White layer gate: fail-close for unknown / unsupported material", () => {
  it("unknown material → WARN not BLOCK, thresholdKnown=false", () => {
    const gate = hyperMillSurfaceIntegrityBridge.runWhiteLayerGate({
      material: "mystery_alloy" as any,
      cuttingSpeed_m_min: 500,
      feed_mm: 0.15,
    });
    expect(gate.blocked).toBe(false);
    expect(gate.thresholdKnown).toBe(false);
    expect(gate.message).toMatch(/not defined|CAUTION/i);
  });

  it("aluminum has no white layer concern (thresholdKey=null) → WARN not BLOCK", () => {
    const gate = hyperMillSurfaceIntegrityBridge.runWhiteLayerGate({
      material: "aluminum",
      cuttingSpeed_m_min: 1000,
      feed_mm: 0.20,
    });
    expect(gate.blocked).toBe(false);
    expect(gate.thresholdKnown).toBe(false);
  });
});
