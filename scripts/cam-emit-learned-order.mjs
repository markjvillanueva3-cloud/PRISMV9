#!/usr/bin/env node
/**
 * cam-emit-learned-order.mjs — persist the CURRENT curated LATHE_OP_ORDER as the durable
 * learned-op-order.json artifact the planner loads (U-CAM-SELFLEARN-PERSIST). This is the
 * NO-CORPUS persist path: it does not re-run the learner, it snapshots the order map that is
 * already in cam-part-program-planner.mjs (the product of the last corpus self-improve step) +
 * stamps provenance from the existing CAM-ORDER-LEARN-REPORT.json + sequence_fidelity from
 * CAM-OFFLINE-LOOP-REPORT.json. Run it once to close the loop's LOAD side; cam-learn-order-run.mjs
 * emits the same artifact automatically on every future retrain (so this is the bootstrap, not the
 * steady-state producer).
 *
 *   node scripts/cam-emit-learned-order.mjs
 *
 * Idempotent: re-running re-stamps learnedAt + re-persists the same order (deterministic key sort).
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { LATHE_OP_ORDER } from "./lib/cam-part-program-planner.mjs";
import {
  buildLearnedOrderArtifact, writeLearnedOrderArtifact, deriveProvenanceFromReport,
  DEFAULT_LEARNED_ORDER_PATH,
} from "./lib/cam-learned-order-store.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPORT = resolve(__dirname, "../state/shared/cam-drive/CAM-ORDER-LEARN-REPORT.json");
const LOOP_REPORT = resolve(__dirname, "../state/shared/cam-drive/CAM-OFFLINE-LOOP-REPORT.json");

/** Read + parse a JSON file, returning null on any error (provenance is best-effort, never fatal). */
function readJsonSoft(path) {
  try { return JSON.parse(readFileSync(path, "utf8")); } catch { return null; }
}

/**
 * Build the bootstrap artifact from the current LATHE_OP_ORDER + on-disk reports.
 * Pure given its inputs (nowIso injected) so it is unit-testable without the real fs.
 */
export function buildBootstrapArtifact(order, report, loopReport, nowIso) {
  const provenance = deriveProvenanceFromReport(report || {});
  // attach the offline-loop's mean sequence fidelity if available (audit value, per assessment verdict)
  if (loopReport && typeof loopReport === "object") {
    provenance.mean_sequence_fidelity = loopReport.mean_sequence_fidelity ?? loopReport.sequence_fidelity ?? null;
    provenance.loop_inversions = loopReport.inversions ?? null;
  }
  provenance.persisted_by = "cam-emit-learned-order.mjs";
  return buildLearnedOrderArtifact(
    { order, source: "corpus-curated-bootstrap (cam-emit-learned-order)", provenance },
    nowIso,
  );
}

function main() {
  const report = readJsonSoft(REPORT);
  const loopReport = readJsonSoft(LOOP_REPORT);
  const nowIso = new Date().toISOString();
  const artifact = buildBootstrapArtifact(LATHE_OP_ORDER, report, loopReport, nowIso);
  writeLearnedOrderArtifact(DEFAULT_LEARNED_ORDER_PATH, artifact);
  const ranks = Object.entries(artifact.order).map(([f, r]) => `${f}:${r}`).join(" ");
  console.log(`learned-op-order persisted -> ${DEFAULT_LEARNED_ORDER_PATH}`);
  console.log(`  source: ${artifact.source}`);
  console.log(`  learnedAt: ${artifact.learnedAt}`);
  console.log(`  provenance: sampled=${artifact.provenance.sampled} programs=${artifact.provenance.programs_with_ops} fidelity=${artifact.provenance.mean_sequence_fidelity}`);
  console.log(`  order (${Object.keys(artifact.order).length} families): ${ranks}`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main();
