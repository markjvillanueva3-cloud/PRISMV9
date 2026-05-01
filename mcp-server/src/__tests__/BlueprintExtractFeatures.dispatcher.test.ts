/**
 * Round-trip dispatcher wiring test for CAD-WIRE-MS0/U-CWA03:
 * blueprint_extract_features wires BlueprintToCADGenerationEngine.extractFeatures.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const DISPATCHER_PATH = join(process.cwd(), "src/tools/dispatchers/cadDispatcher.ts");
const SCHEMA_PATH = join(process.cwd(), "src/schemas/cadActionSchemas.ts");
const ENGINE_PATH = join(process.cwd(), "src/engines/BlueprintToCADGenerationEngine.ts");

describe("blueprint_extract_features — dispatcher wiring (CAD-WIRE-MS0)", () => {
  it("action is in cadDispatcher z.enum (ACTIONS array)", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('"blueprint_extract_features"');
  });

  it("dispatcher has a case handler invoking extractFeatures via the singleton", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "blueprint_extract_features"');
    expect(src).toContain("BlueprintToCADGenerationEngine.js");
    expect(src).toContain("blueprintToCADGenerationEngine.extractFeatures");
  });

  it("case handler rejects missing/non-object ocr param and surfaces engine errors", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "blueprint_extract_features"[\s\S]{0,800}ocr param required/);
    expect(src).toMatch(/case "blueprint_extract_features"[\s\S]{0,800}typeof ocr !== "object"/);
    expect(src).toMatch(/case "blueprint_extract_features"[\s\S]{0,800}try\s*\{[\s\S]{0,400}catch/);
    expect(src).toMatch(/case "blueprint_extract_features"[\s\S]{0,800}success: true, features/);
  });

  it("cadActionSchemas exposes blueprint_extract_features with ocr:record", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("blueprint_extract_features:");
    expect(src).toMatch(/blueprint_extract_features:\s*z\.object\(\{[\s\S]{0,400}ocr:\s*z\.record\(z\.string\(\),\s*z\.unknown\(\)\)/);
  });
});

describe("BlueprintToCADGenerationEngine — engine-source invariants", () => {
  it("engine exports the singleton blueprintToCADGenerationEngine", () => {
    const src = readFileSync(ENGINE_PATH, "utf-8");
    expect(src).toMatch(/export const blueprintToCADGenerationEngine\s*=\s*new BlueprintToCADGenerationEngine\(\)/);
  });

  it("extractFeatures(ocr) is a public method on the class", () => {
    const src = readFileSync(ENGINE_PATH, "utf-8");
    expect(src).toMatch(/extractFeatures\(ocr:\s*BlueprintOCRResult\)/);
  });

  it("extractFeatures returns a FeatureSpec[] (typed return)", () => {
    const src = readFileSync(ENGINE_PATH, "utf-8");
    expect(src).toMatch(/extractFeatures\(ocr:[^)]+\):\s*FeatureSpec\[\]/);
  });
});
