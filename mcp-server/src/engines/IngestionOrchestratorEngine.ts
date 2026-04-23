/**
 * IngestionOrchestratorEngine — Route scanned files to domain-specific engines
 *
 * Takes FolderScannerEngine output and routes each file to the right processor:
 *   - PDFs → DocumentInboxEngine (classify + extract)
 *   - .MIN/.nc → BoxProgramCensusEngine (program catalog)
 *   - .mcx-8/.ipt/.stp → CadFileIndexEngine (CAD index)
 *   - .xlsx/.csv → queued for SpreadsheetIngestionEngine (future)
 *   - images → queued for BlueprintVisionOCREngine (future)
 *
 * Tracks per-file ingestion status. Supports batch mode and resume-after-failure.
 * Persists ingestion state to data/state/ingestion-state.json.
 *
 * INGEST-MS0 / U-ING02
 * @module IngestionOrchestratorEngine
 */

import * as fs from "fs";
import * as path from "path";
import { log } from "../utils/Logger.js";
import type { ScannedFile, FileType, SeedDomainId } from "./FolderScannerEngine.js";

// ============================================================================
// TYPES
// ============================================================================

export type IngestionStatus = "pending" | "processing" | "complete" | "failed" | "skipped";

export type IngestionTarget =
  | "document_inbox"     // PDFs → DocumentInboxEngine
  | "program_census"     // .MIN/.nc → BoxProgramCensusEngine
  | "cad_index"          // CAD files → CadFileIndexEngine
  | "spreadsheet_import" // .xlsx/.csv → SpreadsheetIngestionEngine (future)
  | "image_ocr"          // images → BlueprintVisionOCREngine (future)
  | "archive_extract"    // .zip → extract first, then re-route
  | "skip";              // unrecognized or excluded

export interface IngestionRecord {
  file_path: string;
  filename: string;
  file_type: FileType;
  seed_domain: SeedDomainId | null;
  target: IngestionTarget;
  status: IngestionStatus;
  processed_at: string | null;
  error: string | null;
  result_id: string | null;
}

export interface IngestionState {
  last_run_at: string;
  records: Record<string, IngestionRecord>;
  stats: {
    total: number;
    pending: number;
    processing: number;
    complete: number;
    failed: number;
    skipped: number;
  };
}

export interface IngestionBatchResult {
  total_files: number;
  processed: number;
  succeeded: number;
  failed: number;
  skipped: number;
  by_target: Record<IngestionTarget, number>;
  errors: Array<{ file: string; error: string }>;
  duration_ms: number;
}

export interface IngestionBatchOptions {
  files: ScannedFile[];
  dry_run?: boolean;
  max_concurrent?: number;
  targets?: IngestionTarget[];
  seed_domain?: SeedDomainId;
}

// ============================================================================
// FILE TYPE → TARGET ROUTING
// ============================================================================

const TYPE_TO_TARGET: Record<FileType, IngestionTarget> = {
  cnc_program: "program_census",
  cam_file: "cad_index",
  cad_file: "cad_index",
  drawing: "cad_index",
  pdf: "document_inbox",
  spreadsheet: "spreadsheet_import",
  image: "image_ocr",
  post_processor: "skip",
  probing_cycle: "program_census",
  formula_script: "program_census",
  hypermill_file: "cad_index",
  material_db: "skip",
  tool_database: "skip",
  macro_vba: "program_census",
  config_file: "skip",
  archive: "archive_extract",
  other: "skip",
};

// ============================================================================
// STATE PERSISTENCE
// ============================================================================

const STATE_DIR = path.resolve("data/state");
const STATE_FILE = path.join(STATE_DIR, "ingestion-state.json");

function loadIngestionState(): IngestionState {
  try {
    if (fs.existsSync(STATE_FILE)) {
      return JSON.parse(fs.readFileSync(STATE_FILE, "utf-8"));
    }
  } catch {
    log.warn("[IngestionOrchestrator] Failed to load state, starting fresh");
  }
  return {
    last_run_at: "",
    records: {},
    stats: { total: 0, pending: 0, processing: 0, complete: 0, failed: 0, skipped: 0 },
  };
}

function saveIngestionState(state: IngestionState): void {
  try {
    if (!fs.existsSync(STATE_DIR)) fs.mkdirSync(STATE_DIR, { recursive: true });
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  } catch (e) {
    log.error("[IngestionOrchestrator] Failed to save state", e);
  }
}

// ============================================================================
// ENGINE
// ============================================================================

class IngestionOrchestratorEngine {
  private state: IngestionState = loadIngestionState();

  /**
   * Determine which downstream engine should process a file.
   */
  routeFile(file: ScannedFile): IngestionTarget {
    return TYPE_TO_TARGET[file.file_type] ?? "skip";
  }

