/**
 * Python API Routes — HTTP endpoints for Python/Codex integration
 *
 * Phase 0.10 from AGI proximity plan. Provides REST API for:
 *   - Engine method invocation
 *   - Registry lookups
 *   - Formula calculations
 *   - Tribal knowledge search
 *
 * Designed for consumption by:
 *   - Python bindings (prism-py library)
 *   - CLI wrapper (prism-cli)
 *   - Codex Desktop integration
 *   - Jupyter notebooks
 *
 * @module routes/python-api
 */

import { Router, Request, Response } from "express";
import { z } from "zod";

const router = Router();

// ============================================================================
// SCHEMAS
// ============================================================================

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

// ============================================================================
// HEALTH CHECK
// ============================================================================

router.get("/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    service: "prism-python-api",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    endpoints: [
      "GET  /api/py/health",
      "POST /api/py/engine/call",
      "GET  /api/py/engine/list",
      "POST /api/py/formula/calculate",
      "GET  /api/py/formula/list",
      "POST /api/py/tribal/search",
      "POST /api/py/material/lookup",
      "POST /api/py/tool/search",
      "GET  /api/py/capabilities",
    ],
  });
});

// ============================================================================
// ENGINE INVOCATION
// ============================================================================

router.post("/engine/call", async (req: Request, res: Response) => {
  try {
    const input = EngineCallSchema.parse(req.body);
    const { engine, method, args } = input;

    // Dynamic engine import
    const engineModule = await import(`../engines/${engine}.js`).catch(() => null);
    if (!engineModule) {
      return res.status(404).json({
        error: "ENGINE_NOT_FOUND",
        message: `Engine "${engine}" not found`,
        available: "Use GET /api/py/engine/list for available engines",
      });
    }

    // Find the singleton or class export
    const engineInstance = engineModule[engine.charAt(0).toLowerCase() + engine.slice(1)]
      || engineModule[engine]
      || engineModule.default;

    if (!engineInstance) {
      return res.status(404).json({
        error: "ENGINE_EXPORT_NOT_FOUND",
        message: `Engine "${engine}" has no default export or singleton`,
      });
    }

    // Check if method exists
    const methodFn = typeof engineInstance === "function"
      ? engineInstance[method]
      : engineInstance[method];

    if (typeof methodFn !== "function") {
      return res.status(404).json({
        error: "METHOD_NOT_FOUND",
        message: `Method "${method}" not found on engine "${engine}"`,
        available: Object.keys(engineInstance).filter(k => typeof engineInstance[k] === "function"),
      });
    }

    // Call the method
    const result = await Promise.resolve(methodFn.call(engineInstance, args));

    return res.json({
      success: true,
      engine,
      method,
      result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        issues: error.issues,
      });
    }
    return res.status(500).json({
      error: "ENGINE_ERROR",
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

router.get("/engine/list", async (_req: Request, res: Response) => {
  try {
    const fs = await import("fs/promises");
    const path = await import("path");
    const enginesDir = path.join(__dirname, "..", "engines");

    const files = await fs.readdir(enginesDir);
    const engines = files
      .filter(f => f.endsWith("Engine.ts") || f.endsWith("Engine.js"))
      .map(f => f.replace(/\.(ts|js)$/, ""))
      .sort();

    return res.json({
      count: engines.length,
      engines,
    });
  } catch (error) {
    return res.status(500).json({
      error: "LIST_ERROR",
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

// ============================================================================
// FORMULA CALCULATIONS
// ============================================================================

router.post("/formula/calculate", async (req: Request, res: Response) => {
  try {
    const input = FormulaCalcSchema.parse(req.body);
    const { formula, params } = input;

    // Import formula registry
    const { formulaRegistry } = await import("../registries/FormulaRegistry.js").catch(() => ({ formulaRegistry: null }));

    if (!formulaRegistry) {
      return res.status(503).json({
        error: "REGISTRY_UNAVAILABLE",
        message: "FormulaRegistry not available",
      });
    }

    const result = formulaRegistry.calculate(formula, params);

    return res.json({
      success: true,
      formula,
      params,
      result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        issues: error.issues,
      });
    }
    return res.status(500).json({
      error: "FORMULA_ERROR",
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

router.get("/formula/list", async (_req: Request, res: Response) => {
  try {
    const { formulaRegistry } = await import("../registries/FormulaRegistry.js").catch(() => ({ formulaRegistry: null }));

    if (!formulaRegistry) {
      return res.status(503).json({
        error: "REGISTRY_UNAVAILABLE",
        message: "FormulaRegistry not available",
      });
    }

    const formulas = formulaRegistry.list?.() || [];

    return res.json({
      count: formulas.length,
      formulas,
    });
  } catch (error) {
    return res.status(500).json({
      error: "LIST_ERROR",
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

// ============================================================================
// TRIBAL KNOWLEDGE
// ============================================================================

router.post("/tribal/search", async (req: Request, res: Response) => {
  try {
    const input = TribalSearchSchema.parse(req.body);
    const { query, limit, category } = input;

    const { tribalKnowledgeAdvisorEngine } = await import("../engines/TribalKnowledgeAdvisorEngine.js").catch(() => ({ tribalKnowledgeAdvisorEngine: null }));

    if (!tribalKnowledgeAdvisorEngine) {
      return res.status(503).json({
        error: "ENGINE_UNAVAILABLE",
        message: "TribalKnowledgeAdvisorEngine not available",
      });
    }

    const results = tribalKnowledgeAdvisorEngine.search?.(query, { limit, category }) || [];

    return res.json({
      success: true,
      query,
      count: results.length,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        issues: error.issues,
      });
    }
    return res.status(500).json({
      error: "SEARCH_ERROR",
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

// ============================================================================
// MATERIAL LOOKUP
// ============================================================================

router.post("/material/lookup", async (req: Request, res: Response) => {
  try {
    const input = MaterialLookupSchema.parse(req.body);

    const { materialRegistry } = await import("../registries/MaterialRegistry.js").catch(() => ({ materialRegistry: null }));

    if (!materialRegistry) {
      return res.status(503).json({
        error: "REGISTRY_UNAVAILABLE",
        message: "MaterialRegistry not available",
      });
    }

    let materials = materialRegistry.list?.() || [];

    // Apply filters
    if (input.name) {
      const nameLower = input.name.toLowerCase();
      materials = materials.filter((m: { name?: string }) =>
        m.name?.toLowerCase().includes(nameLower)
      );
    }
    if (input.iso_group) {
      materials = materials.filter((m: { iso_group?: string }) =>
        m.iso_group === input.iso_group
      );
    }
    if (input.hardness_min !== undefined) {
      materials = materials.filter((m: { hardness?: number }) =>
        (m.hardness ?? 0) >= input.hardness_min!
      );
    }
    if (input.hardness_max !== undefined) {
      materials = materials.filter((m: { hardness?: number }) =>
        (m.hardness ?? 999) <= input.hardness_max!
      );
    }

    return res.json({
      success: true,
      count: materials.length,
      materials,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        issues: error.issues,
      });
    }
    return res.status(500).json({
      error: "LOOKUP_ERROR",
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

// ============================================================================
// TOOL SEARCH
// ============================================================================

router.post("/tool/search", async (req: Request, res: Response) => {
  try {
    const input = ToolSearchSchema.parse(req.body);

    const { toolRegistry } = await import("../registries/ToolRegistry.js").catch(() => ({ toolRegistry: null }));

    if (!toolRegistry) {
      return res.status(503).json({
        error: "REGISTRY_UNAVAILABLE",
        message: "ToolRegistry not available",
      });
    }

    const results = toolRegistry.search?.(input) || [];

    return res.json({
      success: true,
      query: input,
      count: results.length,
      tools: results.slice(0, input.limit),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        issues: error.issues,
      });
    }
    return res.status(500).json({
      error: "SEARCH_ERROR",
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

// ============================================================================
// CAPABILITIES
// ============================================================================

router.get("/capabilities", (_req: Request, res: Response) => {
  res.json({
    version: "1.0.0",
    capabilities: {
      engines: {
        description: "Invoke any PRISM engine method",
        endpoints: ["POST /engine/call", "GET /engine/list"],
      },
      formulas: {
        description: "Calculate physics formulas (Kienzle, Taylor, etc.)",
        endpoints: ["POST /formula/calculate", "GET /formula/list"],
      },
      tribal: {
        description: "Search tribal knowledge (3,700+ tips)",
        endpoints: ["POST /tribal/search"],
      },
      materials: {
        description: "Material property lookup",
        endpoints: ["POST /material/lookup"],
      },
      tools: {
        description: "Tool search and selection",
        endpoints: ["POST /tool/search"],
      },
    },
    usage: {
      python: "pip install prism-mcp && from prism import Client",
      cli: "prism-cli engine call KienzleForceModelEngine calculate --ap 2.0 --fz 0.1",
      curl: "curl -X POST http://localhost:3000/api/py/engine/call -H 'Content-Type: application/json' -d '{...}'",
    },
  });
});

export default router;
