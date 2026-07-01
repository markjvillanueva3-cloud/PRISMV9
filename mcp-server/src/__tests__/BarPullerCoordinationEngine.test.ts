import { describe, it, expect } from "vitest";
import {
  barPullerCoordinationEngine as eng,
  BarPullerCoordinationEngine,
  type BarPullerInput,
} from "../engines/BarPullerCoordinationEngine.js";

function nominal(o: Partial<BarPullerInput> = {}): BarPullerInput {
  return {
    bar_stock_diameter_mm: 25,
    bar_puller_stroke_mm: 200,
    bar_remaining_length_mm: 1000,
    part_length_mm: 50,
    puller_grip_force_n: 5000,
    axial_cut_force_n: 2000,
    chuck_open: true,
    z_rapid_max_mm: 300,
    ...o,
  };
}

describe("BarPullerCoordinationEngine", () => {
  it("exports singleton with verify()", () => {
    expect(eng).toBeInstanceOf(BarPullerCoordinationEngine);
    expect(typeof eng.verify).toBe("function");
  });

  it("throws on missing diameter/stroke", () => {
    expect(() => eng.verify({} as BarPullerInput)).toThrow(/bar_stock_diameter_mm \+ bar_puller_stroke_mm required/);
  });

  it("throws on missing part_length/grip/axial fields", () => {
    expect(() => eng.verify({ bar_stock_diameter_mm: 25, bar_puller_stroke_mm: 200 } as BarPullerInput))
      .toThrow(/part_length_mm \+ puller_grip_force_n \+ axial_cut_force_n required/);
  });

  it("throws on non-positive dimensions", () => {
    expect(() => eng.verify(nominal({ bar_stock_diameter_mm: 0 }))).toThrow(/positive bar_diameter \+ part_length \+ stroke/);
    expect(() => eng.verify(nominal({ part_length_mm: 0 }))).toThrow(/positive bar_diameter \+ part_length \+ stroke/);
  });

  it("throws on non-positive grip or negative axial", () => {
    expect(() => eng.verify(nominal({ puller_grip_force_n: 0 }))).toThrow(/positive puller_grip_force/);
    expect(() => eng.verify(nominal({ axial_cut_force_n: -1 }))).toThrow(/non-negative axial_cut_force/);
  });

  it("all-pass nominal → verified", () => {
    const r = eng.verify(nominal());
    expect(r.verdict).toBe("verified");
    expect(r.failure_reasons).toEqual([]);
    expect(r.checks.stock_sufficient.pass).toBe(true);
    expect(r.checks.puller_stroke.pass).toBe(true);
    expect(r.checks.puller_grip.pass).toBe(true);
    expect(r.checks.chuck_puller_sequencing.pass).toBe(true);
    expect(r.checks.z_clearance.pass).toBe(true);
  });

  it("parts_remaining_in_bar = ⌊(remaining - bar_end_min) / part_length⌋", () => {
    // (1000 - 150) / 50 = 17
    const r = eng.verify(nominal());
    expect(r.parts_remaining_in_bar.value).toBe(17);
  });

  it("low stock → bar_change_required verdict", () => {
    const r = eng.verify(nominal({ bar_remaining_length_mm: 180 }));  // 180 < 50+150=200
    expect(r.verdict).toBe("bar_change_required");
    expect(r.bar_change_required).toBe(true);
    expect(r.parts_remaining_in_bar.value).toBe(0);
    expect(r.warnings.some(w => /load new bar/.test(w))).toBe(true);
  });

  it("≤2 parts remaining → schedule bar change warning", () => {
    // (260 - 150) / 50 = 2.2 → 2 parts; stock_sufficient still true (260 ≥ 200)
    const r = eng.verify(nominal({ bar_remaining_length_mm: 260 }));
    expect(r.verdict).toBe("verified");
    expect(r.parts_remaining_in_bar.value).toBe(2);
    expect(r.warnings.some(w => /schedule bar change/.test(w))).toBe(true);
  });

  it("puller stroke < part + safety_clearance → rejected", () => {
    const r = eng.verify(nominal({ bar_puller_stroke_mm: 55 }));  // 55 < 50+10=60
    expect(r.verdict).toBe("rejected");
    expect(r.checks.puller_stroke.pass).toBe(false);
    expect(r.failure_reasons.some(f => /Puller stroke.*Iemca/.test(f))).toBe(true);
  });

  it("grip < axial × safety_factor → rejected (bar slip)", () => {
    // axial 2000 × 1.5 = 3000 required; provide 2500
    const r = eng.verify(nominal({ puller_grip_force_n: 2500 }));
    expect(r.verdict).toBe("rejected");
    expect(r.checks.puller_grip.pass).toBe(false);
    expect(r.failure_reasons.some(f => /Puller grip.*bar will slip/.test(f))).toBe(true);
  });

  it("chuck_open=false → UNSAFE (catastrophic 60kN binding)", () => {
    const r = eng.verify(nominal({ chuck_open: false }));
    expect(r.verdict).toBe("unsafe");
    expect(r.checks.chuck_puller_sequencing.pass).toBe(false);
    expect(r.failure_reasons.some(f => /Chuck CLOSED.*UNSAFE.*60.*kN/.test(f))).toBe(true);
  });

  it("unsafe verdict dominates over other failures", () => {
    const r = eng.verify(nominal({
      chuck_open: false,
      bar_puller_stroke_mm: 10,       // also rejected
      puller_grip_force_n: 100,        // also rejected
    }));
    expect(r.verdict).toBe("unsafe");
  });

  it("Z-rapid < required → rejected (Z-axis insufficient)", () => {
    const r = eng.verify(nominal({ z_rapid_max_mm: 30 }));  // < 50+10=60
    expect(r.verdict).toBe("rejected");
    expect(r.checks.z_clearance.pass).toBe(false);
    expect(r.failure_reasons.some(f => /Z-rapid window/.test(f))).toBe(true);
  });

  it("custom bar_end_minimum overrides default", () => {
    const r = eng.verify(nominal({ bar_remaining_length_mm: 300, bar_end_minimum_mm: 250 }));
    // (300 - 250)/50 = 1 part remaining; stock_sufficient = 300 ≥ 50+250 = 300 (=, pass)
    expect(r.parts_remaining_in_bar.value).toBe(1);
  });

  it("custom safety_clearance overrides default", () => {
    // 55 stroke + 30 clearance = 85 required, but stroke = 60 → rejected
    const r = eng.verify(nominal({ bar_puller_stroke_mm: 60, safety_clearance_mm: 30 }));
    expect(r.checks.puller_stroke.pass).toBe(false);
  });

  it("custom grip_safety_factor overrides default", () => {
    // axial 2000 × 2.0 = 4000 required, grip 5000 still ≥ → pass
    const r = eng.verify(nominal({ grip_safety_factor: 2.0 }));
    expect(r.checks.puller_grip.required_n).toBe(4000);
    expect(r.checks.puller_grip.pass).toBe(true);
  });

  it("safety_factor surfaced in grip check output", () => {
    const r = eng.verify(nominal({ grip_safety_factor: 1.8 }));
    expect(r.checks.puller_grip.safety_factor).toBe(1.8);
  });

  it("multiple non-sequencing failures accumulate", () => {
    const r = eng.verify(nominal({
      bar_puller_stroke_mm: 10,
      puller_grip_force_n: 100,
      z_rapid_max_mm: 10,
    }));
    expect(r.verdict).toBe("rejected");
    expect(r.failure_reasons.length).toBeGreaterThanOrEqual(3);
  });

  it("zero axial cut force → grip always passes (1.5 × 0 = 0)", () => {
    const r = eng.verify(nominal({ axial_cut_force_n: 0, puller_grip_force_n: 1 }));
    expect(r.checks.puller_grip.pass).toBe(true);
    expect(r.checks.puller_grip.required_n).toBe(0);
  });

  it("source cites Okuma + Mazak + Iemca + LNS + Sandvik", () => {
    const r = eng.verify(nominal());
    expect(r.source).toMatch(/Okuma|Mazak|Iemca|LNS|Sandvik/);
  });
});
