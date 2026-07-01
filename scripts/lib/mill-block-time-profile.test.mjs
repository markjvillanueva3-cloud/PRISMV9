/**
 * mill-block-time-profile.test.mjs — concrete-value tests for the
 * per-G-code-block mill cycle-time estimator.
 *
 * Hand-checked physics:
 *   v_mm_per_sec = feed_mm_per_min / 60
 *   accel_dist = v² / (2·a)
 *
 * Case A: linear 10mm at F250 with a=5000:
 *   v = 250/60 = 4.16666... mm/s
 *   accel_dist = (250/60)² / 10000 = 62500 / 36000000 = 1/576 ≈ 0.001736 mm
 *   2·accel_dist ≈ 0.003472 mm < 10 → trapezoidal
 *   t_accel = (250/60) / 5000 = 1/1200 ≈ 0.0008333 sec
 *   t_const = (10 - 1/288) / (250/60) ≈ 2.39917 sec
 *   t_total = 2·(1/1200) + (10 - 1/288)·(60/250) ≈ 2.40083 sec
 *
 * Case B: rapid 10mm at F30000 with a=5000:
 *   v = 30000/60 = 500 mm/s
 *   accel_dist = 500² / 10000 = 25 mm
 *   2·accel_dist = 50 > 10 → triangular
 *   t = 2·sqrt(10/5000) = 2·sqrt(0.002) ≈ 0.089443 sec
 *
 * @milestone POST-BRIDGE-SYNERGY-MS0/U-LATHE-BLOCK-ENGAGEMENT-TIMING-TO-MILL
 * @slot echo · @date 2026-05-27
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  MILL_BLOCK_TIME_SCHEMA_VERSION,
  DEFAULT_RAPID_FEEDRATE_MM_PER_MIN,
  DEFAULT_ACCEL_MM_PER_SEC2,
  DEFAULT_TOOL_CHANGE_TIME_SEC,
  DEFAULT_DWELL_OVERHEAD_SEC,
  DEFAULT_OP_HEADER_OVERHEAD_SEC,
  BLOCK_KINDS,
  parseGCodeBlock,
  distance3D,
  computeMoveTimeSec,
  computeBlockTimeSec,
  computeProgramTimeSec,
} from "./mill-block-time-profile.mjs";

const EPS = 1e-9;
const close = (a, b, eps = EPS) => Math.abs(a - b) < eps;

describe("constants", () => {
  it("MILL_BLOCK_TIME_SCHEMA_VERSION = 1", () => {
    assert.equal(MILL_BLOCK_TIME_SCHEMA_VERSION, 1);
  });
  it("DEFAULT_RAPID_FEEDRATE_MM_PER_MIN = 30000", () => {
    assert.equal(DEFAULT_RAPID_FEEDRATE_MM_PER_MIN, 30000);
  });
  it("DEFAULT_ACCEL_MM_PER_SEC2 = 5000", () => {
    assert.equal(DEFAULT_ACCEL_MM_PER_SEC2, 5000);
  });
  it("DEFAULT_TOOL_CHANGE_TIME_SEC = 3.0", () => {
    assert.equal(DEFAULT_TOOL_CHANGE_TIME_SEC, 3.0);
  });
  it("DEFAULT_DWELL_OVERHEAD_SEC = 0.1", () => {
    assert.equal(DEFAULT_DWELL_OVERHEAD_SEC, 0.1);
  });
  it("DEFAULT_OP_HEADER_OVERHEAD_SEC = 0.5", () => {
    assert.equal(DEFAULT_OP_HEADER_OVERHEAD_SEC, 0.5);
  });
  it("BLOCK_KINDS contains 8 entries", () => {
    assert.equal(BLOCK_KINDS.length, 8);
    assert.equal(BLOCK_KINDS.includes("linear"), true);
    assert.equal(BLOCK_KINDS.includes("rapid"), true);
    assert.equal(BLOCK_KINDS.includes("dwell"), true);
    assert.equal(BLOCK_KINDS.includes("tool-change"), true);
  });
});

describe("parseGCodeBlock", () => {
  it("linear G01 with feed → kind=linear, axes correct, feed=250", () => {
    const r = parseGCodeBlock("G01 X10 Y20 Z-5 F250");
    assert.equal(r.kind, "linear");
    assert.equal(r.axes.X, 10);
    assert.equal(r.axes.Y, 20);
    assert.equal(r.axes.Z, -5);
    assert.equal(r.feed, 250);
  });

  it("rapid G00 → kind=rapid, axes preserved", () => {
    const r = parseGCodeBlock("G00 X100 Z25");
    assert.equal(r.kind, "rapid");
    assert.equal(r.axes.X, 100);
    assert.equal(r.axes.Z, 25);
  });

  it("dwell G04 P0.5 → kind=dwell, dwellSec=0.5", () => {
    const r = parseGCodeBlock("G04 P0.5");
    assert.equal(r.kind, "dwell");
    assert.equal(r.dwellSec, 0.5);
  });

  it("tool change T3 M06 → kind=tool-change, tool=3", () => {
    const r = parseGCodeBlock("T3 M06");
    assert.equal(r.kind, "tool-change");
    assert.equal(r.tool, 3);
  });

  it("spindle M03 S5000 → kind=spindle, sword=5000", () => {
    const r = parseGCodeBlock("M03 S5000");
    assert.equal(r.kind, "spindle");
    assert.equal(r.sword, 5000);
  });

  it("paren comment '(SETUP)' → kind=comment", () => {
    const r = parseGCodeBlock("(SETUP COMMENT)");
    assert.equal(r.kind, "comment");
  });

  it("semicolon comment ';foo' → kind=comment", () => {
    const r = parseGCodeBlock("; foo");
    assert.equal(r.kind, "comment");
  });

  it("coolant M08 → kind=coolant", () => {
    const r = parseGCodeBlock("M08");
    assert.equal(r.kind, "coolant");
  });

  it("modal continuation 'X25' (no G code, axis only) → kind=linear modal=true", () => {
    const r = parseGCodeBlock("X25");
    assert.equal(r.kind, "linear");
    assert.equal(r.axes.X, 25);
    assert.equal(r.modal, true);
  });

  it("strip inline comments: 'G01 X10 (chamfer) F100' → linear, no parens noise", () => {
    const r = parseGCodeBlock("G01 X10 (chamfer) F100");
    assert.equal(r.kind, "linear");
    assert.equal(r.axes.X, 10);
    assert.equal(r.feed, 100);
  });

  it("negative axis: 'G01 X-5.25 F100' → axes.X = -5.25", () => {
    const r = parseGCodeBlock("G01 X-5.25 F100");
    assert.equal(r.axes.X, -5.25);
  });

  it("empty line → null", () => {
    assert.equal(parseGCodeBlock(""), null);
    assert.equal(parseGCodeBlock("   "), null);
  });

  it("non-string input → null", () => {
    assert.equal(parseGCodeBlock(null), null);
    assert.equal(parseGCodeBlock(123), null);
    assert.equal(parseGCodeBlock(undefined), null);
  });

  it("unknown M-code → kind=unknown", () => {
    const r = parseGCodeBlock("M30");
    assert.equal(r.kind, "unknown");
  });
});

describe("distance3D", () => {
  it("X-only 10mm → 10", () => {
    assert.equal(distance3D({ X: 0, Y: 0, Z: 0 }, { X: 10, Y: 0, Z: 0 }), 10);
  });
  it("3-4-5 triangle: (0,0,0) → (3,4,0) = 5", () => {
    assert.equal(distance3D({ X: 0, Y: 0, Z: 0 }, { X: 3, Y: 4, Z: 0 }), 5);
  });
  it("3D pythag: (0,0,0) → (1,2,2) = 3", () => {
    assert.equal(distance3D({ X: 0, Y: 0, Z: 0 }, { X: 1, Y: 2, Z: 2 }), 3);
  });
  it("zero distance: same point → 0", () => {
    assert.equal(distance3D({ X: 5, Y: 5, Z: 5 }, { X: 5, Y: 5, Z: 5 }), 0);
  });
  it("partial target (only X provided) preserves Y,Z from origin", () => {
    // from {0,0,0} to {X:10} → target {X:10, Y:0, Z:0} → distance 10
    assert.equal(distance3D({ X: 0, Y: 0, Z: 0 }, { X: 10 }), 10);
  });
  it("missing from → null", () => {
    assert.equal(distance3D(null, { X: 5 }), null);
  });
  it("missing to → null", () => {
    assert.equal(distance3D({ X: 0, Y: 0, Z: 0 }, null), null);
  });
});

describe("computeMoveTimeSec — trapezoidal vs triangular", () => {
  it("trapezoidal case: d=10, F250, a=5000 → ≈ 2.40083 sec (hand-checked)", () => {
    const t = computeMoveTimeSec(10, 250, 5000);
    const expected = 2 * (1 / 1200) + (10 - 1 / 288) * (60 / 250);
    assert.equal(close(t, expected), true);
  });

  it("trapezoidal case: t > naive (dist/feed) due to accel overhead", () => {
    const t = computeMoveTimeSec(10, 250, 5000);
    const naive = 10 / (250 / 60); // = 2.4 sec
    assert.equal(t > naive, true);
    assert.equal(t - naive < 0.01, true); // overhead < 10ms at low feed
  });

  it("triangular case: d=10, F30000, a=5000 → 2·sqrt(10/5000) ≈ 0.089443 sec", () => {
    const t = computeMoveTimeSec(10, 30000, 5000);
    const expected = 2 * Math.sqrt(10 / 5000);
    assert.equal(close(t, expected), true);
  });

  it("triangular case: t MUCH greater than naive (huge accel overhead at rapid)", () => {
    const t = computeMoveTimeSec(10, 30000, 5000);
    const naive = 10 / (30000 / 60); // = 0.02 sec
    assert.equal(t > 4 * naive, true); // accel overhead > 4× naive
  });

  it("zero distance → 0", () => {
    assert.equal(computeMoveTimeSec(0, 250, 5000), 0);
  });

  it("longer distance: scaling — d=100 vs d=10 trapezoidal increases proportionally", () => {
    const t10 = computeMoveTimeSec(10, 250, 5000);
    const t100 = computeMoveTimeSec(100, 250, 5000);
    // 100mm should take ~10× longer than 10mm in trapezoidal regime:
    assert.equal(t100 > 9 * t10, true);
    assert.equal(t100 < 10.05 * t10, true);
  });

  it("higher accel → shorter time (rapid triangular)", () => {
    const t1 = computeMoveTimeSec(10, 30000, 5000);
    const t2 = computeMoveTimeSec(10, 30000, 10000);
    assert.equal(t2 < t1, true);
  });

  it("negative distance → null", () => {
    assert.equal(computeMoveTimeSec(-1, 250, 5000), null);
  });

  it("zero feed → null", () => {
    assert.equal(computeMoveTimeSec(10, 0, 5000), null);
  });

  it("zero accel → null", () => {
    assert.equal(computeMoveTimeSec(10, 250, 0), null);
  });

  it("NaN input → null", () => {
    assert.equal(computeMoveTimeSec(NaN, 250, 5000), null);
    assert.equal(computeMoveTimeSec(10, NaN, 5000), null);
    assert.equal(computeMoveTimeSec(10, 250, NaN), null);
  });

  it("Infinity input → null", () => {
    assert.equal(computeMoveTimeSec(Infinity, 250, 5000), null);
  });
});

describe("computeBlockTimeSec — block-by-block accounting", () => {
  const machine = { rapidFeedrateMmPerMin: 30000, accelMmPerSec2: 5000 };
  const origin = { X: 0, Y: 0, Z: 0, lastFeed_mm_per_min: null };

  it("linear block: G01 X10 F250 from origin → ≈ 2.40083 sec", () => {
    const block = parseGCodeBlock("G01 X10 F250");
    const r = computeBlockTimeSec(block, origin, machine);
    const expected = 2 * (1 / 1200) + (10 - 1 / 288) * (60 / 250);
    assert.equal(close(r.timeSec, expected), true);
    assert.equal(r.newState.X, 10);
    assert.equal(r.newState.lastFeed_mm_per_min, 250);
    assert.equal(r.attribution, "linear");
  });

  it("rapid block: G00 X10 from origin → ≈ 0.089443 sec (triangular)", () => {
    const block = parseGCodeBlock("G00 X10");
    const r = computeBlockTimeSec(block, origin, machine);
    const expected = 2 * Math.sqrt(10 / 5000);
    assert.equal(close(r.timeSec, expected), true);
    assert.equal(r.attribution, "rapid");
  });

  it("tool change M06 → 3.0 sec (DEFAULT_TOOL_CHANGE_TIME_SEC)", () => {
    const block = parseGCodeBlock("T1 M06");
    const r = computeBlockTimeSec(block, origin, machine);
    assert.equal(r.timeSec, 3.0);
    assert.equal(r.attribution, "tool-change");
  });

  it("dwell G04 P1.5 → 1.5 + 0.1 (overhead) = 1.6 sec", () => {
    const block = parseGCodeBlock("G04 P1.5");
    const r = computeBlockTimeSec(block, origin, machine);
    assert.equal(r.timeSec, 1.6);
    assert.equal(r.attribution, "dwell");
  });

  it("comment block → 0 sec", () => {
    const block = parseGCodeBlock("( setup mode )");
    const r = computeBlockTimeSec(block, origin, machine);
    assert.equal(r.timeSec, 0);
    assert.equal(r.attribution, "comment");
  });

  it("spindle M03 S5000 → 0 sec (instantaneous in this model)", () => {
    const block = parseGCodeBlock("M03 S5000");
    const r = computeBlockTimeSec(block, origin, machine);
    assert.equal(r.timeSec, 0);
    assert.equal(r.attribution, "spindle");
  });

  it("modal continuation: 'X20' uses lastFeed from state", () => {
    const block = parseGCodeBlock("X20");
    const state = { X: 0, Y: 0, Z: 0, lastFeed_mm_per_min: 500 };
    const r = computeBlockTimeSec(block, state, machine);
    // dist = 20, feed = 500, expect roughly 2.4 sec
    const v = 500 / 60;
    const a = 5000;
    const accelDist = (v * v) / (2 * a);
    const expected = (2 * accelDist <= 20)
      ? (2 * v / a + (20 - 2 * accelDist) / v)
      : (2 * Math.sqrt(20 / a));
    assert.equal(close(r.timeSec, expected), true);
  });

  it("modal continuation with NO lastFeed → returns error='missing-feed'", () => {
    const block = parseGCodeBlock("X20");
    const r = computeBlockTimeSec(block, origin, machine);
    assert.equal(r.error, "missing-feed");
    assert.equal(r.timeSec, 0);
  });

  it("custom machine: accel=10000 → trapezoidal time decreases", () => {
    const block = parseGCodeBlock("G01 X10 F250");
    const fast = { rapidFeedrateMmPerMin: 30000, accelMmPerSec2: 10000 };
    const slow = { rapidFeedrateMmPerMin: 30000, accelMmPerSec2: 5000 };
    const tFast = computeBlockTimeSec(block, origin, fast);
    const tSlow = computeBlockTimeSec(block, origin, slow);
    assert.equal(tFast.timeSec < tSlow.timeSec, true);
  });

  it("custom toolChangeTimeSec = 5 → M06 takes 5 sec", () => {
    const block = parseGCodeBlock("T1 M06");
    const r = computeBlockTimeSec(block, origin, { ...machine, toolChangeTimeSec: 5.0 });
    assert.equal(r.timeSec, 5.0);
  });

  it("null block → null", () => {
    assert.equal(computeBlockTimeSec(null, origin, machine), null);
  });

  it("null state → null", () => {
    assert.equal(computeBlockTimeSec({ kind: "linear" }, null, machine), null);
  });

  it("null machine → null", () => {
    assert.equal(computeBlockTimeSec({ kind: "linear" }, origin, null), null);
  });
});

describe("computeProgramTimeSec — full G-code program", () => {
  const machine = { rapidFeedrateMmPerMin: 30000, accelMmPerSec2: 5000 };

  it("simple 5-block program → total ≈ 3.0 + 0.089 + 2.401 + 1.1 + 0 = 6.59 sec", () => {
    const program = [
      "T1 M06",         // 3.0
      "M03 S5000",      // 0
      "G00 X10",        // ≈ 0.0894
      "G01 X20 F250",   // dist 10 at F250 ≈ 2.40083
      "G04 P1.0",       // 1.0 + 0.1 = 1.1
    ];
    const r = computeProgramTimeSec(program, machine);
    const expectedRapid = 2 * Math.sqrt(10 / 5000);
    const expectedLinear = 2 * (1 / 1200) + (10 - 1 / 288) * (60 / 250);
    const expected = 3.0 + expectedRapid + expectedLinear + 1.1;
    assert.equal(close(r.totalSec, expected, 1e-6), true);
  });

  it("perBlock has correct length (5)", () => {
    const program = ["T1 M06", "M03 S5000", "G00 X10", "G01 X20 F250", "G04 P1.0"];
    const r = computeProgramTimeSec(program, machine);
    assert.equal(r.perBlock.length, 5);
  });

  it("summary.blockCount = 5", () => {
    const program = ["T1 M06", "M03 S5000", "G00 X10", "G01 X20 F250", "G04 P1.0"];
    const r = computeProgramTimeSec(program, machine);
    assert.equal(r.summary.blockCount, 5);
  });

  it("summary.attribCounts: tool-change=1, spindle=1, rapid=1, linear=1, dwell=1", () => {
    const program = ["T1 M06", "M03 S5000", "G00 X10", "G01 X20 F250", "G04 P1.0"];
    const r = computeProgramTimeSec(program, machine);
    assert.equal(r.summary.attribCounts["tool-change"], 1);
    assert.equal(r.summary.attribCounts["spindle"], 1);
    assert.equal(r.summary.attribCounts["rapid"], 1);
    assert.equal(r.summary.attribCounts["linear"], 1);
    assert.equal(r.summary.attribCounts["dwell"], 1);
  });

  it("summary.attribTimes['tool-change'] = 3.0", () => {
    const program = ["T1 M06", "M03 S5000", "G00 X10", "G01 X20 F250", "G04 P1.0"];
    const r = computeProgramTimeSec(program, machine);
    assert.equal(r.summary.attribTimes["tool-change"], 3.0);
  });

  it("summary.schemaVersion = 1", () => {
    const r = computeProgramTimeSec(["G01 X10 F250"], machine);
    assert.equal(r.summary.schemaVersion, 1);
  });

  it("string-input variant: same total as array variant", () => {
    const arrayInput = ["T1 M06", "G01 X10 F250"];
    const stringInput = "T1 M06\nG01 X10 F250";
    const rArr = computeProgramTimeSec(arrayInput, machine);
    const rStr = computeProgramTimeSec(stringInput, machine);
    assert.equal(rArr.totalSec, rStr.totalSec);
  });

  it("blank lines are skipped in perBlock with 'skipped' marker", () => {
    const program = ["T1 M06", "", "G01 X10 F250", "   "];
    const r = computeProgramTimeSec(program, machine);
    assert.equal(r.perBlock[1].skipped, "blank");
    assert.equal(r.perBlock[3].skipped, "blank");
  });

  it("variability: 3 different machine profiles produce 3 different totals", () => {
    const program = ["G00 X100", "G01 X200 F500"];
    const slow = { rapidFeedrateMmPerMin: 10000, accelMmPerSec2: 2000 };
    const med = { rapidFeedrateMmPerMin: 30000, accelMmPerSec2: 5000 };
    const fast = { rapidFeedrateMmPerMin: 60000, accelMmPerSec2: 10000 };
    const tSlow = computeProgramTimeSec(program, slow).totalSec;
    const tMed = computeProgramTimeSec(program, med).totalSec;
    const tFast = computeProgramTimeSec(program, fast).totalSec;
    assert.equal(tSlow > tMed, true);
    assert.equal(tMed > tFast, true);
  });

  it("modal feed propagation: 'G01 X10 F250' followed by bare 'X20' uses F250 modal", () => {
    const program = ["G01 X10 F250", "X20"];
    const r = computeProgramTimeSec(program, machine);
    // block 2 should NOT have missing-feed error:
    assert.equal(r.perBlock[1].error, undefined);
    assert.equal(r.perBlock[1].attribution, "linear");
  });

  it("state propagates: 2 sequential X-moves correctly advance position", () => {
    const program = ["G01 X10 F250", "G01 X25 F250"];
    const r = computeProgramTimeSec(program, machine);
    // block 1: from X=0 to X=10, dist 10
    // block 2: from X=10 to X=25, dist 15
    assert.equal(r.perBlock[1].distanceMm, 15);
  });

  it("null input → null", () => {
    assert.equal(computeProgramTimeSec(null, machine), null);
  });

  it("null machine → null", () => {
    assert.equal(computeProgramTimeSec(["G01 X10 F250"], null), null);
  });

  it("default machine values applied when partial profile given", () => {
    const r = computeProgramTimeSec(["G00 X10"], { accelMmPerSec2: 5000 });
    // rapidFeedrateMmPerMin should default to 30000
    assert.equal(r.summary.machineProfile.rapidFeedrateMmPerMin, 30000);
  });
});

describe("REGRESSION: per-block accuracy > naive cycle-time estimation", () => {
  const machine = { rapidFeedrateMmPerMin: 30000, accelMmPerSec2: 5000 };

  it("program with many short rapids has SIGNIFICANTLY more time than naive sum", () => {
    // 50 short rapids of 5mm each = 250mm total
    const program = [];
    for (let i = 1; i <= 50; i++) {
      program.push(`G00 X${i * 5}`);
    }
    const r = computeProgramTimeSec(program, machine);
    const naiveSec = 250 / (30000 / 60); // = 0.5 sec
    // Each 5mm rapid is triangular: t = 2·sqrt(5/5000) = 0.0632 sec
    // 50 × 0.0632 = 3.16 sec — 6× naive
    assert.equal(r.totalSec > 5 * naiveSec, true);
  });

  it("long single rapid (100mm) approaches naive (trapezoidal regime)", () => {
    const r = computeProgramTimeSec(["G00 X100"], machine);
    const naiveSec = 100 / (30000 / 60); // = 0.2 sec
    // v=500, accel_dist=25, 2·25=50 < 100 → trapezoidal, overhead = 2·t_accel = 2·(500/5000) = 0.2 sec
    // so total ≈ 0.4 sec (still 2× naive due to start+stop accel)
    assert.equal(r.totalSec > naiveSec, true);
    assert.equal(r.totalSec < 3 * naiveSec, true);
  });
});

describe("REGRESSION: 3 different machine classes produce reasonable cycle-time ranges", () => {
  // Small program: T-change + rapid + cut at F250
  const program = ["T1 M06", "G00 X50", "G01 X100 F250"];
  it("small hobby mill (low feed, low accel): F_rapid=5000, a=1000 → highest total", () => {
    const r = computeProgramTimeSec(program, { rapidFeedrateMmPerMin: 5000, accelMmPerSec2: 1000 });
    assert.equal(r.totalSec > 10, true);
  });
  it("typical VMC (Haas VF): F_rapid=30000, a=5000 → moderate", () => {
    const r = computeProgramTimeSec(program, { rapidFeedrateMmPerMin: 30000, accelMmPerSec2: 5000 });
    assert.equal(r.totalSec > 10, true);
    assert.equal(r.totalSec < 30, true);
  });
  it("high-speed mill (DMG Mori NHX): F_rapid=60000, a=15000 → lowest cycle", () => {
    const r = computeProgramTimeSec(program, { rapidFeedrateMmPerMin: 60000, accelMmPerSec2: 15000 });
    assert.equal(r.totalSec > 10, true);
    assert.equal(r.totalSec < 25, true);
  });
});
