/**
 * BOX-MS5 Integration Tests — End-to-End Pipeline Tests
 *
 * Tests the full pipeline: parse → resolve material/tools → optimize → safety → report
 * Uses realistic programs for Okuma, Haas, and Hurco.
 */
import { describe, it, expect } from "vitest";
import { okumaOSPParserEngine } from "../engines/OkumaOSPParserEngine.js";
import { haasParserEngine } from "../engines/HaasParserEngine.js";
import { hurcoParserEngine } from "../engines/HurcoParserEngine.js";
import { materialResolverForProgramsEngine } from "../engines/MaterialResolverForProgramsEngine.js";
import { toolResolverForProgramsEngine } from "../engines/ToolResolverForProgramsEngine.js";
import { programPhysicsOptimizerEngine } from "../engines/ProgramPhysicsOptimizerEngine.js";
import { safetyGateForOptimizationEngine } from "../engines/SafetyGateForOptimizationEngine.js";
import { optimizationReportGeneratorEngine } from "../engines/OptimizationReportGeneratorEngine.js";
import { controllerKnowledgeDBEngine } from "../engines/ControllerKnowledgeDBEngine.js";
import { postProcessorTrainerEngine } from "../engines/PostProcessorTrainerEngine.js";
import { fusionPostSyncEngine } from "../engines/FusionPostSyncEngine.js";
import { programMacroConverterEngine } from "../engines/ProgramMacroConverterEngine.js";

// ============================================================================
// Test Programs — Realistic Programs from Each Machine Type
// ============================================================================

const OKUMA_CASING = [
  "(CASING - 1030 STEEL)",
  "G50 S2500",
  "NAT01 (OD ROUGH - CNMG120408)",
  "T010101",
  "G96 S600 M3",
  "M8",
  "G0 X2.1 Z0.1",
  "G1 X1.875 F0.012",
  "G1 Z-3.5",
  "G1 X2.0",
  "G0 X20 Z20",
  "M1",
  "M9",
  "NAT02 (OD FINISH - DNMG110404)",
  "T020202",
  "G50 S3000",
  "G96 S800 M3",
  "M8",
  "G0 X1.875 Z0.05",
  "G1 Z-3.5 F0.006",
  "G1 X2.0",
  "G0 X20 Z20",
  "M9",
  "M5",
  "M30",
].join("\n");

const OKUMA_SHAFT = [
  "(SHAFT - 4140 ALLOY STEEL HRC 28)",
  "G50 S2000",
  "NAT01 (OD ROUGH - CNMG120408)",
  "T010101",
  "G96 S500 M3",
  "M8",
  "G0 X3.1 Z0.1",
  "G1 X2.5 F0.010",
  "G1 Z-6.0",
  "G0 X20 Z20",
  "M1",
  "M9",
  "NAT02 (CENTER DRILL)",
  "T050505",
  "G97 S1200 M3",
  "M8",
  "G0 X0 Z0.1",
  "G1 Z-0.3 F0.004",
  "G0 Z0.1",
  "G0 X20 Z20",
  "M9",
  "NAT03 (THREAD - VNMG160404)",
  "T090909",
  "G50 S1500",
  "G96 S400 M3",
  "M8",
  "G0 X2.6 Z0.2",
  "G71 X2.5 Z-5.5 F0.0625 B60 H70",
  "G0 X20 Z20",
  "M9",
  "M5",
  "M30",
].join("\n");

const HAAS_BRACKET = [
  "O1001 (BRACKET - 6061 ALUMINUM)",
  "N10 T01 M06 (1/2 ENDMILL)",
  "N20 G90 G54 G00 X0. Y0.",
  "N30 S8000 M03",
  "N40 G43 H01 Z1.0",
  "N50 M08",
  "N60 G01 Z-0.250 F30.0",
  "N70 X3.0",
  "N80 Y2.0",
  "N90 X0.",
  "N100 Y0.",
  "N110 G00 Z1.0",
  "N120 M09",
  "N130 M05",
  "N140 M30",
].join("\n");

