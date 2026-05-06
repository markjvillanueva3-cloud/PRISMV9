#!/usr/bin/env node
/**
 * setup-embedding-model — INTEL-OLLAMA-OBSIDIAN-MS0/P17-U01.
 *
 * Idempotently ensures the nomic-embed-text model is installed in Ollama
 * and runs a smoke test asserting:
 *   - 768-dimensional embedding output
 *   - warm-call latency p50 < 100ms (cold start excluded — first call
 *     can be 10-30s on initial model load).
 *
 * Exit codes:
 *   0 = model present + smoke test passed
 *   1 = Ollama unreachable
 *   2 = pull failed
 *   3 = smoke test failed (dim mismatch, latency over budget, no embedding)
 *
 * USAGE
 *   node scripts/setup-embedding-model.mjs
 *   node scripts/setup-embedding-model.mjs --force-pull
 *   node scripts/setup-embedding-model.mjs --json
 *
 * CLI flags:
 *   --base-url <url>      override OLLAMA_BASE_URL (default 127.0.0.1:11434)
 *   --model <name>        override model name (default nomic-embed-text)
 *   --force-pull          re-pull even if already present
 *   --warm-calls <n>      number of warm calls for latency p50 (default 5)
 *   --max-warm-ms <ms>    p50 latency budget in ms (default 100)
 *   --json                emit JSON instead of human-readable summary
 *
 * The pure decision functions are exported so vitest can test them
 * statically without touching a live Ollama instance.
 */

import process from "node:process";

export const DEFAULT_BASE_URL = "http://127.0.0.1:11434";
export const DEFAULT_MODEL = "nomic-embed-text";
export const EXPECTED_DIM = 768;
export const DEFAULT_WARM_CALLS = 5;
export const DEFAULT_WARM_BUDGET_MS = 100;
export const PULL_TIMEOUT_MS = 10 * 60 * 1000; // 10 min — first pull can be slow on cold cache

// ──────────────────────────────────────────────────────────────────────
// Pure logic — directly testable, no I/O
// ──────────────────────────────────────────────────────────────────────

/**
 * Decide whether `name` is present in the `/api/tags` response.
 * Ollama tag listings include both "name" and "model" fields and may
 * carry the `:latest` suffix; matching strips the suffix on either side.
 *
 * @param {object|null} tagsResponse - parsed /api/tags body
 * @param {string} modelName
 */
export function isModelInstalled(tagsResponse, modelName) {
  if (!tagsResponse || !Array.isArray(tagsResponse.models)) return false;
  if (typeof modelName !== "string" || modelName.length === 0) return false;
  const target = stripLatest(modelName);
  for (const m of tagsResponse.models) {
    const candidates = [m?.name, m?.model].filter((s) => typeof s === "string");
    for (const c of candidates) {
      if (stripLatest(c) === target) return true;
    }
  }
  return false;
}

function stripLatest(s) {
  return typeof s === "string" && s.endsWith(":latest") ? s.slice(0, -7) : s;
}

/**
 * Validate the shape of an /api/embeddings response. Returns:
 *   { ok: true, dim, sample } when embedding is a non-empty number array
 *   { ok: false, reason } otherwise. `reason` is one of:
 *     "no-response" | "no-embedding" | "embedding-empty" | "non-finite" | "wrong-type"
 *
 * @param {unknown} json
 */
export function validateEmbeddingResponse(json) {
  if (!json || typeof json !== "object") return { ok: false, reason: "no-response" };
  const emb = /** @type {any} */ (json).embedding;
  if (!Array.isArray(emb)) return { ok: false, reason: "no-embedding" };
  if (emb.length === 0) return { ok: false, reason: "embedding-empty" };
  for (let i = 0; i < emb.length; i++) {
    const v = emb[i];
    if (typeof v !== "number") return { ok: false, reason: "wrong-type" };
    if (!Number.isFinite(v)) return { ok: false, reason: "non-finite" };
  }
  return { ok: true, dim: emb.length, sample: emb.slice(0, 5) };
}

/**
 * Compute the median of a numeric array. Returns null on empty input.
 * Used to evaluate warm-call latency budget (p50, not mean — robust to cold-start outlier).
 *
 * @param {number[]} xs
 */
