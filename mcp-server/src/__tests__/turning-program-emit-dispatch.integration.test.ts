// turning-program-emit-dispatch.integration.test.ts — CLOSED-LOOP-MS0/U-CL9
//
// Round-trip proof that the production move-level emitter is now invokable on the LATHE-native
// surface (prism_turning_program), not only via prism_cam (lathe_p2p_*). Registers the real
// dispatcher with a captured server.tool handler and drives the new emit actions end-to-end.
import { describe, test, expect, beforeAll } from "vitest";
import { registerTurningProgramDispatcher } from "../tools/dispatchers/turningProgramDispatcher.js";
import type { ToolpathProgram } from "../engines/LathePrintToolpathGeneratorEngine.js";

// Capture the single tool handler the dispatcher registers.
let handler: (args: any) => Promise<any>;
let toolName = "";
beforeAll(() => {
  const fakeServer = {
    tool(name: string, _desc: string, _schema: any, h: (args: any) => Promise<any>) {
      toolName = name;
      handler = h;
    },
  };
  registerTurningProgramDispatcher(fakeServer as any);
});

function odRoughProgram(): ToolpathProgram {
  return {
    program_id: "DISPATCH-OD-ROUGH", source_sequence_plan_id: "SP-1",
    operations: [{
      op_number: 1, featureId: "F1", featureType: "od_cylinder", strategy_id: "od_rough_iso_p",
      tool_id: "T0101", cutting_speed_m_min: 220, spindle_rpm: 1400, feed_mm_rev: 0.3, feed_mm_min: 420,
      depth_of_cut_mm: 2.5, number_of_passes: 4,
      moves: [
        { move_type: "tool_change", gcode: "T0101", duration_sec: 2 },
        { move_type: "rapid", x_mm: 52, z_mm: 2, gcode: "G00 X52.0 Z2.0", duration_sec: 1 },
        { move_type: "canned_cycle", x_mm: 40, z_mm: -60, feed_mm_min: 420, rpm: 1400, gcode: "G71 P10 Q20 U0.5 W0.1 D2500 F0.3", duration_sec: 80 },
      ],
      cycle_time_sec: 83, cutting_force_n: 1800, material_removal_rate_cm3_min: 30, warnings: [],
    }],
    total_cycle_time_sec: 83, total_rapid_time_sec: 3, total_feed_time_sec: 80,
    total_cutting_volume_cm3: 42, gcode_preview: "",
    machine_envelope_check: { max_x_mm: 100, max_z_mm: 50, min_x_mm: 40, min_z_mm: -60, within_envelope: true },
    warnings: [], timestamp: "2026-06-01T00:00:00Z",
  };
}

describe("prism_turning_program emit actions (U-CL9 — production emitter on the lathe surface)", () => {
  test("registers under the lathe-native tool name", () => {
    expect(toolName).toBe("prism_turning_program");
    expect(typeof handler).toBe("function");
  });

  test("turning_program_emit returns machine-ready Okuma G-code with the G50 cap + sign-off dossier", async () => {
    const res = await handler({ action: "turning_program_emit", params: { program: odRoughProgram(), options: { controller: "okuma_osp", use_css: true } } });
    const blob = JSON.stringify(res);
    expect(blob).toContain("G50");                 // spindle overspeed cap is emitted
    expect(blob).toContain("G96");                 // constant surface speed
    expect(blob).toContain("safety_checks");       // the non-stub sign-off dossier rode along
    expect(blob).not.toMatch(/"error"\s*:/);       // dispatcher did not error
  });

  test("turning_program_emit_controllers lists supported controllers (incl okuma)", async () => {
    const res = await handler({ action: "turning_program_emit_controllers", params: {} });
    const blob = JSON.stringify(res).toLowerCase();
    expect(blob).toContain("controllers");
    expect(blob).toContain("okuma");
  });

  test("turning_program_emit_dry_run reports line count + controller without throwing", async () => {
    const res = await handler({ action: "turning_program_emit_dry_run", params: { program: odRoughProgram(), options: { controller: "okuma_osp", use_css: true } } });
    const blob = JSON.stringify(res);
    expect(blob).toMatch(/lines/);
    expect(blob).not.toMatch(/"error"\s*:/);
  });
});

