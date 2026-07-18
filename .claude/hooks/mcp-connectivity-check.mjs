#!/usr/bin/env node
// tier: T2
/**
 * mcp-connectivity-check.mjs — UserPromptSubmit hook.
 *
 * Probes the PRISM MCP daemon (default http://127.0.0.1:3100) at the start of
 * every turn. On disconnect, injects an `additionalContext` banner naming
 * exactly what's down + the exact restart command — so the chat doesn't
 * silently degrade through a sequence of failing mcp__prism__* tool calls
 * while the operator wonders why nothing works.
 *
 * Operator pain point (2026-05-19): "we get randomly kicked off sometimes."
 * Symptom: the MCP server drops, the chat keeps trying mcp__prism__* calls,
 * each one errors with a low-signal "tool not available" message, and the
 * chat wastes a turn or three before the operator notices and restarts.
 * This hook makes the disconnect LOUD at turn-start, so the recovery path
 * is in the chat's context the moment it matters.
 *
 * Probe strategy:
 *   - HEAD or GET on the MCP base URL (3s timeout -- never delay a turn)
 *   - Fall through to `/mcp` endpoint variant if root 404s
 *   - Throttled (default 30s) so we don't probe on every UserPromptSubmit
 *     during back-to-back model turns (which causes prompt cascades)
 *
 * Output contract: stdout is JSON. continue:true always (never blocks).
 *   - On healthy: { continue:true } (silent — no banner noise)
 *   - On disconnect: { continue:true, hookSpecificOutput:{additionalContext} }
 *
 * Env knobs:
 *   PRISM_MCP_URL                       MCP server URL (default http://127.0.0.1:3100)
 *   PRISM_MCP_CONNECTIVITY_DISABLE=1    skip the probe entirely
 *   PRISM_MCP_CONNECTIVITY_TIMEOUT_MS   probe timeout (default 3000)
 *   PRISM_MCP_CONNECTIVITY_THROTTLE_SEC throttle between real probes (default 30)
 *   PRISM_MCP_CONNECTIVITY_NO_DEBOUNCE=1 declare DOWN on a single probe failure (default: re-probe to confirm)
 *   PRISM_MCP_CONNECTIVITY_VERBOSE=1    always emit banner with current state
 *   PRISM_MCP_FLEET0_BANNER=1           restore legacy fleet-wide 0-bridges banner (default off;
 *                                       suppressed 2026-06-17 -- a healthy server + 0 transient
 *                                       bridges is idle, not an outage; U-MCP-FALSEPOS-SUPPRESS)
 *
 * @hook UserPromptSubmit  (wire FIRST in the chain so the banner lands at the top)
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir, hostname } from "node:os";
import http from "node:http";
import { maybeReconnect, renderReconnectLine } from "../../scripts/lib/mcp-reconnect-action.mjs";
// MCP-CLIENT-ENFORCE-MS0 (2026-06-13, slot tango): per-CHAT bridge liveness. golf's
// countBridges (below) is FLEET-WIDE (detects a total outage: 0 bridges anywhere);
// the sentinel is PRECISE to THIS chat (detects my-bridge-dead while a peer's bridge
// is alive -- the case a fleet-wide count reports as a false-OK). Sentinel runs first,
// countBridges is the fallback for sentinel-less (pre-upgrade) bridges.
import {
  resolveSlotName,
  readBridgeLiveness,
  isConfidentlyDisconnected,
  getLiveDir,
  getStaleMs,
} from "../../scripts/lib/mcp-bridge-liveness.mjs";

const DEFAULT_URL = "http://127.0.0.1:3100";
// 3000ms (was 1000): a 1s probe timeout false-flags a healthy-but-slow :3100 as DISCONNECTED
// under fleet load (the 2026-05-29 fleet-scale fix root cause: "probed with a 1s timeout while
// /health answered 200 in ~222ms"). The 3s budget matches the live /health latency p90. The
// test asserted 3000 since 2026-06-12 but the constant was never actually bumped -- aligned here
// (U-MCP-FALSEPOS-SUPPRESS, slot golf 2026-06-17).
const DEFAULT_TIMEOUT_MS = 3000;
const DEFAULT_THROTTLE_SEC = 30;
const STATE_FILE = join(tmpdir(), "prism-hook-state", "mcp-connectivity-state.json");

// Bridge-layer health (U-MCP-BRIDGE-DETECT, slot golf 2026-06-12). The probe tests the SERVER
// (:3100). But "connected" for a chat means the per-chat `prism` BRIDGE (mcp-http-bridge.mjs, the
// stdio<->HTTP conduit Claude Code spawns) -- which can be DEAD while :3100 is up, leaving every
// chat's prism MCP disconnected (observed 2026-06-12: server up, 0 bridges; the operator had to
// manually /mcp). The probe's `ok` is a FALSE-OK in that case. A hook CANNOT respawn the harness
// bridge (only /mcp / session-restart does), but it CAN detect the dead bridge layer cheaply via
// the reaper's process-enum cache (a file read -- a per-turn powershell enumeration costs ~526ms,
// unacceptable on a per-turn fleet hook) and surface the recovery proactively (R12: honest about
// what a hook can/can't do). maybeReconnect (server restart) stays the action for server-DOWN.
const BRIDGE_CACHE_MAX_AGE_SEC = 900; // reaper writes every ~5min; >15min = stale, don't trust it

/**
 * Count live `mcp-http-bridge` processes from the fleet-reaper enum cache (cheap file read).
 * Returns { ok:true, bridges, ageSec } when the cache is fresh + parseable; { ok:false, reason }
 * otherwise (fail-soft: an UNKNOWN bridge count must NEVER trigger a false degraded banner).
 */
