/**
 * LATHE-PRO-MS-1 Session 1 Tests
 *
 * U-LPI01: TurningPrintIntakeEngine — BlueprintVision → TurningFeature[]
 * U-LPI02: MaterialCalloutParserEngine — material callout parsing
 * U-LPI03: ToleranceExtractionEngine — tolerance + GD&T + ISO 2768
 *
 * @milestone LATHE-PRO-MS-1
 */

import { describe, it, expect } from "vitest";
import { turningPrintIntakeEngine } from "../engines/TurningPrintIntakeEngine.js";
import { materialCalloutParserEngine } from "../engines/MaterialCalloutParserEngine.js";
import { toleranceExtractionEngine } from "../engines/ToleranceExtractionEngine.js";
import type { BlueprintVisionResult } from "../engines/BlueprintVisionOCREngine.js";
import type { ExtractedDimension, ExtractedGDT } from "../engines/BlueprintOCREngine.js";

// ============================================================================
// U-LPI02: MaterialCalloutParserEngine Tests
// ============================================================================

describe("MaterialCalloutParserEngine", () => {
  describe("AISI/SAE materials", () => {
    it("parses AISI 4140 QT 28-32 HRC", () => {
      const r = materialCalloutParserEngine.parse("AISI 4140 QT 28-32 HRC");
      expect(r.success).toBe(true);
      expect(r.iso_group).toBe("P");
      expect(r.material.iso_group).toBe("P");
      expect(r.heat_treatment).toBe("Quenched & Tempered");
      expect(r.hardness_hrc).toBeDefined();
      expect(r.hardness_hrc!.min).toBe(28);
      expect(r.hardness_hrc!.max).toBe(32);
      expect(r.confidence).toBeGreaterThan(0.7);
    });

    it("parses SAE 1045", () => {
      const r = materialCalloutParserEngine.parse("SAE 1045");
      expect(r.success).toBe(true);
      expect(r.iso_group).toBe("P");
      expect(r.canonical_name).toBe("1045");
    });

    it("parses 12L14 free-machining steel", () => {
      const r = materialCalloutParserEngine.parse("AISI 12L14");
      expect(r.success).toBe(true);
      expect(r.iso_group).toBe("P");
    });
  });

  describe("DIN materials", () => {
    it("parses DIN 1.7225 (=4140)", () => {
      const r = materialCalloutParserEngine.parse("DIN 1.7225");
      expect(r.success).toBe(true);
      expect(r.iso_group).toBe("P");
      expect(r.canonical_name).toBe("4140");
      expect(r.cross_references.length).toBeGreaterThan(0);
      expect(r.cross_references[0]).toContain("DIN");
    });

    it("parses 42CrMo4 (=4140)", () => {
      const r = materialCalloutParserEngine.parse("42CrMo4");
      expect(r.success).toBe(true);
      expect(r.iso_group).toBe("P");
      expect(r.canonical_name).toBe("4140");
    });

    it("parses DIN 1.4301 (=304 stainless)", () => {
      const r = materialCalloutParserEngine.parse("DIN 1.4301");
      expect(r.success).toBe(true);
      expect(r.iso_group).toBe("M");
      expect(r.canonical_name).toBe("304");
    });
  });

  describe("JIS materials", () => {
    it("parses JIS S45C (=1045)", () => {
      const r = materialCalloutParserEngine.parse("JIS S45C");
      expect(r.success).toBe(true);
      expect(r.iso_group).toBe("P");
      expect(r.canonical_name).toBe("1045");
    });

    it("parses SUS304 (=304 stainless)", () => {
      const r = materialCalloutParserEngine.parse("SUS304");
      expect(r.success).toBe(true);
      expect(r.iso_group).toBe("M");
      expect(r.canonical_name).toBe("304");
    });
  });

  describe("UNS materials", () => {
    it("parses UNS G41400 (=4140)", () => {
      const r = materialCalloutParserEngine.parse("UNS G41400");
      expect(r.success).toBe(true);
      expect(r.iso_group).toBe("P");
      expect(r.canonical_name).toBe("4140");
    });

    it("parses UNS N07718 (=Inconel 718)", () => {
      const r = materialCalloutParserEngine.parse("UNS N07718");
      expect(r.success).toBe(true);
      expect(r.iso_group).toBe("S");
      expect(r.canonical_name).toBe("Inconel 718");
    });
  });

  describe("Common shorthand", () => {
    it("parses SS316L", () => {
      const r = materialCalloutParserEngine.parse("SS316L");
      expect(r.success).toBe(true);
      expect(r.iso_group).toBe("M");
    });

    it("parses Ti-6Al-4V ELI", () => {
      const r = materialCalloutParserEngine.parse("Ti-6Al-4V ELI");
      expect(r.success).toBe(true);
      expect(r.iso_group).toBe("S");
      expect(r.heat_treatment).toBe("ELI (Extra Low Interstitial)");
    });

    it("parses Al 6061-T6", () => {
      const r = materialCalloutParserEngine.parse("Al 6061-T6");
      expect(r.success).toBe(true);
      expect(r.iso_group).toBe("N");
      expect(r.heat_treatment).toBe("T6 (Solution Treated + Artificially Aged)");
    });

    it("parses Inconel 718", () => {
      const r = materialCalloutParserEngine.parse("Inconel 718");
      expect(r.success).toBe(true);
      expect(r.iso_group).toBe("S");
    });

    it("parses D2 Tool Steel hardened 58-60 HRC", () => {
      const r = materialCalloutParserEngine.parse("D2 Tool Steel 58-60 HRC");
      expect(r.success).toBe(true);
      expect(r.iso_group).toBe("H");
      expect(r.hardness_hrc!.min).toBe(58);
      expect(r.hardness_hrc!.max).toBe(60);
    });

    it("parses mild steel", () => {
      const r = materialCalloutParserEngine.parse("Mild Steel");
      expect(r.success).toBe(true);
      expect(r.iso_group).toBe("P");
    });

    it("parses brass", () => {
      const r = materialCalloutParserEngine.parse("Brass");
      expect(r.success).toBe(true);
      expect(r.iso_group).toBe("N");
    });
  });

  describe("Kienzle/Taylor resolution", () => {
    it("returns canonical kc1_1 for ISO P", () => {
      const r = materialCalloutParserEngine.parse("1045 Steel");
      expect(r.kc1_1).toBeGreaterThan(0);
      expect(r.mc).toBeGreaterThan(0);
      expect(r.taylor_C).toBeGreaterThan(0);
      expect(r.taylor_n).toBeGreaterThan(0);
    });
  });

  describe("Edge cases", () => {
    it("returns fallback for empty string", () => {
      const r = materialCalloutParserEngine.parse("");
      expect(r.success).toBe(false);
      expect(r.iso_group).toBe("P"); // Default
    });

    it("returns low confidence for unknown material", () => {
      const r = materialCalloutParserEngine.parse("Unobtanium X-42");
      expect(r.confidence).toBeLessThan(0.6);
    });

    it("parseBest picks highest confidence", () => {
      const r = materialCalloutParserEngine.parseBest([
        "some metal",
        "AISI 4140 QT 28-32 HRC",
        "material unknown",
      ]);
      expect(r.canonical_name).toBe("4140");
    });
  });
});

