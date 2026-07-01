/**
 * HyperMillDemoDbExtractor — Extract tool geometry + cutting tech schemas from demo.db
 *
 * U-HKC03: Reads the hyperMILL v33.0 demo.db SQLite file and extracts:
 *   - Tool geometry class schemas (real DB schema via PRAGMA table_info)
 *   - Per-class field definitions with types, nullable flags, and semantic descriptions
 *   - Cutting technology parameter schemas (Technologies table)
 *   - Material-tool combination statistics from ToolTechnologies join
 *   - Sample entries from each geometry class and the Technologies table
 *
 * DB facts (hyperMILL v33.0 demo/english/demo.db):
 *   - 29 geometry classes in GeometryClasses table
 *   - 547 tools across 10 distinct type_ids (most tools are Drilltool type_id=4: 337)
 *   - 2706 Technology records; 2162 with material links; 2709 ToolTechnologies links
 *   - 13 workpiece materials, 1 cutting material (Solid carbide)
 *   - Tools.dbl_param1..17, int_param1..6, bool_param1..3, string_param1..2
 *   - Technologies.dbl_param1..9, int_param1..2, formula_id1..10
 *
 * Parameter semantic mapping (from HyperMillDataExtractionPipeline + empirical data):
 *   Ballmill (1):     dbl4=diameter, dbl1=radius, dbl2=flute_length, dbl5=oal, int1=flutes
 *   Endmill (2):      dbl4=diameter, dbl5=oal, dbl7=helix_angle, int1=flutes
 *   Radiusmill (3):   dbl4=diameter, dbl1=corner_radius, dbl5=oal, dbl8=corner_radius2, int1=flutes
 *   Drilltool (4):    dbl4=diameter, dbl2=flute_length, dbl3=point_offset, dbl5=oal, int1=flutes
 *   ChamferedCutter(9):dbl4=diameter, dbl7=included_angle, dbl8=tip_angle, dbl9=tip_diameter, int1=flutes
 *   TSlotCutter(10):  dbl1=slot_width, dbl2=cutting_depth, dbl3=neck_width, dbl4=diameter, int1=flutes
 *   Tap (11):         dbl4=thread_diameter, dbl7=pitch, dbl2=flute_length, int1=flutes
 *
 * @engine HyperMillDemoDbExtractor
 * @shortcode E1167
 * @dispatcher camDispatcher
 * @actions hypermill_demo_db_extract, hypermill_demo_db_schema
 * @milestone HM-KC-MS0/U-HKC03
 */

import * as fs from "node:fs";

// ── Field and schema types ────────────────────────────────────────────────────

export interface FieldDefinition {
  /** Column name as it appears in the SQLite table */
  name: string;
  /** Normalized SQLite affinity type */
  type: "INTEGER" | "REAL" | "TEXT" | "BLOB";
  /** Whether the column is NOT NULL constrained */
  nullable: boolean;
  /** Human-readable description of this field's purpose */
  description: string;
}

export interface ToolGeometrySchema {
  /** hyperMILL geometry class name, e.g. "Endmill", "Drilltool", "Ballmill" */
  className: string;
  /** hyperMILL tool_type_id for this class */
  classId: number;
  /** All field definitions from the Tools table, with semantic descriptions */
  fields: FieldDefinition[];
  /** Number of tools of this class in demo.db */
  rowCount: number;
  /** Representative sample entry (first row of this type, numeric params only) */
  sample: Record<string, unknown> | null;
}

export interface CuttingTechSchema {
  /** Number of Technology entries that have a workpiece material link */
  materialToolCombinations: number;
  /** Total Technology entries in the DB */
  totalEntries: number;
  /** Field definitions from the Technologies table */
  fields: FieldDefinition[];
  /** Up to 5 sample Technology entries (non-binary columns only) */
  sampleEntries: Record<string, unknown>[];
}

export interface DemoDbExtractionResult {
  /** Schema per geometry class, ordered by classId */
  geometryClasses: ToolGeometrySchema[];
  /** Cutting technology parameter schema */
  cuttingTech: CuttingTechSchema;
  /** Number of distinct geometry classes present in demo.db */
  totalGeometryClasses: number;
  /** Total number of tool rows in demo.db */
  totalTools: number;
  /** Number of Technology entries with workpiece material links */
  totalCuttingTechs: number;
  /** ISO 8601 extraction timestamp */
  extractedAt: string;
  /** "success" | "missing" | "error" */
  status: "success" | "missing" | "error";
  /** Error message when status != "success" */
  error?: string;
}

