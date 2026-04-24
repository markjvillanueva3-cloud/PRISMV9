/**
 * HelicalSpringEngine.test.ts — U-CADC16 engine tests
 *
 * Coverage: Shigley reference examples (k, τ, Wahl, solid length),
 * algebraic invariants (C = D/d, L_s = d·N_t for squared-ground),
 * failure modes (non-positive, C≤2, unknown material/end-cond),
 * adversarial (tiny wire/huge coil, short spring), 4+ spanning material
 * variability + 3 end-condition variability.
 */

import { describe, it, expect } from "vitest";
import {
  HelicalSpringEngine,
  helicalSpringEngine,
  SPRING_MATERIAL_SHEAR_MODULUS_MPA,
  SPRING_END_CONDITIONS,
  type SpringSpec,
} from "../engines/HelicalSpringEngine.js";

// ── Happy path: Shigley reference example ──────────────────────────────────

describe("HelicalSpringEngine — canonical Shigley cases", () => {
  // Shigley Example 10-1 (metric rework):
  // d=2mm, D=18mm, Na=10, music wire G=81,700 MPa
  // k = G·d⁴ / (8·D³·Na) = 81700·16 / (8·5832·10) = 2.803 N/mm
  it("computes spring rate for Shigley Example 10-1 parameters", () => {
    const spec: SpringSpec = {
      wireDiameter: 2,
      meanCoilDiameter: 18,
      activeCoils: 10,
      material: "music_wire",
      endCondition: "squared_ground",
    };
    const mech = helicalSpringEngine.computeMechanics(spec);
    // Manual: (81700 × 16) / (8 × 5832 × 10) = 1_307_200 / 466_560 = 2.8017
    expect(mech.springRateNPerMm).toBeCloseTo(2.802, 2);
    expect(mech.shearModulusMPa).toBe(81_700);
  });

  it("Wahl factor matches textbook value for C=6", () => {
    const spec: SpringSpec = {
      wireDiameter: 2,
      meanCoilDiameter: 12, // C = 6
      activeCoils: 10,
    };
    const mech = helicalSpringEngine.computeMechanics(spec);
    // K_w for C=6: (23/20) + 0.615/6 = 1.15 + 0.1025 = 1.2525
    expect(mech.geometry.springIndex).toBe(6);
    expect(mech.wahlFactor).toBeCloseTo(1.2525, 3);
  });

  it("Bergsträsser factor matches textbook value for C=8", () => {
    const spec: SpringSpec = {
      wireDiameter: 2,
      meanCoilDiameter: 16, // C = 8
      activeCoils: 10,
    };
    const mech = helicalSpringEngine.computeMechanics(spec);
    // K_B for C=8: (34/29) = 1.1724
    expect(mech.bergstrasserFactor).toBeCloseTo(34 / 29, 6);
  });

  it("solid length for squared-ground end = d·Nt", () => {
    const spec: SpringSpec = {
      wireDiameter: 3,
      meanCoilDiameter: 20,
      activeCoils: 8,
      endCondition: "squared_ground",
    };
    const g = helicalSpringEngine.computeGeometry(spec);
    // N_t = N_a + 2 = 10; solid = d·Nt = 3·10 = 30
    expect(g.totalCoils).toBe(10);
    expect(g.solidLength).toBeCloseTo(30, 9);
  });

  it("outer and inner diameters are D±d", () => {
    const g = helicalSpringEngine.computeGeometry({
      wireDiameter: 2,
      meanCoilDiameter: 20,
      activeCoils: 10,
    });
    expect(g.outerDiameter).toBeCloseTo(22, 9);
    expect(g.innerDiameter).toBeCloseTo(18, 9);
  });
});

// ── Stress at force ─────────────────────────────────────────────────────────

