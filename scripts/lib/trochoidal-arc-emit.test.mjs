/**
 * trochoidal-arc-emit.test.mjs — concrete-value tests for closed-form
 * trochoidal arc emit. Every assertion uses .strictEqual or numeric
 * approximate-equality on a hand-checked value.
 *
 * Hand-checked anchor chain (W=10mm, D=6mm, L=10mm, s=0.5mm):
 *   r = (10 - 6) / 2 = 2 mm
 *   n_steps = floor((10 - 4) / 0.5) = 12
 *   n_petals = n_steps + 1 = 13
 *   perLoop = 2π·2 + 0.5 = 4π + 0.5 ≈ 13.0664
 *   total = 13·4π + 12·0.5 = 52π + 6 ≈ 169.3628
 */

import { describe, it } from "node:test";
import { strict as assert } from "node:assert";

import {
  TROCHOIDAL_ARC_SCHEMA_VERSION,
  DEFAULT_DECIMAL_PLACES,
  MIN_RADIUS_MM,
  MAX_LOOPS,
  SUPPORTED_DIALECTS,
  SUPPORTED_ARC_DIRECTIONS,
  formatComment,
  trochoidalRadiusMm,
  loopsForSlotLength,
  pathLengthPerLoopMm,
  totalPathLengthMm,
  buildTrochoidalArcBlocks,
  formatArcLine,
  formatLinearLine,
  formatBlock,
  emitTrochoidalArcProgram,
} from "./trochoidal-arc-emit.mjs";

const EPS = 1e-9;
const approx = (a, b) => Math.abs(a - b) < EPS;

describe("constants", () => {
  it("TROCHOIDAL_ARC_SCHEMA_VERSION = 1", () => {
    assert.strictEqual(TROCHOIDAL_ARC_SCHEMA_VERSION, 1);
  });
  it("DEFAULT_DECIMAL_PLACES = 4", () => {
    assert.strictEqual(DEFAULT_DECIMAL_PLACES, 4);
  });
  it("MIN_RADIUS_MM = 0.05", () => {
    assert.strictEqual(MIN_RADIUS_MM, 0.05);
  });
  it("MAX_LOOPS = 100000", () => {
    assert.strictEqual(MAX_LOOPS, 100000);
  });
  it("SUPPORTED_DIALECTS has 5 entries", () => {
    assert.deepStrictEqual(SUPPORTED_DIALECTS, [
      "fanuc", "haas", "heidenhain", "mitsubishi", "siemens",
    ]);
  });
  it("SUPPORTED_ARC_DIRECTIONS = [G2, G3]", () => {
    assert.deepStrictEqual(SUPPORTED_ARC_DIRECTIONS, ["G2", "G3"]);
  });
});

describe("trochoidalRadiusMm", () => {
  it("W=10 D=6 → r=2", () => {
    assert.strictEqual(trochoidalRadiusMm(10, 6), 2);
  });
  it("W=12 D=10 → r=1", () => {
    assert.strictEqual(trochoidalRadiusMm(12, 10), 1);
  });
  it("W=20 D=8 → r=6", () => {
    assert.strictEqual(trochoidalRadiusMm(20, 8), 6);
  });
  it("W=6.20 D=6 → r=0.10 (above MIN_RADIUS, accepted)", () => {
    // 6.20-6 = 0.20 (float-safe) → r=0.10; comfortably above MIN_RADIUS=0.05
    assert.ok(approx(trochoidalRadiusMm(6.20, 6), 0.10));
  });
  it("W=6.05 D=6 → r=0.025 (below MIN_RADIUS=0.05) → null", () => {
    assert.strictEqual(trochoidalRadiusMm(6.05, 6), null);
  });
  it("W=D=5 → null (no trochoidal possible)", () => {
    assert.strictEqual(trochoidalRadiusMm(5, 5), null);
  });
  it("W < D → null (tool wider than slot)", () => {
    assert.strictEqual(trochoidalRadiusMm(5, 6), null);
  });
  it("non-finite W → null", () => {
    assert.strictEqual(trochoidalRadiusMm(Number.NaN, 6), null);
  });
  it("non-finite D → null", () => {
    assert.strictEqual(trochoidalRadiusMm(10, Infinity), null);
  });
  it("zero W → null", () => {
    assert.strictEqual(trochoidalRadiusMm(0, 6), null);
  });
  it("negative D → null", () => {
    assert.strictEqual(trochoidalRadiusMm(10, -6), null);
  });
});

