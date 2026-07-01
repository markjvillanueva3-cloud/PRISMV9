/**
 * ThermalDerateToolLife.test.ts -- slot:whiskey (Kienzle Lathe Wizard)
 * ====================================================================
 * R9 for U-W-WIRE-THERMAL-TOOLLIFE (gap-to-100 physics factor 3/4): the wizard's
 * predicted tool life now folds in thermalDeratingFactor -- a long continuous cut
 * heats the edge and wears the tool faster than the room-temperature Taylor life
 * predicts, so the PREDICTED life is scaled DOWN (conservative / safe direction).
 * Two layers: (1) the exported thermalDeratingFactor physics invariants; (2) the
 * WIRING -- since Taylor life depends only on Vc (not cut length), an identical
 * OD part run short vs long isolates the derate, proving it is applied (not a no-op)
 * and time-driven. Never-soften: this only shortens tool life; it must not touch
 * force/power/Ra/safety (verified by the physics-reviewer gate on this change).
 */
import { describe, it, expect } from "vitest";
import { thermalDeratingFactor } from "../engines/MachiningKnowledgeBaseEngine.js";
import { turningPrintToProgramEngine } from "../engines/TurningPrintToProgramEngine.js";

type PipeIn = Parameters<typeof turningPrintToProgramEngine.runPipeline>[0];

describe("thermalDeratingFactor - physics invariants (factor 3/4)", () => {
  it("returns exactly 1.0 for a short continuous cut (<=10s) -- no derate", () => {
    expect(thermalDeratingFactor("P", 0)).toBe(1.0);
    expect(thermalDeratingFactor("P", 10)).toBe(1.0);
    expect(thermalDeratingFactor("S", 5)).toBe(1.0);
  });

  it("derates below 1.0 for a long cut (>10s), bounded by the 0.70 floor", () => {
    const p60 = thermalDeratingFactor("P", 60); // 1 - 0.002*50 = 0.90
    expect(p60).toBeCloseTo(0.90, 5);
    expect(p60).toBeLessThan(1.0);
    expect(p60).toBeGreaterThanOrEqual(0.70);
  });

  it("thermally-sensitive ISO-S derates MORE than low-sensitivity ISO-K at the same cut time", () => {
    const s30 = thermalDeratingFactor("S", 30); // 1 - 0.010*20 = 0.80
    const k30 = thermalDeratingFactor("K", 30); // 1 - 0.001*20 = 0.98
    expect(s30).toBeCloseTo(0.80, 5);
    expect(k30).toBeCloseTo(0.98, 5);
    expect(s30).toBeLessThan(k30);
  });

  it("never derates below the 0.70 floor, even for an extreme cut", () => {
    expect(thermalDeratingFactor("S", 100000)).toBe(0.70);
  });

  it("decreases monotonically with continuous cut time", () => {
    expect(thermalDeratingFactor("M", 120)).toBeLessThan(thermalDeratingFactor("M", 30));
  });
});

describe("thermal-derate WIRING -- wizard tool_life_min scales with continuous cut time", () => {
  // Same OD + material + op => same Vc => same RAW Taylor life; only the cut LENGTH (=> cut time =>
  // thermal derate) differs. ISO-S (superalloy) has the strongest thermal sensitivity for a clear signal.
  const sPart = (lenMm: number) => ({
    part_number: "THERM-TEST",
    material: { material_name: "Inconel 718", iso_group: "S" as const },
    bar_stock_od_mm: 25,
    part_length_mm: lenMm,
    features: [
      { type: "od_turn" as const, x_start_mm: 25, x_end_mm: 20, z_start_mm: 0, z_end_mm: -lenMm, length_mm: lenMm },
    ],
    machine_model: "Haas ST-20",
  });
  const roughLife = (lenMm: number): number | null => {
    const r = turningPrintToProgramEngine.runPipeline(sPart(lenMm) as unknown as PipeIn);
    const rough = r.operations.find((o) => o.operation_type.includes("rough"));
    const v = rough?.physics?.tool_life_min;
    return typeof v === "number" ? v : null;
  };

  it("a long continuous cut yields SHORTER predicted tool life than a short cut (same OD/material/Vc)", () => {
    const shortLife = roughLife(3);    // ~1s cut -> factor 1.0 (raw Taylor life)
    const longLife = roughLife(150);   // tens of seconds -> derated < raw
    expect(shortLife).not.toBeNull();
    expect(longLife).not.toBeNull();
    expect(longLife as number).toBeLessThan(shortLife as number);
  });

  it("the derate is conservative -- the long-cut life stays positive + finite (earlier change, not invalid)", () => {
    const longLife = roughLife(150);
    expect(longLife as number).toBeGreaterThan(0);
    expect(Number.isFinite(longLife as number)).toBe(true);
  });
});
