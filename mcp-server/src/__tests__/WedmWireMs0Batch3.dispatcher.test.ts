/**
 * Round-trip dispatcher wiring tests for WEDM-WIRE-MS0/Batch3:
 *   U-WWB04: wedm_corner_analyze            → WEDMCornerPhysicsEngine.analyzeCorner
 *   U-WWB05: wedm_dielectric_correct        → WEDMDielectricCorrectionEngine.calculateCorrectedGap
 *   U-WWB06: wedm_current_density_validate  → WEDMCurrentDensityGuardEngine.validate
 *
 * Same text-grep pattern as Batch1/Batch2 (no zod runtime in worktree).
 * All three engines expose clean single-arg input methods with branded
 * input types (CornerAnalysisInput, DielectricCorrectionInput, CurrentDensityInput).
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const DISPATCHER_PATH = join(process.cwd(), "src/tools/dispatchers/camDispatcher.ts");
const SCHEMA_PATH = join(process.cwd(), "src/schemas/camActionSchemas.ts");

describe("WEDM-WIRE-MS0/Batch3 — action enum membership", () => {
  it("camDispatcher ACTIONS array includes the 3 new actions", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('"wedm_corner_analyze"');
    expect(src).toContain('"wedm_dielectric_correct"');
    expect(src).toContain('"wedm_current_density_validate"');
  });

  it("the WEDM-WIRE-MS0/Batch3 milestone tag is present in the enum block", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain("WEDM-WIRE-MS0/Batch3: corner physics + dielectric correction + current density guard");
  });
});

describe("U-WWB04 — wedm_corner_analyze wiring", () => {
  it("dispatcher case lazy-imports WEDMCornerPhysicsEngine and calls analyzeCorner", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "wedm_corner_analyze"');
    expect(src).toContain("WEDMCornerPhysicsEngine.js");
    expect(src).toContain("wedmCornerPhysicsEngine.analyzeCorner");
  });

  it("case handler validates input param AND wraps engine call in try/catch", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "wedm_corner_analyze"[\s\S]{0,800}input required \(CornerAnalysisInput\)/);
    expect(src).toMatch(/case "wedm_corner_analyze"[\s\S]{0,800}try\s*\{[\s\S]{0,400}catch\s*\(err\)/);
    expect(src).toMatch(/case "wedm_corner_analyze"[\s\S]{0,800}\(err as Error\)\.message/);
  });

  it("schema map exposes wedm_corner_analyze with input:record", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("wedm_corner_analyze:");
    expect(src).toMatch(/wedm_corner_analyze:\s*z\.object\(\{[\s\S]{0,400}input:\s*z\.record\(z\.string\(\),\s*z\.unknown\(\)\)/);
  });

  it("engine source: WEDMCornerPhysicsEngine exports the singleton + analyzeCorner method", () => {
    const enginePath = join(process.cwd(), "src/engines/WEDMCornerPhysicsEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const wedmCornerPhysicsEngine\s*=\s*new WEDMCornerPhysicsEngine\(\)/);
    expect(src).toMatch(/analyzeCorner\(\s*input:\s*CornerAnalysisInput\s*\):\s*CornerRecommendation/);
  });
});

describe("U-WWB05 — wedm_dielectric_correct wiring", () => {
  it("dispatcher case lazy-imports WEDMDielectricCorrectionEngine and calls calculateCorrectedGap", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "wedm_dielectric_correct"');
    expect(src).toContain("WEDMDielectricCorrectionEngine.js");
    expect(src).toContain("wedmDielectricCorrectionEngine.calculateCorrectedGap");
  });

  it("case handler validates input param AND wraps engine call in try/catch", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "wedm_dielectric_correct"[\s\S]{0,800}input required \(DielectricCorrectionInput\)/);
    expect(src).toMatch(/case "wedm_dielectric_correct"[\s\S]{0,800}try\s*\{[\s\S]{0,400}catch\s*\(err\)/);
    expect(src).toMatch(/case "wedm_dielectric_correct"[\s\S]{0,800}\(err as Error\)\.message/);
  });

  it("schema map exposes wedm_dielectric_correct with input:record", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("wedm_dielectric_correct:");
    expect(src).toMatch(/wedm_dielectric_correct:\s*z\.object\(\{[\s\S]{0,400}input:\s*z\.record\(z\.string\(\),\s*z\.unknown\(\)\)/);
  });

  it("engine source: WEDMDielectricCorrectionEngine exports the singleton + calculateCorrectedGap method", () => {
    const enginePath = join(process.cwd(), "src/engines/WEDMDielectricCorrectionEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const wedmDielectricCorrectionEngine\s*=\s*new WEDMDielectricCorrectionEngine\(\)/);
    expect(src).toMatch(/calculateCorrectedGap\(\s*input:\s*DielectricCorrectionInput\s*\):\s*DielectricCorrectionResult/);
  });
});

describe("U-WWB06 — wedm_current_density_validate wiring", () => {
  it("dispatcher case lazy-imports WEDMCurrentDensityGuardEngine and calls validate", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "wedm_current_density_validate"');
    expect(src).toContain("WEDMCurrentDensityGuardEngine.js");
    expect(src).toContain("wedmCurrentDensityGuardEngine.validate");
  });

  it("case handler validates input param AND wraps engine call in try/catch", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "wedm_current_density_validate"[\s\S]{0,800}input required \(CurrentDensityInput\)/);
    expect(src).toMatch(/case "wedm_current_density_validate"[\s\S]{0,800}try\s*\{[\s\S]{0,400}catch\s*\(err\)/);
    expect(src).toMatch(/case "wedm_current_density_validate"[\s\S]{0,800}\(err as Error\)\.message/);
  });

  it("schema map exposes wedm_current_density_validate with input:record", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("wedm_current_density_validate:");
    expect(src).toMatch(/wedm_current_density_validate:\s*z\.object\(\{[\s\S]{0,400}input:\s*z\.record\(z\.string\(\),\s*z\.unknown\(\)\)/);
  });

  it("engine source: WEDMCurrentDensityGuardEngine exports the singleton + validate method", () => {
    const enginePath = join(process.cwd(), "src/engines/WEDMCurrentDensityGuardEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const wedmCurrentDensityGuardEngine\s*=\s*new WEDMCurrentDensityGuardEngine\(\)/);
    expect(src).toMatch(/validate\(\s*input:\s*CurrentDensityInput\s*\):\s*CurrentDensityResult/);
  });
});
