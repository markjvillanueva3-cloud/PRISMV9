/**
 * HarvestPipelineEngine — Orchestrates per-type harvesting from scanned resources
 *
 * Takes FolderScannerEngine scan results and dispatches files to type-specific
 * existing harvesters. Tracks harvest progress per-folder, per-type.
 * Supports resume after interruption via state persistence.
 *
 * Does NOT build new harvester engines — routes to EXISTING ones:
 *   - CNC programs → UnifiedProgramParserEngine
 *   - Post processors → CpsParser (existing in PostProcessorPipeline)
 *   - Probing cycles → ProbingCycleEngine
 *   - Formulas (.js) → FormulaRegistry (batch import)
 *   - Catalogs (PDF) → ManufacturerCatalogIndexEngine
 *   - CAD files → CadFileIndexEngine
 *   - Tool databases → ToolCatalogEngine
 *   - Material DBs → MaterialDatabaseEngine
 *
 * RES-MS0 / U-RES02
 * @module HarvestPipelineEngine
 */

import * as fs from "fs";
import * as path from "path";
import { log } from "../utils/Logger.js";
import type { ScannedFile, FileType, SeedDomainId } from "./FolderScannerEngine.js";

// ============================================================================
// TYPES
// ============================================================================

export type HarvestStatus = "pending" | "in_progress" | "complete" | "failed" | "skipped";

export interface HarvestRecord {
  filePath: string;
  fileType: FileType;
  domain: SeedDomainId | null;
  status: HarvestStatus;
  harvester: string | null;
  harvestedAt: string | null;
  error: string | null;
  itemsExtracted: number;
}

export interface HarvestProgress {
  totalFiles: number;
  complete: number;
  failed: number;
  skipped: number;
  pending: number;
  inProgress: number;
  byType: Record<string, { total: number; complete: number; failed: number }>;
  byDomain: Record<string, { total: number; complete: number; failed: number }>;
  startedAt: string;
  lastUpdatedAt: string;
}

export interface HarvestBatchResult {
  processed: number;
  succeeded: number;
  failed: number;
  skipped: number;
  errors: Array<{ file: string; error: string }>;
  duration_ms: number;
}

/** Maps file types to the engine that should harvest them */
export interface HarvesterRoute {
  fileType: FileType;
  engineName: string;
  importPath: string;
  method: string;
  batchable: boolean;
  priority: number;
}

// ============================================================================
// HARVESTER ROUTING TABLE
// ============================================================================

const HARVESTER_ROUTES: HarvesterRoute[] = [
  {
    fileType: "cnc_program",
    engineName: "UnifiedProgramParserEngine",
    importPath: "../engines/UnifiedProgramParserEngine.js",
    method: "parseFile",
    batchable: true,
    priority: 1,
  },
  {
    fileType: "post_processor",
    engineName: "PostProcessorPipelineEngine",
    importPath: "../engines/PostProcessorPipelineEngine.js",
    method: "analyzePostConfig",
    batchable: true,
    priority: 2,
  },
  {
    fileType: "probing_cycle",
    engineName: "ProbingCycleEngine",
    importPath: "../engines/ProbingCycleEngine.js",
    method: "parseCycleFile",
    batchable: true,
    priority: 3,
  },
  {
    fileType: "cad_file",
    engineName: "CadFileIndexEngine",
    importPath: "../engines/CadFileIndexEngine.js",
    method: "indexFile",
    batchable: true,
    priority: 4,
  },
  {
    fileType: "tool_database",
    engineName: "ToolCatalogEngine",
    importPath: "../engines/ToolCatalogEngine.js",
    method: "importDatabase",
    batchable: false,
    priority: 5,
  },
  {
    fileType: "material_db",
    engineName: "MaterialDatabaseEngine",
    importPath: "../engines/MaterialDatabaseEngine.js",
    method: "importMaterialDb",
    batchable: false,
    priority: 6,
  },
  {
    fileType: "pdf",
    engineName: "ManufacturerCatalogIndexEngine",
    importPath: "../engines/ManufacturerCatalogIndexEngine.js",
    method: "indexCatalog",
    batchable: true,
    priority: 7,
  },
  {
    fileType: "formula_script",
    engineName: "FormulaRegistry",
    importPath: "../registries/FormulaRegistry.js",
    method: "importFromFile",
    batchable: true,
    priority: 8,
  },
];

// ============================================================================
// STATE PERSISTENCE
// ============================================================================

