/**
 * Round-trip dispatcher wiring tests for WEDM-WIRE-MS0/Batch21:
 *   U-WWB58: wedm_exception_handle         → WEDMExceptionHandlerEngine.handle
 *   U-WWB59: wedm_failsafe_plan_clearance  → WEDMFailsafeEngine.planFromClearance
 *   U-WWB60: wedm_fewshot_material_list    → WEDMFewShotMaterialEngine.listMaterials
 *
 * Three previously-unwired WEDM safety/recovery + few-shot engines:
 *   - Exception handler: maps WEDMException → RecoveryPlan with directive ladder
 *   - Failsafe planner: ClearanceReport → FailsafePlan with step ladder per tier
 *   - Few-shot material: returns list of materials with available LoRA adapters
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const DISPATCHER_PATH = join(process.cwd(), "src/tools/dispatchers/camDispatcher.ts");
const SCHEMA_PATH = join(process.cwd(), "src/schemas/camActionSchemas.ts");

describe("WEDM-WIRE-MS0/Batch21 — action enum membership", () => {
  it("camDispatcher ACTIONS array includes the 3 new actions", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('"wedm_exception_handle"');
    expect(src).toContain('"wedm_failsafe_plan_clearance"');
    expect(src).toContain('"wedm_fewshot_material_list"');
  });

  it("the WEDM-WIRE-MS0/Batch21 milestone tag is present in the enum block", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain("WEDM-WIRE-MS0/Batch21: exception handler + failsafe + few-shot material");
  });
});

describe("U-WWB58 — wedm_exception_handle wiring", () => {
  it("dispatcher case lazy-imports WEDMExceptionHandlerEngine and calls handle", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "wedm_exception_handle"');
    expect(src).toContain("WEDMExceptionHandlerEngine.js");
    expect(src).toContain("wedmExceptionHandlerEngine.handle");
  });

  it("case handler validates input AND wraps engine call in try/catch", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "wedm_exception_handle"[\s\S]{0,800}input required \(WEDMException\)/);
    expect(src).toMatch(/case "wedm_exception_handle"[\s\S]{0,800}try\s*\{[\s\S]{0,400}catch\s*\(err\)/);
    expect(src).toMatch(/case "wedm_exception_handle"[\s\S]{0,800}\(err as Error\)\.message/);
  });

  it("schema map exposes wedm_exception_handle with input:record", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("wedm_exception_handle:");
    expect(src).toMatch(/wedm_exception_handle:\s*z\.object\(\{[\s\S]{0,500}input:\s*z\.record\(z\.string\(\),\s*z\.unknown\(\)\)/);
  });

  it("engine source: WEDMExceptionHandlerEngine exports the singleton + handle method", () => {
    const enginePath = join(process.cwd(), "src/engines/WEDMExceptionHandlerEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const wedmExceptionHandlerEngine\s*=\s*new WEDMExceptionHandlerEngine\(\)/);
    expect(src).toMatch(/handle\(\s*ex:\s*WEDMException\s*\):\s*RecoveryPlan/);
  });
});

describe("U-WWB59 — wedm_failsafe_plan_clearance wiring", () => {
  it("dispatcher case lazy-imports WEDMFailsafeEngine and calls planFromClearance", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "wedm_failsafe_plan_clearance"');
    expect(src).toContain("WEDMFailsafeEngine.js");
    expect(src).toContain("wedmFailsafeEngine.planFromClearance");
  });

  it("case handler validates input AND wraps engine call in try/catch", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "wedm_failsafe_plan_clearance"[\s\S]{0,800}input required \(ClearanceReport\)/);
    expect(src).toMatch(/case "wedm_failsafe_plan_clearance"[\s\S]{0,800}try\s*\{[\s\S]{0,400}catch\s*\(err\)/);
    expect(src).toMatch(/case "wedm_failsafe_plan_clearance"[\s\S]{0,800}\(err as Error\)\.message/);
  });

  it("schema map exposes wedm_failsafe_plan_clearance with input:record", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("wedm_failsafe_plan_clearance:");
    expect(src).toMatch(/wedm_failsafe_plan_clearance:\s*z\.object\(\{[\s\S]{0,500}input:\s*z\.record\(z\.string\(\),\s*z\.unknown\(\)\)/);
  });

  it("engine source: WEDMFailsafeEngine exports the singleton + planFromClearance method", () => {
    const enginePath = join(process.cwd(), "src/engines/WEDMFailsafeEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const wedmFailsafeEngine\s*=\s*new WEDMFailsafeEngine\(\)/);
    expect(src).toMatch(/planFromClearance\(\s*report:\s*ClearanceReport\s*\):\s*FailsafePlan/);
  });
});

describe("U-WWB60 — wedm_fewshot_material_list wiring", () => {
  it("dispatcher case lazy-imports WEDMFewShotMaterialEngine and calls listMaterials", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "wedm_fewshot_material_list"');
    expect(src).toContain("WEDMFewShotMaterialEngine.js");
    expect(src).toContain("wedmFewShotMaterialEngine.listMaterials");
  });

  it("case wraps engine call in try/catch with materials wrapper", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "wedm_fewshot_material_list"[\s\S]{0,800}materials:\s*wedmFewShotMaterialEngine\.listMaterials/);
    expect(src).toMatch(/case "wedm_fewshot_material_list"[\s\S]{0,800}\(err as Error\)\.message/);
  });

  it("schema map exposes wedm_fewshot_material_list as no-input passthrough", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("wedm_fewshot_material_list:");
    expect(src).toMatch(/wedm_fewshot_material_list:\s*z\.object\(\{\s*\}\)\.passthrough\(\)/);
  });

  it("engine source: WEDMFewShotMaterialEngine exports the singleton + listMaterials method", () => {
    const enginePath = join(process.cwd(), "src/engines/WEDMFewShotMaterialEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const wedmFewShotMaterialEngine\s*=\s*new WEDMFewShotMaterialEngine\(\)/);
    expect(src).toMatch(/listMaterials\(\):\s*string\[\]/);
  });
});
