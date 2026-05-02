/**
 * Round-trip dispatcher wiring tests for LATHE-WIRE-MS0/Batch18:
 *   U-LWB49: lathe_lora_refinement_start    → LatheLoRAAdaptiveRefinementEngine.startSession
 *   U-LWB50: lathe_lora_deploy_register     → LatheLoRADeploymentEngine.registerTarget
 *   U-LWB51: lathe_lora_benchmark_test_cases → LatheLoRABenchmarkSuiteEngine.getTestCases + getConfig
 *
 * Three previously-unwired Lathe LoRA engines:
 *   - Adaptive refinement: opens a multi-iteration RefinementSession from query + initial response
 *   - Deployment registry: registers DeploymentTarget for canary-aware LoRA model rollout
 *   - Benchmark suite: returns current test case collection + config snapshot
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const DISPATCHER_PATH = join(process.cwd(), "src/tools/dispatchers/turningDispatcher.ts");
const SCHEMA_PATH = join(process.cwd(), "src/schemas/turningActionSchemas.ts");

describe("LATHE-WIRE-MS0/Batch18 — action enum membership", () => {
  it("turningDispatcher ACTIONS array includes the 3 new actions", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('"lathe_lora_refinement_start"');
    expect(src).toContain('"lathe_lora_deploy_register"');
    expect(src).toContain('"lathe_lora_benchmark_test_cases"');
  });

  it("the LATHE-WIRE-MS0/Batch18 milestone tag is present in the enum block", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain("LATHE-WIRE-MS0/Batch18: LoRA refinement + deployment + benchmark suite");
  });
});

describe("U-LWB49 — lathe_lora_refinement_start wiring", () => {
  it("dispatcher case lazy-imports LatheLoRAAdaptiveRefinementEngine and calls startSession", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "lathe_lora_refinement_start"');
    expect(src).toContain("LatheLoRAAdaptiveRefinementEngine.js");
    expect(src).toContain("latheLoRAAdaptiveRefinementEngine.startSession");
    expect(src).toMatch(/case "lathe_lora_refinement_start"[\s\S]{0,1500}startSession\(query,\s*initialResponse\)/);
  });

  it("case validates input.query AND input.initialResponse are non-empty strings", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "lathe_lora_refinement_start"[\s\S]{0,1500}input\.query \(string\) and input\.initialResponse \(string\) required/);
    expect(src).toMatch(/case "lathe_lora_refinement_start"[\s\S]{0,1500}\(err as Error\)\.message/);
  });

  it("schema map exposes lathe_lora_refinement_start with input:record", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("lathe_lora_refinement_start:");
    expect(src).toMatch(/lathe_lora_refinement_start:\s*z\.object\(\{[\s\S]{0,500}input:\s*z\.record\(z\.string\(\),\s*z\.unknown\(\)\)/);
  });

  it("engine source: LatheLoRAAdaptiveRefinementEngine exports the singleton + startSession method", () => {
    const enginePath = join(process.cwd(), "src/engines/LatheLoRAAdaptiveRefinementEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const latheLoRAAdaptiveRefinementEngine\s*=\s*new LatheLoRAAdaptiveRefinementEngine\(\)/);
    expect(src).toMatch(/startSession\(\s*query:\s*string,\s*initialResponse:\s*string\s*\):\s*RefinementSession/);
  });
});

describe("U-LWB50 — lathe_lora_deploy_register wiring", () => {
  it("dispatcher case lazy-imports LatheLoRADeploymentEngine and calls registerTarget", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "lathe_lora_deploy_register"');
    expect(src).toContain("LatheLoRADeploymentEngine.js");
    expect(src).toContain("latheLoRADeploymentEngine.registerTarget");
  });

  it("case handler validates input AND wraps engine call in try/catch", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "lathe_lora_deploy_register"[\s\S]{0,800}input required \(DeploymentTarget\)/);
    expect(src).toMatch(/case "lathe_lora_deploy_register"[\s\S]{0,800}try\s*\{[\s\S]{0,400}catch\s*\(err\)/);
    expect(src).toMatch(/case "lathe_lora_deploy_register"[\s\S]{0,800}\(err as Error\)\.message/);
  });

  it("schema map exposes lathe_lora_deploy_register with input:record", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("lathe_lora_deploy_register:");
    expect(src).toMatch(/lathe_lora_deploy_register:\s*z\.object\(\{[\s\S]{0,500}input:\s*z\.record\(z\.string\(\),\s*z\.unknown\(\)\)/);
  });

  it("engine source: LatheLoRADeploymentEngine exports the singleton + registerTarget method", () => {
    const enginePath = join(process.cwd(), "src/engines/LatheLoRADeploymentEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const latheLoRADeploymentEngine\s*=\s*new LatheLoRADeploymentEngine\(\)/);
    expect(src).toMatch(/registerTarget\(\s*target:\s*DeploymentTarget\s*\):\s*DeploymentTarget/);
  });
});

describe("U-LWB51 — lathe_lora_benchmark_test_cases wiring", () => {
  it("dispatcher case lazy-imports LatheLoRABenchmarkSuiteEngine and returns getTestCases + getConfig", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "lathe_lora_benchmark_test_cases"');
    expect(src).toContain("LatheLoRABenchmarkSuiteEngine.js");
    expect(src).toContain("latheLoRABenchmarkSuiteEngine.getTestCases");
    expect(src).toMatch(/case "lathe_lora_benchmark_test_cases"[\s\S]{0,1500}latheLoRABenchmarkSuiteEngine\.getConfig\(\)/);
  });

  it("case wraps engine calls in try/catch", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "lathe_lora_benchmark_test_cases"[\s\S]{0,1500}try\s*\{[\s\S]{0,800}catch\s*\(err\)/);
    expect(src).toMatch(/case "lathe_lora_benchmark_test_cases"[\s\S]{0,1500}\(err as Error\)\.message/);
  });

  it("schema map exposes lathe_lora_benchmark_test_cases as no-input passthrough", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("lathe_lora_benchmark_test_cases:");
    expect(src).toMatch(/lathe_lora_benchmark_test_cases:\s*z\.object\(\{\s*\}\)\.passthrough\(\)/);
  });

  it("engine source: LatheLoRABenchmarkSuiteEngine exports the singleton + getTestCases method", () => {
    const enginePath = join(process.cwd(), "src/engines/LatheLoRABenchmarkSuiteEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const latheLoRABenchmarkSuiteEngine\s*=\s*new LatheLoRABenchmarkSuiteEngine\(\)/);
    expect(src).toMatch(/getTestCases\(\):\s*BenchmarkTestCase\[\]/);
  });
});
