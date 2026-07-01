// Tests for git-commit-mutex.mjs (FLEET-GIT-CONTENTION-MS0/U-FGC-1).
// node:test (vite-config in this repo only globs src/__tests__/*.ts). Hermetic:
// pure fns tested directly; the lock uses a temp path; commitLocked uses an
// injected gitFn so NO real git/commit runs.
//
// Run: node --test H:/prism/.claude/helpers/git-commit-mutex.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, unlinkSync, writeFileSync, readFileSync, utimesSync } from "node:fs";
import { tmpdir, hostname } from "node:os";
import { join } from "node:path";
import {
  isTransientGitFailure,
  isStaleLock,
  acquireCommitLock,
  withCommitLock,
  commitLocked,
  isStaleIndexLock,
  sweepStaleIndexLock,
  gitIndexLockPath,
} from "./git-commit-mutex.mjs";

const tmpLock = () => join(tmpdir(), `prism-commit-mutex-test-${process.pid}-${test.name ?? "x"}-${Math.random().toString(36).slice(2)}.lock`);

// ── isTransientGitFailure ─────────────────────────────────────────────────────

test("isTransientGitFailure: ref-lock + index.lock races are transient", () => {
  assert.equal(isTransientGitFailure("fatal: cannot lock ref 'HEAD': is at abc but expected def"), true);
  assert.equal(isTransientGitFailure("fatal: Unable to create 'H:/prism/.git/index.lock': File exists."), true);
});

test("isTransientGitFailure: real errors are NOT transient", () => {
  assert.equal(isTransientGitFailure("nothing to commit, working tree clean"), false);
  assert.equal(isTransientGitFailure("error: pathspec 'x' did not match any files"), false);
  assert.equal(isTransientGitFailure(""), false);
  assert.equal(isTransientGitFailure(null), false);
});

// ── isStaleLock ───────────────────────────────────────────────────────────────

const STALE = 120000;
test("isStaleLock: unparseable lock body → reclaim", () => {
  assert.equal(isStaleLock(null, { ageMs: 1, staleMs: STALE, host: "H" }), true);
});

test("isStaleLock: age beyond staleMs → reclaim regardless of pid", () => {
  assert.equal(isStaleLock({ pid: 999999, host: "H" }, { ageMs: STALE + 1, staleMs: STALE, host: "H", pidAliveFn: () => true }), true);
});

test("isStaleLock: same-host DEAD pid (fresh) → reclaim", () => {
  assert.equal(isStaleLock({ pid: 4242, host: "H" }, { ageMs: 1000, staleMs: STALE, host: "H", pidAliveFn: () => false }), true);
});

test("isStaleLock: same-host LIVE pid (fresh) → keep", () => {
  assert.equal(isStaleLock({ pid: 4242, host: "H" }, { ageMs: 1000, staleMs: STALE, host: "H", pidAliveFn: () => true }), false);
});

test("isStaleLock: different-host fresh lock → keep (never probe a foreign pid)", () => {
  assert.equal(isStaleLock({ pid: 1, host: "OTHER" }, { ageMs: 1000, staleMs: STALE, host: "H", pidAliveFn: () => false }), false);
});

// ── acquire / withCommitLock ──────────────────────────────────────────────────

test("acquireCommitLock creates the lock and release() removes it", () => {
  const lockPath = tmpLock();
  const release = acquireCommitLock({ lockPath });
  assert.equal(existsSync(lockPath), true);
  release();
  assert.equal(existsSync(lockPath), false);
  release(); // idempotent — second release must not throw
});

test("withCommitLock holds for fn then releases even on throw", () => {
  const lockPath = tmpLock();
  assert.throws(() => withCommitLock(() => { assert.equal(existsSync(lockPath), true); throw new Error("boom"); }, { lockPath }), /boom/);
  assert.equal(existsSync(lockPath), false); // released despite the throw
});

test("acquireCommitLock reclaims a same-host DEAD-pid stale lock via atomic rename, then acquires", () => {
  // P1 coverage for the P0 concurrent-reclaim fix: a stale lock left by a dead
  // peer must be reclaimed (atomically) and the caller must end up the owner.
  const lockPath = tmpLock();
  writeFileSync(lockPath, JSON.stringify({ pid: 999999, host: hostname(), ts: Date.now() }));
  // staleMs huge so ONLY the dead-pid path can reclaim (isolates the pid branch).
  const release = acquireCommitLock({ lockPath, timeoutMs: 1000, staleMs: 9e9, pollMs: 25 });
  const body = JSON.parse(readFileSync(lockPath, "utf8"));
  assert.equal(body.pid, process.pid); // we now own it (reclaimed + recreated)
  release();
  assert.equal(existsSync(lockPath), false);
});

