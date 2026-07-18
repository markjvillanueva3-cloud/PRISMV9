#!/usr/bin/env node
/**
 * measure-structural-augmentation-separability.mjs -- NON-DESTRUCTIVE measurement of whether
 * LEAKAGE-SAFE STRUCTURAL features sharpen the GNN tier-5 dispatcher-class separability of the
 * deployed nomic embeddings (U-GNN-STRUCT-FEATURES, slot:india 2026-06-25).
 *
 * WHY (the lever, measured not guessed). analyze-ghost-embed-separability.mjs proved the 768-d nomic
 * TEXT embeddings barely separate engines by dispatcher (meanMargin 0.0263, only prism_turning useful,
 * prism_dev NEGATIVE) -> the direct-embed cosine-kNN tier-5 classifier only emits ~2/13 classes at the
 * production gate (PSN leg #10). Ref-pool GROWTH was MEASURED not to help
 * (reference_india_refpool_apply_disproven_2026_06_25). The remaining lever is SHARPER FEATURES.
 * This harness answers, with the diagnostic's OWN metric (classSeparability) and ZERO GPU retrain /
 * ZERO graph write: does concatenating each engine's leakage-safe structural vector (its import-
 * neighbours' dispatcher classes -- node-structural-features.mjs) to its text embedding RAISE the
 * per-class margin? A lift is the NECESSARY precondition for broader selective-deploy coverage; the
 * confirmatory step (a full runAssessment LOO on augmented embeddings) is a separate, heavier unit.
 *
 * LEAKAGE DISCIPLINE. The structural feature uses each engine's NEIGHBOURS' dispatcher labels, never
 * its own (node-structural-features.mjs enforces this). So a margin lift reflects generalizable
 * neighbourhood signal, NOT the held-out label leaking into its own vector. The harness additionally
 * ablates the class-agnostic degree dimension (--degree both) because the appended degree scalar adds
 * a same-value similarity FLOOR that can mask the class-discriminative histogram (reviewer note).
 *
 * NON-DESTRUCTIVE: reads the labeled embedding cache + the engine source tree (dispatcher-import map +
 * engine->engine adjacency). Writes nothing. No 542MB graph load.
 *
 * Run: node scripts/measure-structural-augmentation-separability.mjs
 *        [--emb <path.jsonl>]    labeled embedding cache (default the 3206 codebase-wired cache)
 *        [--alphas 0,0.25,0.5,0.75,1]   fusion sweep (0 = text baseline, 1 = structural-only)
 *        [--degree on|off|both]  ablate the class-agnostic degree scalar (default both)
 *        [--min-class N]         min members for a class to be scored (default 5)
 *        [--json]
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadLabeledVectors, classSeparability } from "./analyze-ghost-embed-separability.mjs";
import { buildEngineDispatcherMap } from "./lib/wired-engine-mapper.mjs";
import { extractWiredEngines } from "./wired-engines-to-refpool.mjs";
import {
  loadEngineSources,
  buildEngineImportAdjacencyFromSources,
  buildClassList,
  structuralVector,
  concatWeighted,
} from "./lib/node-structural-features.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DEFAULT_EMB = path.join(ROOT, "state", "shared", "nn-graph", ".cwref-newemb.jsonl");
const DISPATCHERS_DIR = path.join(ROOT, "mcp-server", "src", "tools", "dispatchers");
const ENGINES_DIR = path.join(ROOT, "mcp-server", "src", "engines");
const DEFAULT_ALPHAS = [0, 0.25, 0.5, 0.75, 1];
const MIN_CLASS_DEFAULT = 5;

/**
 * Pure core: given labeled text vectors, the single-label engine->dispatcher map, and the engine
 * import adjacency, build the per-class augmented-vector groups for one (alpha, includeDegree) config
 * and score them with classSeparability. alpha=0 reduces to the text baseline (the struct block is
 * zeroed by concatWeighted), so a single code path covers baseline + augmented.
 *
 * Returns { summary, perClass, structCoverage } where structCoverage = fraction of labeled engines
 * that received a NON-ZERO structural block (the rest fall back to text-only). Pure + exported.
 *
 * @param {Map<string,number[]>} vecByEngine   engine -> text embedding
 * @param {Map<string,string>}   engineToDisp  engine -> dispatcher (single label)
 * @param {Map<string,Set<string>>} adjacency  engine -> Set<engine>
 * @param {string[]} classList                 stable class axis
 * @param {{alpha:number, includeDegree:boolean, minClass?:number}} cfg
 */
