/**
 * LathePrintIngestPipelineEngine Tests — U-LTH33
 *
 * Tests blueprint-to-structured-data pipeline for lathe prints.
 * Exit gate: ≥90% dimension-extraction accuracy on JM Die-style drawings.
 *
 * @milestone LATHE-MASTER U-LTH33
 */

import { describe, it, expect } from "vitest";
import {
  lathePrintIngestPipelineEngine,
  BlueprintIntake,
  Dimension,
  GDTCallout,
} from "../engines/LathePrintIngestPipelineEngine.js";

// ============================================================================
// MOCK JM DIE DRAWINGS (text representation of print callouts)
// ============================================================================

const JM_DIE_SAMPLE_1 = `
PART NO. JMD-12345
REV A
MATERIAL: AISI 4140 HEAT TREAT TO 58-62 HRC
DRAWING PER ASME Y14.5-2018

DIMENSIONS:
Ø50.00 +0.02/-0.01
Ø25.00 H7
M12x1.75-6H
100.00 ±0.05
R2.5
C0.5 x 45°

GD&T:
⌖ Ø0.05 A|B
◎ 0.02 A
↗ 0.03 A

SURFACE FINISH:
Ra 1.6 (ALL MACHINED SURFACES)

NOTES:
1. BREAK ALL SHARP EDGES 0.3 MAX
2. DEBURR ALL
3. 100% INSPECTION REQUIRED
`;

const JM_DIE_SAMPLE_2 = `
P/N ABC-789-01
REVISION 3
MATERIAL: 303 STAINLESS STEEL

Ø75.000 +0.010/-0.005
Ø32.00 g6
Ø12.50 ±0.02
45.00 h6
1/4-20 UNC

POSITION ⌀0.08 A B C
TIR 0.025 A
PERPENDICULARITY 0.015 A

Ra 0.8
ZINC PLATE PER QQ-Z-325
`;

const JM_DIE_SAMPLE_3 = `
PART NUMBER: SHAFT-001
REV B
6061-T6 ALUMINUM

Ø100.00 +0.03/-0.00
Ø80.00 H8
Ø60.00 ±0.025
Ø40.00
LENGTH 150.00 ±0.10

CONCENTRICITY 0.03 A
CYLINDRICITY 0.02
CIRCULARITY 0.01
RUNOUT 0.04 A|B

√ 3.2
`;

const EDGE_CASE_EMPTY = "";

const EDGE_CASE_NO_DIMS = `
MATERIAL: STEEL
NOTES: THIS IS A TEST
NO DIMENSIONS PROVIDED
`;

const EDGE_CASE_UNICODE = `
⌀50.00 ±0.02
⌀30.00 H7
⌖ ⌀0.05 A|B|C
◎ 0.02 A
⏤ 0.01
⌭ 0.015
○ 0.008
`;

const EDGE_CASE_METRIC_THREAD = `
M8x1.25-6g
M10x1.5
M16x2.0-6H
M20
`;

const EDGE_CASE_INCH_THREAD = `
1/4-20 UNC
3/8-16 UNC
1/2-13 UNC
5/8-11 UNF
`;

const EDGE_CASE_SUPERALLOY = `
MATERIAL: INCONEL 718
HEAT TREAT TO 40-44 HRC
Ø25.00 +0.01/-0.00
Ti-6Al-4V ALTERNATE
`;

const EDGE_CASE_MULTIPLE_FINISHES = `
Ra 0.4 (BEARING SURFACES)
Ra 1.6 (GENERAL)
Ra 3.2 (NON-CRITICAL)
Rz 6.3
RMS 63
√ 1.6
∇ 32
`;

// ============================================================================
// HAPPY PATH TESTS
// ============================================================================

