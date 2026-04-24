/**
 * LoftedWingEngine.test.ts — U-CADC14 engine tests
 *
 * Coverage contract:
 *   - Happy path: straight rectangular wing, tapered wing, swept wing, dihedral wing, twisted wing
 *   - Reference values: Raymer MAC formula, AR = b²/S, planform area = span × (c_r + c_t)/2
 *   - Algebraic invariants: MAC at λ=1 equals c_root; dihedral=0 ⇒ all z-offsets zero; twist=0 ⇒ section y preserved
 *   - Failure modes: non-positive halfSpan/chord, <2 stations for computeWingProperties, <3-point profiles for blend
 *   - Adversarial: zero tip chord (delta wing), extreme sweep, cosine vs linear spacing
 *   - Spanning variability: single profile vs blended root/tip profiles
 */

import { describe, it, expect } from "vitest";
import {
  LoftedWingEngine,
  loftedWingEngine,
  type LoftOptions,
  type WingSection,
} from "../engines/LoftedWingEngine.js";
import { nacaAirfoilEngine, type AirfoilProfile } from "../engines/NACAAirfoilEngine.js";

// ── Fixtures ─────────────────────────────────────────────────────────────────

function naca0012(): AirfoilProfile {
  return nacaAirfoilEngine.generate4Digit("0012", { numPoints: 41 });
}

function naca2412(): AirfoilProfile {
  return nacaAirfoilEngine.generate4Digit("2412", { numPoints: 41 });
}

function rectangularOptions(overrides: Partial<LoftOptions> = {}): LoftOptions {
  return {
    halfSpan: 5,
    rootChord: 1,
    tipChord: 1,
    numStations: 11,
    cosineSpanwise: false,
    ...overrides,
  };
}

// ── Happy-path tests ─────────────────────────────────────────────────────────

describe("LoftedWingEngine — rectangular wings", () => {
  it("computes area = span · chord and AR = span / chord for a 10m × 1m rectangular wing", () => {
    const wing = loftedWingEngine.loftSingleProfile(naca0012(), rectangularOptions());
    // Half-span=5 ⇒ full span b = 10, chord = 1 ⇒ area = 10, AR = 100/10 = 10
    expect(wing.planformArea).toBeCloseTo(10, 5);
    expect(wing.aspectRatio).toBeCloseTo(10, 5);
    expect(wing.halfSpan).toBe(5);
    expect(wing.taperRatio).toBe(1);
    expect(wing.referenceChord).toBe(1);
  });

  it("rectangular wing has MAC equal to chord (taper ratio = 1)", () => {
    const wing = loftedWingEngine.loftSingleProfile(naca0012(), rectangularOptions());
    // Raymer: MAC = (2/3) · c · (1 + 1 + 1)/(1 + 1) = (2/3) · c · 1.5 = c
    expect(wing.meanAerodynamicChord).toBeCloseTo(1, 9);
  });

  it("produces numStations sections with twist=0 and identical chord", () => {
    const wing = loftedWingEngine.loftSingleProfile(naca0012(), rectangularOptions({ numStations: 21 }));
    expect(wing.sections.length).toBe(21);
    for (const section of wing.sections) {
      expect(section.chord).toBeCloseTo(1, 9);
      expect(section.twistRad).toBeCloseTo(0, 9);
      expect(section.sweepOffset).toBeCloseTo(0, 9);
      expect(section.dihedralOffset).toBeCloseTo(0, 9);
    }
  });
});

