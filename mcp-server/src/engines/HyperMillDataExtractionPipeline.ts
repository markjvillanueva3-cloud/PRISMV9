/**
 * HyperMillDataExtractionPipeline — Generic SQLite extraction framework + demo.db extractor
 *
 * U-HMR41: Extraction framework that can process any SQLite-based hyperMILL tool database.
 * Implements:
 *   - Generic SQLite extractor interface (works without native SQLite binding at runtime —
 *     returns descriptive schema when DB file is absent, never crashes)
 *   - demo.db specific schema mapping (29 geometry classes → PRISM tool format)
 *   - Output JSON files written to data/ directory
 *   - cam:hypermill_extract_tools action support
 *
 * hyperMILL Tool Database Schema (v1.53, SQLite):
 *   Tools      — tool_id, tool_type_id, name, dbl_param1..17, int_param1..6
 *   NCTools    — assembled tool with holder_ref, gauge_length, projection
 *   DepotItems — magazine slot assignment
 *   Materials  — Vc/fz correction factors per workpiece material
 *
 * Geometry parameter mapping (from HyperMillToolExportEngine patterns):
 *   Endmill (2):     dbl_param1=diameter, dbl_param2=corner_radius, dbl_param3=flute_length, dbl_param4=OAL, int_param1=flutes
 *   Ballmill (1):    dbl_param1=diameter (= 2 × radius)
 *   Radiusmill (3):  dbl_param1=diameter, dbl_param2=corner_radius, dbl_param3=flute_length, dbl_param4=OAL, int_param1=flutes
 *   Drilltool (4):   dbl_param1=diameter, dbl_param2=point_angle, dbl_param3=flute_length
 *   Chamfer (9):     dbl_param1=diameter, dbl_param2=tip_diameter, dbl_param3=included_angle
 *   Tap (11):        dbl_param1=thread_diameter, dbl_param2=pitch, int_param1=thread_direction
 *   Lollipop (5):    dbl_param1=ball_diameter, dbl_param2=neck_diameter, dbl_param3=neck_length
 *   Woodruff (6):    dbl_param1=diameter, dbl_param2=width, dbl_param3=neck_diameter
 *
 * @engine HyperMillDataExtractionPipeline
 * @shortcode E1157
 * @dispatcher camDispatcher
 * @actions hypermill_extract_tools, hypermill_extraction_schema, hypermill_extraction_stats
 * @milestone HM-REV-MS8/U-HMR41
 */

import * as fs from "node:fs";
import * as path from "node:path";

// ── 29 Geometry class definitions ─────────────────────────────────────────────

export interface GeometryClass {
  id: number;
  name: string;
  prismType: string;
  params: {
    dbl: string[];   // up to 17 numeric params
    int: string[];   // up to 6 integer params
  };
  category: "milling" | "turning" | "special";
}

