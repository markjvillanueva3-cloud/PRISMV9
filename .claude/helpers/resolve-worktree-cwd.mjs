#!/usr/bin/env node
/**
 * resolve-worktree-cwd.mjs — Worktree-aware CWD resolution for handoff hooks
 *
 * Problem: precompact-handoff.mjs and enforce-handoff-topic.mjs hardcoded
 * `cwd: H:/prism` for git operations. With 6+ concurrent chats each working
 * in their own worktree (H:/prism-engine-wire-ms0, H:/prism-tsc-cleanup, etc),
 * every chat's RESUME directive ended up showing H:/prism's most-recent commit
 * instead of the chat's actual worktree commit. This is the root cause of the
 * recurring handoff-clobber issue.
 *
 * This helper resolves the correct worktree CWD by:
 *   1. Reading the PID-pin registry (.active-sessions-by-pid.json) and finding
 *      the most-recently-active entry whose session_id matches our session
 *   2. Falling back to process.cwd() if that path looks like a worktree
 *      (under H:/, contains .git or .git file pointing to common dir)
 *   3. Last resort: H:/prism (the original buggy default)
 *
 * Exports:
 *   resolveWorktreeCwd(sessionId?: string) → string  // absolute path
 *   resolveWorktreeCwdFromStdin() → string           // reads session_id from
 *                                                       Claude hook stdin payload
 */

import fs from "node:fs";
import path from "node:path";

const PIN_FILE = path.resolve("H:/prism/state/shared/handoffs/.active-sessions-by-pid.json");
const PRISM_ROOT = path.resolve("H:/prism");
const PIN_FRESH_MS = 30 * 60 * 1000; // 30 minutes — handoffs fire on Stop/PreCompact, recent activity guaranteed

function readPinRegistry() {
  try {
    if (!fs.existsSync(PIN_FILE)) return null;
    const raw = fs.readFileSync(PIN_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function looksLikeWorktree(p) {
  if (!p || typeof p !== "string") return false;
  try {
    const stat = fs.statSync(p);
    if (!stat.isDirectory()) return false;
    // A worktree has either a .git directory OR a .git file (linked worktree)
    const dotGit = path.join(p, ".git");
    return fs.existsSync(dotGit);
  } catch {
    return false;
  }
}

/**
 * Look up the worktree CWD for this session in the PID pin registry.
 * Picks the most-recently-seen entry whose session_id matches AND whose
 * cwd still exists on disk.
 */
function lookupCwdFromPinRegistry(sessionId) {
  if (!sessionId || typeof sessionId !== "string") return null;
  const reg = readPinRegistry();
  if (!reg?.pids) return null;

  // Normalize: accept "fb6f37e6-..." (full UUID) or "fb6f37e6" (8-char prefix)
  const target = sessionId.toLowerCase();
  const targetPrefix = target.slice(0, 8);

  const now = Date.now();
  let best = null;

  for (const entry of Object.values(reg.pids)) {
    const sid = (entry?.session_id || "").toLowerCase();
    if (!sid) continue;
    // Match either full UUID or 8-char prefix
    if (sid !== target && !sid.startsWith(targetPrefix)) continue;
    const cwd = entry?.cwd;
    if (!cwd) continue;
    const lastSeen = new Date(entry.last_seen || entry.created_at || 0).getTime();
    if (now - lastSeen > PIN_FRESH_MS) continue;
    if (!looksLikeWorktree(cwd)) continue;
    if (!best || lastSeen > best.lastSeen) {
      best = { cwd: path.resolve(cwd), lastSeen };
    }
  }

  return best?.cwd ?? null;
}

/**
 * Resolve the worktree CWD for the given session, with fallback chain.
 */
export function resolveWorktreeCwd(sessionId) {
  // (1) PID pin registry — most reliable
  const pinned = lookupCwdFromPinRegistry(sessionId);
  if (pinned) return pinned;

  // (2) process.cwd() if it looks like a worktree
  const cwd = process.cwd();
  if (looksLikeWorktree(cwd)) return path.resolve(cwd);

  // (3) Last resort
  return PRISM_ROOT;
}

/**
 * Read Claude Code's session_id from stdin (hook payload), then resolve.
 * Used by hooks that receive {"session_id": "..."} JSON via stdin.
 *
 * NOTE: This consumes stdin. If the caller also needs to read stdin for
 * other purposes, read it first and pass session_id as an argument to
 * resolveWorktreeCwd() directly.
 */
export function resolveWorktreeCwdFromStdin() {
  let sessionId = null;
  try {
    if (!process.stdin.isTTY) {
      const raw = fs.readFileSync(0, "utf-8");
      if (raw && raw.trim().startsWith("{")) {
        const j = JSON.parse(raw);
        sessionId = j?.session_id || j?.sessionId || null;
      }
    }
  } catch { /* ignore */ }
  return resolveWorktreeCwd(sessionId);
}

// CLI for debugging:  node resolve-worktree-cwd.mjs [session_id]
if (import.meta.url === `file://${process.argv[1].replace(/\\/g, "/")}` ||
    process.argv[1]?.endsWith("resolve-worktree-cwd.mjs")) {
  const sid = process.argv[2] || null;
  const result = resolveWorktreeCwd(sid);
  console.log(JSON.stringify({ session_id: sid, resolved_cwd: result, prism_root: PRISM_ROOT }));
}
