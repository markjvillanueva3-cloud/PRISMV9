/**
 * Round-trip dispatcher wiring tests for LATHE-WIRE-MS0/Batch26:
 *   U-LWB73: lathe_lora_kg_top_connected   → LatheLoRAKnowledgeGraphEngine.getTopConnected
 *   U-LWB74: lathe_lora_quant_formats      → LatheLoRAQuantizationOptimizerEngine.getFormats + getGGUFLevels
 *   U-LWB75: lathe_lora_reward_config      → LatheLoRARewardShapingEngine.getConfig
 *
 * Three more previously-unwired Lathe LoRA infrastructure engines:
 *   - Knowledge graph: returns top-N most-connected nodes
 *   - Quantization optimizer: returns supported quantization formats + GGUF levels
 *   - Reward shaping: returns current reward shaping config
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const DISPATCHER_PATH = join(process.cwd(), "src/tools/dispatchers/turningDispatcher.ts");
const SCHEMA_PATH = join(process.cwd(), "src/schemas/turningActionSchemas.ts");

describe("LATHE-WIRE-MS0/Batch26 — action enum membership", () => {
  it("turningDispatcher ACTIONS array includes the 3 new actions", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('"lathe_lora_kg_top_connected"');
    expect(src).toContain('"lathe_lora_quant_formats"');
    expect(src).toContain('"lathe_lora_reward_config"');
  });

  it("the LATHE-WIRE-MS0/Batch26 milestone tag is present in the enum block", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain("LATHE-WIRE-MS0/Batch26: knowledge graph + quantization optimizer + reward shaping");
  });
});

describe("U-LWB73 — lathe_lora_kg_top_connected wiring", () => {
  it("dispatcher case lazy-imports LatheLoRAKnowledgeGraphEngine and calls getTopConnected", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "lathe_lora_kg_top_connected"');
    expect(src).toContain("LatheLoRAKnowledgeGraphEngine.js");
    expect(src).toContain("latheLoRAKnowledgeGraphEngine.getTopConnected");
  });

  it("case defaults limit=10 when missing AND wraps engine call in try/catch", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "lathe_lora_kg_top_connected"[\s\S]{0,1000}input\.limit[\s\S]{0,200}\?\s*input\.limit\s*:\s*10/);
    expect(src).toMatch(/case "lathe_lora_kg_top_connected"[\s\S]{0,1000}\(err as Error\)\.message/);
  });

  it("schema map exposes lathe_lora_kg_top_connected with input:record", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("lathe_lora_kg_top_connected:");
    expect(src).toMatch(/lathe_lora_kg_top_connected:\s*z\.object\(\{[\s\S]{0,500}input:\s*z\.record\(z\.string\(\),\s*z\.unknown\(\)\)/);
  });

  it("engine source: LatheLoRAKnowledgeGraphEngine exports the singleton + getTopConnected method", () => {
    const enginePath = join(process.cwd(), "src/engines/LatheLoRAKnowledgeGraphEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const latheLoRAKnowledgeGraphEngine\s*=\s*new LatheLoRAKnowledgeGraphEngine\(\)/);
    expect(src).toMatch(/getTopConnected\(\s*limit:\s*number\s*=\s*10\s*\):/);
  });
});

describe("U-LWB74 — lathe_lora_quant_formats wiring", () => {
  it("dispatcher case lazy-imports LatheLoRAQuantizationOptimizerEngine and calls getFormats + getGGUFLevels", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "lathe_lora_quant_formats"');
    expect(src).toContain("LatheLoRAQuantizationOptimizerEngine.js");
    expect(src).toContain("latheLoRAQuantizationOptimizerEngine.getFormats");
    expect(src).toMatch(/case "lathe_lora_quant_formats"[\s\S]{0,1500}latheLoRAQuantizationOptimizerEngine\.getGGUFLevels/);
  });

  it("case wraps engine calls in try/catch", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "lathe_lora_quant_formats"[\s\S]{0,1500}try\s*\{[\s\S]{0,500}catch\s*\(err\)/);
    expect(src).toMatch(/case "lathe_lora_quant_formats"[\s\S]{0,1500}\(err as Error\)\.message/);
  });

  it("schema map exposes lathe_lora_quant_formats as no-input passthrough", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("lathe_lora_quant_formats:");
    expect(src).toMatch(/lathe_lora_quant_formats:\s*z\.object\(\{\s*\}\)\.passthrough\(\)/);
  });

  it("engine source: LatheLoRAQuantizationOptimizerEngine exports the singleton + getFormats method", () => {
    const enginePath = join(process.cwd(), "src/engines/LatheLoRAQuantizationOptimizerEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const latheLoRAQuantizationOptimizerEngine\s*=\s*new LatheLoRAQuantizationOptimizerEngine\(\)/);
    expect(src).toMatch(/getFormats\(\):/);
  });
});

describe("U-LWB75 — lathe_lora_reward_config wiring", () => {
  it("dispatcher case lazy-imports LatheLoRARewardShapingEngine and calls getConfig", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "lathe_lora_reward_config"');
    expect(src).toContain("LatheLoRARewardShapingEngine.js");
    expect(src).toContain("latheLoRARewardShapingEngine.getConfig");
  });

  it("case wraps engine call in try/catch with config wrapper", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "lathe_lora_reward_config"[\s\S]{0,800}config:\s*latheLoRARewardShapingEngine\.getConfig/);
    expect(src).toMatch(/case "lathe_lora_reward_config"[\s\S]{0,800}\(err as Error\)\.message/);
  });

  it("schema map exposes lathe_lora_reward_config as no-input passthrough", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("lathe_lora_reward_config:");
    expect(src).toMatch(/lathe_lora_reward_config:\s*z\.object\(\{\s*\}\)\.passthrough\(\)/);
  });

  it("engine source: LatheLoRARewardShapingEngine exports the singleton + getConfig method", () => {
    const enginePath = join(process.cwd(), "src/engines/LatheLoRARewardShapingEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const latheLoRARewardShapingEngine\s*=\s*new LatheLoRARewardShapingEngine\(\)/);
    expect(src).toMatch(/getConfig\(\):\s*RewardConfig/);
  });
});
