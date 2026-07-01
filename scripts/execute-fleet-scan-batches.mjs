#!/usr/bin/env node
/**
 * Execute fleet-scan batches: walk + plan + per-batch ingest + ledger-record.
 * Honors the "every single file accounted for" directive:
 *   • CNC programs (.nc/.min/.mpf/.eia/.iso/etc) → parsed by GCodeTimeEstimatorEngine
 *   • Docustrata (.pdf/.docx/.xls/images) → counted only (parsing requires the
 *     PDF/OCR pipeline; this script is the inventory layer)
 *   • Other (.mcx-8/.mc6/.stl/.dxf/binary CAM sources) → inventoried only
 *
 * Every walked file → 1 ledger row. Re-run is idempotent (ledger Set dedup).
 *
 * Output: state/shared/specs/JM-DIE-FLEET-SCAN-2026-05-24.json with batch
 * summaries and aggregate counters.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { jmDieScanCoordinatorEngine } from "../mcp-server/dist/engines/JMDieScanCoordinatorEngine.js";
import { jmDieScanLedgerEngine } from "../mcp-server/dist/engines/JMDieScanLedgerEngine.js";
import { gCodeTimeEstimatorEngine } from "../mcp-server/dist/engines/GCodeTimeEstimatorEngine.js";
import { fairMarketValueEngine } from "../mcp-server/dist/engines/FairMarketValueEngine.js";

const ARCHIVE_ROOT = "H:/prism/JM DIE";
const OUTPUT_PATH = "H:/prism/state/shared/specs/JM-DIE-FLEET-SCAN-2026-05-24.json";
const SUBDIRS = ["CNC MILL HAAS", "HURCO CNC PROGRAMS", "WIRE EDM", "CNC OKUMA MULTUS", "ROKU-ROKU", "MACRO PROGRAMS"];
const BATCH_SIZE = 2000;
const MAX_BATCHES = 5;
const WALK_LIMIT = 12000;
const MACHINE_RATE = 95;
const MATERIAL_SPEND = 75;

function parseProgram(absPath) {
  let text = "";
  try { text = fs.readFileSync(absPath, "utf8"); } catch { return null; }
  if (text.length === 0 || text.length > 5_000_000) return null;
  // Reject binary-ish content (>10% non-printable in first 2KB)
  const sample = text.slice(0, 2048);
  let nonPrint = 0;
  for (let i = 0; i < sample.length; i++) {
    const c = sample.charCodeAt(i);
    if (c < 9 || (c > 13 && c < 32) || c === 127) nonPrint++;
  }
  if (nonPrint / sample.length > 0.1) return null;
  const gca = gCodeTimeEstimatorEngine.analyze(text);
  if (!gca.ok) return null;
  const fmv = fairMarketValueEngine.estimate({
    time_in_cut_s: gca.total_time_s,
    machine_rate_usd_per_hr: MACHINE_RATE,
    material_spend_usd: MATERIAL_SPEND,
  });
  return {
    dialect: gca.dialect,
    block_count: gca.block_count,
    tool_changes: gca.tool_change_count,
    total_time_s: gca.total_time_s,
    fmv_usd: fmv.ok ? fmv.fmv_usd : null,
  };
}

function main() {
  console.log("[scan] planning batches…");
  const plan = jmDieScanCoordinatorEngine.plan({
    archiveRoot: ARCHIVE_ROOT,
    batchSize: BATCH_SIZE,
    maxBatches: MAX_BATCHES,
    walkLimit: WALK_LIMIT,
    subdirs: SUBDIRS,
  });
  if (!plan.ok) {
    console.error("[scan] plan FAILED:", JSON.stringify(plan.errors));
    process.exit(2);
  }
  console.log(`[scan] walked=${plan.walked_files} already_scanned=${plan.already_scanned} to_scan=${plan.to_scan} batches=${plan.batch_count}`);

  const batchSummaries = [];
  let aggregateParsed = 0;
  let aggregateTotalTimeS = 0;
  let aggregateFmvUsd = 0;
  let aggregateInventoried = 0;

  for (const batch of plan.batches) {
    console.log(`[scan] batch ${batch.batch_id} — ${batch.file_count} files (${batch.cnc_program_count} cnc, ${batch.docustrata_count} docu, ${batch.other_count} other)`);
    let parsedThisBatch = 0;
    let timeThisBatch = 0;
    let fmvThisBatch = 0;
    const programs = [];
    for (const file of batch.files) {
      if (!file.is_cnc_program) continue;
      const r = parseProgram(file.abs_path);
      if (r) {
        parsedThisBatch++;
        timeThisBatch += r.total_time_s;
        if (r.fmv_usd !== null) fmvThisBatch += r.fmv_usd;
        if (programs.length < 20) programs.push({ rel_path: file.rel_path, ...r });
      }
    }
    aggregateParsed += parsedThisBatch;
    aggregateTotalTimeS += timeThisBatch;
    aggregateFmvUsd += fmvThisBatch;
    aggregateInventoried += batch.file_count;

    // Record EVERY file in the batch to the ledger — the "every file accounted for" guarantee.
    const recRes = jmDieScanCoordinatorEngine.recordBatchScanned(batch, "fleet-scan-batch");
    console.log(`[scan]   parsed=${parsedThisBatch} cnc, total_time_s=${Math.round(timeThisBatch)}, fmv=$${Math.round(fmvThisBatch)}, ledger_appended=${recRes.appended}`);

    batchSummaries.push({
      batch_id: batch.batch_id,
      file_count: batch.file_count,
      cnc_program_count: batch.cnc_program_count,
      docustrata_count: batch.docustrata_count,
      other_count: batch.other_count,
      family_mix: batch.family_mix,
      parsed_programs: parsedThisBatch,
      batch_total_time_s: Math.round(timeThisBatch * 100) / 100,
      batch_total_fmv_usd: Math.round(fmvThisBatch * 100) / 100,
      ledger_appended: recRes.appended,
      programs_sample: programs,
    });
  }

  const ledgerStats = jmDieScanLedgerEngine.stats();
  const report = {
    milestone: "JM-DIE-FLEET-SCAN-MS0",
    slot: "charlie",
    goal: "/goal-16",
    generated_at: new Date().toISOString(),
    archive_root: ARCHIVE_ROOT,
    subdirs_walked: SUBDIRS,
    assumptions: {
      machine_rate_usd_per_hr: MACHINE_RATE,
      assumed_material_spend_usd: MATERIAL_SPEND,
      note: "MS0 single-rate; per-machine rates in MS1 via ShopConfigurationEngine",
    },
    plan: {
      walked_files: plan.walked_files,
      already_scanned_at_plan_time: plan.already_scanned,
      to_scan: plan.to_scan,
      batch_count: plan.batch_count,
    },
    aggregate: {
      files_inventoried_this_run: aggregateInventoried,
      cnc_programs_parsed: aggregateParsed,
      total_program_time_s: Math.round(aggregateTotalTimeS * 100) / 100,
      total_fmv_usd: Math.round(aggregateFmvUsd * 100) / 100,
    },
    ledger_after: {
      total_rows: ledgerStats.total_rows,
      unique_paths: ledgerStats.unique_paths,
      by_source: ledgerStats.by_source,
      by_kind: ledgerStats.by_kind,
    },
    batches: batchSummaries,
  };

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(report, null, 2), "utf8");
  console.log(`[scan] wrote report → ${OUTPUT_PATH}`);
  console.log(`[scan] ledger now: ${ledgerStats.total_rows} rows, ${ledgerStats.unique_paths} unique paths`);
}

main();
