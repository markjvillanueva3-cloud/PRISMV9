#!/usr/bin/env node
/**
 * cam-retrain-order-run.mjs — the WRITE-side retrain CLI (U-CAM-RETRAIN-LIFECYCLE). Turns the offline
 * CAM loop from self-MEASURING into self-IMPROVING: it learns JM's pairwise op order from the corpus,
 * finds where the CURRENTLY-PERSISTED learned-op-order still contradicts a high-confidence JM-dominant
 * pair, MERGES those disagreements (invariant-guarded), re-scores, and — only if fidelity does not
 * regress — PERSISTS the improved order the planner LOADS. Each run refines the PERSISTED order, so the
 * loop compounds (the partner to cam-learn-order-run.mjs, which only re-stamps the curated const).
 *
 *   node scripts/cam-retrain-order-run.mjs                       # DRY-RUN: report would-promote (default)
 *   node scripts/cam-retrain-order-run.mjs --apply               # persist the merged order if it promotes
 *   node scripts/cam-retrain-order-run.mjs --n 5000 --minSupport 50 --minConfidence 0.75 --minImprove 0
 *
 * SAFETY: default DRY-RUN (never silently mutates the persisted order). On --apply it persists ONLY a
 * valid, non-regressing order via the store's atomic validated write path. Fail-loud (exit 2) if the
 * corpus is absent. The merge can NEVER produce a parting-first / finish-before-rough order (the store's
 * validateOrderMap guards every step) — a corpus statistic never beats a manufacturing invariant.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, renameSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { normalizeMinToOps } from "./lib/cam-min-op-normalizer.mjs";
import { learnPairwiseOrder, compareToLatheOrder } from "./lib/cam-corpus-order-learn.mjs";
import { LATHE_OP_ORDER } from "./lib/cam-part-program-planner.mjs";
import {
  loadLearnedOrder, buildLearnedOrderArtifact, writeLearnedOrderArtifact, DEFAULT_LEARNED_ORDER_PATH,
} from "./lib/cam-learned-order-store.mjs";
import { evaluateRetrain } from "./lib/cam-retrain-order-merge.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FILELIST = resolve(__dirname, "../state/shared/cam-drive/corpus-notes/_filelist.txt");
const REPORT = resolve(__dirname, "../state/shared/cam-drive/CAM-RETRAIN-REPORT.json");

const num = (name, d) => { const i = process.argv.indexOf(name); return i >= 0 && process.argv[i + 1] ? Number(process.argv[i + 1]) : d; };

function atomicWrite(p, t) { mkdirSync(dirname(p), { recursive: true }); const tmp = `${p}.tmp-${process.pid}`; writeFileSync(tmp, t, "utf8"); renameSync(tmp, p); }

/**
 * Pure retrain core: learn corpus order, diff against the base, evaluate the merge. No I/O.
 * @param {{refSeqs:string[][], currentOrder:object, minSupport?:number, minConfidence?:number, minImprove?:number}} args
 * @returns {{learned:object, disagreements:Array, evaluation:object}}
 */
export function planRetrain({ refSeqs, currentOrder, minSupport = 50, minConfidence = 0.75, minImprove = 0 } = {}) {
  if (!Array.isArray(refSeqs)) throw new Error("planRetrain: refSeqs[][] is required");
  const learned = learnPairwiseOrder(refSeqs);
  // Diff against the CURRENT (possibly already-retrained) order, not the static const — so the loop
  // compounds: each run finds the disagreements that remain vs the latest persisted order.
  const disagreements = compareToLatheOrder(learned, currentOrder, { minSupport, minConfidence });
  const evaluation = evaluateRetrain({ currentOrder, disagreements, refSequences: refSeqs, minImprove });
  return { learned, disagreements, evaluation };
}

/**
 * Build the persisted artifact for a promoting retrain (pure; nowIso injected). Rich, honest provenance
 * (before/after fidelity, what was applied vs skipped) so a future audit can see WHY the order changed.
 * @returns {object} learned-order artifact (validated by buildLearnedOrderArtifact)
 */
export function buildRetrainArtifact(evaluation, meta, nowIso) {
  const { sampled = null, programsWithOps = null, minSupport = null, minConfidence = null, baseSource = null } = meta || {};
  const provenance = {
    sampled,
    programs_with_ops: programsWithOps,
    minSupport,
    minConfidence,
    disagreements_applied: evaluation.applied.length,
    disagreements_net_satisfied: evaluation.netSatisfied,
    disagreements_skipped: evaluation.skipped.length,
    fidelity_before: evaluation.currentFidelity,
    fidelity_after: evaluation.candidateFidelity,
    fidelity_delta: evaluation.fidelityDelta,
    base_order_source: baseSource,
    persisted_by: "cam-retrain-order-run.mjs",
  };
  return buildLearnedOrderArtifact(
    { order: evaluation.candidateOrder, source: "corpus-retrain-merge (cam-retrain-order-run)", provenance },
    nowIso,
  );
}

