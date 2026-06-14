/**
 * Tests for EffectiveDiameterCompensator — Speed-Feed algorithm 8.2.
 *
 * Karpathy R9: tests verify intent + algebraic invariants, not behavior.
 * Variability: 5 tool geometries × 3+ depth regimes. Coverage: happy ×
 * boundary × adversarial × algebraic invariants.
 */

import { describe, it, expect } from "vitest";
import {
  compute,
  ballEndEffectiveDiameter,
  bullnoseEffectiveDiameter,
  chamferEffectiveDiameter,
  EffectiveDiameterCompensator,
  type EffectiveDiameterInput,
} from "../algorithms/EffectiveDiameterCompensator.js";

describe("EffectiveDiameterCompensator — pure geometry helpers", () => {
  describe("ballEndEffectiveDiameter — Smith & Tlusty formula", () => {
    it("D_eff(d=0) = 0 — tip just touching surface", () => {
      expect(ballEndEffectiveDiameter(6, 0)).toBe(0);
    });
    it("D_eff(d=R) = D — fully engaged at d=radius", () => {
      expect(ballEndEffectiveDiameter(6, 3)).toBeCloseTo(6, 6);
    });
    it("D_eff(d>R) = D — never exceeds nominal", () => {
      expect(ballEndEffectiveDiameter(6, 5)).toBe(6);
      expect(ballEndEffectiveDiameter(6, 100)).toBe(6);
    });
    it("classic crash example: 6mm ball at d=1mm → D_eff ≈ 4.47mm", () => {
      // 2·√(1·(6-1)) = 2·√5 = 4.472...
      expect(ballEndEffectiveDiameter(6, 1)).toBeCloseTo(2 * Math.sqrt(5), 6);
    });
    it("D_eff(d=R/2) hits the formula exactly: D=6, d=1.5 → 2·√(1.5·4.5)", () => {
      // The raw formula 2·√(d·(D-d)) is symmetric in d about D/2 mathematically,
      // but the function CLAMPS to D for d ≥ R (the operator wants nominal Ø
      // once the ball is past hemisphere — past that depth, the cylindrical
      // shank is engaging, not the ball curvature). So symmetry only holds
      // within [0, R]. This test pins the formula value at the halfway-to-R
      // depth d = R/2 = 1.5 against the closed form.
      expect(ballEndEffectiveDiameter(6, 1.5)).toBeCloseTo(2 * Math.sqrt(1.5 * 4.5), 6);
    });
    it("monotonic increasing in d for 0 ≤ d ≤ R", () => {
      const d_eff_0_5 = ballEndEffectiveDiameter(6, 0.5);
      const d_eff_1_0 = ballEndEffectiveDiameter(6, 1.0);
      const d_eff_2_0 = ballEndEffectiveDiameter(6, 2.0);
      const d_eff_3_0 = ballEndEffectiveDiameter(6, 3.0);
      expect(d_eff_0_5).toBeLessThan(d_eff_1_0);
      expect(d_eff_1_0).toBeLessThan(d_eff_2_0);
      expect(d_eff_2_0).toBeLessThan(d_eff_3_0);
    });
  });

  describe("bullnoseEffectiveDiameter — Sandvik formula", () => {
    it("D_eff(d=0) = D - 2r — cylindrical body, corner not engaged", () => {
      // D=10, r=2 → D_eff(0) = 10 - 4 = 6
      expect(bullnoseEffectiveDiameter(10, 0, 2)).toBeCloseTo(6, 6);
    });
    it("D_eff(d=r) = D — corner fully engaged", () => {
      expect(bullnoseEffectiveDiameter(10, 2, 2)).toBeCloseTo(10, 6);
    });
    it("D_eff(d>r) = D — never exceeds nominal", () => {
      expect(bullnoseEffectiveDiameter(10, 5, 2)).toBe(10);
    });
    it("monotonic increasing across the corner-blend region", () => {
      const e0 = bullnoseEffectiveDiameter(10, 0.0, 2);
      const e1 = bullnoseEffectiveDiameter(10, 0.5, 2);
      const e2 = bullnoseEffectiveDiameter(10, 1.0, 2);
      const e3 = bullnoseEffectiveDiameter(10, 1.5, 2);
      const e4 = bullnoseEffectiveDiameter(10, 2.0, 2);
      expect(e0).toBeLessThan(e1);
      expect(e1).toBeLessThan(e2);
      expect(e2).toBeLessThan(e3);
      expect(e3).toBeLessThan(e4);
    });
  });

  describe("chamferEffectiveDiameter — Iscar/Onsrud formula", () => {
    it("D_eff(d=0) = D_tip — tip-only contact", () => {
      expect(chamferEffectiveDiameter(2, 0, 45)).toBe(2);
    });
    it("D_eff at 45°, d=1, D_tip=0 → 2·1·tan(45°) = 2.0", () => {
      expect(chamferEffectiveDiameter(0, 1, 45)).toBeCloseTo(2, 6);
    });
    it("D_eff scales linearly with d for fixed angle", () => {
      const d1 = chamferEffectiveDiameter(0, 1, 30);
      const d2 = chamferEffectiveDiameter(0, 2, 30);
      const d4 = chamferEffectiveDiameter(0, 4, 30);
      expect(d2 / d1).toBeCloseTo(2, 6);
      expect(d4 / d1).toBeCloseTo(4, 6);
    });
    it("steeper angle (larger α) → larger D_eff at same depth", () => {
      const shallow = chamferEffectiveDiameter(0, 1, 15);
      const steep = chamferEffectiveDiameter(0, 1, 75);
      expect(steep).toBeGreaterThan(shallow);
    });
  });
});

