/**
 * Tests for octopus-consensus-query.mjs (U-VIZ-OCTOPUS-QUERY, slot:sierra).
 * Real reference values computed by hand from the fixture below -- a test that
 * fails when the aggregation logic changes (R9: verifies intent, not a stub).
 * Run: node scripts/lib/octopus-consensus-query.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  callerName,
  decisionText,
  aggregateConsensus,
  formatConsensus,
} from "./octopus-consensus-query.mjs";

// Fixture: 4 records, 3 distinct callers (EngA x2, EngB x1, "" -> unknown x1).
const FIXTURE = [
  { callerEngine: "EngA", ts: "2026-01-01T00:00:00Z", agreement: 0.4, finalDecision: "do X", voices: ["claude", "gpt-5.5"] },
  { callerEngine: "EngA", ts: "2026-01-03T00:00:00Z", agreement: 0.6, finalDecision: "do Y", voices: ["claude", "deepseek"] },
  { callerEngine: "EngB", ts: "2026-01-02T00:00:00Z", agreement: 0.2, finalDecision: "", voices: ["gemini"] },
  { callerEngine: "", ts: "2026-01-04T00:00:00Z", agreement: "oops", finalDecision: null, voices: ["claude", 123] },
];

const close = (a, b, eps = 1e-9) => Math.abs(a - b) < eps;

test("callerName falls back to 'unknown' for empty/missing", () => {
  assert.equal(callerName({ callerEngine: "Mill" }), "Mill");
  assert.equal(callerName({ callerEngine: "" }), "unknown");
  assert.equal(callerName({}), "unknown");
  assert.equal(callerName(null), "unknown");
});

test("decisionText falls back to '(no-decision)' for empty/non-string", () => {
  assert.equal(decisionText("ship it"), "ship it");
  assert.equal(decisionText(""), "(no-decision)");
  assert.equal(decisionText(null), "(no-decision)");
  assert.equal(decisionText(42), "(no-decision)");
});

test("aggregateConsensus totals + caller ordering + avg agreement (reference values)", () => {
  const agg = aggregateConsensus(FIXTURE);
  assert.equal(agg.total, 4);
  assert.equal(agg.callerFilter, null);

  // 3 callers; most-active first (EngA=2), then count-1 tie broken by name (EngB < unknown).
  assert.deepEqual(agg.callers.map((c) => c.caller), ["EngA", "EngB", "unknown"]);
  assert.deepEqual(agg.callers.map((c) => c.count), [2, 1, 1]);

  // EngA: (0.4 + 0.6) / 2 = 0.5 exactly; latest by ts is the 01-03 record.
  assert.ok(close(agg.callers[0].avgAgreement, 0.5));
  assert.equal(agg.callers[0].latest.finalDecision, "do Y");
  assert.equal(agg.callers[0].latest.ts, "2026-01-03T00:00:00Z");

  // EngB: single 0.2; empty finalDecision -> "(no-decision)".
  assert.ok(close(agg.callers[1].avgAgreement, 0.2));
  assert.equal(agg.callers[1].latest.finalDecision, "(no-decision)");

  // unknown: non-finite agreement ("oops") skipped -> avg null.
  assert.equal(agg.callers[2].avgAgreement, null);

  // Overall avg over the 3 finite agreements: (0.4 + 0.6 + 0.2) / 3 = 0.4.
  assert.ok(close(agg.avgAgreement, 0.4));
});

test("aggregateConsensus voices union dedups + sorts + drops non-strings", () => {
  const agg = aggregateConsensus(FIXTURE);
  assert.deepEqual(agg.voices, ["claude", "deepseek", "gemini", "gpt-5.5"]);
});

test("aggregateConsensus latest-overall is the newest ts across all callers", () => {
  const agg = aggregateConsensus(FIXTURE);
  assert.equal(agg.latest.ts, "2026-01-04T00:00:00Z");
  assert.equal(agg.latest.caller, "unknown");
  assert.equal(agg.latest.finalDecision, "(no-decision)");
  assert.equal(agg.latest.agreement, null); // non-finite -> null
});

test("aggregateConsensus caller filter is case-insensitive", () => {
  const agg = aggregateConsensus(FIXTURE, { caller: "enga" });
  assert.equal(agg.total, 2);
  assert.equal(agg.callerFilter, "enga");
  assert.deepEqual(agg.callers.map((c) => c.caller), ["EngA"]);
  assert.ok(close(agg.avgAgreement, 0.5));
});

test("aggregateConsensus is fail-soft on empty / non-array / junk input", () => {
  for (const bad of [[], null, undefined, 42, "x", [null, 1, "y", {}]]) {
    const agg = aggregateConsensus(bad);
    assert.ok(Number.isInteger(agg.total));
    assert.ok(Array.isArray(agg.callers));
    assert.ok(Array.isArray(agg.voices));
  }
  // [{}] -> one record, caller "unknown", no voices/agreement.
  const one = aggregateConsensus([{}]);
  assert.equal(one.total, 1);
  assert.equal(one.callers[0].caller, "unknown");
  assert.equal(one.avgAgreement, null);
});

test("formatConsensus renders the headline + per-caller + voices lines", () => {
  const out = formatConsensus(aggregateConsensus(FIXTURE));
  assert.match(out, /4 decision\(s\) \| 3 caller\(s\)/);
  assert.match(out, /avg agreement 0\.40/);
  assert.match(out, /voices: claude, deepseek, gemini, gpt-5\.5/);
  assert.match(out, /EngA: 2 decision\(s\)/);
  // Empty caller filter -> no "(caller=...)" scope tag.
  assert.doesNotMatch(out, /\(caller=/);
});
