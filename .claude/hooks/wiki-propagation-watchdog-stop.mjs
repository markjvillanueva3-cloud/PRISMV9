#!/usr/bin/env node
// tier: T3
/**
 * wiki-propagation-watchdog-stop.mjs — Stop-hook arm of the iter10
 * wiki-propagation-watchdog (scripts/wiki-propagation-watchdog.mjs).
 *
 * THE GAP. iter10 shipped a 4-stage staleness detector that flagged a CRITICAL
 * state on first run (system-viz 4.3h stale · embeddings 89.3h stale ·
 * obsidian-feed never fired) — but the watchdog itself sat unwired. Per the
 * 2026-05-18 user directive ("make sure everything you're building is automated
 * or it will sit stagnant"), a watchdog with no caller is exactly the class of
 * orphaned writer the directive forbids.
 *
 * Same pattern as fleet-task-health-stop.mjs: ride the fleet's Stop stream as
 * the heartbeat — every chat ending a turn pulses the audit forward. 13
 * simultaneous Stops collapse via stamp-file throttle into ONE watchdog run.
 *
 * WHAT IT DOES, each Stop:
 *   1. Reads the most recent telemetry row from
 *      state/shared/wiki-propagation-watchdog.jsonl. If fresh and status is
 *      warn/critical, injects a one-line advisory into THIS Stop's verdict so
 *      the stopping chat sees the propagation gap immediately.
 *   2. Throttled: if no peer kicked a watchdog run within STOP_THROTTLE_MS,
 *      spawns one DETACHED to refresh telemetry for the next Stop.
 *
 * ADVISORY ONLY — ALWAYS emits {continue:true}; NEVER blocks Stop. The watchdog
 * itself never writes (dry-run flag prevents the inner advisory stamp from
 * spamming AGENT_CHAT — this hook surfaces the same info via Stop verdict
 * instead, which is operator-visible without the chat-bus noise).
 *
 * Knobs:
 *   PRISM_WIKI_WATCHDOG_DISABLE=1       → silent no-op (same knob the script honours)
 *   PRISM_WIKI_WATCHDOG_STOP_DRY=1      → read-and-surface only; don't spawn
 *   PRISM_WIKI_WATCHDOG_THROTTLE_MS=N   → override default 15-min throttle
 *
 * Wired: H:/.claude/settings.json Stop chain (advisory, ~3s timeout).
 */

