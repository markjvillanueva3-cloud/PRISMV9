import { describe, it, expect } from "vitest";
import {
  millSafetyPredicateEngine as eng,
  MillSafetyPredicateViolation,
  type MillSafetyPredicateInput,
} from "../engines/MillSafetyPredicateEngine.js";

function safeInput(o: Partial<MillSafetyPredicateInput["signals"]> = {}): MillSafetyPredicateInput {
  return {
    program_id: "P-12345",
    signals: {
      grip_safety_factor: 2.0,
      cutting_force_n: 500,
      spindle_power_kw: 5,
      chatter_score: 0.2,
      tool_deflection_mm: 0.005,
      tolerance_band_mm: 0.05,
      tool_temp_c: 400,
      tool_max_temp_c: 800,
      block_count: 100,
      ...o,
    },
    envelope: {
      within_envelope: true,
      max_force_n: 5000,
      rated_kw: 15,
    },
  };
}

describe("MillSafetyPredicateEngine", () => {
  it("getStats lists 11 clauses + 5 axioms + version", () => {
    const s = eng.getStats();
    expect(s.clauses.length).toBe(11);
    expect(s.axioms).toEqual([
      "A1 Totality", "A2 NaN-safety", "A3 Monotonicity", "A4 Determinism", "A5 Independence",
    ]);
    expect(s.predicate_version).toBe("1.0.0");
  });

  it("nominal safe input → SAFE verdict, no blocking, no downgrades", () => {
    const r = eng.verify(safeInput());
    expect(r.status).toBe("SAFE");
    expect(r.blocking).toEqual([]);
    expect(r.downgrades).toEqual([]);
    expect(r.program_id).toBe("P-12345");
    expect(r.predicate_version).toBe("1.0.0");
  });

  it("invalid input (not an object) → BLOCKED with SCHEMA_INVALID", () => {
    const r = eng.verify(null as never);
    expect(r.status).toBe("BLOCKED");
    expect(r.blocking[0].clause).toBe("SCHEMA_INVALID");
  });

  it("missing signals object → BLOCKED with SCHEMA_INVALID", () => {
    const r = eng.verify({ program_id: "P", signals: undefined } as never);
    expect(r.status).toBe("BLOCKED");
    expect(r.blocking[0].clause).toBe("SCHEMA_INVALID");
  });

  it("NaN cutting_force → BLOCKED with NAN_IN_SIGNAL clause", () => {
    const r = eng.verify(safeInput({ cutting_force_n: NaN }));
    expect(r.status).toBe("BLOCKED");
    expect(r.blocking.some(c => c.clause === "NAN_IN_SIGNAL" && c.field_path === "signals.cutting_force_n")).toBe(true);
  });

  it("Infinity spindle_power → BLOCKED with NAN_IN_SIGNAL", () => {
    const r = eng.verify(safeInput({ spindle_power_kw: Infinity }));
    expect(r.status).toBe("BLOCKED");
    expect(r.blocking.some(c => c.clause === "NAN_IN_SIGNAL")).toBe(true);
  });

  it("block_count 0 → BLOCKED with EMPTY_PROGRAM", () => {
    const r = eng.verify(safeInput({ block_count: 0 }));
    expect(r.status).toBe("BLOCKED");
    expect(r.blocking.some(c => c.clause === "EMPTY_PROGRAM")).toBe(true);
  });

  it("grip_safety_factor 0.5 (<1.0) → BLOCKED with WORKHOLDING_BLOCKED", () => {
    const r = eng.verify(safeInput({ grip_safety_factor: 0.5 }));
    expect(r.status).toBe("BLOCKED");
    expect(r.blocking.some(c => c.clause === "WORKHOLDING_BLOCKED")).toBe(true);
  });

  it("cutting_force > envelope.max_force → FORCE_FAILURE", () => {
    const r = eng.verify(safeInput({ cutting_force_n: 6000 }));
    expect(r.status).toBe("BLOCKED");
    expect(r.blocking.some(c => c.clause === "FORCE_FAILURE")).toBe(true);
  });

  it("spindle_power > envelope.rated_kw → POWER_FAILURE", () => {
    const r = eng.verify(safeInput({ spindle_power_kw: 20 }));
    expect(r.status).toBe("BLOCKED");
    expect(r.blocking.some(c => c.clause === "POWER_FAILURE")).toBe(true);
  });

  it("chatter_score > 0.7 → BLOCKED with CHATTER_FAILURE", () => {
    const r = eng.verify(safeInput({ chatter_score: 0.8 }));
    expect(r.status).toBe("BLOCKED");
    expect(r.blocking.some(c => c.clause === "CHATTER_FAILURE")).toBe(true);
  });

  it("chatter_score in [0.5, 0.7] → UNVERIFIED with CHATTER_UNVERIFIED downgrade", () => {
    const r = eng.verify(safeInput({ chatter_score: 0.6 }));
    expect(r.status).toBe("UNVERIFIED");
    expect(r.blocking).toEqual([]);
    expect(r.downgrades.some(d => d.clause === "CHATTER_UNVERIFIED")).toBe(true);
  });

  it("chatter_score < 0.5 → no chatter clause fires (SAFE)", () => {
    const r = eng.verify(safeInput({ chatter_score: 0.4 }));
    expect(r.status).toBe("SAFE");
    expect(r.downgrades.some(d => d.clause === "CHATTER_UNVERIFIED")).toBe(false);
  });

  it("tool_deflection > tolerance/2 → DEFLECTION_FAILURE", () => {
    const r = eng.verify(safeInput({ tool_deflection_mm: 0.03, tolerance_band_mm: 0.05 })); // 0.03 > 0.025
    expect(r.status).toBe("BLOCKED");
    expect(r.blocking.some(c => c.clause === "DEFLECTION_FAILURE")).toBe(true);
  });

  it("tool_temp > tool_max_temp → THERMAL_RUNAWAY", () => {
    const r = eng.verify(safeInput({ tool_temp_c: 900, tool_max_temp_c: 800 }));
    expect(r.status).toBe("BLOCKED");
    expect(r.blocking.some(c => c.clause === "THERMAL_RUNAWAY")).toBe(true);
  });

  it("envelope.within_envelope=false → ENVELOPE_VIOLATED with detail citing violations count", () => {
    const input = safeInput();
    input.envelope!.within_envelope = false;
    input.envelope!.axis_xyz_violations = 3;
    const r = eng.verify(input);
    expect(r.status).toBe("BLOCKED");
    expect(r.blocking.some(c => c.clause === "ENVELOPE_VIOLATED" && /violations: 3/.test(c.detail))).toBe(true);
  });

  it("multiple violations accumulate in blocking array", () => {
    const r = eng.verify(safeInput({ grip_safety_factor: 0.5, cutting_force_n: 6000, chatter_score: 0.9 }));
    expect(r.status).toBe("BLOCKED");
    expect(r.blocking.length).toBeGreaterThanOrEqual(3);
    expect(r.blocking.map(c => c.clause)).toEqual(expect.arrayContaining(["WORKHOLDING_BLOCKED", "FORCE_FAILURE", "CHATTER_FAILURE"]));
  });

  it("verifyOrThrow throws MillSafetyPredicateViolation when BLOCKED", () => {
    expect(() => eng.verifyOrThrow(safeInput({ grip_safety_factor: 0.5 })))
      .toThrow(MillSafetyPredicateViolation);
  });

  it("verifyOrThrow returns result when SAFE (no throw)", () => {
    const r = eng.verifyOrThrow(safeInput());
    expect(r.status).toBe("SAFE");
  });

  it("verifyOrThrow returns UNVERIFIED without throwing (only BLOCKED throws)", () => {
    const r = eng.verifyOrThrow(safeInput({ chatter_score: 0.6 }));
    expect(r.status).toBe("UNVERIFIED");
  });

  it("MillSafetyPredicateViolation carries blocking array + code", () => {
    try {
      eng.verifyOrThrow(safeInput({ grip_safety_factor: 0.5 }));
      throw new Error("should have thrown");
    } catch (err) {
      if (!(err instanceof MillSafetyPredicateViolation)) throw new Error("Wrong error type");
      expect(err.code).toBe("MILL_SAFETY_PREDICATE_VIOLATED");
      expect(err.blocking.length).toBeGreaterThan(0);
      expect(err.blocking[0].clause).toBe("WORKHOLDING_BLOCKED");
    }
  });

  it("isMonotonicWeakening: SAFE before + force-exceeded after → axiom holds (true)", () => {
    const before = safeInput();
    const after = safeInput({ cutting_force_n: 6000 });
    expect(eng.isMonotonicWeakening(before, after)).toBe(true);
  });

  it("isMonotonicWeakening: non-SAFE before → vacuously true (axiom not applicable)", () => {
    const before = safeInput({ grip_safety_factor: 0.5 });
    const after = safeInput({ grip_safety_factor: 0.5 });
    expect(eng.isMonotonicWeakening(before, after)).toBe(true);
  });

  it("determinism (A4): same input twice → identical status, blocking, downgrades", () => {
    const input = safeInput({ chatter_score: 0.6 });
    const r1 = eng.verify(input);
    const r2 = eng.verify(input);
    expect(r1.status).toBe(r2.status);
    expect(r1.blocking).toEqual(r2.blocking);
    expect(r1.downgrades).toEqual(r2.downgrades);
  });

  it("totality (A1): never throws on well-typed input even with garbage signals", () => {
    expect(() => eng.verify(safeInput({ cutting_force_n: -1e30 }))).not.toThrow();
    expect(() => eng.verify(safeInput({ chatter_score: -100 }))).not.toThrow();
  });

  it("predicate_version is fixed at 1.0.0 in every result (audit invariant)", () => {
    const r = eng.verify(safeInput());
    expect(r.predicate_version).toBe("1.0.0");
  });

  it("evaluated_at is ISO timestamp", () => {
    const r = eng.verify(safeInput());
    expect(r.evaluated_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });
});
