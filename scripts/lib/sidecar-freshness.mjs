#!/usr/bin/env node
/**
 * sidecar-freshness.mjs -- opportunistic, no-elevation sidecar refresh at Stop.
 *
 * The brain's recall sidecars rot between manual runs because the canonical
 * auto-refresh (the `PRISM Brain Refresh` scheduled task) is elevation-gated and
 * unregistered on this host. This lib is the no-elevation complement: the
 * `session-consolidate-graph.mjs` Stop hook calls `runSidecarFreshness()` to
 * mtime-compare two recall sidecars against their sources and, when stale,
 * DETACH-spawn the existing rebuild scripts. The heavy work runs after the hook
 * exits, so the ~5 s Stop budget is never blocked.
 *
 * Two refresh targets (paths verified live 2026-06-09):
 *   - master-index  : system-graph.json -> system-graph-index.json  (no Ollama)
 *   - memory-embed  : memory-index-sidecar.json (BM25) -> memory-embeddings-sidecar.json (Ollama)
 *
 * Thundering-herd safe: the 26-chat fleet all hit Stop, so a shared O_EXCL
 * decision lock serializes the decide+stamp window and a shared cooldown stamp
 * (default 20 min) debounces across chats -- only the first chat to see a stale
 * sidecar in a cooldown window spawns. The lock guards only the brief decision;
 * the detached rebuild outlives it.
 *
 * Everything is injectable (fsImpl / spawnImpl / ollamaProbe / now) for the
 * hermetic suite; the hook wires the real impls.
 */
import fs from "node:fs";
import os from "node:os";
import { join } from "node:path";

const PRISM = "H:/prism";
export const DEFAULT_COOLDOWN_MS = 20 * 60 * 1000; // 20 min between fleet-wide refresh spawns
export const DEFAULT_LOCK_TTL_MS = 2 * 60 * 1000;  // decision-window lock TTL (spawns are detached)
// build-graph-index self-re-execs with an 8 GB heap; skip its spawn when free
// physical RAM is below this so an opportunistic Stop-time rebuild never tips a
// memory-pressured host into an OOM cascade (observed live at 96% commit).
export const DEFAULT_GRAPH_INDEX_MIN_FREE_MB = 8192;

/** Default free-RAM probe (free physical MB). Injectable for the suite. */
export function freeRamMB() {
  return os.freemem() / (1024 * 1024);
}

/** The two recall sidecars kept fresh. Paths verified live 2026-06-09. */
export const REFRESH_TARGETS = [
  {
    id: "master-index",
    source: `${PRISM}/state/shared/system-viz/system-graph.json`,
    sidecar: `${PRISM}/state/shared/system-viz/system-graph-index.json`,
    script: `${PRISM}/scripts/build-graph-index.mjs`,
    args: [],
    requiresOllama: false,
    requiresFreeRamMB: DEFAULT_GRAPH_INDEX_MIN_FREE_MB, // 8 GB-heap rebuild -> gate on free RAM
  },
  {
    id: "memory-embed",
    source: `${PRISM}/state/shared/memory-index-sidecar.json`,
    sidecar: `${PRISM}/state/shared/memory-embeddings-sidecar.json`,
    script: `${PRISM}/scripts/build-memory-embeddings-sidecar.mjs`,
    args: ["--resume"],
    requiresOllama: true,
  },
];

/**
 * A target is stale when its sidecar is missing or older than its source. Any
 * stat error fails SAFE (returns false -> no spawn): a freshness check must
 * never itself cause a spurious heavy rebuild. A missing SOURCE also means
 * "nothing to refresh" (false) rather than a phantom stale.
 */
export function isTargetStale(target, fsImpl = fs) {
  try {
    if (!fsImpl.existsSync(target.source)) return false;
    if (!fsImpl.existsSync(target.sidecar)) return true;
    return fsImpl.statSync(target.source).mtimeMs > fsImpl.statSync(target.sidecar).mtimeMs;
  } catch {
    return false;
  }
}

/**
 * Decide which targets to refresh: cooldown first (a fresh stamp suppresses all),
 * then per-target staleness. Pure -- inject now/stampTime/fsImpl.
 */
export function decideRefresh({ targets, fsImpl = fs, now, stampTime, cooldownMs = DEFAULT_COOLDOWN_MS }) {
  if (Number.isFinite(stampTime) && now - stampTime < cooldownMs) {
    return { cooledDown: true, stale: [], reason: `cooldown(${Math.round((now - stampTime) / 1000)}s)` };
  }
  const stale = targets.filter((t) => isTargetStale(t, fsImpl));
  return { cooledDown: false, stale, reason: stale.length ? `${stale.length}-stale` : "all-fresh" };
}

/**
 * O_EXCL decision lock. Returns true on acquire. A held lock younger than ttlMs
 * blocks (a peer chat owns the decision window); a stale lock is reclaimed once.
 * A corrupt lock is treated as held (conservative -- never stomp a peer).
 */
