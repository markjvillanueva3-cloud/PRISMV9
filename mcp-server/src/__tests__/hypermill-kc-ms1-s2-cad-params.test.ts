/**
 * HM-KC-MS1-S2 CAD Parameter Catalog Tests
 *
 * Tests for U-HKC09 (Surface + Analysis schemas) and U-HKC10 (Electrode + Import/Export + Measure schemas).
 * All tests validate specific values — no toBeTruthy() stubs.
 *
 * @milestone HM-KC-MS1
 */

import { describe, it, expect } from "vitest";

// U-HKC09: Surface schemas
import {
  offsetSurfaceSchema,
  thickenSchema,
  extendSurfaceSchema,
  trimSurfaceSchema,
  stitchSchema,
  patchSchema,
  ruledSurfaceSchema,
  surfaceSweepSchema,
  SURFACE_OPERATION_SCHEMA_MAP,
  SURFACE_OPERATION_METADATA,
  SURFACE_TOTAL_PARAM_COUNT,
} from "../schemas/hypermill/cad/surfaceSchemas.js";

// U-HKC09: Analysis schemas
import {
  draftAnalysisSchema,
  undercutAnalysisSchema,
  curvatureAnalysisSchema,
  wallThicknessSchema,
  sphericalAnalysisSchema,
  featureRecognitionSchema,
  compareBodiesSchema,
  ANALYSIS_TOOL_SCHEMA_MAP,
  ANALYSIS_TOOL_METADATA,
  ANALYSIS_TOTAL_PARAM_COUNT,
} from "../schemas/hypermill/cad/analysisSchemas.js";

// U-HKC10: Electrode schemas
import {
  electrodeDesignSchema,
  holderLibrarySchema,
  virtualElectrodeSchema,
  sideElectrodeSchema,
  sparkGapValidationSchema,
  ELECTRODE_SCHEMA_MAP,
  ELECTRODE_METADATA,
  ELECTRODE_TOTAL_PARAM_COUNT,
} from "../schemas/hypermill/cad/electrodeSchemas.js";

// U-HKC10: Import/Export + Measure schemas
import {
  stepImportSchema,
  igesImportSchema,
  nativeImportSchema,
  exportSettingsSchema,
  boundingBoxSchema,
  stockFromModelSchema,
  pointMeasureSchema,
  IMPORT_EXPORT_SCHEMA_MAP,
  IMPORT_EXPORT_METADATA,
  IMPORT_EXPORT_TOTAL_PARAM_COUNT,
  MEASURE_BOUNDING_SCHEMA_MAP,
  MEASURE_BOUNDING_METADATA,
  MEASURE_BOUNDING_TOTAL_PARAM_COUNT,
} from "../schemas/hypermill/cad/importExportSchemas.js";

// Also import S1 counts for grand total
import { SKETCH_TOTAL_PARAM_COUNT } from "../schemas/hypermill/cad/sketchConstraintSchemas.js";
import { SOLID_TOTAL_PARAM_COUNT } from "../schemas/hypermill/cad/solidModelingSchemas.js";

// ═══════════════════════════════════════════════════════════════════════════════
// U-HKC09: Surface Operation Schemas
// ═══════════════════════════════════════════════════════════════════════════════

