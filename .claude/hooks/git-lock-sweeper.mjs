#!/usr/bin/env node
/**
 * git-lock-sweeper.mjs — HS-02 mid-session stale-lock cleanup.
 *
 * git-health-guard runs only on SessionStart. Locks that accumulate
 * MID-SESSION (from killed `git commit`, fork-storm orphans, crashed
 * peer chats) linger until the next chat starts. This hook sweeps them
 * cheaply on Stop / UserPromptSubmit.
 *
 * Wired via stop-bundle.mjs SUB_HOOKS (one fork per turn-end, fail-OPEN).
 * Cheap: ~5ms when no locks present.
 *
 * Safety: never removes locks <5 min old (could be a live concurrent op).
 * Worktree locks >60 min old (likely from a crashed agent) ARE removed.
 */
import { readdirSync, statSync, unlinkSync, existsSync } from "node:fs";
import { join } from "node:path";

const REPO = "H:/prism";
const TOP_LOCK_MIN_AGE_MS = 5 * 60 * 1000;
const WORKTREE_LOCK_MIN_AGE_MS = 60 * 60 * 1000;

const TOP_LOCKS = [".git/index.lock", ".git/HEAD.lock", ".git/config.lock", ".git/shallow.lock"];

function tryRemove(filePath, minAgeMs) {
  try {
    if (!existsSync(filePath)) return null;
    const st = statSync(filePath);
    if (Date.now() - st.mtimeMs < minAgeMs) return null;
    unlinkSync(filePath);
    return filePath;
  } catch {
    return null;
  }
}

function sweepWorktreeLocks() {
  const removed = [];
  try {
    const dir = join(REPO, ".git/worktrees");
    if (!existsSync(dir)) return removed;
    for (const wt of readdirSync(dir)) {
      const lock = join(dir, wt, "index.lock");
      const r = tryRemove(lock, WORKTREE_LOCK_MIN_AGE_MS);
      if (r) removed.push(r);
    }
  } catch { /* ignore */ }
  return removed;
}

function sweepRefHeadsLocks() {
  const removed = [];
  try {
    const refsHeads = join(REPO, ".git/refs/heads");
    if (!existsSync(refsHeads)) return removed;
    const walk = (d) => {
      for (const ent of readdirSync(d, { withFileTypes: true })) {
        const p = join(d, ent.name);
        if (ent.isDirectory()) walk(p);
        else if (ent.name.endsWith(".lock")) {
          const r = tryRemove(p, TOP_LOCK_MIN_AGE_MS);
          if (r) removed.push(r);
        }
      }
    };
    walk(refsHeads);
  } catch { /* ignore */ }
  return removed;
}

async function main() {
  // Read+discard stdin (hook contract; we don't use payload fields).
  try { process.stdin.resume(); process.stdin.on("data", () => {}); } catch { /* ignore */ }

  const removed = [];
  for (const rel of TOP_LOCKS) {
    const r = tryRemove(join(REPO, rel), TOP_LOCK_MIN_AGE_MS);
    if (r) removed.push(r);
  }
  removed.push(...sweepWorktreeLocks());
  removed.push(...sweepRefHeadsLocks());

  if (removed.length > 0) {
    process.stdout.write(JSON.stringify({
      continue: true,
      hookSpecificOutput: {
        additionalContext: `git-lock-sweeper: cleared ${removed.length} stale lock(s) — ${removed.map((p) => p.replace(REPO + "/", "")).join(", ")}`,
      },
    }));
  } else {
    process.stdout.write(JSON.stringify({ continue: true }));
  }
}

main().catch(() => {
  process.stdout.write(JSON.stringify({ continue: true }));
});
