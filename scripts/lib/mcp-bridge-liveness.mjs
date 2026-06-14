#!/usr/bin/env node
// tier: lib
/**
 * mcp-bridge-liveness.mjs -- per-chat MCP bridge liveness sentinel + reader.
 *
 * THE GAP THIS CLOSES (MCP-CLIENT-ENFORCE-MS0, 2026-06-13, slot tango):
 *   The fleet already keeps the SHARED daemon (:3100) alive (supervisor +
 *   watchdog + connectivity-monitor scheduled tasks) and mcp-connectivity-
 *   check.mjs probes that daemon every turn. But a chat talks to :3100
 *   through its OWN long-lived stdio bridge process (mcp-http-bridge.mjs,
 *   one per chat). When THAT bridge dies mid-session, the harness drops every
 *   mcp__prism__* tool for the rest of the session -- yet the daemon stays
 *   perfectly healthy, so the daemon probe reports all-clear and the chat
 *   degrades SILENTLY. Live repro 2026-06-13: tango's bridge (pid 50992)
 *   initialized fine (67 tools), later died, and the chat ran with zero prism
 *   tools while :3100 /health was 200.
 *
 *   This module is the missing CLIENT-side signal: each bridge writes a
 *   per-slot sentinel on startup and heartbeats it; the connectivity hook (and
 *   any chat, via --check) reads the sentinel to answer the question the
 *   daemon probe cannot -- "is THIS chat's bridge actually alive?".
 *
 * HONEST SCOPE (R12): a hook/script CANNOT force the Claude Code harness to
 *   re-initialize a dead stdio MCP client mid-session -- that is harness-owned
 *   (/mcp reconnect, or restart the chat). This module makes the disconnect
 *   DETECTED + LOUD + deterministic instead of silent. It does not, and cannot,
 *   transparently reconnect the client.
 *
 * Sentinel record (JSON at <liveDir>/<slot>.json):
 *   { slot, pid, bridgeId, startedAt, lastBeatAt, cwd, mcpUrl, v }
 *   Freshness is the in-file lastBeatAt (NOT mtime -- more robust across
 *   tools/filesystems). A pid that is dead OR a heartbeat older than staleMs
 *   means the bridge is gone. pid-liveness + heartbeat-freshness together
 *   defend against PID reuse (a recycled pid won't be refreshing OUR sentinel).
 *
 * Env knobs:
 *   PRISM_MCP_BRIDGE_LIVE_DIR   override the sentinel directory
 *   PRISM_MCP_BRIDGE_STALE_MS   heartbeat staleness threshold (default 90000)
 *
 * Pure (testable) exports: resolveSlotName, sentinelPath, buildSentinelRecord,
 *   readBridgeLiveness, isConfidentlyDisconnected, defaultIsPidAlive,
 *   getLiveDir, getStaleMs.
 * Side-effecting exports: writeSentinel, heartbeatSentinel, removeSentinel.
 */

import {
  existsSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  rmSync,
} from "node:fs";
import { dirname, join } from "node:path";
import http from "node:http";
import { slotFromCwd } from "../../.claude/helpers/mcp-tool-domains.mjs";

// The live deployment root is H:/prism (.mcp.json + settings.json reference it
// by absolute path; the bridge LOG_FILE is likewise hardcoded there). Keep the
// default consistent with that; allow override for tests / other layouts.
export const DEFAULT_LIVE_DIR = "H:/prism/.claude/cache/mcp-bridge-live";
export const DEFAULT_STALE_MS = 90_000; // 4+ missed 20s heartbeats
export const SENTINEL_VERSION = 1;
const PROBE_TIMEOUT_MS = 2000;
// A sentinel is bridge-authored and ~200 bytes. A wildly larger file means
// corruption / not-ours -- treat as parse-error rather than parse a huge string.
const MAX_SENTINEL_BYTES = 64 * 1024;

export function getLiveDir(env = process.env) {
  const v = env && env.PRISM_MCP_BRIDGE_LIVE_DIR;
  return v && String(v).trim() ? String(v).trim() : DEFAULT_LIVE_DIR;
}

export function getStaleMs(env = process.env) {
  const n = Number(env && env.PRISM_MCP_BRIDGE_STALE_MS);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_STALE_MS;
}

