#!/usr/bin/env node
/**
 * mcp-http-bridge.mjs - Stdio-to-HTTP MCP Bridge with Request Queue + self-heal
 *
 * Solves the multi-chat MCP contention problem:
 * - Each Claude chat connects via stdio to THIS bridge
 * - Bridge forwards requests to a single shared HTTP MCP server
 * - Request queue prevents concurrent tool call collisions
 * - Connection pooling keeps HTTP overhead minimal
 *
 * RELIABILITY (2026-05-22, MCP-CONNECTIVITY-FIX, slot lima):
 * The bridge no longer hard-fails when the :3100 server is down or cold-
 * starting. Three defenses keep `prism` connected:
 *   1. SELF-HEAL    - if :3100 is unreachable, the bridge spawns the
 *      supervisor (mcp-server-supervisor.mjs) detached. The supervisor's
 *      O_EXCL PID lock makes concurrent spawns from N bridges safe (losers
 *      exit immediately). No scheduled task or elevation required for this.
 *   2. RETRY        - a request that fails with a connection-class error
 *      (ECONNREFUSED / ECONNRESET / socket hang up / EPIPE) is retried with
 *      backoff instead of being turned into a JSON-RPC error.
 *   3. RETRY BUDGETS - BOTH the `initialize` handshake AND every regular request
 *      get a retry budget that outlasts the server's ~50s cold boot / OOM-restart:
 *      initialize (PRISM_MCP_INIT_RETRY_MS, default 90s) and requests
 *      (PRISM_MCP_REQUEST_RETRY_MS, default 75s). A failed forward at handshake OR
 *      mid-session is what makes a chat drop `prism` for its whole session, so
 *      keeping BOTH budgets > the boot window is what keeps chats connected through
 *      a restart (MCP-DISCONNECT-FIX, golf 2026-06-17 - the original 15s request
 *      budget was shorter than the boot). Both stay under the .mcp.json
 *      MCP_TIMEOUT=120000 per-call ceiling so a retried call still returns in-window.
 *
 * Usage:
 *   1. Start PRISM MCP server in HTTP mode: TRANSPORT=http node dist/index.js
 *      (or just let this bridge spawn the supervisor on demand).
 *   2. Configure Claude to use this bridge instead of direct stdio.
 *
 * Architecture:
 *   Claude Chat 1 --stdio--+
 *   Claude Chat 2 --stdio--+--> mcp-http-bridge --HTTP--> PRISM MCP Server
 *   Claude Chat 3 --stdio--+   (request queue, retry)    (single instance)
 */

import { createInterface } from "readline";
import http from "http";
import https from "https";
import { randomUUID } from "crypto";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { filterToolList, resolveDomainsFromEnv } from "./mcp-tool-domains.mjs";
// MCP-CLIENT-ENFORCE-MS0 (2026-06-13, slot tango): per-slot bridge liveness
// sentinel. Lets mcp-connectivity-check.mjs detect THIS chat losing its bridge
// (silent disconnect while :3100 stays healthy). All calls are fail-soft.
import {
  resolveSlotName,
  writeSentinel,
  heartbeatSentinel,
  removeSentinel,
} from "../../scripts/lib/mcp-bridge-liveness.mjs";

// Configuration
// 127.0.0.1 explicit - daemon binds IPv4, "localhost" resolves to ::1 on
// modern Windows/Node and triggers ECONNREFUSED ::1:3100.
const MCP_HTTP_URL = process.env.MCP_HTTP_URL || "http://127.0.0.1:3100/mcp";
const MAX_CONCURRENT = parseInt(process.env.MCP_MAX_CONCURRENT || "3", 10);
const REQUEST_TIMEOUT = parseInt(process.env.MCP_TIMEOUT || "120000", 10);
const QUEUE_FILE = "H:/prism/.claude/cache/mcp-request-queue.json";
const LOG_FILE = "H:/prism/.claude/cache/mcp-bridge.log";
// Liveness-sentinel heartbeat cadence. 20s pairs with the reader's 90s stale
// threshold (>=4 missed beats = dead). Env-overridable for tests / tuning.
const SENTINEL_HEARTBEAT_MS = parseInt(process.env.PRISM_MCP_BRIDGE_HEARTBEAT_MS || "20000", 10);

