// scripts/lib/octopus-live-brain.mjs
//
// PSN-OCTOPUS-FLEET-SYNERGY-MS0 Wave 2 / U-FLEET-P2-LIVEBRAIN-SLOTCTX —
// LIVE-brain fetch for the per-slot context bundle hook.
//
// The .mjs slot-context-bundle-inject hook cannot import the TS engine
// (zuluAwarenessReader.ts:262 liveBrainContext()), so this lib reproduces the
// intended retrieval over the WIRED MCP action prism_session:obsidian_search,
// routed through the running :3100 HTTP bridge (the same /mcp POST the stdio
// bridge in .claude/helpers/mcp-http-bridge.mjs forwards). A tiny live-vault
// snippet relevant to the current prompt is pulled and injected into the
// bundle so every chat sees the operator's open vault, not just the static
// awareness envelope.
//
// HARD CONTRACT (matches the TS liveBrainContext fail-soft semantics):
//   - GATED behind PRISM_OBSIDIAN_LIVE=1 (default OFF) — off => returns null,
//     ZERO behavior change for every existing caller.
//   - HARD TIMEOUT (~1.5s default) on the bridge call — a slow/cold :3100 can
//     never stall a UserPromptSubmit.
//   - SHORT-TTL CACHE (default 30s) keyed on the (gate, prompt-key) pair so a
//     burst of prompts in one chat hits the vault at most once per TTL.
//   - FAIL-SOFT to null EVERYWHERE: :3100 down, non-200, bad/garbage/oversize
//     JSON, MCP error envelope, empty result — all yield null (inject nothing).
//   - NEVER throws. Every path returns null or a small {ok, hits[]} object.
//
// Pure-core: the HTTP fetcher, clock, and cache map are all injectable so the
// tests run with zero network + deterministic time. The default fetcher uses
// node:http against 127.0.0.1:3100 (IPv4 explicit — "localhost" resolves to
// ::1 on modern Windows and yields ECONNREFUSED ::1, same bug the bridge
// documents).
//
// Karpathy discipline:
//   CLASSIFY: cache + bounded-IO + parse-validate
//   TECHNIQUE: gate-first short-circuit; AbortController-free manual timeout
//     race (req.setTimeout + destroy); TTL map; defensive JSON shape-check
//   EDGE CASES: gate off, empty prompt, :3100 down, non-200, empty body,
//     garbage body, oversize body, MCP error result, result.ok=false,
//     empty hits[], non-array hits, cache hit within TTL, cache expiry
//   FAILURE MODES: none escape — every branch returns null or a validated obj

import http from "node:http";
import { redactSecrets } from "./redact-secrets.mjs";

export const GATE_ENV = "PRISM_OBSIDIAN_LIVE";
export const DEFAULT_TIMEOUT_MS = 1500;
export const DEFAULT_TTL_MS = 30_000;
export const DEFAULT_MAX_HITS = 5;
// Hard ceiling on the bridge response we will JSON.parse. An adversarial or
// runaway server must never make us buffer megabytes inside a prompt hook.
export const MAX_RESPONSE_BYTES = 256 * 1024; // 256 KB
// Endpoint resolution mirrors mcp-http-bridge.mjs: honor MCP_HTTP_URL when set
// (so a chat whose bridge points elsewhere — or a test harness — reaches the
// same server), else the IPv4-explicit loopback default. "localhost" resolves
// to ::1 on modern Windows and yields ECONNREFUSED ::1, so 127.0.0.1 is forced.
export const DEFAULT_MCP_URL = "http://127.0.0.1:3100/mcp";
export function resolveMcpUrl() {
  const fromEnv = process.env.MCP_HTTP_URL;
  return typeof fromEnv === "string" && fromEnv.trim() !== "" ? fromEnv : DEFAULT_MCP_URL;
}

// Module-level default cache (one per Node process => one per hook invocation,
// which is exactly the "burst of prompts in one chat" window we want to dedupe
// across when the hook process is reused; tests inject their own Map).
const _defaultCache = new Map();

/**
 * Build the JSON-RPC tools/call payload for prism_session:obsidian_search.
 * Exported for test assertion of the contract we send the bridge.
 */
export function buildSearchRequest(query, id = "live-brain") {
  return {
    jsonrpc: "2.0",
    id,
    method: "tools/call",
    params: {
      name: "prism_session",
      arguments: { action: "obsidian_search", query: String(query ?? "") },
    },
  };
}

/**
 * Default HTTP fetcher: POST a JSON-RPC body to the :3100 /mcp endpoint with a
 * hard timeout. Resolves the raw response text (capped) or rejects on any
 * connection/timeout/oversize condition. The caller turns every rejection into
 * a null (fail-soft) — this fn only has to be honest about failure.
 *
 * @returns {Promise<string>} response body text (<= MAX_RESPONSE_BYTES)
 */
export function defaultBridgeFetch(body, { url = resolveMcpUrl(), timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  return new Promise((resolve, reject) => {
    let u;
    try { u = new URL(url); } catch (e) { reject(e); return; }
    const payload = JSON.stringify(body);
    const req = http.request(
      {
        hostname: u.hostname,
        port: u.port || 80,
        path: u.pathname + u.search,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // StreamableHTTPServerTransport requires both in Accept (mirrors the bridge).
          Accept: "application/json, text/event-stream",
          "Content-Length": Buffer.byteLength(payload),
        },
        timeout: timeoutMs,
      },
      (res) => {
        let data = "";
        let bytes = 0;
        let aborted = false;
        res.on("data", (chunk) => {
          if (aborted) return;
          bytes += chunk.length;
          if (bytes > MAX_RESPONSE_BYTES) {
            aborted = true;
            req.destroy();
            reject(new Error("oversize-response"));
            return;
          }
          data += chunk;
        });
        res.on("end", () => { if (!aborted) resolve(data); });
        res.on("error", reject);
      },
    );
    req.on("error", reject);
    req.on("timeout", () => { req.destroy(); reject(new Error(`timeout-${timeoutMs}ms`)); });
    req.write(payload);
    req.end();
  });
}

