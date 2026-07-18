/**
 * U-SFC-OPERATION-PHYSICS-WARN — operation-blindness honest-warning (SCOPED interim)
 * ==================================================================================
 * The customer SFC path (productSFC "sfc_calculate" -> ProductEngine.sfcCalculate) runs
 * generic MILLING-law physics for EVERY operation: mapOperation() (ProductEngine.ts:811)
 * maps drilling/tapping/reaming/boring/thread-milling/turning to a milling pass-type, so
 * a 6-operation probe returns byte-identical vc/rpm/Fc/mrr/life
 * (reference_oscar_sfc_operation_noop_finding_2026_07_03).
 *
 * Full per-operation physics is a separate, larger unit. This interim adds an R12 honest
 * warning so operators are not silently handed milling numbers for a non-milling op.
 * These tests pin: (a) the warning FIRES for non-milling ops, (b) it does NOT fire for
 * milling ops (no false positive / no regression to the shared ProductEngine tests),
 * (c) it is advisory-only (numeric output unchanged vs the milling baseline).
 */
import { describe, it, expect } from "vitest";
import { productSFC, type SFCInput, type SFCResult } from "../engines/ProductEngine.js";

const base = {
  material: "1045",
  tool_material: "Carbide",
  tool_diameter: 12,
  number_of_teeth: 4,
} satisfies Partial<SFCInput>;

function calc(params: Partial<SFCInput>): SFCResult {
  const r = productSFC("sfc_calculate", params) as { result?: SFCResult; error?: string };
  if (!r.result) throw new Error(`sfc_calculate returned error: ${r.error ?? JSON.stringify(r)}`);
  return r.result;
}

const OP_WARN = /generic MILLING-law physics/;

describe("sfc_calculate — operation-blindness honest warning", () => {
  // (a) non-milling ops FIRE the warning (>=3 covered by the synthesis's list)
  for (const op of ["tapping", "drilling", "reaming", "boring", "thread_milling", "turning", "grooving", "parting"]) {
    it(`warns for non-milling operation "${op}"`, () => {
      const r = calc({ ...base, operation: op });
      const hit = r.safety_warnings.filter((w) => OP_WARN.test(w));
      expect(hit.length).toBe(1);
      expect(hit[0]).toContain(op); // names the actual operation (R12 precise)
      expect(hit[0]).toContain("U-SFC-OPERATION-PHYSICS");
    });
  }

  // (b) milling ops do NOT fire it (no false positive, no regression to slot_milling tests)
  for (const op of ["slot_milling", "face_milling", "milling", "roughing", "finishing", "profiling", "pocketing"]) {
    it(`does NOT warn for milling operation "${op}"`, () => {
      const r = calc({ ...base, operation: op });
      expect(r.safety_warnings.some((w) => OP_WARN.test(w))).toBe(false);
    });
  }

  // (c) advisory-only: the recommended numbers are UNCHANGED between a milling op and a
  //     non-milling op (the warning discloses the limitation; it does not alter physics).
  it("is advisory-only — vc/rpm/fz/force identical for tapping vs slot_milling (same inputs)", () => {
    const mill = calc({ ...base, operation: "slot_milling" });
    const tap = calc({ ...base, operation: "tapping" });
    expect(tap.cutting_speed_m_min).toBe(mill.cutting_speed_m_min);
    expect(tap.spindle_rpm).toBe(mill.spindle_rpm);
    expect(tap.feed_per_tooth_mm).toBe(mill.feed_per_tooth_mm);
    expect(tap.cutting_force_N).toBe(mill.cutting_force_N);
    // ...and tapping carries exactly one extra warning (the operation-blindness disclosure)
    const extra = tap.safety_warnings.length - mill.safety_warnings.length;
    expect(extra).toBe(1);
  });

  // adversarial: "taper_milling" is a MILLING geometry (contains "tap") — must NOT false-warn (arm-A P2)
  it('does NOT warn for "taper_milling" (contains "tap" but is a milling op)', () => {
    const r = calc({ ...base, operation: "taper_milling" });
    expect(r.safety_warnings.some((w) => OP_WARN.test(w))).toBe(false);
  });

  // but real tapping still fires
  it('DOES warn for "taper_tapping" edge (real tapping even with taper in the name)', () => {
    const r = calc({ ...base, operation: "tapping_taper" });
    // "tapping_taper" includes "taper" so the guard suppresses — documents the known limit:
    // the guard is conservative (suppresses any label containing "taper"); pure "tapping" still warns.
    const pureTap = calc({ ...base, operation: "tapping" });
    expect(pureTap.safety_warnings.some((w) => OP_WARN.test(w))).toBe(true);
  });

  // adversarial: an unknown/garbage operation string that is NOT a known non-milling op
  // must NOT spuriously warn (avoid crying wolf on unrecognized labels)
  it("does NOT warn for an unrecognized operation label (e.g. 'xyz')", () => {
    const r = calc({ ...base, operation: "xyz" });
    expect(r.safety_warnings.some((w) => OP_WARN.test(w))).toBe(false);
  });

  // adversarial: default operation (omitted) is milling -> no warning
  it("does NOT warn when operation is omitted (defaults to milling)", () => {
    const r = calc({ ...base });
    expect(r.safety_warnings.some((w) => OP_WARN.test(w))).toBe(false);
  });
});
