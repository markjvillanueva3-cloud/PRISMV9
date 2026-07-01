#!/usr/bin/env node
/**
 * nn-graph-holdout-variance.mjs -- measure GNN tier-5 eval-metric VARIANCE across
 * holdout-shuffle seeds at a FIXED model (NN-GRAPH / india AI-training).
 *
 * WHY THIS EXISTS (operator-canonical multi-seed doctrine, [[feedback_multiseed_before_auroc_claim]]):
 *   A single `nn-graph-eval` run reports ONE AUROC from ONE seeded holdout split.
 *   On a SMALL reference pool (the tier-5 holdout is tens of nodes, not thousands)
 *   that number is high-variance: re-shuffling the held-out set can swing AUROC by
 *   0.3+ with the model unchanged. Reporting "AUROC 0.808 = deploy-ready" from one
 *   split is exactly the single-seed claim india REFUSES to make. This tool runs the
 *   SAME fixed model over N holdout seeds and reports the DISTRIBUTION (mean/range/
 *   stdev + how often each gate clears) so a deploy verdict rests on stability, not
 *   one lucky split.
 *
 * Cheap by construction: the 763MB system graph is streamed ONCE (readGraphStreaming,
 * V8-string-cap-safe) and the loaded object is reused across every seed -- only the
 * holdout split + scoring re-runs. Writes NOTHING by default (a read-only diagnostic);
 * `--out <path>` persists the JSON. nicifySelf() yields CPU to interactive work.
 *
 * Usage:
 *   node scripts/nn-graph-holdout-variance.mjs                         # direct-embed (the 0.808 path), default seeds
 *   node scripts/nn-graph-holdout-variance.mjs --checkpoint c.json     # a trained checkpoint instead
 *   node scripts/nn-graph-holdout-variance.mjs --seeds 1337,7,42,99,2026 --holdout 200 --json
 *   node scripts/nn-graph-holdout-variance.mjs --out state/shared/nn-graph/holdout-variance.json
 *
 * Pure decision functions (summarizeMetric, gatePassRates, classifyStability,
 * buildVarianceReport) are exported + unit-tested in the sibling .test.mjs.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { runAssessment } from "./lib/nn-graph-eval.mjs";
import { readGraphStreaming } from "./lib/graph-io.mjs";

let nicifySelf = () => {};
try { ({ nicifySelf } = await import("./lib/batch-self-nice.mjs")); } catch { /* optional */ }

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const GRAPH_PATH = path.join(ROOT, "state", "shared", "system-viz", "system-graph.json");
const DEFAULT_SEEDS = [1337, 7, 42, 99, 2026];
const GATES = { auroc: 0.78, macroF1: 0.55, brier: 0.15 };
// A fixed-model AUROC range >= this across holdout seeds means the holdout is too
// small to give a trustworthy single-split verdict (the metric is split-noise-bound).
const UNSTABLE_RANGE = 0.10;
const ROUND_DP = 4;

// ---------------------------------------------------------------------------
// Pure decision functions (exported for test)
// ---------------------------------------------------------------------------

/** Summary stats over the finite values of `key` across run rows. */
export function summarizeMetric(rows, key) {
  const vals = (Array.isArray(rows) ? rows : [])
    .map((r) => (r && Number.isFinite(r[key]) ? r[key] : null))
    .filter((v) => v !== null);
  if (vals.length === 0) return { n: 0, mean: null, min: null, max: null, range: null, stdev: null };
  const n = vals.length;
  const mean = vals.reduce((a, b) => a + b, 0) / n;
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const variance = vals.reduce((a, b) => a + (b - mean) * (b - mean), 0) / n;
  return {
    n,
    mean: round(mean),
    min: round(min),
    max: round(max),
    range: round(max - min),
    stdev: round(Math.sqrt(variance)),
  };
}

/** Fraction of runs whose full-coverage gate / selective gate cleared. */
export function gatePassRates(rows) {
  const list = Array.isArray(rows) ? rows.filter((r) => r && !r.deferred) : [];
  const n = list.length;
  if (n === 0) return { n: 0, fullPass: 0, fullRate: null, selectivePass: 0, selectiveRate: null };
  const fullPass = list.filter((r) => r.gatePass === true).length;
  const selectivePass = list.filter((r) => r.selectivePass === true).length;
  return {
    n,
    fullPass,
    fullRate: round(fullPass / n),
    selectivePass,
    selectiveRate: round(selectivePass / n),
  };
}

