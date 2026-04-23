/**
 * ESPRITWireEDMFunctionIndexEngine — CAM-EXHAUST-MS0/U-CAM51
 *
 * Coverage:
 *   - schema invariants: 8 ops / 59 params / 7 categories / 4 topics
 *   - per-op declared==actual nested-key count
 *   - variability: wire materials, taper modes, routing strategies, recovery modes
 *   - recommendByFeature: 8 intents + default fallback
 *   - selectSkimSchedule: 5 zones (Ra ≥3.2, >1.6, ≥0.8, ≥0.4, <0.4) + adversarial
 *   - selectTaperReferencePlane: textbook geometry + within/outside envelope
 *   - computeDieClearance: 4 zones (fineblanking, ISO-H, ISO-N, general) + adversarial
 *   - estimateCycleTime: textbook reference + adversarial
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

describe("ESPRITWireEDMFunctionIndexEngine — engine + dispatcher", () => {
  it("getSummary returns 8 ops / 59 params / 7 categories / esprit/wire_edm", async () => {
    const { ESPRITWireEDMFunctionIndexEngine } = await import(
      "../engines/ESPRITWireEDMFunctionIndexEngine.js"
    );
    const s: any = ESPRITWireEDMFunctionIndexEngine.getSummary();
    expect(s.system_id).toBe("esprit");
    expect(s.section_key).toBe("wire_edm");
    expect(s.total_operations).toBe(8);
    expect(s.total_parameters).toBe(59);
    expect(s.categories).toHaveLength(7);
    expect(s.training_topics_count).toBe(4);
  });

  it.each([
    ["wire_2axis_cut", "cut_2axis", 10],
    ["wire_4axis_taper", "taper_4axis", 11],
    ["wire_skim_pass", "skim_pass", 8],
    ["wire_auto_route", "auto_routing", 6],
    ["wire_punch_die", "punch_die", 8],
    ["wire_technology_select", "technology", 6],
    ["wire_break_recovery", "monitoring", 5],
    ["wire_corner_strategy", "cut_2axis", 5],
  ])("op %s → category %s, params %i (declared==actual)", async (id, cat, count) => {
    const { ESPRITWireEDMFunctionIndexEngine } = await import(
      "../engines/ESPRITWireEDMFunctionIndexEngine.js"
    );
    const op: any = ESPRITWireEDMFunctionIndexEngine.getOperation(id);
    expect("error" in op).toBe(false);
    expect(op.category).toBe(cat);
    expect(op.parameter_count).toBe(count);
    let actual = 0;
    for (const grp of Object.values(op.parameters) as any) actual += Object.keys(grp).length;
    expect(actual).toBe(count);
  });

  it("variability: wire_2axis_cut enumerates 5 wire materials", async () => {
    const { ESPRITWireEDMFunctionIndexEngine } = await import(
      "../engines/ESPRITWireEDMFunctionIndexEngine.js"
    );
    const op: any = ESPRITWireEDMFunctionIndexEngine.getOperation("wire_2axis_cut");
    const mats = op.parameters.wire.wire_material.values;
    expect(mats).toEqual(["brass", "coated_brass", "molybdenum", "tungsten", "stratified"]);
  });

  it("variability: wire_4axis_taper enumerates 3 taper modes", async () => {
    const { ESPRITWireEDMFunctionIndexEngine } = await import(
      "../engines/ESPRITWireEDMFunctionIndexEngine.js"
    );
    const op: any = ESPRITWireEDMFunctionIndexEngine.getOperation("wire_4axis_taper");
    const modes = op.parameters.taper.taper_mode.values;
    expect(modes).toEqual(["constant_angle", "two_chain_sync", "variable_per_segment"]);
  });

  it("variability: wire_auto_route enumerates 4 routing strategies", async () => {
    const { ESPRITWireEDMFunctionIndexEngine } = await import(
      "../engines/ESPRITWireEDMFunctionIndexEngine.js"
    );
    const op: any = ESPRITWireEDMFunctionIndexEngine.getOperation("wire_auto_route");
    const strats = op.parameters.routing.routing_strategy.values;
    expect(strats).toEqual(["nearest_neighbor", "two_opt", "row_by_row", "operator_defined"]);
  });

  it("variability: wire_break_recovery enumerates 3 recovery modes", async () => {
    const { ESPRITWireEDMFunctionIndexEngine } = await import(
      "../engines/ESPRITWireEDMFunctionIndexEngine.js"
    );
    const op: any = ESPRITWireEDMFunctionIndexEngine.getOperation("wire_break_recovery");
    const modes = op.parameters.recovery.recovery_mode.values;
    expect(modes).toEqual(["auto_rethread", "retreat_and_alert", "alert_only"]);
  });

  it("getOperation returns {error} on unknown id", async () => {
    const { ESPRITWireEDMFunctionIndexEngine } = await import(
      "../engines/ESPRITWireEDMFunctionIndexEngine.js"
    );
    const bad: any = ESPRITWireEDMFunctionIndexEngine.getOperation("nope");
    expect(bad.error).toMatch(/nope/);
  });

  it("getOperationsByCategory case-insensitive; cut_2axis has 2 ops", async () => {
    const { ESPRITWireEDMFunctionIndexEngine } = await import(
      "../engines/ESPRITWireEDMFunctionIndexEngine.js"
    );
    const cut = ESPRITWireEDMFunctionIndexEngine.getOperationsByCategory("cut_2axis");
    expect(cut.length).toBe(2);
    const upper = ESPRITWireEDMFunctionIndexEngine.getOperationsByCategory("CUT_2AXIS");
    expect(upper.length).toBe(2);
    expect(ESPRITWireEDMFunctionIndexEngine.getOperationsByCategory("nope")).toHaveLength(0);
  });

  it("findParameter: stock_thickness_mm appears in 3+ ops; limit caps; miss returns []", async () => {
    const { ESPRITWireEDMFunctionIndexEngine } = await import(
      "../engines/ESPRITWireEDMFunctionIndexEngine.js"
    );
    const all = ESPRITWireEDMFunctionIndexEngine.findParameter("stock_thickness_mm", 100);
    expect(all.length).toBeGreaterThanOrEqual(3);
    for (const m of all) expect(m.parameter).toBe("stock_thickness_mm");
    const capped = ESPRITWireEDMFunctionIndexEngine.findParameter("stock_thickness_mm", 1);
    expect(capped.length).toBe(1);
    expect(ESPRITWireEDMFunctionIndexEngine.findParameter("zz_xxx_nope")).toHaveLength(0);
  });

  // recommendByFeature — 8 intents
  it.each([
    ["cut_2axis_simple", "wire_2axis_cut"],
    ["cut_4axis_taper", "wire_4axis_taper"],
    ["skim_finish", "wire_skim_pass"],
    ["auto_route_multi_cavity", "wire_auto_route"],
    ["punch_die_pair", "wire_punch_die"],
    ["technology_select", "wire_technology_select"],
    ["wire_break_recover", "wire_break_recovery"],
    ["corner_strategy", "wire_corner_strategy"],
  ])("recommendByFeature(%s) → %s", async (intent, expected) => {
    const { ESPRITWireEDMFunctionIndexEngine } = await import(
      "../engines/ESPRITWireEDMFunctionIndexEngine.js"
    );
    const r = ESPRITWireEDMFunctionIndexEngine.recommendByFeature(intent);
    expect(r.primary).toBe(expected);
    const op: any = ESPRITWireEDMFunctionIndexEngine.getOperation(r.primary);
    expect("error" in op).toBe(false);
  });

  it("recommendByFeature unknown → defaults to wire_2axis_cut", async () => {
    const { ESPRITWireEDMFunctionIndexEngine } = await import(
      "../engines/ESPRITWireEDMFunctionIndexEngine.js"
    );
    const r = ESPRITWireEDMFunctionIndexEngine.recommendByFeature("totally_bogus");
    expect(r.primary).toBe("wire_2axis_cut");
    expect(r.reason).toMatch(/unknown|default/i);
  });

  // selectSkimSchedule — 5 zones
  it.each([
    [3.2, 0],
    [5.0, 0],
    [3.0, 1],
    [1.7, 1],
    [1.6, 2],
    [1.0, 2],
    [0.8, 2],
    [0.5, 3],
    [0.4, 3],
    [0.3, 4],
    [0.1, 4],
  ])("selectSkimSchedule(Ra=%fμm) → %i skims", async (ra, expected) => {
    const { ESPRITWireEDMFunctionIndexEngine } = await import(
      "../engines/ESPRITWireEDMFunctionIndexEngine.js"
    );
    const r = ESPRITWireEDMFunctionIndexEngine.selectSkimSchedule(ra);
    expect(r.skim_count).toBe(expected);
    expect(r.target_ra_um).toBe(ra);
  });

  it.each([
    ["NaN", NaN],
    ["zero", 0],
    ["negative", -1],
  ])("selectSkimSchedule adversarial Ra %s → 2 skims fallback", async (_label, ra) => {
    const { ESPRITWireEDMFunctionIndexEngine } = await import(
      "../engines/ESPRITWireEDMFunctionIndexEngine.js"
    );
    const r = ESPRITWireEDMFunctionIndexEngine.selectSkimSchedule(ra);
    expect(r.skim_count).toBe(2);
    expect(r.rationale).toMatch(/Invalid/);
  });

  // selectTaperReferencePlane — geometric textbook
  it("selectTaperReferencePlane: 50mm thickness, 10° taper, 30mm envelope → midplane (4.41mm half-excursion)", async () => {
    const { ESPRITWireEDMFunctionIndexEngine } = await import(
      "../engines/ESPRITWireEDMFunctionIndexEngine.js"
    );
    const r = ESPRITWireEDMFunctionIndexEngine.selectTaperReferencePlane(50, 10, 30);
    // Midplane half-excursion = 25 × tan(10°) ≈ 25 × 0.1763 ≈ 4.41
    expect(r.reference_plane).toBe("midplane");
    expect(r.max_uv_excursion_mm).toBeCloseTo(4.41, 1);
    expect(r.within_envelope).toBe(true);
  });

  it("selectTaperReferencePlane: huge thickness exceeds envelope at midplane → midplane + within_envelope=false", async () => {
    const { ESPRITWireEDMFunctionIndexEngine } = await import(
      "../engines/ESPRITWireEDMFunctionIndexEngine.js"
    );
    // 200mm thickness × 30° taper → midplane half = 100 × tan(30°) ≈ 57.7mm > 30mm envelope
    const r = ESPRITWireEDMFunctionIndexEngine.selectTaperReferencePlane(200, 30, 30);
    expect(r.reference_plane).toBe("midplane");
    expect(r.within_envelope).toBe(false);
    expect(r.rationale).toMatch(/exceeds envelope/);
  });

  it("selectTaperReferencePlane: 0° taper → 0 excursion, within envelope", async () => {
    const { ESPRITWireEDMFunctionIndexEngine } = await import(
      "../engines/ESPRITWireEDMFunctionIndexEngine.js"
    );
    const r = ESPRITWireEDMFunctionIndexEngine.selectTaperReferencePlane(50, 0, 30);
    expect(r.max_uv_excursion_mm).toBe(0);
    expect(r.within_envelope).toBe(true);
  });

  it.each([
    ["NaN thickness", NaN, 5, 30],
    ["zero thickness", 0, 5, 30],
    ["negative envelope", 50, 5, -10],
  ])("selectTaperReferencePlane adversarial: %s → lower fallback", async (_label, t, ang, env) => {
    const { ESPRITWireEDMFunctionIndexEngine } = await import(
      "../engines/ESPRITWireEDMFunctionIndexEngine.js"
    );
    const r = ESPRITWireEDMFunctionIndexEngine.selectTaperReferencePlane(t, ang, env);
    expect(r.reference_plane).toBe("lower");
    expect(r.within_envelope).toBe(false);
    expect(r.rationale).toMatch(/Invalid/);
  });

  // computeDieClearance — 4 zones
  it.each([
    [10, "P", false, 5, 0.5],
    [10, "M", false, 5, 0.5],
    [10, "K", false, 5, 0.5],
    [10, "N", false, 4, 0.4],
    [10, "H", false, 9, 0.9],
    [10, "P", true, 1.5, 0.15],
    [10, "H", true, 1.5, 0.15],
  ])("computeDieClearance(t=%i, %s, fineblank=%s) → %f%%, %fmm/side", async (t, iso, fb, pct, mm) => {
    const { ESPRITWireEDMFunctionIndexEngine } = await import(
      "../engines/ESPRITWireEDMFunctionIndexEngine.js"
    );
    const r = ESPRITWireEDMFunctionIndexEngine.computeDieClearance(t, iso as any, fb);
    expect(r.clearance_pct).toBe(pct);
    expect(r.clearance_per_side_mm).toBeCloseTo(mm, 3);
  });

  it.each([
    ["NaN thickness", NaN],
    ["zero thickness", 0],
    ["negative thickness", -5],
  ])("computeDieClearance adversarial: %s → 5%% generic fallback", async (_label, t) => {
    const { ESPRITWireEDMFunctionIndexEngine } = await import(
      "../engines/ESPRITWireEDMFunctionIndexEngine.js"
    );
    const r = ESPRITWireEDMFunctionIndexEngine.computeDieClearance(t, "P", false);
    expect(r.clearance_pct).toBe(5);
    expect(r.clearance_per_side_mm).toBe(0);
    expect(r.rationale).toMatch(/Invalid/);
  });

  // estimateCycleTime — textbook
  it("estimateCycleTime(area=600mm², t=10mm, 2 skims) → rough=4min, skim=10min, total=14min", async () => {
    const { ESPRITWireEDMFunctionIndexEngine } = await import(
      "../engines/ESPRITWireEDMFunctionIndexEngine.js"
    );
    const r = ESPRITWireEDMFunctionIndexEngine.estimateCycleTime(600, 10, 2);
    // rough = 600/150 = 4; skim = 2 × (600/120) = 10
    expect(r.rough_min).toBeCloseTo(4, 2);
    expect(r.skim_min).toBeCloseTo(10, 2);
    expect(r.total_min).toBeCloseTo(14, 2);
  });

  it("estimateCycleTime with 0 skims → skim_min = 0", async () => {
    const { ESPRITWireEDMFunctionIndexEngine } = await import(
      "../engines/ESPRITWireEDMFunctionIndexEngine.js"
    );
    const r = ESPRITWireEDMFunctionIndexEngine.estimateCycleTime(300, 5, 0);
    expect(r.skim_min).toBe(0);
    expect(r.rough_min).toBeCloseTo(2, 2);
    expect(r.total_min).toBeCloseTo(2, 2);
  });

  it.each([
    ["NaN area", NaN, 10, 2],
    ["zero area", 0, 10, 2],
    ["negative thickness", 100, -5, 2],
    ["over 5 skims", 100, 10, 6],
  ])("estimateCycleTime adversarial: %s → zeros", async (_label, a, t, s) => {
    const { ESPRITWireEDMFunctionIndexEngine } = await import(
      "../engines/ESPRITWireEDMFunctionIndexEngine.js"
    );
    const r = ESPRITWireEDMFunctionIndexEngine.estimateCycleTime(a, t, s);
    expect(r.total_min).toBe(0);
    expect(r.rationale).toMatch(/Invalid/);
  });

  // Dispatcher round-trip
  it("round-trip: esprit_wedm_summary returns 8 ops / 59 params", async () => {
    const r: any = await invoke("esprit_wedm_summary", {});
    const d = r.data ?? r.result ?? r;
    expect(d.total_operations).toBe(8);
    expect(d.total_parameters).toBe(59);
  });

  it("round-trip: esprit_wedm_select_skim_schedule(Ra=0.4) → 3 skims", async () => {
    const r: any = await invoke("esprit_wedm_select_skim_schedule", { target_ra_um: 0.4 });
    const d = r.data ?? r.result ?? r;
    expect(d.skim_count).toBe(3);
  });

  it("round-trip: esprit_wedm_select_taper_plane(50, 10, 30) → midplane", async () => {
    const r: any = await invoke("esprit_wedm_select_taper_plane", {
      thickness_mm: 50,
      taper_angle_deg: 10,
      guide_uv_max_mm: 30,
    });
    const d = r.data ?? r.result ?? r;
    expect(d.reference_plane).toBe("midplane");
    expect(d.within_envelope).toBe(true);
  });

  it("round-trip: esprit_wedm_compute_die_clearance(20, H) → 9%, 1.8mm/side", async () => {
    const r: any = await invoke("esprit_wedm_compute_die_clearance", {
      thickness_mm: 20,
      material_iso: "H",
    });
    const d = r.data ?? r.result ?? r;
    expect(d.clearance_pct).toBe(9);
    expect(d.clearance_per_side_mm).toBeCloseTo(1.8, 3);
  });

  it("round-trip: esprit_wedm_estimate_cycle(600, 10, 2) → total ~14min", async () => {
    const r: any = await invoke("esprit_wedm_estimate_cycle", {
      area_mm2: 600,
      thickness_mm: 10,
      skim_count: 2,
    });
    const d = r.data ?? r.result ?? r;
    expect(d.total_min).toBeCloseTo(14, 2);
  });

  it("round-trip: zod rejects skim_count > 5", async () => {
    const r: any = await invoke("esprit_wedm_estimate_cycle", {
      area_mm2: 100,
      thickness_mm: 10,
      skim_count: 7,
    });
    const blob = JSON.stringify(r);
    expect(blob).toMatch(/Invalid params|5/);
  });

  it("camDispatcher ACTIONS contains all 11 esprit_wedm_* names", async () => {
    const mod: any = await import("../tools/dispatchers/camDispatcher.js");
    const expected = [
      "esprit_wedm_index",
      "esprit_wedm_summary",
      "esprit_wedm_list_ops",
      "esprit_wedm_get_op",
      "esprit_wedm_by_category",
      "esprit_wedm_find_param",
      "esprit_wedm_recommend",
      "esprit_wedm_select_skim_schedule",
      "esprit_wedm_select_taper_plane",
      "esprit_wedm_compute_die_clearance",
      "esprit_wedm_estimate_cycle",
    ];
    for (const a of expected) expect(mod.ACTIONS).toContain(a);
  });

  it("ACTION_ESPRIT_WIRE_EDM_FUNCTION_INDEX_SCHEMAS has exactly 11 keys", async () => {
    const { ACTION_ESPRIT_WIRE_EDM_FUNCTION_INDEX_SCHEMAS } = await import(
      "../schemas/espritWireEDMFunctionIndexActionSchemas.js"
    );
    expect(Object.keys(ACTION_ESPRIT_WIRE_EDM_FUNCTION_INDEX_SCHEMAS)).toHaveLength(11);
  });

  it("esprit_wedm_select_taper_plane schema enforces taper_angle in [-30, 30]", async () => {
    const { ACTION_ESPRIT_WIRE_EDM_FUNCTION_INDEX_SCHEMAS } = await import(
      "../schemas/espritWireEDMFunctionIndexActionSchemas.js"
    );
    const s = ACTION_ESPRIT_WIRE_EDM_FUNCTION_INDEX_SCHEMAS.esprit_wedm_select_taper_plane;
    expect(s.safeParse({ thickness_mm: 10, taper_angle_deg: 0, guide_uv_max_mm: 30 }).success).toBe(true);
    expect(s.safeParse({ thickness_mm: 10, taper_angle_deg: 35, guide_uv_max_mm: 30 }).success).toBe(false);
    expect(s.safeParse({ thickness_mm: 10, taper_angle_deg: -35, guide_uv_max_mm: 30 }).success).toBe(false);
  });
});
