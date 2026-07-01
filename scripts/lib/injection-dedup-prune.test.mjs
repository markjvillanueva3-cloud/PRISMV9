// injection-dedup-prune.test.mjs
// -------------------------------
// Tests pruneTag(cache, hookTag, now, ttlMs) -- the SHARED-CACHE-SAFE prune that
// fixes the tag-agnostic pruneExpired fleet bug: the shared
// state/shared/dashboards/injection-dedup-cache.json is written back by ~10
// evictor hooks with TTLs 5min..24h, and the old pruneExpired (called with the
// CURRENT hook's TTL) silently evicted a longer-TTL sibling's still-live entries.
//
// R9: every test fails if the per-tag isolation breaks. The keystone is the
// cross-hook contrast test (pruneExpired WOULD evict, pruneTag does NOT).
// Run: node H:/prism/scripts/lib/injection-dedup-prune.test.mjs

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { pruneTag, pruneExpired } from "./injection-dedup.mjs";

const T0 = 1_000_000_000;
const FIVE_MIN = 5 * 60_000;       // 300_000  -- audit-viz / slot-domain / slot-soul / psn-leg-state
const ONE_HOUR = 60 * 60_000;      // 3_600_000
const ONE_DAY = 24 * 60 * 60_000;  // 86_400_000 -- pre-*-graph-inject / psn-prompt-checklist

const AUDIT = "audit-viz-first:sess0001";   // 5min hook
const GRAPH = "pre-bash-graph:sess0001";    // 24h hook (the high-value sibling)

describe("pruneTag -- happy path", () => {
  test("prunes its OWN tag's expired entry (and drops the now-empty tag)", () => {
    const cache = { [AUDIT]: { h1: { lastSeenAt: T0 } } };
    const now = T0 + FIVE_MIN + 1; // 1ms past the 5min TTL
    const out = pruneTag(cache, AUDIT, now, FIVE_MIN);
    assert.ok(!(AUDIT in out), "expired own entry -> tag removed");
  });

  test("keeps its OWN tag's still-live entry", () => {
    const cache = { [AUDIT]: { h1: { lastSeenAt: T0 } } };
    const now = T0 + FIVE_MIN - 1; // 1ms inside the TTL
    const out = pruneTag(cache, AUDIT, now, FIVE_MIN);
    assert.deepEqual(out[AUDIT], { h1: { lastSeenAt: T0 } }, "live own entry kept");
  });

  test("preserves a FOREIGN tag's bucket byte-identical (even if foreign entries are old by the caller's TTL)", () => {
    const cache = {
      [AUDIT]: { h1: { lastSeenAt: T0 } },
      [GRAPH]: { h2: { lastSeenAt: T0 } },
    };
    const now = T0 + ONE_HOUR; // 1h old: expired by 5min, NOT by 24h
    const out = pruneTag(cache, AUDIT, now, FIVE_MIN);
    // audit (own) is 1h old vs 5min TTL -> pruned; graph (foreign) untouched
    assert.ok(!(AUDIT in out), "own 1h-old entry pruned at 5min TTL");
    assert.deepEqual(out[GRAPH], { h2: { lastSeenAt: T0 } }, "foreign 24h tag preserved verbatim");
  });
});

describe("pruneTag -- the fleet bug it fixes (cross-hook eviction contrast)", () => {
  // THE regression lock: a 5min hook's prune-and-write-back must NOT destroy a
  // 24h sibling's 1h-old (still-live) entry. The old pruneExpired DID; pruneTag must not.
  test("pruneExpired (old, tag-agnostic) WOULD evict the 24h sibling -- documents the bug", () => {
    const cache = {
      [AUDIT]: { h1: { lastSeenAt: T0 } },
      [GRAPH]: { h2: { lastSeenAt: T0 } },
    };
    const now = T0 + ONE_HOUR;
    const old = pruneExpired(cache, now, FIVE_MIN); // audit-viz pruning with ITS 5min TTL
    assert.ok(!(GRAPH in old), "BUG: tag-agnostic pruneExpired drops the live 24h sibling");
  });

  test("pruneTag (fix) leaves the 24h sibling's live entry intact", () => {
    const cache = {
      [AUDIT]: { h1: { lastSeenAt: T0 } },
      [GRAPH]: { h2: { lastSeenAt: T0 } },
    };
    const now = T0 + ONE_HOUR;
    const fixed = pruneTag(cache, AUDIT, now, FIVE_MIN);
    assert.deepEqual(fixed[GRAPH], { h2: { lastSeenAt: T0 } }, "FIX: foreign 24h sibling survives a 5min prune");
  });

  test("the 24h hook later prunes its OWN tag on its OWN schedule (no foreign tag harmed)", () => {
    const cache = {
      [AUDIT]: { h1: { lastSeenAt: T0 } },
      [GRAPH]: { hOld: { lastSeenAt: T0 }, hNew: { lastSeenAt: T0 + ONE_DAY - 1 } },
    };
    const now = T0 + ONE_DAY + 1; // hOld is >24h, hNew is <24h
    const out = pruneTag(cache, GRAPH, now, ONE_DAY);
    assert.deepEqual(Object.keys(out[GRAPH]), ["hNew"], "only GRAPH's own expired entry dropped");
    assert.ok(AUDIT in out, "AUDIT tag untouched by GRAPH's prune");
  });
});

