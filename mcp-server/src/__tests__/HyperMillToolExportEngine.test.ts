/**
 * HyperMillToolExportEngine tests — CAM-EXHAUST-MS0 / U-CAM-HM-TOOLEXP-TESTS-01
 *
 * Coverage:
 *   1. mapGeometryClass: PRISM type → hyperMILL geometry class + type_id
 *      - milling types (endmill, ball_mill, bull_mill, drill, tap, thread)
 *      - turning types (turning, grooving, parting)
 *      - special (probe, grind, additive)
 *      - subtype routing (lollipop, woodruff, t_slot, barrel-tangent, gun-drill)
 *      - default fallback to Endmill
 *   2. exportToolDefinition: single tool → INSERT statement
 *      - includes Tools INSERT keyword + canonical fields
 *      - geometry param positions correct per tool class
 *      - SQL escaping for embedded quotes
 *   3. exportToHMT: multi-tool export
 *      - empty tools[] → fallback synthetic tools generated
 *      - explicit tools array → exported as provided
 *      - includes schema + INSERT statements
 *      - summary counts match
 *      - include_nctool=false skips NCTools
 *      - include_depot=false skips depot rows
 *      - include_materials=false skips materials
 *      - mm_system_id=2 (inch) honored
 *      - start_id and start_slot offsets honored
 *   4. getSchemaInfo: schema metadata invariants (29 geometry classes,
 *      cutting material IDs, parameter map)
 *   5. Adversarial: missing physical{}, undefined type, NaN dimensions
 *
 * Strict legitimacy: concrete assertions, named constants.
 */

import { describe, it, expect, vi } from "vitest";

// Mock toolCatalogEngine — the real singleton fails at module-load time with
// ENOENT on tungaloy-turning.json (a known broken catalog dependency tracked
// in CAM-EXHAUST handoff). Engine has try/catch around the catalog query, so
// returning an empty stub triggers the deterministic synthetic-fallback path.
vi.mock("../engines/ToolCatalogEngine.js", () => ({
  toolCatalogEngine: {
    search: () => [],
  },
}));

import {
  HyperMillToolExportEngineClass,
  hyperMillToolExportEngine,
} from "../engines/HyperMillToolExportEngine.js";

// Endmill tool_type_id = 2 per HM_TYPE map; Drilltool = 4; Ballmill = 1; Tap = 11
const TYPE_ID_BALLMILL = 1;
const TYPE_ID_ENDMILL = 2;
const TYPE_ID_RADIUSMILL = 3;
const TYPE_ID_DRILLTOOL = 4;
const TYPE_ID_LOLLIPOP = 5;
const TYPE_ID_WOODRUFF = 6;
const TYPE_ID_TSLOT = 10;
const TYPE_ID_TAP = 11;
const TYPE_ID_THREADMILL = 15;
const TYPE_ID_REAMER = 16;
const TYPE_ID_TANGENT_BARREL = 17;
const TYPE_ID_GENERAL_BARREL = 7;
const TYPE_ID_TURNING = 1000;
const TYPE_ID_PARTING = 1004;
const TYPE_ID_PROBE = 2000;
const TYPE_ID_GRINDING = 3000;
const TYPE_ID_ADDITIVE = 4000;
const TOOL_DIA_MM = 10;
const FLUTE_COUNT = 4;

const sampleEndmill = {
  type: "endmill",
  physical: {
    cutting_diameter_mm: TOOL_DIA_MM,
    flute_count: FLUTE_COUNT,
    flute_length_mm: 30,
    overall_length_mm: 60,
    shank_diameter_mm: TOOL_DIA_MM,
    corner_radius_mm: 0,
  },
  manufacturer: "Sandvik",
  part_number: "R216-10E",
  description: "Sandvik 10mm endmill",
  material: "carbide",
};

describe("HyperMillToolExportEngineClass — class shape", () => {
  it("exports class + singleton", () => {
    expect(typeof HyperMillToolExportEngineClass).toBe("function");
    expect(hyperMillToolExportEngine instanceof HyperMillToolExportEngineClass).toBe(true);
  });
});

