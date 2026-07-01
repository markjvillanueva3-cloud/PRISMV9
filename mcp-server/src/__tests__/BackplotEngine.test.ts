/**
 * BackplotEngine — behavioral test suite.
 *
 * Closes FEATURE-GAP-AUDIT-MS0::U-GAP-POST-GCODE-BACKPLOT. The engine
 * (PRISM_GCODE_BACKPLOT_ENGINE port) was ported + wired into
 * prism_calc (calcDispatcher backplot_parse / backplot_statistics) but
 * shipped with zero behavioral coverage — the only "backplot" tests in
 * the suite are unrelated WEDM engines.
 *
 * Every assertion checks a real algebraic invariant (G-code kinematics,
 * arc geometry, distance/time accumulation) so the test fails if the
 * parser logic regresses — no toBeDefined() stubs.
 */

import { describe, it, expect } from "vitest";
import { backplotEngine } from "../engines/BackplotEngine.js";

describe("BackplotEngine — linear / rapid kinematics", () => {
  it("G1 linear move: distance, feed accounting, machining time = dist / F", () => {
    const r = backplotEngine.parse("G21 G90\nG1 X10 F100");
    expect(r.moves).toHaveLength(1);
    const m = r.moves[0];
    expect(m.type).toBe("linear");
    expect(m.from).toEqual({ x: 0, y: 0, z: 0 });
    expect(m.to).toEqual({ x: 10, y: 0, z: 0 });
    expect(m.feedRate).toBe(100);
    expect(r.statistics.feedDistance).toBe(10);
    expect(r.statistics.rapidDistance).toBe(0);
    // 10 mm at F100 (mm/min) → 0.1 min
    expect(r.statistics.machiningTime).toBeCloseTo(0.1, 6);
  });

  it("G0 rapid: counted as rapidDistance, feedRate clamped to 10000, no machining time", () => {
    const r = backplotEngine.parse("G0 X3 Y4"); // 3-4-5 triangle → 5
    expect(r.moves).toHaveLength(1);
    expect(r.moves[0].type).toBe("rapid");
    expect(r.moves[0].feedRate).toBe(10000);
    expect(r.statistics.rapidDistance).toBe(5);
    expect(r.statistics.feedDistance).toBe(0);
    expect(r.statistics.machiningTime).toBe(0);
  });

  it("modal motion: G1 then a bare coord line stays linear (modal G1 persists)", () => {
    const r = backplotEngine.parse("G1 F500 X5\nX10\nX15");
    expect(r.moves).toHaveLength(3);
    expect(r.moves.every(m => m.type === "linear")).toBe(true);
    expect(r.moves.map(m => m.to.x)).toEqual([5, 10, 15]);
    expect(r.statistics.feedDistance).toBe(15);
  });

  it("3D euclidean distance across X/Y/Z", () => {
    const r = backplotEngine.parse("G1 X2 Y3 Z6 F1000"); // sqrt(4+9+36)=7
    expect(r.statistics.feedDistance).toBe(7);
  });
});

describe("BackplotEngine — G90 absolute vs G91 incremental", () => {
  it("G91 incremental accumulates from current position", () => {
    const r = backplotEngine.parse("G90 G1 F100 X10\nG91 X5\nX5");
    expect(r.moves.map(m => m.to.x)).toEqual([10, 15, 20]);
    expect(r.statistics.feedDistance).toBe(20);
  });

  it("switching back to G90 resets to absolute targeting", () => {
    const r = backplotEngine.parse("G91 G1 F100 X5\nG90 X2");
    // first: 0→5 (inc), second: absolute → x=2
    expect(r.moves.map(m => m.to.x)).toEqual([5, 2]);
  });
});

