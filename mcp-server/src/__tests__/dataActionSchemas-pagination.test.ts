// Tests the pagination CLAMP added to the single-source `pagination` object in
// dataActionSchemas.ts. Intent (R9): an over-max `limit` is capped (NOT
// rejected -> non-breaking), an under-max limit passes through, an absent limit
// stays unset, an invalid limit is still rejected, the clamp applies across
// EVERY schema that spreads pagination, and PRISM_MCP_PAGINATION_MAX overrides
// the default 10000. The clamp prevents a single request from materializing a
// whole registry into one response (memory + payload DoS).
import { describe, it, expect, vi } from "vitest";
import { ACTION_DATA_SCHEMAS } from "../schemas/dataActionSchemas.js";

const search = ACTION_DATA_SCHEMAS.material_search;

describe("dataActionSchemas pagination clamp", () => {
  it("clamps an over-max limit down to the default 10000 (non-breaking, not rejected)", () => {
    const out = search.parse({ query: "steel", limit: 50000 }) as { limit?: number };
    expect(out.limit).toBe(10000);
  });

  it("passes an under-max limit through unchanged", () => {
    const out = search.parse({ query: "steel", limit: 42 }) as { limit?: number };
    expect(out.limit).toBe(42);
  });

  it("leaves an absent limit unset, so no clamp value is injected", () => {
    const out = search.parse({ query: "steel" }) as { limit?: number };
    expect(out.limit ?? -1).toBe(-1); // nullish -> registry default applies downstream
  });

  it("clamps exactly at the boundary (10001 -> 10000, 10000 -> 10000)", () => {
    expect((search.parse({ limit: 10001 }) as { limit?: number }).limit).toBe(10000);
    expect((search.parse({ limit: 10000 }) as { limit?: number }).limit).toBe(10000);
  });

  it("still REJECTS a non-positive or non-integer limit (clamp does not weaken validation)", () => {
    expect(() => search.parse({ limit: 0 })).toThrow();
    expect(() => search.parse({ limit: -5 })).toThrow();
    expect(() => search.parse({ limit: 3.5 })).toThrow();
  });

  it("clamp applies across every schema that spreads pagination", () => {
    expect((ACTION_DATA_SCHEMAS.tool_search.parse({ limit: 999999 }) as { limit?: number }).limit).toBe(10000);
    expect((ACTION_DATA_SCHEMAS.machine_search.parse({ limit: 999999 }) as { limit?: number }).limit).toBe(10000);
    expect((ACTION_DATA_SCHEMAS.alarm_search.parse({ query: "x", limit: 999999 }) as { limit?: number }).limit).toBe(10000);
  });

  it("honors PRISM_MCP_PAGINATION_MAX override on fresh module load", async () => {
    vi.resetModules();
    const prev = process.env.PRISM_MCP_PAGINATION_MAX;
    process.env.PRISM_MCP_PAGINATION_MAX = "100";
    try {
      const mod = await import("../schemas/dataActionSchemas.js");
      const out = mod.ACTION_DATA_SCHEMAS.material_search.parse({ limit: 5000 }) as { limit?: number };
      expect(out.limit).toBe(100);
    } finally {
      if (prev === undefined) delete process.env.PRISM_MCP_PAGINATION_MAX;
      else process.env.PRISM_MCP_PAGINATION_MAX = prev;
      vi.resetModules();
    }
  });
});
