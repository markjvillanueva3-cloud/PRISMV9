// Tests for the CAG hit-rate telemetry (U-CAG-HITRATE-TELEMETRY, slot:bravo 2026-06-14).
// Pure count math + fail-soft IO + the hermetic-by-derivation stats-file path. R9 intent-tests.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  bumpCagStat, summarizeCagStats, readCagStats, recordCagStat, cagStatsFileFor, CAG_STATS_FILE,
  MISS_REASONS, normalizeMissReasons, warmRateFields, untaggedMisses, snapshotLegacyBaseline,
} from "./galaxy-cag-cache.mjs";

test("bumpCagStat increments overall + per-galaxy (pure)", () => {
  let s = {};
  s = bumpCagStat(s, "mill", true);
  s = bumpCagStat(s, "mill", false);
  s = bumpCagStat(s, "lathe", true);
  assert.equal(s.hits, 2);
  assert.equal(s.misses, 1);
  // bumpCagStat now freezes a legacyUntaggedBaseline once per scope (0 for these fresh galaxies).
  assert.deepEqual(s.byGalaxy.mill, { hits: 1, misses: 1, legacyUntaggedBaseline: 0 });
  assert.deepEqual(s.byGalaxy.lathe, { hits: 1, misses: 0, legacyUntaggedBaseline: 0 });
});

test("bumpCagStat coerces blank/null galaxy to 'unknown'", () => {
  let s = bumpCagStat({}, "", true);
  s = bumpCagStat(s, null, false);
  assert.equal(s.byGalaxy.unknown.hits, 1);
  assert.equal(s.byGalaxy.unknown.misses, 1);
});

test("summarizeCagStats computes overall + per-galaxy hitRate", () => {
  const sum = summarizeCagStats({ hits: 3, misses: 1, byGalaxy: { mill: { hits: 3, misses: 1 } } });
  assert.equal(sum.total, 4);
  assert.equal(sum.hitRate, 0.75);
  assert.equal(sum.galaxies, 1);
  assert.equal(sum.byGalaxy.mill.hitRate, 0.75);
  assert.equal(sum.byGalaxy.mill.total, 4);
});

test("summarizeCagStats handles empty (no divide-by-zero)", () => {
  const sum = summarizeCagStats({});
  assert.equal(sum.total, 0);
  assert.equal(sum.hitRate, 0);
  assert.equal(sum.galaxies, 0);
  assert.deepEqual(sum.byGalaxy, {});
});

test("recordCagStat round-trips through a real file (IO + accumulation)", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cagstat-"));
  const file = path.join(dir, "s.json");
  recordCagStat("wedm", true, file);
  recordCagStat("wedm", false, file);
  recordCagStat("wedm", true, file);
  const sum = summarizeCagStats(readCagStats(file));
  assert.equal(sum.total, 3);
  assert.equal(sum.hits, 2);
  assert.equal(sum.byGalaxy.wedm.hitRate, 2 / 3);
  // schema + updatedAt stamped
  const raw = readCagStats(file);
  assert.ok(raw.schemaVersion);
  assert.ok(typeof raw.updatedAt === "string");
  fs.rmSync(dir, { recursive: true, force: true });
});

test("readCagStats is fail-soft on absent/corrupt -> fresh", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cagstat-"));
  assert.deepEqual(readCagStats(path.join(dir, "nope.json")), { hits: 0, misses: 0, byGalaxy: {} });
  const bad = path.join(dir, "bad.json");
  fs.writeFileSync(bad, "{not json");
  assert.deepEqual(readCagStats(bad), { hits: 0, misses: 0, byGalaxy: {} });
  fs.rmSync(dir, { recursive: true, force: true });
});

test("recordCagStat NEVER throws even on an unwritable path (fail-soft telemetry)", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cagstat-"));
  const notADir = path.join(dir, "afile");
  fs.writeFileSync(notADir, "x"); // parent is a FILE -> mkdir/write must fail and be swallowed
  assert.doesNotThrow(() => recordCagStat("mill", true, path.join(notADir, "stats.json")));
  fs.rmSync(dir, { recursive: true, force: true });
});

test("cagStatsFileFor derives a sibling stats file (hermetic-by-derivation)", () => {
  assert.equal(cagStatsFileFor("H:/prism/state/shared/cache/galaxy-reasoning-cag.json"),
    "H:/prism/state/shared/cache/cag-cache-stats.json");
  assert.equal(cagStatsFileFor("C:\\tmp\\x\\cag.json"), "C:\\tmp\\x\\cag-cache-stats.json");
  assert.equal(cagStatsFileFor(""), CAG_STATS_FILE);
  assert.equal(cagStatsFileFor(null), CAG_STATS_FILE);
});

