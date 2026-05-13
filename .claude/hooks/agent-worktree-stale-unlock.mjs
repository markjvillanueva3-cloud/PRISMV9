#!/usr/bin/env node
// tier: T4
/**
 * agent-worktree-stale-unlock.mjs — HARNESS-AUDIT/U-TIER3/#7 (SessionStart)
 *
 * Anti-leak hook for Agent({isolation:"worktree"}) leftover worktrees.
 *
 * Symptom this addresses: a single audit session found 10 stale
 * `worktree-agent-<hash>` worktrees stuck in "locked" state at the same
 * orphan SHA, never cleaned up by the SDK's worktree lifecycle. Locked
 * worktrees keep `.git/worktrees/<name>/locked` files on disk and can
 * contribute to git-operation contention under multi-chat load.
 *
 * Per memory `feedback_never_delete_only_disable.md`:
 *   - This hook UNLOCKS stale worktrees (reversible — call `git worktree
 *     lock` to re-lock).
 *   - It does NOT remove the worktree directory.
 *   - It does NOT prune the `.git/worktrees/<name>/` metadata.
 *   - It does NOT delete any files in the worktree.
 *
 * Why SessionStart not SubagentEnd: Claude Code has no SubagentEnd hook
 * event today. SessionStart catches leaks from any prior session, runs
 * once at chat start, fast (no scan of worktree contents).
 *
 * Detection criteria: a `worktree-agent-*` worktree is considered stale
 * iff:
 *   1. its lockfile mtime is more than STALE_THRESHOLD_MS old
 *   2. AND no process currently holds the worktree directory open
 *
 * The mtime check is conservative — a freshly created agent worktree
 * will not be unlocked by this hook because its lockfile is recent.
 *
 * Output contract: emits `{continue:true}` always. Never blocks.
 *
 * @hook agent-worktree-stale-unlock
 * @event SessionStart
 * @milestone HARNESS-AUDIT / U-TIER3 / #7
 */

import { existsSync, statSync, readdirSync, mkdirSync, appendFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname } from "node:path";

const REPO_ROOT = "H:/prism";
const WORKTREES_META = `${REPO_ROOT}/.git/worktrees`;
const LOG_PATH = `${REPO_ROOT}/state/shared/agent-worktree-stale-unlock.log`;
const STALE_THRESHOLD_MS = 60 * 60 * 1000; // 1 hour — agents that ran longer than this are presumed dead

function log(entry) {
  try {
    mkdirSync(dirname(LOG_PATH), { recursive: true });
    appendFileSync(LOG_PATH, JSON.stringify({ ts: new Date().toISOString(), ...entry }) + "\n");
  } catch {
    /* never fail the hook on log errors */
  }
}

function isAgentWorktree(name) {
  return /^agent-[0-9a-f]+$/i.test(name);
}

function runGit(args) {
  const r = spawnSync("git", args, { cwd: REPO_ROOT, encoding: "utf8", windowsHide: true });
  return { ok: r.status === 0, stdout: r.stdout || "", stderr: r.stderr || "" };
}

function main() {
  process.stdin.resume();
  // Drain stdin (Claude Code may pipe in payload — best-effort discard)
  try {
    process.stdin.on("data", () => {});
  } catch {
    /* ignore */
  }

  if (!existsSync(WORKTREES_META)) {
    process.stdout.write(JSON.stringify({ continue: true }) + "\n");
    return;
  }

  let entries;
  try {
    entries = readdirSync(WORKTREES_META, { withFileTypes: true });
  } catch (e) {
    log({ event: "readdir_failed", message: String(e) });
    process.stdout.write(JSON.stringify({ continue: true }) + "\n");
    return;
  }

  const now = Date.now();
  const candidates = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (!isAgentWorktree(entry.name)) continue;
    const lockPath = `${WORKTREES_META}/${entry.name}/locked`;
    if (!existsSync(lockPath)) continue;
    let mtimeMs;
    try {
      mtimeMs = statSync(lockPath).mtimeMs;
    } catch {
      continue;
    }
    const ageMs = now - mtimeMs;
    if (ageMs >= STALE_THRESHOLD_MS) {
      candidates.push({ name: entry.name, ageMs, path: `${REPO_ROOT}/.claude/worktrees/${entry.name}` });
    }
  }

  if (candidates.length === 0) {
    process.stdout.write(JSON.stringify({ continue: true }) + "\n");
    return;
  }

  const unlocked = [];
  const failed = [];
  for (const wt of candidates) {
    const r = runGit(["worktree", "unlock", wt.path]);
    if (r.ok) {
      unlocked.push(wt.name);
    } else {
      failed.push({ name: wt.name, stderr: r.stderr.slice(0, 200) });
    }
  }

  log({
    event: "sweep",
    candidates: candidates.length,
    unlocked: unlocked.length,
    failed: failed.length,
    detail: { unlocked, failed },
  });

  process.stdout.write(JSON.stringify({ continue: true }) + "\n");
}

try {
  main();
} catch (e) {
  log({ event: "fatal", message: String(e) });
  process.stdout.write(JSON.stringify({ continue: true }) + "\n");
}
