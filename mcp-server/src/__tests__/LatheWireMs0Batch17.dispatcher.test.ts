/**
 * Round-trip dispatcher wiring tests for LATHE-WIRE-MS0/Batch17:
 *   U-LWB46: lathe_lora_cadence_status → LatheLoRACadenceEngine.shouldTriggerRun + getState + getConfig
 *   U-LWB47: lathe_lora_dataset_stats  → LatheLoRADatasetBuilderEngine.getStats
 *   U-LWB48: lathe_lora_drift_detect   → LatheLoRADriftDetectorEngine.detectDrift + needsRetraining
 *
 * Three previously-unwired Lathe LoRA infrastructure engines:
 *   - Cadence: training-run trigger logic (cron + drift + performance windows)
 *   - Dataset builder: maintains LoRA example collection with Alpaca/ShareGPT export
 *   - Drift detector: per-model quality regression detection from sample stream
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const DISPATCHER_PATH = join(process.cwd(), "src/tools/dispatchers/turningDispatcher.ts");
const SCHEMA_PATH = join(process.cwd(), "src/schemas/turningActionSchemas.ts");

describe("LATHE-WIRE-MS0/Batch17 — action enum membership", () => {
  it("turningDispatcher ACTIONS array includes the 3 new actions", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('"lathe_lora_cadence_status"');
    expect(src).toContain('"lathe_lora_dataset_stats"');
    expect(src).toContain('"lathe_lora_drift_detect"');
  });

  it("the LATHE-WIRE-MS0/Batch17 milestone tag is present in the enum block", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain("LATHE-WIRE-MS0/Batch17: LoRA cadence + dataset stats + drift detection");
  });
});

describe("U-LWB46 — lathe_lora_cadence_status wiring", () => {
  it("dispatcher case lazy-imports LatheLoRACadenceEngine and returns trigger + state + config", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "lathe_lora_cadence_status"');
    expect(src).toContain("LatheLoRACadenceEngine.js");
    expect(src).toContain("latheLoRACadenceEngine.shouldTriggerRun");
    expect(src).toMatch(/case "lathe_lora_cadence_status"[\s\S]{0,1500}latheLoRACadenceEngine\.getState\(\)/);
    expect(src).toMatch(/case "lathe_lora_cadence_status"[\s\S]{0,1500}latheLoRACadenceEngine\.getConfig\(\)/);
  });

  it("case wraps engine calls in try/catch", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "lathe_lora_cadence_status"[\s\S]{0,1500}try\s*\{[\s\S]{0,800}catch\s*\(err\)/);
    expect(src).toMatch(/case "lathe_lora_cadence_status"[\s\S]{0,1500}\(err as Error\)\.message/);
  });

  it("schema map exposes lathe_lora_cadence_status as no-input passthrough", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("lathe_lora_cadence_status:");
    expect(src).toMatch(/lathe_lora_cadence_status:\s*z\.object\(\{\s*\}\)\.passthrough\(\)/);
  });

  it("engine source: LatheLoRACadenceEngine exports the singleton + shouldTriggerRun method", () => {
    const enginePath = join(process.cwd(), "src/engines/LatheLoRACadenceEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const latheLoRACadenceEngine\s*=\s*new LatheLoRACadenceEngine\(\)/);
    expect(src).toMatch(/shouldTriggerRun\(\):/);
  });
});

describe("U-LWB47 — lathe_lora_dataset_stats wiring", () => {
  it("dispatcher case lazy-imports LatheLoRADatasetBuilderEngine and calls getStats", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "lathe_lora_dataset_stats"');
    expect(src).toContain("LatheLoRADatasetBuilderEngine.js");
    expect(src).toContain("latheLoRADatasetBuilderEngine.getStats");
  });

  it("case wraps engine call in try/catch", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "lathe_lora_dataset_stats"[\s\S]{0,800}try\s*\{[\s\S]{0,400}catch\s*\(err\)/);
    expect(src).toMatch(/case "lathe_lora_dataset_stats"[\s\S]{0,800}\(err as Error\)\.message/);
  });

  it("schema map exposes lathe_lora_dataset_stats as no-input passthrough", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("lathe_lora_dataset_stats:");
    expect(src).toMatch(/lathe_lora_dataset_stats:\s*z\.object\(\{\s*\}\)\.passthrough\(\)/);
  });

  it("engine source: LatheLoRADatasetBuilderEngine exports the singleton + getStats method", () => {
    const enginePath = join(process.cwd(), "src/engines/LatheLoRADatasetBuilderEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const latheLoRADatasetBuilderEngine\s*=\s*new LatheLoRADatasetBuilderEngine\(\)/);
    expect(src).toMatch(/getStats\(\):\s*DatasetStats/);
  });
});

describe("U-LWB48 — lathe_lora_drift_detect wiring", () => {
  it("dispatcher case lazy-imports LatheLoRADriftDetectorEngine and calls detectDrift", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "lathe_lora_drift_detect"');
    expect(src).toContain("LatheLoRADriftDetectorEngine.js");
    expect(src).toContain("latheLoRADriftDetectorEngine.detectDrift");
    expect(src).toMatch(/case "lathe_lora_drift_detect"[\s\S]{0,1500}latheLoRADriftDetectorEngine\.needsRetraining/);
  });

  it("case validates input.modelId is a non-empty string AND wraps in try/catch", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "lathe_lora_drift_detect"[\s\S]{0,1500}input\.modelId \(string\) required/);
    expect(src).toMatch(/case "lathe_lora_drift_detect"[\s\S]{0,1500}try\s*\{[\s\S]{0,500}catch\s*\(err\)/);
    expect(src).toMatch(/case "lathe_lora_drift_detect"[\s\S]{0,1500}\(err as Error\)\.message/);
  });

  it("schema map exposes lathe_lora_drift_detect with input:record", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("lathe_lora_drift_detect:");
    expect(src).toMatch(/lathe_lora_drift_detect:\s*z\.object\(\{[\s\S]{0,400}input:\s*z\.record\(z\.string\(\),\s*z\.unknown\(\)\)/);
  });

  it("engine source: LatheLoRADriftDetectorEngine exports the singleton + detectDrift method", () => {
    const enginePath = join(process.cwd(), "src/engines/LatheLoRADriftDetectorEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const latheLoRADriftDetectorEngine/);
    expect(src).toMatch(/detectDrift\(\s*modelId:\s*string\s*\):\s*DriftDetection\[\]/);
  });
});