// ── Raw SQLite PRAGMA row ────────────────────────────────────────────────────

interface PragmaRow {
  cid: number;
  name: string;
  type: string;
  notnull: number;
  dflt_value: unknown;
  pk: number;
}

// ── Semantic descriptions for Tools table columns ─────────────────────────────

/**
 * Human-readable descriptions for each Tools table column.
 * Covers all 49 columns; generic fallback for unmapped params.
 */
const TOOLS_FIELD_DESCRIPTIONS: Record<string, string> = {
  id:                "Tool primary key",
  tool_type_id:      "Geometry class ID (1=Ballmill, 2=Endmill, 3=Radiusmill, 4=Drilltool, 9=ChamferedCutter, 10=TSlotCutter, 11=Tap, 1000=GeneralTurningTool, ...)",
  tool_class_id:     "Tool class definition ID (FK → ToolClasses)",
  name:              "Tool display name",
  name_pattern_part: "Pattern-based name suffix",
  comment:           "Tool comment / note",
  comment_pattern_part: "Pattern-based comment suffix",
  ordering_code:     "Manufacturer ordering code / part number",
  obj_guid:          "Internal GUID (binary 16 bytes)",
  folder_id:         "Folder this tool belongs to (FK → Folders)",
  manufacturer_id:   "Manufacturer reference (FK → Manufacturers)",
  top_coupling_id:   "Top coupling interface (FK → Couplings)",
  tool_holder_id:    "Tool holder assembly (FK → ToolHolders)",
  insert_id:         "Indexable insert reference (FK → Inserts)",
  cutting_material_id: "Cutting material (FK → CuttingMaterials; 1=Solid carbide in demo)",
  mm_system_id:      "Measurement system (FK → SystemOfMeasurement)",
  free_tip_geom_id:  "Free-form tip geometry (FK → Geometries)",
  free_shaft_geom_id:"Free-form shaft geometry (FK → Geometries)",
  body_geom_id:      "Body geometry (FK → Geometries)",
  cutting_geom_id:   "Cutting edge geometry (FK → Geometries)",
  spindle_direction: "Spindle rotation direction (0=CW, 1=CCW)",
  total_length:      "Total assembled tool length (mm)",
  // dbl_param semantic meanings differ per tool_type_id:
  dbl_param1:  "Type-dependent: Ballmill=radius(mm); Radiusmill=corner_radius(mm); Drilltool=point_offset; TSlotCutter=slot_width(mm)",
  dbl_param2:  "Type-dependent: Ballmill/Drilltool/Endmill=flute_length(mm); Tap=flute_length(mm); TSlotCutter=cutting_depth(mm)",
  dbl_param3:  "Type-dependent: Drilltool=point_length_offset; TSlotCutter=neck_width(mm); Radiusmill=corner_radius_2(mm)",
  dbl_param4:  "Diameter (mm) — primary diameter for all milling types; thread diameter for Tap; diameter for TSlotCutter",
  dbl_param5:  "Overall length OAL (mm) — shank + body length as assembled",
  dbl_param6:  "Shank diameter (mm) or type-specific secondary dimension",
  dbl_param7:  "Type-dependent: Endmill=helix_angle(deg); Drilltool=point_angle(deg); ChamferedCutter=included_angle(deg); Tap=pitch(mm)",
  dbl_param8:  "Type-dependent: Radiusmill=corner_radius2; Drilltool=oal_with_holder; ChamferedCutter=tip_angle(deg); TSlotCutter=cutting_depth_2",
  dbl_param9:  "Type-dependent: ChamferedCutter=tip_diameter(mm); type-specific secondary",
  dbl_param10: "Type-dependent: Tap=nominal_diameter(mm); type-specific tertiary",
  dbl_param11: "Reserved / type-specific parameter",
  dbl_param12: "Type-dependent: Tap=pitch_shank_dia; type-specific",
  dbl_param13: "Effective total length including holder extension (mm)",
  dbl_param14: "Type-dependent: Drilltool=chisel_angle_derived; TSlotCutter=derived_angle",
  dbl_param15: "Reserved / type-specific parameter",
  dbl_param16: "Reserved / type-specific parameter",
  dbl_param17: "Reserved / type-specific parameter",
  int_param1:  "Number of cutting edges / flutes",
  int_param2:  "Type-dependent: helix hand or secondary integer property (0=right-hand)",
  int_param3:  "Type-dependent: TSlotCutter=int_flag; type-specific integer",
  int_param4:  "Reserved integer parameter",
  int_param5:  "Reserved integer parameter",
  int_param6:  "Reserved integer parameter",
  bool_param1: "Coolant-through flag (0=no, 1=yes)",
  bool_param2: "Type-specific boolean flag",
  bool_param3: "Type-specific boolean flag",
  string_param1: "Custom string attribute 1",
  string_param2: "Custom string attribute 2",
};

