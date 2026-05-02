/**
 * Round-trip dispatcher wiring tests for WEDM-WIRE-MS0/Batch24:
 *   U-WWB67: wedm_tribal_runtime_select   → WEDMTribalRuntimeEngine.select
 *   U-WWB68: wedm_tribal_tip_pending      → WEDMTribalTipLearnerEngine.getPendingReview + getStats
 *   U-WWB69: wedm_transfer_learning_apply → WEDMTransferLearningEngine.transfer
 *
 * Three previously-unwired WEDM tribal/transfer engines:
 *   - Tribal runtime: applies relevant tribal tips for current SelectionContext
 *   - Tribal tip learner: returns pending-review GeneratedTips + corpus stats
 *   - Transfer learning: maps cut params from source material/machine to target
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const DISPATCHER_PATH = join(process.cwd(), "src/tools/dispatchers/camDispatcher.ts");
const SCHEMA_PATH = join(process.cwd(), "src/schemas/camActionSchemas.ts");

describe("WEDM-WIRE-MS0/Batch24 — action enum membership", () => {
  it("camDispatcher ACTIONS array includes the 3 new actions", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('"wedm_tribal_runtime_select"');
    expect(src).toContain('"wedm_tribal_tip_pending"');
    expect(src).toContain('"wedm_transfer_learning_apply"');
  });

  it("the WEDM-WIRE-MS0/Batch24 milestone tag is present in the enum block", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain("WEDM-WIRE-MS0/Batch24: tribal runtime + tip learner + transfer learning");
  });
});

describe("U-WWB67 — wedm_tribal_runtime_select wiring", () => {
  it("dispatcher case lazy-imports WEDMTribalRuntimeEngine and calls select", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "wedm_tribal_runtime_select"');
    expect(src).toContain("WEDMTribalRuntimeEngine.js");
    expect(src).toContain("wedmTribalRuntimeEngine.select");
  });

  it("case handler validates input AND wraps engine call in try/catch", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "wedm_tribal_runtime_select"[\s\S]{0,800}input required \(SelectionContext\)/);
    expect(src).toMatch(/case "wedm_tribal_runtime_select"[\s\S]{0,800}\(err as Error\)\.message/);
  });

  it("schema map exposes wedm_tribal_runtime_select with input:record", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("wedm_tribal_runtime_select:");
    expect(src).toMatch(/wedm_tribal_runtime_select:\s*z\.object\(\{[\s\S]{0,500}input:\s*z\.record\(z\.string\(\),\s*z\.unknown\(\)\)/);
  });

  it("engine source: WEDMTribalRuntimeEngine exports the singleton + select method", () => {
    const enginePath = join(process.cwd(), "src/engines/WEDMTribalRuntimeEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const wedmTribalRuntimeEngine\s*=\s*new WEDMTribalRuntimeEngine\(\)/);
    expect(src).toMatch(/select\(\s*context:\s*SelectionContext\s*\):\s*SelectionResult/);
  });
});

describe("U-WWB68 — wedm_tribal_tip_pending wiring", () => {
  it("dispatcher case lazy-imports WEDMTribalTipLearnerEngine and returns getPendingReview + getStats", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "wedm_tribal_tip_pending"');
    expect(src).toContain("WEDMTribalTipLearnerEngine.js");
    expect(src).toContain("wedmTribalTipLearnerEngine.getPendingReview");
    expect(src).toMatch(/case "wedm_tribal_tip_pending"[\s\S]{0,1500}wedmTribalTipLearnerEngine\.getStats/);
  });

  it("case defaults limit=50 when missing AND wraps engine calls in try/catch", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "wedm_tribal_tip_pending"[\s\S]{0,1500}input\.limit[\s\S]{0,200}\?\s*input\.limit\s*:\s*50/);
    expect(src).toMatch(/case "wedm_tribal_tip_pending"[\s\S]{0,1500}\(err as Error\)\.message/);
  });

  it("schema map exposes wedm_tribal_tip_pending with input:record", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("wedm_tribal_tip_pending:");
    expect(src).toMatch(/wedm_tribal_tip_pending:\s*z\.object\(\{[\s\S]{0,500}input:\s*z\.record\(z\.string\(\),\s*z\.unknown\(\)\)/);
  });

  it("engine source: WEDMTribalTipLearnerEngine exports the singleton + getPendingReview method", () => {
    const enginePath = join(process.cwd(), "src/engines/WEDMTribalTipLearnerEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const wedmTribalTipLearnerEngine\s*=\s*new WEDMTribalTipLearnerEngine\(\)/);
    expect(src).toMatch(/getPendingReview\(\s*limit\s*=\s*50\s*\):\s*GeneratedTip\[\]/);
  });
});

describe("U-WWB69 — wedm_transfer_learning_apply wiring", () => {
  it("dispatcher case lazy-imports WEDMTransferLearningEngine and calls transfer", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "wedm_transfer_learning_apply"');
    expect(src).toContain("WEDMTransferLearningEngine.js");
    expect(src).toContain("wedmTransferLearningEngine.transfer");
  });

  it("case handler validates input AND wraps engine call in try/catch", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "wedm_transfer_learning_apply"[\s\S]{0,800}input required \(TransferContext\)/);
    expect(src).toMatch(/case "wedm_transfer_learning_apply"[\s\S]{0,800}\(err as Error\)\.message/);
  });

  it("schema map exposes wedm_transfer_learning_apply with input:record", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("wedm_transfer_learning_apply:");
    expect(src).toMatch(/wedm_transfer_learning_apply:\s*z\.object\(\{[\s\S]{0,500}input:\s*z\.record\(z\.string\(\),\s*z\.unknown\(\)\)/);
  });

  it("engine source: WEDMTransferLearningEngine exports the singleton + transfer method", () => {
    const enginePath = join(process.cwd(), "src/engines/WEDMTransferLearningEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const wedmTransferLearningEngine\s*=\s*new WEDMTransferLearningEngine\(\)/);
    expect(src).toMatch(/transfer\(\s*context:\s*TransferContext\s*\):\s*TransferResult/);
  });
});
