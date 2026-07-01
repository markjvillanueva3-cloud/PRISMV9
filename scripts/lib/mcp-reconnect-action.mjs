#!/usr/bin/env node
// scripts/lib/mcp-reconnect-action.mjs — MCP-AUTORECONNECT-MS0 / U-MCP-RECONNECT-ACTION
// (alpha, 2026-05-31). Operator rule: "if any chat slot is disconnected they automatically
// connect and check each turn to ensure you guys are always connected."
//
// THE GAP THIS CLOSES (R8 — read before write):
//   • mcp-connectivity-check.mjs  (UserPromptSubmit, every turn, throttled) — DETECTS a down
//     daemon + injects the loud banner, but only ADVISES; it never reconnects.
//   • mcp-daemon-autostart.mjs    (SessionStart ONLY) — health-checks + spawns the daemon, but
//     does NOT run per-turn, so a daemon that dies MID-session is never auto-restarted.
//   → Result: the daemon drops mid-session and every chat shows the banner, turn after turn,
//     until an operator manually runs the restart. This module is the missing ACTION half:
//     a fleet single-flight, throttled, detached reconnect the per-turn hook calls when down.
//
// WHY A NEW LIB (R7 — not the naive option): the naive fix is to also wire
// mcp-daemon-autostart.mjs into UserPromptSubmit. That is WORSE — it polls up to 5 s
// synchronously (5 s of latency on EVERY turn the daemon is down) AND has no cross-chat lock
// (13 concurrent chats each poll + spawn = a spawn-storm + port-bind race). This lib instead:
//   • reuses the per-turn hook's EXISTING probe (the caller passes `up` — no double-probe)
//   • spawns DETACHED (zero per-turn latency — daemon is ready next turn, honest in the banner)
//   • single-flights across the whole fleet via an O_EXCL lockfile whose TTL doubles as the
//     throttle (one host, shared H: fs, sole user → O_EXCL is reliable)
//   • reuses mcp-daemon-autostart's proven spawn target (mcp-server-daemon.mjs start)
//
// DESIGN (mirrors mcp-connectivity-check.mjs + path-ledger.mjs conventions for R11):
//   • PURE decision core (`decideReconnect`) + injected-deps orchestrator (`maybeReconnect`)
//   • FAIL-SOFT — this is reliability plumbing, never a correctness gate. Every IO is wrapped;
//     the orchestrator NEVER throws into a hook. Worst case = no reconnect this turn (retry next).
//   • DETERMINISTIC — no Ollama / network dependency in the decision path.
//
// Knobs: PRISM_MCP_AUTORECONNECT_DISABLE=1 (off), PRISM_MCP_AUTORECONNECT_TTL_MS=N
//        (single-flight + throttle window, default 60000), PRISM_MCP_DAEMON_HELPER=<path>.

import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { spawn } from "node:child_process";

const PRISM_ROOT = process.env.PRISM_ROOT || "H:/prism";

export const DEFAULT_DAEMON_HELPER = process.env.PRISM_MCP_DAEMON_HELPER
  || `${PRISM_ROOT}/.claude/helpers/mcp-server-daemon.mjs`;
export const DEFAULT_LOCK_PATH = `${PRISM_ROOT}/state/shared/.mcp-reconnect.lock`;
export const DEFAULT_LOCK_TTL_MS = 60000;     // single-flight + throttle window (≈ daemon warmup budget)
export const DEFAULT_HEALTH_URL = (process.env.PRISM_MCP_URL || "http://127.0.0.1:3100").replace(/\/+$/, "") + "/health";
export const DEFAULT_PROBE_TIMEOUT_MS = 3000;

// ── pure decision core ────────────────────────────────────────────────────────
// Given the (already-probed) up state + the current reconnect-lock, decide whether THIS
// caller should spawn. The lock's age is BOTH the single-flight guard (another chat is
// reconnecting) AND the throttle (don't re-spawn within the TTL of the last attempt).
//   up        : boolean — daemon reachable? (caller's probe result)
//   now       : number  — epoch ms
//   lock      : { startedAt:number, pid?:number } | null — parsed lockfile, or null if absent
//   ttlMs     : number  — lock TTL / throttle window
// returns { shouldReconnect:boolean, reason:string, lockAgeMs?:number }
export function decideReconnect({ up, now, lock, ttlMs = DEFAULT_LOCK_TTL_MS } = {}) {
  if (up) return { shouldReconnect: false, reason: "already-connected" };
  if (lock && Number.isFinite(lock.startedAt)) {
    const age = now - lock.startedAt;
    // A future-dated lock (clock skew across writers) is treated as fresh → defer (never spawn).
    if (age < 0) return { shouldReconnect: false, reason: "reconnect-in-flight", lockAgeMs: age };
    if (age < ttlMs) return { shouldReconnect: false, reason: "reconnect-in-flight", lockAgeMs: age };
    return { shouldReconnect: true, reason: "stale-lock-reclaim", lockAgeMs: age }; // prior attempt died/timed out
  }
  return { shouldReconnect: true, reason: "no-lock" };
}

