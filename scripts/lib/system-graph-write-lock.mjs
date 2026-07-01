#!/usr/bin/env node
// tier: T0
/**
 * system-graph-write-lock.mjs — shared cross-process write lock for
 * `state/shared/system-viz/system-graph.json` (DEV-TOOL-CONFLICT-AUDIT-2026-05-17 / U-VIZ-F11-CROSS-LOCK).
 *
 * ── Why this exists ──────────────────────────────────────────────────────
 * F1 (commit dd735c1871) gave `generate-system-viz.mjs` its own OUT_FILE
 * (`architecture-graph.json`) so it no longer clobbers `system-graph.json`.
 * F11 closes the REMAINING racer pair on `system-graph.json`:
 *
 *   • `regen-viz.mjs` — orchestrates an ~8-min chain of subprocesses
 *     (merge-augmentations → repair → dedup → reparent → parent-edges →
 *     seed-ghost → obsidian-bridge) that each rewrite system-graph.json.
 *     It held NO lock — nothing made a concurrent writer wait for it.
 *   • `system-viz-add-node.mjs flushQueue` — atomic temp+rename write of
 *     the same graph. Its existing TIER-1 DEFER only consulted
 *     `.system-viz-on-commit.pid` (generate-system-viz's lock), so a
 *     regen-viz chain was invisible to it → lost-update window:
 *       regen reads G0 → add-node flush writes G1 (atomic) →
 *       a later regen stage writes G0+merge, silently dropping G1's nodes.
 *
 * This module is the single shared advisory lock BOTH writers consult:
 *   - `regen-viz.mjs` ACQUIRES it for its whole subprocess chain (one
 *     parent-held lock covers every child stage — children need no lock).
 *   - `system-viz-add-node.mjs flushQueue` DEFERS while it is held live
 *     (mirrors its existing `.system-viz-on-commit.pid` fence exactly).
 *
 * Semantics are byte-for-byte the proven crash-safe PID-file pattern from
 * `system-viz-add-node.mjs:acquirePidLock/releasePidLock/isRegenActive`
 * (R8 — reuse the convention, do not reinvent): a dead holder PID
 * (`process.kill(pid,0)` throws ESRCH) is reclaimable, a live holder is
 * respected, an unreadable/absent lock proceeds.
 *
 * ── TTL backstop (GRAPH-OCTOPUS-AUTOWIRE-MS0 / U-GO-B2, 2026-05-22) ──────
 * The dead-pid probe self-heals a CLEANLY-dead holder. It does NOT heal a
 * Windows PID-reuse phantom: when the OS recycles a dead regen's pid number
 * to an unrelated live process, `process.kill(pid,0)` returns "alive" and
 * the lock wedges FOREVER. This was observed in production: a crashed regen
 * (pid 24784) left `.system-graph-write.pid` holding that pid; every
 * subsequent `system-viz-on-commit` run skipped on the phantom for 9.5 h
 * while the post-commit hook discarded the skip message — the graph froze
 * silently. The TTL backstop fixes the wedge: a lock whose FILE MTIME is
 * older than `lockTtlMs()` is reclaimable regardless of the pid probe.
 * 30 min default leaves wide headroom over regen-viz's ~8-min worst-case
 * chain. File mtime (not an embedded timestamp) is used so OLD pid-only
 * lock files written before this change are still aged correctly.
 *
 * Lock file: `<repo-root>/.system-graph-write.pid` (sits beside the existing
 * `.system-viz-on-commit.pid` — same repo-root convention). Override with
 * `PRISM_SYSTEM_GRAPH_WRITE_PID` for hermetic tests.
 *
 * Pure-core + injected `fs`/`killProbe` so the concurrency logic is
 * unit-testable without real processes (sibling convention: see
 * scripts/lib/graphsage-*.mjs `.mjs`+`.test.mjs` pairs).
 *
 * Knobs:
 *   PRISM_SYSTEM_GRAPH_WRITE_PID            override lock path (test isolation)
 *   PRISM_SYSTEM_GRAPH_WRITE_LOCK_TTL_MS    stale-lock TTL in ms (default 30min)
 *   PRISM_SYSTEM_GRAPH_WRITE_LOCK_OFF       =1 → acquire is a no-op success,
 *                                            active-probe always false (escape
 *                                            hatch if the lock ever wedges; the
 *                                            pre-F11 unguarded behavior).
 */

import nodeFs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// scripts/lib/ → repo root is two levels up.
const REPO_ROOT = path.resolve(__dirname, "..", "..");

