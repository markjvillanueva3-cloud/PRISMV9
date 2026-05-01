/**
 * Round-trip dispatcher wiring tests for WEDM-WIRE-MS0:
 *   U-WWA01: wedm_program_verify        → WEDMProgramVerificationEngine.verify
 *   U-WWA02: wedm_tier6_geom_validate   → WEDMTier6GeomGateEngine.validate
 *   U-WWA03: wedm_preflight_checklist   → WEDMPreFlightCheckEngine.generateChecklist
 *
 * Wires through camDispatcher (the canonical CAM/EDM dispatcher per PRISM
 * conventions — no dedicated wedmDispatcher exists; CLAUDE.md notes "36
 * WEDM/EDM references in camDispatcher.ts").
 *
 * Text-grep pattern (matches BuildAdvisorEngine.test.ts:429 + CAD-WIRE-MS0
 * + LATHE-WIRE-MS0 precedent) since node_modules/zod is missing on this
 * branch (pre-existing env gap; runtime engine-behavior tests run
 * post-merge).
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const DISPATCHER_PATH = join(process.cwd(), "src/tools/dispatchers/camDispatcher.ts");
const SCHEMA_PATH = join(process.cwd(), "src/schemas/camActionSchemas.ts");

describe("WEDM-WIRE-MS0 — action enum membership", () => {
  it("camDispatcher ACTIONS array includes the 3 new actions", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('"wedm_program_verify"');
    expect(src).toContain('"wedm_tier6_geom_validate"');
    expect(src).toContain('"wedm_preflight_checklist"');
  });

  it("the WEDM-WIRE-MS0 milestone tag is present in the enum block", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain("WEDM-WIRE-MS0: lightweight orphan engine wiring");
  });
});

describe("U-WWA01 — wedm_program_verify wiring", () => {
  it("dispatcher case lazy-imports WEDMProgramVerificationEngine and calls verify", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "wedm_program_verify"');
    expect(src).toContain("WEDMProgramVerificationEngine.js");
    expect(src).toContain("wedmProgramVerificationEngine.verify");
  });

  it("case handler wraps the engine call in try/catch surfacing error.message", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "wedm_program_verify"[\s\S]{0,500}try\s*\{[\s\S]{0,300}catch\s*\(err\)/);
    expect(src).toMatch(/case "wedm_program_verify"[\s\S]{0,500}\(err as Error\)\.message/);
  });

  it("schema map exposes wedm_program_verify with passthrough+describe", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("wedm_program_verify:");
    expect(src).toMatch(/wedm_program_verify:\s*z\.object\(\{\}\)\.passthrough\(\)\.describe/);
  });

  it("engine source: WEDMProgramVerificationEngine exports the singleton + verify method", () => {
    const enginePath = join(process.cwd(), "src/engines/WEDMProgramVerificationEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const wedmProgramVerificationEngine\s*=\s*new WEDMProgramVerificationEngine\(\)/);
    expect(src).toMatch(/verify\(\s*input:\s*VerificationInput\s*\):\s*VerificationResult/);
  });
});

describe("U-WWA02 — wedm_tier6_geom_validate wiring", () => {
  it("dispatcher case lazy-imports WEDMTier6GeomGateEngine and calls validate", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "wedm_tier6_geom_validate"');
    expect(src).toContain("WEDMTier6GeomGateEngine.js");
    expect(src).toContain("wedmTier6GeomGateEngine.validate");
  });

  it("case handler wraps the engine call in try/catch surfacing error.message", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "wedm_tier6_geom_validate"[\s\S]{0,500}try\s*\{[\s\S]{0,300}catch\s*\(err\)/);
    expect(src).toMatch(/case "wedm_tier6_geom_validate"[\s\S]{0,500}\(err as Error\)\.message/);
  });

  it("schema map exposes wedm_tier6_geom_validate with passthrough+describe", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("wedm_tier6_geom_validate:");
    expect(src).toMatch(/wedm_tier6_geom_validate:\s*z\.object\(\{\}\)\.passthrough\(\)\.describe/);
  });

  it("engine source: WEDMTier6GeomGateEngine exports the singleton + validate method", () => {
    const enginePath = join(process.cwd(), "src/engines/WEDMTier6GeomGateEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const wedmTier6GeomGateEngine\s*=\s*new WEDMTier6GeomGateEngine\(\)/);
    expect(src).toMatch(/validate\(\s*input:\s*Tier6GeomInput\s*\):\s*Tier6GeomResult/);
  });
});

describe("U-WWA03 — wedm_preflight_checklist wiring", () => {
  it("dispatcher case lazy-imports WEDMPreFlightCheckEngine and calls generateChecklist", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "wedm_preflight_checklist"');
    expect(src).toContain("WEDMPreFlightCheckEngine.js");
    expect(src).toContain("wedmPreFlightCheckEngine.generateChecklist");
  });

  it("case handler wraps the engine call in try/catch surfacing error.message", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "wedm_preflight_checklist"[\s\S]{0,500}try\s*\{[\s\S]{0,300}catch\s*\(err\)/);
    expect(src).toMatch(/case "wedm_preflight_checklist"[\s\S]{0,500}\(err as Error\)\.message/);
  });

  it("schema map exposes wedm_preflight_checklist with passthrough+describe", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("wedm_preflight_checklist:");
    expect(src).toMatch(/wedm_preflight_checklist:\s*z\.object\(\{\}\)\.passthrough\(\)\.describe/);
  });

  it("engine source: WEDMPreFlightCheckEngine exports the singleton + generateChecklist method", () => {
    const enginePath = join(process.cwd(), "src/engines/WEDMPreFlightCheckEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const wedmPreFlightCheckEngine\s*=\s*new WEDMPreFlightCheckEngine\(\)/);
    expect(src).toMatch(/generateChecklist\(\s*input:\s*PreFlightInput\s*\):\s*PreFlightResult/);
  });
});