describe("loopsForSlotLength", () => {
  it("L=10 r=2 s=0.5 → n=12 (hand: floor((10-4)/0.5))", () => {
    assert.strictEqual(loopsForSlotLength(10, 2, 0.5), 12);
  });
  it("L=4 r=2 s=0.5 → n=0 (slot exactly fits one petal)", () => {
    assert.strictEqual(loopsForSlotLength(4, 2, 0.5), 0);
  });
  it("L=12 r=2 s=2 → n=4 (floor((12-4)/2))", () => {
    assert.strictEqual(loopsForSlotLength(12, 2, 2), 4);
  });
  it("L=3 r=2 s=0.5 → null (L < 2r, no fit)", () => {
    assert.strictEqual(loopsForSlotLength(3, 2, 0.5), null);
  });
  it("L=100 r=1 s=1 → n=98 (floor((100-2)/1))", () => {
    assert.strictEqual(loopsForSlotLength(100, 1, 1), 98);
  });
  it("non-finite L → null", () => {
    assert.strictEqual(loopsForSlotLength(Number.NaN, 2, 0.5), null);
  });
  it("zero stepOver → null", () => {
    assert.strictEqual(loopsForSlotLength(10, 2, 0), null);
  });
  it("negative L → null", () => {
    assert.strictEqual(loopsForSlotLength(-1, 2, 0.5), null);
  });
});

describe("pathLengthPerLoopMm", () => {
  it("r=2 s=0.5 → 2π·2 + 0.5 = 4π + 0.5 ≈ 13.0664", () => {
    assert.ok(approx(pathLengthPerLoopMm(2, 0.5), 4 * Math.PI + 0.5));
  });
  it("r=1 s=1 → 2π + 1 ≈ 7.2832", () => {
    assert.ok(approx(pathLengthPerLoopMm(1, 1), 2 * Math.PI + 1));
  });
  it("r=2 s=0 → 2π·2 = 4π ≈ 12.5664 (no step-over)", () => {
    assert.ok(approx(pathLengthPerLoopMm(2, 0), 4 * Math.PI));
  });
  it("non-finite r → null", () => {
    assert.strictEqual(pathLengthPerLoopMm(Number.NaN, 0.5), null);
  });
});

describe("totalPathLengthMm", () => {
  it("W=10 L=10 D=6 s=0.5 → 13·4π + 12·0.5 = 52π + 6 ≈ 169.3628", () => {
    assert.ok(approx(totalPathLengthMm(10, 10, 6, 0.5), 52 * Math.PI + 6));
  });
  it("W=10 L=4 D=6 s=0.5 → 1·4π + 0 = 4π ≈ 12.5664 (single petal)", () => {
    assert.ok(approx(totalPathLengthMm(10, 4, 6, 0.5), 4 * Math.PI));
  });
  it("W=10 L=12 D=6 s=2 → 5·4π + 4·2 = 20π + 8 ≈ 70.8319", () => {
    assert.ok(approx(totalPathLengthMm(10, 12, 6, 2), 20 * Math.PI + 8));
  });
  it("W=5 D=6 → null (tool wider than slot)", () => {
    assert.strictEqual(totalPathLengthMm(5, 10, 6, 0.5), null);
  });
});