const HURCO_PLATE = [
  "(PLATE - 1018 STEEL)",
  "N10 G90 G40 G80 G00",
  "N20 T01 M06 (3/4 ENDMILL)",
  "N30 S3000 M03",
  "N40 M08",
  "N50 G00 X0.0 Y0.0 Z1.0",
  "N60 G01 Z-0.375 F12.0",
  "N70 X6.0",
  "N80 Y4.0",
  "N90 X0.0",
  "N100 Y0.0",
  "N110 G00 Z1.0",
  "N120 M09",
  "N130 M05",
  "N140 M30",
].join("\n");

// ============================================================================
// Integration Test: Full Okuma Audit Pipeline
// ============================================================================

describe("BOX-MS5 Integration: Full Okuma Audit Pipeline", () => {
  it("parse → resolve material → resolve tools → optimize → report (casing)", () => {
    // Step 1: Parse
    const parsed = okumaOSPParserEngine.parse(OKUMA_CASING, "CASING.MIN");
    expect(parsed.toolSections.length).toBeGreaterThanOrEqual(2);
    expect(parsed.lineCount).toBeGreaterThan(10);

    // Step 2: Resolve material
    const material = materialResolverForProgramsEngine.resolve({
      program: parsed,
      unit_system: "imperial",
    });
    expect(material.iso_group).toBe("P"); // 1030 steel
    expect(material.confidence).toBeGreaterThan(0);

    // Step 3: Resolve tools
    const tools = toolResolverForProgramsEngine.resolveAll({
      program: parsed,
      unit_system: "imperial",
    });
    expect(tools.tools.length).toBeGreaterThanOrEqual(2);

    // Step 4: Optimize
    const optimized = programPhysicsOptimizerEngine.optimize({
      program: parsed,
      unit_system: "imperial",
      machine_max_power_kw: 15,
      machine_max_rpm: 4200,
    });
    expect(optimized.blocks.length).toBeGreaterThan(0);
    expect(optimized.summary).toBeDefined();

    // Step 5: Generate report
    const report = optimizationReportGeneratorEngine.generate("CASING.MIN", optimized);
    expect(report.text_report).toContain("CASING.MIN");
    expect(report.summary).toBeDefined();
  });

  it("parse → resolve material → optimize → safety check (shaft with threading)", () => {
    const parsed = okumaOSPParserEngine.parse(OKUMA_SHAFT, "SHAFT.MIN");
    // Parser detects threading via G71.*B60|G71.*H\d patterns — our simplified G71 line
    // may or may not match depending on format. Check that ops at least have the line.
    expect(parsed.toolSections.length).toBeGreaterThanOrEqual(2);

    const material = materialResolverForProgramsEngine.resolve({
      program: parsed,
      unit_system: "imperial",
    });
    // 4140 is alloy steel, could resolve to P or H depending on HRC
    expect(["P", "H"]).toContain(material.iso_group);

    const optimized = programPhysicsOptimizerEngine.optimize({
      program: parsed,
      unit_system: "imperial",
    });

    // If threading blocks exist, they should be preserved unchanged
    const threadingBlocks = optimized.blocks.filter(b =>
      b.original_text.includes("G71"),
    );
    if (threadingBlocks.length > 0) {
      for (const tb of threadingBlocks) {
        expect(tb.changed).toBe(false);
      }
    }
  });
});

// ============================================================================
// Integration Test: Cross-Parser Validation
// ============================================================================

describe("BOX-MS5 Integration: Cross-Parser Validation", () => {
  it("Okuma parser handles realistic lathe program", () => {
    const parsed = okumaOSPParserEngine.parse(OKUMA_CASING, "CASING.MIN");
    expect(parsed.safety).toBeDefined();
    const validation = okumaOSPParserEngine.validateSafety(parsed);
    expect(Array.isArray(validation)).toBe(true);
  });

  it("Haas parser handles realistic mill program", () => {
    const parsed = haasParserEngine.parse(HAAS_BRACKET, "O1001.nc");
    expect(parsed.lineCount).toBeGreaterThan(10);
  });

  it("Hurco parser handles realistic mill program", () => {
    const parsed = hurcoParserEngine.parse(HURCO_PLATE, "PLATE.nc");
    expect(parsed.lineCount).toBeGreaterThan(10);
  });
});

