/**
 * PPPhysicsConstraintValidatorEngine Tests — PP-DL-MS3
 */
import { describe, it, expect } from "vitest";
import {
  PPPhysicsConstraintValidatorEngine,
  ppPhysicsConstraintValidatorEngine,
  type CuttingCondition,
} from "../engines/PPPhysicsConstraintValidatorEngine.js";

const safeCut: CuttingCondition = {
  spindle_speed_rpm: 5000,
  feed_rate_mm_min: 500,
  depth_of_cut_mm: 2,
  width_of_cut_mm: 5,
  tool_diameter_mm: 10,
  tool_flute_count: 4,
  tool_overhang_mm: 40,
  spindle_power_kW: 22,
  machine_max_rpm: 12000,
};

const aggressiveCut: CuttingCondition = {
  spindle_speed_rpm: 3000,
  feed_rate_mm_min: 2400,
  depth_of_cut_mm: 15,
  width_of_cut_mm: 10,
  tool_diameter_mm: 10,
  tool_flute_count: 4,
  tool_overhang_mm: 80,
  material_kc1_1: 2500,
  spindle_power_kW: 15,
  machine_max_rpm: 8000,
};

const rubbingCut: CuttingCondition = {
  spindle_speed_rpm: 10000,
  feed_rate_mm_min: 20,
  depth_of_cut_mm: 0.1,
  width_of_cut_mm: 5,
  tool_diameter_mm: 10,
  tool_flute_count: 4,
};

