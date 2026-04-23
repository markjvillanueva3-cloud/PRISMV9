/**
 * MultiaxisToolpathEngine Tests
 * =============================
 *
 * Tests for 5-axis toolpath tool-axis control primitives:
 *   - Vec3 primitives (normalize, cross, dot)
 *   - Rodrigues rotation formula
 *   - Lead/lag/tilt angle application (tool-axis-from-normal)
 *   - SLERP axis interpolation
 *   - Gaussian-weighted tool-axis smoothing
 *   - Gouge detection (tool vs surface)
 *
 * Algebraic invariants tested:
 *   - normalize(v) · normalize(v) = 1
 *   - cross(a, b) = -cross(b, a) (anticommutative)
 *   - dot(a, a) = |a|²
 *   - rotate(v, axis, 0) = v (identity at zero angle)
 *   - rotate(v, axis, 2π) ≈ v (identity at full turn)
 *   - slerp(a, b, 0) = a, slerp(a, b, 1) = b
 *   - |slerp(a, b, t)| = 1 for all t (stays on unit sphere)
 *
 * Reachable via dispatcher as:
 *   mill_multi_axis_aggregate { op: "invoke", member: "toolpath", method: ..., args: [...] }
 *
 * @module __tests__/MultiaxisToolpathEngine.test
 * @milestone MILL-MASTER-P4/U10-MAX-TP
 */

import { describe, it, expect } from "vitest";
import { multiaxisToolpathEngine } from "../engines/MultiaxisToolpathEngine.js";
import { multiAxisAggregatorEngine } from "../engines/MultiAxisAggregatorEngine.js";

const e = multiaxisToolpathEngine;

// ============================================================================
// VEC3 PRIMITIVES
// ============================================================================

describe("MultiaxisToolpathEngine — normalize", () => {
  it("unit-length vector remains unit length", () => {
    const n = e.normalize({ x: 1, y: 0, z: 0 });
    expect(n.x).toBeCloseTo(1, 10);
    expect(n.y).toBeCloseTo(0, 10);
    expect(n.z).toBeCloseTo(0, 10);
  });

  it("normalized vector has magnitude 1", () => {
    const n = e.normalize({ x: 3, y: 4, z: 12 });
    const mag = Math.sqrt(n.x * n.x + n.y * n.y + n.z * n.z);
    expect(mag).toBeCloseTo(1, 10);
  });

  it("preserves direction for positive vector", () => {
    const v = { x: 3, y: 4, z: 0 };
    const n = e.normalize(v);
    // Ratios preserved
    expect(n.x / n.y).toBeCloseTo(v.x / v.y, 10);
  });

  it("zero vector returns default up-direction", () => {
    const n = e.normalize({ x: 0, y: 0, z: 0 });
    expect(n.z).toBe(1);
    expect(n.x).toBe(0);
    expect(n.y).toBe(0);
  });

  it("negative vector stays negative after normalize", () => {
    const n = e.normalize({ x: -5, y: 0, z: 0 });
    expect(n.x).toBeLessThan(0);
  });

  it("extremely tiny vector returns default up-direction", () => {
    const n = e.normalize({ x: 1e-20, y: 1e-20, z: 1e-20 });
    expect(n.z).toBe(1);
  });
});

describe("MultiaxisToolpathEngine — cross", () => {
  it("X × Y = Z (right-hand rule)", () => {
    const r = e.cross({ x: 1, y: 0, z: 0 }, { x: 0, y: 1, z: 0 });
    expect(r.x).toBeCloseTo(0, 10);
    expect(r.y).toBeCloseTo(0, 10);
    expect(r.z).toBeCloseTo(1, 10);
  });

  it("anticommutative: cross(a, b) = -cross(b, a)", () => {
    const a = { x: 2, y: 3, z: 4 };
    const b = { x: -1, y: 5, z: 2 };
    const ab = e.cross(a, b);
    const ba = e.cross(b, a);
    expect(ab.x).toBeCloseTo(-ba.x, 10);
    expect(ab.y).toBeCloseTo(-ba.y, 10);
    expect(ab.z).toBeCloseTo(-ba.z, 10);
  });

  it("parallel vectors produce zero cross", () => {
    const r = e.cross({ x: 2, y: 4, z: 6 }, { x: 1, y: 2, z: 3 });
    expect(r.x).toBeCloseTo(0, 10);
    expect(r.y).toBeCloseTo(0, 10);
    expect(r.z).toBeCloseTo(0, 10);
  });

  it("self-cross is zero", () => {
    const a = { x: 1, y: 2, z: 3 };
    const r = e.cross(a, a);
    expect(r.x).toBeCloseTo(0, 10);
    expect(r.y).toBeCloseTo(0, 10);
    expect(r.z).toBeCloseTo(0, 10);
  });
});

