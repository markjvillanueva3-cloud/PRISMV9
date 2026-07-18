#!/usr/bin/env node
// scripts/ollama-stress-test.mjs
//
// U-ALPHA-OLLAMA-STRESS (slot:alpha, 2026-06-24) -- the SCALING / DIMINISHING-
// RETURNS companion to india's ollama-capability-probe.mjs.
//
// THE GAP IT FILLS.
//   ollama-capability-probe.mjs already answers "WHICH (task,model) pairs pass"
//   (per-task success rate via verifiers) -- but only at concurrency 1, a fixed
//   short answer length, and a single model size per call. It does NOT answer the
//   operator's "how far can we push it before diminishing returns" question:
//     * MODEL-TIER frontier -- across a controlled param ladder (qwen2.5-coder
//       1.5b->7b->14b->32b), what is the SMALLEST model that still passes a task
//       (the cost-optimal routing target), and where does a BIGGER model stop
//       improving the pass rate (capability diminishing-returns)?
//     * CONCURRENCY ceiling -- firing N parallel requests at one model, where does
//       aggregate throughput plateau / per-request latency degrade (the real GPU
//       parallelism knee on THIS Blackwell box)?
//     * OUTPUT-LENGTH scaling -- as num_predict grows, does tokens/sec hold or
//       collapse, and where does latency become prohibitive?
//
//   This harness COMPOSES the existing TASK_BATTERY + verifiers (no reinvent) and
//   adds those three scaling sweeps, then writes a capability+scaling report the
//   routing layer can consume to make EVIDENCE-BASED Ollama-vs-Claude decisions.
//
// Karpathy discipline:
//   CLASSIFY: live measurement (I/O) + pure analysis (knee/frontier detection).
//   TECHNIQUE: separate the PURE analysis functions (unit-testable with injected
//     metric rows) from the live runner (injectable callFn); reuse the verified
//     battery instead of authoring new tasks.
//   EDGE CASES: a model not resident (call fails -> recorded as unreachable, not a
//     crash), zero-throughput call, empty sweep list, single-point sweep (no knee),
//     all-models-fail a task (beyond-local), a timeout mid-batch.
//   FAILURE MODES: Ollama down (every call ok:false -> report says "unreachable",
//     exit non-zero ONLY if NOTHING ran), a slow 120b cold-load (generous timeout).
//
// Usage:
//   node scripts/ollama-stress-test.mjs --sweep all --json
//   node scripts/ollama-stress-test.mjs --sweep tier --models qwen2.5-coder:1.5b,qwen2.5-coder:7b,qwen2.5-coder:14b,qwen2.5-coder:32b
//   node scripts/ollama-stress-test.mjs --sweep concurrency --model gpt-oss:20b --concurrency 1,2,4,8
//   node scripts/ollama-stress-test.mjs --sweep output --model qwen2.5-coder:32b --predict 32,128,512,1024
//   node scripts/ollama-stress-test.mjs --sweep all --include-120b --out   # writes the report files

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { TASK_BATTERY } from "./lib/ollama-capability-battery.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT_JSON = path.join(ROOT, "state", "shared", "ollama-stress-report.json");
const OUT_MD = path.join(ROOT, "state", "shared", "ollama-stress-report.md");
const OLLAMA_URL = process.env.OLLAMA_URL || "http://127.0.0.1:11434";

// The qwen2.5-coder param ladder is the DEFAULT tier sweep: a SAME-FAMILY size
// ladder controls for architecture, so "smallest model that passes" is a clean
// param-count answer, not a family confound. gpt-oss is a separate family ladder.
const QWEN_CODER_LADDER = ["qwen2.5-coder:1.5b", "qwen2.5-coder:7b", "qwen2.5-coder:14b", "qwen2.5-coder:32b"];
const GPT_OSS_LADDER = ["gpt-oss:20b", "gpt-oss:120b"];

// Approx parameter counts (billions) keyed by model id -- the canonical ordering
// for "smallest passing model". Used only for sorting; an unknown model sorts last.
const MODEL_PARAM_B = Object.freeze({
  "qwen2.5-coder:1.5b": 1.5, "qwen2.5-coder:7b": 7, "qwen2.5-coder:14b": 14, "qwen2.5-coder:32b": 32,
  "gpt-oss:20b": 20, "gpt-oss:120b": 120, "deepseek-r1:14b": 14, "deepseek-r1:32b": 32, "qwen3-coder:30b": 30,
});

