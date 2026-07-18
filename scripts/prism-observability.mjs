#!/usr/bin/env node
// PSN-ENHANCE-MS0/U-PSN-OBSERVABILITY-LEG CLI. 4 verbs:
//   --summary                 print stats from loadObservabilityState+summarizeObservability
//   --hallucination "text"    score text via detectHallucination
//   --eval-retrieval --queries F --hits F   evaluateRetrieval over JSON files
//   --state                   raw JSON dump of loadObservabilityState

import { readFileSync } from "node:fs";
import { loadObservabilityState, summarizeObservability, detectHallucination, evaluateRetrieval } from "./lib/observability-leg.mjs";

function parseArgs(argv) {
  const a = { summary: false, hallucination: null, evalRetrieval: false, state: false, queries: null, hits: null, json: false };
  for (let i = 0; i < argv.length; i++) {
    const x = argv[i];
    if (x === "--summary") a.summary = true;
    else if (x === "--hallucination") a.hallucination = argv[++i] || null;
    else if (x === "--eval-retrieval") a.evalRetrieval = true;
    else if (x === "--state") a.state = true;
    else if (x === "--queries") a.queries = argv[++i] || null;
    else if (x === "--hits") a.hits = argv[++i] || null;
    else if (x === "--json") a.json = true;
  }
  return a;
}

function actionSummary(a) {
  const sum = summarizeObservability(loadObservabilityState());
  if (a.json) { process.stdout.write(JSON.stringify(sum, null, 2) + "\n"); return 0; }
  if (!sum) { process.stdout.write("no observability state available\n"); return 0; }
  process.stdout.write(`observability state: ${sum.surfacesPresent}/5 surfaces present\n  scrutiny entries: ${sum.scrutinyEntries}\n  error patterns: ${sum.errorPatterns}\n  ollama-offload rate: ${(sum.offloadRate * 100).toFixed(1)}%\n`);
  return 0;
}

function actionHallucination(a) {
  const r = detectHallucination(a.hallucination);
  if (a.json) { process.stdout.write(JSON.stringify(r, null, 2) + "\n"); return 0; }
  process.stdout.write(`hallucination score: ${r.score.toFixed(2)}\n  signals: ${r.signals.map(s => s.id).join(", ") || "(none)"}\n`);
  return 0;
}

function actionEval(a) {
  if (!a.queries || !a.hits) { process.stderr.write("ERROR: --eval-retrieval needs --queries FILE --hits FILE\n"); return 1; }
  let queries, hits;
  try { queries = JSON.parse(readFileSync(a.queries, "utf8")); }
  catch (e) { process.stderr.write(`ERROR: queries file: ${e.message}\n`); return 1; }
  try { hits = JSON.parse(readFileSync(a.hits, "utf8")); }
  catch (e) { process.stderr.write(`ERROR: hits file: ${e.message}\n`); return 1; }
  const r = evaluateRetrieval(queries, hits);
  if (a.json) { process.stdout.write(JSON.stringify(r, null, 2) + "\n"); return 0; }
  process.stdout.write(`retrieval evaluation (n=${r.n}):\n  precision@k: ${r.precisionAtK.toFixed(3)}\n  recall@k: ${r.recallAtK.toFixed(3)}\n  MRR: ${r.mrr.toFixed(3)}\n`);
  return 0;
}

function actionState() {
  process.stdout.write(JSON.stringify(loadObservabilityState(), null, 2) + "\n");
  return 0;
}

function main(argv = process.argv.slice(2)) {
  const a = parseArgs(argv);
  if (a.summary) return actionSummary(a);
  if (a.hallucination !== null) return actionHallucination(a);
  if (a.evalRetrieval) return actionEval(a);
  if (a.state) return actionState();
  process.stdout.write("Usage: prism-observability --summary | --hallucination TEXT | --eval-retrieval --queries F --hits F | --state\n");
  return argv.length === 0 ? 0 : 1;
}

const invokedDirect = (() => {
  try {
    const here = new URL(import.meta.url).pathname.replace(/^\/+([A-Za-z]:)/, "$1");
    const argv = process.argv[1] || "";
    const norm = (s) => s.replace(/\\/g, "/").toLowerCase();
    return norm(here) === norm(argv);
  } catch { return false; }
})();

if (invokedDirect) process.exit(main());
