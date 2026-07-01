// TOKEN-AWARENESS-MS0 / U-TA02 — transcript token counter tests.
// Real-data oracle: writes synthetic JSONL transcripts to tmpdir, runs the
// counter, asserts post-compact slicing + message-id dedup behave correctly.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import {
  sliceAfterLastCompact,
  parseJsonlBlocks,
  extractUsageFromBlock,
  dedupByMessageId,
  sumCumulative,
  analyzeTranscript,
  tailReadTranscript,
  extractLatestCtx,
  COMPACT_MARKER,
  COMPACT_MARKERS,
  lastCompactMarkerOffset,
  readTranscriptTail,
  analyzeTranscriptFromText,
  extractLatestCtxFromText,
  isCompactSummaryBlock,
} from "../transcript-token-counter.mjs";

// ── current-format compact boundary (Claude Code marks compaction as a
//    {"type":"system","subtype":"compact_boundary"} record, NOT the legacy
//    "isCompactSummary":true flag — verified against live transcripts
//    2026-06-10; the format change silently broke every byte-based ctx
//    estimator and drove the alpha constant-compaction loop). These tests
//    pin BOTH formats so a future format change is caught here, not in prod.
const CB = '{"type":"system","subtype":"compact_boundary","content":"Conversation compacted","compactMetadata":{"trigger":"auto","preTokens":702495}}';

test("sliceAfterLastCompact — current compact_boundary marker slices post-compact", () => {
  const text = `{"a":1}\n${CB}\n{"b":2}\n{"c":3}\n`;
  assert.equal(sliceAfterLastCompact(text), '{"b":2}\n{"c":3}\n');
});

test("sliceAfterLastCompact — mixed legacy+current takes the LAST regardless of kind", () => {
  const text = `{"isCompactSummary":true,"x":1}\n{"a":1}\n${CB}\n{"b":2}\n`;
  assert.equal(sliceAfterLastCompact(text), '{"b":2}\n');
  // and the reverse order — legacy after current → legacy wins
  const text2 = `${CB}\n{"a":1}\n{"isCompactSummary":true,"x":2}\n{"b":2}\n`;
  assert.equal(sliceAfterLastCompact(text2), '{"b":2}\n');
});

test("lastCompactMarkerOffset — finds current + legacy, -1 when absent", () => {
  assert.equal(lastCompactMarkerOffset('{"a":1}\n{"b":2}\n'), -1);
  assert.ok(lastCompactMarkerOffset(`x\n${CB}\n`) >= 0);
  assert.ok(lastCompactMarkerOffset('x\n{"isCompactSummary":true}\n') >= 0);
  assert.ok(Array.isArray(COMPACT_MARKERS) && COMPACT_MARKERS.length >= 2);
});

test("isCompactSummaryBlock — true for current compact_boundary system record", () => {
  assert.equal(isCompactSummaryBlock({ type: "system", subtype: "compact_boundary" }), true);
  // legacy still detected
  assert.equal(isCompactSummaryBlock({ isCompactSummary: true }), true);
  assert.equal(isCompactSummaryBlock({ message: { isCompactSummary: true } }), true);
  // a normal assistant turn is NOT a boundary
  assert.equal(isCompactSummaryBlock({ type: "assistant", message: { usage: { input_tokens: 5 } } }), false);
  assert.equal(isCompactSummaryBlock({ type: "system", subtype: "turn_duration" }), false);
});

// ── DRIFT GUARD ────────────────────────────────────────────────────────────
// Two byte-tail consumers re-inline the compact-boundary literals instead of
// importing COMPACT_MARKERS (chat-token-watch needs a Buffer search; the hook
// needs a whitespace-tolerant regex -- both legitimate). That re-inlining is
// exactly how the original bug happened: a marker the harness changed left an
// estimator scanning a dead literal. This guard fails LOUDLY if COMPACT_MARKERS
// gains/changes a literal that a consumer's source no longer contains, so the
// next transcript-format change is caught in CI, not by a constant-compaction
// incident. (See lessons in compact-boundary-format-change-constant-compaction.)
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

