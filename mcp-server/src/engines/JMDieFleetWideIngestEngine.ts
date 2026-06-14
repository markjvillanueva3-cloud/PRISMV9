// WIRE-EXEMPT: archive-walk ingest helper consumed via direct import by JMDieScanCoordinatorEngine
// (wired in quotingDispatcher) + the JMDie quoting/program-analysis integration pipelines.
// Transitively reachable through the wired scan-coordinator; not a standalone dispatcher action.
// (Orphan-flag resolved 2026-06-01 slot:bravo, U-ORPHAN-EXEMPT-AUDIT.)
/**
 * JMDieFleetWideIngestEngine — JM-DIE-PROGRAM-ANALYSIS-MS0 / U-JP04
 *
 * Walks the FULL JM Die archive root (not just _PART LIBRARY) and classifies
 * each subdirectory by machine family:
 *
 *   CNC LATHE, LATHE, OKUMA, HAAS-HURCO/<lathe-dirs>     → lathe
 *   CNC MILL HAAS, HURCO CNC PROGRAMS, HAAS-HURCO/<mill> → mill
 *   WIRE EDM, BASEBALL PARTS                              → wedm  (BB tooling often wire-EDM)
 *   CNC OKUMA MULTUS                                      → mill_turn
 *   ROKU-ROKU                                             → micro_mill
 *   _PART LIBRARY                                         → mixed (per-customer ingest via U-JM01)
 *   MATTHEW programs, MACRO PROGRAMS, SETUPS              → utility
 *   PRISM CAD TESTING, PRISM MODIFIED POST PROCESSORS     → tooling
 *
 * Per R5: pure file-walker. Per R12: missing root → explicit error.
 *
 * @milestone JM-DIE-PROGRAM-ANALYSIS-MS0/U-JP04-FLEET-WIDE-INGEST
 * @author slot:charlie /goal-15 iter2, 2026-05-24
 */

import * as fs from "node:fs";
import * as path from "node:path";

export type MachineFamily = "mill" | "lathe" | "wedm" | "sinker_edm" | "mill_turn" | "micro_mill" | "mixed" | "utility" | "tooling" | "unknown";

export interface FleetFileRecord {
  archive_subdir: string;
  machine_family: MachineFamily;
  rel_path: string;
  abs_path: string;
  extension: string;
  size_bytes: number;
  mtime_iso: string;
  /** True when filename suggests a CNC program (.nc/.min/.mpf/.eia/.iso/.pim/.h/.spf) */
  is_cnc_program: boolean;
}

export interface FleetIngestSummary {
  total_files_scanned: number;
  records: FleetFileRecord[];
  subdirs_walked: string[];
  by_family: Record<MachineFamily, number>;
  errors: Array<{ path: string; reason: string }>;
}

const SUBDIR_FAMILY_MAP: Record<string, MachineFamily> = {
  "CNC LATHE": "lathe",
  "LATHE": "lathe",
  "OKUMA": "lathe",
  "CNC MILL HAAS": "mill",
  "HURCO CNC PROGRAMS": "mill",
  "HAAS-HURCO": "mill",
  "WIRE EDM": "wedm",
  "BASEBALL PARTS": "wedm",
  "CNC OKUMA MULTUS": "mill_turn",
  "ROKU-ROKU": "micro_mill",
  "_PART LIBRARY": "mixed",
  "MATTHEW programs": "utility",
  "MACRO PROGRAMS": "utility",
  "SETUPS": "utility",
  "PRISM CAD TESTING": "tooling",
  "PRISM MODIFIED POST PROCESSORS": "tooling",
  "QUEUE": "utility",
  "REVERSE ENGINEERING": "tooling",
  "GENERAL BANDAGES": "utility",
  "JM DIE COMPANY": "utility",
};

const CNC_PROGRAM_EXTENSIONS = new Set(["nc", "min", "mpf", "eia", "iso", "pim", "h", "spf", "ssb", "f"]);

function isCncProgram(extension: string): boolean {
  return CNC_PROGRAM_EXTENSIONS.has(extension.toLowerCase());
}

function extOf(name: string): string {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i + 1).toLowerCase() : "";
}

function walkRecursive(root: string, base: string, out: FleetFileRecord[], family: MachineFamily, subdir: string, limit: number, errors: Array<{ path: string; reason: string }>): void {
  if (out.length >= limit) return;
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(root, { withFileTypes: true });
  } catch (err) {
    errors.push({ path: root, reason: `readdir-failed:${err instanceof Error ? err.message : String(err)}` });
    return;
  }
  for (const ent of entries) {
    if (out.length >= limit) return;
    const abs = path.join(root, ent.name);
    if (ent.isDirectory()) {
      walkRecursive(abs, base, out, family, subdir, limit, errors);
    } else if (ent.isFile()) {
      const ext = extOf(ent.name);
      let stat: fs.Stats;
      try { stat = fs.statSync(abs); } catch { continue; }
      const rel = path.relative(base, abs).replace(/\\/g, "/");
      out.push({
        archive_subdir: subdir,
        machine_family: family,
        rel_path: rel,
        abs_path: abs,
        extension: ext,
        size_bytes: stat.size,
        mtime_iso: stat.mtime.toISOString(),
        is_cnc_program: isCncProgram(ext),
      });
    }
  }
}

export class JMDieFleetWideIngestEngine {
  ingest(archiveRoot: string, opts: { limit?: number; subdirs?: string[] } = {}): FleetIngestSummary {
    const summary: FleetIngestSummary = {
      total_files_scanned: 0,
      records: [],
      subdirs_walked: [],
      by_family: { mill: 0, lathe: 0, wedm: 0, sinker_edm: 0, mill_turn: 0, micro_mill: 0, mixed: 0, utility: 0, tooling: 0, unknown: 0 },
      errors: [],
    };
    if (!archiveRoot || typeof archiveRoot !== "string") {
      summary.errors.push({ path: String(archiveRoot), reason: "empty-or-missing-archiveRoot" });
      return summary;
    }
    if (!fs.existsSync(archiveRoot)) {
      summary.errors.push({ path: archiveRoot, reason: "archive-root-does-not-exist" });
      return summary;
    }
    const limit = opts.limit ?? 1000;
    let subdirs: string[] = [];
    try {
      subdirs = fs.readdirSync(archiveRoot, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name);
    } catch (err) {
      summary.errors.push({ path: archiveRoot, reason: `readdir-archive-failed:${err instanceof Error ? err.message : String(err)}` });
      return summary;
    }

    const filterSet = opts.subdirs ? new Set(opts.subdirs) : null;
    for (const subdir of subdirs) {
      if (filterSet && !filterSet.has(subdir)) continue;
      if (summary.records.length >= limit) break;
      summary.subdirs_walked.push(subdir);
      const family = SUBDIR_FAMILY_MAP[subdir] ?? "unknown";
      const subdirAbs = path.join(archiveRoot, subdir);
      const before = summary.records.length;
      walkRecursive(subdirAbs, archiveRoot, summary.records, family, subdir, limit, summary.errors);
      summary.by_family[family] += summary.records.length - before;
    }
    summary.total_files_scanned = summary.records.length;
    return summary;
  }
}

export const jmDieFleetWideIngestEngine = new JMDieFleetWideIngestEngine();
