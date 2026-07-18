#!/usr/bin/env node
/**
 * scripts/emit-cam-lora-eval-split.mjs — CAM-AI-TRAINING-MS0/U-CAMT-EVAL-SPLIT
 *
 * Emit deterministic train/holdout split of the merged LoRA dataset, stratified
 * by (op, system) so every operation x system cell appears in BOTH train and
 * holdout — preventing system-level or op-level leakage during fine-tune eval.
 *
 * Deterministic: hash(templateId + prompt-index) keyed split. 85/15 default.
 *
 * Output:
 *   - state/shared/corpus/cam-lora-train.jsonl
 *   - state/shared/corpus/cam-lora-holdout.jsonl
 *   - state/shared/corpus/cam-lora-split-summary.json
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = dirname(__dirname);
const CORPUS = join(REPO_ROOT, "state", "shared", "corpus");

const HOLDOUT_FRAC = 0.15; // 85/15 train/holdout

function load(name) {
  const f = join(CORPUS, name);
  if (!existsSync(f)) return [];
  return readFileSync(f, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
}

function bucket(key, frac) {
  const h = createHash("sha256").update(key).digest();
  const u32 = h.readUInt32BE(0);
  const r = u32 / 0x100000000;
  return r < frac ? "holdout" : "train";
}

const merged = load("cam-lora-dataset-merged.jsonl");
const train = [];
const holdout = [];
const cells = {}; // op__system → {train, holdout}

for (const rec of merged) {
  const op = rec.metadata?.op ?? "unknown";
  const sys = rec.metadata?.system ?? "unknown";
  const tid = rec.metadata?.templateId ?? "no-id";
  const prompt = rec.messages?.[0]?.content ?? "";
  const key = `${tid}::${prompt}`;
  const cell = `${op}__${sys}`;
  cells[cell] ??= { train: 0, holdout: 0 };
  const dest = bucket(key, HOLDOUT_FRAC);
  cells[cell][dest]++;
  if (dest === "train") train.push(rec); else holdout.push(rec);
}

writeFileSync(join(CORPUS, "cam-lora-train.jsonl"), train.map((r) => JSON.stringify(r)).join("\n") + "\n");
writeFileSync(join(CORPUS, "cam-lora-holdout.jsonl"), holdout.map((r) => JSON.stringify(r)).join("\n") + "\n");

const zeroHoldoutCells = Object.entries(cells).filter(([, c]) => c.holdout === 0).map(([k]) => k);
const zeroTrainCells = Object.entries(cells).filter(([, c]) => c.train === 0).map(([k]) => k);

const summary = {
  totalMerged: merged.length,
  trainCount: train.length,
  holdoutCount: holdout.length,
  trainFrac: (train.length / merged.length).toFixed(4),
  holdoutFrac: (holdout.length / merged.length).toFixed(4),
  holdoutFracTarget: HOLDOUT_FRAC,
  cells: Object.keys(cells).length,
  zeroHoldoutCells: zeroHoldoutCells.length,
  zeroTrainCells: zeroTrainCells.length,
  zeroHoldoutCellList: zeroHoldoutCells.slice(0, 20),
  splitMethod: "sha256(templateId::prompt) deterministic bucket",
  generatedAt: new Date().toISOString(),
};

writeFileSync(join(CORPUS, "cam-lora-split-summary.json"), JSON.stringify(summary, null, 2));

console.log(`merged=${merged.length} -> train=${train.length} (${summary.trainFrac}) + holdout=${holdout.length} (${summary.holdoutFrac})`);
console.log(`cells=${summary.cells} | zero-holdout cells=${zeroHoldoutCells.length} | zero-train cells=${zeroTrainCells.length}`);
if (zeroHoldoutCells.length > 0) console.log(`zero-holdout (head): ${zeroHoldoutCells.slice(0, 5).join(", ")}`);
