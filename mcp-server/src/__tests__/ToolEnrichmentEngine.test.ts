/**
 * ToolEnrichmentEngine tests — SQ3-1-TOOL
 *
 * Tests audit, enrich, validate, holderMatrix, and summary actions.
 * Validates physics correctness of Taylor coefficients and cutting data.
 */

import { describe, it, expect } from "vitest";
import { toolEnrichmentEngine } from "../engines/ToolEnrichmentEngine.js";

// ── Test Tool Fixtures ──

const TOOL_CARBIDE_TIALN = {
  id: "test-endmill-1",
  type: "end_mill",
  manufacturer: "Sandvik",
  material: "carbide",
  coating: "TiAlN",
  iso_groups: ["P", "M", "K"],
  physical: {
    cutting_diameter_mm: 10,
    overall_length_mm: 72,
    flute_length_mm: 22,
    shank_diameter_mm: 10,
  },
};

const TOOL_HSS_UNCOATED = {
  id: "test-drill-1",
  type: "drill",
  manufacturer: "Generic",
  material: "hss",
  coating: "none",
  iso_groups: [] as string[], // Missing — should be inferred
  physical: {
    cutting_diameter_mm: 8,
    overall_length_mm: 0, // Missing — should be filled
    flute_length_mm: 0,   // Missing — should be filled
    shank_diameter_mm: 8,
  },
};

const TOOL_PCD_DIAMOND = {
  id: "test-endmill-pcd",
  type: "end_mill",
  manufacturer: "Kennametal",
  material: "pcd",
  iso_groups: ["N"],
  physical: {
    cutting_diameter_mm: 6,
    overall_length_mm: 50,
    flute_length_mm: 12,
    shank_diameter_mm: 6,
  },
};

const TOOL_INCOMPLETE = {
  id: "test-incomplete",
  type: "end_mill",
  manufacturer: "Unknown",
  physical: {
    cutting_diameter_mm: 12,
    overall_length_mm: 0,
    flute_length_mm: 0,
    shank_diameter_mm: 0,
  },
};

const TOOL_INVALID = {
  id: "test-invalid",
  type: "end_mill",
  physical: {
    cutting_diameter_mm: -5,
    overall_length_mm: 10,
    flute_length_mm: 20, // LOC > OAL — invalid
    shank_diameter_mm: 50,
  },
};

const ALL_TOOLS = [
  TOOL_CARBIDE_TIALN,
  TOOL_HSS_UNCOATED,
  TOOL_PCD_DIAMOND,
  TOOL_INCOMPLETE,
];

// ── Tests ──

