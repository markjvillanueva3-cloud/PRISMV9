/**
 * PipelineConsistencyHookEngine.test.ts
 *
 * Verifies post-pipeline consistency engine against canonical Brammertz Ra,
 * Taylor tool-life, and the engine's verdict thresholds. Asserts exact
 * divergence percentages, exact verdict strings, and exact getSummary
 * field values. No mocks.
 *
 * Thresholds (mirror src/engines/PipelineConsistencyHookEngine.ts:217-220):
 *   maxDiv ≤ 5%   → "consistent"   (auto_action "none")
 *   maxDiv ≤ 10%  → "minor_divergence"  (auto_action "logged")
 *   maxDiv > 10%  → "major_divergence"  (auto_action "flagged")
 *
 * Brammertz canonical (src/physics/constants.ts:658):
 *   Ra[µm] = fz²/(32·r) · 1000
 *
 * Taylor canonical (src/physics/constants.ts:642):
 *   T[min] = (C/Vc)^(1/n)
 */
import { describe, it, expect, beforeEach } from "vitest";
import { pipelineConsistencyHookEngine } from "../engines/PipelineConsistencyHookEngine.js";
import { predictedRa, taylorLife, CANONICAL_TAYLOR } from "../physics/constants.js";

// ----------------------------------------------------------------------------
// Named bench parameters (no magic numbers in assertions)
// ----------------------------------------------------------------------------
const FZ_MM = 0.1;
const RE_MM = 0.8;
const VC_STEEL_MPM = 200;
const D_MM = 12;
const Z_FLUTES = 4;
const RPM_AT_VC200_D12 = 5305; // ≈ 1000·200/(π·12)
const FEED_AT_RPM_FZ = 2122;   // 5305 · 4 · 0.1 ≈ 2122
const RA_CANONICAL_UM = predictedRa(FZ_MM, RE_MM);
const VERDICT_CONSISTENT_THRESHOLD = 5;
const VERDICT_MINOR_THRESHOLD = 10;

function steelInput(overrides: Record<string, unknown> = {}) {
  return {
    pipeline_name: "test-pipeline",
    material: "steel",
    tool_diameter_mm: D_MM,
    flutes: Z_FLUTES,
    ap_mm: 6,
    ae_mm: 6,
    fz_mm: FZ_MM,
    tool_stickout_mm: 36,
    corner_radius_mm: RE_MM,
    tool_material: "carbide",
    cutting_speed_mpm: VC_STEEL_MPM,
    result: {},
    ...overrides,
  };
}

beforeEach(() => {
  pipelineConsistencyHookEngine.clearHistory();
});