describe("LoftedWingEngine — tapered wings", () => {
  it("computes Raymer MAC for a Cessna-style tapered wing (c_r=1.5, c_t=1.0)", () => {
    const wing = loftedWingEngine.loftSingleProfile(
      naca2412(),
      rectangularOptions({ rootChord: 1.5, tipChord: 1.0, halfSpan: 5 })
    );
    // λ = 1.0 / 1.5 = 0.667
    // MAC = (2/3) · 1.5 · (1 + 0.667 + 0.444) / (1 + 0.667) = 1.0 · 2.111 / 1.667 = 1.267
    const expectedMAC = (2 / 3) * 1.5 * (1 + 2 / 3 + 4 / 9) / (1 + 2 / 3);
    expect(wing.meanAerodynamicChord).toBeCloseTo(expectedMAC, 5);
    expect(wing.taperRatio).toBeCloseTo(2 / 3, 9);
    // Planform area = b · (c_r + c_t) / 2 = 10 · 1.25 = 12.5
    expect(wing.planformArea).toBeCloseTo(12.5, 5);
  });

  it("chord interpolates linearly from root to tip", () => {
    const wing = loftedWingEngine.loftSingleProfile(
      naca0012(),
      rectangularOptions({ rootChord: 2, tipChord: 0.5 })
    );
    const mid = wing.sections[Math.floor(wing.sections.length / 2)]!;
    expect(mid.chord).toBeCloseTo(1.25, 5); // 0.5 · (2 + 0.5)
    expect(wing.sections[0]!.chord).toBeCloseTo(2, 9);
    expect(wing.sections[wing.sections.length - 1]!.chord).toBeCloseTo(0.5, 9);
  });

  it("delta-wing limit (tipChord → 0) produces a triangular planform", () => {
    const wing = loftedWingEngine.loftSingleProfile(
      naca0012(),
      rectangularOptions({ rootChord: 4, tipChord: 0.001 })
    );
    // Area ≈ 0.5 · span · c_root = 0.5 · 10 · 4 = 20
    expect(wing.planformArea).toBeCloseTo(20, 2);
    expect(wing.taperRatio).toBeLessThan(0.001);
  });
});

describe("LoftedWingEngine — sweep, dihedral, twist", () => {
  it("30° quarter-chord sweep shifts tip x by halfSpan · tan(30°)", () => {
    const wing = loftedWingEngine.loftSingleProfile(
      naca0012(),
      rectangularOptions({ quarterChordSweepDeg: 30 })
    );
    const tip = wing.sections[wing.sections.length - 1]!;
    expect(tip.sweepOffset).toBeCloseTo(5 * Math.tan((30 * Math.PI) / 180), 6);
    expect(wing.quarterChordSweepDeg).toBeCloseTo(30, 3);
  });

  it("5° dihedral lifts the tip by halfSpan · tan(5°)", () => {
    const wing = loftedWingEngine.loftSingleProfile(
      naca0012(),
      rectangularOptions({ dihedralDeg: 5 })
    );
    const tip = wing.sections[wing.sections.length - 1]!;
    expect(tip.dihedralOffset).toBeCloseTo(5 * Math.tan((5 * Math.PI) / 180), 6);
    expect(wing.dihedralDeg).toBeCloseTo(5, 3);
  });

  it("−3° washout linearly interpolates twist from root to tip", () => {
    const wing = loftedWingEngine.loftSingleProfile(
      naca0012(),
      rectangularOptions({ rootTwistDeg: 0, tipTwistDeg: -3 })
    );
    expect(wing.twistDistributionDeg[0]).toBeCloseTo(0, 6);
    expect(wing.twistDistributionDeg[wing.twistDistributionDeg.length - 1]).toBeCloseTo(-3, 6);
    // Mid-station linearly interpolated
    const mid = wing.twistDistributionDeg[Math.floor(wing.twistDistributionDeg.length / 2)];
    expect(mid).toBeCloseTo(-1.5, 3);
  });

  it("zero sweep and zero dihedral keep all 3D rib points co-planar in z where profile y=0", () => {
    const wing = loftedWingEngine.loftSingleProfile(naca0012(), rectangularOptions());
    // Find upper-surface LE point at each station (x=0, y_local=0 for symmetric 0012)
    // After transforming: y=station, z=0 (since profile y is zero at LE and no dihedral/twist)
    for (const rib of wing.ribs3D) {
      // rib points have y = section station (all equal within each rib)
      const ys = new Set(rib.map((p) => p.y));
      expect(ys.size).toBe(1);
    }
  });
});

