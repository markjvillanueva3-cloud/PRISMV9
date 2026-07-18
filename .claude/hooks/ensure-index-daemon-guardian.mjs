#!/usr/bin/env node
// tier: T3
/**
 * ensure-index-daemon-guardian.mjs -- keep the warm master-index search daemon up.
 *
 * FLEET-SEARCH-DAEMON-MS0 / U-DAEMON-SELFHEAL (2026-06-14, slot tango).
 *
 * The daemon (scripts/master-index-daemon.mjs, 127.0.0.1:3101) hosts the 262MB
 * master-index sidecar warm so the per-tool graph-inject hooks + subagent search
 * get full-coverage results in ~80ms instead of a multi-second in-process load.
 * install-index-daemon-task.ps1 registers a durable SYSTEM scheduled task, but
 * that needs operator elevation. THIS guardian is the no-elevation self-heal: any
 * chat, on SessionStart + UserPromptSubmit, probes /health and -- if the daemon is
 * down -- spawns it detached. The daemon's own EADDRINUSE-exit-0 guard makes a
 * double-spawn harmless (single-instance), so this is safe to fire fleet-wide.
 *
 * FLEET-WIDE (not slot-gated): the daemon serves every chat, so every chat helps
 * keep it up -- 26 chats collectively ensure it survives any one chat's /compact.
 *
 * ADVISORY ONLY -- always emits {continue:true}, never blocks. Every failure mode
 * (no stdin, probe error, spawn failure) fails soft to a silent continue.
 *
 * Knobs:
 *   PRISM_INDEX_DAEMON_GUARDIAN_DISABLE=1 -- guardian off (no probe, no spawn).
 *   PRISM_INDEX_DAEMON_DISABLE=1          -- daemon disabled fleet-wide -> no-op
 *                                            (do not relaunch a deliberately-off daemon).
 *   PRISM_INDEX_DAEMON_PORT (default 3101), PRISM_INDEX_DAEMON_HOST (127.0.0.1).
 *   PRISM_INDEX_DAEMON_GUARDIAN_THROTTLE_MS (default 60000) -- UserPromptSubmit probe throttle.
 *
 * Sister: scripts/master-index-daemon.mjs (the daemon),
 *   .claude/helpers/install-index-daemon-task.ps1 (durable task installer),
 *   .claude/hooks/golf-slot-reaper-guardian.mjs (the guardian pattern this clones).
 */