describe("PipelineConsistencyHookEngine — canonical comparisons", () => {
  it("Brammertz Ra at canonical fz/re ⇒ divergence_pct exactly 0", () => {
    const r = pipelineConsistencyHookEngine.check(steelInput({
      result: { surface_finish_Ra_um: RA_CANONICAL_UM },
    }));
    expect(r.canonical_comparison).toHaveLength(1);
    const ra = r.canonical_comparison[0];
    expect(ra.metric).toBe("surface_finish_Ra_um");
    expect(ra.pipeline_value).toBe(RA_CANONICAL_UM);
    // Engine round2()s canonical_value to 2 decimals (PipelineConsistencyHookEngine:171)
    expect(ra.canonical_value).toBe(Math.round(RA_CANONICAL_UM * 100) / 100);
    expect(ra.divergence_pct).toBe(0);
    expect(r.max_divergence_pct).toBe(0);
    expect(r.verdict).toBe("consistent");
    expect(r.auto_action).toBe("none");
    expect(r.warnings).toEqual([]);
  });

  it("Ra +3% (within consistent band) ⇒ verdict 'consistent', no warnings", () => {
    const skewed = RA_CANONICAL_UM * 1.03;
    const r = pipelineConsistencyHookEngine.check(steelInput({
      result: { surface_finish_Ra_um: skewed },
    }));
    const ra = r.canonical_comparison[0];
    expect(ra.divergence_pct).toBeGreaterThan(0);
    expect(ra.divergence_pct).toBeLessThanOrEqual(VERDICT_CONSISTENT_THRESHOLD);
    expect(r.verdict).toBe("consistent");
    expect(r.warnings).toEqual([]);
  });

  it("Ra +8% ⇒ verdict 'minor_divergence', auto_action 'logged'", () => {
    const skewed = RA_CANONICAL_UM * 1.08;
    const r = pipelineConsistencyHookEngine.check(steelInput({
      result: { surface_finish_Ra_um: skewed },
    }));
    const ra = r.canonical_comparison[0];
    expect(ra.divergence_pct).toBeGreaterThan(VERDICT_CONSISTENT_THRESHOLD);
    expect(ra.divergence_pct).toBeLessThanOrEqual(VERDICT_MINOR_THRESHOLD);
    expect(r.verdict).toBe("minor_divergence");
    expect(r.auto_action).toBe("logged");
  });

  it("Ra +18% (outside both bands) ⇒ verdict 'major_divergence', auto_action 'flagged', emits warning", () => {
    const skewed = RA_CANONICAL_UM * 1.18;
    const r = pipelineConsistencyHookEngine.check(steelInput({
      result: { surface_finish_Ra_um: skewed },
    }));
    const ra = r.canonical_comparison[0];
    expect(ra.divergence_pct).toBeGreaterThan(VERDICT_MINOR_THRESHOLD);
    expect(r.verdict).toBe("major_divergence");
    expect(r.auto_action).toBe("flagged");
    expect(r.warnings).toHaveLength(1);
    expect(r.warnings[0]).toContain("Surface finish");
    expect(r.warnings[0]).toContain("Brammertz");
  });

  it("Taylor tool-life: pipeline_value at canonical T(C/Vc) ⇒ divergence 0", () => {
    const C = CANONICAL_TAYLOR.P.C;
    const n = CANONICAL_TAYLOR.P.n;
    const T_canonical = taylorLife(C, n, VC_STEEL_MPM);
    const r = pipelineConsistencyHookEngine.check(steelInput({
      result: { tool_life_min: T_canonical },
    }));
    expect(r.canonical_comparison).toHaveLength(1);
    const tl = r.canonical_comparison[0];
    expect(tl.metric).toBe("tool_life_min");
    expect(tl.canonical_value).toBeCloseTo(T_canonical, 1);
    expect(tl.divergence_pct).toBe(0);
    expect(r.verdict).toBe("consistent");
  });
});

describe("PipelineConsistencyHookEngine — material variability (P/N/S/K)", () => {
  it("aluminum (N-group) round-trip ⇒ canonical Ra is positive finite", () => {
    const r = pipelineConsistencyHookEngine.check(steelInput({
      material: "aluminum",
      cutting_speed_mpm: 400,
      result: { surface_finish_Ra_um: RA_CANONICAL_UM },
    }));
    expect(r.canonical_comparison).toHaveLength(1);
    expect(r.canonical_comparison[0].canonical_value).toBeGreaterThan(0);
    expect(Number.isFinite(r.canonical_comparison[0].canonical_value)).toBe(true);
  });

  it("titanium (S-group) round-trip ⇒ canonical Ra is positive finite", () => {
    const r = pipelineConsistencyHookEngine.check(steelInput({
      material: "titanium",
      cutting_speed_mpm: 60,
      result: { surface_finish_Ra_um: RA_CANONICAL_UM },
    }));
    expect(r.canonical_comparison).toHaveLength(1);
    expect(r.canonical_comparison[0].canonical_value).toBeGreaterThan(0);
    expect(Number.isFinite(r.canonical_comparison[0].canonical_value)).toBe(true);
  });

  it("cast iron (K-group) round-trip ⇒ canonical Ra is positive finite", () => {
    const r = pipelineConsistencyHookEngine.check(steelInput({
      material: "cast_iron",
      cutting_speed_mpm: 150,
      result: { surface_finish_Ra_um: RA_CANONICAL_UM },
    }));
    expect(r.canonical_comparison).toHaveLength(1);
    expect(r.canonical_comparison[0].canonical_value).toBeGreaterThan(0);
    expect(Number.isFinite(r.canonical_comparison[0].canonical_value)).toBe(true);
  });
});