const DISABLED = process.env.PRISM_SYSTEM_GRAPH_WRITE_LOCK_OFF === "1";

/**
 * Conventional exit code for "skipped because a peer holds the cross-lock"
 * (a concurrent regen-viz / system-viz-on-commit is running — the graph is
 * UNTOUCHED and intact; benign, retry-later). Deliberately 4 to avoid
 * colliding with `regen-viz-merge-guard.mjs`'s exit-code table
 * (EXIT_OK=0 · EXIT_MERGE_FAILED=2 · EXIT_MERGE_NO_OP=3 — the last is a
 * suspected-corruption signal with the OPPOSITE operator response). A cron
 * / loop wrapper must be able to tell "benign concurrent skip" (4) apart
 * from "merge silently no-op'd, investigate" (3). See U-VIZ-F11-CROSS-LOCK.
 */
export const EXIT_GRAPH_WRITE_LOCK_SKIP = 4;

/**
 * Default stale-lock TTL: a lock whose file mtime is older than this is
 * reclaimable regardless of the pid liveness probe. Set well beyond any
 * legitimate hold — regen-viz's longest chain is ~8 min; 30 min leaves
 * wide headroom while still self-healing a wedged lock within half an hour
 * instead of never. Override with `PRISM_SYSTEM_GRAPH_WRITE_LOCK_TTL_MS`.
 */
export const DEFAULT_LOCK_TTL_MS = 30 * 60 * 1000;

/** Resolve the effective stale-lock TTL (ms). Env override wins when >0. */
export function lockTtlMs() {
  const v = Number(process.env.PRISM_SYSTEM_GRAPH_WRITE_LOCK_TTL_MS);
  return Number.isFinite(v) && v > 0 ? v : DEFAULT_LOCK_TTL_MS;
}

/**
 * Canonical lock path. `PRISM_SYSTEM_GRAPH_WRITE_PID` wins (absolute-resolved)
 * so tests can isolate; otherwise repo-root `.system-graph-write.pid`.
 */
export function graphWriteLockPath() {
  const override = process.env.PRISM_SYSTEM_GRAPH_WRITE_PID;
  if (override && override.trim()) return path.resolve(override.trim());
  return path.join(REPO_ROOT, ".system-graph-write.pid");
}

/**
 * Default liveness probe — throws on a DEAD pid (ESRCH), returns void on a
 * live one. Signal 0 sends no signal, only validity/permission checks.
 * Injected in tests so we never poke real PIDs.
 */
function defaultKillProbe(pid) {
  process.kill(pid, 0);
}

/**
 * Pure decision core: given the raw lock-file contents (or null if absent /
 * unreadable), this process's pid, and a liveness probe, decide whether the
 * lock can be ACQUIRED.
 *
 * Returns:
 *   { acquire: true,  heldBy: null }                       — free / stale / our own
 *   { acquire: true,  heldBy: null, reason: "stale-ttl" }  — reclaimed: lock older than ttlMs
 *   { acquire: false, heldBy: <pid>, reason: "live" }      — a different LIVE pid holds it
 *
 * Mirrors `acquirePidLock`, plus the U-GO-B2 TTL backstop:
 *   - no file / unreadable / unparseable pid  → acquire (write our pid)
 *   - pid === self                            → acquire (idempotent re-entry)
 *   - lock file mtime older than ttlMs        → acquire (stale-ttl reclaim,
 *                                               beats the PID-reuse phantom)
 *   - pid is a different LIVE process          → refuse
 *   - pid is a different DEAD process          → acquire (reclaim stale)
 *
 * @param {string|null} rawContents lock-file contents (null = absent/unreadable)
 * @param {number} selfPid          this process's pid
 * @param {function} [killProbe]    liveness probe (throws on dead pid)
 * @param {number|null} [lockAgeMs] lock-file age in ms; null when unavailable
 *                                  (in-memory fake fs) → TTL check skipped
 * @param {number} [ttlMs]          staleness threshold (default DEFAULT_LOCK_TTL_MS)
 */
export function decideAcquire(rawContents, selfPid, killProbe = defaultKillProbe, lockAgeMs = null, ttlMs = DEFAULT_LOCK_TTL_MS) {
  if (rawContents == null) return { acquire: true, heldBy: null };
  const pid = parseInt(String(rawContents).trim(), 10);
  if (!Number.isFinite(pid) || pid <= 0) return { acquire: true, heldBy: null };
  if (pid === selfPid) return { acquire: true, heldBy: pid };
  // TTL backstop: a lock older than ttlMs is stale regardless of the pid
  // probe — defeats the Windows PID-reuse phantom (a recycled pid number
  // inherited by an unrelated live process reads "live" forever). lockAgeMs
  // is null when the file mtime is unavailable (in-memory fake fs) → TTL
  // skipped, pure pid-probe behavior preserved.
  if (Number.isFinite(lockAgeMs) && lockAgeMs > ttlMs) {
    return { acquire: true, heldBy: null, reason: "stale-ttl" };
  }
  try {
    killProbe(pid); // throws ESRCH if dead
    return { acquire: false, heldBy: pid, reason: "live" };
  } catch {
    return { acquire: true, heldBy: null }; // dead holder — reclaim
  }
}

