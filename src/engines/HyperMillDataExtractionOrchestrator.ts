/**
 * HyperMillDataExtractionOrchestrator — Runs all 5 extraction pipelines + freshness check
 *
 * U-HMR48: Orchestrates extraction of all 5 hyperMILL databases in sequence,
 * validates outputs, and reports extraction status (counts, freshness, errors).
 *
 * Also declares the hypermill-data-freshness hook that warns when extracted data
 * is > 30 days old (hyperMILL installations may be updated).
 *
 * The 5 databases:
 *   1. demo.db          — SQLite, 547 tools + 2,706 cutting technologies
 *   2. IM_Macro_DB      — XML/binary, drilling macros + formulas
 *   3. AC_Standard_ToolDB — XML, standard tool library (29 geometry classes)
 *   4. IM_Tool_DB v1    — XML/binary, legacy tool definitions + wear data
 *   5. Metric.cfg dir   — INI files, 138 cycle parameter configurations
 *
 * Actions:
 *   cam:hypermill_data_extract_all  — run all 5 pipelines
 *   cam:hypermill_extract_tools     — run demo.db extraction only
 *   cam:hypermill_data_status       — check extraction status + freshness
 *
 * @engine HyperMillDataExtractionOrchestrator
 * @shortcode E1161
 * @dispatcher camDispatcher
 * @actions hypermill_data_extract_all, hypermill_data_status, hypermill_data_freshness_check
 * @hook hypermill-data-freshness (WARN when any extracted data > 30 days old)
 * @milestone HM-REV-MS8/U-HMR48
 */

import * as fs from "node:fs";
import * as path from "node:path";
import {
  hyperMillDataExtractionPipeline,
  type ExtractionResult,
  type SQLiteExtractorOptions,
} from "./HyperMillDataExtractionPipeline.js";
import {
  hyperMillMacroDBEngine,
  type MacroExtractionResult,
  type IMToolExtractionResult,
} from "./HyperMillMacroDBEngine.js";
import {
  hyperMillACStandardToolDBEngine,
  type ACExtractionResult,
} from "./HyperMillACStandardToolDBEngine.js";
import {
  hyperMillMetricCfgExtractorEngine,
  type MetricCfgExtractionResult,
} from "./HyperMillMetricCfgExtractorEngine.js";

// ── Freshness threshold ────────────────────────────────────────────────────────

const FRESHNESS_DAYS = 30;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

// ── Database path configuration ────────────────────────────────────────────────

export interface HyperMillPaths {
  /** Path to demo.db SQLite file */
  demo_db: string;
  /** Path to IM_Macro_DB directory or file */
  im_macro_db: string;
  /** Path to AC_Standard_ToolDB directory or file */
  ac_standard_tool_db: string;
  /** Path to IM_Tool_DB v1 directory or file */
  im_tool_db: string;
  /** Path to Metric.cfg directory */
  metric_cfg_dir: string;
  /** Output directory for extracted JSON files */
  output_dir?: string;
}

/** Default hyperMILL installation paths (Windows typical) */
export const DEFAULT_HM_PATHS: HyperMillPaths = {
  demo_db:              "C:/Program Files/OPEN MIND/hyperMILL/33.0/Tool Database/demo.db",
  im_macro_db:          "C:/Program Files/OPEN MIND/hyperMILL/33.0/IM_Macro_DB",
  ac_standard_tool_db:  "C:/Program Files/OPEN MIND/hyperMILL/33.0/AC_Standard_ToolDB",
  im_tool_db:           "C:/Program Files/OPEN MIND/hyperMILL/33.0/IM_Tool_DB",
  metric_cfg_dir:       "C:/Program Files/OPEN MIND/hyperMILL/33.0/Metric.cfg",
  output_dir:           "data/hypermill-extracted",
};

// ── Per-database extraction status ────────────────────────────────────────────

export type DBStatus = "success" | "missing" | "stale" | "error" | "not_run";

