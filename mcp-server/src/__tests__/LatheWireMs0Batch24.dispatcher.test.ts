/**
 * Round-trip dispatcher wiring tests for LATHE-WIRE-MS0/Batch24:
 *   U-LWB67: lathe_lora_health_alerts          → LatheLoRAHealthMonitorEngine.getActiveAlerts
 *   U-LWB68: lathe_lora_model_registry_query   → LatheLoRAModelRegistryEngine.query
 *   U-LWB69: lathe_lora_safety_evaluate        → LatheLoRASafetyEvaluatorEngine.evaluate
 *
 * Three previously-unwired Lathe LoRA control-plane engines:
 *   - Health monitor: returns active alerts (optional modelId filter)
 *   - Model registry: queries registered LoRA models with filters
 *   - Safety evaluator: evaluates model output for safety violations
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const DISPATCHER_PATH = join(process.cwd(), "src/tools/dispatchers/turningDispatcher.ts");
const SCHEMA_PATH = join(process.cwd(), "src/schemas/turningActionSchemas.ts");

describe("LATHE-WIRE-MS0/Batch24 — action enum membership", () => {
  it("turningDispatcher ACTIONS array includes the 3 new actions", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('"lathe_lora_health_alerts"');
    expect(src).toContain('"lathe_lora_model_registry_query"');
    expect(src).toContain('"lathe_lora_safety_evaluate"');
  });

  it("the LATHE-WIRE-MS0/Batch24 milestone tag is present in the enum block", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain("LATHE-WIRE-MS0/Batch24: health monitor + model registry + safety evaluator");
  });
});

describe("U-LWB67 — lathe_lora_health_alerts wiring", () => {
  it("dispatcher case lazy-imports LatheLoRAHealthMonitorEngine and calls getActiveAlerts", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "lathe_lora_health_alerts"');
    expect(src).toContain("LatheLoRAHealthMonitorEngine.js");
    expect(src).toContain("latheLoRAHealthMonitorEngine.getActiveAlerts");
  });

  it("case extracts optional input.modelId AND wraps engine call in try/catch", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "lathe_lora_health_alerts"[\s\S]{0,1000}input\.modelId/);
    expect(src).toMatch(/case "lathe_lora_health_alerts"[\s\S]{0,1000}alerts:\s*latheLoRAHealthMonitorEngine\.getActiveAlerts/);
    expect(src).toMatch(/case "lathe_lora_health_alerts"[\s\S]{0,1000}\(err as Error\)\.message/);
  });

  it("schema map exposes lathe_lora_health_alerts with input:record", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("lathe_lora_health_alerts:");
    expect(src).toMatch(/lathe_lora_health_alerts:\s*z\.object\(\{[\s\S]{0,500}input:\s*z\.record\(z\.string\(\),\s*z\.unknown\(\)\)/);
  });

  it("engine source: LatheLoRAHealthMonitorEngine exports the singleton + getActiveAlerts method", () => {
    const enginePath = join(process.cwd(), "src/engines/LatheLoRAHealthMonitorEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const latheLoRAHealthMonitorEngine\s*=\s*new LatheLoRAHealthMonitorEngine\(\)/);
    expect(src).toMatch(/getActiveAlerts\(\s*modelId\?:\s*string\s*\):\s*Alert\[\]/);
  });
});

describe("U-LWB68 — lathe_lora_model_registry_query wiring", () => {
  it("dispatcher case lazy-imports LatheLoRAModelRegistryEngine and calls query", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "lathe_lora_model_registry_query"');
    expect(src).toContain("LatheLoRAModelRegistryEngine.js");
    expect(src).toContain("latheLoRAModelRegistryEngine.query");
  });

  it("case defaults filters to {} when missing AND wraps engine call in try/catch", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "lathe_lora_model_registry_query"[\s\S]{0,1000}models:\s*latheLoRAModelRegistryEngine\.query/);
    expect(src).toMatch(/case "lathe_lora_model_registry_query"[\s\S]{0,1000}\(err as Error\)\.message/);
  });

  it("schema map exposes lathe_lora_model_registry_query with input:record", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("lathe_lora_model_registry_query:");
    expect(src).toMatch(/lathe_lora_model_registry_query:\s*z\.object\(\{[\s\S]{0,500}input:\s*z\.record\(z\.string\(\),\s*z\.unknown\(\)\)/);
  });

  it("engine source: LatheLoRAModelRegistryEngine exports the singleton + query method", () => {
    const enginePath = join(process.cwd(), "src/engines/LatheLoRAModelRegistryEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const latheLoRAModelRegistryEngine/);
    expect(src).toMatch(/query\(\s*filters:\s*RegistryQuery\s*=/);
  });
});

describe("U-LWB69 — lathe_lora_safety_evaluate wiring", () => {
  it("dispatcher case lazy-imports LatheLoRASafetyEvaluatorEngine and calls evaluate", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "lathe_lora_safety_evaluate"');
    expect(src).toContain("LatheLoRASafetyEvaluatorEngine.js");
    expect(src).toContain("latheLoRASafetyEvaluatorEngine.evaluate");
  });

  it("case validates input.output is string AND wraps engine call in try/catch", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "lathe_lora_safety_evaluate"[\s\S]{0,1500}input\.output \(string\) required/);
    expect(src).toMatch(/case "lathe_lora_safety_evaluate"[\s\S]{0,1500}\(err as Error\)\.message/);
  });

  it("schema map exposes lathe_lora_safety_evaluate with input:record", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("lathe_lora_safety_evaluate:");
    expect(src).toMatch(/lathe_lora_safety_evaluate:\s*z\.object\(\{[\s\S]{0,500}input:\s*z\.record\(z\.string\(\),\s*z\.unknown\(\)\)/);
  });

  it("engine source: LatheLoRASafetyEvaluatorEngine exports the singleton + evaluate method", () => {
    const enginePath = join(process.cwd(), "src/engines/LatheLoRASafetyEvaluatorEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const latheLoRASafetyEvaluatorEngine\s*=\s*new LatheLoRASafetyEvaluatorEngine\(\)/);
    expect(src).toMatch(/evaluate\(\s*output:\s*string,[\s\S]{0,200}context\?:[\s\S]{0,100}\):\s*SafetyEvaluation/);
  });
});
