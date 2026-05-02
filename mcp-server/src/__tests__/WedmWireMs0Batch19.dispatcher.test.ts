/**
 * Round-trip dispatcher wiring tests for WEDM-WIRE-MS0/Batch19:
 *   U-WWB52: wedm_autonomy_snapshot           → WEDMAutonomyEngine.snapshot
 *   U-WWB53: wedm_feature_importance_compute  → WEDMFeatureImportanceEngine.computeImportance
 *   U-WWB54: edm_bimaterial_optimize          → EDMBiMaterialCompensationEngine.optimize
 *
 * Three previously-unwired EDM/WEDM engines:
 *   - Autonomy: returns current AutonomyLevel + name + capability matrix snapshot
 *   - Feature importance: permutation-based importance for feature/outcome pairs (3-arg)
 *   - Bimaterial compensation: dual-material EDM parameter optimization (single-arg object)
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const DISPATCHER_PATH = join(process.cwd(), "src/tools/dispatchers/camDispatcher.ts");
const SCHEMA_PATH = join(process.cwd(), "src/schemas/camActionSchemas.ts");

describe("WEDM-WIRE-MS0/Batch19 — action enum membership", () => {
  it("camDispatcher ACTIONS array includes the 3 new actions", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('"wedm_autonomy_snapshot"');
    expect(src).toContain('"wedm_feature_importance_compute"');
    expect(src).toContain('"edm_bimaterial_optimize"');
  });

  it("the WEDM-WIRE-MS0/Batch19 milestone tag is present in the enum block", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain("WEDM-WIRE-MS0/Batch19: autonomy snapshot + feature importance + bimaterial");
  });
});

describe("U-WWB52 — wedm_autonomy_snapshot wiring", () => {
  it("dispatcher case lazy-imports WEDMAutonomyEngine and calls snapshot", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "wedm_autonomy_snapshot"');
    expect(src).toContain("WEDMAutonomyEngine.js");
    expect(src).toContain("wedmAutonomyEngine.snapshot");
  });

  it("case wraps engine call in try/catch", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "wedm_autonomy_snapshot"[\s\S]{0,800}try\s*\{[\s\S]{0,400}catch\s*\(err\)/);
    expect(src).toMatch(/case "wedm_autonomy_snapshot"[\s\S]{0,800}\(err as Error\)\.message/);
  });

  it("schema map exposes wedm_autonomy_snapshot as no-input passthrough", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("wedm_autonomy_snapshot:");
    expect(src).toMatch(/wedm_autonomy_snapshot:\s*z\.object\(\{\s*\}\)\.passthrough\(\)/);
  });

  it("engine source: WEDMAutonomyEngine exports the singleton + snapshot method", () => {
    const enginePath = join(process.cwd(), "src/engines/WEDMAutonomyEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const wedmAutonomyEngine\s*=\s*new WEDMAutonomyEngine\(\)/);
    expect(src).toMatch(/snapshot\(\):\s*AutonomySnapshot/);
  });
});

describe("U-WWB53 — wedm_feature_importance_compute wiring", () => {
  it("dispatcher case lazy-imports WEDMFeatureImportanceEngine and calls computeImportance", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "wedm_feature_importance_compute"');
    expect(src).toContain("WEDMFeatureImportanceEngine.js");
    expect(src).toContain("wedmFeatureImportanceEngine.computeImportance");
  });

  it("case validates input.data is array AND input.targetOutcome is string", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "wedm_feature_importance_compute"[\s\S]{0,2000}input required \(\{data, targetOutcome, options\?\}\)/);
    expect(src).toMatch(/case "wedm_feature_importance_compute"[\s\S]{0,2000}input\.data \(WEDMDataPoint\[\]\) and input\.targetOutcome \(OutcomeName\) required/);
    expect(src).toMatch(/case "wedm_feature_importance_compute"[\s\S]{0,2000}\(err as Error\)\.message/);
  });

  it("schema map exposes wedm_feature_importance_compute with input:record", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("wedm_feature_importance_compute:");
    expect(src).toMatch(/wedm_feature_importance_compute:\s*z\.object\(\{[\s\S]{0,500}input:\s*z\.record\(z\.string\(\),\s*z\.unknown\(\)\)/);
  });

  it("engine source: WEDMFeatureImportanceEngine exports the singleton + computeImportance method", () => {
    const enginePath = join(process.cwd(), "src/engines/WEDMFeatureImportanceEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const wedmFeatureImportanceEngine\s*=\s*new WEDMFeatureImportanceEngine\(\)/);
    expect(src).toMatch(/computeImportance\(\s*[\s\S]{0,300}data:\s*WEDMDataPoint\[\],[\s\S]{0,300}targetOutcome:\s*OutcomeName/);
  });
});

describe("U-WWB54 — edm_bimaterial_optimize wiring", () => {
  it("dispatcher case lazy-imports EDMBiMaterialCompensationEngine and calls optimize", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "edm_bimaterial_optimize"');
    expect(src).toContain("EDMBiMaterialCompensationEngine.js");
    expect(src).toContain("edmBiMaterialCompensationEngine.optimize");
  });

  it("case handler validates input AND wraps engine call in try/catch", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "edm_bimaterial_optimize"[\s\S]{0,800}input required \(BiMaterialOptimizeInput\)/);
    expect(src).toMatch(/case "edm_bimaterial_optimize"[\s\S]{0,800}try\s*\{[\s\S]{0,400}catch\s*\(err\)/);
    expect(src).toMatch(/case "edm_bimaterial_optimize"[\s\S]{0,800}\(err as Error\)\.message/);
  });

  it("schema map exposes edm_bimaterial_optimize with input:record", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("edm_bimaterial_optimize:");
    expect(src).toMatch(/edm_bimaterial_optimize:\s*z\.object\(\{[\s\S]{0,500}input:\s*z\.record\(z\.string\(\),\s*z\.unknown\(\)\)/);
  });

  it("engine source: EDMBiMaterialCompensationEngine exports the singleton + optimize method", () => {
    const enginePath = join(process.cwd(), "src/engines/EDMBiMaterialCompensationEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const edmBiMaterialCompensationEngine\s*=\s*new EDMBiMaterialCompensationEngine\(\)/);
    expect(src).toMatch(/optimize\(\s*input:\s*\{/);
  });
});
