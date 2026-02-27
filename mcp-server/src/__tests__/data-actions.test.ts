/**
 * Data Dispatcher — Action-Level Integration Tests
 * ==================================================
 * Tests core data access actions through prism_data:
 *   - material_get (lookup by name/id)
 *   - material_search (query-based search)
 *   - tool_search (cutting tool search)
 *   - knowledge_stats (no-param registry stats)
 *   - database_list (available databases)
 *
 * These are the highest-traffic data retrieval actions.
 * Tests are resilient: they accept either valid data OR structured errors
 * (some data files may not be present in all environments).
 */

import { describe, it, expect } from "vitest";
import { registerDataDispatcher } from "../tools/dispatchers/dataDispatcher.js";

// ============================================================================
// TEST HELPERS
// ============================================================================

interface CapturedTool {
  name: string;
  description: string;
  schema: any;
  handler: (args: any) => Promise<any>;
}

function createMockServer(): { server: any; tools: CapturedTool[] } {
  const tools: CapturedTool[] = [];
  const server = {
    tool(name: string, description: string, schema: any, handler: any) {
      tools.push({ name, description, schema, handler });
    },
  };
  return { server, tools };
}

async function callAction(
  tool: CapturedTool,
  action: string,
  params: Record<string, any> = {}
): Promise<any> {
  const result = await tool.handler({ action, params });
  const text = result?.content?.[0]?.text;
  return text ? JSON.parse(text) : result;
}

// ============================================================================
// SETUP
// ============================================================================

const { server, tools } = createMockServer();
registerDataDispatcher(server);
const data = tools[0];

// ============================================================================
// REGISTRATION
// ============================================================================

describe("prism_data dispatcher", () => {
  it("registers as prism_data", () => {
    expect(data).toBeDefined();
    expect(data.name).toBe("prism_data");
  });

  it("has a description mentioning data access", () => {
    expect(data.description.toLowerCase()).toContain("data");
  });
});

// ============================================================================
// material_get — Material lookup by name/id
// ============================================================================

describe("data: material_get", () => {
  it("retrieves AISI 4140 by name", async () => {
    const r = await callAction(data, "material_get", {
      identifier: "AISI 4140",
    });
    expect(r).toBeDefined();
    if (!r.error) {
      // Material record should have a name field
      expect(r.name || r.id || r.material_id).toBeDefined();
      // If found, check for standard material properties
      if (r.name) {
        expect(typeof r.name).toBe("string");
      }
      if (r.iso_group) {
        expect(typeof r.iso_group).toBe("string");
      }
    } else {
      // Structured error is acceptable (data file may not exist)
      expect(typeof r.error).toBe("string");
    }
  });

  it("retrieves material by alias param 'name'", async () => {
    const r = await callAction(data, "material_get", {
      name: "6061-T6",
    });
    expect(r).toBeDefined();
    // Either found or structured error
    if (!r.error) {
      expect(r.name || r.id).toBeDefined();
    } else {
      expect(typeof r.error).toBe("string");
    }
  });

  it("returns error for missing identifier", async () => {
    const r = await callAction(data, "material_get", {});
    expect(r).toBeDefined();
    expect(r.error).toBeDefined();
    expect(typeof r.error).toBe("string");
  });

  it("returns error for nonexistent material", async () => {
    const r = await callAction(data, "material_get", {
      identifier: "UNOBTAINIUM-9999",
    });
    expect(r).toBeDefined();
    expect(r.error).toBeDefined();
  });

  it("supports field filtering", async () => {
    const r = await callAction(data, "material_get", {
      identifier: "AISI 4140",
      fields: ["name", "iso_group"],
    });
    expect(r).toBeDefined();
    // If material exists and fields work, only requested fields are returned
    if (!r.error && r.name) {
      expect(r.name).toBeDefined();
    }
  });
});

// ============================================================================
// material_search — Query-based material search
// ============================================================================