describe("buildTrochoidalArcBlocks", () => {
  it("L=4 W=10 D=6 s=0.5 startX=0 startY=0 — single petal, no linear", () => {
    const r = buildTrochoidalArcBlocks({
      slotWidthMm: 10, slotLengthMm: 4, toolDiameterMm: 6, stepOverMm: 0.5,
      startX: 0, startY: 0,
    });
    assert.strictEqual(r.blocks.length, 1); // n=0 → 1 arc, 0 linears
    assert.strictEqual(r.blocks[0].kind, "arc");
    assert.strictEqual(r.blocks[0].direction, "G3");
    assert.strictEqual(r.blocks[0].centerX, 2); // startX + r
    assert.strictEqual(r.blocks[0].centerY, 0);
    assert.strictEqual(r.blocks[0].radius, 2);
    assert.strictEqual(r.summary.radius, 2);
    assert.strictEqual(r.summary.loops, 1); // petal count = n+1 = 1
    assert.ok(approx(r.summary.totalLengthMm, 4 * Math.PI));
  });
  it("L=10 W=10 D=6 s=0.5 — 13 petals, 12 linears, 25 blocks total", () => {
    const r = buildTrochoidalArcBlocks({
      slotWidthMm: 10, slotLengthMm: 10, toolDiameterMm: 6, stepOverMm: 0.5,
      startX: 0, startY: 0,
    });
    assert.strictEqual(r.blocks.length, 13 + 12); // 13 arcs + 12 linears = 25
    assert.strictEqual(r.summary.loops, 13);
    assert.ok(approx(r.summary.totalLengthMm, 52 * Math.PI + 6));
    assert.strictEqual(r.blocks[0].kind, "arc");
    assert.strictEqual(r.blocks[1].kind, "linear");
    assert.strictEqual(r.blocks[1].endX, 0.5);
    assert.strictEqual(r.blocks[2].kind, "arc");
    assert.strictEqual(r.blocks[2].centerX, 2.5); // 0 + r + 1·s = 2.5
  });
  it("startX=10 startY=5 — shifts coordinates correctly", () => {
    const r = buildTrochoidalArcBlocks({
      slotWidthMm: 10, slotLengthMm: 4, toolDiameterMm: 6, stepOverMm: 0.5,
      startX: 10, startY: 5,
    });
    assert.strictEqual(r.blocks[0].centerX, 12); // startX + r
    assert.strictEqual(r.blocks[0].centerY, 5);
    assert.strictEqual(r.blocks[0].startX, 10);
    assert.strictEqual(r.blocks[0].startY, 5);
  });
  it("arcDirection=G2 (clockwise) propagates into block.direction", () => {
    const r = buildTrochoidalArcBlocks({
      slotWidthMm: 10, slotLengthMm: 4, toolDiameterMm: 6, stepOverMm: 0.5,
      startX: 0, startY: 0, arcDirection: "G2",
    });
    assert.strictEqual(r.blocks[0].direction, "G2");
    assert.strictEqual(r.summary.arcDirection, "G2");
  });
  it("L=12 W=10 D=6 s=2 — n=4 → 5 arcs + 4 linears = 9 blocks", () => {
    const r = buildTrochoidalArcBlocks({
      slotWidthMm: 10, slotLengthMm: 12, toolDiameterMm: 6, stepOverMm: 2,
      startX: 0, startY: 0,
    });
    assert.strictEqual(r.blocks.length, 9);
    assert.strictEqual(r.summary.loops, 5);
    assert.ok(approx(r.summary.totalLengthMm, 20 * Math.PI + 8));
    // Verify centers advance by s=2
    assert.strictEqual(r.blocks[0].centerX, 2);
    assert.strictEqual(r.blocks[2].centerX, 4); // i=1
    assert.strictEqual(r.blocks[4].centerX, 6); // i=2
    assert.strictEqual(r.blocks[6].centerX, 8); // i=3
    assert.strictEqual(r.blocks[8].centerX, 10); // i=4
  });
  it("returns null on null req", () => {
    assert.strictEqual(buildTrochoidalArcBlocks(null), null);
  });
  it("returns null on bad arcDirection", () => {
    assert.strictEqual(buildTrochoidalArcBlocks({
      slotWidthMm: 10, slotLengthMm: 4, toolDiameterMm: 6, stepOverMm: 0.5,
      startX: 0, startY: 0, arcDirection: "G99",
    }), null);
  });
  it("returns null on non-finite startX", () => {
    assert.strictEqual(buildTrochoidalArcBlocks({
      slotWidthMm: 10, slotLengthMm: 4, toolDiameterMm: 6, stepOverMm: 0.5,
      startX: Number.NaN, startY: 0,
    }), null);
  });
  it("returns null on tool wider than slot", () => {
    assert.strictEqual(buildTrochoidalArcBlocks({
      slotWidthMm: 5, slotLengthMm: 10, toolDiameterMm: 6, stepOverMm: 0.5,
      startX: 0, startY: 0,
    }), null);
  });
  it("returns null on slot too short for one petal", () => {
    assert.strictEqual(buildTrochoidalArcBlocks({
      slotWidthMm: 10, slotLengthMm: 3, toolDiameterMm: 6, stepOverMm: 0.5,
      startX: 0, startY: 0,
    }), null);
  });
});

