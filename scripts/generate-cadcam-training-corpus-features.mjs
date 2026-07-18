#!/usr/bin/env node
/**
 * generate-cadcam-training-corpus-features.mjs — system-viz augmentation: cad+cam training corpus roost.
 *
 * Pattern: identical to generate-misc-tasks-features.mjs (juliett iter, 2026-05-16).
 *
 * Reads `state/shared/cadcam-consolidated-corpus.json` (india iter23) and emits a
 * system-viz augmentation that adds:
 *   - one parent roost node `ghost.cadcam_training_corpus` (kind ghost-roost),
 *     under `ghost.planned_features` so it sits beside misc-tasks + bridge-synergy roosts.
 *   - two domain-pivot child roosts (`ghost.cadcam_training_corpus.cad`,
 *     `ghost.cadcam_training_corpus.cam`) so the graph visibly partitions delta vs kilo work.
 *   - one `training-source` leaf per consolidated resource, parented to its domain pivot.
 *
 * Output `state/shared/system-viz/cadcam-training-corpus-augmentation.json` is folded
 * into system-graph.json by scripts/merge-augmentations.mjs. Idempotency: re-runnable;
 * merge-augmentations.mjs is the authoritative dedupe (skip ids already in graph).
 *
 * Registered in scripts/regen-viz.mjs FAST[] and scripts/merge-augmentations.mjs.
 *
 * @milestone MIT-COURSE-INTEGRATION/U-CAD-CAM-VIZ-ROOST
 * @slot india
 * @iter 25
 * @date 2026-05-24
 *
 * Usage:  node scripts/generate-cadcam-training-corpus-features.mjs
 * Exit:   0 ok · 1 corpus missing · 2 runtime error
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, "..");

export const SCHEMA_VERSION = "1.0.0";
export const ROOST_ID = "ghost.cadcam_training_corpus";
export const CAD_PIVOT_ID = "ghost.cadcam_training_corpus.cad";
export const CAM_PIVOT_ID = "ghost.cadcam_training_corpus.cam";
export const PLANNED_PARENT = "ghost.planned_features";
export const ROOST_LAYER = "L8";
export const PIVOT_LAYER = "L9";
export const SOURCE_LAYER = "L10";
export const MAX_LABEL = 80;
export const MAX_INFO = 160;

const VIZ_DIR = path.join(ROOT, "state/shared/system-viz");
const CORPUS_PATH = path.join(ROOT, "state/shared/cadcam-consolidated-corpus.json");
const OUT_PATH = path.join(VIZ_DIR, "cadcam-training-corpus-augmentation.json");

/** Pure: build {newNodes,newEdges,stats} from a consolidated corpus object + ids-already-in-graph set. */
export function generate(corpus, existingNodeIds = []) {
  const ids = existingNodeIds instanceof Set ? new Set(existingNodeIds) : new Set(existingNodeIds || []);
  const cad = Array.isArray(corpus?.cad) ? corpus.cad : [];
  const cam = Array.isArray(corpus?.cam) ? corpus.cam : [];
  const newNodes = [];
  const newEdges = [];

  let roostEmitted = 0, cadPivotEmitted = 0, camPivotEmitted = 0;

  if (!ids.has(ROOST_ID)) {
    newNodes.push({
      id: ROOST_ID,
      label: "CAD+CAM Training Corpus (delta + kilo handoff)",
      layer: ROOST_LAYER,
      ghost: true,
      status: "ghost",
      kind: "ghost-roost",
      parent: PLANNED_PARENT,
      info: `${cad.length} CAD + ${cam.length} CAM training sources (iter23 consolidator). Delta consumes cad[]; kilo consumes cam[]. See state/shared/cadcam-consolidated-corpus.json.`,
    });
    ids.add(ROOST_ID);
    roostEmitted = 1;
  }

  if (!ids.has(CAD_PIVOT_ID)) {
    newNodes.push({
      id: CAD_PIVOT_ID,
      label: `CAD corpus → delta (${cad.length})`,
      layer: PIVOT_LAYER,
      ghost: true,
      status: "ghost",
      kind: "ghost-roost",
      parent: ROOST_ID,
      info: `${cad.length} CAD sources for delta slot. Audience: delta. Bridge: prism_cad. See knowledge/wiki/training/cad-corpus-index.md.`,
    });
    ids.add(CAD_PIVOT_ID);
    cadPivotEmitted = 1;
  }

  if (!ids.has(CAM_PIVOT_ID)) {
    newNodes.push({
      id: CAM_PIVOT_ID,
      label: `CAM corpus → kilo (${cam.length})`,
      layer: PIVOT_LAYER,
      ghost: true,
      status: "ghost",
      kind: "ghost-roost",
      parent: ROOST_ID,
      info: `${cam.length} CAM sources for kilo slot. Audience: kilo. Bridge: prism_cam. See knowledge/wiki/training/cam-corpus-index.md.`,
    });
    ids.add(CAM_PIVOT_ID);
    camPivotEmitted = 1;
  }

  let leavesEmitted = 0, leavesSkipped = 0;
  for (const [domain, entries, parent] of [["cad", cad, CAD_PIVOT_ID], ["cam", cam, CAM_PIVOT_ID]]) {
    for (const e of entries) {
      const id = `training-source.${domain}.${e.slug}`;
      if (ids.has(id)) { leavesSkipped++; continue; }
      const audience = domain === "cad" ? "delta" : "kilo";
      newNodes.push({
        id,
        label: `${domain.toUpperCase()} · ${e.slug}`.slice(0, MAX_LABEL),
        layer: SOURCE_LAYER,
        ghost: true,
        status: "ghost",
        kind: "training-source",
        parent,
        info: `[${e.kind} · ${e.source_type} · →${audience}] ${String(e.id || "").slice(0, MAX_INFO)}`,
      });
      ids.add(id);
      leavesEmitted++;
    }
  }

  return {
    newNodes,
    newEdges,
    stats: {
      roostEmitted, cadPivotEmitted, camPivotEmitted,
      cadEntries: cad.length, camEntries: cam.length,
      leavesEmitted, leavesSkipped,
    },
  };
}

