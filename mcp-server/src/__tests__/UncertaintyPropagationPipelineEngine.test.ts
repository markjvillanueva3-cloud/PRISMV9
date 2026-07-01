/**
 * UncertaintyPropagationPipelineEngine -- companion engine test (R15 completion
 * for U-UNCERTAINTY-PIPELINE-WIRE). Covers propagate() across all 3 methods
 * (mc / fosm / pce), the self-guard added this session (empty/missing
 * uncertain_params|stages -> throw), a multi-stage chain, and seeded determinism.
 */
import { describe, it, expect } from "vitest";
import {
  uncertaintyPropagationPipelineEngine as engine,
  type PipelineInput,
} from "../engines/UncertaintyPropagationPipelineEngine.js";

// One Kienzle-force stage with an uncertain kc1_1 (~5% CV) + fixed cut params.
// Deterministic base force = 1800 * 2 * 0.1^0.75 * 1 ~= 640.2 N.
function kienzleInput(over: Partial<PipelineInput> = {}): PipelineInput {
  return {
    uncertain_params: [{ name: "kc1_1", mean: 1800, std_dev: 90, distribution: "normal" }],
    stages: [{ name: "cutting_force", model: "kienzle_force", fixed_params: { mc: 0.25, depth_mm: 2, feed_mm: 0.1, tool_diameter_mm: 10 } }],
    method: "mc",
    n_trials: 2000,
    ...over,
  };
}

describe("UncertaintyPropagationPipelineEngine.propagate", () => {
  it("MC: returns the propagated force distribution near the analytic base", () => {
    const r = engine.propagate(kienzleInput());
    expect(r.value.method).toBe("mc");
    expect(r.value.final.mean).toBeGreaterThan(560);
    expect(r.value.final.mean).toBeLessThan(720); // ~640
    expect(r.value.final.std_dev).toBeGreaterThan(0);
  });

  it("MC: cv_pct reflects the ~5% input CV and ci_95 brackets the mean", () => {
    const r = engine.propagate(kienzleInput());
    const f = r.value.final;
    expect(f.cv_pct).toBeGreaterThan(2);
    expect(f.cv_pct).toBeLessThan(9);
    expect(f.ci_95[0]).toBeLessThan(f.mean);
    expect(f.ci_95[1]).toBeGreaterThan(f.mean);
    expect(f.ci_99[0]).toBeLessThan(f.ci_95[0]); // 99% wider than 95%
  });

  it("MC: emits a histogram + per-stage result", () => {
    const r = engine.propagate(kienzleInput());
    expect(r.value.histogram.length).toBeGreaterThan(0);
    expect(r.value.stages).toHaveLength(1);
    expect(r.value.stages[0].name).toBe("cutting_force");
  });

  it("MC is deterministic for identical input (seeded LHS)", () => {
    const a = engine.propagate(kienzleInput());
    const b = engine.propagate(kienzleInput());
    expect(a.value.final.mean).toBeCloseTo(b.value.final.mean, 9);
    expect(a.value.final.std_dev).toBeCloseTo(b.value.final.std_dev, 9);
  });

  it("FOSM: analytic first-order, confidence 0.70, no histogram", () => {
    const r = engine.propagate(kienzleInput({ method: "fosm" }));
    expect(r.value.method).toBe("fosm");
    expect(r.confidence).toBe(0.70);
    expect(r.value.histogram).toEqual([]);
    expect(r.value.final.std_dev).toBeGreaterThan(0);
  });

  it("PCE: spectral method with an mc/pce method_comparison", () => {
    const r = engine.propagate(kienzleInput({ method: "pce", pce_order: 2 }));
    expect(r.value.method).toBe("pce");
    expect(r.value.method_comparison).toHaveLength(2);
    expect(r.value.method_comparison!.map((m) => m.method).sort()).toEqual(["mc", "pce"]);
  });

  it("multi-stage chain (force -> deflection) maps the prior output forward", () => {
    const r = engine.propagate({
      uncertain_params: [{ name: "kc1_1", mean: 1800, std_dev: 90 }],
      stages: [
        { name: "cutting_force", model: "kienzle_force", fixed_params: { mc: 0.25, depth_mm: 2, feed_mm: 0.1, tool_diameter_mm: 10 } },
        { name: "tool_deflection", model: "deflection", fixed_params: { tool_diameter_mm: 10, overhang_mm: 40, elastic_modulus_gpa: 600 } },
      ],
      method: "mc",
      n_trials: 1500,
    });
    expect(r.value.stages).toHaveLength(2);
    expect(r.value.bottleneck_stage.length).toBeGreaterThan(0);
    // final stage is deflection (mm) -> small positive
    expect(r.value.final.mean).toBeGreaterThan(0);
  });

  it("sensitivities sum to ~100%", () => {
    const r = engine.propagate({
      uncertain_params: [
        { name: "kc1_1", mean: 1800, std_dev: 120 },
        { name: "feed_mm", mean: 0.1, std_dev: 0.02 },
      ],
      stages: [{ name: "cutting_force", model: "kienzle_force", fixed_params: { mc: 0.25, depth_mm: 2, tool_diameter_mm: 10 } }],
      method: "mc",
      n_trials: 1500,
    });
    const total = r.value.sensitivities.reduce((s, v) => s + v.contribution_pct, 0);
    expect(total).toBeCloseTo(100, 0);
    expect(r.value.dominant_parameter.length).toBeGreaterThan(0);
  });

  it("self-guard: empty uncertain_params throws", () => {
    expect(() => engine.propagate({ uncertain_params: [], stages: kienzleInput().stages })).toThrow(/uncertain_params/);
  });

  it("self-guard: missing uncertain_params throws", () => {
    expect(() => engine.propagate({ stages: kienzleInput().stages } as never)).toThrow(/uncertain_params/);
  });

  it("self-guard: empty stages throws", () => {
    expect(() => engine.propagate({ uncertain_params: kienzleInput().uncertain_params, stages: [] })).toThrow(/stages/);
  });

  it("self-guard: missing stages throws", () => {
    expect(() => engine.propagate({ uncertain_params: kienzleInput().uncertain_params } as never)).toThrow(/stages/);
  });

  it("runs the requested smaller trial count without error", () => {
    const r = engine.propagate(kienzleInput({ n_trials: 500 }));
    expect(r.value.final.mean).toBeGreaterThan(0);
    expect(r.unit).toBe("uncertainty_pipeline");
  });
});