// Tier-1 MCP tool-domain filter (MCP-CONSOLIDATION-MS0 / U-MCP-TOOL-DOMAINS, alpha 2026-05-28).
// Resolved ONCE at startup from MCP_TOOL_DOMAINS (or PRISM_SLOT_GALAXY fallback). Empty
// string => no filtering at all (fail-open / pre-Tier-1 behavior). Nothing sets these env
// vars until the per-slot launcher rollout, so this is a NO-OP today — every chat still
// gets all ~90 prism_* dispatchers via the fail-open path.
const TOOL_DOMAINS = resolveDomainsFromEnv();

// Self-heal config
const SUPERVISOR_SCRIPT =
  process.env.PRISM_MCP_SUPERVISOR ||
  "H:/prism/scripts/mcp-server-supervisor.mjs";
// Retry budgets: BOTH must outlast a server restart / cold-boot window so a request
// landing while :3100 is briefly down RIDES IT OUT instead of erroring.
// MCP-RETRY-BUDGET-HARDEN (golf 2026-06-17): a server cold boot / restart takes ~50s
// (mcp-server-supervisor.mjs "~50s cold boot"). The OLD request budget (15s) was far
// shorter, so a tool call landing in a restart window exhausted 15s, THREW a JSON-RPC
// connection error, and Claude Code could then drop `prism` for the session. Raising
// it is DEFENSE-IN-DEPTH for that (rare) real restart -- it is NOT the primary cause
// of reported "chats won't stay connected" pain. That pain was verified (slot:bravo,
// 3-of-3) to be a FALSE fleet-reconnect broadcast on a HEALTHY server (0 transient
// bridges is the normal resting state, not an outage), fixed separately in 80ce407d2c
// + U-MCP-FALSEPOS-LIVEPROBE; see reference_mcp_kickoff_falsepos_liveprobe_fix_2026_06_17.
// NOTE: the one observed supervisor child-exit (code 0xFFFFFFFF / signal null) is a
// Windows TerminateProcess/force-kill signature, NOT a confirmed V8 OOM (no FATAL/heap
// marker in the logs) -- do not assume an OOM leak from that code alone. Both budgets
// stay UNDER the .mcp.json MCP_TIMEOUT=120000 per-call ceiling so a retried-then-
// succeeded call still returns in-window:
//   init    90s  -> covers a slow startup when initialize lands mid-boot
//   request 75s  -> covers a mid-session restart without dropping the connection
// Env-overridable; changing the DEFAULTS fixes every slot's bridge on next respawn.
const INIT_RETRY_BUDGET_MS = parseInt(process.env.PRISM_MCP_INIT_RETRY_MS || "90000", 10);
const REQUEST_RETRY_BUDGET_MS = parseInt(process.env.PRISM_MCP_REQUEST_RETRY_MS || "75000", 10);
// Do not let one bridge spawn the supervisor more than once per this window.
const SUPERVISOR_SPAWN_THROTTLE_MS = parseInt(process.env.PRISM_MCP_SUPERVISOR_THROTTLE_MS || "15000", 10);
const SELF_HEAL = process.env.PRISM_MCP_BRIDGE_SELF_HEAL !== "0";
// MCP-READINESS (alpha 2026-05-28 — U-MCPR01): /ready is stricter than /health.
// Bridge waits for /ready to return 200 before forwarding the first MCP message,
// closing the cold-start race where /health was 200 but a downstream lazy-load
// import (e.g. toolpathDispatcher) crashed the server on first tool call —
// taking that chat's `prism` connection down for the whole session. Budget
// matches INIT_RETRY_BUDGET_MS for symmetry (both 90s). NOTE: the LIVE prism value
// is pinned by .mcp.json (PRISM_MCP_READY_BUDGET_MS=120000), so this 90s default
// only applies to a bridge launched WITHOUT that env -- the init/request raises are
// what change live behavior. Knob: PRISM_MCP_READY_BUDGET_MS.
// PRISM_MCP_WAIT_FOR_READY=0 disables (fail-open if /ready route is missing).
const READY_BUDGET_MS = parseInt(process.env.PRISM_MCP_READY_BUDGET_MS || "90000", 10);
const READY_POLL_INTERVAL_MS = parseInt(process.env.PRISM_MCP_READY_POLL_MS || "2000", 10);
const WAIT_FOR_READY = process.env.PRISM_MCP_WAIT_FOR_READY !== "0";
const READY_URL = (() => {
  try {
    const u = new URL(MCP_HTTP_URL);
    return `${u.protocol}//${u.hostname}:${u.port || (u.protocol === "https:" ? 443 : 80)}/ready`;
  } catch { return null; }
})();