export function augmentedSeparability(vecByEngine, engineToDisp, adjacency, classList, cfg = {}) {
  const alpha = Number.isFinite(cfg.alpha) ? cfg.alpha : 0;
  const includeDegree = cfg.includeDegree !== false;
  const minClass = Number.isFinite(cfg.minClass) ? cfg.minClass : MIN_CLASS_DEFAULT;
  const byClass = new Map();
  let labeled = 0;
  let structHit = 0;
  for (const [engine, textVec] of vecByEngine) {
    const disp = engineToDisp instanceof Map ? engineToDisp.get(engine) : undefined;
    if (typeof disp !== "string" || disp.length === 0) continue; // unlabeled -> not scored
    labeled++;
    const sv = structuralVector(engine, adjacency, engineToDisp, classList, { includeDegree });
    if (sv.some((x) => x !== 0)) structHit++;
    const aug = concatWeighted(textVec, sv, alpha);
    if (!byClass.has(disp)) byClass.set(disp, []);
    byClass.get(disp).push(aug);
  }
  const { perClass, summary } = classSeparability(byClass, minClass);
  return {
    summary,
    perClass,
    structCoverage: labeled > 0 ? structHit / labeled : 0,
    labeled,
    structHit,
  };
}

function parseArgs(argv) {
  const out = { emb: DEFAULT_EMB, alphas: DEFAULT_ALPHAS, degree: "both", minClass: MIN_CLASS_DEFAULT, json: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--emb") out.emb = argv[++i];
    else if (a === "--alphas") {
      out.alphas = String(argv[++i] || "").split(",").map((s) => parseFloat(s)).filter((x) => Number.isFinite(x));
      if (out.alphas.length === 0) out.alphas = DEFAULT_ALPHAS;
    } else if (a === "--degree") out.degree = (argv[++i] || "both").toLowerCase();
    else if (a === "--min-class") out.minClass = Math.max(2, parseInt(argv[++i], 10) || MIN_CLASS_DEFAULT);
    else if (a === "--json") out.json = true;
  }
  return out;
}

function degreeModes(degree) {
  if (degree === "on") return [true];
  if (degree === "off") return [false];
  return [false, true]; // both: histogram-only first (the class-discriminative arm), then +degree
}

