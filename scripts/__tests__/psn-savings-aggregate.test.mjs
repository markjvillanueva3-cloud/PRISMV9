import { test } from "node:test";
import assert from "node:assert/strict";
import {
  aggregateSavings,
  incrementalAggregate,
  foldStats,
  sliceCompleteLines,
  emptyStats,
} from "../lib/psn-savings-aggregate.mjs";

// In-memory, byte-accurate fakes for the incrementalAggregate I/O contract. Works in
// Buffer space (not JS string indices) so multibyte offset bugs would surface. Tracks
// readRange calls so a test can assert "no re-read on unchanged ledger".
function makeFakeIo(contents) {
  const bufs = {};
  for (const [k, v] of Object.entries(contents)) bufs[k] = Buffer.from(v, "utf8");
  const calls = { readRange: [] };
  return {
    calls,
    setContent: (name, v) => { bufs[name] = Buffer.from(v, "utf8"); },
    statSize: (name) => (bufs[name] ? bufs[name].length : null),
    readHead: (name, n) => (bufs[name] ? bufs[name].subarray(0, Math.min(n, bufs[name].length)).toString("utf8") : ""),
    readRange: (name, start, end) => {
      calls.readRange.push({ name, start, end });
      return bufs[name] ? bufs[name].subarray(start, end) : Buffer.alloc(0);
    },
  };
}

test("aggregateSavings: empty input → zero totals", () => {
  const r = aggregateSavings({});
  assert.equal(r.totals.nudges, 0);
  assert.equal(r.totals.hits, 0);
  assert.equal(r.totals.misses, 0);
  assert.equal(r.totals.savedTokens, 0);
  assert.equal(r.totals.ledgersWithData, 0);
});

test("aggregateSavings: rtk-style hits + misses counted", () => {
  const rtkLedger = [
    JSON.stringify({ ts: "2026-05-24T10:00:00Z", kind: "hit", est_tokens: 700 }),
    JSON.stringify({ ts: "2026-05-24T11:00:00Z", kind: "miss", est_tokens: 700 }),
    JSON.stringify({ ts: "2026-05-24T12:00:00Z", kind: "hit", est_tokens: 950 }),
  ].join("\n");
  const r = aggregateSavings({ "rtk-savings-ledger": rtkLedger });
  assert.equal(r.totals.hits, 2);
  assert.equal(r.totals.misses, 1);
  assert.equal(r.totals.savedTokens, 1650);
  assert.equal(r.byLedger["rtk-savings-ledger"].lines, 3);
});

test("aggregateSavings: multi-style nudges counted via nudge:true", () => {
  const multiLedger = [
    JSON.stringify({ ts: "2026-05-24T10:00:00Z", tool: "Grep", nudge: true, reason: "short-pattern-broad-path" }),
    JSON.stringify({ ts: "2026-05-24T11:00:00Z", tool: "Glob", nudge: false, reason: "scoped-enough" }),
    JSON.stringify({ ts: "2026-05-24T12:00:00Z", tool: "Write", nudge: true, reason: "large-write" }),
  ].join("\n");
  const r = aggregateSavings({ "pre-tool-savings-multi": multiLedger });
  assert.equal(r.totals.nudges, 2);
  assert.equal(r.byLedger["pre-tool-savings-multi"].lines, 3);
});

test("aggregateSavings: multiple ledgers compose", () => {
  const rtk = JSON.stringify({ kind: "hit", est_tokens: 500 });
  const multi = JSON.stringify({ nudge: true });
  const r = aggregateSavings({ rtk, multi });
  assert.equal(r.totals.hits, 1);
  assert.equal(r.totals.nudges, 1);
  assert.equal(r.totals.savedTokens, 500);
  assert.equal(r.totals.ledgersWithData, 2);
});

test("aggregateSavings: malformed lines silent-skipped", () => {
  const jsonl = ["not-json", JSON.stringify({ kind: "hit", est_tokens: 100 }), "{broken"].join("\n");
  const r = aggregateSavings({ a: jsonl });
  assert.equal(r.totals.hits, 1);
  assert.equal(r.byLedger.a.lines, 1); // only parseable lines counted (malformed silently skipped)
});