test("release() does NOT delete a lock a peer reclaimed mid-hold (ownership guard negative branch)", () => {
  const lockPath = tmpLock();
  const release = acquireCommitLock({ lockPath });
  // Simulate a peer reclaiming + re-locking under us (different pid/host).
  writeFileSync(lockPath, JSON.stringify({ pid: 4242, host: "PEER-HOST", ts: Date.now() }));
  release(); // must be a no-op — we no longer own the on-disk lock
  assert.equal(existsSync(lockPath), true);
  assert.equal(JSON.parse(readFileSync(lockPath, "utf8")).pid, 4242); // peer's lock intact
  unlinkSync(lockPath); // cleanup
});

test("acquireCommitLock times out on a live same-host held lock", () => {
  const lockPath = tmpLock();
  const release = acquireCommitLock({ lockPath });
  try {
    // staleMs huge so it is never reclaimed; tiny timeout so the test is fast.
    assert.throws(() => acquireCommitLock({ lockPath, timeoutMs: 200, staleMs: 9e9, pollMs: 50 }), /acquire timed out/);
  } finally {
    release();
    if (existsSync(lockPath)) unlinkSync(lockPath);
  }
});

// ── commitLocked (injected gitFn — no real git) ───────────────────────────────

// Fake git that fails transiently `failN` times, then succeeds; records calls.
const fakeGit = (failN, { staged = [] } = {}) => {
  let commits = 0;
  return (args) => {
    if (args[0] === "diff") return { stdout: staged.join("\n") };
    if (args[0] === "rev-parse") return { stdout: "deadbeef\n" };
    if (args[0] === "commit") {
      commits++;
      if (commits <= failN) {
        const err = new Error("commit failed");
        err.stderr = "fatal: cannot lock ref 'HEAD': is at aaa but expected bbb";
        throw err;
      }
      return { stdout: "" };
    }
    return { stdout: "" };
  };
};

test("commitLocked: succeeds first try on a quiet tree", () => {
  const r = commitLocked({ message: "[MAIN] x", paths: ["a.ts"], gitFn: fakeGit(0), opts: { lock: { lockPath: tmpLock() } } });
  assert.equal(r.ok, true);
  assert.equal(r.attempts, 1);
  assert.equal(r.sha, "deadbeef");
});

test("commitLocked: retries through transient ref-races then wins", () => {
  const r = commitLocked({ message: "[MAIN] x", paths: ["a.ts"], retries: 5, gitFn: fakeGit(3), opts: { lock: { lockPath: tmpLock() } } });
  assert.equal(r.ok, true);
  assert.equal(r.attempts, 4); // 3 transient fails + 1 success
});

test("commitLocked: a NON-transient failure surfaces immediately (no blind retry)", () => {
  const gitFn = (args) => {
    if (args[0] === "diff") return { stdout: "" };
    if (args[0] === "commit") { const e = new Error("x"); e.stderr = "error: pathspec did not match any files"; throw e; }
    return { stdout: "" };
  };
  const r = commitLocked({ message: "[MAIN] x", paths: ["a.ts"], retries: 5, gitFn, opts: { lock: { lockPath: tmpLock() } } });
  assert.equal(r.ok, false);
  assert.match(r.error, /non-transient/);
  assert.equal(r.attempts, 1);
});

test("commitLocked: exhausts retries on a perpetually-racing tree", () => {
  const r = commitLocked({ message: "[MAIN] x", paths: ["a.ts"], retries: 3, gitFn: fakeGit(99), opts: { lock: { lockPath: tmpLock() } } });
  assert.equal(r.ok, false);
  assert.match(r.error, /exhausted 3 retries/);
  assert.equal(r.attempts, 3);
});

test("commitLocked: refuses empty pathspec (pathspec is required to avoid peer-absorption)", () => {
  const r = commitLocked({ message: "[MAIN] x", paths: [], gitFn: fakeGit(0), opts: { lock: { lockPath: tmpLock() } } });
  assert.equal(r.ok, false);
  assert.match(r.error, /no pathspec/);
});