// LOCAL-INIT-ANSWER (MCP-COLD-CONNECT-FIX, slot:golf 2026-07-02).
// The MCP `initialize` handshake is a STATIC capabilities exchange that does not need the
// backend. The prior flow (`await waitForReady()` BEFORE reading stdin, then forwarding
// initialize) meant a COLD backend that booted slower than Claude Code's ~30s client-connect
// timeout dropped `prism` for the whole session -- the recurring "prism down at session start"
// (hermes, a direct-stdio server with no backend-readiness gate, always connected; prism did
// not). Fix: when the backend is not-ready at initialize time, answer IMMEDIATELY from the
// last-known-good REAL init response cached on disk (byte-identical replay), and warm the
// backend in the background so tool calls are ready by the time the client sends tools/list.
// The WARM path is UNCHANGED (forward + refresh the cache). Disable: PRISM_MCP_LOCAL_INIT=0.
// This is the next additive layer over the retry-budget (forward) + client-enforce (detect)
// hardenings -- not a duplicate: neither addresses the initialize-vs-waitForReady startup race.
const LOCAL_INIT_ENABLED = process.env.PRISM_MCP_LOCAL_INIT !== "0";
// Per-port cache path; PRISM_MCP_INIT_CACHE_FILE overrides it (used by the integration test to
// point at a temp file, and available as an operator override).
const INIT_CACHE_FILE = process.env.PRISM_MCP_INIT_CACHE_FILE || (() => {
  try { const u = new URL(MCP_HTTP_URL); return `H:/prism/.claude/cache/mcp-init-cache-${u.port || "80"}.json`; }
  catch { return "H:/prism/.claude/cache/mcp-init-cache.json"; }
})();

/** True if `response` is a valid, cacheable MCP initialize result (real serverInfo, no error). Pure. */
export function isCacheableInitResponse(response) {
  return !!(response && !response.error && response.result &&
    response.result.serverInfo && typeof response.result.serverInfo.name === "string");
}

/** Build a client-facing initialize response from a cached backend response. Pure.
 *  Replays the cached (real) result verbatim, overriding ONLY the JSON-RPC id to match THIS
 *  client's request -- so the local answer is byte-identical to a live handshake. Returns null
 *  if the cache is unusable (the caller then falls back to forwarding).
 *  LIMITATION (accepted): the replayed result includes the cached `protocolVersion`, not the one
 *  THIS client requested. On a single co-versioned host this matches; across a client protocol
 *  bump while the cache lags, a cold-start answer could echo a stale version. Bounded + self-heals
 *  on the first warm handshake (which refreshes the cache), and tools/list is always forwarded
 *  live so no tool is ever lost. Strictly better than the prior behavior (a cold backend DROPPED
 *  prism entirely). */
export function buildInitResponseFromCache(cached, request) {
  if (!isCacheableInitResponse(cached)) return null;
  return { jsonrpc: "2.0", id: (request && request.id !== undefined) ? request.id : null, result: cached.result };
}

/** Read the cached init response (id-less {jsonrpc,result}); null if absent/corrupt. Impure.
 *  `file` is injectable for tests (defaults to the live per-port cache path). */
export function readCachedInit(file = INIT_CACHE_FILE) {
  try {
    if (!fs.existsSync(file)) return null;
    const j = JSON.parse(fs.readFileSync(file, "utf8"));
    return isCacheableInitResponse(j) ? j : null;
  } catch { return null; }
}

/** Atomically cache a live init response (strips the per-request id). Best-effort. Impure.
 *  `file` is injectable for tests (defaults to the live per-port cache path). */
