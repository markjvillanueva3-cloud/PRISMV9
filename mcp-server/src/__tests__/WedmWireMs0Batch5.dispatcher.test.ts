/**
 * Round-trip dispatcher wiring tests for WEDM-WIRE-MS0/Batch5:
 *   U-WWB10: wedm_kerf_predict             → WEDMKerfWidthEngine.predict
 *   U-WWB11: wedm_mrr_calc                 → WEDMMRRPhysicsEngine.calculate
 *   U-WWB12: wedm_dielectric_flush_adjust  → WEDMDielectricFlushAdjustEngine.calculate
 *
 * Same text-grep pattern as Batch1/2/3/4 (no zod runtime in worktree).
 * Three more physics-relevant orphan engines wired for safety/predictability.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const DISPATCHER_PATH = join(process.cwd(), "src/tools/dispatchers/camDispatcher.ts");
const SCHEMA_PATH = join(process.cwd(), "src/schemas/camActionSchemas.ts");

describe("WEDM-WIRE-MS0/Batch5 — action enum membership", () => {
  it("camDispatcher ACTIONS array includes the 3 new actions", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('"wedm_kerf_predict"');
    expect(src).toContain('"wedm_mrr_calc"');
    expect(src).toContain('"wedm_dielectric_flush_adjust"');
  });

  it("the WEDM-WIRE-MS0/Batch5 milestone tag is present in the enum block", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain("WEDM-WIRE-MS0/Batch5: kerf width + MRR physics + dielectric flush adjust");
  });
});

describe("U-WWB10 — wedm_kerf_predict wiring", () => {
  it("dispatcher case lazy-imports WEDMKerfWidthEngine and calls predict", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "wedm_kerf_predict"');
    expect(src).toContain("WEDMKerfWidthEngine.js");
    expect(src).toContain("wedmKerfWidthEngine.predict");
  });

  it("case handler validates input param AND wraps engine call in try/catch", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "wedm_kerf_predict"[\s\S]{0,800}input required \(KerfWidthInput\)/);
    expect(src).toMatch(/case "wedm_kerf_predict"[\s\S]{0,800}try\s*\{[\s\S]{0,400}catch\s*\(err\)/);
    expect(src).toMatch(/case "wedm_kerf_predict"[\s\S]{0,800}\(err as Error\)\.message/);
  });

  it("schema map exposes wedm_kerf_predict with input:record", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("wedm_kerf_predict:");
    expect(src).toMatch(/wedm_kerf_predict:\s*z\.object\(\{[\s\S]{0,400}input:\s*z\.record\(z\.string\(\),\s*z\.unknown\(\)\)/);
  });

  it("engine source: WEDMKerfWidthEngine exports the singleton + predict method", () => {
    const enginePath = join(process.cwd(), "src/engines/WEDMKerfWidthEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const wedmKerfWidthEngine\s*=\s*new WEDMKerfWidthEngine\(\)/);
    expect(src).toMatch(/predict\(\s*input:\s*KerfWidthInput\s*\):\s*KerfWidthResult/);
  });
});

describe("U-WWB11 — wedm_mrr_calc wiring", () => {
  it("dispatcher case lazy-imports WEDMMRRPhysicsEngine and calls calculate", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "wedm_mrr_calc"');
    expect(src).toContain("WEDMMRRPhysicsEngine.js");
    expect(src).toContain("wedmMRRPhysicsEngine.calculate");
  });

  it("case handler validates input param AND wraps engine call in try/catch", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "wedm_mrr_calc"[\s\S]{0,800}input required \(MRRInput\)/);
    expect(src).toMatch(/case "wedm_mrr_calc"[\s\S]{0,800}try\s*\{[\s\S]{0,400}catch\s*\(err\)/);
    expect(src).toMatch(/case "wedm_mrr_calc"[\s\S]{0,800}\(err as Error\)\.message/);
  });

  it("schema map exposes wedm_mrr_calc with input:record", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("wedm_mrr_calc:");
    expect(src).toMatch(/wedm_mrr_calc:\s*z\.object\(\{[\s\S]{0,400}input:\s*z\.record\(z\.string\(\),\s*z\.unknown\(\)\)/);
  });

  it("engine source: WEDMMRRPhysicsEngine exports the singleton + calculate method", () => {
    const enginePath = join(process.cwd(), "src/engines/WEDMMRRPhysicsEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const wedmMRRPhysicsEngine\s*=\s*new WEDMMRRPhysicsEngine\(\)/);
    expect(src).toMatch(/calculate\(\s*input:\s*MRRInput\s*\):\s*MRRResult/);
  });
});

describe("U-WWB12 — wedm_dielectric_flush_adjust wiring", () => {
  it("dispatcher case lazy-imports WEDMDielectricFlushAdjustEngine and calls calculate", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "wedm_dielectric_flush_adjust"');
    expect(src).toContain("WEDMDielectricFlushAdjustEngine.js");
    expect(src).toContain("wedmDielectricFlushAdjustEngine.calculate");
  });

  it("case handler validates input param AND wraps engine call in try/catch", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "wedm_dielectric_flush_adjust"[\s\S]{0,800}input required \(DielectricFlushAdjustInput\)/);
    expect(src).toMatch(/case "wedm_dielectric_flush_adjust"[\s\S]{0,800}try\s*\{[\s\S]{0,400}catch\s*\(err\)/);
    expect(src).toMatch(/case "wedm_dielectric_flush_adjust"[\s\S]{0,800}\(err as Error\)\.message/);
  });

  it("schema map exposes wedm_dielectric_flush_adjust with input:record", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("wedm_dielectric_flush_adjust:");
    expect(src).toMatch(/wedm_dielectric_flush_adjust:\s*z\.object\(\{[\s\S]{0,400}input:\s*z\.record\(z\.string\(\),\s*z\.unknown\(\)\)/);
  });

  it("engine source: WEDMDielectricFlushAdjustEngine exports the singleton + calculate method", () => {
    const enginePath = join(process.cwd(), "src/engines/WEDMDielectricFlushAdjustEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const wedmDielectricFlushAdjustEngine\s*=\s*new WEDMDielectricFlushAdjustEngine\(\)/);
    expect(src).toMatch(/calculate\(\s*input:\s*DielectricFlushAdjustInput\s*\):\s*DielectricFlushAdjustResult/);
  });
});