/**
 * Pure decision core for the "is the lock held by a live OTHER process?"
 * query (the DEFER predicate add-node uses). Returns true ONLY when the
 * lock file holds a live pid that is NOT us AND the lock is younger than
 * ttlMs. Absent / unreadable / stale-dead / stale-by-ttl / our-own → false
 * (safe to proceed). Mirrors `isRegenActive` plus the U-GO-B2 TTL backstop.
 *
 * @param {string|null} rawContents lock-file contents
 * @param {number} selfPid          this process's pid
 * @param {function} [killProbe]    liveness probe
 * @param {number|null} [lockAgeMs] lock-file age in ms; null → TTL skipped
 * @param {number} [ttlMs]          staleness threshold
 */
export function decideActive(rawContents, selfPid, killProbe = defaultKillProbe, lockAgeMs = null, ttlMs = DEFAULT_LOCK_TTL_MS) {
  if (rawContents == null) return false;
  const pid = parseInt(String(rawContents).trim(), 10);
  if (!Number.isFinite(pid) || pid <= 0) return false;
  if (pid === selfPid) return false; // our own lock never blocks us
  // TTL backstop (see decideAcquire): a lock past its TTL is stale → not
  // active, so a wedged phantom never permanently defers add-node.
  if (Number.isFinite(lockAgeMs) && lockAgeMs > ttlMs) return false;
  try {
    killProbe(pid);
    return true; // alive + other + within-ttl → active
  } catch {
    return false; // dead pid → stale lock, not active
  }
}

/** Read lock-file contents or null (absent / unreadable). */
function readLockRaw(fs, pPath) {
  try {
    return fs.readFileSync(pPath, "utf8");
  } catch {
    return null;
  }
}

/**
 * Lock-file age in ms from its mtime, or null when unavailable (absent
 * file, or an injected fake fs without `statSync` — in-memory fakes have
 * no real mtime, so the TTL check is correctly skipped and pure pid-probe
 * behavior is preserved). File mtime is used (not an embedded timestamp)
 * so a pid-only lock file written before U-GO-B2 is still aged correctly.
 */
function readLockAgeMs(fs, pPath, nowMs = Date.now()) {
  try {
    if (typeof fs.statSync !== "function") return null;
    const st = fs.statSync(pPath);
    const m = st && Number.isFinite(st.mtimeMs) ? st.mtimeMs : null;
    return m == null ? null : Math.max(0, nowMs - m);
  } catch {
    return null;
  }
}

/**
 * Acquire the shared graph-write lock.
 * @returns {{acquired:boolean, heldBy:number|null, path:string, disabled?:boolean, reclaimedStale?:boolean}}
 *   acquired=true  → we now own it (our pid written)
 *   acquired=false → a different LIVE process holds it; heldBy = its pid
 *   reclaimedStale=true → we reclaimed a lock that was past its TTL
 *
 * When `PRISM_SYSTEM_GRAPH_WRITE_LOCK_OFF=1` this is a no-op success
 * (acquired:true, disabled:true) — the explicit pre-F11 escape hatch.
 */
export function acquireGraphWriteLock({ fs = nodeFs, pidPath, selfPid = process.pid, killProbe, ttlMs = lockTtlMs() } = {}) {
  const pPath = pidPath || graphWriteLockPath();
  if (DISABLED) return { acquired: true, heldBy: null, path: pPath, disabled: true };
  try {
    fs.mkdirSync(path.dirname(pPath), { recursive: true });
  } catch {
    /* dir exists / unmakeable — write attempt below will surface real failure */
  }
  const ageMs = readLockAgeMs(fs, pPath);
  const decision = decideAcquire(readLockRaw(fs, pPath), selfPid, killProbe, ageMs, ttlMs);
  if (!decision.acquire) {
    return { acquired: false, heldBy: decision.heldBy, path: pPath };
  }
  fs.writeFileSync(pPath, String(selfPid));
  return {
    acquired: true,
    heldBy: null,
    path: pPath,
    reclaimedStale: decision.reason === "stale-ttl",
  };
}

