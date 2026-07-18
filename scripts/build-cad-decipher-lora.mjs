// build-cad-decipher-lora.mjs -- turn the corpus manufacturing-decipher into a LoRA training feed
// (U-DELTA-CAD-DECIPHER-LORA, slot:delta).
//
// Operator work order: "closed loop TRAINING, self improving ... decipher the print ... adding
// material for finishing operations, adding features for clamping or work holding."
//
// cad-part-decipher.mjs + cad-part-decipher-hermes.mjs decipher every kernel-validated part into
// {shape/family, stock, workholding}. That decipher was a terminal artifact -- nothing consumed it.
// This module WIRES it into the fleet LoRA pipeline (R15 each-pass-feeds-next): it emits Alpaca-style
// {instruction, output} pairs into state/shared/lora/ in the SAME schema as cad-dimension-dataset,
// so build-fleet-training-corpus-inventory.mjs (SOURCES registry) + assemble-fleet-lora-corpus.mjs
// fold it into fleet-lora-combined.jsonl -> fleet_lora_train.py. The corpus decipher becomes the
// training data for the model that draws/deciphers future parts -- the self-improving loop closes.
//
// GROUNDED, NOT "TYPICAL" (delta soul): every pair poses a REAL part (real name/class/kernel envelope)
// and answers with the ACTUAL computed decipher (deterministic machining-allowance rule OR the live
// Hermes verdict) -- never a heuristic-filled "typical X". Rows the pipeline could not decide
// (needsReasoning without a Hermes answer, or Hermes 'unsure') are SKIPPED, never trained on a guess.

import fs from "node:fs";
import path from "node:path";

const DET_PATH = "state/shared/cad-fusion-live/part-decipher.jsonl";
const HERMES_PATH = "state/shared/cad-fusion-live/part-decipher-hermes.jsonl";
const OUT_PATH = "state/shared/lora/cad-decipher-mfg-dataset.jsonl";

const fmtMm = (arr) => Array.isArray(arr) ? arr.map((v) => Number(v).toFixed(2)).join(" x ") + " mm" : "n/a";

/**
 * Deterministic decipher row -> an instruction/output training pair (or null if not applicable).
 * @param {object} row  a decipherKernelPart() record
 */
export function deterministicPair(row) {
  const c = row && row.classification;
  const mfg = row && row.mfg;
  if (!c || c.needsReasoning || !mfg || !mfg.applicable || !mfg.stock || !mfg.stock.applicable) return null;
  const shape = c.shape;
  const finished = fmtMm(mfg.stock.finishedDims);
  const stock = fmtMm(mfg.stock.stockDims);
  const added = Array.isArray(mfg.stock.addedPerDimMm) ? mfg.stock.addedPerDimMm.map((v) => Number(v).toFixed(2)).join("/") : "n/a";
  const wh = mfg.workholding || {};
  const grip = Array.isArray(wh.gripSurfaces) && wh.gripSurfaces.length ? wh.gripSurfaces.join(", ") : "the machined faces";
  const finishPer = mfg.stock.finishAllowancePerSideMm
    ? (mfg.process === "lathe" ? mfg.stock.finishAllowancePerSideMm.od : mfg.stock.finishAllowancePerSideMm.profile)
    : null;
  return {
    instruction: `CAD manufacturing decipher -- a ${shape} part (class "${row.partClass}") with finished envelope ${finished}. What raw stock and workholding does it need?`,
    output: `Raw stock ${stock} (grown ${added} mm/axis for roughing + finishing${finishPer != null ? `, finish ${finishPer} mm/side` : ""}). Workholding: ${wh.method || "n/a"} on ${grip}.`,
    partClass: row.partClass || null,
    shape,
    source: "cad-decipher-deterministic",
  };
}

/**
 * Hermes-resolved residual row -> an instruction/output pair (skip 'unsure' -- never train a guess).
 * @param {object} row  a runHermesResidual() record { label, partClass, bboxMm, hermes:{family,...} }
 */
