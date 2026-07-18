/**
 * Tests for the Lathe Wizard combinatorial-validation invariant library.
 *
 * Two layers:
 *  (A) Unit tests of the invariant checker against hand-built result objects with
 *      KNOWN reference values -- happy path + >=3 failure modes + >=2 adversarial.
 *      These prove the checker actually FAILS when the wizard would be wrong (R9:
 *      a test that can't fail on a real defect is worthless).
 *  (B) Integration: drive the REAL LatheSpeedFeedCalculatorFacadeEngine over a
 *      bounded combinatorial grid (materials x tool-types x operations x machines x
 *      strategies) and assert ZERO P0 invariant violations, plus the two metamorphic
 *      relations (M2 derate-only rpm, M3 Kienzle force-vs-depth) through the live
 *      engine. The FULL (millions-combo) sweep lives in the driver script; this is
 *      the fast in-CI proof that the wizard honors the physics on a spanning sample.
 */

import { describe, it, expect } from "vitest";
import {
  checkResultInvariants,
  checkForceMonotonicInDepth,
  checkRpmMonotonicInMachineCeiling,
  type InvariantViolation,
} from "./lathe-wizard-invariants.js";
import {
  LatheSpeedFeedCalculatorFacadeEngine,
  type LatheSpeedFeedInput,
  type LatheSpeedFeedResult,
} from "../../src/engines/LatheSpeedFeedCalculatorFacadeEngine.js";

// ---------------------------------------------------------------------------
// Helpers: build a minimal VALID result / input, then mutate one field per test.
// ---------------------------------------------------------------------------

/** A structurally-valid, physically-consistent result (D=50mm, Vc=200 -> rpm~1273). */
function validResult(overrides: Partial<LatheSpeedFeedResult> = {}): LatheSpeedFeedResult {
  const vc = 200;
  const D = 50;
  const rpm = (1000 * vc) / (Math.PI * D); // ~1273.24
  return {
    success: true,
    recommendation: {
      cutting_speed_m_min: vc,
      rpm,
      feed_mm_rev: 0.2,
      depth_of_cut_mm: 2.0,
    },
    band: {
      vc_min: 150,
      vc_max: 250,
      feed_min: 0.1,
      feed_max: 0.3,
      doc_min: 1.0,
      doc_max: 3.0,
    },
    confidence: 0.85,
    sources: [],
    reasoning: [],
    material_properties: {},
    warnings: [],
    predicted_force_N: 900,
    predicted_power_kw: 4.5,
    predicted_tool_life_min: 45,
    predicted_ra_um: 1.6,
    ...overrides,
  };
}

/** Input whose workpiece diameter matches validResult() (50mm) so I6 applies. */
function validInput(overrides: Partial<LatheSpeedFeedInput> = {}): LatheSpeedFeedInput {
  return {
    material: "4140",
    tool: { type: "turning_insert" },
    operation: { type: "roughing" },
    machine: { max_rpm: 3800, max_power_kw: 11 },
    workpiece: { diameter_mm: 50 },
    ...overrides,
  } as LatheSpeedFeedInput;
}

function codes(vs: InvariantViolation[]): string[] {
  return vs.map((x) => x.code);
}

// ===========================================================================
// (A) Unit tests of the invariant checker
// ===========================================================================

describe("checkResultInvariants -- happy path", () => {
  it("a physically-consistent result yields ZERO violations", () => {
    const violations = checkResultInvariants(validInput(), validResult());
    expect(violations).toEqual([]);
  });

  it("a clean declared failure WITH a warning is not a violation", () => {
    const r = validResult({ success: false, warnings: ["no material match for XYZ"] });
    expect(checkResultInvariants(validInput(), r)).toEqual([]);
  });
});

