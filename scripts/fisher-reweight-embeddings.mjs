#!/usr/bin/env node
/**
 * fisher-reweight-embeddings.mjs -- SUPERVISED diagonal-LDA (Fisher) per-dimension reweighting of
 * the ghost embedding cache (slot:india, NN-GRAPH tier-5 coverage lever #19).
 *
 * WHY: the UNSUPERVISED sharp-text lever (PRISM_NNG_GHOST_SHARP) RAISED the global separability
 * margin but REGRESSED the deploy gate ([[reference_gnn_sharp_embed_lever_2026_06_18]]): it spread
 * the whole space apart, loosening intra-class cohesion (0.83->0.72) -> noisier k-NN vote. The
 * SUPERVISED fix: weight each embedding DIMENSION by its Fisher ratio (between-class scatter S_B /
 * within-class scatter S_W) so cosine k-NN emphasizes the dimensions that actually discriminate
 * dispatchers, while a per-dim scaling (not a global spread) better preserves within-class
 * neighborhoods. Diagonal LDA -> NO eigensolver -> cheap, pure JS.
 *
 * NON-DESTRUCTIVE: reads a cache (--emb), writes a REWEIGHTED cache (--out). Measure the result with
 * the existing harness: `node scripts/measure-codebase-wired-refpool-auroc.mjs --refs-only --skip-embed`
 * after copying --out over the canonical .cwref-newemb.jsonl. NEVER writes the deployed store.
 *
 * Run: node scripts/fisher-reweight-embeddings.mjs --emb <in.jsonl> --out <reweighted.jsonl> [--clip-pct P]
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { loadLabeledVectors } from "./analyze-ghost-embed-separability.mjs";
import { buildEngineDispatcherMap } from "./lib/wired-engine-mapper.mjs";
import { extractWiredEngines } from "./wired-engines-to-refpool.mjs";
import { quantize, dequantize } from "./build-node-embeddings.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DISPATCHERS_DIR = path.join(ROOT, "mcp-server", "src", "tools", "dispatchers");
const DEFAULT_EMB = path.join(ROOT, "state", "shared", "nn-graph", ".cwref-newemb.jsonl");

/**
 * Per-dimension Fisher weights from labeled vectors. w[d] = sqrt(S_B[d] / (S_W[d] + floor)) where
 * S_B = between-class scatter (sum_c n_c (mu_c - mu)^2), S_W = within-class scatter
 * (sum_c sum_{i in c} (x_i - mu_c)^2) -- diagonal LDA, no eigensolver. A near-constant dim has
 * S_W ~ 0 and would explode, so weights are clipped at the `clipPct` percentile and normalized to
 * mean 1 (preserves overall magnitude; only redistributes emphasis across dims). Pure.
 */
export function fisherDimWeights(vectors, labels, { eps = 1e-9, clipPct = 0.99 } = {}) {
  const N = Array.isArray(vectors) ? vectors.length : 0;
  if (!N || !Array.isArray(labels) || labels.length !== N) return [];
  const D = vectors[0].length;
  const groups = new Map();
  for (let i = 0; i < N; i++) {
    const l = labels[i];
    if (!groups.has(l)) groups.set(l, []);
    groups.get(l).push(i);
  }
  const globalMean = new Float64Array(D);
  for (let i = 0; i < N; i++) { const v = vectors[i]; for (let d = 0; d < D; d++) globalMean[d] += v[d]; }
  for (let d = 0; d < D; d++) globalMean[d] /= N;

  const SB = new Float64Array(D);
  const SW = new Float64Array(D);
  for (const idxs of groups.values()) {
    const nc = idxs.length;
    const mu = new Float64Array(D);
    for (const i of idxs) { const v = vectors[i]; for (let d = 0; d < D; d++) mu[d] += v[d]; }
    for (let d = 0; d < D; d++) mu[d] /= nc;
    for (let d = 0; d < D; d++) SB[d] += nc * (mu[d] - globalMean[d]) ** 2;
    for (const i of idxs) { const v = vectors[i]; for (let d = 0; d < D; d++) SW[d] += (v[d] - mu[d]) ** 2; }
  }
  // relative floor so a near-zero-within-scatter dim does not divide-by-(almost)-zero
  let meanSW = 0; for (let d = 0; d < D; d++) meanSW += SW[d]; meanSW /= D;
  const floor = eps + meanSW * 1e-6;
  const w = new Float64Array(D);
  for (let d = 0; d < D; d++) w[d] = Math.sqrt(SB[d] / (SW[d] + floor));
  // clip at the clipPct percentile so one near-constant dim cannot dominate the direction
  const sorted = [...w].sort((a, b) => a - b);
  const cap = sorted[Math.min(sorted.length - 1, Math.floor(Math.max(0, Math.min(1, clipPct)) * sorted.length))] || 1;
  for (let d = 0; d < D; d++) if (w[d] > cap) w[d] = cap;
  // normalize to mean 1 (redistribute emphasis without changing overall scale)
  let mw = 0; for (let d = 0; d < D; d++) mw += w[d]; mw = (mw / D) || 1;
  for (let d = 0; d < D; d++) w[d] /= mw;
  return Array.from(w);
}

