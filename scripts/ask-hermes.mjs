#!/usr/bin/env node
/**
 * ask-hermes.mjs -- PRISM bridge to the local Hermes OpenAI-compatible proxy
 * (HERMES-BRIDGE-MS0/U-ASK-HERMES).
 *
 * Hermes (Nous) exposes `hermes proxy start` -- a local HTTP server that speaks
 * the OpenAI /v1 protocol and forwards to an OAuth-authenticated upstream
 * (xAI Grok / Nous Portal), attaching the user's real managed credential. This
 * script lets PRISM (Claude via Bash, or any engine) reach that capability with
 * a compact request/response, the same way ask-ollama.mjs reaches local Ollama.
 *
 * Why a bridge and not a dispatcher: ask-ollama.mjs is the canonical
 * Bash-invoked offload surface; this clones that pattern (R11) so the substrate
 * router / smart executor can route a task to Hermes the same way it routes to
 * Ollama. Token economy (the operator's standing directive): Hermes upstreams
 * are PAID (grok), so on ANY Hermes failure this degrades to free local Ollama
 * via ask-ollama.mjs (loud about why -- R12), unless --no-fallback.
 *
 * Modes (full parity with ask-ollama's mode set):
 *   ask <question>     general question
 *   summarize <file>   compact digest of a file ("-" = stdin)
 *   explain <file>     plain-language explanation of code ("-" = stdin)
 *   triage <file>      diagnose a build/test/error dump ("-" = stdin)
 *   classify <text>    one-line classification of literal text
 *   viz <query>        search the local system-viz graph ($0); --synth adds a Hermes answer
 *   rerank <query>     graph hits, then a VERIFIED Hermes re-rank (falls back to lexical order)
 *
 * Flags:
 *   --model <id>       upstream model id (default: first from /v1/models)
 *   --json             machine-readable output
 *   --synth            (viz) add a Hermes-synthesized answer on top of the graph hits
 *   --max-hits <n>     (viz/rerank) max graph hits to return (default 12)
 *   --timeout <ms>     request timeout (default 120000)
 *   --max-tokens <n>   completion cap (default 1024)
 *   --no-fallback      do NOT degrade to Ollama on Hermes failure (fail loud)
 *   --url <base>       proxy base url (default env PRISM_HERMES_PROXY_URL or
 *                      http://127.0.0.1:8645/v1)
 *
 * Env:
 *   PRISM_HERMES_PROXY_URL   proxy base (default http://127.0.0.1:8645/v1)
 *   PRISM_HERMES_TOKEN       bearer token (default "prism"; proxy ignores value
 *                            and attaches the real OAuth credential)
 *   PRISM_HERMES_MODEL       default model id when --model is absent
 *   PRISM_HERMES_FALLBACK_MODEL  model id to ATTEMPT when the proxy is up but /v1/models
 *                            lists nothing (default "grok-4.3"). Set EMPTY to opt out and
 *                            restore the old free-degrade-to-Ollama behavior (a non-listing
 *                            proxy then never incurs a paid attempt).
 *
 * Exit codes:
 *   0  ok (answered by Hermes, OR by the Ollama fallback)
 *   2  usage error / missing input file
 *   3  Hermes failed AND fallback disabled/unavailable (fail loud)
 *
 * Design: pure functions (exported, unit-tested) + a thin impure shell.
 */

import { atomicOffloadStatsRMW } from "./lib/offload-stats-bump.mjs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
// PARITY (U-HERMES-OLLAMA-PARITY L1): reuse ask-ollama's vetted pure helpers so the
// two offload CLIs share ONE implementation of the safety guard, the file cap, and
// the size-scaled timeout (DRY -- clone-by-import, never a forked copy; R8/R7).
import { looksLikeNcProgram, MAX_FILE_BYTES, scaleTimeoutForBytes, readFileCapped, readStdin, loadGraph, searchGraph, renderHits, buildVizPrompt } from "./ask-ollama.mjs";
// Graph-mode parity (viz/rerank): reuse the shared verified-rerank lib (anti-hallucination
// id-filter + lexical fallback), the SAME one ask-ollama uses -- no fork (R8).
import { buildRerankPrompt, rerankCandidates } from "./lib/ollama-search-rerank.mjs";
import { getVaultHints, formatVaultHintsBlock } from "./lib/vault-hints.mjs";
// GROK-HIGHEST-CAPABILITY (operator /goal 2026-06-26): rank the live /v1/models list so the
// default resolves to the MOST capable grok, not the first listed. Single source of truth.
import { resolveHighestCapabilityModel, GROK_CAPABILITY_DEFAULT } from "./lib/grok-capability-rank.mjs";

