/**
 * wikiLock — File-based advisory lock for `H:/prism/knowledge/wiki/` writers.
 *
 * Implements WIKI_SCHEMA.md §6.1 (claim_file lock) + §6.6 (stale-lock reaper):
 *
 *   - Lock file is `<target>.lock`, contents `{ pid, ts, agent, target }`.
 *   - Acquisition uses O_EXCL (open with `wx`), so a race-loser sees EEXIST
 *     and falls into the inspection branch.
 *   - A lock older than STALE_LOCK_MS whose holder PID is dead is force-reaped.
 *   - A lock older than STALE_LOCK_MS whose holder PID is alive is NOT reaped:
 *     the holder is a slow-but-live agent and silent reaping would clobber it.
 *
 * Used by WikiIndexMaintainerEngine and WikiLogAppenderEngine. Mirrors the
 * pattern in `mcp-server/scripts/wiki-bootstrap.mjs` so a Node.js script
 * and an engine class can safely interleave on the same lock files.
 *
 * @module utils/wikiLock
 */

import { promises as fs } from "node:fs";
import { dirname } from "node:path";
import { randomBytes } from "node:crypto";

const LOCK_TTL_MS = 60_000;
const STALE_LOCK_MS = 90_000;
const RETRY_INTERVAL_MS = 200;
const RETRY_MAX_ATTEMPTS = 30;

export interface LockPayload {
  pid: number;
  ts: number;
  agent: string;
  target: string;
}

export interface LockHandle {
  lockPath: string;
  release(): Promise<void>;
}

function isPidAlive(pid: number): boolean {
  if (!pid || pid === process.pid) return true;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function readLockOrNull(lockPath: string): Promise<LockPayload | null> {
  try {
    const raw = await fs.readFile(lockPath, "utf-8");
    const j = JSON.parse(raw);
    if (typeof j.pid === "number" && typeof j.ts === "number") {
      return j as LockPayload;
    }
  } catch {
    /* missing or malformed */
  }
  return null;
}

async function tryAcquireOnce(
  lockPath: string,
  payload: LockPayload
): Promise<boolean> {
  try {
    const fh = await fs.open(lockPath, "wx");
    try {
      await fh.writeFile(JSON.stringify(payload));
    } finally {
      await fh.close();
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Acquire a file-based advisory lock on `target`. Blocks (with retries) up to
 * RETRY_MAX_ATTEMPTS × RETRY_INTERVAL_MS (~6s by default). Throws if the lock
 * cannot be acquired in that window.
 *
 * @param target absolute path of the file the lock guards (the lock file is
 *               `${target}.lock` next to it)
 * @param agent  caller identity for diagnostics (`claude-XXXXXXXX`,
 *               `WikiIndexMaintainerEngine`, etc.)
 */
export async function acquireWikiLock(
  target: string,
  agent: string
): Promise<LockHandle> {
  const lockPath = `${target}.lock`;
  await fs.mkdir(dirname(lockPath), { recursive: true });

  for (let attempt = 0; attempt < RETRY_MAX_ATTEMPTS; attempt++) {
    const payload: LockPayload = {
      pid: process.pid,
      ts: Date.now(),
      agent,
      target,
    };
    if (await tryAcquireOnce(lockPath, payload)) {
      return {
        lockPath,
        async release() {
          try {
            await fs.unlink(lockPath);
          } catch {
            /* already gone */
          }
        },
      };
    }

    // Lock taken — inspect for stale-PID reap.
    const existing = await readLockOrNull(lockPath);
    if (existing) {
      const age = Date.now() - existing.ts;
      const dead = !isPidAlive(existing.pid);
      if (age > STALE_LOCK_MS && dead) {
        try {
          await fs.unlink(lockPath);
        } catch {
          /* race with another reaper */
        }
        continue; // retry immediately
      }
      // age > STALE_LOCK_MS && !dead is intentionally NOT reaped — the holder
      // is alive but slow. Wait it out instead of corrupting their write.
    }
    await new Promise((r) => setTimeout(r, RETRY_INTERVAL_MS));
  }
  throw new Error(
    `acquireWikiLock: could not lock ${target} after ${RETRY_MAX_ATTEMPTS} attempts`
  );
}

/**
 * Run `fn` while holding a wiki lock on `target`. Lock is released even if
 * `fn` throws. Equivalent to a `using` block in a future TS release.
 */
export async function withWikiLock<T>(
  target: string,
  agent: string,
  fn: () => Promise<T>
): Promise<T> {
  const handle = await acquireWikiLock(target, agent);
  try {
    return await fn();
  } finally {
    await handle.release();
  }
}

export const _internals_for_test = {
  LOCK_TTL_MS,
  STALE_LOCK_MS,
  RETRY_INTERVAL_MS,
  RETRY_MAX_ATTEMPTS,
  isPidAlive,
  randomBytes, // re-export so tests can seed-deterministic-ish setups
};
