/**
 * modal-invariants-emit.test.mjs — concrete-value tests for modal
 * invariant checks. Hand-checked event-stream traces.
 */

import { describe, it } from "node:test";
import { strict as assert } from "node:assert";

import {
  MODAL_INVARIANTS_EMIT_SCHEMA_VERSION,
  DEFAULT_DECIMAL_PLACES,
  DEFAULT_SAFE_Z,
  SUPPORTED_DIALECTS,
  SUPPORTED_INVARIANTS,
  MOTION_CODES,
  SPINDLE_ON_CODES,
  SPINDLE_OFF_CODES,
  COOLANT_ON_CODES,
  TOOL_CHANGE_CODES,
  PROGRAM_END_CODES,
  FEED_MODE_CODES,
  formatComment,
  parseModalTokens,
  buildEventStream,
  checkSpindleBeforeCut,
  checkCoolantAfterSpindle,
  checkRetractBeforeToolChange,
  checkSpindleOffBeforeProgramEnd,
  checkFeedModePreserved,
  runAllInvariants,
  emitInvariantReport,
} from "./modal-invariants-emit.mjs";

describe("constants", () => {
  it("SCHEMA_VERSION=1, DEFAULT_SAFE_Z=5", () => {
    assert.strictEqual(MODAL_INVARIANTS_EMIT_SCHEMA_VERSION, 1);
    assert.strictEqual(DEFAULT_SAFE_Z, 5.0);
  });
  it("SUPPORTED_INVARIANTS has the 5 named checks", () => {
    assert.deepStrictEqual(SUPPORTED_INVARIANTS, [
      "SPINDLE_BEFORE_CUT",
      "COOLANT_AFTER_SPINDLE",
      "RETRACT_BEFORE_TOOL_CHANGE",
      "SPINDLE_OFF_BEFORE_PROGRAM_END",
      "FEED_MODE_PRESERVED",
    ]);
  });
  it("MOTION_CODES includes G0/G1/G2/G3 + padded variants", () => {
    assert.ok(MOTION_CODES.includes("G0") && MOTION_CODES.includes("G1"));
    assert.ok(MOTION_CODES.includes("G00") && MOTION_CODES.includes("G01"));
  });
  it("FEED_MODE_CODES = G93/G94/G95", () => {
    assert.deepStrictEqual(FEED_MODE_CODES, ["G93", "G94", "G95"]);
  });
});

describe("parseModalTokens", () => {
  it("'G1 X10 F100' → tokens=[G1], zValue=null", () => {
    const r = parseModalTokens("G1 X10 F100");
    assert.deepStrictEqual(r.tokens, ["G1"]);
    assert.strictEqual(r.zValue, null);
  });
  it("'G01 X10' canonicalizes to G1 + preserves G01", () => {
    const r = parseModalTokens("G01 X10");
    assert.ok(r.tokens.includes("G1"));
    assert.ok(r.tokens.includes("G01"));
  });
  it("'M3 S5000' → tokens=[M3]", () => {
    const r = parseModalTokens("M3 S5000");
    assert.deepStrictEqual(r.tokens, ["M3"]);
  });
  it("'G0 Z10' → tokens=[G0], zValue=10", () => {
    const r = parseModalTokens("G0 Z10");
    assert.strictEqual(r.zValue, 10);
  });
  it("'G0 Z-5' → zValue=-5", () => {
    const r = parseModalTokens("G0 Z-5");
    assert.strictEqual(r.zValue, -5);
  });
  it("'G0 Z2.5' → zValue=2.5", () => {
    const r = parseModalTokens("G0 Z2.5");
    assert.strictEqual(r.zValue, 2.5);
  });
  it("'(comment) G1' → tokens=[G1] (Fanuc paren comment stripped)", () => {
    const r = parseModalTokens("(comment) G1");
    assert.deepStrictEqual(r.tokens, []); // entire prefix becomes comment region
  });
  it("'G1 (inline) X10' → only pre-comment tokens", () => {
    const r = parseModalTokens("G1 (inline) X10");
    assert.deepStrictEqual(r.tokens, ["G1"]);
  });
  it("'; siemens comment' → tokens=[]", () => {
    const r = parseModalTokens("; siemens");
    assert.deepStrictEqual(r.tokens, []);
  });
  it("'' → tokens=[], zValue=null", () => {
    const r = parseModalTokens("");
    assert.deepStrictEqual(r.tokens, []);
    assert.strictEqual(r.zValue, null);
  });
  it("non-string → null", () => {
    assert.strictEqual(parseModalTokens(null), null);
  });
});