const execFileAsync = promisify(execFile);

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "..");
const DEFAULT_URL = process.env.PRISM_HERMES_PROXY_URL || "http://127.0.0.1:8645/v1";
// HERMES-NVIDIA-LANE (2026-06-30, slot:alpha): the :8645 OAuth proxy IGNORES the bearer (attaches
// the real OAuth upstream), but when PRISM_HERMES_PROXY_URL is repointed at a DIRECT OpenAI-compatible
// cloud lane (NVIDIA build.nvidia.com -- the new "stronger-than-Ollama managed lane" after xAI OAuth
// died), the endpoint REQUIRES the key as the bearer. Fall back to NVIDIA_API_KEY (already in the
// fleet env) so the lane works without duplicating the key into a second env var. Local-proxy default
// is byte-identical (proxy ignores whatever bearer it gets).
const DEFAULT_TOKEN = process.env.PRISM_HERMES_TOKEN || process.env.NVIDIA_API_KEY || "prism";
// HERMES-UTIL-RESILIENCE (2026-06-18, slot:zulu): when the proxy is UP and serves
// chat but `/v1/models` listing is empty/unimplemented (a common OpenAI-compat-proxy
// case -- observed live: /v1/models returns nothing while the bravo profile serves
// grok-4.3), resolveModel() returns null and the WHOLE Hermes lane was abandoned to
// Ollama even though a chat with the known model id would have worked. This fallback
// lets the chat be ATTEMPTED with the configured default; if the proxy is truly down,
// callHermes network-fails into the SAME ollama degrade (safety net unchanged). Source:
// HERMES-FULL-ASSESSMENT-2026-06-17 bravo profile (model.default=grok-4.3). Env-overridable.
const FALLBACK_HERMES_MODEL = process.env.PRISM_HERMES_FALLBACK_MODEL || GROK_CAPABILITY_DEFAULT;

const MODES = new Set(["ask", "summarize", "explain", "triage", "classify", "viz", "rerank"]);
// File modes take a path/stdin (capped + safety-guarded, like ask-ollama's FILE_MODES);
// every other mode takes literal text. Kept in sync with ask-ollama's FILE_MODES set.
const FILE_MODES = new Set(["summarize", "explain", "triage"]);
// Graph modes search the LOCAL system-viz graph ($0, no model); only viz --synth / rerank
// touch the model -- full parity with ask-ollama's viz/rerank, reusing its exported helpers.
const GRAPH_MODES = new Set(["viz", "rerank"]);
const DEFAULT_MAX_HITS = 12; // mirrors ask-ollama's DEFAULT_MAX_HITS (a UI default, not a safety constant)

// HERMES-UTIL-TRACK (2026-06-14): ask-hermes was bridged but UNMEASURED --
// byHook["ask-hermes"] was ABSENT from the offload dashboard, so Hermes
// utilization was invisible (the "is it active?" question had no data). Record
// every call into the SAME canonical offload-stats the dashboard already reads,
// so usage is countable + auditable. Env-overridable for hermetic tests.
const STATS_PATH = process.env.PRISM_HERMES_STATS_PATH || resolve(REPO_ROOT, "mcp-server/data/state/ollama-offload-stats.json");
const HOOK_KEY = "ask-hermes";

/**
 * System prompt per mode. Kept terse: these route mechanical text work to a
 * remote model, so the instruction must bound the output shape.
 */
export function systemPromptFor(mode) {
  switch (mode) {
    case "summarize":
      return "You are a concise technical summarizer. Return a compact digest only -- no preamble, no restating the prompt.";
    case "explain":
      return "You are a senior engineer. Explain the given code in plain language: what it does, key control flow, and any risk. Be concise.";
    case "triage":
      return "You are a build/test triage assistant. Given an error or log dump, identify the most likely root cause and the single highest-value fix. Be specific and concise.";
    case "classify":
      return "You are a classifier. Return a single short label or one-line classification only -- no explanation.";
    case "ask":
    default:
      return "You are a helpful, concise assistant. Answer directly.";
  }
}

/**
 * Build the OpenAI /v1/chat/completions request body. Pure -- no I/O.
 */
