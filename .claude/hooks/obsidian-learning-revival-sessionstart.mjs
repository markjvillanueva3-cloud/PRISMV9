#!/usr/bin/env node
// tier: T3
/**
 * obsidian-learning-revival-sessionstart.mjs — SessionStart arm of the
 * no-elevation offline context-learning revival actuator
 * (scripts/obsidian-learning-revival.mjs).
 *
 * THE GAP. PRISM compounds context offline via the Hermes memory-synthesis
 * engines (nightly dream-cycle cross-memo connection discovery + weekly
 * self-reflect). Those are driven by Windows scheduled tasks that can go dark
 * (observed 2026-06-08: both `Disabled`, dream output 4 nights stale).
 * `fleet-task-health-watch` DETECTS the dark task and names the elevated
 * re-enable; the revival actuator runs the ENGINE directly (no elevation) when
 * the task is dark AND the period's output is behind. THIS hook is what makes
 * the actuator run often enough to matter WITHOUT its own scheduled task (which
 * would just be one more dark-able task).
 *
 * WHY SessionStart (not Stop). The learning loop is a DAILY/WEEKLY cadence —
 * a session boot is the natural beat: a human is now working, so today's fresh
 * memories exist to synthesize, and one cheap freshness check + (rare) engine
 * run guarantees the loop is lit whenever work happens. Riding Stop (like the
 * task-health audit) would run synthesis far too often. The actuator is
 * idempotent: a same-day dream file ⇒ instant skip, so booting many sessions a
 * day costs one stat() each, not one synthesis each.
 *
 * WHAT IT DOES, each SessionStart:
 *   1. Throttled (stamp file): if a peer chat already kicked a revival within
 *      THROTTLE_MS, skip — 26 simultaneous boots collapse to ONE actuator run,
 *      no PowerShell/engine fork storm.
 *   2. Otherwise spawn the actuator DETACHED (`--once` semantics). It samples
 *      the live task state, checks output freshness, and ONLY runs an engine
 *      when the output is genuinely behind. Fail-soft: a spawn failure is
 *      swallowed; SessionStart is NEVER blocked.
 *   3. Surfaces the actuator's last telemetry row (a fast local file read) as a
 *      one-line SessionStart advisory when the last pass revived/failed.
 *
 * ADVISORY ONLY — ALWAYS emits a SessionStart continue verdict; NEVER blocks.
 * The actuator never enables/registers a scheduled task (that needs elevation,
 * and the detector owns naming it); this hook never does either.
 *
 * Knob: PRISM_OBSIDIAN_REVIVAL_DISABLE=1 → silent no-op (same knob the actuator
 * script honours; with it set the actuator also refuses to spawn engines).
 *
 * Wired: settings.json SessionStart chain (advisory, ~3s timeout).
 */