test("aggregateSavings: injection-dedup cache counts as hits", () => {
  const cache = {
    "slot-soul-inject:abc12345": { "hash1": { lastSeenAt: 1000 } },
    "prompt-rules-inject:slash:abc12345": { "hash2": { lastSeenAt: 1000 }, "hash3": { lastSeenAt: 1000 } },
  };
  const r = aggregateSavings({}, cache);
  assert.equal(r.totals.hits, 3); // 1 + 2 entries across buckets
  assert.equal(r.byLedger["injection-dedup-cache"].hits, 3);
});

test("aggregateSavings: malformed cache → silent skip (no throw)", () => {
  // Should not throw; cache simply not added
  const r = aggregateSavings({}, "{broken-json");
  assert.equal(r.totals.hits, 0);
  assert.equal(r.byLedger["injection-dedup-cache"], undefined);
});

test("aggregateSavings: skip-kind entries ignored", () => {
  const jsonl = [
    JSON.stringify({ kind: "skip", est_tokens: 650 }),
    JSON.stringify({ kind: "hit", est_tokens: 700 }),
  ].join("\n");
  const r = aggregateSavings({ a: jsonl });
  assert.equal(r.totals.hits, 1);
  assert.equal(r.totals.savedTokens, 700);
});

// -- prompt-rewrites shape fix (PSN-REWRITE-SHAPE-FIX, slot:alpha 2026-06-21) --
// The live rewriter emits rewrite as a STRUCTURED OBJECT on success, not a string.
// The old string-only check miscounted every real rewrite as a miss (0 hits), so
// the savings headline reported the rewriter "fully dead". These pin the corrected
// 3-shape classification: object-success = hit (0 compression savings), {skip:true}
// / null = miss, legacy string = hit + char-delta savings.
test("aggregateSavings: structured-OBJECT rewrite counts as a hit with ZERO fabricated savings", () => {
  // the exact live shape from .claude/cache/prompt-rewrites.jsonl
  const jsonl = [
    JSON.stringify({ ts: "2026-06-21T00:00:00Z", raw: "do the thing across all galaxies in yolo mode", rewrite: { goal: "Do the thing", scope: "all galaxies", acceptance_criteria: ["done"], implicit_constraints: [], file_paths: [], variability_axes: [], confidence: 0.8 } }),
    JSON.stringify({ ts: "2026-06-21T00:01:00Z", raw: "another prompt", rewrite: { goal: "Another", scope: "x", acceptance_criteria: [], implicit_constraints: [], file_paths: [], variability_axes: [], confidence: 0.9 } }),
  ].join("\n");
  const r = aggregateSavings({ "prompt-rewrites": jsonl });
  assert.equal(r.totals.hits, 2, "two real structured rewrites = two hits (regression: was 0)");
  assert.equal(r.totals.misses, 0);
  assert.equal(r.totals.savedTokens, 0, "augmentation rewrites compress nothing -> never fabricate a saving (R12)");
});

test("aggregateSavings: {skip:true} object and null rewrite are misses, not hits", () => {
  const jsonl = [
    JSON.stringify({ ts: "2026-06-21T00:00:00Z", raw: "p", rewrite: { skip: true } }),
    JSON.stringify({ ts: "2026-06-21T00:01:00Z", raw: "p", rewrite: null, skip_reason: "no-model" }),
    JSON.stringify({ ts: "2026-06-21T00:02:00Z", raw: "p", rewrite: {} }), // empty object = no real rewrite
  ].join("\n");
  const r = aggregateSavings({ "prompt-rewrites": jsonl });
  assert.equal(r.totals.hits, 0, "skip markers and null are not successful rewrites");
  assert.equal(r.totals.misses, 3);
  assert.equal(r.totals.savedTokens, 0);
});

test("aggregateSavings: legacy STRING rewrite still credits char-delta compression savings", () => {
  const raw = "x".repeat(400);
  const rewrite = "y".repeat(80); // 320 chars shorter -> 80 tokens saved (/4)
  const jsonl = JSON.stringify({ ts: "2026-06-21T00:00:00Z", raw, rewrite });
  const r = aggregateSavings({ "prompt-rewrites": jsonl });
  assert.equal(r.totals.hits, 1);
  assert.equal(r.totals.savedTokens, 80, "legacy compression path: (400-80)/4 = 80");
});