export function buildChatBody({ mode, input, model, maxTokens, contextBlock = "" }) {
  // SUBSTRATE-UTIL Gap 6: when a vault-grounding contextBlock is supplied (--with-context),
  // add a PRISM-identity preamble to the system prompt (so the remote model answers in-domain
  // and trusts the injected memory) and prepend the grounding to the user message. Empty
  // contextBlock => byte-identical to the prior bare behavior (no behavior change by default).
  const sys = contextBlock
    ? `You are assisting on PRISM, a manufacturing-intelligence platform. Ground your answer in the provided PRISM memory; do NOT invent engine, file, or API names. ${systemPromptFor(mode)}`
    : systemPromptFor(mode);
  return {
    model,
    messages: [
      { role: "system", content: sys },
      { role: "user", content: contextBlock + String(input ?? "") },
    ],
    max_tokens: Number.isFinite(maxTokens) && maxTokens > 0 ? maxTokens : 1024,
    stream: false,
  };
}

/**
 * Extract assistant text from an OpenAI-compatible response object.
 * Returns { ok, content, error }. Handles the upstream error envelope, the
 * refusal stop_reason, and an empty/malformed choices array (fail-loud).
 */
export function parseChatResponse(json) {
  if (!json || typeof json !== "object") {
    return { ok: false, error: "empty or non-object response" };
  }
  if (json.error) {
    const msg = typeof json.error === "string" ? json.error : (json.error.message || JSON.stringify(json.error));
    return { ok: false, error: `upstream error: ${msg}` };
  }
  const choice = Array.isArray(json.choices) ? json.choices[0] : null;
  if (!choice) return { ok: false, error: "no choices in response" };
  if (choice.finish_reason === "refusal" || choice.message?.refusal) {
    return { ok: false, error: `refused: ${choice.message?.refusal || "policy refusal"}` };
  }
  const content = choice.message?.content;
  if (typeof content !== "string" || content.length === 0) {
    return { ok: false, error: "choice has no text content" };
  }
  return { ok: true, content };
}

/**
 * Classify a failure to decide whether degrading to Ollama is appropriate.
 * Connection/timeout/5xx => transient/infra => fallback is sensible.
 * 4xx (auth/billing/bad-request) => a real API condition => still fallback for
 * usefulness (operator wants an answer) but the reason is surfaced loudly.
 * Pure -- takes a {kind,status} descriptor, returns a boolean.
 */
/**
 * Pick the model id to send, with provenance. PURE -- no IO (delegates to the shared
 * grok-capability ranker). Priority: explicit (--model / PRISM_HERMES_MODEL) >
 * preferred (PRISM_HERMES_PREFERRED_MODEL operator pin) > HIGHEST-CAPABILITY of the
 * proxy-listed ids (/v1/models -- ranked, NOT first-listed; the operator's "grok highest
 * capability" ask) > configured fallback (FALLBACK_HERMES_MODEL). `listed` accepts the
 * full string[] of proxy ids (new) OR a single string (back-compat). The fallback lets a
 * chat be attempted when the proxy serves a model but does not list it; a truly-down proxy
 * still fails the subsequent call and degrades to Ollama (unchanged). Returns {model, source}
 * where source is "explicit" | "preferred" | "listed" | "fallback" | "none".
 * @returns {{model: (string|null), source: string}}
 */
export function pickModel({ explicit, listed, fallback, preferred } = {}) {
  return resolveHighestCapabilityModel({ explicit, preferred, listed, fallback });
}

export function shouldFallback({ kind, status } = {}) {
  if (kind === "network" || kind === "timeout") return true;
  if (kind === "http") return true; // any HTTP error -> still try free local
  return true;
}

/**
 * Pure: fold one ask-hermes call into the offload-stats object's
 * byHook["ask-hermes"] tally. Mutates + returns `stats`. A call answered
 * off-Claude (source "hermes" OR "ollama-fallback") counts as an `offloaded`;
 * a total failure counts as `kept` (Claude must still answer). bySource keeps
 * the Hermes-vs-fallback split so real Hermes utilization is distinguishable
 * from "Hermes failed, Ollama saved it". Exported for tests.
 * @param {object} stats parsed offload-stats (any shape; byHook is created)
 * @param {{source:string, mode:string, now?:string}} call
 */