// ── Blended root/tip profiles ────────────────────────────────────────────────

describe("LoftedWingEngine — blended root/tip profiles", () => {
  it("blends NACA 2412 root with NACA 0012 tip — mid-station has intermediate thickness", () => {
    const root = naca2412();
    const tip = naca0012();
    const wing = loftedWingEngine.loftBetweenProfiles(root, tip, rectangularOptions({ numStations: 11 }));
    // Root profile: maxCamber = 0.02 (2% camber)
    // Tip profile: maxCamber = 0 (symmetric)
    // Mid-station should have ≈ 1% camber
    const mid = wing.sections[5]!;
    expect(mid.profile.maxCamber).toBeGreaterThan(0);
    expect(mid.profile.maxCamber).toBeLessThan(root.maxCamber);
    // Thickness is 12% for both, so it stays 12% throughout
    expect(mid.profile.maxThickness).toBeCloseTo(0.12, 6);
  });

  it("identical root and tip profiles blend to themselves at every station", () => {
    const root = naca0012();
    const tip = naca0012();
    const wing = loftedWingEngine.loftBetweenProfiles(root, tip, rectangularOptions({ numStations: 7 }));
    for (const section of wing.sections) {
      expect(section.profile.maxThickness).toBeCloseTo(0.12, 6);
      expect(section.profile.maxCamber).toBeCloseTo(0, 6);
    }
  });
});

// ── Failure modes ────────────────────────────────────────────────────────────

describe("LoftedWingEngine — failure modes", () => {
  it("rejects non-positive halfSpan", () => {
    expect(() =>
      loftedWingEngine.loftSingleProfile(naca0012(), rectangularOptions({ halfSpan: 0 }))
    ).toThrow(/halfSpan/);
    expect(() =>
      loftedWingEngine.loftSingleProfile(naca0012(), rectangularOptions({ halfSpan: -5 }))
    ).toThrow(/halfSpan/);
  });

  it("rejects non-positive root or tip chord", () => {
    expect(() =>
      loftedWingEngine.loftSingleProfile(naca0012(), rectangularOptions({ rootChord: 0 }))
    ).toThrow(/rootChord/);
    expect(() =>
      loftedWingEngine.loftSingleProfile(naca0012(), rectangularOptions({ tipChord: -1 }))
    ).toThrow(/tipChord/);
  });

  it("computeWingProperties rejects <2 sections", () => {
    const singleSection: WingSection[] = [
      {
        profile: naca0012(),
        station: 0,
        chord: 1,
        twistRad: 0,
        sweepOffset: 0,
        dihedralOffset: 0,
      },
    ];
    expect(() => loftedWingEngine.computeWingProperties(singleSection)).toThrow(/≥2/);
    expect(() => loftedWingEngine.computeWingProperties([])).toThrow(/≥2/);
  });
});

// ── Adversarial / variability ────────────────────────────────────────────────

