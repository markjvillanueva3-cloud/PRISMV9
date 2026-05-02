/**
 * Round-trip dispatcher wiring tests for WEDM-WIRE-MS0/Batch23:
 *   U-WWB64: wedm_virtual_machine_predict   → WEDMVirtualMachineEngine.predict + getState
 *   U-WWB65: wedm_reasoning_bridge_enrich   → WEDMReasoningBridgeEngine.enrichContext
 *   U-WWB66: wedm_start_point_optimize      → WEDMStartPointOptimizationEngine.optimize
 *
 * Three previously-unwired WEDM digital-twin + decision engines:
 *   - Virtual machine: digital twin predicting future state at horizon
 *   - Reasoning bridge: enriches decision context with prior signals + warnings
 *   - Start point optimizer: picks optimal wire entry point from candidate set
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const DISPATCHER_PATH = join(process.cwd(), "src/tools/dispatchers/camDispatcher.ts");
const SCHEMA_PATH = join(process.cwd(), "src/schemas/camActionSchemas.ts");

describe("WEDM-WIRE-MS0/Batch23 — action enum membership", () => {
  it("camDispatcher ACTIONS array includes the 3 new actions", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('"wedm_virtual_machine_predict"');
    expect(src).toContain('"wedm_reasoning_bridge_enrich"');
    expect(src).toContain('"wedm_start_point_optimize"');
  });

  it("the WEDM-WIRE-MS0/Batch23 milestone tag is present in the enum block", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain("WEDM-WIRE-MS0/Batch23: virtual machine twin + reasoning bridge + start point");
  });
});

describe("U-WWB64 — wedm_virtual_machine_predict wiring", () => {
  it("dispatcher case lazy-imports WEDMVirtualMachineEngine and calls predict + getState", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "wedm_virtual_machine_predict"');
    expect(src).toContain("WEDMVirtualMachineEngine.js");
    expect(src).toContain("wedmVirtualMachineEngine.predict");
    expect(src).toMatch(/case "wedm_virtual_machine_predict"[\s\S]{0,1500}wedmVirtualMachineEngine\.getState\(\)/);
  });

  it("case validates input.horizonMs is positive number AND wraps in try/catch", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "wedm_virtual_machine_predict"[\s\S]{0,1500}input\.horizonMs \(positive number\) required/);
    expect(src).toMatch(/case "wedm_virtual_machine_predict"[\s\S]{0,1500}\(err as Error\)\.message/);
  });

  it("schema map exposes wedm_virtual_machine_predict with input:record", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("wedm_virtual_machine_predict:");
    expect(src).toMatch(/wedm_virtual_machine_predict:\s*z\.object\(\{[\s\S]{0,500}input:\s*z\.record\(z\.string\(\),\s*z\.unknown\(\)\)/);
  });

  it("engine source: WEDMVirtualMachineEngine exports the singleton + predict method", () => {
    const enginePath = join(process.cwd(), "src/engines/WEDMVirtualMachineEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const wedmVirtualMachineEngine\s*=\s*new WEDMVirtualMachineEngine\(\)/);
    expect(src).toMatch(/predict\(\s*horizonMs:\s*number\s*\):\s*TwinPrediction \| null/);
  });
});

describe("U-WWB65 — wedm_reasoning_bridge_enrich wiring", () => {
  it("dispatcher case lazy-imports WEDMReasoningBridgeEngine and calls enrichContext", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "wedm_reasoning_bridge_enrich"');
    expect(src).toContain("WEDMReasoningBridgeEngine.js");
    expect(src).toContain("wedmReasoningBridgeEngine.enrichContext");
  });

  it("case handler validates input AND wraps engine call in try/catch", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "wedm_reasoning_bridge_enrich"[\s\S]{0,800}input required \(BridgeInput\)/);
    expect(src).toMatch(/case "wedm_reasoning_bridge_enrich"[\s\S]{0,800}\(err as Error\)\.message/);
  });

  it("schema map exposes wedm_reasoning_bridge_enrich with input:record", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("wedm_reasoning_bridge_enrich:");
    expect(src).toMatch(/wedm_reasoning_bridge_enrich:\s*z\.object\(\{[\s\S]{0,500}input:\s*z\.record\(z\.string\(\),\s*z\.unknown\(\)\)/);
  });

  it("engine source: WEDMReasoningBridgeEngine exports the singleton + enrichContext method", () => {
    const enginePath = join(process.cwd(), "src/engines/WEDMReasoningBridgeEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const wedmReasoningBridgeEngine\s*=\s*new WEDMReasoningBridgeEngine\(\)/);
    expect(src).toMatch(/enrichContext\(\s*input:\s*BridgeInput\s*\):\s*EnrichedContext/);
  });
});

describe("U-WWB66 — wedm_start_point_optimize wiring", () => {
  it("dispatcher case lazy-imports WEDMStartPointOptimizationEngine and calls optimize", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "wedm_start_point_optimize"');
    expect(src).toContain("WEDMStartPointOptimizationEngine.js");
    expect(src).toContain("wedmStartPointOptimizationEngine.optimize");
  });

  it("case handler validates input AND wraps engine call in try/catch", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "wedm_start_point_optimize"[\s\S]{0,800}input required \(StartPointOptimizationInput\)/);
    expect(src).toMatch(/case "wedm_start_point_optimize"[\s\S]{0,800}\(err as Error\)\.message/);
  });

  it("schema map exposes wedm_start_point_optimize with input:record", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("wedm_start_point_optimize:");
    expect(src).toMatch(/wedm_start_point_optimize:\s*z\.object\(\{[\s\S]{0,500}input:\s*z\.record\(z\.string\(\),\s*z\.unknown\(\)\)/);
  });

  it("engine source: WEDMStartPointOptimizationEngine exports the singleton + optimize method", () => {
    const enginePath = join(process.cwd(), "src/engines/WEDMStartPointOptimizationEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const wedmStartPointOptimizationEngine\s*=\s*new WEDMStartPointOptimizationEngine\(\)/);
    expect(src).toMatch(/optimize\(\s*input:\s*StartPointOptimizationInput\s*\):\s*StartPointOptimizationResult/);
  });
});