export const HM_GEOMETRY_CLASSES: GeometryClass[] = [
  // ── Milling ──────────────────────────────────────────────────────────────
  { id: 1,  name: "Ballmill",                   prismType: "ball_endmill",            category: "milling",
    params: { dbl: ["diameter"], int: [] } },
  { id: 2,  name: "Endmill",                    prismType: "flat_endmill",            category: "milling",
    params: { dbl: ["diameter","corner_radius","flute_length","oal","body_diameter","shank_diameter"], int: ["flutes","helix_angle","hand","coolant_through","coating_id","blank"] } },
  { id: 3,  name: "Radiusmill",                 prismType: "bull_endmill",            category: "milling",
    params: { dbl: ["diameter","corner_radius","flute_length","oal","body_diameter","shank_diameter"], int: ["flutes","helix_angle","hand","coolant_through","coating_id","blank"] } },
  { id: 4,  name: "Drilltool",                  prismType: "drill",                   category: "milling",
    params: { dbl: ["diameter","point_angle","flute_length","oal","web_thickness","chisel_angle"], int: ["flutes","hand","coolant_through","blank","blank2","blank3"] } },
  { id: 5,  name: "Lollipop",                   prismType: "lollipop",                category: "milling",
    params: { dbl: ["ball_diameter","neck_diameter","neck_length","oal","shank_diameter"], int: ["blank","blank2","blank3","blank4","blank5","blank6"] } },
  { id: 6,  name: "Woodruff",                   prismType: "woodruff",                category: "milling",
    params: { dbl: ["diameter","width","neck_diameter","oal","shank_diameter"], int: ["blank","blank2","blank3","blank4","blank5","blank6"] } },
  { id: 7,  name: "GeneralBarrelTool",          prismType: "barrel_mill",             category: "milling",
    params: { dbl: ["diameter","radius","neck_length","oal","shank_diameter","profile_radius"], int: ["flutes","blank2","blank3","blank4","blank5","blank6"] } },
  { id: 8,  name: "LensCutter",                 prismType: "lens_cutter",             category: "milling",
    params: { dbl: ["diameter","lens_radius","thickness","oal","shank_diameter"], int: ["blank","blank2","blank3","blank4","blank5","blank6"] } },
  { id: 9,  name: "ChamferedCutter",            prismType: "chamfer_mill",            category: "milling",
    params: { dbl: ["diameter","tip_diameter","included_angle","oal","shank_diameter"], int: ["flutes","blank2","blank3","blank4","blank5","blank6"] } },
  { id: 10, name: "TSlotCutter",               prismType: "t_slot_cutter",           category: "milling",
    params: { dbl: ["diameter","width","neck_diameter","oal","shank_diameter"], int: ["flutes","blank2","blank3","blank4","blank5","blank6"] } },
  { id: 11, name: "Tap",                        prismType: "tap",                     category: "milling",
    params: { dbl: ["thread_diameter","pitch","flute_length","oal","shank_diameter"], int: ["thread_direction","hand","blank3","blank4","blank5","blank6"] } },
  { id: 12, name: "BoringBar",                  prismType: "boring_bar",              category: "milling",
    params: { dbl: ["min_diameter","max_diameter","oal","shank_diameter","insert_nose_radius"], int: ["blank","blank2","blank3","blank4","blank5","blank6"] } },
  { id: 13, name: "GunDrill",                   prismType: "gun_drill",               category: "milling",
    params: { dbl: ["diameter","point_angle","flute_length","oal"], int: ["coolant_through","blank2","blank3","blank4","blank5","blank6"] } },
  { id: 15, name: "ThreadMill",                 prismType: "thread_mill",             category: "milling",
    params: { dbl: ["thread_diameter","pitch","flute_length","oal","shank_diameter"], int: ["flutes","hand","blank3","blank4","blank5","blank6"] } },
  { id: 16, name: "Reamer",                     prismType: "reamer",                  category: "milling",
    params: { dbl: ["diameter","flute_length","oal","shank_diameter"], int: ["flutes","hand","coolant_through","blank4","blank5","blank6"] } },
  { id: 17, name: "TangentBarrelTool",          prismType: "tangent_barrel_mill",     category: "milling",
    params: { dbl: ["diameter","tangent_radius","neck_length","oal","shank_diameter"], int: ["flutes","blank2","blank3","blank4","blank5","blank6"] } },
  { id: 18, name: "ConicalBarrelTool",          prismType: "conical_barrel_mill",     category: "milling",
    params: { dbl: ["base_diameter","tip_diameter","half_angle","oal","shank_diameter"], int: ["blank","blank2","blank3","blank4","blank5","blank6"] } },
  { id: 19, name: "IndexableRoundInsertCutter", prismType: "indexable_round_insert",  category: "milling",
    params: { dbl: ["diameter","insert_diameter","body_length","oal"], int: ["insert_count","blank2","blank3","blank4","blank5","blank6"] } },
  { id: 20, name: "IndexableHighFeedCutter",    prismType: "indexable_high_feed",     category: "milling",
    params: { dbl: ["diameter","insert_nose_radius","body_length","oal"], int: ["insert_count","blank2","blank3","blank4","blank5","blank6"] } },
  { id: 21, name: "BackboringTool",             prismType: "backboring",              category: "milling",
    params: { dbl: ["diameter","reach","oal","shank_diameter"], int: ["blank","blank2","blank3","blank4","blank5","blank6"] } },
  // ── Turning ──────────────────────────────────────────────────────────────
  { id: 1000, name: "GeneralTurningTool",       prismType: "turning_general",         category: "turning",
    params: { dbl: ["insert_nose_radius","lead_angle","clearance_angle","rake_angle"], int: ["insert_shape","hand","blank3","blank4","blank5","blank6"] } },
  { id: 1001, name: "RadialRecessingTool",      prismType: "radial_grooving",         category: "turning",
    params: { dbl: ["width","max_depth","insert_nose_radius"], int: ["hand","blank2","blank3","blank4","blank5","blank6"] } },
  { id: 1002, name: "AxialRecessingTool",       prismType: "axial_grooving",          category: "turning",
    params: { dbl: ["width","max_depth","insert_nose_radius"], int: ["hand","blank2","blank3","blank4","blank5","blank6"] } },
  { id: 1003, name: "ThreadingTool",            prismType: "threading",               category: "turning",
    params: { dbl: ["pitch","insert_angle","flank_angle"], int: ["thread_form","hand","blank3","blank4","blank5","blank6"] } },
  { id: 1004, name: "PartingTool",              prismType: "parting",                 category: "turning",
    params: { dbl: ["width","max_depth","insert_nose_radius"], int: ["hand","blank2","blank3","blank4","blank5","blank6"] } },
  { id: 1005, name: "RollTurnTool",             prismType: "roll_turning",            category: "turning",
    params: { dbl: ["diameter","insert_nose_radius"], int: ["hand","blank2","blank3","blank4","blank5","blank6"] } },
  // ── Special ──────────────────────────────────────────────────────────────
  { id: 2000, name: "TouchProbe",              prismType: "touch_probe",             category: "special",
    params: { dbl: ["stylus_diameter","stylus_length","oal"], int: ["blank","blank2","blank3","blank4","blank5","blank6"] } },
  { id: 3000, name: "GrindingBit",            prismType: "grinding_wheel",          category: "special",
    params: { dbl: ["diameter","width","bore_diameter"], int: ["grit_size","bond_type","blank3","blank4","blank5","blank6"] } },
  { id: 4000, name: "AdditiveDevice",         prismType: "additive_head",           category: "special",
    params: { dbl: ["nozzle_diameter","focal_length"], int: ["blank","blank2","blank3","blank4","blank5","blank6"] } },
];

