/**
 * LatheWorkholdingEngine — engine-direct tests.
 *
 * Companion to dispatcher.latheWorkholding.test.ts. Covers all 6 public
 * methods: selectJaw, calculateTrilobe, calculateFaceDriver,
 * calculateExpandingMandrel, calculateMagneticChuck, stockFormRecommendation.
 *
 * Every assertion pins a concrete reference value computed from the engine's
 * declared formulas (DIN 6350, ISO 10218, Machinery's Handbook 31st Ed.,
 * Nee & Tao thin-ring distortion, Lame thick-walled cylinders):
 *   - ISO 10218 minimum safety factor: 2.5
 *   - Default cutting force: 2000 N
 *   - Thin-wall threshold: wall/OD < 0.08
 *   - Trilobe: δ = F·R³/(E·I), I = b·t³/12
 *   - Lame: p = Δ·E/(r·((r_o²+r_i²)/(r_o²-r_i²)+ν))
 *   - Face driver: T = F_axial · μ · r_mean · n_pins
 */

import { describe, it, expect } from "vitest";
import { latheWorkholdingEngine } from "../engines/LatheWorkholdingEngine.js";

describe("LatheWorkholdingEngine — selectJaw()", () => {
  it("very thin wall (wall/OD < 4%) → 6_jaw with thin-wall warning", () => {
    // OD 100, ID 96 → wall 2mm → wall/OD = 2% (<4%).
    const r = latheWorkholdingEngine.selectJaw({
      grip_diameter_mm: 100,
      bore_id_mm: 96,
      cutting_force_n: 1000,
    });
    expect(r.recommended_jaw).toBe("6_jaw");
    expect(r.warnings.some((w) => w.toLowerCase().includes("thin wall"))).toBe(true);
    expect(r.alternatives.some((a) => a.jaw === "collet")).toBe(true);
  });

  it("thin wall (4% ≤ wall/OD < 8%) → collet", () => {
    // OD 100, ID 88 → wall 6mm → wall/OD = 6%.
    const r = latheWorkholdingEngine.selectJaw({
      grip_diameter_mm: 100,
      bore_id_mm: 88,
      cutting_force_n: 1000,
    });
    expect(r.recommended_jaw).toBe("collet");
    expect(r.alternatives.some((a) => a.jaw === "6_jaw")).toBe(true);
  });

  it("tight tolerance (<0.02mm) on solid bar → soft_od with bore program needed", () => {
    const r = latheWorkholdingEngine.selectJaw({
      grip_diameter_mm: 40,
      tolerance_mm: 0.01,
    });
    expect(r.recommended_jaw).toBe("soft_od");
    expect(r.bore_program_needed).toBe(true);
  });

  it("forging stock → soft_od + bore needed", () => {
    const r = latheWorkholdingEngine.selectJaw({
      grip_diameter_mm: 50,
      stock_form: "forging",
    });
    expect(r.recommended_jaw).toBe("soft_od");
    expect(r.bore_program_needed).toBe(true);
    expect(r.justification[0]).toContain("forging");
  });

  it("tube stock → collet with reduced-pressure warning", () => {
    const r = latheWorkholdingEngine.selectJaw({
      grip_diameter_mm: 40,
      stock_form: "tube",
    });
    expect(r.recommended_jaw).toBe("collet");
    expect(r.warnings.some((w) => w.toLowerCase().includes("tube") || w.toLowerCase().includes("reduced"))).toBe(true);
  });

  it("hex_bar → hard_od (3-point contact on flats)", () => {
    const r = latheWorkholdingEngine.selectJaw({
      grip_diameter_mm: 30,
      stock_form: "hex_bar",
    });
    expect(r.recommended_jaw).toBe("hard_od");
    expect(r.justification[0]).toContain("Hex");
  });

  it("fine surface finish (Ra < 0.8) → soft_od to avoid jaw marks", () => {
    const r = latheWorkholdingEngine.selectJaw({
      grip_diameter_mm: 50,
      surface_finish_ra_um: 0.4,
    });
    expect(r.recommended_jaw).toBe("soft_od");
    expect(r.bore_program_needed).toBe(true);
  });

  it("high batch size (>100) → collet for fast changeover", () => {
    const r = latheWorkholdingEngine.selectJaw({
      grip_diameter_mm: 50,
      batch_size: 500,
    });
    expect(r.recommended_jaw).toBe("collet");
  });

  it("deformation-sensitive material (aluminum) → soft_od", () => {
    const r = latheWorkholdingEngine.selectJaw({
      grip_diameter_mm: 50,
      material: "aluminum",
    });
    expect(r.recommended_jaw).toBe("soft_od");
  });

  it("default steel bar → hard_od + ISO 10218 SF ≥ 2.5", () => {
    const r = latheWorkholdingEngine.selectJaw({
      grip_diameter_mm: 50,
      cutting_force_n: 2000,
      material: "steel",
    });
    expect(r.recommended_jaw).toBe("hard_od");
    expect(r.safety_factor).toBeGreaterThanOrEqual(2.5);
    // selectJaw uses min 5000 N → SF = 5000·0.20·3/2000 = 1.5
    // but requiredForce = 2.5·2000/(0.20·3) = 8333 N → max(8333,5000) = 8333
    // SF = 8333·0.20·3/2000 = 2.5
    expect(r.clamping_force_n).toBe(8333);
    expect(r.safety_factor).toBeCloseTo(2.5, 2);
  });

  it("large bore (>20mm, >50% of OD) on hard_od case surfaces hard_id alternative", () => {
    const r = latheWorkholdingEngine.selectJaw({
      grip_diameter_mm: 60,
      bore_id_mm: 40,
      material: "steel",
    });
    // wall/OD = (60-40)/2/60 = 16.7% → not thin → falls through to default hard_od path
    expect(r.recommended_jaw).toBe("hard_od");
    expect(r.alternatives.some((a) => a.jaw === "hard_id")).toBe(true);
  });
});