describe("EffectiveDiameterCompensator — compute() per geometry", () => {
  it("flat_endmill: D_eff = D for any depth, fully_engaged true, correction = 1", () => {
    const r = compute({ geometry: "flat_endmill", nominal_diameter_mm: 10, depth_mm: 5 });
    expect(r.effective_diameter_mm.value).toBe(10);
    expect(r.fully_engaged).toBe(true);
    expect(r.engagement_ratio.value).toBe(1);
    expect(r.vc_correction_multiplier.value).toBeCloseTo(1, 6);
  });

  it("ball_end partial: 6mm ball, d=1mm → D_eff≈4.47, correction≈1.342", () => {
    const r = compute({ geometry: "ball_end", nominal_diameter_mm: 6, depth_mm: 1 });
    expect(r.effective_diameter_mm.value).toBeCloseTo(4.472, 2);
    expect(r.fully_engaged).toBe(false);
    expect(r.vc_correction_multiplier.value).toBeCloseTo(6 / (2 * Math.sqrt(5)), 4);
    expect(r.notes.some(n => n.includes("partial engagement"))).toBe(true);
  });

  it("ball_end full: 6mm ball, d=3mm (=R) → D_eff=6, fully_engaged true", () => {
    const r = compute({ geometry: "ball_end", nominal_diameter_mm: 6, depth_mm: 3 });
    expect(r.effective_diameter_mm.value).toBeCloseTo(6, 6);
    expect(r.fully_engaged).toBe(true);
    expect(r.vc_correction_multiplier.value).toBeCloseTo(1, 6);
  });

  it("ball_end pathological d=0: correction multiplier is Infinity-guarded to 0 (R12 fail-loud)", () => {
    const r = compute({ geometry: "ball_end", nominal_diameter_mm: 6, depth_mm: 0 });
    expect(r.effective_diameter_mm.value).toBe(0);
    // Per file convention, 0 D_eff → vc_correction returned as 0 (caller must reject)
    expect(r.vc_correction_multiplier.value).toBe(0);
  });

  it("bullnose partial: D=10, r=2, d=1 → D_eff < 10", () => {
    const r = compute({ geometry: "bullnose", nominal_diameter_mm: 10, depth_mm: 1, corner_radius_mm: 2 });
    expect(r.effective_diameter_mm.value).toBeLessThan(10);
    expect(r.effective_diameter_mm.value).toBeGreaterThan(6); // > D - 2r
    expect(r.fully_engaged).toBe(false);
  });

  it("bullnose full: d=r → D_eff = D", () => {
    const r = compute({ geometry: "bullnose", nominal_diameter_mm: 10, depth_mm: 2, corner_radius_mm: 2 });
    expect(r.effective_diameter_mm.value).toBeCloseTo(10, 6);
    expect(r.fully_engaged).toBe(true);
  });

  it("chamfer 45°: D_tip=2, d=1 → D_eff = 2 + 2·1·tan(45°) = 4", () => {
    const r = compute({ geometry: "chamfer", nominal_diameter_mm: 10, depth_mm: 1, half_angle_deg: 45, tip_diameter_mm: 2 });
    expect(r.effective_diameter_mm.value).toBeCloseTo(4, 4);
  });

  it("chamfer beyond chamfer height: D_eff clamped to nominal with diagnostic note", () => {
    // 45° chamfer with tip=0, d=10 → math says D_eff=20 but nominal D=10 → clamped
    const r = compute({ geometry: "chamfer", nominal_diameter_mm: 10, depth_mm: 10, half_angle_deg: 45, tip_diameter_mm: 0 });
    expect(r.effective_diameter_mm.value).toBe(10);
    expect(r.notes.some(n => n.includes("clamped"))).toBe(true);
  });

  it("v_bit: tip_diameter defaults to 0; 30° at d=2mm → D_eff = 2·2·tan(30°)", () => {
    const r = compute({ geometry: "v_bit", nominal_diameter_mm: 6, depth_mm: 2, half_angle_deg: 30 });
    expect(r.effective_diameter_mm.value).toBeCloseTo(2 * 2 * Math.tan(Math.PI / 6), 4);
  });
});

