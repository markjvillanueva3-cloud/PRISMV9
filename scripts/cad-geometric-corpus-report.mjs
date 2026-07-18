/**
 * cad-geometric-corpus-report.mjs -- geometric corpus COHERENCE diagnostic over the CAD geometric index
 * (slot:delta, U-CAD-GEOMEMBED-COHERENCE). Answers "does the featurizer actually cluster archetypes on
 * the REAL corpus, and how well?" -- the quantitative, reusable form of the R15 retrieval validation.
 * Reports, per geometryClass: count + cohesion (mean cosine of each part to its class centroid), plus the
 * mean inter-class centroid similarity and their difference (separation). A high separation means geometric
 * retrieval is meaningful; a separation near 0 means the featurizer is not discriminating (a hash would
 * score ~0). CENTROID-based so it is O(n) -- scales to the full ~18k-part corpus without the O(n^2) blowup
 * of all-pairs cohesion.
 *
 * Composition over the proven cosineSim (R8). Pure core (injectable reader for the CLI I/O).
 *
 * @module scripts/cad-geometric-corpus-report
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { cosineSim, meanRecallAtK } from "./lib/cad-geometric-embedding.mjs";
import { loadIndex } from "./cad-geometric-retrieve.mjs";

/** Mean vector of a list of equal-length numeric vectors (centroid). Returns null for an empty list. */
export function centroid(vectors) {
  const vs = (Array.isArray(vectors) ? vectors : []).filter((v) => Array.isArray(v) && v.length);
  if (vs.length === 0) return null;
  const dim = vs[0].length;
  const c = new Array(dim).fill(0);
  for (const v of vs) for (let i = 0; i < dim; i++) c[i] += v[i];
  for (let i = 0; i < dim; i++) c[i] /= vs.length;
  return c;
}

/**
 * Coherence report over index rows [{geometryClass, vector}]:
 *   byClass[c] = { count, cohesion }  (cohesion = mean cosine(member, class centroid), in [-1,1])
 *   meanCohesion       = count-weighted mean of per-class cohesion
 *   meanInterClassSim  = mean cosine between distinct class centroids
 *   separation         = meanCohesion - meanInterClassSim  (higher = better-separated archetypes)
 * A separation clearly > 0 is the quantitative proof geometric retrieval is meaningful.
 */
export function corpusCoherence(indexRows) {
  const rows = (Array.isArray(indexRows) ? indexRows : []).filter((r) => r && Array.isArray(r.vector) && r.vector.length);
  const classes = new Map();
  for (const r of rows) {
    const c = r.geometryClass || "unknown";
    if (!classes.has(c)) classes.set(c, []);
    classes.get(c).push(r.vector);
  }
  const byClass = {};
  const centroids = {};
  let wSum = 0, cohWeighted = 0;
  for (const [c, vecs] of classes) {
    const cen = centroid(vecs);
    centroids[c] = cen;
    const cohesion = cen ? vecs.reduce((a, v) => a + cosineSim(v, cen), 0) / vecs.length : 0;
    byClass[c] = { count: vecs.length, cohesion: +cohesion.toFixed(4) };
    cohWeighted += cohesion * vecs.length; wSum += vecs.length;
  }
  const classKeys = Object.keys(centroids);
  let interSum = 0, interN = 0;
  for (let i = 0; i < classKeys.length; i++) {
    for (let j = i + 1; j < classKeys.length; j++) {
      interSum += cosineSim(centroids[classKeys[i]], centroids[classKeys[j]]); interN++;
    }
  }
  const meanCohesion = wSum ? cohWeighted / wSum : 0;
  const meanInterClassSim = interN ? interSum / interN : 0;
  // RECALL is the TRUE discrimination signal. The feature vector is all-NON-NEGATIVE (fractions/ratios in
  // [0,1]), so every pair of vectors sits in the positive orthant and their cosine is compressed into a
  // high band (~0.8-1.0) -- absolute cosine `separation` therefore UNDER-reads even when archetypes are
  // cleanly retrievable. recall@k measures the RELATIVE ranking (is a freeform part's nearest neighbour
  // freeform?), which is exactly what KNN retrieval does, and is NOT compressed. Base the verdict on it.
  const labeled = rows.map((r) => ({ label: r.geometryClass, vec: r.vector }));
  return {
    totalParts: rows.length,
    classCount: classKeys.length,
    byClass,
    meanCohesion: +meanCohesion.toFixed(4),
    meanInterClassSim: +meanInterClassSim.toFixed(4),
    separation: +(meanCohesion - meanInterClassSim).toFixed(4), // descriptive only (compressed for non-negative features)
    recallAt1: +meanRecallAtK(labeled, 1).toFixed(4),
    recallAt5: +meanRecallAtK(labeled, 5).toFixed(4),
  };
}

// ── CLI ───────────────────────────────────────────────────────────────────────────────────────
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const i = args.indexOf("--index");
  const indexPath = i >= 0 && i + 1 < args.length ? args[i + 1] : path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "state/shared/cad-geometric-index.jsonl");
  const rows = loadIndex(indexPath);
  if (!rows.length) { console.error(`no index rows at ${indexPath}`); process.exit(2); }
  const rep = corpusCoherence(rows);
  console.log(`cad-geometric corpus coherence over ${rep.totalParts} parts, ${rep.classCount} classes:`);
  for (const [c, s] of Object.entries(rep.byClass).sort((a, b) => b[1].count - a[1].count)) {
    console.log(`  ${c.padEnd(10)} count=${String(s.count).padStart(6)}  cohesion=${s.cohesion.toFixed(3)}`);
  }
  console.log(`  recall@1=${rep.recallAt1}  recall@5=${rep.recallAt5}  (the TRUE discrimination signal)`);
  console.log(`  cohesion=${rep.meanCohesion}  interClassSim=${rep.meanInterClassSim}  cosine-separation=${rep.separation} (descriptive -- compressed for non-negative features)`);
  console.log(rep.recallAt1 > 0.7 ? "  -> archetypes are geometrically discriminable (retrieval is meaningful)" : "  -> WEAK: recall near chance (featurizer not discriminating)");
}