export function writeCachedInit(response, file = INIT_CACHE_FILE) {
  try {
    if (!isCacheableInitResponse(response)) return;
    const dir = path.dirname(file);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const tmp = `${file}.tmp-${process.pid}`;
    try {
      fs.writeFileSync(tmp, JSON.stringify({ jsonrpc: "2.0", result: response.result }), "utf8");
      fs.renameSync(tmp, file);
    } catch (e) {
      // Clean up the pid-tmp on a rename failure (e.g. a Windows sharing violation) so it does
      // not accumulate in .claude/cache/ across chats -- scrutiny arm C P2.
      try { fs.unlinkSync(tmp); } catch { /* nothing to clean */ }
      throw e;
    }
  } catch { /* cache is best-effort -- never block the handshake */ }
}

// Request queue
const requestQueue = [];
let activeRequests = 0;
const pendingResponses = new Map();
let lastSupervisorSpawn = 0;

// Bridge identity for this instance
const bridgeId = `bridge-${process.pid}-${Date.now().toString(36)}`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function log(level, msg, data = {}) {
  const entry = {
    ts: new Date().toISOString(),
    level,
    bridge: bridgeId,
    msg,
    ...data
  };
  try {
    fs.appendFileSync(LOG_FILE, JSON.stringify(entry) + "\n");
  } catch {}
  if (level === "error") {
    process.stderr.write(`[mcp-bridge] ${msg}\n`);
  }
}

function updateQueueState() {
  try {
    fs.mkdirSync(path.dirname(QUEUE_FILE), { recursive: true });
    fs.writeFileSync(QUEUE_FILE, JSON.stringify({
      bridgeId,
      activeRequests,
      queueLength: requestQueue.length,
      timestamp: Date.now()
    }));
  } catch {}
}

/**
 * True when the error means "the server is not there" (vs a genuine
 * application error or a slow-but-alive server). Only connection-class
 * failures are worth retrying.
 */
function isConnectionError(err) {
  if (!err) return false;
  const code = err.code || "";
  if (["ECONNREFUSED", "ECONNRESET", "ECONNABORTED", "EPIPE", "ENOTFOUND", "EHOSTUNREACH", "ENETUNREACH"].includes(code)) {
    return true;
  }
  const m = String(err.message || "");
  // Node surfaces a mid-flight server death as "socket hang up"; a server
  // that crashed while replying yields an empty body -> "Invalid JSON
  // response: " with nothing after the colon.
  if (/socket hang up/i.test(m)) return true;
  if (/^Invalid JSON response:\s*$/.test(m)) return true;
  return false;
}

/**
 * Spawn the MCP server supervisor, detached. Safe to call from many bridges
 * concurrently: the supervisor holds an O_EXCL PID lock, so all but one
 * spawned supervisor exits immediately. Throttled per-bridge.
 */
function ensureServerStarted(reason) {
  if (!SELF_HEAL) return;
  const now = Date.now();
  if (now - lastSupervisorSpawn < SUPERVISOR_SPAWN_THROTTLE_MS) return;
  lastSupervisorSpawn = now;
  try {
    if (!fs.existsSync(SUPERVISOR_SCRIPT)) {
      log("error", "Supervisor script not found - cannot self-heal", { supervisor: SUPERVISOR_SCRIPT });
      return;
    }
    const child = spawn(process.execPath, [SUPERVISOR_SCRIPT], {
      detached: true,
      stdio: "ignore",
      windowsHide: true,
    });
    child.unref();
    log("info", "Spawned MCP supervisor (self-heal)", { supervisor: SUPERVISOR_SCRIPT, reason });
  } catch (e) {
    log("error", "Failed to spawn supervisor", { error: e.message });
  }
}

/**
 * Forward a JSON-RPC request to the HTTP MCP server (single attempt).
 * Resolves `null` on an empty body (valid for a notification).
 */
