/**
 * LatheSafetyPredicateEngine Tests — U-LSR22 (LATHE-HARDENED-MS0)
 *
 * Covers the five design axioms of the formal safety predicate:
 *   A1 Totality       — malformed signals → BLOCKED, never throws
 *   A2 NaN-safety     — non-finite physics → BLOCKED
 *   A3 Monotonicity   — random seeded fuzz, 200 cases
 *   A4 Determinism    — repeated calls return same status/clauses
 *   A5 Independence   — does not re-invoke physics engines (structural)
 *
 * Plus clause-by-clause positive checks (each single violation blocks alone)
 * and the emitter-friendly verifyOrThrow wrapper.
 */

import { describe, it, expect } from "vitest";
import {
  latheSafetyPredicateEngine,
  LatheSafetyPredicateEngine,
  SafetyPredicateViolation,
  PredicateResultSchema,
} from "../engines/LatheSafetyPredicateEngine.js";
import type { LatheSafetySignals } from "../engines/LatheSafetySignalEngine.js";
import { ACTIONS as camActions } from "../tools/dispatchers/camDispatcher.js";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function cleanSignals(overrides: Partial<LatheSafetySignals> = {}): LatheSafetySignals {
  const base: LatheSafetySignals = {
    program_id: "P-TEST-001",
    material_iso_group: "N",
    per_operation: [
      {
        op_number: 1,
        feature_id: "F1",
        tool_id: "T01",
        forces: {
          Fc_N: 250,
          Fr_N: 75,
          Fa_N: 50,
          resultant_N: 265.8,
          chip_thickness_mm: 0.15,
          chip_width_mm: 0.5,
          specific_cutting_force_N_mm2: 700,
        },
        power: {
          cutting_kW: 1.1,
          spindle_torque_Nm: 5.8,
          utilization_pct: 45.8,
          power_safe: true,
        },
        chatter: {
          computed: true,
          is_stable: true,
          current_depth_mm: 0.5,
          critical_depth_mm: 3.0,
          stability_margin_pct: 83,
          chatter_frequency_Hz: 1200,
          optimal_rpm: 4500,
          severity: "stable",
        },
        warnings: [],
      },
    ],
    grip: {
      required_gripping_force_N: 4500,
      centrifugal_force_N: 120,
      grip_loss_at_rpm_pct: 3,
      safety_factor: 2.35,
      max_safe_rpm: 3500,
      is_safe: false, // engine strict — predicate ignores this in favour of gate_block
      deformation_risk: "none",
      worst_spindle_rpm: 1800,
      gate_block: false,
      recommendations: [],
      worst_case_op_number: 1,
    },
    overall: {
      any_force_failure: false,
      any_power_failure: false,
      any_chatter_failure: false,
      any_chatter_unverified: false,
      grip_safe: true,
      worst_case_resultant_N: 265.8,
      worst_case_op_number: 1,
      warnings: [],
    },
    timestamp: "2026-04-24T18:00:00.000Z",
  };
  return { ...base, ...overrides };
}

// ---------------------------------------------------------------------------

