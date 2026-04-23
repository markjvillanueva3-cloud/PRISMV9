/**
 * GibbsCAMFunctionIndexEngine — CAM-EXHAUST-MS0/U-CAM54
 *
 * Coverage:
 *   - schema invariants: 9 ops / 87 params / 7 categories / 3 topics
 *   - per-op declared==actual nested-key count
 *   - variability: pocket patterns, lathe infeed modes, MTM sync modes
 *   - recommendByFeature: 9 intents + default fallback
 *   - volumillEnvelope: canonical 10%/2×D bounds
 *   - mtmChannelSyncPolicy: 4 zones (1ch trivial, ≤2 sub→phase, 2-3 wait_all, ≥4 wait_any) + adversarial
 *   - gibbsTermTranslate: 7 known terms + unknown fallback
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

describe("GibbsCAMFunctionIndexEngine — engine + dispatcher", () => {
  it("getSummary returns 9 ops / 87 params / 7 categories / gibbscam/milling_turning", async () => {
    const { GibbsCAMFunctionIndexEngine } = await import(
      "../engines/GibbsCAMFunctionIndexEngine.js"
    );
    const s: any = GibbsCAMFunctionIndexEngine.getSummary();
    expect(s.system_id).toBe("gibbscam");
    expect(s.section_key).toBe("milling_turning");
    expect(s.total_operations).toBe(9);
    expect(s.total_parameters).toBe(87);
    expect(s.categories).toHaveLength(7);
    expect(s.training_topics_count).toBe(3);
  });

  it.each([
    ["mill_pocket", "mill_2_5d", 12],
    ["mill_profile", "mill_2_5d", 9],
    ["mill_volumill_rough", "mill_3d", 10],
    ["mill_3d_finish", "mill_3d", 10],
    ["mill_5axis_simul", "mill_5axis", 9],
    ["lathe_rough", "lathe_turn", 10],
    ["lathe_thread", "lathe_turn", 10],
    ["mtm_mill_turn_sync", "lathe_mill_turn", 8],
    ["drill_canned", "drilling", 9],
  ])("op %s → category %s, params %i (declared==actual)", async (id, cat, count) => {
    const { GibbsCAMFunctionIndexEngine } = await import(
      "../engines/GibbsCAMFunctionIndexEngine.js"
    );
    const op: any = GibbsCAMFunctionIndexEngine.getOperation(id);
    expect("error" in op).toBe(false);
    expect(op.category).toBe(cat);
    expect(op.parameter_count).toBe(count);
    let actual = 0;
    for (const grp of Object.values(op.parameters) as any) actual += Object.keys(grp).length;
    expect(actual).toBe(count);
  });

  it("variability: mill_pocket enumerates 4 patterns including VoluMill", async () => {
    const { GibbsCAMFunctionIndexEngine } = await import(
      "../engines/GibbsCAMFunctionIndexEngine.js"
    );
    const op: any = GibbsCAMFunctionIndexEngine.getOperation("mill_pocket");
    expect(op.parameters.strategy.pattern.values).toEqual(["contour", "spiral", "volumill_hsm", "raster"]);
  });

  it("variability: lathe_thread enumerates 3 infeed modes", async () => {
    const { GibbsCAMFunctionIndexEngine } = await import(
      "../engines/GibbsCAMFunctionIndexEngine.js"
    );
    const op: any = GibbsCAMFunctionIndexEngine.getOperation("lathe_thread");
    expect(op.parameters.infeed.infeed_mode.values).toEqual(["radial", "modified_flank", "alternating_flank"]);
  });

  it("variability: mtm_mill_turn_sync enumerates 3 sync modes", async () => {
    const { GibbsCAMFunctionIndexEngine } = await import(
      "../engines/GibbsCAMFunctionIndexEngine.js"
    );
    const op: any = GibbsCAMFunctionIndexEngine.getOperation("mtm_mill_turn_sync");
    expect(op.parameters.sync.sync_mode.values).toEqual(["wait_all", "wait_any", "phase_sync"]);
  });

  it("getOperation {error} on unknown id", async () => {
    const { GibbsCAMFunctionIndexEngine } = await import(
      "../engines/GibbsCAMFunctionIndexEngine.js"
    );
    const bad: any = GibbsCAMFunctionIndexEngine.getOperation("nope");
    expect(bad.error).toMatch(/nope/);
  });

  it("getOperationsByCategory: mill_2_5d has 2 ops; mill_3d has 2 ops; lathe_turn has 2 ops", async () => {
    const { GibbsCAMFunctionIndexEngine } = await import(
      "../engines/GibbsCAMFunctionIndexEngine.js"
    );
    expect(GibbsCAMFunctionIndexEngine.getOperationsByCategory("mill_2_5d").length).toBe(2);
    expect(GibbsCAMFunctionIndexEngine.getOperationsByCategory("MILL_3D").length).toBe(2);
    expect(GibbsCAMFunctionIndexEngine.getOperationsByCategory("lathe_turn").length).toBe(2);
    expect(GibbsCAMFunctionIndexEngine.getOperationsByCategory("nope")).toHaveLength(0);
  });

  it("findParameter: tool_id appears in 8 ops (mtm_sync uses spindle_id instead); limit caps; miss returns []", async () => {
    const { GibbsCAMFunctionIndexEngine } = await import(
      "../engines/GibbsCAMFunctionIndexEngine.js"
    );
    const all = GibbsCAMFunctionIndexEngine.findParameter("tool_id", 100);
    expect(all.length).toBe(8);
    for (const m of all) expect(m.parameter).toContain("tool_id");
    const capped = GibbsCAMFunctionIndexEngine.findParameter("tool_id", 3);
    expect(capped.length).toBe(3);
    expect(GibbsCAMFunctionIndexEngine.findParameter("zz_xxx_nope")).toHaveLength(0);
  });

  // recommendByFeature — 9 intents
  it.each([
    ["pocket_2_5d", "mill_pocket"],
    ["profile_2_5d", "mill_profile"],
    ["volumill_adaptive_rough", "mill_volumill_rough"],
    ["finish_3d_surface", "mill_3d_finish"],
    ["five_axis_swarf", "mill_5axis_simul"],
    ["lathe_rough", "lathe_rough"],
    ["lathe_thread", "lathe_thread"],
    ["mtm_sync", "mtm_mill_turn_sync"],
    ["drill_canned", "drill_canned"],
  ])("recommendByFeature(%s) → %s", async (intent, expected) => {
    const { GibbsCAMFunctionIndexEngine } = await import(
      "../engines/GibbsCAMFunctionIndexEngine.js"
    );
    const r = GibbsCAMFunctionIndexEngine.recommendByFeature(intent);
    expect(r.primary).toBe(expected);
    const op: any = GibbsCAMFunctionIndexEngine.getOperation(r.primary);
    expect("error" in op).toBe(false);
  });

  it("recommendByFeature unknown → defaults to mill_pocket", async () => {
    const { GibbsCAMFunctionIndexEngine } = await import(
      "../engines/GibbsCAMFunctionIndexEngine.js"
    );
    const r = GibbsCAMFunctionIndexEngine.recommendByFeature("totally_bogus");
    expect(r.primary).toBe("mill_pocket");
    expect(r.reason).toMatch(/unknown|default/i);
  });

  it("volumillEnvelope returns canonical 10%/2×D bounds with citation", async () => {
    const { GibbsCAMFunctionIndexEngine } = await import(
      "../engines/GibbsCAMFunctionIndexEngine.js"
    );
    const env = GibbsCAMFunctionIndexEngine.volumillEnvelope();
    expect(env.max_radial_engagement_pct).toBe(10);
    expect(env.max_axial_doc_to_dia).toBe(2);
    expect(env.smooth_arcs_required).toBe(true);
    expect(env.citation).toMatch(/Celeritive|VoluMill|GibbsCAM/);
  });

  // mtmChannelSyncPolicy — 4 zones
  it.each([
    [1, false, "wait_all"],
    [1, true, "phase_sync"],
    [2, true, "phase_sync"],
    [2, false, "wait_all"],
    [3, false, "wait_all"],
    [3, true, "wait_all"],
    [4, false, "wait_any"],
    [4, true, "wait_any"],
  ])("mtmChannelSyncPolicy(ch=%i, sub=%s) → %s", async (ch, sub, expected) => {
    const { GibbsCAMFunctionIndexEngine } = await import(
      "../engines/GibbsCAMFunctionIndexEngine.js"
    );
    const r = GibbsCAMFunctionIndexEngine.mtmChannelSyncPolicy(ch, sub);
    expect(r.sync_mode).toBe(expected);
  });

  it.each([
    ["zero ch", 0],
    ["over 4", 5],
    ["NaN", NaN],
    ["fractional", 2.5],
  ])("mtmChannelSyncPolicy adversarial: %s → wait_all fallback", async (_label, ch) => {
    const { GibbsCAMFunctionIndexEngine } = await import(
      "../engines/GibbsCAMFunctionIndexEngine.js"
    );
    const r = GibbsCAMFunctionIndexEngine.mtmChannelSyncPolicy(ch, false);
    expect(r.sync_mode).toBe("wait_all");
    expect(r.rationale).toMatch(/Invalid/);
  });

  // gibbsTermTranslate — 7 known + unknown
  it.each([
    ["process", "operation"],
    ["tile", "workpiece_setup"],
    ["TMS", "tool_management"],
    ["MDD", "machine_definition"],
    ["MTM", "mill_turn_multi_channel"],
    ["VoluMill", "adaptive_clearing"],
    ["cut part rendering", "toolpath_simulation"],
  ])("gibbsTermTranslate(%s) → %s", async (gibbs, common) => {
    const { GibbsCAMFunctionIndexEngine } = await import(
      "../engines/GibbsCAMFunctionIndexEngine.js"
    );
    const r = GibbsCAMFunctionIndexEngine.gibbsTermTranslate(gibbs);
    expect(r.common_term).toBe(common);
    expect(r.definition.length).toBeGreaterThan(10);
  });

  it("gibbsTermTranslate unknown → echoes input with no-translation note", async () => {
    const { GibbsCAMFunctionIndexEngine } = await import(
      "../engines/GibbsCAMFunctionIndexEngine.js"
    );
    const r = GibbsCAMFunctionIndexEngine.gibbsTermTranslate("totally_unknown_term");
    expect(r.common_term).toBe("totally_unknown_term");
    expect(r.definition).toMatch(/No GibbsCAM-specific translation/);
  });

  // Dispatcher round-trip
  it("round-trip: gibbs_summary returns 9 ops / 87 params", async () => {
    const r: any = await invoke("gibbs_summary", {});
    const d = r.data ?? r.result ?? r;
    expect(d.total_operations).toBe(9);
    expect(d.total_parameters).toBe(87);
  });

  it("round-trip: gibbs_get_op('mill_volumill_rough') → mill_3d, 10 params", async () => {
    const r: any = await invoke("gibbs_get_op", { operation_id: "mill_volumill_rough" });
    const d = r.data ?? r.result ?? r;
    expect(d.category).toBe("mill_3d");
    expect(d.parameter_count).toBe(10);
  });

  it("round-trip: gibbs_volumill_envelope returns 10%/2×D", async () => {
    const r: any = await invoke("gibbs_volumill_envelope", {});
    const d = r.data ?? r.result ?? r;
    expect(d.max_radial_engagement_pct).toBe(10);
  });

  it("round-trip: gibbs_mtm_sync_policy(4, false) → wait_any", async () => {
    const r: any = await invoke("gibbs_mtm_sync_policy", { channel_count: 4, has_sub_spindle: false });
    const d = r.data ?? r.result ?? r;
    expect(d.sync_mode).toBe("wait_any");
  });

  it("round-trip: gibbs_term_translate('process') → operation", async () => {
    const r: any = await invoke("gibbs_term_translate", { gibbs_term: "process" });
    const d = r.data ?? r.result ?? r;
    expect(d.common_term).toBe("operation");
  });

  it("round-trip: zod rejects channel_count > 4", async () => {
    const r: any = await invoke("gibbs_mtm_sync_policy", { channel_count: 5, has_sub_spindle: false });
    const blob = JSON.stringify(r);
    expect(blob).toMatch(/Invalid params|4/);
  });

  it("camDispatcher ACTIONS contains all 10 gibbs_* names", async () => {
    const mod: any = await import("../tools/dispatchers/camDispatcher.js");
    const expected = [
      "gibbs_index",
      "gibbs_summary",
      "gibbs_list_ops",
      "gibbs_get_op",
      "gibbs_by_category",
      "gibbs_find_param",
      "gibbs_recommend",
      "gibbs_volumill_envelope",
      "gibbs_mtm_sync_policy",
      "gibbs_term_translate",
    ];
    for (const a of expected) expect(mod.ACTIONS).toContain(a);
  });

  it("ACTION_GIBBSCAM_FUNCTION_INDEX_SCHEMAS has exactly 10 keys", async () => {
    const { ACTION_GIBBSCAM_FUNCTION_INDEX_SCHEMAS } = await import(
      "../schemas/gibbsCAMFunctionIndexActionSchemas.js"
    );
    expect(Object.keys(ACTION_GIBBSCAM_FUNCTION_INDEX_SCHEMAS)).toHaveLength(10);
  });

  it("gibbs_mtm_sync_policy schema enforces channel_count integer in [1,4]", async () => {
    const { ACTION_GIBBSCAM_FUNCTION_INDEX_SCHEMAS } = await import(
      "../schemas/gibbsCAMFunctionIndexActionSchemas.js"
    );
    const s = ACTION_GIBBSCAM_FUNCTION_INDEX_SCHEMAS.gibbs_mtm_sync_policy;
    expect(s.safeParse({ channel_count: 2, has_sub_spindle: true }).success).toBe(true);
    expect(s.safeParse({ channel_count: 5, has_sub_spindle: true }).success).toBe(false);
    expect(s.safeParse({ channel_count: 2.5, has_sub_spindle: true }).success).toBe(false);
  });
});