import http from "node:http";
import { spawn } from "node:child_process";
import { existsSync, statSync, writeFileSync, mkdirSync, openSync, closeSync, appendFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_PORT = 3101;
const DEFAULT_HOST = "127.0.0.1";
const HEALTH_TIMEOUT_MS = 1000;
const STDIN_DRAIN_TIMEOUT_MS = 250;
const DEFAULT_THROTTLE_MS = 60 * 1000;
const DAEMON_HEAP_MB = 2048;

/** Resolve repo-relative paths from this hook's own location (.claude/hooks/ -> repo root). */
function repoPaths() {
  const here = dirname(fileURLToPath(import.meta.url));
  const repoRoot = join(here, "..", "..");
  return {
    daemonScript: join(repoRoot, "scripts", "master-index-daemon.mjs"),
    stampFile: join(repoRoot, "state", "shared", ".index-daemon-guardian.stamp"),
    logFile: join(repoRoot, "state", "shared", "daemons", "index-daemon.log"),
    ledgerFile: join(repoRoot, "state", "shared", "daemons", "index-daemon-relaunch.jsonl"),
  };
}

/** Drain + parse the hook's stdin JSON, time-bounded (never block on an EOF that won't come). */
function readStdinPayload() {
  return new Promise((resolve) => {
    let done = false, buf = "", timer = null;
    const fin = () => {
      if (done) return;
      done = true;
      if (timer) clearTimeout(timer);
      try { process.stdin.destroy(); } catch { /* already gone */ }
      let parsed = null;
      try { if (buf.trim().startsWith("{")) parsed = JSON.parse(buf); } catch { /* not JSON */ }
      resolve(parsed);
    };
    try {
      timer = setTimeout(fin, STDIN_DRAIN_TIMEOUT_MS);
      process.stdin.setEncoding("utf-8");
      process.stdin.on("data", (d) => { buf += d; });
      process.stdin.on("end", fin);
      process.stdin.on("error", fin);
    } catch { fin(); }
  });
}

/** SessionStart vs UserPromptSubmit -- drives the output hookEventName + the throttle path. */
function eventName(payload) {
  const n = payload && (payload.hook_event_name || payload.hookEventName);
  return n === "UserPromptSubmit" ? "UserPromptSubmit" : "SessionStart";
}

/** HTTP GET :{port}/health, bounded. Resolves true iff a 200 came back. Never throws. */
function probeHealth(host, port, timeoutMs) {
  return new Promise((resolve) => {
    let settled = false;
    const done = (ok) => { if (!settled) { settled = true; resolve(ok); } };
    try {
      const req = http.get({ host, port, path: "/health", timeout: timeoutMs }, (res) => {
        res.resume();
        done(res.statusCode === 200);
      });
      req.on("timeout", () => { try { req.destroy(); } catch { /* noop */ } done(false); });
      req.on("error", () => done(false));
    } catch { done(false); }
  });
}

/** True if the guardian already probed within throttleMs (gates the UserPromptSubmit path). */
function recentlyChecked(stampFile, throttleMs) {
  try { return Date.now() - statSync(stampFile).mtimeMs < throttleMs; } catch { return false; }
}
/** Mark a guardian probe. */
function touchStamp(stampFile) {
  try { mkdirSync(dirname(stampFile), { recursive: true }); writeFileSync(stampFile, new Date().toISOString()); } catch { /* best-effort */ }
}

/** Spawn the daemon detached with a big heap. Returns child pid, or null on failure. The
 *  daemon's own EADDRINUSE-exit-0 guard means a double-spawn is harmless (single instance).
 *
 *  Was `stdio:"ignore"` -> every death reason (server error+exit, uncaughtException,
 *  warm-up failure) was discarded and no log existed, so "the daemon keeps dying" was
 *  undiagnosable folklore. Now stdout+stderr append to state/shared/daemons/index-daemon.log
 *  and each relaunch appends a ledger line (ts, event, pid) for restart-count/timing forensics. */
function spawnDaemon(daemonScript, logFile, ledgerFile, evName) {
  try {
    if (!existsSync(daemonScript)) return null;
    let fd = "ignore";
    try { mkdirSync(dirname(logFile), { recursive: true }); fd = openSync(logFile, "a"); } catch { fd = "ignore"; }
    let child;
    try {
      child = spawn(
        process.execPath,
        ["--max-old-space-size=" + DAEMON_HEAP_MB, daemonScript],
        { detached: true, stdio: ["ignore", fd, fd], windowsHide: true },
      );
    } finally {
      // Parent closes its copy of the fd; the detached child keeps its inherited handle.
      if (typeof fd === "number") { try { closeSync(fd); } catch { /* noop */ } }
    }
    child.unref();
    const pid = child.pid ?? null;
    try {
      appendFileSync(ledgerFile, JSON.stringify({ ts: new Date().toISOString(), event: evName, pid, reason: "health-probe-down" }) + "\n");
    } catch { /* best-effort ledger */ }
    return pid;
  } catch { return null; }
}

/** Emit the verdict. ALWAYS {continue:true}; advisory (if any) rides hookSpecificOutput. */
function emitContinue(evName, additionalContext) {
  const out = additionalContext
    ? { continue: true, hookSpecificOutput: { hookEventName: evName, additionalContext } }
    : { continue: true };
  try { process.stdout.write(JSON.stringify(out)); } catch { /* stdout gone */ }
}

async function main() {
  const payload = await readStdinPayload();
  const evName = eventName(payload);

  // Kill switches: guardian-specific OR whole-daemon-off (don't relaunch a deliberately-off daemon).
  if (process.env.PRISM_INDEX_DAEMON_GUARDIAN_DISABLE === "1"
      || process.env.PRISM_INDEX_DAEMON_DISABLE === "1") {
    emitContinue(evName);
    return;
  }

  const port = parseInt(process.env.PRISM_INDEX_DAEMON_PORT || String(DEFAULT_PORT), 10) || DEFAULT_PORT;
  const host = process.env.PRISM_INDEX_DAEMON_HOST || DEFAULT_HOST;
  const throttleMs = Number(process.env.PRISM_INDEX_DAEMON_GUARDIAN_THROTTLE_MS) > 0
    ? Number(process.env.PRISM_INDEX_DAEMON_GUARDIAN_THROTTLE_MS) : DEFAULT_THROTTLE_MS;
  const { daemonScript, stampFile, logFile, ledgerFile } = repoPaths();

  // UserPromptSubmit fast path: probed within the throttle window -> cheap no-op (stamp mtime read).
  if (evName === "UserPromptSubmit" && recentlyChecked(stampFile, throttleMs)) {
    emitContinue(evName);
    return;
  }

  const healthy = await probeHealth(host, port, HEALTH_TIMEOUT_MS);
  touchStamp(stampFile);

  if (healthy) { emitContinue(evName); return; } // daemon up -> silent (no per-prompt banner)

  const pid = spawnDaemon(daemonScript, logFile, ledgerFile, evName);
  const advisory = pid !== null
    ? `index-daemon guardian: warm search daemon (:${port}) was DOWN -- relaunched detached (pid ${pid}, warming ~2s). Graph-inject hooks + subagent search use the in-process fallback until warm.`
    : `index-daemon guardian: warm search daemon (:${port}) is DOWN and relaunch FAILED (script missing / spawn refused). Searches use the slower in-process fallback. Run: node scripts/master-index-daemon.mjs`;
  emitContinue(evName, advisory);
}

// Run main() only when invoked directly as a hook, NOT when a unit test imports the pure
// helpers (probeHealth / spawnDaemon). Mirrors golf-slot-reaper-guardian's main-guard.
const invokedDirectly = process.argv[1] && process.argv[1].replace(/\\/g, "/").endsWith("ensure-index-daemon-guardian.mjs");
if (invokedDirectly) {
  main().catch(() => emitContinue("SessionStart"));
}