// ============================================================================
// U-LPI03: ToleranceExtractionEngine Tests
// ============================================================================

describe("ToleranceExtractionEngine", () => {
  describe("ISO 286-1 fit class decomposition", () => {
    it("decomposes H7 hole at 25mm nominal", () => {
      const r = toleranceExtractionEngine.parseFit("H7", 25);
      expect(r).not.toBeNull();
      // H7 at 25mm: IT7 = 21μm → upper = +0.021, lower = 0
      expect(r!.upper_mm).toBeCloseTo(0.021, 3);
      expect(r!.lower_mm).toBeCloseTo(0, 3);
      expect(r!.band_mm).toBeCloseTo(0.021, 3);
    });

    it("decomposes g6 shaft at 25mm nominal", () => {
      const r = toleranceExtractionEngine.parseFit("g6", 25);
      expect(r).not.toBeNull();
      // g6 at 25mm: dev = -7μm, IT6 = 13μm → upper = -0.007, lower = -0.020
      expect(r!.upper_mm).toBeCloseTo(-0.007, 3);
      expect(r!.lower_mm).toBeCloseTo(-0.020, 3);
    });

    it("decomposes H7/g6 fit", () => {
      const r = toleranceExtractionEngine.parseFit("H7/g6", 25);
      expect(r).not.toBeNull();
      // Shaft side: g6 at 25mm
      expect(r!.upper_mm).toBeCloseTo(-0.007, 3);
      expect(r!.lower_mm).toBeCloseTo(-0.020, 3);
    });

    it("decomposes h6 shaft (zero deviation)", () => {
      const r = toleranceExtractionEngine.parseFit("h6", 25);
      expect(r).not.toBeNull();
      // h6 at 25mm: dev = 0, IT6 = 13μm → upper = 0, lower = -0.013
      expect(r!.upper_mm).toBeCloseTo(0, 3);
      expect(r!.lower_mm).toBeCloseTo(-0.013, 3);
    });

    it("returns null for invalid fit notation", () => {
      const r = toleranceExtractionEngine.parseFit("INVALID", 25);
      expect(r).toBeNull();
    });
  });

  describe("ISO 2768-m general tolerances", () => {
    it("applies ISO 2768-m to un-toleranced dimensions", () => {
      const dims: ExtractedDimension[] = [
        {
          id: "DIM-1", type: "diameter", nominal: 25, unit: "mm",
          raw_text: "Ø25", confidence: 0.9,
        },
      ];
      const r = toleranceExtractionEngine.extract(dims, [], "m");
      expect(r.feature_tolerances.length).toBe(1);
      expect(r.feature_tolerances[0].source).toBe("iso_2768_m");
      // 25mm → ISO 2768-m: ±0.20mm → band = 0.40mm
      expect(r.feature_tolerances[0].tolerance_band_mm).toBeCloseTo(0.40, 2);
      expect(r.defaults_applied).toBe(1);
    });

    it("preserves explicit tolerances", () => {
      const dims: ExtractedDimension[] = [
        {
          id: "DIM-1", type: "diameter", nominal: 25, unit: "mm",
          tolerance: { type: "bilateral", upper: 0.01, lower: -0.01 },
          raw_text: "Ø25 ±0.01", confidence: 0.95,
        },
      ];
      const r = toleranceExtractionEngine.extract(dims, [], "m");
      expect(r.feature_tolerances[0].source).toBe("explicit");
      expect(r.feature_tolerances[0].tolerance_band_mm).toBeCloseTo(0.02, 3);
      expect(r.defaults_applied).toBe(0);
    });
  });

  describe("Strategy determination", () => {
    it("recommends grinding for <5μm tolerance", () => {
      const dims: ExtractedDimension[] = [
        {
          id: "DIM-1", type: "diameter", nominal: 25, unit: "mm",
          tolerance: { type: "bilateral", upper: 0.002, lower: -0.002 },
          raw_text: "Ø25 ±0.002", confidence: 0.95,
        },
      ];
      const r = toleranceExtractionEngine.extract(dims, [], "m");
      expect(r.feature_tolerances[0].strategy.precision_level).toBe("grinding");
      expect(r.feature_tolerances[0].strategy.requires_spring_pass).toBe(true);
    });

    it("recommends fine_finish for <10μm tolerance", () => {
      const dims: ExtractedDimension[] = [
        {
          id: "DIM-1", type: "diameter", nominal: 25, unit: "mm",
          tolerance: { type: "bilateral", upper: 0.005, lower: -0.005 },
          raw_text: "Ø25 ±0.005", confidence: 0.95,
        },
      ];
      const r = toleranceExtractionEngine.extract(dims, [], "m");
      expect(r.feature_tolerances[0].strategy.precision_level).toBe("fine_finish");
    });

    it("recommends rough_only for >100μm tolerance", () => {
      const dims: ExtractedDimension[] = [
        {
          id: "DIM-1", type: "linear", nominal: 100, unit: "mm",
          tolerance: { type: "bilateral", upper: 0.5, lower: -0.5 },
          raw_text: "100 ±0.5", confidence: 0.9,
        },
      ];
      const r = toleranceExtractionEngine.extract(dims, [], "m");
      expect(r.feature_tolerances[0].strategy.precision_level).toBe("rough_only");
    });
  });

  describe("GD&T interpretation", () => {
    it("interprets concentricity → single setup + centers", () => {
      const gdts: ExtractedGDT[] = [
        {
          id: "GDT-1", symbol: "concentricity",
          tolerance_value: 0.02, tolerance_unit: "mm",
          datum_references: ["A"],
          applied_to: "bore",
          raw_text: "⌖ 0.02 A", confidence: 0.9,
        },
      ];
      const r = toleranceExtractionEngine.extract([], gdts, "m");
      expect(r.gdt_interpretations.length).toBe(1);
      expect(r.gdt_interpretations[0].strategy_overrides.requires_single_setup).toBe(true);
      expect(r.gdt_interpretations[0].strategy_overrides.requires_between_centers).toBe(true);
    });

    it("interprets runout → between centers", () => {
      const gdts: ExtractedGDT[] = [
        {
          id: "GDT-1", symbol: "circular_runout",
          tolerance_value: 0.01, tolerance_unit: "mm",
          datum_references: ["A"],
          applied_to: "od",
          raw_text: "↗ 0.01 A", confidence: 0.9,
        },
      ];
      const r = toleranceExtractionEngine.extract([], gdts, "m");
      expect(r.gdt_interpretations[0].strategy_overrides.requires_between_centers).toBe(true);
    });

    it("interprets tight cylindricity → spring pass", () => {
      const gdts: ExtractedGDT[] = [
        {
          id: "GDT-1", symbol: "cylindricity",
          tolerance_value: 0.005, tolerance_unit: "mm",
          datum_references: [],
          applied_to: "bore",
          raw_text: "⌭ 0.005", confidence: 0.9,
        },
      ];
      const r = toleranceExtractionEngine.extract([], gdts, "m");
      expect(r.gdt_interpretations[0].strategy_overrides.requires_spring_pass).toBe(true);
    });
  });

  describe("Unit conversion", () => {
    it("converts inch dimensions to mm", () => {
      const dims: ExtractedDimension[] = [
        {
          id: "DIM-1", type: "diameter", nominal: 1.0, unit: "in",
          tolerance: { type: "bilateral", upper: 0.001, lower: -0.001 },
          raw_text: "Ø1.000 ±.001", confidence: 0.9,
        },
      ];
      const r = toleranceExtractionEngine.extract(dims, [], "m");
      // 1.0" = 25.4mm, ±0.001" = ±0.0254mm, band = 0.0508mm
      expect(r.feature_tolerances[0].nominal_mm).toBeCloseTo(25.4, 1);
      expect(r.feature_tolerances[0].tolerance_band_mm).toBeCloseTo(0.0508, 3);
    });
  });
});