export function countBridges(env = process.env, deps = {}) {
  if (String(env.PRISM_MCP_BRIDGE_CHECK_DISABLE || "") === "1") return { ok: false, reason: "disabled" };
  const _read = deps.readFileSync || readFileSync;
  const _exists = deps.existsSync || existsSync;
  const _stat = deps.statSync || statSync;
  const _now = deps.now || Date.now;
  const _host = deps.hostname || hostname;
  const root = (env.PRISM_ROOT || "H:/prism").replace(/\/+$/, "");
  const file = deps.cacheFile || join(root, "state/shared", `.fleet-reaper-enum-cache-${_host()}.json`);
  try {
    if (!_exists(file)) return { ok: false, reason: "no-cache" };
    const ageSec = Math.round((_now() - _stat(file).mtimeMs) / 1000);
    if (ageSec > BRIDGE_CACHE_MAX_AGE_SEC) return { ok: false, reason: "stale-cache", ageSec };
    const c = JSON.parse(_read(file, "utf8"));
    const procs = Array.isArray(c) ? c : (c.procs || c.processes || []);
    if (!Array.isArray(procs)) return { ok: false, reason: "bad-schema" };
    const bridges = procs.filter((p) => p && /mcp-http-bridge/i.test(p.cmd || p.commandLine || p.cmdline || "")).length;
    return { ok: true, bridges, ageSec };
  } catch { return { ok: false, reason: "read-error" }; }
}

/** The directive shown when :3100 is up but the bridge layer is dead. Honest about the harness limit. */
export function buildDegradedBanner(bc) {
  return [
    "WARN MCP BRIDGE DOWN -- the prism server (:3100) is UP but 0 bridge processes are running.",
    `   Every chat's \`prism\` MCP is disconnected (reaper enum-cache, ${bc.ageSec}s old).`,
    "   ACTION: run `/mcp` to reconnect prism (a hook cannot respawn the harness bridge).",
    "   Meanwhile use the reliable `prism_safe` (direct stdio) server, or `node H:/prism/scripts/<X>.mjs` for critical calls.",
    "   Disable this check: PRISM_MCP_BRIDGE_CHECK_DISABLE=1",
  ].join("\n");
}

/**
 * The directive shown when :3100 is up but THIS chat's OWN bridge is dead/stale
 * (per-slot sentinel). More precise than buildDegradedBanner: it fires even when
 * peer chats still have live bridges. Honest about the harness limit (R12).
 */
export function buildClientDisconnectBanner(slot, verdict, cfg) {
  return [
    "STOP: THIS CHAT lost its prism MCP bridge -- you are disconnected.",
    `   slot=${slot || "?"} bridge ${verdict.reason}${verdict.pid ? " (pid " + verdict.pid + " gone)" : ""}; the daemon (${cfg.url}) is UP, but YOUR session has no live bridge.`,
    "   Every mcp__prism__* tool is unavailable THIS session until you reconnect.",
    "   ACTION: run `/mcp` and reconnect `prism`, OR restart this chat (a hook cannot reconnect the harness client).",
    "   Meanwhile use `prism_safe` (direct stdio), or `node H:/prism/scripts/<X>.mjs` for critical calls.",
    "   Disable this check: PRISM_MCP_CLIENT_CHECK_DISABLE=1",
  ].join("\n");
}

