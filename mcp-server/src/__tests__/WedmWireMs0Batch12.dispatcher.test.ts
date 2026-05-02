/**
 * Round-trip dispatcher wiring tests for WEDM-WIRE-MS0/Batch12:
 *   U-WWB31: wedm_print_to_program  → WEDMPrintToProgramEngine.generate (ASYNC, awaits Promise<WEDMGenerateResult>)
 *   U-WWB32: wedm_overage_request   → WEDMOverageApprovalEngine.createRequest (static)
 *   U-WWB33: wedm_credit_cost_calc  → WEDMCreditCostEngine.calculate (static)
 *
 * WWB31 is the first ASYNC engine wired in this milestone — case body
 * uses `await` to forward the Promise. The other two are sync static
 * methods on singleton-as-class-alias engines.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const DISPATCHER_PATH = join(process.cwd(), "src/tools/dispatchers/camDispatcher.ts");
const SCHEMA_PATH = join(process.cwd(), "src/schemas/camActionSchemas.ts");

describe("WEDM-WIRE-MS0/Batch12 — action enum membership", () => {
  it("camDispatcher ACTIONS array includes the 3 new actions", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('"wedm_print_to_program"');
    expect(src).toContain('"wedm_overage_request"');
    expect(src).toContain('"wedm_credit_cost_calc"');
  });

  it("the WEDM-WIRE-MS0/Batch12 milestone tag is present in the enum block", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain("WEDM-WIRE-MS0/Batch12: print-to-program (async) + overage approval + credit cost");
  });
});

describe("U-WWB31 — wedm_print_to_program wiring (ASYNC)", () => {
  it("dispatcher case lazy-imports WEDMPrintToProgramEngine and AWAITS generate()", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "wedm_print_to_program"');
    expect(src).toContain("WEDMPrintToProgramEngine.js");
    expect(src).toContain("wedmPrintToProgramEngine.generate");
    // Async marker — case body must await the engine call
    expect(src).toMatch(/case "wedm_print_to_program"[\s\S]{0,800}await wedmPrintToProgramEngine\.generate/);
  });

  it("case handler validates input param AND wraps engine call in try/catch", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "wedm_print_to_program"[\s\S]{0,800}input required \(WEDMGenerateInput\)/);
    expect(src).toMatch(/case "wedm_print_to_program"[\s\S]{0,800}try\s*\{[\s\S]{0,400}catch\s*\(err\)/);
    expect(src).toMatch(/case "wedm_print_to_program"[\s\S]{0,800}\(err as Error\)\.message/);
  });

  it("schema map exposes wedm_print_to_program with input:record", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("wedm_print_to_program:");
    expect(src).toMatch(/wedm_print_to_program:\s*z\.object\(\{[\s\S]{0,400}input:\s*z\.record\(z\.string\(\),\s*z\.unknown\(\)\)/);
  });

  it("engine source: WEDMPrintToProgramEngine exports the singleton + ASYNC generate method", () => {
    const enginePath = join(process.cwd(), "src/engines/WEDMPrintToProgramEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const wedmPrintToProgramEngine\s*=\s*new WEDMPrintToProgramEngine\(\)/);
    expect(src).toMatch(/async\s+generate\(\s*input:\s*WEDMGenerateInput\s*\):\s*Promise<WEDMGenerateResult>/);
  });
});

describe("U-WWB32 — wedm_overage_request wiring (static)", () => {
  it("dispatcher case lazy-imports WEDMOverageApprovalEngine and calls createRequest", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "wedm_overage_request"');
    expect(src).toContain("WEDMOverageApprovalEngine.js");
    expect(src).toContain("wedmOverageApprovalEngine.createRequest");
  });

  it("case handler validates input param AND wraps engine call in try/catch", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "wedm_overage_request"[\s\S]{0,800}input required \(OverageRequestInput\)/);
    expect(src).toMatch(/case "wedm_overage_request"[\s\S]{0,800}try\s*\{[\s\S]{0,400}catch\s*\(err\)/);
    expect(src).toMatch(/case "wedm_overage_request"[\s\S]{0,800}\(err as Error\)\.message/);
  });

  it("schema map exposes wedm_overage_request with input:record", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("wedm_overage_request:");
    expect(src).toMatch(/wedm_overage_request:\s*z\.object\(\{[\s\S]{0,400}input:\s*z\.record\(z\.string\(\),\s*z\.unknown\(\)\)/);
  });

  it("engine source: WEDMOverageApprovalEngine alias points at class with static createRequest()", () => {
    const enginePath = join(process.cwd(), "src/engines/WEDMOverageApprovalEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const wedmOverageApprovalEngine\s*=\s*WEDMOverageApprovalEngine/);
    expect(src).toMatch(/static\s+createRequest\(\s*input:\s*OverageRequestInput\s*\):\s*OverageApprovalRecord/);
  });
});

describe("U-WWB33 — wedm_credit_cost_calc wiring (static)", () => {
  it("dispatcher case lazy-imports WEDMCreditCostEngine and calls calculate", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "wedm_credit_cost_calc"');
    expect(src).toContain("WEDMCreditCostEngine.js");
    expect(src).toContain("wedmCreditCostEngine.calculate");
  });

  it("case handler validates input param AND wraps engine call in try/catch", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "wedm_credit_cost_calc"[\s\S]{0,800}input required \(CreditCostInput\)/);
    expect(src).toMatch(/case "wedm_credit_cost_calc"[\s\S]{0,800}try\s*\{[\s\S]{0,400}catch\s*\(err\)/);
    expect(src).toMatch(/case "wedm_credit_cost_calc"[\s\S]{0,800}\(err as Error\)\.message/);
  });

  it("schema map exposes wedm_credit_cost_calc with input:record", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("wedm_credit_cost_calc:");
    expect(src).toMatch(/wedm_credit_cost_calc:\s*z\.object\(\{[\s\S]{0,400}input:\s*z\.record\(z\.string\(\),\s*z\.unknown\(\)\)/);
  });

  it("engine source: WEDMCreditCostEngine alias points at class with static calculate()", () => {
    const enginePath = join(process.cwd(), "src/engines/WEDMCreditCostEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const wedmCreditCostEngine\s*=\s*WEDMCreditCostEngine/);
    expect(src).toMatch(/static\s+calculate\(\s*input:\s*CreditCostInput\s*\):\s*CreditCostResult/);
  });
});