test("DRIFT GUARD — every COMPACT_MARKERS literal is present in each re-inlining consumer", () => {
  const here = dirname(fileURLToPath(import.meta.url));
  const repo = join(here, "..", "..", ".."); // scripts/lib/__tests__ -> repo root
  const consumers = [
    join(repo, "scripts", "lib", "chat-token-watch.mjs"),
    join(repo, ".claude", "hooks", "precompact-auto-trigger.mjs"),
  ];
  for (const file of consumers) {
    const src = readFileSync(file, "utf8");
    for (const marker of COMPACT_MARKERS) {
      // The hook uses a whitespace-tolerant regex (`"subtype"\s*:\s*"..."`), so
      // compare on the bare quoted key+value tokens rather than the exact
      // `"key":"value"` literal -- a token absent from the source IS real drift.
      const keyTok = marker.split(":")[0]; // e.g. '"subtype"' or '"isCompactSummary"'
      const valTok = marker.slice(marker.indexOf(":") + 1); // e.g. '"compact_boundary"' or 'true'
      assert.ok(
        src.includes(keyTok) && src.includes(valTok),
        `${file} is missing compact-boundary marker tokens ${keyTok} / ${valTok} ` +
          `-- COMPACT_MARKERS changed but this consumer did not (drift = the original bug class)`
      );
    }
  }
});

// ── sliceAfterLastCompact ──────────────────────────────────────────────────
test("sliceAfterLastCompact — no marker returns whole text", () => {
  const text = '{"a":1}\n{"b":2}\n';
  assert.equal(sliceAfterLastCompact(text), text);
});

test("sliceAfterLastCompact — slices after last marker", () => {
  const text = `{"a":1}\n{"isCompactSummary":true,"x":0}\n{"b":2}\n{"c":3}\n`;
  const r = sliceAfterLastCompact(text);
  assert.equal(r, '{"b":2}\n{"c":3}\n');
});

test("sliceAfterLastCompact — multiple markers takes the LAST", () => {
  const text = `{"isCompactSummary":true,"x":1}\n{"a":1}\n{"isCompactSummary":true,"x":2}\n{"b":2}\n`;
  const r = sliceAfterLastCompact(text);
  assert.equal(r, '{"b":2}\n');
});

test("sliceAfterLastCompact — marker on last line → empty (nothing after)", () => {
  const text = `{"a":1}\n{"isCompactSummary":true,"x":0}`;
  assert.equal(sliceAfterLastCompact(text), "");
});

test("sliceAfterLastCompact — empty / null", () => {
  assert.equal(sliceAfterLastCompact(""), "");
  assert.equal(sliceAfterLastCompact(null), "");
});

// ── parseJsonlBlocks ───────────────────────────────────────────────────────
test("parseJsonlBlocks — drops malformed leading partial line", () => {
  // A tail read may start mid-line. Drop that first partial.
  const text = `tial-junk-no-brace\n{"a":1}\n{"b":2}\n`;
  const out = parseJsonlBlocks(text);
  assert.equal(out.length, 2);
  assert.equal(out[0].a, 1);
  assert.equal(out[1].b, 2);
});

test("parseJsonlBlocks — skips malformed mid-stream lines silently", () => {
  // Streaming can leave partial / corrupted lines.
  const text = `{"a":1}\n{"this is bad json\n{"b":2}\n`;
  const out = parseJsonlBlocks(text);
  assert.equal(out.length, 2);
});

test("parseJsonlBlocks — empty / whitespace lines skipped", () => {
  const text = `\n   \n{"a":1}\n\n`;
  const out = parseJsonlBlocks(text);
  assert.equal(out.length, 1);
});

// ── extractUsageFromBlock — both shapes ────────────────────────────────────
test("extractUsageFromBlock — Claude Code transcript shape", () => {
  // Shape: { type:'assistant', message: { id, usage:{...} } }
  const r = extractUsageFromBlock({
    type: "assistant",
    message: {
      id: "msg_abc",
      usage: {
        input_tokens: 100,
        output_tokens: 50,
        cache_creation_input_tokens: 200,
        cache_read_input_tokens: 80,
      },
    },
  });
  assert.deepEqual(r, { id: "msg_abc", input: 100, output: 50, cache_creation: 200, cache_read: 80 });
});

