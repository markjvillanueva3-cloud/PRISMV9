// injection-dedup-wrapper-crosstag.test.mjs
// -----------------------------------------
// Regression lock for the pruneTag fix at the WRAPPER level (slot:alpha, 2026-06-20).
// Both shared-cache wrappers -- dedupeOrMarker (injection-dedup-fs.mjs, ~5 hooks) and
// dedupedContext (injection-dedup-emit.mjs, ~9 hooks) -- read+prune+write-back the SAME
// shared sidecar (state/shared/dashboards/injection-dedup-cache.json). The old
// tag-agnostic pruneExpired let a SHORT-TTL caller evict a still-live LONGER-TTL sibling's
// entry on write-back (a dedup MISS = wasted tokens). pruneTag prunes only the caller's tag.
//
// Each test below FAILS on the old pruneExpired (the 24h sibling gets evicted by the 5min
// caller -> step 3 re-emits the full block) and PASSES on pruneTag (sibling survives -> marker).
// Both wrappers expose an injectable `now` so the TTL-difference is deterministic (no wall clock).
// Run: node H:/prism/scripts/lib/injection-dedup-wrapper-crosstag.test.mjs

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { dedupeOrMarker } from "./injection-dedup-fs.mjs";
import { dedupedContext } from "./injection-dedup-emit.mjs";

const FIVE_MIN = 5 * 60_000;
const ONE_DAY = 24 * 60 * 60_000;
const T0 = 1_000_000;
const SID = "cccc3333";
const isMarker = (s) => typeof s === "string" && s.includes("dedup");

// In-memory fs double for dedupeOrMarker (mirrors the harness in injection-dedup-fs.test.mjs).
function memFs(initial = {}) {
  const store = { ...initial };
  return {
    store,
    readFileSync: (p) => { if (!(p in store)) { const e = new Error("ENOENT"); e.code = "ENOENT"; throw e; } return store[p]; },
    writeFileSync: (p, c) => { store[p] = c; },
    mkdirSync: () => {},
  };
}

describe("dedupeOrMarker (fs wrapper) -- cross-tag preservation", () => {
  test("a 5min hook's prune does NOT evict a still-live 24h sibling (FAILS on old pruneExpired)", () => {
    const fs = memFs();
    const base = { sessionId: SID, root: "R", fsImpl: fs };
    // 1) a 24h-TTL sibling records its entry at T0
    const first = dedupeOrMarker("LONG-LIVED-BLOCK", { ...base, hookName: "graph-hook", ttlMs: ONE_DAY, now: T0 });
    assert.equal(first, "LONG-LIVED-BLOCK", "sibling first-emit");
    // 2) 10min later a 5min-TTL hook emits+prunes with ITS short ttl (sibling is 10min old: expired by 5min, live by 24h)
    dedupeOrMarker("SHORT-BLOCK", { ...base, hookName: "short-hook", ttlMs: FIVE_MIN, now: T0 + 10 * 60_000 });
    // 3) 11min in, the 24h sibling re-emits the SAME block: still within its 24h TTL
    const again = dedupeOrMarker("LONG-LIVED-BLOCK", { ...base, hookName: "graph-hook", ttlMs: ONE_DAY, now: T0 + 11 * 60_000 });
    assert.ok(isMarker(again), "24h sibling survived the 5min hook's prune -> dedup marker");
    assert.ok(!again.includes("LONG-LIVED-BLOCK"), "NOT a full re-emit (would be the bug)");
  });

  test("the short hook still dedups its OWN tag normally (fix does not break same-tag dedup)", () => {
    const fs = memFs();
    const base = { sessionId: SID, root: "R", fsImpl: fs, hookName: "short-hook", ttlMs: FIVE_MIN };
    assert.equal(dedupeOrMarker("S", { ...base, now: T0 }), "S", "first emit");
    assert.ok(isMarker(dedupeOrMarker("S", { ...base, now: T0 + 60_000 })), "same tag within TTL -> marker");
  });
});

describe("dedupedContext (emit wrapper) -- cross-tag preservation", () => {
  function tmpSidecar() {
    const dir = mkdtempSync(join(tmpdir(), "dedup-xtag-"));
    return { dir, path: join(dir, "cache.json") };
  }

  test("a 5min hook's prune does NOT evict a still-live 24h sibling (FAILS on old pruneExpired)", () => {
    const { dir, path } = tmpSidecar();
    try {
      // 1) 24h sibling records at T0
      const first = dedupedContext("graph-hook", "LONG-LIVED-BLOCK", SID, { sidecar: path, ttlMs: ONE_DAY, now: T0 });
      assert.equal(first, "LONG-LIVED-BLOCK", "sibling first-emit");
      // 2) 10min later a 5min hook emits+prunes the SAME shared sidecar with its short ttl
      dedupedContext("short-hook", "SHORT-BLOCK", SID, { sidecar: path, ttlMs: FIVE_MIN, now: T0 + 10 * 60_000 });
      // 3) 11min: 24h sibling re-emits same block, still within 24h
      const again = dedupedContext("graph-hook", "LONG-LIVED-BLOCK", SID, { sidecar: path, ttlMs: ONE_DAY, now: T0 + 11 * 60_000 });
      assert.ok(isMarker(again), "24h sibling survived the 5min hook's shared-sidecar prune -> dedup marker");
      assert.ok(!again.includes("LONG-LIVED-BLOCK"), "NOT a full re-emit (would be the bug)");
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });

  test("injectable now is backward-compatible: omitting it still dedups same-tag within TTL", () => {
    const { dir, path } = tmpSidecar();
    try {
      // no `now` passed -> uses Date.now(); two identical calls in the same instant dedup
      assert.equal(dedupedContext("h", "B", SID, { sidecar: path }), "B", "first emit");
      assert.ok(isMarker(dedupedContext("h", "B", SID, { sidecar: path })), "repeat -> marker (Date.now path intact)");
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });
});
