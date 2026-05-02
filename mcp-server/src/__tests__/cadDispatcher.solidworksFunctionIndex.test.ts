/**
 * cadDispatcher.solidworksFunctionIndex.test.ts — U-CAD-FIDX-SW-01 dispatcher integration tests
 *
 * Tests exercise the SolidWorks CAD function-index actions through the cadDispatcher.
 * Validates: registration, all 10 function-index actions, error paths for missing arguments,
 * and the discovery surface (summary / total_parameter_count / load_errors).
 *
 * @see src/engines/SolidWorksCADFunctionIndexEngine.ts
 * @see src/tools/dispatchers/cadDispatcher.ts (cad_solidworks_* actions)
 */

import { describe, it, expect, beforeAll } from "vitest";
import { registerCadDispatcher } from "../tools/dispatchers/cadDispatcher.js";
import { SolidWorksCADFunctionIndexEngine } from "../engines/SolidWorksCADFunctionIndexEngine.js";

// ─ Stub MCP server — captures { name, description, schema, handler } ─────────

interface CapturedTool {
  name: string;
  description: string;
  schema: unknown;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<{
    content: Array<{ type: string; text: string }>;
  }>;
}

function makeStubServer() {
  const captured: CapturedTool[] = [];
  return {
    tools: captured,
    tool(name: string, description: string, schema: unknown, handler: CapturedTool["handler"]) {
      captured.push({ name, description, schema, handler });
    },
  };
}

let handler: CapturedTool["handler"];

async function invoke(action: string, params: Record<string, unknown> = {}) {
  const res = (await handler({ action, params })) as Record<string, unknown>;
  // dispatcherError returns its raw {success:false, error, action, dispatcher} shape
  // directly — no { content: [...] } wrapper. Detect that and return as-is.
  if (!res.content) {
    return res;
  }
  const content = res.content as Array<{ text?: string }>;
  const text = content[0]?.text ?? "";
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { __raw: text } as Record<string, unknown>;
  }
}

beforeAll(() => {
  const server = makeStubServer();
  // Cast required because registerCadDispatcher takes a real MCP server type;
  // the stub captures the (name, description, schema, handler) registration call.
  registerCadDispatcher(server as unknown as Parameters<typeof registerCadDispatcher>[0]);
  const tool = server.tools.find((t) => t.name === "prism_cad");
  if (!tool) throw new Error("prism_cad tool was not registered");
  handler = tool.handler;
});

// ─ Tests ─────────────────────────────────────────────────────────────────────