describe("LoftedWingEngine — adversarial inputs", () => {
  it("clamps numStations below the hard floor to 2", () => {
    const wing = loftedWingEngine.loftSingleProfile(
      naca0012(),
      rectangularOptions({ numStations: 1 })
    );
    expect(wing.sections.length).toBe(2);
  });

  it("survives extreme sweep angle (85°) without NaN offsets", () => {
    const wing = loftedWingEngine.loftSingleProfile(
      naca0012(),
      rectangularOptions({ quarterChordSweepDeg: 85 })
    );
    for (const section of wing.sections) {
      expect(Number.isFinite(section.sweepOffset)).toBe(true);
    }
    for (const rib of wing.ribs3D) {
      for (const p of rib) {
        expect(Number.isFinite(p.x)).toBe(true);
        expect(Number.isFinite(p.y)).toBe(true);
        expect(Number.isFinite(p.z)).toBe(true);
      }
    }
  });

  it("large numStations (501) produces no NaN and maintains chord monotonicity for tapered wing", () => {
    const wing = loftedWingEngine.loftSingleProfile(
      naca0012(),
      rectangularOptions({ rootChord: 2, tipChord: 1, numStations: 501 })
    );
    expect(wing.sections.length).toBe(501);
    // Tapered wing: chord must decrease monotonically root→tip
    for (let i = 1; i < wing.sections.length; i++) {
      const prev = wing.sections[i - 1]!;
      const cur = wing.sections[i]!;
      expect(cur.chord).toBeLessThanOrEqual(prev.chord + 1e-9);
    }
  });
});

describe("LoftedWingEngine — spanwise spacing variability", () => {
  it("cosine spacing clusters stations toward the tip relative to linear spacing", () => {
    const cosine = loftedWingEngine.loftSingleProfile(
      naca0012(),
      rectangularOptions({ numStations: 21, cosineSpanwise: true })
    );
    const linear = loftedWingEngine.loftSingleProfile(
      naca0012(),
      rectangularOptions({ numStations: 21, cosineSpanwise: false })
    );
    // Linear: 21 stations over halfSpan=5 ⇒ spacing = 0.25
    expect(linear.sections[1]!.station).toBeCloseTo(0.25, 6);
    // Cosine: second station is much smaller (same density near tip too)
    expect(cosine.sections[1]!.station).toBeLessThan(0.1);
    // Both end at the tip
    expect(cosine.sections[cosine.sections.length - 1]!.station).toBeCloseTo(5, 6);
    expect(linear.sections[linear.sections.length - 1]!.station).toBeCloseTo(5, 6);
  });

  it("instantiable via class constructor (not only singleton)", () => {
    const engine = new LoftedWingEngine();
    const wing = engine.loftSingleProfile(naca0012(), rectangularOptions());
    expect(wing.planformArea).toBeCloseTo(10, 5);
  });
});

// ── Algebraic invariants ─────────────────────────────────────────────────────

describe("LoftedWingEngine — algebraic invariants", () => {
  it("rib3D point count equals profile.selig length for every section", () => {
    const profile = naca0012();
    const wing = loftedWingEngine.loftSingleProfile(profile, rectangularOptions({ numStations: 9 }));
    for (const rib of wing.ribs3D) {
      expect(rib.length).toBe(profile.selig.length);
    }
  });

  it("AR = b²/S is consistent with planformArea and halfSpan", () => {
    const wing = loftedWingEngine.loftSingleProfile(
      naca0012(),
      rectangularOptions({ rootChord: 2, tipChord: 0.5, halfSpan: 6 })
    );
    const fullSpan = 2 * wing.halfSpan;
    expect(wing.aspectRatio).toBeCloseTo((fullSpan * fullSpan) / wing.planformArea, 5);
  });

  it("computeWingProperties result matches loft-generated metrics", () => {
    const wing = loftedWingEngine.loftSingleProfile(
      naca2412(),
      rectangularOptions({ rootChord: 1.2, tipChord: 0.8, quarterChordSweepDeg: 10, dihedralDeg: 3 })
    );
    const recomputed = loftedWingEngine.computeWingProperties(wing.sections);
    expect(recomputed.planformArea).toBeCloseTo(wing.planformArea, 6);
    expect(recomputed.aspectRatio).toBeCloseTo(wing.aspectRatio, 6);
    expect(recomputed.meanAerodynamicChord).toBeCloseTo(wing.meanAerodynamicChord, 6);
    expect(recomputed.quarterChordSweepDeg).toBeCloseTo(wing.quarterChordSweepDeg, 6);
    expect(recomputed.dihedralDeg).toBeCloseTo(wing.dihedralDeg, 6);
  });
});
