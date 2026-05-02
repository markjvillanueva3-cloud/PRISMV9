/**
 * Round-trip dispatcher wiring tests for WEDM-WIRE-MS0/Batch13:
 *   U-WWB34: wedm_post_mitsubishi  → WEDMPostMitsubishiEngine.generate (E-code conditions)
 *   U-WWB35: wedm_post_fanuc       → WEDMPostFanucEngine.generate (C-code labels)
 *   U-WWB36: wedm_post_makino      → WEDMPostMakinoEngine.generate
 *
 * All three are controller-specific WEDM post engines with the SAME shape:
 *   generate(input: WEDMPostInput): WEDMPostOutput
 * but they emit dialect-specific G-code (Mitsubishi E-codes, Fanuc C-labels,
 * Makino dialect). Wiring all three lets callers pick by dialect explicitly,
 * complementing wedm_post_route which auto-selects.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const DISPATCHER_PATH = join(process.cwd(), "src/tools/dispatchers/camDispatcher.ts");
const SCHEMA_PATH = join(process.cwd(), "src/schemas/camActionSchemas.ts");

describe("WEDM-WIRE-MS0/Batch13 — action enum membership", () => {
  it("camDispatcher ACTIONS array includes the 3 new actions", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('"wedm_post_mitsubishi"');
    expect(src).toContain('"wedm_post_fanuc"');
    expect(src).toContain('"wedm_post_makino"');
  });

  it("the WEDM-WIRE-MS0/Batch13 milestone tag is present in the enum block", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain("WEDM-WIRE-MS0/Batch13: post Mitsubishi + Fanuc + Makino (controller-specific generate)");
  });
});

describe("U-WWB34 — wedm_post_mitsubishi wiring", () => {
  it("dispatcher case lazy-imports WEDMPostMitsubishiEngine and calls generate", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "wedm_post_mitsubishi"');
    expect(src).toContain("WEDMPostMitsubishiEngine.js");
    expect(src).toContain("wedmPostMitsubishiEngine.generate");
  });

  it("case handler validates input param AND wraps engine call in try/catch", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "wedm_post_mitsubishi"[\s\S]{0,800}input required \(WEDMPostInput\)/);
    expect(src).toMatch(/case "wedm_post_mitsubishi"[\s\S]{0,800}try\s*\{[\s\S]{0,400}catch\s*\(err\)/);
    expect(src).toMatch(/case "wedm_post_mitsubishi"[\s\S]{0,800}\(err as Error\)\.message/);
  });

  it("schema map exposes wedm_post_mitsubishi with input:record", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("wedm_post_mitsubishi:");
    expect(src).toMatch(/wedm_post_mitsubishi:\s*z\.object\(\{[\s\S]{0,400}input:\s*z\.record\(z\.string\(\),\s*z\.unknown\(\)\)/);
  });

  it("engine source: WEDMPostMitsubishiEngine exports the singleton + generate method", () => {
    const enginePath = join(process.cwd(), "src/engines/WEDMPostMitsubishiEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const wedmPostMitsubishiEngine\s*=\s*new WEDMPostMitsubishiEngine\(\)/);
    expect(src).toMatch(/generate\(\s*input:\s*WEDMPostInput\s*\):\s*WEDMPostOutput/);
  });
});

describe("U-WWB35 — wedm_post_fanuc wiring", () => {
  it("dispatcher case lazy-imports WEDMPostFanucEngine and calls generate", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "wedm_post_fanuc"');
    expect(src).toContain("WEDMPostFanucEngine.js");
    expect(src).toContain("wedmPostFanucEngine.generate");
  });

  it("case handler validates input param AND wraps engine call in try/catch", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "wedm_post_fanuc"[\s\S]{0,800}input required \(WEDMPostInput\)/);
    expect(src).toMatch(/case "wedm_post_fanuc"[\s\S]{0,800}try\s*\{[\s\S]{0,400}catch\s*\(err\)/);
    expect(src).toMatch(/case "wedm_post_fanuc"[\s\S]{0,800}\(err as Error\)\.message/);
  });

  it("schema map exposes wedm_post_fanuc with input:record", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("wedm_post_fanuc:");
    expect(src).toMatch(/wedm_post_fanuc:\s*z\.object\(\{[\s\S]{0,400}input:\s*z\.record\(z\.string\(\),\s*z\.unknown\(\)\)/);
  });

  it("engine source: WEDMPostFanucEngine exports the singleton + generate method", () => {
    const enginePath = join(process.cwd(), "src/engines/WEDMPostFanucEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const wedmPostFanucEngine\s*=\s*new WEDMPostFanucEngine\(\)/);
    expect(src).toMatch(/generate\(\s*input:\s*WEDMPostInput\s*\):\s*WEDMPostOutput/);
  });
});

describe("U-WWB36 — wedm_post_makino wiring", () => {
  it("dispatcher case lazy-imports WEDMPostMakinoEngine and calls generate", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "wedm_post_makino"');
    expect(src).toContain("WEDMPostMakinoEngine.js");
    expect(src).toContain("wedmPostMakinoEngine.generate");
  });

  it("case handler validates input param AND wraps engine call in try/catch", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "wedm_post_makino"[\s\S]{0,800}input required \(WEDMPostInput\)/);
    expect(src).toMatch(/case "wedm_post_makino"[\s\S]{0,800}try\s*\{[\s\S]{0,400}catch\s*\(err\)/);
    expect(src).toMatch(/case "wedm_post_makino"[\s\S]{0,800}\(err as Error\)\.message/);
  });

  it("schema map exposes wedm_post_makino with input:record", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("wedm_post_makino:");
    expect(src).toMatch(/wedm_post_makino:\s*z\.object\(\{[\s\S]{0,400}input:\s*z\.record\(z\.string\(\),\s*z\.unknown\(\)\)/);
  });

  it("engine source: WEDMPostMakinoEngine exports the singleton + generate method", () => {
    const enginePath = join(process.cwd(), "src/engines/WEDMPostMakinoEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const wedmPostMakinoEngine\s*=\s*new WEDMPostMakinoEngine\(\)/);
    expect(src).toMatch(/generate\(\s*input:\s*WEDMPostInput\s*\):\s*WEDMPostOutput/);
  });
});