export function acquireDecisionLock(lockPath, { fsImpl = fs, now = Date.now(), ttlMs = DEFAULT_LOCK_TTL_MS } = {}) {
  const write = () => {
    const fd = fsImpl.openSync(lockPath, "wx"); // O_EXCL: fails EEXIST if present
    try { fsImpl.writeFileSync(fd, JSON.stringify({ pid: process.pid, at: now })); }
    finally { fsImpl.closeSync(fd); }
  };
  try { write(); return true; } catch (e) {
    if (e.code !== "EEXIST") return false;
  }
  let heldAt;
  try {
    heldAt = Number(JSON.parse(fsImpl.readFileSync(lockPath, "utf8")).at) || 0;
  } catch {
    // Corrupt/torn lock JSON: fall back to the file's mtime so a single bad
    // write can't wedge fleet-wide refresh forever (the JSON.parse-throws path
    // would otherwise never reach the staleness check). Unreadable mtime too ->
    // treat as held (conservative, never stomp a peer).
    try { heldAt = fsImpl.statSync(lockPath).mtimeMs; } catch { return false; }
  }
  if (now - heldAt < ttlMs) return false; // live peer (by stamp or, if corrupt, mtime)
  try { fsImpl.rmSync(lockPath, { force: true }); write(); return true; } // stale -> reclaim once
  catch { return false; }
}

export function releaseDecisionLock(lockPath, fsImpl = fs) {
  try { fsImpl.rmSync(lockPath, { force: true }); } catch { /* best-effort */ }
}

function readStampTime(stampPath, fsImpl) {
  try { return Number(JSON.parse(fsImpl.readFileSync(stampPath, "utf8")).at); }
  catch { return NaN; }
}
function writeStamp(stampPath, now, fsImpl) {
  try { fsImpl.writeFileSync(stampPath, JSON.stringify({ at: now })); } catch { /* best-effort */ }
}

/**
 * Acquire the lock, decide, and DETACH-spawn the rebuilds for stale targets.
 * Ollama-gated targets spawn only if `ollamaProbe()` resolves truthy (the embed
 * builder exits 1 on an unreachable Ollama, so spawning it down is pure waste).
 * The cooldown stamp is written ONLY when something is actually spawned, so a
 * no-op decision never suppresses a later genuine refresh.
 *
 * @returns { ran, reason, spawned: string[], skipped: {id,reason}[] }
 */
export async function runSidecarFreshness({
  fsImpl = fs,
  now = Date.now(),
  targets = REFRESH_TARGETS,
  lockPath,
  stampPath,
  cooldownMs = DEFAULT_COOLDOWN_MS,
  lockTtlMs = DEFAULT_LOCK_TTL_MS,
  spawnImpl,
  ollamaProbe,
  freeRamProbe = freeRamMB,
} = {}) {
  if (!acquireDecisionLock(lockPath, { fsImpl, now, ttlMs: lockTtlMs })) {
    return { ran: false, reason: "lock-held", spawned: [], skipped: [] };
  }
  try {
    const stampTime = readStampTime(stampPath, fsImpl);
    const decision = decideRefresh({ targets, fsImpl, now, stampTime, cooldownMs });
    if (decision.cooledDown || decision.stale.length === 0) {
      return { ran: false, reason: decision.reason, spawned: [], skipped: [] };
    }
    const spawned = [];
    const skipped = [];
    let ollamaUp = null; // probed at most once, only if a stale target needs it
    let freeMB = null;   // probed at most once, only if a stale target gates on RAM
    for (const t of decision.stale) {
      if (t.requiresOllama) {
        if (ollamaUp === null) ollamaUp = ollamaProbe ? Boolean(await ollamaProbe()) : false;
        if (!ollamaUp) { skipped.push({ id: t.id, reason: "ollama-down" }); continue; }
      }
      if (t.requiresFreeRamMB) {
        if (freeMB === null) freeMB = Number(freeRamProbe ? freeRamProbe() : Infinity);
        if (freeMB < t.requiresFreeRamMB) {
          skipped.push({ id: t.id, reason: `low-ram(${Math.round(freeMB)}<${t.requiresFreeRamMB})` });
          continue;
        }
      }
      try { spawnImpl(t.script, t.args); spawned.push(t.id); }
      catch (e) { skipped.push({ id: t.id, reason: e?.message || "spawn-failed" }); }
    }
    if (spawned.length > 0) writeStamp(stampPath, now, fsImpl);
    return { ran: spawned.length > 0, reason: decision.reason, spawned, skipped };
  } finally {
    releaseDecisionLock(lockPath, fsImpl);
  }
}

/** Default lock/stamp paths under the hook's STATE_DIR. */
export function defaultPaths(stateDir) {
  return {
    lockPath: join(stateDir, "sidecar-hook-refresh.lock"),
    stampPath: join(stateDir, "sidecar-hook-refresh.stamp.json"),
  };
}

export default runSidecarFreshness;