/**
 * Parse + validate a bridge response body into a normalized hit list, or null.
 * Tolerates the full MCP envelope:
 *   { result: { content: [ { type:"text", text: "<json string>" } ] } }
 * where the inner json string is { success, result: ObsidianResult } and the
 * ObsidianResult is { ok:true, data: [ {filename, score?} ] }.
 * ANY shape mismatch => null (fail-soft). Never throws.
 */
export function parseSearchResponse(text, { maxHits = DEFAULT_MAX_HITS } = {}) {
  if (typeof text !== "string" || text.trim() === "") return null;
  if (text.length > MAX_RESPONSE_BYTES) return null;
  let env;
  try { env = JSON.parse(text); } catch { return null; }
  if (!env || typeof env !== "object") return null;
  // A JSON-RPC error envelope => fail-soft (no live brain).
  if (env.error) return null;
  const content = env.result && env.result.content;
  if (!Array.isArray(content) || content.length === 0) return null;
  const textNode = content.find((c) => c && c.type === "text" && typeof c.text === "string");
  if (!textNode) return null;
  let inner;
  try { inner = JSON.parse(textNode.text); } catch { return null; }
  if (!inner || typeof inner !== "object") return null;
  const obsidian = inner.result;
  // ObsidianResult: { ok, data?, reason? }. Anything but ok===true => null.
  if (!obsidian || obsidian.ok !== true) return null;
  const arr = obsidian.data;
  if (!Array.isArray(arr) || arr.length === 0) return null;
  const hits = [];
  for (const h of arr) {
    if (hits.length >= maxHits) break;
    if (!h || typeof h !== "object") continue;
    const filename = redactSecrets(String(h.filename ?? "")).slice(0, 240);
    if (!filename) continue;
    const score = typeof h.score === "number" && Number.isFinite(h.score) ? h.score : undefined;
    hits.push(score === undefined ? { filename } : { filename, score });
  }
  if (hits.length === 0) return null;
  return { ok: true, hits };
}

/** Derive a stable cache key from the prompt (first 200 chars, normalized). */
export function cacheKeyForPrompt(prompt) {
  return String(prompt ?? "").trim().slice(0, 200).toLowerCase().replace(/\s+/g, " ");
}

/**
 * Fetch a small live-vault snippet relevant to `prompt`. Returns
 *   { ok:true, hits:[{filename, score?}], cached:boolean }  OR  null.
 *
 * null means "inject nothing" — the gate is off, :3100 is down, or there is no
 * usable result. The hook treats null as a silent skip (zero behavior change).
 *
 * @param {string} prompt — the user prompt (used as the vault search query).
 * @param {object} [opts]
 * @param {() => boolean} [opts.gate] — override the env gate (tests).
 * @param {(body:object, o:object)=>Promise<string>} [opts.fetcher] — HTTP fetcher (tests).
 * @param {Map} [opts.cache] — TTL cache map (tests).
 * @param {() => number} [opts.now] — clock (tests).
 * @param {number} [opts.timeoutMs]
 * @param {number} [opts.ttlMs]
 * @param {number} [opts.maxHits]
 * @param {string} [opts.url]
 */
export async function fetchLiveBrain(prompt, opts = {}) {
  const {
    gate = () => process.env[GATE_ENV] === "1",
    fetcher = defaultBridgeFetch,
    cache = _defaultCache,
    now = Date.now,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    ttlMs = DEFAULT_TTL_MS,
    maxHits = DEFAULT_MAX_HITS,
    url = resolveMcpUrl(),
  } = opts;

  try {
    // 1. GATE — default OFF => inject nothing, zero behavior change.
    if (!gate()) return null;

    // 2. Empty/whitespace prompt is not worth a vault round-trip.
    const key = cacheKeyForPrompt(prompt);
    if (key === "") return null;

    // 3. CACHE — short TTL; return a stable shape flagged cached:true.
    const hit = cache.get(key);
    if (hit && typeof hit.expires === "number" && hit.expires > now()) {
      // value may be null (negative cache) — preserve fail-soft, but never
      // dress a null as cached (a null cache entry just suppresses re-fetch).
      return hit.value === null ? null : { ...hit.value, cached: true };
    }

    // 4. FETCH over the bridge with a hard timeout.
    let body;
    try {
      const text = await fetcher(buildSearchRequest(key), { url, timeoutMs });
      body = parseSearchResponse(text, { maxHits });
    } catch {
      body = null; // :3100 down / timeout / oversize / connection error
    }

    // 5. Cache the result (positive OR negative) for the TTL window.
    cache.set(key, { value: body, expires: now() + ttlMs });
    return body === null ? null : { ...body, cached: false };
  } catch {
    // Last-resort guarantee: never throw out of a prompt hook.
    return null;
  }
}

/** Test/maintenance helper: clear the module-level default cache. */
export function _clearDefaultCache() {
  _defaultCache.clear();
}