// ============================================================================
// U-LPI01: TurningPrintIntakeEngine Tests
// ============================================================================

describe("TurningPrintIntakeEngine", () => {
  // Helper: create a minimal BlueprintVisionResult for testing
  function makeBlueprintResult(overrides: Partial<BlueprintVisionResult> = {}): BlueprintVisionResult {
    return {
      dimensions: [],
      gdt_frames: [],
      title_block: {
        part_number: "TEST-001",
        material: "AISI 4140",
        units: "mm",
      },
      notes: [],
      summary: {
        total_dimensions: 0,
        total_gdt: 0,
        total_notes: 0,
        tightest_tolerance_mm: 0,
        critical_features: [],
        material: "AISI 4140",
        has_gdt: false,
      },
      profiles: [],
      tokens_used: 100,
      processing_time_ms: 500,
      ...overrides,
    };
  }

  describe("Dimension → TurningFeature conversion", () => {
    it("converts diameter dimension to od_straight feature", async () => {
      const bp = makeBlueprintResult({
        dimensions: [
          {
            id: "DIM-1", type: "diameter", nominal: 50, unit: "mm",
            tolerance: { type: "bilateral", upper: 0.02, lower: -0.02 },
            raw_text: "Ø50 ±0.02", confidence: 0.95,
          },
          {
            id: "DIM-2", type: "linear", nominal: 100, unit: "mm",
            raw_text: "100", confidence: 0.9,
            location_hint: "overall length",
          },
        ],
      });
      const r = await turningPrintIntakeEngine.convertBlueprint({ blueprint: bp });
      expect(r.success).toBe(true);
      expect(r.features.length).toBeGreaterThan(0);

      const odFeature = r.features.find(f => f.type === "od_straight" && f.od_mm === 50);
      expect(odFeature).toBeDefined();
      expect(odFeature!.tolerance_mm).toBeDefined();
    });

    it("converts bore dimension to id_bore feature", async () => {
      const bp = makeBlueprintResult({
        dimensions: [
          {
            id: "DIM-1", type: "diameter", nominal: 20, unit: "mm",
            raw_text: "Ø20", confidence: 0.9,
            location_hint: "bore diameter",
          },
        ],
      });
      const r = await turningPrintIntakeEngine.convertBlueprint({ blueprint: bp });
      expect(r.success).toBe(true);
      const boreFeature = r.features.find(f => f.type === "id_bore");
      expect(boreFeature).toBeDefined();
    });

    it("converts thread dimension to thread_od feature", async () => {
      const bp = makeBlueprintResult({
        dimensions: [
          {
            id: "DIM-1", type: "thread", nominal: 12, unit: "mm",
            raw_text: "M12x1.75", confidence: 0.9,
          },
        ],
      });
      const r = await turningPrintIntakeEngine.convertBlueprint({ blueprint: bp });
      expect(r.success).toBe(true);
      const threadFeature = r.features.find(f => f.type === "thread_od");
      expect(threadFeature).toBeDefined();
      expect(threadFeature!.thread_pitch_mm).toBeCloseTo(1.75, 2);
    });

    it("converts angular dimension to taper feature", async () => {
      const bp = makeBlueprintResult({
        dimensions: [
          {
            id: "DIM-1", type: "angular", nominal: 5, unit: "mm",
            raw_text: "5°", confidence: 0.9,
          },
        ],
      });
      const r = await turningPrintIntakeEngine.convertBlueprint({ blueprint: bp });
      const taperFeature = r.features.find(f => f.type === "od_taper");
      expect(taperFeature).toBeDefined();
      expect(taperFeature!.taper_angle_deg).toBe(5);
    });
  });

  describe("Material parsing integration", () => {
    it("resolves AISI 4140 to ISO P", async () => {
      const bp = makeBlueprintResult({ title_block: { material: "AISI 4140" } });
      const r = await turningPrintIntakeEngine.convertBlueprint({ blueprint: bp });
      expect(r.material.iso_group).toBe("P");
      expect(r.material.material_name).toBe("4140");
    });

    it("resolves SS316L to ISO M", async () => {
      const bp = makeBlueprintResult({ title_block: { material: "SS316L" } });
      const r = await turningPrintIntakeEngine.convertBlueprint({ blueprint: bp });
      expect(r.material.iso_group).toBe("M");
    });

    it("flags missing material as ambiguity", async () => {
      const bp = makeBlueprintResult({ title_block: {} });
      const r = await turningPrintIntakeEngine.convertBlueprint({ blueprint: bp });
      expect(r.ambiguities.some(a => a.type === "missing_material")).toBe(true);
    });
  });

  describe("Profile → contour conversion", () => {
    it("converts external profile to od_contour with profile_points", async () => {
      const bp = makeBlueprintResult({
        profiles: [
          {
            id: "PROF-1", name: "OD Profile", type: "external",
            points: [
              { x: 15, y: 0 }, { x: 15, y: -20 },
              { x: 25, y: -20 }, { x: 25, y: -50 },
            ],
            is_closed: false, confidence: 0.85,
          },
        ],
      });
      const r = await turningPrintIntakeEngine.convertBlueprint({ blueprint: bp });
      const contour = r.features.find(f => f.type === "od_contour");
      expect(contour).toBeDefined();
      expect(contour!.profile_points).toBeDefined();
      expect(contour!.profile_points!.length).toBe(4);
    });
  });

  describe("Bar stock selection", () => {
    it("selects appropriate bar stock for 50mm OD part", async () => {
      const bp = makeBlueprintResult({
        dimensions: [
          { id: "DIM-1", type: "diameter", nominal: 50, unit: "mm", raw_text: "Ø50", confidence: 0.9 },
        ],
      });
      const r = await turningPrintIntakeEngine.convertBlueprint({ blueprint: bp });
      // Bar stock should be >= 52mm (50 + 2mm allowance)
      expect(r.turning_input.bar_stock_od_mm).toBeGreaterThanOrEqual(52);
      // But not excessively large
      expect(r.turning_input.bar_stock_od_mm).toBeLessThanOrEqual(65);
    });
  });

  describe("TurningInput assembly", () => {
    it("produces valid TurningInput with all required fields", async () => {
      const bp = makeBlueprintResult({
        title_block: { part_number: "SHAFT-001", material: "4140 Steel" },
        dimensions: [
          { id: "DIM-1", type: "diameter", nominal: 40, unit: "mm", raw_text: "Ø40", confidence: 0.9 },
          { id: "DIM-2", type: "linear", nominal: 80, unit: "mm", raw_text: "80", confidence: 0.9 },
        ],
      });
      const r = await turningPrintIntakeEngine.convertBlueprint({
        blueprint: bp,
        machine: {
          max_spindle_rpm: 6000,
          max_power_kW: 22,
          controller: "fanuc",
        },
      });
      expect(r.turning_input.material.iso_group).toBeDefined();
      expect(r.turning_input.bar_stock_od_mm).toBeGreaterThan(0);
      expect(r.turning_input.part_length_mm).toBeGreaterThan(0);
      expect(r.turning_input.features).toEqual(r.features);
      expect(r.turning_input.controller).toBe("fanuc");
      expect(r.turning_input.max_spindle_rpm).toBe(6000);
    });
  });

  describe("Edge cases", () => {
    it("handles blueprint with no dimensions", async () => {
      const bp = makeBlueprintResult();
      const r = await turningPrintIntakeEngine.convertBlueprint({ blueprint: bp });
      expect(r.success).toBe(false);
      expect(r.ambiguities.some(a => a.type === "no_features")).toBe(true);
    });

    it("handles inch dimensions", async () => {
      const bp = makeBlueprintResult({
        dimensions: [
          { id: "DIM-1", type: "diameter", nominal: 2.0, unit: "in", raw_text: "Ø2.000", confidence: 0.9 },
        ],
      });
      const r = await turningPrintIntakeEngine.convertBlueprint({ blueprint: bp });
      // 2.0" = 50.8mm
      const feature = r.features.find(f => f.od_mm);
      expect(feature).toBeDefined();
      expect(feature!.od_mm).toBeCloseTo(50.8, 1);
    });
  });

  describe("Statistics", () => {
    it("returns accurate statistics", async () => {
      const bp = makeBlueprintResult({
        dimensions: [
          { id: "DIM-1", type: "diameter", nominal: 30, unit: "mm", raw_text: "Ø30", confidence: 0.9 },
          { id: "DIM-2", type: "diameter", nominal: 15, unit: "mm", raw_text: "Ø15", confidence: 0.85, location_hint: "bore" },
          { id: "DIM-3", type: "linear", nominal: 60, unit: "mm", raw_text: "60", confidence: 0.8 },
        ],
        profiles: [
          {
            id: "P-1", name: "Profile", type: "external",
            points: [{ x: 10, y: 0 }, { x: 15, y: -30 }],
            is_closed: false, confidence: 0.8,
          },
        ],
      });
      const r = await turningPrintIntakeEngine.convertBlueprint({ blueprint: bp });
      expect(r.stats.total_dimensions).toBe(3);
      // mapped_features includes both dimension-derived + profile-derived features
      expect(r.stats.mapped_features).toBeGreaterThanOrEqual(2);
      expect(r.stats.profiles_converted).toBe(1);
      expect(r.stats.confidence_avg).toBeGreaterThan(0);
    });
  });
});
