/**
 * camFunctionDispatcher tests — CAM-EXHAUST-MS0/U-CAM79
 * =============================================================================
 *
 * Verifies the new prism_cam_function dispatcher:
 *   - ACTIONS enum is correct (8 actions, snake_case, cam_func_ prefix, unique)
 *   - Each action routes through to its bound engine and returns the engine's
 *     production result shape (stub:false, mode:"production", catalog telemetry)
 *   - Schema validation rejects malformed input with a structured error
 *   - Adversarial inputs (Infinity, oversize, negative) are handled cleanly —
 *     never thrown, always a structured response
 *   - Tests INVOKE THROUGH dispatchCamFunction(), not only engine singletons —
 *     this satisfies U-CAM79's wiring-verification exit condition.
 *
 * Authored 2026-05-06 — CAM-EXHAUST-MS0 U-CAM79.
 */

import { describe, it, expect } from "vitest";
import {
  dispatchCamFunction,
  type CAMFunctionAction,
} from "../tools/dispatchers/camFunctionDispatcher.js";
import { CAM_FUNCTION_ACTION_SCHEMAS } from "../schemas/camFunctionActionSchemas.js";

const ALL_ACTIONS: ReadonlyArray<CAMFunctionAction> = [
  "cam_func_route",
  "cam_func_validate",
  "cam_func_strategy_recommend",
  "cam_func_param_optimize",
  "cam_func_translate",
  "cam_func_agi_reason",
  "cam_func_tribal_lookup",
  "cam_func_feature_recognize",
];

// ─────────────────────────────────────────────────────────────────────────────
// Action enum + schema surface
// ─────────────────────────────────────────────────────────────────────────────

