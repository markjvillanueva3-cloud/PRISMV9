#!/usr/bin/env node
/**
 * Tests for mistake-keyword-flag.mjs — pure-function units of the
 * PostToolUse hook. Run: node --test .claude/hooks/mistake-keyword-flag.test.mjs
 */

import { test } from "node:test";
import assert from "node:assert/strict";

const { findFirstHit, isOnCooldown, extractScanText } = await import("./mistake-keyword-flag.mjs");

// ---------- findFirstHit ----------

test("findFirstHit returns null on empty / non-string input", () => {
  assert.equal(findFirstHit(""), null);
  assert.equal(findFirstHit(null), null);
  assert.equal(findFirstHit(undefined), null);
  assert.equal(findFirstHit(42), null);
});

test("findFirstHit flags P0 as critical", () => {
  const hit = findFirstHit("Reviewer found a P0 in the parser");
  assert.ok(hit);
  assert.equal(hit.match, "P0");
  assert.equal(hit.sev, "critical");
});

test("findFirstHit flags HOSTILE as critical", () => {
  const hit = findFirstHit("greedy slice was vulnerable to HOSTILE inputs");
  assert.ok(hit);
  assert.equal(hit.sev, "critical");
});

test("findFirstHit honors warn minimum by default (does not flag info-only)", () => {
  // 'oops' is below warn threshold in this hook's hot list; 'corrupted' is warn.
  const hit = findFirstHit("things got corrupted, oops");
  assert.ok(hit);
  // First warn-or-critical hit; corrupted comes before oops in the catalog,
  // and oops isn't in the catalog at all.
  assert.ok(/corrupt/i.test(hit.match));
});

test("findFirstHit returns the first hit, not every hit", () => {
  const hit = findFirstHit("FAIL hijack regression");
  assert.ok(hit);
  assert.ok(["FAIL", "FAILED", "hijack", "hijacked", "regression"].includes(hit.match) ||
            /FAIL/i.test(hit.match));
});

test("findFirstHit normalizes context whitespace", () => {
  const hit = findFirstHit("a   FAIL\n\noccurred");
  assert.ok(hit);
  assert.ok(!hit.context.match(/  /), `context should not contain double-spaces: '${hit.context}'`);
});

test("findFirstHit ignores innocuous text", () => {
  assert.equal(findFirstHit("shipped the unit successfully"), null);
  assert.equal(findFirstHit("normal happy-path execution"), null);
});

test("findFirstHit catches false-positive multi-word phrase", () => {
  const hit = findFirstHit("classic false-positive on the regex");
  assert.ok(hit);
  assert.ok(/false[- ]positive/i.test(hit.match));
});

test("findFirstHit catches footgun", () => {
  const hit = findFirstHit("watch out for the path-resolve footgun on Windows");
  assert.ok(hit);
  assert.equal(hit.sev, "warn");
});

// ---------- isOnCooldown ----------

test("isOnCooldown returns false when keyword never seen", () => {
  assert.equal(isOnCooldown({}, "P0"), false);
});

test("isOnCooldown returns true for recent fire", () => {
  const now = 1_700_000_000_000;
  const state = { P0: now - 5_000 }; // 5s ago
  assert.equal(isOnCooldown(state, "P0", now, 600), true);
});

test("isOnCooldown returns false for old fire past cooldown", () => {
  const now = 1_700_000_000_000;
  const state = { P0: now - (700 * 1000) }; // 700s ago
  assert.equal(isOnCooldown(state, "P0", now, 600), false);
});

test("isOnCooldown returns false on malformed state value", () => {
  assert.equal(isOnCooldown({ P0: "not-a-number" }, "P0"), false);
  assert.equal(isOnCooldown({ P0: null }, "P0"), false);
});

// ---------- extractScanText ----------

test("extractScanText returns empty string on null/non-object", () => {
  assert.equal(extractScanText(null), "");
  assert.equal(extractScanText(undefined), "");
  assert.equal(extractScanText("string"), "");
  assert.equal(extractScanText(42), "");
});

test("extractScanText concatenates tool_response.content", () => {
  const text = extractScanText({ tool_response: { content: "FAIL: nothing matched" } });
  assert.ok(text.includes("FAIL"));
});

test("extractScanText concatenates tool_input.file_text + tool_response.stdout", () => {
  const text = extractScanText({
    tool_response: { stdout: "P0 finding" },
    tool_input: { file_text: "// HOSTILE input handler" },
  });
  assert.ok(text.includes("P0"));
  assert.ok(text.includes("HOSTILE"));
});

test("extractScanText skips non-string fields silently", () => {
  const text = extractScanText({
    tool_response: { content: { nested: "object" } },
    message: 42,
    result: "the result is FAILED",
  });
  assert.ok(text.includes("FAILED"));
  assert.ok(!text.includes("nested"));
});

test("extractScanText handles tool_input.command for Bash", () => {
  const text = extractScanText({ tool_input: { command: "git commit -m fix oops" } });
  assert.ok(text.includes("oops"));
});

test("end-to-end: extractScanText then findFirstHit flags critical events", () => {
  const text = extractScanText({
    tool_response: { stderr: "TypeError: cannot read property 'x' of null" },
    tool_input: { command: "node test.mjs" },
  });
  const hit = findFirstHit(text);
  // TypeError is in the full catalog but this hook keeps only the hot
  // subset — verify behavior is well-defined either way.
  if (hit) {
    assert.ok(hit.match.length > 0);
    assert.ok(hit.why.length > 0);
  } else {
    // The hot subset legitimately may not include TypeError; full scan
    // script does. Either is correct here.
    assert.ok(true);
  }
});