async function forwardToHttp(jsonRpcRequest) {
  return new Promise((resolve, reject) => {
    const url = new URL(MCP_HTTP_URL);
    const isHttps = url.protocol === "https:";
    const client = isHttps ? https : http;

    const body = JSON.stringify(jsonRpcRequest);

    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // StreamableHTTPServerTransport requires both content types in Accept.
        "Accept": "application/json, text/event-stream",
        "Content-Length": Buffer.byteLength(body),
        "X-Bridge-Id": bridgeId,
        "X-Request-Id": jsonRpcRequest.id || randomUUID()
      },
      timeout: REQUEST_TIMEOUT
    };

    const req = client.request(options, (res) => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => {
        // Empty body is valid (notification / 202 Accepted) -> resolve null.
        if (data.trim() === "") {
          resolve(null);
          return;
        }
        try {
          const response = JSON.parse(data);
          resolve(response);
        } catch (e) {
          reject(new Error(`Invalid JSON response: ${data.slice(0, 200)}`));
        }
      });
    });

    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error(`Request timeout after ${REQUEST_TIMEOUT}ms`));
    });

    req.write(body);
    req.end();
  });
}

/**
 * Forward with retry. Connection-class failures trigger: self-heal spawn +
 * backoff + retry, until the per-method budget is exhausted. `initialize`
 * gets a long budget so the MCP handshake outlasts a server cold start.
 */
async function forwardWithRetry(request) {
  const isInit = request.method === "initialize";
  const budget = isInit ? INIT_RETRY_BUDGET_MS : REQUEST_RETRY_BUDGET_MS;
  const deadline = Date.now() + budget;
  let attempt = 0;
  let lastErr;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    attempt++;
    try {
      return await forwardToHttp(request);
    } catch (err) {
      lastErr = err;
      if (!isConnectionError(err)) {
        // Genuine app error or a wedged-but-alive server - do not retry.
        throw err;
      }
      if (Date.now() >= deadline) break;
      ensureServerStarted(`${request.method} got ${err.code || err.message}`);
      const backoff = Math.min(3000, 400 * attempt);
      log("warn", "Forward failed (server down) - retrying", {
        method: request.method,
        id: request.id,
        attempt,
        budgetRemainingMs: Math.max(0, deadline - Date.now()),
        error: err.message,
      });
      await sleep(backoff);
    }
  }
  log("error", "Retry budget exhausted", {
    method: request.method,
    id: request.id,
    attempts: attempt,
    error: lastErr && lastErr.message,
  });
  throw lastErr || new Error("Retry budget exhausted");
}

/**
 * Process the next request in the queue
 */
async function processQueue() {
  if (activeRequests >= MAX_CONCURRENT || requestQueue.length === 0) {
    return;
  }

  const { request, resolve, reject, startTime } = requestQueue.shift();
  activeRequests++;
  updateQueueState();

  const queueWait = Date.now() - startTime;
  log("info", "Processing request", {
    method: request.method,
    id: request.id,
    queueWait,
    active: activeRequests,
    queued: requestQueue.length
  });

  try {
    const response = await forwardWithRetry(request);
    resolve(response);
  } catch (error) {
    log("error", "Request failed", {
      method: request.method,
      id: request.id,
      error: error.message
    });

    // Return JSON-RPC error response
    resolve({
      jsonrpc: "2.0",
      id: request.id,
      error: {
        code: -32603,
        message: `Bridge error: ${error.message}`
      }
    });
  } finally {
    activeRequests--;
    updateQueueState();
    // Process next in queue
    setImmediate(processQueue);
  }
}

/**
 * Queue a request and return a promise for its response
 */
function queueRequest(request) {
  return new Promise((resolve, reject) => {
    requestQueue.push({
      request,
      resolve,
      reject,
      startTime: Date.now()
    });

    log("info", "Request queued", {
      method: request.method,
      id: request.id,
      queueLength: requestQueue.length
    });

    updateQueueState();
    processQueue();
  });
}

/**
 * Handle incoming stdio messages (JSON-RPC from Claude)
 */
