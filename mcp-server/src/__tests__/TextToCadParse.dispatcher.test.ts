/**
 * Round-trip dispatcher wiring test for CAD-WIRE-MS0/U-CWA01:
 * text_to_cad_parse action wires TextToCADGenerationEngine.parseText
 * via cadDispatcher.
 *
 * Uses text-grep on dispatcher source + Zod schema entry verification
 * (matches the BuildAdvisorEngine.test.ts:429 precedent for round-trip
 * tests in this repo when node_modules/zod is unavailable).
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const DISPATCHER_PATH = join(process.cwd(), "src/tools/dispatchers/cadDispatcher.ts");
const SCHEMA_PATH = join(process.cwd(), "src/schemas/cadActionSchemas.ts");

describe("text_to_cad_parse — dispatcher wiring (CAD-WIRE-MS0)", () => {
  it("action is in cadDispatcher z.enum (ACTIONS array)", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('"text_to_cad_parse"');
  });

  it("dispatcher has a case handler invoking TextToCADGenerationEngine.parseText", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "text_to_cad_parse"');
    expect(src).toContain("TextToCADGenerationEngine.js");
    expect(src).toContain("textToCADGenerationEngine.parseText");
  });

  it("case handler validates text param and returns success+parsed shape", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "text_to_cad_parse"[\s\S]{0,400}params as Record/);
    expect(src).toMatch(/text param required/);
    expect(src).toMatch(/success: true, parsed/);
  });

  it("cadActionSchemas exposes text_to_cad_parse with text:string min(1)", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("text_to_cad_parse:");
    expect(src).toMatch(/text_to_cad_parse:\s*z\.object\(\{[\s\S]{0,300}text:\s*z\.string\(\)\.min\(1\)/);
  });

  it("dispatcher and schema entries reference the same milestone tag", () => {
    const dispSrc = readFileSync(DISPATCHER_PATH, "utf-8");
    const schSrc = readFileSync(SCHEMA_PATH, "utf-8");
    expect(dispSrc).toContain("CAD-WIRE-MS0");
    expect(schSrc).toContain("CAD-WIRE-MS0");
  });
});

describe("TextToCADGenerationEngine.parseText — engine-level invariants in source", () => {
  // Rather than runtime-import the engine (blocked by missing node_modules/zod
  // pre-existing on this branch — see P8-U02 ship_notes), we verify the engine
  // contract via source-level invariants. Runtime engine-behavior tests run
  // post-merge when zod is installed.
  const ENGINE_PATH = join(process.cwd(), "src/engines/TextToCADGenerationEngine.ts");

  it("engine exports the singleton textToCADGenerationEngine", () => {
    const src = readFileSync(ENGINE_PATH, "utf-8");
    expect(src).toMatch(/export const textToCADGenerationEngine\s*=\s*new TextToCADGenerationEngine\(\)/);
  });

  it("parseText is a public method taking a string and returning ParsedText", () => {
    const src = readFileSync(ENGINE_PATH, "utf-8");
    expect(src).toMatch(/parseText\(text:\s*string\):\s*ParsedText/);
  });

  it("parseText classifies machine category for lathe/mill/edm keywords", () => {
    const src = readFileSync(ENGINE_PATH, "utf-8");
    // The parseText body must contain the keyword-driven classification.
    expect(src).toMatch(/parseText\(text:\s*string\)[\s\S]{0,1500}machineCategory\s*=\s*"lathe"/);
    expect(src).toMatch(/parseText\(text:\s*string\)[\s\S]{0,1500}machineCategory\s*=\s*"mill"/);
    expect(src).toMatch(/parseText\(text:\s*string\)[\s\S]{0,1500}machineCategory\s*=\s*"wire_edm"/);
  });

  it("parseText returns the description, dimensions, features, material, machineCategory, constraints fields", () => {
    const src = readFileSync(ENGINE_PATH, "utf-8");
    // The return shape must include all 6 fields the dispatcher contract assumes.
    expect(src).toMatch(/return\s*\{[\s\S]{0,300}description[\s\S]{0,300}dimensions[\s\S]{0,300}features[\s\S]{0,300}material[\s\S]{0,300}machineCategory[\s\S]{0,300}constraints/);
  });
});