// Build lookup map by id and name
const CLASS_BY_ID = new Map<number, GeometryClass>(HM_GEOMETRY_CLASSES.map(g => [g.id, g]));
const CLASS_BY_NAME = new Map<string, GeometryClass>(HM_GEOMETRY_CLASSES.map(g => [g.name.toLowerCase(), g]));

// ── PRISM Tool format (output) ─────────────────────────────────────────────────

export interface PrismToolRecord {
  source: "demo_db" | "ac_standard" | "im_tool_db";
  tool_id: number;
  name: string;
  geometry_class: string;    // e.g. "Endmill"
  geometry_class_id: number;
  prism_type: string;        // e.g. "flat_endmill"
  category: "milling" | "turning" | "special";
  params: Record<string, number | string>;  // named parameters
  raw: {
    dbl_params: number[];    // raw dbl_param1..17
    int_params: number[];    // raw int_param1..6
  };
  cutting_techs?: CuttingTechRecord[];
}

export interface CuttingTechRecord {
  tech_id: number;
  tool_id: number;
  material_name: string;
  material_group: string;   // ISO: P/M/K/N/S/H
  vc_m_min: number;         // cutting speed
  fz_mm: number;            // feed per tooth
  ap_mm: number;            // axial depth of cut
  ae_mm: number;            // radial depth of cut
  coolant: string;
}

// ── Extraction result ──────────────────────────────────────────────────────────

