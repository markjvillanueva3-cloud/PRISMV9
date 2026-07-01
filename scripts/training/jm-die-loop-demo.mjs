#!/usr/bin/env node
/**
 * jm-die-loop-demo.mjs — end-to-end JM Die self-improving loop demo.
 *
 * Operator-runnable proof that the full substrate closes end-to-end:
 *
 *   1. Generates 15 synthetic JM Die lathe outcomes (3 categories × 5 each)
 *      with realistic ratios + one S(x)=0.5 anomaly + one 10x out-of-bounds
 *   2. Writes them to state/shared/training/jm-die-lathe-outcomes.jsonl
 *   3. Invokes ShopOutcomeIngestProcessorEngine.processLedger
 *   4. Reads back the adapter state via ShopProfileAdapterEngine.summarize
 *   5. Prints a verifiable summary (multipliers, evidence_count, anomalies)
 *
 * Usage:
 *   node scripts/training/jm-die-loop-demo.mjs
 *   node scripts/training/jm-die-loop-demo.mjs --keep    # don't truncate ledger
 *   node scripts/training/jm-die-loop-demo.mjs --reset   # reset adapter first
 *
 * slot:india /goal-fleet-coord iter12
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  appendBatch,
} from "./emit-outcome-template.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const LEDGER = path.join(REPO_ROOT, "state", "shared", "training", "jm-die-lathe-outcomes.jsonl");

// ============================================================================
// Synthetic outcome generator
// ============================================================================

/**
 * Build 15 outcomes spanning the realistic patterns JM Die would emit:
 *   - 5 lathe time outcomes (1.2x ratio — modest slow)
 *   - 5 lathe rate outcomes (1.05x — JM Die labor rate slightly above baseline)
 *   - 5 quality outcomes (Cpk 0.88..0.95)
 *   - 1 S(x)=0.5 anomaly (gets routed to anomalies, NOT folded)
 *   - 1 out-of-bounds 10x ratio (also routed to anomalies)
 */
export function buildSyntheticOutcomes(now = new Date()) {
  const t = (offset) => new Date(now.getTime() + offset * 60_000).toISOString();
  const records = [];
  // Time outcomes — lathe runs ~20% slower than baseline estimate
  for (let i = 0; i < 5; i++) {
    records.push({
      observed_at: t(i),
      shop_id: "jm-die",
      category: "lathe",
      domain: "time",
      estimated: 10 + i,
      actual: (10 + i) * 1.2,
      unit: "min",
      s_of_x: 0.92,
    });
  }
  // Rate outcomes — labor 5% above baseline
  for (let i = 0; i < 5; i++) {
    records.push({
      observed_at: t(i + 5),
      shop_id: "jm-die",
      category: "lathe",
      domain: "rate",
      estimated: 55,
      actual: 55 * 1.05,
      unit: "USD/hr",
    });
  }
  // Quality outcomes — Cpk drifting around 0.9
  const qualityValues = [0.88, 0.91, 0.93, 0.90, 0.95];
  for (let i = 0; i < 5; i++) {
    records.push({
      observed_at: t(i + 10),
      shop_id: "jm-die",
      category: "lathe",
      domain: "quality",
      estimated: 0.92,
      actual: qualityValues[i],
      unit: "Cpk",
    });
  }
  // ANOMALY — S(x) < 0.7 routes to anomalies path
  records.push({
    observed_at: t(15),
    shop_id: "jm-die",
    category: "lathe",
    domain: "time",
    estimated: 10,
    actual: 12,
    unit: "min",
    s_of_x: 0.5,
  });
  // OUT-OF-BOUNDS — 10x ratio routes to anomalies
  records.push({
    observed_at: t(16),
    shop_id: "jm-die",
    category: "lathe",
    domain: "time",
    estimated: 10,
    actual: 100,
    unit: "min",
  });
  return records;
}

