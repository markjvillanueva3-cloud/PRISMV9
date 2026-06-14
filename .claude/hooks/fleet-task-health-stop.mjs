#!/usr/bin/env node
// tier: T3
/**
 * fleet-task-health-stop.mjs — Stop-hook arm of the scheduled-task health
 * watchdog (scripts/fleet-task-health-watch.mjs).
 *
 * THE GAP. PRISM's crash-prevention safety net is a set of Windows scheduled
 * tasks (Fleet Reaper, Fleet Memory Monitor, Cleanup Orchestrator, …). Nothing
 * watches whether those tasks are themselves healthy — a task disabled by a
 * Windows update, wedged, or erroring is invisible until a chat crashes. The
 * watchdog script audits them; THIS hook is what makes the audit run often
 * enough to matter WITHOUT giving the watchdog its own scheduled task (which
 * would just be one more unwatched task — the watch-the-watchman recursion).
 *
 * A Stop event fires every time any of the 13 fleet chats ends a turn — that
 * is a near-continuous heartbeat. Riding the fleet's Stop stream gives the
 * watchdog dense coverage anchored to nothing but the fleet being alive.
 *
 * WHAT IT DOES, each Stop:
 *   1. Reads the watchdog's most recent telemetry row (a fast local file read,
 *      no PowerShell). If that row is fresh and its level is warn/critical, the
 *      hook injects a one-line advisory into THIS Stop's verdict so the
 *      stopping chat sees the degraded safety net immediately.
 *   2. Throttled (stamp file): if no peer chat has kicked a watchdog run within
 *      STOP_THROTTLE_MS, it spawns one DETACHED to refresh the telemetry for
 *      the next Stop. 13 simultaneous Stops collapse to ONE watchdog run — no
 *      PowerShell fork storm.
 *
 * ADVISORY ONLY — ALWAYS emits {continue:true}; NEVER blocks Stop. The watchdog
 * itself never kills or registers tasks; this hook never does either. The
 * advisory it shows is from the LAST completed audit (a one-Stop lag), which is
 * fine: scheduled-task health changes slowly — a disabled task stays disabled.
 *
 * Knob: PRISM_FLEET_TASKHEALTH_DISABLE=1 → this hook is a silent no-op (same
 * knob the watchdog script honours).
 *
 * Wired: .claude/settings.json Stop chain (advisory, ~3s timeout).
 */