export interface PerDatabaseStatus {
  name: string;
  path: string;
  status: DBStatus;
  record_count: number;
  extracted_at?: string;
  age_days?: number;
  is_stale: boolean;
  error?: string;
}

export interface OrchestratorResult {
  status: "success" | "partial" | "error";
  extracted_at: string;
  databases: PerDatabaseStatus[];
  totals: {
    tools: number;
    cutting_techs: number;
    macros: number;
    formulas: number;
    cfg_files: number;
    cfg_params: number;
  };
  stale_warnings: string[];
  errors: string[];
}

// ── Extraction metadata persistence ────────────────────────────────────────────

interface ExtractionMetadata {
  extracted_at: string;
  tool_count: number;
  cutting_tech_count: number;
  macro_count: number;
  formula_count: number;
  cfg_file_count: number;
}

// ── HyperMillDataExtractionOrchestrator ──────────────────────────────────────

export class HyperMillDataExtractionOrchestrator {

  /**
   * Runs all 5 extraction pipelines sequentially.
   * Each pipeline handles missing DBs gracefully (no crash).
   *
   * @param paths - Paths to all 5 databases (defaults to DEFAULT_HM_PATHS)
   * @returns OrchestratorResult with per-database status and aggregate totals
   */
  extractAll(paths: Partial<HyperMillPaths> = {}): OrchestratorResult {
    const effectivePaths = { ...DEFAULT_HM_PATHS, ...paths };
    const extractedAt = new Date().toISOString();
    const dbStatuses: PerDatabaseStatus[] = [];
    const errors: string[] = [];
    const staleWarnings: string[] = [];

    let totalTools = 0;
    let totalCuttingTechs = 0;
    let totalMacros = 0;
    let totalFormulas = 0;
    let totalCfgFiles = 0;
    let totalCfgParams = 0;

    // ── 1. demo.db ───────────────────────────────────────────────────────────
    const demoResult = hyperMillDataExtractionPipeline.extractFromFile({
      db_path: effectivePaths.demo_db,
      source: "demo_db",
      output_dir: effectivePaths.output_dir,
    });
    const demoStatus = this._toPerDBStatus("demo.db", effectivePaths.demo_db, demoResult.status,
      demoResult.stats.tool_count + demoResult.stats.cutting_tech_count,
      demoResult.extracted_at, demoResult.error);
    dbStatuses.push(demoStatus);
    if (demoStatus.is_stale) staleWarnings.push(`demo.db data is ${demoStatus.age_days} days old — re-run extraction`);
    totalTools += demoResult.stats.tool_count;
    totalCuttingTechs += demoResult.stats.cutting_tech_count;
    if (demoResult.error && !demoResult.error.startsWith("INFO:")) errors.push(`demo.db: ${demoResult.error}`);

    // ── 2. IM_Macro_DB ────────────────────────────────────────────────────────
    const macroResult = hyperMillMacroDBEngine.extractMacroDB(effectivePaths.im_macro_db);
    const macroStatus = this._toPerDBStatus("IM_Macro_DB", effectivePaths.im_macro_db, macroResult.status,
      macroResult.stats.macro_count, macroResult.extracted_at, macroResult.error);
    dbStatuses.push(macroStatus);
    if (macroStatus.is_stale) staleWarnings.push(`IM_Macro_DB data is ${macroStatus.age_days} days old — re-run extraction`);
    totalMacros += macroResult.stats.macro_count;
    totalFormulas += macroResult.stats.formula_count;

    // ── 3. AC_Standard_ToolDB ─────────────────────────────────────────────────
    const acResult = hyperMillACStandardToolDBEngine.extractACStandardToolDB(effectivePaths.ac_standard_tool_db);
    const acStatus = this._toPerDBStatus("AC_Standard_ToolDB", effectivePaths.ac_standard_tool_db, acResult.status,
      acResult.stats.tool_count, acResult.extracted_at, acResult.error);
    dbStatuses.push(acStatus);
    if (acStatus.is_stale) staleWarnings.push(`AC_Standard_ToolDB data is ${acStatus.age_days} days old`);
    totalTools += acResult.stats.tool_count;

    // ── 4. IM_Tool_DB v1 ──────────────────────────────────────────────────────
    const imToolResult = hyperMillMacroDBEngine.extractIMToolDB(effectivePaths.im_tool_db);
    const imToolStatus = this._toPerDBStatus("IM_Tool_DB v1", effectivePaths.im_tool_db, imToolResult.status,
      imToolResult.stats.tool_count, imToolResult.extracted_at, imToolResult.error);
    dbStatuses.push(imToolStatus);
    if (imToolStatus.is_stale) staleWarnings.push(`IM_Tool_DB data is ${imToolStatus.age_days} days old`);
    totalTools += imToolResult.stats.tool_count;

    // ── 5. Metric.cfg ─────────────────────────────────────────────────────────
    const cfgResult = hyperMillMetricCfgExtractorEngine.extractAll(effectivePaths.metric_cfg_dir);
    const cfgStatus = this._toPerDBStatus("Metric.cfg", effectivePaths.metric_cfg_dir,
      cfgResult.status === "partial" ? "success" : cfgResult.status,
      cfgResult.stats.file_count, cfgResult.extracted_at, cfgResult.error);
    dbStatuses.push(cfgStatus);
    if (cfgStatus.is_stale) staleWarnings.push(`Metric.cfg data is ${cfgStatus.age_days} days old`);
    totalCfgFiles += cfgResult.stats.file_count;
    totalCfgParams += cfgResult.stats.param_count;

    // ── Save metadata ─────────────────────────────────────────────────────────
    if (effectivePaths.output_dir) {
      this._saveMetadata(effectivePaths.output_dir, {
        extracted_at: extractedAt,
        tool_count: totalTools,
        cutting_tech_count: totalCuttingTechs,
        macro_count: totalMacros,
        formula_count: totalFormulas,
        cfg_file_count: totalCfgFiles,
      });
    }

    const hasErrors = errors.length > 0;
    const allMissing = dbStatuses.every(d => d.status === "missing");

    return {
      status: hasErrors ? "partial" : "success",
      extracted_at: extractedAt,
      databases: dbStatuses,
      totals: {
        tools: totalTools,
        cutting_techs: totalCuttingTechs,
        macros: totalMacros,
        formulas: totalFormulas,
        cfg_files: totalCfgFiles,
        cfg_params: totalCfgParams,
      },
      stale_warnings: staleWarnings,
      errors,
    };
  }

