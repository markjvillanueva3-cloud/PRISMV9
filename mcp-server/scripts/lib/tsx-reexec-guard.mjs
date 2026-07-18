/**
 * tsx-reexec-guard -- shared bare-node -> tsx self-re-exec for `.mjs` scripts that load `.ts` engines.
 *
 * WHY (the bug class this kills):
 *   A `.mjs` script that imports a TypeScript engine via a `.js` specifier
 *   (`import ... from "../src/engines/X.js"` where only `X.ts` exists) runs fine under
 *   `npx tsx` but throws `ERR_MODULE_NOT_FOUND` under bare `node` -- Node's native TS
 *   type-strip does NOT rewrite a `.js` specifier to its `.ts` sibling for static OR dynamic
 *   imports. So crons / engineered loops / the MCP-server boot / ad-hoc runs that launch
 *   `node script.mjs` die OPAQUELY (e.g. the SFC `sfc-full-sweep-compare.mjs` /
 *   `sfc-all-axis-sweep.mjs` exhaustive-testing sweeps the operator wants cron-driven).
 *
 * This guard relaunches the current script ONCE under tsx so the `.ts` imports resolve on
 * EVERY launch path. Under tsx (or when tsx is absent / the breaker is set) it is a no-op.
 *
 * Generalized (build-once, all-galaxy per R15) from the proven inline impl in
 * `scripts/quoting-train-cycle.mjs` (U-QP-TSX-REEXEC, charlie 2026-06-22,
 * [[reference_charlie_train_cycle_tsx_reexec_2026_06_22]]) -- itself mirroring the
 * `shouldReexecForHeap` self-re-exec in `nn-graph-retrain-lifecycle.mjs`.
 *
 * USAGE -- the calling script MUST use guarded DYNAMIC imports, not static ones (a static
 * `import` is hoisted and throws at module-load BEFORE any guard code can run). Call
 * `reexecUnderTsxIfNeeded(import.meta.url)` as the first statement, THEN `await import(...)`
 * the `.ts` engines.
 *
 * Breaker: `PRISM_TSX_REEXEC=1` is set on the child to prevent an infinite relaunch loop.
 * Opt-out: `PRISM_TSX_NO_REEXEC=1` skips the guard entirely (caller handles tsx itself).
 */
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";

// Matches the tsx loader/preflight/cli entries tsx injects into a child's execArgv.
// Verified live (tsx v4): under tsx execArgv carries `tsx/dist/preflight.cjs` + `tsx/dist/loader.mjs`.
const TSX_LOADER_RE = /tsx[\\/](?:dist[\\/])?(?:loader|preflight|cli|register|esm)/i;

/**
 * True iff this process is ALREADY running under the tsx loader (its execArgv carries tsx).
 * @param {string[]} [execArgv] - defaults to process.execArgv
 * @returns {boolean}
 */
export function isUnderTsx(execArgv = process.execArgv) {
  return execArgv.some((a) => typeof a === "string" && TSX_LOADER_RE.test(a));
}

/**
 * Resolve the tsx CLI entry (`node_modules/tsx/dist/cli.mjs`). PRISM installs tsx under
 * `mcp-server/node_modules`, so we search the start dir, its `mcp-server` subdir, and its
 * parent -- covering a script launched from repo-root OR from `mcp-server/`.
 * @param {string} [startDir] - base dir to search from (defaults to process.cwd())
 * @returns {string|null} absolute path to cli.mjs, or null if tsx is not installed
 */
export function resolveTsxCli(startDir = process.cwd()) {
  const bases = [startDir, resolve(startDir, "mcp-server"), resolve(startDir, "..")];
  for (const b of bases) {
    const cli = resolve(b, "node_modules/tsx/dist/cli.mjs");
    if (existsSync(cli)) return cli;
  }
  return null;
}

