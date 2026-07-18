#!/usr/bin/env node
// scripts/predict-missing-edges.mjs
//
// BLACKWELL-AI-MS0 / MS3 U-GNN-EDGE-PREDICT (slot:india) — PATH-A consumer/wiring.
//
// Runnable surface that composes the two scrutinized libs into a missing-edge report:
//   loadEmbeddings (edge-predict.mjs)            — 768d GraphSAGE node vectors
//   loadExistingEdgeKeys (edge-predict-candidates.mjs) — already-linked pairs to exclude
//   generateCandidates  (edge-predict-candidates.mjs)  — unwired (source,target) pairs
//   rankEdges           (edge-predict.mjs)             — sigmoid(cosine) score + DESC rank
// → a persisted ranked report of likely-MISSING knowledge/cross-substrate edges
//   (e.g. a ghost that should be `documented-by` a wiki/memory node).
//
// This is path-A (knowledge edges over the existing 543-node knowledge-corpus
// embedding set — operator decision 2026-06-08 "A now, B after regen"). Path-B
// (engine→dispatcher wiring inference) waits on a regenerated embedding set that
// includes eng.*/disp.* nodes. See reference_gnn_edge_predict_foundation_2026_06_08.
//
// Usage:
//   node scripts/predict-missing-edges.mjs [--source ghost] [--target wiki,memory_reference,memory_feedback]
//        [--top 50] [--min 0.70] [--out <path>] [--embeddings <jsonl>] [--edges <json>] [--json]
//
// R12 fail-loud: exits non-zero with a clear message if the embeddings file yields
// zero nodes (a silent empty report would falsely read as "no missing edges").

import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { loadEmbeddings, rankEdges } from "./lib/edge-predict.mjs";
import { loadExistingEdgeKeys, generateCandidates } from "./lib/edge-predict-candidates.mjs";

const PRISM_ROOT = process.env.PRISM_ROOT || process.cwd();
const EMB_DEFAULT = path.join(PRISM_ROOT, "state/shared/nn-graph/node-embeddings-768d.jsonl");
const EDGES_DEFAULT = path.join(PRISM_ROOT, "state/shared/system-viz/cross-substrate-edges-augmentation.json");
const OUT_DEFAULT = path.join(PRISM_ROOT, "state/shared/system-viz/predicted-missing-edges.json");

/** Split a comma-list arg into trimmed non-empty type names; "" / undefined → undefined (= no filter). */
export function splitTypes(s) {
  if (typeof s !== "string") return undefined;
  const arr = s.split(",").map((x) => x.trim()).filter(Boolean);
  return arr.length ? arr : undefined;
}

/**
 * Pure prediction step (testable without disk): generate candidates from the
 * embeddings + existing-edge set, score + rank, filter by `min`, slice to `top`.
 * @param {Map<string, number[]>} embeddings
 * @param {Set<string>} existingEdges
 * @param {{ sourceTypes?: string[], targetTypes?: string[], top?: number, min?: number }} [opts]
 * @returns {{ predictions: Array<{u:string,v:string,score:number}>, gen: object }}
 */
export function predictMissingEdges(embeddings, existingEdges, opts = {}) {
  const { sourceTypes, targetTypes, top = 50, min = 0 } = opts;
  const gen = generateCandidates(embeddings, { sourceTypes, targetTypes, existingEdges });
  const { ranked } = rankEdges(embeddings, gen.candidates); // full rank; candidate set already bounded
  const filtered = min > 0 ? ranked.filter((r) => r.score >= min) : ranked;
  return { predictions: filtered.slice(0, Math.max(0, top)), gen };
}

