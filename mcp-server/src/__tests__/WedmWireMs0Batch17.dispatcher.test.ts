/**
 * Round-trip dispatcher wiring tests for WEDM-WIRE-MS0/Batch17:
 *   U-WWB46: wedm_quote_to_line_items     → WEDMQuoteBridgeEngine.toQuoteLineItems (static)
 *   U-WWB47: wedm_reasoning_trace_recent  → WEDMReasoningTraceLedgerEngine.getRecent
 *   U-WWB48: edm_feasibility_assess       → EDMFeasibilityEngine.assess
 *
 * Three previously-unwired EDM/WEDM engines:
 *   - QuoteBridge (class-alias static): converts CostEstimate → WEDMQuoteLineItem[] with uncertainty
 *   - ReasoningTraceLedger (singleton): returns last N reasoning trace entries from disk-backed ledger
 *   - EDMFeasibility (singleton): assesses if a part can be produced via EDM given material + machine
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const DISPATCHER_PATH = join(process.cwd(), "src/tools/dispatchers/camDispatcher.ts");
const SCHEMA_PATH = join(process.cwd(), "src/schemas/camActionSchemas.ts");

describe("WEDM-WIRE-MS0/Batch17 — action enum membership", () => {
  it("camDispatcher ACTIONS array includes the 3 new actions", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('"wedm_quote_to_line_items"');
    expect(src).toContain('"wedm_reasoning_trace_recent"');
    expect(src).toContain('"edm_feasibility_assess"');
  });

  it("the WEDM-WIRE-MS0/Batch17 milestone tag is present in the enum block", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain("WEDM-WIRE-MS0/Batch17: quote bridge + trace ledger + EDM feasibility");
  });
});

describe("U-WWB46 — wedm_quote_to_line_items wiring", () => {
  it("dispatcher case lazy-imports WEDMQuoteBridgeEngine and calls toQuoteLineItems(cost, quantity)", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "wedm_quote_to_line_items"');
    expect(src).toContain("WEDMQuoteBridgeEngine.js");
    expect(src).toContain("wedmQuoteBridgeEngine.toQuoteLineItems");
    expect(src).toMatch(/case "wedm_quote_to_line_items"[\s\S]{0,2000}wedmQuoteBridgeEngine\.toQuoteLineItems\(\s*cost[\s\S]{0,200}quantity/);
  });

  it("case validates input.cost is an object AND defaults quantity to 1 when missing", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "wedm_quote_to_line_items"[\s\S]{0,2000}input required \(\{cost, quantity\?\}\)/);
    expect(src).toMatch(/case "wedm_quote_to_line_items"[\s\S]{0,2000}input\.cost \(CostEstimate object\) required/);
    expect(src).toMatch(/case "wedm_quote_to_line_items"[\s\S]{0,2000}input\.quantity[\s\S]{0,200}\?\s*input\.quantity\s*:\s*1/);
  });

  it("schema map exposes wedm_quote_to_line_items with input:record", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("wedm_quote_to_line_items:");
    expect(src).toMatch(/wedm_quote_to_line_items:\s*z\.object\(\{[\s\S]{0,500}input:\s*z\.record\(z\.string\(\),\s*z\.unknown\(\)\)/);
  });

  it("engine source: WEDMQuoteBridgeEngine exports the singleton + static toQuoteLineItems method", () => {
    const enginePath = join(process.cwd(), "src/engines/WEDMQuoteBridgeEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const wedmQuoteBridgeEngine\s*=\s*WEDMQuoteBridgeEngine/);
    expect(src).toMatch(/static toQuoteLineItems\(\s*[\s\S]{0,200}cost:\s*CostEstimate/);
  });
});

describe("U-WWB47 — wedm_reasoning_trace_recent wiring", () => {
  it("dispatcher case lazy-imports WEDMReasoningTraceLedgerEngine and calls getRecent(limit)", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "wedm_reasoning_trace_recent"');
    expect(src).toContain("WEDMReasoningTraceLedgerEngine.js");
    expect(src).toContain("wedmReasoningTraceLedgerEngine.getRecent");
  });

  it("case defaults limit to 100 when input.limit is missing AND wraps in try/catch", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "wedm_reasoning_trace_recent"[\s\S]{0,800}input\.limit[\s\S]{0,200}\?\s*input\.limit\s*:\s*100/);
    expect(src).toMatch(/case "wedm_reasoning_trace_recent"[\s\S]{0,800}try\s*\{[\s\S]{0,400}catch\s*\(err\)/);
    expect(src).toMatch(/case "wedm_reasoning_trace_recent"[\s\S]{0,800}\(err as Error\)\.message/);
  });

  it("schema map exposes wedm_reasoning_trace_recent with input:record", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("wedm_reasoning_trace_recent:");
    expect(src).toMatch(/wedm_reasoning_trace_recent:\s*z\.object\(\{[\s\S]{0,500}input:\s*z\.record\(z\.string\(\),\s*z\.unknown\(\)\)/);
  });

  it("engine source: WEDMReasoningTraceLedgerEngine exports the singleton + getRecent method", () => {
    const enginePath = join(process.cwd(), "src/engines/WEDMReasoningTraceLedgerEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const wedmReasoningTraceLedgerEngine\s*=\s*new WEDMReasoningTraceLedgerEngine\(\)/);
    expect(src).toMatch(/getRecent\(\s*limit\s*=\s*100\s*\):\s*ReasoningTraceEntry\[\]/);
  });
});

describe("U-WWB48 — edm_feasibility_assess wiring", () => {
  it("dispatcher case lazy-imports EDMFeasibilityEngine and calls assess", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "edm_feasibility_assess"');
    expect(src).toContain("EDMFeasibilityEngine.js");
    expect(src).toContain("edmFeasibilityEngine.assess");
  });

  it("case handler validates input AND wraps engine call in try/catch", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "edm_feasibility_assess"[\s\S]{0,800}input required \(FeasibilityInput\)/);
    expect(src).toMatch(/case "edm_feasibility_assess"[\s\S]{0,800}try\s*\{[\s\S]{0,400}catch\s*\(err\)/);
    expect(src).toMatch(/case "edm_feasibility_assess"[\s\S]{0,800}\(err as Error\)\.message/);
  });

  it("schema map exposes edm_feasibility_assess with input:record", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("edm_feasibility_assess:");
    expect(src).toMatch(/edm_feasibility_assess:\s*z\.object\(\{[\s\S]{0,500}input:\s*z\.record\(z\.string\(\),\s*z\.unknown\(\)\)/);
  });

  it("engine source: EDMFeasibilityEngine exports the singleton + assess method", () => {
    const enginePath = join(process.cwd(), "src/engines/EDMFeasibilityEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const edmFeasibilityEngine\s*=\s*new EDMFeasibilityEngine\(\)/);
    expect(src).toMatch(/assess\(\s*input:\s*FeasibilityInput\s*\):\s*FeasibilityResult/);
  });
});