function readCorpus(n) {
  if (!existsSync(FILELIST)) { console.error(`corpus file list absent (${FILELIST}) — run the corpus indexer first`); process.exit(2); }
  const paths = readFileSync(FILELIST, "utf8").split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  const step = Math.max(1, Math.floor(paths.length / n));
  const refSeqs = [];
  let read = 0;
  for (let i = 0; i < paths.length && refSeqs.length < n; i += step) {
    let text; try { text = readFileSync(paths[i], "utf8"); } catch { continue; }
    read++;
    const norm = normalizeMinToOps(text);
    if (norm.opCount > 0) refSeqs.push(norm.ops.map((o) => o.family));
  }
  return { refSeqs, read };
}

function main() {
  const N = num("--n", 2000), minSupport = num("--minSupport", 50), minConfidence = num("--minConfidence", 0.75), minImprove = num("--minImprove", 0);
  const APPLY = process.argv.includes("--apply");

  const { refSeqs, read } = readCorpus(N);
  const loaded = loadLearnedOrder(DEFAULT_LEARNED_ORDER_PATH, LATHE_OP_ORDER); // base = the persisted order (fail-soft to the const)
  const { disagreements, evaluation } = planRetrain({ refSeqs, currentOrder: loaded.order, minSupport, minConfidence, minImprove });

  // R12 honesty: a move accepted into `applied` can be re-separated by a LATER accepted move (a
  // Condorcet cycle in JM's pairwise prefs). Only report a move as net-applied if it STILL holds in
  // the persisted candidate order; the rest are surfaced as `superseded`, never silently claimed.
  const stillHolds = (d) => evaluation.candidateOrder[d.jm_dominant[0]] < evaluation.candidateOrder[d.jm_dominant[1]];
  const netApplied = evaluation.applied.filter(stillHolds);
  const superseded = evaluation.applied.filter((d) => !stillHolds(d));

  const report = {
    schemaVersion: "1.0.0", kind: "cam_retrain_report",
    sampled: read, programs_with_ops: refSeqs.length, minSupport, minConfidence, minImprove,
    base_order_source: loaded.source,
    promote: evaluation.promote, reason: evaluation.reason,
    fidelity_before: evaluation.currentFidelity, fidelity_after: evaluation.candidateFidelity, fidelity_delta: evaluation.fidelityDelta,
    disagreements_found: disagreements.length,
    disagreements_accepted: evaluation.applied.length,
    disagreements_net_satisfied: evaluation.netSatisfied,
    disagreements_net_applied: netApplied.map((d) => d.recommendation),
    disagreements_superseded: superseded.map((d) => d.recommendation),
    disagreements_skipped: evaluation.skipped.map((s) => ({ reason: s.reason, pair: s.d?.jm_dominant })),
    candidate_order: Object.entries(evaluation.candidateOrder).sort((a, b) => a[1] - b[1]).map(([f]) => f),
    applied: APPLY && evaluation.promote,
  };
  atomicWrite(REPORT, JSON.stringify(report, null, 2) + "\n");

  console.log(`cam-retrain: ${refSeqs.length} programs w/ ops (read ${read}) · base=${loaded.source} · minSupport ${minSupport} minConf ${minConfidence}`);
  console.log(`disagreements found: ${disagreements.length} · accepted ${evaluation.applied.length} · net-satisfied ${evaluation.netSatisfied}`);
  for (const d of netApplied) console.log(`  APPLIED:  ${d.recommendation}`);
  for (const d of superseded) console.log(`  superseded (accepted then undone by a later move): ${d.recommendation}`);
  for (const s of evaluation.skipped) console.log(`  skipped (${s.reason}): ${s.d?.jm_dominant ? s.d.jm_dominant.join(" before ") : "?"}`);
  console.log(`fidelity: ${evaluation.currentFidelity} -> ${evaluation.candidateFidelity} (delta ${evaluation.fidelityDelta >= 0 ? "+" : ""}${evaluation.fidelityDelta})`);
  console.log(`verdict: ${evaluation.reason}`);

  if (evaluation.promote && APPLY) {
    const artifact = buildRetrainArtifact(evaluation, { sampled: read, programsWithOps: refSeqs.length, minSupport, minConfidence, baseSource: loaded.source }, new Date().toISOString());
    writeLearnedOrderArtifact(DEFAULT_LEARNED_ORDER_PATH, artifact);
    console.log(`\n✅ PROMOTED + persisted -> ${DEFAULT_LEARNED_ORDER_PATH} (the planner LOADS this next run — loop compounded)`);
  } else if (evaluation.promote && !APPLY) {
    console.log(`\n🟡 DRY-RUN — would promote. Re-run with --apply to persist.`);
  } else {
    console.log(`\n⚪ no change persisted (${evaluation.promote ? "promote" : "no-promote"}; apply=${APPLY}).`);
  }
  console.log(`report -> ${REPORT}`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main();
