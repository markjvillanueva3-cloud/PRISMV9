// scripts/lib/embed-endpoint.mjs
// ------------------------------
// U-INDIA-EMBED-LANE (slot:india, 2026-07-01) -- dedicated-embed-lane endpoint
// resolution, shared by every /api/embeddings consumer in scripts/.
//
// THE PROBLEM (live-measured 2026-07-01): under fleet mining load the shared
// Ollama instance (:11434) starves new-model requests at the SCHEDULER level --
// a nomic-embed-text request (GPU or CPU-pinned) got HTTP 000 after 300s while
// qwen2.5-coder:32b served the miners. Result: the tribal-embed cron failed
// every 30 min (exit 3), the embed keepalive could never cold-recover (20s cap),
// and the memory-recall dense arm (2.5s cap) went permanently dark whenever the
// fleet was busy -- which is the standing overnight regime.
//
// THE FIX: a second, CPU-only `ollama serve` bound to 127.0.0.1:11435 with its
// own request queue (guardian: scripts/ollama-embed-lane.mjs). Live numbers on
// this box UNDER full fleet load: tags 68ms, warm embeds 0.16-0.83s (vs never
// served on :11434). This lib is the single place consumers resolve which
// endpoint to use: LANE when it answers, MAIN (:11434) otherwise -- so every
// consumer degrades to today's exact behavior when the lane is absent.
//
// CPU pinning is PER-REQUEST (`options.num_gpu: 0`), not serve-env: setting
// CUDA_VISIBLE_DEVICES=-1 on the serve process was empirically IGNORED on this
// box (Ollama discovers GPUs via NVML, which does not honor CVD) -- the model
// loaded with size_vram=323MB. A num_gpu:0 request reloads it CPU-side
// (size_vram=0, verified live). Every lane request therefore carries the pin
// via withLaneOptions(), so a bare request can never drag the lane back onto
// the contended GPU.
//
// Cross-process probe cache: hooks are a NEW process per prompt, so a module-
// level memo would re-probe every time. The verdict is cached in a tmpdir JSON
// sidecar with a short TTL -- a healthy lane costs one ~70ms probe per TTL
// window across ALL processes; a down lane costs one probe timeout per window
// instead of one per call. All sidecar IO is fail-soft.
//
// Env knobs:
//   PRISM_EMBED_LANE_URL        lane base url   (default http://127.0.0.1:11435)
//   PRISM_EMBED_LANE_DISABLE=1  kill switch -> always MAIN, zero probes
//   PRISM_EMBED_LANE_PROBE_MS   probe timeout   (default 1200)
//   PRISM_EMBED_LANE_PROBE_TTL_MS  verdict cache TTL (default 60000)
//   PRISM_OLLAMA_URL            main base url   (default http://127.0.0.1:11434)

import os from "node:os";
import path from "node:path";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";

export const MAIN_URL = process.env.PRISM_OLLAMA_URL || "http://127.0.0.1:11434";
export const LANE_URL = process.env.PRISM_EMBED_LANE_URL || "http://127.0.0.1:11435";
export const PROBE_TIMEOUT_MS = Number(process.env.PRISM_EMBED_LANE_PROBE_MS) || 1200;
export const PROBE_TTL_MS = Number(process.env.PRISM_EMBED_LANE_PROBE_TTL_MS) || 60_000;
export const PROBE_CACHE_PATH = path.join(os.tmpdir(), "prism-embed-lane-probe.json");
const SCHEMA_VERSION = 1;

export function laneDisabled(env = process.env) {
  return env.PRISM_EMBED_LANE_DISABLE === "1";
}

/**
 * Pure: misconfig guard -- PRISM_EMBED_LANE_URL pointed at the MAIN instance
 * would send num_gpu:0 pins + 60m keep_alive to the SHARED :11434 (CPU-reloads
 * nomic there). Treated as lane-disabled (scrutiny arm-B P2).
 */
export function laneMisconfigured() {
  return LANE_URL === MAIN_URL;
}

/**
 * Write a lane verdict into the cross-process sidecar OUT-OF-BAND (the
 * guardian calls this on warm success/failure). A lane that answers /api/tags
 * but cannot EMBED would otherwise stay cached laneUp:true and blackhole
 * consumers for a full TTL per window (scrutiny arm-B P1) -- the guardian's
 * warm-pin is the embed-capability probe, so its verdict outranks tags.
 */
export function recordLaneVerdict(laneUp, nowMs = Date.now(), writeImpl = writeFileSync) {
  writeVerdict(!!laneUp, nowMs, writeImpl);
}

/**
 * Run `attempt(url, laneFlag)` against the resolved endpoint; when the LANE
 * attempt fails (null/undefined result), retry ONCE against MAIN -- a broken
 * lane must degrade to today's :11434 behavior, never blackhole the consumer
 * (scrutiny arm-B P1). Non-lane attempts never retry (byte-identical legacy).
 * @param {{url: string, lane: boolean}} resolved from resolveEmbedUrl[Sync]
 * @param {(url: string, lane: boolean) => Promise<any>} attempt returns null on failure
 */