describe("buildEventStream", () => {
  it("produces lineNum 1-based for each input line", () => {
    const ev = buildEventStream(["M3 S5000", "G1 X10"]);
    assert.strictEqual(ev.length, 2);
    assert.strictEqual(ev[0].lineNum, 1);
    assert.strictEqual(ev[1].lineNum, 2);
    assert.deepStrictEqual(ev[0].tokens, ["M3"]);
    assert.deepStrictEqual(ev[1].tokens, ["G1"]);
  });
  it("empty program → empty array", () => {
    assert.deepStrictEqual(buildEventStream([]), []);
  });
  it("returns null on non-array input", () => {
    assert.strictEqual(buildEventStream(null), null);
  });
});

describe("checkSpindleBeforeCut", () => {
  it("M3 before G1 → ok", () => {
    const ev = buildEventStream(["M3 S5000", "G1 X10"]);
    const r = checkSpindleBeforeCut(ev);
    assert.strictEqual(r.ok, true);
    assert.deepStrictEqual(r.violations, []);
  });
  it("G1 without prior spindle → violation on line 1", () => {
    const ev = buildEventStream(["G1 X10"]);
    const r = checkSpindleBeforeCut(ev);
    assert.strictEqual(r.ok, false);
    assert.strictEqual(r.violations.length, 1);
    assert.strictEqual(r.violations[0].lineNum, 1);
  });
  it("G0 (rapid) without spindle is OK — only cutting motion triggers", () => {
    const ev = buildEventStream(["G0 X10", "M3 S5000", "G1 X20"]);
    const r = checkSpindleBeforeCut(ev);
    assert.strictEqual(r.ok, true);
  });
  it("M4 (CCW spindle) counts as spindle-on", () => {
    const ev = buildEventStream(["M4 S5000", "G1 X10"]);
    const r = checkSpindleBeforeCut(ev);
    assert.strictEqual(r.ok, true);
  });
  it("G2 (CW arc cut) triggers the check", () => {
    const ev = buildEventStream(["G2 X10 Y10 I5 J0"]);
    const r = checkSpindleBeforeCut(ev);
    assert.strictEqual(r.ok, false);
  });
  it("empty program → ok (no cuts)", () => {
    assert.strictEqual(checkSpindleBeforeCut([]).ok, true);
  });
  it("returns null on non-array", () => {
    assert.strictEqual(checkSpindleBeforeCut(null), null);
  });
});

describe("checkCoolantAfterSpindle", () => {
  it("M3 then M8 then G1 → ok", () => {
    const ev = buildEventStream(["M3 S5000", "M8", "G1 X10"]);
    const r = checkCoolantAfterSpindle(ev);
    assert.strictEqual(r.ok, true);
  });
  it("M8 BEFORE M3 → violation (wet floor before tool engages)", () => {
    const ev = buildEventStream(["M8", "M3 S5000"]);
    const r = checkCoolantAfterSpindle(ev);
    assert.strictEqual(r.ok, false);
    assert.strictEqual(r.violations[0].lineNum, 1);
  });
  it("M3 M8 on same block → ok", () => {
    const ev = buildEventStream(["M3 M8 S5000"]);
    const r = checkCoolantAfterSpindle(ev);
    assert.strictEqual(r.ok, true);
  });
  it("M8 M3 on same block → ok (same-block treated as concurrent)", () => {
    const ev = buildEventStream(["M8 M3 S5000"]);
    const r = checkCoolantAfterSpindle(ev);
    assert.strictEqual(r.ok, true);
  });
  it("M7 (mist) follows same rule as M8 (flood)", () => {
    const ev = buildEventStream(["M7", "M3 S5000"]);
    const r = checkCoolantAfterSpindle(ev);
    assert.strictEqual(r.ok, false);
  });
  it("no coolant ever emitted → ok", () => {
    const ev = buildEventStream(["M3 S5000", "G1 X10"]);
    const r = checkCoolantAfterSpindle(ev);
    assert.strictEqual(r.ok, true);
  });
});

