/**
 * FusionMaterialPhysicsBridge — real reference-value tests
 *
 * Engine under test: src/engines/FusionMaterialPhysicsBridge.ts
 * (previously untested — no test file referenced it; imported via singleton).
 *
 * Every expected number is derived INDEPENDENTLY from the documented physics
 * formulas, not copied from the implementation:
 *   - Kienzle cutting force:  Fc = kc1_1 * ap * fz^(1-mc)   (doc line 11)
 *   - Taylor tool life:       T  = (C/Vc)^(1/n)             (doc line 12)
 *   - Johnson-Cook flow stress:
 *       sigma = (A + B*eps^n)(1 + C*ln(eps_dot/eps_dot_0))(1 - T_star^m)
 *       T_star = (T - Tr)/(Tm - Tr)                         (doc line 13)
 *
 * Canonical ISO kc1.1 values (P=1800, M=2100, K=1100, N=700, S=2800, H=3200)
 * match src/physics/constants.ts and CLAUDE.md §SAFETY.
 *
 * Coverage: happy path + >=3 failure modes + >=2 adversarial inputs +
 * physical-invariant assertions. 20+ cases.
 */

import { describe, it, expect } from "vitest";
import {
  fusionMaterialPhysicsBridge as bridge,
  FusionMaterialPhysicsBridge,
} from "../engines/FusionMaterialPhysicsBridge.js";

