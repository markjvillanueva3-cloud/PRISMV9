#!/usr/bin/env node
/**
 * scripts/emit-cam-speeds-feeds-matrix.mjs
 *   CAM-AI-TRAINING-MS0/U-CAMT-SF-MATRIX
 *
 * Read the canonical RECOMMENDED table inside CAMFeedrateChiploadEngine.ts
 * and emit:
 *   1. Material x ToolFamily speeds+feeds matrix (CSV)
 *   2. LoRA tuples — "what cutting speed + chipload for {material} with {tool}?"
 *
 * Uses String.prototype.matchAll (no regex.exec, no child_process).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = dirname(__dirname);
const CORPUS = join(REPO_ROOT, "state", "shared", "corpus");
const ENGINE_SRC = join(REPO_ROOT, "mcp-server", "src", "engines", "CAMFeedrateChiploadEngine.ts");

const OPERATOR_CONSTRAINT = "no synthetic parts, must be real parts taken from real reputable sources (2026-05-25)";

const src = readFileSync(ENGINE_SRC, "utf8");

const tableStart = src.indexOf("const REC_TABLE");
if (tableStart < 0) throw new Error("RECOMMENDED table not found");
const tableEnd = src.indexOf("};", tableStart);
const tableSrc = src.slice(tableStart, tableEnd + 2);

const MATERIALS = ["aluminum", "steel", "stainless", "titanium", "inconel", "hardened_steel", "tool_steel", "copper", "brass", "plastic", "composite"];

function extractMaterialBlock(material) {
  const re = new RegExp(`${material}\\s*:\\s*\\{([\\s\\S]*?)\\n\\s*\\},`);
  const m = tableSrc.match(re);
  return m ? m[1] : null;
}

function extractToolFamilyEntries(block) {
  if (!block) return [];
  const re = /(\w+)\s*:\s*\{\s*cuttingSpeedMmin:\s*([\d.]+)\s*,\s*chiploadMmTooth:\s*([\d.]+)\s*\}/g;
  const out = [];
  for (const m of block.matchAll(re)) {
    out.push({ toolFamily: m[1], cuttingSpeedMmin: Number(m[2]), chiploadMmTooth: Number(m[3]) });
  }
  return out;
}

const rows = [];
for (const mat of MATERIALS) {
  const block = extractMaterialBlock(mat);
  if (!block) continue;
  for (const entry of extractToolFamilyEntries(block)) {
    rows.push({ material: mat, ...entry });
  }
}

const csvHeader = "material,toolFamily,cuttingSpeedMmin,chiploadMmTooth";
const csvBody = rows.map((r) => `${r.material},${r.toolFamily},${r.cuttingSpeedMmin},${r.chiploadMmTooth}`).join("\n");
writeFileSync(join(CORPUS, "cam-speeds-feeds-matrix.csv"), csvHeader + "\n" + csvBody + "\n");

const tuples = [];
for (const r of rows) {
  const mat = r.material.replace(/_/g, " ");
  const tool = r.toolFamily.replace(/_/g, " ");
  const completion = JSON.stringify({
    material: r.material,
    toolFamily: r.toolFamily,
    cuttingSpeedMmin: r.cuttingSpeedMmin,
    chiploadMmTooth: r.chiploadMmTooth,
    units: { cuttingSpeed: "m/min", chipload: "mm/tooth" },
    source: "CAMFeedrateChiploadEngine canonical table",
  });
  const prompts = [
    `What's a typical cutting speed for ${mat} with a ${tool}?`,
    `Recommend speeds and feeds for ${tool} cutting ${mat}.`,
    `What chipload should I use for ${tool} on ${mat}?`,
    `Give me a starting cutting speed and chipload for ${tool} in ${mat}.`,
    `${mat} with ${tool} - what cutting parameters?`,
  ];
  for (const prompt of prompts) {
    tuples.push({
      messages: [
        { role: "user", content: prompt },
        { role: "assistant", content: completion },
      ],
      metadata: {
        kind: "speeds-feeds-recommendation",
        material: r.material,
        toolFamily: r.toolFamily,
        provenance: {
          realDataOnly: true,
          sourceMilestone: "CAM-AI-TRAINING-MS0",
          sourceSlot: "kilo",
          sourceEngine: "CAMFeedrateChiploadEngine",
          operatorConstraint: OPERATOR_CONSTRAINT,
        },
      },
    });
  }
}

writeFileSync(
  join(CORPUS, "cam-speeds-feeds-tuples.jsonl"),
  tuples.map((r) => JSON.stringify(r)).join("\n") + "\n"
);

writeFileSync(
  join(CORPUS, "cam-speeds-feeds-summary.json"),
  JSON.stringify({
    materialsCovered: new Set(rows.map((r) => r.material)).size,
    toolFamiliesCovered: new Set(rows.map((r) => r.toolFamily)).size,
    matrixCells: rows.length,
    promptPatternsPerCell: 5,
    totalTuples: tuples.length,
    generatedAt: new Date().toISOString(),
  }, null, 2)
);

console.log(`materials=${new Set(rows.map((r) => r.material)).size} | toolFamilies=${new Set(rows.map((r) => r.toolFamily)).size} | matrix cells=${rows.length}`);
console.log(`speeds-feeds tuples: ${tuples.length}`);
