#!/usr/bin/env node
// benchmark.mjs - OpenAI-compatible throughput/latency benchmark for the vLLM Phase-0 POC.
//
// Drives POST /v1/chat/completions at a target concurrency against EITHER vLLM (:8020) OR
// Ollama's OpenAI-compat endpoint (:11434/v1), so the go/no-go gets an apples-to-apples A/B
// on the SAME prompts. Reports aggregate completion-tokens/sec, p50/p95 latency, success rate.
//
// WHY a real harness (R9): the plan's success-metrics table requires "Phase-0 synthetic harness
// replaying real offload prompts at concurrency=26; vLLM vs Ollama" - no in-repo number exists,
// we generate it. The pure aggregation fns are exported + unit-tested (benchmark.test.mjs).
//
// Usage:
//   node benchmark.mjs --url http://127.0.0.1:8020/v1  --model local-vllm        --concurrency 26 --requests 104
//   node benchmark.mjs --url http://127.0.0.1:11434/v1 --model qwen2.5-coder:32b --concurrency 26 --requests 104
//   [--max-tokens 256] [--timeout-ms 120000] [--json]
//
// ASCII only.

import { pathToFileURL } from "node:url";

// Realistic PRISM offload-style prompts (the fan-out workload vLLM would serve).
const DEFAULT_PROMPTS = [
  "Summarize in one sentence: a hook that warns when a heavy local model will not fit free VRAM.",
  "Classify this into one word (bug|feature|docs|test): added a node:test for the admission guard.",
  "Write a one-line JSDoc for: function assessAdmission({usedMb,totalMb,modelParamB,floorPct}).",
  "Triage: 'ECONNREFUSED 127.0.0.1:3100'. Give root cause + one-line fix.",
  "Summarize this git diff intent in one short paragraph: switched a regex .exec loop to matchAll.",
  "List up to 3 likely bugs in: for(i=0;i<=arr.length;i++){ sum+=arr[i] }.",
  "Explain in 2 sentences what fp8 KV-cache quantization buys an LLM serving stack.",
  "Return ONLY the category (perf|safety|style): the function spawns nvidia-smi on every Bash call.",
];

/** Nearest-rank percentile over an ascending-sorted numeric array. */
export function percentile(sortedAsc, p) {
  if (!Array.isArray(sortedAsc) || sortedAsc.length === 0) return null;
  if (p <= 0) return sortedAsc[0];
  if (p >= 100) return sortedAsc[sortedAsc.length - 1];
  const rank = Math.ceil((p / 100) * sortedAsc.length);
  const idx = Math.min(sortedAsc.length - 1, Math.max(0, rank - 1));
  return sortedAsc[idx];
}

/**
 * Aggregate per-request results into the go/no-go metrics.
 * @param {Array<{ok:boolean, latencyMs:number, completionTokens:number}>} results
 * @param {number} wallMs total wall-clock of the run
 */
export function aggregate(results, wallMs) {
  const n = results.length;
  const ok = results.filter((r) => r && r.ok);
  const okN = ok.length;
  const totalCompletionTokens = ok.reduce((s, r) => s + (Number(r.completionTokens) || 0), 0);
  const wallSec = wallMs > 0 ? wallMs / 1000 : 0;
  const lat = ok.map((r) => Number(r.latencyMs) || 0).sort((a, b) => a - b);
  const meanMs = okN ? Math.round(lat.reduce((s, v) => s + v, 0) / okN) : null;
  return {
    requests: n,
    ok: okN,
    fail: n - okN,
    successRate: n ? Math.round((okN / n) * 1000) / 1000 : 0,
    wallMs,
    totalCompletionTokens,
    tokensPerSec: wallSec > 0 ? Math.round((totalCompletionTokens / wallSec) * 10) / 10 : 0,
    p50Ms: percentile(lat, 50),
    p95Ms: percentile(lat, 95),
    meanMs,
  };
}

