import { describe, it, expect } from "vitest";
import {
  millViseJawSetupEngine as eng,
  MIN_GRIP_SAFETY,
  MIN_ANTILIFT_SAFETY,
  STANDARD_PARALLEL_HEIGHTS_MM,
  type MillViseJawInput,
  type ViseJawMaterial,
} from "../engines/MillViseJawSetupEngine.js";

function nominal(o: Partial<MillViseJawInput> = {}): MillViseJawInput {
  return {
    part_grip_dim_mm: 80,
    part_grip_tol_mm: 0.05,
    part_height_mm: 50,
    part_bottom_contact_mm: 80,
    clamp_force_kn: 25,
    jaw_material: "hard_steel_serrated",
    peak_cut_force_horizontal_n: 2000,
    peak_cut_force_vertical_n: 500,
    ...o,
  };
}

describe("MillViseJawSetupEngine", () => {
  it("getStats: ISO + Kurt + SME reference + friction table + standard parallels", () => {
    const s = eng.getStats();
    expect(s.reference).toMatch(/ISO 16156/);
    expect(s.reference).toMatch(/Kurt/);
    expect(s.friction_table.hard_steel_serrated).toBeGreaterThan(s.friction_table.aluminum);
    expect(s.standard_parallels.length).toBeGreaterThan(5);
  });

  it("throws on invalid inputs (missing + non-positive + unknown material)", () => {
    expect(() => eng.compute(null as never)).toThrow(/input required/);
    expect(() => eng.compute(nominal({ part_grip_dim_mm: 0 }))).toThrow(/part_grip_dim_mm/);
    expect(() => eng.compute(nominal({ clamp_force_kn: -5 }))).toThrow(/clamp_force_kn/);
    expect(() => eng.compute(nominal({ jaw_material: "unobtainium" as ViseJawMaterial }))).toThrow(/Unknown jaw_material/);
  });

  it("springback for 25kN clamp force is small (sub-mm)", () => {
    const r = eng.compute(nominal());
    // 25000N / (210000 MPa × 5000 mm²) = 25000 / 1.05e9 = 2.38e-5 mm
    expect(r.springback_mm).toBeLessThan(0.01);
    expect(r.springback_mm).toBeGreaterThan(0);
  });

  it("jaw pocket dim = part dim - 2 × springback (compresses onto part)", () => {
    const r = eng.compute(nominal());
    expect(r.jaw_pocket_dim_mm).toBeLessThanOrEqual(80);
    expect(r.jaw_pocket_dim_mm).toBeGreaterThan(79.99);
  });

  it("hard serrated jaws grip > soft brass jaws at same clamp force", () => {
    const r_hard = eng.compute(nominal({ jaw_material: "hard_steel_serrated" }));
    const r_brass = eng.compute(nominal({ jaw_material: "brass" }));
    expect(r_hard.max_grip_force_n).toBeGreaterThan(r_brass.max_grip_force_n);
    expect(r_hard.friction_coefficient_used).toBeGreaterThan(r_brass.friction_coefficient_used);
  });

  it("grip safety: 25kN × μ=0.40 × 2 jaws = 20000N vs 2000N cut → ratio 10, safe", () => {
    const r = eng.compute(nominal());
    // 25000 * 2 * 0.40 = 20000N / 2000N = 10
    expect(r.max_grip_force_n).toBeCloseTo(20000, 0);
    expect(r.grip_safety_ratio).toBeCloseTo(10, 0);
    expect(r.grip_safe).toBe(true);
  });

  it("grip safety FAIL: cut force = 15000N exceeds grip × MIN_GRIP_SAFETY", () => {
    const r = eng.compute(nominal({ peak_cut_force_horizontal_n: 15000 }));
    // 20000 / 15000 = 1.33 < 2.0
    expect(r.grip_safety_ratio).toBeLessThan(MIN_GRIP_SAFETY);
    expect(r.grip_safe).toBe(false);
    expect(r.warnings.some(w => /Grip safety ratio.*<.*2/.test(w))).toBe(true);
  });

  it("zero horizontal cut force → grip_safety_ratio infinite, safe", () => {
    const r = eng.compute(nominal({ peak_cut_force_horizontal_n: 0 }));
    expect(r.grip_safety_ratio).toBe(Infinity);
    expect(r.grip_safe).toBe(true);
  });

  it("anti-lift FAIL: large vertical cut force vs half-grip-budget", () => {
    const r = eng.compute(nominal({ peak_cut_force_vertical_n: 5000 }));
    // friction_holddown = 20000 * 0.5 = 10000; ratio = 10000/5000 = 2 < 3
    expect(r.antilift_safety_ratio).toBeLessThan(MIN_ANTILIFT_SAFETY);
    expect(r.antilift_safe).toBe(false);
    expect(r.warnings.some(w => /Anti-lift.*step-pocket or dowel/.test(w))).toBe(true);
  });

  it("anti-lift safe when vertical cut force = 0 (no climb-mill lift)", () => {
    const r = eng.compute(nominal({ peak_cut_force_vertical_n: 0 }));
    expect(r.antilift_safety_ratio).toBe(Infinity);
    expect(r.antilift_safe).toBe(true);
  });

  it("parallel selection: tall part (50mm in 31.75mm jaw) → parallel ≈ 0 (no lift)", () => {
    const r = eng.compute(nominal({ part_height_mm: 50 }));
    expect(r.parallel_height_required_mm).toBe(0);
    expect(r.parallel_height_standard_mm).toBeCloseTo(STANDARD_PARALLEL_HEIGHTS_MM[0], 5);
  });

  it("parallel selection: short part (20mm) lifted by parallel for clearance", () => {
    const r = eng.compute(nominal({ part_height_mm: 20 }));
    // 31.75 - 20 + 1 = 12.75 → next standard parallel = 12.7? Closest >=  is 15.875
    expect(r.parallel_height_required_mm).toBeGreaterThan(10);
    expect(r.parallel_height_standard_mm).toBeGreaterThanOrEqual(r.parallel_height_required_mm);
    expect(STANDARD_PARALLEL_HEIGHTS_MM).toContain(r.parallel_height_standard_mm);
  });

  it("very short part triggers grip-overlap warning (insufficient jaw contact)", () => {
    // part_height 5mm < min grip overlap of 16mm (20% of 80) → impossible
    const r = eng.compute(nominal({ part_height_mm: 5 }));
    expect(r.warnings.some(w => /max-for-grip/.test(w))).toBe(true);
  });

  it("step pocket requested → step_pocket_depth_mm populated (≥ 2mm floor)", () => {
    const r = eng.compute(nominal({ step_pocket_required: true, step_pocket_z_mm: 8 }));
    expect(r.step_pocket_depth_mm).toBe(8);
    const r2 = eng.compute(nominal({ step_pocket_required: true, step_pocket_z_mm: 1 }));
    expect(r2.step_pocket_depth_mm).toBe(2); // floor
  });

  it("step pocket NOT requested → step_pocket_depth_mm undefined", () => {
    const r = eng.compute(nominal());
    expect(r.step_pocket_depth_mm === undefined).toBe(true);
  });

  it("no workstop + no dowel locators emits Y-axis location warning", () => {
    const r = eng.compute(nominal());
    expect(r.warnings.some(w => /Y-axis location relies on operator/.test(w))).toBe(true);
  });

  it("workstop standoff provided → warning suppressed", () => {
    const r = eng.compute(nominal({ workstop_standoff_mm: 10 }));
    expect(r.warnings.some(w => /Y-axis location relies on operator/.test(w))).toBe(false);
    expect(r.workstop_standoff_mm).toBe(10);
  });

  it("dowel locators present → workstop warning suppressed", () => {
    const r = eng.compute(nominal({ has_dowel_locators: true }));
    expect(r.warnings.some(w => /Y-axis location relies on operator/.test(w))).toBe(false);
  });

  it("negative workstop standoff emits invalid warning", () => {
    const r = eng.compute(nominal({ workstop_standoff_mm: -2 }));
    expect(r.warnings.some(w => /negative — invalid/.test(w))).toBe(true);
  });

  it("custom friction coefficient overrides material-table default", () => {
    const r = eng.compute(nominal({ friction_coefficient: 0.55 }));
    expect(r.friction_coefficient_used).toBe(0.55);
    // 25000 * 2 * 0.55 = 27500
    expect(r.max_grip_force_n).toBeCloseTo(27500, 0);
  });

  it("variability ≥3: aluminum-on-aluminum, hard-serrated, machinable-wax", () => {
    const al = eng.compute(nominal({ jaw_material: "aluminum" }));
    const hs = eng.compute(nominal({ jaw_material: "hard_steel_serrated" }));
    const wax = eng.compute(nominal({ jaw_material: "machinable_wax" }));
    // Friction order: hard_steel_serrated > aluminum > machinable_wax
    expect(hs.friction_coefficient_used).toBeGreaterThan(al.friction_coefficient_used);
    expect(al.friction_coefficient_used).toBeGreaterThan(wax.friction_coefficient_used);
    // Grip safety mirrors that ordering
    expect(hs.grip_safety_ratio).toBeGreaterThan(al.grip_safety_ratio);
    expect(al.grip_safety_ratio).toBeGreaterThan(wax.grip_safety_ratio);
  });

  it("reasoning narrates springback, μ, parallel, anti-lift when relevant", () => {
    const r = eng.compute(nominal());
    expect(r.reasoning.some(s => /Springback/.test(s))).toBe(true);
    expect(r.reasoning.some(s => /μ=/.test(s))).toBe(true);
    expect(r.reasoning.some(s => /Parallel:/.test(s))).toBe(true);
    expect(r.reasoning.some(s => /Anti-lift/.test(s))).toBe(true);
  });

  it("anti-lift reasoning suppressed when vertical force is zero", () => {
    const r = eng.compute(nominal({ peak_cut_force_vertical_n: 0 }));
    expect(r.reasoning.some(s => /Anti-lift/.test(s))).toBe(false);
  });

  it("determinism: same input twice → identical results", () => {
    const r1 = eng.compute(nominal());
    const r2 = eng.compute(nominal());
    expect(r1).toEqual(r2);
  });

  it("scaling: doubling clamp force → doubles springback AND grip force (linear)", () => {
    const r1 = eng.compute(nominal({ clamp_force_kn: 10 }));
    const r2 = eng.compute(nominal({ clamp_force_kn: 20 }));
    // Springback rounds at 10nm, so 2× at sub-µm gives ratio ≈ 2.00 ± 0.01
    // (rounding artifact at the engineering-meaningful precision).
    expect(r2.springback_mm / r1.springback_mm).toBeCloseTo(2.0, 1);
    // Grip force has no precision loss — exact 2× factor.
    expect(r2.max_grip_force_n / r1.max_grip_force_n).toBeCloseTo(2.0, 4);
  });

  it("findNextStandardParallel returns nearest ≥ required (boundary)", () => {
    // 50mm part in 31.75 jaw → required 0 → smallest std parallel
    const r0 = eng.compute(nominal({ part_height_mm: 50 }));
    expect(r0.parallel_height_standard_mm).toBe(STANDARD_PARALLEL_HEIGHTS_MM[0]); // 6.35
    // 1mm part in 31.75 jaw → required 31.75 → matches std parallel exactly (31.75 in std list)
    const r1 = eng.compute(nominal({ part_height_mm: 1 }));
    expect(r1.parallel_height_standard_mm).toBeGreaterThanOrEqual(r1.parallel_height_required_mm);
  });
});
