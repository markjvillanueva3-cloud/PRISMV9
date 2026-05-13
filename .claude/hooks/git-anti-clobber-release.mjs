#!/usr/bin/env node
// tier: T3
/**
 * Git Anti-Clobber Release — PostToolUse (Worktree-Aware v2)
 *
 * Companion to git-anti-clobber.mjs. Releases the lock after a git mutation
 * completes (success or failure — Claude Code fires PostToolUse either way).
 *
 * v2 CHANGES — Worktree Isolation:
 *   - Must determine the correct lock file using same logic as PreToolUse
 *   - Local ops release PER-WORKTREE locks, remote ops release SHARED lock
 *
 * Safe behaviors:
 *   - Only releases when the lock holder matches this instance (never steal)
 *   - Never throws — silent no-op if lock is already gone or held by another
 *   - If the lock is stale but ours, release it (cleanup)
 *
 * Input: Claude Code PostToolUse JSON on stdin.
 * Output: none (exit 0).
 */

import { readFileSync, unlinkSync, existsSync } from "node:fs";
import { hostname } from "node:os";
import { exit } from "node:process";
import { createHash } from "node:crypto";

const LOCK_DIR = "H:/prism/state/shared";

let payload;
try {
  payload = JSON.parse(readFileSync(0, "utf-8"));
} catch {
  exit(0);
}

const tool = payload?.tool_name || payload?.tool || "";
if (tool !== "Bash") exit(0);

const cmd = payload?.tool_input?.command || payload?.input?.command || "";
if (typeof cmd !== "string" || !cmd.includes("git")) exit(0);

// ── Subcommand classification (must match PreToolUse exactly) ─────────────

const LOCAL_MUTATING = new Set([
  "add", "rm", "mv",
  "commit", "commit-tree",
  "reset", "restore", "checkout", "switch",
  "merge", "rebase", "cherry-pick", "revert",
  "stash", "clean",
  "tag", "branch",
  "notes", "am", "apply",
]);

const REMOTE_MUTATING = new Set([
  "fetch", "push", "pull",
]);

function parseGitSubcommand(command) {
  const re = /(?:^|[\s;&|`(])git(?:\.exe)?\b([^\n;&|`)]*)/gi;
  let m;
  while ((m = re.exec(command)) !== null) {
    const tokens = m[1].trim().split(/\s+/).filter(Boolean);
    let i = 0;
    while (i < tokens.length && tokens[i].startsWith("-")) {
      const flagsWithValue = /^(-C|-c|--git-dir|--work-tree|--namespace|--super-prefix|--exec-path|--config-env)$/;
      if (flagsWithValue.test(tokens[i]) && !tokens[i].includes("=")) i += 2;
      else i += 1;
    }
    if (i < tokens.length) return tokens[i].toLowerCase();
  }
  return null;
}

const sub = parseGitSubcommand(cmd);
if (!sub) exit(0);

// Only release if it was a mutating command
if (!LOCAL_MUTATING.has(sub) && !REMOTE_MUTATING.has(sub)) exit(0);

// ── Worktree extraction (must match PreToolUse exactly) ───────────────────

function extractWorktreePath(command) {
  const cdMatch = command.match(/cd\s+["']?([^\s"';&|]+)["']?\s*(?:&&|;)/i);
  if (cdMatch) return normalizePath(cdMatch[1]);

  const gitCMatch = command.match(/git(?:\.exe)?\s+-C\s+["']?([^\s"']+)["']?/i);
  if (gitCMatch) return normalizePath(gitCMatch[1]);

  return "H:/PRISM";
}

function normalizePath(p) {
  return p.replace(/\\/g, "/").replace(/\/+$/, "").toLowerCase();
}

function getLockFile(subcommand, worktreePath) {
  if (REMOTE_MUTATING.has(subcommand)) {
    return `${LOCK_DIR}/GIT_LOCK_REMOTE.json`;
  }
  const hash = createHash("md5").update(worktreePath).digest("hex").slice(0, 8);
  const name = worktreePath.split("/").pop() || "main";
  return `${LOCK_DIR}/GIT_LOCK_${name}_${hash}.json`;
}

const worktreePath = extractWorktreePath(cmd);
const LOCK_FILE = getLockFile(sub, worktreePath);

// ── Instance identity (must match PreToolUse exactly) ─────────────────────
// Must derive identity identically to PreToolUse, otherwise the release won't
// match the acquired holder and the lock will leak until TTL expiry.

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

if (!existsSync(LOCK_FILE)) exit(0);

let lock;
try {
  lock = JSON.parse(readFileSync(LOCK_FILE, "utf-8"));
} catch {
  exit(0); // corrupted — leave it for TTL cleanup
}

const me = getInstanceId();
if (lock?.holder === me) {
  try {
    unlinkSync(LOCK_FILE);
  } catch { /* race with another cleanup — fine */ }
}
exit(0);