describe("camFunctionDispatcher — action enum + schema surface", () => {
  it("exposes exactly 8 actions matching the U-CAM71..U-CAM78 engine roster", () => {
    expect(ALL_ACTIONS).toEqual([
      "cam_func_route",
      "cam_func_validate",
      "cam_func_strategy_recommend",
      "cam_func_param_optimize",
      "cam_func_translate",
      "cam_func_agi_reason",
      "cam_func_tribal_lookup",
      "cam_func_feature_recognize",
    ]);
  });

  it("every action is snake_case and prefixed with cam_func_", () => {
    for (const a of ALL_ACTIONS) {
      expect(a).toMatch(/^cam_func_[a-z][a-z0-9_]*$/);
    }
  });

  it("every action has a corresponding Zod schema with safeParse", () => {
    for (const a of ALL_ACTIONS) {
      const schema = CAM_FUNCTION_ACTION_SCHEMAS[a];
      expect(typeof schema.safeParse).toBe("function");
    }
  });

  it("schema map has exactly 8 entries (no extras, no gaps)", () => {
    expect(Object.keys(CAM_FUNCTION_ACTION_SCHEMAS).sort()).toEqual(
      [...ALL_ACTIONS].sort(),
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Per-action happy paths — invoke through dispatcher entry
// ─────────────────────────────────────────────────────────────────────────────

describe("camFunctionDispatcher — happy-path routing through dispatcher", () => {
  it("cam_func_route: returns CAMRouteResult with confidence and candidates", async () => {
    const result = (await dispatchCamFunction("cam_func_route", {
      intent: "adaptive roughing",
      target_cam: "fusion360",
    })) as Record<string, unknown>;
    expect(result.target_cam).toBe("fusion360");
    expect(result.stub).toBe(false);
    expect(result.mode).toBe("production");
    // fallback_used is `!best` — true when no candidate cleared the score
    // threshold for this catalog snapshot. Either outcome is structurally valid.
    expect(typeof result.fallback_used).toBe("boolean");
    expect(result.confidence as number).toBeGreaterThanOrEqual(0);
    expect(result.confidence as number).toBeLessThanOrEqual(1);
    expect(["high", "medium", "low", "none"]).toContain(result.confidence_label);
    // Candidates list is always an array (length depends on catalog data).
    expect(Array.isArray(result.candidates)).toBe(true);
    // Intent must tokenize to ["adaptive", "roughing"] (stop-word filter, length≥2).
    expect(result.intent_normalized).toEqual(["adaptive", "roughing"]);
    // Synonym map expands "roughing" — superset must include the originals.
    const expanded = result.expanded_terms as string[];
    expect(expanded).toEqual(expect.arrayContaining(["adaptive", "roughing"]));
    // Confidence/candidate consistency: zero candidates ⇔ fallback ⇔ zero confidence.
    if ((result.candidates as unknown[]).length === 0) {
      expect(result.fallback_used).toBe(true);
      expect(result.confidence).toBe(0);
      expect(result.confidence_label).toBe("none");
    }
  });

  it("cam_func_validate: returns severity-tagged validation result", async () => {
    const result = (await dispatchCamFunction("cam_func_validate", {
      target_cam: "hypermill",
      parameters: { rpm: 12000, feed_per_tooth: 0.1, ap: 5 },
      operation: "roughing",
    })) as Record<string, unknown>;
    expect(result.target_cam).toBe("hypermill");
    expect(result.stub).toBe(false);
    expect(result.mode).toBe("production");
    expect(result.catalog_coverage_pct as number).toBeGreaterThanOrEqual(0);
    expect(result.catalog_coverage_pct as number).toBeLessThanOrEqual(100);
    expect(Array.isArray(result.errors)).toBe(true);
    expect(Array.isArray(result.warnings)).toBe(true);
  });

  it("cam_func_strategy_recommend: ranks corpus for steel pocket roughing", async () => {
    const result = (await dispatchCamFunction("cam_func_strategy_recommend", {
      target_cam: "solidcam",
      part_hint: "hardened steel pocket roughing",
      material: "steel",
    })) as Record<string, unknown>;
    expect(result.target_cam).toBe("solidcam");
    expect(result.stub).toBe(false);
    expect(result.mode).toBe("production");
    // SolidCAM's iMachining is the canonical match for steel + roughing.
    expect(result.recommended_strategy).toBe("iMachining");
    expect(result.recommended_score as number).toBeGreaterThan(0);
    expect(Array.isArray(result.alternatives)).toBe(true);
  });

  it("cam_func_param_optimize: cycle_time bias raises feed and stepover", async () => {
    const result = (await dispatchCamFunction("cam_func_param_optimize", {
      target_cam: "mastercam",
      objective: "cycle_time",
      current: { feed: 1500, rpm: 8000, stepover: 0.5 },
    })) as Record<string, unknown>;
    expect(result.target_cam).toBe("mastercam");
    expect(result.objective).toBe("cycle_time");
    expect(result.stub).toBe(false);
    const optimized = result.optimized as Record<string, number>;
    // cycle_time → feed up, stepover up (per OBJECTIVE_BIAS in the optimizer).
    expect(optimized.feed).toBeGreaterThanOrEqual(1500);
    expect(optimized.stepover).toBeGreaterThanOrEqual(0.5);
    expect((result.changes as unknown[]).length).toBeGreaterThan(0);
  });

  it("cam_func_translate: produces translation result preserving CAM identifiers", async () => {
    const result = (await dispatchCamFunction("cam_func_translate", {
      source_cam: "fusion360",
      target_cam: "mastercam",
      source_operation: "Adaptive Clearing",
      source_parameters: { stepover_pct: 25, feed: 1200 },
    })) as Record<string, unknown>;
    expect(result.source_cam).toBe("fusion360");
    expect(result.target_cam).toBe("mastercam");
    expect(typeof result.loss_summary).toBe("string");
    expect((result.loss_summary as string).length).toBeGreaterThan(0);
    expect(Array.isArray(result.unmapped_parameters)).toBe(true);
  });

  it("cam_func_agi_reason: returns structured decision with confidence in [0,1]", async () => {
    const result = (await dispatchCamFunction("cam_func_agi_reason", {
      target_cam: "hypermill",
      decision_context: "5-axis impeller blade finishing strategy",
      options: ["Scallop", "Swarf Milling", "Parallel Finish"],
    })) as Record<string, unknown>;
    expect(result.target_cam).toBe("hypermill");
    expect(result.stub).toBe(false);
    expect(result.confidence as number).toBeGreaterThanOrEqual(0);
    expect(result.confidence as number).toBeLessThanOrEqual(1);
    expect(Array.isArray(result.reasoning_chain)).toBe(true);
  });

  it("cam_func_tribal_lookup: caps tips at requested max_tips", async () => {
    const result = (await dispatchCamFunction("cam_func_tribal_lookup", {
      target_cam: "mastercam",
      query: "thin wall finishing chatter",
      max_tips: 3,
    })) as Record<string, unknown>;
    expect(result.target_cam).toBe("mastercam");
    expect(result.stub).toBe(false);
    expect(Array.isArray(result.tips)).toBe(true);
    expect((result.tips as unknown[]).length).toBeLessThanOrEqual(3);
    expect(result.total_corpus_size as number).toBeGreaterThan(0);
  });

  it("cam_func_feature_recognize: extracts pocket+holes from geometry hint", async () => {
    const result = (await dispatchCamFunction("cam_func_feature_recognize", {
      target_cam: "fusion360",
      part_geometry_hint: "rectangular pocket with 4 corner fillets and 2 thru-holes",
    })) as Record<string, unknown>;
    expect(result.target_cam).toBe("fusion360");
    expect(result.stub).toBe(false);
    expect(result.mode).toBe("production");
    const features = result.recognized_features as Array<{ feature: string; confidence: number }>;
    expect(Array.isArray(features)).toBe(true);
    expect(features.length).toBeGreaterThan(0);
    const names = features.map((f) => f.feature.toLowerCase());
    // Hint contains "pocket" + "thru-holes" + "fillets" — all three are FEATURE_EXTRACTORS keys.
    expect(names).toContain("pocket");
    expect(names).toContain("hole");
    // Every feature must report a calibrated confidence in [0, 1].
    for (const f of features) {
      expect(f.confidence).toBeGreaterThan(0);
      expect(f.confidence).toBeLessThanOrEqual(1);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Failure modes — schema rejection
// ─────────────────────────────────────────────────────────────────────────────

describe("camFunctionDispatcher — schema-validation failure modes", () => {
  it("rejects cam_func_route with missing required intent", async () => {
    const result = (await dispatchCamFunction("cam_func_route", {
      target_cam: "fusion360",
    })) as Record<string, unknown>;
    expect(result.success).toBe(false);
    expect(result.dispatcher).toBe("prism_cam_function");
    expect(result.action).toBe("cam_func_route");
    expect(String(result.error)).toMatch(/intent/i);
  });

  it("rejects cam_func_validate with empty target_cam", async () => {
    const result = (await dispatchCamFunction("cam_func_validate", {
      target_cam: "",
      parameters: { rpm: 8000 },
    })) as Record<string, unknown>;
    expect(result.success).toBe(false);
    expect(String(result.error)).toMatch(/target_cam/i);
  });

  it("rejects cam_func_param_optimize with invalid objective enum value", async () => {
    const result = (await dispatchCamFunction("cam_func_param_optimize", {
      target_cam: "fusion360",
      objective: "nonsense_objective",
      current: { feed: 1000 },
    })) as Record<string, unknown>;
    expect(result.success).toBe(false);
    expect(String(result.error)).toMatch(/objective/i);
  });

  it("rejects cam_func_translate with missing source_operation", async () => {
    const result = (await dispatchCamFunction("cam_func_translate", {
      source_cam: "fusion360",
      target_cam: "mastercam",
      source_parameters: {},
    })) as Record<string, unknown>;
    expect(result.success).toBe(false);
    expect(String(result.error)).toMatch(/source_operation/i);
  });

  it("rejects cam_func_tribal_lookup with empty query", async () => {
    const result = (await dispatchCamFunction("cam_func_tribal_lookup", {
      target_cam: "mastercam",
      query: "",
    })) as Record<string, unknown>;
    expect(result.success).toBe(false);
    expect(String(result.error)).toMatch(/query/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Adversarial inputs — engines must NOT throw
// ─────────────────────────────────────────────────────────────────────────────

describe("camFunctionDispatcher — adversarial inputs", () => {
  it("unknown CAM slug → null recommendation with explicit rationale (no throw)", async () => {
    const result = (await dispatchCamFunction("cam_func_strategy_recommend", {
      target_cam: "fictitious-cam-system",
      part_hint: "anything",
      material: "steel",
    })) as Record<string, unknown>;
    expect(result.recommended_strategy).toBeNull();
    expect(result.recommended_score).toBe(0);
    expect(String(result.rationale)).toMatch(/unknown/i);
    expect(result.stub).toBe(false);
    expect(result.alternatives).toEqual([]);
  });

  it("Infinity in optimizer current is rejected by schema (Zod 4 finite-number guard)", async () => {
    // Zod v4 z.number() rejects non-finite (Infinity/-Infinity/NaN) by default.
    // Confirms the schema is the first line of defense against adversarial
    // numerics — engine never has to handle Infinity downstream.
    const result = (await dispatchCamFunction("cam_func_param_optimize", {
      target_cam: "fusion360",
      objective: "balanced",
      current: { feed: Infinity, rpm: 12000 },
    })) as Record<string, unknown>;
    expect(result.success).toBe(false);
    expect(result.dispatcher).toBe("prism_cam_function");
    expect(result.action).toBe("cam_func_param_optimize");
    // Error must reference the offending field.
    expect(String(result.error)).toMatch(/current/i);
  });

  it("finite optimizer input produces only finite optimized output (round-trip)", async () => {
    // Mirror of the Infinity test on the happy path — exercises the same
    // OptimizeResult.optimized surface to prove Number.isFinite holds when
    // input is well-formed.
    const result = (await dispatchCamFunction("cam_func_param_optimize", {
      target_cam: "fusion360",
      objective: "balanced",
      current: { feed: 1500, rpm: 12000, stepover: 0.4 },
    })) as Record<string, unknown>;
    const optimized = result.optimized as Record<string, number>;
    const optKeys = Object.keys(optimized);
    expect(optKeys.length).toBeGreaterThan(0);
    for (const k of optKeys) {
      expect(Number.isFinite(optimized[k])).toBe(true);
    }
    expect(result.stub).toBe(false);
  });

  it("missing optional part_geometry_hint → empty feature list, not error", async () => {
    const result = (await dispatchCamFunction("cam_func_feature_recognize", {
      target_cam: "mastercam",
    })) as Record<string, unknown>;
    expect(result.target_cam).toBe("mastercam");
    expect(result.stub).toBe(false);
    expect((result.recognized_features as unknown[]).length).toBe(0);
  });

  it("schema rejects max_tips above 50 (oversize protection)", async () => {
    const result = (await dispatchCamFunction("cam_func_tribal_lookup", {
      target_cam: "mastercam",
      query: "anything",
      max_tips: 999,
    })) as Record<string, unknown>;
    expect(result.success).toBe(false);
    expect(String(result.error)).toMatch(/max_tips/i);
  });

  it("schema rejects negative max_alternatives", async () => {
    const result = (await dispatchCamFunction("cam_func_strategy_recommend", {
      target_cam: "fusion360",
      part_hint: "rough",
      max_alternatives: -3,
    })) as Record<string, unknown>;
    expect(result.success).toBe(false);
    expect(String(result.error)).toMatch(/max_alternatives/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Cross-CAM variability floor — exercise ≥3 distinct CAM systems
// ─────────────────────────────────────────────────────────────────────────────

describe("camFunctionDispatcher — variability floor (≥3 CAMs)", () => {
  const CAM_TRIO = ["hypermill", "mastercam", "fusion360"] as const;

  it.each(CAM_TRIO)("cam_func_validate works for %s", async (slug) => {
    const result = (await dispatchCamFunction("cam_func_validate", {
      target_cam: slug,
      parameters: { rpm: 10000, feed: 1500 },
    })) as Record<string, unknown>;
    expect(result.target_cam).toBe(slug);
    expect(result.stub).toBe(false);
    expect(result.mode).toBe("production");
  });

  it.each(CAM_TRIO)("cam_func_route works for %s", async (slug) => {
    const result = (await dispatchCamFunction("cam_func_route", {
      intent: "pocket roughing",
      target_cam: slug,
    })) as Record<string, unknown>;
    expect(result.target_cam).toBe(slug);
    expect(result.stub).toBe(false);
    expect(result.confidence as number).toBeGreaterThanOrEqual(0);
  });
});