describe("U-HKC09: Surface Operation Schemas", () => {
  describe("Schema map completeness", () => {
    it("has exactly 8 surface operation types", () => {
      expect(Object.keys(SURFACE_OPERATION_SCHEMA_MAP).length).toBe(8);
    });

    it("has metadata for all 8 operations", () => {
      expect(Object.keys(SURFACE_OPERATION_METADATA).length).toBe(8);
    });

    it("total surface param count is 37", () => {
      expect(SURFACE_TOTAL_PARAM_COUNT).toBe(37);
    });

    it("contains all expected operation names", () => {
      const expected = [
        "offset_surface", "thicken", "extend_surface", "trim_surface",
        "stitch", "patch", "ruled_surface", "surface_sweep",
      ];
      for (const name of expected) {
        expect(SURFACE_OPERATION_SCHEMA_MAP).toHaveProperty(name);
      }
    });
  });

  describe("Offset surface", () => {
    it("parses with required distance", () => {
      const result = offsetSurfaceSchema.parse({ distance: 2.0 });
      expect(result.distance).toBe(2.0);
    });

    it("accepts negative offset distance", () => {
      const result = offsetSurfaceSchema.parse({ distance: -5.0 });
      expect(result.distance).toBe(-5.0);
    });

    it("requires distance field", () => {
      expect(() => offsetSurfaceSchema.parse({})).toThrow();
    });
  });

  describe("Thicken", () => {
    it("parses with required thickness", () => {
      const result = thickenSchema.parse({ thickness: 3.0 });
      expect(result.thickness).toBe(3.0);
    });

    it("rejects thickness below 0.01", () => {
      expect(() => thickenSchema.parse({ thickness: 0.001 })).toThrow();
    });
  });

  describe("Stitch", () => {
    it("parses with defaults", () => {
      const result = stitchSchema.parse({});
      expect(result.stitch_tolerance).toBe(0.01);
    });

    it("rejects tolerance above 1.0", () => {
      expect(() => stitchSchema.parse({ stitch_tolerance: 5.0 })).toThrow();
    });
  });

  describe("Trim surface", () => {
    it("accepts all trim types", () => {
      for (const t of ["split", "trim_keep", "trim_remove"]) {
        const result = trimSurfaceSchema.parse({ trim_type: t });
        expect(result.trim_type).toBe(t);
      }
    });
  });

  describe("Surface sweep continuity", () => {
    it("accepts G0/G1/G2 continuity values", () => {
      for (const c of ["g0", "g1", "g2"]) {
        const result = surfaceSweepSchema.parse({ continuity: c });
        expect(result.continuity).toBe(c);
      }
    });
  });

  describe("Metadata AC Python setters", () => {
    it("all 8 operations have hm.surface.* setters", () => {
      for (const [, meta] of Object.entries(SURFACE_OPERATION_METADATA)) {
        expect(meta.acPythonSetter).toContain("hm.surface.");
      }
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// U-HKC09: Analysis Tool Schemas
// ═══════════════════════════════════════════════════════════════════════════════

describe("U-HKC09: Analysis Tool Schemas", () => {
  describe("Schema map completeness", () => {
    it("has exactly 7 analysis tool types", () => {
      expect(Object.keys(ANALYSIS_TOOL_SCHEMA_MAP).length).toBe(7);
    });

    it("total analysis param count is 32", () => {
      expect(ANALYSIS_TOTAL_PARAM_COUNT).toBe(32);
    });

    it("contains all expected tool names", () => {
      const expected = [
        "draft_analysis", "undercut_analysis", "curvature_analysis",
        "wall_thickness", "spherical_analysis", "feature_recognition", "compare_bodies",
      ];
      for (const name of expected) {
        expect(ANALYSIS_TOOL_SCHEMA_MAP).toHaveProperty(name);
      }
    });
  });

  describe("Draft analysis", () => {
    it("parses with defaults", () => {
      const result = draftAnalysisSchema.parse({});
      expect(result.color_map).toBe(true);
    });

    it("accepts all pull directions", () => {
      for (const d of ["x", "y", "z", "custom"]) {
        const result = draftAnalysisSchema.parse({ pull_direction: d });
        expect(result.pull_direction).toBe(d);
      }
    });
  });

  describe("Wall thickness (DFM-critical)", () => {
    it("defaults min_thickness to 0.8mm (DFM safe for injection molding)", () => {
      const result = wallThicknessSchema.parse({});
      expect(result.min_thickness).toBe(0.8);
    });

    it("parses with explicit thickness override", () => {
      const result = wallThicknessSchema.parse({ min_thickness: 1.5 });
      expect(result.min_thickness).toBe(1.5);
    });

    it("has DFM-critical params in metadata", () => {
      expect(ANALYSIS_TOOL_METADATA.wall_thickness.dfmCriticalParams).toBeDefined();
      expect(ANALYSIS_TOOL_METADATA.wall_thickness.dfmCriticalParams!.length).toBeGreaterThan(0);
    });
  });

  describe("Feature recognition", () => {
    it("parses with defaults", () => {
      const result = featureRecognitionSchema.parse({});
      expect(result.recognize_holes).toBe(true);
      expect(result.recognize_pockets).toBe(true);
      expect(result.recognize_bosses).toBe(true);
    });
  });

  describe("Compare bodies", () => {
    it("parses with defaults", () => {
      const result = compareBodiesSchema.parse({});
      expect(result.compute_volume_diff).toBe(true);
    });

    it("accepts all display modes", () => {
      for (const m of ["color", "arrows", "both"]) {
        const result = compareBodiesSchema.parse({ display_mode: m });
        expect(result.display_mode).toBe(m);
      }
    });
  });

  describe("Metadata AC Python setters", () => {
    it("all 7 tools have hm.analysis.* setters", () => {
      for (const [, meta] of Object.entries(ANALYSIS_TOOL_METADATA)) {
        expect(meta.acPythonSetter).toContain("hm.analysis.");
      }
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// U-HKC10: Electrode Schemas
// ═══════════════════════════════════════════════════════════════════════════════

describe("U-HKC10: Electrode Schemas", () => {
  describe("Schema map completeness", () => {
    it("has exactly 5 electrode operation types", () => {
      expect(Object.keys(ELECTRODE_SCHEMA_MAP).length).toBe(5);
    });

    it("total electrode param count is 22", () => {
      expect(ELECTRODE_TOTAL_PARAM_COUNT).toBe(22);
    });

    it("contains all expected operation names", () => {
      const expected = [
        "electrode_design", "holder_library", "virtual_electrode",
        "side_electrode", "spark_gap_validation",
      ];
      for (const name of expected) {
        expect(ELECTRODE_SCHEMA_MAP).toHaveProperty(name);
      }
    });
  });

  describe("Electrode design (DFM-critical)", () => {
    it("requires overcut and spark_gap values", () => {
      expect(() => electrodeDesignSchema.parse({})).toThrow();
    });

    it("parses with valid electrode params", () => {
      const result = electrodeDesignSchema.parse({
        overcut_rough: 0.3,
        overcut_finish: 0.05,
        spark_gap: 0.1,
      });
      expect(result.overcut_rough).toBe(0.3);
      expect(result.overcut_finish).toBe(0.05);
      expect(result.spark_gap).toBe(0.1);
      expect(result.electrode_material).toBe("graphite");
    });

    it("accepts all electrode materials", () => {
      for (const m of ["copper", "graphite", "copper_tungsten", "silver_tungsten"]) {
        const result = electrodeDesignSchema.parse({
          overcut_rough: 0.2, overcut_finish: 0.02, spark_gap: 0.05,
          electrode_material: m,
        });
        expect(result.electrode_material).toBe(m);
      }
    });

    it("rejects spark_gap below 0.01", () => {
      expect(() =>
        electrodeDesignSchema.parse({
          overcut_rough: 0.2, overcut_finish: 0.02, spark_gap: 0.001,
        })
      ).toThrow();
    });

    it("has DFM-critical params in metadata", () => {
      expect(ELECTRODE_METADATA.electrode_design.dfmCriticalParams).toBeDefined();
      expect(ELECTRODE_METADATA.electrode_design.dfmCriticalParams!).toContain("spark_gap");
    });
  });

  describe("Holder library", () => {
    it("accepts all holder types", () => {
      for (const h of ["standard", "erowa", "system3r", "custom"]) {
        const result = holderLibrarySchema.parse({ shank_diameter: 12, reach_length: 50, holder_type: h });
        expect(result.holder_type).toBe(h);
      }
    });
  });

  describe("Spark gap validation", () => {
    it("parses with defaults", () => {
      const result = sparkGapValidationSchema.parse({});
      expect(result.dielectric_type).toBe("oil");
    });

    it("accepts all dielectric types", () => {
      for (const d of ["oil", "deionized_water", "kerosene"]) {
        const result = sparkGapValidationSchema.parse({ dielectric_type: d });
        expect(result.dielectric_type).toBe(d);
      }
    });
  });

  describe("Virtual electrode", () => {
    it("accepts all extraction modes", () => {
      for (const e of ["cavity", "boss", "combined"]) {
        const result = virtualElectrodeSchema.parse({ extraction_mode: e });
        expect(result.extraction_mode).toBe(e);
      }
    });
  });

  describe("Metadata AC Python setters", () => {
    it("all 5 electrode operations have hm.electrode.* setters", () => {
      for (const [, meta] of Object.entries(ELECTRODE_METADATA)) {
        expect(meta.acPythonSetter).toContain("hm.electrode.");
      }
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// U-HKC10: Import/Export + Measure/Bounding Schemas
// ═══════════════════════════════════════════════════════════════════════════════

describe("U-HKC10: Import/Export Schemas", () => {
  describe("Schema map completeness", () => {
    it("has exactly 4 import/export operation types", () => {
      expect(Object.keys(IMPORT_EXPORT_SCHEMA_MAP).length).toBe(4);
    });

    it("total import/export param count is 18", () => {
      expect(IMPORT_EXPORT_TOTAL_PARAM_COUNT).toBe(18);
    });
  });

  describe("STEP import", () => {
    it("parses with defaults", () => {
      const result = stepImportSchema.parse({});
      expect(result.unit_mode).toBe("auto");
      expect(result.sew_faces).toBe(true);
    });

    it("accepts all unit modes", () => {
      for (const u of ["mm", "inch", "auto"]) {
        const result = stepImportSchema.parse({ unit_mode: u });
        expect(result.unit_mode).toBe(u);
      }
    });
  });

  describe("Export settings", () => {
    it("accepts all export formats", () => {
      for (const f of ["step", "iges", "stl", "obj", "3mf", "parasolid"]) {
        const result = exportSettingsSchema.parse({ format: f });
        expect(result.format).toBe(f);
      }
    });

    it("accepts all tessellation qualities", () => {
      for (const q of ["coarse", "medium", "fine", "custom"]) {
        const result = exportSettingsSchema.parse({ format: "stl", tessellation_quality: q });
        expect(result.tessellation_quality).toBe(q);
      }
    });
  });

  describe("IGES import", () => {
    it("parses with defaults", () => {
      const result = igesImportSchema.parse({});
      expect(result.trim_repair).toBe(true);
    });
  });

  describe("Native import", () => {
    it("parses with defaults", () => {
      const result = nativeImportSchema.parse({});
      expect(result.feature_tree).toBe(true);
    });
  });

  describe("Metadata AC Python setters", () => {
    it("all 4 operations have hm.io.* setters", () => {
      for (const [, meta] of Object.entries(IMPORT_EXPORT_METADATA)) {
        expect(meta.acPythonSetter).toContain("hm.io.");
      }
    });
  });
});

describe("U-HKC10: Measure/Bounding Schemas", () => {
  describe("Schema map completeness", () => {
    it("has exactly 3 measure/bounding types", () => {
      expect(Object.keys(MEASURE_BOUNDING_SCHEMA_MAP).length).toBe(3);
    });

    it("total measure/bounding param count is 11", () => {
      expect(MEASURE_BOUNDING_TOTAL_PARAM_COUNT).toBe(11);
    });
  });

  describe("Bounding box", () => {
    it("parses with defaults", () => {
      const result = boundingBoxSchema.parse({});
      expect(result.box_type).toBe("aligned");
    });

    it("accepts all box types", () => {
      for (const b of ["aligned", "oriented", "minimum"]) {
        const result = boundingBoxSchema.parse({ box_type: b });
        expect(result.box_type).toBe(b);
      }
    });
  });

  describe("Stock from model", () => {
    it("parses with defaults", () => {
      const result = stockFromModelSchema.parse({});
      expect(result.stock_shape).toBe("rectangular");
    });

    it("accepts cylindrical stock", () => {
      const result = stockFromModelSchema.parse({ stock_shape: "cylindrical" });
      expect(result.stock_shape).toBe("cylindrical");
    });
  });

  describe("Point measure", () => {
    it("parses with defaults", () => {
      const result = pointMeasureSchema.parse({});
      expect(result.snap_to_geometry).toBe(true);
    });

    it("accepts all coordinate systems", () => {
      for (const cs of ["absolute", "wcs", "local"]) {
        const result = pointMeasureSchema.parse({ coordinate_system: cs });
        expect(result.coordinate_system).toBe(cs);
      }
    });
  });

  describe("Metadata AC Python setters", () => {
    it("all 3 measure types have hm.measure.* setters", () => {
      for (const [, meta] of Object.entries(MEASURE_BOUNDING_METADATA)) {
        expect(meta.acPythonSetter).toContain("hm.measure.");
      }
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Cross-session: Grand total validation
// ═══════════════════════════════════════════════════════════════════════════════

describe("HM-KC-MS1 Grand Total", () => {
  it("S1 + S2 totals: sketch(63) + solid(58) + surface(37) + analysis(32) + electrode(22) + io(18) + measure(11) = 241", () => {
    const grandTotal =
      SKETCH_TOTAL_PARAM_COUNT +
      SOLID_TOTAL_PARAM_COUNT +
      SURFACE_TOTAL_PARAM_COUNT +
      ANALYSIS_TOTAL_PARAM_COUNT +
      ELECTRODE_TOTAL_PARAM_COUNT +
      IMPORT_EXPORT_TOTAL_PARAM_COUNT +
      MEASURE_BOUNDING_TOTAL_PARAM_COUNT;
    expect(grandTotal).toBe(241);
  });

  it("total schema type count = 20 + 11 + 8 + 7 + 5 + 4 + 3 = 58 types", () => {
    const totalTypes =
      Object.keys(SURFACE_OPERATION_SCHEMA_MAP).length +
      Object.keys(ANALYSIS_TOOL_SCHEMA_MAP).length +
      Object.keys(ELECTRODE_SCHEMA_MAP).length +
      Object.keys(IMPORT_EXPORT_SCHEMA_MAP).length +
      Object.keys(MEASURE_BOUNDING_SCHEMA_MAP).length +
      20 + 11; // sketch + solid from S1
    expect(totalTypes).toBe(58);
  });
});