test("aggregateSavings: mixed prompt-rewrites batch — object hits + skips + string, honest totals", () => {
  const jsonl = [
    JSON.stringify({ raw: "a", rewrite: { goal: "g1", scope: "s" } }),       // hit, 0 saved
    JSON.stringify({ raw: "b", rewrite: { skip: true } }),                    // miss
    JSON.stringify({ raw: "c", rewrite: null, skip_reason: "timeout" }),      // miss
    JSON.stringify({ raw: "d".repeat(200), rewrite: "e".repeat(40) }),        // hit, (200-40)/4 = 40 saved
  ].join("\n");
  const r = aggregateSavings({ "prompt-rewrites": jsonl });
  assert.equal(r.totals.hits, 2);
  assert.equal(r.totals.misses, 2);
  assert.equal(r.totals.savedTokens, 40, "only the string-compression entry contributes savings");
});

test("aggregateSavings: object rewrite SHORTER than raw STILL credits 0 (object path never touches savedTokens)", () => {
  // adversarial (arm-B P2): force the object's JSON to be shorter than raw so a buggy
  // impl that wrongly applied (rawLen-newLen) to the object path would emit >0. The
  // correct object path never touches savedTokens, so this must stay 0.
  const raw = "z".repeat(500); // long raw
  const jsonl = JSON.stringify({ raw, rewrite: { goal: "g" } }); // tiny object
  const r = aggregateSavings({ "prompt-rewrites": jsonl });
  assert.equal(r.totals.hits, 1);
  assert.equal(r.totals.savedTokens, 0, "augmentation never credits savings, even when the object serializes shorter than raw");
});

test("aggregateSavings: a logged structured object WITH skip_reason is a miss, not a hit (forward-safety)", () => {
  // arm-C P2: the rewriter logs the full object even when it self-rejects
  // (skip_reason:'low-confidence'); that rejected rewrite must NOT count as a hit.
  const jsonl = [
    JSON.stringify({ raw: "p", rewrite: { goal: "g", scope: "s", confidence: 0.2 }, skip_reason: "low-confidence" }),
    JSON.stringify({ raw: "q", rewrite: { goal: "g2", scope: "s2", confidence: 0.9 } }), // accepted -> hit
  ].join("\n");
  const r = aggregateSavings({ "prompt-rewrites": jsonl });
  assert.equal(r.totals.hits, 1, "only the accepted (no skip_reason) rewrite counts");
  assert.equal(r.totals.misses, 1, "the low-confidence self-rejected object is a miss");
  assert.equal(r.totals.savedTokens, 0);
});

// -- Incremental / offset-based aggregation (U-PSN-INCREMENTAL-AGGREGATE, slot:alpha
//    2026-06-22). The invariant under test: incrementalAggregate produces output
//    BYTE-IDENTICAL to a full aggregateSavings re-parse, while reading only the appended
//    delta. Failure modes: prune-shrink, front-rewrite, partial final line. Adversarial:
//    multibyte byte-offsets, grow-with-rotation. ----------------------------------------

test("foldStats: field-wise addition, tolerant of partial objects", () => {
  assert.deepEqual(
    foldStats({ lines: 1, nudges: 2, hits: 3, misses: 4, savedTokens: 5 }, { lines: 10, nudges: 20, hits: 30, misses: 40, savedTokens: 50 }),
    { lines: 11, nudges: 22, hits: 33, misses: 44, savedTokens: 55 },
  );
  assert.deepEqual(foldStats(emptyStats(), { hits: 2, savedTokens: 7 }), { lines: 0, nudges: 0, hits: 2, misses: 0, savedTokens: 7 });
});

test("sliceCompleteLines: complete lines + boundary offset, trailing partial deferred", () => {
  const { text, endOffset } = sliceCompleteLines(Buffer.from("a\nbb\nccc"));
  assert.equal(text, "a\nbb\n");
  assert.equal(endOffset, 5, "just past the 2nd newline; 'ccc' partial deferred");
});

