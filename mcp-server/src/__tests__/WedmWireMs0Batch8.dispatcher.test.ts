/**
 * Round-trip dispatcher wiring tests for WEDM-WIRE-MS0/Batch8:
 *   U-WWB19: wedm_dxf_closure_validate  → WEDMDXFClosureValidatorEngine.validate (array input)
 *   U-WWB20: wedm_drift_detect          → WEDMDriftDetectionEngine.detect
 *   U-WWB21: wedm_calibration_report    → WEDMCalibrationReportEngine.generate
 *
 * WWB19 has the array input shape (DXFSegment[] like LWB03/WWB03/WWB09).
 * WWB20/WWB21 are single-arg input objects (DriftInput, CalibrationInput).
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const DISPATCHER_PATH = join(process.cwd(), "src/tools/dispatchers/camDispatcher.ts");
const SCHEMA_PATH = join(process.cwd(), "src/schemas/camActionSchemas.ts");

describe("WEDM-WIRE-MS0/Batch8 — action enum membership", () => {
  it("camDispatcher ACTIONS array includes the 3 new actions", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('"wedm_dxf_closure_validate"');
    expect(src).toContain('"wedm_drift_detect"');
    expect(src).toContain('"wedm_calibration_report"');
  });

  it("the WEDM-WIRE-MS0/Batch8 milestone tag is present in the enum block", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain("WEDM-WIRE-MS0/Batch8: DXF closure validate + drift detect + calibration report");
  });
});

describe("U-WWB19 — wedm_dxf_closure_validate wiring (array input)", () => {
  it("dispatcher case lazy-imports WEDMDXFClosureValidatorEngine and calls validate", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "wedm_dxf_closure_validate"');
    expect(src).toContain("WEDMDXFClosureValidatorEngine.js");
    expect(src).toContain("wedmDXFClosureValidatorEngine.validate");
  });

  it("case handler validates segments is an array AND wraps engine call in try/catch", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "wedm_dxf_closure_validate"[\s\S]{0,800}segments array required \(DXFSegment\[\]\)/);
    expect(src).toMatch(/case "wedm_dxf_closure_validate"[\s\S]{0,800}try\s*\{[\s\S]{0,400}catch\s*\(err\)/);
    expect(src).toMatch(/case "wedm_dxf_closure_validate"[\s\S]{0,800}\(err as Error\)\.message/);
  });

  it("schema map exposes wedm_dxf_closure_validate with segments:array(≥1)", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("wedm_dxf_closure_validate:");
    expect(src).toMatch(/wedm_dxf_closure_validate:\s*z\.object\(\{[\s\S]{0,400}segments:\s*z\.array\(z\.record\(z\.string\(\),\s*z\.unknown\(\)\)\)\.min\(1\)/);
  });

  it("engine source: WEDMDXFClosureValidatorEngine exports the singleton + validate method", () => {
    const enginePath = join(process.cwd(), "src/engines/WEDMDXFClosureValidatorEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const wedmDXFClosureValidatorEngine\s*=\s*new WEDMDXFClosureValidatorEngine\(\)/);
    expect(src).toMatch(/validate\(\s*segments:\s*DXFSegment\[\]\s*\):\s*ClosureValidationResult/);
  });
});

describe("U-WWB20 — wedm_drift_detect wiring", () => {
  it("dispatcher case lazy-imports WEDMDriftDetectionEngine and calls detect", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "wedm_drift_detect"');
    expect(src).toContain("WEDMDriftDetectionEngine.js");
    expect(src).toContain("wedmDriftDetectionEngine.detect");
  });

  it("case handler validates input param AND wraps engine call in try/catch", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "wedm_drift_detect"[\s\S]{0,800}input required \(DriftInput\)/);
    expect(src).toMatch(/case "wedm_drift_detect"[\s\S]{0,800}try\s*\{[\s\S]{0,400}catch\s*\(err\)/);
    expect(src).toMatch(/case "wedm_drift_detect"[\s\S]{0,800}\(err as Error\)\.message/);
  });

  it("schema map exposes wedm_drift_detect with input:record", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("wedm_drift_detect:");
    expect(src).toMatch(/wedm_drift_detect:\s*z\.object\(\{[\s\S]{0,400}input:\s*z\.record\(z\.string\(\),\s*z\.unknown\(\)\)/);
  });

  it("engine source: WEDMDriftDetectionEngine exports the singleton + detect method", () => {
    const enginePath = join(process.cwd(), "src/engines/WEDMDriftDetectionEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const wedmDriftDetectionEngine\s*=\s*new WEDMDriftDetectionEngine\(\)/);
    expect(src).toMatch(/detect\(\s*input:\s*DriftInput\s*\):\s*DriftVerdict/);
  });
});

describe("U-WWB21 — wedm_calibration_report wiring", () => {
  it("dispatcher case lazy-imports WEDMCalibrationReportEngine and calls generate", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "wedm_calibration_report"');
    expect(src).toContain("WEDMCalibrationReportEngine.js");
    expect(src).toContain("wedmCalibrationReportEngine.generate");
  });

  it("case handler validates input param AND wraps engine call in try/catch", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "wedm_calibration_report"[\s\S]{0,800}input required \(CalibrationInput\)/);
    expect(src).toMatch(/case "wedm_calibration_report"[\s\S]{0,800}try\s*\{[\s\S]{0,400}catch\s*\(err\)/);
    expect(src).toMatch(/case "wedm_calibration_report"[\s\S]{0,800}\(err as Error\)\.message/);
  });

  it("schema map exposes wedm_calibration_report with input:record", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("wedm_calibration_report:");
    expect(src).toMatch(/wedm_calibration_report:\s*z\.object\(\{[\s\S]{0,400}input:\s*z\.record\(z\.string\(\),\s*z\.unknown\(\)\)/);
  });

  it("engine source: WEDMCalibrationReportEngine exports the singleton + generate method", () => {
    const enginePath = join(process.cwd(), "src/engines/WEDMCalibrationReportEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const wedmCalibrationReportEngine\s*=\s*new WEDMCalibrationReportEngine\(\)/);
    expect(src).toMatch(/generate\(\s*input:\s*CalibrationInput\s*\):\s*CalibrationReport/);
  });
});