/**
 * Human-readable descriptions for Technologies table columns.
 */
const TECH_FIELD_DESCRIPTIONS: Record<string, string> = {
  technology_id:      "Technology primary key",
  technology_type:    "Technology type code (2=standard milling tech)",
  linked_technology_id: "Linked / parent technology (nullable FK)",
  material_id:        "Workpiece material (FK → Materials; null = material-independent)",
  cutting_material_id:"Cutting material (FK → CuttingMaterials)",
  purpose_id:         "Technology purpose (FK → TechnologyPurposes; 1=Default)",
  mm_system_id:       "Measurement system (FK → SystemOfMeasurement)",
  spindle_speed:      "Spindle speed n (rpm); 0 = compute from cutting_speed",
  feedrate:           "Table feedrate vf (mm/min)",
  cutting_speed:      "Cutting speed Vc (m/min)",
  coolants:           "Coolant code string (CHAR(32))",
  int_param1:         "Integer tech parameter 1",
  int_param2:         "Integer tech parameter 2",
  dbl_param1:         "Axial depth of cut ap (mm)",
  dbl_param2:         "Radial depth of cut ae (mm, or step-over fraction)",
  dbl_param3:         "Ramp angle (deg) or secondary depth",
  dbl_param4:         "Technology double parameter 4",
  dbl_param5:         "Technology double parameter 5",
  dbl_param6:         "Technology double parameter 6",
  dbl_param7:         "Technology double parameter 7",
  dbl_param8:         "Technology double parameter 8",
  dbl_param9:         "Technology double parameter 9",
  formula_id1:        "Formula reference 1 (FK → Formulas; nullable)",
  formula_id2:        "Formula reference 2 (FK → Formulas; nullable)",
  formula_id3:        "Formula reference 3 (FK → Formulas; nullable)",
  formula_id4:        "Formula reference 4 (FK → Formulas; nullable)",
  formula_id5:        "Formula reference 5 (FK → Formulas; nullable)",
  formula_id6:        "Formula reference 6 (FK → Formulas; nullable)",
  formula_id7:        "Formula reference 7 (FK → Formulas; nullable)",
  formula_id8:        "Formula reference 8 (FK → Formulas; nullable)",
  formula_id9:        "Formula reference 9 (FK → Formulas; nullable)",
  formula_id10:       "Formula reference 10 (FK → Formulas; nullable)",
};

// ── SQLite type normalization ──────────────────────────────────────────────────

/**
 * Maps SQLite declared types to the 4 canonical affinities used in FieldDefinition.
 * BLOB covers BINARY types. REAL covers DOUBLE PRECISION and FLOAT.
 * TEXT covers CHAR and VARCHAR. INTEGER covers SMALLINT.
 */
function normalizeSqliteType(rawType: string): "INTEGER" | "REAL" | "TEXT" | "BLOB" {
  const upper = rawType.toUpperCase();
  if (upper.startsWith("BINARY") || upper === "BLOB") return "BLOB";
  if (
    upper.startsWith("DOUBLE") ||
    upper.startsWith("FLOAT") ||
    upper.startsWith("REAL") ||
    upper.startsWith("NUMERIC") ||
    upper.startsWith("DECIMAL")
  ) return "REAL";
  if (
    upper.startsWith("CHAR") ||
    upper.startsWith("VARCHAR") ||
    upper.startsWith("TEXT") ||
    upper.startsWith("CLOB")
  ) return "TEXT";
  // INTEGER, SMALLINT, TINYINT, BIGINT, INT
  return "INTEGER";
}

// ── Geometry class name → classId map (from demo.db GeometryClasses table) ────