export function tallyUsage(stats, { source, mode, now, tokensSaved } = {}) {
  if (!stats || typeof stats !== "object") stats = {};
  if (!stats.byHook || typeof stats.byHook !== "object") stats.byHook = {};
  const h = stats.byHook[HOOK_KEY] || { fired: 0, offloaded: 0, kept: 0, suggested: 0, tokensSaved: 0, bySource: {}, byMode: {} };
  h.fired = (h.fired | 0) + 1;
  const offloaded = source === "hermes" || source === "ollama-fallback";
  if (offloaded) {
    h.offloaded = (h.offloaded | 0) + 1;
    // U-OLLAMA-BRIDGE-EXEC-VISIBILITY (alpha 2026-06-20): attribute the tokens this
    // off-Claude run saved (Claude would have processed the input + generated the
    // answer). Conservative input+output estimate from the call site (see
    // estimateHermesSaved). Only on a real offload; a fail/kept saves nothing.
    // Plain `|| 0` add (NOT `| 0`) -- cumulative savings can exceed the 32-bit
    // range the bitwise-OR counts use. Closes the 855-exec / 0-tokensSaved hole
    // that made byHook["ask-hermes"].tokensSaved invisible to the dashboard.
    const saved = Number.isFinite(tokensSaved) ? tokensSaved : 0;
    if (saved > 0) h.tokensSaved = (h.tokensSaved || 0) + saved;
  } else h.kept = (h.kept | 0) + 1;
  h.bySource = h.bySource || {};
  h.bySource[source || "unknown"] = (h.bySource[source || "unknown"] | 0) + 1;
  if (mode) { h.byMode = h.byMode || {}; h.byMode[mode] = (h.byMode[mode] | 0) + 1; }
  h.lastUsed = now || new Date().toISOString();
  stats.byHook[HOOK_KEY] = h;
  return stats;
}

/**
 * Pure: conservative tokens-saved estimate for ONE off-Claude ask-hermes call --
 * the input Claude would have processed PLUS the answer it would have generated,
 * at ~4 chars/token. Fed to the offloaded recordUsage call sites so the offload
 * dashboard's bridgeTokensSaved reflects real Hermes throughput (was a 0-hole).
 * Conservative (chars/4 is a low token estimate for English/code) and honest --
 * it is an ESTIMATE, never a measured count. 0 on non-string input.
 * @param {string} input  the task text sent off-Claude
 * @param {string} output the answer the off-Claude model returned
 * @returns {number} estimated Claude tokens avoided
 */
export function estimateHermesSaved(input, output) {
  const inChars = typeof input === "string" ? input.length : 0;
  const outChars = typeof output === "string" ? output.length : 0;
  return Math.ceil((inChars + outChars) / 4);
}

/**
 * Impure, fail-safe: record one off-Claude ask-hermes call into the canonical
 * offload-stats via tallyUsage, wrapped in the shared atomic-RMW envelope
 * (./lib/offload-stats-bump.mjs) -- never throws, never CREATES the file (only
 * annotates the canonical one), never spawns a parallel stats store.
 */
function recordUsage(call) {
  atomicOffloadStatsRMW(STATS_PATH, (stats) => tallyUsage(stats, call));
}

/**
 * Parse argv into { mode, input(raw), model, json, timeout, maxTokens,
 * fallback, url, error }. Pure (no file reads -- input resolution is the shell).
 */
export function parseArgs(argv) {
  const out = {
    mode: null, rawInput: null, model: process.env.PRISM_HERMES_MODEL || null,
    json: false, timeout: 120000, maxTokens: 1024, fallback: true, url: DEFAULT_URL,
    allowUnsafe: false, timeoutExplicit: false, synth: false, maxHits: DEFAULT_MAX_HITS,
    withContext: false, // --with-context: prepend top-3 vault-memory excerpts (Gap 6 grounding)
    error: null,
  };
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--json") out.json = true;
    else if (a === "--no-fallback") out.fallback = false;
    else if (a === "--allow-unsafe") out.allowUnsafe = true; // parity: override the NC/G-code safety guard
    else if (a === "--synth") out.synth = true; // viz: add a Hermes answer on top of the graph hits
    else if (a === "--with-context") out.withContext = true;
    else if (a === "--max-hits") out.maxHits = parseInt(argv[++i] ?? String(DEFAULT_MAX_HITS), 10) || DEFAULT_MAX_HITS;
    else if (a === "--model") out.model = argv[++i] ?? null;
    else if (a === "--url") out.url = argv[++i] ?? DEFAULT_URL;
    else if (a === "--timeout") { out.timeout = parseInt(argv[++i] ?? "120000", 10) || 120000; out.timeoutExplicit = true; }
    else if (a === "--max-tokens") out.maxTokens = parseInt(argv[++i] ?? "1024", 10) || 1024;
    else if (a.startsWith("--")) { out.error = `unknown flag: ${a}`; return out; }
    else positional.push(a);
  }
  out.mode = positional.shift() || null;
  out.rawInput = positional.join(" ");
  if (!out.mode || !MODES.has(out.mode)) {
    out.error = `mode must be one of: ${[...MODES].join(", ")}`;
  }
  return out;
}

