/**
 * Tests for BlueprintOCREngine + PrintReadingEngine
 * Covers: dimension extraction, GD&T parsing, title block, notes,
 *         setup sheet gen, inspection plan gen, revision comparison, DXF
 */
import { describe, it, expect } from "vitest";
import { blueprintOCREngine } from "../engines/BlueprintOCREngine.js";
import { printReadingEngine } from "../engines/PrintReadingEngine.js";

// ============================================================================
// BlueprintOCREngine — Dimension Extraction
// ============================================================================

describe("BlueprintOCREngine — extractDimensions", () => {
  it("extracts diameter with bilateral tolerance", () => {
    const dims = blueprintOCREngine.extractDimensions("Ø25.00 ±0.02", "mm");
    expect(dims.length).toBeGreaterThanOrEqual(1);
    const d = dims.find(d => d.type === "diameter");
    expect(d).toBeDefined();
    expect(d!.nominal).toBe(25.0);
    expect(d!.tolerance).toEqual({ type: "bilateral", upper: 0.02, lower: -0.02 });
  });

  it("extracts diameter with asymmetric tolerance", () => {
    const dims = blueprintOCREngine.extractDimensions("∅50.0 +0.03/-0.01", "mm");
    const d = dims.find(d => d.type === "diameter");
    expect(d).toBeDefined();
    expect(d!.nominal).toBe(50.0);
    expect(d!.tolerance!.upper).toBe(0.03);
    expect(d!.tolerance!.lower).toBe(-0.01);
  });

  it("extracts radius", () => {
    const dims = blueprintOCREngine.extractDimensions("R5.0", "mm");
    const d = dims.find(d => d.type === "radius");
    expect(d).toBeDefined();
    expect(d!.nominal).toBe(5.0);
  });

  it("extracts thread designations", () => {
    const dims = blueprintOCREngine.extractDimensions("M8x1.25-6H", "mm");
    const d = dims.find(d => d.type === "thread");
    expect(d).toBeDefined();
    expect(d!.raw_text).toContain("M8");
  });

  it("extracts imperial thread", () => {
    const dims = blueprintOCREngine.extractDimensions("1/4-20 UNC-2B", "in");
    const d = dims.find(d => d.type === "thread");
    expect(d).toBeDefined();
    expect(d!.raw_text).toContain("1/4-20 UNC");
  });

  it("extracts angular dimensions", () => {
    const dims = blueprintOCREngine.extractDimensions("45° ±0.5°", "mm");
    const d = dims.find(d => d.type === "angular");
    expect(d).toBeDefined();
    expect(d!.nominal).toBe(45);
    expect(d!.tolerance).toEqual({ type: "bilateral", upper: 0.5, lower: -0.5 });
  });

  it("extracts chamfer dimensions", () => {
    const dims = blueprintOCREngine.extractDimensions("C1.5", "mm");
    const d = dims.find(d => d.type === "chamfer");
    expect(d).toBeDefined();
    expect(d!.nominal).toBe(1.5);
  });

  it("extracts linear dimensions with tolerance", () => {
    const dims = blueprintOCREngine.extractDimensions("100.00 ±0.05", "mm");
    const d = dims.find(d => d.type === "linear");
    expect(d).toBeDefined();
    expect(d!.nominal).toBe(100.0);
    expect(d!.tolerance).toEqual({ type: "bilateral", upper: 0.05, lower: -0.05 });
  });

  it("extracts depth dimensions", () => {
    const dims = blueprintOCREngine.extractDimensions("depth 12.5", "mm");
    const d = dims.find(d => d.type === "depth");
    expect(d).toBeDefined();
    expect(d!.nominal).toBe(12.5);
  });

  it("handles empty text", () => {
    const dims = blueprintOCREngine.extractDimensions("", "mm");
    expect(dims).toEqual([]);
  });

  it("extracts multiple dimensions from a block", () => {
    const text = "Ø12.0 ±0.01\nR3.0\n50.00 ±0.10\nM10x1.5\nC0.5";
    const dims = blueprintOCREngine.extractDimensions(text, "mm");
    expect(dims.length).toBeGreaterThanOrEqual(4);
    const types = dims.map(d => d.type);
    expect(types).toContain("diameter");
    expect(types).toContain("radius");
    expect(types).toContain("thread");
  });
});

// ============================================================================
// BlueprintOCREngine — GD&T Extraction
// ============================================================================

