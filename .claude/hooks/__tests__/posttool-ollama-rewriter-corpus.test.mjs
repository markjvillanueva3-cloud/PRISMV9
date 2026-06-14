// Tests for posttool-ollama-rewriter-corpus.mjs
// SHIPPED: 2026-05-24 (PSN-OLLAMA-LORA-MS0/U-CORPUS01, slot:alpha)
//
// Verifies the pure helpers used by the LoRA-corpus collector hook:
//   - shouldRecord    (gate predicate)
//   - sha8            (deterministic fingerprint)
//   - extractCorpusRecord (record builder)
//   - shouldThrottle  (rate-limit predicate)
//   - readMostRecentSuccess (newest-success tail scan)
//
// Run: node --test H:/prism/.claude/hooks/__tests__/posttool-ollama-rewriter-corpus.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { promises as fsp } from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  shouldRecord,
  sha8,
  extractCorpusRecord,
  shouldThrottle,
  readMostRecentSuccess,
} from "../posttool-ollama-rewriter-corpus.mjs";

// ── Fixtures ─────────────────────────────────────────────────────────
const FIXED_TS = new Date("2026-05-24T12:00:00.000Z");

function validEntry(overrides = {}) {
  return {
    ts: "2026-05-24T11:59:00.000Z",
    session: "sess-001",
    raw: "build the Ollama LoRA fine-tuning corpus collector hook",
    rewrite: {
      goal: "ship a PostToolUse hook that records rewrite pairs",
      implicit_constraints: ["dont break tests"],
      file_paths: [".claude/hooks/posttool-ollama-rewriter-corpus.mjs"],
      acceptance_criteria: ["hook exits 0", "corpus jsonl grows by 1 line"],
      variability_axes: [],
      scope: "narrow",
      confidence: 0.92,
    },
    model: "qwen2.5-coder:7b",
    latency_ms: 1832,
  };
}

// ── shouldRecord ─────────────────────────────────────────────────────

test("shouldRecord: valid success entry returns true", () => {
  assert.equal(shouldRecord(validEntry()), true);
});

test("shouldRecord: entry with skip_reason returns false", () => {
  const e = validEntry();
  e.skip_reason = "low-confidence-calibrated";
  assert.equal(shouldRecord(e), false);
});

test("shouldRecord: entry with null rewrite returns false (failed call)", () => {
  const e = validEntry();
  e.rewrite = null;
  e.skip_reason = "ollama-offline";
  assert.equal(shouldRecord(e), false);
});

test("shouldRecord: entry with rewrite.skip:true returns false (model self-skip)", () => {
  const e = validEntry();
  e.rewrite = { skip: true };
  assert.equal(shouldRecord(e), false);
});

test("shouldRecord: empty raw prompt returns false", () => {
  const e = validEntry();
  e.raw = "";
  assert.equal(shouldRecord(e), false);
});

test("shouldRecord: missing model returns false", () => {
  const e = validEntry();
  delete e.model;
  assert.equal(shouldRecord(e), false);
});

test("shouldRecord: non-object input returns false", () => {
  assert.equal(shouldRecord(null), false);
  assert.equal(shouldRecord(undefined), false);
  assert.equal(shouldRecord("not an object"), false);
  assert.equal(shouldRecord(42), false);
});

// ── sha8 ─────────────────────────────────────────────────────────────

test("sha8: deterministic for the same raw prompt", () => {
  const a = sha8("build the corpus collector");
  const b = sha8("build the corpus collector");
  assert.equal(a, b);
  assert.equal(a.length, 8);
  assert.match(a, /^[0-9a-f]{8}$/);
});

test("sha8: different inputs produce different prefixes (with extremely high probability)", () => {
  const a = sha8("prompt one");
  const b = sha8("prompt two");
  assert.notEqual(a, b);
});

