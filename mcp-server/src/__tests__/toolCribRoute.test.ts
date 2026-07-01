/**
 * Tool Crib REST route (createToolCribRouter) -- contract tests.
 *
 * Verifies the design-independent backend bridge that the Kienzle Tool Crib page consumes:
 *  - the right prism_calc action + field-picked params are forwarded;
 *  - a dispatcher/transport `{ error }` maps to HTTP 400 (fail-loud, R12);
 *  - a tool-crib BUSINESS denial (`{ success:false, record:null, message }`, e.g. out of stock) passes
 *    through as a VALID 200 result -- NOT a 400 (the bug a naive clone of business.ts would introduce);
 *  - a transport THROW bubbles (the router, not dispatchToolCrib, maps it to 500);
 *  - the 4 expected routes are registered.
 */
import { describe, it, expect } from "vitest";
import type { CallToolFn } from "../routes/index.js";
import {
  isToolCribError,
  toolCribErrorMessage,
  pickCheckoutParams,
  pickCheckinParams,
  dispatchToolCrib,
  createToolCribRouter,
} from "../routes/toolCrib.js";

/** Build a CallToolFn mock that returns `payload` and records every call. */
function mockCallTool(payload: unknown): { fn: CallToolFn; calls: Array<[string, string, unknown]> } {
  const calls: Array<[string, string, unknown]> = [];
  const fn = (async (tool: string, action: string, params: unknown) => {
    calls.push([tool, action, params]);
    return payload;
  }) as unknown as CallToolFn;
  return { fn, calls };
}

describe("isToolCribError", () => {
  it("flags a bare { error }", () => {
    expect(isToolCribError({ error: "boom" })).toBe(true);
  });
  it("flags the dispatcherError envelope { success:false, error }", () => {
    expect(isToolCribError({ success: false, error: "engine threw" })).toBe(true);
  });
  it("does NOT flag a business denial { success:false, record:null, message } (valid 200)", () => {
    expect(
      isToolCribError({ success: false, record: null, message: "out of stock", remaining_available: 0 }),
    ).toBe(false);
  });
  it("does NOT flag a valid InventoryReport payload", () => {
    expect(isToolCribError({ total_items: 12, total_value: 4200 })).toBe(false);
  });
  it("does NOT flag null, an array, or an empty error string", () => {
    expect(isToolCribError(null)).toBe(false);
    expect(isToolCribError([{ error: "x" }])).toBe(false);
    expect(isToolCribError({ error: "" })).toBe(false);
  });
});

describe("toolCribErrorMessage", () => {
  it("returns the error string when present", () => {
    expect(toolCribErrorMessage({ error: "unknown tool" })).toBe("unknown tool");
  });
  it("falls back to a generic message for a non-string/empty error", () => {
    expect(toolCribErrorMessage({ error: 42 })).toBe("tool crib dispatch failed");
    expect(toolCribErrorMessage({ error: "  " })).toBe("tool crib dispatch failed");
  });
});

describe("pickCheckoutParams", () => {
  it("keeps the 4 engine fields, drops extras", () => {
    expect(
      pickCheckoutParams({ tool_id: "T1", operator_id: "OP", machine_id: "M", job_id: "J", junk: 9 }),
    ).toEqual({ tool_id: "T1", operator_id: "OP", machine_id: "M", job_id: "J" });
  });
  it("defaults every field for empty / null bodies", () => {
    const empty = { tool_id: "", operator_id: "", machine_id: "", job_id: "" };
    expect(pickCheckoutParams({})).toEqual(empty);
    expect(pickCheckoutParams(null)).toEqual(empty);
  });
});

describe("pickCheckinParams", () => {
  it("passes through valid fields", () => {
    expect(
      pickCheckinParams({ tool_id: "T1", operator_id: "OP", usage_min: 42, condition: "worn" }),
    ).toEqual({ tool_id: "T1", operator_id: "OP", usage_min: 42, condition: "worn" });
  });
  it("coerces a numeric-string usage_min and defaults condition", () => {
    expect(pickCheckinParams({ usage_min: "55" })).toEqual({
      tool_id: "",
      operator_id: "",
      usage_min: 55,
      condition: "good",
    });
  });
  it("floors a non-numeric usage_min to 0", () => {
    expect(pickCheckinParams({ usage_min: "abc" })).toEqual({
      tool_id: "",
      operator_id: "",
      usage_min: 0,
      condition: "good",
    });
  });
});

describe("dispatchToolCrib", () => {
  it("forwards (prism_calc, action, params) and wraps a success payload as { result }", async () => {
    const { fn, calls } = mockCallTool({ total_items: 3 });
    const r = await dispatchToolCrib(fn, "tool_crib_inventory", {});
    expect(calls[0]).toEqual(["prism_calc", "tool_crib_inventory", {}]);
    expect(r).toEqual({ status: 200, body: { result: { total_items: 3 } } });
  });

  it("forwards the field-picked checkout params verbatim", async () => {
    const { fn, calls } = mockCallTool({ success: true, record: {}, message: "ok", remaining_available: 4 });
    const params = pickCheckoutParams({ tool_id: "T1", operator_id: "OP", machine_id: "M", job_id: "J" });
    await dispatchToolCrib(fn, "tool_crib_checkout", params);
    expect(calls[0]).toEqual([
      "prism_calc",
      "tool_crib_checkout",
      { tool_id: "T1", operator_id: "OP", machine_id: "M", job_id: "J" },
    ]);
  });

  it("maps a dispatcher { error } envelope to 400 with a clean message", async () => {
    const { fn } = mockCallTool({ error: "unknown tool" });
    const r = await dispatchToolCrib(fn, "tool_crib_inventory", {});
    expect(r).toEqual({ status: 400, body: { error: "unknown tool" } });
  });

  it("passes a business denial (success:false, NO error) through as 200, not 400", async () => {
    const denial = { success: false, record: null, message: "out of stock", remaining_available: 0 };
    const { fn } = mockCallTool(denial);
    const r = await dispatchToolCrib(fn, "tool_crib_checkout", pickCheckoutParams({ tool_id: "T1" }));
    expect(r).toEqual({ status: 200, body: { result: denial } });
  });

  it("lets a transport THROW bubble (the router maps it to 500, not 400)", async () => {
    const fn = (async () => {
      throw new Error("bridge down");
    }) as unknown as CallToolFn;
    await expect(dispatchToolCrib(fn, "tool_crib_inventory", {})).rejects.toThrow("bridge down");
  });
});

describe("createToolCribRouter", () => {
  it("registers exactly the 4 expected routes with the right verbs", () => {
    const { fn } = mockCallTool({});
    const router = createToolCribRouter(fn);
    const stack = router.stack as Array<{ route?: { path: string; methods: Record<string, boolean> } }>;
    const routes = stack
      .filter((l) => l.route)
      .map((l) => ({ path: l.route!.path, methods: Object.keys(l.route!.methods).sort() }));
    expect(routes).toContainEqual({ path: "/inventory", methods: ["get"] });
    expect(routes).toContainEqual({ path: "/reorder", methods: ["get"] });
    expect(routes).toContainEqual({ path: "/checkout", methods: ["post"] });
    expect(routes).toContainEqual({ path: "/checkin", methods: ["post"] });
    expect(routes).toHaveLength(4);
  });
});
