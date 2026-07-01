/**
 * turning-aihead-spine-wire.test.ts -- slot:whiskey (Lathe Wizard, AI-head wiring U-LW-AIHEAD-SPINE)
 * ============================================================================
 * The lathe "AI orchestration spine" (LatheOrchestrationEngine.calculate -- the 35-stage pipeline
 * wired to MCP as `lathe_orchestration_calculate`) had a STUB GCODE_GENERATE stage: it pushed
 * "(PRISM LatheOrchestrator -- G-code generation pending)" and never produced a real program. So the
 * AI orchestration head emitted a placeholder, NOT G-code (the headline "~3% of lathe capability
 * reaches program-gen time" gap). This wires GCODE_GENERATE to delegate to the verified
 * TurningPrintToProgramEngine.runPipeline. Because LatheOrchestrationInput extends TurningInput the
 * call is type-clean, and runPipeline remains the fail-CLOSED emission authority: if it suppresses
 * emission (critical warning -> empty program_text) the orchestrator emits NO program and records the
 * block, which the result assembly folds into safetyBlocks (-> success:false, program_text shows BLOCK).
 *
 * Intent (R9): the spine now emits a REAL program (not the stub); the spine program EQUALS what
 * runPipeline emits directly (faithful delegation, additive -- the direct path is untouched); a
 * runPipeline fail-close BLOCKS the spine's output (no placeholder/Fanuc ships to an OSP machine).
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { latheOrchestrationEngine } from "../engines/LatheOrchestrationEngine.js";
import { turningPrintToProgramEngine } from "../engines/TurningPrintToProgramEngine.js";

// A simple single-OD-turn Okuma part -- the same shape the OSP happy-path tests use, so runPipeline
// is known to succeed and emit. Isolates the GCODE_GENERATE delegation.
const part = () =>
  ({
    part_number: "AIHEAD-SPINE",
    material: { material_name: "1018", iso_group: "P" as const },
    bar_stock_od_mm: 40,
    part_length_mm: 80,
    features: [
      {
        id: "f1",
        type: "od_turn" as const,
        od_mm: 30,
        length_mm: 60,
        position_z_mm: 0,
        x_start_mm: 40,
        x_end_mm: 30,
        z_start_mm: 0,
        z_end_mm: -60,
      },
    ],
    controller: "okuma",
    machine_model: "Okuma LB3000",
  }) as unknown as Parameters<typeof latheOrchestrationEngine.calculate>[1];

describe("U-LW-AIHEAD-SPINE -- the AI orchestration spine emits REAL G-code (was a stub)", () => {
  afterEach(() => vi.restoreAllMocks());

  it("calculate() produces a real program, NOT the stub placeholder", () => {
    const r = latheOrchestrationEngine.calculate("generate", part());
    expect(r.success).toBe(true);
    // the old stub markers must be gone
    expect(r.program_text).not.toContain("G-code generation pending");
    expect(r.program_text).not.toContain("program generation pending");
    // real emitted G-code: multiple lines, contains real G-words and a tool call
    expect(r.program_line_count).toBeGreaterThan(5);
    expect(/\bG\d/.test(r.program_text)).toBe(true);
    expect(/\bT\d/.test(r.program_text)).toBe(true);
  });

  it("the spine's program EQUALS what runPipeline emits directly (faithful delegation, additive)", () => {
    // The OSP post stamps a non-deterministic "(GENERATED: <ISO>)" line, so two separate runPipeline
    // calls differ only by wall-clock; normalize it away and the rest must be byte-identical -- proving
    // the spine delegated to runPipeline rather than re-deriving the program.
    const stripTs = (s: string) =>
      s.replace(/\(GENERATED:[^)]*\)/g, "(GENERATED)").replace(/\d{4}-\d\d-\d\dT[\d:.]+Z?/g, "<TS>").trim();
    const direct = turningPrintToProgramEngine.runPipeline(part() as never);
    const spine = latheOrchestrationEngine.calculate("generate", part());
    expect(direct.success).toBe(true);
    expect(direct.program_text.trim().length).toBeGreaterThan(0);
    expect(stripTs(spine.program_text)).toBe(stripTs(direct.program_text));
  });

  it("FAIL-CLOSED: a runPipeline emission block BLOCKS the spine (no program ships)", () => {
    // Force the verified Okuma post to fail-to-map (the genuine null-return fail-close condition --
    // same technique as turning-okuma-fallback-failclosed.test.ts).
    vi.spyOn(
      turningPrintToProgramEngine as unknown as { emitViaOkumaPost: () => unknown },
      "emitViaOkumaPost",
    ).mockReturnValue(null);
    const r = latheOrchestrationEngine.calculate("generate", part());
    expect(r.success).toBe(false);
    expect(r.safety_passed).toBe(false);
    expect(r.safety_blocks.some((b: string) => /GCODE_GENERATE/.test(b))).toBe(true);
    expect(r.program_text).toContain("SAFETY BLOCK");
    // no real program leaked through the block
    expect(/\bT0101\b/.test(r.program_text)).toBe(false);
  });
});
