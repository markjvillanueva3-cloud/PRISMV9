#!/usr/bin/env node
/**
 * generate-gnn-embed-bridge-features.mjs — system-viz augmentation: GNN
 * node-embedding bridge.
 *
 * Spec: RAG-UPGRADE-MS0 / U-GNN-NODE-EMBED-BRIDGE (slot golf, 2026-05-23).
 *
 * Reads the live `state/shared/nn-graph/node-embeddings-768d.jsonl` (produced
 * by `scripts/lib/graph-node-embedding-bridge.mjs`) and emits a system-viz
 * augmentation that adds:
 *   - parent roost `ghost.gnn_embed_bridge` (under `ghost.planned_features`)
 *   - one `gnn-embed-stats` child node carrying live counts (matched, dim,
 *     model, generatedAt) extracted from the JSONL's `__meta` header
 *
 * This is the system-viz surface for the bridge's "is it built + healthy"
 * question. A missing JSONL or zero-matched header surfaces a `ghost`
 * verdict; a healthy JSONL surfaces `built` + the live matched count in the
 * `info` so the system-viz hover answers "how many nodes does the GNN
 * tier-5 actually see embeddings for right now."
 *
 * Modeled on `generate-bridge-synergy-features.mjs`. Register in
 * `scripts/regen-viz.mjs` FAST[] and `scripts/merge-augmentations.mjs` splice.
 *
 * Usage:  node scripts/generate-gnn-embed-bridge-features.mjs
 * Exit:   0 ok (always — fail-soft per R12)
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, "..");

export const SCHEMA_VERSION = "1.0.0";
export const ROOST_ID = "ghost.gnn_embed_bridge";
export const PLANNED_PARENT = "ghost.planned_features";
export const ROOST_LAYER = "L8";
export const STATS_LAYER = "L9";

const VIZ_DIR = path.join(ROOT, "state/shared/system-viz");
const JSONL_PATH = path.join(ROOT, "state/shared/nn-graph/node-embeddings-768d.jsonl");
const OUT_PATH = path.join(VIZ_DIR, "gnn-embed-bridge-augmentation.json");

/**
 * Parse the META line of the bridge JSONL. Returns { meta, ok } — ok=false on
 * any read or parse failure. Reading only the first line (~200 bytes) avoids
 * loading the full ~18MB embedding payload just to surface stats.
 */
export function readMeta(jsonlPath, opts = {}) {
  const readImpl = opts.readFileImpl || ((p) => fs.readFileSync(p, "utf8"));
  const existsImpl = opts.existsImpl || ((p) => fs.existsSync(p));
  if (!existsImpl(jsonlPath)) return { ok: false, reason: "missing", meta: null };
  let body;
  try { body = readImpl(jsonlPath); }
  catch (e) { return { ok: false, reason: `read failed: ${e.message}`, meta: null }; }
  const nl = body.indexOf("\n");
  const firstLine = nl >= 0 ? body.substring(0, nl) : body;
  if (!firstLine.trim()) return { ok: false, reason: "empty", meta: null };
  let meta;
  try { meta = JSON.parse(firstLine); }
  catch (e) { return { ok: false, reason: `parse failed: ${e.message}`, meta: null }; }
  if (!meta || meta.__meta !== true) {
    return { ok: false, reason: "first line is not __meta", meta: null };
  }
  return { ok: true, reason: null, meta };
}

/**
 * Pure: build {newNodes, newEdges, stats} from a META payload. Reference-
 * tested. Returns a roost + a single stats child; per Karpathy R2 we keep the
 * roost compact (the meaningful per-node embeddings live in the JSONL, not in
 * the system-viz hover).
 */
