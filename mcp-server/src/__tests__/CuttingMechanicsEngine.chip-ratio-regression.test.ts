/**
 * CuttingMechanicsEngine — chip-thickness (cutting) ratio regression.
 *
 * Guards the orthogonal-cutting ratio in merchantAnalysis against the P2
 * sign/geometry defect (was cos(phi-alpha)/cos(alpha), giving chip thickness
 * and compression ratio ~28% low). Correct: r = sin(phi)/cos(phi-alpha)
 * (Groover FMM Eq. 21.9 / Kalpakjian). These assert HAND-DERIVED reference
 * numbers and the defining Groover chip-ratio invariant — not a 1/r tautology.
 *
 * @milestone whiskey lathe hardening — CuttingMechanicsEngine chip-ratio fix
 */
import { describe, it, expect } from "vitest";
import { cuttingMechanicsEngine } from "../engines/CuttingMechanicsEngine.js";

const engine = cuttingMechanicsEngine;

describe("CuttingMechanicsEngine chip-ratio (Groover/Kalpakjian orthogonal cutting)", () => {
  // ── Reference case: alpha=0, mu=0.5 → Merchant phi = 45° - atan(0.5)/2 ──
  // At alpha=0 the cutting ratio collapses to r = sin(phi)/cos(phi) = tan(phi).
  // For mu=0.5 this phi yields exactly the golden-ratio conjugate 0.6180340.
  const mu = 0.5;
  const alpha0 = 0;
  const beta = Math.atan(mu);
  const phi0 = Math.PI / 4 - (beta - alpha0) / 2; // Merchant shear angle (rad)
  const rGolden = Math.tan(phi0);                 // independent reference: tan(phi)

  it("reference: at mu=0.5, alpha=0 the Merchant shear angle gives r = (sqrt5-1)/2", () => {
    // Anchors the hand-derived reference to a known closed-form constant,
    // independent of the ratio formula under test.
    expect(rGolden).toBeCloseTo((Math.sqrt(5) - 1) / 2, 10); // 0.6180340
    expect(phi0 * 180 / Math.PI).toBeCloseTo(31.7175, 3);    // ~31.72°
  });

  it("chipRatio r = sin(phi)/cos(phi-alpha) ~ 0.618034 (was 0.8507 pre-fix)", () => {
    const res = engine.merchantAnalysis({
      chipThickness: 0.2, width: 3, rakeAngle: alpha0,
      shearStrength: 350, frictionCoeff: mu,
    });
    expect(res.shearAngle_deg).toBeCloseTo(31.72, 2);
    expect(res.chipRatio).toBeCloseTo(rGolden, 4);      // 0.618 — buggy formula gave 0.8507
    expect(res.chipRatio).toBeLessThan(1);              // r<1: chip is thicker than uncut
  });

  it("deformed chip thickness t_chip = h/r > h (the ~28%-low field pre-fix)", () => {
    const h = 0.2;
    const res = engine.merchantAnalysis({
      chipThickness: h, width: 3, rakeAngle: alpha0,
      shearStrength: 350, frictionCoeff: mu,
    });
    // Correct 0.32361 mm; buggy cos-based formula gave 0.2351 mm (-27.4%).
    expect(res.chipThickness_mm).toBeCloseTo(h / rGolden, 4); // 0.3236
    expect(res.chipThickness_mm).toBeGreaterThan(h);          // chip compression => thicker
  });

  it("chipCompressionRatio = 1/r ~ 1.618034 (was 1.175 pre-fix)", () => {
    const res = engine.merchantAnalysis({
      chipThickness: 0.2, width: 3, rakeAngle: alpha0,
      shearStrength: 350, frictionCoeff: mu,
    });
    expect(res.chipCompressionRatio).toBeCloseTo(1 / rGolden, 4); // 1.618
    expect(res.chipCompressionRatio).toBeGreaterThan(1);          // compression >1 always
  });

  it("satisfies Groover Eq. 21.9 invariant tan(phi) = r*cos(a)/(1 - r*sin(a)) at rake=10°", () => {
    // Defining relation between chip ratio r and shear angle phi — algebraically
    // equivalent to r = sin(phi)/cos(phi-a), so it holds for the correct formula
    // (rhs ~ 0.7460) and is grossly violated by the buggy one (rhs ~ 1.060).
    const alpha = 10 * Math.PI / 180;
    const res = engine.merchantAnalysis({
      chipThickness: 0.1, width: 2, rakeAngle: alpha,
      shearStrength: 400, frictionCoeff: mu,
    });
    const phi = res.shearAngle_deg * Math.PI / 180;
    const r = res.chipRatio;
    const lhs = Math.tan(phi);
    const rhs = (r * Math.cos(alpha)) / (1 - r * Math.sin(alpha));
    expect(rhs).toBeCloseTo(lhs, 2);
  });

  it("chip ratio rises toward 1 (less compression) as rake angle increases", () => {
    const base = { chipThickness: 0.1, width: 2, shearStrength: 400, frictionCoeff: mu };
    const r0 = engine.merchantAnalysis({ ...base, rakeAngle: 0 }).chipRatio;
    const r10 = engine.merchantAnalysis({ ...base, rakeAngle: 10 * Math.PI / 180 }).chipRatio;
    const r20 = engine.merchantAnalysis({ ...base, rakeAngle: 20 * Math.PI / 180 }).chipRatio;
    expect(r10).toBeGreaterThan(r0);
    expect(r20).toBeGreaterThan(r10);
    expect(r20).toBeLessThan(1);
  });

  it("forces are unaffected by the r_c fix (Merchant chain has no r_c dependence)", () => {
    // Hand-derived from tau_s*b*h/sin(phi) → R → Fc=R*cos(beta-a), Ft=R*sin(beta-a).
    // Locks the reference so a future r_c edit cannot silently perturb the forces.
    const res = engine.merchantAnalysis({
      chipThickness: 0.2, width: 3, rakeAngle: alpha0,
      shearStrength: 350, frictionCoeff: mu,
    });
    expect(res.forces.cutting_N).toBeCloseTo(679.6, 1);
    expect(res.forces.thrust_N).toBeCloseTo(339.8, 1);
    expect(res.forces.resultant_N).toBeGreaterThan(res.forces.cutting_N);
  });
});