describe("cadDispatcher SolidWorks Function Index integration (U-CAD-FIDX-SW-01)", () => {
  describe("cad_solidworks_get_index", () => {
    it("returns the full function index with system_id 'solidworks'", async () => {
      const r = await invoke("cad_solidworks_get_index");
      expect(r.success).toBe(true);
      const index = r.index as Record<string, unknown>;
      expect(index.system_id).toBe("solidworks");
      expect(index.module_id).toBe("cad_function_index");
      expect(index.schema_version).toBe("1.0.0");
      expect(index.module_name).toBe("SolidWorks CAD Unified Function Index");
    });
  });

  describe("cad_solidworks_list_modules", () => {
    it("returns all 8 module IDs in declaration order", async () => {
      const r = await invoke("cad_solidworks_list_modules");
      expect(r.success).toBe(true);
      expect(r.count).toBe(8);
      expect(r.modules).toEqual([
        "sketch_operations",
        "part_operations",
        "surface_operations",
        "assembly_operations",
        "drawing_operations",
        "sheet_metal_operations",
        "weldment_operations",
        "evaluation_operations",
      ]);
    });
  });

  describe("cad_solidworks_list_operations", () => {
    it("returns 22 sketch operations when filtered by sketch_operations module", async () => {
      const r = await invoke("cad_solidworks_list_operations", { module_id: "sketch_operations" });
      expect(r.success).toBe(true);
      expect(r.count).toBe(22);
      const ops = r.operations as Array<Record<string, unknown>>;
      const ids = ops.map((o) => o.operation_id);
      expect(ids).toContain("LINE");
      expect(ids).toContain("SMART_DIMENSION");
      expect(ids).toContain("MIRROR_ENTITIES");
    });

    it("returns 30 operations for the part_operations module (shipped in U-02)", async () => {
      const r = await invoke("cad_solidworks_list_operations", { module_id: "part_operations" });
      expect(r.success).toBe(true);
      expect(r.count).toBe(30);
    });

    it("returns 20 operations for the surface_operations module (shipped in U-03)", async () => {
      const r = await invoke("cad_solidworks_list_operations", { module_id: "surface_operations" });
      expect(r.success).toBe(true);
      expect(r.count).toBe(20);
    });

    it("returns 26 operations for the assembly_operations module (shipped in U-04)", async () => {
      const r = await invoke("cad_solidworks_list_operations", { module_id: "assembly_operations" });
      expect(r.success).toBe(true);
      expect(r.count).toBe(26);
    });

    it("returns 0 operations for the not-yet-shipped drawing_operations module", async () => {
      const r = await invoke("cad_solidworks_list_operations", { module_id: "drawing_operations" });
      expect(r.success).toBe(true);
      expect(r.count).toBe(0);
      // Note: slimResponse drops the empty `operations: []` array from the wire payload;
      // the count===0 assertion above is the canonical check.
    });

    it("returns all 98 ops when no module_id is given (sketch + part + surface + assembly shipped through U-04)", async () => {
      const r = await invoke("cad_solidworks_list_operations");
      expect(r.success).toBe(true);
      expect(r.count).toBe(98);
    });
  });

  describe("cad_solidworks_get_operation", () => {
    it("returns the LINE operation with its SolidWorks API binding", async () => {
      const r = await invoke("cad_solidworks_get_operation", {
        module_id: "sketch_operations",
        operation_id: "LINE",
      });
      expect(r.success).toBe(true);
      expect(r.module_id).toBe("sketch_operations");
      expect(r.operation_id).toBe("LINE");
      const op = r.operation as Record<string, unknown>;
      expect(op.solidworks_command).toBe("Sketch.Line");
      expect(op.solidworks_api).toBe("ISketchManager.CreateLine");
      expect(op.category).toBe("Sketch_Line");
    });

    it("returns success: false for unknown operation — failure mode", async () => {
      const r = await invoke("cad_solidworks_get_operation", {
        module_id: "sketch_operations",
        operation_id: "NONEXISTENT_OP",
      });
      expect(r.success).toBe(false);
      expect(r.error).toBe("Operation not found: sketch_operations/NONEXISTENT_OP");
    });

    it("returns dispatcherError when module_id is omitted — failure mode", async () => {
      const r = await invoke("cad_solidworks_get_operation", { operation_id: "LINE" });
      expect(r.error).toBe(
        "cad_solidworks_get_operation requires module_id and operation_id",
      );
    });

    it("returns dispatcherError when operation_id is omitted — failure mode", async () => {
      const r = await invoke("cad_solidworks_get_operation", { module_id: "sketch_operations" });
      expect(r.error).toBe(
        "cad_solidworks_get_operation requires module_id and operation_id",
      );
    });
  });

  describe("cad_solidworks_find_parameter", () => {
    it("locates 'Endpoint 1' in LINE on the Shape tab (case-insensitive)", async () => {
      const r = await invoke("cad_solidworks_find_parameter", {
        module_id: "sketch_operations",
        operation_id: "LINE",
        parameter_name: "endpoint 1",
      });
      expect(r.success).toBe(true);
      expect(r.module_id).toBe("sketch_operations");
      expect(r.operation_id).toBe("LINE");
      expect(r.tab_id).toBe("Shape");
      const param = r.parameter as Record<string, unknown>;
      expect(param.name).toBe("Endpoint 1");
      expect(param.required).toBe(true);
    });

    it("returns success: false for missing parameter — failure mode", async () => {
      const r = await invoke("cad_solidworks_find_parameter", {
        module_id: "sketch_operations",
        operation_id: "LINE",
        parameter_name: "nonexistent_param",
      });
      expect(r.success).toBe(false);
      expect(r.error).toBe("Parameter not found: nonexistent_param");
    });

    it("returns dispatcherError when parameter_name is omitted — failure mode", async () => {
      const r = await invoke("cad_solidworks_find_parameter", {
        module_id: "sketch_operations",
        operation_id: "LINE",
      });
      expect(r.error).toBe(
        "cad_solidworks_find_parameter requires module_id, operation_id, and parameter_name",
      );
    });
  });

  describe("cad_solidworks_search_parameters", () => {
    it("finds 19 'Sketch Plane' parameter occurrences across sketch + part + surface", async () => {
      const r = await invoke("cad_solidworks_search_parameters", { query: "Sketch Plane" });
      expect(r.success).toBe(true);
      expect(r.query).toBe("Sketch Plane");
      // 16 sketch ops + HOLE_WIZARD (part) + SURFACE_EXTRUDE + SURFACE_PLANAR (surface) = 19.
      expect(r.count).toBe(19);
    });

    it("honors the limit parameter and caps results", async () => {
      const r = await invoke("cad_solidworks_search_parameters", {
        query: "Sketch Plane",
        limit: 5,
      });
      expect(r.success).toBe(true);
      expect(r.count).toBe(5);
    });

    it("returns dispatcherError when query is omitted — failure mode", async () => {
      const r = await invoke("cad_solidworks_search_parameters");
      expect(r.error).toBe(
        "cad_solidworks_search_parameters requires a 'query' string",
      );
    });
  });

  describe("cad_solidworks_operations_by_category", () => {
    it("returns the 6 Sketch_Modify operations", async () => {
      const r = await invoke("cad_solidworks_operations_by_category", {
        category: "Sketch_Modify",
      });
      expect(r.success).toBe(true);
      expect(r.category).toBe("Sketch_Modify");
      expect(r.count).toBe(6);
      const ops = r.operations as Array<Record<string, unknown>>;
      const ids = ops.map((o) => o.operation_id).sort();
      expect(ids).toEqual([
        "EXTEND_ENTITIES",
        "MIRROR_ENTITIES",
        "OFFSET_ENTITIES",
        "SKETCH_CHAMFER",
        "SKETCH_FILLET",
        "TRIM_ENTITIES",
      ]);
    });

    it("returns dispatcherError when category is omitted — failure mode", async () => {
      const r = await invoke("cad_solidworks_operations_by_category");
      expect(r.error).toBe(
        "cad_solidworks_operations_by_category requires a 'category' string",
      );
    });
  });

  describe("cad_solidworks_summary", () => {
    it("returns the discovery summary with all key metrics", async () => {
      const r = await invoke("cad_solidworks_summary");
      expect(r.success).toBe(true);
      expect(r.system_id).toBe("solidworks");
      expect(r.module_name).toBe("SolidWorks CAD Unified Function Index");
      expect(r.total_modules).toBe(8);
      expect(r.total_operations).toBe(98);
      expect(r.total_parameters).toBe(644);
      expect(r.estimated_parameter_total).toBe(644);
      expect(r.coverage_state).toBe("IN_PROGRESS");
      const modules = r.modules as Array<Record<string, unknown>>;
      expect(modules).toHaveLength(8);
      expect(modules[0].module_id).toBe("sketch_operations");
      expect(modules[0].parameter_count_estimate).toBe(132);
      expect(modules[1].module_id).toBe("part_operations");
      expect(modules[1].parameter_count_estimate).toBe(190);
      expect(modules[2].module_id).toBe("surface_operations");
      expect(modules[2].parameter_count_estimate).toBe(150);
      expect(modules[3].module_id).toBe("assembly_operations");
      expect(modules[3].parameter_count_estimate).toBe(172);
    });
  });

  describe("cad_solidworks_total_parameter_count", () => {
    it("reports 644 total parameters with zero drift from declared total", async () => {
      const r = await invoke("cad_solidworks_total_parameter_count");
      expect(r.success).toBe(true);
      expect(r.total_parameters).toBe(644);
      expect(r.declared_total).toBe(644);
      expect(r.drift).toBe(0);
    });
  });

  describe("cad_solidworks_load_errors", () => {
    it("returns an empty load-error list on a clean catalog load (sketch only)", async () => {
      // Engine state is shared across tests; clear before asserting on errors.
      // (Other tests intentionally exercise listAllOperations / summary which iterate
      //  every module — pending modules don't have JSON files yet, so each iteration
      //  pushes a "File not found" entry. clearCache resets the error log too.)
      SolidWorksCADFunctionIndexEngine.clearCache();
      // Touch only the sketch module — its JSON exists, so no load error should fire.
      await invoke("cad_solidworks_list_operations", { module_id: "sketch_operations" });
      const r = await invoke("cad_solidworks_load_errors");
      expect(r.success).toBe(true);
      expect(r.count).toBe(0);
    });

    it("records a 'File not found' entry per pending module after listAllOperations", async () => {
      SolidWorksCADFunctionIndexEngine.clearCache();
      await invoke("cad_solidworks_list_operations"); // no module_id → iterate all 8
      const r = await invoke("cad_solidworks_load_errors");
      expect(r.success).toBe(true);
      // 4 modules pending after U-04 (everything except sketch + part + surface + assembly)
      expect(r.count).toBe(4);
      const errors = r.errors as Array<{ module_id: string; error: string }>;
      expect(errors.map((e) => e.module_id).sort()).toEqual([
        "drawing_operations",
        "evaluation_operations",
        "sheet_metal_operations",
        "weldment_operations",
      ]);
      expect(errors[0].error).toBe("File not found");
    });
  });
});