export function main() {
  if (!fs.existsSync(CORPUS_PATH)) {
    console.error(`FATAL: ${CORPUS_PATH} missing — run scripts/consolidate-cadcam-corpus.mjs first`);
    return 1;
  }
  let corpus;
  try { corpus = JSON.parse(fs.readFileSync(CORPUS_PATH, "utf8")); }
  catch (e) { console.error(`FATAL: corpus parse failed — ${e.message}`); return 2; }

  let result;
  try {
    const { newNodes, newEdges, stats } = generate(corpus, []);
    result = {
      schemaVersion: SCHEMA_VERSION,
      generatedAt: new Date().toISOString(),
      source: "state/shared/cadcam-consolidated-corpus.json",
      newNodes,
      newEdges,
      stats,
    };
  } catch (e) { console.error(`FATAL: generate failed — ${e.message}`); return 2; }

  try { fs.mkdirSync(VIZ_DIR, { recursive: true }); fs.writeFileSync(OUT_PATH, JSON.stringify(result, null, 2)); }
  catch (e) { console.error(`FATAL: write failed — ${e.message}`); return 2; }

  console.log(`wrote ${OUT_PATH}`);
  console.log(`  roost emitted:        ${result.stats.roostEmitted}`);
  console.log(`  pivots emitted:       cad=${result.stats.cadPivotEmitted} cam=${result.stats.camPivotEmitted}`);
  console.log(`  cad entries:          ${result.stats.cadEntries}`);
  console.log(`  cam entries:          ${result.stats.camEntries}`);
  console.log(`  leaves emitted:       ${result.stats.leavesEmitted}`);
  console.log(`  skipped (existing):   ${result.stats.leavesSkipped}`);
  console.log(`  total new nodes:      ${result.newNodes.length}`);
  return 0;
}

const isMain = (() => {
  try { return process.argv[1] && path.normalize(fs.realpathSync(process.argv[1])) === path.normalize(fileURLToPath(import.meta.url)); }
  catch { return false; }
})();
if (isMain) process.exit(main());
