/**
 * R9 tests for the RUNOUT PEAK-FORCE consequence (U-OSC-SFC-RUNOUT-PEAK-FORCE) in UltimateSpeedFeedEngine.
 * ====================================================================================================
 * The SFC computes force/deflection/power from the AVERAGE chip load. With tool/holder/spindle runout
 * (TIR), the heavily-loaded flute bites ~TIR deeper (peak chip = hex + TIR), so its INSTANTANEOUS force
 * exceeds the average and drives the real deflection/power/torque spike. Kienzle Fc grows as h^(1-mc), so
 * the peak force factor is pf = ((hex+TIR)/hex)^(1-mc) >= 1. New ADDITIVE outputs
 * forces.cutting_force_peak_runout_N + forces.deflection_peak_runout_um + power.required_power_peak_runout_kw
 * + power.power_utilization_peak_runout_pct, and a warning that fires ONLY on a FLIP (a gate that PASSES at
 * the average force but FAILS at the runout peak).
 *
 * ADDITIVE + NON-REGRESSING: the headline verdicts (required_power_kw, deflection_um, is_within_budget,
 * torque_Nm) stay on the AVERAGE force; the peak block is active ONLY when a runout input is given (the
 * engine's `runout` is undefined otherwise). Conservative: pf >= 1, so the peak consequence is never less
 * than the average. Self-calibrating: the flip tests read the engine's OWN average output then size the
 * machine/stickout so the average passes but the peak fails.
 */
import { describe, it, expect } from "vitest";
import { ultimateSpeedFeedEngine } from "../engines/UltimateSpeedFeedEngine.js";

const BASE = {
  iso_group: "P" as const,
  tool_diameter_mm: 10,
  flutes: 4,
  operation: "milling" as const,
  axial_depth_mm: 6,
  radial_depth_pct: 40,
};

const calc = (extra: Record<string, unknown>) =>
  ultimateSpeedFeedEngine.calculate({ ...BASE, ...extra } as never);

// A representative runout input (RSS of spindle/holder/tool TIR via the engine's runoutImpact).
const RUNOUT = { holder_runout_mm: 0.02, tool_runout_mm: 0.015, spindle_runout_mm: 0.004 };