describe("prism_turning_program toolpath-generate actions (U-CL10 — generator on the lathe surface)", () => {
  // Minimal valid generate inputs (generateProgram reads op.{op_number,featureId,strategy_id},
  // feature.{id,type,diameter_mm}, material.{iso_group,machinability_factor}).
  const sequence_plan = { plan_id: "SP-GEN-TEST", operations: [{ op_number: 1, featureId: "F1", strategy_id: "od_rough_iso_p" }] };
  const features = [{ id: "F1", type: "od_turn", diameter_mm: 50, length_mm: 60, depth_mm: 2.5 }];
  const material = { name: "4140", iso_group: "P", machinability_factor: 1.0 };

  test("turning_toolpath_generate: sequence_plan+features+material -> a ToolpathProgram with operations", async () => {
    const res = await handler({ action: "turning_toolpath_generate", params: { sequence_plan, features, material } });
    const blob = JSON.stringify(res);
    expect(blob).not.toMatch(/"error"\s*:/);
    expect(blob).toContain("machine_envelope_check");  // produced a real ToolpathProgram
    expect(blob).toContain("\"op_number\"");           // at least one generated operation (feature was matched, not skipped)
    expect(blob).toMatch(/program_id/);
  });

  test("turning_toolpath_generate: missing sequence_plan is caught -> dispatcher error (guard fires)", async () => {
    const res = await handler({ action: "turning_toolpath_generate", params: { features, material } });
    expect(JSON.stringify(res)).toMatch(/error/i);     // engine throws 'Invalid sequence plan', dispatcher returns error
  });

  test("turning_toolpath_validate validates a ToolpathProgram without throwing", async () => {
    const res = await handler({ action: "turning_toolpath_validate", params: { program: odRoughProgram() } });
    const blob = JSON.stringify(res);
    expect(blob).toMatch(/valid/);
    expect(blob).not.toMatch(/"error"\s*:/);
  });

  test("turning_toolpath_gcode exports the gcode_preview of a GENERATED program (non-empty G-code)", async () => {
    // exportGCode returns program.gcode_preview, which only generateProgram populates — so this is
    // a true generate->gcode E2E: generate a real program, then export its preview through the dispatcher.
    const gen = await handler({ action: "turning_toolpath_generate", params: { sequence_plan, features, material } });
    const program = (gen as any).data;
    const res = await handler({ action: "turning_toolpath_gcode", params: { program } });
    const gcode = (res as any).data?.gcode ?? "";
    expect(typeof gcode).toBe("string");
    expect(gcode.length).toBeGreaterThan(0);           // a generated program carries a real G-code preview
    expect(gcode).toMatch(/G\d/);                       // contains G-code words
  });

  test("turning_toolpath_cycle_time returns a cycle-time breakdown", async () => {
    const res = await handler({ action: "turning_toolpath_cycle_time", params: { program: odRoughProgram() } });
    expect(JSON.stringify(res)).not.toMatch(/"error"\s*:/);
  });
});