const HARVEST_STATE_DIR = path.resolve("data/state");
const HARVEST_STATE_FILE = path.join(HARVEST_STATE_DIR, "harvest-pipeline-state.json");

interface PersistedState {
  records: Record<string, HarvestRecord>;
  progress: HarvestProgress;
}

function loadHarvestState(): PersistedState | null {
  try {
    if (fs.existsSync(HARVEST_STATE_FILE)) {
      return JSON.parse(fs.readFileSync(HARVEST_STATE_FILE, "utf-8"));
    }
  } catch (e) {
    log.warn("[HarvestPipeline] Failed to load state, starting fresh");
  }
  return null;
}

function saveHarvestState(state: PersistedState): void {
  try {
    if (!fs.existsSync(HARVEST_STATE_DIR)) {
      fs.mkdirSync(HARVEST_STATE_DIR, { recursive: true });
    }
    fs.writeFileSync(HARVEST_STATE_FILE, JSON.stringify(state, null, 2));
  } catch (e) {
    log.error("[HarvestPipeline] Failed to save state", e);
  }
}

// ============================================================================
// ENGINE
// ============================================================================

class HarvestPipelineEngineImpl {
  private records: Map<string, HarvestRecord> = new Map();
  private progress: HarvestProgress;

  constructor() {
    const saved = loadHarvestState();
    if (saved) {
      for (const [k, v] of Object.entries(saved.records)) {
        this.records.set(k, v);
      }
      this.progress = saved.progress;
    } else {
      this.progress = {
        totalFiles: 0,
        complete: 0,
        failed: 0,
        skipped: 0,
        pending: 0,
        inProgress: 0,
        byType: {},
        byDomain: {},
        startedAt: new Date().toISOString(),
        lastUpdatedAt: new Date().toISOString(),
      };
    }
  }

  /**
   * Queue scanned files for harvesting. Creates HarvestRecords for each file
   * and routes to appropriate harvester based on file type.
   *
   * @param files Array of ScannedFile from FolderScannerEngine
   * @returns Number of new files queued (excluding already-processed)
   */
  static queueFiles(files: ScannedFile[]): {
    queued: number;
    alreadyProcessed: number;
    unsupported: number;
  } {
    const inst = harvestPipelineEngine;
    let queued = 0;
    let alreadyProcessed = 0;
    let unsupported = 0;

    for (const file of files) {
      const key = file.file_path;

      // Skip already-processed files (unless they changed)
      const existing = inst.records.get(key);
      if (existing && existing.status === "complete" && !file.is_changed) {
        alreadyProcessed++;
        continue;
      }

      // Find harvester route
      const route = HARVESTER_ROUTES.find(r => r.fileType === file.file_type);

      inst.records.set(key, {
        filePath: file.file_path,
        fileType: file.file_type,
        domain: file.seed_domain,
        status: route ? "pending" : "skipped",
        harvester: route?.engineName ?? null,
        harvestedAt: null,
        error: null,
        itemsExtracted: 0,
      });

      if (route) {
        queued++;
      } else {
        unsupported++;
      }
    }

    inst.recalcProgress();
    inst.persist();

    return { queued, alreadyProcessed, unsupported };
  }

  /**
   * Get the harvester route for a file type.
   */
  static getRoute(fileType: FileType): HarvesterRoute | null {
    return HARVESTER_ROUTES.find(r => r.fileType === fileType) ?? null;
  }

  /**
   * Get all registered harvester routes.
   */
  static getRoutes(): HarvesterRoute[] {
    return [...HARVESTER_ROUTES];
  }

  /**
   * Get current harvest progress summary.
   */
  static getProgress(): HarvestProgress {
    harvestPipelineEngine.recalcProgress();
    return { ...harvestPipelineEngine.progress };
  }

  /**
   * Get pending files for a specific file type, sorted by priority.
   *
   * @param fileType Filter by file type (optional — all types if omitted)
   * @param limit Max files to return
   * @returns Array of HarvestRecords ready for processing
   */
  static getPendingFiles(fileType?: FileType, limit = 100): HarvestRecord[] {
    const inst = harvestPipelineEngine;
    const pending: HarvestRecord[] = [];

    for (const rec of inst.records.values()) {
      if (rec.status !== "pending") continue;
      if (fileType && rec.fileType !== fileType) continue;
      pending.push(rec);
      if (pending.length >= limit) break;
    }

    return pending;
  }