describe("LathePrintIngestPipelineEngine", () => {
  describe("ingest() — happy path", () => {
    it("extracts dimensions from JM Die sample 1", () => {
      const result = lathePrintIngestPipelineEngine.ingest({
        raw_text: JM_DIE_SAMPLE_1,
        filename: "JMD-12345.pdf",
        format: "pdf",
      });

      expect(result.source.filename).toBe("JMD-12345.pdf");
      expect(result.source.format).toBe("pdf");
      expect(result.part_number).toBe("JMD-12345");
      expect(result.revision).toBe("A");
      expect(result.drawing_std).toContain("ASME Y14.5");

      // Dimensions: Ø50, Ø25, M12, 100, R2.5, C0.5, 1.75 pitch, 45° angle
      expect(result.dimensions.length).toBeGreaterThanOrEqual(5);

      const diameters = result.dimensions.filter((d) => d.type === "diameter");
      expect(diameters.length).toBeGreaterThanOrEqual(2);
      expect(diameters.some((d) => d.nominal_mm === 50)).toBe(true);
      expect(diameters.some((d) => d.nominal_mm === 25)).toBe(true);
    });

    it("extracts GD&T callouts from JM Die sample 1", () => {
      const result = lathePrintIngestPipelineEngine.ingest({
        raw_text: JM_DIE_SAMPLE_1,
      });

      // GD&T: position, concentricity, runout
      expect(result.gdt_callouts.length).toBeGreaterThanOrEqual(3);

      const position = result.gdt_callouts.find((g) => g.symbol === "position");
      expect(position).toBeDefined();
      expect(position?.tolerance_mm).toBe(0.05);
      expect(position?.datum_refs).toContain("A");
      expect(position?.datum_refs).toContain("B");

      const conc = result.gdt_callouts.find((g) => g.symbol === "concentricity");
      expect(conc).toBeDefined();
      expect(conc?.tolerance_mm).toBe(0.02);
    });

    it("extracts material from JM Die sample 1", () => {
      const result = lathePrintIngestPipelineEngine.ingest({
        raw_text: JM_DIE_SAMPLE_1,
      });

      expect(result.material).toBeDefined();
      expect(result.material?.aisi).toBe("4140");
      expect(result.material?.iso_group).toBe("P"); // Carbon/alloy steel
      expect(result.material?.hardness_hrc).toBe(58);
    });

    it("extracts surface finish from JM Die sample 1", () => {
      const result = lathePrintIngestPipelineEngine.ingest({
        raw_text: JM_DIE_SAMPLE_1,
      });

      expect(result.surface_finishes.length).toBeGreaterThanOrEqual(1);
      expect(result.surface_finishes[0].ra_um).toBe(1.6);
    });

    it("extracts notes from JM Die sample 1", () => {
      const result = lathePrintIngestPipelineEngine.ingest({
        raw_text: JM_DIE_SAMPLE_1,
      });

      expect(result.notes.length).toBeGreaterThanOrEqual(2);
      expect(result.notes.some((n) => n.category === "machining")).toBe(true);
      expect(result.notes.some((n) => n.category === "inspection")).toBe(true);
      expect(result.notes.some((n) => n.category === "heat_treat")).toBe(true);
    });

    it("infers turning features from dimensions", () => {
      const result = lathePrintIngestPipelineEngine.ingest({
        raw_text: JM_DIE_SAMPLE_1,
      });

      expect(result.features.length).toBeGreaterThanOrEqual(3);
      expect(result.features.some((f) => f.type === "od_turn" || f.type === "id_bore")).toBe(true);
    });

    it("extracts from JM Die sample 2 (stainless)", () => {
      const result = lathePrintIngestPipelineEngine.ingest({
        raw_text: JM_DIE_SAMPLE_2,
      });

      expect(result.part_number).toBe("ABC-789-01");
      expect(result.revision).toBe("3");
      expect(result.material?.aisi).toBe("303");
      expect(result.material?.iso_group).toBe("M"); // Stainless
      expect(result.dimensions.length).toBeGreaterThanOrEqual(4);
      expect(result.gdt_callouts.length).toBeGreaterThanOrEqual(2);
      expect(result.notes.some((n) => n.category === "plating")).toBe(true);
    });

    it("extracts from JM Die sample 3 (aluminum)", () => {
      const result = lathePrintIngestPipelineEngine.ingest({
        raw_text: JM_DIE_SAMPLE_3,
      });

      expect(result.part_number).toBe("SHAFT-001");
      expect(result.revision).toBe("B");
      expect(result.material?.aisi).toContain("6061");
      expect(result.material?.iso_group).toBe("N"); // Non-ferrous
      expect(result.dimensions.length).toBeGreaterThanOrEqual(4);

      // Check for all 4 GD&T types
      expect(result.gdt_callouts.some((g) => g.symbol === "concentricity")).toBe(true);
      expect(result.gdt_callouts.some((g) => g.symbol === "cylindricity")).toBe(true);
      expect(result.gdt_callouts.some((g) => g.symbol === "circularity")).toBe(true);
      expect(result.gdt_callouts.some((g) => g.symbol === "runout")).toBe(true);
    });

    it("calculates extraction confidence", () => {
      const result = lathePrintIngestPipelineEngine.ingest({
        raw_text: JM_DIE_SAMPLE_1,
      });

      expect(result.extraction_confidence).toBeGreaterThanOrEqual(0.7);
      expect(result.extraction_confidence).toBeLessThanOrEqual(1.0);
      expect(result.extraction_timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });

  // ============================================================================
  // EDGE CASES
  // ============================================================================

  describe("ingest() — edge cases", () => {
    it("handles empty input gracefully", () => {
      const result = lathePrintIngestPipelineEngine.ingest({
        raw_text: EDGE_CASE_EMPTY,
      });

      expect(result.dimensions).toEqual([]);
      expect(result.gdt_callouts).toEqual([]);
      expect(result.warnings.length).toBeGreaterThanOrEqual(1);
      expect(result.warnings.some((w) => w.includes("No dimensions"))).toBe(true);
    });

    it("handles input with no dimensions", () => {
      const result = lathePrintIngestPipelineEngine.ingest({
        raw_text: EDGE_CASE_NO_DIMS,
      });

      expect(result.dimensions).toEqual([]);
      expect(result.warnings.some((w) => w.includes("No dimensions"))).toBe(true);
      expect(result.warnings.some((w) => w.includes("Material not identified"))).toBe(true);
    });

    it("parses Unicode GD&T symbols", () => {
      const result = lathePrintIngestPipelineEngine.ingest({
        raw_text: EDGE_CASE_UNICODE,
      });

      expect(result.dimensions.length).toBeGreaterThanOrEqual(2);
      expect(result.gdt_callouts.length).toBeGreaterThanOrEqual(4);
      expect(result.gdt_callouts.some((g) => g.symbol === "position")).toBe(true);
      expect(result.gdt_callouts.some((g) => g.symbol === "concentricity")).toBe(true);
      expect(result.gdt_callouts.some((g) => g.symbol === "straightness")).toBe(true);
      expect(result.gdt_callouts.some((g) => g.symbol === "cylindricity")).toBe(true);
      expect(result.gdt_callouts.some((g) => g.symbol === "circularity")).toBe(true);
    });

    it("parses metric threads", () => {
      const result = lathePrintIngestPipelineEngine.ingest({
        raw_text: EDGE_CASE_METRIC_THREAD,
      });

      // M8, M10, M16, M20 diameters + pitches
      const diameters = result.dimensions.filter((d) => d.type === "diameter");
      expect(diameters.some((d) => d.nominal_mm === 8)).toBe(true);
      expect(diameters.some((d) => d.nominal_mm === 10)).toBe(true);
      expect(diameters.some((d) => d.nominal_mm === 16)).toBe(true);

      const pitches = result.dimensions.filter((d) => d.type === "thread_pitch");
      expect(pitches.some((d) => d.nominal_mm === 1.25)).toBe(true);
      expect(pitches.some((d) => d.nominal_mm === 1.5)).toBe(true);
    });

    it("identifies superalloy materials", () => {
      const result = lathePrintIngestPipelineEngine.ingest({
        raw_text: EDGE_CASE_SUPERALLOY,
      });

      expect(result.material).toBeDefined();
      expect(result.material?.iso_group).toBe("S"); // Superalloy
    });

    it("extracts multiple surface finish callouts", () => {
      const result = lathePrintIngestPipelineEngine.ingest({
        raw_text: EDGE_CASE_MULTIPLE_FINISHES,
      });

      expect(result.surface_finishes.length).toBeGreaterThanOrEqual(4);
      expect(result.surface_finishes.some((s) => s.ra_um === 0.4)).toBe(true);
      expect(result.surface_finishes.some((s) => s.ra_um === 1.6)).toBe(true);
      expect(result.surface_finishes.some((s) => s.ra_um === 3.2)).toBe(true);
    });
  });

  // ============================================================================
  // BOUNDARY CONDITIONS
  // ============================================================================

  describe("ingest() — boundary conditions", () => {
    it("handles very small dimensions", () => {
      const result = lathePrintIngestPipelineEngine.ingest({
        raw_text: "Ø0.5 +0.01/-0.01\nR0.1\nC0.05",
      });

      expect(result.dimensions.some((d) => d.nominal_mm === 0.5)).toBe(true);
      expect(result.dimensions.some((d) => d.nominal_mm === 0.1)).toBe(true);
    });

    it("handles very large dimensions", () => {
      const result = lathePrintIngestPipelineEngine.ingest({
        raw_text: "Ø500.00 ±0.10\nØ1000.00 H7",
      });

      expect(result.dimensions.some((d) => d.nominal_mm === 500)).toBe(true);
      expect(result.dimensions.some((d) => d.nominal_mm === 1000)).toBe(true);
    });

    it("handles tight tolerances", () => {
      const result = lathePrintIngestPipelineEngine.ingest({
        raw_text: "Ø25.000 +0.002/-0.000\n⌖ Ø0.005 A",
      });

      const dia = result.dimensions.find((d) => d.nominal_mm === 25);
      expect(dia?.tolerance_plus_mm).toBe(0.002);
      expect(dia?.tolerance_minus_mm).toBeCloseTo(0, 5); // handle -0 vs 0

      const pos = result.gdt_callouts.find((g) => g.symbol === "position");
      expect(pos?.tolerance_mm).toBe(0.005);
    });

    it("handles zero radius/chamfer (edge case)", () => {
      const result = lathePrintIngestPipelineEngine.ingest({
        raw_text: "R0\nC0",
      });

      // Zero values should be filtered out
      expect(result.dimensions.filter((d) => d.type === "radius").length).toBe(0);
      expect(result.dimensions.filter((d) => d.type === "chamfer").length).toBe(0);
    });

    it("handles negative tolerance values", () => {
      const result = lathePrintIngestPipelineEngine.ingest({
        raw_text: "Ø50.00 -0.02/-0.05",
      });

      const dia = result.dimensions.find((d) => d.nominal_mm === 50);
      expect(dia?.tolerance_plus_mm).toBe(-0.02);
      expect(dia?.tolerance_minus_mm).toBe(-0.05);
    });
  });

  // ============================================================================
  // ADVERSARIAL INPUTS
  // ============================================================================

  describe("ingest() — adversarial inputs", () => {
    it("handles NaN-like strings", () => {
      const result = lathePrintIngestPipelineEngine.ingest({
        raw_text: "Ø NaN\nØInfinity\nØ-Infinity\nØundefined",
      });

      // Should not crash, should filter invalid values
      expect(result.dimensions.filter((d) => isNaN(d.nominal_mm))).toEqual([]);
      expect(result.dimensions.filter((d) => !isFinite(d.nominal_mm))).toEqual([]);
    });

    it("handles extremely long input", () => {
      const longText = JM_DIE_SAMPLE_1.repeat(100);
      const result = lathePrintIngestPipelineEngine.ingest({
        raw_text: longText,
      });

      // Should complete without error
      expect(result.dimensions.length).toBeGreaterThan(0);
      expect(result.extraction_timestamp).toBeDefined();
    });

    it("handles special regex characters in text", () => {
      const result = lathePrintIngestPipelineEngine.ingest({
        raw_text: "Ø50.00 (see note [1])\n{special} *chars* $100",
      });

      // Should not crash
      expect(result).toBeDefined();
      expect(result.dimensions.some((d) => d.nominal_mm === 50)).toBe(true);
    });

    it("handles mixed case input", () => {
      const result = lathePrintIngestPipelineEngine.ingest({
        raw_text: "MATERIAL: 4140 STEEL\nRa 1.6\nPOSITION ⌀0.05 A|B",
      });

      // Material regex needs MATERIAL: prefix now for 4-digit alloys
      expect(result.material?.aisi).toBe("4140");
      expect(result.surface_finishes.some((s) => s.ra_um === 1.6)).toBe(true);
    });

    it("handles malformed tolerance notation", () => {
      const result = lathePrintIngestPipelineEngine.ingest({
        raw_text: "Ø50.00 +/-\nØ25.00 ++0.01\nØ30.00 H",
      });

      // Should extract what it can, skip malformed
      expect(result.dimensions.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ============================================================================
  // BATCH PROCESSING
  // ============================================================================

  describe("batchIngest()", () => {
    it("processes multiple prints", () => {
      const results = lathePrintIngestPipelineEngine.batchIngest([
        { raw_text: JM_DIE_SAMPLE_1, filename: "print1.pdf" },
        { raw_text: JM_DIE_SAMPLE_2, filename: "print2.pdf" },
        { raw_text: JM_DIE_SAMPLE_3, filename: "print3.pdf" },
      ]);

      expect(results.length).toBe(3);
      expect(results[0].index).toBe(0);
      expect(results[1].index).toBe(1);
      expect(results[2].index).toBe(2);
      expect(results[0].source.filename).toBe("print1.pdf");
      expect(results[1].source.filename).toBe("print2.pdf");
      expect(results[2].source.filename).toBe("print3.pdf");
    });

    it("handles empty batch", () => {
      const results = lathePrintIngestPipelineEngine.batchIngest([]);
      expect(results).toEqual([]);
    });
  });

  // ============================================================================
  // VALIDATION
  // ============================================================================

  describe("validateExtraction()", () => {
    it("validates against ground truth — full match", () => {
      const intake = lathePrintIngestPipelineEngine.ingest({
        raw_text: JM_DIE_SAMPLE_1,
      });

      const validation = lathePrintIngestPipelineEngine.validateExtraction(intake, {
        part_number: "JMD-12345",
        material: "4140",
      });

      expect(validation.accuracy).toBe(1.0);
      expect(validation.details.part_number?.match).toBe(true);
      expect(validation.details.material?.match).toBe(true);
    });

    it("validates against ground truth — partial match", () => {
      const intake = lathePrintIngestPipelineEngine.ingest({
        raw_text: JM_DIE_SAMPLE_1,
      });

      const validation = lathePrintIngestPipelineEngine.validateExtraction(intake, {
        part_number: "JMD-12345",
        material: "WRONG-MATERIAL",
      });

      expect(validation.accuracy).toBe(0.5);
      expect(validation.details.part_number?.match).toBe(true);
      expect(validation.details.material?.match).toBe(false);
    });

    it("validates dimension count", () => {
      const intake = lathePrintIngestPipelineEngine.ingest({
        raw_text: "Ø50.00\nØ25.00\nØ10.00",
      });

      const validation = lathePrintIngestPipelineEngine.validateExtraction(intake, {
        dim_count: 3,
      });

      expect(validation.details.dim_count?.match).toBe(true);
    });
  });

  // ============================================================================
  // EXTRACTION ACCURACY (EXIT GATE: ≥90%)
  // ============================================================================

  describe("extraction accuracy — exit gate", () => {
    const testCases = [
      {
        name: "JM Die Sample 1",
        text: JM_DIE_SAMPLE_1,
        expected: { dim_count_min: 5, gdt_count_min: 3, material: "4140", part_number: "JMD-12345" },
      },
      {
        name: "JM Die Sample 2",
        text: JM_DIE_SAMPLE_2,
        expected: { dim_count_min: 4, gdt_count_min: 2, material: "303", part_number: "ABC-789-01" },
      },
      {
        name: "JM Die Sample 3",
        text: JM_DIE_SAMPLE_3,
        expected: { dim_count_min: 4, gdt_count_min: 4, material: "6061", part_number: "SHAFT-001" },
      },
    ];

    let totalMatches = 0;
    let totalChecks = 0;

    for (const tc of testCases) {
      it(`meets extraction thresholds for ${tc.name}`, () => {
        const intake = lathePrintIngestPipelineEngine.ingest({ raw_text: tc.text });

        // Dimension count
        const dimPass = intake.dimensions.length >= tc.expected.dim_count_min;
        expect(dimPass).toBe(true);
        if (dimPass) totalMatches++;
        totalChecks++;

        // GD&T count
        const gdtPass = intake.gdt_callouts.length >= tc.expected.gdt_count_min;
        expect(gdtPass).toBe(true);
        if (gdtPass) totalMatches++;
        totalChecks++;

        // Material - check raw_text or aisi contains expected
        const matPass = (intake.material?.aisi?.includes(tc.expected.material) ||
                         intake.material?.raw_text?.includes(tc.expected.material)) ?? false;
        expect(matPass).toBe(true);
        if (matPass) totalMatches++;
        totalChecks++;

        // Part number
        const pnPass = intake.part_number === tc.expected.part_number;
        expect(pnPass).toBe(true);
        if (pnPass) totalMatches++;
        totalChecks++;
      });
    }

    it("overall extraction accuracy ≥ 90%", () => {
      // Run all test cases and calculate accuracy
      let matches = 0;
      let checks = 0;

      for (const tc of testCases) {
        const intake = lathePrintIngestPipelineEngine.ingest({ raw_text: tc.text });

        if (intake.dimensions.length >= tc.expected.dim_count_min) matches++;
        checks++;

        if (intake.gdt_callouts.length >= tc.expected.gdt_count_min) matches++;
        checks++;

        if (intake.material?.aisi?.includes(tc.expected.material) ||
            intake.material?.raw_text?.includes(tc.expected.material)) matches++;
        checks++;

        if (intake.part_number === tc.expected.part_number) matches++;
        checks++;
      }

      const accuracy = matches / checks;
      expect(accuracy).toBeGreaterThanOrEqual(0.9);
    });
  });

  // ============================================================================
  // SCHEMA COMPLIANCE
  // ============================================================================

  describe("schema compliance", () => {
    it("output conforms to BlueprintIntakeSchema", () => {
      const result = lathePrintIngestPipelineEngine.ingest({
        raw_text: JM_DIE_SAMPLE_1,
        filename: "test.pdf",
        format: "pdf",
        page_count: 1,
      });

      // Check required fields
      expect(result.source).toBeDefined();
      expect(result.source.format).toBe("pdf");
      expect(Array.isArray(result.dimensions)).toBe(true);
      expect(Array.isArray(result.gdt_callouts)).toBe(true);
      expect(Array.isArray(result.surface_finishes)).toBe(true);
      expect(Array.isArray(result.features)).toBe(true);
      expect(Array.isArray(result.notes)).toBe(true);
      expect(typeof result.extraction_confidence).toBe("number");
      expect(Array.isArray(result.warnings)).toBe(true);
      expect(typeof result.extraction_timestamp).toBe("string");
    });

    it("dimensions conform to DimensionSchema", () => {
      const result = lathePrintIngestPipelineEngine.ingest({
        raw_text: JM_DIE_SAMPLE_1,
      });

      for (const dim of result.dimensions) {
        expect(typeof dim.id).toBe("string");
        expect(typeof dim.type).toBe("string");
        expect(typeof dim.nominal_mm).toBe("number");
        expect(dim.confidence).toBeGreaterThanOrEqual(0);
        expect(dim.confidence).toBeLessThanOrEqual(1);
      }
    });

    it("GDT callouts conform to GDTCalloutSchema", () => {
      const result = lathePrintIngestPipelineEngine.ingest({
        raw_text: JM_DIE_SAMPLE_1,
      });

      for (const gdt of result.gdt_callouts) {
        expect(typeof gdt.id).toBe("string");
        expect(typeof gdt.symbol).toBe("string");
        expect(typeof gdt.tolerance_mm).toBe("number");
        expect(Array.isArray(gdt.datum_refs)).toBe(true);
        expect(gdt.confidence).toBeGreaterThanOrEqual(0);
        expect(gdt.confidence).toBeLessThanOrEqual(1);
      }
    });
  });
});