describe("prism_turning_program quality-gate actions (U-CL11 — LatheQualityGateEngine on the lathe surface)", () => {
  // Full ValidationContext fixture (all required QualityGate* fields populated).
  function ctx(matIso: "P" | "M" | "K" | "N" | "S" | "H" = "P", controller = "okuma") {
    return {
      program_name: "TEST-OD-ROUGH",
      machine: { machine_id: "LTH-01", brand: "Okuma", model: "LB3000", controller, max_spindle_rpm: 5000, spindle_power_kw: 22, spindle_torque_nm: 300, max_bar_od_mm: 65, max_turning_diameter_mm: 350, max_turning_length_mm: 1000, live_tooling: true, c_axis: true, y_axis: false, sub_spindle: false, tailstock: true },
      workholding: { type: "3_jaw", jaw_type: "hard", grip_length_mm: 30, grip_diameter_mm: 50, tailstock_engaged: false, steady_rest_engaged: false },
      part: { name: "bushing", material: { name: "4140", iso_group: matIso, hardness_hrc: 28 }, stock_diameter_mm: 52, finished_diameter_mm: 40, length_mm: 60, overhang_from_chuck_mm: 40 },
      operations: [{ operation_id: "op1", type: "od_rough", tool: { tool_id: "T0101", tool_type: "external", insert_shape: "C", nose_radius_mm: 0.8 }, params: { cutting_speed_m_min: 220, feed_mm_rev: 0.3, depth_of_cut_mm: 2.5, css_mode: true }, start_z_mm: 0, end_z_mm: -60, start_diameter_mm: 52, end_diameter_mm: 40, target_ra_um: 1.6, target_tolerance_mm: 0.05, stock_allowance_mm: 0.5 }],
      is_production_run: true, customer_spec_level: "standard",
    };
  }
  // PROPER program: declares feed mode, caps G96 with G50, ends with M30.
  const GOOD = "G95\nG50 S3000\nG96 S220 M03\nT0101\nG71 P10 Q20 U0.5 W0.1 D2500 F0.3\nG00 X100 Z50\nM05\nM30\n";
  // UNSAFE: G96 with no G50 cap, no M30 program end.
  const BAD = "G96 S220 M03\nG71 P10 Q20 U0.5 W0.1 D2500 F0.3\nG00 X100 Z50\n";

  test("turning_program_quality_gate returns a full 6-gate report on a proper program", async () => {
    const res = await handler({ action: "turning_program_quality_gate", params: { program: GOOD, context: ctx() } });
    const blob = JSON.stringify(res);
    expect(blob).not.toMatch(/"error"\s*:/);
    for (const g of ["safety_report", "param_report", "sequence_report", "physics_report", "quality_report", "shop_report"]) {
      expect(blob).toContain(g);
    }
    expect(blob).toMatch(/overall_status/);
    expect(blob).toMatch(/program_approved/);
    // U-CL11 fix: S(x) omega score must actually compute (was silently throwing on context.material).
    const data = (res as any).data;
    expect(typeof data.omega_safety?.omega_safety).toBe("number");
  });

  test("turning_program_quality_gate FAILs an unsafe program (no G50 cap / no M30) — not approved", async () => {
    const res = await handler({ action: "turning_program_quality_gate", params: { program: BAD, context: ctx() } });
    const data = (res as any).data;
    // The safety gate must catch the missing spindle cap + program end.
    expect(data.safety_report.spindle_limit_present).toBe(false);
    expect(data.safety_report.program_end_present).toBe(false);
    expect(data.program_approved).toBe(false);
  });

  test("turning_program_validate_safety: proper program has spindle cap + program end present", async () => {
    const res = await handler({ action: "turning_program_validate_safety", params: { program: GOOD, context: ctx() } });
    const data = (res as any).data;
    expect(data.spindle_limit_present).toBe(true);   // G50 present
    expect(data.program_end_present).toBe(true);     // M30 present
    expect(data.gate_type).toBe("safety");
  });

  test("turning_program_validate_safety adversarial: empty program is handled (no crash, end absent)", async () => {
    const res = await handler({ action: "turning_program_validate_safety", params: { program: "", context: ctx() } });
    const blob = JSON.stringify(res);
    expect(blob).not.toMatch(/"error"\s*:/);          // engine handled empty input gracefully
    expect((res as any).data.program_end_present).toBe(false);
  });

  test("turning_program_quality_gate spans ISO material groups (P / K / S) without error", async () => {
    for (const iso of ["P", "K", "S"] as const) {
      const res = await handler({ action: "turning_program_quality_gate", params: { program: GOOD, context: ctx(iso) } });
      const blob = JSON.stringify(res);
      expect(blob, `iso=${iso}`).not.toMatch(/"error"\s*:/);
      expect(blob, `iso=${iso}`).toMatch(/overall_status/);
    }
  });
});

