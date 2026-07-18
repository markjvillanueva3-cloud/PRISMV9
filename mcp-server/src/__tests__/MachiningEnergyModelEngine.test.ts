/**
 * MachiningEnergyModelEngine — engine-level unit test
 * ====================================================
 * Direct-engine tests of the math invariants (Gutowski energy + Kienzle force).
 * The wiring test (`machining-energy-model-wiring.test.ts`) exercises the
 * dispatcher round-trip; THIS test exercises the engine in isolation so a
 * regression can be localized to engine logic vs. wiring.
 *
 * Distinct-from-wiring focus areas:
 *   - AtomicValue envelope shape (unit/formula/confidence literals on the wrapper)
 *   - Kienzle force composition: kc1_1 × ap × hm^(1-mc) — directly from
 *     CANONICAL_KIENZLE (not via spread heuristics)
 *   - Algebraic identity: hm × hm^(-mc) === hm^(1-mc) (preserved through migration)
 *   - Per-ISO mc threading (was hardcoded 0.25 before U-WIRE-ENERGY)
 *   - Internal stage-by-stage power breakdown
 *   - Recommendation branch conditions (efficiency<30, sec>10)
 */

import { describe, it, expect } from "vitest";
import { machiningEnergyModelEngine, MachiningEnergyModelEngine, type MachiningEnergyInput } from "../engines/MachiningEnergyModelEngine.js";
import { CANONICAL_KIENZLE } from "../physics/constants.js";
import {
  DEFAULT_ELECTRICITY_COST_USD_PER_KWH,
  GRID_CO2_KG_PER_KWH,
  MAX_ELECTRICITY_COST_USD_PER_KWH,
  MAX_TOOL_CHANGES_PER_PART,
} from "../physics/sustainability-constants.js";

// Canonical: moderate aluminum cut. Real numbers — see wiring test for context.
const baseInput: MachiningEnergyInput = {
  cutting: { spindle_rpm: 6000, feed_rate_mmmin: 1200, axial_depth_mm: 5, radial_depth_mm: 8, cutting_speed_m_min: 150 },
  tool: { diameter_mm: 12, flute_count: 4 },
  material: { iso_group: "N", volume_to_remove_cm3: 100 },
  machine: { standby_power_kw: 4, spindle_efficiency: 0.85, axis_power_kw: 1.5, coolant_pump_kw: 2.5, atc_time_s: 5, tool_changes: 3 },
  coolant_type: "flood",
  electricity_cost_per_kwh: 0.12,
};