describe("LatheSafetyPredicateEngine", () => {
  describe("Singleton + schema", () => {
    it("exports a singleton that is an instance of the class", () => {
      expect(latheSafetyPredicateEngine).toBeInstanceOf(LatheSafetyPredicateEngine);
    });

    it("PredicateResult conforms to exported schema with version 1.0.0", () => {
      const result = latheSafetyPredicateEngine.verify(cleanSignals());
      const parsed = PredicateResultSchema.safeParse(result);
      expect(parsed.success).toBe(true);
      expect(result.predicate_version).toBe("1.0.0");
      expect(result.program_id).toBe("P-TEST-001");
    });
  });

  describe("Happy path", () => {
    it("SAFE for clean signals + no envelope supplied", () => {
      const result = latheSafetyPredicateEngine.verify(cleanSignals());
      expect(result.status).toBe("SAFE");
      expect(result.blocking).toHaveLength(0);
      expect(result.downgrades).toHaveLength(0);
      expect(result.program_id).toBe("P-TEST-001");
    });

    it("SAFE for clean signals + within_envelope=true", () => {
      const result = latheSafetyPredicateEngine.verify(cleanSignals(), {
        within_envelope: true,
        max_x_mm: 150,
        max_z_mm: 300,
      });
      expect(result.status).toBe("SAFE");
      expect(result.blocking).toHaveLength(0);
    });

    it("ignores grip.is_safe=false when gate_block=false (U-LSR24 semantic)", () => {
      // Clean fixture has is_safe=false but gate_block=false — proves predicate
      // uses the composite gate, not the strict engine flag.
      const result = latheSafetyPredicateEngine.verify(cleanSignals());
      expect(result.status).toBe("SAFE");
    });
  });

  describe("Clause-by-clause blocking (single violation → BLOCKED)", () => {
    it("GRIP_BLOCKED when grip.gate_block=true", () => {
      const s = cleanSignals();
      s.grip.gate_block = true;
      s.grip.safety_factor = 1.6;
      s.grip.deformation_risk = "high";
      const r = latheSafetyPredicateEngine.verify(s);
      expect(r.status).toBe("BLOCKED");
      const clauses = r.blocking.map((b) => b.clause);
      expect(clauses).toContain("GRIP_BLOCKED");
      const grip = r.blocking.find((b) => b.clause === "GRIP_BLOCKED")!;
      expect(grip.field_path).toBe("grip.gate_block");
      expect(grip.detail).toContain("SF=1.60");
      expect(grip.detail).toContain("deformation=high");
    });

    it("FORCE_FAILURE when overall.any_force_failure=true", () => {
      const s = cleanSignals();
      s.overall.any_force_failure = true;
      s.overall.worst_case_resultant_N = 9999;
      const r = latheSafetyPredicateEngine.verify(s);
      expect(r.status).toBe("BLOCKED");
      const force = r.blocking.find((b) => b.clause === "FORCE_FAILURE")!;
      expect(force.field_path).toBe("overall.any_force_failure");
      expect(force.detail).toContain("9999");
    });

    it("POWER_FAILURE when overall.any_power_failure=true", () => {
      const s = cleanSignals();
      s.overall.any_power_failure = true;
      const r = latheSafetyPredicateEngine.verify(s);
      expect(r.status).toBe("BLOCKED");
      const power = r.blocking.find((b) => b.clause === "POWER_FAILURE")!;
      expect(power.field_path).toBe("overall.any_power_failure");
      expect(power.detail).toContain("power budget");
    });

    it("CHATTER_FAILURE when overall.any_chatter_failure=true", () => {
      const s = cleanSignals();
      s.overall.any_chatter_failure = true;
      const r = latheSafetyPredicateEngine.verify(s);
      expect(r.status).toBe("BLOCKED");
      const chatter = r.blocking.find((b) => b.clause === "CHATTER_FAILURE")!;
      expect(chatter.field_path).toBe("overall.any_chatter_failure");
      expect(chatter.detail).toContain("critical_depth");
    });

    it("ENVELOPE_VIOLATED when envelope.within_envelope=false (with bounds)", () => {
      const r = latheSafetyPredicateEngine.verify(cleanSignals(), {
        within_envelope: false,
        max_x_mm: 1,
        max_z_mm: 1,
        min_x_mm: 0,
        min_z_mm: 0,
      });
      expect(r.status).toBe("BLOCKED");
      const env = r.blocking.find((b) => b.clause === "ENVELOPE_VIOLATED")!;
      expect(env.field_path).toBe("envelope.within_envelope");
      expect(env.detail).toBe("X[0.0..1.0] mm, Z[0.0..1.0] mm");
    });

    it("CHATTER_UNVERIFIED downgrades SAFE → UNVERIFIED (not BLOCKED)", () => {
      const s = cleanSignals();
      s.overall.any_chatter_unverified = true;
      const r = latheSafetyPredicateEngine.verify(s);
      expect(r.status).toBe("UNVERIFIED");
      expect(r.blocking).toHaveLength(0);
      expect(r.downgrades).toHaveLength(1);
      expect(r.downgrades[0].clause).toBe("CHATTER_UNVERIFIED");
      expect(r.downgrades[0].field_path).toBe("overall.any_chatter_unverified");
    });

    it("CHATTER_UNVERIFIED reported alongside BLOCKED when a hard block is present", () => {
      const s = cleanSignals();
      s.overall.any_chatter_unverified = true;
      s.overall.any_force_failure = true;
      const r = latheSafetyPredicateEngine.verify(s);
      expect(r.status).toBe("BLOCKED");
      expect(r.blocking.map((b) => b.clause)).toContain("FORCE_FAILURE");
      expect(r.downgrades.map((d) => d.clause)).toContain("CHATTER_UNVERIFIED");
    });
  });

  describe("A2 NaN-safety — non-finite physics → BLOCKED", () => {
    it("NaN in worst_case_resultant_N blocks with NAN_IN_SIGNAL clause", () => {
      const s = cleanSignals();
      s.overall.worst_case_resultant_N = NaN;
      const r = latheSafetyPredicateEngine.verify(s);
      expect(r.status).toBe("BLOCKED");
      const nan = r.blocking.find((b) => b.clause === "NAN_IN_SIGNAL")!;
      expect(nan.field_path).toBe("overall.worst_case_resultant_N");
      expect(nan.detail).toContain("NaN");
    });

    it("+Infinity in grip.safety_factor blocks and names field path", () => {
      const s = cleanSignals();
      s.grip.safety_factor = Infinity;
      const r = latheSafetyPredicateEngine.verify(s);
      expect(r.status).toBe("BLOCKED");
      const nan = r.blocking.find((b) => b.clause === "NAN_IN_SIGNAL")!;
      expect(nan.field_path).toBe("grip.safety_factor");
      expect(nan.detail).toContain("+Inf");
    });

    it("NaN in per_operation forces blocks with indexed field path", () => {
      const s = cleanSignals();
      s.per_operation[0].forces.resultant_N = NaN;
      const r = latheSafetyPredicateEngine.verify(s);
      expect(r.status).toBe("BLOCKED");
      const nan = r.blocking.find((b) => b.clause === "NAN_IN_SIGNAL")!;
      expect(nan.field_path).toBe("per_operation[0].forces.resultant_N");
    });

    it("-Infinity in cutting_kW blocks with -Inf detail", () => {
      const s = cleanSignals();
      s.per_operation[0].power.cutting_kW = -Infinity;
      const r = latheSafetyPredicateEngine.verify(s);
      expect(r.status).toBe("BLOCKED");
      const nan = r.blocking.find((b) => b.clause === "NAN_IN_SIGNAL")!;
      expect(nan.field_path).toBe("per_operation[0].power.cutting_kW");
      expect(nan.detail).toContain("-Inf");
    });

    it("NaN in chatter.stability_margin_pct blocks when computed=true", () => {
      const s = cleanSignals();
      const ch = s.per_operation[0].chatter;
      if (ch.computed === true) {
        ch.stability_margin_pct = NaN;
      }
      const r = latheSafetyPredicateEngine.verify(s);
      expect(r.status).toBe("BLOCKED");
      const nan = r.blocking.find((b) => b.clause === "NAN_IN_SIGNAL")!;
      expect(nan.field_path).toBe("per_operation[0].chatter.stability_margin_pct");
    });
  });

  describe("A1 Totality — malformed input never throws", () => {
    it("null signals → BLOCKED with SCHEMA_INVALID (no throw)", () => {
      const r = latheSafetyPredicateEngine.verify(null as unknown as LatheSafetySignals);
      expect(r.status).toBe("BLOCKED");
      expect(r.blocking).toHaveLength(1);
      expect(r.blocking[0].clause).toBe("SCHEMA_INVALID");
      expect(r.program_id).toBe("unknown");
    });

    it("partial signals → BLOCKED with SCHEMA_INVALID, retains program_id when typable", () => {
      const r = latheSafetyPredicateEngine.verify({
        program_id: "partial-42",
      } as unknown as LatheSafetySignals);
      expect(r.status).toBe("BLOCKED");
      expect(r.blocking[0].clause).toBe("SCHEMA_INVALID");
      expect(r.program_id).toBe("partial-42");
    });

    it("undefined signals → BLOCKED, does not throw", () => {
      const r = latheSafetyPredicateEngine.verify(undefined as unknown as LatheSafetySignals);
      expect(r.status).toBe("BLOCKED");
      expect(r.blocking[0].clause).toBe("SCHEMA_INVALID");
    });
  });

  describe("A4 Determinism", () => {
    it("same input → same status + same clause set", () => {
      const s = cleanSignals();
      s.grip.gate_block = true;
      s.overall.any_force_failure = true;
      const a = latheSafetyPredicateEngine.verify(s);
      const b = latheSafetyPredicateEngine.verify(s);
      expect(a.status).toBe(b.status);
      expect(a.blocking.map((x) => x.clause).sort()).toEqual(
        b.blocking.map((x) => x.clause).sort(),
      );
      expect(a.downgrades.map((x) => x.clause).sort()).toEqual(
        b.downgrades.map((x) => x.clause).sort(),
      );
    });
  });

  describe("A3 Monotonicity — seeded fuzz", () => {
    // Deterministic LCG so any failure is reproducible from the seed.
    function makeRng(seed: number): () => number {
      let x = seed >>> 0;
      return () => {
        x = (x * 1103515245 + 12345) >>> 0;
        return x / 0x100000000;
      };
    }

    it("worsening grip.gate_block (false→true) never keeps SAFE over 50 cases", () => {
      const rng = makeRng(42);
      for (let i = 0; i < 50; i++) {
        const s = cleanSignals();
        s.overall.worst_case_resultant_N = rng() * 500;
        s.per_operation[0].forces.resultant_N = rng() * 500;
        const before = latheSafetyPredicateEngine.verify(s);
        expect(before.status).toBe("SAFE");

        const weakened = cleanSignals();
        weakened.overall.worst_case_resultant_N = s.overall.worst_case_resultant_N;
        weakened.per_operation[0].forces.resultant_N = s.per_operation[0].forces.resultant_N;
        weakened.grip.gate_block = true;
        weakened.grip.safety_factor = 1.2;
        const after = latheSafetyPredicateEngine.verify(weakened);
        expect(after.status).toBe("BLOCKED");
        expect(latheSafetyPredicateEngine.isMonotonicWeakening(before, after)).toBe(true);
      }
    });

    it("adding any subset of violations produces a monotonic weakening", () => {
      const rng = makeRng(7);
      const weakenings: Array<(x: LatheSafetySignals) => void> = [
        (x) => { x.overall.any_force_failure = true; },
        (x) => { x.overall.any_power_failure = true; },
        (x) => { x.overall.any_chatter_failure = true; },
        (x) => { x.grip.gate_block = true; },
      ];
      let checked = 0;
      for (let i = 0; i < 60; i++) {
        const before = latheSafetyPredicateEngine.verify(cleanSignals());
        expect(before.status).toBe("SAFE");
        const picks = weakenings.filter(() => rng() > 0.5);
        if (picks.length === 0) continue;
        const worsened = cleanSignals();
        picks.forEach((mut) => mut(worsened));
        const after = latheSafetyPredicateEngine.verify(worsened);
        expect(after.status).toBe("BLOCKED");
        expect(after.blocking.length).toBeGreaterThanOrEqual(picks.length);
        expect(latheSafetyPredicateEngine.isMonotonicWeakening(before, after)).toBe(true);
        checked++;
      }
      expect(checked).toBeGreaterThan(20);
    });

    it("isMonotonicWeakening rejects clause disappearance (before BLOCKED, after SAFE)", () => {
      const s = cleanSignals();
      s.grip.gate_block = true;
      const before = latheSafetyPredicateEngine.verify(s);
      const after = latheSafetyPredicateEngine.verify(cleanSignals());
      expect(before.status).toBe("BLOCKED");
      expect(after.status).toBe("SAFE");
      expect(latheSafetyPredicateEngine.isMonotonicWeakening(before, after)).toBe(false);
    });

    it("isMonotonicWeakening rejects a strictly-fewer-blocking-clauses after", () => {
      const s1 = cleanSignals();
      s1.grip.gate_block = true;
      s1.overall.any_force_failure = true;
      const before = latheSafetyPredicateEngine.verify(s1);

      const s2 = cleanSignals();
      s2.grip.gate_block = true; // dropped the force failure
      const after = latheSafetyPredicateEngine.verify(s2);

      expect(before.blocking.length).toBeGreaterThan(after.blocking.length);
      expect(latheSafetyPredicateEngine.isMonotonicWeakening(before, after)).toBe(false);
    });
  });

  describe("verifyOrThrow", () => {
    it("returns the SAFE result without throwing", () => {
      const r = latheSafetyPredicateEngine.verifyOrThrow(cleanSignals());
      expect(r.status).toBe("SAFE");
      expect(r.blocking).toHaveLength(0);
    });

    it("returns UNVERIFIED without throwing (downgrade-only)", () => {
      const s = cleanSignals();
      s.overall.any_chatter_unverified = true;
      const r = latheSafetyPredicateEngine.verifyOrThrow(s);
      expect(r.status).toBe("UNVERIFIED");
      expect(r.blocking).toHaveLength(0);
      expect(r.downgrades[0].clause).toBe("CHATTER_UNVERIFIED");
    });

    it("throws SafetyPredicateViolation on BLOCKED with populated blocking clauses", () => {
      const s = cleanSignals();
      s.grip.gate_block = true;
      let caught: unknown = null;
      try {
        latheSafetyPredicateEngine.verifyOrThrow(s);
      } catch (e) {
        caught = e;
      }
      expect(caught).toBeInstanceOf(SafetyPredicateViolation);
      const err = caught as SafetyPredicateViolation;
      expect(err.code).toBe("SAFETY_PREDICATE_VIOLATED");
      expect(err.program_id).toBe("P-TEST-001");
      expect(err.blocking.some((b) => b.clause === "GRIP_BLOCKED")).toBe(true);
      expect(err.message).toContain("SAFETY_PREDICATE_VIOLATED");
      expect(err.message).toContain("P-TEST-001");
      expect(err.message).toContain("GRIP_BLOCKED");
    });
  });

  describe("Envelope detail formatting", () => {
    it("formats X/Z bounds when all supplied", () => {
      const r = latheSafetyPredicateEngine.verify(cleanSignals(), {
        within_envelope: false,
        max_x_mm: 250.5,
        max_z_mm: 400,
        min_x_mm: -5,
        min_z_mm: 0,
      });
      const clause = r.blocking.find((b) => b.clause === "ENVELOPE_VIOLATED")!;
      expect(clause.detail).toBe("X[-5.0..250.5] mm, Z[0.0..400.0] mm");
    });

    it("reports 'not disclosed' when max bounds absent", () => {
      const r = latheSafetyPredicateEngine.verify(cleanSignals(), { within_envelope: false });
      const clause = r.blocking.find((b) => b.clause === "ENVELOPE_VIOLATED")!;
      expect(clause.detail).toBe("within_envelope=false (bounds not disclosed)");
    });

    it("min bounds default to 0.0 when only max supplied", () => {
      const r = latheSafetyPredicateEngine.verify(cleanSignals(), {
        within_envelope: false,
        max_x_mm: 100,
        max_z_mm: 200,
      });
      const clause = r.blocking.find((b) => b.clause === "ENVELOPE_VIOLATED")!;
      expect(clause.detail).toBe("X[0.0..100.0] mm, Z[0.0..200.0] mm");
    });
  });

  describe("Dispatcher Integration", () => {
    it("ACTIONS contains lathe_safety_predicate_verify", () => {
      expect(camActions).toContain("lathe_safety_predicate_verify");
    });

    it("ACTIONS contains lathe_safety_predicate_verify_or_throw", () => {
      expect(camActions).toContain("lathe_safety_predicate_verify_or_throw");
    });
  });
});
