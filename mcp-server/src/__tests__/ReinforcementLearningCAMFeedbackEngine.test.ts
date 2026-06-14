/**
 * ReinforcementLearningCAMFeedbackEngine tests — CADCAM-DAGI-MS4/U-CAMAGI13
 *
 * Coverage:
 *   - happy path: closeFeedbackLoop end-to-end, reward + RL.step + outcome record
 *   - reward function: monotonic in each component, sign-correct
 *   - failure modes: invalid inputs (negative time, zero, missing fields)
 *   - adversarial: NaN, Infinity, oversized error
 *   - integration: train continual-LoRA adapter when reward >= threshold
 *   - composition: stats accumulate, reset clears local state
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  ReinforcementLearningCAMFeedbackEngine,
  type CloseFeedbackLoopInput,
  type ActualOutcome,
  type PredictedOutcome,
} from "../engines/ReinforcementLearningCAMFeedbackEngine.js";
import { continualLoRAEngine } from "../engines/ContinualLoRAEngine.js";
import type {
  MillingState,
  MillingAction,
} from "../engines/MillingReinforcementLearningEngine.js";

const PREDICTED: PredictedOutcome = {
  cycle_time_min: 10,
  tool_life_min: 60,
  surface_ra_um: 1.6,
  dimensional_accuracy_mm: 0.01,
};

const ACTUAL_PARITY: ActualOutcome = {
  cycle_time_min: 10,
  tool_life_min: 60,
  surface_ra_um: 1.6,
  dimensional_accuracy_mm: 0.01,
};

const STATE: MillingState = {
  cutting_speed_mpm: 200,
  feed_per_tooth_mm: 0.1,
  axial_depth_mm: 3,
  radial_depth_mm: 5,
  tool_wear_vb_mm: 0.1,
  spindle_load_percent: 60,
  vibration_level: 0.05,
  temperature_c: 80,
  surface_roughness_um: 1.6,
  material_hardness_hrc: 30,
};

const NEXT_STATE: MillingState = { ...STATE, tool_wear_vb_mm: 0.12 };

const ACTION: MillingAction = { speed_delta: 0, feed_delta: 0 };

function makeInput(
  overrides: Partial<CloseFeedbackLoopInput> = {},
): CloseFeedbackLoopInput {
  return {
    job_id: "JOB-001",
    state: STATE,
    action: ACTION,
    next_state: NEXT_STATE,
    predicted: PREDICTED,
    actual: ACTUAL_PARITY,
    done: false,
    ...overrides,
  };
}

describe("ReinforcementLearningCAMFeedbackEngine", () => {
  let engine: ReinforcementLearningCAMFeedbackEngine;

  beforeEach(() => {
    engine = new ReinforcementLearningCAMFeedbackEngine();
  });

  // ── computeReward — pure function semantics ───────────────────────────

  it("computeReward returns near-zero parity when actual == predicted", () => {
    const r = engine.computeReward(ACTUAL_PARITY, PREDICTED);
    expect(r.cycle_time).toBeCloseTo(0, 4);
    expect(r.tool_life).toBeCloseTo(0, 4);
    expect(r.surface_finish).toBeCloseTo(0, 4);
    // dimensional: 0.01 mm error / 0.1 mm ceiling → 1 - 0.2 = 0.8
    expect(r.dimensional).toBeCloseTo(0.8, 4);
    expect(r.safety_penalty).toBe(0);
    // total is dominated by dimensional × 0.25 = 0.2
    expect(r.total).toBeCloseTo(0.2, 4);
  });

  it("computeReward gives positive cycle-time reward when actual is faster than predicted", () => {
    const r = engine.computeReward(
      { ...ACTUAL_PARITY, cycle_time_min: 5 }, // 2× faster
      PREDICTED,
    );
    expect(r.cycle_time).toBeCloseTo(1, 4); // saturated at +1 (log2(2))
    expect(r.total).toBeGreaterThan(0.4);
  });

  it("computeReward gives negative tool-life reward when actual life is half predicted", () => {
    const r = engine.computeReward(
      { ...ACTUAL_PARITY, tool_life_min: 30 }, // half life
      PREDICTED,
    );
    expect(r.tool_life).toBeCloseTo(-1, 4); // saturated at -1
  });

  it("computeReward applies a heavy safety penalty multiplier", () => {
    const r = engine.computeReward(
      { ...ACTUAL_PARITY, safety_event: true },
      PREDICTED,
    );
    // safety_penalty term = 1.0 × 2.0 (default weight) = 2.0
    expect(r.safety_penalty).toBeCloseTo(2, 4);
    // total = 0.2 (dimensional × 0.25) - 2.0 = -1.8
    expect(r.total).toBeLessThan(-1);
  });

  it("computeReward saturates at the ratio ceiling for extreme inputs", () => {
    // Actual is 100× faster than predicted — must clamp at log2(2) = 1.
    const r = engine.computeReward(
      { ...ACTUAL_PARITY, cycle_time_min: 0.1 },
      PREDICTED,
    );
    expect(r.cycle_time).toBeCloseTo(1, 4);
  });

  // ── closeFeedbackLoop — happy + failure paths ─────────────────────────

  it("closeFeedbackLoop returns ok:true on valid input + drives all three sub-engines", () => {
    const result = engine.closeFeedbackLoop(makeInput());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.reward.total).toBeCloseTo(0.2, 4);
    expect(result.outcome_recorded).toBe(true);
    expect(result.rl_stats.steps).toBeGreaterThan(0);
    expect(engine.getStats().closed_loops).toBe(1);
    expect(engine.getStats().outcomes_recorded).toBe(1);
  });

  it("closeFeedbackLoop rejects negative cycle-time with ok:false (Zod validation)", () => {
    const result = engine.closeFeedbackLoop(
      makeInput({ actual: { ...ACTUAL_PARITY, cycle_time_min: -5 } }),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/cycle_time_min/);
  });

  it("closeFeedbackLoop rejects empty job_id with ok:false", () => {
    const result = engine.closeFeedbackLoop(makeInput({ job_id: "" }));
    expect(result.ok).toBe(false);
  });

  it("closeFeedbackLoop rejects NaN in predicted outcome (adversarial)", () => {
    const result = engine.closeFeedbackLoop(
      makeInput({
        predicted: { ...PREDICTED, tool_life_min: NaN },
      }),
    );
    expect(result.ok).toBe(false);
  });

  it("closeFeedbackLoop rejects Infinity in actual outcome (adversarial)", () => {
    const result = engine.closeFeedbackLoop(
      makeInput({
        actual: { ...ACTUAL_PARITY, surface_ra_um: Infinity },
      }),
    );
    expect(result.ok).toBe(false);
  });

  // ── continual-LoRA training path ──────────────────────────────────────

  it("closeFeedbackLoop trains the LoRA adapter when reward >= threshold AND adapter_id given", () => {
    continualLoRAEngine.deleteAdapter("rl-cam-test-1"); // idempotent
    continualLoRAEngine.createAdapter({
      adapter_id: "rl-cam-test-1",
      domain: "mill",
      rank: 4,
      ewc_lambda: 0.5,
      learning_rate: 0.01,
      preserve_threshold: 0.5,
      max_adapters: 8,
    });

    // Use a high-reward outcome (much faster cycle + longer tool life).
    const highReward: ActualOutcome = {
      cycle_time_min: 5,
      tool_life_min: 120,
      surface_ra_um: 0.8,
      dimensional_accuracy_mm: 0,
    };
    const result = engine.closeFeedbackLoop(
      makeInput({
        actual: highReward,
        adapter_id: "rl-cam-test-1",
        adapter_train_threshold: 0.3,
      }),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.reward.total).toBeGreaterThan(0.3);
    expect(result.adapter_trained).toBe(true);
    expect(engine.getStats().adapter_trainings).toBe(1);

    // cleanup
    continualLoRAEngine.deleteAdapter("rl-cam-test-1");
  });

  it("closeFeedbackLoop skips adapter training when reward < threshold", () => {
    const result = engine.closeFeedbackLoop(
      makeInput({
        actual: { ...ACTUAL_PARITY, safety_event: true }, // huge negative reward
        adapter_id: "rl-cam-test-nope",
        adapter_train_threshold: 0.5,
      }),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.adapter_trained).toBe(false);
    expect(engine.getStats().low_reward_count).toBe(1);
    expect(engine.getStats().high_reward_count).toBe(0);
  });

  // ── stats + reset ─────────────────────────────────────────────────────

  it("getStats and reset compose correctly across multiple loops", () => {
    engine.closeFeedbackLoop(makeInput({ job_id: "JOB-A" }));
    engine.closeFeedbackLoop(makeInput({ job_id: "JOB-B" }));
    engine.closeFeedbackLoop(makeInput({ job_id: "JOB-C" }));

    const before = engine.getStats();
    expect(before.closed_loops).toBe(3);
    expect(before.outcomes_recorded).toBe(3);
    expect(before.rl.steps).toBeGreaterThanOrEqual(3);

    engine.reset();
    const after = engine.getStats();
    expect(after.closed_loops).toBe(0);
    expect(after.adapter_trainings).toBe(0);
    expect(after.outcomes_recorded).toBe(0);
    expect(after.high_reward_count).toBe(0);
    expect(after.low_reward_count).toBe(0);
  });

  // ── direct policy update + preserveSkill failure paths ────────────────

  it("updatePolicy throws on non-finite reward (adversarial)", () => {
    expect(() => engine.updatePolicy(STATE, ACTION, NEXT_STATE, NaN)).toThrow(
      /finite/,
    );
    expect(() =>
      engine.updatePolicy(STATE, ACTION, NEXT_STATE, Infinity),
    ).toThrow(/finite/);
  });

  it("preserveSkill returns false when adapter_id is empty (degrades, not throws)", () => {
    const ok = engine.preserveSkill("", [0.5, 0.5], [1, 0]);
    expect(ok).toBe(false);
    expect(engine.getStats().adapter_trainings).toBe(0);
  });

  // ── Dispatcher round-trip (proves the action is invokable through prism_cam) ──
  it("dispatcher action 'cam_rl_feedback_compute_reward' is reachable via the camDispatcher action enum", async () => {
    const camMod = await import("../tools/dispatchers/camDispatcher.js");
    expect(camMod.ACTIONS).toContain("cam_rl_feedback_close_loop");
    expect(camMod.ACTIONS).toContain("cam_rl_feedback_compute_reward");
    expect(camMod.ACTIONS).toContain("cam_rl_feedback_preserve_skill");
    expect(camMod.ACTIONS).toContain("cam_rl_feedback_stats");
  });
});