test("commitLocked: refuses empty message", () => {
  const r = commitLocked({ message: "  ", paths: ["a.ts"], gitFn: fakeGit(0), opts: { lock: { lockPath: tmpLock() } } });
  assert.equal(r.ok, false);
  assert.match(r.error, /empty commit message/);
});

test("commitLocked: commits ONLY the pathspec even when foreign files are staged (no absorption)", () => {
  const captured = [];
  const gitFn = (args) => {
    if (args[0] === "diff") return { stdout: "a.ts\nPEER-FILE.ts\nother/peer.json" };
    if (args[0] === "rev-parse") return { stdout: "cafe\n" };
    if (args[0] === "commit") { captured.push(args); return { stdout: "" }; }
    return { stdout: "" };
  };
  const r = commitLocked({ message: "[MAIN] mine", paths: ["a.ts"], gitFn, opts: { lock: { lockPath: tmpLock() } } });
  assert.equal(r.ok, true);
  // The commit args carry ONLY a.ts (pathspec after --) — never the peer's staged files.
  assert.deepEqual(captured[0], ["commit", "-m", "[MAIN] mine", "--", "a.ts"]);
});

// ── U-FGC-4: orphaned .git/index.lock reclaim ────────────────────────────────

test("isStaleIndexLock: young lock is never reclaimed (a live commit may hold it)", () => {
  assert.equal(isStaleIndexLock({ ageMs: 5_000, staleMs: 120_000, frozen: true }), false);
  assert.equal(isStaleIndexLock({ ageMs: 5_000, staleMs: 120_000, frozen: null }), false);
});

test("isStaleIndexLock: old + mtime-advancing (frozen=false) is NOT reclaimed (owner alive)", () => {
  assert.equal(isStaleIndexLock({ ageMs: 300_000, staleMs: 120_000, frozen: false }), false);
});

test("isStaleIndexLock: old + frozen, or old + unprobed, IS reclaimed", () => {
  assert.equal(isStaleIndexLock({ ageMs: 300_000, staleMs: 120_000, frozen: true }), true);
  assert.equal(isStaleIndexLock({ ageMs: 300_000, staleMs: 120_000, frozen: null }), true);
});

test("sweepStaleIndexLock: no lock present → no-op", () => {
  const r = sweepStaleIndexLock({ lockPath: "/x/index.lock", existsFn: () => false });
  assert.equal(r.swept, false);
  assert.equal(r.reason, "no lock");
});

test("sweepStaleIndexLock: young lock → not stale, never touched", () => {
  let renamed = false;
  const r = sweepStaleIndexLock({
    lockPath: "/x/index.lock",
    staleMs: 120_000,
    now: () => 1_000_000,
    existsFn: () => true,
    statFn: () => ({ mtimeMs: 1_000_000 - 5_000 }), // 5s old
    renameFn: () => { renamed = true; },
  });
  assert.equal(r.swept, false);
  assert.equal(r.reason, "not stale");
  assert.equal(renamed, false);
});

test("sweepStaleIndexLock: old + frozen mtime → atomic reclaim (rename→unlink)", () => {
  const calls = { rename: 0, unlink: 0, slept: 0 };
  const r = sweepStaleIndexLock({
    lockPath: "/x/index.lock",
    staleMs: 120_000,
    freezeProbeMs: 500,
    now: () => 1_000_000,
    existsFn: () => true,
    statFn: () => ({ mtimeMs: 1_000_000 - 300_000 }), // 5 min old, mtime constant across probe
    sleepFn: () => { calls.slept++; },
    renameFn: () => { calls.rename++; },
    unlinkFn: () => { calls.unlink++; },
  });
  assert.equal(r.swept, true);
  assert.equal(r.frozen, true);
  assert.equal(calls.rename, 1);
  assert.equal(calls.unlink, 1);
  assert.equal(calls.slept, 1);
});

test("sweepStaleIndexLock: old but mtime ADVANCES during probe → owner alive, NOT swept", () => {
  let mtime = 1_000_000 - 300_000;
  let renamed = false;
  const r = sweepStaleIndexLock({
    lockPath: "/x/index.lock",
    staleMs: 120_000,
    freezeProbeMs: 1,
    now: () => 1_000_000,
    existsFn: () => true,
    statFn: () => ({ mtimeMs: mtime }),
    sleepFn: () => { mtime += 1; }, // simulate the owner writing during the probe
    renameFn: () => { renamed = true; },
  });
  assert.equal(r.swept, false);
  assert.match(r.reason, /owner alive/);
  assert.equal(renamed, false);
});