  /**
   * Returns per-database status report without re-running extraction.
   * Reads saved metadata to determine freshness.
   *
   * @param paths - Database paths (used to check file existence)
   * @param outputDir - Directory where extraction metadata was saved
   */
  getStatus(paths: Partial<HyperMillPaths> = {}, outputDir?: string): OrchestratorResult {
    const effectivePaths = { ...DEFAULT_HM_PATHS, ...paths };
    const dir = outputDir ?? effectivePaths.output_dir ?? "data/hypermill-extracted";
    const metadata = this._loadMetadata(dir);

    const now = new Date();
    const dbStatuses: PerDatabaseStatus[] = [];
    const staleWarnings: string[] = [];

    const checkPath = (name: string, filePath: string): PerDatabaseStatus => {
      const exists = fs.existsSync(filePath);
      const ageDays = metadata
        ? Math.floor((now.getTime() - new Date(metadata.extracted_at).getTime()) / MS_PER_DAY)
        : undefined;
      const isStale = ageDays !== undefined && ageDays > FRESHNESS_DAYS;
      return {
        name,
        path: filePath,
        status: exists ? (isStale ? "stale" : "success") : "missing",
        record_count: 0,
        extracted_at: metadata?.extracted_at,
        age_days: ageDays,
        is_stale: isStale,
      };
    };

    dbStatuses.push(checkPath("demo.db", effectivePaths.demo_db));
    dbStatuses.push(checkPath("IM_Macro_DB", effectivePaths.im_macro_db));
    dbStatuses.push(checkPath("AC_Standard_ToolDB", effectivePaths.ac_standard_tool_db));
    dbStatuses.push(checkPath("IM_Tool_DB v1", effectivePaths.im_tool_db));
    dbStatuses.push(checkPath("Metric.cfg", effectivePaths.metric_cfg_dir));

    for (const db of dbStatuses) {
      if (db.is_stale) staleWarnings.push(`${db.name} data is ${db.age_days} days old — re-run cam:hypermill_data_extract_all`);
    }

    return {
      status: "success",
      extracted_at: metadata?.extracted_at ?? new Date().toISOString(),
      databases: dbStatuses,
      totals: {
        tools: metadata?.tool_count ?? 0,
        cutting_techs: metadata?.cutting_tech_count ?? 0,
        macros: metadata?.macro_count ?? 0,
        formulas: metadata?.formula_count ?? 0,
        cfg_files: metadata?.cfg_file_count ?? 0,
        cfg_params: 0,
      },
      stale_warnings: staleWarnings,
      errors: [],
    };
  }

