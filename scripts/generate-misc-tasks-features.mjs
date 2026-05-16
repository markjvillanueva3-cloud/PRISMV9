#!/usr/bin/env node
/**
 * generate-misc-tasks-features.mjs — system-viz augmentation: the "misc tasks" roost.
 *
 * Spec: MISC-TASKS extraction (slot juliett, forge7, 2026-05-16).
 *
 * Reads `state/shared/specs/MISC-TASKS-INVENTORY.json` (produced by
 * extract-misc-tasks.mjs) and emits a system-viz augmentation that adds:
 *   - one parent "roost" node `ghost.misc_tasks` (kind ghost-roost), under
 *     `ghost.planned_features` so it sits beside the stagnant-milestone ghosts.
 *   - one `misc-task` child node per inventory item, parented to the roost.
 *
 * Output `state/shared/system-viz/misc-tasks-augmentation.json` is folded into
 * system-graph.json by scripts/merge-augmentations.mjs. The generator is
 * modeled on generate-stagnant-features.mjs (the canonical augmentation
 * pattern) and is registered in scripts/regen-viz.mjs FAST[].
 *
 * Idempotency: re-running produces a byte-stable augmentation (deterministic
 * from the inventory). merge-augmentations.mjs skips ids already in the graph,
 * so a re-merge never duplicates a roost or task node.
 *
 * Usage:  node scripts/generate-misc-tasks-features.mjs
 * Exit:   0 ok · 1 inventory missing · 2 runtime error
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, "..");

export const SCHEMA_VERSION = "1.0.0";
/** Parent roost id for the misc-tasks subtree. */
export const MISC_ROOST_ID = "ghost.misc_tasks";
/** Grandparent — the existing planned-features ghost roost. */
export const PLANNED_PARENT = "ghost.planned_features";
export const ROOST_LAYER = "L8";
export const TASK_LAYER = "L9";
/** Max label length — matches the stagnant-features 80-char cap. */
export const MAX_LABEL = 80;
export const MAX_INFO_EVIDENCE = 160;

const VIZ_DIR = path.join(ROOT, "state/shared/system-viz");
const INVENTORY_PATH = path.join(ROOT, "state/shared/specs/MISC-TASKS-INVENTORY.json");
const OUT_PATH = path.join(VIZ_DIR, "misc-tasks-augmentation.json");

/**
 * Pure: build {newNodes,newEdges,stats} from an inventory object.
 *
 * @param inventory       parsed MISC-TASKS-INVENTORY.json
 * @param existingNodeIds optional Set/array of ids already in the graph; nodes
 *                        whose id is present are skipped (defaults to empty —
 *                        merge-augmentations.mjs is the authoritative dedupe).
 */
export function generate(inventory, existingNodeIds = []) {
  const ids = existingNodeIds instanceof Set ? new Set(existingNodeIds) : new Set(existingNodeIds || []);
  const items = inventory && Array.isArray(inventory.items) ? inventory.items : [];
  const newNodes = [];
  let roostEmitted = 0;

  // ── parent roost ──
  if (!ids.has(MISC_ROOST_ID)) {
    newNodes.push({
      id: MISC_ROOST_ID,
      label: "Misc Tasks (orphaned incomplete work)",
      layer: ROOST_LAYER,
      ghost: true,
      status: "ghost",
      kind: "ghost-roost",
      parent: PLANNED_PARENT,
      info: `${items.length} orphaned incomplete tasks — identified across PRISM chats, never finished, never roadmapped. Advisory; see state/shared/specs/MISC-TASKS-INVENTORY.md.`,
    });
    ids.add(MISC_ROOST_ID);
    roostEmitted = 1;
  }

  // ── one child per inventory item ──
  let childrenEmitted = 0, childrenSkipped = 0;
  for (const it of items) {
    const id = it && typeof it.node_id === "string" ? it.node_id : null;
    if (!id || ids.has(id)) { childrenSkipped++; continue; }
    const title = String(it.title || "(untitled)").trim();
    const conf = Number(it.confidence) || 0;
    const occ = Number(it.occurrences) || 1;
    newNodes.push({
      id,
      label: `${it.misc_id || "MISC"} · ${title}`.slice(0, MAX_LABEL),
      layer: TASK_LAYER,
      ghost: true,
      status: "ghost",
      kind: "misc-task",
      parent: MISC_ROOST_ID,
      info: `[${it.suggested_domain || "other"} · conf ${conf.toFixed(2)} · ${it.source_type || "?"}`
        + `${occ > 1 ? ` · ${occ}x` : ""}`
        + `${it.milestone_or_unit_id ? ` · ${it.milestone_or_unit_id}` : ""}] `
        + String(it.evidence || "").slice(0, MAX_INFO_EVIDENCE),
    });
    ids.add(id);
    childrenEmitted++;
  }

  return {
    newNodes,
    newEdges: [],
    stats: { roostEmitted, inventoryItems: items.length, childrenEmitted, childrenSkipped },
  };
}

export function main() {
  if (!fs.existsSync(INVENTORY_PATH)) {
    console.error(`FATAL: ${INVENTORY_PATH} missing — run scripts/extract-misc-tasks.mjs first`);
    return 1;
  }
  let inventory;
  try { inventory = JSON.parse(fs.readFileSync(INVENTORY_PATH, "utf8")); }
  catch (e) { console.error(`FATAL: inventory parse failed — ${e.message}`); return 2; }

  let result;
  try {
    // Idempotency is enforced at merge time (merge-augmentations.mjs skips
    // existing ids); we deliberately do NOT parse the 324MB graph here.
    const { newNodes, newEdges, stats } = generate(inventory, []);
    result = {
      schemaVersion: SCHEMA_VERSION,
      generatedAt: new Date().toISOString(),
      source: "state/shared/specs/MISC-TASKS-INVENTORY.json",
      newNodes,
      newEdges,
      stats,
    };
  } catch (e) {
    console.error(`FATAL: generate failed — ${e.message}`);
    return 2;
  }

  try { fs.writeFileSync(OUT_PATH, JSON.stringify(result, null, 2)); }
  catch (e) { console.error(`FATAL: write failed — ${e.message}`); return 2; }

  console.log(`wrote ${OUT_PATH}`);
  console.log(`  roost emitted:        ${result.stats.roostEmitted}`);
  console.log(`  inventory items:      ${result.stats.inventoryItems}`);
  console.log(`  task children:        ${result.stats.childrenEmitted}`);
  console.log(`  skipped (existing):   ${result.stats.childrenSkipped}`);
  console.log(`  total new nodes:      ${result.newNodes.length}`);
  return 0;
}

const isMain = (() => {
  try { return process.argv[1] && path.normalize(fs.realpathSync(process.argv[1])) === path.normalize(fileURLToPath(import.meta.url)); }
  catch { return false; }
})();
if (isMain) process.exit(main());