// ── unified BOOTING-aware restart predicate (FIX4/6 core — MCP-ALWAYS-CONNECTED) ──
// The flap engine root-caused 2026-06-02: the MCP server cold-boots ~50s (64 dispatchers /
// ~700MB engines). The three uncoordinated restarters (per-chat reconnect hook, supervisor,
// watchdog) each see /health!=200 during that window and respawn/kill — resetting the boot
// clock → perpetual flap. This predicate is the single source of truth all three consult so a
// process that EXISTS-but-is-not-yet-healthy is classified BOOTING (leave alone: never respawn,
// never kill) rather than DEAD. decideReconnect above is the (untouched) seed; this generalizes
// it to consume the unified port lock's bootStartedAt + an owner-liveness signal.
//
// BOOT_GRACE_MS is the cold-boot budget: measured boot ~50s, +margin = 90s. A genuinely DEAD
// server (owner PID gone) short-circuits the grace so a crash-during-boot is NOT left to rot for
// 90s. Floored at 1000ms (resolveBootGraceMs) — the 2026-05-18 heartbeat 8ms-typo broke the
// fleet; a sub-second grace would re-open the flap, so a fat-finger can never disable the guard.
export const BOOT_GRACE_MS = 90000;

// Resolve the boot-grace window from env with a hard 1000ms floor (anti fat-finger).
export function resolveBootGraceMs(env = process.env) {
  const v = Number(env.PRISM_MCP_BOOT_GRACE_MS);
  return (Number.isFinite(v) && v >= 1000) ? v : BOOT_GRACE_MS;
}

// MCP-RESILIENCE FIX-3 (2026-06-04): is the watchdog boot-guard enabled? DEFAULT-ON —
// disabled ONLY by PRISM_MCP_WATCHDOG_BOOTGUARD=0. Flipped from the old default-off once
// the boot-grace PRODUCER (bootStartedAt stamped at child spawn) shipped fleet-wide
// (U-BOOTGRACE-PRODUCER-WIRE: supervisor.mjs spawnChild + daemon.mjs start), satisfying the
// original "co-enable producer+consumer together after both reviewed" precondition. Pure env
// read (no I/O, never throws). Canonical definition for the watchdog gate + this test suite.
export function bootGuardEnabled(env = process.env) {
  return env.PRISM_MCP_WATCHDOG_BOOTGUARD !== "0";
}