import { spawn } from "node:child_process";
import { existsSync, readFileSync, statSync, writeFileSync, mkdirSync, renameSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** Collapse a burst of near-simultaneous fleet Stops into one watchdog run. */
const STOP_THROTTLE_MS = 5 * 60 * 1000;
/** Ignore a telemetry row older than this — too stale to trust as "current". */
const TELEMETRY_FRESH_MS = 30 * 60 * 1000;
/** Upper bound on the stdin drain — never wait on an EOF that won't come. */
const STDIN_DRAIN_TIMEOUT_MS = 200;

/** Resolve repo-relative paths from this hook's own location (worktree-safe). */
function repoPaths() {
  const here = dirname(fileURLToPath(import.meta.url));
  // .claude/hooks/ -> .claude/ -> repo root
  const repoRoot = join(here, "..", "..");
  return {
    watchdogScript: join(repoRoot, "scripts", "fleet-task-health-watch.mjs"),
    telemetryFile: join(repoRoot, "state", "shared", "fleet-task-health-history.jsonl"),
    stampFile: join(repoRoot, "state", "shared", ".fleet-task-health-stop.stamp"),
  };
}

/** Emit the hook verdict. ALWAYS {continue:true} — this hook never blocks Stop. */
function emitContinue(additionalContext) {
  const out = additionalContext
    ? { continue: true, hookSpecificOutput: { hookEventName: "Stop", additionalContext } }
    : { continue: true };
  try { process.stdout.write(JSON.stringify(out)); } catch { /* stdout gone — nothing to do */ }
}

/**
 * Drain stdin, time-bounded. The payload is not needed (the watchdog audit is
 * identical regardless of which chat stopped); draining just lets the harness's
 * write complete cleanly and bounds the wait so the hook can never hang.
 */
function drainStdin() {
  return new Promise((resolve) => {
    let done = false;
    let timer = null;
    const fin = () => {
      if (done) return;
      done = true;
      if (timer) clearTimeout(timer);
      try { process.stdin.destroy(); } catch { /* already gone */ }
      resolve();
    };
    try {
      timer = setTimeout(fin, STDIN_DRAIN_TIMEOUT_MS);
      process.stdin.on("data", () => { /* discard */ });
      process.stdin.on("end", fin);
      process.stdin.on("error", fin);
    } catch { fin(); }
  });
}

/** True if a peer chat already kicked a watchdog run within the throttle window. */
function recentlySwept(stampFile) {
  try {
    return Date.now() - statSync(stampFile).mtimeMs < STOP_THROTTLE_MS;
  } catch {
    return false; // no stamp / unreadable → treat as "not throttled"
  }
}

/**
 * Mark that a watchdog run was just kicked, so peer chats stopping next throttle.
 *
 * tmp + rename for cross-process atomicity. A direct `writeFileSync` is NOT
 * atomic across processes on Windows — two simultaneous Stop hooks could
 * partially overlap and leave a corrupt timestamp string in the stamp file.
 * Rename-into-place is the standard atomic-publish pattern (mirrors
 * `writeLedger` in fleet-task-health-watch.mjs). The check-then-act race
 * (both peers see stale stamp → both spawn) is a separate, BOUNDED concern:
 * at worst it doubles a single throttle interval's spawn — the NEXT Stop
 * window sees the fresh stamp and short-circuits as designed.
 */
function touchStamp(stampFile) {
  try {
    mkdirSync(dirname(stampFile), { recursive: true });
    const tmp = stampFile + ".tmp." + process.pid;
    writeFileSync(tmp, new Date().toISOString());
    renameSync(tmp, stampFile);
  } catch { /* best-effort — a missed stamp just means the next Stop also kicks */ }
}

/**
 * Read the watchdog's most recent telemetry row. Returns the parsed last JSONL
 * line, or null when the file is missing / empty / unparseable. Never throws.
 */
function readLastTelemetry(telemetryFile) {
  try {
    if (!existsSync(telemetryFile)) return null;
    const lines = readFileSync(telemetryFile, "utf8").trim().split(/\r?\n/).filter(Boolean);
    if (lines.length === 0) return null;
    return JSON.parse(lines[lines.length - 1]);
  } catch {
    return null;
  }
}

/**
 * Build the Stop-verdict advisory string from a telemetry row, or null when
 * there is nothing worth surfacing (clean / stale / malformed row).
 * Pure function — no IO.
 */
export function buildAdvisory(row, nowMs) {
  if (!row || typeof row !== "object") return null;
  if (row.level !== "warn" && row.level !== "critical") return null;
  const tsMs = row.ts ? Date.parse(row.ts) : NaN;
  if (!Number.isFinite(tsMs) || (nowMs - tsMs) > TELEMETRY_FRESH_MS) return null;

  const degraded = Array.isArray(row.degraded) ? row.degraded : [];
  const missing = Array.isArray(row.missing) ? row.missing : [];
  const parts = [];
  const seen = new Set();   // exact task-name dedup (not prefix-fragile)
  for (const d of degraded.slice(0, 5)) {
    if (d && d.name && !seen.has(d.name)) {
      parts.push(`${d.name}=${d.status || "degraded"}`);
      seen.add(d.name);
    }
  }
  for (const m of missing.slice(0, 5)) {
    if (m && !seen.has(m)) {
      parts.push(`${m}=MISSING`);
      seen.add(m);
    }
  }
  const detail = parts.length ? parts.join(", ") : "see telemetry";
  const tag = row.level === "critical" ? "CRITICAL" : "WARN";
  const healthy = Number.isFinite(row.healthyCount) ? row.healthyCount : "?";
  const total = Number.isFinite(row.taskCount) ? row.taskCount : "?";
  // Disclose the audit's age. The verdict is the LAST completed watchdog run,
  // NOT live — a task you just enabled/registered still reads stale until the
  // next run writes a fresh telemetry row (up to TELEMETRY_FRESH_MS old). An
  // un-dated WARN reads as live truth, so it cries wolf: "X disabled" persists
  // for minutes after you fixed X. Stamping the age turns it into an honest,
  // self-dating signal — the reader knows whether to trust it or re-audit.
  // tsMs is finite here (guarded by the freshness check above). (2026-06-09 golf)
  const ageMin = Math.max(0, Math.round((nowMs - tsMs) / 60000));
  const ageStr = ageMin < 1 ? "just now" : `${ageMin}m ago`;
  // G10: surface the watchdog's auto-re-enable outcome so the stopping chat sees
  // a self-heal (or a still-needs-elevation task) inline, not just buried in the
  // chat-bus. `healed` were restored this audit (verify next audit); `failed`
  // need an ELEVATED Enable-ScheduledTask. Defensive against any row shape.
  const ar = (row.autoReenable && typeof row.autoReenable === "object") ? row.autoReenable : null;
  let healNote = "";
  if (ar) {
    const healed = Array.isArray(ar.healed) ? ar.healed : [];
    const failed = Array.isArray(ar.failed) ? ar.failed : [];
    if (healed.length) {
      healNote += ` [auto-re-enabled ${healed.length}: ${healed.slice(0, 3).join(", ")}${healed.length > 3 ? "..." : ""} -- verify next audit]`;
    }
    if (failed.length) {
      const names = failed.map((f) => f && f.name).filter(Boolean).slice(0, 3).join(", ");
      healNote += ` [${failed.length} still need an ELEVATED Enable-ScheduledTask: ${names}]`;
    }
  }
  return `⚠ PRISM scheduled-task safety net ${tag} (audit ${ageStr}) — ${healthy}/${total} tasks healthy · ${detail}. `
    + `A degraded reaper/monitor task means crashes go un-prevented. `
    + `Audit: node scripts/fleet-task-health-watch.mjs --json · `
    + `re-register from an ELEVATED shell via .claude/helpers/install-<task>-task.ps1.`
    + healNote;
}

async function main() {
  await drainStdin();

  if (process.env.PRISM_FLEET_TASKHEALTH_DISABLE === "1") {
    emitContinue();
    return;
  }

  const { watchdogScript, telemetryFile, stampFile } = repoPaths();

  if (!existsSync(watchdogScript)) {
    // A missing watchdog script is almost always a wrong relative-path bug,
    // not a real "feature not deployed" state — surface it.
    emitContinue(`fleet-task-health: watchdog script not found at ${watchdogScript} — Stop-hook arm inactive`);
    return;
  }

  // Surface the most recent audit verdict in THIS Stop (a fast file read).
  const advisory = buildAdvisory(readLastTelemetry(telemetryFile), Date.now());

  // Throttle: if a peer chat kicked a watchdog run within STOP_THROTTLE_MS,
  // ride on it — do not add another PowerShell-forking audit.
  if (recentlySwept(stampFile)) {
    emitContinue(advisory || undefined);
    return;
  }

  try {
    const child = spawn(
      process.execPath,
      [watchdogScript, "--once"],
      { detached: true, stdio: "ignore", windowsHide: true },
    );
    child.unref(); // let this hook exit immediately; the audit lives on its own
    // Stamp after the spawn call returns. A synchronous spawn failure throws
    // to the catch below and is NOT stamped; an async post-fork error is not
    // separately handled here (it is vanishingly rare — process.execPath and
    // watchdogScript existence are both pre-checked — and at worst throttles
    // peers for one window, which the next window recovers).
    touchStamp(stampFile);
    const launched = `fleet-task-health: scheduled-task audit launched (detached, pid ${child.pid ?? "?"})`;
    emitContinue(advisory ? `${advisory}\n${launched}` : launched);
  } catch {
    // A spawn failure must NEVER block Stop — emit continue (with whatever
    // advisory the last telemetry gave) and move on.
    emitContinue(advisory || undefined);
  }
}

// Run main() only when invoked as the hook entry point — NOT when this module
// is imported by a test (importing must not trigger the stdin drain / spawn).
// The last-resort .catch() still guarantees a {continue:true} verdict on any
// unforeseen rejection (mirrors fleet-reaper-stop.mjs's net).
const invokedAsHook = (() => {
  try {
    return !!process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
  } catch { return false; }
})();
if (invokedAsHook) main().catch(() => emitContinue());