/** Resolve mode input to { ok, text, truncated, bytes } | { ok:false, error }.
 *  ask/classify take literal text; summarize/explain/triage take a file path or "-" (stdin).
 *  File/stdin reads reuse ask-ollama's CANONICAL readFileCapped/readStdin (DRY -- ONE cap
 *  implementation fleet-wide; R8), so an unbounded file is never shipped to the PAID remote
 *  proxy (cost + safety). A non-existent path is treated leniently as literal text (so
 *  `summarize "some words"` still works). Impure (reads); deps injectable for tests. */
export async function resolveInput(mode, rawInput, deps = {}) {
  const _readFileCapped = deps.readFileCapped || readFileCapped;
  const _readStdin = deps.readStdin || readStdin;
  // Non-file modes (ask / classify / viz / rerank) take a literal query, never a file/stdin read.
  if (!FILE_MODES.has(mode)) {
    const t = String(rawInput ?? "");
    return { ok: true, text: t, truncated: false, bytes: t.length };
  }
  if (rawInput === "-") {
    const r = await _readStdin();
    return r.ok
      ? { ok: true, text: r.content, truncated: r.truncated, bytes: r.bytes }
      : { ok: false, error: `stdin read failed: ${r.error}` };
  }
  const r = _readFileCapped(rawInput);
  if (r.ok) return { ok: true, text: r.content, truncated: r.truncated, bytes: r.bytes };
  // Lenient: a non-existent path is literal text (like a question), matching the prior CLI UX.
  // `lenient` lets the shell surface a one-line advisory (R12) so a genuinely-missing intended
  // file is not silently mis-routed to the paid proxy as a literal prompt.
  if (/file not found/i.test(r.error || "")) {
    const t = String(rawInput ?? "");
    return { ok: true, text: t, truncated: false, bytes: t.length, lenient: true };
  }
  return { ok: false, error: r.error };
}

/** Pure: should this input be REFUSED to the remote proxy? File modes only -- a dense NC/G-code
 *  program is safety-critical output that must stay on Claude, never a paid remote model
 *  (identical rule to ask-ollama). --allow-unsafe (allowUnsafe) overrides for non-safety content. */
export function shouldRefuseUnsafe({ mode, allowUnsafe, text } = {}) {
  return FILE_MODES.has(mode) && !allowUnsafe && looksLikeNcProgram(text);
}

/** Pure: the effective request timeout. File modes scale the timeout to the input size (a cold
 *  remote/large prompt can exceed the flat default) UNLESS the operator pinned --timeout; ask/
 *  classify keep the flat base. Mirrors ask-ollama's call-site timeout decision. */
export function effectiveTimeout({ mode, timeoutExplicit, textLen, base } = {}) {
  return (FILE_MODES.has(mode) && !timeoutExplicit) ? scaleTimeoutForBytes(textLen, base) : base;
}

/**
 * Run a GRAPH mode (viz | rerank) against the local system-viz graph. The graph search is pure +
 * LOCAL ($0); only viz --synth and rerank touch the model (via the injected callModel, which the
 * shell wires to the Hermes proxy). On a model failure the result degrades to the already-useful
 * local hits (viz) or the lexical order (rerank) -- identical to ask-ollama, so a graph query is
 * NEVER worse than the local search. Reuses ask-ollama's exported helpers + the shared rerank lib
 * (DRY; R8). Both callModel and loadGraphImpl are injectable so the path stays unit-testable.
 * @param {{mode:string,query:string,synth?:boolean,maxHits?:number,json?:boolean,callModel:Function,loadGraphImpl?:Function}} o
 *   callModel(prompt) -> { ok, content } | { ok:false, error }
 *   loadGraphImpl()   -> { ok, graph } | { ok:false, error }
 * @returns {Promise<{exitCode:number, output:string}>}
 */
