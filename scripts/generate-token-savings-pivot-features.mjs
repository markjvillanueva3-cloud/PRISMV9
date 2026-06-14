#!/usr/bin/env node
/**
 * generate-token-savings-pivot-features.mjs — system-viz augmentation for the
 * TOKEN-SAVINGS-PIVOT route-suggest telemetry sidecar.
 *
 * Reads `state/shared/mcp-route-suggest-stats.json` (produced by
 * .claude/hooks/mcp-route-suggest.mjs on every TOKEN-SAVE nudge fire) and
 * emits a system-viz augmentation that adds:
 *   - one parent roost `ghost.token_savings_pivot` (kind ghost-roost) under
 *     `ghost.planned_features`, beside the misc-tasks and priority-queue roosts.
 *   - one `tsp-classifier` child node per classifier with its fire count.
 *   - one `tsp-tool` child node per tool name with its fire count (named to
 *     not collide with classifiers).
 *
 * Output `state/shared/system-viz/token-savings-pivot-augmentation.json` is
 * folded into `system-graph.json` by `scripts/merge-augmentations.mjs`. Modeled
 * on generate-misc-tasks-features.mjs (the canonical augmentation pattern).
 *
 * Idempotency: re-running produces a byte-stable augmentation when the sidecar
 * is unchanged. merge-augmentations.mjs skips ids already in the graph, so a
 * re-merge never duplicates a roost or child node.
 *
 * Sidecar missing path: the generator emits an EMPTY augmentation (roost +
 * "no fires yet" placeholder) so the viz still shows the milestone exists.
 *
 * Usage:  node scripts/generate-token-savings-pivot-features.mjs
 * Exit:   0 ok · 2 runtime error
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, "..");

export const SCHEMA_VERSION = "1.0.0";
/** Parent roost id for the token-savings-pivot subtree. */
export const TSP_ROOST_ID = "ghost.token_savings_pivot";
/** Grandparent — the existing planned-features ghost roost. */
export const PLANNED_PARENT = "ghost.planned_features";
export const ROOST_LAYER = "L8";
export const CHILD_LAYER = "L9";
export const MAX_LABEL = 80;

const VIZ_DIR = path.join(ROOT, "state/shared/system-viz");
const SIDECAR_PATH = path.join(ROOT, "state/shared/mcp-route-suggest-stats.json");
const OUT_PATH = path.join(VIZ_DIR, "token-savings-pivot-augmentation.json");

/**
 * Pure: build {newNodes,newEdges,stats} from a parsed sidecar object.
 *
 * @param sidecar         parsed mcp-route-suggest-stats.json (or null when missing)
 * @param existingNodeIds optional Set/array of ids already in the graph; nodes
 *                        whose id is present are skipped (defaults to empty —
 *                        merge-augmentations.mjs is the authoritative dedupe).
 */