async function handleStdioMessage(line) {
  let request;
  try {
    request = JSON.parse(line);
  } catch (e) {
    log("error", "Invalid JSON from stdin", { line: line.slice(0, 100) });
    return;
  }

  // Handle JSON-RPC request or notification.
  // Spec: a notification has no id field; server returns nothing, client
  // expects nothing. Echoing a synthetic response back to Claude for a
  // notification corrupts its initialization state.
  if (!request.method) return;
  const isNotification = request.id === undefined || request.id === null;
  if (isNotification) {
    queueRequest(request).catch((err) => {
      log("debug", "Notification forwarded (response suppressed)", {
        method: request.method,
        info: err && err.message ? err.message : String(err),
      });
    });
    return;
  }
  // LOCAL-INIT-ANSWER: when the backend is cold at initialize time, answer instantly from the
  // cached real init response so the client connects within its ~30s timeout instead of blocking
  // on a slow backend boot. probeReady is a short strict check; when it passes we forward as
  // normal (WARM path unchanged) and refresh the cache below. This path is gated ONLY by
  // PRISM_MCP_LOCAL_INIT (independent of PRISM_MCP_WAIT_FOR_READY) -- it is fail-safe on a
  // no-/ready server (probeReady miss -> cache-answer, tools/list still forwards live), so we do
  // not want WAIT_FOR_READY=0 to reintroduce the cold-connect drop. Disable: PRISM_MCP_LOCAL_INIT=0.
  if (LOCAL_INIT_ENABLED && request.method === "initialize") {
    const ready = await probeReady(1500);
    if (!ready) {
      const local = buildInitResponseFromCache(readCachedInit(), request);
      if (local) {
        ensureServerStarted("local-init cold-answer (warming backend for tool calls)");
        process.stdout.write(JSON.stringify(local) + "\n");
        log("info", "initialize answered from cache (backend cold) -- client connected; backend warming", {
          id: request.id, serverName: local.result.serverInfo.name,
        });
        return;
      }
      // No cache yet (first-ever run) -> fall through to the normal forward-with-retry path.
    }
  }

  const response = await queueRequest(request);
  // Keep the init cache byte-current: refresh it whenever a live initialize response comes back.
  if (request.method === "initialize" && isCacheableInitResponse(response)) {
    writeCachedInit(response);
  }
  // Tier-1 domain filter: narrow tools/list to this chat's galaxy domains so a chat
  // carries only its domain's dispatcher descriptors (context-tax win) instead of all
  // ~90. FAIL-OPEN: skipped entirely when TOOL_DOMAINS is empty, and any error inside
  // the filter leaves the response untouched — a chat never loses a tool to a filter bug.
  if (
    TOOL_DOMAINS &&
    request.method === "tools/list" &&
    response && response.result && Array.isArray(response.result.tools)
  ) {
    try {
      const before = response.result.tools.length;
      response.result.tools = filterToolList(response.result.tools, TOOL_DOMAINS);
      if (response.result.tools.length !== before) {
        log("info", "tools/list filtered by domain", {
          domains: TOOL_DOMAINS,
          before,
          after: response.result.tools.length,
        });
      }
    } catch (e) {
      log("error", "tools/list filter failed - passing unfiltered (fail-open)", {
        error: e && e.message,
      });
    }
  }
  // Some daemons may return null for malformed input; guard the stdout write.
  if (response !== null && response !== undefined) {
    process.stdout.write(JSON.stringify(response) + "\n");
  }
}

/**
 * Check if the HTTP MCP server is running
 */
async function checkServer() {
  return new Promise((resolve) => {
    const url = new URL(MCP_HTTP_URL);
    const client = url.protocol === "https:" ? https : http;

    const req = client.request({
      hostname: url.hostname,
      port: url.port || (url.protocol === "https:" ? 443 : 80),
      path: "/health",
      method: "GET",
      timeout: 5000
    }, (res) => {
      // Drain so the socket frees.
      res.on("data", () => {});
      res.on("end", () => {});
      resolve(res.statusCode < 500);
    });

    req.on("error", () => resolve(false));
    req.on("timeout", () => { req.destroy(); resolve(false); });
    req.end();
  });
}

/**
 * Probe /ready (the stricter readiness endpoint added 2026-05-28 U-MCPR01).
 * Returns true on 200, false on anything else (timeout, error, 503).
 *
 * Difference from checkServer():
 *   - /health = port bound + heap < 3.5GB + registries non-empty
 *   - /ready  = /health PLUS canary lazy-import of toolpathDispatcher succeeded
 *
 * /ready returning 200 proves the ESM/JSON-import bug class (the BUG-1/BUG-2
 * from reference_mcp_server_3100_crash_fix_2026_05_22) cannot crash the
 * server on the next tool call. Polling /ready before forwarding the first
 * MCP message closes the cold-start initialize race that the existing
 * INIT_RETRY_BUDGET_MS retry only partially solves.
 */