describe("MultiaxisToolpathEngine — dot", () => {
  it("commutative: dot(a, b) = dot(b, a)", () => {
    const a = { x: 1, y: 2, z: 3 };
    const b = { x: 4, y: 5, z: 6 };
    expect(e.dot(a, b)).toBe(e.dot(b, a));
  });

  it("orthogonal vectors have zero dot product", () => {
    expect(e.dot({ x: 1, y: 0, z: 0 }, { x: 0, y: 1, z: 0 })).toBe(0);
  });

  it("dot(v, v) equals |v|²", () => {
    const v = { x: 3, y: 4, z: 0 };
    expect(e.dot(v, v)).toBe(25);
  });

  it("negative for opposite-direction vectors", () => {
    expect(e.dot({ x: 1, y: 0, z: 0 }, { x: -1, y: 0, z: 0 })).toBe(-1);
  });
});

// ============================================================================
// RODRIGUES ROTATION
// ============================================================================

describe("MultiaxisToolpathEngine — rotateAroundAxis", () => {
  it("zero angle returns original vector", () => {
    const v = { x: 1, y: 2, z: 3 };
    const r = e.rotateAroundAxis(v, { x: 0, y: 0, z: 1 }, 0);
    expect(r.x).toBeCloseTo(1, 10);
    expect(r.y).toBeCloseTo(2, 10);
    expect(r.z).toBeCloseTo(3, 10);
  });

  it("full turn (2π) returns vector very close to original", () => {
    const v = { x: 1, y: 0, z: 0 };
    const r = e.rotateAroundAxis(v, { x: 0, y: 0, z: 1 }, 2 * Math.PI);
    expect(r.x).toBeCloseTo(1, 8);
    expect(r.y).toBeCloseTo(0, 8);
  });

  it("90° rotation of X around Z produces Y", () => {
    const r = e.rotateAroundAxis({ x: 1, y: 0, z: 0 }, { x: 0, y: 0, z: 1 }, Math.PI / 2);
    expect(r.x).toBeCloseTo(0, 8);
    expect(r.y).toBeCloseTo(1, 8);
    expect(r.z).toBeCloseTo(0, 8);
  });

  it("180° rotation of X around Z produces -X", () => {
    const r = e.rotateAroundAxis({ x: 1, y: 0, z: 0 }, { x: 0, y: 0, z: 1 }, Math.PI);
    expect(r.x).toBeCloseTo(-1, 8);
    expect(r.y).toBeCloseTo(0, 8);
  });

  it("rotation preserves magnitude", () => {
    const v = { x: 3, y: 4, z: 12 };
    const magBefore = Math.sqrt(9 + 16 + 144);
    const r = e.rotateAroundAxis(v, { x: 0, y: 1, z: 0 }, 1.234);
    const magAfter = Math.sqrt(r.x * r.x + r.y * r.y + r.z * r.z);
    expect(magAfter).toBeCloseTo(magBefore, 8);
  });

  it("rotation around axis parallel to vector is identity", () => {
    const v = { x: 0, y: 0, z: 5 };
    const r = e.rotateAroundAxis(v, { x: 0, y: 0, z: 1 }, Math.PI / 3);
    expect(r.x).toBeCloseTo(0, 8);
    expect(r.y).toBeCloseTo(0, 8);
    expect(r.z).toBeCloseTo(5, 8);
  });
});

// ============================================================================
// TOOL-AXIS FROM NORMAL
// ============================================================================

