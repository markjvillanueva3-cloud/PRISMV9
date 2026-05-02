/**
 * Round-trip dispatcher wiring tests for WEDM-WIRE-MS0/Batch18:
 *   U-WWB49: wedm_adaptive_pass_strategy → WEDMAdaptivePassEngine.generateStrategy
 *   U-WWB50: wedm_fewshot_plan_first_cut → WEDMFewShotEngine.planFirstCut
 *   U-WWB51: edm_quality_plan_cmm        → EDMQualityOrchestratorEngine.planCMMRoutine
 *
 * Three previously-unwired EDM/WEDM engines:
 *   - Adaptive pass strategy: tolerance-class-aware multi-pass strategy with offset distribution
 *   - Few-shot first cut: k-NN nearest-neighbor recipe blending for unknown materials
 *   - EDM quality CMM planner: generates CMM probe points from quality verification input
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const DISPATCHER_PATH = join(process.cwd(), "src/tools/dispatchers/camDispatcher.ts");
const SCHEMA_PATH = join(process.cwd(), "src/schemas/camActionSchemas.ts");

describe("WEDM-WIRE-MS0/Batch18 — action enum membership", () => {
  it("camDispatcher ACTIONS array includes the 3 new actions", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('"wedm_adaptive_pass_strategy"');
    expect(src).toContain('"wedm_fewshot_plan_first_cut"');
    expect(src).toContain('"edm_quality_plan_cmm"');
  });

  it("the WEDM-WIRE-MS0/Batch18 milestone tag is present in the enum block", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain("WEDM-WIRE-MS0/Batch18: adaptive pass + few-shot + EDM CMM");
  });
});

describe("U-WWB49 — wedm_adaptive_pass_strategy wiring", () => {
  it("dispatcher case lazy-imports WEDMAdaptivePassEngine and calls generateStrategy", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "wedm_adaptive_pass_strategy"');
    expect(src).toContain("WEDMAdaptivePassEngine.js");
    expect(src).toContain("wedmAdaptivePassEngine.generateStrategy");
  });

  it("case handler validates input AND wraps engine call in try/catch", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "wedm_adaptive_pass_strategy"[\s\S]{0,800}input required \(AdaptivePassInput\)/);
    expect(src).toMatch(/case "wedm_adaptive_pass_strategy"[\s\S]{0,800}try\s*\{[\s\S]{0,400}catch\s*\(err\)/);
    expect(src).toMatch(/case "wedm_adaptive_pass_strategy"[\s\S]{0,800}\(err as Error\)\.message/);
  });

  it("schema map exposes wedm_adaptive_pass_strategy with input:record", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("wedm_adaptive_pass_strategy:");
    expect(src).toMatch(/wedm_adaptive_pass_strategy:\s*z\.object\(\{[\s\S]{0,500}input:\s*z\.record\(z\.string\(\),\s*z\.unknown\(\)\)/);
  });

  it("engine source: WEDMAdaptivePassEngine exports the singleton + generateStrategy method", () => {
    const enginePath = join(process.cwd(), "src/engines/WEDMAdaptivePassEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const wedmAdaptivePassEngine\s*=\s*new WEDMAdaptivePassEngine\(\)/);
    expect(src).toMatch(/generateStrategy\(\s*input:\s*AdaptivePassInput\s*\):\s*AdaptivePassResult/);
  });
});

describe("U-WWB50 — wedm_fewshot_plan_first_cut wiring", () => {
  it("dispatcher case lazy-imports WEDMFewShotEngine and calls planFirstCut(features, target)", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "wedm_fewshot_plan_first_cut"');
    expect(src).toContain("WEDMFewShotEngine.js");
    expect(src).toContain("wedmFewShotEngine.planFirstCut");
    expect(src).toMatch(/case "wedm_fewshot_plan_first_cut"[\s\S]{0,1500}wedmFewShotEngine\.planFirstCut\(\s*features[\s\S]{0,200}target/);
  });

  it("case validates input.features AND input.target are objects", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "wedm_fewshot_plan_first_cut"[\s\S]{0,1500}input required \(\{features, target\}\)/);
    expect(src).toMatch(/case "wedm_fewshot_plan_first_cut"[\s\S]{0,1500}input\.features \(UnknownMaterialFeatures\) and input\.target \(WEDMCutTarget\) required/);
  });

  it("schema map exposes wedm_fewshot_plan_first_cut with input:record", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("wedm_fewshot_plan_first_cut:");
    expect(src).toMatch(/wedm_fewshot_plan_first_cut:\s*z\.object\(\{[\s\S]{0,500}input:\s*z\.record\(z\.string\(\),\s*z\.unknown\(\)\)/);
  });

  it("engine source: WEDMFewShotEngine exports the singleton + planFirstCut method", () => {
    const enginePath = join(process.cwd(), "src/engines/WEDMFewShotEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const wedmFewShotEngine\s*=\s*new WEDMFewShotEngine\(\)/);
    expect(src).toMatch(/planFirstCut\(\s*[\s\S]{0,300}features:\s*UnknownMaterialFeatures,[\s\S]{0,300}target:\s*WEDMCutTarget/);
  });
});

describe("U-WWB51 — edm_quality_plan_cmm wiring", () => {
  it("dispatcher case lazy-imports EDMQualityOrchestratorEngine and calls planCMMRoutine", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "edm_quality_plan_cmm"');
    expect(src).toContain("EDMQualityOrchestratorEngine.js");
    expect(src).toContain("edmQualityOrchestratorEngine.planCMMRoutine");
  });

  it("case handler validates input AND wraps engine call in try/catch with probe_points wrapper", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "edm_quality_plan_cmm"[\s\S]{0,800}input required \(QualityVerificationInput\)/);
    expect(src).toMatch(/case "edm_quality_plan_cmm"[\s\S]{0,800}probe_points:\s*edmQualityOrchestratorEngine\.planCMMRoutine/);
    expect(src).toMatch(/case "edm_quality_plan_cmm"[\s\S]{0,800}\(err as Error\)\.message/);
  });

  it("schema map exposes edm_quality_plan_cmm with input:record", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("edm_quality_plan_cmm:");
    expect(src).toMatch(/edm_quality_plan_cmm:\s*z\.object\(\{[\s\S]{0,500}input:\s*z\.record\(z\.string\(\),\s*z\.unknown\(\)\)/);
  });

  it("engine source: EDMQualityOrchestratorEngine exports the singleton + planCMMRoutine method", () => {
    const enginePath = join(process.cwd(), "src/engines/EDMQualityOrchestratorEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const edmQualityOrchestratorEngine\s*=\s*new EDMQualityOrchestratorEngine\(\)/);
    expect(src).toMatch(/planCMMRoutine\(\s*input:\s*QualityVerificationInput\s*\):\s*CMMProbePoint\[\]/);
  });
});
