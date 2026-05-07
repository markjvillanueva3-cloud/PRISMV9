/**
 * WEDMHeadClearanceEngine tests
 * MS-P2.5-SAFETY/U-P2.5-SAFE-03
 */

import { describe, it, expect } from "vitest";
import {
  WEDMHeadClearanceEngine,
  wedmHeadClearanceEngine,
  type HeadClearanceInput,
} from "../engines/WEDMHeadClearanceEngine.js";

describe("WEDMHeadClearanceEngine", () => {
  const engine = new WEDMHeadClearanceEngine();

  describe("evaluate()", () => {
    it("returns PASS for thin workpiece with adequate clearance", () => {
      const input: HeadClearanceInput = {
        workpiece_thickness_mm: 20,
        workpiece_top_z_mm: 50,
        upper_guide_z_mm: 85,
        upper_head_height_mm: 25,
      };

      const result = engine.evaluate(input);

      expect(result.success).toBe(true);
      expect(result.pass).toBe(true);
      expect(result.verdict).toBe("pass");
      expect(result.hard_block).toBe(false);
      expect(result.metrics.band).toBe("thin");
      expect(result.metrics.upper_clearance_mm).toBe(10);
      expect(result.safety_gate_input.pass).toBe(true);
      expect(result.safety_score_contribution).toBe(0.15);
    });

    it("returns PASS for medium workpiece with adequate clearance", () => {
      const input: HeadClearanceInput = {
        workpiece_thickness_mm: 50,
        workpiece_top_z_mm: 80,
        upper_guide_z_mm: 120,
        upper_head_height_mm: 25,
      };

      const result = engine.evaluate(input);

      expect(result.pass).toBe(true);
      expect(result.metrics.band).toBe("medium");
      expect(result.metrics.required_clearance_mm).toBe(5);
    });

    it("returns PASS for thick workpiece with adequate clearance", () => {
      const input: HeadClearanceInput = {
        workpiece_thickness_mm: 100,
        workpiece_top_z_mm: 150,
        upper_guide_z_mm: 190,
        upper_head_height_mm: 25,
        lower_head_height_mm: 15,
      };

      const result = engine.evaluate(input);

      expect(result.pass).toBe(true);
      expect(result.metrics.band).toBe("thick");
      expect(result.metrics.required_clearance_mm).toBe(8);
    });

    it("returns FAIL when upper clearance is insufficient", () => {
      const input: HeadClearanceInput = {
        workpiece_thickness_mm: 20,
        workpiece_top_z_mm: 50,
        upper_guide_z_mm: 76,
        upper_head_height_mm: 25,
      };

      const result = engine.evaluate(input);

      expect(result.pass).toBe(false);
      expect(result.verdict).toBe("fail_upper_clearance");
      expect(result.hard_block).toBe(true);
      expect(result.metrics.upper_clearance_mm).toBe(1);
      expect(result.safety_score_contribution).toBe(0);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it("returns FAIL when lower clearance is insufficient", () => {
      const input: HeadClearanceInput = {
        workpiece_thickness_mm: 20,
        workpiece_top_z_mm: 22,
        upper_guide_z_mm: 60,
        upper_head_height_mm: 25,
        lower_guide_z_mm: 0,
        lower_head_height_mm: 10,
      };

      const result = engine.evaluate(input);

      expect(result.pass).toBe(false);
      expect(result.verdict).toBe("fail_lower_clearance");
      expect(result.metrics.lower_clearance_mm).toBeLessThan(3);
    });

    it("returns FAIL when taper swing reduces effective clearance", () => {
      const input: HeadClearanceInput = {
        workpiece_thickness_mm: 50,
        workpiece_top_z_mm: 70,
        upper_guide_z_mm: 102,
        upper_head_height_mm: 25,
        taper_angle_deg: 15,
      };

      const result = engine.evaluate(input);

      expect(result.pass).toBe(false);
      expect(result.verdict).toBe("fail_taper_swing");
      expect(result.metrics.taper_swing_mm).toBeGreaterThan(0);
      expect(result.metrics.effective_upper_clearance_mm).toBeLessThan(result.metrics.upper_clearance_mm);
    });

    it("returns MARGINAL when clearance is above minimum but below warning threshold", () => {
      const input: HeadClearanceInput = {
        workpiece_thickness_mm: 20,
        workpiece_top_z_mm: 50,
        upper_guide_z_mm: 78.5,
        upper_head_height_mm: 25,
      };

      const result = engine.evaluate(input);

      expect(result.pass).toBe(true);
      expect(result.verdict).toBe("marginal");
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it("returns FAIL for invalid input (missing thickness)", () => {
      const result = engine.evaluate({
        workpiece_thickness_mm: NaN,
        workpiece_top_z_mm: 50,
        upper_guide_z_mm: 100,
      });

      expect(result.success).toBe(false);
      expect(result.pass).toBe(false);
      expect(result.verdict).toBe("fail_invalid_input");
    });

    it("returns FAIL for zero thickness", () => {
      const result = engine.evaluate({
        workpiece_thickness_mm: 0,
        workpiece_top_z_mm: 50,
        upper_guide_z_mm: 100,
      });

      expect(result.pass).toBe(false);
      expect(result.verdict).toBe("fail_invalid_input");
    });

    it("returns FAIL for negative thickness", () => {
      const result = engine.evaluate({
        workpiece_thickness_mm: -10,
        workpiece_top_z_mm: 50,
        upper_guide_z_mm: 100,
      });

      expect(result.pass).toBe(false);
      expect(result.verdict).toBe("fail_invalid_input");
    });

    it("applies safety margin correctly", () => {
      const baseInput: HeadClearanceInput = {
        workpiece_thickness_mm: 20,
        workpiece_top_z_mm: 50,
        upper_guide_z_mm: 79,
        upper_head_height_mm: 25,
      };

      const withoutMargin = engine.evaluate(baseInput);
      expect(withoutMargin.pass).toBe(true);

      const withMargin = engine.evaluate({ ...baseInput, safety_margin_mm: 2 });
      expect(withMargin.pass).toBe(false);
      expect(withMargin.metrics.required_clearance_mm).toBe(5);
    });

    it("returns correct safety_gate_input shape", () => {
      const result = engine.evaluate({
        workpiece_thickness_mm: 30,
        workpiece_top_z_mm: 50,
        upper_guide_z_mm: 85,
      });

      const sgi = result.safety_gate_input;
      expect(sgi).toHaveProperty("pass");
      expect(sgi).toHaveProperty("min_clearance_mm");
      expect(sgi).toHaveProperty("required_clearance_mm");
      expect(typeof sgi.pass).toBe("boolean");
      expect(typeof sgi.min_clearance_mm).toBe("number");
      expect(typeof sgi.required_clearance_mm).toBe("number");
    });
  });

  describe("gate()", () => {
    it("returns allow=true for passing clearance", () => {
      const result = engine.gate({
        workpiece_thickness_mm: 25,
        workpiece_top_z_mm: 60,
        upper_guide_z_mm: 95,
        lower_head_height_mm: 15,
      });

      expect(result.allow).toBe(true);
      expect(result.reason).toContain("HEAD CLEARANCE OK");
    });

    it("returns allow=false for failing clearance", () => {
      const result = engine.gate({
        workpiece_thickness_mm: 25,
        workpiece_top_z_mm: 60,
        upper_guide_z_mm: 86,
        lower_head_height_mm: 15,
      });

      expect(result.allow).toBe(false);
      expect(result.reason).toContain("HEAD CLEARANCE BLOCK");
    });
  });

  describe("getThicknessBand()", () => {
    it("returns thin for ≤ 25mm", () => {
      expect(engine.getThicknessBand(10)).toBe("thin");
      expect(engine.getThicknessBand(25)).toBe("thin");
    });

    it("returns medium for 25-75mm", () => {
      expect(engine.getThicknessBand(26)).toBe("medium");
      expect(engine.getThicknessBand(50)).toBe("medium");
      expect(engine.getThicknessBand(75)).toBe("medium");
    });

    it("returns thick for > 75mm", () => {
      expect(engine.getThicknessBand(76)).toBe("thick");
      expect(engine.getThicknessBand(100)).toBe("thick");
      expect(engine.getThicknessBand(200)).toBe("thick");
    });
  });

  describe("getMinClearance()", () => {
    it("returns correct minimum clearances", () => {
      expect(engine.getMinClearance("thin")).toBe(3);
      expect(engine.getMinClearance("medium")).toBe(5);
      expect(engine.getMinClearance("thick")).toBe(8);
    });
  });

  describe("adversarial inputs", () => {
    it("handles Infinity in upper_guide_z_mm", () => {
      const result = engine.evaluate({
        workpiece_thickness_mm: 25,
        workpiece_top_z_mm: 50,
        upper_guide_z_mm: Infinity,
      });

      expect(result.success).toBe(false);
      expect(result.verdict).toBe("fail_invalid_input");
    });

    it("handles negative upper_guide_z_mm", () => {
      const result = engine.evaluate({
        workpiece_thickness_mm: 25,
        workpiece_top_z_mm: 50,
        upper_guide_z_mm: -100,
      });

      expect(result.pass).toBe(false);
    });

    it("handles very large taper angle (90 degrees)", () => {
      const result = engine.evaluate({
        workpiece_thickness_mm: 25,
        workpiece_top_z_mm: 50,
        upper_guide_z_mm: 200,
        taper_angle_deg: 89,
      });

      expect(result.success).toBe(true);
      expect(result.metrics.taper_swing_mm).toBeGreaterThan(100);
    });

    it("handles negative taper angle (treated as absolute)", () => {
      const positive = engine.evaluate({
        workpiece_thickness_mm: 25,
        workpiece_top_z_mm: 50,
        upper_guide_z_mm: 100,
        taper_angle_deg: 10,
      });

      const negative = engine.evaluate({
        workpiece_thickness_mm: 25,
        workpiece_top_z_mm: 50,
        upper_guide_z_mm: 100,
        taper_angle_deg: -10,
      });

      expect(positive.metrics.taper_swing_mm).toBeCloseTo(negative.metrics.taper_swing_mm, 5);
    });
  });

  describe("variability: machine types", () => {
    it("handles Mitsubishi MV1200S typical setup", () => {
      const result = engine.evaluate({
        workpiece_thickness_mm: 40,
        workpiece_top_z_mm: 60,
        upper_guide_z_mm: 95,
        upper_head_height_mm: 28,
        lower_guide_z_mm: 0,
        lower_head_height_mm: 15,
      });

      expect(result.success).toBe(true);
      expect(result.metrics.upper_clearance_mm).toBe(7);
    });

    it("handles Sodick VL400Q compact head", () => {
      const result = engine.evaluate({
        workpiece_thickness_mm: 30,
        workpiece_top_z_mm: 45,
        upper_guide_z_mm: 72,
        upper_head_height_mm: 20,
        lower_head_height_mm: 12,
      });

      expect(result.success).toBe(true);
      expect(result.metrics.upper_clearance_mm).toBe(7);
    });

    it("handles AgieCharmilles large head with taper", () => {
      const result = engine.evaluate({
        workpiece_thickness_mm: 80,
        workpiece_top_z_mm: 100,
        upper_guide_z_mm: 145,
        upper_head_height_mm: 30,
        taper_angle_deg: 8,
      });

      expect(result.success).toBe(true);
      expect(result.metrics.taper_swing_mm).toBeGreaterThan(10);
    });
  });

  describe("singleton export", () => {
    it("wedmHeadClearanceEngine singleton works correctly", () => {
      const result = wedmHeadClearanceEngine.evaluate({
        workpiece_thickness_mm: 25,
        workpiece_top_z_mm: 60,
        upper_guide_z_mm: 95,
        lower_head_height_mm: 15,
      });

      expect(result.success).toBe(true);
      expect(result.pass).toBe(true);
    });
  });
});