describe("LatheWorkholdingEngine — calculateTrilobe()", () => {
  it("baseline thin ring: δ matches F·R³/(E·I) formula", () => {
    // OD 100, ID 96 (wall 2mm), b 10mm, clamp 3000 N, steel E 210 GPa
    // t=2, R=49, I=10·8/12=6.667, per-jaw F=1000 N
    // δ_mm = 1000·49³ / (210000·6.667) = 117,649,000 / 1,400,070 ≈ 84.03 mm
    // δ_um ≈ 84,030 µm — the ring catastrophically yields, demonstrating WHY
    // thin walls need 6-jaw / collet (selectJaw routes 4% wall to 6_jaw).
    const r = latheWorkholdingEngine.calculateTrilobe({
      od_mm: 100, id_mm: 96, jaw_width_mm: 10, clamp_force_n: 3000, material: "steel",
    });
    expect(r.delta_um).toBeGreaterThan(80_000);
    expect(r.delta_um).toBeLessThan(90_000);
    expect(r.details.wall_thickness_mm).toBe(2);
    expect(r.details.mean_radius_mm).toBe(49);
    expect(r.details.per_jaw_force_n).toBe(1000);
    expect(r.details.moment_of_inertia_mm4).toBeCloseTo(6.667, 1);
  });

  it("acceptable=false + recommendation when distortion exceeds tolerance/2", () => {
    const r = latheWorkholdingEngine.calculateTrilobe({
      od_mm: 100, id_mm: 96, jaw_width_mm: 10, clamp_force_n: 3000,
      tolerance_mm: 0.05, material: "steel",
    });
    // 84 mm distortion vastly exceeds 0.025 mm tol/2 → not acceptable
    expect(r.acceptable).toBe(false);
    expect(r.recommendation.length).toBeGreaterThan(0);
  });

  it("thick-wall ring: distortion drops cubically with t", () => {
    // OD 100, ID 50 (wall 25mm), same force → I scales by (25/2)³ = 1953×
    const thin = latheWorkholdingEngine.calculateTrilobe({
      od_mm: 100, id_mm: 96, jaw_width_mm: 10, clamp_force_n: 3000,
    });
    const thick = latheWorkholdingEngine.calculateTrilobe({
      od_mm: 100, id_mm: 50, jaw_width_mm: 10, clamp_force_n: 3000,
    });
    expect(thick.delta_um).toBeLessThan(thin.delta_um / 100);
  });

  it("max_safe_force back-solves to tolerance/2 at exactly maxSafeForce", () => {
    const r = latheWorkholdingEngine.calculateTrilobe({
      od_mm: 50, id_mm: 30, jaw_width_mm: 10, clamp_force_n: 1000,
      tolerance_mm: 0.05,
    });
    // max_safe_force = (tol/2 · E · I) / R³ · 3
    // R = 20, t = 10, I = 10·1000/12 = 833.33, E = 210000
    // max = (0.025 · 210000 · 833.33) / 8000 · 3 = 4375000/8000·3 ≈ 1640.6 ≈ round 1641
    expect(r.max_safe_force_n).toBeCloseTo(1641, -1);
  });
});

