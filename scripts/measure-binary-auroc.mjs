#!/usr/bin/env node
/**
 * measure-binary-auroc.mjs -- the DEFINITIVE deploy-gate measurement for binary embedding
 * quantization on the GNN tier-5 direct-embed path (U-EMBED-BINARY-QUANTIZE, slot:india 2026-06-18).
 * NON-DESTRUCTIVE: calls the canonical runAssessment() programmatically (never main(), so NN-EVAL.json
 * is NOT written) and uses a TEMP sign-vector embeddings file -- the deployed store is untouched.
 *
 * Method: cosine over sign-vectors (q[i] >= 0 ? +1 : -1) is monotonic in Hamming distance
 * (cosine = (dim - 2*Hamming)/dim), so the canonical eval run on a sign-vector file reproduces the
 * SINGLE-STAGE binary k-NN ranking -- the CONSERVATIVE bound (the deployed two-stage adds a float
 * rescore that only improves it). If single-stage binary already clears the gate (AUROC>=0.78), the
 * deployed two-stage path certainly does. Baseline = the real int8 store (should reproduce ~0.789).
 *
 * Run: node --max-old-space-size=8192 scripts/measure-binary-auroc.mjs
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runAssessment, gradeMetrics, gradeSelectiveDeploy } from "./lib/nn-graph-eval.mjs";
import { readGraphStreaming } from "./lib/graph-io.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const GRAPH = path.join(ROOT, "state", "shared", "system-viz", "system-graph.json");
const REAL_EMBED = path.join(ROOT, "state", "shared", "nn-graph", "ghost-node-embeddings.jsonl");

/** Write a temp copy of the embeddings JSONL with each int8 `q` replaced by its sign vector (+1/-1). */
function writeSignVectorEmbeddings(srcPath) {
  const out = [];
  for (const line of fs.readFileSync(srcPath, "utf8").split("\n")) {
    const t = line.trim();
    if (!t) continue;
    let o; try { o = JSON.parse(t); } catch { continue; }
    if (o.__meta) { out.push(JSON.stringify(o)); continue; }            // keep header verbatim
    if (Array.isArray(o.q)) o = { ...o, q: o.q.map((v) => (v >= 0 ? 1 : -1)) }; // sign vector
    out.push(JSON.stringify(o));
  }
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "binauroc-"));
  const p = path.join(dir, "ghost-sign-embeddings.jsonl");
  fs.writeFileSync(p, out.join("\n"));
  return { path: p, dir };
}

function summarize(tag, r) {
  if (!r || r.deferred || r.skipped) { console.log(`  ${tag}: DEFERRED/SKIPPED -- ${r && (r.reason || r.skipReason)}`); return null; }
  const m = r.metrics || {};
  const sel = r.selective && r.selective.deployGrade;
  console.log(`  ${tag}: AUROC ${m.auroc} | macroF1 ${m.macroF1} | Brier ${m.brier} | n=${r.holdoutN}`);
  if (sel) {
    const op = sel.operatingPoint || {};
    console.log(`         selective @tau=${sel.productionGate}: ${sel.verdict} -- coverage ${op.coverage != null ? (op.coverage * 100).toFixed(1) + "%" : "?"} Brier ${op.brier} macroF1 ${op.macroF1} ${sel.robustAboveGate ? "robust" : "fragile"}`);
  }
  return { auroc: m.auroc, sel: sel && sel.verdict };
}

function main() {
  console.log("measure-binary-auroc: loading graph (streaming, ~550MB)...");
  const graph = readGraphStreaming(GRAPH);
  console.log(`  graph: ${graph.nodes.length} nodes, ${graph.edges.length} edges`);

  console.log("Running BASELINE (real int8 cosine -- the deployed direct-embed path):");
  const base = runAssessment({ graph, directEmbed: true, directEmbedPath: REAL_EMBED });
  const b = summarize("baseline-int8", base);

  console.log("Running BINARY single-stage (sign-vector cosine == Hamming ranking, the conservative bound):");
  const sign = writeSignVectorEmbeddings(REAL_EMBED);
  let bin;
  try {
    bin = runAssessment({ graph, directEmbed: true, directEmbedPath: sign.path });
  } finally {
    fs.rmSync(sign.dir, { recursive: true, force: true });
  }
  const q = summarize("binary-1stage", bin);

  console.log("\nDEFINITIVE VERDICT:");
  if (b && q) {
    const dAuroc = (q.auroc - b.auroc);
    console.log(`  AUROC: binary ${q.auroc} vs baseline ${b.auroc} (delta ${dAuroc >= 0 ? "+" : ""}${dAuroc.toFixed(4)})`);
    console.log(`  selective: binary "${q.sel}" vs baseline "${b.sel}"`);
    const gatePass = q.auroc >= 0.78;
    console.log(`  GATE (AUROC>=0.78): single-stage binary ${gatePass ? "CLEARS" : "BELOW"} -> deployed two-stage (with rescore) ${gatePass ? "is validated for binary 32x" : "needs the rescore; re-measure two-stage before adopting"}`);
  }
  return 0;
}

process.exit(main());