test("sliceCompleteLines: dropLeadingPartial skips a mid-file head fragment", () => {
  const { text, endOffset } = sliceCompleteLines(Buffer.from('rtition\n{"x":1}\n{"y":2}\n'), { dropLeadingPartial: true });
  assert.equal(text, '{"x":1}\n{"y":2}\n');
  assert.equal(endOffset, Buffer.byteLength('rtition\n{"x":1}\n{"y":2}\n'));
});

test("sliceCompleteLines: no newline at all -> no complete line, offset does not advance", () => {
  const { text, endOffset } = sliceCompleteLines(Buffer.from("nonewline"));
  assert.equal(text, "");
  assert.equal(endOffset, 0);
});

test("incrementalAggregate: cold start === aggregateSavings full parse (multi-ledger + dedup)", () => {
  const rtk = [JSON.stringify({ kind: "hit", est_tokens: 700 }), JSON.stringify({ kind: "miss" })].join("\n") + "\n";
  const multi = [JSON.stringify({ nudge: true }), JSON.stringify({ nudge: false })].join("\n") + "\n";
  const rw = JSON.stringify({ raw: "a", rewrite: { goal: "g" } }) + "\n";
  const cache = { "soul:abc": { h1: {}, h2: {} } };
  const io = makeFakeIo({ "rtk-savings-ledger": rtk, "pre-tool-savings-multi": multi, "prompt-rewrites": rw });
  const ids = ["rtk-savings-ledger", "pre-tool-savings-multi", "prompt-rewrites"];
  const inc = incrementalAggregate({ ids, statSize: io.statSize, readHead: io.readHead, readRange: io.readRange, dedupCacheJson: cache });
  const full = aggregateSavings({ "rtk-savings-ledger": rtk, "pre-tool-savings-multi": multi, "prompt-rewrites": rw }, cache);
  assert.deepEqual(inc.totals, full.totals, "cold-start incremental totals == full parse");
  assert.deepEqual(inc.byLedger, full.byLedger, "cold-start incremental byLedger == full parse (incl. dedup entry)");
});

test("incrementalAggregate: delta read after append === full parse, reads ONLY new bytes", () => {
  const ids = ["rtk-savings-ledger"];
  const part1 = [JSON.stringify({ kind: "hit", est_tokens: 100 }), JSON.stringify({ kind: "hit", est_tokens: 200 })].join("\n") + "\n";
  const io = makeFakeIo({ "rtk-savings-ledger": part1 });
  const r1 = incrementalAggregate({ ids, statSize: io.statSize, readHead: io.readHead, readRange: io.readRange });
  const appended = JSON.stringify({ kind: "miss" }) + "\n" + JSON.stringify({ kind: "hit", est_tokens: 50 }) + "\n";
  io.setContent("rtk-savings-ledger", part1 + appended);
  io.calls.readRange.length = 0; // reset spy AFTER the cold-start read
  const r2 = incrementalAggregate({ ids, checkpoint: r1.checkpoint, prevByLedger: r1.byLedger, statSize: io.statSize, readHead: io.readHead, readRange: io.readRange });
  const full = aggregateSavings({ "rtk-savings-ledger": part1 + appended });
  assert.deepEqual(r2.totals, full.totals, "incremental fold == full re-parse");
  assert.deepEqual(r2.byLedger, full.byLedger);
  const call = io.calls.readRange.find((c) => c.name === "rtk-savings-ledger");
  assert.equal(call.start, Buffer.byteLength(part1, "utf8"), "delta read begins exactly at the prior checkpoint offset (only new bytes)");
});

