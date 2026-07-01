#!/usr/bin/env node
// tier: daemon
/**
 * master-index-daemon.mjs -- long-lived WARM master-index search service.
 *
 * THE GAP THIS CLOSES (FLEET-SEARCH-DAEMON-MS0, 2026-06-14, slot tango):
 *   The full search sidecar (state/shared/system-viz/system-graph-index.json,
 *   ~262MB) is built nightly off the 745MB system-graph.json, but it is REJECTED
 *   on every fleet search: master-index-search-lib rejects any sidecar larger
 *   than ~35% of the calling process's heap, and per-spawn hooks run at a 384MB
 *   heap cap (ceiling ~151MB < 262MB). So every fleet search silently degrades to
 *   the smaller 59MB architecture-graph -- the expensive full index is dead weight.
 *   Per-spawn hooks also re-parse the graph cold on EVERY spawn (their mtime cache
 *   only helps within one short-lived process).
 *
 *   This daemon is a SINGLE long-lived process with a generous heap that parses
 *   the full 262MB sidecar ONCE into master-index-search-lib's process-lifetime
 *   cache, then serves fast full-coverage keyword search over HTTP. Clients query
 *   it instead of re-parsing a giant index per spawn. On a 127GB Blackwell box a
 *   warm 262MB in-memory index is trivial -- the gap was utilization, not capacity.
 *
 * REUSE (R8): the search itself is master-index-search-lib's runMasterIndexSearch
 *   / runTribalSearch -- this daemon adds NO new search logic, only a warm
 *   long-lived host + an HTTP surface. The lib's mtime cache auto-reloads the
 *   index when the nightly rebuild lands; no restart needed.
 *
 * Endpoints (GET, JSON):
 *   /health           -> { status, uptimeSec, searchCount, lastSearchMs, indexWarm }
 *   /search?q=&k=5     -> { ok, source:"daemon", tokens, hits, ms }   (graph)
 *   /tribal?q=&k=5     -> { ok, source:"daemon", tokens, hits, ms }   (tribal corpus)
 *
 * Launch with a generous heap so the 262MB sidecar parses:
 *   node --max-old-space-size=2048 scripts/master-index-daemon.mjs
 * (the installer/supervisor sets this; a bare launch still runs but the lib will
 *  fall back to the 59MB graph if its heap is too small to accept the sidecar).
 *
 * Env knobs:
 *   PRISM_INDEX_DAEMON_PORT   listen port (default 3101)
 *   PRISM_INDEX_DAEMON_HOST   bind host  (default 127.0.0.1)
 *   PRISM_SIDECAR_MAX_BYTES   sidecar parse ceiling (this daemon raises it to 1GB
 *                             unless already set, so the lib accepts the 262MB sidecar)
 *   PRISM_INDEX_DAEMON_SELF   set to 1 in-process so the lib's daemon-aware path
 *                             (searchViaDaemon) never re-enters the daemon (anti-recursion)
 */

import http from "node:http";
import net from "node:net";
import { runMasterIndexSearch, runTribalSearch } from "./lib/master-index-search-lib.mjs";
import { emptyLatencyStats, recordSearchLatency, DEFAULT_SLOW_MS } from "./lib/daemon-latency-stats.mjs";

const PORT = parseInt(process.env.PRISM_INDEX_DAEMON_PORT || "3101", 10);
const HOST = process.env.PRISM_INDEX_DAEMON_HOST || "127.0.0.1";
const DEFAULT_K = 5;
const MAX_K = 50;
const ONE_GB = 1024 * 1024 * 1024;

// Anti-recursion: a client seam in the lib (searchViaDaemon) prefers this daemon.
// Mark THIS process so any in-process search the daemon runs goes straight to the
// lib's in-process path, never back out to the daemon (infinite loop).
process.env.PRISM_INDEX_DAEMON_SELF = "1";

// Raise the sidecar parse ceiling for THIS process so loadGraph accepts the
// ~262MB full sidecar. The daemon runs with a big --max-old-space-size (unlike
// the 384MB-capped per-spawn hooks). Respect an explicit operator override.
if (!process.env.PRISM_SIDECAR_MAX_BYTES) {
  process.env.PRISM_SIDECAR_MAX_BYTES = String(ONE_GB);
}

const _startedAt = Date.now();
let _searchCount = 0;
let _lastSearchMs = null;
let _indexWarm = false;
// SUBSTRATE-UTIL Gap 1 follow-up: per-search latency stats (max + slow-count) so the daemon's
// single-event-loop concurrency ceiling is MEASURABLE in /health (measure-first for the deferred
// worker-thread refactor). Updated only on real client searches, not the warm-up probe.
let _latency = emptyLatencyStats();