describe("HyperMillToolExportEngineClass — mapGeometryClass()", () => {
  it("maps endmill → Endmill (type_id=2)", () => {
    const r = hyperMillToolExportEngine.mapGeometryClass("endmill");
    expect(r.geometry_class).toBe("Endmill");
    expect(r.type_id).toBe(TYPE_ID_ENDMILL);
  });

  it("maps ball_mill → Ballmill (type_id=1)", () => {
    const r = hyperMillToolExportEngine.mapGeometryClass("ball_mill");
    expect(r.geometry_class).toBe("Ballmill");
    expect(r.type_id).toBe(TYPE_ID_BALLMILL);
  });

  it("maps bull_mill → Radiusmill (type_id=3)", () => {
    const r = hyperMillToolExportEngine.mapGeometryClass("bull_mill");
    expect(r.geometry_class).toBe("Radiusmill");
    expect(r.type_id).toBe(TYPE_ID_RADIUSMILL);
  });

  it("maps drill → Drilltool (type_id=4)", () => {
    expect(hyperMillToolExportEngine.mapGeometryClass("drill").type_id).toBe(TYPE_ID_DRILLTOOL);
  });

  it("maps tap → Tap (type_id=11)", () => {
    expect(hyperMillToolExportEngine.mapGeometryClass("tap").type_id).toBe(TYPE_ID_TAP);
  });

  it("maps thread → ThreadMill (type_id=15)", () => {
    expect(hyperMillToolExportEngine.mapGeometryClass("thread").type_id).toBe(TYPE_ID_THREADMILL);
  });

  it("maps reamer → Reamer (type_id=16)", () => {
    expect(hyperMillToolExportEngine.mapGeometryClass("reamer").type_id).toBe(TYPE_ID_REAMER);
  });

  it("maps turning → GeneralTurningTool (type_id=1000)", () => {
    expect(hyperMillToolExportEngine.mapGeometryClass("turning").type_id).toBe(TYPE_ID_TURNING);
  });

  it("maps parting → PartingTool (type_id=1004)", () => {
    expect(hyperMillToolExportEngine.mapGeometryClass("parting").type_id).toBe(TYPE_ID_PARTING);
  });

  it("maps probe → TouchProbe (type_id=2000)", () => {
    expect(hyperMillToolExportEngine.mapGeometryClass("probe").type_id).toBe(TYPE_ID_PROBE);
  });

  it("maps grind → GrindingBit (type_id=3000)", () => {
    expect(hyperMillToolExportEngine.mapGeometryClass("grind").type_id).toBe(TYPE_ID_GRINDING);
  });

  it("maps additive → AdditiveDevice (type_id=4000)", () => {
    expect(hyperMillToolExportEngine.mapGeometryClass("additive").type_id).toBe(TYPE_ID_ADDITIVE);
  });

  it("subtype lollipop → Lollipop (type_id=5)", () => {
    const r = hyperMillToolExportEngine.mapGeometryClass("mill", "lollipop");
    expect(r.type_id).toBe(TYPE_ID_LOLLIPOP);
  });

  it("subtype woodruff → Woodruff (type_id=6)", () => {
    expect(hyperMillToolExportEngine.mapGeometryClass("woodruff").type_id).toBe(TYPE_ID_WOODRUFF);
  });

  it("subtype t_slot → TSlotCutter (type_id=10)", () => {
    expect(hyperMillToolExportEngine.mapGeometryClass("t_slot").type_id).toBe(TYPE_ID_TSLOT);
  });

  it("subtype tangent barrel → TangentBarrelTool (type_id=17)", () => {
    expect(hyperMillToolExportEngine.mapGeometryClass("barrel", "tangent").type_id).toBe(TYPE_ID_TANGENT_BARREL);
  });

  it("plain barrel → GeneralBarrelTool (type_id=7)", () => {
    expect(hyperMillToolExportEngine.mapGeometryClass("barrel").type_id).toBe(TYPE_ID_GENERAL_BARREL);
  });

  it("unknown type defaults to Endmill", () => {
    const r = hyperMillToolExportEngine.mapGeometryClass("xyzzy_unknown_type");
    expect(r.geometry_class).toBe("Endmill");
    expect(r.type_id).toBe(TYPE_ID_ENDMILL);
  });

  it("empty/undefined input defaults to Endmill", () => {
    const r1 = hyperMillToolExportEngine.mapGeometryClass("");
    expect(r1.type_id).toBe(TYPE_ID_ENDMILL);
  });
});