function main() {
  const { emb, alphas, degree, minClass, json } = parseArgs(process.argv.slice(2));
  if (!fs.existsSync(emb)) {
    console.error(`no embedding file: ${emb}`);
    console.error("Build the cache once via: node --max-old-space-size=8192 scripts/measure-codebase-wired-refpool-auroc.mjs --keep-temp");
    return 1;
  }

  // Labels: engine -> dispatcher (codebase ground truth, single-dispatcher only) -- the SAME source
  // the diagnostic + the deploy-gate measurement use, so the baseline column is directly comparable.
  const { wirings } = extractWiredEngines(buildEngineDispatcherMap(DISPATCHERS_DIR));
  const engineToDisp = new Map(wirings.map((w) => [w.engine, w.dispatcher]));
  const classList = buildClassList(engineToDisp);

  // Structural signal: engine->engine import adjacency from the engine source tree (cheap FS scan).
  const sources = loadEngineSources(ENGINES_DIR);
  const adjacency = buildEngineImportAdjacencyFromSources(sources);

  const vecByEngine = loadLabeledVectors(fs.readFileSync(emb, "utf8"));

  const baseline = augmentedSeparability(vecByEngine, engineToDisp, adjacency, classList, { alpha: 0, includeDegree: false, minClass });
  const runs = [];
  for (const includeDegree of degreeModes(degree)) {
    for (const alpha of alphas) {
      if (alpha === 0) continue; // alpha=0 is text-only -> identical to the separately-reported baseline
      const r = augmentedSeparability(vecByEngine, engineToDisp, adjacency, classList, { alpha, includeDegree, minClass });
      runs.push({ alpha, includeDegree, ...r });
    }
  }

  // Best lift over baseline meanMargin / separableClasses.
  const baseMargin = baseline.summary.meanMargin ?? 0;
  const baseSep = baseline.summary.separableClasses ?? 0;
  let best = null;
  for (const r of runs) {
    if (r.alpha === 0) continue; // baseline duplicate
    const dMargin = (r.summary.meanMargin ?? 0) - baseMargin;
    const dSep = (r.summary.separableClasses ?? 0) - baseSep;
    const score = dSep * 1000 + dMargin; // prefer more separable classes, then bigger margin
    if (!best || score > best.score) best = { ...r, dMargin, dSep, score };
  }

  const report = {
    source: path.relative(ROOT, emb),
    engineSources: sources.size,
    adjacencyNodes: adjacency.size,
    classAxis: classList.length,
    minClass,
    structCoverage: baseline.structCoverage, // fraction of labeled engines with a struct vector
    baseline: { meanMargin: baseMargin, separableClasses: baseSep, classesScored: baseline.summary.classesScored, labeled: baseline.labeled },
    runs: runs.map((r) => ({
      alpha: r.alpha, degree: r.includeDegree ? "on" : "off",
      meanMargin: r.summary.meanMargin, separableClasses: r.summary.separableClasses,
      classesScored: r.summary.classesScored,
      dMargin: Number(((r.summary.meanMargin ?? 0) - baseMargin).toFixed(4)),
      dSep: (r.summary.separableClasses ?? 0) - baseSep,
    })),
    best: best ? { alpha: best.alpha, degree: best.includeDegree ? "on" : "off", dMargin: Number(best.dMargin.toFixed(4)), dSep: best.dSep } : null,
  };

  if (json) { console.log(JSON.stringify(report, null, 2)); return 0; }

  console.log(`structural-augmentation separability: ${report.source}`);
  console.log(`  engine sources=${report.engineSources}, adjacency nodes=${report.adjacencyNodes}, class axis=${report.classAxis}, labeled engines=${report.baseline.labeled}`);
  console.log(`  struct coverage (labeled engines with a non-zero structural block): ${(report.structCoverage * 100).toFixed(1)}%`);
  console.log(`  BASELINE (text-only): meanMargin ${report.baseline.meanMargin} | separable ${report.baseline.separableClasses}/${report.baseline.classesScored}`);
  console.log(`  sweep (alpha x degree):`);
  for (const r of report.runs) {
    const tag = `a=${r.alpha} deg=${r.degree}`.padEnd(16);
    console.log(`    ${tag} meanMargin ${fmt(r.meanMargin)} (${sign(r.dMargin)}) | separable ${r.separableClasses}/${r.classesScored} (${sign(r.dSep)})`);
  }
  if (report.best) {
    console.log(`\n  BEST: alpha=${report.best.alpha} degree=${report.best.degree} -> dMeanMargin ${sign(report.best.dMargin)}, dSeparableClasses ${sign(report.best.dSep)}`);
  }
  const cov = (report.structCoverage * 100).toFixed(1);
  // dSep (more separable classes) is the stronger, harder-to-fake signal; dMargin>0.01 is the
  // secondary absolute floor (matches the sibling diagnostic's absolute-cut style).
  const lifts = report.best && (report.best.dSep > 0 || report.best.dMargin > 0.01);
  console.log(`\nVERDICT: ${
    report.structCoverage < 0.05
      ? "INCONCLUSIVE -- structural coverage too low (the labeled engines have almost no engine->engine import edges; the adjacency source may not match the embedding label namespace)"
      : lifts
        ? `STRUCTURAL FEATURES LIFT classSeparability (the NECESSARY precondition -- NOT the LOO classifier AUROC the deploy gate uses) on the ${cov}% of engines that have import edges -> the lever is REAL but PARTIAL: bounded by ~${cov}% struct coverage (silent for the rest) and NECESSARY-not-SUFFICIENT. This justifies NO apply/retrain. NEXT (separate, heavier unit): a full runAssessment LOO on augmented embeddings is the confirmatory deploy gate; stack with the action-surface feature toward the GAP1 multi-feature retrain.`
        : `STRUCTURAL FEATURES do NOT lift separability on this corpus (struct coverage ${cov}%) -> the import-neighbourhood signal does not generalize for this LOO task; ref-pool growth + this structural lever are both bounded. Record the honest negative and pivot the leg-#10 lever (e.g. a learned projection / different embedding model).`}`);
  return 0;
}

const fmt = (x) => (x == null ? "n/a" : Number(x).toFixed(4));
const sign = (x) => (x == null ? "n/a" : x > 0 ? `+${Number(x).toFixed(4)}` : Number(x).toFixed(4));

const isMain = (() => { try { return process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url); } catch { return false; } })();
if (isMain) process.exit(main());
