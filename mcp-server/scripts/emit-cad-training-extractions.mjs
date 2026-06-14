#!/usr/bin/env node
// CAD-TRAINING-EXTRACT-MS0 / U-CTE02..U-CTE12 emitter driver.
//
// For each PHASE-5 spec (Mastercam Basics/Solids/Wire-EDM + InventorCAM 2.5D/5-Axis/Contour
// + SolidWorks engineering graphics + Fusion CAD) emits TWO files:
//   <output_basename>-tips.json     — re-packed tribal tips from doc-*.json
//   <output_basename>-actions.json  — action sequences via ActionSequenceExtractorEngine
//
// Both files write atomically (tmp + rename). Exit 0 on full success, 1 on any failure.

import { existsSync, mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mcpRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(mcpRoot, "..");
const knowledgeStoreDir = path.join(repoRoot, "cad-engine", "knowledge_store");
const trainingOutDir = path.join(mcpRoot, "data", "training");

if (!existsSync(knowledgeStoreDir)) {
  console.error(`[CAD-CTE] ERROR: knowledge_store dir not found: ${knowledgeStoreDir}`);
  process.exit(1);
}

/**
 * Per-unit specs.
 *
 * `output_basename`     — file-stem (suffixed with -tips.json / -actions.json on emit)
 * `source_doc_basename` — doc-*.json basename in cad-engine/knowledge_store/ (no .json)
 * `min_tips` / `min_actions` — CTE unit exit-condition thresholds (used to verify deliverable)
 */
const SPECS = [
  {
    unit_id: "U-CTE02",
    output_basename: "mastercam-solids",
    source_doc_basename: "doc-mastercam-solids-tutorial",
    min_tips: 25,
    min_actions: 15,
  },
  {
    unit_id: "U-CTE03",
    output_basename: "mastercam-wire-edm",
    source_doc_basename: "doc-mastercam-wire-edm-tutorial-2018",
    min_tips: 40,
    // CTE03 unit spec has no action_sequences exit condition; emit anyway for richness, no min gate.
    min_actions: 0,
  },
  {
    unit_id: "U-CTE04",
    output_basename: "inventorcam-milling",
    source_doc_basename: "doc-inventorcam2024-2-5d-milling-training-course",
    min_tips: 50,
    min_actions: 0,
  },
];

// Load the engine — prefer dist/, fall back to .ts source (matches sibling
// emit-cam-training-extractions.mjs convention so this script also works under tsx).
const distEnginePath = path.join(mcpRoot, "dist", "engines", "ActionSequenceExtractorEngine.js");
const tsEnginePath = path.join(mcpRoot, "src", "engines", "ActionSequenceExtractorEngine.ts");
let ActionSequenceExtractorEngine;
if (existsSync(distEnginePath)) {
  ({ ActionSequenceExtractorEngine } = await import(pathToFileURL(distEnginePath).href));
} else if (existsSync(tsEnginePath)) {
  ({ ActionSequenceExtractorEngine } = await import(pathToFileURL(tsEnginePath).href));
} else {
  console.error(`[CAD-CTE] engine not found in dist (${distEnginePath}) or src (${tsEnginePath})`);
  process.exit(1);
}

function atomicWriteJson(outPath, obj) {
  mkdirSync(path.dirname(outPath), { recursive: true });
  const tmp = `${outPath}.tmp`;
  writeFileSync(tmp, `${JSON.stringify(obj, null, 2)}\n`);
  if (existsSync(outPath)) unlinkSync(outPath);
  renameSync(tmp, outPath);
}

let exitCode = 0;
for (const spec of SPECS) {
  const docPath = path.join(knowledgeStoreDir, `${spec.source_doc_basename}.json`);
  if (!existsSync(docPath)) {
    console.error(`[CAD-CTE] ${spec.unit_id}: MISSING ${docPath}`);
    exitCode = 1;
    continue;
  }

  const raw = JSON.parse(readFileSync(docPath, "utf8"));
  const tips = Array.isArray(raw.tips) ? raw.tips : [];

  // ── Tips deliverable: re-pack with source provenance + schemaVersion ──
  const tipsArtifact = {
    schemaVersion: "1.0.0",
    unit_id: spec.unit_id,
    source_doc: spec.source_doc_basename,
    generated_at: new Date().toISOString(),
    totals: { tips: tips.length },
    tips: tips.map((t) => ({ ...t, _source_doc: spec.source_doc_basename })),
  };
  const tipsPath = path.join(trainingOutDir, `${spec.output_basename}-tips.json`);
  atomicWriteJson(tipsPath, tipsArtifact);

  // ── Actions deliverable: derive via ActionSequenceExtractorEngine ──
  const actionsResult = ActionSequenceExtractorEngine.extractBatch(
    tips,
    spec.source_doc_basename,
  );
  const actionsArtifact = {
    schemaVersion: "1.0.0",
    unit_id: spec.unit_id,
    source_doc: spec.source_doc_basename,
    generated_at: new Date().toISOString(),
    ...actionsResult,
  };
  const actionsPath = path.join(trainingOutDir, `${spec.output_basename}-actions.json`);
  atomicWriteJson(actionsPath, actionsArtifact);

  // ── Acceptance verification (R12 fail-loud) ──
  const tipsCount = tipsArtifact.totals.tips;
  const actionsCount = actionsResult.totals.sequences_out;
  const tipsOk = tipsCount >= spec.min_tips;
  const actionsOk = actionsCount >= spec.min_actions;

  console.log(
    `[CAD-CTE] ${spec.unit_id} ${tipsOk && actionsOk ? "✓" : "✗"} ` +
      `tips=${tipsCount}/${spec.min_tips} actions=${actionsCount}/${spec.min_actions} ` +
      `(${tipsPath.replace(repoRoot + path.sep, "")} + ${actionsPath.replace(repoRoot + path.sep, "")})`,
  );

  if (!tipsOk) {
    console.error(`[CAD-CTE] ${spec.unit_id}: FAILED min_tips ${tipsCount} < ${spec.min_tips}`);
    exitCode = 1;
  }
  if (!actionsOk) {
    console.error(`[CAD-CTE] ${spec.unit_id}: FAILED min_actions ${actionsCount} < ${spec.min_actions}`);
    exitCode = 1;
  }
}

process.exit(exitCode);
