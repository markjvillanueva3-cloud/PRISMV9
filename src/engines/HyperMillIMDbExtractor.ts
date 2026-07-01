/**
 * HyperMillIMDbExtractor — Extract Intelligent Macro tool + macro database schemas
 *
 * U-HKC04: Reads two hyperMILL Intelligent Macro SQLite databases:
 *
 *   1. IM_Tool_DB_V2023.1.db (126 MB): Materials, CuttingMaterials, Formulas,
 *      MatTechs (18 material/tool combinations), MatTechItems (102 diameter-
 *      dependent Vc/fz/drilling_feedrate entries).
 *
 *   2. IM_Macro_DB.db (6 MB): Feature macro definitions with 7 macro types
 *      (HOLE, SINK1-3, BACKSINK1-3), 7 macros, 8 jobs with parameter schemas,
 *      and machine/material group references.
 *
 * DB facts (IM_Tool_DB_V2023.1.db):
 *   - 3 Materials: 16MnCr5 (id=1), AlZnMg (id=2), VA (id=3)
 *   - 10 CuttingMaterials: VHM_Fräsen (id=1) .. Solid carbide (id=10)
 *   - 14 Formulas including spindle speed fS=(Vc*1000)/(d*pi), feed fF=fz*z*n
 *   - 18 MatTechs; 102 MatTechItems with limiting_diameter, cutting_speed, feedrate_per_edge
 *   - 56 total tables (tool geometry mirrors demo.db structure)
 *
 * DB facts (IM_Macro_DB.db):
 *   - 7 MacroTypes: HOLE (id=16), SINK1-3 (id=17-19), BACKSINK1-3 (id=20-22)
 *   - 7 Macros (all Usage=Feature)
 *   - 8 Jobs (DdrX5 Simple Drilling, DmdX5 Helical Drilling x6, DrmX5 Reaming)
 *   - 8 Job_Parameter rows with parameter name/value pairs
 *   - Version=21.0 from Properties table
 *
 * @engine HyperMillIMDbExtractor
 * @shortcode E1168
 * @dispatcher camDispatcher
 * @actions hypermill_im_tool_db_extract, hypermill_im_macro_db_extract
 * @milestone HM-KC-MS0/U-HKC04
 */

import * as fs from "node:fs";

// ── IMToolDbExtractor interfaces ───────────────────────────────────────────────

export interface IMToolMaterial {
  id: number;
  name: string;
}

export interface IMToolCuttingMaterial {
  id: number;
  name: string;
}

export interface IMToolFormula {
  id: number;
  name: string;
  formula: string;
}

export interface IMToolTableInfo {
  name: string;
  columns: string[];
  rowCount: number;
}

export interface IMToolDbResult {
  /** All workpiece materials in IM_Tool_DB (e.g. 16MnCr5, AlZnMg, VA) */
  materials: IMToolMaterial[];
  /** All cutting material definitions (VHM_Fräsen, HSS_Bohrer, Solid carbide, etc.) */
  cuttingMaterials: IMToolCuttingMaterial[];
  /** Speed/feed formulas (spindle speed, table feed, drilling feed, HDC variants) */
  formulas: IMToolFormula[];
  /** Total number of MatTech material/tool-type combinations */
  matTechCount: number;
  /** Total number of diameter-dependent MatTechItem rows across all MatTechs */
  matTechItemCount: number;
  /** Table inventory: name, columns, rowCount for every SQLite table */
  tables: IMToolTableInfo[];
  /** ISO 8601 extraction timestamp */
  extractedAt: string;
  /** "success" | "missing" | "error" */
  status: "success" | "missing" | "error";
  /** Error message when status != "success" */
  error?: string;
}

// ── IMMacroDbExtractor interfaces ─────────────────────────────────────────────

export interface IMMacroTableInfo {
  name: string;
  columns: string[];
  rowCount: number;
}

export interface IMMacroType {
  id: number;
  name: string;
}

export interface IMMacroEntry {
  id: string;
  name: string;
  type: string;
  usage: string;
}

export interface IMJobEntry {
  jobKey: number;
  systemJobType: string;
  jobType: string;
  toolType: number;
  toolDiameter: number;
}

export interface IMMacroDbResult {
  /** Table inventory: name, columns, rowCount for every SQLite table */
  tables: IMMacroTableInfo[];
  /** MacroType definitions (HOLE, SINK1-3, BACKSINK1-3) */
  macroTypes: IMMacroType[];
  /** Macro entries with ID, Name, Type, Usage */
  macros: IMMacroEntry[];
  /** Job definitions with system job type, tool type, and tool diameter */
  jobs: IMJobEntry[];
  /** Total number of macro rows */
  macroCount: number;
  /** Database version string from Properties table (e.g. "21.0") */
  version: string;
  /** ISO 8601 extraction timestamp */
  extractedAt: string;
  /** "success" | "missing" | "error" */
  status: "success" | "missing" | "error";
  /** Error message when status != "success" */
  error?: string;
}

