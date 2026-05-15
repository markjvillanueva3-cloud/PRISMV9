#!/usr/bin/env node
// tier: T3
/**
 * alpha-slot-reaper-guardian.mjs — the ALPHA slot owns the fleet reaper.
 *
 * Doctrine (user directive, 2026-05-14): "whoever is slotted into alpha, they're
 * responsible for launching [the fleet reaper] and making sure it's always
 * active." This hook is the enforcement arm of that rule.
 *
 * WHAT IT DOES — only for the chat whose stable id holds the `alpha` slot in
 * chat-slots.json (every other chat is a near-instant silent no-op):
 *   1. Queries the durable "PRISM Fleet Reaper" Windows scheduled task.
 *   2. If the task is DISABLED → best-effort re-enable (`schtasks /Change`).
 *      If the task is MISSING → cannot self-install (install needs elevation);
 *      emits a LOUD advisory telling the alpha chat to run `/fleet-reaper`.
 *   3. Kicks ONE detached `--once` sweep so the alpha chat actively reaps even
 *      before the operator runs `/fleet-reaper` — throttled by a stamp file so a
 *      busy alpha chat can't fork-storm (and so it slots between the scheduled
 *      task's 5-min ticks rather than piling onto them).
 *   4. Injects a one-block advisory into the alpha chat's context.
 *
 * WIRED into BOTH SessionStart (catch it at chat start) and UserPromptSubmit
 * (catch a mid-session task disable / crash). The stamp throttle keeps the
 * UserPromptSubmit path cheap — the expensive branch (schtasks + sweep + advisory)
 * runs at most once per SWEEP_THROTTLE_MS; in between it is a stamp mtime read.
 *
 * COVERAGE GAP (fail loud, honest framing): the only failures this hook re-checks
 * mid-session ride the alpha chat's UserPromptSubmit. A scheduled task disabled
 * while the alpha chat sits IDLE is not noticed until alpha's next prompt or its
 * next SessionStart — possibly never if the operator walks away. The independent
 * backstops for that window are the scheduled task's own self-heal and, if the
 * operator ran `/fleet-reaper`, the in-session Monitor. The guardian narrows the
 * gap; it does not eliminate it.
 *
 * ADVISORY ONLY — ALWAYS emits {continue:true}, NEVER blocks. Every failure mode
 * (no stdin, corrupt slots file, schtasks missing, spawn failure) fails soft to a
 * silent continue: the scheduled task + Stop-hook arm are independent backstops,
 * so a missed guardian pass is harmless.
 *
 * Knobs:
 *   PRISM_FLEET_REAPER_DISABLE=1     — whole reaper off → this hook is a no-op too
 *                                     (don't nag about a deliberately-off reaper).
 *                                     NOTE: this one value darkens ALL THREE reaper
 *                                     arms at once — guardian, Stop-hook arm, AND
 *                                     the scheduled task's own gate. An operator
 *                                     silencing one noisy arm with it loses the
 *                                     whole safety net; prefer the arm-specific
 *                                     knob (e.g. PRISM_ALPHA_GUARDIAN_DISABLE).
 *   PRISM_ALPHA_GUARDIAN_DISABLE=1   — guardian-specific off switch.
 *   PRISM_ALPHA_GUARDIAN_NO_SWEEP=1  — keep the task check + advisory, skip the
 *                                     detached --once sweep kick.
 *
 * Sister artifacts: scripts/fleet-reaper-sweep.mjs (the brain),
 * .claude/hooks/fleet-reaper-stop.mjs (the Stop-hook arm — same throttle idiom),
 * .claude/helpers/install-fleet-reaper-task.ps1 (the task installer),
 * .claude/commands/fleet-reaper.md (the /fleet-reaper skill).
 */

