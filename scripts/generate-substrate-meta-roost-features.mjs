#!/usr/bin/env node
/**
 * generate-substrate-meta-roost-features.mjs — system-viz augmentation: the
 * substrate-health meta-roost.
 *
 * Iter 12 of the /goal synergize loop (echo, 2026-05-21). Compounds iter-6's
 * `ghost.link_audit_integrity` roost + iter-9's `ghost.wiki_tribal_coverage`
 * roost under a single parent `ghost.substrate_health` meta-roost — the
 * visual peer of iter-10's `goal-synergy-status.json` rollup + iter-11's
 * consolidated SessionStart digest.
 *
 * Spec: the /goal synergy loop already shipped 3-tier coverage for two
 * substrates (link-audit + wiki-tribal): producer audit → SessionStart
 * consumer digest → system-viz roost. Iter 10 added a rollup combining the
 * two audits; iter 11 added a single-line digest. This iter closes the
 * "compound viz tier" by adding one parent node above the two existing child
 * roosts so the brain-graph tree mirrors the textual aggregation. Future
 * substrates (NN/GNN bridges, handoff hygiene cross-check) will reparent
 * under the same meta-roost without further graph schema work.
 *
 * Reads `state/shared/.goal-synergy-status.json` (iter-10 rollup) and emits:
 *   - one parent ghost meta-roost `ghost.substrate_health` under
 *     `ghost.planned_features`, label encodes drift posture
 *   - one "aggregates" edge per present substrate, meta-roost → child roost
 *
 * The two existing child roosts keep their `parent: ghost.planned_features`
 * field. The new edges create an additional traversal path — the viz already
 * follows both edge-based and parent-based connectivity, so this layer
 * compounds visibility without rewriting existing nodes (which a merge-time
 * augmentation cannot do safely anyway: merge is dedupe-by-id, not mutate).
 *
 * Output: state/shared/system-viz/substrate-meta-roost-augmentation.json
 * Folded into system-graph.json by scripts/merge-augmentations.mjs.
 * Idempotent: re-running produces byte-stable output (status keys traversed
 * in deterministic name-asc order; no random ids, no time-dependent paths).
 *
 * Knobs: none (the meta-roost is ALWAYS emitted when the rollup is present;
 * its info string conveys the current health state). Stale rollup is the
 * iter-11 consumer's concern, not this generator's.
 *
 * Usage:  node scripts/generate-substrate-meta-roost-features.mjs
 * Exit:   0 ok · 1 rollup missing · 2 runtime error
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, "..");

export const SCHEMA_VERSION = "1.0.0";
/** Parent meta-roost id; child substrate roosts attach here via edges. */
export const META_ROOST_ID = "ghost.substrate_health";
/** Grandparent — the existing planned-features ghost roost (sibling of the
 * two existing substrate roosts; tree-wise the meta-roost is their cousin). */
export const PLANNED_PARENT = "ghost.planned_features";
/** L7 is one tier above the substrate roosts at L8, so the compounding is
 * visually obvious — the meta-roost sits above its constituents. */
export const META_LAYER = "L7";
export const MAX_LABEL = 80;
export const MAX_INFO = 280;

/**
 * Maps the camelCase rollup substrate key (linkAudit, wikiTribal, …) to the
 * id of its child roost in /system-viz. New substrates added in future iters
 * register here once. Order is the deterministic emission order for edges.
 */
export const SUBSTRATE_TO_ROOST = Object.freeze({
  linkAudit: "ghost.link_audit_integrity",
  wikiTribal: "ghost.wiki_tribal_coverage",
  aiMemoXref: "ghost.ai_memo_xref", // iter-17: prism-ai-memo substrate (iter-13/14/16 triplet)
});

const VIZ_DIR = path.join(ROOT, "state/shared/system-viz");
const STATUS_PATH = path.join(ROOT, "state/shared/.goal-synergy-status.json");
const OUT_PATH = path.join(VIZ_DIR, "substrate-meta-roost-augmentation.json");

/**
 * Pure: build {newNodes, newEdges, stats} from a parsed rollup object.
 *
 * @param status            parsed .goal-synergy-status.json (schemaVersion 1.0.0)
 * @param existingNodeIds   Set/array of ids already in graph (skip-list)
 */