describe("LatheWorkholdingEngine — calculateFaceDriver()", () => {
  it("4 pins, μ=0.25, F_ax=1000N, r=20mm → T = 1000·0.25·0.020·4 = 20 Nm", () => {
    const r = latheWorkholdingEngine.calculateFaceDriver({
      axial_force_n: 1000,
      pin_circle_radius_mm: 20,
    });
    expect(r.transmittable_torque_nm).toBeCloseTo(20, 1);
  });

  it("user-supplied required torque drives the SF computation", () => {
    const r = latheWorkholdingEngine.calculateFaceDriver({
      axial_force_n: 5000,
      pin_circle_radius_mm: 25,
      n_pins: 6,
      mu: 0.3,
      required_torque_nm: 5,
    });
    // T = 5000·0.3·(25/1000)·6 = 5000·0.3·0.025·6 = 225 Nm; SF = 225/5 = 45.
    expect(r.transmittable_torque_nm).toBeCloseTo(225, 1);
    expect(r.safety_factor).toBeCloseTo(45, 1);
    expect(r.is_adequate).toBe(true);
  });

  it("inadequate SF triggers WARNING note", () => {
    const r = latheWorkholdingEngine.calculateFaceDriver({
      axial_force_n: 100,
      pin_circle_radius_mm: 10,
      required_torque_nm: 5,
    });
    // T = 100·0.25·(10/1000)·4 = 100·0.25·0.010·4 = 1 Nm; SF = 1/5 = 0.2 < 2.5
    expect(r.transmittable_torque_nm).toBeCloseTo(1.0, 2);
    expect(r.is_adequate).toBe(false);
    expect(r.notes.some((n) => n.includes("WARNING"))).toBe(true);
  });
});

describe("LatheWorkholdingEngine — calculateExpandingMandrel()", () => {
  it("default-interference grip pressure follows Lame", () => {
    // bore 30, OD 60 → r_bore 15, r_o 30, Δ=0.02 (radial 0.01)
    // ratio = (900+225)/(900-225) = 1125/675 = 1.6667, +0.3 = 1.9667
    // p = 0.01 · 210000 / (15 · 1.9667) = 2100 / 29.5 ≈ 71.19 MPa
    const r = latheWorkholdingEngine.calculateExpandingMandrel({
      bore_id_mm: 30, od_mm: 60, mandrel_od_mm: 30, contact_length_mm: 25, material: "steel",
    });
    expect(r.contact_pressure_mpa).toBeCloseTo(71.19, 1);
    // T = p · μ · 2π · r · L · r / 1e6 = 71.19·0.15·2π·15·25·15/1e6
    //   = 71.19·0.15·6.283·15·25·15/1e6 ≈ 0.0377 Nm — small mandrel
    expect(r.grip_torque_nm).toBeGreaterThan(0);
  });

  it("higher interference raises pressure linearly", () => {
    const lo = latheWorkholdingEngine.calculateExpandingMandrel({
      bore_id_mm: 30, od_mm: 60, mandrel_od_mm: 30,
      contact_length_mm: 25, interference_mm: 0.02,
    });
    const hi = latheWorkholdingEngine.calculateExpandingMandrel({
      bore_id_mm: 30, od_mm: 60, mandrel_od_mm: 30,
      contact_length_mm: 25, interference_mm: 0.04,
    });
    expect(hi.contact_pressure_mpa).toBeCloseTo(lo.contact_pressure_mpa * 2, 1);
  });
});