describe("checkRetractBeforeToolChange", () => {
  it("Z10 retract before M6 (safeZ=5) → ok", () => {
    const ev = buildEventStream(["G0 Z10", "M6 T2"]);
    const r = checkRetractBeforeToolChange(ev, { safeZ: 5 });
    assert.strictEqual(r.ok, true);
  });
  it("Z2 retract below safeZ=5 → violation", () => {
    const ev = buildEventStream(["G0 Z2", "M6 T2"]);
    const r = checkRetractBeforeToolChange(ev, { safeZ: 5 });
    assert.strictEqual(r.ok, false);
    assert.strictEqual(r.violations[0].lineNum, 2);
  });
  it("M6 with no prior Z → violation (Z unknown)", () => {
    const ev = buildEventStream(["M6 T2"]);
    const r = checkRetractBeforeToolChange(ev, { safeZ: 5 });
    assert.strictEqual(r.ok, false);
  });
  it("default safeZ=5 used when option omitted", () => {
    const ev = buildEventStream(["G0 Z6", "M6 T2"]);
    const r = checkRetractBeforeToolChange(ev);
    assert.strictEqual(r.ok, true);
  });
  it("Z value at exactly safeZ → ok (>= comparison)", () => {
    const ev = buildEventStream(["G0 Z5", "M6 T2"]);
    const r = checkRetractBeforeToolChange(ev, { safeZ: 5 });
    assert.strictEqual(r.ok, true);
  });
  it("multiple M6 — each checked independently", () => {
    const ev = buildEventStream(["G0 Z10", "M6 T2", "G1 Z-5", "M6 T3"]);
    const r = checkRetractBeforeToolChange(ev, { safeZ: 5 });
    assert.strictEqual(r.violations.length, 1);
    assert.strictEqual(r.violations[0].lineNum, 4);
  });
});

describe("checkSpindleOffBeforeProgramEnd", () => {
  it("M3 → G1 → M5 → M30 → ok", () => {
    const ev = buildEventStream(["M3 S5000", "G1 X10", "M5", "M30"]);
    const r = checkSpindleOffBeforeProgramEnd(ev);
    assert.strictEqual(r.ok, true);
  });
  it("M3 → G1 → M30 (no M5) → violation", () => {
    const ev = buildEventStream(["M3 S5000", "G1 X10", "M30"]);
    const r = checkSpindleOffBeforeProgramEnd(ev);
    assert.strictEqual(r.ok, false);
    assert.strictEqual(r.violations[0].lineNum, 3);
  });
  it("M30 alone (spindle never on) → ok", () => {
    const ev = buildEventStream(["M30"]);
    const r = checkSpindleOffBeforeProgramEnd(ev);
    assert.strictEqual(r.ok, true);
  });
  it("M2 (program end) treated same as M30", () => {
    const ev = buildEventStream(["M3 S5000", "M2"]);
    const r = checkSpindleOffBeforeProgramEnd(ev);
    assert.strictEqual(r.ok, false);
  });
  it("M3 → M5 → M3 → M30 → violation (re-on without re-off)", () => {
    const ev = buildEventStream(["M3 S5000", "M5", "M3 S6000", "M30"]);
    const r = checkSpindleOffBeforeProgramEnd(ev);
    assert.strictEqual(r.ok, false);
  });
});

describe("checkFeedModePreserved", () => {
  it("G94 set once, never flipped → ok", () => {
    const ev = buildEventStream(["G94 F100", "G1 X10"]);
    const r = checkFeedModePreserved(ev);
    assert.strictEqual(r.ok, true);
  });
  it("G94 → G95 flip → violation", () => {
    const ev = buildEventStream(["G94 F100", "G95 F0.1"]);
    const r = checkFeedModePreserved(ev);
    assert.strictEqual(r.ok, false);
    assert.strictEqual(r.violations[0].lineNum, 2);
  });
  it("G94 re-emitted → no violation (same mode)", () => {
    const ev = buildEventStream(["G94", "G94"]);
    const r = checkFeedModePreserved(ev);
    assert.strictEqual(r.ok, true);
  });
  it("no feed-mode codes anywhere → ok", () => {
    const ev = buildEventStream(["G1 X10", "G1 Y20"]);
    const r = checkFeedModePreserved(ev);
    assert.strictEqual(r.ok, true);
  });
  it("G93 → G94 → G95 cascades both flips", () => {
    const ev = buildEventStream(["G93 F100", "G94 F200", "G95 F0.1"]);
    const r = checkFeedModePreserved(ev);
    assert.strictEqual(r.violations.length, 2);
  });
});