export function generate(meta, opts = {}) {
  const existingNodeIds = opts.existingNodeIds instanceof Set
    ? opts.existingNodeIds
    : new Set(opts.existingNodeIds || []);
  const newNodes = [];
  const newEdges = [];
  const stats = { roostAdded: 0, statsChildAdded: 0, status: "ghost" };

  const matched = meta && Number.isInteger(meta.count) ? meta.count : 0;
  const dim = meta && Number.isInteger(meta.dim) ? meta.dim : null;
  const model = (meta && typeof meta.model === "string") ? meta.model : "unknown";
  const generatedAt = (meta && typeof meta.generatedAt === "string") ? meta.generatedAt : null;

  // Verdict: healthy (matched > 0) flips to "built"; missing / 0-matched stays
  // "ghost" so the system-viz tree color-codes the broken state immediately.
  const status = matched > 0 ? "built" : "ghost";
  stats.status = status;

  const roostInfo = [
    `GNN node-embedding bridge — RAG-UPGRADE-MS0/U-GNN-NODE-EMBED-BRIDGE`,
    `matched: ${matched} nodes · dim: ${dim ?? "n/a"} · model: ${model}`,
    generatedAt ? `built: ${generatedAt}` : "build: never (run scripts/lib/graph-node-embedding-bridge.mjs)",
  ].join(" — ");

  if (!existingNodeIds.has(ROOST_ID)) {
    newNodes.push({
      id: ROOST_ID,
      layer: ROOST_LAYER,
      subgroup: "ghosts",
      label: "GNN embed-bridge",
      info: roostInfo,
      status,
      kind: "ghost-roost",
      tier: 4,
      size: 1.4,
      knowledge: {
        wikiEntries: [{
          title: "GNN node-embedding bridge",
          path: "knowledge/wiki/architecture/gnn-node-embedding-bridge.md",
          tags: ["architecture", "nn-graph", "rag-upgrade-ms0"],
        }],
        memoryEntries: [
          { name: "reference_gnn_node_embedding_bridge_2026_05_23", type: "reference", path: "knowledge/memories/reference/reference_gnn_node_embedding_bridge_2026_05_23.md" },
          { name: "reference_trainer_export_regression_2026_05_23", type: "reference", path: "knowledge/memories/reference/reference_trainer_export_regression_2026_05_23.md" },
        ],
      },
    });
    stats.roostAdded = 1;
    newEdges.push({ source: PLANNED_PARENT, target: ROOST_ID, kind: "parent" });
  }

  const statsId = ROOST_ID + ".stats";
  if (!existingNodeIds.has(statsId)) {
    newNodes.push({
      id: statsId,
      layer: STATS_LAYER,
      subgroup: "ghosts",
      label: `matched=${matched} dim=${dim ?? "n/a"}`,
      info: `Live bridge stats — ${matched} graph nodes carry ${dim ?? "n/a"}-d ${model} embeddings.` +
            (generatedAt ? ` Last build: ${generatedAt}.` : "") +
            ` The trainer consumes this as --embedding-source on each retrain.`,
      status,
      kind: "stats",
      tier: 5,
      size: 0.9,
    });
    stats.statsChildAdded = 1;
    newEdges.push({ source: ROOST_ID, target: statsId, kind: "parent" });
  }

  return { schemaVersion: SCHEMA_VERSION, newNodes, newEdges, stats };
}

/** Imperative shell — fail-soft, always exit 0 to avoid blocking regen-viz. */
function main() {
  const metaRead = readMeta(JSONL_PATH);
  const meta = metaRead.ok ? metaRead.meta : null;
  const aug = generate(meta || {});
  const out = {
    schemaVersion: SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    source: "graph-node-embedding-bridge",
    metaReadOk: metaRead.ok,
    metaReadReason: metaRead.reason,
    newNodes: aug.newNodes,
    newEdges: aug.newEdges,
    stats: aug.stats,
  };
  try {
    fs.mkdirSync(VIZ_DIR, { recursive: true });
    const tmp = OUT_PATH + ".tmp." + process.pid;
    fs.writeFileSync(tmp, JSON.stringify(out, null, 2));
    fs.renameSync(tmp, OUT_PATH);
    console.log(JSON.stringify({
      ok: true,
      status: aug.stats.status,
      nodesAdded: aug.newNodes.length,
      edgesAdded: aug.newEdges.length,
      metaReadOk: metaRead.ok,
      out: OUT_PATH,
    }));
  } catch (e) {
    console.error(JSON.stringify({ ok: false, error: e.message }));
    // exit 0 — never block regen-viz
  }
  return 0;
}

if (import.meta.url.startsWith("file:") && process.argv[1]
    && import.meta.url.endsWith(path.basename(process.argv[1]))) {
  process.exit(main());
}
