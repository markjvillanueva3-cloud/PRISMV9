#!/usr/bin/env node
/**
 * generate-cad-completion-augmentation.mjs -- system-viz augmentation: the CAD-completion
 * remaining-units roost. PA4-VIZ-CAD-GRAPH-UPDATE (slot:delta, 2026-06-26).
 *
 * Surfaces every CAD-completion unit (SHIPPED / PENDING / operator-gated) from the git+disk
 * reconciler (state/shared/specs/CAD-COMPLETION-STATUS.json) as ghost nodes under a single
 * `ghost.cad_completion` roost, so the operator's "remaining CAD units to train+test the model +
 * print generation" are queryable in /system-viz (the graph alpha developed). This is the viz
 * consumer of scripts/cad-completion-reconcile.mjs (the STATUS producer); it pairs with the
 * hermes-graph-improvement-driver, which can fan parallel builders at the PENDING roost children.
 *
 * Architecture (R8 -- clone of generate-slot-touch-augmentation.mjs, NOT a fork):
 *   - Pure `generate({ graph, status })` -- NO fs, NO git. `status` is the parsed STATUS.json
 *     ({ results:[{id,phase,gate,op?,state,evidence,title}], shipped, total, criticalNext, terminalDone }).
 *     `graph.nodes` supplies existingIds for an OPTIONAL pre-dedup (used by tests); production passes an
 *     empty graph because merge-augmentations.mjs is itself ADD-only/deduped by node id -- so this
 *     generator is GRAPH-FREE (cheap, FAST[]-qualified: no 542MB parse). Tested with fixtures.
 *   - CLI reads the live STATUS.json only, writes state/shared/system-viz/cad-completion-augmentation.json.
 *
 * WIRING (dual-reg -- both, or the nodes are a silent orphan per merge-augmentations.mjs comments):
 *   (1) merge-augmentations.mjs  -- loadOptional("cad-completion-augmentation.json") + mergeIndexedAugmentation.
 *   (2) regen-viz.mjs FAST[]      -- run THIS generator each regen so the augmentation stays fresh.
 *   Auto-invocation: also chained off cad-completion-reconcile.mjs (the PA2 nightly cron) so the roost
 *   refreshes whenever STATUS changes.
 *
 * Output: state/shared/system-viz/cad-completion-augmentation.json
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const VIZ_DIR = path.join(ROOT, "state", "shared", "system-viz");
const STATUS_PATH = path.join(ROOT, "state", "shared", "specs", "CAD-COMPLETION-STATUS.json");

const ROOST_ID = "ghost.cad_completion";

/** Slug a unit id into a node-id-safe suffix. Byte-stable so re-runs produce identical ids. */
export function unitNodeId(id) {
  const slug = String(id == null ? "" : id).toLowerCase().replace(/[^a-z0-9._-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  return `${ROOST_ID}.${slug}`;
}

/** Color by lifecycle state: shipped=green, operator-gated-pending=blue, plain-pending=amber. */
export function unitColor(u) {
  if (u.state === "SHIPPED") return "#22c55e";
  if (u.op) return "#3b82f6";            // operator-gated pending (merge / fanout) -- distinct from buildable
  return "#f59e0b";                       // autonomous-buildable pending
}

/**
 * Build the augmentation.
 *   graph  -- { nodes:[...] } for existingIds + a reference ghost roost's layer (never re-emit existing ids).
 *   status -- parsed CAD-COMPLETION-STATUS.json.
 * Returns { schemaVersion, generatedAt, source, newNodes, newEdges, stats } (merge-augmentations contract).
 */
export function generate({ graph, status } = {}) {
  const stats = { unitsTotal: 0, shipped: 0, pending: 0, opGated: 0, criticalNext: null, roostCreated: false, nodesEmitted: 0, edgesEmitted: 0 };
  if (!graph || !Array.isArray(graph.nodes)) {
    return { error: "graph-missing-or-malformed", newNodes: [], newEdges: [], stats };
  }
  if (!status || !Array.isArray(status.results)) {
    return { error: "status-missing-or-malformed", newNodes: [], newEdges: [], stats };
  }

  const existingIds = new Set(graph.nodes.map((n) => n && n.id));
  // Reference an existing ghost roost for a consistent layer (fall back to L8 -- the ghost tier).
  const refRoost = graph.nodes.find((n) => n && n.id === "ghost.priority_queue")
    || graph.nodes.find((n) => n && typeof n.id === "string" && n.id.startsWith("ghost."));
  const roostLayer = (refRoost && refRoost.layer) || "L8";
  const unitLayer = "L9";

  const results = status.results;
  stats.unitsTotal = results.length;
  stats.criticalNext = status.criticalNext || null;

  const newNodes = [];
  const newEdges = [];
  const seen = new Set();

  // Roost (created only if absent -- ADD-only).
  if (!existingIds.has(ROOST_ID)) {
    newNodes.push({
      id: ROOST_ID, layer: roostLayer, subgroup: "ghost",
      kind: "ghost-roost",
      label: `CAD-completion (${status.shipped ?? 0}/${status.total ?? results.length} shipped)`,
      status: "ghost",
      color: "#a78bfa",
      size: 0.5, tier: 0,
      info: `Remaining CAD units -> train+test CAD model + print-gen. criticalNext=${status.criticalNext || "(none)"}; terminalDone=${!!status.terminalDone}. Producer: scripts/cad-completion-reconcile.mjs.`,
    });
    stats.roostCreated = true;
    seen.add(ROOST_ID);
  }

  // One ghost node per unit.
  for (const u of results) {
    if (!u || !u.id) continue;
    if (u.state === "SHIPPED") stats.shipped++;
    else { stats.pending++; if (u.op) stats.opGated++; }

    const nid = unitNodeId(u.id);
    if (existingIds.has(nid) || seen.has(nid)) continue; // already merged / dup-guard
    seen.add(nid);

    const isCritical = !!status.criticalNext && u.id === status.criticalNext;
    newNodes.push({
      id: nid, layer: unitLayer, subgroup: "cad-completion",
      parent: ROOST_ID,
      kind: "cad-completion-unit",
      label: `${u.id} - ${u.state}${isCritical ? " *NEXT*" : ""}`,
      status: u.state === "SHIPPED" ? "built" : "ghost",
      color: isCritical ? "#ef4444" : unitColor(u),
      size: isCritical ? 0.4 : 0.3,
      tier: 0,
      unitId: u.id,
      phase: u.phase || null,
      gate: u.gate || null,
      state: u.state,
      opGated: !!u.op,
      critical: isCritical,
      info: `[${u.phase || "?"}${u.gate ? "/" + u.gate : ""}] ${u.title || u.id} - ${u.state}: ${u.evidence || ""}`,
    });
    stats.nodesEmitted++;
  }

  // Critical-path chain: edges between consecutive phase-A/B units in canonical (dependency) order,
  // visualizing the shortest pending route to the terminal train+test+print-gen milestone.
  const chain = results.filter((u) => u && u.id && (u.phase === "A" || u.phase === "B"));
  for (let i = 0; i < chain.length - 1; i++) {
    const from = unitNodeId(chain[i].id);
    const to = unitNodeId(chain[i + 1].id);
    newEdges.push({
      from, to,
      type: "cad-critical-path",
      status: chain[i].state === "SHIPPED" ? "done" : "pending",
      gate: chain[i + 1].gate || null,
    });
    stats.edgesEmitted++;
  }

  if (stats.roostCreated) stats.nodesEmitted++; // count the roost node too

  return {
    schemaVersion: "1.0.0",
    generatedAt: new Date().toISOString(),
    source: "CAD-COMPLETION-STATUS.json",
    newNodes,
    newEdges,
    stats,
  };
}

// -- CLI ----------------------------------------------------------------------
// Gated so a test can `import` the exports without a graph load / fs read.
const isCli = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isCli) {
  const outPath = path.join(VIZ_DIR, "cad-completion-augmentation.json");
  // REGEN-SAFE: this runs in the regen-viz FAST[] lane, which is sequential -- a non-zero exit or a
  // missing output file breaks the whole regen (the documented slot-queue-orphan failure). So on EVERY
  // path we write a VALID (possibly empty) augmentation and exit 0; the `error` field + the freshness
  // audit surface a missing/bad STATUS visibly without breaking the pipeline (R12 degrade-don't-break).
  const writeEmpty = (err) => {
    fs.writeFileSync(outPath, JSON.stringify({ schemaVersion: "1.0.0", generatedAt: new Date().toISOString(), source: "CAD-COMPLETION-STATUS.json", newNodes: [], newEdges: [], stats: {}, error: err }));
    console.error(`WARN: ${err} -> wrote empty augmentation (regen continues)`);
    process.exit(0);
  };
  if (!fs.existsSync(STATUS_PATH)) writeEmpty("status-file-missing (run scripts/cad-completion-reconcile.mjs first)");
  let status;
  try { status = JSON.parse(fs.readFileSync(STATUS_PATH, "utf8")); }
  catch (e) { writeEmpty(`status-parse-error: ${e.message}`); }

  // GRAPH-FREE: emit every node fresh; merge-augmentations.mjs is ADD-only/deduped by id, so a
  // re-emitted roost/unit is harmless. Keeps this generator cheap enough for the regen-viz FAST[] lane.
  const result = generate({ graph: { nodes: [] }, status });
  fs.writeFileSync(outPath, JSON.stringify(result));
  console.log(`wrote ${outPath} (${(fs.statSync(outPath).size / 1e3).toFixed(1)}KB)`);
  if (result.error) {
    console.log(`  error: ${result.error} (wrote valid empty augmentation; regen continues)`);
    process.exit(0);
  }
  console.log(`  units total:    ${result.stats.unitsTotal}`);
  console.log(`  shipped:        ${result.stats.shipped}`);
  console.log(`  pending:        ${result.stats.pending} (op-gated: ${result.stats.opGated})`);
  console.log(`  criticalNext:   ${result.stats.criticalNext}`);
  console.log(`  nodes emitted:  ${result.stats.nodesEmitted}`);
  console.log(`  edges emitted:  ${result.stats.edgesEmitted}`);
  console.log(`  roost created:  ${result.stats.roostCreated}`);
}
