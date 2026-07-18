// scripts/lib/ollama-coresidency.mjs
//
// U-OAB-U9 (OLLAMA-AUTORUN-BUILDLOOP) -- VRAM co-residency policy + a hard-reason load mutex.
// The "optimize for this PC's hardware" half: on a 96GB GPU the everyday pair gpt-oss:20b(~14GB)
// + qwen2.5-coder:32b(~37GB @16K) co-reside warm (~50GB), but gpt-oss:120b(~65GB) CANNOT co-reside
// with the 32b (verified live). So:
//   - RECOMMENDED_ENV : the Ollama service env that keeps the everyday pair warm without KV thrash.
//   - keepAliveFor()  : per-task keep_alive -- everyday classes stay warm "30m"; hard-reason (120b)
//                       is "0s" (load-answer-EVICT, never strand 65GB resident); embed/vision "5m".
//   - applyHints()    : inject the right keep_alive into an /api request body (returns a COPY).
//   - withHardReasonLock(): a cross-process FILE mutex so a 120b (hard-reason) load can never be
//                       issued while a 32b call is in flight -> the eviction collision can't happen
//                       mid-task. Fail-loud: refuses (THROWS) after a timeout rather than colliding.
//
// NOT a router (selection = OllamaTaskOffloaderEngine.ts; see reference_ollama_task_router_dedup).
// This is the per-call HINT + concurrency-safety layer that a router/caller applies. The env map is
// DOCUMENTED + applied per-call here; setting the actual service env is the GATED go-live step
// (editing the Ollama service is out of scope for a slot/bravo-only build).

import os from "node:os";
import path from "node:path";
import { openSync, closeSync, writeSync, statSync, unlinkSync } from "node:fs";

// Ollama service env (exact numbers from the U-OAB-PLAN synthesis, grounded on verified sizes).
export const RECOMMENDED_ENV = Object.freeze({
  OLLAMA_MAX_LOADED_MODELS: "3", // everyday pair (20b+32b) + nomic-embed; never forces a 4th evict mid-task
  OLLAMA_NUM_PARALLEL: "1",      // 32b KV ~17GB/16K; parallel DOUBLES KV -> thrash. 1 keeps it deterministic
  OLLAMA_KV_CACHE_TYPE: "q8_0",  // ~halves 32b KV (~17GB->~9GB); needs flash-attn
  OLLAMA_FLASH_ATTENTION: "1",   // required for KV quant to engage
  OLLAMA_KEEP_ALIVE: "30m",      // everyday models warm across back-to-back task classes
});

// Per-task-class keep_alive. hard-reason MUST be "0s" -- load-answer-evict the 65GB 120b, never strand it.
const KEEP_ALIVE_BY_CLASS = Object.freeze({
  search: "30m", summarize: "30m", codegen: "30m", "gen-test": "30m", explain: "30m", "commit-msg": "30m", triage: "30m",
  "hard-reason": "0s", // never strand gpt-oss:120b (~65GB) resident
  embed: "5m", vision: "5m",
});
const DEFAULT_KEEP_ALIVE = "30m"; // unknown class -> everyday warm default (never strands -- not hard-reason)

export function keepAliveFor(taskClass) {
  return Object.prototype.hasOwnProperty.call(KEEP_ALIVE_BY_CLASS, taskClass) ? KEEP_ALIVE_BY_CLASS[taskClass] : DEFAULT_KEEP_ALIVE;
}
// Return a COPY of the request body with keep_alive set for the task class (never mutate the input).
export function applyHints(body, taskClass) {
  return { ...(body && typeof body === "object" ? body : {}), keep_alive: keepAliveFor(taskClass) };
}

// ---- hard-reason load mutex (cross-process file lock) ----------------------
const DEFAULT_LOCK = path.join(os.tmpdir(), "prism-ollama-hardreason.lock");
// STALE_MS MUST stay > the worst-case 120b cold-load time -- the reclaim below is mtime-only (no PID
// liveness check), so too-low a STALE_MS could evict a slow-but-ALIVE holder and reintroduce the very
// collision this mutex prevents. ACQUIRE_TIMEOUT_MS (5m) < STALE_MS (10m) so a waiter times out before
// a live holder can ever look stale.
const STALE_MS = Number(process.env.PRISM_HARDREASON_STALE_MS || 600000);     // reclaim a lock older than 10m (crashed holder)
const ACQUIRE_TIMEOUT_MS = Number(process.env.PRISM_HARDREASON_ACQUIRE_MS || 300000); // 5m
const POLL_MS = Number(process.env.PRISM_HARDREASON_POLL_MS || 50);
const MAX_RECLAIM = 3; // bound stale-reclaim recursion: a racer that re-back-dates a lock between unlinks can't spin forever
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Atomic exclusive-create acquire; reclaim a STALE lock (crashed holder). Recursion after a reclaim is
// bounded by reclaimsLeft so a pathological racer (re-creating a back-dated stale lock between every
// unlink) can't spin forever -- past the cap we fall through to a normal busy-poll (the safe direction).
function tryAcquire(lockPath, reclaimsLeft = MAX_RECLAIM) {
  let fd;
  try { fd = openSync(lockPath, "wx"); } // wx = create-exclusive -> EEXIST if held
  catch (e) {
    if (e.code !== "EEXIST") throw e;
    try {
      if (reclaimsLeft > 0 && Date.now() - statSync(lockPath).mtimeMs > STALE_MS) {
        unlinkSync(lockPath);                              // crashed holder -> reclaim
        return tryAcquire(lockPath, reclaimsLeft - 1);
      }
    } catch { /* statSync/unlink raced with the holder -> treat as held */ }
    return false;
  }
  try { writeSync(fd, String(process.pid)); } catch { /* pid is diagnostic only */ }
  closeSync(fd);
  return true;
}

// Run fn while holding the hard-reason lock. THROWS (never collides) if the lock can't be acquired
// within acquireTimeoutMs. Always releases in finally (even if fn throws).
export async function withHardReasonLock(fn, { lockPath = DEFAULT_LOCK, acquireTimeoutMs = ACQUIRE_TIMEOUT_MS } = {}) {
  const deadline = Date.now() + acquireTimeoutMs;
  while (!tryAcquire(lockPath)) {
    if (Date.now() >= deadline) throw new Error(`hard-reason lock busy >${acquireTimeoutMs}ms (${lockPath}) -- refusing to collide a 120b load with a resident model`);
    await sleep(POLL_MS);
  }
  try { return await fn(); }
  finally { try { unlinkSync(lockPath); } catch { /* already gone */ } }
}
