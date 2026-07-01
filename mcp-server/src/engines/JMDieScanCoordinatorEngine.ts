/**
 * JMDieScanCoordinatorEngine — JM-DIE-FLEET-SCAN-MS0 / U-FS02
 *
 * Coordinates a 100K+-file scan of H:/prism/JM DIE/ by:
 *   1. Reading the JMDieScanLedger to know what's already scanned.
 *   2. Optionally reading existing baseline JSONs to extract their abs_paths
 *      (for the first cold run, before the ledger is seeded).
 *   3. Walking the archive via JMDieFleetWideIngestEngine.
 *   4. Computing the to_scan delta = walked - already_scanned.
 *   5. Splitting the delta into batches of ~batchSize files each.
 *   6. Tagging each batch with a suggested pipeline engine based on the
 *      file mix (cnc-program → GCodeTimeEstimator,
 *      docustrata-doc → JMDieDocustrataIngest).
 *
 * This engine is the BATCH PLANNER — it does NOT itself dispatch agents.
 * The caller (skill / dispatcher action) runs the parallel Agent fan-out
 * using the BatchPlan it returns. That keeps the engine pure (R5) +
 * test-only-with-fs (no live network / no subprocess spawn).
 *
 * R12: missing archiveRoot → explicit error in summary.errors[], never
 * silently returns zero batches.
 *
 * @milestone JM-DIE-FLEET-SCAN-MS0/U-FS02-SCAN-COORDINATOR
 * @author slot:charlie /goal-16 iter1, 2026-05-24
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { JMDieFleetWideIngestEngine, type FleetFileRecord } from "./JMDieFleetWideIngestEngine.js";
import { JMDieScanLedgerEngine, type AppendInput } from "./JMDieScanLedgerEngine.js";

export interface BatchPlanItem {
  abs_path: string;
  rel_path: string;
  size_bytes: number;
  mtime_iso: string;
  machine_family: string;
  extension: string;
  is_cnc_program: boolean;
}

export interface BatchPlan {
  batch_id: string;          // "B0001" style — sortable
  index: number;             // 0-based batch index
  file_count: number;
  cnc_program_count: number;
  docustrata_count: number;
  other_count: number;
  suggested_engine: "GCodeTimeEstimatorEngine" | "JMDieDocustrataIngestEngine" | "mixed";
  family_mix: Record<string, number>;
  files: BatchPlanItem[];
}

export interface PlanSummary {
  ok: boolean;
  archive_root: string;
  ledger_path: string;
  walked_files: number;
  already_scanned: number;
  to_scan: number;
  batch_count: number;
  batch_size: number;
  batches: BatchPlan[];
  errors: Array<{ path: string; reason: string }>;
}

export interface PlanOptions {
  archiveRoot: string;
  /** Files per batch (default 5000). */
  batchSize?: number;
  /** Hard cap on files walked (default 500_000 — safety ceiling). */
  walkLimit?: number;
  /** Hard cap on batches returned (default 100). */
  maxBatches?: number;
  /** Restrict walk to these subdirs (default: all). */
  subdirs?: string[];
  /** Additional abs_path Set to treat as already-scanned (for baseline-seed plumbing). */
  extraAlreadyScanned?: Set<string>;
  /** Override the ledger path (testing). */
  ledgerPath?: string;
}

const DOCUSTRATA_EXTENSIONS = new Set(["pdf", "docx", "doc", "xls", "xlsx", "jpg", "jpeg", "png", "tif", "tiff"]);

function classifyKind(extension: string, isCnc: boolean): "cnc-program" | "docustrata" | "other" {
  if (isCnc) return "cnc-program";
  if (DOCUSTRATA_EXTENSIONS.has(extension.toLowerCase())) return "docustrata";
  return "other";
}

function suggestEngine(cnc: number, docu: number): BatchPlan["suggested_engine"] {
  if (cnc > 0 && docu === 0) return "GCodeTimeEstimatorEngine";
  if (docu > 0 && cnc === 0) return "JMDieDocustrataIngestEngine";
  return "mixed";
}

export class JMDieScanCoordinatorEngine {
  private readonly fleetIngest: JMDieFleetWideIngestEngine;

  constructor(fleetIngest: JMDieFleetWideIngestEngine = new JMDieFleetWideIngestEngine()) {
    this.fleetIngest = fleetIngest;
  }

