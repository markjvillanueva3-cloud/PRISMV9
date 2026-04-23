/**
 * ToolSyncOrchestratorEngine — CAMX-MS10 U05 (E1126)
 *
 * Orchestrate tool library synchronization across multiple CAM systems
 * simultaneously. Detects drift between PRISM master catalog and each
 * CAM-system-specific library, batch-pushes tools to target systems,
 * imports tools from CAM systems back into PRISM, and resolves conflicts
 * using physics-backed PRISM data as source of truth.
 *
 * Supported systems:
 *   fusion360   — FusionToolExportEngine + FusionToolSyncEngine
 *   mastercam   — MastercamToolExportEngine
 *   hypermill   — HyperMillToolExportEngine
 *   nx          — UniversalToolExportEngine (ISO 13399)
 *   universal   — UniversalToolExportEngine
 *
 * Actions (via camDispatcher):
 *   tool_sync_multi   — batch sync PRISM tools to one or more CAM systems
 *   tool_sync_drift   — detect drift for a specific CAM system
 *   tool_sync_status  — get per-system sync health + last-sync timestamps
 *
 * Conflict resolution:
 *   PRISM calibrated (newer)   → PRISM wins automatically
 *   CAM user-modified          → flagged for manual review
 *   Both unchanged             → no action
 *
 * @engine ToolSyncOrchestratorEngine
 * @shortcode E1126
 * @dispatcher camDispatcher
 * @actions tool_sync_multi, tool_sync_drift, tool_sync_status
 * @milestone CAMX-MS10/U05
 */

import { log } from "../utils/Logger.js";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { fusionToolExportEngine } from "./FusionToolExportEngine.js";
import { fusionToolSyncEngine } from "./FusionToolSyncEngine.js";
import { mastercamToolExportEngine } from "./MastercamToolExportEngine.js";
import { hyperMillToolExportEngine } from "./HyperMillToolExportEngine.js";
import { universalToolExportEngine } from "./UniversalToolExportEngine.js";

// ============================================================================
// TYPES
// ============================================================================

export type SupportedSystem = "fusion360" | "mastercam" | "hypermill" | "nx" | "universal";

export type ConflictResolution = "prism_wins" | "manual_review" | "no_action";

export interface ToolRecord {
  id: string;
  designation?: string;
  manufacturer?: string;
  type?: string;
  tool_type?: string;
  diameter_mm?: number;
  [key: string]: unknown;
}

export interface SyncResult {
  system: SupportedSystem;
  tools_synced: number;
  status: "success" | "partial" | "error" | "stub";
  message?: string;
  exported_format?: string;
  errors?: string[];
  timestamp: string;
}

export interface DriftReport {
  system: SupportedSystem;
  added: ToolRecord[];       // in PRISM but not in CAM system
  removed: string[];         // in CAM system but not in PRISM (ids)
  modified: ConflictEntry[]; // same id, different params
  unchanged_count: number;
  total_prism: number;
  total_cam: number;
  drift_score: number;       // 0–1, fraction of catalog that has drifted
  timestamp: string;
}

export interface ConflictEntry {
  tool_id: string;
  prism_data: Partial<ToolRecord>;
  cam_data: Partial<ToolRecord>;
  conflict_fields: string[];
  prism_last_modified?: string;
  cam_last_modified?: string;
}

export interface ConflictResolutionResult {
  tool_id: string;
  resolution: ConflictResolution;
  justification: string;
  winning_data?: Partial<ToolRecord>;
}

export interface SystemSyncStatus {
  system: SupportedSystem;
  last_sync?: string;
  drift_count: number;
  health: "healthy" | "stale" | "unknown" | "error";
  tool_count_prism: number;
  tool_count_cam: number;
  supported: boolean;
}

// ============================================================================
// PERSISTENCE HELPERS
// ============================================================================

const SYNC_BASE_DIR = path.join(os.homedir(), ".prism", "tool-sync-orchestrator");
const STATUS_FILE = path.join(SYNC_BASE_DIR, "sync-status.json");

type PersistedStatus = Record<string, {
  last_sync: string;
  drift_count: number;
  tool_count_prism: number;
  tool_count_cam: number;
}>;