export async function runGraphMode({ mode, query, synth = false, maxHits = DEFAULT_MAX_HITS, json = false, callModel, loadGraphImpl = loadGraph } = {}) {
  const loaded = loadGraphImpl();
  if (!loaded || !loaded.ok) return { exitCode: 3, output: `[ask-hermes] ${loaded ? loaded.error : "graph load failed"}` };
  const scanned = Array.isArray(loaded.graph?.nodes) ? loaded.graph.nodes.length : 0;
  const hits = searchGraph(query, loaded.graph, maxHits);
  const hitText = renderHits(hits);

  if (mode === "viz") {
    const footer = `viz: scanned ${scanned} graph nodes locally ($0) -> ${hits.length} hit(s)`;
    if (!synth) {
      return { exitCode: 0, output: json ? JSON.stringify({ mode, synth: false, scanned, hits }, null, 2) : `${hitText}\n\n${footer}` };
    }
    const gen = await callModel(buildVizPrompt(query, hits));
    if (!gen || !gen.ok) {
      const why = gen ? gen.error : "no model";
      const banner = `[ask-hermes] Hermes synthesis unavailable (${why}) -- local graph hits below (search succeeded):`;
      return { exitCode: 0, output: json ? JSON.stringify({ mode, synth: true, hermesError: why, scanned, hits }, null, 2) : `${banner}\n\n${hitText}\n\n${footer}` };
    }
    return { exitCode: 0, output: json ? JSON.stringify({ mode, synth: true, answer: gen.content, scanned, hitCount: hits.length }, null, 2) : `${gen.content}\n\n${footer}` };
  }

  // rerank: the model proposes a better order; verifyRerank (inside rerankCandidates) keeps ONLY
  // real candidate ids (anti-hallucination), so a bad/empty/unreachable model falls back to lexical.
  const run = async () => {
    const gen = await callModel(buildRerankPrompt(query, hits));
    if (!gen || !gen.ok) throw new Error(gen ? gen.error : "no model");
    return gen.content;
  };
  const rr = await rerankCandidates({ query, candidates: hits, run, label: "ask-hermes-rerank" });
  const footer = `rerank: scanned ${scanned} nodes locally -> ${hits.length} lexical hit(s); Hermes re-rank ${rr.verified ? "VERIFIED" : `fell back to lexical (${rr.reason || rr.source})`}`;
  // `source` reports the BACKEND honestly (R12): a verified re-rank was done by Hermes, a fallback
  // is the local lexical order -- never the shared lib's generic "ollama"/"fallback" label.
  return { exitCode: 0, output: json ? JSON.stringify({ mode, query, source: rr.verified ? "hermes" : "lexical", verified: rr.verified, reason: rr.reason, scanned, ranked: rr.ranked }, null, 2) : `${renderHits(rr.ranked)}\n\n${footer}` };
}

/** Fetch the first available model id from the proxy's /v1/models. Impure. */
// Returns the FULL list of model ids the proxy serves (string[]) so the caller (pickModel)
// can rank for highest-capability -- NOT just the first id (the pre-2026-06-26 behavior).
async function resolveModel(url, token, timeout) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), Math.min(timeout, 20000));
  try {
    const r = await fetch(`${url}/models`, {
      headers: { Authorization: `Bearer ${token}` }, signal: ctrl.signal,
    });
    if (!r.ok) return null;
    const j = await r.json();
    const ids = Array.isArray(j?.data) ? j.data.map(m => m?.id).filter(Boolean) : [];
    return ids.length ? ids : null;
  } catch { return null; }
  finally { clearTimeout(t); }
}

