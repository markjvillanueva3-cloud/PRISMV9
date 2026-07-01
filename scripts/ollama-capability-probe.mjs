#!/usr/bin/env node
/**
 * ollama-capability-probe.mjs -- LIVE runner that measures each Ollama model's TRUE per-task success
 * rate via code verifiers (U-OLLAMA-CAP-PROBE, slot:india 2026-06-11). Answers the operator's
 * "test it to see what else it can do so we can fine-tune systems further" with DATA, not vibes:
 * which (task, model) pairs are auto-offload-safe (~100%), so we move that work off Claude (-> cost).
 *
 * Runs scripts/lib/ollama-capability-battery.mjs against the requested models, scores with the pure
 * verifiers, and prints the capability matrix + the auto-offload candidate list. Writes the matrix
 * to state/shared/ollama-capability-matrix.json (--out) for the routing layer to consume.
 *
 * Usage:
 *   node scripts/ollama-capability-probe.mjs                              # default fast-tier models
 *   node scripts/ollama-capability-probe.mjs --models qwen2.5-coder:1.5b,gpt-oss:20b
 *   node scripts/ollama-capability-probe.mjs --out --json
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { TASK_BATTERY, scoreMatrix, autoOffloadCandidates } from "./lib/ollama-capability-battery.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "state", "shared", "ollama-capability-matrix.json");
const OLLAMA_URL = process.env.OLLAMA_URL || "http://127.0.0.1:11434";
// DECISION ROSTER (U-ALPHA-OLLAMA-ROSTER-SYNC, slot:alpha 2026-06-25): the nightly
// unattended probe MUST cover every model the routing layer (ollama-cost-router.mjs
// TIER_PREFERENCES) can actually pick, or the routing graph routes to a model the
// matrix never measured -- the "blind graph" bug this fixes. The prior 3-model list
// (1.5b / gpt-oss:20b / 32b) left qwen3-coder:30b (the router's PREFERRED coder),
// the coder ladder (7b/14b), gpt-oss:120b, and BOTH installed deepseek-r1 reasoners
// (14b/32b) UNMEASURED -- so "qwen3-coder:30b preferred over qwen2.5-coder:32b" was
// an unverified code-comment claim. This roster = the live-installed text/code/
// reasoning set (verified via /api/tags 2026-06-25), excluding vision (qwen3-vl /
// *vl / *vision / moondream) and embed (nomic-embed-text) families the text battery
// cannot fairly score. Override per-run with --models; keep this in sync with the
// cost-router ladder when golf pulls/retires a model.
const DEFAULT_MODELS = [
  "qwen2.5-coder:1.5b",
  "qwen2.5-coder:7b",
  "qwen2.5-coder:14b",
  "qwen2.5-coder:32b",
  "qwen3-coder:30b",
  "gpt-oss:20b",
  "gpt-oss:120b",
  "deepseek-r1:14b",
  "deepseek-r1:32b",
];
// 120s (was 45s): a cold-loading 65GB gpt-oss:120b or a multi-step deepseek-r1
// reasoning chain can exceed 45s on first touch -> a timeout scores "" = a FALSE
// zero that the all-zero clobber-guard (partial-row) does NOT catch, silently
// corrupting that model's row. The longer ceiling tolerates cold loads + reasoning
// latency without changing any pass/fail semantics (only how long we wait).
const CALL_TIMEOUT_MS = 120000;
const NUM_PREDICT = 96; // these tasks have short answers
// Wedge-safety (U-ALPHA-OLLAMA-ROSTER-SYNC, ref reference_ollama_stress_capability_2026_06_24):
// the global OLLAMA_CONTEXT_LENGTH=131072 reserves a HUGE KV cache per loaded model
// (a 32b's ~20GB of weights resided at 54.7GB VRAM, MEASURED) -- so probing the
// expanded big-model roster co-resident exceeds 96GB and WEDGES the daemon. Every
// battery prompt is short, so a small per-request num_ctx reserves a right-sized KV
// cache with ZERO output change (num_ctx >= real token count -> byte-identical
// generation; only the reservation shrinks). 8192 is ample for every battery task.
// Mirrors ask-ollama's proven per-request num_ctx fix without importing its CLI.
const NUM_CTX = 8192;

/** Call Ollama /api/generate (non-stream, temperature 0). Returns the response text ("" on failure). */
async function callOllama(model, prompt, timeoutMs = CALL_TIMEOUT_MS) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ model, prompt, stream: false, options: { temperature: 0, num_predict: NUM_PREDICT, num_ctx: NUM_CTX } }),
      signal: ctrl.signal,
    });
    if (!res.ok) return "";
    const j = await res.json();
    return typeof j.response === "string" ? j.response : "";
  } catch { return ""; } finally { clearTimeout(timer); }
}