describe("BlueprintOCREngine — extractGDT", () => {
  it("extracts position with MMC and datum refs", () => {
    const gdts = blueprintOCREngine.extractGDT("POSITION 0.25 MMC A B C", "mm");
    expect(gdts.length).toBeGreaterThanOrEqual(1);
    const g = gdts[0];
    expect(g.symbol).toBe("position");
    expect(g.tolerance_value).toBe(0.25);
    expect(g.material_condition).toBe("MMC");
    expect(g.datum_references).toEqual(expect.arrayContaining(["A", "B", "C"]));
  });

  it("extracts flatness", () => {
    const gdts = blueprintOCREngine.extractGDT("FLATNESS 0.05", "mm");
    const g = gdts.find(g => g.symbol === "flatness");
    expect(g).toBeDefined();
    expect(g!.tolerance_value).toBe(0.05);
  });

  it("extracts perpendicularity with datum", () => {
    const gdts = blueprintOCREngine.extractGDT("PERPENDICULARITY 0.02 A", "mm");
    const g = gdts.find(g => g.symbol === "perpendicularity");
    expect(g).toBeDefined();
    expect(g!.tolerance_value).toBe(0.02);
    expect(g!.datum_references).toContain("A");
  });

  it("extracts true position with diameter symbol", () => {
    const gdts = blueprintOCREngine.extractGDT("TRUE POSITION Ø0.10 M A B", "mm");
    const g = gdts.find(g => g.symbol === "position");
    expect(g).toBeDefined();
    expect(g!.tolerance_value).toBe(0.10);
  });

  it("extracts concentricity", () => {
    const gdts = blueprintOCREngine.extractGDT("CONCENTRICITY 0.03 A", "mm");
    const g = gdts.find(g => g.symbol === "concentricity");
    expect(g).toBeDefined();
  });

  it("extracts runout", () => {
    const gdts = blueprintOCREngine.extractGDT("RUNOUT 0.04 A", "mm");
    const g = gdts.find(g => g.symbol === "circular_runout");
    expect(g).toBeDefined();
    expect(g!.tolerance_value).toBe(0.04);
  });

  it("extracts total runout", () => {
    const gdts = blueprintOCREngine.extractGDT("TOTAL RUNOUT 0.08 A", "mm");
    const g = gdts.find(g => g.symbol === "total_runout");
    expect(g).toBeDefined();
  });

  it("handles empty text", () => {
    const gdts = blueprintOCREngine.extractGDT("no gdt here", "mm");
    expect(gdts).toEqual([]);
  });
});

// ============================================================================
// BlueprintOCREngine — Title Block Parsing
// ============================================================================

describe("BlueprintOCREngine — parseTitleBlock", () => {
  const SAMPLE_TITLE_BLOCK = `
    PART NO: ABC-12345-01
    REV: C
    DWG NO: DWG-2024-0042
    TITLE: Spindle Housing Assembly
    MATERIAL: AISI 4140 Steel
    FINISH: Hard Chrome Plate
    SCALE: 1:2
    SHEET 1 OF 3
    DRAWN BY: J. Smith
    CHECKED BY: M. Jones
    APPROVED BY: R. Davis
    DATE: 2024-03-15
    WEIGHT: 4.5 kg
    HEAT TREATMENT: HRC 58-62
    UNLESS OTHERWISE SPECIFIED TOL ±0.1mm
    THIRD ANGLE PROJECTION
    MILLIMETERS
  `;

  it("extracts part number", () => {
    const tb = blueprintOCREngine.parseTitleBlock(SAMPLE_TITLE_BLOCK);
    expect(tb.part_number).toBe("ABC-12345-01");
  });

  it("extracts revision", () => {
    const tb = blueprintOCREngine.parseTitleBlock(SAMPLE_TITLE_BLOCK);
    expect(tb.revision).toBe("C");
  });

  it("extracts drawing number", () => {
    const tb = blueprintOCREngine.parseTitleBlock(SAMPLE_TITLE_BLOCK);
    expect(tb.drawing_number).toBe("DWG-2024-0042");
  });

  it("extracts material", () => {
    const tb = blueprintOCREngine.parseTitleBlock(SAMPLE_TITLE_BLOCK);
    expect(tb.material).toContain("4140");
  });

  it("extracts finish", () => {
    const tb = blueprintOCREngine.parseTitleBlock(SAMPLE_TITLE_BLOCK);
    expect(tb.finish).toContain("Chrome");
  });

  it("detects mm units", () => {
    const tb = blueprintOCREngine.parseTitleBlock(SAMPLE_TITLE_BLOCK);
    expect(tb.units).toBe("mm");
  });

  it("detects third angle projection", () => {
    const tb = blueprintOCREngine.parseTitleBlock(SAMPLE_TITLE_BLOCK);
    expect(tb.third_angle).toBe(true);
  });

  it("extracts weight", () => {
    const tb = blueprintOCREngine.parseTitleBlock(SAMPLE_TITLE_BLOCK);
    expect(tb.weight).toContain("4.5");
  });

  it("extracts heat treatment", () => {
    const tb = blueprintOCREngine.parseTitleBlock(SAMPLE_TITLE_BLOCK);
    expect(tb.treatment).toContain("HRC");
  });

  it("extracts general tolerance", () => {
    const tb = blueprintOCREngine.parseTitleBlock(SAMPLE_TITLE_BLOCK);
    expect(tb.general_tolerance).toBeDefined();
  });

  it("calculates confidence based on fields found", () => {
    const tb = blueprintOCREngine.parseTitleBlock(SAMPLE_TITLE_BLOCK);
    expect(tb.confidence).toBeGreaterThan(0.5);
  });

  it("handles minimal input", () => {
    const tb = blueprintOCREngine.parseTitleBlock("Some random text");
    expect(tb.confidence).toBe(0);
    expect(tb.part_number).toBeUndefined();
  });
});