describe("FusionMaterialPhysicsBridge", () => {
  // ==========================================================================
  // HAPPY PATH — Kienzle cutting force
  // ==========================================================================
  describe("calculateCuttingForce (Kienzle Fc = kc1_1 * ap * fz^(1-mc))", () => {
    it("computes the reference case for AISI 1045 (P group)", () => {
      // kc1_1=1800, mc=0.25, ap=2mm, fz=0.1mm, Vc=200 m/min, D=10mm
      // kc  = 1800 * 0.1^(-0.25)      = 3200.9029...  -> round -> 3201
      // Fc  = 1800 * 2 * 0.1^(0.75)   = 640.1806      -> round(1dp) -> 640.2
      // P   = 640.1806 * 200 / 60000  = 2.13393       -> round(2dp) -> 2.13
      // Tq  = 640.1806 * 10/2 / 1000  = 3.20090       -> round(2dp) -> 3.20
      const r = bridge.calculateCuttingForce("fusion-1045", 2, 0.1, 200, 10);
      expect(r).not.toBeNull();
      expect(r!.force_N).toBeCloseTo(640.2, 4);
      expect(r!.specific_force_N_mm2).toBe(3201);
      expect(r!.power_kW).toBeCloseTo(2.13, 4);
      expect(r!.torque_Nm).toBeCloseTo(3.2, 4);
      expect(r!.source).toContain("Kienzle");
    });

    it("matches the independent closed-form Fc across all six ISO groups", () => {
      // kc1.1 canonical map + mc per engine constants (ISO 3685)
      const cases: Array<[string, number, number]> = [
        ["fusion-1045", 1800, 0.25], // P
        ["fusion-304", 2100, 0.25], // M
        ["fusion-gray-iron", 1100, 0.28], // K
        ["fusion-6061", 700, 0.22], // N
        ["fusion-ti6al4v", 2800, 0.25], // S
        ["fusion-d2-hard", 3200, 0.28], // H
      ];
      const ap = 3, fz = 0.15, Vc = 120, D = 12;
      for (const [id, kc11, mc] of cases) {
        const expectedFc = kc11 * ap * Math.pow(fz, 1 - mc); // documented formula
        const r = bridge.calculateCuttingForce(id, ap, fz, Vc, D);
        expect(r).not.toBeNull();
        // engine rounds force to 1 decimal -> allow +/-0.05 rounding slack
        expect(r!.force_N).toBeCloseTo(expectedFc, 1);
        expect(Math.abs(r!.force_N - expectedFc)).toBeLessThan(0.06);
      }
    });

    it("scales power linearly with cutting speed and torque linearly with diameter", () => {
      const a = bridge.calculateCuttingForce("fusion-1045", 2, 0.1, 100, 10)!;
      const b = bridge.calculateCuttingForce("fusion-1045", 2, 0.1, 200, 10)!;
      // same force, double speed -> ~double power (2dp rounding -> 0.05 slack)
      expect(b.power_kW).toBeCloseTo(a.power_kW * 2, 1);
      const c = bridge.calculateCuttingForce("fusion-1045", 2, 0.1, 100, 20)!;
      // same force, double diameter -> ~double torque
      expect(c.torque_Nm).toBeCloseTo(a.torque_Nm * 2, 1);
    });

    it("PHYSICS INVARIANT: superalloy (S) force > aluminum (N) at identical geometry", () => {
      const s = bridge.calculateCuttingForce("fusion-ti6al4v", 2, 0.1, 60, 10)!;
      const n = bridge.calculateCuttingForce("fusion-6061", 2, 0.1, 60, 10)!;
      expect(s.force_N).toBeGreaterThan(n.force_N);
      // S kc1.1 (2800) vs P steel (1800) share mc=0.25, so specific-force ratio
      // is exactly the kc1.1 ratio (the fz^-mc term cancels). N group has mc=0.22
      // so it would NOT cancel — compare same-mc groups for a clean invariant.
      const p = bridge.calculateCuttingForce("fusion-1045", 2, 0.1, 60, 10)!;
      expect(s.specific_force_N_mm2 / p.specific_force_N_mm2).toBeCloseTo(2800 / 1800, 2);
    });
  });

  // ==========================================================================
  // HAPPY PATH — Taylor tool life
  // ==========================================================================
  describe("estimateToolLife (Taylor T = (C/Vc)^(1/n))", () => {
    it("computes reference life for AISI 1045 (C=350, n=0.25)", () => {
      // Vc = C -> T = 1^4 = 1.0 min
      const atC = bridge.estimateToolLife("fusion-1045", 350)!;
      expect(atC.life_min).toBeCloseTo(1.0, 4);
      // Vc = 200 -> (350/200)^4 = 1.75^4 = 9.3789 -> 9.4
      const at200 = bridge.estimateToolLife("fusion-1045", 200)!;
      expect(at200.life_min).toBeCloseTo(9.4, 4);
      // optimal speed for 60 min: C/60^0.25 = 350/2.78319 = 125.755 -> 125.8
      expect(at200.optimal_speed_for_60min_m_min).toBeCloseTo(125.8, 4);
      expect(at200.source).toContain("Taylor");
    });

    it("reverse target-life calculation is a self-consistent round trip", () => {
      // life_at_target_speed_min must return the input target (algebraic identity)
      const r = bridge.estimateToolLife("fusion-1045", 200, 30)!;
      expect(r.life_at_target_speed_min).toBeCloseTo(30.0, 4);
    });

    it("PHYSICS INVARIANT: aluminum outlasts superalloy at the same cutting speed", () => {
      // N: C=600 (long life) vs S: C=100 (short life), same Vc
      const al = bridge.estimateToolLife("fusion-6061", 80)!;
      const su = bridge.estimateToolLife("fusion-ti6al4v", 80)!;
      expect(al.life_min).toBeGreaterThan(su.life_min);
    });
  });

  // ==========================================================================
  // HAPPY PATH — Johnson-Cook flow stress
  // ==========================================================================
  describe("calculateFlowStress (Johnson-Cook)", () => {
    it("reduces to yield strength A at zero strain, reference rate, reference temp", () => {
      // AISI 1045: A=553. strain=0 -> B*0^n=0; eps_dot=1 -> ln(1)=0; T=Tr -> thermal=1
      const r = bridge.calculateFlowStress("fusion-1045", 0, 1, 293)!;
      expect(r.flow_stress_MPa).toBeCloseTo(553.0, 4);
    });

    it("computes the reference case with strain + rate + thermal softening", () => {
      // eps=0.2, eps_dot=1000, T=800K:
      //   strainTerm = 553 + 601*0.2^0.234        = 965.373
      //   rateTerm   = 1 + 0.0134*ln(1000)        = 1.092564
      //   thermalT   = 1 - ((800-293)/1500)^1.0   = 0.662
      //   sigma      = 965.373 * 1.092564 * 0.662 = 698.233 -> 698.2
      const r = bridge.calculateFlowStress("fusion-1045", 0.2, 1000, 800)!;
      expect(r.flow_stress_MPa).toBeCloseTo(698.2, 4);
      expect(r.strain).toBe(0.2);
      expect(r.temperature_K).toBe(800);
      expect(r.source).toContain("Johnson-Cook");
    });

    it("PHYSICS INVARIANT: flow stress falls to 0 at/above melting temperature", () => {
      // T=2000 > Tm(1793): T_star clamps to 1 -> thermal term = 1 - 1^m = 0
      const r = bridge.calculateFlowStress("fusion-1045", 0.1, 1, 2000)!;
      expect(r.flow_stress_MPa).toBe(0);
    });

    it("PHYSICS INVARIANT: higher strain rate raises flow stress (C > 0)", () => {
      const lo = bridge.calculateFlowStress("fusion-1045", 0.1, 1, 293)!;
      const hi = bridge.calculateFlowStress("fusion-1045", 0.1, 10000, 293)!;
      expect(hi.flow_stress_MPa).toBeGreaterThan(lo.flow_stress_MPa);
    });

    it("PHYSICS INVARIANT: higher temperature lowers flow stress (thermal softening)", () => {
      const cold = bridge.calculateFlowStress("fusion-1045", 0.1, 1, 400)!;
      const hot = bridge.calculateFlowStress("fusion-1045", 0.1, 1, 1000)!;
      expect(hot.flow_stress_MPa).toBeLessThan(cold.flow_stress_MPa);
    });
  });

  // ==========================================================================
  // LOOKUP GETTERS + STATS (happy path)
  // ==========================================================================
  describe("profile lookups + stats", () => {
    it("returns canonical Kienzle/Taylor/thermal constants for aluminum (N group)", () => {
      const k = bridge.getKienzleCoefficients("fusion-6061")!;
      expect(k.kc1_1).toBe(700);
      expect(k.mc).toBe(0.22);
      const t = bridge.getTaylorConstants("fusion-inconel718")!; // S group
      expect(t.C).toBe(100);
      expect(t.n).toBe(0.18);
      const th = bridge.getThermalProperties("fusion-6061")!;
      expect(th.thermal_conductivity_W_mK).toBe(170);
      expect(th.melting_point_K).toBe(933);
    });

    it("reports 19 profiles, 7 with Johnson-Cook, correct ISO histogram", () => {
      const s = bridge.getStats();
      expect(s.total_profiles).toBe(19);
      expect(s.with_johnson_cook).toBe(7);
      expect(s.by_iso_group).toEqual({ P: 4, M: 3, K: 2, N: 4, S: 3, H: 3 });
      // histogram must sum to total
      const sum = Object.values(s.by_iso_group).reduce((a, b) => a + b, 0);
      expect(sum).toBe(s.total_profiles);
      expect(bridge.listMaterials()).toHaveLength(19);
    });

    it("a fresh instance reproduces the same profile registry (deterministic init)", () => {
      const fresh = new FusionMaterialPhysicsBridge();
      expect(fresh.getStats()).toEqual(bridge.getStats());
    });
  });

  // ==========================================================================
  // FAILURE MODES (>=3) — unknown / unsupported inputs return null
  // ==========================================================================
  describe("failure modes", () => {
    it("returns null cutting force for an unknown Fusion material id", () => {
      expect(
        bridge.calculateCuttingForce("fusion-does-not-exist", 2, 0.1, 200, 10)
      ).toBeNull();
    });

    it("returns null tool life for an unknown Fusion material id", () => {
      expect(bridge.estimateToolLife("nope", 200)).toBeNull();
    });

    it("returns null flow stress when the material has NO Johnson-Cook data", () => {
      // fusion-1018 exists but was added without a jc_key -> johnson_cook undefined
      expect(bridge.getPhysicsProfile("fusion-1018")).not.toBeNull();
      expect(bridge.calculateFlowStress("fusion-1018", 0.2, 1000, 800)).toBeNull();
      // fusion-gray-iron (K) likewise has no JC params
      expect(bridge.calculateFlowStress("fusion-gray-iron", 0.2, 1000, 800)).toBeNull();
    });

    it("returns null from every getter for an unknown id", () => {
      expect(bridge.getPhysicsProfile("ghost")).toBeNull();
      expect(bridge.getKienzleCoefficients("ghost")).toBeNull();
      expect(bridge.getTaylorConstants("ghost")).toBeNull();
      expect(bridge.getThermalProperties("ghost")).toBeNull();
    });
  });

  // ==========================================================================
  // ADVERSARIAL INPUTS (>=2) — assert the GUARDED behavior (FIX: input validation).
  // The engine now rejects zero/negative/non-finite numeric inputs and returns
  // null (matching its unknown-material-id convention) instead of NaN/Infinity.
  // ==========================================================================
  describe("adversarial inputs (guarded)", () => {
    it("fz = 0 is rejected as invalid geometry -> null (FIX: input guard; was NaN force / Infinity specific-force)", () => {
      const r = bridge.calculateCuttingForce("fusion-1045", 2, 0, 200, 10);
      expect(r).toBeNull();
    });

    it("negative feed per tooth is rejected -> null (FIX: input guard; was NaN force)", () => {
      const r = bridge.calculateCuttingForce("fusion-1045", 2, -0.1, 200, 10);
      expect(r).toBeNull();
    });

    it("Vc = 0 is rejected -> null (FIX: input guard; was Infinite Taylor life)", () => {
      const r = bridge.estimateToolLife("fusion-1045", 0);
      expect(r).toBeNull();
    });

    it("negative strain is rejected -> null (FIX: input guard; was NaN flow stress)", () => {
      const r = bridge.calculateFlowStress("fusion-1045", -0.1, 1000, 800);
      expect(r).toBeNull();
    });

    it("strain rate below the reference rate is clamped (ratio floored at 1)", () => {
      // ratioEpsDot = max(eps_dot/eps_dot_0, 1); 0.001 and 1 both clamp to 1
      const slow = bridge.calculateFlowStress("fusion-1045", 0.1, 0.001, 293)!;
      const ref = bridge.calculateFlowStress("fusion-1045", 0.1, 1, 293)!;
      expect(slow.flow_stress_MPa).toBe(ref.flow_stress_MPa);
    });
  });
});
