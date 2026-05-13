#!/usr/bin/env node
// tier: T3
/**
 * Git Anti-Clobber Hook — PreToolUse (Worktree-Aware v2)
 *
 * Serializes git mutations across 6+ concurrent Claude terminals + 1 Codex chat
 * to prevent index corruption, commit race, and branch clobbering.
 *
 * v2 CHANGES — Worktree Isolation:
 *   - Local ops (add/commit/merge/rebase/checkout) use PER-WORKTREE locks
 *   - Remote ops (fetch/push/pull) use SHARED lock (they touch shared .git/objects)
 *   - Worktree detected from: cd path, git -C path, or cwd
 *   - Lock files: GIT_LOCK_<worktree-hash>.json for local, GIT_LOCK_REMOTE.json for remote
 *
 * Mechanism:
 *   - Detect git MUTATING commands (add/commit/push/pull/merge/rebase/etc.)
 *   - Check appropriate lock file for existing holder
 *   - Same instance (reentrant): allow
 *   - Stale lock (> TTL): steal with warning
 *   - Held by another: DENY with actionable message
 *   - Free: acquire via atomic tmp+rename, allow
 *
 * Release:
 *   - Companion PostToolUse hook git-anti-clobber-release.mjs releases the lock.
 *   - TTL fallback (180s) prevents permanent deadlock if release is skipped.
 */

import { readFileSync, writeFileSync, renameSync, existsSync, mkdirSync, readdirSync, statSync, unlinkSync } from "node:fs";
import { hostname } from "node:os";
import { exit } from "node:process";
import { createHash } from "node:crypto";

const LOCK_DIR = "H:/prism/state/shared";
const LOCK_TTL_SECONDS = 180; // 3 min — covers slow network pushes
const ORPHAN_GC_SECONDS = 3 * LOCK_TTL_SECONDS; // 9 min — definitely dead

// ── Read PreToolUse payload ───────────────────────────────────────────

let payload;
try {
  payload = JSON.parse(readFileSync(0, "utf-8"));
} catch {
  exit(0); // no stdin or invalid JSON — allow
}

const tool = payload?.tool_name || payload?.tool || "";
if (tool !== "Bash") exit(0);

const cmd = payload?.tool_input?.command || payload?.input?.command || "";
if (typeof cmd !== "string" || !cmd.trim()) exit(0);

// ── Classify command ──────────────────────────────────────────────────

/**
 * Git subcommands that mutate LOCAL worktree only (can run in parallel across worktrees)
 */
const LOCAL_MUTATING = new Set([
  "add", "rm", "mv",
  "commit", "commit-tree",
  "reset", "restore", "checkout", "switch",
  "merge", "rebase", "cherry-pick", "revert",
  "stash", "clean",
  "tag", "branch", // creating/deleting local refs
  "notes", "am", "apply",
]);

/**
 * Git subcommands that touch REMOTE/shared state (need global lock)
 */
const REMOTE_MUTATING = new Set([
  "fetch", "push", "pull",
]);

/**
 * Read-only subcommands that don't need the lock.
 */
const READ_ONLY = new Set([
  "status", "log", "diff", "show", "blame", "grep",
  "ls-files", "ls-tree", "cat-file",
  "rev-parse", "rev-list", "describe", "shortlog",
  "config", "remote", "help", "version",
  "reflog", "bisect", "worktree",
]);

/**
 * Parse the first git subcommand out of a shell string.
 */
function parseGitSubcommand(command) {
  const re = /(?:^|[\s;&|`(])git(?:\.exe)?\b([^\n;&|`)]*)/gi;
  let m;
  while ((m = re.exec(command)) !== null) {
    const argstr = m[1].trim();
    const tokens = argstr.split(/\s+/).filter(Boolean);
    let i = 0;
    while (i < tokens.length && tokens[i].startsWith("-")) {
      const flagsWithValue = /^(-C|-c|--git-dir|--work-tree|--namespace|--super-prefix|--exec-path|--config-env)$/;
      if (flagsWithValue.test(tokens[i]) && !tokens[i].includes("=")) {
        i += 2;
      } else {
        i += 1;
      }
    }
    if (i < tokens.length) {
      const sub = tokens[i].toLowerCase();
      if (sub) return sub;
    }
  }
  return null;
}