// ============================================================================
// BlueprintOCREngine — Note Extraction
// ============================================================================

describe("BlueprintOCREngine — extractNotes", () => {
  it("extracts numbered notes", () => {
    const text = "NOTES:\n1. ALL DIMENSIONS IN MILLIMETERS\n2. DEBURR ALL SHARP EDGES\n3. HEAT TREAT TO HRC 58-62";
    const notes = blueprintOCREngine.extractNotes(text);
    expect(notes.length).toBeGreaterThanOrEqual(2);
  });

  it("categorizes process notes", () => {
    const text = "1. MACHINE ALL SURFACES TO Ra 0.8";
    const notes = blueprintOCREngine.extractNotes(text);
    expect(notes.some(n => n.category === "process" || n.category === "finish")).toBe(true);
  });

  it("flags critical safety notes", () => {
    const text = "1. CRITICAL: THIS IS A FLIGHT SAFETY PART - 100% INSPECTION REQUIRED";
    const notes = blueprintOCREngine.extractNotes(text);
    expect(notes.some(n => n.is_critical)).toBe(true);
  });

  it("categorizes material notes", () => {
    const text = "1. MATERIAL: AISI 316 STAINLESS STEEL PER AMS 5648";
    const notes = blueprintOCREngine.extractNotes(text);
    expect(notes.some(n => n.category === "material")).toBe(true);
  });

  it("categorizes tolerance notes", () => {
    const text = "1. UNLESS OTHERWISE SPECIFIED INTERPRET PER ASME Y14.5-2009";
    const notes = blueprintOCREngine.extractNotes(text);
    expect(notes.some(n => n.category === "tolerance")).toBe(true);
  });

  it("categorizes inspection notes", () => {
    const text = "1. FIRST ARTICLE INSPECTION REQUIRED PER AS9102";
    const notes = blueprintOCREngine.extractNotes(text);
    expect(notes.some(n => n.category === "inspection")).toBe(true);
  });
});

// ============================================================================
// BlueprintOCREngine — Full Analysis
// ============================================================================

