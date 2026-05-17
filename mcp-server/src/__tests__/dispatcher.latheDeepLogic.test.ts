/**
 * dispatcher.latheDeepLogic.test.ts — round-trip coverage for
 * WIRE-UNWIRED-MS0/U-WIRE-LDL (LatheDeepLogicEngine).
 *
 * Drives 4 pure-read symbolic-logic surfaces through real `prism_dev`:
 *   ldl_optimize_parameters             → CSP-solve + Kienzle/Taylor
 *   ldl_validate_sequence               → temporal-logic check
 *   ldl_get_fuzzy_speed_recommendation  → fuzzy inference
 *   ldl_reason_tool_selection           → defeasible reasoning
 *
 * DEFERRED:
 *   - analyzeOperation: calls folLogic.registerEntity(…) on a shared FOL
 *     entity registry; LLM-callable would let any chat overwrite/poison
 *     other consumers' FOL state under fixed entity ids.
 *   - checkProcessAlternatives: mutates modalLogic.worlds map.
 *   - All `register…` and `create…` methods: mutate engine state by design.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { registerDevDispatcher } from "../tools/dispatchers/devDispatcher.js";
import { ACTION_DEV_SCHEMAS } from "../schemas/devActionSchemas.js";
import { latheDeepLogicEngine } from "../engines/LatheDeepLogicEngine.js";

interface CapturedTool {
  name: string;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<unknown>;
}

function makeStubServer(): {
  tools: CapturedTool[];
  tool: (name: string, desc: string, schema: unknown, h: CapturedTool["handler"]) => void;
} {
  const tools: CapturedTool[] = [];
  return {
    tools,
    tool(name, _desc, _schema, handler) { tools.push({ name, handler }); },
  };
}

async function invokeHandler(
  handler: CapturedTool["handler"],
  action: string,
  params: Record<string, unknown> = {},
): Promise<Record<string, unknown>> {
  const res = (await handler({ action, params })) as Record<string, unknown>;
  if (Array.isArray((res as { content?: unknown[] }).content)) {
    const text = ((res as { content: Array<{ text?: string }> }).content[0]?.text) ?? "";
    return JSON.parse(text) as Record<string, unknown>;
  }
  return res;
}

let devHandler: CapturedTool["handler"];

beforeAll(() => {
  const srv = makeStubServer();
  registerDevDispatcher(srv as unknown as Parameters<typeof registerDevDispatcher>[0]);
  const t = srv.tools.find((x) => x.name === "prism_dev");
  if (!t) throw new Error("prism_dev not registered");
  devHandler = t.handler;
});

describe("WIRE-UNWIRED-MS0/U-WIRE-LDL — Zod schemas", () => {
  it("ldl_optimize_parameters requires all 6 fields + accepts only valid ISO group", () => {
    expect(ACTION_DEV_SCHEMAS["ldl_optimize_parameters"].safeParse({}).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["ldl_optimize_parameters"].safeParse({
      material_iso: "P", max_power_kw: 15, max_rpm: 5000,
      tool_nose_radius_mm: 0.8, diameter_mm: 50, target_ra_um: 1.6,
    }).success).toBe(true);
    expect(ACTION_DEV_SCHEMAS["ldl_optimize_parameters"].safeParse({
      material_iso: "Z", max_power_kw: 15, max_rpm: 5000,
      tool_nose_radius_mm: 0.8, diameter_mm: 50, target_ra_um: 1.6,
    }).success).toBe(false);
  });

  it("ldl_optimize_parameters caps max_power_kw/max_rpm/diameter (DoS)", () => {
    expect(ACTION_DEV_SCHEMAS["ldl_optimize_parameters"].safeParse({
      material_iso: "P", max_power_kw: 501, max_rpm: 5000,
      tool_nose_radius_mm: 0.8, diameter_mm: 50, target_ra_um: 1.6,
    }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["ldl_optimize_parameters"].safeParse({
      material_iso: "P", max_power_kw: 15, max_rpm: 200_001,
      tool_nose_radius_mm: 0.8, diameter_mm: 50, target_ra_um: 1.6,
    }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["ldl_optimize_parameters"].safeParse({
      material_iso: "P", max_power_kw: 15, max_rpm: 5000,
      tool_nose_radius_mm: 0.8, diameter_mm: 2001, target_ra_um: 1.6,
    }).success).toBe(false);
  });

  it("ldl_validate_sequence requires 1-50 ops, each 1-64 chars", () => {
    expect(ACTION_DEV_SCHEMAS["ldl_validate_sequence"].safeParse({ operations: [] }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["ldl_validate_sequence"].safeParse({ operations: ["face"] }).success).toBe(true);
    expect(ACTION_DEV_SCHEMAS["ldl_validate_sequence"].safeParse({
      operations: new Array(51).fill("face"),
    }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["ldl_validate_sequence"].safeParse({
      operations: ["x".repeat(65)],
    }).success).toBe(false);
  });

  it("ldl_get_fuzzy_speed_recommendation caps hardness/depth/feed (DoS)", () => {
    expect(ACTION_DEV_SCHEMAS["ldl_get_fuzzy_speed_recommendation"].safeParse({
      hardness_hrc: 35, depth_mm: 2, feed_mm_rev: 0.15,
    }).success).toBe(true);
    expect(ACTION_DEV_SCHEMAS["ldl_get_fuzzy_speed_recommendation"].safeParse({
      hardness_hrc: 81, depth_mm: 2, feed_mm_rev: 0.15,
    }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["ldl_get_fuzzy_speed_recommendation"].safeParse({
      hardness_hrc: 35, depth_mm: 101, feed_mm_rev: 0.15,
    }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["ldl_get_fuzzy_speed_recommendation"].safeParse({
      hardness_hrc: 35, depth_mm: 2, feed_mm_rev: 11,
    }).success).toBe(false);
  });

  it("ldl_reason_tool_selection requires all 5 booleans", () => {
    expect(ACTION_DEV_SCHEMAS["ldl_reason_tool_selection"].safeParse({}).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["ldl_reason_tool_selection"].safeParse({
      is_steel: true, is_hardened: false, is_interrupted: false,
      is_high_temp_alloy: false, needs_fine_finish: true,
    }).success).toBe(true);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-LDL — prism_dev :: ldl_optimize_parameters", () => {
  const baseArgs = {
    material_iso: "P", max_power_kw: 15, max_rpm: 5000,
    tool_nose_radius_mm: 0.8, diameter_mm: 50, target_ra_um: 1.6,
  } as const;

  it("returns optimization with optimal Vc/fn/ap + derived metrics + constraints_satisfied", async () => {
    const r = await invokeHandler(devHandler, "ldl_optimize_parameters", baseArgs as unknown as Record<string, unknown>);
    expect(r.material_iso).toBe("P");
    const opt = (r as { optimization: { optimal: { Vc: number; fn: number; ap: number }; constraints_satisfied: boolean; mrr_mm3_per_min: number; predicted_tool_life_min: number; predicted_power_kw: number } }).optimization;
    expect(typeof opt.optimal.Vc).toBe("number");
    expect(typeof opt.optimal.fn).toBe("number");
    expect(typeof opt.optimal.ap).toBe("number");
    expect(opt.optimal.Vc).toBeGreaterThan(0);
    expect(opt.optimal.fn).toBeGreaterThan(0);
    expect(opt.optimal.ap).toBeGreaterThan(0);
    expect(typeof opt.mrr_mm3_per_min).toBe("number");
    expect(typeof opt.predicted_tool_life_min).toBe("number");
    expect(typeof opt.predicted_power_kw).toBe("number");
    expect(typeof opt.constraints_satisfied).toBe("boolean");
    expect((r as { constraints_satisfied?: boolean }).constraints_satisfied).toBe(opt.constraints_satisfied);
  });

  it("VARIABILITY — 3 distinct ISO groups all return positive Vc/fn/ap", async () => {
    const groups: Array<"P" | "K" | "S"> = ["P", "K", "S"];
    for (const iso of groups) {
      const r = await invokeHandler(devHandler, "ldl_optimize_parameters", { ...baseArgs, material_iso: iso });
      const opt = (r as { optimization: { optimal: { Vc: number; fn: number; ap: number } } }).optimization;
      expect(opt.optimal.Vc).toBeGreaterThan(0);
      expect(opt.optimal.fn).toBeGreaterThan(0);
      expect(opt.optimal.ap).toBeGreaterThan(0);
    }
  });

  it("ROUTING PROOF — wire optimization per-field equals engine-direct optimizeParameters()", async () => {
    const r = await invokeHandler(devHandler, "ldl_optimize_parameters", baseArgs as unknown as Record<string, unknown>);
    const wire = (r as { optimization: { optimal: { Vc: number; fn: number; ap: number }; mrr_mm3_per_min: number; predicted_tool_life_min: number; predicted_power_kw: number; constraints_satisfied: boolean } }).optimization;
    const direct = latheDeepLogicEngine.optimizeParameters({ ...baseArgs });
    expect(wire.optimal.Vc).toBeCloseTo(direct.optimal.Vc, 4);
    expect(wire.optimal.fn).toBeCloseTo(direct.optimal.fn, 4);
    expect(wire.optimal.ap).toBeCloseTo(direct.optimal.ap, 4);
    expect(wire.mrr_mm3_per_min).toBeCloseTo(direct.mrr_mm3_per_min, 4);
    expect(wire.predicted_tool_life_min).toBeCloseTo(direct.predicted_tool_life_min, 4);
    expect(wire.predicted_power_kw).toBeCloseTo(direct.predicted_power_kw, 4);
    expect(wire.constraints_satisfied).toBe(direct.constraints_satisfied);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-LDL — prism_dev :: ldl_validate_sequence", () => {
  it("returns valid bool + violations array + op_count + violation_count + has_corrected_sequence flag", async () => {
    const r = await invokeHandler(devHandler, "ldl_validate_sequence", {
      operations: ["face", "rough_turn", "finish_turn"],
    });
    expect(r.op_count).toBe(3);
    expect(typeof r.valid).toBe("boolean");
    const violations = ((r as { violations?: unknown[] }).violations) ?? [];
    expect((r as { violation_count?: number }).violation_count).toBe(violations.length);
    expect(typeof r.has_corrected_sequence).toBe("boolean");
  });

  it("VARIABILITY — 3 distinct sequences all return defined valid status", async () => {
    const seqs = [
      ["face"],
      ["face", "rough_turn"],
      ["finish_turn", "face", "rough_turn"], // intentionally out-of-order
    ];
    for (const ops of seqs) {
      const r = await invokeHandler(devHandler, "ldl_validate_sequence", { operations: ops });
      expect(typeof r.valid).toBe("boolean");
      expect(r.op_count).toBe(ops.length);
    }
  });

  it("ROUTING PROOF — wire valid + violation_count + has_corrected_sequence equal engine-direct", async () => {
    const ops = ["finish_turn", "face", "rough_turn"];
    const r = await invokeHandler(devHandler, "ldl_validate_sequence", { operations: ops });
    const direct = latheDeepLogicEngine.validateSequence(ops);
    expect(r.valid).toBe(direct.valid);
    expect((r as { violation_count?: number }).violation_count ?? 0).toBe(direct.violations.length);
    expect(r.has_corrected_sequence).toBe(direct.corrected_sequence !== null);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-LDL — prism_dev :: ldl_get_fuzzy_speed_recommendation", () => {
  it("returns recommendation with adjustment_percent + confidence + linguistic_summary", async () => {
    const r = await invokeHandler(devHandler, "ldl_get_fuzzy_speed_recommendation", {
      hardness_hrc: 35, depth_mm: 2, feed_mm_rev: 0.15,
    });
    const rec = (r as { recommendation: { adjustment_percent: number; confidence: number; linguistic_summary: string } }).recommendation;
    expect(typeof rec.adjustment_percent).toBe("number");
    expect(typeof rec.confidence).toBe("number");
    expect(typeof rec.linguistic_summary).toBe("string");
    expect(rec.linguistic_summary.length).toBeGreaterThan(0);
    expect(rec.confidence).toBeGreaterThanOrEqual(0);
    expect(rec.confidence).toBeLessThanOrEqual(1);
  });

  it("VARIABILITY — soft / medium / hard material all return defined recommendations", async () => {
    const hardnessVals = [20, 40, 60];
    for (const h of hardnessVals) {
      const r = await invokeHandler(devHandler, "ldl_get_fuzzy_speed_recommendation", {
        hardness_hrc: h, depth_mm: 2, feed_mm_rev: 0.15,
      });
      const rec = (r as { recommendation: { linguistic_summary: string } }).recommendation;
      expect(rec.linguistic_summary.length).toBeGreaterThan(0);
    }
  });

  it("ROUTING PROOF — wire adjustment_percent + confidence equal engine-direct", async () => {
    const args = { hardness_hrc: 35, depth_mm: 2, feed_mm_rev: 0.15 };
    const r = await invokeHandler(devHandler, "ldl_get_fuzzy_speed_recommendation", args);
    const wire = (r as { recommendation: { adjustment_percent: number; confidence: number } }).recommendation;
    const direct = latheDeepLogicEngine.getFuzzySpeedRecommendation(args.hardness_hrc, args.depth_mm, args.feed_mm_rev);
    expect(wire.adjustment_percent).toBeCloseTo(direct.adjustment_percent, 4);
    expect(wire.confidence).toBeCloseTo(direct.confidence, 4);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-LDL — prism_dev :: ldl_reason_tool_selection", () => {
  const baseFacts = {
    is_steel: true, is_hardened: false, is_interrupted: false,
    is_high_temp_alloy: false, needs_fine_finish: true,
  };

  it("returns selection with recommended_tool + reasoning + alternatives + counts", async () => {
    const r = await invokeHandler(devHandler, "ldl_reason_tool_selection", baseFacts);
    const sel = (r as { selection: { recommended_tool: string; confidence: string; reasoning?: string[]; alternatives?: string[] } }).selection;
    expect(typeof sel.recommended_tool).toBe("string");
    expect(sel.recommended_tool.length).toBeGreaterThan(0);
    expect(typeof sel.confidence).toBe("string");
    // slimResponse strips empty arrays. Treat absent as zero-length, which is
    // the same contract count fields encode.
    const reasoning = sel.reasoning ?? [];
    const alts = sel.alternatives ?? [];
    expect(Array.isArray(reasoning)).toBe(true);
    expect(Array.isArray(alts)).toBe(true);
    expect((r as { reasoning_steps_count?: number }).reasoning_steps_count ?? 0).toBe(reasoning.length);
    expect((r as { alternatives_count?: number }).alternatives_count ?? 0).toBe(alts.length);
  });

  it("VARIABILITY — 3 distinct material/condition combos all return non-empty recommended_tool", async () => {
    const combos = [
      { is_steel: true, is_hardened: false, is_interrupted: false, is_high_temp_alloy: false, needs_fine_finish: true },
      { is_steel: true, is_hardened: true, is_interrupted: true, is_high_temp_alloy: false, needs_fine_finish: false },
      { is_steel: false, is_hardened: false, is_interrupted: false, is_high_temp_alloy: true, needs_fine_finish: true },
    ];
    for (const c of combos) {
      const r = await invokeHandler(devHandler, "ldl_reason_tool_selection", c);
      const sel = (r as { selection: { recommended_tool: string } }).selection;
      expect(sel.recommended_tool.length).toBeGreaterThan(0);
    }
  });

  it("VARIABILITY — hardened+interrupted returns 'toughened_carbide' per engine rule (line 2746)", async () => {
    const r = await invokeHandler(devHandler, "ldl_reason_tool_selection", {
      is_steel: true, is_hardened: true, is_interrupted: true,
      is_high_temp_alloy: false, needs_fine_finish: false,
    });
    const sel = (r as { selection: { recommended_tool: string } }).selection;
    // Engine sorts by priority descending; toughened_carbide priority=4 is the
    // highest among the rules that fire for this combo.
    expect(sel.recommended_tool).toBe("toughened_carbide");
  });

  it("ROUTING PROOF — wire recommended_tool + reasoning length equal engine-direct", async () => {
    const r = await invokeHandler(devHandler, "ldl_reason_tool_selection", baseFacts);
    const wire = (r as { selection: { recommended_tool: string; reasoning: string[]; alternatives: string[] } }).selection;
    const direct = latheDeepLogicEngine.reasonToolSelection(baseFacts);
    expect(wire.recommended_tool).toBe(direct.recommended_tool);
    expect((wire.reasoning ?? []).length).toBe(direct.reasoning.length);
    expect((wire.alternatives ?? []).length).toBe(direct.alternatives.length);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-LDL — error envelope", () => {
  it("ldl_optimize_parameters with invalid ISO group → schema rejects", async () => {
    const r = await invokeHandler(devHandler, "ldl_optimize_parameters", {
      material_iso: "Z", max_power_kw: 15, max_rpm: 5000,
      tool_nose_radius_mm: 0.8, diameter_mm: 50, target_ra_um: 1.6,
    });
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });

  it("ldl_validate_sequence with empty operations → schema rejects", async () => {
    const r = await invokeHandler(devHandler, "ldl_validate_sequence", { operations: [] });
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });

  it("ldl_reason_tool_selection missing booleans → schema rejects", async () => {
    const r = await invokeHandler(devHandler, "ldl_reason_tool_selection", { is_steel: true });
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });
});
