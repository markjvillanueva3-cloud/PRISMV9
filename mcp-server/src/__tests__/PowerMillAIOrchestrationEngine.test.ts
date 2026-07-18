/**
 * PowerMillAIOrchestrationEngine.test.ts
 *
 * Regression-lock for U-XRAY-POWERMILL-RECOMMEND-WIRE: the orchestrator's strategy step
 * used to call a NON-EXISTENT powerMillStrategyEngine.selectStrategy(), which threw at
 * runtime on every request -> the catch always fell back to the crude fallbackStrategy and
 * the real ranked recommend() engine was NEVER reached.
 *
 * These tests assert the orchestrator returns EXACTLY the real engine's rank-1 recommendation
 * (name + pm_operation_type + flattened parameters + rationale), computed independently from
 * powerMillStrategyEngine.recommend()/getParameters() — reference-value assertions, not presence
 * checks. The happy-path test fails on the pre-fix code (selectStrategy threw -> fallback name
 * != recommend() rank-1 name) and passes on the fix. The fallback test pins the catch path with
 * the exact fallbackStrategy output.
 */

import { describe, it, expect } from "vitest";
import { PowerMillAIOrchestrationEngine } from "../engines/PowerMillAIOrchestrationEngine.js";
import { powerMillStrategyEngine } from "../engines/PowerMillStrategyEngine.js";

const engine = new PowerMillAIOrchestrationEngine();

describe("PowerMillAIOrchestrationEngine — real recommend() strategy path", () => {
  it("returns EXACTLY the real engine's rank-1 strategy (name + operation + rationale)", async () => {
    // Independently compute what recommend() ranks #1 for the same mapped inputs
    // (orchestration machine_type "5axis" -> PM "5_axis_continuous", priority "balanced").
    const expected = powerMillStrategyEngine.recommend({
      feature_type: "cavity",
      material_group: "P",
      machine_type: "5_axis_continuous",
      priority: "balanced",
    })[0];

    const res = await engine.orchestrate({
      request_type: "strategy",
      feature_type: "cavity",
      material_iso: "P",
      machine_type: "5axis",
      priority: "balanced",
    });

    expect(res.engines_invoked.includes("PowerMillStrategyEngine")).toBe(true);
    expect(res.recommended_strategy?.name).toBe(expected.strategy_name);
    expect(res.recommended_strategy?.powermill_strategy).toBe(expected.pm_operation_type);
    expect(res.recommended_strategy?.rationale).toBe(
      `${expected.description} (rank ${expected.rank}, confidence ${expected.confidence.toFixed(2)})`,
    );
  });

  it("flattens the real getParameters() output into the response parameters Record", async () => {
    const expected = powerMillStrategyEngine.recommend({
      feature_type: "cavity",
      material_group: "P",
      machine_type: "5_axis_continuous",
      priority: "balanced",
    })[0];
    const ep = powerMillStrategyEngine.getParameters(expected.strategy_name);

    const res = await engine.orchestrate({
      request_type: "strategy",
      feature_type: "cavity",
      material_iso: "P",
      machine_type: "5axis",
    });
    const params = res.recommended_strategy?.parameters as Record<string, number | string | boolean>;

    if ("error" in ep) {
      expect(params.arc_fit).toBe(true);
    } else {
      // exact flattened scalars from the real PMStrategyParameters
      expect(params.ae_pct_of_diameter).toBe(ep.ae_pct_of_diameter);
      expect(params.ap_pct_of_diameter).toBe(ep.ap_pct_of_diameter);
      expect(params.fz_min_mm).toBe(ep.fz_range_mm[0]);
      expect(params.fz_max_mm).toBe(ep.fz_range_mm[1]);
      expect(params.coolant).toBe(ep.coolant);
      expect(params.cutting_mode).toBe(ep.cutting_mode);
    }
  });

  it("maps priority surface_finish -> PM 'quality' (output matches recommend with quality)", async () => {
    const expected = powerMillStrategyEngine.recommend({
      feature_type: "freeform",
      material_group: "S",
      machine_type: "5_axis_continuous",
      priority: "quality", // surface_finish maps here
    })[0];

    const res = await engine.orchestrate({
      request_type: "strategy",
      feature_type: "freeform",
      material_iso: "S",
      machine_type: "5axis",
      priority: "surface_finish",
    });
    expect(res.recommended_strategy?.name).toBe(expected.strategy_name);
  });

  it("maps machine 3axis -> PM '3_axis' (output matches recommend with 3_axis)", async () => {
    const expected = powerMillStrategyEngine.recommend({
      feature_type: "pocket",
      material_group: "P",
      machine_type: "3_axis",
      priority: "balanced",
    })[0];

    const res = await engine.orchestrate({
      request_type: "strategy",
      feature_type: "pocket",
      material_iso: "P",
      machine_type: "3axis",
    });
    expect(res.recommended_strategy?.name).toBe(expected.strategy_name);
  });

  it("FAILURE MODE: an un-strategizable feature degrades to the exact fallbackStrategy output", async () => {
    // recommend() returns [] for an unknown feature -> throw -> fallbackStrategy. For a generic
    // (non cavity/mold/surface) feature with default operation, fallback name is "Offset Area Clear".
    const res = await engine.orchestrate({
      request_type: "strategy",
      feature_type: "totally_unknown_feature_xyz",
      material_iso: "P",
      machine_type: "3axis",
    });
    expect(res.recommended_strategy?.name).toBe("Offset Area Clear");
    expect(res.recommended_strategy?.rationale).toBe(
      "Offset Area Clear for totally_unknown_feature_xyz on ISO P",
    );
    expect(res.engines_invoked.includes("PowerMillStrategyEngine")).toBe(false);
  });

  it("ADVERSARIAL: a non-strategy request_type (vortex) leaves recommended_strategy unset", async () => {
    const res = await engine.orchestrate({
      request_type: "vortex",
      material_iso: "P",
      tool_diameter_mm: 12,
    });
    expect(res.request_type).toBe("vortex");
    expect(res.recommended_strategy === undefined).toBe(true);
    expect(res.engines_invoked.includes("PowerMillStrategyEngine")).toBe(false);
  });
});

