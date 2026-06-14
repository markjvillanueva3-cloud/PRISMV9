// scripts/lib/tribal-index-lock.test.mjs — BRAIN-UPGRADE rank 12 (2026-05-30 slot:alpha).
//
// Hermetic adapter tests (real tmp fs, no child procs). The cross-process
// serialization proof lives in exclusive-file-lock.test.mjs (the primitive this
// adapter composes); here we verify the tribal-specific behavior: the `.lock`
// path convention, the DECOUPLED OFF knob, and correct delegation to the lock.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  tribalLockPath,
  tribalIndexLockOff,
  acquireTribalIndexLock,
  releaseTribalIndexLock,
  withTribalIndexLock,
  EXIT_TRIBAL_INDEX_LOCK_SKIP,
} from "./tribal-index-lock.mjs";

const tmpDir = () => fs.mkdtempSync(path.join(os.tmpdir(), "tribal-lock-test-"));
function withEnv(key, val, fn) {
  const prev = process.env[key];
  if (val === undefined) delete process.env[key];
  else process.env[key] = val;
  try { return fn(); } finally {
    if (prev === undefined) delete process.env[key];
    else process.env[key] = prev;
  }
}

test("tribalLockPath appends .lock beside the index", () => {
  assert.equal(tribalLockPath("/x/y/tribal-embed-index.json"), "/x/y/tribal-embed-index.json.lock");
});

test("tribalIndexLockOff reads PRISM_TRIBAL_INDEX_LOCK_OFF at call time", () => {
  withEnv("PRISM_TRIBAL_INDEX_LOCK_OFF", undefined, () => assert.equal(tribalIndexLockOff(), false));
  withEnv("PRISM_TRIBAL_INDEX_LOCK_OFF", "1", () => assert.equal(tribalIndexLockOff(), true));
  withEnv("PRISM_TRIBAL_INDEX_LOCK_OFF", "0", () => assert.equal(tribalIndexLockOff(), false));
});

test("EXIT_TRIBAL_INDEX_LOCK_SKIP is the benign concurrent-skip code (4)", () => {
  assert.equal(EXIT_TRIBAL_INDEX_LOCK_SKIP, 4);
});

test("acquire on a free index writes our pid; release removes it", () => {
  withEnv("PRISM_TRIBAL_INDEX_LOCK_OFF", undefined, () => {
    const idx = path.join(tmpDir(), "tribal-embed-index.json");
    const lk = acquireTribalIndexLock(idx, { selfPid: 4242 });
    assert.equal(lk.acquired, true);
    assert.equal(JSON.parse(fs.readFileSync(tribalLockPath(idx), "utf8")).pid, 4242);
    releaseTribalIndexLock(idx, { selfPid: 4242 });
    assert.equal(fs.existsSync(tribalLockPath(idx)), false);
  });
});

test("a live peer holding the lock blocks acquire within the retry window", () => {
  withEnv("PRISM_TRIBAL_INDEX_LOCK_OFF", undefined, () => {
    const idx = path.join(tmpDir(), "tribal-embed-index.json");
    acquireTribalIndexLock(idx, { selfPid: 1 });
    const lk2 = acquireTribalIndexLock(idx, { selfPid: 2, retries: 3, retryMs: 5, staleMs: 60_000 });
    assert.equal(lk2.acquired, false);
  });
});

test("OFF knob → acquire is a no-op success (disabled), no lock file, release no-throw", () => {
  withEnv("PRISM_TRIBAL_INDEX_LOCK_OFF", "1", () => {
    const idx = path.join(tmpDir(), "tribal-embed-index.json");
    const lk = acquireTribalIndexLock(idx);
    assert.equal(lk.acquired, true);
    assert.equal(lk.disabled, true);
    assert.equal(fs.existsSync(tribalLockPath(idx)), false);
    releaseTribalIndexLock(idx); // must not throw
  });
});

test("withTribalIndexLock runs fn under the lock and releases after", () => {
  withEnv("PRISM_TRIBAL_INDEX_LOCK_OFF", undefined, () => {
    const idx = path.join(tmpDir(), "tribal-embed-index.json");
    let lockedDuringFn;
    const r = withTribalIndexLock(idx, () => {
      lockedDuringFn = fs.existsSync(tribalLockPath(idx));
      return "done";
    }, { selfPid: 7 });
    assert.equal(r.ran, true);
    assert.equal(r.value, "done");
    assert.equal(lockedDuringFn, true);
    assert.equal(fs.existsSync(tribalLockPath(idx)), false);
  });
});

test("withTribalIndexLock defers (ran:false, fn not called) when a peer holds it", () => {
  withEnv("PRISM_TRIBAL_INDEX_LOCK_OFF", undefined, () => {
    const idx = path.join(tmpDir(), "tribal-embed-index.json");
    acquireTribalIndexLock(idx, { selfPid: 1 });
    let called = false;
    const r = withTribalIndexLock(idx, () => { called = true; }, { selfPid: 2, retries: 2, retryMs: 5, staleMs: 60_000 });
    assert.equal(r.ran, false);
    assert.equal(called, false);
  });
});

test("OFF knob → withTribalIndexLock runs fn unconditionally (disabled)", () => {
  withEnv("PRISM_TRIBAL_INDEX_LOCK_OFF", "1", () => {
    const idx = path.join(tmpDir(), "tribal-embed-index.json");
    // even with a stray lock file present, OFF bypasses it
    fs.mkdirSync(path.dirname(idx), { recursive: true });
    fs.writeFileSync(tribalLockPath(idx), JSON.stringify({ pid: 999 }));
    let called = false;
    const r = withTribalIndexLock(idx, () => { called = true; return 1; });
    assert.equal(r.ran, true);
    assert.equal(r.disabled, true);
    assert.equal(called, true);
  });
});
