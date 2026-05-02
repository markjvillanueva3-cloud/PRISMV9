/**
 * Round-trip dispatcher wiring tests for LATHE-WIRE-MS0/Batch21:
 *   U-LWB58: lathe_lora_combiner_remove_outliers   → LatheLoRAEnsembleCombinerEngine.removeOutliers
 *   U-LWB59: lathe_lora_continual_replay_buffer    → LatheLoRAContinualLearningEngine.getReplayBuffer
 *   U-LWB60: lathe_lora_cron_list_jobs             → LatheLoRACronJobEngine.getAllJobs + getConfig
 *
 * Three more previously-unwired Lathe LoRA engines:
 *   - Combiner: outlier removal helper for ensemble value arrays
 *   - Continual learning: returns the replay buffer Experience[] (optional limit)
 *   - Cron jobs: list all registered cron-scheduled training/eval jobs
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const DISPATCHER_PATH = join(process.cwd(), "src/tools/dispatchers/turningDispatcher.ts");
const SCHEMA_PATH = join(process.cwd(), "src/schemas/turningActionSchemas.ts");

describe("LATHE-WIRE-MS0/Batch21 — action enum membership", () => {
  it("turningDispatcher ACTIONS array includes the 3 new actions", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('"lathe_lora_combiner_remove_outliers"');
    expect(src).toContain('"lathe_lora_continual_replay_buffer"');
    expect(src).toContain('"lathe_lora_cron_list_jobs"');
  });

  it("the LATHE-WIRE-MS0/Batch21 milestone tag is present in the enum block", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain("LATHE-WIRE-MS0/Batch21: ensemble combiner + continual learning + cron jobs");
  });
});

describe("U-LWB58 — lathe_lora_combiner_remove_outliers wiring", () => {
  it("dispatcher case lazy-imports LatheLoRAEnsembleCombinerEngine and calls removeOutliers", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "lathe_lora_combiner_remove_outliers"');
    expect(src).toContain("LatheLoRAEnsembleCombinerEngine.js");
    expect(src).toContain("latheLoRAEnsembleCombinerEngine.removeOutliers");
  });

  it("case validates input.values is a number array AND wraps engine call in try/catch", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "lathe_lora_combiner_remove_outliers"[\s\S]{0,1500}input\.values \(number\[\]\) required/);
    expect(src).toMatch(/case "lathe_lora_combiner_remove_outliers"[\s\S]{0,1500}\(err as Error\)\.message/);
  });

  it("schema map exposes lathe_lora_combiner_remove_outliers with input:record", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("lathe_lora_combiner_remove_outliers:");
    expect(src).toMatch(/lathe_lora_combiner_remove_outliers:\s*z\.object\(\{[\s\S]{0,500}input:\s*z\.record\(z\.string\(\),\s*z\.unknown\(\)\)/);
  });

  it("engine source: LatheLoRAEnsembleCombinerEngine exports the singleton + removeOutliers method", () => {
    const enginePath = join(process.cwd(), "src/engines/LatheLoRAEnsembleCombinerEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const latheLoRAEnsembleCombinerEngine\s*=\s*new LatheLoRAEnsembleCombinerEngine\(\)/);
    expect(src).toMatch(/removeOutliers\(\s*values:\s*number\[\]\s*\):/);
  });
});

describe("U-LWB59 — lathe_lora_continual_replay_buffer wiring", () => {
  it("dispatcher case lazy-imports LatheLoRAContinualLearningEngine and calls getReplayBuffer", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "lathe_lora_continual_replay_buffer"');
    expect(src).toContain("LatheLoRAContinualLearningEngine.js");
    expect(src).toContain("latheLoRAContinualLearningEngine.getReplayBuffer");
  });

  it("case extracts optional input.limit AND wraps engine call in try/catch with experiences wrapper", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "lathe_lora_continual_replay_buffer"[\s\S]{0,1500}input\.limit/);
    expect(src).toMatch(/case "lathe_lora_continual_replay_buffer"[\s\S]{0,1500}experiences:\s*latheLoRAContinualLearningEngine\.getReplayBuffer/);
    expect(src).toMatch(/case "lathe_lora_continual_replay_buffer"[\s\S]{0,1500}\(err as Error\)\.message/);
  });

  it("schema map exposes lathe_lora_continual_replay_buffer with input:record", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("lathe_lora_continual_replay_buffer:");
    expect(src).toMatch(/lathe_lora_continual_replay_buffer:\s*z\.object\(\{[\s\S]{0,500}input:\s*z\.record\(z\.string\(\),\s*z\.unknown\(\)\)/);
  });

  it("engine source: LatheLoRAContinualLearningEngine exports the singleton + getReplayBuffer method", () => {
    const enginePath = join(process.cwd(), "src/engines/LatheLoRAContinualLearningEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const latheLoRAContinualLearningEngine\s*=\s*new LatheLoRAContinualLearningEngine\(\)/);
    expect(src).toMatch(/getReplayBuffer\(\s*limit\?:\s*number\s*\):\s*Experience\[\]/);
  });
});

describe("U-LWB60 — lathe_lora_cron_list_jobs wiring", () => {
  it("dispatcher case lazy-imports LatheLoRACronJobEngine and returns getAllJobs + getConfig", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "lathe_lora_cron_list_jobs"');
    expect(src).toContain("LatheLoRACronJobEngine.js");
    expect(src).toContain("latheLoRACronJobEngine.getAllJobs");
    expect(src).toMatch(/case "lathe_lora_cron_list_jobs"[\s\S]{0,1500}latheLoRACronJobEngine\.getConfig\(\)/);
  });

  it("case wraps engine calls in try/catch", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "lathe_lora_cron_list_jobs"[\s\S]{0,1500}try\s*\{[\s\S]{0,500}catch\s*\(err\)/);
    expect(src).toMatch(/case "lathe_lora_cron_list_jobs"[\s\S]{0,1500}\(err as Error\)\.message/);
  });

  it("schema map exposes lathe_lora_cron_list_jobs as no-input passthrough", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("lathe_lora_cron_list_jobs:");
    expect(src).toMatch(/lathe_lora_cron_list_jobs:\s*z\.object\(\{\s*\}\)\.passthrough\(\)/);
  });

  it("engine source: LatheLoRACronJobEngine exports the singleton + getAllJobs method", () => {
    const enginePath = join(process.cwd(), "src/engines/LatheLoRACronJobEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const latheLoRACronJobEngine\s*=\s*new LatheLoRACronJobEngine\(\)/);
    expect(src).toMatch(/getAllJobs\(\):\s*CronJob\[\]/);
  });
});
