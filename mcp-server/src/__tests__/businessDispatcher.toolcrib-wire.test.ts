/**
 * businessDispatcher.toolcrib-wire.test.ts -- HOTEL-ERP-WIRING/U-ERP-TOOLCRIB-ROUTES
 *
 * Standing wiring guard for the Kienzle Tool Crib read feeds. The toolInventoryOrchestrator /
 * ERPToolInventory / ToolCostPerPart / tool-life-forecast backend existed as prism_business actions but
 * had NO REST routes -- the Tool Crib page could not reach it. erp.ts now routes them; this round-trips
 * each action through the REAL dispatcher (registerBusinessDispatcher -> switch -> engine) and asserts it
 * RESOLVES (not "Unknown business action"). Goes red if a case is deleted/renamed or an action dropped.
 *
 * Also regression-locks the report_tool_life_forecast crash fix: called with NO material it must return a
 * real forecast (normalizeMaterial now coerces undefined -> "steel"), not throw
 * "Cannot read properties of undefined (reading 'toLowerCase')".
 */
import { describe, it, expect } from "vitest";
import { registerBusinessDispatcher } from "../tools/dispatchers/businessDispatcher.js";

type Handler = (args: { action: string; params?: Record<string, any> }) => Promise<any>;

function getHandler(): Handler {
  let captured: Handler | undefined;
  registerBusinessDispatcher({
    tool(_name: string, _desc: string, _schema: unknown, fn: Handler) {
      captured = fn;
    },
  });
  if (!captured) throw new Error("registerBusinessDispatcher did not register a handler");
  return captured;
}

function unwrap(res: any): any {
  if (res == null) return res;
  if (res.type === "text" && typeof res.text === "string") {
    try { return JSON.parse(res.text); } catch { return res.text; }
  }
  const arrText = res?.content?.[0]?.text;
  if (typeof arrText === "string") {
    try { return JSON.parse(arrText); } catch { return arrText; }
  }
  return res;
}

const isUnknownAction = (out: any) => typeof out?.error === "string" && /unknown business action/i.test(out.error);

describe("businessDispatcher -- Tool Crib read feeds are wired (not Unknown-action stubs)", () => {
  const handler = getHandler();

  it("tool_inv_reorder_list resolves to toolInventoryOrchestrator.getReorderList() with a real rollup", async () => {
    const out = unwrap(await handler({ action: "tool_inv_reorder_list", params: {} }));
    expect(isUnknownAction(out)).toBe(false);
    expect(Array.isArray(out.items)).toBe(true);
    expect(typeof out.summary.total_items).toBe("number"); // real {critical,high,medium,low,total_items} rollup
  });

  it("erp_tool_search resolves to ERPToolInventory.searchTools() returning a tools array (query required, min 1)", async () => {
    // erp_tool_search's query is z.string().min(1) -- a search needs a term; "end" matches real catalog tools.
    const out = unwrap(await handler({ action: "erp_tool_search", params: { query: "end" } }));
    expect(isUnknownAction(out)).toBe(false);
    expect(Array.isArray(out.tools)).toBe(true);
    expect(out.tools.length).toBeGreaterThan(0); // real catalog hit (e.g. EM-0500-4FL end mill)
  });

  it("tool_inv_suggest_substitutes resolves with a real diameter (non-empty object, not an error stub)", async () => {
    const out = unwrap(await handler({ action: "tool_inv_suggest_substitutes", params: { required_diameter: 10, required_type: "endmill", material: "P" } }));
    expect(isUnknownAction(out)).toBe(false);
    expect(typeof out).toBe("object");
    expect(Object.keys(out).length).toBeGreaterThan(0);
  });

  it("tool_cost_per_part resolves to ToolCostPerPartEngine.calculate() with a cost_per_part value", async () => {
    const out = unwrap(await handler({ action: "tool_cost_per_part", params: {} }));
    expect(isUnknownAction(out)).toBe(false);
    expect(typeof out.cost_per_part.value).toBe("number"); // real AtomicValue {value,unit,...}
  });

  it("report_tool_life_forecast resolves AND does not crash on a MISSING material (crash-fix lock)", async () => {
    // No material -> normalizeMaterial must coerce to "steel", not throw on undefined.toLowerCase().
    const out = unwrap(await handler({ action: "report_tool_life_forecast", params: { cutting_speed_mpm: 150 } }));
    expect(isUnknownAction(out)).toBe(false);
    expect(JSON.stringify(out)).not.toMatch(/toLowerCase/i); // not the crash-error envelope
    expect(Object.keys(out).length).toBeGreaterThan(0); // a real forecast object
  });

  it("tool_inv_check_availability resolves to toolInventoryOrchestrator.checkAvailability()", async () => {
    const out = unwrap(await handler({ action: "tool_inv_check_availability", params: { operations: [] } }));
    expect(isUnknownAction(out)).toBe(false);
    expect(typeof out).toBe("object");
    expect(Object.keys(out).length).toBeGreaterThan(0);
  });

  it("tool_inv_optimize_crib resolves to toolInventoryOrchestrator.optimizeToolCrib()", async () => {
    const out = unwrap(await handler({ action: "tool_inv_optimize_crib", params: { usage_history: [] } }));
    expect(isUnknownAction(out)).toBe(false);
    expect(typeof out).toBe("object");
    expect(Object.keys(out).length).toBeGreaterThan(0);
  });

  it("an unknown tool-crib action DOES error (proves the resolution markers are load-bearing)", async () => {
    const out = unwrap(await handler({ action: "tool_inv_reorder_list_DOES_NOT_EXIST" as any, params: {} }));
    expect(isUnknownAction(out)).toBe(true);
  });
});
