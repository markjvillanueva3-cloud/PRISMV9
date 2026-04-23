/**
 * SolidCAM5AxisFunctionIndexEngine — CAM-EXHAUST-MS0/U-CAM36
 *
 * Coverage:
 *   - schema/metadata invariants (12 ops, 300 params, 4 categories)
 *   - per-op parameter consistency (declared vs nested actual)
 *   - variability spanning (3+ categories, 3+ axis modes, 3+ pass patterns)
 *   - adversarial edges (NaN, Infinity, negative, zero, huge)
 *   - engine method contracts (happy + failure)
 *   - recommendByFeature: 12 feature types route deterministically
 *   - validateAxisChange: kinematic identity rotary_vel = a*(f/60)
 *   - singularityCheck: zone classification + wrap-around
 *   - dispatcher integration: ACTIONS membership + schema safeParse
 */

import { describe, it, expect } from "vitest";

describe("SolidCAM5AxisFunctionIndexEngine — engine + dispatcher", () => {
  // ────────────────────────────────────────────────────────────────────
  // Schema & metadata
  // ────────────────────────────────────────────────────────────────────
  it("engine module exports the SolidCAM5AxisFunctionIndexEngine class", async () => {
    const mod: any = await import("../engines/SolidCAM5AxisFunctionIndexEngine.js");
    expect(mod.SolidCAM5AxisFunctionIndexEngine).toBeTruthy();
    expect(typeof mod.SolidCAM5AxisFunctionIndexEngine.getSummary).toBe("function");
    expect(typeof mod.SolidCAM5AxisFunctionIndexEngine.recommendByFeature).toBe("function");
    expect(typeof mod.SolidCAM5AxisFunctionIndexEngine.validateAxisChange).toBe("function");
    expect(typeof mod.SolidCAM5AxisFunctionIndexEngine.singularityCheck).toBe("function");
  });

  it("getSummary returns 12 ops / 300 params / system_id 'solidcam' / 4 categories", async () => {
    const { SolidCAM5AxisFunctionIndexEngine } = await import(
      "../engines/SolidCAM5AxisFunctionIndexEngine.js"
    );
    const s: any = SolidCAM5AxisFunctionIndexEngine.getSummary();
    expect("error" in s).toBe(false);
    expect(s.system_id).toBe("solidcam");
    expect(s.section_key).toBe("5-axis");
    expect(s.total_operations).toBe(12);
    expect(s.total_parameters).toBe(300);
    expect(s.categories.length).toBe(4);
    expect(s.categories).toEqual(
      expect.arrayContaining([
        "positional",
        "simultaneous_drive",
        "simultaneous_axis",
        "specialty",
      ])
    );
    expect(s.training_topics_count).toBe(6);
  });

  it("listOperations returns exactly 12 entries", async () => {
    const { SolidCAM5AxisFunctionIndexEngine } = await import(
      "../engines/SolidCAM5AxisFunctionIndexEngine.js"
    );
    const ops: any = SolidCAM5AxisFunctionIndexEngine.listOperations();
    expect(Array.isArray(ops)).toBe(true);
    expect(ops.length).toBe(12);
    ops.forEach((o: any) => {
      expect(o.operation_id.length).toBeGreaterThan(0);
      expect(o.parameter_count).toBeGreaterThan(0);
      expect(["positional", "simultaneous_drive", "simultaneous_axis", "specialty"])
        .toContain(o.category);
    });
  });

  // ────────────────────────────────────────────────────────────────────
  // Reference values per op (variability spanning all 12)
  // ────────────────────────────────────────────────────────────────────
  it.each([
    ["5x_indexed_3plus2", "positional", 28],
    ["5x_swarf", "simultaneous_axis", 26],
    ["5x_morph", "simultaneous_drive", 25],
    ["5x_parallel_to_curve", "simultaneous_drive", 24],
    ["5x_parallel_to_surface", "simultaneous_drive", 24],
    ["5x_drive_surface", "simultaneous_drive", 26],
    ["5x_normal_to_surface", "simultaneous_drive", 23],
    ["5x_through_point", "simultaneous_axis", 22],
    ["5x_through_curve", "simultaneous_axis", 23],
    ["5x_multiblade", "specialty", 30],
    ["5x_port", "specialty", 27],
    ["5x_undercut", "specialty", 22],
  ])("op %s belongs to %s and has %i params", async (id, cat, count) => {
    const { SolidCAM5AxisFunctionIndexEngine } = await import(
      "../engines/SolidCAM5AxisFunctionIndexEngine.js"
    );
    const op: any = SolidCAM5AxisFunctionIndexEngine.getOperation(id);
    expect("error" in op).toBe(false);
    expect(op.category).toBe(cat);
    expect(op.parameter_count).toBe(count);
  });

  it("sum of per-op parameter_count equals 300 (anti-regression)", async () => {
    const { SolidCAM5AxisFunctionIndexEngine } = await import(
      "../engines/SolidCAM5AxisFunctionIndexEngine.js"
    );
    const idx: any = SolidCAM5AxisFunctionIndexEngine.getIndex();
    expect("error" in idx).toBe(false);
    const sum = Object.values(idx.operations).reduce(
      (acc: number, op: any) => acc + op.parameter_count,
      0
    );
    expect(sum).toBe(300);
  });

  it("each op's nested parameter count matches declared parameter_count", async () => {
    const { SolidCAM5AxisFunctionIndexEngine } = await import(
      "../engines/SolidCAM5AxisFunctionIndexEngine.js"
    );
    const idx: any = SolidCAM5AxisFunctionIndexEngine.getIndex();
    for (const [opId, op] of Object.entries(idx.operations) as any) {
      let actual = 0;
      for (const grp of Object.values(op.parameters) as any) {
        actual += Object.keys(grp).length;
      }
      expect({ opId, declared: op.parameter_count, actual }).toEqual({
        opId,
        declared: op.parameter_count,
        actual: op.parameter_count,
      });
    }
  });

  // ────────────────────────────────────────────────────────────────────
  // Variability spanning
  // ────────────────────────────────────────────────────────────────────
  it("axis modes vary across at least 3 distinct strategies", async () => {
    const { SolidCAM5AxisFunctionIndexEngine } = await import(
      "../engines/SolidCAM5AxisFunctionIndexEngine.js"
    );
    const idx: any = SolidCAM5AxisFunctionIndexEngine.getIndex();
    const modes = new Set<string>();
    for (const op of Object.values(idx.operations) as any) {
      const ta = op.parameters.tool_axis;
      if (!ta) continue;
      for (const p of Object.values(ta) as any) {
        if (p.values) for (const v of p.values) modes.add(v);
      }
    }
    expect(modes.size).toBeGreaterThanOrEqual(3);
    // Spot-check spanning: must include normal, lead/lag-style, and a tangent-style
    const arr = Array.from(modes).join(",");
    expect(arr).toMatch(/normal/);
    expect(arr).toMatch(/tangent|along_centerline|tilt_to_clear|perpendicular_to_blade|away_from_point/);
  });

  it("category breakdown sums match summary total", async () => {
    const { SolidCAM5AxisFunctionIndexEngine } = await import(
      "../engines/SolidCAM5AxisFunctionIndexEngine.js"
    );
    const breakdown = SolidCAM5AxisFunctionIndexEngine.getCategoryBreakdown();
    expect(breakdown.length).toBe(4);
    const total = breakdown.reduce((a, b) => a + b.total_parameters, 0);
    expect(total).toBe(300);
    const opCount = breakdown.reduce((a, b) => a + b.operations.length, 0);
    expect(opCount).toBe(12);
  });

  // ────────────────────────────────────────────────────────────────────
  // Engine methods — happy path + failure modes
  // ────────────────────────────────────────────────────────────────────
  it("getOperation returns error for unknown id (failure mode)", async () => {
    const { SolidCAM5AxisFunctionIndexEngine } = await import(
      "../engines/SolidCAM5AxisFunctionIndexEngine.js"
    );
    const op: any = SolidCAM5AxisFunctionIndexEngine.getOperation("nonexistent_op_zz");
    expect("error" in op).toBe(true);
    expect(op.error).toContain("nonexistent_op_zz");
  });

  it("getOperationsByCategory returns empty array for unknown category (failure mode)", async () => {
    const { SolidCAM5AxisFunctionIndexEngine } = await import(
      "../engines/SolidCAM5AxisFunctionIndexEngine.js"
    );
    const ops: any = SolidCAM5AxisFunctionIndexEngine.getOperationsByCategory("does_not_exist_cat");
    expect(Array.isArray(ops)).toBe(true);
    expect(ops.length).toBe(0);
  });

  it("getOperationsByCategory is case-insensitive", async () => {
    const { SolidCAM5AxisFunctionIndexEngine } = await import(
      "../engines/SolidCAM5AxisFunctionIndexEngine.js"
    );
    const lower: any = SolidCAM5AxisFunctionIndexEngine.getOperationsByCategory("specialty");
    const upper: any = SolidCAM5AxisFunctionIndexEngine.getOperationsByCategory("SPECIALTY");
    expect(Array.isArray(lower)).toBe(true);
    expect(lower.length).toBe(3);
    expect(upper.length).toBe(3);
    expect(lower.map((o: any) => o.operation_id).sort()).toEqual(
      upper.map((o: any) => o.operation_id).sort()
    );
  });

  it("findParameter respects limit (boundary)", async () => {
    const { SolidCAM5AxisFunctionIndexEngine } = await import(
      "../engines/SolidCAM5AxisFunctionIndexEngine.js"
    );
    const all = SolidCAM5AxisFunctionIndexEngine.findParameter("step_over_mm", 1000);
    expect(all.length).toBeGreaterThanOrEqual(7); // most ops have step_over_mm
    const capped = SolidCAM5AxisFunctionIndexEngine.findParameter("step_over_mm", 3);
    expect(capped.length).toBe(3);
  });

  it("findParameter returns [] when no match (failure mode)", async () => {
    const { SolidCAM5AxisFunctionIndexEngine } = await import(
      "../engines/SolidCAM5AxisFunctionIndexEngine.js"
    );
    const empty = SolidCAM5AxisFunctionIndexEngine.findParameter("zz_no_such_param_zz");
    expect(empty.length).toBe(0);
  });

  it("getTrainingTopics returns exactly 6 topics with key_concepts + best_practices", async () => {
    const { SolidCAM5AxisFunctionIndexEngine } = await import(
      "../engines/SolidCAM5AxisFunctionIndexEngine.js"
    );
    const topics = SolidCAM5AxisFunctionIndexEngine.getTrainingTopics();
    expect(topics.length).toBe(6);
    topics.forEach((t) => {
      expect(t.topic.length).toBeGreaterThan(0);
      expect(Array.isArray(t.key_concepts)).toBe(true);
      expect(t.key_concepts.length).toBeGreaterThanOrEqual(3);
      expect(Array.isArray(t.best_practices)).toBe(true);
      expect(t.best_practices.length).toBeGreaterThanOrEqual(2);
    });
  });

  // ────────────────────────────────────────────────────────────────────
  // recommendByFeature — deterministic mapping over all 12 features
  // ────────────────────────────────────────────────────────────────────
  it.each([
    ["indexed_face", "5x_indexed_3plus2"],
    ["ruled_wall", "5x_swarf"],
    ["freeform_pocket", "5x_normal_to_surface"],
    ["impeller_blade", "5x_multiblade"],
    ["blisk_blade", "5x_multiblade"],
    ["intake_port", "5x_port"],
    ["exhaust_port", "5x_port"],
    ["undercut_relief", "5x_undercut"],
    ["t_slot", "5x_undercut"],
    ["deep_cavity_with_focal_point", "5x_through_point"],
    ["fan_cavity_with_guide_curve", "5x_through_curve"],
    ["between_curves", "5x_morph"],
  ])("recommendByFeature(%s) → %s", async (feature, expected) => {
    const { SolidCAM5AxisFunctionIndexEngine } = await import(
      "../engines/SolidCAM5AxisFunctionIndexEngine.js"
    );
    const r = SolidCAM5AxisFunctionIndexEngine.recommendByFeature(feature as any);
    expect(r.primary).toBe(expected);
    expect(r.alternative.length).toBeGreaterThan(0);
    expect(r.reason.length).toBeGreaterThan(10);
    // The recommended primary must exist in the catalog
    const op: any = SolidCAM5AxisFunctionIndexEngine.getOperation(r.primary);
    expect("error" in op).toBe(false);
  });

  it("recommendByFeature defaults safely for unknown feature (adversarial)", async () => {
    const { SolidCAM5AxisFunctionIndexEngine } = await import(
      "../engines/SolidCAM5AxisFunctionIndexEngine.js"
    );
    const r = SolidCAM5AxisFunctionIndexEngine.recommendByFeature("totally_made_up" as any);
    expect(r.primary).toBe("5x_normal_to_surface");
    expect(r.reason).toMatch(/unknown|default/i);
  });

  // ────────────────────────────────────────────────────────────────────
  // validateAxisChange — physics identity + edges
  // ────────────────────────────────────────────────────────────────────
  it("validateAxisChange computes rotary_velocity = axis_change * feed/60 (textbook 1)", async () => {
    const { SolidCAM5AxisFunctionIndexEngine } = await import(
      "../engines/SolidCAM5AxisFunctionIndexEngine.js"
    );
    // f = 1200 mm/min, a = 5 deg/mm → rotary = 5 * (1200/60) = 5 * 20 = 100 deg/s
    const r: any = SolidCAM5AxisFunctionIndexEngine.validateAxisChange(1200, 5, 200);
    expect("error" in r).toBe(false);
    expect(r.rotary_velocity_deg_per_sec).toBeCloseTo(100, 6);
    expect(r.machine_limit_deg_per_sec).toBe(200);
    expect(r.utilization).toBeCloseTo(0.5, 6);
    expect(r.within_limit).toBe(true);
    // Recommended max feed: (200 * 60) / 5 = 2400
    expect(r.recommended_max_feed_mm_per_min).toBeCloseTo(2400, 6);
  });

  it("validateAxisChange flags within_limit=false when exceeding (textbook 2)", async () => {
    const { SolidCAM5AxisFunctionIndexEngine } = await import(
      "../engines/SolidCAM5AxisFunctionIndexEngine.js"
    );
    // f=6000, a=10 → rotary = 10 * 100 = 1000, limit = 360
    const r: any = SolidCAM5AxisFunctionIndexEngine.validateAxisChange(6000, 10, 360);
    expect(r.rotary_velocity_deg_per_sec).toBeCloseTo(1000, 6);
    expect(r.within_limit).toBe(false);
    expect(r.utilization).toBeGreaterThan(2.7);
    // Recommended max feed: (360*60)/10 = 2160
    expect(r.recommended_max_feed_mm_per_min).toBeCloseTo(2160, 6);
  });

  it("validateAxisChange returns recommended_max_feed = null when axis_change = 0", async () => {
    const { SolidCAM5AxisFunctionIndexEngine } = await import(
      "../engines/SolidCAM5AxisFunctionIndexEngine.js"
    );
    const r: any = SolidCAM5AxisFunctionIndexEngine.validateAxisChange(1000, 0, 100);
    expect(r.rotary_velocity_deg_per_sec).toBe(0);
    expect(r.within_limit).toBe(true);
    expect(r.recommended_max_feed_mm_per_min).toBeNull();
  });

  it.each([
    ["NaN feed", NaN, 5, 100],
    ["Infinity axis_change", 1000, Infinity, 100],
    ["zero feed", 0, 5, 100],
    ["negative axis_change", 1000, -1, 100],
    ["zero machine_max", 1000, 5, 0],
    ["negative machine_max", 1000, 5, -50],
  ])("validateAxisChange rejects bad input: %s (adversarial)", async (_label, f, a, m) => {
    const { SolidCAM5AxisFunctionIndexEngine } = await import(
      "../engines/SolidCAM5AxisFunctionIndexEngine.js"
    );
    const r: any = SolidCAM5AxisFunctionIndexEngine.validateAxisChange(f, a, m);
    expect("error" in r).toBe(true);
  });

  // ────────────────────────────────────────────────────────────────────
  // singularityCheck — zone + wrap-around
  // ────────────────────────────────────────────────────────────────────
  it.each([
    [0, "critical"],
    [0.5, "critical"],
    [1, "warning"],
    [2.5, "warning"],
    [3, "caution"],
    [9.99, "caution"],
    [10, "safe"],
    [45, "safe"],
    [89, "safe"],
    [90, "safe"], // furthest from both poles
    [180, "critical"], // pole at 180
  ])("singularityCheck(%i°) → %s", async (tilt, risk) => {
    const { SolidCAM5AxisFunctionIndexEngine } = await import(
      "../engines/SolidCAM5AxisFunctionIndexEngine.js"
    );
    const r: any = SolidCAM5AxisFunctionIndexEngine.singularityCheck(tilt);
    expect("error" in r).toBe(false);
    expect(r.risk).toBe(risk);
    expect(r.distance_to_pole_deg).toBeGreaterThanOrEqual(0);
    expect(r.recommendation.length).toBeGreaterThan(10);
  });

  it("singularityCheck handles wrap-around (370° → distance = 10°, safe)", async () => {
    const { SolidCAM5AxisFunctionIndexEngine } = await import(
      "../engines/SolidCAM5AxisFunctionIndexEngine.js"
    );
    const r: any = SolidCAM5AxisFunctionIndexEngine.singularityCheck(370);
    expect("error" in r).toBe(false);
    expect(r.distance_to_pole_deg).toBeCloseTo(10, 6);
    expect(r.risk).toBe("safe");
  });

  it("singularityCheck handles negative tilt (-5° → distance = 5°, caution)", async () => {
    const { SolidCAM5AxisFunctionIndexEngine } = await import(
      "../engines/SolidCAM5AxisFunctionIndexEngine.js"
    );
    const r: any = SolidCAM5AxisFunctionIndexEngine.singularityCheck(-5);
    expect("error" in r).toBe(false);
    expect(r.distance_to_pole_deg).toBeCloseTo(5, 6);
    expect(r.risk).toBe("caution");
  });

  it("singularityCheck rejects NaN/Infinity (adversarial)", async () => {
    const { SolidCAM5AxisFunctionIndexEngine } = await import(
      "../engines/SolidCAM5AxisFunctionIndexEngine.js"
    );
    const nan: any = SolidCAM5AxisFunctionIndexEngine.singularityCheck(NaN);
    expect("error" in nan).toBe(true);
    const inf: any = SolidCAM5AxisFunctionIndexEngine.singularityCheck(Infinity);
    expect("error" in inf).toBe(true);
  });

  // ────────────────────────────────────────────────────────────────────
  // Cross-op consistency
  // ────────────────────────────────────────────────────────────────────
  it("every op has all required dialog tabs reflected as parameter groups", async () => {
    const { SolidCAM5AxisFunctionIndexEngine } = await import(
      "../engines/SolidCAM5AxisFunctionIndexEngine.js"
    );
    const idx: any = SolidCAM5AxisFunctionIndexEngine.getIndex();
    for (const [opId, op] of Object.entries(idx.operations) as any) {
      expect(Array.isArray(op.dialog_tabs)).toBe(true);
      expect(op.dialog_tabs.length).toBeGreaterThanOrEqual(7);
      // Every op has at least geometry, tool, tool_axis groups
      expect(Object.keys(op.parameters)).toEqual(
        expect.arrayContaining(["geometry", "tool", "tool_axis"])
      );
    }
  });

  // ────────────────────────────────────────────────────────────────────
  // Dispatcher integration
  // ────────────────────────────────────────────────────────────────────
  it("camDispatcher ACTIONS includes all 9 solidcam_5_axis_* actions", async () => {
    const mod: any = await import("../tools/dispatchers/camDispatcher.js");
    const expected = [
      "solidcam_5_axis_index",
      "solidcam_5_axis_summary",
      "solidcam_5_axis_list_ops",
      "solidcam_5_axis_get_op",
      "solidcam_5_axis_by_category",
      "solidcam_5_axis_find_param",
      "solidcam_5_axis_recommend",
      "solidcam_5_axis_validate_axis",
      "solidcam_5_axis_singularity",
    ];
    for (const a of expected) expect(mod.ACTIONS).toContain(a);
  });

  it("ACTION_SOLIDCAM_5_AXIS_FUNCTION_INDEX_SCHEMAS has 9 keys", async () => {
    const { ACTION_SOLIDCAM_5_AXIS_FUNCTION_INDEX_SCHEMAS } = await import(
      "../schemas/solidcam5AxisFunctionIndexActionSchemas.js"
    );
    const keys = Object.keys(ACTION_SOLIDCAM_5_AXIS_FUNCTION_INDEX_SCHEMAS);
    expect(keys.length).toBe(9);
    expect(keys).toEqual(
      expect.arrayContaining([
        "solidcam_5_axis_index",
        "solidcam_5_axis_get_op",
        "solidcam_5_axis_recommend",
        "solidcam_5_axis_validate_axis",
        "solidcam_5_axis_singularity",
      ])
    );
  });

  it("solidcam_5_axis_get_op schema validates and rejects bad input", async () => {
    const { ACTION_SOLIDCAM_5_AXIS_FUNCTION_INDEX_SCHEMAS } = await import(
      "../schemas/solidcam5AxisFunctionIndexActionSchemas.js"
    );
    const s = ACTION_SOLIDCAM_5_AXIS_FUNCTION_INDEX_SCHEMAS.solidcam_5_axis_get_op;
    expect(s.safeParse({ operation_id: "5x_swarf" }).success).toBe(true);
    expect(s.safeParse({}).success).toBe(false);
    expect(s.safeParse({ operation_id: 42 }).success).toBe(false);
    expect(s.safeParse({ operation_id: "" }).success).toBe(false);
  });

  it("solidcam_5_axis_validate_axis schema rejects negative/zero feeds", async () => {
    const { ACTION_SOLIDCAM_5_AXIS_FUNCTION_INDEX_SCHEMAS } = await import(
      "../schemas/solidcam5AxisFunctionIndexActionSchemas.js"
    );
    const s = ACTION_SOLIDCAM_5_AXIS_FUNCTION_INDEX_SCHEMAS.solidcam_5_axis_validate_axis;
    expect(
      s.safeParse({
        feed_rate_mm_per_min: 1000,
        axis_change_deg_per_mm: 5,
        machine_max_rotary_deg_per_sec: 200,
      }).success
    ).toBe(true);
    expect(
      s.safeParse({
        feed_rate_mm_per_min: -100,
        axis_change_deg_per_mm: 5,
        machine_max_rotary_deg_per_sec: 200,
      }).success
    ).toBe(false);
    expect(
      s.safeParse({
        feed_rate_mm_per_min: 1000,
        axis_change_deg_per_mm: -1,
        machine_max_rotary_deg_per_sec: 200,
      }).success
    ).toBe(false);
    expect(
      s.safeParse({
        feed_rate_mm_per_min: 1000,
        axis_change_deg_per_mm: 5,
        machine_max_rotary_deg_per_sec: 0,
      }).success
    ).toBe(false);
  });

  it("solidcam_5_axis_recommend schema enforces enum (failure on unknown)", async () => {
    const { ACTION_SOLIDCAM_5_AXIS_FUNCTION_INDEX_SCHEMAS } = await import(
      "../schemas/solidcam5AxisFunctionIndexActionSchemas.js"
    );
    const s = ACTION_SOLIDCAM_5_AXIS_FUNCTION_INDEX_SCHEMAS.solidcam_5_axis_recommend;
    expect(s.safeParse({ feature: "ruled_wall" }).success).toBe(true);
    expect(s.safeParse({ feature: "fictional_feature" }).success).toBe(false);
    expect(s.safeParse({}).success).toBe(false);
  });

  // ────────────────────────────────────────────────────────────────────
  // Dispatcher round-trip — invoke through dispatcher, not engine singleton
  // Uses canonical stub-server pattern: registerCamDispatcher(stub) → capture handler
  // ────────────────────────────────────────────────────────────────────
  async function getDispatcherHandler() {
    const { registerCamDispatcher } = await import(
      "../tools/dispatchers/camDispatcher.js"
    );
    const captured: any[] = [];
    const stub = {
      tool(name: string, description: string, schema: unknown, handler: any) {
        captured.push({ name, handler });
      },
    };
    registerCamDispatcher(stub as any);
    const tool = captured.find((t) => t.name === "prism_cam");
    if (!tool) throw new Error("prism_cam tool was not registered");
    return tool.handler as (args: {
      action: string;
      params?: Record<string, unknown>;
    }) => Promise<{ content: Array<{ type: string; text: string }> }>;
  }

  async function invoke(action: string, params: Record<string, unknown> = {}) {
    const handler = await getDispatcherHandler();
    const res: any = await handler({ action, params });
    // dispatcherError returns plain {success:false, error, ...}; success returns {content:[{text}]}
    if (res && Array.isArray(res.content) && res.content[0]?.text) {
      try {
        return JSON.parse(res.content[0].text);
      } catch {
        return { __raw: res.content[0].text };
      }
    }
    return res;
  }

  it("dispatcher round-trip: solidcam_5_axis_summary returns 12/300", async () => {
    const r: any = await invoke("solidcam_5_axis_summary", {});
    const data = r.data ?? r.result ?? r;
    expect(data.total_operations).toBe(12);
    expect(data.total_parameters).toBe(300);
  });

  it("dispatcher round-trip: solidcam_5_axis_get_op('5x_swarf') returns swarf op", async () => {
    const r: any = await invoke("solidcam_5_axis_get_op", { operation_id: "5x_swarf" });
    const data = r.data ?? r.result ?? r;
    expect(data.category).toBe("simultaneous_axis");
    expect(data.parameter_count).toBe(26);
    expect(data.parameters?.tool_axis).toBeTruthy();
  });

  it("dispatcher round-trip: solidcam_5_axis_validate_axis (kinematic identity)", async () => {
    const r: any = await invoke("solidcam_5_axis_validate_axis", {
      feed_rate_mm_per_min: 1200,
      axis_change_deg_per_mm: 5,
      machine_max_rotary_deg_per_sec: 200,
    });
    const data = r.data ?? r.result ?? r;
    expect(data.rotary_velocity_deg_per_sec).toBeCloseTo(100, 6);
    expect(data.within_limit).toBe(true);
    expect(data.recommended_max_feed_mm_per_min).toBeCloseTo(2400, 6);
  });

  it("dispatcher round-trip: solidcam_5_axis_singularity at pole returns critical", async () => {
    const r: any = await invoke("solidcam_5_axis_singularity", { tilt_deg: 0.5 });
    const data = r.data ?? r.result ?? r;
    expect(data.risk).toBe("critical");
    expect(data.distance_to_pole_deg).toBeCloseTo(0.5, 6);
  });

  it("dispatcher round-trip: solidcam_5_axis_recommend('impeller_blade') routes to multiblade", async () => {
    const r: any = await invoke("solidcam_5_axis_recommend", { feature: "impeller_blade" });
    const data = r.data ?? r.result ?? r;
    expect(data.primary).toBe("5x_multiblade");
  });

  it("dispatcher round-trip: invalid params for get_op returns validation error", async () => {
    const r: any = await invoke("solidcam_5_axis_get_op", {});
    // Validation should fail — body should mention 'Invalid params'
    const blob = JSON.stringify(r);
    expect(blob).toMatch(/Invalid params|operation_id|required/i);
  });
});
