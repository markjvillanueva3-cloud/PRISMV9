import { describe, it, expect } from "vitest";
import {
  adaptiveMillingChipLoadMonitorEngine as eng,
  AdaptiveMillingChipLoadMonitorEngine,
  type ChipLoadMonitorInput,
} from "../engines/AdaptiveMillingChipLoadMonitorEngine.js";

function nominal(o: Partial<ChipLoadMonitorInput> = {}): ChipLoadMonitorInput {
  return {
    chip_load_target_mm_tooth: 0.10,
    spindle_load_baseline_pct: 60,
    spindle_load_current_pct: 60,
    mc_exponent: 0.25,  // typical steel
    tooth_pass_hz: 500,
    ...o,
  };
}

describe("AdaptiveMillingChipLoadMonitorEngine", () => {
  it("exports a singleton with estimate()", () => {
    expect(eng).toBeInstanceOf(AdaptiveMillingChipLoadMonitorEngine);
    expect(typeof eng.estimate).toBe("function");
  });

  it("throws on non-positive baselines", () => {
    expect(() => eng.estimate(nominal({ chip_load_target_mm_tooth: 0 }))).toThrow(/positive chip_load_target/);
    expect(() => eng.estimate(nominal({ spindle_load_baseline_pct: 0 }))).toThrow(/positive chip_load_target/);
  });

  it("throws on mc_exponent out of (0,1) range", () => {
    expect(() => eng.estimate(nominal({ mc_exponent: 0 }))).toThrow(/mc_exponent.*\(0, 1\)/);
    expect(() => eng.estimate(nominal({ mc_exponent: 1 }))).toThrow(/mc_exponent/);
  });

  it("within_envelope when current ≈ baseline (drift ≈ 0)", () => {
    const r = eng.estimate(nominal());
    expect(r.verdict).toBe("within_envelope");
    expect(r.drift_pct.value).toBe(0);
    expect(r.feed_override_pct.value).toBe(100);
    expect(r.chip_load_effective.value).toBeCloseTo(0.10, 4);
  });

  it("drifting when 15-30% spindle increase", () => {
    const r = eng.estimate(nominal({ spindle_load_current_pct: 75 }));  // 25% drift
    expect(r.verdict).toBe("drifting");
    expect(r.feed_override_pct.value).toBeLessThan(100);
    expect(r.feed_override_pct.value).toBeGreaterThan(50);
  });

  it("over_engaged when 30-60% spindle increase + reduce-feed warning", () => {
    const r = eng.estimate(nominal({ spindle_load_current_pct: 90 }));  // 50% drift
    expect(r.verdict).toBe("over_engaged");
    expect(r.warnings.some(w => /reduce feed/.test(w))).toBe(true);
  });

  it("critical when drift > 60% + feed=0 + pull-off warning", () => {
    const r = eng.estimate(nominal({ spindle_load_current_pct: 120 }));  // 100% drift
    expect(r.verdict).toBe("critical");
    expect(r.feed_override_pct.value).toBe(0);
    expect(r.warnings.some(w => /PULL OFF|breakage/.test(w))).toBe(true);
  });

  it("effective chip load > target when spindle load rises (Kienzle inverse)", () => {
    const r = eng.estimate(nominal({ spindle_load_current_pct: 80 }));  // 33% rise
    expect(r.chip_load_effective.value).toBeGreaterThan(0.10);
  });

  it("effective chip load < target when spindle load drops", () => {
    const r = eng.estimate(nominal({ spindle_load_current_pct: 45 }));  // -25%
    expect(r.chip_load_effective.value).toBeLessThan(0.10);
  });

  it("trend=rising when recent samples increase monotonically", () => {
    const r = eng.estimate(nominal({
      recent_samples_pct: [60, 62, 65, 70, 75, 78],
    }));
    expect(r.trend).toBe("rising");
  });

  it("trend=falling when recent samples decrease monotonically", () => {
    const r = eng.estimate(nominal({
      recent_samples_pct: [80, 75, 70, 65, 60, 55],
      spindle_load_current_pct: 55,
    }));
    expect(r.trend).toBe("falling");
  });

  it("trend=stable when samples flat (no rise/fall)", () => {
    const r = eng.estimate(nominal({
      recent_samples_pct: [60, 61, 60, 59, 60, 60],
    }));
    expect(r.trend).toBe("stable");
  });

  it("rising trend + drift triggers wear-progression warning", () => {
    const r = eng.estimate(nominal({
      spindle_load_current_pct: 75,
      recent_samples_pct: [60, 63, 66, 70, 72, 75],
    }));
    expect(r.warnings.some(w => /wear progression/.test(w))).toBe(true);
  });

  it("air-cut detected when spindle load below 5%", () => {
    const r = eng.estimate(nominal({ spindle_load_current_pct: 3 }));
    expect(r.warnings.some(w => /air cut/i.test(w))).toBe(true);
  });

  it("mc_exponent 0.20 (cast iron) vs 0.30 (steel) gives different effective chip", () => {
    const ci = eng.estimate(nominal({ mc_exponent: 0.20, spindle_load_current_pct: 80 }));
    const st = eng.estimate(nominal({ mc_exponent: 0.30, spindle_load_current_pct: 80 }));
    expect(ci.chip_load_effective.value).not.toBe(st.chip_load_effective.value);
  });

  it("source cites Sandvik AM + Altintas + Erdel + Kennametal", () => {
    const r = eng.estimate(nominal());
    expect(r.source).toMatch(/Sandvik|Altintas|Erdel|Kennametal/);
  });
});