describe("UltimateSpeedFeedEngine -- runout peak-force consequence (additive, non-regressing)", () => {
  it("emits a peak power/deflection/force ABOVE the average when a runout input is given", () => {
    const r = calc({ cut_type: "roughing", tool_material: "carbide", tool_stickout_mm: 40, machine_power_kw: 1000, ...RUNOUT });
    const avgP = r.power.required_power_kw.value;
    const peakP = r.power.required_power_peak_runout_kw?.value ?? 0;
    expect(peakP).toBeGreaterThan(avgP); // loaded flute spikes above average
    expect(r.forces.cutting_force_peak_runout_N?.value ?? 0).toBeGreaterThan(r.forces.tangential_force_N.value);
    expect(r.forces.deflection_peak_runout_um?.value ?? 0).toBeGreaterThan(r.forces.deflection_um?.value ?? 1e9);
  });

  it("the SAME peak factor scales power, deflection, and force (one multiplier pf = ((hex+TIR)/hex)^(1-mc))", () => {
    const r = calc({ cut_type: "roughing", tool_material: "carbide", tool_stickout_mm: 40, machine_power_kw: 1000, ...RUNOUT });
    const powerRatio = r.power.required_power_peak_runout_kw!.value / r.power.required_power_kw.value;
    const deflRatio = r.forces.deflection_peak_runout_um!.value / r.forces.deflection_um!.value;
    const forceRatio = r.forces.cutting_force_peak_runout_N!.value / r.forces.tangential_force_N.value;
    expect(powerRatio).toBeGreaterThan(1);
    expect(deflRatio).toBeCloseTo(powerRatio, 1); // same multiplier
    expect(forceRatio).toBeCloseTo(powerRatio, 1);
  });

  it("a LARGER TIR yields a larger peak factor (monotone in runout)", () => {
    const small = calc({ cut_type: "roughing", tool_material: "carbide", machine_power_kw: 1000, tool_runout_mm: 0.005 });
    const large = calc({ cut_type: "roughing", tool_material: "carbide", machine_power_kw: 1000, tool_runout_mm: 0.04 });
    const sRatio = small.power.required_power_peak_runout_kw!.value / small.power.required_power_kw.value;
    const lRatio = large.power.required_power_peak_runout_kw!.value / large.power.required_power_kw.value;
    expect(lRatio).toBeGreaterThan(sRatio);
  });

  it("fires a runout-peak STALL warning when the cut passes power budget on average but exceeds it at the peak", () => {
    // Probe the average power + the peak factor with an unconstrained machine, then size the machine so the
    // average util lands in the flip band ((90/pf, 90]) -> average passes, peak exceeds 90%.
    const probe = calc({ cut_type: "roughing", tool_material: "carbide", machine_power_kw: 1000, ...RUNOUT });
    const avgP = probe.power.required_power_kw.value;
    const pf = probe.power.required_power_peak_runout_kw!.value / avgP; // > 1
    const targetUtil = ((90 / pf) + 90) / 2; // midpoint of the flip band -> <=90 avg, >90 peak
    const available = avgP / (targetUtil / 100);
    const machinePower = available / 0.85;
    const r = calc({ cut_type: "roughing", tool_material: "carbide", machine_power_kw: machinePower, ...RUNOUT });
    expect(r.power.is_within_budget).toBe(true); // average passes (non-regression: headline verdict on average)
    expect(r.power.power_utilization_pct!.value).toBeLessThanOrEqual(90);
    expect(r.power.power_utilization_peak_runout_pct!.value).toBeGreaterThan(90);
    expect(r.warnings.join(" | ")).toMatch(/Runout peak load/i);
  });

  it("fires a runout-peak ACCURACY warning when deflection passes 50um on average but exceeds it at the peak", () => {
    // pf is modest (~1.1), so the flip band for average deflection is (50/pf, 50]. Scan stickout (deflection
    // grows ~L^3) on a dia-8 tool until the average lands just under 50, with runout pushing the peak over.
    let chosen: ReturnType<typeof calc> | undefined;
    for (let L = 14; L <= 40; L += 1) {
      const r = calc({ cut_type: "roughing", tool_material: "carbide", tool_diameter_mm: 8, tool_stickout_mm: L, radial_depth_pct: 50, ...RUNOUT });
      const avg = r.forces.deflection_um?.value;
      const peak = r.forces.deflection_peak_runout_um?.value;
      if (avg !== undefined && peak !== undefined && avg <= 50 && peak > 50) { chosen = r; break; }
    }
    expect(chosen?.forces.deflection_um?.value ?? 0).toBeGreaterThan(0);
    expect(chosen!.forces.deflection_um!.value).toBeLessThanOrEqual(50); // average passes
    expect(chosen!.forces.deflection_peak_runout_um!.value).toBeGreaterThan(50); // peak exceeds
    expect(chosen!.warnings.join(" | ")).toMatch(/Runout peak load/i);
  });

  it("CONSERVATIVE: every peak consequence is >= its average value (never relaxes a verdict)", () => {
    const r = calc({ cut_type: "roughing", tool_material: "carbide", tool_stickout_mm: 40, machine_power_kw: 1000, ...RUNOUT });
    expect(r.power.required_power_peak_runout_kw!.value).toBeGreaterThanOrEqual(r.power.required_power_kw.value);
    expect(r.forces.deflection_peak_runout_um!.value).toBeGreaterThanOrEqual(r.forces.deflection_um!.value);
    expect(r.power.power_utilization_peak_runout_pct!.value).toBeGreaterThanOrEqual(r.power.power_utilization_pct!.value);
  });

  it("NON-REGRESSION: a runout input does NOT change the headline AVERAGE power (runout only adds the peak)", () => {
    const noRunout = calc({ cut_type: "roughing", tool_material: "carbide", tool_stickout_mm: 40, machine_power_kw: 1000 });
    const withRunout = calc({ cut_type: "roughing", tool_material: "carbide", tool_stickout_mm: 40, machine_power_kw: 1000, ...RUNOUT });
    // The AVERAGE chip-load force is unaffected by runout -> headline required_power_kw identical.
    expect(withRunout.power.required_power_kw.value).toBeCloseTo(noRunout.power.required_power_kw.value, 5);
    expect(withRunout.forces.tangential_force_N.value).toBeCloseTo(noRunout.forces.tangential_force_N.value, 5);
  });

  it("NON-REGRESSION: NO runout input -> NO peak outputs (the peak block is inactive)", () => {
    const r = calc({ cut_type: "roughing", tool_material: "carbide", tool_stickout_mm: 40, machine_power_kw: 1000 });
    expect(r.power.required_power_peak_runout_kw).toBeUndefined();
    expect(r.power.power_utilization_peak_runout_pct).toBeUndefined();
    expect(r.forces.cutting_force_peak_runout_N).toBeUndefined();
    expect(r.forces.deflection_peak_runout_um).toBeUndefined();
    expect(r.warnings.join(" | ")).not.toMatch(/Runout peak load/i);
  });

  it("a low-load cut with runout gets the peak OUTPUTS but NO false STALL flip warning", () => {
    const r = calc({ cut_type: "finishing", tool_material: "carbide", axial_depth_mm: 0.5, radial_depth_pct: 30, machine_power_kw: 1000, ...RUNOUT });
    expect(r.power.required_power_peak_runout_kw!.value).toBeGreaterThan(r.power.required_power_kw.value);
    expect(r.warnings.join(" | ")).not.toMatch(/Runout peak load: .*spindle power/i);
  });

  it("ADVERSARIAL: a huge TIR does not crash and stays a finite peak factor (clamped/guarded)", () => {
    const r = calc({ cut_type: "roughing", tool_material: "carbide", machine_power_kw: 1000, tool_runout_mm: 0.2 });
    const peakP = r.power.required_power_peak_runout_kw?.value;
    expect(peakP).toBeGreaterThan(0);
    expect(Number.isFinite(peakP!)).toBe(true);
    expect(peakP!).toBeGreaterThanOrEqual(r.power.required_power_kw.value);
  });

  it("COMBINED worst-case force = runout-peak of a WORN tool, present only when BOTH effects active", () => {
    const r = calc({ cut_type: "roughing", tool_material: "carbide", tool_stickout_mm: 40, machine_power_kw: 1000, ...RUNOUT });
    const worst = r.forces.cutting_force_worst_case_N?.value ?? 0;
    const worn = r.forces.cutting_force_worn_N?.value ?? 0;
    const peak = r.forces.cutting_force_peak_runout_N?.value ?? 0;
    expect(worst).toBeGreaterThan(worn); // worse than worn-alone
    expect(worst).toBeGreaterThan(peak); // worse than runout-peak-alone
    // worst = worn * peak_factor (peak_factor = peak power / average power)
    const peakFactor = r.power.required_power_peak_runout_kw!.value / r.power.required_power_kw.value;
    expect(worst / (worn * peakFactor)).toBeCloseTo(1, 1); // within ~5% (rounding of the integer N outputs)
  });

  it("worst-case is UNDEFINED with no runout (the worn force already covers the single effect)", () => {
    const r = calc({ cut_type: "roughing", tool_material: "carbide", tool_stickout_mm: 40, machine_power_kw: 1000 });
    expect(r.forces.cutting_force_worst_case_N).toBeUndefined();
    expect(r.forces.cutting_force_worn_N?.value ?? 0).toBeGreaterThan(0); // worn still present
  });

  it("worst-case is >= both component envelopes (conservative composition, hss)", () => {
    const r = calc({ cut_type: "roughing", tool_material: "hss", tool_stickout_mm: 40, machine_power_kw: 1000, ...RUNOUT });
    const worst = r.forces.cutting_force_worst_case_N!.value;
    expect(worst).toBeGreaterThanOrEqual(r.forces.cutting_force_worn_N!.value);
    expect(worst).toBeGreaterThanOrEqual(r.forces.cutting_force_peak_runout_N!.value);
  });
});

