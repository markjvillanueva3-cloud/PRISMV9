/**
 * Round-trip dispatcher wiring tests for WEDM-WIRE-MS0/Batch7:
 *   U-WWB16: wedm_job_cost_calc        → WEDMJobCostEngine.calculateJobCost
 *   U-WWB17: wedm_job_create           → WEDMJobCreatorEngine.createJob (static, 3-arg)
 *   U-WWB18: wedm_job_outcome_record   → WEDMJobOutcomeEngine.recordOutcome (input: unknown)
 *
 * Notable variations:
 *   - WWB17 calls a static method via singleton-as-class-alias
 *   - WWB18 takes `unknown` (engine validates internally) — case body validates !== undefined/null
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const DISPATCHER_PATH = join(process.cwd(), "src/tools/dispatchers/camDispatcher.ts");
const SCHEMA_PATH = join(process.cwd(), "src/schemas/camActionSchemas.ts");

describe("WEDM-WIRE-MS0/Batch7 — action enum membership", () => {
  it("camDispatcher ACTIONS array includes the 3 new actions", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('"wedm_job_cost_calc"');
    expect(src).toContain('"wedm_job_create"');
    expect(src).toContain('"wedm_job_outcome_record"');
  });

  it("the WEDM-WIRE-MS0/Batch7 milestone tag is present in the enum block", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain("WEDM-WIRE-MS0/Batch7: job cost + job creator + job outcome record");
  });
});

describe("U-WWB16 — wedm_job_cost_calc wiring", () => {
  it("dispatcher case lazy-imports WEDMJobCostEngine and calls calculateJobCost", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "wedm_job_cost_calc"');
    expect(src).toContain("WEDMJobCostEngine.js");
    expect(src).toContain("wedmJobCostEngine.calculateJobCost");
  });

  it("case handler validates input param AND wraps engine call in try/catch", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "wedm_job_cost_calc"[\s\S]{0,800}input required \(JobCostInput\)/);
    expect(src).toMatch(/case "wedm_job_cost_calc"[\s\S]{0,800}try\s*\{[\s\S]{0,400}catch\s*\(err\)/);
    expect(src).toMatch(/case "wedm_job_cost_calc"[\s\S]{0,800}\(err as Error\)\.message/);
  });

  it("schema map exposes wedm_job_cost_calc with input:record", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("wedm_job_cost_calc:");
    expect(src).toMatch(/wedm_job_cost_calc:\s*z\.object\(\{[\s\S]{0,400}input:\s*z\.record\(z\.string\(\),\s*z\.unknown\(\)\)/);
  });

  it("engine source: WEDMJobCostEngine exports the singleton + calculateJobCost method", () => {
    const enginePath = join(process.cwd(), "src/engines/WEDMJobCostEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const wedmJobCostEngine\s*=\s*new WEDMJobCostEngine\(\)/);
    expect(src).toMatch(/calculateJobCost\(\s*input:\s*JobCostInput\s*\):\s*JobCostResult/);
  });
});

describe("U-WWB17 — wedm_job_create wiring (static, 3-arg)", () => {
  it("dispatcher case lazy-imports WEDMJobCreatorEngine and calls createJob", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "wedm_job_create"');
    expect(src).toContain("WEDMJobCreatorEngine.js");
    expect(src).toContain("wedmJobCreatorEngine.createJob");
  });

  it("case handler validates program AND wraps engine call in try/catch (forwards optional options/quote)", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "wedm_job_create"[\s\S]{0,1500}program required \(WEDMProgramResult\)/);
    expect(src).toMatch(/case "wedm_job_create"[\s\S]{0,1500}options/);
    expect(src).toMatch(/case "wedm_job_create"[\s\S]{0,1500}quote/);
    expect(src).toMatch(/case "wedm_job_create"[\s\S]{0,1500}try\s*\{[\s\S]{0,800}catch\s*\(err\)/);
  });

  it("schema map exposes wedm_job_create with program + optional options + optional quote", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("wedm_job_create:");
    expect(src).toMatch(/wedm_job_create:\s*z\.object\(\{[\s\S]{0,800}program:\s*z\.record\(z\.string\(\),\s*z\.unknown\(\)\)/);
    expect(src).toMatch(/wedm_job_create:\s*z\.object\(\{[\s\S]{0,800}options:\s*z\.record\(z\.string\(\),\s*z\.unknown\(\)\)\.optional/);
    expect(src).toMatch(/wedm_job_create:\s*z\.object\(\{[\s\S]{0,1200}quote:\s*z\.record\(z\.string\(\),\s*z\.unknown\(\)\)\.optional/);
  });

  it("engine source: alias points at class with static createJob()", () => {
    const enginePath = join(process.cwd(), "src/engines/WEDMJobCreatorEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const wedmJobCreatorEngine\s*=\s*WEDMJobCreatorEngine/);
    expect(src).toMatch(/static\s+createJob\(/);
  });
});

describe("U-WWB18 — wedm_job_outcome_record wiring (unknown input)", () => {
  it("dispatcher case lazy-imports WEDMJobOutcomeEngine and calls recordOutcome", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "wedm_job_outcome_record"');
    expect(src).toContain("WEDMJobOutcomeEngine.js");
    expect(src).toContain("wedmJobOutcomeEngine.recordOutcome");
  });

  it("case handler rejects undefined/null input AND wraps engine call in try/catch", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "wedm_job_outcome_record"[\s\S]{0,800}input === undefined/);
    expect(src).toMatch(/case "wedm_job_outcome_record"[\s\S]{0,800}input required \(job outcome record\)/);
    expect(src).toMatch(/case "wedm_job_outcome_record"[\s\S]{0,800}try\s*\{[\s\S]{0,400}catch\s*\(err\)/);
  });

  it("schema map exposes wedm_job_outcome_record with input:z.unknown() (engine validates internally)", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("wedm_job_outcome_record:");
    expect(src).toMatch(/wedm_job_outcome_record:\s*z\.object\(\{[\s\S]{0,400}input:\s*z\.unknown\(\)/);
  });

  it("engine source: WEDMJobOutcomeEngine exports the singleton + recordOutcome method (input: unknown)", () => {
    const enginePath = join(process.cwd(), "src/engines/WEDMJobOutcomeEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const wedmJobOutcomeEngine\s*=\s*new WEDMJobOutcomeEngine\(\)/);
    expect(src).toMatch(/recordOutcome\(\s*input:\s*unknown\s*\):\s*IngestResult/);
  });
});
