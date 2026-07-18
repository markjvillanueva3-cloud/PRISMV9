#!/usr/bin/env node
/**
 * cam-learn-order-run.mjs — run the corpus order-learner over a large real .MIN sample and report
 * where PRISM's LATHE_OP_ORDER contradicts JM's dominant pairwise order (the refinement candidates).
 * The offline loop's "learn" step (task #49). Read-only analysis — prints + writes a report; the
 * operator/kilo applies the refinement to LATHE_OP_ORDER, then re-runs cam-offline-loop-run.mjs.
 *
 *   node scripts/cam-learn-order-run.mjs            # sample 2000
 *   node scripts/cam-learn-order-run.mjs --n 5000 --minSupport 50 --minConfidence 0.75
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, renameSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { normalizeMinToOps } from "./lib/cam-min-op-normalizer.mjs";
import { learnPairwiseOrder, compareToLatheOrder } from "./lib/cam-corpus-order-learn.mjs";
import { LATHE_OP_ORDER } from "./lib/cam-part-program-planner.mjs";
import {
  buildLearnedOrderArtifact, writeLearnedOrderArtifact, deriveProvenanceFromReport,
  DEFAULT_LEARNED_ORDER_PATH,
} from "./lib/cam-learned-order-store.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FILELIST = resolve(__dirname, "../state/shared/cam-drive/corpus-notes/_filelist.txt");
const REPORT = resolve(__dirname, "../state/shared/cam-drive/CAM-ORDER-LEARN-REPORT.json");

const num = (name, d) => { const i = process.argv.indexOf(name); return i >= 0 && process.argv[i + 1] ? Number(process.argv[i + 1]) : d; };
const N = num("--n", 2000), minSupport = num("--minSupport", 50), minConfidence = num("--minConfidence", 0.75);

function atomicWrite(p, t) { mkdirSync(dirname(p), { recursive: true }); const tmp = `${p}.tmp-${process.pid}`; writeFileSync(tmp, t, "utf8"); renameSync(tmp, p); }

function main() {
  if (!existsSync(FILELIST)) { console.error(`corpus file list absent (${FILELIST})`); process.exit(2); }
  const paths = readFileSync(FILELIST, "utf8").split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  const step = Math.max(1, Math.floor(paths.length / N));
  const refSeqs = [];
  let read = 0;
  for (let i = 0; i < paths.length && refSeqs.length < N; i += step) {
    let text; try { text = readFileSync(paths[i], "utf8"); } catch { continue; }
    read++;
    const norm = normalizeMinToOps(text);
    if (norm.opCount > 0) refSeqs.push(norm.ops.map((o) => o.family));
  }

  const learned = learnPairwiseOrder(refSeqs);
  const disagreements = compareToLatheOrder(learned, LATHE_OP_ORDER, { minSupport, minConfidence });

  const report = {
    schemaVersion: "1.0.0", kind: "cam_order_learn_report",
    sampled: read, programs_with_ops: refSeqs.length, minSupport, minConfidence,
    current_lathe_order: Object.entries(LATHE_OP_ORDER).sort((a, b) => a[1] - b[1]).map(([f]) => f),
    corpus_suggested_order: learned.suggestedOrder,
    copeland: learned.copeland,
    disagreements,
  };
  atomicWrite(REPORT, JSON.stringify(report, null, 2) + "\n");

  // PERSIST the curated LATHE_OP_ORDER as the durable artifact the planner LOADS (U-CAM-SELFLEARN-PERSIST).
  // This closes the loop's LOAD side: the order driving cam-part-program-planner becomes data, not a const.
  // (The order map persisted is the current CURATED 15-family map; auto-merging fresh corpus disagreements
  // into it is U-CAM-RETRAIN-LIFECYCLE #36 — see report.disagreements for what #36 will apply.)
  const provenance = deriveProvenanceFromReport(report);
  provenance.persisted_by = "cam-learn-order-run.mjs";
  const artifact = buildLearnedOrderArtifact(
    { order: LATHE_OP_ORDER, source: "corpus-learn-run", provenance },
    new Date().toISOString(),
  );
  writeLearnedOrderArtifact(DEFAULT_LEARNED_ORDER_PATH, artifact);

  console.log(`order-learn: ${refSeqs.length} programs w/ ops (read ${read}) · minSupport ${minSupport} · minConf ${minConfidence}`);
  console.log(`current LATHE_OP_ORDER:   ${report.current_lathe_order.join(" -> ")}`);
  console.log(`corpus suggested order:   ${learned.suggestedOrder.join(" -> ")}`);
  console.log(`\ndisagreements (PRISM contradicts JM dominant order), strongest first:`);
  if (disagreements.length === 0) console.log("  (none — LATHE_OP_ORDER agrees with JM on all high-confidence pairs)");
  for (const d of disagreements) console.log(`  - ${d.recommendation}  [conf ${d.jm_confidence}, n=${d.jm_support}]`);
  console.log(`\nreport -> ${REPORT}`);
  console.log(`learned-op-order persisted -> ${DEFAULT_LEARNED_ORDER_PATH} (planner now LOADS this; no code edit needed)`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main();