/**
 * Resolve THIS chat's slot name, identically for the bridge and the hook.
 *
 * The bridge (writes the sentinel) and the hook (reads it) BOTH call this same
 * function, so they always agree with each other regardless of env shape -- that
 * is the load-bearing invariant. This covers the two tiers that actually fire for
 * the stdio bridge child + the per-turn hook:
 *   1. PRISM_BOOT_SLOT   (production tier -- slot-tab-boot.ps1 exports it
 *                         before claude launches; the bridge child inherits it)
 *   2. slot-worktree cwd (H:/prism-slot-<name> -> <name>)
 *   3. null              (shared tree / unknown -- caller treats as no-signal)
 *
 * NOTE: the canonical mcp-tool-domains.resolveDomainsFromEnv has extra UPSTREAM
 * tiers (MCP_TOOL_DOMAINS, PRISM_SLOT_GALAXY) used to pick the tool-DOMAIN filter.
 * We deliberately do NOT mirror those here -- a slot NAME is what keys the
 * sentinel, and in production every fleet tab sets PRISM_BOOT_SLOT (tier 1), so
 * tiers 1-2 are sufficient. A launcher that set only PRISM_SLOT_GALAXY without
 * PRISM_BOOT_SLOT would resolve to null (no-signal) here -- safe (no false alarm),
 * just no client-disconnect detection for that atypical config.
 * Returns a lowercased slot name or null.
 */
export function resolveSlotName(env = process.env, cwd = undefined) {
  const boot = env && env.PRISM_BOOT_SLOT && String(env.PRISM_BOOT_SLOT).trim();
  if (boot) return boot.toLowerCase();
  const resolvedCwd =
    cwd !== undefined
      ? cwd
      : (typeof process !== "undefined" && process.cwd ? process.cwd() : "");
  const fromCwd = slotFromCwd(resolvedCwd);
  return fromCwd ? String(fromCwd).toLowerCase() : null;
}

/** Sanitize a slot name into a safe filename stem. */
function safeSlot(slot) {
  return String(slot).toLowerCase().replace(/[^a-z0-9_-]/g, "_");
}

export function sentinelPath(slot, liveDir = DEFAULT_LIVE_DIR) {
  return join(liveDir, `${safeSlot(slot)}.json`);
}

/** Pure: build the sentinel record. */
export function buildSentinelRecord(fields = {}) {
  const now = Number.isFinite(fields.now) ? fields.now : Date.now();
  return {
    v: SENTINEL_VERSION,
    slot: fields.slot != null ? String(fields.slot).toLowerCase() : null,
    pid: Number.isFinite(fields.pid) ? fields.pid : null,
    bridgeId: fields.bridgeId != null ? String(fields.bridgeId) : null,
    startedAt: Number.isFinite(fields.startedAt) ? fields.startedAt : now,
    lastBeatAt: now,
    cwd: fields.cwd != null ? String(fields.cwd) : null,
    mcpUrl: fields.mcpUrl != null ? String(fields.mcpUrl) : null,
  };
}

/**
 * Default pid-liveness probe. process.kill(pid, 0) sends no signal but throws
 * ESRCH when the pid is gone; EPERM means the pid EXISTS but is owned by another
 * user (still alive). Returns false for any non-finite / non-positive pid.
 */