async function oneRequest(url, model, prompt, maxTokens, timeoutMs) {
  const started = Date.now();
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const r = await fetch(`${url.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        max_tokens: maxTokens,
        temperature: 0.2,
        stream: false,
      }),
      signal: ctl.signal,
    });
    const text = await r.text();
    if (!r.ok) return { ok: false, latencyMs: Date.now() - started, completionTokens: 0, error: `http ${r.status} ${text.slice(0, 120)}` };
    const data = JSON.parse(text);
    const completionTokens = data?.usage?.completion_tokens ?? 0;
    return { ok: true, latencyMs: Date.now() - started, completionTokens };
  } catch (e) {
    return { ok: false, latencyMs: Date.now() - started, completionTokens: 0, error: e?.name === "AbortError" ? "timeout" : (e?.message || String(e)) };
  } finally {
    clearTimeout(t);
  }
}

/** Fixed-size worker pool: runs `total` requests, never more than `concurrency` in flight. */
async function runPool(url, model, prompts, total, concurrency, maxTokens, timeoutMs) {
  const results = new Array(total);
  let next = 0;
  async function worker() {
    while (true) {
      const i = next++;
      if (i >= total) break;
      results[i] = await oneRequest(url, model, prompts[i % prompts.length], maxTokens, timeoutMs);
    }
  }
  const workers = Array.from({ length: Math.min(concurrency, total) }, () => worker());
  await Promise.all(workers);
  return results;
}

function parseArgs(argv) {
  const a = { url: "http://127.0.0.1:8020/v1", model: "local-vllm", concurrency: 26, requests: 104, maxTokens: 256, timeoutMs: 120000, json: false };
  for (let i = 2; i < argv.length; i++) {
    const k = argv[i];
    const v = argv[i + 1];
    if (k === "--url") { a.url = v; i++; }
    else if (k === "--model") { a.model = v; i++; }
    else if (k === "--concurrency") { a.concurrency = parseInt(v, 10); i++; }
    else if (k === "--requests") { a.requests = parseInt(v, 10); i++; }
    else if (k === "--max-tokens") { a.maxTokens = parseInt(v, 10); i++; }
    else if (k === "--timeout-ms") { a.timeoutMs = parseInt(v, 10); i++; }
    else if (k === "--json") { a.json = true; }
  }
  return a;
}

async function main() {
  const a = parseArgs(process.argv);
  process.stderr.write(`[bench] ${a.url} model=${a.model} concurrency=${a.concurrency} requests=${a.requests}\n`);
  const t0 = Date.now();
  const results = await runPool(a.url, a.model, DEFAULT_PROMPTS, a.requests, a.concurrency, a.maxTokens, a.timeoutMs);
  const agg = aggregate(results, Date.now() - t0);
  if (a.json) {
    process.stdout.write(JSON.stringify({ url: a.url, model: a.model, concurrency: a.concurrency, ...agg }, null, 2) + "\n");
  } else {
    process.stdout.write(
      `requests=${agg.requests} ok=${agg.ok} fail=${agg.fail} successRate=${agg.successRate}\n` +
      `tokens/sec=${agg.tokensPerSec} (completion ${agg.totalCompletionTokens} in ${agg.wallMs}ms)\n` +
      `latency p50=${agg.p50Ms}ms p95=${agg.p95Ms}ms mean=${agg.meanMs}ms\n`,
    );
    if (agg.fail > 0) {
      const firstErr = results.find((r) => r && !r.ok);
      process.stderr.write(`[bench] first error: ${firstErr ? firstErr.error : "n/a"}\n`);
    }
  }
}

// CLI-entry guard. The naive `file://${argv[1]}` form fails on Windows because
// Node's import.meta.url is `file:///H:/...` (three slashes) -- pathToFileURL
// builds the matching href, so `main()` actually fires on Windows too.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => { process.stderr.write(`bench-fatal: ${e.message}\n`); process.exit(1); });
}
