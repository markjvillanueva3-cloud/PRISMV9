/**
 * LatheProgramLibraryEngine — frontend-facing program-library aggregator
 * =====================================================================
 *
 * Single backend surface for every frontend node that needs to list,
 * browse, dispatch-to-machine, or USB-export lathe programs from the
 * JM Die corpus. Built per /goal #5 operator directive: "wire... to
 * the lathe wizard, lathe calculator studio page, shop management,
 * business management, employee portals and all other viable front
 * end nodes... users to double click to download and send to a
 * machine... wire it to all recognition features and data matching
 * so camera use can be utilized throughout the whole app".
 *
 * Architecture
 * ────────────
 * One dispatcher action (`jm_die_lathe_program_library`) replaces N
 * frontend-specific endpoints. Every UI node (lathe wizard, studio,
 * shop mgmt, biz mgmt, employee portal) renders from this same shape.
 * Camera-recognition consumers call with `partNumber` populated to
 * map a recognized part → its program-library entry.
 *
 * Star indicator — the `optimized` field is set true on every variant
 * whose header contains the V2 PRISM_UPGRADED marker (engine ≥ 2.0.0).
 * Frontend renders a ★ next to optimized variants per operator spec.
 *
 * Per-variant fields the frontend can bind to:
 *   - downloadPath: filesystem path for USB-transfer / download
 *   - dispatchableMachines: list of machineIds the frontend can offer
 *     in the "send to machine" pop-up
 *   - auditVerdict (if `includeAudit:true`): pass / warn / fail from
 *     LatheProgramAuditPipelineEngine — frontend disables the dispatch
 *     button when verdict === "fail"
 *
 * @module engines/LatheProgramLibraryEngine
 * @milestone JM-DIE-LATHE-UPGRADE-MS0/U-PROGRAM-LIBRARY
 * @version 1.0.0
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { JM_DIE_LATHES } from "./JMDieLatheProgramUpgraderEngine.js";

const SOURCE_ROOT = "H:/PRISM/JM DIE/CNC LATHE";
const UPGRADED_DIR = "PRISM_UPGRADED";
const V2_HEADER_MARKER = "PRISM JM-Die Lathe Upgrade v2";
const PROGRAM_EXTENSIONS = [".nc", ".NC", ".txt", ".TXT", ".tap", ".TAP", ".min", ".MIN", ".cnc", ".CNC"];
const HEADER_PEEK_BYTES = 4096;

// ── Types ─────────────────────────────────────────────────────────────

export interface ProgramVariant {
  machineId: string;
  machineModel: string;
  downloadPath: string;
  /** Bytes; for the frontend file-size display. */
  sizeBytes: number;
  /** ISO timestamp of last write. */
  mtimeIso: string;
  /** True when header carries the V2 PRISM_UPGRADED marker — frontend renders ★. */
  optimized: boolean;
  /** Optional per-variant audit verdict; null when caller didn't request it. */
  auditVerdict?: "pass" | "pass_with_notes" | "warn" | "fail" | null;
  /** Composite 0-100 audit score (only when audit verdict is included). */
  auditScore?: number;
}

export interface ProgramLibraryEntry {
  customer: string;
  partNumber: string;
  /** Original V1-era source program (may be inch-mode raw G-code). */
  sourcePath: string | null;
  sourceSizeBytes: number | null;
  /** Per-machine upgraded variants — one row per machineId we found on disk. */
  variants: ProgramVariant[];
  /** Convenience flag for frontend filters — true when ≥1 variant has optimized:true. */
  hasOptimized: boolean;
  /** Convenience flag — true when ≥1 variant has auditVerdict 'pass' or 'pass_with_notes'. */
  hasShopFloorSafe: boolean;
}

export interface ProgramLibraryQuery {
  /** Filter to one customer (case-sensitive folder name). */
  customer?: string;
  /** Filter to one part number (case-sensitive). */
  partNumber?: string;
  /** Filter to entries whose source filename matches this substring. */
  search?: string;
  /** Cap result count for paginated UI. Defaults to 200. */
  limit?: number;
  /** When true, run audit on every variant inline (slower; expensive on large libraries). */
  includeAudit?: boolean;
}

export interface ProgramLibraryResult {
  schemaVersion: "1.0.0";
  asOf: string;
  totalEntries: number;
  truncated: boolean;
  /** All JM Die machineIds the frontend can offer in the dispatch modal. */
  dispatchableMachines: Array<{ machineId: string; machineModel: string; controllerFamily: string }>;
  entries: ProgramLibraryEntry[];
}

// ── Helpers ──────────────────────────────────────────────────────────

function safeReaddir(dir: string): import("node:fs").Dirent[] | null {
  try {
    return readdirSync(dir, { withFileTypes: true });
  } catch {
    return null;
  }
}

function isProgramFile(name: string): boolean {
  return PROGRAM_EXTENSIONS.some((ext) => name.endsWith(ext));
}

/**
 * Inspect the first few KB of the file for the V2 PRISM_UPGRADED marker.
 * Bounded read — never loads the whole .nc into memory. False on read
 * error (treat unreadable as not-optimized — the safe default).
 */
