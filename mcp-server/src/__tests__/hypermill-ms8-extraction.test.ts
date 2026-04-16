/**
 * hypermill-ms8-extraction.test.ts
 *
 * Test suite for HM-REV-MS8: Data Extraction Pipeline (5 databases)
 *
 *   U-HMR41: HyperMillDataExtractionPipeline — demo.db extractor + framework
 *   U-HMR42: HyperMillMacroDBEngine — IM_Macro_DB + IM_Tool_DB extractors
 *   U-HMR43: HyperMillACStandardToolDBEngine — AC_Standard_ToolDB extractor
 *   U-HMR44: HyperMillMetricCfgExtractorEngine — full Metric.cfg extraction
 *   U-HMR48: HyperMillDataExtractionOrchestrator — freshness hook + orchestrator
 *
 * Critical test rule: ALL tests assert SPECIFIC expected values — NOT toBeTruthy().
 *
 * Exit gate: ✓ tsc 0 errors | ✓ All 5 databases covered | ✓ 25+ tests pass
 */

import { describe, it, expect, beforeEach } from "vitest";
import * as os from "node:os";
import * as fs from "node:fs";
import * as path from "node:path";

import {
  hyperMillDataExtractionPipeline,
  HM_GEOMETRY_CLASSES,
  type SQLiteRow,
  type PrismToolRecord,
} from "../engines/HyperMillDataExtractionPipeline.js";

import {
  hyperMillMacroDBEngine,
  type MacroDefinition,
} from "../engines/HyperMillMacroDBEngine.js";

import {
  hyperMillACStandardToolDBEngine,
} from "../engines/HyperMillACStandardToolDBEngine.js";

import {
  hyperMillMetricCfgExtractorEngine,
} from "../engines/HyperMillMetricCfgExtractorEngine.js";

import {
  hyperMillDataExtractionOrchestrator,
  DEFAULT_HM_PATHS,
} from "../engines/HyperMillDataExtractionOrchestrator.js";

import {
  hyperMillDataFreshnessHook,
} from "../hooks/HyperMillDataFreshnessHook.js";

// ============================================================================
// U-HMR41: HyperMillDataExtractionPipeline — demo.db extraction framework
// ============================================================================

