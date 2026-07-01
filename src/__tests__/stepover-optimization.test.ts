/**
 * StepoverOptimizationEngine Tests — CAMK-MS0/U04
 * Tests curvature-adaptive stepover computation
 */
import { describe, it, expect } from "vitest";
import { stepoverOptimizationEngine } from "../engines/StepoverOptimizationEngine.js";

describe("StepoverOptimizationEngine", () => {
  // ---- Basic scallop formula ----
  it("computes stepover from scallop height (ball cutter formula)", () => {
    const R = 5;
    const h = 0.01;
    // ae = 2·sqrt(2·R·h) = 2·sqrt(0.1) ≈ 0.6325
    const ae = stepoverOptimizationEngine.stepoverFromScallop(R, h);
    expect(ae).toBeCloseTo(2 * Math.sqrt(2 * 5 * 0.01), 4);
  });

  // ---- Inverse: scallop from stepover ----
  it("computes scallop height from stepover", () => {
    const R = 5;
    const ae = 2;
    // h = R - sqrt(R² - (ae/2)²) = 5 - sqrt(24) ≈ 0.101
    const h = stepoverOptimizationEngine.scallopFromStepover(R, ae);
    expect(h).toBeCloseTo(5 - Math.sqrt(25 - 1), 4);
  });

  // ---- Roundtrip: stepover → scallop → stepover ----
  it("roundtrips scallop ↔ stepover correctly", () => {
    const R = 8;
    const targetH = 0.005;
    const ae = stepoverOptimizationEngine.stepoverFromScallop(R, targetH);
    const actualH = stepoverOptimizationEngine.scallopFromStepover(R, ae);
    expect(actualH).toBeCloseTo(targetH, 4);
  });

  // ---- Effective radius on flat surface ----
  it("returns tool radius on flat surface (κ=0)", () => {
    const rEff = stepoverOptimizationEngine.effectiveRadius(5, 0);
    expect(rEff).toBe(5);
  });

  // ---- Effective radius on convex surface ----
  it("increases effective radius on convex surfaces", () => {
    const rEff = stepoverOptimizationEngine.effectiveRadius(5, 0.02);
    // 1/(1/5 - 0.02) = 1/0.18 ≈ 5.556
    expect(rEff).toBeGreaterThan(5);
    expect(rEff).toBeCloseTo(1 / (0.2 - 0.02), 2);
  });

  // ---- Effective radius on concave surface ----
  it("decreases effective radius on concave surfaces", () => {
    const rEff = stepoverOptimizationEngine.effectiveRadius(5, -0.05);
    // 1/(1/5 + 0.05) = 1/0.25 = 4.0
    expect(rEff).toBeLessThan(5);
    expect(rEff).toBeCloseTo(4, 2);
  });

  // ---- Adaptive stepover on varying curvature ----
  it("adapts stepover to curvature variation", () => {
    const result = stepoverOptimizationEngine.optimize({
      cutter: { type: "ball", diameter_mm: 10 },
      target_scallop_mm: 0.01,
      surface_points: [
        { position: 0, kappa1: 0, kappa2: 0 },       // flat
        { position: 0.5, kappa1: 0, kappa2: 0.1 },    // convex (R=10mm)
        { position: 1, kappa1: 0, kappa2: -0.1 },     // concave (R=10mm)
      ],
    });
    expect(result.stepovers_mm).toHaveLength(3);
    // Convex point should have larger stepover than flat
    expect(result.stepovers_mm[1]).toBeGreaterThan(result.stepovers_mm[0]);
    // Concave point should have smaller stepover than flat
    expect(result.stepovers_mm[2]).toBeLessThan(result.stepovers_mm[0]);
  });

  // ---- All scallops within target ----
  it("keeps all scallop heights at or below target", () => {
    const result = stepoverOptimizationEngine.optimize({
      cutter: { type: "ball", diameter_mm: 12 },
      target_scallop_mm: 0.005,
      surface_points: Array.from({ length: 20 }, (_, i) => ({
        position: i / 19,
        kappa1: 0,
        kappa2: Math.sin(i * 0.3) * 0.05,
      })),
    });
    for (const h of result.scallop_heights_mm) {
      expect(h).toBeLessThanOrEqual(0.005 * 1.05 + 1e-9);
    }
  });

  // ---- Ball vs barrel comparison ----
  it("barrel cutter allows larger stepover than ball", () => {
    const comparison = stepoverOptimizationEngine.compareCutters(
      [
        { type: "ball", diameter_mm: 10 },
        { type: "barrel", diameter_mm: 10, barrel_radius_mm: 250 },
      ],
      0.01, // 10 µm scallop
    );
    const ball = comparison.find(c => c.cutter.type === "ball")!;
    const barrel = comparison.find(c => c.cutter.type === "barrel")!;
    expect(barrel.stepover_mm).toBeGreaterThan(ball.stepover_mm);
    expect(barrel.ratio_to_ball).toBeGreaterThan(1);
  });

  // ---- Quick stepover ----
  it("quickStepover returns correct value", () => {
    const ae = stepoverOptimizationEngine.quickStepover(
      { type: "ball", diameter_mm: 16 },
      0.01
    );
    // ae = 2·sqrt(2·8·0.01) = 2·sqrt(0.16) ≈ 0.8
    expect(ae).toBeCloseTo(2 * Math.sqrt(2 * 8 * 0.01), 3);
  });

  // ---- Force-limited stepover ----
  it("applies force limit when cutting force is constrained", () => {
    const result = stepoverOptimizationEngine.optimize({
      cutter: { type: "ball", diameter_mm: 20 },
      target_scallop_mm: 0.05, // generous scallop
      surface_points: [{ position: 0, kappa1: 0, kappa2: 0 }],
      max_force_n: 500,
      kc_n_per_mm2: 1500,
      ap_mm: 1,
      min_stepover_mm: 0.01,
    });
    // Force-limited: ae_max = 500/(1500*1) = 0.333 mm
    // Scallop-based ae for R=10, h=0.05 = 2*sqrt(2*10*0.05) = 2.0 mm
    // Force limit should constrain below scallop-based
    expect(result.stepovers_mm[0]).toBeLessThanOrEqual(0.334);
    expect(result.warnings.some(w => w.includes("Force limit"))).toBe(true);
  });

  // ---- Max stepover clamp ----
  it("clamps stepover to max percentage of diameter", () => {
    const result = stepoverOptimizationEngine.optimize({
      cutter: { type: "ball", diameter_mm: 10 },
      target_scallop_mm: 10, // absurdly large target
      surface_points: [{ position: 0, kappa1: 0, kappa2: 0 }],
      max_stepover_pct: 50,
    });
    // Max = 50% of 10mm = 5mm
    expect(result.stepovers_mm[0]).toBeLessThanOrEqual(5);
  });

  // ---- Steep wall reduction ----
  it("reduces stepover on steep walls", () => {
    const result = stepoverOptimizationEngine.optimize({
      cutter: { type: "ball", diameter_mm: 10 },
      target_scallop_mm: 0.01,
      surface_points: [
        { position: 0, kappa1: 0, kappa2: 0, surface_angle_deg: 90 }, // flat
        { position: 1, kappa1: 0, kappa2: 0, surface_angle_deg: 10 }, // steep
      ],
    });
    // Steep point should have smaller stepover
    expect(result.stepovers_mm[1]).toBeLessThan(result.stepovers_mm[0]);
  });

  // ---- Flat cutter tool radius ----
  it("returns very large effective radius for flat cutter", () => {
    const r = stepoverOptimizationEngine.getToolRadius(
      { type: "flat", diameter_mm: 20 }
    );
    expect(r).toBeGreaterThan(100);
  });

  // ---- Bull-nose uses corner radius ----
  it("uses corner radius for bull-nose tool", () => {
    const r = stepoverOptimizationEngine.getToolRadius(
      { type: "bull_nose", diameter_mm: 20, corner_radius_mm: 3 }
    );
    expect(r).toBe(3);
  });
});
