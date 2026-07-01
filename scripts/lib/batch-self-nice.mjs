/**
 * batch-self-nice.mjs -- general "yield to interactive work" self-throttle for
 * heavy PRISM batch jobs (GNN retrain, corpus embedding, index builds).
 *
 * WHY (FORK-STORM-CONSOLIDATION / Phase-3, slot:india 2026-06-15): the single
 * Blackwell workstation runs the 26-slot interactive fleet AND the heavy
 * scheduled batch jobs (nn-graph retrain ~550MB graph load + torch; the embed
 * burst-loads over the wiki/engine/tribal corpora). No scheduled task sets a low
 * OS priority, so a batch job competes with interactive Claude hooks for CPU.
 * `nicifySelf()` drops the CALLING process to Windows BELOW_NORMAL_PRIORITY_CLASS
 * via os.setPriority -- the OS scheduler then lets interactive work preempt it.
 * CPU-priority only (Node has no native I/O-priority binding); GPU work is
 * unaffected, which is fine -- the interactive contention is CPU + disk-queue.
 *
 * Shares the os.setPriority mechanism with `reaper-self-io-priority.mjs` but is
 * DELIBERATELY DECOUPLED: that helper gates on reaper-specific knobs
 * (PRISM_FLEET_REAPER_DISABLE / sweep "status" mode); a batch job must NOT be
 * silently un-throttled by a reaper kill-switch, nor vice-versa. Independent
 * knob, independent policy (R7 -- surface the conflict, don't average it).
 *
 * Knob: PRISM_BATCH_NICE_DISABLE=1  -> no-op (full-priority batch run).
 * Fail-OPEN: any os.setPriority failure returns {applied:false,...}, never throws
 * (a throttle that cannot engage must never crash the batch job it guards).
 * Idempotent: re-calling re-asserts BELOW_NORMAL; the exit-restore is wired once.
 * Non-win32: no-op (returns unsupported-platform) so Linux/Mac CI imports cleanly.
 */

import os from "node:os";

const BELOW_NORMAL = (os.constants && os.constants.priority && os.constants.priority.PRIORITY_BELOW_NORMAL) ?? 10;
const NORMAL = (os.constants && os.constants.priority && os.constants.priority.PRIORITY_NORMAL) ?? 0;

let _exitWired = false;

/**
 * Drop this process to BELOW_NORMAL CPU priority so interactive work preempts it.
 * Pure-injected (env/platform/os/process) for hermetic testing.
 *
 * @param {object} [deps]
 * @param {Record<string,string>} [deps.env]
 * @param {string} [deps.platform]
 * @param {typeof os} [deps.osMod]
 * @param {NodeJS.Process} [deps.proc]
 * @returns {{applied:boolean, level?:string, value?:number, reason?:string}}
 */
export function nicifySelf({ env = process.env, platform = process.platform, osMod = os, proc = process } = {}) {
  if (env.PRISM_BATCH_NICE_DISABLE === "1") return { applied: false, reason: "disabled-by-env" };
  if (platform !== "win32") return { applied: false, reason: `unsupported-platform:${platform}` };
  try {
    osMod.setPriority(0, BELOW_NORMAL);
  } catch (err) {
    return { applied: false, reason: `set-priority-failed:${err && err.message ? err.message : String(err)}` };
  }
  if (!_exitWired) {
    _exitWired = true;
    const restore = () => { try { osMod.setPriority(0, NORMAL); } catch { /* best-effort */ } };
    proc.once("beforeExit", restore);
    proc.once("exit", restore);
  }
  return { applied: true, level: "BELOW_NORMAL", value: BELOW_NORMAL };
}

/** Test-only: reset the module-private exit-wire latch between cases. */
export function _resetForTest() { _exitWired = false; }
export function _peekForTest() { return { exitWired: _exitWired }; }
