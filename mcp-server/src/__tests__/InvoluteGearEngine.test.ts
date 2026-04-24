/**
 * InvoluteGearEngine.test.ts — U-CADC15 engine tests
 *
 * Coverage: ISO 53 reference values, contact-ratio check against published
 * mesh pairs, algebraic invariants (tooth-count × module = pitch diameter,
 * base = pitch·cos α), failure modes, adversarial, spanning variability
 * across module/teeth/pressure-angle/profile-shift.
 */

import { describe, it, expect } from "vitest";
import {
  InvoluteGearEngine,
  involuteGearEngine,
  type GearSpec,
} from "../engines/InvoluteGearEngine.js";

// ── Happy-path: ISO 53 reference values ─────────────────────────────────────

describe("InvoluteGearEngine — ISO 53 standard geometry", () => {
  it("module 2, 20 teeth, 20° pressure angle has canonical diameters", () => {
    const g = involuteGearEngine.computeGeometry({ teeth: 20, module: 2 });
    expect(g.pitchDiameter).toBeCloseTo(40, 9); // m·z = 2·20
    expect(g.baseDiameter).toBeCloseTo(40 * Math.cos((20 * Math.PI) / 180), 6);
    expect(g.addendum).toBeCloseTo(2, 9);
    expect(g.dedendum).toBeCloseTo(2.5, 9); // 1.25·m
    expect(g.tipDiameter).toBeCloseTo(44, 6); // d + 2m
    expect(g.rootDiameter).toBeCloseTo(35, 6); // d - 2.5m
    expect(g.circularPitch).toBeCloseTo(Math.PI * 2, 6);
  });

  it("module 1.0 40-tooth gear produces 40mm pitch diameter (textbook case)", () => {
    const g = involuteGearEngine.computeGeometry({ teeth: 40, module: 1 });
    expect(g.pitchDiameter).toBeCloseTo(40, 9);
    // Base pitch = π·m·cos(α) ≈ π·1·cos(20°) ≈ 2.9521
    expect(g.basePitch).toBeCloseTo(Math.PI * Math.cos((20 * Math.PI) / 180), 6);
  });

  it("14.5° pressure angle gear has larger base diameter than 20°", () => {
    const g20 = involuteGearEngine.computeGeometry({
      teeth: 25,
      module: 2,
      pressureAngleDeg: 20,
    });
    const g14 = involuteGearEngine.computeGeometry({
      teeth: 25,
      module: 2,
      pressureAngleDeg: 14.5,
    });
    // cos(14.5°) > cos(20°) ⇒ base diameter larger
    expect(g14.baseDiameter).toBeGreaterThan(g20.baseDiameter);
    expect(g14.pitchDiameter).toBeCloseTo(g20.pitchDiameter, 9);
  });
});

// ── Profile shift behavior ──────────────────────────────────────────────────

describe("InvoluteGearEngine — profile shift", () => {
  it("positive profile shift enlarges addendum and reduces dedendum", () => {
    const base = involuteGearEngine.computeGeometry({ teeth: 15, module: 2 });
    const shifted = involuteGearEngine.computeGeometry({
      teeth: 15,
      module: 2,
      profileShift: 0.3,
    });
    expect(shifted.addendum).toBeCloseTo(base.addendum + 0.3 * 2, 6);
    expect(shifted.dedendum).toBeCloseTo(base.dedendum - 0.3 * 2, 6);
    // Pitch diameter is unaffected by profile shift
    expect(shifted.pitchDiameter).toBeCloseTo(base.pitchDiameter, 9);
  });

  it("tooth thickness at pitch increases with positive profile shift", () => {
    const base = involuteGearEngine.computeGeometry({ teeth: 20, module: 2 });
    const shifted = involuteGearEngine.computeGeometry({
      teeth: 20,
      module: 2,
      profileShift: 0.5,
    });
    expect(shifted.toothThicknessAtPitch).toBeGreaterThan(base.toothThicknessAtPitch);
  });
});