describe("formatArcLine", () => {
  const arcBlock0 = {
    kind: "arc", direction: "G3", centerX: 2, centerY: 0, radius: 2,
    startX: 0, startY: 0,
  };

  it("fanuc G3 arc emits ISO X..Y..I..J.. with full-circle endpoints", () => {
    // Full circle: end=start, I=cx-startX=2, J=cy-startY=0
    assert.strictEqual(
      formatArcLine(arcBlock0, "fanuc"),
      "G3 X0.0000 Y0.0000 I2.0000 J0.0000",
    );
  });
  it("haas matches fanuc syntax", () => {
    assert.strictEqual(
      formatArcLine(arcBlock0, "haas"),
      "G3 X0.0000 Y0.0000 I2.0000 J0.0000",
    );
  });
  it("siemens uses ISO syntax (G3 X..Y..I..J..)", () => {
    assert.strictEqual(
      formatArcLine(arcBlock0, "siemens"),
      "G3 X0.0000 Y0.0000 I2.0000 J0.0000",
    );
  });
  it("decimalPlaces=2 truncates output", () => {
    assert.strictEqual(
      formatArcLine(arcBlock0, "fanuc", { decimalPlaces: 2 }),
      "G3 X0.00 Y0.00 I2.00 J0.00",
    );
  });
  it("G2 clockwise renders correctly", () => {
    assert.strictEqual(
      formatArcLine({ ...arcBlock0, direction: "G2" }, "fanuc"),
      "G2 X0.0000 Y0.0000 I2.0000 J0.0000",
    );
  });
  it("offset arc with startX=10 startY=5", () => {
    assert.strictEqual(
      formatArcLine({
        kind: "arc", direction: "G3", centerX: 12, centerY: 5, radius: 2,
        startX: 10, startY: 5,
      }, "fanuc"),
      "G3 X10.0000 Y5.0000 I2.0000 J0.0000",
    );
  });
  it("returns null on non-arc block", () => {
    assert.strictEqual(formatArcLine({ kind: "linear" }, "fanuc"), null);
  });
  it("returns null on bad dialect", () => {
    assert.strictEqual(formatArcLine(arcBlock0, "makino"), null);
  });
  it("returns null on bad direction", () => {
    assert.strictEqual(formatArcLine({ ...arcBlock0, direction: "G99" }, "fanuc"), null);
  });
});

describe("formatLinearLine", () => {
  it("fanuc G1 emits X..Y..", () => {
    assert.strictEqual(
      formatLinearLine({ kind: "linear", direction: "G1", endX: 0.5, endY: 0 }, "fanuc"),
      "G1 X0.5000 Y0.0000",
    );
  });
  it("decimalPlaces=2 truncates", () => {
    assert.strictEqual(
      formatLinearLine({ kind: "linear", direction: "G1", endX: 0.5, endY: 0 }, "fanuc", { decimalPlaces: 2 }),
      "G1 X0.50 Y0.00",
    );
  });
  it("returns null on bad block", () => {
    assert.strictEqual(formatLinearLine({ kind: "arc" }, "fanuc"), null);
  });
  it("returns null on bad dialect", () => {
    assert.strictEqual(formatLinearLine({ kind: "linear", endX: 1, endY: 1 }, "makino"), null);
  });
});

describe("formatBlock (dispatches arc/linear)", () => {
  it("dispatches arc → formatArcLine", () => {
    assert.strictEqual(
      formatBlock({ kind: "arc", direction: "G3", centerX: 2, centerY: 0, radius: 2, startX: 0, startY: 0 }, "fanuc"),
      "G3 X0.0000 Y0.0000 I2.0000 J0.0000",
    );
  });
  it("dispatches linear → formatLinearLine", () => {
    assert.strictEqual(
      formatBlock({ kind: "linear", endX: 0.5, endY: 0 }, "fanuc"),
      "G1 X0.5000 Y0.0000",
    );
  });
  it("returns null on unknown kind", () => {
    assert.strictEqual(formatBlock({ kind: "rapid" }, "fanuc"), null);
  });
  it("returns null on null block", () => {
    assert.strictEqual(formatBlock(null, "fanuc"), null);
  });
});