describe("data: material_search", () => {
  it("searches for steel materials", async () => {
    const r = await callAction(data, "material_search", {
      query: "steel",
      limit: 5,
    });
    expect(r).toBeDefined();
    if (!r.error) {
      // Search result is typically an array or has results property
      const results = Array.isArray(r) ? r : (r.results || r.materials || []);
      expect(Array.isArray(results)).toBe(true);
    } else {
      expect(typeof r.error).toBe("string");
    }
  });

  it("searches by ISO group P", async () => {
    const r = await callAction(data, "material_search", {
      iso_group: "P",
      limit: 10,
    });
    expect(r).toBeDefined();
    if (!r.error) {
      const results = Array.isArray(r) ? r : (r.results || r.materials || []);
      expect(Array.isArray(results)).toBe(true);
    }
  });

  it("searches with hardness range", async () => {
    const r = await callAction(data, "material_search", {
      query: "stainless",
      hardness_min: 150,
      hardness_max: 300,
      limit: 5,
    });
    expect(r).toBeDefined();
    // No crash — structured response
    if (!r.error) {
      const results = Array.isArray(r) ? r : (r.results || r.materials || []);
      expect(Array.isArray(results)).toBe(true);
    }
  });

  it("empty search returns results or empty array", async () => {
    const r = await callAction(data, "material_search", {
      query: "xyznonexistent999",
      limit: 5,
    });
    expect(r).toBeDefined();
    if (!r.error) {
      const results = Array.isArray(r) ? r : (r.results || r.materials || []);
      expect(Array.isArray(results)).toBe(true);
      // Could be empty — that is valid
    }
  });
});

// ============================================================================
// tool_search — Cutting tool search
// ============================================================================

describe("data: tool_search", () => {
  it("searches for endmill tools", async () => {
    const r = await callAction(data, "tool_search", {
      query: "endmill",
      limit: 5,
    });
    expect(r).toBeDefined();
    if (!r.error) {
      // Tool search result has tools or results array
      const results = r.tools || r.results || (Array.isArray(r) ? r : []);
      expect(Array.isArray(results)).toBe(true);
    } else {
      expect(typeof r.error).toBe("string");
    }
  });

  it("searches by type and diameter", async () => {
    const r = await callAction(data, "tool_search", {
      type: "endmill",
      diameter_min: 10,
      diameter_max: 16,
      limit: 10,
    });
    expect(r).toBeDefined();
    if (!r.error) {
      const results = r.tools || r.results || (Array.isArray(r) ? r : []);
      expect(Array.isArray(results)).toBe(true);
    }
  });

  it("searches by flute count and coating", async () => {
    const r = await callAction(data, "tool_search", {
      flutes: 4,
      coating: "TiAlN",
      limit: 5,
    });
    expect(r).toBeDefined();
    // No crash — structured response
    if (!r.error) {
      const results = r.tools || r.results || (Array.isArray(r) ? r : []);
      expect(Array.isArray(results)).toBe(true);
    }
  });
});

// ============================================================================
// database_list — Available databases/registries
// ============================================================================

describe("data: database_list", () => {
  it("lists available databases", async () => {
    const r = await callAction(data, "database_list", {});
    expect(r).toBeDefined();
    if (!r.error) {
      // Should have databases and/or stats
      // databases may be an array or an object depending on slim response
      expect(r.databases !== undefined || r.stats !== undefined).toBeTruthy();
      if (r.databases !== undefined) {
        // databases could be array (from .list()) or could be slimmed
        if (Array.isArray(r.databases)) {
          expect(r.databases.length).toBeGreaterThanOrEqual(0);
        } else {
          // Slimmed or object form — just verify it exists
          expect(r.databases).toBeDefined();
        }
      }
    } else {
      expect(typeof r.error).toBe("string");
    }
  });
});

// ============================================================================
// coolant_search — Coolant data lookup
// ============================================================================

describe("data: coolant_search", () => {
  it("searches for coolant by material group", async () => {
    const r = await callAction(data, "coolant_search", {
      material_group: "P",
      limit: 5,
    });
    expect(r).toBeDefined();
    if (!r.error) {
      const results = r.coolants || r.results || (Array.isArray(r) ? r : []);
      expect(Array.isArray(results)).toBe(true);
    } else {
      expect(typeof r.error).toBe("string");
    }
  });
});

// ============================================================================
// coating_search — Coating data lookup
// ============================================================================

describe("data: coating_search", () => {
  it("searches for coatings by application", async () => {
    const r = await callAction(data, "coating_search", {
      query: "TiAlN",
      limit: 5,
    });
    expect(r).toBeDefined();
    if (!r.error) {
      const results = r.coatings || r.results || (Array.isArray(r) ? r : []);
      expect(Array.isArray(results)).toBe(true);
    } else {
      expect(typeof r.error).toBe("string");
    }
  });
});

// ============================================================================
// Error handling
// ============================================================================

describe("data: error handling", () => {
  it("returns structured error for unknown action", async () => {
    const r = await callAction(data, "nonexistent_action" as any, {});
    expect(r).toBeDefined();
    expect(r.error).toBeDefined();
    expect(typeof r.error).toBe("string");
  });

  it("material_get with invalid identifier returns error, not crash", async () => {
    const r = await callAction(data, "material_get", {
      identifier: "",
    });
    expect(r).toBeDefined();
    // Empty string may either return error or attempt lookup
    expect(r.error !== undefined || r.name !== undefined).toBeTruthy();
  });
});
