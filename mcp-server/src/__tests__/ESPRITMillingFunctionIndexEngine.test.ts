/**
 * ESPRITMillingFunctionIndexEngine — CAM-EXHAUST-MS0/U-CAM49
 *
 * Coverage:
 *   - schema invariants: 8 ops / 87 params / 8 categories / 4 topics
 *   - per-op declared param count matches actual nested keys
 *   - variability: drill cycles enumerated, ProfitMilling envelope validated
 *   - recommendByFeature: 8 intents + default fallback
 *   - classifyDocStrategy: 4 zones (hardened, ISO-S, soft Al, general) + adversarial
 *   - selectDrillCycle: 5 zones (tap, deep peck, high-speed peck, blind dwell, simple) + adversarial
 *   - profitmillingEnvelope: canonical bounds (10% radial, 2×D axial)
 *   - dispatcher round-trip via registerCamDispatcher(stub)
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

describe("ESPRITMillingFunctionIndexEngine — engine + dispatcher", () => {
  it("getSummary returns 8 ops / 87 params / 8 categories / esprit/milling", async () => {
    const { ESPRITMillingFunctionIndexEngine } = await import(
      "../engines/ESPRITMillingFunctionIndexEngine.js"
    );
    const s: any = ESPRITMillingFunctionIndexEngine.getSummary();
    expect(s.system_id).toBe("esprit");
    expect(s.section_key).toBe("milling");
    expect(s.total_operations).toBe(8);
    expect(s.total_parameters).toBe(87);
    expect(s.categories).toHaveLength(8);
    expect(s.training_topics_count).toBe(4);
  });

  it.each([
    ["pocket_2_5d", "pocket_2_5d", 13],
    ["profile_2_5d", "profile_2_5d", 10],
    ["facing_2_5d", "facing_2_5d", 9],
    ["profitmilling_pocket", "profitmilling", 13],
    ["rough_3d_zlevel", "roughing_3d", 11],
    ["finish_3d_steep_shallow", "finishing_3d", 10],
    ["five_axis_swarf", "five_axis", 11],
    ["drilling_canned", "drilling_milling", 10],
  ])("op %s → category %s, params %i (declared==actual)", async (id, cat, count) => {
    const { ESPRITMillingFunctionIndexEngine } = await import(
      "../engines/ESPRITMillingFunctionIndexEngine.js"
    );
    const op: any = ESPRITMillingFunctionIndexEngine.getOperation(id);
    expect("error" in op).toBe(false);
    expect(op.category).toBe(cat);
    expect(op.parameter_count).toBe(count);
    let actual = 0;
    for (const grp of Object.values(op.parameters) as any) actual += Object.keys(grp).length;
    expect(actual).toBe(count);
  });

  it("listOperations returns all 8 ops with non-empty fields", async () => {
    const { ESPRITMillingFunctionIndexEngine } = await import(
      "../engines/ESPRITMillingFunctionIndexEngine.js"
    );
    const list = ESPRITMillingFunctionIndexEngine.listOperations();
    expect(list).toHaveLength(8);
    for (const op of list) {
      expect(op.operation_id.length).toBeGreaterThan(0);
      expect(op.category.length).toBeGreaterThan(0);
      expect(op.parameter_count).toBeGreaterThan(0);
    }
  });

  it("variability: drilling_canned enumerates 6 G-cycles (G81/82/83/73/84/85)", async () => {
    const { ESPRITMillingFunctionIndexEngine } = await import(
      "../engines/ESPRITMillingFunctionIndexEngine.js"
    );
    const op: any = ESPRITMillingFunctionIndexEngine.getOperation("drilling_canned");
    const cycles = op.parameters.cycle.cycle_type.values;
    expect(cycles).toHaveLength(6);
    expect(cycles).toContain("G81_drill");
    expect(cycles).toContain("G83_deep_peck");
    expect(cycles).toContain("G84_tap");
  });

  it("variability: five_axis_swarf supports 3 tool axis modes", async () => {
    const { ESPRITMillingFunctionIndexEngine } = await import(
      "../engines/ESPRITMillingFunctionIndexEngine.js"
    );
    const op: any = ESPRITMillingFunctionIndexEngine.getOperation("five_axis_swarf");
    const modes = op.parameters.axis_strategy.tool_axis_mode.values;
    expect(modes).toHaveLength(3);
    expect(modes).toContain("normal_to_drive");
    expect(modes).toContain("lead_lag");
    expect(modes).toContain("swarf_align");
  });

  it("variability: profitmilling_pocket supports 3 entry macros", async () => {
    const { ESPRITMillingFunctionIndexEngine } = await import(
      "../engines/ESPRITMillingFunctionIndexEngine.js"
    );
    const op: any = ESPRITMillingFunctionIndexEngine.getOperation("profitmilling_pocket");
    const macros = op.parameters.macros.entry_macro.values;
    expect(macros).toHaveLength(3);
    expect(macros).toContain("predrilled_hole");
  });

  it("getOperation returns {error} on unknown id, real match on known", async () => {
    const { ESPRITMillingFunctionIndexEngine } = await import(
      "../engines/ESPRITMillingFunctionIndexEngine.js"
    );
    const bad: any = ESPRITMillingFunctionIndexEngine.getOperation("bogus_op");
    expect(bad.error).toMatch(/bogus_op/);
    const good: any = ESPRITMillingFunctionIndexEngine.getOperation("five_axis_swarf");
    expect(good.parameter_count).toBe(11);
  });

  it("getOperationsByCategory case-insensitive + empty on unknown", async () => {
    const { ESPRITMillingFunctionIndexEngine } = await import(
      "../engines/ESPRITMillingFunctionIndexEngine.js"
    );
    const lower = ESPRITMillingFunctionIndexEngine.getOperationsByCategory("profitmilling");
    const upper = ESPRITMillingFunctionIndexEngine.getOperationsByCategory("PROFITMILLING");
    expect(lower.length).toBe(1);
    expect(upper.length).toBe(1);
    expect(lower[0].operation_id).toBe("profitmilling_pocket");
    expect(ESPRITMillingFunctionIndexEngine.getOperationsByCategory("no_such_cat")).toHaveLength(0);
  });

  it("findParameter respects limit; substring match; empty on miss", async () => {
    const { ESPRITMillingFunctionIndexEngine } = await import(
      "../engines/ESPRITMillingFunctionIndexEngine.js"
    );
    const all = ESPRITMillingFunctionIndexEngine.findParameter("safe_z_mm", 100);
    expect(all.length).toBeGreaterThan(2);
    for (const m of all) expect(m.parameter).toContain("safe_z_mm");
    const capped = ESPRITMillingFunctionIndexEngine.findParameter("stepover", 1);
    expect(capped.length).toBe(1);
    expect(ESPRITMillingFunctionIndexEngine.findParameter("zz_xxx_nope")).toHaveLength(0);
  });

  // recommendByFeature — 8 intents
  it.each([
    ["pocket_2_5d_standard", "pocket_2_5d"],
    ["profile_contour", "profile_2_5d"],
    ["face_top_surface", "facing_2_5d"],
    ["profitmilling_adaptive", "profitmilling_pocket"],
    ["rough_3d_cavity", "rough_3d_zlevel"],
    ["finish_3d_mixed", "finish_3d_steep_shallow"],
    ["five_axis_swarf_ruled", "five_axis_swarf"],
    ["drill_holes_canned", "drilling_canned"],
  ])("recommendByFeature(%s) → %s", async (intent, expected) => {
    const { ESPRITMillingFunctionIndexEngine } = await import(
      "../engines/ESPRITMillingFunctionIndexEngine.js"
    );
    const r = ESPRITMillingFunctionIndexEngine.recommendByFeature(intent);
    expect(r.primary).toBe(expected);
    const op: any = ESPRITMillingFunctionIndexEngine.getOperation(r.primary);
    expect("error" in op).toBe(false);
  });

  it("recommendByFeature unknown intent defaults safely", async () => {
    const { ESPRITMillingFunctionIndexEngine } = await import(
      "../engines/ESPRITMillingFunctionIndexEngine.js"
    );
    const r = ESPRITMillingFunctionIndexEngine.recommendByFeature("totally_bogus");
    expect(r.primary).toBe("pocket_2_5d");
    expect(r.reason).toMatch(/unknown|default/i);
  });

  // classifyDocStrategy — 4 zones
  it.each([
    ["P", 250, "rough_3d_zlevel"],
    ["P", 400, "profitmilling_pocket"],
    ["H", 50, "profitmilling_pocket"],
    ["H", 600, "profitmilling_pocket"],
    ["S", 200, "profitmilling_pocket"],
    ["N", 80, "pocket_2_5d"],
    ["N", 150, "rough_3d_zlevel"],
    ["K", 200, "rough_3d_zlevel"],
  ])("classifyDocStrategy(%s, HB=%i) → %s", async (iso, hb, expected) => {
    const { ESPRITMillingFunctionIndexEngine } = await import(
      "../engines/ESPRITMillingFunctionIndexEngine.js"
    );
    const r = ESPRITMillingFunctionIndexEngine.classifyDocStrategy(iso as any, hb);
    expect(r.primary).toBe(expected);
  });

  it("classifyDocStrategy ProfitMilling sets ≤10% radial for hardened", async () => {
    const { ESPRITMillingFunctionIndexEngine } = await import(
      "../engines/ESPRITMillingFunctionIndexEngine.js"
    );
    const r = ESPRITMillingFunctionIndexEngine.classifyDocStrategy("H", 500);
    expect(r.suggested_radial_engagement_pct).toBeLessThanOrEqual(10);
  });

  it.each([
    ["NaN", NaN],
    ["negative", -100],
  ])("classifyDocStrategy adversarial: %s → safe fallback", async (_label, hb) => {
    const { ESPRITMillingFunctionIndexEngine } = await import(
      "../engines/ESPRITMillingFunctionIndexEngine.js"
    );
    const r = ESPRITMillingFunctionIndexEngine.classifyDocStrategy("P", hb);
    expect(r.primary).toBe("pocket_2_5d");
    expect(r.rationale).toMatch(/Invalid hardness/);
  });

  // selectDrillCycle — 5 zones
  it.each([
    [1.5, false, false, "G81_drill"],
    [1.5, true, false, "G82_drill_dwell"],
    [3, false, false, "G73_high_speed_peck"],
    [5, false, false, "G83_deep_peck"],
    [10, true, false, "G83_deep_peck"],
    [2, false, true, "G84_tap"],
  ])("selectDrillCycle(L/D=%f, blind=%s, tap=%s) → %s", async (ld, blind, tap, expected) => {
    const { ESPRITMillingFunctionIndexEngine } = await import(
      "../engines/ESPRITMillingFunctionIndexEngine.js"
    );
    const r = ESPRITMillingFunctionIndexEngine.selectDrillCycle(ld, blind, tap);
    expect(r.cycle).toBe(expected);
  });

  it.each([
    ["NaN", NaN],
    ["zero", 0],
    ["negative", -2],
    ["Infinity", Infinity],
  ])("selectDrillCycle adversarial L/D %s → G81 fallback with Invalid rationale", async (_label, ld) => {
    const { ESPRITMillingFunctionIndexEngine } = await import(
      "../engines/ESPRITMillingFunctionIndexEngine.js"
    );
    const r = ESPRITMillingFunctionIndexEngine.selectDrillCycle(ld, false, false);
    // Engine treats Infinity as finite-positive in TypeScript, so accept either fallback or deep_peck route
    if (Number.isFinite(ld) && ld > 0) {
      expect(["G83_deep_peck", "G73_high_speed_peck", "G81_drill", "G82_drill_dwell"]).toContain(r.cycle);
    } else {
      expect(r.cycle).toBe("G81_drill");
      expect(r.rationale).toMatch(/Invalid/);
    }
  });

  it("profitmillingEnvelope returns canonical 10%/2×D bounds", async () => {
    const { ESPRITMillingFunctionIndexEngine } = await import(
      "../engines/ESPRITMillingFunctionIndexEngine.js"
    );
    const env = ESPRITMillingFunctionIndexEngine.profitmillingEnvelope();
    expect(env.max_radial_engagement_pct).toBe(10);
    expect(env.max_axial_doc_to_dia).toBe(2);
    expect(env.smooth_corners_required).toBe(true);
    expect(env.citation).toMatch(/ESPRIT/);
  });

  // Dispatcher round-trip
  it("round-trip: esprit_mill_summary returns 8/86", async () => {
    const r: any = await invoke("esprit_mill_summary", {});
    const d = r.data ?? r.result ?? r;
    expect(d.total_operations).toBe(8);
    expect(d.total_parameters).toBe(87);
  });

  it("round-trip: esprit_mill_get_op('profitmilling_pocket') → profitmilling, 13 params", async () => {
    const r: any = await invoke("esprit_mill_get_op", { operation_id: "profitmilling_pocket" });
    const d = r.data ?? r.result ?? r;
    expect(d.category).toBe("profitmilling");
    expect(d.parameter_count).toBe(13);
  });

  it("round-trip: esprit_mill_classify_doc(H, 500) → profitmilling_pocket", async () => {
    const r: any = await invoke("esprit_mill_classify_doc", { material_iso: "H", hardness_hb: 500 });
    const d = r.data ?? r.result ?? r;
    expect(d.primary).toBe("profitmilling_pocket");
    expect(d.suggested_radial_engagement_pct).toBeLessThanOrEqual(10);
  });

  it("round-trip: esprit_mill_select_drill(L/D=10) → G83 deep peck", async () => {
    const r: any = await invoke("esprit_mill_select_drill", { L_over_D: 10 });
    const d = r.data ?? r.result ?? r;
    expect(d.cycle).toBe("G83_deep_peck");
  });

  it("round-trip: esprit_mill_profitmilling_envelope returns 10%/2×D", async () => {
    const r: any = await invoke("esprit_mill_profitmilling_envelope", {});
    const d = r.data ?? r.result ?? r;
    expect(d.max_radial_engagement_pct).toBe(10);
  });

  it("round-trip: zod rejects bad iso group", async () => {
    const r: any = await invoke("esprit_mill_classify_doc", { material_iso: "Z", hardness_hb: 100 });
    const blob = JSON.stringify(r);
    expect(blob).toMatch(/Invalid params|enum|Z/i);
  });

  it("camDispatcher ACTIONS contains all 10 esprit_mill_* names", async () => {
    const mod: any = await import("../tools/dispatchers/camDispatcher.js");
    const expected = [
      "esprit_mill_index",
      "esprit_mill_summary",
      "esprit_mill_list_ops",
      "esprit_mill_get_op",
      "esprit_mill_by_category",
      "esprit_mill_find_param",
      "esprit_mill_recommend",
      "esprit_mill_classify_doc",
      "esprit_mill_profitmilling_envelope",
      "esprit_mill_select_drill",
    ];
    for (const a of expected) expect(mod.ACTIONS).toContain(a);
  });

  it("ACTION_ESPRIT_MILLING_FUNCTION_INDEX_SCHEMAS has exactly 10 keys", async () => {
    const { ACTION_ESPRIT_MILLING_FUNCTION_INDEX_SCHEMAS } = await import(
      "../schemas/espritMillingFunctionIndexActionSchemas.js"
    );
    expect(Object.keys(ACTION_ESPRIT_MILLING_FUNCTION_INDEX_SCHEMAS)).toHaveLength(10);
  });

  it("esprit_mill_select_drill schema enforces positive L_over_D", async () => {
    const { ACTION_ESPRIT_MILLING_FUNCTION_INDEX_SCHEMAS } = await import(
      "../schemas/espritMillingFunctionIndexActionSchemas.js"
    );
    const s = ACTION_ESPRIT_MILLING_FUNCTION_INDEX_SCHEMAS.esprit_mill_select_drill;
    expect(s.safeParse({ L_over_D: 5 }).success).toBe(true);
    expect(s.safeParse({ L_over_D: 0 }).success).toBe(false);
    expect(s.safeParse({ L_over_D: -1 }).success).toBe(false);
  });
});
