/**
 * turning-millturn-advisory.test.ts -- slot:whiskey (Lathe Wizard, U-LW-MILLTURN-ADVISORY)
 * ============================================================================
 * The head (generateProgram) now surfaces mill_turn_advisory -- for every live-tool TurningFeature it runs
 * MillTurnSwissPipelineEngine.calculateLiveTool (real rpm/feed/force/power/is_safe) and maps the result.
 * This upgrades the turning spine's bare U-LW-LIVETOOL-FAILLOUD *warning* into actionable live-tool physics.
 *
 * Intent (R9): the advisory activates ONLY for a live-tool feature carrying a REAL tool diameter + depth +
 * workpiece diameter (a feature missing any is SKIPPED -- never a fabricated input); the correct LiveToolOp
 * is derived from the feature type; the advisory NEVER changes the emitted program_text (operator-safety
 * invariant); it is fail-soft (a calculateLiveTool failure skips that feature, generation still succeeds).
 *
 * Hermeticity: spy-based tests spy the MillTurnSwiss SINGLETON so calculateLiveTool is deterministic; the
 * final test runs the REAL engine.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { latheAIOrchestrationEngine } from "../engines/LatheAIOrchestrationEngine.js";
import { latheOrchestrationEngine } from "../engines/LatheOrchestrationEngine.js";
import { millTurnSwissPipelineEngine } from "../engines/MillTurnSwissPipelineEngine.js";

const odTurn = () =>
  ({ id: "f1", type: "od_turn", od_mm: 30, length_mm: 60, position_z_mm: 0,
    x_start_mm: 40, x_end_mm: 30, z_start_mm: 0, z_end_mm: -60 });

// base OD-turn part (so a program generates) + one live-tool feature with the given overrides
const partWith = (feat: Record<string, unknown>) =>
  ({
    part_number: "MILLTURN",
    material: { material_name: "1018", iso_group: "P" as const },
    bar_stock_od_mm: 40,
    part_length_mm: 80,
    features: [odTurn(), { id: "f2", position_z_mm: -20, z_start_mm: -20, z_end_mm: -30, ...feat }],
    controller: "okuma",
    machine_model: "Okuma LB3000",
  }) as unknown as Parameters<typeof latheOrchestrationEngine.calculate>[1];

const plainPart = () =>
  ({
    part_number: "PLAIN",
    material: { material_name: "1018", iso_group: "P" as const },
    bar_stock_od_mm: 40,
    part_length_mm: 80,
    features: [odTurn()],
    controller: "okuma",
    machine_model: "Okuma LB3000",
  }) as unknown as Parameters<typeof latheOrchestrationEngine.calculate>[1];

// real-shaped LiveToolResult the mill-turn engine would return
const fakeLiveTool = () =>
  ({
    effective_diameter_mm: 10, effective_cutting_speed_m_min: 80, recommended_rpm: 2546,
    feed_mm_rev: 0.1, feed_mm_min: 254, tangential_force_N: 120, power_kW: 0.4,
    power_utilization_pct: 20, torque_Nm: 1.5, interpolation_type: "linear",
    is_safe: true, recommendations: ["Climb mill for finish"], warnings: [],
  }) as unknown as ReturnType<typeof millTurnSwissPipelineEngine.calculateLiveTool>;

describe("U-LW-MILLTURN-ADVISORY -- real live-tool physics wired into the head", () => {
  afterEach(() => vi.restoreAllMocks());

  it("generateProgram surfaces mill_turn_advisory mapped from calculateLiveTool for a live-tool feature", () => {
    vi.spyOn(millTurnSwissPipelineEngine, "calculateLiveTool").mockReturnValue(fakeLiveTool());
    const r = latheAIOrchestrationEngine.generateProgram(partWith({ type: "keyway", live_tool_diameter_mm: 10, depth_mm: 3, od_mm: 30 }));
    expect(r.mill_turn_advisory.length).toBe(1);
    const e = r.mill_turn_advisory[0];
    expect(e).toMatchObject({ feature_id: "f2", feature_type: "keyway", live_tool_op: "keyway_mill", tool_diameter_mm: 10 });
    expect(e.recommended_rpm).toBe(2546);
    expect(e.feed_mm_min).toBe(254);
    expect(e.is_safe).toBe(true);
    expect(e.recommendations).toContain("Climb mill for finish");
  });

  it("NO FABRICATION: passes REAL feature params to calculateLiveTool + maps the feature type to the right LiveToolOp", () => {
    let captured: { operation?: string; tool_diameter_mm?: number; depth_of_cut_mm?: number; workpiece_diameter_mm?: number } | undefined;
    vi.spyOn(millTurnSwissPipelineEngine, "calculateLiveTool").mockImplementation((inp) => {
      captured = inp;
      return fakeLiveTool();
    });
    latheAIOrchestrationEngine.assessMillTurn(partWith({ type: "cross_drill", cross_hole_diameter_mm: 6, depth_mm: 8, od_mm: 30 }));
    expect(captured?.operation).toBe("cross_drill"); // cross_drill feature -> cross_drill op
    expect(captured!.tool_diameter_mm).toBe(6); // from cross_hole_diameter_mm (drilling), not fabricated
    expect(captured!.depth_of_cut_mm).toBe(8); // real depth
    expect(captured!.workpiece_diameter_mm).toBe(30); // real feature od
  });

  it("NO FABRICATION: a live-tool feature MISSING a tool diameter is SKIPPED (engine never called for it)", () => {
    const spy = vi.spyOn(millTurnSwissPipelineEngine, "calculateLiveTool").mockReturnValue(fakeLiveTool());
    // keyway with NO live_tool_diameter_mm and NO cross_hole_diameter_mm -> cannot resolve a real tool dia
    const r = latheAIOrchestrationEngine.generateProgram(partWith({ type: "keyway", depth_mm: 3, od_mm: 30 }));
    expect(r.mill_turn_advisory).toEqual([]); // skipped -- no fabricated diameter
    expect(spy).not.toHaveBeenCalled();
  });

  it("a plain OD-turn part yields NO mill_turn_advisory and never calls the live-tool engine", () => {
    const spy = vi.spyOn(millTurnSwissPipelineEngine, "calculateLiveTool").mockReturnValue(fakeLiveTool());
    const r = latheAIOrchestrationEngine.generateProgram(plainPart());
    expect(r.mill_turn_advisory).toEqual([]);
    expect(spy).not.toHaveBeenCalled();
  });

  it("ADVISORY-ONLY: mill_turn_advisory NEVER alters the emitted program_text (operator-safety invariant)", () => {
    const stripTs = (s: string) =>
      s.replace(/\(GENERATED:[^)]*\)/g, "(GENERATED)").replace(/\d{4}-\d\d-\d\dT[\d:.]+Z?/g, "<TS>").trim();
    vi.spyOn(millTurnSwissPipelineEngine, "calculateLiveTool").mockReturnValue(fakeLiveTool());
    const input = partWith({ type: "keyway", live_tool_diameter_mm: 10, depth_mm: 3, od_mm: 30 });
    const spine = latheOrchestrationEngine.calculate("x", input); // spine never computes the mill-turn advisory
    const head = latheAIOrchestrationEngine.generateProgram(input);
    expect(head.mill_turn_advisory.length).toBe(1); // advisory present...
    expect(stripTs(head.program_text)).toBe(stripTs(spine.program_text)); // ...G-code byte-identical
  });

  it("FAIL-SOFT: a calculateLiveTool failure skips the feature and NEVER aborts generation", () => {
    vi.spyOn(millTurnSwissPipelineEngine, "calculateLiveTool").mockImplementation(() => {
      throw new Error("live-tool physics unavailable");
    });
    const r = latheAIOrchestrationEngine.generateProgram(partWith({ type: "keyway", live_tool_diameter_mm: 10, depth_mm: 3, od_mm: 30 }));
    expect(r.success).toBe(true); // generation completes despite the failure
    expect(r.program_text.length).toBeGreaterThan(50);
    expect(r.mill_turn_advisory).toEqual([]); // the failed feature is skipped, not fabricated
  });

  it("skip_mill_turn_advisory:true is a perf opt-out -- [] WITHOUT calling the engine", () => {
    const spy = vi.spyOn(millTurnSwissPipelineEngine, "calculateLiveTool").mockReturnValue(fakeLiveTool());
    const input = { ...(partWith({ type: "keyway", live_tool_diameter_mm: 10, depth_mm: 3, od_mm: 30 }) as object), skip_mill_turn_advisory: true } as unknown as Parameters<
      typeof latheOrchestrationEngine.calculate
    >[1];
    const r = latheAIOrchestrationEngine.generateProgram(input);
    expect(r.mill_turn_advisory).toEqual([]);
    expect(spy).not.toHaveBeenCalled();
  });

  it("op mapping: each live-tool feature type maps to its nearest LiveToolOp (hex->polygon_turn, flat->face_mill)", () => {
    const ops: string[] = [];
    vi.spyOn(millTurnSwissPipelineEngine, "calculateLiveTool").mockImplementation((inp) => {
      ops.push(inp.operation);
      return fakeLiveTool();
    });
    latheAIOrchestrationEngine.assessMillTurn(partWith({ type: "hex_mill", live_tool_diameter_mm: 8, depth_mm: 2, od_mm: 30 }));
    latheAIOrchestrationEngine.assessMillTurn(partWith({ type: "flat_mill", live_tool_diameter_mm: 12, depth_mm: 2, od_mm: 30 }));
    latheAIOrchestrationEngine.assessMillTurn(partWith({ type: "cross_tap", cross_hole_diameter_mm: 5, depth_mm: 6, od_mm: 30 }));
    expect(ops).toEqual(["polygon_turn", "face_mill", "cross_tap"]);
  });

  it("REAL ENGINE (no spy): a keyway feature yields a real advisory entry with finite physics", () => {
    const a = latheAIOrchestrationEngine.assessMillTurn(partWith({ type: "keyway", live_tool_diameter_mm: 10, depth_mm: 3, od_mm: 30 }));
    expect(a.length).toBe(1);
    expect(a[0].live_tool_op).toBe("keyway_mill");
    expect(Number.isFinite(a[0].recommended_rpm)).toBe(true);
    expect(a[0].recommended_rpm).toBeGreaterThan(0);
    expect(typeof a[0].is_safe).toBe("boolean");
  });

  it("emits ONE advisory entry per live-tool feature (array contract) when a part has multiple", () => {
    vi.spyOn(millTurnSwissPipelineEngine, "calculateLiveTool").mockReturnValue(fakeLiveTool());
    const input = {
      part_number: "MULTI",
      material: { material_name: "1018", iso_group: "P" as const },
      bar_stock_od_mm: 40,
      part_length_mm: 80,
      features: [
        odTurn(),
        { id: "f2", type: "keyway", live_tool_diameter_mm: 10, depth_mm: 3, od_mm: 30, position_z_mm: -20, z_start_mm: -20, z_end_mm: -30 },
        { id: "f3", type: "cross_drill", cross_hole_diameter_mm: 6, depth_mm: 8, od_mm: 30, position_z_mm: -40, z_start_mm: -40, z_end_mm: -48 },
      ],
      controller: "okuma",
      machine_model: "Okuma LB3000",
    } as unknown as Parameters<typeof latheOrchestrationEngine.calculate>[1];
    const a = latheAIOrchestrationEngine.assessMillTurn(input);
    expect(a.map((e) => e.feature_id)).toEqual(["f2", "f3"]); // one entry per live-tool feature, in order
    expect(a.map((e) => e.live_tool_op)).toEqual(["keyway_mill", "cross_drill"]);
  });

  it("NO FABRICATION: a live-tool feature with a tool diameter but NO depth is SKIPPED (never a fabricated depth)", () => {
    const spy = vi.spyOn(millTurnSwissPipelineEngine, "calculateLiveTool").mockReturnValue(fakeLiveTool());
    // has a real tool diameter but NO notch/pocket/depth_mm -> depth cannot be resolved -> skip (no fabrication)
    const r = latheAIOrchestrationEngine.assessMillTurn(partWith({ type: "keyway", live_tool_diameter_mm: 10, od_mm: 30 }));
    expect(r).toEqual([]);
    expect(spy).not.toHaveBeenCalled();
  });
});
