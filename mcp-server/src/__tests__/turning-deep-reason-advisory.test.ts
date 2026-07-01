/**
 * turning-deep-reason-advisory.test.ts -- slot:whiskey (Lathe Wizard, U-LW-DEEP-REASON-ADVISORY)
 * ============================================================================
 * The head (generateProgram) now runs the deterministic FMEA deep-reasoning engine
 * (LatheDeepReasoningEngine.analyzeFailureModes) over the generated part and surfaces it as
 * deep_reasoning_advisory. The advisory is purely ADDITIVE -- it never alters the spine's emitted
 * program_text -- and is fail-soft (a reasoning failure yields undefined and never aborts generation).
 *
 * Intent (R9): deep_reasoning_advisory is mapped from the REAL FMEA (rule-based RPN, no untrained NN);
 * it NEVER changes the emitted G-code (the operator-safety invariant); a reasoning failure is contained
 * (generation still succeeds); the skip opt-out short-circuits without touching the engine; and -- the
 * standing-lesson assertion -- the turning input is mapped to the reasoning engine's part WITHOUT
 * fabricating physics inputs (iso/geometry from real fields, tolerance/finish as conservative
 * absence-defaults, machine_type derived from real features).
 *
 * Hermeticity: every spy-based test spies the deep-reasoning SINGLETON so the test is deterministic and
 * does no I/O. The final test runs the REAL engine (it is pure rule-based math -- no I/O).
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { latheAIOrchestrationEngine } from "../engines/LatheAIOrchestrationEngine.js";
import { latheOrchestrationEngine } from "../engines/LatheOrchestrationEngine.js";
import { latheDeepReasoningEngine } from "../engines/LatheDeepReasoningEngine.js";

const okumaPart = () =>
  ({
    part_number: "DEEP-REASON",
    material: { material_name: "1018", iso_group: "P" as const },
    bar_stock_od_mm: 40,
    finished_od_mm: 30,
    part_length_mm: 80, // well-behaved L/D ~2.7 -> the spine emits a real program (success path)
    features: [
      { id: "f1", type: "od_turn" as const, od_mm: 30, length_mm: 60, position_z_mm: 0,
        x_start_mm: 40, x_end_mm: 30, z_start_mm: 0, z_end_mm: -60 },
    ],
    controller: "okuma",
    machine_model: "Okuma LB3000",
  }) as unknown as Parameters<typeof latheOrchestrationEngine.calculate>[1];

// a slender L/D=6 bar -- the FMEA (which reasons over the INPUT geometry, independent of spine emit)
// must flag chatter from the real L/D ratio.
const slenderPart = () =>
  ({
    part_number: "DEEP-REASON-SLENDER",
    material: { material_name: "1018", iso_group: "P" as const },
    bar_stock_od_mm: 40,
    finished_od_mm: 30,
    part_length_mm: 180, // L/D = 6 -> real chatter risk from real geometry
    features: [
      { id: "f1", type: "od_turn" as const, od_mm: 30, length_mm: 160, position_z_mm: 0,
        x_start_mm: 40, x_end_mm: 30, z_start_mm: 0, z_end_mm: -160 },
    ],
    controller: "okuma",
    machine_model: "Okuma LB3000",
  }) as unknown as Parameters<typeof latheOrchestrationEngine.calculate>[1];

// a real-shaped FailureModeAnalysis the deep-reasoning engine would return
const fakeFmea = () =>
  ({
    reasoning_chain: {
      chain_id: "c1",
      problem_statement: "Failure mode analysis for DEEP-REASON",
      steps: [],
      conclusion: "2 failure modes identified. Overall risk: high. Top risk: Chatter vibration during turning.",
      overall_confidence: 0.85,
      total_reasoning_time_ms: 1,
      metadata: { material: "1018", machine_type: "2_axis", complexity_level: "moderate" },
    },
    failure_modes: [
      { mode_id: "FM-CHATTER", description: "Chatter vibration during turning", category: "process",
        probability: 0.5, severity: 7, rpn: 35, causes: ["High L/D ratio"], effects: ["Poor finish"],
        detection_method: "Audible", prevention: ["Use tailstock", "Reduce RPM"], contingency: "Stop" },
      { mode_id: "FM-TOOL-BREAK", description: "Tool breakage during cut", category: "tooling",
        probability: 0.2, severity: 8, rpn: 16, causes: ["Worn tool"], effects: ["Part scrap"],
        detection_method: "Load", prevention: ["Tool life mgmt"], contingency: "E-stop" },
    ],
    overall_risk_level: "high",
    top_risks: ["Chatter vibration during turning", "Tool breakage during cut"],
    recommended_inspections: ["Surface roughness measurement"],
  }) as unknown as ReturnType<typeof latheDeepReasoningEngine.analyzeFailureModes>;

describe("U-LW-DEEP-REASON-ADVISORY -- deterministic FMEA deep-reasoning wired into the head", () => {
  afterEach(() => vi.restoreAllMocks());

  it("generateProgram surfaces deep_reasoning_advisory mapped from the REAL FMEA engine", () => {
    vi.spyOn(latheDeepReasoningEngine, "analyzeFailureModes").mockReturnValue(fakeFmea());
    const r = latheAIOrchestrationEngine.generateProgram(okumaPart());
    expect(r.deep_reasoning_advisory?.overall_risk_level).toBe("high");
    const a = r.deep_reasoning_advisory!;
    expect(a.failure_modes.map((f) => f.mode_id)).toEqual(["FM-CHATTER", "FM-TOOL-BREAK"]);
    expect(a.failure_modes[0]).toMatchObject({ category: "process", probability: 0.5, severity: 7, rpn: 35 });
    expect(a.failure_modes[0].prevention).toContain("Use tailstock");
    expect(a.top_risks[0]).toContain("Chatter");
    expect(a.recommended_inspections).toContain("Surface roughness measurement");
    expect(a.reasoning_summary).toContain("Overall risk: high");
    // the surfaced mode is the intentional slim subset -- raw FMEA internals (causes/effects/contingency)
    // are NOT leaked (locks the contract so a future consumer never silently misses a field)
    expect(a.failure_modes[0]).not.toHaveProperty("contingency");
    expect(a.failure_modes[0]).not.toHaveProperty("causes");
  });

  it("ADVISORY-ONLY: deep_reasoning_advisory NEVER alters the emitted program_text (operator-safety invariant)", () => {
    const stripTs = (s: string) =>
      s.replace(/\(GENERATED:[^)]*\)/g, "(GENERATED)").replace(/\d{4}-\d\d-\d\dT[\d:.]+Z?/g, "<TS>").trim();
    vi.spyOn(latheDeepReasoningEngine, "analyzeFailureModes").mockReturnValue(fakeFmea());
    const spine = latheOrchestrationEngine.calculate("x", okumaPart()); // spine never computes deep reasoning
    const head = latheAIOrchestrationEngine.generateProgram(okumaPart());
    expect(head.deep_reasoning_advisory?.failure_modes.length).toBe(2); // advisory present...
    expect(stripTs(head.program_text)).toBe(stripTs(spine.program_text)); // ...G-code byte-identical
  });

  it("FAIL-SOFT: a reasoning failure yields undefined and NEVER aborts generation", () => {
    vi.spyOn(latheDeepReasoningEngine, "analyzeFailureModes").mockImplementation(() => {
      throw new Error("reasoning unavailable");
    });
    const r = latheAIOrchestrationEngine.generateProgram(okumaPart());
    expect(r.success).toBe(true); // generation completes despite reasoning failure
    expect(r.program_text.length).toBeGreaterThan(50);
    expect(r.deep_reasoning_advisory).toBeUndefined();
  });

  it("skip_deep_reasoning_advisory:true is a perf opt-out -- undefined WITHOUT touching the engine", () => {
    const spy = vi.spyOn(latheDeepReasoningEngine, "analyzeFailureModes").mockReturnValue(fakeFmea());
    const input = { ...(okumaPart() as object), skip_deep_reasoning_advisory: true } as unknown as Parameters<
      typeof latheOrchestrationEngine.calculate
    >[1];
    const r = latheAIOrchestrationEngine.generateProgram(input);
    expect(r.deep_reasoning_advisory).toBeUndefined();
    expect(spy).not.toHaveBeenCalled(); // engine never invoked -- the opt-out short-circuits
    expect(r.success).toBe(true); // generation still completes
  });

  it("assessDeepReasoning (the dispatcher path) returns the same mapped advisory", () => {
    vi.spyOn(latheDeepReasoningEngine, "analyzeFailureModes").mockReturnValue(fakeFmea());
    const a = latheAIOrchestrationEngine.assessDeepReasoning(okumaPart());
    expect(a?.overall_risk_level).toBe("high");
    expect(a!.failure_modes.map((f) => f.mode_id)).toEqual(["FM-CHATTER", "FM-TOOL-BREAK"]);
  });

  it("NO FABRICATION: the turning input is mapped to the FMEA part with HONEST geometry/iso (no invented physics)", () => {
    let captured: { part: any; machine: any } | undefined;
    vi.spyOn(latheDeepReasoningEngine, "analyzeFailureModes").mockImplementation((part, machine) => {
      captured = { part, machine };
      return fakeFmea();
    });
    latheAIOrchestrationEngine.assessDeepReasoning(okumaPart());
    // iso + geometry come from REAL input fields
    expect(captured?.part.iso_group).toBe("P");
    expect(captured!.part.finished_od_mm).toBe(30); // honest finished_od_mm field
    expect(captured!.part.stock_od_mm).toBe(40); // honest bar OD
    expect(captured!.part.finished_length_mm).toBe(80);
    expect(captured!.part.stock_type).toBe("bar");
    // tolerance/finish are conservative NON-INFLATING absence-defaults (no invented tight tolerance)
    expect(captured!.part.tolerances.diameter_mm).toBeGreaterThanOrEqual(0.05);
    expect(captured!.part.surface_finish_ra).toBeGreaterThanOrEqual(3.2);
    // machine_type derived from real features (this part has no live-tool feature -> 2-axis)
    expect(captured!.machine.machine_type).toBe("2_axis");
    expect(captured!.machine.controller).toBe("okuma_osp");
  });

  it("machine_type maps to mill_turn when a live-tool feature is present (honest derivation, not assumed)", () => {
    let captured: { machine_type?: string; has_live_tooling?: boolean } | undefined;
    vi.spyOn(latheDeepReasoningEngine, "analyzeFailureModes").mockImplementation((_part, machine) => {
      captured = machine;
      return fakeFmea();
    });
    const input = {
      ...(okumaPart() as object),
      features: [
        { id: "f1", type: "od_turn", od_mm: 30, length_mm: 60, position_z_mm: 0, x_start_mm: 40, x_end_mm: 30, z_start_mm: 0, z_end_mm: -60 },
        { id: "f2", type: "keyway", od_mm: 30, length_mm: 10, depth_mm: 3, position_z_mm: -20, x_start_mm: 30, x_end_mm: 27, z_start_mm: -20, z_end_mm: -30 },
      ],
    } as unknown as Parameters<typeof latheOrchestrationEngine.calculate>[1];
    latheAIOrchestrationEngine.assessDeepReasoning(input);
    expect(captured?.machine_type).toBe("mill_turn");
    expect(captured!.has_live_tooling).toBe(true);
  });

  it("REAL ENGINE (no spy): the well-behaved part yields a non-empty FMEA with a valid risk level and finite RPNs", () => {
    const r = latheAIOrchestrationEngine.generateProgram(okumaPart());
    const a = r.deep_reasoning_advisory;
    expect(a?.failure_modes.length).toBeGreaterThan(0); // FMEA always yields >=3 base modes
    expect(["low", "moderate", "high", "critical"]).toContain(a!.overall_risk_level);
    for (const fm of a!.failure_modes) {
      expect(Number.isFinite(fm.rpn)).toBe(true);
      expect(fm.rpn).toBeGreaterThanOrEqual(0);
    }
  });

  it("REAL ENGINE (no spy): a slender L/D=6 bar surfaces FM-CHATTER -- real reasoning over real geometry", () => {
    // the advisory maps from the INPUT geometry, so the FMEA runs even though the spine fail-closes a slender part
    const a = latheAIOrchestrationEngine.assessDeepReasoning(slenderPart());
    expect(a?.failure_modes.some((f) => f.mode_id === "FM-CHATTER")).toBe(true);
    expect(["moderate", "high", "critical"]).toContain(a!.overall_risk_level); // slender -> elevated risk
    // FM-EJECT is the single safety-critical mode (severity 10, workpiece ejection from chuck). An L/D=6
    // slender bar MUST surface it -- a regression that dropped the highest-severity mode from the advisory
    // would otherwise pass silently (whiskey safety-first: never lose the ejection warning).
    expect(a!.failure_modes.some((f) => f.mode_id === "FM-EJECT")).toBe(true);
    expect(a!.failure_modes.some((f) => f.severity >= 10)).toBe(true);
  });
});