test("incrementalAggregate: an unchanged ledger carries prior stats with NO re-read", () => {
  const ids = ["nav"];
  const c = JSON.stringify({ kind: "hit", est_tokens: 10 }) + "\n";
  const io = makeFakeIo({ nav: c });
  const r1 = incrementalAggregate({ ids, statSize: io.statSize, readHead: io.readHead, readRange: io.readRange });
  io.calls.readRange.length = 0;
  const r2 = incrementalAggregate({ ids, checkpoint: r1.checkpoint, prevByLedger: r1.byLedger, statSize: io.statSize, readHead: io.readHead, readRange: io.readRange });
  assert.deepEqual(r2.byLedger.nav, r1.byLedger.nav, "stats carried forward unchanged");
  assert.equal(io.calls.readRange.length, 0, "no byte-range read when size === offset (the incremental win)");
});

test("incrementalAggregate: a pruned (shrunk) ledger re-baselines to the new full content", () => {
  const ids = ["prompt-rewrites"];
  const big = Array.from({ length: 5 }, (_, i) => JSON.stringify({ raw: "x", rewrite: { goal: "g" + i } })).join("\n") + "\n";
  const io = makeFakeIo({ "prompt-rewrites": big });
  const r1 = incrementalAggregate({ ids, statSize: io.statSize, readHead: io.readHead, readRange: io.readRange });
  assert.equal(r1.byLedger["prompt-rewrites"].hits, 5);
  const pruned = Array.from({ length: 2 }, (_, i) => JSON.stringify({ raw: "x", rewrite: { goal: "k" + i } })).join("\n") + "\n";
  io.setContent("prompt-rewrites", pruned);
  const r2 = incrementalAggregate({ ids, checkpoint: r1.checkpoint, prevByLedger: r1.byLedger, statSize: io.statSize, readHead: io.readHead, readRange: io.readRange });
  const full = aggregateSavings({ "prompt-rewrites": pruned });
  assert.deepEqual(r2.byLedger, full.byLedger, "shrink triggers a full re-baseline (no stale carryover / double count)");
  assert.equal(r2.byLedger["prompt-rewrites"].hits, 2);
});

test("incrementalAggregate: a front-rewrite (head change) re-baselines even when the file GREW", () => {
  // adversarial: file grows (size > offset, so the shrink guard alone misses it) but the
  // content was rewritten from the front. Folding a delta onto stale stats would double-
  // count; the head-change guard forces a clean re-baseline.
  const ids = ["rtk-savings-ledger"];
  const c1 = Array.from({ length: 3 }, () => JSON.stringify({ kind: "hit", est_tokens: 100 })).join("\n") + "\n";
  const io = makeFakeIo({ "rtk-savings-ledger": c1 });
  const r1 = incrementalAggregate({ ids, statSize: io.statSize, readHead: io.readHead, readRange: io.readRange });
  const c2 = Array.from({ length: 6 }, (_, i) => JSON.stringify({ kind: "miss", seq: i })).join("\n") + "\n";
  assert.ok(Buffer.byteLength(c2) > Buffer.byteLength(c1), "fixture: rewritten file is larger");
  io.setContent("rtk-savings-ledger", c2);
  const r2 = incrementalAggregate({ ids, checkpoint: r1.checkpoint, prevByLedger: r1.byLedger, statSize: io.statSize, readHead: io.readHead, readRange: io.readRange });
  const full = aggregateSavings({ "rtk-savings-ledger": c2 });
  assert.deepEqual(r2.byLedger, full.byLedger, "head-change rebaseline avoids folding deltas onto stale stats");
  assert.equal(r2.byLedger["rtk-savings-ledger"].misses, 6);
  assert.equal(r2.byLedger["rtk-savings-ledger"].hits, 0);
});

test("incrementalAggregate: a partial final line is deferred, then counted once completed", () => {
  const ids = ["nav"];
  const complete = JSON.stringify({ kind: "hit", est_tokens: 10 }) + "\n";
  const partial = '{"kind":"hit","est_tokens":2'; // half-written, no trailing newline
  const io = makeFakeIo({ nav: complete + partial });
  const r1 = incrementalAggregate({ ids, statSize: io.statSize, readHead: io.readHead, readRange: io.readRange });
  assert.equal(r1.byLedger.nav.hits, 1, "the half-written final line is NOT parsed yet");
  assert.equal(r1.checkpoint.nav.offset, Buffer.byteLength(complete, "utf8"), "offset stops before the partial line");
  io.setContent("nav", complete + partial + "0}\n"); // the 2nd line completes as est_tokens:20
  const r2 = incrementalAggregate({ ids, checkpoint: r1.checkpoint, prevByLedger: r1.byLedger, statSize: io.statSize, readHead: io.readHead, readRange: io.readRange });
  assert.equal(r2.byLedger.nav.hits, 2, "the now-complete second line is counted");
  assert.equal(r2.byLedger.nav.savedTokens, 30, "10 + 20");
  const full = aggregateSavings({ nav: complete + partial + "0}\n" });
  assert.deepEqual(r2.byLedger, full.byLedger);
});