describe("checkResultInvariants -- failure modes (checker must catch real defects)", () => {
  it("F1: negative predicted force is P0 (Kienzle can never be negative)", () => {
    const r = validResult({ predicted_force_N: -12 });
    const vs = checkResultInvariants(validInput(), r);
    expect(codes(vs)).toContain("I2b-nonneg");
    expect(vs.find((x) => x.code === "I2b-nonneg")?.severity).toBe("P0");
  });

  it("F2: rpm above machine max_rpm is P0 (chuck overspeed / derate-only breach)", () => {
    // Keep the closed form self-consistent (Vc raised with rpm) so ONLY the cap trips.
    const rpm = 5000;
    const vc = (rpm * Math.PI * 50) / 1000; // keep I6 satisfied
    const r = validResult({
      recommendation: { cutting_speed_m_min: vc, rpm, feed_mm_rev: 0.2, depth_of_cut_mm: 2 },
      band: { vc_min: 150, vc_max: vc + 50, feed_min: 0.1, feed_max: 0.3, doc_min: 1, doc_max: 3 },
    });
    const vs = checkResultInvariants(validInput({ machine: { max_rpm: 3800 } }), r);
    expect(codes(vs)).toContain("I7-rpm-cap");
  });

  it("F3: inverted band (min > max) is P0", () => {
    const r = validResult({
      band: { vc_min: 300, vc_max: 100, feed_min: 0.1, feed_max: 0.3, doc_min: 1, doc_max: 3 },
    });
    expect(codes(checkResultInvariants(validInput(), r))).toContain("I4-band-order");
  });

  it("F4: rpm divergence above n=1000*Vc/(pi*D) is recorded as a P2 advisory only", () => {
    // 200 m/min on 50mm => ~1273 rpm; report 2500 (nearly 2x) -> Vc/rpm divergence.
    // This is an ADVISORY (legitimate under a spindle floor/ceiling clamp), not a P0;
    // the hard safety cap is I7 (rpm <= machine max).
    const r = validResult({
      recommendation: { cutting_speed_m_min: 200, rpm: 2500, feed_mm_rev: 0.2, depth_of_cut_mm: 2 },
      band: { vc_min: 150, vc_max: 250, feed_min: 0.1, feed_max: 0.3, doc_min: 1, doc_max: 3 },
    });
    const vs = checkResultInvariants(validInput({ machine: {} }), r);
    expect(codes(vs)).toContain("I6-rpm-overspeed");
    expect(vs.find((x) => x.code === "I6-rpm-overspeed")?.severity).toBe("P2");
    // It must contribute NO P0 -- the sweep verdict keys off P0 only.
    expect(vs.filter((x) => x.severity === "P0")).toEqual([]);
  });

  it("F4b: rpm DOWN-CLAMP (slower than closed form) is NOT flagged (safe derate)", () => {
    // 200 m/min on 50mm => ~1273 ideal; wizard capped to 600 (slower) -> safe, no flag.
    const r = validResult({
      recommendation: { cutting_speed_m_min: 200, rpm: 600, feed_mm_rev: 0.2, depth_of_cut_mm: 2 },
    });
    expect(codes(checkResultInvariants(validInput({ machine: {} }), r))).not.toContain(
      "I6-rpm-overspeed",
    );
  });

  it("F4c: boring op skips I6 (effective cutting diameter != workpiece OD)", () => {
    // Boring: rpm far above OD-closed-form is legitimate (bore diameter < OD).
    const r = validResult({
      recommendation: { cutting_speed_m_min: 200, rpm: 4000, feed_mm_rev: 0.2, depth_of_cut_mm: 2 },
      band: { vc_min: 150, vc_max: 250, feed_min: 0.1, feed_max: 0.3, doc_min: 1, doc_max: 3 },
    });
    const input = validInput({
      machine: {},
      tool: { type: "boring_bar" },
      operation: { type: "boring" },
    });
    expect(codes(checkResultInvariants(input, r))).not.toContain("I6-rpm-overspeed");
  });

  it("F5: silent over-power (power > machine kW, no warning) is P0", () => {
    const r = validResult({ predicted_power_kw: 20, warnings: [] });
    const vs = checkResultInvariants(validInput({ machine: { max_power_kw: 11 } }), r);
    expect(codes(vs)).toContain("I8-power-cap");
  });

  it("F5b: over-power WITH a power warning is NOT flagged (fail-loud honored)", () => {
    const r = validResult({
      predicted_power_kw: 20,
      warnings: ["spindle power exceeded: 20kW > 11kW rated"],
    });
    const vs = checkResultInvariants(validInput({ machine: { max_power_kw: 11 } }), r);
    expect(codes(vs)).not.toContain("I8-power-cap");
  });

  it("F6: silent failure (success=false, no warnings) is P1", () => {
    const r = validResult({ success: false, warnings: [] });
    const vs = checkResultInvariants(validInput(), r);
    expect(codes(vs)).toContain("I0-silent-failure");
  });
});