describe("BackplotEngine — arc interpolation (G2/G3)", () => {
  it("G3 CCW quarter circle via I/J: 12 segments, every point exactly on radius, exact closed-form length", () => {
    // Position to (10,0) first, then arc → (0,10), center (0,0):
    // I = cx-x1 = 0-10 = -10, J = cy-y1 = 0-0 = 0.
    const r = backplotEngine.parse("G0 X10 Y0\nG3 X0 Y10 I-10 J0 F200");
    const arcs = r.moves.filter(m => m.type === "arc");
    expect(arcs).toHaveLength(12);

    // Every interpolated point lies exactly on r=10 about the recorded center.
    for (const a of arcs) {
      expect(typeof a.arcData?.radius).toBe("number");
      const c = a.arcData!.center;
      const rad = Math.hypot(a.to.x - c.x, a.to.y - c.y);
      expect(rad).toBeCloseTo(10, 9);
      expect(a.arcData!.clockwise).toBe(false);
      expect(a.arcData!.radius).toBeCloseTo(10, 9);
    }
    // Endpoint reached exactly.
    const end = arcs[arcs.length - 1].to;
    expect(end.x).toBeCloseTo(0, 9);
    expect(end.y).toBeCloseTo(10, 9);

    // Closed form: 12 equal chords of a π/2 arc, r=10 → 12·2·10·sin(π/48).
    const expectedLen = 12 * 2 * 10 * Math.sin(Math.PI / 48);
    expect(r.statistics.feedDistance).toBeCloseTo(expectedLen, 3);
    expect(expectedLen).toBeCloseTo(15.697, 3); // sanity pin on the constant
  });

  it("G2 CW arc sets clockwise flag and stays on radius (R-form)", () => {
    // semicircle: (0,0) → (20,0), R10 → center (10,0)
    const r = backplotEngine.parse("G2 X20 Y0 R10 F300");
    const arcs = r.moves.filter(m => m.type === "arc");
    expect(arcs.length).toBeGreaterThanOrEqual(12);
    for (const a of arcs) {
      expect(a.arcData!.clockwise).toBe(true);
      const c = a.arcData!.center;
      expect(Math.hypot(a.to.x - c.x, a.to.y - c.y)).toBeCloseTo(10, 6);
    }
    expect(arcs[arcs.length - 1].to.x).toBeCloseTo(20, 6);
    expect(arcs[arcs.length - 1].to.y).toBeCloseTo(0, 6);
  });

  it("arc carries Z linearly (helical) across segments", () => {
    const r = backplotEngine.parse("G0 X10 Y0\nG3 X0 Y10 Z5 I-10 J0 F200");
    const arcs = r.moves.filter(m => m.type === "arc");
    // Z is EXACTLY linear across n equal segments: z[k] = (5/n)·(k+1).
    // (Intent test, not just monotone — a quadratic ramp would still be
    //  monotone but is wrong.)
    const n = arcs.length;
    for (let k = 0; k < n; k++) {
      expect(arcs[k].to.z).toBeCloseTo((5 / n) * (k + 1), 9);
    }
    expect(arcs[n - 1].to.z).toBeCloseTo(5, 9);
  });
});

describe("BackplotEngine — lexer / line cleaning", () => {
  it("strips ( ) inline comments, ; comments, and N line numbers; case-insensitive", () => {
    const r = backplotEngine.parse(
      "N10 g1 x10 f100 (rough pass)\nN20 ; full comment line\nN30 X20",
    );
    expect(r.moves.map(m => m.to.x)).toEqual([10, 20]);
    expect(r.statistics.feedDistance).toBe(20);
  });

  it("F-only and S-only lines change state but emit no move", () => {
    const r = backplotEngine.parse("F250\nS1200\nG1 X4");
    expect(r.moves).toHaveLength(1);
    expect(r.moves[0].feedRate).toBe(250);
  });

  it("T word updates the tool stamped on subsequent moves", () => {
    const r = backplotEngine.parse("G1 F100 X1\nT7\nX2");
    expect(r.moves[0].tool).toBe(1);
    expect(r.moves[1].tool).toBe(7);
  });

  it("negative decimal coordinates parse correctly", () => {
    const r = backplotEngine.parse("G1 F100 X-5.5 Y-2.25");
    expect(r.moves[0].to).toEqual({ x: -5.5, y: -2.25, z: 0 });
  });
});