export interface ExtractionResult {
  source: string;
  db_path: string;
  status: "success" | "missing" | "error";
  error?: string;
  extracted_at: string;
  tools: PrismToolRecord[];
  cutting_techs: CuttingTechRecord[];
  stats: {
    tool_count: number;
    cutting_tech_count: number;
    geometry_classes_found: string[];
    errors: string[];
  };
}

// ── Generic SQLite extractor interface ────────────────────────────────────────

export interface SQLiteRow {
  [column: string]: unknown;
}

export interface SQLiteExtractorOptions {
  db_path: string;
  source: PrismToolRecord["source"];
  output_dir?: string;
}

/**
 * Parses a raw SQLite-style row into a named parameter map using the geometry class definition.
 */
function parseToolRow(row: SQLiteRow, geoClass: GeometryClass): Record<string, number | string> {
  const params: Record<string, number | string> = {};
  for (let i = 0; i < geoClass.params.dbl.length; i++) {
    const key = geoClass.params.dbl[i];
    if (key && !key.startsWith("blank")) {
      const raw = row[`dbl_param${i + 1}`];
      params[key] = typeof raw === "number" ? raw : 0;
    }
  }
  for (let i = 0; i < geoClass.params.int.length; i++) {
    const key = geoClass.params.int[i];
    if (key && !key.startsWith("blank")) {
      const raw = row[`int_param${i + 1}`];
      params[key] = typeof raw === "number" ? raw : 0;
    }
  }
  return params;
}

/**
 * Converts a raw tool DB row into a PrismToolRecord.
 * Returns null if geometry class is unknown.
 */
function rowToPrismTool(row: SQLiteRow, source: PrismToolRecord["source"]): PrismToolRecord | null {
  const typeId = typeof row.tool_type_id === "number" ? row.tool_type_id : 0;
  const geoClass = CLASS_BY_ID.get(typeId);
  if (!geoClass) return null;

  const dblParams: number[] = [];
  const intParams: number[] = [];
  for (let i = 1; i <= 17; i++) {
    const v = row[`dbl_param${i}`];
    dblParams.push(typeof v === "number" ? v : 0);
  }
  for (let i = 1; i <= 6; i++) {
    const v = row[`int_param${i}`];
    intParams.push(typeof v === "number" ? v : 0);
  }

  return {
    source,
    tool_id: typeof row.tool_id === "number" ? row.tool_id : 0,
    name: typeof row.name === "string" ? row.name : `Tool_${row.tool_id}`,
    geometry_class: geoClass.name,
    geometry_class_id: geoClass.id,
    prism_type: geoClass.prismType,
    category: geoClass.category,
    params: parseToolRow(row, geoClass),
    raw: { dbl_params: dblParams, int_params: intParams },
  };
}

// ── HyperMillDataExtractionPipeline engine ────────────────────────────────────

export class HyperMillDataExtractionPipeline {

  /**
   * Returns the geometry class definition for a given hyperMILL tool_type_id.
   * Used to understand schema without needing a real DB.
   */
  getGeometryClass(toolTypeId: number): GeometryClass | null {
    return CLASS_BY_ID.get(toolTypeId) ?? null;
  }

  /**
   * Returns the geometry class definition by name (case-insensitive).
   */
  getGeometryClassByName(name: string): GeometryClass | null {
    return CLASS_BY_NAME.get(name.toLowerCase()) ?? null;
  }

  /**
   * Returns all 29 geometry class definitions.
   */
  getAllGeometryClasses(): GeometryClass[] {
    return [...HM_GEOMETRY_CLASSES];
  }

  /**
   * Returns schema info — full description of the extraction format.
   * Useful when the actual DB file is not present.
   */
  getSchemaInfo(): {
    geometry_classes: { id: number; name: string; prism_type: string; category: string }[];
    output_format: string;
    supported_tables: string[];
    param_format: string;
  } {
    return {
      geometry_classes: HM_GEOMETRY_CLASSES.map(g => ({
        id: g.id,
        name: g.name,
        prism_type: g.prismType,
        category: g.category,
      })),
      output_format: "JSON with PrismToolRecord[] + CuttingTechRecord[]",
      supported_tables: ["Tools", "NCTools", "DepotItems", "Materials"],
      param_format: "Named parameters mapped from dbl_param1..17 and int_param1..6 per geometry class",
    };
  }

