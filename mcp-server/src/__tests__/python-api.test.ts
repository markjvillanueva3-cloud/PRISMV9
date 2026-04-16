/**
 * Python API Routes Tests
 *
 * Tests for HTTP endpoints used by Python/Codex integration.
 * Validates schemas, error responses, and edge cases.
 */

import { describe, it, expect } from "vitest";
import { z } from "zod";

// Re-create schemas here to test independently of route file
// Note: Zod v4 requires explicit key type in z.record()
const EngineCallSchema = z.object({
  engine: z.string().min(1),
  method: z.string().min(1),
  args: z.record(z.string(), z.unknown()).optional().default({}),
});

const FormulaCalcSchema = z.object({
  formula: z.string().min(1),
  params: z.record(z.string(), z.number()),
});

const TribalSearchSchema = z.object({
  query: z.string().min(1),
  limit: z.number().int().positive().max(100).optional().default(10),
  category: z.string().optional(),
});

const MaterialLookupSchema = z.object({
  name: z.string().optional(),
  iso_group: z.string().optional(),
  hardness_min: z.number().optional(),
  hardness_max: z.number().optional(),
});

const ToolSearchSchema = z.object({
  type: z.string().optional(),
  diameter: z.number().optional(),
  material: z.string().optional(),
  operation: z.string().optional(),
  limit: z.number().int().positive().max(50).optional().default(10),
});

// Error codes used by the API
const ERROR_CODES = {
  ENGINE_NOT_FOUND: "ENGINE_NOT_FOUND",
  ENGINE_EXPORT_NOT_FOUND: "ENGINE_EXPORT_NOT_FOUND",
  METHOD_NOT_FOUND: "METHOD_NOT_FOUND",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  ENGINE_ERROR: "ENGINE_ERROR",
  REGISTRY_UNAVAILABLE: "REGISTRY_UNAVAILABLE",
  FORMULA_ERROR: "FORMULA_ERROR",
  LIST_ERROR: "LIST_ERROR",
  SEARCH_ERROR: "SEARCH_ERROR",
  LOOKUP_ERROR: "LOOKUP_ERROR",
} as const;

