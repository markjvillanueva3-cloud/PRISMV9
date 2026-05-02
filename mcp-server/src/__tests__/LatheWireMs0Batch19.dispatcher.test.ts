/**
 * Round-trip dispatcher wiring tests for LATHE-WIRE-MS0/Batch19:
 *   U-LWB52: lathe_lora_attention_stats        → LatheLoRAAttentionAnalyzerEngine.getStats + getConfig
 *   U-LWB53: lathe_lora_dataset_validate_one   → LatheLoRADatasetValidatorEngine.validateSingle
 *   U-LWB54: lathe_lora_example_gen_stats      → LatheLoRAExampleGeneratorEngine.getStats
 *
 * Three more previously-unwired Lathe LoRA engines:
 *   - Attention analyzer: aggregate attention-weight statistics across analyses
 *   - Dataset validator (single): per-example validation returning ValidationIssue[]
 *   - Example generator: rolling stats on synthetic example generation
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const DISPATCHER_PATH = join(process.cwd(), "src/tools/dispatchers/turningDispatcher.ts");
const SCHEMA_PATH = join(process.cwd(), "src/schemas/turningActionSchemas.ts");

describe("LATHE-WIRE-MS0/Batch19 — action enum membership", () => {
  it("turningDispatcher ACTIONS array includes the 3 new actions", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('"lathe_lora_attention_stats"');
    expect(src).toContain('"lathe_lora_dataset_validate_one"');
    expect(src).toContain('"lathe_lora_example_gen_stats"');
  });

  it("the LATHE-WIRE-MS0/Batch19 milestone tag is present in the enum block", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain("LATHE-WIRE-MS0/Batch19: LoRA attention + validator + example generator");
  });
});

describe("U-LWB52 — lathe_lora_attention_stats wiring", () => {
  it("dispatcher case lazy-imports LatheLoRAAttentionAnalyzerEngine and returns getStats + getConfig", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "lathe_lora_attention_stats"');
    expect(src).toContain("LatheLoRAAttentionAnalyzerEngine.js");
    expect(src).toContain("latheLoRAAttentionAnalyzerEngine.getStats");
    expect(src).toMatch(/case "lathe_lora_attention_stats"[\s\S]{0,1500}latheLoRAAttentionAnalyzerEngine\.getConfig\(\)/);
  });

  it("case wraps engine calls in try/catch", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "lathe_lora_attention_stats"[\s\S]{0,1500}try\s*\{[\s\S]{0,500}catch\s*\(err\)/);
    expect(src).toMatch(/case "lathe_lora_attention_stats"[\s\S]{0,1500}\(err as Error\)\.message/);
  });

  it("schema map exposes lathe_lora_attention_stats as no-input passthrough", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("lathe_lora_attention_stats:");
    expect(src).toMatch(/lathe_lora_attention_stats:\s*z\.object\(\{\s*\}\)\.passthrough\(\)/);
  });

  it("engine source: LatheLoRAAttentionAnalyzerEngine exports the singleton + getStats method", () => {
    const enginePath = join(process.cwd(), "src/engines/LatheLoRAAttentionAnalyzerEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const latheLoRAAttentionAnalyzerEngine\s*=\s*new LatheLoRAAttentionAnalyzerEngine\(\)/);
    expect(src).toMatch(/getStats\(\):/);
  });
});

describe("U-LWB53 — lathe_lora_dataset_validate_one wiring", () => {
  it("dispatcher case lazy-imports LatheLoRADatasetValidatorEngine and calls validateSingle", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "lathe_lora_dataset_validate_one"');
    expect(src).toContain("LatheLoRADatasetValidatorEngine.js");
    expect(src).toContain("latheLoRADatasetValidatorEngine.validateSingle");
  });

  it("case validates input AND wraps engine call in try/catch with issues wrapper", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "lathe_lora_dataset_validate_one"[\s\S]{0,800}input required \(LoRAExample \| TrainingExample\)/);
    expect(src).toMatch(/case "lathe_lora_dataset_validate_one"[\s\S]{0,800}issues:\s*latheLoRADatasetValidatorEngine\.validateSingle/);
    expect(src).toMatch(/case "lathe_lora_dataset_validate_one"[\s\S]{0,800}\(err as Error\)\.message/);
  });

  it("schema map exposes lathe_lora_dataset_validate_one with input:record", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("lathe_lora_dataset_validate_one:");
    expect(src).toMatch(/lathe_lora_dataset_validate_one:\s*z\.object\(\{[\s\S]{0,400}input:\s*z\.record\(z\.string\(\),\s*z\.unknown\(\)\)/);
  });

  it("engine source: LatheLoRADatasetValidatorEngine exports the singleton + validateSingle method", () => {
    const enginePath = join(process.cwd(), "src/engines/LatheLoRADatasetValidatorEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const latheLoRADatasetValidatorEngine\s*=\s*new LatheLoRADatasetValidatorEngine\(\)/);
    expect(src).toMatch(/validateSingle\(\s*example:\s*LoRAExample \| TrainingExample\s*\):\s*ValidationIssue\[\]/);
  });
});

describe("U-LWB54 — lathe_lora_example_gen_stats wiring", () => {
  it("dispatcher case lazy-imports LatheLoRAExampleGeneratorEngine and calls getStats", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "lathe_lora_example_gen_stats"');
    expect(src).toContain("LatheLoRAExampleGeneratorEngine.js");
    expect(src).toContain("latheLoRAExampleGeneratorEngine.getStats");
  });

  it("case wraps engine call in try/catch with stats wrapper", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "lathe_lora_example_gen_stats"[\s\S]{0,800}try\s*\{[\s\S]{0,400}catch\s*\(err\)/);
    expect(src).toMatch(/case "lathe_lora_example_gen_stats"[\s\S]{0,800}stats:\s*latheLoRAExampleGeneratorEngine\.getStats/);
    expect(src).toMatch(/case "lathe_lora_example_gen_stats"[\s\S]{0,800}\(err as Error\)\.message/);
  });

  it("schema map exposes lathe_lora_example_gen_stats as no-input passthrough", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("lathe_lora_example_gen_stats:");
    expect(src).toMatch(/lathe_lora_example_gen_stats:\s*z\.object\(\{\s*\}\)\.passthrough\(\)/);
  });

  it("engine source: LatheLoRAExampleGeneratorEngine exports the singleton + getStats method", () => {
    const enginePath = join(process.cwd(), "src/engines/LatheLoRAExampleGeneratorEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const latheLoRAExampleGeneratorEngine\s*=\s*new LatheLoRAExampleGeneratorEngine\(\)/);
    expect(src).toMatch(/getStats\(\):\s*GenerationStats/);
  });
});
