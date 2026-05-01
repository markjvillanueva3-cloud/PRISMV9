/**
 * Round-trip dispatcher wiring tests for LATHE-WIRE-MS0/Batch5:
 *   U-LWB10: lathe_print_strategy_plan  → LathePrintFeatureStrategySelectorEngine.generateStrategyPlan
 *   U-LWB11: lathe_print_sequence_plan  → LathePrintSequencePlannerEngine.planSequence
 *   U-LWB12: lathe_print_setup_select   → LathePrintSetupSelectionEngine.selectSetup
 *
 * Multi-arg signatures (3-4 args). Tests verify all required-arg checks
 * are present in the dispatcher case bodies.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const DISPATCHER_PATH = join(process.cwd(), "src/tools/dispatchers/turningDispatcher.ts");
const SCHEMA_PATH = join(process.cwd(), "src/schemas/turningActionSchemas.ts");

describe("LATHE-WIRE-MS0/Batch5 — action enum membership", () => {
  it("turningDispatcher ACTIONS array includes the 3 new actions", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('"lathe_print_strategy_plan"');
    expect(src).toContain('"lathe_print_sequence_plan"');
    expect(src).toContain('"lathe_print_setup_select"');
  });

  it("the LATHE-WIRE-MS0/Batch5 milestone tag is present in the enum block", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain("LATHE-WIRE-MS0/Batch5: print pipeline (strategy plan + sequence plan + setup select)");
  });
});

describe("U-LWB10 — lathe_print_strategy_plan wiring (4-arg)", () => {
  it("dispatcher case lazy-imports LathePrintFeatureStrategySelectorEngine and calls generateStrategyPlan", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "lathe_print_strategy_plan"');
    expect(src).toContain("LathePrintFeatureStrategySelectorEngine.js");
    expect(src).toContain("lathePrintFeatureStrategySelectorEngine.generateStrategyPlan");
  });

  it("case handler validates features array AND material AND wraps in try/catch", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "lathe_print_strategy_plan"[\s\S]{0,1500}features array required \(FeatureInput\[\]\)/);
    expect(src).toMatch(/case "lathe_print_strategy_plan"[\s\S]{0,1500}material required \(MaterialInput\)/);
    expect(src).toMatch(/case "lathe_print_strategy_plan"[\s\S]{0,1500}try\s*\{[\s\S]{0,800}catch\s*\(err\)/);
  });

  it("schema map exposes lathe_print_strategy_plan with features:array + material:record + optional machine/tolerance", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("lathe_print_strategy_plan:");
    expect(src).toMatch(/lathe_print_strategy_plan:\s*z\.object\(\{[\s\S]{0,800}features:\s*z\.array\(z\.record\(z\.string\(\),\s*z\.unknown\(\)\)\)/);
    expect(src).toMatch(/lathe_print_strategy_plan:\s*z\.object\(\{[\s\S]{0,800}material:\s*z\.record\(z\.string\(\),\s*z\.unknown\(\)\)/);
    expect(src).toMatch(/lathe_print_strategy_plan:\s*z\.object\(\{[\s\S]{0,1200}machine:\s*z\.record\(z\.string\(\),\s*z\.unknown\(\)\)\.optional/);
  });

  it("engine source: LathePrintFeatureStrategySelectorEngine exports the singleton + generateStrategyPlan method", () => {
    const enginePath = join(process.cwd(), "src/engines/LathePrintFeatureStrategySelectorEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const lathePrintFeatureStrategySelectorEngine\s*=\s*new LathePrintFeatureStrategySelectorEngine\(\)/);
    expect(src).toMatch(/generateStrategyPlan\(/);
  });
});

describe("U-LWB11 — lathe_print_sequence_plan wiring (3-arg)", () => {
  it("dispatcher case lazy-imports LathePrintSequencePlannerEngine and calls planSequence", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "lathe_print_sequence_plan"');
    expect(src).toContain("LathePrintSequencePlannerEngine.js");
    expect(src).toContain("lathePrintSequencePlannerEngine.planSequence");
  });

  it("case handler validates strategy_plan AND stock AND features array AND wraps in try/catch", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "lathe_print_sequence_plan"[\s\S]{0,1500}strategy_plan required \(StrategyPlan\)/);
    expect(src).toMatch(/case "lathe_print_sequence_plan"[\s\S]{0,1500}stock required \(StockInput\)/);
    expect(src).toMatch(/case "lathe_print_sequence_plan"[\s\S]{0,1500}features array required \(FeatureInput\[\]\)/);
    expect(src).toMatch(/case "lathe_print_sequence_plan"[\s\S]{0,1500}try\s*\{[\s\S]{0,500}catch\s*\(err\)/);
  });

  it("schema map exposes lathe_print_sequence_plan with strategy_plan + stock + features", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("lathe_print_sequence_plan:");
    expect(src).toMatch(/lathe_print_sequence_plan:\s*z\.object\(\{[\s\S]{0,800}strategy_plan:\s*z\.record\(z\.string\(\),\s*z\.unknown\(\)\)/);
    expect(src).toMatch(/lathe_print_sequence_plan:\s*z\.object\(\{[\s\S]{0,800}stock:\s*z\.record\(z\.string\(\),\s*z\.unknown\(\)\)/);
    expect(src).toMatch(/lathe_print_sequence_plan:\s*z\.object\(\{[\s\S]{0,800}features:\s*z\.array\(z\.record\(z\.string\(\),\s*z\.unknown\(\)\)\)/);
  });

  it("engine source: LathePrintSequencePlannerEngine exports the singleton + planSequence method", () => {
    const enginePath = join(process.cwd(), "src/engines/LathePrintSequencePlannerEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const lathePrintSequencePlannerEngine\s*=\s*new LathePrintSequencePlannerEngine\(\)/);
    expect(src).toMatch(/planSequence\(/);
  });
});

describe("U-LWB12 — lathe_print_setup_select wiring (4-arg)", () => {
  it("dispatcher case lazy-imports LathePrintSetupSelectionEngine and calls selectSetup", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "lathe_print_setup_select"');
    expect(src).toContain("LathePrintSetupSelectionEngine.js");
    expect(src).toContain("lathePrintSetupSelectionEngine.selectSetup");
  });

  it("case handler validates geometry AND material AND loads AND wraps in try/catch", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "lathe_print_setup_select"[\s\S]{0,1500}geometry required \(PartGeometry\)/);
    expect(src).toMatch(/case "lathe_print_setup_select"[\s\S]{0,1500}material required \(MaterialInput\)/);
    expect(src).toMatch(/case "lathe_print_setup_select"[\s\S]{0,1500}loads required \(CuttingLoadInput\)/);
    expect(src).toMatch(/case "lathe_print_setup_select"[\s\S]{0,1500}try\s*\{[\s\S]{0,800}catch\s*\(err\)/);
  });

  it("schema map exposes lathe_print_setup_select with geometry + material + loads + optional chucks", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("lathe_print_setup_select:");
    expect(src).toMatch(/lathe_print_setup_select:\s*z\.object\(\{[\s\S]{0,800}geometry:\s*z\.record\(z\.string\(\),\s*z\.unknown\(\)\)/);
    expect(src).toMatch(/lathe_print_setup_select:\s*z\.object\(\{[\s\S]{0,800}loads:\s*z\.record\(z\.string\(\),\s*z\.unknown\(\)\)/);
    expect(src).toMatch(/lathe_print_setup_select:\s*z\.object\(\{[\s\S]{0,1200}chucks:\s*z\.array\(z\.record\(z\.string\(\),\s*z\.unknown\(\)\)\)\.optional/);
  });

  it("engine source: LathePrintSetupSelectionEngine exports the singleton + selectSetup method", () => {
    const enginePath = join(process.cwd(), "src/engines/LathePrintSetupSelectionEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const lathePrintSetupSelectionEngine\s*=\s*new LathePrintSetupSelectionEngine\(\)/);
    expect(src).toMatch(/selectSetup\(/);
  });
});
