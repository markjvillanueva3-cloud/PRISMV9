#!/usr/bin/env node
// tier: T3
/**
 * fleet-work-digest-stop.mjs -- Stop-hook regenerator for the cross-fleet work digest
 * (scripts/fleet-work-digest.mjs). Mirrors fleet-task-health-stop.mjs exactly:
 * throttled + detached, so 26 simultaneous fleet Stops collapse to ONE digest rebuild
 * per STOP_THROTTLE_MS -- no per-turn cost, no node fork storm.
 *
 * WHY a Stop hook (not a scheduled task): the digest must be FRESH when any chat reads it
 * at SessionStart, and Stop fires every time any of the 26 chats ends a turn -- a dense,
 * free heartbeat anchored to nothing but the fleet being alive. Riding it keeps the digest
 * current without giving it its own unwatched scheduled task.
 *
 * ADVISORY ONLY -- ALWAYS emits {continue:true}; NEVER blocks Stop. The build itself is
 * fail-soft (returns instead of throwing) and writes atomically (tmp+rename), so a partial
 * or failed rebuild can never corrupt the digest a peer is reading.
 *
 * Knob: PRISM_FLEET_WORK_DIGEST_DISABLE=1 -> silent no-op (same knob the build script honors).
 * Wired: .claude/settings.json Stop chain (advisory, ~3s timeout).
 */
import { spawn } from "node:child_process";
import { existsSync, statSync, writeFileSync, mkdirSync, renameSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** Collapse a burst of near-simultaneous fleet Stops into one rebuild. */
const STOP_THROTTLE_MS = 5 * 60 * 1000;
/** Upper bound on the stdin drain -- never wait on an EOF that won't come. */
const STDIN_DRAIN_TIMEOUT_MS = 200;

function repoPaths() {
  const here = dirname(fileURLToPath(import.meta.url));
  const repoRoot = join(here, "..", "..");
  return {
    script: join(repoRoot, "scripts", "fleet-work-digest.mjs"),
    stampFile: join(repoRoot, "state", "shared", ".fleet-work-digest-stop.stamp"),
  };
}

function emitContinue() {
  try { process.stdout.write(JSON.stringify({ continue: true })); } catch { /* stdout gone */ }
}

function drainStdin() {
  return new Promise((res) => {
    let done = false; let timer = null;
    const fin = () => { if (done) return; done = true; if (timer) clearTimeout(timer); try { process.stdin.destroy(); } catch { /* gone */ } res(); };
    try {
      timer = setTimeout(fin, STDIN_DRAIN_TIMEOUT_MS);
      process.stdin.on("data", () => { /* discard */ });
      process.stdin.on("end", fin);
      process.stdin.on("error", fin);
    } catch { fin(); }
  });
}

/** True if a peer chat already kicked a rebuild within the throttle window. */
function recentlyBuilt(stampFile) {
  try { return Date.now() - statSync(stampFile).mtimeMs < STOP_THROTTLE_MS; }
  catch { return false; }
}

/** Atomic stamp publish (tmp+rename) -- mirrors fleet-task-health-stop's touchStamp. */
function touchStamp(stampFile) {
  try {
    mkdirSync(dirname(stampFile), { recursive: true });
    const tmp = `${stampFile}.tmp.${process.pid}`;
    writeFileSync(tmp, new Date().toISOString());
    renameSync(tmp, stampFile);
  } catch { /* best-effort */ }
}

async function main() {
  await drainStdin();
  if (process.env.PRISM_FLEET_WORK_DIGEST_DISABLE === "1") { emitContinue(); return; }
  const { script, stampFile } = repoPaths();
  if (!existsSync(script)) { emitContinue(); return; }
  if (recentlyBuilt(stampFile)) { emitContinue(); return; }
  try {
    const child = spawn(process.execPath, [script, "build"], { detached: true, stdio: "ignore", windowsHide: true });
    child.unref();
    touchStamp(stampFile);
  } catch { /* spawn failure must never block Stop */ }
  emitContinue();
}

const invokedAsHook = (() => {
  try { return !!process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]); }
  catch { return false; }
})();
if (invokedAsHook) main().catch(() => emitContinue());