export function hermesPair(row) {
  const h = row && row.hermes;
  if (!h || !h.family || h.family === "unsure") return null;
  const env = fmtMm(row.bboxMm);
  const finish = h.finishStockMmPerSide != null ? ` Finish stock ~${h.finishStockMmPerSide} mm/side.` : "";
  return {
    instruction: `CAD manufacturing decipher -- part "${row.label}" (class "${row.partClass}"), overall envelope ${env}. Is it turned or prismatic, and how is it held?`,
    output: `A ${h.family} part -- workholding: ${h.workholding || (h.family === "round" ? "3-jaw chuck on the OD" : "milling vise on two parallel faces")}.${finish}${h.reason ? ` (${h.reason})` : ""}`,
    partClass: row.partClass || null,
    shape: h.family,
    source: "cad-decipher-hermes",
  };
}

function readJsonl(p) {
  if (!fs.existsSync(p)) return { rows: [], corrupt: 0 };
  const raw = fs.readFileSync(p, "utf8").trim();
  const rows = [];
  let corrupt = 0; // R12 fail-loud: corrupt lines are COUNTED into stats, never silently dropped
  for (const l of raw ? raw.split("\n") : []) { try { rows.push(JSON.parse(l)); } catch { corrupt++; } }
  return { rows, corrupt };
}

/**
 * Build the training pairs from both decipher datasets. Dedups by (instruction,output).
 * @returns {{pairs:Array, stats:object}}
 */
export function buildPairs(detPath = DET_PATH, hermesPath = HERMES_PATH) {
  const { rows: det, corrupt: corruptDeterministic } = readJsonl(detPath);
  const { rows: herm, corrupt: corruptHermes } = readJsonl(hermesPath);
  const seen = new Set();
  const pairs = [];
  const stats = { detRows: det.length, hermesRows: herm.length, corruptDeterministic, corruptHermes, fromDeterministic: 0, fromHermes: 0, skippedDeterministic: 0, skippedHermes: 0 };
  for (const r of det) {
    const p = deterministicPair(r);
    if (!p) { stats.skippedDeterministic++; continue; }
    const k = JSON.stringify([p.instruction, p.output]); // text-safe key (a NUL separator made this file git-binary)
    if (seen.has(k)) continue;
    seen.add(k); pairs.push(p); stats.fromDeterministic++;
  }
  for (const r of herm) {
    const p = hermesPair(r);
    if (!p) { stats.skippedHermes++; continue; }
    const k = JSON.stringify([p.instruction, p.output]); // text-safe key (a NUL separator made this file git-binary)
    if (seen.has(k)) continue;
    seen.add(k); pairs.push(p); stats.fromHermes++;
  }
  stats.total = pairs.length;
  return { pairs, stats };
}

export function writeFeed(pairs, outPath = OUT_PATH) {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  const tmp = `${outPath}.tmp`;
  fs.writeFileSync(tmp, pairs.map((p) => JSON.stringify(p)).join("\n") + (pairs.length ? "\n" : ""));
  fs.renameSync(tmp, outPath); // atomic
  return outPath;
}

export const __test = { deterministicPair, hermesPair, buildPairs, fmtMm };

// ---- CLI -------------------------------------------------------------------------------------
if (process.argv[1]?.endsWith("build-cad-decipher-lora.mjs")) {
  const args = process.argv.slice(2);
  const { pairs, stats } = buildPairs();
  if (args.includes("--write")) { writeFeed(pairs); stats.wrote = OUT_PATH; }
  if (args.includes("--json")) console.log(JSON.stringify(stats, null, 2));
  else {
    console.log(`cad-decipher LoRA feed: ${stats.total} pairs (deterministic=${stats.fromDeterministic} hermes=${stats.fromHermes})`);
    console.log(`  skipped: deterministic=${stats.skippedDeterministic} hermes=${stats.skippedHermes} (of ${stats.detRows}+${stats.hermesRows} rows)`);
    if (stats.corruptDeterministic || stats.corruptHermes) console.log(`  WARNING corrupt jsonl lines skipped: deterministic=${stats.corruptDeterministic} hermes=${stats.corruptHermes} -- inspect the source decipher files`);
    if (stats.wrote) console.log(`  wrote -> ${stats.wrote}`);
    else console.log(`  (dry -- pass --write to emit ${OUT_PATH})`);
  }
}
