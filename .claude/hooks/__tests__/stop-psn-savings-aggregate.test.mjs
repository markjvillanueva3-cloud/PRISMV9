import { test } from "node:test";
import assert from "node:assert/strict";
import { writeFileSync, rmSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { tailRead, MAX_READ_BYTES, statSizeOf, readHeadOf, readRangeOf } from "../stop-psn-savings-aggregate.mjs";
import { aggregateSavings, incrementalAggregate } from "../../../scripts/lib/psn-savings-aggregate.mjs";

// U-PSN-AGGREGATE-TAILREAD-FIX (slot:alpha 2026-06-21): tailRead used a 500KB
// byte-cap that under-read the 2.2MB prompt-rewrites ledger (headline showed ~27h
// not 349) AND byte-sliced mid-line (dropping a real boundary entry). These pin
// the corrected behavior: full content under the cap, and a clean line boundary
// (no partial first line) when truncating.

function withTmp(fn) {
  const dir = mkdtempSync(join(tmpdir(), "prism-tailread-"));
  try { return fn(dir); } finally { rmSync(dir, { recursive: true, force: true }); }
}

test("MAX_READ_BYTES is a 64MB crash-guard ceiling above the verified 13.2MB largest live ledger", () => {
  // regression guard: the verified live max is pre-tool-savings-multi ~13.2MB. The
  // cap MUST stay well above it (the 8MB attempt still truncated that 13.2MB ledger,
  // dropping ~1.7K nudges -- caught by the 3-of-3). Do not drop back below it.
  assert.equal(MAX_READ_BYTES, 64_000_000);
  assert.ok(MAX_READ_BYTES > 13_300_000, "must exceed the largest live ledger (pre-tool-savings-multi ~13.2MB)");
});

test("tailRead: file under the cap returns the FULL content (no lines lost)", () => {
  withTmp((dir) => {
    const p = join(dir, "small.jsonl");
    const lines = Array.from({ length: 100 }, (_, i) => JSON.stringify({ n: i }));
    writeFileSync(p, lines.join("\n") + "\n");
    const out = tailRead(p, MAX_READ_BYTES);
    const parsed = out.trim().split("\n").map((l) => JSON.parse(l));
    assert.equal(parsed.length, 100, "every line present");
    assert.equal(parsed[0].n, 0, "first line is the earliest entry (nothing dropped from the head)");
    assert.equal(parsed[99].n, 99);
  });
});

test("tailRead: truncating starts at a CLEAN line boundary -- no mid-line fragment", () => {
  withTmp((dir) => {
    const p = join(dir, "big.jsonl");
    // each line ~ "{\"n\":NNNN,\"pad\":\"xxxx...\"}" -- make lines fat so a small cap truncates
    const lines = Array.from({ length: 2000 }, (_, i) => JSON.stringify({ n: i, pad: "x".repeat(200) }));
    writeFileSync(p, lines.join("\n") + "\n");
    const cap = 50_000; // forces truncation (file is ~430KB)
    const out = tailRead(p, cap);
    // EVERY returned line must be a complete, parseable JSON object (the bug:
    // the OLD byte-slice left a partial first line that JSON.parse silently dropped).
    const rows = out.trim().split("\n").filter(Boolean);
    for (const l of rows) {
      assert.doesNotThrow(() => JSON.parse(l), `every parsed line is complete: ${l.slice(0, 40)}`);
    }
    // it returned the MOST RECENT entries (tail), and strictly fewer than all 2000
    const parsed = rows.map((l) => JSON.parse(l));
    assert.ok(parsed.length > 0 && parsed.length < 2000, "truncated to a tail slice");
    assert.equal(parsed[parsed.length - 1].n, 1999, "last entry is the newest");
    // the very first kept entry is complete (has both keys) -- proves no fragment
    assert.equal(typeof parsed[0].n, "number");
    assert.equal(parsed[0].pad, "x".repeat(200));
  });
});

test("tailRead: a slice that begins exactly at a line boundary KEEPS the first complete line", () => {
  withTmp((dir) => {
    // boundary-aligned edge (3-of-3 arm B P2): build content so the cut lands
    // exactly on a "\n". The first line of the slice is then COMPLETE and must NOT
    // be stripped. Lines are fixed width so we can align the cut precisely.
    const p = join(dir, "aligned.jsonl");
    const rec = (i) => JSON.stringify({ n: i }).padEnd(19, " "); // uniform 19-char records
    const lines = Array.from({ length: 50 }, (_, i) => rec(i));
    const text = lines.join("\n") + "\n";
    writeFileSync(p, text);
    // cut so that exactly the last 10 whole records remain: bytes = 10*(19+1) = 200
    const out = tailRead(p, 200);
    const rows = out.trim().split("\n").filter(Boolean).map((l) => JSON.parse(l));
    assert.equal(rows.length, 10, "all 10 boundary-aligned records kept (none wrongly stripped)");
    assert.equal(rows[0].n, 40, "the first KEPT record is complete, not dropped");
    assert.equal(rows[9].n, 49);
  });
});

test("INTEGRATION: a ledger larger than the OLD 8MB cap is FULLY counted through aggregateSavings (the 13.2MB miss)", () => {
  withTmp((dir) => {
    // This is the test that would have caught the shipped regression: build a
    // pre-tool-savings-multi-style ledger > 8MB (the failed cap) but < 64MB, and
    // assert EVERY nudge is counted -- not a truncated tail.
    const p = join(dir, "pre-tool-savings-multi.jsonl");
    const N = 60_000; // ~ >8MB of fat nudge records
    const lines = Array.from({ length: N }, (_, i) =>
      JSON.stringify({ ts: i, tool: "Grep", nudge: true, reason: "x".repeat(120) }));
    const text = lines.join("\n") + "\n";
    writeFileSync(p, text);
    assert.ok(text.length > 8_000_000, "fixture must exceed the old 8MB cap to be meaningful");
    assert.ok(text.length < MAX_READ_BYTES, "fixture stays under the 64MB ceiling");
    const content = tailRead(p, MAX_READ_BYTES);
    const r = aggregateSavings({ "pre-tool-savings-multi": content });
    assert.equal(r.totals.nudges, N, "every nudge counted -- no tail truncation under the ceiling");
  });
});

test("tailRead: missing file and empty file return '' (never throws)", () => {
  withTmp((dir) => {
    assert.equal(tailRead(join(dir, "nope.jsonl"), MAX_READ_BYTES), "");
    const empty = join(dir, "empty.jsonl");
    writeFileSync(empty, "");
    assert.equal(tailRead(empty, MAX_READ_BYTES), "");
  });
});

// -- U-PSN-INCREMENTAL-AGGREGATE (slot:alpha 2026-06-22): the byte-range fs readers that
//    back the incremental per-run path, tested against REAL temp files (the part that
//    can't be faked), plus an end-to-end equivalence check through incrementalAggregate.

test("statSizeOf + readHeadOf: size + head probe (missing/empty safe)", () => {
  withTmp((dir) => {
    const p = join(dir, "h.jsonl");
    writeFileSync(p, "abcdefgh\nij\n");
    assert.equal(statSizeOf(p), Buffer.byteLength("abcdefgh\nij\n"));
    assert.equal(readHeadOf(p, 4), "abcd", "first 4 bytes only");
    assert.equal(readHeadOf(p, 1000), "abcdefgh\nij\n", "head capped at file size, never over-reads");
    assert.equal(statSizeOf(join(dir, "missing")), null, "missing file -> null");
    const e = join(dir, "empty.jsonl");
    writeFileSync(e, "");
    assert.equal(statSizeOf(e), 0);
    assert.equal(readHeadOf(e, 10), "", "empty file head -> ''");
  });
});

test("readRangeOf: returns the exact byte range, multibyte-safe, fail-soft", () => {
  withTmp((dir) => {
    const p = join(dir, "m.jsonl");
    const content = "café\n中文\n"; // multibyte: byte-length != char-length
    writeFileSync(p, content);
    const full = Buffer.byteLength(content, "utf8");
    assert.equal(readRangeOf(p, 0, full).toString("utf8"), content, "whole file");
    const firstLineBytes = Buffer.byteLength("café\n", "utf8");
    assert.equal(readRangeOf(p, firstLineBytes, full).toString("utf8"), "中文\n", "byte-aligned sub-range");
    assert.equal(readRangeOf(p, 0, 0).length, 0, "empty range -> empty buffer");
    assert.equal(readRangeOf(join(dir, "nope"), 0, 10).length, 0, "missing file -> empty buffer, no throw");
  });
});

test("INTEGRATION (real fs): incrementalAggregate over temp files reads only the delta + equals full parse", () => {
  withTmp((dir) => {
    const p = join(dir, "rtk-savings-ledger.jsonl");
    const part1 = [JSON.stringify({ kind: "hit", est_tokens: 100 }), JSON.stringify({ kind: "miss" })].join("\n") + "\n";
    writeFileSync(p, part1);
    const io = {
      statSize: () => statSizeOf(p),
      readHead: (_name, n) => readHeadOf(p, n),
      readRange: (_name, s, e) => readRangeOf(p, s, e),
    };
    const r1 = incrementalAggregate({ ids: ["rtk"], statSize: io.statSize, readHead: io.readHead, readRange: io.readRange });
    assert.equal(r1.checkpoint.rtk.offset, Buffer.byteLength(part1, "utf8"), "cold-start offset = full file size (clean boundary)");
    assert.equal(r1.byLedger.rtk.hits, 1);

    const more = JSON.stringify({ kind: "hit", est_tokens: 7 }) + "\n";
    writeFileSync(p, part1 + more); // append a new record on disk
    const r2 = incrementalAggregate({ ids: ["rtk"], checkpoint: r1.checkpoint, prevByLedger: r1.byLedger, statSize: io.statSize, readHead: io.readHead, readRange: io.readRange });
    const full = aggregateSavings({ rtk: part1 + more });
    assert.deepEqual(r2.byLedger, full.byLedger, "incremental fold over real fs == full re-parse");
    assert.deepEqual(r2.totals, full.totals);
    assert.equal(r2.byLedger.rtk.hits, 2);
    assert.equal(r2.checkpoint.rtk.offset, Buffer.byteLength(part1 + more, "utf8"));
  });
});