describe("BackplotEngine — statistics & bounding box", () => {
  it("bounding box spans every from/to coordinate", () => {
    const r = backplotEngine.parse(
      "G0 X10 Y0\nG1 F100 X10 Y10\nG1 X-5 Y10\nG1 Z-3",
    );
    expect(r.statistics.boundingBox.min).toEqual({ x: -5, y: 0, z: -3 });
    expect(r.statistics.boundingBox.max).toEqual({ x: 10, y: 10, z: 0 });
  });

  it("totalDistance = rapidDistance + feedDistance", () => {
    const r = backplotEngine.parse("G0 X10\nG1 F100 X20");
    expect(r.statistics.rapidDistance).toBe(10);
    expect(r.statistics.feedDistance).toBe(10);
    expect(r.statistics.totalDistance).toBe(20);
  });

  it("empty / comment-only input → all zeros, zeroed bbox (no Infinity leak)", () => {
    for (const src of ["", "   \n  ", "(only)\n; comment\nN10"]) {
      const s = backplotEngine.parse(src).statistics;
      expect(s.totalMoves).toBe(0);
      expect(s.totalDistance).toBe(0);
      expect(s.machiningTime).toBe(0);
      expect(s.boundingBox.min).toEqual({ x: 0, y: 0, z: 0 });
      expect(s.boundingBox.max).toEqual({ x: 0, y: 0, z: 0 });
      expect(Number.isFinite(s.boundingBox.min.x)).toBe(true);
    }
  });

  it("statistics() returns the same stats object as parse().statistics", () => {
    const g = "G0 X5\nG1 F200 X10 Y10\nG3 X0 Y20 I-10 J0";
    expect(backplotEngine.statistics(g)).toEqual(
      backplotEngine.parse(g).statistics,
    );
  });

  it("round-to-3dp is applied to every numeric stat", () => {
    // 1/3 mm at F1 → time 0.333.. ; distances rounded to 3dp
    const r = backplotEngine.parse("G1 F1 X0.3333333");
    expect(r.statistics.feedDistance).toBe(0.333);
    expect(r.statistics.machiningTime).toBe(0.333);
  });
});

describe("BackplotEngine — documented limitations (honest behavior pinning)", () => {
  it("G20 (inch) is tracked but coordinates are NOT rescaled — distance is unit-agnostic", () => {
    // Pins current behavior: the engine records the metric flag but does
    // not convert. A future unit-aware change must update this assertion.
    const metric = backplotEngine.parse("G21 G1 F100 X1").statistics.feedDistance;
    const inch = backplotEngine.parse("G20 G1 F100 X1").statistics.feedDistance;
    expect(inch).toBe(metric);
    expect(inch).toBe(1);
  });

  it("a motion-word line with no axis words still emits a zero-length move (modal artifact)", () => {
    const r = backplotEngine.parse("G1\nG1 X5 F50");
    expect(r.moves).toHaveLength(2);
    expect(r.moves[0].to).toEqual({ x: 0, y: 0, z: 0 });
    expect(r.moves[0].from).toEqual({ x: 0, y: 0, z: 0 });
    expect(r.moves[1].to.x).toBe(5);
    expect(r.statistics.totalMoves).toBe(2);
  });
});

describe("BackplotEngine — dispatcher contract (prism_calc backplot_*)", () => {
  it("exposes the exact parse/statistics surface calcDispatcher imports", () => {
    // calcDispatcher does: backplotEngine.parse(params.gcode ?? "")
    //                      backplotEngine.statistics(params.gcode ?? "")
    expect(typeof backplotEngine.parse).toBe("function");
    expect(typeof backplotEngine.statistics).toBe("function");

    const parsed = backplotEngine.parse("G1 F100 X10");
    expect(parsed).toHaveProperty("moves");
    expect(parsed).toHaveProperty("statistics");
    expect(Array.isArray(parsed.moves)).toBe(true);
    expect(parsed.statistics.totalMoves).toBe(1);
    expect(parsed.statistics.feedDistance).toBe(10);
    expect(parsed.statistics.boundingBox.max).toEqual({ x: 10, y: 0, z: 0 });

    // The "" fallback the dispatcher passes must not throw.
    expect(() => backplotEngine.parse("")).not.toThrow();
    expect(backplotEngine.statistics("").totalMoves).toBe(0);
  });
});
