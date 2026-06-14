#!/usr/bin/env node
/**
 * generate-predicted-edges-features.mjs — BLACKWELL-AI-MS0 / MS3 U-GNN-EDGE-PREDICT (slot:india).
 *
 * The system-viz CONSUMER for path-A edge-prediction — the "wire to the consumer surface" step
 * (R15). Surfaces the top predicted MISSING knowledge/cross-substrate edges as searchable
 * /system-viz nodes, exactly mirroring generate-octopus-consensus-features.mjs (the established
 * in-convention pattern: a self-contained ghost roost folded by merge-augmentations.mjs).
 *
 * Self-contained: loads the 768d GraphSAGE embeddings + the existing cross-substrate edges and
 * runs the tested predictMissingEdges() pipeline directly (no dependency on a possibly-stale
 * report file) → projects the top-K predictions into a roost.
 *
 * Emits state/shared/system-viz/predicted-missing-edges-augmentation.json:
 *   - root node  ghost.predicted_edges            (L8 cluster root)
 *   - one child  ghost.predicted_edges.<idx>       (L9, parent=root) per top prediction, carrying
 *     {from,to,score} of the likely-missing edge
 *   - "contains" edges root→child ONLY (internal ids → guaranteed non-dangling, like octopus)
 *
 * Picked up by regen-viz.mjs FAST[] + merge-augmentations.mjs loadOptional("predicted-missing-edges-augmentation.json").
 *
 * The predicted edge endpoints (ghost / wiki / memory nodes) ARE real graph node ids, but a direct
 * from→to edge between them is deferred (P3) to honor the NO-DANGLING invariant — the roost
 * carries the endpoints as node fields so they remain searchable without risking a dangling edge
 * to a node id not present post-merge (same discipline octopus used for its galaxy-node bridge).
 *
 * R12 fail-soft: missing embeddings / zero predictions → empty newNodes/newEdges (merge skips
 * cleanly), exit 0. Honest: an empty roost means "no high-confidence predictions", not dormant.
 *
 * @milestone BLACKWELL-AI-MS0/U-GNN-EDGE-PREDICT-VIZ
 * @slot india
 * @date 2026-06-09
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEmbeddings } from "./lib/edge-predict.mjs";
import { loadExistingEdgeKeys } from "./lib/edge-predict-candidates.mjs";
import { predictMissingEdges } from "./predict-missing-edges.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, "..");

export const SCHEMA_VERSION = "1.0.0";
export const ROOST_ID = "ghost.predicted_edges";
export const ROOST_LAYER = "L8";
export const EDGE_LAYER = "L9";
export const OUT_PATH = path.join(ROOT, "state/shared/system-viz/predicted-missing-edges-augmentation.json");
export const EMB_PATH = path.join(ROOT, "state/shared/nn-graph/node-embeddings-768d.jsonl");
export const EDGES_PATH = path.join(ROOT, "state/shared/system-viz/cross-substrate-edges-augmentation.json");

// Roost defaults: surface the strongest predicted documentation gaps. Bounded so the graph
// stays clean — top 25 above a 0.70 similarity floor (matches the CLI's --min 0.70 default usage).
export const DEFAULT_TOP = 25;
export const DEFAULT_MIN = 0.7;
export const DEFAULT_SOURCE_TYPES = ["ghost"];
export const DEFAULT_TARGET_TYPES = ["wiki", "memory_reference", "memory_feedback"];
const MAX_LABEL = 90;
const MAX_INFO = 200;

function truncate(s, n) {
  const str = String(s ?? "");
  return str.length > n ? str.slice(0, n - 1) + "…" : str;
}

/**
 * Pure: project a ranked predictions[] ({u,v,score}) into the roost's nodes/edges. No I/O.
 * Empty predictions → empty roost (no root node emitted), exactly like the octopus generator.
 * Returns { newNodes, newEdges, stats }.
 */
