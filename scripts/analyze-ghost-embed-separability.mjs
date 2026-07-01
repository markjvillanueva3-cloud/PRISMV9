#!/usr/bin/env node
/**
 * analyze-ghost-embed-separability.mjs -- diagnose the GNN tier-5 COVERAGE ceiling (slot:india
 * 2026-06-18). The cap-sweep (afeac9e1f4) proved ref-pool growth is a RANKING lever, not a COVERAGE
 * lever (every gate-holding cap narrows the emitted band to 1 class). The standing PSN-leg #10
 * limitation ("spans 2/13 classes -- full-coverage pending ref-pool growth") therefore needs a
 * DIFFERENT lever. This script answers the root-cause question with real numbers, not a guess:
 *
 *   Do the deployed nomic embeddings actually SEPARATE engines by dispatcher?
 *     - well-separated  -> coverage is GATE/VOTE-limited (the features can support more classes;
 *                          the fix is vote/gate/pool-balance tuning).
 *     - entangled       -> coverage is FEATURE-limited (the fix is sharper embed text / a different
 *                          embedding model / a learned projection -- ref-pool growth cannot help).
 *
 * Method: load the 3206 codebase-wired ghost embeddings (the richest LABELED set -- each engine is
 * imported by exactly ONE dispatcher = a clean ground-truth label, available WITHOUT a 550MB graph
 * load via buildEngineDispatcherMap). For each dispatcher class with >= MIN_CLASS members, compute
 * mean intra-class cosine vs mean inter-class cosine; separability = intra - inter (a per-class
 * silhouette-style margin). Report the distribution + a global verdict.
 *
 * NON-DESTRUCTIVE: reads only the embedding cache + the dispatcher-import map. Writes nothing.
 *
 * Run: node scripts/analyze-ghost-embed-separability.mjs [--emb <path.jsonl>] [--min-class N] [--json]
 *   default --emb = state/shared/nn-graph/.cwref-newemb.jsonl (the 3206 codebase-wired cache)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { cosineSim } from "./lib/binary-embed-quantize.mjs";
import { buildEngineDispatcherMap } from "./lib/wired-engine-mapper.mjs";
import { extractWiredEngines } from "./wired-engines-to-refpool.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DEFAULT_EMB = path.join(ROOT, "state", "shared", "nn-graph", ".cwref-newemb.jsonl");
const DISPATCHERS_DIR = path.join(ROOT, "mcp-server", "src", "tools", "dispatchers");
const MIN_CLASS_DEFAULT = 5;

/** Reconstruct unit vectors (q*s) keyed by engine name from an embedding JSONL. id = ghost.*.<engine>. */
export function loadLabeledVectors(embText) {
  const out = new Map(); // engine -> Float64Array unit vector
  for (const line of embText.split(/\r?\n/)) {
    const t = line.trim();
    if (t.length === 0 || t.startsWith('{"__meta')) continue;
    let o; try { o = JSON.parse(t); } catch { continue; }
    if (!Array.isArray(o.q) || o.q.length === 0) continue;
    const s = typeof o.s === "number" && Number.isFinite(o.s) ? o.s : 1;
    // engine name: prefer the `n` field, else the trailing id segment after the last dot.
    const engine = typeof o.n === "string" && o.n
      ? o.n
      : (typeof o.id === "string" ? o.id.split(".").slice(2).join(".") || o.id.split(".").pop() : null);
    if (!engine) continue;
    out.set(engine, o.q.map((x) => x * s));
  }
  return out;
}

/** Mean of all unordered pairwise cosines within a vector list (NaN-safe; <2 vectors -> null). */
export function meanIntraCosine(vecs) {
  if (!Array.isArray(vecs) || vecs.length < 2) return null;
  let sum = 0, n = 0;
  for (let i = 0; i < vecs.length; i++)
    for (let j = i + 1; j < vecs.length; j++) { sum += cosineSim(vecs[i], vecs[j]); n++; }
  return n > 0 ? sum / n : null;
}

/** Mean cosine from every vector in `a` to every vector in `b` (cross-set; empty -> null). */
export function meanInterCosine(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length === 0 || b.length === 0) return null;
  let sum = 0, n = 0;
  for (const x of a) for (const y of b) { sum += cosineSim(x, y); n++; }
  return n > 0 ? sum / n : null;
}

/**
 * Per-class separability over a Map<class, vectors[]>. For each class with >= minClass members:
 * margin = meanIntra(class) - meanInter(class, everything-else). Returns { perClass, summary }.
 * Pure + exported for tests.
 */