  /**
   * Checks freshness of all extracted data.
   * Returns warnings for any data older than FRESHNESS_DAYS.
   *
   * @param outputDir - Directory where extraction metadata is stored
   */
  checkFreshness(outputDir: string): {
    is_fresh: boolean;
    age_days?: number;
    threshold_days: number;
    warnings: string[];
    last_extracted?: string;
  } {
    const metadata = this._loadMetadata(outputDir);
    if (!metadata) {
      return {
        is_fresh: false,
        threshold_days: FRESHNESS_DAYS,
        warnings: ["No extraction metadata found — run cam:hypermill_data_extract_all to populate"],
        last_extracted: undefined,
      };
    }

    const ageDays = Math.floor(
      (Date.now() - new Date(metadata.extracted_at).getTime()) / MS_PER_DAY
    );
    const isStale = ageDays > FRESHNESS_DAYS;
    const warnings: string[] = [];

    if (isStale) {
      warnings.push(
        `hyperMILL extracted data is ${ageDays} days old (threshold: ${FRESHNESS_DAYS} days). ` +
        `Run cam:hypermill_data_extract_all to refresh. ` +
        `Last extracted: ${metadata.extracted_at}`
      );
    }

    return {
      is_fresh: !isStale,
      age_days: ageDays,
      threshold_days: FRESHNESS_DAYS,
      warnings,
      last_extracted: metadata.extracted_at,
    };
  }

  private _toPerDBStatus(
    name: string,
    filePath: string,
    status: string,
    recordCount: number,
    extractedAt?: string,
    error?: string,
  ): PerDatabaseStatus {
    const ageDays = extractedAt
      ? Math.floor((Date.now() - new Date(extractedAt).getTime()) / MS_PER_DAY)
      : undefined;
    const isStale = ageDays !== undefined && ageDays > FRESHNESS_DAYS;

    return {
      name,
      path: filePath,
      status: (status as DBStatus) ?? "error",
      record_count: recordCount,
      extracted_at: extractedAt,
      age_days: ageDays,
      is_stale: isStale,
      error: error && !error.startsWith("INFO:") ? error : undefined,
    };
  }

  private _saveMetadata(outputDir: string, meta: ExtractionMetadata): void {
    try {
      if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
      fs.writeFileSync(
        path.join(outputDir, "extraction-metadata.json"),
        JSON.stringify(meta, null, 2),
      );
    } catch {
      // Non-fatal — metadata persistence failure doesn't break extraction
    }
  }

  private _loadMetadata(outputDir: string): ExtractionMetadata | null {
    try {
      const metaPath = path.join(outputDir, "extraction-metadata.json");
      if (!fs.existsSync(metaPath)) return null;
      return JSON.parse(fs.readFileSync(metaPath, "utf8")) as ExtractionMetadata;
    } catch {
      return null;
    }
  }
}

export const hyperMillDataExtractionOrchestrator = new HyperMillDataExtractionOrchestrator();