test("sha8: handles null/undefined without throwing", () => {
  assert.equal(typeof sha8(null), "string");
  assert.equal(typeof sha8(undefined), "string");
  assert.equal(sha8(null).length, 8);
});

// ── extractCorpusRecord ──────────────────────────────────────────────

test("extractCorpusRecord: valid entry → complete record", () => {
  const rec = extractCorpusRecord(validEntry(), FIXED_TS);
  assert.ok(rec, "record should be non-null");
  assert.equal(rec.ts, FIXED_TS.toISOString());
  assert.equal(rec.raw_prompt_sha8.length, 8);
  assert.equal(rec.model, "qwen2.5-coder:7b");
  assert.equal(typeof rec.raw_len, "number");
  assert.equal(typeof rec.rewrite_len, "number");
  assert.equal(typeof rec.savings_pct, "number");
  assert.equal(typeof rec.raw_sample, "string");
  assert.equal(typeof rec.rewrite_sample, "string");
  assert.ok(rec.raw_len > 0);
  assert.ok(rec.rewrite_len > 0);
});

test("extractCorpusRecord: missing rewrite → null", () => {
  const e = validEntry();
  e.rewrite = null;
  assert.equal(extractCorpusRecord(e, FIXED_TS), null);
});

test("extractCorpusRecord: malformed entry → null", () => {
  assert.equal(extractCorpusRecord({}, FIXED_TS), null);
  assert.equal(extractCorpusRecord(null, FIXED_TS), null);
  assert.equal(extractCorpusRecord({ raw: "x" }, FIXED_TS), null); // missing rewrite + model
});

test("extractCorpusRecord: strips hook-internal calibration metadata", () => {
  const e = validEntry();
  e.rewrite.confidence_raw = 0.85;
  e.rewrite.calibration = ["+verbatim-grounding", "+doctrine-aware"];
  const rec = extractCorpusRecord(e, FIXED_TS);
  assert.ok(rec);
  assert.equal(rec.rewrite_sample.includes("confidence_raw"), false,
    "rewrite_sample should NOT include hook-internal calibration field");
  assert.equal(rec.rewrite_sample.includes("calibration"), false,
    "rewrite_sample should NOT include the calibration array");
});

test("extractCorpusRecord: huge raw prompt (>100KB) → samples are truncated", () => {
  const e = validEntry();
  e.raw = "x".repeat(120_000); // 120 KB
  const rec = extractCorpusRecord(e, FIXED_TS);
  assert.ok(rec);
  assert.equal(rec.raw_len, 120_000, "raw_len records the TRUE length");
  assert.ok(rec.raw_sample.length <= 120, "raw_sample is capped at 120 chars");
  assert.equal(rec.raw_sample.length, 120);
  // savings_pct should be very negative — JSON rewrite is far smaller than the
  // 120KB raw prompt — sanity-check that the math didn't blow up
  assert.equal(Number.isFinite(rec.savings_pct), true);
});

test("extractCorpusRecord: SHA-8 is deterministic across calls for same raw", () => {
  const e = validEntry();
  const a = extractCorpusRecord(e, FIXED_TS);
  const b = extractCorpusRecord(e, FIXED_TS);
  assert.equal(a.raw_prompt_sha8, b.raw_prompt_sha8);
});

test("extractCorpusRecord: savings_pct is an integer percentage", () => {
  const rec = extractCorpusRecord(validEntry(), FIXED_TS);
  assert.ok(Number.isInteger(rec.savings_pct), "savings_pct must be integer");
});

// ── shouldThrottle ────────────────────────────────────────────────────

test("shouldThrottle: empty state → false (never throttled on first append)", () => {
  assert.equal(shouldThrottle({}, 1_000_000), false);
  assert.equal(shouldThrottle(null, 1_000_000), false);
});

test("shouldThrottle: recent append (within 5s) → true", () => {
  const now = 1_000_000_000;
  assert.equal(shouldThrottle({ lastAppendAt: now - 2000 }, now), true);
  assert.equal(shouldThrottle({ lastAppendAt: now - 4999 }, now), true);
});