describe("prism_turning_program advanced-ops actions (U-CL12 — LatheAdvancedOperationsEngine orphan wired)", () => {
  test("turning_advanced_list catalogs the advanced operations", async () => {
    const res = await handler({ action: "turning_advanced_list", params: {} });
    const blob = JSON.stringify(res);
    expect(blob).not.toMatch(/"error"\s*:/);
    expect(blob).toContain("operations");
  });

  test("turning_advanced_live_tooling (polygon_turning) -> spindle mode + recommended params", async () => {
    const res = await handler({ action: "turning_advanced_live_tooling", params: { operation: "polygon_turning", live_tool_rpm: 3000, feature_depth_mm: 5, number_of_features: 6 } });
    const data = (res as any).data;
    expect(["index", "interpolate", "synchronized"]).toContain(data.spindle_mode);
    expect(typeof data.recommended_parameters?.feed_mm_rev).toBe("number");
  });

  test("turning_advanced_polygon (hex) -> feasible synchronized cut with a speed ratio", async () => {
    const res = await handler({ action: "turning_advanced_polygon", params: { number_of_flats: 6, flat_width_mm: 10, material: "4140", part_diameter_mm: 25 } });
    const data = (res as any).data;
    expect(data.feasible).toBe(true);
    expect(typeof data.speed_ratio).toBe("number");
    expect(data.speed_ratio).toBeGreaterThan(0);
  });

  test("turning_advanced_threading spans thread forms (unified / acme / buttress) with real infeed + passes", async () => {
    for (const thread_form of ["unified", "acme", "buttress"] as const) {
      const res = await handler({ action: "turning_advanced_threading", params: { thread_form, pitch_mm: 3, diameter_mm: 30, length_mm: 20 } });
      const data = (res as any).data;
      expect(["radial", "flank", "modified_flank", "incremental"], thread_form).toContain(data.infeed_method);
      expect(data.total_passes, thread_form).toBeGreaterThan(0);
      expect(Array.isArray(data.doc_per_pass), thread_form).toBe(true);
    }
  });

  test("turning_advanced_grooving (o_ring) -> plunge method + pecking decision", async () => {
    const res = await handler({ action: "turning_advanced_grooving", params: { groove_type: "o_ring", width_mm: 2, depth_mm: 1.5, diameter_mm: 30, material: "4140" } });
    const data = (res as any).data;
    expect(["straight", "oscillating", "ramping"]).toContain(data.plunge_method);
    expect(typeof data.pecking_recommended).toBe("boolean");
  });

  test("turning_advanced_eccentric -> a setup method + a balancing-aware max safe RPM", async () => {
    const res = await handler({ action: "turning_advanced_eccentric", params: { offset_mm: 5, diameter_mm: 40, length_mm: 60, material: "4140" } });
    const data = (res as any).data;
    expect(["offset_tailstock", "four_jaw", "eccentric_chuck", "y_axis"]).toContain(data.method);
    expect(typeof data.max_safe_rpm).toBe("number");
    expect(data.max_safe_rpm).toBeGreaterThan(0);
  });

  test("turning_advanced_contour -> roughing + finishing strategy with a feed", async () => {
    const res = await handler({ action: "turning_advanced_contour", params: { profile_type: "convex", roughing_allowance_mm: 1, finish_allowance_mm: 0.2, material: "4140" } });
    const data = (res as any).data;
    expect(typeof data.roughing_strategy).toBe("string");
    expect(typeof data.finishing_strategy).toBe("string");
    expect(typeof data.feed_mm_rev).toBe("number");
  });

  test("adversarial: a non-standard polygon flat-count (7, not in POLYGON_RATIOS) returns a structured response, never a throw", async () => {
    const res = await handler({ action: "turning_advanced_polygon", params: { number_of_flats: 7, flat_width_mm: 10, material: "4140", part_diameter_mm: 25 } });
    // dispatcher try/catch guarantees a structured response — a well-formed PolygonTurningResult
    // (feasible:boolean) OR a dispatcher error — but never an unhandled throw.
    const blob = JSON.stringify(res);
    expect(blob).toMatch(/"feasible"|error/i);
    const feasible = (res as any).data?.feasible;
    expect(feasible === undefined || typeof feasible === "boolean").toBe(true);
  });
});

