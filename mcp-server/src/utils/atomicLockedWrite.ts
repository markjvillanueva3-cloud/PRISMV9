/**
 * PRISM MCP Server - Atomic + Cross-Process-Locked Write
 *
 * Combines proper-lockfile (OS-level exclusive advisory lock across Node
 * processes) with atomic .tmp → rename (crash-safe). Use for any state
 * file touched by multiple terminals / agents simultaneously — the
 * cross-session asset registry, extraction log, SVI ledger, etc.
 *
 * atomicWrite.ts alone serializes intra-process writes via a promise chain
 * but DOES NOT prevent parallel writes from other Node processes (6+
 * Claude terminals on the same worktree is the norm here). This utility
 * closes that gap.
 *
 * Locking convention:
 *   - Lock file is `${filePath}.lock` (directory of target must exist)
 *   - `retries.retries = 10` with exponential backoff (10-1600ms) → ~5s ceiling
 *   - `stale = 30_000` → 30s stale-lock threshold (a crashed holder releases)
 *   - Lock is released in finally{} regardless of write success
 *
 * @module utils/atomicLockedWrite
 * @safety CRITICAL — Used for all multi-process state file writes. Corruption = data loss.
 * @phase Universal 0.4 — Lock all registry writes
 */

import { writeFile, rename, unlink, mkdir, stat } from "fs/promises";
import * as path from "path";
import lockfile from "proper-lockfile";

export interface AtomicLockedWriteOptions {
  /** Lock stale threshold in ms (default 30_000). A crashed holder is released after this. */
  stale?: number;
  /** Retry count on lock acquisition (default 10). With backoff 10-1600ms ~= 5s ceiling. */
  retries?: number;
  /** onCompromised handler — called if proper-lockfile detects lock tampering. Default: log + throw. */
  onCompromised?: (err: Error) => void;
}

const DEFAULT_OPTS: Required<Omit<AtomicLockedWriteOptions, "onCompromised">> = {
  stale: 30_000,
  retries: 10,
};

/**
 * Atomically write data to a file with cross-process exclusive lock.
 *
 * Sequence:
 *   1. Ensure parent dir exists
 *   2. Acquire proper-lockfile lock on the target path (creates .lock sibling)
 *   3. Write to `${path}.${Date.now()}.tmp`
 *   4. Rename tmp → target (POSIX atomic on same filesystem)
 *   5. Release lock
 *
 * @throws {Error} if lock cannot be acquired within retry budget, or on write/rename failure
 */
export async function atomicLockedWrite(
  filePath: string,
  data: string,
  opts: AtomicLockedWriteOptions = {}
): Promise<void> {
  const resolved = path.resolve(filePath);
  const tmpPath = `${resolved}.${process.pid}.${Date.now()}.tmp`;
  const options = { ...DEFAULT_OPTS, ...opts };

  // proper-lockfile requires the target file to exist before acquiring the
  // lock OR the containing directory to exist. We ensure the latter; the
  // lock uses the directory itself when the file doesn't yet exist.
  const parentDir = path.dirname(resolved);
  try {
    await mkdir(parentDir, { recursive: true });
  } catch {
    // ignore EEXIST — other errors will surface on the write
  }

  // proper-lockfile wants an existing target to lock. If the file doesn't
  // exist, create an empty placeholder to satisfy the lock API (this is
  // atomic enough — the real contents land via rename below).
  let fileExisted = true;
  try {
    await stat(resolved);
  } catch {
    fileExisted = false;
    try {
      await writeFile(resolved, "", "utf-8");
    } catch (err) {
      // If placeholder creation races with another process, fall through —
      // one of us will win the lock and the other will retry.
      void err;
    }
  }

  let release: (() => Promise<void>) | null = null;
  try {
    release = await lockfile.lock(resolved, {
      stale: options.stale,
      retries: {
        retries: options.retries,
        factor: 2,
        minTimeout: 10,
        maxTimeout: 1600,
      },
      onCompromised: opts.onCompromised ?? ((err: Error) => {
        throw new Error(`[atomicLockedWrite] lock compromised on ${resolved}: ${err.message}`);
      }),
    });

    // Atomic write: tmp then rename
    await writeFile(tmpPath, data, "utf-8");
    await rename(tmpPath, resolved);
  } catch (err) {
    // Cleanup orphan tmp file best-effort
    try { await unlink(tmpPath); } catch { /* ignore */ }
    // If we created a placeholder but the real write failed, remove it so
    // the caller's retry sees "file does not exist" rather than empty JSON
    if (!fileExisted) {
      try { await unlink(resolved); } catch { /* ignore */ }
    }
    throw err;
  } finally {
    if (release) {
      try { await release(); } catch { /* ignore release errors */ }
    }
  }
}

/**
 * Synchronous-style read-modify-write helper. Acquires the lock, runs your
 * mutator with the current JSON-parsed contents (or {}), persists the result
 * atomically. Use this for registry-style "load, append, save" patterns to
 * avoid every caller re-implementing the read-then-write guard.
 *
 * @example
 *   await atomicLockedRmw<Registry>(path, (current) => {
 *     current.entries.push(newEntry);
 *     return current;
 *   }, { fallback: { entries: [] } });
 */
export async function atomicLockedRmw<T>(
  filePath: string,
  mutator: (current: T) => T | Promise<T>,
  opts: AtomicLockedWriteOptions & { fallback: T }
): Promise<T> {
  const resolved = path.resolve(filePath);
  const tmpPath = `${resolved}.${process.pid}.${Date.now()}.tmp`;
  const options = { ...DEFAULT_OPTS, ...opts };

  const parentDir = path.dirname(resolved);
  try { await mkdir(parentDir, { recursive: true }); } catch { /* ignore */ }

  // Ensure file exists for lock
  let fileExisted = true;
  try {
    await stat(resolved);
  } catch {
    fileExisted = false;
    try { await writeFile(resolved, JSON.stringify(opts.fallback, null, 2), "utf-8"); } catch { /* ignore */ }
  }

  let release: (() => Promise<void>) | null = null;
  try {
    release = await lockfile.lock(resolved, {
      stale: options.stale,
      retries: {
        retries: options.retries,
        factor: 2,
        minTimeout: 10,
        maxTimeout: 1600,
      },
    });

    // Read current (may have been updated since our stat above by another process)
    let current: T;
    try {
      const { readFile } = await import("fs/promises");
      const raw = await readFile(resolved, "utf-8");
      current = raw ? JSON.parse(raw) as T : opts.fallback;
    } catch {
      current = opts.fallback;
    }

    const next = await mutator(current);

    await writeFile(tmpPath, JSON.stringify(next, null, 2), "utf-8");
    await rename(tmpPath, resolved);

    return next;
  } catch (err) {
    try { await unlink(tmpPath); } catch { /* ignore */ }
    if (!fileExisted) {
      try { await unlink(resolved); } catch { /* ignore */ }
    }
    throw err;
  } finally {
    if (release) {
      try { await release(); } catch { /* ignore release errors */ }
    }
  }
}