describe("EffectiveDiameterCompensator — validation (R12 fail-loud)", () => {
  it("missing geometry → invalid-input note, no crash", () => {
    const r = compute({} as EffectiveDiameterInput);
    expect(r.notes.join("|")).toContain("missing geometry");
  });
  it("NaN nominal_diameter → invalid-input", () => {
    const r = compute({ geometry: "flat_endmill", nominal_diameter_mm: NaN, depth_mm: 1 });
    expect(r.notes.join("|")).toContain("not finite");
  });
  it("Infinity depth → invalid-input via not-finite", () => {
    const r = compute({ geometry: "ball_end", nominal_diameter_mm: 6, depth_mm: Infinity });
    expect(r.notes.join("|")).toContain("not finite");
  });
  it("negative depth → invalid-input", () => {
    const r = compute({ geometry: "ball_end", nominal_diameter_mm: 6, depth_mm: -1 });
    expect(r.notes.join("|")).toContain("negative");
  });
  it("diameter below micro-tool floor (50µm) → invalid", () => {
    const r = compute({ geometry: "ball_end", nominal_diameter_mm: 0.01, depth_mm: 0.005 });
    expect(r.notes.join("|")).toContain("floor");
  });
  it("diameter above 500mm sanity ceiling → invalid", () => {
    const r = compute({ geometry: "flat_endmill", nominal_diameter_mm: 600, depth_mm: 1 });
    expect(r.notes.join("|")).toContain("ceiling");
  });
  it("bullnose without corner_radius → invalid", () => {
    const r = compute({ geometry: "bullnose", nominal_diameter_mm: 10, depth_mm: 1 });
    expect(r.notes.join("|")).toContain("requires corner_radius_mm");
  });
  it("bullnose corner_radius > tool radius → invalid", () => {
    const r = compute({ geometry: "bullnose", nominal_diameter_mm: 10, depth_mm: 1, corner_radius_mm: 6 });
    expect(r.notes.join("|")).toContain("cannot exceed tool radius");
  });
  it("chamfer without half_angle → invalid", () => {
    const r = compute({ geometry: "chamfer", nominal_diameter_mm: 10, depth_mm: 1 });
    expect(r.notes.join("|")).toContain("requires half_angle_deg");
  });
  it("chamfer with out-of-range half_angle (95°) → invalid", () => {
    const r = compute({ geometry: "chamfer", nominal_diameter_mm: 10, depth_mm: 1, half_angle_deg: 95 });
    expect(r.notes.join("|")).toContain("half_angle_deg");
  });
  it("unsupported geometry → invalid with named diagnostic", () => {
    const r = compute({ geometry: "tapered_drill" as EffectiveDiameterInput["geometry"], nominal_diameter_mm: 6, depth_mm: 1 });
    expect(r.notes.join("|")).toContain("unsupported geometry: tapered_drill");
  });
});

describe("EffectiveDiameterCompensator — Vc-correction integration intent", () => {
  it("ball-end partial engagement → correction multiplier > 1 (operator must increase RPM)", () => {
    const r = compute({ geometry: "ball_end", nominal_diameter_mm: 10, depth_mm: 1 });
    expect(r.vc_correction_multiplier.value).toBeGreaterThan(1);
  });
  it("bullnose at d=0 (cylindrical body only) → correction = D / (D-2r)", () => {
    const r = compute({ geometry: "bullnose", nominal_diameter_mm: 10, depth_mm: 0, corner_radius_mm: 2 });
    expect(r.vc_correction_multiplier.value).toBeCloseTo(10 / 6, 4);
  });
  it("flat_endmill correction = 1.0 always (sanity)", () => {
    const r = compute({ geometry: "flat_endmill", nominal_diameter_mm: 25, depth_mm: 10 });
    expect(r.vc_correction_multiplier.value).toBe(1);
  });
});

describe("EffectiveDiameterCompensator — singleton + version", () => {
  it("singleton exposes the 4 public functions + version", () => {
    expect(EffectiveDiameterCompensator.version).toBe("1.0.0");
    expect(typeof EffectiveDiameterCompensator.compute).toBe("function");
    expect(typeof EffectiveDiameterCompensator.ballEndEffectiveDiameter).toBe("function");
    expect(typeof EffectiveDiameterCompensator.bullnoseEffectiveDiameter).toBe("function");
    expect(typeof EffectiveDiameterCompensator.chamferEffectiveDiameter).toBe("function");
  });
});
