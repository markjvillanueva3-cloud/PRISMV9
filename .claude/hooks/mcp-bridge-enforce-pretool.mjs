#!/usr/bin/env node
// tier: T0
/**
 * mcp-bridge-enforce-pretool.mjs -- PreToolUse ENFORCEMENT gate for a dead prism
 * MCP bridge (MCP-CLIENT-ENFORCE-MS1, 2026-06-16, slot bravo).
 *
 * WHY (operator 2026-06-16): "chats still losing connection and enforcements in
 * place for chats to check to see if they're connected don't work -- find a way to
 * automate and enforce it." MS0 (tango, 2026-06-13) shipped the per-chat liveness
 * SENTINEL + a UserPromptSubmit BANNER. A banner is advisory `additionalContext` --
 * the model ignores it. This hook is the missing HARD GATE: it DENIES a tool call
 * when this chat is CONFIDENTLY disconnected, so the disconnect cannot be skipped.
 *
 * SAFETY (see scripts/lib/mcp-bridge-enforce.mjs for the invariants):
 *   - NO-DEADLOCK: blocks at most ONCE per `throttleMs` (default 3min); then goes
 *     quiet so the model can use the documented MCP-down fallbacks. A hook cannot
 *     reconnect the harness client, so a permanent block would brick the chat.
 *   - NO-FALSE-POSITIVE: blocks ONLY on pid-dead / stale-heartbeat (per-chat) or a
 *     FRESH fleet enum-cache showing 0 bridges. no-sentinel / unknown-slot /
 *     parse-error / stale-cache are "no signal" -> always allowed.
 *   - AUTO-BROADCAST: on a fleet-wide outage (0 bridges everywhere), writes the
 *     shared reconnect signal so mcp-broadcast-reconnect-inject.mjs nudges all slots.
 *   - FAIL-OPEN: any error -> allow (an enforcement hook must never block on its own bug).
 *
 * Knobs:
 *   PRISM_MCP_ENFORCE_DISABLE=1     advisory-only (never blocks)
 *   PRISM_MCP_ENFORCE_THROTTLE_MS   re-block window (default 180000)
 *
 * @hook PreToolUse  (matcher "*"; wire EARLY so the gate lands before the tool runs)
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import {
  resolveSlotName,
  readBridgeLiveness,
  getLiveDir,
  getStaleMs,
} from "../../scripts/lib/mcp-bridge-liveness.mjs";
import { countBridges } from "./mcp-connectivity-check.mjs";
import {
  decideEnforcement,
  buildBroadcastSignal,
  shouldWriteBroadcast,
  DEFAULT_THROTTLE_MS,
} from "../../scripts/lib/mcp-bridge-enforce.mjs";

const ROOT = (process.env.PRISM_ROOT || "H:/prism").replace(/\/+$/, "");
const STATE_DIR = join(ROOT, ".claude/cache");
const SIGNAL_FILE = join(ROOT, "state/shared/mcp-reconnect-signal.json");
// Tools exempt from the gate (spawn independent subagents w/ own connectivity).
// Sanitized to a strict alternation so the env knob can't inject regex.
const EXEMPT_TOOLS = new RegExp(
  `^(${(process.env.PRISM_MCP_ENFORCE_EXEMPT_TOOLS || "Agent|Task|Workflow").replace(/[^A-Za-z0-9_|]/g, "")})$`,
);

function readStdin() {
  try { return readFileSync(0, "utf8"); } catch { return ""; }
}

function allow() {
  process.stdout.write(JSON.stringify({ continue: true }));
  process.exit(0);
}

function deny(reason) {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: "deny", permissionDecisionReason: reason },
  }));
  process.exit(0);
}

function stateFile(key) {
  return join(STATE_DIR, `mcp-enforce-state-${String(key).replace(/[^a-z0-9_-]/gi, "_")}.json`);
}

function loadLastEnforced(key) {
  try {
    const p = stateFile(key);
    if (!existsSync(p)) return 0;
    const s = JSON.parse(readFileSync(p, "utf8"));
    return Number(s.lastEnforcedMs) || 0;
  } catch { return 0; }
}

function saveLastEnforced(key, ms) {
  try {
    if (!existsSync(STATE_DIR)) mkdirSync(STATE_DIR, { recursive: true });
    writeFileSync(stateFile(key), JSON.stringify({ lastEnforcedMs: ms }));
  } catch { /* fail-soft */ }
}

