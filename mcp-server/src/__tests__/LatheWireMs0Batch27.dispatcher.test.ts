/**
 * Round-trip dispatcher wiring tests for LATHE-WIRE-MS0/Batch27:
 *   U-LWB76: lathe_lora_monitoring_alerts   → LatheLoRAMonitoringEngine.getActiveAlerts + getStats + getMonitoredDeployments
 *   U-LWB77: lathe_lora_training_progress   → LatheLoRATrainingMonitorEngine.getProgress + getState
 *   U-LWB78: lathe_lora_pipeline_state      → LatheLoRAPipelineEngine.getState + getConfig
 *
 * Three more previously-unwired Lathe LoRA monitoring engines:
 *   - Monitoring: deployment alerts + stats + monitored deployment list
 *   - Training monitor: percent + ETA progress + current training state
 *   - Pipeline: current pipeline state + config
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const DISPATCHER_PATH = join(process.cwd(), "src/tools/dispatchers/turningDispatcher.ts");
const SCHEMA_PATH = join(process.cwd(), "src/schemas/turningActionSchemas.ts");

describe("LATHE-WIRE-MS0/Batch27 — action enum membership", () => {
  it("turningDispatcher ACTIONS array includes the 3 new actions", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('"lathe_lora_monitoring_alerts"');
    expect(src).toContain('"lathe_lora_training_progress"');
    expect(src).toContain('"lathe_lora_pipeline_state"');
  });

  it("the LATHE-WIRE-MS0/Batch27 milestone tag is present in the enum block", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain("LATHE-WIRE-MS0/Batch27: monitoring + training monitor + pipeline state");
  });
});

describe("U-LWB76 — lathe_lora_monitoring_alerts wiring", () => {
  it("dispatcher case lazy-imports LatheLoRAMonitoringEngine and returns combined snapshot", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "lathe_lora_monitoring_alerts"');
    expect(src).toContain("LatheLoRAMonitoringEngine.js");
    expect(src).toContain("latheLoRAMonitoringEngine.getActiveAlerts");
    expect(src).toMatch(/case "lathe_lora_monitoring_alerts"[\s\S]{0,1500}latheLoRAMonitoringEngine\.getStats/);
    expect(src).toMatch(/case "lathe_lora_monitoring_alerts"[\s\S]{0,1500}latheLoRAMonitoringEngine\.getMonitoredDeployments/);
  });

  it("case wraps engine calls in try/catch", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "lathe_lora_monitoring_alerts"[\s\S]{0,1500}\(err as Error\)\.message/);
  });

  it("schema map exposes lathe_lora_monitoring_alerts as no-input passthrough", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("lathe_lora_monitoring_alerts:");
    expect(src).toMatch(/lathe_lora_monitoring_alerts:\s*z\.object\(\{\s*\}\)\.passthrough\(\)/);
  });

  it("engine source: LatheLoRAMonitoringEngine exports the singleton + getActiveAlerts method", () => {
    const enginePath = join(process.cwd(), "src/engines/LatheLoRAMonitoringEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const latheLoRAMonitoringEngine\s*=\s*new LatheLoRAMonitoringEngine\(\)/);
    expect(src).toMatch(/getActiveAlerts\(\):\s*Alert\[\]/);
  });
});

describe("U-LWB77 — lathe_lora_training_progress wiring", () => {
  it("dispatcher case lazy-imports LatheLoRATrainingMonitorEngine and returns getProgress + getState", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "lathe_lora_training_progress"');
    expect(src).toContain("LatheLoRATrainingMonitorEngine.js");
    expect(src).toContain("latheLoRATrainingMonitorEngine.getProgress");
    expect(src).toMatch(/case "lathe_lora_training_progress"[\s\S]{0,1500}latheLoRATrainingMonitorEngine\.getState/);
  });

  it("case wraps engine calls in try/catch", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "lathe_lora_training_progress"[\s\S]{0,1500}\(err as Error\)\.message/);
  });

  it("schema map exposes lathe_lora_training_progress as no-input passthrough", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("lathe_lora_training_progress:");
    expect(src).toMatch(/lathe_lora_training_progress:\s*z\.object\(\{\s*\}\)\.passthrough\(\)/);
  });

  it("engine source: LatheLoRATrainingMonitorEngine exports the singleton + getProgress method", () => {
    const enginePath = join(process.cwd(), "src/engines/LatheLoRATrainingMonitorEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const latheLoRATrainingMonitorEngine\s*=\s*new LatheLoRATrainingMonitorEngine\(\)/);
    expect(src).toMatch(/getProgress\(\):/);
  });
});

describe("U-LWB78 — lathe_lora_pipeline_state wiring", () => {
  it("dispatcher case lazy-imports LatheLoRAPipelineEngine and returns getState + getConfig", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "lathe_lora_pipeline_state"');
    expect(src).toContain("LatheLoRAPipelineEngine.js");
    expect(src).toContain("latheLoRAPipelineEngine.getState");
    expect(src).toMatch(/case "lathe_lora_pipeline_state"[\s\S]{0,1500}latheLoRAPipelineEngine\.getConfig/);
  });

  it("case wraps engine calls in try/catch", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "lathe_lora_pipeline_state"[\s\S]{0,1500}\(err as Error\)\.message/);
  });

  it("schema map exposes lathe_lora_pipeline_state as no-input passthrough", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("lathe_lora_pipeline_state:");
    expect(src).toMatch(/lathe_lora_pipeline_state:\s*z\.object\(\{\s*\}\)\.passthrough\(\)/);
  });

  it("engine source: LatheLoRAPipelineEngine exports the singleton + getState method", () => {
    const enginePath = join(process.cwd(), "src/engines/LatheLoRAPipelineEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const latheLoRAPipelineEngine\s*=\s*new LatheLoRAPipelineEngine\(\)/);
    expect(src).toMatch(/getState\(\):\s*PipelineState \| null/);
  });
});