// A generation prompt that does REAL work (~200 tokens out) so concurrency/output
// sweeps measure genuine throughput, not a 2-token "ok". Deterministic (temp 0).
const GEN_PROMPT =
  "Explain, in about 150 words, the practical difference between climb milling and " +
  "conventional milling on a CNC vertical mill, and when a machinist would choose each.";

const DEFAULT_CALL_TIMEOUT_MS = 180_000; // generous: a cold 120b MoE load is slow

// Minimum sample size (cases per task) before a tier verdict is treated as
// CONFIDENT. The battery has 1-3 cases per task; a "smallest passing model"
// derived from n=1 is a single Bernoulli trial with a wide CI -- advisory only.
// Below this, the frontier is flagged low-confidence and the routing rec is
// explicitly advisory (R12: never present an n=1 pass as a hard route).
const MIN_CONFIDENT_N = 3;

// ---------------------------------------------------------------------------
// PURE ANALYSIS (no I/O -- unit-tested with injected metric rows)
// ---------------------------------------------------------------------------

/** Tokens/sec from an Ollama /api/generate metrics object. Returns 0 when unmeasurable. */
export function tokPerSec(metrics) {
  if (!metrics || typeof metrics !== "object") return 0;
  const ec = Number(metrics.eval_count);
  const ed = Number(metrics.eval_duration); // nanoseconds
  if (!Number.isFinite(ec) || !Number.isFinite(ed) || ec <= 0 || ed <= 0) return 0;
  return ec / (ed / 1e9);
}

/** Percentile (0..100) of a numeric array via nearest-rank. Returns 0 on empty. */
export function percentile(values, p) {
  const arr = (Array.isArray(values) ? values : []).filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  if (arr.length === 0) return 0;
  const rank = Math.ceil((Math.max(0, Math.min(100, p)) / 100) * arr.length);
  return arr[Math.max(0, Math.min(arr.length - 1, rank - 1))];
}

/**
 * Find the concurrency knee: the highest concurrency level at which aggregate
 * throughput is STILL meaningfully rising AND latency has not degraded past a
 * factor. Beyond the knee, more parallelism buys latency, not throughput. PURE.
 *
 * @param {Array<{concurrency:number, aggTokPerSec:number, p95Ms:number}>} rows
 *   ascending by concurrency; the first row (lowest concurrency) is the baseline.
 * @param {object} [opts]
 * @param {number} [opts.minGainPct=0.15] - min fractional aggTokPerSec gain over the
 *   previous level to count as "still scaling".
 * @param {number} [opts.maxLatencyFactor=3] - p95 beyond this * baseline p95 = degraded.
 * @returns {{ knee:number, saturated:boolean, rationale:string }}
 */
export function findConcurrencyKnee(rows, opts = {}) {
  const minGainPct = Number.isFinite(opts.minGainPct) ? opts.minGainPct : 0.15;
  const maxLatencyFactor = Number.isFinite(opts.maxLatencyFactor) ? opts.maxLatencyFactor : 3;
  const r = (Array.isArray(rows) ? rows : []).filter((x) => x && Number.isFinite(x.concurrency)).sort((a, b) => a.concurrency - b.concurrency);
  if (r.length === 0) return { knee: 0, saturated: false, rationale: "no-data" };
  if (r.length === 1) return { knee: r[0].concurrency, saturated: false, rationale: "single-point" };
  const baseLat = Number(r[0].p95Ms) || 0;
  let knee = r[0].concurrency;
  for (let i = 1; i < r.length; i++) {
    const prev = Number(r[i - 1].aggTokPerSec) || 0;
    const cur = Number(r[i].aggTokPerSec) || 0;
    const gain = prev > 0 ? (cur - prev) / prev : (cur > 0 ? 1 : 0);
    const lat = Number(r[i].p95Ms) || 0;
    const latencyOk = baseLat <= 0 || lat <= baseLat * maxLatencyFactor;
    if (gain >= minGainPct && latencyOk) {
      knee = r[i].concurrency; // still profitably scaling
    } else {
      // throughput plateaued OR latency degraded -> the previous level was the knee
      const why = gain < minGainPct ? `throughput gain ${(gain * 100).toFixed(0)}% < ${(minGainPct * 100).toFixed(0)}%` : `p95 ${lat.toFixed(0)}ms > ${maxLatencyFactor}x baseline`;
      return { knee, saturated: true, rationale: `knee at c=${knee} (next: ${why})` };
    }
  }
  return { knee, saturated: false, rationale: `still scaling at c=${knee} (top of sweep)` };
}

