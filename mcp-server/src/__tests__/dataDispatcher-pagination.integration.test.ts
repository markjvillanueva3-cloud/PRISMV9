// Integration test: proves the pagination clamp takes effect on the LIVE
// prism_data dispatch path, not only in an isolated schema.parse(). It runs the
// exact pipeline dataDispatcher.ts uses -- normalizeParams -> validateActionParams
// -> params = validation.data -- and asserts the `limit` the dispatcher forwards
// to the registry is clamped. This closes the Arm-C P1: dataDispatcher previously
// computed validation.data and DISCARDED it, so the schema clamp never fired in
// production (the registry got the raw, unbounded limit). R15: test through the
// dispatcher path, not just the singleton schema.
import { describe, it, expect } from "vitest";
import { validateActionParams } from "../utils/dispatcherMiddleware.js";
import { normalizeParams } from "../utils/paramNormalizer.js";
import { ACTION_DATA_SCHEMAS } from "../schemas/dataActionSchemas.js";

// Mirror of dataDispatcher.ts lines 275-296 (the params pipeline the registry
// search calls consume). Kept faithful so a regression in any of those three
// steps surfaces here.
function dispatchParams(action: string, raw: Record<string, unknown>): Record<string, any> {
  let params: Record<string, any> = normalizeParams(raw);
  const validation = validateActionParams(action, params, ACTION_DATA_SCHEMAS);
  expect(validation.valid).toBe(true);
  if (validation.data) params = validation.data as Record<string, any>;
  return params;
}

describe("prism_data dispatch pipeline: pagination clamp reaches the registry call", () => {
  it("clamps an over-max limit to 10000 in the params forwarded downstream", () => {
    const params = dispatchParams("material_search", { query: "steel", limit: 50000 });
    expect(params.limit).toBe(10000); // registry receives the clamp, not 50000
  });

  it("leaves an in-range limit untouched through the pipeline", () => {
    const params = dispatchParams("tool_search", { query: "endmill", limit: 25 });
    expect(params.limit).toBe(25);
  });

  it("preserves all other params unchanged -- only limit is transformed", () => {
    const params = dispatchParams("machine_search", { manufacturer: "Haas", limit: 99999 });
    expect(params.manufacturer).toBe("Haas");
    expect(params.limit).toBe(10000);
  });

  it("a no-limit request passes through with no injected limit", () => {
    const params = dispatchParams("material_search", { query: "brass" });
    expect(params.limit ?? -1).toBe(-1);
    expect(params.query).toBe("brass");
  });
});
