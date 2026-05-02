/**
 * Round-trip dispatcher wiring tests for LATHE-WIRE-MS0/Batch25:
 *   U-LWB70: lathe_lora_model_selector_models  → LatheLoRAModelSelectorEngine.getModels + getStats
 *   U-LWB71: lathe_lora_verification_history   → LatheLoRAVerificationEngine.getHistory
 *   U-LWB72: lathe_lora_resource_pools         → LatheLoRAResourceManagerEngine.getPools
 *
 * Three more previously-unwired Lathe LoRA infrastructure engines:
 *   - Model selector: lists registered model descriptors with selector stats
 *   - Verification: returns VerificationSuiteResult[] history (optional model + limit filters)
 *   - Resource manager: returns current ResourcePool[] with availability
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const DISPATCHER_PATH = join(process.cwd(), "src/tools/dispatchers/turningDispatcher.ts");
const SCHEMA_PATH = join(process.cwd(), "src/schemas/turningActionSchemas.ts");

describe("LATHE-WIRE-MS0/Batch25 — action enum membership", () => {
  it("turningDispatcher ACTIONS array includes the 3 new actions", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('"lathe_lora_model_selector_models"');
    expect(src).toContain('"lathe_lora_verification_history"');
    expect(src).toContain('"lathe_lora_resource_pools"');
  });

  it("the LATHE-WIRE-MS0/Batch25 milestone tag is present in the enum block", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain("LATHE-WIRE-MS0/Batch25: model selector + verification + resource manager");
  });
});

describe("U-LWB70 — lathe_lora_model_selector_models wiring", () => {
  it("dispatcher case lazy-imports LatheLoRAModelSelectorEngine and returns getModels + getStats", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "lathe_lora_model_selector_models"');
    expect(src).toContain("LatheLoRAModelSelectorEngine.js");
    expect(src).toContain("latheLoRAModelSelectorEngine.getModels");
    expect(src).toMatch(/case "lathe_lora_model_selector_models"[\s\S]{0,1500}latheLoRAModelSelectorEngine\.getStats/);
  });

  it("case wraps engine calls in try/catch", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "lathe_lora_model_selector_models"[\s\S]{0,1500}try\s*\{[\s\S]{0,800}catch\s*\(err\)/);
    expect(src).toMatch(/case "lathe_lora_model_selector_models"[\s\S]{0,1500}\(err as Error\)\.message/);
  });

  it("schema map exposes lathe_lora_model_selector_models as no-input passthrough", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("lathe_lora_model_selector_models:");
    expect(src).toMatch(/lathe_lora_model_selector_models:\s*z\.object\(\{\s*\}\)\.passthrough\(\)/);
  });

  it("engine source: LatheLoRAModelSelectorEngine exports the singleton + getModels method", () => {
    const enginePath = join(process.cwd(), "src/engines/LatheLoRAModelSelectorEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const latheLoRAModelSelectorEngine\s*=\s*new LatheLoRAModelSelectorEngine\(\)/);
    expect(src).toMatch(/getModels\(\):\s*ModelDescriptor\[\]/);
  });
});

describe("U-LWB71 — lathe_lora_verification_history wiring", () => {
  it("dispatcher case lazy-imports LatheLoRAVerificationEngine and calls getHistory", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "lathe_lora_verification_history"');
    expect(src).toContain("LatheLoRAVerificationEngine.js");
    expect(src).toContain("latheLoRAVerificationEngine.getHistory");
  });

  it("case extracts optional input.modelId AND input.limit (default 10) AND wraps in try/catch", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "lathe_lora_verification_history"[\s\S]{0,1500}input\.modelId/);
    expect(src).toMatch(/case "lathe_lora_verification_history"[\s\S]{0,1500}input\.limit[\s\S]{0,200}\?\s*input\.limit\s*:\s*10/);
    expect(src).toMatch(/case "lathe_lora_verification_history"[\s\S]{0,1500}\(err as Error\)\.message/);
  });

  it("schema map exposes lathe_lora_verification_history with input:record", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("lathe_lora_verification_history:");
    expect(src).toMatch(/lathe_lora_verification_history:\s*z\.object\(\{[\s\S]{0,500}input:\s*z\.record\(z\.string\(\),\s*z\.unknown\(\)\)/);
  });

  it("engine source: LatheLoRAVerificationEngine exports the singleton + getHistory method", () => {
    const enginePath = join(process.cwd(), "src/engines/LatheLoRAVerificationEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const latheLoRAVerificationEngine\s*=\s*new LatheLoRAVerificationEngine\(\)/);
    expect(src).toMatch(/getHistory\(\s*modelId\?:\s*string,\s*limit:\s*number\s*=\s*10\s*\):\s*VerificationSuiteResult\[\]/);
  });
});

describe("U-LWB72 — lathe_lora_resource_pools wiring", () => {
  it("dispatcher case lazy-imports LatheLoRAResourceManagerEngine and calls getPools", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "lathe_lora_resource_pools"');
    expect(src).toContain("LatheLoRAResourceManagerEngine.js");
    expect(src).toContain("latheLoRAResourceManagerEngine.getPools");
  });

  it("case wraps engine call in try/catch with pools wrapper", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "lathe_lora_resource_pools"[\s\S]{0,800}pools:\s*latheLoRAResourceManagerEngine\.getPools/);
    expect(src).toMatch(/case "lathe_lora_resource_pools"[\s\S]{0,800}\(err as Error\)\.message/);
  });

  it("schema map exposes lathe_lora_resource_pools as no-input passthrough", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("lathe_lora_resource_pools:");
    expect(src).toMatch(/lathe_lora_resource_pools:\s*z\.object\(\{\s*\}\)\.passthrough\(\)/);
  });

  it("engine source: LatheLoRAResourceManagerEngine exports the singleton + getPools method", () => {
    const enginePath = join(process.cwd(), "src/engines/LatheLoRAResourceManagerEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const latheLoRAResourceManagerEngine\s*=\s*new LatheLoRAResourceManagerEngine\(\)/);
    expect(src).toMatch(/getPools\(\):\s*ResourcePool\[\]/);
  });
});
