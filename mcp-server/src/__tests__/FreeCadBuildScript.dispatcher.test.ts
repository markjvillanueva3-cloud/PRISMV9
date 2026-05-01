/**
 * Round-trip dispatcher wiring test for CAD-WIRE-MS0/U-CWA02:
 * freecad_build_script wires FreeCADCodeGeneratorEngine.buildScript.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const DISPATCHER_PATH = join(process.cwd(), "src/tools/dispatchers/cadDispatcher.ts");
const SCHEMA_PATH = join(process.cwd(), "src/schemas/cadActionSchemas.ts");
const ENGINE_PATH = join(process.cwd(), "src/engines/FreeCADCodeGeneratorEngine.ts");

describe("freecad_build_script — dispatcher wiring (CAD-WIRE-MS0)", () => {
  it("action is in cadDispatcher z.enum (ACTIONS array)", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('"freecad_build_script"');
  });

  it("dispatcher has a case handler invoking buildScript via the singleton", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "freecad_build_script"');
    expect(src).toContain("FreeCADCodeGeneratorEngine.js");
    expect(src).toContain("freeCADCodeGeneratorEngine.buildScript");
  });

  it("case handler validates operations array and surfaces engine errors", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "freecad_build_script"[\s\S]{0,800}operations param required/);
    expect(src).toMatch(/case "freecad_build_script"[\s\S]{0,800}try\s*\{[\s\S]{0,400}catch/);
    expect(src).toMatch(/case "freecad_build_script"[\s\S]{0,800}success: true, script/);
  });

  it("cadActionSchemas exposes freecad_build_script with operations:array, context:optional", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("freecad_build_script:");
    expect(src).toMatch(/freecad_build_script:\s*z\.object\(\{[\s\S]{0,400}operations:\s*z\.array/);
    expect(src).toMatch(/freecad_build_script:\s*z\.object\(\{[\s\S]{0,500}context:\s*z\.record\(z\.string\(\),\s*z\.unknown\(\)\)\.optional/);
  });
});

describe("FreeCADCodeGeneratorEngine — engine-source invariants", () => {
  it("engine extends UnifiedCADCodeGeneratorBase (inherits buildScript)", () => {
    const src = readFileSync(ENGINE_PATH, "utf-8");
    expect(src).toMatch(/export class FreeCADCodeGeneratorEngine extends UnifiedCADCodeGeneratorBase/);
  });

  it("engine exports the singleton freeCADCodeGeneratorEngine", () => {
    const src = readFileSync(ENGINE_PATH, "utf-8");
    expect(src).toMatch(/export const freeCADCodeGeneratorEngine\s*=\s*new FreeCADCodeGeneratorEngine\(\)/);
  });

  it("buildScript exists on the inherited base with the expected signature", () => {
    const basePath = join(process.cwd(), "src/engines/UnifiedCADCodeGeneratorBase.ts");
    const src = readFileSync(basePath, "utf-8");
    expect(src).toMatch(/buildScript\(\s*ops:\s*ReadonlyArray<CADOperation>/);
  });
});
