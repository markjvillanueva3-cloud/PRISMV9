#!/usr/bin/env node
/**
 * scripts/emit-cam-rag-index.mjs — CAM-AI-TRAINING-MS0/U-CAMT-RAG-INDEX
 *
 * Reads the 106-template JSONL emitted in iter 47 and produces RAG-ready
 * embedding-source records. Each record is a single chunk of natural-
 * language + structured-parameter prose the embedder ingests directly.
 *
 * Output: state/shared/corpus/cam-rag-index.jsonl
 * One record per line: { id, text, metadata: { op, system, nativeName, paramCount, source } }
 *
 * REAL DATA ONLY (operator constraint 2026-05-25).
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = dirname(__dirname);
const CORPUS_ROOT = join(REPO_ROOT, "state", "shared", "corpus");
const TARGET_SYSTEMS = ["hypermill", "mastercam", "esprit", "fusion360", "nxcam"];

function loadTemplates(system) {
  const file = join(CORPUS_ROOT, `cam-templates-${system}.jsonl`);
  if (!existsSync(file)) return [];
  const lines = readFileSync(file, "utf8").split("\n").filter(Boolean);
  return lines.map((l) => JSON.parse(l));
}

/** Convert template parameters object → readable parameter prose. */
function paramsToProse(params) {
  if (!params || typeof params !== "object") return "";
  const entries = Object.entries(params).filter(([, v]) => v !== null && v !== undefined);
  if (entries.length === 0) return "No default parameters declared in catalog.";
  return entries.map(([k, v]) => `${k} = ${JSON.stringify(v)}`).join("; ");
}

function buildRagText(t) {
  const op = t.op;
  const system = t.system;
  const nativeName = t.nativeName ?? t.nativeKey ?? op;
  const paramProse = paramsToProse(t.parameters);
  // 3 paragraphs: title / operational summary / parameter detail
  return [
    `CAM template: ${nativeName} (${op}) in ${system}.`,
    `This template implements the ${op.replace(/_/g, " ")} operation as exposed in ${system}'s catalog under the native key "${t.nativeKey}". It is sourced from real operator-mapped catalog data with provenance ${t.provenance?.sourceMilestone ?? "CAM-AI-TRAINING-MS0"}.`,
    `Parameters: ${paramProse}`,
  ].join("\n\n");
}

function processTemplate(t) {
  return {
    id: `rag-${t.id}`,
    text: buildRagText(t),
    metadata: {
      op: t.op,
      system: t.system,
      nativeName: t.nativeName,
      nativeKey: t.nativeKey,
      paramCount: Object.keys(t.parameters ?? {}).length,
      source: "CAM-AI-TRAINING-MS0/U-CAMT-RAG-INDEX",
      provenance: t.provenance,
    },
  };
}

function main() {
  mkdirSync(CORPUS_ROOT, { recursive: true });
  const allLines = [];
  const perSystem = {};
  for (const sys of TARGET_SYSTEMS) {
    const templates = loadTemplates(sys);
    let count = 0;
    for (const t of templates) {
      const rec = processTemplate(t);
      allLines.push(JSON.stringify(rec));
      count++;
    }
    perSystem[sys] = { templates: templates.length, ragRecords: count };
    console.log(`[${sys}] templates=${templates.length} → rag-records=${count}`);
  }
  const outFile = join(CORPUS_ROOT, "cam-rag-index.jsonl");
  writeFileSync(outFile, allLines.join("\n") + "\n");
  const summary = { totalRecords: allLines.length, perSystem, generatedAt: new Date().toISOString() };
  writeFileSync(join(CORPUS_ROOT, "cam-rag-index-summary.json"), JSON.stringify(summary, null, 2));
  console.log(`\nTotal RAG records: ${allLines.length} → ${outFile}`);
}

main();