const GEOMETRY_CLASS_IDS: Record<string, number> = {
  Ballmill: 1, Endmill: 2, Radiusmill: 3, Drilltool: 4,
  Lollipop: 5, Woodruff: 6, GeneralBarrelTool: 7, LensCutter: 8,
  ChamferedCutter: 9, TSlotCutter: 10, Tap: 11, BoringBar: 12,
  GunDrill: 13, ThreadMill: 15, Reamer: 16, TangentBarrelTool: 17,
  ConicalBarrelTool: 18, IndexableRoundInsertCutter: 19, IndexableHighFeedCutter: 20,
  BackboringTool: 21, GeneralTurningTool: 1000, RadialRecessingTool: 1001,
  AxialRecessingTool: 1002, ThreadingTool: 1003, PartingTool: 1004,
  RollTurnTool: 1005, TouchProbe: 2000, GrindingBit: 3000, AdditiveDevice: 4000,
};

// ── HyperMillDemoDbExtractor ──────────────────────────────────────────────────

export class HyperMillDemoDbExtractor {
  /** Path to the hyperMILL demo.db SQLite file */
  private readonly dbPath: string;

  constructor(
    dbPath = "H:/prism/HYPERMILL/Tool Database/33.0/databases/demo/english/demo.db",
  ) {
    this.dbPath = dbPath;
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  /**
   * Extracts tool geometry class schemas and cutting tech schemas from demo.db.
   * Returns a graceful empty result if the DB file is absent or unreadable —
   * never throws.
   *
   * @returns DemoDbExtractionResult with status, geometry classes, and cutting tech
   */
  async extract(): Promise<DemoDbExtractionResult> {
    const extractedAt = new Date().toISOString();

    if (!fs.existsSync(this.dbPath)) {
      return {
        geometryClasses: [],
        cuttingTech: { materialToolCombinations: 0, totalEntries: 0, fields: [], sampleEntries: [] },
        totalGeometryClasses: 0,
        totalTools: 0,
        totalCuttingTechs: 0,
        extractedAt,
        status: "missing",
        error: `demo.db not found at: ${this.dbPath}. Install hyperMILL v33.0 and verify the path.`,
      };
    }

    let Database: (path: string, opts?: { readonly?: boolean }) => DatabaseLike;
    try {
      // Require as CJS module — better-sqlite3 is synchronous
      Database = (require as NodeRequire)("better-sqlite3") as (
        path: string,
        opts?: { readonly?: boolean },
      ) => DatabaseLike;
    } catch {
      return {
        geometryClasses: [],
        cuttingTech: { materialToolCombinations: 0, totalEntries: 0, fields: [], sampleEntries: [] },
        totalGeometryClasses: 0,
        totalTools: 0,
        totalCuttingTechs: 0,
        extractedAt,
        status: "error",
        error: "better-sqlite3 not available. Run: npm install better-sqlite3",
      };
    }

    try {
      const db = Database(this.dbPath, { readonly: true }) as DatabaseLike;
      const geometryClasses = this._getToolGeometryClasses(db);
      const cuttingTech = this._getCuttingTechSchema(db);
      const totalTools = (db.prepare("SELECT COUNT(*) as cnt FROM Tools").get() as { cnt: number }).cnt;
      db.close();

      return {
        geometryClasses,
        cuttingTech,
        totalGeometryClasses: geometryClasses.length,
        totalTools,
        totalCuttingTechs: cuttingTech.materialToolCombinations,
        extractedAt,
        status: "success",
      };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      return {
        geometryClasses: [],
        cuttingTech: { materialToolCombinations: 0, totalEntries: 0, fields: [], sampleEntries: [] },
        totalGeometryClasses: 0,
        totalTools: 0,
        totalCuttingTechs: 0,
        extractedAt,
        status: "error",
        error: `Extraction failed: ${msg}`,
      };
    }
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  /**
   * Introspects the Tools table schema using PRAGMA table_info,
   * then groups tools by geometry class and returns per-class schemas.
   *
   * The field list is shared across all classes (same table), but each class
   * reports its own rowCount and a representative sample row.
   */
  private _getToolGeometryClasses(db: DatabaseLike): ToolGeometrySchema[] {
    // 1) Get Tools table column definitions from DB
    const fields = this._getTableSchema(db, "Tools");

    // 2) Get all geometry class names and IDs from the GeometryClasses table
    const gcRows = db.prepare("SELECT id, name FROM GeometryClasses ORDER BY id").all() as Array<{
      id: number;
      name: string;
    }>;

    // 3) Get per-type_id tool counts in one query
    const countRows = db.prepare(
      "SELECT tool_type_id, COUNT(*) as cnt FROM Tools GROUP BY tool_type_id",
    ).all() as Array<{ tool_type_id: number; cnt: number }>;
    const countByType = new Map<number, number>(countRows.map(r => [r.tool_type_id, r.cnt]));

    // 4) Build ToolGeometrySchema per class
    const results: ToolGeometrySchema[] = [];

    for (const gc of gcRows) {
      const rowCount = countByType.get(gc.id) ?? 0;

      // Fetch sample row for this type (numeric columns only for readability)
      let sample: Record<string, unknown> | null = null;
      if (rowCount > 0) {
        const rawSample = db.prepare(
          "SELECT id, name, total_length, dbl_param1, dbl_param2, dbl_param3, dbl_param4, " +
          "dbl_param5, dbl_param6, dbl_param7, dbl_param8, dbl_param9, dbl_param10, " +
          "int_param1, int_param2, int_param3, bool_param1, bool_param2, string_param1 " +
          "FROM Tools WHERE tool_type_id = ? LIMIT 1",
        ).get(gc.id) as Record<string, unknown> | undefined;
        sample = rawSample ?? null;
      }

      results.push({ className: gc.name, classId: gc.id, fields, rowCount, sample });
    }

    return results;
  }

  /**
   * Introspects the Technologies table and computes CuttingTechSchema.
   *
   * materialToolCombinations = Technologies entries WHERE material_id IS NOT NULL
   * (2162 in demo.db).
   */
  private _getCuttingTechSchema(db: DatabaseLike): CuttingTechSchema {
    const fields = this._getTableSchema(db, "Technologies");

    const totalRow = db.prepare("SELECT COUNT(*) as cnt FROM Technologies").get() as { cnt: number };
    const matLinkRow = db.prepare(
      "SELECT COUNT(*) as cnt FROM Technologies WHERE material_id IS NOT NULL",
    ).get() as { cnt: number };

    // Sample: first 5 rows with material link, non-binary columns
    const sampleRaw = db.prepare(
      "SELECT technology_id, technology_type, material_id, cutting_material_id, " +
      "cutting_speed, feedrate, spindle_speed, coolants, " +
      "dbl_param1, dbl_param2, dbl_param3, dbl_param4, dbl_param5, " +
      "int_param1, int_param2 " +
      "FROM Technologies WHERE material_id IS NOT NULL LIMIT 5",
    ).all() as Record<string, unknown>[];

    return {
      materialToolCombinations: matLinkRow.cnt,
      totalEntries: totalRow.cnt,
      fields,
      sampleEntries: sampleRaw,
    };
  }

  /**
   * Returns FieldDefinition[] for a given table using PRAGMA table_info.
   * Normalizes SQLite types to the 4 canonical affinities.
   * Skips BLOB columns (binary GUIDs) from description lookup.
   *
   * @param db - Open better-sqlite3 database handle
   * @param tableName - SQLite table name
   * @returns Array of FieldDefinition, one per column
   */
  private _getTableSchema(db: DatabaseLike, tableName: string): FieldDefinition[] {
    const pragmaRows = db.prepare(`PRAGMA table_info(${tableName})`).all() as PragmaRow[];
    const descMap =
      tableName === "Tools" ? TOOLS_FIELD_DESCRIPTIONS : TECH_FIELD_DESCRIPTIONS;

    return pragmaRows.map(row => {
      const normalizedType = normalizeSqliteType(row.type);
      return {
        name: row.name,
        type: normalizedType,
        // notnull=1 means NOT NULL, so nullable = (notnull === 0)
        nullable: row.notnull === 0,
        description: descMap[row.name] ?? `${tableName} column (${row.type})`,
      };
    });
  }
}

// ── Minimal DB interface to avoid importing better-sqlite3 types at build time ──

interface StatementLike {
  get(...params: unknown[]): unknown;
  all(...params: unknown[]): unknown[];
}

interface DatabaseLike {
  prepare(sql: string): StatementLike;
  close(): void;
}

// ── Singleton export ───────────────────────────────────────────────────────────

export const hyperMillDemoDbExtractor = new HyperMillDemoDbExtractor();
