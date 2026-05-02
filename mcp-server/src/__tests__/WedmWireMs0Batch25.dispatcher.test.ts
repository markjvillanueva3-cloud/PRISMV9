/**
 * Round-trip dispatcher wiring tests for WEDM-WIRE-MS0/Batch25:
 *   U-WWB70: wedm_taper_error_budget    → WEDMTaperErrorBudgetEngine.calculate
 *   U-WWB71: wedm_weibull_failure_prob  → WEDMWeibullWireLifeEngine.failureProbability
 *   U-WWB72: wedm_spark_erosion_calc    → WEDMSparkErosionModelEngine.calculate
 *
 * Three previously-unwired WEDM physics/reliability engines:
 *   - Taper error budget: computes max allowable taper drift given tolerance
 *   - Weibull wire life: failure probability at given time from beta + eta
 *   - Spark erosion model: pulse-energy → MRR with material-aware coefficients
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const DISPATCHER_PATH = join(process.cwd(), "src/tools/dispatchers/camDispatcher.ts");
const SCHEMA_PATH = join(process.cwd(), "src/schemas/camActionSchemas.ts");

describe("WEDM-WIRE-MS0/Batch25 — action enum membership", () => {
  it("camDispatcher ACTIONS array includes the 3 new actions", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('"wedm_taper_error_budget"');
    expect(src).toContain('"wedm_weibull_failure_prob"');
    expect(src).toContain('"wedm_spark_erosion_calc"');
  });

  it("the WEDM-WIRE-MS0/Batch25 milestone tag is present in the enum block", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain("WEDM-WIRE-MS0/Batch25: taper budget + Weibull wire life + spark erosion");
  });
});

describe("U-WWB70 — wedm_taper_error_budget wiring", () => {
  it("dispatcher case lazy-imports WEDMTaperErrorBudgetEngine and calls calculate", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "wedm_taper_error_budget"');
    expect(src).toContain("WEDMTaperErrorBudgetEngine.js");
    expect(src).toContain("wedmTaperErrorBudgetEngine.calculate");
  });

  it("case handler validates input AND wraps engine call in try/catch", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "wedm_taper_error_budget"[\s\S]{0,800}input required \(TaperErrorBudgetInput\)/);
    expect(src).toMatch(/case "wedm_taper_error_budget"[\s\S]{0,800}\(err as Error\)\.message/);
  });

  it("schema map exposes wedm_taper_error_budget with input:record", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("wedm_taper_error_budget:");
    expect(src).toMatch(/wedm_taper_error_budget:\s*z\.object\(\{[\s\S]{0,500}input:\s*z\.record\(z\.string\(\),\s*z\.unknown\(\)\)/);
  });

  it("engine source: WEDMTaperErrorBudgetEngine exports the singleton + calculate method", () => {
    const enginePath = join(process.cwd(), "src/engines/WEDMTaperErrorBudgetEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const wedmTaperErrorBudgetEngine\s*=\s*new WEDMTaperErrorBudgetEngine\(\)/);
    expect(src).toMatch(/calculate\(\s*input:\s*TaperErrorBudgetInput\s*\):\s*TaperErrorBudgetResult/);
  });
});

describe("U-WWB71 — wedm_weibull_failure_prob wiring", () => {
  it("dispatcher case lazy-imports WEDMWeibullWireLifeEngine and calls failureProbability", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "wedm_weibull_failure_prob"');
    expect(src).toContain("WEDMWeibullWireLifeEngine.js");
    expect(src).toContain("wedmWeibullWireLifeEngine.failureProbability");
  });

  it("case handler validates input AND wraps engine call in try/catch", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "wedm_weibull_failure_prob"[\s\S]{0,800}input required \(FailureProbabilityInput\)/);
    expect(src).toMatch(/case "wedm_weibull_failure_prob"[\s\S]{0,800}\(err as Error\)\.message/);
  });

  it("schema map exposes wedm_weibull_failure_prob with input:record", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("wedm_weibull_failure_prob:");
    expect(src).toMatch(/wedm_weibull_failure_prob:\s*z\.object\(\{[\s\S]{0,500}input:\s*z\.record\(z\.string\(\),\s*z\.unknown\(\)\)/);
  });

  it("engine source: WEDMWeibullWireLifeEngine exports the singleton + failureProbability method", () => {
    const enginePath = join(process.cwd(), "src/engines/WEDMWeibullWireLifeEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const wedmWeibullWireLifeEngine\s*=\s*new WEDMWeibullWireLifeEngine\(\)/);
    expect(src).toMatch(/failureProbability\(\s*input:\s*FailureProbabilityInput\s*\):\s*FailureProbabilityResult/);
  });
});

describe("U-WWB72 — wedm_spark_erosion_calc wiring", () => {
  it("dispatcher case lazy-imports WEDMSparkErosionModelEngine and calls calculate", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "wedm_spark_erosion_calc"');
    expect(src).toContain("WEDMSparkErosionModelEngine.js");
    expect(src).toContain("wedmSparkErosionModelEngine.calculate");
  });

  it("case handler validates input AND wraps engine call in try/catch", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "wedm_spark_erosion_calc"[\s\S]{0,800}input required \(SparkErosionInput\)/);
    expect(src).toMatch(/case "wedm_spark_erosion_calc"[\s\S]{0,800}\(err as Error\)\.message/);
  });

  it("schema map exposes wedm_spark_erosion_calc with input:record", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("wedm_spark_erosion_calc:");
    expect(src).toMatch(/wedm_spark_erosion_calc:\s*z\.object\(\{[\s\S]{0,500}input:\s*z\.record\(z\.string\(\),\s*z\.unknown\(\)\)/);
  });

  it("engine source: WEDMSparkErosionModelEngine exports the singleton + calculate method", () => {
    const enginePath = join(process.cwd(), "src/engines/WEDMSparkErosionModelEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const wedmSparkErosionModelEngine\s*=\s*new WEDMSparkErosionModelEngine\(\)/);
    expect(src).toMatch(/calculate\(\s*input:\s*SparkErosionInput\s*\):\s*SparkErosionResult/);
  });
});
