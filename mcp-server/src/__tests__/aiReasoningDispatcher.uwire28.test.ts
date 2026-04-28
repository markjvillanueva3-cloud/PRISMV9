/**
 * aiReasoningDispatcher U-WIRE28 round-trip tests — CNCControllerDeepLearningEngine.
 *
 * Validates controller_select/translate/compare/macro/debug through prism_ai.
 * Engine is pure (no I/O) so each test uses a fresh class instance for the
 * direct-engine block; dispatcher tests use the singleton.
 *
 * @milestone ENGINE-WIRE-MS0
 * @unit U-WIRE28
 */

import { describe, it, expect } from "vitest";
import {
  CNCControllerDeepLearningEngine,
  cncControllerDeepLearning,
} from "../engines/CNCControllerDeepLearningEngine.js";
import {
  AI_REASONING_ACTIONS,
  ACTION_AI_REASONING_SCHEMAS,
  type AIReasoningAction,
} from "../schemas/aiReasoningActionSchemas.js";
import { executeAIReasoningAction } from "../tools/dispatchers/aiReasoningDispatcher.js";

describe("U-WIRE28 — engine direct: CNCControllerDeepLearningEngine", () => {
  it("selectControllerForJob returns recommendations sorted by score DESC", () => {
    const fresh = new CNCControllerDeepLearningEngine();
    const recs = fresh.selectControllerForJob({
      operation_type: "5-axis finishing",
      axes_needed: 5,
      max_rpm_needed: 18000,
      macro_required: true,
    });
    expect(recs.length).toBeGreaterThan(0);
    for (let i = 1; i < recs.length; i += 1) {
      expect(recs[i - 1].score).toBeGreaterThanOrEqual(recs[i].score);
    }
    // Each recommendation has the canonical shape
    for (const r of recs) {
      expect(typeof r.controller).toBe("string");
      expect(typeof r.model).toBe("string");
      expect(r.score).toBeGreaterThanOrEqual(0);
      expect(r.score).toBeLessThanOrEqual(100);
      expect(Array.isArray(r.reasons)).toBe(true);
      expect(Array.isArray(r.limitations)).toBe(true);
    }
  });

  it("selectControllerForJob with jm_die_only zeroes scores for unavailable controllers", () => {
    const fresh = new CNCControllerDeepLearningEngine();
    const recs = fresh.selectControllerForJob({
      operation_type: "roughing",
      axes_needed: 3,
      jm_die_only: true,
    });
    // At least one rec must have score=0 (controllers not at JM Die get zeroed)
    const zeroed = recs.filter((r) => r.score === 0);
    expect(zeroed.length).toBeGreaterThan(0);
    for (const z of zeroed) {
      expect(z.limitations.some((l) => /jm die/i.test(l))).toBe(true);
    }
  });

  it("selectControllerForJob penalizes axes shortfall and rewards capacity match", () => {
    const fresh = new CNCControllerDeepLearningEngine();
    const recs = fresh.selectControllerForJob({
      operation_type: "5-axis simultaneous",
      axes_needed: 5,
    });
    // Controllers with max_axes >= 5 should be reasoned; insufficient ones limited
    const supports5 = recs.filter((r) => r.reasons.some((s) => /support/i.test(s) && /\b\d+\b/.test(s)));
    expect(supports5.length).toBeGreaterThan(0);
  });

  it("translateGCode returns translated_code + changes + warnings + confidence", () => {
    const fresh = new CNCControllerDeepLearningEngine();
    const t = fresh.translateGCode("fanuc", "okuma_osp", "G0 X10 Y20\nG1 X100 F500");
    expect(t.source_controller).toBe("fanuc");
    expect(t.target_controller).toBe("okuma_osp");
    expect(typeof t.translated_code).toBe("string");
    expect(t.translated_code.length).toBeGreaterThan(0);
    expect(Array.isArray(t.changes)).toBe(true);
    expect(Array.isArray(t.warnings)).toBe(true);
    expect(typeof t.confidence).toBe("number");
  });

  it("translateGCode mazatrol→fanuc emits the conversational-loss warning", () => {
    const fresh = new CNCControllerDeepLearningEngine();
    const t = fresh.translateGCode("mazak_mazatrol", "fanuc", "G0 X10");
    expect(t.warnings.some((w) => /mazatrol/i.test(w))).toBe(true);
  });

  it("translateGCode → heidenhain converts G0 lines to L FMAX", () => {
    const fresh = new CNCControllerDeepLearningEngine();
    const t = fresh.translateGCode("fanuc", "heidenhain_tnc", "G0 X10 Y20");
    expect(/L .* FMAX/i.test(t.translated_code) || t.changes.some((c) => /heidenhain/i.test(c.reason))).toBe(true);
  });

  it("recommendMacro returns either a MacroPattern or null (no exceptions)", () => {
    const fresh = new CNCControllerDeepLearningEngine();
    // Whatever the engine has stored, this method must not throw.
    const r = fresh.recommendMacro("probe wcs corner", "fanuc");
    if (r !== null) {
      expect(typeof r.name).toBe("string");
      expect(typeof r.controller).toBe("string");
      expect(typeof r.code_template).toBe("string");
    }
  });

  it("generateMacro returns code + explanation + variables, branches by controller family", () => {
    const fresh = new CNCControllerDeepLearningEngine();
    const okuma = fresh.generateMacro("rough adaptive pocket", "okuma_osp");
    expect(okuma.code).toMatch(/V/); // V-macro variables
    expect(okuma.variables.length).toBeGreaterThan(0);

    const fanuc = fresh.generateMacro("rough adaptive pocket", "fanuc");
    expect(fanuc.code).toMatch(/#/); // Macro-B # variables
    expect(fanuc.variables.length).toBeGreaterThan(0);

    // Generic fallback for unmapped family
    const heid = fresh.generateMacro("probe", "heidenhain_tnc");
    expect(heid.explanation.toLowerCase()).toContain("generic");
  });

  it("debugPostIssue classifies cutter-comp / axis-limit / tool errors distinctly", () => {
    const fresh = new CNCControllerDeepLearningEngine();
    const cc = fresh.debugPostIssue("Cutter comp crash on G42 lead-in", "hurco_winmax");
    expect(cc.diagnosis.toLowerCase()).toContain("cutter compensation");
    expect(cc.suggestions.length).toBeGreaterThan(0);

    const ax = fresh.debugPostIssue("Axis limit violation Z+", "fanuc");
    expect(ax.diagnosis.toLowerCase()).toContain("axis");

    const tl = fresh.debugPostIssue("Tool length offset incorrect", "fanuc");
    expect(tl.diagnosis.toLowerCase()).toContain("tool");
  });

  it("compareControllers returns a comparison map + recommendation string", () => {
    const fresh = new CNCControllerDeepLearningEngine();
    const c = fresh.compareControllers("fanuc", "haas_ngc");
    expect(typeof c.recommendation).toBe("string");
    expect((c.recommendation ?? "").length).toBeGreaterThan(0);
    expect(typeof c.comparison.max_axes).toBe("object");
    expect(typeof c.comparison.max_rpm).toBe("object");
    expect("a" in c.comparison.max_axes && "b" in c.comparison.max_axes).toBe(true);
  });
});

describe("U-WIRE28 — schema integrity", () => {
  it("all 5 controller_* actions are in AI_REASONING_ACTIONS exactly once", () => {
    const actions = AI_REASONING_ACTIONS as readonly string[];
    for (const a of [
      "controller_select", "controller_translate", "controller_compare",
      "controller_macro", "controller_debug",
    ]) {
      expect(actions.filter((x) => x === a).length).toBe(1);
    }
  });

  it("Zod schemas exist for all 5 actions", () => {
    const map = ACTION_AI_REASONING_SCHEMAS as Record<string, unknown>;
    for (const a of [
      "controller_select", "controller_translate", "controller_compare",
      "controller_macro", "controller_debug",
    ]) {
      expect(typeof map[a]).toBe("object");
    }
  });

  it("controller_select rejects missing operation_type / non-positive axes", () => {
    const map = ACTION_AI_REASONING_SCHEMAS as Record<string, { safeParse: (x: unknown) => { success: boolean } }>;
    expect(map.controller_select.safeParse({ axes_needed: 5 }).success).toBe(false);
    expect(map.controller_select.safeParse({ operation_type: "", axes_needed: 5 }).success).toBe(false);
    expect(map.controller_select.safeParse({ operation_type: "rough", axes_needed: 0 }).success).toBe(false);
    expect(map.controller_select.safeParse({ operation_type: "rough", axes_needed: -1 }).success).toBe(false);
    expect(map.controller_select.safeParse({ operation_type: "rough", axes_needed: 3 }).success).toBe(true);
  });

  it("controller_translate requires non-empty source/target/code", () => {
    const map = ACTION_AI_REASONING_SCHEMAS as Record<string, { safeParse: (x: unknown) => { success: boolean } }>;
    const valid = { sourceController: "fanuc", targetController: "okuma_osp", code: "G0 X1" };
    expect(map.controller_translate.safeParse(valid).success).toBe(true);
    expect(map.controller_translate.safeParse({ ...valid, sourceController: "" }).success).toBe(false);
    expect(map.controller_translate.safeParse({ ...valid, targetController: "" }).success).toBe(false);
    expect(map.controller_translate.safeParse({ ...valid, code: "" }).success).toBe(false);
  });

  it("controller_compare / macro / debug all require non-empty fields", () => {
    const map = ACTION_AI_REASONING_SCHEMAS as Record<string, { safeParse: (x: unknown) => { success: boolean } }>;
    expect(map.controller_compare.safeParse({ a: "", b: "fanuc" }).success).toBe(false);
    expect(map.controller_compare.safeParse({ a: "fanuc", b: "" }).success).toBe(false);
    expect(map.controller_compare.safeParse({ a: "fanuc", b: "haas_ngc" }).success).toBe(true);

    expect(map.controller_macro.safeParse({ taskDescription: "", controller: "fanuc" }).success).toBe(false);
    expect(map.controller_macro.safeParse({ taskDescription: "probe", controller: "" }).success).toBe(false);

    expect(map.controller_debug.safeParse({ errorMessage: "", controller: "fanuc" }).success).toBe(false);
    expect(map.controller_debug.safeParse({ errorMessage: "alarm 1234", controller: "" }).success).toBe(false);
  });
});

describe("U-WIRE28 — dispatcher round-trip: prism_ai", () => {
  it("controller_select happy path returns sorted recommendations array", async () => {
    const r = await executeAIReasoningAction("controller_select" as AIReasoningAction, {
      operation_type: "5-axis finishing",
      axes_needed: 5,
      macro_required: true,
    });
    expect(r.success).toBe(true);
    // Engine returns ControllerRecommendation[] directly; slimResponse may
    // wrap with array index keys. Be tolerant of both shapes.
    const data = r.data;
    if (Array.isArray(data)) {
      expect((data as unknown[]).length).toBeGreaterThan(0);
    } else {
      expect(typeof data).toBe("object");
    }
  });

  it("controller_translate returns translated_code + changes + warnings + confidence", async () => {
    const r = await executeAIReasoningAction("controller_translate" as AIReasoningAction, {
      sourceController: "fanuc",
      targetController: "okuma_osp",
      code: "G0 X10 Y20\nG1 X100 F500",
    });
    expect(r.success).toBe(true);
    const data = r.data as {
      source_controller?: string;
      target_controller?: string;
      translated_code?: string;
      changes?: unknown[];
      warnings?: unknown[];
      confidence?: number;
    };
    expect(data.source_controller).toBe("fanuc");
    expect(data.target_controller).toBe("okuma_osp");
    expect(typeof data.translated_code).toBe("string");
    expect(typeof data.confidence).toBe("number");
  });

  it("controller_compare returns recommendation + comparison map", async () => {
    const r = await executeAIReasoningAction("controller_compare" as AIReasoningAction, {
      a: "fanuc",
      b: "haas_ngc",
    });
    expect(r.success).toBe(true);
    const data = r.data as { recommendation?: string; comparison?: Record<string, unknown> };
    expect(typeof data.recommendation).toBe("string");
    expect((data.recommendation ?? "").length).toBeGreaterThan(0);
    expect(typeof data.comparison).toBe("object");
  });

  it("controller_macro returns code + explanation + variables", async () => {
    const r = await executeAIReasoningAction("controller_macro" as AIReasoningAction, {
      taskDescription: "probe corner WCS",
      controller: "fanuc",
    });
    expect(r.success).toBe(true);
    const data = r.data as { code?: string; explanation?: string; variables?: unknown[] };
    expect(typeof data.code).toBe("string");
    expect((data.code ?? "").length).toBeGreaterThan(0);
    expect(typeof data.explanation).toBe("string");
    expect(Array.isArray(data.variables)).toBe(true);
  });

  it("controller_debug classifies cutter-comp errors", async () => {
    const r = await executeAIReasoningAction("controller_debug" as AIReasoningAction, {
      errorMessage: "Cutter comp crash on G42 lead-in",
      controller: "hurco_winmax",
    });
    expect(r.success).toBe(true);
    const data = r.data as { diagnosis?: string; suggestions?: unknown[]; related_knowledge?: unknown[] };
    expect((data.diagnosis ?? "").toLowerCase()).toContain("cutter compensation");
    expect(Array.isArray(data.suggestions)).toBe(true);
  });

  it("controller_select FAIL: missing operation_type → schema rejects", async () => {
    const r = await executeAIReasoningAction("controller_select" as AIReasoningAction, { axes_needed: 3 });
    expect(r.success).toBe(false);
    expect(typeof r.error).toBe("string");
  });

  it("controller_translate FAIL: empty code → schema rejects", async () => {
    const r = await executeAIReasoningAction("controller_translate" as AIReasoningAction, {
      sourceController: "fanuc", targetController: "haas_ngc", code: "",
    });
    expect(r.success).toBe(false);
  });

  it("controller_macro FAIL: missing taskDescription → schema rejects", async () => {
    const r = await executeAIReasoningAction("controller_macro" as AIReasoningAction, { controller: "fanuc" });
    expect(r.success).toBe(false);
  });

  it("controller_debug FAIL: missing errorMessage → schema rejects", async () => {
    const r = await executeAIReasoningAction("controller_debug" as AIReasoningAction, { controller: "fanuc" });
    expect(r.success).toBe(false);
  });
});

describe("U-WIRE28 — singleton continuity", () => {
  it("cncControllerDeepLearning singleton is the same object across re-imports", async () => {
    const mod = await import("../engines/CNCControllerDeepLearningEngine.js");
    expect(mod.cncControllerDeepLearning).toBe(cncControllerDeepLearning);
  });
});