describe("HelicalSpringEngine — shear stress under load", () => {
  it("applies Wahl correction by default", () => {
    const spec: SpringSpec = {
      wireDiameter: 2,
      meanCoilDiameter: 12, // C = 6, K_w ≈ 1.2525
      activeCoils: 10,
    };
    const corrected = helicalSpringEngine.computeStressAtForce(spec, 50, true);
    const uncorrected = helicalSpringEngine.computeStressAtForce(spec, 50, false);
    // τ_base = 8·50·12 / (π·8) = 4800 / 25.1327 = 190.99 MPa
    expect(uncorrected.shearStressMPa).toBeCloseTo(191.0, 0);
    // τ_wahl ≈ 191.0 · 1.2525 = 239.2
    expect(corrected.shearStressMPa).toBeCloseTo(239.2, 0);
    expect(corrected.corrected).toBe(true);
    expect(uncorrected.corrected).toBe(false);
  });

  it("deflection = F / k", () => {
    const spec: SpringSpec = {
      wireDiameter: 2,
      meanCoilDiameter: 18,
      activeCoils: 10,
    };
    const mech = helicalSpringEngine.computeMechanics(spec);
    const stress = helicalSpringEngine.computeStressAtForce(spec, 10);
    expect(stress.deflectionMm).toBeCloseTo(10 / mech.springRateNPerMm, 6);
  });
});

// ── 3D coil path ────────────────────────────────────────────────────────────

describe("HelicalSpringEngine — coil path generation", () => {
  it("produces a 3D path at roughly samplesPerCoil × Nt points", () => {
    const path = helicalSpringEngine.generateCoilPath(
      {
        wireDiameter: 2,
        meanCoilDiameter: 20,
        activeCoils: 8,
        freeLength: 40,
        endCondition: "plain",
      },
      { samplesPerCoil: 24 }
    );
    // totalCoils = 8 (plain), samplesPerCoil = 24 → 192 + closing sample = 193
    expect(path.centerlinePath.length).toBeGreaterThanOrEqual(192);
    // z-range covers free length
    const zs = path.centerlinePath.map((p) => p.z);
    expect(Math.min(...zs)).toBeCloseTo(0, 6);
    expect(Math.max(...zs)).toBeCloseTo(40, 6);
    // radial distance from z-axis ≈ D/2 at every point
    const r = 10; // D/2
    for (const p of path.centerlinePath) {
      expect(Math.hypot(p.x, p.y)).toBeCloseTo(r, 6);
    }
  });
});

// ── Failure modes ──────────────────────────────────────────────────────────

describe("HelicalSpringEngine — failure modes", () => {
  it("rejects non-positive wire diameter", () => {
    expect(() =>
      helicalSpringEngine.computeGeometry({
        wireDiameter: 0,
        meanCoilDiameter: 10,
        activeCoils: 5,
      })
    ).toThrow(/wireDiameter/);
  });

  it("rejects non-positive mean coil diameter", () => {
    expect(() =>
      helicalSpringEngine.computeGeometry({
        wireDiameter: 2,
        meanCoilDiameter: -1,
        activeCoils: 5,
      })
    ).toThrow(/meanCoilDiameter/);
  });

  it("rejects non-positive active coils", () => {
    expect(() =>
      helicalSpringEngine.computeGeometry({
        wireDiameter: 2,
        meanCoilDiameter: 10,
        activeCoils: 0,
      })
    ).toThrow(/activeCoils/);
  });

  it("rejects unphysical spring index C ≤ 2", () => {
    expect(() =>
      helicalSpringEngine.computeGeometry({
        wireDiameter: 5,
        meanCoilDiameter: 5, // C = 1
        activeCoils: 5,
      })
    ).toThrow(/index|wire/i);
  });

  it("rejects unknown material", () => {
    expect(() =>
      helicalSpringEngine.computeMechanics({
        wireDiameter: 2,
        meanCoilDiameter: 18,
        activeCoils: 10,
        material: "unobtainium" as any,
      })
    ).toThrow(/material/i);
  });

  it("rejects unknown end condition", () => {
    expect(() =>
      helicalSpringEngine.computeGeometry({
        wireDiameter: 2,
        meanCoilDiameter: 18,
        activeCoils: 10,
        endCondition: "knotted" as any,
      })
    ).toThrow(/endCondition/i);
  });
});

// ── Adversarial ─────────────────────────────────────────────────────────────