// Fleet-wide auto-broadcast: write the reconnect signal so every chat's
// mcp-broadcast-reconnect-inject.mjs nudges /mcp. Dedup'd by the existing signal's TTL.
function maybeWriteBroadcast(now) {
  try {
    let existing = null;
    if (existsSync(SIGNAL_FILE)) {
      try { existing = JSON.parse(readFileSync(SIGNAL_FILE, "utf8")); } catch { existing = null; }
    }
    if (!shouldWriteBroadcast(existing, now)) return;
    const sig = buildBroadcastSignal({ now, pid: process.pid });
    if (!existsSync(dirname(SIGNAL_FILE))) mkdirSync(dirname(SIGNAL_FILE), { recursive: true });
    writeFileSync(SIGNAL_FILE, JSON.stringify(sig, null, 2));
  } catch { /* fail-soft -- never break the gate */ }
}

// Cached :3100 health written by mcp-connectivity-check.mjs (UserPromptSubmit, throttled 30s).
// Reading it (cheap file read) lets the broadcast gate distinguish "idle: 0 transient bridges +
// a HEALTHY server" (no /mcp broadcast -- the U-MCP-FALSEPOS-SUPPRESS fix) from a genuine outage.
// Returns true ONLY when the cache is FRESH (<=120s) AND ok===true; otherwise undefined (unknown
// or server-down) so decideEnforcement keeps the legacy broadcast-on-fleet-0 behavior -- real
// server outages still broadcast, only the healthy-server idle false positive is suppressed.
// Default matches mcp-connectivity-check.mjs's STATE_FILE exactly (same tmpdir). Env-overridable
// for deterministic tests (the live machine's real state file must not leak into a test run).
const CONNECTIVITY_STATE = process.env.PRISM_MCP_CONNECTIVITY_STATE_FILE ||
  join(tmpdir(), "prism-hook-state", "mcp-connectivity-state.json");
const HEALTH_CACHE_MAX_AGE_MS = 120_000; // authoritative-fresh window: a <=120s probe is trusted
// Last-known-healthy SUPPRESS window (U-MCP-FALSEPOS-IDLE-BROADCAST, slot golf 2026-06-17).
// ROOT CAUSE (confirmed live 2026-06-17): the UserPromptSubmit health cache only refreshes at
// turn-start (throttled 30s), so a long turn / idle gap ages it past 120s MID-TURN. A PreToolUse
// then hit this gate, readCachedServerUp returned undefined (stale->unknown), countBridges saw 0
// (the NORMAL idle state -- transient stdio->HTTP bridges spawn/serve/exit), and
// decideEnforcement(serverUp:undefined) took the legacy broadcast-on-fleet-0 path -> wrote the
// "every chat disconnected / /mcp reconnect" signal -> false banner FLEET-WIDE on a peak_inflight=1,
// HTTP-200, 45-min-stable :3100. That false broadcast IS the operator's "chats get disconnected
// right away". Fix: a server that probed HEALTHY within this window, with NO positive down-evidence,
// counts as "up" for broadcast SUPPRESSION (never for hard-block). Aligned to the broadcast TTL
// (900s) so the suppress window matches how long one false signal would otherwise persist. A REAL
// outage still surfaces: the next live turn's connectivity-check probes :3100, writes ok:false
// FRESH (<=120s), and that fresh-down cache re-enables the broadcast (the down direction is never
// suppressed beyond the 120s authoritative window). Knob: PRISM_MCP_HEALTH_LASTKNOWN_MAX_AGE_MS.
const HEALTH_LASTKNOWN_MAX_AGE_MS = Math.max(
  HEALTH_CACHE_MAX_AGE_MS,
  Number(process.env.PRISM_MCP_HEALTH_LASTKNOWN_MAX_AGE_MS) || 900_000,
);

// Pure verdict (testable without fs): does the cached /health probe count as "server up" for
// broadcast SUPPRESSION? Returns true = suppress the fleet broadcast; undefined = unknown (let the
// legacy broadcast-on-fleet-0 path decide). NEVER returns false -- a down/unknown server maps to
// undefined so the broadcast path stays enabled (conservative: only positive up-evidence suppresses).
export function cachedServerUpVerdict(lastStatus, ageMs, lastKnownMaxMs = HEALTH_LASTKNOWN_MAX_AGE_MS) {
  if (!Number.isFinite(ageMs) || ageMs < 0) return undefined;
  const ok = !!(lastStatus && lastStatus.ok === true);
  // Authoritative-fresh: a <=120s probe is trusted in the UP direction only (down stays "unknown"
  // here so the broadcast still fires on a genuinely-fresh outage).
  if (ageMs <= HEALTH_CACHE_MAX_AGE_MS) return ok ? true : undefined;
  // Last-known-healthy: a healthy probe within the suppress window still counts as up.
  if (ok && ageMs <= lastKnownMaxMs) return true;
  return undefined; // truly stale (>window) or last-known-down-but-stale -> unknown
}