  /**
   * Extract abs_paths from the two known baseline JSONs (financial + program).
   * Returns the union set; missing files produce a 0-element contribution, not
   * an error (baselines are optional seed input).
   */
  loadBaselineScanned(baselinePaths: string[]): Set<string> {
    const out = new Set<string>();
    for (const p of baselinePaths) {
      if (!fs.existsSync(p)) continue;
      try {
        const raw = fs.readFileSync(p, "utf8");
        const json = JSON.parse(raw);
        // Financial baseline: ingest_summary.records is a count, abs_paths live nowhere → fall back to per-record arrays if present
        // Program analysis: programs_sample[].rel_path (NOT abs) — combine with archive root if known
        if (Array.isArray(json?.records)) {
          for (const r of json.records) {
            if (typeof r?.abs_path === "string") out.add(r.abs_path);
          }
        }
        if (Array.isArray(json?.programs_sample)) {
          for (const r of json.programs_sample) {
            if (typeof r?.abs_path === "string") out.add(r.abs_path);
            // rel_path → abs_path resolution requires a known root; the caller passes that via extraAlreadyScanned
          }
        }
      } catch {
        // Corrupt baseline JSON — skip; surface in errors[] is the coordinator's job, not this helper
      }
    }
    return out;
  }

  plan(opts: PlanOptions): PlanSummary {
    const summary: PlanSummary = {
      ok: false,
      archive_root: opts.archiveRoot,
      ledger_path: "",
      walked_files: 0,
      already_scanned: 0,
      to_scan: 0,
      batch_count: 0,
      batch_size: opts.batchSize ?? 5000,
      batches: [],
      errors: [],
    };
    if (!opts.archiveRoot || typeof opts.archiveRoot !== "string") {
      summary.errors.push({ path: String(opts.archiveRoot), reason: "empty-or-missing-archiveRoot" });
      return summary;
    }
    if (!fs.existsSync(opts.archiveRoot)) {
      summary.errors.push({ path: opts.archiveRoot, reason: "archive-root-does-not-exist" });
      return summary;
    }
    const ledger = new JMDieScanLedgerEngine(opts.ledgerPath);
    summary.ledger_path = ledger.getPath();
    const { paths: ledgerPaths, parse_errors } = ledger.loadScanned();
    if (parse_errors > 0) {
      summary.errors.push({ path: ledger.getPath(), reason: `ledger-parse-errors:${parse_errors}` });
    }
    const alreadyScanned = new Set<string>(ledgerPaths);
    if (opts.extraAlreadyScanned) {
      for (const p of opts.extraAlreadyScanned) alreadyScanned.add(p);
    }
    summary.already_scanned = alreadyScanned.size;

    const walkLimit = opts.walkLimit ?? 500_000;
    const ingest = this.fleetIngest.ingest(opts.archiveRoot, {
      limit: walkLimit,
      subdirs: opts.subdirs,
    });
    summary.walked_files = ingest.records.length;
    if (ingest.errors.length > 0) summary.errors.push(...ingest.errors);

    const delta: FleetFileRecord[] = [];
    for (const r of ingest.records) {
      if (alreadyScanned.has(r.abs_path)) continue;
      delta.push(r);
    }
    summary.to_scan = delta.length;

    const batchSize = summary.batch_size;
    const maxBatches = opts.maxBatches ?? 100;
    const batches: BatchPlan[] = [];
    for (let i = 0; i < delta.length && batches.length < maxBatches; i += batchSize) {
      const slice = delta.slice(i, i + batchSize);
      let cnc = 0, docu = 0, other = 0;
      const familyMix: Record<string, number> = {};
      const files: BatchPlanItem[] = [];
      for (const r of slice) {
        const kind = classifyKind(r.extension, r.is_cnc_program);
        if (kind === "cnc-program") cnc++;
        else if (kind === "docustrata") docu++;
        else other++;
        familyMix[r.machine_family] = (familyMix[r.machine_family] ?? 0) + 1;
        files.push({
          abs_path: r.abs_path,
          rel_path: r.rel_path,
          size_bytes: r.size_bytes,
          mtime_iso: r.mtime_iso,
          machine_family: r.machine_family,
          extension: r.extension,
          is_cnc_program: r.is_cnc_program,
        });
      }
      const idx = batches.length;
      batches.push({
        batch_id: `B${String(idx + 1).padStart(4, "0")}`,
        index: idx,
        file_count: slice.length,
        cnc_program_count: cnc,
        docustrata_count: docu,
        other_count: other,
        suggested_engine: suggestEngine(cnc, docu),
        family_mix: familyMix,
        files,
      });
    }
    summary.batches = batches;
    summary.batch_count = batches.length;
    summary.ok = summary.errors.length === 0;
    return summary;
  }

  /** Convenience: append a batch's results to the ledger after dispatch. */
  recordBatchScanned(batch: BatchPlan, source: AppendInput["source"] = "fleet-scan-batch"): { ok: true; appended: number; ledger_path: string } {
    const ledger = new JMDieScanLedgerEngine();
    const inputs: AppendInput[] = batch.files.map((f) => ({
      abs_path: f.abs_path,
      size_bytes: f.size_bytes,
      mtime_iso: f.mtime_iso,
      source,
      machine_family: f.machine_family,
      kind: classifyKind(f.extension, f.is_cnc_program),
    }));
    return ledger.appendBatch(inputs);
  }
}

export const jmDieScanCoordinatorEngine = new JMDieScanCoordinatorEngine();