// ── Pure helpers ──

export function getConfig(env = process.env) {
  return {
    url: (env.PRISM_MCP_URL || DEFAULT_URL).replace(/\/+$/, ""),
    timeoutMs: Math.max(100, Number(env.PRISM_MCP_CONNECTIVITY_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS),
    throttleSec: Math.max(0, Number(env.PRISM_MCP_CONNECTIVITY_THROTTLE_SEC) || DEFAULT_THROTTLE_SEC),
    disabled: String(env.PRISM_MCP_CONNECTIVITY_DISABLE || "") === "1",
    verbose: String(env.PRISM_MCP_CONNECTIVITY_VERBOSE || "") === "1",
  };
}

export function loadState(path = STATE_FILE, deps = {}) {
  const _exists = deps.existsSync || existsSync;
  const _read = deps.readFileSync || readFileSync;
  if (!_exists(path)) return { lastProbeAt: 0, lastStatus: null };
  try {
    const s = JSON.parse(_read(path, "utf8"));
    return { lastProbeAt: Number(s.lastProbeAt) || 0, lastStatus: s.lastStatus || null };
  } catch {
    return { lastProbeAt: 0, lastStatus: null };
  }
}

export function saveState(path, state, deps = {}) {
  const _write = deps.writeFileSync || writeFileSync;
  const _exists = deps.existsSync || existsSync;
  const _mkdir = deps.mkdirSync || mkdirSync;
  try {
    const dir = dirname(path);
    if (!_exists(dir)) _mkdir(dir, { recursive: true });
    _write(path, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export function shouldProbe(state, throttleSec, nowMs = Date.now()) {
  if (throttleSec <= 0) return true;
  // lastProbeAt === 0 is the "never probed" sentinel — always probe on first turn
  if (!state.lastProbeAt) return true;
  const ageMs = nowMs - state.lastProbeAt;
  if (ageMs >= throttleSec * 1000) return true;
  // Always re-probe when prior state was disconnect (recovery should surface fast)
  // 5000ms floor prevents probe storms when already down
  if (state.lastStatus && state.lastStatus.ok === false && (nowMs - state.lastProbeAt) >= 5000) return true;
  return false;
}

// Side-effecting: HTTP HEAD probe. Returns { ok, status, error?, latencyMs }.
// Injects http for testability.
export function probeUrl(url, timeoutMs, httpClient = http) {
  return new Promise((resolve) => {
    const start = Date.now();
    let settled = false;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      resolve({ ...result, latencyMs: Date.now() - start });
    };
    let req;
    try {
      const u = new URL(url);
      req = httpClient.request({
        method: "GET",
        hostname: u.hostname,
        port: u.port || 80,
        path: "/health",
        timeout: timeoutMs,
      }, (res) => {
        // 2xx-4xx means the server is alive (404 still means listening).
        // Only 5xx + ECONNREFUSED count as down.
        const ok = res.statusCode < 500;
        finish({ ok, status: res.statusCode, error: null });
      });
      req.on("timeout", () => { try { req.destroy(); } catch {} finish({ ok: false, status: null, error: "timeout" }); });
      req.on("error", (e) => finish({ ok: false, status: null, error: e.code || e.message || "unknown-error" }));
      req.end();
    } catch (e) {
      finish({ ok: false, status: null, error: `setup-error: ${e.message}` });
    }
  });
}

// Build the operator-facing banner. Pure.
export function buildBanner(probeResult, cfg) {
  if (probeResult.ok) {
    if (!cfg.verbose) return null;
    return `✓ MCP server reachable @ ${cfg.url} (${probeResult.latencyMs}ms, HTTP ${probeResult.status ?? "?"})`;
  }
  const lines = [
    "🛑 MCP SERVER DISCONNECTED — every mcp__prism__* tool call will fail this turn",
    `   URL: ${cfg.url}`,
    `   Error: ${probeResult.error || "unknown"} (HTTP ${probeResult.status ?? "—"})`,
    "",
    "   To reconnect:",
    "     1. ONE-COMMAND recovery (reaps any duplicate-daemon pileup AND respawns a clean TRANSPORT=http daemon — safe no-op if already healthy):",
    "        `node H:/prism/scripts/singleton-service-guard.mjs --fix`",
    "     2. Manual fallback if --fix can't (MUST set TRANSPORT=http — a bare `node dist/index.js` runs STDIO mode and does NOT serve :3100; `--port 3100` does not switch transport; the launcher's `--services=mcp` fails with 'no such service' because MCP is a node daemon, not a compose service):",
    "        bash:       `TRANSPORT=http node H:/prism/mcp-server/dist/index.js`",
    "        powershell: `$env:TRANSPORT='http'; node H:/prism/mcp-server/dist/index.js`",
    "     3. Verify: `curl -I http://127.0.0.1:3100` returns HTTP 200/404 (not refused). Diagnose: `node H:/prism/scripts/singleton-service-guard.mjs`",
    "   (The PRISM MCP Server supervisor + Watchdog scheduled tasks already auto-respawn a down server; --fix is for the pileup case they don't cover.)",
    "",
    "   While disconnected, fall back to direct script invocation:",
    "     `node H:/prism/scripts/<X>.mjs` instead of `mcp__prism_*` tool calls",
    "",
    "   Disable this banner: PRISM_MCP_CONNECTIVITY_DISABLE=1",
  ];
  return lines.join("\n");
}

// Main orchestration — async because the probe is async.
export async function runCheck(opts = {}) {
  const env = opts.env || process.env;
  const cfg = getConfig(env);
  if (cfg.disabled) return { continue: true };
  const statePath = opts.statePath || STATE_FILE;
  const deps = opts.deps || {};
  const state = loadState(statePath, deps);
  const nowMs = opts.nowMs || Date.now();
  // Throttle: if we probed recently AND the last result was OK, skip
  if (!shouldProbe(state, cfg.throttleSec, nowMs)) {
    return cfg.verbose
      ? { continue: true, hookSpecificOutput: { hookEventName: "UserPromptSubmit", additionalContext: `mcp-connectivity: cached (probed ${Math.round((nowMs - state.lastProbeAt) / 1000)}s ago, status=${state.lastStatus?.ok ? "ok" : "down"})` } }
      : { continue: true };
  }
  const probeFn = opts.probeFn || probeUrl;
  const httpClient = opts.httpClient || http;
  let result = await probeFn(cfg.url, cfg.timeoutMs, httpClient);
  // DEBOUNCE the DOWN verdict (golf 2026-06-17, U-MCP-CONNCHECK-DEBOUNCE): a SINGLE probe
  // timeout/ECONNRESET on a healthy-but-momentarily-slow :3100 false-flags "DISCONNECTED -- every
  // tool call will fail this turn" (verified live: /ready 2.9s near the 3s ceiling, then 5ms 3x;
  // queue empty, uptime 74min). A transient blip clears on a re-probe; only a SUSTAINED outage fails
  // twice. Re-probe ONLY on failure (happy path adds zero latency) with a shorter timeout (recovery
  // confirms in ~ms; a real down fails fast) so we honor the header's "never delay a turn". Same R7
  // lesson as the false-broadcast live-probe gate. Knob: PRISM_MCP_CONNECTIVITY_NO_DEBOUNCE=1 restores
  // single-probe fail-fast.
  if (result && result.ok === false && String(env.PRISM_MCP_CONNECTIVITY_NO_DEBOUNCE || "") !== "1") {
    const confirmTimeoutMs = Math.min(cfg.timeoutMs, 2000);
    const confirm = await probeFn(cfg.url, confirmTimeoutMs, httpClient);
    // Re-probe healthy -> the first failure was transient -> treat as UP (suppress the false banner).
    // Re-probe also failed -> sustained outage -> keep the (fresher) DOWN verdict so the banner + the
    // auto-reconnect still fire on a genuine :3100 outage.
    result = (confirm && confirm.ok === true) ? confirm : (confirm || result);
  }
  // Persist
  saveState(statePath, { lastProbeAt: nowMs, lastStatus: result }, deps);
  // Build response
  let banner = buildBanner(result, cfg);
  // U-MCP-RECONNECT-WIRE (MCP-AUTORECONNECT-MS0): when DOWN, auto-reconnect (single-flight across the
  // fleet via O_EXCL lock; TTL doubles as throttle). Reuse the probe just run — pass result.ok (the
  // hook's field), NOT result.up. Fail-soft: never breaks the turn; appends one status line to the
  // banner. Knob PRISM_MCP_AUTORECONNECT_DISABLE=1. Static import matches this hook's all-static style (R11).
  if (result && result.ok === false) {
    try {
      const rc = (opts.maybeReconnectFn || maybeReconnect)({ ok: result.ok });
      const line = renderReconnectLine(rc);
      if (line) banner = (banner ? banner + "\n" : "") + line;
    } catch { /* never break the turn */ }
  } else if (result && result.ok === true) {
    // MERGE NOTE (R7): this branch is a strict SUPERSET of golf's slot/golf
    // U-MCP-BRIDGE-DETECT countBridges branch -- golf's exact logic survives as the
    // (2) fallback below. On a slot/golf -> live merge conflict here, KEEP THIS
    // version (do not re-add golf's standalone countBridges block beneath it).
    // MCP-CLIENT-ENFORCE-MS0 (slot tango): server up != THIS chat connected.
    // (1) PRECISE per-chat check first -- the sentinel knows if THIS chat's own
    //     bridge died (the case golf's fleet-wide count below cannot see: my bridge
    //     dead while a peer's is alive -> count > 0 -> false-OK).
    if (String(env.PRISM_MCP_CLIENT_CHECK_DISABLE || "") !== "1") {
      try {
        const slot = (opts.resolveSlotFn || resolveSlotName)(env, opts.cwd);
        const verdict = (opts.readBridgeLivenessFn || readBridgeLiveness)(slot, {
          liveDir: getLiveDir(env), staleMs: getStaleMs(env), now: nowMs,
        });
        if (isConfidentlyDisconnected(verdict)) banner = buildClientDisconnectBanner(slot, verdict, cfg);
      } catch { /* never break the turn */ }
    }
    // (2) FLEET-WIDE bridges===0 banner SUPPRESSED on a HEALTHY server
    //     (U-MCP-FALSEPOS-SUPPRESS, slot golf 2026-06-17).
    //     EVIDENCE (617-session study + live load test): this branch only runs when the
    //     /health probe is 200, and with the server UP, 0 live mcp-http-bridge procs is the
    //     NORMAL IDLE state, NOT an outage -- bridges are transient (1486 spawn/exit cycles in
    //     mcp-bridge.log; each chat respawns its bridge ~90x; 0-live-bridges is the resting
    //     value between request bursts). The old `bridges===0 -> buildDegradedBanner` here
    //     fired the "MCP BRIDGE DOWN / every chat disconnected" banner EVERY idle turn (196
    //     hits in just 8 transcripts, 57 in one session) while :3100 served 32 concurrent
    //     initializes with 0 errors/0 sheds and only 4 REAL terminal bridge deaths exist across
    //     the ENTIRE log history. A fleet-0 banner on a healthy server is provably a false
    //     positive, so it is no longer emitted. The PRECISE real signals are unaffected:
    //       - the per-chat sentinel (1) above still fires when THIS chat's own bridge is dead;
    //       - the server-DOWN branch (result.ok===false) still fires + auto-reconnects on a
    //         genuine :3100 outage.
    //     `countBridges` + `buildDegradedBanner` stay exported (preserved per never-delete-only-
    //     disable; the enforce pretool's fleet count + isolated tests still use them). Knob to
    //     restore the legacy banner if a future need appears: PRISM_MCP_FLEET0_BANNER=1.
    if (!banner && String(env.PRISM_MCP_FLEET0_BANNER || "") === "1") {
      try {
        const bc = (opts.countBridgesFn || countBridges)(env, deps);
        if (bc.ok && bc.bridges === 0) banner = buildDegradedBanner(bc);
      } catch { /* never break the turn */ }
    }
  }
  if (!banner) return { continue: true };
  return {
    continue: true,
    hookSpecificOutput: { hookEventName: "UserPromptSubmit", additionalContext: banner },
  };
}

// ── CLI entry ──
const isMain = (() => {
  try {
    return import.meta.url === `file://${process.argv[1].replace(/\\/g, "/")}` ||
           import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/"));
  } catch { return false; }
})();

if (isMain) {
  // We don't need stdin for this hook; just probe + emit.
  // (UserPromptSubmit hooks receive JSON on stdin but we don't need its payload.)
  runCheck().then((result) => {
    console.log(JSON.stringify(result));
    process.exit(0);
  }).catch((e) => {
    // Never block on hook failure
    console.log(JSON.stringify({ continue: true, hookSpecificOutput: { hookEventName: "UserPromptSubmit", additionalContext: `[mcp-connectivity hook failed silently: ${e.message}]` } }));
    process.exit(0);
  });
}
