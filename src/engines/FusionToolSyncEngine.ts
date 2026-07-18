/**
 * FusionToolSyncEngine — Smart library partitioning and sync state tracking
 * for Fusion 360 tool library integration.
 *
 * Handles:
 * - Library partitioning: breaks large catalogs into F360-sized libraries (≤500 tools)
 * - Sync state tracking: persists push history to ~/.prism/fusion360/sync-state.json
 * - Job-based export: extracts only tools used in a specific CNC program
 * - User crib sync: diffs personal tool library against last sync state
 *
 * Actions: fusion_sync_tools (via camDispatcher)
 *
 * @module engines/FusionToolSyncEngine
 */

import { log } from "../utils/Logger.js";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import type { CatalogTool } from "./ToolCatalogEngine.js";

// ── Constants ────────────────────────────────────────────────────────

const MAX_TOOLS_PER_LIBRARY = 500;
const SYNC_DIR = path.join(os.homedir(), ".prism", "fusion360");
const SYNC_STATE_FILE = path.join(SYNC_DIR, "sync-state.json");

// ── Types ────────────────────────────────────────────────────────────

export interface SyncLibraryState {
  toolCount: number;
  lastSync: string; // ISO timestamp
  toolIds: string[];
}

export interface SyncState {
  libraries: Record<string, SyncLibraryState>;
  lastFullSync?: string;
}

export interface JobExportResult {
  tools: CatalogTool[];
  libraryName: string;
}

export interface CribSyncResult {
  added: string[];
  removed: string[];
  unchanged: string[];
}

// ── Helpers ──────────────────────────────────────────────────────────

/** Normalize tool type for library naming */
function typeLabel(type: string): string {
  const map: Record<string, string> = {
    end_mill: "EndMills", ball_mill: "BallMills", bull_mill: "BullMills",
    face_mill: "FaceMills", drill: "Drills", tap: "Taps",
    reamer: "Reamers", boring_bar: "BoringBars", insert: "Inserts",
    turning_tool: "TurningTools", threading_tool: "ThreadingTools",
    grooving_tool: "GroovingTools", chamfer_mill: "ChamferMills",
    slot_drill: "SlotDrills",
  };
  return map[type] ?? type.replace(/[^a-zA-Z0-9]/g, "");
}

/** Sanitize manufacturer name for library naming */
function mfrLabel(manufacturer: string): string {
  return manufacturer.replace(/[^a-zA-Z0-9]/g, "").substring(0, 20);
}

// ── Engine ───────────────────────────────────────────────────────────

export class FusionToolSyncEngine {

  // ── Library Partitioning ─────────────────────────────────────────

  /**
   * Partition tools into F360-sized libraries grouped by manufacturer + type.
   * F360 performance degrades with >500 tools per library, so large groups
   * are split into numbered sub-libraries.
   */
  partitionForExport(
    tools: CatalogTool[],
    maxPerLibrary: number = MAX_TOOLS_PER_LIBRARY
  ): Map<string, CatalogTool[]> {
    // Group by manufacturer + type
    const groups = new Map<string, CatalogTool[]>();
    for (const tool of tools) {
      const key = `PRISM_${mfrLabel(tool.manufacturer)}_${typeLabel(tool.type)}`;
      const arr = groups.get(key) ?? [];
      arr.push(tool);
      groups.set(key, arr);
    }

    // Split oversized groups
    const result = new Map<string, CatalogTool[]>();
    for (const [key, groupTools] of Array.from(groups.entries())) {
      if (groupTools.length <= maxPerLibrary) {
        result.set(key, groupTools);
      } else {
        const chunks = Math.ceil(groupTools.length / maxPerLibrary);
        for (let i = 0; i < chunks; i++) {
          const chunkName = `${key}_Part${i + 1}`;
          result.set(chunkName, groupTools.slice(i * maxPerLibrary, (i + 1) * maxPerLibrary));
        }
      }
    }

    log.info(`[FusionToolSync] Partitioned ${tools.length} tools into ${result.size} libraries`);
    return result;
  }

  // ── Sync State ───────────────────────────────────────────────────

  /** Read persisted sync state from disk. */
  getSyncState(): SyncState {
    try {
      if (fs.existsSync(SYNC_STATE_FILE)) {
        const raw = fs.readFileSync(SYNC_STATE_FILE, "utf-8");
        return JSON.parse(raw) as SyncState;
      }
    } catch (err) {
      log.warn(`[FusionToolSync] Failed to read sync state: ${err}`);
    }
    return { libraries: {} };
  }

