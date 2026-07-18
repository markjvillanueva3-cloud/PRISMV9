#!/usr/bin/env node
/**
 * bench-embed-quantize-recall.mjs -- measure binary-quantization retrieval RECALL on PRISM's REAL
 * embeddings (U-EMBED-BINARY-QUANTIZE validation, slot:india 2026-06-18). NON-DESTRUCTIVE: reads an
 * embeddings JSONL, never writes deployed state.
 *
 * Answers the gating question for the GNN direct-embed path (leg #10): does the 32x binary two-stage
 * retrieve (Hamming prefilter -> rescore) recover the SAME top-k neighbours as the deployed
 * full-precision cosine? india gates on real metrics -- this produces recall@k, not an assumption.
 *
 * The stores already hold int8 `q` (+ per-row scale `s`); cosine is scale-invariant, so the int8 `q`
 * vector IS the deployed-precision reference for RANKING. Binary = sign-bits of `q` (zeroPoint~0).
 *
 * Usage: node scripts/bench-embed-quantize-recall.mjs [path.jsonl] [--k=5] [--cand=100] [--limit=N]
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { binarize, hammingSearch, cosineSim, footprintBytes } from "./lib/binary-embed-quantize.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

function parseArgs(argv) {
  const out = { file: path.join(ROOT, "state", "shared", "nn-graph", "ghost-node-embeddings.jsonl"), k: 5, cand: 100, limit: Infinity };
  for (const a of argv) {
    if (a.startsWith("--k=")) out.k = Math.max(1, parseInt(a.slice(4), 10) || 5);
    else if (a.startsWith("--cand=")) out.cand = Math.max(1, parseInt(a.slice(7), 10) || 100);
    else if (a.startsWith("--limit=")) out.limit = Math.max(1, parseInt(a.slice(8), 10) || Infinity);
    else if (!a.startsWith("--")) out.file = path.isAbsolute(a) ? a : path.join(ROOT, a);
  }
  return out;
}

/** Load the float/int8 vectors from a node-embedding JSONL (skips the __meta header; field `q`). */
function loadVectors(file, limit) {
  const rows = [];
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const t = line.trim();
    if (!t) continue;
    let o; try { o = JSON.parse(t); } catch { continue; }
    if (o.__meta || !Array.isArray(o.q)) continue; // header / non-vector row
    rows.push(o.q);
    if (rows.length >= limit) break;
  }
  return rows;
}

function main() {
  const { file, k, cand, limit } = parseArgs(process.argv.slice(2));
  if (!fs.existsSync(file)) { console.error(`bench: no such file ${file}`); return 1; }
  const vecs = loadVectors(file, limit);
  if (vecs.length < k + 1) { console.error(`bench: need > ${k} vectors, got ${vecs.length}`); return 1; }
  const dim = vecs[0].length;
  const packed = vecs.map(binarize);

  // Brute-force full-precision (int8 cosine = deployed ranking) top-k vs binary two-stage top-k, per query.
  let recallSum = 0, queries = 0;
  for (let qi = 0; qi < vecs.length; qi++) {
    const q = vecs[qi];
    // reference: exact cosine top-k over all rows (excluding self)
    const exact = [];
    for (let j = 0; j < vecs.length; j++) {
      if (j === qi) continue;
      const sc = cosineSim(q, vecs[j]);
      if (exact.length < k) { exact.push({ j, sc }); exact.sort((a, b) => b.sc - a.sc); }
      else if (sc > exact[k - 1].sc) { exact[k - 1] = { j, sc }; exact.sort((a, b) => b.sc - a.sc); }
    }
    const exactSet = new Set(exact.map((e) => e.j));
    // binary two-stage: Hamming prefilter `cand` -> rescore with exact cosine -> top-k
    const qp = binarize(q);
    const prefilter = hammingSearch(qp, packed, Math.min(cand, packed.length));
    const rescored = prefilter.filter((c) => c.index !== qi).map((c) => ({ j: c.index, sc: cosineSim(q, vecs[c.index]) }))
      .sort((a, b) => b.sc - a.sc).slice(0, k);
    const hit = rescored.filter((r) => exactSet.has(r.j)).length;
    recallSum += hit / k;
    queries++;
  }
  const recall = recallSum / queries;

  const fp32 = footprintBytes(vecs.length, dim, "float32");
  const fpI8 = footprintBytes(vecs.length, dim, "int8");
  const fpBin = footprintBytes(vecs.length, dim, "binary");
  console.log(`bench-embed-quantize-recall: ${path.relative(ROOT, file)}`);
  console.log(`  vectors=${vecs.length} dim=${dim} k=${k} rescoreCandidates=${cand}`);
  console.log(`  recall@${k} (binary two-stage vs exact cosine): ${(recall * 100).toFixed(1)}%`);
  console.log(`  footprint: float32 ${(fp32 / 1048576).toFixed(2)}MB | int8 ${(fpI8 / 1048576).toFixed(2)}MB (4x) | binary ${(fpBin / 1048576).toFixed(2)}MB (32x)`);
  console.log(`  VERDICT: ${recall >= 0.95 ? "binary preserves recall (>=95%) -- 32x is safe for this store" : recall >= 0.9 ? "binary near-lossless (>=90%) -- widen --cand to recover" : "binary loses recall -- keep int8 or widen --cand / rescore"}`);
  return 0;
}

const isMain = (() => { try { return process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url); } catch { return false; } })();
if (isMain) process.exit(main());
export { loadVectors, parseArgs };