/**
 * Classify whether the metric is stable enough to trust a single-split verdict.
 * STABLE only when the AUROC range across seeds is below UNSTABLE_RANGE AND the
 * gate verdict is UNANIMOUS (every seed passes, or every seed fails) -- a split
 * that flips the verdict is never deploy-trustworthy.
 */
export function classifyStability(aurocSummary, passRates, unstableRange = UNSTABLE_RANGE) {
  if (!aurocSummary || aurocSummary.n < 2) {
    return { stable: false, verdict: "insufficient-seeds", reason: `need >= 2 seeds, got ${aurocSummary ? aurocSummary.n : 0}` };
  }
  const rangeOk = Number.isFinite(aurocSummary.range) && aurocSummary.range < unstableRange;
  const fullUnanimous = passRates.fullRate === 0 || passRates.fullRate === 1;
  const selUnanimous = passRates.selectiveRate === 0 || passRates.selectiveRate === 1;
  const stable = rangeOk && fullUnanimous && selUnanimous;
  const reasons = [];
  if (!rangeOk) reasons.push(`AUROC range ${aurocSummary.range} >= ${unstableRange} (split-noise-bound)`);
  if (!fullUnanimous) reasons.push(`full-gate verdict flips across seeds (${passRates.fullPass}/${passRates.n} pass)`);
  if (!selUnanimous) reasons.push(`selective-gate verdict flips across seeds (${passRates.selectivePass}/${passRates.n} pass)`);
  return {
    stable,
    verdict: stable ? "stable" : "unstable",
    reason: stable
      ? `AUROC range ${aurocSummary.range} < ${unstableRange} and gate verdicts unanimous`
      : reasons.join("; "),
  };
}

/** Assemble the full variance report from collected run rows. */
export function buildVarianceReport(rows, opts = {}) {
  const auroc = summarizeMetric(rows, "auroc");
  const macroF1 = summarizeMetric(rows, "macroF1");
  const brier = summarizeMetric(rows, "brier");
  const holdoutN = summarizeMetric(rows, "holdoutN");
  const passRates = gatePassRates(rows);
  const stability = classifyStability(auroc, passRates, opts.unstableRange);
  return {
    schemaVersion: 1,
    generatedAt: opts.now || null,
    mode: opts.mode || "direct-embed",
    checkpoint: opts.checkpoint || null,
    seeds: rows.map((r) => r.seed),
    gates: GATES,
    summary: { auroc, macroF1, brier, holdoutN },
    passRates,
    stability,
    runs: rows,
  };
}