test("R9 intent: a hit and a miss change the hitRate in the expected direction", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cagstat-"));
  const file = path.join(dir, "s.json");
  recordCagStat("cam", true, file);
  assert.equal(summarizeCagStats(readCagStats(file)).hitRate, 1);
  recordCagStat("cam", false, file);
  assert.equal(summarizeCagStats(readCagStats(file)).hitRate, 0.5);
  recordCagStat("cam", false, file);
  assert.equal(summarizeCagStats(readCagStats(file)).hitRate, 1 / 3);
  fs.rmSync(dir, { recursive: true, force: true });
});

// ─── U-CAG-HITRATE-HONESTY (slot:alpha 2026-06-15): miss-reason segmentation + warm hit-rate ───

test("MISS_REASONS is exactly the 3-bucket taxonomy and is frozen", () => {
  assert.deepEqual([...MISS_REASONS].sort(), ["error", "invalidated", "novel"]);
  assert.ok(Object.isFrozen(MISS_REASONS));
});

test("bumpCagStat buckets a reasoned miss overall AND per-galaxy", () => {
  let s = {};
  s = bumpCagStat(s, "mill", false, "novel");
  s = bumpCagStat(s, "mill", false, "invalidated");
  s = bumpCagStat(s, "lathe", false, "novel");
  assert.deepEqual(s.missReasons, { novel: 2, invalidated: 1 });
  assert.deepEqual(s.byGalaxy.mill.missReasons, { novel: 1, invalidated: 1 });
  assert.deepEqual(s.byGalaxy.lathe.missReasons, { novel: 1 });
  // overall miss count still increments regardless of reason
  assert.equal(s.misses, 3);
});

test("bumpCagStat: an UNKNOWN/absent reason is left UNbucketed (no silent miscount)", () => {
  let s = bumpCagStat({}, "mill", false, "bogus-reason");
  assert.equal(s.misses, 1);
  assert.equal(s.missReasons, undefined, "unknown reason must NOT create a bucket");
  // back-compat: legacy 3-arg miss (no reason) also stays unbucketed
  s = bumpCagStat(s, "mill", false);
  assert.equal(s.misses, 2);
  assert.equal(s.missReasons, undefined);
});

test("bumpCagStat: a HIT never touches the miss-reason buckets", () => {
  const s = bumpCagStat({}, "mill", true, "invalidated");
  assert.equal(s.hits, 1);
  assert.equal(s.missReasons, undefined);
});

test("normalizeMissReasons 0-fills the full shape + ignores junk/negatives", () => {
  assert.deepEqual(normalizeMissReasons(undefined), { novel: 0, invalidated: 0, error: 0 });
  assert.deepEqual(normalizeMissReasons({ novel: 5, junk: 9, invalidated: -3 }), { novel: 5, invalidated: 0, error: 0 });
  assert.deepEqual(normalizeMissReasons({ error: 2 }), { novel: 0, invalidated: 0, error: 2 });
});

test("warmRateFields: warm-rate over RECOVERABLE traffic (hits + invalidated)", () => {
  // 4 hits, 1 invalidated, 5 novel -> recoverable=5, warm=4/5=0.8; novel excluded from denom.
  const w = warmRateFields(4, 6, { novel: 5, invalidated: 1, error: 0 });
  assert.equal(w.warmHitRate, 0.8);
  assert.equal(w.addressableMisses, 1);
  assert.equal(w.coldMisses, 5);
  assert.equal(w.unclassifiedMisses, 0);
});

test("warmRateFields: a perfectly-warm cold-start substrate reads 100% warm, not low", () => {
  // The real-world case this unit exists for: 4 hits, 0 invalidations, all misses are novel cold.
  // Raw rate is low (4/42) but warm efficiency is PERFECT -> 1.0 (cache works; volume is the story).
  const w = warmRateFields(4, 38, { novel: 38, invalidated: 0, error: 0 });
  assert.equal(w.warmHitRate, 1);
  assert.equal(w.coldMisses, 38);
});

test("warmRateFields: warmHitRate is NULL (not 0) when misses are unclassified (legacy data)", () => {
  // The CURRENT production file: 4h/38m with NO reasons recorded -> split untrustworthy -> null.
  const w = warmRateFields(4, 38, { novel: 0, invalidated: 0, error: 0 });
  assert.equal(w.warmHitRate, null);
  assert.equal(w.unclassifiedMisses, 38);
});

