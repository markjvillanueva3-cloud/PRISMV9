#!/usr/bin/env node
/**
 * lathe-tribal-classify.mjs -- slot:whiskey [KIENZLE: tribal free-text -> structured signals]
 * ==========================================================================
 * Step 1 of "tribal factored into GENERATION" (the deeper half of the advisory leg). Reads the
 * maxed lathe tribal corpus (state/shared/lathe-tribal-corpus.jsonl, ~675 free-text extracted-tips)
 * and classifies each via local Ollama into a `LatheTribalSignal`-shaped structured signal
 * (operation_type / material_iso / clamped rpm/feed/doc factors) OR advisory_only -- using the
 * tested pure core scripts/lib/lathe-tip-classify.mjs. Output: state/shared/lathe-tribal-signals.jsonl.
 *
 * $0-Claude (R5: classification is mechanical text). node fetch is broken for localhost Ollama on
 * this host ([[node-fetch-localhost-ollama-broken-use-curl]]) -> curl subprocess. Resumable: a tip
 * already in the signals file is skipped. Drain cadence --limit small (the 32b model is GPU-heavy;
 * the fleet-reaper kills long runs -- same lesson as the tribal drain).
 *
 * Usage: node scripts/lathe-tribal-classify.mjs --all --limit 5 [--model qwen2.5-coder:32b]
 *
 * NOTE: this PRODUCES the structured signals; wiring them into LatheTribalIntegrationEngine's
 * sourceCorpusTips (so they bias generation) is the next unit -- the signals file is the seam.
 */
import { readFileSync, appendFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildClassifyPrompt, parseClassification } from "./lib/lathe-tip-classify.mjs";

const REPO = resolve(fileURLToPath(import.meta.url), "..", "..");
const CORPUS = join(REPO, "state", "shared", "lathe-tribal-corpus.jsonl");
const SIGNALS = join(REPO, "state", "shared", "lathe-tribal-signals.jsonl"); // gitignored runtime data
const DEFAULT_MODEL = "qwen2.5-coder:32b";
const OLLAMA_TIMEOUT_MS = 300_000;

function args() {
  const a = { all: false, limit: 5, model: DEFAULT_MODEL };
  for (let i = 2; i < process.argv.length; i++) {
    const t = process.argv[i];
    if (t === "--all") a.all = true;
    else if (t === "--limit") a.limit = parseInt(process.argv[++i], 10) || a.limit;
    else if (t === "--model") a.model = process.argv[++i] || a.model;
  }
  return a;
}

function loadCorpus() {
  const out = [];
  try {
    for (const line of readFileSync(CORPUS, "utf8").split(/\r?\n/)) {
      if (!line.trim()) continue;
      try { const e = JSON.parse(line); if (e.kind === "extracted-tip" && e.tip && e.id) out.push(e); } catch { /* skip */ }
    }
  } catch { /* corpus absent */ }
  return out;
}

/** ids already classified (resumable). Key = tip id + a short hash-free index of the tip text. */
function alreadyDone() {
  const done = new Set();
  if (!existsSync(SIGNALS)) return done;
  for (const line of readFileSync(SIGNALS, "utf8").split(/\r?\n/)) {
    if (!line.trim()) continue;
    try { const r = JSON.parse(line); if (r.key) done.add(r.key); } catch { /* skip */ }
  }
  return done;
}

/** Stable per-tip key (id + tip prefix) so the same source PDF's distinct tips are each tracked. */
function tipKey(e) {
  return `${e.id}::${String(e.tip).slice(0, 60)}`;
}

/** curl-based Ollama /api/generate (proven on this host). Returns the response text or null. */
function ollamaGenerate(model, prompt) {
  const payload = JSON.stringify({
    model, prompt, stream: false, keep_alive: "15m",
    options: { temperature: 0.1, num_predict: 512 },
  });
  const cr = spawnSync(
    "curl",
    ["-s", "-m", "280", "http://127.0.0.1:11434/api/generate", "-H", "content-type: application/json", "-d", "@-"],
    { input: payload, encoding: "utf8", timeout: OLLAMA_TIMEOUT_MS, windowsHide: true, maxBuffer: 64 * 1024 * 1024 },
  );
  if (cr.status !== 0) return null;
  try { return JSON.parse(cr.stdout).response ?? null; } catch { return null; }
}

function main() {
  const a = args();
  const corpus = loadCorpus();
  if (corpus.length === 0) {
    console.log(JSON.stringify({ ok: false, error: `tribal corpus empty/absent: ${CORPUS}` }));
    process.exit(1);
  }
  const done = alreadyDone();
  const queue = corpus.filter((e) => !done.has(tipKey(e)));
  const todo = queue.slice(0, a.all ? a.limit : 1);

  let parametric = 0, advisory = 0, failed = 0;
  for (const e of todo) {
    const key = tipKey(e);
    const resp = ollamaGenerate(a.model, buildClassifyPrompt(e.tip));
    if (resp == null) { failed++; continue; } // transient (Ollama down/timeout) -> NOT marked done, retried next fire
    const sig = parseClassification(resp, { tip_id: e.id, tip_title: e.topic || "", rationale: String(e.tip).slice(0, 160), tipText: String(e.tip) });
    const row = { key, source: e.source, topic: e.topic || "", tip: e.tip, ...sig, classified_at: new Date().toISOString() };
    appendFileSync(SIGNALS, JSON.stringify(row) + "\n");
    if (sig.advisory_only) advisory++; else parametric++;
  }

  // aggregate counts from the full signals file (resumable view)
  let totalParam = 0, totalAdv = 0;
  if (existsSync(SIGNALS)) {
    for (const line of readFileSync(SIGNALS, "utf8").split(/\r?\n/)) {
      if (!line.trim()) continue;
      try { const r = JSON.parse(line); if (r.advisory_only) totalAdv++; else totalParam++; } catch { /* skip */ }
    }
  }
  console.log(JSON.stringify({
    ok: true, processed: todo.length, this_run: { parametric, advisory, failed },
    remaining: queue.length - todo.length,
    totals: { parametric: totalParam, advisory_only: totalAdv, classified: totalParam + totalAdv, corpus: corpus.length },
    signals_file: SIGNALS,
  }, null, 2));
}

main();
