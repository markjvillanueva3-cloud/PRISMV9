// scripts/lib/sfc-program-param-extract-lib.test.mjs
//
// Real reference-value tests for the NC cutting-parameter extractor. Each
// expected S/F/T is hand-traced from the inline G-code below, NOT echoed from
// the implementation. Run directly: `node scripts/lib/sfc-program-param-extract-lib.test.mjs`
// (node:test auto-runs on exit; `node --test` runs 0 tests in this env).

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  extractCuttingParams,
  resolveToolNumber,
  SPINDLE_MODE,
  FEED_MODE,
  NC_TEXT_EXTS,
} from "./sfc-program-param-extract-lib.mjs";

// --- a real-shaped MILL program: G20 inch, G97 direct rpm, G94 feed/min ---
const MILL_NC = `%
O1234 (BRACKET)
G20 G17 G90 G94
T1 M6
G97 S2000 M3
G54 G0 X0 Y0
G43 H1 Z1.
G1 Z-0.25 F5.0
G1 X2.0 F12.0
T2 M6
G97 S3500 M3
G1 Z-0.1 F8.0
M30
%`;

// --- a real-shaped LATHE program: G96 CSS, G50 rpm clamp, G95 feed/rev, Txxyy ---
const LATHE_NC = `%
O5678 (SHAFT)
G20
G50 S2500
T0101
G96 S400 M3
G0 X1.0 Z0.1
G95
G1 X0.9 F0.008
G1 Z-1.0 F0.012
T0202
G96 S350 M3
G1 X0.8 F0.010
M30
%`;

test("resolveToolNumber: mill literal vs lathe Txxyy packing", () => {
  assert.equal(resolveToolNumber(5), 5);        // mill T5
  assert.equal(resolveToolNumber(101), 1);      // lathe T0101 -> tool 1
  assert.equal(resolveToolNumber(1212), 12);    // lathe T1212 -> tool 12
  assert.equal(resolveToolNumber(100), 1);      // lathe T0100 -> tool 1, offset 0
  assert.equal(resolveToolNumber(0), 0);
  assert.equal(resolveToolNumber(null), null);
  assert.equal(resolveToolNumber(NaN), null);
});

test("MILL: extracts distinct programmed S/F per tool (G97 rpm, G94 per-min)", () => {
  const r = extractCuttingParams(MILL_NC, { skipExtGate: true });
  assert.equal(r.ok, true);
  assert.equal(r.units, "inch");
  // 3 distinct cutting-parameter sets: T1@F5, T1@F12, T2@F8.
  assert.equal(r.ops.length, 3);

  const [o1, o2, o3] = r.ops;
  assert.deepEqual(
    { t: o1.toolNumber, m: o1.spindleMode, s: o1.spindleValue, fm: o1.feedMode, f: o1.feed },
    { t: 1, m: SPINDLE_MODE.RPM, s: 2000, fm: FEED_MODE.PER_MIN, f: 5.0 },
  );
  assert.equal(o2.feed, 12.0);
  assert.equal(o2.spindleValue, 2000); // spindle carries across the feed change
  assert.deepEqual(
    { t: o3.toolNumber, s: o3.spindleValue, f: o3.feed },
    { t: 2, s: 3500, f: 8.0 },
  );

  // per-tool rollup
  const t1 = r.tools.find((t) => t.toolNumber === 1);
  assert.equal(t1.maxSpindle, 2000);
  assert.equal(t1.minFeed, 5.0);
  assert.equal(t1.maxFeed, 12.0);
  assert.equal(t1.opCount, 2);
});

test("LATHE: G96 CSS surface speed, G50 clamp is NOT a cutting spindle", () => {
  const r = extractCuttingParams(LATHE_NC, { skipExtGate: true });
  assert.equal(r.ok, true);
  assert.equal(r.ops.length, 3);

  // First op: tool 1, CSS S400 (surface speed, not rpm), per-rev F0.008.
  const o1 = r.ops[0];
  assert.equal(o1.toolNumber, 1);
  assert.equal(o1.spindleMode, SPINDLE_MODE.CSS);
  assert.equal(o1.spindleValue, 400);          // CSS sfm, NOT the 2500 clamp
  assert.equal(o1.feedMode, FEED_MODE.PER_REV);
  assert.equal(o1.feed, 0.008);
  assert.equal(o1.spindleClampRpm, 2500);      // G50 clamp captured separately

  // The 2500 clamp must never appear as a cutting spindle value.
  for (const op of r.ops) assert.notEqual(op.spindleValue, 2500);

  // second tool resolved from T0202
  assert.equal(r.ops[2].toolNumber, 2);
  assert.equal(r.ops[2].spindleValue, 350);
});

test("ADVERSARIAL: binary CAM ext is rejected by the NC_TEXT_EXTS gate", () => {
  assert.equal(NC_TEXT_EXTS.has(".mcx-8"), false);
  const r = extractCuttingParams("G97 S100\nG1 X1 F5", { filePath: "part.mcx-8" });
  assert.equal(r.ok, false);
  assert.match(r.reason, /non-nc-text-ext/);
  assert.equal(r.ops.length, 0);
});

test("ADVERSARIAL: empty + rapid-only programs yield no ops", () => {
  const empty = extractCuttingParams("");
  assert.equal(empty.ok, false);
  assert.equal(empty.reason, "empty-content");

  const rapidOnly = extractCuttingParams("G20\nG97 S1000\nG0 X1 Y1\nM30", { skipExtGate: true });
  assert.equal(rapidOnly.ok, false);
  assert.equal(rapidOnly.reason, "no-cutting-ops");
});

test("ADVERSARIAL: a cutting move with no spindle ever set does not emit", () => {
  // No S anywhere -> nothing to compare to SFC spindle -> skip (not a false op).
  const r = extractCuttingParams("G94\nG1 X1 F5\nM30", { skipExtGate: true });
  assert.equal(r.ok, false);
  assert.equal(r.ops.length, 0);
});

test("units: G21 -> metric", () => {
  const r = extractCuttingParams("G21\nG97 S1000\nG94\nG1 X1 F100\nM30", { skipExtGate: true });
  assert.equal(r.units, "metric");
  assert.equal(r.ops[0].feed, 100);
});
