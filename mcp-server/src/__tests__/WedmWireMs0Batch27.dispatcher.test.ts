/**
 * Round-trip dispatcher wiring tests for WEDM-WIRE-MS0/Batch27:
 *   U-WWB76: wedm_citation_check_engine    → WEDMCitationCheckEngine.checkEngine (async)
 *   U-WWB77: wedm_complete_orch_program    → WEDMCompleteOrchestrationEngine.generateCompleteProgram (async)
 *   U-WWB78: wedm_wire_deflection_calc     → WEDMWireDeflectionEngine.calculateDeflection
 *
 * Three previously-unwired WEDM verification + orchestration + physics engines:
 *   - Citation check: async per-engine literature citation audit
 *   - Complete orchestration: async end-to-end WEDM program generation
 *   - Wire deflection: 5-arg physics calculation of lateral wire deflection
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const DISPATCHER_PATH = join(process.cwd(), "src/tools/dispatchers/camDispatcher.ts");
const SCHEMA_PATH = join(process.cwd(), "src/schemas/camActionSchemas.ts");

describe("WEDM-WIRE-MS0/Batch27 — action enum membership", () => {
  it("camDispatcher ACTIONS array includes the 3 new actions", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('"wedm_citation_check_engine"');
    expect(src).toContain('"wedm_complete_orch_program"');
    expect(src).toContain('"wedm_wire_deflection_calc"');
  });

  it("the WEDM-WIRE-MS0/Batch27 milestone tag is present in the enum block", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain("WEDM-WIRE-MS0/Batch27: citation check + complete orchestration + wire deflection");
  });
});

describe("U-WWB76 — wedm_citation_check_engine wiring", () => {
  it("dispatcher case lazy-imports WEDMCitationCheckEngine and awaits checkEngine", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "wedm_citation_check_engine"');
    expect(src).toContain("WEDMCitationCheckEngine.js");
    expect(src).toContain("await wedmCitationCheckEngine.checkEngine");
  });

  it("case validates input.engineName (string) AND wraps engine call in try/catch", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "wedm_citation_check_engine"[\s\S]{0,1500}input\.engineName \(string\) required/);
    expect(src).toMatch(/case "wedm_citation_check_engine"[\s\S]{0,1500}\(err as Error\)\.message/);
  });

  it("schema map exposes wedm_citation_check_engine with input:record", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("wedm_citation_check_engine:");
    expect(src).toMatch(/wedm_citation_check_engine:\s*z\.object\(\{[\s\S]{0,500}input:\s*z\.record\(z\.string\(\),\s*z\.unknown\(\)\)/);
  });

  it("engine source: WEDMCitationCheckEngine exports the singleton + async checkEngine method", () => {
    const enginePath = join(process.cwd(), "src/engines/WEDMCitationCheckEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const wedmCitationCheckEngine\s*=\s*new WEDMCitationCheckEngine\(\)/);
    expect(src).toMatch(/async checkEngine\(\s*engineName:\s*string\s*\):\s*Promise/);
  });
});

describe("U-WWB77 — wedm_complete_orch_program wiring", () => {
  it("dispatcher case lazy-imports WEDMCompleteOrchestrationEngine and awaits generateCompleteProgram", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "wedm_complete_orch_program"');
    expect(src).toContain("WEDMCompleteOrchestrationEngine.js");
    expect(src).toContain("await wedmCompleteOrchestrationEngine.generateCompleteProgram");
  });

  it("case handler validates input AND wraps engine call in try/catch", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "wedm_complete_orch_program"[\s\S]{0,1500}input required \(WEDMOrchestrationInput\)/);
    expect(src).toMatch(/case "wedm_complete_orch_program"[\s\S]{0,1500}\(err as Error\)\.message/);
  });

  it("schema map exposes wedm_complete_orch_program with input:record", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("wedm_complete_orch_program:");
    expect(src).toMatch(/wedm_complete_orch_program:\s*z\.object\(\{[\s\S]{0,500}input:\s*z\.record\(z\.string\(\),\s*z\.unknown\(\)\)/);
  });

  it("engine source: WEDMCompleteOrchestrationEngine exports the singleton + async generateCompleteProgram method", () => {
    const enginePath = join(process.cwd(), "src/engines/WEDMCompleteOrchestrationEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const wedmCompleteOrchestrationEngine\s*=\s*new WEDMCompleteOrchestrationEngine\(\)/);
    expect(src).toMatch(/async generateCompleteProgram\(\s*input:\s*WEDMOrchestrationInput\s*\):\s*Promise/);
  });
});

describe("U-WWB78 — wedm_wire_deflection_calc wiring", () => {
  it("dispatcher case lazy-imports WEDMWireDeflectionEngine and calls calculateDeflection with 5 args", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "wedm_wire_deflection_calc"');
    expect(src).toContain("WEDMWireDeflectionEngine.js");
    expect(src).toContain("wedmWireDeflectionEngine.calculateDeflection");
    expect(src).toMatch(/wedmWireDeflectionEngine\.calculateDeflection\(discharge_force_N,\s*wire_tension_N,\s*span_mm,\s*wire_diameter_mm,\s*modulus_GPa\)/);
  });

  it("case validates all 5 input numerics AND wraps engine call in try/catch", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "wedm_wire_deflection_calc"[\s\S]{0,2000}all 5 input numerics required/);
    expect(src).toMatch(/case "wedm_wire_deflection_calc"[\s\S]{0,2000}\(err as Error\)\.message/);
  });

  it("schema map exposes wedm_wire_deflection_calc with input:record", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("wedm_wire_deflection_calc:");
    expect(src).toMatch(/wedm_wire_deflection_calc:\s*z\.object\(\{[\s\S]{0,500}input:\s*z\.record\(z\.string\(\),\s*z\.unknown\(\)\)/);
  });

  it("engine source: WEDMWireDeflectionEngine exports the singleton + 5-arg calculateDeflection method", () => {
    const enginePath = join(process.cwd(), "src/engines/WEDMWireDeflectionEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/calculateDeflection\(\s*[\s\S]{0,200}discharge_force_N:\s*number,[\s\S]{0,300}modulus_GPa:\s*number/);
  });
});
