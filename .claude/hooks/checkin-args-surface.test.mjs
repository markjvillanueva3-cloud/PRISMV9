// Tests for checkin-args-surface — the deterministic /checkin work-order belt.
// Run: node --test H:/prism/.claude/hooks/checkin-args-surface.test.mjs
//
// These assert the EXACT discrimination the hook exists for: a bare check-in
// must stay silent (zero behavior change), but a check-in carrying a real
// directive must yield that directive verbatim so it can be re-surfaced.

import { test } from "node:test";
import assert from "node:assert/strict";
import { extractWorkOrder } from "./checkin-args-surface.mjs";

test("bare /checkin → no work order (must stay silent)", () => {
  assert.equal(extractWorkOrder("/checkin"), "");
  assert.equal(extractWorkOrder("  /checkin  "), "");
});

test("bare /checkin-<slot> → no work order", () => {
  assert.equal(extractWorkOrder("/checkin-bravo"), "");
  assert.equal(extractWorkOrder("/checkin-juliett "), "");
});

test("the reported bug: /checkin-bravo + real directive → directive surfaces verbatim", () => {
  assert.equal(
    extractWorkOrder("/checkin-bravo continue docustrata and print work until complete /loop /goal"),
    "continue docustrata and print work until complete /loop /goal",
  );
});

test("flags are stripped, free text kept", () => {
  assert.equal(
    extractWorkOrder("/checkin --topic git-tree-work /loop build the thing"),
    "/loop build the thing",
  );
  assert.equal(
    extractWorkOrder("/checkin-alpha --force true --confirmRecent true continue HTML stack"),
    "continue HTML stack",
  );
});

test("flag-only check-in is NOT a work order (config, not a directive)", () => {
  assert.equal(extractWorkOrder("/checkin --roadmap devtools"), "");
  assert.equal(extractWorkOrder("/checkin --golf"), "");
  assert.equal(extractWorkOrder("/checkin --topic foo --no-loop"), "");
  assert.equal(extractWorkOrder("/checkin-bravo --force true --confirmRecent true"), "");
});

test("unknown -- flags are dropped, not treated as work order", () => {
  assert.equal(extractWorkOrder("/checkin --some-future-flag"), "");
  assert.equal(extractWorkOrder("/checkin --x continue the build"), "continue the build");
});

test("word boundary: /checkindolthing must NOT match", () => {
  assert.equal(extractWorkOrder("/checkindolthing please"), "");
  assert.equal(extractWorkOrder("/checkinx do stuff"), "");
});

test("only first line is args; a multi-line paste body is not the work order", () => {
  assert.equal(
    extractWorkOrder("/checkin-bravo fix the parser\n\nhere is a big pasted log\nline2\nline3"),
    "fix the parser",
  );
});

test("non-checkin prompt → empty (hook stays inert)", () => {
  assert.equal(extractWorkOrder("please continue the docustrata work"), "");
  assert.equal(extractWorkOrder("/handoff"), "");
  assert.equal(extractWorkOrder(""), "");
});

test("non-string input is safe", () => {
  assert.equal(extractWorkOrder(null), "");
  assert.equal(extractWorkOrder(undefined), "");
  assert.equal(extractWorkOrder(42), "");
  assert.equal(extractWorkOrder({}), "");
});

test("value-flag at end with no value does not throw and yields empty", () => {
  assert.equal(extractWorkOrder("/checkin --topic"), "");
  assert.equal(extractWorkOrder("/checkin-bravo --slot"), "");
});

test("real directive after value flag whose value is consumed", () => {
  assert.equal(
    extractWorkOrder("/checkin-echo --preferSlot echo --topic wedm-cal run the wedm calibration sweep"),
    "run the wedm calibration sweep",
  );
});

test("P1-1: forgotten flag-value does NOT swallow a real work-order token", () => {
  // `--slot` with no value, followed by real directive: the directive must
  // survive (graceful degrade), not be eaten as the flag's value.
  assert.equal(extractWorkOrder("/checkin --slot fix the parser bug"), "fix the parser bug");
  // value present + real directive after → value consumed, directive kept.
  assert.equal(extractWorkOrder("/checkin --slot bravo fix the parser bug"), "fix the parser bug");
  // two value-flags back to back, second's value forgotten, then directive.
  assert.equal(extractWorkOrder("/checkin --topic t --slot continue the build"), "continue the build");
});

test("oversized prompt is bounded (no hang) and still extracts the head directive", () => {
  const big = "/checkin-bravo do the thing " + "x".repeat(50000);
  const r = extractWorkOrder(big);
  assert.ok(r.startsWith("do the thing"));
  assert.ok(r.length <= 8000);
});
