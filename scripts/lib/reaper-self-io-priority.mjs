/**
 * Reaper self I/O priority guard — FLEET-REAPER-MS3/U-FR-MS3-D.
 *
 * Drops the reaper process's CPU priority for the duration of a sweep so its
 * file-I/O does not compete with claude.exe for the disk-queue on a memory-
 * pressured host. Reversible (try/finally + beforeExit hook) and idempotent.
 *
 * HONEST SCOPE (R12 — fail loud, don't ship features that don't do what they claim).
 * The spec proposed Win32 `PROCESS_MODE_BACKGROUND_BEGIN` (0x100000), which drops
 * CPU + memory + I/O priority in one call. That flag is documented to only work
 * when a process calls `SetPriorityClass(GetCurrentProcess(), 0x100000)` on its
 * OWN handle from within itself — it cannot be set externally via wmic, and Node
 * has no native SetPriorityClass binding. v1 ships the closest portable
 * equivalent: `os.setPriority(0, PRIORITY_BELOW_NORMAL)` which maps to Windows
 * BELOW_NORMAL_PRIORITY_CLASS (0x4000) for the calling process. This drops CPU
 * priority symmetrically but does NOT drop I/O priority. A v2 with native ffi
 * could close that gap; for v1 the CPU drop is observable, reversible, and
 * zero-dep — and that alone is meaningful on a CPU-pressured Claude host.
 *
 * Knobs:
 *   PRISM_FR_SELF_BG_IO_DISABLE=1   bypass entirely (no priority change)
 *   PRISM_FLEET_REAPER_DISABLE=1    master kill switch (already honored fleet-wide)
 *
 * Cross-platform behavior:
 *   - Windows: engages, drops CPU priority via os.setPriority
 *   - non-Windows: no-op (reaper is single-platform; helper still exports OK so
 *     the Linux/Mac contributor test path works without conditional imports)
 */

import os from "node:os";

const SUPPORTED_LEVELS = ["NORMAL", "BELOW_NORMAL"];
const DEFAULT_LEVEL = "BELOW_NORMAL";

/**
 * Decide whether to engage the background-IO guard.
 * Pure — env/platform/flags are injected; no side effects.
 *
 * @param {object} [opts]
 * @param {Record<string,string>} [opts.env]
 * @param {string} [opts.platform]
 * @param {boolean} [opts.dryRun]
 * @param {string} [opts.mode]   sweep mode ("status" never engages — read-only)
 * @returns {{ok: boolean, reason?: string}}
 */
export function shouldEngage({
  env = process.env,
  platform = process.platform,
  dryRun = false,
  mode,
} = {}) {
  if (env.PRISM_FR_SELF_BG_IO_DISABLE === "1") return { ok: false, reason: "disabled-by-env" };
  if (env.PRISM_FLEET_REAPER_DISABLE === "1") return { ok: false, reason: "master-disabled" };
  if (platform !== "win32") return { ok: false, reason: `unsupported-platform:${platform}` };
  if (dryRun === true) return { ok: false, reason: "dry-run" };
  if (mode === "status") return { ok: false, reason: "status-mode" };
  return { ok: true };
}

function priorityValueFor(level, osMod) {
  if (!SUPPORTED_LEVELS.includes(level)) return null;
  // Node uses Unix-style "nice" priority values: higher = LOWER priority.
  // Per Node docs (os.constants.priority):
  //   PRIORITY_NORMAL = 0
  //   PRIORITY_BELOW_NORMAL = 10
  //   PRIORITY_ABOVE_NORMAL = -7
  // On Windows these map to {NORMAL,BELOW_NORMAL,ABOVE_NORMAL}_PRIORITY_CLASS.
  const p = (osMod && osMod.constants && osMod.constants.priority) || {};
  const map = {
    NORMAL: p.PRIORITY_NORMAL ?? 0,
    BELOW_NORMAL: p.PRIORITY_BELOW_NORMAL ?? 10,
  };
  return map[level];
}

/**
 * Set this process's CPU priority via os.setPriority. Pure-injected (env,
 * platform, os module) for hermetic testing. Fail-soft — a failed call
 * returns `{applied:false, reason:'set-priority-failed:...'}` and never
 * throws out (the reaper must never crash because its self-throttle missed).
 *
 * @param {"NORMAL"|"BELOW_NORMAL"} level
 * @param {object} [deps]
 * @returns {{applied:boolean, level:string, value?:number, reason?:string}}
 */