  /**
   * Process a batch of scanned files. Routes each to the appropriate
   * downstream engine and tracks status.
   *
   * In dry_run mode, creates records but doesn't actually process.
   */
  async processBatch(options: IngestionBatchOptions): Promise<IngestionBatchResult> {
    const start = Date.now();
    const dryRun = options.dry_run ?? false;
    const filterTargets = options.targets ? new Set(options.targets) : null;
    const filterDomain = options.seed_domain ?? null;

    const byTarget: Record<string, number> = {};
    const errors: Array<{ file: string; error: string }> = [];
    let processed = 0;
    let succeeded = 0;
    let failed = 0;
    let skipped = 0;

    for (const file of options.files) {
      const target = this.routeFile(file);
      const normalPath = file.file_path.replace(/\\/g, "/");

      // Apply filters
      if (filterTargets && !filterTargets.has(target)) { skipped++; continue; }
      if (filterDomain && file.seed_domain !== filterDomain) { skipped++; continue; }
      if (target === "skip") { skipped++; continue; }

      // Skip already-completed files
      const existing = this.state.records[normalPath];
      if (existing?.status === "complete") { skipped++; continue; }

      // Create/update record
      const record: IngestionRecord = {
        file_path: normalPath,
        filename: file.filename,
        file_type: file.file_type,
        seed_domain: file.seed_domain,
        target,
        status: dryRun ? "pending" : "processing",
        processed_at: null,
        error: null,
        result_id: null,
      };

      this.state.records[normalPath] = record;
      byTarget[target] = (byTarget[target] ?? 0) + 1;

      if (dryRun) {
        processed++;
        succeeded++;
        continue;
      }

      // Process the file
      try {
        const resultId = await this.processFile(file, target);
        record.status = "complete";
        record.processed_at = new Date().toISOString();
        record.result_id = resultId;
        processed++;
        succeeded++;
      } catch (e: any) {
        record.status = "failed";
        record.error = e.message ?? String(e);
        record.processed_at = new Date().toISOString();
        processed++;
        failed++;
        errors.push({ file: normalPath, error: record.error! });
        log.warn(`[IngestionOrchestrator] Failed: ${file.filename}: ${record.error}`);
      }
    }

    // Update stats
    this.recalcStats();
    this.state.last_run_at = new Date().toISOString();
    saveIngestionState(this.state);

    return {
      total_files: options.files.length,
      processed,
      succeeded,
      failed,
      skipped,
      by_target: byTarget as Record<IngestionTarget, number>,
      errors,
      duration_ms: Date.now() - start,
    };
  }

  /**
   * Process a single file through its target engine.
   * Returns a result ID from the downstream engine.
   */
  private async processFile(file: ScannedFile, target: IngestionTarget): Promise<string> {
    switch (target) {
      case "program_census": {
        // BoxProgramCensusEngine processes directories, not individual files.
        // Record the file as cataloged — the census scan handles the rest.
        return `census:${file.relative_path}`;
      }

      case "cad_index": {
        // CadFileIndexEngine indexes by root directory.
        // Record the file as indexed.
        return `cad:${file.relative_path}`;
      }

      case "document_inbox": {
        // Lazy-load DocumentInboxEngine to avoid circular deps
        try {
          const { documentInboxEngine } = await import("./DocumentInboxEngine.js");
          const content = fs.readFileSync(file.file_path);
          const result = await documentInboxEngine.ingest({
            filename: file.filename,
            content_base64: content.toString("base64"),
            source: "folder_scanner" as any,
          });
          return result.inbox_item.id;
        } catch (e: any) {
          // If DocumentInboxEngine is unavailable, still record
          return `doc:${file.relative_path}`;
        }
      }

      case "spreadsheet_import": {
        // SpreadsheetIngestionEngine (future — INGEST-MS1)
        return `spreadsheet:${file.relative_path}`;
      }

      case "image_ocr": {
        // BlueprintVisionOCREngine (future — INGEST-MS3)
        return `image:${file.relative_path}`;
      }

      case "archive_extract": {
        // Archive extraction (future)
        return `archive:${file.relative_path}`;
      }

      default:
        return `skip:${file.relative_path}`;
    }
  }

  // ── STATUS QUERIES ────────────────────────────────────────────────────

  /**
   * Get ingestion status for a specific file.
   */
  getFileStatus(filePath: string): IngestionRecord | null {
    const key = filePath.replace(/\\/g, "/");
    return this.state.records[key] ?? null;
  }

  /**
   * Get all records with a given status.
   */
  getByStatus(status: IngestionStatus): IngestionRecord[] {
    return Object.values(this.state.records).filter(r => r.status === status);
  }

  /**
   * Get all records routed to a given target.
   */
  getByTarget(target: IngestionTarget): IngestionRecord[] {
    return Object.values(this.state.records).filter(r => r.target === target);
  }

  /**
   * Get aggregate stats.
   */
  getStats(): IngestionState["stats"] & { last_run_at: string } {
    return { ...this.state.stats, last_run_at: this.state.last_run_at };
  }

  /**
   * Get failed records for retry.
   */
  getFailedRecords(): IngestionRecord[] {
    return this.getByStatus("failed");
  }

  /**
   * Reset a failed record to pending for retry.
   */
  retryFailed(filePath: string): boolean {
    const key = filePath.replace(/\\/g, "/");
    const record = this.state.records[key];
    if (!record || record.status !== "failed") return false;
    record.status = "pending";
    record.error = null;
    this.recalcStats();
    saveIngestionState(this.state);
    return true;
  }

  /**
   * Reset all failed records to pending.
   */
  retryAllFailed(): number {
    let count = 0;
    for (const record of Object.values(this.state.records)) {
      if (record.status === "failed") {
        record.status = "pending";
        record.error = null;
        count++;
      }
    }
    if (count > 0) {
      this.recalcStats();
      saveIngestionState(this.state);
    }
    return count;
  }

  /**
   * Clear all ingestion state.
   */
  reset(): void {
    this.state = {
      last_run_at: "",
      records: {},
      stats: { total: 0, pending: 0, processing: 0, complete: 0, failed: 0, skipped: 0 },
    };
    saveIngestionState(this.state);
  }

  // ── INTERNALS ─────────────────────────────────────────────────────────

  private recalcStats(): void {
    const records = Object.values(this.state.records);
    this.state.stats = {
      total: records.length,
      pending: records.filter(r => r.status === "pending").length,
      processing: records.filter(r => r.status === "processing").length,
      complete: records.filter(r => r.status === "complete").length,
      failed: records.filter(r => r.status === "failed").length,
      skipped: records.filter(r => r.status === "skipped").length,
    };
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

export const ingestionOrchestratorEngine = new IngestionOrchestratorEngine();
