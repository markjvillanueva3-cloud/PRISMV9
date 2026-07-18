/**
 * se3-slerp-5axis-emit.test.mjs — concrete-value tests for SE(3)
 * interpolation emit. Hand-checked quaternion + Euler math.
 *
 * Hand-checked anchors:
 *   SLERP(identity, identity, τ) = identity for all τ (small-angle path)
 *   SLERP([1,0,0,0], [0,1,0,0], 0.5) = [√2/2, √2/2, 0, 0]
 *     (i.e. 90° rotation about X — half of the 180° endpoint)
 *   quaternionToEulerZYX([1,0,0,0]) = {roll:0, pitch:0, yaw:0}
 *   quaternionToEulerZYX([√2/2, √2/2, 0, 0]):
 *     roll = atan2(1, 0) = π/2 ≈ 1.5707963
 *     pitch = asin(0) = 0
 *     yaw = atan2(0, 1) = 0
 *   lerpPosition([0,0,0], [10,5,2], 0.5) = [5, 2.5, 1]
 */

import { describe, it } from "node:test";
import { strict as assert } from "node:assert";

import {
  SE3_SLERP_EMIT_SCHEMA_VERSION,
  DEFAULT_DECIMAL_PLACES,
  SMALL_ANGLE_DOT_THRESHOLD,
  MAX_INTERP_STEPS,
  SUPPORTED_DIALECTS,
  DEFAULT_ROTARY_AXIS_MAP,
  formatComment,
  normalizeQuaternion,
  quaternionDot,
  slerp,
  lerpPosition,
  quaternionToEulerZYX,
  radToDeg,
  interpolateFramesSE3,
  formatFrameLine,
  emitSE3InterpolatedProgram,
} from "./se3-slerp-5axis-emit.mjs";

const EPS = 1e-9;
const EPS_TRIG = 1e-7;
const approx = (a, b) => Math.abs(a - b) < EPS;
const approxT = (a, b) => Math.abs(a - b) < EPS_TRIG;
const SQRT_HALF = Math.sqrt(0.5); // ≈ 0.7071067811865476

describe("constants", () => {
  it("SE3_SLERP_EMIT_SCHEMA_VERSION = 1", () => {
    assert.strictEqual(SE3_SLERP_EMIT_SCHEMA_VERSION, 1);
  });
  it("DEFAULT_DECIMAL_PLACES = 4", () => {
    assert.strictEqual(DEFAULT_DECIMAL_PLACES, 4);
  });
  it("SMALL_ANGLE_DOT_THRESHOLD = 0.9995", () => {
    assert.strictEqual(SMALL_ANGLE_DOT_THRESHOLD, 0.9995);
  });
  it("MAX_INTERP_STEPS = 1024", () => {
    assert.strictEqual(MAX_INTERP_STEPS, 1024);
  });
  it("DEFAULT_ROTARY_AXIS_MAP = {roll:A, pitch:B, yaw:C}", () => {
    assert.deepStrictEqual(DEFAULT_ROTARY_AXIS_MAP, { roll: "A", pitch: "B", yaw: "C" });
  });
  it("SUPPORTED_DIALECTS has 5 entries", () => {
    assert.deepStrictEqual(SUPPORTED_DIALECTS, [
      "fanuc", "haas", "heidenhain", "mitsubishi", "siemens",
    ]);
  });
});

describe("formatComment", () => {
  it("fanuc wraps + strips parens", () => {
    assert.strictEqual(formatComment("fanuc", "SE3-SLERP steps=2"), "( SE3-SLERP steps=2 )");
  });
  it("heidenhain uses '; '", () => {
    assert.strictEqual(formatComment("heidenhain", "x"), "; x");
  });
  it("returns null on bad dialect", () => {
    assert.strictEqual(formatComment("makino", "x"), null);
  });
});

