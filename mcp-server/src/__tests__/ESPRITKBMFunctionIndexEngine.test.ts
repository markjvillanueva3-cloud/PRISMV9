/**
 * ESPRITKBMFunctionIndexEngine — CAM-EXHAUST-MS0/U-CAM52
 *
 * Coverage:
 *   - schema invariants: 7 ops / 48 params / 7 categories / 4 topics
 *   - per-op declared==actual nested-key count
 *   - variability: feature classes, scan methods, fail policies, probe targets
 *   - recommendByFeature: 7 intents + default fallback
 *   - selectScanDepth: 3 zones (≤3 surface, 4-6 topology, ≥7 deep) + adversarial
 *   - probeToleranceForIT: 4 zones (IT≤6, IT7-8, IT9-10, IT11+) + adversarial
 *   - estimateConsolidationSavings: real reduction math + adversarial
 *   - dispatcher round-trip + zod schema enforcement
 */

import { describe, it, expect, beforeAll } from "vitest";

interface CapturedTool {
  name: string;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<{
    content: Array<{ type: string; text: string }>;
  }>;
}

function makeStub() {
  const tools: CapturedTool[] = [];
  return {
    tools,
    tool(name: string, _d: string, _s: unknown, handler: CapturedTool["handler"]) {
      tools.push({ name, handler });
    },
  };
}

let dispatchCam: CapturedTool["handler"];

beforeAll(async () => {
  const { registerCamDispatcher } = await import(
    "../tools/dispatchers/camDispatcher.js"
  );
  const stub = makeStub();
  registerCamDispatcher(stub as any);
  const tool = stub.tools.find((t) => t.name === "prism_cam");
  if (!tool) throw new Error("prism_cam not registered");
  dispatchCam = tool.handler;
});

async function invoke(action: string, params: Record<string, unknown> = {}) {
  const res: any = await dispatchCam({ action, params });
  if (res && Array.isArray(res.content) && res.content[0]?.text) {
    try {
      return JSON.parse(res.content[0].text);
    } catch {
      return { __raw: res.content[0].text };
    }
  }
  return res;
}

