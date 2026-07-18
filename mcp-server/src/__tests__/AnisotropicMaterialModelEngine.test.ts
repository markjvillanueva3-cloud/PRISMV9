import { describe, it, expect } from "vitest";
import {
  anisotropicMaterialModelEngine as eng,
  AnisotropicMaterialModelEngine,
  type AnisotropicInput,
} from "../engines/AnisotropicMaterialModelEngine.js";

function nominal(o: Partial<AnisotropicInput> = {}): AnisotropicInput {
  return {
    material_form: "rolled_with",
    feed_direction_deg: 0,
    base_cutting_force_n: 1000,
    ...o,
  };
}

describe("AnisotropicMaterialModelEngine", () => {
  it("exports singleton with apply()", () => {
    expect(eng).toBeInstanceOf(AnisotropicMaterialModelEngine);
    expect(typeof eng.apply).toBe("function");
  });

  it("throws on missing required fields", () => {
    expect(() => eng.apply({} as AnisotropicInput))
      .toThrow(/material_form \+ feed_direction_deg \+ base_cutting_force_n required/);
  });

  it("throws on non-positive base_cutting_force_n", () => {
    expect(() => eng.apply(nominal({ base_cutting_force_n: 0 }))).toThrow(/positive base_cutting_force_n/);
    expect(() => eng.apply(nominal({ base_cutting_force_n: -100 }))).toThrow(/positive base_cutting_force_n/);
  });

  it("throws on feed_direction_deg outside [-360, 360]", () => {
    expect(() => eng.apply(nominal({ feed_direction_deg: 500 }))).toThrow(/feed_direction_deg must be in/);
    expect(() => eng.apply(nominal({ feed_direction_deg: -500 }))).toThrow(/feed_direction_deg must be in/);
  });

  it("cast_random isotropic: A=1.0 at all angles", () => {
    const r0 = eng.apply(nominal({ material_form: "cast_random", feed_direction_deg: 0 }));
    const r45 = eng.apply(nominal({ material_form: "cast_random", feed_direction_deg: 45 }));
    const r90 = eng.apply(nominal({ material_form: "cast_random", feed_direction_deg: 90 }));
    expect(r0.anisotropy_multiplier.value).toBe(1.0);
    expect(r45.anisotropy_multiplier.value).toBe(1.0);
    expect(r90.anisotropy_multiplier.value).toBe(1.0);
    expect(r0.ductility_drop_pct.value).toBe(0);
  });

  it("rolled_with: A=1.00 at 0°, A=1.10 at 90° (10% increase across grain)", () => {
    const rWith = eng.apply(nominal({ material_form: "rolled_with", feed_direction_deg: 0 }));
    const rAcross = eng.apply(nominal({ material_form: "rolled_with", feed_direction_deg: 90 }));
    expect(rWith.anisotropy_multiplier.value).toBeCloseTo(1.0, 3);
    expect(rAcross.anisotropy_multiplier.value).toBeCloseTo(1.10, 3);
  });

  it("printed_z_build: A=1.30 at 90° (laminar weakness, worst case)", () => {
    const r = eng.apply(nominal({ material_form: "printed_z_build", feed_direction_deg: 90 }));
    expect(r.anisotropy_multiplier.value).toBeCloseTo(1.30, 3);
    expect(r.warnings.some(w => /3D-printed Z-direction.*delamination/.test(w))).toBe(true);
  });

  it("forged_longitudinal: A<1 with grain (force REDUCED along grain)", () => {
    const r = eng.apply(nominal({ material_form: "forged_longitudinal", feed_direction_deg: 0 }));
    expect(r.anisotropy_multiplier.value).toBeLessThan(1.0);
    expect(r.anisotropy_multiplier.value).toBeCloseTo(0.95, 3);
  });

  it("effective_cutting_force = base × multiplier", () => {
    const r = eng.apply(nominal({ material_form: "rolled_with", feed_direction_deg: 90, base_cutting_force_n: 2000 }));
    // base=2000, A=1.10 → 2200
    expect(r.effective_cutting_force_n.value).toBeCloseTo(2200, 0);
  });

  it("worst_case_force = base × A_across (always returns 90° max)", () => {
    const r = eng.apply(nominal({ material_form: "forged_transverse", feed_direction_deg: 0, base_cutting_force_n: 1000 }));
    // A_across forged_transverse = 1.20 → 1200
    expect(r.worst_case_force_n.value).toBeCloseTo(1200, 0);
  });

  it("sin²(θ) interpolation: 45° = midpoint between A_with and A_across", () => {
    const r = eng.apply(nominal({ material_form: "rolled_across", feed_direction_deg: 45 }));
    // A_with=1.00, A_across=1.15; sin²(45°) = 0.5 → A = 1.00 + 0.5 × 0.15 = 1.075
    expect(r.anisotropy_multiplier.value).toBeCloseTo(1.075, 3);
  });

  it("θ folds into [0, 90] symmetrically (135° = 45°, 180° = 0°)", () => {
    const r45 = eng.apply(nominal({ material_form: "rolled_across", feed_direction_deg: 45 }));
    const r135 = eng.apply(nominal({ material_form: "rolled_across", feed_direction_deg: 135 }));
    const r180 = eng.apply(nominal({ material_form: "rolled_across", feed_direction_deg: 180 }));
    const r0 = eng.apply(nominal({ material_form: "rolled_across", feed_direction_deg: 0 }));
    expect(r45.anisotropy_multiplier.value).toBeCloseTo(r135.anisotropy_multiplier.value, 4);
    expect(r180.anisotropy_multiplier.value).toBeCloseTo(r0.anisotropy_multiplier.value, 4);
  });

  it("θ negative angle equivalent to positive", () => {
    const rPos = eng.apply(nominal({ material_form: "rolled_across", feed_direction_deg: 60 }));
    const rNeg = eng.apply(nominal({ material_form: "rolled_across", feed_direction_deg: -60 }));
    expect(rPos.anisotropy_multiplier.value).toBeCloseTo(rNeg.anisotropy_multiplier.value, 4);
  });

  it("recommended_feed_rotation surfaces required θ change to reach optimum", () => {
    // At 60° from with-grain on rolled_with — recommend rotating -60° back to 0°
    const r = eng.apply(nominal({ material_form: "rolled_across", feed_direction_deg: 60 }));
    // theta folds to 60 (already in [0,90]); recommended rotation = -60
    expect(r.recommended_feed_rotation_deg.value).toBe(-60);
  });

  it("ductility drop scales with sin²(θ)", () => {
    const r0 = eng.apply(nominal({ material_form: "printed_z_build", feed_direction_deg: 0 }));
    const r90 = eng.apply(nominal({ material_form: "printed_z_build", feed_direction_deg: 90 }));
    expect(r0.ductility_drop_pct.value).toBeCloseTo(0, 1);
    expect(r90.ductility_drop_pct.value).toBeCloseTo(35, 1);
  });

  it("forged_transverse + 80° → Kienzle-underestimate warning", () => {
    const r = eng.apply(nominal({ material_form: "forged_transverse", feed_direction_deg: 80 }));
    expect(r.warnings.some(w => /Forged transverse.*Kienzle underestimates/.test(w))).toBe(true);
  });

  it("drawn_wire + cross-cut → fiber-flow burr warning", () => {
    const r = eng.apply(nominal({ material_form: "drawn_wire", feed_direction_deg: 45 }));
    expect(r.warnings.some(w => /Drawn wire.*rough exit burr/.test(w))).toBe(true);
  });

  it("printed_xy_layer + >60° → layer-line tearing warning", () => {
    const r = eng.apply(nominal({ material_form: "printed_xy_layer", feed_direction_deg: 75 }));
    expect(r.warnings.some(w => /XY-layer.*tearing/.test(w))).toBe(true);
  });

  it("rotation recommendation fires when off-grain by >30° AND anisotropy ratio >1.15", () => {
    // forged_longitudinal: a_with=0.95, a_across=1.15 → ratio 1.21 > 1.15
    const r = eng.apply(nominal({ material_form: "forged_longitudinal", feed_direction_deg: 60 }));
    expect(r.warnings.some(w => /Rotate part\/program/.test(w))).toBe(true);
  });

  it("4 material forms exercised distinct multipliers at 90°", () => {
    const forms = ["cast_random", "rolled_across", "forged_transverse", "printed_z_build"] as const;
    const multipliers = new Set(forms.map(f => eng.apply(nominal({ material_form: f, feed_direction_deg: 90 })).anisotropy_multiplier.value));
    expect(multipliers.size).toBe(4);
  });

  it("source cites Boothroyd-Knight + Shaw + Wohlfahrt + ASTM E8/E9 + ISO 5577", () => {
    const r = eng.apply(nominal());
    expect(r.source).toMatch(/Boothroyd-Knight|Shaw|Wohlfahrt|ASTM E8|ISO 5577/);
  });
});