  /**
   * Extracts tools from an in-memory array of raw DB rows.
   * This is the core extraction logic — works without filesystem access.
   * Missing or unknown rows are gracefully skipped (no crash).
   *
   * @param rows - Array of raw SQLite row objects from the Tools table
   * @param cuttingTechRows - Optional rows from Materials/CuttingTech table
   * @param source - Source DB identifier
   * @returns Extracted PrismToolRecord[] and CuttingTechRecord[]
   */
  extractFromRows(
    rows: SQLiteRow[],
    cuttingTechRows: SQLiteRow[] = [],
    source: PrismToolRecord["source"] = "demo_db",
  ): { tools: PrismToolRecord[]; cutting_techs: CuttingTechRecord[]; errors: string[] } {
    const tools: PrismToolRecord[] = [];
    const errors: string[] = [];

    for (const row of rows) {
      try {
        const tool = rowToPrismTool(row, source);
        if (tool) {
          tools.push(tool);
        } else {
          errors.push(`Unknown geometry class id=${row.tool_type_id} for tool_id=${row.tool_id}`);
        }
      } catch (e: any) {
        errors.push(`Row parse error tool_id=${row.tool_id}: ${e.message}`);
      }
    }

    const cutting_techs: CuttingTechRecord[] = [];
    for (const row of cuttingTechRows) {
      try {
        cutting_techs.push({
          tech_id: typeof row.tech_id === "number" ? row.tech_id : 0,
          tool_id: typeof row.tool_id === "number" ? row.tool_id : 0,
          material_name: typeof row.material_name === "string" ? row.material_name : "unknown",
          material_group: typeof row.material_group === "string" ? row.material_group : "P",
          vc_m_min: typeof row.vc_m_min === "number" ? row.vc_m_min : 0,
          fz_mm: typeof row.fz_mm === "number" ? row.fz_mm : 0,
          ap_mm: typeof row.ap_mm === "number" ? row.ap_mm : 0,
          ae_mm: typeof row.ae_mm === "number" ? row.ae_mm : 0,
          coolant: typeof row.coolant === "string" ? row.coolant : "flood",
        });
      } catch (e: any) {
        errors.push(`Cutting tech parse error: ${e.message}`);
      }
    }

    return { tools, cutting_techs, errors };
  }