// PURE three-state decision. The caller injects healthUp (probed) + ownerAlive (PID liveness via
// isOwnerAlive) so this stays deterministic + I/O-free. Returns:
//   { state:'healthy'|'booting'|'dead', shouldRestart:boolean, reason:string, bootAgeMs?:number }
//   healthUp   : boolean             — is /health 2xx-4xx? (a listening server)
//   lock       : { bootStartedAt?, pid?, startedAt? } | null — parsed unified port lock
//   now        : number              — epoch ms
//   env        : object              — source for the PRISM_MCP_BOOT_GRACE_MS knob (default process.env)
//   bootGraceMs: number              — cold-boot budget; DEFAULTS to resolveBootGraceMs(env) so the
//                                       PRISM_MCP_BOOT_GRACE_MS knob is live WITHOUT every caller
//                                       threading it. Pass explicitly only to override the env.
//   ownerAlive : boolean|undefined   — is lock.pid a live process? (undefined = unknown/uncheckable).
//                                       NOTE: undefined WITHIN the grace window → BOOTING (defer) — an
//                                       un-checkable owner is left alone until grace exhausts (bounded,
//                                       NEVER forever). Wire ownerAlive (isOwnerAlive) so a confirmed
//                                       DEAD owner short-circuits the grace immediately ('owner-dead-in-grace').
export function decideRestart({ healthUp, lock, now, env = process.env, bootGraceMs = resolveBootGraceMs(env), ownerAlive } = {}) {
  if (healthUp) return { state: "healthy", shouldRestart: false, reason: "healthy" };
  // ── down from here ──
  const bootAt = lock && Number.isFinite(lock.bootStartedAt) ? lock.bootStartedAt : null;
  if (bootAt !== null) {
    const bootAgeMs = now - bootAt;
    // future-dated boot stamp (clock skew across writers) → treat as fresh → defer, never restart.
    if (bootAgeMs < 0) return { state: "booting", shouldRestart: false, reason: "peer-booting-clockskew", bootAgeMs };
    if (bootAgeMs < bootGraceMs) {
      // within the cold-boot budget. A DEAD owner short-circuits the grace (don't wait on a corpse).
      if (ownerAlive === false) return { state: "dead", shouldRestart: true, reason: "owner-dead-in-grace", bootAgeMs };
      return { state: "booting", shouldRestart: false, reason: "peer-booting", bootAgeMs };
    }
    // grace exhausted and STILL down → boot wedged/hung → allow exactly-one restart (bounded, no deadlock).
    return { state: "dead", shouldRestart: true, reason: "boot-grace-exhausted", bootAgeMs };
  }
  // No boot stamp in the lock. A live-but-unhealthy owner with no stamp is a WEDGED server (watchdog
  // territory) — restart it; never defer indefinitely on an unprovable boot. A malformed/legacy lock
  // is likewise restartable. (The supervisor always stamps bootStartedAt at spawn, so a real boot has one.)
  return { state: "dead", shouldRestart: true, reason: lock ? "no-boot-stamp" : "no-lock" };
}

// ── lock primitive (real fs; injectable) ──────────────────────────────────────
// Acquire the single-flight lock with O_EXCL ("wx"). If a STALE lock blocks us and
// reclaimStale is set, unlink it once and retry. Returns true iff WE now hold the lock.
// Fail-soft: any unexpected fs error → false (we simply don't reconnect this turn).
export function acquireReconnectLock(lockPath, info, opts = {}) {
  const reclaimStale = !!opts.reclaimStale;
  const writeExclImpl = opts.writeExclImpl
    || ((p, data) => { fs.writeFileSync(p, data, { flag: "wx" }); }); // wx = O_CREAT|O_EXCL → throws if exists
  const unlinkImpl = opts.unlinkImpl || ((p) => { try { fs.unlinkSync(p); } catch { /* already gone */ } });
  const mkdirImpl = opts.mkdirImpl || ((d) => { try { fs.mkdirSync(d, { recursive: true }); } catch { /* swallow */ } });
  const payload = JSON.stringify(info);
  try { mkdirImpl(path.dirname(lockPath)); } catch { /* swallow */ }
  try {
    writeExclImpl(lockPath, payload);
    return true;
  } catch (e) {
    if (e && e.code === "EEXIST" && reclaimStale) {
      unlinkImpl(lockPath);
      try { writeExclImpl(lockPath, payload); return true; }
      catch { return false; } // lost the reclaim race to a peer — fine
    }
    return false;
  }
}

// ── unified port lock (FIX4/6 artifact — read/write/liveness; injectable) ─────
// The single coordination point all three restarters consult. Distinct from the per-chat
// .mcp-reconnect.lock (single-flight throttle for the HOOK only): this lock carries the
// authoritative server state — who owns :3100, when its boot started — so a watchdog/hook can
// observe BOOTING (via decideRestart) before killing/respawning. ACQUISITION is first-writer-wins
// via the existing acquireReconnectLock(O_EXCL); the OWNER (supervisor) refreshes via writePortLock.
export const DEFAULT_PORT_LOCK_PATH = `${PRISM_ROOT}/state/shared/.mcp-server-3100.lock`;

// Read + parse the unified port lock (fail-soft → null on missing/garbage). Injectable reader.
export function readPortLock(lockPath = DEFAULT_PORT_LOCK_PATH, opts = {}) {
  const readImpl = opts.readImpl || ((p) => fs.readFileSync(p, "utf8"));
  try {
    const obj = JSON.parse(readImpl(lockPath));
    return (obj && typeof obj === "object") ? obj : null;
  } catch { return null; }
}