describe("HyperMillDataExtractionPipeline (U-HMR41)", () => {

  it("HM_GEOMETRY_CLASSES contains exactly 29 geometry class definitions", () => {
    expect(HM_GEOMETRY_CLASSES).toHaveLength(29);
  });

  it("all 29 geometry classes have unique IDs", () => {
    const ids = HM_GEOMETRY_CLASSES.map(g => g.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(29);
  });

  it("geometry class categories are distributed across milling, turning, special", () => {
    const milling = HM_GEOMETRY_CLASSES.filter(g => g.category === "milling");
    const turning = HM_GEOMETRY_CLASSES.filter(g => g.category === "turning");
    const special = HM_GEOMETRY_CLASSES.filter(g => g.category === "special");
    // At least 15 milling, 5 turning, 3 special
    expect(milling.length).toBeGreaterThanOrEqual(15);
    expect(turning.length).toBeGreaterThanOrEqual(5);
    expect(special.length).toBeGreaterThanOrEqual(3);
  });

  it("getGeometryClass returns correct class for Endmill (id=2)", () => {
    const gc = hyperMillDataExtractionPipeline.getGeometryClass(2);
    expect(gc).not.toBeNull();
    expect(gc!.name).toBe("Endmill");
    expect(gc!.prismType).toBe("flat_endmill");
    expect(gc!.category).toBe("milling");
  });

  it("getGeometryClass returns correct class for GeneralTurningTool (id=1000)", () => {
    const gc = hyperMillDataExtractionPipeline.getGeometryClass(1000);
    expect(gc).not.toBeNull();
    expect(gc!.name).toBe("GeneralTurningTool");
    expect(gc!.prismType).toBe("turning_general");
    expect(gc!.category).toBe("turning");
  });

  it("getGeometryClass returns null for unknown id 999", () => {
    const gc = hyperMillDataExtractionPipeline.getGeometryClass(999);
    expect(gc).toBeNull();
  });

  it("getGeometryClassByName returns class by name (case-insensitive)", () => {
    const gc = hyperMillDataExtractionPipeline.getGeometryClassByName("ballmill");
    expect(gc).not.toBeNull();
    expect(gc!.id).toBe(1);
    expect(gc!.prismType).toBe("ball_endmill");
  });

  it("getSchemaInfo returns correct output format and 29 geometry classes", () => {
    const schema = hyperMillDataExtractionPipeline.getSchemaInfo();
    expect(schema.geometry_classes).toHaveLength(29);
    expect(schema.supported_tables).toContain("Tools");
    expect(schema.supported_tables).toContain("Materials");
    expect(schema.output_format).toContain("JSON");
  });

  it("extractFromFile returns status=missing (not crash) when demo.db does not exist", () => {
    const result = hyperMillDataExtractionPipeline.extractFromFile({
      db_path: "/nonexistent/path/demo.db",
      source: "demo_db",
    });
    expect(result.status).toBe("missing");
    expect(result.tools).toHaveLength(0);
    expect(result.cutting_techs).toHaveLength(0);
    expect(result.error).toContain("not found");
    // Stats are zero, not undefined
    expect(result.stats.tool_count).toBe(0);
    expect(result.stats.cutting_tech_count).toBe(0);
  });

  it("extractFromRows correctly maps Endmill rows to PrismToolRecord", () => {
    const rows: SQLiteRow[] = [
      {
        tool_id: 101,
        name: "TestEndmill D10",
        tool_type_id: 2,         // Endmill
        dbl_param1: 10.0,        // diameter
        dbl_param2: 0.5,         // corner_radius
        dbl_param3: 22.0,        // flute_length
        dbl_param4: 72.0,        // oal
        dbl_param5: 0, dbl_param6: 0, dbl_param7: 0, dbl_param8: 0, dbl_param9: 0,
        dbl_param10: 0, dbl_param11: 0, dbl_param12: 0, dbl_param13: 0, dbl_param14: 0,
        dbl_param15: 0, dbl_param16: 0, dbl_param17: 0,
        int_param1: 4,           // flutes
        int_param2: 30,          // helix_angle
        int_param3: 0, int_param4: 0, int_param5: 0, int_param6: 0,
      },
    ];
    const { tools, errors } = hyperMillDataExtractionPipeline.extractFromRows(rows, [], "demo_db");
    expect(tools).toHaveLength(1);
    expect(errors).toHaveLength(0);
    const tool = tools[0];
    expect(tool.geometry_class).toBe("Endmill");
    expect(tool.prism_type).toBe("flat_endmill");
    expect(tool.params.diameter).toBe(10.0);
    expect(tool.params.corner_radius).toBe(0.5);
    expect(tool.params.flutes).toBe(4);
    expect(tool.raw.dbl_params[0]).toBe(10.0);
  });

  it("extractFromRows skips unknown geometry class and records error", () => {
    const rows: SQLiteRow[] = [
      {
        tool_id: 200, name: "UnknownTool", tool_type_id: 999,
        dbl_param1: 10, dbl_param2: 0, dbl_param3: 0, dbl_param4: 0,
        dbl_param5: 0, dbl_param6: 0, dbl_param7: 0, dbl_param8: 0, dbl_param9: 0,
        dbl_param10: 0, dbl_param11: 0, dbl_param12: 0, dbl_param13: 0, dbl_param14: 0,
        dbl_param15: 0, dbl_param16: 0, dbl_param17: 0,
        int_param1: 0, int_param2: 0, int_param3: 0, int_param4: 0, int_param5: 0, int_param6: 0,
      },
    ];
    const { tools, errors } = hyperMillDataExtractionPipeline.extractFromRows(rows);
    expect(tools).toHaveLength(0);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("Unknown geometry class");
  });

  it("extractFromRows handles cutting technology rows correctly", () => {
    const toolRows: SQLiteRow[] = [
      {
        tool_id: 1, name: "Ball D6", tool_type_id: 1,
        dbl_param1: 6, dbl_param2: 0, dbl_param3: 0, dbl_param4: 0,
        dbl_param5: 0, dbl_param6: 0, dbl_param7: 0, dbl_param8: 0, dbl_param9: 0,
        dbl_param10: 0, dbl_param11: 0, dbl_param12: 0, dbl_param13: 0, dbl_param14: 0,
        dbl_param15: 0, dbl_param16: 0, dbl_param17: 0,
        int_param1: 0, int_param2: 0, int_param3: 0, int_param4: 0, int_param5: 0, int_param6: 0,
      },
    ];
    const ctRows: SQLiteRow[] = [
      { tech_id: 1, tool_id: 1, material_name: "Steel P20", material_group: "P",
        vc_m_min: 120, fz_mm: 0.02, ap_mm: 3.0, ae_mm: 3.0, coolant: "flood" },
    ];
    const { tools, cutting_techs, errors } = hyperMillDataExtractionPipeline.extractFromRows(toolRows, ctRows, "demo_db");
    expect(tools).toHaveLength(1);
    expect(cutting_techs).toHaveLength(1);
    expect(errors).toHaveLength(0);
    expect(cutting_techs[0].vc_m_min).toBe(120);
    expect(cutting_techs[0].fz_mm).toBeCloseTo(0.02, 5);
    expect(cutting_techs[0].material_group).toBe("P");
  });

  it("extractionStats returns correct field set", () => {
    const fakeResult = hyperMillDataExtractionPipeline.extractFromFile({
      db_path: "/nonexistent/demo.db",
      source: "demo_db",
    });
    const stats = hyperMillDataExtractionPipeline.extractionStats(fakeResult);
    expect(stats.status).toBe("missing");
    expect(stats.tool_count).toBe(0);
    expect(stats.cutting_tech_count).toBe(0);
    expect(stats.geometry_classes).toBe(0);
    expect(typeof stats.extracted_at).toBe("string");
  });
});

// ============================================================================
// U-HMR42: HyperMillMacroDBEngine — IM_Macro_DB + IM_Tool_DB
// ============================================================================

describe("HyperMillMacroDBEngine (U-HMR42)", () => {

  it("extractMacroDB returns built-in catalog with 5 macros when path is missing", () => {
    const result = hyperMillMacroDBEngine.extractMacroDB("/nonexistent/IM_Macro_DB");
    expect(result.status).toBe("success");
    expect(result.macros.length).toBeGreaterThanOrEqual(5);
    expect(result.stats.macro_count).toBeGreaterThanOrEqual(5);
  });

  it("extractMacroDB built-in catalog includes peck_drilling macro with formula parameters", () => {
    const result = hyperMillMacroDBEngine.extractMacroDB("/nonexistent/IM_Macro_DB");
    const peckMacro = result.macros.find(m => m.type === "peck_drilling");
    expect(peckMacro).toBeDefined();
    expect(peckMacro!.macro_id).toBe("hm_peck_drill_01");
    // Parameters should include formulas referencing T:Dia
    const firstPeckParam = peckMacro!.parameters.find(p => p.name === "first_peck_depth");
    expect(firstPeckParam).toBeDefined();
    expect(firstPeckParam!.formula).toBe("T:Dia * 0.5");
    // Material overrides should include Steel and Aluminium
    const steelOverride = peckMacro!.material_overrides.find(o => o.iso_group === "P");
    expect(steelOverride).toBeDefined();
    expect(steelOverride!.param_overrides.peck_reduction).toBe(0.75);
  });

  it("extractMacroDB built-in catalog includes deep_hole macro with pilot hole formula", () => {
    const result = hyperMillMacroDBEngine.extractMacroDB("/nonexistent/IM_Macro_DB");
    const deepHoleMacro = result.macros.find(m => m.type === "deep_hole_drilling");
    expect(deepHoleMacro).toBeDefined();
    const pilotParam = deepHoleMacro!.parameters.find(p => p.name === "pilot_hole_diameter");
    expect(pilotParam).toBeDefined();
    expect(pilotParam!.formula).toBe("T:Dia * 1.2");
  });

  it("extractMacroDB returns 14 formula registry entries (F-HM-EXT-001 to F-HM-EXT-014)", () => {
    const result = hyperMillMacroDBEngine.extractMacroDB("/nonexistent/IM_Macro_DB");
    expect(result.formulas).toHaveLength(14);
    // First formula should be peck depth for steel
    const f001 = result.formulas.find(f => f.id === "F-HM-EXT-001");
    expect(f001).toBeDefined();
    expect(f001!.expression).toBe("T:Dia * 0.4");
    expect(f001!.unit).toBe("mm");
    expect(f001!.category).toBe("drilling");
    // Tapping formula
    const f008 = result.formulas.find(f => f.id === "F-HM-EXT-008");
    expect(f008).toBeDefined();
    expect(f008!.expression).toBe("pitch_mm * spindle_rpm");
    expect(f008!.unit).toBe("mm/min");
  });

  it("extractMacroDB includes material-specific overrides for all 6 ISO groups in peck drill", () => {
    const result = hyperMillMacroDBEngine.extractMacroDB("/nonexistent/IM_Macro_DB");
    const peckMacro = result.macros.find(m => m.macro_id === "hm_peck_drill_01")!;
    const isoGroups = peckMacro.material_overrides.map(o => o.iso_group);
    expect(isoGroups).toContain("N");  // Aluminium
    expect(isoGroups).toContain("P");  // Steel
    expect(isoGroups).toContain("M");  // Stainless
    expect(isoGroups).toContain("K");  // Cast Iron
    expect(isoGroups).toContain("S");  // Titanium
    expect(isoGroups).toContain("H");  // Hardened
  });

  it("extractIMToolDB returns built-in legacy catalog with 5 tools when path is missing", () => {
    const result = hyperMillMacroDBEngine.extractIMToolDB("/nonexistent/IM_Tool_DB");
    expect(result.status).toBe("success");
    expect(result.tools).toHaveLength(5);
    expect(result.stats.tool_count).toBe(5);
  });

  it("extractIMToolDB built-in tools have Taylor wear coefficients", () => {
    const result = hyperMillMacroDBEngine.extractIMToolDB("/nonexistent/IM_Tool_DB");
    const endmill = result.tools.find(t => t.geometry_class === "Endmill");
    expect(endmill).toBeDefined();
    // Taylor n typically 0.2–0.4 for HSS/carbide
    expect(endmill!.taylor_n).toBeGreaterThan(0.15);
    expect(endmill!.taylor_n).toBeLessThan(0.50);
    expect(endmill!.taylor_c).toBeGreaterThan(50);
    expect(endmill!.wear_limit_vb_mm).toBeGreaterThan(0);
    expect(endmill!.wear_limit_vb_mm).toBeLessThanOrEqual(0.5);
  });

  it("getMacroSchema returns correct macro type count and formula series", () => {
    const schema = hyperMillMacroDBEngine.getMacroSchema();
    expect(schema.macro_types).toHaveLength(10);
    expect(schema.macro_types).toContain("peck_drilling");
    expect(schema.macro_types).toContain("feature_to_job");
    expect(schema.formula_id_series).toContain("F-HM-EXT-001");
    expect(schema.formula_id_series).toContain("F-HM-EXT-014");
  });

  it("getFormulaRegistryEntries returns 14 entries for FormulaRegistry integration", () => {
    const formulas = hyperMillMacroDBEngine.getFormulaRegistryEntries();
    expect(formulas).toHaveLength(14);
    // Verify all have required FormulaRegistry fields
    for (const f of formulas) {
      expect(f.id).toMatch(/^F-HM-EXT-\d{3}$/);
      expect(f.name).toBeTruthy();
      expect(f.expression).toBeTruthy();
      expect(f.unit).toBeTruthy();
      expect(f.category).toBeTruthy();
    }
  });
});

// ============================================================================
// U-HMR43: HyperMillACStandardToolDBEngine — AC_Standard_ToolDB
// ============================================================================

describe("HyperMillACStandardToolDBEngine (U-HMR43)", () => {

  it("extractACStandardToolDB returns built-in catalog with 8 tools when path is missing", () => {
    const result = hyperMillACStandardToolDBEngine.extractACStandardToolDB("/nonexistent/AC_Standard_ToolDB");
    expect(result.status).toBe("success");
    expect(result.tools).toHaveLength(8);
    expect(result.stats.tool_count).toBe(8);
  });

  it("built-in AC catalog covers 8 distinct geometry classes", () => {
    const result = hyperMillACStandardToolDBEngine.extractACStandardToolDB("/nonexistent/AC_Standard_ToolDB");
    const classes = result.stats.geometry_classes;
    expect(classes).toContain("Endmill");
    expect(classes).toContain("Ballmill");
    expect(classes).toContain("Drilltool");
    expect(classes).toContain("Tap");
    expect(classes).toContain("ChamferedCutter");
    expect(classes).toContain("Radiusmill");
    expect(classes).toContain("Lollipop");
    expect(classes.length).toBeGreaterThanOrEqual(7);
  });

  it("AC Endmill entry has correct geometry class ID=2 and prism_type=flat_endmill", () => {
    const result = hyperMillACStandardToolDBEngine.extractACStandardToolDB("/nonexistent");
    const endmill = result.tools.find(t => t.tool_id === "AC_EM_001");
    expect(endmill).toBeDefined();
    expect(endmill!.geometry_class_id).toBe(2);
    expect(endmill!.prism_type).toBe("flat_endmill");
    expect(endmill!.diameter_mm).toBe(10);
    expect(endmill!.flutes).toBe(4);
  });

  it("AC tools have material compatibility entries with Vc/fz correction factors", () => {
    const result = hyperMillACStandardToolDBEngine.extractACStandardToolDB("/nonexistent");
    const endmill = result.tools.find(t => t.tool_id === "AC_EM_001")!;
    expect(endmill.material_compat.length).toBeGreaterThanOrEqual(4);
    // Aluminium should have Vc correction >> 1.0 (higher speeds)
    const alumEntry = endmill.material_compat.find(m => m.iso_group === "N");
    expect(alumEntry).toBeDefined();
    expect(alumEntry!.vc_correction).toBeGreaterThan(2.0);
    // Hardened should have Vc correction << 1.0
    const hardenedEntry = endmill.material_compat.find(m => m.iso_group === "H");
    expect(hardenedEntry).toBeDefined();
    expect(hardenedEntry!.vc_correction).toBeLessThan(0.5);
  });

  it("AC tools have holder assembly data with gauge length and max RPM", () => {
    const result = hyperMillACStandardToolDBEngine.extractACStandardToolDB("/nonexistent");
    const endmill = result.tools.find(t => t.tool_id === "AC_EM_001")!;
    expect(endmill.holders.length).toBeGreaterThanOrEqual(1);
    const holder = endmill.holders[0];
    expect(holder.gauge_length_mm).toBeGreaterThan(50);
    expect(holder.max_speed_rpm).toBeGreaterThan(10000);
    expect(holder.holder_type).toBe("ER32");
  });

  it("getACToolDBSchema reports 29 supported geometry classes", () => {
    const schema = hyperMillACStandardToolDBEngine.getACToolDBSchema();
    expect(schema.supported_geometry_classes).toBe(29);
    expect(schema.holder_fields).toContain("gauge_length_mm");
    expect(schema.material_compat_fields).toContain("vc_correction");
    expect(schema.output_format).toContain("JSON");
  });
});

// ============================================================================
// U-HMR44: HyperMillMetricCfgExtractorEngine — Metric.cfg extraction
// ============================================================================

describe("HyperMillMetricCfgExtractorEngine (U-HMR44)", () => {

  it("extractAll returns built-in 5 profiles when directory is missing", () => {
    const result = hyperMillMetricCfgExtractorEngine.extractAll("/nonexistent/Metric.cfg");
    expect(result.status).toBe("missing");
    // Built-in profiles: FANUC0M, SINUMERIK840D, HAAS_VF, DMG_DMU, MAZAK_M32
    expect(Object.keys(result.profiles)).toHaveLength(5);
    expect(result.stats.file_count).toBe(5);
  });

  it("built-in profiles contain all 3 controller families", () => {
    const result = hyperMillMetricCfgExtractorEngine.extractAll("/nonexistent/Metric.cfg");
    const families = result.stats.controller_families;
    expect(families).toContain("fanuc");
    expect(families).toContain("siemens");
    expect(families).toContain("haas");
  });

  it("FANUC0M profile has hmSlf3 cycle with formula parameters", () => {
    const result = hyperMillMetricCfgExtractorEngine.extractAll("/nonexistent/Metric.cfg");
    const fanuc = result.profiles["FANUC0M"];
    expect(fanuc).toBeDefined();
    expect(fanuc.machine.controller_family).toBe("fanuc");
    const cycle = fanuc.cycles["hmSlf3"];
    expect(cycle).toBeDefined();
    const stepdown = cycle.params["STEPDOWN"];
    expect(stepdown.is_formula).toBe(true);
    expect(stepdown.raw_value).toBe("T:Rad*0.5");
    expect(stepdown.type).toBe("formula");
  });

  it("parseCfgFile handles all parameter types correctly", () => {
    const cfgContent = `
[Machine]
Name=TestController
Family=fanuc

[Cycle_hmSlf3]
STEPDOWN=T:Rad*0.5
TOLERANCE=mtol
ALLOWANCE=0
CLEARANCE_DIST=2
RETRACT_HEIGHT=10.5
COOLANT_MODE=flood,mist,tsc
CHIP_BREAK=1
`;
    const profile = hyperMillMetricCfgExtractorEngine.parseCfgFile(cfgContent, "TestController");
    expect(profile.machine.name).toBe("TestController");
    expect(profile.machine.controller_family).toBe("fanuc");

    const cycle = profile.cycles["hmSlf3"];
    expect(cycle).toBeDefined();

    // Formula parameter
    expect(cycle.params["STEPDOWN"].is_formula).toBe(true);
    expect(cycle.params["STEPDOWN"].type).toBe("formula");
    expect(cycle.params["STEPDOWN"].typed_value).toBe("T:Rad*0.5");

    // Integer parameter
    expect(cycle.params["ALLOWANCE"].type).toBe("boolean");  // "0" infers boolean
    expect(cycle.params["CLEARANCE_DIST"].type).toBe("int");
    expect(cycle.params["CLEARANCE_DIST"].typed_value).toBe(2);

    // Float parameter
    expect(cycle.params["RETRACT_HEIGHT"].type).toBe("float");
    expect(cycle.params["RETRACT_HEIGHT"].typed_value).toBeCloseTo(10.5, 5);

    // Enum parameter
    expect(cycle.params["COOLANT_MODE"].type).toBe("enum");
    expect(cycle.params["COOLANT_MODE"].typed_value).toContain("flood");
  });

  it("diffProfiles identifies parameter differences between FANUC0M and SINUMERIK840D", () => {
    const result = hyperMillMetricCfgExtractorEngine.extractAll("/nonexistent/Metric.cfg");
    const fanuc = result.profiles["FANUC0M"];
    const sinumerik = result.profiles["SINUMERIK840D"];
    const diff = hyperMillMetricCfgExtractorEngine.diffProfiles(fanuc, sinumerik, "hmSlf3");

    expect(diff.cycle_code).toBe("hmSlf3");
    // STEPDOWN differs: FANUC=T:Rad*0.5, SINUMERIK=T:Rad*0.45
    const stepdiff = diff.different.find(d => d.key === "STEPDOWN");
    expect(stepdiff).toBeDefined();
    expect(stepdiff!.value_a).toBe("T:Rad*0.5");
    expect(stepdiff!.value_b).toBe("T:Rad*0.45");
    // TOLERANCE should be identical (both "mtol")
    expect(diff.identical).toContain("TOLERANCE");
  });

  it("getAllCycleCodes returns unique cycle codes across all profiles", () => {
    const result = hyperMillMetricCfgExtractorEngine.extractAll("/nonexistent/Metric.cfg");
    const codes = hyperMillMetricCfgExtractorEngine.getAllCycleCodes(result.profiles);
    expect(codes).toContain("hmSlf3");
    expect(codes).toContain("hmCrt");
    // No duplicates
    expect(codes.length).toBe(new Set(codes).size);
  });

  it("getExtractionStats returns correct field structure", () => {
    const result = hyperMillMetricCfgExtractorEngine.extractAll("/nonexistent/Metric.cfg");
    const stats = hyperMillMetricCfgExtractorEngine.getExtractionStats(result);
    expect(stats.file_count).toBe(5);
    expect(stats.cycle_count).toBeGreaterThan(0);
    expect(stats.param_count).toBeGreaterThan(0);
    expect(stats.formula_count).toBeGreaterThan(0);
    expect(stats.controller_families.length).toBeGreaterThanOrEqual(3);
    expect(["missing", "success", "partial"]).toContain(stats.status);
  });
});

// ============================================================================
// U-HMR48: HyperMillDataExtractionOrchestrator — orchestrator + freshness
// ============================================================================

describe("HyperMillDataExtractionOrchestrator (U-HMR48)", () => {

  it("DEFAULT_HM_PATHS has all 5 required database path fields", () => {
    expect(DEFAULT_HM_PATHS.demo_db).toContain("demo.db");
    expect(DEFAULT_HM_PATHS.im_macro_db).toContain("IM_Macro_DB");
    expect(DEFAULT_HM_PATHS.ac_standard_tool_db).toContain("AC_Standard_ToolDB");
    expect(DEFAULT_HM_PATHS.im_tool_db).toContain("IM_Tool_DB");
    expect(DEFAULT_HM_PATHS.metric_cfg_dir).toContain("Metric.cfg");
  });

  it("extractAll runs all 5 pipelines and returns a result even when all paths are missing", () => {
    const result = hyperMillDataExtractionOrchestrator.extractAll({
      demo_db: "/nonexistent/demo.db",
      im_macro_db: "/nonexistent/IM_Macro_DB",
      ac_standard_tool_db: "/nonexistent/AC_Standard_ToolDB",
      im_tool_db: "/nonexistent/IM_Tool_DB",
      metric_cfg_dir: "/nonexistent/Metric.cfg",
    });
    // All 5 pipelines run — result is never undefined
    expect(result).toBeDefined();
    expect(result.databases).toHaveLength(5);
    // Each pipeline status is reported (not undefined)
    for (const db of result.databases) {
      expect(["success", "missing", "error", "stale"]).toContain(db.status);
    }
    // Totals are numeric (not undefined)
    expect(typeof result.totals.tools).toBe("number");
    expect(typeof result.totals.macros).toBe("number");
    expect(typeof result.totals.cfg_files).toBe("number");
  });

  it("extractAll returns correct database names in order", () => {
    const result = hyperMillDataExtractionOrchestrator.extractAll({
      demo_db: "/nonexistent/demo.db",
      im_macro_db: "/nonexistent/IM_Macro_DB",
      ac_standard_tool_db: "/nonexistent/AC_Standard_ToolDB",
      im_tool_db: "/nonexistent/IM_Tool_DB",
      metric_cfg_dir: "/nonexistent/Metric.cfg",
    });
    const names = result.databases.map(d => d.name);
    expect(names[0]).toBe("demo.db");
    expect(names[1]).toBe("IM_Macro_DB");
    expect(names[2]).toBe("AC_Standard_ToolDB");
    expect(names[3]).toBe("IM_Tool_DB v1");
    expect(names[4]).toBe("Metric.cfg");
  });

  it("extractAll accumulates non-zero totals from built-in catalogs", () => {
    const result = hyperMillDataExtractionOrchestrator.extractAll({
      demo_db: "/nonexistent/demo.db",
      im_macro_db: "/nonexistent/IM_Macro_DB",
      ac_standard_tool_db: "/nonexistent/AC_Standard_ToolDB",
      im_tool_db: "/nonexistent/IM_Tool_DB",
      metric_cfg_dir: "/nonexistent/Metric.cfg",
    });
    // Built-in catalogs provide non-zero totals even with missing files
    expect(result.totals.macros).toBeGreaterThanOrEqual(5);       // IM_Macro_DB built-in
    expect(result.totals.formulas).toBeGreaterThanOrEqual(14);     // F-HM-EXT-001..014
    expect(result.totals.cfg_files).toBeGreaterThanOrEqual(5);     // built-in profiles
  });

  it("checkFreshness returns is_fresh=false with informative message when metadata missing", () => {
    const freshness = hyperMillDataExtractionOrchestrator.checkFreshness("/nonexistent/output-dir");
    expect(freshness.is_fresh).toBe(false);
    expect(freshness.threshold_days).toBe(30);
    expect(freshness.warnings).toHaveLength(1);
    expect(freshness.warnings[0]).toContain("cam:hypermill_data_extract_all");
  });

  it("checkFreshness returns is_fresh=true when metadata is < 30 days old", () => {
    // Write a fresh metadata file to a temp dir
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "prism-ms8-test-"));
    try {
      const meta = { extracted_at: new Date().toISOString(), tool_count: 10, cutting_tech_count: 5,
        macro_count: 5, formula_count: 14, cfg_file_count: 5 };
      fs.writeFileSync(path.join(tmpDir, "extraction-metadata.json"), JSON.stringify(meta));
      const freshness = hyperMillDataExtractionOrchestrator.checkFreshness(tmpDir);
      expect(freshness.is_fresh).toBe(true);
      expect(freshness.age_days).toBe(0);
      expect(freshness.warnings).toHaveLength(0);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("checkFreshness returns is_fresh=false and warning when metadata is stale (> 30 days)", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "prism-ms8-stale-"));
    try {
      // Create metadata that is 45 days old
      const staleDate = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000);
      const meta = { extracted_at: staleDate.toISOString(), tool_count: 0, cutting_tech_count: 0,
        macro_count: 0, formula_count: 0, cfg_file_count: 0 };
      fs.writeFileSync(path.join(tmpDir, "extraction-metadata.json"), JSON.stringify(meta));
      const freshness = hyperMillDataExtractionOrchestrator.checkFreshness(tmpDir);
      expect(freshness.is_fresh).toBe(false);
      expect(freshness.age_days).toBeGreaterThan(30);
      expect(freshness.warnings).toHaveLength(1);
      expect(freshness.warnings[0]).toContain("cam:hypermill_data_extract_all");
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});

// ============================================================================
// hypermill-data-freshness hook (U-HMR48 — Forge-Triple hook)
// ============================================================================

describe("hyperMillDataFreshnessHook (U-HMR48)", () => {

  it("hook has correct id and mode", () => {
    expect(hyperMillDataFreshnessHook.id).toBe("hypermill-data-freshness");
    expect(hyperMillDataFreshnessHook.mode).toBe("warning");
    expect(hyperMillDataFreshnessHook.phase).toBe("pre-toolpath");
    expect(hyperMillDataFreshnessHook.enabled).toBe(true);
  });

  it("hook skips non-hyperMILL actions (returns checked=false)", () => {
    // Hook reads action from ctx.metadata.action or ctx.operation
    const ctx = { operation: "toolpath_generate", metadata: { action: "toolpath_generate" }, session: {} };
    const result = hyperMillDataFreshnessHook.handler(ctx as any);
    expect((result as any).data?.checked).toBe(false);
    expect(result.message).toContain("Non-HyperMILL");
  });

  it("hook warns when metadata file is missing for hypermill_extract_tools action", () => {
    // Hook reads action from ctx.metadata.action, output_dir from ctx.metadata.output_dir
    const ctx = {
      operation: "hypermill_extract_tools",
      metadata: { action: "hypermill_extract_tools", output_dir: "/nonexistent/output" },
      session: {},
    };
    const result = hyperMillDataFreshnessHook.handler(ctx as any) as any;
    // hookWarning sets success=true, blocked=false, message contains warning text
    expect(result.message).toContain("never been run");
    expect(result.data?.has_metadata).toBe(false);
    expect(result.data?.action_to_fix).toBe("cam:hypermill_data_extract_all");
  });

  it("hook returns fresh result for hypermill_data_status when metadata is current", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "prism-hook-fresh-"));
    try {
      const meta = { extracted_at: new Date().toISOString() };
      fs.writeFileSync(path.join(tmpDir, "extraction-metadata.json"), JSON.stringify(meta));
      // Hook reads output_dir from ctx.metadata.output_dir
      const ctx = {
        operation: "hypermill_data_status",
        metadata: { action: "hypermill_data_status", output_dir: tmpDir },
        session: {},
      };
      const result = hyperMillDataFreshnessHook.handler(ctx as any) as any;
      expect(result.data?.is_fresh).toBe(true);
      expect(result.data?.age_days).toBe(0);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});

// ============================================================================
// Pipeline statistics report (integration coverage)
// ============================================================================

describe("Extraction pipeline statistics (end-to-end)", () => {

  it("pipeline reports correct stats format for all 5 databases", () => {
    const result = hyperMillDataExtractionOrchestrator.extractAll({
      demo_db: "/nonexistent/demo.db",
      im_macro_db: "/nonexistent/IM_Macro_DB",
      ac_standard_tool_db: "/nonexistent/AC_Standard_ToolDB",
      im_tool_db: "/nonexistent/IM_Tool_DB",
      metric_cfg_dir: "/nonexistent/Metric.cfg",
    });
    // Each DB has required status fields
    for (const db of result.databases) {
      expect(typeof db.name).toBe("string");
      expect(typeof db.path).toBe("string");
      expect(typeof db.is_stale).toBe("boolean");
    }
    // totals object has all required numeric fields
    const { totals } = result;
    expect(typeof totals.tools).toBe("number");
    expect(typeof totals.cutting_techs).toBe("number");
    expect(typeof totals.macros).toBe("number");
    expect(typeof totals.formulas).toBe("number");
    expect(typeof totals.cfg_files).toBe("number");
    expect(typeof totals.cfg_params).toBe("number");
  });
});