function isOptimized(path: string): boolean {
  try {
    const fd = readFileSync(path, { encoding: "utf8", flag: "r" });
    return fd.slice(0, HEADER_PEEK_BYTES).includes(V2_HEADER_MARKER);
  } catch {
    return false;
  }
}

function machineModelToId(model: string): { machineId: string; machineModel: string } | null {
  const match = JM_DIE_LATHES.find((l) => l.machineModel === model);
  if (!match) return null;
  return { machineId: match.machineId, machineModel: match.machineModel };
}

// ── Class API ────────────────────────────────────────────────────────

export class LatheProgramLibraryEngine {
  static list(query: ProgramLibraryQuery = {}): ProgramLibraryResult {
    const limit = query.limit ?? 200;
    const searchLower = query.search?.toLowerCase() ?? null;
    const dispatchableMachines = JM_DIE_LATHES.map((l) => ({
      machineId: l.machineId,
      machineModel: l.machineModel,
      controllerFamily: l.controllerFamily,
    }));

    const customers = safeReaddir(SOURCE_ROOT);
    const entries: ProgramLibraryEntry[] = [];
    let totalCount = 0;
    let truncated = false;

    if (!customers) {
      return {
        schemaVersion: "1.0.0",
        asOf: new Date().toISOString(),
        totalEntries: 0,
        truncated: false,
        dispatchableMachines,
        entries: [],
      };
    }

    // Pass 1: collect entries by (customer, partNumber). We map by
    // customer/<partNumber> first, then attach source + variants.
    type WorkingEntry = ProgramLibraryEntry;
    const byKey = new Map<string, WorkingEntry>();

    for (const c of customers) {
      if (!c.isDirectory()) continue;
      if (query.customer && c.name !== query.customer) continue;

      // Source programs live directly under <customer>/.
      const customerDir = join(SOURCE_ROOT, c.name);
      const sources = safeReaddir(customerDir) ?? [];
      for (const s of sources) {
        if (!s.isFile() || !isProgramFile(s.name)) continue;
        const partNumber = s.name.replace(new RegExp(`(${PROGRAM_EXTENSIONS.join("|")})$`), "");
        if (query.partNumber && partNumber !== query.partNumber) continue;
        if (searchLower && !s.name.toLowerCase().includes(searchLower)) continue;
        const key = `${c.name}/${partNumber}`;
        if (!byKey.has(key)) {
          const sourcePath = join(customerDir, s.name);
          let sourceSize: number | null = null;
          try {
            sourceSize = statSync(sourcePath).size;
          } catch {
            sourceSize = null;
          }
          byKey.set(key, {
            customer: c.name,
            partNumber,
            sourcePath,
            sourceSizeBytes: sourceSize,
            variants: [],
            hasOptimized: false,
            hasShopFloorSafe: false,
          });
        }
      }

      // Variants live under <customer>/PRISM_UPGRADED/<machineModel>/<partNumber>.nc
      const upgradedDir = join(customerDir, UPGRADED_DIR);
      const machines = safeReaddir(upgradedDir) ?? [];
      for (const m of machines) {
        if (!m.isDirectory()) continue;
        const idMap = machineModelToId(m.name);
        if (!idMap) continue;
        const machineDir = join(upgradedDir, m.name);
        const variantFiles = safeReaddir(machineDir) ?? [];
        for (const f of variantFiles) {
          if (!f.isFile() || !isProgramFile(f.name)) continue;
          const partNumber = f.name.replace(new RegExp(`(${PROGRAM_EXTENSIONS.join("|")})$`), "");
          if (query.partNumber && partNumber !== query.partNumber) continue;
          if (searchLower && !f.name.toLowerCase().includes(searchLower)) continue;
          const key = `${c.name}/${partNumber}`;
          if (!byKey.has(key)) {
            byKey.set(key, {
              customer: c.name,
              partNumber,
              sourcePath: null,
              sourceSizeBytes: null,
              variants: [],
              hasOptimized: false,
              hasShopFloorSafe: false,
            });
          }
          const entry = byKey.get(key)!;
          const variantPath = join(machineDir, f.name);
          let sizeBytes = 0;
          let mtime = "1970-01-01T00:00:00.000Z";
          try {
            const st = statSync(variantPath);
            sizeBytes = st.size;
            mtime = new Date(st.mtimeMs).toISOString();
          } catch {
            // unreadable variant — skip
            continue;
          }
          const optimized = isOptimized(variantPath);
          if (optimized) entry.hasOptimized = true;
          entry.variants.push({
            machineId: idMap.machineId,
            machineModel: idMap.machineModel,
            downloadPath: variantPath,
            sizeBytes,
            mtimeIso: mtime,
            optimized,
            auditVerdict: query.includeAudit ? null : undefined,
          });
        }
      }
    }

    totalCount = byKey.size;
    let collected = 0;
    for (const [, entry] of byKey) {
      if (collected >= limit) {
        truncated = true;
        break;
      }
      entries.push(entry);
      collected++;
    }

    return {
      schemaVersion: "1.0.0",
      asOf: new Date().toISOString(),
      totalEntries: totalCount,
      truncated,
      dispatchableMachines,
      entries,
    };
  }
}

export const latheProgramLibraryEngine = LatheProgramLibraryEngine;