import { spawn } from "node:child_process";
import {
  existsSync,
  readFileSync,
  statSync,
  writeFileSync,
  mkdirSync,
  renameSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** Collapse a burst of near-simultaneous fleet Stops into one watchdog run.
 *  15 min default — the 4 stat()s + classify are cheap, but the cadence has to
 *  outpace the 4-h system-viz threshold so a single stale window is caught at
 *  multiple Stops (no "missed-the-bell" class). */
const DEFAULT_THROTTLE_MS = 15 * 60 * 1000;
/** Ignore a telemetry row older than this — too stale to trust as "current". */
const TELEMETRY_FRESH_MS = 60 * 60 * 1000;
/** Upper bound on stdin drain — never wait on an EOF that won't come. */
const STDIN_DRAIN_TIMEOUT_MS = 200;

/** iter13 actuator: per-stage cooldown for auto-recovery spawns. 1 hour default
 *  — regen-wiki-from-viz is ~8 min and build-wiki-embeddings hits Ollama; never
 *  more than one spawn per stage per hour. */
const DEFAULT_RECOVERY_COOLDOWN_MS = 60 * 60 * 1000;

/** iter13 actuator: hard age thresholds beyond which auto-recovery is allowed.
 *  These are INTENTIONALLY higher than the watchdog's warn thresholds — at warn
 *  level we just surface the advisory; we only ACT when the gap is severe
 *  enough that the cost of a wasted regen is dominated by the cost of waiting
 *  on natural cadence. */
const RECOVERY_HARD_HRS = Object.freeze({
  "system-viz": 8,
  "leaf-index": 48,
  embeddings: 96,
  "obsidian-feed": 48,
});

/** iter13 actuator: which refresh command repairs each stage. The values are
 *  scripts/ paths relative to PRISM_ROOT — composed with process.execPath at
 *  spawn time. `null` = no auto-recovery for that stage (e.g. obsidian-feed
 *  is a Stop-hook stamp; if it is stale the right fix is investigating why
 *  Stops aren't firing, not auto-spawning a refresh). */
const RECOVERY_COMMANDS = Object.freeze({
  "system-viz": "scripts/system-viz-on-commit.mjs",
  "leaf-index": "scripts/regen-wiki-from-viz.mjs",
  embeddings: "scripts/build-wiki-embeddings.mjs",
  "obsidian-feed": null,
});

/** Resolve repo-relative paths from this hook's own location (worktree-safe).
 *  Honors PRISM_WIKI_WATCHDOG_REPO_ROOT as an override for E2E testing — when
 *  set, all paths resolve under that root instead of derived-from-__filename. */
export function repoPaths(here = dirname(fileURLToPath(import.meta.url))) {
  const override = process.env.PRISM_WIKI_WATCHDOG_REPO_ROOT;
  // .claude/hooks/ -> .claude/ -> repo root
  const repoRoot = override && override.length > 0 ? override : join(here, "..", "..");
  return {
    watchdogScript: join(repoRoot, "scripts", "wiki-propagation-watchdog.mjs"),
    telemetryFile: join(
      repoRoot,
      "state",
      "shared",
      "wiki-propagation-watchdog.jsonl",
    ),
    stampFile: join(
      repoRoot,
      "state",
      "shared",
      ".wiki-watchdog-stop.stamp",
    ),
    repoRoot,
  };
}

/** Emit the hook verdict. ALWAYS {continue:true} — this hook never blocks Stop. */
function emitContinue(additionalContext) {
  const out = additionalContext
    ? {
        continue: true,
        hookSpecificOutput: { hookEventName: "Stop", additionalContext },
      }
    : { continue: true };
  try {
    process.stdout.write(JSON.stringify(out));
  } catch {
    /* stdout gone — nothing to do */
  }
}

/** Drain stdin, time-bounded (payload not needed — audit is identical
 *  regardless of which chat stopped). */
function drainStdin() {
  return new Promise((resolve) => {
    let done = false;
    let timer = null;
    const fin = () => {
      if (done) return;
      done = true;
      if (timer) clearTimeout(timer);
      try {
        process.stdin.destroy();
      } catch {
        /* already gone */
      }
      resolve();
    };
    try {
      timer = setTimeout(fin, STDIN_DRAIN_TIMEOUT_MS);
      process.stdin.on("data", () => {
        /* discard */
      });
      process.stdin.on("end", fin);
      process.stdin.on("error", fin);
    } catch {
      fin();
    }
  });
}

/** Throttle-decision (pure). Exported for tests. */
export function throttleDecision(stampMtimeMs, nowMs, throttleMs) {
  if (stampMtimeMs == null || !Number.isFinite(stampMtimeMs)) {
    return { throttled: false, reason: "no-stamp" };
  }
  const ageMs = nowMs - stampMtimeMs;
  if (ageMs < throttleMs) {
    return {
      throttled: true,
      reason: `recent-peer-sweep ${(ageMs / 1000).toFixed(0)}s < ${(throttleMs / 1000).toFixed(0)}s`,
    };
  }
  return { throttled: false, reason: `stamp-stale ${(ageMs / 1000).toFixed(0)}s` };
}

/** True if a peer chat already kicked a watchdog run within the throttle window. */
function recentlySwept(stampFile, throttleMs) {
  try {
    return throttleDecision(statSync(stampFile).mtimeMs, Date.now(), throttleMs)
      .throttled;
  } catch {
    return false; // no stamp / unreadable → treat as "not throttled"
  }
}

/** Atomic stamp publish — tmp + rename for cross-process safety on Windows. */
function touchStamp(stampFile) {
  try {
    mkdirSync(dirname(stampFile), { recursive: true });
    const tmp = stampFile + ".tmp." + process.pid;
    writeFileSync(tmp, new Date().toISOString());
    renameSync(tmp, stampFile);
  } catch {
    /* best-effort */
  }
}

/** Read the watchdog's most recent telemetry row (last JSONL line). */
function readLastTelemetry(telemetryFile) {
  try {
    if (!existsSync(telemetryFile)) return null;
    const lines = readFileSync(telemetryFile, "utf8")
      .trim()
      .split(/\r?\n/)
      .filter(Boolean);
    if (lines.length === 0) return null;
    return JSON.parse(lines[lines.length - 1]);
  } catch {
    return null;
  }
}

/**
 * Build the Stop-verdict advisory string from a telemetry row, or null when
 * there is nothing worth surfacing (clean/stale/malformed). Pure — no IO.
 * Exported for tests.
 */
export function buildAdvisory(row, nowMs) {
  if (!row || typeof row !== "object") return null;
  if (row.status !== "warn" && row.status !== "critical") return null;
  const tsMs = row.ts ? Date.parse(row.ts) : NaN;
  if (!Number.isFinite(tsMs) || nowMs - tsMs > TELEMETRY_FRESH_MS) return null;

  const stages = Array.isArray(row.stages) ? row.stages : [];
  const stale = stages.filter((s) => s && s.stale).slice(0, 4);
  const seen = new Set();
  const parts = [];
  for (const s of stale) {
    const name = s.stage || "?";
    if (seen.has(name)) continue;
    seen.add(name);
    const age = s.ageHrs == null ? "?h" : `${Number(s.ageHrs).toFixed(1)}h`;
    parts.push(`${name}=${age}`);
  }
  const detail = parts.length ? parts.join(", ") : "see telemetry";
  const tag = row.status === "critical" ? "CRITICAL" : "WARN";
  const staleCount = Number.isFinite(row.staleCount) ? row.staleCount : "?";

  return (
    `⚠ PRISM wiki propagation ${tag} — ${staleCount} stage(s) stale · ${detail}. ` +
    `Wiki recall is degrading: stale indexes mean Claude/peer chats can't find recent leaves. ` +
    `Refresh: node scripts/regen-wiki-from-viz.mjs · ` +
    `node scripts/build-wiki-embeddings.mjs · ` +
    `node scripts/system-viz-on-commit.mjs.`
  );
}

/**
 * iter13 actuator. Pure decision: given a telemetry row, which stage (if any)
 * should be auto-recovered RIGHT NOW? Returns the chosen stage record + a
 * relative command path, or null if no action is appropriate.
 *
 * Rules:
 *   - Telemetry row must be present + reasonably fresh (<1h).
 *   - Stage must be `stale:true` AND `ageHrs >= RECOVERY_HARD_HRS[stage]` —
 *     warn-only staleness gets advisory only, not actuation.
 *   - Stage must have a known recovery command (`obsidian-feed` is null:
 *     a stale Stop-hook stamp is operator-only).
 *   - When multiple stages qualify, pick the OLDEST (greatest ageHrs) — that's
 *     the highest-leverage repair and the one most likely to clear other
 *     downstream stages too (a fresh system-viz feeds leaf-index regen).
 *
 * Exported for tests. Pure — no IO.
 */
export function decideRecoveryAction(row, nowMs) {
  if (!row || typeof row !== "object") {
    return null;
  }
  const tsMs = row.ts ? Date.parse(row.ts) : NaN;
  if (!Number.isFinite(tsMs) || nowMs - tsMs > TELEMETRY_FRESH_MS) {
    return null;
  }
  if (row.status !== "critical" && row.status !== "warn") {
    return null;
  }
  const stages = Array.isArray(row.stages) ? row.stages : [];
  let best = null;
  for (const s of stages) {
    if (!s || typeof s !== "object") continue;
    if (!s.stale) continue;
    const stage = s.stage;
    if (typeof stage !== "string") continue;
    const hardHrs = RECOVERY_HARD_HRS[stage];
    if (!Number.isFinite(hardHrs)) continue;
    const command = RECOVERY_COMMANDS[stage];
    if (!command) continue;
    const ageHrs = Number(s.ageHrs);
    if (!Number.isFinite(ageHrs)) continue;
    if (ageHrs < hardHrs) continue;
    if (!best || ageHrs > best.ageHrs) {
      best = { stage, command, ageHrs, hardHrs };
    }
  }
  if (!best) return null;
  return {
    stage: best.stage,
    command: best.command,
    ageHrs: best.ageHrs,
    reason: `${best.stage}=${best.ageHrs.toFixed(1)}h > ${best.hardHrs}h hard threshold`,
  };
}

/** Per-stage cooldown stamp path. */
function recoveryStampPath(repoRoot, stage) {
  return join(repoRoot, "state", "shared", `.wiki-watchdog-recover-${stage}.stamp`);
}

/** True if a recovery for this stage was already spawned within the cooldown
 *  window (peer-safe via mtime). */
function recoveryThrottled(stampPath, nowMs, cooldownMs) {
  try {
    const ageMs = nowMs - statSync(stampPath).mtimeMs;
    return ageMs < cooldownMs;
  } catch {
    return false;
  }
}

async function main() {
  await drainStdin();

  if (process.env.PRISM_WIKI_WATCHDOG_DISABLE === "1") {
    emitContinue();
    return;
  }

  const { watchdogScript, telemetryFile, stampFile } = repoPaths();

  if (!existsSync(watchdogScript)) {
    // R12 — surface a missing watchdog script (almost always a relpath bug)
    emitContinue(
      `wiki-propagation-watchdog: script not found at ${watchdogScript} — Stop-hook arm inactive`,
    );
    return;
  }

  const advisory = buildAdvisory(readLastTelemetry(telemetryFile), Date.now());

  const throttleMs =
    Number(process.env.PRISM_WIKI_WATCHDOG_THROTTLE_MS) || DEFAULT_THROTTLE_MS;

  if (recentlySwept(stampFile, throttleMs)) {
    emitContinue(advisory || undefined);
    return;
  }

  if (process.env.PRISM_WIKI_WATCHDOG_STOP_DRY === "1") {
    emitContinue(advisory || undefined);
    return;
  }

  // iter13 actuator block — DEFAULT OFF (opt-in via PRISM_WIKI_WATCHDOG_AUTO_RECOVER=1).
  // Built so it can be empirically validated on one chat before fleet rollout.
  let recoveryLine = null;
  if (process.env.PRISM_WIKI_WATCHDOG_AUTO_RECOVER === "1") {
    try {
      const decision = decideRecoveryAction(
        readLastTelemetry(telemetryFile),
        Date.now(),
      );
      if (decision) {
        // Reuse the same repoRoot resolution as the rest of the hook so the
        // PRISM_WIKI_WATCHDOG_REPO_ROOT override applies uniformly (the iter14
        // E2E oracle depends on this consistency).
        const { repoRoot } = repoPaths();
        const recStamp = recoveryStampPath(repoRoot, decision.stage);
        const cooldownMs =
          Number(process.env.PRISM_WIKI_WATCHDOG_RECOVER_COOLDOWN_MS) ||
          DEFAULT_RECOVERY_COOLDOWN_MS;
        if (recoveryThrottled(recStamp, Date.now(), cooldownMs)) {
          recoveryLine = `wiki-watchdog auto-recovery: ${decision.stage} stale (${decision.reason}) — recently respawned, cooldown active`;
        } else {
          const recChild = spawn(
            process.execPath,
            [join(repoRoot, decision.command)],
            { detached: true, stdio: "ignore", windowsHide: true },
          );
          recChild.unref();
          touchStamp(recStamp);
          recoveryLine = `wiki-watchdog auto-recovery: spawned ${decision.command} (stage=${decision.stage}, ${decision.reason}, pid ${recChild.pid ?? "?"})`;
        }
      }
    } catch (err) {
      // Actuator MUST NEVER block Stop, even on a programmer error.
      recoveryLine = `wiki-watchdog auto-recovery: skipped (error: ${err && err.message ? err.message : "unknown"})`;
    }
  }

  try {
    const child = spawn(
      process.execPath,
      [watchdogScript, "--json", "--dry-run"],
      { detached: true, stdio: "ignore", windowsHide: true },
    );
    child.unref();
    touchStamp(stampFile);
    const launched = `wiki-watchdog: propagation audit launched (detached, pid ${child.pid ?? "?"})`;
    const parts = [advisory, launched, recoveryLine].filter(Boolean);
    emitContinue(parts.length ? parts.join("\n") : undefined);
  } catch {
    // Spawn failure must NEVER block Stop.
    const parts = [advisory, recoveryLine].filter(Boolean);
    emitContinue(parts.length ? parts.join("\n") : undefined);
  }
}

// Run main() only when invoked as the hook entry point — NOT when imported by a test.
const invokedAsHook = (() => {
  try {
    return (
      !!process.argv[1] &&
      fileURLToPath(import.meta.url) === resolve(process.argv[1])
    );
  } catch {
    return false;
  }
})();
if (invokedAsHook) void main().catch(() => emitContinue());