describe("normalizeQuaternion", () => {
  it("[1,0,0,0] (already unit) returns itself", () => {
    assert.deepStrictEqual(normalizeQuaternion([1, 0, 0, 0]), [1, 0, 0, 0]);
  });
  it("[2,0,0,0] (norm 2) normalizes to [1,0,0,0]", () => {
    assert.deepStrictEqual(normalizeQuaternion([2, 0, 0, 0]), [1, 0, 0, 0]);
  });
  it("[1,1,1,1] normalizes to [0.5, 0.5, 0.5, 0.5]", () => {
    const r = normalizeQuaternion([1, 1, 1, 1]);
    assert.ok(approx(r[0], 0.5) && approx(r[1], 0.5) && approx(r[2], 0.5) && approx(r[3], 0.5));
  });
  it("[0,0,0,0] (zero norm) → null", () => {
    assert.strictEqual(normalizeQuaternion([0, 0, 0, 0]), null);
  });
  it("non-array → null", () => {
    assert.strictEqual(normalizeQuaternion("nope"), null);
  });
  it("wrong length (3) → null", () => {
    assert.strictEqual(normalizeQuaternion([1, 0, 0]), null);
  });
  it("non-finite element → null", () => {
    assert.strictEqual(normalizeQuaternion([1, 0, 0, Number.NaN]), null);
  });
});

describe("quaternionDot", () => {
  it("identity · identity = 1", () => {
    assert.strictEqual(quaternionDot([1, 0, 0, 0], [1, 0, 0, 0]), 1);
  });
  it("identity · [0,1,0,0] = 0 (orthogonal)", () => {
    assert.strictEqual(quaternionDot([1, 0, 0, 0], [0, 1, 0, 0]), 0);
  });
  it("identity · negated-identity = -1", () => {
    assert.strictEqual(quaternionDot([1, 0, 0, 0], [-1, 0, 0, 0]), -1);
  });
  it("returns null on bad input", () => {
    assert.strictEqual(quaternionDot([1, 0, 0], [1, 0, 0, 0]), null);
  });
});

describe("slerp", () => {
  it("identity to identity at τ=0.5 → identity (small-angle fast path)", () => {
    const r = slerp([1, 0, 0, 0], [1, 0, 0, 0], 0.5);
    assert.ok(approx(r[0], 1) && approx(r[1], 0) && approx(r[2], 0) && approx(r[3], 0));
  });
  it("identity to identity at τ=0 → identity", () => {
    const r = slerp([1, 0, 0, 0], [1, 0, 0, 0], 0);
    assert.ok(approx(r[0], 1));
  });
  it("identity to identity at τ=1 → identity", () => {
    const r = slerp([1, 0, 0, 0], [1, 0, 0, 0], 1);
    assert.ok(approx(r[0], 1));
  });
  it("identity → 180° X-rotation at τ=0.5 = 90° X = [√2/2, √2/2, 0, 0]", () => {
    const r = slerp([1, 0, 0, 0], [0, 1, 0, 0], 0.5);
    assert.ok(approxT(r[0], SQRT_HALF));
    assert.ok(approxT(r[1], SQRT_HALF));
    assert.ok(approxT(r[2], 0));
    assert.ok(approxT(r[3], 0));
  });
  it("identity → 180° Z-rotation at τ=0.5 = 90° Z", () => {
    const r = slerp([1, 0, 0, 0], [0, 0, 0, 1], 0.5);
    assert.ok(approxT(r[0], SQRT_HALF));
    assert.ok(approxT(r[3], SQRT_HALF));
  });
  it("SLERP handles negative dot (shortest-arc via negation)", () => {
    // q1 = -identity is identical orientation but negative dot.
    // SLERP should pick shortest arc = identity at any τ.
    const r = slerp([1, 0, 0, 0], [-1, 0, 0, 0], 0.5);
    assert.ok(approx(r[0], 1) || approx(r[0], -1)); // identity (sign-ambiguous)
  });
  it("τ=0 returns q0", () => {
    const r = slerp([1, 0, 0, 0], [0, 1, 0, 0], 0);
    assert.ok(approxT(r[0], 1));
    assert.ok(approxT(r[1], 0));
  });
  it("τ=1 returns q1", () => {
    const r = slerp([1, 0, 0, 0], [0, 1, 0, 0], 1);
    assert.ok(approxT(r[0], 0));
    assert.ok(approxT(r[1], 1));
  });
  it("returns null on bad input quaternion", () => {
    assert.strictEqual(slerp([1, 0, 0], [1, 0, 0, 0], 0.5), null);
  });
  it("returns null on τ out of [0,1]", () => {
    assert.strictEqual(slerp([1, 0, 0, 0], [0, 1, 0, 0], 1.5), null);
  });
  it("returns null on negative τ", () => {
    assert.strictEqual(slerp([1, 0, 0, 0], [0, 1, 0, 0], -0.1), null);
  });
});