// Owner's refresh/update of the port lock (non-exclusive overwrite — first-writer already won via
// acquireReconnectLock). Stamps the canonical fields. Fail-soft → false. Injectable writer.
export function writePortLock(info = {}, lockPath = DEFAULT_PORT_LOCK_PATH, opts = {}) {
  const writeImpl = opts.writeImpl || ((p, d) => fs.writeFileSync(p, d));
  const mkdirImpl = opts.mkdirImpl || ((d) => { try { fs.mkdirSync(d, { recursive: true }); } catch { /* swallow */ } });
  try {
    mkdirImpl(path.dirname(lockPath));
    writeImpl(lockPath, JSON.stringify({
      pid: info.pid,
      startedAt: info.startedAt,
      bootStartedAt: info.bootStartedAt,
      reason: info.reason,
      role: info.role,
    }));
    return true;
  } catch { return false; }
}

// Liveness probe for a lock-owner PID (process.kill(pid, 0) — signal 0 only checks existence).
// Returns true (alive), false (gone), or undefined (uncheckable: bad pid). EPERM = exists but not
// ours → alive. Injectable killImpl for hermetic tests (process.kill is otherwise a real syscall).
export function isOwnerAlive(pid, opts = {}) {
  if (!Number.isInteger(pid) || pid <= 0) return undefined;
  const killImpl = opts.killImpl || ((p, sig) => process.kill(p, sig));
  try { killImpl(pid, 0); return true; }
  catch (e) { return (e && e.code === "EPERM") ? true : false; }
}

// ── daemon spawn (real; injectable) ───────────────────────────────────────────
// Spawn the shared MCP daemon DETACHED (mirrors mcp-daemon-autostart.mjs exactly).
// Fire-and-forget: the daemon warms in the background and is ready on a subsequent turn.
// Returns { spawned:boolean, pid?:number, reason:string }.
export function spawnDaemon(daemonHelper = DEFAULT_DAEMON_HELPER, opts = {}) {
  const existsImpl = opts.existsImpl || fs.existsSync;
  const spawnImpl = opts.spawnImpl || ((cmd, args, o) => spawn(cmd, args, o));
  let present = false;
  try { present = existsImpl(daemonHelper); } catch { present = false; }
  if (!present) return { spawned: false, reason: "daemon-helper-missing" }; // R12 — honest, not a fake success
  try {
    const child = spawnImpl(process.execPath, [daemonHelper, "start"], {
      detached: true, stdio: "ignore", windowsHide: true,
    });
    try { child.unref(); } catch { /* unref optional */ }
    return { spawned: true, pid: child && child.pid, reason: "spawned" };
  } catch (e) {
    return { spawned: false, reason: `spawn-error: ${e && e.message ? e.message : e}` };
  }
}

// ── orchestrator (fail-soft; the per-turn hook calls THIS) ─────────────────────
// Given the caller's already-known `up` state (reuse the connectivity hook's probe — no
// double-probe), single-flight a detached reconnect. NEVER throws.
//   opts.up        : boolean | undefined — if undefined, probeDaemon() is run (CLI path)
//   opts.now       : ()=>number
//   opts.lockPath, opts.ttlMs, opts.daemonHelper
//   opts.readLockImpl(path)->lock|null, opts.acquireImpl(path,info,o)->bool,
//   opts.spawnDaemonImpl(helper,o)->{spawned,...}, opts.env, opts.probeImpl
// returns { ok:true, connected:boolean|null, action, reason, lockAgeMs?, pid? }
export function maybeReconnect(opts = {}) {
  try {
    const env = opts.env || process.env;
    if (String(env.PRISM_MCP_AUTORECONNECT_DISABLE || "") === "1") {
      return { ok: true, connected: null, action: "disabled", reason: "disabled" };
    }
    const now = typeof opts.now === "function" ? opts.now : () => Date.now();
    const ttlMs = Number(env.PRISM_MCP_AUTORECONNECT_TTL_MS) || opts.ttlMs || DEFAULT_LOCK_TTL_MS;
    const lockPath = opts.lockPath || DEFAULT_LOCK_PATH;
    const daemonHelper = opts.daemonHelper || DEFAULT_DAEMON_HELPER;

    // Reuse the caller's probe when provided. Accept BOTH `up` (this module's field) AND `ok`
    // (the field name mcp-connectivity-check.mjs's probe result already uses — line 122/136 of
    // that hook return `{ ok, status, error }`). This defuses the integration seam where the
    // per-turn hook naturally passes its `result.ok`: maybeReconnect({ ok: result.ok }) works,
    // and a `{ up: result.up }` typo (result.up === undefined) no longer silently falls through
    // to the down-default. Caller MUST pass a boolean AND should only call when down; the
    // probeImpl fallback is a last-resort safety, never the intended path. (R11 + Arm-B P1.)
    let up = typeof opts.up === "boolean"
      ? opts.up
      : (typeof opts.ok === "boolean" ? opts.ok : undefined);
    if (typeof up !== "boolean") {
      const probe = (opts.probeImpl || probeDaemonSync)();
      up = !!(probe && probe.up);
    }
    if (up) return { ok: true, connected: true, action: "none", reason: "already-connected" };

    const readLock = opts.readLockImpl
      || ((p) => { try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return null; } });
    const lock = readLock(lockPath);
    const decision = decideReconnect({ up: false, now: now(), lock, ttlMs });
    if (!decision.shouldReconnect) {
      return { ok: true, connected: false, action: "skip", reason: decision.reason, lockAgeMs: decision.lockAgeMs };
    }

    const acquire = opts.acquireImpl || acquireReconnectLock;
    const got = acquire(lockPath, { pid: process.pid, startedAt: now() }, { reclaimStale: decision.reason === "stale-lock-reclaim" });
    if (!got) return { ok: true, connected: false, action: "skip", reason: "lock-race-lost" };

    const spawnRes = (opts.spawnDaemonImpl || spawnDaemon)(daemonHelper, opts);
    return {
      ok: true,
      connected: false,
      action: spawnRes.spawned ? "spawned" : "spawn-failed",
      reason: spawnRes.reason,
      pid: spawnRes.pid,
    };
  } catch (e) {
    // Absolute fail-soft contract: a hook calling this must never break a turn.
    return { ok: false, connected: null, action: "error", reason: `internal: ${e && e.message ? e.message : e}` };
  }
}

