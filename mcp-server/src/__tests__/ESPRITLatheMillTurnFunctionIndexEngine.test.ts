/**
 * ESPRITLatheMillTurnFunctionIndexEngine — CAM-EXHAUST-MS0/U-CAM50
 *
 * Coverage:
 *   - schema invariants: 9 ops / 85 params / 8 categories / 4 topics
 *   - per-op declared==actual nested-key count
 *   - variability: threading infeed modes, sub-spindle transfer methods, sync strategies
 *   - recommendByFeature: 9 intents + default fallback
 *   - selectThreadingInfeed: 4 zones (fine pitch, ISO-S/H, coarse pitch, default) + adversarial
 *   - selectMillturnAxis: 3 zones (Y+offaxis, polar, on-axis)
 *   - estimateChannelSync: 3 zones (≤2 wait_all, 3 barrier, ≥4 wait_any) + adversarial
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

describe("ESPRITLatheMillTurnFunctionIndexEngine — engine + dispatcher", () => {
  it("getSummary returns 9 ops / 85 params / 8 categories / esprit/lathe_millturn", async () => {
    const { ESPRITLatheMillTurnFunctionIndexEngine } = await import(
      "../engines/ESPRITLatheMillTurnFunctionIndexEngine.js"
    );
    const s: any = ESPRITLatheMillTurnFunctionIndexEngine.getSummary();
    expect(s.system_id).toBe("esprit");
    expect(s.section_key).toBe("lathe_millturn");
    expect(s.total_operations).toBe(9);
    expect(s.total_parameters).toBe(85);
    expect(s.categories).toHaveLength(8);
    expect(s.training_topics_count).toBe(4);
  });

  it.each([
    ["turn_rough_od", "turn_roughing", 11],
    ["turn_finish_od", "turn_finishing", 8],
    ["groove_part_off", "grooving_parting", 9],
    ["thread_single_point", "threading", 11],
    ["drill_axial", "drilling_axial", 10],
    ["millturn_radial_milling", "millturn_live", 11],
    ["millturn_y_axis_pocket", "millturn_live", 9],
    ["swiss_main_sub_handoff", "swiss_type", 9],
    ["channel_synchronization", "synchronization", 7],
  ])("op %s → category %s, params %i (declared==actual)", async (id, cat, count) => {
    const { ESPRITLatheMillTurnFunctionIndexEngine } = await import(
      "../engines/ESPRITLatheMillTurnFunctionIndexEngine.js"
    );
    const op: any = ESPRITLatheMillTurnFunctionIndexEngine.getOperation(id);
    expect("error" in op).toBe(false);
    expect(op.category).toBe(cat);
    expect(op.parameter_count).toBe(count);
    let actual = 0;
    for (const grp of Object.values(op.parameters) as any) actual += Object.keys(grp).length;
    expect(actual).toBe(count);
  });

  it("variability: thread_single_point enumerates 3 infeed modes", async () => {
    const { ESPRITLatheMillTurnFunctionIndexEngine } = await import(
      "../engines/ESPRITLatheMillTurnFunctionIndexEngine.js"
    );
    const op: any = ESPRITLatheMillTurnFunctionIndexEngine.getOperation("thread_single_point");
    const modes = op.parameters.infeed.infeed_mode.values;
    expect(modes).toEqual(["radial", "modified_flank", "alternating_flank"]);
  });

  it("variability: swiss_main_sub_handoff enumerates 3 transfer methods", async () => {
    const { ESPRITLatheMillTurnFunctionIndexEngine } = await import(
      "../engines/ESPRITLatheMillTurnFunctionIndexEngine.js"
    );
    const op: any = ESPRITLatheMillTurnFunctionIndexEngine.getOperation("swiss_main_sub_handoff");
    const methods = op.parameters.transfer.transfer_method.values;
    expect(methods).toEqual(["pickup", "synchronous_grip", "bar_pull"]);
  });

  it("variability: channel_synchronization enumerates 3 sync strategies", async () => {
    const { ESPRITLatheMillTurnFunctionIndexEngine } = await import(
      "../engines/ESPRITLatheMillTurnFunctionIndexEngine.js"
    );
    const op: any = ESPRITLatheMillTurnFunctionIndexEngine.getOperation("channel_synchronization");
    const strategies = op.parameters.sync_codes.sync_strategy.values;
    expect(strategies).toEqual(["wait_all", "wait_any", "barrier"]);
  });

  it("getOperation returns {error} on unknown id, real match on known", async () => {
    const { ESPRITLatheMillTurnFunctionIndexEngine } = await import(
      "../engines/ESPRITLatheMillTurnFunctionIndexEngine.js"
    );
    const bad: any = ESPRITLatheMillTurnFunctionIndexEngine.getOperation("nope");
    expect(bad.error).toMatch(/nope/);
    const good: any = ESPRITLatheMillTurnFunctionIndexEngine.getOperation("turn_rough_od");
    expect(good.parameter_count).toBe(11);
  });

  it("getOperationsByCategory case-insensitive", async () => {
    const { ESPRITLatheMillTurnFunctionIndexEngine } = await import(
      "../engines/ESPRITLatheMillTurnFunctionIndexEngine.js"
    );
    const live = ESPRITLatheMillTurnFunctionIndexEngine.getOperationsByCategory("millturn_live");
    expect(live.length).toBe(2);
    const upper = ESPRITLatheMillTurnFunctionIndexEngine.getOperationsByCategory("MILLTURN_LIVE");
    expect(upper.length).toBe(2);
    expect(ESPRITLatheMillTurnFunctionIndexEngine.getOperationsByCategory("nope")).toHaveLength(0);
  });

  it("findParameter substring + limit + miss", async () => {
    const { ESPRITLatheMillTurnFunctionIndexEngine } = await import(
      "../engines/ESPRITLatheMillTurnFunctionIndexEngine.js"
    );
    const all = ESPRITLatheMillTurnFunctionIndexEngine.findParameter("tool_id", 100);
    expect(all.length).toBeGreaterThan(5);
    for (const m of all) expect(m.parameter).toContain("tool_id");
    const capped = ESPRITLatheMillTurnFunctionIndexEngine.findParameter("tool_id", 2);
    expect(capped.length).toBe(2);
    expect(ESPRITLatheMillTurnFunctionIndexEngine.findParameter("zz_xxx_nope")).toHaveLength(0);
  });

  // recommendByFeature — 9 intents
  it.each([
    ["turn_od_rough", "turn_rough_od"],
    ["turn_od_finish", "turn_finish_od"],
    ["groove_or_part", "groove_part_off"],
    ["thread_single_point", "thread_single_point"],
    ["drill_centerline", "drill_axial"],
    ["millturn_radial_milling", "millturn_radial_milling"],
    ["millturn_y_axis_pocket", "millturn_y_axis_pocket"],
    ["swiss_part_handoff", "swiss_main_sub_handoff"],
    ["channel_sync", "channel_synchronization"],
  ])("recommendByFeature(%s) → %s", async (intent, expected) => {
    const { ESPRITLatheMillTurnFunctionIndexEngine } = await import(
      "../engines/ESPRITLatheMillTurnFunctionIndexEngine.js"
    );
    const r = ESPRITLatheMillTurnFunctionIndexEngine.recommendByFeature(intent);
    expect(r.primary).toBe(expected);
    const op: any = ESPRITLatheMillTurnFunctionIndexEngine.getOperation(r.primary);
    expect("error" in op).toBe(false);
  });

  it("recommendByFeature unknown intent → defaults to OD roughing", async () => {
    const { ESPRITLatheMillTurnFunctionIndexEngine } = await import(
      "../engines/ESPRITLatheMillTurnFunctionIndexEngine.js"
    );
    const r = ESPRITLatheMillTurnFunctionIndexEngine.recommendByFeature("totally_bogus");
    expect(r.primary).toBe("turn_rough_od");
    expect(r.reason).toMatch(/unknown|default/i);
  });

  // selectThreadingInfeed — 4 zones
  it.each([
    [0.5, "P", "radial"],
    [0.8, "M", "radial"],
    [1.0, "P", "modified_flank"],
    [1.5, "M", "modified_flank"],
    [1.5, "S", "modified_flank"],
    [1.5, "H", "modified_flank"],
    [2.0, "P", "alternating_flank"],
    [3.0, "M", "alternating_flank"],
    [2.5, "H", "modified_flank"],
  ])("selectThreadingInfeed(pitch=%fmm, %s) → %s", async (pitch, iso, expected) => {
    const { ESPRITLatheMillTurnFunctionIndexEngine } = await import(
      "../engines/ESPRITLatheMillTurnFunctionIndexEngine.js"
    );
    const r = ESPRITLatheMillTurnFunctionIndexEngine.selectThreadingInfeed(pitch, iso as any);
    expect(r.infeed_mode).toBe(expected);
    expect(r.pitch_mm).toBe(pitch);
  });

  it.each([
    ["NaN", NaN],
    ["zero", 0],
    ["negative", -1],
  ])("selectThreadingInfeed adversarial pitch %s → modified_flank fallback", async (_label, pitch) => {
    const { ESPRITLatheMillTurnFunctionIndexEngine } = await import(
      "../engines/ESPRITLatheMillTurnFunctionIndexEngine.js"
    );
    const r = ESPRITLatheMillTurnFunctionIndexEngine.selectThreadingInfeed(pitch, "P");
    expect(r.infeed_mode).toBe("modified_flank");
    expect(r.rationale).toMatch(/Invalid pitch/);
  });

  // selectMillturnAxis — 3 zones
  it.each([
    [true, true, "millturn_y_axis_pocket", false],
    [false, true, "millturn_radial_milling", true],
    [true, false, "millturn_radial_milling", false],
    [false, false, "millturn_radial_milling", false],
  ])("selectMillturnAxis(hasY=%s, offAxis=%s) → %s, polar=%s", async (hasY, offAxis, op, polar) => {
    const { ESPRITLatheMillTurnFunctionIndexEngine } = await import(
      "../engines/ESPRITLatheMillTurnFunctionIndexEngine.js"
    );
    const r = ESPRITLatheMillTurnFunctionIndexEngine.selectMillturnAxis(hasY, offAxis);
    expect(r.operation_id).toBe(op);
    expect(r.use_polar).toBe(polar);
  });

  // estimateChannelSync — 3 zones
  it.each([
    [1, 10, "wait_all"],
    [2, 10, "wait_all"],
    [3, 10, "barrier"],
    [4, 10, "wait_any"],
    [6, 10, "wait_any"],
  ])("estimateChannelSync(%i ch, %is) → %s", async (ch, sec, expected) => {
    const { ESPRITLatheMillTurnFunctionIndexEngine } = await import(
      "../engines/ESPRITLatheMillTurnFunctionIndexEngine.js"
    );
    const r = ESPRITLatheMillTurnFunctionIndexEngine.estimateChannelSync(ch, sec);
    expect(r.sync_strategy).toBe(expected);
    // Stall increases linearly with channels
    const expectedStall = Math.round((ch - 1) * sec * 0.3 * 100) / 100;
    expect(r.estimated_stall_seconds).toBeCloseTo(expectedStall, 5);
  });

  it.each([
    ["NaN ch", NaN, 10],
    ["zero ch", 0, 10],
    ["negative ch", -1, 10],
    ["NaN sec", 3, NaN],
    ["zero sec", 3, 0],
  ])("estimateChannelSync adversarial: %s → wait_all fallback", async (_label, ch, sec) => {
    const { ESPRITLatheMillTurnFunctionIndexEngine } = await import(
      "../engines/ESPRITLatheMillTurnFunctionIndexEngine.js"
    );
    const r = ESPRITLatheMillTurnFunctionIndexEngine.estimateChannelSync(ch, sec);
    expect(r.sync_strategy).toBe("wait_all");
    expect(r.estimated_stall_seconds).toBe(0);
    expect(r.rationale).toMatch(/Invalid/);
  });

  // Dispatcher round-trip
  it("round-trip: esprit_lathe_summary returns 9 ops / 85 params", async () => {
    const r: any = await invoke("esprit_lathe_summary", {});
    const d = r.data ?? r.result ?? r;
    expect(d.total_operations).toBe(9);
    expect(d.total_parameters).toBe(85);
  });

  it("round-trip: esprit_lathe_get_op('thread_single_point') → threading, 11 params", async () => {
    const r: any = await invoke("esprit_lathe_get_op", { operation_id: "thread_single_point" });
    const d = r.data ?? r.result ?? r;
    expect(d.category).toBe("threading");
    expect(d.parameter_count).toBe(11);
  });

  it("round-trip: esprit_lathe_select_threading(2.5, H) → modified_flank", async () => {
    const r: any = await invoke("esprit_lathe_select_threading", { pitch_mm: 2.5, material_iso: "H" });
    const d = r.data ?? r.result ?? r;
    expect(d.infeed_mode).toBe("modified_flank");
  });

  it("round-trip: esprit_lathe_select_millturn_axis(true, true) → y-axis pocket", async () => {
    const r: any = await invoke("esprit_lathe_select_millturn_axis", { machine_has_y: true, feature_off_axis: true });
    const d = r.data ?? r.result ?? r;
    expect(d.operation_id).toBe("millturn_y_axis_pocket");
    expect(d.use_polar).toBe(false);
  });

  it("round-trip: esprit_lathe_estimate_channel_sync(4, 30) → wait_any with stall=27s", async () => {
    const r: any = await invoke("esprit_lathe_estimate_channel_sync", { channel_count: 4, avg_op_seconds: 30 });
    const d = r.data ?? r.result ?? r;
    expect(d.sync_strategy).toBe("wait_any");
    expect(d.estimated_stall_seconds).toBeCloseTo(27, 5);
  });

  it("round-trip: zod rejects channel_count > 8", async () => {
    const r: any = await invoke("esprit_lathe_estimate_channel_sync", { channel_count: 12, avg_op_seconds: 10 });
    const blob = JSON.stringify(r);
    expect(blob).toMatch(/Invalid params|8/);
  });

  it("camDispatcher ACTIONS contains all 10 esprit_lathe_* names", async () => {
    const mod: any = await import("../tools/dispatchers/camDispatcher.js");
    const expected = [
      "esprit_lathe_index",
      "esprit_lathe_summary",
      "esprit_lathe_list_ops",
      "esprit_lathe_get_op",
      "esprit_lathe_by_category",
      "esprit_lathe_find_param",
      "esprit_lathe_recommend",
      "esprit_lathe_select_threading",
      "esprit_lathe_select_millturn_axis",
      "esprit_lathe_estimate_channel_sync",
    ];
    for (const a of expected) expect(mod.ACTIONS).toContain(a);
  });

  it("ACTION_ESPRIT_LATHE_MILLTURN_FUNCTION_INDEX_SCHEMAS has exactly 10 keys", async () => {
    const { ACTION_ESPRIT_LATHE_MILLTURN_FUNCTION_INDEX_SCHEMAS } = await import(
      "../schemas/espritLatheMillTurnFunctionIndexActionSchemas.js"
    );
    expect(Object.keys(ACTION_ESPRIT_LATHE_MILLTURN_FUNCTION_INDEX_SCHEMAS)).toHaveLength(10);
  });

  it("esprit_lathe_select_threading schema enforces positive pitch + valid iso", async () => {
    const { ACTION_ESPRIT_LATHE_MILLTURN_FUNCTION_INDEX_SCHEMAS } = await import(
      "../schemas/espritLatheMillTurnFunctionIndexActionSchemas.js"
    );
    const s = ACTION_ESPRIT_LATHE_MILLTURN_FUNCTION_INDEX_SCHEMAS.esprit_lathe_select_threading;
    expect(s.safeParse({ pitch_mm: 1.5, material_iso: "P" }).success).toBe(true);
    expect(s.safeParse({ pitch_mm: 0, material_iso: "P" }).success).toBe(false);
    expect(s.safeParse({ pitch_mm: 1, material_iso: "Z" }).success).toBe(false);
  });
});