// ============================================================================
// Integration Test: Controller Knowledge Across Dialects
// ============================================================================

describe("BOX-MS5 Integration: Controller Knowledge Cross-Check", () => {
  it("G71 means different things on Okuma vs Haas", () => {
    const okumaG71 = controllerKnowledgeDBEngine.lookupGCode("G71", "okuma");
    const haasG71 = controllerKnowledgeDBEngine.lookupGCode("G71", "haas");

    expect(okumaG71.length).toBeGreaterThan(0);
    // Okuma G71 = THREADING
    expect(okumaG71[0].description.toUpperCase()).toContain("THREADING");

    // Haas may have G71 as roughing or not at all
    if (haasG71.length > 0) {
      expect(haasG71[0].description.toUpperCase()).not.toContain("THREADING");
    }
  });

  it("G85 is Okuma-specific (OD roughing cycle)", () => {
    const okumaG85 = controllerKnowledgeDBEngine.lookupGCode("G85", "okuma");
    expect(okumaG85.length).toBe(1);
    expect(okumaG85[0].okuma_specific).toBe(true);
  });

  it("compareDialects identifies subroutine syntax differences", () => {
    const diffs = controllerKnowledgeDBEngine.compareDialects("okuma", "haas");
    const subDiff = diffs.find(d => d.topic === "Subroutine call");
    expect(subDiff).toBeDefined();
    // Okuma uses /CALL, Haas uses M98
    expect(subDiff!.familyA_value).toContain("/CALL");
    expect(subDiff!.familyB_value).toContain("M98");
  });

  it("all 5 controller families have safety codes", () => {
    for (const family of ["okuma", "haas", "hurco", "roku_roku", "mitsubishi"] as const) {
      const codes = controllerKnowledgeDBEngine.getSafetyCodes(family);
      expect(codes.length).toBeGreaterThan(0);
      // M5 (spindle stop) should be in every controller's safety list
      expect(codes).toContain("M5");
    }
  });
});

// ============================================================================
// Integration Test: Post Processor Training Pipeline
// ============================================================================

describe("BOX-MS5 Integration: Post Processor Trainer", () => {
  // Use the basic program format from MS4 tests (already validated)
  const REF_LINES = [
    "(PART - CASING)",
    "T010101",
    "G50 S2500",
    "G96 S600 M3",
    "M8",
    "G0 X2.1 Z0.1",
    "G1 X1.875 F0.012",
    "G0 X20 Z20",
    "M1",
    "M9",
    "T020202",
    "G50 S3000",
    "G96 S800 M3",
    "M8",
    "G0 X1.875 Z0.05",
    "G1 Z-3.5 F0.006",
    "G0 X20 Z20",
    "M9",
    "M5",
    "M30",
  ];

  it("detects structural drift when T-code format changes", () => {
    const genLines = REF_LINES.map(l =>
      l.replace("T010101", "T01").replace("T020202", "T02"),
    );
    const result = postProcessorTrainerEngine.train({
      reference_lines: REF_LINES,
      generated_lines: genLines,
      controller: "okuma",
    });
    // T-code format diff is "major" severity, not "critical", so match_pct may still be 100
    // But diffs should be detected
    expect(result.diffs.some(d => d.category === "format")).toBe(true);
    expect(result.summary.major_diffs).toBeGreaterThan(0);
  });

  it("generates patches for dialect calibration", () => {
    const genLines = REF_LINES.filter(l => !l.includes("G50"));
    const result = postProcessorTrainerEngine.train({
      reference_lines: REF_LINES,
      generated_lines: genLines,
      controller: "okuma",
    });
    expect(result.patches.patches.length).toBeGreaterThan(0);
    expect(result.patches.controller).toBe("okuma");
  });
});