/**
 * R9 tests for the COMBINED worst-case FLIP warning (U-OSC-SFC-WORSTCASE-FLIP).
 * The combined worst-case force (a WORN tool WITH runout) is Fc * wornMult * peakFactor. The flip warning
 * fires ONLY in the genuinely combined-only band: a gate that PASSES at the average force AND at worn-alone
 * AND at runout-peak-alone, but FAILS at the product. The per-effect flips (wear STEP 12B, runout STEP 14R)
 * already alarm the single-effect cases; this catches the case neither single effect trips but their
 * composition does. Conservative (cf >= each factor >= 1), non-regressing (only adds a warning string;
 * numeric headlines stay on the average force), active only when BOTH wear and runout are present.
 *
 * Self-calibrating: probe the engine's OWN wear/runout multipliers, then size the machine so the average
 * util lands in the combined-only band ((90/cf, 90/max]) -- the midpoint guarantees worn-alone AND
 * peak-alone stay <=90 while the product cf exceeds 90.
 */
describe("UltimateSpeedFeedEngine -- combined worst-case FLIP warning (combined-only, non-regressing)", () => {
  it("fires a WORST-CASE STALL warning in the band where neither single effect trips power but their product does", () => {
    const probe = calc({ cut_type: "roughing", tool_material: "carbide", tool_stickout_mm: 40, machine_power_kw: 1000, ...RUNOUT });
    const avgP = probe.power.required_power_kw.value;
    const wornMult = probe.power.required_power_worn_kw!.value / avgP;
    const peakFactor = probe.power.required_power_peak_runout_kw!.value / avgP;
    expect(Math.min(wornMult, peakFactor)).toBeGreaterThan(1); // both effects active -> a combined-only band exists
    const cf = wornMult * peakFactor;
    const mx = Math.max(wornMult, peakFactor);
    // midpoint of the open band (90/cf, 90/mx). cf = wornMult*peakFactor >= mx, so 90/cf <= 90/mx and the
    // midpoint <= 90/mx -> worn-alone AND peak-alone both stay <=90 (no single-effect flip); midpoint > 90/cf
    // -> combined = midpoint*cf > 90 (the combined flip fires). The warning-absence asserts below confirm it.
    const targetAvgUtil = ((90 / cf) + (90 / mx)) / 2;
    const available = avgP / (targetAvgUtil / 100);
    const machinePower = available / 0.85;
    const r = calc({ cut_type: "roughing", tool_material: "carbide", tool_stickout_mm: 40, machine_power_kw: machinePower, ...RUNOUT });
    expect(r.power.is_within_budget).toBe(true); // headline verdict on the AVERAGE force (non-regression)
    expect(r.power.power_utilization_pct!.value).toBeLessThanOrEqual(90); // average within budget (unclamped field)
    // Clamp-independent proof of "combined-ONLY": neither single-effect flip warning fires, only the product.
    expect(r.warnings.join(" | ")).not.toMatch(/End-of-life STALL risk/i); // worn-alone did NOT trip its flip
    expect(r.warnings.join(" | ")).not.toMatch(/Runout peak load:.*spindle power/i); // peak-alone did NOT trip
    expect(r.warnings.join(" | ")).toMatch(/Worst-case STALL risk/i); // ONLY the combination trips it
  });

  it("does NOT fire the worst-case STALL warning when the WORN-alone flip already trips (no double-alarm)", () => {
    const probe = calc({ cut_type: "roughing", tool_material: "carbide", tool_stickout_mm: 40, machine_power_kw: 1000, ...RUNOUT });
    const avgP = probe.power.required_power_kw.value;
    const wornMult = probe.power.required_power_worn_kw!.value / avgP;
    const targetAvgUtil = (90 / wornMult) * 1.05; // worn-alone util ~94.5% > 90, average still well within budget
    const available = avgP / (targetAvgUtil / 100);
    const machinePower = available / 0.85;
    const r = calc({ cut_type: "roughing", tool_material: "carbide", tool_stickout_mm: 40, machine_power_kw: machinePower, ...RUNOUT });
    // NOTE: power_utilization_worn_pct is display-ROUNDED to 1 sig fig (roundSig); 94.67% -> 90 (NOT a clamp).
    // The worn FLIP fires on the true (unrounded) util, so assert on the warning set (the contract), not the field.
    expect(r.power.is_within_budget).toBe(true); // average still within budget (non-regression)
    expect(r.warnings.join(" | ")).toMatch(/End-of-life STALL risk/i); // the per-effect worn flip trips and carries it
    expect(r.warnings.join(" | ")).not.toMatch(/Worst-case STALL risk/i); // combined-only guard suppresses the dup
  });

  it("fires a WORST-CASE ACCURACY warning when only the combined worn+runout deflection exceeds 50um", () => {
    // Per-config combined deflection = d * wornMult * peakFactor = dw*dp/d (exact, no probe). Scan stickout
    // (deflection ~ L^3) until average AND worn-alone AND peak-alone are all <=50 but their composition >50.
    let chosen: ReturnType<typeof calc> | undefined;
    for (let L = 14; L <= 45; L += 1) {
      const r = calc({ cut_type: "roughing", tool_material: "carbide", tool_diameter_mm: 8, tool_stickout_mm: L, radial_depth_pct: 50, machine_power_kw: 1000, ...RUNOUT });
      const d = r.forces.deflection_um?.value;
      const dw = r.forces.deflection_worn_um?.value;
      const dp = r.forces.deflection_peak_runout_um?.value;
      if (d !== undefined && dw !== undefined && dp !== undefined && d <= 50 && dw <= 50 && dp <= 50 && (dw * dp) / d > 50) { chosen = r; break; }
    }
    if (!chosen) throw new Error("scan found no combined-only deflection band (avg/worn/peak <=50, combined >50)");
    expect(chosen.forces.deflection_um!.value).toBeGreaterThan(0);
    expect(chosen.forces.deflection_um!.value).toBeLessThanOrEqual(50); // average holds tolerance
    expect(chosen.forces.deflection_worn_um!.value).toBeLessThanOrEqual(50); // worn-alone holds tolerance
    expect(chosen.forces.deflection_peak_runout_um!.value).toBeLessThanOrEqual(50); // peak-alone holds tolerance
    expect(chosen.warnings.join(" | ")).toMatch(/Worst-case ACCURACY loss/i); // only the combination walks
  });

  it("NON-REGRESSION: NO runout input -> NO worst-case flip warning (worstCaseForceN undefined, block inert)", () => {
    const r = calc({ cut_type: "roughing", tool_material: "carbide", tool_stickout_mm: 40, machine_power_kw: 5 });
    expect(r.forces.cutting_force_worst_case_N).toBeUndefined();
    expect(r.warnings.join(" | ")).not.toMatch(/Worst-case (STALL|ACCURACY|TORQUE)/i);
  });

  it("ADVERSARIAL: huge TIR + tiny machine does not crash and emits no malformed worst-case warning", () => {
    const r = calc({ cut_type: "roughing", tool_material: "carbide", tool_stickout_mm: 40, machine_power_kw: 2, tool_runout_mm: 0.25, holder_runout_mm: 0.05 });
    expect(Array.isArray(r.warnings)).toBe(true);
    // tiny machine -> over budget on AVERAGE -> is_within_budget false -> the combined STALL guard (gated on
    // isWithinBudget) cannot fire; no NaN/undefined leaks into any emitted warning string.
    expect(r.warnings.join(" | ")).not.toMatch(/NaN|undefined/);
  });
});
