/**
 * PowerMillFunctionIndexEngine — CAM-EXHAUST-MS0/U-CAM46
 *
 * Coverage:
 *   - manifest: 3 sections (roughing/finishing/5axis_robot), 36 ops, 556 params
 *   - per-section pointer integrity (file, op_count, param_count, op_ids)
 *   - getAllOperations: real flat list with section_key annotations
 *   - findOperation: cross-section lookup + miss case
 *   - findParameterAcrossSections: real param search + limit + empty
 *   - getCategoryUniverse: deduplicated cat list with section attribution
 *   - recommendForFeature: ≥3 routing intents per section + hint fallback + no-match path
 *   - validateConsistency: real consistency report (is_consistent, totals match, no duplicates)
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

describe("PowerMillFunctionIndexEngine — unified index + dispatcher", () => {
  it("getManifest exposes powermill/2024 with exactly 3 sections (roughing/finishing/5axis_robot) and expected_totals", async () => {
    const { PowerMillFunctionIndexEngine } = await import(
      "../engines/PowerMillFunctionIndexEngine.js"
    );
    const m: any = PowerMillFunctionIndexEngine.getManifest();
    expect(m.system_id).toBe("powermill");
    expect(m.version).toBe("2024");
    expect(Object.keys(m.sections).sort()).toEqual(["5axis_robot", "finishing", "roughing"]);
    expect(m.sections.roughing.file).toBe("roughing.json");
    expect(m.sections.finishing.file).toBe("finishing.json");
    expect(m.sections["5axis_robot"].file).toBe("5axis-robot.json");
    expect(m.expected_totals).toEqual({ sections: 3, operations: 36, parameters: 556 });
  });

  it("getSectionList returns sorted [5axis_robot, finishing, roughing]", async () => {
    const { PowerMillFunctionIndexEngine } = await import(
      "../engines/PowerMillFunctionIndexEngine.js"
    );
    expect(PowerMillFunctionIndexEngine.getSectionList()).toEqual(["5axis_robot", "finishing", "roughing"]);
  });

  it.each([
    ["roughing", "roughing.json", 12, 189, 6],
    ["finishing", "finishing.json", 12, 180, 6],
    ["5axis_robot", "5axis-robot.json", 12, 187, 6],
  ])("section %s pointer: file=%s, ops=%i, params=%i, training_topics=%i", async (key, file, ops, params, topics) => {
    const { PowerMillFunctionIndexEngine } = await import(
      "../engines/PowerMillFunctionIndexEngine.js"
    );
    const s: any = PowerMillFunctionIndexEngine.getSectionStats(key);
    expect(s.file).toBe(file);
    expect(s.operation_count).toBe(ops);
    expect(s.parameter_count).toBe(params);
    expect(s.training_topic_count).toBe(topics);
    expect(s.operation_ids).toHaveLength(ops);
    expect(typeof s.operation_ids[0]).toBe("string");
    expect(s.operation_ids[0].length).toBeGreaterThan(0);
  });

  it("getSectionStats returns {error: ...} on unknown key", async () => {
    const { PowerMillFunctionIndexEngine } = await import(
      "../engines/PowerMillFunctionIndexEngine.js"
    );
    const s: any = PowerMillFunctionIndexEngine.getSectionStats("not_a_section");
    expect(s.error).toMatch(/not_a_section/);
  });

  it("getAllOperations returns 36 ops with section_key + 556 declared param sum", async () => {
    const { PowerMillFunctionIndexEngine } = await import(
      "../engines/PowerMillFunctionIndexEngine.js"
    );
    const all = PowerMillFunctionIndexEngine.getAllOperations();
    expect(all).toHaveLength(36);
    const totalParams = all.reduce((a, o) => a + o.parameter_count, 0);
    expect(totalParams).toBe(556);
    // distribution: 12 each
    const bySection: Record<string, number> = {};
    for (const op of all) {
      bySection[op.section_key] = (bySection[op.section_key] ?? 0) + 1;
    }
    expect(bySection).toEqual({ roughing: 12, finishing: 12, "5axis_robot": 12 });
  });

  it.each([
    ["vortex_clearance", "roughing"],
    ["model_area_clearance", "roughing"],
    ["steep_and_shallow", "finishing"],
    ["pencil_finish", "finishing"],
    ["blade_simul5", "5axis_robot"],
    ["robot_config", "5axis_robot"],
  ])("findOperation('%s') resolves to section=%s", async (op_id, section) => {
    const { PowerMillFunctionIndexEngine } = await import(
      "../engines/PowerMillFunctionIndexEngine.js"
    );
    const r = PowerMillFunctionIndexEngine.findOperation(op_id);
    expect(r.found).toBe(true);
    expect(r.matches).toHaveLength(1);
    expect(r.matches[0].section_key).toBe(section);
    expect(r.matches[0].operation_id).toBe(op_id);
  });

  it("findOperation reports not-found cleanly", async () => {
    const { PowerMillFunctionIndexEngine } = await import(
      "../engines/PowerMillFunctionIndexEngine.js"
    );
    const r = PowerMillFunctionIndexEngine.findOperation("does_not_exist_anywhere");
    expect(r.found).toBe(false);
    expect(r.matches).toHaveLength(0);
  });

  it("findParameterAcrossSections('safe_z_mm') hits ≥1 section in real catalog", async () => {
    const { PowerMillFunctionIndexEngine } = await import(
      "../engines/PowerMillFunctionIndexEngine.js"
    );
    const matches = PowerMillFunctionIndexEngine.findParameterAcrossSections("safe_z_mm", 200);
    expect(matches.length).toBeGreaterThanOrEqual(5);
    matches.forEach((m) => expect(m.parameter).toBe("safe_z_mm"));
    // Should find safe_z_mm across multiple sections
    const sections = new Set(matches.map((m) => m.section_key));
    expect(sections.size).toBeGreaterThanOrEqual(2);
  });

  it("findParameterAcrossSections respects limit", async () => {
    const { PowerMillFunctionIndexEngine } = await import(
      "../engines/PowerMillFunctionIndexEngine.js"
    );
    const big = PowerMillFunctionIndexEngine.findParameterAcrossSections("stepover", 1000);
    const capped = PowerMillFunctionIndexEngine.findParameterAcrossSections("stepover", 5);
    expect(big.length).toBeGreaterThan(5);
    expect(capped.length).toBe(5);
  });

  it("findParameterAcrossSections returns empty on no match", async () => {
    const { PowerMillFunctionIndexEngine } = await import(
      "../engines/PowerMillFunctionIndexEngine.js"
    );
    expect(PowerMillFunctionIndexEngine.findParameterAcrossSections("zz_nonexistent_param")).toHaveLength(0);
  });

  it("getCategoryUniverse returns 15 deduplicated categories from all 3 sources, totalOps=36", async () => {
    const { PowerMillFunctionIndexEngine } = await import(
      "../engines/PowerMillFunctionIndexEngine.js"
    );
    const universe = PowerMillFunctionIndexEngine.getCategoryUniverse();
    // roughing 5 + finishing 5 + 5axis 5 = 15 distinct cat names
    expect(universe.length).toBe(15);
    const flatSections = new Set<string>();
    for (const u of universe) for (const s of u.sections) flatSections.add(s);
    expect(flatSections).toEqual(new Set(["roughing", "finishing", "5axis_robot"]));
    const totalOps = universe.reduce((a, x) => a + x.operation_count, 0);
    expect(totalOps).toBe(36);
  });

  // recommendForFeature — deterministic routing across all 3 sections
  it.each([
    ["vortex", "roughing", "vortex_clearance"],
    ["adaptive_rough", "roughing", "vortex_clearance"],
    ["cavity_rough", "roughing", "model_area_clearance"],
    ["plunge_rough", "roughing", "plunge_roughing"],
    ["rest_rough", "roughing", "rest_roughing"],
    ["steep_shallow", "finishing", "steep_and_shallow"],
    ["constant_z_finish", "finishing", "constant_z"],
    ["3d_offset", "finishing", "offset_3d"],
    ["raster_finish", "finishing", "raster_finish"],
    ["pencil_finish", "finishing", "pencil_finish"],
    ["impeller", "5axis_robot", "blade_simul5"],
    ["3plus2", "5axis_robot", "index_3plus2"],
    ["robot_config", "5axis_robot", "robot_config"],
    ["robot_post", "5axis_robot", "robot_post"],
  ])("recommendForFeature('%s') → %s/%s", async (feature, section, op) => {
    const { PowerMillFunctionIndexEngine } = await import(
      "../engines/PowerMillFunctionIndexEngine.js"
    );
    const r = PowerMillFunctionIndexEngine.recommendForFeature(feature);
    expect(r.section_key).toBe(section);
    expect(r.operation_id).toBe(op);
    expect(r.reason.length).toBeGreaterThan(10);
  });

  it.each([
    ["roughing", "roughing", "model_area_clearance"],
    ["finishing", "finishing", "steep_and_shallow"],
    ["5axis", "5axis_robot", "swarf_simul5"],
    ["robot", "5axis_robot", "robot_reach"],
  ])("recommendForFeature hint='%s' → %s/%s", async (hint, section, op) => {
    const { PowerMillFunctionIndexEngine } = await import(
      "../engines/PowerMillFunctionIndexEngine.js"
    );
    const r = PowerMillFunctionIndexEngine.recommendForFeature("ambiguous_thing", hint);
    expect(r.section_key).toBe(section);
    expect(r.operation_id).toBe(op);
  });

  it("recommendForFeature reports no-match cleanly when no rule fires", async () => {
    const { PowerMillFunctionIndexEngine } = await import(
      "../engines/PowerMillFunctionIndexEngine.js"
    );
    const r = PowerMillFunctionIndexEngine.recommendForFeature("totally_unrelated_xyz");
    expect(r.section_key).toBeNull();
    expect(r.operation_id).toBeNull();
    expect(r.reason).toMatch(/no routing rule/i);
    expect(r.alternatives).toHaveLength(0);
  });

  it("validateConsistency confirms manifest = actual, no duplicates, no missing files", async () => {
    const { PowerMillFunctionIndexEngine } = await import(
      "../engines/PowerMillFunctionIndexEngine.js"
    );
    const c = PowerMillFunctionIndexEngine.validateConsistency();
    expect(c.is_consistent).toBe(true);
    expect(c.manifest_section_count).toBe(3);
    expect(c.actual_section_count).toBe(3);
    expect(c.manifest_total_operations).toBe(36);
    expect(c.actual_total_operations).toBe(36);
    expect(c.manifest_total_parameters).toBe(556);
    expect(c.actual_total_parameters).toBe(556);
    expect(c.duplicate_operation_ids ?? []).toHaveLength(0);
    expect(c.missing_files ?? []).toHaveLength(0);
  });

  // Dispatcher round-trip
  it("round-trip: pm_index_manifest exposes 3 sections + expected_totals", async () => {
    const r: any = await invoke("pm_index_manifest", {});
    const d = r.data ?? r.result ?? r;
    expect(Object.keys(d.sections).sort()).toEqual(["5axis_robot", "finishing", "roughing"]);
    expect(d.expected_totals.operations).toBe(36);
    expect(d.expected_totals.parameters).toBe(556);
  });

  it("round-trip: pm_index_section_list returns sorted 3-key list", async () => {
    const r: any = await invoke("pm_index_section_list", {});
    const d = r.data ?? r.result ?? r;
    expect(d).toEqual(["5axis_robot", "finishing", "roughing"]);
  });

  it("round-trip: pm_index_section_stats('roughing') returns 12/189/roughing.json", async () => {
    const r: any = await invoke("pm_index_section_stats", { section_key: "roughing" });
    const d = r.data ?? r.result ?? r;
    expect(d.file).toBe("roughing.json");
    expect(d.operation_count).toBe(12);
    expect(d.parameter_count).toBe(189);
  });

  it("round-trip: pm_index_all_ops returns 36 entries", async () => {
    const r: any = await invoke("pm_index_all_ops", {});
    const d = r.data ?? r.result ?? r;
    expect(d).toHaveLength(36);
  });

  it("round-trip: pm_index_find_op('vortex_clearance') resolves to roughing", async () => {
    const r: any = await invoke("pm_index_find_op", { operation_id: "vortex_clearance" });
    const d = r.data ?? r.result ?? r;
    expect(d.found).toBe(true);
    expect(d.matches[0].section_key).toBe("roughing");
  });

  it("round-trip: pm_index_recommend('impeller') routes to 5axis_robot/blade_simul5", async () => {
    const r: any = await invoke("pm_index_recommend", { feature: "impeller" });
    const d = r.data ?? r.result ?? r;
    expect(d.section_key).toBe("5axis_robot");
    expect(d.operation_id).toBe("blade_simul5");
  });

  it("round-trip: pm_index_validate is_consistent=true", async () => {
    const r: any = await invoke("pm_index_validate", {});
    const d = r.data ?? r.result ?? r;
    expect(d.is_consistent).toBe(true);
    expect(d.actual_total_operations).toBe(36);
    expect(d.actual_total_parameters).toBe(556);
  });

  it("round-trip: pm_index_section_stats validation error on missing section_key", async () => {
    const r: any = await invoke("pm_index_section_stats", {});
    const blob = JSON.stringify(r);
    expect(blob).toMatch(/Invalid params|section_key/i);
  });

  // Schema integration
  it("camDispatcher ACTIONS contains all 9 pm_index_* action names", async () => {
    const mod: any = await import("../tools/dispatchers/camDispatcher.js");
    const expected = [
      "pm_index_manifest",
      "pm_index_section_list",
      "pm_index_section_stats",
      "pm_index_all_ops",
      "pm_index_find_op",
      "pm_index_find_param",
      "pm_index_category_universe",
      "pm_index_recommend",
      "pm_index_validate",
    ];
    for (const a of expected) expect(mod.ACTIONS).toContain(a);
  });

  it("ACTION_PM_FUNCTION_INDEX_SCHEMAS has exactly 9 keys", async () => {
    const { ACTION_PM_FUNCTION_INDEX_SCHEMAS } = await import(
      "../schemas/powerMillFunctionIndexActionSchemas.js"
    );
    expect(Object.keys(ACTION_PM_FUNCTION_INDEX_SCHEMAS)).toHaveLength(9);
  });

  it("pm_index_recommend schema requires non-empty feature; hint optional", async () => {
    const { ACTION_PM_FUNCTION_INDEX_SCHEMAS } = await import(
      "../schemas/powerMillFunctionIndexActionSchemas.js"
    );
    const s = ACTION_PM_FUNCTION_INDEX_SCHEMAS.pm_index_recommend;
    expect(s.safeParse({ feature: "vortex" }).success).toBe(true);
    expect(s.safeParse({ feature: "vortex", hint: "roughing" }).success).toBe(true);
    expect(s.safeParse({ feature: "" }).success).toBe(false);
    expect(s.safeParse({}).success).toBe(false);
  });

  it("pm_index_find_param schema: limit bounds [1,500] enforced", async () => {
    const { ACTION_PM_FUNCTION_INDEX_SCHEMAS } = await import(
      "../schemas/powerMillFunctionIndexActionSchemas.js"
    );
    const s = ACTION_PM_FUNCTION_INDEX_SCHEMAS.pm_index_find_param;
    expect(s.safeParse({ parameter_name: "stepover" }).success).toBe(true);
    expect(s.safeParse({ parameter_name: "stepover", limit: 50 }).success).toBe(true);
    expect(s.safeParse({ parameter_name: "stepover", limit: 0 }).success).toBe(false);
    expect(s.safeParse({ parameter_name: "stepover", limit: 1000 }).success).toBe(false);
    expect(s.safeParse({ parameter_name: "" }).success).toBe(false);
  });
});