// ---- legacy-untagged baseline quarantine (U-CAG-WARM-RATE-LEGACY-QUARANTINE) ----
test("untaggedMisses: misses minus classified buckets (floored at 0)", () => {
  assert.equal(untaggedMisses({ misses: 38, missReasons: { novel: 5 } }), 33);
  assert.equal(untaggedMisses({ misses: 7, missReasons: { novel: 3, invalidated: 4 } }), 0);
  assert.equal(untaggedMisses({ misses: 0 }), 0);
  assert.equal(untaggedMisses(null), 0);
});

test("warmRateFields: a frozen legacy baseline lets warm-rate COMPUTE over the post-instrumentation window", () => {
  // 38 pre-instrumentation untagged misses quarantined; 7 hits, 0 invalidated post-instrumentation.
  // unclassified = 38 - 0 - 38(baseline) = 0 -> warm = 7/(7+0) = 1.0 (the real live mill/lathe case).
  const w = warmRateFields(7, 38, { novel: 0, invalidated: 0, error: 0 }, 38);
  assert.equal(w.warmHitRate, 1);
  assert.equal(w.unclassifiedMisses, 0);
  assert.equal(w.legacyUntaggedBaseline, 38);
});

test("warmRateFields: a NEW untagged miss BEYOND the baseline still nulls warm-rate (un-instrumented caller not masked)", () => {
  // baseline 38, but misses=40 with 0 classified -> 40-0-38 = 2 untagged post-baseline -> null (honest).
  const w = warmRateFields(7, 40, { novel: 0, invalidated: 0, error: 0 }, 38);
  assert.equal(w.warmHitRate, null);
  assert.equal(w.unclassifiedMisses, 2);
});

test("snapshotLegacyBaseline: freezes untagged count once per scope; idempotent", () => {
  const s = { misses: 5, missReasons: { novel: 1 }, byGalaxy: { mill: { misses: 3, missReasons: {} }, cad: { misses: 2, missReasons: { novel: 2 } } } };
  snapshotLegacyBaseline(s);
  assert.equal(s.legacyUntaggedBaseline, 4);          // overall 5 - 1 classified
  assert.equal(s.byGalaxy.mill.legacyUntaggedBaseline, 3);  // all untagged
  assert.equal(s.byGalaxy.cad.legacyUntaggedBaseline, 0);   // all tagged
  s.misses = 99;                                       // mutate after snapshot
  snapshotLegacyBaseline(s);
  assert.equal(s.legacyUntaggedBaseline, 4);          // idempotent: NOT recomputed
});

test("bumpCagStat: snapshots the legacy baseline BEFORE the increment, so new tagged traffic keeps warm-rate computable", () => {
  const s = { hits: 0, misses: 38, byGalaxy: { mill: { hits: 0, misses: 38, missReasons: {} } } };
  bumpCagStat(s, "mill", false, "novel");             // first NEW (tagged) miss
  assert.equal(s.byGalaxy.mill.legacyUntaggedBaseline, 38);  // froze the pre-existing 38 untagged
  bumpCagStat(s, "mill", true);                        // a warm hit
  const sum = summarizeCagStats(s);
  // 1 hit, 40 misses (38 legacy + 1 novel + ... actually 39 misses: 38+1), baseline 38 -> 1 novel tagged
  // unclassified = 39 - 1(novel) - 38(baseline) = 0 -> warm computes (1 hit / 1 recoverable = 1.0)
  assert.equal(sum.byGalaxy.mill.unclassifiedMisses, 0);
  assert.equal(sum.byGalaxy.mill.warmHitRate, 1);
});

test("warmRateFields: warmHitRate is NULL when there is no warm traffic (every lookup a first-ask)", () => {
  // 0 hits, 3 novel, 0 invalidated, 0 unclassified -> recoverable 0 -> N/A, NOT a misleading 0%.
  const w = warmRateFields(0, 3, { novel: 3, invalidated: 0, error: 0 });
  assert.equal(w.warmHitRate, null);
  assert.equal(w.unclassifiedMisses, 0);
});

test("warmRateFields: invalidation churn drags the warm-rate down (the genuine problem signal)", () => {
  // 2 hits but 6 invalidations (doctrine churn wiping warm entries) -> warm = 2/8 = 0.25.
  const w = warmRateFields(2, 6, { novel: 0, invalidated: 6, error: 0 });
  assert.equal(w.warmHitRate, 0.25);
  assert.equal(w.addressableMisses, 6);
});

