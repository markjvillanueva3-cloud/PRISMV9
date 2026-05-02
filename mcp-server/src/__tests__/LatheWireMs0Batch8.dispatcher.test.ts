/**
 * Round-trip dispatcher wiring tests for LATHE-WIRE-MS0/Batch8:
 *   U-LWB19: lathe_customer_order_create  → LatheCustomerOrderLifecycleEngine.createOrder
 *   U-LWB20: lathe_erp_full                → LatheERPOrchestratorEngine.erpFull
 *   U-LWB21: lathe_masterpost_route        → LatheMasterPostRouterEngine.route
 *
 * Same single-arg input pattern as Batch3 — three more orphan engines
 * connecting the lathe shop to ERP + customer order + post-routing.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const DISPATCHER_PATH = join(process.cwd(), "src/tools/dispatchers/turningDispatcher.ts");
const SCHEMA_PATH = join(process.cwd(), "src/schemas/turningActionSchemas.ts");

describe("LATHE-WIRE-MS0/Batch8 — action enum membership", () => {
  it("turningDispatcher ACTIONS array includes the 3 new actions", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('"lathe_customer_order_create"');
    expect(src).toContain('"lathe_erp_full"');
    expect(src).toContain('"lathe_masterpost_route"');
  });

  it("the LATHE-WIRE-MS0/Batch8 milestone tag is present in the enum block", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain("LATHE-WIRE-MS0/Batch8: customer order + ERP orchestrator + master post router");
  });
});

describe("U-LWB19 — lathe_customer_order_create wiring", () => {
  it("dispatcher case lazy-imports LatheCustomerOrderLifecycleEngine and calls createOrder", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "lathe_customer_order_create"');
    expect(src).toContain("LatheCustomerOrderLifecycleEngine.js");
    expect(src).toContain("latheCustomerOrderLifecycleEngine.createOrder");
  });

  it("case handler validates input param AND wraps engine call in try/catch", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "lathe_customer_order_create"[\s\S]{0,800}input required \(CreateOrderInput\)/);
    expect(src).toMatch(/case "lathe_customer_order_create"[\s\S]{0,800}try\s*\{[\s\S]{0,400}catch\s*\(err\)/);
    expect(src).toMatch(/case "lathe_customer_order_create"[\s\S]{0,800}\(err as Error\)\.message/);
  });

  it("schema map exposes lathe_customer_order_create with input:record", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("lathe_customer_order_create:");
    expect(src).toMatch(/lathe_customer_order_create:\s*z\.object\(\{[\s\S]{0,400}input:\s*z\.record\(z\.string\(\),\s*z\.unknown\(\)\)/);
  });

  it("engine source: LatheCustomerOrderLifecycleEngine exports the singleton + createOrder method", () => {
    const enginePath = join(process.cwd(), "src/engines/LatheCustomerOrderLifecycleEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const latheCustomerOrderLifecycleEngine\s*=\s*new LatheCustomerOrderLifecycleEngine\(\)/);
    expect(src).toMatch(/createOrder\(\s*input:\s*CreateOrderInput\s*\):\s*OrderRecord/);
  });
});

describe("U-LWB20 — lathe_erp_full wiring", () => {
  it("dispatcher case lazy-imports LatheERPOrchestratorEngine and calls erpFull", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "lathe_erp_full"');
    expect(src).toContain("LatheERPOrchestratorEngine.js");
    expect(src).toContain("latheERPOrchestratorEngine.erpFull");
  });

  it("case handler validates input param AND wraps engine call in try/catch", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "lathe_erp_full"[\s\S]{0,800}input required \(ERPFullInput\)/);
    expect(src).toMatch(/case "lathe_erp_full"[\s\S]{0,800}try\s*\{[\s\S]{0,400}catch\s*\(err\)/);
    expect(src).toMatch(/case "lathe_erp_full"[\s\S]{0,800}\(err as Error\)\.message/);
  });

  it("schema map exposes lathe_erp_full with input:record", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("lathe_erp_full:");
    expect(src).toMatch(/lathe_erp_full:\s*z\.object\(\{[\s\S]{0,400}input:\s*z\.record\(z\.string\(\),\s*z\.unknown\(\)\)/);
  });

  it("engine source: LatheERPOrchestratorEngine exports the singleton + erpFull method", () => {
    const enginePath = join(process.cwd(), "src/engines/LatheERPOrchestratorEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const latheERPOrchestratorEngine\s*=\s*new LatheERPOrchestratorEngine\(\)/);
    expect(src).toMatch(/erpFull\(\s*input:\s*ERPFullInput\s*\):\s*ERPFullReport/);
  });
});

describe("U-LWB21 — lathe_masterpost_route wiring", () => {
  it("dispatcher case lazy-imports LatheMasterPostRouterEngine and calls route", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "lathe_masterpost_route"');
    expect(src).toContain("LatheMasterPostRouterEngine.js");
    expect(src).toContain("latheMasterPostRouterEngine.route");
  });

  it("case handler validates input param AND wraps engine call in try/catch", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "lathe_masterpost_route"[\s\S]{0,800}input required \(LatheRouteInput\)/);
    expect(src).toMatch(/case "lathe_masterpost_route"[\s\S]{0,800}try\s*\{[\s\S]{0,400}catch\s*\(err\)/);
    expect(src).toMatch(/case "lathe_masterpost_route"[\s\S]{0,800}\(err as Error\)\.message/);
  });

  it("schema map exposes lathe_masterpost_route with input:record", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("lathe_masterpost_route:");
    expect(src).toMatch(/lathe_masterpost_route:\s*z\.object\(\{[\s\S]{0,400}input:\s*z\.record\(z\.string\(\),\s*z\.unknown\(\)\)/);
  });

  it("engine source: LatheMasterPostRouterEngine exports the singleton + route method", () => {
    const enginePath = join(process.cwd(), "src/engines/LatheMasterPostRouterEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const latheMasterPostRouterEngine\s*=\s*new LatheMasterPostRouterEngine\(\)/);
    expect(src).toMatch(/route\(\s*input:\s*LatheRouteInput\s*\):\s*LatheRouteResult/);
  });
});