// ── self-probe (used by the CLI / SessionStart path; the per-turn hook passes its own) ──
// Synchronous-style Promise probe of /health. 2xx-4xx (listening) = up; 5xx / refused / timeout = down.
export function probeDaemon({ url = DEFAULT_HEALTH_URL, timeoutMs = DEFAULT_PROBE_TIMEOUT_MS, httpClient = http } = {}) {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (r) => { if (!settled) { settled = true; resolve(r); } };
    try {
      const u = new URL(url);
      const req = httpClient.request(
        { method: "GET", hostname: u.hostname, port: u.port || 80, path: u.pathname || "/health", timeout: timeoutMs },
        (res) => finish({ up: res.statusCode < 500, status: res.statusCode, error: null }),
      );
      req.on("timeout", () => { try { req.destroy(); } catch { /* */ } finish({ up: false, status: null, error: "timeout" }); });
      req.on("error", (e) => finish({ up: false, status: null, error: (e && (e.code || e.message)) || "error" }));
      req.end();
    } catch (e) {
      finish({ up: false, status: null, error: `setup: ${e && e.message ? e.message : e}` });
    }
  });
}

// Best-effort synchronous probe wrapper for maybeReconnect's CLI fallback. The async
// probeDaemon is preferred; this returns { up:false } so the CLI errs toward attempting a
// reconnect rather than a false "connected" when no probe was supplied. The CLI itself awaits
// probeDaemon and passes a concrete `up` — this is only the no-probe-supplied safety default.
function probeDaemonSync() {
  return { up: false, status: null, error: "no-probe-supplied" };
}

// One-line banner addendum for the connectivity hook to append after its disconnect banner.
export function renderReconnectLine(result) {
  if (!result) return "";
  switch (result.action) {
    case "spawned":
      return `   🔄 auto-reconnect: daemon (re)start initiated this turn (pid ${result.pid ?? "?"}) — should be reachable within a turn or two.`;
    case "skip":
      return result.reason === "lock-race-lost" || result.reason === "reconnect-in-flight"
        ? "   🔄 auto-reconnect: another chat is already reconnecting (single-flight) — should recover shortly."
        : `   🔄 auto-reconnect: skipped (${result.reason}).`;
    case "spawn-failed":
      return `   ⚠ auto-reconnect: spawn failed (${result.reason}) — run \`node H:/prism/scripts/mcp-reconnect.mjs\` or restart the daemon manually.`;
    case "disabled":
      return "";
    case "error":
      return `   ⚠ auto-reconnect: internal error (${result.reason}) — non-fatal.`;
    default:
      return "";
  }
}
