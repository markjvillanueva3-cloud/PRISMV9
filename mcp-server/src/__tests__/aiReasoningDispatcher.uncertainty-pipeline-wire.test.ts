/**
 * aiReasoningDispatcher uncertainty_pipeline_run wiring (U-UNCERTAINTY-PIPELINE-WIRE).
 *
 * Dark-facade fix: probed run/execute/process (none exist on
 * UncertaintyPropagationPipelineEngine) -> always "method not callable". Now routes to
 * the real `propagate`, which was given a self-guard (uncertain_params + stages must be
 * non-empty) so a bad call fails loud instead of crashing.
 */
import { describe, it, expect } from "vitest";
import { executeAIReasoningAction } from "../tools/dispatchers/aiReasoningDispatcher.js";

type AnyAction = Parameters<typeof executeAIReasoningAction>[0];

const validInput = {
  uncertain_params: [
    { name: "kc", mean: 1800, std_dev: 90, distribution: "normal" },
    { name: "ap", mean: 3, std_dev: 0.2, distribution: "normal" },
  ],
  stages: [
    { name: "force", model: "kienzle_force", fixed_params: { fz: 0.1, b: 5 } },
    { name: "deflection", model: "deflection", fixed_params: { length_mm: 40, dia_mm: 10 } },
  ],
  method: "mc",
  n_trials: 200,
};

describe("aiReasoningDispatcher uncertainty_pipeline_run — dark-action fix (real propagate)", () => {
  it("returns a real PipelineResult (stages/final/method at data.value), NOT 'method not callable'", async () => {
    const r = await executeAIReasoningAction("uncertainty_pipeline_run" as AnyAction, validInput);
    expect(JSON.stringify(r)).not.toMatch(/method not callable/i);
    expect(r.success).toBe(true);
    const av = r.data as { value: { stages: unknown[]; final: { mean: number; ci_95: number[] }; method: string; sensitivities: unknown[] } };
    expect(av.value.method).toBe("mc");
    expect(Array.isArray(av.value.stages)).toBe(true);
    expect(av.value.stages.length).toBe(2); // one StageResult per input stage
    expect(typeof av.value.final.mean).toBe("number");
    expect(Array.isArray(av.value.final.ci_95)).toBe(true);
    expect(Array.isArray(av.value.sensitivities)).toBe(true);
  });

  it("self-guard: empty uncertain_params is rejected (engine throws -> dispatcher error)", async () => {
    const r = await executeAIReasoningAction("uncertainty_pipeline_run" as AnyAction, { ...validInput, uncertain_params: [] });
    expect(r.success).toBe(false);
  });

  it("self-guard: empty stages is rejected", async () => {
    const r = await executeAIReasoningAction("uncertainty_pipeline_run" as AnyAction, { ...validInput, stages: [] });
    expect(r.success).toBe(false);
  });
});
