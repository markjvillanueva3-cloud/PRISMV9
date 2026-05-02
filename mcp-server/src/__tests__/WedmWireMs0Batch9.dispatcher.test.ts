/**
 * Round-trip dispatcher wiring tests for WEDM-WIRE-MS0/Batch9:
 *   U-WWB22: wedm_neighbor_nearest      → WEDMNeighborQueryEngine.nearestForCell (cell + optional opts)
 *   U-WWB23: wedm_neural_formula_fuse   → WEDMNeuralFormulaFusionEngine.fuse (estimators[] + ctx)
 *   U-WWB24: wedm_ml_observe            → WEDMMLParameterOptimizerEngine.addObservation (sessionId + observation)
 *
 * Notable shape variations:
 *   - WWB22: 2-arg with optional opts
 *   - WWB23: array of estimators + context object
 *   - WWB24: takes a string sessionId as the first arg (not an object)
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const DISPATCHER_PATH = join(process.cwd(), "src/tools/dispatchers/camDispatcher.ts");
const SCHEMA_PATH = join(process.cwd(), "src/schemas/camActionSchemas.ts");

describe("WEDM-WIRE-MS0/Batch9 — action enum membership", () => {
  it("camDispatcher ACTIONS array includes the 3 new actions", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('"wedm_neighbor_nearest"');
    expect(src).toContain('"wedm_neural_formula_fuse"');
    expect(src).toContain('"wedm_ml_observe"');
  });

  it("the WEDM-WIRE-MS0/Batch9 milestone tag is present in the enum block", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain("WEDM-WIRE-MS0/Batch9: neighbor query + formula fusion + ML observation");
  });
});

describe("U-WWB22 — wedm_neighbor_nearest wiring (cell + optional opts)", () => {
  it("dispatcher case lazy-imports WEDMNeighborQueryEngine and calls nearestForCell", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "wedm_neighbor_nearest"');
    expect(src).toContain("WEDMNeighborQueryEngine.js");
    expect(src).toContain("wedmNeighborQueryEngine.nearestForCell");
  });

  it("case handler validates cell + forwards optional opts + wraps in try/catch", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "wedm_neighbor_nearest"[\s\S]{0,1000}cell required \(CellQuery\)/);
    expect(src).toMatch(/case "wedm_neighbor_nearest"[\s\S]{0,1000}opts/);
    expect(src).toMatch(/case "wedm_neighbor_nearest"[\s\S]{0,1000}try\s*\{[\s\S]{0,500}catch\s*\(err\)/);
  });

  it("schema map exposes wedm_neighbor_nearest with cell:record + optional opts:record", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("wedm_neighbor_nearest:");
    expect(src).toMatch(/wedm_neighbor_nearest:\s*z\.object\(\{[\s\S]{0,500}cell:\s*z\.record\(z\.string\(\),\s*z\.unknown\(\)\)/);
    expect(src).toMatch(/wedm_neighbor_nearest:\s*z\.object\(\{[\s\S]{0,800}opts:\s*z\.record\(z\.string\(\),\s*z\.unknown\(\)\)\.optional/);
  });

  it("engine source: WEDMNeighborQueryEngine exports the singleton + nearestForCell method", () => {
    const enginePath = join(process.cwd(), "src/engines/WEDMNeighborQueryEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const wedmNeighborQueryEngine\s*=\s*new WEDMNeighborQueryEngine\(\)/);
    expect(src).toMatch(/nearestForCell\(\s*cell:\s*CellQuery\s*,\s*opts:/);
  });
});

describe("U-WWB23 — wedm_neural_formula_fuse wiring (estimators[] + ctx)", () => {
  it("dispatcher case lazy-imports WEDMNeuralFormulaFusionEngine and calls fuse", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "wedm_neural_formula_fuse"');
    expect(src).toContain("WEDMNeuralFormulaFusionEngine.js");
    expect(src).toContain("wedmNeuralFormulaFusionEngine.fuse");
  });

  it("case handler validates estimators array + ctx + wraps in try/catch", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "wedm_neural_formula_fuse"[\s\S]{0,1500}estimators array required \(FormulaEstimate\[\]\)/);
    expect(src).toMatch(/case "wedm_neural_formula_fuse"[\s\S]{0,1500}ctx required \(FusionContext\)/);
    expect(src).toMatch(/case "wedm_neural_formula_fuse"[\s\S]{0,1500}try\s*\{[\s\S]{0,500}catch\s*\(err\)/);
  });

  it("schema map exposes wedm_neural_formula_fuse with estimators:array(≥1) + ctx:record", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("wedm_neural_formula_fuse:");
    expect(src).toMatch(/wedm_neural_formula_fuse:\s*z\.object\(\{[\s\S]{0,800}estimators:\s*z\.array\(z\.record\(z\.string\(\),\s*z\.unknown\(\)\)\)\.min\(1\)/);
    expect(src).toMatch(/wedm_neural_formula_fuse:\s*z\.object\(\{[\s\S]{0,800}ctx:\s*z\.record\(z\.string\(\),\s*z\.unknown\(\)\)/);
  });

  it("engine source: WEDMNeuralFormulaFusionEngine exports the singleton + fuse method", () => {
    const enginePath = join(process.cwd(), "src/engines/WEDMNeuralFormulaFusionEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const wedmNeuralFormulaFusionEngine\s*=\s*new WEDMNeuralFormulaFusionEngine\(\)/);
    expect(src).toMatch(/fuse\(\s*estimators:\s*FormulaEstimate\[\]\s*,\s*ctx:\s*FusionContext\s*\):\s*FusedResult/);
  });
});

describe("U-WWB24 — wedm_ml_observe wiring (sessionId string + observation object)", () => {
  it("dispatcher case lazy-imports WEDMMLParameterOptimizerEngine and calls addObservation", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "wedm_ml_observe"');
    expect(src).toContain("WEDMMLParameterOptimizerEngine.js");
    expect(src).toContain("wedmMLParameterOptimizerEngine.addObservation");
  });

  it("case handler validates session_id is a non-empty string AND observation object AND wraps in try/catch", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "wedm_ml_observe"[\s\S]{0,1500}session_id non-empty string required/);
    expect(src).toMatch(/case "wedm_ml_observe"[\s\S]{0,1500}observation required \(WEDMObservation\)/);
    expect(src).toMatch(/case "wedm_ml_observe"[\s\S]{0,1500}typeof sessionId !== "string"/);
    expect(src).toMatch(/case "wedm_ml_observe"[\s\S]{0,1500}try\s*\{[\s\S]{0,500}catch\s*\(err\)/);
  });

  it("schema map exposes wedm_ml_observe with session_id:string(min 1) + observation:record", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("wedm_ml_observe:");
    expect(src).toMatch(/wedm_ml_observe:\s*z\.object\(\{[\s\S]{0,800}session_id:\s*z\.string\(\)\.min\(1\)/);
    expect(src).toMatch(/wedm_ml_observe:\s*z\.object\(\{[\s\S]{0,800}observation:\s*z\.record\(z\.string\(\),\s*z\.unknown\(\)\)/);
  });

  it("engine source: WEDMMLParameterOptimizerEngine exports the singleton + addObservation method", () => {
    const enginePath = join(process.cwd(), "src/engines/WEDMMLParameterOptimizerEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const wedmMLParameterOptimizerEngine\s*=\s*new WEDMMLParameterOptimizerEngine\(\)/);
    expect(src).toMatch(/addObservation\(\s*sessionId:\s*string\s*,\s*observation:\s*WEDMObservation\s*\):\s*WEDMOptimizationResult/);
  });
});