describe("lerpPosition", () => {
  it("[0,0,0] to [10,5,2] at τ=0.5 → [5, 2.5, 1]", () => {
    assert.deepStrictEqual(lerpPosition([0, 0, 0], [10, 5, 2], 0.5), [5, 2.5, 1]);
  });
  it("τ=0 returns p0", () => {
    assert.deepStrictEqual(lerpPosition([0, 0, 0], [10, 5, 2], 0), [0, 0, 0]);
  });
  it("τ=1 returns p1", () => {
    assert.deepStrictEqual(lerpPosition([0, 0, 0], [10, 5, 2], 1), [10, 5, 2]);
  });
  it("returns null on bad position length", () => {
    assert.strictEqual(lerpPosition([0, 0], [1, 1, 1], 0.5), null);
  });
  it("returns null on τ out of range", () => {
    assert.strictEqual(lerpPosition([0, 0, 0], [1, 1, 1], 1.5), null);
  });
});

describe("quaternionToEulerZYX", () => {
  it("identity quaternion → {roll:0, pitch:0, yaw:0}", () => {
    const e = quaternionToEulerZYX([1, 0, 0, 0]);
    assert.ok(approxT(e.roll, 0));
    assert.ok(approxT(e.pitch, 0));
    assert.ok(approxT(e.yaw, 0));
  });
  it("90° X-rotation quaternion [√2/2, √2/2, 0, 0] → roll=π/2", () => {
    const e = quaternionToEulerZYX([SQRT_HALF, SQRT_HALF, 0, 0]);
    assert.ok(approxT(e.roll, Math.PI / 2));
    assert.ok(approxT(e.pitch, 0));
    assert.ok(approxT(e.yaw, 0));
  });
  it("180° Z-rotation quaternion [0, 0, 0, 1] → yaw=π", () => {
    const e = quaternionToEulerZYX([0, 0, 0, 1]);
    assert.ok(approxT(e.roll, 0));
    assert.ok(approxT(e.pitch, 0));
    assert.ok(approxT(Math.abs(e.yaw), Math.PI));
  });
  it("returns null on bad input", () => {
    assert.strictEqual(quaternionToEulerZYX([1, 0, 0]), null);
  });
});

describe("radToDeg", () => {
  it("π → 180", () => {
    assert.ok(approxT(radToDeg(Math.PI), 180));
  });
  it("π/2 → 90", () => {
    assert.ok(approxT(radToDeg(Math.PI / 2), 90));
  });
  it("0 → 0", () => {
    assert.strictEqual(radToDeg(0), 0);
  });
  it("returns null on non-finite", () => {
    assert.strictEqual(radToDeg(Number.NaN), null);
  });
});

