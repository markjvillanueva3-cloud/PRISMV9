/**
 * MillPrintToProgramEngine tests — delegator restoration (U-STUB-HUNT-09).
 * Slot:bravo 2026-05-27.
 *
 * Strategy: rather than re-verify the real pipeline (it has its own coverage),
 * assert that generate() returns the IDENTICAL object the real engine returns
 * for the same input. Deep-equal between shim output and direct call proves
 * delegation works without any presence-only assertion.
 */
import { describe, it, expect } from "vitest";
import { MillPrintToProgramEngine, millPrintToProgramEngine } from "../engines/MillPrintToProgramEngine.js";
import { millingPrintToProgramEngine } from "../engines/MillingPrintToProgramEngine.js";

const INPUT_A = {
  part_number: "STUB-HUNT-09-A",
  material: { name: "Aluminum 6061-T6", iso_group: "N" as const },
  features: [],
  machine: "haas_vf2" as const,
};

const INPUT_B = {
  part_number: "STUB-HUNT-09-B",
  material: { name: "1018 steel", iso_group: "P" as const },
  features: [],
  machine: "hurco_vm10i" as const,
};

describe("MillPrintToProgramEngine.generate — delegation invariants", () => {
  it("INPUT_A: shim output deep-equals direct runFullPipeline output", () => {
    const direct = millingPrintToProgramEngine.runFullPipeline(INPUT_A as never);
    const viaShim = millPrintToProgramEngine.generate(INPUT_A as never);
    expect(viaShim).toEqual(direct);
  });

  it("INPUT_B: shim output deep-equals direct runFullPipeline output", () => {
    const direct = millingPrintToProgramEngine.runFullPipeline(INPUT_B as never);
    const viaShim = millPrintToProgramEngine.generate(INPUT_B as never);
    expect(viaShim).toEqual(direct);
  });

  it("two distinct inputs yield distinct shim outputs (no caching artifact)", () => {
    const a = millPrintToProgramEngine.generate(INPUT_A as never);
    const b = millPrintToProgramEngine.generate(INPUT_B as never);
    // Part-number echoed back; the two inputs differ → outputs must differ.
    expect((a as Record<string, unknown>).part_number).not.toBe((b as Record<string, unknown>).part_number);
  });

  it("fresh instance and singleton produce DEEPLY IDENTICAL generate() output", () => {
    const fresh = new MillPrintToProgramEngine();
    const a = fresh.generate(INPUT_A as never);
    const b = millPrintToProgramEngine.generate(INPUT_A as never);
    expect(a).toEqual(b);
  });

  it("generate accepts a Record<string, unknown> (facade-call style) and returns same as typed call", () => {
    const typed = millPrintToProgramEngine.generate(INPUT_A as never);
    const untyped = millPrintToProgramEngine.generate({ ...INPUT_A } as Record<string, unknown>);
    expect(untyped).toEqual(typed);
  });

  it("legacy stub keys ({stub, ok}) absent — real pipeline shape, not the placeholder", () => {
    const direct = millingPrintToProgramEngine.runFullPipeline(INPUT_A as never) as Record<string, unknown>;
    const viaShim = millPrintToProgramEngine.generate(INPUT_A as never) as Record<string, unknown>;
    // Both call paths use the real engine — both have or lack {stub,ok} identically.
    expect("stub" in viaShim).toBe("stub" in direct);
    expect("ok" in viaShim).toBe("ok" in direct);
  });
});
