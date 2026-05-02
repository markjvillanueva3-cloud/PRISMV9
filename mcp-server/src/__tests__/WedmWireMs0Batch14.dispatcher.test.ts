/**
 * Round-trip dispatcher wiring tests for WEDM-WIRE-MS0/Batch14:
 *   U-WWB37: wedm_post_sodick   → WEDMPostSodickEngine.generate (E/S tech-table)
 *   U-WWB38: wedm_post_agie     → WEDMPostAgieEngine.generate (TEC/pulse table)
 *   U-WWB39: wedm_dwg_import    → WEDMDwgImportEngine.import (ASYNC, awaits Promise<DwgImportResult>)
 *
 * WWB37+WWB38 complete the WEDM controller-post family:
 *   route + Mitsubishi + Fanuc + Makino + Sodick + Agie = 6 dialects.
 *
 * WWB39 is the second async engine wired this milestone (mirrors WWB31).
 * Test asserts `await wedmDwgImportEngine.import` text on the case body.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const DISPATCHER_PATH = join(process.cwd(), "src/tools/dispatchers/camDispatcher.ts");
const SCHEMA_PATH = join(process.cwd(), "src/schemas/camActionSchemas.ts");

describe("WEDM-WIRE-MS0/Batch14 — action enum membership", () => {
  it("camDispatcher ACTIONS array includes the 3 new actions", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('"wedm_post_sodick"');
    expect(src).toContain('"wedm_post_agie"');
    expect(src).toContain('"wedm_dwg_import"');
  });

  it("the WEDM-WIRE-MS0/Batch14 milestone tag is present in the enum block", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain("WEDM-WIRE-MS0/Batch14: post Sodick + Agie + DWG import (async)");
  });
});

describe("U-WWB37 — wedm_post_sodick wiring", () => {
  it("dispatcher case lazy-imports WEDMPostSodickEngine and calls generate", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "wedm_post_sodick"');
    expect(src).toContain("WEDMPostSodickEngine.js");
    expect(src).toContain("wedmPostSodickEngine.generate");
  });

  it("case handler validates input param AND wraps engine call in try/catch", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "wedm_post_sodick"[\s\S]{0,800}input required \(WEDMPostInput\)/);
    expect(src).toMatch(/case "wedm_post_sodick"[\s\S]{0,800}try\s*\{[\s\S]{0,400}catch\s*\(err\)/);
    expect(src).toMatch(/case "wedm_post_sodick"[\s\S]{0,800}\(err as Error\)\.message/);
  });

  it("schema map exposes wedm_post_sodick with input:record", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("wedm_post_sodick:");
    expect(src).toMatch(/wedm_post_sodick:\s*z\.object\(\{[\s\S]{0,400}input:\s*z\.record\(z\.string\(\),\s*z\.unknown\(\)\)/);
  });

  it("engine source: WEDMPostSodickEngine exports the singleton + generate method", () => {
    const enginePath = join(process.cwd(), "src/engines/WEDMPostSodickEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const wedmPostSodickEngine\s*=\s*new WEDMPostSodickEngine\(\)/);
    expect(src).toMatch(/generate\(\s*input:\s*WEDMPostInput\s*\):\s*WEDMPostOutput/);
  });
});

describe("U-WWB38 — wedm_post_agie wiring", () => {
  it("dispatcher case lazy-imports WEDMPostAgieEngine and calls generate", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "wedm_post_agie"');
    expect(src).toContain("WEDMPostAgieEngine.js");
    expect(src).toContain("wedmPostAgieEngine.generate");
  });

  it("case handler validates input param AND wraps engine call in try/catch", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "wedm_post_agie"[\s\S]{0,800}input required \(WEDMPostInput\)/);
    expect(src).toMatch(/case "wedm_post_agie"[\s\S]{0,800}try\s*\{[\s\S]{0,400}catch\s*\(err\)/);
    expect(src).toMatch(/case "wedm_post_agie"[\s\S]{0,800}\(err as Error\)\.message/);
  });

  it("schema map exposes wedm_post_agie with input:record", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("wedm_post_agie:");
    expect(src).toMatch(/wedm_post_agie:\s*z\.object\(\{[\s\S]{0,400}input:\s*z\.record\(z\.string\(\),\s*z\.unknown\(\)\)/);
  });

  it("engine source: WEDMPostAgieEngine exports the singleton + generate method", () => {
    const enginePath = join(process.cwd(), "src/engines/WEDMPostAgieEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const wedmPostAgieEngine\s*=\s*new WEDMPostAgieEngine\(\)/);
    expect(src).toMatch(/generate\(\s*input:\s*WEDMPostInput\s*\):\s*WEDMPostOutput/);
  });
});

describe("U-WWB39 — wedm_dwg_import wiring (ASYNC)", () => {
  it("dispatcher case lazy-imports WEDMDwgImportEngine and AWAITS import()", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "wedm_dwg_import"');
    expect(src).toContain("WEDMDwgImportEngine.js");
    expect(src).toContain("wedmDwgImportEngine.import");
    // Async marker — case body must await the engine call
    expect(src).toMatch(/case "wedm_dwg_import"[\s\S]{0,800}await wedmDwgImportEngine\.import/);
  });

  it("case handler validates input param AND wraps engine call in try/catch", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "wedm_dwg_import"[\s\S]{0,800}input required \(DwgImportInput\)/);
    expect(src).toMatch(/case "wedm_dwg_import"[\s\S]{0,800}try\s*\{[\s\S]{0,400}catch\s*\(err\)/);
    expect(src).toMatch(/case "wedm_dwg_import"[\s\S]{0,800}\(err as Error\)\.message/);
  });

  it("schema map exposes wedm_dwg_import with input:record", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("wedm_dwg_import:");
    expect(src).toMatch(/wedm_dwg_import:\s*z\.object\(\{[\s\S]{0,400}input:\s*z\.record\(z\.string\(\),\s*z\.unknown\(\)\)/);
  });

  it("engine source: WEDMDwgImportEngine exports the singleton + ASYNC import method", () => {
    const enginePath = join(process.cwd(), "src/engines/WEDMDwgImportEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const wedmDwgImportEngine\s*=\s*new WEDMDwgImportEngine\(\)/);
    expect(src).toMatch(/async\s+import\(\s*input:\s*DwgImportInput\s*\):\s*Promise<DwgImportResult>/);
  });
});