  /** Update sync state for a specific library after push. */
  updateSyncState(libraryName: string, toolIds: string[]): void {
    const state = this.getSyncState();
    state.libraries[libraryName] = {
      toolCount: toolIds.length,
      lastSync: new Date().toISOString(),
      toolIds,
    };
    this._persistState(state);
    log.info(`[FusionToolSync] Updated sync state for "${libraryName}" (${toolIds.length} tools)`);
  }

  /** Mark a full sync timestamp. */
  markFullSync(): void {
    const state = this.getSyncState();
    state.lastFullSync = new Date().toISOString();
    this._persistState(state);
  }

  /**
   * Return tools that have NOT been synced to any F360 library.
   * Compares tool IDs against all persisted library states.
   */
  getUnsyncedTools(allTools: CatalogTool[]): CatalogTool[] {
    const state = this.getSyncState();
    const syncedIds = new Set<string>();
    const libs = Object.values(state.libraries);
    for (let i = 0; i < libs.length; i++) {
      const ids = libs[i].toolIds;
      for (let j = 0; j < ids.length; j++) syncedIds.add(ids[j]);
    }
    return allTools.filter(t => !syncedIds.has(t.id));
  }

  // ── Job-Based Export ─────────────────────────────────────────────

  /**
   * Export only tools referenced by a CNC program.
   * Creates a timestamped job library.
   */
  exportJobTools(
    toolIds: string[],
    allTools: CatalogTool[]
  ): JobExportResult {
    const idSet = new Set(toolIds);
    const matched = allTools.filter(t => idSet.has(t.id));
    const ts = new Date().toISOString().replace(/[:.]/g, "-").substring(0, 19);
    const libraryName = `PRISM_Job_${ts}`;
    log.info(`[FusionToolSync] Job export: ${matched.length}/${toolIds.length} tools → "${libraryName}"`);
    return { tools: matched, libraryName };
  }

  // ── User Crib Sync ──────────────────────────────────────────────

  /**
   * Diff a user's personal tool library against last sync state.
   * Returns added/removed/unchanged tool IDs.
   */
  syncUserCrib(userTools: { id: string;[key: string]: unknown }[]): CribSyncResult {
    const CRIB_LIB = "PRISM_UserCrib";
    const state = this.getSyncState();
    const prevIds = new Set(state.libraries[CRIB_LIB]?.toolIds ?? []);
    const currentIds = new Set(userTools.map(t => t.id));

    const added: string[] = [];
    const removed: string[] = [];
    const unchanged: string[] = [];

    Array.from(currentIds).forEach(id => {
      if (prevIds.has(id)) unchanged.push(id);
      else added.push(id);
    });
    Array.from(prevIds).forEach(id => {
      if (!currentIds.has(id)) removed.push(id);
    });

    // Update state with current crib contents
    this.updateSyncState(CRIB_LIB, Array.from(currentIds));

    log.info(`[FusionToolSync] Crib sync: +${added.length} -${removed.length} =${unchanged.length}`);
    return { added, removed, unchanged };
  }

  // ── Summary ──────────────────────────────────────────────────────

  /** Get a summary of current sync state for display. */
  getSyncSummary(): {
    libraryCount: number;
    totalToolsSynced: number;
    lastFullSync: string | null;
    libraries: { name: string; toolCount: number; lastSync: string }[];
  } {
    const state = this.getSyncState();
    const libs = Object.entries(state.libraries).map(([name, s]) => ({
      name,
      toolCount: s.toolCount,
      lastSync: s.lastSync,
    }));
    return {
      libraryCount: libs.length,
      totalToolsSynced: libs.reduce((sum, l) => sum + l.toolCount, 0),
      lastFullSync: state.lastFullSync ?? null,
      libraries: libs,
    };
  }

  // ── Private ──────────────────────────────────────────────────────

  private _persistState(state: SyncState): void {
    try {
      if (!fs.existsSync(SYNC_DIR)) {
        fs.mkdirSync(SYNC_DIR, { recursive: true });
      }
      fs.writeFileSync(SYNC_STATE_FILE, JSON.stringify(state, null, 2), "utf-8");
    } catch (err) {
      log.warn(`[FusionToolSync] Failed to persist sync state: ${err}`);
    }
  }
}

// ── Singleton ────────────────────────────────────────────────────────

export const fusionToolSyncEngine = new FusionToolSyncEngine();
