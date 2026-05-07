/**
 * PDFBlueprintDimensionExtractorEngine — PHASE22 wiring tests. Real
 * assertions on extractDimensions() and validateCompleteness() against
 * synthetic blueprint text containing diameter, length, tolerance,
 * surface-finish, thread, and GD&T callouts.
 */
import { describe, it, expect } from "vitest";
import { pdfBlueprintDimensionExtractorEngine } from "../engines/PDFBlueprintDimensionExtractorEngine.js";

const FULL_BLUEPRINT = `
PART NUMBER: 2475-037
MATERIAL: AISI 4140
REVISION: B
TITLE: Extrude Punch
SCALE: 1:2

DIMENSIONS (mm):
⌀8.00 +0.05/-0.00
LENGTH 100.00 +0.05/-0.00
RADIUS R5.0 ±0.10
ANGLE 45° ±1°
M10x1.5 thru

SURFACE FINISH: Ra 0.8 μm
GD&T:
⌯ 0.05 A B
⌖ 0.02 A
`;

const MINIMAL_BLUEPRINT = `
DIAMETER 12 mm
LENGTH 50 mm
`;

describe("PDFBlueprintDimensionExtractorEngine.extractDimensions — full blueprint", () => {
  it("extracts at least 1 diameter dimension when ⌀ symbol present", () => {
    const r = pdfBlueprintDimensionExtractorEngine.extractDimensions({ text_content: FULL_BLUEPRINT });
    const diameters = r.dimensions.filter((d) => d.type === "diameter");
    expect(diameters.length).toBeGreaterThanOrEqual(1);
  });

  it("extracts at least 1 linear dimension", () => {
    const r = pdfBlueprintDimensionExtractorEngine.extractDimensions({ text_content: FULL_BLUEPRINT });
    const linears = r.dimensions.filter((d) => d.type === "linear");
    expect(linears.length).toBeGreaterThanOrEqual(1);
  });

  it("part_info.part_number = '2475-037'", () => {
    const r = pdfBlueprintDimensionExtractorEngine.extractDimensions({ text_content: FULL_BLUEPRINT });
    expect(r.part_info.part_number).toBe("2475-037");
  });

  it("part_info.material contains '4140'", () => {
    const r = pdfBlueprintDimensionExtractorEngine.extractDimensions({ text_content: FULL_BLUEPRINT });
    expect(r.part_info.material ?? "").toMatch(/4140/);
  });

  it("part_info.revision = 'B'", () => {
    const r = pdfBlueprintDimensionExtractorEngine.extractDimensions({ text_content: FULL_BLUEPRINT });
    expect(r.part_info.revision).toBe("B");
  });

  it("surface_finishes detects exactly Ra=0.8", () => {
    const r = pdfBlueprintDimensionExtractorEngine.extractDimensions({ text_content: FULL_BLUEPRINT });
    expect(r.surface_finishes.length).toBeGreaterThanOrEqual(1);
    expect(r.surface_finishes[0].ra).toBe(0.8);
  });

  it("surface_finishes[0].unit is 'um' (μm in source)", () => {
    const r = pdfBlueprintDimensionExtractorEngine.extractDimensions({ text_content: FULL_BLUEPRINT });
    expect(r.surface_finishes[0].unit).toBe("um");
  });

  it("threads array contains an M10 metric callout", () => {
    const r = pdfBlueprintDimensionExtractorEngine.extractDimensions({ text_content: FULL_BLUEPRINT });
    const m10 = r.threads.find((t) => t.spec.includes("M10"));
    expect(m10?.type).toBe("metric");
  });

  it("gdt_callouts array length ≥1 (one or more ASME Y14.5 symbols)", () => {
    const r = pdfBlueprintDimensionExtractorEngine.extractDimensions({ text_content: FULL_BLUEPRINT });
    expect(r.gdt_callouts.length).toBeGreaterThanOrEqual(1);
  });
});

describe("PDFBlueprintDimensionExtractorEngine.extractDimensions — units", () => {
  it("default drawing_units='mm' → all dimensions report unit='mm'", () => {
    const r = pdfBlueprintDimensionExtractorEngine.extractDimensions({ text_content: FULL_BLUEPRINT, drawing_units: "mm" });
    for (const d of r.dimensions) {
      expect(d.unit).toBe("mm");
    }
  });

  it("drawing_units='inch' → all dimensions report unit='inch'", () => {
    const r = pdfBlueprintDimensionExtractorEngine.extractDimensions({
      text_content: "DIAMETER .500 +.001/-.001\nLENGTH 2.000 ±.005",
      drawing_units: "inch",
    });
    for (const d of r.dimensions) {
      expect(d.unit).toBe("inch");
    }
  });
});

describe("PDFBlueprintDimensionExtractorEngine.validateCompleteness", () => {
  it("full blueprint → has_material=true", () => {
    const r = pdfBlueprintDimensionExtractorEngine.validateCompleteness({ text_content: FULL_BLUEPRINT });
    expect(r.has_material).toBe(true);
  });

  it("full blueprint → has_threads=true (M10x1.5 present)", () => {
    const r = pdfBlueprintDimensionExtractorEngine.validateCompleteness({ text_content: FULL_BLUEPRINT });
    expect(r.has_threads).toBe(true);
  });

  it("full blueprint → completeness_score > 50 (0-100 scale, most fields present)", () => {
    const r = pdfBlueprintDimensionExtractorEngine.validateCompleteness({ text_content: FULL_BLUEPRINT });
    expect(r.completeness_score).toBeGreaterThan(50);
    expect(r.completeness_score).toBeLessThanOrEqual(100);
  });

  it("minimal blueprint → has_material=false; missing_likely contains 'material'", () => {
    const r = pdfBlueprintDimensionExtractorEngine.validateCompleteness({ text_content: MINIMAL_BLUEPRINT });
    expect(r.has_material).toBe(false);
    expect(r.missing_likely.length).toBeGreaterThan(0);
  });

  it("minimal blueprint completeness_score < full blueprint completeness_score", () => {
    const full = pdfBlueprintDimensionExtractorEngine.validateCompleteness({ text_content: FULL_BLUEPRINT });
    const min = pdfBlueprintDimensionExtractorEngine.validateCompleteness({ text_content: MINIMAL_BLUEPRINT });
    expect(min.completeness_score).toBeLessThan(full.completeness_score);
  });

  it("empty text → all has_* flags false and completeness_score = 0", () => {
    const r = pdfBlueprintDimensionExtractorEngine.validateCompleteness({ text_content: "" });
    expect(r.has_material).toBe(false);
    expect(r.has_tolerances).toBe(false);
    expect(r.has_threads).toBe(false);
    expect(r.has_gdt).toBe(false);
    expect(r.completeness_score).toBe(0);
  });
});
