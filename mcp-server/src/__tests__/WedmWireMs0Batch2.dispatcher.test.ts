/**
 * Round-trip dispatcher wiring tests for WEDM-WIRE-MS0/Batch2:
 *   U-WWB01: wedm_wire_break_risk        → WEDMWireBreakRiskCostEngine.calculate
 *   U-WWB02: wedm_setup_sheet_generate   → generateSetupSheet (functional, no singleton)
 *   U-WWB03: wedm_job_pattern_learn      → WEDMJobPatternLearnerEngine.learn
 *
 * Same text-grep pattern as Batch1. Note: U-WWB02 wires a FUNCTIONAL
 * export (generateSetupSheet) rather than a singleton method — the
 * engine module is structured as functions + types rather than a class.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const DISPATCHER_PATH = join(process.cwd(), "src/tools/dispatchers/camDispatcher.ts");
const SCHEMA_PATH = join(process.cwd(), "src/schemas/camActionSchemas.ts");

describe("WEDM-WIRE-MS0/Batch2 — action enum membership", () => {
  it("camDispatcher ACTIONS array includes the 3 new actions", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('"wedm_wire_break_risk"');
    expect(src).toContain('"wedm_setup_sheet_generate"');
    expect(src).toContain('"wedm_job_pattern_learn"');
  });

  it("the WEDM-WIRE-MS0/Batch2 milestone tag is present in the enum block", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain("WEDM-WIRE-MS0/Batch2: wire-break risk + setup sheet + job-pattern learner");
  });
});

describe("U-WWB01 — wedm_wire_break_risk wiring", () => {
  it("dispatcher case lazy-imports WEDMWireBreakRiskCostEngine and calls calculate", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "wedm_wire_break_risk"');
    expect(src).toContain("WEDMWireBreakRiskCostEngine.js");
    expect(src).toContain("wedmWireBreakRiskCostEngine.calculate");
  });

  it("case handler wraps the engine call in try/catch surfacing error.message", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "wedm_wire_break_risk"[\s\S]{0,500}try\s*\{[\s\S]{0,300}catch\s*\(err\)/);
    expect(src).toMatch(/case "wedm_wire_break_risk"[\s\S]{0,500}\(err as Error\)\.message/);
  });

  it("schema map exposes wedm_wire_break_risk with passthrough+describe", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("wedm_wire_break_risk:");
    expect(src).toMatch(/wedm_wire_break_risk:\s*z\.object\(\{\}\)\.passthrough\(\)\.describe/);
  });

  it("engine source: WEDMWireBreakRiskCostEngine exports the singleton + calculate method", () => {
    const enginePath = join(process.cwd(), "src/engines/WEDMWireBreakRiskCostEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const wedmWireBreakRiskCostEngine\s*=\s*new WEDMWireBreakRiskCostEngine\(\)/);
    expect(src).toMatch(/calculate\(\s*input:\s*WireBreakRiskInput\s*\):\s*WireBreakRiskResult/);
  });
});

describe("U-WWB02 — wedm_setup_sheet_generate wiring (functional, no singleton)", () => {
  it("dispatcher case lazy-imports the FUNCTION generateSetupSheet (not a singleton)", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "wedm_setup_sheet_generate"');
    expect(src).toContain("WEDMSetupSheetEngine.js");
    // Distinct from singleton imports — must import the named function, not a singleton
    expect(src).toMatch(/import\("\.\.\/\.\.\/engines\/WEDMSetupSheetEngine\.js"\)\s*;[\s\S]{0,400}generateSetupSheet/);
  });

  it("case handler validates program_result + passes hardness_hrc default 60", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "wedm_setup_sheet_generate"[\s\S]{0,800}program_result required/);
    expect(src).toMatch(/case "wedm_setup_sheet_generate"[\s\S]{0,800}hardness_hrc[\s\S]{0,80}\?\?\s*60/);
    expect(src).toMatch(/case "wedm_setup_sheet_generate"[\s\S]{0,800}generateSetupSheet\(/);
  });

  it("schema map exposes wedm_setup_sheet_generate with program_result + optional hardness_hrc", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("wedm_setup_sheet_generate:");
    expect(src).toMatch(/wedm_setup_sheet_generate:\s*z\.object\(\{[\s\S]{0,500}program_result:\s*z\.record\(z\.string\(\),\s*z\.unknown\(\)\)/);
    expect(src).toMatch(/wedm_setup_sheet_generate:\s*z\.object\(\{[\s\S]{0,600}hardness_hrc:\s*z\.number\(\)\.min\(0\)\.max\(80\)\.optional/);
  });

  it("engine source: WEDMSetupSheetEngine exports the function generateSetupSheet (NOT a singleton)", () => {
    const enginePath = join(process.cwd(), "src/engines/WEDMSetupSheetEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export function generateSetupSheet\(\s*result:\s*WEDMProgramResult/);
    // Confirm there's NO singleton (this is what makes U-WWB02 unique)
    expect(src).not.toMatch(/export const wedmSetupSheetEngine\s*=\s*new/);
  });
});

describe("U-WWB03 — wedm_job_pattern_learn wiring", () => {
  it("dispatcher case lazy-imports WEDMJobPatternLearnerEngine and calls learn", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "wedm_job_pattern_learn"');
    expect(src).toContain("WEDMJobPatternLearnerEngine.js");
    expect(src).toContain("wedmJobPatternLearnerEngine.learn");
  });

  it("case handler validates jobs is an array AND wraps engine call in try/catch", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "wedm_job_pattern_learn"[\s\S]{0,800}jobs array required/);
    expect(src).toMatch(/case "wedm_job_pattern_learn"[\s\S]{0,800}try\s*\{[\s\S]{0,400}catch\s*\(err\)/);
    expect(src).toMatch(/case "wedm_job_pattern_learn"[\s\S]{0,800}\(err as Error\)\.message/);
  });

  it("schema map exposes wedm_job_pattern_learn with jobs:array(≥1)", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("wedm_job_pattern_learn:");
    expect(src).toMatch(/wedm_job_pattern_learn:\s*z\.object\(\{[\s\S]{0,400}jobs:\s*z\.array\(z\.record\(z\.string\(\),\s*z\.unknown\(\)\)\)\.min\(1\)/);
  });

  it("engine source: WEDMJobPatternLearnerEngine exports the singleton + learn method", () => {
    const enginePath = join(process.cwd(), "src/engines/WEDMJobPatternLearnerEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const wedmJobPatternLearnerEngine\s*=\s*new WEDMJobPatternLearnerEngine\(\)/);
    expect(src).toMatch(/learn\(\s*jobs:\s*JobRecord\[\]\s*\):\s*PatternLearnerResult/);
  });
});