/**
 * Extract worktree path from command.
 * Looks for: cd <path> && git ..., git -C <path> ..., or defaults to H:/PRISM
 */
function extractWorktreePath(command) {
  // Check for "cd <path> &&" or "cd <path>;"
  const cdMatch = command.match(/cd\s+["']?([^\s"';&|]+)["']?\s*(?:&&|;)/i);
  if (cdMatch) {
    return normalizePath(cdMatch[1]);
  }

  // Check for "git -C <path>"
  const gitCMatch = command.match(/git(?:\.exe)?\s+-C\s+["']?([^\s"']+)["']?/i);
  if (gitCMatch) {
    return normalizePath(gitCMatch[1]);
  }

  // Default to main repo
  return "H:/PRISM";
}

/**
 * Normalize path for consistent hashing
 */
function normalizePath(p) {
  return p.replace(/\\/g, "/").replace(/\/+$/, "").toLowerCase();
}

/**
 * Get lock file path based on operation type and worktree
 */
function getLockFile(subcommand, worktreePath) {
  if (REMOTE_MUTATING.has(subcommand)) {
    // Remote ops use shared lock
    return `${LOCK_DIR}/GIT_LOCK_REMOTE.json`;
  }

  // Local ops use per-worktree lock
  const hash = createHash("md5").update(worktreePath).digest("hex").slice(0, 8);
  const name = worktreePath.split("/").pop() || "main";
  return `${LOCK_DIR}/GIT_LOCK_${name}_${hash}.json`;
}

const subcommand = parseGitSubcommand(cmd);
if (!subcommand) exit(0); // not a git command or couldn't parse

// Read-only → allow without touching the lock
if (READ_ONLY.has(subcommand)) exit(0);

// Not in any mutating list → allow (unknown/forward-compat)
if (!LOCAL_MUTATING.has(subcommand) && !REMOTE_MUTATING.has(subcommand)) exit(0);

// ── Determine lock file ───────────────────────────────────────────────

const worktreePath = extractWorktreePath(cmd);
const LOCK_FILE = getLockFile(subcommand, worktreePath);
const isRemoteOp = REMOTE_MUTATING.has(subcommand);
const lockType = isRemoteOp ? "remote" : `worktree:${worktreePath.split("/").pop()}`;

// ── Instance identity ─────────────────────────────────────────────────
// Priority order:
//   1. payload.session_id — Claude Code passes the SAME session_id to PreToolUse
//      and PostToolUse of the same tool call, AND across all tool calls in the
//      same session. Two concurrent Claude terminals get different session_ids.
//      This is the correct identity primitive — use it when available.
//   2. CLAUDE_SESSION_ID env (for legacy/test callers)
//   3. session-<ppid>-<hostname> — UNSTABLE fallback (ppid changes per Bash
//      invocation since Claude spawns a fresh shell). Only kicks in if neither
//      payload nor env provide a session id, which shouldn't happen in production.

function getInstanceId() {
  const pid =
    payload?.session_id ||
    payload?.sessionId;
  if (typeof pid === "string" && pid) return `claude-${pid}`;

  const sid =
    process.env.CLAUDE_SESSION_ID ||
    process.env.CLAUDE_CODE_SESSION_ID ||
    process.env.INSTANCE_ID ||
    process.env.CLAUDE_INSTANCE;
  if (sid) return `${sid}`;

  const ppid = process.env.CLAUDE_PPID || process.ppid || process.pid;
  return `session-${ppid}-${hostname()}`;
}

