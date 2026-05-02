/**
 * Round-trip dispatcher wiring tests for LATHE-WIRE-MS0/Batch11:
 *   U-LWB28: lathe_feature_recognize         → LatheTurningFeatureRecognizerEngine.recognize (BlueprintIntake)
 *   U-LWB29: lathe_tolerance_stack_analyze   → LathePrintToleranceStackEngine.analyzeStacks (features + budget_mm)
 *   U-LWB30: lathe_toolpath_generate         → LathePrintToolpathGeneratorEngine.generateProgram (4-arg)
 *
 * Closes the print pipeline gap between ingest and strategy:
 *   ingest → recognize → tolerance-stack → strategy → sequence → toolpath-generate → emit → post → signoff
 *
 * Notable shape variations:
 *   - LWB28: LatheTurningFeatureRecognizerEngine uses getInstance() (NOT `new ...()`)
 *   - LWB29: 2-arg with features:array + budget_mm:number primitive
 *   - LWB30: 4-arg with optional limits — completes the toolpath emitter chain
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const DISPATCHER_PATH = join(process.cwd(), "src/tools/dispatchers/turningDispatcher.ts");
const SCHEMA_PATH = join(process.cwd(), "src/schemas/turningActionSchemas.ts");

describe("LATHE-WIRE-MS0/Batch11 — action enum membership", () => {
  it("turningDispatcher ACTIONS array includes the 3 new actions", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('"lathe_feature_recognize"');
    expect(src).toContain('"lathe_tolerance_stack_analyze"');
    expect(src).toContain('"lathe_toolpath_generate"');
  });

  it("the LATHE-WIRE-MS0/Batch11 milestone tag is present in the enum block", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain("LATHE-WIRE-MS0/Batch11: feature recognize + tolerance stack + toolpath generate");
  });
});

describe("U-LWB28 — lathe_feature_recognize wiring (BlueprintIntake → RecognitionResult)", () => {
  it("dispatcher case lazy-imports LatheTurningFeatureRecognizerEngine and calls recognize", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "lathe_feature_recognize"');
    expect(src).toContain("LatheTurningFeatureRecognizerEngine.js");
    expect(src).toContain("latheTurningFeatureRecognizerEngine.recognize");
  });

  it("case handler validates intake param AND wraps engine call in try/catch", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "lathe_feature_recognize"[\s\S]{0,800}intake required \(BlueprintIntake\)/);
    expect(src).toMatch(/case "lathe_feature_recognize"[\s\S]{0,800}try\s*\{[\s\S]{0,400}catch\s*\(err\)/);
    expect(src).toMatch(/case "lathe_feature_recognize"[\s\S]{0,800}\(err as Error\)\.message/);
  });

  it("schema map exposes lathe_feature_recognize with intake:record", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("lathe_feature_recognize:");
    expect(src).toMatch(/lathe_feature_recognize:\s*z\.object\(\{[\s\S]{0,400}intake:\s*z\.record\(z\.string\(\),\s*z\.unknown\(\)\)/);
  });

  it("engine source: LatheTurningFeatureRecognizerEngine uses getInstance() singleton + recognize method", () => {
    const enginePath = join(process.cwd(), "src/engines/LatheTurningFeatureRecognizerEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const latheTurningFeatureRecognizerEngine\s*=\s*LatheTurningFeatureRecognizerEngine\.getInstance\(\)/);
    expect(src).toMatch(/recognize\(\s*intake:\s*BlueprintIntake\s*\):\s*RecognitionResult/);
  });
});

describe("U-LWB29 — lathe_tolerance_stack_analyze wiring (features + budget_mm)", () => {
  it("dispatcher case lazy-imports LathePrintToleranceStackEngine and calls analyzeStacks", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "lathe_tolerance_stack_analyze"');
    expect(src).toContain("LathePrintToleranceStackEngine.js");
    expect(src).toContain("lathePrintToleranceStackEngine.analyzeStacks");
  });

  it("case handler validates features array + budget_mm finite number AND wraps in try/catch", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "lathe_tolerance_stack_analyze"[\s\S]{0,1500}features array required \(RecognizedFeature\[\]\)/);
    expect(src).toMatch(/case "lathe_tolerance_stack_analyze"[\s\S]{0,1500}budget_mm finite number required/);
    expect(src).toMatch(/case "lathe_tolerance_stack_analyze"[\s\S]{0,1500}Number\.isFinite\(budgetMm\)/);
    expect(src).toMatch(/case "lathe_tolerance_stack_analyze"[\s\S]{0,1500}try\s*\{[\s\S]{0,500}catch\s*\(err\)/);
  });

  it("schema map exposes lathe_tolerance_stack_analyze with features:array(≥1) + budget_mm:number", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("lathe_tolerance_stack_analyze:");
    expect(src).toMatch(/lathe_tolerance_stack_analyze:\s*z\.object\(\{[\s\S]{0,800}features:\s*z\.array\(z\.record\(z\.string\(\),\s*z\.unknown\(\)\)\)\.min\(1\)/);
    expect(src).toMatch(/lathe_tolerance_stack_analyze:\s*z\.object\(\{[\s\S]{0,800}budget_mm:\s*z\.number\(\)/);
  });

  it("engine source: LathePrintToleranceStackEngine exports the singleton + analyzeStacks method", () => {
    const enginePath = join(process.cwd(), "src/engines/LathePrintToleranceStackEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const lathePrintToleranceStackEngine\s*=\s*new LathePrintToleranceStackEngine\(\)/);
    expect(src).toMatch(/analyzeStacks\(/);
  });
});

describe("U-LWB30 — lathe_toolpath_generate wiring (4-arg with optional limits)", () => {
  it("dispatcher case lazy-imports LathePrintToolpathGeneratorEngine and calls generateProgram", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "lathe_toolpath_generate"');
    expect(src).toContain("LathePrintToolpathGeneratorEngine.js");
    expect(src).toContain("lathePrintToolpathGeneratorEngine.generateProgram");
  });

  it("case handler validates sequence_plan AND features AND material AND wraps in try/catch", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "lathe_toolpath_generate"[\s\S]{0,2000}sequence_plan required \(SequencePlan\)/);
    expect(src).toMatch(/case "lathe_toolpath_generate"[\s\S]{0,2000}features array required \(FeatureInput\[\]\)/);
    expect(src).toMatch(/case "lathe_toolpath_generate"[\s\S]{0,2000}material required \(MaterialInput\)/);
    expect(src).toMatch(/case "lathe_toolpath_generate"[\s\S]{0,2000}try\s*\{[\s\S]{0,800}catch\s*\(err\)/);
  });

  it("schema map exposes lathe_toolpath_generate with sequence_plan + features + material + optional limits", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("lathe_toolpath_generate:");
    expect(src).toMatch(/lathe_toolpath_generate:\s*z\.object\(\{[\s\S]{0,1200}sequence_plan:\s*z\.record\(z\.string\(\),\s*z\.unknown\(\)\)/);
    expect(src).toMatch(/lathe_toolpath_generate:\s*z\.object\(\{[\s\S]{0,1200}features:\s*z\.array\(z\.record\(z\.string\(\),\s*z\.unknown\(\)\)\)/);
    expect(src).toMatch(/lathe_toolpath_generate:\s*z\.object\(\{[\s\S]{0,1500}limits:\s*z\.record\(z\.string\(\),\s*z\.unknown\(\)\)\.optional/);
  });

  it("engine source: LathePrintToolpathGeneratorEngine exports the singleton + generateProgram method", () => {
    const enginePath = join(process.cwd(), "src/engines/LathePrintToolpathGeneratorEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const lathePrintToolpathGeneratorEngine\s*=\s*new LathePrintToolpathGeneratorEngine\(\)/);
    expect(src).toMatch(/generateProgram\(/);
  });
});
