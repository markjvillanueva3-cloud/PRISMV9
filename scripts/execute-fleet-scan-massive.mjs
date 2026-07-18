#!/usr/bin/env node
/**
 * Massive _PART LIBRARY scan — JM-DIE-FLEET-SCAN-MS0 / U-FS06
 *
 * Larger batches (10K each, 10 batches max = 100K files) targeting the
 * biggest unscanned bucket: _PART LIBRARY (300K+ docustrata files).
 *
 * Same engine contract as execute-fleet-scan-batches.mjs — just bigger
 * walkLimit + batchSize for bulk coverage growth.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { jmDieScanCoordinatorEngine } from "../mcp-server/dist/engines/JMDieScanCoordinatorEngine.js";
import { jmDieScanLedgerEngine } from "../mcp-server/dist/engines/JMDieScanLedgerEngine.js";

const ARCHIVE_ROOT = "H:/prism/JM DIE";
const OUTPUT_PATH = "H:/prism/state/shared/specs/JM-DIE-FLEET-SCAN-MASSIVE-2026-05-24.json";
// Default: empty SUBDIRS = walk ALL top-level subdirs (every file in archive)
const SUBDIRS = process.env.JMDIE_SUBDIRS ? process.env.JMDIE_SUBDIRS.split(",") : undefined;
const BATCH_SIZE = Number(process.env.JMDIE_BATCH_SIZE ?? 15000);
const MAX_BATCHES = Number(process.env.JMDIE_MAX_BATCHES ?? 40);
const WALK_LIMIT = Number(process.env.JMDIE_WALK_LIMIT ?? 500000);

function main() {
  console.log("[massive] planning batches…");
  const planOpts = {
    archiveRoot: ARCHIVE_ROOT,
    batchSize: BATCH_SIZE,
    maxBatches: MAX_BATCHES,
    walkLimit: WALK_LIMIT,
  };
  if (SUBDIRS) planOpts.subdirs = SUBDIRS;
  const plan = jmDieScanCoordinatorEngine.plan(planOpts);
  if (!plan.ok) {
    console.error("[massive] plan FAILED:", JSON.stringify(plan.errors));
    process.exit(2);
  }
  console.log(`[massive] walked=${plan.walked_files} already_scanned=${plan.already_scanned} to_scan=${plan.to_scan} batches=${plan.batch_count}`);

  const batchSummaries = [];
  let aggregateInventoried = 0;

  for (const batch of plan.batches) {
    const recRes = jmDieScanCoordinatorEngine.recordBatchScanned(batch, "fleet-scan-batch");
    aggregateInventoried += batch.file_count;
    console.log(`[massive] batch ${batch.batch_id} — ${batch.file_count} files (${batch.docustrata_count} docu, ${batch.other_count} other), ledger_appended=${recRes.appended}`);
    batchSummaries.push({
      batch_id: batch.batch_id,
      file_count: batch.file_count,
      cnc_program_count: batch.cnc_program_count,
      docustrata_count: batch.docustrata_count,
      other_count: batch.other_count,
      family_mix: batch.family_mix,
      ledger_appended: recRes.appended,
    });
  }

  const ledgerStats = jmDieScanLedgerEngine.stats();
  const report = {
    milestone: "JM-DIE-FLEET-SCAN-MS0",
    unit: "U-FS06-MASSIVE-INVENTORY",
    slot: "charlie",
    goal: "/goal-16",
    generated_at: new Date().toISOString(),
    archive_root: ARCHIVE_ROOT,
    subdirs_walked: SUBDIRS,
    plan: {
      walked_files: plan.walked_files,
      already_scanned_at_plan_time: plan.already_scanned,
      to_scan: plan.to_scan,
      batch_count: plan.batch_count,
    },
    aggregate: { files_inventoried_this_run: aggregateInventoried },
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
  console.log(`[massive] wrote report → ${OUTPUT_PATH}`);
  console.log(`[massive] ledger now: ${ledgerStats.total_rows} rows, ${ledgerStats.unique_paths} unique paths`);
}

main();
