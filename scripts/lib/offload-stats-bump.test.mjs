// scripts/lib/offload-stats-bump.test.mjs
// U-OFFLOAD-STATS-BUMP-DEDUP (2026-06-24, slot:alpha): the shared atomic-RMW envelope
// extracted from 4 byte-identical offload-stats writers. These tests pin the EXACT
// telemetry contract every original guaranteed -- never-create, never-throw, atomic
// write, falsy-only bucket re-init, non-negative saved floor (R9: a test that fails if
// any of those invariants regresses). Hermetic: tmp fixtures, sync, NO network.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, existsSync, rmSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { atomicOffloadStatsRMW, ensureOffloadBucket, clampSaved } from "./offload-stats-bump.mjs";

function tmpStats(initObjOrString) {
  const dir = mkdtempSync(join(tmpdir(), "osb-"));
  const p = join(dir, "ollama-offload-stats.json");
  const body = typeof initObjOrString === "string" ? initObjOrString : JSON.stringify(initObjOrString, null, 2);
  writeFileSync(p, body);
  return { p, dir };
}

// ---- atomicOffloadStatsRMW (the fail-safe envelope) ----
test("atomicOffloadStatsRMW: happy path -- runs mutate, stamps lastUpdated, writes, returns true", () => {
  const { p, dir } = tmpStats({ byHook: {}, executedOffloads: 3 });
  try {
    const ok = atomicOffloadStatsRMW(p, (stats) => { stats.byHook.demo = { offloaded: 1 }; });
    assert.equal(ok, true);
    const after = JSON.parse(readFileSync(p, "utf8"));
    assert.equal(after.byHook.demo.offloaded, 1);
    assert.equal(after.executedOffloads, 3, "untouched fields survive");
    assert.equal(typeof after.lastUpdated, "string");
    assert.ok(after.lastUpdated.length > 0);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("atomicOffloadStatsRMW: MISSING file -> false, never creates a parallel store", () => {
  const missing = join(tmpdir(), `osb-missing-${process.pid}-${process.hrtime.bigint()}.json`);
  let called = false;
  const ok = atomicOffloadStatsRMW(missing, () => { called = true; });
  assert.equal(ok, false);
  assert.equal(called, false, "mutate is never invoked when the file is absent");
  assert.equal(existsSync(missing), false);
});

test("atomicOffloadStatsRMW: garbage (non-JSON) file -> false, file left as-is, never throws", () => {
  const { p, dir } = tmpStats("not json {{{");
  try {
    const ok = atomicOffloadStatsRMW(p, (stats) => { stats.x = 1; });
    assert.equal(ok, false);
    assert.equal(readFileSync(p, "utf8"), "not json {{{", "garbage file is not overwritten");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("atomicOffloadStatsRMW: JSON primitive/null (typeof guard) -> false", () => {
  for (const prim of ["5", "null", "\"a string\"", "true"]) {
    const { p, dir } = tmpStats(prim);
    try {
      assert.equal(atomicOffloadStatsRMW(p, () => {}), false, `primitive ${prim} rejected`);
    } finally { rmSync(dir, { recursive: true, force: true }); }
  }
});

test("atomicOffloadStatsRMW: a mutate that THROWS -> false, file UNCHANGED (no partial write), never throws", () => {
  const { p, dir } = tmpStats({ byHook: { keep: { offloaded: 9 } } });
  try {
    const ok = atomicOffloadStatsRMW(p, (stats) => { stats.byHook.keep.offloaded = 99; throw new Error("boom after mutate"); });
    assert.equal(ok, false);
    const after = JSON.parse(readFileSync(p, "utf8"));
    assert.equal(after.byHook.keep.offloaded, 9, "the in-place partial mutation is discarded (never written)");
    assert.equal(after.lastUpdated, undefined, "lastUpdated not stamped on a throw");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("atomicOffloadStatsRMW: non-function mutate -> false, no write", () => {
  const { p, dir } = tmpStats({ byHook: {} });
  try {
    assert.equal(atomicOffloadStatsRMW(p, undefined), false);
    assert.equal(JSON.parse(readFileSync(p, "utf8")).lastUpdated, undefined);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("atomicOffloadStatsRMW: written file is valid JSON (atomic round-trip)", () => {
  const { p, dir } = tmpStats({ byHook: {} });
  try {
    atomicOffloadStatsRMW(p, (stats) => { stats.byHook.a = { offloaded: 1 }; });
    // throws if the on-disk content is torn / not valid JSON
    const re = JSON.parse(readFileSync(p, "utf8"));
    assert.equal(re.byHook.a.offloaded, 1);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

// ---- ensureOffloadBucket ----
test("ensureOffloadBucket: inits byHook + canonical bucket shape when absent", () => {
  const stats = {};
  const h = ensureOffloadBucket(stats, "k");
  assert.deepEqual(h, { fired: 0, offloaded: 0, kept: 0, suggested: 0, tokensSaved: 0 });
  assert.equal(stats.byHook.k, h);
});

test("ensureOffloadBucket: an EXISTING bucket is returned as-is, never reset (accumulation preserved)", () => {
  const stats = { byHook: { k: { fired: 4, offloaded: 4, kept: 0, suggested: 0, tokensSaved: 100 } } };
  const h = ensureOffloadBucket(stats, "k");
  assert.equal(h.offloaded, 4);
  assert.equal(h.tokensSaved, 100);
});

test("ensureOffloadBucket: withByMode adds byMode:{} without clobbering an existing one", () => {
  const fresh = {};
  assert.deepEqual(ensureOffloadBucket(fresh, "k", { withByMode: true }).byMode, {});
  const existing = { byHook: { k: { fired: 1, offloaded: 1, kept: 0, suggested: 0, tokensSaved: 0, byMode: { classify: 2 } } } };
  assert.deepEqual(ensureOffloadBucket(existing, "k", { withByMode: true }).byMode, { classify: 2 });
});

test("ensureOffloadBucket: adds a new key without disturbing sibling buckets", () => {
  const stats = { byHook: { other: { offloaded: 7 } } };
  ensureOffloadBucket(stats, "k");
  assert.equal(stats.byHook.other.offloaded, 7);
  assert.equal(stats.byHook.k.offloaded, 0);
});

test("ensureOffloadBucket: a CORRUPT non-object byHook is re-initialized (hardening vs the advisory originals' falsy-only guard)", () => {
  // The advisory originals used `j.byHook = j.byHook || {}` (falsy-only) -> a corrupt truthy
  // non-object byHook would survive and then throw on property-set in strict mode. ensureOffloadBucket
  // reinits it. This test fails if the typeof-guard is ever reverted to falsy-only.
  const stats = { byHook: "corrupted-not-an-object" };
  const h = ensureOffloadBucket(stats, "k");
  assert.equal(typeof stats.byHook, "object");
  assert.deepEqual(h, { fired: 0, offloaded: 0, kept: 0, suggested: 0, tokensSaved: 0 });
});

test("atomicOffloadStatsRMW: recovers a corrupt non-object byHook and still writes; unrelated top-level fields survive", () => {
  const { p, dir } = tmpStats({ byHook: 42, executedOffloads: 5 });
  try {
    const ok = atomicOffloadStatsRMW(p, (stats) => {
      const h = ensureOffloadBucket(stats, "k");
      h.offloaded = (h.offloaded | 0) + 1;
    });
    assert.equal(ok, true);
    const after = JSON.parse(readFileSync(p, "utf8"));
    assert.equal(typeof after.byHook, "object");
    assert.equal(after.byHook.k.offloaded, 1);
    assert.equal(after.executedOffloads, 5, "byHook recovery does not clobber unrelated top-level fields");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

// ---- clampSaved ----
test("clampSaved: rounds, floors negatives/NaN/garbage to 0", () => {
  assert.equal(clampSaved(320), 320);
  assert.equal(clampSaved(12.6), 13);
  assert.equal(clampSaved(-500), 0);
  assert.equal(clampSaved(NaN), 0);
  assert.equal(clampSaved("abc"), 0);
  assert.equal(clampSaved(undefined), 0);
  assert.equal(clampSaved("42"), 42);
});