function round(x, dp = ROUND_DP) {
  if (!Number.isFinite(x)) return null;
  const f = 10 ** dp;
  return Math.round(x * f) / f;
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

export function parseArgs(argv) {
  const out = { seeds: DEFAULT_SEEDS.slice(), holdout: 200, json: false };
  const args = Array.isArray(argv) ? argv : [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--help" || a === "-h") out.help = true;
    else if (a === "--json") out.json = true;
    else if (a === "--direct-embed") out.directEmbed = true;
    else if (a === "--checkpoint") out.checkpoint = args[++i];
    else if (a === "--graph") out.graphPath = args[++i];
    else if (a === "--embed-path") out.directEmbedPath = args[++i];
    else if (a === "--holdout") out.holdout = Number(args[++i]);
    else if (a === "--out") out.out = args[++i];
    else if (a === "--seeds") out.seeds = String(args[++i]).split(",").map((s) => Number(s.trim())).filter(Number.isFinite);
    else throw new Error(`nn-graph-holdout-variance: unknown argument "${a}" (try --help)`);
  }
  // Default classifier = direct-embed (the production-validated 0.808 path) unless a checkpoint is named.
  if (!out.checkpoint && out.directEmbed === undefined) out.directEmbed = true;
  return out;
}

const USAGE = `nn-graph-holdout-variance -- fixed-model AUROC/gate variance across holdout seeds

Usage: node scripts/nn-graph-holdout-variance.mjs [options]

  --direct-embed        score the raw-768d-nomic cosine classifier (default; the 0.808 path)
  --checkpoint <path>   score a trained checkpoint instead of direct-embed
  --graph <path>        graph JSON (default: state/shared/system-viz/system-graph.json)
  --embed-path <path>   direct-embed ghost vectors (default: ghost-node-embeddings.jsonl)
  --seeds a,b,c         holdout shuffle seeds (default: ${DEFAULT_SEEDS.join(",")})
  --holdout <n>         held-out reference ghosts (default 200, capped at half the pool)
  --out <path>          persist the report JSON (default: print only)
  --json                machine-readable output
  --help                show this help`;

export function main(argv) {
  let opts;
  try { opts = parseArgs(argv); }
  catch (err) { console.error(err.message); return 2; }
  if (opts.help) { console.log(USAGE); return 0; }

  nicifySelf();
  const graphPath = opts.graphPath || GRAPH_PATH;
  let graph;
  try {
    graph = readGraphStreaming(graphPath);
  } catch (err) {
    console.error(`nn-graph-holdout-variance: cannot load graph ${graphPath} -- ${err && err.message ? err.message : err}`);
    return 1;
  }

  const rows = [];
  for (const seed of opts.seeds) {
    const r = runAssessment({
      graph,
      seed,
      holdout: opts.holdout,
      directEmbed: !opts.checkpoint && opts.directEmbed === true,
      directEmbedPath: opts.directEmbedPath,
      checkpoint: opts.checkpoint,
    });
    if (r.deferred) {
      rows.push({ seed, deferred: true, reason: r.reason, poolSize: r.poolSize ?? null });
      if (!opts.json) console.error(`  seed ${seed}: DEFERRED -- ${r.reason}`);
      continue;
    }
    const sel = (r.selective && r.selective.deployGrade) || null;
    rows.push({
      seed,
      deferred: false,
      holdoutN: r.holdoutN ?? null,
      poolSize: r.poolSize ?? null,
      auroc: r.metrics?.auroc ?? null,
      macroF1: r.metrics?.macroF1 ?? null,
      brier: r.metrics?.brier ?? null,
      accuracy: r.metrics?.accuracy ?? null,
      gatePass: r.grade?.pass === true,
      selectivePass: sel ? sel.pass === true : null,
      selectiveVerdict: sel ? sel.verdict : null,
    });
    if (!opts.json) {
      console.error(`  seed ${seed}: holdoutN=${r.holdoutN} AUROC=${round(r.metrics?.auroc)} `
        + `macroF1=${round(r.metrics?.macroF1)} Brier=${round(r.metrics?.brier)} `
        + `full=${r.grade?.pass ? "PASS" : "fail"} selective=${sel ? sel.verdict : "n/a"}`);
    }
  }

  const report = buildVarianceReport(rows, {
    now: new Date().toISOString(),
    mode: opts.checkpoint ? "model" : "direct-embed",
    checkpoint: opts.checkpoint || null,
  });

  if (opts.out) {
    try {
      fs.mkdirSync(path.dirname(path.resolve(opts.out)), { recursive: true });
      fs.writeFileSync(path.resolve(opts.out), JSON.stringify(report, null, 2));
      console.error(`Wrote ${opts.out}`);
    } catch (err) {
      console.error(`nn-graph-holdout-variance: cannot write ${opts.out} -- ${err.message}`);
      return 1;
    }
  }

  if (opts.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    const s = report.summary.auroc;
    console.log("");
    console.log(`AUROC over ${s.n} seed(s): mean ${s.mean} | range [${s.min}, ${s.max}] (delta ${s.range}) | stdev ${s.stdev}`);
    console.log(`full-gate pass: ${report.passRates.fullPass}/${report.passRates.n}  |  selective-gate pass: ${report.passRates.selectivePass}/${report.passRates.n}`);
    console.log(`STABILITY: ${report.stability.verdict.toUpperCase()} -- ${report.stability.reason}`);
  }
  return 0;
}

const __isMain = (() => {
  try { return import.meta.url === pathToFileURL(process.argv[1] || "").href; }
  catch { return false; }
})();
if (__isMain) process.exit(main(process.argv.slice(2)));