test("sweepStaleIndexLock: owner RESUMES between probe and rename → bail, no clobber (P1 mitigation)", () => {
  // age stat + probe both see a frozen mtime, but the final pre-rename recheck
  // sees mtime advance (a suspended committer resumed) → must NOT reclaim.
  let renamed = false;
  let call = 0;
  const r = sweepStaleIndexLock({
    lockPath: "/x/index.lock",
    staleMs: 120_000,
    freezeProbeMs: 1,
    now: () => 1_000_000,
    existsFn: () => true,
    statFn: () => {
      call++;
      return { mtimeMs: call <= 2 ? 700_000 : 700_500 }; // 1=age, 2=probe (frozen), 3=recheck moved
    },
    sleepFn: () => {},
    renameFn: () => { renamed = true; },
  });
  assert.equal(r.swept, false);
  assert.match(r.reason, /owner resumed before reclaim/);
  assert.equal(renamed, false);
});

test("sweepStaleIndexLock: freezeProbeMs=0 reclaims on age alone (no probe)", () => {
  let renamed = false;
  const r = sweepStaleIndexLock({
    lockPath: "/x/index.lock",
    staleMs: 120_000,
    freezeProbeMs: 0,
    now: () => 1_000_000,
    existsFn: () => true,
    statFn: () => ({ mtimeMs: 1_000_000 - 300_000 }),
    renameFn: () => { renamed = true; },
    unlinkFn: () => {},
  });
  assert.equal(r.swept, true);
  assert.equal(r.frozen, null);
  assert.equal(renamed, true);
});

test("sweepStaleIndexLock: lost the reclaim race (rename throws) → swept:false, never throws", () => {
  const r = sweepStaleIndexLock({
    lockPath: "/x/index.lock",
    staleMs: 120_000,
    freezeProbeMs: 0,
    now: () => 1_000_000,
    existsFn: () => true,
    statFn: () => ({ mtimeMs: 1_000_000 - 300_000 }),
    renameFn: () => { throw new Error("ENOENT"); }, // a peer swept it first
  });
  assert.equal(r.swept, false);
  assert.match(r.reason, /lost reclaim race/);
});

test("gitIndexLockPath: relative rev-parse path is joined to cwd", () => {
  const p = gitIndexLockPath("/repo", () => ({ stdout: ".git/index.lock\n" }));
  assert.equal(p, join("/repo", ".git/index.lock"));
});

test("gitIndexLockPath: absolute rev-parse path is used as-is", () => {
  const abs = join(tmpdir(), "wt", "index.lock");
  const p = gitIndexLockPath("/repo", () => ({ stdout: abs + "\n" }));
  assert.equal(p, abs);
});

test("gitIndexLockPath: rev-parse failure falls back to <cwd>/.git/index.lock", () => {
  const p = gitIndexLockPath("/repo", () => { throw new Error("not a git dir"); });
  assert.equal(p, join("/repo", ".git", "index.lock"));
});

test("commitLocked sweeps a stale orphan .git/index.lock before committing (U-FGC-4 integration)", () => {
  // Real FS: plant a 5-min-old orphan lock, point gitIndexLockPath at it via the
  // injected gitFn, and assert commitLocked clears it as part of committing.
  const fakeLock = join(tmpdir(), `prism-fake-index-${process.pid}-${Math.random().toString(36).slice(2)}.lock`);
  writeFileSync(fakeLock, "");
  const old = new Date(Date.now() - 5 * 60 * 1000);
  utimesSync(fakeLock, old, old);
  const gitFn = (args) => {
    if (args[0] === "rev-parse" && args[1] === "--git-path") return { stdout: fakeLock + "\n" };
    if (args[0] === "rev-parse") return { stdout: "deadbeef\n" };
    if (args[0] === "diff") return { stdout: "" };
    return { stdout: "" }; // add + commit succeed
  };
  try {
    const r = commitLocked({ message: "[MAIN] x", paths: ["a.ts"], gitFn, opts: { lock: { lockPath: tmpLock() } } });
    assert.equal(r.ok, true);
    assert.equal(existsSync(fakeLock), false, "stale orphan index.lock must be swept before the commit");
  } finally {
    if (existsSync(fakeLock)) unlinkSync(fakeLock);
  }
});
