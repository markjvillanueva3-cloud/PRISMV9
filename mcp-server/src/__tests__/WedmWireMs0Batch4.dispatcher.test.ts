/**
 * Round-trip dispatcher wiring tests for WEDM-WIRE-MS0/Batch4:
 *   U-WWB07: wedm_haz_predict        → WEDMHeatAffectedZoneEngine.predict
 *   U-WWB08: wedm_gap_voltage_calc   → WEDMGapVoltageControlEngine.calculate
 *   U-WWB09: wedm_deviation_to_tip   → WEDMDeviationToTipEngine.analyze (array input)
 *
 * Same text-grep pattern as Batch1/Batch2/Batch3 (no zod runtime in worktree).
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const DISPATCHER_PATH = join(process.cwd(), "src/tools/dispatchers/camDispatcher.ts");
const SCHEMA_PATH = join(process.cwd(), "src/schemas/camActionSchemas.ts");

describe("WEDM-WIRE-MS0/Batch4 — action enum membership", () => {
  it("camDispatcher ACTIONS array includes the 3 new actions", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('"wedm_haz_predict"');
    expect(src).toContain('"wedm_gap_voltage_calc"');
    expect(src).toContain('"wedm_deviation_to_tip"');
  });

  it("the WEDM-WIRE-MS0/Batch4 milestone tag is present in the enum block", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain("WEDM-WIRE-MS0/Batch4: HAZ + gap voltage + deviation-to-tip");
  });
});

describe("U-WWB07 — wedm_haz_predict wiring", () => {
  it("dispatcher case lazy-imports WEDMHeatAffectedZoneEngine and calls predict", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "wedm_haz_predict"');
    expect(src).toContain("WEDMHeatAffectedZoneEngine.js");
    expect(src).toContain("wedmHeatAffectedZoneEngine.predict");
  });

  it("case handler validates input param AND wraps engine call in try/catch", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "wedm_haz_predict"[\s\S]{0,800}input required \(HAZInput\)/);
    expect(src).toMatch(/case "wedm_haz_predict"[\s\S]{0,800}try\s*\{[\s\S]{0,400}catch\s*\(err\)/);
    expect(src).toMatch(/case "wedm_haz_predict"[\s\S]{0,800}\(err as Error\)\.message/);
  });

  it("schema map exposes wedm_haz_predict with input:record", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("wedm_haz_predict:");
    expect(src).toMatch(/wedm_haz_predict:\s*z\.object\(\{[\s\S]{0,400}input:\s*z\.record\(z\.string\(\),\s*z\.unknown\(\)\)/);
  });

  it("engine source: WEDMHeatAffectedZoneEngine exports the singleton + predict method", () => {
    const enginePath = join(process.cwd(), "src/engines/WEDMHeatAffectedZoneEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const wedmHeatAffectedZoneEngine\s*=\s*new WEDMHeatAffectedZoneEngine\(\)/);
    expect(src).toMatch(/predict\(\s*input:\s*HAZInput\s*\):\s*HAZPrediction/);
  });
});

describe("U-WWB08 — wedm_gap_voltage_calc wiring", () => {
  it("dispatcher case lazy-imports WEDMGapVoltageControlEngine and calls calculate", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "wedm_gap_voltage_calc"');
    expect(src).toContain("WEDMGapVoltageControlEngine.js");
    expect(src).toContain("wedmGapVoltageControlEngine.calculate");
  });

  it("case handler validates input param AND wraps engine call in try/catch", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "wedm_gap_voltage_calc"[\s\S]{0,800}input required \(GapVoltageInput\)/);
    expect(src).toMatch(/case "wedm_gap_voltage_calc"[\s\S]{0,800}try\s*\{[\s\S]{0,400}catch\s*\(err\)/);
    expect(src).toMatch(/case "wedm_gap_voltage_calc"[\s\S]{0,800}\(err as Error\)\.message/);
  });

  it("schema map exposes wedm_gap_voltage_calc with input:record", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("wedm_gap_voltage_calc:");
    expect(src).toMatch(/wedm_gap_voltage_calc:\s*z\.object\(\{[\s\S]{0,400}input:\s*z\.record\(z\.string\(\),\s*z\.unknown\(\)\)/);
  });

  it("engine source: WEDMGapVoltageControlEngine exports the singleton + calculate method", () => {
    const enginePath = join(process.cwd(), "src/engines/WEDMGapVoltageControlEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const wedmGapVoltageControlEngine\s*=\s*new WEDMGapVoltageControlEngine\(\)/);
    expect(src).toMatch(/calculate\(\s*input:\s*GapVoltageInput\s*\):\s*GapVoltageResult/);
  });
});

describe("U-WWB09 — wedm_deviation_to_tip wiring (array input)", () => {
  it("dispatcher case lazy-imports WEDMDeviationToTipEngine and calls analyze", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "wedm_deviation_to_tip"');
    expect(src).toContain("WEDMDeviationToTipEngine.js");
    expect(src).toContain("wedmDeviationToTipEngine.analyze");
  });

  it("case handler validates deviations is an array AND wraps engine call in try/catch", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "wedm_deviation_to_tip"[\s\S]{0,800}deviations array required \(DeviationRecord\[\]\)/);
    expect(src).toMatch(/case "wedm_deviation_to_tip"[\s\S]{0,800}try\s*\{[\s\S]{0,400}catch\s*\(err\)/);
    expect(src).toMatch(/case "wedm_deviation_to_tip"[\s\S]{0,800}\(err as Error\)\.message/);
  });

  it("schema map exposes wedm_deviation_to_tip with deviations:array(≥1)", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("wedm_deviation_to_tip:");
    expect(src).toMatch(/wedm_deviation_to_tip:\s*z\.object\(\{[\s\S]{0,400}deviations:\s*z\.array\(z\.record\(z\.string\(\),\s*z\.unknown\(\)\)\)\.min\(1\)/);
  });

  it("engine source: WEDMDeviationToTipEngine exports the singleton + analyze method", () => {
    const enginePath = join(process.cwd(), "src/engines/WEDMDeviationToTipEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const wedmDeviationToTipEngine\s*=\s*new WEDMDeviationToTipEngine\(\)/);
    expect(src).toMatch(/analyze\(\s*deviations:\s*DeviationRecord\[\]\s*\):\s*TipGenerationResult/);
  });
});
