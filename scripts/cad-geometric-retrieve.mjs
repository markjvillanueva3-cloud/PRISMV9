/**
 * cad-geometric-retrieve.mjs -- geometric similar-part RETRIEVAL over the persisted CAD geometric index
 * (slot:delta, U-CAD-GEOMEMBED-RETRIEVE). This DELIVERS the pattern-recognition capability the featurizer
 * (a80f53bd21) + index (37cd14ef83) were built for: given a NEW part (a print / STEP the operator is about
 * to make), find the most geometrically-similar parts already in the corpus -- the precedents whose
 * proven CAD/CAM approach should seed generation. Brute-force cosine KNN is exact and instant at this scale
 * (<=18k parts x 16-d), so no Qdrant/VP-tree is needed here -- Qdrant only earns its keep at millions of
 * vectors. This is the standalone reference implementation; wiring it into the live orchestrator engine
 * (which is TEXT-oriented -- backend.embedText -- and needs a geometric pre-computed-vector entry mode) is
 * the remaining integration step.
 *
 * Composition over the proven primitives (R8 -- no new KNN engine): cosineSim + meanRecallAtK from
 * cad-geometric-embedding.mjs; geometricFeatureVector to featurize an out-of-corpus query part.
 *
 * @module scripts/cad-geometric-retrieve
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { geometricFeatureVector, cosineSim, meanRecallAtK } from "./lib/cad-geometric-embedding.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, "..");
const DEFAULT_INDEX = path.resolve(REPO_ROOT, "state/shared/cad-geometric-index.jsonl");

/** Load a geometric index jsonl -> rows [{path, geometryClass, vector}]. Skips torn lines (fail-soft). */
export function loadIndex(indexPath = DEFAULT_INDEX, { readFileImpl = fs.readFileSync } = {}) {
  let text;
  try { text = readFileImpl(indexPath, "utf8"); } catch { return []; }
  const rows = [];
  for (const line of String(text).split("\n")) {
    const t = line.trim();
    if (!t.startsWith("{")) continue;
    try {
      const o = JSON.parse(t);
      if (Array.isArray(o.vector) && o.vector.length) rows.push({ path: o.path, geometryClass: o.geometryClass, vector: o.vector });
    } catch { /* skip torn line */ }
  }
  return rows;
}

/**
 * Rank index rows by cosine similarity to a query vector (desc), return the top-k. `excludePath` drops the
 * query's own row (so querying a corpus part does not return itself). Ties are broken by path for
 * determinism. Returns [{path, geometryClass, sim}].
 */
export function retrieve(queryVec, indexRows, k = 10, { excludePath } = {}) {
  const rows = Array.isArray(indexRows) ? indexRows : [];
  const scored = rows
    .filter((r) => r.path !== excludePath && Array.isArray(r.vector))
    .map((r) => ({ path: r.path, geometryClass: r.geometryClass, sim: cosineSim(queryVec, r.vector) }));
  scored.sort((a, b) => (b.sim - a.sim) || String(a.path).localeCompare(String(b.path)));
  return scored.slice(0, Math.max(0, k));
}

/** Featurize STEP text for a query part, then retrieve its k nearest corpus parts. */
export function retrieveByStepText(stepText, indexRows, k = 10, opts = {}) {
  return retrieve(geometricFeatureVector(stepText), indexRows, k, opts);
}

/** Mean recall@k over the index (each row as the query in turn), by geometryClass label. */
export function recallAtKOverIndex(indexRows, k = 10) {
  const labeled = (Array.isArray(indexRows) ? indexRows : []).map((r) => ({ label: r.geometryClass, vec: r.vector }));
  return meanRecallAtK(labeled, k);
}

/** The index a live consumer should use: the full-corpus index if built, else the reference index. */
export function defaultIndexPath() {
  const full = path.resolve(REPO_ROOT, "state/shared/cad-geometric-index-allvendor.jsonl");
  try { if (fs.existsSync(full)) return full; } catch { /* fall through */ }
  return DEFAULT_INDEX;
}

/**
 * PRECEDENT check for a generated part: featurize its STEP text, retrieve the k nearest proven corpus parts,
 * and summarize -- the majority archetype among the top-k (predictedClass), the nearest similarity, and an
 * OUTLIER flag (nearestSim below `outlierThreshold` -> the generation resembles NO proven corpus part, a
 * geometric red flag). This is the geometric pattern-recognition signal the generation loop records
 * alongside its dimensional self-check. Pure (takes index rows). NOTE the threshold (default 0.85) is tuned
 * to the COMPRESSED cosine band of non-negative feature vectors (all corpus pairs score ~0.8-1.0).
 */
export function precedentCheck(stepText, indexRows, k = 5, { outlierThreshold = 0.85 } = {}) {
  const hits = retrieveByStepText(stepText, indexRows, k);
  if (!hits.length) return { applicable: false, reason: "empty index" };
  const votes = {};
  for (const h of hits) votes[h.geometryClass] = (votes[h.geometryClass] || 0) + 1;
  const predictedClass = Object.entries(votes).sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])))[0][0];
  const nearest = hits[0];
  return {
    applicable: true,
    nearestSim: +nearest.sim.toFixed(4),
    nearestClass: nearest.geometryClass,
    predictedClass,
    isOutlier: nearest.sim < outlierThreshold,
    topK: hits.map((h) => ({ part: path.basename(h.path), geometryClass: h.geometryClass, sim: +h.sim.toFixed(4) })),
  };
}

// ── CLI ───────────────────────────────────────────────────────────────────────────────────────
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const val = (name, def) => { const i = args.indexOf(`--${name}`); return i >= 0 && i + 1 < args.length ? args[i + 1] : def; };
  const indexPath = val("index", DEFAULT_INDEX);
  const k = Number(val("k", "10"));
  const index = loadIndex(indexPath);
  if (!index.length) { console.error(`no index rows at ${indexPath} -- run build-cad-geometric-index.mjs --write first`); process.exit(2); }

  if (args.includes("--eval")) {
    console.log(`cad-geometric-retrieve eval over ${index.length} parts:`);
    for (const kk of [1, 3, 5, 10]) console.log(`  mean recall@${kk} (by geometryClass) = ${meanRecallAtK(index.map((r) => ({ label: r.geometryClass, vec: r.vector })), kk).toFixed(3)}`);
  } else {
    const queryPath = val("query", null);
    if (!queryPath) { console.error("usage: --query <part.step> [--k N] | --eval  [--index <index.jsonl>]"); process.exit(2); }
    let text; try { text = fs.readFileSync(queryPath, "utf8"); } catch { console.error(`cannot read query part: ${queryPath}`); process.exit(2); }
    const hits = retrieveByStepText(text, index, k, { excludePath: path.resolve(queryPath) });
    console.log(`top-${k} geometrically-similar corpus parts to ${path.basename(queryPath)}:`);
    for (const h of hits) console.log(`  ${h.sim.toFixed(3)}  [${h.geometryClass}]  ${path.basename(h.path)}`);
  }
}