describe("checkResultInvariants -- adversarial inputs", () => {
  it("A1: NaN rpm is caught (not silently passed)", () => {
    const r = validResult({
      recommendation: { cutting_speed_m_min: 200, rpm: NaN, feed_mm_rev: 0.2, depth_of_cut_mm: 2 },
    });
    expect(codes(checkResultInvariants(validInput(), r))).toContain("I2-positive");
  });

  it("A2: Infinity force + confidence > 1 both caught", () => {
    const r = validResult({ predicted_force_N: Infinity, confidence: 1.4 });
    const vs = checkResultInvariants(validInput(), r);
    expect(codes(vs)).toContain("I2b-nonneg");
    expect(codes(vs)).toContain("I3-confidence");
  });

  it("A3: recommendation outside its own band is P1", () => {
    const r = validResult({
      recommendation: { cutting_speed_m_min: 400, rpm: (1000 * 400) / (Math.PI * 50), feed_mm_rev: 0.2, depth_of_cut_mm: 2 },
    });
    // vc 400 with band [150,250] -> out of band (rpm kept self-consistent so only I5 trips)
    expect(codes(checkResultInvariants(validInput({ machine: {} }), r))).toContain("I5-in-band");
  });
});

describe("metamorphic checkers", () => {
  it("M3: force DECREASING with more depth is flagged (sign error)", () => {
    const lo = validResult({ predicted_force_N: 900 });
    const hi = validResult({ predicted_force_N: 500 }); // more depth but LESS force -> wrong
    const m = checkForceMonotonicInDepth(lo, hi);
    expect(m.holds).toBe(false);
    expect(m.severity).toBe("P0");
  });

  it("M3: force increasing with depth holds", () => {
    const m = checkForceMonotonicInDepth(
      validResult({ predicted_force_N: 900 }),
      validResult({ predicted_force_N: 1800 }),
    );
    expect(m.holds).toBe(true);
  });

  it("M2: relaxing the rpm ceiling lowering rpm is flagged (derate-only breach)", () => {
    const tight = validResult({ recommendation: { cutting_speed_m_min: 100, rpm: 1000, feed_mm_rev: 0.2, depth_of_cut_mm: 2 } });
    const loose = validResult({ recommendation: { cutting_speed_m_min: 100, rpm: 800, feed_mm_rev: 0.2, depth_of_cut_mm: 2 } });
    const m = checkRpmMonotonicInMachineCeiling(tight, loose);
    expect(m.holds).toBe(false);
  });
});

// ===========================================================================
// (B) Integration: drive the REAL wizard over a bounded combinatorial grid.
// ===========================================================================

