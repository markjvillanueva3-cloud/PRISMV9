/**
 * sweep-heap-reexec -- shared "relaunch with a bigger V8 heap" guard for the SFC exhaustive
 * sweeps, mirroring tsx-reexec-guard.mjs in shape.
 *
 * WHY (the bug class this kills):
 *   `--mode full` enumerates MILLIONS of cells; the default ~2GB V8 heap OOMs mid-stream
 *   (verified FATAL "Reached heap limit Allocation failed - JavaScript heap out of memory" at
 *   ~165,656 ledger rows, 2026-06-25, slot:oscar). The accumulators in the script itself are
 *   tiny (a few MB of numbers) -- the heap pressure is the full-enumeration materialization +
 *   downstream engine working set, a large-but-BOUNDED allocation (a 32GB heap completes it on
 *   the 136GB host; it is NOT an unbounded per-cell leak).
 *
 *   Unlike the tsx guard, this keys on the HEAP flag (not tsx presence), so it fires under BOTH
 *   bare-node AND `npx tsx` -- the documented run command is `npx tsx scripts/...`, which is
 *   ALREADY under tsx, so the tsx guard no-ops and can never add heap by itself.
 *
 * It relaunches the SAME command (preserving any tsx loader already in execArgv) with
 * --max-old-space-size in NODE_OPTIONS, so the heap survives a subsequent tsx re-exec via env
 * inheritance, then exits with the child's status. No-op for non-full modes, when a heap flag is
 * already in effect (operator set NODE_OPTIONS), or when the breaker/opt-out is set.
 *
 * Mirrors the proven inline `shouldReexecForHeap` self-re-exec in
 * `scripts/nn-graph-retrain-lifecycle.mjs` (the GNN-lifecycle OOM fix), generalized for the SFC
 * sweep family so both `sfc-full-sweep-compare.mjs` and the sibling `sfc-all-axis-sweep.mjs` can
 * share one guard (R15 clone-don't-fork).
 *
 * Breaker: PRISM_SFC_SWEEP_HEAP_REEXEC=1 (set on the child -- prevents an infinite relaunch).
 * Knob:    PRISM_SFC_SWEEP_HEAP_MB (default 32768; the host has 136GB RAM).
 * Opt-out: PRISM_SFC_SWEEP_NO_HEAP_REEXEC=1 (caller manages heap itself).
 * [[reference_oscar_full_sweep_heap_oom_2026_06_25]]
 */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

// `--max-old-space-size` / `--max_old_space_size` (node accepts both separators) in NODE_OPTIONS.
const HEAP_FLAG_RE = /max[-_]old[-_]space[-_]size/i;

/**
 * PURE decision: should we relaunch with a bigger heap? True iff `--mode full` AND no heap flag
 * is already in effect AND neither the breaker nor the opt-out is set. No side effects -- unit
 * testable.
 * @param {string[]} argv  e.g. process.argv.slice(2)
 * @param {Record<string,string|undefined>} [env]
 * @returns {boolean}
 */
export function shouldReexecForHeap(argv, env = {}) {
  if (env.PRISM_SFC_SWEEP_HEAP_REEXEC === "1") return false; // breaker -- already relaunched once
  if (env.PRISM_SFC_SWEEP_NO_HEAP_REEXEC === "1") return false; // explicit opt-out
  const modeIdx = Array.isArray(argv) ? argv.indexOf("--mode") : -1;
  const isFull = modeIdx >= 0 && argv[modeIdx + 1] === "full";
  if (!isFull) return false; // prod mode (576 cells) fits the default heap
  if (HEAP_FLAG_RE.test(env.NODE_OPTIONS || "")) return false; // operator already bumped the heap
  return true;
}

/**
 * Resolve the heap size (MB) from the knob PRISM_SFC_SWEEP_HEAP_MB, defaulting to 32768 (32GB).
 * @param {Record<string,string|undefined>} [env]
 * @returns {number}
 */
export function resolveHeapMb(env = {}) {
  const n = Number(env.PRISM_SFC_SWEEP_HEAP_MB);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 32768;
}

/**
 * Build the child env for the heap re-exec: append --max-old-space-size to any existing
 * NODE_OPTIONS and set the breaker. PURE (testable) -- does not spawn.
 * @param {Record<string,string|undefined>} env
 * @param {number} heapMb
 * @returns {Record<string,string|undefined>}
 */
export function buildHeapChildEnv(env, heapMb) {
  return {
    ...env,
    NODE_OPTIONS: `${env.NODE_OPTIONS || ""} --max-old-space-size=${heapMb}`.trim(),
    PRISM_SFC_SWEEP_HEAP_REEXEC: "1",
  };
}

/**
 * Relaunch the current script with a bigger heap if needed. On relaunch runs the child
 * SYNCHRONOUSLY (stdio inherited) then exits with its status and NEVER RETURNS. Otherwise returns
 * the verdict so the caller continues in-process.
 *
 * @param {string} scriptUrl  pass `import.meta.url` from the calling script
 * @param {{argv?:string[], env?:Record<string,string|undefined>, execArgv?:string[],
 *          execPath?:string, exit?:(c:number)=>never, runner?:typeof spawnSync}} [opts]
 *          (argv/env/execArgv/execPath/exit/runner injectable for tests)
 * @returns {{reexec:boolean, reason:string}}
 */
export function reexecForHeapIfNeeded(scriptUrl, opts = {}) {
  const {
    argv = process.argv.slice(2),
    env = process.env,
    execArgv = process.execArgv,
    execPath = process.execPath,
    exit = process.exit,
    runner = spawnSync,
  } = opts;
  if (!shouldReexecForHeap(argv, env)) return { reexec: false, reason: "no-heap-reexec-needed" };

  const scriptPath = fileURLToPath(scriptUrl);
  const childEnv = buildHeapChildEnv(env, resolveHeapMb(env));
  // Preserve execArgv so a tsx loader already in flight is kept; NODE_OPTIONS carries the heap
  // flag forward through any subsequent tsx re-exec via env inheritance.
  const child = runner(execPath, [...execArgv, scriptPath, ...argv], {
    stdio: "inherit",
    env: childEnv,
    windowsHide: true, // never flash a console window (Windows console-flash regression class)
  });
  // Fail loud (R12): a child that never started is a real failure, not a silent success.
  if (child && child.error) {
    process.stderr.write(`[sweep-heap-reexec] FAIL: could not relaunch with heap: ${String(child.error)}\n`);
    exit(1);
  }
  exit(child && typeof child.status === "number" ? child.status : 1);
  // Unreachable in production (exit() above). Returned only when a test injects a non-exiting exit.
  return { reexec: true, reason: "heap-reexec" };
}
