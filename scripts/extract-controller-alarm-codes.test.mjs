/**
 * Tests for scripts/extract-controller-alarm-codes.mjs (U-VICTOR-B5).
 * Pure-core only.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  SEED_ALARMS,
  parseAlarmLines,
  toJsonlEntry,
} from "./extract-controller-alarm-codes.mjs";

// ============================================================================
// SEED_ALARMS coverage
// ============================================================================

test("SEED_ALARMS covers all 5 controllers", () => {
  const controllers = new Set(SEED_ALARMS.map((a) => a.controller));
  assert.ok(controllers.has("fanuc"));
  assert.ok(controllers.has("heidenhain"));
  assert.ok(controllers.has("haas"));
  assert.ok(controllers.has("mazak"));
  assert.ok(controllers.has("siemens"));
});

test("SEED_ALARMS has >= 5 alarms per controller", () => {
  const byController = {};
  for (const a of SEED_ALARMS) {
    byController[a.controller] = (byController[a.controller] || 0) + 1;
  }
  for (const c of ["fanuc", "heidenhain", "haas", "mazak", "siemens"]) {
    assert.ok(byController[c] >= 5, `${c} has ${byController[c]} (expected ≥5)`);
  }
});

test("SEED_ALARMS entries all have required fields", () => {
  for (const a of SEED_ALARMS) {
    assert.ok(a.controller, `missing controller in ${JSON.stringify(a)}`);
    assert.ok(a.code, `missing code in ${JSON.stringify(a)}`);
    assert.ok(a.title, `missing title in ${JSON.stringify(a)}`);
    assert.ok(a.hint && a.hint.length > 10, `weak hint in ${JSON.stringify(a)}`);
  }
});

test("SEED_ALARMS is frozen (no accidental mutation)", () => {
  assert.ok(Object.isFrozen(SEED_ALARMS));
});

// ============================================================================
// parseAlarmLines — per-controller regex
// ============================================================================

test("parseAlarmLines: fanuc 4-digit PS-prefix pattern", () => {
  const text = `
    PS0500 — Excessive feed deviation
    PS0510 - Overtravel positive limit
    OT0506: Overtravel negative limit
    junk line
    SV0414  Servo digital current alarm
  `;
  const out = parseAlarmLines(text, "fanuc");
  assert.ok(out.length >= 3, `expected ≥3, got ${out.length}`);
  assert.equal(out[0].code, "PS0500");
  assert.equal(out[0].controller, "fanuc");
  assert.equal(out[0].conf, 0.4);
});

test("parseAlarmLines: haas numeric-dash-ALLCAPS pattern", () => {
  const text = `
    127 - MISMATCH M CODE SPINDLE STATE
    139 - TOOL CHANGE IN CYCLE
    junk
    9999 - SERVO AMP FAULT
  `;
  const out = parseAlarmLines(text, "haas");
  assert.equal(out.length, 3);
  assert.equal(out[0].code, "127");
  assert.equal(out[1].code, "139");
});

test("parseAlarmLines: siemens 4-5 digit colon pattern", () => {
  const text = `
    1000: Emergency stop
    4060: Standard subroutine missing
    10800: Channel reset by NC start
    junkline
  `;
  const out = parseAlarmLines(text, "siemens");
  assert.equal(out.length, 3);
  assert.equal(out[0].code, "1000");
  assert.equal(out[2].code, "10800");
});

test("parseAlarmLines: unknown controller returns []", () => {
  const out = parseAlarmLines("PS0500 — anything", "made-up-controller");
  assert.deepEqual(out, []);
});

test("parseAlarmLines: empty/null/non-string input returns []", () => {
  assert.deepEqual(parseAlarmLines("", "fanuc"), []);
  assert.deepEqual(parseAlarmLines(null, "fanuc"), []);
  assert.deepEqual(parseAlarmLines(undefined, "fanuc"), []);
  assert.deepEqual(parseAlarmLines("text", ""), []);
  assert.deepEqual(parseAlarmLines("text", null), []);
});

// ============================================================================
// toJsonlEntry
// ============================================================================

test("toJsonlEntry shapes a seed alarm into the embed-index schema", () => {
  const a = SEED_ALARMS[0]; // fanuc PS0500
  const e = toJsonlEntry({ ...a, conf: 0.85, source: "seed" });
  assert.equal(e.id, `controller-alarm:fanuc:PS0500`);
  assert.equal(e.source, "controller-alarm");
  assert.equal(e.domain, "alarm");
  assert.equal(e.controller, "fanuc");
  assert.equal(e.code, "PS0500");
  assert.ok(e.text.includes("FANUC"));
  assert.ok(e.text.includes("PS0500"));
  assert.equal(e.confidence, 0.85);
  assert.equal(e.extractedFrom, "seed");
});

test("toJsonlEntry handles null/non-object gracefully", () => {
  assert.equal(toJsonlEntry(null), null);
  assert.equal(toJsonlEntry(undefined), null);
  assert.equal(toJsonlEntry("not an object"), null);
});

test("toJsonlEntry defaults confidence to 0.4 when not provided", () => {
  const e = toJsonlEntry({ controller: "fanuc", code: "PS9999", title: "test" });
  assert.equal(e.confidence, 0.4);
});

test("toJsonlEntry includes hint in text only when non-empty", () => {
  const withHint = toJsonlEntry({ controller: "haas", code: "127", title: "T", hint: "do X" });
  assert.ok(withHint.text.includes("do X"));
  const noHint = toJsonlEntry({ controller: "haas", code: "128", title: "T" });
  // No hint → text trims to the title-period (template is "...— T. " then trim()).
  assert.ok(noHint.text.endsWith("— T."));
  assert.ok(!noHint.text.endsWith(" "));
});