export function defaultIsPidAlive(pid) {
  if (!Number.isFinite(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return e && e.code === "EPERM";
  }
}

/**
 * Read the per-slot bridge liveness. PURE w.r.t. injected deps (fs + clock +
 * pid probe) so it is fully unit-testable. Never throws.
 *
 * Returns { alive, reason, pid, ageMs } where reason is one of:
 *   ok | unknown-slot | no-sentinel | parse-error | stale-heartbeat | pid-dead
 * Only pid-dead and stale-heartbeat are CONFIDENT "the bridge died" verdicts --
 * callers should treat no-sentinel / unknown-slot / parse-error as "no signal"
 * (do NOT raise a scary banner; a missing sentinel can mean a pre-upgrade bridge
 * or a shared-tree chat).
 */
export function readBridgeLiveness(slot, opts = {}) {
  const now = Number.isFinite(opts.now) ? opts.now : Date.now();
  const liveDir = opts.liveDir || DEFAULT_LIVE_DIR;
  const staleMs = Number.isFinite(opts.staleMs) ? opts.staleMs : DEFAULT_STALE_MS;
  const deps = opts.deps || {};
  const _exists = deps.existsSync || existsSync;
  const _read = deps.readFileSync || readFileSync;
  const isPidAlive = opts.isPidAlive || defaultIsPidAlive;

  if (!slot) return { alive: false, reason: "unknown-slot", pid: null, ageMs: null };
  const path = sentinelPath(slot, liveDir);
  let raw;
  try {
    if (!_exists(path)) return { alive: false, reason: "no-sentinel", pid: null, ageMs: null };
    raw = _read(path, "utf8");
  } catch {
    return { alive: false, reason: "no-sentinel", pid: null, ageMs: null };
  }
  // Defensive: a bridge sentinel is ~200 bytes. A wildly larger payload is
  // corruption/foreign content -- do not hand it to JSON.parse.
  if (typeof raw === "string" && raw.length > MAX_SENTINEL_BYTES) {
    return { alive: false, reason: "parse-error", pid: null, ageMs: null };
  }
  let rec;
  try {
    rec = JSON.parse(raw);
  } catch {
    return { alive: false, reason: "parse-error", pid: null, ageMs: null };
  }
  const pid = Number(rec && rec.pid);
  if (!Number.isFinite(pid) || pid <= 0) {
    return { alive: false, reason: "parse-error", pid: null, ageMs: null };
  }
  const beat = Number(rec.lastBeatAt) || Number(rec.startedAt) || 0;
  const ageMs = now - beat;
  if (ageMs > staleMs) {
    return { alive: false, reason: "stale-heartbeat", pid, ageMs };
  }
  if (!isPidAlive(pid)) {
    return { alive: false, reason: "pid-dead", pid, ageMs };
  }
  return { alive: true, reason: "ok", pid, ageMs };
}

/** True when the verdict is a CONFIDENT "bridge died" (vs a no-signal verdict). */
export function isConfidentlyDisconnected(verdict) {
  return !!verdict && (verdict.reason === "pid-dead" || verdict.reason === "stale-heartbeat");
}

// -- Side-effecting helpers (used by the bridge). All fail-soft -- a sentinel
//    error must NEVER affect bridge operation. Each returns a boolean. --

export function writeSentinel(slot, fields = {}, deps = {}) {
  if (!slot) return false;
  const liveDir = deps.liveDir || getLiveDir(deps.env || process.env);
  const _write = deps.writeFileSync || writeFileSync;
  const _exists = deps.existsSync || existsSync;
  const _mkdir = deps.mkdirSync || mkdirSync;
  try {
    const path = sentinelPath(slot, liveDir);
    const dir = dirname(path);
    if (!_exists(dir)) _mkdir(dir, { recursive: true });
    const rec = buildSentinelRecord({ ...fields, slot });
    _write(path, JSON.stringify(rec));
    return true;
  } catch {
    return false;
  }
}

export function heartbeatSentinel(slot, fields = {}, deps = {}) {
  if (!slot) return false;
  const liveDir = deps.liveDir || getLiveDir(deps.env || process.env);
  const _write = deps.writeFileSync || writeFileSync;
  const _read = deps.readFileSync || readFileSync;
  const _exists = deps.existsSync || existsSync;
  const _mkdir = deps.mkdirSync || mkdirSync;
  try {
    const path = sentinelPath(slot, liveDir);
    const dir = dirname(path);
    if (!_exists(dir)) _mkdir(dir, { recursive: true });
    // Preserve startedAt/bridgeId/pid/cwd if a prior record exists; only the
    // heartbeat (lastBeatAt) advances.
    let prior = {};
    try {
      if (_exists(path)) prior = JSON.parse(_read(path, "utf8")) || {};
    } catch { prior = {}; }
    // SUPERSEDE GUARD: if a NEWER bridge already claimed this slot's sentinel
    // (on-disk pid differs from ours), do NOT clobber it -- we've been replaced
    // by a fast respawn. Refusing here prevents the old bridge's heartbeat from
    // overwriting the live bridge's pid and causing a false client-disconnect.
    const myPid = Number.isFinite(fields.pid) ? fields.pid : Number(prior.pid);
    const priorPid = Number(prior && prior.pid);
    if (Number.isFinite(priorPid) && priorPid > 0 && Number.isFinite(myPid) && priorPid !== myPid) {
      return false;
    }
    const rec = buildSentinelRecord({
      slot,
      pid: Number.isFinite(fields.pid) ? fields.pid : Number(prior.pid),
      bridgeId: fields.bridgeId != null ? fields.bridgeId : prior.bridgeId,
      startedAt: Number.isFinite(fields.startedAt) ? fields.startedAt : Number(prior.startedAt),
      cwd: fields.cwd != null ? fields.cwd : prior.cwd,
      mcpUrl: fields.mcpUrl != null ? fields.mcpUrl : prior.mcpUrl,
      now: Number.isFinite(fields.now) ? fields.now : undefined,
    });
    _write(path, JSON.stringify(rec));
    return true;
  } catch {
    return false;
  }
}

/**
 * Remove the sentinel -- but ONLY if it belongs to the given pid (or no pid
 * filter is requested). The pid guard prevents a slow-exiting OLD bridge from
 * deleting a freshly-written NEW bridge's sentinel after a fast respawn.
 */
export function removeSentinel(slot, ownPid = undefined, deps = {}) {
  if (!slot) return false;
  const liveDir = deps.liveDir || getLiveDir(deps.env || process.env);
  const _exists = deps.existsSync || existsSync;
  const _read = deps.readFileSync || readFileSync;
  const _rm = deps.rmSync || rmSync;
  try {
    const path = sentinelPath(slot, liveDir);
    if (!_exists(path)) return false;
    if (ownPid !== undefined && ownPid !== null) {
      try {
        const rec = JSON.parse(_read(path, "utf8"));
        if (Number(rec && rec.pid) !== Number(ownPid)) return false; // not ours
      } catch { /* unparsable -> fall through and remove */ }
    }
    _rm(path, { force: true });
    return true;
  } catch {
    return false;
  }
}

// -- CLI self-check (`node scripts/lib/mcp-bridge-liveness.mjs --check`) --
// Answers, for THE CHAT THAT INVOKES IT, both questions at once:
//   (a) is the shared daemon up?   (HTTP /health probe)
//   (b) is MY bridge alive?        (sentinel read)
// and prints the exact recovery path. Always exits 0 (diagnostic, never blocks).

function probeDaemon(url, timeoutMs = PROBE_TIMEOUT_MS) {
  return new Promise((resolve) => {
    let done = false;
    const finish = (r) => { if (!done) { done = true; resolve(r); } };
    try {
      const u = new URL(url);
      const req = http.request(
        { method: "GET", hostname: u.hostname, port: u.port || 80, path: "/health", timeout: timeoutMs },
        (res) => finish({ ok: res.statusCode < 500, status: res.statusCode }),
      );
      req.on("timeout", () => { try { req.destroy(); } catch {} finish({ ok: false, status: null, error: "timeout" }); });
      req.on("error", (e) => finish({ ok: false, status: null, error: e.code || e.message }));
      req.end();
    } catch (e) {
      finish({ ok: false, status: null, error: e.message });
    }
  });
}

async function cliCheck() {
  const env = process.env;
  const slot = resolveSlotName(env);
  const url = (env.PRISM_MCP_URL || "http://127.0.0.1:3100").replace(/\/+$/, "");
  const daemon = await probeDaemon(url);
  const verdict = readBridgeLiveness(slot, { liveDir: getLiveDir(env), staleMs: getStaleMs(env) });
  const beatSec = Math.round((verdict.ageMs ?? 0) / 1000);
  const lines = [];
  lines.push(`PRISM MCP self-check -- slot=${slot || "(unknown)"}`);
  lines.push(`  daemon  ${url} : ${daemon.ok ? `UP (HTTP ${daemon.status})` : `DOWN (${daemon.error || "HTTP " + daemon.status})`}`);
  lines.push(`  bridge  this chat : ${verdict.alive ? `ALIVE (pid ${verdict.pid}, beat ${beatSec}s ago)` : `${verdict.reason.toUpperCase()}${verdict.pid ? " pid " + verdict.pid : ""}`}`);
  if (daemon.ok && isConfidentlyDisconnected(verdict)) {
    lines.push("");
    lines.push("  STOP: THIS CHAT is disconnected from prism MCP (daemon UP, bridge dead).");
    lines.push("     Recover: run `/mcp` and reconnect `prism`, OR restart this chat.");
    lines.push("     (A hook cannot reconnect the harness client -- this is harness-owned.)");
  } else if (!daemon.ok) {
    lines.push("");
    lines.push("  Daemon down -- one-command fix: `node H:/prism/scripts/singleton-service-guard.mjs --fix`");
  }
  process.stdout.write(lines.join("\n") + "\n");
  process.exit(0);
}

const isMain = (() => {
  try {
    const argv1 = (process.argv[1] || "").replace(/\\/g, "/");
    if (!argv1) return false; // node -e / no script path -> never "main" (endsWith("") is always true)
    return import.meta.url === `file://${argv1}` || import.meta.url.endsWith(argv1);
  } catch { return false; }
})();

if (isMain) {
  if (process.argv.includes("--check") || process.argv.includes("--self-check")) {
    cliCheck().catch(() => process.exit(0));
  } else {
    process.stdout.write(
      "mcp-bridge-liveness -- per-chat MCP bridge liveness sentinel.\n" +
      "Usage: node scripts/lib/mcp-bridge-liveness.mjs --check   (self-diagnose this chat)\n",
    );
    process.exit(0);
  }
}
