/**
 * Round-trip dispatcher wiring tests for WEDM-WIRE-MS0/Batch28:
 *   U-WWB79: edm_cost_estimate    → EDMCostDocumentationEngine.estimateCost
 *   U-WWB80: edm_parameter_calc   → EDMParameterEngine.calculate
 *   U-WWB81: edm_surface_assess   → EDMSurfaceIntegrityEngine.assess + validate
 *
 * Three previously-unwired EDM (non-WEDM) engines:
 *   - Cost documentation: line-itemized cost estimate from machine + wire + consumables
 *   - Parameter calc: per-operation EDM parameter calculation
 *   - Surface integrity: assess + validate cut surface integrity from cut params
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const DISPATCHER_PATH = join(process.cwd(), "src/tools/dispatchers/camDispatcher.ts");
const SCHEMA_PATH = join(process.cwd(), "src/schemas/camActionSchemas.ts");

describe("WEDM-WIRE-MS0/Batch28 — action enum membership", () => {
  it("camDispatcher ACTIONS array includes the 3 new actions", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('"edm_cost_estimate"');
    expect(src).toContain('"edm_parameter_calc"');
    expect(src).toContain('"edm_surface_assess"');
  });

  it("the WEDM-WIRE-MS0/Batch28 milestone tag is present in the enum block", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain("WEDM-WIRE-MS0/Batch28: EDM cost + EDM parameter + EDM surface integrity");
  });
});

describe("U-WWB79 — edm_cost_estimate wiring", () => {
  it("dispatcher case lazy-imports EDMCostDocumentationEngine and calls estimateCost", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "edm_cost_estimate"');
    expect(src).toContain("EDMCostDocumentationEngine.js");
    expect(src).toContain("edmCostDocumentationEngine.estimateCost");
  });

  it("case handler validates input AND wraps engine call in try/catch", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "edm_cost_estimate"[\s\S]{0,800}input required \(CostInput\)/);
    expect(src).toMatch(/case "edm_cost_estimate"[\s\S]{0,800}\(err as Error\)\.message/);
  });

  it("schema map exposes edm_cost_estimate with input:record", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("edm_cost_estimate:");
    expect(src).toMatch(/edm_cost_estimate:\s*z\.object\(\{[\s\S]{0,500}input:\s*z\.record\(z\.string\(\),\s*z\.unknown\(\)\)/);
  });

  it("engine source: EDMCostDocumentationEngine exports the singleton + estimateCost method", () => {
    const enginePath = join(process.cwd(), "src/engines/EDMCostDocumentationEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const edmCostDocumentationEngine\s*=\s*new EDMCostDocumentationEngine\(\)/);
    expect(src).toMatch(/estimateCost\(\s*input:\s*CostInput\s*\):\s*CostEstimate/);
  });
});

describe("U-WWB80 — edm_parameter_calc wiring", () => {
  it("dispatcher case lazy-imports EDMParameterEngine and calls calculate", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "edm_parameter_calc"');
    expect(src).toContain("EDMParameterEngine.js");
    expect(src).toContain("edmParameterEngine.calculate");
  });

  it("case handler validates input AND wraps engine call in try/catch", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "edm_parameter_calc"[\s\S]{0,800}input required \(EDMParameterInput\)/);
    expect(src).toMatch(/case "edm_parameter_calc"[\s\S]{0,800}\(err as Error\)\.message/);
  });

  it("schema map exposes edm_parameter_calc with input:record", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("edm_parameter_calc:");
    expect(src).toMatch(/edm_parameter_calc:\s*z\.object\(\{[\s\S]{0,500}input:\s*z\.record\(z\.string\(\),\s*z\.unknown\(\)\)/);
  });

  it("engine source: EDMParameterEngine exports the singleton + calculate method", () => {
    const enginePath = join(process.cwd(), "src/engines/EDMParameterEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const edmParameterEngine\s*=\s*new EDMParameterEngine\(\)/);
    expect(src).toMatch(/calculate\(\s*input:\s*EDMParameterInput\s*\):\s*EDMParameterResult/);
  });
});

describe("U-WWB81 — edm_surface_assess wiring", () => {
  it("dispatcher case lazy-imports EDMSurfaceIntegrityEngine and calls assess + validate", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "edm_surface_assess"');
    expect(src).toContain("EDMSurfaceIntegrityEngine.js");
    expect(src).toContain("edmSurfaceIntegrityEngine.assess");
    expect(src).toMatch(/case "edm_surface_assess"[\s\S]{0,1500}edmSurfaceIntegrityEngine\.validate/);
  });

  it("case validates input AND wraps engine call in try/catch", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "edm_surface_assess"[\s\S]{0,1500}input required \(EDMSurfaceInput\)/);
    expect(src).toMatch(/case "edm_surface_assess"[\s\S]{0,1500}\(err as Error\)\.message/);
  });

  it("schema map exposes edm_surface_assess with input:record", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("edm_surface_assess:");
    expect(src).toMatch(/edm_surface_assess:\s*z\.object\(\{[\s\S]{0,500}input:\s*z\.record\(z\.string\(\),\s*z\.unknown\(\)\)/);
  });

  it("engine source: EDMSurfaceIntegrityEngine exports the singleton + assess method", () => {
    const enginePath = join(process.cwd(), "src/engines/EDMSurfaceIntegrityEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const edmSurfaceIntegrityEngine\s*=\s*new EDMSurfaceIntegrityEngine\(\)/);
    expect(src).toMatch(/assess\(\s*input:\s*EDMSurfaceInput\s*\):\s*EDMSurfaceResult/);
  });
});