/** Apply per-dim weights to a vector (new array; truncates to the shorter length). Pure. */
export function applyDimWeights(vec, weights) {
  const D = Math.min(vec.length, weights.length);
  const out = new Array(D);
  for (let d = 0; d < D; d++) out[d] = vec[d] * weights[d];
  return out;
}

function parseArgs(argv) {
  const get = (k, def) => { const a = argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.split("=").slice(1).join("=") : def; };
  return {
    emb: get("emb", DEFAULT_EMB),
    out: get("out", null),
    clipPct: parseFloat(get("clip-pct", "0.99")) || 0.99,
  };
}

function main(argv) {
  const args = parseArgs(argv);
  if (!args.out) { console.error("--out <reweighted.jsonl> is required"); return 1; }
  if (!fs.existsSync(args.emb)) { console.error(`--emb missing: ${args.emb}`); return 1; }
  const embText = fs.readFileSync(args.emb, "utf8");

  // Labels: engine -> dispatcher (codebase ground truth, single-dispatcher only) -- same source as
  // the separability diagnostic, no 550MB graph load.
  const { wirings } = extractWiredEngines(buildEngineDispatcherMap(DISPATCHERS_DIR));
  const engineToDisp = new Map(wirings.map((w) => [w.engine, w.dispatcher]));

  const vecByEngine = loadLabeledVectors(embText);
  const vectors = [];
  const labels = [];
  for (const [engine, vec] of vecByEngine) {
    const disp = engineToDisp.get(engine);
    if (!disp) continue;
    vectors.push(vec);
    labels.push(disp);
  }
  if (vectors.length < 2) { console.error(`only ${vectors.length} labeled vectors -- cannot fit Fisher weights`); return 1; }
  const classCount = new Set(labels).size;
  // Fisher needs >=2 classes: a single class -> S_B=0 every dim -> all-zero weights -> a dead
  // (every-vector-zeroed) cache. Fail loud instead of silently writing a useless cache (R12).
  if (classCount < 2) { console.error(`only ${classCount} dispatcher class among labeled vectors -- Fisher needs >=2 (between-class scatter would be 0)`); return 1; }
  console.log(`fisher-reweight: ${vectors.length} labeled vectors, ${classCount} dispatcher classes, dim=${vectors[0].length}`);

  const weights = fisherDimWeights(vectors, labels, { clipPct: args.clipPct });
  const wSorted = [...weights].sort((a, b) => b - a);
  console.log(`  dim weights (mean-1 normalized): max ${wSorted[0]?.toFixed(3)} | median ${wSorted[Math.floor(wSorted.length / 2)]?.toFixed(3)} | min ${wSorted[wSorted.length - 1]?.toFixed(3)} | clipPct ${args.clipPct}`);

  // Reweight EVERY row in the cache (labeled or not) -> dequantize, scale per-dim, re-quantize.
  // The reweighting is in cosine direction; quantize re-L2-normalizes, so only the DIRECTION
  // (which cosine k-NN uses) carries the discriminative reweighting.
  const lines = embText.split(/\r?\n/);
  const out = [];
  let rewritten = 0, dimMismatch = 0;
  for (const line of lines) {
    const t = line.trim();
    if (t.length === 0) continue;
    if (t.startsWith('{"__meta')) {
      let m; try { m = JSON.parse(t); } catch { out.push(t); continue; }
      m.fisherReweighted = true;
      m.fisherClipPct = args.clipPct;
      out.push(JSON.stringify(m));
      continue;
    }
    let o; try { o = JSON.parse(t); } catch { out.push(t); continue; }
    const vec = dequantize(o);
    if (!vec || vec.length !== weights.length) { dimMismatch++; out.push(t); continue; }
    const { s, q } = quantize(applyDimWeights(vec, weights));
    out.push(JSON.stringify({ ...o, s, q }));
    rewritten++;
  }
  fs.writeFileSync(args.out, out.join("\n") + "\n");
  console.log(`  wrote ${rewritten} reweighted rows${dimMismatch ? ` (${dimMismatch} dim-mismatch passed through verbatim)` : ""} -> ${path.relative(ROOT, args.out)}`);
  return 0;
}

const __isMain = (() => {
  try { return import.meta.url === pathToFileURL(process.argv[1] || "").href; } catch { return false; }
})();
if (__isMain) process.exit(main(process.argv.slice(2)));