import { spawnSync, spawn } from "node:child_process";
import { existsSync, statSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { findSlotForChat } from "../helpers/chat-slots.mjs";

/** The slot that owns the reaper. Single source of truth for the doctrine. */
const OWNER_SLOT = "alpha";
/** The durable scheduled task installed by install-fleet-reaper-task.ps1. */
const TASK_NAME = "PRISM Fleet Reaper";
/** Absolute schtasks path — portable-node hosts often have a PATH without
 *  System32 (same reason stable-session-id.mjs hard-codes WMIC/PowerShell). */
const SCHTASKS = "C:/Windows/System32/schtasks.exe";
/** Alpha kicks at most one detached sweep per this window. 4 min < the
 *  scheduled task's 5-min cadence, so the guardian fills the gaps between
 *  task ticks instead of doubling up on them. Also gates the UserPromptSubmit
 *  "expensive path" (schtasks query + sweep + advisory) so per-prompt cost on
 *  the alpha chat stays at a single stamp mtime read between windows. */
const SWEEP_THROTTLE_MS = 4 * 60 * 1000;
/** Upper bound on the stdin drain — never wait on an EOF that won't come. */
const STDIN_DRAIN_TIMEOUT_MS = 250;
/** schtasks query timeout — a hung query must never stall a SessionStart. */
const SCHTASKS_TIMEOUT_MS = 4000;

/** Resolve repo-relative paths from this hook's own location. */
function repoPaths() {
  const here = dirname(fileURLToPath(import.meta.url));
  // .claude/hooks/ -> .claude/ -> repo root
  const repoRoot = join(here, "..", "..");
  return {
    sweepScript: join(repoRoot, "scripts", "fleet-reaper-sweep.mjs"),
    stampFile: join(repoRoot, "state", "shared", ".alpha-guardian-sweep.stamp"),
  };
}

/**
 * Drain + parse the hook's stdin JSON, time-bounded. The harness passes a JSON
 * blob carrying `session_id` (the anchor for "which chat am I") and
 * `hook_event_name`. We never block on an EOF that won't come.
 */
function readStdinPayload() {
  return new Promise((resolve) => {
    let done = false;
    let buf = "";
    let timer = null;
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

/**
 * Derive the PRISM stable chat id (`claude-<first8>`) from the harness session
 * id. /checkin claims a slot with the output of stable-session-id.mjs, which on
 * its PRIMARY (UUID-anchored) path emits exactly `claude-<first8-of-session-uuid>`
 * — identical to what we derive here, so the match is exact on that path.
 * EDGE CASE: stable-session-id.mjs has fallback branches (e.g. `env-<…>`) that
 * can produce a non-`claude-` chatId when all UUID anchors fail at checkin time.
 * Then findSlotForChat won't match and the guardian silently no-ops on a chat
 * that IS alpha — it fails SAFE (goes quiet; the scheduled task still covers).
 */
function deriveStableId(payload) {
  const sid = payload && (payload.session_id || payload.sessionId);
  if (typeof sid !== "string" || sid.length < 8) return null;
  return `claude-${sid.slice(0, 8).toLowerCase()}`;
}

/** SessionStart vs UserPromptSubmit — drives the output `hookEventName`. */
function eventName(payload) {
  const n = payload && (payload.hook_event_name || payload.hookEventName);
  return n === "UserPromptSubmit" ? "UserPromptSubmit" : "SessionStart";
}

/**
 * Query the scheduled task. Returns { exists, enabled, status }. Never throws —
 * a missing/hung schtasks degrades to { exists:false } so the caller still
 * emits the install advisory rather than crashing.
 */
function queryScheduledTask() {
  try {
    if (!existsSync(SCHTASKS)) return { exists: false, enabled: false, status: "schtasks-not-found" };
    const r = spawnSync(SCHTASKS, ["/Query", "/TN", TASK_NAME, "/FO", "LIST"], {
      encoding: "utf-8", timeout: SCHTASKS_TIMEOUT_MS, windowsHide: true,
    });
    if (r.status !== 0 || !r.stdout) return { exists: false, enabled: false, status: "not-registered" };
    // "Scheduled Task State:" is the machine-stable field; "Status:" (Ready/
    // Running/Disabled) is the human one. Disabled shows up in BOTH.
    const m = r.stdout.match(/Scheduled Task State:\s*(\S+)/i)
      || r.stdout.match(/Status:\s*(\S+)/i);
    const state = m ? m[1].trim() : "Unknown";
    const enabled = !/disabled/i.test(state);
    return { exists: true, enabled, status: state };
  } catch {
    return { exists: false, enabled: false, status: "query-failed" };
  }
}

/** Best-effort re-enable of a disabled task. Returns true on success. Enabling
 *  a task you own usually does NOT need elevation; if it does, this fails soft
 *  and the advisory still tells the operator to run /fleet-reaper. */
function tryEnableTask() {
  try {
    if (!existsSync(SCHTASKS)) return false;
    const r = spawnSync(SCHTASKS, ["/Change", "/TN", TASK_NAME, "/ENABLE"], {
      encoding: "utf-8", timeout: SCHTASKS_TIMEOUT_MS, windowsHide: true,
    });
    return r.status === 0;
  } catch {
    return false;
  }
}

/** True if the guardian already kicked a sweep within SWEEP_THROTTLE_MS. */
function recentlySwept(stampFile) {
  try {
    return Date.now() - statSync(stampFile).mtimeMs < SWEEP_THROTTLE_MS;
  } catch {
    return false; // no stamp / unreadable → not throttled
  }
}

/** Mark a guardian sweep so the next UserPromptSubmit within the window is cheap. */
function touchStamp(stampFile) {
  try {
    mkdirSync(dirname(stampFile), { recursive: true });
    writeFileSync(stampFile, new Date().toISOString());
  } catch { /* best-effort — a missed stamp just means the next prompt re-checks */ }
}

/** Kick a detached `--once` sweep. Returns the child pid, or null on failure. */
function kickSweep(sweepScript) {
  try {
    if (!existsSync(sweepScript)) return null;
    const child = spawn(
      process.execPath,
      [sweepScript, "--once"],
      { detached: true, stdio: "ignore", windowsHide: true },
    );
    child.unref(); // let this hook exit immediately; the sweep lives on its own
    return child.pid ?? null;
  } catch {
    return null;
  }
}

/** Emit the verdict. ALWAYS {continue:true}; advisory rides hookSpecificOutput. */
function emitContinue(evName, additionalContext) {
  const out = additionalContext
    ? { continue: true, hookSpecificOutput: { hookEventName: evName, additionalContext } }
    : { continue: true };
  try { process.stdout.write(JSON.stringify(out)); } catch { /* stdout gone */ }
}

async function main() {
  const payload = await readStdinPayload();
  const evName = eventName(payload);

  // Whole-reaper kill switch OR guardian-specific kill switch → silent no-op.
  if (process.env.PRISM_FLEET_REAPER_DISABLE === "1"
      || process.env.PRISM_ALPHA_GUARDIAN_DISABLE === "1") {
    emitContinue(evName);
    return;
  }

  // Resolve which slot THIS chat holds. No id / not slotted / not alpha →
  // silent, near-instant no-op (the common case for 6 of 7 chats).
  const stableId = deriveStableId(payload);
  if (!stableId) { emitContinue(evName); return; }

  let mySlot = null;
  try {
    const found = findSlotForChat(stableId);
    mySlot = found && found.slot;
  } catch {
    // Corrupt/locked chat-slots.json — can't prove ownership → do nothing.
    emitContinue(evName);
    return;
  }
  if (mySlot !== OWNER_SLOT) { emitContinue(evName); return; }

  // ─── This chat IS alpha — guardian logic ─────────────────────────────────
  const { sweepScript, stampFile } = repoPaths();

  // UserPromptSubmit throttle: between windows, stay cheap (a stamp mtime read)
  // and silent. SessionStart ALWAYS runs the full check — you want it at start.
  if (evName === "UserPromptSubmit" && recentlySwept(stampFile)) {
    emitContinue(evName);
    return;
  }

  // Is the supplementary sweep even eligible this pass? Evaluated BEFORE the
  // stamp is refreshed below — SessionStart skips the UserPromptSubmit gate
  // above, so it relies on THIS check to not double-kick a sweep when a recent
  // prompt / SessionStart already swept inside the window.
  const sweepEligible = !recentlySwept(stampFile);

  // 1. Task state. 2. Re-enable if disabled.
  const task = queryScheduledTask();
  let reEnabled = false;
  if (task.exists && !task.enabled) reEnabled = tryEnableTask();

  // 3. Kick one detached sweep (throttle-gated; skippable via knob).
  let sweptPid = null;
  if (sweepEligible && process.env.PRISM_ALPHA_GUARDIAN_NO_SWEEP !== "1") {
    sweptPid = kickSweep(sweepScript);
  }

  // Throttle the WHOLE expensive path: the schtasks query + advisory have run,
  // so refresh the stamp regardless of whether a sweep was kicked. Without this
  // the PRISM_ALPHA_GUARDIAN_NO_SWEEP knob would silently defeat the per-prompt
  // throttle — every UserPromptSubmit on the alpha chat would re-run schtasks.
  touchStamp(stampFile);

  // 4. Advisory — LOUD when the durable task is missing/disabled, quiet otherwise.
  let advisory;
  if (!task.exists) {
    advisory =
      `⚠ SLOT ALPHA — you OWN the fleet reaper, and its durable scheduled task `
      + `("${TASK_NAME}") is NOT REGISTERED (${task.status}). Orphan node/bash/git `
      + `processes from crashed chats WILL accumulate.\n`
      + `  → Run /fleet-reaper NOW — it installs the 5-min scheduled task (needs an `
      + `elevated shell) and launches the in-session Monitor.\n`
      + (sweptPid !== null
        ? `  A one-off --once sweep was kicked (pid ${sweptPid}), but it will NOT repeat without the task.`
        : `  (Could not kick a fallback sweep — sweep script missing or spawn failed.)`);
  } else if (!task.enabled) {
    advisory =
      `⚠ SLOT ALPHA — the fleet-reaper scheduled task ("${TASK_NAME}") was DISABLED `
      + `(${task.status}). ${reEnabled ? "Re-enabled it ✓." : "Auto-re-enable FAILED — run `schtasks /Change /TN \"" + TASK_NAME + "\" /ENABLE` in an elevated shell, or /fleet-reaper."}`
      + (sweptPid !== null ? `\n  Guardian sweep kicked (pid ${sweptPid}).` : "");
  } else {
    advisory =
      `🛡 SLOT ALPHA — fleet-reaper guardian: durable task "${TASK_NAME}" is ${task.status} ✓`
      + (sweptPid !== null
        ? ` · guardian sweep kicked (detached --once, pid ${sweptPid}).`
        : ` · sweep throttled (≤1 / ${Math.round(SWEEP_THROTTLE_MS / 60000)}min).`)
      + `\n  You own the reaper for the 7-chat fleet — run /fleet-reaper if you also want the live in-session Monitor.`;
  }

  emitContinue(evName, advisory);
}

// Last-resort net: any unforeseen rejection still emits {continue:true} so the
// hook can never crash without a verdict (mirrors fleet-reaper-stop.mjs).
main().catch(() => emitContinue("SessionStart"));