// ── Tooth-profile generation ────────────────────────────────────────────────

describe("InvoluteGearEngine — tooth profile generation", () => {
  it("generates full-profile with teeth × single-tooth-samples points", () => {
    const spec: GearSpec = { teeth: 12, module: 2 };
    const profile = involuteGearEngine.generateToothProfile(spec, { samplesPerFlank: 15 });
    expect(profile.toothAngles.length).toBe(12);
    expect(profile.fullProfile.length).toBe(12 * profile.singleToothProfile.length);
  });

  it("every point on the gear outline lies within [rootDiameter/2, tipDiameter/2] radii", () => {
    const spec: GearSpec = { teeth: 18, module: 1.5 };
    const profile = involuteGearEngine.generateToothProfile(spec);
    const rMin = profile.geometry.rootDiameter / 2;
    const rMax = profile.geometry.tipDiameter / 2;
    for (const p of profile.fullProfile) {
      const r = Math.hypot(p.x, p.y);
      // Tolerance: small numerical slop from tip arc and flank sampling
      expect(r).toBeGreaterThanOrEqual(rMin - 1e-3);
      expect(r).toBeLessThanOrEqual(rMax + 1e-3);
    }
  });

  it("single tooth profile has no NaN coordinates across extreme specs", () => {
    const specs: GearSpec[] = [
      { teeth: 5, module: 0.5 },
      { teeth: 100, module: 4 },
      { teeth: 30, module: 1, pressureAngleDeg: 14.5 },
      { teeth: 20, module: 2, profileShift: 0.4 },
    ];
    for (const spec of specs) {
      const profile = involuteGearEngine.generateToothProfile(spec);
      for (const p of profile.singleToothProfile) {
        expect(Number.isFinite(p.x)).toBe(true);
        expect(Number.isFinite(p.y)).toBe(true);
      }
    }
  });
});

// ── Contact ratio (mesh check) ──────────────────────────────────────────────

describe("InvoluteGearEngine — contact ratio", () => {
  it("20t × 40t standard spur-mesh gives contact ratio near 1.65 (textbook)", () => {
    const pinion: GearSpec = { teeth: 20, module: 2 };
    const gear: GearSpec = { teeth: 40, module: 2 };
    const r = involuteGearEngine.computeContactRatio(pinion, gear);
    // Published reference: contact ratio ε ≈ 1.63–1.67 for 20t/40t ISO 53 mesh
    expect(r.contactRatio).toBeGreaterThan(1.55);
    expect(r.contactRatio).toBeLessThan(1.75);
    // Center distance = (d1 + d2) / 2 = (40 + 80) / 2 = 60 mm
    expect(r.centerDistance).toBeCloseTo(60, 6);
  });

  it("contact ratio increases with larger tooth count (longer path of contact)", () => {
    const small = involuteGearEngine.computeContactRatio(
      { teeth: 12, module: 2 },
      { teeth: 12, module: 2 }
    );
    const big = involuteGearEngine.computeContactRatio(
      { teeth: 60, module: 2 },
      { teeth: 60, module: 2 }
    );
    expect(big.contactRatio).toBeGreaterThan(small.contactRatio);
  });

  it("rejects meshes with mismatched modules", () => {
    expect(() =>
      involuteGearEngine.computeContactRatio(
        { teeth: 20, module: 2 },
        { teeth: 20, module: 3 }
      )
    ).toThrow(/equal modules/);
  });

  it("rejects meshes with mismatched pressure angles", () => {
    expect(() =>
      involuteGearEngine.computeContactRatio(
        { teeth: 20, module: 2, pressureAngleDeg: 20 },
        { teeth: 20, module: 2, pressureAngleDeg: 14.5 }
      )
    ).toThrow(/equal pressure angles/);
  });
});

// ── Failure modes ───────────────────────────────────────────────────────────