test("extractUsageFromBlock — stream-json --output-format shape", () => {
  // Shape: { type:'assistant', id, usage:{...} }
  const r = extractUsageFromBlock({
    type: "assistant",
    id: "msg_xyz",
    usage: { input_tokens: 10, output_tokens: 5 },
  });
  assert.equal(r.id, "msg_xyz");
  assert.equal(r.input, 10);
  assert.equal(r.output, 5);
});

test("extractUsageFromBlock — no usage block → null", () => {
  assert.equal(extractUsageFromBlock({ type: "user", message: "hi" }), null);
  assert.equal(extractUsageFromBlock({}), null);
  assert.equal(extractUsageFromBlock(null), null);
});

test("extractUsageFromBlock — NaN/negative usage values clamped to 0", () => {
  const r = extractUsageFromBlock({
    type: "assistant",
    message: {
      id: "msg_bad",
      usage: { input_tokens: -100, output_tokens: Number.NaN, cache_creation_input_tokens: Infinity },
    },
  });
  assert.equal(r.input, 0);
  assert.equal(r.output, 0);
  assert.equal(r.cache_creation, 0);
});

// ── dedupByMessageId — the load-bearing logic ──────────────────────────────
test("dedupByMessageId — same id 3x keeps LAST occurrence", () => {
  // Claude writes msg_X with growing usage as it streams.
  const recs = [
    { id: "msg_X", input: 100, output: 10, cache_creation: 0, cache_read: 0 },
    { id: "msg_X", input: 100, output: 50, cache_creation: 0, cache_read: 0 },
    { id: "msg_X", input: 100, output: 200, cache_creation: 0, cache_read: 0 }, // final
  ];
  const d = dedupByMessageId(recs);
  assert.equal(d.length, 1);
  assert.equal(d[0].output, 200);
});

test("dedupByMessageId — records without id stay separate", () => {
  const recs = [
    { id: null, input: 10, output: 0, cache_creation: 0, cache_read: 0 },
    { id: null, input: 20, output: 0, cache_creation: 0, cache_read: 0 },
  ];
  const d = dedupByMessageId(recs);
  assert.equal(d.length, 2);
});

test("dedupByMessageId — mixed ids + anonymous", () => {
  const recs = [
    { id: "msg_A", input: 1, output: 0, cache_creation: 0, cache_read: 0 },
    { id: "msg_B", input: 2, output: 0, cache_creation: 0, cache_read: 0 },
    { id: "msg_A", input: 3, output: 0, cache_creation: 0, cache_read: 0 },
    { id: null, input: 4, output: 0, cache_creation: 0, cache_read: 0 },
  ];
  const d = dedupByMessageId(recs);
  assert.equal(d.length, 3); // A (last), B, anon
  const a = d.find((r) => r.id === "msg_A");
  assert.equal(a.input, 3);
});

// ── sumCumulative ──────────────────────────────────────────────────────────
test("sumCumulative — happy path", () => {
  const r = sumCumulative([
    { input: 100, output: 10, cache_creation: 200, cache_read: 50 },
    { input: 200, output: 20, cache_creation: 0, cache_read: 100 },
  ]);
  assert.equal(r.input, 300);
  assert.equal(r.output, 30);
  assert.equal(r.cache_creation, 200);
  assert.equal(r.cache_read, 150);
});

test("sumCumulative — empty array → all zeros", () => {
  const r = sumCumulative([]);
  assert.equal(r.input, 0);
  assert.equal(r.output, 0);
  assert.equal(r.cache_creation, 0);
  assert.equal(r.cache_read, 0);
});

test("sumCumulative — skips nulls", () => {
  const r = sumCumulative([null, { input: 100, output: 0, cache_creation: 0, cache_read: 0 }, null]);
  assert.equal(r.input, 100);
});

// ── analyzeTranscript — real-FS integration ────────────────────────────────
function makeTmpTranscript(lines) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "prism-ta-"));
  const fp = path.join(dir, "session.jsonl");
  fs.writeFileSync(fp, lines.join("\n") + "\n");
  return { dir, fp };
}

test("analyzeTranscript — missing file → all zeros", () => {
  const r = analyzeTranscript({ filePath: "/nonexistent/path/x.jsonl" });
  assert.equal(r.input, 0);
  assert.equal(r.recordCount, 0);
  assert.equal(r.dedupedCount, 0);
});

