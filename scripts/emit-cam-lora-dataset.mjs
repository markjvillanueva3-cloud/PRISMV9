#!/usr/bin/env node
/**
 * scripts/emit-cam-lora-dataset.mjs — CAM-AI-TRAINING-MS0/U-CAMT-LORA-DATASET
 *
 * Reads the 106 templates emitted in iter 47 (cam-templates-<system>.jsonl)
 * and produces a LoRA-ready (prompt, completion) JSONL dataset for adapter
 * fine-tuning.
 *
 * Output: state/shared/corpus/cam-lora-dataset.jsonl
 * One record per line, OpenAI-style:
 *   { "messages": [ {"role":"user", ...}, {"role":"assistant", ...} ] }
 *
 * Prompt patterns (4 variants per template for augmentation):
 *   v1: "Generate a {op} CAM template for {system} on a {featureClass} feature."
 *   v2: "How do I set up {nativeName} in {system}?"
 *   v3: "Build the parameter list for {system}'s {op} operation."
 *   v4: "I need to {op} a {featureClass}. Give me the {system} template."
 *
 * Completion: the full parameter bag from the template, formatted as JSON.
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
const TARGET_SYSTEMS = ["hypermill", "mastercam", "esprit", "fusion360"];

function loadTemplates(system) {
  const file = join(CORPUS_ROOT, `cam-templates-${system}.jsonl`);
  if (!existsSync(file)) return [];
  const lines = readFileSync(file, "utf8").split("\n").filter(Boolean);
  return lines.map((l) => JSON.parse(l));
}

function buildPrompts(t) {
  const op = t.op;
  const system = t.system;
  const nativeName = t.nativeName ?? t.nativeKey ?? op;
  // Best-guess featureClass from the nativeName — re-uses keyword routing.
  const feature = featureFromOp(op);
  return [
    `Generate a ${op} CAM template for ${system} on a ${feature} feature.`,
    `How do I set up ${nativeName} in ${system}?`,
    `Build the parameter list for ${system}'s ${op} operation.`,
    `I need to ${op.replace(/_/g, " ")} a ${feature}. Give me the ${system} template.`,
  ];
}

function featureFromOp(op) {
  const map = {
    face: "face",
    pocket_2d: "pocket",
    contour_2d: "contour",
    slot: "slot",
    drill_peck: "thru hole",
    drill_spot: "spot",
    drill_center: "center",
    bore: "bore",
    tap: "tapped hole",
    ream: "reamed hole",
    thread_mill: "thread",
    chamfer: "chamfer edge",
    trace: "engraved line",
    swarf_5axis: "ruled surface",
    morph_5axis: "ruled surface",
    parallel_finish: "3D surface",
    scallop: "3D surface",
    pencil: "valley",
    contour_3d: "3D contour",
    rest_machine: "residual region",
    turn_rough: "external profile",
    turn_finish: "external profile",
    groove_turn: "groove",
    part_off: "cut-off",
    wedm_2axis: "thru profile",
    wedm_4axis_taper: "tapered thru",
    sinker_edm: "blind cavity",
    laser_cut: "thru profile",
    waterjet_cut: "thru profile",
    probe_wcs: "datum",
    additive_ded: "thin wall",
    additive_pbf: "lattice",
    additive_fdm: "thin wall",
    additive_hybrid: "near-net",
    combined_cycle: "multi-stage feature",
  };
  return map[op] ?? "feature";
}

function formatCompletion(t) {
  // Strip non-training metadata; keep op + system + parameters.
  const completion = {
    op: t.op,
    system: t.system,
    nativeName: t.nativeName,
    parameters: t.parameters ?? {},
  };
  return JSON.stringify(completion);
}

function main() {
  mkdirSync(CORPUS_ROOT, { recursive: true });
  const allLines = [];
  let perSystem = {};
  for (const sys of TARGET_SYSTEMS) {
    const templates = loadTemplates(sys);
    let count = 0;
    for (const t of templates) {
      const prompts = buildPrompts(t);
      const completion = formatCompletion(t);
      for (const prompt of prompts) {
        const record = {
          messages: [
            { role: "user", content: prompt },
            { role: "assistant", content: completion },
          ],
          metadata: {
            op: t.op,
            system: t.system,
            templateId: t.id,
            provenance: t.provenance,
          },
        };
        allLines.push(JSON.stringify(record));
        count++;
      }
    }
    perSystem[sys] = { templates: templates.length, tuples: count };
    console.log(`[${sys}] templates=${templates.length} → tuples=${count}`);
  }
  const outFile = join(CORPUS_ROOT, "cam-lora-dataset.jsonl");
  writeFileSync(outFile, allLines.join("\n") + "\n");
  const summary = { totalTuples: allLines.length, perSystem, generatedAt: new Date().toISOString() };
  writeFileSync(join(CORPUS_ROOT, "cam-lora-dataset-summary.json"), JSON.stringify(summary, null, 2));
  console.log(`\nTotal tuples: ${allLines.length} → ${outFile}`);
}

main();
