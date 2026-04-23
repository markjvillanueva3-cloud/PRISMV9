/**
 * SinkerEDMFlushingAdvisorEngine tests
 * P2P-FULLSTACK-MS0 / U-P2PFS55
 */
import { describe, it, expect } from "vitest";
import {
  SinkerEDMFlushingAdvisorEngine,
  sinkerEDMFlushingAdvisorEngine,
  type SinkerFlushInput,
} from "../../engines/SinkerEDMFlushingAdvisorEngine.js";
import type { PartFeature } from "../../engines/EDMDrawingInterpretationEngine.js";

function cavity(overrides: Partial<PartFeature> = {}): PartFeature {
  return {
    name: "Test cavity",
    type: "cavity",
    is_through: false,
    dimensions_mm: { length: 30, width: 20, depth: 15 },
    tolerance_mm: 0.01,
    surface_finish_ra_um: 1.6,
    ...overrides,
  };
}

function baseInput(overrides: Partial<SinkerFlushInput> = {}): SinkerFlushInput {
  return {
    feature: cavity(),
    burn_stage: "rough",
    electrode_material: "graphite_fine",
    ...overrides,
  };
}

describe("SinkerEDMFlushingAdvisorEngine", () => {
  it("exports a ready-to-use singleton", () => {
    expect(sinkerEDMFlushingAdvisorEngine).toBeInstanceOf(SinkerEDMFlushingAdvisorEngine);
  });

  it("throws when dimensions_mm is missing", () => {
    expect(() =>
      sinkerEDMFlushingAdvisorEngine.recommend({
        feature: { ...cavity(), dimensions_mm: undefined as unknown as PartFeature["dimensions_mm"] },
        burn_stage: "rough",
      }),
    ).toThrow(/dimensions_mm/);
  });

  it("throws when cavity depth is zero", () => {
    expect(() =>
      sinkerEDMFlushingAdvisorEngine.recommend(
        baseInput({ feature: cavity({ dimensions_mm: { length: 30, width: 20, depth: 0 } }) }),
      ),
    ).toThrow(/positive/);
  });

  it("recommends jet mode for shallow wide cavities on rough stage", () => {
    const out = sinkerEDMFlushingAdvisorEngine.recommend(baseInput());
    expect(out.mode).toBe("jet");
    expect(out.deep_cavity).toBe(false);
    expect(out.aspect_ratio).toBeCloseTo(15 / 20, 2);
  });

  it("recommends immersion for finish/super_finish stages", () => {
    const finish = sinkerEDMFlushingAdvisorEngine.recommend(
      baseInput({ burn_stage: "finish" }),
    );
    const superFinish = sinkerEDMFlushingAdvisorEngine.recommend(
      baseInput({ burn_stage: "super_finish" }),
    );
    expect(finish.mode).toBe("immersion");
    expect(superFinish.mode).toBe("immersion");
    // Pressure should be reduced for immersion
    expect(finish.pressure_bar).toBeLessThan(
      sinkerEDMFlushingAdvisorEngine.recommend(baseInput({ burn_stage: "rough" })).pressure_bar,
    );
  });

  it("recommends suction for through features deeper than 20 mm", () => {
    const out = sinkerEDMFlushingAdvisorEngine.recommend(
      baseInput({
        feature: cavity({
          is_through: true,
          dimensions_mm: { length: 30, width: 20, depth: 30 },
        }),
      }),
    );
    expect(out.mode).toBe("suction");
  });

  it("recommends pressure mode with warning for deep cavity lacking flush hole", () => {
    const out = sinkerEDMFlushingAdvisorEngine.recommend(
      baseInput({
        feature: cavity({
          dimensions_mm: { length: 20, width: 8, depth: 50 }, // AR = 50/8 = 6.25
        }),
      }),
    );
    expect(out.mode).toBe("pressure");
    expect(out.warnings.some((w) => /flush bore/i.test(w))).toBe(true);
  });

  it("recommends pressure mode without warning when electrode has flush hole", () => {
    const out = sinkerEDMFlushingAdvisorEngine.recommend(
      baseInput({
        feature: cavity({
          dimensions_mm: { length: 20, width: 10, depth: 40 }, // AR = 4
        }),
        electrode_flush_hole: true,
      }),
    );
    expect(out.mode).toBe("pressure");
    expect(out.warnings.some((w) => /add central.+flush bore/i.test(w))).toBe(false);
  });

  it("flags graphite dust recirculation on pressure mode", () => {
    const out = sinkerEDMFlushingAdvisorEngine.recommend(
      baseInput({
        feature: cavity({
          dimensions_mm: { length: 20, width: 10, depth: 40 },
        }),
        electrode_flush_hole: true,
        electrode_material: "graphite_fine",
      }),
    );
    expect(out.mode).toBe("pressure");
    expect(out.warnings.some((w) => /graphite/i.test(w))).toBe(true);
  });

  it("pressure scales with cavity depth", () => {
    const shallow = sinkerEDMFlushingAdvisorEngine.recommend(
      baseInput({ feature: cavity({ dimensions_mm: { length: 30, width: 20, depth: 5 } }) }),
    );
    const deep = sinkerEDMFlushingAdvisorEngine.recommend(
      baseInput({ feature: cavity({ dimensions_mm: { length: 30, width: 20, depth: 50 } }) }),
    );
    expect(deep.pressure_bar).toBeGreaterThan(shallow.pressure_bar);
  });

  it("flow rate is finite + positive", () => {
    const out = sinkerEDMFlushingAdvisorEngine.recommend(baseInput());
    expect(out.flow_rate_l_min).toBeGreaterThan(0);
    expect(Number.isFinite(out.flow_rate_l_min)).toBe(true);
  });

  it("provides at least one alternate strategy", () => {
    const out = sinkerEDMFlushingAdvisorEngine.recommend(baseInput({ burn_stage: "semi" }));
    expect(out.alternates.length).toBeGreaterThanOrEqual(1);
    for (const alt of out.alternates) {
      expect(alt.mode).not.toBe(out.mode); // alternates != chosen
      expect(alt.pressure_bar).toBeGreaterThan(0);
      expect(alt.tradeoff.length).toBeGreaterThan(0);
    }
  });

  it("base_pressure_override overrides depth-based calculation", () => {
    const out = sinkerEDMFlushingAdvisorEngine.recommend(
      baseInput({ base_pressure_override_bar: 5.0 }),
    );
    // Jet mode * 1.0 = 5.0
    expect(out.pressure_bar).toBeCloseTo(5.0, 2);
  });

  it("warns when jet mode is paired with finishing on deep cavity", () => {
    // Need: deep cavity, non-finish stage, jet mode → flag chip stacking.
    // Force jet mode by using AR between 3 and 5 without flush hole.
    const out = sinkerEDMFlushingAdvisorEngine.recommend(
      baseInput({
        burn_stage: "semi",
        feature: cavity({
          dimensions_mm: { length: 20, width: 10, depth: 35 }, // AR = 3.5
        }),
      }),
    );
    // AR 3.5, no flush hole → jet mode; deep_cavity true; should warn.
    expect(out.mode).toBe("jet");
    expect(out.deep_cavity).toBe(true);
    expect(out.warnings.some((w) => /chip stacking/i.test(w))).toBe(true);
  });

  it("pure — identical inputs → identical output", () => {
    const a = sinkerEDMFlushingAdvisorEngine.recommend(baseInput());
    const b = sinkerEDMFlushingAdvisorEngine.recommend(baseInput());
    expect(a).toEqual(b);
  });
});