// ── Minimal SQLite interface (avoids importing better-sqlite3 types at build time) ──

interface StatementLike {
  get(...params: unknown[]): unknown;
  all(...params: unknown[]): unknown[];
}

interface DatabaseLike {
  prepare(sql: string): StatementLike;
  close(): void;
}

// ── Shared helpers ─────────────────────────────────────────────────────────────

/**
 * Dynamically loads better-sqlite3 at runtime.
 * Returns null if the module is not installed.
 */
function loadSqlite(): ((path: string, opts?: { readonly?: boolean }) => DatabaseLike) | null {
  try {
    return (require as NodeRequire)("better-sqlite3") as (
      path: string,
      opts?: { readonly?: boolean },
    ) => DatabaseLike;
  } catch {
    return null;
  }
}

/**
 * Introspects all SQLite tables, returning name, column list, and row count.
 * Binary BLOB/BINARY columns are included in column names but noted by type only.
 */
function getAllTableInfos(db: DatabaseLike): IMToolTableInfo[] {
  const tableRows = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
    .all() as Array<{ name: string }>;

  return tableRows.map((t) => {
    const pragmaRows = db
      .prepare(`PRAGMA table_info(${t.name})`)
      .all() as Array<{ name: string; type: string }>;
    const columns = pragmaRows.map((r) => r.name);

    let rowCount = 0;
    try {
      const cntRow = db.prepare(`SELECT COUNT(*) as cnt FROM ${t.name}`).get() as { cnt: number };
      rowCount = cntRow.cnt;
    } catch {
      // Some system tables may not be queryable
      rowCount = 0;
    }

    return { name: t.name, columns, rowCount };
  });
}

// ── IMToolDbExtractor ──────────────────────────────────────────────────────────

export class IMToolDbExtractor {
  /** Path to the IM_Tool_DB_V2023.1.db SQLite file */
  private readonly dbPath: string;

  constructor(
    dbPath = "H:/prism/HYPERMILL/hyperMILL/33.0/AddIns/hmAutoColor/Wizards/AutomationCenter/DATABASE/INTELLIGENT_MACRO/IM_Tool_DB_V2023.1.db",
  ) {
    this.dbPath = dbPath;
  }

  /**
   * Extracts materials, cutting materials, formulas, and MatTech data
   * from the hyperMILL Intelligent Macro tool database.
   *
   * Returns a graceful empty result if the DB file is absent or unreadable.
   * Never throws.
   *
   * @returns IMToolDbResult with all extracted entities and status
   */
  async extract(): Promise<IMToolDbResult> {
    const extractedAt = new Date().toISOString();

    if (!fs.existsSync(this.dbPath)) {
      return this._emptyResult(extractedAt, "missing", `IM_Tool_DB not found at: ${this.dbPath}`);
    }

    const Database = loadSqlite();
    if (!Database) {
      return this._emptyResult(
        extractedAt,
        "error",
        "better-sqlite3 not available. Run: npm install better-sqlite3",
      );
    }

    try {
      const db = Database(this.dbPath, { readonly: true });

      const materials = this._getMaterials(db);
      const cuttingMaterials = this._getCuttingMaterials(db);
      const formulas = this._getFormulas(db);
      const matTechCount = (
        db.prepare("SELECT COUNT(*) as cnt FROM MatTechs").get() as { cnt: number }
      ).cnt;
      const matTechItemCount = (
        db.prepare("SELECT COUNT(*) as cnt FROM MatTechItems").get() as { cnt: number }
      ).cnt;
      const tables = getAllTableInfos(db);

      db.close();

      return {
        materials,
        cuttingMaterials,
        formulas,
        matTechCount,
        matTechItemCount,
        tables,
        extractedAt,
        status: "success",
      };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      return this._emptyResult(extractedAt, "error", `Extraction failed: ${msg}`);
    }
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  private _getMaterials(db: DatabaseLike): IMToolMaterial[] {
    return db
      .prepare("SELECT id, name FROM Materials ORDER BY id")
      .all() as IMToolMaterial[];
  }

  private _getCuttingMaterials(db: DatabaseLike): IMToolCuttingMaterial[] {
    return db
      .prepare("SELECT id, name FROM CuttingMaterials ORDER BY id")
      .all() as IMToolCuttingMaterial[];
  }

  private _getFormulas(db: DatabaseLike): IMToolFormula[] {
    const rows = db
      .prepare("SELECT id, name, formula FROM Formulas ORDER BY id")
      .all() as Array<{ id: number; name: unknown; formula: unknown }>;

    return rows.map((r) => ({
      id: r.id,
      name: typeof r.name === "string" ? r.name : String(r.name ?? ""),
      formula: typeof r.formula === "string" ? r.formula : String(r.formula ?? ""),
    }));
  }

  private _emptyResult(
    extractedAt: string,
    status: "missing" | "error",
    error: string,
  ): IMToolDbResult {
    return {
      materials: [],
      cuttingMaterials: [],
      formulas: [],
      matTechCount: 0,
      matTechItemCount: 0,
      tables: [],
      extractedAt,
      status,
      error,
    };
  }
}

// ── IMMacroDbExtractor ─────────────────────────────────────────────────────────

export class IMMacroDbExtractor {
  /** Path to the IM_Macro_DB.db SQLite file */
  private readonly dbPath: string;

