/**
 * TribalPlaybookEnforcementEngine Tests (U-MIO43)
 * ================================================
 * Tests parameter validation against tribal knowledge and playbook rules.
 */

import { describe, it, expect } from "vitest";
import {
  tribalPlaybookEnforcementEngine,
  TribalPlaybookEnforcementEngine,
  type MachiningParameters,
  type MachiningContext,
} from "../engines/TribalPlaybookEnforcementEngine.js";

describe("TribalPlaybookEnforcementEngine", () => {
  // ══════════════════════════════════════════════════════════════════════════
  // Basic validation
  // ══════════════════════════════════════════════════════════════════════════
  describe("validate() basic", () => {
    it("validates good D2 roughing parameters", () => {
      const params: MachiningParameters = {
        cutting_speed_m_min: 45,
        feed_mm_rev: 0.15,
        depth_of_cut_mm: 2.0,
        coolant: "flood",
      };
      const context: MachiningContext = {
        material: "D2",
        material_iso_group: "H",
        operation: "roughing",
      };

      const result = tribalPlaybookEnforcementEngine.validate(params, context);

      expect(result.valid).toBe(true);
      expect(result.tribal_violations.length).toBe(0);
      expect(result.overall_score).toBeGreaterThan(0.9);
    });

    it("detects cutting speed too high for D2", () => {
      const params: MachiningParameters = {
        cutting_speed_m_min: 100, // Too high for D2
        feed_mm_rev: 0.15,
        depth_of_cut_mm: 2.0,
      };
      const context: MachiningContext = {
        material: "D2",
        material_iso_group: "H",
        operation: "roughing",
      };

      const result = tribalPlaybookEnforcementEngine.validate(params, context);

      expect(result.tribal_violations.length).toBeGreaterThan(0);
      expect(result.tribal_violations.some(v => v.parameter === "cutting_speed_m_min")).toBe(true);
    });

    it("detects feed too low for material", () => {
      const params: MachiningParameters = {
        cutting_speed_m_min: 45,
        feed_mm_rev: 0.02, // Too low
        depth_of_cut_mm: 2.0,
      };
      const context: MachiningContext = {
        material: "D2",
        material_iso_group: "H",
        operation: "roughing",
      };

      const result = tribalPlaybookEnforcementEngine.validate(params, context);

      expect(result.tribal_violations.some(v => v.parameter === "feed_mm_rev")).toBe(true);
    });

    it("validates aluminum high-speed parameters", () => {
      const params: MachiningParameters = {
        cutting_speed_m_min: 400,
        feed_mm_rev: 0.25,
        depth_of_cut_mm: 4.0,
        coolant: "mist",
      };
      const context: MachiningContext = {
        material: "6061",
        material_iso_group: "N",
        operation: "roughing",
      };

      const result = tribalPlaybookEnforcementEngine.validate(params, context);

      expect(result.valid).toBe(true);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // Thin wall validation
  // ══════════════════════════════════════════════════════════════════════════
  describe("thin wall validation", () => {
    it("flags excessive DOC for thin walls", () => {
      const params: MachiningParameters = {
        cutting_speed_m_min: 45,
        feed_mm_rev: 0.15,
        depth_of_cut_mm: 1.5, // > 50% of wall thickness
      };
      const context: MachiningContext = {
        material: "D2",
        operation: "finishing",
        wall_thickness_mm: 1.5, // Thin wall
      };

      const result = tribalPlaybookEnforcementEngine.validate(params, context);

      expect(result.tribal_violations.some(v =>
        v.message.includes("wall thickness")
      )).toBe(true);
      expect(result.valid).toBe(false); // Critical violation
    });

    it("accepts appropriate DOC for thin walls", () => {
      const params: MachiningParameters = {
        cutting_speed_m_min: 50,
        feed_mm_rev: 0.10,
        depth_of_cut_mm: 0.3, // < 50% of wall
      };
      const context: MachiningContext = {
        material: "6061",
        operation: "finishing",
        wall_thickness_mm: 1.0,
      };

      const result = tribalPlaybookEnforcementEngine.validate(params, context);

      expect(result.tribal_violations.filter(v =>
        v.message.includes("wall thickness")
      ).length).toBe(0);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // Coolant validation
  // ══════════════════════════════════════════════════════════════════════════
  describe("coolant requirements", () => {
    it("warns when no coolant for stainless", () => {
      const params: MachiningParameters = {
        cutting_speed_m_min: 80,
        feed_mm_rev: 0.20,
        depth_of_cut_mm: 2.0,
        coolant: "none",
      };
      const context: MachiningContext = {
        material: "304 stainless",
        material_iso_group: "M",
        operation: "roughing",
      };

      const result = tribalPlaybookEnforcementEngine.validate(params, context);

      expect(result.tribal_violations.some(v => v.parameter === "coolant")).toBe(true);
    });

    it("accepts flood coolant for stainless", () => {
      const params: MachiningParameters = {
        cutting_speed_m_min: 80,
        feed_mm_rev: 0.20,
        depth_of_cut_mm: 2.0,
        coolant: "flood",
      };
      const context: MachiningContext = {
        material: "304",
        material_iso_group: "M",
        operation: "roughing",
      };

      const result = tribalPlaybookEnforcementEngine.validate(params, context);

      expect(result.tribal_violations.filter(v => v.parameter === "coolant").length).toBe(0);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // Tool diameter validation
  // ══════════════════════════════════════════════════════════════════════════
  describe("tool diameter rules", () => {
    it("flags WOC exceeding tool diameter", () => {
      const params: MachiningParameters = {
        cutting_speed_m_min: 100,
        tool_diameter_mm: 10,
        width_of_cut_mm: 15, // > tool diameter
      };
      const context: MachiningContext = {
        material: "1018",
        operation: "roughing",
      };

      const result = tribalPlaybookEnforcementEngine.validate(params, context);

      expect(result.tribal_violations.some(v =>
        v.parameter === "width_of_cut_mm"
      )).toBe(true);
    });

    it("accepts appropriate WOC", () => {
      const params: MachiningParameters = {
        cutting_speed_m_min: 100,
        tool_diameter_mm: 10,
        width_of_cut_mm: 8, // < tool diameter
      };
      const context: MachiningContext = {
        material: "1018",
        operation: "roughing",
      };

      const result = tribalPlaybookEnforcementEngine.validate(params, context);

      expect(result.tribal_violations.filter(v =>
        v.parameter === "width_of_cut_mm"
      ).length).toBe(0);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // Single parameter validation
  // ══════════════════════════════════════════════════════════════════════════
  describe("validateSingleParameter()", () => {
    it("returns null for valid parameter", () => {
      const result = tribalPlaybookEnforcementEngine.validateSingleParameter(
        "cutting_speed_m_min",
        45,
        "D2"
      );

      expect(result).toBeNull();
    });

    it("returns violation for out-of-range parameter", () => {
      const result = tribalPlaybookEnforcementEngine.validateSingleParameter(
        "cutting_speed_m_min",
        100,
        "D2"
      );

      expect(result).not.toBeNull();
      expect(result!.parameter).toBe("cutting_speed_m_min");
    });

    it("returns null for unknown material", () => {
      const result = tribalPlaybookEnforcementEngine.validateSingleParameter(
        "cutting_speed_m_min",
        100,
        "unobtanium"
      );

      expect(result).toBeNull();
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // Recommended ranges
  // ══════════════════════════════════════════════════════════════════════════
  describe("getRecommendedRanges()", () => {
    it("returns ranges for known material", () => {
      const ranges = tribalPlaybookEnforcementEngine.getRecommendedRanges("D2");

      expect(ranges).not.toBeNull();
      expect(ranges!.cutting_speed_m_min).toBeDefined();
      expect(ranges!.cutting_speed_m_min.min).toBe(30);
      expect(ranges!.cutting_speed_m_min.max).toBe(60);
    });

    it("returns null for unknown material", () => {
      const ranges = tribalPlaybookEnforcementEngine.getRecommendedRanges("unobtanium");

      expect(ranges).toBeNull();
    });

    it("finds material by substring", () => {
      const ranges = tribalPlaybookEnforcementEngine.getRecommendedRanges("AISI D2 tool steel");

      expect(ranges).not.toBeNull();
      expect(ranges!.cutting_speed_m_min.min).toBe(30);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // Statistics
  // ══════════════════════════════════════════════════════════════════════════
  describe("getStatistics()", () => {
    it("returns coverage statistics", () => {
      const stats = tribalPlaybookEnforcementEngine.getStatistics();

      expect(stats.materials_covered).toBeGreaterThan(0);
      expect(stats.operations_covered).toBeGreaterThan(0);
      expect(stats.tribal_tips_available).toBeGreaterThanOrEqual(0);
      expect(stats.playbook_rules_available).toBeGreaterThan(0);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // Score calculation
  // ══════════════════════════════════════════════════════════════════════════
  describe("score calculation", () => {
    it("perfect score for no violations", () => {
      const params: MachiningParameters = {
        cutting_speed_m_min: 45,
        feed_mm_rev: 0.15,
        depth_of_cut_mm: 2.0,
      };
      const context: MachiningContext = {
        material: "D2",
        operation: "roughing",
      };

      const result = tribalPlaybookEnforcementEngine.validate(params, context);

      expect(result.overall_score).toBe(1);
    });

    it("reduced score for warnings", () => {
      const params: MachiningParameters = {
        cutting_speed_m_min: 70, // Slightly high
        feed_mm_rev: 0.15,
        depth_of_cut_mm: 2.0,
      };
      const context: MachiningContext = {
        material: "D2",
        operation: "roughing",
      };

      const result = tribalPlaybookEnforcementEngine.validate(params, context);

      expect(result.overall_score).toBeLessThan(1);
      expect(result.overall_score).toBeGreaterThan(0.5);
    });

    it("low score for critical violations", () => {
      const params: MachiningParameters = {
        cutting_speed_m_min: 150, // Way too high
        feed_mm_rev: 0.02, // Too low
        depth_of_cut_mm: 10, // Too deep
      };
      const context: MachiningContext = {
        material: "D2",
        operation: "roughing",
      };

      const result = tribalPlaybookEnforcementEngine.validate(params, context);

      expect(result.overall_score).toBeLessThan(0.5);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // Recommendations
  // ══════════════════════════════════════════════════════════════════════════
  describe("recommendations", () => {
    it("includes thin wall recommendations", () => {
      const params: MachiningParameters = {
        cutting_speed_m_min: 50,
        feed_mm_rev: 0.10,
        depth_of_cut_mm: 0.3,
      };
      const context: MachiningContext = {
        material: "6061",
        operation: "finishing",
        wall_thickness_mm: 1.5,
      };

      const result = tribalPlaybookEnforcementEngine.validate(params, context);

      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.recommendations.some(r =>
        r.toLowerCase().includes("thin") || r.toLowerCase().includes("wall")
      )).toBe(true);
    });

    it("returns applicable tips", () => {
      const params: MachiningParameters = {
        cutting_speed_m_min: 45,
      };
      const context: MachiningContext = {
        material: "D2",
        operation: "roughing",
      };

      const result = tribalPlaybookEnforcementEngine.validate(params, context);

      expect(result.applicable_tips).toBeDefined();
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // Summary generation
  // ══════════════════════════════════════════════════════════════════════════
  describe("summary generation", () => {
    it("generates success summary", () => {
      const params: MachiningParameters = {
        cutting_speed_m_min: 45,
        feed_mm_rev: 0.15,
        depth_of_cut_mm: 2.0,
      };
      const context: MachiningContext = {
        material: "D2",
        operation: "roughing",
      };

      const result = tribalPlaybookEnforcementEngine.validate(params, context);

      expect(result.summary).toContain("D2");
      expect(result.summary).toContain("roughing");
    });

    it("generates failure summary for critical violations", () => {
      const params: MachiningParameters = {
        cutting_speed_m_min: 200, // Way too high for D2
      };
      const context: MachiningContext = {
        material: "D2",
        operation: "roughing",
      };

      const result = tribalPlaybookEnforcementEngine.validate(params, context);

      expect(result.summary.toUpperCase()).toContain("FAIL");
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // Edge cases
  // ══════════════════════════════════════════════════════════════════════════
  describe("edge cases", () => {
    it("handles empty parameters", () => {
      const params: MachiningParameters = {};
      const context: MachiningContext = {
        material: "D2",
        operation: "roughing",
      };

      const result = tribalPlaybookEnforcementEngine.validate(params, context);

      expect(result.valid).toBe(true); // No violations if no params to check
    });

    it("handles unknown material gracefully", () => {
      const params: MachiningParameters = {
        cutting_speed_m_min: 100,
      };
      const context: MachiningContext = {
        material: "unobtanium",
        operation: "roughing",
      };

      const result = tribalPlaybookEnforcementEngine.validate(params, context);

      expect(result).toBeDefined();
      expect(result.tribal_violations.length).toBe(0); // No bounds to check
    });

    it("tracks enforcement time", () => {
      const params: MachiningParameters = {
        cutting_speed_m_min: 45,
      };
      const context: MachiningContext = {
        material: "D2",
        operation: "roughing",
      };

      const result = tribalPlaybookEnforcementEngine.validate(params, context);

      expect(result.enforcement_time_ms).toBeGreaterThanOrEqual(0);
      expect(result.enforcement_time_ms).toBeLessThan(100);
    });
  });
});
