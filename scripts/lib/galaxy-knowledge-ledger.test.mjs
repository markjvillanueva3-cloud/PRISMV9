/**
 * Tests for galaxy-knowledge-ledger.mjs -- the deterministic saturation loss
 * function for the fleet knowledge-accretion loop. Run: node --test.
 *
 * The load-bearing invariant under test: a galaxy keeps iterating WHILE it finds
 * novel reputable sources, and only SATURATES at >= targetIterations AND
 * saturationConsecutive consecutive low-novelty iterations. These tests fail if
 * the saturation logic is weakened (e.g. saturating before the target, or not
 * resetting when new sources are found).
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { rmSync, writeFileSync, existsSync, utimesSync } from "node:fs";

import {
  SCHEMA_VERSION,
  DEFAULTS,
  sourceKey,
  initLedger,
  isSaturated,
  recordIteration,
  nextGalaxies,
  fleetDone,
  summary,
  loadLedger,
  saveLedger,
  withLock,
  lockedUpdate,
} from "./galaxy-knowledge-ledger.mjs";

const G = (n) => Array.from({ length: n }, (_, i) => ({ galaxy: `g${i}`, owner: `o${i}`, physics: i % 2 === 0 }));
const urls = (prefix, n) => Array.from({ length: n }, (_, i) => `https://example.edu/${prefix}/${i}`);

// ---- sourceKey normalization (dedup correctness underpins novelty) ----
test("sourceKey: collapses protocol + trailing slash + case + whitespace", () => {
  assert.equal(sourceKey("https://MIT.edu/course/2.008/"), "mit.edu/course/2.008");
  assert.equal(sourceKey("http://mit.edu/course/2.008"), "mit.edu/course/2.008");
  assert.equal(sourceKey("  https://mit.edu/course/2.008  "), "mit.edu/course/2.008");
  // http vs https vs trailing slash all collapse to ONE key
  assert.equal(sourceKey("https://x.org/a/"), sourceKey("http://x.org/a"));
});
test("sourceKey: null/empty -> empty string (adversarial)", () => {
  assert.equal(sourceKey(null), "");
  assert.equal(sourceKey(undefined), "");
  assert.equal(sourceKey(""), "");
  assert.equal(sourceKey("   "), "");
});

// ---- initLedger ----
test("initLedger: builds a fresh ledger, all galaxies at iteration 0, unsaturated", () => {
  const l = initLedger(G(34));
  assert.equal(l.schemaVersion, SCHEMA_VERSION);
  assert.equal(Object.keys(l.galaxies).length, 34);
  assert.equal(l.config.targetIterations, DEFAULTS.targetIterations);
  assert.equal(l.config.maxIterations, DEFAULTS.maxIterations);
  for (const e of Object.values(l.galaxies)) {
    assert.equal(e.iterations, 0);
    assert.equal(e.saturated, false);
    assert.deepEqual(e.sourceKeys, []);
  }
  assert.equal(l.galaxies.g0.physics, true);
  assert.equal(l.galaxies.g1.physics, false);
});
test("initLedger: empty array throws (failure mode)", () => {
  assert.throws(() => initLedger([]), /non-empty/);
});
test("initLedger: duplicate galaxy throws (failure mode)", () => {
  assert.throws(() => initLedger([{ galaxy: "a" }, { galaxy: "a" }]), /duplicate/);
});

// ---- novelty accounting ----
test("recordIteration: counts only NEW sources as novelty; re-cites never re-count", () => {
  const l = initLedger([{ galaxy: "a" }]);
  recordIteration(l, "a", { sources: urls("p", 5) }); // 5 new
  assert.equal(l.galaxies.a.totalNewSources, 5);
  assert.equal(l.galaxies.a.history[0].newSources, 5);
  // re-cite the SAME 5 -> 0 novelty even though 5 cited
  recordIteration(l, "a", { sources: urls("p", 5) });
  assert.equal(l.galaxies.a.totalNewSources, 5);
  assert.equal(l.galaxies.a.history[1].newSources, 0);
  assert.equal(l.galaxies.a.history[1].citedSources, 5);
});
test("recordIteration: unknown galaxy throws (failure mode)", () => {
  const l = initLedger([{ galaxy: "a" }]);
  assert.throws(() => recordIteration(l, "nope", { sources: [] }), /unknown galaxy/);
});

// ---- THE LOSS FUNCTION: saturation gate ----
test("saturation: NOT saturated before target even with sustained low novelty", () => {
  const l = initLedger([{ galaxy: "a" }]); // target 10, threshold 2, consec 2
  // 9 low-novelty iterations (0 new each) -> iterations=9, consecutiveLowNovelty=9
  for (let i = 0; i < 9; i++) recordIteration(l, "a", { sources: [] });
  assert.equal(l.galaxies.a.iterations, 9);
  assert.equal(l.galaxies.a.consecutiveLowNovelty, 9);
  // below target -> MUST NOT be saturated (the >=10 gate)
  assert.equal(isSaturated(l, "a"), false);
  assert.equal(l.galaxies.a.saturated, false);
});
test("saturation: saturates exactly at target with sustained low novelty", () => {
  const l = initLedger([{ galaxy: "a" }]);
  for (let i = 0; i < 8; i++) recordIteration(l, "a", { sources: urls(`hi${i}`, 5) }); // 8 high-novelty
  assert.equal(l.galaxies.a.consecutiveLowNovelty, 0);
  recordIteration(l, "a", { sources: [] }); // iter 9 low -> consec 1, iter<10 not sat
  assert.equal(isSaturated(l, "a"), false);
  recordIteration(l, "a", { sources: [] }); // iter 10 low -> consec 2, iter>=10 -> SATURATED
  assert.equal(l.galaxies.a.iterations, 10);
  assert.equal(isSaturated(l, "a"), true);
  assert.equal(l.galaxies.a.saturated, true);
});
test("saturation: finding NEW sources RESETS the counter (keep extracting while sources exist)", () => {
  const l = initLedger([{ galaxy: "a" }]);
  for (let i = 0; i < 9; i++) recordIteration(l, "a", { sources: urls(`hi${i}`, 5) }); // iter 9, consec 0
  recordIteration(l, "a", { sources: [] }); // iter 10 low -> consec 1, NOT sat (need 2)
  assert.equal(isSaturated(l, "a"), false);
  recordIteration(l, "a", { sources: urls("fresh", 5) }); // iter 11 HIGH -> consec RESET to 0
  assert.equal(l.galaxies.a.consecutiveLowNovelty, 0);
  assert.equal(isSaturated(l, "a"), false); // still extracting -> not saturated
  recordIteration(l, "a", { sources: [] }); // iter 12 low -> consec 1
  assert.equal(isSaturated(l, "a"), false);
  recordIteration(l, "a", { sources: [] }); // iter 13 low -> consec 2 -> saturated
  assert.equal(isSaturated(l, "a"), true);
});
test("saturation: novelty exactly AT threshold is NOT low (boundary, adversarial)", () => {
  const l = initLedger([{ galaxy: "a" }]);
  for (let i = 0; i < 10; i++) recordIteration(l, "a", { sources: urls(`hi${i}`, 5) }); // iter 10, consec 0
  recordIteration(l, "a", { sources: [] }); // consec 1
  // exactly noveltyThreshold (2) new -> NOT low -> resets
  recordIteration(l, "a", { sources: urls("exact", 2) });
  assert.equal(l.galaxies.a.consecutiveLowNovelty, 0);
  assert.equal(isSaturated(l, "a"), false);
});
test("isSaturated: unknown galaxy throws (failure mode)", () => {
  const l = initLedger([{ galaxy: "a" }]);
  assert.throws(() => isSaturated(l, "x"), /unknown galaxy/);
});
test("saturation: hard maxIterations ceiling fires even under SUSTAINED high novelty (anti-gaming)", () => {
  // A model hallucinating fresh-looking citations every iteration keeps novelty high forever and
  // would reset the low-novelty streak indefinitely -> the novelty rule alone never saturates.
  // The maxIterations ceiling guarantees physical termination regardless.
  const l = initLedger([{ galaxy: "a" }]); // maxIterations 30
  for (let i = 0; i < 29; i++) recordIteration(l, "a", { sources: urls(`hi${i}`, 5) }); // all high-novelty
  assert.equal(l.galaxies.a.consecutiveLowNovelty, 0); // novelty rule NEVER trips
  assert.equal(isSaturated(l, "a"), false); // 29 < 30 ceiling
  recordIteration(l, "a", { sources: urls("hi29", 5) }); // iter 30 -> ceiling
  assert.equal(l.galaxies.a.consecutiveLowNovelty, 0);
  assert.equal(isSaturated(l, "a"), true); // saturated by the hard ceiling, not by novelty
});
test("scheduling uses computeSaturated, NOT the cached e.saturated flag (single source of truth)", () => {
  const l = initLedger([{ galaxy: "a" }, { galaxy: "b" }]);
  for (let i = 0; i < 12; i++) recordIteration(l, "a", { sources: [] }); // a truly saturated
  assert.equal(isSaturated(l, "a"), true);
  // Corrupt the CACHED flags to the wrong values; nextGalaxies/fleetDone must ignore them.
  l.galaxies.a.saturated = false; // stale-WRONG (says open, but it's saturated)
  l.galaxies.b.saturated = true; // stale-WRONG (says saturated, but b has 0 iters)
  const open = nextGalaxies(l, 5).map((e) => e.galaxy);
  assert.ok(!open.includes("a")); // a excluded despite cached false
  assert.ok(open.includes("b")); // b included despite cached true
  assert.equal(fleetDone(l), false); // b is genuinely not saturated
});

// ---- scheduling + fleet termination ----
test("nextGalaxies: least-iterated, non-saturated first; excludes saturated", () => {
  const l = initLedger([{ galaxy: "a" }, { galaxy: "b" }, { galaxy: "c" }]);
  recordIteration(l, "a", { sources: urls("a", 3) }); // a:1
  recordIteration(l, "b", { sources: urls("b", 3) });
  recordIteration(l, "b", { sources: urls("b2", 3) }); // b:2
  const nxt = nextGalaxies(l, 2).map((e) => e.galaxy);
  assert.deepEqual(nxt, ["c", "a"]); // c(0) then a(1), b(2) last
  // saturate c, confirm it drops out
  for (let i = 0; i < 12; i++) recordIteration(l, "c", { sources: [] });
  assert.equal(isSaturated(l, "c"), true);
  assert.ok(!nextGalaxies(l, 3).some((e) => e.galaxy === "c"));
});
test("fleetDone: false until every galaxy saturated, then true", () => {
  const l = initLedger([{ galaxy: "a" }, { galaxy: "b" }]);
  assert.equal(fleetDone(l), false);
  for (const g of ["a", "b"]) for (let i = 0; i < 12; i++) recordIteration(l, g, { sources: [] });
  assert.equal(fleetDone(l), true);
  assert.equal(summary(l).saturated, 2);
});

// ---- persistence: FAIL LOUD, never clobber ----
test("loadLedger: missing file -> null; round-trips a saved ledger", () => {
  const p = join(tmpdir(), `gkl-${process.pid}-${Math.floor(performance.now())}.json`);
  try {
    assert.equal(loadLedger(p), null);
    const l = initLedger([{ galaxy: "a" }, { galaxy: "b" }]);
    recordIteration(l, "a", { sources: urls("a", 4), at: "2026-06-14T00:00:00Z" });
    saveLedger(p, l, "2026-06-14T00:00:00Z");
    const back = loadLedger(p);
    assert.equal(back.galaxies.a.iterations, 1);
    assert.equal(back.galaxies.a.totalNewSources, 4);
    assert.equal(back.updatedAt, "2026-06-14T00:00:00Z");
  } finally {
    rmSync(p, { force: true });
  }
});
test("loadLedger: corrupt existing ledger THROWS (never clobbers) -- the fail-loud invariant", () => {
  const p = join(tmpdir(), `gkl-corrupt-${process.pid}.json`);
  try {
    writeFileSync(p, "{ not valid json", "utf8");
    assert.throws(() => loadLedger(p), /corrupt/);
    // present-but-missing-galaxies also fails loud
    writeFileSync(p, JSON.stringify({ schemaVersion: "1.0.0" }), "utf8");
    assert.throws(() => loadLedger(p), /missing 'galaxies'/);
  } finally {
    rmSync(p, { force: true });
  }
});
test("saveLedger: refuses a ledger with no galaxies (failure mode)", () => {
  const p = join(tmpdir(), `gkl-empty-${process.pid}.json`);
  assert.throws(() => saveLedger(p, { schemaVersion: "1.0.0" }), /no galaxies/);
});

// ---- lock: serialize cron-vs-manual writes, never lose an update (scrutiny P1) ----
test("lockedUpdate: RELOADS fresh before mutate (no lost update) + releases the lock", () => {
  const p = join(tmpdir(), `gkl-lock-${process.pid}.json`);
  const lock = `${p}.lock`;
  try {
    // seed an on-disk ledger with 'a' already at iter 5
    const seed = initLedger([{ galaxy: "a" }]);
    for (let i = 0; i < 5; i++) recordIteration(seed, "a", { sources: urls(`s${i}`, 3) });
    saveLedger(p, seed);
    // a STALE in-memory ledger (iter 0) must NOT be what gets written; lockedUpdate reloads disk (iter 5)
    const res = lockedUpdate(p, (fresh) => {
      recordIteration(fresh, "a", { sources: urls("new", 3) });
      return fresh.galaxies.a.iterations;
    }, { galaxies: [{ galaxy: "a" }] });
    assert.equal(res, 6); // built on the on-disk 5 -> 6, proving reload-fresh (not a stale 0 -> 1)
    assert.equal(loadLedger(p).galaxies.a.iterations, 6);
    assert.equal(existsSync(lock), false); // lock released in finally
  } finally {
    rmSync(p, { force: true });
    rmSync(lock, { force: true });
  }
});
test("withLock: reclaims a STALE lock (orphaned holder) instead of hanging (failure mode)", () => {
  const p = join(tmpdir(), `gkl-stale-${process.pid}.json`);
  const lock = `${p}.lock`;
  try {
    writeFileSync(lock, "", "utf8");
    const old = (Date.now() - 20 * 60 * 1000) / 1000; // 20 min ago > 10 min stale threshold
    utimesSync(lock, old, old);
    let ran = false;
    withLock(p, () => { ran = true; }, { retries: 2, intervalMs: 10 });
    assert.equal(ran, true); // reclaimed the stale lock and ran rather than throwing/hanging
    assert.equal(existsSync(lock), false);
  } finally {
    rmSync(p, { force: true });
    rmSync(lock, { force: true });
  }
});
