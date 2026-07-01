/**
 * Tests for lastJson -- the subprocess-stdout JSON extractor.
 * Run: node scripts/lib/harness-last-json.test.mjs   (node:test auto-runs on exit).
 *
 * R9: each case encodes WHY -- the multi-line case is the exact bug that made
 * the lathe closed-loop driver report rung_a=null over real harness output.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { lastJson } from "./harness-last-json.mjs";

test("single-line JSON parses", () => {
  assert.deepEqual(lastJson('{"analyzed":16558,"ok":true}'), { analyzed: 16558, ok: true });
});

test("pretty multi-line JSON parses (the bug: previously returned null)", () => {
  const s = '{\n  "ok": true,\n  "analyzed": 34993,\n  "overspeed_risk": 545\n}';
  const r = lastJson(s);
  assert.equal(r.analyzed, 34993);
  assert.equal(r.overspeed_risk, 545);
});

test("JSON preceded by log lines: brace-match picks the trailing object", () => {
  const s = '[info] walking corpus\n[info] parsed 600\n{\n  "analyzed": 600\n}';
  assert.equal(lastJson(s).analyzed, 600);
});

test("trailing object after a non-JSON brace line is still recovered", () => {
  const s = 'note: use {curly} carefully\n{"feed_p50":0.0033,"ok":true}';
  assert.equal(lastJson(s).feed_p50, 0.0033);
});

test("nested braces inside the object are balanced correctly", () => {
  assert.deepEqual(lastJson('{"a":{"b":1},"c":2}'), { a: { b: 1 }, c: 2 });
});

test("empty / garbage / null inputs fail soft to null", () => {
  assert.equal(lastJson(""), null);
  assert.equal(lastJson("no json on this line"), null);
  assert.equal(lastJson(null), null);
  assert.equal(lastJson(undefined), null);
});

test("malformed trailing braces return null, not a throw", () => {
  assert.equal(lastJson("{ not: valid json }"), null);
});
