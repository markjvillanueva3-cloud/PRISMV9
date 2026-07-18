#!/usr/bin/env node
// scripts/lib/ollama-fanout.mjs
//
// RATE-LIMIT-FIX (slot:bravo, 2026-06-09) -- the missing "route mechanical fan-out
// to the local 96GB Blackwell, NOT the Claude API" primitive.
//
// ROOT CAUSE this fixes (per [[feedback_workflow_concurrency_and_local_routing_2026_06_08]]
// + [[reference_fleet_rate_limit_diagnosis_2026_05_29]]): ultracode Workflow fan-outs spawn
// 5-13 Claude subagents in concurrent bursts; across the 26-slot fleet that bursts past
// Anthropic's org-wide RPM/TPM throttle -> "Server is temporarily limiting requests" -> the
// synthesis-after-burst agent dies, 2M tokens burned for null. The DOCUMENTED elimination
// (not mitigation) is to run the MECHANICAL agents (grep/audit/summarize/classify/extract --
// R5 "not judgment") on LOCAL Ollama: zero Anthropic rate limit, $0 API cost, GPU at ~1% util.
//
// This is that primitive: fan N mechanical tasks out to local Ollama with BOUNDED concurrency
// (default 3 -- generous for a single GPU; the models are large + serialize on VRAM anyway).
// Reserve Claude subagents for the FINAL synthesis/judgment only. Pairs with local-llm-task-
// router (model selection) + ask-ollama (single query); this adds the concurrent batch.
//
// SAFETY: this is for MECHANICAL text work. Do NOT route safety-critical G-code/physics/units
// generation here -- that boundary (safety output never to a non-Claude model) is the caller's
// to honor (see local-llm-task-router.isSafetyCritical / ollama-compress-output denylist).
//
// Karpathy: CLASSIFY=bounded-concurrency async pool | TECHNIQUE=index-cursor worker pool (not
// chunked Promise.all -- a slow task must not stall a whole chunk) | EDGE=empty/single/oversize
// /one-task-throws/timeout | FAILURE=per-task fail-soft (never reject the batch), local-only URL.

// 127.0.0.1 NOT localhost: on Windows `localhost` resolves to IPv6 ::1 first but Ollama binds
// IPv4 127.0.0.1 (the OllamaClientEngine bug fixed this session). Env-overridable via OLLAMA_URL.
const DEFAULT_BASE_URL = process.env.OLLAMA_URL || "http://127.0.0.1:11434";
// Default model: gpt-oss:120b (the strongest resident reasoner) for mechanical synthesis/audit.
export const DEFAULT_FANOUT_MODEL = process.env.PRISM_FANOUT_MODEL || "gpt-oss:120b";
export const DEFAULT_CONCURRENCY = Number(process.env.PRISM_FANOUT_CONCURRENCY) || 3;
export const DEFAULT_TIMEOUT_MS = Number(process.env.PRISM_FANOUT_TIMEOUT_MS) || 240000;
export const DEFAULT_KEEP_ALIVE = process.env.PRISM_FANOUT_KEEP_ALIVE || "30m";