export function median(xs) {
  if (!Array.isArray(xs) || xs.length === 0) return null;
  const sorted = [...xs].filter((v) => typeof v === "number" && Number.isFinite(v)).sort((a, b) => a - b);
  if (sorted.length === 0) return null;
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid];
  return (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Decide whether the smoke test passed given collected results.
 *
 * @param {object} input
 * @param {boolean} input.dimensionMatches
 * @param {number|null} input.p50LatencyMs
 * @param {number} input.budgetMs
 * @param {number} input.expectedDim
 * @param {number|null} input.actualDim
 * @returns {{ok:true} | {ok:false, reason:string, details?:object}}
 */
export function decideSmokePass({ dimensionMatches, p50LatencyMs, budgetMs, expectedDim, actualDim }) {
  if (!dimensionMatches) {
    return {
      ok: false,
      reason: "dim-mismatch",
      details: { expected: expectedDim, actual: actualDim },
    };
  }
  if (p50LatencyMs === null || p50LatencyMs === undefined) {
    return { ok: false, reason: "no-warm-samples" };
  }
  if (p50LatencyMs > budgetMs) {
    return {
      ok: false,
      reason: "latency-over-budget",
      details: { p50_ms: p50LatencyMs, budget_ms: budgetMs },
    };
  }
  return { ok: true };
}

/**
 * Parse argv into a flag map. Supports `--key value` and `--key=value` and
 * boolean `--flag`. Unknown flags are kept verbatim under `_unknown`.
 *
 * @param {string[]} argv
 */
export function parseArgs(argv) {
  const out = {
    baseUrl: "",
    model: "",
    forcePull: false,
    warmCalls: 0,
    maxWarmMs: 0,
    json: false,
    _unknown: /** @type {string[]} */ ([]),
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--base-url") out.baseUrl = argv[++i] ?? "";
    else if (a.startsWith("--base-url=")) out.baseUrl = a.slice("--base-url=".length);
    else if (a === "--model") out.model = argv[++i] ?? "";
    else if (a.startsWith("--model=")) out.model = a.slice("--model=".length);
    else if (a === "--force-pull") out.forcePull = true;
    else if (a === "--warm-calls") out.warmCalls = Number(argv[++i] ?? "");
    else if (a.startsWith("--warm-calls=")) out.warmCalls = Number(a.slice("--warm-calls=".length));
    else if (a === "--max-warm-ms") out.maxWarmMs = Number(argv[++i] ?? "");
    else if (a.startsWith("--max-warm-ms=")) out.maxWarmMs = Number(a.slice("--max-warm-ms=".length));
    else if (a === "--json") out.json = true;
    else out._unknown.push(a);
  }
  return out;
}

// ──────────────────────────────────────────────────────────────────────
// I/O glue — calls live Ollama; not exercised by unit tests
// ──────────────────────────────────────────────────────────────────────

async function fetchTags(baseUrl) {
  const res = await fetch(`${baseUrl}/api/tags`);
  if (!res.ok) throw new Error(`tags HTTP ${res.status}`);
  return await res.json();
}

async function pullModel(baseUrl, model) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PULL_TIMEOUT_MS);
  try {
    // Streaming pull — Ollama emits NDJSON progress; we just need it to terminate.
    const res = await fetch(`${baseUrl}/api/pull`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, stream: false }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`pull HTTP ${res.status}: ${body.slice(0, 200)}`);
    }
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