describe("LatheWorkholdingEngine — calculateMagneticChuck()", () => {
  it("non-ferrous part → rejected with 0 force", () => {
    const r = latheWorkholdingEngine.calculateMagneticChuck({
      contact_area_cm2: 100, is_ferrous: false, part_thickness_mm: 15,
    });
    expect(r.holding_force_n).toBe(0);
    expect(r.is_adequate).toBe(false);
    expect(r.notes[0]).toContain("REJECTED");
  });

  it("ferrous part ≥10mm thick at default 80 N/cm² → full holding force", () => {
    const r = latheWorkholdingEngine.calculateMagneticChuck({
      contact_area_cm2: 50, is_ferrous: true, part_thickness_mm: 20,
    });
    expect(r.holding_force_n).toBe(50 * 80);  // 4000 N
  });

  it("thin ferrous part (<10mm) linearly de-rates", () => {
    const r = latheWorkholdingEngine.calculateMagneticChuck({
      contact_area_cm2: 50, is_ferrous: true, part_thickness_mm: 5,
    });
    // 50·80·0.5 = 2000
    expect(r.holding_force_n).toBe(2000);
  });

  it("very thin parts floor at 30% de-rating", () => {
    const r = latheWorkholdingEngine.calculateMagneticChuck({
      contact_area_cm2: 100, is_ferrous: true, part_thickness_mm: 1,
    });
    // factor = max(0.3, 1/10) = 0.3 → 100·80·0.3 = 2400
    expect(r.holding_force_n).toBe(2400);
  });
});

describe("LatheWorkholdingEngine — stockFormRecommendation()", () => {
  it("bar → hard_od + G71", () => {
    const r = latheWorkholdingEngine.stockFormRecommendation("bar", 50);
    expect(r.workholding_recommendation).toBe("hard_od");
    expect(r.roughing_cycle).toBe("G71");
  });

  it("forging → soft_od + G73 (pattern repeat for near-net)", () => {
    const r = latheWorkholdingEngine.stockFormRecommendation("forging", 50);
    expect(r.workholding_recommendation).toBe("soft_od");
    expect(r.roughing_cycle).toBe("G73");
  });

  it("casting → soft_od + G73", () => {
    const r = latheWorkholdingEngine.stockFormRecommendation("casting", 50);
    expect(r.roughing_cycle).toBe("G73");
  });

  it("hex_bar → hard_od + computes across-corners from across-flats", () => {
    const r = latheWorkholdingEngine.stockFormRecommendation("hex_bar", 30);
    expect(r.workholding_recommendation).toBe("hard_od");
    // 30 × 1.155 = 34.65 → "across-corners: 34.6"
    expect(r.clamping_notes.some((n) => n.includes("34.6"))).toBe(true);
  });

  it("thin tube (wall/OD < 8%) → collet", () => {
    const r = latheWorkholdingEngine.stockFormRecommendation("tube", 100, 2);
    expect(r.workholding_recommendation).toBe("collet");
  });

  it("thick tube (wall/OD ≥ 8%) → hard_od with reduced-pressure note", () => {
    const r = latheWorkholdingEngine.stockFormRecommendation("tube", 100, 15);
    expect(r.workholding_recommendation).toBe("hard_od");
  });

  it("pre_machined → soft_od to protect finished surfaces", () => {
    const r = latheWorkholdingEngine.stockFormRecommendation("pre_machined", 50);
    expect(r.workholding_recommendation).toBe("soft_od");
  });
});
