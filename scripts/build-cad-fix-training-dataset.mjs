#!/usr/bin/env node
/**
 * build-cad-fix-training-dataset.mjs -- producer: delta's CAD fix-training-ledger ->
 * Alpaca CAD-generation training dataset (U-CAD-FIX-LEDGER-TRAIN, slot:india 2026-06-11).
 *
 * Reads state/shared/cad-fix-training-ledger.jsonl (the closed loop's persisted corrections),
 * converts the CAD-generator-training rows (trainsCadGen) to Alpaca {instruction,output} pairs
 * via scripts/lib/cad-fix-ledger-to-training.mjs, dedups, and writes
 * state/shared/lora/cad-fix-training-dataset.jsonl. That file is registered as an advisory
 * lora-training-jsonl source in build-fleet-training-corpus-inventory.mjs, so
 * assemble-fleet-lora-corpus.mjs folds it into the corpus the CAD-gen fine-tune consumes --
 * CLOSING delta's persist->retrain arc with NO assembler change (manifest-driven).
 *
 * Usage:
 *   node scripts/build-cad-fix-training-dataset.mjs            # dry-run counts
 *   node scripts/build-cad-fix-training-dataset.mjs --out      # write the dataset
 *   node scripts/build-cad-fix-training-dataset.mjs --json     # machine-readable
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { convertLedgerText, dedupPairs } from "./lib/cad-fix-ledger-to-training.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DEFAULT_LEDGER = path.join(ROOT, "state", "shared", "cad-fix-training-ledger.jsonl");
const DEFAULT_OUT = path.join(ROOT, "state", "shared", "lora", "cad-fix-training-dataset.jsonl");

/** Build the deduped dataset from the ledger. Pure w.r.t. the injected reader -> testable. */
export function buildDataset({ ledger = DEFAULT_LEDGER, readFileImpl = fs.readFileSync } = {}) {
  let text = "";
  let present = true;
  try { text = readFileImpl(ledger, "utf8"); } catch { present = false; }
  const { rows, invalid, skipped } = convertLedgerText(text);
  const { rows: deduped, duplicates } = dedupPairs(rows);
  return { rows: deduped, present, rawPairs: rows.length, uniquePairs: deduped.length, duplicates, invalid, skipped };
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
  const ds = buildDataset();
  const summary = {
    ledgerPresent: ds.present,
    rawPairs: ds.rawPairs,
    uniquePairs: ds.uniquePairs,
    duplicates: ds.duplicates,
    invalid: ds.invalid,
    skipped: ds.skipped,
  };
  if (write) {
    writeJsonlAtomic(DEFAULT_OUT, ds.rows);
    summary.written = DEFAULT_OUT;
  }
  if (asJson) {
    process.stdout.write(JSON.stringify(summary, null, 2) + "\n");
  } else {
    process.stdout.write(`cad-fix-ledger -> CAD-gen training: ${ds.uniquePairs} unique pairs (${ds.rawPairs} raw, ${ds.duplicates} dup, ${ds.skipped} skipped non-cadGen, ${ds.invalid} invalid)${ds.present ? "" : " [LEDGER ABSENT]"}\n`);
    if (write) process.stdout.write(`Wrote -> ${DEFAULT_OUT}\n`);
    else process.stdout.write("(dry-run; pass --out to write)\n");
  }
}

const isMain = (() => {
  try { return process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url); }
  catch { return false; }
})();
if (isMain) main();

export { DEFAULT_LEDGER, DEFAULT_OUT };