export function generate(status, existingNodeIds = []) {
  const ids = existingNodeIds instanceof Set ? new Set(existingNodeIds) : new Set(existingNodeIds || []);
  const newNodes = [];
  const newEdges = [];

  // Defensive: rollup may be null/empty/unshape after a producer crash.
  const substrates = status && typeof status === "object" && status.substrates && typeof status.substrates === "object"
    ? status.substrates
    : {};
  const driftSurfaces = status && Array.isArray(status.driftSurfaces) ? status.driftSurfaces : [];
  const healthy = !!(status && status.healthy === true);

  // Iterate substrate keys in deterministic order. Same name-asc rule as
  // iter-11 consumer's render loop — keeps the meta-roost's info string
  // byte-stable across regens for the same input.
  const presentKeys = Object.keys(substrates)
    .filter((k) => substrates[k] && substrates[k].present === true)
    .sort();
  const presentCount = presentKeys.length;
  const driftCount = driftSurfaces.length;
  const driftLabel = driftCount === 0
    ? "all clean"
    : `${driftCount} drifted`;

  // ── meta-roost node ──
  let rootEmitted = 0;
  if (!ids.has(META_ROOST_ID)) {
    const summary = healthy && driftCount === 0
      ? "all substrates within thresholds (link-audit <2% broken, wiki-tribal >90% coverage)"
      : `drift: [${driftSurfaces.join(", ") || "see substrates"}]`;
    const info = `Compound substrate-health view aggregating ${presentCount} audited surface${presentCount === 1 ? "" : "s"}. Status: ${summary}. Source: state/shared/.goal-synergy-status.json (iter-10 rollup of iter-4 link-audit + iter-7 wiki-tribal audits).`;
    newNodes.push({
      id: META_ROOST_ID,
      label: `Substrate Health (${presentCount} surface${presentCount === 1 ? "" : "s"}, ${driftLabel})`.slice(0, MAX_LABEL),
      layer: META_LAYER,
      ghost: true,
      status: "ghost",
      kind: "ghost-meta-roost",
      parent: PLANNED_PARENT,
      // Plain text — no `[[name]]` literal in label/info (iter-6 P2-4 fix
      // absorbed: literal wikilinks here would feed back into the next
      // link-audit producer scan and create self-referential drift).
      info: info.slice(0, MAX_INFO),
    });
    ids.add(META_ROOST_ID);
    rootEmitted = 1;
  }

  // ── one "aggregates" edge per present substrate ──
  // Edge identity = (from, to, type) — same dedup rule as merge-augmentations.
  // Skip edges for substrates whose roost id we don't know (unmapped future
  // substrate); skip edges where the substrate is absent (producer says
  // present:false → the audit hasn't run yet, so the child roost may not
  // exist either; rendering a dangling edge would confuse the viz).
  let edgesEmitted = 0;
  for (const key of presentKeys) {
    const roostId = SUBSTRATE_TO_ROOST[key];
    if (!roostId) continue; // unmapped substrate — silently skip
    newEdges.push({
      from: META_ROOST_ID,
      to: roostId,
      type: "aggregates",
    });
    edgesEmitted++;
  }

  return {
    newNodes,
    newEdges,
    stats: {
      rootEmitted,
      edgesEmitted,
      healthy,
      presentCount,
      driftCount,
    },
  };
}

export function main() {
  if (!fs.existsSync(STATUS_PATH)) {
    console.error(`FATAL: ${STATUS_PATH} missing — run scripts/goal-synergy-status.mjs first`);
    return 1;
  }
  let status;
  try { status = JSON.parse(fs.readFileSync(STATUS_PATH, "utf8")); }
  catch (e) { console.error(`FATAL: status parse failed — ${e.message}`); return 2; }

  let result;
  try {
    const { newNodes, newEdges, stats } = generate(status, []);
    result = {
      schemaVersion: SCHEMA_VERSION,
      generatedAt: new Date().toISOString(),
      source: "state/shared/.goal-synergy-status.json",
      newNodes,
      newEdges,
      stats,
    };
  } catch (e) {
    console.error(`FATAL: generate failed — ${e.message}`);
    return 2;
  }

  try {
    fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
    fs.writeFileSync(OUT_PATH, JSON.stringify(result, null, 2));
  } catch (e) {
    console.error(`FATAL: write failed — ${e.message}`);
    return 2;
  }

  console.log(`wrote ${OUT_PATH}`);
  console.log(`  meta-roost emitted:   ${result.stats.rootEmitted}`);
  console.log(`  edges emitted:        ${result.stats.edgesEmitted}`);
  console.log(`  healthy:              ${result.stats.healthy}`);
  console.log(`  substrates present:   ${result.stats.presentCount}`);
  console.log(`  drift surfaces:       ${result.stats.driftCount}`);
  return 0;
}

const isMain = (() => {
  try { return process.argv[1] && path.normalize(fs.realpathSync(process.argv[1])) === path.normalize(fileURLToPath(import.meta.url)); }
  catch { return false; }
})();
if (isMain) process.exit(main());
