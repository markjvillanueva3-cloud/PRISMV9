/**
 * turning-swiss-advisory.test.ts -- slot:whiskey (Lathe Wizard, U-LW-SWISS-ADVISORY)
 * ============================================================================
 * The head (generateProgram) now surfaces swiss_advisory -- SwissTypeIntelligenceEngine.analyzeGuideBushing
 * over the part's geometry (does this part's L/D + material + tolerance call for a Swiss guide bushing?).
 * Answers the operator's "swiss lathe machining" ask.
 *
 * Intent (R9): the recommendation is driven by REAL part geometry (bar OD + length -> L/D); it NEVER changes
 * the emitted program_text (operator-safety invariant); it is fail-soft (analysis failure -> undefined,
 * generation still succeeds); and -- the standing lesson -- the part is mapped from real fields with NO
 * fabricated inputs (the reference Swiss machine is metadata-only; the analysis is part-driven).
 *
 * Hermeticity: spy-based tests spy the Swiss SINGLETON; the final tests run the REAL engine (pure math).
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { latheAIOrchestrationEngine } from "../engines/LatheAIOrchestrationEngine.js";
import { latheOrchestrationEngine } from "../engines/LatheOrchestrationEngine.js";
import { swissTypeIntelligenceEngine } from "../engines/SwissTypeIntelligenceEngine.js";

const odTurn = () =>
  ({ id: "f1", type: "od_turn", od_mm: 30, length_mm: 60, position_z_mm: 0,
    x_start_mm: 40, x_end_mm: 30, z_start_mm: 0, z_end_mm: -60 });

// well-behaved part (spine emits a program) -- L/D ~2.7
const okumaPart = () =>
  ({
    part_number: "SWISS", material: { material_name: "1018", iso_group: "P" as const },
    bar_stock_od_mm: 40, finished_od_mm: 30, part_length_mm: 80,
    features: [odTurn()], controller: "okuma", machine_model: "Okuma LB3000",
  }) as unknown as Parameters<typeof latheOrchestrationEngine.calculate>[1];

// slender bar -- L/D=12.5 (200/16), well above the engine's >8 high-risk threshold -> the part-driven
// guide-bushing analysis recommends a bushing (high deflection risk)
const slenderPart = () =>
  ({
    part_number: "SWISS-SLENDER", material: { material_name: "1018", iso_group: "P" as const },
    bar_stock_od_mm: 16, finished_od_mm: 15, part_length_mm: 200,
    features: [odTurn()], controller: "okuma", machine_model: "Okuma LB3000",
  }) as unknown as Parameters<typeof latheOrchestrationEngine.calculate>[1];

// short fat part -- L/D=1 -> bushingless (part-driven)
const stubbyPart = () =>
  ({
    part_number: "SWISS-STUBBY", material: { material_name: "1018", iso_group: "P" as const },
    bar_stock_od_mm: 40, finished_od_mm: 38, part_length_mm: 40,
    features: [odTurn()], controller: "okuma", machine_model: "Okuma LB3000",
  }) as unknown as Parameters<typeof latheOrchestrationEngine.calculate>[1];

const fakeGuideBushing = () =>
  ({ success: true, data: {
    recommendation: "use_bushing", reason: "High L/D ratio requires guide bushing support",
    deflectionRisk: "high", supportDistance_mm: 7, ldRatio: 8, bushingWear: "minimal",
  } }) as unknown as ReturnType<typeof swissTypeIntelligenceEngine.analyzeGuideBushing>;

describe("U-LW-SWISS-ADVISORY -- Swiss guide-bushing analysis wired into the head", () => {
  afterEach(() => vi.restoreAllMocks());

  it("generateProgram surfaces swiss_advisory mapped from analyzeGuideBushing", () => {
    vi.spyOn(swissTypeIntelligenceEngine, "analyzeGuideBushing").mockReturnValue(fakeGuideBushing());
    const r = latheAIOrchestrationEngine.generateProgram(okumaPart());
    expect(r.swiss_advisory?.recommendation).toBe("use_bushing");
    const a = r.swiss_advisory!;
    expect(a.deflection_risk).toBe("high");
    expect(a.ld_ratio).toBe(8);
    expect(a.support_distance_mm).toBe(7);
    expect(a.bushing_wear).toBe("minimal");
    expect(a.reason).toContain("guide bushing");
  });

  it("NO FABRICATION: the part is mapped to the Swiss analyzer from REAL geometry (bar OD + length)", () => {
    let captured: { part: { barDiameter_mm?: number; finishedLength_mm?: number; maxOD_mm?: number; material?: string } } | undefined;
    vi.spyOn(swissTypeIntelligenceEngine, "analyzeGuideBushing").mockImplementation((part) => {
      captured = { part };
      return fakeGuideBushing();
    });
    latheAIOrchestrationEngine.assessSwiss(okumaPart());
    expect(captured?.part.barDiameter_mm).toBe(40); // real bar OD
    expect(captured!.part.finishedLength_mm).toBe(80); // real part length
    expect(captured!.part.maxOD_mm).toBe(30); // honest finished OD
    expect(captured!.part.material).toBe("1018"); // real material
  });

  it("ADVISORY-ONLY: swiss_advisory NEVER alters the emitted program_text (operator-safety invariant)", () => {
    const stripTs = (s: string) =>
      s.replace(/\(GENERATED:[^)]*\)/g, "(GENERATED)").replace(/\d{4}-\d\d-\d\dT[\d:.]+Z?/g, "<TS>").trim();
    vi.spyOn(swissTypeIntelligenceEngine, "analyzeGuideBushing").mockReturnValue(fakeGuideBushing());
    const spine = latheOrchestrationEngine.calculate("x", okumaPart()); // spine never computes the Swiss advisory
    const head = latheAIOrchestrationEngine.generateProgram(okumaPart());
    expect(head.swiss_advisory?.recommendation).toBe("use_bushing"); // advisory present...
    expect(stripTs(head.program_text)).toBe(stripTs(spine.program_text)); // ...G-code byte-identical
  });

  it("FAIL-SOFT: an analysis failure yields undefined and NEVER aborts generation", () => {
    vi.spyOn(swissTypeIntelligenceEngine, "analyzeGuideBushing").mockImplementation(() => {
      throw new Error("swiss analysis unavailable");
    });
    const r = latheAIOrchestrationEngine.generateProgram(okumaPart());
    expect(r.success).toBe(true);
    expect(r.program_text.length).toBeGreaterThan(50);
    expect(r.swiss_advisory).toBeUndefined();
  });

  it("skip_swiss_advisory:true is a perf opt-out -- undefined WITHOUT touching the engine", () => {
    const spy = vi.spyOn(swissTypeIntelligenceEngine, "analyzeGuideBushing").mockReturnValue(fakeGuideBushing());
    const input = { ...(okumaPart() as object), skip_swiss_advisory: true } as unknown as Parameters<
      typeof latheOrchestrationEngine.calculate
    >[1];
    const r = latheAIOrchestrationEngine.generateProgram(input);
    expect(r.swiss_advisory).toBeUndefined();
    expect(spy).not.toHaveBeenCalled();
  });

  it("assessSwiss (the dispatcher path) returns the mapped advisory", () => {
    vi.spyOn(swissTypeIntelligenceEngine, "analyzeGuideBushing").mockReturnValue(fakeGuideBushing());
    const a = latheAIOrchestrationEngine.assessSwiss(okumaPart());
    expect(a?.recommendation).toBe("use_bushing");
    expect(a!.ld_ratio).toBe(8);
  });

  it("REAL ENGINE (no spy): a slender L/D=12.5 bar recommends a guide bushing (high deflection risk)", () => {
    const a = latheAIOrchestrationEngine.assessSwiss(slenderPart());
    expect(a?.recommendation).toBe("use_bushing");
    expect(a!.deflection_risk).toBe("high");
    expect(a!.ld_ratio).toBeCloseTo(12.5, 1); // 200/16 = 12.5, real geometry
  });

  it("REAL ENGINE (no spy): a stubby L/D=1 part recommends bushingless (real part-driven reasoning)", () => {
    const a = latheAIOrchestrationEngine.assessSwiss(stubbyPart());
    expect(a?.recommendation).toBe("bushingless");
    expect(a!.deflection_risk).toBe("low");
  });

  it("REGRESSION GUARD: analyzeGuideBushing is machine-INDEPENDENT (the metadata-only property the advisory relies on)", () => {
    // The head passes a FIXED reference SwissMachineConfig precisely BECAUSE analyzeGuideBushing's output is
    // part-driven. If a future change makes it read machine numerics, this test fails -- flagging that the
    // reference-machine assumption (which is what makes the advisory NON-fabricating) has broken.
    const part = { partId: "p", barDiameter_mm: 16, finishedLength_mm: 200, maxOD_mm: 15, features: [],
      material: "1018", tolerance_class: "standard", annualVolume: 1 } as unknown as Parameters<typeof swissTypeIntelligenceEngine.analyzeGuideBushing>[0];
    const machineA = { machineId: "a", manufacturer: "citizen", model: "m", maxBarDiameter_mm: 32,
      guideBushingType: "fixed", gangToolPositions: 8, backToolPositions: 4, hasSubSpindle: true, hasYAxis: false,
      hasBAxis: false, maxMainSpindleRpm: 10000, maxSubSpindleRpm: 8000, coolantType: "oil" } as unknown as Parameters<typeof swissTypeIntelligenceEngine.analyzeGuideBushing>[1];
    const machineB = { ...(machineA as object), machineId: "b", manufacturer: "star", maxBarDiameter_mm: 38,
      guideBushingType: "rotating", maxMainSpindleRpm: 6000 } as unknown as Parameters<typeof swissTypeIntelligenceEngine.analyzeGuideBushing>[1];
    const rA = swissTypeIntelligenceEngine.analyzeGuideBushing(part, machineA);
    const rB = swissTypeIntelligenceEngine.analyzeGuideBushing(part, machineB);
    expect(rA.data).toEqual(rB.data); // identical output across 2 machines -> machine provably does not influence the analysis
  });
});
