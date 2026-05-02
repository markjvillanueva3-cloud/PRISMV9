/**
 * Round-trip dispatcher wiring tests for LATHE-WIRE-MS0/Batch22:
 *   U-LWB61: lathe_program_feature_infer_one  → LatheProgramFeatureInferenceEngine.inferOne
 *   U-LWB62: lathe_sf_calculate                → LatheSpeedFeedCalculatorFacadeEngine.calculate (static)
 *   U-LWB63: lathe_sf_supported_materials      → LatheSpeedFeedCalculatorFacadeEngine.listSupportedMaterials (static)
 *
 * Three previously-unwired Lathe non-LoRA engines:
 *   - Feature inference: classifies a single InferenceOperationView into InferredFeature
 *   - SF calculate (facade): top-level speed/feed facade — class-alias static call
 *   - SF supported materials: returns material list + facade version
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const DISPATCHER_PATH = join(process.cwd(), "src/tools/dispatchers/turningDispatcher.ts");
const SCHEMA_PATH = join(process.cwd(), "src/schemas/turningActionSchemas.ts");

describe("LATHE-WIRE-MS0/Batch22 — action enum membership", () => {
  it("turningDispatcher ACTIONS array includes the 3 new actions", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('"lathe_program_feature_infer_one"');
    expect(src).toContain('"lathe_sf_calculate"');
    expect(src).toContain('"lathe_sf_supported_materials"');
  });

  it("the LATHE-WIRE-MS0/Batch22 milestone tag is present in the enum block", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain("LATHE-WIRE-MS0/Batch22: feature inference + speed-feed facade");
  });
});

describe("U-LWB61 — lathe_program_feature_infer_one wiring", () => {
  it("dispatcher case lazy-imports LatheProgramFeatureInferenceEngine and calls inferOne", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "lathe_program_feature_infer_one"');
    expect(src).toContain("LatheProgramFeatureInferenceEngine.js");
    expect(src).toContain("latheProgramFeatureInferenceEngine.inferOne");
  });

  it("case validates input AND wraps engine call in try/catch", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "lathe_program_feature_infer_one"[\s\S]{0,800}input required \(InferenceOperationView\)/);
    expect(src).toMatch(/case "lathe_program_feature_infer_one"[\s\S]{0,800}\(err as Error\)\.message/);
  });

  it("schema map exposes lathe_program_feature_infer_one with input:record", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("lathe_program_feature_infer_one:");
    expect(src).toMatch(/lathe_program_feature_infer_one:\s*z\.object\(\{[\s\S]{0,500}input:\s*z\.record\(z\.string\(\),\s*z\.unknown\(\)\)/);
  });

  it("engine source: LatheProgramFeatureInferenceEngine exports the singleton + inferOne method", () => {
    const enginePath = join(process.cwd(), "src/engines/LatheProgramFeatureInferenceEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const latheProgramFeatureInferenceEngine/);
    expect(src).toMatch(/inferOne\(\s*op:\s*InferenceOperationView\s*\):\s*InferredFeature/);
  });
});

describe("U-LWB62 — lathe_sf_calculate wiring", () => {
  it("dispatcher case lazy-imports LatheSpeedFeedCalculatorFacadeEngine and calls calculate (static)", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "lathe_sf_calculate"');
    expect(src).toContain("LatheSpeedFeedCalculatorFacadeEngine.js");
    expect(src).toContain("latheSpeedFeedCalculatorFacadeEngine.calculate");
  });

  it("case handler validates input AND wraps engine call in try/catch", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "lathe_sf_calculate"[\s\S]{0,800}input required \(LatheSpeedFeedInput\)/);
    expect(src).toMatch(/case "lathe_sf_calculate"[\s\S]{0,800}\(err as Error\)\.message/);
  });

  it("schema map exposes lathe_sf_calculate with input:record", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("lathe_sf_calculate:");
    expect(src).toMatch(/lathe_sf_calculate:\s*z\.object\(\{[\s\S]{0,500}input:\s*z\.record\(z\.string\(\),\s*z\.unknown\(\)\)/);
  });

  it("engine source: LatheSpeedFeedCalculatorFacadeEngine exports the class-alias singleton + static calculate", () => {
    const enginePath = join(process.cwd(), "src/engines/LatheSpeedFeedCalculatorFacadeEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const latheSpeedFeedCalculatorFacadeEngine\s*=\s*LatheSpeedFeedCalculatorFacadeEngine/);
    expect(src).toMatch(/static calculate\(\s*input:\s*LatheSpeedFeedInput\s*\):\s*LatheSpeedFeedResult/);
  });
});

describe("U-LWB63 — lathe_sf_supported_materials wiring", () => {
  it("dispatcher case lazy-imports LatheSpeedFeedCalculatorFacadeEngine and calls listSupportedMaterials + getVersion", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "lathe_sf_supported_materials"');
    expect(src).toContain("latheSpeedFeedCalculatorFacadeEngine.listSupportedMaterials");
    expect(src).toMatch(/case "lathe_sf_supported_materials"[\s\S]{0,1500}latheSpeedFeedCalculatorFacadeEngine\.getVersion\(\)/);
  });

  it("case wraps engine calls in try/catch", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "lathe_sf_supported_materials"[\s\S]{0,1500}try\s*\{[\s\S]{0,800}catch\s*\(err\)/);
    expect(src).toMatch(/case "lathe_sf_supported_materials"[\s\S]{0,1500}\(err as Error\)\.message/);
  });

  it("schema map exposes lathe_sf_supported_materials as no-input passthrough", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("lathe_sf_supported_materials:");
    expect(src).toMatch(/lathe_sf_supported_materials:\s*z\.object\(\{\s*\}\)\.passthrough\(\)/);
  });

  it("engine source: static listSupportedMaterials + getVersion methods exist", () => {
    const enginePath = join(process.cwd(), "src/engines/LatheSpeedFeedCalculatorFacadeEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/static listSupportedMaterials\(\):\s*string\[\]/);
    expect(src).toMatch(/static getVersion\(\):\s*string/);
  });
});