describe("MultiaxisToolpathEngine — toolAxisFromNormal", () => {
  it("with no angles, tool axis equals surface normal", () => {
    const normal = { x: 0, y: 0, z: 1 };
    const feed = { x: 1, y: 0, z: 0 };
    const axis = e.toolAxisFromNormal(normal, feed);
    expect(axis.x).toBeCloseTo(0, 8);
    expect(axis.y).toBeCloseTo(0, 8);
    expect(axis.z).toBeCloseTo(1, 8);
  });

  it("output is a unit vector", () => {
    const axis = e.toolAxisFromNormal(
      { x: 0, y: 0, z: 1 },
      { x: 1, y: 0, z: 0 },
      { leadAngle: 0.2, tiltAngle: 0.1 },
    );
    const mag = Math.sqrt(axis.x * axis.x + axis.y * axis.y + axis.z * axis.z);
    expect(mag).toBeCloseTo(1, 8);
  });

  it("lead angle rotates tool in feed direction", () => {
    // Normal Z, feed X, lead 90° → axis rotates toward -X (against feed)
    const axis = e.toolAxisFromNormal(
      { x: 0, y: 0, z: 1 },
      { x: 1, y: 0, z: 0 },
      { leadAngle: Math.PI / 2 },
    );
    // axis should be roughly along ±X
    expect(Math.abs(axis.x)).toBeGreaterThan(0.9);
  });

  it("lead and lag of equal magnitude cancel", () => {
    const base = e.toolAxisFromNormal(
      { x: 0, y: 0, z: 1 }, { x: 1, y: 0, z: 0 }, {},
    );
    const both = e.toolAxisFromNormal(
      { x: 0, y: 0, z: 1 }, { x: 1, y: 0, z: 0 },
      { leadAngle: 0.3, lagAngle: 0.3 },
    );
    expect(both.x).toBeCloseTo(base.x, 8);
    expect(both.y).toBeCloseTo(base.y, 8);
    expect(both.z).toBeCloseTo(base.z, 8);
  });

  it("non-unit input normal still produces unit output", () => {
    const axis = e.toolAxisFromNormal(
      { x: 0, y: 0, z: 5 },
      { x: 2, y: 0, z: 0 },
      { leadAngle: 0.1 },
    );
    const mag = Math.sqrt(axis.x ** 2 + axis.y ** 2 + axis.z ** 2);
    expect(mag).toBeCloseTo(1, 8);
  });
});

// ============================================================================
// SLERP
// ============================================================================

describe("MultiaxisToolpathEngine — slerp", () => {
  const a = { x: 1, y: 0, z: 0 };
  const b = { x: 0, y: 1, z: 0 };

  it("t=0 returns start vector", () => {
    const r = e.slerp(a, b, 0);
    expect(r.x).toBeCloseTo(1, 8);
    expect(r.y).toBeCloseTo(0, 8);
  });

  it("t=1 returns end vector", () => {
    const r = e.slerp(a, b, 1);
    expect(r.x).toBeCloseTo(0, 8);
    expect(r.y).toBeCloseTo(1, 8);
  });

  it("t=0.5 at 90° produces 45° vector", () => {
    const r = e.slerp(a, b, 0.5);
    const expected = Math.sqrt(2) / 2;
    expect(r.x).toBeCloseTo(expected, 6);
    expect(r.y).toBeCloseTo(expected, 6);
  });

  it("output is unit vector for all t in [0, 1]", () => {
    for (const t of [0.1, 0.25, 0.5, 0.75, 0.9]) {
      const r = e.slerp(a, b, t);
      const mag = Math.sqrt(r.x ** 2 + r.y ** 2 + r.z ** 2);
      expect(mag).toBeCloseTo(1, 6);
    }
  });

  it("nearly-parallel vectors fall back to linear blend without NaN", () => {
    const v1 = { x: 1, y: 0, z: 0 };
    const v2 = { x: 1, y: 1e-8, z: 0 }; // almost same as v1
    const r = e.slerp(v1, v2, 0.5);
    expect(Number.isFinite(r.x)).toBe(true);
    expect(Number.isFinite(r.y)).toBe(true);
    expect(Number.isFinite(r.z)).toBe(true);
  });

  it("antipodal vectors handled (flipped end to shortest arc)", () => {
    const v1 = { x: 1, y: 0, z: 0 };
    const v2 = { x: -0.9, y: 0.1, z: 0 };
    const r = e.slerp(v1, v2, 0.5);
    // With antipodal flip, midpoint should still be on unit sphere
    const mag = Math.sqrt(r.x ** 2 + r.y ** 2 + r.z ** 2);
    expect(mag).toBeCloseTo(1, 6);
  });
});