  /**
   * Mark a file as harvested (complete or failed).
   */
  static markComplete(
    filePath: string,
    itemsExtracted: number
  ): void {
    const inst = harvestPipelineEngine;
    const rec = inst.records.get(filePath);
    if (!rec) return;
    rec.status = "complete";
    rec.harvestedAt = new Date().toISOString();
    rec.itemsExtracted = itemsExtracted;
    inst.recalcProgress();
    inst.persist();
  }

  /**
   * Mark a file as failed with error message.
   */
  static markFailed(filePath: string, error: string): void {
    const inst = harvestPipelineEngine;
    const rec = inst.records.get(filePath);
    if (!rec) return;
    rec.status = "failed";
    rec.error = error;
    rec.harvestedAt = new Date().toISOString();
    inst.recalcProgress();
    inst.persist();
  }

  /**
   * Get a summary of what's in the pipeline.
   */
  static getSummary(): {
    totalRecords: number;
    byStatus: Record<HarvestStatus, number>;
    byType: Record<string, number>;
    byDomain: Record<string, number>;
    totalItemsExtracted: number;
    routes: HarvesterRoute[];
  } {
    const inst = harvestPipelineEngine;
    const byStatus: Record<string, number> = {};
    const byType: Record<string, number> = {};
    const byDomain: Record<string, number> = {};
    let totalItems = 0;

    for (const rec of inst.records.values()) {
      byStatus[rec.status] = (byStatus[rec.status] || 0) + 1;
      byType[rec.fileType] = (byType[rec.fileType] || 0) + 1;
      if (rec.domain) byDomain[rec.domain] = (byDomain[rec.domain] || 0) + 1;
      totalItems += rec.itemsExtracted;
    }

    return {
      totalRecords: inst.records.size,
      byStatus: byStatus as Record<HarvestStatus, number>,
      byType,
      byDomain,
      totalItemsExtracted: totalItems,
      routes: HARVESTER_ROUTES,
    };
  }

  /**
   * Reset all failed records back to pending for retry.
   */
  static retryFailed(): number {
    const inst = harvestPipelineEngine;
    let count = 0;
    for (const rec of inst.records.values()) {
      if (rec.status === "failed") {
        rec.status = "pending";
        rec.error = null;
        count++;
      }
    }
    if (count > 0) {
      inst.recalcProgress();
      inst.persist();
    }
    return count;
  }

  // ──────────────────────────────────────────────────────────────────────
  // PRIVATE
  // ──────────────────────────────────────────────────────────────────────

  private recalcProgress(): void {
    let complete = 0, failed = 0, skipped = 0, pending = 0, inProgress = 0;
    const byType: Record<string, { total: number; complete: number; failed: number }> = {};
    const byDomain: Record<string, { total: number; complete: number; failed: number }> = {};

    for (const rec of this.records.values()) {
      const tKey = rec.fileType;
      if (!byType[tKey]) byType[tKey] = { total: 0, complete: 0, failed: 0 };
      byType[tKey].total++;

      if (rec.domain) {
        if (!byDomain[rec.domain]) byDomain[rec.domain] = { total: 0, complete: 0, failed: 0 };
        byDomain[rec.domain].total++;
      }

      switch (rec.status) {
        case "complete":
          complete++;
          if (byType[tKey]) byType[tKey].complete++;
          if (rec.domain && byDomain[rec.domain]) byDomain[rec.domain].complete++;
          break;
        case "failed":
          failed++;
          if (byType[tKey]) byType[tKey].failed++;
          if (rec.domain && byDomain[rec.domain]) byDomain[rec.domain].failed++;
          break;
        case "skipped": skipped++; break;
        case "pending": pending++; break;
        case "in_progress": inProgress++; break;
      }
    }

    this.progress = {
      totalFiles: this.records.size,
      complete,
      failed,
      skipped,
      pending,
      inProgress,
      byType,
      byDomain,
      startedAt: this.progress.startedAt,
      lastUpdatedAt: new Date().toISOString(),
    };
  }

  private persist(): void {
    const records: Record<string, HarvestRecord> = {};
    for (const [k, v] of this.records.entries()) {
      records[k] = v;
    }
    saveHarvestState({ records, progress: this.progress });
  }
}

export const harvestPipelineEngine = new HarvestPipelineEngineImpl();
export { HarvestPipelineEngineImpl as HarvestPipelineEngine };
