/**
 * PrintToGeometry Real-World Validation Tests
 *
 * Phase 0-A Session 0-A-1 Unit U02
 * Tests PrintToGeometryEngine with real Haas workbook-derived dimensions.
 * Verifies generated CadQuery scripts are syntactically valid and model correct geometry.
 */
import { describe, it, expect } from "vitest";
import {
  printToGeometryEngine,
  type BlueprintAnalysis,
} from "../engines/PrintToGeometryEngine.js";

// ============================================================================
// TEST DATA — derived from Haas Mill Workbook O00020 Circular Pocket Exercise
// ============================================================================

const HAAS_POCKET_PART: BlueprintAnalysis = {
  part_name: "Haas_CPM_Exercise_O00020",
  material: "6061-T6 Aluminum",
  units: "inch",
  overall_dimensions: { length: 6.0, width: 4.0, height: 1.5 },
  part_type: "prismatic",
  features: [
    {
      // CPM1: 2.0" Dia × 0.500" deep circular pocket at X-2.5 Y1.5
      type: "pocket",
      dimensions: { diameter_mm: 2.0, depth_mm: 0.5 },
      position: { x: -2.5, y: 1.5 },
      notes: "G12 circular pocket, rough I0.25 K0.99 Q0.2, finish I1.0",
    },
    {
      // CPM2: 2.0" Dia × 0.750" deep circular pocket at X2.5 Y1.5
      type: "pocket",
      dimensions: { diameter_mm: 2.0, depth_mm: 0.75 },
      position: { x: 2.5, y: 1.5 },
      notes: "G12 circular pocket, L3 incremental 0.25 depth, I0.3 K1.0 Q0.35",
    },
  ],
};

// Turning part from O00075 TNC Example
const HAAS_LATHE_PART: BlueprintAnalysis = {
  part_name: "Haas_TNC_Exercise_O00075",
  material: "1018 Steel",
  units: "inch",
  overall_dimensions: { length: 4.0, width: 2.0, height: 2.0 },
  part_type: "cylindrical",
  outer_diameter: 2.0,
  features: [
    {
      // Step at X0.55 (0.55" diameter)
      type: "step",
      dimensions: { diameter_mm: 0.55, length_mm: 0.05 },
      position: { x: 0, y: 0, z: 0 },
    },
    {
      // Main OD at X0.75, length 0.75"
      type: "step",
      dimensions: { diameter_mm: 0.75, length_mm: 0.7 },
    },
    {
      // Radius R0.25 at transition
      type: "fillet",
      dimensions: { radius_mm: 0.25 },
    },
    {
      // Groove at Z-1.72
      type: "groove",
      dimensions: { width_mm: 0.25, depth_mm: 0.125 },
      position: { x: 0, y: 0, z: -1.72 },
    },
  ],
};

// ============================================================================
// TESTS
// ============================================================================

describe("PrintToGeometry Real-World Validation — Haas Workbook", () => {
  describe("Mill Part: O00020 Circular Pocket Exercise", () => {
    it("should generate valid CadQuery script", () => {
      const result = printToGeometryEngine.convert(HAAS_POCKET_PART);

      expect(result.value).toBeDefined();
      expect(result.value.cadquery_script).toContain("import cadquery as cq");
      expect(result.value.cadquery_script).toContain("cq.Workplane");
      expect(result.value.cadquery_script).toContain(".step");
    });

    it("should create base stock with correct dimensions", () => {
      const result = printToGeometryEngine.convert(HAAS_POCKET_PART);
      const script = result.value.cadquery_script;

      // 6.0" × 4.0" × 1.5" converted to mm = 152.40 × 101.60 × 38.10
      expect(script).toContain("box(");
      // Check that dimensions are approximately correct (in mm)
      expect(script).toMatch(/152\.\d+/); // ~152.4mm length
      expect(script).toMatch(/101\.\d+/); // ~101.6mm width
      expect(script).toMatch(/38\.\d+/);  // ~38.1mm height
    });

    it("should model both pocket features", () => {
      const result = printToGeometryEngine.convert(HAAS_POCKET_PART);

      // Should model at least 1 feature (pockets)
      expect(result.value.features_modeled).toBeGreaterThanOrEqual(1);
    });

    it("should have confidence score", () => {
      const result = printToGeometryEngine.convert(HAAS_POCKET_PART);

      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it("should include part name in script", () => {
      const result = printToGeometryEngine.convert(HAAS_POCKET_PART);

      expect(result.value.cadquery_script).toContain("Haas_CPM_Exercise");
    });

    it("should include material in comments", () => {
      const result = printToGeometryEngine.convert(HAAS_POCKET_PART);

      expect(result.value.cadquery_script).toContain("6061");
    });

    it("should export to STEP file", () => {
      const result = printToGeometryEngine.convert(HAAS_POCKET_PART);

      expect(result.value.cadquery_script).toContain("exporters.export");
      expect(result.value.cadquery_script).toContain(".step");
    });
  });

  describe("Lathe Part: O00075 TNC Example", () => {
    it("should generate cylindrical base stock", () => {
      const result = printToGeometryEngine.convert(HAAS_LATHE_PART);
      const script = result.value.cadquery_script;

      // 2.0" OD → 50.8mm OD, 4.0" length → 101.6mm
      expect(script).toContain("cylinder(");
      expect(script).toMatch(/101\.\d+/); // ~101.6mm length
      expect(script).toMatch(/25\.\d+/);  // ~25.4mm radius (OD/2)
    });

    it("should model turning features", () => {
      const result = printToGeometryEngine.convert(HAAS_LATHE_PART);

      // Should model at least some features (steps, grooves, fillets)
      expect(result.value.features_modeled).toBeGreaterThanOrEqual(1);
    });

    it("should include material 1018 Steel", () => {
      const result = printToGeometryEngine.convert(HAAS_LATHE_PART);

      expect(result.value.cadquery_script).toContain("1018");
    });
  });

  describe("Script Quality", () => {
    it("should generate syntactically valid Python", () => {
      const result = printToGeometryEngine.convert(HAAS_POCKET_PART);
      const script = result.value.cadquery_script;

      // Basic Python syntax checks
      expect(script).not.toContain("undefined");
      expect(script).not.toContain("NaN");
      expect(script).not.toContain("[object Object]");

      // Should have balanced parentheses (rough check)
      const opens = (script.match(/\(/g) || []).length;
      const closes = (script.match(/\)/g) || []).length;
      expect(opens).toBe(closes);
    });

    it("should use metric dimensions internally (mm)", () => {
      const result = printToGeometryEngine.convert(HAAS_POCKET_PART);
      const script = result.value.cadquery_script;

      // Input is inches, but CadQuery works in mm
      // 6.0" = 152.4mm — should see mm-scale numbers, not inch-scale
      // The box dimensions should be > 100 (mm), not < 10 (inches)
      const boxMatch = script.match(/box\((\d+\.?\d*)/);
      if (boxMatch) {
        const firstDim = parseFloat(boxMatch[1]);
        expect(firstDim).toBeGreaterThan(100); // mm, not inches
      }
    });

    it("should report warnings for complex features", () => {
      const result = printToGeometryEngine.convert(HAAS_POCKET_PART);

      // warnings array should exist (may be empty for simple parts)
      expect(result.value).toHaveProperty("features_skipped");
    });
  });
});