describe("InvoluteGearEngine — failure modes", () => {
  it("rejects teeth < 5", () => {
    expect(() => involuteGearEngine.computeGeometry({ teeth: 4, module: 2 })).toThrow(/≥ 5/);
    expect(() => involuteGearEngine.computeGeometry({ teeth: 0, module: 2 })).toThrow(/≥ 5/);
  });

  it("rejects non-integer teeth", () => {
    expect(() => involuteGearEngine.computeGeometry({ teeth: 20.5, module: 2 })).toThrow(/integer/);
  });

  it("rejects non-positive module", () => {
    expect(() => involuteGearEngine.computeGeometry({ teeth: 20, module: 0 })).toThrow(/module/);
    expect(() => involuteGearEngine.computeGeometry({ teeth: 20, module: -1 })).toThrow(/module/);
  });

  it("rejects pressure angle outside (0°, 45°)", () => {
    expect(() =>
      involuteGearEngine.computeGeometry({ teeth: 20, module: 2, pressureAngleDeg: 0 })
    ).toThrow(/pressure/i);
    expect(() =>
      involuteGearEngine.computeGeometry({ teeth: 20, module: 2, pressureAngleDeg: 50 })
    ).toThrow(/pressure/i);
  });
});

// ── Adversarial ─────────────────────────────────────────────────────────────

describe("InvoluteGearEngine — adversarial inputs", () => {
  it("5-tooth gear (minimum) produces a valid profile", () => {
    const profile = involuteGearEngine.generateToothProfile({ teeth: 5, module: 1 });
    expect(profile.toothAngles.length).toBe(5);
    expect(profile.fullProfile.length).toBeGreaterThan(0);
    for (const p of profile.fullProfile) {
      expect(Number.isFinite(p.x)).toBe(true);
      expect(Number.isFinite(p.y)).toBe(true);
    }
  });

  it("250-tooth gear produces 250 replicated teeth", () => {
    const profile = involuteGearEngine.generateToothProfile(
      { teeth: 250, module: 0.5 },
      { samplesPerFlank: 6 }
    );
    expect(profile.toothAngles.length).toBe(250);
  });

  it("clamps samplesPerFlank below the hard floor to 5", () => {
    const profile = involuteGearEngine.generateToothProfile(
      { teeth: 12, module: 2 },
      { samplesPerFlank: 1 }
    );
    // 5 flank samples + 5 tip-arc samples + mirrored 5 = at least 15 points
    expect(profile.singleToothProfile.length).toBeGreaterThanOrEqual(10);
  });
});

// ── Spanning variability ────────────────────────────────────────────────────

describe("InvoluteGearEngine — spanning variability", () => {
  const cases = [
    { teeth: 12, module: 1 },
    { teeth: 24, module: 2 },
    { teeth: 60, module: 3 },
    { teeth: 20, module: 2, pressureAngleDeg: 14.5 },
    { teeth: 20, module: 2, pressureAngleDeg: 25 },
    { teeth: 30, module: 2, profileShift: 0.3 },
  ];

  for (const spec of cases) {
    it(`geometry is self-consistent for ${JSON.stringify(spec)}`, () => {
      const g = involuteGearEngine.computeGeometry(spec);
      // Key algebraic invariants
      expect(g.pitchDiameter).toBeCloseTo(spec.module * spec.teeth, 9);
      expect(g.baseDiameter).toBeCloseTo(
        g.pitchDiameter * Math.cos(((spec.pressureAngleDeg ?? 20) * Math.PI) / 180),
        6
      );
      expect(g.tipDiameter).toBeGreaterThan(g.pitchDiameter);
      expect(g.rootDiameter).toBeLessThan(g.pitchDiameter);
      expect(g.basePitch).toBeCloseTo(
        g.circularPitch * Math.cos(((spec.pressureAngleDeg ?? 20) * Math.PI) / 180),
        6
      );
    });
  }

  it("instantiable via class constructor (not only singleton)", () => {
    const engine = new InvoluteGearEngine();
    const g = engine.computeGeometry({ teeth: 20, module: 2 });
    expect(g.pitchDiameter).toBeCloseTo(40, 9);
  });
});