  /**
   * Extracts tools from a SQLite DB file path.
   * If the file does not exist or cannot be opened, returns an empty result with status="missing" —
   * NEVER throws. The extraction framework is resilient to missing DBs.
   *
   * Note: This engine does not bundle a native SQLite driver.
   * When better-sqlite3 or sql.js is available in the process, this method uses it.
   * Otherwise it returns status="missing" with an informative message.
   *
   * @param opts - Extraction options including db_path and source identifier
   * @returns ExtractionResult with status, tools, cutting_techs, and stats
   */
  extractFromFile(opts: SQLiteExtractorOptions): ExtractionResult {
    const { db_path, source, output_dir } = opts;
    const extractedAt = new Date().toISOString();

    // Guard: file missing
    if (!fs.existsSync(db_path)) {
      return {
        source,
        db_path,
        status: "missing",
        error: `Database file not found: ${db_path}. Install hyperMILL and provide the correct path.`,
        extracted_at: extractedAt,
        tools: [],
        cutting_techs: [],
        stats: { tool_count: 0, cutting_tech_count: 0, geometry_classes_found: [], errors: [] },
      };
    }

    // Try to load sqlite3 / better-sqlite3 dynamically
    let dbModule: any;
    try {
      // prefer better-sqlite3 (synchronous, simpler)
      dbModule = require("better-sqlite3");
    } catch {
      try {
        dbModule = require("sql.js");
      } catch {
        dbModule = null;
      }
    }

    if (!dbModule) {
      return {
        source,
        db_path,
        status: "error",
        error: "No SQLite driver available. Install better-sqlite3 (npm install better-sqlite3) to enable DB extraction.",
        extracted_at: extractedAt,
        tools: [],
        cutting_techs: [],
        stats: { tool_count: 0, cutting_tech_count: 0, geometry_classes_found: [], errors: [] },
      };
    }

    try {
      const db = new dbModule(db_path, { readonly: true });
      const toolRows: SQLiteRow[] = db.prepare(
        "SELECT * FROM Tools ORDER BY tool_id"
      ).all() as SQLiteRow[];

      let cuttingTechRows: SQLiteRow[] = [];
      try {
        cuttingTechRows = db.prepare(
          "SELECT tech_id, tool_id, material_name, material_group, vc_m_min, fz_mm, ap_mm, ae_mm, coolant FROM Materials ORDER BY tool_id"
        ).all() as SQLiteRow[];
      } catch {
        // Materials table may not exist in all DB variants — skip gracefully
      }

      db.close();

      const { tools, cutting_techs, errors } = this.extractFromRows(toolRows, cuttingTechRows, source);

      // Attach cutting techs to their parent tools
      const techByToolId = new Map<number, CuttingTechRecord[]>();
      for (const ct of cutting_techs) {
        const arr = techByToolId.get(ct.tool_id) ?? [];
        arr.push(ct);
        techByToolId.set(ct.tool_id, arr);
      }
      for (const tool of tools) {
        tool.cutting_techs = techByToolId.get(tool.tool_id) ?? [];
      }

      const geometryClassesFound = [...new Set(tools.map(t => t.geometry_class))];
      const result: ExtractionResult = {
        source,
        db_path,
        status: "success",
        extracted_at: extractedAt,
        tools,
        cutting_techs,
        stats: {
          tool_count: tools.length,
          cutting_tech_count: cutting_techs.length,
          geometry_classes_found: geometryClassesFound,
          errors,
        },
      };

      // Write output if output_dir provided
      if (output_dir) {
        this._writeOutput(result, output_dir);
      }

      return result;
    } catch (e: any) {
      return {
        source,
        db_path,
        status: "error",
        error: `Extraction failed: ${e.message}`,
        extracted_at: extractedAt,
        tools: [],
        cutting_techs: [],
        stats: { tool_count: 0, cutting_tech_count: 0, geometry_classes_found: [], errors: [e.message] },
      };
    }
  }

  /**
   * Writes extraction result to JSON files in the specified output directory.
   * Creates the directory if it does not exist.
   */
  private _writeOutput(result: ExtractionResult, outputDir: string): void {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    const prefix = result.source.replace(/_/g, "-");
    fs.writeFileSync(
      path.join(outputDir, `hypermill-${prefix}-tools.json`),
      JSON.stringify({ extracted_at: result.extracted_at, tools: result.tools }, null, 2),
    );
    if (result.cutting_techs.length > 0) {
      fs.writeFileSync(
        path.join(outputDir, `hypermill-${prefix}-cutting-tech.json`),
        JSON.stringify({ extracted_at: result.extracted_at, cutting_techs: result.cutting_techs }, null, 2),
      );
    }
  }

  /**
   * Returns extraction statistics for reporting.
   */
  extractionStats(result: ExtractionResult): {
    status: string;
    tool_count: number;
    cutting_tech_count: number;
    geometry_classes: number;
    geometry_class_names: string[];
    error_count: number;
    extracted_at: string;
  } {
    return {
      status: result.status,
      tool_count: result.stats.tool_count,
      cutting_tech_count: result.stats.cutting_tech_count,
      geometry_classes: result.stats.geometry_classes_found.length,
      geometry_class_names: result.stats.geometry_classes_found,
      error_count: result.stats.errors.length,
      extracted_at: result.extracted_at,
    };
  }
}

export const hyperMillDataExtractionPipeline = new HyperMillDataExtractionPipeline();