// ============================================================================
// Main demo
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  const keep = args.includes("--keep");
  const reset = args.includes("--reset");

  // Truncate ledger by default so demo is reproducible
  if (!keep && fs.existsSync(LEDGER)) {
    fs.unlinkSync(LEDGER);
    process.stdout.write(`  truncated existing ledger: ${LEDGER}\n`);
  }

  // Emit synthetic outcomes
  const records = buildSyntheticOutcomes();
  const writeStats = appendBatch({
    domain_ledger: LEDGER,
    records,
    meta: { source: "jm-die-loop-demo" },
  });
  process.stdout.write(`✓ emitted ${writeStats.appended} synthetic outcomes to ${LEDGER}\n`);

  // Load engines (dynamic import — Node ESM resolves .ts via tsx, fall back gracefully)
  let processorMod, adapterMod;
  try {
    processorMod = await import(pathToFileURL(path.join(REPO_ROOT, "mcp-server/dist/engines/ShopOutcomeIngestProcessorEngine.js")).href);
    adapterMod = await import(pathToFileURL(path.join(REPO_ROOT, "mcp-server/dist/engines/ShopProfileAdapterEngine.js")).href);
  } catch (e) {
    process.stdout.write(
      "⚠ dist/ engines unavailable — run \"npm run build:fast\" in mcp-server first.\n" +
      "  Demo synthesized outcomes are durable; processor invocation deferred.\n" +
      `  Reason: ${(e instanceof Error ? e.message : String(e)).slice(0, 200)}\n`,
    );
    process.exit(0);
  }
  const { shopOutcomeIngestProcessorEngine } = processorMod;
  const { shopProfileAdapterEngine } = adapterMod;

  if (reset) {
    shopProfileAdapterEngine.reset("jm-die");
    process.stdout.write("  adapter reset for jm-die\n");
  }

  // Process the ledger
  const stats = await shopOutcomeIngestProcessorEngine.processLedger(LEDGER, {});
  process.stdout.write(`\n=== PROCESS LEDGER STATS ===\n`);
  process.stdout.write(`  rows_scanned:        ${stats.rows_scanned}\n`);
  process.stdout.write(`  rows_meta_skipped:   ${stats.rows_meta_skipped}\n`);
  process.stdout.write(`  rows_processed:      ${stats.rows_processed}\n`);
  process.stdout.write(`  rows_rejected:       ${stats.rows_rejected}\n`);
  process.stdout.write(`  loop_confirmed_full:   ${stats.loop_confirmed_full}\n`);
  process.stdout.write(`  loop_confirmed_caveat: ${stats.loop_confirmed_caveat}\n`);
  process.stdout.write(`  loop_anomaly_only:     ${stats.loop_anomaly_only}\n`);
  process.stdout.write(`  loop_fold_skipped:     ${stats.loop_fold_skipped}\n`);
  process.stdout.write(`  by_shop[jm-die]:       ${stats.by_shop["jm-die"] || 0}\n`);
  process.stdout.write(`  duration_ms:           ${stats.duration_ms}\n`);

  // Read back adapter state
  const deltas = shopProfileAdapterEngine.getDeltas("jm-die");
  const summary = shopProfileAdapterEngine.summarize("jm-die");
  process.stdout.write(`\n=== JM DIE ADAPTER SUMMARY ===\n`);
  process.stdout.write(JSON.stringify(summary, null, 2) + "\n");

  if (deltas) {
    process.stdout.write(`\n=== JM DIE TIME DELTAS ===\n`);
    process.stdout.write(JSON.stringify(deltas.time_by_category, null, 2) + "\n");
    process.stdout.write(`\n=== JM DIE RATE DELTAS ===\n`);
    process.stdout.write(JSON.stringify(deltas.rates, null, 2) + "\n");
    process.stdout.write(`\n=== JM DIE QUALITY DELTAS ===\n`);
    process.stdout.write(JSON.stringify(deltas.quality_by_category, null, 2) + "\n");
    process.stdout.write(`\n=== JM DIE ANOMALIES (${deltas.anomalies.length}) ===\n`);
    for (const a of deltas.anomalies) {
      process.stdout.write(`  ${a.observed_at} ratio=${(a.actual / a.estimated).toFixed(2)} s_of_x=${a.s_of_x ?? "n/a"}\n`);
    }
  }

  // adapt() demonstration — what does the calibrated baseline look like?
  process.stdout.write(`\n=== ADAPTED VALUES (baseline → calibrated) ===\n`);
  const baseline_time = 100; // hypothetical 100-min lathe job
  const adapted_time = shopProfileAdapterEngine.adapt("jm-die", baseline_time, {
    kind: "time", category: "lathe", unit: "min",
  });
  process.stdout.write(`  lathe time:   baseline=${baseline_time}min  → calibrated=${adapted_time.value.toFixed(2)}min  (mult=${adapted_time.multiplier.toFixed(4)}, conf=${adapted_time.confidence.toFixed(3)})\n`);
  const baseline_rate = 55;
  const adapted_rate = shopProfileAdapterEngine.adapt("jm-die", baseline_rate, {
    kind: "rate", rate_key: "labor_per_hr", unit: "USD/hr",
  });
  process.stdout.write(`  labor rate:   baseline=$${baseline_rate}/hr → calibrated=$${adapted_rate.value.toFixed(2)}/hr (mult=${adapted_rate.multiplier.toFixed(4)}, conf=${adapted_rate.confidence.toFixed(3)})\n`);

  process.stdout.write(`\n✓ end-to-end self-improving loop demo complete.\n`);
  process.stdout.write(`  JM Die is now calibrated. Future estimates can apply these multipliers.\n`);
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === __filename;
if (isMain) {
  main().catch((e) => {
    process.stderr.write(`FATAL: ${e instanceof Error ? e.stack : String(e)}\n`);
    process.exit(1);
  });
}
