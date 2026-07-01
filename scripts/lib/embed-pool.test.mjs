/**
 * embed-pool.test.mjs — proves the four contract invariants embedders rely on:
 * order preservation, byte-identical conc=1, abort-on-throw, tolerate-on-return,
 * plus the concurrency bound and the knob/guard helpers.
 *
 * Run: node --test scripts/lib/embed-pool.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { runEmbedPool, resolveEmbedConcurrency, toPosInt } from "./embed-pool.mjs";

const tick = (ms = 0) => new Promise((r) => setTimeout(r, ms));

// ── toPosInt ────────────────────────────────────────────────────────────────
test("toPosInt: valid integers pass through", () => {
  assert.equal(toPosInt(1), 1);
  assert.equal(toPosInt(16), 16);
  assert.equal(toPosInt("8"), 8);
});

test("toPosInt: floors floats", () => {
  assert.equal(toPosInt(3.9), 3);
  assert.equal(toPosInt("4.5"), 4);
});

test("toPosInt: non-finite / < 1 / junk → default", () => {
  assert.equal(toPosInt(0), 1);
  assert.equal(toPosInt(-3), 1);
  assert.equal(toPosInt(""), 1);
  assert.equal(toPosInt("abc"), 1);
  assert.equal(toPosInt(NaN), 1);
  assert.equal(toPosInt(undefined), 1);
  assert.equal(toPosInt(null), 1);
  assert.equal(toPosInt(0, 5), 5); // honors custom default
});

// ── resolveEmbedConcurrency ──────────────────────────────────────────────────
test("resolveEmbedConcurrency: default 1 when unset", () => {
  assert.equal(resolveEmbedConcurrency({}), 1);
  assert.equal(resolveEmbedConcurrency({ PRISM_EMBED_CONCURRENCY: "" }), 1);
});

test("resolveEmbedConcurrency: honors a valid env value", () => {
  assert.equal(resolveEmbedConcurrency({ PRISM_EMBED_CONCURRENCY: "16" }), 16);
});

test("resolveEmbedConcurrency: junk env → default (never an unbounded/0 burst)", () => {
  assert.equal(resolveEmbedConcurrency({ PRISM_EMBED_CONCURRENCY: "0" }), 1);
  assert.equal(resolveEmbedConcurrency({ PRISM_EMBED_CONCURRENCY: "-9" }), 1);
  assert.equal(resolveEmbedConcurrency({ PRISM_EMBED_CONCURRENCY: "nope" }), 1);
  assert.equal(resolveEmbedConcurrency({}, 4), 4);
});

// ── runEmbedPool: shape guards ───────────────────────────────────────────────
test("runEmbedPool: empty array → empty results, worker never called", async () => {
  let calls = 0;
  const out = await runEmbedPool([], async () => { calls++; });
  assert.deepEqual(out, []);
  assert.equal(calls, 0);
});

test("runEmbedPool: type guards", async () => {
  await assert.rejects(() => runEmbedPool("nope", async () => {}), /items must be an array/);
  await assert.rejects(() => runEmbedPool([], "nope"), /worker must be a function/);
});

// ── runEmbedPool: order preservation under out-of-order completion ───────────
test("runEmbedPool: results stay in input order even when workers finish out of order", async () => {
  const items = [0, 1, 2, 3, 4];
  // Earlier items sleep LONGER, so completion order is the reverse of input order.
  const out = await runEmbedPool(items, async (v) => { await tick((5 - v) * 4); return v * 10; }, { concurrency: 5 });
  assert.deepEqual(out, [0, 10, 20, 30, 40]);
});

// ── runEmbedPool: byte-identical at concurrency 1 ────────────────────────────
test("runEmbedPool: conc=1 processes strictly in order", async () => {
  const seen = [];
  const out = await runEmbedPool([10, 20, 30], async (v) => { seen.push(v); await tick(1); return v + 1; }, { concurrency: 1 });
  assert.deepEqual(seen, [10, 20, 30]);
  assert.deepEqual(out, [11, 21, 31]);
});

test("runEmbedPool: conc=1 first throw aborts BEFORE any later item starts", async () => {
  const started = [];
  await assert.rejects(
    () => runEmbedPool([0, 1, 2, 3, 4], async (v) => {
      started.push(v);
      if (v === 2) throw new Error("boom@2");
      await tick(1);
      return v;
    }, { concurrency: 1 }),
    /boom@2/,
  );
  // items 0,1 ran, 2 threw, 3 and 4 must NEVER have started (matches a plain for-loop + return)
  assert.deepEqual(started, [0, 1, 2]);
});

// ── runEmbedPool: abort-on-throw under concurrency ───────────────────────────
test("runEmbedPool: a throwing worker re-throws the first error and stops scheduling", async () => {
  const started = [];
  await assert.rejects(
    () => runEmbedPool([0, 1, 2, 3, 4, 5, 6, 7], async (v) => {
      started.push(v);
      await tick(2);
      if (v === 1) throw new Error("fail@1");
      return v;
    }, { concurrency: 2 }),
    /fail@1/,
  );
  // With conc=2, items 0 and 1 start; 1 throws → no NEW items scheduled. 0 may settle.
  // The tail (4,5,6,7) must not have started.
  assert.ok(!started.includes(6) && !started.includes(7), `tail leaked: ${started}`);
});

test("runEmbedPool: a worker that throws a falsy value (null) is still surfaced, not swallowed", async () => {
  // Guards the sentinel: `hasError` boolean, not `firstError != null`.
  await assert.rejects(
    () => runEmbedPool([0, 1, 2], async (v) => { if (v === 1) throw null; return v; }, { concurrency: 1 }),
    (err) => err === null,
  );
});

// ── runEmbedPool: tolerate-on-return (partial-tolerant callers) ──────────────
test("runEmbedPool: returning a failure sentinel never aborts the pool", async () => {
  const out = await runEmbedPool([0, 1, 2, 3], async (v) => {
    if (v === 1) return { ok: false, reason: "soft" };
    return { ok: true, v };
  }, { concurrency: 2 });
  assert.equal(out.length, 4);
  assert.deepEqual(out[1], { ok: false, reason: "soft" });
  assert.deepEqual(out[3], { ok: true, v: 3 });
  assert.equal(out.filter((r) => r.ok === false).length, 1);
});

// ── runEmbedPool: concurrency is actually bounded ────────────────────────────
test("runEmbedPool: never more than `concurrency` workers in flight", async () => {
  let active = 0, maxActive = 0;
  const items = Array.from({ length: 40 }, (_, i) => i);
  await runEmbedPool(items, async () => {
    active++; maxActive = Math.max(maxActive, active);
    await tick(3);
    active--;
  }, { concurrency: 8 });
  assert.ok(maxActive <= 8, `maxActive=${maxActive} exceeded 8`);
  assert.ok(maxActive >= 2, `pool did not actually parallelize (maxActive=${maxActive})`);
});

test("runEmbedPool: concurrency clamps to item count", async () => {
  let active = 0, maxActive = 0;
  await runEmbedPool([0, 1, 2], async () => {
    active++; maxActive = Math.max(maxActive, active);
    await tick(3);
    active--;
  }, { concurrency: 16 });
  assert.ok(maxActive <= 3, `maxActive=${maxActive} should clamp to 3 items`);
});