describe("PowerMillAIOrchestrationEngine — response envelope + reasoning chain", () => {
  it("echoes the requested reasoning_mode in the response", async () => {
    const res = await engine.orchestrate({
      request_type: "strategy",
      feature_type: "cavity",
      material_iso: "P",
      machine_type: "5axis",
      reasoning_mode: "tree_of_thought",
    });
    expect(res.reasoning_mode).toBe("tree_of_thought");
  });

  it("defaults reasoning_mode to chain_of_thought when omitted", async () => {
    const res = await engine.orchestrate({
      request_type: "strategy",
      feature_type: "cavity",
      material_iso: "P",
      machine_type: "5axis",
    });
    expect(res.reasoning_mode).toBe("chain_of_thought");
  });

  it("include_chain:false returns an empty reasoning_chain but still computes the strategy", async () => {
    const expected = powerMillStrategyEngine.recommend({
      feature_type: "cavity",
      material_group: "P",
      machine_type: "5_axis_continuous",
      priority: "balanced",
    })[0];
    const res = await engine.orchestrate({
      request_type: "strategy",
      feature_type: "cavity",
      material_iso: "P",
      machine_type: "5axis",
      include_chain: false,
    });
    expect(res.reasoning_chain.length).toBe(0);
    expect(res.recommended_strategy?.name).toBe(expected.strategy_name);
  });

  it("computes confidence as the rounded mean of the reasoning-chain step confidences", async () => {
    const res = await engine.orchestrate({
      request_type: "strategy",
      feature_type: "cavity",
      material_iso: "P",
      machine_type: "5axis",
    });
    const mean =
      res.reasoning_chain.reduce((acc, s) => acc + s.confidence, 0) / res.reasoning_chain.length;
    expect(res.confidence).toBe(Math.round(mean * 100) / 100);
  });

  it("a vortex request builds a VortexOptimizer reasoning step (and not a strategy step)", async () => {
    const res = await engine.orchestrate({
      request_type: "vortex",
      material_iso: "P",
      tool_diameter_mm: 12,
    });
    expect(res.reasoning_chain.some(s => s.source === "VortexOptimizer")).toBe(true);
    expect(res.reasoning_chain.some(s => s.source === "PowerMillStrategyEngine")).toBe(false);
  });

  it("always returns the engine itself in engines_invoked and an ISO-8601 timestamp", async () => {
    const res = await engine.orchestrate({
      request_type: "strategy",
      feature_type: "cavity",
      material_iso: "P",
      machine_type: "5axis",
    });
    expect(res.engines_invoked.includes("PowerMillAIOrchestrationEngine")).toBe(true);
    expect(res.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    expect(Number.isFinite(res.processing_time_ms)).toBe(true);
  });
});
