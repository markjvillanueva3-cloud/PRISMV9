// chat-slots-release-no-orphan.test.mjs
// FLEET-GIT-CONTENTION-MS0/U-FGC-2 (slot:golf 2026-06-04)
//
// Proves releaseLock() DELETES the lock instead of renaming it to
// `${lockPath}.released-${Date.now()}`. The old rename leaked exactly one orphan
// file per lock release; 28,761 `chat-slots.lock.released-*` had accumulated under
// state/shared/ = 57% of the repo's entire `git status` churn. The fix makes
// unlink primary, rename a Windows-only race fallback — so the steady-state leak
// is zero. These tests exercise the real exported `withLock` (which acquires then
// releases) against a temp lock path, asserting: (a) the lock is held during the
// critical section, (b) it is gone afterward, and (c) NO `.released-*` sibling is
// left behind. Hermetic: a fresh OS temp dir per test, removed in finally.

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { withLock } from "./chat-slots.mjs";

function freshLockPath() {
  const dir = mkdtempSync(join(tmpdir(), "cs-lock-"));
  return { dir, lockPath: join(dir, "chat-slots.lock") };
}

test("withLock: lock is held during the critical section, deleted on release, no orphan leaked", () => {
  const { dir, lockPath } = freshLockPath();
  try {
    let heldDuringFn = null;
    const result = withLock(() => {
      heldDuringFn = existsSync(lockPath);
      return { ok: true };
    }, lockPath);

    assert.equal(result.ok, true, "fn ran → lock was acquired");
    assert.equal(heldDuringFn, true, "lock file exists while the critical section runs");
    assert.equal(existsSync(lockPath), false, "lock file is DELETED on release (not renamed)");

    const orphans = readdirSync(dir).filter((f) => f.includes(".released-"));
    assert.deepEqual(
      orphans,
      [],
      `releaseLock must not leak a .released-* orphan; found: ${orphans.join(", ")}`,
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("withLock: repeated acquire/release cycles leak zero orphans (the accumulation bug)", () => {
  const { dir, lockPath } = freshLockPath();
  try {
    for (let i = 0; i < 25; i++) {
      const r = withLock(() => ({ ok: true }), lockPath);
      assert.equal(r.ok, true, `cycle ${i}: lock acquired`);
    }
    // The pre-fix code would have left 25 `chat-slots.lock.released-<ts>` files here.
    const all = readdirSync(dir);
    const released = all.filter((f) => f.includes(".released-"));
    assert.equal(released.length, 0, `25 release cycles must leave 0 orphans; found ${released.length}: ${released.slice(0, 3).join(", ")}`);
    assert.equal(existsSync(lockPath), false, "no live lock left after the final release");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