async function callEmbedding(baseUrl, model, prompt) {
  const t0 = Date.now();
  const res = await fetch(`${baseUrl}/api/embeddings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, prompt }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`embeddings HTTP ${res.status}: ${body.slice(0, 200)}`);
  }
  const json = await res.json();
  return { json, elapsed_ms: Date.now() - t0 };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const baseUrl = args.baseUrl || process.env.OLLAMA_BASE_URL || DEFAULT_BASE_URL;
  const model = args.model || DEFAULT_MODEL;
  const warmCalls = Number.isFinite(args.warmCalls) && args.warmCalls > 0 ? args.warmCalls : DEFAULT_WARM_CALLS;
  const budgetMs = Number.isFinite(args.maxWarmMs) && args.maxWarmMs > 0 ? args.maxWarmMs : DEFAULT_WARM_BUDGET_MS;

  const report = {
    baseUrl,
    model,
    expectedDim: EXPECTED_DIM,
    warmCalls,
    budgetMs,
    ollamaReachable: false,
    alreadyInstalled: false,
    pulled: false,
    coldLatencyMs: null,
    warmLatenciesMs: /** @type {number[]} */ ([]),
    p50WarmLatencyMs: null,
    actualDim: null,
    embeddingSample: null,
    smoke: /** @type {any} */ (null),
    error: null,
  };

  // 1. Reach Ollama
  let tags;
  try {
    tags = await fetchTags(baseUrl);
    report.ollamaReachable = true;
  } catch (e) {
    report.error = `ollama-unreachable: ${e.message}`;
    emit(report, args.json);
    process.exit(1);
  }

  // 2. Idempotent pull
  report.alreadyInstalled = isModelInstalled(tags, model);
  if (!report.alreadyInstalled || args.forcePull) {
    try {
      await pullModel(baseUrl, model);
      report.pulled = true;
    } catch (e) {
      report.error = `pull-failed: ${e.message}`;
      emit(report, args.json);
      process.exit(2);
    }
  }

  // 3. Smoke — first call (cold), then `warmCalls` warm calls for p50 budget.
  try {
    const cold = await callEmbedding(baseUrl, model, "hello world");
    report.coldLatencyMs = cold.elapsed_ms;
    const v = validateEmbeddingResponse(cold.json);
    if (!v.ok) throw new Error(`cold-call ${v.reason}`);
    report.actualDim = v.dim;
    report.embeddingSample = v.sample;

    const warmPrompts = [
      "speed feed cutting parameters",
      "kienzle force formula",
      "tool wear taylor model",
      "five axis kinematics",
      "thread mill chip thinning",
      "stability lobe diagram",
      "surface roughness brammertz",
      "deep hole peck cycle",
    ];
    for (let i = 0; i < warmCalls; i++) {
      const r = await callEmbedding(baseUrl, model, warmPrompts[i % warmPrompts.length]);
      const wv = validateEmbeddingResponse(r.json);
      if (!wv.ok) throw new Error(`warm-call ${i + 1} ${wv.reason}`);
      if (wv.dim !== EXPECTED_DIM) throw new Error(`warm-call ${i + 1} dim=${wv.dim}`);
      report.warmLatenciesMs.push(r.elapsed_ms);
    }
    report.p50WarmLatencyMs = median(report.warmLatenciesMs);
  } catch (e) {
    report.error = `smoke-failed: ${e.message}`;
    emit(report, args.json);
    process.exit(3);
  }

  // 4. Final pass/fail decision (pure logic)
  report.smoke = decideSmokePass({
    dimensionMatches: report.actualDim === EXPECTED_DIM,
    p50LatencyMs: report.p50WarmLatencyMs,
    budgetMs,
    expectedDim: EXPECTED_DIM,
    actualDim: report.actualDim,
  });

  emit(report, args.json);
  process.exit(report.smoke?.ok ? 0 : 3);
}

function emit(report, asJson) {
  if (asJson) {
    process.stdout.write(JSON.stringify(report, null, 2) + "\n");
    return;
  }
  const lines = [
    `Ollama:     ${report.baseUrl} (${report.ollamaReachable ? "reachable" : "DOWN"})`,
    `Model:      ${report.model}`,
    `Installed:  ${report.alreadyInstalled ? "yes (skipped pull)" : (report.pulled ? "pulled now" : "no")}`,
  ];
  if (report.coldLatencyMs !== null) {
    lines.push(`Cold call:  ${report.coldLatencyMs}ms (model load)`);
  }
  if (report.warmLatenciesMs.length > 0) {
    lines.push(`Warm calls: ${report.warmLatenciesMs.length} samples, p50=${report.p50WarmLatencyMs}ms (budget ${report.budgetMs}ms)`);
  }
  if (report.actualDim !== null) {
    lines.push(`Embedding:  ${report.actualDim}-dim (expected ${report.expectedDim})`);
  }
  if (report.error) {
    lines.push(`ERROR:      ${report.error}`);
  } else if (report.smoke?.ok) {
    lines.push(`PASS — smoke test green.`);
  } else if (report.smoke && !report.smoke.ok) {
    lines.push(`FAIL — ${report.smoke.reason}: ${JSON.stringify(report.smoke.details ?? {})}`);
  }
  process.stdout.write(lines.join("\n") + "\n");
}

// Only run main() when invoked as a script. Importers (tests) skip this.
const invokedDirectly = process.argv[1] && process.argv[1].endsWith("setup-embedding-model.mjs");
if (invokedDirectly) {
  main().catch((e) => {
    process.stderr.write(`unhandled: ${e?.stack ?? e}\n`);
    process.exit(1);
  });
}