export function generate(sidecar, existingNodeIds = []) {
  const ids = existingNodeIds instanceof Set ? new Set(existingNodeIds) : new Set(existingNodeIds || []);
  const newNodes = [];
  const totalFires = (sidecar && typeof sidecar.totalFires === "number") ? sidecar.totalFires : 0;
  const byClassifier = (sidecar && sidecar.byClassifier && typeof sidecar.byClassifier === "object") ? sidecar.byClassifier : {};
  const byToolName = (sidecar && sidecar.byToolName && typeof sidecar.byToolName === "object") ? sidecar.byToolName : {};

  // ── parent roost ──
  let roostEmitted = 0;
  if (!ids.has(TSP_ROOST_ID)) {
    newNodes.push({
      id: TSP_ROOST_ID,
      label: "TOKEN-SAVINGS-PIVOT (route-suggest telemetry)",
      layer: ROOST_LAYER,
      ghost: true,
      status: "ghost",
      kind: "ghost-roost",
      parent: PLANNED_PARENT,
      info: totalFires > 0
        ? `${totalFires} TOKEN-SAVE nudges fired fleet-wide. 9 classifiers tracked via atomic-write sidecar. /route-suggest-stats reports ROI.`
        : "TOKEN-SAVE nudge layer wired but no fires recorded yet. /route-suggest-stats reports ROI.",
    });
    ids.add(TSP_ROOST_ID);
    roostEmitted = 1;
  }

  // ── one child per classifier ──
  let classifierChildren = 0;
  const classifierEntries = Object.entries(byClassifier).sort((a, b) => b[1] - a[1]);
  for (const [classifier, count] of classifierEntries) {
    const id = `tsp.classifier.${classifier}`;
    if (ids.has(id)) continue;
    newNodes.push({
      id,
      label: `${classifier} (${count} fires)`.slice(0, MAX_LABEL),
      layer: CHILD_LAYER,
      ghost: true,
      status: "ghost",
      kind: "tsp-classifier",
      parent: TSP_ROOST_ID,
      info: `Classifier ${classifier} fired ${count} time(s). Source: state/shared/mcp-route-suggest-stats.json byClassifier.`,
    });
    ids.add(id);
    classifierChildren++;
  }

  // ── one child per tool name ──
  let toolChildren = 0;
  const toolEntries = Object.entries(byToolName).sort((a, b) => b[1] - a[1]);
  for (const [toolName, count] of toolEntries) {
    const id = `tsp.tool.${toolName}`;
    if (ids.has(id)) continue;
    newNodes.push({
      id,
      label: `${toolName} (${count} fires)`.slice(0, MAX_LABEL),
      layer: CHILD_LAYER,
      ghost: true,
      status: "ghost",
      kind: "tsp-tool",
      parent: TSP_ROOST_ID,
      info: `Tool ${toolName} triggered ${count} TOKEN-SAVE nudge(s). Source: state/shared/mcp-route-suggest-stats.json byToolName.`,
    });
    ids.add(id);
    toolChildren++;
  }

  return {
    newNodes,
    newEdges: [],
    stats: { roostEmitted, totalFires, classifierChildren, toolChildren },
  };
}

export function main() {
  let sidecar = null;
  if (fs.existsSync(SIDECAR_PATH)) {
    try { sidecar = JSON.parse(fs.readFileSync(SIDECAR_PATH, "utf8")); }
    catch (e) {
      console.error(`WARN: sidecar parse failed — ${e.message}; emitting empty roost`);
      sidecar = null;
    }
  }

  let result;
  try {
    const { newNodes, newEdges, stats } = generate(sidecar, []);
    result = {
      schemaVersion: SCHEMA_VERSION,
      generatedAt: new Date().toISOString(),
      source: "state/shared/mcp-route-suggest-stats.json",
      newNodes,
      newEdges,
      stats,
    };
  } catch (e) {
    console.error(`FATAL: generate failed — ${e.message}`);
    return 2;
  }

  try {
    if (!fs.existsSync(VIZ_DIR)) fs.mkdirSync(VIZ_DIR, { recursive: true });
    fs.writeFileSync(OUT_PATH, JSON.stringify(result, null, 2));
  }
  catch (e) { console.error(`FATAL: write failed — ${e.message}`); return 2; }

  console.log(`wrote ${OUT_PATH}`);
  console.log(`  roost emitted:        ${result.stats.roostEmitted}`);
  console.log(`  totalFires (sidecar): ${result.stats.totalFires}`);
  console.log(`  classifier children:  ${result.stats.classifierChildren}`);
  console.log(`  tool children:        ${result.stats.toolChildren}`);
  console.log(`  total new nodes:      ${result.newNodes.length}`);
  return 0;
}

const isMain = (() => {
  try { return process.argv[1] && path.normalize(fs.realpathSync(process.argv[1])) === path.normalize(fileURLToPath(import.meta.url)); }
  catch { return false; }
})();
if (isMain) process.exit(main());
