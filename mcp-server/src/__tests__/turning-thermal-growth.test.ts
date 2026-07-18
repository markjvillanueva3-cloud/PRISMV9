/**
 * turning-thermal-growth.test.ts -- slot:whiskey (Lathe Wizard, U-LW-05 thermal-growth compensation)
 * ============================================================================
 * A hot workpiece is oversize by its diametral thermal growth dD = alpha(ISO) * D * dT; cutting to
 * (D - dD) WHILE HOT lands on nominal once it cools. The lever is DEFAULT-OFF + OPERATOR-GATED: it fires
 * only when input.enable_thermal_growth_comp is true AND an explicit thermal_delta_t_c is supplied.
 *
 * Intent (R9): CTE is canonical (constants.ts, never inline); the offset is applied with the correct
 * SIGN (cut smaller when hot, never larger); it is bounded (a runaway dT is clamped, fail-safe); and it
 * NEVER fires by default or on a missing/invalid delta_T (no fabricated temperature).
 */
import { describe, it, expect } from "vitest";
import { latheOrchestrationEngine, type LatheOrchestrationInput } from "../engines/LatheOrchestrationEngine.js";
import { getCTEByISO, CTE_LINEAR_BY_ISO } from "../physics/constants.js";

const partOD = 45;
const baseInput = (over: Record<string, unknown> = {}): LatheOrchestrationInput =>
  ({
    part_number: "THERMAL", material: { material_name: "AISI 4140", iso_group: "P" as const },
    bar_stock_od_mm: 50, part_length_mm: 60, finished_od_mm: partOD,
    features: [
      { id: "f1", type: "face", length_mm: 0 },
      { id: "f2", type: "od_straight", od_mm: partOD, length_mm: 40, required_operations: ["od_rough", "od_finish"] },
    ],
    controller: "okuma", machine_model: "Okuma LB3000",
    ...over,
  }) as unknown as LatheOrchestrationInput;

const prog = (over: Record<string, unknown> = {}): string =>
  latheOrchestrationEngine.calculate("lathe_orchestrate", baseInput(over)).program_text;

// All X-diameter tokens near the finished OD (excludes bar approaches at 52/55, rapids, etc.).
const finishXsNear = (program: string, target: number, tol = 1.0): number[] =>
  [...program.matchAll(/\bX(-?\d+\.?\d*)/g)]
    .map((m) => parseFloat(m[1]))
    .filter((v) => Number.isFinite(v) && Math.abs(v - target) <= tol);

// Strip parenthetical comments (which carry a per-run timestamp) so two programs can be compared for
// G-code equality. Thermal comp changes only emitted X diameters (G-code), never comment text.
const codeOnly = (program: string): string =>
  program.split("\n").map((l) => l.replace(/\([^)]*\)/g, "").trimEnd()).join("\n");

describe("U-LW-05 -- workpiece thermal-growth compensation (default-OFF, operator-gated)", () => {
  it("CTE constants are canonical ISO-keyed values (reference values, never inlined)", () => {
    expect(getCTEByISO("P")).toBeCloseTo(11.7e-6, 12); // carbon/alloy steel
    expect(getCTEByISO("N")).toBeCloseTo(23.1e-6, 12); // aluminum
    expect(getCTEByISO("M")).toBeCloseTo(16.0e-6, 12); // austenitic stainless
    expect(CTE_LINEAR_BY_ISO.K).toBeCloseTo(10.5e-6, 12);
    expect(getCTEByISO("Z")).toBe(getCTEByISO("P")); // unknown group -> steel default
    expect(getCTEByISO(undefined)).toBe(getCTEByISO("P"));
  });

  it("DEFAULT OFF: no thermal flag -> G-code unchanged from the plain part", () => {
    expect(codeOnly(prog())).toBe(codeOnly(prog())); // deterministic G-code baseline
    expect(codeOnly(prog({ enable_thermal_growth_comp: false, thermal_delta_t_c: 100 }))).toBe(codeOnly(prog()));
  });

  it("FAIL-SAFE: enabled but no delta_T -> zero offset (never fabricates a temperature)", () => {
    expect(codeOnly(prog({ enable_thermal_growth_comp: true }))).toBe(codeOnly(prog()));
  });

  it("FAIL-SAFE: enabled with a non-positive / NaN delta_T -> zero offset", () => {
    expect(codeOnly(prog({ enable_thermal_growth_comp: true, thermal_delta_t_c: 0 }))).toBe(codeOnly(prog()));
    expect(codeOnly(prog({ enable_thermal_growth_comp: true, thermal_delta_t_c: -40 }))).toBe(codeOnly(prog()));
    expect(codeOnly(prog({ enable_thermal_growth_comp: true, thermal_delta_t_c: NaN }))).toBe(codeOnly(prog()));
  });

  it("FIRES + CORRECT SIGN: enabled with a real delta_T cuts the finish diameter SMALLER (never larger)", () => {
    const off = prog();
    const on = prog({ enable_thermal_growth_comp: true, thermal_delta_t_c: 40 });
    expect(codeOnly(on)).not.toBe(codeOnly(off)); // the compensation changed the emitted G-code
    const offX = Math.min(...finishXsNear(off, partOD));
    const onX = Math.min(...finishXsNear(on, partOD));
    expect(onX).toBeLessThan(offX);            // hot part cut SMALLER (correct direction)
    // reference value: dD = alpha_P * D * dT = 11.7e-6 * 45 * 40 = 0.02106 mm (below the 0.05 cap)
    const expectedDD = 11.7e-6 * partOD * 40;
    expect(offX - onX).toBeCloseTo(expectedDD, 3);
  });

  it("ADVERSARIAL: a runaway delta_T is CLAMPED to the cap (fail-safe under-compensation, not scrap)", () => {
    const off = prog();
    const on = prog({ enable_thermal_growth_comp: true, thermal_delta_t_c: 5000 });
    const offX = Math.min(...finishXsNear(off, partOD));
    const onX = Math.min(...finishXsNear(on, partOD));
    const shift = offX - onX;
    expect(shift).toBeGreaterThan(0);           // still compensates (smaller)
    expect(shift).toBeLessThanOrEqual(0.05 + 1e-9); // bounded by THERMAL_MAX_OFFSET_MM (never the raw ~11mm)
    expect(shift).toBeCloseTo(0.05, 6);         // clamped exactly to the cap
  });

  it("MATERIAL-SENSITIVE: aluminum (higher CTE) compensates more than steel at the same delta_T", () => {
    const steel = prog({ enable_thermal_growth_comp: true, thermal_delta_t_c: 20 });
    const alu = prog({ material: { material_name: "6061", iso_group: "N" }, enable_thermal_growth_comp: true, thermal_delta_t_c: 20 });
    const base = prog();
    const baseAlu = prog({ material: { material_name: "6061", iso_group: "N" } });
    const steelShift = Math.min(...finishXsNear(base, partOD)) - Math.min(...finishXsNear(steel, partOD));
    const aluShift = Math.min(...finishXsNear(baseAlu, partOD)) - Math.min(...finishXsNear(alu, partOD));
    expect(aluShift).toBeGreaterThan(steelShift); // alpha_N (23.1e-6) > alpha_P (11.7e-6)
  });
});