test("warmRateFields: an ERROR miss is classified (not unclassified) but NOT recoverable", () => {
  // error = a cache-layer fault: we KNOW why it missed (so it doesn't suppress warmHitRate to null),
  // but it is NOT a recoverable-by-cache-design miss (excluded from the warm denominator).
  // 2 hits, 1 invalidated, 1 error, 0 novel -> classified 2 == misses (no unclassified) ->
  // warm = 2 / (2 + 1 invalidated) = 2/3; error is neither numerator nor denominator.
  const w = warmRateFields(2, 2, { novel: 0, invalidated: 1, error: 1 });
  assert.equal(w.unclassifiedMisses, 0, "error counts toward classified -> no false unclassified");
  assert.equal(w.warmHitRate, 2 / 3, "error excluded from recoverable denominator");
  assert.equal(w.addressableMisses, 1);
});

test("warmRateFields: KEEP-IN-SYNC canonical fixture (mirrored by the sessionDispatcher e2e test)", () => {
  // The dispatcher duplicates this math (lib is outside the TS build). This pins the IDENTICAL
  // input the dispatcher's KEEP-IN-SYNC test asserts -> a divergence in either fails its own test.
  const w = warmRateFields(5, 11, { novel: 7, invalidated: 3, error: 1 });
  assert.equal(w.warmHitRate, 0.625);   // 5 / (5 + 3 invalidated); error counted-classified, not recoverable
  assert.equal(w.addressableMisses, 3);
  assert.equal(w.coldMisses, 7);
  assert.equal(w.unclassifiedMisses, 0);
  const g = warmRateFields(3, 5, { novel: 3, invalidated: 2, error: 0 });
  assert.equal(g.warmHitRate, 0.6);     // 3 / (3 + 2)
});

test("recordCagStat threads an ERROR reason (the bridge cache-fault path)", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cagstat-"));
  const file = path.join(dir, "s.json");
  recordCagStat("mill", false, file, "error");
  const sum = summarizeCagStats(readCagStats(file));
  assert.equal(sum.missReasons.error, 1);
  assert.equal(sum.byGalaxy.mill.missReasons.error, 1);
  assert.equal(sum.warmHitRate, null, "0 hits + 0 invalidated -> no warm traffic -> null");
  assert.equal(sum.unclassifiedMisses, 0, "an error miss is classified, not unclassified");
  fs.rmSync(dir, { recursive: true, force: true });
});

test("summarizeCagStats surfaces missReasons + warm fields overall AND per-galaxy", () => {
  const sum = summarizeCagStats({
    hits: 4, misses: 6,
    missReasons: { novel: 5, invalidated: 1 },
    byGalaxy: { mill: { hits: 4, misses: 6, missReasons: { novel: 5, invalidated: 1 } } },
  });
  assert.equal(sum.hitRate, 0.4);                       // raw rate unchanged contract
  assert.equal(sum.warmHitRate, 0.8);                   // 4 / (4 + 1)
  assert.deepEqual(sum.missReasons, { novel: 5, invalidated: 1, error: 0 });
  assert.equal(sum.addressableMisses, 1);
  assert.equal(sum.coldMisses, 5);
  assert.equal(sum.byGalaxy.mill.warmHitRate, 0.8);
  assert.equal(sum.byGalaxy.mill.addressableMisses, 1);
});

test("summarizeCagStats: legacy file (no missReasons) -> warmHitRate null, raw fields intact", () => {
  const sum = summarizeCagStats({ hits: 4, misses: 38, byGalaxy: { mill: { hits: 1, misses: 2 } } });
  assert.equal(sum.total, 42);
  assert.equal(sum.hitRate, 4 / 42);                    // existing contract preserved byte-for-byte
  assert.equal(sum.warmHitRate, null);                 // can't compute from untagged misses
  assert.equal(sum.unclassifiedMisses, 38);
  assert.deepEqual(sum.missReasons, { novel: 0, invalidated: 0, error: 0 });
});

test("recordCagStat threads the reason through a real file (IO round-trip)", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cagstat-"));
  const file = path.join(dir, "s.json");
  recordCagStat("wedm", true, file);                    // hit
  recordCagStat("wedm", false, file, "novel");          // cold miss
  recordCagStat("wedm", false, file, "invalidated");    // recoverable miss
  const sum = summarizeCagStats(readCagStats(file));
  assert.equal(sum.hits, 1);
  assert.equal(sum.misses, 2);
  assert.equal(sum.warmHitRate, 0.5);                   // 1 / (1 + 1 invalidated)
  assert.deepEqual(sum.missReasons, { novel: 1, invalidated: 1, error: 0 });
  assert.equal(sum.byGalaxy.wedm.coldMisses, 1);
  fs.rmSync(dir, { recursive: true, force: true });
});
