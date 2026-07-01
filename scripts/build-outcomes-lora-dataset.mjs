#!/usr/bin/env node
/**
 * build-outcomes-lora-dataset.mjs -- producer: outcome-bus events -> Alpaca LoRA dataset
 * (U-OUTCOME-LORA-WIRE, slot:india 2026-06-11).
 *
 * Reads every state/outcomes/<domain>.jsonl, converts the learnable events to Alpaca
 * {instruction, output} pairs via scripts/lib/outcome-to-alpaca-converter.mjs, dedups
 * across all domains, and writes state/shared/lora/outcomes-dataset.jsonl (atomic).
 * That file is registered as an `advisory` lora-training-jsonl source in
 * build-fleet-training-corpus-inventory.mjs, so assemble-fleet-lora-corpus.mjs folds it
 * into the fleet corpus automatically (manifest-driven -- no assembler change).
 *
 * Usage:
 *   node scripts/build-outcomes-lora-dataset.mjs            # dry-run: counts only
 *   node scripts/build-outcomes-lora-dataset.mjs --out      # write the dataset jsonl
 *   node scripts/build-outcomes-lora-dataset.mjs --json     # machine-readable summary
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { convertJsonlText, dedupRows } from "./lib/outcome-to-alpaca-converter.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUTCOMES_DIR = path.join(ROOT, "state", "outcomes");
const DEFAULT_OUT = path.join(ROOT, "state", "shared", "lora", "outcomes-dataset.jsonl");

/**
 * Build the combined deduped Alpaca dataset from the outcomes dir. Pure w.r.t. the
 * injected fs ops so it is testable without disk. Returns rows + per-domain stats.
 */
export function buildDataset({ dir = OUTCOMES_DIR, readdirImpl = fs.readdirSync, readFileImpl = fs.readFileSync } = {}) {
  let files = [];
  try { files = readdirImpl(dir).filter((f) => f.endsWith(".jsonl")); } catch { files = []; }
  const all = [];
  const byDomain = {};
  for (const f of files.sort()) {
    let text = "";
    try { text = readFileImpl(path.join(dir, f), "utf8"); } catch { byDomain[f] = { error: "read-failed" }; continue; }
    const { rows, invalid, skipped } = convertJsonlText(text);
    byDomain[f] = { converted: rows.length, invalid, skipped };
    for (const r of rows) all.push(r);
  }
  const { rows, duplicates } = dedupRows(all);
  return { rows, byDomain, rawPairs: all.length, uniquePairs: rows.length, duplicates, files: files.length };
}

function writeJsonlAtomic(outPath, rows) {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  const tmp = `${outPath}.tmp-${process.pid}`;
  fs.writeFileSync(tmp, rows.map((r) => JSON.stringify(r)).join("\n") + (rows.length ? "\n" : ""), "utf8");
  fs.renameSync(tmp, outPath);
}

function main() {
  const args = process.argv.slice(2);
  const write = args.includes("--out");
  const asJson = args.includes("--json");
  const outPath = DEFAULT_OUT;

  const ds = buildDataset();
  const summary = {
    files: ds.files,
    rawPairs: ds.rawPairs,
    uniquePairs: ds.uniquePairs,
    duplicates: ds.duplicates,
    byDomain: ds.byDomain,
  };

  if (write) {
    writeJsonlAtomic(outPath, ds.rows);
    summary.written = outPath;
  }

  if (asJson) {
    process.stdout.write(JSON.stringify(summary, null, 2) + "\n");
  } else {
    process.stdout.write(`outcomes -> LoRA: ${ds.uniquePairs} unique pairs (${ds.rawPairs} raw, ${ds.duplicates} dup) from ${ds.files} domain file(s)\n`);
    for (const [f, s] of Object.entries(ds.byDomain)) {
      process.stdout.write(`  - ${f}: ${s.error ? s.error : `${s.converted} converted, ${s.skipped} skipped, ${s.invalid} invalid`}\n`);
    }
    if (write) process.stdout.write(`Wrote -> ${outPath}\n`);
    else process.stdout.write(`(dry-run; pass --out to write)\n`);
  }
}

const isMain = (() => {
  try { return process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url); }
  catch { return false; }
})();
if (isMain) main();

export { DEFAULT_OUT, OUTCOMES_DIR };
