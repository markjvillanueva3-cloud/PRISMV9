/**
 * ProgramStructureEngine.test.ts -- non-finite safe_z guard (U-PP-NONFINITE-EMIT-SWEEP).
 *
 * A non-finite safe_z_mm would emit a literal `ZNaN`/`ZInfinity` retract the control
 * rejects (the `?? DEFAULT_SAFE_Z` idiom catches undefined, NOT NaN/Infinity). The
 * engine now source-guards safe_z to the known-safe DEFAULT_SAFE_Z (50mm) + warns --
 * a retract to a safe default is safe, and the one guard covers all 3 safeZ emit sites.
 */
import { describe, it, expect } from "vitest";
import {
  ProgramStructureEngine,
  programStructureEngine,
  type ProgramOperation,
  type ProgramStructureInput,
} from "../engines/ProgramStructureEngine.js";

describe("ProgramStructureEngine -- non-finite safe_z guard (U-PP-NONFINITE-EMIT-SWEEP)", () => {
  const engine = new ProgramStructureEngine();
  const makeOp = (): ProgramOperation => ({
    tool: { number: 1, diameter_mm: 12, length_mm: 50, description: "12MM ENDMILL" },
    algorithm_name: "ROUGH",
    gcode_blocks: ["G00 X0 Y0", "G01 Z-2 F100", "G01 X50"],
    spindle_rpm: 5000,
    coolant: "flood",
    type: "roughing",
  });
  const asm = (safe_z_mm?: number): ProgramStructureInput => ({ operations: [makeOp()], safe_z_mm });

  it("exports a singleton", () => {
    expect(programStructureEngine).toBeInstanceOf(ProgramStructureEngine);
  });

  it("[regression] a finite safe_z_mm emits the real retract with NO non-finite warning", () => {
    const r = engine.assemble(asm(25));
    expect(r.value.program).toMatch(/G00 Z25(\.0+)?\b/);
    expect(r.value.warnings.some((w) => w.includes("Non-finite safe_z"))).toBe(false);
  });

  it("NaN safe_z_mm defaults to the safe retract + warns -- no literal ZNaN", () => {
    const r = engine.assemble(asm(NaN));
    expect(r.value.program).not.toContain("ZNaN");
    expect(r.value.program).not.toContain("NaN");
    expect(r.value.warnings.some((w) => w.includes("Non-finite safe_z_mm"))).toBe(true);
    expect(r.value.program).toMatch(/Z50(\.0+)?\b/); // DEFAULT_SAFE_Z safe fallback
  });

  it("Infinity safe_z_mm defaults to the safe retract + warns -- no literal ZInfinity", () => {
    const r = engine.assemble(asm(Infinity));
    expect(r.value.program).not.toContain("ZInfinity");
    expect(r.value.program).not.toContain("Infinity");
    expect(r.value.warnings.some((w) => w.includes("Non-finite safe_z_mm"))).toBe(true);
  });

  it("-Infinity safe_z_mm is also defaulted (not just NaN)", () => {
    const r = engine.assemble(asm(-Infinity));
    expect(r.value.program).not.toContain("Infinity");
    expect(r.value.warnings.some((w) => w.includes("Non-finite safe_z_mm"))).toBe(true);
  });
});