function readCachedServerUp(now) {
  try {
    if (!existsSync(CONNECTIVITY_STATE)) return undefined;
    const s = JSON.parse(readFileSync(CONNECTIVITY_STATE, "utf8"));
    const age = now - (Number(s.lastProbeAt) || 0);
    return cachedServerUpVerdict(s.lastStatus, age);
  } catch { return undefined; }
}

function main() {
  const env = process.env;
  if (String(env.PRISM_MCP_ENFORCE_DISABLE || "") === "1") return allow();

  const now = Date.now();
  let input = {};
  try { input = JSON.parse(readStdin() || "{}"); } catch { input = {}; }

  // Orchestration tools (Agent/Task/Workflow) spawn INDEPENDENT subagents that
  // manage their OWN MCP connectivity -- gating the parent's spawn does not relate
  // to the parent's dead bridge and would only add friction (it does not stop the
  // parent from silently using THIS chat's dead prism tools, which the direct-tool
  // gating below fully covers). So they are exempt; enforcement still fires on
  // Bash/Read/Edit/Write/Glob/Grep/mcp__prism__* etc. Knob: PRISM_MCP_ENFORCE_EXEMPT_TOOLS.
  const toolName = input.tool_name || input.toolName || "";
  if (EXEMPT_TOOLS.test(toolName)) return allow();

  // NEVER block git/staging operations. A denied `git add`/`git commit` mid-sequence
  // leaves files dangling in a SHARED-tree index where another chat's add/commit
  // absorbs them (operator 2026-06-16: "mcp blocks keep eating stagings for other
  // chats"). Awareness still fires on other tools; git is too stateful+shared to gate.
  const cmd = String((input.tool_input && (input.tool_input.command || input.tool_input.cmd)) || "");
  if (/(^|[\s;&|(])git(\s|$)/.test(cmd)) return allow();

  const cwd = input.cwd || (process.cwd ? process.cwd() : "");
  const slot = resolveSlotName(env, cwd);
  const key = slot || input.session_id || input.sessionId || "unknown";

  // Fast path: a live per-chat sentinel -> connected -> allow (skip the fleet read).
  const verdict = readBridgeLiveness(slot, { liveDir: getLiveDir(env), staleMs: getStaleMs(env), now });
  let fleet = null;
  if (!(verdict && verdict.alive)) {
    // Only consult the fleet enum-cache when this chat is not confidently alive.
    try { fleet = countBridges(env); } catch { fleet = null; }
  }

  const throttleMs = Number(env.PRISM_MCP_ENFORCE_THROTTLE_MS) || DEFAULT_THROTTLE_MS;
  const lastEnforcedMs = loadLastEnforced(key);
  // serverUp from the cached /health probe: when the server is confirmed healthy, a fleet
  // count of 0 transient bridges is IDLE, not an outage -> decideEnforcement suppresses the
  // /mcp reconnect broadcast (U-MCP-FALSEPOS-SUPPRESS). Real server-down still broadcasts.
  const serverUp = readCachedServerUp(now);
  const d = decideEnforcement({ verdict, fleetBridges: fleet, lastEnforcedMs, now, throttleMs, serverUp });

  // Fleet-wide outage auto-broadcasts to ALL chats whether or not we hard-block here
  // (fleet-advisory returns block:false). Dedup'd by the existing signal's TTL.
  if (d.broadcast) maybeWriteBroadcast(now);
  if (!d.block) return allow();

  saveLastEnforced(key, now);
  return deny(d.reason);
}

const isMain = (() => {
  try {
    const argv1 = (process.argv[1] || "").replace(/\\/g, "/");
    if (!argv1) return false;
    return import.meta.url === `file://${argv1}` || import.meta.url.endsWith(argv1);
  } catch { return false; }
})();

if (isMain) {
  try { main(); } catch { allow(); }
}

export { main };