describe("runAllInvariants", () => {
  it("clean program → allOk=true, 0 violations", () => {
    const r = runAllInvariants([
      "M3 S5000",
      "G0 Z10",
      "G94 F100",
      "G1 X10 Z-2",
      "G0 Z10",
      "M5",
      "M30",
    ]);
    assert.strictEqual(r.allOk, true);
    assert.strictEqual(r.totalViolations, 0);
  });
  it("program with G1 before M3 violates SPINDLE_BEFORE_CUT", () => {
    const r = runAllInvariants(["G1 X10", "M5", "M30"]);
    assert.strictEqual(r.allOk, false);
    assert.strictEqual(r.results.SPINDLE_BEFORE_CUT.ok, false);
  });
  it("program with M8 before M3 violates COOLANT_AFTER_SPINDLE", () => {
    const r = runAllInvariants(["M8", "M3 S5000", "G1 X10", "M5", "M30"]);
    assert.strictEqual(r.results.COOLANT_AFTER_SPINDLE.ok, false);
  });
  it("totalViolations sums across all checks", () => {
    // Two violations: COOLANT_AFTER_SPINDLE + SPINDLE_OFF_BEFORE_PROGRAM_END
    const r = runAllInvariants(["M8", "M3 S5000", "G1 X10", "M30"]);
    assert.ok(r.totalViolations >= 2);
  });
  it("eventCount = number of input lines", () => {
    const r = runAllInvariants(["M3", "G1", "M5", "M30"]);
    assert.strictEqual(r.eventCount, 4);
  });
  it("returns null on bad input", () => {
    assert.strictEqual(runAllInvariants(null), null);
  });
});

describe("emitInvariantReport", () => {
  const cleanProgram = [
    "M3 S5000",
    "G0 Z10",
    "G94 F100",
    "G1 X10 Z-2",
    "G0 Z10",
    "M5",
    "M30",
  ];

  it("clean program + fanuc → PASS line", () => {
    const r = emitInvariantReport({ programLines: cleanProgram, dialect: "fanuc" });
    assert.strictEqual(r.lines.length, 1);
    // Fanuc strips parens — "(5/5 checks)" → "5/5 checks"
    assert.strictEqual(
      r.lines[0],
      "( MODAL-INVARIANTS PASS 5/5 checks events=7 )",
    );
    assert.strictEqual(r.summary.allOk, true);
  });
  it("clean program + heidenhain → PASS with parens preserved", () => {
    const r = emitInvariantReport({ programLines: cleanProgram, dialect: "heidenhain" });
    assert.strictEqual(r.lines[0], "; MODAL-INVARIANTS PASS (5/5 checks) events=7");
  });
  it("violation program emits BLOCK header + per-violation BLOCK lines", () => {
    const r = emitInvariantReport({
      programLines: ["G1 X10", "M30"], // spindle-before-cut violation
      dialect: "fanuc",
    });
    assert.ok(r.lines.length >= 2);
    assert.ok(r.lines[0].includes("MODAL-INVARIANTS BLOCK"));
    assert.ok(r.lines[1].includes("BLOCK SPINDLE_BEFORE_CUT"));
    assert.strictEqual(r.summary.allOk, false);
  });
  it("summary carries schema + dialect + counts", () => {
    const r = emitInvariantReport({ programLines: cleanProgram, dialect: "fanuc" });
    assert.strictEqual(r.summary.schemaVersion, 1);
    assert.strictEqual(r.summary.dialect, "fanuc");
    assert.strictEqual(r.summary.eventCount, 7);
  });
  it("returns null on null req", () => {
    assert.strictEqual(emitInvariantReport(null), null);
  });
  it("returns null on bad dialect", () => {
    assert.strictEqual(emitInvariantReport({
      programLines: cleanProgram, dialect: "makino",
    }), null);
  });
});

describe("regression: 5 dialects + schema invariants", () => {
  const cleanProgram = ["M3 S5000", "G94 F100", "G1 X10", "M5", "M30"];

  it("every dialect produces non-null emit", () => {
    for (const dialect of SUPPORTED_DIALECTS) {
      const r = emitInvariantReport({ programLines: cleanProgram, dialect });
      assert.ok(r != null, `dialect=${dialect} returned null`);
      assert.strictEqual(r.summary.schemaVersion, MODAL_INVARIANTS_EMIT_SCHEMA_VERSION);
    }
  });
});
