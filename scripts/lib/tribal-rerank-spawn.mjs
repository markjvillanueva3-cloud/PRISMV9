// scripts/lib/tribal-rerank-spawn.mjs
// -------------------------------------
// OBSIDIAN-VAULT-SYNERGY/U-OBS-TRIBAL-HEAP-SPAWN (slot:alpha, 2026-06-09)
//
// Single source of truth for SPAWNING the tribal reranker (.claude/scripts/
// tribal-rerank.mjs, PSN leg #5). The spawn POLICY — heap ceiling, timeout,
// stdio, windowsHide, env — lives here so it can never drift between callers.
//
// WHY THIS EXISTS (the bug it fixes): the tribal index
// (state/shared/tribal-embed-index.json) is ~167MB and growing. The reranker's
// JSON.parse builds a full object graph (N entries x 768 floats) that OOMs the
// default ~2GB node heap, silently killing the child (status != 0 / ETIMEDOUT)
// → callers fall through to passthrough() → tribal hits NEVER injected. Two
// callers spawned it with DIVERGENT configs:
//   - tribal-by-domain-inject.mjs   execFileSync + NODE_OPTIONS=--max-old-space-size=8192  (works)
//   - tribal-inject-on-edit.mjs     spawnSync + NO heap flag                                (OOMed → silent)
// (R7 — N divergent impls of one load-bearing spawn; same drift class as the
// WEDM 3-selector / NN schema-read bugs.) Routing both through this helper bakes
// the heap-safe env into one chokepoint.
//
// The box has 128GB RAM; --max-old-space-size is a CEILING, not a reservation.
// The deeper fix is migrating rerank off per-prompt JSON.parse to Qdrant vector
// search (tracked separately) — this keeps the live injection surface alive now.

import { execFileSync } from "node:child_process";

export const DEFAULT_RERANK_HEAP_MB = 8192;
export const DEFAULT_RERANK_TIMEOUT_MS = 4000;

/**
 * Build a heap-safe env for the rerank spawn — appends (does not clobber) an
 * existing NODE_OPTIONS so the index can't OOM the default-heap child.
 * @param {NodeJS.ProcessEnv} [env=process.env]
 * @param {number} [heapMB=DEFAULT_RERANK_HEAP_MB]
 */
export function rerankSpawnEnv(env = process.env, heapMB = DEFAULT_RERANK_HEAP_MB) {
  return {
    ...env,
    NODE_OPTIONS: [env.NODE_OPTIONS, `--max-old-space-size=${heapMB}`].filter(Boolean).join(" "),
  };
}

/**
 * Spawn the tribal reranker with the heap-safe policy baked in.
 * @param {string[]} args - full argv for node (args[0] = the rerank script path)
 * @param {object} [opts]
 * @param {number} [opts.timeoutMs]
 * @param {number} [opts.heapMB]
 * @param {Function} [opts.execImpl] - injectable for tests (default execFileSync)
 * @param {NodeJS.ProcessEnv} [opts.env]
 * @param {string} [opts.execPath] - node binary (default process.execPath)
 * @returns {{ok:true, stdout:string} | {ok:false, reason:string, error?:Error}}
 */
export function spawnTribalRerank(args, {
  timeoutMs = DEFAULT_RERANK_TIMEOUT_MS,
  heapMB = DEFAULT_RERANK_HEAP_MB,
  execImpl = execFileSync,
  env = process.env,
  execPath = process.execPath,
} = {}) {
  try {
    const stdout = execImpl(execPath, args, {
      encoding: "utf8",
      timeout: timeoutMs,
      stdio: ["ignore", "pipe", "ignore"],
      windowsHide: true,
      env: rerankSpawnEnv(env, heapMB),
    });
    return { ok: true, stdout };
  } catch (e) {
    const reason = e && e.code === "ETIMEDOUT" ? "rerank_timeout" : "rerank_failed";
    return { ok: false, reason, error: e };
  }
}