/**
 * Unload a model from VRAM (keep_alive:0) so the NEXT model in a multi-model probe
 * never co-resides with it. Without this, probing the big-model roster (32b/30b/
 * 120b) co-loads weights+KV past 96GB and WEDGES the daemon (MODEL-OUTER discipline,
 * reference_ollama_stress_capability_2026_06_24). Best-effort: a failed unload just
 * leaves the model warm (Ollama evicts it on its own KEEP_ALIVE timer).
 */
export async function unloadModel(model, timeoutMs = 8000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    await fetch(`${OLLAMA_URL}/api/generate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ model, prompt: "", keep_alive: 0, stream: false }),
      signal: ctrl.signal,
    });
  } catch { /* best-effort unload */ } finally { clearTimeout(timer); }
}

/** Run the battery across models. `callFn(model, prompt)->Promise<string>` is injectable for tests. */
export async function runProbe({ models, callFn = callOllama, battery = TASK_BATTERY, unloadFn = unloadModel }) {
  const results = [];
  for (const model of models) {
    for (const task of battery) {
      for (const c of task.cases) {
        let out = "";
        try { out = await callFn(model, task.prompt(c)); } catch { out = ""; }
        let pass = false;
        try { pass = !!task.verify(out, c); } catch { pass = false; }
        results.push({ taskId: task.id, category: task.category, model, pass });
      }
    }
    // Wedge-safety: unload this model before loading the next so big models never
    // co-reside and thrash >96GB VRAM (the measured wedge). One unload per model,
    // AFTER its tasks. Injectable for tests; best-effort (a failed unload is benign).
    try { await unloadFn(model); } catch { /* best-effort */ }
  }
  return results;
}

/**
 * Drop NO-SIGNAL models from a scored matrix before it is written (U-ALPHA-OLLAMA-STRESS-FRONTIER
 * follow-up, slot:alpha 2026-06-25). A model that scored rate 0 on EVERY measured task is either
 * generation-FAILED (a big model cold-load timing out under VRAM contention -> callOllama returns
 * "" -> a FALSE 0) or genuinely-unsuited (a reasoning model emitting <think> chains that break
 * exact-match). Recording it as rate:0 falsely asserts "MEASURED incapable" -- proven this session:
 * the 9-model regen stored qwen2.5-coder:32b at rate:0 on extract/json where the prior matrix had
 * it at rate:1, purely because the 55GB model failed to generate this run. Routing-NEUTRAL (a
 * 0-rate model is never picked at the >=1.0 offload threshold), but a latent trap -- a future class
 * passable ONLY by a big model would have its valid offload suppressed by the false 0. Honest fix:
 * carry only POSITIVE-signal measurements; a no-signal model is recorded ABSENT, not false-0, so a
 * later clean-GPU run can measure it for real. Pure; returns a NEW matrix (never mutates the input).
 * @returns {{ matrix: object, models: string[], excluded: string[] }}
 */
export function excludeNoSignalModels(matrix, models) {
  const allModels = new Set();
  for (const t of Object.values(matrix || {})) for (const m of Object.keys(t?.models || {})) allModels.add(m);
  const excluded = [];
  for (const m of allModels) {
    let anyMeasured = false, anyPositive = false;
    for (const t of Object.values(matrix || {})) { // defense-in-depth: mirror the first loop's guard
      const s = t.models?.[m];
      if (s && s.total > 0) { anyMeasured = true; if (s.rate > 0) { anyPositive = true; break; } }
    }
    if (anyMeasured && !anyPositive) excluded.push(m);
  }
  if (excluded.length === 0) return { matrix, models: models || [], excluded };
  const ex = new Set(excluded);
  const cleanMatrix = {};
  for (const [tid, t] of Object.entries(matrix)) {
    cleanMatrix[tid] = { ...t, models: Object.fromEntries(Object.entries(t.models || {}).filter(([m]) => !ex.has(m))) };
  }
  return { matrix: cleanMatrix, models: (models || []).filter((m) => !ex.has(m)), excluded };
}

async function main() {
  const args = process.argv.slice(2);
  const write = args.includes("--out");
  const asJson = args.includes("--json");
  const mIdx = args.indexOf("--models");
  const models = mIdx >= 0 && args[mIdx + 1] ? args[mIdx + 1].split(",").map((s) => s.trim()).filter(Boolean) : DEFAULT_MODELS;

  process.stderr.write(`probing ${models.length} model(s) x ${TASK_BATTERY.length} tasks against ${OLLAMA_URL} ...\n`);
  const results = await runProbe({ models });
  const rawMatrix = scoreMatrix(results);
  // Outage clobber-guard runs on the RAW matrix (BEFORE no-signal exclusion) so a TOTAL outage
  // is still caught -- excluding first could empty the matrix and slip a total outage past the guard.
  const cells = Object.values(rawMatrix).flatMap((t) => Object.values(t.models));
  const allZero = cells.length > 0 && cells.every((s) => s.rate === 0);
  // Drop no-signal models (false-0 generation-failures / unsuited reasoners) from the WRITTEN
  // matrix so it carries only positive-signal measurements (recorded absent, not misleading 0).
  const { matrix, models: keptModels, excluded } = excludeNoSignalModels(rawMatrix, models);
  if (excluded.length) process.stderr.write(`[capability-probe] excluded ${excluded.length} no-signal model(s) (generation-failure or unsuited; recorded ABSENT not false-0): ${excluded.join(", ")}\n`);
  const safe = autoOffloadCandidates(matrix, 1.0);
  const strong = autoOffloadCandidates(matrix, 0.9);

  const report = { generatedAt: new Date().toISOString(), models: keptModels, matrix, autoOffloadSafe: safe, strong, excludedNoSignal: excluded };
  if (write) {
    // Clobber-guard (U-NIGHT-BATCH scrutiny P1, 2026-06-12): callOllama swallows
    // every failure to "" -- a mid-run daemon death / GPU wedge yields an
    // ALL-ZERO matrix that would silently overwrite a good one (this probe now
    // runs unattended nightly). All-zero across every (task,model) cell is not
    // a measurement, it is an outage signature: refuse the write, exit loud.
    if (allZero) {
      process.stderr.write("[capability-probe] every (task,model) cell scored 0 -- outage signature, REFUSING to overwrite the existing matrix (R12). Check the Ollama daemon and re-run.\n");
      process.exitCode = 1;
    } else {
      fs.mkdirSync(path.dirname(OUT), { recursive: true });
      fs.writeFileSync(OUT, JSON.stringify(report, null, 2), "utf8");
    }
  }
  if (asJson) { process.stdout.write(JSON.stringify(report, null, 2) + "\n"); return; }

  process.stdout.write("\n=== Ollama capability matrix (task x model -> success rate) ===\n");
  for (const [taskId, t] of Object.entries(matrix)) {
    const cells = Object.entries(t.models).map(([m, s]) => `${m}=${Math.round(s.rate * 100)}% (${s.pass}/${s.total})`).join("  ");
    process.stdout.write(`  ${taskId.padEnd(18)} [${t.category}]  ${cells}\n`);
  }
  process.stdout.write(`\n=== AUTO-OFFLOAD-SAFE (100% verified) -> route these off Claude ===\n`);
  if (safe.length === 0) process.stdout.write("  (none at 100% -- see strong >=90% below)\n");
  for (const c of safe) process.stdout.write(`  ${c.taskId} -> ${c.model}  (${c.rate * 100}% of ${c.total})\n`);
  process.stdout.write(`\n=== STRONG (>=90%, candidate with light review) ===\n`);
  for (const c of strong.filter((s) => s.rate < 1.0)) process.stdout.write(`  ${c.taskId} -> ${c.model}  (${c.rate * 100}%)\n`);
  if (write) process.stdout.write(`\nWrote matrix -> ${OUT}\n`);
}

const isMain = (() => {
  try { return process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url); }
  catch { return false; }
})();
if (isMain) main();

export { callOllama, OUT, DEFAULT_MODELS, NUM_CTX };
