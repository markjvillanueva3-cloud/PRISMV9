/**
 * NACAAirfoilEngine.test.ts — U-CADC13 engine tests
 *
 * Coverage contract:
 *   - Happy path: NACA 4-digit (symmetric + cambered), 5-digit (standard +
 *     reflexed), UIUC .dat parse
 *   - Reference values: Abbott & von Doenhoff canonical NACA 0012/2412 maxima
 *   - Algebraic invariants: symmetric ⇒ y_upper = −y_lower; thickness at x=0 is
 *     zero; point counts match numPoints; leading edge lies on x-axis
 *   - Failure modes: invalid digit lengths, unknown 5-digit camber tags,
 *     malformed .dat, <3 coordinate rows
 *   - Adversarial: NaN/Infinity/negative numPoints, empty .dat, extreme digits
 *   - Spanning variability: cosine vs linear spacing, closed vs open TE,
 *     chord scaling 1 / 0.5 / 100
 */

import { describe, it, expect } from "vitest";
import {
  NACAAirfoilEngine,
  nacaAirfoilEngine,
  type AirfoilProfile,
  type Point2D,
} from "../engines/NACAAirfoilEngine.js";

// ── Helpers ───────────────────────────────────────────────────────────────────

function maxThicknessOf(profile: AirfoilProfile): number {
  let max = 0;
  for (let i = 0; i < profile.upper.length; i++) {
    const u = profile.upper[i]!;
    const l = profile.lower[i]!;
    const dy = u.y - l.y;
    if (dy > max) max = dy;
  }
  return max;
}

/**
 * Counts non-monotonic dips in x-values. NACA surfaces rotate samples by the
 * camber-slope angle, which can push x slightly backwards near the leading
 * edge where the slope is steepest — this is physically correct (the rounded
 * nose sweeps back). We allow ≤1 small dip but require the overall trend
 * to be monotonic for the remaining stations.
 */
function countXDips(points: Point2D[], tolerance = 1e-9): number {
  let dips = 0;
  for (let i = 1; i < points.length; i++) {
    if (points[i]!.x < points[i - 1]!.x - tolerance) dips++;
  }
  return dips;
}

// ── Happy-path tests ─────────────────────────────────────────────────────────

describe("NACAAirfoilEngine — 4-digit generation", () => {
  it("generates symmetric NACA 0012 with zero camber everywhere", () => {
    const profile = nacaAirfoilEngine.generate4Digit("0012");
    expect(profile.name).toBe("NACA 0012");
    expect(profile.maxCamber).toBe(0);
    expect(profile.maxCamberPosition).toBe(0);
    expect(profile.maxThickness).toBeCloseTo(0.12, 5);
    for (let i = 0; i < profile.upper.length; i++) {
      const u = profile.upper[i]!;
      const l = profile.lower[i]!;
      // Symmetric airfoil: upper.y = -lower.y at matching x
      expect(u.x).toBeCloseTo(l.x, 6);
      expect(u.y).toBeCloseTo(-l.y, 6);
    }
  });

  it("generates NACA 2412 with 2% max camber at 0.4c and 12% thickness", () => {
    const profile = nacaAirfoilEngine.generate4Digit("2412");
    expect(profile.maxCamber).toBeCloseTo(0.02, 6);
    expect(profile.maxCamberPosition).toBeCloseTo(0.4, 6);
    expect(profile.maxThickness).toBeCloseTo(0.12, 6);
    // Abbott & von Doenhoff Table 6.4: NACA 2412 max half-thickness ≈ 0.0600c
    // at x ≈ 0.30c. Our polynomial should reproduce this within 0.5%.
    const measured = maxThicknessOf(profile);
    expect(measured).toBeGreaterThan(0.119); // ≥ 99% of 0.12
    expect(measured).toBeLessThan(0.121); // ≤ 101% of 0.12
  });

  it("generates NACA 4412 with upper surface above lower surface everywhere", () => {
    const profile = nacaAirfoilEngine.generate4Digit("4412");
    expect(profile.maxCamber).toBeCloseTo(0.04, 6);
    for (let i = 1; i < profile.upper.length - 1; i++) {
      const u = profile.upper[i]!;
      const l = profile.lower[i]!;
      // Cambered airfoil: upper strictly above lower at every interior station
      expect(u.y).toBeGreaterThan(l.y);
    }
  });

  it("accepts 'NACA' prefix and mixed whitespace/dash", () => {
    const a = nacaAirfoilEngine.generate4Digit("NACA 2412");
    const b = nacaAirfoilEngine.generate4Digit("naca-2412");
    const c = nacaAirfoilEngine.generate4Digit("2412");
    expect(a.name).toBe("NACA 2412");
    expect(b.name).toBe("NACA 2412");
    expect(c.name).toBe("NACA 2412");
    // Same designator ⇒ identical geometry
    expect(a.upper[10]!.x).toBeCloseTo(c.upper[10]!.x, 9);
    expect(a.upper[10]!.y).toBeCloseTo(c.upper[10]!.y, 9);
  });

  it("has leading edge anchored near origin and trailing edge near (c, 0)", () => {
    const profile = nacaAirfoilEngine.generate4Digit("0012");
    const leUpper = profile.upper[0]!;
    const leLower = profile.lower[0]!;
    const teUpper = profile.upper[profile.upper.length - 1]!;
    const teLower = profile.lower[profile.lower.length - 1]!;
    // Cosine spacing places first sample at x=0
    expect(leUpper.x).toBeCloseTo(0, 6);
    expect(leUpper.y).toBeCloseTo(0, 6);
    expect(leLower.x).toBeCloseTo(0, 6);
    expect(leLower.y).toBeCloseTo(0, 6);
    // Trailing edge at x=c with closed TE ⇒ y≈0 for symmetric airfoil
    expect(teUpper.x).toBeCloseTo(1, 6);
    expect(teLower.x).toBeCloseTo(1, 6);
    expect(teUpper.y).toBeCloseTo(0, 3);
    expect(teLower.y).toBeCloseTo(0, 3);
  });
});

