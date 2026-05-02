/**
 * Round-trip dispatcher wiring tests for LATHE-WIRE-MS0/Batch15:
 *   U-LWB40: lathe_post_dialect_generate → LathePostGeneratorDialectEngine.generate
 *   U-LWB41: lathe_po_build              → LathePurchaseOrderAutomationEngine.build
 *   U-LWB42: lathe_adaptive_record       → LatheAdaptiveMachiningEngine.recordOperation
 *
 * Three previously-unwired Lathe engines:
 *   - Dialect post-processor: generates controller-specific G-code from canned-cycle inputs
 *   - PO automation: builds purchase orders from inventory + vendor defaults
 *   - Adaptive machining recorder: appends turning operation profiles to history ledger
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const DISPATCHER_PATH = join(process.cwd(), "src/tools/dispatchers/turningDispatcher.ts");
const SCHEMA_PATH = join(process.cwd(), "src/schemas/turningActionSchemas.ts");

describe("LATHE-WIRE-MS0/Batch15 — action enum membership", () => {
  it("turningDispatcher ACTIONS array includes the 3 new actions", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('"lathe_post_dialect_generate"');
    expect(src).toContain('"lathe_po_build"');
    expect(src).toContain('"lathe_adaptive_record"');
  });

  it("the LATHE-WIRE-MS0/Batch15 milestone tag is present in the enum block", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain("LATHE-WIRE-MS0/Batch15: dialect post + PO automation + adaptive recorder");
  });
});

describe("U-LWB40 — lathe_post_dialect_generate wiring", () => {
  it("dispatcher case lazy-imports LathePostGeneratorDialectEngine and calls generate", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "lathe_post_dialect_generate"');
    expect(src).toContain("LathePostGeneratorDialectEngine.js");
    expect(src).toContain("lathePostGeneratorDialectEngine.generate");
  });

  it("case handler validates input param AND wraps engine call in try/catch", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "lathe_post_dialect_generate"[\s\S]{0,800}input required \(DialectGenerationInput\)/);
    expect(src).toMatch(/case "lathe_post_dialect_generate"[\s\S]{0,800}try\s*\{[\s\S]{0,400}catch\s*\(err\)/);
    expect(src).toMatch(/case "lathe_post_dialect_generate"[\s\S]{0,800}\(err as Error\)\.message/);
  });

  it("schema map exposes lathe_post_dialect_generate with input:record", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("lathe_post_dialect_generate:");
    expect(src).toMatch(/lathe_post_dialect_generate:\s*z\.object\(\{[\s\S]{0,400}input:\s*z\.record\(z\.string\(\),\s*z\.unknown\(\)\)/);
  });

  it("engine source: LathePostGeneratorDialectEngine exports the singleton + generate method", () => {
    const enginePath = join(process.cwd(), "src/engines/LathePostGeneratorDialectEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const lathePostGeneratorDialectEngine\s*=\s*LathePostGeneratorDialectEngine/);
    expect(src).toMatch(/static generate\(\s*input:\s*DialectGenerationInput\s*\):\s*GeneratedGCode/);
  });
});

describe("U-LWB41 — lathe_po_build wiring", () => {
  it("dispatcher case lazy-imports LathePurchaseOrderAutomationEngine and calls build", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "lathe_po_build"');
    expect(src).toContain("LathePurchaseOrderAutomationEngine.js");
    expect(src).toContain("lathePurchaseOrderAutomationEngine.build");
  });

  it("case handler validates input param AND wraps engine call in try/catch", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "lathe_po_build"[\s\S]{0,800}input required \(BuildPOInput\)/);
    expect(src).toMatch(/case "lathe_po_build"[\s\S]{0,800}try\s*\{[\s\S]{0,400}catch\s*\(err\)/);
    expect(src).toMatch(/case "lathe_po_build"[\s\S]{0,800}\(err as Error\)\.message/);
  });

  it("schema map exposes lathe_po_build with input:record", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("lathe_po_build:");
    expect(src).toMatch(/lathe_po_build:\s*z\.object\(\{[\s\S]{0,400}input:\s*z\.record\(z\.string\(\),\s*z\.unknown\(\)\)/);
  });

  it("engine source: LathePurchaseOrderAutomationEngine exports the singleton + build method", () => {
    const enginePath = join(process.cwd(), "src/engines/LathePurchaseOrderAutomationEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const lathePurchaseOrderAutomationEngine\s*=\s*new LathePurchaseOrderAutomationEngine\(\)/);
    expect(src).toMatch(/build\(\s*input:\s*BuildPOInput\s*\):\s*BuildPOResult/);
  });
});

describe("U-LWB42 — lathe_adaptive_record wiring", () => {
  it("dispatcher case lazy-imports LatheAdaptiveMachiningEngine and calls recordOperation", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "lathe_adaptive_record"');
    expect(src).toContain("LatheAdaptiveMachiningEngine.js");
    expect(src).toContain("latheAdaptiveMachiningEngine.recordOperation");
  });

  it("case handler validates input AND returns history_size from getOperationHistory", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "lathe_adaptive_record"[\s\S]{0,800}input required \(TurningEngagementProfile\)/);
    expect(src).toMatch(/case "lathe_adaptive_record"[\s\S]{0,800}history_size:\s*latheAdaptiveMachiningEngine\.getOperationHistory\(\)\.length/);
    expect(src).toMatch(/case "lathe_adaptive_record"[\s\S]{0,800}\(err as Error\)\.message/);
  });

  it("schema map exposes lathe_adaptive_record with input:record", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("lathe_adaptive_record:");
    expect(src).toMatch(/lathe_adaptive_record:\s*z\.object\(\{[\s\S]{0,400}input:\s*z\.record\(z\.string\(\),\s*z\.unknown\(\)\)/);
  });

  it("engine source: LatheAdaptiveMachiningEngine exports the singleton + recordOperation method", () => {
    const enginePath = join(process.cwd(), "src/engines/LatheAdaptiveMachiningEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const latheAdaptiveMachiningEngine\s*=\s*new LatheAdaptiveMachiningEngine\(\)/);
    expect(src).toMatch(/recordOperation\(\s*profile:\s*TurningEngagementProfile\s*\):\s*void/);
  });
});