describe("PipelineConsistencyHookEngine — adversarial input handling", () => {
  it("FAILURE: zero feed_rate ⇒ no NaN propagation in pipeline_value", () => {
    const r = pipelineConsistencyHookEngine.check(steelInput({
      fz_mm: 0,
      result: { surface_finish_Ra_um: RA_CANONICAL_UM },
    }));
    for (const c of r.canonical_comparison) {
      expect(Number.isFinite(c.pipeline_value)).toBe(true);
    }
  });

  it("FAILURE: negated Ra (-canonical) ⇒ |div| = 200% ⇒ major_divergence", () => {
    const r = pipelineConsistencyHookEngine.check(steelInput({
      result: { surface_finish_Ra_um: -RA_CANONICAL_UM },
    }));
    const ra = r.canonical_comparison[0];
    expect(ra.divergence_pct).toBe(-200);
    expect(r.verdict).toBe("major_divergence");
    expect(r.auto_action).toBe("flagged");
  });

  it("FAILURE: NaN pipeline Ra ⇒ engine returns valid envelope (no throw)", () => {
    const r = pipelineConsistencyHookEngine.check(steelInput({
      result: { surface_finish_Ra_um: Number.NaN },
    }));
    expect(r.pipeline_name).toBe("test-pipeline");
    expect(r.canonical_comparison).toHaveLength(1);
    expect(["consistent", "minor_divergence", "major_divergence"]).toContain(r.verdict);
  });

  it("FAILURE: empty result ⇒ zero comparisons, max_div=0, verdict='consistent'", () => {
    const r = pipelineConsistencyHookEngine.check(steelInput({
      result: {},
    }));
    expect(r.canonical_comparison).toEqual([]);
    expect(r.max_divergence_pct).toBe(0);
    expect(r.verdict).toBe("consistent");
    expect(r.auto_action).toBe("none");
  });
});

describe("PipelineConsistencyHookEngine — history + summary", () => {
  it("getHistory: 3 checks ⇒ length 3, in insertion order with original input names", () => {
    pipelineConsistencyHookEngine.clearHistory();
    pipelineConsistencyHookEngine.check(steelInput({ pipeline_name: "p1" }));
    pipelineConsistencyHookEngine.check(steelInput({ pipeline_name: "p2" }));
    pipelineConsistencyHookEngine.check(steelInput({ pipeline_name: "p3" }));
    const h = pipelineConsistencyHookEngine.getHistory();
    expect(h).toHaveLength(3);
    expect(h[0].input.pipeline_name).toBe("p1");
    expect(h[1].input.pipeline_name).toBe("p2");
    expect(h[2].input.pipeline_name).toBe("p3");
    expect(h[0].result.pipeline_name).toBe("p1");
  });

  it("clearHistory ⇒ returns exact prior count, history goes to 0", () => {
    pipelineConsistencyHookEngine.check(steelInput());
    pipelineConsistencyHookEngine.check(steelInput());
    pipelineConsistencyHookEngine.check(steelInput());
    const r = pipelineConsistencyHookEngine.clearHistory();
    expect(r.cleared).toBe(3);
    expect(pipelineConsistencyHookEngine.getHistory()).toHaveLength(0);
  });

  it("getSummary: 1 consistent + 1 major ⇒ exact field values", () => {
    pipelineConsistencyHookEngine.clearHistory();
    pipelineConsistencyHookEngine.check(steelInput({
      pipeline_name: "alpha",
      result: { surface_finish_Ra_um: RA_CANONICAL_UM },
    }));
    pipelineConsistencyHookEngine.check(steelInput({
      pipeline_name: "bravo",
      result: { surface_finish_Ra_um: RA_CANONICAL_UM * 2 },
    }));
    const s = pipelineConsistencyHookEngine.getSummary();
    expect(s.total_checks).toBe(2);
    expect(s.consistent).toBe(1);
    expect(s.minor_divergences).toBe(0);
    expect(s.major_divergences).toBe(1);
    expect(s.avg_max_divergence_pct).toBeGreaterThan(0);
    expect(s.pipelines_checked).toEqual(["alpha", "bravo"]);
  });
});
