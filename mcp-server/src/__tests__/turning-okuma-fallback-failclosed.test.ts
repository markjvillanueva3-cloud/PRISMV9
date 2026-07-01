/**
 * turning-okuma-fallback-failclosed.test.ts -- slot:whiskey (Lathe Wizard, gap-sweep fills G02)
 * ============================================================================
 * G02 (P0 fail-open, from LATHE-WIZARD-GAP-INVENTORY-2026-06-29): when the VERIFIED Okuma OSP post
 * could not run for an Okuma-TARGET program, runPipeline fell back to the generic generateGCode (Fanuc
 * dialect: G71/G72/G75/G76 + T0101 + M30) and shipped it with only a `warning`. On the JM fleet (100%
 * Okuma OSP) that Fanuc program ALARMS / mis-cycles on the control (G71 = THREADING on OSP). The fix
 * makes the Okuma-fallback FAIL-CLOSED: a post failure pushes a `critical` warning so canEmitProgram
 * suppresses emission -- never auto-ship a Fanuc program to an OSP machine. A genuine Fanuc/Haas target
 * is unaffected (the non-Okuma branch still legitimately uses the Fanuc emitter).
 *
 * Intent (R9): Okuma post fails -> emission BLOCKED (no Fanuc ships); a real Fanuc machine still emits.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { turningPrintToProgramEngine } from "../engines/TurningPrintToProgramEngine.js";

type PipeIn = Parameters<typeof turningPrintToProgramEngine.runPipeline>[0];

const okumaPart = () => ({
  part_number: "OKUMA-FALLBACK",
  material: { material_name: "1018", iso_group: "P" as const },
  bar_stock_od_mm: 40,
  part_length_mm: 80,
  features: [
    { id: "f1", type: "od_turn" as const, od_mm: 30, length_mm: 60, position_z_mm: 0,
      x_start_mm: 40, x_end_mm: 30, z_start_mm: 0, z_end_mm: -60 },
  ],
  controller: "okuma",
  machine_model: "Okuma LB3000",
});
const run = (i: unknown) => turningPrintToProgramEngine.runPipeline(i as PipeIn);

describe("G02 -- Okuma post-failure is FAIL-CLOSED (no Fanuc fallback ships to an OSP machine)", () => {
  afterEach(() => vi.restoreAllMocks());

  it("when the Okuma post mapping returns null, emission is BLOCKED with a critical warning", () => {
    // Force the verified Okuma post to "fail to map" (the genuine null-return condition).
    vi.spyOn(turningPrintToProgramEngine as unknown as { emitViaOkumaPost: () => unknown }, "emitViaOkumaPost")
      .mockReturnValue(null);
    const r = run(okumaPart());
    const crit = r.warnings.find((w) => w.stage === "post_processor" && w.severity === "critical" && /BLOCKED/.test(w.message));
    expect(crit).toBeTruthy();
    expect(r.success).toBe(false);          // emission suppressed
    expect(r.program_text).toBe("");        // no Fanuc program emitted
  });

  it("the blocked program does NOT ship a Fanuc-dialect fallback (no G72/G75/G76 reaches output)", () => {
    vi.spyOn(turningPrintToProgramEngine as unknown as { emitViaOkumaPost: () => unknown }, "emitViaOkumaPost")
      .mockReturnValue({ text: "", warnings: [], skipped: 0 });
    const r = run(okumaPart());
    expect(r.success).toBe(false);
    expect(r.program_text).toBe("");        // empty -> trivially no Fanuc codes shipped
  });

  it("HAPPY PATH: a normal Okuma part still emits through the OSP post (no over-block)", () => {
    const r = run(okumaPart());
    expect(r.success).toBe(true);
    expect(r.program_text.length).toBeGreaterThan(0);
    expect(r.postprocessor_applied).toBe(true); // the OSP post ran
  });

  it("NO OVER-BLOCK: a genuine non-Okuma (Fanuc/Haas) target still emits via the generic emitter", () => {
    const r = run({
      part_number: "HAAS-PART",
      material: { material_name: "1018", iso_group: "P" as const },
      bar_stock_od_mm: 40, part_length_mm: 80,
      features: [
        { id: "f1", type: "od_turn" as const, od_mm: 30, length_mm: 60, position_z_mm: 0,
          x_start_mm: 40, x_end_mm: 30, z_start_mm: 0, z_end_mm: -60 },
      ],
      controller: "fanuc",
      machine_brand: "Haas",
      machine_model: "Haas ST-20",
    } as unknown as PipeIn);
    expect(r.success).toBe(true);
    expect(r.program_text.length).toBeGreaterThan(0);
    expect(r.postprocessor_applied).toBeFalsy(); // generic emitter, not the OSP post
  });
});