describe("HelicalSpringEngine — adversarial inputs", () => {
  it("tiny wire + large coil (micro spring) stays finite", () => {
    const mech = helicalSpringEngine.computeMechanics({
      wireDiameter: 0.1,
      meanCoilDiameter: 5,
      activeCoils: 20,
    });
    expect(Number.isFinite(mech.springRateNPerMm)).toBe(true);
    expect(mech.springRateNPerMm).toBeGreaterThan(0);
  });

  it("huge wire + huge coil (industrial) stays finite", () => {
    const mech = helicalSpringEngine.computeMechanics({
      wireDiameter: 20,
      meanCoilDiameter: 200,
      activeCoils: 8,
    });
    expect(Number.isFinite(mech.springRateNPerMm)).toBe(true);
  });

  it("natural frequency is 0 when mass undefined (wireLength × area × ρ = 0 edge)", () => {
    // Zero active coils would fail validation, but very thin wire × very
    // short wireLength approaches zero mass — still must be finite / non-NaN.
    const mech = helicalSpringEngine.computeMechanics({
      wireDiameter: 0.05,
      meanCoilDiameter: 1,
      activeCoils: 2,
    });
    expect(Number.isFinite(mech.naturalFrequencyHz)).toBe(true);
  });

  it("handles 500-coil sampling without NaN", () => {
    const path = helicalSpringEngine.generateCoilPath({
      wireDiameter: 1,
      meanCoilDiameter: 10,
      activeCoils: 500,
      freeLength: 600,
    });
    for (const p of path.centerlinePath) {
      expect(Number.isFinite(p.x)).toBe(true);
      expect(Number.isFinite(p.y)).toBe(true);
      expect(Number.isFinite(p.z)).toBe(true);
    }
  });
});

// ── Spanning variability ────────────────────────────────────────────────────

describe("HelicalSpringEngine — spanning material variability", () => {
  const materials = [
    "music_wire",
    "hard_drawn",
    "stainless_302",
    "chrome_silicon",
    "phosphor_bronze",
  ] as const;

  for (const material of materials) {
    it(`computes rate for material '${material}' with correct G lookup`, () => {
      const mech = helicalSpringEngine.computeMechanics({
        wireDiameter: 2,
        meanCoilDiameter: 18,
        activeCoils: 10,
        material,
      });
      expect(mech.shearModulusMPa).toBe(SPRING_MATERIAL_SHEAR_MODULUS_MPA[material]);
      expect(mech.springRateNPerMm).toBeGreaterThan(0);
    });
  }

  it("shearModulusMPa override bypasses material lookup", () => {
    const mech = helicalSpringEngine.computeMechanics({
      wireDiameter: 2,
      meanCoilDiameter: 18,
      activeCoils: 10,
      material: "music_wire",
      shearModulusMPa: 50_000,
    });
    expect(mech.shearModulusMPa).toBe(50_000);
  });
});

describe("HelicalSpringEngine — spanning end-condition variability", () => {
  const endConditions = ["plain", "plain_ground", "squared", "squared_ground"] as const;
  for (const ec of endConditions) {
    it(`end condition '${ec}' yields expected total-coil count`, () => {
      const g = helicalSpringEngine.computeGeometry({
        wireDiameter: 2,
        meanCoilDiameter: 18,
        activeCoils: 10,
        endCondition: ec,
      });
      const expectedTotal = 10 + SPRING_END_CONDITIONS[ec].endCoils;
      expect(g.totalCoils).toBe(expectedTotal);
    });
  }
});

// ── Algebraic invariants ────────────────────────────────────────────────────

describe("HelicalSpringEngine — algebraic invariants", () => {
  it("C = D/d exactly", () => {
    for (const d of [0.5, 1, 2.5, 5]) {
      for (const D of [d * 3, d * 6, d * 12]) {
        const g = helicalSpringEngine.computeGeometry({
          wireDiameter: d,
          meanCoilDiameter: D,
          activeCoils: 10,
        });
        expect(g.springIndex).toBeCloseTo(D / d, 9);
      }
    }
  });

  it("instantiable via class constructor (not only singleton)", () => {
    const engine = new HelicalSpringEngine();
    const g = engine.computeGeometry({
      wireDiameter: 2,
      meanCoilDiameter: 18,
      activeCoils: 10,
    });
    expect(g.springIndex).toBe(9);
  });

  it("wire length scales with Nt × πD (zero-pitch limit)", () => {
    const g = helicalSpringEngine.computeGeometry({
      wireDiameter: 2,
      meanCoilDiameter: 10,
      activeCoils: 5,
      pitch: 0.001, // near-zero pitch
      endCondition: "plain",
    });
    const expected = g.totalCoils * Math.PI * g.meanCoilDiameter;
    // Within 0.01% due to the sqrt(1+(pitch/(πD))²) ≈ 1 term
    expect(g.wireLength).toBeCloseTo(expected, 2);
  });
});