// ============================================================================
// TOOL-AXIS SMOOTHING
// ============================================================================

describe("MultiaxisToolpathEngine — smoothToolAxis", () => {
  it("returns input unchanged for < 3 points", () => {
    const tp = [
      { position: { x: 0, y: 0, z: 0 }, normal: { x: 0, y: 0, z: 1 }, axis: { x: 0, y: 0, z: 1 } },
      { position: { x: 1, y: 0, z: 0 }, normal: { x: 0, y: 0, z: 1 }, axis: { x: 0, y: 0, z: 1 } },
    ];
    const r = e.smoothToolAxis(tp);
    expect(r).toEqual(tp);
  });

  it("preserves toolpath length", () => {
    const tp = Array.from({ length: 10 }, (_, i) => ({
      position: { x: i, y: 0, z: 0 },
      normal: { x: 0, y: 0, z: 1 },
      axis: { x: 0, y: 0, z: 1 },
    }));
    expect(e.smoothToolAxis(tp).length).toBe(10);
  });

  it("smoothed axes remain unit vectors", () => {
    const tp = Array.from({ length: 10 }, (_, i) => ({
      position: { x: i, y: 0, z: 0 },
      normal: { x: 0, y: 0, z: 1 },
      axis: e.normalize({ x: Math.sin(i * 0.3), y: Math.cos(i * 0.3), z: 1 }),
    }));
    const smoothed = e.smoothToolAxis(tp, 5);
    for (const pt of smoothed) {
      if (!pt.axis) continue;
      const mag = Math.sqrt(pt.axis.x ** 2 + pt.axis.y ** 2 + pt.axis.z ** 2);
      expect(mag).toBeCloseTo(1, 6);
    }
  });

  it("smoothing a noisy axis stream reduces variance", () => {
    const tp = Array.from({ length: 20 }, (_, i) => {
      // noisy tilt around z axis
      const noise = (i % 2 === 0 ? 0.1 : -0.1);
      return {
        position: { x: i, y: 0, z: 0 },
        normal: { x: 0, y: 0, z: 1 },
        axis: e.normalize({ x: noise, y: 0, z: 1 }),
      };
    });
    const smoothed = e.smoothToolAxis(tp, 7);
    // Compute x-variance before and after
    const xsBefore = tp.map(p => p.axis!.x);
    const xsAfter = smoothed.map(p => p.axis!.x);
    const varOf = (arr: number[]) => {
      const m = arr.reduce((s, v) => s + v, 0) / arr.length;
      return arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length;
    };
    expect(varOf(xsAfter)).toBeLessThan(varOf(xsBefore));
  });

  it("skips points that have no axis", () => {
    const tp = Array.from({ length: 5 }, (_, i) => ({
      position: { x: i, y: 0, z: 0 },
      normal: { x: 0, y: 0, z: 1 },
      // no axis
    }));
    const r = e.smoothToolAxis(tp);
    expect(r.length).toBe(5);
  });
});

// ============================================================================
// GOUGE DETECTION
// ============================================================================