  constructor(
    dbPath = "H:/prism/HYPERMILL/hyperMILL/33.0/AddIns/hmAutoColor/Wizards/AutomationCenter/DATABASE/INTELLIGENT_MACRO/IM_Macro_DB.db",
  ) {
    this.dbPath = dbPath;
  }

  /**
   * Extracts macro types, macro definitions, job entries, and table inventory
   * from the hyperMILL Intelligent Macro automation database.
   *
   * Returns a graceful empty result if the DB file is absent or unreadable.
   * Never throws.
   *
   * @returns IMMacroDbResult with macro catalog and status
   */
  async extract(): Promise<IMMacroDbResult> {
    const extractedAt = new Date().toISOString();

    if (!fs.existsSync(this.dbPath)) {
      return this._emptyResult(extractedAt, "missing", `IM_Macro_DB not found at: ${this.dbPath}`);
    }

    const Database = loadSqlite();
    if (!Database) {
      return this._emptyResult(
        extractedAt,
        "error",
        "better-sqlite3 not available. Run: npm install better-sqlite3",
      );
    }

    try {
      const db = Database(this.dbPath, { readonly: true });

      const tables = getAllTableInfos(db) as IMMacroTableInfo[];
      const macroTypes = this._getMacroTypes(db);
      const macros = this._getMacros(db);
      const jobs = this._getJobs(db);
      const version = this._getVersion(db);

      db.close();

      return {
        tables,
        macroTypes,
        macros,
        jobs,
        macroCount: macros.length,
        version,
        extractedAt,
        status: "success",
      };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      return this._emptyResult(extractedAt, "error", `Extraction failed: ${msg}`);
    }
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  private _getMacroTypes(db: DatabaseLike): IMMacroType[] {
    return db
      .prepare("SELECT ID as id, Name as name FROM MacroType ORDER BY ID")
      .all() as IMMacroType[];
  }

  private _getMacros(db: DatabaseLike): IMMacroEntry[] {
    const rows = db
      .prepare("SELECT ID, Name, Type, Usage FROM Macro ORDER BY ID")
      .all() as Array<{ ID: string; Name: string; Type: string; Usage: string }>;

    return rows.map((r) => ({
      id: r.ID,
      name: r.Name,
      type: r.Type,
      usage: r.Usage,
    }));
  }

  private _getJobs(db: DatabaseLike): IMJobEntry[] {
    const rows = db
      .prepare(
        "SELECT JobKey, SystemJobType, JobType, ToolType, ToolDiameter " +
        "FROM Job ORDER BY JobKey",
      )
      .all() as Array<{
        JobKey: number;
        SystemJobType: string;
        JobType: string;
        ToolType: number;
        ToolDiameter: number;
      }>;

    return rows.map((r) => ({
      jobKey: r.JobKey,
      systemJobType: r.SystemJobType,
      jobType: r.JobType,
      toolType: r.ToolType,
      toolDiameter: r.ToolDiameter,
    }));
  }

  private _getVersion(db: DatabaseLike): string {
    try {
      const row = db
        .prepare("SELECT Value FROM Properties WHERE Name='Version'")
        .get() as { Value: string } | undefined;
      return row?.Value ?? "unknown";
    } catch {
      return "unknown";
    }
  }

  private _emptyResult(
    extractedAt: string,
    status: "missing" | "error",
    error: string,
  ): IMMacroDbResult {
    return {
      tables: [],
      macroTypes: [],
      macros: [],
      jobs: [],
      macroCount: 0,
      version: "unknown",
      extractedAt,
      status,
      error,
    };
  }
}

// ── Singleton exports ──────────────────────────────────────────────────────────

export const imToolDbExtractor = new IMToolDbExtractor();
export const imMacroDbExtractor = new IMMacroDbExtractor();
