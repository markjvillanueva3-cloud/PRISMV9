/**
 * atomicSessionWrite — atomic JSON state writer for per-session engines.
 *
 * Problem: every per-session engine (SessionReorientation, ToolCallParallelization,
 * FileReadDeduplication, ConversationStaleDetector) writes to a shared JSON
 * file via writeFileSync. With concurrent writers (mcp-server engine + .mjs
 * hook + 8 sibling chats), the truncate-then-write race corrupts files.
 *
 * Strategy: write to <file>.tmp + rename. On Windows NTFS, rename within
 * the same volume is atomic. On a corrupt-read, fall back to last-good
 * snapshot if available.
 *
 * Also normalizes session-id resolution. Previously each engine fell back
 * to "default" when CLAUDE_SESSION_ID was unset, which collapsed all 8
 * chats onto the same file. Now we try (in order):
 *   1. CLAUDE_SESSION_ID
 *   2. TERM_SESSION_ID
 *   3. CLAUDE_TERMINAL_ID
 *   4. SSH_TTY (per-terminal stable on Linux)
 *   5. WT_SESSION (Windows Terminal)
 *   6. process.ppid (parent process — survives within one terminal session)
 *   7. "default"
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync, renameSync, unlinkSync } from "node:fs";
import { dirname } from "node:path";

/**
 * Resolve a stable session ID from the environment. Falls back through
 * several env vars before defaulting — previously hooks and engines
 * collapsed to "default" too eagerly, which broke per-session isolation
 * across 8 concurrent chats.
 *
 * Includes machine hostname prefix so the SAME H: drive plugged into
 * two different computers doesn't collide on shared state files.
 * Multi-computer scenario: H: drive shared across machines means session
 * state must be namespaced by machine, not just terminal/process.
 */
export function resolveSessionId(): string {
  const candidates = [
    process.env.CLAUDE_SESSION_ID,
    process.env.TERM_SESSION_ID,
    process.env.CLAUDE_TERMINAL_ID,
    process.env.SSH_TTY,
    process.env.WT_SESSION,
    process.ppid ? `ppid_${process.ppid}` : null,
  ];
  for (const c of candidates) {
    if (c && String(c).trim().length > 0) {
      // Explicit env var IDs are already unique per-process — no hostname needed
      return String(c).replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 64);
    }
  }
  // Fallback case: include hostname so 8 chats on two different computers
  // sharing the H: drive don't all collapse onto "default"
  let machinePart = "";
  try {
    const os = require("node:os") as typeof import("node:os");
    const host = String(os.hostname() || "").replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 16);
    if (host) machinePart = `${host}_`;
  } catch {
    // ignore
  }
  return `${machinePart}default`;
}

/**
 * Atomic JSON write. Writes to <path>.tmp then renames over the target.
 * Best-effort: silently no-ops on filesystem errors (callers should not
 * crash a tool call because state couldn't be persisted).
 *
 * @param path  Absolute path to write to.
 * @param data  Any JSON-serializable value.
 */
export function atomicWriteJson(path: string, data: unknown): void {
  try {
    const dir = dirname(path);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    const tmp = `${path}.tmp.${process.pid}.${Date.now().toString(36)}`;
    writeFileSync(tmp, JSON.stringify(data, null, 2));
    renameSync(tmp, path);
  } catch {
    // Last-resort: try plain write (better than losing the update entirely)
    try {
      writeFileSync(path, JSON.stringify(data, null, 2));
    } catch {
      // give up
    }
  }
}

/**
 * Read JSON with corruption recovery. If the main file is corrupt or
 * partially written, falls back to the last-good snapshot if present.
 *
 * @param path  Absolute path to read.
 * @param fallback  Value returned when no readable copy exists.
 */
export function safeReadJson<T>(path: string, fallback: T): T {
  // Try main file
  try {
    if (existsSync(path)) {
      const raw = readFileSync(path, "utf-8");
      if (raw.length > 0) {
        return JSON.parse(raw) as T;
      }
    }
  } catch {
    // fall through to backup
  }
  // Try last-good snapshot
  const backup = `${path}.last-good`;
  try {
    if (existsSync(backup)) {
      return JSON.parse(readFileSync(backup, "utf-8")) as T;
    }
  } catch {
    // ignore
  }
  return fallback;
}

/**
 * Snapshot the current good state to <path>.last-good after a successful
 * load. Engines should call this in loadState() right after a successful
 * parse, so future corruption can fall back.
 */
export function snapshotLastGood(path: string, data: unknown): void {
  try {
    const backup = `${path}.last-good`;
    const tmp = `${backup}.tmp.${process.pid}`;
    writeFileSync(tmp, JSON.stringify(data, null, 2));
    renameSync(tmp, backup);
  } catch {
    // ignore
  }
}

/**
 * Clean up any orphan .tmp files older than maxAgeMs. Useful in
 * occasional cleanup tasks; not called from hot paths.
 */
export function cleanupOrphanTmps(dir: string, maxAgeMs: number = 60_000): void {
  try {
    if (!existsSync(dir)) return;
    const { readdirSync, statSync } = require("node:fs") as typeof import("node:fs");
    const now = Date.now();
    for (const f of readdirSync(dir)) {
      if (!/\.tmp(\.|$)/.test(f)) continue;
      const full = `${dir}/${f}`;
      try {
        const st = statSync(full);
        if (now - st.mtimeMs > maxAgeMs) {
          unlinkSync(full);
        }
      } catch {
        // ignore
      }
    }
  } catch {
    // ignore
  }
}