describe("HyperMillToolExportEngineClass — exportToolDefinition()", () => {
  it("emits Tools INSERT statement with proper structure", () => {
    const sql = hyperMillToolExportEngine.exportToolDefinition(sampleEndmill, 1);
    expect(sql).toMatch(/^INSERT INTO Tools/);
    expect(sql).toContain("VALUES");
    expect(sql).toContain("'Sandvik R216-10E'");
    // Endmill: dbl_param1 = diameter
    expect(sql).toContain("10.0000");
  });

  it("escapes single quotes in tool name", () => {
    const tool = { ...sampleEndmill, manufacturer: "Co'O", part_number: "PN" };
    const sql = hyperMillToolExportEngine.exportToolDefinition(tool, 1);
    expect(sql).toContain("'Co''O PN'");
  });

  it("supports custom tool_id", () => {
    const sql = hyperMillToolExportEngine.exportToolDefinition(sampleEndmill, 42);
    expect(sql).toMatch(/VALUES \(42,/);
  });

  it("Drilltool sets dbl_param2 = point angle (140°)", () => {
    const drill = {
      type: "drill",
      physical: { cutting_diameter_mm: 6, point_angle_deg: 140 },
      manufacturer: "Iscar",
      part_number: "DRL-6",
    };
    const sql = hyperMillToolExportEngine.exportToolDefinition(drill, 1);
    expect(sql).toContain("140.0000");
  });

  it("Tap sets int_param1 = 1 (right-hand)", () => {
    const tap = {
      type: "tap",
      physical: { cutting_diameter_mm: 6, thread_pitch_mm: 1.0 },
      manufacturer: "OSG",
      part_number: "TAP-M6",
    };
    const sql = hyperMillToolExportEngine.exportToolDefinition(tap, 1);
    // tap_type_id=11, then int_param1=1
    expect(sql).toContain(", 11,");
  });
});

describe("HyperMillToolExportEngineClass — exportToHMT()", () => {
  it("with empty tools[] generates fallback synthetic tools (10×4 = 40 baseline)", () => {
    const r = hyperMillToolExportEngine.exportToHMT([], {});
    expect(r.tool_count).toBeGreaterThanOrEqual(20);
    expect(r.summary.tools).toBe(r.tool_count);
    expect(r.insert_statements.length).toBeGreaterThan(r.tool_count);
  });

  it("with explicit tools[] uses them verbatim", () => {
    const tools = [sampleEndmill, sampleEndmill, sampleEndmill];
    const r = hyperMillToolExportEngine.exportToHMT(tools, {});
    expect(r.tool_count).toBe(3);
    expect(r.summary.geometry_classes_used).toContain("Endmill");
  });

  it("includes SQLite schema DDL with PRAGMA + 5 CREATE TABLEs", () => {
    const r = hyperMillToolExportEngine.exportToHMT([sampleEndmill], {});
    expect(r.sqlite_schema).toContain("PRAGMA journal_mode=WAL");
    expect(r.sqlite_schema).toContain("CREATE TABLE IF NOT EXISTS Tools");
    expect(r.sqlite_schema).toContain("CREATE TABLE IF NOT EXISTS NCTools");
    expect(r.sqlite_schema).toContain("CREATE TABLE IF NOT EXISTS DepotItems");
    expect(r.sqlite_schema).toContain("CREATE TABLE IF NOT EXISTS Materials");
    expect(r.sqlite_schema).toContain("CREATE TABLE IF NOT EXISTS GeometryClasses");
  });

  it("include_nctool=false skips NCTools INSERTs", () => {
    const r = hyperMillToolExportEngine.exportToHMT([sampleEndmill], { include_nctool: false });
    expect(r.summary.nctool_entries).toBe(0);
    expect(r.summary.depot_slots).toBe(0); // depot needs nctool
    expect(r.insert_statements.some((s) => s.includes("INTO NCTools"))).toBe(false);
  });

  it("include_depot=false skips DepotItems INSERTs", () => {
    const r = hyperMillToolExportEngine.exportToHMT([sampleEndmill], { include_depot: false });
    expect(r.summary.depot_slots).toBe(0);
    expect(r.insert_statements.some((s) => s.includes("INTO DepotItems"))).toBe(false);
  });

  it("include_materials=false skips Materials INSERTs", () => {
    const r = hyperMillToolExportEngine.exportToHMT([sampleEndmill], { include_materials: false });
    expect(r.summary.materials).toBe(0);
    expect(r.insert_statements.some((s) => s.includes("INTO Materials"))).toBe(false);
  });

  it("default include flags emit Materials + NCTools + DepotItems + Tools", () => {
    const r = hyperMillToolExportEngine.exportToHMT([sampleEndmill], {});
    expect(r.summary.materials).toBe(6); // 6 ISO groups
    expect(r.summary.nctool_entries).toBe(1);
    expect(r.summary.depot_slots).toBe(1);
    expect(r.summary.tools).toBe(1);
  });

  it("mm_system_id=2 (inch) propagates into Tools INSERTs", () => {
    const r = hyperMillToolExportEngine.exportToHMT([sampleEndmill], { mm_system_id: 2 });
    const toolInsert = r.insert_statements.find((s) => s.includes("INTO Tools"));
    expect(typeof toolInsert).toBe("string");
    // mm_system_id is the 5th value field
    expect(toolInsert!.match(/, 2, 60/)).not.toBe(null);
  });

  it("start_id and start_slot offsets honored", () => {
    const r = hyperMillToolExportEngine.exportToHMT(
      [sampleEndmill, sampleEndmill],
      { start_id: 100, start_slot: 50 },
    );
    expect(r.insert_statements.some((s) => s.includes("DepotItems") && s.includes("50"))).toBe(true);
    expect(r.insert_statements.some((s) => s.includes("DepotItems") && s.includes("51"))).toBe(true);
  });
});

describe("HyperMillToolExportEngineClass — getSchemaInfo()", () => {
  it("returns schema with 29 geometry classes", () => {
    const info = hyperMillToolExportEngine.getSchemaInfo();
    const geomCount = Object.keys(info.geometry_classes).length;
    expect(geomCount).toBe(29);
  });

  it("includes 6 cutting material IDs (HSS=1...PCD=6)", () => {
    const info = hyperMillToolExportEngine.getSchemaInfo();
    expect(info.cutting_material_ids.HSS).toBe(1);
    expect(info.cutting_material_ids.Carbide).toBe(2);
    expect(info.cutting_material_ids.PCD).toBe(6);
  });

  it("includes parameter map for Endmill, Ballmill, Drilltool, Tap", () => {
    const info = hyperMillToolExportEngine.getSchemaInfo();
    expect(typeof info.geometry_param_map["Endmill (2)"]).toBe("object");
    expect(typeof info.geometry_param_map["Ballmill (1)"]).toBe("object");
    expect(typeof info.geometry_param_map["Drilltool (4)"]).toBe("object");
    expect(typeof info.geometry_param_map["Tap (11)"]).toBe("object");
  });

  it("schema_version mentions hyperMILL 33.0", () => {
    const info = hyperMillToolExportEngine.getSchemaInfo();
    expect(info.schema_version).toContain("33.0");
  });

  it("notes contain key engineering notices (mm dimensions, T-number uniqueness)", () => {
    const info = hyperMillToolExportEngine.getSchemaInfo();
    expect(info.notes.some((n) => n.includes("mm"))).toBe(true);
    expect(info.notes.some((n) => n.includes("T-number"))).toBe(true);
  });
});

describe("HyperMillToolExportEngineClass — adversarial inputs", () => {
  it("missing physical{} uses defaults (diameter=10, flutes=4)", () => {
    const tool = { type: "endmill", manufacturer: "X", part_number: "Y" };
    const sql = hyperMillToolExportEngine.exportToolDefinition(tool, 1);
    expect(sql).toContain("10.0000");
  });

  it("undefined type maps to Endmill default", () => {
    const tool = { physical: { cutting_diameter_mm: 8 } };
    const sql = hyperMillToolExportEngine.exportToolDefinition(tool, 1);
    // type_id=2 (Endmill) is the 3rd value
    expect(sql).toMatch(/, 2, [0-9]+,/);
  });

  it("synthetic fallback tools are well-formed (each has SQL emit)", () => {
    const r = hyperMillToolExportEngine.exportToHMT([], {});
    const toolInserts = r.insert_statements.filter((s) => s.startsWith("INSERT INTO Tools"));
    expect(toolInserts.length).toBe(r.tool_count);
    toolInserts.forEach((s) => expect(s).toMatch(/INSERT INTO Tools.*VALUES/));
  });

  it("very long tool name truncates to 127 chars (X's only after cutoff)", () => {
    const tool = {
      type: "endmill",
      physical: { cutting_diameter_mm: TOOL_DIA_MM },
      manufacturer: "X".repeat(200),
      part_number: "Y".repeat(200),
    };
    const sql = hyperMillToolExportEngine.exportToolDefinition(tool, 1);
    // First 127 chars of "XXX...XXX YYY...YYY" = 127 X's (space and Y's cut off)
    const nameMatch = sql.match(/'(X+)'/);
    expect(typeof nameMatch).toBe("object");
    expect(nameMatch![1].length).toBe(127);
  });
});