describe("MachiningEnergyModelEngine — direct engine tests", () => {
  // ──────────────────────────────────────────────────────────────────────────
  // CANONICAL CONSTANT SANITY GUARDS (U-WIRE-ENERGY P3 close — 2026-05-17 kilo)
  // ──────────────────────────────────────────────────────────────────────────
  // These four guards FAIL LOUDLY if the canonical sustainability constants
  // drift from their documented sources. Because the engine reads through to
  // these constants, the existing co2_kg / cost_energy behavioral tests
  // (which still pin literal 0.42 / 0.12) would silently track a constant
  // change — these guards explicitly assert the constant value itself, so a
  // drift surfaces as a focused failure naming the constant.
  it("GRID_CO2_KG_PER_KWH pinned to EPA eGRID 2022 US-grid average (0.42 kg CO2/kWh)", () => {
    expect(GRID_CO2_KG_PER_KWH).toBeCloseTo(0.42, 5);
  });
  it("DEFAULT_ELECTRICITY_COST_USD_PER_KWH pinned to US EIA industrial-tier avg (0.12 USD/kWh)", () => {
    expect(DEFAULT_ELECTRICITY_COST_USD_PER_KWH).toBeCloseTo(0.12, 5);
  });
  it("MAX_ELECTRICITY_COST_USD_PER_KWH sanity ceiling is $1.00/kWh (~2.5× highest US residential rate)", () => {
    expect(MAX_ELECTRICITY_COST_USD_PER_KWH).toBe(1.0);
  });
  it("MAX_TOOL_CHANGES_PER_PART sanity ceiling is 10000 (10× realistic worst-case)", () => {
    expect(MAX_TOOL_CHANGES_PER_PART).toBe(10000);
  });

  it("singleton export is a MachiningEnergyModelEngine instance with .compute()", () => {
    expect(machiningEnergyModelEngine).toBeInstanceOf(MachiningEnergyModelEngine);
    expect(typeof machiningEnergyModelEngine.compute).toBe("function");
  });

  it("AtomicValue envelope shape: returns {value, unit:'kWh', formula, confidence:0.8}", () => {
    const result = machiningEnergyModelEngine.compute(baseInput);
    expect(result.unit).toBe("kWh");
    expect(result.confidence).toBe(0.8);
    expect(typeof result.formula).toBe("string");
    expect(result.formula).toMatch(/Gutowski/);
    expect(result.value).toBeTypeOf("object");
  });

  it("MRR formula: mrr_cm3_min = ap × ae × feedrate / 1000 → cycle_time = volume / mrr × 1.15", () => {
    // ap=5, ae=8, fr=1200 → mrr = 5*8*1200/1000 = 48 cm³/min
    // For volume=100: cycleTime = 100/48 * 1.15 = 2.396 min
    const result = machiningEnergyModelEngine.compute(baseInput);
    expect(result.value.cycle_time_min).toBeCloseTo(2.396, 2);
  });

  it("uses CANONICAL_KIENZLE.kc1_1 — NOT inlined values (canonical N=700, NOT legacy KC11 N=800)", () => {
    // Direct algebraic check: Fc = kc1_1 * ap * hm^(1-mc)
    // canonical N: kc1_1=700, mc=0.22
    // fz = 1200/(6000*4) = 0.05; hm = 0.05 * sqrt(8/12) = 0.040825
    // hm^(1-0.22) = 0.040825^0.78 = 0.08267
    // Fc = 700 * 5 * 0.08267 = 289.3 N
    // spindlePower = 289.3 * 150 / 60000 = 0.7233 kW
    // h = 2.396/60 = 0.03993 hr; sE = 0.7233/0.85 * 0.03993 = 0.0340 kWh
    const result = machiningEnergyModelEngine.compute(baseInput);
    expect(result.value.spindle_kwh).toBeCloseTo(0.0340, 3);
    // Sanity: the legacy inline-KC11 N=800 mc=0.25 path would have produced ~0.043 kWh
    // (hm^0.75 = 0.0908, Fc = 800*5*0.0908 = 363 N → spindlePower 0.908 kW → sE 0.0426).
    // The canonical value (0.0340) is materially BELOW the legacy value (0.0426)
    // — proves the canonical migration reached the engine output.
    expect(result.value.spindle_kwh).toBeLessThan(0.040);
  });

  it("per-ISO mc threading: K (canonical mc=0.28) yields DIFFERENT Fc than M (canonical mc=0.25) at matched kc1_1·ap·fz", () => {
    // Force identical kc11 by using same iso but vary mc only — not directly
    // possible since mc is tied to iso. Instead: at identical cutting params,
    // K (kc1_1=1100, mc=0.28) vs M (kc1_1=2100, mc=0.25). Verify mc reaches
    // the engine by checking that the spindle_kwh ratio is NOT simply the
    // kc1_1 ratio — if mc were stuck at 0.25, the ratio would be exactly
    // 2100/1100 = 1.909.
    const kRes = machiningEnergyModelEngine.compute({ ...baseInput, material: { iso_group: "K", volume_to_remove_cm3: 100 } });
    const mRes = machiningEnergyModelEngine.compute({ ...baseInput, material: { iso_group: "M", volume_to_remove_cm3: 100 } });
    const ratio = mRes.value.spindle_kwh / kRes.value.spindle_kwh;
    // mc=0.25 for both would give exact kc1_1 ratio 2100/1100 ≈ 1.909.
    // Different mc breaks that — they're NOT proportional to kc1_1 alone.
    const kc11Ratio = CANONICAL_KIENZLE.M.kc1_1 / CANONICAL_KIENZLE.K.kc1_1;
    expect(ratio).not.toBeCloseTo(kc11Ratio, 2);
  });

  it("coolant_type='flood' draws coolant_pump_kw; 'mist'=0.5; 'mql'=0.3; 'dry'=0 (fixed engine table)", () => {
    const flood = machiningEnergyModelEngine.compute({ ...baseInput, coolant_type: "flood" });
    const mist = machiningEnergyModelEngine.compute({ ...baseInput, coolant_type: "mist" });
    const mql = machiningEnergyModelEngine.compute({ ...baseInput, coolant_type: "mql" });
    const dry = machiningEnergyModelEngine.compute({ ...baseInput, coolant_type: "dry" });
    // h ≈ 0.03993; flood = 2.5 * h ≈ 0.0998; mist = 0.5*h ≈ 0.0200; mql = 0.3*h ≈ 0.0120; dry = 0
    expect(flood.value.coolant_kwh).toBeCloseTo(2.5 * (2.396 / 60), 3);
    expect(mist.value.coolant_kwh).toBeCloseTo(0.5 * (2.396 / 60), 3);
    expect(mql.value.coolant_kwh).toBeCloseTo(0.3 * (2.396 / 60), 3);
    expect(dry.value.coolant_kwh).toBe(0);
  });

  it("idle energy: iE = standby_power_kw × h × 0.1 (10% idle factor)", () => {
    const r = machiningEnergyModelEngine.compute(baseInput);
    // standby=4 kW, h=2.396/60 ≈ 0.03993 hr, factor=0.1
    const expectedIdle = 4 * (2.396 / 60) * 0.1;
    expect(r.value.idle_kwh).toBeCloseTo(expectedIdle, 3);
  });

  it("ATC energy: atcE = standby_power_kw × (atc_time_s × tool_changes / 3600)", () => {
    const r = machiningEnergyModelEngine.compute(baseInput);
    // standby=4, atc_time=5s, tool_changes=3 → atcH = 5*3/3600 = 0.00417
    // atcE = 4 * 0.00417 = 0.01667
    expect(r.value.atc_kwh).toBeCloseTo(0.01667, 3);
    // Zero tool changes → zero ATC.
    const zeroAtc = machiningEnergyModelEngine.compute({ ...baseInput, machine: { ...baseInput.machine, tool_changes: 0 } });
    expect(zeroAtc.value.atc_kwh).toBe(0);
  });

  it("CO2 factor 0.42 (US grid emission): co2_kg = total_kwh × 0.42, rounded to 3dp", () => {
    const r = machiningEnergyModelEngine.compute(baseInput);
    expect(r.value.co2_kg).toBeCloseTo(r.value.total_kwh * 0.42, 2);
  });

  it("cost_energy: electricity_cost_per_kwh propagates linearly (and defaults to 0.12 when omitted)", () => {
    const r020 = machiningEnergyModelEngine.compute({ ...baseInput, electricity_cost_per_kwh: 0.20 });
    expect(r020.value.cost_energy).toBeCloseTo(r020.value.total_kwh * 0.20, 3);
    const { electricity_cost_per_kwh: _, ...noPrice } = baseInput;
    const rDefault = machiningEnergyModelEngine.compute(noPrice as MachiningEnergyInput);
    expect(rDefault.value.cost_energy).toBeCloseTo(rDefault.value.total_kwh * 0.12, 3);
  });

  it("spindle_efficiency default: machine.spindle_efficiency ?? 0.85 (omission ≡ explicit 0.85)", () => {
    const { spindle_efficiency: _e, ...machineNoEff } = baseInput.machine;
    const omitted = machiningEnergyModelEngine.compute({ ...baseInput, machine: machineNoEff });
    const explicit = machiningEnergyModelEngine.compute(baseInput);
    expect(omitted.value.spindle_kwh).toBe(explicit.value.spindle_kwh);
  });

  it("recommendation branch: efficiency<30 triggers a 'Low cutting efficiency' string", () => {
    // Engineered to trip ONLY the efficiency branch — small cut, big standby.
    const r = machiningEnergyModelEngine.compute({
      ...baseInput,
      machine: { ...baseInput.machine, standby_power_kw: 50 },
      cutting: { ...baseInput.cutting, feed_rate_mmmin: 60, axial_depth_mm: 0.5, radial_depth_mm: 1 },
    });
    expect(r.value.efficiency_pct).toBeLessThan(30);
    expect(r.value.recommendations.some(s => /efficiency/i.test(s))).toBe(true);
  });

  it("recommendation branch: sec>10 triggers an 'SEC' string (independent of efficiency branch)", () => {
    // Tiny volume + flooded coolant → SEC inflates above 10 J/mm³.
    const r = machiningEnergyModelEngine.compute({
      ...baseInput,
      material: { iso_group: "N", volume_to_remove_cm3: 0.5 },
    });
    expect(r.value.sec_j_mm3).toBeGreaterThan(10);
    expect(r.value.recommendations.some(s => /SEC/.test(s))).toBe(true);
  });

  it("hardened material span: H (canonical kc1_1=3200) yields STRICTLY max spindle_kwh among P/M/K/N/S/H", () => {
    const isos = ["P", "M", "K", "N", "S", "H"] as const;
    const map = new Map<string, number>();
    for (const g of isos) {
      const r = machiningEnergyModelEngine.compute({ ...baseInput, material: { iso_group: g, volume_to_remove_cm3: 100 } });
      map.set(g, r.value.spindle_kwh);
    }
    const sorted = [...map.entries()].sort((a, b) => b[1] - a[1]);
    expect(sorted[0][0]).toBe("H");
  });

  it("totals identity: total_kwh ≈ spindle + axis + coolant + idle + atc (sum-of-legs invariant)", () => {
    const r = machiningEnergyModelEngine.compute(baseInput).value;
    const sum = r.spindle_kwh + r.axis_kwh + r.coolant_kwh + r.idle_kwh + r.atc_kwh;
    expect(Math.abs(sum - r.total_kwh)).toBeLessThan(5e-4);
  });
});
