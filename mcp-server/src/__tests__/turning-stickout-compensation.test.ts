/**
 * turning-stickout-compensation.test.ts -- slot:whiskey (Lathe Wizard, UNIT 1)
 * ============================================================================
 * Operator directive 2026-06-29: when tool stickout / stock overhang is long, the wizard must
 * AUTO-ADJUST the program -- reduce speed/feed OR apply a compensating taper to counter the
 * overhang deflection. This proves the closed loop:
 *   - the PURE planner reduces ap THEN feed (never Vc -- Vc is not even a parameter), floored at a
 *     viable minimum, and compensates the residual with an opposing taper (R9 reference values);
 *   - END-TO-END, a slender part trips the loop and the emitted Vc is UNCHANGED vs a stout part
 *     (the oscar deflection-Vc-lever regression encoded as an inverted oracle).
 */
import { describe, it, expect } from "vitest";
import {
  turningPrintToProgramEngine,
  stickoutCompensationPlan,
} from "../engines/TurningPrintToProgramEngine.js";

type PipeIn = Parameters<typeof turningPrintToProgramEngine.runPipeline>[0];

// Synthetic deflection oracle: delta = K * ap * fr^(1-mc), mc=0.25 -> fr exponent 0.75.
// Choosing K tunes the baseline deflection so each lever branch is exercised deterministically.
const mc = 0.25;
const ap0 = 2, fr0 = 0.3, tol = 0.025, cutLen = 50;
const oracle = (K: number) => (ap: number, fr: number) => K * ap * Math.pow(fr, 1 - mc);
const plan = (K: number, cl = cutLen) =>
  stickoutCompensationPlan({ ap0_mm: ap0, fr0_mm: fr0, tol_mm: tol, mc, cut_length_mm: cl, deflAt: oracle(K) });

describe("stickoutCompensationPlan -- lever ladder (ap -> feed -> taper, never Vc)", () => {
  it("no-op when deflection is already within tolerance", () => {
    const p = plan(0.01); // delta0 ~ 0.0081 < tol
    expect(p.lever).toBe("none");
    expect(p.ap_mm).toBe(ap0);
    expect(p.fr_mm).toBe(fr0);
    expect(p.compensation_x_mm).toBe(0);
  });

  it("LEVER 1: reduces depth-of-cut alone, feed untouched, no taper", () => {
    const p = plan(0.0617); // delta0 ~ 0.05 = 2*tol -> ap halves to bring within tol
    expect(p.lever).toBe("ap");
    expect(p.ap_mm).toBeCloseTo(1.0, 2);
    expect(p.fr_mm).toBe(fr0);          // feed NOT touched yet
    expect(p.compensation_x_mm).toBe(0);
    expect(p.residual_deflection_mm).toBeLessThanOrEqual(tol + 1e-9);
  });

  it("LEVER 2: depth floored, then feed reduced by r^(1/(1-mc)) (the oscar exponent)", () => {
    const p = plan(1.0); // delta0 ~ 0.811 -> ap floors at 0.1, feed takes the rest
    expect(p.lever).toBe("ap+fr");
    expect(p.ap_mm).toBeCloseTo(0.1, 5);  // floored
    expect(p.fr_mm).toBeGreaterThan(0.05);
    expect(p.fr_mm).toBeLessThan(fr0);     // feed reduced
    expect(p.compensation_x_mm).toBe(0);
    expect(p.residual_deflection_mm).toBeLessThanOrEqual(tol + 1e-9);
  });

  it("TAPER: both levers floored, residual compensated by an opposing taper of atan(residual/L)", () => {
    const p = plan(10); // delta0 ~ 8.1 -> ap+feed floored, large residual
    expect(p.lever).toBe("taper");
    expect(p.ap_mm).toBeCloseTo(0.1, 5);
    expect(p.fr_mm).toBeCloseTo(0.05, 5); // floored
    expect(p.compensation_x_mm).toBeGreaterThan(0);
    expect(p.compensation_x_mm).toBeCloseTo(p.residual_deflection_mm, 9);
    // taper angle = atan(residual / cut_length)
    expect(p.taper_angle_deg).toBeCloseTo((Math.atan(p.residual_deflection_mm / cutLen) * 180) / Math.PI, 6);
    expect(p.setup_flag).toBe(false);     // ~0.12deg over a 50mm cut
  });

  it("SETUP FLAG: a residual taper over a very short cut exceeds the 2deg clamp and warns loud", () => {
    const p = plan(10, 2); // same residual, 2mm cut -> ~3deg taper
    expect(p.lever).toBe("taper");
    expect(p.setup_flag).toBe(true);
    expect(p.notes.some((n) => /SETUP WARNING/.test(n))).toBe(true);
  });

  it("MONOTONIC-SAFE (adversarial fuzz): never increases ap/feed, comp never negative", () => {
    for (let K = 0.005; K <= 25; K *= 1.7) {
      const p = plan(K);
      expect(p.ap_mm).toBeLessThanOrEqual(ap0 + 1e-9);
      expect(p.fr_mm).toBeLessThanOrEqual(fr0 + 1e-9);
      expect(p.compensation_x_mm).toBeGreaterThanOrEqual(0);
    }
  });

  it("degenerate oracle (NaN / zero) -> no-op, never throws (fail-safe)", () => {
    const nan = stickoutCompensationPlan({ ap0_mm: ap0, fr0_mm: fr0, tol_mm: tol, mc, cut_length_mm: cutLen, deflAt: () => NaN });
    expect(nan.lever).toBe("none");
    const zero = stickoutCompensationPlan({ ap0_mm: ap0, fr0_mm: fr0, tol_mm: tol, mc, cut_length_mm: cutLen, deflAt: () => 0 });
    expect(zero.lever).toBe("none");
  });
});

