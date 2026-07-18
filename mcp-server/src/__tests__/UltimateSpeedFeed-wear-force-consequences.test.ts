/**
 * R9 tests for the flank-wear SAFETY CONSEQUENCES (U-OSC-SFC-FLANK-WEAR-FORCE step 2) in
 * UltimateSpeedFeedEngine. Step 1 surfaced the worn cutting FORCE (cutting_force_worn_N); Step 2 maps
 * that force onto its safety CONSEQUENCES at the ISO-3685 end-of-life flank-wear limit:
 *   - spindle power   P_worn = P_fresh*(1+Cw*VB)   (power is linear in Fc)
 *   - tool deflection d_worn = d_fresh*(1+Cw*VB)   (deflection is linear in the resultant)
 *   - torque          T_worn = T_fresh*(1+Cw*VB)   (torque is linear in Fc)
 * The multiplier m = F_worn/F_fresh = (1+Cw*VB) is the same one the WearForceCompensationEngine returns
 * (Cw cited Smithey-Kapoor-DeVor 2000; carbide 1.5 / hss 2.0 per-mm-VB; roughing VB_max=0.6 -> carbide
 * m=1.90, hss m=2.20; finishing VB_uniform=0.3 -> carbide m=1.45).
 *
 * The design is ADDITIVE + NON-REGRESSING: the headline verdicts (required_power_kw, deflection_um,
 * is_within_budget, torque_Nm) stay at the FRESH force; the new worn fields + a warning that fires ONLY
 * on an end-of-life FLIP (a gate that PASSES fresh but FAILS at the wear limit) are the operator's
 * "change the tool before it stalls / loses accuracy" signal. Conservative: m >= 1, so a worn
 * consequence is never better than fresh and never relaxes a fresh verdict.
 *
 * Self-calibrating: the flip tests read the engine's OWN fresh output and pick the machine limit so the
 * fresh value lands just inside its gate -> a value-real test that fails if the worn scaling is reverted.
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

describe("UltimateSpeedFeedEngine -- flank-wear safety consequences (additive, non-regressing)", () => {
  it("worn spindle power = fresh power * (1+Cw*VB), ~1.90x for carbide roughing (VB=0.6)", () => {
    const r = calc({ cut_type: "roughing", tool_material: "carbide", machine_power_kw: 1000 });
    const fresh = r.power.required_power_kw.value;
    const worn = r.power.required_power_worn_kw?.value ?? 0;
    expect(worn).toBeGreaterThan(fresh);
    expect(worn / fresh).toBeCloseTo(1.9, 1); // carbide Cw=1.5, VB_max=0.6 -> 1+1.5*0.6
  });

  it("worn deflection = fresh deflection * (1+Cw*VB), same ~1.90x multiplier", () => {
    const r = calc({ cut_type: "roughing", tool_material: "carbide", tool_stickout_mm: 40, machine_power_kw: 1000 });
    const fresh = r.forces.deflection_um?.value ?? 0;
    const worn = r.forces.deflection_worn_um?.value ?? 0;
    expect(fresh).toBeGreaterThan(0);
    expect(worn / fresh).toBeCloseTo(1.9, 1);
  });

  it("uses the LOWER finishing VB limit (0.3) -> smaller worn-power growth (~1.45x) than roughing (~1.90x)", () => {
    const rough = calc({ cut_type: "roughing", tool_material: "carbide", machine_power_kw: 1000 });
    const finish = calc({ cut_type: "finishing", tool_material: "carbide", machine_power_kw: 1000 });
    const rRatio = rough.power.required_power_worn_kw!.value / rough.power.required_power_kw.value;
    const fRatio = finish.power.required_power_worn_kw!.value / finish.power.required_power_kw.value;
    expect(fRatio).toBeCloseTo(1.45, 1);
    expect(rRatio).toBeGreaterThan(fRatio);
  });

  it("fires an end-of-life STALL warning when the cut passes power budget fresh but exceeds it worn", () => {
    // Probe the fresh power with an unconstrained machine, then size the machine so fresh util ~80%
    // (<=90 -> passes) while worn util = 80*1.9 ~ 152% (>90 -> flips). available = machine_power*0.85.
    const freshPc = calc({ cut_type: "roughing", tool_material: "carbide", machine_power_kw: 1000 }).power.required_power_kw.value;
    const machinePower = (freshPc / 0.80) / 0.85;
    const r = calc({ cut_type: "roughing", tool_material: "carbide", machine_power_kw: machinePower });
    expect(r.power.is_within_budget).toBe(true); // passes FRESH (non-regression: headline verdict unchanged)
    expect(r.power.power_utilization_pct!.value).toBeLessThanOrEqual(90);
    expect(r.power.power_utilization_worn_pct!.value).toBeGreaterThan(90); // worn exceeds
    expect(r.warnings.join(" | ")).toMatch(/End-of-life STALL risk/i);
  });

  it("fires an end-of-life ACCURACY warning when deflection passes 50um fresh but exceeds it worn", () => {
    // m=1.9 -> the flip band for fresh deflection is (50/1.9, 50] = (26.3, 50]. Scan stickout (deflection
    // grows ~L^3) for a long thin tool until the fresh value lands in that band, then assert the worn warn.
    let chosen: ReturnType<typeof calc> | undefined;
    for (let L = 14; L <= 40; L += 1) {
      const r = calc({ cut_type: "roughing", tool_material: "carbide", tool_diameter_mm: 8, tool_stickout_mm: L, radial_depth_pct: 50 });
      const d = r.forces.deflection_um?.value;
      if (d !== undefined && d > 26.4 && d <= 50) { chosen = r; break; }
    }
    // a fresh deflection IN the flip band was found (proves the scan + the in-band condition)
    expect(chosen?.forces.deflection_um?.value ?? 0).toBeGreaterThan(26.4);
    expect(chosen!.forces.deflection_um!.value).toBeLessThanOrEqual(50); // passes fresh
    expect(chosen!.forces.deflection_worn_um!.value).toBeGreaterThan(50); // worn exceeds
    expect(chosen!.warnings.join(" | ")).toMatch(/End-of-life ACCURACY loss/i);
  });

  it("fires an end-of-life TORQUE warning when torque passes the machine limit fresh but exceeds it worn", () => {
    const freshT = calc({ cut_type: "roughing", tool_material: "carbide", machine_max_torque_nm: 100000 }).forces.torque_Nm.value;
    // limit so fresh torque <= 0.9*limit (passes) but worn = 1.9*fresh > 0.9*limit (flips):
    // 0.9*limit = 1.05*fresh -> fresh < 0.9*limit (pass), worn 1.9*fresh > 1.05*fresh (flip).
    const limit = (freshT / 0.9) * 1.05;
    const r = calc({ cut_type: "roughing", tool_material: "carbide", machine_max_torque_nm: limit });
    expect(r.warnings.join(" | ")).toMatch(/End-of-life TORQUE risk/i);
  });

  it("a softer tool (hss, Cw=2.0) grows worn power MORE than carbide (Cw=1.5) at the same VB", () => {
    const carbide = calc({ cut_type: "roughing", tool_material: "carbide", machine_power_kw: 1000 });
    const hss = calc({ cut_type: "roughing", tool_material: "hss", machine_power_kw: 1000 });
    const cRatio = carbide.power.required_power_worn_kw!.value / carbide.power.required_power_kw.value;
    const hRatio = hss.power.required_power_worn_kw!.value / hss.power.required_power_kw.value;
    expect(hRatio).toBeGreaterThan(cRatio); // ~2.2 vs ~1.9
  });

  it("CONSERVATIVE: every worn consequence is >= its fresh value (never relaxes a fresh verdict)", () => {
    const r = calc({ cut_type: "roughing", tool_material: "carbide", tool_stickout_mm: 40, machine_power_kw: 1000 });
    expect(r.power.required_power_worn_kw!.value).toBeGreaterThanOrEqual(r.power.required_power_kw.value);
    expect(r.forces.deflection_worn_um!.value).toBeGreaterThanOrEqual(r.forces.deflection_um!.value);
    expect(r.power.power_utilization_worn_pct!.value).toBeGreaterThanOrEqual(r.power.power_utilization_pct!.value);
  });

  it("NON-REGRESSION: the headline power verdict still runs on the FRESH force (worn is additive only)", () => {
    // A generous machine -> fresh passes; the worn fields are present and larger, but is_within_budget
    // and required_power_kw are unchanged by them (they reflect the fresh-tool cut).
    const r = calc({ cut_type: "roughing", tool_material: "carbide", machine_power_kw: 1000 });
    expect(r.power.is_within_budget).toBe(true);
    // the fresh headline power must be STRICTLY LESS than the worn value -> proves worn did not bleed
    // into (overwrite) the fresh headline field.
    expect(r.power.required_power_kw.value).toBeLessThan(r.power.required_power_worn_kw!.value);
    expect(r.forces.tangential_force_N.value).toBeGreaterThan(0);
  });

  it("a low-load cut well within budget gets the worn OUTPUTS but NO STALL flip warning", () => {
    const r = calc({ cut_type: "finishing", tool_material: "carbide", axial_depth_mm: 0.5, radial_depth_pct: 30, machine_power_kw: 1000 });
    // the worn output is always present for a milling cut, and is larger than fresh...
    expect(r.power.required_power_worn_kw!.value).toBeGreaterThan(r.power.required_power_kw.value);
    // ...but with a generous machine there is no flip, so no false STALL alarm.
    expect(r.warnings.join(" | ")).not.toMatch(/End-of-life STALL risk/i);
  });

  it("ADVERSARIAL: a drilling op gets NO worn power/deflection consequence outputs (guarded to milling/turning)", () => {
    const r = ultimateSpeedFeedEngine.calculate({ iso_group: "P", tool_diameter_mm: 8, operation: "drilling", hole_depth_mm: 30, machine_power_kw: 1000 } as never);
    expect(r.power.required_power_worn_kw).toBeUndefined();
    expect(r.power.power_utilization_worn_pct).toBeUndefined();
    expect(r.forces.deflection_worn_um).toBeUndefined();
  });
});
