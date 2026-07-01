#!/usr/bin/env node
/**
 * append-cad-corrections-to-fix-ledger.mjs -- the CAPTURE WRITER that CLOSES delta's CAD closed loop
 * (U-CAD-CAPTURE-LOOP, slot:india 2026-06-11).
 *
 * Scans state/shared for live CAD correction-loop ledgers (cad-fusion-correction-loop-live.mjs
 * output: any cad-*.json carrying `cycle.before.missing`), converts each cycle's missing features
 * into op-enriched fix-ledger rows via scripts/lib/cad-correction-to-fix-ledger.mjs, dedups against
 * the existing cad-fix-training-ledger.jsonl, and APPENDS the net-new rows. Run it after each
 * correction cycle (or on a cron) so the CAD-gen training corpus SELF-GROWS per print -- closing the
 * loop the GT-batch (one-time 2026-05-19) and the fix-ledger converter left open.
 *
 *   correction cycle -> [THIS writer] -> cad-fix-training-ledger.jsonl
 *                    -> build-cad-fix-training-dataset.mjs -> fleet LoRA corpus -> CAD-gen retrain
 *
 * Each correction-loop ledger's rows take `source = <ledger basename>` so they are ADDITIVE to (not
 * a dedup-collision with) the GT-batch rows -- they carry the richer "missing -> fix op -> verdict"
 * signal the GT batch lacks. Re-running is idempotent (dedup by part|field|kind|source).
 *
 * Usage:
 *   node scripts/append-cad-corrections-to-fix-ledger.mjs            # dry-run: what WOULD append
 *   node scripts/append-cad-corrections-to-fix-ledger.mjs --apply    # append the net-new rows
 *   node scripts/append-cad-corrections-to-fix-ledger.mjs --json
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { correctionLedgerToFixRows, fixRowKey, dedupAgainst } from "./lib/cad-correction-to-fix-ledger.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DEFAULT_SCAN_DIR = path.join(ROOT, "state", "shared");
const DEFAULT_LEDGER = path.join(ROOT, "state", "shared", "cad-fix-training-ledger.jsonl");

/** A ledger object "looks like" a correction-loop output iff it carries cycle.before.missing[]. */
export function isCorrectionLedger(obj) {
  return !!(obj && obj.cycle && obj.cycle.before && Array.isArray(obj.cycle.before.missing));
}

/**
 * Discover correction-loop ledger artifacts in `scanDir` (top-level cad-*.json with the
 * correction-ledger shape). Returns [{ name, ledger }]. Fail-soft: unreadable dir -> [].
 */
export function discoverCorrectionLedgers({ scanDir = DEFAULT_SCAN_DIR, readdirImpl = fs.readdirSync, readFileImpl = fs.readFileSync } = {}) {
  let names = [];
  try { names = readdirImpl(scanDir); } catch { return []; }
  const out = [];
  for (const name of names.filter((n) => n.startsWith("cad-") && n.endsWith(".json")).sort()) {
    let obj;
    try { obj = JSON.parse(readFileImpl(path.join(scanDir, name), "utf8")); } catch { continue; }
    if (isCorrectionLedger(obj)) out.push({ name, ledger: obj });
  }
  return out;
}

/** Parse the existing fix-ledger jsonl text -> the set of present dedup keys. */
export function existingKeySet(ledgerText) {
  const set = new Set();
  for (const line of String(ledgerText || "").split(/\r?\n/)) {
    const t = line.trim();
    if (!t) continue;
    try { set.add(fixRowKey(JSON.parse(t))); } catch { /* skip malformed */ }
  }
  return set;
}

/**
 * Pure core: given discovered ledger artifacts + the existing ledger text, compute the net-new rows.
 * Each ledger's rows are sourced to its own basename (additive provenance). Returns
 * { newRows, emitted, dup }.
 */
export function computeNewRows({ artifacts, existingText }) {
  const all = [];
  for (const { name, ledger } of artifacts || []) {
    all.push(...correctionLedgerToFixRows(ledger, { source: name }));
  }
  const newRows = dedupAgainst(all, existingKeySet(existingText));
  return { newRows, emitted: all.length, dup: all.length - newRows.length };
}

function appendRows(ledgerPath, rows) {
  if (rows.length === 0) return;
  // O_APPEND single write -> atomic vs concurrent harvesters; trailing newline preserved.
  const chunk = rows.map((r) => JSON.stringify(r)).join("\n") + "\n";
  fs.appendFileSync(ledgerPath, chunk, "utf8");
}

function main() {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const asJson = args.includes("--json");

  const artifacts = discoverCorrectionLedgers();
  let existingText = "";
  let before = 0;
  try {
    existingText = fs.readFileSync(DEFAULT_LEDGER, "utf8");
    before = existingText.split(/\r?\n/).filter((l) => l.trim()).length;
  } catch { /* ledger may not exist yet */ }

  const { newRows, emitted, dup } = computeNewRows({ artifacts, existingText });

  if (apply && newRows.length) appendRows(DEFAULT_LEDGER, newRows);

  const summary = {
    correctionLedgers: artifacts.length,
    rowsEmitted: emitted,
    duplicatesSkipped: dup,
    netNew: newRows.length,
    ledgerBefore: before,
    ledgerAfter: before + (apply ? newRows.length : 0),
    applied: apply,
  };

  if (asJson) {
    process.stdout.write(JSON.stringify(summary, null, 2) + "\n");
  } else {
    process.stdout.write(`capture: ${artifacts.length} correction ledger(s) -> ${emitted} rows (${dup} dup) -> ${newRows.length} net-new\n`);
    process.stdout.write(`fix-ledger: ${before} -> ${summary.ledgerAfter}${apply ? " (appended)" : " (dry-run; pass --apply)"}\n`);
    for (const { name } of artifacts) process.stdout.write(`  - ${name}\n`);
  }
}

const isMain = (() => {
  try { return process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url); }
  catch { return false; }
})();
if (isMain) main();

export { DEFAULT_SCAN_DIR, DEFAULT_LEDGER };