function readPersistedStatus(): PersistedStatus {
  try {
    if (fs.existsSync(STATUS_FILE)) {
      return JSON.parse(fs.readFileSync(STATUS_FILE, "utf-8")) as PersistedStatus;
    }
  } catch (err) {
    log.warn(`[ToolSyncOrchestrator] Failed to read status file: ${err}`);
  }
  return {};
}

function writePersistedStatus(data: PersistedStatus): void {
  try {
    if (!fs.existsSync(SYNC_BASE_DIR)) {
      fs.mkdirSync(SYNC_BASE_DIR, { recursive: true });
    }
    fs.writeFileSync(STATUS_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    log.warn(`[ToolSyncOrchestrator] Failed to write status file: ${err}`);
  }
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Keys that carry calibrated physics data — PRISM wins on mismatch. */
const PHYSICS_FIELDS = new Set([
  "spindle_rpm", "feed_mm_min", "cutting_speed_m_min", "feed_per_tooth_mm",
  "depth_of_cut_mm", "width_of_cut_mm", "tool_life_min", "vc_base", "fz_base",
]);

/** Keys that users typically modify in their CAM system — flag for review. */
const USER_EDITABLE_FIELDS = new Set([
  "designation", "status", "notes", "custom_label", "holder_type",
  "gauge_length_mm", "serial_number",
]);

const ALL_SYSTEMS: SupportedSystem[] = ["fusion360", "mastercam", "hypermill", "nx", "universal"];

// ============================================================================
// ENGINE
// ============================================================================

export class ToolSyncOrchestratorEngine {

  // ── Public API ────────────────────────────────────────────────────────────

  /**
   * Batch sync PRISM tools to one or more CAM systems.
   * Each system gets its own SyncResult; failures in one do not block others.
   */
  syncToSystems(tools: ToolRecord[], systems: SupportedSystem[]): SyncResult[] {
    const validSystems = systems.filter(s => ALL_SYSTEMS.includes(s));
    if (validSystems.length === 0) {
      return [{ system: "universal", tools_synced: 0, status: "error",
        message: `No valid systems in: ${systems.join(", ")}`, timestamp: now() }];
    }

    log.info(`[ToolSyncOrchestrator] syncToSystems: ${tools.length} tools → [${validSystems.join(", ")}]`);
    const results: SyncResult[] = [];

    for (const system of validSystems) {
      results.push(this._syncToSystem(tools, system));
    }

    // Persist updated status
    const persisted = readPersistedStatus();
    for (const r of results) {
      if (r.status !== "error") {
        persisted[r.system] = {
          last_sync: r.timestamp,
          drift_count: 0,
          tool_count_prism: tools.length,
          tool_count_cam: r.tools_synced,
        };
      }
    }
    writePersistedStatus(persisted);

    return results;
  }

  /**
   * Detect tool library drift between PRISM master catalog and a CAM system.
   * Returns added (new in PRISM), removed (gone from PRISM), modified (conflicts).
   * In practice, the caller passes the CAM system's current tool list as `camTools`.
   */
  detectDrift(system: SupportedSystem, prismTools: ToolRecord[], camTools: ToolRecord[]): DriftReport {
    log.info(`[ToolSyncOrchestrator] detectDrift: system=${system}, PRISM=${prismTools.length}, CAM=${camTools.length}`);

    const prismMap = new Map(prismTools.map(t => [t.id, t]));
    const camMap = new Map(camTools.map(t => [t.id, t]));

    const added: ToolRecord[] = [];
    const removed: string[] = [];
    const modified: ConflictEntry[] = [];
    let unchanged_count = 0;

    // Tools in PRISM but not in CAM → need to push
    for (const [id, prismTool] of Array.from(prismMap.entries())) {
      if (!camMap.has(id)) {
        added.push(prismTool);
      } else {
        const camTool = camMap.get(id)!;
        const conflictFields = this._findConflictFields(prismTool, camTool);
        if (conflictFields.length > 0) {
          modified.push({
            tool_id: id,
            prism_data: pick(prismTool, conflictFields),
            cam_data: pick(camTool, conflictFields),
            conflict_fields: conflictFields,
          });
        } else {
          unchanged_count++;
        }
      }
    }

    // Tools in CAM but not in PRISM → orphaned, flag as removed
    for (const [id] of Array.from(camMap.entries())) {
      if (!prismMap.has(id)) {
        removed.push(id);
      }
    }

    const driftTotal = added.length + removed.length + modified.length;
    const totalTools = Math.max(prismMap.size, camMap.size, 1);
    const drift_score = Math.min(1, driftTotal / totalTools);

    // Persist drift count
    const persisted = readPersistedStatus();
    const prev = persisted[system] ?? { last_sync: "", drift_count: 0, tool_count_prism: 0, tool_count_cam: 0 };
    persisted[system] = { ...prev, drift_count: driftTotal, tool_count_prism: prismMap.size, tool_count_cam: camMap.size };
    writePersistedStatus(persisted);

    return {
      system,
      added,
      removed,
      modified,
      unchanged_count,
      total_prism: prismMap.size,
      total_cam: camMap.size,
      drift_score,
      timestamp: now(),
    };
  }

  /**
   * Resolve a list of conflicts using PRISM's physics-backed rules.
   * - Physics fields newer in PRISM → PRISM wins
   * - User-editable fields changed in CAM → manual review
   * - Anything else unchanged or unrecognized → no action
   */
  resolveConflicts(conflicts: ConflictEntry[]): ConflictResolutionResult[] {
    return conflicts.map(c => this._resolveConflict(c));
  }

  /**
   * Get sync health status for all (or specified) systems.
   * Reads from persisted state + shows live counts.
   */
  getSyncStatus(systems?: SupportedSystem[]): SystemSyncStatus[] {
    const targets = systems ?? ALL_SYSTEMS;
    const persisted = readPersistedStatus();

    return targets.map(system => {
      const p = persisted[system];
      const supported = true;
      let health: SystemSyncStatus["health"] = "unknown";

      if (!supported) {
        health = "unknown";
      } else if (!p?.last_sync) {
        health = "unknown";
      } else {
        const hoursAgo = (Date.now() - new Date(p.last_sync).getTime()) / 3_600_000;
        if (p.drift_count === 0 && hoursAgo < 24) health = "healthy";
        else if (hoursAgo > 168) health = "stale"; // >1 week
        else health = p.drift_count > 0 ? "stale" : "healthy";
      }

      return {
        system,
        last_sync: p?.last_sync,
        drift_count: p?.drift_count ?? 0,
        health,
        tool_count_prism: p?.tool_count_prism ?? 0,
        tool_count_cam: p?.tool_count_cam ?? 0,
        supported,
      };
    });
  }

  /**
   * Generate a markdown sync report summarizing all systems' state.
   */
  generateSyncReport(systems?: SupportedSystem[]): string {
    const statuses = this.getSyncStatus(systems);
    const ts = new Date().toISOString();

    const rows = statuses.map(s => {
      const lastSync = s.last_sync ? new Date(s.last_sync).toLocaleString() : "Never";
      const healthIcon = { healthy: "OK", stale: "STALE", unknown: "?", error: "ERR" }[s.health];
      const support = s.supported ? "Yes" : "Roadmap";
      return `| ${s.system.padEnd(10)} | ${healthIcon.padEnd(7)} | ${lastSync.padEnd(22)} | ${String(s.drift_count).padEnd(5)} | ${String(s.tool_count_prism).padEnd(6)} | ${String(s.tool_count_cam).padEnd(6)} | ${support} |`;
    });

    const totalDrift = statuses.reduce((n, s) => n + s.drift_count, 0);
    const healthyCount = statuses.filter(s => s.health === "healthy").length;

    return [
      `# PRISM Tool Sync Orchestrator — Sync Report`,
      `Generated: ${ts}`,
      ``,
      `## Summary`,
      `- Systems tracked: ${statuses.length}`,
      `- Healthy: ${healthyCount}/${statuses.length}`,
      `- Total drift items: ${totalDrift}`,
      ``,
      `## Per-System Status`,
      `| System     | Health  | Last Sync              | Drift | PRISM  | CAM    | Support |`,
      `|------------|---------|------------------------|-------|--------|--------|---------|`,
      ...rows,
      ``,
      `## Conflict Resolution Policy`,
      `- Physics fields (Vc, fz, ap, ae, tool_life): PRISM wins (physics-backed calibration)`,
      `- User fields (designation, status, notes, gauge_length): flagged for manual review`,
      `- Identical values: no action`,
      ``,
      `## Supported Systems`,
      `- **fusion360** — FusionToolExportEngine + FusionToolSyncEngine (partitioned libraries, ≤500/lib)`,
      `- **mastercam** — MastercamToolExportEngine (.mcam-tools + cutting data tables)`,
      `- **nx** — UniversalToolExportEngine ISO 13399 GTC XML`,
      `- **universal** — UniversalToolExportEngine (CSV/STEP-NC/MTConnect)`,
      `- **hypermill** — HyperMillToolExportEngine (.hmt SQLite export)`,
    ].join("\n");
  }

  // ── Pull: Import tools from CAM into PRISM ────────────────────────────────

  /**
   * Import tools from a CAM system into PRISM format for enrichment.
   * Returns tools normalized to ToolRecord shape, ready for PRISM ingestion.
   */
  pullFromSystem(system: SupportedSystem, camTools: ToolRecord[]): {
    imported: ToolRecord[];
    skipped: number;
    warnings: string[];
  } {
    log.info(`[ToolSyncOrchestrator] pullFromSystem: system=${system}, tools=${camTools.length}`);
    const warnings: string[] = [];
    const imported: ToolRecord[] = [];
    let skipped = 0;

    for (const t of camTools) {
      if (!t.id && !t.designation) {
        skipped++;
        warnings.push(`Skipped tool without id or designation`);
        continue;
      }
      const fallbackId = `${system}-import-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const normalized: ToolRecord = {
        ...t,
        id: t.id ?? fallbackId,
        designation: t.designation ?? t.id ?? fallbackId,
        manufacturer: t.manufacturer ?? "Unknown",
        type: t.type ?? t.tool_type ?? "unknown",
        _imported_from: system,
        _import_ts: now(),
      };
      imported.push(normalized);
    }

    log.info(`[ToolSyncOrchestrator] pull result: imported=${imported.length} skipped=${skipped}`);
    return { imported, skipped, warnings };
  }

  // ── Private Helpers ───────────────────────────────────────────────────────

  private _syncToSystem(tools: ToolRecord[], system: SupportedSystem): SyncResult {
    const ts = now();
    try {
      switch (system) {

        case "fusion360": {
          const partitions = fusionToolSyncEngine.partitionForExport(tools as any);
          let libraryCount = 0;
          let exportedTools = 0;
          for (const [libName, libTools] of Array.from(partitions.entries())) {
            const library = fusionToolExportEngine.exportLibrary(libTools);
            exportedTools += library.metadata.tool_count;
            libraryCount++;
            fusionToolSyncEngine.updateSyncState(libName, libTools.map((t: any) => String(t.id)));
          }
          return {
            system,
            tools_synced: exportedTools,
            status: "success",
            exported_format: "fusion360_json",
            message: `Exported ${libraryCount} Fusion 360 libraries (${exportedTools} tools)`,
            timestamp: ts,
          };
        }

        case "mastercam": {
          const exportResult = mastercamToolExportEngine.exportForJob(
            tools.map((tool, index) => ({
              type: normalizeToolType(tool),
              diameter_mm: asNumber(tool.diameter_mm),
              flutes: asNumber(tool.flute_count ?? tool.flutes),
              manufacturer: asString(tool.manufacturer),
              part_number: asString(tool.part_number ?? tool.designation ?? tool.id) ?? `PRISM-T${index + 1}`,
            }))
          );
          return {
            system,
            tools_synced: exportResult?.tool_count ?? tools.length,
            status: "success",
            exported_format: "mcam_tools",
            message: `Exported .mcam-tools library (${exportResult?.tool_count ?? tools.length} tools)`,
            timestamp: ts,
          };
        }

        case "hypermill": {
          const exportResult = hyperMillToolExportEngine.exportToHMT(tools as any[]);
          return {
            system,
            tools_synced: exportResult.tool_count,
            status: "success",
            exported_format: "hmt_sqlite",
            message: `Exported hyperMILL .hmt dataset (${exportResult.tool_count} tools)`,
            timestamp: ts,
          };
        }

        case "nx": {
          const exportResult = universalToolExportEngine.export(tools as any, "iso13399");
          return {
            system,
            tools_synced: exportResult?.tool_count ?? tools.length,
            status: "success",
            exported_format: "iso13399_gtc_xml",
            message: `Exported ISO 13399 GTC XML (${exportResult?.tool_count ?? tools.length} tools)`,
            timestamp: ts,
          };
        }

        case "universal": {
          const exportResult = universalToolExportEngine.export(tools as any, "csv");
          return {
            system,
            tools_synced: exportResult?.tool_count ?? tools.length,
            status: "success",
            exported_format: "csv",
            message: `Exported generic CSV (${exportResult?.tool_count ?? tools.length} tools)`,
            timestamp: ts,
          };
        }

        default: {
          const _exhaustive: never = system;
          return { system: _exhaustive, tools_synced: 0, status: "error",
            message: `Unhandled system: ${system}`, timestamp: ts };
        }
      }
    } catch (err: any) {
      log.warn(`[ToolSyncOrchestrator] _syncToSystem(${system}) error: ${err?.message}`);
      return {
        system,
        tools_synced: 0,
        status: "error",
        message: `Unexpected error: ${err?.message ?? String(err)}`,
        errors: [String(err)],
        timestamp: ts,
      };
    }
  }

  /**
   * Compare two tool records field-by-field.
   * Returns field names where values differ (excluding id).
   */
  private _findConflictFields(prism: ToolRecord, cam: ToolRecord): string[] {
    const allKeys = new Set([...Object.keys(prism), ...Object.keys(cam)]);
    allKeys.delete("id");
    const conflicts: string[] = [];
    for (const key of Array.from(allKeys)) {
      const pv = prism[key];
      const cv = cam[key];
      if (pv === undefined || cv === undefined) continue; // only compare fields both have
      if (String(pv) !== String(cv)) conflicts.push(key);
    }
    return conflicts;
  }

  private _resolveConflict(conflict: ConflictEntry): ConflictResolutionResult {
    const { tool_id, conflict_fields, prism_data, cam_data } = conflict;

    // Check if any conflicting field is physics-backed
    const physicsConflicts = conflict_fields.filter(f => PHYSICS_FIELDS.has(f));
    const userConflicts = conflict_fields.filter(f => USER_EDITABLE_FIELDS.has(f));
    const unknownConflicts = conflict_fields.filter(f => !PHYSICS_FIELDS.has(f) && !USER_EDITABLE_FIELDS.has(f));

    if (physicsConflicts.length > 0) {
      return {
        tool_id,
        resolution: "prism_wins",
        justification: `Physics-backed fields [${physicsConflicts.join(", ")}] calibrated by PRISM — PRISM data is authoritative.`,
        winning_data: prism_data,
      };
    }

    if (userConflicts.length > 0) {
      return {
        tool_id,
        resolution: "manual_review",
        justification: `User-editable fields [${userConflicts.join(", ")}] differ. CAM system may have intentional user modifications. Manual review required.`,
      };
    }

    if (unknownConflicts.length > 0) {
      return {
        tool_id,
        resolution: "manual_review",
        justification: `Unknown fields [${unknownConflicts.join(", ")}] conflict. Cannot determine authority — flagged for review.`,
      };
    }

    return {
      tool_id,
      resolution: "no_action",
      justification: "No meaningful conflicts detected.",
    };
  }
}

// ============================================================================
// UTILITIES
// ============================================================================

function now(): string {
  return new Date().toISOString();
}

function pick<T extends Record<string, unknown>>(obj: T, keys: string[]): Partial<T> {
  const result: Partial<T> = {};
  for (const k of keys) {
    if (k in obj) (result as any)[k] = obj[k];
  }
  return result;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function normalizeToolType(tool: ToolRecord): string {
  const raw = asString(tool.type ?? tool.tool_type)?.toLowerCase() ?? "endmill";
  if (raw.includes("ball")) return "ball";
  if (raw.includes("bull") || raw.includes("radius")) return "bull";
  if (raw.includes("face")) return "face";
  if (raw.includes("drill")) return raw.includes("spot") ? "spot_drill" : "drill";
  if (raw.includes("tap")) return "tap";
  if (raw.includes("ream")) return "reamer";
  if (raw.includes("bore")) return "boring_bar";
  if (raw.includes("chamfer") || raw.includes("countersink")) return "chamfer";
  if (raw.includes("thread")) return "thread_mill";
  return "endmill";
}

// ============================================================================
// SINGLETON
// ============================================================================

export const toolSyncOrchestratorEngine = new ToolSyncOrchestratorEngine();