export function classSeparability(byClass, minClass = MIN_CLASS_DEFAULT) {
  const classes = [...byClass.keys()];
  const perClass = [];
  for (const c of classes) {
    const inC = byClass.get(c);
    if (!Array.isArray(inC) || inC.length < minClass) continue;
    const others = [];
    for (const o of classes) if (o !== c) others.push(...byClass.get(o));
    const intra = meanIntraCosine(inC);
    const inter = meanInterCosine(inC, others);
    if (intra === null || inter === null) continue;
    perClass.push({ class: c, n: inC.length, intra: round4(intra), inter: round4(inter), margin: round4(intra - inter) });
  }
  perClass.sort((a, b) => b.margin - a.margin);
  const margins = perClass.map((p) => p.margin);
  const meanMargin = margins.length ? round4(margins.reduce((s, x) => s + x, 0) / margins.length) : null;
  const separable = perClass.filter((p) => p.margin > 0.05).length; // margin > 0.05 = usefully separable
  const summary = {
    classesScored: perClass.length,
    separableClasses: separable,
    meanMargin,
    minMargin: margins.length ? Math.min(...margins) : null,
    maxMargin: margins.length ? Math.max(...margins) : null,
  };
  return { perClass, summary };
}

function round4(x) { return Number.isFinite(x) ? Math.round(x * 1e4) / 1e4 : x; }

function parseArgs(argv) {
  const out = { emb: DEFAULT_EMB, minClass: MIN_CLASS_DEFAULT, json: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--emb") out.emb = argv[++i];
    else if (a === "--min-class") out.minClass = Math.max(2, parseInt(argv[++i], 10) || MIN_CLASS_DEFAULT);
    else if (a === "--json") out.json = true;
  }
  return out;
}

function main() {
  const { emb, minClass, json } = parseArgs(process.argv.slice(2));
  if (!fs.existsSync(emb)) { console.error(`no embedding file: ${emb} (run the measure harness once to build the cache)`); return 1; }

  // Labels: engine -> dispatcher (codebase ground truth, single-dispatcher only).
  const { wirings } = extractWiredEngines(buildEngineDispatcherMap(DISPATCHERS_DIR));
  const engineToDisp = new Map(wirings.map((w) => [w.engine, w.dispatcher]));

  const vecByEngine = loadLabeledVectors(fs.readFileSync(emb, "utf8"));
  const byClass = new Map();
  let labeled = 0, unlabeled = 0;
  for (const [engine, vec] of vecByEngine) {
    const disp = engineToDisp.get(engine);
    if (!disp) { unlabeled++; continue; }
    labeled++;
    if (!byClass.has(disp)) byClass.set(disp, []);
    byClass.get(disp).push(vec);
  }

  const { perClass, summary } = classSeparability(byClass, minClass);

  if (json) { console.log(JSON.stringify({ source: path.relative(ROOT, emb), labeled, unlabeled, minClass, summary, perClass }, null, 2)); return 0; }

  console.log(`ghost-embed separability: ${path.relative(ROOT, emb)}`);
  console.log(`  labeled vectors=${labeled} (unlabeled=${unlabeled}), dispatcher classes=${byClass.size}, scored (>=${minClass} members)=${summary.classesScored}`);
  console.log(`  mean margin (intra - inter cosine): ${summary.meanMargin} | min ${summary.minMargin} | max ${summary.maxMargin}`);
  console.log(`  separable classes (margin > 0.05): ${summary.separableClasses}/${summary.classesScored}`);
  console.log(`  per-dispatcher (top + bottom by margin):`);
  for (const p of perClass.slice(0, 6)) console.log(`    +${p.margin}  ${p.class} (n=${p.n}, intra ${p.intra}, inter ${p.inter})`);
  if (perClass.length > 8) console.log(`    ...`);
  for (const p of perClass.slice(-3)) console.log(`    ${p.margin >= 0 ? "+" : ""}${p.margin}  ${p.class} (n=${p.n}, intra ${p.intra}, inter ${p.inter})`);
  const frac = summary.classesScored > 0 ? summary.separableClasses / summary.classesScored : 0;
  console.log(`\nVERDICT: ${
    summary.meanMargin === null ? "INSUFFICIENT DATA"
      : frac >= 0.6 && summary.meanMargin > 0.05
        ? "embeddings SEPARATE dispatchers well -> coverage ceiling is GATE/VOTE-limited (tune the vote/gate/pool balance; ref features can support more classes)"
        : frac <= 0.3 || summary.meanMargin <= 0.02
          ? "embeddings ENTANGLE dispatchers -> coverage is FEATURE-limited (sharper embed text / different model / learned projection; ref-pool growth CANNOT broaden coverage -- consistent with the cap-sweep)"
          : "embeddings PARTIALLY separate -> mixed; coverage gains need BOTH sharper features and vote tuning"}`);
  return 0;
}

const isMain = (() => { try { return process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url); } catch { return false; } })();
if (isMain) process.exit(main());