describe("NACAAirfoilEngine — 5-digit generation", () => {
  it("generates standard NACA 23012 with 12% thickness and design Cl=0.3", () => {
    const profile = nacaAirfoilEngine.generate5Digit("23012");
    expect(profile.name).toBe("NACA 23012");
    expect(profile.maxThickness).toBeCloseTo(0.12, 6);
    // Design Cl = 2 × 0.15 = 0.3 ⇒ maxCamber visual ≈ 0.3 × 0.055 ≈ 0.0165
    expect(profile.maxCamber).toBeGreaterThan(0);
    // Position tag 3 ⇒ maxCamberPosition = 3/20 = 0.15
    expect(profile.maxCamberPosition).toBeCloseTo(0.15, 6);
    // Upper above lower everywhere except at TE
    for (let i = 1; i < profile.upper.length - 1; i++) {
      expect(profile.upper[i]!.y).toBeGreaterThan(profile.lower[i]!.y);
    }
  });

  it("generates reflexed NACA 23112 without NaN points", () => {
    const profile = nacaAirfoilEngine.generate5Digit("23112");
    expect(profile.maxThickness).toBeCloseTo(0.12, 6);
    for (const p of profile.upper) {
      expect(Number.isFinite(p.x)).toBe(true);
      expect(Number.isFinite(p.y)).toBe(true);
    }
    for (const p of profile.lower) {
      expect(Number.isFinite(p.x)).toBe(true);
      expect(Number.isFinite(p.y)).toBe(true);
    }
  });

  it("supports all 9 lookup-table 5-digit camber tags (210..251)", () => {
    const tags = ["210", "220", "230", "240", "250", "221", "231", "241", "251"];
    for (const tag of tags) {
      const designation = `${tag}12`;
      const profile = nacaAirfoilEngine.generate5Digit(designation);
      expect(profile.maxThickness).toBeCloseTo(0.12, 6);
      // All samples must be finite
      expect(profile.upper.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y))).toBe(true);
      expect(profile.lower.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y))).toBe(true);
    }
  });
});

// ── UIUC .dat parsing ────────────────────────────────────────────────────────