import { spawn } from "node:child_process";
import { existsSync, readFileSync, statSync, writeFileSync, mkdirSync, renameSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** Collapse a burst of near-simultaneous fleet boots into one actuator run. */
const THROTTLE_MS = 30 * 60 * 1000;   // 30 min — daily loop needs no tighter
/** Ignore a telemetry row older than this — too stale to surface as "current". */
const TELEMETRY_FRESH_MS = 6 * 60 * 60 * 1000;  // 6h — a daily loop's "recent"
/** Upper bound on the stdin drain — never wait on an EOF that won't come. */
const STDIN_DRAIN_TIMEOUT_MS = 200;

/** Resolve repo-relative paths from this hook's own location (worktree-safe). */
function repoPaths() {
  const here = dirname(fileURLToPath(import.meta.url));
  const repoRoot = join(here, "..", "..");   // .claude/hooks/ -> .claude/ -> repo
  return {
    actuatorScript: join(repoRoot, "scripts", "obsidian-learning-revival.mjs"),
    telemetryFile: join(repoRoot, "state", "shared", "obsidian-learning-revival-history.jsonl"),
    stampFile: join(repoRoot, "state", "shared", ".obsidian-learning-revival-sessionstart.stamp"),
  };
}

/** Emit the SessionStart verdict. ALWAYS continues — never blocks a boot. */
function emitContinue(additionalContext) {
  const out = additionalContext
    ? { continue: true, hookSpecificOutput: { hookEventName: "SessionStart", additionalContext } }
    : { continue: true };
  try { process.stdout.write(JSON.stringify(out)); } catch { /* stdout gone */ }
}

/** Drain stdin, time-bounded — lets the harness write complete; bounds the wait. */
function drainStdin() {
  return new Promise((res) => {
    let done = false; let timer = null;
    const fin = () => {
      if (done) return; done = true;
      if (timer) clearTimeout(timer);
      try { process.stdin.destroy(); } catch { /* gone */ }
      res();
    };
    try {
      timer = setTimeout(fin, STDIN_DRAIN_TIMEOUT_MS);
      process.stdin.on("data", () => { /* discard */ });
      process.stdin.on("end", fin);
      process.stdin.on("error", fin);
    } catch { fin(); }
  });
}

/** True if a peer chat already kicked an actuator run within the throttle window. */
function recentlyKicked(stampFile) {
  try { return Date.now() - statSync(stampFile).mtimeMs < THROTTLE_MS; }
  catch { return false; }
}

/** Atomically mark that an actuator run was just kicked (tmp+rename, Windows-safe). */
function touchStamp(stampFile) {
  try {
    mkdirSync(dirname(stampFile), { recursive: true });
    const tmp = stampFile + ".tmp." + process.pid;
    writeFileSync(tmp, new Date().toISOString());
    renameSync(tmp, stampFile);
  } catch { /* best-effort — a missed stamp just means the next boot also kicks */ }
}

/** Read the actuator's most recent telemetry row, or null. Never throws. */
function readLastTelemetry(telemetryFile) {
  try {
    if (!existsSync(telemetryFile)) return null;
    const lines = readFileSync(telemetryFile, "utf8").trim().split(/\r?\n/).filter(Boolean);
    if (lines.length === 0) return null;
    return JSON.parse(lines[lines.length - 1]);
  } catch { return null; }
}

/**
 * Build the SessionStart advisory from a telemetry row, or null when there is
 * nothing worth surfacing (clean / stale / malformed). Pure — no IO.
 *
 * Surfaces only a recent `revived` (the loop self-healed — informative) or
 * `failed` (a synthesis engine broke — actionable). A `clean` pass (everything
 * already fresh) is silent: no noise across 26 boots.
 */
export function buildAdvisory(row, nowMs) {
  if (!row || typeof row !== "object") return null;
  if (row.level !== "revived" && row.level !== "failed") return null;
  const tsMs = row.ts ? Date.parse(row.ts) : NaN;
  if (!Number.isFinite(tsMs) || (nowMs - tsMs) > TELEMETRY_FRESH_MS) return null;

  const outcomes = Array.isArray(row.outcomes) ? row.outcomes : [];
  const revived = outcomes.filter((o) => o && o.action === "revived").map((o) => o.key);
  const failed = outcomes.filter((o) => o && o.action === "failed");
  if (row.level === "failed" && failed.length) {
    const detail = failed.map((o) => `${o.key} (${(o.error || "unknown").slice(0, 80)})`).join("; ");
    return `⚠ Obsidian/Hermes offline learning revival FAILED: ${detail}. `
      + `The compounding memory-synthesis loop did not run. `
      + `Diagnose: node scripts/obsidian-learning-revival.mjs --json · `
      + `engine: scripts/hermes-dream-cycle-synth.mjs / hermes-self-reflect-populater.mjs.`;
  }
  if (revived.length) {
    return `🌙 Obsidian/Hermes offline learning self-healed: revived ${revived.join(", ")} `
      + `(scheduled task was dark — engine ran directly, output landed). `
      + `Durable fix (elevated): Enable-ScheduledTask -TaskName 'PRISM Hermes Dream-Cycle Synth' `
      + `(+ Self-Reflect Weekly), or .claude/helpers/install-hermes-*-task.ps1 -RunNow.`;
  }
  return null;
}

async function main() {
  await drainStdin();

  if (process.env.PRISM_OBSIDIAN_REVIVAL_DISABLE === "1") { emitContinue(); return; }

  const { actuatorScript, telemetryFile, stampFile } = repoPaths();
  if (!existsSync(actuatorScript)) {
    emitContinue(`obsidian-learning-revival: actuator script not found at ${actuatorScript} — SessionStart arm inactive`);
    return;
  }

  // Surface the most recent actuator verdict in THIS boot (fast file read).
  const advisory = buildAdvisory(readLastTelemetry(telemetryFile), Date.now());

  // Throttle: if a peer chat kicked a revival within THROTTLE_MS, ride on it.
  if (recentlyKicked(stampFile)) { emitContinue(advisory || undefined); return; }

  try {
    const child = spawn(process.execPath, [actuatorScript], {
      detached: true, stdio: "ignore", windowsHide: true,
    });
    child.unref();
    touchStamp(stampFile);
    const launched = `obsidian-learning-revival: offline-learning revival check launched (detached, pid ${child.pid ?? "?"})`;
    emitContinue(advisory ? `${advisory}\n${launched}` : launched);
  } catch {
    emitContinue(advisory || undefined);
  }
}

const invokedAsHook = (() => {
  try { return !!process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]); }
  catch { return false; }
})();
if (invokedAsHook) main().catch(() => emitContinue());