// One local Ollama generate call. Fail-soft: returns {ok:false,error} on any throw/non-200/empty,
// never throws. fetchImpl is injectable for hermetic tests (no live Ollama needed).
export async function callOllamaOnce(prompt, opts = {}) {
  const model = opts.model || DEFAULT_FANOUT_MODEL;
  const baseUrl = opts.baseUrl || DEFAULT_BASE_URL;
  const timeoutMs = Number.isFinite(opts.timeoutMs) && opts.timeoutMs > 0 ? opts.timeoutMs : DEFAULT_TIMEOUT_MS;
  const fetchImpl = typeof opts.fetchImpl === "function" ? opts.fetchImpl : fetch;
  // RBA-INFERENCE-LANE-MS0 (consumer): yield to an in-flight higher-priority RBA vote (fail-open, cheap when idle).
  try { await (await import("./ollama-priority-lease.mjs")).yieldToHigherPriority({ env: process.env }); } catch { /* no yield */ }
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const r = await fetchImpl(`${baseUrl}/api/generate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      signal: ac.signal,
      body: JSON.stringify({
        model,
        prompt: String(prompt ?? ""),
        stream: false,
        options: { temperature: Number.isFinite(opts.temperature) ? opts.temperature : 0 },
        keep_alive: opts.keepAlive || DEFAULT_KEEP_ALIVE,
      }),
    });
    if (!r || r.ok === false) return { ok: false, text: "", error: `http-${r && r.status ? r.status : "error"}` };
    const j = await r.json();
    if (j && j.error) return { ok: false, text: "", error: String(j.error) };
    const text = typeof (j && j.response) === "string" ? j.response.trim() : "";
    if (!text) return { ok: false, text: "", error: "empty-response" };
    return { ok: true, text, model };
  } catch (e) {
    return { ok: false, text: "", error: (e && e.message) || String(e) };
  } finally {
    clearTimeout(timer);
  }
}

// Fan N tasks out to local Ollama with BOUNDED concurrency. tasks: [{id, prompt}] (or bare
// strings -> id = index). Returns results in INPUT ORDER: [{id, ok, text, error, model}].
// NEVER rejects -- a thrown/failed task becomes {ok:false,error}. peakConcurrency is tracked so
// callers/tests can prove the cap held. opts.onResult(result, index) fires as each completes.
export async function ollamaFanout(tasks, opts = {}) {
  const list = Array.isArray(tasks) ? tasks : [];
  const normalized = list.map((t, i) => {
    if (t && typeof t === "object") return { id: t.id ?? i, prompt: String(t.prompt ?? "") };
    return { id: i, prompt: String(t ?? "") };
  });
  const concurrency = Math.max(1, Number.isFinite(opts.concurrency) ? Math.floor(opts.concurrency) : DEFAULT_CONCURRENCY);
  const results = new Array(normalized.length);
  let next = 0;
  let active = 0;
  let peak = 0;

  await new Promise((resolve) => {
    if (normalized.length === 0) return resolve();
    let done = 0;
    const launch = () => {
      while (active < concurrency && next < normalized.length) {
        const idx = next++;
        active++;
        if (active > peak) peak = active;
        const task = normalized[idx];
        callOllamaOnce(task.prompt, opts).then((res) => {
          const out = { id: task.id, ...res };
          results[idx] = out;
          if (typeof opts.onResult === "function") {
            try { opts.onResult(out, idx); } catch { /* onResult must never break the pool */ }
          }
          active--;
          done++;
          if (done === normalized.length) resolve();
          else launch();
        });
      }
    };
    launch();
  });

  return { results, peakConcurrency: peak, total: normalized.length, okCount: results.filter((r) => r && r.ok).length };
}

// -- Sonnet-fallback for the BATCH path (operator rule 2026-06-11, slot:zulu) -----------
// PARITY with ask-ollama.buildFallbackSignal (the SINGLE-query path already emits an
// "Ollama down -> you are the Sonnet fallback" directive). The batch fan-out had NO such
// signal: when Ollama is down/reaped, every task returns {ok:false} -> okCount:0 and the
// caller dead-ends (or silently escalates the MECHANICAL work to Opus -- the exact token
// leak the operator's fallback ladder forbids: Ollama free -> SONNET cheap -> Opus only for
// reasoning/planning/heavy-build). A pure lib cannot spawn an Agent (that's a harness
// primitive), so -- like buildFallbackSignal -- it computes the deterministic ROUTING
// DECISION (R5: routing is code, not a model call) and the orchestrator executes it by
// re-running fallback.tasks on bounded `agent(prompt,{model:'sonnet'})`. See
// [[feedback_ollama_fallback_sonnet_agents]] + [[feedback_ultracode_fanout_local_gpu_not_claude]].

// CONNECTION-class error substrings == "Ollama daemon unreachable / reaped / timed out".
// These are the ONLY failures eligible for the Sonnet fallback. A CONTENT-class failure
// (empty-response, model-not-found, http-4xx) means Ollama RAN and just produced nothing --
// re-running that trivial task on Sonnet would waste the very org quota the fallback protects
// (and could loop). callOllamaOnce surfaces: raw exception messages (fetch failed / ECONNREFUSED
// / aborted / timeout) on throw, `http-<status>` on non-200, `empty-response`, and the model's
// own j.error string. We map 5xx -> connection (daemon starting/dead), 4xx -> content.
const CONNECTION_ERROR_PATTERNS = [
  /econnrefused/i, /enotfound/i, /eai_again/i, /ehostunreach/i, /econnreset/i, /etimedout/i,
  /fetch\s*failed/i, /network/i, /abort/i, /timeout/i, /socket hang up/i, /connect\b/i,
  /\bhttp-5\d\d\b/i,   // 5xx == server/daemon failure (502/503/504 -- Ollama starting or dead)
  /\bhttp-error\b/i,   // callOllamaOnce's no-status sentinel (treated as transport failure)
];

/**
 * Classify a callOllamaOnce error string. "connection" => Ollama is unreachable/reaped
 * (fallback-eligible). "content" => Ollama ran but the task failed (NOT fallback-eligible).
 * "none" => no error. Pure.
 * @param {string|undefined|null} error
 * @returns {"connection"|"content"|"none"}
 */
export function classifyFanoutFailure(error) {
  const e = String(error || "").trim();
  if (!e) return "none";
  return CONNECTION_ERROR_PATTERNS.some((re) => re.test(e)) ? "connection" : "content";
}

/**
 * Build the batch Sonnet-fallback signal (analogue of ask-ollama.buildFallbackSignal).
 * lane is "sonnet" SPECIFICALLY (operator ladder: never Opus for mechanical work). The
 * orchestrator reads .tasks and re-dispatches them to bounded Sonnet agents. Pure.
 * @param {{failedTasks:Array<{id:any,prompt:string}>, reason?:string, total?:number, okCount?:number}} o
 */
export function buildFanoutFallbackSignal({ failedTasks, reason, total, okCount } = {}) {
  const tasks = (Array.isArray(failedTasks) ? failedTasks : []).map((t) => ({ id: t.id, prompt: String(t.prompt ?? "") }));
  return {
    ollamaUnavailable: true,
    lane: "sonnet",            // operator rule 2026-06-11: Ollama-fail -> SONNET (cheap), NEVER Opus
    fellBack: true,
    reason: reason || "local Ollama fan-out unreachable (daemon down/reaped/timeout)",
    failedCount: tasks.length,
    total: Number.isFinite(total) ? total : tasks.length,
    okCount: Number.isFinite(okCount) ? okCount : 0,
    tasks,
    directive:
      "Ollama is down/reaped -- re-run these MECHANICAL tasks on bounded SONNET agents " +
      "(agent(prompt,{model:'sonnet'}), <=4 concurrent), NOT Opus. Reserve higher models for " +
      "reasoning/planning/heavy coding+building only (operator fallback ladder 2026-06-11).",
  };
}

/**
 * Fan out to local Ollama, then attach a deterministic Sonnet-fallback directive for any
 * CONNECTION-class failures (Ollama down/reaped). Return shape is a strict SUPERSET of
 * ollamaFanout's ({results,peakConcurrency,total,okCount}) + `fallback`, so existing callers
 * that swap to this keep working. Partial-degrade: only the connection-failed tasks land in
 * fallback.tasks (a content failure means Ollama ran -> not re-routed). fallback.needed is
 * false when nothing connection-failed.
 * @param {Array} tasks  same shape as ollamaFanout
 * @param {object} opts   ollamaFanout opts + optional fallbackReason
 */
export async function ollamaFanoutWithFallback(tasks, opts = {}) {
  const base = await ollamaFanout(tasks, opts);
  const list = Array.isArray(tasks) ? tasks : [];
  const normalized = list.map((t, i) =>
    (t && typeof t === "object") ? { id: t.id ?? i, prompt: String(t.prompt ?? "") } : { id: i, prompt: String(t ?? "") }
  );
  const failedTasks = [];
  base.results.forEach((r, idx) => {
    if (r && r.ok) return;
    if (classifyFanoutFailure(r && r.error) === "connection") failedTasks.push(normalized[idx]);
  });
  if (failedTasks.length === 0) {
    return { ...base, fallback: { needed: false, lane: null, tasks: [] } };
  }
  return {
    ...base,
    fallback: { needed: true, ...buildFanoutFallbackSignal({ failedTasks, reason: opts.fallbackReason, total: base.total, okCount: base.okCount }) },
  };
}