test("shouldThrottle: stale append (≥5s) → false", () => {
  const now = 1_000_000_000;
  assert.equal(shouldThrottle({ lastAppendAt: now - 5000 }, now), false);
  assert.equal(shouldThrottle({ lastAppendAt: now - 9999 }, now), false);
});

test("shouldThrottle: custom throttleMs override", () => {
  const now = 1_000_000_000;
  assert.equal(shouldThrottle({ lastAppendAt: now - 500 }, now, 1000), true);
  assert.equal(shouldThrottle({ lastAppendAt: now - 1500 }, now, 1000), false);
});

// ── readMostRecentSuccess ─────────────────────────────────────────────

test("readMostRecentSuccess: returns null when log is missing", async () => {
  const missing = path.join(os.tmpdir(), `nonexistent-${Date.now()}.jsonl`);
  const result = await readMostRecentSuccess(missing);
  assert.equal(result, null);
});

test("readMostRecentSuccess: returns null when log has only failures/skips", async () => {
  const tmpFile = path.join(os.tmpdir(), `corpus-test-fails-${Date.now()}.jsonl`);
  const lines = [
    JSON.stringify({ ts: "t1", raw: "x", rewrite: null, skip_reason: "ollama-offline" }),
    JSON.stringify({ ts: "t2", raw: "y", rewrite: { skip: true }, skip_reason: "model-skip" }),
    JSON.stringify({ ts: "t3", raw: "", rewrite: { goal: "g" }, model: "m" }), // empty raw
  ];
  await fsp.writeFile(tmpFile, lines.join("\n") + "\n", "utf8");
  try {
    const result = await readMostRecentSuccess(tmpFile);
    assert.equal(result, null);
  } finally {
    await fsp.unlink(tmpFile).catch(() => {});
  }
});

test("readMostRecentSuccess: returns NEWEST success entry from a mixed log", async () => {
  const tmpFile = path.join(os.tmpdir(), `corpus-test-mixed-${Date.now()}.jsonl`);
  const lines = [
    JSON.stringify({ ts: "t1", raw: "older prompt", rewrite: { goal: "older" }, model: "qwen2.5-coder:7b" }),
    JSON.stringify({ ts: "t2", raw: "x", rewrite: null, skip_reason: "ollama-offline" }),
    JSON.stringify({ ts: "t3", raw: "newer prompt", rewrite: { goal: "newer" }, model: "qwen2.5-coder:7b" }),
    JSON.stringify({ ts: "t4", raw: "x", rewrite: null, skip_reason: "timeout" }),
    "not valid json at all",
  ];
  await fsp.writeFile(tmpFile, lines.join("\n") + "\n", "utf8");
  try {
    const result = await readMostRecentSuccess(tmpFile);
    assert.ok(result, "result should be non-null");
    assert.equal(result.raw, "newer prompt", "must return the NEWEST success");
    assert.equal(result.rewrite.goal, "newer");
  } finally {
    await fsp.unlink(tmpFile).catch(() => {});
  }
});

test("readMostRecentSuccess: tolerates corrupt/empty lines without throwing", async () => {
  const tmpFile = path.join(os.tmpdir(), `corpus-test-corrupt-${Date.now()}.jsonl`);
  const lines = [
    "",
    "{ partial json",
    JSON.stringify({ ts: "t1", raw: "good", rewrite: { goal: "g" }, model: "qwen2.5-coder:7b" }),
    "",
    "{}",
  ];
  await fsp.writeFile(tmpFile, lines.join("\n"), "utf8");
  try {
    const result = await readMostRecentSuccess(tmpFile);
    assert.ok(result);
    assert.equal(result.raw, "good");
  } finally {
    await fsp.unlink(tmpFile).catch(() => {});
  }
});