function jsonRes(res, code, obj) {
  try {
    const body = JSON.stringify(obj);
    res.writeHead(code, {
      "content-type": "application/json",
      "content-length": Buffer.byteLength(body),
    });
    res.end(body);
  } catch {
    try { res.writeHead(500); res.end('{"ok":false}'); } catch { /* socket gone */ }
  }
}

function clampK(raw) {
  const k = parseInt(raw, 10);
  if (!Number.isFinite(k)) return DEFAULT_K;
  return Math.max(1, Math.min(MAX_K, k));
}

function handleSearch(res, q, k, kind) {
  const t0 = Date.now();
  try {
    const fn = kind === "tribal" ? runTribalSearch : runMasterIndexSearch;
    const out = fn(q, { topK: k }) || { tokens: [], hits: [] };
    _lastSearchMs = Date.now() - t0;
    _searchCount += 1;
    _latency = recordSearchLatency(_latency, _lastSearchMs);
    _indexWarm = true;
    jsonRes(res, 200, { ok: true, source: "daemon", kind, ms: _lastSearchMs, tokens: out.tokens || [], hits: out.hits || [] });
  } catch (e) {
    // search must never crash the daemon (the lib's contract is search-returns-[],
    // but stay defensive against an unexpected throw)
    jsonRes(res, 500, { ok: false, error: (e && e.message) || "search-error" });
  }
}

const server = http.createServer((req, res) => {
  try {
    if (req.method !== "GET") return jsonRes(res, 405, { ok: false, error: "GET only" });
    const u = new URL(req.url, `http://${HOST}:${PORT}`);
    if (u.pathname === "/health") {
      return jsonRes(res, 200, {
        status: "healthy",
        service: "prism-master-index-daemon",
        pid: process.pid,
        uptimeSec: Math.round((Date.now() - _startedAt) / 1000),
        searchCount: _searchCount,
        lastSearchMs: _lastSearchMs,
        maxSearchMs: _latency.maxMs,
        slowSearchCount: _latency.slowCount,
        slowThresholdMs: DEFAULT_SLOW_MS,
        indexWarm: _indexWarm,
      });
    }
    if (u.pathname === "/search" || u.pathname === "/tribal") {
      const q = (u.searchParams.get("q") || "").trim();
      const k = clampK(u.searchParams.get("k") || DEFAULT_K);
      const kind = u.pathname === "/tribal" ? "tribal" : "graph";
      if (!q) return jsonRes(res, 200, { ok: true, source: "daemon", kind, tokens: [], hits: [] });
      return handleSearch(res, q, k, kind);
    }
    return jsonRes(res, 404, { ok: false, error: "not found" });
  } catch (e) {
    jsonRes(res, 500, { ok: false, error: (e && e.message) || "handler-error" });
  }
});

// Preflight + single-instance: if the port is already owned by a peer daemon,
// stand down cleanly (exit 0) -- exactly one daemon serves the fleet.
server.on("error", (e) => {
  if (e && e.code === "EADDRINUSE") {
    process.stderr.write(`[index-daemon] :${PORT} already owned by a peer daemon -- standing down (single instance).\n`);
    process.exit(0);
  }
  process.stderr.write(`[index-daemon] server error: ${(e && e.message) || e}\n`);
  process.exit(1);
});

// A search throw must never take the daemon down (it drops the fleet's warm index).
process.on("uncaughtException", (e) => {
  process.stderr.write(`[index-daemon] uncaughtException (kept alive): ${(e && e.message) || e}\n`);
});
process.on("unhandledRejection", (e) => {
  process.stderr.write(`[index-daemon] unhandledRejection (kept alive): ${(e && (e.message || e)) || e}\n`);
});
process.on("SIGINT", () => process.exit(0));
process.on("SIGTERM", () => process.exit(0));

server.listen(PORT, HOST, () => {
  process.stderr.write(`[index-daemon] listening on http://${HOST}:${PORT} (pid ${process.pid})\n`);
  // Warm the index: one real search loads the 262MB sidecar into the lib's
  // process-lifetime cache so the first client query is fast. Fail-soft.
  try {
    const t0 = Date.now();
    const out = runMasterIndexSearch("master index warm up probe", { topK: 1 });
    _indexWarm = true;
    _lastSearchMs = Date.now() - t0;
    process.stderr.write(`[index-daemon] index warm (${_lastSearchMs}ms, ${(out && out.hits && out.hits.length) || 0} hits on probe)\n`);
  } catch (e) {
    process.stderr.write(`[index-daemon] warm-up failed (non-fatal): ${(e && e.message) || e}\n`);
  }
});