export function generate(predictions, ctx = {}) {
  const newNodes = [];
  const newEdges = [];
  const stats = {
    predictions_total: Array.isArray(predictions) ? predictions.length : 0,
    embeddings: ctx.embeddings ?? null,
    existingEdges: ctx.existingEdges ?? null,
    existingEdgesLoaded: ctx.existingEdgesLoaded ?? null,
    candidates: ctx.candidates ?? null,
  };
  const preds = Array.isArray(predictions) ? predictions.filter((p) => p && typeof p.u === "string" && typeof p.v === "string") : [];
  if (preds.length === 0) return { newNodes, newEdges, stats };

  newNodes.push({
    id: ROOST_ID,
    label: "Predicted missing knowledge edges",
    info: truncate(`${preds.length} likely-missing documented-by edge(s) (GraphSAGE link-prediction, top ${preds.length})`, MAX_INFO),
    layer: ROOST_LAYER,
    kind: "ghost-roost",
  });

  preds.forEach((p, idx) => {
    const scoreNum = typeof p.score === "number" && Number.isFinite(p.score) ? p.score : null;
    const score = scoreNum !== null ? scoreNum.toFixed(4) : "n/a";
    const nodeId = `${ROOST_ID}.${idx}`;
    newNodes.push({
      id: nodeId,
      label: truncate(`${p.u} → ${p.v}`, MAX_LABEL),
      info: truncate(`predicted missing edge · score=${score} · ${p.u} → ${p.v}`, MAX_INFO),
      layer: EDGE_LAYER,
      parent: ROOST_ID,
      kind: "predicted-edge",
      fromNode: p.u,
      toNode: p.v,
      score: scoreNum,
    });
    newEdges.push({ from: ROOST_ID, to: nodeId, kind: "contains" });
  });

  stats.emitted = preds.length;
  return { newNodes, newEdges, stats };
}

/**
 * Load embeddings + existing edges and run the prediction. Fail-soft → empty predictions + ctx
 * flags so the caller (and stats) can see WHY it was empty (no embeddings vs no high-score preds).
 */
export function readAndPredict(opts = {}) {
  const embPath = opts.embPath || EMB_PATH;
  const edgesPath = opts.edgesPath || EDGES_PATH;
  const top = opts.top ?? DEFAULT_TOP;
  const min = opts.min ?? DEFAULT_MIN;
  const sourceTypes = opts.sourceTypes || DEFAULT_SOURCE_TYPES;
  const targetTypes = opts.targetTypes || DEFAULT_TARGET_TYPES;

  let embeddings;
  let count = 0;
  try {
    ({ embeddings, count } = loadEmbeddings(embPath));
  } catch {
    return { predictions: [], ctx: { embeddings: 0, existingEdges: 0, existingEdgesLoaded: false, candidates: 0 } };
  }
  if (count === 0) {
    return { predictions: [], ctx: { embeddings: 0, existingEdges: 0, existingEdgesLoaded: false, candidates: 0 } };
  }
  const { set: existing, edgeCount, ok } = loadExistingEdgeKeys(edgesPath);
  const { predictions, gen } = predictMissingEdges(embeddings, existing, { sourceTypes, targetTypes, top, min });
  return {
    predictions,
    ctx: { embeddings: count, existingEdges: edgeCount, existingEdgesLoaded: ok, candidates: gen.candidates.length },
  };
}

export function main() {
  const outPath =
    typeof process.env.PRISM_PREDICTED_EDGES_OUT === "string" && process.env.PRISM_PREDICTED_EDGES_OUT
      ? process.env.PRISM_PREDICTED_EDGES_OUT
      : OUT_PATH;
  const embPath = process.env.PRISM_PREDICTED_EDGES_EMB || EMB_PATH;
  const edgesPath = process.env.PRISM_PREDICTED_EDGES_EDGES || EDGES_PATH;

  const { predictions, ctx } = readAndPredict({ embPath, edgesPath });
  const { newNodes, newEdges, stats } = generate(predictions, ctx);

  const out = {
    schemaVersion: SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    source: "scripts/generate-predicted-edges-features.mjs",
    newNodes,
    newEdges,
    stats,
  };
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2), "utf8");
  console.log(`[predicted-edges-viz] ${stats.predictions_total} prediction(s), ${newNodes.length} node(s) → ${outPath}`);
}

const argv1 = process.argv[1];
if (argv1 && import.meta.url === `file://${argv1.replace(/\\/g, "/")}`) {
  main();
} else if (argv1 && argv1.endsWith("generate-predicted-edges-features.mjs")) {
  // Windows triple-slash file:// quirk (see octopus generator) — match on basename so a direct
  // `node scripts/generate-predicted-edges-features.mjs` still runs main() (R12, never silent no-op).
  main();
}
