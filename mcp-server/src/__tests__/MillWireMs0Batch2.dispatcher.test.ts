/**
 * Round-trip dispatcher wiring tests for MILL-WIRE-MS0/Batch2:
 *   U-MWB04: mill_turn_lora_dataset_build → MillTurnLoRADatasetBuilderEngine.buildDataset
 *   U-MWB05: mill_turn_lora_cadence_check → MillTurnLoRACadenceEngine.shouldTriggerRun
 *   U-MWB06: mill_turn_cam_generate       → MillTurnCAMEngine.generate
 *
 * Mill-turn-specific siblings of the milling-only LoRA infrastructure (Batch1)
 * plus the mill-turn CAM program generator with multi-channel sync.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const DISPATCHER_PATH = join(process.cwd(), "src/tools/dispatchers/millDispatcher.ts");
const SCHEMA_PATH = join(process.cwd(), "src/schemas/millActionSchemas.ts");

describe("MILL-WIRE-MS0/Batch2 — action enum membership", () => {
  it("millDispatcher MILL_ACTIONS array includes the 3 new actions", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('"mill_turn_lora_dataset_build"');
    expect(src).toContain('"mill_turn_lora_cadence_check"');
    expect(src).toContain('"mill_turn_cam_generate"');
  });

  it("the MILL-WIRE-MS0/Batch2 milestone tag is present in the enum block", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain("MILL-WIRE-MS0/Batch2: mill-turn LoRA + CAM");
  });
});

describe("U-MWB04 — mill_turn_lora_dataset_build wiring", () => {
  it("dispatcher case routes via getEngine(\"mt_lora_dataset\") and calls buildDataset", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "mill_turn_lora_dataset_build"');
    expect(src).toMatch(/case "mill_turn_lora_dataset_build"[\s\S]{0,400}getEngine\("mt_lora_dataset"\)/);
    expect(src).toMatch(/case "mill_turn_lora_dataset_build"[\s\S]{0,400}engine\.buildDataset/);
    expect(src).toMatch(/case "mill_turn_lora_dataset_build"[\s\S]{0,400}params\.split/);
  });

  it("getEngine factory lazy-imports MillTurnLoRADatasetBuilderEngine", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "mt_lora_dataset":');
    expect(src).toContain("MillTurnLoRADatasetBuilderEngine.js");
    expect(src).toContain("millTurnLoRADatasetBuilderEngine");
  });

  it("schema map exposes mill_turn_lora_dataset_build with jobs array", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("mill_turn_lora_dataset_build");
    expect(src).toMatch(/const mill_turn_lora_dataset_build\s*=\s*z[\s\S]{0,600}jobs:\s*z\.array/);
  });

  it("engine source: MillTurnLoRADatasetBuilderEngine exports the singleton + buildDataset method", () => {
    const enginePath = join(process.cwd(), "src/engines/MillTurnLoRADatasetBuilderEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const millTurnLoRADatasetBuilderEngine\s*=\s*new MillTurnLoRADatasetBuilderEngineImpl\(\)/);
    expect(src).toMatch(/buildDataset\(\s*jobs:\s*RawJob\[\]/);
  });
});

describe("U-MWB05 — mill_turn_lora_cadence_check wiring", () => {
  it("dispatcher case routes via getEngine(\"mt_lora_cadence\") and calls shouldTriggerRun", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "mill_turn_lora_cadence_check"');
    expect(src).toMatch(/case "mill_turn_lora_cadence_check"[\s\S]{0,400}getEngine\("mt_lora_cadence"\)/);
    expect(src).toMatch(/case "mill_turn_lora_cadence_check"[\s\S]{0,400}engine\.shouldTriggerRun/);
  });

  it("getEngine factory lazy-imports MillTurnLoRACadenceEngine", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "mt_lora_cadence":');
    expect(src).toContain("MillTurnLoRACadenceEngine.js");
    expect(src).toContain("millTurnLoRACadenceEngine");
  });

  it("schema map exposes mill_turn_lora_cadence_check as passthrough", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("mill_turn_lora_cadence_check");
    expect(src).toMatch(/const mill_turn_lora_cadence_check\s*=\s*z\s*\.\s*object\(\{\s*\}\)\s*\.\s*passthrough\(\)/);
  });

  it("engine source: MillTurnLoRACadenceEngine exports the singleton + shouldTriggerRun method", () => {
    const enginePath = join(process.cwd(), "src/engines/MillTurnLoRACadenceEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const millTurnLoRACadenceEngine\s*=\s*new MillTurnLoRACadenceEngineImpl\(\)/);
    expect(src).toMatch(/shouldTriggerRun\(\)/);
  });
});

describe("U-MWB06 — mill_turn_cam_generate wiring", () => {
  it("dispatcher case routes via getEngine(\"mt_cam\") and calls generate with operations + config", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "mill_turn_cam_generate"');
    expect(src).toMatch(/case "mill_turn_cam_generate"[\s\S]{0,600}getEngine\("mt_cam"\)/);
    expect(src).toMatch(/case "mill_turn_cam_generate"[\s\S]{0,600}engine\.generate\(operations,\s*config\)/);
    expect(src).toMatch(/case "mill_turn_cam_generate"[\s\S]{0,600}params\.operations/);
  });

  it("getEngine factory lazy-imports MillTurnCAMEngine", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "mt_cam":');
    expect(src).toContain("MillTurnCAMEngine.js");
    expect(src).toContain("millTurnCAMEngine");
  });

  it("schema map exposes mill_turn_cam_generate with operations + config + machine_type enum", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("mill_turn_cam_generate");
    expect(src).toMatch(/const mill_turn_cam_generate\s*=\s*z[\s\S]{0,1200}operations:\s*z[\s\S]{0,200}\.array/);
    expect(src).toMatch(/const mill_turn_cam_generate\s*=\s*z[\s\S]{0,1200}machine_type:\s*z\.enum\(\["mill_turn",\s*"swiss",\s*"vtl"\]\)/);
  });

  it("engine source: MillTurnCAMEngine exports the singleton + generate method", () => {
    const enginePath = join(process.cwd(), "src/engines/MillTurnCAMEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const millTurnCAMEngine\s*=\s*new MillTurnCAMEngine\(\)/);
    expect(src).toMatch(/generate\(\s*[\s\S]{0,200}operations:\s*MillTurnOperation\[\]/);
  });
});