describe("stickout compensation -- END-TO-END through runPipeline (never-Vc invariant)", () => {
  const part = (od: number, len: number) => ({
    part_number: "STICKOUT-TEST",
    material: { material_name: "1018", iso_group: "P" as const },
    bar_stock_od_mm: od,
    part_length_mm: len,
    features: [
      { id: "f1", type: "od_turn" as const, od_mm: od - 4, length_mm: len * 0.8, position_z_mm: 0,
        tolerance_mm: 0.02, x_start_mm: od, x_end_mm: od - 4, z_start_mm: 0, z_end_mm: -(len * 0.8) },
    ],
    controller: "okuma",
    machine_model: "Okuma LB3000",
  });
  const run = (i: ReturnType<typeof part>) => turningPrintToProgramEngine.runPipeline(i as unknown as PipeIn);
  const odRough = (r: ReturnType<typeof run>) => r.operations.find((o) => o.operation_type === "od_rough");

  it("a slender part (L/D=10) trips the stickout loop; a stout part (L/D<1) does not", () => {
    const slender = run(part(10, 100)); // L/D = 10 -> deflection-prone
    const stout = run(part(60, 24));    // L/D = 0.4 -> stout
    expect(slender.warnings.some((w) => /stickout/i.test(w.message))).toBe(true);
    expect(stout.warnings.some((w) => /stickout/i.test(w.message))).toBe(false);
  });

  // Control for diameter (which drives Vc via the RPM cap) by holding OD=10 constant and varying
  // only LENGTH: L/D=10 trips compensation, L/D=2 does not. Any Vc difference would then be the
  // compensation touching Vc -- which it must never do.
  it("NEVER-Vc: compensation leaves cutting speed IDENTICAL to the same-diameter uncompensated part", () => {
    const compensatedVc = odRough(run(part(10, 100)))?.cutting_params.cutting_speed_m_min; // L/D=10, trips
    const baselineVc = odRough(run(part(10, 20)))?.cutting_params.cutting_speed_m_min;      // L/D=2,  no comp, same OD
    expect(compensatedVc).toBeGreaterThan(0);
    expect(compensatedVc).toBe(baselineVc); // ap/feed were the lever, NOT surface speed
  });

  it("the slender part's emitted feed and/or depth is reduced vs the same-diameter baseline (the loop acted)", () => {
    const compensated = odRough(run(part(10, 100)))!.cutting_params; // L/D=10
    const baseline = odRough(run(part(10, 20)))!.cutting_params;     // L/D=2, same OD
    const reduced = compensated.feed_mm_rev < baseline.feed_mm_rev || compensated.depth_of_cut_mm < baseline.depth_of_cut_mm;
    expect(reduced).toBe(true);
  });
});
