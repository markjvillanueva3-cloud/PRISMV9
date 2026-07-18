// tier: T1
// Tests for .claude/hooks/git-index-lock-sweep.mjs
// (FLEET-GIT-CONTENTION-MS0/U-FGC-5).
//
// node:test — hermetic: the matcher is pure; resolveSharedIndexLock + run use
// injected fs/sweep stubs so NO real git, FS, or lock is touched.
//
// Run: node --test H:/prism/.claude/hooks/git-index-lock-sweep.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import {
  isIndexTouchingGitCommand,
  resolveSharedIndexLock,
  run,
} from "./git-index-lock-sweep.mjs";

// ── isIndexTouchingGitCommand ────────────────────────────────────────────────

test("matches the common index/ref-locking git subcommands", () => {
  for (const c of [
    "git commit -m x",
    "rtk git commit -m x",
    "git add . && git commit -m x",
    "cd H:/prism && git merge slot/alpha",
    "git rebase main",
    "git cherry-pick abc",
    "git stash",
    "git pull --ff-only",
    "git -C H:/prism commit -m x",
    "command git add -- a.ts",
  ]) {
    assert.equal(isIndexTouchingGitCommand(c), true, c);
  }
});

test("does NOT match read-only git or non-git commands", () => {
  for (const c of [
    "git status",
    "git log --oneline -5",
    "git diff HEAD",
    "git show abc",
    "git rev-parse HEAD",
    "npm run build",
    "node scripts/foo.mjs",
    "echo committing now", // 'committing' is not the `git <verb>` shape
  ]) {
    assert.equal(isIndexTouchingGitCommand(c), false, c);
  }
});

test("non-string command is not a match (no throw)", () => {
  assert.equal(isIndexTouchingGitCommand(undefined), false);
  assert.equal(isIndexTouchingGitCommand(null), false);
  assert.equal(isIndexTouchingGitCommand(42), false);
});

// ── resolveSharedIndexLock ───────────────────────────────────────────────────

test("returns <cwd>/.git/index.lock when .git is a real directory (shared tree)", () => {
  const p = resolveSharedIndexLock("/repo", {
    existsFn: () => true,
    statFn: () => ({ isDirectory: () => true }),
  });
  assert.equal(p, join("/repo", ".git", "index.lock"));
});

test("returns null for a worktree (.git is a file)", () => {
  const p = resolveSharedIndexLock("/wt", {
    existsFn: () => true,
    statFn: () => ({ isDirectory: () => false }),
  });
  assert.equal(p, null);
});

test("returns null when .git is absent", () => {
  const p = resolveSharedIndexLock("/nowhere", { existsFn: () => false });
  assert.equal(p, null);
});

// ── run (the decision core) ──────────────────────────────────────────────────

const lockResolver = () => "/repo/.git/index.lock";

test("non-Bash tool → passthrough, no sweep", () => {
  let swept = false;
  const out = run({ tool_name: "Read", tool_input: { file_path: "x" } }, {
    sweepFn: () => { swept = true; return { swept: true }; },
    resolveLock: lockResolver,
  });
  assert.deepEqual(out, { continue: true });
  assert.equal(swept, false);
});

test("read-only git command → passthrough, no sweep", () => {
  let swept = false;
  const out = run({ tool_name: "Bash", tool_input: { command: "git status" } }, {
    sweepFn: () => { swept = true; return { swept: true }; },
    resolveLock: lockResolver,
  });
  assert.deepEqual(out, { continue: true });
  assert.equal(swept, false);
});

test("commit on a worktree (resolveLock→null) → passthrough, no sweep", () => {
  let swept = false;
  const out = run({ tool_name: "Bash", tool_input: { command: "git commit -m x" } }, {
    sweepFn: () => { swept = true; return { swept: true }; },
    resolveLock: () => null,
  });
  assert.deepEqual(out, { continue: true });
  assert.equal(swept, false);
});

test("commit with NO stale orphan → passthrough (sweepFn returns swept:false)", () => {
  const out = run({ tool_name: "Bash", tool_input: { command: "git commit -m x" } }, {
    sweepFn: () => ({ swept: false, reason: "no lock" }),
    resolveLock: lockResolver,
  });
  assert.deepEqual(out, { continue: true });
});

test("commit WITH a dead orphan → swept + advisory additionalContext, still continues", () => {
  let calledWith = null;
  const out = run({ tool_name: "Bash", tool_input: { command: "git add . && git commit -m x" } }, {
    sweepFn: (opts) => { calledWith = opts; return { swept: true, ageMs: 303000, frozen: true }; },
    resolveLock: lockResolver,
  });
  assert.equal(out.continue, true);
  assert.equal(out.hookSpecificOutput.hookEventName, "PreToolUse");
  assert.match(out.hookSpecificOutput.additionalContext, /cleared a dead orphan/);
  assert.match(out.hookSpecificOutput.additionalContext, /age 303s/);
  assert.match(out.hookSpecificOutput.additionalContext, /U-FGC-5/);
  assert.equal(calledWith.lockPath, "/repo/.git/index.lock");
});

test("PRISM_GIT_LOCK_SWEEP_DISABLE=1 → hard passthrough, no sweep", () => {
  const prev = process.env.PRISM_GIT_LOCK_SWEEP_DISABLE;
  process.env.PRISM_GIT_LOCK_SWEEP_DISABLE = "1";
  try {
    let swept = false;
    const out = run({ tool_name: "Bash", tool_input: { command: "git commit -m x" } }, {
      sweepFn: () => { swept = true; return { swept: true }; },
      resolveLock: lockResolver,
    });
    assert.deepEqual(out, { continue: true });
    assert.equal(swept, false);
  } finally {
    if (prev === undefined) delete process.env.PRISM_GIT_LOCK_SWEEP_DISABLE;
    else process.env.PRISM_GIT_LOCK_SWEEP_DISABLE = prev;
  }
});

test("null/garbled stdin → passthrough (never throws)", () => {
  assert.deepEqual(run(null, { resolveLock: lockResolver }), { continue: true });
  assert.deepEqual(run({}, { resolveLock: lockResolver }), { continue: true });
});