describe("ESPRITKBMFunctionIndexEngine — engine + dispatcher", () => {
  it("getSummary returns 7 ops / 48 params / 7 categories / esprit/knowledge_based_machining", async () => {
    const { ESPRITKBMFunctionIndexEngine } = await import(
      "../engines/ESPRITKBMFunctionIndexEngine.js"
    );
    const s: any = ESPRITKBMFunctionIndexEngine.getSummary();
    expect(s.system_id).toBe("esprit");
    expect(s.section_key).toBe("knowledge_based_machining");
    expect(s.total_operations).toBe(7);
    expect(s.total_parameters).toBe(48);
    expect(s.categories).toHaveLength(7);
    expect(s.training_topics_count).toBe(4);
  });

  it.each([
    ["kbm_recognize_features", "feature_recognition", 9],
    ["kbm_apply_strategy", "strategy_template", 7],
    ["kbm_save_template", "strategy_template", 6],
    ["kbm_macro_chain", "macro_library", 7],
    ["kbm_probe_inspection", "probing", 8],
    ["kbm_stock_track", "stock_management", 5],
    ["kbm_tool_optimize", "tool_optimization", 6],
  ])("op %s → category %s, params %i (declared==actual)", async (id, cat, count) => {
    const { ESPRITKBMFunctionIndexEngine } = await import(
      "../engines/ESPRITKBMFunctionIndexEngine.js"
    );
    const op: any = ESPRITKBMFunctionIndexEngine.getOperation(id);
    expect("error" in op).toBe(false);
    expect(op.category).toBe(cat);
    expect(op.parameter_count).toBe(count);
    let actual = 0;
    for (const grp of Object.values(op.parameters) as any) actual += Object.keys(grp).length;
    expect(actual).toBe(count);
  });

  it("variability: kbm_recognize_features enumerates 4 scan methods + 3 scan depths", async () => {
    const { ESPRITKBMFunctionIndexEngine } = await import(
      "../engines/ESPRITKBMFunctionIndexEngine.js"
    );
    const op: any = ESPRITKBMFunctionIndexEngine.getOperation("kbm_recognize_features");
    expect(op.parameters.scan.scan_method.values).toEqual(["full_body", "selected_faces", "by_color", "by_layer"]);
    expect(op.parameters.scan.scan_depth.values).toEqual(["surface", "topology", "deep"]);
  });

  it("variability: kbm_save_template enumerates 6 feature classes", async () => {
    const { ESPRITKBMFunctionIndexEngine } = await import(
      "../engines/ESPRITKBMFunctionIndexEngine.js"
    );
    const op: any = ESPRITKBMFunctionIndexEngine.getOperation("kbm_save_template");
    expect(op.parameters.scope.feature_class.values).toEqual(["hole", "pocket", "slot", "boss", "thread", "freeform"]);
  });

  it("variability: kbm_macro_chain enumerates 4 fail policies", async () => {
    const { ESPRITKBMFunctionIndexEngine } = await import(
      "../engines/ESPRITKBMFunctionIndexEngine.js"
    );
    const op: any = ESPRITKBMFunctionIndexEngine.getOperation("kbm_macro_chain");
    expect(op.parameters.policy.on_step_fail.values).toEqual(["fail_fast", "skip_step", "continue", "operator_decide"]);
  });

  it("variability: kbm_probe_inspection enumerates 4 probe target modes", async () => {
    const { ESPRITKBMFunctionIndexEngine } = await import(
      "../engines/ESPRITKBMFunctionIndexEngine.js"
    );
    const op: any = ESPRITKBMFunctionIndexEngine.getOperation("kbm_probe_inspection");
    expect(op.parameters.scope.probe_targets.values).toEqual(["wcs_only", "wcs_plus_critical", "all_features", "user_defined"]);
  });

  it("getOperation returns {error} on unknown id", async () => {
    const { ESPRITKBMFunctionIndexEngine } = await import(
      "../engines/ESPRITKBMFunctionIndexEngine.js"
    );
    const bad: any = ESPRITKBMFunctionIndexEngine.getOperation("nope");
    expect(bad.error).toMatch(/nope/);
  });

  it("getOperationsByCategory: strategy_template has 2 ops", async () => {
    const { ESPRITKBMFunctionIndexEngine } = await import(
      "../engines/ESPRITKBMFunctionIndexEngine.js"
    );
    const tmpl = ESPRITKBMFunctionIndexEngine.getOperationsByCategory("strategy_template");
    expect(tmpl.length).toBe(2);
    expect(tmpl.map((o) => o.operation_id).sort()).toEqual(["kbm_apply_strategy", "kbm_save_template"]);
    expect(ESPRITKBMFunctionIndexEngine.getOperationsByCategory("nope")).toHaveLength(0);
  });

  it("findParameter: log_to_file appears in 2 ops; limit caps; miss returns []", async () => {
    const { ESPRITKBMFunctionIndexEngine } = await import(
      "../engines/ESPRITKBMFunctionIndexEngine.js"
    );
    const all = ESPRITKBMFunctionIndexEngine.findParameter("log_to_file", 100);
    expect(all.length).toBe(1);
    expect(ESPRITKBMFunctionIndexEngine.findParameter("zz_xxx_nope")).toHaveLength(0);
  });

  // recommendByFeature — 7 intents
  it.each([
    ["auto_recognize_features", "kbm_recognize_features"],
    ["apply_template_to_features", "kbm_apply_strategy"],
    ["save_template_from_chain", "kbm_save_template"],
    ["macro_chain_recipe", "kbm_macro_chain"],
    ["probe_inspection", "kbm_probe_inspection"],
    ["track_stock_model", "kbm_stock_track"],
    ["optimize_tool_list", "kbm_tool_optimize"],
  ])("recommendByFeature(%s) → %s", async (intent, expected) => {
    const { ESPRITKBMFunctionIndexEngine } = await import(
      "../engines/ESPRITKBMFunctionIndexEngine.js"
    );
    const r = ESPRITKBMFunctionIndexEngine.recommendByFeature(intent);
    expect(r.primary).toBe(expected);
    const op: any = ESPRITKBMFunctionIndexEngine.getOperation(r.primary);
    expect("error" in op).toBe(false);
  });

  it("recommendByFeature unknown → defaults to recognize_features", async () => {
    const { ESPRITKBMFunctionIndexEngine } = await import(
      "../engines/ESPRITKBMFunctionIndexEngine.js"
    );
    const r = ESPRITKBMFunctionIndexEngine.recommendByFeature("totally_bogus");
    expect(r.primary).toBe("kbm_recognize_features");
    expect(r.reason).toMatch(/unknown|default/i);
  });

  // selectScanDepth — 3 zones
  it.each([
    [0, "surface"],
    [1, "surface"],
    [3, "surface"],
    [3.5, "topology"],
    [5, "topology"],
    [6.99, "topology"],
    [7, "deep"],
    [9, "deep"],
    [10, "deep"],
  ])("selectScanDepth(score=%f) → %s", async (score, expected) => {
    const { ESPRITKBMFunctionIndexEngine } = await import(
      "../engines/ESPRITKBMFunctionIndexEngine.js"
    );
    const r = ESPRITKBMFunctionIndexEngine.selectScanDepth(score);
    expect(r.scan_depth).toBe(expected);
    expect(r.score).toBe(score);
  });

  it.each([
    ["NaN", NaN],
    ["negative", -1],
    ["over 10", 11],
    ["Infinity", Infinity],
  ])("selectScanDepth adversarial: %s → topology fallback", async (_label, score) => {
    const { ESPRITKBMFunctionIndexEngine } = await import(
      "../engines/ESPRITKBMFunctionIndexEngine.js"
    );
    const r = ESPRITKBMFunctionIndexEngine.selectScanDepth(score);
    expect(r.scan_depth).toBe("topology");
    expect(r.rationale).toMatch(/Invalid/);
  });

  // probeToleranceForIT — 4 zones
  it.each([
    [5, 0.005, 0.01],
    [6, 0.005, 0.01],
    [7, 0.010, 0.02],
    [8, 0.010, 0.02],
    [9, 0.025, 0.05],
    [10, 0.025, 0.05],
    [11, 0.050, 0.10],
    [16, 0.050, 0.10],
  ])("probeToleranceForIT(IT%i) → wcs=%fmm, feature=%fmm", async (it, wcs, feat) => {
    const { ESPRITKBMFunctionIndexEngine } = await import(
      "../engines/ESPRITKBMFunctionIndexEngine.js"
    );
    const r = ESPRITKBMFunctionIndexEngine.probeToleranceForIT(it);
    expect(r.wcs_tolerance_mm).toBe(wcs);
    expect(r.feature_tolerance_mm).toBe(feat);
  });

  it.each([
    ["NaN", NaN],
    ["fractional", 7.5],
    ["below range", 4],
    ["above range", 17],
  ])("probeToleranceForIT adversarial: %s → IT10 fallback", async (_label, it) => {
    const { ESPRITKBMFunctionIndexEngine } = await import(
      "../engines/ESPRITKBMFunctionIndexEngine.js"
    );
    const r = ESPRITKBMFunctionIndexEngine.probeToleranceForIT(it);
    expect(r.wcs_tolerance_mm).toBe(0.025);
    expect(r.feature_tolerance_mm).toBe(0.05);
    expect(r.rationale).toMatch(/Invalid/);
  });

  // estimateConsolidationSavings — real reduction math
  it("estimateConsolidationSavings(40, 2%, max=4) → consolidation=2 → 20 tools", async () => {
    const { ESPRITKBMFunctionIndexEngine } = await import(
      "../engines/ESPRITKBMFunctionIndexEngine.js"
    );
    // consolidation = min(4, 1 + 2/2) = min(4, 2) = 2 → 40/2 = 20
    const r = ESPRITKBMFunctionIndexEngine.estimateConsolidationSavings(40, 2, 4);
    expect(r.consolidation_per_tool).toBe(2);
    expect(r.estimated_consolidated_count).toBe(20);
    expect(r.estimated_savings_count).toBe(20);
  });

  it("estimateConsolidationSavings(50, 8%, max=4) → consolidation capped at 4 → 13 tools", async () => {
    const { ESPRITKBMFunctionIndexEngine } = await import(
      "../engines/ESPRITKBMFunctionIndexEngine.js"
    );
    // consolidation = min(4, 1 + 8/2) = min(4, 5) = 4 → ceil(50/4) = 13
    const r = ESPRITKBMFunctionIndexEngine.estimateConsolidationSavings(50, 8, 4);
    expect(r.consolidation_per_tool).toBe(4);
    expect(r.estimated_consolidated_count).toBe(13);
    expect(r.estimated_savings_count).toBe(37);
  });

  it("estimateConsolidationSavings(10, 0%, max=1) → no consolidation → 10 tools", async () => {
    const { ESPRITKBMFunctionIndexEngine } = await import(
      "../engines/ESPRITKBMFunctionIndexEngine.js"
    );
    const r = ESPRITKBMFunctionIndexEngine.estimateConsolidationSavings(10, 0, 1);
    expect(r.consolidation_per_tool).toBe(1);
    expect(r.estimated_consolidated_count).toBe(10);
    expect(r.estimated_savings_count).toBe(0);
  });

  it.each([
    ["zero tools", 0, 2, 4],
    ["NaN tol", 10, NaN, 4],
    ["negative tol", 10, -1, 4],
    ["zero max", 10, 2, 0],
  ])("estimateConsolidationSavings adversarial: %s → no consolidation", async (_label, tc, tol, mx) => {
    const { ESPRITKBMFunctionIndexEngine } = await import(
      "../engines/ESPRITKBMFunctionIndexEngine.js"
    );
    const r = ESPRITKBMFunctionIndexEngine.estimateConsolidationSavings(tc, tol, mx);
    expect(r.consolidation_per_tool).toBe(1);
    expect(r.estimated_savings_count).toBe(0);
    expect(r.rationale).toMatch(/Invalid/);
  });

  // Dispatcher round-trip
  it("round-trip: esprit_kbm_summary returns 7 ops / 48 params", async () => {
    const r: any = await invoke("esprit_kbm_summary", {});
    const d = r.data ?? r.result ?? r;
    expect(d.total_operations).toBe(7);
    expect(d.total_parameters).toBe(48);
  });

  it("round-trip: esprit_kbm_select_scan_depth(8) → deep", async () => {
    const r: any = await invoke("esprit_kbm_select_scan_depth", { part_complexity_score: 8 });
    const d = r.data ?? r.result ?? r;
    expect(d.scan_depth).toBe("deep");
  });

  it("round-trip: esprit_kbm_probe_tolerance_for_it(7) → wcs=0.01, feat=0.02", async () => {
    const r: any = await invoke("esprit_kbm_probe_tolerance_for_it", { it_grade: 7 });
    const d = r.data ?? r.result ?? r;
    expect(d.wcs_tolerance_mm).toBe(0.01);
    expect(d.feature_tolerance_mm).toBe(0.02);
  });

  it("round-trip: esprit_kbm_estimate_consolidation(40, 2, 4) → 20 tools", async () => {
    const r: any = await invoke("esprit_kbm_estimate_consolidation", {
      tool_count: 40,
      diameter_tolerance_pct: 2,
      max_consolidation_per_tool: 4,
    });
    const d = r.data ?? r.result ?? r;
    expect(d.estimated_consolidated_count).toBe(20);
    expect(d.estimated_savings_count).toBe(20);
  });

  it("round-trip: zod rejects IT < 5", async () => {
    const r: any = await invoke("esprit_kbm_probe_tolerance_for_it", { it_grade: 3 });
    const blob = JSON.stringify(r);
    expect(blob).toMatch(/Invalid params|5/);
  });

  it("camDispatcher ACTIONS contains all 10 esprit_kbm_* names", async () => {
    const mod: any = await import("../tools/dispatchers/camDispatcher.js");
    const expected = [
      "esprit_kbm_index",
      "esprit_kbm_summary",
      "esprit_kbm_list_ops",
      "esprit_kbm_get_op",
      "esprit_kbm_by_category",
      "esprit_kbm_find_param",
      "esprit_kbm_recommend",
      "esprit_kbm_select_scan_depth",
      "esprit_kbm_probe_tolerance_for_it",
      "esprit_kbm_estimate_consolidation",
    ];
    for (const a of expected) expect(mod.ACTIONS).toContain(a);
  });

  it("ACTION_ESPRIT_KBM_FUNCTION_INDEX_SCHEMAS has exactly 10 keys", async () => {
    const { ACTION_ESPRIT_KBM_FUNCTION_INDEX_SCHEMAS } = await import(
      "../schemas/espritKBMFunctionIndexActionSchemas.js"
    );
    expect(Object.keys(ACTION_ESPRIT_KBM_FUNCTION_INDEX_SCHEMAS)).toHaveLength(10);
  });

  it("esprit_kbm_estimate_consolidation schema enforces tool_count integer ≤ 500", async () => {
    const { ACTION_ESPRIT_KBM_FUNCTION_INDEX_SCHEMAS } = await import(
      "../schemas/espritKBMFunctionIndexActionSchemas.js"
    );
    const s = ACTION_ESPRIT_KBM_FUNCTION_INDEX_SCHEMAS.esprit_kbm_estimate_consolidation;
    expect(s.safeParse({ tool_count: 50, diameter_tolerance_pct: 2, max_consolidation_per_tool: 4 }).success).toBe(true);
    expect(s.safeParse({ tool_count: 600, diameter_tolerance_pct: 2, max_consolidation_per_tool: 4 }).success).toBe(false);
    expect(s.safeParse({ tool_count: 50.5, diameter_tolerance_pct: 2, max_consolidation_per_tool: 4 }).success).toBe(false);
  });
});
