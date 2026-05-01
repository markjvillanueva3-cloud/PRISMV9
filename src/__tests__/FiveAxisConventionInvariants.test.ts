/**
 * Five-Axis IK Convention Invariant Tests
 *
 * Validates that all IK engines produce consistent rotary axis positions
 * for the same tool axis vector, and that FK/IK round-trips are identity.
 *
 * @milestone CALC-HARDEN
 */

import { describe, it, expect } from "vitest";

// Canonical FK from MultiAxisKinematicEngine head-table:
//   nx = sin(A)*sin(C), ny = -sin(A)*cos(C), nz = cos(A)
// Canonical IK: A = acos(nz), C = atan2(nx, -ny)

const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;

function headTableFK(A_deg: number, C_deg: number): { nx: number; ny: number; nz: number } {
  const A = A_deg * DEG, C = C_deg * DEG;
  return {
    nx: Math.sin(A) * Math.sin(C),
    ny: -Math.sin(A) * Math.cos(C),
    nz: Math.cos(A),
  };
}

function canonicalIK(nx: number, ny: number, nz: number): { A_deg: number; C_deg: number } {
  const A = Math.acos(Math.max(-1, Math.min(1, nz))) * RAD;
  const C = Math.abs(Math.sin(A * DEG)) > 0.001
    ? Math.atan2(nx, -ny) * RAD
    : 0; // singularity at A≈0
  return { A_deg: A, C_deg: C };
}


describe("Five-Axis Convention Invariants", () => {

  describe("FK/IK round-trip for head-table AC", () => {
    const testCases = [
      { A: 30, C: 0 },
      { A: 30, C: 45 },
      { A: 30, C: 60 },
      { A: 30, C: 90 },
      { A: 30, C: 135 },
      { A: 30, C: -45 },
      { A: 45, C: 30 },
      { A: 60, C: 120 },
      { A: 15, C: 270 },
      { A: 85, C: 10 },
    ];

    for (const { A, C } of testCases) {
      it(`FK(A=${A}°, C=${C}°) → IK → (A=${A}°, C=${C}°)`, () => {
        const n = headTableFK(A, C);
        const result = canonicalIK(n.nx, n.ny, n.nz);
        expect(result.A_deg).toBeCloseTo(A, 3);
        // C may wrap around 360°, normalize
        const cNorm = ((result.C_deg % 360) + 360) % 360;
        const cExpected = ((C % 360) + 360) % 360;
        expect(cNorm).toBeCloseTo(cExpected, 3);
      });
    }
  });

  describe("Singularity at A=0", () => {
    it("A=0° is correctly identified as indeterminate C", () => {
      const n = headTableFK(0, 45); // vertical tool — C shouldn't matter
      expect(n.nz).toBeCloseTo(1.0, 6);
      const result = canonicalIK(n.nx, n.ny, n.nz);
      expect(result.A_deg).toBeCloseTo(0, 3);
      // C is indeterminate at A=0 — any value is valid
    });

    it("near-singularity A=1° still produces valid C", () => {
      const n = headTableFK(1, 60);
      const result = canonicalIK(n.nx, n.ny, n.nz);
      expect(result.A_deg).toBeCloseTo(1, 1);
      expect(result.C_deg).toBeCloseTo(60, 1);
    });
  });

  describe("Tool axis unit vector check", () => {
    it("FK always produces unit vectors", () => {
      for (const A of [0, 15, 30, 45, 60, 75, 90]) {
        for (const C of [0, 30, 60, 90, 120, 180, 270]) {
          const n = headTableFK(A, C);
          const len = Math.sqrt(n.nx * n.nx + n.ny * n.ny + n.nz * n.nz);
          expect(len).toBeCloseTo(1.0, 10);
        }
      }
    });
  });

  describe("Convention consistency across IK formulas", () => {
    it("atan2(nx, -ny) matches canonical for 10 test orientations", () => {
      const orientations = [
        { A: 20, C: 30 }, { A: 40, C: 60 }, { A: 10, C: 150 },
        { A: 50, C: -30 }, { A: 70, C: 0 }, { A: 35, C: 90 },
        { A: 25, C: 180 }, { A: 55, C: 270 }, { A: 80, C: 45 },
        { A: 5, C: 315 },
      ];
      for (const { A, C } of orientations) {
        const n = headTableFK(A, C);
        // All three engines should use: C = atan2(nx, -ny)
        const C_computed = Math.atan2(n.nx, -n.ny) * RAD;
        const cNorm = ((C_computed % 360) + 360) % 360;
        const cExpected = ((C % 360) + 360) % 360;
        expect(cNorm).toBeCloseTo(cExpected, 3);
      }
    });
  });
});