describe("prism_turning_program knowledge-QA actions (U-CL13 — LatheResourceKnowledgeEngine orphan wired)", () => {
  // GOOD: G50-capped CSS, coolant ("M8" — the engine's literal check), canned cycles, finish-before-cutoff.
  const GOOD = "(OD ROUGH)\nG50 S2500\nG96 S220\nM8\nG71 P10 Q20 U0.5 W0.1 F0.3\n(FINISH)\nG70 P10 Q20\n(CUTOFF)\nG75 R0.5\nM30\n";
  // BAD: G96 with no G50 cap, ROUGH with no coolant.
  const BAD = "G96 S220\n(ROUGH)\nG71 P1 Q2 F0.3\nM30\n";

  test("turning_knowledge_score_practices flags the BAD program (G96 no G50 cap + no roughing coolant)", async () => {
    const res = await handler({ action: "turning_knowledge_score_practices", params: { program: BAD } });
    const data = (res as any).data;
    expect(data.violated.some((v: string) => /G50/.test(v))).toBe(true);
    expect(data.violated.some((v: string) => /coolant/i.test(v))).toBe(true);
    expect(data.score).toBeLessThan(100);
  });

  test("turning_knowledge_score_practices credits the GOOD program (G50 cap + coolant + canned cycles)", async () => {
    const res = await handler({ action: "turning_knowledge_score_practices", params: { program: GOOD } });
    const data = (res as any).data;
    expect(data.followed.some((f: string) => /G50/.test(f))).toBe(true);
    expect(data.followed.some((f: string) => /canned/i.test(f))).toBe(true);
    expect(data.score).toBeGreaterThan(50);
  });

  test("turning_knowledge_detect_mistakes returns a detected[] array without throwing", async () => {
    const res = await handler({ action: "turning_knowledge_detect_mistakes", params: { program: BAD } });
    expect(Array.isArray((res as any).data?.detected)).toBe(true);
    expect(JSON.stringify(res)).not.toMatch(/"error"\s*:/);
  });

  test("turning_knowledge_improve returns recommendations for a program", async () => {
    const res = await handler({ action: "turning_knowledge_improve", params: { program: BAD, material: "4140" } });
    expect(JSON.stringify(res)).not.toMatch(/"error"\s*:/);
    expect(Array.isArray((res as any).data?.recommendations)).toBe(true);
  });

  test("turning_knowledge_stats returns a knowledge-base stats object", async () => {
    const res = await handler({ action: "turning_knowledge_stats", params: {} });
    const data = (res as any).data;
    expect(typeof data).toBe("object");
    expect(JSON.stringify(res)).not.toMatch(/"error"\s*:/);
  });

  test("adversarial: empty program is handled (score defaults, no throw)", async () => {
    const res = await handler({ action: "turning_knowledge_score_practices", params: { program: "" } });
    const data = (res as any).data;
    expect(typeof data.score).toBe("number");          // engine returns the 50 default, not a crash
    expect(JSON.stringify(res)).not.toMatch(/"error"\s*:/);
  });
});

describe("prism_turning_program unified-physics action (U-CL14 — LatheUnifiedPhysicsOrchestrationEngine orphan wired)", () => {
  function physInput(operation = "roughing", material = "4140") {
    return {
      material, operation,
      parameters: { cutting_speed_m_min: 220, feed_mm_rev: 0.3, depth_of_cut_mm: 2.5, workpiece_diameter_mm: 50 },
      tool: { nose_radius_mm: 0.8, lead_angle_deg: 95, back_rake_deg: 0, side_rake_deg: 6, relief_angle_deg: 7, inclination_angle_deg: 0 },
      machine: { max_power_kW: 22, max_torque_Nm: 300, max_rpm: 5000, min_rpm: 50, has_tailstock: true },
    };
  }

  test("turning_physics_analyze returns the full unified physics report (forces/thermal/tool-life)", async () => {
    const res = await handler({ action: "turning_physics_analyze", params: physInput() });
    const blob = JSON.stringify(res);
    expect(blob).not.toMatch(/"error"\s*:/);
    for (const k of ["cutting_forces", "tool_life", "thermal", "flow_stress", "deflection_dynamics", "input_summary"]) {
      expect(blob).toContain(k);
    }
    // input echo proves the engine actually consumed the cutting parameters:
    expect((res as any).data?.input_summary?.Vc).toBe(220);
  });

  test("turning_physics_analyze spans operations (roughing / finishing / threading) without error", async () => {
    for (const op of ["roughing", "finishing", "threading"] as const) {
      const res = await handler({ action: "turning_physics_analyze", params: physInput(op) });
      expect(JSON.stringify(res), `op=${op}`).not.toMatch(/"error"\s*:/);
      expect((res as any).data?.input_summary?.operation, `op=${op}`).toBe(op);
    }
  });

  test("adversarial: missing parameters yields a structured dispatcher response, never a throw", async () => {
    const res = await handler({ action: "turning_physics_analyze", params: { material: "4140", operation: "roughing" } });
    // engine validates/derives — either a result or a dispatcher error, but the handler must not throw.
    const blob = JSON.stringify(res);
    expect(blob.length).toBeGreaterThan(0);
    expect(blob).toMatch(/cutting_forces|error|input_summary/i);
  });
});