test("incrementalAggregate: byte offsets stay correct across multibyte UTF-8 lines (delta == full)", () => {
  const ids = ["nav"];
  const l1 = JSON.stringify({ kind: "hit", est_tokens: 11, note: "café—中" }) + "\n";
  const io = makeFakeIo({ nav: l1 });
  const r1 = incrementalAggregate({ ids, statSize: io.statSize, readHead: io.readHead, readRange: io.readRange });
  assert.equal(r1.checkpoint.nav.offset, Buffer.byteLength(l1, "utf8"), "checkpoint offset is a BYTE position, not a char index");
  const l2 = JSON.stringify({ kind: "hit", est_tokens: 22, note: "naïve—😀" }) + "\n";
  io.setContent("nav", l1 + l2);
  const r2 = incrementalAggregate({ ids, checkpoint: r1.checkpoint, prevByLedger: r1.byLedger, statSize: io.statSize, readHead: io.readHead, readRange: io.readRange });
  const full = aggregateSavings({ nav: l1 + l2 });
  assert.deepEqual(r2.byLedger, full.byLedger, "multibyte delta folds correctly to the full-parse result");
  assert.equal(r2.byLedger.nav.savedTokens, 33);
});

test("incrementalAggregate: missing/empty ledgers produce empty stats + zero offset", () => {
  const io = makeFakeIo({ present: JSON.stringify({ kind: "hit", est_tokens: 5 }) + "\n", empty: "" });
  const r = incrementalAggregate({ ids: ["present", "missing", "empty"], statSize: io.statSize, readHead: io.readHead, readRange: io.readRange });
  assert.equal(r.byLedger.present.hits, 1);
  assert.deepEqual(r.byLedger.missing, emptyStats());
  assert.deepEqual(r.byLedger.empty, emptyStats());
  assert.equal(r.checkpoint.missing.offset, 0);
  assert.equal(r.totals.ledgersWithData, 1, "only the present non-empty ledger counts");
});

test("incrementalAggregate: checkpoint survives a JSON round-trip (the real sidecar persistence path)", () => {
  // The hook persists {byLedger, _checkpoint} to OUTPUT and re-reads it next run. Pin that
  // the checkpoint+stats fold correctly AFTER a JSON serialize/parse cycle (catches any
  // non-JSON-safe field or a prevByLedger that drifts from the persisted shape).
  const ids = ["pre-tool-savings-multi"];
  const part1 = [JSON.stringify({ nudge: true }), JSON.stringify({ nudge: true })].join("\n") + "\n";
  const io = makeFakeIo({ "pre-tool-savings-multi": part1 });
  const r1 = incrementalAggregate({ ids, statSize: io.statSize, readHead: io.readHead, readRange: io.readRange });
  const persisted = JSON.parse(JSON.stringify({ byLedger: r1.byLedger, _checkpoint: r1.checkpoint }));
  const after = part1 + JSON.stringify({ nudge: true }) + "\n";
  io.setContent("pre-tool-savings-multi", after);
  const r2 = incrementalAggregate({ ids, checkpoint: persisted._checkpoint, prevByLedger: persisted.byLedger, statSize: io.statSize, readHead: io.readHead, readRange: io.readRange });
  const full = aggregateSavings({ "pre-tool-savings-multi": after });
  assert.deepEqual(r2.byLedger, full.byLedger, "checkpoint round-tripped through JSON still yields the correct delta fold");
  assert.equal(r2.byLedger["pre-tool-savings-multi"].nudges, 3);
});
