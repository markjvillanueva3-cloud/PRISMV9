/**
 * Round-trip dispatcher wiring tests for MILL-WIRE-MS0/Batch1:
 *   U-MWB01: mill_swiss_calculate      → MillTurnSwissPipelineEngine.calculate
 *   U-MWB02: mill_lora_dataset_build   → MillingLoRADatasetBuilderEngine.buildDataset
 *   U-MWB03: mill_lora_cadence_check   → MillingLoRACadenceEngine.shouldTriggerRun
 *
 * Three previously-unwired Mill engines:
 *   - Swiss pipeline: live tooling, sub-spindle, multi-channel, bar feeder, swiss machining
 *   - LoRA dataset builder: constructs train/val/test splits for LoRA fine-tuning
 *   - LoRA cadence: checks if a training run should fire based on job count + drift
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const DISPATCHER_PATH = join(process.cwd(), "src/tools/dispatchers/millDispatcher.ts");
const SCHEMA_PATH = join(process.cwd(), "src/schemas/millActionSchemas.ts");

describe("MILL-WIRE-MS0/Batch1 — action enum membership", () => {
  it("millDispatcher MILL_ACTIONS array includes the 3 new actions", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('"mill_swiss_calculate"');
    expect(src).toContain('"mill_lora_dataset_build"');
    expect(src).toContain('"mill_lora_cadence_check"');
  });

  it("the MILL-WIRE-MS0/Batch1 milestone tag is present in the enum block", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain("MILL-WIRE-MS0/Batch1: Swiss pipeline + LoRA dataset/cadence");
  });
});

describe("U-MWB01 — mill_swiss_calculate wiring", () => {
  it("dispatcher case routes via getEngine(\"swiss\") and calls calculate", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "mill_swiss_calculate"');
    expect(src).toMatch(/case "mill_swiss_calculate"[\s\S]{0,400}getEngine\("swiss"\)/);
    expect(src).toMatch(/case "mill_swiss_calculate"[\s\S]{0,400}\["calculate"\]/);
    expect(src).toMatch(/case "mill_swiss_calculate"[\s\S]{0,400}"MillTurnSwissPipelineEngine"/);
  });

  it("getEngine factory lazy-imports MillTurnSwissPipelineEngine", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "swiss":');
    expect(src).toContain("MillTurnSwissPipelineEngine.js");
    expect(src).toContain("millTurnSwissPipelineEngine");
  });

  it("schema map exposes mill_swiss_calculate with optional mode enum", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("mill_swiss_calculate");
    expect(src).toMatch(/const mill_swiss_calculate\s*=\s*z[\s\S]{0,800}live_tool[\s\S]{0,200}sub_spindle_transfer/);
  });

  it("engine source: MillTurnSwissPipelineEngine exports the singleton + calculate method", () => {
    const enginePath = join(process.cwd(), "src/engines/MillTurnSwissPipelineEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const millTurnSwissPipelineEngine\s*=\s*new MillTurnSwissPipelineEngine\(\)/);
    expect(src).toMatch(/calculate\(\s*input:\s*MillTurnSwissInput\s*\):/);
  });
});

describe("U-MWB02 — mill_lora_dataset_build wiring", () => {
  it("dispatcher case routes via getEngine(\"lora_dataset\") and calls buildDataset", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "mill_lora_dataset_build"');
    expect(src).toMatch(/case "mill_lora_dataset_build"[\s\S]{0,400}getEngine\("lora_dataset"\)/);
    expect(src).toMatch(/case "mill_lora_dataset_build"[\s\S]{0,400}engine\.buildDataset/);
    expect(src).toMatch(/case "mill_lora_dataset_build"[\s\S]{0,400}params\.split/);
  });

  it("getEngine factory lazy-imports MillingLoRADatasetBuilderEngine", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "lora_dataset":');
    expect(src).toContain("MillingLoRADatasetBuilderEngine.js");
    expect(src).toContain("millingLoRADatasetBuilderEngine");
  });

  it("schema map exposes mill_lora_dataset_build with jobs array", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("mill_lora_dataset_build");
    expect(src).toMatch(/const mill_lora_dataset_build\s*=\s*z[\s\S]{0,800}jobs:\s*z\.array/);
  });

  it("engine source: MillingLoRADatasetBuilderEngine exports the singleton + buildDataset method", () => {
    const enginePath = join(process.cwd(), "src/engines/MillingLoRADatasetBuilderEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const millingLoRADatasetBuilderEngine\s*=\s*new MillingLoRADatasetBuilderEngineImpl\(\)/);
    expect(src).toMatch(/buildDataset\(\s*jobs:\s*RawJob\[\]/);
  });
});

describe("U-MWB03 — mill_lora_cadence_check wiring", () => {
  it("dispatcher case routes via getEngine(\"lora_cadence\") and calls shouldTriggerRun", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "mill_lora_cadence_check"');
    expect(src).toMatch(/case "mill_lora_cadence_check"[\s\S]{0,400}getEngine\("lora_cadence"\)/);
    expect(src).toMatch(/case "mill_lora_cadence_check"[\s\S]{0,400}engine\.shouldTriggerRun/);
  });

  it("getEngine factory lazy-imports MillingLoRACadenceEngine", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "lora_cadence":');
    expect(src).toContain("MillingLoRACadenceEngine.js");
    expect(src).toContain("millingLoRACadenceEngine");
  });

  it("schema map exposes mill_lora_cadence_check as a passthrough object", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("mill_lora_cadence_check");
    expect(src).toMatch(/const mill_lora_cadence_check\s*=\s*z\s*\.\s*object\(\{\s*\}\)\s*\.\s*passthrough\(\)/);
  });

  it("engine source: MillingLoRACadenceEngine exports the singleton + shouldTriggerRun method", () => {
    const enginePath = join(process.cwd(), "src/engines/MillingLoRACadenceEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const millingLoRACadenceEngine\s*=\s*new MillingLoRACadenceEngineImpl\(\)/);
    expect(src).toMatch(/shouldTriggerRun\(\)/);
  });
});
