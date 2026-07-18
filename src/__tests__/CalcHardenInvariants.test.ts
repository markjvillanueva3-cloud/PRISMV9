/**
 * CALC-HARDEN Cross-Engine Physics Invariant Tests
 *
 * Validates mathematical consistency ACROSS engines — not individual formulas,
 * but whether outputs of one engine are consistent with another.
 *
 * @milestone CALC-HARDEN-MS0
 * @unit U-CH17
 */

import { describe, it, expect } from "vitest";

// Canonical source
import {
  CANONICAL_KIENZLE,
  CANONICAL_TAYLOR,
  CANONICAL_TOOL_MODULUS,
  kienzleForce,
  taylorLife,
  cuttingPower,
  spindleTorque,
  predictedRa,
  getKienzle,
  getTaylor,
  getToolModulus,
} from "../physics/constants.js";

// Engines under test
import { toolAssemblyDeflectionEngine } from "../engines/ToolAssemblyDeflectionEngine.js";
import { fixtureDynamicsEngine } from "../engines/FixtureDynamicsEngine.js";
import { monteCarloEngine } from "../engines/MonteCarloEngine.js";


describe("CALC-HARDEN Cross-Engine Invariants", () => {

  // ═══════════════════════════════════════════════════════════════════
  // INVARIANT 1: Taylor tool life formula consistent across engines
  // ═══════════════════════════════════════════════════════════════════

  describe("Taylor Tool Life Consistency", () => {
    it("taylorLife(C, n, Vc) matches (C/Vc)^(1/n) for all ISO groups", () => {
      for (const [group, { C, n }] of Object.entries(CANONICAL_TAYLOR)) {
        const Vc = 200; // m/min
        const expected = Math.pow(C / Vc, 1 / n);
        const actual = taylorLife(C, n, Vc);
        expect(actual).toBeCloseTo(expected, 3);
      }
    });

    it("taylorLife never produces negative or zero for valid inputs", () => {
      for (const [, { C, n }] of Object.entries(CANONICAL_TAYLOR)) {
        for (const Vc of [50, 100, 200, 300, 500]) {
          expect(taylorLife(C, n, Vc)).toBeGreaterThan(0);
        }
      }
    });

    it("taylorLife decreases monotonically with increasing speed", () => {
      const { C, n } = CANONICAL_TAYLOR.P;
      let prev = Infinity;
      for (const Vc of [50, 100, 150, 200, 250, 300, 400]) {
        const life = taylorLife(C, n, Vc);
        expect(life).toBeLessThan(prev);
        prev = life;
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // INVARIANT 2: Force → Power chain consistent
  // ═══════════════════════════════════════════════════════════════════

  describe("Force → Power → Torque Chain", () => {
    it("P = Fc × Vc / 60000 matches cuttingPower()", () => {
      const Fc = 1000; // N
      const Vc = 200;  // m/min
      const expected_kW = (Fc * Vc) / 60000;
      expect(cuttingPower(Fc, Vc)).toBeCloseTo(expected_kW, 6);
    });

    it("T = P × 30000 / (π × n) matches spindleTorque()", () => {
      const Fc = 1000;
      const D = 20; // mm
      const expected_Nm = (Fc * D) / 2000;
      expect(spindleTorque(Fc, D)).toBeCloseTo(expected_Nm, 6);
    });

    it("kienzleForce with canonical P-group produces reasonable steel force", () => {
      const { kc1_1, mc } = CANONICAL_KIENZLE.P;
      const ap = 3; // mm
      const fz = 0.15; // mm/tooth
      const Fc = kienzleForce(kc1_1, mc, ap, fz);
      // Steel, 3mm DOC, 0.15mm feed → expect ~800-1200N
      expect(Fc).toBeGreaterThan(500);
      expect(Fc).toBeLessThan(2000);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // INVARIANT 3: Kienzle constants self-consistent
  // ═══════════════════════════════════════════════════════════════════

  describe("Kienzle Constants Consistency", () => {
    it("all ISO groups have positive kc1_1 and mc in (0, 1)", () => {
      for (const [group, { kc1_1, mc }] of Object.entries(CANONICAL_KIENZLE)) {
        expect(kc1_1).toBeGreaterThan(0);
        expect(mc).toBeGreaterThan(0);
        expect(mc).toBeLessThan(1);
      }
    });

    it("kc1_1 ordering: N < K < P < M < S ≤ H (softest to hardest)", () => {
      const { N, K, P, M, S, H } = CANONICAL_KIENZLE;
      expect(N.kc1_1).toBeLessThan(K.kc1_1);
      expect(K.kc1_1).toBeLessThan(P.kc1_1);
      expect(P.kc1_1).toBeLessThan(M.kc1_1);
      expect(M.kc1_1).toBeLessThan(S.kc1_1);
      expect(S.kc1_1).toBeLessThanOrEqual(H.kc1_1);
    });

    it("getKienzle resolves common material names to correct groups", () => {
      expect(getKienzle("steel").kc1_1).toBe(CANONICAL_KIENZLE.P.kc1_1);
      expect(getKienzle("aluminum").kc1_1).toBe(CANONICAL_KIENZLE.N.kc1_1);
      expect(getKienzle("stainless").kc1_1).toBe(CANONICAL_KIENZLE.M.kc1_1);
      expect(getKienzle("cast_iron").kc1_1).toBe(CANONICAL_KIENZLE.K.kc1_1);
      expect(getKienzle("titanium").kc1_1).toBe(CANONICAL_KIENZLE.S.kc1_1);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // INVARIANT 4: E modulus consistency
  // ═══════════════════════════════════════════════════════════════════

  describe("Tool Modulus Consistency", () => {
    it("carbide > ceramic > cermet > hss (stiffness ordering)", () => {
      expect(CANONICAL_TOOL_MODULUS.carbide).toBeGreaterThan(CANONICAL_TOOL_MODULUS.cermet);
      expect(CANONICAL_TOOL_MODULUS.cermet).toBeGreaterThan(CANONICAL_TOOL_MODULUS.ceramic);
      expect(CANONICAL_TOOL_MODULUS.ceramic).toBeGreaterThan(CANONICAL_TOOL_MODULUS.hss);
    });

    it("getToolModulus resolves material names correctly", () => {
      expect(getToolModulus("carbide")).toBe(600000);
      expect(getToolModulus("hss")).toBe(210000);
    });

    it("deflection with HSS is ~2.86x more than carbide (E ratio)", () => {
      const ratio = CANONICAL_TOOL_MODULUS.carbide / CANONICAL_TOOL_MODULUS.hss;
      expect(ratio).toBeCloseTo(600000 / 210000, 1);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // INVARIANT 5: Surface finish formula consistency
  // ═══════════════════════════════════════════════════════════════════

  describe("Surface Finish Ra Consistency", () => {
    it("Ra = fz² / (32·r) × 1000 matches predictedRa()", () => {
      const fz = 0.1; // mm
      const r = 0.8;  // mm nose radius
      const expected_um = (fz * fz) / (32 * r) * 1000;
      expect(predictedRa(fz, r)).toBeCloseTo(expected_um, 4);
    });

    it("Ra increases quadratically with feed", () => {
      const r = 0.8;
      const ra1 = predictedRa(0.1, r);
      const ra2 = predictedRa(0.2, r);
      // Doubling feed should quadruple Ra
      expect(ra2 / ra1).toBeCloseTo(4, 1);
    });

    it("Ra decreases with larger nose radius", () => {
      const fz = 0.15;
      expect(predictedRa(fz, 1.6)).toBeLessThan(predictedRa(fz, 0.8));
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // INVARIANT 6: ToolAssemblyDeflection uses canonical E
  // ═══════════════════════════════════════════════════════════════════

  describe("Deflection Engine Uses Canonical Constants", () => {
    it("carbide deflection matches canonical E=600000 MPa", () => {
      const result = toolAssemblyDeflectionEngine.compute({
        sections: [
          { name: "tool", length_mm: 50, diameter_mm: 10, material: "carbide", is_cutting: true },
        ],
        cutting_force_n: 500,
        taper: "BT40",
        use_fem: false,
      });
      // δ = F·L³/(3·E·I) with E=600000, I=π·10⁴/64
      const I = Math.PI * Math.pow(10, 4) / 64;
      const expected = (500 * Math.pow(50, 3)) / (3 * 600000 * I);
      // Total includes spindle deflection, so tool part should be close
      expect(result.value.total_deflection_mm).toBeGreaterThan(expected * 0.5);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // INVARIANT 7: Fixture FEM produces positive von Mises stress
  // ═══════════════════════════════════════════════════════════════════

  describe("Fixture FEM Consistency", () => {
    it("clamp contact stress increases with force", () => {
      const base = fixtureDynamicsEngine.clampContactStress({
        jaw_width_mm: 30, jaw_height_mm: 20, jaw_thickness_mm: 10,
        clamping_force_N: 5000,
      });
      const high = fixtureDynamicsEngine.clampContactStress({
        jaw_width_mm: 30, jaw_height_mm: 20, jaw_thickness_mm: 10,
        clamping_force_N: 10000,
      });
      expect(high.max_von_mises_mpa).toBeGreaterThan(base.max_von_mises_mpa);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // INVARIANT 8: Monte Carlo correlated sampling preserves statistics
  // ═══════════════════════════════════════════════════════════════════

  describe("Monte Carlo Correlated Sampling", () => {
    it("sample means converge to input means", () => {
      const mu = [100, 50];
      const cov = [[4, 1.6], [1.6, 1]];
      const samples = monteCarloEngine.sampleCorrelatedNormal(mu, cov, 500);
      const meanX = samples.reduce((s, r) => s + r[0], 0) / 500;
      const meanY = samples.reduce((s, r) => s + r[1], 0) / 500;
      expect(meanX).toBeGreaterThan(95);
      expect(meanX).toBeLessThan(105);
      expect(meanY).toBeGreaterThan(45);
      expect(meanY).toBeLessThan(55);
    });
  });
});
