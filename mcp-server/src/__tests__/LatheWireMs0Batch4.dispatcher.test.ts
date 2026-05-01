/**
 * Round-trip dispatcher wiring tests for LATHE-WIRE-MS0/Batch4:
 *   U-LWB07: lathe_cost_reconcile             → LatheActualCostReconciliationEngine.reconcile
 *   U-LWB08: lathe_job_profitability_record   → LatheJobProfitabilityAnalyticsEngine.recordJob
 *   U-LWB09: lathe_inventory_upsert           → LatheInventoryIntelligenceEngine.upsertItem
 *
 * Same text-grep pattern as Batch1/2/3 (no zod runtime in worktree).
 * All three engines expose clean single-arg input methods.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const DISPATCHER_PATH = join(process.cwd(), "src/tools/dispatchers/turningDispatcher.ts");
const SCHEMA_PATH = join(process.cwd(), "src/schemas/turningActionSchemas.ts");

describe("LATHE-WIRE-MS0/Batch4 — action enum membership", () => {
  it("turningDispatcher ACTIONS array includes the 3 new actions", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('"lathe_cost_reconcile"');
    expect(src).toContain('"lathe_job_profitability_record"');
    expect(src).toContain('"lathe_inventory_upsert"');
  });

  it("the LATHE-WIRE-MS0/Batch4 milestone tag is present in the enum block", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain("LATHE-WIRE-MS0/Batch4: cost reconcile + job profitability + inventory upsert");
  });
});

describe("U-LWB07 — lathe_cost_reconcile wiring", () => {
  it("dispatcher case lazy-imports LatheActualCostReconciliationEngine and calls reconcile", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "lathe_cost_reconcile"');
    expect(src).toContain("LatheActualCostReconciliationEngine.js");
    expect(src).toContain("latheActualCostReconciliationEngine.reconcile");
  });

  it("case handler validates input param AND wraps engine call in try/catch", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "lathe_cost_reconcile"[\s\S]{0,800}input required \(ReconcileInput\)/);
    expect(src).toMatch(/case "lathe_cost_reconcile"[\s\S]{0,800}try\s*\{[\s\S]{0,400}catch\s*\(err\)/);
    expect(src).toMatch(/case "lathe_cost_reconcile"[\s\S]{0,800}\(err as Error\)\.message/);
  });

  it("schema map exposes lathe_cost_reconcile with input:record", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("lathe_cost_reconcile:");
    expect(src).toMatch(/lathe_cost_reconcile:\s*z\.object\(\{[\s\S]{0,400}input:\s*z\.record\(z\.string\(\),\s*z\.unknown\(\)\)/);
  });

  it("engine source: LatheActualCostReconciliationEngine exports the singleton + reconcile method", () => {
    const enginePath = join(process.cwd(), "src/engines/LatheActualCostReconciliationEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const latheActualCostReconciliationEngine\s*=\s*new LatheActualCostReconciliationEngine\(\)/);
    expect(src).toMatch(/reconcile\(\s*input:\s*ReconcileInput\s*\):\s*ReconciliationReport/);
  });
});

describe("U-LWB08 — lathe_job_profitability_record wiring", () => {
  it("dispatcher case lazy-imports LatheJobProfitabilityAnalyticsEngine and calls recordJob", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "lathe_job_profitability_record"');
    expect(src).toContain("LatheJobProfitabilityAnalyticsEngine.js");
    expect(src).toContain("latheJobProfitabilityAnalyticsEngine.recordJob");
  });

  it("case handler validates input param AND wraps engine call in try/catch", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "lathe_job_profitability_record"[\s\S]{0,800}input required \(RecordJobInput\)/);
    expect(src).toMatch(/case "lathe_job_profitability_record"[\s\S]{0,800}try\s*\{[\s\S]{0,400}catch\s*\(err\)/);
    expect(src).toMatch(/case "lathe_job_profitability_record"[\s\S]{0,800}\(err as Error\)\.message/);
  });

  it("schema map exposes lathe_job_profitability_record with input:record", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("lathe_job_profitability_record:");
    expect(src).toMatch(/lathe_job_profitability_record:\s*z\.object\(\{[\s\S]{0,400}input:\s*z\.record\(z\.string\(\),\s*z\.unknown\(\)\)/);
  });

  it("engine source: LatheJobProfitabilityAnalyticsEngine exports the singleton + recordJob method", () => {
    const enginePath = join(process.cwd(), "src/engines/LatheJobProfitabilityAnalyticsEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const latheJobProfitabilityAnalyticsEngine\s*=\s*new LatheJobProfitabilityAnalyticsEngine\(\)/);
    expect(src).toMatch(/recordJob\(\s*input:\s*RecordJobInput\s*\):\s*JobProfitability/);
  });
});

describe("U-LWB09 — lathe_inventory_upsert wiring", () => {
  it("dispatcher case lazy-imports LatheInventoryIntelligenceEngine and calls upsertItem", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "lathe_inventory_upsert"');
    expect(src).toContain("LatheInventoryIntelligenceEngine.js");
    expect(src).toContain("latheInventoryIntelligenceEngine.upsertItem");
  });

  it("case handler validates input param AND wraps engine call in try/catch", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "lathe_inventory_upsert"[\s\S]{0,800}input required \(UpsertItemInput\)/);
    expect(src).toMatch(/case "lathe_inventory_upsert"[\s\S]{0,800}try\s*\{[\s\S]{0,400}catch\s*\(err\)/);
    expect(src).toMatch(/case "lathe_inventory_upsert"[\s\S]{0,800}\(err as Error\)\.message/);
  });

  it("schema map exposes lathe_inventory_upsert with input:record", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("lathe_inventory_upsert:");
    expect(src).toMatch(/lathe_inventory_upsert:\s*z\.object\(\{[\s\S]{0,400}input:\s*z\.record\(z\.string\(\),\s*z\.unknown\(\)\)/);
  });

  it("engine source: LatheInventoryIntelligenceEngine exports the singleton + upsertItem method", () => {
    const enginePath = join(process.cwd(), "src/engines/LatheInventoryIntelligenceEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const latheInventoryIntelligenceEngine\s*=\s*new LatheInventoryIntelligenceEngine\(\)/);
    expect(src).toMatch(/upsertItem\(\s*input:\s*UpsertItemInput\s*\):\s*InventoryItem/);
  });
});
