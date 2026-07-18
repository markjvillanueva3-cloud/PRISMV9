#!/usr/bin/env node
/**
 * refresh-lora-vault-datasets.mjs -- keep the Obsidian-vault LoRA training
 * datasets fresh so india's fine-tuning input never goes stale.
 *
 * THE GAP (verified 2026-06-21, slot:zulu knowledge-substrate audit). The
 * vault->model loops compound on a schedule for the GNN (vault-to-gnn-refpool
 * is a pre-retrain stage in nn-graph-retrain-lifecycle.mjs, run by the durable
 * "PRISM NN-Graph Retrain" cron) and for tribal (74k-entry index, 11 Galaxy-Mine
 * crons). But the LoRA dataset feeder `vault-to-lora-dataset.mjs` (kilo,
 * OBSIDIAN-AI-SYNERGY) had NO cron -- the Alpaca {instruction,input,output}
 * pairs only refreshed on a manual run, so new feedback memories did not flow
 * into the training corpus until someone remembered to rebuild it.
 *
 * THIS is the SAFE half of closing that loop: a $0, no-GPU, idempotent
 * orchestrator that re-runs the feeder for all three vault sources, so the
 * datasets are always current for whenever india trains. The TRAIN half (wiring
 * a doctrine-LoRA train cycle that CONSUMES these jsonl files -- cadence, GPU
 * scheduling, eval-gate, base model) is india's LoRA-pipeline call and is
 * routed to india via the chat bus, NOT decided here.
 *
 * Reuses the proven CLI contract verbatim (it does the atomic tmp+rename write
 * and the galaxy/ai-synergy clobber-safe path resolution) rather than
 * re-implementing the write -- R8. Each source is fail-soft: one source failing
 * never aborts the others; exit is non-zero ONLY if EVERY source failed (so the
 * scheduled task surfaces a real outage, not a single transient miss -- R12).
 *
 * Usage:  node scripts/refresh-lora-vault-datasets.mjs [--json]
 * Exit:   0 = at least one source refreshed | 1 = all sources failed
 */

import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, "..");

// The COMPLETE current set of vault->LoRA feeder jobs (verified 2026-06-21).
// India actively expands this set (U-LORA-WIKI-DOMAIN added vault-wiki-* the same
// day this harness was built), so this is a DECLARATIVE list, not a hardcoded
// single script: add a row when india ships a new `vault-*-to-lora-dataset.mjs`
// feeder. A bare `--out` resolves to each feeder's own default file (the
// galaxy/ai-synergy/wiki/lessons feeders redirect to their OWN dataset files via
// their resolve*OutPath guards, never clobbering the verified-feedback dataset).
// CONTRACT: `--out` MUST stay the FINAL token of every args row -- each feeder's
// parseArgs reads the token AFTER `--out` as its path, so a flag placed after it
// would be swallowed (silently writing the wrong file). A drift test asserts every
// --source the vault-to-lora-dataset feeder accepts has a FEEDERS row, so india
// adding a 4th source fails LOUD here, never silently dropping from the refresh.
export const FEEDERS = [
  { label: "feedback",          script: "vault-to-lora-dataset.mjs",        args: ["--source", "feedback", "--out"] },
  { label: "galaxy-synthesis",  script: "vault-to-lora-dataset.mjs",        args: ["--source", "galaxy", "--out"] },
  { label: "galaxy-ai-synergy", script: "vault-to-lora-dataset.mjs",        args: ["--source", "galaxy-ai-synergy", "--out"] },
  { label: "wiki-domain",       script: "vault-wiki-to-lora-dataset.mjs",   args: ["--out"] },
  { label: "lessons",           script: "vault-lessons-to-lora-dataset.mjs", args: ["--out"] },
];

/**
 * Re-run every vault->LoRA feeder job. Pure-ish: `run` (execFileSync-shaped),
 * `node`, and the `feeders` list are injected so tests need no real spawn.
 * Returns one result row per job; never throws (each job is guarded fail-soft).
 */
export function refreshAll({
  root = ROOT,
  run = execFileSync,
  node = process.execPath,
  timeoutMs = 180000,
  feeders = FEEDERS,
} = {}) {
  const results = [];
  for (const job of feeders) {
    const script = path.join(root, "scripts", job.script);
    try {
      const out = run(node, [script, ...job.args], {
        cwd: root,
        encoding: "utf8",
        timeout: timeoutMs,
        maxBuffer: 16 * 1024 * 1024,
      });
      const lines = String(out || "").trim().split(/\r?\n/).filter(Boolean);
      results.push({ label: job.label, script: job.script, ok: true, summary: lines[lines.length - 1] || "(no output)" });
    } catch (e) {
      results.push({ label: job.label, script: job.script, ok: false, error: (e && e.message ? e.message : String(e)).slice(0, 200) });
    }
  }
  return results;
}

/** Aggregate the per-source rows into a report (pure). */
export function summarize(results) {
  const okCount = results.filter((r) => r.ok).length;
  return {
    total: results.length,
    refreshed: okCount,
    failed: results.length - okCount,
    allFailed: results.length > 0 && okCount === 0,
    results,
  };
}

function main() {
  const jsonOut = process.argv.includes("--json");
  const report = summarize(refreshAll());
  if (jsonOut) {
    process.stdout.write(JSON.stringify(report, null, 2) + "\n");
  } else {
    process.stdout.write(
      `[refresh-lora-vault-datasets] ${report.refreshed}/${report.total} sources refreshed` +
        (report.failed ? ` (${report.failed} failed)` : "") + "\n"
    );
    for (const r of report.results) {
      process.stdout.write(`  - ${r.label}: ${r.ok ? r.summary : "FAILED -- " + r.error}\n`);
    }
  }
  // Non-zero ONLY when every source failed (a real outage); a single transient
  // miss must not flap the scheduled task red.
  process.exit(report.allFailed ? 1 : 0);
}

const isDirect = (process.argv[1] || "").replace(/\\/g, "/").endsWith("refresh-lora-vault-datasets.mjs");
if (isDirect) main();
