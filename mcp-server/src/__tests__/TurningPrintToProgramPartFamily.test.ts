/**
 * TurningPrintToProgramPartFamily.test.ts -- slot:whiskey (Kienzle Lathe Wizard)
 * ============================================================================
 * R9 wiring proof for U-W-WIRE-PART-FAMILY: the Kienzle print->program pipeline
 * (TurningPrintToProgramEngine.runPipeline) now classifies the incoming turned
 * part into one of LathePartClassifierEngine's 15 families and surfaces the
 * family-appropriate workholding + roughing cycle on the result (`part_family`)
 * + as an advisory warning. These tests verify the WIRING (the classifier was
 * built + dispatcher-wired but never consumed by the wizard) -- NOT the
 * classifier's internal taxonomy (that has its own engine test). Intent (R9):
 * a clear-geometry part flows through the wizard and comes back tagged with the
 * correct family + recommendation; the tag is ADDITIVE (never breaks emission).
 */
import { describe, it, expect } from "vitest";
import { turningPrintToProgramEngine } from "../engines/TurningPrintToProgramEngine.js";

type PipeIn = Parameters<typeof turningPrintToProgramEngine.runPipeline>[0];

/** A solid single-step OD part of the given OD/length (no bore). L/D drives the family. */
function odPart(odMm: number, lenMm: number) {
  return {
    part_number: "PF-TEST",
    material: { material_name: "1018", iso_group: "P" as const },
    bar_stock_od_mm: odMm,
    part_length_mm: lenMm,
    features: [
      { type: "od_turn" as const, x_start_mm: odMm, x_end_mm: odMm - 4, z_start_mm: 0, z_end_mm: -(lenMm * 0.6) },
    ],
    machine_model: "Haas ST-20",
  };
}

function run(input: ReturnType<typeof odPart>) {
  return turningPrintToProgramEngine.runPipeline(input as unknown as PipeIn);
}

describe("Kienzle wizard - part-family classification wiring", () => {
  it("a long slender solid bar (L/D=6) is classified as a 'shaft'", () => {
    const r = run(odPart(12, 72)); // L/D = 6.0
    expect(r.part_family?.family).toBe("shaft");
  });

  it("a very short solid disc (L/D~0.17) is classified as a 'disc' with the G72 facing roughing cycle", () => {
    const r = run(odPart(60, 10)); // L/D = 0.167
    expect(r.part_family?.family).toBe("disc");
    // disc geometry is face-dominant -> the family default is the G72 facing cycle (not the generic G71).
    expect(r.part_family?.recommended_roughing_cycle).toBe("G72");
  });

  it("the part_family record is fully structured (6 fields) with confidence in (0,1]", () => {
    const pf = run(odPart(12, 72)).part_family;
    expect(pf?.family).toBe("shaft");
    expect(typeof pf?.recommended_workholding).toBe("string");
    expect((pf?.recommended_workholding ?? "").length).toBeGreaterThan(0);
    expect(pf?.recommended_roughing_cycle).toBe("G71"); // shaft default roughing = cylindrical G71 stock removal
    // The family's recommended op-sequence template (the "pipeline" for this part family) is surfaced verbatim.
    expect(pf?.recommended_sequence).toEqual(["face", "center_drill", "rough_od", "finish_od", "groove", "thread", "part_off"]);
    expect((pf?.reasoning ?? "").length).toBeGreaterThan(0);
    expect(pf!.confidence).toBeGreaterThan(0);
    expect(pf!.confidence).toBeLessThanOrEqual(1);
  });

  it("surfaces the classification as an advisory 'Part family:' info warning (operator-visible)", () => {
    const r = run(odPart(12, 72));
    const pfWarn = r.warnings.find((w) => w.message.startsWith("Part family:"));
    expect(pfWarn?.severity).toBe("info"); // identification is informational, never a fabricated alarm
    expect(pfWarn?.message).toContain("shaft");
    expect(pfWarn?.message).toContain("Recommended op sequence:");
  });

  it("classification is ADDITIVE -- the program still emits + the result is otherwise intact", () => {
    const r = run(odPart(12, 72));
    // The new field must not have broken the core pipeline contract.
    expect(typeof r.success).toBe("boolean");
    expect(r.bar_stock_od_mm).toBe(12);
    expect(Array.isArray(r.operations)).toBe(true);
    expect(Array.isArray(r.warnings)).toBe(true);
  });

  it("the family reflects geometry: changing only L/D flips shaft<->disc (real signal, not a constant)", () => {
    // R9: a test that fails if the classifier were stubbed to a constant family.
    const shaft = run(odPart(12, 72)).part_family?.family; // L/D 6.0
    const disc = run(odPart(60, 10)).part_family?.family;   // L/D 0.167
    expect(shaft).toBe("shaft");
    expect(disc).toBe("disc");
    expect(shaft).not.toBe(disc);
  });

  it("flags a roughing-strategy gap: a disc roughed with OD ops (G71) gets a G72-facing advisory", () => {
    // The disc family recommends G72 facing; an od_turn-only plan emits G71 -> the plan-aware advisory fires.
    const r = run(odPart(60, 10)); // disc
    const roughWarn = r.warnings.find((w) => w.message.startsWith("Roughing strategy:") && w.message.includes("G72"));
    expect(roughWarn?.severity).toBe("warning");
    expect(roughWarn?.message).toContain("disc");
  });

  it("does NOT flag a roughing gap when the plan already emits the family-recommended cycle (shaft->G71)", () => {
    // Shaft recommends G71 and the od_rough plan emits G71 -> no false 'wrong cycle' advisory.
    const r = run(odPart(12, 72)); // shaft, recommended G71, emits G71
    const roughWarn = r.warnings.find((w) => w.message.startsWith("Roughing strategy:"));
    expect(roughWarn).toBeUndefined();
  });

  it("a mid-L/D valid part (1.97) still classifies via the geometry fallback (shaft), never throwing", () => {
    expect(() => run(odPart(25.4, 50))).not.toThrow();
    const r = run(odPart(25.4, 50)); // L/D = 1.97 -> fallback ld>1.5 -> shaft
    expect(r.part_family?.family).toBe("shaft");
  });
});