const me = getInstanceId();
const now = Math.floor(Date.now() / 1000);

// ── GC orphaned locks (fire-and-forget, per invocation) ──────────────
// Any lock file older than ORPHAN_GC_SECONDS (9 min = 3× TTL) is definitively
// dead — the holder's session is long gone and their PostToolUse release
// either never fired or failed. Sweep them before checking our own lock so
// we don't get stuck behind a zombie.
try {
  const entries = readdirSync(LOCK_DIR);
  for (const name of entries) {
    if (!name.startsWith("GIT_LOCK_") || !name.endsWith(".json")) continue;
    const full = `${LOCK_DIR}/${name}`;
    try {
      const st = statSync(full);
      const ageMs = Date.now() - st.mtimeMs;
      if (ageMs > ORPHAN_GC_SECONDS * 1000) {
        unlinkSync(full);
      }
    } catch { /* ignore */ }
  }
} catch { /* LOCK_DIR missing — no-op */ }

// ── Read existing lock (defensive) ────────────────────────────────────

function readLock() {
  if (!existsSync(LOCK_FILE)) return null;
  try {
    const raw = readFileSync(LOCK_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return null; // Corrupted lock — treat as absent (stale)
  }
}

const existing = readLock();

if (existing && typeof existing === "object") {
  const age = now - (Number(existing.timestamp) || 0);

  if (existing.holder === me) {
    // Reentrant — refresh timestamp and allow
    writeLock({ refresh: true, prior: existing });
    exit(0);
  }

  if (age > LOCK_TTL_SECONDS) {
    // Stale — steal with warning
    process.stderr.write(
      `[git-anti-clobber] Stealing stale ${lockType} lock held by "${existing.holder}" ` +
      `(age=${age}s > TTL=${LOCK_TTL_SECONDS}s).\n`,
    );
    writeLock({ prior: existing });
    exit(0);
  }

  // Held by another live session — DENY
  const ageStr = `${age}s ago`;
  const retryIn = LOCK_TTL_SECONDS - age;
  const reason =
    `Git ${lockType} lock held by another terminal ("${existing.holder}"), acquired ${ageStr}.\n` +
    `Command held: ${String(existing.command || "?").slice(0, 120)}\n` +
    `Your command: ${cmd.slice(0, 120)}\n\n` +
    `Lock file: ${LOCK_FILE}\n` +
    `Lock type: ${isRemoteOp ? "REMOTE (shared)" : "LOCAL (per-worktree)"}\n\n` +
    `Options:\n` +
    `  1. Wait up to ${retryIn}s and retry.\n` +
    `  2. ${isRemoteOp ? "Remote ops must serialize." : "Use a different worktree to work in parallel."}\n` +
    `  3. If the other session is dead, delete the lock file.\n` +
    `\nThis hook prevents concurrent \`git ${subcommand}\` from corrupting refs.`;

  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: reason,
    },
  }));
  exit(0);
}

// ── Acquire lock atomically ───────────────────────────────────────────

function writeLock({ refresh = false, prior = null } = {}) {
  try {
    mkdirSync(LOCK_DIR, { recursive: true });
  } catch { /* already exists */ }

  const body = {
    holder: me,
    timestamp: now,
    acquired_at: new Date().toISOString(),
    command: cmd.slice(0, 500),
    subcommand,
    worktree: worktreePath,
    lock_type: isRemoteOp ? "remote" : "local",
    pid: process.pid,
    schemaVersion: 2,
    ...(refresh && prior
      ? { first_acquired_at: prior.acquired_at || prior.first_acquired_at }
      : {}),
  };

  const tmp = `${LOCK_FILE}.${process.pid}.${Date.now()}.tmp`;
  writeFileSync(tmp, JSON.stringify(body, null, 2), "utf-8");
  renameSync(tmp, LOCK_FILE); // atomic on Windows+POSIX
}

writeLock();
exit(0);
