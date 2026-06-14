#!/usr/bin/env node
/**
 * validate-heterophily-auroc.mjs -- BLACKWELL-AI-MS0 (slot:india).
 *
 * Live-graph validation of the H2GCN lever (U-GNN-HETEROPHILY-WIRE): runs the GraphSAGE
 * link-prediction pipeline on the REAL system-viz wiring graph with heterophilyHops:0 vs
 * the configured hops, all else identical (same seed/cap/epochs), and reports the AUROC
 * delta. This is the "validated" half of wired/tested/validated -- the unit tests prove
 * mechanics on a HOMOPHILOUS cluster graph; only the live HETEROPHILOUS wiring graph
 * (engine<->dispatcher = different types) can show whether H2GCN lifts AUROC past the
 * 0.78 deploy gate (current ~0.096). Pure-JS (no GPU). Run heap-bumped because loadGraph()
 * materializes the full ~676MB graph before the maxNodes cap engages:
 *   node --max-old-space-size=8192 scripts/validate-heterophily-auroc.mjs [--hops N] [--max-nodes N] [--epochs N] [--seed N]
 *
 * @milestone BLACKWELL-AI-MS0/U-GNN-HETEROPHILY-VALIDATE
 * @slot india
 * @date 2026-06-09
 */
import { runTrainingPipeline } from "./lib/graphsage-train-pipeline.mjs";

const LIFT_EPS = 0.02;   // |AUROC delta| below this is treated as neutral noise
const DEPLOY_GATE = 0.78; // NN/GNN tier-5 deploy gate (CLAUDE.md NN-GRAPH)

function arg(name, def) {
  const i = process.argv.indexOf(name);
  if (i < 0 || i + 1 >= process.argv.length) return def;
  const n = Number(process.argv[i + 1]);
  return Number.isFinite(n) ? n : def;
}

function strArg(name, def) {
  const i = process.argv.indexOf(name);
  return i < 0 || i + 1 >= process.argv.length ? def : process.argv[i + 1];
}

// Default hops=3: the multi-seed-validated optimum (BLACKWELL-AI-MS0, 2026-06-09). On the live
// wiring graph w/ 768d features, hops=3 robustly lifts AUROC +0.138 mean (seeds 5/7/11:
// +0.187/+0.089/+0.139) vs hops=2's +0.067; hops=4 plateaus (~+0.15) at 5x feature dim for no
// gain. The hop lever ceilings ~0.64 enriched (< 0.78 gate) -- gate-clearance needs H2GCN in the
// production graphsage-trainer.mjs (0 refs today) + ref-pool/embedded-node growth. See
// [[reference_h2gcn_hop_sweep_2026_06_09]].
const hops = arg("--hops", 3);
const common = {
  maxNodes: arg("--max-nodes", 2000),
  epochs: arg("--epochs", 40),
  seed: arg("--seed", 5),
  hiddenDim: 32,
  embedDim: 16,
  testFraction: 0.2,
};
// Deploy-gate-realistic options (off unless supplied): 768-d wiki embeddings as base
// features + stratified negative sampling on a node-type field. Only the H2GCN hops
// differ between the two arms, so any AUROC delta is attributable to the lever.
const embeddingSource = strArg("--embedding-source", null);
const nodeTypeField = strArg("--node-type-field", null);
if (embeddingSource) common.embeddingSource = embeddingSource;
if (nodeTypeField) common.nodeTypeField = nodeTypeField;

const t0 = Date.now();
const base = runTrainingPipeline({ ...common, heterophilyHops: 0 });
const tMid = Date.now();
const enriched = runTrainingPipeline({ ...common, heterophilyHops: hops });
const t1 = Date.now();

const pick = (r) => ({
  skipped: !!r.skipped,
  reason: r.reason,
  auroc: r.metrics?.auroc,
  inputDim: r.metrics?.inputDim,
  cappedNodes: r.metrics?.cappedNodes,
  edgeCount: r.metrics?.edgeCount,
  finalLoss: r.metrics?.finalLoss,
  heterophily: r.metrics?.heterophily,
});

const b = pick(base);
const e = pick(enriched);
const lift = Number.isFinite(e.auroc) && Number.isFinite(b.auroc) ? e.auroc - b.auroc : null;

let verdict;
if (lift == null) verdict = "INCONCLUSIVE (an arm skipped or AUROC null)";
else if (lift > LIFT_EPS) verdict = `H2GCN LIFTS AUROC by ${lift.toFixed(4)}`;
else if (lift < -LIFT_EPS) verdict = `H2GCN HURTS AUROC by ${(-lift).toFixed(4)}`;
else verdict = `NEUTRAL (delta ${lift.toFixed(4)})`;

console.log(JSON.stringify({
  config: { ...common, hopsArm: hops },
  baseline_hops0: b,
  enriched_hops: e,
  auroc_lift: lift,
  verdict,
  gate: { target: DEPLOY_GATE, baselineClearsGate: b.auroc > DEPLOY_GATE, enrichedClearsGate: e.auroc > DEPLOY_GATE },
  timing: { baselineMs: tMid - t0, enrichedMs: t1 - tMid, totalMs: t1 - t0 },
}, null, 2));
