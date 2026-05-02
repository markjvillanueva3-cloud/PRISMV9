/**
 * Round-trip dispatcher wiring tests for WEDM-WIRE-MS0/Batch11:
 *   U-WWB28: wedm_post_route                → WEDMPostDialectRouterEngine.route
 *   U-WWB29: wedm_power_density_validate    → WEDMPowerDensityGuardEngine.validate
 *   U-WWB30: wedm_program_compare           → WEDMProgramComparisonEngine.compare (3-arg, 2 strings + optional options)
 *
 * WWB30 has a 2-string + optional-options shape that mirrors LWB14
 * (lathe_post_dialect_compare). The engine accepts ComparisonTolerances
 * via options.tolerances (engine-internal default merged).
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const DISPATCHER_PATH = join(process.cwd(), "src/tools/dispatchers/camDispatcher.ts");
const SCHEMA_PATH = join(process.cwd(), "src/schemas/camActionSchemas.ts");

describe("WEDM-WIRE-MS0/Batch11 — action enum membership", () => {
  it("camDispatcher ACTIONS array includes the 3 new actions", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('"wedm_post_route"');
    expect(src).toContain('"wedm_power_density_validate"');
    expect(src).toContain('"wedm_program_compare"');
  });

  it("the WEDM-WIRE-MS0/Batch11 milestone tag is present in the enum block", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain("WEDM-WIRE-MS0/Batch11: post dialect route + power density guard + program compare");
  });
});

describe("U-WWB28 — wedm_post_route wiring", () => {
  it("dispatcher case lazy-imports WEDMPostDialectRouterEngine and calls route", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "wedm_post_route"');
    expect(src).toContain("WEDMPostDialectRouterEngine.js");
    expect(src).toContain("wedmPostDialectRouterEngine.route");
  });

  it("case handler validates input param AND wraps engine call in try/catch", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "wedm_post_route"[\s\S]{0,800}input required \(WEDMPostInput\)/);
    expect(src).toMatch(/case "wedm_post_route"[\s\S]{0,800}try\s*\{[\s\S]{0,400}catch\s*\(err\)/);
    expect(src).toMatch(/case "wedm_post_route"[\s\S]{0,800}\(err as Error\)\.message/);
  });

  it("schema map exposes wedm_post_route with input:record", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("wedm_post_route:");
    expect(src).toMatch(/wedm_post_route:\s*z\.object\(\{[\s\S]{0,400}input:\s*z\.record\(z\.string\(\),\s*z\.unknown\(\)\)/);
  });

  it("engine source: WEDMPostDialectRouterEngine exports the singleton + route method", () => {
    const enginePath = join(process.cwd(), "src/engines/WEDMPostDialectRouterEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const wedmPostDialectRouterEngine\s*=\s*new WEDMPostDialectRouterEngine\(\)/);
    expect(src).toMatch(/route\(\s*input:\s*WEDMPostInput\s*\):\s*WEDMPostOutput/);
  });
});

describe("U-WWB29 — wedm_power_density_validate wiring", () => {
  it("dispatcher case lazy-imports WEDMPowerDensityGuardEngine and calls validate", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "wedm_power_density_validate"');
    expect(src).toContain("WEDMPowerDensityGuardEngine.js");
    expect(src).toContain("wedmPowerDensityGuardEngine.validate");
  });

  it("case handler validates input param AND wraps engine call in try/catch", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "wedm_power_density_validate"[\s\S]{0,800}input required \(PowerDensityInput\)/);
    expect(src).toMatch(/case "wedm_power_density_validate"[\s\S]{0,800}try\s*\{[\s\S]{0,400}catch\s*\(err\)/);
    expect(src).toMatch(/case "wedm_power_density_validate"[\s\S]{0,800}\(err as Error\)\.message/);
  });

  it("schema map exposes wedm_power_density_validate with input:record", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("wedm_power_density_validate:");
    expect(src).toMatch(/wedm_power_density_validate:\s*z\.object\(\{[\s\S]{0,400}input:\s*z\.record\(z\.string\(\),\s*z\.unknown\(\)\)/);
  });

  it("engine source: WEDMPowerDensityGuardEngine exports the singleton + validate method", () => {
    const enginePath = join(process.cwd(), "src/engines/WEDMPowerDensityGuardEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const wedmPowerDensityGuardEngine\s*=\s*new WEDMPowerDensityGuardEngine\(\)/);
    expect(src).toMatch(/validate\(\s*input:\s*PowerDensityInput\s*\):\s*PowerDensityResult/);
  });
});

describe("U-WWB30 — wedm_program_compare wiring (2 strings + optional options)", () => {
  it("dispatcher case lazy-imports WEDMProgramComparisonEngine and calls compare", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "wedm_program_compare"');
    expect(src).toContain("WEDMProgramComparisonEngine.js");
    expect(src).toContain("wedmProgramComparisonEngine.compare");
  });

  it("case handler validates 2 string args AND forwards optional options AND wraps in try/catch", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "wedm_program_compare"[\s\S]{0,1500}reference_nc string required/);
    expect(src).toMatch(/case "wedm_program_compare"[\s\S]{0,1500}generated_nc string required/);
    expect(src).toMatch(/case "wedm_program_compare"[\s\S]{0,1500}options/);
    expect(src).toMatch(/case "wedm_program_compare"[\s\S]{0,1500}try\s*\{[\s\S]{0,500}catch\s*\(err\)/);
  });

  it("schema map exposes wedm_program_compare with 2 z.string() fields + optional options:record", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("wedm_program_compare:");
    expect(src).toMatch(/wedm_program_compare:\s*z\.object\(\{[\s\S]{0,800}reference_nc:\s*z\.string\(\)/);
    expect(src).toMatch(/wedm_program_compare:\s*z\.object\(\{[\s\S]{0,800}generated_nc:\s*z\.string\(\)/);
    expect(src).toMatch(/wedm_program_compare:\s*z\.object\(\{[\s\S]{0,1200}options:\s*z\.record\(z\.string\(\),\s*z\.unknown\(\)\)\.optional/);
  });

  it("engine source: WEDMProgramComparisonEngine exports the singleton + compare method", () => {
    const enginePath = join(process.cwd(), "src/engines/WEDMProgramComparisonEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const wedmProgramComparisonEngine\s*=\s*new WEDMProgramComparisonEngine\(\)/);
    expect(src).toMatch(/compare\(\s*reference_nc:\s*string\s*,\s*generated_nc:\s*string/);
  });
});
