#!/usr/bin/env node
// tier: T4
/**
 * fleet-reaper-stop.mjs — Stop-hook arm of the slot-aware orphan reaper.
 *
 * When any of the up to 26 concurrent chats ends, kick a slot-aware sweep so the
 * just-ended chat's orphan node/git/bash processes get noticed promptly instead
 * of waiting up to ~5 min for the next scheduled-task / Monitor tick. A chat
 * that crashes or is closed without firing the rest of its Stop chain is
 * exactly the case the fleet reaper exists for — and a Stop event is the
 * earliest signal of it.
 *
 * ADVISORY ONLY — this hook ALWAYS emits {continue:true} and NEVER blocks Stop.
 * It launches the sweep DETACHED (`spawn(..., {detached:true}).unref()`) and
 * returns in ~ms; a full sweep can take 1-30s but it runs entirely on its own,
 * orphaned from this hook's (already-exited) process. The stdin drain is
 * time-bounded so the hook can never hang on an EOF that never comes.
 *
 * THROTTLE: the sweep is fleet-WIDE — one sweep sees all 7 slots and reaps
 * every dead chat's orphans, not just the chat that triggered it. So when a
 * burst of chats stop together (a fleet-wide /compact), the FIRST stopper kicks
 * the sweep and the rest ride on it: a stamp file (state/shared/.fleet-reaper-
 * stop.stamp) gates re-launches for STOP_THROTTLE_MS. Without this, 7
 * simultaneous Stops would spawn 7 sweeps each forking PowerShell 2-3x — a
 * fork storm, ironic for a reaper whose whole job is relieving fork pressure.
 *
 * The actual kill is still gated by the confirm-after-N-ticks rule inside
 * fleet-reaper-sweep.mjs — a Stop event only makes a candidate's FIRST sighting
 * happen sooner; it still has to survive the confirm window before anything is
 * reaped. A clean session end (or a /compact) can never cause a hasty kill.
 *
 * The `--stop-event` flag is a telemetry label only (it tags the sweep's log
 * line as Stop-triggered). `--detach` is intentionally NOT passed: this hook
 * already detaches the child itself, so the sweep runs directly rather than
 * re-spawning itself a second time.
 *
 * Knob: PRISM_FLEET_REAPER_DISABLE=1 → this hook is a silent no-op.
 *
 * Wired: .claude/settings.json Stop chain (advisory, ~3s timeout).
 */

import { spawn } from "node:child_process";
import { existsSync, statSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/** Collapse a burst of near-simultaneous fleet Stops into a single sweep. */
const STOP_THROTTLE_MS = 45 * 1000;
/** Upper bound on the stdin drain — never wait on an EOF that won't come. */
const STDIN_DRAIN_TIMEOUT_MS = 200;

/** Resolve repo-relative paths from this hook's own location (worktree-safe). */
function repoPaths() {
  const here = dirname(fileURLToPath(import.meta.url));
  // .claude/hooks/ -> .claude/ -> repo root
  const repoRoot = join(here, "..", "..");
  return {
    sweepScript: join(repoRoot, "scripts", "fleet-reaper-sweep.mjs"),
    stampFile: join(repoRoot, "state", "shared", ".fleet-reaper-stop.stamp"),
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
 * Drain the hook's stdin payload, time-bounded. We don't need the payload — the
 * sweep is identical regardless of which chat stopped — but draining lets the
 * harness's write complete cleanly. The ref'd timer both bounds the wait AND
 * keeps the event loop alive until the promise resolves; `fin()` clears it and
 * destroys stdin so nothing lingers afterward.
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
      // Arm the timer FIRST so the catch path's fin() can always clear it —
      // otherwise a throw in .on() registration would leave an orphan timer.
      timer = setTimeout(fin, STDIN_DRAIN_TIMEOUT_MS);
      process.stdin.on("data", () => { /* discard */ });
      process.stdin.on("end", fin);
      process.stdin.on("error", fin);
    } catch { fin(); }
  });
}

/** True if a peer chat already kicked a fleet-wide sweep within the window. */
function recentlySwept(stampFile) {
  try {
    return Date.now() - statSync(stampFile).mtimeMs < STOP_THROTTLE_MS;
  } catch {
    return false; // no stamp / unreadable → treat as "not throttled"
  }
}

/** Mark that a sweep was just kicked, so peer chats stopping next throttle. */
function touchStamp(stampFile) {
  try {
    mkdirSync(dirname(stampFile), { recursive: true });
    writeFileSync(stampFile, new Date().toISOString());
  } catch { /* best-effort — a missed stamp just means the next Stop also sweeps */ }
}

async function main() {
  await drainStdin();

  if (process.env.PRISM_FLEET_REAPER_DISABLE === "1") {
    emitContinue();
    return;
  }

  const { sweepScript, stampFile } = repoPaths();

  if (!existsSync(sweepScript)) {
    // Surface this visibly: a missing sweep script is almost always a wrong
    // relative-path bug, not a real "feature not deployed" state.
    emitContinue(`fleet-reaper: sweep script not found at ${sweepScript} — Stop-hook arm inactive`);
    return;
  }

  // Throttle: if a peer chat kicked a fleet-wide sweep in the last
  // STOP_THROTTLE_MS, ride on it rather than adding another forking sweep.
  if (recentlySwept(stampFile)) {
    emitContinue();
    return;
  }

  try {
    const child = spawn(
      process.execPath,
      [sweepScript, "--once", "--stop-event"],
      { detached: true, stdio: "ignore", windowsHide: true },
    );
    child.unref(); // let this hook exit immediately; the sweep lives on its own
    touchStamp(stampFile); // only stamp on a successful launch — a failed spawn should not throttle
    emitContinue(`fleet-reaper: slot-aware orphan sweep launched (detached, pid ${child.pid ?? "?"})`);
  } catch {
    // A spawn failure must NEVER block Stop — emit continue and move on. The
    // scheduled task + Monitor still cover orphan reaping if this launch fails.
    emitContinue();
  }
}

// Last-resort net: any unforeseen rejection still emits {continue:true} so the
// hook can never crash without a verdict (mirrors git-lock-sweeper.mjs).
main().catch(() => emitContinue());