describe("MultiaxisToolpathEngine — detectGouge", () => {
  it("flat axis-normal alignment → no gouge", () => {
    const tp = [
      { position: { x: 0, y: 0, z: 0 }, normal: { x: 0, y: 0, z: 1 }, axis: { x: 0, y: 0, z: 1 } },
      { position: { x: 1, y: 0, z: 0 }, normal: { x: 0, y: 0, z: 1 }, axis: { x: 0, y: 0, z: 1 } },
    ];
    const r = e.detectGouge(tp, 5);
    expect(r.gougeDetected).toBe(false);
    expect(r.gougePoints.length).toBe(0);
    expect(r.minClearance).toBeCloseTo(5, 6); // full radius clearance
  });

  it("axis perpendicular to normal → gouge detected", () => {
    const tp = [
      { position: { x: 0, y: 0, z: 0 }, normal: { x: 0, y: 0, z: 1 }, axis: { x: 1, y: 0, z: 0 } },
    ];
    const r = e.detectGouge(tp, 5, Math.PI / 4);
    expect(r.gougeDetected).toBe(true);
    expect(r.gougePoints).toContain(0);
  });

  it("tight maxAngle flags more points than loose maxAngle", () => {
    const tp = Array.from({ length: 10 }, (_, i) => ({
      position: { x: i, y: 0, z: 0 },
      normal: { x: 0, y: 0, z: 1 },
      axis: e.normalize({ x: Math.sin(i * 0.2), y: 0, z: 1 }),
    }));
    const tight = e.detectGouge(tp, 5, Math.PI / 12); // 15°
    const loose = e.detectGouge(tp, 5, Math.PI / 3);  // 60°
    expect(tight.gougePoints.length).toBeGreaterThanOrEqual(loose.gougePoints.length);
  });

  it("skips points without axis or normal", () => {
    const tp = [
      { position: { x: 0, y: 0, z: 0 }, normal: { x: 0, y: 0, z: 1 } }, // no axis
      { position: { x: 1, y: 0, z: 0 }, axis: { x: 0, y: 0, z: 1 } },    // no normal
    ];
    const r = e.detectGouge(tp, 5);
    expect(r.gougePoints.length).toBe(0);
  });

  it("minClearance scales with tool radius", () => {
    const tp = [
      { position: { x: 0, y: 0, z: 0 }, normal: { x: 0, y: 0, z: 1 }, axis: { x: 0, y: 0, z: 1 } },
    ];
    const r1 = e.detectGouge(tp, 1);
    const r2 = e.detectGouge(tp, 10);
    expect(r2.minClearance / r1.minClearance).toBeCloseTo(10, 6);
  });

  it("empty toolpath returns minClearance Infinity and no gouge", () => {
    const r = e.detectGouge([], 5);
    expect(r.gougeDetected).toBe(false);
    expect(r.minClearance).toBe(Infinity);
  });
});

// ============================================================================
// DISPATCHER ROUND-TRIP (via MultiAxisAggregatorEngine)
// ============================================================================

describe("Dispatcher round-trip via MultiAxis aggregator", () => {
  it("aggregator.invoke('toolpath', 'normalize', v) returns unit vector", async () => {
    const r = await multiAxisAggregatorEngine.invoke("toolpath", "normalize", { x: 3, y: 4, z: 0 });
    expect(r.ok).toBe(true);
    expect(r.member).toBe("toolpath");
    const n = r.result as { x: number; y: number; z: number };
    expect(n.x).toBeCloseTo(0.6, 8);
    expect(n.y).toBeCloseTo(0.8, 8);
    expect(n.z).toBeCloseTo(0, 8);
  });

  it("aggregator.invoke('toolpath', 'dot', a, b) returns scalar", async () => {
    const r = await multiAxisAggregatorEngine.invoke(
      "toolpath", "dot",
      { x: 1, y: 2, z: 3 },
      { x: 4, y: 5, z: 6 },
    );
    expect(r.ok).toBe(true);
    expect(r.result).toBe(1 * 4 + 2 * 5 + 3 * 6);
  });

  it("aggregator.invoke('toolpath', 'slerp', ...) produces unit result", async () => {
    const r = await multiAxisAggregatorEngine.invoke(
      "toolpath", "slerp",
      { x: 1, y: 0, z: 0 },
      { x: 0, y: 1, z: 0 },
      0.5,
    );
    expect(r.ok).toBe(true);
    const out = r.result as { x: number; y: number; z: number };
    const mag = Math.sqrt(out.x ** 2 + out.y ** 2 + out.z ** 2);
    expect(mag).toBeCloseTo(1, 6);
  });

  it("aggregator.invoke('toolpath', 'nonexistent') returns ok:false", async () => {
    const r = await multiAxisAggregatorEngine.invoke("toolpath", "definitelyNotAMethod");
    expect(r.ok).toBe(false);
  });
});