/** POST a chat completion to the Hermes proxy. Returns {ok, content|error, fail}. Impure. */
async function callHermes({ url, token, body, timeout }) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeout);
  try {
    const r = await fetch(`${url}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    let json = null;
    try { json = await r.json(); } catch { /* non-json body */ }
    if (!r.ok) {
      const parsed = parseChatResponse(json);
      const reason = parsed.error || `HTTP ${r.status}`;
      return { ok: false, error: reason, fail: { kind: "http", status: r.status } };
    }
    return parseChatResponse(json);
  } catch (e) {
    const kind = e.name === "AbortError" ? "timeout" : "network";
    return { ok: false, error: `${kind}: ${e.message}`, fail: { kind } };
  } finally { clearTimeout(t); }
}

/**
 * Degrade to free local Ollama via ask-ollama.mjs. Impure.
 * contextBlock -- vault-grounding prefix built by the Hermes path (--with-context).
 *   Prepended to the text sent to Ollama so grounding survives Hermes->Ollama degradation.
 *   Empty string ("") -> byte-identical to the prior behavior (no regression).
 * _spawnImpl -- injectable subprocess executor for tests (default: module-level async runner).
 */
export async function fallbackToOllama({ mode, text, contextBlock = "", model, timeout, _spawnImpl }) {
  const runner = _spawnImpl || execFileAsync;
  // ask-ollama text modes: ask/summarize/explain/triage. classify -> ask.
  const olMode = mode === "classify" ? "ask" : mode;
  // Prepend vault grounding (mirrors how buildChatBody uses contextBlock: grounding first,
  // then the user query). When contextBlock is "" the join is a no-op -- groundedText ===
  // text byte-for-byte (R9 invariant: no behavioral change when --with-context is off).
  const groundedText = contextBlock ? contextBlock + text : text;
  const args = [resolve(REPO_ROOT, "scripts/ask-ollama.mjs"), olMode];
  if (olMode === "ask") args.push(groundedText);
  else args.push("-"); // pass via stdin for file-modes
  args.push("--timeout", String(timeout));
  try {
    const { stdout } = await runner(process.execPath, args, {
      timeout: timeout + 5000,
      input: olMode === "ask" ? undefined : groundedText,
      maxBuffer: 16 * 1024 * 1024,
      encoding: "utf-8",
    });
    return { ok: true, content: stdout.trim() };
  } catch (e) {
    return { ok: false, error: `ollama fallback failed: ${e.message?.slice(0, 300)}` };
  }
}

function emit(json, obj) {
  if (json) process.stdout.write(JSON.stringify(obj) + "\n");
  else process.stdout.write((obj.content ?? obj.error ?? "") + (obj.truncatedNote || "") + "\n");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.error) {
    process.stderr.write(`[ask-hermes] ${args.error}\n`);
    process.stderr.write("usage: ask-hermes.mjs <ask|summarize|explain|triage|classify|viz|rerank> <input> [--model id] [--json] [--synth] [--max-hits n] [--no-fallback] [--url base] [--timeout ms] [--max-tokens n] [--with-context]\n  --with-context: prepend top-3 PRISM memory-vault excerpts (+ PRISM-identity system prompt) to ground the model-call modes\n");
    process.exit(2);
  }
  const inp = await resolveInput(args.mode, args.rawInput);
  if (!inp.ok) { process.stderr.write(`[ask-hermes] ${inp.error}\n`); process.exit(2); }
  if (!inp.text || !inp.text.trim()) { process.stderr.write("[ask-hermes] empty input\n"); process.exit(2); }
  if (inp.lenient) {
    // A file mode got a path that does not exist -> treated as literal text. Surface it (R12) so a
    // mistyped/deleted intended file is not silently shipped to the paid proxy as a prompt.
    process.stderr.write(`[ask-hermes] '${args.rawInput}' not found as a file; treating it as literal text.\n`);
  }

  // GRAPH MODES (viz | rerank): local graph search is $0; the model is touched ONLY for viz --synth
  // and rerank, routed through the Hermes proxy. On a model failure the result degrades to the local
  // hits / lexical order (a graph query is never worse than the free local search). Exits in-branch.
  if (GRAPH_MODES.has(args.mode)) {
    const needsModel = args.mode === "rerank" || (args.mode === "viz" && args.synth);
    let model = null;
    if (needsModel) {
      const listedG = args.model ? null : await resolveModel(args.url, DEFAULT_TOKEN, args.timeout);
      const pickedG = pickModel({ explicit: args.model, listed: listedG, fallback: FALLBACK_HERMES_MODEL, preferred: process.env.PRISM_HERMES_PREFERRED_MODEL });
      model = pickedG.model;
      if (pickedG.source === "fallback") {
        process.stderr.write(`[ask-hermes] proxy /v1/models did not list a model; attempting configured fallback '${model}' (override via PRISM_HERMES_MODEL / PRISM_HERMES_FALLBACK_MODEL).\n`);
      }
    }
    const callModel = async (prompt) => {
      if (!model) return { ok: false, error: "no model resolved from the Hermes proxy" };
      const body = buildChatBody({ mode: "ask", input: prompt, model, maxTokens: args.maxTokens });
      const r = await callHermes({ url: args.url, token: DEFAULT_TOKEN, body, timeout: args.timeout });
      if (r.ok) { recordUsage({ source: "hermes", mode: args.mode, tokensSaved: estimateHermesSaved(prompt, r.content) }); return { ok: true, content: r.content }; }
      return { ok: false, error: r.error };
    };
    const res = await runGraphMode({ mode: args.mode, query: inp.text, synth: args.synth, maxHits: args.maxHits, json: args.json, callModel });
    process.stdout.write(res.output + "\n");
    process.exit(res.exitCode);
  }

  // SAFETY-ROUTING PARITY (matches ask-ollama): a cloud/remote model is even less
  // appropriate than a local one for NC/G-code program output, so refuse to ship a
  // dense G-code program to the PAID proxy. --allow-unsafe overrides for non-safety
  // content (identical rule + message shape as ask-ollama). File modes only.
  if (shouldRefuseUnsafe({ mode: args.mode, allowUnsafe: args.allowUnsafe, text: inp.text })) {
    process.stderr.write(
      "[ask-hermes] refusing to route NC/G-code program output to the remote proxy " +
      "(safety-routing rule: safety-critical output stays on Claude). " +
      "Pass --allow-unsafe if this content is not safety-relevant.\n",
    );
    process.exit(2);
  }

  // TIMEOUT PARITY (matches ask-ollama): scale the request timeout to the input size
  // for file modes unless the operator pinned --timeout; ask/classify keep the flat default.
  const effTimeout = effectiveTimeout({ mode: args.mode, timeoutExplicit: args.timeoutExplicit, textLen: inp.text.length, base: args.timeout });
  // Truncation transparency parity: surface when a large file was capped before sending.
  const truncNote = inp.truncated ? ` (first ${MAX_FILE_BYTES} of ${inp.bytes} bytes)` : "";

  const listedModel = args.model ? null : await resolveModel(args.url, DEFAULT_TOKEN, effTimeout);
  const picked = pickModel({ explicit: args.model, listed: listedModel, fallback: FALLBACK_HERMES_MODEL, preferred: process.env.PRISM_HERMES_PREFERRED_MODEL });
  let model = picked.model;
  if (picked.source === "fallback") {
    process.stderr.write(`[ask-hermes] proxy /v1/models did not list a model; attempting configured fallback '${model}' (override via PRISM_HERMES_MODEL / PRISM_HERMES_FALLBACK_MODEL).\n`);
  }
  // SUBSTRATE-UTIL Gap 6: opt-in vault grounding. Hoisted outside the `if (model)` block so
  // contextBlock is in scope at the Hermes->Ollama fallback call site below -- otherwise the
  // already-built grounding is DISCARDED and the Ollama fallback answers UNGROUNDED (the bug
  // this hoist fixes). When --with-context is off contextBlock is "" and all downstream paths
  // are byte-identical to the prior behavior. viz/rerank already exited via runGraphMode above.
  const contextBlock = args.withContext ? formatVaultHintsBlock(getVaultHints(inp.text, {})) : "";
  let hermes = { ok: false, error: "no model resolved", fail: { kind: "network" } };
  if (model) {
    const body = buildChatBody({ mode: args.mode, input: inp.text, model, maxTokens: args.maxTokens, contextBlock });
    hermes = await callHermes({ url: args.url, token: DEFAULT_TOKEN, body, timeout: effTimeout });
  }

  if (hermes.ok) {
    recordUsage({ source: "hermes", mode: args.mode, tokensSaved: estimateHermesSaved(inp.text, hermes.content) });
    emit(args.json, { source: "hermes", model, truncated: inp.truncated, truncatedNote: truncNote, content: hermes.content });
    process.exit(0);
  }

  // Hermes failed.
  process.stderr.write(`[ask-hermes] Hermes proxy failed: ${hermes.error}\n`);
  if (!args.fallback || !shouldFallback(hermes.fail)) {
    recordUsage({ source: "fail", mode: args.mode });
    if (args.json) emit(true, { source: "hermes", ok: false, error: hermes.error });
    process.exit(3);
  }
  process.stderr.write("[ask-hermes] degrading to free local Ollama (token economy; --no-fallback to disable)\n");
  const ol = await fallbackToOllama({ mode: args.mode, text: inp.text, contextBlock, model: args.model, timeout: effTimeout });
  if (ol.ok) {
    recordUsage({ source: "ollama-fallback", mode: args.mode, tokensSaved: estimateHermesSaved(inp.text, ol.content) });
    emit(args.json, { source: "ollama-fallback", hermesError: hermes.error, truncated: inp.truncated, truncatedNote: truncNote, content: ol.content });
    process.exit(0);
  }
  recordUsage({ source: "fail", mode: args.mode });
  process.stderr.write(`[ask-hermes] ${ol.error}\n`);
  if (args.json) emit(true, { source: "none", ok: false, hermesError: hermes.error, ollamaError: ol.error });
  process.exit(3);
}

const _invokedDirectly = process.argv[1] && process.argv[1].replace(/\\/g, "/").endsWith("scripts/ask-hermes.mjs");
if (_invokedDirectly) {
  main().catch((e) => {
    process.stderr.write(`[ask-hermes] unexpected: ${e.message}\n`);
    process.exit(3);
  });
}