/**
 * Decide whether to relaunch under tsx -- PURE (no child process, no exit), so it is unit-testable.
 * Relaunch only when: NOT already under tsx, the breaker is NOT set, opt-out is NOT set, AND
 * tsx is present. tsx-absent -> DO NOT relaunch (fall through so the caller's own fallback /
 * honest error fires rather than spawning a missing binary).
 * @param {{execArgv?:string[], env?:NodeJS.ProcessEnv, cwd?:string, scriptDir?:string}} [o]
 * @returns {{reexec:boolean, reason:string, tsxCli:string|null}}
 */
export function planTsxReexec({ execArgv = process.execArgv, env = process.env, cwd = process.cwd(), scriptDir } = {}) {
  if (isUnderTsx(execArgv)) return { reexec: false, reason: "already-under-tsx", tsxCli: null };
  // Under vitest the runtime ALREADY provides a TS-aware loader (esbuild transform), so relaunching
  // under tsx is unnecessary AND harmful: a guarded sweep .mjs imported at test-collection time would
  // spawn a child and terminate the worker, killing the suite ("no tests"). vitest sets VITEST /
  // VITEST_WORKER_ID in the test runtime. This guard fixes every sibling sweep that is imported from a
  // *.test.ts (sfc-all-axis-sweep, sfc-full-sweep-compare, ...) in one shared place (R7/R8).
  if (env.VITEST || env.VITEST_WORKER_ID) return { reexec: false, reason: "under-vitest", tsxCli: null };
  if (env.PRISM_TSX_REEXEC === "1") return { reexec: false, reason: "reexec-breaker-set", tsxCli: null };
  if (env.PRISM_TSX_NO_REEXEC === "1") return { reexec: false, reason: "reexec-disabled", tsxCli: null };
  const tsxCli = resolveTsxCli(cwd) ?? (scriptDir ? resolveTsxCli(scriptDir) : null);
  if (!tsxCli) return { reexec: false, reason: "tsx-absent", tsxCli: null };
  return { reexec: true, reason: "bare-node-needs-tsx", tsxCli };
}

/**
 * Relaunch the current script under tsx if it was started by bare `node`. On relaunch this
 * runs the child SYNCHRONOUSLY (stdio inherited), then calls `exit()` with the child's status
 * and NEVER RETURNS. Under tsx / tsx-absent / breaker-set it returns the verdict so the caller
 * continues in-process.
 *
 * @param {string} scriptUrl - pass `import.meta.url` from the calling script
 * @param {{argv?:string[], cwd?:string, env?:NodeJS.ProcessEnv,
 *          exit?:(code:number)=>never, runner?:typeof spawnSync}} [opts]
 *          (exit/runner/env injectable for tests)
 * @returns {{reexec:boolean, reason:string}}
 */
export function reexecUnderTsxIfNeeded(scriptUrl, opts = {}) {
  const {
    argv = process.argv.slice(2),
    cwd = process.cwd(),
    env = process.env,
    exit = process.exit,
    runner = spawnSync,
  } = opts;
  const scriptPath = fileURLToPath(scriptUrl);
  const plan = planTsxReexec({ env, cwd, scriptDir: resolve(scriptPath, "..") });
  if (!plan.reexec) return { reexec: false, reason: plan.reason };

  const child = runner(process.execPath, [plan.tsxCli, scriptPath, ...argv], {
    stdio: "inherit",
    env: { ...env, PRISM_TSX_REEXEC: "1" }, // breaker so the child never relaunches again
    windowsHide: true, // never flash a console window (Windows console-flash regression class)
  });
  // Fail loud (R12): a child that never started (status null + an error) is a real failure,
  // not a silent success. Surface it instead of exiting 0.
  if (child && child.error) {
    process.stderr.write(`[tsx-reexec-guard] FAIL: could not relaunch under tsx: ${String(child.error)}\n`);
    exit(1);
  }
  exit(child && typeof child.status === "number" ? child.status : 1);
  // Unreachable in production (exit() above). Returned only when a test injects a non-exiting exit.
  return { reexec: true, reason: plan.reason };
}