describe("ToolEnrichmentEngine", () => {

  describe("audit", () => {
    it("should report coverage statistics for tool set", () => {
      const report = toolEnrichmentEngine.audit(ALL_TOOLS);
      expect(report.total_tools).toBe(4);
      expect(report.avg_completeness_pct).toBeGreaterThanOrEqual(0);
      expect(report.avg_completeness_pct).toBeLessThanOrEqual(100);
      expect(report.field_coverage).toHaveProperty("iso_groups");
      expect(report.field_coverage).toHaveProperty("cutting_data");
      expect(report.field_coverage).toHaveProperty("physical.cutting_diameter_mm");
    });

    it("should identify tools with missing fields", () => {
      const report = toolEnrichmentEngine.audit([TOOL_INCOMPLETE]);
      expect(report.tools_below_50).toBeGreaterThanOrEqual(1);
      expect(report.field_coverage["physical.overall_length_mm"].missing).toBe(1);
      expect(report.field_coverage["physical.flute_length_mm"].missing).toBe(1);
    });

    it("should count ISO group distribution", () => {
      const report = toolEnrichmentEngine.audit(ALL_TOOLS);
      expect(report.iso_group_coverage).toHaveProperty("P");
      expect(report.iso_group_coverage.P).toBeGreaterThanOrEqual(1);
    });

    it("should track manufacturer breakdown", () => {
      const report = toolEnrichmentEngine.audit(ALL_TOOLS);
      expect(report.by_manufacturer).toHaveProperty("Sandvik");
      expect(report.by_manufacturer.Sandvik.total).toBe(1);
    });
  });

  describe("enrich", () => {
    it("should identify enrichable gaps in dry-run mode", () => {
      const result = toolEnrichmentEngine.enrich([{ ...TOOL_HSS_UNCOATED }], { dry_run: true });
      expect(result.dry_run).toBe(true);
      expect(result.gaps_found).toBeGreaterThan(0);
      expect(result.fills.length).toBeGreaterThan(0);
      expect(result.warnings.some(w => w.includes("Dry run"))).toBe(true);
    });

    it("should enrich cutting data with canonical physics values", () => {
      const tool = { ...TOOL_CARBIDE_TIALN, cutting_data: undefined };
      const result = toolEnrichmentEngine.enrich([tool], { dry_run: true });
      const pFills = result.fills.filter(f => f.field === "cutting_data.P");
      expect(pFills.length).toBe(1);
      const cd = pFills[0].new_value as any;
      // Steel (P): Vc_base_roughing=200 m/min, carbide subCorr=1.0, TiAlN speed ~1.6
      // vcMin = 200 * 1.0 * sqrt(1.6) * 0.7 ≈ 177
      // vcMax = 280 * 1.0 * sqrt(1.6) * 1.1 ≈ 389
      expect(cd.vc_min).toBeGreaterThan(100);
      expect(cd.vc_max).toBeLessThan(500);
      expect(cd.vc_min).toBeLessThan(cd.vc_max);
      expect(cd.fz_min).toBeGreaterThan(0);
      expect(cd.fz_max).toBeGreaterThan(cd.fz_min);
      expect(cd.confidence).toBeGreaterThan(0.5);
    });

    it("should add Taylor coefficients", () => {
      const tool = { ...TOOL_CARBIDE_TIALN, cutting_data: undefined };
      const result = toolEnrichmentEngine.enrich([tool], { dry_run: true });
      const taylorFills = result.fills.filter(f => f.field.includes("taylor"));
      expect(taylorFills.length).toBeGreaterThan(0);
      const taylor = taylorFills[0].new_value as any;
      // For ISO P carbide TiAlN: C_adjusted = 350 * 1.0 * speed_mult(TiAlN)
      // CoatingRegistry TiAlN speed_multiplier = 1.6 → C_adjusted ≈ 560
      expect(taylor.C_adjusted).toBeGreaterThan(300);
      expect(taylor.C_adjusted).toBeLessThan(800);
      expect(taylor.n).toBeCloseTo(0.25, 2); // ISO P Taylor n = 0.25
      expect(taylor.expected_life_min).toBeGreaterThan(0);
      expect(taylor.expected_life_min).toBeLessThan(1000);
    });

    it("should infer ISO groups for tools without them", () => {
      const tool = { ...TOOL_HSS_UNCOATED, iso_groups: [] as string[] };
      const result = toolEnrichmentEngine.enrich([tool], { dry_run: true });
      const isoFills = result.fills.filter(f => f.field === "iso_groups");
      expect(isoFills.length).toBe(1);
      const groups = isoFills[0].new_value as string[];
      expect(groups).toContain("P");
      expect(groups).toContain("M");
      expect(groups).toContain("K");
      expect(groups).toContain("N"); // HSS is suitable for non-ferrous
    });

    it("should fill missing geometry", () => {
      const tool = { ...TOOL_INCOMPLETE };
      const result = toolEnrichmentEngine.enrich([tool], { dry_run: true });
      const geoFills = result.fills.filter(f => f.field.startsWith("physical."));
      expect(geoFills.length).toBe(3); // OAL, LOC, shank
      const oal = geoFills.find(f => f.field === "physical.overall_length_mm")?.new_value as number;
      expect(oal).toBeGreaterThan(0);
      expect(oal).toBeLessThan(200); // 12mm endmill OAL should be ~83mm
    });

    it("should apply enrichments in non-dry-run mode", () => {
      const tool = {
        id: "apply-test",
        type: "end_mill" as const,
        material: "carbide",
        coating: "TiAlN",
        iso_groups: ["P"],
        physical: {
          cutting_diameter_mm: 10,
          overall_length_mm: 72,
          flute_length_mm: 20,
          shank_diameter_mm: 10,
        },
      };
      const result = toolEnrichmentEngine.enrich([tool], { dry_run: false });
      expect(result.dry_run).toBe(false);
      expect(tool.cutting_data).toBeDefined();
      expect(tool.cutting_data?.P).toBeDefined();
    });

    it("should handle HSS substrate with reduced speed", () => {
      const tool = { ...TOOL_HSS_UNCOATED, iso_groups: ["P"], cutting_data: undefined };
      const result = toolEnrichmentEngine.enrich([tool], { dry_run: true });
      const pFills = result.fills.filter(f => f.field === "cutting_data.P");
      expect(pFills.length).toBe(1);
      const cd = pFills[0].new_value as any;
      // HSS has subCorr=0.45, so Vc should be much lower than carbide
      expect(cd.vc_min).toBeLessThan(100); // HSS in steel: ~63 m/min min
    });

    it("should respect PCD substrate for N-group only", () => {
      const tool = { ...TOOL_PCD_DIAMOND, iso_groups: [] as string[] };
      const result = toolEnrichmentEngine.enrich([tool], { dry_run: true });
      const isoFills = result.fills.filter(f => f.field === "iso_groups");
      if (isoFills.length > 0) {
        const groups = isoFills[0].new_value as string[];
        expect(groups).toContain("N");
        expect(groups).not.toContain("S"); // PCD not for superalloys
      }
    });
  });

  describe("validate", () => {
    it("should pass valid tools without errors", () => {
      const report = toolEnrichmentEngine.validate([TOOL_CARBIDE_TIALN]);
      expect(report.valid).toBe(1);
      expect(report.issues.filter(i => i.severity === "error")).toHaveLength(0);
    });

    it("should catch negative diameter", () => {
      const report = toolEnrichmentEngine.validate([TOOL_INVALID]);
      const errors = report.issues.filter(i => i.severity === "error");
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.field === "cutting_diameter_mm")).toBe(true);
    });

    it("should catch LOC > OAL", () => {
      const badGeo = {
        id: "loc-exceeds-oal",
        type: "end_mill",
        physical: { cutting_diameter_mm: 10, overall_length_mm: 30, flute_length_mm: 50, shank_diameter_mm: 10 },
      };
      const report = toolEnrichmentEngine.validate([badGeo]);
      const locErrors = report.issues.filter(i => i.field === "flute_length_mm");
      expect(locErrors.length).toBeGreaterThan(0);
    });

    it("should warn on high L/D ratio", () => {
      const longTool = {
        id: "long-tool",
        type: "end_mill",
        physical: { cutting_diameter_mm: 3, overall_length_mm: 100, flute_length_mm: 30, shank_diameter_mm: 3 },
      };
      const report = toolEnrichmentEngine.validate([longTool]);
      const ldWarnings = report.issues.filter(i => i.field === "L/D_ratio");
      expect(ldWarnings.length).toBe(1); // L/D = 30/3 = 10 > 8
    });
  });

  describe("holderMatrix", () => {
    it("should find compatible holders for 10mm shank", () => {
      const matrix = toolEnrichmentEngine.holderMatrix([TOOL_CARBIDE_TIALN]);
      expect(matrix.total_tools).toBe(1);
      expect(matrix.matches.length).toBe(1);
      const match = matrix.matches[0];
      expect(match.shank_diameter_mm).toBe(10);
      // 10mm shank should fit ER16 (1-10), ER20 (1-13), ER25 (1-16), ER32 (2-20), ER40 (3-26), ER50 (6-34)
      expect(match.compatible_holders.length).toBeGreaterThanOrEqual(3);
      expect(match.recommended_holder).toBeTruthy();
    });

    it("should filter by taper when specified", () => {
      const matrix = toolEnrichmentEngine.holderMatrix([TOOL_CARBIDE_TIALN], { taper_filter: "ER" });
      const match = matrix.matches[0];
      for (const h of match.compatible_holders) {
        expect(h.holder_id.toLowerCase()).toContain("er");
      }
    });

    it("should handle tool with no shank data", () => {
      const noShank = { id: "no-shank", type: "end_mill", physical: { cutting_diameter_mm: 10, overall_length_mm: 50, flute_length_mm: 20, shank_diameter_mm: 0 } };
      const matrix = toolEnrichmentEngine.holderMatrix([noShank]);
      expect(matrix.matches).toHaveLength(0); // Skipped — shank <= 0
    });
  });

  describe("summary", () => {
    it("should produce compact summary for tool set", () => {
      const s = toolEnrichmentEngine.summary(ALL_TOOLS);
      expect(s.total).toBe(4);
      expect(s.with_geometry).toBeGreaterThanOrEqual(2);
      expect(s.avg_iso_groups).toBeGreaterThan(0);
    });
  });

  describe("physics validation", () => {
    it("should produce valid Vc ranges for all ISO groups", () => {
      const tool = { ...TOOL_CARBIDE_TIALN, cutting_data: undefined };
      const result = toolEnrichmentEngine.enrich([tool], { dry_run: true });
      for (const group of ["P", "M", "K"]) {
        const fill = result.fills.find(f => f.field === `cutting_data.${group}`);
        expect(fill).toBeDefined();
        const cd = fill!.new_value as any;
        expect(cd.vc_min).toBeGreaterThan(0);
        expect(cd.vc_max).toBeGreaterThan(cd.vc_min);
        expect(cd.vc_max).toBeLessThan(2000); // No material allows > 2000 m/min for carbide
      }
    });

    it("should have consistent Taylor n values per ISO group", () => {
      const tool = { ...TOOL_CARBIDE_TIALN, cutting_data: undefined };
      const result = toolEnrichmentEngine.enrich([tool], { dry_run: true });
      const taylorP = result.fills.find(f => f.field === "cutting_data.P.taylor")?.new_value as any;
      const taylorM = result.fills.find(f => f.field === "cutting_data.M.taylor")?.new_value as any;
      expect(taylorP.n).toBeCloseTo(0.25, 2); // ISO P
      expect(taylorM.n).toBeCloseTo(0.22, 2); // ISO M
    });
  });
});
