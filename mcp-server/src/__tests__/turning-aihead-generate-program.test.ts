/**
 * turning-aihead-generate-program.test.ts -- slot:whiskey (Lathe Wizard, U-AIHEAD-01)
 * ============================================================================
 * The AI head (LatheAIOrchestrationEngine) referenced the generation spine (LatheOrchestrationEngine)
 * only as registry STRINGS -- it never imported or drove it. generateProgram() closes that: it imports +
 * calls the now-real spine (which emits via the verified runPipeline) and layers the AGI safety-containment
 * engine as an INDEPENDENT second-opinion over each op's cutting params. The advisory is purely ADDITIVE --
 * it never changes program_text or the spine's verdict; the spine's physics stays the authority.
 *
 * Intent (R9): the head produces a REAL program identical to the spine's (faithful delegation); it adds a
 * per-op AI safety advisory (the head's actual contribution); a spine fail-close is HONORED (success:false,
 * no program) and the advisory NEVER overrides it.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { latheAIOrchestrationEngine } from "../engines/LatheAIOrchestrationEngine.js";
import { latheOrchestrationEngine } from "../engines/LatheOrchestrationEngine.js";
import { turningPrintToProgramEngine } from "../engines/TurningPrintToProgramEngine.js";

const part = () =>
  ({
    part_number: "AIHEAD-GEN",
    material: { material_name: "1018", iso_group: "P" as const },
    bar_stock_od_mm: 40,
    part_length_mm: 80,
    features: [
      { id: "f1", type: "od_turn" as const, od_mm: 30, length_mm: 60, position_z_mm: 0,
        x_start_mm: 40, x_end_mm: 30, z_start_mm: 0, z_end_mm: -60 },
    ],
    controller: "okuma",
    machine_model: "Okuma LB3000",
  }) as unknown as Parameters<typeof latheOrchestrationEngine.calculate>[1];

describe("U-AIHEAD-01 -- the AI head drives the spine + adds an AI safety advisory", () => {
  afterEach(() => vi.restoreAllMocks());

  it("generates a real program through the spine (head -> spine -> runPipeline)", () => {
    const r = latheAIOrchestrationEngine.generateProgram(part());
    expect(r.success).toBe(true);
    expect(r.program_text.length).toBeGreaterThan(50);
    expect(/\bG\d/.test(r.program_text)).toBe(true);
    expect(r.total_operations).toBeGreaterThan(0);
    expect(r.sessionId).toMatch(/generate/);
  });

  it("the head's program EQUALS the spine's (faithful delegation -- head imports + drives, not re-derives)", () => {
    const stripTs = (s: string) =>
      s.replace(/\(GENERATED:[^)]*\)/g, "(GENERATED)").replace(/\d{4}-\d\d-\d\dT[\d:.]+Z?/g, "<TS>").trim();
    const spine = latheOrchestrationEngine.calculate("x", part());
    const head = latheAIOrchestrationEngine.generateProgram(part());
    expect(stripTs(head.program_text)).toBe(stripTs(spine.program_text));
  });

  it("produces a per-op AI safety advisory (the head's contribution)", () => {
    const r = latheAIOrchestrationEngine.generateProgram(part());
    expect(Array.isArray(r.ai_safety_advisory)).toBe(true);
    // summary count matches the advisory array length (internal consistency)
    expect(r.ai_advisory_summary.ops_checked).toBe(r.ai_safety_advisory.length);
    // the part has real cutting ops, so at least one op was AI-checked
    expect(r.ai_advisory_summary.ops_checked).toBeGreaterThan(0);
    for (const a of r.ai_safety_advisory) {
      expect(typeof a.passed).toBe("boolean");
      expect(Number.isFinite(a.op_number)).toBe(true);
      expect(Array.isArray(a.checks)).toBe(true);
    }
  });

  it("SAFETY: a spine fail-close is HONORED -- success:false, no program; the AI advisory never overrides it", () => {
    vi.spyOn(
      turningPrintToProgramEngine as unknown as { emitViaOkumaPost: () => unknown },
      "emitViaOkumaPost",
    ).mockReturnValue(null);
    const r = latheAIOrchestrationEngine.generateProgram(part());
    expect(r.success).toBe(false);          // spine verdict honored (physics is authority)
    expect(r.safety_passed).toBe(false);
    expect(/\bT0101\b/.test(r.program_text)).toBe(false); // no real program ships
  });
});