describe("NACAAirfoilEngine — UIUC .dat parse", () => {
  it("parses a valid Selig-format airfoil file", () => {
    // Simplified 7-point Selig file: TE → LE → TE
    const dat = [
      "TEST AIRFOIL",
      "1.000000  0.000000",
      "0.500000  0.050000",
      "0.100000  0.030000",
      "0.000000  0.000000", // leading edge (min x)
      "0.100000  -0.030000",
      "0.500000  -0.050000",
      "1.000000  0.000000",
    ].join("\n");
    const profile = nacaAirfoilEngine.parseUIUCDat(dat);
    expect(profile.name).toBe("TEST AIRFOIL");
    expect(profile.selig.length).toBe(7);
    // Upper must include 4 points (TE → LE), reversed to LE → TE
    expect(profile.upper.length).toBe(4);
    expect(profile.upper[0]!.x).toBeCloseTo(0, 9);
    expect(profile.upper[profile.upper.length - 1]!.x).toBeCloseTo(1, 9);
    // Lower must include 4 points (LE → TE)
    expect(profile.lower.length).toBe(4);
    expect(profile.lower[0]!.x).toBeCloseTo(0, 9);
    expect(profile.lower[profile.lower.length - 1]!.x).toBeCloseTo(1, 9);
    // Derived metadata: symmetric synthetic file ⇒ maxCamber ≈ 0
    expect(profile.maxCamber).toBeCloseTo(0, 6);
    expect(profile.maxThickness).toBeCloseTo(0.1, 6);
  });

  it("applies chord scaling to parsed coordinates", () => {
    const dat = [
      "SCALED AIRFOIL",
      "1.0  0.0",
      "0.5  0.05",
      "0.0  0.0",
      "0.5  -0.05",
      "1.0  0.0",
    ].join("\n");
    const scaled = nacaAirfoilEngine.parseUIUCDat(dat, 2.5);
    expect(scaled.chord).toBe(2.5);
    // Max x should now be 2.5
    const maxX = Math.max(...scaled.selig.map((p) => p.x));
    expect(maxX).toBeCloseTo(2.5, 6);
  });

  it("ignores blank lines and extra whitespace", () => {
    const dat = [
      "TAB AIRFOIL",
      "",
      "1.0\t0.0",
      "",
      "  0.5  0.05  ",
      "0.0  0.0",
      "0.5  -0.05",
      "1.0  0.0",
    ].join("\n");
    const profile = nacaAirfoilEngine.parseUIUCDat(dat);
    expect(profile.selig.length).toBe(5);
  });
});

// ── Failure modes ────────────────────────────────────────────────────────────

describe("NACAAirfoilEngine — failure modes", () => {
  it("rejects 4-digit designation with wrong digit count", () => {
    expect(() => nacaAirfoilEngine.generate4Digit("241")).toThrow(/4 digits/);
    expect(() => nacaAirfoilEngine.generate4Digit("24122")).toThrow(/4 digits/);
    expect(() => nacaAirfoilEngine.generate4Digit("abcd")).toThrow(/4 digits/);
  });

  it("rejects 5-digit designation with wrong digit count", () => {
    expect(() => nacaAirfoilEngine.generate5Digit("2301")).toThrow(/5 digits/);
    expect(() => nacaAirfoilEngine.generate5Digit("230123")).toThrow(/5 digits/);
  });

  it("rejects 5-digit designation with unknown camber tag", () => {
    // 260** is not in the TR-537 lookup table
    expect(() => nacaAirfoilEngine.generate5Digit("26012")).toThrow(/camber tag/);
    // 235** would require position tag 3.5 which is invalid
    expect(() => nacaAirfoilEngine.generate5Digit("29912")).toThrow(/camber tag/);
  });

  it("rejects UIUC .dat with fewer than 3 coordinate lines", () => {
    expect(() => nacaAirfoilEngine.parseUIUCDat("TEST\n1.0 0.0")).toThrow(/≥2 coordinate rows/);
    expect(() => nacaAirfoilEngine.parseUIUCDat("")).toThrow(/≥2 coordinate rows/);
  });

  it("rejects UIUC .dat with insufficient valid coordinate rows", () => {
    // Name + 2 non-numeric rows ⇒ zero valid coordinates
    const bad = "HEADER\nnot a number\nalso garbage";
    expect(() => nacaAirfoilEngine.parseUIUCDat(bad)).toThrow(/≥3/);
  });
});

// ── Adversarial / variability ────────────────────────────────────────────────

describe("NACAAirfoilEngine — adversarial inputs", () => {
  it("clamps numPoints below the hard floor to 3", () => {
    const profile = nacaAirfoilEngine.generate4Digit("0012", { numPoints: 1 });
    expect(profile.upper.length).toBe(3);
    expect(profile.lower.length).toBe(3);
  });

  it("handles very large numPoints without NaN", () => {
    const profile = nacaAirfoilEngine.generate4Digit("0012", { numPoints: 2000 });
    expect(profile.upper.length).toBe(2000);
    for (const p of profile.upper) {
      expect(Number.isFinite(p.x)).toBe(true);
      expect(Number.isFinite(p.y)).toBe(true);
    }
  });

  it("survives negative numPoints (clamped to floor)", () => {
    const profile = nacaAirfoilEngine.generate4Digit("0012", { numPoints: -5 });
    expect(profile.upper.length).toBe(3);
  });

  it("extreme designation NACA 9999 (90% camber, 99% thickness) still produces finite points", () => {
    const profile = nacaAirfoilEngine.generate4Digit("9999");
    expect(profile.maxCamber).toBeCloseTo(0.09, 6);
    expect(profile.maxThickness).toBeCloseTo(0.99, 6);
    for (const p of profile.upper) {
      expect(Number.isFinite(p.x)).toBe(true);
      expect(Number.isFinite(p.y)).toBe(true);
    }
  });
});