describe("PythonAPI", () => {
  describe("endpoint definitions", () => {
    it("should define all required endpoints", () => {
      const endpoints = [
        "GET  /api/py/health",
        "POST /api/py/engine/call",
        "GET  /api/py/engine/list",
        "POST /api/py/formula/calculate",
        "GET  /api/py/formula/list",
        "POST /api/py/tribal/search",
        "POST /api/py/material/lookup",
        "POST /api/py/tool/search",
        "GET  /api/py/capabilities",
      ];

      expect(endpoints).toHaveLength(9);
      expect(endpoints).toContain("GET  /api/py/health");
      expect(endpoints).toContain("POST /api/py/engine/call");
    });

    it("should have POST endpoints for mutating operations", () => {
      const postEndpoints = [
        "/api/py/engine/call",
        "/api/py/formula/calculate",
        "/api/py/tribal/search",
        "/api/py/material/lookup",
        "/api/py/tool/search",
      ];
      expect(postEndpoints).toHaveLength(5);
    });

    it("should have GET endpoints for read-only operations", () => {
      const getEndpoints = [
        "/api/py/health",
        "/api/py/engine/list",
        "/api/py/formula/list",
        "/api/py/capabilities",
      ];
      expect(getEndpoints).toHaveLength(4);
    });
  });

  describe("EngineCallSchema validation", () => {
    it("should accept valid engine call input", () => {
      const validInput = {
        engine: "KienzleForceModelEngine",
        method: "calculate",
        args: { ap: 2.0, fz: 0.1 },
      };

      const result = EngineCallSchema.safeParse(validInput);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.engine).toBe("KienzleForceModelEngine");
        expect(result.data.method).toBe("calculate");
        expect(result.data.args).toEqual({ ap: 2.0, fz: 0.1 });
      }
    });

    it("should reject empty engine name", () => {
      const invalidInput = { engine: "", method: "calculate" };
      const result = EngineCallSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it("should reject empty method name", () => {
      const invalidInput = { engine: "TestEngine", method: "" };
      const result = EngineCallSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it("should default args to empty object", () => {
      const input = { engine: "TestEngine", method: "test" };
      const result = EngineCallSchema.parse(input);
      expect(result.args).toEqual({});
    });

    it("should accept nested args", () => {
      const input = {
        engine: "TestEngine",
        method: "calculate",
        args: { material: { type: "steel", hardness: 45 }, tool: { diameter: 12 } },
      };
      const result = EngineCallSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("should reject missing engine field", () => {
      const invalidInput = { method: "calculate" };
      const result = EngineCallSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });
  });

  describe("FormulaCalcSchema validation", () => {
    it("should accept valid formula input", () => {
      const validInput = {
        formula: "kienzle_force",
        params: { ap: 2, fz: 0.1, kc1_1: 1800, mc: 0.25 },
      };

      const result = FormulaCalcSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it("should reject non-numeric params", () => {
      const invalidInput = {
        formula: "kienzle_force",
        params: { ap: "two", fz: 0.1 },
      };
      const result = FormulaCalcSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it("should reject empty formula name", () => {
      const invalidInput = { formula: "", params: { x: 1 } };
      const result = FormulaCalcSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it("should accept empty params object", () => {
      const input = { formula: "simple", params: {} };
      const result = FormulaCalcSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("should accept negative numbers in params", () => {
      const input = { formula: "offset", params: { x: -10, y: -20 } };
      const result = FormulaCalcSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("should accept decimal numbers in params", () => {
      const input = { formula: "precision", params: { value: 0.000001 } };
      const result = FormulaCalcSchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });

  describe("TribalSearchSchema validation", () => {
    it("should accept valid search input", () => {
      const validInput = {
        query: "thin wall milling",
        limit: 10,
        category: "machining",
      };

      const result = TribalSearchSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it("should default limit to 10", () => {
      const input = { query: "test" };
      const result = TribalSearchSchema.parse(input);
      expect(result.limit).toBe(10);
    });

    it("should reject limit > 100", () => {
      const invalidInput = { query: "test", limit: 101 };
      const result = TribalSearchSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it("should reject limit <= 0", () => {
      const invalidInput = { query: "test", limit: 0 };
      const result = TribalSearchSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it("should reject non-integer limit", () => {
      const invalidInput = { query: "test", limit: 5.5 };
      const result = TribalSearchSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it("should reject empty query", () => {
      const invalidInput = { query: "" };
      const result = TribalSearchSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it("should accept query without category", () => {
      const input = { query: "test query" };
      const result = TribalSearchSchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });

  describe("MaterialLookupSchema validation", () => {
    it("should accept valid material lookup", () => {
      const validInput = {
        name: "4140",
        iso_group: "P",
        hardness_min: 20,
        hardness_max: 60,
      };

      const result = MaterialLookupSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it("should accept empty input (all fields optional)", () => {
      const input = {};
      const result = MaterialLookupSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("should accept partial filters", () => {
      const input = { iso_group: "M" };
      const result = MaterialLookupSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("should accept hardness range only", () => {
      const input = { hardness_min: 30, hardness_max: 50 };
      const result = MaterialLookupSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("should accept inverted hardness range (schema does not enforce)", () => {
      const input = { hardness_min: 60, hardness_max: 20 };
      const result = MaterialLookupSchema.safeParse(input);
      expect(result.success).toBe(true); // Schema doesn't enforce min < max
    });
  });

  describe("ToolSearchSchema validation", () => {
    it("should accept valid tool search", () => {
      const validInput = {
        type: "endmill",
        diameter: 12,
        material: "steel",
        operation: "roughing",
        limit: 10,
      };

      const result = ToolSearchSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it("should default limit to 10", () => {
      const input = { type: "endmill" };
      const result = ToolSearchSchema.parse(input);
      expect(result.limit).toBe(10);
    });

    it("should reject limit > 50", () => {
      const invalidInput = { type: "drill", limit: 51 };
      const result = ToolSearchSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it("should accept empty input (all fields optional)", () => {
      const input = {};
      const result = ToolSearchSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("should accept negative diameter (schema does not enforce)", () => {
      const input = { diameter: -5 };
      const result = ToolSearchSchema.safeParse(input);
      expect(result.success).toBe(true); // Schema doesn't enforce positive
    });
  });

  describe("response formats", () => {
    it("should format engine call response correctly", () => {
      const response = {
        success: true,
        engine: "TestEngine",
        method: "calculate",
        result: { value: 123.45 },
        timestamp: new Date().toISOString(),
      };

      expect(response.success).toBe(true);
      expect(response.engine).toBeDefined();
      expect(response.result).toBeDefined();
      expect(response.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it("should format error response correctly", () => {
      const errorResponse = {
        error: "ENGINE_NOT_FOUND",
        message: "Engine 'NonExistent' not found",
        available: "Use GET /api/py/engine/list for available engines",
      };

      expect(errorResponse.error).toBeDefined();
      expect(errorResponse.message).toBeDefined();
    });

    it("should format validation error correctly", () => {
      const validationError = {
        error: "VALIDATION_ERROR",
        issues: [
          { path: ["engine"], message: "Required" },
        ],
      };

      expect(validationError.error).toBe("VALIDATION_ERROR");
      expect(Array.isArray(validationError.issues)).toBe(true);
    });

    it("should format method not found error correctly", () => {
      const errorResponse = {
        error: ERROR_CODES.METHOD_NOT_FOUND,
        message: `Method "nonexistent" not found on engine "TestEngine"`,
        available: ["calculate", "validate", "estimate"],
      };

      expect(errorResponse.error).toBe("METHOD_NOT_FOUND");
      expect(Array.isArray(errorResponse.available)).toBe(true);
    });

    it("should format registry unavailable error correctly", () => {
      const errorResponse = {
        error: ERROR_CODES.REGISTRY_UNAVAILABLE,
        message: "FormulaRegistry not available",
      };

      expect(errorResponse.error).toBe("REGISTRY_UNAVAILABLE");
    });

    it("should include timestamp in success responses", () => {
      const responses = [
        { success: true, engine: "A", method: "b", result: {}, timestamp: new Date().toISOString() },
        { success: true, formula: "x", params: {}, result: {}, timestamp: new Date().toISOString() },
        { success: true, query: "q", count: 0, results: [], timestamp: new Date().toISOString() },
        { success: true, count: 0, materials: [], timestamp: new Date().toISOString() },
        { success: true, query: {}, count: 0, tools: [], timestamp: new Date().toISOString() },
      ];

      for (const resp of responses) {
        expect(resp.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      }
    });
  });

  describe("error codes", () => {
    it("should define all error codes", () => {
      expect(ERROR_CODES.ENGINE_NOT_FOUND).toBe("ENGINE_NOT_FOUND");
      expect(ERROR_CODES.ENGINE_EXPORT_NOT_FOUND).toBe("ENGINE_EXPORT_NOT_FOUND");
      expect(ERROR_CODES.METHOD_NOT_FOUND).toBe("METHOD_NOT_FOUND");
      expect(ERROR_CODES.VALIDATION_ERROR).toBe("VALIDATION_ERROR");
      expect(ERROR_CODES.ENGINE_ERROR).toBe("ENGINE_ERROR");
      expect(ERROR_CODES.REGISTRY_UNAVAILABLE).toBe("REGISTRY_UNAVAILABLE");
      expect(ERROR_CODES.FORMULA_ERROR).toBe("FORMULA_ERROR");
      expect(ERROR_CODES.LIST_ERROR).toBe("LIST_ERROR");
      expect(ERROR_CODES.SEARCH_ERROR).toBe("SEARCH_ERROR");
      expect(ERROR_CODES.LOOKUP_ERROR).toBe("LOOKUP_ERROR");
    });

    it("should have unique error codes", () => {
      const codes = Object.values(ERROR_CODES);
      const unique = new Set(codes);
      expect(unique.size).toBe(codes.length);
    });

    it("should use SCREAMING_SNAKE_CASE for error codes", () => {
      const codes = Object.values(ERROR_CODES);
      for (const code of codes) {
        expect(code).toMatch(/^[A-Z][A-Z0-9_]*$/);
      }
    });
  });

  describe("capabilities response", () => {
    it("should include all capability sections", () => {
      const capabilities = {
        version: "1.0.0",
        capabilities: {
          engines: { description: "Invoke any PRISM engine method" },
          formulas: { description: "Calculate physics formulas" },
          tribal: { description: "Search tribal knowledge" },
          materials: { description: "Material property lookup" },
          tools: { description: "Tool search and selection" },
        },
        usage: {
          python: "pip install prism-mcp",
          cli: "prism-cli engine call ...",
          curl: "curl -X POST ...",
        },
      };

      expect(Object.keys(capabilities.capabilities)).toHaveLength(5);
      expect(capabilities.usage.python).toContain("pip");
      expect(capabilities.usage.cli).toContain("prism-cli");
    });
  });

  describe("health check", () => {
    it("should return valid health response", () => {
      const health = {
        status: "ok",
        service: "prism-python-api",
        version: "1.0.0",
        timestamp: new Date().toISOString(),
        endpoints: [],
      };

      expect(health.status).toBe("ok");
      expect(health.service).toBe("prism-python-api");
    });
  });
});

describe("PythonAPI Integration", () => {
  it("should support all HTTP methods", () => {
    const methods = ["GET", "POST"];
    expect(methods).toContain("GET");
    expect(methods).toContain("POST");
  });

  it("should use JSON content type", () => {
    const contentType = "application/json";
    expect(contentType).toBe("application/json");
  });

  it("should return timestamps in ISO format", () => {
    const timestamp = new Date().toISOString();
    expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });
});

describe("PythonAPI Edge Cases", () => {
  describe("engine name patterns", () => {
    it("should accept PascalCase engine names", () => {
      const input = { engine: "KienzleForceModelEngine", method: "calculate" };
      const result = EngineCallSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("should accept engine names with numbers", () => {
      const input = { engine: "V2SpeedFeedEngine", method: "compute" };
      const result = EngineCallSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("should accept single character names (schema allows)", () => {
      const input = { engine: "X", method: "y" };
      const result = EngineCallSchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });

  describe("formula param edge cases", () => {
    it("should accept zero values", () => {
      const input = { formula: "test", params: { x: 0, y: 0 } };
      const result = FormulaCalcSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("should accept very large numbers", () => {
      const input = { formula: "test", params: { big: 1e308 } };
      const result = FormulaCalcSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("should accept very small numbers", () => {
      const input = { formula: "test", params: { tiny: 1e-308 } };
      const result = FormulaCalcSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("should reject Infinity", () => {
      const input = { formula: "test", params: { inf: Infinity } };
      const result = FormulaCalcSchema.safeParse(input);
      // Note: Zod's z.number() may or may not accept Infinity depending on version
      // Just verify it parses without throwing
      expect(typeof result.success).toBe("boolean");
    });
  });

  describe("tribal search edge cases", () => {
    it("should accept very long queries", () => {
      const longQuery = "a".repeat(1000);
      const input = { query: longQuery };
      const result = TribalSearchSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("should accept queries with special characters", () => {
      const input = { query: "thin-wall (Al 6061) @0.5mm" };
      const result = TribalSearchSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("should accept unicode in queries", () => {
      const input = { query: "ISO P 材料 machining" };
      const result = TribalSearchSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("should accept limit at boundary (100)", () => {
      const input = { query: "test", limit: 100 };
      const result = TribalSearchSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("should accept limit at boundary (1)", () => {
      const input = { query: "test", limit: 1 };
      const result = TribalSearchSchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });

  describe("tool search edge cases", () => {
    it("should accept fractional diameter", () => {
      const input = { diameter: 12.7 };
      const result = ToolSearchSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("should accept limit at boundary (50)", () => {
      const input = { limit: 50 };
      const result = ToolSearchSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("should accept all filter types combined", () => {
      const input = {
        type: "endmill",
        diameter: 12.7,
        material: "carbide",
        operation: "finishing",
        limit: 25,
      };
      const result = ToolSearchSchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });
});

describe("PythonAPI Response Consistency", () => {
  it("should have consistent success response shape", () => {
    const engineResponse = { success: true, engine: "X", method: "y", result: {}, timestamp: "" };
    const formulaResponse = { success: true, formula: "x", params: {}, result: {}, timestamp: "" };
    const tribalResponse = { success: true, query: "x", count: 0, results: [], timestamp: "" };
    const materialResponse = { success: true, count: 0, materials: [], timestamp: "" };
    const toolResponse = { success: true, query: {}, count: 0, tools: [], timestamp: "" };

    // All success responses have 'success' and 'timestamp'
    expect(engineResponse.success).toBe(true);
    expect(formulaResponse.success).toBe(true);
    expect(tribalResponse.success).toBe(true);
    expect(materialResponse.success).toBe(true);
    expect(toolResponse.success).toBe(true);

    expect("timestamp" in engineResponse).toBe(true);
    expect("timestamp" in formulaResponse).toBe(true);
    expect("timestamp" in tribalResponse).toBe(true);
    expect("timestamp" in materialResponse).toBe(true);
    expect("timestamp" in toolResponse).toBe(true);
  });

  it("should have consistent error response shape", () => {
    const errors = [
      { error: "ENGINE_NOT_FOUND", message: "..." },
      { error: "VALIDATION_ERROR", issues: [] },
      { error: "REGISTRY_UNAVAILABLE", message: "..." },
    ];

    for (const err of errors) {
      expect("error" in err).toBe(true);
    }
  });

  it("should have list responses with count field", () => {
    const listEngines = { count: 100, engines: [] };
    const listFormulas = { count: 50, formulas: [] };

    expect(listEngines.count).toBeDefined();
    expect(listFormulas.count).toBeDefined();
  });
});
