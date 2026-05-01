#!/usr/bin/env node
// PHASE-4 driver — emits all 11 per-unit aggregations + the U-CAM70 unified
// corpus by invoking CAMTrainingExtractionAggregatorEngine over the canonical
// `cad-engine/knowledge_store/doc-*.json` source files.
//
// Outputs:
//   mcp-server/data/training/<output_basename>          — per-unit (U-CAM59..U-CAM69)
//   mcp-server/data/training/cam-unified-corpus.json    — U-CAM70 unified corpus
//
// Exit code 0 on full success, 1 on any aggregation failure.

import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mcpRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(mcpRoot, "..");
const knowledgeStoreDir = path.join(repoRoot, "cad-engine", "knowledge_store");
const trainingOutDir = path.join(mcpRoot, "data", "training");

if (!existsSync(knowledgeStoreDir)) {
  console.error(`[PHASE-4] ERROR: knowledge_store dir not found: ${knowledgeStoreDir}`);
  process.exit(1);
}

// Load the engine. Prefer the compiled dist artifact (fast); fall back to
// the .ts source so the script also works under `tsx` directly.
const distEnginePath = path.join(mcpRoot, "dist", "engines", "CAMTrainingExtractionAggregatorEngine.js");
const tsEnginePath = path.join(mcpRoot, "src", "engines", "CAMTrainingExtractionAggregatorEngine.ts");
let CAMTrainingExtractionAggregatorEngine;
if (existsSync(distEnginePath)) {
  ({ CAMTrainingExtractionAggregatorEngine } = await import(pathToFileURL(distEnginePath).href));
} else if (existsSync(tsEnginePath)) {
  ({ CAMTrainingExtractionAggregatorEngine } = await import(pathToFileURL(tsEnginePath).href));
} else {
  console.error(`[PHASE-4] engine not found in dist (${distEnginePath}) or src (${tsEnginePath})`);
  process.exit(1);
}

console.log(`[PHASE-4] knowledge_store: ${knowledgeStoreDir}`);
console.log(`[PHASE-4] output dir:      ${trainingOutDir}`);

const specs = CAMTrainingExtractionAggregatorEngine.getPhase4Specs();
console.log(`[PHASE-4] aggregating ${specs.length} unit specs`);

const unitExtractions = [];
let totalTipsAcrossUnits = 0;
let totalFormulasAcrossUnits = 0;
let totalTablesAcrossUnits = 0;
let failed = 0;

for (const spec of specs) {
  try {
    const out = CAMTrainingExtractionAggregatorEngine.aggregate(spec, knowledgeStoreDir);
    const outputPath = path.join(trainingOutDir, spec.output_basename);
    CAMTrainingExtractionAggregatorEngine.writeArtifact(out, outputPath);
    unitExtractions.push(out);
    totalTipsAcrossUnits += out.totals.tips;
    totalFormulasAcrossUnits += out.totals.formulas;
    totalTablesAcrossUnits += out.totals.parameter_tables;
    console.log(
      `[PHASE-4] ${spec.unit_id.padEnd(8)} ${spec.cam_platform.padEnd(11)} ` +
      `tips=${String(out.totals.tips).padStart(4)} formulas=${String(out.totals.formulas).padStart(3)} ` +
      `tables=${String(out.totals.parameter_tables).padStart(3)} → ${spec.output_basename}`,
    );
  } catch (err) {
    failed++;
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[PHASE-4] FAIL ${spec.unit_id}: ${msg}`);
  }
}

if (failed > 0) {
  console.error(`[PHASE-4] ${failed}/${specs.length} units failed — aborting before unified corpus emit`);
  process.exit(1);
}

// U-CAM70: unified corpus
const corpus = CAMTrainingExtractionAggregatorEngine.assembleUnifiedCorpus(
  unitExtractions,
  "CAM Unified Training Corpus (CAM-EXHAUST-MS0/U-CAM70)",
);
const corpusPath = path.join(trainingOutDir, "cam-unified-corpus.json");
CAMTrainingExtractionAggregatorEngine.writeCorpusArtifact(corpus, corpusPath);

console.log("");
console.log("[PHASE-4] ── unified corpus ─────────────────────────────────");
console.log(`[PHASE-4] U-CAM70    units=${corpus.unit_count}  tips_unique=${corpus.totals.tips_unique}  ` +
            `formulas=${corpus.totals.formulas}  tables=${corpus.totals.parameter_tables}  ` +
            `tags=${Object.keys(corpus.cross_references).length} → cam-unified-corpus.json`);
console.log("");
console.log(`[PHASE-4] PER-UNIT TOTALS  tips(non-dedup)=${totalTipsAcrossUnits}  ` +
            `formulas=${totalFormulasAcrossUnits}  tables=${totalTablesAcrossUnits}`);
console.log(`[PHASE-4] CORPUS DEDUP-DROP tips=${totalTipsAcrossUnits - corpus.totals.tips_unique}`);
console.log("[PHASE-4] OK — all 12 PHASE-4 deliverables written");