describe("interpolateFramesSE3", () => {
  const f0 = { position: [0, 0, 0], quaternion: [1, 0, 0, 0] };
  const f1Trans = { position: [10, 0, 0], quaternion: [1, 0, 0, 0] };

  it("steps=2 produces 3 frames (endpoints + 1 midpoint)", () => {
    const r = interpolateFramesSE3(f0, f1Trans, 2);
    assert.strictEqual(r.frames.length, 3);
    assert.strictEqual(r.summary.frameCount, 3);
    assert.strictEqual(r.summary.stepCount, 2);
    assert.deepStrictEqual(r.frames[0].position, [0, 0, 0]);
    assert.deepStrictEqual(r.frames[1].position, [5, 0, 0]);
    assert.deepStrictEqual(r.frames[2].position, [10, 0, 0]);
  });
  it("steps=1 produces 2 frames (endpoints only)", () => {
    const r = interpolateFramesSE3(f0, f1Trans, 1);
    assert.strictEqual(r.frames.length, 2);
  });
  it("steps=4 produces 5 frames", () => {
    const r = interpolateFramesSE3(f0, f1Trans, 4);
    assert.strictEqual(r.frames.length, 5);
    assert.deepStrictEqual(r.frames[2].position, [5, 0, 0]); // midpoint
  });
  it("tau field set 0, 0.5, 1 for steps=2", () => {
    const r = interpolateFramesSE3(f0, f1Trans, 2);
    assert.strictEqual(r.frames[0].tau, 0);
    assert.strictEqual(r.frames[1].tau, 0.5);
    assert.strictEqual(r.frames[2].tau, 1);
  });
  it("180° X-rotation interpolated through midpoint = 90° X", () => {
    const r = interpolateFramesSE3(f0, {
      position: [0, 0, 0], quaternion: [0, 1, 0, 0],
    }, 2);
    const midQ = r.frames[1].quaternion;
    assert.ok(approxT(midQ[0], SQRT_HALF));
    assert.ok(approxT(midQ[1], SQRT_HALF));
  });
  it("returns null on bad steps (0)", () => {
    assert.strictEqual(interpolateFramesSE3(f0, f1Trans, 0), null);
  });
  it("returns null on too-many steps (1025 > MAX)", () => {
    assert.strictEqual(interpolateFramesSE3(f0, f1Trans, 1025), null);
  });
  it("returns null on non-integer steps", () => {
    assert.strictEqual(interpolateFramesSE3(f0, f1Trans, 2.5), null);
  });
  it("returns null on bad f0", () => {
    assert.strictEqual(interpolateFramesSE3(null, f1Trans, 2), null);
  });
  it("returns null on bad position dim", () => {
    assert.strictEqual(interpolateFramesSE3(
      { position: [0, 0], quaternion: [1, 0, 0, 0] }, f1Trans, 2,
    ), null);
  });
  it("returns null on bad quaternion (zero norm)", () => {
    assert.strictEqual(interpolateFramesSE3(
      { position: [0, 0, 0], quaternion: [0, 0, 0, 0] }, f1Trans, 2,
    ), null);
  });
});

describe("formatFrameLine", () => {
  it("identity frame at origin → 'G1 X0.0000 Y0.0000 Z0.0000 A0.0000 B0.0000 C0.0000'", () => {
    const line = formatFrameLine({
      position: [0, 0, 0], quaternion: [1, 0, 0, 0], tau: 0,
    }, "fanuc");
    assert.strictEqual(line, "G1 X0.0000 Y0.0000 Z0.0000 A0.0000 B0.0000 C0.0000");
  });
  it("position [5, 2.5, 1] identity orientation", () => {
    const line = formatFrameLine({
      position: [5, 2.5, 1], quaternion: [1, 0, 0, 0],
    }, "fanuc");
    assert.strictEqual(line, "G1 X5.0000 Y2.5000 Z1.0000 A0.0000 B0.0000 C0.0000");
  });
  it("90° X-rotation → A=90.0000 (degrees)", () => {
    const line = formatFrameLine({
      position: [0, 0, 0], quaternion: [SQRT_HALF, SQRT_HALF, 0, 0],
    }, "fanuc");
    // A is roll-X = π/2 rad = 90°
    assert.ok(line.includes("A90.0000"), `got: ${line}`);
  });
  it("decimalPlaces=2 truncates output", () => {
    const line = formatFrameLine({
      position: [5, 2.5, 1], quaternion: [1, 0, 0, 0],
    }, "fanuc", { decimalPlaces: 2 });
    assert.strictEqual(line, "G1 X5.00 Y2.50 Z1.00 A0.00 B0.00 C0.00");
  });
  it("custom rotaryAxisMap swaps A/B/C assignment", () => {
    const line = formatFrameLine({
      position: [0, 0, 0], quaternion: [SQRT_HALF, SQRT_HALF, 0, 0],
    }, "fanuc", { rotaryAxisMap: { roll: "B", pitch: "A", yaw: "C" } });
    // roll is now mapped to B
    assert.ok(line.includes("B90.0000"), `got: ${line}`);
  });
  it("returns null on bad frame", () => {
    assert.strictEqual(formatFrameLine(null, "fanuc"), null);
  });
  it("returns null on bad dialect", () => {
    assert.strictEqual(formatFrameLine({
      position: [0, 0, 0], quaternion: [1, 0, 0, 0],
    }, "makino"), null);
  });
});