export async function withMainFallback(resolved, attempt) {
  const first = await attempt(resolved.url, resolved.lane);
  if (first != null || !resolved.lane) return first;
  return attempt(MAIN_URL, false);
}

/**
 * Pure: decorate an /api/embeddings body for the LANE -- pins the runner to
 * CPU (num_gpu: 0) preserving any caller options. Non-object bodies pass
 * through untouched (caller bug surfaces at Ollama, not masked here).
 * @param {object} body   request body ({model, prompt, ...})
 * @returns {object} a COPY with options.num_gpu = 0 (never mutates input)
 */
export function withLaneOptions(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return body;
  return { ...body, options: { ...(body.options && typeof body.options === "object" ? body.options : {}), num_gpu: 0 } };
}

/** Pure: is a cached probe verdict fresh at nowMs? Malformed -> not fresh. */
export function verdictFresh(cached, nowMs, ttlMs = PROBE_TTL_MS) {
  if (!cached || typeof cached !== "object") return false;
  if (cached.schemaVersion !== SCHEMA_VERSION) return false;
  const at = Number(cached.at);
  if (!Number.isFinite(at)) return false;
  return (nowMs - at) < ttlMs && typeof cached.laneUp === "boolean";
}

function readVerdict(readImpl = readFileSync, existsImpl = existsSync) {
  try {
    if (!existsImpl(PROBE_CACHE_PATH)) return null;
    return JSON.parse(readImpl(PROBE_CACHE_PATH, "utf8"));
  } catch { return null; } // corrupt/racing sidecar -> treat as no cache
}

function writeVerdict(laneUp, nowMs, writeImpl = writeFileSync) {
  try {
    writeImpl(PROBE_CACHE_PATH, JSON.stringify({ schemaVersion: SCHEMA_VERSION, laneUp, at: nowMs }), "utf8");
  } catch { /* fail-soft: next process just re-probes */ }
}

/**
 * Async lane probe + resolution. Returns { url, lane } where lane=true means
 * requests should be decorated via withLaneOptions().
 * @param {object} [opts] { fetchImpl, timeoutMs, nowMs, readImpl, writeImpl, existsImpl, env }
 * @returns {Promise<{url: string, lane: boolean}>}
 */
export async function resolveEmbedUrl(opts = {}) {
  const env = opts.env ?? process.env;
  if (laneDisabled(env) || laneMisconfigured()) return { url: MAIN_URL, lane: false };
  const nowMs = Number.isFinite(opts.nowMs) ? opts.nowMs : Date.now();
  const cached = readVerdict(opts.readImpl, opts.existsImpl);
  if (verdictFresh(cached, nowMs)) {
    return cached.laneUp ? { url: LANE_URL, lane: true } : { url: MAIN_URL, lane: false };
  }
  const fetchImpl = opts.fetchImpl ?? fetch;
  const timeoutMs = opts.timeoutMs ?? PROBE_TIMEOUT_MS;
  let laneUp = false;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetchImpl(`${LANE_URL}/api/tags`, { signal: ctrl.signal });
      laneUp = !!res && res.ok === true;
    } finally { clearTimeout(timer); }
  } catch { laneUp = false; }
  writeVerdict(laneUp, nowMs, opts.writeImpl);
  return laneUp ? { url: LANE_URL, lane: true } : { url: MAIN_URL, lane: false };
}

/**
 * Sync resolution for latency-capped SYNC callers (the memory-recall hook path
 * embeds via curl execFileSync -- node fetch is unreliable under parallel-
 * localhost contention per CLAUDE.md). Same sidecar cache, curl tags probe.
 * @param {object} [opts] { execImpl, timeoutMs, nowMs, readImpl, writeImpl, existsImpl, env }
 * @returns {{url: string, lane: boolean}}
 */
export function resolveEmbedUrlSync(opts = {}) {
  const env = opts.env ?? process.env;
  if (laneDisabled(env) || laneMisconfigured()) return { url: MAIN_URL, lane: false };
  const nowMs = Number.isFinite(opts.nowMs) ? opts.nowMs : Date.now();
  const cached = readVerdict(opts.readImpl, opts.existsImpl);
  if (verdictFresh(cached, nowMs)) {
    return cached.laneUp ? { url: LANE_URL, lane: true } : { url: MAIN_URL, lane: false };
  }
  const execImpl = opts.execImpl ?? execFileSync;
  const timeoutMs = opts.timeoutMs ?? PROBE_TIMEOUT_MS;
  const curlMaxSec = Math.max(1, Math.ceil(timeoutMs / 1000));
  let laneUp = false;
  try {
    // -f: non-2xx -> exit non-zero -> catch -> laneUp stays false.
    execImpl("curl", ["-fsS", "--max-time", String(curlMaxSec), `${LANE_URL}/api/tags`],
      { timeout: curlMaxSec * 1000 + 500, encoding: "utf8", maxBuffer: 1024 * 1024, windowsHide: true });
    laneUp = true;
  } catch { laneUp = false; }
  writeVerdict(laneUp, nowMs, opts.writeImpl);
  return laneUp ? { url: LANE_URL, lane: true } : { url: MAIN_URL, lane: false };
}