function probeReady(timeoutMs = 3000) {
  return new Promise((resolve) => {
    if (!READY_URL) { resolve(false); return; }
    const url = new URL(READY_URL);
    const client = url.protocol === "https:" ? https : http;
    const req = client.request({
      hostname: url.hostname,
      port: parseInt(url.port, 10),
      path: url.pathname,
      method: "GET",
      timeout: timeoutMs,
    }, (res) => {
      res.on("data", () => {});
      res.on("end", () => resolve(res.statusCode === 200));
    });
    req.on("error", () => resolve(false));
    req.on("timeout", () => { req.destroy(); resolve(false); });
    req.end();
  });
}

/**
 * Block until /ready returns 200 or the budget elapses. Fail-open: if the
 * budget expires we proceed anyway and let forwardWithRetry's connection
 * retry catch any remaining cold-start fallout. Logs progress every poll
 * so a tail -f of mcp-bridge.log shows the wait state.
 */
async function waitForReady() {
  if (!WAIT_FOR_READY) { log("info", "waitForReady disabled via env"); return; }
  if (!READY_URL) { log("warn", "/ready URL could not be derived — skipping wait"); return; }
  const deadline = Date.now() + READY_BUDGET_MS;
  let poll = 0;
  while (Date.now() < deadline) {
    poll++;
    const ok = await probeReady();
    if (ok) {
      log("info", "Server ready — proceeding to accept stdio", { polls: poll });
      return;
    }
    const remainingMs = Math.max(0, deadline - Date.now());
    if (poll === 1 || poll % 5 === 0) {
      log("info", "Waiting for /ready 200", { poll, remainingMs, readyUrl: READY_URL });
    }
    if (remainingMs <= 0) break;
    await sleep(Math.min(READY_POLL_INTERVAL_MS, remainingMs));
  }
  // Fail-open: log + proceed. forwardWithRetry's retry budget is the safety net.
  log("warn", "waitForReady timed out — proceeding fail-open (forward retry will catch residual cold-start errors)", {
    budgetMs: READY_BUDGET_MS,
    polls: poll,
  });
}