/**
 * Smallest model (by param count) whose passRate meets the threshold. PURE.
 * @param {Array<{model:string, passRate:number}>} rows
 * @param {number} [threshold=1] - required passRate (1 = 100%).
 * @returns {string|null} the smallest passing model id, or null if none pass.
 */
export function smallestPassingModel(rows, threshold = 1) {
  const r = (Array.isArray(rows) ? rows : [])
    .filter((x) => x && typeof x.model === "string" && Number.isFinite(x.passRate))
    .sort((a, b) => (MODEL_PARAM_B[a.model] ?? Infinity) - (MODEL_PARAM_B[b.model] ?? Infinity));
  for (const x of r) {
    if (x.passRate >= threshold) return x.model;
  }
  return null;
}

/**
 * Classify a task's capability frontier from its per-model pass rows. PURE.
 * @param {Array<{model:string, passRate:number}>} rows ordered any way.
 * @param {number} [threshold=1]
 * @param {number} [sampleSize] - cases per model behind each passRate. When < MIN_CONFIDENT_N
 *   the verdict is flagged `confident:false` so a consumer never locks a route on n=1-2.
 * @returns {{ verdict, smallestPassing, beyondLocal, confident, sampleSize }}
 *   verdict: "trivial-local" (smallest tier passes) | "mid-local" (needs a mid model)
 *          | "large-local" (only the biggest passes) | "beyond-local" (none pass).
 */
export function classifyTaskFrontier(rows, threshold = 1, sampleSize) {
  const n = Number.isFinite(sampleSize) ? sampleSize : NaN;
  const confident = Number.isFinite(n) ? n >= MIN_CONFIDENT_N : true; // unknown n -> not flagged
  const ordered = (Array.isArray(rows) ? rows : [])
    .filter((x) => x && typeof x.model === "string" && Number.isFinite(x.passRate))
    .sort((a, b) => (MODEL_PARAM_B[a.model] ?? Infinity) - (MODEL_PARAM_B[b.model] ?? Infinity));
  const smallest = smallestPassingModel(ordered, threshold);
  if (!smallest) return { verdict: "beyond-local", smallestPassing: null, beyondLocal: true, confident, sampleSize: n };
  const idx = ordered.findIndex((x) => x.model === smallest);
  const frac = ordered.length > 1 ? idx / (ordered.length - 1) : 0;
  const verdict = frac <= 0 ? "trivial-local" : frac >= 1 ? "large-local" : "mid-local";
  return { verdict, smallestPassing: smallest, beyondLocal: false, confident, sampleSize: n };
}

// ---------------------------------------------------------------------------
// LIVE I/O
// ---------------------------------------------------------------------------

/**
 * Call Ollama /api/generate (non-stream, temp 0). Returns rich metrics. Never
 * throws -- a failure/timeout returns { ok:false } so a sweep records it as a
 * gap rather than crashing.
 */
