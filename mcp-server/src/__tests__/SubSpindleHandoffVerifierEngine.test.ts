import { describe, it, expect } from "vitest";
import {
  subSpindleHandoffVerifierEngine as eng,
  SubSpindleHandoffVerifierEngine,
  type SubSpindleHandoffInput,
} from "../engines/SubSpindleHandoffVerifierEngine.js";

function nominal(o: Partial<SubSpindleHandoffInput> = {}): SubSpindleHandoffInput {
  return {
    phase_sync_error_deg: 0.1,
    face_contact_gap_mm: 0.02,
    sub_grip_force_n: 8000,
    required_grip_force_n: 5000,
    transfer_overlap_ms: 0,
    c_axis_indexed: true,
    z_clearance_mm: 30,
    ...o,
  };
}

describe("SubSpindleHandoffVerifierEngine", () => {
  it("exports singleton with verify()", () => {
    expect(eng).toBeInstanceOf(SubSpindleHandoffVerifierEngine);
    expect(typeof eng.verify).toBe("function");
  });

  it("throws on missing phase or face fields", () => {
    expect(() => eng.verify({} as SubSpindleHandoffInput)).toThrow(/phase_sync_error_deg \+ face_contact_gap_mm required/);
  });

  it("throws on missing grip fields", () => {
    expect(() => eng.verify({ phase_sync_error_deg: 0, face_contact_gap_mm: 0 } as SubSpindleHandoffInput))
      .toThrow(/sub_grip_force_n \+ required_grip_force_n required/);
  });

  it("throws on negative face gap", () => {
    expect(() => eng.verify(nominal({ face_contact_gap_mm: -0.01 }))).toThrow(/face_contact_gap_mm must be non-negative/);
  });

  it("throws on non-positive required grip", () => {
    expect(() => eng.verify(nominal({ required_grip_force_n: 0 }))).toThrow(/positive required_grip_force_n/);
  });

  it("all-pass nominal → verified", () => {
    const r = eng.verify(nominal());
    expect(r.verdict).toBe("verified");
    expect(r.failure_reasons).toEqual([]);
    Object.values(r.checks).forEach(c => {
      // each check has pass:true
      expect((c as { pass: boolean }).pass).toBe(true);
    });
  });

  it("phase sync error > tolerance → rejected", () => {
    const r = eng.verify(nominal({ phase_sync_error_deg: 1.5 }));
    expect(r.verdict).toBe("rejected");
    expect(r.checks.phase_sync.pass).toBe(false);
    expect(r.failure_reasons.some(f => /Phase sync.*tolerance/.test(f))).toBe(true);
  });

  it("face gap > max → rejected", () => {
    const r = eng.verify(nominal({ face_contact_gap_mm: 0.10 }));
    expect(r.verdict).toBe("rejected");
    expect(r.checks.face_contact.pass).toBe(false);
    expect(r.failure_reasons.some(f => /Face gap.*touch-probe/.test(f))).toBe(true);
  });

  it("grip < required → rejected (workpiece slip)", () => {
    const r = eng.verify(nominal({ sub_grip_force_n: 3000 }));
    expect(r.verdict).toBe("rejected");
    expect(r.checks.grip_pressure.pass).toBe(false);
    expect(r.failure_reasons.some(f => /grip.*workpiece will slip/.test(f))).toBe(true);
  });

  it("grip safety margin < 25% → marginal verdict", () => {
    // 5500N actual / 5000N required = 10% margin
    const r = eng.verify(nominal({ sub_grip_force_n: 5500 }));
    expect(r.verdict).toBe("marginal");
    expect(r.checks.grip_pressure.pass).toBe(true);
    expect(r.warnings.some(w => /safety margin.*25%/.test(w))).toBe(true);
  });

  it("transfer overlap > 0 → UNSAFE (catastrophic)", () => {
    const r = eng.verify(nominal({ transfer_overlap_ms: 50 }));
    expect(r.verdict).toBe("unsafe");
    expect(r.checks.transfer_window.pass).toBe(false);
    expect(r.failure_reasons.some(f => /Transfer overlap.*both spindles simultaneously/.test(f))).toBe(true);
  });

  it("transfer overlap unsafe wins even over other failures", () => {
    const r = eng.verify(nominal({
      transfer_overlap_ms: 100,
      sub_grip_force_n: 1000,  // also rejected
      phase_sync_error_deg: 5,  // also rejected
    }));
    expect(r.verdict).toBe("unsafe");  // overlap dominates
  });

  it("c_axis_indexed=false → rejected (Op2 features mis-orient)", () => {
    const r = eng.verify(nominal({ c_axis_indexed: false }));
    expect(r.verdict).toBe("rejected");
    expect(r.checks.c_axis_indexed.pass).toBe(false);
    expect(r.failure_reasons.some(f => /C-axis not re-indexed/.test(f))).toBe(true);
  });

  it("Z-clearance < required → rejected (collision risk)", () => {
    const r = eng.verify(nominal({ z_clearance_mm: 10 }));  // < default 20
    expect(r.verdict).toBe("rejected");
    expect(r.checks.z_clearance.pass).toBe(false);
    expect(r.failure_reasons.some(f => /Z-clearance.*collision/.test(f))).toBe(true);
  });

  it("custom phase tolerance overrides default", () => {
    // 0.7° fails at default 0.5° but passes at 1.0°
    const tight = eng.verify(nominal({ phase_sync_error_deg: 0.7 }));
    expect(tight.checks.phase_sync.pass).toBe(false);

    const loose = eng.verify(nominal({ phase_sync_error_deg: 0.7, phase_tolerance_deg: 1.0 }));
    expect(loose.checks.phase_sync.pass).toBe(true);
  });

  it("custom max_face_gap overrides default", () => {
    const tight = eng.verify(nominal({ face_contact_gap_mm: 0.08 }));  // > default 0.05
    expect(tight.checks.face_contact.pass).toBe(false);

    const loose = eng.verify(nominal({ face_contact_gap_mm: 0.08, max_face_gap_mm: 0.10 }));
    expect(loose.checks.face_contact.pass).toBe(true);
  });

  it("custom required_z_clearance overrides default", () => {
    const r = eng.verify(nominal({ z_clearance_mm: 50, required_z_clearance_mm: 100 }));
    expect(r.checks.z_clearance.pass).toBe(false);
  });

  it("safety margin reported correctly", () => {
    // 8000 actual / 5000 required = 60% margin
    const r = eng.verify(nominal({ sub_grip_force_n: 8000, required_grip_force_n: 5000 }));
    expect(r.checks.grip_pressure.safety_margin_pct).toBe(60);
  });

  it("multiple non-overlap failures accumulate in failure_reasons", () => {
    const r = eng.verify(nominal({
      phase_sync_error_deg: 2.0,
      face_contact_gap_mm: 0.2,
      sub_grip_force_n: 1000,
    }));
    expect(r.verdict).toBe("rejected");
    expect(r.failure_reasons.length).toBeGreaterThanOrEqual(3);
  });

  it("source cites Okuma + Mazak + Doosan + Nakamura", () => {
    const r = eng.verify(nominal());
    expect(r.source).toMatch(/Okuma|Mazak|Doosan|Nakamura/);
  });
});
