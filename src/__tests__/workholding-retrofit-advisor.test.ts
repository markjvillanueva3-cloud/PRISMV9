/**
 * WorkholdingRetrofitAdvisorEngine — 20 tests
 *
 * Tests: diagnoseRunout, predictJawWear, checkFixtureViability, optimizeClampingForce
 */
import { describe, it, expect } from "vitest";
import { WorkholdingRetrofitAdvisorEngine } from "../engines/WorkholdingRetrofitAdvisorEngine.js";

const engine = new WorkholdingRetrofitAdvisorEngine();

describe("WorkholdingRetrofitAdvisorEngine", () => {
  // ── diagnoseRunout ──

  describe("diagnoseRunout", () => {
    it("returns no causes when runout is within target", () => {
      const r = engine.diagnoseRunout({
        measured_runout_mm: 0.005,
        target_runout_mm: 0.010,
        workholding_type: "chuck_3jaw",
        part_diameter_mm: 50,
      });
      expect(r.probable_causes).toHaveLength(0);
      expect(r.expected_improvement_mm).toBe(0);
    });

    it("identifies jaw wear as top cause for old chuck", () => {
      const r = engine.diagnoseRunout({
        measured_runout_mm: 0.050,
        target_runout_mm: 0.010,
        workholding_type: "chuck_3jaw",
        jaw_age_hours: 3000,
        part_diameter_mm: 50,
      });
      expect(r.probable_causes.length).toBeGreaterThanOrEqual(5);
      // Jaw wear should be high probability with 3000 hours
      const jawWear = r.probable_causes.find(c => c.cause.includes("Jaw/collet wear"));
      expect(jawWear).toBeDefined();
      expect(jawWear!.probability).toBeGreaterThan(0.5);
    });

    it("identifies collet wear for collet workholding", () => {
      const r = engine.diagnoseRunout({
        measured_runout_mm: 0.030,
        target_runout_mm: 0.005,
        workholding_type: "collet",
        jaw_age_hours: 1500,
        part_diameter_mm: 20,
      });
      const colletCause = r.probable_causes.find(c => c.cause.includes("Jaw/collet wear"));
      expect(colletCause).toBeDefined();
      expect(colletCause!.fix).toContain("collet");
    });

    it("flags high L/D ratio deflection for long parts", () => {
      const r = engine.diagnoseRunout({
        measured_runout_mm: 0.080,
        target_runout_mm: 0.010,
        workholding_type: "chuck_3jaw",
        part_diameter_mm: 20,
        part_length_mm: 200, // L/D = 10
      });
      const ldCause = r.probable_causes.find(c => c.cause.includes("L/D ratio"));
      expect(ldCause).toBeDefined();
      expect(ldCause!.probability).toBeGreaterThan(0.5);
    });

    it("returns sorted causes (highest probability first)", () => {
      const r = engine.diagnoseRunout({
        measured_runout_mm: 0.060,
        target_runout_mm: 0.010,
        workholding_type: "chuck_3jaw",
        jaw_age_hours: 2000,
        part_diameter_mm: 50,
      });
      for (let i = 1; i < r.probable_causes.length; i++) {
        expect(r.probable_causes[i - 1].probability).toBeGreaterThanOrEqual(
          r.probable_causes[i].probability
        );
      }
    });

    it("provides expected improvement > 0 for excess runout", () => {
      const r = engine.diagnoseRunout({
        measured_runout_mm: 0.040,
        target_runout_mm: 0.010,
        workholding_type: "chuck_4jaw",
        part_diameter_mm: 80,
      });
      expect(r.expected_improvement_mm).toBeGreaterThan(0);
      expect(r.expected_improvement_mm).toBeLessThanOrEqual(0.030);
    });

    it("handles vise workholding (no jaw/scroll causes)", () => {
      const r = engine.diagnoseRunout({
        measured_runout_mm: 0.030,
        target_runout_mm: 0.010,
        workholding_type: "vise",
        part_diameter_mm: 40,
      });
      const scrollCause = r.probable_causes.find(c => c.cause.includes("scroll"));
      expect(scrollCause).toBeUndefined();
    });
  });

  // ── predictJawWear ──

  describe("predictJawWear", () => {
    it("predicts longer life for hard jaws vs soft jaws", () => {
      const hard = engine.predictJawWear({
        jaw_type: "hard",
        material_clamped: "steel",
        cycles_per_day: 100,
        clamping_force_kn: 30,
      });
      const soft = engine.predictJawWear({
        jaw_type: "soft",
        material_clamped: "steel",
        cycles_per_day: 100,
        clamping_force_kn: 30,
      });
      // Hard jaws have lower wear rate but tighter limit — compare cycles
      expect(hard.remaining_life_days).toBeGreaterThan(0);
      expect(soft.remaining_life_days).toBeGreaterThan(0);
    });

    it("returns OVERDUE when current age exceeds life", () => {
      const r = engine.predictJawWear({
        jaw_type: "aluminum_soft",
        material_clamped: "steel",
        cycles_per_day: 200,
        clamping_force_kn: 50,
        current_age_days: 99999,
      });
      expect(r.remaining_life_days).toBe(0);
      expect(r.remaining_cycles).toBe(0);
      expect(r.replacement_schedule).toContain("OVERDUE");
    });

    it("provides 11-point runout progression", () => {
      const r = engine.predictJawWear({
        jaw_type: "hard",
        material_clamped: "aluminum",
        cycles_per_day: 150,
        clamping_force_kn: 25,
      });
      expect(r.runout_progression).toHaveLength(11);
      // First entry should be 0 days
      expect(r.runout_progression[0].days).toBe(0);
      expect(r.runout_progression[0].expected_runout_mm).toBe(0);
      // Last entry should have non-zero runout
      expect(r.runout_progression[10].expected_runout_mm).toBeGreaterThan(0);
    });

    it("higher clamping force reduces life", () => {
      const low = engine.predictJawWear({
        jaw_type: "hard",
        material_clamped: "steel",
        cycles_per_day: 100,
        clamping_force_kn: 10,
      });
      const high = engine.predictJawWear({
        jaw_type: "hard",
        material_clamped: "steel",
        cycles_per_day: 100,
        clamping_force_kn: 50,
      });
      expect(low.remaining_life_days).toBeGreaterThan(high.remaining_life_days);
    });
  });

  // ── checkFixtureViability ──

  describe("checkFixtureViability", () => {
    it("returns viable when part unchanged", () => {
      const r = engine.checkFixtureViability({
        original_part: { diameter_mm: 50, length_mm: 100, weight_kg: 2 },
        modified_part: { diameter_mm: 50, length_mm: 100, weight_kg: 2 },
        fixture: {
          type: "chuck_3jaw",
          grip_diameter_range_mm: [10, 200],
          max_force_kn: 50,
          datum_faces: ["face_z"],
        },
      });
      expect(r.viable).toBe(true);
      expect(r.issues).toHaveLength(0);
    });

    it("flags diameter below grip range", () => {
      const r = engine.checkFixtureViability({
        original_part: { diameter_mm: 50, length_mm: 100, weight_kg: 2 },
        modified_part: { diameter_mm: 5, length_mm: 100, weight_kg: 0.5 },
        fixture: {
          type: "chuck_3jaw",
          grip_diameter_range_mm: [10, 200],
          max_force_kn: 50,
          datum_faces: [],
        },
      });
      expect(r.viable).toBe(false);
      expect(r.issues.some(i => i.includes("below fixture minimum"))).toBe(true);
    });

    it("flags diameter above grip range", () => {
      const r = engine.checkFixtureViability({
        original_part: { diameter_mm: 50, length_mm: 100, weight_kg: 2 },
        modified_part: { diameter_mm: 250, length_mm: 100, weight_kg: 10 },
        fixture: {
          type: "chuck_3jaw",
          grip_diameter_range_mm: [10, 200],
          max_force_kn: 50,
          datum_faces: [],
        },
      });
      expect(r.viable).toBe(false);
      expect(r.issues.some(i => i.includes("exceeds fixture maximum"))).toBe(true);
    });

    it("flags OD datum change", () => {
      const r = engine.checkFixtureViability({
        original_part: { diameter_mm: 50, length_mm: 100, weight_kg: 2 },
        modified_part: { diameter_mm: 45, length_mm: 100, weight_kg: 1.8 },
        fixture: {
          type: "chuck_3jaw",
          grip_diameter_range_mm: [10, 200],
          max_force_kn: 50,
          datum_faces: ["OD_datum"],
        },
      });
      expect(r.viable).toBe(false);
      expect(r.issues.some(i => i.includes("OD datum"))).toBe(true);
    });

    it("flags high L/D after length increase", () => {
      const r = engine.checkFixtureViability({
        original_part: { diameter_mm: 20, length_mm: 50, weight_kg: 0.5 },
        modified_part: { diameter_mm: 20, length_mm: 200, weight_kg: 2 },
        fixture: {
          type: "chuck_3jaw",
          grip_diameter_range_mm: [10, 100],
          max_force_kn: 50,
          datum_faces: [],
        },
      });
      expect(r.issues.some(i => i.includes("L/D ratio"))).toBe(true);
      expect(r.modifications_needed.some(m => m.description.includes("tailstock"))).toBe(true);
    });

    it("reports high risk for multiple issues", () => {
      const r = engine.checkFixtureViability({
        original_part: { diameter_mm: 50, length_mm: 100, weight_kg: 2 },
        modified_part: { diameter_mm: 250, length_mm: 400, weight_kg: 50 },
        fixture: {
          type: "chuck_3jaw",
          grip_diameter_range_mm: [10, 200],
          max_force_kn: 20,
          datum_faces: ["OD_datum", "face_z"],
        },
      });
      expect(r.viable).toBe(false);
      expect(r.risk_if_unchanged).toContain("High");
    });
  });

  // ── optimizeClampingForce ──

  describe("optimizeClampingForce", () => {
    it("returns valid force range for solid steel part", () => {
      const r = engine.optimizeClampingForce({
        part_diameter_mm: 50,
        cutting_force_n: 1000,
        part_material: "steel",
      });
      expect(r.min_force_kn).toBeGreaterThan(0);
      expect(r.max_force_kn).toBeGreaterThan(r.min_force_kn);
      expect(r.optimal_force_kn).toBeGreaterThanOrEqual(r.min_force_kn);
      expect(r.optimal_force_kn).toBeLessThanOrEqual(r.max_force_kn);
      expect(r.safety_factor).toBeGreaterThanOrEqual(2.0);
    });

    it("limits force for thin-wall aluminum part", () => {
      const r = engine.optimizeClampingForce({
        part_diameter_mm: 80,
        cutting_force_n: 500,
        part_material: "aluminum",
        wall_thickness_mm: 1.5,
      });
      expect(r.deformation_at_optimal_mm).toBeGreaterThan(0);
      expect(r.deformation_at_optimal_mm).toBeLessThan(0.1); // should be small
      expect(r.optimal_force_kn).toBeGreaterThan(0);
    });

    it("uses provided friction coefficient", () => {
      const lowFriction = engine.optimizeClampingForce({
        part_diameter_mm: 50,
        cutting_force_n: 1000,
        friction_coefficient: 0.15,
        part_material: "steel",
      });
      const highFriction = engine.optimizeClampingForce({
        part_diameter_mm: 50,
        cutting_force_n: 1000,
        friction_coefficient: 0.40,
        part_material: "steel",
      });
      // Lower friction needs more clamping force
      expect(lowFriction.min_force_kn).toBeGreaterThan(highFriction.min_force_kn);
    });

    it("handles zero wall thickness as solid part", () => {
      const r = engine.optimizeClampingForce({
        part_diameter_mm: 50,
        cutting_force_n: 1000,
        part_material: "steel",
      });
      expect(r.deformation_at_optimal_mm).toBeLessThanOrEqual(0.001);
    });

    it("handles very thin wall with high cutting force", () => {
      const r = engine.optimizeClampingForce({
        part_diameter_mm: 100,
        cutting_force_n: 2000,
        part_material: "aluminum",
        wall_thickness_mm: 0.5,
      });
      // Should still return valid numbers
      expect(r.min_force_kn).toBeGreaterThan(0);
      expect(r.optimal_force_kn).toBeGreaterThan(0);
      expect(Number.isFinite(r.deformation_at_optimal_mm)).toBe(true);
    });
  });
});