/** Minimal flag parser (no deps). Unknown flags ignored; values follow their flag. */
export function parseArgs(argv) {
  const a = {
    source: "ghost",
    target: "wiki,memory_reference,memory_feedback",
    top: 50,
    min: 0,
    out: OUT_DEFAULT,
    embeddings: EMB_DEFAULT,
    edges: EDGES_DEFAULT,
    json: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (t === "--source") a.source = argv[++i];
    else if (t === "--target") a.target = argv[++i];
    else if (t === "--top") a.top = Number.parseInt(argv[++i], 10);
    else if (t === "--min") a.min = Number.parseFloat(argv[++i]);
    else if (t === "--out") a.out = argv[++i];
    else if (t === "--embeddings") a.embeddings = argv[++i];
    else if (t === "--edges") a.edges = argv[++i];
    else if (t === "--json") a.json = true;
  }
  if (!Number.isFinite(a.top)) a.top = 50;
  if (!Number.isFinite(a.min)) a.min = 0;
  // A trailing valueless --out/--embeddings/--edges sets the value to undefined
  // (argv[++i] past the end). Fall back to the default rather than nuking it — an
  // undefined --out would otherwise crash writeFileSync(undefined) at run time.
  if (typeof a.out !== "string" || !a.out) a.out = OUT_DEFAULT;
  if (typeof a.embeddings !== "string" || !a.embeddings) a.embeddings = EMB_DEFAULT;
  if (typeof a.edges !== "string" || !a.edges) a.edges = EDGES_DEFAULT;
  return a;
}

/** CLI entry. Returns a process exit code (0 ok, 1 fail-loud). */
export function run(argv = process.argv.slice(2), io = {}) {
  const log = io.log || console.log;
  const err = io.err || console.error;
  const a = parseArgs(argv);

  let embeddings, count, skipped;
  try {
    ({ embeddings, count, skipped } = loadEmbeddings(a.embeddings));
  } catch (e) {
    // loadEmbeddings reads the file with no internal guard — a missing/typo'd path
    // throws ENOENT. Catch it for the SAME clean fail-loud exit as the write path
    // + the zero-embeddings path, not an uncaught stack trace (reviewer arm-A P1).
    err(`FAIL: could not read embeddings from ${a.embeddings}: ${e?.message || e}`);
    return 1;
  }
  if (count === 0) {
    err(`FAIL: no embeddings loaded from ${a.embeddings} (skipped ${skipped}). Cannot predict edges.`);
    return 1;
  }
  const { set: existing, edgeCount, ok } = loadExistingEdgeKeys(a.edges);
  const sourceTypes = splitTypes(a.source);
  const targetTypes = splitTypes(a.target);
  const { predictions, gen } = predictMissingEdges(embeddings, existing, {
    sourceTypes,
    targetTypes,
    top: a.top,
    min: a.min,
  });

  const report = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    generator: "predict-missing-edges.mjs",
    inputs: {
      embeddings: count,
      embeddingsSkipped: skipped,
      existingEdges: edgeCount,
      existingEdgesLoaded: ok,
      sourceTypes: sourceTypes ?? "all",
      targetTypes: targetTypes ?? "all",
      candidates: gen.candidates.length,
      excludedExisting: gen.excludedExisting,
      capped: gen.capped,
      minScore: a.min,
      top: a.top,
    },
    predictions,
  };
  try {
    mkdirSync(path.dirname(a.out), { recursive: true });
    writeFileSync(a.out, JSON.stringify(report, null, 2));
  } catch (e) {
    // Clean fail-loud exit (consistent with the zero-embeddings exit 1) rather than
    // an uncaught stack trace, if the out path is unwritable.
    err(`FAIL: could not write report to ${a.out}: ${e?.message || e}`);
    return 1;
  }

  if (a.json) {
    log(JSON.stringify(report.inputs));
  } else {
    if (!ok) err(`WARN: existing-edge file ${a.edges} not loaded (exclusion OFF) — predictions may include already-linked pairs.`);
    log(
      `predicted ${predictions.length} missing edges` +
        ` (${gen.candidates.length} candidates from ${count} nodes, ${edgeCount} existing edges` +
        `${gen.capped ? ", CANDIDATES CAPPED" : ""}) → ${a.out}`,
    );
    for (const p of predictions.slice(0, 10)) log(`  ${p.score.toFixed(4)}  ${p.u} → ${p.v}`);
  }
  return 0;
}

// Run only as the main entry; importable for tests. pathToFileURL handles the
// Windows triple-slash absolute-path quirk a bare string template can't.
const isDirectRun = !!process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isDirectRun) process.exit(run());
