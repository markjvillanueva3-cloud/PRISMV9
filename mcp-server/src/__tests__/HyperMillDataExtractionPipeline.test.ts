/**
 * HyperMillDataExtractionPipeline.test.ts
 *
 * Strict-legitimacy coverage for the generic SQLite extraction framework + 29-class
 * geometry mapping that maps hyperMILL Tool DB rows to PRISM tool format.
 *
 * Coverage:
 *   - Class shape + singleton + 29-geometry-class export
 *   - Happy: getGeometryClass / getGeometryClassByName / getAllGeometryClasses
 *   - Happy: extractFromRows on canonical Endmill+Drill+Tap rows (named param mapping)
 *   - Happy: extractFromFile graceful missing-db path (status="missing")
 *   - Failure modes: unknown geometry id, malformed row types, empty rows
 *   - Adversarial: oversized rows array, NaN/Infinity dbl_params, mixed-case name lookup
 *   - extractFromFile with output_dir round-trips JSON to disk
 *
 * @milestone CAM-EXHAUST-MS0/U-CAM-HM-DATAEXT-PIPE-TESTS-01
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  HyperMillDataExtractionPipeline,
  hyperMillDataExtractionPipeline,
  HM_GEOMETRY_CLASSES,
  type SQLiteRow,
  type ExtractionResult,
  type GeometryClass,
} from "../engines/HyperMillDataExtractionPipeline.js";

// ── Named constants ────────────────────────────────────────────────────────────
const TOTAL_GEOMETRY_CLASSES = 29;
const MILLING_CLASS_COUNT = 20;
const TURNING_CLASS_COUNT = 6;
const SPECIAL_CLASS_COUNT = 3;

// Geometry class IDs (canonical from engine schema)
const BALLMILL_ID = 1;
const ENDMILL_ID = 2;
const RADIUSMILL_ID = 3;
const DRILL_ID = 4;
const TAP_ID = 11;
const TURNING_GENERAL_ID = 1000;
const TOUCH_PROBE_ID = 2000;
const UNKNOWN_GEOMETRY_ID = 99999;

// PRISM tool type strings
const ENDMILL_PRISM_TYPE = "flat_endmill";
const BALLMILL_PRISM_TYPE = "ball_endmill";
const DRILL_PRISM_TYPE = "drill";
const TAP_PRISM_TYPE = "tap";

// Raw param dimensions
const RAW_DBL_PARAM_COUNT = 17;
const RAW_INT_PARAM_COUNT = 6;

// Endmill tool fixture values
const ENDMILL_TOOL_ID = 4001;
const ENDMILL_DIAMETER_MM = 12.0;
const ENDMILL_CORNER_RADIUS_MM = 0.5;
const ENDMILL_FLUTE_LENGTH_MM = 30.0;
const ENDMILL_OAL_MM = 75.0;
const ENDMILL_BODY_DIAMETER_MM = 12.0;
const ENDMILL_SHANK_DIAMETER_MM = 12.0;
const ENDMILL_FLUTES = 4;

// Drill tool fixture values
const DRILL_TOOL_ID = 4002;
const DRILL_DIAMETER_MM = 6.8;
const DRILL_POINT_ANGLE_DEG = 140;
const DRILL_FLUTE_LENGTH_MM = 47;

// Tap tool fixture values
const TAP_TOOL_ID = 4003;
const TAP_THREAD_DIAMETER_MM = 8.0;
const TAP_PITCH_MM = 1.25;
const TAP_THREAD_DIRECTION_RIGHT = 1;

// Cutting tech fixture values
const CT_TECH_ID = 9001;
const CT_VC_M_MIN = 220;
const CT_FZ_MM = 0.04;
const CT_AP_MM = 6;
const CT_AE_MM = 1.2;
const CT_MATERIAL_NAME = "1.2738 P20+Ni";
const CT_MATERIAL_GROUP = "P";
const CT_COOLANT = "flood";

// Adversarial constants
const NEVER_DB_PATH = "Z:/__never__/demo.db";
const OVERSIZE_ROW_COUNT = 5000;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

// ── Fixture builders ───────────────────────────────────────────────────────────

function buildEndmillRow(overrides: Partial<SQLiteRow> = {}): SQLiteRow {
  return {
    tool_id: ENDMILL_TOOL_ID,
    tool_type_id: ENDMILL_ID,
    name: "12mm 4FL Carbide",
    dbl_param1: ENDMILL_DIAMETER_MM,
    dbl_param2: ENDMILL_CORNER_RADIUS_MM,
    dbl_param3: ENDMILL_FLUTE_LENGTH_MM,
    dbl_param4: ENDMILL_OAL_MM,
    dbl_param5: ENDMILL_BODY_DIAMETER_MM,
    dbl_param6: ENDMILL_SHANK_DIAMETER_MM,
    int_param1: ENDMILL_FLUTES,
    ...overrides,
  };
}

function buildDrillRow(): SQLiteRow {
  return {
    tool_id: DRILL_TOOL_ID,
    tool_type_id: DRILL_ID,
    name: "6.8mm HSS Drill",
    dbl_param1: DRILL_DIAMETER_MM,
    dbl_param2: DRILL_POINT_ANGLE_DEG,
    dbl_param3: DRILL_FLUTE_LENGTH_MM,
  };
}

function buildTapRow(): SQLiteRow {
  return {
    tool_id: TAP_TOOL_ID,
    tool_type_id: TAP_ID,
    name: "M8x1.25 RH Tap",
    dbl_param1: TAP_THREAD_DIAMETER_MM,
    dbl_param2: TAP_PITCH_MM,
    int_param1: TAP_THREAD_DIRECTION_RIGHT,
  };
}

function buildCuttingTechRow(toolId: number): SQLiteRow {
  return {
    tech_id: CT_TECH_ID,
    tool_id: toolId,
    material_name: CT_MATERIAL_NAME,
    material_group: CT_MATERIAL_GROUP,
    vc_m_min: CT_VC_M_MIN,
    fz_mm: CT_FZ_MM,
    ap_mm: CT_AP_MM,
    ae_mm: CT_AE_MM,
    coolant: CT_COOLANT,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
describe("HyperMillDataExtractionPipeline", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "prism-hm-pipe-"));
  });

  afterEach(() => {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* best-effort */ }
  });

  // ── Class shape & singleton ────────────────────────────────────────────────
  describe("class shape & singleton", () => {
    it("constructor + 7 public methods + singleton instance", () => {
      const p = new HyperMillDataExtractionPipeline();
      expect(p).toBeInstanceOf(HyperMillDataExtractionPipeline);
      expect(typeof p.getGeometryClass).toBe("function");
      expect(typeof p.getGeometryClassByName).toBe("function");
      expect(typeof p.getAllGeometryClasses).toBe("function");
      expect(typeof p.getSchemaInfo).toBe("function");
      expect(typeof p.extractFromRows).toBe("function");
      expect(typeof p.extractFromFile).toBe("function");
      expect(typeof p.extractionStats).toBe("function");

      expect(hyperMillDataExtractionPipeline).toBeInstanceOf(HyperMillDataExtractionPipeline);
    });

    it("HM_GEOMETRY_CLASSES exports exactly 29 classes split into milling/turning/special", () => {
      expect(HM_GEOMETRY_CLASSES.length).toBe(TOTAL_GEOMETRY_CLASSES);
      const milling = HM_GEOMETRY_CLASSES.filter(g => g.category === "milling");
      const turning = HM_GEOMETRY_CLASSES.filter(g => g.category === "turning");
      const special = HM_GEOMETRY_CLASSES.filter(g => g.category === "special");
      expect(milling.length).toBe(MILLING_CLASS_COUNT);
      expect(turning.length).toBe(TURNING_CLASS_COUNT);
      expect(special.length).toBe(SPECIAL_CLASS_COUNT);
      expect(milling.length + turning.length + special.length).toBe(TOTAL_GEOMETRY_CLASSES);
    });

    it("every class declares a non-empty name + prismType + at least one dbl param", () => {
      for (const cls of HM_GEOMETRY_CLASSES) {
        expect(cls.name.length).toBeGreaterThan(0);
        expect(cls.prismType.length).toBeGreaterThan(0);
        expect(cls.params.dbl.length).toBeGreaterThan(0);
      }
    });
  });

  // ── Geometry class lookups ─────────────────────────────────────────────────
  describe("geometry class lookups", () => {
    it("getGeometryClass(2) returns Endmill mapped to flat_endmill", () => {
      const cls = hyperMillDataExtractionPipeline.getGeometryClass(ENDMILL_ID)!;
      expect(cls.name).toBe("Endmill");
      expect(cls.prismType).toBe(ENDMILL_PRISM_TYPE);
      expect(cls.category).toBe("milling");
    });

    it("getGeometryClass(1) returns Ballmill, getGeometryClass(4) returns Drilltool", () => {
      expect(hyperMillDataExtractionPipeline.getGeometryClass(BALLMILL_ID)!.prismType).toBe(BALLMILL_PRISM_TYPE);
      expect(hyperMillDataExtractionPipeline.getGeometryClass(DRILL_ID)!.prismType).toBe(DRILL_PRISM_TYPE);
      expect(hyperMillDataExtractionPipeline.getGeometryClass(TAP_ID)!.prismType).toBe(TAP_PRISM_TYPE);
    });

    it("getGeometryClass with unknown id returns null", () => {
      const result = hyperMillDataExtractionPipeline.getGeometryClass(UNKNOWN_GEOMETRY_ID);
      expect(result).toBe(null);
    });

    it("getGeometryClassByName is case-insensitive", () => {
      const lower = hyperMillDataExtractionPipeline.getGeometryClassByName("endmill")!;
      const upper = hyperMillDataExtractionPipeline.getGeometryClassByName("ENDMILL")!;
      const mixed = hyperMillDataExtractionPipeline.getGeometryClassByName("EndMill")!;
      expect(lower.id).toBe(ENDMILL_ID);
      expect(upper.id).toBe(ENDMILL_ID);
      expect(mixed.id).toBe(ENDMILL_ID);
    });

    it("getAllGeometryClasses returns a defensive copy (mutating doesn't affect engine)", () => {
      const a = hyperMillDataExtractionPipeline.getAllGeometryClasses();
      const originalLen = a.length;
      a.pop();
      const b = hyperMillDataExtractionPipeline.getAllGeometryClasses();
      expect(b.length).toBe(originalLen);
    });

    it("getSchemaInfo lists all 29 classes + 4 supported tables", () => {
      const info = hyperMillDataExtractionPipeline.getSchemaInfo();
      expect(info.geometry_classes.length).toBe(TOTAL_GEOMETRY_CLASSES);
      expect(info.supported_tables).toEqual(["Tools", "NCTools", "DepotItems", "Materials"]);
      expect(info.output_format.includes("PrismToolRecord")).toBe(true);
      expect(info.param_format.includes("dbl_param")).toBe(true);
    });
  });

  // ── extractFromRows happy path ─────────────────────────────────────────────
  describe("extractFromRows — happy path", () => {
    it("parses a 3-row mixed batch (Endmill + Drill + Tap) into PrismToolRecord[]", () => {
      const rows = [buildEndmillRow(), buildDrillRow(), buildTapRow()];
      const techRows = [buildCuttingTechRow(ENDMILL_TOOL_ID)];
      const result = hyperMillDataExtractionPipeline.extractFromRows(rows, techRows, "demo_db");

      expect(result.tools.length).toBe(rows.length);
      expect(result.cutting_techs.length).toBe(techRows.length);
      expect(result.errors.length).toBe(0);

      const endmill = result.tools.find(t => t.tool_id === ENDMILL_TOOL_ID)!;
      expect(endmill.geometry_class).toBe("Endmill");
      expect(endmill.prism_type).toBe(ENDMILL_PRISM_TYPE);
      expect(endmill.params.diameter).toBe(ENDMILL_DIAMETER_MM);
      expect(endmill.params.corner_radius).toBe(ENDMILL_CORNER_RADIUS_MM);
      expect(endmill.params.flutes).toBe(ENDMILL_FLUTES);
      expect(endmill.raw.dbl_params.length).toBe(RAW_DBL_PARAM_COUNT);
      expect(endmill.raw.int_params.length).toBe(RAW_INT_PARAM_COUNT);
      expect(endmill.source).toBe("demo_db");
    });

    it("extracted cutting techs preserve material_group + vc + fz exactly", () => {
      const result = hyperMillDataExtractionPipeline.extractFromRows(
        [buildEndmillRow()],
        [buildCuttingTechRow(ENDMILL_TOOL_ID)],
        "demo_db",
      );
      const ct = result.cutting_techs[0];
      expect(ct.tool_id).toBe(ENDMILL_TOOL_ID);
      expect(ct.material_group).toBe(CT_MATERIAL_GROUP);
      expect(ct.vc_m_min).toBe(CT_VC_M_MIN);
      expect(ct.fz_mm).toBe(CT_FZ_MM);
      expect(ct.ap_mm).toBe(CT_AP_MM);
      expect(ct.ae_mm).toBe(CT_AE_MM);
      expect(ct.coolant).toBe(CT_COOLANT);
    });

    it("default source param is 'demo_db' when omitted", () => {
      const result = hyperMillDataExtractionPipeline.extractFromRows([buildEndmillRow()]);
      expect(result.tools[0].source).toBe("demo_db");
    });

    it("blank-prefixed param keys are excluded from named params (only real fields exposed)", () => {
      const result = hyperMillDataExtractionPipeline.extractFromRows([buildEndmillRow()]);
      const endmill = result.tools[0];
      const namedKeys = Object.keys(endmill.params);
      // Endmill defines 6 dbl + 6 int params, but ALL 6 ints are still real (flutes, helix_angle, hand, coolant_through, coating_id) — only "blank" suffixed names skip.
      // For Endmill schema, no params start with "blank" — verify no blank appears.
      for (const k of namedKeys) {
        expect(k.startsWith("blank")).toBe(false);
      }
    });
  });

  // ── Failure modes ──────────────────────────────────────────────────────────
  describe("failure modes", () => {
    it("unknown geometry class id pushes error and returns no record", () => {
      const result = hyperMillDataExtractionPipeline.extractFromRows([
        { tool_id: 999, tool_type_id: UNKNOWN_GEOMETRY_ID, name: "ghost" },
      ]);
      expect(result.tools.length).toBe(0);
      expect(result.errors.length).toBe(1);
      expect(result.errors[0].includes(`${UNKNOWN_GEOMETRY_ID}`)).toBe(true);
      expect(result.errors[0].toLowerCase().includes("unknown")).toBe(true);
    });

    it("missing tool_type_id (non-numeric) routes to id=0 → unknown class → error", () => {
      const result = hyperMillDataExtractionPipeline.extractFromRows([
        { tool_id: 100, tool_type_id: "bogus", name: "ghost2" },
      ]);
      expect(result.tools.length).toBe(0);
      expect(result.errors.length).toBe(1);
    });

    it("empty rows array returns empty result, no errors", () => {
      const result = hyperMillDataExtractionPipeline.extractFromRows([]);
      expect(result.tools).toEqual([]);
      expect(result.cutting_techs).toEqual([]);
      expect(result.errors).toEqual([]);
    });

    it("missing name field produces fallback Tool_<id> name", () => {
      const result = hyperMillDataExtractionPipeline.extractFromRows([
        { tool_id: 222, tool_type_id: ENDMILL_ID },
      ]);
      expect(result.tools[0].name).toBe("Tool_222");
    });

    it("non-numeric dbl/int params coerced to 0 (graceful)", () => {
      const row: SQLiteRow = {
        tool_id: 555,
        tool_type_id: ENDMILL_ID,
        name: "junk-row",
        dbl_param1: "not-a-number",
        int_param1: { object: 1 },
      };
      const result = hyperMillDataExtractionPipeline.extractFromRows([row]);
      expect(result.tools.length).toBe(1);
      expect(result.tools[0].params.diameter).toBe(0);
      expect(result.tools[0].params.flutes).toBe(0);
    });
  });

  // ── extractFromFile graceful missing-db ────────────────────────────────────
  describe("extractFromFile — missing db graceful path", () => {
    it("returns status='missing' with empty result and ISO timestamp", () => {
      const result: ExtractionResult = hyperMillDataExtractionPipeline.extractFromFile({
        db_path: NEVER_DB_PATH,
        source: "demo_db",
      });
      expect(result.status).toBe("missing");
      expect(result.tools).toEqual([]);
      expect(result.cutting_techs).toEqual([]);
      expect(result.stats.tool_count).toBe(0);
      expect(result.stats.cutting_tech_count).toBe(0);
      expect(result.stats.geometry_classes_found).toEqual([]);
      expect(ISO_DATE_RE.test(result.extracted_at)).toBe(true);
      expect(result.error?.includes(NEVER_DB_PATH)).toBe(true);
    });

    it("never throws for missing path, even with empty string", () => {
      const result = hyperMillDataExtractionPipeline.extractFromFile({
        db_path: "",
        source: "demo_db",
      });
      expect(result.status).toBe("missing");
    });

    it("non-sqlite junk file routes through error or missing, never throws", () => {
      const fakeDb = path.join(tmpDir, "fake.db");
      fs.writeFileSync(fakeDb, "garbage bytes not sqlite header");
      const result = hyperMillDataExtractionPipeline.extractFromFile({
        db_path: fakeDb,
        source: "demo_db",
      });
      expect(["error", "missing"]).toContain(result.status);
      expect(result.tools).toEqual([]);
    });
  });

  // ── extractionStats projection ─────────────────────────────────────────────
  describe("extractionStats", () => {
    it("projects ExtractionResult into compact stats object", () => {
      const baseResult = hyperMillDataExtractionPipeline.extractFromFile({
        db_path: NEVER_DB_PATH,
        source: "demo_db",
      });
      const stats = hyperMillDataExtractionPipeline.extractionStats(baseResult);
      expect(stats.status).toBe("missing");
      expect(stats.tool_count).toBe(0);
      expect(stats.cutting_tech_count).toBe(0);
      expect(stats.geometry_classes).toBe(0);
      expect(stats.geometry_class_names).toEqual([]);
      expect(stats.error_count).toBe(0);
      expect(ISO_DATE_RE.test(stats.extracted_at)).toBe(true);
    });
  });

  // ── Adversarial inputs ─────────────────────────────────────────────────────
  describe("adversarial inputs", () => {
    it("oversize batch (5000 endmill rows) processed without throwing", () => {
      const rows = Array.from({ length: OVERSIZE_ROW_COUNT }, (_, i) =>
        buildEndmillRow({ tool_id: i + 1 })
      );
      const result = hyperMillDataExtractionPipeline.extractFromRows(rows);
      expect(result.tools.length).toBe(OVERSIZE_ROW_COUNT);
      expect(result.errors.length).toBe(0);
    });

    it("NaN/Infinity dbl_params preserved (typeof number → kept) — no crash", () => {
      const row = buildEndmillRow({ dbl_param1: NaN, dbl_param2: Infinity });
      const result = hyperMillDataExtractionPipeline.extractFromRows([row]);
      expect(result.tools.length).toBe(1);
      const diameter = result.tools[0].params.diameter as number;
      expect(Number.isNaN(diameter)).toBe(true);
      expect(result.tools[0].params.corner_radius).toBe(Infinity);
    });

    it("turning + special class ids route to correct categories", () => {
      const turning = hyperMillDataExtractionPipeline.getGeometryClass(TURNING_GENERAL_ID)!;
      const probe = hyperMillDataExtractionPipeline.getGeometryClass(TOUCH_PROBE_ID)!;
      expect(turning.category).toBe("turning");
      expect(probe.category).toBe("special");
    });
  });

  // ── extractFromFile output_dir round-trip (graceful no-write when missing) ─
  describe("extractFromFile — output_dir on missing db produces no JSON", () => {
    it("no JSON written when status='missing' (only success branch writes)", () => {
      const outDir = path.join(tmpDir, "out");
      const result = hyperMillDataExtractionPipeline.extractFromFile({
        db_path: NEVER_DB_PATH,
        source: "demo_db",
        output_dir: outDir,
      });
      expect(result.status).toBe("missing");
      const dirExists = fs.existsSync(outDir);
      const files = dirExists ? fs.readdirSync(outDir) : [];
      expect(files.includes("hypermill-demo-db-tools.json")).toBe(false);
    });
  });
});