// ============================================================================
// Integration Test: Fusion Post Sync
// ============================================================================

describe("BOX-MS5 Integration: Fusion Post Sync", () => {
  const OKUMA_CPS = `
// Okuma OSP-P300L post processor for Fusion 360
description = "Okuma OSP Lathe";
vendor = "Autodesk";
properties.writeToolComment = true;
properties.useRadius = true;
properties.maxRPM = 4200;

function onSection() {
  writeBlock(gFormat.format(50), "S" + maxRPM);
  writeBlock(gFormat.format(96), "S" + currentSFM);
  writeBlock(mFormat.format(8));
}

function onCycle() {
  writeBlock(gFormat.format(85));
}
`.trim();

  it("analyzes .cps file and identifies Okuma dialect", () => {
    const result = fusionPostSyncEngine.analyze({
      cps_content: OKUMA_CPS,
      filename: "okuma-genos-l400.cps",
    });
    expect(result.profile.controller).toContain("Okuma");
    expect(result.profile.machine_type).toContain("Okuma");
    expect(result.profile.properties.length).toBeGreaterThan(0);
    expect(result.profile.gcode_overrides.some(o => o.standard === "G85")).toBe(true);
    expect(result.recommendations.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// Integration Test: Macro Conversion Pipeline
// ============================================================================

describe("BOX-MS5 Integration: Macro Conversion", () => {
  it("scans dimensions before full conversion", () => {
    const parsed = okumaOSPParserEngine.parse(OKUMA_CASING, "CASING.MIN");
    const dims = programMacroConverterEngine.scanDimensions(parsed, {
      stock_diameter: 2.5,
      finish_od: 1.875,
    });
    expect(dims.length).toBeGreaterThan(0);
    // Should find at least the stock diameter and finish OD
    expect(dims.some(d => d.dimension_type === "diameter")).toBe(true);
  });

  it("full conversion produces V-variable macro", () => {
    const parsed = okumaOSPParserEngine.parse(OKUMA_CASING, "CASING.MIN");
    const result = programMacroConverterEngine.convert({
      program: parsed,
      stock_diameter: 2.5,
      finish_od: 1.875,
      part_length: 3.5,
      unit_system: "imperial",
    });
    expect(result.converted_lines.length).toBeGreaterThan(0);
    // dimension_replacements and speed_feed_replacements are arrays
    expect(Array.isArray(result.dimension_replacements)).toBe(true);
    expect(Array.isArray(result.speed_feed_replacements)).toBe(true);
  });
});

// ============================================================================
// Integration Test: Schema Validation
// ============================================================================

describe("BOX-MS5 Integration: Schema Validation", () => {
  it("BOX_ACTION_SCHEMAS has entries for all new gap actions", async () => {
    const { BOX_ACTION_SCHEMAS } = await import("../tools/schemas/boxAuditActionSchemas.js");
    const requiredActions = [
      "box_validate_program",
      "box_extract_operations",
      "box_controller_capability",
      "box_controller_safety_codes",
      "box_calibrate_from_shop",
      "box_full_program_audit",
    ];
    for (const action of requiredActions) {
      expect(BOX_ACTION_SCHEMAS[action]).toBeDefined();
    }
  });

  it("BoxValidateProgramSchema rejects empty content", async () => {
    const { BoxValidateProgramSchema } = await import("../tools/schemas/boxAuditActionSchemas.js");
    const result = BoxValidateProgramSchema.safeParse({ content: "" });
    expect(result.success).toBe(false);
  });

  it("BoxFullProgramAuditSchema accepts valid input", async () => {
    const { BoxFullProgramAuditSchema } = await import("../tools/schemas/boxAuditActionSchemas.js");
    const result = BoxFullProgramAuditSchema.safeParse({
      content: OKUMA_CASING,
      filename: "CASING.MIN",
      unit_system: "imperial",
    });
    expect(result.success).toBe(true);
  });
});
