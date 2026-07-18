#!/usr/bin/env node
/**
 * build-cad-vec2d-dataset.mjs -- producer: the vec2d DXF training ledger -> Alpaca 2D-drawing
 * training dataset (U-DELTA-VEC2D-TRAINING-LANE, slot:delta 2026-07-02, Domain 10 closed-loop).
 *
 * Reads state/shared/cad-closed-loop-night/vec2d-training-ledger.jsonl (emitted by
 * vec2d-to-training.mjs), converts the successfully-parsed rows to Alpaca {instruction,input,output}
 * pairs via scripts/lib/vec2d-ledger-to-training.mjs, dedups on the assembler key
 * JSON.stringify([instruction,output]), and writes state/shared/lora/cad-vec2d-training-dataset.jsonl.
 * That file is registered as an advisory lora-training-jsonl source (id 'cad-vec2d-training') in
 * build-fleet-training-corpus-inventory.mjs, so assemble-fleet-lora-corpus.mjs folds it into the
 * fleet corpus (weight 0.5) -- NO assembler change, manifest-driven. Sibling of
 * build-cad-fix-training-dataset.mjs.
 *
 * Usage:
 *   node scripts/build-cad-vec2d-dataset.mjs          # dry-run counts
 *   node scripts/build-cad-vec2d-dataset.mjs --out    # write the dataset
 *   node scripts/build-cad-vec2d-dataset.mjs --json   # machine-readable
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { convertVec2d, dedupVec2dPairs } from "./lib/vec2d-ledger-to-training.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DEFAULT_LEDGER = path.join(ROOT, "state", "shared", "cad-closed-loop-night", "vec2d-training-ledger.jsonl");
const DEFAULT_OUT = path.join(ROOT, "state", "shared", "lora", "cad-vec2d-training-dataset.jsonl");

/** Build the deduped dataset from the ledger. Pure w.r.t. the injected reader -> testable. */
export function buildDataset({ ledger = DEFAULT_LEDGER, readFileImpl = fs.readFileSync } = {}) {
  let text = "";
  let present = true;
  try { text = readFileImpl(ledger, "utf8"); } catch { present = false; }
  const { rows, invalid, skipped } = convertVec2d(text);
  const { rows: deduped, duplicates } = dedupVec2dPairs(rows);
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
  const ledgerMissing = !fs.existsSync(DEFAULT_LEDGER);
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
    if (ledgerMissing) {
      // R12 fail-loud: asked to write a dataset but the source ledger does not exist.
      process.stderr.write(`vec2d ledger absent (${DEFAULT_LEDGER}) -- run scripts/vec2d-to-training.mjs --resume --out first\n`);
      process.exitCode = 1;
      if (asJson) process.stdout.write(JSON.stringify(summary, null, 2) + "\n");
      return;
    }
    writeJsonlAtomic(DEFAULT_OUT, ds.rows);
    summary.written = DEFAULT_OUT;
  }
  if (asJson) {
    process.stdout.write(JSON.stringify(summary, null, 2) + "\n");
  } else {
    process.stdout.write(`vec2d ledger -> 2D-drawing training: ${ds.uniquePairs} unique pairs (${ds.rawPairs} raw, ${ds.duplicates} dup, ${ds.skipped} skipped non-parsed, ${ds.invalid} invalid)${ds.present ? "" : " [LEDGER ABSENT]"}\n`);
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
