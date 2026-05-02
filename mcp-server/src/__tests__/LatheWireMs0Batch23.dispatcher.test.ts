/**
 * Round-trip dispatcher wiring tests for LATHE-WIRE-MS0/Batch23:
 *   U-LWB64: lathe_lora_cadence_orch_active   → LatheLoRACadenceOrchestratorEngine.getActiveRun + canTrain
 *   U-LWB65: lathe_lora_ensemble_orch_stats   → LatheLoRAEnsembleOrchestratorEngine.getStats + getActiveRuns
 *   U-LWB66: lathe_lora_experiment_create     → LatheLoRAExperimentTrackerEngine.createExperiment
 *
 * Three more previously-unwired Lathe LoRA orchestrator/tracker engines:
 *   - Cadence orchestrator: per-model cadence run state + train-readiness
 *   - Ensemble orchestrator: aggregate ensemble run stats + active list
 *   - Experiment tracker: creates new tracked experiment with hyperparameters + tags
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const DISPATCHER_PATH = join(process.cwd(), "src/tools/dispatchers/turningDispatcher.ts");
const SCHEMA_PATH = join(process.cwd(), "src/schemas/turningActionSchemas.ts");

describe("LATHE-WIRE-MS0/Batch23 — action enum membership", () => {
  it("turningDispatcher ACTIONS array includes the 3 new actions", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('"lathe_lora_cadence_orch_active"');
    expect(src).toContain('"lathe_lora_ensemble_orch_stats"');
    expect(src).toContain('"lathe_lora_experiment_create"');
  });

  it("the LATHE-WIRE-MS0/Batch23 milestone tag is present in the enum block", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain("LATHE-WIRE-MS0/Batch23: cadence orchestrator + ensemble orchestrator + experiment tracker");
  });
});

describe("U-LWB64 — lathe_lora_cadence_orch_active wiring", () => {
  it("dispatcher case lazy-imports LatheLoRACadenceOrchestratorEngine and calls getActiveRun + canTrain", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "lathe_lora_cadence_orch_active"');
    expect(src).toContain("LatheLoRACadenceOrchestratorEngine.js");
    expect(src).toContain("latheLoRACadenceOrchestratorEngine.getActiveRun");
    expect(src).toMatch(/case "lathe_lora_cadence_orch_active"[\s\S]{0,1500}latheLoRACadenceOrchestratorEngine\.canTrain/);
  });

  it("case validates input.modelId is non-empty string AND wraps in try/catch", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "lathe_lora_cadence_orch_active"[\s\S]{0,1500}input\.modelId \(string\) required/);
    expect(src).toMatch(/case "lathe_lora_cadence_orch_active"[\s\S]{0,1500}\(err as Error\)\.message/);
  });

  it("schema map exposes lathe_lora_cadence_orch_active with input:record", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("lathe_lora_cadence_orch_active:");
    expect(src).toMatch(/lathe_lora_cadence_orch_active:\s*z\.object\(\{[\s\S]{0,500}input:\s*z\.record\(z\.string\(\),\s*z\.unknown\(\)\)/);
  });

  it("engine source: LatheLoRACadenceOrchestratorEngine exports the singleton + getActiveRun method", () => {
    const enginePath = join(process.cwd(), "src/engines/LatheLoRACadenceOrchestratorEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const latheLoRACadenceOrchestratorEngine\s*=\s*new LatheLoRACadenceOrchestratorEngine\(\)/);
    expect(src).toMatch(/getActiveRun\(\s*modelId:\s*string\s*\):\s*CadenceRun \| null/);
  });
});

describe("U-LWB65 — lathe_lora_ensemble_orch_stats wiring", () => {
  it("dispatcher case lazy-imports LatheLoRAEnsembleOrchestratorEngine and returns getStats + getActiveRuns", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "lathe_lora_ensemble_orch_stats"');
    expect(src).toContain("LatheLoRAEnsembleOrchestratorEngine.js");
    expect(src).toContain("latheLoRAEnsembleOrchestratorEngine.getStats");
    expect(src).toMatch(/case "lathe_lora_ensemble_orch_stats"[\s\S]{0,1500}latheLoRAEnsembleOrchestratorEngine\.getActiveRuns/);
  });

  it("case wraps engine calls in try/catch", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "lathe_lora_ensemble_orch_stats"[\s\S]{0,1500}try\s*\{[\s\S]{0,800}catch\s*\(err\)/);
    expect(src).toMatch(/case "lathe_lora_ensemble_orch_stats"[\s\S]{0,1500}\(err as Error\)\.message/);
  });

  it("schema map exposes lathe_lora_ensemble_orch_stats as no-input passthrough", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("lathe_lora_ensemble_orch_stats:");
    expect(src).toMatch(/lathe_lora_ensemble_orch_stats:\s*z\.object\(\{\s*\}\)\.passthrough\(\)/);
  });

  it("engine source: LatheLoRAEnsembleOrchestratorEngine exports the singleton + getStats method", () => {
    const enginePath = join(process.cwd(), "src/engines/LatheLoRAEnsembleOrchestratorEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const latheLoRAEnsembleOrchestratorEngine\s*=\s*new LatheLoRAEnsembleOrchestratorEngine\(\)/);
    expect(src).toMatch(/getStats\(\):/);
  });
});

describe("U-LWB66 — lathe_lora_experiment_create wiring", () => {
  it("dispatcher case lazy-imports LatheLoRAExperimentTrackerEngine and calls createExperiment", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "lathe_lora_experiment_create"');
    expect(src).toContain("LatheLoRAExperimentTrackerEngine.js");
    expect(src).toContain("latheLoRAExperimentTrackerEngine.createExperiment");
  });

  it("case validates input.name + input.hyperparameters AND wraps in try/catch", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "lathe_lora_experiment_create"[\s\S]{0,2000}input required \(\{name, hyperparameters, tags\?\}\)/);
    expect(src).toMatch(/case "lathe_lora_experiment_create"[\s\S]{0,2000}input\.name \(string\) and input\.hyperparameters \(object\) required/);
    expect(src).toMatch(/case "lathe_lora_experiment_create"[\s\S]{0,2000}\(err as Error\)\.message/);
  });

  it("schema map exposes lathe_lora_experiment_create with input:record", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("lathe_lora_experiment_create:");
    expect(src).toMatch(/lathe_lora_experiment_create:\s*z\.object\(\{[\s\S]{0,500}input:\s*z\.record\(z\.string\(\),\s*z\.unknown\(\)\)/);
  });

  it("engine source: LatheLoRAExperimentTrackerEngine exports the singleton + createExperiment method", () => {
    const enginePath = join(process.cwd(), "src/engines/LatheLoRAExperimentTrackerEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const latheLoRAExperimentTrackerEngine\s*=\s*new LatheLoRAExperimentTrackerEngine\(\)/);
    expect(src).toMatch(/createExperiment\(\s*name:\s*string,[\s\S]{0,200}hyperparameters:\s*Record<string, unknown>/);
  });
});
