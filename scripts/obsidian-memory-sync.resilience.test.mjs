// scripts/obsidian-memory-sync.resilience.test.mjs
//
// OBSIDIAN-VAULT-OPS / U-VAULT-SYNC-RESILIENT — hermetic tests for writeWithRetry().
//
// The bug this guards: before 2026-06-08 the type-routed write was a bare
// fs.writeFileSync; a single transient OneDrive/AV file lock (Windows UNKNOWN
// -4094 / EBUSY / EPERM / EACCES) THREW and aborted the entire C:->H: sync pass,
// silently skipping every alphabetically-later memory (data loss). writeWithRetry
// retries transient codes (3 × 100ms backoff) and reports a final failure via
// {ok:false} so the caller can count it and CONTINUE the batch (fail-loud, R12).
//
// All tests inject fsImpl + sleepImpl — no real file lock, no real sleep, no live
// vault touched. Real behavior assertions (retry COUNT, write SUCCESS, error
// SURFACED), never toBeDefined()-style stubs.
//
// Coverage (per comprehensive-build floor):
//   happy           — clean write succeeds on attempt 1, no sleep
//   failure mode 1  — transient throw on attempts 1-2 then success → file written, slept twice
//   failure mode 2  — transient throw on all 3 attempts → {ok:false}, error surfaced, 3 attempts
//   failure mode 3  — NON-transient code (ENOSPC) → NO retry (fails on attempt 1), error surfaced
//   adversarial 1   — a throw with NO .code (generic Error) is treated non-transient → no retry
//   adversarial 2   — batch semantics: a mid-list failure does NOT stop later writes (the bug)

import test from 'node:test';
import assert from 'node:assert/strict';
import { writeWithRetry } from './obsidian-memory-sync.mjs';

// A fake fs whose writeFileSync throws a scripted sequence of errors, then records
// successful writes. `throwsOn` is a map of attempt-index (1-based) → error to throw.
function makeFakeFs(throwsOn = {}) {
  const writes = [];
  let attempt = 0;
  return {
    writes,
    existsSync: () => true, // dir always "exists" so ensureDir path is a no-op
    mkdirSync: () => {},
    writeFileSync(p, c) {
      attempt++;
      const err = throwsOn[attempt];
      if (err) throw err;
      writes.push({ path: p, content: c });
    },
  };
}

function err(code) {
  const e = new Error(code ? `${code}: simulated` : 'generic failure');
  if (code) e.code = code;
  return e;
}

test('happy — clean write succeeds on attempt 1, never sleeps', () => {
  const fsImpl = makeFakeFs();
  let slept = 0;
  const res = writeWithRetry('H:/x/a.md', 'body', { fsImpl, sleepImpl: () => slept++ });
  assert.equal(res.ok, true);
  assert.equal(res.attempts, 1);
  assert.equal(fsImpl.writes.length, 1);
  assert.equal(fsImpl.writes[0].content, 'body');
  assert.equal(slept, 0, 'no sleep on first-try success');
});

test('failure 1 — transient EBUSY on attempts 1-2 then success → written, slept twice', () => {
  const fsImpl = makeFakeFs({ 1: err('EBUSY'), 2: err('EBUSY') });
  let slept = 0;
  const res = writeWithRetry('H:/x/b.md', 'body', { fsImpl, sleepImpl: () => slept++ });
  assert.equal(res.ok, true);
  assert.equal(res.attempts, 3, 'succeeded on the 3rd attempt');
  assert.equal(fsImpl.writes.length, 1, 'file written exactly once');
  assert.equal(slept, 2, 'backed off after attempts 1 and 2, not after the success');
});

test('failure 2 — transient UNKNOWN on all 3 attempts → {ok:false}, error surfaced, 3 attempts', () => {
  const fsImpl = makeFakeFs({ 1: err('UNKNOWN'), 2: err('UNKNOWN'), 3: err('UNKNOWN') });
  let slept = 0;
  const res = writeWithRetry('H:/x/c.md', 'body', { fsImpl, sleepImpl: () => slept++ });
  assert.equal(res.ok, false, 'reports failure (fail-loud), does not throw');
  assert.equal(res.attempts, 3);
  assert.equal(res.error.code, 'UNKNOWN', 'the real error is surfaced for logging');
  assert.equal(fsImpl.writes.length, 0, 'nothing written');
  assert.equal(slept, 2, 'slept after attempts 1 and 2 only (not after the final failed attempt)');
});

test('failure 3 — NON-transient ENOSPC → no retry, fails on attempt 1', () => {
  const fsImpl = makeFakeFs({ 1: err('ENOSPC') });
  let slept = 0;
  const res = writeWithRetry('H:/x/d.md', 'body', { fsImpl, sleepImpl: () => slept++ });
  assert.equal(res.ok, false);
  assert.equal(res.attempts, 1, 'non-transient → broke after the FIRST attempt (accurate count, not the cap)');
  assert.equal(res.error.code, 'ENOSPC');
  assert.equal(slept, 0, 'NON-transient code → broke out immediately, never slept');
  assert.equal(fsImpl.writes.length, 0);
});

test('adversarial 1 — throw with no .code is treated non-transient → no retry', () => {
  const fsImpl = makeFakeFs({ 1: err(null) }); // generic Error, no code
  let slept = 0;
  const res = writeWithRetry('H:/x/e.md', 'body', { fsImpl, sleepImpl: () => slept++ });
  assert.equal(res.ok, false);
  assert.equal(slept, 0, 'unknown error class is NOT retried (avoids masking a real bug)');
});

test('adversarial 2 — batch semantics: a mid-list failure does not stop later writes', () => {
  // Simulate the real loop: writer of B always throws transient, A and C are fine.
  // The bug was that B's throw aborted C. With writeWithRetry returning {ok:false},
  // the caller continues — proven here by driving 3 independent calls.
  const files = ['A', 'B', 'C'];
  const written = [];
  let errors = 0;
  for (const f of files) {
    const fsImpl = f === 'B'
      ? makeFakeFs({ 1: err('EPERM'), 2: err('EPERM'), 3: err('EPERM') })
      : makeFakeFs();
    const res = writeWithRetry(`H:/x/${f}.md`, f, { fsImpl, sleepImpl: () => {} });
    if (res.ok) written.push(f);
    else errors++;
  }
  assert.deepEqual(written, ['A', 'C'], 'A and C written despite B failing — batch NOT aborted');
  assert.equal(errors, 1, 'exactly one file counted as an error (B), surfaced not swallowed');
});