async function main() {
  log("info", "Bridge starting", {
    pid: process.pid,
    mcpUrl: MCP_HTTP_URL,
    maxConcurrent: MAX_CONCURRENT,
    selfHeal: SELF_HEAL,
    waitForReady: WAIT_FOR_READY,
    readyBudgetMs: READY_BUDGET_MS,
    // U-MCP-ROLLOUT (alpha 2026-05-28): log cwd + resolved domains so the next slot
    // launch empirically confirms whether the bridge inherits the slot-worktree cwd
    // (the no-env activation premise). cwd=H:/prism-slot-<name> => filter active.
    cwd: process.cwd(),
    toolDomains: TOOL_DOMAINS || "(none/all - fail-open)",
  });

  // MCP-CLIENT-ENFORCE-MS0 (2026-06-13, slot tango): publish a per-slot liveness
  // sentinel + heartbeat so mcp-connectivity-check.mjs can answer the question the
  // daemon /health probe cannot -- "is THIS chat's bridge alive?". The whole block
  // is best-effort: any sentinel error is swallowed and NEVER affects the bridge.
  try {
    const liveSlot = resolveSlotName(process.env, process.cwd());
    if (liveSlot) {
      writeSentinel(liveSlot, { pid: process.pid, cwd: process.cwd(), mcpUrl: MCP_HTTP_URL });
      log("info", "Liveness sentinel published", { slot: liveSlot, pid: process.pid });
      const beat = setInterval(() => {
        try { heartbeatSentinel(liveSlot, { pid: process.pid }); } catch { /* fail-soft */ }
      }, SENTINEL_HEARTBEAT_MS);
      if (beat.unref) beat.unref(); // never hold the process open for the heartbeat
      // Every exit path below (rl-close / SIGINT / SIGTERM) calls process.exit(),
      // which fires 'exit' synchronously. removeSentinel is pid-guarded so a
      // fast-respawn successor's sentinel is never wiped by this exiting bridge.
      // (A hard SIGKILL skips 'exit' -> the stale sentinel is then caught by the
      //  reader's pid-dead/stale-heartbeat verdict, so detection still holds.)
      process.on("exit", () => {
        try { removeSentinel(liveSlot, process.pid); } catch { /* fail-soft */ }
      });
    }
  } catch { /* sentinel is best-effort -- never block bridge startup */ }

  // Check if MCP server is running. If it is not, proactively spawn the
  // supervisor now so it has a head start while Claude sends `initialize`.
  // The generous initialize retry budget covers the remaining cold start.
  const serverUp = await checkServer();
  if (!serverUp) {
    log("error", "MCP HTTP server not responding - self-healing", { url: MCP_HTTP_URL });
    process.stderr.write(`[mcp-bridge] MCP server at ${MCP_HTTP_URL} down - spawning supervisor, requests will retry.\n`);
    ensureServerStarted("startup health check failed");
  }

  // Set up stdin readline interface FIRST so the client's `initialize` is read WITHOUT waiting
  // for the backend. Previously main() did `await waitForReady()` here, which blocked stdin
  // reading for up to READY_BUDGET_MS (90-120s) -- so a cold backend that booted slower than
  // Claude Code's ~30s client-connect timeout dropped `prism` for the whole session. The
  // per-initialize readiness probe + LOCAL-INIT-ANSWER cache-reply + per-request retry budgets
  // now cover a cold backend without blocking the handshake. U-MCPR01's lazy-load-crash guard is
  // preserved ONLY on the cache-HIT path (probeReady miss -> cache-answer, never forwards to a
  // not-ready server). On the no-cache first-run path, initialize falls through to the normal
  // forwardWithRetry after a 1.5s probe -- acceptable because the BUG-1/BUG-2 lazy-load crash
  // class is fixed (2026-05-22) and forwardWithRetry self-heals + retries connection errors.
  const rl = createInterface({
    input: process.stdin,
    terminal: false
  });

  rl.on("line", async (line) => {
    if (line.trim()) {
      await handleStdioMessage(line);
    }
  });

  rl.on("close", () => {
    log("info", "Bridge stdin closed, exiting");
    process.exit(0);
  });

  // Poll backend readiness in the BACKGROUND (no longer blocks the handshake above). This only
  // OBSERVES/logs boot progress -- the actual backend (re)spawn is done by ensureServerStarted
  // (startup check + forwardWithRetry). waitForReady returns instantly when the backend is
  // already up (poll 1); while it is still booting, LOCAL-INIT-ANSWER keeps the client connected.
  waitForReady().catch((e) => log("warn", "background waitForReady error (non-fatal)", { error: e && e.message }));

  // Handle shutdown
  process.on("SIGINT", () => {
    log("info", "Bridge received SIGINT");
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    log("info", "Bridge received SIGTERM");
    process.exit(0);
  });

  // A connection-class error inside an async retry must never take the
  // bridge process down - that would drop every chat on this bridge.
  process.on("uncaughtException", (err) => {
    log("error", "uncaughtException (kept alive)", { error: err && err.message });
  });
  process.on("unhandledRejection", (err) => {
    log("error", "unhandledRejection (kept alive)", { error: err && (err.message || String(err)) });
  });

  log("info", "Bridge ready, waiting for requests");
}

// Only run the bridge when invoked DIRECTLY (`node mcp-http-bridge.mjs`). Importing the module
// (e.g. from mcp-http-bridge.test.mjs, which exercises the pure init-cache helpers) must NOT
// start main() -- that would hijack process.stdin and consume the test runner. Same proven
// direct-invocation guard as scripts/hermes-proxy-ensure.mjs.
// Case-insensitive suffix match: Windows paths are case-insensitive, so a launcher passing a
// differently-cased path must still run main() (a case-sensitive match would silently disable
// the bridge fleet-wide -- scrutiny arm C P2).
const _invokedDirectly = typeof process.argv[1] === "string" &&
  process.argv[1].replace(/\\/g, "/").toLowerCase().endsWith("mcp-http-bridge.mjs");
if (_invokedDirectly) {
  main().catch(err => {
    log("error", "Bridge fatal error", { error: err.message });
    process.exit(1);
  });
}
