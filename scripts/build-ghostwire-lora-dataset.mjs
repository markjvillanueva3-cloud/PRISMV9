#!/usr/bin/env node
/**
 * build-ghostwire-lora-dataset.mjs -- producer: the GNN's CONFIRMED ghost-wiring outcomes ->
 * Alpaca LoRA dataset (U-DELTA-GHOSTWIRE-CONVERTER, slot:delta 2026-06-28).
 *
 * Reads state/shared/ghost-wire-outcomes.jsonl, converts the VALIDATED (confirmed) rows to
 * Alpaca {instruction, output} engine->dispatcher wiring-inference pairs via
 * scripts/lib/cad-ghostwire-to-training.mjs (pending guesses are SKIPPED, never trained on),
 * dedups, and writes state/shared/lora/ghostwire-wiring-dataset.jsonl (atomic).
 *
 * That output is registered as an `advisory` lora-training-jsonl source in
 * build-fleet-training-corpus-inventory.mjs, so assemble-fleet-lora-corpus.mjs folds it into the
 * fleet corpus automatically at 0.5 weight (manifest-driven -- no assembler change). Closes the
 * "GHOST-WIRING rows NO-CONVERTER" coverage gap from U-CLOSED-LOOP-COVERAGE (65c85a9fbb).
 *
 * Usage:
 *   node scripts/build-ghostwire-lora-dataset.mjs          # dry-run: counts only
 *   node scripts/build-ghostwire-lora-dataset.mjs --out    # write the dataset jsonl
 *   node scripts/build-ghostwire-lora-dataset.mjs --json   # machine-readable summary
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { convertGhostwireText, dedupPairs } from "./lib/cad-ghostwire-to-training.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const GHOSTWIRE_PATH = path.join(ROOT, "state", "shared", "ghost-wire-outcomes.jsonl");
const DEFAULT_OUT = path.join(ROOT, "state", "shared", "lora", "ghostwire-wiring-dataset.jsonl");

/**
 * Build the deduped Alpaca dataset from the ghost-wire ledger. Pure w.r.t. the injected fs op so
 * it is testable without disk. Returns rows + honest counts (confirmed/pending make the trust
 * gate visible: uniquePairs derive ONLY from confirmed rows).
 */
export function buildDataset({ srcPath = GHOSTWIRE_PATH, readFileImpl = fs.readFileSync } = {}) {
  let text = "";
  try { text = readFileImpl(srcPath, "utf8"); } catch { text = ""; }
  const { rows, invalid, skipped, pending, confirmed } = convertGhostwireText(text);
  const { rows: unique, duplicates } = dedupPairs(rows);
  return {
    rows: unique,
    confirmed,
    pending,
    invalid,
    skipped,
    rawPairs: rows.length,
    uniquePairs: unique.length,
    duplicates,
  };
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
    confirmed: ds.confirmed,
    pending: ds.pending,
    invalid: ds.invalid,
    skipped: ds.skipped,
    rawPairs: ds.rawPairs,
    uniquePairs: ds.uniquePairs,
    duplicates: ds.duplicates,
  };
  if (write) {
    writeJsonlAtomic(DEFAULT_OUT, ds.rows);
    summary.written = DEFAULT_OUT;
  }

  if (asJson) {
    process.stdout.write(JSON.stringify(summary, null, 2) + "\n");
  } else {
    process.stdout.write(
      `ghost-wire -> LoRA: ${ds.uniquePairs} unique wiring pairs ` +
      `(${ds.confirmed} confirmed / ${ds.pending} pending-skipped, ${ds.duplicates} dup, ${ds.invalid} invalid)\n`,
    );
    if (write) process.stdout.write(`Wrote -> ${DEFAULT_OUT}\n`);
    else process.stdout.write(`(dry-run; pass --out to write)\n`);
  }
}

const isMain = (() => {
  try { return process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url); }
  catch { return false; }
})();
if (isMain) main();

export { DEFAULT_OUT, GHOSTWIRE_PATH };
