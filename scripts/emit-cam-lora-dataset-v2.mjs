#!/usr/bin/env node
/**
 * scripts/emit-cam-lora-dataset-v2.mjs — CAM-AI-TRAINING-MS0/U-CAMT-LORA-V2
 *
 * Extended LoRA dataset emitter — 7 prompt-augmentation patterns per
 * template (vs 4 in iter 50), producing a richer training distribution.
 * Output: state/shared/corpus/cam-lora-dataset-v2.jsonl
 *
 * 7 patterns:
 *   v1: "Generate a {op} CAM template for {system} on a {featureClass} feature."
 *   v2: "How do I set up {nativeName} in {system}?"
 *   v3: "Build the parameter list for {system}'s {op} operation."
 *   v4: "I need to {op} a {featureClass}. Give me the {system} template."
 *   v5: "What's the {system} CAM template for {nativeName}?" (paraphrase 2)
 *   v6: "Show me the catalog parameters for {nativeName} in {system}."
 *   v7: "Convert this PRISM CamOperation '{op}' to a {system} click recipe for {featureClass}."
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
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
  return readFileSync(file, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
}

const FEATURE_MAP = {
  face: "face", pocket_2d: "pocket", contour_2d: "contour", slot: "slot",
  drill_peck: "thru hole", drill_spot: "spot", drill_center: "center",
  bore: "bore", tap: "tapped hole", ream: "reamed hole", thread_mill: "thread",
  chamfer: "chamfer edge", trace: "engraved line",
  swarf_5axis: "ruled surface", morph_5axis: "ruled surface",
  parallel_finish: "3D surface", scallop: "3D surface", pencil: "valley",
  contour_3d: "3D contour", rest_machine: "residual region",
  turn_rough: "external profile", turn_finish: "external profile",
  groove_turn: "groove", part_off: "cut-off",
  wedm_2axis: "thru profile", wedm_4axis_taper: "tapered thru",
  sinker_edm: "blind cavity", laser_cut: "thru profile",
  waterjet_cut: "thru profile", probe_wcs: "datum",
  additive_ded: "thin wall", additive_pbf: "lattice", additive_fdm: "thin wall",
  additive_hybrid: "near-net", combined_cycle: "multi-stage feature",
};

function feature(op) { return FEATURE_MAP[op] ?? "feature"; }

function buildPrompts(t) {
  const op = t.op;
  const sys = t.system;
  const nn = t.nativeName ?? t.nativeKey ?? op;
  const f = feature(op);
  return [
    `Generate a ${op} CAM template for ${sys} on a ${f} feature.`,
    `How do I set up ${nn} in ${sys}?`,
    `Build the parameter list for ${sys}'s ${op} operation.`,
    `I need to ${op.replace(/_/g, " ")} a ${f}. Give me the ${sys} template.`,
    `What's the ${sys} CAM template for ${nn}?`,
    `Show me the catalog parameters for ${nn} in ${sys}.`,
    `Convert this PRISM CamOperation '${op}' to a ${sys} click recipe for ${f}.`,
  ];
}

function formatCompletion(t) {
  return JSON.stringify({ op: t.op, system: t.system, nativeName: t.nativeName, parameters: t.parameters ?? {} });
}

function main() {
  mkdirSync(CORPUS_ROOT, { recursive: true });
  const lines = [];
  const perSystem = {};
  for (const sys of TARGET_SYSTEMS) {
    const templates = loadTemplates(sys);
    let count = 0;
    for (const t of templates) {
      const completion = formatCompletion(t);
      for (const prompt of buildPrompts(t)) {
        lines.push(JSON.stringify({
          messages: [
            { role: "user", content: prompt },
            { role: "assistant", content: completion },
          ],
          metadata: { op: t.op, system: t.system, templateId: t.id, version: "v2", provenance: t.provenance },
        }));
        count++;
      }
    }
    perSystem[sys] = { templates: templates.length, tuples: count };
    console.log(`[${sys}] templates=${templates.length} × 7 prompts = ${count} tuples`);
  }
  const outFile = join(CORPUS_ROOT, "cam-lora-dataset-v2.jsonl");
  writeFileSync(outFile, lines.join("\n") + "\n");
  writeFileSync(
    join(CORPUS_ROOT, "cam-lora-dataset-v2-summary.json"),
    JSON.stringify({ totalTuples: lines.length, perSystem, version: "v2", promptPatterns: 7, generatedAt: new Date().toISOString() }, null, 2),
  );
  console.log(`\nTotal v2 tuples: ${lines.length} → ${outFile}`);
}

main();
