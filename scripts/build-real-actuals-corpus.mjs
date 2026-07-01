#!/usr/bin/env node
/**
 * build-real-actuals-corpus.mjs -- QUOTING-OPTIMAL-MS0 / U1 builder.
 *
 * Runs RealActualsCorpusEngine over the 6,718 real OCR-extracted settled-order
 * actuals (state/shared/quoting/orders-closed-actuals.jsonl) and writes the clean
 * real-ground-truth training corpus to
 *   state/shared/quoting/real-actuals-corpus.json
 * via an ATOMIC write (juliett soul: atomic-write-before-emit; schemaVersion stamped).
 *
 * This replaces the synthetic bootstrap baseline (actual_revenue_usd = size_bytes
 * stub) as the calibration loop's ground truth. The ENGINE owns the pure filter;
 * this script owns I/O + the generated_iso stamp (Date.now is banned in the engine).
 *
 * Usage:
 *   node scripts/build-real-actuals-corpus.mjs            # build + write
 *   node scripts/build-real-actuals-corpus.mjs --dry-run  # report only, no write
 *   node scripts/build-real-actuals-corpus.mjs --json     # machine-readable summary
 */
import { readFileSync, writeFileSync, renameSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = resolve(ROOT, "state/shared/quoting/orders-closed-actuals.jsonl");
const OUT = resolve(ROOT, "state/shared/quoting/real-actuals-corpus.json");

const argv = process.argv.slice(2);
const DRY = argv.includes("--dry-run");
const JSON_OUT = argv.includes("--json");

// Import the compiled engine (dist) if present, else transpile-on-the-fly via tsx.
async function loadEngine() {
  const distPath = resolve(ROOT, "mcp-server/dist/engines/RealActualsCorpusEngine.js");
  if (existsSync(distPath)) {
    return import(pathToFileURL(distPath).href);
  }
  // Fall back to tsx loader for the src .ts
  const srcPath = resolve(ROOT, "mcp-server/src/engines/RealActualsCorpusEngine.ts");
  const { register } = await import("node:module");
  register("tsx/esm", pathToFileURL(resolve(ROOT, "mcp-server/")).href);
  return import(pathToFileURL(srcPath).href);
}

function atomicWriteJson(path, obj) {
  const tmp = `${path}.tmp-${process.pid}`;
  writeFileSync(tmp, JSON.stringify(obj, null, 2), "utf8");
  renameSync(tmp, path); // atomic on same volume
}

async function main() {
  if (!existsSync(SRC)) {
    console.error(`[build-real-actuals-corpus] SOURCE MISSING: ${SRC}`);
    process.exit(2);
  }
  const raw = JSON.parse(readFileSync(SRC, "utf8"));
  const actuals = Array.isArray(raw.actuals) ? raw.actuals : [];
  const sourceTag = raw.source || "orders-closed-actuals";

  const { realActualsCorpusEngine } = await loadEngine();
  // IQR fence OFF by default: CNC part prices are log-normal, so a linear raw-dollar
  // Tukey fence wrongly truncates the legitimate $10k-$250k die-work tail (measured:
  // it killed 63 real identity-bearing big jobs). The hard band [$5,$250k] + the
  // confidence gate already remove the true OCR artifacts; the fence is opt-in only.
  const result = realActualsCorpusEngine.build(actuals, sourceTag, { applyIqrFence: false });

  // Stamp generated_iso here (I/O layer); engine left it null by design.
  result.generated_iso = new Date().toISOString();

  const summary = {
    ok: result.ok,
    reason: result.reason,
    total_input: result.total_input,
    total_clean: result.total_clean,
    total_rejected: result.total_rejected,
    reject_breakdown: result.reject_breakdown,
    distinct_customers: result.distinct_customers,
    price_stats: result.price_stats,
    out_path: DRY ? "(dry-run, not written)" : OUT,
  };

  if (!DRY) {
    if (!result.ok) {
      console.error(`[build-real-actuals-corpus] REFUSING to write: ${result.reason}`);
      process.exit(1);
    }
    atomicWriteJson(OUT, result);
  }

  if (JSON_OUT) {
    console.log(JSON.stringify(summary));
  } else {
    console.log("[build-real-actuals-corpus]");
    console.log(`  input:   ${summary.total_input}`);
    console.log(`  clean:   ${summary.total_clean}  (${summary.distinct_customers} customers)`);
    console.log(`  rejected:${summary.total_rejected}  ${JSON.stringify(summary.reject_breakdown)}`);
    console.log(`  prices:  min $${summary.price_stats.min}  median $${summary.price_stats.median}  mean $${summary.price_stats.mean}  max $${summary.price_stats.max}`);
    console.log(`  out:     ${summary.out_path}`);
  }
  process.exit(result.ok ? 0 : 1);
}

main().catch((e) => {
  console.error("[build-real-actuals-corpus] FATAL:", e?.stack || e);
  process.exit(3);
});