describe("emitSE3InterpolatedProgram", () => {
  const f0 = { position: [0, 0, 0], quaternion: [1, 0, 0, 0] };
  const f1 = { position: [10, 5, 2], quaternion: [1, 0, 0, 0] };

  it("steps=2 fanuc → 1 header + 3 G1 lines = 4 lines total", () => {
    const r = emitSE3InterpolatedProgram({ f0, f1, steps: 2, dialect: "fanuc" });
    assert.strictEqual(r.lines.length, 4);
    assert.ok(r.lines[0].startsWith("( SE3-SLERP steps=2 frames=3"));
    assert.strictEqual(r.lines[1], "G1 X0.0000 Y0.0000 Z0.0000 A0.0000 B0.0000 C0.0000");
    assert.strictEqual(r.lines[2], "G1 X5.0000 Y2.5000 Z1.0000 A0.0000 B0.0000 C0.0000");
    assert.strictEqual(r.lines[3], "G1 X10.0000 Y5.0000 Z2.0000 A0.0000 B0.0000 C0.0000");
  });
  it("heidenhain uses '; ' header prefix", () => {
    const r = emitSE3InterpolatedProgram({ f0, f1, steps: 2, dialect: "heidenhain" });
    assert.ok(r.lines[0].startsWith("; SE3-SLERP"));
  });
  it("summary carries schema version + dialect + line count", () => {
    const r = emitSE3InterpolatedProgram({ f0, f1, steps: 2, dialect: "fanuc" });
    assert.strictEqual(r.summary.schemaVersion, 1);
    assert.strictEqual(r.summary.dialect, "fanuc");
    assert.strictEqual(r.summary.lineCount, 4);
    assert.strictEqual(r.summary.frameCount, 3);
  });
  it("returns null on null req", () => {
    assert.strictEqual(emitSE3InterpolatedProgram(null), null);
  });
  it("returns null on bad dialect", () => {
    assert.strictEqual(emitSE3InterpolatedProgram({
      f0, f1, steps: 2, dialect: "x",
    }), null);
  });
  it("returns null on bad steps (0)", () => {
    assert.strictEqual(emitSE3InterpolatedProgram({
      f0, f1, steps: 0, dialect: "fanuc",
    }), null);
  });
});

describe("regression: schema + dialect invariants", () => {
  const f0 = { position: [0, 0, 0], quaternion: [1, 0, 0, 0] };
  const f1 = { position: [10, 5, 2], quaternion: [1, 0, 0, 0] };

  it("every dialect produces non-null emit", () => {
    for (const dialect of SUPPORTED_DIALECTS) {
      const r = emitSE3InterpolatedProgram({ f0, f1, steps: 1, dialect });
      assert.ok(r != null, `dialect=${dialect} returned null`);
      assert.strictEqual(r.summary.schemaVersion, SE3_SLERP_EMIT_SCHEMA_VERSION);
    }
  });
});