describe("BlueprintOCREngine — analyzeBlueprint", () => {
  const FULL_PRINT = `
    PART NO: HOUSING-001
    REV: B
    MATERIAL: 6061-T6 Aluminum
    FINISH: Anodize per MIL-A-8625
    MILLIMETERS
    THIRD ANGLE PROJECTION
    UNLESS OTHERWISE SPECIFIED TOL ±0.1

    Ø25.00 ±0.01
    Ø12.50 +0.005/-0.000
    R3.0
    M10x1.5
    45° ±0.5°
    100.00 ±0.05
    C0.5
    depth 15.0

    POSITION 0.05 MMC A B
    FLATNESS 0.02
    PERPENDICULARITY 0.03 A
    CONCENTRICITY 0.01 A

    NOTES:
    1. ALL DIMENSIONS IN MILLIMETERS
    2. DEBURR ALL SHARP EDGES, BREAK CORNERS 0.3 MAX
    3. ANODIZE PER MIL-A-8625 TYPE III CLASS 2
    4. CRITICAL: BORE Ø25 IS PRESS FIT - 100% INSPECT
  `;

  it("returns complete analysis", () => {
    const result = blueprintOCREngine.analyzeBlueprint(FULL_PRINT);
    expect(result.dimensions.length).toBeGreaterThanOrEqual(5);
    expect(result.gdt_frames.length).toBeGreaterThanOrEqual(2);
    expect(result.notes.length).toBeGreaterThanOrEqual(2);
    expect(result.title_block.part_number).toBe("HOUSING-001");
    expect(result.title_block.revision).toBe("B");
  });

  it("calculates summary correctly", () => {
    const result = blueprintOCREngine.analyzeBlueprint(FULL_PRINT);
    expect(result.summary.total_dimensions).toBeGreaterThan(0);
    expect(result.summary.has_gdt).toBe(true);
    expect(result.summary.material).toContain("6061");
    expect(result.summary.tightest_tolerance_mm).toBeGreaterThan(0);
    expect(result.summary.tightest_tolerance_mm).toBeLessThan(1);
  });

  it("identifies critical features", () => {
    const result = blueprintOCREngine.analyzeBlueprint(FULL_PRINT);
    expect(result.summary.critical_features.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// BlueprintOCREngine — Unit Detection
// ============================================================================

describe("BlueprintOCREngine — detectUnit", () => {
  it("detects mm from keyword", () => {
    expect(blueprintOCREngine.detectUnit("ALL DIMENSIONS IN MILLIMETERS")).toBe("mm");
  });

  it("detects inch from keyword", () => {
    expect(blueprintOCREngine.detectUnit("ALL DIMENSIONS IN INCHES")).toBe("in");
  });

  it("detects inch from 4-place decimals", () => {
    expect(blueprintOCREngine.detectUnit("1.2500 2.3750 0.5000")).toBe("in");
  });

  it("defaults to mm", () => {
    expect(blueprintOCREngine.detectUnit("some text")).toBe("mm");
  });
});

// ============================================================================
// PrintReadingEngine — Setup Sheet Generation
// ============================================================================

describe("PrintReadingEngine — generateSetupSheet", () => {
  it("generates setup sheet from analysis", () => {
    const text = `
      PART NO: TEST-001  REV: A  MATERIAL: 4140 Steel  FINISH: Ground
      MILLIMETERS
      Ø25.00 ±0.01
      100.00 ±0.02
      POSITION 0.05 MMC A B
      NOTES:
      1. HEAT TREAT TO HRC 55-60
      2. CRITICAL: FLIGHT SAFETY PART
    `;
    const analysis = blueprintOCREngine.analyzeBlueprint(text);
    const sheet = printReadingEngine.generateSetupSheet(analysis);

    expect(sheet.part_number).toBe("TEST-001");
    expect(sheet.revision).toBe("A");
    expect(sheet.material).toContain("4140");
    expect(sheet.critical_dimensions.length).toBeGreaterThan(0);
    expect(sheet.gdt_requirements.length).toBeGreaterThan(0);
    expect(sheet.safety_notes.length).toBeGreaterThan(0);
  });

  it("selects appropriate inspection methods", () => {
    const text = "MILLIMETERS\nØ10.000 ±0.002\nM6x1.0\n30.0 ±0.5";
    const analysis = blueprintOCREngine.analyzeBlueprint(text);
    const sheet = printReadingEngine.generateSetupSheet(analysis);

    // Tight tolerance should get CMM or bore gauge
    const tightDim = sheet.critical_dimensions.find(d => d.tolerance_band <= 0.005);
    if (tightDim) {
      expect(tightDim.inspection_method).toMatch(/CMM|bore gauge|micrometer/);
    }
  });
});

// ============================================================================
// PrintReadingEngine — Inspection Plan Generation
// ============================================================================

describe("PrintReadingEngine — generateInspectionPlan", () => {
  it("generates inspection plan with features and GD&T", () => {
    const text = `
      PART NO: INSPECT-001  REV: B  MILLIMETERS
      Ø20.00 ±0.01
      50.00 ±0.03
      FLATNESS 0.01
      POSITION 0.05 M A B
    `;
    const analysis = blueprintOCREngine.analyzeBlueprint(text);
    const plan = printReadingEngine.generateInspectionPlan(analysis);

    expect(plan.part_number).toBe("INSPECT-001");
    expect(plan.features.length).toBeGreaterThan(0);
    expect(plan.gdt_checks.length).toBeGreaterThan(0);
    expect(plan.total_features).toBeGreaterThan(0);
    expect(plan.estimated_inspection_time_min).toBeGreaterThan(0);
  });

  it("marks tight tolerances as critical with 100% inspection", () => {
    const text = "MILLIMETERS\nØ10.000 ±0.005";
    const analysis = blueprintOCREngine.analyzeBlueprint(text);
    const plan = printReadingEngine.generateInspectionPlan(analysis);

    const critical = plan.features.filter(f => f.critical);
    expect(critical.length).toBeGreaterThan(0);
    expect(critical[0].frequency).toBe("100%");
  });
});

// ============================================================================
// PrintReadingEngine — Revision Comparison
// ============================================================================

describe("PrintReadingEngine — compareRevisions", () => {
  it("detects added dimensions between revisions", () => {
    const oldText = "REV: A\nMILLIMETERS\nØ25.00 ±0.02";
    const newText = "REV: B\nMILLIMETERS\nØ25.00 ±0.02\nØ12.00 ±0.01";
    const result = printReadingEngine.compareRevisions(oldText, newText);

    expect(result.old_revision).toBe("A");
    expect(result.new_revision).toBe("B");
    expect(result.added_dimensions.length).toBeGreaterThan(0);
  });

  it("detects tolerance changes", () => {
    const oldText = "REV: A\nMILLIMETERS\n50.00 ±0.10";
    const newText = "REV: B\nMILLIMETERS\n50.00 ±0.05";
    const result = printReadingEngine.compareRevisions(oldText, newText);

    expect(result.changed_tolerances.length).toBeGreaterThan(0);
    expect(result.changed_tolerances[0].tightened).toBe(true);
  });

  it("detects no changes for identical prints", () => {
    const text = "REV: A\nMILLIMETERS\nØ25.00 ±0.02";
    const result = printReadingEngine.compareRevisions(text, text);

    expect(result.summary).toContain("No dimensional changes");
  });

  it("generates meaningful summary", () => {
    const oldText = "REV: A\nMILLIMETERS\nØ25.00 ±0.02\nFLATNESS 0.05";
    const newText = "REV: B\nMILLIMETERS\nØ25.00 ±0.01\nFLATNESS 0.02\nPOSITION 0.10 A";
    const result = printReadingEngine.compareRevisions(oldText, newText);

    expect(result.summary).toContain("change");
  });
});

// ============================================================================
// PrintReadingEngine — DXF Dimension Extraction
// ============================================================================

describe("PrintReadingEngine — extractDxfDimensions", () => {
  it("extracts dimensions from DXF text entities", () => {
    const dxfText = `
  0
SECTION
  8
DIMENSIONS
  1
Ø25.00 ±0.02
  1
100.00 ±0.05
  42
50.123
  8
ANNOTATIONS
  1
M10x1.5
    `;
    const result = printReadingEngine.extractDxfDimensions(dxfText, { unit: "mm" });

    expect(result.dimensions.length).toBeGreaterThan(0);
    expect(result.layers_found).toContain("DIMENSIONS");
    expect(result.layers_found).toContain("ANNOTATIONS");
    expect(result.annotation_count).toBeGreaterThan(0);
  });

  it("handles empty DXF", () => {
    const result = printReadingEngine.extractDxfDimensions("", { unit: "mm" });
    expect(result.dimensions).toEqual([]);
    expect(result.dimension_count).toBe(0);
  });
});

// ============================================================================
// PrintReadingEngine — Full Pipeline (analyze)
// ============================================================================

describe("PrintReadingEngine — analyze", () => {
  it("runs full analysis pipeline", () => {
    const result = printReadingEngine.analyze({
      text: "PART NO: PIPE-001\nMILLIMETERS\nØ50.00 ±0.05\nFLATNESS 0.03",
      source: "test.pdf",
    });

    expect(result.dimensions.length).toBeGreaterThan(0);
    expect(result.gdt_frames.length).toBeGreaterThan(0);
    expect(result.title_block.part_number).toBe("PIPE-001");
  });
});
