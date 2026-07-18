// scripts/lib/ollama-coresidency.test.mjs
// R9 tests for the co-residency policy + hard-reason load mutex (U-OAB-U9). The keep_alive
// policy is pure (locks the hard-reason="0s" never-strand-65GB invariant); the mutex tests use
// REAL temp files to prove the safety-critical property: a 120b (hard-reason) load can never run
// concurrently with another -- i.e. two calls SERIALIZE, the lock releases on throw, a crashed
// holder's stale lock is reclaimed, and a busy lock fails LOUD (throws) rather than colliding.
import { test } from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { writeFileSync, utimesSync, existsSync, rmSync } from "node:fs";
import { RECOMMENDED_ENV, keepAliveFor, applyHints, withHardReasonLock } from "./ollama-coresidency.mjs";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let lockSeq = 0;
function tmpLock(tag) {
  const p = path.join(os.tmpdir(), `u9-${tag}-${process.pid}-${lockSeq++}.lock`);
  try { rmSync(p, { force: true }); } catch { /* fresh */ }
  return p;
}

test("keepAliveFor: hard-reason is '0s' (NEVER strand the 65GB 120b) -- the load-bearing invariant", () => {
  assert.equal(keepAliveFor("hard-reason"), "0s");
});
test("keepAliveFor: everyday classes warm '30m', embed/vision '5m', unknown defaults '30m'", () => {
  for (const c of ["search", "summarize", "codegen", "gen-test", "explain", "commit-msg", "triage"]) assert.equal(keepAliveFor(c), "30m");
  assert.equal(keepAliveFor("embed"), "5m");
  assert.equal(keepAliveFor("vision"), "5m");
  assert.equal(keepAliveFor("totally-unknown"), "30m"); // never strands (not hard-reason)
});

test("applyHints: returns a COPY with keep_alive set; never mutates the input body", () => {
  const body = { model: "qwen2.5-coder:32b", prompt: "x", options: { temperature: 0 } };
  const out = applyHints(body, "codegen");
  assert.equal(out.keep_alive, "30m");
  assert.equal(out.model, "qwen2.5-coder:32b");      // preserved
  assert.deepEqual(out.options, { temperature: 0 });  // preserved
  assert.equal("keep_alive" in body, false);          // input NOT mutated
  assert.equal(applyHints(body, "hard-reason").keep_alive, "0s");
  // the strand-65GB path: a caller body that ALREADY carries keep_alive:"30m" for a hard-reason task
  // MUST be coerced to "0s" (spread-then-set order) -- else the 120b stays resident. Lock it.
  assert.equal(applyHints({ keep_alive: "30m", model: "gpt-oss:120b" }, "hard-reason").keep_alive, "0s");
  assert.equal(applyHints(null, "search").keep_alive, "30m");      // null body -> {keep_alive}
  assert.equal(applyHints(undefined, "embed").keep_alive, "5m");
});

test("RECOMMENDED_ENV: frozen; NUM_PARALLEL=1 (anti-thrash) + MAX_LOADED=3 (everyday pair+embed)", () => {
  assert.equal(Object.isFrozen(RECOMMENDED_ENV), true);
  assert.equal(RECOMMENDED_ENV.OLLAMA_NUM_PARALLEL, "1");   // parallel doubles 32b KV -> thrash
  assert.equal(RECOMMENDED_ENV.OLLAMA_MAX_LOADED_MODELS, "3");
  assert.equal(RECOMMENDED_ENV.OLLAMA_KV_CACHE_TYPE, "q8_0");
  assert.equal(RECOMMENDED_ENV.OLLAMA_FLASH_ATTENTION, "1"); // required for KV quant
});

test("withHardReasonLock: runs fn, returns its value, releases the lock (file gone after)", async () => {
  const lockPath = tmpLock("run");
  const v = await withHardReasonLock(async () => { assert.equal(existsSync(lockPath), true); return 42; }, { lockPath });
  assert.equal(v, 42);
  assert.equal(existsSync(lockPath), false); // released
});

test("withHardReasonLock: two concurrent calls SERIALIZE (no 120b+resident collision)", async () => {
  const lockPath = tmpLock("mx");
  const log = [];
  const job = (id) => withHardReasonLock(async () => { log.push(`${id}-start`); await sleep(40); log.push(`${id}-end`); }, { lockPath, acquireTimeoutMs: 5000 });
  await Promise.all([job("a"), job("b")]);
  const s = log.join(",");
  // one must fully complete before the other starts -- never a-start,b-start,...
  assert.ok(s === "a-start,a-end,b-start,b-end" || s === "b-start,b-end,a-start,a-end", `interleaved (collision!): ${s}`);
});

test("withHardReasonLock: releases the lock even when fn THROWS (finally)", async () => {
  const lockPath = tmpLock("throw");
  await assert.rejects(withHardReasonLock(async () => { throw new Error("boom"); }, { lockPath }), /boom/);
  assert.equal(existsSync(lockPath), false);                 // released despite throw
  let ran = false;                                            // next acquire must succeed
  await withHardReasonLock(async () => { ran = true; }, { lockPath, acquireTimeoutMs: 1000 });
  assert.equal(ran, true);
});

test("withHardReasonLock: a busy lock fails LOUD (throws) rather than colliding", async () => {
  const lockPath = tmpLock("busy");
  let release;
  const held = withHardReasonLock(() => new Promise((r) => { release = r; }), { lockPath, acquireTimeoutMs: 5000 });
  await sleep(30); // ensure held
  await assert.rejects(withHardReasonLock(async () => {}, { lockPath, acquireTimeoutMs: 120 }), /busy/);
  release();
  await held;
  assert.equal(existsSync(lockPath), false);
});

test("withHardReasonLock: reclaims a STALE lock from a crashed holder (age > stale threshold)", async () => {
  const lockPath = tmpLock("stale");
  writeFileSync(lockPath, "99999");                          // fake dead holder pid
  const old = new Date(Date.now() - 700000);                 // 700s ago > 600s default stale
  utimesSync(lockPath, old, old);
  let ran = false;
  await withHardReasonLock(async () => { ran = true; }, { lockPath, acquireTimeoutMs: 1000 });
  assert.equal(ran, true);                                   // stale lock reclaimed, fn ran
  assert.equal(existsSync(lockPath), false);
});

// R9 discriminator (reviewer-B P1): the stale test alone passes a no-locking stub. This pins that it
// is STALENESS that gates reclaim -- a FRESH (mtime~now) lock must NOT be reclaimed; the call must
// time out LOUD instead. Fails a "reclaim-regardless-of-mtime" mutation AND a "no-locking" stub.
test("withHardReasonLock: does NOT reclaim a FRESH (non-stale) lock -- proves staleness gates reclaim", async () => {
  const lockPath = tmpLock("fresh");
  writeFileSync(lockPath, "12345");                          // a LIVE holder's lock, mtime = now (fresh)
  await assert.rejects(withHardReasonLock(async () => {}, { lockPath, acquireTimeoutMs: 200 }), /busy/);
  assert.equal(existsSync(lockPath), true);                  // fresh lock NOT reclaimed (still held)
  rmSync(lockPath, { force: true });                         // cleanup the manual lock
});