describe("Lathe Wizard combinatorial invariants (LIVE engine, bounded grid)", () => {
  const materials = ["4140", "6061", "304"]; // P, N, M spanning groups
  const toolTypes: Array<LatheSpeedFeedInput["tool"]["type"]> = [
    "turning_insert",
    "boring_bar",
    "grooving",
    "parting",
  ];
  const operations: Array<LatheSpeedFeedInput["operation"]["type"]> = [
    "roughing",
    "finishing",
    "boring",
  ];
  const machines = [
    { max_rpm: 3800, max_power_kw: 11 }, // Okuma fleet floor (tight)
    { max_rpm: 6000, max_power_kw: 22 }, // looser envelope
  ];
  const strategies: Array<NonNullable<LatheSpeedFeedInput["strategy"]>> = [
    "conservative",
    "balanced",
    "aggressive",
  ];
  const diameters = [12, 50, 120]; // mm

  it("holds ZERO P0 invariant violations across the spanning grid", () => {
    const p0: Array<{ input: LatheSpeedFeedInput; violation: InvariantViolation }> = [];
    let combos = 0;
    for (const material of materials) {
      for (const toolType of toolTypes) {
        for (const opType of operations) {
          for (const machine of machines) {
            for (const strategy of strategies) {
              for (const dia of diameters) {
                combos++;
                const input: LatheSpeedFeedInput = {
                  material,
                  tool: { type: toolType },
                  operation: { type: opType },
                  machine,
                  workpiece: { diameter_mm: dia },
                  strategy,
                } as LatheSpeedFeedInput;
                const result = LatheSpeedFeedCalculatorFacadeEngine.calculate(input);
                for (const vio of checkResultInvariants(input, result)) {
                  if (vio.severity === "P0") p0.push({ input, violation: vio });
                }
              }
            }
          }
        }
      }
    }
    // Prove the grid actually ran (not a vacuous pass).
    expect(combos).toBe(
      materials.length *
        toolTypes.length *
        operations.length *
        machines.length *
        strategies.length *
        diameters.length,
    );
    if (p0.length > 0) {
      const sample = p0.slice(0, 5).map((x) => ({
        code: x.violation.code,
        msg: x.violation.message,
        material: x.input.material,
        tool: x.input.tool.type,
        op: x.input.operation.type,
        evidence: x.violation.evidence,
      }));
      throw new Error(
        `Lathe Wizard produced ${p0.length}/${combos} P0-violating combos. First few:\n` +
          JSON.stringify(sample, null, 2),
      );
    }
    expect(p0.length).toBe(0);
  });

  it("M3 (LIVE): force is non-decreasing in depth of cut", () => {
    const base: LatheSpeedFeedInput = {
      material: "4140",
      tool: { type: "turning_insert" },
      operation: { type: "roughing", depth_of_cut_mm: 1.0 },
      machine: { max_rpm: 3800, max_power_kw: 11 },
      workpiece: { diameter_mm: 60 },
    } as LatheSpeedFeedInput;
    const loRes = LatheSpeedFeedCalculatorFacadeEngine.calculate(base);
    const hiRes = LatheSpeedFeedCalculatorFacadeEngine.calculate({
      ...base,
      operation: { type: "roughing", depth_of_cut_mm: 3.0 },
    } as LatheSpeedFeedInput);
    const m = checkForceMonotonicInDepth(loRes, hiRes);
    expect(m.holds).toBe(true);
  });

  it("LIVE: predicted_tool_life_min is never exactly 0 (Taylor sub-minute preserved)", () => {
    // Regression for the combinatorial-sweep finding: high-Vc stainless finishing
    // used to Math.round() a sub-minute Taylor life down to a physically-impossible 0.
    const offenders: Array<{ input: LatheSpeedFeedInput; life: number }> = [];
    for (const material of ["304", "316", "Ti-6Al-4V", "4140", "6061"]) {
      for (const dia of [6, 12, 25, 50]) {
        for (const strategy of ["aggressive", "maximum_mrr"] as const) {
          const input: LatheSpeedFeedInput = {
            material,
            tool: { type: "turning_insert" },
            operation: { type: "finishing" },
            machine: { max_rpm: 5000, max_power_kw: 15 },
            workpiece: { diameter_mm: dia },
            strategy,
          } as LatheSpeedFeedInput;
          const res = LatheSpeedFeedCalculatorFacadeEngine.calculate(input);
          const life = res.predicted_tool_life_min;
          if (life !== undefined && life <= 0) offenders.push({ input, life });
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("M2 (LIVE): relaxing machine max_rpm never lowers recommended rpm", () => {
    const base: LatheSpeedFeedInput = {
      material: "6061", // aluminum: high Vc -> likely rpm-limited on the tight machine
      tool: { type: "turning_insert" },
      operation: { type: "finishing" },
      workpiece: { diameter_mm: 20 },
      machine: { max_rpm: 2500, max_power_kw: 11 },
    } as LatheSpeedFeedInput;
    const tightRes = LatheSpeedFeedCalculatorFacadeEngine.calculate(base);
    const looseRes = LatheSpeedFeedCalculatorFacadeEngine.calculate({
      ...base,
      machine: { max_rpm: 8000, max_power_kw: 11 },
    } as LatheSpeedFeedInput);
    const m = checkRpmMonotonicInMachineCeiling(tightRes, looseRes);
    expect(m.holds).toBe(true);
  });
});