describe("pruneTag -- edge cases", () => {
  test("null / non-object cache -> {}", () => {
    assert.deepEqual(pruneTag(null, AUDIT, T0, FIVE_MIN), {});
    assert.deepEqual(pruneTag("nope", AUDIT, T0, FIVE_MIN), {});
    assert.deepEqual(pruneTag(undefined, AUDIT, T0, FIVE_MIN), {});
  });

  test("falsy hookTag -> cache returned unchanged (NEVER touch foreign tags)", () => {
    const cache = { [AUDIT]: { h1: { lastSeenAt: T0 } } };
    assert.equal(pruneTag(cache, "", T0 + ONE_DAY, FIVE_MIN), cache, "empty tag -> same ref, no eviction");
    assert.equal(pruneTag(cache, null, T0 + ONE_DAY, FIVE_MIN), cache, "null tag -> same ref");
  });

  test("absent tag -> cache returned unchanged (nothing of ours to prune)", () => {
    const cache = { [AUDIT]: { h1: { lastSeenAt: T0 } } };
    assert.equal(pruneTag(cache, "no-such-tag:xyz", T0, FIVE_MIN), cache, "absent tag -> same ref");
  });
});

describe("pruneTag -- adversarial", () => {
  test("does NOT mutate the input cache (immutability; input keeps its own pre-prune state)", () => {
    const cache = {
      [AUDIT]: { h1: { lastSeenAt: T0 } },
      [GRAPH]: { h2: { lastSeenAt: T0 } },
    };
    const now = T0 + ONE_HOUR;
    const out = pruneTag(cache, AUDIT, now, FIVE_MIN);
    // input untouched: AUDIT still present on the ORIGINAL ref
    assert.deepEqual(cache[AUDIT], { h1: { lastSeenAt: T0 } }, "input cache not mutated");
    assert.notEqual(out, cache, "returns a NEW object when it prunes");
    // foreign bucket shared by reference is fine (never mutated): same value, identity preserved
    assert.equal(out[GRAPH], cache[GRAPH], "foreign bucket carried by reference, unmodified");
  });

  test("a prototype-named tag that is NOT an own key is treated as absent (no proto pollution / no crash)", () => {
    const cache = { [AUDIT]: { h1: { lastSeenAt: T0 } } };
    // cache.constructor resolves to Object.prototype.constructor (a function, typeof !== 'object')
    const out = pruneTag(cache, "constructor", T0, FIVE_MIN);
    assert.equal(out, cache, "inherited proto key -> absent -> same ref, no throw");
    assert.ok(AUDIT in out, "real tag untouched");
  });

  test("ttlMs=0 prunes nothing for the tag is NOT assumed -- 0 means 'age >= 0' so all entries drop (explicit)", () => {
    // documents the boundary: with ttlMs=0 every entry has age >= 0 -> expired -> tag removed.
    // (callers never pass 0 to a prune; shouldEmit treats ttl=0 as 'always emit'. This pins behavior.)
    const cache = { [AUDIT]: { h1: { lastSeenAt: T0 } } };
    const out = pruneTag(cache, AUDIT, T0, 0);
    assert.ok(!(AUDIT in out), "ttl=0 -> age(0) >= 0 -> entry expired -> tag dropped");
  });
});