export async function callOllama(model, prompt, opts = {}) {
  const numPredict = Number.isFinite(opts.numPredict) ? opts.numPredict : 256;
  const timeoutMs = Number.isFinite(opts.timeoutMs) ? opts.timeoutMs : DEFAULT_CALL_TIMEOUT_MS;
  const url = opts.url || OLLAMA_URL;
  // Per-request context window. When set, overrides the server's global
  // OLLAMA_CONTEXT_LENGTH FOR THIS CALL ONLY -- so the offload path can reserve a
  // small KV cache (low VRAM/slot) without changing the fleet-wide context capability.
  const options = { temperature: 0, num_predict: numPredict };
  if (Number.isFinite(opts.numCtx) && opts.numCtx > 0) options.num_ctx = Math.trunc(opts.numCtx);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  const t0 = Date.now();
  try {
    const res = await fetch(`${url}/api/generate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ model, prompt, stream: false, options }),
      signal: ctrl.signal,
    });
    const totalMs = Date.now() - t0;
    if (!res.ok) return { ok: false, model, totalMs, reason: `http-${res.status}` };
    const j = await res.json();
    return {
      ok: true,
      model,
      text: typeof j.response === "string" ? j.response : "",
      totalMs,
      eval_count: j.eval_count,
      eval_duration: j.eval_duration,
      prompt_eval_count: j.prompt_eval_count,
      tokPerSec: tokPerSec(j),
    };
  } catch (err) {
    return { ok: false, model, totalMs: Date.now() - t0, reason: err && err.name === "AbortError" ? "timeout" : `error:${err && err.message ? err.message : "unknown"}` };
  } finally {
    clearTimeout(timer);
  }
}

/** Median of a numeric array (0 on empty). */
function median(xs) { return percentile(xs, 50); }

/**
 * MODEL-TIER sweep: run each battery task's cases across each model, score with
 * the battery's own verifier, and aggregate per-model pass rate + median tok/s +
 * median latency. Returns { perTask: [...], modelOrder }.
 */
async function runTaskOnModel(model, task, callFn, numPredict) {
  let pass = 0, total = 0, noSignal = 0;
  const tps = [], lat = [];
  for (const c of task.cases || []) {
    total++;
    // Guard the call: an injected/future callFn that REJECTS must be recorded as a
    // gap (not pass), never crash the sweep (the documented contract).
    let r;
    try { r = await callFn(model, task.prompt(c), { numPredict }); }
    catch { r = { ok: false, reason: "callFn-threw" }; }
    if (r && r.ok) {
      if (Number(r.tokPerSec) > 0) tps.push(Number(r.tokPerSec));
      if (Number(r.totalMs) > 0) lat.push(Number(r.totalMs));
    }
    // NO-SIGNAL guard (false-0 fix): a case where the model produced NO usable output --
    // the call failed (timeout / fetch-error / threw) OR returned ok with empty/blank text --
    // is recorded as no-signal, DISTINCT from an answered-but-WRONG case. Conflating the two is
    // the false-0 bug: a big model that cold-load-times-out under VRAM contention scores 0%
    // identical to a measured-incapable model (reference_ollama_generative_stratified_harness_2026_06_25).
    // passRate stays pass/total (back-compat -- a blank answer was never a pass); the NEW
    // noSignal/answered/answeredRate let consumers report ABSENT vs INCAPABLE.
    const text = r && r.ok && typeof r.text === "string" ? r.text : "";
    if (!r || !r.ok || text.trim().length === 0) {
      noSignal++;
      continue; // never answered this case -- neither a pass nor a measured fail
    }
    // `await` makes the verify contract async-capable: a SYNC verify (every exact-match battery)
    // returns a bool -> `await bool` is the bool (control flow identical, back-compat); an ASYNC
    // verify (the LLM-judge battery) returns a Promise<bool|null>. TRI-STATE: true=pass; false=a
    // measured FAIL (subject answered, graded wrong); null/undefined=ABSTAIN -> the GRADER could not
    // grade (judge timeout/error/no-verdict, or a verifier threw) -> noSignal, NOT a subject FAIL.
    // This stops a judge-side failure being silently charged to the subject as a 0% (the false-0
    // class, one layer up -- scrutiny P2). Sync batteries never return null, so they are unchanged.
    let verdict;
    try { verdict = await task.verify(text, c); } catch { verdict = null; }
    if (verdict === true) pass++;
    else if (verdict === null || verdict === undefined) noSignal++;
    // verdict === false -> a real measured FAIL: counted in total, not pass, not noSignal.
  }
  const answered = total - noSignal;
  return {
    model,
    passRate: total > 0 ? pass / total : 0,          // UNCHANGED (back-compat): pass / ALL cases
    answeredRate: answered > 0 ? pass / answered : 0, // NEW: honest pass rate among cases that responded
    passed: pass, total, noSignal, answered,          // NEW: noSignal + answered counts
    medianTokPerSec: Number(median(tps).toFixed(1)),
    medianLatencyMs: Math.round(median(lat)),
  };
}

export async function runTierSweep({ models, tasks = TASK_BATTERY, callFn = callOllama, numPredict = 96 }) {
  const modelList = Array.isArray(models) && models.length ? models : QWEN_CODER_LADDER;
  const taskList = Array.isArray(tasks) && tasks.length ? tasks : TASK_BATTERY;
  // MODEL-OUTER loop order (load each model ONCE, run ALL tasks, then swap) -- NOT
  // task-outer. Task-outer swaps the active model on nearly every iteration
  // (tasks x models reloads); on a box where the loaded-model set is bounded
  // (OLLAMA_MAX_LOADED_MODELS), that VRAM thrash measurably WEDGES the Ollama
  // server mid-sweep -- empirically observed: a task-outer run passed classify-enum
  // on 14b/32b but then returned fetch-failed for every later task after the swaps
  // accumulated. Model-outer touches each model's weights once -> stable + faster.
  const byTask = new Map(taskList.map((t) => [t.id, []]));
  for (const model of modelList) {
    for (const task of taskList) {
      byTask.get(task.id).push(await runTaskOnModel(model, task, callFn, numPredict));
    }
  }
  const perTask = taskList.map((task) => {
    const perModel = byTask.get(task.id); // in modelList order (model-outer)
    // sampleSize = cases per model (same for every model) -> drives the low-confidence
    // flag so an n=1 "smallest passing model" is never presented as a hard route.
    const sampleSize = Array.isArray(task.cases) ? task.cases.length : 0;
    return { task: task.id, category: task.category, perModel, frontier: classifyTaskFrontier(perModel, 1, sampleSize) };
  });
  return { perTask, modelOrder: modelList };
}

/**
 * CONCURRENCY sweep: for one model, fire C parallel identical generation calls at
 * each level and measure aggregate throughput + per-call latency percentiles.
 * Returns { model, rows:[{concurrency, ok, aggTokPerSec, p50Ms, p95Ms, wallMs}], knee }.
 */
export async function runConcurrencySweep({ model, levels = [1, 2, 4], prompt = GEN_PROMPT, callFn = callOllama, numPredict = 256, numCtx }) {
  const rows = [];
  const ascending = [...levels].filter(Number.isFinite).sort((a, b) => a - b);
  let wedgedAt = null;
  for (const c of ascending) {
    const t0 = Date.now();
    // Each parallel call is individually guarded: a single rejecting call is
    // recorded as { ok:false } rather than rejecting the whole batch (Promise.all
    // would lose every level's data on one throw). callOllama never throws; this
    // enforces the crash-safe contract for any injected/future callFn too.
    const results = await Promise.all(
      Array.from({ length: c }, () =>
        Promise.resolve().then(() => callFn(model, prompt, { numPredict, numCtx }))
          .catch((e) => ({ ok: false, model, reason: `callFn-threw:${e && e.message ? e.message : "unknown"}` })),
      ),
    );
    const wallMs = Date.now() - t0;
    const okR = results.filter((r) => r && r.ok);
    const lats = okR.map((r) => Number(r.totalMs)).filter(Number.isFinite);
    // Aggregate tok/s = total output tokens across the batch / wall-clock seconds
    // (the throughput the GPU actually delivered for c concurrent requests).
    const totalTokens = okR.reduce((s, r) => s + (Number(r.eval_count) || 0), 0);
    const aggTokPerSec = wallMs > 0 ? totalTokens / (wallMs / 1000) : 0;
    rows.push({
      concurrency: c,
      ok: okR.length, failed: results.length - okR.length,
      aggTokPerSec: Number(aggTokPerSec.toFixed(1)),
      p50Ms: Math.round(percentile(lats, 50)),
      p95Ms: Math.round(percentile(lats, 95)),
      wallMs,
    });
    // WEDGE GUARD (R16: close the gap this tool itself can open). If THIS level
    // produced ZERO successful calls but a LOWER level succeeded, the box has
    // wedged under concurrency -- escalating further only deepens the wedge (the
    // c=8 case that hung Ollama until a manual --recover). Stop here, record the
    // remaining (higher) levels as skipped, and surface wedgedAt so the report
    // states "wedges at c=N" as the finding instead of leaving the server dead.
    if (okR.length === 0 && rows.some((r) => r.ok > 0)) {
      wedgedAt = c;
      for (const skipped of ascending.filter((l) => l > c)) {
        rows.push({ concurrency: skipped, ok: 0, failed: 0, aggTokPerSec: 0, p50Ms: 0, p95Ms: 0, wallMs: 0, skipped: true, reason: `aborted-after-wedge-at-c${c}` });
      }
      break;
    }
  }
  return { model, rows, knee: findConcurrencyKnee(rows), wedgedAt };
}

/**
 * OUTPUT-LENGTH sweep: for one model, sweep num_predict and measure latency +
 * tok/s to expose where generation throughput holds or collapses.
 * Returns { model, rows:[{numPredict, ok, tokPerSec, totalMs}] }.
 */
export async function runOutputSweep({ model, predicts = [32, 128, 512, 1024], prompt = GEN_PROMPT, callFn = callOllama }) {
  const rows = [];
  for (const np of predicts) {
    let r;
    try { r = await callFn(model, prompt, { numPredict: np }); }
    catch (e) { r = { ok: false, reason: `callFn-threw:${e && e.message ? e.message : "unknown"}` }; }
    rows.push({
      numPredict: np,
      ok: !!(r && r.ok),
      tokPerSec: r && r.ok ? Number((r.tokPerSec || 0).toFixed(1)) : 0,
      totalMs: r ? Number(r.totalMs) || 0 : 0,
      reason: r && r.ok ? "ok" : (r && r.reason) || "unknown",
    });
  }
  return { model, rows };
}

// ---------------------------------------------------------------------------
// REPORT
// ---------------------------------------------------------------------------

/** Build the markdown report + routing recommendations from a stress report object. PURE. */
export function renderReport(report) {
  const L = [];
  L.push(`# Ollama Stress / Diminishing-Returns Report`);
  L.push(`_Generated ${report.generatedAt || "(stamp post-run)"} - host ${report.host || "?"} - ${report.url}_`);
  L.push("");

  if (report.tier) {
    L.push(`## Model-tier capability frontier (smallest model that passes)`);
    L.push(`| task | n | verdict | smallest-passing | per-model passRate (passed/total) |`);
    L.push(`|---|---|---|---|---|`);
    let anyLowN = false;
    for (const t of report.tier.perTask) {
      const pm = t.perModel.map((m) => `${(m.model.split(":")[1] || m.model)}=${(m.passRate * 100).toFixed(0)}%(${m.passed}/${m.total})`).join(" ");
      const lowN = t.frontier && t.frontier.confident === false;
      if (lowN) anyLowN = true;
      const verdict = `${t.frontier.verdict}${lowN ? " (low-n)" : ""}`;
      L.push(`| ${t.task} | ${t.frontier.sampleSize ?? "?"} | ${verdict} | ${t.frontier.smallestPassing || "NONE"} | ${pm} |`);
    }
    L.push("");
    L.push(`**Routing recommendation:** route each task to its smallest-passing model (cost-optimal); \`beyond-local\` tasks stay on Claude.`);
    if (anyLowN) {
      L.push(`> ADVISORY: rows marked \`(low-n)\` are derived from < ${MIN_CONFIDENT_N} cases -- a single/low Bernoulli sample with a wide confidence interval. Re-confirm at higher n before locking a route.`);
    }
    L.push("");
  }

  if (report.concurrency) {
    const c = report.concurrency;
    L.push(`## Concurrency ceiling -- ${c.model}`);
    L.push(`| concurrency | ok/failed | agg tok/s | p50 ms | p95 ms | wall ms |`);
    L.push(`|---|---|---|---|---|---|`);
    for (const r of c.rows) L.push(`| ${r.concurrency} | ${r.ok}/${r.failed}${r.skipped ? " (skipped)" : ""} | ${r.aggTokPerSec} | ${r.p50Ms} | ${r.p95Ms} | ${r.wallMs} |`);
    L.push("");
    L.push(`**Knee:** c=${c.knee.knee} -- ${c.knee.rationale}. Beyond this, parallelism adds latency, not throughput.`);
    if (c.wedgedAt) {
      L.push(`> WEDGE: the server stopped responding at c=${c.wedgedAt} (zero successful calls); higher levels were skipped to avoid deepening the wedge. Recover with \`node scripts/ollama-wedge-guard.mjs --recover\`. Practical concurrency ceiling is < ${c.wedgedAt}.`);
    }
    L.push("");
  }

  if (report.output) {
    const o = report.output;
    L.push(`## Output-length scaling -- ${o.model}`);
    L.push(`| num_predict | ok | tok/s | total ms |`);
    L.push(`|---|---|---|---|`);
    for (const r of o.rows) L.push(`| ${r.numPredict} | ${r.ok ? "y" : "n"} | ${r.tokPerSec} | ${r.totalMs} |`);
    L.push("");
  }
  return L.join("\n");
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

export function parseArgs(argv) {
  const a = Array.isArray(argv) ? argv : [];
  const get = (n) => { const i = a.indexOf(n); return i >= 0 && i + 1 < a.length ? a[i + 1] : null; };
  const list = (n, d) => { const v = get(n); return v ? v.split(",").map((s) => s.trim()).filter(Boolean) : d; };
  const numList = (n, d) => { const v = get(n); return v ? v.split(",").map((s) => Number(s.trim())).filter(Number.isFinite) : d; };
  return {
    sweep: get("--sweep") || "all",
    models: list("--models", null),
    model: get("--model") || null,
    // Default stops at 4: c=8 was measured to WEDGE this single-GPU box (the
    // server hung until a manual --recover). Opt into higher with --concurrency.
    concurrency: numList("--concurrency", [1, 2, 4]),
    predict: numList("--predict", [32, 128, 512, 1024]),
    include120b: a.includes("--include-120b"),
    numCtx: (() => { const v = get("--num-ctx"); return v != null && Number.isFinite(Number(v)) ? Math.trunc(Number(v)) : undefined; })(),
    json: a.includes("--json"),
    out: a.includes("--out"),
  };
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const report = { url: OLLAMA_URL, host: process.env.COMPUTERNAME || "?", sweeps: opts.sweep };
  let ranSomething = false;

  const tierModels = opts.models || (opts.include120b ? [...QWEN_CODER_LADDER, ...GPT_OSS_LADDER] : QWEN_CODER_LADDER);
  const focusModel = opts.model || "qwen2.5-coder:32b";

  if (opts.sweep === "tier" || opts.sweep === "all") {
    process.stderr.write(`[stress] tier sweep over ${tierModels.join(", ")} ...\n`);
    report.tier = await runTierSweep({ models: tierModels });
    ranSomething = true;
  }
  if (opts.sweep === "concurrency" || opts.sweep === "all") {
    process.stderr.write(`[stress] concurrency sweep on ${focusModel} levels ${opts.concurrency.join(",")} ...\n`);
    report.concurrency = await runConcurrencySweep({ model: focusModel, levels: opts.concurrency, numCtx: opts.numCtx });
    ranSomething = true;
  }
  if (opts.sweep === "output" || opts.sweep === "all") {
    process.stderr.write(`[stress] output sweep on ${focusModel} predicts ${opts.predict.join(",")} ...\n`);
    report.output = await runOutputSweep({ model: focusModel, predicts: opts.predict });
    ranSomething = true;
  }

  if (opts.out) {
    fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
    fs.writeFileSync(OUT_JSON, JSON.stringify(report, null, 2));
    fs.writeFileSync(OUT_MD, renderReport(report));
    process.stderr.write(`[stress] wrote ${OUT_JSON} + ${OUT_MD}\n`);
  }

  if (opts.json) process.stdout.write(JSON.stringify(report) + "\n");
  else process.stdout.write(renderReport(report) + "\n");

  // Exit non-zero ONLY if nothing ran (e.g. an unknown --sweep). A sweep where
  // Ollama was down still "ran" and recorded the gaps -- that is data, not failure.
  return ranSomething ? 0 : 1;
}

const invokedDirectly = (() => {
  try {
    const argv1 = (process.argv[1] || "").replace(/\\/g, "/");
    return argv1.endsWith("ollama-stress-test.mjs");
  } catch { return false; }
})();

if (invokedDirectly) {
  main().then((code) => process.exit(typeof code === "number" ? code : 0)).catch((err) => {
    process.stderr.write(`ollama-stress-test FATAL: ${err && err.stack ? err.stack : err}\n`);
    process.exit(1);
  });
}