export function setSelfPriority(level, {
  env = process.env,
  platform = process.platform,
  os: osMod = os,
  dryRun = false,
  mode,
} = {}) {
  const gate = shouldEngage({ env, platform, dryRun, mode });
  if (!gate.ok) return { applied: false, level, reason: gate.reason };
  const value = priorityValueFor(level, osMod);
  if (value === null) return { applied: false, level, reason: "unknown-level" };
  try {
    osMod.setPriority(0, value);
    return { applied: true, level, value };
  } catch (err) {
    return { applied: false, level, reason: `set-priority-failed:${err && err.message ? err.message : String(err)}` };
  }
}

/**
 * Begin "background mode" (drop self CPU priority to BELOW_NORMAL by default).
 * Returns a guard object that endBackgroundMode consumes. The guard carries
 * the deps so restore uses the same injected os/platform — important when
 * tests inject mocks.
 *
 * @param {object} [deps]
 * @returns {{engaged:boolean, level:string, reason?:string, value?:number, deps:object}}
 */
export function beginBackgroundMode(deps = {}) {
  const level = deps.level || DEFAULT_LEVEL;
  const result = setSelfPriority(level, deps);
  return {
    engaged: result.applied,
    level,
    reason: result.reason,
    value: result.value,
    deps,
  };
}

/**
 * End background mode — restore NORMAL if we previously engaged. Idempotent
 * (calling twice is harmless; a not-engaged guard returns immediately). The
 * deps from the guard are reused so an injected mock os is honored.
 *
 * Restore intentionally bypasses the env-disable / dry-run / mode gates:
 * once we have engaged, we MUST restore. Only the platform check still
 * applies (os.setPriority on a non-win32 platform with deps mocked is moot).
 *
 * @param {object} guard  from beginBackgroundMode
 * @returns {{restored:boolean, level?:string, reason?:string}}
 */
export function endBackgroundMode(guard) {
  if (!guard || !guard.engaged) return { restored: false, reason: "not-engaged" };
  const osMod = (guard.deps && guard.deps.os) || os;
  const platform = (guard.deps && guard.deps.platform) || process.platform;
  if (platform !== "win32") {
    guard.engaged = false;
    return { restored: false, reason: `unsupported-platform:${platform}` };
  }
  const value = priorityValueFor("NORMAL", osMod);
  try {
    osMod.setPriority(0, value);
    guard.engaged = false;
    return { restored: true, level: "NORMAL" };
  } catch (err) {
    guard.engaged = false; // don't allow a restore-loop
    return { restored: false, reason: `restore-failed:${err && err.message ? err.message : String(err)}` };
  }
}

let _exitHookGuards = [];
let _exitHookInstalled = false;

/**
 * Register a guard to be restored at process exit. Prevents leaving the
 * reaper process stuck at BELOW_NORMAL if a sweep calls process.exit() or
 * the process is terminated abnormally before the try/finally fires.
 *
 * Idempotent installation: the hook is wired once per process; subsequent
 * registers just push to the flush list. Each guard is also one-shot —
 * endBackgroundMode flips engaged=false so a guard already restored by
 * try/finally is a no-op when the hook also fires.
 *
 * @param {object} guard
 * @param {{process?: NodeJS.Process}} [deps]
 */
export function registerExitRestore(guard, { process: proc = process } = {}) {
  if (!guard) return;
  _exitHookGuards.push(guard);
  if (_exitHookInstalled) return;
  _exitHookInstalled = true;
  const flush = () => {
    while (_exitHookGuards.length) {
      try { endBackgroundMode(_exitHookGuards.shift()); } catch { /* best-effort */ }
    }
  };
  proc.once("beforeExit", flush);
  proc.once("exit", flush);
}

/** Test-only: clear module-private latches between cases. */
export function _resetForTest() {
  _exitHookGuards = [];
  _exitHookInstalled = false;
}

/** Test-only: read internal latch state for assertions. */
export function _peekForTest() {
  return {
    exitHookInstalled: _exitHookInstalled,
    pendingGuards: _exitHookGuards.length,
  };
}