describe("PPPhysicsConstraintValidatorEngine", () => {
  it("exports singleton", () => {
    expect(ppPhysicsConstraintValidatorEngine).toBeInstanceOf(PPPhysicsConstraintValidatorEngine);
  });

  describe("validate — safe conditions", () => {
    it("passes all checks", () => {
      const r = ppPhysicsConstraintValidatorEngine.validate(safeCut);
      expect(r.safe_to_proceed).toBe(true);
      expect(r.overall).toBe("pass");
    });

    it("has multiple checks", () => {
      const r = ppPhysicsConstraintValidatorEngine.validate(safeCut);
      expect(r.total_checks).toBeGreaterThan(5);
    });

    it("all checks pass or warn", () => {
      const r = ppPhysicsConstraintValidatorEngine.validate(safeCut);
      expect(r.criticals).toBe(0);
      expect(r.violations).toBe(0);
    });

    it("computes positive force", () => {
      const r = ppPhysicsConstraintValidatorEngine.validate(safeCut);
      expect(r.estimated_cutting_force_N).toBeGreaterThan(0);
    });

    it("computes positive power", () => {
      const r = ppPhysicsConstraintValidatorEngine.validate(safeCut);
      expect(r.estimated_power_kW).toBeGreaterThan(0);
    });

    it("computes positive chip load", () => {
      const r = ppPhysicsConstraintValidatorEngine.validate(safeCut);
      expect(r.estimated_chip_load_mm).toBeGreaterThan(0);
    });
  });

  describe("validate — aggressive conditions", () => {
    it("flags violations or criticals", () => {
      const r = ppPhysicsConstraintValidatorEngine.validate(aggressiveCut);
      expect(r.safe_to_proceed).toBe(false);
      expect(r.violations + r.criticals).toBeGreaterThan(0);
    });

    it("overall is not pass", () => {
      const r = ppPhysicsConstraintValidatorEngine.validate(aggressiveCut);
      expect(r.overall).not.toBe("pass");
    });

    it("generates recommendations", () => {
      const r = ppPhysicsConstraintValidatorEngine.validate(aggressiveCut);
      expect(r.recommendations.length).toBeGreaterThan(0);
    });

    it("high force due to hard material + deep cut", () => {
      const r = ppPhysicsConstraintValidatorEngine.validate(aggressiveCut);
      expect(r.estimated_cutting_force_N).toBeGreaterThan(5000);
    });
  });

  describe("validate — rubbing conditions", () => {
    it("warns about low chip load", () => {
      const r = ppPhysicsConstraintValidatorEngine.validate(rubbingCut);
      const chipCheck = r.checks.find(c => c.constraint === "chip_load");
      expect(chipCheck).toBeDefined();
      expect(chipCheck!.severity).toBe("warning");
      expect(chipCheck!.message).toContain("rubbing");
    });
  });

  describe("check structure", () => {
    it("each check has required fields", () => {
      const r = ppPhysicsConstraintValidatorEngine.validate(safeCut);
      for (const c of r.checks) {
        expect(c.constraint.length).toBeGreaterThan(0);
        expect(["pass", "warning", "violation", "critical"]).toContain(c.severity);
        expect(typeof c.computed_value).toBe("number");
        expect(typeof c.limit_value).toBe("number");
        expect(c.unit.length).toBeGreaterThan(0);
        expect(c.message.length).toBeGreaterThan(0);
      }
    });

    it("includes formulas for key checks", () => {
      const r = ppPhysicsConstraintValidatorEngine.validate(safeCut);
      const withFormula = r.checks.filter(c => c.formula);
      expect(withFormula.length).toBeGreaterThan(2);
    });
  });

  describe("specific constraint checks", () => {
    it("RPM exceeding machine limit → violation", () => {
      const r = ppPhysicsConstraintValidatorEngine.validate({
        ...safeCut, spindle_speed_rpm: 15000, machine_max_rpm: 12000,
      });
      const rpmCheck = r.checks.find(c => c.constraint === "spindle_rpm");
      expect(rpmCheck?.severity).toBe("violation");
    });

    it("power exceeding spindle → violation", () => {
      const r = ppPhysicsConstraintValidatorEngine.validate({
        ...safeCut,
        depth_of_cut_mm: 10, width_of_cut_mm: 10,
        feed_rate_mm_min: 2000,
        spindle_power_kW: 5, // very small spindle
      });
      const powerCheck = r.checks.find(c => c.constraint === "spindle_power");
      expect(["violation", "warning"]).toContain(powerCheck?.severity);
    });

    it("long overhang → deflection warning/violation", () => {
      const r = ppPhysicsConstraintValidatorEngine.validate({
        ...safeCut,
        tool_overhang_mm: 100, // L/D = 10
        depth_of_cut_mm: 5,
        feed_rate_mm_min: 1000,
      });
      const deflCheck = r.checks.find(c => c.constraint === "tool_deflection");
      expect(deflCheck).toBeDefined();
      expect(["warning", "violation", "critical"]).toContain(deflCheck!.severity);
    });

    it("full slotting with deep DOC → engagement violation", () => {
      const r = ppPhysicsConstraintValidatorEngine.validate({
        ...safeCut,
        width_of_cut_mm: 10, // ae = dia (full slot)
        depth_of_cut_mm: 20, // 2x diameter
      });
      const engCheck = r.checks.find(c => c.constraint === "engagement_ratio");
      expect(engCheck).toBeDefined();
      expect(["warning", "violation"]).toContain(engCheck!.severity);
    });
  });

  describe("isSafe", () => {
    it("true for safe conditions", () => {
      expect(ppPhysicsConstraintValidatorEngine.isSafe(safeCut)).toBe(true);
    });

    it("false for aggressive conditions", () => {
      expect(ppPhysicsConstraintValidatorEngine.isSafe(aggressiveCut)).toBe(false);
    });
  });

  describe("Kienzle formula verification", () => {
    it("Fc = kc1.1 × ap × fz^(1-mc) with known values", () => {
      const kc = 1800;
      const mc = 0.25;
      const ap = 3;
      const fz = 0.1;
      const expectedFc = kc * ap * Math.pow(fz, 1 - mc);

      const r = ppPhysicsConstraintValidatorEngine.validate({
        spindle_speed_rpm: 5000,
        feed_rate_mm_min: 5000 * 4 * fz, // f = n × z × fz
        depth_of_cut_mm: ap,
        width_of_cut_mm: 5,
        tool_diameter_mm: 10,
        tool_flute_count: 4,
        material_kc1_1: kc,
        material_mc: mc,
      });

      expect(r.estimated_cutting_force_N).toBeCloseTo(expectedFc, 0);
    });
  });
});
