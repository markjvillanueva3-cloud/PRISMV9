/**
 * Round-trip dispatcher wiring tests for LATHE-WIRE-MS0:
 *   U-LWA01: turning_predict_batch_life → TurningWearPredictionEngine.predictBatchLife
 *   U-LWA02: turning_thread_optimize    → TurningThreadOptimizerEngine.optimize
 *   U-LWA03: lathe_classify_part        → LathePartClassifierEngine.classify
 *
 * Text-grep pattern (matches BuildAdvisorEngine.test.ts:429 + CAD-WIRE-MS0
 * U-CWA0X precedent) since node_modules/zod is missing on this branch
 * (pre-existing env gap; runtime engine-behavior tests run post-merge).
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const DISPATCHER_PATH = join(process.cwd(), "src/tools/dispatchers/turningDispatcher.ts");
const SCHEMA_PATH = join(process.cwd(), "src/schemas/turningActionSchemas.ts");

describe("LATHE-WIRE-MS0 — action enum membership", () => {
  it("turningDispatcher ACTIONS array includes the 3 new actions", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('"turning_predict_batch_life"');
    expect(src).toContain('"turning_thread_optimize"');
    expect(src).toContain('"lathe_classify_part"');
  });

  it("the LATHE-WIRE-MS0 milestone tag is present in the enum block", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain("LATHE-WIRE-MS0: lightweight orphan engine wiring");
  });
});

describe("U-LWA01 — turning_predict_batch_life wiring", () => {
  it("dispatcher case lazy-imports TurningWearPredictionEngine and calls predictBatchLife", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "turning_predict_batch_life"');
    expect(src).toContain("TurningWearPredictionEngine.js");
    expect(src).toContain("turningWearPredictionEngine.predictBatchLife");
  });

  it("case handler wraps the engine call in try/catch surfacing error.message", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "turning_predict_batch_life"[\s\S]{0,500}try\s*\{[\s\S]{0,300}catch\s*\(err\)/);
    expect(src).toMatch(/case "turning_predict_batch_life"[\s\S]{0,500}\(err as Error\)\.message/);
  });

  it("schema map exposes turning_predict_batch_life with passthrough+describe", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("turning_predict_batch_life:");
    expect(src).toMatch(/turning_predict_batch_life:\s*z\.object\(\{\}\)\.passthrough\(\)\.describe/);
  });

  it("engine source: TurningWearPredictionEngine exports the singleton + predictBatchLife method", () => {
    const enginePath = join(process.cwd(), "src/engines/TurningWearPredictionEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const turningWearPredictionEngine\s*=\s*new TurningWearPredictionEngine\(\)/);
    expect(src).toMatch(/predictBatchLife\(\s*input:\s*BatchLifeInput\s*\):\s*BatchLifeResult/);
  });
});

describe("U-LWA02 — turning_thread_optimize wiring", () => {
  it("dispatcher case lazy-imports TurningThreadOptimizerEngine and calls optimize", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "turning_thread_optimize"');
    expect(src).toContain("TurningThreadOptimizerEngine.js");
    expect(src).toContain("turningThreadOptimizerEngine.optimize");
  });

  it("case handler wraps the engine call in try/catch surfacing error.message", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "turning_thread_optimize"[\s\S]{0,500}try\s*\{[\s\S]{0,300}catch\s*\(err\)/);
    expect(src).toMatch(/case "turning_thread_optimize"[\s\S]{0,500}\(err as Error\)\.message/);
  });

  it("schema map exposes turning_thread_optimize with passthrough+describe", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("turning_thread_optimize:");
    expect(src).toMatch(/turning_thread_optimize:\s*z\.object\(\{\}\)\.passthrough\(\)\.describe/);
  });

  it("engine source: TurningThreadOptimizerEngine exports the singleton + optimize method", () => {
    const enginePath = join(process.cwd(), "src/engines/TurningThreadOptimizerEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const turningThreadOptimizerEngine\s*=\s*new TurningThreadOptimizerEngine\(\)/);
    expect(src).toMatch(/optimize\(\s*input:\s*ThreadOptimizeInput\s*\):\s*ThreadOptimizeResult/);
  });
});

describe("U-LWA03 — lathe_classify_part wiring", () => {
  it("dispatcher case lazy-imports LathePartClassifierEngine and calls classify", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "lathe_classify_part"');
    expect(src).toContain("LathePartClassifierEngine.js");
    expect(src).toContain("lathePartClassifierEngine.classify");
  });

  it("case handler wraps the engine call in try/catch surfacing error.message", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "lathe_classify_part"[\s\S]{0,500}try\s*\{[\s\S]{0,300}catch\s*\(err\)/);
    expect(src).toMatch(/case "lathe_classify_part"[\s\S]{0,500}\(err as Error\)\.message/);
  });

  it("schema map exposes lathe_classify_part with passthrough+describe", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("lathe_classify_part:");
    expect(src).toMatch(/lathe_classify_part:\s*z\.object\(\{\}\)\.passthrough\(\)\.describe/);
  });

  it("engine source: LathePartClassifierEngine exports the singleton + classify method", () => {
    const enginePath = join(process.cwd(), "src/engines/LathePartClassifierEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const lathePartClassifierEngine\s*=\s*new LathePartClassifierEngine\(\)/);
    expect(src).toMatch(/classify\(\s*input:\s*PartGeometryInput\s*\):\s*ClassificationResult/);
  });
});