/**
 * Release the lock — ONLY if we still own it (pid === self). Never unlinks
 * a peer's lock (mirrors `releasePidLock`). Idempotent / fail-soft.
 */
export function releaseGraphWriteLock({ fs = nodeFs, pidPath, selfPid = process.pid } = {}) {
  const pPath = pidPath || graphWriteLockPath();
  try {
    const raw = fs.readFileSync(pPath, "utf8");
    if (parseInt(String(raw).trim(), 10) === selfPid) fs.unlinkSync(pPath);
  } catch {
    /* already gone / unreadable — nothing to release */
  }
}

/**
 * True iff the shared lock is held by a live process OTHER than us AND the
 * lock is within its TTL — the DEFER predicate. Stale/dead/absent/own/
 * past-ttl → false. When the OFF knob is set, always false (pre-F11
 * behavior — nothing defers).
 */
export function isGraphWriteLockActive({ fs = nodeFs, pidPath, selfPid = process.pid, killProbe, ttlMs = lockTtlMs() } = {}) {
  if (DISABLED) return false;
  const pPath = pidPath || graphWriteLockPath();
  const ageMs = readLockAgeMs(fs, pPath);
  return decideActive(readLockRaw(fs, pPath), selfPid, killProbe, ageMs, ttlMs);
}

/**
 * Install best-effort auto-release on process exit. REQUIRED for
 * `regen-viz.mjs`: it calls `process.exit()` from several mid-chain
 * fail-loud branches (merge-guard abort, drift-gate) where a plain
 * try/finally would never run. `process.once('exit', …)` fires on the
 * graceful paths (`process.exit()`, normal return); SIGINT/SIGTERM
 * handlers cover Ctrl-C / task-kill (they re-exit so the 'exit' handler
 * still runs).
 *
 * NOT covered (R12 honesty — this is best-effort, not total): SIGKILL,
 * V8 OOM-abort (this host runs 80-96% commit pressure and OOM-kills are
 * the EXPECTED crash mode, not an edge case), power loss. On those paths
 * the .pid file is orphaned holding a now-dead pid. The NEXT
 * `acquireGraphWriteLock`/`isGraphWriteLockActive` self-heals it two ways:
 * (1) the `process.kill(pid,0)` probe gets ESRCH for a cleanly-dead pid
 * and reclaims it; (2) the U-GO-B2 TTL backstop reclaims ANY lock older
 * than `lockTtlMs()` even when a recycled-PID phantom makes the probe lie
 * "live". The lock therefore self-heals across a hard kill within at most
 * one TTL window; it can no longer permanently wedge.
 *
 * Returns an unsubscribe fn (used by tests to avoid handler accumulation).
 * NOTE: signal handlers use `process.once` — a second Ctrl-C arriving
 * before `release()`+exit completes (e.g. event loop wedged behind a
 * stuck regen child) has no handler and hard-terminates with the lock
 * present; that path self-heals on next run via the dead-pid / TTL
 * reclaim above. `once` (not `on`) is deliberate: it prevents re-entrant
 * release/exit recursion if the same signal is delivered twice.
 */
export function installGraphWriteLockReleaseOnExit({ fs = nodeFs, pidPath, selfPid = process.pid } = {}) {
  const pPath = pidPath || graphWriteLockPath();
  const release = () => releaseGraphWriteLock({ fs, pidPath: pPath, selfPid });
  const onSignal = (sig) => {
    release();
    // Re-raise default behavior: exit with conventional 128+signal code.
    process.exit(sig === "SIGINT" ? 130 : 143);
  };
  const sigint = () => onSignal("SIGINT");
  const sigterm = () => onSignal("SIGTERM");
  process.once("exit", release);
  process.once("SIGINT", sigint);
  process.once("SIGTERM", sigterm);
  return () => {
    process.removeListener("exit", release);
    process.removeListener("SIGINT", sigint);
    process.removeListener("SIGTERM", sigterm);
  };
}

/**
 * Scoped helper: acquire → run `fn()` → release (even if fn throws). For
 * in-process callers that do NOT hard `process.exit()` mid-scope. Returns
 * `{ ran:false, heldBy }` without invoking fn if the lock is held live.
 */
export function withGraphWriteLock(fn, opts = {}) {
  const lk = acquireGraphWriteLock(opts);
  if (!lk.acquired) return { ran: false, heldBy: lk.heldBy };
  try {
    const value = fn();
    return { ran: true, value };
  } finally {
    releaseGraphWriteLock(opts);
  }
}