describe("emitTrochoidalArcProgram", () => {
  it("L=4 W=10 D=6 s=0.5 fanuc — header + 1 arc, no linear (single petal)", () => {
    const r = emitTrochoidalArcProgram({
      slotWidthMm: 10, slotLengthMm: 4, toolDiameterMm: 6, stepOverMm: 0.5,
      startX: 0, startY: 0, dialect: "fanuc",
    });
    assert.strictEqual(r.lines.length, 2);
    assert.strictEqual(r.lines[0].startsWith("( TROCHOIDAL slot W=10"), true);
    assert.strictEqual(r.lines[1], "G3 X0.0000 Y0.0000 I2.0000 J0.0000");
    assert.strictEqual(r.summary.loops, 1);
    assert.strictEqual(r.summary.dialect, "fanuc");
    assert.strictEqual(r.summary.schemaVersion, 1);
  });
  it("L=10 W=10 D=6 s=0.5 fanuc — 1 header + 13 arcs + 12 linears = 26 lines", () => {
    const r = emitTrochoidalArcProgram({
      slotWidthMm: 10, slotLengthMm: 10, toolDiameterMm: 6, stepOverMm: 0.5,
      startX: 0, startY: 0, dialect: "fanuc",
    });
    assert.strictEqual(r.lines.length, 26);
    assert.strictEqual(r.summary.lineCount, 26);
    assert.strictEqual(r.summary.loops, 13);
  });
  it("heidenhain emits '; ' prefixed header line", () => {
    const r = emitTrochoidalArcProgram({
      slotWidthMm: 10, slotLengthMm: 4, toolDiameterMm: 6, stepOverMm: 0.5,
      startX: 0, startY: 0, dialect: "heidenhain",
    });
    assert.strictEqual(r.lines[0].startsWith("; TROCHOIDAL"), true);
  });
  it("arcDirection=G2 propagates to emitted arc lines", () => {
    const r = emitTrochoidalArcProgram({
      slotWidthMm: 10, slotLengthMm: 4, toolDiameterMm: 6, stepOverMm: 0.5,
      startX: 0, startY: 0, dialect: "fanuc", arcDirection: "G2",
    });
    assert.strictEqual(r.lines[1].startsWith("G2 "), true);
  });
  it("decimalPlaces=2 propagates to all numeric output", () => {
    const r = emitTrochoidalArcProgram({
      slotWidthMm: 10, slotLengthMm: 4, toolDiameterMm: 6, stepOverMm: 0.5,
      startX: 0, startY: 0, dialect: "fanuc", options: { decimalPlaces: 2 },
    });
    assert.strictEqual(r.lines[1], "G3 X0.00 Y0.00 I2.00 J0.00");
  });
  it("returns null on null req", () => {
    assert.strictEqual(emitTrochoidalArcProgram(null), null);
  });
  it("returns null on unsupported dialect", () => {
    assert.strictEqual(emitTrochoidalArcProgram({
      slotWidthMm: 10, slotLengthMm: 4, toolDiameterMm: 6, stepOverMm: 0.5,
      startX: 0, startY: 0, dialect: "makino",
    }), null);
  });
  it("returns null on tool wider than slot", () => {
    assert.strictEqual(emitTrochoidalArcProgram({
      slotWidthMm: 5, slotLengthMm: 10, toolDiameterMm: 6, stepOverMm: 0.5,
      startX: 0, startY: 0, dialect: "fanuc",
    }), null);
  });
});

describe("regression: closed-form replaces N linear segments per petal", () => {
  it("13-petal slot emits 26 lines (header + 25 blocks) vs ~470 lines linearized", () => {
    // Linearized arc approximation typically uses ~36 segments/360°
    // → 13 petals × 36 segs = 468 linear blocks, + 12 step-overs + 1 header = ~481 lines
    // Closed-form: 1 + 13 + 12 = 26 lines → ~18.5× reduction
    const r = emitTrochoidalArcProgram({
      slotWidthMm: 10, slotLengthMm: 10, toolDiameterMm: 6, stepOverMm: 0.5,
      startX: 0, startY: 0, dialect: "fanuc",
    });
    assert.strictEqual(r.lines.length, 26);
    assert.ok(r.lines.length < 30); // bound far below linearized
  });
});

describe("regression: schema + dialect invariants", () => {
  it("every dialect produces non-null emit + carries schemaVersion=1", () => {
    for (const dialect of SUPPORTED_DIALECTS) {
      const r = emitTrochoidalArcProgram({
        slotWidthMm: 10, slotLengthMm: 4, toolDiameterMm: 6, stepOverMm: 0.5,
        startX: 0, startY: 0, dialect,
      });
      assert.ok(r != null, `dialect=${dialect} returned null`);
      assert.strictEqual(r.summary.schemaVersion, TROCHOIDAL_ARC_SCHEMA_VERSION);
      assert.strictEqual(r.summary.dialect, dialect);
    }
  });
  it("totalPathLengthMm matches summary.totalLengthMm for same params", () => {
    const standalone = totalPathLengthMm(10, 10, 6, 0.5);
    const r = emitTrochoidalArcProgram({
      slotWidthMm: 10, slotLengthMm: 10, toolDiameterMm: 6, stepOverMm: 0.5,
      startX: 0, startY: 0, dialect: "fanuc",
    });
    assert.ok(approx(standalone, r.summary.totalLengthMm));
  });
});