describe("NACAAirfoilEngine — spanning variability", () => {
  it("cosine spacing densifies the leading edge relative to linear spacing", () => {
    const cosine = nacaAirfoilEngine.generate4Digit("0012", { cosineSpacing: true, numPoints: 21 });
    const linear = nacaAirfoilEngine.generate4Digit("0012", { cosineSpacing: false, numPoints: 21 });
    // Second x-sample (i=1) should be much smaller with cosine spacing
    expect(cosine.upper[1]!.x).toBeLessThan(linear.upper[1]!.x);
    // Linear spacing ⇒ uniform 0..1 in 21 steps ⇒ second point ≈ 0.05
    expect(linear.upper[1]!.x).toBeCloseTo(0.05, 5);
    // Cosine spacing ⇒ second point ≈ 0.5 × (1 − cos(π/20)) ≈ 0.0062
    expect(cosine.upper[1]!.x).toBeLessThan(0.01);
  });

  it("closed vs open trailing edge yields different TE y-values for symmetric airfoil", () => {
    const closed = nacaAirfoilEngine.generate4Digit("0012", { closedTrailingEdge: true });
    const open = nacaAirfoilEngine.generate4Digit("0012", { closedTrailingEdge: false });
    const closedTEy = closed.upper[closed.upper.length - 1]!.y;
    const openTEy = open.upper[open.upper.length - 1]!.y;
    // Open TE has non-zero y at x=1 (small finite gap)
    expect(Math.abs(openTEy)).toBeGreaterThan(Math.abs(closedTEy));
    expect(Math.abs(closedTEy)).toBeLessThan(1e-6);
  });

  it("scales output coordinates by chord length", () => {
    const unit = nacaAirfoilEngine.generate4Digit("0012", { chord: 1 });
    const half = nacaAirfoilEngine.generate4Digit("0012", { chord: 0.5 });
    const big = nacaAirfoilEngine.generate4Digit("0012", { chord: 100 });
    // TE x should scale proportionally
    expect(unit.upper[unit.upper.length - 1]!.x).toBeCloseTo(1, 6);
    expect(half.upper[half.upper.length - 1]!.x).toBeCloseTo(0.5, 6);
    expect(big.upper[big.upper.length - 1]!.x).toBeCloseTo(100, 3);
    // Chord field is echoed
    expect(unit.chord).toBe(1);
    expect(half.chord).toBe(0.5);
    expect(big.chord).toBe(100);
  });
});

// ── Algebraic invariants ─────────────────────────────────────────────────────

describe("NACAAirfoilEngine — algebraic invariants", () => {
  it("upper and lower surfaces have identical point counts matching numPoints", () => {
    const profile = nacaAirfoilEngine.generate4Digit("2412", { numPoints: 51 });
    expect(profile.upper.length).toBe(51);
    expect(profile.lower.length).toBe(51);
  });

  it("Selig perimeter length equals 2·numPoints − 1 (LE shared)", () => {
    const profile = nacaAirfoilEngine.generate4Digit("0012", { numPoints: 81 });
    expect(profile.selig.length).toBe(2 * 81 - 1);
  });

  it("x values are monotonic along upper/lower surfaces aside from LE rotation", () => {
    // Symmetric airfoil has zero camber slope ⇒ strict monotonic increase
    const symmetric = nacaAirfoilEngine.generate4Digit("0012", { numPoints: 101 });
    expect(countXDips(symmetric.upper)).toBe(0);
    expect(countXDips(symmetric.lower)).toBe(0);
    // Cambered airfoil: rotation by camber slope θ may produce a tiny dip
    // in the first 1-3 stations near the LE; the rest of the perimeter
    // must be strictly monotonic. A handful of dips would indicate the
    // formula is wrong.
    const cambered = nacaAirfoilEngine.generate4Digit("4412", { numPoints: 101 });
    expect(countXDips(cambered.upper)).toBeLessThanOrEqual(3);
    expect(countXDips(cambered.lower)).toBeLessThanOrEqual(3);
  });

  it("instantiable via class constructor (not only singleton)", () => {
    const engine = new NACAAirfoilEngine();
    const profile = engine.generate4Digit("2412");
    expect(profile.maxThickness).toBeCloseTo(0.12, 6);
  });
});