test("analyzeTranscript — null filePath → zeros", () => {
  const r = analyzeTranscript({ filePath: null });
  assert.equal(r.input, 0);
});

test("analyzeTranscript — real file, no compact, dedups streamed snapshots", () => {
  const { dir, fp } = makeTmpTranscript([
    JSON.stringify({ type: "user", message: "hi" }),
    JSON.stringify({
      type: "assistant",
      message: { id: "msg_S", usage: { input_tokens: 500, output_tokens: 10 } },
    }),
    JSON.stringify({
      type: "assistant",
      message: { id: "msg_S", usage: { input_tokens: 500, output_tokens: 50 } },
    }),
    JSON.stringify({
      type: "assistant",
      message: { id: "msg_S", usage: { input_tokens: 500, output_tokens: 200 } },
    }),
    JSON.stringify({
      type: "assistant",
      message: { id: "msg_T", usage: { input_tokens: 100, output_tokens: 25 } },
    }),
  ]);
  try {
    const r = analyzeTranscript({ filePath: fp });
    // 3 snapshots of msg_S dedupe to 1 (last has output 200), plus msg_T = 2 deduped
    assert.equal(r.dedupedCount, 2);
    assert.equal(r.recordCount, 4); // 4 usage-bearing records
    assert.equal(r.input, 500 + 100); // 600 (NOT 500*3+100=1600 — that's the bug we prevent)
    assert.equal(r.output, 200 + 25); // 225 (NOT 10+50+200+25=285)
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("analyzeTranscript — slices after compact marker", () => {
  const { dir, fp } = makeTmpTranscript([
    JSON.stringify({
      type: "assistant",
      message: { id: "msg_PRE", usage: { input_tokens: 999_999, output_tokens: 999_999 } },
    }),
    JSON.stringify({ type: "system", isCompactSummary: true, content: "compacted..." }),
    JSON.stringify({
      type: "assistant",
      message: { id: "msg_POST", usage: { input_tokens: 100, output_tokens: 20 } },
    }),
  ]);
  try {
    const r = analyzeTranscript({ filePath: fp });
    // Only post-compact message should be counted
    assert.equal(r.input, 100);
    assert.equal(r.output, 20);
    assert.equal(r.dedupedCount, 1);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("analyzeTranscript — adversarial: malformed JSONL lines skipped, valid ones counted", () => {
  const { dir, fp } = makeTmpTranscript([
    "garbage line not json",
    JSON.stringify({
      type: "assistant",
      message: { id: "msg_A", usage: { input_tokens: 100, output_tokens: 10 } },
    }),
    '{"truncated":', // partial
    JSON.stringify({
      type: "assistant",
      message: { id: "msg_B", usage: { input_tokens: 200, output_tokens: 20 } },
    }),
  ]);
  try {
    const r = analyzeTranscript({ filePath: fp });
    assert.equal(r.dedupedCount, 2);
    assert.equal(r.input, 300);
    assert.equal(r.output, 30);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("analyzeTranscript — tail-byte cap honored", () => {
  // Write a HUGE file (10MB of irrelevant data), then a small valid record
  // — with maxBytes=2KB we should only see the trailing record.
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "prism-ta-"));
  const fp = path.join(dir, "session.jsonl");
  try {
    // 10MB of junk lines (well above default 4MB cap)
    const junkLine = JSON.stringify({ type: "user", message: "x".repeat(1000) }) + "\n";
    const stream = fs.openSync(fp, "w");
    for (let i = 0; i < 10_000; i++) fs.writeSync(stream, junkLine);
    // Trailing valid usage record
    fs.writeSync(
      stream,
      JSON.stringify({
        type: "assistant",
        message: { id: "msg_END", usage: { input_tokens: 42, output_tokens: 7 } },
      }) + "\n",
    );
    fs.closeSync(stream);
    const r = analyzeTranscript({ filePath: fp, maxBytes: 2048 });
    assert.equal(r.input, 42);
    assert.equal(r.output, 7);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// ── tailReadTranscript directly ────────────────────────────────────────────
test("tailReadTranscript — empty filepath → empty string", () => {
  assert.equal(tailReadTranscript(""), "");
  assert.equal(tailReadTranscript(null), "");
});

// ── fail-on-revert regression oracle ───────────────────────────────────────
test("regression: triple-snapshot dedup MUST NOT triple-count", () => {
  // If this test fails, dedupByMessageId stopped honoring last-write-wins
  // and the cumulative counter is over-counting Claude's streaming snapshots.
  const recs = [
    { id: "msg_R", input: 1000, output: 100, cache_creation: 0, cache_read: 0 },
    { id: "msg_R", input: 1000, output: 100, cache_creation: 0, cache_read: 0 },
    { id: "msg_R", input: 1000, output: 100, cache_creation: 0, cache_read: 0 },
  ];
  const deduped = dedupByMessageId(recs);
  const s = sumCumulative(deduped);
  assert.equal(s.input, 1000); // NOT 3000
});

// ── extractLatestCtx — most-recent-turn context-window extraction ──────────
test("extractLatestCtx — missing/null filepath → null", () => {
  assert.equal(extractLatestCtx({ filePath: null }), null);
  assert.equal(extractLatestCtx({ filePath: "/nonexistent/x.jsonl" }), null);
});

test("extractLatestCtx — no usage records → null", () => {
  const { dir, fp } = makeTmpTranscript([
    JSON.stringify({ type: "user", message: "hi" }),
    JSON.stringify({ type: "user", message: "bye" }),
  ]);
  try {
    assert.equal(extractLatestCtx({ filePath: fp }), null);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("extractLatestCtx — returns latest usage block (NOT a sum)", () => {
  const { dir, fp } = makeTmpTranscript([
    JSON.stringify({
      type: "assistant",
      message: {
        id: "msg_A",
        usage: { input_tokens: 100, output_tokens: 50, cache_creation_input_tokens: 200, cache_read_input_tokens: 0 },
      },
    }),
    JSON.stringify({
      type: "assistant",
      message: {
        id: "msg_B",
        usage: { input_tokens: 500, output_tokens: 100, cache_creation_input_tokens: 1000, cache_read_input_tokens: 750_000 },
      },
    }),
  ]);
  try {
    const r = extractLatestCtx({ filePath: fp });
    assert.ok(r);
    assert.equal(r.tokens, 500 + 1000 + 750_000);
    assert.equal(r.source, "usage-block");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("extractLatestCtx — output_tokens NOT included (ctx is input-side only)", () => {
  // Regression oracle: if "fixed" to include output, HP-bar over-reports.
  const { dir, fp } = makeTmpTranscript([
    JSON.stringify({
      type: "assistant",
      message: {
        id: "msg_X",
        usage: { input_tokens: 10, output_tokens: 999_999, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 },
      },
    }),
  ]);
  try {
    const r = extractLatestCtx({ filePath: fp });
    assert.equal(r.tokens, 10);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("extractLatestCtx — respects compact-boundary slicing (pre-compact ignored)", () => {
  const { dir, fp } = makeTmpTranscript([
    JSON.stringify({
      type: "assistant",
      message: {
        id: "msg_PRE",
        usage: { input_tokens: 999_000, output_tokens: 0, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 },
      },
    }),
    JSON.stringify({ type: "system", isCompactSummary: true, content: "compacted..." }),
    JSON.stringify({
      type: "assistant",
      message: {
        id: "msg_POST",
        usage: { input_tokens: 200, output_tokens: 50, cache_creation_input_tokens: 100, cache_read_input_tokens: 5000 },
      },
    }),
  ]);
  try {
    const r = extractLatestCtx({ filePath: fp });
    assert.equal(r.tokens, 200 + 100 + 5000);
    assert.equal(r.hadCompactBoundary, true);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("extractLatestCtx — skips records with all-zero usage", () => {
  const { dir, fp } = makeTmpTranscript([
    JSON.stringify({
      type: "assistant",
      message: {
        id: "msg_GOOD",
        usage: { input_tokens: 50, output_tokens: 25, cache_creation_input_tokens: 75, cache_read_input_tokens: 1000 },
      },
    }),
    JSON.stringify({
      type: "assistant",
      message: {
        id: "msg_EMPTY",
        usage: { input_tokens: 0, output_tokens: 0, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 },
      },
    }),
  ]);
  try {
    const r = extractLatestCtx({ filePath: fp });
    assert.equal(r.tokens, 50 + 75 + 1000);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("regression: extractLatestCtx MUST report ctx for the india-repro shape (>4MB tail, no marker)", () => {
  // Fail-on-revert oracle for the HP-bar dash-rendering bug. If this fails,
  // ctx will silently render "—" for any chat whose transcript exceeded 4MB
  // before its last /compact.
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "prism-ta-"));
  const fp = path.join(dir, "session.jsonl");
  try {
    const stream = fs.openSync(fp, "w");
    const junkLine = JSON.stringify({ type: "user", message: "y".repeat(3000) }) + "\n";
    for (let i = 0; i < 2000; i++) fs.writeSync(stream, junkLine);
    fs.writeSync(
      stream,
      JSON.stringify({
        type: "assistant",
        message: {
          id: "msg_TAIL",
          usage: { input_tokens: 1000, output_tokens: 100, cache_creation_input_tokens: 5000, cache_read_input_tokens: 500_000 },
        },
      }) + "\n",
    );
    fs.closeSync(stream);
    const r = extractLatestCtx({ filePath: fp });
    assert.notEqual(r, null);
    assert.ok(r.tokens > 0);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("regression: COMPACT_MARKER string MUST match statusline + precompact gate", () => {
  // Same magic string as statusline.mjs:84 and precompact-auto-trigger.mjs.
  // Drift would silently break compact-boundary slicing across all 3 surfaces.
  assert.equal(COMPACT_MARKER, '"isCompactSummary":true');
});

// ── single-read refactor (P0) — readTranscriptTail + *FromText variants ─────
test("readTranscriptTail — missing / null filePath → { raw:'', active:'' }", () => {
  assert.deepEqual(readTranscriptTail(null), { raw: "", active: "" });
  assert.deepEqual(readTranscriptTail(""), { raw: "", active: "" });
  assert.deepEqual(readTranscriptTail("/nonexistent/path/x.jsonl"), { raw: "", active: "" });
});

test("readTranscriptTail — no compact marker → active === raw", () => {
  const { dir, fp } = makeTmpTranscript([JSON.stringify({ a: 1 }), JSON.stringify({ b: 2 })]);
  try {
    const t = readTranscriptTail(fp);
    assert.equal(t.active, t.raw);
    assert.ok(t.raw.includes('"a":1'));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("readTranscriptTail — with marker → raw is full tail, active is post-slice", () => {
  const { dir, fp } = makeTmpTranscript([
    JSON.stringify({ pre: 1 }),
    JSON.stringify({ type: "system", isCompactSummary: true }),
    JSON.stringify({ post: 1 }),
  ]);
  try {
    const t = readTranscriptTail(fp);
    assert.ok(t.raw.includes('"pre":1'), "raw keeps pre-compact content");
    assert.ok(!t.active.includes('"pre":1'), "active drops pre-compact content");
    assert.ok(t.active.includes('"post":1'), "active keeps post-compact content");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("readTranscriptTail — performs exactly ONE disk open (single-read primitive)", () => {
  // P0 intent: the whole point of the refactor — one open, not four.
  const { dir, fp } = makeTmpTranscript([
    JSON.stringify({ type: "assistant", message: { id: "m", usage: { input_tokens: 5 } } }),
  ]);
  const realOpen = fs.openSync;
  let opens = 0;
  fs.openSync = (...a) => {
    opens++;
    return realOpen(...a);
  };
  try {
    readTranscriptTail(fp);
    assert.equal(opens, 1, "readTranscriptTail must open the transcript exactly once");
  } finally {
    fs.openSync = realOpen;
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("analyzeTranscriptFromText + extractLatestCtxFromText — pure, ZERO disk I/O", () => {
  // P0 intent: the *FromText variants operate on already-read text so the
  // sidecar can read the 4MB tail ONCE and feed both. Any disk I/O here is a bug.
  const realOpen = fs.openSync;
  const realRead = fs.readSync;
  let io = 0;
  fs.openSync = () => {
    io++;
    throw new Error("no I/O expected in *FromText");
  };
  fs.readSync = () => {
    io++;
    throw new Error("no I/O expected in *FromText");
  };
  try {
    const line = JSON.stringify({
      type: "assistant",
      message: { id: "m", usage: { input_tokens: 7, cache_read_input_tokens: 3 } },
    });
    const tail = { raw: line + "\n", active: line + "\n" };
    const a = analyzeTranscriptFromText(tail);
    const c = extractLatestCtxFromText(tail);
    assert.equal(io, 0, "*FromText variants must not touch disk");
    assert.equal(a.input, 7);
    assert.equal(c.tokens, 7 + 3);
  } finally {
    fs.openSync = realOpen;
    fs.readSync = realRead;
  }
});

test("FromText variants produce IDENTICAL output to the file-reading variants", () => {
  // Equivalence oracle: the refactor must preserve behavior exactly — same
  // answer, fewer reads. Includes a compact boundary + streamed dedup.
  const { dir, fp } = makeTmpTranscript([
    JSON.stringify({ type: "assistant", message: { id: "msg_PRE", usage: { input_tokens: 9_000 } } }),
    JSON.stringify({ type: "system", isCompactSummary: true, content: "x" }),
    JSON.stringify({
      type: "assistant",
      message: { id: "msg_A", usage: { input_tokens: 100, output_tokens: 5, cache_creation_input_tokens: 50, cache_read_input_tokens: 800 } },
    }),
    JSON.stringify({
      type: "assistant",
      message: { id: "msg_A", usage: { input_tokens: 100, output_tokens: 40, cache_creation_input_tokens: 50, cache_read_input_tokens: 800 } },
    }),
  ]);
  try {
    const tail = readTranscriptTail(fp);
    assert.deepEqual(analyzeTranscriptFromText(tail), analyzeTranscript({ filePath: fp }));
    assert.deepEqual(extractLatestCtxFromText(tail), extractLatestCtx({ filePath: fp }));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("analyzeTranscriptFromText — null / garbage tail → zeros, never throws", () => {
  for (const bad of [null, undefined, "a string", 42, {}, { raw: "" }]) {
    const r = analyzeTranscriptFromText(bad);
    assert.equal(r.input, 0);
    assert.equal(r.recordCount, 0);
    assert.equal(r.dedupedCount, 0);
  }
});

test("extractLatestCtxFromText — null / garbage / empty tail → null", () => {
  for (const bad of [null, undefined, "a string", 42, {}, { raw: "", active: "" }]) {
    assert.equal(extractLatestCtxFromText(bad), null);
  }
});

// ── isCompactSummary skip (P1c) ────────────────────────────────────────────
test("isCompactSummaryBlock — detects both record shapes, false otherwise", () => {
  assert.equal(isCompactSummaryBlock({ isCompactSummary: true }), true);
  assert.equal(isCompactSummaryBlock({ message: { isCompactSummary: true } }), true);
  assert.equal(isCompactSummaryBlock({ type: "assistant", message: { usage: {} } }), false);
  assert.equal(isCompactSummaryBlock({ isCompactSummary: "true" }), false); // string, not bool
  assert.equal(isCompactSummaryBlock(null), false);
  assert.equal(isCompactSummaryBlock("nope"), false);
});

test("extractLatestCtxFromText — skips a trailing compact-summary record (P1c guard)", () => {
  // A compact-summary record's usage reflects the pre-compact prefix Claude
  // READ to write the summary — counting it over-states ctx by one turn. The
  // reverse walk must skip it and return the prior real turn. Fail-on-revert:
  // if the isCompactSummaryBlock guard is removed this returns 950_000.
  const realTurn = JSON.stringify({
    type: "assistant",
    message: { id: "real", usage: { input_tokens: 300, cache_read_input_tokens: 2000 } },
  });
  const summaryWithUsage = JSON.stringify({
    type: "assistant",
    isCompactSummary: true,
    message: { id: "sum", usage: { input_tokens: 950_000, cache_read_input_tokens: 0 } },
  });
  const active = realTurn + "\n" + summaryWithUsage + "\n";
  const r = extractLatestCtxFromText({ raw: active, active });
  assert.ok(r, "must still find the real turn");
  assert.equal(r.tokens, 300 + 2000, "must report the real turn, not the compact-summary's inflated usage");
});
