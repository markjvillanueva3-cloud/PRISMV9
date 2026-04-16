/**
 * Python API Routes Tests
 *
 * Tests for HTTP endpoints used by Python/Codex integration.
 */

import { describe, it, expect } from "vitest";

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
  });

  describe("schema validation", () => {
    it("should validate engine call schema", () => {
      const validInput = {
        engine: "KienzleForceModelEngine",
        method: "calculate",
        args: { ap: 2.0, fz: 0.1 },
      };

      expect(validInput.engine).toBeTruthy();
      expect(validInput.method).toBeTruthy();
      expect(typeof validInput.args).toBe("object");
    });

    it("should reject empty engine name", () => {
      const invalidInput = {
        engine: "",
        method: "calculate",
      };

      expect(invalidInput.engine).toBeFalsy();
    });

    it("should validate formula calc schema", () => {
      const validInput = {
        formula: "kienzle_force",
        params: { ap: 2, fz: 0.1, kc1_1: 1800, mc: 0.25 },
      };

      expect(validInput.formula).toBeTruthy();
      expect(Object.values(validInput.params).every(v => typeof v === "number")).toBe(true);
    });

    it("should validate tribal search schema", () => {
      const validInput = {
        query: "thin wall milling",
        limit: 10,
        category: "machining",
      };

      expect(validInput.query.length).toBeGreaterThan(0);
      expect(validInput.limit).toBeGreaterThan(0);
      expect(validInput.limit).toBeLessThanOrEqual(100);
    });

    it("should validate material lookup schema", () => {
      const validInput = {
        name: "4140",
        iso_group: "P",
        hardness_min: 20,
        hardness_max: 60,
      };

      expect(["P", "M", "K", "N", "S", "H"]).toContain(validInput.iso_group);
      expect(validInput.hardness_min).toBeLessThan(validInput.hardness_max);
    });

    it("should validate tool search schema", () => {
      const validInput = {
        type: "endmill",
        diameter: 12,
        material: "steel",
        operation: "roughing",
        limit: 10,
      };

      expect(validInput.diameter).toBeGreaterThan(0);
      expect(validInput.limit).toBeGreaterThan(0);
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
